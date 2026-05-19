'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
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

const TABS = [
  { key: 'roster', label: 'นักเรียน' },
  { key: 'subjects', label: 'รายวิชา' },
  { key: 'scores', label: 'คะแนน' },
  { key: 'schedule', label: 'ตารางเรียน', disabled: true },
  { key: 'close', label: 'ปิดเทอม', disabled: true },
] as const;

export default function ClassroomWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const tab = (search.get('tab') as (typeof TABS)[number]['key']) ?? 'roster';
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
      <Link href="/teacher/classrooms" className="text-sm text-ink-soft hover:text-ink">← ห้องทั้งหมด</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl">🏫</span>
            <h2 className="text-3xl font-bold tracking-tight">{classroom.gradeLevel}/{classroom.section}</h2>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            ปีการศึกษา {classroom.academicYear} · {classroom._count.students} คน
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium uppercase tracking-wider text-ink-soft">เทอม</label>
          <select value={termId} onChange={(e) => selectTerm(e.target.value)} className="input w-44">
            {terms.map((t) => <option key={t.id} value={t.id}>{t.year} / {t.semester[0]}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              disabled={t.disabled}
              onClick={() => !t.disabled && selectTab(t.key)}
              className={`relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors duration-150
                ${active ? 'text-ink' : 'text-ink-soft hover:text-ink'}
                ${t.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {t.label}
              {t.disabled && <span className="ml-1 rounded bg-slate-100 px-1 text-[10px]">soon</span>}
              {active && (
                <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #B8860B, #D4A017)' }} />
              )}
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
