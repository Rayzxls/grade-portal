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
