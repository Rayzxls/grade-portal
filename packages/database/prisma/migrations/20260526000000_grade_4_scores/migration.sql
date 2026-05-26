-- AlterTable: add 4 score buckets (nullable for legacy rows)
ALTER TABLE "Grade" ADD COLUMN "quizScore"     DOUBLE PRECISION;
ALTER TABLE "Grade" ADD COLUMN "homeworkScore" DOUBLE PRECISION;
ALTER TABLE "Grade" ADD COLUMN "midtermScore"  DOUBLE PRECISION;
ALTER TABLE "Grade" ADD COLUMN "finalScore"    DOUBLE PRECISION;
