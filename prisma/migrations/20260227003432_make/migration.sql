/*
  Warnings:

  - You are about to drop the column `address` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `tenants` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "tenants_slug_key";

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "address",
DROP COLUMN "country",
DROP COLUMN "slug";
