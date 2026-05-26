import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { calculateGpa } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { GradeLetter } from '@grade/shared';

/**
 * ดึงเกรดของนักเรียนคนใดคนหนึ่ง (ใช้โดย admin/teacher)
 * - ADMIN: ดูได้ทุกคน
 * - TEACHER: ดูได้เฉพาะเด็กในห้องที่ตัวเองดูแล หรือเด็กที่อยู่ในวิชาที่ตัวเองสอน
 */
@Injectable()
export class GetStudentGradesUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(studentId: string, actorUserId: string) {
    const [actor, student] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: actorUserId }, include: { teacher: true } }),
      this.prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { fullName: true, email: true } },
          classroom: { select: { gradeLevel: true, section: true, academicYear: true } },
        },
      }),
    ]);
    if (!actor) throw new NotFoundException('ไม่พบผู้ใช้');
    if (!student) throw new NotFoundException('ไม่พบนักเรียน');

    if (actor.role === 'TEACHER') {
      if (!actor.teacher) throw new ForbiddenException();
      // ครูดูได้ถ้า: เป็น homeroom ของห้องเด็ก หรือ สอนวิชาที่เด็กลงทะเบียน
      const isHomeroom =
        student.classroomId &&
        (
          await this.prisma.classroom.findUnique({ where: { id: student.classroomId } })
        )?.homeroomTeacherId === actor.teacher.id;
      const teachesAtLeastOne = await this.prisma.enrollment.count({
        where: {
          studentId,
          course: { teacherId: actor.teacher.id },
        },
      });
      if (!isHomeroom && teachesAtLeastOne === 0) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์ดูเกรดของเด็กคนนี้');
      }
    } else if (actor.role !== 'ADMIN') {
      throw new ForbiddenException();
    }

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
      orderBy: [
        { enrollment: { term: { year: 'desc' } } },
        { enrollment: { term: { semester: 'asc' } } },
        { enrollment: { course: { code: 'asc' } } },
      ],
    });

    const grades = rows.map((g) => ({
      id: g.id,
      courseCode: g.enrollment.course.code,
      courseName: g.enrollment.course.name,
      credits: g.enrollment.course.credits,
      quizScore: g.quizScore,
      homeworkScore: g.homeworkScore,
      midtermScore: g.midtermScore,
      finalScore: g.finalScore,
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

    const gpa = calculateGpa(grades.map((g) => ({ credits: g.credits, letter: g.letter })));
    const totalCredits = grades.reduce((s, g) => {
      if (g.letter === 'W' || g.letter === 'I') return s;
      return s + g.credits;
    }, 0);

    return {
      profile: {
        studentId: student.id,
        studentCode: student.studentCode,
        fullName: student.user.fullName,
        email: student.user.email,
        classroom: student.classroom
          ? `${student.classroom.gradeLevel}/${student.classroom.section}`
          : null,
        academicYear: student.classroom?.academicYear ?? null,
      },
      gpa,
      totalCredits,
      grades,
    };
  }
}
