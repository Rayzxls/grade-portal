import { Injectable, NotFoundException } from '@nestjs/common';
import { calculateGpa } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  IGradeRepository,
  type StudentGradeView,
  type StudentPendingEnrollment,
} from '../domain/grade-repository.interface';

export interface StudentProfile {
  studentCode: string;
  fullName: string;
  classroom: string | null;
  academicYear: number | null;
}

export interface TermGroup {
  termId: string;
  year: number;
  semester: string;
  label: string; // "1/2569"
  grades: StudentGradeView[];
  pending: StudentPendingEnrollment[];
  termGpa: number;
  termCredits: number;
}

export interface MyGradesResult {
  profile: StudentProfile;
  gpa: number; // GPAX (สะสมทั้งหมด)
  totalCredits: number;
  grades: StudentGradeView[]; // flat — เก็บไว้เพื่อ backward compatibility
  byTerm: TermGroup[]; // เรียงจากเทอมล่าสุด → เก่าสุด
}

const SEMESTER_LABEL: Record<string, string> = {
  FIRST: '1',
  SECOND: '2',
  SUMMER: 'ภาคฤดูร้อน',
};

@Injectable()
export class GetMyGradesUseCase {
  constructor(
    private prisma: PrismaService,
    private repo: IGradeRepository,
  ) {}

  async execute(userId: string): Promise<MyGradesResult> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        user: { select: { fullName: true } },
        classroom: { select: { gradeLevel: true, section: true, academicYear: true } },
      },
    });
    if (!student) throw new NotFoundException('ไม่พบโปรไฟล์นักเรียน');

    const [grades, pending] = await Promise.all([
      this.repo.findByStudentId(student.id),
      this.repo.findPendingEnrollments(student.id),
    ]);

    // ─── GPAX (สะสม) ───
    const gpa = calculateGpa(grades.map((g) => ({ credits: g.credits, letter: g.letter })));
    const totalCredits = grades.reduce((s, g) => {
      if (g.letter === 'W' || g.letter === 'I') return s;
      return s + g.credits;
    }, 0);

    // ─── Group by term ───
    const termMap = new Map<string, TermGroup>();
    function getOrCreate(t: { id: string; year: number; semester: string }) {
      let g = termMap.get(t.id);
      if (!g) {
        const sem = SEMESTER_LABEL[t.semester] ?? t.semester;
        g = {
          termId: t.id,
          year: t.year,
          semester: t.semester,
          label: `${sem}/${t.year}`,
          grades: [],
          pending: [],
          termGpa: 0,
          termCredits: 0,
        };
        termMap.set(t.id, g);
      }
      return g;
    }

    for (const g of grades) getOrCreate(g.term).grades.push(g);
    for (const p of pending) getOrCreate(p.term).pending.push(p);

    // คำนวณ GPA per term
    for (const tg of termMap.values()) {
      tg.termGpa = calculateGpa(tg.grades.map((g) => ({ credits: g.credits, letter: g.letter })));
      tg.termCredits = tg.grades.reduce((s, g) => {
        if (g.letter === 'W' || g.letter === 'I') return s;
        return s + g.credits;
      }, 0);
    }

    const byTerm = Array.from(termMap.values()).sort((a, b) => {
      // เรียง: ปีล่าสุด → เทอม 2 → เทอม 1 → ฤดูร้อน
      if (a.year !== b.year) return b.year - a.year;
      const order: Record<string, number> = { SECOND: 0, FIRST: 1, SUMMER: 2 };
      return (order[a.semester] ?? 99) - (order[b.semester] ?? 99);
    });

    const profile: StudentProfile = {
      studentCode: student.studentCode,
      fullName: student.user.fullName,
      classroom: student.classroom
        ? `${student.classroom.gradeLevel}/${student.classroom.section}`
        : null,
      academicYear: student.classroom?.academicYear ?? null,
    };

    return { profile, gpa, totalCredits, grades, byTerm };
  }
}
