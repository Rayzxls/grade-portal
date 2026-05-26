// 🧪 Seed test data: 5 ครู สอน 5 วิชา ให้นักเรียน 1 คน เพื่อทดสอบ multi-teacher grade flow
// Usage:
//   $env:DATABASE_URL = "<Neon URL>"
//   node packages/database/seed-multi-teacher.mjs
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = 'password123';

function scoreToLetter(s) {
  if (s >= 80) return 'A';
  if (s >= 75) return 'B_PLUS';
  if (s >= 70) return 'B';
  if (s >= 65) return 'C_PLUS';
  if (s >= 60) return 'C';
  if (s >= 55) return 'D_PLUS';
  if (s >= 50) return 'D';
  return 'F';
}
const GP = { A: 4, B_PLUS: 3.5, B: 3, C_PLUS: 2.5, C: 2, D_PLUS: 1.5, D: 1, F: 0 };

const TEACHERS = [
  { email: 'malee@school.ac.th',   fullName: 'อ.มาลี มานะ',       staffCode: 'T-MALEE',   department: 'คณิตศาสตร์',         subject: { code: 'MATH-M3-DEMO', name: 'คณิตศาสตร์ ม.3',  credits: 2 } },
  { email: 'somchai@school.ac.th', fullName: 'อ.สมชาย เก่งภาษา',  staffCode: 'T-SOMCHAI', department: 'ภาษาต่างประเทศ',     subject: { code: 'ENG-M3-DEMO',  name: 'ภาษาอังกฤษ ม.3',  credits: 2 } },
  { email: 'wit@school.ac.th',     fullName: 'อ.วิทย์ ใจเย็น',     staffCode: 'T-WIT',     department: 'วิทยาศาสตร์',         subject: { code: 'SCI-M3-DEMO', name: 'วิทยาศาสตร์ ม.3', credits: 3 } },
  { email: 'sangkom@school.ac.th', fullName: 'อ.สังคม เพื่อนรัก',  staffCode: 'T-SANGKOM', department: 'สังคมศึกษา',         subject: { code: 'SOC-M3-DEMO', name: 'สังคมศึกษา ม.3',  credits: 1 } },
  { email: 'pala@school.ac.th',    fullName: 'อ.พละ ฟิตตลอด',     staffCode: 'T-PALA',    department: 'สุขศึกษาและพลศึกษา',  subject: { code: 'PE-M3-DEMO',  name: 'พลศึกษา ม.3',     credits: 1 } },
];
const SCORES = [85, 72, 90, 68, 95]; // คะแนน 0-100 ต่อวิชา (matching order ของ TEACHERS)

const STUDENT = {
  email: 'demo-student-multi@school.ac.th',
  fullName: 'ด.ช.ตัวอย่าง ใจดี',
  studentCode: 'DEMO-2569-001',
  enrollYear: 2569,
};

async function upsertUser(role, data) {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const existing = await prisma.user.findUnique({ where: { email: data.email }, include: { teacher: true, student: true } });
  if (existing) return existing;
  return prisma.user.create({
    data: { email: data.email, passwordHash, fullName: data.fullName, role, ...data.nested },
    include: { teacher: true, student: true },
  });
}

async function main() {
  console.log('🚀 Seeding test data...\n');

  // 1. Term
  console.log('📅 [1/6] Term 2569/FIRST...');
  let term = await prisma.academicTerm.findUnique({ where: { year_semester: { year: 2569, semester: 'FIRST' } } });
  if (!term) {
    term = await prisma.academicTerm.create({
      data: { year: 2569, semester: 'FIRST', startDate: new Date('2026-05-01'), endDate: new Date('2026-09-30') },
    });
  }
  console.log(`   term.id = ${term.id}`);

  // 2. Teachers
  console.log('\n👨‍🏫 [2/6] Creating 5 teachers...');
  const teachers = [];
  for (const t of TEACHERS) {
    let user = await prisma.user.findUnique({ where: { email: t.email }, include: { teacher: true } });
    if (!user) {
      const hash = await bcrypt.hash(PASSWORD, 12);
      user = await prisma.user.create({
        data: {
          email: t.email, passwordHash: hash, fullName: t.fullName, role: 'TEACHER',
          teacher: { create: { staffCode: t.staffCode, department: t.department } },
        },
        include: { teacher: true },
      });
      console.log(`   ✓ ${t.fullName} (${t.email})`);
    } else {
      console.log(`   - ${t.email} exists, reused`);
    }
    teachers.push({ ...t, user, teacherId: user.teacher.id });
  }

  // 3. Classroom — teacher #1 เป็น homeroom
  console.log('\n🏫 [3/6] Classroom ม.3/1 (2569)...');
  let classroom = await prisma.classroom.findUnique({
    where: { gradeLevel_section_academicYear: { gradeLevel: 'ม.3', section: 1, academicYear: 2569 } },
  });
  if (!classroom) {
    classroom = await prisma.classroom.create({
      data: { gradeLevel: 'ม.3', section: 1, academicYear: 2569, homeroomTeacherId: teachers[0].teacherId },
    });
    console.log(`   ✓ created, homeroom = ${teachers[0].fullName}`);
  } else {
    console.log('   - reused');
  }

  // 4. Courses (1 ต่อครู)
  console.log('\n📚 [4/6] Creating 5 courses...');
  const courses = [];
  for (const t of teachers) {
    let course = await prisma.course.findUnique({ where: { code: t.subject.code } });
    if (!course) {
      course = await prisma.course.create({
        data: { ...t.subject, gradeLevel: 'ม.3', teacherId: t.teacherId },
      });
      console.log(`   ✓ ${t.subject.code} (สอนโดย ${t.fullName})`);
    } else {
      console.log(`   - ${t.subject.code} reused`);
    }
    courses.push({ ...t.subject, id: course.id, teacherId: t.teacherId });
  }

  // 5. Student
  console.log('\n🎓 [5/6] Student...');
  let studentUser = await prisma.user.findUnique({ where: { email: STUDENT.email }, include: { student: true } });
  if (!studentUser) {
    const hash = await bcrypt.hash(PASSWORD, 12);
    studentUser = await prisma.user.create({
      data: {
        email: STUDENT.email, passwordHash: hash, fullName: STUDENT.fullName, role: 'STUDENT',
        student: { create: { studentCode: STUDENT.studentCode, enrollYear: STUDENT.enrollYear, classroomId: classroom.id } },
      },
      include: { student: true },
    });
    console.log(`   ✓ ${STUDENT.fullName} (${STUDENT.email})`);
  } else {
    // ensure in classroom
    if (studentUser.student?.classroomId !== classroom.id) {
      await prisma.student.update({ where: { id: studentUser.student.id }, data: { classroomId: classroom.id } });
    }
    console.log(`   - reused, in classroom ม.3/1`);
  }
  const studentId = studentUser.student.id;

  // 6. For each course: enrollment → score sheet → column → cells → finalize → grade
  console.log('\n📝 [6/6] Each teacher grading...');
  for (let i = 0; i < courses.length; i++) {
    const c = courses[i];
    const t = teachers[i];
    const score = SCORES[i];
    const letter = scoreToLetter(score);

    // enrollment
    let enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId_termId: { studentId, courseId: c.id, termId: term.id } },
    });
    if (!enrollment) {
      enrollment = await prisma.enrollment.create({
        data: { studentId, courseId: c.id, termId: term.id },
      });
    }

    // score sheet (1 column "คะแนนรวม" max=100)
    let sheet = await prisma.scoreSheet.findUnique({
      where: { classroomId_courseId_termId: { classroomId: classroom.id, courseId: c.id, termId: term.id } },
      include: { columns: true },
    });
    if (!sheet) {
      sheet = await prisma.scoreSheet.create({
        data: {
          classroomId: classroom.id, courseId: c.id, termId: term.id, ownerTeacherId: c.teacherId,
          columns: { create: [{ name: 'คะแนนรวม', maxScore: 100, order: 0 }] },
        },
        include: { columns: true },
      });
    }
    const columnId = sheet.columns[0].id;

    // cell value
    await prisma.studentScore.upsert({
      where: { columnId_studentId: { columnId, studentId } },
      create: { scoreSheetId: sheet.id, columnId, studentId, value: score },
      update: { value: score },
    });

    // grade (manually compute to match Finalize logic)
    const gradePoint = GP[letter];
    const existingGrade = await prisma.grade.findUnique({ where: { enrollmentId: enrollment.id } });
    if (existingGrade) {
      await prisma.grade.update({
        where: { id: existingGrade.id },
        data: { score, letter, gradePoint },
      });
    } else {
      await prisma.grade.create({
        data: {
          enrollmentId: enrollment.id, studentId, score, letter, gradePoint,
          recordedById: t.user.id,
        },
      });
    }

    // mark sheet as finalized
    if (!sheet.finalizedAt) {
      await prisma.scoreSheet.update({ where: { id: sheet.id }, data: { finalizedAt: new Date() } });
    }

    console.log(`   ✓ ${c.code.padEnd(15)} | ${t.fullName.padEnd(22)} | คะแนน ${score}  →  เกรด ${letter.replace('_PLUS', '+')}`);
  }

  console.log('\n────────────────────────────────────────────');
  console.log('✅ เสร็จ! ลอง login ด้วย:');
  console.log(`   📧 ${STUDENT.email}`);
  console.log(`   🔑 ${PASSWORD}`);
  console.log('   → ควรเห็นเกรด 5 วิชาในเทอม 1/2569 + GPA');
  console.log('\nครู login เพื่อกรอกเพิ่ม:');
  for (const t of TEACHERS) {
    console.log(`   👨‍🏫 ${t.email}  (รหัส ${PASSWORD})`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
