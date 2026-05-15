import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20 animate-fade-in">
      <div className="badge-gold mb-5">Student Grade Portal · 2568</div>
      <h1 className="text-5xl font-bold tracking-tight text-ink">
        ระบบตรวจผลการเรียน
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
        ระบบบริหารจัดการผลการเรียนของนักเรียน — ตรวจผลการเรียน ดูเกรดเฉลี่ย
        และดาวน์โหลด Transcript ได้ทุกที่ทุกเวลา
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/login" className="btn-primary">
          เข้าสู่ระบบ
          <span aria-hidden>→</span>
        </Link>
        <a href="#features" className="btn-secondary">เรียนรู้เพิ่มเติม</a>
      </div>

      <section id="features" className="mt-16 grid gap-4 sm:grid-cols-3">
        <Card title="นักเรียน" desc="ตรวจผลการเรียน ดู GPA และดาวน์โหลด Transcript เป็น PDF" />
        <Card title="ครู" desc="บันทึก/แก้ไขคะแนนและเกรดของรายวิชาที่สอน" />
        <Card title="ผู้ดูแลระบบ" desc="จัดการผู้ใช้ ห้องเรียน รายวิชา และรายงานสถิติ" />
      </section>
    </main>
  );
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card animate-slide-up p-6">
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{desc}</p>
    </div>
  );
}
