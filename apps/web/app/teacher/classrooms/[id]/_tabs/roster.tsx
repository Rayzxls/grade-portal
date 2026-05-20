'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface Student {
  id: string;
  studentCode: string;
  user: {
    fullName: string;
    email: string;
  };
}

interface Classroom {
  id: string;
  gradeLevel: string;
  section: number;
  academicYear: number;
  _count: { students: number };
  students: Student[];
}

interface StudentRow {
  studentCode: string;
  fullName: string;
  enrollYear: number;
}

function getInitials(fullName: string): string {
  const clean = fullName.replace(/^(ด\.ช\.|ด\.ญ\.|นาย|น\.ส\.|นางสาว|นาง|เด็กชาย|เด็กหญิง)\s*/g, '').trim();
  if (!clean) return 'นร';
  return clean.substring(0, 2);
}

function getAvatarGradient(id: string): string {
  const colors = [
    'from-amber-400 to-amber-600 text-white',
    'from-yellow-400 to-yellow-600 text-slate-900',
    'from-orange-400 to-orange-600 text-white',
    'from-amber-500 to-amber-700 text-white',
    'from-yellow-500 to-yellow-700 text-white',
    'from-amber-350 to-yellow-500 text-amber-950',
  ];
  const idx = Math.abs(id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
  return colors[idx];
}

export function RosterTab({ classroom, onReload }: { classroom: Classroom; onReload: () => Promise<void> }) {
  const [rows, setRows] = useState<StudentRow[]>([{ studentCode: '', fullName: '', enrollYear: 2568 }]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(i: number, patch: Partial<StudentRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    const last = rows[rows.length - 1];
    setRows([...rows, { studentCode: '', fullName: '', enrollYear: last?.enrollYear ?? 2568 }]);
  }
  function removeRow(i: number) { setRows((rs) => rs.filter((_, idx) => idx !== i)); }

  function parseCsv(text: string) {
    const parsed: StudentRow[] = [];
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const [code, name, year] = t.split(',').map((s) => s.trim());
      if (!code || !name) continue;
      parsed.push({ studentCode: code, fullName: name, enrollYear: Number(year) || 2568 });
    }
    if (parsed.length === 0) { setError('ไม่พบข้อมูลที่ถูกต้องในไฟล์ CSV'); return; }
    setRows(parsed);
    setFlash(`โหลด ${parsed.length} แถวจาก CSV — กดบันทึกเพื่อยืนยัน`);
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
    if (valid.length === 0) { setError('ยังไม่มีข้อมูล'); return; }
    setError(null); setFlash(null); setBusy(true);
    try {
      const result = await api.post<{ created: number; total: number; skipped: { studentCode: string; reason: string }[] }>(
        '/teacher/students/bulk', { classroomId: classroom.id, students: valid });
      setRows([{ studentCode: '', fullName: '', enrollYear: 2568 }]);
      const skip = result.skipped.length > 0
        ? ` (ข้าม ${result.skipped.length}: ${result.skipped.map((s) => `${s.studentCode}=${s.reason}`).join(', ')})` : '';
      setFlash(`เพิ่ม ${result.created}/${result.total} คน${skip}`);
      await onReload();
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
    finally { setBusy(false); }
  }

  return (
    <>
      {flash && <div className="mb-4 animate-fade-in rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 flex items-center gap-1.5 shadow-sm"><span className="text-emerald-500">✓</span> {flash}</div>}
      {error && <div className="mb-4 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 flex items-center gap-1.5 shadow-sm"><span className="text-rose-500">✕</span> {error}</div>}

      <div className="flex items-center justify-between mt-6">
        <h3 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <span>ทำเนียบรายชื่อนักเรียน</span>
          <span className="badge badge-gold px-2.5 py-0.5 rounded-full text-xs font-semibold">{classroom.students.length} คน</span>
        </h3>
      </div>
      
      <div className="overflow-hidden border border-slate-200/80 rounded-2xl bg-white shadow-soft mt-3">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/70 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-3.5 font-semibold">รหัส</th>
              <th className="px-6 py-3.5 font-semibold">ชื่อ-สกุล</th>
              <th className="px-6 py-3.5 font-semibold">อีเมลติดต่อ</th>
              <th className="px-6 py-3.5 w-60 text-right font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {classroom.students.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 mx-auto text-slate-400 mb-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                  ยังไม่มีรายชื่อนักเรียนลงทะเบียนในห้องนี้ — กรอกรายชื่อใหม่ที่ฟอร์มด้านล่าง
                </td>
              </tr>
            ) : classroom.students.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                <td className="px-6 py-3.5">
                  <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full shadow-sm">
                    {s.studentCode}
                  </span>
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-[10px] shadow-sm uppercase ${getAvatarGradient(s.id)}`}>
                      {getInitials(s.user.fullName)}
                    </div>
                    <span className="font-semibold text-slate-800">{s.user.fullName}</span>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium font-mono">
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {s.user.email}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={async () => {
                        const fullName = prompt('ชื่อ-สกุล', s.user.fullName);
                        if (!fullName) return;
                        const studentCode = prompt('รหัสนักเรียน', s.studentCode);
                        if (!studentCode) return;
                        try {
                          await api.patch(`/teacher/students/${s.id}`, { fullName, studentCode });
                          await onReload();
                        } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
                      }}
                      className="btn-ghost btn-sm text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg flex items-center gap-0.5 font-medium border border-transparent hover:border-amber-200/50"
                    >
                      ✎ แก้ไข
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`ย้าย ${s.user.fullName} ออกจากห้อง?\n(ยังคงเป็นนักเรียนในระบบ)`)) return;
                        try {
                          await api.post(`/teacher/students/${s.id}/unassign`, {});
                          await onReload();
                        } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
                      }}
                      className="btn-ghost btn-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium border border-transparent hover:border-slate-200/60"
                    >
                      ย้ายออก
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`ลบ ${s.user.fullName} ออกจากระบบถาวร?\nคะแนน/เกรดทั้งหมดจะถูกลบด้วย`)) return;
                        try {
                          await api.delete(`/teacher/students/${s.id}`);
                          await onReload();
                        } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
                      }}
                      className="btn-ghost btn-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg font-medium border border-transparent hover:border-rose-200/50"
                    >
                      ลบ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CSV Dropzone Card */}
      <div className="mt-10 bg-white border border-slate-200 rounded-2xl p-6 shadow-soft hover:shadow-lift transition-all">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">อัปโหลดรายชื่อนักเรียนผ่าน CSV</h3>
            <p className="text-xs text-slate-500 mt-1">รูปแบบหัวไฟล์: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-amber-800">รหัส,ชื่อ,ปีเข้าเรียน</code> (เช่น <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">25680001,ด.ช.สมพงษ์ รักดี,2568</code>)</p>
          </div>
          <div>
            <label className="btn-secondary btn-sm cursor-pointer relative group overflow-hidden border-slate-300 hover:border-amber-500 text-slate-700 hover:text-amber-900 rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-1.5 font-medium transition-colors">
              <svg className="h-4 w-4 text-slate-400 group-hover:text-amber-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              อัปโหลดไฟล์ CSV (.csv, .txt)
              <input type="file" accept=".csv,text/csv,.txt" onChange={onUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-slate-950">เพิ่มรายชื่อนักเรียนใหม่</h3>
          <p className="text-xs text-slate-500 mt-0.5">ระบุรหัสนักเรียน และชื่อสำหรับการเข้าสู่ระบบ โดยค่าเริ่มต้นระบบจะสร้างอีเมลและรหัสผ่านเข้าใช้งานให้อัตโนมัติ</p>
        </div>
      </div>

      <div className="card mt-3 animate-slide-up p-5 border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="pb-2.5 font-semibold">รหัสนักเรียน</th>
              <th className="pb-2.5 font-semibold">ชื่อ-นามสกุลนักเรียน</th>
              <th className="pb-2.5 w-36 font-semibold">ปีการศึกษาที่เข้า</th>
              <th className="pb-2.5 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="animate-slide-up">
                <td className="py-1.5 pr-3">
                  <input 
                    value={r.studentCode} 
                    onChange={(e) => update(i, { studentCode: e.target.value })} 
                    placeholder="25680042" 
                    className="input rounded-xl border-slate-300 hover:border-slate-400 focus:border-amber-500 focus:ring-amber-500/20" 
                  />
                </td>
                <td className="py-1.5 pr-3">
                  <input 
                    value={r.fullName} 
                    onChange={(e) => update(i, { fullName: e.target.value })} 
                    placeholder="ด.ช.สมชาย ใจดี" 
                    className="input rounded-xl border-slate-300 hover:border-slate-400 focus:border-amber-500 focus:ring-amber-500/20" 
                  />
                </td>
                <td className="py-1.5 pr-3">
                  <input 
                    type="number" 
                    value={r.enrollYear} 
                    onChange={(e) => update(i, { enrollYear: Number(e.target.value) })} 
                    className="input rounded-xl border-slate-300 hover:border-slate-400 focus:border-amber-500 focus:ring-amber-500/20 text-center" 
                  />
                </td>
                <td className="py-1.5 text-center">
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(i)} className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors">
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <button onClick={addRow} className="btn-ghost btn-sm border border-slate-200 rounded-lg flex items-center gap-1">
            + เพิ่มอีก 1 แถว
          </button>
          <button onClick={submit} disabled={busy} className="btn-accent btn-sm rounded-lg font-semibold shadow-md active:scale-95 transition-all">
            {busy ? 'กำลังบันทึกข้อมูล...' : `บันทึกนักเรียนใหม่ ${rows.filter((r) => r.studentCode && r.fullName).length} คน`}
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-150 text-[11px] text-slate-500 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-amber-800 text-xs font-bold font-serif">!</span>
          <span><b>ข้อมูลระบบอัตโนมัติ:</b> อีเมลล็อกอินจะเป็น <code className="bg-white border px-1 py-0.5 rounded font-mono text-slate-600">[รหัส]@school.ac.th</code> และรหัสผ่านเข้าใช้ครั้งแรกคือ <code className="bg-white border px-1 py-0.5 rounded font-mono text-slate-600">password123</code></span>
        </div>
      </div>
    </>
  );
}
