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
  async function editColumnName(col: Column) {
    if (!sheet) return;
    const newName = prompt('ชื่อใหม่', col.name);
    if (!newName || newName === col.name) return;
    try {
      await api.put(`/teacher/sheets/${sheet.id}/columns/${col.id}`, { name: newName });
    } catch {
      // try PATCH (we use PATCH on backend)
    }
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/teacher/sheets/${sheet.id}/columns/${col.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ name: newName }),
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
      {flash && <div className="mb-4 animate-fade-in rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{flash}</div>}
      {error && <div className="mb-4 animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">สมุดเก็บคะแนน</h3>
          <p className="mt-1 text-xs text-ink-soft">เลือกวิชา → กรอกคะแนนทุกช่องเก็บคะแนน → ปิดเล่มเพื่อออกเกรด</p>
        </div>
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="input w-72">
          <option value="">-- เลือกวิชา --</option>
          {subjects.map((s) => <option key={s.courseId} value={s.courseId}>{s.code} · {s.name}</option>)}
        </select>
      </div>

      {!courseId && (
        <div className="card mt-6 p-12 text-center">
          <p className="text-ink-soft">{subjects.length === 0 ? 'ยังไม่มีวิชาในเทอมนี้ — เพิ่มที่แท็บ "รายวิชา" ก่อน' : 'เลือกวิชาด้านบนเพื่อเริ่ม'}</p>
        </div>
      )}

      {/* No sheet yet → show template builder */}
      {courseId && !sheet && (
        <div className="card mt-6 animate-slide-up p-6">
          <h4 className="font-semibold tracking-tight">สร้างสมุดคะแนนสำหรับ {selectedSubject?.code}</h4>
          <p className="mt-1 text-sm text-ink-soft">กำหนดช่องเก็บคะแนน (รวมเป็นคะแนนเต็มเท่าไรก็ได้ — ระบบจะคำนวณเปอร์เซ็นต์)</p>

          <div className="mt-4 space-y-2">
            {tplCols.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={c.name} onChange={(e) => setTplCols((ts) => ts.map((t, idx) => idx === i ? { ...t, name: e.target.value } : t))} className="input flex-1" placeholder="ชื่อช่อง" />
                <input type="number" min={1} value={c.maxScore} onChange={(e) => setTplCols((ts) => ts.map((t, idx) => idx === i ? { ...t, maxScore: Number(e.target.value) } : t))} className="input w-24" placeholder="คะแนนเต็ม" />
                <button onClick={() => setTplCols((ts) => ts.filter((_, idx) => idx !== i))} className="text-rose-600 hover:text-rose-700">✕</button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button onClick={() => setTplCols((ts) => [...ts, { name: 'ช่องใหม่', maxScore: 10 }])} className="btn-ghost btn-sm">+ เพิ่มช่อง</button>
            <div className="text-sm text-ink-soft">รวมคะแนนเต็ม: <b className="text-ink">{tplCols.reduce((s, c) => s + c.maxScore, 0)}</b></div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setTplCols(DEFAULT_TEMPLATE)} className="btn-secondary btn-sm">↻ เริ่มจาก Template</button>
            <button onClick={createSheet} disabled={busy || tplCols.length === 0} className="btn-primary">
              {busy ? 'กำลังสร้าง...' : 'สร้างสมุดคะแนน'}
            </button>
          </div>
        </div>
      )}

      {/* Sheet exists → spreadsheet */}
      {sheet && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50/80 px-4 py-2">
            <div className="text-sm">
              คะแนนเต็มรวม <b className="text-ink">{sheet.maxTotal}</b>
              {locked ? (
                <span className="ml-3 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">🔒 ปิดเล่มแล้ว</span>
              ) : (
                <span className="ml-3 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">เปิดอยู่</span>
              )}
              {dirty.size > 0 && !locked && (
                <span className="ml-2 rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700">มี {dirty.size} ช่องยังไม่บันทึก</span>
              )}
            </div>
            <div className="flex gap-2">
              {!locked && <button onClick={addColumn} className="btn-ghost btn-sm">+ ช่อง</button>}
              {!locked && <button onClick={saveAll} disabled={busy || dirty.size === 0} className="btn-secondary btn-sm">💾 บันทึก</button>}
              {!locked && <button onClick={finalize} disabled={busy} className="btn-accent btn-sm">🔒 ปิดเล่ม → ออกเกรด</button>}
              {locked && <button onClick={reopen} className="btn-secondary btn-sm">เปิดเล่มใหม่</button>}
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
                  className="btn-ghost btn-sm text-rose-600 hover:text-rose-700"
                >🗑 ลบสมุด</button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-b-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 text-left text-xs uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-3 py-2 sticky left-0 bg-slate-50/50">รหัส</th>
                  <th className="px-3 py-2">ชื่อ</th>
                  {sheet.columns.map((c) => (
                    <th key={c.id} className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => editColumnName(c)} disabled={locked} className="hover:text-ink disabled:cursor-not-allowed">
                          {c.name}
                        </button>
                        {!locked && (
                          <button onClick={() => deleteColumn(c.id, c.name)} className="text-rose-400 hover:text-rose-600 text-[10px]">✕</button>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-ink-soft">/ {c.maxScore}</div>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center bg-slate-100">รวม</th>
                  <th className="px-3 py-2 text-center">%</th>
                  <th className="px-3 py-2 text-center">เกรด</th>
                </tr>
              </thead>
              <tbody>
                {sheet.rows.length === 0 ? (
                  <tr><td colSpan={sheet.columns.length + 5} className="py-8 text-center text-ink-soft">ไม่มีนักเรียนในวิชานี้</td></tr>
                ) : sheet.rows.map((r) => {
                  const tot = rowTotal(r);
                  return (
                    <tr key={r.studentId} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-3 py-1.5 font-mono text-xs sticky left-0 bg-white">{r.studentCode}</td>
                      <td className="px-3 py-1.5">{r.studentName}</td>
                      {sheet.columns.map((c) => {
                        const k = `${c.id}:${r.studentId}`;
                        const v = draft[k] ?? '';
                        const isDirty = dirty.has(k);
                        return (
                          <td key={c.id} className={`px-2 py-1 text-center ${isDirty ? 'bg-amber-50/60' : ''}`}>
                            <input
                              type="number" min={0} max={c.maxScore} step="0.5"
                              value={v}
                              disabled={locked}
                              onChange={(e) => setCell(c.id, r.studentId, e.target.value)}
                              className="input w-16 text-center text-xs px-1 py-1"
                              placeholder={`/${c.maxScore}`}
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-1.5 text-center font-semibold bg-slate-50/60">{tot.filled ? tot.sum : '—'}</td>
                      <td className="px-3 py-1.5 text-center text-xs text-ink-soft">{tot.filled ? `${tot.pct}%` : '—'}</td>
                      <td className={`px-3 py-1.5 text-center font-bold ${tot.letter === 'A' ? 'text-emerald-700' : tot.letter === 'F' ? 'text-rose-600' : ''}`}>
                        {tot.letter}
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
