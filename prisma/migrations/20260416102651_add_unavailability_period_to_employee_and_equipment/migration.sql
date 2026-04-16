-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "unavailabilityNote" TEXT,
ADD COLUMN     "unavailableFrom" TIMESTAMP(3),
ADD COLUMN     "unavailableTo" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "unavailabilityNote" TEXT,
ADD COLUMN     "unavailableFrom" TIMESTAMP(3),
ADD COLUMN     "unavailableTo" TIMESTAMP(3);
