import { Injectable, NotFoundException } from '@nestjs/common';
import { calculateGpa } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { IGradeRepository } from '../domain/grade-repository.interface';

export interface MyGradesResult {
  gpa: number;
  totalCredits: number;
  grades: Awaited<ReturnType<IGradeRepository['findByStudentId']>>;
}

@Injectable()
export class GetMyGradesUseCase {
  constructor(
    private prisma: PrismaService,
    private repo: IGradeRepository,
  ) {}

  async execute(userId: string): Promise<MyGradesResult & { profile: StudentProfile }> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        user: { select: { fullName: true } },
        classroom: { select: { gradeLevel: true, section: true, academicYear: true } },
      },
    });
    if (!student) throw new NotFoundException('ไม่พบโปรไฟล์นักเรียน');

    const grades = await this.repo.findByStudentId(student.id);
    const gpa = calculateGpa(grades.map((g) => ({ credits: g.credits, letter: g.letter })));
    const totalCredits = grades.reduce((sum, g) => sum + g.credits, 0);

    const profile: StudentProfile = {
      studentCode: student.studentCode,
      fullName: student.user.fullName,
      classroom: student.classroom
        ? `${student.classroom.gradeLevel}/${student.classroom.section}`
        : null,
      academicYear: student.classroom?.academicYear ?? null,
    };

    return { gpa, totalCredits, grades, profile };
  }
}

export interface StudentProfile {
  studentCode: string;
  fullName: string;
  classroom: string | null;
  academicYear: number | null;
}
