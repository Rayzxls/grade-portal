import type { GradeLetter } from '@grade/shared';

export interface GradeRecord {
  id: string;
  enrollmentId: string;
  studentId: string;
  score: number;
  letter: GradeLetter;
  gradePoint: number;
  recordedById: string;
  recordedAt: Date;
}

export interface StudentGradeView {
  id: string;
  courseCode: string;
  courseName: string;
  credits: number;
  score: number;
  letter: GradeLetter;
  gradePoint: number;
  teacherName: string | null;
  term: { id: string; year: number; semester: string };
}

// คาบที่ลงทะเบียนแต่ยังไม่มี Grade (กำลังเรียน / ยังไม่ปิดเล่ม)
export interface StudentPendingEnrollment {
  enrollmentId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  teacherName: string | null;
  term: { id: string; year: number; semester: string };
  sheetStatus: 'NO_SHEET' | 'OPEN' | 'FINALIZED';
}

export interface CreateGradeInput {
  enrollmentId: string;
  studentId: string;
  score: number;
  letter: GradeLetter;
  gradePoint: number;
  recordedById: string;
}

export interface TeacherEnrollmentRow {
  enrollmentId: string;
  studentCode: string;
  studentName: string;
  courseCode: string;
  courseName: string;
  credits: number;
  term: { year: number; semester: string };
  gradeId: string | null;
  score: number | null;
  letter: GradeLetter | null;
}

export abstract class IGradeRepository {
  abstract findByStudentId(studentId: string): Promise<StudentGradeView[]>;
  abstract findPendingEnrollments(studentId: string): Promise<StudentPendingEnrollment[]>;
  abstract findById(id: string): Promise<GradeRecord | null>;
  abstract create(input: CreateGradeInput): Promise<GradeRecord>;
  abstract update(id: string, score: number, letter: GradeLetter, gradePoint: number): Promise<GradeRecord>;
  abstract findEnrollmentsByTeacherUserId(teacherUserId: string): Promise<TeacherEnrollmentRow[]>;
}
