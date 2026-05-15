'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Enrollment {
  id: string;
  student: { studentCode: string; user: { fullName: string } };
  course: { code: string; name: string };
  term: { year: number; semester: string };
  grade: { score: number; letter: string } | null;
}
interface Student { id: string; studentCode: string }
interface Course { id: string; code: string; name: string }
interface Term { id: string; year: number; semester: string }

export default function EnrollmentsPage() {
  const [items, setItems] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [form, setForm] = useState({ studentId: '', courseId: '', termId: '' });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [enrollments, users, courseList, termList] = await Promise.all([
      api.get<Enrollment[]>('/admin/enrollments'),
      api.get<{ student: Student | null }[]>('/admin/users'),
      api.get<Course[]>('/admin/courses'),
      api.get<Term[]>('/admin/terms'),
    ]);
    setItems(enrollments);
    setStudents(users.map((u) => u.student).filter((s): s is Student => !!s));
    setCourses(courseList);
    setTerms(termList);
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/admin/enrollments', form);
      setForm({ studentId: '', courseId: '', termId: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }

  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight">การลงทะเบียน</h2>
      <p className="mt-1 text-sm text-ink-soft">จัดการการลงทะเบียนเรียนของนักเรียน</p>

      <form onSubmit={submit} className="card mt-6 grid animate-slide-up grid-cols-4 gap-2 p-4">
        <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required className="input">
          <option value="">-- นักเรียน --</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.studentCode}</option>)}
        </select>
        <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} required className="input">
          <option value="">-- รายวิชา --</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}
        </select>
        <select value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })} required className="input">
          <option value="">-- เทอม --</option>
          {terms.map((t) => <option key={t.id} value={t.id}>{t.year}/{t.semester}</option>)}
        </select>
        <button type="submit" className="btn-primary btn-sm">+ ลงทะเบียน</button>
        {error && <p className="col-span-4 text-sm text-rose-600">{error}</p>}
      </form>

      <table className="table mt-6">
        <thead>
          <tr>
            <th >รหัสนักศึกษา</th>
            <th >ชื่อ</th>
            <th >รายวิชา</th>
            <th >เทอม</th>
            <th className="px-4 py-2 text-center">เกรด</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id} >
              <td className="px-4 py-2 font-mono">{e.student.studentCode}</td>
              <td >{e.student.user.fullName}</td>
              <td >{e.course.code} {e.course.name}</td>
              <td >{e.term.year}/{e.term.semester[0]}</td>
              <td className="px-4 py-2 text-center">{e.grade ? `${e.grade.score} (${e.grade.letter})` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
