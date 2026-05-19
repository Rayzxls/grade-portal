'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Subject {
  courseId: string;
  code: string;
  name: string;
  credits: number;
  gradeLevel: string;
  teacherName: string;
  totalStudents: number;
  graded: number;
}

interface MyCourse {
  id: string;
  code: string;
  name: string;
  credits: number;
  gradeLevel: string;
}

const GRADE_LEVELS = ['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'];

export function SubjectsTab({
  classroomId, termId, gradeLevel,
}: { classroomId: string; termId: string; gradeLevel: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [myCourses, setMyCourses] = useState<MyCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // สร้างวิชาใหม่
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ code: '', name: '', credits: '3', gradeLevel });

  async function load() {
    const [subs, courses] = await Promise.all([
      api.get<Subject[]>(`/teacher/classrooms/${classroomId}/subjects?termId=${termId}`),
      api.get<MyCourse[]>('/teacher/courses'),
    ]);
    setSubjects(subs);
    setMyCourses(courses.filter((c) => c.gradeLevel === gradeLevel));
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [classroomId, termId]);

  async function addSubject() {
    if (!selectedCourseId) return;
    setError(null); setFlash(null); setBusy(true);
    try {
      const result = await api.post<{ totalStudents: number; created: number; skipped: number }>(
        `/teacher/classrooms/${classroomId}/subjects`,
        { courseId: selectedCourseId, termId },
      );
      setSelectedCourseId('');
      setFlash(`เพิ่มวิชาแล้ว · ลงทะเบียนใหม่ ${result.created}/${result.totalStudents} คน`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
    finally { setBusy(false); }
  }

  async function removeSubject(courseId: string, code: string) {
    if (!confirm(`ลบวิชา ${code} ออกจากห้อง?\n\n(ใช้ได้เฉพาะถ้ายังไม่มีคนได้เกรด)`)) return;
    setError(null); setFlash(null);
    try {
      await api.delete(`/teacher/classrooms/${classroomId}/subjects?courseId=${courseId}&termId=${termId}`);
      setFlash(`ลบวิชา ${code} เรียบร้อย`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }

  async function createNewCourse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/teacher/courses', {
        code: newForm.code, name: newForm.name,
        credits: Number(newForm.credits),
        gradeLevel: newForm.gradeLevel,
      });
      setShowNew(false);
      setNewForm({ code: '', name: '', credits: '3', gradeLevel });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }

  const availableCourses = myCourses.filter(
    (c) => !subjects.some((s) => s.courseId === c.id),
  );

  return (
    <>
      {flash && <div className="mb-4 animate-fade-in rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{flash}</div>}
      {error && <div className="mb-4 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <h3 className="text-lg font-semibold tracking-tight">วิชาในเทอมนี้ ({subjects.length} วิชา)</h3>
      <table className="table mt-3">
        <thead><tr><th>รหัสวิชา</th><th>ชื่อวิชา</th><th className="text-center">หน่วยกิต</th><th>ครูผู้สอน</th><th className="text-center">ออกเกรดแล้ว</th><th></th></tr></thead>
        <tbody>
          {subjects.length === 0 ? (
            <tr><td colSpan={6} className="py-8 text-center text-ink-soft">ยังไม่มีวิชา — เพิ่มด้านล่าง</td></tr>
          ) : subjects.map((s) => (
            <tr key={s.courseId}>
              <td className="font-mono text-xs">{s.code}</td>
              <td>{s.name}</td>
              <td className="text-center">{s.credits}</td>
              <td>{s.teacherName}</td>
              <td className="text-center">
                <span className={`badge ${s.graded === s.totalStudents ? 'badge-gold' : 'bg-slate-100 text-ink-soft'}`}>
                  {s.graded}/{s.totalStudents}
                </span>
              </td>
              <td>
                <div className="flex justify-end gap-1">
                  <button
                    onClick={async () => {
                      const name = prompt('ชื่อวิชา', s.name);
                      if (!name) return;
                      const credStr = prompt('หน่วยกิต', String(s.credits));
                      const credits = Number(credStr);
                      if (!credits) return;
                      try {
                        await api.patch(`/teacher/courses/${s.courseId}`, { name, credits });
                        await load();
                      } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
                    }}
                    className="btn-ghost btn-sm"
                  >✎</button>
                  <button onClick={() => removeSubject(s.courseId, s.code)} className="btn-ghost btn-sm text-rose-600 hover:text-rose-700">ลบจากห้อง</button>
                  <button
                    onClick={async () => {
                      if (!confirm(`ลบวิชา ${s.code} ออกจากระบบถาวร?\n(ต้องไม่มีนักเรียนลงทะเบียน/สมุดคะแนน)`)) return;
                      try {
                        await api.delete(`/teacher/courses/${s.courseId}`);
                        await load();
                      } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
                    }}
                    className="btn-ghost btn-sm text-rose-600 hover:text-rose-700"
                  >ลบทั้งวิชา</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-10 text-lg font-semibold tracking-tight">เพิ่มวิชาให้ห้องนี้</h3>
      <p className="mt-1 text-xs text-ink-soft">เลือกจากวิชาของคุณ (ชั้น {gradeLevel}) — ระบบจะลงทะเบียนนักเรียนทั้งห้องอัตโนมัติ</p>

      <div className="card mt-3 animate-slide-up p-4">
        <div className="grid grid-cols-5 gap-2">
          <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="input col-span-3">
            <option value="">-- เลือกวิชาของคุณ --</option>
            {availableCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} · {c.name} ({c.credits} นก.)</option>
            ))}
          </select>
          <button onClick={addSubject} disabled={!selectedCourseId || busy} className="btn-accent">
            {busy ? '...' : '+ เพิ่มให้ห้อง'}
          </button>
          <button onClick={() => setShowNew((s) => !s)} className="btn-secondary btn-sm">
            {showNew ? 'ยกเลิก' : '+ สร้างวิชาใหม่'}
          </button>
        </div>

        {showNew && (
          <form onSubmit={createNewCourse} className="mt-4 grid animate-slide-up grid-cols-5 gap-2 border-t border-slate-100 pt-4">
            <input placeholder="รหัสวิชา" value={newForm.code} onChange={(e) => setNewForm({ ...newForm, code: e.target.value })} required className="input col-span-2" />
            <input placeholder="ชื่อวิชา" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} required className="input col-span-2" />
            <input type="number" min={1} max={6} value={newForm.credits} onChange={(e) => setNewForm({ ...newForm, credits: e.target.value })} placeholder="หน่วยกิต" className="input" />
            <select value={newForm.gradeLevel} onChange={(e) => setNewForm({ ...newForm, gradeLevel: e.target.value })} className="input col-span-2">
              {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <button type="submit" className="btn-primary col-span-3">สร้างวิชา</button>
          </form>
        )}

        {availableCourses.length === 0 && myCourses.length > 0 && (
          <p className="mt-3 text-xs text-ink-soft">ทุกวิชาของคุณถูกเพิ่มในห้องนี้แล้ว</p>
        )}
        {myCourses.length === 0 && (
          <p className="mt-3 text-xs text-ink-soft">คุณยังไม่มีวิชา — กดสร้างใหม่ด้านบนเพื่อเริ่ม</p>
        )}
      </div>
    </>
  );
}
