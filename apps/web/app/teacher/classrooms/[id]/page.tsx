'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface MyClassroom {
  id: string;
  gradeLevel: string;
  section: number;
  academicYear: number;
  _count: { students: number };
  students: { id: string; studentCode: string; user: { fullName: string; email: string } }[];
}

type StudentRow = { studentCode: string; fullName: string; enrollYear: number };

export default function ClassroomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [classroom, setClassroom] = useState<MyClassroom | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([{ studentCode: '', fullName: '', enrollYear: 2568 }]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const all = await api.get<MyClassroom[]>('/teacher/classrooms');
    setClassroom(all.find((c) => c.id === id) ?? null);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  function update(i: number, patch: Partial<StudentRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    const last = rows[rows.length - 1];
    setRows([...rows, { studentCode: '', fullName: '', enrollYear: last?.enrollYear ?? 2568 }]);
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  function parseCsv(text: string) {
    // รูปแบบ: studentCode,fullName,enrollYear  (1 row ต่อ 1 บรรทัด)
    const parsed: StudentRow[] = [];
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [code, name, year] = trimmed.split(',').map((s) => s.trim());
      if (!code || !name) continue;
      parsed.push({
        studentCode: code,
        fullName: name,
        enrollYear: Number(year) || 2568,
      });
    }
    if (parsed.length === 0) {
      setError('ไม่พบข้อมูลที่ถูกต้องในไฟล์ CSV');
      return;
    }
    setRows(parsed);
    setFlash(`โหลด ${parsed.length} แถวจาก CSV เรียบร้อย — กดบันทึกเพื่อยืนยัน`);
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => parseCsv(String(reader.result ?? ''));
    reader.readAsText(file, 'utf-8');
  }

  async function submit() {
    const valid = rows.filter((r) => r.studentCode.trim() && r.fullName.trim());
    if (valid.length === 0) { setError('ยังไม่มีข้อมูลนักเรียน'); return; }

    setError(null); setFlash(null); setBusy(true);
    try {
      const result = await api.post<{ created: number; total: number; skipped: { studentCode: string; reason: string }[] }>(
        '/teacher/students/bulk',
        { classroomId: id, students: valid },
      );
      setRows([{ studentCode: '', fullName: '', enrollYear: 2568 }]);
      const skip = result.skipped.length > 0
        ? ` (ข้าม ${result.skipped.length}: ${result.skipped.map((s) => `${s.studentCode}=${s.reason}`).join(', ')})`
        : '';
      setFlash(`เพิ่ม ${result.created}/${result.total} คน${skip}`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
    finally { setBusy(false); }
  }

  if (!classroom) return <p className="text-ink-soft">กำลังโหลด...</p>;

  return (
    <div>
      <Link href="/teacher/classrooms" className="text-sm text-ink-soft hover:text-ink">← กลับไปห้องทั้งหมด</Link>
      <h2 className="mt-2 text-3xl font-bold tracking-tight">{classroom.gradeLevel}/{classroom.section}</h2>
      <p className="mt-1 text-sm text-ink-soft">ปีการศึกษา {classroom.academicYear} · {classroom._count.students} คน</p>

      {flash && <div className="mt-4 animate-fade-in rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{flash}</div>}
      {error && <div className="mt-4 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      {/* รายชื่อปัจจุบัน */}
      <h3 className="mt-8 text-lg font-semibold tracking-tight">รายชื่อนักเรียนในห้อง</h3>
      <table className="table mt-3">
        <thead>
          <tr>
            <th>รหัส</th>
            <th>ชื่อ-สกุล</th>
            <th>อีเมล</th>
          </tr>
        </thead>
        <tbody>
          {classroom.students.length === 0 ? (
            <tr><td colSpan={3} className="py-8 text-center text-ink-soft">ยังไม่มีนักเรียน</td></tr>
          ) : classroom.students.map((s) => (
            <tr key={s.id}>
              <td className="font-mono text-xs">{s.studentCode}</td>
              <td>{s.user.fullName}</td>
              <td className="text-ink-soft">{s.user.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* เพิ่มนักเรียน */}
      <div className="mt-10 flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">เพิ่มนักเรียน</h3>
        <label className="btn-secondary btn-sm cursor-pointer">
          📁 อัปโหลด CSV
          <input type="file" accept=".csv,text/csv,.txt" onChange={onUpload} className="hidden" />
        </label>
      </div>
      <p className="mt-1 text-xs text-ink-soft">รูปแบบ CSV: <code className="rounded bg-slate-100 px-1">studentCode,fullName,enrollYear</code> — 1 บรรทัด/คน</p>

      <div className="card mt-3 animate-slide-up p-4">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink-soft">
            <tr>
              <th className="pb-2">รหัสนักเรียน</th>
              <th className="pb-2">ชื่อ-สกุล</th>
              <th className="pb-2 w-32">ปีเข้าเรียน</th>
              <th className="pb-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <input value={r.studentCode} onChange={(e) => update(i, { studentCode: e.target.value })}
                    placeholder="25680042" className="input" />
                </td>
                <td className="py-1 pr-2">
                  <input value={r.fullName} onChange={(e) => update(i, { fullName: e.target.value })}
                    placeholder="ด.ช.สมชาย ใจดี" className="input" />
                </td>
                <td className="py-1 pr-2">
                  <input type="number" value={r.enrollYear} onChange={(e) => update(i, { enrollYear: Number(e.target.value) })}
                    className="input" />
                </td>
                <td className="py-1">
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(i)} className="text-rose-600 hover:text-rose-800">✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex justify-between gap-2">
          <button onClick={addRow} className="btn-ghost btn-sm">+ เพิ่มแถว</button>
          <button onClick={submit} disabled={busy} className="btn-accent">
            {busy ? 'กำลังบันทึก...' : `บันทึก ${rows.filter((r) => r.studentCode && r.fullName).length} คน`}
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          นักเรียนใหม่จะได้รับอีเมล <code className="rounded bg-slate-100 px-1">[รหัส]@school.ac.th</code> และรหัสผ่านเริ่มต้น <code className="rounded bg-slate-100 px-1">password123</code>
        </p>
      </div>
    </div>
  );
}
