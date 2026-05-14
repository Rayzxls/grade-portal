'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  teacher: { id: string; staffCode: string; user: { fullName: string } };
}

interface Teacher { id: string; staffCode: string; department: string }

export default function CoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState({ code: '', name: '', credits: '3', teacherId: '' });
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
        credits: Number(form.credits), teacherId: form.teacherId,
      });
      setForm({ code: '', name: '', credits: '3', teacherId: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold">รายวิชา</h2>

      <form onSubmit={submit} className="mt-6 grid grid-cols-5 gap-2 rounded-lg border bg-white p-4">
        <input placeholder="รหัส (CS101)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required className="rounded-md border px-2 py-1.5 text-sm" />
        <input placeholder="ชื่อวิชา" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="col-span-2 rounded-md border px-2 py-1.5 text-sm" />
        <input type="number" min={1} max={6} value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} required className="rounded-md border px-2 py-1.5 text-sm" />
        <select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} required className="rounded-md border px-2 py-1.5 text-sm">
          <option value="">-- เลือกอาจารย์ --</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.staffCode} ({t.department})</option>)}
        </select>
        <button type="submit" className="col-span-5 rounded-md bg-slate-900 py-2 text-sm text-white">+ เพิ่มวิชา</button>
        {error && <p className="col-span-5 text-sm text-red-600">{error}</p>}
      </form>

      <table className="mt-6 w-full rounded-lg border bg-white text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="px-4 py-2">รหัส</th>
            <th className="px-4 py-2">ชื่อ</th>
            <th className="px-4 py-2 text-center">หน่วยกิต</th>
            <th className="px-4 py-2">อาจารย์</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="px-4 py-2 font-mono">{c.code}</td>
              <td className="px-4 py-2">{c.name}</td>
              <td className="px-4 py-2 text-center">{c.credits}</td>
              <td className="px-4 py-2">{c.teacher.user.fullName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
