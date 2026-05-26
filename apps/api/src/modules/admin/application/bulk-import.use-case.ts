import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type {
  BulkImportTeachersDto,
  BulkImportStudentsDto,
  BulkImportClassroomsDto,
} from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

const DEFAULT_PASSWORD = 'password123';
const EMAIL_DOMAIN = 'school.ac.th';

export interface BulkResult<T = unknown> {
  total: number;
  created: number;
  skipped: { row: number; reason: string; data: T }[];
}

/**
 * Bulk import — สำหรับ admin ที่ต้องเพิ่มข้อมูลทีละมากๆ (จาก CSV/Excel)
 * แต่ละ method:
 *  - เคย exists → ข้าม (รายงานใน skipped[])
 *  - field ขาด → reject ที่ Zod แล้ว
 *  - หา homeroom/classroom จาก email/triple → ผูกอัตโนมัติ
 */
@Injectable()
export class BulkImportUseCase {
  constructor(private prisma: PrismaService) {}

  async importTeachers(dto: BulkImportTeachersDto, actorUserId: string): Promise<BulkResult> {
    const result: BulkResult = { total: dto.teachers.length, created: 0, skipped: [] };
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    for (let i = 0; i < dto.teachers.length; i++) {
      const t = dto.teachers[i];
      try {
        const dupEmail = await this.prisma.user.findUnique({ where: { email: t.email } });
        if (dupEmail) { result.skipped.push({ row: i + 1, reason: 'อีเมลซ้ำ', data: t }); continue; }
        const dupCode = await this.prisma.teacher.findUnique({ where: { staffCode: t.staffCode } });
        if (dupCode) { result.skipped.push({ row: i + 1, reason: 'รหัสครูซ้ำ', data: t }); continue; }
        const hash = t.password ? await bcrypt.hash(t.password, 12) : passwordHash;
        await this.prisma.user.create({
          data: {
            email: t.email, passwordHash: hash, fullName: t.fullName, role: 'TEACHER',
            teacher: { create: { staffCode: t.staffCode, department: t.department ?? 'ทั่วไป' } },
          },
        });
        result.created++;
      } catch (e) {
        result.skipped.push({ row: i + 1, reason: e instanceof Error ? e.message : 'unknown', data: t });
      }
    }
    await this.prisma.auditLog.create({
      data: {
        actorId: actorUserId, action: 'BULK_IMPORT_TEACHERS', entityType: 'User', entityId: 'bulk',
        after: { created: result.created, skipped: result.skipped.length } as object,
      },
    });
    return result;
  }

  async importClassrooms(dto: BulkImportClassroomsDto, actorUserId: string): Promise<BulkResult> {
    const result: BulkResult = { total: dto.classrooms.length, created: 0, skipped: [] };
    for (let i = 0; i < dto.classrooms.length; i++) {
      const c = dto.classrooms[i];
      try {
        const exist = await this.prisma.classroom.findUnique({
          where: { gradeLevel_section_academicYear: { gradeLevel: c.gradeLevel, section: c.section, academicYear: c.academicYear } },
        });
        if (exist) { result.skipped.push({ row: i + 1, reason: 'มีห้องนี้แล้ว', data: c }); continue; }

        let homeroomTeacherId: string | null = null;
        if (c.homeroomTeacherEmail) {
          const teacher = await this.prisma.user.findUnique({
            where: { email: c.homeroomTeacherEmail },
            include: { teacher: true },
          });
          if (!teacher?.teacher) {
            result.skipped.push({ row: i + 1, reason: `ไม่พบครู email=${c.homeroomTeacherEmail}`, data: c });
            continue;
          }
          homeroomTeacherId = teacher.teacher.id;
        }

        await this.prisma.classroom.create({
          data: {
            gradeLevel: c.gradeLevel, section: c.section, academicYear: c.academicYear,
            homeroomTeacherId,
          },
        });
        result.created++;
      } catch (e) {
        result.skipped.push({ row: i + 1, reason: e instanceof Error ? e.message : 'unknown', data: c });
      }
    }
    await this.prisma.auditLog.create({
      data: {
        actorId: actorUserId, action: 'BULK_IMPORT_CLASSROOMS', entityType: 'Classroom', entityId: 'bulk',
        after: { created: result.created, skipped: result.skipped.length } as object,
      },
    });
    return result;
  }

  async importStudents(dto: BulkImportStudentsDto, actorUserId: string): Promise<BulkResult & { classroomsCreated: number }> {
    const result: BulkResult & { classroomsCreated: number } = {
      total: dto.students.length, created: 0, skipped: [], classroomsCreated: 0,
    };
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    // Cache classroom lookup-or-create
    const classroomCache = new Map<string, string>(); // key: gradeLevel|section|year → classroomId
    async function getOrCreateClassroom(prisma: PrismaService, gradeLevel: string, section: number, year: number) {
      const key = `${gradeLevel}|${section}|${year}`;
      if (classroomCache.has(key)) return classroomCache.get(key)!;
      let cr = await prisma.classroom.findUnique({
        where: { gradeLevel_section_academicYear: { gradeLevel, section, academicYear: year } },
      });
      if (!cr) {
        cr = await prisma.classroom.create({
          data: { gradeLevel, section, academicYear: year },
        });
        result.classroomsCreated++;
      }
      classroomCache.set(key, cr.id);
      return cr.id;
    }

    for (let i = 0; i < dto.students.length; i++) {
      const s = dto.students[i];
      try {
        const gradeLevel = s.gradeLevel ?? dto.defaultClassroom?.gradeLevel;
        const section = s.section ?? dto.defaultClassroom?.section;
        const academicYear = s.academicYear ?? dto.defaultClassroom?.academicYear;
        const enrollYear = s.enrollYear ?? academicYear ?? new Date().getFullYear() + 543;
        const email = s.email ?? `${s.studentCode}@${EMAIL_DOMAIN}`;

        // Check duplicates
        const dupCode = await this.prisma.student.findUnique({ where: { studentCode: s.studentCode } });
        if (dupCode) { result.skipped.push({ row: i + 1, reason: 'รหัสนักเรียนซ้ำ', data: s }); continue; }
        const dupEmail = await this.prisma.user.findUnique({ where: { email } });
        if (dupEmail) { result.skipped.push({ row: i + 1, reason: 'อีเมลซ้ำ', data: s }); continue; }

        // Resolve classroom (optional)
        let classroomId: string | null = null;
        if (gradeLevel && section && academicYear) {
          classroomId = await getOrCreateClassroom(this.prisma, gradeLevel, section, academicYear);
        }

        const hash = s.password ? await bcrypt.hash(s.password, 12) : passwordHash;

        // Create user + student + auto-enroll into active offerings (ScoreSheets ของห้อง)
        await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email, passwordHash: hash, fullName: s.fullName, role: 'STUDENT',
              student: {
                create: {
                  studentCode: s.studentCode,
                  enrollYear,
                  classroomId,
                },
              },
            },
            include: { student: true },
          });

          // Auto-enroll into all active offerings in this classroom
          if (classroomId && user.student) {
            const openSheets = await tx.scoreSheet.findMany({
              where: { classroomId, finalizedAt: null },
              select: { courseId: true, termId: true },
            });
            if (openSheets.length > 0) {
              await tx.enrollment.createMany({
                data: openSheets.map((sh) => ({
                  studentId: user.student!.id,
                  courseId: sh.courseId,
                  termId: sh.termId,
                })),
                skipDuplicates: true,
              });
            }
          }
        });
        result.created++;
      } catch (e) {
        result.skipped.push({ row: i + 1, reason: e instanceof Error ? e.message : 'unknown', data: s });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: actorUserId, action: 'BULK_IMPORT_STUDENTS', entityType: 'Student', entityId: 'bulk',
        after: { created: result.created, skipped: result.skipped.length, classroomsCreated: result.classroomsCreated } as object,
      },
    });
    return result;
  }
}
