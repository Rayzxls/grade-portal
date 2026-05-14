import { Module } from '@nestjs/common';
import { GradeController } from './presentation/grade.controller';
import { GetMyGradesUseCase } from './application/get-my-grades.use-case';
import { RecordGradeUseCase } from './application/record-grade.use-case';
import { UpdateGradeUseCase } from './application/update-grade.use-case';
import { ListTeacherEnrollmentsUseCase } from './application/list-teacher-enrollments.use-case';
import { IGradeRepository } from './domain/grade-repository.interface';
import { PrismaGradeRepository } from './infrastructure/grade.repository';

@Module({
  controllers: [GradeController],
  providers: [
    GetMyGradesUseCase,
    RecordGradeUseCase,
    UpdateGradeUseCase,
    ListTeacherEnrollmentsUseCase,
    { provide: IGradeRepository, useClass: PrismaGradeRepository },
  ],
})
export class GradeModule {}
