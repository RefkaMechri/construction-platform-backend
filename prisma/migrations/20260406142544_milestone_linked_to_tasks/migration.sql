/*
  Warnings:

  - You are about to drop the column `phaseId` on the `milestones` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "MilestoneStatus" ADD VALUE 'READY_FOR_VALIDATION';

-- DropForeignKey
ALTER TABLE "milestones" DROP CONSTRAINT "milestones_phaseId_fkey";

-- DropIndex
DROP INDEX "milestones_phaseId_idx";

-- AlterTable
ALTER TABLE "milestones" DROP COLUMN "phaseId";

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "milestoneId" INTEGER;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
