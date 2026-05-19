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
    return this.prisma.classroom.findMany({
      where: { homeroomTeacherId: teacherId },
      include: {
        _count: { select: { students: true } },
        students: {
          select: {
            id: true, studentCode: true,
            user: { select: { fullName: true, email: true } },
          },
          orderBy: { studentCode: 'asc' },
        },
      },
      orderBy: [{ academicYear: 'desc' }, { gradeLevel: 'asc' }, { section: 'asc' }],
    });
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
}
