import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  createUserSchema,
  createCourseSchema,
  createTermSchema,
  createEnrollmentSchema,
  type CreateUserDto,
  type CreateCourseDto,
  type CreateTermDto,
  type CreateEnrollmentDto,
} from '@grade/shared';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { CreateCourseUseCase } from '../application/create-course.use-case';
import { CreateTermUseCase } from '../application/create-term.use-case';
import { CreateEnrollmentUseCase } from '../application/create-enrollment.use-case';
import { ListResourcesUseCase } from '../application/list-resources.use-case';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private createUser: CreateUserUseCase,
    private createCourse: CreateCourseUseCase,
    private createTerm: CreateTermUseCase,
    private createEnrollment: CreateEnrollmentUseCase,
    private list: ListResourcesUseCase,
  ) {}

  // ------- LIST -------
  @Get('users')        users()        { return this.list.listUsers(); }
  @Get('courses')      courses()      { return this.list.listCourses(); }
  @Get('terms')        terms()        { return this.list.listTerms(); }
  @Get('enrollments')  enrollments()  { return this.list.listEnrollments(); }
  @Get('audit-logs')   auditLogs(): Promise<unknown[]> { return this.list.listAuditLogs(); }

  // ------- CREATE -------
  @Post('users')
  user(@Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto) {
    return this.createUser.execute(dto);
  }

  @Post('courses')
  course(@Body(new ZodValidationPipe(createCourseSchema)) dto: CreateCourseDto) {
    return this.createCourse.execute(dto);
  }

  @Post('terms')
  term(@Body(new ZodValidationPipe(createTermSchema)) dto: CreateTermDto) {
    return this.createTerm.execute(dto);
  }

  @Post('enrollments')
  enrollment(@Body(new ZodValidationPipe(createEnrollmentSchema)) dto: CreateEnrollmentDto) {
    return this.createEnrollment.execute(dto);
  }
}
