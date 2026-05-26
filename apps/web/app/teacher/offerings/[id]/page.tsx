'use client';

/**
 * /teacher/offerings/[id] — รายละเอียดของ "ครู+วิชา+ห้อง+เทอม" ตัวเดียว
 * รวมการกรอกคะแนน 4 หมวด + สถิติของห้องใน 1 หน้า
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

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
interface OfferingDetail {
  offeringId: string;
  classroom: { id: string; gradeLevel: string; section: number; academicYear: number };
  course: { id: string; code: string; name: string; credits: number };
  term: { id: string; year: number; semester: string };
  teacher: { id: string; fullName: string };
  finalizedAt: string | null;
  students: StudentRow[];
  summary: { total: number; graded: number; avgScore: number; classGpa: number };
}

const SEM: Record<string, string> = { FIRST: '1', SECOND: '2', SUMMER: 'ฤดูร้อน' };
const LETTER_LABEL: Record<string, string> = {
  A: 'A', B_PLUS: 'B+', B: 'B', C_PLUS: 'C+', C: 'C', D_PLUS: 'D+', D: 'D', F: 'F',
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

function computeTotal(q: number | null, h: number | null, m: number | null, f: number | null): number {
  return Math.round(((q ?? 0) * 0.2 + (h ?? 0) * 0.2 + (m ?? 0) * 0.3 + (f ?? 0) * 0.3) * 100) / 100;
}
function scoreToLetter(s: number): string {
  if (s >= 80) return 'A'; if (s >= 75) return 'B_PLUS'; if (s >= 70) return 'B';
  if (s >= 65) return 'C_PLUS'; if (s >= 60) return 'C'; if (s >= 55) return 'D_PLUS';
  if (s >= 50) return 'D'; return 'F';
}

export default function OfferingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<OfferingDetail | null>(null);
  const [pending, setPending] = useState<Record<string, { q: string; h: string; m: string; f: string }>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function load() {
    try {
      const r = await api.get<OfferingDetail>(`/teacher/offerings/${id}`);
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ');
    }
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  function getField(sid: string, k: 'q'|'h'|'m'|'f'): string {
    const p = pending[sid];
    if (p) return p[k];
    const s = data?.students.find((x) => x.studentId === sid);
    if (!s?.grade) return '';
    const v = k === 'q' ? s.grade.quizScore : k === 'h' ? s.grade.homeworkScore : k === 'm' ? s.grade.midtermScore : s.grade.finalScore;
    return v == null ? '' : String(v);
  }
  function setField(sid: string, k: 'q'|'h'|'m'|'f', val: string) {
    setPending((prev) => {
      const cur = prev[sid] ?? { q: getField(sid, 'q'), h: getField(sid, 'h'), m: getField(sid, 'm'), f: getField(sid, 'f') };
      return { ...prev, [sid]: { ...cur, [k]: val } };
    });
  }
  function preview(sid: string) {
    const p = pending[sid];
    const s = data?.students.find((x) => x.studentId === sid);
    const parse = (v: string | number | null | undefined) => {
      if (v == null || v === '') return null;
      const n = typeof v === 'number' ? v : parseFloat(v);
      return Number.isFinite(n) ? n : null;
    };
    const q = p ? parse(p.q) : s?.grade?.quizScore ?? null;
    const h = p ? parse(p.h) : s?.grade?.homeworkScore ?? null;
    const m = p ? parse(p.m) : s?.grade?.midtermScore ?? null;
    const f = p ? parse(p.f) : s?.grade?.finalScore ?? null;
    if (q == null && h == null && m == null && f == null) return null;
    const total = computeTotal(q, h, m, f);
    return { total, letter: scoreToLetter(total) };
  }

  async function save(sid: string) {
    if (!data || !pending[sid]) return;
    setBusy((b) => ({ ...b, [sid]: true }));
    setError(null);
    try {
      const p = pending[sid];
      const parse = (s: string) => s.trim() === '' ? null : Math.max(0, Math.min(100, parseFloat(s)));
      await api.post('/grades/upsert', {
        studentId: sid,
        courseId: data.course.id,
        termId: data.term.id,
        quizScore: parse(p.q),
        homeworkScore: parse(p.h),
        midtermScore: parse(p.m),
        finalScore: parse(p.f),
      });
      setPending((prev) => { const { [sid]: _, ...rest } = prev; return rest; });
      setInfo('บันทึกแล้ว');
      setTimeout(() => setInfo(null), 1500);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy((b) => ({ ...b, [sid]: false }));
    }
  }

  const dirty = Object.keys(pending);
  async function saveAll() {
    for (const id of dirty) await save(id);
  }

  if (error && !data) {
    return (
      <div className="card p-6 border-rose-200 bg-rose-50">
        <p className="text-rose-700 font-semibold">เกิดข้อผิดพลาด</p>
        <p className="text-sm text-rose-600 mt-1">{error}</p>
      </div>
    );
  }
  if (!data) return <p className="text-ink-soft animate-fade-in">กำลังโหลด...</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/teacher/offerings" className="text-xs text-ink-soft hover:text-amber-700">← วิชาที่ฉันสอน</Link>

      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block">
              {data.course.code}
            </span>
            <h1 className="text-2xl font-bold tracking-tight mt-1">{data.course.name}</h1>
            <p className="text-sm text-ink-soft mt-1">
              ห้อง <b>{data.classroom.gradeLevel}/{data.classroom.section}</b> ·
              เทอม {SEM[data.term.semester] ?? data.term.semester}/{data.term.year} ·
              {data.course.credits} หน่วยกิต · โดย {data.teacher.fullName}
            </p>
          </div>
          {data.finalizedAt && <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">✓ ปิดเล่มแล้ว</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Mini label="นักเรียน" value={data.summary.total} />
        <Mini label="บันทึกแล้ว" value={data.summary.graded} suffix={`/${data.summary.total}`} />
        <Mini label="คะแนนเฉลี่ย" value={data.summary.avgScore.toFixed(2)} />
        <Mini label="GPA ห้อง" value={data.summary.classGpa.toFixed(2)} gold />
      </div>

      {info && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">✓ {info}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      {/* Grade table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
          <div className="text-sm text-ink-soft">
            สูตร: <b>Quiz 20%</b> + <b>HW 20%</b> + <b>Mid 30%</b> + <b>Final 30%</b>
          </div>
          {dirty.length > 0 && (
            <button onClick={saveAll} className="btn-primary btn-sm">💾 บันทึกทั้งหมด ({dirty.length})</button>
          )}
        </div>

        <table className="w-full text-sm">
          <thead className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-ink-soft">
            <tr>
              <th className="px-4 py-2 text-left">นักเรียน</th>
              <th className="px-2 py-2 text-center w-20">Quiz<br /><span className="font-normal text-[10px]">20%</span></th>
              <th className="px-2 py-2 text-center w-20">HW<br /><span className="font-normal text-[10px]">20%</span></th>
              <th className="px-2 py-2 text-center w-20">Mid<br /><span className="font-normal text-[10px]">30%</span></th>
              <th className="px-2 py-2 text-center w-20">Final<br /><span className="font-normal text-[10px]">30%</span></th>
              <th className="px-3 py-2 text-center">รวม</th>
              <th className="px-3 py-2 text-center">เกรด</th>
              <th className="px-3 py-2 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {data.students.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-ink-soft">ห้องนี้ยังไม่มีนักเรียน</td></tr>
            )}
            {data.students.map((s) => {
              const isDirty = !!pending[s.studentId];
              const pv = preview(s.studentId);
              const letter = pv?.letter ?? s.grade?.letter;
              return (
                <tr key={s.studentId} className={`border-t border-slate-100 ${isDirty ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-4 py-2">
                    <div className="font-mono text-xs text-ink-soft">{s.studentCode}</div>
                    <div className="font-medium">{s.fullName}</div>
                  </td>
                  {(['q','h','m','f'] as const).map((k) => (
                    <td key={k} className="px-2 py-2">
                      <input type="number" min={0} max={100} step={0.5}
                        value={getField(s.studentId, k)}
                        onChange={(e) => setField(s.studentId, k, e.target.value)}
                        className="input text-center font-mono py-1"
                        placeholder="-" />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-mono font-bold">
                    {pv ? pv.total.toFixed(2) : (s.grade ? s.grade.score.toFixed(2) : '-')}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {letter ? (
                      <span className={`inline-flex items-center justify-center w-9 h-7 rounded-md font-bold text-sm ring-1 ${LETTER_COLOR[letter] ?? ''}`}>
                        {LETTER_LABEL[letter] ?? letter}
                      </span>
                    ) : <span className="text-ink-soft">-</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => save(s.studentId)} disabled={!isDirty || busy[s.studentId]} className="btn-secondary btn-sm disabled:opacity-40">
                      {busy[s.studentId] ? '...' : isDirty ? 'บันทึก' : '✓'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Mini({ label, value, suffix, gold }: { label: string; value: string | number; suffix?: string; gold?: boolean }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${gold ? 'text-gradient-gold' : 'text-ink'}`}>{value}{suffix && <span className="text-xs font-normal text-ink-soft">{suffix}</span>}</p>
    </div>
  );
}
