-- CreateEnum
CREATE TYPE "TaskAnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskAnomalyStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "task_anomalies" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "TaskAnomalySeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskAnomalyStatus" NOT NULL DEFAULT 'OPEN',
    "photoUrl" TEXT,
    "taskId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_anomalies_taskId_idx" ON "task_anomalies"("taskId");

-- CreateIndex
CREATE INDEX "task_anomalies_status_idx" ON "task_anomalies"("status");

-- CreateIndex
CREATE INDEX "task_anomalies_severity_idx" ON "task_anomalies"("severity");

-- AddForeignKey
ALTER TABLE "task_anomalies" ADD CONSTRAINT "task_anomalies_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
