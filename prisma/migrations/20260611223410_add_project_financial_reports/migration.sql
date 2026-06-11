-- CreateTable
CREATE TABLE "project_financial_reports" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "report" JSONB NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openrouter',
    "model" TEXT NOT NULL,
    "generatedBy" INTEGER,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_financial_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_financial_reports_projectId_idx" ON "project_financial_reports"("projectId");

-- AddForeignKey
ALTER TABLE "project_financial_reports" ADD CONSTRAINT "project_financial_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
