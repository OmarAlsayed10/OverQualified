ALTER TABLE "User" ADD COLUMN "learningConsent" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ExtensionAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionHash" TEXT NOT NULL,
    "questionLabel" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'generated',
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtensionAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExtensionAnswer_userId_questionHash_key" ON "ExtensionAnswer" ("userId", "questionHash");

CREATE INDEX "ExtensionAnswer_userId_updatedAt_idx" ON "ExtensionAnswer" ("userId", "updatedAt");

ALTER TABLE "ExtensionAnswer" ADD CONSTRAINT "ExtensionAnswer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
