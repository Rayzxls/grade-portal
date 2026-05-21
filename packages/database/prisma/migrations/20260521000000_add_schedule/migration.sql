-- CreateEnum
CREATE TYPE "PeriodKind" AS ENUM ('TEACHING', 'ACTIVITY', 'SPECIAL');

-- CreateTable
CREATE TABLE "ScheduleSettings" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 7,
    "endHour" INTEGER NOT NULL DEFAULT 21,
    "periodMinutes" INTEGER NOT NULL DEFAULT 60,
    "showSaturday" BOOLEAN NOT NULL DEFAULT true,
    "showSunday" BOOLEAN NOT NULL DEFAULT false,
    "specialColLabel" TEXT NOT NULL DEFAULT 'กิจกรรมเข้าแถว',
    "specialColColor" TEXT NOT NULL DEFAULT '#FEF3C7',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulePeriod" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "semester" "Semester" NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "kind" "PeriodKind" NOT NULL DEFAULT 'TEACHING',
    "subjectId" TEXT,
    "classroomId" TEXT,
    "room" TEXT,
    "title" TEXT,
    "color" TEXT NOT NULL DEFAULT '#D1FAE5',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleSettings_teacherId_key" ON "ScheduleSettings"("teacherId");

-- CreateIndex
CREATE INDEX "SchedulePeriod_teacherId_academicYear_semester_idx" ON "SchedulePeriod"("teacherId", "academicYear", "semester");

-- CreateIndex
CREATE INDEX "SchedulePeriod_teacherId_dayOfWeek_idx" ON "SchedulePeriod"("teacherId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "ScheduleSettings" ADD CONSTRAINT "ScheduleSettings_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulePeriod" ADD CONSTRAINT "SchedulePeriod_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulePeriod" ADD CONSTRAINT "SchedulePeriod_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulePeriod" ADD CONSTRAINT "SchedulePeriod_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
