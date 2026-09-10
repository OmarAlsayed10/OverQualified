CREATE TABLE "JobBoardSource" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "country" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastJobCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobBoardSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobBoardSource_provider_slug_key" ON "JobBoardSource" ("provider", "slug");

CREATE INDEX "JobBoardSource_provider_active_idx" ON "JobBoardSource" ("provider", "active");
