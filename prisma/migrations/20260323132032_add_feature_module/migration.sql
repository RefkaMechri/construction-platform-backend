/*
  Warnings:

  - You are about to drop the `FeatureModule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "FeatureModule";

-- CreateTable
CREATE TABLE "featureModule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'box',
    "category" TEXT,
    "isBaseModule" BOOLEAN NOT NULL DEFAULT false,
    "starterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "professionalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "enterpriseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featureModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "featureModule_name_key" ON "featureModule"("name");
