import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { BulkEnrollClassroomDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export interface BulkEnrollResult {
  totalStudents: number;
  created: number;
  skipped: number; // เคยลงทะเบียนแล้ว
}

@Injectable()
export class BulkEnrollClassroomUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(dto: BulkEnrollClassroomDto, actorUserId: string): Promise<BulkEnrollResult> {
    const [classroom, course, term] = await Promise.all([
      this.prisma.classroom.findUnique({
        where: { id: dto.classroomId },
        include: { students: { select: { id: true } } },
      }),
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
      this.prisma.academicTerm.findUnique({ where: { id: dto.termId } }),
    ]);
    if (!classroom) throw new NotFoundException('ไม่พบห้องเรียน');
    if (!course) throw new NotFoundException('ไม่พบรายวิชา');
    if (!term) throw new NotFoundException('ไม่พบปี/ภาคการศึกษา');

    // ตรวจสอบความเข้ากันได้ของชั้น (เช่น วิชา ม.4 ห้ามลงทะเบียนกับห้อง ม.1)
    if (course.gradeLevel !== classroom.gradeLevel) {
      throw new BadRequestException(
        `วิชา ${course.code} เปิดสำหรับชั้น ${course.gradeLevel} ` +
          `แต่ห้องนี้เป็นชั้น ${classroom.gradeLevel}`,
      );
    }

    if (classroom.students.length === 0) {
      return { totalStudents: 0, created: 0, skipped: 0 };
    }

    // ใช้ createMany พร้อม skipDuplicates เพื่อ idempotent
    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.enrollment.createMany({
        data: classroom.students.map((s) => ({
          studentId: s.id,
          courseId: dto.courseId,
          termId: dto.termId,
        })),
        skipDuplicates: true,
      });

      await tx.auditLog.create({
        data: {
          actorId: actorUserId,
          action: 'BULK_ENROLL',
          entityType: 'Classroom',
          entityId: dto.classroomId,
          after: {
            courseId: dto.courseId,
            termId: dto.termId,
            totalStudents: classroom.students.length,
            created: created.count,
          } as object,
        },
      });

      return created;
    });

    return {
      totalStudents: classroom.students.length,
      created: result.count,
      skipped: classroom.students.length - result.count,
    };
  }
}
