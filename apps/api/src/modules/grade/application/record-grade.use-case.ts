import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { scoreToLetter, letterToGradePoint, type CreateGradeDto } from '@grade/shared';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { IGradeRepository } from '../domain/grade-repository.interface';

@Injectable()
export class RecordGradeUseCase {
  constructor(
    private prisma: PrismaService,
    private repo: IGradeRepository,
  ) {}

  async execute(dto: CreateGradeDto, teacherUserId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: {
        course: true,
        student: { include: { classroom: true } },
      },
    });
    if (!enrollment) throw new NotFoundException('ไม่พบรายการลงทะเบียน');

    const actor = await this.prisma.user.findUnique({
      where: { id: teacherUserId },
      include: { teacher: true },
    });
    if (!actor) throw new NotFoundException('ไม่พบผู้ใช้');

    if (actor.role !== 'ADMIN') {
      if (actor.role === 'TEACHER' && actor.teacher) {
        const isCourseTeacher = enrollment.course.teacherId === actor.teacher.id;
        const isHomeroomTeacher = enrollment.student.classroom?.homeroomTeacherId === actor.teacher.id;
        if (!isCourseTeacher && !isHomeroomTeacher) {
          throw new ForbiddenException('ไม่มีสิทธิ์บันทึกเกรดสำหรับวิชานี้');
        }
      } else {
        throw new ForbiddenException('ไม่มีสิทธิ์บันทึกเกรด');
      }
    }

    const letter = scoreToLetter(dto.score);
    const gradePoint = letterToGradePoint(letter) ?? 0;

    const created = await this.prisma.$transaction(async (tx) => {
      const grade = await tx.grade.create({
        data: {
          enrollmentId: dto.enrollmentId,
          studentId: enrollment.studentId,
          score: dto.score,
          letter,
          gradePoint,
          recordedById: teacherUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: teacherUserId,
          action: 'GRADE_CREATE',
          entityType: 'Grade',
          entityId: grade.id,
          after: { score: dto.score, letter, gradePoint } as object,
        },
      });

      return grade;
    });

    return created;
  }
}
