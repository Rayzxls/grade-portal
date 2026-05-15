'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function AdminHome() {
  const router = useRouter();
  const [stats, setStats] = useState({ users: 0, classrooms: 0, courses: 0, enrollments: 0, audit: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [users, classrooms, courses, enrollments, audit] = await Promise.all([
          api.get<unknown[]>('/admin/users'),
          api.get<unknown[]>('/admin/classrooms'),
          api.get<unknown[]>('/admin/courses'),
          api.get<unknown[]>('/admin/enrollments'),
          api.get<unknown[]>('/admin/audit-logs'),
        ]);
        setStats({
          users: users.length, classrooms: classrooms.length, courses: courses.length,
          enrollments: enrollments.length, audit: audit.length,
        });
      } catch (e) {
        if (e instanceof Error && e.message.includes('401')) router.push('/login');
      }
    })();
  }, [router]);

  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight">ภาพรวมระบบ</h2>
      <p className="mt-1 text-sm text-ink-soft">สรุปจำนวนข้อมูลในระบบ</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Stat label="ผู้ใช้" value={stats.users} gold />
        <Stat label="ห้องเรียน" value={stats.classrooms} />
        <Stat label="รายวิชา" value={stats.courses} />
        <Stat label="การลงทะเบียน" value={stats.enrollments} />
        <Stat label="Audit Logs" value={stats.audit} />
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
