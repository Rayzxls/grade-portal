'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Enrollment {
  id: string;
  student: { studentCode: string; user: { fullName: string } };
  course: { code: string; name: string; gradeLevel: string };
  term: { year: number; semester: string };
  grade: { score: number; letter: string } | null;
}
interface Student { id: string; studentCode: string }
interface Course { id: string; code: string; name: string; gradeLevel: string }
interface Term { id: string; year: number; semester: string }
interface Classroom { id: string; gradeLevel: string; section: number; academicYear: number; _count: { students: number } }

export default function EnrollmentsPage() {
  const [items, setItems] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [mode, setMode] = useState<'single' | 'bulk'>('bulk');
  const [single, setSingle] = useState({ studentId: '', courseId: '', termId: '' });
  const [bulk, setBulk] = useState({ classroomId: '', courseId: '', termId: '' });
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const [enrollments, users, courseList, termList, classroomList] = await Promise.all([
      api.get<Enrollment[]>('/admin/enrollments'),
      api.get<{ student: Student | null }[]>('/admin/users'),
      api.get<Course[]>('/admin/courses'),
      api.get<Term[]>('/admin/terms'),
      api.get<Classroom[]>('/admin/classrooms'),
    ]);
    setItems(enrollments);
    setStudents(users.map((u) => u.student).filter((s): s is Student => !!s));
    setCourses(courseList);
    setTerms(termList);
    setClassrooms(classroomList);
  }
  useEffect(() => { load(); }, []);

  async function submitSingle(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setFlash(null); setLoading(true);
    try {
      await api.post('/admin/enrollments', single);
      setSingle({ studentId: '', courseId: '', termId: '' });
      setFlash('ลงทะเบียนสำเร็จ');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
    finally { setLoading(false); }
  }

  async function submitBulk(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setFlash(null); setLoading(true);
    try {
      const result = await api.post<{ totalStudents: number; created: number; skipped: number }>(
        '/admin/enrollments/bulk', bulk,
      );
      setBulk({ classroomId: '', courseId: '', termId: '' });
      setFlash(
        `ลงทะเบียนกลุ่มสำเร็จ — เพิ่มใหม่ ${result.created}/${result.totalStudents} คน ` +
        `(ข้าม ${result.skipped} คนที่ลงทะเบียนแล้ว)`,
      );
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
    finally { setLoading(false); }
  }

  const selectedClassroom = classrooms.find((c) => c.id === bulk.classroomId);
  const matchingCourses = selectedClassroom
    ? courses.filter((c) => c.gradeLevel === selectedClassroom.gradeLevel)
    : courses;

  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight">การลงทะเบียน</h2>
      <p className="mt-1 text-sm text-ink-soft">จัดการการลงทะเบียนเรียน — เลือกแบบทั้งห้องหรือทีละคน</p>

      {/* Mode toggle */}
      <div className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-soft">
        <button
          onClick={() => setMode('bulk')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            mode === 'bulk' ? 'bg-ink text-white shadow-soft' : 'text-ink-soft hover:bg-slate-100'
          }`}
        >
          ทั้งห้อง <span className="ml-1 opacity-70">(แนะนำ)</span>
        </button>
        <button
          onClick={() => setMode('single')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            mode === 'single' ? 'bg-ink text-white shadow-soft' : 'text-ink-soft hover:bg-slate-100'
          }`}
        >
          ทีละคน
        </button>
      </div>

      {flash && <div className="mt-4 animate-fade-in rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{flash}</div>}
      {error && <div className="mt-4 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* Bulk form */}
      {mode === 'bulk' && (
        <form onSubmit={submitBulk} className="card mt-4 animate-slide-up p-5">
          <p className="mb-3 text-sm text-ink-soft">
            ลงทะเบียนทุกคนในห้องเข้ารายวิชาเดียวกัน
            {selectedClassroom && (
              <span className="ml-2 font-semibold text-ink">
                ({selectedClassroom._count.students} คน)
              </span>
            )}
          </p>
          <div className="grid grid-cols-4 gap-2">
            <select value={bulk.classroomId} onChange={(e) => setBulk({ ...bulk, classroomId: e.target.value, courseId: '' })} required className="input">
              <option value="">-- เลือกห้อง --</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.gradeLevel}/{c.section} ({c.academicYear}) — {c._count.students} คน
                </option>
              ))}
            </select>
            <select value={bulk.courseId} onChange={(e) => setBulk({ ...bulk, courseId: e.target.value })} required className="input col-span-2">
              <option value="">-- รายวิชา (ชั้นต้องตรงกับห้อง) --</option>
              {matchingCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} · {c.name} ({c.gradeLevel})</option>
              ))}
            </select>
            <select value={bulk.termId} onChange={(e) => setBulk({ ...bulk, termId: e.target.value })} required className="input">
              <option value="">-- เทอม --</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.year}/{t.semester[0]}</option>)}
            </select>
            <button type="submit" disabled={loading} className="btn-accent col-span-4">
              {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนทั้งห้อง'}
            </button>
          </div>
        </form>
      )}

      {/* Single form */}
      {mode === 'single' && (
        <form onSubmit={submitSingle} className="card mt-4 grid animate-slide-up grid-cols-4 gap-2 p-4">
          <select value={single.studentId} onChange={(e) => setSingle({ ...single, studentId: e.target.value })} required className="input">
            <option value="">-- นักเรียน --</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.studentCode}</option>)}
          </select>
          <select value={single.courseId} onChange={(e) => setSingle({ ...single, courseId: e.target.value })} required className="input">
            <option value="">-- รายวิชา --</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}
          </select>
          <select value={single.termId} onChange={(e) => setSingle({ ...single, termId: e.target.value })} required className="input">
            <option value="">-- เทอม --</option>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.year}/{t.semester[0]}</option>)}
          </select>
          <button type="submit" disabled={loading} className="btn-primary btn-sm">+ ลงทะเบียน</button>
        </form>
      )}

      <table className="table mt-6">
        <thead>
          <tr>
            <th>รหัสนักเรียน</th>
            <th>ชื่อ</th>
            <th>รายวิชา</th>
            <th>เทอม</th>
            <th className="text-center">เกรด</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={5} className="py-10 text-center text-ink-soft">ยังไม่มีการลงทะเบียน</td></tr>
          ) : items.map((e) => (
            <tr key={e.id}>
              <td className="font-mono text-xs">{e.student.studentCode}</td>
              <td>{e.student.user.fullName}</td>
              <td>{e.course.code} {e.course.name}</td>
              <td>{e.term.year}/{e.term.semester[0]}</td>
              <td className="text-center">{e.grade ? `${e.grade.score} (${e.grade.letter})` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
