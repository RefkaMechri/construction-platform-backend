-- CreateTable
CREATE TABLE "planning_ai_analyses" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "analysis" JSONB NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ollama',
    "model" TEXT NOT NULL DEFAULT 'llama3.1:8b',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planning_ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planning_ai_analyses_projectId_idx" ON "planning_ai_analyses"("projectId");

-- AddForeignKey
ALTER TABLE "planning_ai_analyses" ADD CONSTRAINT "planning_ai_analyses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
