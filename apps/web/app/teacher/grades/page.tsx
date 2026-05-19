'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface TeacherEnrollment {
  enrollmentId: string;
  studentCode: string;
  studentName: string;
  courseCode: string;
  courseName: string;
  credits: number;
  term: { year: number; semester: string };
  gradeId: string | null;
  score: number | null;
  letter: string | null;
}

const LETTER_LABEL: Record<string, string> = {
  A: 'A', B_PLUS: 'B+', B: 'B', C_PLUS: 'C+', C: 'C',
  D_PLUS: 'D+', D: 'D', F: 'F', W: 'W', I: 'I',
};

export default function TeacherPage() {
  const router = useRouter();
  const [rows, setRows] = useState<TeacherEnrollment[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api.get<TeacherEnrollment[]>('/grades/teacher/enrollments');
      setRows(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error';
      if (msg.includes('401')) router.push('/login');
      else setError(msg);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(row: TeacherEnrollment) {
    const raw = draft[row.enrollmentId];
    const score = Number(raw);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      setError(`คะแนนต้องอยู่ระหว่าง 0-100 (${row.studentCode})`);
      return;
    }
    setError(null);
    setSavingId(row.enrollmentId);
    try {
      if (row.gradeId) {
        await api.put(`/grades/${row.gradeId}`, { score });
      } else {
        await api.post('/grades', { enrollmentId: row.enrollmentId, score });
      }
      setFlash(`บันทึกเกรด ${row.studentCode} เรียบร้อย`);
      setDraft((d) => ({ ...d, [row.enrollmentId]: '' }));
      await load();
      setTimeout(() => setFlash(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight">บันทึกเกรดนักเรียน</h2>
      <p className="mt-1 text-sm text-ink-soft">กรอกคะแนน 0-100 ระบบจะคำนวณเกรดให้อัตโนมัติ</p>

      {flash && (
        <div className="mt-4 animate-fade-in rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{flash}</div>
      )}
      {error && (
        <div className="mt-4 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      )}

      <table className="table mt-6">
        <thead>
          <tr>
            <th>รหัสนักเรียน</th>
            <th>ชื่อ-นามสกุล</th>
            <th>รายวิชา</th>
            <th className="text-center">หน่วยกิต</th>
            <th className="text-center">คะแนนปัจจุบัน</th>
            <th className="text-center">เกรด</th>
            <th className="text-center">บันทึก</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-10 text-center text-ink-soft">
                ยังไม่มีรายการลงทะเบียนในวิชาที่สอน
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.enrollmentId}>
              <td className="font-mono text-xs">{r.studentCode}</td>
              <td>{r.studentName}</td>
              <td>
                <div className="font-mono text-xs text-ink-soft">{r.courseCode}</div>
                <div>{r.courseName}</div>
              </td>
              <td className="text-center">{r.credits}</td>
              <td className="text-center">{r.score ?? '-'}</td>
              <td className="text-center font-semibold">
                {r.letter ? LETTER_LABEL[r.letter] ?? r.letter : '-'}
              </td>
              <td>
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="number" min={0} max={100} placeholder="0-100"
                    value={draft[r.enrollmentId] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [r.enrollmentId]: e.target.value }))}
                    className="input w-20 text-center"
                  />
                  <button
                    onClick={() => save(r)}
                    disabled={savingId === r.enrollmentId || !draft[r.enrollmentId]}
                    className="btn-primary btn-sm"
                  >
                    {savingId === r.enrollmentId ? '...' : r.gradeId ? 'อัปเดต' : 'บันทึก'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
