import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateCourseDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class CreateCourseUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(dto: CreateCourseDto) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id: dto.teacherId } });
    if (!teacher) throw new NotFoundException('ไม่พบอาจารย์ผู้สอน');

    const exists = await this.prisma.course.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('รหัสวิชานี้มีอยู่แล้ว');

    return this.prisma.course.create({ data: dto });
  }
}
