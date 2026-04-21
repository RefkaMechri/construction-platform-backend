/*
  Warnings:

  - Added the required column `section` to the `ProjectBudgetItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProjectBudgetItem" ADD COLUMN     "section" TEXT NOT NULL;
