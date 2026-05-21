'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Tilt3D } from '@/components/ui/Tilt3D';
import { CountUp } from '@/components/ui/CountUp';

type ScheduleSemester = 'FIRST' | 'SECOND' | 'SUMMER';

interface SchedulePeriod {
  id: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  kind: 'TEACHING' | 'ACTIVITY' | 'SPECIAL';
  color: string;
  room: string | null;
  title: string | null;
  subject?: { code: string; name: string } | null;
  classroom?: { gradeLevel: string; section: number } | null;
}

interface Me {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

const DAY_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const CURRENT_YEAR = 2569;

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 12) return { text: 'อรุณสวัสดิ์', emoji: '☀️' };
  if (h < 17) return { text: 'สวัสดีตอนบ่าย', emoji: '🌤' };
  if (h < 20) return { text: 'สวัสดีตอนเย็น', emoji: '🌇' };
  return { text: 'ราตรีสวัสดิ์', emoji: '🌙' };
}

function todayDayOfWeek(): number {
  const d = new Date().getDay(); // 0=อา ... 6=ส
  return d === 0 ? 7 : d; // map → 1=จ ... 7=อา
}

function minToHHMM(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}.${String(m % 60).padStart(2, '0')}`;
}

export default function TeacherHome() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState({ classrooms: 0, courses: 0, students: 0, hoursPerWeek: 0 });
  const [todayPeriods, setTodayPeriods] = useState<SchedulePeriod[]>([]);
  const [loaded, setLoaded] = useState(false);
  const greeting = useMemo(getGreeting, []);
  const dow = useMemo(todayDayOfWeek, []);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, classrooms, courses, periods] = await Promise.all([
          api.get<Me>('/auth/me').catch(() => null),
          api.get<{ _count: { students: number } }[]>('/teacher/classrooms'),
          api.get<unknown[]>('/teacher/courses'),
          api
            .get<SchedulePeriod[]>(`/teacher/schedule/periods?academicYear=${CURRENT_YEAR}&semester=FIRST`)
            .catch(() => [] as SchedulePeriod[]),
        ]);
        const totalMin = periods
          .filter((p) => p.kind !== 'SPECIAL')
          .reduce((s, p) => s + (p.endMinutes - p.startMinutes), 0);
        setMe(meRes);
        setStats({
          classrooms: classrooms.length,
          courses: courses.length,
          students: classrooms.reduce((s, c) => s + c._count.students, 0),
          hoursPerWeek: Math.round((totalMin / 60) * 10) / 10,
        });
        setTodayPeriods(
          periods
            .filter((p) => p.dayOfWeek === dow)
            .sort((a, b) => a.startMinutes - b.startMinutes),
        );
        setLoaded(true);
      } catch (e) {
        if (e instanceof Error && e.message.includes('401')) router.push('/login');
      }
    })();
  }, [router, dow]);

  const firstName = me?.fullName?.split(' ')[0] ?? 'คุณครู';
  const today = new Date();
  const dateStr = today.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 mesh-bg p-7 shadow-soft">
        {/* Floating blobs */}
        <div className="blob animate-float" style={{ width: 240, height: 240, top: -60, right: -40, background: 'radial-gradient(circle, #fde68a 0%, transparent 70%)' }} />
        <div className="blob animate-float-slow" style={{ width: 200, height: 200, bottom: -60, left: -30, background: 'radial-gradient(circle, #c7d2fe 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold">{dateStr}</p>
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="text-gradient-ink">{greeting.text}, </span>
              <span className="text-gradient-gold">{firstName}</span>
              <span className="ml-2 inline-block animate-float">{greeting.emoji}</span>
            </h1>
            <p className="text-sm text-ink-soft max-w-xl">
              ยินดีต้อนรับสู่ Workspace ของคุณ — บริหารห้องเรียน, รายวิชา และบันทึกเกรดได้ที่นี่
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/teacher/schedule" className="btn-primary">
              <span>🗓 ดูตารางสอน</span>
            </Link>
            <Link href="/teacher/classrooms/new" className="btn-secondary">
              + สร้างห้องเรียน
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Stats ───── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ห้องเรียนที่ดูแล" value={stats.classrooms} icon="🏫" gold delay={0} />
        <StatCard label="รายวิชาที่สอน" value={stats.courses} icon="📚" delay={80} />
        <StatCard label="นักเรียนในระบบ" value={stats.students} icon="👥" delay={160} />
        <StatCard label="ชั่วโมงสอน/สัปดาห์" value={stats.hoursPerWeek} suffix=" ชม." icon="⏱" decimals={1} delay={240} />
      </section>

      {/* ───── Two-column: Today schedule + Quick actions ───── */}
      <section className="grid gap-5 lg:grid-cols-3">
        {/* Today's schedule */}
        <div className="lg:col-span-2">
          <SectionHeader title="ตารางสอนวันนี้" subtitle={`${DAY_LABELS[new Date().getDay()]} ${today.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`} accent />
          <div className="mt-3">
            {!loaded ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : todayPeriods.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-5xl mb-2 opacity-60">🏖️</div>
                <p className="font-semibold text-ink">วันนี้ไม่มีคาบสอน</p>
                <p className="text-sm text-ink-soft mt-1">พักผ่อนได้สบายๆ หรือไปวางตารางสอนได้เลย</p>
                <Link href="/teacher/schedule" className="btn-ghost btn-sm mt-3 inline-flex">
                  → จัดตารางสอน
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {todayPeriods.map((p, i) => (
                  <TodayPeriodCard key={p.id} period={p} delay={i * 60} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <SectionHeader title="ทางลัด" subtitle="คลิกเพื่อเริ่มงาน" />
          <div className="mt-3 space-y-3">
            <QuickRow href="/teacher/schedule" icon="🗓" title="ตารางสอน" desc="วางตารางรายสัปดาห์" />
            <QuickRow href="/teacher/classrooms" icon="🏫" title="ห้องเรียนของฉัน" desc="จัดการนักเรียน & เกรด" />
            <QuickRow href="/teacher/courses" icon="🎓" title="รายวิชา" desc="สร้าง/แก้ไขวิชาที่สอน" />
            <QuickRow href="/teacher/terms" icon="📅" title="ภาคเรียน" desc="ตั้งค่าปีการศึกษา" />
          </div>
        </div>
      </section>

      {/* ───── Guidelines (premium card) ───── */}
      <section>
        <Tilt3D max={4} scale={1.005}>
          <div className="card relative overflow-hidden p-7 sheen">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20 animate-float-slow"
                 style={{ background: 'radial-gradient(circle, rgba(184,134,11,0.4) 0%, transparent 60%)' }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge-gold">💡 เริ่มต้นใช้งาน</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-ink mb-4">3 ขั้นตอนเตรียมระบบให้พร้อมสอน</h3>
              <div className="grid gap-6 md:grid-cols-3">
                <Step n={1} title="ตั้งค่าภาคเรียน" desc="กำหนดปีการศึกษาและช่วงเทอม" href="/teacher/terms" />
                <Step n={2} title="สร้างห้องเรียน + วิชา" desc="ลงรายวิชา & เพิ่มนักเรียนในหน้าเดียว" href="/teacher/classrooms/new" />
                <Step n={3} title="กรอกคะแนน & ปิดเล่ม" desc="บันทึกคะแนนแล้ว Finalize ออกเกรดอัตโนมัติ" href="/teacher/classrooms" />
              </div>
            </div>
          </div>
        </Tilt3D>
      </section>
    </div>
  );
}

/* ───── Sub-components ───── */

function StatCard({
  label,
  value,
  icon,
  gold,
  suffix,
  decimals,
  delay,
}: {
  label: string;
  value: number;
  icon: string;
  gold?: boolean;
  suffix?: string;
  decimals?: number;
  delay: number;
}) {
  return (
    <Tilt3D max={10} scale={1.03} style={{ animationDelay: `${delay}ms` }} className="animate-slide-up">
      <div className="card relative overflow-hidden p-5 sheen">
        {gold && (
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30 blur-2xl"
               style={{ background: 'radial-gradient(circle, #fde68a 0%, transparent 60%)' }} />
        )}
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
            <p className={`mt-2 text-4xl font-extrabold tracking-tight ${gold ? 'text-gradient-gold' : 'text-ink'}`}>
              <CountUp value={value} decimals={decimals ?? 0} suffix={suffix} />
            </p>
          </div>
          <div className={`text-3xl ${gold ? 'animate-float' : ''}`}>{icon}</div>
        </div>
      </div>
    </Tilt3D>
  );
}

function SectionHeader({ title, subtitle, accent }: { title: string; subtitle?: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className={`text-lg font-bold tracking-tight ${accent ? 'text-gradient-ink' : 'text-ink'}`}>{title}</h3>
        {subtitle && <p className="text-xs text-ink-soft mt-0.5">{subtitle}</p>}
      </div>
      {accent && (
        <div className="relative w-2 h-2">
          <span className="absolute inset-0 rounded-full bg-amber-500 animate-pulse-ring" />
          <span className="absolute inset-0 rounded-full bg-amber-500" />
        </div>
      )}
    </div>
  );
}

function TodayPeriodCard({ period, delay }: { period: SchedulePeriod; delay: number }) {
  const title = period.subject?.code ?? period.title ?? 'คาบสอน';
  const subjectName = period.subject?.name;
  const classroom = period.classroom ? `${period.classroom.gradeLevel}/${period.classroom.section}` : '';
  return (
    <Tilt3D max={7} scale={1.02} style={{ animationDelay: `${delay}ms` }} className="animate-slide-up">
      <Link href="/teacher/schedule" className="block card sheen relative overflow-hidden p-4 hover:border-amber-300">
        <div
          className="absolute left-0 top-0 h-full w-1.5"
          style={{ backgroundColor: period.color }}
        />
        <div className="relative z-10 pl-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono font-bold text-ink truncate">{title}</p>
            <span className="text-[11px] font-mono text-ink-soft whitespace-nowrap">
              {minToHHMM(period.startMinutes)}–{minToHHMM(period.endMinutes)}
            </span>
          </div>
          {subjectName && <p className="text-xs text-ink-soft truncate mt-0.5">{subjectName}</p>}
          <div className="flex items-center gap-2 mt-2 text-[11px] text-ink-soft">
            {classroom && <span className="badge badge-teacher !text-[10px]">{classroom}</span>}
            {period.room && <span>📍 {period.room}</span>}
          </div>
        </div>
      </Link>
    </Tilt3D>
  );
}

function QuickRow({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="card group flex items-center gap-3 p-3.5 transition-all duration-200 hover:border-amber-300 hover:-translate-y-0.5"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 text-xl shadow-soft group-hover:scale-110 transition-transform duration-300">
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

function Step({ n, title, desc, href }: { n: number; title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="group block">
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold shadow-soft transition-all duration-300 group-hover:scale-110 group-hover:shadow-lift"
               style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
            {n}
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-ink text-sm group-hover:text-gradient-gold transition-colors">{title}</p>
          <p className="text-xs text-ink-soft mt-0.5">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
