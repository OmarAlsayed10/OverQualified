import prisma from "../../lib/prisma";
import { normalizeJobDescription } from "../../lib/jobDescriptionNormalizer";
import { fitScore, jobDedupeKey } from "../../shared/jobs/jobMatchScoring";
import { resolveCountry } from "../../shared/jobs/jobMarkets";

const DESC_CAP = 6000;
const REMOTE_HINT = /\bremote\b/i;
const MAX_FIELD = 300;
const MAX_KEYWORDS = 40;

export interface CapturedJob {
  url: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  postedAt: string | null;
  board: string;
}

const text = (input: unknown, maxLength = MAX_FIELD): string =>
  typeof input === "string" ? input.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";

const externalIdFor = (url: string): string => url.split("?")[0].replace(/\/+$/, "").slice(-200);

export const parseCapturedJob = (body: unknown): CapturedJob => {
  const input = (body ?? {}) as Record<string, unknown>;
  const url = text(input.url, 1000);
  const title = text(input.title);
  if (!/^https?:\/\//i.test(url) || title.length < 2) throw new Error("INVALID_CAPTURE");
  return {
    url,
    title,
    company: text(input.company) || "Unknown",
    location: text(input.location) || null,
    description: normalizeJobDescription(text(input.description, 40_000)).plainText.slice(0, DESC_CAP),
    postedAt: text(input.postedAt, 40) || null,
    board: text(input.board, 40) || "extension",
  };
};

const parsedDate = (value: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const stringsWithin = (value: unknown, depth = 0): string[] => {
  if (depth > 4) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((entry) => stringsWithin(entry, depth + 1));
  if (value && typeof value === "object") return Object.values(value).flatMap((entry) => stringsWithin(entry, depth + 1));
  return [];
};

const cvKeywords = (cv: { skills: unknown; personalInfo: unknown }): string =>
  [...new Set(stringsWithin(cv.skills).concat(stringsWithin(cv.personalInfo)))]
    .filter((entry) => entry.length > 1 && entry.length < 40)
    .slice(0, MAX_KEYWORDS)
    .join(" ");

export const captureJob = async (userId: string, captured: CapturedJob) => {
  const source = `extension:${captured.board}`;
  const externalId = externalIdFor(captured.url);
  const country = resolveCountry(captured.location);

  const job = await prisma.job.upsert({
    where: { source_externalId: { source, externalId } },
    create: {
      source,
      externalId,
      title: captured.title,
      company: captured.company,
      location: captured.location,
      country,
      dedupeKey: jobDedupeKey({ company: captured.company, title: captured.title, country }),
      remote: REMOTE_HINT.test(`${captured.location ?? ""} ${captured.title}`),
      url: captured.url,
      postedAt: parsedDate(captured.postedAt),
      description: captured.description,
    },
    update: { title: captured.title, company: captured.company, description: captured.description },
  });

  const cvs = await prisma.cV.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
    select: { id: true, title: true, isPrimary: true, skills: true, personalInfo: true },
  });

  const scored = cvs
    .map((cv) => ({
      id: cv.id,
      title: cv.title || "Untitled CV",
      isPrimary: cv.isPrimary,
      fitScore: fitScore(
        {
          role: cv.title || "",
          level: null,
          location: null,
          remote: false,
          keywords: cvKeywords(cv),
          blocklist: null,
        },
        { ...job, source: job.source, externalId: job.externalId },
      ),
    }))
    .sort((left, right) => right.fitScore - left.fitScore);

  const suggested = scored.find((cv) => cv.fitScore > 0) ?? scored.find((cv) => cv.isPrimary) ?? scored[0] ?? null;
  return { job, suggestedCv: suggested, cvs: scored };
};
