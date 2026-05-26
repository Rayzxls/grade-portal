export const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const GRADE_LETTERS = [
  'A', 'B_PLUS', 'B', 'C_PLUS', 'C', 'D_PLUS', 'D', 'F', 'W', 'I',
] as const;
export type GradeLetter = (typeof GRADE_LETTERS)[number];

// ระดับชั้นในระบบโรงเรียนไทย — ENUM ตายตัว 12 ค่า
// ใช้เป็น single source of truth ทั่วทั้งระบบเพื่อกัน typo
export const GRADE_LEVELS = [
  'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
  'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6',
] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];
