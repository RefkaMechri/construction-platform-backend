-- AlterTable
ALTER TABLE "phases" ADD COLUMN     "baselineEndDate" TIMESTAMP(3),
ADD COLUMN     "baselineStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "baselineEndDate" TIMESTAMP(3),
ADD COLUMN     "baselineStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "baselineEndDate" TIMESTAMP(3),
ADD COLUMN     "baselineStartDate" TIMESTAMP(3);
