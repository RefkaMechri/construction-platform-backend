/*
  Warnings:

  - You are about to drop the `ProjectBudget` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectBudgetItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProjectBudget" DROP CONSTRAINT "ProjectBudget_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectBudgetItem" DROP CONSTRAINT "ProjectBudgetItem_projectBudgetId_fkey";

-- DropTable
DROP TABLE "ProjectBudget";

-- DropTable
DROP TABLE "ProjectBudgetItem";

-- CreateTable
CREATE TABLE "project_budgets" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "directCostsTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "indirectCostsTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contingencyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contingencyUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_indirect_items" (
    "id" SERIAL NOT NULL,
    "projectBudgetId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_indirect_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_budgets_projectId_key" ON "project_budgets"("projectId");

-- CreateIndex
CREATE INDEX "budget_indirect_items_projectBudgetId_idx" ON "budget_indirect_items"("projectBudgetId");

-- CreateIndex
CREATE INDEX "budget_indirect_items_category_idx" ON "budget_indirect_items"("category");

-- AddForeignKey
ALTER TABLE "project_budgets" ADD CONSTRAINT "project_budgets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_indirect_items" ADD CONSTRAINT "budget_indirect_items_projectBudgetId_fkey" FOREIGN KEY ("projectBudgetId") REFERENCES "project_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
