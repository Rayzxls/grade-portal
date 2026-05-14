export const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const GRADE_LETTERS = [
  'A', 'B_PLUS', 'B', 'C_PLUS', 'C', 'D_PLUS', 'D', 'F', 'W', 'I',
] as const;
export type GradeLetter = (typeof GRADE_LETTERS)[number];
