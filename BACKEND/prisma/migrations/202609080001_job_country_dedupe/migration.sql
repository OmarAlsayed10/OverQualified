ALTER TABLE "Job" ADD COLUMN "country" TEXT;
ALTER TABLE "Job" ADD COLUMN "dedupeKey" TEXT NOT NULL DEFAULT '';

CREATE INDEX "Job_dedupeKey_idx" ON "Job" ("dedupeKey");

CREATE INDEX "Job_country_postedAt_idx" ON "Job" ("country", "postedAt" DESC);

CREATE INDEX "Job_createdAt_idx" ON "Job" ("createdAt");
