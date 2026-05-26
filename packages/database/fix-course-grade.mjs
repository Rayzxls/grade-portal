import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const r = await p.course.updateMany({
  where: { code: { in: ['MATH-M3', 'ENG-M3'] } },
  data: { gradeLevel: 'ม.3' },
});
console.log(`✓ Updated ${r.count} courses to gradeLevel='ม.3'`);
await p.$disconnect();
