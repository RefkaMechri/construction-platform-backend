/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `tenants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "address" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL,
ALTER COLUMN "modules" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
