'use client';

/**
 * Admin Setup Wizard — สร้างทั้งระบบในหน้าเดียว
 * Step 1: เทอม
 * Step 2: ครู (สร้างใหม่หรือเลือกที่มี)
 * Step 3: ห้องเรียน (เลือก gradeLevel + ครูประจำชั้น)
 * Step 4: รายวิชา (gradeLevel ล็อกตาม classroom)
 * Step 5: นักเรียน (auto-assign เข้าห้อง)
 * Step 6: เสร็จ — สรุปแล้วลิงก์ไปทำ test
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const GRADE_LEVELS = ['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'];

interface Term { id: string; year: number; semester: 'FIRST' | 'SECOND' | 'SUMMER' }
interface Teacher { id: string; staffCode: string; department: string; user: { fullName: string; email: string } }
interface Classroom { id: string; gradeLevel: string; section: number; academicYear: number; homeroomTeacherId: string | null }

interface CourseInput { code: string; name: string; credits: number; teacherId: string }
interface StudentInput { studentCode: string; fullName: string }

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_LABELS: Record<Step, string> = {
  1: 'ภาคเรียน',
  2: 'ครู',
  3: 'ห้องเรียน',
  4: 'รายวิชา',
  5: 'นักเรียน',
  6: 'เสร็จสิ้น',
};

export default function AdminSetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ── Loaded data ──
  const [terms, setTerms] = useState<Term[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  // ── Step 1 state ──
  const [termId, setTermId] = useState('');
  const [newTerm, setNewTerm] = useState({ year: 2569, semester: 'FIRST' as 'FIRST'|'SECOND'|'SUMMER', startDate: '2026-05-01', endDate: '2026-09-30' });
  const [showNewTerm, setShowNewTerm] = useState(false);

  // ── Step 2 state ──
  const [newTeachers, setNewTeachers] = useState<{ email: string; password: string; fullName: string; staffCode: string; department: string }[]>([
    { email: '', password: 'password123', fullName: '', staffCode: '', department: '' },
  ]);

  // ── Step 3 state ──
  const [classroomId, setClassroomId] = useState('');
  const [newClassroom, setNewClassroom] = useState({ gradeLevel: 'ม.3', section: 1, academicYear: 2569, homeroomTeacherId: '' });
  const [showNewClassroom, setShowNewClassroom] = useState(false);

  // ── Step 4 state ──
  const [courses, setCourses] = useState<CourseInput[]>([]);

  // ── Step 5 state ──
  const [students, setStudents] = useState<StudentInput[]>([{ studentCode: '', fullName: '' }]);

  // ── Final ──
  const [summary, setSummary] = useState<{ teachers: number; courses: number; students: number; classroom: string } | null>(null);

  // ── Load existing data ──
  async function reload() {
    const [ts, users, cs] = await Promise.all([
      api.get<Term[]>('/admin/terms'),
      api.get<{ teacher: Teacher | null; email: string; fullName: string }[]>('/admin/users'),
      api.get<Classroom[]>('/admin/classrooms'),
    ]);
    setTerms(ts);
    setTeachers(users.filter((u) => u.teacher).map((u) => ({ ...u.teacher!, user: { fullName: u.fullName, email: u.email } })));
    setClassrooms(cs);
  }
  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  // ── Step actions ──
  async function step1Next() {
    setError(null); setBusy(true);
    try {
      if (showNewTerm) {
        const t = await api.post<Term>('/admin/terms', {
          year: newTerm.year, semester: newTerm.semester,
          startDate: newTerm.startDate, endDate: newTerm.endDate,
        });
        setTermId(t.id);
      } else if (!termId) {
        throw new Error('กรุณาเลือกหรือสร้างเทอม');
      }
      await reload();
      setStep(2);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
    finally { setBusy(false); }
  }

  async function step2Next() {
    setError(null); setBusy(true);
    try {
      // กรอง teacher ที่มี field ครบ
      const toCreate = newTeachers.filter((t) => t.email && t.fullName && t.staffCode);
      for (const t of toCreate) {
        try {
          await api.post('/admin/users', {
            email: t.email, password: t.password || 'password123',
            fullName: t.fullName, role: 'TEACHER',
            teacher: { staffCode: t.staffCode, department: t.department || 'ทั่วไป' },
          });
        } catch (e) {
          // ถ้าซ้ำ skip
          if (e instanceof Error && (e.message.includes('409') || e.message.includes('ซ้ำ'))) continue;
          throw e;
        }
      }
      await reload();
      setStep(3);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
    finally { setBusy(false); }
  }

  async function step3Next() {
    setError(null); setBusy(true);
    try {
      if (showNewClassroom) {
        if (!newClassroom.homeroomTeacherId) throw new Error('กรุณาเลือกครูประจำชั้น');
        const c = await api.post<Classroom>('/admin/classrooms', {
          gradeLevel: newClassroom.gradeLevel,
          section: newClassroom.section,
          academicYear: newClassroom.academicYear,
          homeroomTeacherId: newClassroom.homeroomTeacherId,
        });
        setClassroomId(c.id);
      } else if (!classroomId) {
        throw new Error('กรุณาเลือกหรือสร้างห้อง');
      }
      await reload();
      setStep(4);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
    finally { setBusy(false); }
  }

  async function step4Next() {
    setError(null); setBusy(true);
    try {
      const classroom = classrooms.find((c) => c.id === classroomId) ?? (showNewClassroom ? newClassroom : null);
      if (!classroom) throw new Error('ไม่พบห้องเรียน');
      const valid = courses.filter((c) => c.code && c.name && c.teacherId);
      let created = 0;
      for (const c of valid) {
        try {
          const created1 = await api.post<{ id: string }>('/admin/courses', {
            code: c.code, name: c.name, credits: c.credits, gradeLevel: classroom.gradeLevel, teacherId: c.teacherId,
          });
          // ผูกวิชาเข้าห้อง (สร้าง enrollment สำหรับเด็กในห้อง)
          await api.post(`/teacher/classrooms/${classroomId}/subjects`, {
            courseId: created1.id, termId,
          }).catch(() => null); // ถ้าห้องยังไม่มีเด็กจะ create 0 ก็ได้
          created++;
        } catch (e) {
          if (e instanceof Error && (e.message.includes('409') || e.message.includes('ซ้ำ'))) continue;
          throw e;
        }
      }
      await reload();
      setStep(5);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
    finally { setBusy(false); }
  }

  async function step5Finish() {
    setError(null); setBusy(true);
    try {
      const valid = students.filter((s) => s.studentCode && s.fullName);
      // ใช้ bulk endpoint ของ teacher (admin ก็ใช้ได้)
      const r = await api.post<{ created: number }>(`/teacher/students/bulk`, {
        classroomId,
        students: valid.map((s) => ({ studentCode: s.studentCode, fullName: s.fullName, enrollYear: newClassroom.academicYear })),
      }).catch(async () => {
        // fallback: สร้างทีละคนผ่าน admin/users
        let count = 0;
        for (const s of valid) {
          try {
            await api.post('/admin/users', {
              email: `${s.studentCode}@school.ac.th`, password: 'password123',
              fullName: s.fullName, role: 'STUDENT',
              student: { studentCode: s.studentCode, enrollYear: newClassroom.academicYear, classroomId },
            });
            count++;
          } catch {}
        }
        return { created: count };
      });
      const classroom = classrooms.find((c) => c.id === classroomId) ?? newClassroom;
      setSummary({
        teachers: newTeachers.filter((t) => t.email).length,
        courses: courses.filter((c) => c.code).length,
        students: r.created,
        classroom: `${classroom.gradeLevel}/${classroom.section}`,
      });
      setStep(6);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <div className="badge-gold">Quick Setup</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">เริ่มต้นใช้งานระบบ</h1>
        <p className="mt-1 text-sm text-ink-soft">สร้าง เทอม → ครู → ห้องเรียน → วิชา → นักเรียน ในขั้นตอนเดียว</p>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2 overflow-x-auto pb-2">
        {([1,2,3,4,5,6] as Step[]).map((s) => (
          <li key={s} className="flex items-center gap-2 whitespace-nowrap">
            <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all ${
              step === s ? 'bg-ink text-white scale-110 shadow-soft' :
              step > s ? 'bg-emerald-100 text-emerald-700' :
              'bg-slate-100 text-slate-400'
            }`}>{step > s ? '✓' : s}</span>
            <span className={`text-sm font-medium ${step === s ? 'text-ink' : step > s ? 'text-emerald-700' : 'text-slate-400'}`}>
              {STEP_LABELS[s]}
            </span>
            {s < 6 && <span className="text-slate-300">→</span>}
          </li>
        ))}
      </ol>

      {error && <div className="card border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {/* ── STEP 1: TERM ── */}
      {step === 1 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-bold">📅 ขั้นที่ 1: เลือกหรือสร้างเทอม</h2>
          <p className="text-sm text-ink-soft">เทอมเป็นช่วงเวลาที่นักเรียนเรียนวิชา — ปกติ 1 ปีมี 2 เทอม</p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-ink-soft block">เทอมที่มีอยู่</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {terms.length === 0 && (
                <div className="text-sm text-ink-soft p-3 bg-amber-50 rounded-lg border border-amber-200">ยังไม่มีเทอม — สร้างใหม่ด้านล่าง</div>
              )}
              {terms.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTermId(t.id); setShowNewTerm(false); }}
                  className={`p-3 rounded-lg border text-left transition-all ${termId === t.id && !showNewTerm ? 'border-ink bg-ink/5' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <span className="font-semibold">เทอม {t.semester === 'FIRST' ? 1 : t.semester === 'SECOND' ? 2 : 'ฤดูร้อน'}/{t.year}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => { setShowNewTerm((s) => !s); if (!showNewTerm) setTermId(''); }} className="btn-ghost btn-sm">
            {showNewTerm ? '← เลือกเทอมที่มี' : '+ สร้างเทอมใหม่'}
          </button>

          {showNewTerm && (
            <div className="grid gap-3 sm:grid-cols-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <Field label="ปีการศึกษา (พ.ศ.)">
                <input type="number" value={newTerm.year} onChange={(e) => setNewTerm({ ...newTerm, year: Number(e.target.value) })} className="input" />
              </Field>
              <Field label="ภาคเรียน">
                <select value={newTerm.semester} onChange={(e) => setNewTerm({ ...newTerm, semester: e.target.value as any })} className="input">
                  <option value="FIRST">ภาคเรียนที่ 1</option>
                  <option value="SECOND">ภาคเรียนที่ 2</option>
                  <option value="SUMMER">ภาคฤดูร้อน</option>
                </select>
              </Field>
              <Field label="วันเริ่มต้น">
                <input type="date" value={newTerm.startDate} onChange={(e) => setNewTerm({ ...newTerm, startDate: e.target.value })} className="input" />
              </Field>
              <Field label="วันสิ้นสุด">
                <input type="date" value={newTerm.endDate} onChange={(e) => setNewTerm({ ...newTerm, endDate: e.target.value })} className="input" />
              </Field>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button onClick={step1Next} disabled={busy || (!termId && !showNewTerm)} className="btn-primary">ถัดไป →</button>
          </div>
        </div>
      )}

      {/* ── STEP 2: TEACHERS ── */}
      {step === 2 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-bold">👨‍🏫 ขั้นที่ 2: สร้างครู</h2>
          <p className="text-sm text-ink-soft">เพิ่มครูแต่ละคน — รหัสผ่านเริ่มต้น <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">password123</code></p>

          {teachers.length > 0 && (
            <div className="text-xs text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 p-3">
              ✓ มีครูในระบบแล้ว <b>{teachers.length}</b> คน — เพิ่มเฉพาะที่ยังไม่มี (อีเมลซ้ำจะข้าม)
            </div>
          )}

          <div className="space-y-3">
            {newTeachers.map((t, i) => (
              <div key={i} className="grid gap-2 grid-cols-12 p-3 rounded-lg bg-slate-50 border border-slate-200 relative">
                <div className="col-span-3"><input placeholder="ชื่อ-สกุล" value={t.fullName} onChange={(e) => { const arr = [...newTeachers]; arr[i].fullName = e.target.value; setNewTeachers(arr); }} className="input" /></div>
                <div className="col-span-3"><input placeholder="อีเมล" value={t.email} onChange={(e) => { const arr = [...newTeachers]; arr[i].email = e.target.value; setNewTeachers(arr); }} className="input" /></div>
                <div className="col-span-2"><input placeholder="รหัสครู" value={t.staffCode} onChange={(e) => { const arr = [...newTeachers]; arr[i].staffCode = e.target.value; setNewTeachers(arr); }} className="input" /></div>
                <div className="col-span-3"><input placeholder="แผนก/สังกัด" value={t.department} onChange={(e) => { const arr = [...newTeachers]; arr[i].department = e.target.value; setNewTeachers(arr); }} className="input" /></div>
                <div className="col-span-1">
                  <button onClick={() => setNewTeachers(newTeachers.filter((_, j) => j !== i))} className="text-rose-500 hover:bg-rose-50 px-2 py-1 rounded text-sm">×</button>
                </div>
              </div>
            ))}
            <button onClick={() => setNewTeachers([...newTeachers, { email: '', password: 'password123', fullName: '', staffCode: '', department: '' }])} className="btn-ghost btn-sm">+ เพิ่มอีกคน</button>
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button onClick={() => setStep(1)} className="btn-ghost btn-sm">← ย้อน</button>
            <button onClick={step2Next} disabled={busy} className="btn-primary">ถัดไป →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: CLASSROOM ── */}
      {step === 3 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-bold">🏫 ขั้นที่ 3: ห้องเรียน</h2>
          <p className="text-sm text-ink-soft">เลือกชั้น + ห้อง + ครูประจำชั้น</p>

          {classrooms.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-soft block">ห้องที่มี</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {classrooms.map((c) => (
                  <button key={c.id} onClick={() => { setClassroomId(c.id); setShowNewClassroom(false); }}
                    className={`p-3 rounded-lg border text-left transition-all ${classroomId === c.id && !showNewClassroom ? 'border-ink bg-ink/5' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span className="font-semibold">{c.gradeLevel}/{c.section}</span>
                    <span className="text-xs text-ink-soft block">ปี {c.academicYear}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => { setShowNewClassroom((s) => !s); if (!showNewClassroom) setClassroomId(''); }} className="btn-ghost btn-sm">
            {showNewClassroom ? '← เลือกห้องที่มี' : '+ สร้างห้องใหม่'}
          </button>

          {showNewClassroom && (
            <div className="grid gap-3 sm:grid-cols-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <Field label="ระดับชั้น">
                <select value={newClassroom.gradeLevel} onChange={(e) => setNewClassroom({ ...newClassroom, gradeLevel: e.target.value })} className="input">
                  {GRADE_LEVELS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="ห้องที่ (เลขห้อง)">
                <input type="number" min={1} value={newClassroom.section} onChange={(e) => setNewClassroom({ ...newClassroom, section: Number(e.target.value) })} className="input" />
              </Field>
              <Field label="ปีการศึกษา (พ.ศ.)">
                <input type="number" value={newClassroom.academicYear} onChange={(e) => setNewClassroom({ ...newClassroom, academicYear: Number(e.target.value) })} className="input" />
              </Field>
              <Field label="ครูประจำชั้น *">
                <select value={newClassroom.homeroomTeacherId} onChange={(e) => setNewClassroom({ ...newClassroom, homeroomTeacherId: e.target.value })} className="input">
                  <option value="">— เลือกครู —</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.user.fullName} ({t.department})</option>)}
                </select>
              </Field>
            </div>
          )}

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button onClick={() => setStep(2)} className="btn-ghost btn-sm">← ย้อน</button>
            <button onClick={step3Next} disabled={busy || (!classroomId && !showNewClassroom)} className="btn-primary">ถัดไป →</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: COURSES ── */}
      {step === 4 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-bold">📚 ขั้นที่ 4: รายวิชา</h2>
          <p className="text-sm text-ink-soft">
            ทุกวิชาในห้องนี้จะถูกสร้างสำหรับชั้น <span className="badge-gold inline-block">{(classrooms.find((c) => c.id === classroomId)?.gradeLevel) ?? newClassroom.gradeLevel}</span> โดยอัตโนมัติ — กันพิมพ์ผิด
          </p>

          <div className="space-y-2">
            {courses.length === 0 && <p className="text-sm text-ink-soft p-3 bg-slate-50 rounded-lg">ยังไม่มีวิชา — กดเพิ่มด้านล่าง</p>}
            {courses.map((c, i) => (
              <div key={i} className="grid gap-2 grid-cols-12 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="col-span-2"><input placeholder="รหัสวิชา" value={c.code} onChange={(e) => { const arr = [...courses]; arr[i].code = e.target.value; setCourses(arr); }} className="input" /></div>
                <div className="col-span-4"><input placeholder="ชื่อวิชา" value={c.name} onChange={(e) => { const arr = [...courses]; arr[i].name = e.target.value; setCourses(arr); }} className="input" /></div>
                <div className="col-span-1"><input type="number" min={1} max={6} value={c.credits} onChange={(e) => { const arr = [...courses]; arr[i].credits = Number(e.target.value); setCourses(arr); }} className="input" /></div>
                <div className="col-span-4">
                  <select value={c.teacherId} onChange={(e) => { const arr = [...courses]; arr[i].teacherId = e.target.value; setCourses(arr); }} className="input">
                    <option value="">— ครูผู้สอน —</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.user.fullName}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <button onClick={() => setCourses(courses.filter((_, j) => j !== i))} className="text-rose-500 hover:bg-rose-50 px-2 py-1 rounded text-sm">×</button>
                </div>
              </div>
            ))}
            <button onClick={() => setCourses([...courses, { code: '', name: '', credits: 2, teacherId: '' }])} className="btn-ghost btn-sm">+ เพิ่มวิชา</button>
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button onClick={() => setStep(3)} className="btn-ghost btn-sm">← ย้อน</button>
            <button onClick={step4Next} disabled={busy} className="btn-primary">{courses.length === 0 ? 'ข้าม (ทำทีหลังได้)' : 'ถัดไป →'}</button>
          </div>
        </div>
      )}

      {/* ── STEP 5: STUDENTS ── */}
      {step === 5 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-bold">🎓 ขั้นที่ 5: นักเรียน</h2>
          <p className="text-sm text-ink-soft">
            นักเรียนทุกคนจะถูกจัดเข้า <span className="badge-gold inline-block">{(classrooms.find((c) => c.id === classroomId)?.gradeLevel) ?? newClassroom.gradeLevel}/{(classrooms.find((c) => c.id === classroomId)?.section) ?? newClassroom.section}</span> โดยอัตโนมัติ + รหัสผ่านเริ่มต้น <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">password123</code>
          </p>

          <div className="space-y-2">
            {students.map((s, i) => (
              <div key={i} className="grid gap-2 grid-cols-12 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="col-span-3"><input placeholder="รหัสนักเรียน" value={s.studentCode} onChange={(e) => { const arr = [...students]; arr[i].studentCode = e.target.value; setStudents(arr); }} className="input font-mono" /></div>
                <div className="col-span-8"><input placeholder="ชื่อ-สกุล" value={s.fullName} onChange={(e) => { const arr = [...students]; arr[i].fullName = e.target.value; setStudents(arr); }} className="input" /></div>
                <div className="col-span-1">
                  <button onClick={() => setStudents(students.filter((_, j) => j !== i))} className="text-rose-500 hover:bg-rose-50 px-2 py-1 rounded text-sm">×</button>
                </div>
              </div>
            ))}
            <button onClick={() => setStudents([...students, { studentCode: '', fullName: '' }])} className="btn-ghost btn-sm">+ เพิ่มนักเรียน</button>
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button onClick={() => setStep(4)} className="btn-ghost btn-sm">← ย้อน</button>
            <button onClick={step5Finish} disabled={busy} className="btn-primary">{busy ? 'กำลังบันทึก...' : 'เสร็จสิ้น ✓'}</button>
          </div>
        </div>
      )}

      {/* ── STEP 6: SUMMARY ── */}
      {step === 6 && summary && (
        <div className="card p-8 space-y-6 text-center">
          <div className="text-6xl">🎉</div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">เสร็จเรียบร้อย!</h2>
            <p className="text-sm text-ink-soft mt-1">ระบบพร้อมใช้งาน — สรุปสิ่งที่สร้าง:</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="ครูใหม่" value={summary.teachers} />
            <Stat label="ห้องเรียน" value={1} />
            <Stat label="วิชา" value={summary.courses} />
            <Stat label="นักเรียน" value={summary.students} />
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left text-sm space-y-2">
            <p className="font-semibold text-emerald-800">✨ ขั้นถัดไป:</p>
            <ol className="list-decimal pl-5 space-y-1 text-emerald-700">
              <li>Login เป็น <b>ครู</b> ตามรายชื่อที่เพิ่ม → ไปเมนู "บันทึกเกรด" → กรอกคะแนน 4 หมวด</li>
              <li>Login เป็น <b>นักเรียน</b> (อีเมล = <code>{'<รหัสนักเรียน>'}</code>@school.ac.th) → ดูเกรดที่หน้า dashboard</li>
              <li>กลับมา <b>Admin</b> → เมนู "นักเรียน" → ดู GPA + breakdown ของนักเรียนทุกคน</li>
            </ol>
          </div>

          <div className="flex justify-center gap-2 pt-2">
            <Link href="/admin/students" className="btn-secondary">ดูรายชื่อนักเรียน</Link>
            <Link href="/admin/classrooms" className="btn-secondary">ห้องเรียน</Link>
            <button onClick={() => { setStep(1); setCourses([]); setStudents([{ studentCode: '', fullName: '' }]); }} className="btn-primary">+ สร้างอีกห้อง</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-ink-soft block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="text-2xl font-bold text-ink mt-0.5">{value}</p>
    </div>
  );
}
