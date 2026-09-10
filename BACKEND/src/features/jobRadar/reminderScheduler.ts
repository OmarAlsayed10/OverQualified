import prisma from "../../lib/prisma";
import { emailService } from "../../shared/emailService";
import { logger } from "../../lib/logger";

export const checkDueReminders = async (): Promise<number> => {
  const now = new Date();
  const dueMatches = await (prisma.jobMatch as any).findMany({
    where: {
      reminderAt: { lte: now },
      reminderSent: false,
    },
    include: {
      user: {
        select: { email: true, firstName: true },
      },
    },
  });

  let count = 0;
  for (const match of dueMatches as any[]) {
    try {
      if (match.user?.email) {
        await emailService.sendApplicationReminder(
          match.user.email,
          match.user.firstName || "Job Seeker",
          match.title,
          match.company,
          match.id,
          match.notes
        );
      }
      await (prisma.jobMatch as any).update({
        where: { id: match.id },
        data: { reminderSent: true },
      });
      count++;
    } catch (err) {
      logger.error(`[reminderScheduler] Failed to process reminder for match ${match.id}:`, err);
    }
  }

  return count;
};
