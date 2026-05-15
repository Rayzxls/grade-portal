import { Injectable, NotFoundException } from '@nestjs/common';
import type { AssignStudentToClassroomDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class AssignStudentToClassroomUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(dto: AssignStudentToClassroomDto) {
    const [student, classroom] = await Promise.all([
      this.prisma.student.findUnique({ where: { id: dto.studentId } }),
      this.prisma.classroom.findUnique({ where: { id: dto.classroomId } }),
    ]);
    if (!student) throw new NotFoundException('ไม่พบนักเรียน');
    if (!classroom) throw new NotFoundException('ไม่พบห้องเรียน');

    return this.prisma.student.update({
      where: { id: dto.studentId },
      data: { classroomId: dto.classroomId },
    });
  }
}
