-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "sourceId" INTEGER,
ADD COLUMN     "sourceType" TEXT;

-- CreateIndex
CREATE INDEX "Notification_sourceType_sourceId_idx" ON "Notification"("sourceType", "sourceId");
