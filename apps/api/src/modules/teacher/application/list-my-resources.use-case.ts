import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class ListMyResourcesUseCase {
  constructor(private prisma: PrismaService) {}

  private async teacherIdOf(userId: string): Promise<string> {
    const t = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!t) throw new NotFoundException('ไม่พบโปรไฟล์ครู');
    return t.id;
  }

  async listMyClassrooms(userId: string) {
    const teacherId = await this.teacherIdOf(userId);
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
    return this.prisma.course.findMany({
      where: { teacherId },
      include: { _count: { select: { enrollments: true } } },
      orderBy: [{ gradeLevel: 'asc' }, { code: 'asc' }],
    });
  }
}
