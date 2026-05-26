import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  IGradeRepository,
  type CreateGradeInput,
  type GradeRecord,
  type StudentGradeView,
  type StudentPendingEnrollment,
  type TeacherEnrollmentRow,
} from '../domain/grade-repository.interface';
import type { GradeLetter } from '@grade/shared';

@Injectable()
export class PrismaGradeRepository implements IGradeRepository {
  constructor(private prisma: PrismaService) {}

  async findByStudentId(studentId: string): Promise<StudentGradeView[]> {
    const rows = await this.prisma.grade.findMany({
      where: { studentId },
      include: {
        enrollment: {
          include: {
            course: { include: { teacher: { include: { user: true } } } },
            term: true,
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
    });

    return rows.map((g) => ({
      id: g.id,
      courseCode: g.enrollment.course.code,
      courseName: g.enrollment.course.name,
      credits: g.enrollment.course.credits,
      score: g.score,
      letter: g.letter as GradeLetter,
      gradePoint: g.gradePoint,
      teacherName: g.enrollment.course.teacher?.user?.fullName ?? null,
      term: {
        id: g.enrollment.term.id,
        year: g.enrollment.term.year,
        semester: g.enrollment.term.semester,
      },
    }));
  }

  async findPendingEnrollments(studentId: string): Promise<StudentPendingEnrollment[]> {
    const rows = await this.prisma.enrollment.findMany({
      where: { studentId, grade: null },
      include: {
        course: { include: { teacher: { include: { user: true } } } },
        term: true,
        student: { select: { classroomId: true } },
      },
    });

    // เช็คสถานะ ScoreSheet ของแต่ละ enrollment
    const results: StudentPendingEnrollment[] = [];
    for (const e of rows) {
      let sheetStatus: StudentPendingEnrollment['sheetStatus'] = 'NO_SHEET';
      if (e.student.classroomId) {
        const sheet = await this.prisma.scoreSheet.findUnique({
          where: {
            classroomId_courseId_termId: {
              classroomId: e.student.classroomId,
              courseId: e.courseId,
              termId: e.termId,
            },
          },
          select: { finalizedAt: true },
        });
        if (sheet) sheetStatus = sheet.finalizedAt ? 'FINALIZED' : 'OPEN';
      }
      results.push({
        enrollmentId: e.id,
        courseCode: e.course.code,
        courseName: e.course.name,
        credits: e.course.credits,
        teacherName: e.course.teacher?.user?.fullName ?? null,
        term: { id: e.term.id, year: e.term.year, semester: e.term.semester },
        sheetStatus,
      });
    }
    return results;
  }

  async findById(id: string): Promise<GradeRecord | null> {
    const row = await this.prisma.grade.findUnique({ where: { id } });
    if (!row) return null;
    return { ...row, letter: row.letter as GradeLetter };
  }

  async create(input: CreateGradeInput): Promise<GradeRecord> {
    const row = await this.prisma.grade.create({ data: input });
    return { ...row, letter: row.letter as GradeLetter };
  }

  async update(id: string, score: number, letter: GradeLetter, gradePoint: number): Promise<GradeRecord> {
    const row = await this.prisma.grade.update({
      where: { id },
      data: { score, letter, gradePoint },
    });
    return { ...row, letter: row.letter as GradeLetter };
  }

  async findEnrollmentsByTeacherUserId(teacherUserId: string): Promise<TeacherEnrollmentRow[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { course: { teacher: { userId: teacherUserId } } },
      include: {
        student: { include: { user: true } },
        course: true,
        term: true,
        grade: true,
      },
      orderBy: [{ course: { code: 'asc' } }, { student: { studentCode: 'asc' } }],
    });

    return enrollments.map((e) => ({
      enrollmentId: e.id,
      studentCode: e.student.studentCode,
      studentName: e.student.user.fullName,
      courseCode: e.course.code,
      courseName: e.course.name,
      credits: e.course.credits,
      term: { year: e.term.year, semester: e.term.semester },
      gradeId: e.grade?.id ?? null,
      score: e.grade?.score ?? null,
      letter: (e.grade?.letter as GradeLetter | undefined) ?? null,
    }));
  }
}
