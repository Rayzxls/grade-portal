import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const cr = await prisma.classroom.findMany({
  where: { gradeLevel: 'ม.3', section: 1, academicYear: 2569 },
  include: {
    homeroomTeacher: { include: { user: true } },
    students: { include: { user: true } },
    scoreSheets: {
      include: {
        course: true,
        owner: { include: { user: true } },
        term: true,
      },
    },
  },
});
console.log(JSON.stringify(cr.map(c => ({
  classroomId: c.id,
  label: `${c.gradeLevel}/${c.section}-${c.academicYear}`,
  homeroom: c.homeroomTeacher?.user?.fullName,
  homeroomEmail: c.homeroomTeacher?.user?.email,
  students: c.students.map(s => ({ code: s.studentCode, name: s.user.fullName, email: s.user.email })),
  sheets: c.scoreSheets.map(s => ({
    course: s.course.code,
    owner: s.owner?.user?.fullName,
    term: `${s.term.year}/${s.term.semester}`,
    termId: s.termId,
    finalized: !!s.finalizedAt,
  })),
})), null, 2));

const enrolls = await prisma.enrollment.findMany({
  where: { student: { classroomId: cr[0]?.id } },
  include: { course: true, term: true, grade: true },
});
console.log('\nEnrollments:', enrolls.length);
console.log(JSON.stringify(enrolls.map(e => ({
  course: e.course.code,
  termId: e.termId,
  term: `${e.term.year}/${e.term.semester}`,
  grade: e.grade ? `${e.grade.score} ${e.grade.letter}` : null,
})), null, 2));

await prisma.$disconnect();
