'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PrintButton } from '@/components/ui/PrintButton';

type GradeLetter = 'A' | 'B_PLUS' | 'B' | 'C_PLUS' | 'C' | 'D_PLUS' | 'D' | 'F' | 'W' | 'I';

interface TermGrade {
  id: string;
  courseCode: string;
  courseName: string;
  credits: number;
  score: number;
  letter: GradeLetter;
  gradePoint: number;
  teacherName: string | null;
  term: { id: string; year: number; semester: string };
}

interface TermPending {
  enrollmentId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  teacherName: string | null;
  term: { id: string; year: number; semester: string };
  sheetStatus: 'NO_SHEET' | 'OPEN' | 'FINALIZED';
}

interface TermGroup {
  termId: string;
  year: number;
  semester: string;
  label: string;
  grades: TermGrade[];
  pending: TermPending[];
  termGpa: number;
  termCredits: number;
}

interface MyGradesResponse {
  profile: {
    studentCode: string;
    fullName: string;
    classroom: string | null;
    academicYear: number | null;
  };
  gpa: number;
  totalCredits: number;
  grades: TermGrade[];
  byTerm: TermGroup[];
}

const LETTER_LABEL: Record<string, string> = {
  A: 'A', B_PLUS: 'B+', B: 'B', C_PLUS: 'C+', C: 'C',
  D_PLUS: 'D+', D: 'D', F: 'F', W: 'W', I: 'I',
};

const LETTER_COLOR: Record<string, string> = {
  A: 'text-emerald-600',
  B_PLUS: 'text-emerald-500',
  B: 'text-blue-600',
  C_PLUS: 'text-blue-500',
  C: 'text-amber-600',
  D_PLUS: 'text-amber-700',
  D: 'text-orange-600',
  F: 'text-rose-600',
  W: 'text-slate-500',
  I: 'text-slate-500',
};

const STATUS_LABEL: Record<TermPending['sheetStatus'], { text: string; cls: string }> = {
  NO_SHEET: { text: 'ยังไม่เปิดสมุดคะแนน', cls: 'badge bg-slate-100 text-slate-600' },
  OPEN: { text: 'กำลังเรียน', cls: 'badge bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  FINALIZED: { text: 'ปิดเล่มแล้ว — กำลังออกเกรด', cls: 'badge bg-amber-50 text-amber-800 ring-1 ring-amber-200' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<MyGradesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | 'ALL'>('ALL');

  useEffect(() => {
    api.get<MyGradesResponse>('/grades/me').then((r) => {
      setData(r);
      // เลือก tab เทอมล่าสุดเป็น default
      if (r.byTerm.length > 0) setActiveTab(r.byTerm[0].termId);
    }).catch((e: Error) => {
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

  const visibleTerms = activeTab === 'ALL' ? data.byTerm : data.byTerm.filter((t) => t.termId === activeTab);
  const hasAnyData = data.byTerm.length > 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 animate-fade-in">
      {/* Header */}
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
        <div className="flex gap-2 print-hide">
          <PrintButton />
          <button onClick={downloadTranscript} className="btn-accent">
            ดาวน์โหลด Transcript
          </button>
          <button onClick={logout} className="btn-secondary">ออกจากระบบ</button>
        </div>
      </div>

      {/* GPAX summary */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="stat">
          <p className="stat-label">GPAX (สะสม)</p>
          <p className="stat-value-gold">{data.gpa.toFixed(2)}</p>
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

      {/* Term tabs */}
      {hasAnyData && (
        <div className="mt-8 flex flex-wrap gap-1.5 print-hide">
          <TabButton active={activeTab === 'ALL'} onClick={() => setActiveTab('ALL')}>
            ทั้งหมด
          </TabButton>
          {data.byTerm.map((t) => (
            <TabButton key={t.termId} active={activeTab === t.termId} onClick={() => setActiveTab(t.termId)}>
              เทอม {t.label}
            </TabButton>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasAnyData && (
        <div className="card mt-8 p-8 text-center">
          <p className="text-3xl mb-2">📭</p>
          <p className="font-semibold text-ink">ยังไม่มีข้อมูลการเรียน</p>
          <p className="text-sm text-ink-soft mt-1">ครูยังไม่ได้ลงทะเบียนวิชาใดๆ ให้</p>
        </div>
      )}

      {/* Terms */}
      <div className="mt-6 space-y-6">
        {visibleTerms.map((term) => (
          <TermCard key={term.termId} term={term} />
        ))}
      </div>
    </main>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 ${
        active
          ? 'bg-ink text-white shadow-soft'
          : 'bg-white border border-slate-200 text-ink-soft hover:border-ink hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function TermCard({ term }: { term: TermGroup }) {
  const finalized = term.grades.length;
  const inProgress = term.pending.length;
  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">ภาคเรียนที่ {term.label}</h2>
          <p className="text-xs text-ink-soft mt-0.5">
            {finalized} วิชาที่ออกเกรดแล้ว · {inProgress} วิชากำลังเรียน
          </p>
        </div>
        <div className="flex gap-5">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-ink-soft">GPA เทอมนี้</p>
            <p className="text-2xl font-bold text-gradient-gold">{term.termGpa.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-ink-soft">หน่วยกิต</p>
            <p className="text-2xl font-bold text-ink">{term.termCredits}</p>
          </div>
        </div>
      </header>

      {/* Grades table */}
      {term.grades.length > 0 && (
        <table className="w-full text-sm">
          <thead className="bg-white text-left text-xs uppercase tracking-wider text-ink-soft">
            <tr>
              <th className="px-5 py-2.5 font-semibold">รหัสวิชา</th>
              <th className="px-5 py-2.5 font-semibold">ชื่อวิชา / ผู้สอน</th>
              <th className="px-5 py-2.5 font-semibold text-center">หน่วยกิต</th>
              <th className="px-5 py-2.5 font-semibold text-center">คะแนน</th>
              <th className="px-5 py-2.5 font-semibold text-center">เกรด</th>
            </tr>
          </thead>
          <tbody>
            {term.grades.map((g) => (
              <tr key={g.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3 font-mono text-xs">{g.courseCode}</td>
                <td className="px-5 py-3">
                  <p className="font-medium text-ink">{g.courseName}</p>
                  {g.teacherName && <p className="text-xs text-ink-soft mt-0.5">โดย {g.teacherName}</p>}
                </td>
                <td className="px-5 py-3 text-center">{g.credits}</td>
                <td className="px-5 py-3 text-center font-mono">{g.score.toFixed(2)}</td>
                <td className={`px-5 py-3 text-center font-bold text-lg ${LETTER_COLOR[g.letter] ?? ''}`}>
                  {LETTER_LABEL[g.letter] ?? g.letter}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pending (กำลังเรียน) */}
      {term.pending.length > 0 && (
        <div className="border-t border-slate-200">
          <p className="px-5 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            ⏳ กำลังเรียน — ยังไม่ออกเกรด
          </p>
          <ul className="divide-y divide-slate-100">
            {term.pending.map((p) => {
              const s = STATUS_LABEL[p.sheetStatus];
              return (
                <li key={p.enrollmentId} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      <span className="font-mono text-xs text-ink-soft mr-2">{p.courseCode}</span>
                      {p.courseName}
                    </p>
                    {p.teacherName && <p className="text-xs text-ink-soft mt-0.5">โดย {p.teacherName} · {p.credits} หน่วยกิต</p>}
                  </div>
                  <span className={s.cls}>{s.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
