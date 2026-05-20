import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting database clearance (retaining core login credentials)...');

  try {
    // 1. Delete audit logs, refresh tokens, scores and sheets
    const auditLogs = await prisma.auditLog.deleteMany({});
    console.log(`- Deleted ${auditLogs.count} Audit Logs`);

    const refreshTokens = await prisma.refreshToken.deleteMany({});
    console.log(`- Deleted ${refreshTokens.count} Refresh Tokens`);

    const studentScores = await prisma.studentScore.deleteMany({});
    console.log(`- Deleted ${studentScores.count} Student Scores`);

    const scoreColumns = await prisma.scoreColumn.deleteMany({});
    console.log(`- Deleted ${scoreColumns.count} Score Columns`);

    const scoreSheets = await prisma.scoreSheet.deleteMany({});
    console.log(`- Deleted ${scoreSheets.count} Score Sheets`);

    // 2. Delete grades and enrollments
    const grades = await prisma.grade.deleteMany({});
    console.log(`- Deleted ${grades.count} Grades`);

    const enrollments = await prisma.enrollment.deleteMany({});
    console.log(`- Deleted ${enrollments.count} Enrollments`);

    // 3. Delete courses
    const courses = await prisma.course.deleteMany({});
    console.log(`- Deleted ${courses.count} Courses`);

    // 4. Detach students from classrooms to prevent foreign key errors
    const detachedStudents = await prisma.student.updateMany({
      data: { classroomId: null },
    });
    console.log(`- Detached ${detachedStudents.count} Students from classrooms`);

    // 5. Delete classrooms
    const classrooms = await prisma.classroom.deleteMany({});
    console.log(`- Deleted ${classrooms.count} Classrooms`);

    // 6. Delete academic terms
    const academicTerms = await prisma.academicTerm.deleteMany({});
    console.log(`- Deleted ${academicTerms.count} Academic Terms`);

    // 7. Delete additional non-seeded users, teachers, students (optional but recommended to keep the core seeded users clean)
    // Core seeded emails
    const coreEmails = ['admin@school.ac.th', 'teacher@school.ac.th', 'student@school.ac.th'];
    
    const extraUsers = await prisma.user.deleteMany({
      where: {
        email: {
          notIn: coreEmails,
        },
      },
    });
    console.log(`- Cleaned up ${extraUsers.count} custom registered/uploaded accounts (kept the 3 seeded accounts)`);

    console.log('✅ Database successfully cleared except for the core user login accounts!');
  } catch (error) {
    console.error('❌ Error during clearance:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
