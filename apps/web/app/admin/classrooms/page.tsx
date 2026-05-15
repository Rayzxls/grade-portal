'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Classroom {
  id: string;
  gradeLevel: string;
  section: number;
  academicYear: number;
  homeroomTeacher: { user: { fullName: string }; staffCode: string } | null;
  _count: { students: number };
}
interface Teacher { id: string; staffCode: string }

export default function ClassroomsPage() {
  const [items, setItems] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState({ gradeLevel: 'ม.4', section: '1', academicYear: '2568', homeroomTeacherId: '' });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [classrooms, users] = await Promise.all([
      api.get<Classroom[]>('/admin/classrooms'),
      api.get<{ teacher: Teacher | null }[]>('/admin/users'),
    ]);
    setItems(classrooms);
    setTeachers(users.map((u) => u.teacher).filter((t): t is Teacher => !!t));
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/admin/classrooms', {
        gradeLevel: form.gradeLevel,
        section: Number(form.section),
        academicYear: Number(form.academicYear),
        homeroomTeacherId: form.homeroomTeacherId || undefined,
      });
      setForm({ gradeLevel: 'ม.4', section: '1', academicYear: '2568', homeroomTeacherId: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }

  const GRADE_LEVELS = ['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'];

  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight">ห้องเรียน</h2>
      <p className="mt-1 text-sm text-ink-soft">จัดการชั้นเรียน (ชั้น/ห้อง) และครูประจำชั้น</p>

      <form onSubmit={submit} className="card mt-6 grid animate-slide-up grid-cols-5 gap-2 p-4">
        <select value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} className="input">
          {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input type="number" placeholder="ห้อง" min={1} max={99} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} required className="input" />
        <input type="number" placeholder="ปีการศึกษา" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} required className="input" />
        <select value={form.homeroomTeacherId} onChange={(e) => setForm({ ...form, homeroomTeacherId: e.target.value })} className="input">
          <option value="">-- ครูประจำชั้น (ไม่บังคับ) --</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.staffCode}</option>)}
        </select>
        <button type="submit" className="btn-primary btn-sm">+ เพิ่ม</button>
        {error && <p className="col-span-5 text-sm text-rose-600">{error}</p>}
      </form>

      <table className="table mt-6">
        <thead>
          <tr>
            <th>ห้อง</th>
            <th>ปีการศึกษา</th>
            <th>ครูประจำชั้น</th>
            <th className="text-center">จำนวนนักเรียน</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td className="font-semibold">{c.gradeLevel}/{c.section}</td>
              <td>{c.academicYear}</td>
              <td>{c.homeroomTeacher?.user.fullName ?? <span className="text-ink-soft">ยังไม่กำหนด</span>}</td>
              <td className="text-center font-semibold text-ink">{c._count.students}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
