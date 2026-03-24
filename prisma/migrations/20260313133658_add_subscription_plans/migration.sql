-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL DEFAULT '/mois',
    "icon" TEXT NOT NULL DEFAULT 'box',
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "usersLimit" TEXT NOT NULL,
    "projectsLimit" TEXT NOT NULL,
    "storageLimit" TEXT NOT NULL,
    "supportType" TEXT NOT NULL,
    "features" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");
