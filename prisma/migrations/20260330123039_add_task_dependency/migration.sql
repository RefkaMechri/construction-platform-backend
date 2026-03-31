-- CreateEnum
CREATE TYPE "TaskDependencyType" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH');

-- CreateTable
CREATE TABLE "task_dependencies" (
    "id" SERIAL NOT NULL,
    "predecessorTaskId" INTEGER NOT NULL,
    "successorTaskId" INTEGER NOT NULL,
    "type" "TaskDependencyType" NOT NULL DEFAULT 'FINISH_TO_START',
    "lagDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_dependencies_predecessorTaskId_idx" ON "task_dependencies"("predecessorTaskId");

-- CreateIndex
CREATE INDEX "task_dependencies_successorTaskId_idx" ON "task_dependencies"("successorTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_predecessorTaskId_successorTaskId_key" ON "task_dependencies"("predecessorTaskId", "successorTaskId");

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_predecessorTaskId_fkey" FOREIGN KEY ("predecessorTaskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_successorTaskId_fkey" FOREIGN KEY ("successorTaskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
