import { Module } from '@nestjs/common';
import { AdminController } from './presentation/admin.controller';
import { CreateUserUseCase } from './application/create-user.use-case';
import { CreateCourseUseCase } from './application/create-course.use-case';
import { CreateTermUseCase } from './application/create-term.use-case';
import { CreateEnrollmentUseCase } from './application/create-enrollment.use-case';
import { ListResourcesUseCase } from './application/list-resources.use-case';

@Module({
  controllers: [AdminController],
  providers: [
    CreateUserUseCase,
    CreateCourseUseCase,
    CreateTermUseCase,
    CreateEnrollmentUseCase,
    ListResourcesUseCase,
  ],
})
export class AdminModule {}
