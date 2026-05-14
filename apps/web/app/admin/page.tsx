'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function AdminHome() {
  const router = useRouter();
  const [stats, setStats] = useState({ users: 0, courses: 0, enrollments: 0, audit: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [users, courses, enrollments, audit] = await Promise.all([
          api.get<unknown[]>('/admin/users'),
          api.get<unknown[]>('/admin/courses'),
          api.get<unknown[]>('/admin/enrollments'),
          api.get<unknown[]>('/admin/audit-logs'),
        ]);
        setStats({
          users: users.length,
          courses: courses.length,
          enrollments: enrollments.length,
          audit: audit.length,
        });
      } catch (e) {
        if (e instanceof Error && e.message.includes('401')) router.push('/login');
      }
    })();
  }, [router]);

  return (
    <div>
      <h2 className="text-2xl font-bold">ภาพรวมระบบ</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="ผู้ใช้ทั้งหมด" value={stats.users} />
        <Stat label="รายวิชา" value={stats.courses} />
        <Stat label="การลงทะเบียน" value={stats.enrollments} />
        <Stat label="Audit Logs" value={stats.audit} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
