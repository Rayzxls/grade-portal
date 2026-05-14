import { Injectable } from '@nestjs/common';
import { IGradeRepository } from '../domain/grade-repository.interface';

@Injectable()
export class ListTeacherEnrollmentsUseCase {
  constructor(private repo: IGradeRepository) {}

  execute(teacherUserId: string) {
    return this.repo.findEnrollmentsByTeacherUserId(teacherUserId);
  }
}
