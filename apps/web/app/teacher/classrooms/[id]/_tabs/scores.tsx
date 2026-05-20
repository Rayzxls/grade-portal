'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Subject { courseId: string; code: string; name: string; totalStudents: number; graded: number }
interface Column { id: string; name: string; maxScore: number; order: number }
interface Cell { columnId: string; value: number | null }
interface Row { studentId: string; studentCode: string; studentName: string; cells: Cell[] }
interface Sheet { id: string; finalizedAt: string | null; columns: Column[]; rows: Row[]; maxTotal: number }

const DEFAULT_TEMPLATE = [
  { name: 'สอบกลางภาค', maxScore: 30 },
  { name: 'สอบปลายภาค', maxScore: 30 },
  { name: 'งาน/รายงาน', maxScore: 20 },
  { name: 'จิตพิสัย', maxScore: 10 },
  { name: 'สอบย่อย', maxScore: 10 },
];

function scoreToLetterLocal(p: number): string {
  if (p >= 80) return 'A';
  if (p >= 75) return 'B+';
  if (p >= 70) return 'B';
  if (p >= 65) return 'C+';
  if (p >= 60) return 'C';
  if (p >= 55) return 'D+';
  if (p >= 50) return 'D';
  return 'F';
}

export function ScoresTab({ classroomId, termId }: { classroomId: string; termId: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courseId, setCourseId] = useState('');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({}); // key: `${columnId}:${studentId}`
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [tplCols, setTplCols] = useState(DEFAULT_TEMPLATE);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Subject[]>(`/teacher/classrooms/${classroomId}/subjects?termId=${termId}`).then(setSubjects);
    setCourseId(''); setSheet(null);
  }, [classroomId, termId]);

  async function loadSheet(cid: string) {
    if (!cid) { setSheet(null); return; }
    const s = await api.get<Sheet | null>(`/teacher/classrooms/${classroomId}/sheet?courseId=${cid}&termId=${termId}`);
    setSheet(s);
    setDirty(new Set());
    if (s) {
      const d: Record<string, string> = {};
      for (const r of s.rows) for (const c of r.cells) {
        d[`${c.columnId}:${r.studentId}`] = c.value === null ? '' : String(c.value);
      }
      setDraft(d);
    }
  }

  useEffect(() => { loadSheet(courseId); /* eslint-disable-next-line */ }, [courseId]);

  async function createSheet() {
    setError(null); setBusy(true);
    try {
      await api.post(`/teacher/classrooms/${classroomId}/sheet`, { courseId, termId, columns: tplCols });
      setFlash('สร้างสมุดคะแนนเรียบร้อย');
      await loadSheet(courseId);
      setTimeout(() => setFlash(null), 2000);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
    finally { setBusy(false); }
  }

  function setCell(columnId: string, studentId: string, value: string) {
    const k = `${columnId}:${studentId}`;
    setDraft((d) => ({ ...d, [k]: value }));
    setDirty((s) => new Set(s).add(k));
  }

  function rowTotal(row: Row) {
    if (!sheet) return { sum: 0, pct: 0, letter: '—', filled: false };
    let sum = 0; let any = false;
    for (const c of sheet.columns) {
      const v = draft[`${c.id}:${row.studentId}`];
      if (v !== undefined && v !== '') {
        const n = Number(v);
        if (!Number.isNaN(n)) { sum += n; any = true; }
      }
    }
    const pct = sheet.maxTotal > 0 ? (sum / sheet.maxTotal) * 100 : 0;
    return { sum: Math.round(sum * 100) / 100, pct: Math.round(pct * 100) / 100, letter: any ? scoreToLetterLocal(pct) : '—', filled: any };
  }

  async function saveAll() {
    if (!sheet || dirty.size === 0) return;
    setError(null); setFlash(null); setBusy(true);
    try {
      const cells = Array.from(dirty).map((k) => {
        const [columnId, studentId] = k.split(':');
        const v = draft[k];
        if (v === undefined || v === '') return { columnId, studentId, value: null };
        const n = Number(v);
        if (Number.isNaN(n)) throw new Error(`ค่าไม่ใช่ตัวเลข (${k})`);
        return { columnId, studentId, value: n };
      });
      const r = await api.post<{ saved: number; cleared: number }>(`/teacher/sheets/${sheet.id}/cells`, { cells });
      setFlash(`บันทึกแล้ว · ${r.saved} ช่อง${r.cleared ? ` · ล้าง ${r.cleared}` : ''}`);
      setDirty(new Set());
      setTimeout(() => setFlash(null), 2000);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
    finally { setBusy(false); }
  }

  async function addColumn() {
    if (!sheet) return;
    const name = prompt('ชื่อช่องคะแนน', 'สอบย่อย');
    if (!name) return;
    const maxStr = prompt('คะแนนเต็ม', '10');
    const max = Number(maxStr);
    if (!max || Number.isNaN(max)) return;
    try {
      await api.post(`/teacher/sheets/${sheet.id}/columns`, { name, maxScore: max });
      await loadSheet(courseId);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }
  async function deleteColumn(colId: string, name: string) {
    if (!sheet) return;
    if (!confirm(`ลบช่อง "${name}"? คะแนนในช่องนี้จะถูกลบด้วย`)) return;
    try {
      await api.delete(`/teacher/sheets/${sheet.id}/columns/${colId}`);
      await loadSheet(courseId);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }
  async function editColumn(col: Column) {
    if (!sheet) return;
    const newName = prompt('ชื่อช่อง', col.name);
    if (newName === null) return;
    const maxStr = prompt('คะแนนเต็ม', String(col.maxScore));
    if (maxStr === null) return;
    const maxScore = Number(maxStr);
    if (!maxScore || Number.isNaN(maxScore)) { setError('คะแนนเต็มไม่ถูกต้อง'); return; }
    if (newName === col.name && maxScore === col.maxScore) return;
    try {
      await api.patch(`/teacher/sheets/${sheet.id}/columns/${col.id}`, {
        name: newName, maxScore,
      });
      await loadSheet(courseId);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }

  async function finalize() {
    if (!sheet) return;
    if (!confirm(`ปิดเล่ม → คำนวณเกรดของนักเรียนทุกคน?\n\nหลังปิดเล่ม สมุดจะถูกล็อค ต้องเปิดเล่มใหม่ถึงจะแก้ได้`)) return;
    setBusy(true);
    try {
      const r = await api.post<{ graded: number; maxTotal: number }>(`/teacher/sheets/${sheet.id}/finalize`, {});
      setFlash(`ปิดเล่ม · ออกเกรดให้ ${r.graded} คน (คะแนนเต็ม ${r.maxTotal})`);
      await loadSheet(courseId);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
    finally { setBusy(false); }
  }
  async function reopen() {
    if (!sheet) return;
    if (!confirm('เปิดเล่มใหม่? เกรดที่ออกแล้วยังอยู่ แต่จะถูกคำนวณใหม่เมื่อปิดเล่มอีกครั้ง')) return;
    try {
      await api.post(`/teacher/sheets/${sheet.id}/reopen`, {});
      await loadSheet(courseId);
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }

  const selectedSubject = subjects.find((s) => s.courseId === courseId);
  const locked = !!sheet?.finalizedAt;

  return (
    <>
      {/* Dynamic CSS animations */}
      <style>{`
        @keyframes pulse-amber {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(184, 134, 11, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(184, 134, 11, 0);
          }
        }
        .animate-pulse-amber {
          animation: pulse-amber 2s infinite;
        }
      `}</style>

      {flash && <div className="mb-4 animate-fade-in rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 flex items-center gap-1.5 shadow-sm"><span className="text-emerald-500">✓</span> {flash}</div>}
      {error && <div className="mb-4 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 flex items-center gap-1.5 shadow-sm"><span className="text-rose-500">✕</span> {error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-slate-900">สมุดเก็บคะแนน</h3>
          <p className="mt-1 text-xs text-ink-soft">เลือกวิชา → กรอกคะแนนทุกช่องเก็บคะแนน → ปิดเล่มเพื่อออกเกรด</p>
        </div>
        <div className="relative">
          <select 
            value={courseId} 
            onChange={(e) => setCourseId(e.target.value)} 
            className="input w-80 pr-10 font-medium border-slate-300 hover:border-amber-500/50 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl"
            style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/></svg>")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
          >
            <option value="">-- เลือกวิชาเพื่อเปิดสมุดคะแนน --</option>
            {subjects.map((s) => <option key={s.courseId} value={s.courseId}>{s.code} · {s.name}</option>)}
          </select>
        </div>
      </div>

      {!courseId && (
        <div className="card mt-6 p-12 text-center border-dashed border-2 border-slate-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mx-auto text-slate-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <p className="mt-3 text-slate-500 font-medium text-sm">
            {subjects.length === 0 ? 'ยังไม่มีวิชาในเทอมนี้ — เพิ่มที่แท็บ "รายวิชา" ก่อน' : 'เลือกวิชาด้านบนเพื่อเปิดตารางสมุดบันทึกคะแนน'}
          </p>
        </div>
      )}

      {/* No sheet yet → show template builder */}
      {courseId && !sheet && (
        <div className="card mt-6 animate-slide-up p-6 border border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800 border border-amber-100">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </div>
            <div>
              <h4 className="font-bold tracking-tight text-slate-900 text-lg">สร้างสมุดคะแนนสำหรับวิชา {selectedSubject?.code}</h4>
              <p className="text-xs text-ink-soft">กำหนดช่องเก็บคะแนนย่อย ระบบจะนำผลรวมมาคำนวณสัดส่วนเกรดให้โดยอัตโนมัติ</p>
            </div>
          </div>

          <div className="mt-6 space-y-2 max-w-2xl">
            {tplCols.map((c, i) => (
              <div key={i} className="flex items-center gap-3 animate-slide-up">
                <span className="text-xs font-bold text-slate-400 bg-slate-100 h-6 w-6 rounded-full flex items-center justify-center">{i + 1}</span>
                <input value={c.name} onChange={(e) => setTplCols((ts) => ts.map((t, idx) => idx === i ? { ...t, name: e.target.value } : t))} className="input flex-1 rounded-xl" placeholder="ชื่อช่องคะแนน เช่น สอบกลางภาค" />
                <input type="number" min={1} value={c.maxScore} onChange={(e) => setTplCols((ts) => ts.map((t, idx) => idx === i ? { ...t, maxScore: Number(e.target.value) } : t))} className="input w-28 rounded-xl text-center" placeholder="คะแนนเต็ม" />
                <button onClick={() => setTplCols((ts) => ts.filter((_, idx) => idx !== i))} className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors">✕</button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 max-w-2xl">
            <button onClick={() => setTplCols((ts) => [...ts, { name: 'ช่องใหม่', maxScore: 10 }])} className="btn-ghost btn-sm border border-slate-200 rounded-lg flex items-center gap-1">+ เพิ่มช่องเก็บคะแนน</button>
            <div className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200/60 px-3 py-1 rounded-full">
              คะแนนรวมทั้งหมด: <span className="text-amber-800 font-bold">{tplCols.reduce((s, c) => s + c.maxScore, 0)}</span> คะแนน
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button onClick={() => setTplCols(DEFAULT_TEMPLATE)} className="btn-secondary btn-sm rounded-lg">↻ โหลดค่าเริ่มต้น</button>
            <button onClick={createSheet} disabled={busy || tplCols.length === 0} className="btn-accent btn-sm rounded-lg font-semibold">
              {busy ? 'กำลังสร้าง...' : 'สร้างสมุดคะแนน'}
            </button>
          </div>
        </div>
      )}

      {/* Sheet exists → spreadsheet */}
      {sheet && sheet.columns && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border border-b-0 border-slate-200 bg-slate-50/90 backdrop-blur-sm p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
              <span className="font-semibold text-slate-800 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
                คะแนนรวมหลัก: <b className="text-amber-800 font-bold">{sheet.maxTotal}</b> คะแนน
              </span>
              
              {locked ? (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-100/90 text-emerald-800 px-3 py-1 text-xs font-semibold shadow-sm border border-emerald-200/50">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  ปิดเล่มแล้ว (เกรดออกแล้ว)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-100/95 text-amber-900 px-3 py-1 text-xs font-semibold shadow-sm border border-amber-200/50">
                  <svg className="h-3.5 w-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                  กำลังเปิดให้กรอกคะแนน
                </span>
              )}
              
              {dirty.size > 0 && !locked && (
                <span className="flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 px-3 py-1 text-xs font-semibold border border-rose-200 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-rose-600"></span> 
                  ยังไม่ได้บันทึก {dirty.size} ช่อง
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {!locked && (
                <button onClick={addColumn} className="btn-ghost btn-sm border border-slate-200 hover:bg-slate-100/60 rounded-lg flex items-center gap-1">
                  + ช่องคะแนน
                </button>
              )}
              {!locked && (
                <button 
                  onClick={saveAll} 
                  disabled={busy || dirty.size === 0} 
                  className={`btn-secondary btn-sm rounded-lg flex items-center gap-1 transition-all duration-300
                    ${dirty.size > 0 ? 'bg-amber-600 border-transparent hover:bg-amber-700 text-white font-semibold animate-pulse-amber' : ''}`}
                >
                  💾 บันทึกคะแนน
                </button>
              )}
              {!locked && (
                <button onClick={finalize} disabled={busy} className="btn-primary btn-sm rounded-lg flex items-center gap-1 font-semibold text-white">
                  🔒 ปิดเล่ม → คำนวณเกรด
                </button>
              )}
              {locked && (
                <button onClick={reopen} className="btn-secondary btn-sm rounded-lg font-semibold flex items-center gap-1">
                  🔓 เปิดเล่มใหม่
                </button>
              )}
              {!locked && (
                <button
                  onClick={async () => {
                    if (!confirm('ลบสมุดคะแนนเล่มนี้ทั้งหมด?\nคะแนนที่กรอกทั้งหมดจะหายไป (เกรดที่ออกแล้วยังอยู่)')) return;
                    try {
                      await api.delete(`/teacher/sheets/${sheet.id}`);
                      setFlash('ลบสมุดคะแนนแล้ว');
                      await loadSheet(courseId);
                    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
                  }}
                  className="btn-ghost btn-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200/30 rounded-lg flex items-center gap-1"
                >
                  🗑 ลบสมุด
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-b-2xl border border-slate-200 bg-white shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-slate-100 z-30 border-r border-slate-200 font-semibold text-slate-700">รหัส</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">ชื่อ</th>
                  {sheet.columns.map((c) => (
                    <th key={c.id} className="px-3 py-2 text-center border-l border-slate-200/60 min-w-32 bg-slate-50/50">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => editColumn(c)} disabled={locked} className="hover:text-amber-800 transition-colors font-semibold text-slate-700 disabled:cursor-not-allowed" title="คลิกเพื่อแก้ชื่อ/คะแนนเต็ม">
                          {c.name}
                        </button>
                        {!locked && (
                          <button onClick={() => deleteColumn(c.id, c.name)} className="text-rose-400 hover:text-rose-600 transition-colors text-[10px]" title="ลบช่องคะแนน">✕</button>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">/ {c.maxScore}</div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center bg-slate-100/90 border-l border-slate-200 font-semibold text-slate-700">รวม</th>
                  <th className="px-4 py-3 text-center bg-slate-100/90 font-semibold text-slate-700">%</th>
                  <th className="px-4 py-3 text-center bg-slate-100/90 font-semibold text-slate-700">เกรด</th>
                </tr>
              </thead>
              <tbody>
                {sheet.rows.length === 0 ? (
                  <tr><td colSpan={sheet.columns.length + 5} className="py-8 text-center text-slate-400 bg-white font-medium">ไม่มีนักเรียนในห้องเรียนที่ลงทะเบียนเรียนวิชานี้</td></tr>
                ) : sheet.rows.map((r) => {
                  const tot = rowTotal(r);
                  return (
                    <tr key={r.studentId} className="border-t border-slate-100 hover:bg-slate-50/40 transition-colors duration-150">
                      <td className="px-4 py-2.5 font-mono text-xs sticky left-0 bg-white z-20 border-r border-slate-100 font-medium text-slate-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{r.studentCode}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{r.studentName}</td>
                      {sheet.columns.map((c) => {
                        const k = `${c.id}:${r.studentId}`;
                        const v = draft[k] ?? '';
                        const isDirty = dirty.has(k);
                        return (
                          <td key={c.id} className={`px-2 py-1.5 text-center transition-colors duration-150 ${isDirty ? 'bg-amber-50/60' : ''}`}>
                            <input
                              type="number" min={0} max={c.maxScore} step="0.5"
                              value={v}
                              disabled={locked}
                              onChange={(e) => setCell(c.id, r.studentId, e.target.value)}
                              className="w-20 text-center text-sm px-2 py-1 bg-transparent hover:bg-slate-100/50 focus:bg-white rounded border border-transparent hover:border-amber-500/30 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-medium text-slate-800 transition-all outline-none duration-150 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              placeholder={`/${c.maxScore}`}
                            />
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-center font-semibold text-slate-800 bg-amber-50/15 font-mono border-l border-slate-100">{tot.filled ? tot.sum : '—'}</td>
                      <td className="px-4 py-2.5 text-center text-xs text-slate-500 font-mono bg-slate-50/30">{tot.filled ? `${tot.pct}%` : '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        {tot.filled ? (
                          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold shadow-sm border
                            ${tot.letter === 'A' ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60 font-extrabold shadow-emerald-100/50' : 
                              tot.letter.startsWith('B') ? 'bg-blue-50 text-blue-800 border-blue-200/60 shadow-blue-100/50' :
                              tot.letter.startsWith('C') ? 'bg-indigo-50 text-indigo-800 border-indigo-200/60 shadow-indigo-100/50' :
                              tot.letter.startsWith('D') ? 'bg-amber-50 text-amber-800 border-amber-200/60 shadow-amber-100/50' :
                              'bg-rose-50 text-rose-800 border-rose-200/60 shadow-rose-100/50'}`}>
                            {tot.letter}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
