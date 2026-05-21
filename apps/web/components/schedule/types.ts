export type ScheduleSemester = 'FIRST' | 'SECOND' | 'SUMMER';
export type PeriodKind = 'TEACHING' | 'ACTIVITY' | 'SPECIAL';

export interface ScheduleSettings {
  id: string;
  teacherId: string;
  startHour: number;
  endHour: number;
  periodMinutes: number;
  showSaturday: boolean;
  showSunday: boolean;
  specialColLabel: string;
  specialColColor: string;
}

export interface SchedulePeriod {
  id: string;
  teacherId: string;
  academicYear: number;
  semester: ScheduleSemester;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  kind: PeriodKind;
  subjectId: string | null;
  classroomId: string | null;
  room: string | null;
  title: string | null;
  color: string;
  note: string | null;
  subject?: { id: string; code: string; name: string } | null;
  classroom?: { id: string; gradeLevel: string; section: number } | null;
}

export const DAYS: { day: number; label: string; short: string }[] = [
  { day: 1, label: 'จันทร์', short: 'จ.' },
  { day: 2, label: 'อังคาร', short: 'อ.' },
  { day: 3, label: 'พุธ', short: 'พ.' },
  { day: 4, label: 'พฤหัสบดี', short: 'พฤ.' },
  { day: 5, label: 'ศุกร์', short: 'ศ.' },
  { day: 6, label: 'เสาร์', short: 'ส.' },
  { day: 7, label: 'อาทิตย์', short: 'อา.' },
];

export const COLOR_PRESETS = [
  '#D1FAE5', // emerald
  '#DBEAFE', // sky
  '#EDE9FE', // violet
  '#FEF3C7', // amber
  '#FFE4E6', // rose
  '#CCFBF1', // teal
  '#E0E7FF', // indigo
  '#F1F5F9', // slate
];

export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
}
