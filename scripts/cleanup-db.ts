import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find orphan enrollments tied to QA courses
  const enrollments = await prisma.enrollment.findMany({
    where: { course: { code: { startsWith: 'QA-' } } },
    include: { grade: true },
  });
  console.log('Orphan enrollments:', enrollments.length);

  for (const en of enrollments) {
    if (en.grade) {
      await prisma.grade.delete({ where: { id: en.grade.id } });
      console.log('  Deleted grade', en.grade.id);
    }
    await prisma.enrollment.delete({ where: { id: en.id } });
    console.log('  Deleted enrollment', en.id);
  }

  // Delete orphan QA courses
  const courses = await prisma.course.findMany({
    where: { code: { startsWith: 'QA-' } },
  });
  for (const c of courses) {
    await prisma.course.delete({ where: { id: c.id } });
    console.log('  Deleted course', c.code);
  }

  // Delete orphan QA students (users with QA- student codes)
  const qaStudents = await prisma.student.findMany({
    where: { studentCode: { startsWith: 'QA-' } },
  });
  for (const s of qaStudents) {
    await prisma.user.delete({ where: { id: s.userId } });
    console.log('  Deleted QA student', s.studentCode);
  }

  // Verify final state
  const roomCount = await prisma.classroom.count();
  const courseCount = await prisma.course.count();
  const studentCount = await prisma.student.count();
  console.log(`\nFinal state: ${roomCount} classrooms, ${courseCount} courses, ${studentCount} students`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
