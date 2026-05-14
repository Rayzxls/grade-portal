'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { GradeResponse } from '@grade/shared';

interface MyGradesResponse {
  gpa: number;
  totalCredits: number;
  grades: GradeResponse[];
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
    api
      .get<MyGradesResponse>('/grades/me')
      .then(setData)
      .catch((e: Error) => {
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
    if (!res.ok) {
      alert('ดาวน์โหลด Transcript ไม่สำเร็จ');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!data) return <p className="p-8">กำลังโหลด...</p>;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ผลการเรียนของฉัน</h1>
        <div className="flex gap-2">
          <button
            onClick={downloadTranscript}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
          >
            ดาวน์โหลด Transcript
          </button>
          <button
            onClick={logout}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Stat label="GPA" value={data.gpa.toFixed(2)} />
        <Stat label="หน่วยกิตรวม" value={String(data.totalCredits)} />
      </div>

      <table className="mt-8 w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="px-4 py-3">รหัสวิชา</th>
            <th className="px-4 py-3">ชื่อวิชา</th>
            <th className="px-4 py-3 text-center">หน่วยกิต</th>
            <th className="px-4 py-3 text-center">คะแนน</th>
            <th className="px-4 py-3 text-center">เกรด</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {data.grades.map((g) => (
            <tr key={g.id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-mono">{g.courseCode}</td>
              <td className="px-4 py-3">{g.courseName}</td>
              <td className="px-4 py-3 text-center">{g.credits}</td>
              <td className="px-4 py-3 text-center">{g.score}</td>
              <td className="px-4 py-3 text-center font-semibold">
                {LETTER_LABEL[g.letter] ?? g.letter}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
