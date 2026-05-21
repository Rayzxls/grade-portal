'use client';

import { useEffect, useState } from 'react';
import { COLOR_PRESETS, DAYS, minutesToHHMM, hhmmToMinutes, type SchedulePeriod, type PeriodKind } from './types';

interface CourseOption {
  id: string;
  code: string;
  name: string;
}
interface ClassroomOption {
  id: string;
  gradeLevel: string;
  section: number;
}

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  initial: Partial<SchedulePeriod> & { dayOfWeek: number; startMinutes: number; endMinutes: number };
  courses: CourseOption[];
  classrooms: ClassroomOption[];
  forceSpecial?: boolean;
  onClose: () => void;
  onSave: (data: {
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
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function PeriodDialog({
  open,
  mode,
  initial,
  courses,
  classrooms,
  forceSpecial,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [kind, setKind] = useState<PeriodKind>(forceSpecial ? 'SPECIAL' : initial.kind ?? 'TEACHING');
  const [dayOfWeek, setDayOfWeek] = useState(initial.dayOfWeek);
  const [startStr, setStartStr] = useState(minutesToHHMM(initial.startMinutes));
  const [endStr, setEndStr] = useState(minutesToHHMM(initial.endMinutes));
  const [subjectId, setSubjectId] = useState<string>(initial.subjectId ?? '');
  const [classroomId, setClassroomId] = useState<string>(initial.classroomId ?? '');
  const [room, setRoom] = useState(initial.room ?? '');
  const [title, setTitle] = useState(initial.title ?? '');
  const [color, setColor] = useState(initial.color ?? COLOR_PRESETS[0]);
  const [note, setNote] = useState(initial.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(forceSpecial ? 'SPECIAL' : initial.kind ?? 'TEACHING');
    setDayOfWeek(initial.dayOfWeek);
    setStartStr(minutesToHHMM(initial.startMinutes));
    setEndStr(minutesToHHMM(initial.endMinutes));
    setSubjectId(initial.subjectId ?? '');
    setClassroomId(initial.classroomId ?? '');
    setRoom(initial.room ?? '');
    setTitle(initial.title ?? '');
    setColor(initial.color ?? COLOR_PRESETS[0]);
    setNote(initial.note ?? '');
    setError(null);
  }, [open, initial, forceSpecial]);

  if (!open) return null;

  async function handleSave() {
    setError(null);
    const sm = hhmmToMinutes(startStr);
    const em = hhmmToMinutes(endStr);
    if (em <= sm) {
      setError('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
      return;
    }
    if (kind === 'TEACHING' && !subjectId) {
      setError('กรุณาเลือกรายวิชา');
      return;
    }
    if ((kind === 'ACTIVITY' || kind === 'SPECIAL') && !title.trim()) {
      setError('กรุณาตั้งชื่อกิจกรรม');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        dayOfWeek,
        startMinutes: sm,
        endMinutes: em,
        kind,
        subjectId: kind === 'TEACHING' ? subjectId : null,
        classroomId: classroomId || null,
        room: room.trim() || null,
        title: kind !== 'TEACHING' ? title.trim() : null,
        color,
        note: note.trim() || null,
      });
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm('ลบคาบนี้?')) return;
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'ลบไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold tracking-tight text-ink">
            {mode === 'create' ? '➕ เพิ่มคาบ' : '✏️ แก้ไขคาบ'}
          </h3>
          <button onClick={onClose} className="text-ink-soft hover:text-ink text-xl leading-none">
            ×
          </button>
        </div>

        {/* Kind selector */}
        {!forceSpecial && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">ประเภท</label>
            <div className="flex gap-2">
              <KindBtn active={kind === 'TEACHING'} onClick={() => setKind('TEACHING')}>
                📚 วิชาในระบบ
              </KindBtn>
              <KindBtn active={kind === 'ACTIVITY'} onClick={() => setKind('ACTIVITY')}>
                ✏️ พิมพ์เอง
              </KindBtn>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-3">
          <Field label="วัน">
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="input"
            >
              {DAYS.map((d) => (
                <option key={d.day} value={d.day}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="เริ่ม">
            <input
              type="time"
              value={startStr}
              onChange={(e) => setStartStr(e.target.value)}
              step={900}
              className="input font-mono"
            />
          </Field>
          <Field label="สิ้นสุด">
            <input
              type="time"
              value={endStr}
              onChange={(e) => setEndStr(e.target.value)}
              step={900}
              className="input font-mono"
            />
          </Field>
        </div>

        {kind === 'TEACHING' ? (
          <>
            <Field label="รายวิชา *">
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="input"
              >
                <option value="">— เลือกวิชา —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ห้องเรียน">
                <select
                  value={classroomId}
                  onChange={(e) => setClassroomId(e.target.value)}
                  className="input"
                >
                  <option value="">— ไม่ระบุ —</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.gradeLevel}/{c.section}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="ห้อง (Room)">
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="เช่น 321"
                  className="input"
                />
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field label="ชื่อ/รหัส *">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น แนะแนว, ประชุม, ติวเข้ม, HOMEROOM"
                className="input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ห้องเรียน (ถ้ามี)">
                <select
                  value={classroomId}
                  onChange={(e) => setClassroomId(e.target.value)}
                  className="input"
                >
                  <option value="">— ไม่ระบุ —</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.gradeLevel}/{c.section}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="ห้อง (Room)">
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="เช่น 321"
                  className="input"
                />
              </Field>
            </div>
          </>
        )}

        <Field label="สี">
          <div className="flex gap-2 mt-1">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  color === c ? 'ring-2 ring-amber-500 ring-offset-2 scale-110' : 'border-slate-300'
                }`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>

        <Field label="หมายเหตุ">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="input"
            placeholder="ใส่หมายเหตุได้ตามต้องการ"
          />
        </Field>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <div>
            {mode === 'edit' && onDelete && (
              <button onClick={handleDelete} disabled={saving} className="btn-danger btn-sm">
                ลบ
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving} className="btn-secondary btn-sm">
              ยกเลิก
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-ink-soft mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function KindBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
        active
          ? 'border-ink bg-ink text-white'
          : 'border-slate-200 bg-white text-ink-soft hover:border-slate-300'
      }`}
    >
      {children}
    </button>
  );
}
