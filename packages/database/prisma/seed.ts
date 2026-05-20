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
        create: { staffCode: 'T0001', department: 'คณิตศาสตร์' },
      },
    },
    include: { teacher: true },
  });

  // Real teacher: KENKEN2517 (พ่อ)
  const dadPasswordHash = await bcrypt.hash('25172517', 12);
  await prisma.user.upsert({
    where: { email: 'KENKEN2517@hotmail.com' },
    update: {},
    create: {
      email: 'KENKEN2517@hotmail.com',
      passwordHash: dadPasswordHash,
      role: Role.TEACHER,
      fullName: 'ครู KENKEN',
      teacher: {
        create: { staffCode: 'T2517', department: 'ครูประจำชั้น' },
      },
    },
  });

  // Classroom: ม.4/2 ปีการศึกษา 2568 มีครูสมชายเป็นครูประจำชั้น
  const classroom = await prisma.classroom.upsert({
    where: { gradeLevel_section_academicYear: { gradeLevel: 'ม.4', section: 2, academicYear: 2568 } },
    update: {},
    create: {
      gradeLevel: 'ม.4',
      section: 2,
      academicYear: 2568,
      homeroomTeacherId: teacherUser.teacher!.id,
    },
  });

  // Student (อยู่ห้อง ม.4/2)
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
          studentCode: '25680001',
          classroomId: classroom.id,
          enrollYear: 2565,
        },
      },
    },
    include: { student: true },
  });

  // Course (วิชาคณิต ม.4)
  const course = await prisma.course.upsert({
    where: { code: 'MATH-M4-001' },
    update: {},
    create: {
      code: 'MATH-M4-001',
      name: 'คณิตศาสตร์พื้นฐาน ม.4',
      credits: 3,
      gradeLevel: 'ม.4',
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
      startDate: new Date('2025-05-15'),
      endDate: new Date('2025-10-10'),
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
  console.log('   teacher: teacher@school.ac.th / password123  (ครูประจำชั้น ม.4/2)');
  console.log('   student: student@school.ac.th / password123  (ม.4/2 #25680001)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
