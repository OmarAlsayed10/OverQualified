import { randomUUID } from "crypto";
import { Job, Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";

const MATCH_WRITE_BATCH_SIZE = 100;

export interface RankedJob {
  job: Job;
  fitScore: number;
  earlyBird: boolean;
}

const matchValue = (userId: string, ranked: RankedJob, refreshedAt: Date): Prisma.Sql =>
  Prisma.sql`(
    ${randomUUID()}, ${userId}, ${ranked.job.source}, ${ranked.job.externalId},
    ${ranked.job.title}, ${ranked.job.company}, ${ranked.job.location}, ${ranked.job.url},
    ${ranked.job.postedAt}, ${ranked.fitScore}, ${ranked.earlyBird}, ${refreshedAt}, ${refreshedAt}
  )`;

const persistMatchBatch = async (transaction: Prisma.TransactionClient, userId: string, ranked: RankedJob[], refreshedAt: Date): Promise<void> => {
  await transaction.$executeRaw(Prisma.sql`
    INSERT INTO "JobMatch" (
      "id", "userId", "source", "externalId", "title", "company", "location", "url",
      "postedAt", "fitScore", "earlyBird", "createdAt", "updatedAt"
    ) VALUES ${Prisma.join(ranked.map((job) => matchValue(userId, job, refreshedAt)))}
    ON CONFLICT ("userId", "source", "externalId") DO UPDATE SET
      "title" = EXCLUDED."title", "company" = EXCLUDED."company", "location" = EXCLUDED."location",
      "url" = EXCLUDED."url", "postedAt" = EXCLUDED."postedAt", "fitScore" = EXCLUDED."fitScore",
      "earlyBird" = EXCLUDED."earlyBird", "updatedAt" = EXCLUDED."updatedAt"
  `);
};

export const persistRankedMatches = async (userId: string, ranked: RankedJob[]): Promise<void> => {
  const refreshedAt = new Date();
  await prisma.$transaction(async (transaction) => {
    for (let offset = 0; offset < ranked.length; offset += MATCH_WRITE_BATCH_SIZE) {
      await persistMatchBatch(transaction, userId, ranked.slice(offset, offset + MATCH_WRITE_BATCH_SIZE), refreshedAt);
    }
    await transaction.jobMatch.deleteMany({
      where: { userId, status: "matched", updatedAt: { lt: refreshedAt } },
    });
  });
};
