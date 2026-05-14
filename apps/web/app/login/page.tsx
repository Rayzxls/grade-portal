'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginSchema } from '@grade/shared';
import { api, checkApiHealth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiUp, setApiUp] = useState<boolean | null>(null);

  // เช็คสถานะ API ตอนเปิดหน้า
  if (apiUp === null && typeof window !== 'undefined') {
    checkApiHealth().then(setApiUp);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; user: { role: string } }>(
        '/auth/login',
        parsed.data,
      );
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('userRole', res.user.role);
      const dest =
        res.user.role === 'STUDENT' ? '/dashboard'
        : res.user.role === 'TEACHER' ? '/teacher'
        : '/admin';
      router.push(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">เข้าสู่ระบบ</h1>
      <p className="mt-1 text-sm text-slate-600">กรุณากรอกอีเมลและรหัสผ่าน</p>

      {apiUp === false && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          ⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ API ได้ —
          ตรวจสอบว่ารัน <code className="rounded bg-red-100 px-1">pnpm --filter @grade/api dev</code> แล้ว
          <button
            onClick={() => { setApiUp(null); checkApiHealth().then(setApiUp); }}
            className="ml-2 underline"
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">อีเมล</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">รหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </main>
  );
}
