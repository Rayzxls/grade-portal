import { z } from 'zod';

export const SEMESTERS = ['FIRST', 'SECOND', 'SUMMER'] as const;
export const PERIOD_KINDS = ['TEACHING', 'ACTIVITY', 'SPECIAL'] as const;

export type ScheduleSemester = (typeof SEMESTERS)[number];
export type PeriodKind = (typeof PERIOD_KINDS)[number];

// ============ Settings ============
export const updateScheduleSettingsSchema = z.object({
  startHour: z.number().int().min(0).max(23).optional(),
  endHour: z.number().int().min(1).max(24).optional(),
  periodMinutes: z.number().int().min(15).max(180).optional(),
  showSaturday: z.boolean().optional(),
  showSunday: z.boolean().optional(),
  specialColLabel: z.string().min(1).max(50).optional(),
  specialColColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});
export type UpdateScheduleSettingsDto = z.infer<typeof updateScheduleSettingsSchema>;

// ============ Period ============
const periodBaseSchema = z.object({
  academicYear: z.number().int().min(2500).max(2600),
  semester: z.enum(SEMESTERS),
  dayOfWeek: z.number().int().min(1).max(7),
  startMinutes: z.number().int().min(0).max(24 * 60),
  endMinutes: z.number().int().min(0).max(24 * 60),
  kind: z.enum(PERIOD_KINDS).default('TEACHING'),
  subjectId: z.string().cuid().nullable().optional(),
  classroomId: z.string().cuid().nullable().optional(),
  room: z.string().max(50).nullable().optional(),
  title: z.string().max(100).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#D1FAE5'),
  note: z.string().max(500).nullable().optional(),
});

export const createSchedulePeriodSchema = periodBaseSchema.refine(
  (d) => d.endMinutes > d.startMinutes,
  { message: 'endMinutes ต้องมากกว่า startMinutes', path: ['endMinutes'] },
);
export type CreateSchedulePeriodDto = z.infer<typeof createSchedulePeriodSchema>;

export const updateSchedulePeriodSchema = periodBaseSchema.partial().refine(
  (d) => d.startMinutes == null || d.endMinutes == null || d.endMinutes > d.startMinutes,
  { message: 'endMinutes ต้องมากกว่า startMinutes', path: ['endMinutes'] },
);
export type UpdateSchedulePeriodDto = z.infer<typeof updateSchedulePeriodSchema>;

export const listSchedulePeriodsSchema = z.object({
  academicYear: z.coerce.number().int().min(2500).max(2600),
  semester: z.enum(SEMESTERS),
});
export type ListSchedulePeriodsDto = z.infer<typeof listSchedulePeriodsSchema>;

export const copyScheduleSchema = z.object({
  fromYear: z.number().int().min(2500).max(2600),
  fromSemester: z.enum(SEMESTERS),
  toYear: z.number().int().min(2500).max(2600),
  toSemester: z.enum(SEMESTERS),
});
export type CopyScheduleDto = z.infer<typeof copyScheduleSchema>;
