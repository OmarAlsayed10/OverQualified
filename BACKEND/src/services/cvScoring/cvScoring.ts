import {
  ScoreBreakdown,
  ScoreCategory,
  ScoreDimension,
  LEVELS,
  Level,
  CATEGORY_OWNER,
  REQUIRED_STRENGTH,
  NEXT_LEVEL,
  LEVEL_YEAR_RANGE,
  LEVEL_YEAR_RANGE_AR,
  SKILL_LEVEL_AR,
} from "./constants";
import { hashCV, scoreCache, CACHE_MAX } from "./cache";
import { readCache, writeCache } from "../../lib/persistentCache";
import { Language } from "../../lib/aiLanguage";
import {
  scoreContact,
  scoreEducation,
  scoreATSFormatting,
  atsCompatibilityObjective,
  formattingLayoutObjective,
  grammarSpellingObjective,
  impactResultsScore,
  experienceObjective,
  contentQualityObjective,
  keywordMatchObjective,
} from "./objectiveScores";
import {
  yearsExperience,
  baseStrengthFromYears,
  levelFromYears,
  levelMessage,
} from "./levelModel";
import { gradeQuality } from "./llmGrader";

export async function scoreCVWithBreakdown(
  text: string,
  targetRole = "",
  level = "",
  language: Language = "en",
  pageCount = 0,
): Promise<ScoreBreakdown> {
  const isArabic = language === "ar";
  const role = targetRole.trim();
  const lvl = LEVELS.includes(level.trim() as Level) ? level.trim() : "";
  const key = hashCV(text, `${role}|${lvl}|${language}|${pageCount}`);
  const cached = scoreCache.get(key);
  if (cached) return cached;

  const stored = await readCache<ScoreBreakdown>(key);
  if (stored) {
    scoreCache.set(key, stored);
    return stored;
  }

  const contact = scoreContact(text, language);
  const education = scoreEducation(text, language);
  const ats = scoreATSFormatting(text, language);
  const atsCompatibility = atsCompatibilityObjective(text, language, pageCount);
  const formattingLayout = formattingLayoutObjective(text, language);
  const grammarSpelling = grammarSpellingObjective(text, language);
  const exp = experienceObjective(text, language);
  const summaryPresent = /\b(summary|profile|objective|about)\b/i.test(text)
    ? 5
    : 0;
  const skillsPresent =
    /\b(skills|technologies|competencies|tools|expertise)\b/i.test(text)
      ? 4
      : 0;
  const skillItems = (() => {
    const idx = text
      .split("\n")
      .findIndex((l) =>
        /\b(skills|technologies|competencies|tools)\b/i.test(l),
      );
    if (idx === -1) return 0;
    const block = text
      .split("\n")
      .slice(idx + 1, idx + 12)
      .join(", ");
    return block
      .split(/[,|•\n]/)
      .filter((s) => s.trim().length > 1 && s.trim().length < 40).length;
  })();
  const skillsCount = skillItems >= 8 ? 4 : skillItems >= 4 ? 2 : 0;

  // Narrow LLM call: quality sub-scores judged against the candidate's declared level.
  const q = await gradeQuality(text, role, lvl, language);

  const categories: ScoreCategory[] = [
    contact,
    {
      name: "Summary",
      earned: Math.min(15, summaryPresent + q.summaryQuality),
      max: 15,
      tip: summaryPresent === 0 ? "Add a Professional Summary" : q.summaryTip,
      blocker:
        summaryPresent + q.summaryQuality >= 15
          ? null
          : summaryPresent === 0
            ? "content"
            : q.summaryBlocker,
    },
    {
      name: "Work Experience",
      earned: Math.min(
        30,
        exp.base + exp.metric + exp.verb + q.experienceQuality,
      ),
      max: 30,
      tip: [...exp.tips, q.experienceTip].filter(Boolean).join(" · ") || null,
      blocker:
        exp.base + exp.metric + exp.verb + q.experienceQuality >= 30
          ? null
          : exp.tips.length
            ? "content"
            : q.experienceBlocker,
    },
    education,
    {
      name: "Skills",
      earned: Math.min(15, skillsPresent + skillsCount + q.skillsRelevance),
      max: 15,
      tip: skillsPresent === 0 ? "Add a Skills section" : q.skillsTip,
      blocker:
        skillsPresent + skillsCount + q.skillsRelevance >= 15
          ? null
          : "content",
    },
    ats,
    {
      name: "Keywords",
      earned: q.keywordsQuality ?? 5,
      max: 10,
      tip: q.keywordsTip,
      blocker: (q.keywordsQuality ?? 5) >= 10 ? null : "content",
    },
  ];

  categories.forEach((c) => {
    c.owner = CATEGORY_OWNER[c.name] ?? "user";
  });

  const IMPROVE_HINT_EN: Record<string, string> = {
    "Content Quality":
      "Clarify each role's scope and outcomes. Add a measurable result only when the candidate can verify the exact figure.",
    "ATS Compatibility":
      "Use standard section headings (Summary, Experience, Skills, Education) and a single-column layout so ATS parsers read every line.",
    "Keyword Match":
      "Mirror the exact tools and skills from your target job post — match their wording, not synonyms.",
    "Grammar & Spelling":
      "Proofread for punctuation, consistent tense, and spacing; read each bullet aloud to catch awkward phrasing.",
    "Formatting & Layout":
      "Keep one consistent bullet style, spacing, and date format, and order sections Summary → Experience → Skills → Education.",
    "Impact & Results":
      "Start each bullet with a strong action verb and describe the documented outcome. Include a metric only when the exact figure is verified.",
  };

  const IMPROVE_HINT_AR: Record<string, string> = {
    "Content Quality":
      "وضّح نطاق كل وظيفة ونتائجها، ولا تضف نتيجة رقمية إلا إذا كان المرشح يستطيع التحقق من الرقم بدقة.",
    "ATS Compatibility":
      "استخدم عناوين أقسام قياسية (Summary, Experience, Skills, Education) وتخطيطًا بعمود واحد حتى تقرأ أنظمة ATS كل سطر.",
    "Keyword Match":
      "استخدم نفس الأدوات والمهارات المذكورة حرفيًا في إعلان الوظيفة المستهدفة — طابق صياغتهم، لا المرادفات.",
    "Grammar & Spelling":
      "راجع علامات الترقيم واتساق الأزمنة والمسافات؛ اقرأ كل نقطة بصوت عالٍ لاكتشاف الصياغة الركيكة.",
    "Formatting & Layout":
      "حافظ على نمط نقاط ومسافات وتنسيق تاريخ موحد، ورتّب الأقسام Summary ← Experience ← Skills ← Education.",
    "Impact & Results":
      "ابدأ كل نقطة بفعل إنجاز قوي واشرح النتيجة الموثقة، ولا تذكر مقياسًا إلا إذا كان الرقم الدقيق مثبتًا.",
  };

  const IMPROVE_HINT = isArabic ? IMPROVE_HINT_AR : IMPROVE_HINT_EN;

  const fill = (name: string, score: number, base: string[]): string[] => {
    const out = [...base];
    // The example used to be appended to Impact on any score below 100, so a CV where every bullet
    // already opened with an action verb was still told to rewrite every bullet with an action
    // verb. It only makes sense when bullets are actually missing one.
    if (
      name === "Impact & Results" &&
      exp.noVerb > 0 &&
      !out.some((t) => /example|e\.g\./i.test(t))
    ) {
      out.push(IMPROVE_HINT[name]);
    }
    if (out.length > 0) return out;
    if (score >= 100)
      return [
        isArabic
          ? "ممتاز هنا — لا شيء يمنع الحصول على درجة كاملة."
          : "Strong here — nothing blocking a top score.",
      ];
    // This used to claim a perfect score was "reserved for exceptional writing", which is not a
    // rule the scoring implements — it is what gets shown when a dimension scored well and
    // reported no specific gap. Saying so beats inventing a cap that does not exist.
    if (score >= 85)
      return [
        isArabic
          ? "قوي — لم نرصد مشكلة محددة هنا."
          : "Strong — no specific issue flagged here.",
      ];
    return [IMPROVE_HINT[name]];
  };

  const mk = (
    name: string,
    score: number,
    base: (string | null | undefined)[],
  ): ScoreDimension => ({
    name,
    score,
    details: fill(
      name,
      score,
      base.filter((t): t is string => !!t),
    ),
  });

  const contentQuality = contentQualityObjective(text, exp, language);
  const keywordMatch = keywordMatchObjective(text, language);

  const dimensions: ScoreDimension[] = [
    mk("Content Quality", contentQuality.score, contentQuality.details),
    mk("ATS Compatibility", atsCompatibility.score, atsCompatibility.details),
    mk("Keyword Match", keywordMatch.score, keywordMatch.details),
    mk("Grammar & Spelling", grammarSpelling.score, grammarSpelling.details),
    mk("Formatting & Layout", formattingLayout.score, formattingLayout.details),
    mk(
      "Impact & Results",
      impactResultsScore(exp),
      exp.tips.filter((t) =>
        /quantif|number|percentage|action verb|metric|impact/i.test(t),
      ),
    ),
  ];

  // Headline reflects the breakdown the user actually sees: a weighted mean of the six
  // dimensions, so a low dimension (e.g. weak Impact) genuinely drags the total down.
  const DIM_WEIGHTS: Record<string, number> = {
    "Content Quality": 0.25,
    "Impact & Results": 0.2,
    "Keyword Match": 0.15,
    "ATS Compatibility": 0.15,
    "Formatting & Layout": 0.15,
    "Grammar & Spelling": 0.1,
  };
  const total = Math.round(
    dimensions.reduce((s, d) => s + d.score * (DIM_WEIGHTS[d.name] ?? 0), 0),
  );

  // Career strength is anchored to objective years of experience (primary signal),
  // nudged by the LLM's holistic read — so fit tracks real experience, not "nice CV".
  // Falls back to the years the CV states when no date range parses, so an unreadable date block
  // no longer drops a four-year engineer to Fresh.
  const yoe = yearsExperience(text);

  // Apply a direct skills modifier bonus/penalty to strength
  let skillBonus = 0;
  if (q.skillLevel === "expert") skillBonus = 12;
  else if (q.skillLevel === "advanced") skillBonus = 8;
  else if (q.skillLevel === "solid") skillBonus = 4;
  else if (q.skillLevel === "foundational") skillBonus = -6;

  const strength = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        baseStrengthFromYears(yoe) * 0.7 +
          q.candidateStrength * 0.3 +
          skillBonus,
      ),
    ),
  );

  // No level chosen → infer it from objective years of experience ALONE.
  const detected = !lvl;
  const effectiveLevel = lvl || levelFromYears(yoe);

  // Level fit ("how well you meet THIS level's bar") is kept as a separate readout, not the headline.
  const req = REQUIRED_STRENGTH[effectiveLevel] ?? 50;
  const ratio = strength / req;
  const levelFit = Math.round(
    ratio >= 1
      ? Math.min(100, 92 + (strength - req) * 0.4)
      : Math.max(5, 100 * Math.pow(ratio, 1.5)),
  );

  const result: ScoreBreakdown = { total, categories, dimensions };
  const belowBar = strength < req;
  // Below the target bar: aim tips at reaching THIS level. At/above it: aim at the next level up.
  const goalLevel = belowBar
    ? effectiveLevel
    : NEXT_LEVEL[effectiveLevel] || effectiveLevel;

  // Build human-readable reasons WHY this level was determined.
  const levelReasons: string[] = [];
  const roundedYoe = Math.round(yoe * 10) / 10;
  if (roundedYoe > 0) {
    levelReasons.push(
      isArabic
        ? `تم رصد ~${roundedYoe} سنة من الخبرة المهنية`
        : `~${roundedYoe} year${roundedYoe !== 1 ? "s" : ""} of professional experience detected`,
    );
  } else {
    levelReasons.push(
      isArabic
        ? "لم يتم رصد خبرة عملية مهنية — تم التقييم بناءً على المشاريع والتعليم والمهارات"
        : "No professional work experience detected — evaluated on projects, education, and skills",
    );
  }
  const expectedRange = isArabic
    ? LEVEL_YEAR_RANGE_AR[effectiveLevel]
    : LEVEL_YEAR_RANGE[effectiveLevel];
  if (expectedRange) {
    levelReasons.push(
      isArabic
        ? `مستوى ${effectiveLevel} يتطلب عادةً ${expectedRange} من الخبرة`
        : `${effectiveLevel} level typically requires ${expectedRange} of experience`,
    );
  }
  // Skill-level reason from LLM
  const skillLevel = q.skillLevel || null;
  if (skillLevel) {
    levelReasons.push(
      isArabic
        ? `تقييم المهارات: ${SKILL_LEVEL_AR[skillLevel] || skillLevel}`
        : `Skills assessment: ${skillLevel}`,
    );
  }
  // Add any LLM-provided reasons
  if (Array.isArray(q.levelReasons)) {
    for (const r of q.levelReasons.slice(0, 3)) {
      if (
        r &&
        !levelReasons.some((lr) =>
          lr.toLowerCase().includes(r.toLowerCase().slice(0, 30)),
        )
      ) {
        levelReasons.push(String(r));
      }
    }
  }

  result.levelContext = {
    role: role || "professional",
    level: effectiveLevel,
    fit: levelFit,
    detected,
    message: detected
      ? isArabic
        ? `بناءً على خبرتك ومهاراتك، سيرتك الذاتية تقع في مستوى ${effectiveLevel}${role ? ` ${role}` : ""}.`
        : `Based on your experience and skills, this CV reads as ${effectiveLevel} level${role ? ` ${role}` : ""}.`
      : levelMessage(effectiveLevel, levelFit, strength, role, language),
    nextLevel: goalLevel,
    nextLevelTips: q.nextLevelTips || [],
    belowBar,
    yearsOfExperience: roundedYoe,
    levelReasons,
    skillLevel: skillLevel || undefined,
  };

  if (scoreCache.size >= CACHE_MAX)
    scoreCache.delete(scoreCache.keys().next().value!);
  scoreCache.set(key, result);
  await writeCache(key, result);
  return result;
}
