import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { scoreToLetter, letterToGradePoint } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

interface CreateInput {
  classroomId: string;
  courseId: string;
  termId: string;
  columns: { name: string; maxScore: number }[];
}

@Injectable()
export class ScoreSheetUseCase {
  constructor(private prisma: PrismaService) {}

  private async assertOwnership(classroomId: string, userId: string, courseId?: string) {
    const [classroom, actor] = await Promise.all([
      this.prisma.classroom.findUnique({ where: { id: classroomId } }),
      this.prisma.user.findUnique({ where: { id: userId }, include: { teacher: true } }),
    ]);
    if (!classroom) throw new NotFoundException('ไม่พบห้องเรียน');
    if (!actor) throw new NotFoundException('ไม่พบผู้ใช้');
    if (actor.role === 'ADMIN') return { classroom, teacherId: actor.teacher?.id ?? null };
    
    if (actor.role === 'TEACHER' && actor.teacher) {
      const teacherId = actor.teacher.id;
      // 1. Is homeroom teacher?
      if (classroom.homeroomTeacherId === teacherId) {
        return { classroom, teacherId };
      }
      // 2. Is course teacher?
      if (courseId) {
        const course = await this.prisma.course.findUnique({ where: { id: courseId } });
        if (course && course.teacherId === teacherId) {
          return { classroom, teacherId };
        }
      }
    }
    throw new ForbiddenException('คุณไม่ใช่ครูประจำชั้นหรือครูผู้สอนประจำวิชานี้');
  }

  async getSheet(classroomId: string, courseId: string, termId: string, userId: string) {
    await this.assertOwnership(classroomId, userId, courseId);
    const sheet = await this.prisma.scoreSheet.findUnique({
      where: { classroomId_courseId_termId: { classroomId, courseId, termId } },
      include: {
        columns: { orderBy: { order: 'asc' } },
        entries: true,
      },
    });
    if (!sheet) return null;

    const students = await this.prisma.student.findMany({
      where: { classroomId },
      select: {
        id: true,
        studentCode: true,
        user: { select: { fullName: true } },
      },
      orderBy: { studentCode: 'asc' },
    });

    // build cell matrix: studentId+columnId → value
    const cellMap = new Map<string, number | null>();
    for (const e of sheet.entries) {
      cellMap.set(`${e.columnId}:${e.studentId}`, e.value);
    }

    const rows = students.map((s) => {
      const cells = sheet.columns.map((col) => ({
        columnId: col.id,
        value: cellMap.get(`${col.id}:${s.id}`) ?? null,
      }));
      return {
        studentId: s.id,
        studentCode: s.studentCode,
        studentName: s.user.fullName,
        cells,
      };
    });

    const maxTotal = sheet.columns.reduce((sum, c) => sum + c.maxScore, 0);

    return {
      id: sheet.id,
      finalizedAt: sheet.finalizedAt,
      columns: sheet.columns.map((c) => ({
        id: c.id, name: c.name, maxScore: c.maxScore, order: c.order,
      })),
      rows,
      maxTotal,
    };
  }

  async create(input: CreateInput, userId: string) {
    const { classroom } = await this.assertOwnership(input.classroomId, userId, input.courseId);

    const course = await this.prisma.course.findUnique({ where: { id: input.courseId } });
    if (!course) throw new NotFoundException('ไม่พบรายวิชา');
    if (course.gradeLevel !== classroom.gradeLevel) {
      throw new BadRequestException('ชั้นของวิชาไม่ตรงกับห้อง');
    }

    const exists = await this.prisma.scoreSheet.findUnique({
      where: { classroomId_courseId_termId: { classroomId: input.classroomId, courseId: input.courseId, termId: input.termId } },
    });
    if (exists) throw new BadRequestException('สมุดคะแนนสำหรับวิชานี้มีอยู่แล้ว');

    // ครูผู้สร้างเล่ม = course.teacherId (ครูที่สอนวิชานี้)
    return this.prisma.scoreSheet.create({
      data: {
        classroomId: input.classroomId,
        courseId: input.courseId,
        termId: input.termId,
        ownerTeacherId: course.teacherId,
        columns: {
          create: input.columns.map((c, i) => ({
            name: c.name, maxScore: c.maxScore, order: i,
          })),
        },
      },
      include: { columns: true },
    });
  }

  private async assertSheetOwnership(sheetId: string, userId: string) {
    const sheet = await this.prisma.scoreSheet.findUnique({
      where: { id: sheetId },
      include: { classroom: true },
    });
    if (!sheet) throw new NotFoundException('ไม่พบสมุดคะแนน');
    await this.assertOwnership(sheet.classroomId, userId, sheet.courseId);
    if (sheet.finalizedAt) throw new BadRequestException('สมุดคะแนนปิดเล่มแล้ว — แก้ไขไม่ได้');
    return sheet;
  }

  async addColumn(sheetId: string, name: string, maxScore: number, userId: string) {
    await this.assertSheetOwnership(sheetId, userId);
    const count = await this.prisma.scoreColumn.count({ where: { scoreSheetId: sheetId } });
    return this.prisma.scoreColumn.create({
      data: { scoreSheetId: sheetId, name, maxScore, order: count },
    });
  }

  async updateColumn(
    sheetId: string, columnId: string,
    patch: { name?: string; maxScore?: number },
    userId: string,
  ) {
    await this.assertSheetOwnership(sheetId, userId);
    const col = await this.prisma.scoreColumn.findUnique({ where: { id: columnId } });
    if (!col || col.scoreSheetId !== sheetId) throw new NotFoundException('ไม่พบช่องคะแนน');
    return this.prisma.scoreColumn.update({ where: { id: columnId }, data: patch });
  }

  async deleteColumn(sheetId: string, columnId: string, userId: string) {
    await this.assertSheetOwnership(sheetId, userId);
    const col = await this.prisma.scoreColumn.findUnique({ where: { id: columnId } });
    if (!col || col.scoreSheetId !== sheetId) throw new NotFoundException('ไม่พบช่องคะแนน');
    await this.prisma.scoreColumn.delete({ where: { id: columnId } });
    return { ok: true };
  }

  async saveCells(
    sheetId: string,
    cells: { columnId: string; studentId: string; value: number | null }[],
    userId: string,
  ) {
    const sheet = await this.assertSheetOwnership(sheetId, userId);
    const columns = await this.prisma.scoreColumn.findMany({ where: { scoreSheetId: sheetId } });
    const maxByCol = new Map(columns.map((c) => [c.id, c.maxScore]));

    let saved = 0;
    let cleared = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const c of cells) {
        const max = maxByCol.get(c.columnId);
        if (max === undefined) continue;
        if (c.value === null) {
          await tx.studentScore.deleteMany({ where: { columnId: c.columnId, studentId: c.studentId } });
          cleared++;
          continue;
        }
        if (c.value < 0 || c.value > max) continue;
        await tx.studentScore.upsert({
          where: { columnId_studentId: { columnId: c.columnId, studentId: c.studentId } },
          update: { value: c.value },
          create: { scoreSheetId: sheetId, columnId: c.columnId, studentId: c.studentId, value: c.value },
        });
        saved++;
      }
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'SCORESHEET_SAVE',
          entityType: 'ScoreSheet',
          entityId: sheetId,
          after: { saved, cleared } as object,
        },
      });
    });
    return { saved, cleared };
  }

  // ปิดเล่ม → คำนวณคะแนนรวม → สร้าง/อัปเดต Grade
  // force=true จะข้ามการเช็คคะแนนที่ยังไม่ครบ (เซลล์ที่ว่าง = 0)
  async finalize(sheetId: string, userId: string, force = false) {
    const sheet = await this.assertSheetOwnership(sheetId, userId);

    const [columns, entries, enrollments] = await Promise.all([
      this.prisma.scoreColumn.findMany({ where: { scoreSheetId: sheetId } }),
      this.prisma.studentScore.findMany({ where: { scoreSheetId: sheetId } }),
      this.prisma.enrollment.findMany({
        where: {
          courseId: sheet.courseId,
          termId: sheet.termId,
          student: { classroomId: sheet.classroomId },
        },
        include: { grade: true, student: { include: { user: true } } },
      }),
    ]);

    const maxTotal = columns.reduce((s, c) => s + c.maxScore, 0);
    if (maxTotal <= 0) throw new BadRequestException('คะแนนเต็มรวมเป็น 0 — เพิ่มช่องคะแนนก่อน');
    if (columns.length === 0) throw new BadRequestException('ยังไม่มีช่องคะแนน');
    if (enrollments.length === 0) throw new BadRequestException('ไม่มีนักเรียนลงทะเบียนวิชานี้');

    // เช็คว่ามีคะแนนค้าง (cell ที่ value=null) สำหรับทุก (student × column) หรือไม่
    if (!force) {
      const filled = new Set(
        entries.filter((e) => e.value !== null).map((e) => `${e.studentId}|${e.columnId}`),
      );
      const missing: { studentName: string; studentCode: string; columnName: string }[] = [];
      for (const en of enrollments) {
        for (const col of columns) {
          if (!filled.has(`${en.studentId}|${col.id}`)) {
            missing.push({
              studentName: en.student.user.fullName,
              studentCode: en.student.studentCode,
              columnName: col.name,
            });
          }
        }
      }
      if (missing.length > 0) {
        throw new BadRequestException({
          message: `มีคะแนนที่ยังไม่ได้บันทึก ${missing.length} ช่อง (จากนักเรียน ${new Set(missing.map((m) => m.studentCode)).size} คน)`,
          missing: missing.slice(0, 10), // ตัวอย่าง 10 รายการแรก
          missingCount: missing.length,
          hint: 'กรอกให้ครบ หรือใช้ ?force=true เพื่อปิดเล่มทันที (ช่องว่าง = 0)',
        });
      }
    }

    // sum per student
    const sumByStudent = new Map<string, number>();
    for (const e of entries) {
      if (e.value === null) continue;
      sumByStudent.set(e.studentId, (sumByStudent.get(e.studentId) ?? 0) + e.value);
    }

    let graded = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const en of enrollments) {
        const sum = sumByStudent.get(en.studentId) ?? 0;
        const score100 = Math.round((sum / maxTotal) * 10000) / 100; // ปัดทศนิยม 2
        const letter = scoreToLetter(score100);
        const gradePoint = letterToGradePoint(letter) ?? 0;

        if (en.grade) {
          await tx.grade.update({
            where: { id: en.grade.id },
            data: { score: score100, letter, gradePoint },
          });
        } else {
          await tx.grade.create({
            data: {
              enrollmentId: en.id,
              studentId: en.studentId,
              score: score100,
              letter,
              gradePoint,
              recordedById: userId,
            },
          });
        }
        graded++;
      }
      await tx.scoreSheet.update({ where: { id: sheetId }, data: { finalizedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'SCORESHEET_FINALIZE',
          entityType: 'ScoreSheet',
          entityId: sheetId,
          after: { graded, maxTotal } as object,
        },
      });
    });

    return { graded, maxTotal };
  }

  // เปิดเล่มใหม่ (unlock)
  async reopen(sheetId: string, userId: string) {
    const sheet = await this.prisma.scoreSheet.findUnique({ where: { id: sheetId } });
    if (!sheet) throw new NotFoundException('ไม่พบสมุดคะแนน');
    await this.assertOwnership(sheet.classroomId, userId, sheet.courseId);
    await this.prisma.scoreSheet.update({ where: { id: sheetId }, data: { finalizedAt: null } });
    return { ok: true };
  }
}
