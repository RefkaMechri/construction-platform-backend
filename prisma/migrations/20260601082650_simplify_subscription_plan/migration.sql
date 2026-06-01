/*
  Warnings:

  - You are about to drop the column `isPopular` on the `SubscriptionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `storageLimit` on the `SubscriptionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `supportType` on the `SubscriptionPlan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SubscriptionPlan" DROP COLUMN "isPopular",
DROP COLUMN "storageLimit",
DROP COLUMN "supportType";
