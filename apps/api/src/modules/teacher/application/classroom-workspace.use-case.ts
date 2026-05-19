import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { scoreToLetter, letterToGradePoint } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class ClassroomWorkspaceUseCase {
  constructor(private prisma: PrismaService) {}

  // ตรวจสิทธิ์: ครูประจำชั้นเท่านั้น (admin ผ่านได้เสมอ)
  private async assertOwnership(classroomId: string, userId: string) {
    const [classroom, actor] = await Promise.all([
      this.prisma.classroom.findUnique({ where: { id: classroomId } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { teacher: true },
      }),
    ]);
    if (!classroom) throw new NotFoundException('ไม่พบห้องเรียน');
    if (!actor) throw new NotFoundException('ไม่พบผู้ใช้');
    if (actor.role === 'ADMIN') return classroom;
    if (
      actor.role === 'TEACHER' &&
      actor.teacher &&
      classroom.homeroomTeacherId === actor.teacher.id
    ) {
      return classroom;
    }
    throw new ForbiddenException('คุณไม่ใช่ครูประจำชั้นของห้องนี้');
  }

  // ดูเทอมทั้งหมด (ใช้ใน Term selector)
  listTerms() {
    return this.prisma.academicTerm.findMany({
      orderBy: [{ year: 'desc' }, { semester: 'asc' }],
    });
  }

  // วิชาที่ห้องนี้เรียนในเทอมที่ระบุ
  async listSubjects(classroomId: string, termId: string, userId: string) {
    await this.assertOwnership(classroomId, userId);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        termId,
        student: { classroomId },
      },
      include: {
        course: {
          include: { teacher: { include: { user: { select: { fullName: true } } } } },
        },
        grade: { select: { id: true } },
      },
    });

    // group by courseId
    const map = new Map<
      string,
      {
        courseId: string;
        code: string;
        name: string;
        credits: number;
        gradeLevel: string;
        teacherName: string;
        totalStudents: number;
        graded: number;
      }
    >();
    for (const e of enrollments) {
      const key = e.course.id;
      const cur = map.get(key) ?? {
        courseId: e.course.id,
        code: e.course.code,
        name: e.course.name,
        credits: e.course.credits,
        gradeLevel: e.course.gradeLevel,
        teacherName: e.course.teacher.user.fullName,
        totalStudents: 0,
        graded: 0,
      };
      cur.totalStudents++;
      if (e.grade) cur.graded++;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }

  // เพิ่มวิชาให้ห้อง = bulk-enroll นักเรียนทั้งห้อง
  async addSubject(
    classroomId: string,
    courseId: string,
    termId: string,
    userId: string,
  ) {
    const classroom = await this.assertOwnership(classroomId, userId);
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('ไม่พบรายวิชา');
    if (course.gradeLevel !== classroom.gradeLevel) {
      throw new ForbiddenException(
        `วิชา ${course.code} เป็นของชั้น ${course.gradeLevel} ` +
          `แต่ห้องนี้คือชั้น ${classroom.gradeLevel}`,
      );
    }

    const students = await this.prisma.student.findMany({
      where: { classroomId },
      select: { id: true },
    });
    if (students.length === 0) return { totalStudents: 0, created: 0, skipped: 0 };

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.enrollment.createMany({
        data: students.map((s) => ({
          studentId: s.id,
          courseId,
          termId,
        })),
        skipDuplicates: true,
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'CLASSROOM_ADD_SUBJECT',
          entityType: 'Classroom',
          entityId: classroomId,
          after: {
            courseId,
            termId,
            created: result.count,
            totalStudents: students.length,
          } as object,
        },
      });
      return {
        totalStudents: students.length,
        created: result.count,
        skipped: students.length - result.count,
      };
    });
  }

  // ลบวิชาออกจากห้อง = ลบ enrollment + grade ที่ยังไม่ปิด (ห้ามลบถ้ามี grade แล้ว — ป้องกันลบเกรด)
  async removeSubject(
    classroomId: string,
    courseId: string,
    termId: string,
    userId: string,
  ) {
    await this.assertOwnership(classroomId, userId);
    const withGrade = await this.prisma.enrollment.count({
      where: {
        courseId, termId,
        student: { classroomId },
        grade: { isNot: null },
      },
    });
    if (withGrade > 0) {
      throw new ForbiddenException(
        `ไม่สามารถลบวิชานี้ — มี ${withGrade} คนได้รับเกรดแล้ว`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.enrollment.deleteMany({
        where: { courseId, termId, student: { classroomId } },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'CLASSROOM_REMOVE_SUBJECT',
          entityType: 'Classroom',
          entityId: classroomId,
          after: { courseId, termId, deleted: deleted.count } as object,
        },
      });
      return { deleted: deleted.count };
    });
  }

  // Matrix นักเรียน × คะแนน สำหรับ 1 วิชา ใน 1 เทอม
  async getScores(
    classroomId: string,
    courseId: string,
    termId: string,
    userId: string,
  ) {
    await this.assertOwnership(classroomId, userId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId, termId, student: { classroomId } },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            user: { select: { fullName: true } },
          },
        },
        grade: true,
      },
      orderBy: { student: { studentCode: 'asc' } },
    });
    return enrollments.map((e) => ({
      enrollmentId: e.id,
      studentId: e.student.id,
      studentCode: e.student.studentCode,
      studentName: e.student.user.fullName,
      gradeId: e.grade?.id ?? null,
      score: e.grade?.score ?? null,
      letter: e.grade?.letter ?? null,
    }));
  }

  // Save คะแนนหลายคนพร้อมกัน (matrix save)
  async saveScores(
    classroomId: string,
    courseId: string,
    termId: string,
    items: { enrollmentId: string; score: number | null }[],
    userId: string,
  ) {
    await this.assertOwnership(classroomId, userId);

    let created = 0;
    let updated = 0;
    let cleared = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const enrollment = await tx.enrollment.findUnique({
          where: { id: item.enrollmentId },
          include: { grade: true, student: true },
        });
        if (!enrollment || enrollment.courseId !== courseId || enrollment.termId !== termId) continue;
        if (enrollment.student.classroomId !== classroomId) continue;

        if (item.score === null) {
          // เคลียร์เกรด (ถ้ามี)
          if (enrollment.grade) {
            await tx.grade.delete({ where: { id: enrollment.grade.id } });
            cleared++;
          }
          continue;
        }
        if (item.score < 0 || item.score > 100) continue;

        const letter = scoreToLetter(item.score);
        const gradePoint = letterToGradePoint(letter) ?? 0;

        if (enrollment.grade) {
          await tx.grade.update({
            where: { id: enrollment.grade.id },
            data: { score: item.score, letter, gradePoint },
          });
          updated++;
        } else {
          await tx.grade.create({
            data: {
              enrollmentId: enrollment.id,
              studentId: enrollment.studentId,
              score: item.score,
              letter,
              gradePoint,
              recordedById: userId,
            },
          });
          created++;
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'SCORES_BULK_SAVE',
          entityType: 'Classroom',
          entityId: classroomId,
          after: { courseId, termId, created, updated, cleared } as object,
        },
      });
    });

    return { created, updated, cleared };
  }
}
