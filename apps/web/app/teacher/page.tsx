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

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
    router.push('/login');
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">บันทึกเกรดนักเรียน</h1>
          <p className="text-sm text-slate-600">กรอกคะแนน 0-100 ระบบจะคำนวณเกรดให้อัตโนมัติ</p>
        </div>
        <button
          onClick={logout}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          ออกจากระบบ
        </button>
      </div>

      {flash && (
        <div className="mt-4 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">{flash}</div>
      )}
      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <table className="mt-6 w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="px-4 py-3">รหัสนักศึกษา</th>
            <th className="px-4 py-3">ชื่อ-นามสกุล</th>
            <th className="px-4 py-3">รายวิชา</th>
            <th className="px-4 py-3 text-center">หน่วยกิต</th>
            <th className="px-4 py-3 text-center">คะแนนปัจจุบัน</th>
            <th className="px-4 py-3 text-center">เกรด</th>
            <th className="px-4 py-3 text-center">บันทึก</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                ยังไม่มีรายการลงทะเบียนในวิชาที่สอน
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.enrollmentId} className="border-t border-slate-100">
              <td className="px-4 py-3 font-mono">{r.studentCode}</td>
              <td className="px-4 py-3">{r.studentName}</td>
              <td className="px-4 py-3">
                <div className="font-mono text-xs text-slate-500">{r.courseCode}</div>
                <div>{r.courseName}</div>
              </td>
              <td className="px-4 py-3 text-center">{r.credits}</td>
              <td className="px-4 py-3 text-center">{r.score ?? '-'}</td>
              <td className="px-4 py-3 text-center font-semibold">
                {r.letter ? LETTER_LABEL[r.letter] ?? r.letter : '-'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0-100"
                    value={draft[r.enrollmentId] ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [r.enrollmentId]: e.target.value }))
                    }
                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-center"
                  />
                  <button
                    onClick={() => save(r)}
                    disabled={savingId === r.enrollmentId || !draft[r.enrollmentId]}
                    className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {savingId === r.enrollmentId ? '...' : r.gradeId ? 'อัปเดต' : 'บันทึก'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
