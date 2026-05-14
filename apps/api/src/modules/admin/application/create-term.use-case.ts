import { ConflictException, Injectable } from '@nestjs/common';
import type { CreateTermDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class CreateTermUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(dto: CreateTermDto) {
    const exists = await this.prisma.academicTerm.findUnique({
      where: { year_semester: { year: dto.year, semester: dto.semester } },
    });
    if (exists) throw new ConflictException('ปี/ภาคนี้มีอยู่แล้ว');

    return this.prisma.academicTerm.create({
      data: {
        year: dto.year,
        semester: dto.semester,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }
}
