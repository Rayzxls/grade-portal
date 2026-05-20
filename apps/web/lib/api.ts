const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new Error(
      `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ (${BASE_URL}) — โปรดตรวจสอบว่า API กำลังทำงาน`,
    );
  }

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userRole');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    let detail = '';
    try {
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      detail = data?.error?.message ?? data?.message ?? (text || res.statusText);
    } catch {
      detail = res.statusText;
    }
    throw new Error(`${res.status} ${detail}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : (null as any);
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE_URL}/api/v1/health`, { cache: 'no-store' });
    return r.ok;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
