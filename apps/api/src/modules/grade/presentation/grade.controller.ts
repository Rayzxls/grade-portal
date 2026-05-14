import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  createGradeSchema,
  updateGradeSchema,
  type CreateGradeDto,
  type UpdateGradeDto,
} from '@grade/shared';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { GetMyGradesUseCase } from '../application/get-my-grades.use-case';
import { RecordGradeUseCase } from '../application/record-grade.use-case';
import { UpdateGradeUseCase } from '../application/update-grade.use-case';
import { ListTeacherEnrollmentsUseCase } from '../application/list-teacher-enrollments.use-case';

@Controller('grades')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class GradeController {
  constructor(
    private getMyGrades: GetMyGradesUseCase,
    private recordGrade: RecordGradeUseCase,
    private updateGrade: UpdateGradeUseCase,
    private listTeacherEnrollments: ListTeacherEnrollmentsUseCase,
  ) {}

  @Get('me')
  @Roles('STUDENT')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.getMyGrades.execute(user.id);
  }

  @Get('teacher/enrollments')
  @Roles('TEACHER', 'ADMIN')
  teacherEnrollments(@CurrentUser() user: AuthenticatedUser) {
    return this.listTeacherEnrollments.execute(user.id);
  }

  @Post()
  @Roles('TEACHER', 'ADMIN')
  create(
    @Body(new ZodValidationPipe(createGradeSchema)) dto: CreateGradeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recordGrade.execute(dto, user.id);
  }

  @Put(':id')
  @Roles('TEACHER', 'ADMIN')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateGradeSchema)) dto: UpdateGradeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateGrade.execute(id, dto, user.id);
  }
}
