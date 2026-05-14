'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Term { id: string; year: number; semester: string; startDate: string; endDate: string }

const SEM_LABEL: Record<string, string> = { FIRST: '1', SECOND: '2', SUMMER: 'S' };

export default function TermsPage() {
  const [items, setItems] = useState<Term[]>([]);
  const [form, setForm] = useState({ year: '2568', semester: 'FIRST', startDate: '', endDate: '' });
  const [error, setError] = useState<string | null>(null);

  async function load() { setItems(await api.get<Term[]>('/admin/terms')); }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/admin/terms', {
        year: Number(form.year),
        semester: form.semester,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      });
      setForm({ year: '2568', semester: 'FIRST', startDate: '', endDate: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold">ปีการศึกษา</h2>

      <form onSubmit={submit} className="mt-6 grid grid-cols-5 gap-2 rounded-lg border bg-white p-4">
        <input type="number" placeholder="ปี (พ.ศ.)" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required className="rounded-md border px-2 py-1.5 text-sm" />
        <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className="rounded-md border px-2 py-1.5 text-sm">
          <option value="FIRST">ภาค 1</option>
          <option value="SECOND">ภาค 2</option>
          <option value="SUMMER">ภาคฤดูร้อน</option>
        </select>
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required className="rounded-md border px-2 py-1.5 text-sm" />
        <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required className="rounded-md border px-2 py-1.5 text-sm" />
        <button type="submit" className="rounded-md bg-slate-900 px-3 text-sm text-white">+ เพิ่ม</button>
        {error && <p className="col-span-5 text-sm text-red-600">{error}</p>}
      </form>

      <table className="mt-6 w-full rounded-lg border bg-white text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="px-4 py-2">ปี</th>
            <th className="px-4 py-2">ภาค</th>
            <th className="px-4 py-2">วันเริ่ม</th>
            <th className="px-4 py-2">วันสิ้นสุด</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="px-4 py-2">{t.year}</td>
              <td className="px-4 py-2">{SEM_LABEL[t.semester]}</td>
              <td className="px-4 py-2">{new Date(t.startDate).toLocaleDateString('th-TH')}</td>
              <td className="px-4 py-2">{new Date(t.endDate).toLocaleDateString('th-TH')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
