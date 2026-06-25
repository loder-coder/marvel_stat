-- CreateTable
CREATE TABLE "HeroTranslation" (
    "heroId" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "roleKo" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeroTranslation_pkey" PRIMARY KEY ("heroId")
);
