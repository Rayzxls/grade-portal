-- CreateTable
CREATE TABLE "ScoreSheet" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "ownerTeacherId" TEXT NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreColumn" (
    "id" TEXT NOT NULL,
    "scoreSheetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ScoreColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentScore" (
    "id" TEXT NOT NULL,
    "scoreSheetId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoreSheet_ownerTeacherId_idx" ON "ScoreSheet"("ownerTeacherId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreSheet_classroomId_courseId_termId_key" ON "ScoreSheet"("classroomId", "courseId", "termId");

-- CreateIndex
CREATE INDEX "ScoreColumn_scoreSheetId_idx" ON "ScoreColumn"("scoreSheetId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreColumn_scoreSheetId_order_key" ON "ScoreColumn"("scoreSheetId", "order");

-- CreateIndex
CREATE INDEX "StudentScore_scoreSheetId_idx" ON "StudentScore"("scoreSheetId");

-- CreateIndex
CREATE INDEX "StudentScore_studentId_idx" ON "StudentScore"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentScore_columnId_studentId_key" ON "StudentScore"("columnId", "studentId");

-- AddForeignKey
ALTER TABLE "ScoreSheet" ADD CONSTRAINT "ScoreSheet_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheet" ADD CONSTRAINT "ScoreSheet_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheet" ADD CONSTRAINT "ScoreSheet_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheet" ADD CONSTRAINT "ScoreSheet_ownerTeacherId_fkey" FOREIGN KEY ("ownerTeacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreColumn" ADD CONSTRAINT "ScoreColumn_scoreSheetId_fkey" FOREIGN KEY ("scoreSheetId") REFERENCES "ScoreSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentScore" ADD CONSTRAINT "StudentScore_scoreSheetId_fkey" FOREIGN KEY ("scoreSheetId") REFERENCES "ScoreSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentScore" ADD CONSTRAINT "StudentScore_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "ScoreColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentScore" ADD CONSTRAINT "StudentScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
