'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Grade {
  id: string;
  courseCode: string;
  courseName: string;
  credits: number;
  quizScore: number | null;
  homeworkScore: number | null;
  midtermScore: number | null;
  finalScore: number | null;
  score: number;
  letter: string;
  gradePoint: number;
  teacherName: string | null;
  term: { id: string; year: number; semester: string };
}
interface TermGroup {
  termId: string;
  year: number;
  semester: string;
  grades: Grade[];
  gpa: number;
  credits: number;
}
interface GpaReport {
  profile: {
    studentId: string;
    studentCode: string;
    fullName: string;
    email: string;
    classroom: string | null;
    academicYear: number | null;
  };
  gpax: number;
  totalCredits: number;
  byTerm: TermGroup[];
}

const SEM_LABEL: Record<string, string> = { FIRST: '1', SECOND: '2', SUMMER: 'ฤดูร้อน' };
const LETTER_LABEL: Record<string, string> = {
  A: 'A', B_PLUS: 'B+', B: 'B', C_PLUS: 'C+', C: 'C', D_PLUS: 'D+', D: 'D', F: 'F', W: 'W', I: 'I',
};
const LETTER_COLOR: Record<string, string> = {
  A: 'text-emerald-700', B_PLUS: 'text-emerald-600',
  B: 'text-blue-700', C_PLUS: 'text-blue-600',
  C: 'text-amber-700', D_PLUS: 'text-orange-700',
  D: 'text-orange-700', F: 'text-rose-700',
};

export default function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<GpaReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<GpaReport>(`/grades/reports/gpa/${id}`)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="card p-6 border-rose-200 bg-rose-50">
        <p className="text-rose-700 font-semibold">เกิดข้อผิดพลาด</p>
        <p className="text-sm text-rose-600 mt-1">{error}</p>
        <Link href="/admin/students" className="btn-secondary btn-sm mt-3">← กลับ</Link>
      </div>
    );
  }
  if (!data) return <p className="text-ink-soft animate-fade-in">กำลังโหลด...</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/admin/students" className="text-xs text-ink-soft hover:text-amber-700">← รายชื่อนักเรียน</Link>

      {/* Profile */}
      <div className="card p-6">
        <div className="badge badge-student">นักเรียน</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{data.profile.fullName}</h1>
        <div className="mt-1 text-sm text-ink-soft flex flex-wrap gap-x-4 gap-y-1">
          <span>รหัส <span className="font-mono">{data.profile.studentCode}</span></span>
          <span>· {data.profile.email}</span>
          {data.profile.classroom && (
            <span>· ห้อง <span className="font-semibold text-ink">{data.profile.classroom}</span> (ปี {data.profile.academicYear})</span>
          )}
        </div>
      </div>

      {/* GPA stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat">
          <p className="stat-label">GPAX</p>
          <p className="stat-value-gold">{data.gpax.toFixed(2)}</p>
        </div>
        <div className="stat">
          <p className="stat-label">หน่วยกิตรวม</p>
          <p className="stat-value">{data.totalCredits}</p>
        </div>
        <div className="stat">
          <p className="stat-label">จำนวนเทอม</p>
          <p className="stat-value">{data.byTerm.length}</p>
        </div>
      </div>

      {/* Empty state */}
      {data.byTerm.length === 0 && (
        <div className="card p-8 text-center text-ink-soft">
          ยังไม่มีเกรดบันทึก
        </div>
      )}

      {/* Terms */}
      {data.byTerm.map((t) => (
        <section key={t.termId} className="card overflow-hidden">
          <header className="flex items-end justify-between p-4 bg-slate-50 border-b border-slate-200">
            <div>
              <h2 className="font-bold tracking-tight">ภาคเรียนที่ {SEM_LABEL[t.semester] ?? t.semester}/{t.year}</h2>
              <p className="text-xs text-ink-soft">{t.grades.length} วิชา · {t.credits} หน่วยกิต</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-ink-soft">GPA</p>
              <p className="text-2xl font-bold text-gradient-gold">{t.gpa.toFixed(2)}</p>
            </div>
          </header>

          <table className="w-full text-sm">
            <thead className="bg-white text-xs uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-4 py-2 text-left">รหัสวิชา</th>
                <th className="px-4 py-2 text-left">ชื่อวิชา / ผู้สอน</th>
                <th className="px-2 py-2 text-center">Quiz<br /><span className="font-normal text-[9px]">20%</span></th>
                <th className="px-2 py-2 text-center">HW<br /><span className="font-normal text-[9px]">20%</span></th>
                <th className="px-2 py-2 text-center">Mid<br /><span className="font-normal text-[9px]">30%</span></th>
                <th className="px-2 py-2 text-center">Final<br /><span className="font-normal text-[9px]">30%</span></th>
                <th className="px-3 py-2 text-center">รวม</th>
                <th className="px-3 py-2 text-center">เกรด</th>
              </tr>
            </thead>
            <tbody>
              {t.grades.map((g) => (
                <tr key={g.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-2 font-mono text-xs">{g.courseCode}</td>
                  <td className="px-4 py-2">
                    <p className="font-medium">{g.courseName}</p>
                    {g.teacherName && <p className="text-xs text-ink-soft">โดย {g.teacherName}</p>}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-xs">{g.quizScore ?? '-'}</td>
                  <td className="px-2 py-2 text-center font-mono text-xs">{g.homeworkScore ?? '-'}</td>
                  <td className="px-2 py-2 text-center font-mono text-xs">{g.midtermScore ?? '-'}</td>
                  <td className="px-2 py-2 text-center font-mono text-xs">{g.finalScore ?? '-'}</td>
                  <td className="px-3 py-2 text-center font-mono font-bold">{g.score.toFixed(2)}</td>
                  <td className={`px-3 py-2 text-center font-bold text-lg ${LETTER_COLOR[g.letter] ?? ''}`}>
                    {LETTER_LABEL[g.letter] ?? g.letter}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
