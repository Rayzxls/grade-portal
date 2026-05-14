import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UpdateGradeUseCase } from './update-grade.use-case';

describe('UpdateGradeUseCase', () => {
  let prisma: any;
  let repo: any;
  let useCase: UpdateGradeUseCase;

  beforeEach(() => {
    prisma = {
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) =>
        cb({
          grade: { update: vi.fn(async ({ data }) => ({ id: 'g1', ...data })) },
          auditLog: { create: vi.fn() },
        }),
      ),
    };
    repo = { findById: vi.fn() };
    useCase = new UpdateGradeUseCase(prisma, repo);
  });

  it('should throw when grade not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(useCase.execute('g1', { score: 80 }, 'u1')).rejects.toThrow(NotFoundException);
  });

  it('should record audit log with before/after', async () => {
    repo.findById.mockResolvedValue({
      id: 'g1', score: 70, letter: 'B', gradePoint: 3.0,
    });

    let captured: any;
    prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        grade: { update: vi.fn(async ({ data }) => ({ id: 'g1', ...data })) },
        auditLog: { create: vi.fn(async (args: any) => { captured = args.data; }) },
      };
      return cb(tx);
    });

    await useCase.execute('g1', { score: 85 }, 'teacher-1');

    expect(captured.action).toBe('GRADE_UPDATE');
    expect(captured.before).toEqual({ score: 70, letter: 'B', gradePoint: 3.0 });
    expect(captured.after).toEqual({ score: 85, letter: 'A', gradePoint: 4.0 });
  });
});
