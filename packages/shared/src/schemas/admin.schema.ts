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

// Teacher สร้างห้อง — homeroomTeacherId จะถูกตั้งเป็น userId ของผู้สร้างใน controller
export const teacherCreateClassroomSchema = z.object({
  gradeLevel: z.string().min(1),
  section: z.number().int().min(1).max(99),
  academicYear: z.number().int().min(2500).max(2600),
});
export type TeacherCreateClassroomDto = z.infer<typeof teacherCreateClassroomSchema>;

// Teacher สร้างวิชา — teacherId = ตัวเอง
export const teacherCreateCourseSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  credits: z.number().int().min(1).max(6),
  gradeLevel: z.string().min(1),
});
export type TeacherCreateCourseDto = z.infer<typeof teacherCreateCourseSchema>;

// Bulk เพิ่มนักเรียนเข้าห้อง (1 row = 1 user + student)
export const bulkAddStudentsSchema = z.object({
  classroomId: z.string().cuid(),
  students: z
    .array(
      z.object({
        studentCode: z.string().min(1),
        fullName: z.string().min(1),
        email: z.string().email().optional(), // ไม่ใส่ → gen จาก studentCode
        enrollYear: z.number().int().min(2500).max(2600),
      }),
    )
    .min(1)
    .max(100),
});
export type BulkAddStudentsDto = z.infer<typeof bulkAddStudentsSchema>;

// Workspace: เพิ่ม/ลบวิชาให้ห้อง (เทียบเท่า bulk enroll แต่ผ่าน workspace)
export const addSubjectToClassroomSchema = z.object({
  courseId: z.string().cuid(),
  termId: z.string().cuid(),
});
export type AddSubjectToClassroomDto = z.infer<typeof addSubjectToClassroomSchema>;

// สมุดเก็บคะแนน — สร้างเล่ม + จัดการ column + บันทึกค่า
export const createScoreSheetSchema = z.object({
  courseId: z.string().cuid(),
  termId: z.string().cuid(),
  columns: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        maxScore: z.number().min(1).max(1000),
      }),
    )
    .min(1)
    .max(20),
});
export type CreateScoreSheetDto = z.infer<typeof createScoreSheetSchema>;

export const updateColumnSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  maxScore: z.number().min(1).max(1000).optional(),
});
export type UpdateColumnDto = z.infer<typeof updateColumnSchema>;

export const addColumnSchema = z.object({
  name: z.string().min(1).max(40),
  maxScore: z.number().min(1).max(1000),
});
export type AddColumnDto = z.infer<typeof addColumnSchema>;

export const saveCellsSchema = z.object({
  cells: z
    .array(
      z.object({
        columnId: z.string().cuid(),
        studentId: z.string().cuid(),
        value: z.number().nullable(),
      }),
    )
    .min(1)
    .max(1000),
});
export type SaveCellsDto = z.infer<typeof saveCellsSchema>;

// Default template
export const DEFAULT_SCORE_COLUMNS = [
  { name: 'สอบกลางภาค', maxScore: 30 },
  { name: 'สอบปลายภาค', maxScore: 30 },
  { name: 'งาน/รายงาน', maxScore: 20 },
  { name: 'จิตพิสัย', maxScore: 10 },
  { name: 'สอบย่อย', maxScore: 10 },
];

// Workspace: บันทึกคะแนนหลายคนพร้อมกัน (null = เคลียร์เกรด)
export const saveScoresSchema = z.object({
  courseId: z.string().cuid(),
  termId: z.string().cuid(),
  items: z
    .array(
      z.object({
        enrollmentId: z.string().cuid(),
        score: z.number().min(0).max(100).nullable(),
      }),
    )
    .min(1)
    .max(200),
});
export type SaveScoresDto = z.infer<typeof saveScoresSchema>;

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
