import { PrismaClient, Role, Semester, GradeLetter } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@school.ac.th' },
    update: {},
    create: {
      email: 'admin@school.ac.th',
      passwordHash,
      role: Role.ADMIN,
      fullName: 'ผู้ดูแลระบบ',
    },
  });

  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@school.ac.th' },
    update: {},
    create: {
      email: 'teacher@school.ac.th',
      passwordHash,
      role: Role.TEACHER,
      fullName: 'อาจารย์สมชาย ใจดี',
      teacher: {
        create: {
          staffCode: 'T0001',
          department: 'วิทยาการคอมพิวเตอร์',
        },
      },
    },
    include: { teacher: true },
  });

  // Student
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@school.ac.th' },
    update: {},
    create: {
      email: 'student@school.ac.th',
      passwordHash,
      role: Role.STUDENT,
      fullName: 'นายนักเรียน ตัวอย่าง',
      student: {
        create: {
          studentCode: '6500001',
          major: 'วิทยาการคอมพิวเตอร์',
          faculty: 'วิทยาศาสตร์',
          enrollYear: 2565,
        },
      },
    },
    include: { student: true },
  });

  // Course
  const course = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      code: 'CS101',
      name: 'Introduction to Computer Science',
      credits: 3,
      teacherId: teacherUser.teacher!.id,
    },
  });

  // Term
  const term = await prisma.academicTerm.upsert({
    where: { year_semester: { year: 2568, semester: Semester.FIRST } },
    update: {},
    create: {
      year: 2568,
      semester: Semester.FIRST,
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-10-31'),
    },
  });

  // Enrollment + Grade
  const enrollment = await prisma.enrollment.upsert({
    where: {
      studentId_courseId_termId: {
        studentId: studentUser.student!.id,
        courseId: course.id,
        termId: term.id,
      },
    },
    update: {},
    create: {
      studentId: studentUser.student!.id,
      courseId: course.id,
      termId: term.id,
    },
  });

  await prisma.grade.upsert({
    where: { enrollmentId: enrollment.id },
    update: {},
    create: {
      enrollmentId: enrollment.id,
      studentId: studentUser.student!.id,
      score: 85,
      letter: GradeLetter.A,
      gradePoint: 4.0,
      recordedById: teacherUser.id,
    },
  });

  console.log('✅ Seed complete');
  console.log('   admin:   admin@school.ac.th / password123');
  console.log('   teacher: teacher@school.ac.th / password123');
  console.log('   student: student@school.ac.th / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
