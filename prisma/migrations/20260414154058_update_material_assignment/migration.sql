/*
  Warnings:

  - Added the required column `startDate` to the `MaterialAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `MaterialAssignment` table without a default value. This is not possible if the table is not empty.

*/

-- 1) Add columns as nullable first
ALTER TABLE "MaterialAssignment"
ADD COLUMN "startDate" TIMESTAMP(3),
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'RESERVED',
ADD COLUMN "updatedAt" TIMESTAMP(3);

-- 2) Backfill existing rows
UPDATE "MaterialAssignment"
SET
  "startDate" = "createdAt",
  "updatedAt" = NOW()
WHERE "startDate" IS NULL OR "updatedAt" IS NULL;

-- 3) Make the new columns required
ALTER TABLE "MaterialAssignment"
ALTER COLUMN "startDate" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;