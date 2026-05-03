-- CreateTable
CREATE TABLE "portfolio_ai_analyses" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "analysis" JSONB NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ollama',
    "model" TEXT NOT NULL DEFAULT 'llama3.1:8b',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolio_ai_analyses_tenantId_idx" ON "portfolio_ai_analyses"("tenantId");

-- AddForeignKey
ALTER TABLE "portfolio_ai_analyses" ADD CONSTRAINT "portfolio_ai_analyses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
