import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { RecordGradeUseCase } from './record-grade.use-case';

describe('RecordGradeUseCase', () => {
  const teacherUserId = 'teacher-1';
  let prisma: any;
  let repo: any;
  let useCase: RecordGradeUseCase;

  beforeEach(() => {
    prisma = {
      enrollment: { findUnique: vi.fn() },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) =>
        cb({
          grade: { create: vi.fn(async ({ data }) => ({ id: 'g1', ...data })) },
          auditLog: { create: vi.fn() },
        }),
      ),
    };
    repo = {};
    useCase = new RecordGradeUseCase(prisma, repo);
  });

  it('should throw when enrollment not found', async () => {
    prisma.enrollment.findUnique.mockResolvedValue(null);
    await expect(
      useCase.execute({ enrollmentId: 'x', score: 80 }, teacherUserId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should compute letter A and grade point 4.0 for score 85', async () => {
    prisma.enrollment.findUnique.mockResolvedValue({
      id: 'e1', studentId: 's1', course: { teacher: {} },
    });

    const result = await useCase.execute({ enrollmentId: 'e1', score: 85 }, teacherUserId);
    expect(result.letter).toBe('A');
    expect(result.gradePoint).toBe(4.0);
    expect(result.score).toBe(85);
  });

  it('should compute letter F for failing score', async () => {
    prisma.enrollment.findUnique.mockResolvedValue({
      id: 'e1', studentId: 's1', course: { teacher: {} },
    });
    const result = await useCase.execute({ enrollmentId: 'e1', score: 30 }, teacherUserId);
    expect(result.letter).toBe('F');
    expect(result.gradePoint).toBe(0);
  });
});
