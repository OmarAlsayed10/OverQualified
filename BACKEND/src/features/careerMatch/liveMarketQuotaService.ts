import prisma from "../../lib/prisma";
import { logger } from "../../lib/logger";

export const LIVE_MARKET_LIMITS: Record<string, number> = {
  basic: 0,
  pass: 3,
  pro: 10,
  ultra: 30,
};

interface PlanState {
  planTier: string;
  proExpiresAt: Date | null;
  role: string;
}

export interface LiveMarketStatus {
  tier: string;
  limit: number;
  used: number;
  remaining: number;
  period: string;
}

export class LiveMarketLimitError extends Error {
  readonly status: LiveMarketStatus;

  constructor(status: LiveMarketStatus) {
    super(status.limit === 0
      ? "Live market search is available on Pass, Pro, and Ultra. Role discovery without live search is still available."
      : "You have used all live market searches for this access period.");
    this.name = "LiveMarketLimitError";
    this.status = status;
  }
}

export const monthKeyFor = (now: Date) => now.toISOString().slice(0, 7);

export function effectiveLiveTier(user: PlanState, now = new Date()): string {
  if (user.role === "admin") return "admin";
  if (!user.proExpiresAt || user.proExpiresAt.getTime() <= now.getTime()) return "basic";
  return LIVE_MARKET_LIMITS[user.planTier] === undefined ? "basic" : user.planTier;
}

export function liveMarketPeriod(user: PlanState, now = new Date()): string {
  const tier = effectiveLiveTier(user, now);
  if (tier === "pass") return `pass:${user.proExpiresAt!.toISOString()}`;
  if (tier === "pro" || tier === "ultra") return `${tier}:${monthKeyFor(now)}`;
  return tier;
}

function statusFrom(user: PlanState & { liveMarketSearches: number; liveMarketPeriod: string | null }, now: Date): LiveMarketStatus {
  const tier = effectiveLiveTier(user, now);
  const period = liveMarketPeriod(user, now);
  const limit = tier === "admin" ? 999 : LIVE_MARKET_LIMITS[tier] ?? 0;
  const used = user.liveMarketPeriod === period ? user.liveMarketSearches : 0;
  return { tier, limit, used, remaining: Math.max(0, limit - used), period };
}

export async function getLiveMarketStatus(userId: string, now = new Date()): Promise<LiveMarketStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planTier: true, proExpiresAt: true, role: true, liveMarketSearches: true, liveMarketPeriod: true },
  });
  if (!user) throw new Error("User not found.");
  return statusFrom(user, now);
}

export async function reserveLiveMarketSearch(userId: string, now = new Date()): Promise<LiveMarketStatus> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<PlanState & { liveMarketSearches: number; liveMarketPeriod: string | null }>>`
      SELECT "planTier", "proExpiresAt", role, "liveMarketSearches", "liveMarketPeriod"
      FROM "User" WHERE id = ${userId} FOR UPDATE
    `;
    const user = rows[0];
    if (!user) throw new Error("User not found.");
    const current = statusFrom(user, now);
    if (current.remaining <= 0) throw new LiveMarketLimitError(current);
    if (current.tier === "admin") return current;

    const used = current.used + 1;
    await tx.user.update({
      where: { id: userId },
      data: { liveMarketSearches: used, liveMarketPeriod: current.period },
    });
    return { ...current, used, remaining: current.limit - used };
  });
}

export async function releaseLiveMarketSearch(userId: string, reservedPeriod: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ liveMarketSearches: number; liveMarketPeriod: string | null }>>`
        SELECT "liveMarketSearches", "liveMarketPeriod" FROM "User" WHERE id = ${userId} FOR UPDATE
      `;
      const user = rows[0];
      if (!user || user.liveMarketPeriod !== reservedPeriod || user.liveMarketSearches <= 0) return;
      await tx.user.update({
        where: { id: userId },
        data: { liveMarketSearches: user.liveMarketSearches - 1 },
      });
    });
  } catch (error) {
    logger.error("[career-match] failed to release live-search reservation:", (error as Error).message);
  }
}
