import { Injectable, NotFoundException } from '@nestjs/common';
import { scoreToLetter, letterToGradePoint, type CreateGradeDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { IGradeRepository } from '../domain/grade-repository.interface';

@Injectable()
export class RecordGradeUseCase {
  constructor(
    private prisma: PrismaService,
    private repo: IGradeRepository,
  ) {}

  async execute(dto: CreateGradeDto, teacherUserId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: { course: { include: { teacher: true } } },
    });
    if (!enrollment) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    const letter = scoreToLetter(dto.score);
    const gradePoint = letterToGradePoint(letter) ?? 0;

    const created = await this.prisma.$transaction(async (tx) => {
      const grade = await tx.grade.create({
        data: {
          enrollmentId: dto.enrollmentId,
          studentId: enrollment.studentId,
          score: dto.score,
          letter,
          gradePoint,
          recordedById: teacherUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: teacherUserId,
          action: 'GRADE_CREATE',
          entityType: 'Grade',
          entityId: grade.id,
          after: { score: dto.score, letter, gradePoint } as object,
        },
      });

      return grade;
    });

    return created;
  }
}
