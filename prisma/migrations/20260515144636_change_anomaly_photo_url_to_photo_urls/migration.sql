/*
  Warnings:

  - You are about to drop the column `photoUrl` on the `task_anomalies` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "task_anomalies" DROP COLUMN "photoUrl",
ADD COLUMN     "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
