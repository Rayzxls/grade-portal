import { ConflictException, Injectable, BadRequestException } from '@nestjs/common';
import type { CreateTermDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class CreateTermUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(dto: CreateTermDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start >= end) {
      throw new BadRequestException('วันเริ่มต้นต้องอยู่ก่อนวันสิ้นสุด');
    }

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
