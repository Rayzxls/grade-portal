'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
  actor: { email: string; fullName: string };
}

export default function AuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  useEffect(() => { api.get<AuditLog[]>('/admin/audit-logs').then(setItems); }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold">Audit Log</h2>
      <p className="mt-1 text-sm text-slate-600">ประวัติการเปลี่ยนแปลงข้อมูลสำคัญ (100 รายการล่าสุด)</p>

      <table className="mt-6 w-full rounded-lg border bg-white text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="px-4 py-2">เวลา</th>
            <th className="px-4 py-2">ผู้กระทำ</th>
            <th className="px-4 py-2">Action</th>
            <th className="px-4 py-2">Entity</th>
            <th className="px-4 py-2">Before → After</th>
          </tr>
        </thead>
        <tbody>
          {items.map((l) => (
            <tr key={l.id} className="border-t align-top">
              <td className="px-4 py-2 text-xs">{new Date(l.createdAt).toLocaleString('th-TH')}</td>
              <td className="px-4 py-2">{l.actor.fullName}</td>
              <td className="px-4 py-2"><span className="rounded bg-amber-100 px-2 py-0.5 text-xs">{l.action}</span></td>
              <td className="px-4 py-2 font-mono text-xs">{l.entityType}<br />{l.entityId.slice(0, 10)}…</td>
              <td className="px-4 py-2 text-xs">
                {l.before ? <pre className="rounded bg-red-50 p-1">{JSON.stringify(l.before)}</pre> : null}
                {l.after ? <pre className="rounded bg-green-50 p-1">{JSON.stringify(l.after)}</pre> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
