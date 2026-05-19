import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { TeacherCreateClassroomDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class CreateMyClassroomUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(dto: TeacherCreateClassroomDto, userId: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new NotFoundException('ไม่พบโปรไฟล์ครู');

    const exists = await this.prisma.classroom.findUnique({
      where: {
        gradeLevel_section_academicYear: {
          gradeLevel: dto.gradeLevel,
          section: dto.section,
          academicYear: dto.academicYear,
        },
      },
    });
    if (exists) throw new ConflictException('ห้องนี้มีอยู่แล้วในปีการศึกษานี้');

    return this.prisma.classroom.create({
      data: { ...dto, homeroomTeacherId: teacher.id },
    });
  }
}
