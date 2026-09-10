import prisma from "../../lib/prisma";
import { creditsForUsage, TokenUsage } from "../../features/payment/creditPricingService";
import { logger } from "../../lib/logger";

export const ANON_LIMIT = 1;

// `basic` must match User.credits' schema default: allowance() is what a revoked or
// downgraded account is reset to, and any higher number here would hand an ex-subscriber
// more free credits than a brand-new signup gets.
export const TIER_CREDITS: Record<string, number> = {
  basic: 20,
  pass: 1500,
  pro: 5000,
  ultra: 15000,
};
const REFILL_TIERS = new Set(["pro", "ultra"]);

export const allowance = (tier: string) => TIER_CREDITS[tier] ?? TIER_CREDITS.basic;
export const isRefillTier = (tier: string) => REFILL_TIERS.has(tier);
export const monthKey = () => new Date().toISOString().slice(0, 7);

// Credits normalize Groq cost to a shared balance: 1 credit ≈ $0.0001 of spend.
// 70b tokens cost ~10× an 8b token, so they burn credits faster.
export const creditCost = (model: string, usage: TokenUsage): number =>
  creditsForUsage(model, usage);

const nextMonthReset = (): string => {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
};
const nextMonthResetAt = (): string => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
};

export type QuotaErrorCode = "CREDITS_EXHAUSTED" | "ANON_ANALYSIS_LIMIT" | "USER_NOT_FOUND";


export interface Identity {
  userId?: string;
  ip: string;
}

interface QuotaResult {
  ok: boolean;
  code?: QuotaErrorCode;
  message?: string;
}

// Pro/Ultra refill monthly — before a period rolls over, the balance is effectively
// their full allowance again even though the DB still holds last month's number.
export const effectiveCredits = (user: { planTier: string; credits: number; creditPeriod: string | null }) =>
  isRefillTier(user.planTier) && user.creditPeriod !== monthKey()
    ? allowance(user.planTier)
    : user.credits;

export const creditStatusForUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      planTier: true,
      credits: true,
      bonusCredits: true,
      creditPeriod: true,
      proExpiresAt: true,
    },
  });
  if (!user) return null;
  if (user.role === "admin") {
    return {
      identity: "user" as const,
      planTier: "admin",
      unlimited: true,
      baseCredits: null,
      bonusCredits: null,
      totalCredits: null,
      resetsAt: null,
      expiresAt: null,
    };
  }
  const baseCredits = effectiveCredits(user);
  return {
    identity: "user" as const,
    planTier: user.planTier,
    unlimited: false,
    baseCredits,
    bonusCredits: user.bonusCredits,
    totalCredits: baseCredits + user.bonusCredits,
    resetsAt: isRefillTier(user.planTier) ? nextMonthResetAt() : null,
    expiresAt: user.proExpiresAt?.toISOString() ?? null,
  };
};

export async function canSpend(id: Identity): Promise<QuotaResult> {
  if (id.userId) {
    const user = await prisma.user.findUnique({ where: { id: id.userId } });
    if (!user) return { ok: false, code: "USER_NOT_FOUND", message: "User not found." };
    if (user.role === "admin") return { ok: true };

    if (effectiveCredits(user) + user.bonusCredits > 0) return { ok: true };

    if (isRefillTier(user.planTier)) {
      return {
        ok: false,
        code: "CREDITS_EXHAUSTED",
        message: `You've used all your credits for this month. They reset on ${nextMonthReset()}, or buy a top-up now.`,
      };
    }
    return {
      ok: false,
      code: "CREDITS_EXHAUSTED",
      message: user.planTier === "basic"
        ? "You've used your free credits. Upgrade to Pro for more."
        : "You're out of credits. Buy a top-up or upgrade.",
    };
  }

  const rec = await prisma.ipAnalysisUsage.findUnique({ where: { ip: id.ip } });
  return (rec?.count ?? 0) < ANON_LIMIT
    ? { ok: true }
    : { ok: false, code: "ANON_ANALYSIS_LIMIT", message: "You've used your free analysis. Sign up for a free account to get more." };
}

// Deducts credits after an AI call. Drains the monthly balance first, then top-ups.
// Fire-and-forget from groqChat; a call that lands just over the balance is allowed
// (we can't know the token cost before the call) and clamps at zero.
// The read-compute-write runs inside a transaction that row-locks the user with
// SELECT ... FOR UPDATE, so concurrent AI calls serialize instead of clobbering
// each other's deduction (which previously let users double-spend).
export async function spendCredits(userId: string, credits: number): Promise<void> {
  if (credits <= 0) return;
  // Fire-and-forget from groqChat: a failed deduction must never crash the server (an unhandled
  // rejection would). Worst case the user under-pays for one call — logged, not fatal.
  try {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        {
          credits: number;
          bonusCredits: number;
          planTier: string;
          creditPeriod: string | null;
          role: string;
        }[]
      >`SELECT credits, "bonusCredits", "planTier", "creditPeriod", role FROM "User" WHERE id = ${userId} FOR UPDATE`;
      const user = rows[0];
      if (!user || user.role === "admin") return;

      let balance = user.credits;
      let period = user.creditPeriod;
      if (isRefillTier(user.planTier) && period !== monthKey()) {
        balance = allowance(user.planTier);
        period = monthKey();
      }

      let bonus = user.bonusCredits;
      let remaining = credits;
      const fromBalance = Math.min(balance, remaining);
      balance -= fromBalance;
      remaining -= fromBalance;
      bonus = Math.max(0, bonus - remaining);

      await tx.user.update({
        where: { id: userId },
        data: { credits: balance, bonusCredits: bonus, creditPeriod: period },
      });
    });
  } catch (err) {
    logger.error("[quota] spendCredits failed:", (err as Error).message);
  }
}

export async function canAnonAnalyze(ip: string): Promise<QuotaResult> {
  const rec = await prisma.ipAnalysisUsage.findUnique({ where: { ip } });
  return (rec?.count ?? 0) < ANON_LIMIT
    ? { ok: true }
    : { ok: false, code: "ANON_ANALYSIS_LIMIT", message: "You've used your free analysis. Sign up for a free account to get more." };
}

export async function consumeAnonAnalyze(ip: string): Promise<void> {
  await prisma.ipAnalysisUsage.upsert({
    where: { ip },
    create: { ip, count: 1 },
    update: { count: { increment: 1 } },
  });
}
