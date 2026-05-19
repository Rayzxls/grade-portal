'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function TeacherHome() {
  const router = useRouter();
  const [stats, setStats] = useState({ classrooms: 0, courses: 0, students: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [classrooms, courses] = await Promise.all([
          api.get<{ _count: { students: number } }[]>('/teacher/classrooms'),
          api.get<unknown[]>('/teacher/courses'),
        ]);
        setStats({
          classrooms: classrooms.length,
          courses: courses.length,
          students: classrooms.reduce((s, c) => s + c._count.students, 0),
        });
      } catch (e) {
        if (e instanceof Error && e.message.includes('401')) router.push('/login');
      }
    })();
  }, [router]);

  return (
    <div>
      <div className="badge-gold">ครู</div>
      <h2 className="mt-2 text-3xl font-bold tracking-tight">แผงควบคุมของครู</h2>
      <p className="mt-1 text-sm text-ink-soft">จัดการห้องประจำชั้น รายวิชา และบันทึกเกรด</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="ห้องประจำชั้น" value={stats.classrooms} gold />
        <Stat label="วิชาที่สอน" value={stats.courses} />
        <Stat label="นักเรียนรวม" value={stats.students} />
      </div>

      <h3 className="mt-10 text-lg font-semibold tracking-tight">เมนูด่วน</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <QuickLink href="/teacher/classrooms" title="จัดการห้อง" desc="สร้างห้อง / เพิ่มนักเรียน / นำเข้า CSV" />
        <QuickLink href="/teacher/courses" title="จัดการวิชา" desc="สร้างรายวิชาที่ตัวเองสอน" />
        <QuickLink href="/teacher/grades" title="บันทึกเกรด" desc="ใส่/แก้คะแนนนักเรียน" />
      </div>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: number; gold?: boolean }) {
  return (
    <div className="stat">
      <p className="stat-label">{label}</p>
      <p className={gold ? 'stat-value-gold' : 'stat-value'}>{value}</p>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="card group block p-5">
      <h4 className="font-semibold tracking-tight">{title} <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span></h4>
      <p className="mt-1 text-sm text-ink-soft">{desc}</p>
    </Link>
  );
}
