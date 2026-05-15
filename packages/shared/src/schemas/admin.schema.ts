import { z } from 'zod';
import { ROLES } from '../types/role';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.enum(ROLES),
  // เมื่อ role = STUDENT ต้องส่ง student profile
  student: z
    .object({
      studentCode: z.string().min(1),
      enrollYear: z.number().int().min(2500).max(2600),
      classroomId: z.string().cuid().optional(), // จัดเข้าห้องทีหลังก็ได้
    })
    .optional(),
  // เมื่อ role = TEACHER ต้องส่ง teacher profile
  teacher: z
    .object({
      staffCode: z.string().min(1),
      department: z.string().min(1),
    })
    .optional(),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const createCourseSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  credits: z.number().int().min(1).max(6),
  gradeLevel: z.string().min(1), // เช่น "ม.4"
  teacherId: z.string().cuid(),
});
export type CreateCourseDto = z.infer<typeof createCourseSchema>;

export const createClassroomSchema = z.object({
  gradeLevel: z.string().min(1),
  section: z.number().int().min(1).max(99),
  academicYear: z.number().int().min(2500).max(2600),
  homeroomTeacherId: z.string().cuid().optional(),
});
export type CreateClassroomDto = z.infer<typeof createClassroomSchema>;

export const assignStudentToClassroomSchema = z.object({
  studentId: z.string().cuid(),
  classroomId: z.string().cuid(),
});
export type AssignStudentToClassroomDto = z.infer<typeof assignStudentToClassroomSchema>;

// ลงทะเบียนทั้งห้องเรียนเข้ารายวิชา (1 ปุ่ม → enroll นักเรียนทั้ง 30+ คน)
export const bulkEnrollClassroomSchema = z.object({
  classroomId: z.string().cuid(),
  courseId: z.string().cuid(),
  termId: z.string().cuid(),
});
export type BulkEnrollClassroomDto = z.infer<typeof bulkEnrollClassroomSchema>;

export const createTermSchema = z.object({
  year: z.number().int().min(2500).max(2600),
  semester: z.enum(['FIRST', 'SECOND', 'SUMMER']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});
export type CreateTermDto = z.infer<typeof createTermSchema>;

export const createEnrollmentSchema = z.object({
  studentId: z.string().cuid(),
  courseId: z.string().cuid(),
  termId: z.string().cuid(),
});
export type CreateEnrollmentDto = z.infer<typeof createEnrollmentSchema>;
