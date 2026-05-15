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
        '/auth/login', parsed.data,
      );
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('userRole', res.user.role);
      const dest = res.user.role === 'STUDENT' ? '/dashboard'
        : res.user.role === 'TEACHER' ? '/teacher' : '/admin';
      router.push(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 animate-fade-in">
      <div className="card p-8">
        <div className="badge-gold mb-3">Grade Portal</div>
        <h1 className="text-2xl font-bold tracking-tight">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-sm text-ink-soft">กรุณากรอกอีเมลและรหัสผ่าน</p>

        {apiUp === false && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            ⚠ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ API ได้
            <button
              onClick={() => { setApiUp(null); checkApiHealth().then(setApiUp); }}
              className="ml-2 underline hover:no-underline"
            >ลองอีกครั้ง</button>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">อีเมล</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="input mt-1.5" required />
          </div>
          <div>
            <label className="block text-sm font-medium">รหัสผ่าน</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="input mt-1.5" required />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </main>
  );
}
