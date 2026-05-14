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
        student: { select: { id: true, studentCode: true, major: true } },
        teacher: { select: { id: true, staffCode: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
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
