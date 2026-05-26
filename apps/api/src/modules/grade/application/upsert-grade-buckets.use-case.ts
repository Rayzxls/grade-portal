import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { scoreToLetter, letterToGradePoint } from '@grade/shared';
import type { UpsertGradeBucketsDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

const WEIGHTS = { quiz: 0.2, homework: 0.2, midterm: 0.3, final: 0.3 } as const;

/**
 * คำนวณ total จาก 4 หมวด (ตามสูตรโรงเรียน: 20% + 20% + 30% + 30%)
 * ถ้าหมวดใดเป็น null → ใช้ 0
 */
function computeTotal(b: {
  quizScore?: number | null;
  homeworkScore?: number | null;
  midtermScore?: number | null;
  finalScore?: number | null;
}): number {
  const q = b.quizScore ?? 0;
  const h = b.homeworkScore ?? 0;
  const m = b.midtermScore ?? 0;
  const f = b.finalScore ?? 0;
  const raw = q * WEIGHTS.quiz + h * WEIGHTS.homework + m * WEIGHTS.midterm + f * WEIGHTS.final;
  return Math.round(raw * 100) / 100;
}

@Injectable()
export class UpsertGradeBucketsUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(dto: UpsertGradeBucketsDto, actorUserId: string) {
    // ตรวจสิทธิ์ — admin หรือ ครูเจ้าของวิชา หรือ homeroom ของห้องที่นักเรียนอยู่
    const [actor, student, course] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: actorUserId }, include: { teacher: true } }),
      this.prisma.student.findUnique({ where: { id: dto.studentId } }),
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
    ]);
    if (!actor) throw new NotFoundException('ไม่พบผู้ใช้');
    if (!student) throw new NotFoundException('ไม่พบนักเรียน');
    if (!course) throw new NotFoundException('ไม่พบรายวิชา');

    if (actor.role === 'TEACHER') {
      if (!actor.teacher) throw new ForbiddenException();
      const isCourseTeacher = course.teacherId === actor.teacher.id;
      // ครูประจำชั้นของห้องที่นักเรียนอยู่ก็แก้เกรดได้
      let isHomeroom = false;
      if (student.classroomId) {
        const cr = await this.prisma.classroom.findUnique({ where: { id: student.classroomId } });
        isHomeroom = cr?.homeroomTeacherId === actor.teacher.id;
      }
      if (!isCourseTeacher && !isHomeroom) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์บันทึกคะแนนวิชานี้');
      }
    } else if (actor.role !== 'ADMIN') {
      throw new ForbiddenException();
    }

    // หา / สร้าง Enrollment
    let enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId_termId: {
          studentId: dto.studentId,
          courseId: dto.courseId,
          termId: dto.termId,
        },
      },
    });
    if (!enrollment) {
      enrollment = await this.prisma.enrollment.create({
        data: { studentId: dto.studentId, courseId: dto.courseId, termId: dto.termId },
      });
    }

    // คำนวณ total + letter + gradePoint
    const totalScore = computeTotal(dto);
    const letter = scoreToLetter(totalScore);
    const gradePoint = letterToGradePoint(letter) ?? 0;

    // Upsert Grade
    const existing = await this.prisma.grade.findUnique({
      where: { enrollmentId: enrollment.id },
    });

    const dataPayload = {
      quizScore: dto.quizScore ?? null,
      homeworkScore: dto.homeworkScore ?? null,
      midtermScore: dto.midtermScore ?? null,
      finalScore: dto.finalScore ?? null,
      score: totalScore,
      letter,
      gradePoint,
    };

    let result;
    if (existing) {
      result = await this.prisma.$transaction([
        this.prisma.grade.update({
          where: { id: existing.id },
          data: dataPayload,
        }),
        this.prisma.auditLog.create({
          data: {
            actorId: actorUserId,
            action: 'GRADE_UPDATE',
            entityType: 'Grade',
            entityId: existing.id,
            before: {
              quizScore: existing.quizScore,
              homeworkScore: existing.homeworkScore,
              midtermScore: existing.midtermScore,
              finalScore: existing.finalScore,
              score: existing.score,
              letter: existing.letter,
            } as object,
            after: dataPayload as object,
          },
        }),
      ]);
      return result[0];
    } else {
      const created = await this.prisma.grade.create({
        data: {
          ...dataPayload,
          enrollmentId: enrollment.id,
          studentId: dto.studentId,
          recordedById: actorUserId,
        },
      });
      await this.prisma.auditLog.create({
        data: {
          actorId: actorUserId,
          action: 'GRADE_CREATE',
          entityType: 'Grade',
          entityId: created.id,
          after: dataPayload as object,
        },
      });
      return created;
    }
  }
}
