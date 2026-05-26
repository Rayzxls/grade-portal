import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { calculateGpa } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

/**
 * SubjectOffering = "ครู X สอนวิชา Y ให้ห้อง Z ในเทอม T"
 *
 * เป็น concept ใหม่ที่อ่านจาก ScoreSheet เดิม (1:1) — ไม่ต้อง migrate ข้อมูล
 * ทุก ScoreSheet row = 1 SubjectOffering
 *
 * Identity: scoreSheet.id = offering.id
 */
@Injectable()
export class OfferingsUseCase {
  constructor(private prisma: PrismaService) {}

  /** วิชาที่ฉันสอน (ครูคนนี้) — ทั้งหมดในระบบ */
  async listMine(userId: string, opts: { termId?: string } = {}) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) return [];

    const sheets = await this.prisma.scoreSheet.findMany({
      where: {
        ownerTeacherId: teacher.id,
        ...(opts.termId ? { termId: opts.termId } : {}),
      },
      include: {
        classroom: {
          select: {
            id: true, gradeLevel: true, section: true, academicYear: true,
            _count: { select: { students: true } },
          },
        },
        course: { select: { id: true, code: true, name: true, credits: true, gradeLevel: true } },
        term: { select: { id: true, year: true, semester: true } },
      },
      orderBy: [
        { term: { year: 'desc' } },
        { classroom: { gradeLevel: 'asc' } },
        { classroom: { section: 'asc' } },
        { course: { code: 'asc' } },
      ],
    });

    // หาจำนวน graded ของแต่ละ offering
    const offeringIds = sheets.map((s) => s.id);
    const enrollmentsByClassroom = await this.prisma.enrollment.findMany({
      where: {
        courseId: { in: sheets.map((s) => s.courseId) },
        termId: { in: sheets.map((s) => s.termId) },
        student: { classroomId: { in: sheets.map((s) => s.classroomId) } },
      },
      include: { grade: { select: { id: true } } },
    });

    return sheets.map((s) => {
      const classEnrollments = enrollmentsByClassroom.filter(
        (e) => e.courseId === s.courseId && e.termId === s.termId,
      );
      const totalStudents = classEnrollments.length || s.classroom._count.students;
      const graded = classEnrollments.filter((e) => e.grade).length;
      return {
        offeringId: s.id,
        classroom: s.classroom,
        course: s.course,
        term: s.term,
        finalizedAt: s.finalizedAt,
        totalStudents,
        graded,
        progress: totalStudents > 0 ? Math.round((graded / totalStudents) * 100) : 0,
      };
    });
  }

  /** รายละเอียดของ offering ตัวเดียว + รายชื่อนักเรียน + เกรด */
  async getDetail(offeringId: string, userId: string) {
    const [actor, sheet] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, include: { teacher: true } }),
      this.prisma.scoreSheet.findUnique({
        where: { id: offeringId },
        include: {
          classroom: { select: { id: true, gradeLevel: true, section: true, academicYear: true, homeroomTeacherId: true } },
          course: { select: { id: true, code: true, name: true, credits: true, gradeLevel: true } },
          term: { select: { id: true, year: true, semester: true } },
          owner: { include: { user: { select: { fullName: true } } } },
        },
      }),
    ]);
    if (!sheet) throw new NotFoundException('ไม่พบวิชาที่สอน');
    if (!actor) throw new ForbiddenException();

    // ตรวจสิทธิ์: admin หรือ ครูเจ้าของ หรือ ครูประจำชั้น
    if (actor.role !== 'ADMIN') {
      if (!actor.teacher) throw new ForbiddenException();
      const isOwner = sheet.ownerTeacherId === actor.teacher.id;
      const isHomeroom = sheet.classroom.homeroomTeacherId === actor.teacher.id;
      if (!isOwner && !isHomeroom) throw new ForbiddenException('คุณไม่มีสิทธิ์ดูวิชานี้');
    }

    const students = await this.prisma.student.findMany({
      where: { classroomId: sheet.classroomId },
      include: {
        user: { select: { fullName: true } },
        grades: {
          where: { enrollment: { courseId: sheet.courseId, termId: sheet.termId } },
          select: {
            id: true, quizScore: true, homeworkScore: true, midtermScore: true, finalScore: true,
            score: true, letter: true, gradePoint: true,
          },
        },
      },
      orderBy: { studentCode: 'asc' },
    });

    const rows = students.map((s) => ({
      studentId: s.id,
      studentCode: s.studentCode,
      fullName: s.user.fullName,
      grade: s.grades[0] ?? null,
    }));

    // สถิติของห้อง
    const withGrade = rows.filter((r) => r.grade);
    const avg = withGrade.length > 0
      ? withGrade.reduce((sum, r) => sum + (r.grade!.score ?? 0), 0) / withGrade.length
      : 0;
    const classGpa = calculateGpa(
      withGrade.map((r) => ({ credits: sheet.course.credits, letter: r.grade!.letter as any })),
    );

    return {
      offeringId: sheet.id,
      classroom: sheet.classroom,
      course: sheet.course,
      term: sheet.term,
      teacher: { id: sheet.owner.id, fullName: sheet.owner.user.fullName },
      finalizedAt: sheet.finalizedAt,
      students: rows,
      summary: {
        total: rows.length,
        graded: withGrade.length,
        avgScore: Math.round(avg * 100) / 100,
        classGpa,
      },
    };
  }
}
