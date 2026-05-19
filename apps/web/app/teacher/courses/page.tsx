'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface MyCourse {
  id: string;
  code: string;
  name: string;
  credits: number;
  gradeLevel: string;
  _count: { enrollments: number };
}

const GRADE_LEVELS = ['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'];

export default function TeacherCoursesPage() {
  const [items, setItems] = useState<MyCourse[]>([]);
  const [form, setForm] = useState({ code: '', name: '', credits: '3', gradeLevel: 'ม.4' });
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function load() { setItems(await api.get<MyCourse[]>('/teacher/courses')); }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/teacher/courses', {
        code: form.code, name: form.name,
        credits: Number(form.credits),
        gradeLevel: form.gradeLevel,
      });
      setFlash(`สร้างวิชา ${form.code} เรียบร้อย`);
      setForm({ code: '', name: '', credits: '3', gradeLevel: 'ม.4' });
      await load();
      setTimeout(() => setFlash(null), 2500);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }

  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight">วิชาที่ฉันสอน</h2>
      <p className="mt-1 text-sm text-ink-soft">สร้างรายวิชาใหม่ที่คุณเป็นครูผู้สอน</p>

      {flash && <div className="mt-4 animate-fade-in rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{flash}</div>}
      {error && <div className="mt-4 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <form onSubmit={submit} className="card mt-6 grid animate-slide-up grid-cols-5 gap-2 p-4">
        <input placeholder="รหัสวิชา (เช่น MATH-M4-002)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required className="input col-span-2" />
        <input placeholder="ชื่อวิชา" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input col-span-2" />
        <select value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} className="input">
          {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input type="number" min={1} max={6} value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} required placeholder="หน่วยกิต" className="input" />
        <button type="submit" className="btn-primary col-span-5">+ สร้างวิชา</button>
      </form>

      <table className="table mt-6">
        <thead>
          <tr>
            <th>รหัส</th>
            <th>ชื่อวิชา</th>
            <th className="text-center">ชั้น</th>
            <th className="text-center">หน่วยกิต</th>
            <th className="text-center">ลงทะเบียนแล้ว</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={5} className="py-10 text-center text-ink-soft">ยังไม่มีวิชาที่สอน</td></tr>
          ) : items.map((c) => (
            <tr key={c.id}>
              <td className="font-mono text-xs">{c.code}</td>
              <td>{c.name}</td>
              <td className="text-center">{c.gradeLevel}</td>
              <td className="text-center">{c.credits}</td>
              <td className="text-center">{c._count.enrollments}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
