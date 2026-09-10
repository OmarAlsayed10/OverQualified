import { foldText } from "../../lib/textFolding";

export interface RawJob {
  source: string;
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  country?: string | null;
  url: string;
  postedAt: Date | null;
  description: string;
}

export interface Preference {
  role: string;
  level: string | null;
  location: string | null;
  remote: boolean;
  keywords: string | null;
  blocklist: string | null;
}

const TOKEN_SEPARATOR = /[^a-z0-9+#.ء-ي]+/;
const ARABIC_ARTICLE = "ال";
const MIN_LENGTH_FOR_ARTICLE_STRIP = 5;

const SHORT_MEANINGFUL_TERMS = new Set(["qa", "qc", "ux", "ui", "ai", "ml", "bi", "hr", "pm", "vp", "3d", "c#"]);

const TOKEN_ALIASES: Record<string, string> = {
  "3ds": "3d",
  js: "javascript",
  ts: "typescript",
  k8s: "kubernetes",
  postgres: "postgresql",
  psql: "postgresql",
  nodejs: "node",
  reactjs: "react",
  vuejs: "vue",
};

const normalizeToken = (word: string): string => {
  const alias = TOKEN_ALIASES[word];
  if (alias) return alias;
  if (word.length >= MIN_LENGTH_FOR_ARTICLE_STRIP && word.startsWith(ARABIC_ARTICLE)) return word.slice(ARABIC_ARTICLE.length);
  return word;
};

const isMeaningfulToken = (word: string): boolean =>
  (word.length > 2 || SHORT_MEANINGFUL_TERMS.has(word)) && !stopwords.has(word);

const stopwords = new Set([
  "the", "and", "for", "with", "you", "your", "our", "are", "will", "job", "role", "developer", "engineer", "artist",
  "في", "من", "على", "عن", "مع", "إلى", "التي", "الذي", "هذا", "هذه", "لدى", "أو",
  "وظيفة", "وظائف", "مطلوب", "مطلوبة", "شركة", "العمل", "لدينا", "يكون",
].map((word) => normalizeToken(foldText(word))));
const roleAliases: Record<string, string[]> = {
  "frontend developer": ["frontend", "front-end", "front end", "ui engineer", "web engineer", "react", "next.js", "vue", "angular"],
  "full stack developer": ["full stack", "full-stack", "fullstack"],
  "mobile developer": ["mobile", "ios", "android", "react native", "flutter"],
  "backend developer": ["backend", "back-end", "back end", "api developer", "platform engineer"],
};
const levelConflicts: Record<string, string[]> = {
  Fresh: ["senior", "sr", "lead", "principal", "staff", "director", "head", "vp", "manager"],
  Junior: ["senior", "sr", "lead", "principal", "staff", "director", "head", "vp", "manager"],
  Mid: ["lead", "principal", "staff", "director", "head", "vp"],
  Senior: ["junior", "jr", "intern", "trainee", "fresh", "entry"],
  Lead: ["junior", "jr", "intern", "trainee", "fresh", "entry"],
};

const normalizeRoleTerms = (text: string): string => text.toLowerCase().replace(/\bfront[\s-]?end\b/g, "frontend").replace(/\bback[\s-]?end\b/g, "backend").replace(/\bfull[\s-]?stack\b/g, "fullstack").replace(/\breact[\s-]?native\b/g, "reactnative");
export const tokenize = (text: string): string[] => normalizeRoleTerms(foldText(text)).split(TOKEN_SEPARATOR).map(normalizeToken).filter(isMeaningfulToken);
const scoreTerms = (terms: string[], titleTerms: Set<string>, bodyTerms: Set<string>, bodyWeight: number): number => {
  if (terms.length === 0) return 0;
  const hits = terms.reduce((total, term) => total + (titleTerms.has(term) ? 2 : bodyTerms.has(term) ? bodyWeight : 0), 0);
  return (hits / (terms.length * 2)) * 100;
};

export const roleVariants = (role: string): string[] => [role, ...(roleAliases[role.toLowerCase()] ?? [])];

const COMPANY_SUFFIXES = /\b(llc|inc|ltd|limited|plc|gmbh|sae|sarl|corp|corporation|company|holding|holdings|group|technologies|technology|solutions|systems|services)\b/g;
const SENIORITY_ABBREVIATIONS: Record<string, string> = { sr: "senior", jr: "junior", "mid level": "mid", "entry level": "entry" };
const DEDUPE_KEY_MAX_LENGTH = 300;

const collapseWords = (text: string): string => foldText(text).replace(/[^a-z0-9ء-ي]+/g, " ").replace(/\s+/g, " ").trim();

const companySegment = (company: string): string => collapseWords(company).replace(COMPANY_SUFFIXES, " ").replace(/\s+/g, " ").trim();

const titleSegment = (title: string): string => Object.entries(SENIORITY_ABBREVIATIONS)
  .reduce((text, [abbreviation, full]) => text.replace(new RegExp(`\\b${abbreviation}\\b`, "g"), full), collapseWords(title))
  .replace(/\s+/g, " ")
  .trim();

export const jobDedupeKey = (job: { company: string; title: string; country?: string | null }): string => {
  const company = companySegment(job.company);
  const title = titleSegment(job.title);
  if (!company || !title) return "";
  return `${company}|${title}|${job.country ?? ""}`.slice(0, DEDUPE_KEY_MAX_LENGTH);
};

export function fitScore(preference: Preference, job: RawJob): number {
  const keywordTerms = tokenize(preference.keywords ?? "");
  const titleTerms = new Set(tokenize(job.title));
  const bodyTerms = new Set(tokenize(`${job.title} ${job.description}`));
  const roleScore = Math.max(...roleVariants(preference.role).map((role) => scoreTerms(tokenize(role), titleTerms, bodyTerms, 0.75)));
  const keywordScore = keywordTerms.length ? scoreTerms(keywordTerms, titleTerms, bodyTerms, 1) : 100;
  const score = Math.round(keywordTerms.length ? roleScore * 0.6 + keywordScore * 0.4 : roleScore);
  if (preference.level && levelConflicts[preference.level]?.some((term) => titleTerms.has(term))) return 0;
  return Math.min(100, score);
}
