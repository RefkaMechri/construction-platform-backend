-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "costUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "dailyCost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "costUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "dailyCost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "priceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "unitPrice" DOUBLE PRECISION;
