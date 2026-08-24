import { createHash } from "crypto";
import { LEVELS, Level, ScoreBreakdown } from "./constants";
import { hasCache } from "../../lib/persistentCache";

export const CACHE_MAX = 500;
const SCORING_CACHE_VERSION = "2026-08-metrics-as-impact-bonus";
export const scoreCache = new Map<string, ScoreBreakdown>();
export function clearScoreCache(): void {
  scoreCache.clear();
}


export const hashCV = (text: string, jd: string) =>
  createHash("sha256")
    .update(`${SCORING_CACHE_VERSION} ${text.trim()} ${jd.trim()}`)
    .digest("hex");

const normLevel = (level: string) =>
  LEVELS.includes(level.trim() as Level) ? level.trim() : "";


export async function hasScore(
  text: string,
  targetRole = "",
  level = "",
  language = "en",
  pageCount = 0,
): Promise<boolean> {
  const key = hashCV(text, `${targetRole.trim()}|${normLevel(level)}|${language}|${pageCount}`);
  if (scoreCache.has(key)) return true;
  return hasCache(key);
}
