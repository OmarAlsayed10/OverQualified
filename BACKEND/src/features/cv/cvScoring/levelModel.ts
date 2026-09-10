import { MONTHS, LEVELS, Level, REQUIRED_STRENGTH } from "./constants";
import { experienceSection, summarySection } from "./textParse";
import { Language } from "../../../lib/aiLanguage";

// One end of a date range. A word month was the only month this understood, so "01/2020 – 06/2024"
// and "2020-01 – 2024-06" parsed as nothing at all and the CV came back as Fresh. Order matters:
// the year-first form has to be tried before the bare year, or "2020-01" matches as just "2020".
const ENDPOINT = [
  String.raw`present|current|now|ongoing`,
  String.raw`[a-z]{3,9}\.?\s+(?:19|20)\d{2}`,
  String.raw`(?:0?[1-9]|1[0-2])\s*[/.]\s*(?:19|20)\d{2}`,
  String.raw`(?:19|20)\d{2}\s*[-/]\s*(?:0?[1-9]|1[0-2])(?![0-9])`,
  String.raw`(?:19|20)\d{2}`,
].join("|");

// "may 2024 till Now" is how one real CV wrote it, and "till" was not a separator we knew.
const DATE_RANGE = new RegExp(
  String.raw`(${ENDPOINT})\s*(?:-|–|—|to\b|till\b|until\b|/)\s*(${ENDPOINT})`,
  "gi",
);

// `atStart` picks which edge of a named month to take, so a range keeps its full span.
const endpointToYear = (raw: string, now: number, atStart: boolean): number | null => {
  const value = raw.trim().toLowerCase();
  if (/^(present|current|now|ongoing)$/.test(value)) return now;

  const word = value.match(/^([a-z]{3,9})\.?\s+((?:19|20)\d{2})$/);
  const monthFirst = value.match(/^(\d{1,2})\s*[/.]\s*((?:19|20)\d{2})$/);
  const yearFirst = value.match(/^((?:19|20)\d{2})\s*[-/]\s*(\d{1,2})$/);

  const month = word
    ? MONTHS[word[1].slice(0, 3)]
    : monthFirst
      ? Number(monthFirst[1])
      : yearFirst
        ? Number(yearFirst[2])
        : undefined;
  const year = word
    ? Number(word[2])
    : monthFirst
      ? Number(monthFirst[2])
      : yearFirst
        ? Number(yearFirst[1])
        : /^(?:19|20)\d{2}$/.test(value)
          ? Number(value)
          : null;

  if (year === null) return null;
  if (!month) return year;
  return year + (atStart ? month - 1 : month) / 12;
};

// Objective years of experience from date ranges in the Experience section.
// Merges overlapping ranges so concurrent roles aren't double-counted.
export function estimateYearsExperience(text: string): number {
  const block = experienceSection(text);
  if (!block) return 0;
  const now = new Date().getFullYear() + new Date().getMonth() / 12;
  const spans: [number, number][] = [];
  for (const m of block.matchAll(DATE_RANGE)) {
    const start = endpointToYear(m[1], now, true);
    const end = endpointToYear(m[2], now, false);
    if (start === null || end === null) continue;
    if (end > start) spans.push([start, Math.min(end, now)]);
  }
  if (!spans.length) return 0;
  spans.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [cs, ce] = spans[0];
  for (const [s, e] of spans.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else {
      total += ce - cs;
      cs = s;
      ce = e;
    }
  }
  total += ce - cs;
  return total;
}

// "Backend Engineer with 4+ years of experience" — a fact the CV states outright, which the date
// parser ignored entirely. Read only from the summary: a bare "2 years" inside a bullet is usually
// the duration of a project, not a career.
const STATED_YEARS = /(\d{1,2})\s*\+?\s*(?:years?|yrs?|سنوات|سنة)/gi;

export function statedYearsExperience(text: string): number {
  const summary = summarySection(text);
  if (!summary) return 0;
  let best = 0;
  for (const match of summary.matchAll(STATED_YEARS)) {
    const years = Number(match[1]);
    if (years > best && years <= 50) best = years;
  }
  return best;
}

// Dates first — they are evidence. The stated figure is a fallback for when parsing found nothing
// at all, so a CV claiming ten years cannot talk over date ranges that say two.
export function yearsExperience(text: string): number {
  const fromDates = estimateYearsExperience(text);
  return fromDates > 0 ? fromDates : statedYearsExperience(text);
}

// Objective career strength anchored to years of experience, on the same 0-100
// scale as REQUIRED_STRENGTH. Interpolated between real-world anchors.
// Calibrated: <1yr→Fresh, 1-2yr→Junior, 2-5yr→Mid, 5-8yr→Senior, 8+yr→Lead.
export function baseStrengthFromYears(years: number): number {
  const pts: [number, number][] = [
    [0, 12],
    [1, 25],
    // Must clear REQUIRED_STRENGTH.Mid (48) at exactly the year the bucket turns Mid. Leaving this
    // at 40 would have levelFromYears call a 2-year CV Mid while bestFitLevel called it Junior, and
    // the user would read "your experience currently reads as Junior" on a CV labelled Mid.
    [2, 48],
    [3, 55],
    [5, 70],
    [8, 88],
    [12, 96],
  ];
  if (years <= pts[0][0]) return pts[0][1];
  if (years >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) {
    if (years <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (years - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}

// Level bucket is decided by objective years of experience ALONE.
// Skills/LLM strength only move fit WITHIN the level, never the bucket.
export function levelFromYears(years: number): Level {
  if (years < 1) return "Fresh";
  // Mid starts at 2, not 3. LEVEL_EXPECTATIONS has always defined Junior as "1-2 years" and Mid as
  // "3-5", which left 2-3 undefined — and the code quietly resolved it downward, so a developer
  // with 2.25 years was labelled Junior by a scale whose own text says Junior ends at 2.
  if (years < 2) return "Junior";
  if (years < 5) return "Mid";
  if (years < 8) return "Senior";
  return "Lead";
}

// Highest level whose bar the objective strength actually clears.
export function bestFitLevel(strength: number): Level {
  let best: Level = "Fresh";
  for (const l of LEVELS) if (strength >= REQUIRED_STRENGTH[l]) best = l;
  return best;
}

// Message that matches the computed fit — no cheerleading a 30% as "excellent".
export function levelMessage(
  level: string,
  fit: number,
  strength: number,
  role: string,
  language: Language = "en",
): string {
  const fits = bestFitLevel(strength);
  if (language === "ar") {
    const whoAr = role || "مرشح";
    if (fit >= 90)
      return `ممتاز بالنسبة لـ ${level} ${whoAr} — إنت واصل للمستوى المطلوب في المرحلة دي.`;
    if (fit >= 75)
      return `مناسب بقوة لمستوى ${level} ${whoAr} — فاضل شوية حاجات للدرجة الكاملة.`;
    if (fit >= 55)
      return `قريب من مستوى ${level} بس لسه مش واصل — خبرتك دلوقتي بتقع في مستوى ${fits}.`;
    return `أقل من مستوى ${level} — السيرة دي بتقع في مستوى ${fits} حاليًا. استهدف ${level} بعد ما تبني الخبرة.`;
  }

  const who = role || "candidate";
  if (fit >= 90)
    return `Excellent for a ${level} ${who} — you're meeting the bar for this stage.`;
  if (fit >= 75)
    return `Strong fit for ${level} ${who} — a few gaps from a top score.`;
  if (fit >= 55)
    return `Near the ${level} bar, but not there yet — your experience currently reads as ${fits}.`;
  return `Below the ${level} bar — this CV fits ${fits} level right now. Aim for ${level} once you've built the experience.`;
}
