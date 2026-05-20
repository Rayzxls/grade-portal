'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AcademicTerm {
  id: string;
  year: number;
  semester: 'FIRST' | 'SECOND' | 'SUMMER';
  startDate: string;
  endDate: string;
}

const SEMESTER_MAP = {
  FIRST: 'ภาคเรียนที่ 1',
  SECOND: 'ภาคเรียนที่ 2',
  SUMMER: 'ภาคเรียนฤดูร้อน (Summer)',
};

export default function TeacherTermsPage() {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({
    year: 2568,
    semester: 'FIRST' as 'FIRST' | 'SECOND' | 'SUMMER',
    startDate: '',
    endDate: '',
  });

  async function loadTerms() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AcademicTerm[]>('/teacher/terms');
      setTerms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลภาคเรียนได้');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTerms();
  }, []);

  function handleOpenCreate() {
    const today = new Date();
    const nextSixMonths = new Date();
    nextSixMonths.setMonth(today.getMonth() + 6);

    setForm({
      year: 2568,
      semester: 'FIRST',
      startDate: today.toISOString().split('T')[0],
      endDate: nextSixMonths.toISOString().split('T')[0],
    });
    setIsFormOpen(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      // Validate dates
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (start >= end) {
        throw new Error('วันเริ่มต้นภาคเรียนต้องมาก่อนวันสิ้นสุดภาคเรียน');
      }

      await api.post('/teacher/terms', {
        year: Number(form.year),
        semester: form.semester,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      setIsFormOpen(false);
      await loadTerms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถสร้างภาคเรียนได้');
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ปีการศึกษา / ภาคเรียน</h2>
          <p className="mt-1 text-sm text-ink-soft">
            ตั้งค่าและจัดการปีการศึกษาและเทอมสำหรับการลงทะเบียนเรียนและตัดเกรด
          </p>
        </div>
        {!isFormOpen && (
          <button onClick={handleOpenCreate} className="btn-primary">
            + กำหนดเทอมใหม่
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 animate-fade-in">
          {error}
        </div>
      )}

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="card p-6 animate-slide-up space-y-4 border-gold">
          <h3 className="text-lg font-semibold tracking-tight text-ink">
            📅 กำหนดภาคเรียนใหม่
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">ปีการศึกษา (พ.ศ.)</label>
              <input
                type="number"
                min={2500}
                max={2600}
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                required
                className="input mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">ภาคเรียน / เทอม</label>
              <select
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value as any })}
                className="input mt-1"
              >
                <option value="FIRST">ภาคเรียนที่ 1</option>
                <option value="SECOND">ภาคเรียนที่ 2</option>
                <option value="SUMMER">ภาคเรียนฤดูร้อน (Summer)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">วันเริ่มภาคเรียน</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
                className="input mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">วันสิ้นสุดภาคเรียน</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
                className="input mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="btn-ghost"
            >
              ยกเลิก
            </button>
            <button type="submit" className="btn-primary">
              บันทึกภาคเรียน
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-10 text-center text-ink-soft">กำลังโหลดข้อมูลภาคเรียน...</div>
      ) : terms.length === 0 ? (
        <div className="card p-10 text-center text-ink-soft">
          ยังไม่มีข้อมูลปีการศึกษาในระบบ คลิก "+ กำหนดเทอมใหม่" เพื่อสร้างภาคเรียนแรกของคุณครู
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {terms.map((t) => {
            const startStr = new Date(t.startDate).toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            const endStr = new Date(t.endDate).toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            return (
              <div
                key={t.id}
                className="card p-5 animate-slide-up hover:border-gold transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="badge-gold font-bold">
                      ปีการศึกษา {t.year}
                    </span>
                    <span className="text-xs text-ink-soft bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                      {SEMESTER_MAP[t.semester]}
                    </span>
                  </div>
                  <h4 className="mt-4 text-base font-medium text-ink">
                    ช่วงเวลาการเรียนการสอน
                  </h4>
                  <div className="mt-2 space-y-1 text-sm text-ink-soft">
                    <p className="flex justify-between">
                      <span>เริ่มต้น:</span>
                      <span className="font-semibold text-ink">{startStr}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>สิ้นสุด:</span>
                      <span className="font-semibold text-ink">{endStr}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
