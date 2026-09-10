import { z } from "zod";

const score = (max: number) =>
  z.number().finite().min(0).max(max).transform((value) => Math.round(value));
const tip = z.string().trim().min(1).max(1500).nullable();
const blocker = z.enum(["content", "experience"]).nullable();

export const qualityScoresSchema = z
  .object({
    summaryQuality: score(10),
    summaryTip: tip,
    summaryBlocker: blocker,
    experienceQuality: score(10),
    experienceTip: tip,
    experienceBlocker: blocker,
    skillsRelevance: score(7),
    skillsTip: tip,
    keywordsQuality: score(10),
    keywordsTip: tip,
    grammarQuality: score(10),
    grammarTip: tip,
    candidateStrength: score(100),
    roleAlignment: score(100),
    levelMessage: z.string().trim().min(1).max(1000).nullable(),
    nextLevelTips: z.array(z.string().trim().min(1).max(1000)).max(3),
    skillLevel: z
      .enum(["foundational", "developing", "solid", "advanced", "expert"])
      .nullable(),
    levelReasons: z.array(z.string().trim().min(1).max(1000)).max(3),
  })
  .strip();
