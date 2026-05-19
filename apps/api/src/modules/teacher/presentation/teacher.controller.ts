import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  teacherCreateClassroomSchema,
  teacherCreateCourseSchema,
  bulkAddStudentsSchema,
  type TeacherCreateClassroomDto,
  type TeacherCreateCourseDto,
  type BulkAddStudentsDto,
} from '@grade/shared';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { ListMyResourcesUseCase } from '../application/list-my-resources.use-case';
import { CreateMyClassroomUseCase } from '../application/create-my-classroom.use-case';
import { CreateMyCourseUseCase } from '../application/create-my-course.use-case';
import { BulkAddStudentsUseCase } from '../application/bulk-add-students.use-case';

@Controller('teacher')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('TEACHER', 'ADMIN')
export class TeacherController {
  constructor(
    private listMy: ListMyResourcesUseCase,
    private createClassroom: CreateMyClassroomUseCase,
    private createCourse: CreateMyCourseUseCase,
    private bulkAdd: BulkAddStudentsUseCase,
  ) {}

  @Get('classrooms')
  myClassrooms(@CurrentUser() user: AuthenticatedUser) {
    return this.listMy.listMyClassrooms(user.id);
  }

  @Get('courses')
  myCourses(@CurrentUser() user: AuthenticatedUser) {
    return this.listMy.listMyCourses(user.id);
  }

  @Post('classrooms')
  newClassroom(
    @Body(new ZodValidationPipe(teacherCreateClassroomSchema)) dto: TeacherCreateClassroomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createClassroom.execute(dto, user.id);
  }

  @Post('courses')
  newCourse(
    @Body(new ZodValidationPipe(teacherCreateCourseSchema)) dto: TeacherCreateCourseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createCourse.execute(dto, user.id);
  }

  @Post('students/bulk')
  bulkStudents(
    @Body(new ZodValidationPipe(bulkAddStudentsSchema)) dto: BulkAddStudentsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bulkAdd.execute(dto, user.id);
  }
}
