// 🧨 ล้างข้อมูลทั้งหมด เก็บแค่ admin@school.ac.th
// Usage:
//   $env:DATABASE_URL = "<Neon URL>"
//   node packages/database/reset-all-keep-admin.mjs
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'admin@school.ac.th';
const ADMIN_PASSWORD = 'password123';
const ADMIN_NAME = 'ผู้ดูแลระบบ';

async function main() {
  console.log('⚠️  กำลังล้างฐานข้อมูล...\n');

  // ลบตามลำดับ FK (ลึก → ตื้น)
  const ops = [
    ['StudentScore', () => prisma.studentScore.deleteMany()],
    ['ScoreColumn',  () => prisma.scoreColumn.deleteMany()],
    ['ScoreSheet',   () => prisma.scoreSheet.deleteMany()],
    ['Grade',        () => prisma.grade.deleteMany()],
    ['Enrollment',   () => prisma.enrollment.deleteMany()],
    ['SchedulePeriod', () => prisma.schedulePeriod.deleteMany()],
    ['ScheduleSettings', () => prisma.scheduleSettings.deleteMany()],
    ['Student',      () => prisma.student.deleteMany()],
    ['Course',       () => prisma.course.deleteMany()],
    ['Classroom',    () => prisma.classroom.deleteMany()],
    ['Teacher',      () => prisma.teacher.deleteMany()],
    ['AcademicTerm', () => prisma.academicTerm.deleteMany()],
    ['AuditLog',     () => prisma.auditLog.deleteMany()],
    ['RefreshToken', () => prisma.refreshToken.deleteMany()],
    // ลบ user ทุกคนที่ไม่ใช่ admin
    ['User (non-admin)', () => prisma.user.deleteMany({ where: { email: { not: ADMIN_EMAIL } } })],
  ];

  for (const [label, op] of ops) {
    const r = await op();
    console.log(`   ✓ ${label.padEnd(20)} → ลบ ${r.count} แถว`);
  }

  // Reset admin password + ensure exists
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { passwordHash: hash, fullName: ADMIN_NAME, role: 'ADMIN', isActive: true },
    });
    console.log(`\n✓ Reset password admin → ${ADMIN_PASSWORD}`);
  } else {
    await prisma.user.create({
      data: { email: ADMIN_EMAIL, passwordHash: hash, fullName: ADMIN_NAME, role: 'ADMIN' },
    });
    console.log(`\n✓ Created admin user`);
  }

  console.log('\n🎯 ล้างเสร็จ — เริ่มต้นใหม่ได้เลย');
  console.log(`   📧 ${ADMIN_EMAIL}`);
  console.log(`   🔑 ${ADMIN_PASSWORD}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
