'use client';

/**
 * /admin/import — Bulk import จาก Excel/CSV/textarea
 * รองรับ 3 ประเภท: ครู / นักเรียน / ห้องเรียน
 * Flow: paste → preview → validate → commit → report
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const GRADE_LEVELS = ['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'] as const;

type Tab = 'teachers' | 'students' | 'classrooms';

interface ParsedRow { row: number; valid: boolean; error?: string; data: any }
interface ImportResult { total: number; created: number; skipped: { row: number; reason: string; data: any }[]; classroomsCreated?: number }

const TEMPLATES = {
  teachers: {
    headers: ['fullName', 'email', 'staffCode', 'department'],
    headersLabel: 'ชื่อ-สกุล\tอีเมล\tรหัสครู\tแผนก',
    example: [
      'อ.มาลี มานะ\tmalee@school.ac.th\tT-001\tคณิตศาสตร์',
      'อ.สมชาย เก่ง\tsomchai@school.ac.th\tT-002\tภาษาต่างประเทศ',
      'อ.วิทย์ ใจเย็น\twit@school.ac.th\tT-003\tวิทยาศาสตร์',
    ].join('\n'),
  },
  students: {
    headers: ['fullName', 'studentCode', 'gradeLevel', 'section', 'academicYear'],
    headersLabel: 'ชื่อ-สกุล\tรหัสนักเรียน\tชั้น\tห้อง\tปีการศึกษา',
    example: [
      'ด.ช. สมชาย ใจดี\t001\tม.3\t1\t2569',
      'ด.ญ. มาลี เรียนดี\t002\tม.3\t1\t2569',
      'ด.ช. วิทย์ ขยัน\t003\tม.3\t1\t2569',
      'ด.ญ. นภา ฉลาด\t004\tม.4\t2\t2569',
    ].join('\n'),
  },
  classrooms: {
    headers: ['gradeLevel', 'section', 'academicYear', 'homeroomTeacherEmail'],
    headersLabel: 'ชั้น\tห้อง\tปีการศึกษา\tอีเมลครูประจำชั้น',
    example: [
      'ม.3\t1\t2569\tmalee@school.ac.th',
      'ม.3\t2\t2569\tsomchai@school.ac.th',
      'ม.4\t1\t2569\twit@school.ac.th',
    ].join('\n'),
  },
};

export default function BulkImportPage() {
  const [tab, setTab] = useState<Tab>('students');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tpl = TEMPLATES[tab];

  // Parse text เป็น array
  const parsed = useMemo<ParsedRow[]>(() => {
    if (!text.trim()) return [];
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l);
    return lines.map((line, i) => {
      const cells = line.split('\t').map((c) => c.trim());
      if (cells.length < 1 || (cells.length === 1 && !cells[0])) {
        return { row: i + 1, valid: false, error: 'บรรทัดว่าง', data: null };
      }
      const data: any = {};
      tpl.headers.forEach((h, idx) => {
        const v = cells[idx];
        if (v == null || v === '') return;
        if (h === 'section' || h === 'academicYear' || h === 'enrollYear') {
          const n = Number(v);
          if (!Number.isFinite(n)) {
            data[h] = NaN;
            return;
          }
          data[h] = n;
        } else {
          data[h] = v;
        }
      });

      // Validate
      let error: string | undefined;
      if (tab === 'teachers') {
        if (!data.fullName) error = 'ขาดชื่อ';
        else if (!data.email || !data.email.includes('@')) error = 'อีเมลไม่ถูกต้อง';
        else if (!data.staffCode) error = 'ขาดรหัสครู';
      } else if (tab === 'students') {
        if (!data.fullName) error = 'ขาดชื่อ';
        else if (!data.studentCode) error = 'ขาดรหัสนักเรียน';
        else if (data.gradeLevel && !GRADE_LEVELS.includes(data.gradeLevel)) error = `ชั้นไม่ถูกต้อง (${data.gradeLevel})`;
        else if (data.section != null && (!Number.isFinite(data.section) || data.section < 1)) error = 'ห้องไม่ถูกต้อง';
      } else if (tab === 'classrooms') {
        if (!data.gradeLevel || !GRADE_LEVELS.includes(data.gradeLevel)) error = `ชั้นไม่ถูกต้อง`;
        else if (!Number.isFinite(data.section) || data.section < 1) error = 'ห้องไม่ถูกต้อง';
        else if (!Number.isFinite(data.academicYear)) error = 'ปีการศึกษาไม่ถูกต้อง';
      }
      return { row: i + 1, valid: !error, error, data };
    });
  }, [text, tab]);

  const valid = parsed.filter((p) => p.valid);
  const invalid = parsed.filter((p) => !p.valid);

  async function commit() {
    if (valid.length === 0) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await api.post<ImportResult>(`/admin/bulk/${tab}`, {
        [tab]: valid.map((v) => v.data),
      });
      setResult(r);
      if (r.created > 0) setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'นำเข้าไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  function loadExample() {
    setText(tpl.example);
    setResult(null);
    setError(null);
  }

  function downloadCsv() {
    const csv = [tpl.headers.join(','), ...tpl.example.replace(/\t/g, ',').split('\n')].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="badge-gold">Bulk Import</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">นำเข้าข้อมูลครั้งละมากๆ</h1>
        <p className="mt-1 text-sm text-ink-soft">วางจาก Excel/Google Sheets → preview → commit ทีเดียวจบ</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {(['students', 'teachers', 'classrooms'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setText(''); setResult(null); setError(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white shadow-soft text-ink' : 'text-ink-soft hover:text-ink'}`}
          >
            {t === 'students' && '🎓 นักเรียน'}
            {t === 'teachers' && '👨‍🏫 ครู'}
            {t === 'classrooms' && '🏫 ห้องเรียน'}
          </button>
        ))}
      </div>

      {/* Instructions card */}
      <div className="card p-5 bg-amber-50/40 border-amber-200">
        <h3 className="font-bold text-ink flex items-center gap-2">📋 รูปแบบข้อมูล</h3>
        <p className="text-sm text-ink-soft mt-1">
          คอลัมน์ (เว้น tab/comma คั่น): <code className="text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">{tpl.headersLabel.replace(/\t/g, ' | ')}</code>
        </p>
        {tab === 'students' && (
          <p className="text-xs text-amber-800 mt-2">
            <b>เคล็ดลับ:</b> ใส่ <code>ชั้น/ห้อง/ปี</code> → ระบบจะสร้าง/ผูกห้องเรียนให้อัตโนมัติ ·
            ถ้าไม่ใส่ → นักเรียนถูกสร้างแบบยังไม่จัดเข้าห้อง · email default = <code>รหัส@school.ac.th</code>
          </p>
        )}
        {tab === 'classrooms' && (
          <p className="text-xs text-amber-800 mt-2"><b>หมายเหตุ:</b> อีเมลครูประจำชั้นเป็น optional — ครูคนนั้นต้องสร้างก่อนแล้ว</p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={loadExample} className="btn-secondary btn-sm">📥 โหลดตัวอย่าง</button>
          <button onClick={downloadCsv} className="btn-secondary btn-sm">⬇️ ดาวน์โหลด CSV template</button>
        </div>
      </div>

      {/* Paste area */}
      <div>
        <label className="block text-xs font-semibold text-ink-soft mb-1.5">
          วางข้อมูลที่นี่ (Copy จาก Excel หรือ CSV)
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`วางจาก Excel ตรงนี้ — TAB คั่นคอลัมน์, Enter คั่นบรรทัด...\n\nตัวอย่าง:\n${tpl.example.split('\n')[0]}`}
          className="input font-mono text-xs leading-relaxed min-h-[200px] resize-y"
        />
      </div>

      {/* Preview */}
      {parsed.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200">
            <div className="text-sm">
              <span className="text-emerald-700 font-bold">{valid.length}</span> รายการพร้อมนำเข้า
              {invalid.length > 0 && <> · <span className="text-rose-700 font-bold">{invalid.length}</span> รายการมีปัญหา</>}
            </div>
            <button onClick={commit} disabled={busy || valid.length === 0} className="btn-primary btn-sm">
              {busy ? 'กำลังบันทึก...' : `📥 นำเข้า ${valid.length} รายการ`}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-ink-soft sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left w-12">#</th>
                  {tpl.headers.map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
                  <th className="px-3 py-2 text-left">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((p) => (
                  <tr key={p.row} className={`border-t border-slate-100 ${p.valid ? '' : 'bg-rose-50/40'}`}>
                    <td className="px-3 py-2 font-mono text-xs text-ink-soft">{p.row}</td>
                    {tpl.headers.map((h) => (
                      <td key={h} className="px-3 py-2 text-xs">
                        {p.data?.[h] != null && String(p.data[h]) !== 'NaN' ? String(p.data[h]) : <span className="text-ink-soft">-</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {p.valid
                        ? <span className="text-xs text-emerald-700">✓ ok</span>
                        : <span className="text-xs text-rose-700">✕ {p.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {/* Result */}
      {result && (
        <div className="card border-emerald-200 bg-emerald-50/60 p-5">
          <h3 className="font-bold text-emerald-800 text-lg">✓ นำเข้าเสร็จสิ้น</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <Mini label="ทั้งหมด" value={result.total} />
            <Mini label="สร้างใหม่" value={result.created} highlight />
            <Mini label="ข้าม" value={result.skipped.length} />
            {result.classroomsCreated != null && <Mini label="ห้องที่สร้างให้" value={result.classroomsCreated} />}
          </div>
          {result.skipped.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm font-semibold cursor-pointer text-emerald-800">รายการที่ข้าม ({result.skipped.length}) ▾</summary>
              <ul className="mt-2 text-xs text-ink-soft space-y-1 max-h-48 overflow-y-auto">
                {result.skipped.map((s, i) => (
                  <li key={i}><b className="text-rose-700">บรรทัด {s.row}:</b> {s.reason}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="mt-4 flex gap-2">
            {tab === 'students' && <Link href="/admin/students" className="btn-secondary btn-sm">ดูรายชื่อนักเรียน →</Link>}
            {tab === 'classrooms' && <Link href="/admin/classrooms" className="btn-secondary btn-sm">ดูห้องเรียน →</Link>}
            {tab === 'teachers' && <Link href="/admin/users" className="btn-secondary btn-sm">ดูผู้ใช้ →</Link>}
            <button onClick={() => { setResult(null); setText(''); }} className="btn-ghost btn-sm">นำเข้าอีกชุด</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-emerald-100 border border-emerald-300' : 'bg-white border border-slate-200'}`}>
      <p className="text-xs text-ink-soft">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${highlight ? 'text-emerald-700' : 'text-ink'}`}>{value}</p>
    </div>
  );
}
