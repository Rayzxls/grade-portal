'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/teacher', label: 'ภาพรวม' },
  { href: '/teacher/classrooms', label: 'ห้องเรียนของฉัน' },
  { href: '/teacher/courses', label: 'วิชาเรียน' },
  { href: '/teacher/terms', label: 'ภาคเรียน' },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
    router.push('/login');
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="badge-teacher">ครู</span>
            <h1 className="font-semibold tracking-tight">Grade Portal</h1>
          </div>
          <button onClick={logout} className="btn-ghost btn-sm">ออกจากระบบ</button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 pb-2">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-all duration-150 ${
                  active ? 'bg-ink text-white shadow-soft' : 'text-ink-soft hover:bg-slate-100 hover:text-ink'
                }`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8 animate-fade-in">{children}</main>
    </div>
  );
}
