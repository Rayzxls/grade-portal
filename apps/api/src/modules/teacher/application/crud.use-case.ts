import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UpdateClassroomDto, UpdateCourseDto, UpdateStudentDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class TeacherCrudUseCase {
  constructor(private prisma: PrismaService) {}

  private async actor(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { teacher: true },
    });
    if (!u) throw new NotFoundException('ไม่พบผู้ใช้');
    return u;
  }

  // ---------- Classroom ----------
  async updateClassroom(id: string, dto: UpdateClassroomDto, userId: string) {
    const actor = await this.actor(userId);
    const room = await this.prisma.classroom.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('ไม่พบห้องเรียน');
    if (actor.role === 'TEACHER' && room.homeroomTeacherId !== actor.teacher?.id) {
      throw new ForbiddenException('คุณไม่ใช่ครูประจำชั้นของห้องนี้');
    }
    try {
      return await this.prisma.classroom.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('ห้องนี้มีอยู่แล้วในปีการศึกษานี้');
      throw e;
    }
  }

  async deleteClassroom(id: string, userId: string) {
    const actor = await this.actor(userId);
    const room = await this.prisma.classroom.findUnique({
      where: { id },
      include: { _count: { select: { students: true, scoreSheets: true } } },
    });
    if (!room) throw new NotFoundException('ไม่พบห้องเรียน');
    if (actor.role === 'TEACHER' && room.homeroomTeacherId !== actor.teacher?.id) {
      throw new ForbiddenException('คุณไม่ใช่ครูประจำชั้นของห้องนี้');
    }
    if (room._count.students > 0) {
      throw new BadRequestException(
        `ลบไม่ได้ — มีนักเรียน ${room._count.students} คนในห้อง (ย้ายออกก่อน)`,
      );
    }
    if (room._count.scoreSheets > 0) {
      throw new BadRequestException(
        `ลบไม่ได้ — มีสมุดคะแนน ${room._count.scoreSheets} เล่มผูกอยู่`,
      );
    }
    await this.prisma.classroom.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- Course ----------
  async updateCourse(id: string, dto: UpdateCourseDto, userId: string) {
    const actor = await this.actor(userId);
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('ไม่พบรายวิชา');
    if (actor.role === 'TEACHER' && course.teacherId !== actor.teacher?.id) {
      throw new ForbiddenException('คุณไม่ใช่เจ้าของวิชานี้');
    }
    try {
      return await this.prisma.course.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('รหัสวิชานี้มีอยู่แล้ว');
      throw e;
    }
  }

  async deleteCourse(id: string, userId: string) {
    const actor = await this.actor(userId);
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true, scoreSheets: true } } },
    });
    if (!course) throw new NotFoundException('ไม่พบรายวิชา');
    if (actor.role === 'TEACHER' && course.teacherId !== actor.teacher?.id) {
      throw new ForbiddenException('คุณไม่ใช่เจ้าของวิชานี้');
    }
    if (course._count.enrollments > 0) {
      throw new BadRequestException(`ลบไม่ได้ — มีนักเรียน ${course._count.enrollments} คนลงทะเบียนอยู่`);
    }
    if (course._count.scoreSheets > 0) {
      throw new BadRequestException(`ลบไม่ได้ — มีสมุดคะแนน ${course._count.scoreSheets} เล่มผูกอยู่`);
    }
    await this.prisma.course.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- Student ----------
  private async assertStudentInMyRoom(studentId: string, actor: { role: string; teacher: { id: string } | null }) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { classroom: true },
    });
    if (!student) throw new NotFoundException('ไม่พบนักเรียน');
    if (actor.role === 'TEACHER') {
      if (!student.classroom || student.classroom.homeroomTeacherId !== actor.teacher?.id) {
        throw new ForbiddenException('นักเรียนคนนี้ไม่อยู่ในห้องที่คุณดูแล');
      }
    }
    return student;
  }

  async updateStudent(id: string, dto: UpdateStudentDto, userId: string) {
    const actor = await this.actor(userId);
    const student = await this.assertStudentInMyRoom(id, actor);
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.studentCode !== undefined || dto.enrollYear !== undefined) {
          await tx.student.update({
            where: { id },
            data: {
              ...(dto.studentCode !== undefined && { studentCode: dto.studentCode }),
              ...(dto.enrollYear !== undefined && { enrollYear: dto.enrollYear }),
            },
          });
        }
        if (dto.fullName !== undefined) {
          await tx.user.update({
            where: { id: student.userId },
            data: { fullName: dto.fullName },
          });
        }
        return tx.student.findUnique({
          where: { id },
          include: { user: { select: { fullName: true, email: true } } },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('รหัสนักเรียนนี้มีอยู่แล้ว');
      throw e;
    }
  }

  // ลบนักเรียน — ลบ User ทั้ง record (cascade student, enrollments, grades, scores)
  async deleteStudent(id: string, userId: string) {
    const actor = await this.actor(userId);
    const student = await this.assertStudentInMyRoom(id, actor);
    await this.prisma.user.delete({ where: { id: student.userId } });
    return { ok: true };
  }

  // ย้ายนักเรียนออกจากห้อง (ไม่ลบ user — แค่เคลียร์ classroomId)
  async unassignStudent(id: string, userId: string) {
    const actor = await this.actor(userId);
    await this.assertStudentInMyRoom(id, actor);
    await this.prisma.student.update({ where: { id }, data: { classroomId: null } });
    return { ok: true };
  }

  // ---------- ScoreSheet ----------
  async deleteSheet(id: string, userId: string) {
    const actor = await this.actor(userId);
    const sheet = await this.prisma.scoreSheet.findUnique({
      where: { id },
      include: { classroom: true },
    });
    if (!sheet) throw new NotFoundException('ไม่พบสมุดคะแนน');
    if (actor.role === 'TEACHER' && sheet.classroom.homeroomTeacherId !== actor.teacher?.id) {
      throw new ForbiddenException('คุณไม่ใช่ครูประจำชั้นของห้องนี้');
    }
    if (sheet.finalizedAt) {
      throw new BadRequestException('สมุดปิดเล่มแล้ว — กดเปิดเล่มใหม่ก่อนจึงจะลบได้');
    }
    await this.prisma.scoreSheet.delete({ where: { id } });
    return { ok: true };
  }
}
