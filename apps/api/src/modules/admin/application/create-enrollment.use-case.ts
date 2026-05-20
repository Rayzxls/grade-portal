import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateEnrollmentDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class CreateEnrollmentUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(dto: CreateEnrollmentDto) {
    const [student, course, term] = await Promise.all([
      this.prisma.student.findUnique({ where: { id: dto.studentId }, include: { classroom: true } }),
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
      this.prisma.academicTerm.findUnique({ where: { id: dto.termId } }),
    ]);
    if (!student) throw new NotFoundException('ไม่พบนักเรียน');
    if (!course) throw new NotFoundException('ไม่พบรายวิชา');
    if (!term) throw new NotFoundException('ไม่พบปี/ภาคการศึกษา');

    if (student.classroom && student.classroom.gradeLevel !== course.gradeLevel) {
      throw new ConflictException(
        `ระดับชั้นของนักเรียน (${student.classroom.gradeLevel}) ` +
        `ไม่ตรงกับระดับชั้นของวิชา (${course.gradeLevel})`
      );
    }

    const exists = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId_termId: { studentId: dto.studentId, courseId: dto.courseId, termId: dto.termId } },
    });
    if (exists) throw new ConflictException('นักเรียนคนนี้ลงทะเบียนวิชานี้ในเทอมนี้แล้ว');

    return this.prisma.enrollment.create({ data: dto });
  }
}
