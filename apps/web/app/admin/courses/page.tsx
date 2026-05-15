'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  gradeLevel: string;
  teacher: { id: string; staffCode: string; user: { fullName: string } };
}

interface Teacher { id: string; staffCode: string; department: string }

export default function CoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState({ code: '', name: '', credits: '3', gradeLevel: 'ม.4', teacherId: '' });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [courses, users] = await Promise.all([
      api.get<Course[]>('/admin/courses'),
      api.get<{ teacher: Teacher | null }[]>('/admin/users'),
    ]);
    setItems(courses);
    setTeachers(users.map((u) => u.teacher).filter((t): t is Teacher => !!t));
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/admin/courses', {
        code: form.code, name: form.name,
        credits: Number(form.credits),
        gradeLevel: form.gradeLevel,
        teacherId: form.teacherId,
      });
      setForm({ code: '', name: '', credits: '3', gradeLevel: 'ม.4', teacherId: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }

  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight">รายวิชา</h2>
      <p className="mt-1 text-sm text-ink-soft">จัดการรายวิชาที่เปิดสอน</p>

      <form onSubmit={submit} className="card mt-6 grid animate-slide-up grid-cols-6 gap-2 p-4">
        <input placeholder="รหัสวิชา" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required className="input" />
        <input placeholder="ชื่อวิชา" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input col-span-2" />
        <select value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} className="input">
          {['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'].map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input type="number" min={1} max={6} value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} required className="input" placeholder="หน่วยกิต" />
        <select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} required className="input">
          <option value="">-- ครูผู้สอน --</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.staffCode} ({t.department})</option>)}
        </select>
        <button type="submit" className="btn-primary col-span-6">+ เพิ่มวิชา</button>
        {error && <p className="col-span-6 text-sm text-rose-600">{error}</p>}
      </form>

      <table className="table mt-6">
        <thead>
          <tr>
            <th className="">รหัส</th>
            <th className="">ชื่อวิชา</th>
            <th className=" text-center">ชั้น</th>
            <th className=" text-center">หน่วยกิต</th>
            <th className="">ครูผู้สอน</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} >
              <td className=" font-mono">{c.code}</td>
              <td className="">{c.name}</td>
              <td className=" text-center">{c.gradeLevel}</td>
              <td className=" text-center">{c.credits}</td>
              <td className="">{c.teacher.user.fullName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
