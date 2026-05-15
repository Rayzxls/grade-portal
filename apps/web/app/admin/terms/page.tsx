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
      <h2 className="text-3xl font-bold tracking-tight">ปีการศึกษา</h2>
      <p className="mt-1 text-sm text-ink-soft">จัดการปีและภาคการศึกษา</p>

      <form onSubmit={submit} className="card mt-6 grid animate-slide-up grid-cols-5 gap-2 p-4">
        <input type="number" placeholder="ปี (พ.ศ.)" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required className="input" />
        <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className="input">
          <option value="FIRST">ภาค 1</option>
          <option value="SECOND">ภาค 2</option>
          <option value="SUMMER">ภาคฤดูร้อน</option>
        </select>
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required className="input" />
        <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required className="input" />
        <button type="submit" className="btn-primary btn-sm">+ เพิ่ม</button>
        {error && <p className="col-span-5 text-sm text-rose-600">{error}</p>}
      </form>

      <table className="table mt-6">
        <thead>
          <tr>
            <th >ปี</th>
            <th >ภาค</th>
            <th >วันเริ่ม</th>
            <th >วันสิ้นสุด</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} >
              <td >{t.year}</td>
              <td >{SEM_LABEL[t.semester]}</td>
              <td >{new Date(t.startDate).toLocaleDateString('th-TH')}</td>
              <td >{new Date(t.endDate).toLocaleDateString('th-TH')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
