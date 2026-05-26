'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface StudentRow {
  id: string;
  studentCode: string;
  fullName: string;
  email: string;
  enrollYear: number;
  classroom: string | null;
  academicYear: number | null;
  gradeCount: number;
  enrollmentCount: number;
}
interface PageResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: StudentRow[];
}

export default function AdminStudentsPage() {
  const [data, setData] = useState<PageResult | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      const r = await api.get<PageResult>(`/admin/students?${params}`);
      setData(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, search]);

  function applySearch() {
    setPage(1);
    setSearch(searchInput);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <div className="badge-gold">นักเรียน</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">รายชื่อนักเรียนทั้งหมด</h1>
        <p className="mt-1 text-sm text-ink-soft">ค้นหา / กรอง / คลิกเพื่อดูเกรดของแต่ละคน</p>
      </div>

      {/* Search */}
      <div className="card p-4 flex gap-2">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          placeholder="ค้นหา ชื่อ / รหัสนักเรียน / email"
          className="input flex-1"
        />
        <button onClick={applySearch} className="btn-primary btn-sm">ค้นหา</button>
        {search && (
          <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }} className="btn-ghost btn-sm">ล้าง</button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-ink-soft">
            <tr>
              <th className="px-4 py-3 text-left">รหัส</th>
              <th className="px-4 py-3 text-left">ชื่อ-นามสกุล</th>
              <th className="px-4 py-3 text-left">ห้องเรียน</th>
              <th className="px-4 py-3 text-center">ปีเข้า</th>
              <th className="px-4 py-3 text-center">วิชาที่ลง</th>
              <th className="px-4 py-3 text-center">เกรด</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="py-8 text-center text-ink-soft">กำลังโหลด...</td></tr>
            )}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-ink-soft">ไม่พบนักเรียน</td></tr>
            )}
            {!loading && data?.items.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-mono text-xs">{s.studentCode}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{s.fullName}</p>
                  <p className="text-xs text-ink-soft">{s.email}</p>
                </td>
                <td className="px-4 py-3">
                  {s.classroom ? (
                    <span className="badge badge-teacher">{s.classroom}</span>
                  ) : <span className="text-ink-soft text-xs">— ยังไม่จัด —</span>}
                </td>
                <td className="px-4 py-3 text-center">{s.enrollYear}</td>
                <td className="px-4 py-3 text-center font-mono">{s.enrollmentCount}</td>
                <td className="px-4 py-3 text-center font-mono">{s.gradeCount}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/students/${s.id}`} className="btn-secondary btn-sm">ดูเกรด →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 bg-slate-50 border-t border-slate-200 text-sm">
            <span className="text-ink-soft">
              หน้า {data.page} / {data.totalPages} · ทั้งหมด {data.total} คน
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost btn-sm">← ก่อนหน้า</button>
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="btn-ghost btn-sm">ถัดไป →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
