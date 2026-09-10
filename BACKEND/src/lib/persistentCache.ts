import { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { logger } from "./logger";

// The AI caches were in-memory Maps, so nodemon restarts and every extra instance threw
// away paid results and re-ran the whole pipeline. Keys are unchanged — the hashes the
// callers already compute — so this is a second tier behind the Map, not a replacement.
// A cache failure must never fail an analysis, so every error here degrades to a miss.

export const readCache = async <T>(key: string): Promise<T | null> => {
  try {
    const row = await prisma.aiCache.findUnique({ where: { key } });
    return row ? (row.value as T) : null;
  } catch (error) {
    logger.error("[ai-cache] read failed", error);
    return null;
  }
};

export const writeCache = async (key: string, value: unknown): Promise<void> => {
  try {
    const stored = value as Prisma.InputJsonValue;
    await prisma.aiCache.upsert({
      where: { key },
      create: { key, value: stored },
      update: { value: stored },
    });
  } catch (error) {
    logger.error("[ai-cache] write failed", error);
  }
};

export const hasCache = async (key: string): Promise<boolean> => {
  try {
    return (await prisma.aiCache.count({ where: { key } })) > 0;
  } catch (error) {
    logger.error("[ai-cache] lookup failed", error);
    return false;
  }
};
