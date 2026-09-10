import cron from "node-cron";
import prisma from "../lib/prisma";
import { emailService } from "./emailService";
import { refreshMatchesForUser } from "../features/jobRadar/jobRadarService";
import { ingestJobs } from "../features/jobRadar/jobIngestionService";
import { checkDueReminders } from "../features/jobRadar/reminderScheduler";
import { PAID_TIERS } from "./billing/entitlementService";
import { logger } from "../lib/logger";

export const startCronJobs = (): void => {
  // Every job here writes or emails, so running it in more than one process sends
  // each digest, expiry notice and reminder twice. Unset means "run" — the
  // single-instance default. Past one instance, set this to "true" on exactly one.
  if (process.env.CRON_ENABLED === "false") {
    logger.info("[cron] Scheduled jobs disabled on this instance (CRON_ENABLED=false)");
    return;
  }

  // Every 6 hours — refill the shared public job board from all sources.
  cron.schedule("0 */6 * * *", async () => {
    try {
      const ingestion = await ingestJobs();
      logger.info(`[cron] Job Radar pool persisted ${ingestion.persisted} jobs`, ingestion.providers);
    } catch (err) {
      logger.error("[cron] Job Radar pool ingest failed:", err);
    }
  });

  // Daily at 08:00 — refresh every active Job Radar profile and email a digest of top matches.
  cron.schedule("0 8 * * *", async () => {
    try {
      const prefs = await prisma.jobPreference.findMany({
        where: { active: true },
        include: { user: { select: { email: true, firstName: true } } },
      });

      for (const pref of prefs) {
        try {
          await refreshMatchesForUser(pref.userId);
          const top = await prisma.jobMatch.findMany({
            where: { userId: pref.userId, status: "matched", fitScore: { not: null } },
            orderBy: [{ earlyBird: "desc" }, { fitScore: "desc" }],
            take: 5,
          });
          const scoredTop = top.filter((match): match is typeof match & { fitScore: number } => match.fitScore !== null);
          if (scoredTop.length > 0) {
            await emailService.sendJobDigest(pref.user.email, pref.user.firstName, scoredTop);
          }
        } catch (err) {
          logger.error(`[cron] Job Radar failed for user ${pref.userId}:`, err);
        }
      }
      logger.info(`[cron] Job Radar processed ${prefs.length} profiles`);
    } catch (err) {
      logger.error("[cron] Job Radar batch failed:", err);
    }
  });

  // Daily at 09:00 — notify Pro users expiring in ~3 days
  cron.schedule("0 9 * * *", async () => {
    try {
      const now = new Date();
      const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const expiring = await prisma.user.findMany({
        where: {
          planTier: { in: [...PAID_TIERS] },
          proExpiresAt: { gte: in2Days, lte: in3Days },
        },
        select: { email: true, firstName: true, proExpiresAt: true },
      });

      for (const user of expiring) {
        const daysLeft = Math.ceil(
          (user.proExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        await emailService.sendProExpiringSoon(user.email, user.firstName, daysLeft);
      }

      if (expiring.length > 0) {
        logger.info(`[cron] Sent expiry notices to ${expiring.length} users`);
      }
    } catch (err) {
      logger.error("[cron] Pro expiry check failed:", err);
    }
  });

  // First boot on a fresh DB: populate the board once so it isn't empty until the 6h cron.
  prisma.job
    .count()
    .then((n) => {
      if (n === 0) {
        ingestJobs()
          .then((ingestion) => logger.info(`[cron] Job Radar pool seeded ${ingestion.persisted} jobs on boot`, ingestion.providers))
          .catch((e) => logger.error("[cron] Job Radar pool boot seed failed:", e));
      }
    })
    .catch(() => {});

  // Every 15 minutes — check due application follow-up reminders
  cron.schedule("*/15 * * * *", async () => {
    try {
      const count = await checkDueReminders();
      if (count > 0) {
        logger.info(`[cron] Sent ${count} application follow-up reminder email(s)`);
      }
    } catch (err) {
      logger.error("[cron] Reminder scheduler check failed:", err);
    }
  });

  logger.info("[cron] Scheduled jobs started");
};
