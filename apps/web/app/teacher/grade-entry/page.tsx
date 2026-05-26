'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /teacher/grade-entry → ย้ายไปเป็น /teacher/offerings (Phase 3 redesign)
export default function GradeEntryRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/teacher/offerings'); }, [router]);
  return <p className="text-ink-soft p-8 text-center animate-fade-in">กำลังย้ายไปหน้าใหม่...</p>;
}
