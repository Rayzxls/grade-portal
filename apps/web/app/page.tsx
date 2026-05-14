import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">ระบบตรวจผลการเรียน</h1>
      <p className="mt-3 text-slate-600">
        Student Grade Portal — ตรวจผลการเรียน ดูเกรดเฉลี่ย และดาวน์โหลด Transcript
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-slate-900 px-5 py-2.5 text-white hover:bg-slate-800"
        >
          เข้าสู่ระบบ
        </Link>
      </div>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <Card title="นักเรียน" desc="ตรวจผลการเรียน ดู GPA ดาวน์โหลด Transcript" />
        <Card title="อาจารย์" desc="บันทึก/แก้ไขคะแนนและเกรดของรายวิชา" />
        <Card title="ผู้ดูแลระบบ" desc="จัดการผู้ใช้ ปีการศึกษา และรายงานสถิติ" />
      </section>
    </main>
  );
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
    </div>
  );
}
