-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "siteManagerId" INTEGER;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_siteManagerId_fkey" FOREIGN KEY ("siteManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
