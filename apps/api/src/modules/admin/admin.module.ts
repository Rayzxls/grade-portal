import { Module } from '@nestjs/common';
import { AdminController } from './presentation/admin.controller';
import { CreateUserUseCase } from './application/create-user.use-case';
import { CreateCourseUseCase } from './application/create-course.use-case';
import { CreateTermUseCase } from './application/create-term.use-case';
import { CreateEnrollmentUseCase } from './application/create-enrollment.use-case';
import { CreateClassroomUseCase } from './application/create-classroom.use-case';
import { AssignStudentToClassroomUseCase } from './application/assign-student.use-case';
import { BulkEnrollClassroomUseCase } from './application/bulk-enroll-classroom.use-case';
import { ListResourcesUseCase } from './application/list-resources.use-case';
import { BulkAddStudentsUseCase } from '../teacher/application/bulk-add-students.use-case';

@Module({
  controllers: [AdminController],
  providers: [
    CreateUserUseCase,
    CreateCourseUseCase,
    CreateTermUseCase,
    CreateEnrollmentUseCase,
    CreateClassroomUseCase,
    AssignStudentToClassroomUseCase,
    BulkEnrollClassroomUseCase,
    BulkAddStudentsUseCase,
    ListResourcesUseCase,
  ],
})
export class AdminModule {}
