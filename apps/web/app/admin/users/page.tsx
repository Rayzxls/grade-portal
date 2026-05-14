'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  student: { studentCode: string; major: string } | null;
  teacher: { staffCode: string; department: string } | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setUsers(await api.get<AdminUser[]>('/admin/users'));
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body: Record<string, unknown> = {
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      role,
    };
    if (role === 'STUDENT') {
      body.student = {
        studentCode: form.studentCode,
        major: form.major,
        faculty: form.faculty,
        enrollYear: Number(form.enrollYear),
      };
    } else if (role === 'TEACHER') {
      body.teacher = { staffCode: form.staffCode, department: form.department };
    }
    try {
      await api.post('/admin/users', body);
      setShow(false);
      setForm({});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">ผู้ใช้</h2>
        <button
          onClick={() => setShow((s) => !s)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
        >
          {show ? 'ยกเลิก' : '+ เพิ่มผู้ใช้'}
        </button>
      </div>

      {show && (
        <form onSubmit={submit} className="mt-6 grid grid-cols-2 gap-3 rounded-lg border bg-white p-5">
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
          <Field label="รหัสผ่าน (≥8)" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="password" />
          <Field label="ชื่อ-สกุล" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
          <div>
            <label className="block text-sm">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as never)} className="mt-1 w-full rounded-md border px-2 py-1.5">
              <option value="STUDENT">นักเรียน</option>
              <option value="TEACHER">อาจารย์</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {role === 'STUDENT' && (
            <>
              <Field label="รหัสนักศึกษา" value={form.studentCode} onChange={(v) => setForm({ ...form, studentCode: v })} />
              <Field label="ภาควิชา" value={form.major} onChange={(v) => setForm({ ...form, major: v })} />
              <Field label="คณะ" value={form.faculty} onChange={(v) => setForm({ ...form, faculty: v })} />
              <Field label="ปีที่เข้าศึกษา" value={form.enrollYear} onChange={(v) => setForm({ ...form, enrollYear: v })} type="number" />
            </>
          )}
          {role === 'TEACHER' && (
            <>
              <Field label="รหัสบุคลากร" value={form.staffCode} onChange={(v) => setForm({ ...form, staffCode: v })} />
              <Field label="ภาควิชา" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
            </>
          )}

          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          <button type="submit" className="col-span-2 rounded-md bg-slate-900 py-2 text-white">บันทึก</button>
        </form>
      )}

      <table className="mt-6 w-full rounded-lg border bg-white text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">ชื่อ</th>
            <th className="px-4 py-2">Role</th>
            <th className="px-4 py-2">รหัส</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="px-4 py-2">{u.email}</td>
              <td className="px-4 py-2">{u.fullName}</td>
              <td className="px-4 py-2"><Badge role={u.role} /></td>
              <td className="px-4 py-2 font-mono text-xs">
                {u.student?.studentCode ?? u.teacher?.staffCode ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value?: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm">{label}</label>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} required
        className="mt-1 w-full rounded-md border px-2 py-1.5" />
    </div>
  );
}

function Badge({ role }: { role: string }) {
  const cls = role === 'ADMIN' ? 'bg-red-100 text-red-700'
    : role === 'TEACHER' ? 'bg-blue-100 text-blue-700'
    : 'bg-green-100 text-green-700';
  return <span className={`rounded px-2 py-0.5 text-xs ${cls}`}>{role}</span>;
}
