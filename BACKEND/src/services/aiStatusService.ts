import prisma from "../lib/prisma";
import { AI_MODELS } from "../config/aiModels";

// Durable per-day, per-model Groq usage tracker for the admin dashboard.
// Stored in the DB so counts survive server restarts/deploys. Groq's per-model
// budget resets at UTC midnight, so the row key is the UTC date.
const DAILY_TOKEN_LIMIT = Number(process.env.GROQ_DAILY_TOKEN_LIMIT) || 100000;

const utcDay = (): string => new Date().toISOString().slice(0, 10);

export async function recordUsage(model: string, totalTokens: number): Promise<void> {
  const day = utcDay();
  await prisma.aiUsage
    .upsert({
      where: { day_model: { day, model } },
      create: { day, model, tokens: totalTokens || 0, calls: 1 },
      update: { tokens: { increment: totalTokens || 0 }, calls: { increment: 1 } },
    })
    .catch(() => {});
}

export async function recordRateLimit(model: string): Promise<void> {
  const day = utcDay();
  await prisma.aiUsage
    .upsert({
      where: { day_model: { day, model } },
      create: { day, model, lastRateLimitAt: new Date() },
      update: { lastRateLimitAt: new Date() },
    })
    .catch(() => {});
}

export async function getAiStatus() {
  const day = utcDay();
  const rows = await prisma.aiUsage.findMany({ where: { day } });

  const keyCount = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3].filter(Boolean).length;

  const models = rows.map((r) => ({
    model: r.model,
    tokensToday: r.tokens,
    calls: r.calls,
    dailyLimit: DAILY_TOKEN_LIMIT,
    lastRateLimitAt: r.lastRateLimitAt ? r.lastRateLimitAt.getTime() : null,
    // The row is already scoped to today, so any rate-limit on it happened today.
    out: r.lastRateLimitAt !== null,
  }));

  return {
    day,
    dailyLimit: DAILY_TOKEN_LIMIT,
    models,
    limits: Object.fromEntries(
      Object.values(AI_MODELS)
        .filter((model) => model !== AI_MODELS.compoundMini)
        .flatMap((model) => Array.from({ length: keyCount }, (_, index) => [`${model}-key${index + 1}`, DAILY_TOKEN_LIMIT])),
    ),
    keysCount: {
      [AI_MODELS.versatile]: keyCount,
      [AI_MODELS.fast]: keyCount,
    }
  };
}
