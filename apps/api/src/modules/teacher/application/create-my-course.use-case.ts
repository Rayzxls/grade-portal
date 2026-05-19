import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { TeacherCreateCourseDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class CreateMyCourseUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(dto: TeacherCreateCourseDto, userId: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new NotFoundException('ไม่พบโปรไฟล์ครู');

    const exists = await this.prisma.course.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('รหัสวิชานี้มีอยู่แล้ว');

    return this.prisma.course.create({
      data: { ...dto, teacherId: teacher.id },
    });
  }
}
