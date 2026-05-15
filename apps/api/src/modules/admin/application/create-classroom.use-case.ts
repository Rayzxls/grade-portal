import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateClassroomDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class CreateClassroomUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(dto: CreateClassroomDto) {
    if (dto.homeroomTeacherId) {
      const t = await this.prisma.teacher.findUnique({ where: { id: dto.homeroomTeacherId } });
      if (!t) throw new NotFoundException('ไม่พบครูประจำชั้น');
    }
    const exists = await this.prisma.classroom.findUnique({
      where: {
        gradeLevel_section_academicYear: {
          gradeLevel: dto.gradeLevel,
          section: dto.section,
          academicYear: dto.academicYear,
        },
      },
    });
    if (exists) throw new ConflictException('ห้องเรียนนี้มีอยู่แล้วในปีการศึกษานี้');
    return this.prisma.classroom.create({ data: dto });
  }
}
