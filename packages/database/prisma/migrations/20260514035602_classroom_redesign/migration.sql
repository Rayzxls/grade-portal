/*
  Warnings:

  - You are about to drop the column `faculty` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `major` on the `Student` table. All the data in the column will be lost.
  - Added the required column `gradeLevel` to the `Course` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "gradeLevel" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "faculty",
DROP COLUMN "major",
ADD COLUMN     "classroomId" TEXT;

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "section" INTEGER NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "homeroomTeacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Classroom_academicYear_idx" ON "Classroom"("academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_gradeLevel_section_academicYear_key" ON "Classroom"("gradeLevel", "section", "academicYear");

-- CreateIndex
CREATE INDEX "Course_gradeLevel_idx" ON "Course"("gradeLevel");

-- CreateIndex
CREATE INDEX "Student_classroomId_idx" ON "Student"("classroomId");

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_homeroomTeacherId_fkey" FOREIGN KEY ("homeroomTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
