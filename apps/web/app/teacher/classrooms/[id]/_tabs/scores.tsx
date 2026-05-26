'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Subject { courseId: string; code: string; name: string; totalStudents: number; graded: number }
interface Offering {
  offeringId: string;
  course: { id: string; code: string };
  classroom: { id: string };
  term: { id: string };
}

/**
 * แท็บ "คะแนน" — เปลี่ยนเป็นจุดรวมลิงก์ไปหน้า /teacher/grade-entry
 * (Phase 2 ของ redesign: ระบบ ScoreSheet/ScoreColumn ยืดหยุ่นถูก retire)
 */
export function ScoresTab({ classroomId, termId }: { classroomId: string; termId: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Subject[]>(`/teacher/classrooms/${classroomId}/subjects?termId=${termId}`),
      api.get<Offering[]>(`/teacher/offerings?termId=${termId}`),
    ]).then(([s, o]) => {
      setSubjects(s);
      setOfferings(o.filter((x) => x.classroom.id === classroomId));
    }).finally(() => setLoading(false));
  }, [classroomId, termId]);

  if (loading) return <p className="text-ink-soft p-8 text-center">กำลังโหลด...</p>;

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-gradient-to-br from-amber-50/40 to-white border-amber-200">
        <div className="flex items-start gap-3">
          <div className="text-3xl">✨</div>
          <div className="flex-1">
            <h3 className="font-bold text-ink">ระบบบันทึกเกรดใหม่</h3>
            <p className="text-sm text-ink-soft mt-1">
              กรอกแค่ 4 ช่อง: <b>Quiz 20%</b> + <b>Homework 20%</b> + <b>Midterm 30%</b> + <b>Final 30%</b>
              <br />ระบบจะคำนวณคะแนนรวม + เกรด + GPA ให้อัตโนมัติ
            </p>
            <Link href="/teacher/offerings" className="btn-primary btn-sm mt-3 inline-flex">
              เปิดหน้าวิชาที่ฉันสอน →
            </Link>
          </div>
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="card p-12 text-center text-ink-soft">
          ยังไม่มีวิชาในเทอมนี้ — ไปที่แท็บ <b>รายวิชา</b> เพื่อเปิดสอนวิชาในห้องก่อน
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => {
            const pct = s.totalStudents > 0 ? (s.graded / s.totalStudents) * 100 : 0;
            return (
              <Link
                key={s.courseId}
                href={offerings.find((o) => o.course.id === s.courseId)?.offeringId
                  ? `/teacher/offerings/${offerings.find((o) => o.course.id === s.courseId)!.offeringId}`
                  : `/teacher/offerings`}
                className="card group p-4 hover:border-amber-300 transition-all duration-200 hover:-translate-y-0.5"
              >
                <p className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 inline-block px-2 py-0.5 rounded">{s.code}</p>
                <h4 className="font-bold text-ink mt-2">{s.name}</h4>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-ink-soft">บันทึกแล้ว</span>
                  <span className="font-bold">{s.graded}/{s.totalStudents}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-amber-700 mt-3 group-hover:underline">เปิดหน้ากรอกเกรด →</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
