'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Tilt3D } from '@/components/ui/Tilt3D';
import { CountUp } from '@/components/ui/CountUp';

export default function AdminHome() {
  const router = useRouter();
  const [stats, setStats] = useState({ users: 0, classrooms: 0, courses: 0, terms: 0, enrollments: 0, students: 0, teachers: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [users, classrooms, courses, terms, enrollments] = await Promise.all([
          api.get<{ role: string }[]>('/admin/users'),
          api.get<unknown[]>('/admin/classrooms'),
          api.get<unknown[]>('/admin/courses'),
          api.get<unknown[]>('/admin/terms'),
          api.get<unknown[]>('/admin/enrollments'),
        ]);
        setStats({
          users: users.length,
          students: users.filter((u) => u.role === 'STUDENT').length,
          teachers: users.filter((u) => u.role === 'TEACHER').length,
          classrooms: classrooms.length,
          courses: courses.length,
          terms: terms.length,
          enrollments: enrollments.length,
        });
        setLoaded(true);
      } catch (e) {
        if (e instanceof Error && e.message.includes('401')) router.push('/login');
      }
    })();
  }, [router]);

  // ระบบ "พร้อมใช้" เมื่อมีอย่างน้อย 1 term + 1 classroom + 1 course + 1 student
  const isReady = stats.terms > 0 && stats.classrooms > 0 && stats.courses > 0 && stats.students > 0;
  const stepsDone = [
    { name: 'เทอม', done: stats.terms > 0 },
    { name: 'ครู', done: stats.teachers > 0 },
    { name: 'ห้องเรียน', done: stats.classrooms > 0 },
    { name: 'รายวิชา', done: stats.courses > 0 },
    { name: 'นักเรียน', done: stats.students > 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="badge-gold">Admin</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          <span className="text-gradient-ink">ภาพรวมระบบ</span>
        </h1>
        <p className="mt-1 text-sm text-ink-soft">บริหารระบบเกรดทั้งหมด — เริ่มจาก Quick Setup ถ้ายังไม่เคยตั้ง</p>
      </div>

      {/* CTA: Quick Setup */}
      {!isReady && (
        <Tilt3D max={5} scale={1.005}>
          <Link href="/admin/setup" className="block card relative overflow-hidden p-6 sheen border-amber-300 bg-gradient-to-br from-amber-50/50 to-white">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-30 blur-3xl"
                 style={{ background: 'radial-gradient(circle, #fde68a 0%, transparent 60%)' }} />
            <div className="relative z-10 flex items-center gap-4">
              <div className="text-5xl animate-float">🚀</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold tracking-tight text-ink">เริ่มต้นใช้งานด่วน (Quick Setup)</h3>
                <p className="text-sm text-ink-soft mt-1">สร้าง เทอม → ครู → ห้องเรียน → วิชา → นักเรียน ในขั้นตอนเดียว</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {stepsDone.map((s) => (
                    <span key={s.name} className={`badge ${s.done ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'}`}>
                      {s.done ? '✓' : '○'} {s.name}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-3xl text-ink-soft">→</span>
            </div>
          </Link>
        </Tilt3D>
      )}

      {isReady && (
        <div className="card p-4 bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold text-emerald-800">ระบบพร้อมใช้งาน</p>
                <p className="text-xs text-emerald-700">มี {stats.terms} เทอม · {stats.teachers} ครู · {stats.students} นักเรียน · {stats.classrooms} ห้อง · {stats.courses} วิชา</p>
              </div>
            </div>
            <Link href="/admin/setup" className="btn-ghost btn-sm">+ เพิ่มห้อง/นักเรียนใหม่</Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="นักเรียน" value={stats.students} icon="🎓" loaded={loaded} gold />
        <StatCard label="ครู" value={stats.teachers} icon="👨‍🏫" loaded={loaded} />
        <StatCard label="ห้องเรียน" value={stats.classrooms} icon="🏫" loaded={loaded} />
        <StatCard label="รายวิชา" value={stats.courses} icon="📚" loaded={loaded} />
      </div>

      {/* Quick navigation */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-ink-soft mb-3">เมนูจัดการ</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NavCard href="/admin/students" icon="🎓" title="รายชื่อนักเรียน" desc="ค้นหา + ดูเกรด GPA ของแต่ละคน" />
          <NavCard href="/admin/users" icon="👥" title="ผู้ใช้ทั้งหมด" desc="จัดการ admin / ครู / นักเรียน" />
          <NavCard href="/admin/classrooms" icon="🏫" title="ห้องเรียน" desc="ห้อง + ครูประจำชั้น" />
          <NavCard href="/admin/courses" icon="📚" title="รายวิชา" desc="รหัสวิชา + ครูผู้สอน" />
          <NavCard href="/admin/terms" icon="📅" title="ปีการศึกษา" desc="เทอม + ช่วงเวลา" />
          <NavCard href="/admin/audit" icon="📋" title="Audit Log" desc="ประวัติการแก้ไขเกรด" />
        </div>
      </div>

      {/* Workflow explanation */}
      <div className="card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-ink-soft mb-3">📖 ระบบทำงานยังไง</h3>
        <ol className="space-y-2 text-sm">
          <Flow n="1" who="Admin" what="สร้างพื้นฐาน — เทอม, ครู, ห้องเรียน, รายวิชา, นักเรียน" via="/admin/setup" />
          <Flow n="2" who="ครู" what="ลงวิชาในห้อง → กรอกคะแนน 4 หมวด (Quiz, HW, Mid, Final) → ระบบคำนวณเกรดอัตโนมัติ" via="/teacher/grade-entry" />
          <Flow n="3" who="นักเรียน" what="ดูเกรด + GPA ของตัวเองที่ /dashboard — เห็นทุกวิชา / ทุกครู" via="/dashboard" />
          <Flow n="4" who="Admin" what="ดูเกรดและ GPA ของนักเรียนคนใดก็ได้" via="/admin/students" last />
        </ol>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, loaded, gold }: { label: string; value: number; icon: string; loaded: boolean; gold?: boolean }) {
  return (
    <Tilt3D max={8} scale={1.02}>
      <div className="card relative overflow-hidden p-4 sheen">
        {gold && (
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-30 blur-2xl"
               style={{ background: 'radial-gradient(circle, #fde68a 0%, transparent 60%)' }} />
        )}
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
            <p className={`mt-2 text-3xl font-extrabold tracking-tight ${gold ? 'text-gradient-gold' : 'text-ink'}`}>
              {loaded ? <CountUp value={value} /> : '...'}
            </p>
          </div>
          <div className="text-2xl">{icon}</div>
        </div>
      </div>
    </Tilt3D>
  );
}

function NavCard({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="card group flex items-center gap-3 p-4 hover:border-amber-300 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 text-xl shadow-soft group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink text-sm">{title}</p>
        <p className="text-xs text-ink-soft truncate">{desc}</p>
      </div>
      <span className="text-ink-soft group-hover:text-ink group-hover:translate-x-1 transition-all">→</span>
    </Link>
  );
}

function Flow({ n, who, what, via, last }: { n: string; who: string; what: string; via?: string; last?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-ink text-white font-bold text-xs">{n}</span>
      <div className="flex-1 min-w-0">
        <span className="badge badge-gold !text-[10px]">{who}</span>
        <span className="ml-2 text-ink">{what}</span>
        {via && <Link href={via} className="ml-2 text-xs text-amber-700 hover:underline">→ {via}</Link>}
      </div>
      {!last && <span className="hidden sm:block text-slate-300">↓</span>}
    </li>
  );
}
