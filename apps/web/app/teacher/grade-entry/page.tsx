'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

// ─── Types ───
interface Term { id: string; year: number; semester: 'FIRST' | 'SECOND' | 'SUMMER' }
interface Classroom {
  id: string;
  gradeLevel: string;
  section: number;
  academicYear: number;
  role: 'HOMEROOM' | 'SUBJECT_TEACHER';
  mySubjects: { sheetId: string; course: { id: string; code: string; name: string }; term: { id: string } }[];
  students: { id: string; studentCode: string; user: { fullName: string } }[];
}
interface Course { id: string; code: string; name: string; credits: number; gradeLevel: string }
interface Grade {
  id: string;
  quizScore: number | null;
  homeworkScore: number | null;
  midtermScore: number | null;
  finalScore: number | null;
  score: number;
  letter: string;
  gradePoint: number;
}
interface StudentRow {
  studentId: string;
  studentCode: string;
  fullName: string;
  grade: Grade | null;
}

const SEM_LABEL: Record<string, string> = { FIRST: '1', SECOND: '2', SUMMER: 'ฤดูร้อน' };
const LETTER_LABEL: Record<string, string> = {
  A: 'A', B_PLUS: 'B+', B: 'B', C_PLUS: 'C+', C: 'C', D_PLUS: 'D+', D: 'D', F: 'F', W: 'W', I: 'I',
};
const LETTER_COLOR: Record<string, string> = {
  A: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
  B_PLUS: 'text-emerald-600 bg-emerald-50 ring-emerald-200',
  B: 'text-blue-700 bg-blue-50 ring-blue-200',
  C_PLUS: 'text-blue-600 bg-blue-50 ring-blue-200',
  C: 'text-amber-700 bg-amber-50 ring-amber-200',
  D_PLUS: 'text-orange-700 bg-orange-50 ring-orange-200',
  D: 'text-orange-700 bg-orange-50 ring-orange-200',
  F: 'text-rose-700 bg-rose-50 ring-rose-200',
};

// ─── Helpers: คำนวณ total/letter/gradePoint บนฝั่ง client (preview) ───
function computeTotal(q: number | null, h: number | null, m: number | null, f: number | null): number {
  const q0 = q ?? 0, h0 = h ?? 0, m0 = m ?? 0, f0 = f ?? 0;
  return Math.round((q0 * 0.2 + h0 * 0.2 + m0 * 0.3 + f0 * 0.3) * 100) / 100;
}
function scoreToLetter(s: number): string {
  if (s >= 80) return 'A';
  if (s >= 75) return 'B_PLUS';
  if (s >= 70) return 'B';
  if (s >= 65) return 'C_PLUS';
  if (s >= 60) return 'C';
  if (s >= 55) return 'D_PLUS';
  if (s >= 50) return 'D';
  return 'F';
}
function letterToGp(l: string): number {
  return ({ A: 4, B_PLUS: 3.5, B: 3, C_PLUS: 2.5, C: 2, D_PLUS: 1.5, D: 1, F: 0 } as Record<string, number>)[l] ?? 0;
}

// ─── Page ───
export default function GradeEntryPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classroomId, setClassroomId] = useState('');
  const [termId, setTermId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set()); // studentIds ที่แก้ไข
  const [pending, setPending] = useState<Record<string, { q: string; h: string; m: string; f: string }>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // โหลดข้อมูลเริ่มต้น
  useEffect(() => {
    (async () => {
      try {
        const [cs, ts] = await Promise.all([
          api.get<Classroom[]>('/teacher/classrooms'),
          api.get<Term[]>('/teacher/terms'),
        ]);
        setClassrooms(cs);
        setTerms(ts);
        if (ts[0]) setTermId(ts[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ');
      }
    })();
  }, []);

  const classroom = classrooms.find((c) => c.id === classroomId);
  const availableCourses = useMemo(() => {
    // วิชาที่ฉันสอนในห้องนี้ (จาก mySubjects)
    if (!classroom) return [];
    return classroom.mySubjects.map((s) => ({ id: s.course.id, code: s.course.code, name: s.course.name }));
  }, [classroom]);

  // โหลด students + เกรดของวิชาที่เลือก
  useEffect(() => {
    if (!classroomId || !courseId || !termId) { setStudents([]); return; }
    const cls = classrooms.find((c) => c.id === classroomId);
    if (!cls) return;
    (async () => {
      try {
        // ดึง grades ของแต่ละ student ในวิชานี้ — ใช้ /grades/student/:id แล้ว filter courseId
        const rows: StudentRow[] = await Promise.all(
          cls.students.map(async (s) => {
            try {
              const data = await api.get<{ grades: { id: string; courseCode: string; quizScore: number | null; homeworkScore: number | null; midtermScore: number | null; finalScore: number | null; score: number; letter: string; gradePoint: number; term: { id: string } }[] }>(`/grades/student/${s.id}`);
              const match = data.grades.find((g) => {
                const c = availableCourses.find((c) => c.id === courseId);
                return c && g.courseCode === c.code && g.term.id === termId;
              });
              return {
                studentId: s.id,
                studentCode: s.studentCode,
                fullName: s.user.fullName,
                grade: match ? {
                  id: match.id,
                  quizScore: match.quizScore,
                  homeworkScore: match.homeworkScore,
                  midtermScore: match.midtermScore,
                  finalScore: match.finalScore,
                  score: match.score,
                  letter: match.letter,
                  gradePoint: match.gradePoint,
                } : null,
              };
            } catch {
              return { studentId: s.id, studentCode: s.studentCode, fullName: s.user.fullName, grade: null };
            }
          }),
        );
        setStudents(rows.sort((a, b) => a.studentCode.localeCompare(b.studentCode)));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'โหลดเกรดไม่สำเร็จ');
      }
    })();
  }, [classroomId, courseId, termId, classrooms, availableCourses]);

  function getField(studentId: string, key: 'q' | 'h' | 'm' | 'f'): string {
    const p = pending[studentId];
    if (p) return p[key];
    const s = students.find((x) => x.studentId === studentId);
    if (!s?.grade) return '';
    const v = key === 'q' ? s.grade.quizScore
      : key === 'h' ? s.grade.homeworkScore
      : key === 'm' ? s.grade.midtermScore
      : s.grade.finalScore;
    return v == null ? '' : String(v);
  }

  function setField(studentId: string, key: 'q' | 'h' | 'm' | 'f', val: string) {
    setPending((prev) => {
      const cur = prev[studentId] ?? {
        q: getField(studentId, 'q'),
        h: getField(studentId, 'h'),
        m: getField(studentId, 'm'),
        f: getField(studentId, 'f'),
      };
      return { ...prev, [studentId]: { ...cur, [key]: val } };
    });
    setDirty((prev) => new Set(prev).add(studentId));
  }

  function previewTotal(studentId: string): { total: number; letter: string; gp: number } | null {
    const p = pending[studentId];
    const s = students.find((x) => x.studentId === studentId);
    const q = p ? parseFloat(p.q) : s?.grade?.quizScore;
    const h = p ? parseFloat(p.h) : s?.grade?.homeworkScore;
    const m = p ? parseFloat(p.m) : s?.grade?.midtermScore;
    const f = p ? parseFloat(p.f) : s?.grade?.finalScore;
    if (q == null && h == null && m == null && f == null) return null;
    const total = computeTotal(
      Number.isFinite(q!) ? q! : null,
      Number.isFinite(h!) ? h! : null,
      Number.isFinite(m!) ? m! : null,
      Number.isFinite(f!) ? f! : null,
    );
    const letter = scoreToLetter(total);
    return { total, letter, gp: letterToGp(letter) };
  }

  async function save(studentId: string) {
    const p = pending[studentId];
    if (!p) return;
    setBusy((b) => ({ ...b, [studentId]: true }));
    setError(null);
    try {
      const parse = (s: string) => s.trim() === '' ? null : Math.max(0, Math.min(100, parseFloat(s)));
      await api.post('/grades/upsert', {
        studentId,
        courseId,
        termId,
        quizScore: parse(p.q),
        homeworkScore: parse(p.h),
        midtermScore: parse(p.m),
        finalScore: parse(p.f),
      });
      // refresh
      const data = await api.get<{ grades: any[] }>(`/grades/student/${studentId}`);
      const c = availableCourses.find((c) => c.id === courseId);
      const match = c ? data.grades.find((g: any) => g.courseCode === c.code && g.term.id === termId) : null;
      setStudents((rows) => rows.map((r) =>
        r.studentId === studentId
          ? { ...r, grade: match ?? null }
          : r,
      ));
      setPending((prev) => { const { [studentId]: _, ...rest } = prev; return rest; });
      setDirty((d) => { const next = new Set(d); next.delete(studentId); return next; });
      setInfo(`บันทึก ${students.find((x) => x.studentId === studentId)?.fullName} สำเร็จ`);
      setTimeout(() => setInfo(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy((b) => ({ ...b, [studentId]: false }));
    }
  }

  async function saveAll() {
    const ids = Array.from(dirty);
    for (const id of ids) await save(id);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="badge-gold">บันทึกเกรด</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">กรอกคะแนน 4 หมวด → ออกเกรดอัตโนมัติ</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Quiz <b>20%</b> + Homework <b>20%</b> + Midterm <b>30%</b> + Final <b>30%</b> = total 100 คะแนน
        </p>
      </div>

      {/* Selectors */}
      <div className="card p-4 grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-ink-soft block mb-1">เทอม</label>
          <select className="input" value={termId} onChange={(e) => setTermId(e.target.value)}>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{SEM_LABEL[t.semester] ?? t.semester}/{t.year}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-soft block mb-1">ห้องเรียน</label>
          <select className="input" value={classroomId} onChange={(e) => { setClassroomId(e.target.value); setCourseId(''); }}>
            <option value="">— เลือกห้อง —</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.gradeLevel}/{c.section} (ปี {c.academicYear}) — {c.role === 'HOMEROOM' ? 'ครูประจำชั้น' : 'ครูผู้สอน'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-soft block mb-1">รายวิชา</label>
          <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)} disabled={!classroomId}>
            <option value="">— เลือกวิชา —</option>
            {availableCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {info && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">✓ {info}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      {/* Grade table */}
      {classroomId && courseId && termId && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
            <div className="text-sm text-ink-soft">
              <b className="text-ink">{students.length}</b> คน · บันทึกแก้แล้ว <b>{dirty.size}</b> รายการ
            </div>
            {dirty.size > 0 && (
              <button onClick={saveAll} className="btn-primary btn-sm">
                💾 บันทึกทั้งหมด ({dirty.size})
              </button>
            )}
          </div>

          <table className="w-full text-sm">
            <thead className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-4 py-2 text-left">นักเรียน</th>
                <th className="px-2 py-2 text-center w-20" title="20%">Quiz<br /><span className="font-normal text-[10px]">20%</span></th>
                <th className="px-2 py-2 text-center w-20" title="20%">Homework<br /><span className="font-normal text-[10px]">20%</span></th>
                <th className="px-2 py-2 text-center w-20" title="30%">Midterm<br /><span className="font-normal text-[10px]">30%</span></th>
                <th className="px-2 py-2 text-center w-20" title="30%">Final<br /><span className="font-normal text-[10px]">30%</span></th>
                <th className="px-3 py-2 text-center">รวม</th>
                <th className="px-3 py-2 text-center">เกรด</th>
                <th className="px-3 py-2 text-center">บันทึก</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-ink-soft">เลือกวิชาแล้ว — แต่ห้องนี้ยังไม่มีนักเรียน</td></tr>
              )}
              {students.map((s) => {
                const isDirty = dirty.has(s.studentId);
                const prev = previewTotal(s.studentId);
                const letter = prev?.letter ?? s.grade?.letter;
                return (
                  <tr key={s.studentId} className={`border-t border-slate-100 ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-4 py-2">
                      <div className="font-mono text-xs text-ink-soft">{s.studentCode}</div>
                      <div className="font-medium">{s.fullName}</div>
                    </td>
                    {(['q', 'h', 'm', 'f'] as const).map((k) => (
                      <td key={k} className="px-2 py-2">
                        <input
                          type="number" min={0} max={100} step={0.5}
                          value={getField(s.studentId, k)}
                          onChange={(e) => setField(s.studentId, k, e.target.value)}
                          className="input text-center font-mono py-1"
                          placeholder="-"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-mono font-bold">
                      {prev ? prev.total.toFixed(2) : (s.grade ? s.grade.score.toFixed(2) : '-')}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {letter ? (
                        <span className={`inline-flex items-center justify-center w-9 h-7 rounded-md font-bold text-sm ring-1 ${LETTER_COLOR[letter] ?? ''}`}>
                          {LETTER_LABEL[letter] ?? letter}
                        </span>
                      ) : <span className="text-ink-soft">-</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => save(s.studentId)}
                        disabled={!isDirty || busy[s.studentId]}
                        className="btn-secondary btn-sm disabled:opacity-40"
                      >
                        {busy[s.studentId] ? '...' : isDirty ? 'บันทึก' : 'บันทึกแล้ว'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {students.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-ink-soft flex items-center justify-between">
              <span>เกรดอัปเดตอัตโนมัติเมื่อบันทึก — นักเรียนเห็นทันทีที่หน้า /dashboard</span>
              <Link href="/teacher" className="text-amber-700 hover:underline">← กลับหน้าหลัก</Link>
            </div>
          )}
        </div>
      )}

      {(!classroomId || !courseId) && (
        <div className="card p-12 text-center text-ink-soft">
          <p className="text-3xl mb-2">📝</p>
          <p className="font-semibold">เลือกห้องและวิชาด้านบนเพื่อเริ่มบันทึกคะแนน</p>
          <p className="text-xs mt-1">วิชาในห้อง = วิชาที่คุณสอน (เห็นใน "ห้องของฉัน")</p>
        </div>
      )}
    </div>
  );
}
