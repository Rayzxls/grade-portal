'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface MyClassroom {
  id: string;
  gradeLevel: string;
  section: number;
  academicYear: number;
  role: 'HOMEROOM' | 'SUBJECT_TEACHER';
  _count: { students: number };
  students: { id: string; studentCode: string; user: { fullName: string; email: string } }[];
  mySubjects: {
    sheetId: string;
    finalized: boolean;
    course: { id: string; code: string; name: string };
    term: { id: string; year: number; semester: string };
  }[];
}

const SEM_LABEL: Record<string, string> = { FIRST: '1', SECOND: '2', SUMMER: 'ฤดูร้อน' };

export default function TeacherClassroomsPage() {
  const [items, setItems] = useState<MyClassroom[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setItems(await api.get<MyClassroom[]>('/teacher/classrooms'));
  }
  useEffect(() => { load(); }, []);

  const homerooms = items.filter((c) => c.role === 'HOMEROOM');
  const teachingOnly = items.filter((c) => c.role === 'SUBJECT_TEACHER');

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ห้องของฉัน</h2>
          <p className="mt-1 text-sm text-ink-soft">ห้องประจำชั้น + ห้องที่ฉันสอนวิชาในนั้น</p>
        </div>
        <Link href="/teacher/classrooms/new" className="btn-primary">+ สร้างห้องใหม่</Link>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      {items.length === 0 && (
        <div className="card p-8 text-center text-ink-soft">
          ยังไม่มีห้อง — สร้างห้องประจำชั้นของคุณ หรือรอ admin มอบหมายวิชาให้
        </div>
      )}

      {homerooms.length > 0 && (
        <Section title="🏫 ห้องประจำชั้น" subtitle="ห้องที่คุณดูแลทั้งหมด">
          {homerooms.map((c) => <Card key={c.id} c={c} onChanged={load} setError={setError} />)}
        </Section>
      )}

      {teachingOnly.length > 0 && (
        <Section title="📚 ห้องที่ฉันสอน" subtitle="ห้องอื่นๆ ที่คุณรับผิดชอบสอนรายวิชา">
          {teachingOnly.map((c) => <Card key={c.id} c={c} onChanged={load} setError={setError} />)}
        </Section>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        <p className="text-xs text-ink-soft">{subtitle}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Card({ c, onChanged, setError }: { c: MyClassroom; onChanged: () => Promise<void>; setError: (e: string) => void }) {
  const isHomeroom = c.role === 'HOMEROOM';
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{c.gradeLevel}/{c.section}</span>
              {isHomeroom ? (
                <span className="badge-gold !text-[10px]">ครูประจำชั้น</span>
              ) : (
                <span className="badge badge-teacher !text-[10px]">ครูผู้สอน</span>
              )}
            </div>
            <div className="text-sm text-ink-soft">ปีการศึกษา {c.academicYear} · {c._count.students} คน</div>
          </div>
        </div>
        <div className="flex gap-2">
          {isHomeroom && (
            <>
              <button
                onClick={async () => {
                  const gl = prompt('ชั้น (เช่น ม.4)', c.gradeLevel);
                  if (!gl) return;
                  const secStr = prompt('ห้อง', String(c.section));
                  const yrStr = prompt('ปีการศึกษา', String(c.academicYear));
                  const section = Number(secStr); const academicYear = Number(yrStr);
                  if (!section || !academicYear) return;
                  try {
                    await api.patch(`/teacher/classrooms/${c.id}`, { gradeLevel: gl, section, academicYear });
                    await onChanged();
                  } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
                }}
                className="btn-ghost btn-sm"
              >✎ แก้ไข</button>
              <button
                onClick={async () => {
                  if (!confirm(`ลบห้อง ${c.gradeLevel}/${c.section}?\n(ต้องไม่มีนักเรียน/สมุดคะแนนผูกอยู่)`)) return;
                  try {
                    await api.delete(`/teacher/classrooms/${c.id}`);
                    await onChanged();
                  } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
                }}
                className="btn-ghost btn-sm text-rose-600 hover:text-rose-700"
              >ลบ</button>
            </>
          )}
          <Link href={`/teacher/classrooms/${c.id}`} className="btn-secondary btn-sm">
            {isHomeroom ? 'จัดการ →' : 'เปิดสมุดคะแนน →'}
          </Link>
        </div>
      </div>

      {/* วิชาที่ฉันสอนในห้องนี้ */}
      {c.mySubjects.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold mb-2">
            วิชาที่ฉันสอน ({c.mySubjects.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {c.mySubjects.map((s) => (
              <span
                key={s.sheetId}
                className={`badge ${s.finalized ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'}`}
                title={`เทอม ${SEM_LABEL[s.term.semester] ?? s.term.semester}/${s.term.year}`}
              >
                <span className="font-mono mr-1">{s.course.code}</span>
                {s.course.name}
                {s.finalized && ' ✓'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* รายชื่อ น.ร. (เฉพาะ homeroom ถึงเห็น) */}
      {isHomeroom && c.students.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold mb-2">นักเรียน</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {c.students.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="font-mono text-ink-soft">{s.studentCode}</span>
                <span>{s.user.fullName}</span>
              </div>
            ))}
            {c.students.length > 6 && (
              <div className="text-ink-soft">+อีก {c.students.length - 6} คน</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
