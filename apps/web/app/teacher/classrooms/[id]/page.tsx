'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatTerm } from '@/lib/utils';
import { RosterTab } from './_tabs/roster';
import { SubjectsTab } from './_tabs/subjects';
import { ScoresTab } from './_tabs/scores';

interface MyClassroom {
  id: string;
  gradeLevel: string;
  section: number;
  academicYear: number;
  _count: { students: number };
  students: { id: string; studentCode: string; user: { fullName: string; email: string } }[];
}

interface Term { id: string; year: number; semester: string }

interface TabItem {
  key: 'roster' | 'subjects' | 'scores' | 'schedule' | 'close';
  label: string;
  disabled?: boolean;
}

const TABS: readonly TabItem[] = [
  { key: 'roster', label: 'นักเรียน' },
  { key: 'subjects', label: 'รายวิชา' },
  { key: 'scores', label: 'คะแนน' },
  { key: 'schedule', label: 'ตารางเรียน', disabled: true },
  { key: 'close', label: 'ปิดเทอม', disabled: true },
];

export default function ClassroomWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const tab = (search.get('tab') as TabItem['key']) ?? 'roster';
  const termIdFromUrl = search.get('term') ?? '';

  const [classroom, setClassroom] = useState<MyClassroom | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState(termIdFromUrl);

  async function loadClassroom() {
    const all = await api.get<MyClassroom[]>('/teacher/classrooms');
    setClassroom(all.find((c) => c.id === id) ?? null);
  }

  useEffect(() => {
    loadClassroom();
    api.get<Term[]>('/teacher/terms').then((ts) => {
      setTerms(ts);
      if (!termIdFromUrl && ts[0]) {
        setTermId(ts[0].id);
        setUrl({ term: ts[0].id });
      }
    });
    // eslint-disable-next-line
  }, [id]);

  function setUrl(patch: Record<string, string>) {
    const params = new URLSearchParams(search);
    Object.entries(patch).forEach(([k, v]) => params.set(k, v));
    router.replace(`/teacher/classrooms/${id}?${params.toString()}`);
  }

  function selectTab(key: string) {
    setUrl({ tab: key });
  }
  function selectTerm(newTermId: string) {
    setTermId(newTermId);
    setUrl({ term: newTermId });
  }

  if (!classroom) return <p className="text-ink-soft">กำลังโหลด...</p>;

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-medium text-ink-soft">
        <Link href="/teacher/classrooms" className="transition-colors hover:text-amber-700">หน้าหลัก</Link>
        <span className="text-slate-300">/</span>
        <Link href="/teacher/classrooms" className="transition-colors hover:text-amber-700">ห้องเรียนทั้งหมด</Link>
        <span className="text-slate-300">/</span>
        <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
          ม.{classroom.gradeLevel.replace(/[^\d]/g, '')}/{classroom.section}
        </span>
      </div>

      {/* Glassmorphic Classroom Banner */}
      <div className="relative overflow-hidden mt-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft transition-all hover:shadow-lift">
        {/* Subtle decorative gold light leak */}
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-gradient-to-br from-amber-200/20 to-yellow-100/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200/70 shadow-inner">
              <span className="text-3xl animate-pulse">🏫</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                  ชั้น {classroom.gradeLevel}/{classroom.section}
                </h2>
                <span className="badge badge-gold font-semibold shadow-sm">Active Workspace</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                <span className="flex items-center gap-1.5 font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  ปีการศึกษา {classroom.academicYear}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5 font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  นักเรียน {classroom._count.students} คน
                </span>
              </div>
            </div>
          </div>
          
          {/* Term Selector Widget */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80">ภาคการศึกษาปัจจุบัน</span>
              <select 
                value={termId} 
                onChange={(e) => selectTerm(e.target.value)} 
                className="bg-transparent pr-8 py-0.5 text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer hover:text-amber-800 transition-colors"
                style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/></svg>")`, backgroundPosition: 'right center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
              >
                {terms.map((t) => <option key={t.id} value={t.id} className="text-slate-800">{formatTerm(t.year, t.semester)}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 bg-slate-100/90 backdrop-blur-sm p-1 rounded-xl flex gap-1 overflow-x-auto shadow-inner border border-slate-200/50">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              disabled={t.disabled}
              onClick={() => !t.disabled && selectTab(t.key)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${active 
                  ? 'bg-white text-amber-950 shadow-sm border border-slate-200/50 font-semibold scale-[1.02]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/55'}
                ${t.disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
            >
              {t.key === 'roster' && (
                <svg className={`h-4 w-4 ${active ? 'text-amber-800' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
              {t.key === 'subjects' && (
                <svg className={`h-4 w-4 ${active ? 'text-amber-800' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              )}
              {t.key === 'scores' && (
                <svg className={`h-4 w-4 ${active ? 'text-amber-800' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              )}
              {t.key === 'schedule' && (
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              {t.key === 'close' && (
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              )}
              
              <span>{t.label}</span>
              {t.disabled && <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-wider">soon</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-6 animate-fade-in">
        {tab === 'roster' && <RosterTab classroom={classroom} onReload={loadClassroom} />}
        {tab === 'subjects' && termId && <SubjectsTab classroomId={id} termId={termId} gradeLevel={classroom.gradeLevel} />}
        {tab === 'scores' && termId && <ScoresTab classroomId={id} termId={termId} />}
        {tab === 'schedule' && <PlaceholderTab title="ตารางเรียน" />}
        {tab === 'close' && <PlaceholderTab title="ปิดเทอม" />}
      </div>
    </div>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="card p-12 text-center">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-soft">ฟีเจอร์นี้กำลังพัฒนา</p>
    </div>
  );
}
