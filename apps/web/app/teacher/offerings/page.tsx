'use client';

/**
 * /teacher/offerings — รายการวิชาที่ฉันสอน (SubjectOffering)
 * แทน /teacher/grade-entry แบบเดิมที่ select drop-down ของ classroom+course
 * ที่นี่จะแสดงเป็น card ต่อ 1 offering พร้อม progress
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Offering {
  offeringId: string;
  classroom: { id: string; gradeLevel: string; section: number; academicYear: number; _count?: { students: number } };
  course: { id: string; code: string; name: string; credits: number };
  term: { id: string; year: number; semester: string };
  finalizedAt: string | null;
  totalStudents: number;
  graded: number;
  progress: number;
}

const SEM: Record<string, string> = { FIRST: '1', SECOND: '2', SUMMER: 'ฤดูร้อน' };

export default function MyOfferingsPage() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [termFilter, setTermFilter] = useState<string>('ALL');

  useEffect(() => {
    api.get<Offering[]>('/teacher/offerings').then((rs) => {
      setOfferings(rs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const terms = useMemo(() => {
    const seen = new Map<string, { id: string; label: string }>();
    for (const o of offerings) {
      seen.set(o.term.id, { id: o.term.id, label: `${SEM[o.term.semester] ?? o.term.semester}/${o.term.year}` });
    }
    return Array.from(seen.values());
  }, [offerings]);

  const filtered = termFilter === 'ALL' ? offerings : offerings.filter((o) => o.term.id === termFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="badge-gold">วิชาที่ฉันสอน</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">รายวิชาทั้งหมด</h1>
        <p className="mt-1 text-sm text-ink-soft">
          แต่ละการ์ดคือ "วิชา × ห้องเรียน × เทอม" → คลิกเพื่อกรอกคะแนน 4 หมวด
        </p>
      </div>

      {/* Term filter */}
      {terms.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setTermFilter('ALL')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${termFilter === 'ALL' ? 'bg-ink text-white shadow-soft' : 'bg-white border border-slate-200 text-ink-soft hover:border-ink'}`}>
            ทั้งหมด
          </button>
          {terms.map((t) => (
            <button key={t.id} onClick={() => setTermFilter(t.id)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${termFilter === t.id ? 'bg-ink text-white shadow-soft' : 'bg-white border border-slate-200 text-ink-soft hover:border-ink'}`}>
              เทอม {t.label}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-ink-soft">กำลังโหลด...</p>}

      {!loading && offerings.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-2">📚</div>
          <h3 className="font-bold text-ink">ยังไม่มีวิชาที่สอน</h3>
          <p className="text-sm text-ink-soft mt-1">รอ admin หรือครูประจำชั้นเปิดวิชาในห้องก่อน</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => (
            <Link
              key={o.offeringId}
              href={`/teacher/offerings/${o.offeringId}`}
              className="card group relative overflow-hidden p-5 hover:border-amber-300 hover:-translate-y-0.5 transition-all"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-30 blur-2xl transition-opacity"
                   style={{ background: 'radial-gradient(circle, #fde68a 0%, transparent 60%)' }} />

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    {o.course.code}
                  </span>
                  <span className="text-[10px] text-ink-soft">{o.course.credits} หน่วยกิต</span>
                </div>

                <h3 className="font-bold text-ink leading-tight">{o.course.name}</h3>

                <div className="flex items-center gap-2 mt-2 text-xs text-ink-soft">
                  <span className="badge badge-teacher !text-[10px]">
                    {o.classroom.gradeLevel}/{o.classroom.section}
                  </span>
                  <span>·</span>
                  <span>เทอม {SEM[o.term.semester] ?? o.term.semester}/{o.term.year}</span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink-soft">บันทึกเกรดแล้ว</span>
                    <span className={`font-bold ${o.graded === o.totalStudents && o.totalStudents > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {o.graded}/{o.totalStudents} ({o.progress}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full transition-all ${o.graded === o.totalStudents && o.totalStudents > 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-yellow-500'}`}
                      style={{ width: `${o.progress}%` }}
                    />
                  </div>
                </div>

                {o.finalizedAt && (
                  <p className="mt-3 text-[10px] text-emerald-700 font-semibold">✓ ปิดเล่มแล้ว</p>
                )}
                <p className="mt-3 text-xs text-amber-700 group-hover:underline">เปิดหน้ากรอก →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
