'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { PeriodDialog } from '@/components/schedule/PeriodDialog';
import { SettingsDialog } from '@/components/schedule/SettingsDialog';
import {
  COLOR_PRESETS,
  type ScheduleSettings,
  type SchedulePeriod,
  type ScheduleSemester,
} from '@/components/schedule/types';

const CURRENT_YEAR = 2569;
const SEMESTERS: { value: ScheduleSemester; label: string }[] = [
  { value: 'FIRST', label: 'ภาคเรียนที่ 1' },
  { value: 'SECOND', label: 'ภาคเรียนที่ 2' },
  { value: 'SUMMER', label: 'ภาคฤดูร้อน' },
];

interface CourseOpt { id: string; code: string; name: string }
interface ClassroomOpt { id: string; gradeLevel: string; section: number; _count?: { students: number } }
interface TeacherProfile { fullName: string; staffCode: string; department: string }

export default function SchedulePage() {
  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [periods, setPeriods] = useState<SchedulePeriod[]>([]);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOpt[]>([]);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [semester, setSemester] = useState<ScheduleSemester>('FIRST');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogForceSpecial, setDialogForceSpecial] = useState(false);
  const [editing, setEditing] = useState<SchedulePeriod | null>(null);
  const [createDefaults, setCreateDefaults] = useState<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>({
    dayOfWeek: 1,
    startMinutes: 480,
    endMinutes: 540,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p, c, cr, me] = await Promise.all([
        api.get<ScheduleSettings>('/teacher/schedule/settings'),
        api.get<SchedulePeriod[]>(`/teacher/schedule/periods?academicYear=${year}&semester=${semester}`),
        api.get<CourseOpt[]>('/teacher/courses'),
        api.get<ClassroomOpt[]>('/teacher/classrooms'),
        api.get<TeacherProfile>('/auth/me').catch(() => null),
      ]);
      setSettings(s);
      setPeriods(p);
      setCourses(c);
      setClassrooms(cr);
      setProfile(me as TeacherProfile | null);
    } catch (e: any) {
      setError(e.message ?? 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [year, semester]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const stats = useMemo(() => {
    const teaching = periods.filter((p) => p.kind === 'TEACHING');
    const subjects = new Set(teaching.map((p) => p.subjectId).filter(Boolean));
    const rooms = new Set(teaching.map((p) => p.classroomId).filter(Boolean));
    const totalMin = teaching.reduce((s, p) => s + (p.endMinutes - p.startMinutes), 0);
    return {
      periodCount: teaching.length,
      subjectCount: subjects.size,
      classroomCount: rooms.size,
      hoursPerWeek: Math.round((totalMin / 60) * 10) / 10,
    };
  }, [periods]);

  function handleCellClick(dayOfWeek: number, startMinutes: number) {
    if (!settings) return;
    setEditing(null);
    setDialogForceSpecial(false);
    setDialogMode('create');
    setCreateDefaults({
      dayOfWeek,
      startMinutes,
      endMinutes: Math.min(startMinutes + settings.periodMinutes, 24 * 60),
    });
    setDialogOpen(true);
  }

  function handleSpecialClick(dayOfWeek: number) {
    if (!settings) return;
    setEditing(null);
    setDialogForceSpecial(true);
    setDialogMode('create');
    setCreateDefaults({
      dayOfWeek,
      startMinutes: settings.startHour * 60,
      endMinutes: settings.startHour * 60 + 60,
    });
    setDialogOpen(true);
  }

  function handleBlockClick(p: SchedulePeriod) {
    setEditing(p);
    setDialogForceSpecial(p.kind === 'SPECIAL');
    setDialogMode('edit');
    setCreateDefaults({
      dayOfWeek: p.dayOfWeek,
      startMinutes: p.startMinutes,
      endMinutes: p.endMinutes,
    });
    setDialogOpen(true);
  }

  async function handleSave(data: any) {
    const payload = { ...data, academicYear: year, semester };
    if (editing) {
      await api.patch(`/teacher/schedule/periods/${editing.id}`, payload);
    } else {
      await api.post('/teacher/schedule/periods', payload);
    }
    await loadAll();
  }

  async function handleDelete() {
    if (!editing) return;
    await api.delete(`/teacher/schedule/periods/${editing.id}`);
    await loadAll();
  }

  async function handleSaveSettings(patch: Partial<ScheduleSettings>) {
    const next = await api.patch<ScheduleSettings>('/teacher/schedule/settings', patch);
    setSettings(next);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-64 rounded bg-slate-200 animate-pulse" />
        <div className="h-96 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="card p-6 border-rose-200 bg-rose-50">
        <p className="text-rose-700 font-semibold">เกิดข้อผิดพลาด</p>
        <p className="text-sm text-rose-600 mt-1">{error ?? 'ไม่พบการตั้งค่าตารางสอน'}</p>
        <button onClick={loadAll} className="btn-secondary btn-sm mt-3">ลองใหม่</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="badge-gold">ตารางสอน</div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            {profile?.fullName ?? 'ตารางสอนของฉัน'}
          </h2>
          <p className="text-sm text-ink-soft mt-0.5">
            {profile?.department ? `${profile.department} · ` : ''}
            {SEMESTERS.find((s) => s.value === semester)?.label} ปีการศึกษา {year}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="input !py-1.5 !text-sm w-auto"
          >
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
              <option key={y} value={y}>ปี {y}</option>
            ))}
          </select>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value as ScheduleSemester)}
            className="input !py-1.5 !text-sm w-auto"
          >
            {SEMESTERS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button onClick={() => setSettingsOpen(true)} className="btn-ghost btn-sm" title="ตั้งค่า">
            ⚙️ ตั้งค่า
          </button>
          <button onClick={() => window.print()} className="btn-ghost btn-sm" title="พิมพ์">
            🖨 พิมพ์
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setDialogForceSpecial(false);
              setDialogMode('create');
              setCreateDefaults({
                dayOfWeek: 1,
                startMinutes: settings.startHour * 60 + 60,
                endMinutes: settings.startHour * 60 + 120,
              });
              setDialogOpen(true);
            }}
            className="btn-primary btn-sm"
          >
            + เพิ่มคาบ
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Mini label="คาบสอน/สัปดาห์" value={stats.periodCount} />
        <Mini label="ชั่วโมงสอน/สัปดาห์" value={stats.hoursPerWeek} suffix=" ชม." />
        <Mini label="วิชา" value={stats.subjectCount} />
        <Mini label="ห้องเรียน" value={stats.classroomCount} />
      </div>

      {/* Empty state hint */}
      {periods.length === 0 && (
        <div className="card p-4 border-amber-200 bg-amber-50/50">
          <p className="text-sm text-amber-900">
            💡 <b>วิธีใช้:</b> คลิกในช่องว่างของตารางเพื่อเพิ่มคาบสอน, หรือกดปุ่ม <b>+ เพิ่มคาบ</b> ด้านบน — คลิกที่บล็อกเพื่อแก้ไข
          </p>
        </div>
      )}

      {/* Grid */}
      <ScheduleGrid
        settings={settings}
        periods={periods}
        onCellClick={handleCellClick}
        onBlockClick={handleBlockClick}
        onSpecialClick={handleSpecialClick}
      />

      {/* Legend / tips */}
      <div className="text-xs text-ink-soft flex flex-wrap gap-x-4 gap-y-1">
        <span>📌 คลิกช่องว่าง = เพิ่มคาบ</span>
        <span>📝 คลิกบล็อก = แก้ไข/ลบ</span>
        <span>🎯 คลิกคอลัมน์เหลือง = เพิ่มกิจกรรมประจำวัน</span>
      </div>

      {dialogOpen && (
        <PeriodDialog
          open={dialogOpen}
          mode={dialogMode}
          initial={
            editing
              ? editing
              : {
                  ...createDefaults,
                  kind: dialogForceSpecial ? 'SPECIAL' : 'TEACHING',
                  color: COLOR_PRESETS[0],
                }
          }
          courses={courses}
          classrooms={classrooms}
          forceSpecial={dialogForceSpecial}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          onDelete={editing ? handleDelete : undefined}
        />
      )}

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

function Mini({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="text-xl font-bold text-ink mt-0.5">
        {value}
        {suffix && <span className="text-sm font-normal text-ink-soft">{suffix}</span>}
      </p>
    </div>
  );
}
