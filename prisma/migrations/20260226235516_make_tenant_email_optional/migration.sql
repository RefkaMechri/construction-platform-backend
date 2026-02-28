/*
  Warnings:

  - You are about to drop the column `email` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `tenants` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "tenants_email_key";

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "email",
DROP COLUMN "phone";
