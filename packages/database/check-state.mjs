import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const [users, classrooms, courses, terms, enrollments, sheets, students] = await Promise.all([
  p.user.count(), p.classroom.count(), p.course.count(), p.academicTerm.count(),
  p.enrollment.count(), p.scoreSheet.count(), p.student.count(),
]);
console.log({ users, classrooms, courses, terms, enrollments, sheets, students });
const cs = await p.course.findMany({ include: { teacher: { include: { user: true } } } });
console.log('Courses:', cs.map(c => ({ code: c.code, gradeLevel: c.gradeLevel, teacher: c.teacher.user.fullName })));
const cls = await p.classroom.findMany({ include: { homeroomTeacher: { include: { user: true } }, _count: { select: { students: true } } } });
console.log('Classrooms:', cls.map(c => ({ name: `${c.gradeLevel}/${c.section}`, year: c.academicYear, homeroom: c.homeroomTeacher?.user?.fullName, students: c._count.students })));
await p.$disconnect();
