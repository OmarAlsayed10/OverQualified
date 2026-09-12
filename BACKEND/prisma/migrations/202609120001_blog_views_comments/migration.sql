ALTER TABLE "Blog" ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "BlogComment" (
    "id" TEXT NOT NULL,
    "blogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BlogComment_blogId_approved_createdAt_idx" ON "BlogComment" ("blogId", "approved", "createdAt");

ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_blogId_fkey"
  FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
