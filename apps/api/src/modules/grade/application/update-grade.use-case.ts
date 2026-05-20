import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { scoreToLetter, letterToGradePoint, type UpdateGradeDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { IGradeRepository } from '../domain/grade-repository.interface';

@Injectable()
export class UpdateGradeUseCase {
  constructor(
    private prisma: PrismaService,
    private repo: IGradeRepository,
  ) {}

  async execute(id: string, dto: UpdateGradeDto, actorUserId: string) {
    const existing = await this.prisma.grade.findUnique({
      where: { id },
      include: {
        enrollment: {
          include: {
            course: true,
            student: { include: { classroom: true } },
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('ไม่พบเกรดที่ต้องการแก้ไข');

    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      include: { teacher: true },
    });
    if (!actor) throw new NotFoundException('ไม่พบผู้ใช้');

    if (actor.role !== 'ADMIN') {
      if (actor.role === 'TEACHER' && actor.teacher) {
        const isCourseTeacher = existing.enrollment.course.teacherId === actor.teacher.id;
        const isHomeroomTeacher = existing.enrollment.student.classroom?.homeroomTeacherId === actor.teacher.id;
        if (!isCourseTeacher && !isHomeroomTeacher) {
          throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขคะแนนสำหรับวิชานี้');
        }
      } else {
        throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขคะแนน');
      }
    }

    const letter = scoreToLetter(dto.score);
    const gradePoint = letterToGradePoint(letter) ?? 0;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.grade.update({
        where: { id },
        data: { score: dto.score, letter, gradePoint },
      });

      await tx.auditLog.create({
        data: {
          actorId: actorUserId,
          action: 'GRADE_UPDATE',
          entityType: 'Grade',
          entityId: id,
          before: { score: existing.score, letter: existing.letter, gradePoint: existing.gradePoint } as object,
          after: { score: dto.score, letter, gradePoint } as object,
        },
      });

      return updated;
    });
  }
}
