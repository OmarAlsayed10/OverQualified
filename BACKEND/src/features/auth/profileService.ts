const MAX = { title: 100, location: 100, phone: 30, summary: 2000, url: 200 };

// Fixed palette — avatarColor is rendered straight into a style, so only exact matches are allowed.
export const AVATAR_COLORS = [
  "#2a5c45", "#3d8b65", "#c25b1a", "#2f6f83",
  "#7a4fb5", "#b5424f", "#c69214", "#4a4a48",
];

// Drop ASCII control characters (codepoint < space). Newlines are kept only for multi-line
// fields; single-line fields collapse them to spaces so titles/links can't store line breaks.
const stripControl = (s: string, allowNewline: boolean) =>
  [...s].filter((c) => c >= " " || (allowNewline && c === "\n")).join("").trim();

const text = (v: unknown, max: number, allowNewline = false): string | undefined => {
  if (typeof v !== "string") return undefined;
  return stripControl(v, allowNewline).slice(0, max);
};

const phone = (v: unknown): string | undefined => {
  const s = text(v, MAX.phone);
  if (s === undefined) return undefined;
  return s.replace(/[^\d+\-()\s.]/g, "").trim();
};

// Accepts a bare host ("github.com/x") or full URL, returns a normalized https URL, or "" to clear.
const url = (v: unknown): string | undefined => {
  const s = text(v, MAX.url);
  if (s === undefined) return undefined;
  if (s === "") return "";
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.toString().slice(0, MAX.url);
  } catch {
    return "";
  }
};

const avatarColor = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  return AVATAR_COLORS.includes(v) ? v : "";
};

const MAX_SKILLS = 100;
const MAX_SKILL_LEN = 50;

// Clean, cap, and de-dupe (case-insensitive) a skills array. Non-arrays are ignored.
const skills = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of v) {
    if (typeof raw !== "string") continue;
    const s = stripControl(raw, false).slice(0, MAX_SKILL_LEN);
    const key = s.toLowerCase();
    if (!s || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
};

export interface ProfileUpdate {
  title?: string;
  location?: string;
  phone?: string;
  summary?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  avatarColor?: string;
  skills?: string[];
  salaryExpectation?: string;
  salaryCurrency?: string;
  visaStatus?: string;
  noticePeriod?: string;
  workPreference?: string;
  relocationOpen?: boolean;
}

// Builds a sanitized update containing only the keys actually present in the request body.
export const sanitizeProfile = (body: Record<string, unknown>): ProfileUpdate => {
  const out: ProfileUpdate = {};
  if ("title" in body) out.title = text(body.title, MAX.title) ?? "";
  if ("location" in body) out.location = text(body.location, MAX.location) ?? "";
  if ("phone" in body) out.phone = phone(body.phone) ?? "";
  if ("summary" in body) out.summary = text(body.summary, MAX.summary, true) ?? "";
  if ("linkedin" in body) out.linkedin = url(body.linkedin) ?? "";
  if ("github" in body) out.github = url(body.github) ?? "";
  if ("portfolio" in body) out.portfolio = url(body.portfolio) ?? "";
  if ("avatarColor" in body) out.avatarColor = avatarColor(body.avatarColor) ?? "";
  if ("skills" in body) out.skills = skills(body.skills) ?? [];
  if ("salaryExpectation" in body) out.salaryExpectation = text(body.salaryExpectation, 50) ?? "";
  if ("salaryCurrency" in body) out.salaryCurrency = text(body.salaryCurrency, 10) ?? "USD";
  if ("visaStatus" in body) out.visaStatus = text(body.visaStatus, 50) ?? "";
  if ("noticePeriod" in body) out.noticePeriod = text(body.noticePeriod, 50) ?? "";
  if ("workPreference" in body) out.workPreference = text(body.workPreference, 50) ?? "";
  if ("relocationOpen" in body) out.relocationOpen = Boolean(body.relocationOpen);
  return out;
};
