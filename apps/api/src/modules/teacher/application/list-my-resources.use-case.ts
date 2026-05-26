import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class ListMyResourcesUseCase {
  constructor(private prisma: PrismaService) {}

  // คืน null ถ้าไม่มี teacher profile (เช่น admin) — caller ตัดสินว่าจะแสดงอะไร
  private async teacherIdOf(userId: string): Promise<string | null> {
    const t = await this.prisma.teacher.findUnique({ where: { userId } });
    return t?.id ?? null;
  }

  async listMyClassrooms(userId: string) {
    const teacherId = await this.teacherIdOf(userId);
    if (!teacherId) return []; // admin or non-teacher: empty list
    // ห้อง "ของฉัน" = ห้องที่เป็นครูประจำชั้น (homeroom)
    //               + ห้องที่มีสมุดคะแนนของวิชาที่ฉันสอน (= ห้องที่ฉันสอน)
    const rooms = await this.prisma.classroom.findMany({
      where: {
        OR: [
          { homeroomTeacherId: teacherId },
          { scoreSheets: { some: { ownerTeacherId: teacherId } } },
        ],
      },
      include: {
        _count: { select: { students: true } },
        students: {
          select: {
            id: true, studentCode: true,
            user: { select: { fullName: true, email: true } },
          },
          orderBy: { studentCode: 'asc' },
        },
        scoreSheets: {
          where: { ownerTeacherId: teacherId },
          select: {
            id: true,
            finalizedAt: true,
            course: { select: { id: true, code: true, name: true } },
            term: { select: { id: true, year: true, semester: true } },
          },
        },
      },
      orderBy: [{ academicYear: 'desc' }, { gradeLevel: 'asc' }, { section: 'asc' }],
    });
    // เพิ่ม flag ระบุบทบาทในแต่ละห้อง
    return rooms.map((r) => ({
      ...r,
      role: r.homeroomTeacherId === teacherId ? 'HOMEROOM' : 'SUBJECT_TEACHER',
      mySubjects: r.scoreSheets.map((s) => ({
        sheetId: s.id,
        finalized: !!s.finalizedAt,
        course: s.course,
        term: s.term,
      })),
    }));
  }

  async listMyCourses(userId: string) {
    const teacherId = await this.teacherIdOf(userId);
    if (!teacherId) return [];
    return this.prisma.course.findMany({
      where: { teacherId },
      include: { _count: { select: { enrollments: true } } },
      orderBy: [{ gradeLevel: 'asc' }, { code: 'asc' }],
    });
  }

  // วิชาทั้งหมดในระบบที่ตรงกับชั้น (ใช้สำหรับครูประจำชั้นเลือกเปิดสอนในห้องนี้)
  async listAvailableCoursesForGrade(gradeLevel: string) {
    return this.prisma.course.findMany({
      where: { gradeLevel },
      include: {
        teacher: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: [{ code: 'asc' }],
    });
  }
}
