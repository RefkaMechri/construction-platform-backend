-- CreateTable
CREATE TABLE "FeatureModule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'box',
    "category" TEXT,
    "isBaseModule" BOOLEAN NOT NULL DEFAULT false,
    "starterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "professionalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "enterpriseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureModule_name_key" ON "FeatureModule"("name");
