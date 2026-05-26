import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  createGradeSchema,
  updateGradeSchema,
  upsertGradeBucketsSchema,
  calculateGpa,
  type CreateGradeDto,
  type UpdateGradeDto,
  type UpsertGradeBucketsDto,
} from '@grade/shared';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { GetMyGradesUseCase } from '../application/get-my-grades.use-case';
import { RecordGradeUseCase } from '../application/record-grade.use-case';
import { UpdateGradeUseCase } from '../application/update-grade.use-case';
import { ListTeacherEnrollmentsUseCase } from '../application/list-teacher-enrollments.use-case';
import { UpsertGradeBucketsUseCase } from '../application/upsert-grade-buckets.use-case';
import { GetStudentGradesUseCase } from '../application/get-student-grades.use-case';

@Controller('grades')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class GradeController {
  constructor(
    private getMyGrades: GetMyGradesUseCase,
    private recordGrade: RecordGradeUseCase,
    private updateGrade: UpdateGradeUseCase,
    private listTeacherEnrollments: ListTeacherEnrollmentsUseCase,
    private upsertBuckets: UpsertGradeBucketsUseCase,
    private getStudentGrades: GetStudentGradesUseCase,
  ) {}

  // ─── สเปคโรงเรียน: บันทึกเกรดแบบ 4 ช่อง ───
  // POST /grades/upsert — รับ quizScore/HW/mid/final → คำนวณ total/letter/GPA อัตโนมัติ
  @Post('upsert')
  @Roles('TEACHER', 'ADMIN')
  upsertWithBuckets(
    @Body(new ZodValidationPipe(upsertGradeBucketsSchema)) dto: UpsertGradeBucketsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.upsertBuckets.execute(dto, user.id);
  }

  // GET /grades/student/:studentId — admin/teacher ดูเกรดของเด็กคนใดก็ได้
  @Get('student/:studentId')
  @Roles('TEACHER', 'ADMIN')
  studentGrades(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.getStudentGrades.execute(studentId, user.id);
  }

  // GET /reports/gpa/:studentId — GPA + breakdown
  @Get('reports/gpa/:studentId')
  @Roles('TEACHER', 'ADMIN')
  async gpaReport(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.getStudentGrades.execute(studentId, user.id);
    // group by term + คำนวณ GPA per term
    const termMap = new Map<string, { termId: string; year: number; semester: string; grades: typeof data.grades; gpa: number; credits: number }>();
    for (const g of data.grades) {
      const key = g.term.id;
      let bucket = termMap.get(key);
      if (!bucket) {
        bucket = { termId: g.term.id, year: g.term.year, semester: g.term.semester, grades: [], gpa: 0, credits: 0 };
        termMap.set(key, bucket);
      }
      bucket.grades.push(g);
    }
    for (const b of termMap.values()) {
      b.gpa = calculateGpa(b.grades.map((g) => ({ credits: g.credits, letter: g.letter })));
      b.credits = b.grades.reduce((s, g) => (g.letter === 'W' || g.letter === 'I' ? s : s + g.credits), 0);
    }
    return {
      profile: data.profile,
      gpax: data.gpa,
      totalCredits: data.totalCredits,
      byTerm: Array.from(termMap.values()).sort((a, b) => b.year - a.year || a.semester.localeCompare(b.semester)),
    };
  }

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
