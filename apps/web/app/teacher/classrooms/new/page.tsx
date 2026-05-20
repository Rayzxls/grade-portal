'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Course { id: string; code: string; name: string; credits: number; gradeLevel: string }
interface Term { id: string; year: number; semester: string }

type NewCourseRow = { code: string; name: string; credits: number };
type StudentRow = { studentCode: string; fullName: string; enrollYear: number };

const GRADE_LEVELS = ['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'];

export default function NewClassroomPage() {
  const router = useRouter();

  // Section 1: Classroom basics
  const [gradeLevel, setGradeLevel] = useState('ม.4');
  const [section, setSection] = useState('1');
  const [academicYear, setAcademicYear] = useState('2568');

  // Section 2: Subjects
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState('');
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [newCourses, setNewCourses] = useState<NewCourseRow[]>([]);

  // Section 3: Students
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    api.get<Term[]>('/teacher/terms').then((ts) => {
      setTerms(ts);
      if (ts[0]) setTermId(ts[0].id);
    });
    api.get<Course[]>('/teacher/courses').then(setMyCourses);
  }, []);

  // Filter courses by grade level
  const matchingCourses = myCourses.filter((c) => c.gradeLevel === gradeLevel);

  function toggleCourse(id: string) {
    setSelectedCourseIds((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id); else ns.add(id);
      return ns;
    });
  }

  function addNewCourseRow() {
    setNewCourses((r) => [...r, { code: '', name: '', credits: 1 }]);
  }
  function updateNewCourse(i: number, patch: Partial<NewCourseRow>) {
    setNewCourses((r) => r.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function removeNewCourse(i: number) {
    setNewCourses((r) => r.filter((_, idx) => idx !== i));
  }

  function addStudentRow() {
    setStudents((s) => [...s, { studentCode: '', fullName: '', enrollYear: Number(academicYear) }]);
  }
  function updateStudent(i: number, patch: Partial<StudentRow>) {
    setStudents((s) => s.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeStudent(i: number) {
    setStudents((s) => s.filter((_, idx) => idx !== i));
  }

  function onUploadCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const parsed: StudentRow[] = [];
      for (const line of text.split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const [code, name, yr] = t.split(',').map((x) => x.trim());
        if (!code || !name) continue;
        parsed.push({ studentCode: code, fullName: name, enrollYear: Number(yr) || Number(academicYear) });
      }
      if (parsed.length > 0) setStudents(parsed);
    };
    reader.readAsText(file, 'utf-8');
  }

  async function submit() {
    setError(null); setBusy(true); setProgress('กำลังตรวจสอบ...');
    try {
      if (!gradeLevel || !section || !academicYear) throw new Error('กรอกข้อมูลห้องให้ครบ');

      const totalSubjects = selectedCourseIds.size + newCourses.filter((c) => c.code && c.name).length;
      const totalStudents = students.filter((s) => s.studentCode && s.fullName).length;

      // 1) Create classroom
      setProgress('สร้างห้องเรียน...');
      const room = await api.post<{ id: string; gradeLevel: string; section: number }>(
        '/teacher/classrooms',
        { gradeLevel, section: Number(section), academicYear: Number(academicYear) },
      );

      // 2) Create new courses (if any)
      const newCourseIds: string[] = [];
      for (let i = 0; i < newCourses.length; i++) {
        const c = newCourses[i];
        if (!c.code.trim() || !c.name.trim()) continue;
        setProgress(`สร้างวิชา ${i + 1}/${newCourses.length}: ${c.code}...`);
        const created = await api.post<{ id: string }>('/teacher/courses', {
          code: c.code.trim(), name: c.name.trim(),
          credits: Number(c.credits) || 1,
          gradeLevel,
        });
        newCourseIds.push(created.id);
      }

      // 3) Add subjects to classroom (all existing selected + new ones)
      const allCourseIds = [...selectedCourseIds, ...newCourseIds];
      if (allCourseIds.length > 0 && termId) {
        for (let i = 0; i < allCourseIds.length; i++) {
          setProgress(`เพิ่มวิชาเข้าห้อง ${i + 1}/${allCourseIds.length}...`);
          try {
            await api.post(`/teacher/classrooms/${room.id}/subjects`, {
              courseId: allCourseIds[i], termId,
            });
          } catch {
            // ignore — students will be added next, then we can retry
          }
        }
      }

      // 4) Bulk add students
      const validStudents = students.filter((s) => s.studentCode.trim() && s.fullName.trim());
      if (validStudents.length > 0) {
        setProgress(`นำเข้านักเรียน ${validStudents.length} คน...`);
        await api.post('/teacher/students/bulk', {
          classroomId: room.id,
          students: validStudents,
        });

        // 5) Re-run add subjects if students existed AFTER subject add (bulk-enroll picks up students)
        if (allCourseIds.length > 0 && termId) {
          for (const cid of allCourseIds) {
            try {
              await api.post(`/teacher/classrooms/${room.id}/subjects`, { courseId: cid, termId });
            } catch {}
          }
        }
      }

      setProgress(`✓ เสร็จ — สร้างห้อง ${gradeLevel}/${section} | ${totalSubjects} วิชา | ${totalStudents} นักเรียน`);
      setTimeout(() => router.push(`/teacher/classrooms/${room.id}?tab=roster&term=${termId}`), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/teacher/classrooms" className="text-sm text-ink-soft hover:text-ink">← ห้องทั้งหมด</Link>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">สร้างห้องเรียนใหม่</h2>
        <p className="mt-1 text-sm text-ink-soft">กรอกข้อมูลทั้งหมดในหน้าเดียว — ระบบสร้างห้อง วิชา และเพิ่มนักเรียนให้พร้อมใช้</p>
      </div>

      {/* Section 1 */}
      <section className="card animate-slide-up p-6">
        <div className="flex items-center gap-3">
          <span className="badge-gold">1</span>
          <h3 className="text-lg font-semibold tracking-tight">ข้อมูลห้อง</h3>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm">ชั้น</label>
            <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="input mt-1">
              {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm">ห้อง</label>
            <input type="number" min={1} max={99} value={section} onChange={(e) => setSection(e.target.value)} className="input mt-1" />
          </div>
          <div>
            <label className="text-sm">ปีการศึกษา (พ.ศ.)</label>
            <input type="number" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="input mt-1" />
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section className="card animate-slide-up p-6">
        <div className="flex items-center gap-3">
          <span className="badge-gold">2</span>
          <h3 className="text-lg font-semibold tracking-tight">รายวิชาที่จะเรียน</h3>
          <span className="text-xs text-ink-soft">(เลือกเทอม + วิชา — เพิ่มทีหลังได้)</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">เทอม</label>
            <select value={termId} onChange={(e) => setTermId(e.target.value)} className="input mt-1">
              {terms.map((t) => <option key={t.id} value={t.id}>{t.year} / {t.semester[0]}</option>)}
            </select>
          </div>
        </div>

        {matchingCourses.length > 0 && (
          <div className="mt-4">
            <label className="text-sm font-medium">เลือกจากวิชาของคุณ (ชั้น {gradeLevel})</label>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {matchingCourses.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selectedCourseIds.has(c.id)} onChange={() => toggleCourse(c.id)} />
                  <span className="font-mono text-xs">{c.code}</span>
                  <span className="flex-1 truncate text-sm">{c.name}</span>
                  <span className="text-xs text-ink-soft">{c.credits} นก.</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">หรือสร้างวิชาใหม่</label>
            <button type="button" onClick={addNewCourseRow} className="btn-ghost btn-sm">+ เพิ่มวิชา</button>
          </div>
          {newCourses.length > 0 && (
            <div className="mt-2 space-y-2">
              {newCourses.map((c, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input placeholder="รหัสวิชา" value={c.code} onChange={(e) => updateNewCourse(i, { code: e.target.value })} className="input col-span-3" />
                  <input placeholder="ชื่อวิชา" value={c.name} onChange={(e) => updateNewCourse(i, { name: e.target.value })} className="input col-span-7" />
                  <input type="number" min={1} max={6} value={c.credits} onChange={(e) => updateNewCourse(i, { credits: Number(e.target.value) })} className="input col-span-1" />
                  <button onClick={() => removeNewCourse(i)} className="col-span-1 text-rose-600">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 3 */}
      <section className="card animate-slide-up p-6">
        <div className="flex items-center gap-3">
          <span className="badge-gold">3</span>
          <h3 className="text-lg font-semibold tracking-tight">นักเรียน <span className="text-sm font-normal text-ink-soft">(ไม่บังคับ — เพิ่มทีหลังได้)</span></h3>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-ink-soft">กรอกทีละคน หรือ Upload CSV รูปแบบ: <code className="rounded bg-slate-100 px-1">รหัส,ชื่อ,ปีเข้าเรียน</code></p>
          <label className="btn-secondary btn-sm cursor-pointer">
            📁 อัปโหลด CSV
            <input type="file" accept=".csv,text/csv,.txt" onChange={onUploadCsv} className="hidden" />
          </label>
        </div>

        {students.length > 0 && (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase text-ink-soft">
              <tr>
                <th className="pb-2">รหัส</th>
                <th className="pb-2">ชื่อ-สกุล</th>
                <th className="pb-2 w-32">ปีเข้าเรียน</th>
                <th className="pb-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2"><input value={s.studentCode} onChange={(e) => updateStudent(i, { studentCode: e.target.value })} className="input" /></td>
                  <td className="py-1 pr-2"><input value={s.fullName} onChange={(e) => updateStudent(i, { fullName: e.target.value })} className="input" /></td>
                  <td className="py-1 pr-2"><input type="number" value={s.enrollYear} onChange={(e) => updateStudent(i, { enrollYear: Number(e.target.value) })} className="input" /></td>
                  <td><button onClick={() => removeStudent(i)} className="text-rose-600">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button type="button" onClick={addStudentRow} className="btn-ghost btn-sm mt-2">+ เพิ่มแถวนักเรียน</button>
      </section>

      {/* Submit */}
      <div className="sticky bottom-4 z-10 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lift backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-ink-soft">
            สรุป: <b className="text-ink">{gradeLevel}/{section}</b> · ปี {academicYear} ·
            วิชา <b className="text-ink">{selectedCourseIds.size + newCourses.filter((c) => c.code && c.name).length}</b> ·
            นักเรียน <b className="text-ink">{students.filter((s) => s.studentCode && s.fullName).length}</b>
          </div>
          <button onClick={submit} disabled={busy} className="btn-primary">
            {busy ? (progress ?? 'กำลังสร้าง...') : '🎓 สร้างห้องและตั้งค่าทั้งหมด'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        {progress && !error && <p className="mt-2 text-xs text-ink-soft">{progress}</p>}
      </div>
    </div>
  );
}
