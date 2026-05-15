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
      <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>
      <p className="mt-1 text-sm text-ink-soft">ประวัติการเปลี่ยนแปลงข้อมูลสำคัญ (100 รายการล่าสุด)</p>

      <table className="table mt-6">
        <thead>
          <tr>
            <th className="">เวลา</th>
            <th className="">ผู้กระทำ</th>
            <th className="">Action</th>
            <th className="">Entity</th>
            <th className="">Before → After</th>
          </tr>
        </thead>
        <tbody>
          {items.map((l) => (
            <tr key={l.id} className="align-top">
              <td className=" text-xs">{new Date(l.createdAt).toLocaleString('th-TH')}</td>
              <td className="">{l.actor.fullName}</td>
              <td className=""><span className="badge-gold">{l.action}</span></td>
              <td className=" font-mono text-xs">{l.entityType}<br />{l.entityId.slice(0, 10)}…</td>
              <td className=" text-xs">
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
