CREATE TABLE "ExtensionPairing" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtensionPairing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExtensionPairing_code_key" ON "ExtensionPairing" ("code");

CREATE INDEX "ExtensionPairing_expiresAt_idx" ON "ExtensionPairing" ("expiresAt");
