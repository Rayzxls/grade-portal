// 🔧 สร้าง SubjectOffering (= ScoreSheet) ให้ทุก Enrollment ที่ยังไม่มี
// แก้ปัญหาที่ Setup wizard เดิมสร้าง enrollment โดยไม่สร้าง sheet
//
// Usage: $env:DATABASE_URL = "..." && node packages/database/backfill-offerings.mjs

import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

console.log('🔍 หา (classroom, course, term) ที่มี enrollment แต่ไม่มี ScoreSheet...');

// ทุก (courseId, termId) ที่มี enrollment + ชั้นของนักเรียน
const enrollments = await p.enrollment.findMany({
  include: {
    course: true,
    student: { select: { classroomId: true } },
  },
});

// กลุ่มเป็น { classroomId | courseId | termId } unique
const triples = new Map();
for (const e of enrollments) {
  if (!e.student.classroomId) continue;
  const key = `${e.student.classroomId}|${e.courseId}|${e.termId}`;
  if (!triples.has(key)) {
    triples.set(key, {
      classroomId: e.student.classroomId,
      courseId: e.courseId,
      termId: e.termId,
      ownerTeacherId: e.course.teacherId,
    });
  }
}

console.log(`   เจอ ${triples.size} (classroom, course, term) ที่ต้องตรวจ`);

let created = 0, skipped = 0;
for (const t of triples.values()) {
  const exist = await p.scoreSheet.findUnique({
    where: {
      classroomId_courseId_termId: {
        classroomId: t.classroomId,
        courseId: t.courseId,
        termId: t.termId,
      },
    },
  });
  if (exist) { skipped++; continue; }

  await p.scoreSheet.create({
    data: {
      classroomId: t.classroomId,
      courseId: t.courseId,
      termId: t.termId,
      ownerTeacherId: t.ownerTeacherId,
    },
  });
  created++;
}

console.log(`✅ สร้าง ScoreSheet ใหม่ ${created} ชิ้น, ข้าม ${skipped} (มีอยู่แล้ว)`);
await p.$disconnect();
