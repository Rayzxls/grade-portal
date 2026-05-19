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

      <div className="card mt-10 p-5">
        <h3 className="font-semibold tracking-tight">แนะนำการใช้งาน</h3>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>เข้า <Link href="/teacher/classrooms" className="font-semibold text-ink underline">ห้องของฉัน</Link> เพื่อสร้างห้องประจำชั้น</li>
          <li>กดเข้าห้องที่สร้าง — จะเปิด <span className="font-semibold text-ink">พื้นที่ทำงานส่วนตัวของห้อง</span></li>
          <li>แท็บ <b>นักเรียน</b>: เพิ่มทีละคน หรือ Upload CSV</li>
          <li>แท็บ <b>รายวิชา</b>: เพิ่มวิชาที่ห้องนี้เรียน — ระบบลงทะเบียนนักเรียนทุกคนอัตโนมัติ</li>
          <li>แท็บ <b>คะแนน</b>: ใส่คะแนน ระบบคำนวณเกรดให้ทันที</li>
        </ol>
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
