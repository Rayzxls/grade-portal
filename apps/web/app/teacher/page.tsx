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
    <div className="space-y-8 animate-fade-in">
      <div>
        <div className="badge-gold">ครูประจำชั้น & ผู้สอน</div>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">พื้นที่ทำงานของคุณครู</h2>
        <p className="mt-1 text-sm text-ink-soft">ระบบตั้งค่าและบริหารจัดการข้อมูลนักเรียน รายวิชา และบันทึกเกรดด้วยตัวคุณครูเอง</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="ห้องเรียนที่ดูแล" value={stats.classrooms} gold />
        <Stat label="รายวิชาเรียนที่สร้าง" value={stats.courses} />
        <Stat label="นักเรียนในระบบ" value={stats.students} />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-ink">ทางลัดการตั้งค่า (Quick Setup)</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <QuickAction
            href="/teacher/classrooms/new"
            title="🏫 สร้างห้องเรียนใหม่"
            desc="กำหนดชั้นเรียน, ลงวิชาเรียน และเพิ่มนักเรียนในที่เดียว"
          />
          <QuickAction
            href="/teacher/courses"
            title="🎓 จัดการรายวิชาเรียน"
            desc="สร้าง แก้ไข หรือตั้งค่าวิชาที่คุณครูรับผิดชอบสอน"
          />
          <QuickAction
            href="/teacher/terms"
            title="📅 ตั้งค่าภาคเรียน"
            desc="กำหนดวันเริ่ม/สิ้นสุดปีการศึกษาและเทอมที่เปิดสอน"
          />
        </div>
      </div>

      {/* Usage Guideline */}
      <div className="card p-6 border-gold">
        <h3 className="font-semibold tracking-tight text-lg text-ink">💡 แนะนำการใช้ระบบแบบดูแลตนเอง (Self-Service)</h3>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="font-bold text-sm text-ink mb-2">ขั้นตอนที่ 1: ตั้งค่าระบบการเรียน</h4>
            <ol className="list-decimal pl-5 text-sm text-ink-soft space-y-2">
              <li>เข้าเมนู <Link href="/teacher/terms" className="font-semibold text-ink underline">ภาคเรียน</Link> เพื่อกำหนดปีการศึกษาปัจจุบัน</li>
              <li>เข้าเมนู <Link href="/teacher/courses" className="font-semibold text-ink underline">วิชาเรียน</Link> เพื่อลงทะเบียนหลักสูตรวิชาที่เปิดสอน</li>
            </ol>
          </div>
          <div>
            <h4 className="font-bold text-sm text-ink mb-2">ขั้นตอนที่ 2: จัดการห้องเรียนและเกรด</h4>
            <ol className="list-decimal pl-5 text-sm text-ink-soft space-y-2 flex-1">
              <li>ไปที่หน้า <Link href="/teacher/classrooms" className="font-semibold text-ink underline">ห้องเรียนของฉัน</Link> เพื่อกำหนดห้องเรียนประจำชั้น</li>
              <li>นำเข้านักเรียนในแท็บ **นักเรียน** และผูกวิชาเรียนในแท็บ **รายวิชา** (ระบบลงทะเบียนเรียนให้นักเรียนทุกคนโดยอัตโนมัติ!)</li>
              <li>กรอกคะแนนตัดเกรดในแท็บ **คะแนน** เพื่อปิดสมุดรายงาน</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: number; gold?: boolean }) {
  return (
    <div className="stat card p-5 flex flex-col justify-between">
      <p className="stat-label text-sm text-ink-soft">{label}</p>
      <p className={gold ? 'stat-value-gold text-3xl font-extrabold mt-2' : 'stat-value text-3xl font-bold mt-2 text-ink'}>
        {value}
      </p>
    </div>
  );
}

function QuickAction({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="card group block p-5 hover:border-gold transition-all duration-200">
      <h4 className="font-semibold tracking-tight text-ink group-hover:text-gold flex items-center justify-between">
        {title}
        <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
      </h4>
      <p className="mt-2 text-sm text-ink-soft">{desc}</p>
    </Link>
  );
}
