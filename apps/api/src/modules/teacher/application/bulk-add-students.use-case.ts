import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { BulkAddStudentsDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export interface BulkAddResult {
  total: number;
  created: number;
  skipped: { studentCode: string; reason: string }[];
}

const DEFAULT_PASSWORD = 'password123';
const EMAIL_DOMAIN = 'school.ac.th';

@Injectable()
export class BulkAddStudentsUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(dto: BulkAddStudentsDto, actorUserId: string): Promise<BulkAddResult> {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: dto.classroomId },
      include: { homeroomTeacher: true },
    });
    if (!classroom) throw new NotFoundException('ไม่พบห้องเรียน');

    // ครูต้องเป็น homeroom ของห้องนั้น (admin ก็ผ่าน เพราะ admin มี homeroomTeacher === null check ใน controller layer)
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      include: { teacher: true },
    });
    if (!actor) throw new NotFoundException('ไม่พบผู้ใช้');

    if (actor.role === 'TEACHER') {
      if (!actor.teacher || classroom.homeroomTeacherId !== actor.teacher.id) {
        throw new ForbiddenException('คุณไม่ใช่ครูประจำชั้นของห้องนี้');
      }
    }

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const skipped: BulkAddResult['skipped'] = [];
    let created = 0;

    for (const row of dto.students) {
      const email = row.email ?? `${row.studentCode}@${EMAIL_DOMAIN}`;
      try {
        await this.prisma.$transaction(async (tx) => {
          const dupCode = await tx.student.findUnique({ where: { studentCode: row.studentCode } });
          if (dupCode) throw new Error('รหัสนักเรียนซ้ำ');
          const dupEmail = await tx.user.findUnique({ where: { email } });
          if (dupEmail) throw new Error('อีเมลซ้ำ');

          // Find all courses and terms already active in this classroom
          const classroomEnrollments = await tx.enrollment.findMany({
            where: {
              student: { classroomId: dto.classroomId },
            },
            select: {
              courseId: true,
              termId: true,
            },
            distinct: ['courseId', 'termId'],
          });

          const user = await tx.user.create({
            data: {
              email,
              passwordHash,
              fullName: row.fullName,
              role: 'STUDENT',
              student: {
                create: {
                  studentCode: row.studentCode,
                  enrollYear: row.enrollYear,
                  classroomId: dto.classroomId,
                },
              },
            },
            include: {
              student: true,
            },
          });

          // Auto-enroll newly created student into all active courses for the active terms
          if (user.student && classroomEnrollments.length > 0) {
            await tx.enrollment.createMany({
              data: classroomEnrollments.map((ce) => ({
                studentId: user.student!.id,
                courseId: ce.courseId,
                termId: ce.termId,
              })),
              skipDuplicates: true,
            });
          }

          await tx.auditLog.create({
            data: {
              actorId: actorUserId,
              action: 'STUDENT_BULK_ADD',
              entityType: 'Student',
              entityId: user.id,
              after: {
                studentCode: row.studentCode,
                classroomId: dto.classroomId,
                email,
              } as object,
            },
          });
        });
        created++;
      } catch (e) {
        skipped.push({
          studentCode: row.studentCode,
          reason: e instanceof Error ? e.message : 'unknown',
        });
      }
    }

    return { total: dto.students.length, created, skipped };
  }
}
