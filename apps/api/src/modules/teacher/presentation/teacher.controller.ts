import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  teacherCreateClassroomSchema,
  teacherCreateCourseSchema,
  bulkAddStudentsSchema,
  addSubjectToClassroomSchema,
  saveScoresSchema,
  createScoreSheetSchema,
  addColumnSchema,
  updateColumnSchema,
  saveCellsSchema,
  updateClassroomSchema,
  updateCourseSchema,
  updateStudentSchema,
  createTermSchema,
  updateScheduleSettingsSchema,
  createSchedulePeriodSchema,
  updateSchedulePeriodSchema,
  listSchedulePeriodsSchema,
  copyScheduleSchema,
  type TeacherCreateClassroomDto,
  type TeacherCreateCourseDto,
  type BulkAddStudentsDto,
  type AddSubjectToClassroomDto,
  type SaveScoresDto,
  type CreateScoreSheetDto,
  type AddColumnDto,
  type UpdateColumnDto,
  type SaveCellsDto,
  type UpdateClassroomDto,
  type UpdateCourseDto,
  type UpdateStudentDto,
  type CreateTermDto,
  type UpdateScheduleSettingsDto,
  type CreateSchedulePeriodDto,
  type UpdateSchedulePeriodDto,
  type ListSchedulePeriodsDto,
  type CopyScheduleDto,
} from '@grade/shared';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { ListMyResourcesUseCase } from '../application/list-my-resources.use-case';
import { CreateMyClassroomUseCase } from '../application/create-my-classroom.use-case';
import { CreateMyCourseUseCase } from '../application/create-my-course.use-case';
import { BulkAddStudentsUseCase } from '../application/bulk-add-students.use-case';
import { ClassroomWorkspaceUseCase } from '../application/classroom-workspace.use-case';
import { ScoreSheetUseCase } from '../application/score-sheet.use-case';
import { TeacherCrudUseCase } from '../application/crud.use-case';
import { ScheduleUseCase } from '../application/schedule.use-case';
import { OfferingsUseCase } from '../application/offerings.use-case';

@Controller('teacher')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('TEACHER', 'ADMIN')
export class TeacherController {
  constructor(
    private listMy: ListMyResourcesUseCase,
    private createClassroom: CreateMyClassroomUseCase,
    private createCourse: CreateMyCourseUseCase,
    private bulkAdd: BulkAddStudentsUseCase,
    private workspace: ClassroomWorkspaceUseCase,
    private sheets: ScoreSheetUseCase,
    private crud: TeacherCrudUseCase,
    private schedule: ScheduleUseCase,
    private offerings: OfferingsUseCase,
  ) {}

  // ─── SubjectOffering: "ครู+วิชา+ห้อง+เทอม" เป็นตัวเดียวกัน ───
  @Get('offerings')
  myOfferings(@Query('termId') termId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.offerings.listMine(user.id, { termId });
  }

  @Get('offerings/:id')
  offeringDetail(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.offerings.getDetail(id, user.id);
  }

  // ---------- Schedule (Workspace) ----------
  @Get('schedule/settings')
  getScheduleSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.schedule.getSettings(user.id);
  }

  @Patch('schedule/settings')
  updateScheduleSettings(
    @Body(new ZodValidationPipe(updateScheduleSettingsSchema)) dto: UpdateScheduleSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedule.updateSettings(user.id, dto);
  }

  @Get('schedule/periods')
  listSchedulePeriods(
    @Query(new ZodValidationPipe(listSchedulePeriodsSchema)) query: ListSchedulePeriodsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedule.listPeriods(user.id, query);
  }

  @Post('schedule/periods')
  createSchedulePeriod(
    @Body(new ZodValidationPipe(createSchedulePeriodSchema)) dto: CreateSchedulePeriodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedule.createPeriod(user.id, dto);
  }

  @Patch('schedule/periods/:id')
  updateSchedulePeriod(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSchedulePeriodSchema)) dto: UpdateSchedulePeriodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedule.updatePeriod(user.id, id, dto);
  }

  @Delete('schedule/periods/:id')
  deleteSchedulePeriod(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.schedule.deletePeriod(user.id, id);
  }

  @Post('schedule/copy')
  copySchedule(
    @Body(new ZodValidationPipe(copyScheduleSchema)) dto: CopyScheduleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedule.copySchedule(user.id, dto);
  }

  // ---------- CRUD: Update + Delete ----------
  @Patch('classrooms/:id')
  patchClassroom(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateClassroomSchema)) dto: UpdateClassroomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) { return this.crud.updateClassroom(id, dto, user.id); }

  @Delete('classrooms/:id')
  delClassroom(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.crud.deleteClassroom(id, user.id);
  }

  @Patch('courses/:id')
  patchCourse(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCourseSchema)) dto: UpdateCourseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) { return this.crud.updateCourse(id, dto, user.id); }

  @Delete('courses/:id')
  delCourse(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.crud.deleteCourse(id, user.id);
  }

  @Patch('students/:id')
  patchStudent(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStudentSchema)) dto: UpdateStudentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) { return this.crud.updateStudent(id, dto, user.id); }

  @Delete('students/:id')
  delStudent(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.crud.deleteStudent(id, user.id);
  }

  @Post('students/:id/unassign')
  unassignStudent(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.crud.unassignStudent(id, user.id);
  }

  @Delete('sheets/:id')
  delSheet(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.crud.deleteSheet(id, user.id);
  }

  // ---------- ScoreSheet (Gradebook) ----------
  @Get('classrooms/:id/sheet')
  getSheet(
    @Param('id') id: string,
    @Query('courseId') courseId: string,
    @Query('termId') termId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheets.getSheet(id, courseId, termId, user.id);
  }

  @Post('classrooms/:id/sheet')
  createSheet(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createScoreSheetSchema)) dto: CreateScoreSheetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheets.create({ classroomId: id, ...dto }, user.id);
  }

  @Post('sheets/:sheetId/columns')
  addColumn(
    @Param('sheetId') sheetId: string,
    @Body(new ZodValidationPipe(addColumnSchema)) dto: AddColumnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheets.addColumn(sheetId, dto.name, dto.maxScore, user.id);
  }

  @Patch('sheets/:sheetId/columns/:columnId')
  updateColumn(
    @Param('sheetId') sheetId: string,
    @Param('columnId') columnId: string,
    @Body(new ZodValidationPipe(updateColumnSchema)) dto: UpdateColumnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheets.updateColumn(sheetId, columnId, dto, user.id);
  }

  @Delete('sheets/:sheetId/columns/:columnId')
  deleteColumn(
    @Param('sheetId') sheetId: string,
    @Param('columnId') columnId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheets.deleteColumn(sheetId, columnId, user.id);
  }

  @Post('sheets/:sheetId/cells')
  saveCells(
    @Param('sheetId') sheetId: string,
    @Body(new ZodValidationPipe(saveCellsSchema)) dto: SaveCellsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheets.saveCells(sheetId, dto.cells, user.id);
  }

  @Post('sheets/:sheetId/finalize')
  finalize(
    @Param('sheetId') sheetId: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheets.finalize(sheetId, user.id, force === 'true' || force === '1');
  }

  @Post('sheets/:sheetId/reopen')
  reopen(@Param('sheetId') sheetId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.sheets.reopen(sheetId, user.id);
  }

  // ---------- Workspace endpoints ----------
  @Get('terms')
  terms() { return this.workspace.listTerms(); }

  @Post('terms')
  newTerm(
    @Body(new ZodValidationPipe(createTermSchema)) dto: CreateTermDto,
  ) {
    return this.workspace.createTerm(dto);
  }

  @Get('classrooms/:id/subjects')
  subjects(
    @Param('id') id: string,
    @Query('termId') termId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspace.listSubjects(id, termId, user.id);
  }

  @Post('classrooms/:id/subjects')
  addSubject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addSubjectToClassroomSchema)) dto: AddSubjectToClassroomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspace.addSubject(id, dto.courseId, dto.termId, user.id);
  }

  @Delete('classrooms/:id/subjects')
  removeSubject(
    @Param('id') id: string,
    @Query('courseId') courseId: string,
    @Query('termId') termId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspace.removeSubject(id, courseId, termId, user.id);
  }

  @Get('classrooms/:id/scores')
  scores(
    @Param('id') id: string,
    @Query('courseId') courseId: string,
    @Query('termId') termId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspace.getScores(id, courseId, termId, user.id);
  }

  @Post('classrooms/:id/scores')
  saveScores(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveScoresSchema)) dto: SaveScoresDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspace.saveScores(id, dto.courseId, dto.termId, dto.items, user.id);
  }

  @Get('classrooms')
  myClassrooms(@CurrentUser() user: AuthenticatedUser) {
    return this.listMy.listMyClassrooms(user.id);
  }

  @Get('courses')
  myCourses(@CurrentUser() user: AuthenticatedUser) {
    return this.listMy.listMyCourses(user.id);
  }

  // ทุกวิชาในระบบที่ตรงกับชั้น (สำหรับครูประจำชั้นเลือกเปิดสอน)
  @Get('available-courses')
  availableCourses(@Query('gradeLevel') gradeLevel: string) {
    return this.listMy.listAvailableCoursesForGrade(gradeLevel);
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
