'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { GradeResponse } from '@grade/shared';

interface MyGradesResponse {
  gpa: number;
  totalCredits: number;
  grades: GradeResponse[];
  profile: {
    studentCode: string;
    fullName: string;
    classroom: string | null;
    academicYear: number | null;
  };
}

const LETTER_LABEL: Record<string, string> = {
  A: 'A', B_PLUS: 'B+', B: 'B', C_PLUS: 'C+', C: 'C',
  D_PLUS: 'D+', D: 'D', F: 'F', W: 'W', I: 'I',
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<MyGradesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<MyGradesResponse>('/grades/me').then(setData).catch((e: Error) => {
      if (e.message.includes('401')) router.push('/login');
      else setError(e.message);
    });
  }, [router]);

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
    router.push('/login');
  }

  async function downloadTranscript() {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/transcript/me`,
      { headers: { Authorization: `Bearer ${token ?? ''}` } },
    );
    if (!res.ok) { alert('ดาวน์โหลดไม่สำเร็จ'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'transcript.pdf'; a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p className="p-8 text-rose-600">{error}</p>;
  if (!data) return <p className="p-8 text-ink-soft animate-fade-in">กำลังโหลด...</p>;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="badge-gold">นักเรียน</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">ผลการเรียนของฉัน</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {data.profile.fullName} · รหัส <span className="font-mono">{data.profile.studentCode}</span>
            {data.profile.classroom && (
              <> · <span className="font-semibold text-ink">{data.profile.classroom}</span>
              <span className="text-ink-soft"> (ปีการศึกษา {data.profile.academicYear})</span></>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTranscript} className="btn-accent">
            ดาวน์โหลด Transcript
          </button>
          <button onClick={logout} className="btn-secondary">ออกจากระบบ</button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="stat">
          <p className="stat-label">GPA</p>
          <p className="stat-value-gold">{data.gpa.toFixed(2)}</p>
        </div>
        <div className="stat">
          <p className="stat-label">หน่วยกิตรวม</p>
          <p className="stat-value">{data.totalCredits}</p>
        </div>
      </div>

      <table className="table mt-8">
        <thead>
          <tr>
            <th>รหัสวิชา</th>
            <th>ชื่อวิชา</th>
            <th className="text-center">หน่วยกิต</th>
            <th className="text-center">คะแนน</th>
            <th className="text-center">เกรด</th>
          </tr>
        </thead>
        <tbody>
          {data.grades.length === 0 ? (
            <tr><td colSpan={5} className="py-8 text-center text-ink-soft">ยังไม่มีผลการเรียน</td></tr>
          ) : data.grades.map((g) => (
            <tr key={g.id}>
              <td className="font-mono text-xs">{g.courseCode}</td>
              <td>{g.courseName}</td>
              <td className="text-center">{g.credits}</td>
              <td className="text-center">{g.score}</td>
              <td className="text-center font-semibold">{LETTER_LABEL[g.letter] ?? g.letter}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
