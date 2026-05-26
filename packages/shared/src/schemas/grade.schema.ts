import { z } from 'zod';
import { GRADE_LETTERS } from '../types/role';

export const createGradeSchema = z.object({
  enrollmentId: z.string().cuid(),
  score: z.number().min(0).max(100),
});
export type CreateGradeDto = z.infer<typeof createGradeSchema>;

export const updateGradeSchema = z.object({
  score: z.number().min(0).max(100),
});
export type UpdateGradeDto = z.infer<typeof updateGradeSchema>;

// สเปคโรงเรียน: บันทึกคะแนนแบบ 4 หมวด → ระบบคำนวณ total/letter/gpa อัตโนมัติ
// quiz(20%) + homework(20%) + midterm(30%) + final(30%)
export const upsertGradeBucketsSchema = z.object({
  studentId: z.string().cuid(),
  courseId: z.string().cuid(),
  termId: z.string().cuid(),
  quizScore: z.number().min(0).max(100).nullable().optional(),
  homeworkScore: z.number().min(0).max(100).nullable().optional(),
  midtermScore: z.number().min(0).max(100).nullable().optional(),
  finalScore: z.number().min(0).max(100).nullable().optional(),
});
export type UpsertGradeBucketsDto = z.infer<typeof upsertGradeBucketsSchema>;

export const gradeResponseSchema = z.object({
  id: z.string(),
  courseCode: z.string(),
  courseName: z.string(),
  credits: z.number().int(),
  score: z.number(),
  letter: z.enum(GRADE_LETTERS),
  gradePoint: z.number(),
  term: z.object({
    year: z.number().int(),
    semester: z.string(),
  }),
});
export type GradeResponse = z.infer<typeof gradeResponseSchema>;
