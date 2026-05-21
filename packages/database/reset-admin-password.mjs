// ใช้งาน:
//   $env:DATABASE_URL = "<Neon connection string>"
//   $env:NEW_PASSWORD = "รหัสใหม่ที่ต้องการ"
//   node packages/database/reset-admin-password.mjs
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const email = process.env.ADMIN_EMAIL ?? 'admin@school.ac.th';
const newPassword = process.env.NEW_PASSWORD;
if (!newPassword) {
  console.error('❌ ตั้ง NEW_PASSWORD ก่อน เช่น: $env:NEW_PASSWORD = "MyStrongPass123!"');
  process.exit(1);
}

const prisma = new PrismaClient();
const hash = await bcrypt.hash(newPassword, 12);
await prisma.user.update({ where: { email }, data: { passwordHash: hash } });
console.log(`✓ เปลี่ยนรหัส ${email} เรียบร้อย`);
await prisma.$disconnect();
