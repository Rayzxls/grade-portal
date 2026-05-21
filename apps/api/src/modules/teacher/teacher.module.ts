import { Module } from '@nestjs/common';
import { TeacherController } from './presentation/teacher.controller';
import { ListMyResourcesUseCase } from './application/list-my-resources.use-case';
import { CreateMyClassroomUseCase } from './application/create-my-classroom.use-case';
import { CreateMyCourseUseCase } from './application/create-my-course.use-case';
import { BulkAddStudentsUseCase } from './application/bulk-add-students.use-case';
import { ClassroomWorkspaceUseCase } from './application/classroom-workspace.use-case';
import { ScoreSheetUseCase } from './application/score-sheet.use-case';
import { TeacherCrudUseCase } from './application/crud.use-case';
import { ScheduleUseCase } from './application/schedule.use-case';

@Module({
  controllers: [TeacherController],
  providers: [
    ListMyResourcesUseCase,
    CreateMyClassroomUseCase,
    CreateMyCourseUseCase,
    BulkAddStudentsUseCase,
    ClassroomWorkspaceUseCase,
    ScoreSheetUseCase,
    TeacherCrudUseCase,
    ScheduleUseCase,
  ],
})
export class TeacherModule {}
