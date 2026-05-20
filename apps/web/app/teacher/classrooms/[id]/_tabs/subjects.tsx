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
      {flash && <div className="mb-4 animate-fade-in rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 flex items-center gap-1.5 shadow-sm"><span className="text-emerald-500">✓</span> {flash}</div>}
      {error && <div className="mb-4 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 flex items-center gap-1.5 shadow-sm"><span className="text-rose-500">✕</span> {error}</div>}

      <div className="flex items-center justify-between mt-6">
        <h3 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <span>รายวิชาที่เปิดสอนในห้องเรียนนี้</span>
          <span className="badge badge-gold px-2.5 py-0.5 rounded-full text-xs font-semibold">{subjects.length} วิชา</span>
        </h3>
      </div>

      {subjects.length === 0 ? (
        <div className="mt-3 flex flex-col items-center justify-center p-16 bg-white border border-slate-200/80 rounded-2xl shadow-soft text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-3 border border-amber-100">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h4 className="text-slate-800 font-bold mb-1">ยังไม่มีการเพิ่มวิชาในห้องเรียนนี้สำหรับเทอมนี้</h4>
          <p className="text-slate-400 text-xs max-w-sm">กรุณาเลือกรายวิชาที่มีอยู่หรือสร้างรหัสวิชาเรียนใหม่จากแผงเพิ่มวิชาด้านล่างเพื่อเริ่มลงทะเบียนการส่งผลการเรียน</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-3">
          {subjects.map((s) => {
            const pct = s.totalStudents > 0 ? (s.graded / s.totalStudents) * 100 : 0;
            return (
              <div 
                key={s.courseId} 
                className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-5 shadow-soft hover:shadow-lift transition-all duration-300 hover:border-amber-300 group flex flex-col justify-between"
              >
                {/* Decorative gold light leak on hover */}
                <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-br from-amber-200/15 to-yellow-100/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold tracking-wider text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-md shadow-sm">
                      {s.code}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                      {s.credits} หน่วยกิต
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 mt-4 text-base group-hover:text-amber-800 transition-colors line-clamp-1">
                    {s.name}
                  </h4>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2.5 font-medium">
                    <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="line-clamp-1">{s.teacherName}</span>
                  </div>
                </div>

                <div className="mt-5">
                  {/* Progress Bar Container */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-500 text-[11px]">บันทึกเกรดแล้ว</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                        s.graded === s.totalStudents 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' 
                          : 'bg-amber-50 text-amber-700 border-amber-200/50'
                      }`}>
                        {s.graded}/{s.totalStudents} คน ({Math.round(pct)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-px">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 transition-all duration-500" 
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-50">
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
                      className="text-xs font-semibold text-slate-500 hover:text-amber-800 hover:bg-slate-50 px-2 py-1 rounded-md border border-transparent hover:border-slate-100 flex items-center gap-1 transition-all"
                    >
                      <span>✎ แก้ไข</span>
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => removeSubject(s.courseId, s.code)} 
                        className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50/50 transition-colors"
                      >
                        ลบจากห้อง
                      </button>
                      <span className="text-slate-200 text-xs select-none">|</span>
                      <button
                        onClick={async () => {
                          if (!confirm(`ลบวิชา ${s.code} ออกจากระบบถาวร?\n(ต้องไม่มีนักเรียนลงทะเบียน/สมุดคะแนน)`)) return;
                          try {
                            await api.delete(`/teacher/courses/${s.courseId}`);
                            await load();
                          } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
                        }}
                        className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50/50 transition-colors"
                      >
                        ลบถาวร
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action panel for adding/creating subjects */}
      <div className="mt-10 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-soft hover:shadow-lift transition-all">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">เพิ่มรายวิชาเรียนในเทอมนี้</h3>
            <p className="text-xs text-slate-500 mt-1">
              เลือกวิชาของระดับชั้น <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200/30 px-1.5 py-0.5 rounded">{gradeLevel}</span> เพื่อเปิดห้องเรียน — ระบบจะดึงรายชื่อนักเรียนและเปิดสมุดบันทึกคะแนนให้อัตโนมัติ
            </p>
          </div>
          <div>
            <button 
              onClick={() => setShowNew((s) => !s)} 
              className={`btn-sm rounded-xl px-4 py-2.5 font-semibold transition-all border shadow-sm flex items-center gap-1.5 ${
                showNew 
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200' 
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-amber-600 hover:border-amber-700'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d={showNew ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
              </svg>
              {showNew ? 'ปิดหน้าต่างสร้างวิชาใหม่' : 'สร้างรหัสวิชาเรียนใหม่'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">เลือกรายวิชาที่มีอยู่แล้วในระบบ</label>
              <div className="flex gap-2">
                <select 
                  value={selectedCourseId} 
                  onChange={(e) => setSelectedCourseId(e.target.value)} 
                  className="input rounded-xl border-slate-300 hover:border-slate-400 focus:border-amber-500 focus:ring-amber-500/20 bg-slate-50/50"
                >
                  <option value="">-- เลือกวิชาในระบบ (ชั้น {gradeLevel}) --</option>
                  {availableCourses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} · {c.name} ({c.credits} หน่วยกิต)</option>
                  ))}
                </select>
                <button 
                  onClick={addSubject} 
                  disabled={!selectedCourseId || busy} 
                  className="btn-accent rounded-xl px-5 font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 shrink-0"
                >
                  {busy ? 'กำลังเพิ่ม...' : '+ เปิดสอนในห้องนี้'}
                </button>
              </div>
            </div>
            
            <div className="mt-4">
              {availableCourses.length === 0 && myCourses.length > 0 && (
                <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/30 text-xs text-amber-800 flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-800 text-[10px] font-bold font-serif">✓</span>
                  <span>ทุกวิชาในสังกัดระดับชั้นของคุณถูกเพิ่มเข้ามาลงทะเบียนในห้องนี้เรียบร้อยแล้ว</span>
                </div>
              )}
              {myCourses.length === 0 && (
                <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/30 text-xs text-amber-800 flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-800 text-[10px] font-bold font-serif">!</span>
                  <span>คุณยังไม่มีรายวิชาในระบบสำหรับการสอนระดับชั้นนี้ กดปุ่มสร้างรหัสวิชาเรียนใหม่ทางด้านขวาเพื่อเริ่มต้น</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-6">
            {showNew ? (
              <form onSubmit={createNewCourse} className="space-y-4 animate-slide-up">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">สร้างรหัสวิชาและรายวิชาใหม่</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">รหัสวิชา</label>
                    <input 
                      placeholder="เช่น ว21101" 
                      value={newForm.code} 
                      onChange={(e) => setNewForm({ ...newForm, code: e.target.value })} 
                      required 
                      className="input rounded-xl border-slate-300 hover:border-slate-400 focus:border-amber-500 focus:ring-amber-500/20" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">ชื่อวิชาเรียน</label>
                    <input 
                      placeholder="เช่น วิทยาการคำนวณ 1" 
                      value={newForm.name} 
                      onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} 
                      required 
                      className="input rounded-xl border-slate-300 hover:border-slate-400 focus:border-amber-500 focus:ring-amber-500/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">จำนวนหน่วยกิต</label>
                    <input 
                      type="number" 
                      min={0.5} 
                      max={6} 
                      step={0.5}
                      value={newForm.credits} 
                      onChange={(e) => setNewForm({ ...newForm, credits: e.target.value })} 
                      placeholder="1.5" 
                      className="input rounded-xl border-slate-300 hover:border-slate-400 focus:border-amber-500 focus:ring-amber-500/20 text-center" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">ระดับชั้นเรียน</label>
                    <select 
                      value={newForm.gradeLevel} 
                      onChange={(e) => setNewForm({ ...newForm, gradeLevel: e.target.value })} 
                      className="input rounded-xl border-slate-300 hover:border-slate-400 focus:border-amber-500 focus:ring-amber-500/20"
                    >
                      {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full btn-primary bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-amber-600 hover:border-amber-700 rounded-xl py-3 font-semibold shadow-md active:scale-95 transition-all text-xs"
                >
                  ✓ บันทึกข้อมูลและสร้างรายวิชาเรียนใหม่
                </button>
              </form>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200/80 rounded-2xl bg-slate-50/30">
                <svg className="h-8 w-8 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="text-[11px] font-semibold text-slate-400">ยังไม่ได้เปิดหน้าต่างฟอร์มสร้างรายวิชาใหม่</span>
                <span className="text-[10px] text-slate-400 mt-0.5">กดปุ่มสีทองด้านบนเพื่อเพิ่มรหัสวิชาใหม่เข้าไปในฐานข้อมูล</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
