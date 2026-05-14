import { Injectable, NotFoundException } from '@nestjs/common';
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
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('ไม่พบเกรดที่ต้องการแก้ไข');

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
