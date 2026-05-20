import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { CreateUserDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class CreateUserUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('อีเมลนี้ถูกใช้แล้ว');

    if (dto.role === 'STUDENT') {
      if (!dto.student) {
        throw new BadRequestException('STUDENT ต้องระบุ student profile');
      }
      const codeExists = await this.prisma.student.findUnique({
        where: { studentCode: dto.student.studentCode },
      });
      if (codeExists) throw new ConflictException('รหัสนักเรียนนี้ถูกใช้แล้ว');
    }

    if (dto.role === 'TEACHER') {
      if (!dto.teacher) {
        throw new BadRequestException('TEACHER ต้องระบุ teacher profile');
      }
      const codeExists = await this.prisma.teacher.findUnique({
        where: { staffCode: dto.teacher.staffCode },
      });
      if (codeExists) throw new ConflictException('รหัสครูนี้ถูกใช้แล้ว');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: dto.role,
        student: dto.student
          ? {
              create: {
                studentCode: dto.student.studentCode,
                enrollYear: dto.student.enrollYear,
                classroomId: dto.student.classroomId ?? null,
              },
            }
          : undefined,
        teacher: dto.teacher
          ? { create: { ...dto.teacher } }
          : undefined,
      },
      include: { student: true, teacher: true },
    });

    return { ...user, passwordHash: undefined };
  }
}
