'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  gradeLevel: string;
}

const GRADE_LEVELS = ['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'];

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create / Edit Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', credits: 3, gradeLevel: 'ม.4' });
  const [isFormOpen, setIsFormOpen] = useState(false);

  async function loadCourses() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Course[]>('/teacher/courses');
      setCourses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลรายวิชาได้');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  function handleOpenCreate() {
    setEditingId(null);
    setForm({ code: '', name: '', credits: 3, gradeLevel: 'ม.4' });
    setIsFormOpen(true);
    setError(null);
  }

  function handleOpenEdit(c: Course) {
    setEditingId(c.id);
    setForm({ code: c.code, name: c.name, credits: c.credits, gradeLevel: c.gradeLevel });
    setIsFormOpen(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        // Edit Course
        await api.patch(`/teacher/courses/${editingId}`, {
          code: form.code.trim(),
          name: form.name.trim(),
          credits: Number(form.credits),
          gradeLevel: form.gradeLevel,
        });
      } else {
        // Create Course
        await api.post('/teacher/courses', {
          code: form.code.trim(),
          name: form.name.trim(),
          credits: Number(form.credits),
          gradeLevel: form.gradeLevel,
        });
      }
      setIsFormOpen(false);
      setForm({ code: '', name: '', credits: 3, gradeLevel: 'ม.4' });
      setEditingId(null);
      await loadCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ดำเนินการไม่สำเร็จ');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายวิชานี้?')) return;
    setError(null);
    try {
      await api.delete(`/teacher/courses/${id}`);
      await loadCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถลบรายวิชาได้');
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">รายวิชาเรียน</h2>
          <p className="mt-1 text-sm text-ink-soft">
            จัดการและตั้งค่ารายวิชาเรียนที่คุณครูรับผิดชอบสอน
          </p>
        </div>
        {!isFormOpen && (
          <button onClick={handleOpenCreate} className="btn-primary">
            + สร้างวิชาใหม่
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
            {editingId ? '📝 แก้ไขข้อมูลรายวิชา' : '🎓 สร้างรายวิชาใหม่'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">รหัสวิชา</label>
              <input
                placeholder="เช่น MATH-M4-001"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
                className="input mt-1"
                disabled={!!editingId} // Code should be unique and read-only once created
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">ชื่อวิชา</label>
              <input
                placeholder="เช่น คณิตศาสตร์เพิ่มเติม"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="input mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">หน่วยกิต</label>
              <input
                type="number"
                min={0.5}
                max={6}
                step={0.5}
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
                required
                className="input mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">ระดับชั้น</label>
              <select
                value={form.gradeLevel}
                onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                className="input mt-1"
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
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
              {editingId ? 'บันทึกการเปลี่ยนแปลง' : 'ตกลงสร้างวิชา'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-10 text-center text-ink-soft">กำลังโหลดรายวิชา...</div>
      ) : courses.length === 0 ? (
        <div className="card p-10 text-center text-ink-soft">
          ยังไม่มีรายวิชาที่คุณครูสร้างไว้ คลิก "+ สร้างวิชาใหม่" เพื่อเริ่มต้นตั้งค่าวารสารวิชา
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <div key={c.id} className="card p-5 animate-slide-up hover:border-gold transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-ink-soft bg-slate-100 px-2 py-0.5 rounded">
                    {c.code}
                  </span>
                  <span className="badge-gold text-xs">
                    ชั้น {c.gradeLevel}
                  </span>
                </div>
                <h4 className="mt-3 text-lg font-bold tracking-tight text-ink truncate">
                  {c.name}
                </h4>
                <p className="mt-1 text-sm text-ink-soft">
                  หน่วยกิตสะสม: <b>{c.credits}</b> หน่วยกิต
                </p>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="btn-secondary btn-sm"
                >
                  ⚙️ แก้ไข
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="btn-ghost btn-sm text-rose-600 hover:bg-rose-50"
                >
                  🗑️ ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
