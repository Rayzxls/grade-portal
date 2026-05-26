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
  student: {
    studentCode: string;
    enrollYear: number;
    classroom: { gradeLevel: string; section: number; academicYear: number } | null;
  } | null;
  teacher: { staffCode: string; department: string } | null;
}

interface ClassroomOption {
  id: string;
  gradeLevel: string;
  section: number;
  academicYear: number;
}

interface StudentImportRow {
  studentCode: string;
  fullName: string;
  email?: string;
  enrollYear: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
  const [form, setForm] = useState<Record<string, string>>({});
  const [bulkClassroomId, setBulkClassroomId] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [u, c] = await Promise.all([
      api.get<AdminUser[]>('/admin/users'),
      api.get<ClassroomOption[]>('/admin/classrooms'),
    ]);
    setUsers(u);
    setClassrooms(c);
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
        enrollYear: Number(form.enrollYear),
        classroomId: form.classroomId || undefined,
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

  function parseStudents(text: string): StudentImportRow[] {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split(',').map((cell) => cell.trim()))
      .filter(([studentCode, fullName]) => studentCode && fullName && studentCode.toLowerCase() !== 'studentcode')
      .map(([studentCode, fullName, enrollYear, email]) => ({
        studentCode,
        fullName,
        enrollYear: Number(enrollYear) || new Date().getFullYear() + 543,
        email: email || undefined,
      }));
  }

  function onBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBulkText(String(reader.result ?? ''));
    reader.readAsText(file, 'utf-8');
  }

  async function submitBulk(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBulkFlash(null);
    const students = parseStudents(bulkText);
    if (!bulkClassroomId) {
      setError('กรุณาเลือกห้องเรียนก่อนนำเข้านักเรียน');
      return;
    }
    if (students.length === 0) {
      setError('ไม่พบข้อมูลนักเรียนที่ถูกต้องใน CSV');
      return;
    }
    setBulkBusy(true);
    try {
      const result = await api.post<{ total: number; created: number; skipped: { studentCode: string; reason: string }[] }>(
        '/admin/students/bulk',
        { classroomId: bulkClassroomId, students },
      );
      setBulkFlash(`นำเข้าสำเร็จ ${result.created}/${result.total} คน${result.skipped.length ? ` · ข้าม ${result.skipped.length} คน` : ''}`);
      setBulkText('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">ผู้ใช้</h2>
        <button
          onClick={() => setShow((s) => !s)}
          className="btn-primary btn-sm"
        >
          {show ? 'ยกเลิก' : '+ เพิ่มผู้ใช้'}
        </button>
      </div>

      {show && (
        <form onSubmit={submit} className="card mt-6 grid animate-slide-up grid-cols-2 gap-3 p-5">
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
          <Field label="รหัสผ่าน (≥8)" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="password" />
          <Field label="ชื่อ-สกุล" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
          <div>
            <label className="block text-sm">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as never)} className="input mt-1">
              <option value="STUDENT">นักเรียน</option>
              <option value="TEACHER">อาจารย์</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {role === 'STUDENT' && (
            <>
              <Field label="รหัสนักเรียน" value={form.studentCode} onChange={(v) => setForm({ ...form, studentCode: v })} />
              <Field label="ปีที่เข้าเรียน (พ.ศ.)" value={form.enrollYear} onChange={(v) => setForm({ ...form, enrollYear: v })} type="number" />
              <div className="col-span-2">
                <label className="block text-sm">ห้องเรียน (ไม่บังคับ)</label>
                <select value={form.classroomId ?? ''} onChange={(e) => setForm({ ...form, classroomId: e.target.value })} className="input mt-1">
                  <option value="">-- ยังไม่จัดห้อง --</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.gradeLevel}/{c.section} (ปีการศึกษา {c.academicYear})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {role === 'TEACHER' && (
            <>
              <Field label="รหัสบุคลากร" value={form.staffCode} onChange={(v) => setForm({ ...form, staffCode: v })} />
              <Field label="ภาควิชา" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
            </>
          )}

          {error && <p className="col-span-2 text-sm text-rose-600">{error}</p>}
          <button type="submit" className="btn-primary col-span-2">บันทึก</button>
        </form>
      )}

      <form onSubmit={submitBulk} className="card mt-6 animate-slide-up p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight">นำเข้านักเรียนจาก CSV</h3>
            <p className="mt-1 text-xs text-ink-soft">
              รูปแบบ: รหัสนักเรียน, ชื่อ-สกุล, ปีเข้าเรียน, อีเมล (อีเมลไม่บังคับ)
            </p>
          </div>
          <label className="btn-secondary btn-sm cursor-pointer">
            เลือกไฟล์ CSV
            <input type="file" accept=".csv,text/csv,.txt" onChange={onBulkUpload} className="hidden" />
          </label>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <select value={bulkClassroomId} onChange={(e) => setBulkClassroomId(e.target.value)} className="input">
            <option value="">-- เลือกห้องเรียนปลายทาง --</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.gradeLevel}/{c.section} (ปีการศึกษา {c.academicYear})
              </option>
            ))}
          </select>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="input min-h-32 lg:col-span-2"
            placeholder={'25680001,ด.ช.สมชาย ใจดี,2568\n25680002,ด.ญ.มาลี ดีมาก,2568,malee@school.ac.th'}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-ink-soft">
            พร้อมนำเข้า {parseStudents(bulkText).length} คน · ระบบจะสร้างบัญชีและผูกเข้าวิชาที่ห้องนี้เปิดไว้แล้ว
          </p>
          <button type="submit" disabled={bulkBusy} className="btn-accent btn-sm">
            {bulkBusy ? 'กำลังนำเข้า...' : 'นำเข้านักเรียน'}
          </button>
        </div>
        {bulkFlash && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{bulkFlash}</p>}
      </form>

      <table className="table mt-6">
        <thead>
          <tr>
            <th>Email</th>
            <th>ชื่อ</th>
            <th>Role</th>
            <th>รหัส</th>
            <th>ห้อง / ภาควิชา</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.fullName}</td>
              <td><Badge role={u.role} /></td>
              <td className="font-mono text-xs">
                {u.student?.studentCode ?? u.teacher?.staffCode ?? '-'}
              </td>
              <td className="text-xs">
                {u.student?.classroom
                  ? `${u.student.classroom.gradeLevel}/${u.student.classroom.section}`
                  : u.teacher?.department ?? '-'}
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
        className="input mt-1" />
    </div>
  );
}

function Badge({ role }: { role: string }) {
  const cls = role === 'ADMIN' ? 'badge-admin'
    : role === 'TEACHER' ? 'badge-teacher' : 'badge-student';
  return <span className={cls}>{role}</span>;
}
