import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class ListResourcesUseCase {
  constructor(private prisma: PrismaService) {}

  listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            studentCode: true,
            enrollYear: true,
            classroom: { select: { gradeLevel: true, section: true, academicYear: true } },
          },
        },
        teacher: { select: { id: true, staffCode: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * รายชื่อนักเรียน — paginated + search
   * @param opts.page เริ่มที่ 1
   * @param opts.pageSize default 20, max 100
   * @param opts.search ค้นชื่อ / รหัสนักเรียน / email
   * @param opts.classroomId กรอง classroom (optional)
   */
  async listStudents(opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    classroomId?: string;
  } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const search = opts.search?.trim();

    const where: any = {};
    if (opts.classroomId) where.classroomId = opts.classroomId;
    if (search) {
      where.OR = [
        { studentCode: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: {
          user: { select: { fullName: true, email: true } },
          classroom: { select: { gradeLevel: true, section: true, academicYear: true } },
          _count: { select: { grades: true, enrollments: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ classroom: { gradeLevel: 'asc' } }, { studentCode: 'asc' }],
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items: items.map((s) => ({
        id: s.id,
        studentCode: s.studentCode,
        fullName: s.user.fullName,
        email: s.user.email,
        enrollYear: s.enrollYear,
        classroom: s.classroom
          ? `${s.classroom.gradeLevel}/${s.classroom.section}`
          : null,
        academicYear: s.classroom?.academicYear ?? null,
        gradeCount: s._count.grades,
        enrollmentCount: s._count.enrollments,
      })),
    };
  }

  listClassrooms() {
    return this.prisma.classroom.findMany({
      include: {
        homeroomTeacher: { include: { user: { select: { fullName: true } } } },
        _count: { select: { students: true } },
      },
      orderBy: [{ academicYear: 'desc' }, { gradeLevel: 'asc' }, { section: 'asc' }],
    });
  }

  listCourses() {
    return this.prisma.course.findMany({
      include: { teacher: { include: { user: { select: { fullName: true } } } } },
      orderBy: { code: 'asc' },
    });
  }

  listTerms() {
    return this.prisma.academicTerm.findMany({
      orderBy: [{ year: 'desc' }, { semester: 'asc' }],
    });
  }

  listEnrollments() {
    return this.prisma.enrollment.findMany({
      include: {
        student: { select: { studentCode: true, user: { select: { fullName: true } } } },
        course: { select: { code: true, name: true } },
        term: { select: { year: true, semester: true } },
        grade: { select: { score: true, letter: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listAuditLogs(): Promise<unknown[]> {
    return this.prisma.auditLog.findMany({
      include: { actor: { select: { email: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
