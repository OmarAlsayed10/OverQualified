import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { careerMatchCachedPayloadSchema, CareerMatchCachedPayload } from "./careerMatchSchemas";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheInput {
  cvText: string;
  targetJobTitle: string;
  experienceLevel: string;
  jobDescription: string;
  useLiveMarket: boolean;
  language: "en" | "ar";
  pageCount: number;
}

const normalize = (value: string) => value.trim().replace(/\s+/g, " ");

export function careerMatchCacheKey(input: CacheInput): string {
  const canonical = JSON.stringify({
    contractVersion: 8,
    cvText: normalize(input.cvText),
    targetJobTitle: normalize(input.targetJobTitle).toLowerCase(),
    experienceLevel: normalize(input.experienceLevel).toLowerCase(),
    jobDescription: normalize(input.jobDescription),
    useLiveMarket: input.useLiveMarket,
    language: input.language,
    pageCount: input.pageCount,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export async function getCareerMatchCache(userId: string, cacheKey: string): Promise<CareerMatchCachedPayload | null> {
  const cached = await prisma.careerMatchCache.findUnique({
    where: { userId_cacheKey: { userId, cacheKey } },
  });
  if (!cached) return null;
  if (cached.expiresAt.getTime() <= Date.now()) {
    await prisma.careerMatchCache.delete({ where: { id: cached.id } });
    return null;
  }
  const parsed = careerMatchCachedPayloadSchema.safeParse(cached.response);
  if (!parsed.success) {
    await prisma.careerMatchCache.delete({ where: { id: cached.id } });
    return null;
  }
  return parsed.data;
}

export async function saveCareerMatchCache(
  userId: string,
  cacheKey: string,
  payload: CareerMatchCachedPayload,
  usesLiveSearch: boolean,
): Promise<void> {
  const response = payload as unknown as Prisma.InputJsonValue;
  await prisma.careerMatchCache.upsert({
    where: { userId_cacheKey: { userId, cacheKey } },
    create: { userId, cacheKey, response, usesLiveSearch, expiresAt: new Date(Date.now() + CACHE_TTL_MS) },
    update: { response, usesLiveSearch, expiresAt: new Date(Date.now() + CACHE_TTL_MS) },
  });
}
