'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface MyClassroom {
  id: string;
  gradeLevel: string;
  section: number;
  academicYear: number;
  _count: { students: number };
  students: { id: string; studentCode: string; user: { fullName: string; email: string } }[];
}

const GRADE_LEVELS = ['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'];

export default function TeacherClassroomsPage() {
  const [items, setItems] = useState<MyClassroom[]>([]);
  const [form, setForm] = useState({ gradeLevel: 'ม.4', section: '1', academicYear: '2568' });
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function load() {
    setItems(await api.get<MyClassroom[]>('/teacher/classrooms'));
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/teacher/classrooms', {
        gradeLevel: form.gradeLevel,
        section: Number(form.section),
        academicYear: Number(form.academicYear),
      });
      setFlash(`สร้างห้อง ${form.gradeLevel}/${form.section} เรียบร้อย`);
      setForm({ gradeLevel: 'ม.4', section: '1', academicYear: '2568' });
      await load();
      setTimeout(() => setFlash(null), 2500);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }

  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight">ห้องประจำชั้นของฉัน</h2>
      <p className="mt-1 text-sm text-ink-soft">สร้างห้องใหม่ที่คุณเป็นครูประจำชั้น</p>

      {flash && <div className="mt-4 animate-fade-in rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{flash}</div>}
      {error && <div className="mt-4 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <form onSubmit={submit} className="card mt-6 grid animate-slide-up grid-cols-4 gap-2 p-4">
        <select value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} className="input">
          {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input type="number" placeholder="ห้อง (เลข)" min={1} max={99} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} required className="input" />
        <input type="number" placeholder="ปีการศึกษา (พ.ศ.)" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} required className="input" />
        <button type="submit" className="btn-primary btn-sm">+ สร้างห้อง</button>
      </form>

      <div className="mt-8 space-y-4">
        {items.length === 0 && (
          <div className="card p-8 text-center text-ink-soft">
            ยังไม่มีห้องประจำชั้น — สร้างห้องแรกของคุณด้านบน
          </div>
        )}
        {items.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xl font-bold">{c.gradeLevel}/{c.section}</div>
                <div className="text-sm text-ink-soft">ปีการศึกษา {c.academicYear} · {c._count.students} คน</div>
              </div>
              <div className="flex gap-2">
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
                      await load();
                    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
                  }}
                  className="btn-ghost btn-sm"
                >✎ แก้ไข</button>
                <button
                  onClick={async () => {
                    if (!confirm(`ลบห้อง ${c.gradeLevel}/${c.section}?\n(ต้องไม่มีนักเรียน/สมุดคะแนนผูกอยู่)`)) return;
                    try {
                      await api.delete(`/teacher/classrooms/${c.id}`);
                      await load();
                    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
                  }}
                  className="btn-ghost btn-sm text-rose-600 hover:text-rose-700"
                >ลบ</button>
                <Link href={`/teacher/classrooms/${c.id}`} className="btn-secondary btn-sm">
                  จัดการ →
                </Link>
              </div>
            </div>

            {c.students.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
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
        ))}
      </div>
    </div>
  );
}
