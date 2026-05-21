import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  UpdateScheduleSettingsDto,
  CreateSchedulePeriodDto,
  UpdateSchedulePeriodDto,
  ListSchedulePeriodsDto,
  CopyScheduleDto,
  ScheduleSemester,
} from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class ScheduleUseCase {
  constructor(private prisma: PrismaService) {}

  private async getTeacher(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new NotFoundException('ไม่พบโปรไฟล์ครู');
    return teacher;
  }

  // ============ Settings ============
  async getSettings(userId: string) {
    const teacher = await this.getTeacher(userId);
    let settings = await this.prisma.scheduleSettings.findUnique({
      where: { teacherId: teacher.id },
    });
    if (!settings) {
      settings = await this.prisma.scheduleSettings.create({
        data: { teacherId: teacher.id },
      });
    }
    return settings;
  }

  async updateSettings(userId: string, dto: UpdateScheduleSettingsDto) {
    const teacher = await this.getTeacher(userId);
    await this.getSettings(userId); // ensure exists
    if (dto.startHour != null && dto.endHour != null && dto.endHour <= dto.startHour) {
      throw new ConflictException('endHour ต้องมากกว่า startHour');
    }
    return this.prisma.scheduleSettings.update({
      where: { teacherId: teacher.id },
      data: dto,
    });
  }

  // ============ Periods ============
  async listPeriods(userId: string, query: ListSchedulePeriodsDto) {
    const teacher = await this.getTeacher(userId);
    return this.prisma.schedulePeriod.findMany({
      where: {
        teacherId: teacher.id,
        academicYear: query.academicYear,
        semester: query.semester,
      },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        classroom: { select: { id: true, gradeLevel: true, section: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinutes: 'asc' }],
    });
  }

  private async assertNoOverlap(
    teacherId: string,
    academicYear: number,
    semester: ScheduleSemester,
    dayOfWeek: number,
    startMinutes: number,
    endMinutes: number,
    excludeId?: string,
  ) {
    const overlap = await this.prisma.schedulePeriod.findFirst({
      where: {
        teacherId,
        academicYear,
        semester,
        dayOfWeek,
        id: excludeId ? { not: excludeId } : undefined,
        startMinutes: { lt: endMinutes },
        endMinutes: { gt: startMinutes },
      },
      select: { id: true, startMinutes: true, endMinutes: true, title: true, subjectId: true },
    });
    if (overlap) {
      throw new ConflictException({
        message: 'คาบนี้ทับซ้อนกับคาบอื่นในวันเดียวกัน',
        conflict: overlap,
      });
    }
  }

  private async assertOwnership(
    teacherId: string,
    subjectId?: string | null,
    classroomId?: string | null,
  ) {
    if (subjectId) {
      const subject = await this.prisma.course.findUnique({ where: { id: subjectId } });
      if (!subject) throw new NotFoundException('ไม่พบรายวิชา');
      if (subject.teacherId !== teacherId) throw new ForbiddenException('ไม่ใช่วิชาของคุณ');
    }
    if (classroomId) {
      const classroom = await this.prisma.classroom.findUnique({ where: { id: classroomId } });
      if (!classroom) throw new NotFoundException('ไม่พบห้องเรียน');
      // ครูสามารถใช้ห้องไหนก็ได้ในตารางสอน (ไม่ต้องเป็น homeroom)
    }
  }

  async createPeriod(userId: string, dto: CreateSchedulePeriodDto) {
    const teacher = await this.getTeacher(userId);
    await this.assertOwnership(teacher.id, dto.subjectId, dto.classroomId);
    await this.assertNoOverlap(
      teacher.id,
      dto.academicYear,
      dto.semester,
      dto.dayOfWeek,
      dto.startMinutes,
      dto.endMinutes,
    );
    return this.prisma.schedulePeriod.create({
      data: {
        teacherId: teacher.id,
        academicYear: dto.academicYear,
        semester: dto.semester,
        dayOfWeek: dto.dayOfWeek,
        startMinutes: dto.startMinutes,
        endMinutes: dto.endMinutes,
        kind: dto.kind,
        subjectId: dto.subjectId ?? null,
        classroomId: dto.classroomId ?? null,
        room: dto.room ?? null,
        title: dto.title ?? null,
        color: dto.color,
        note: dto.note ?? null,
      },
    });
  }

  async updatePeriod(userId: string, id: string, dto: UpdateSchedulePeriodDto) {
    const teacher = await this.getTeacher(userId);
    const existing = await this.prisma.schedulePeriod.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('ไม่พบคาบนี้');
    if (existing.teacherId !== teacher.id) throw new ForbiddenException();

    await this.assertOwnership(teacher.id, dto.subjectId, dto.classroomId);

    const newStart = dto.startMinutes ?? existing.startMinutes;
    const newEnd = dto.endMinutes ?? existing.endMinutes;
    const newDay = dto.dayOfWeek ?? existing.dayOfWeek;
    const newYear = dto.academicYear ?? existing.academicYear;
    const newSem = (dto.semester ?? existing.semester) as ScheduleSemester;
    if (newEnd <= newStart) throw new ConflictException('endMinutes ต้องมากกว่า startMinutes');

    await this.assertNoOverlap(teacher.id, newYear, newSem, newDay, newStart, newEnd, id);

    return this.prisma.schedulePeriod.update({
      where: { id },
      data: dto as any,
    });
  }

  async deletePeriod(userId: string, id: string) {
    const teacher = await this.getTeacher(userId);
    const existing = await this.prisma.schedulePeriod.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('ไม่พบคาบนี้');
    if (existing.teacherId !== teacher.id) throw new ForbiddenException();
    await this.prisma.schedulePeriod.delete({ where: { id } });
    return { ok: true };
  }

  async copySchedule(userId: string, dto: CopyScheduleDto) {
    const teacher = await this.getTeacher(userId);
    const source = await this.prisma.schedulePeriod.findMany({
      where: {
        teacherId: teacher.id,
        academicYear: dto.fromYear,
        semester: dto.fromSemester,
      },
    });
    if (source.length === 0) {
      throw new NotFoundException('ไม่พบคาบในต้นทาง');
    }
    // ลบของปลายทางก่อน เพื่อกัน overlap
    await this.prisma.schedulePeriod.deleteMany({
      where: {
        teacherId: teacher.id,
        academicYear: dto.toYear,
        semester: dto.toSemester,
      },
    });
    await this.prisma.schedulePeriod.createMany({
      data: source.map((p) => ({
        teacherId: teacher.id,
        academicYear: dto.toYear,
        semester: dto.toSemester,
        dayOfWeek: p.dayOfWeek,
        startMinutes: p.startMinutes,
        endMinutes: p.endMinutes,
        kind: p.kind,
        subjectId: p.subjectId,
        classroomId: p.classroomId,
        room: p.room,
        title: p.title,
        color: p.color,
        note: p.note,
      })),
    });
    return { copied: source.length };
  }
}
