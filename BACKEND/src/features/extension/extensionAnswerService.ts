import crypto from "crypto";
import prisma from "../../lib/prisma";
import { groqChat, MODELS } from "../../lib/groqChat";
import { logger } from "../../lib/logger";

export type QuestionType = "text" | "textarea" | "number" | "select" | "radio" | "checkbox";
export type AnswerSource = "profile" | "cached" | "generated" | "unanswered";

export interface ExtensionQuestion {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  maxLength?: number;
}

export interface ExtensionAnswerResult {
  id: string;
  value: string;
  source: AnswerSource;
  copyable: boolean;
}

const MAX_QUESTIONS = 25;
const MAX_LABEL = 400;
const DEFAULT_MAX_LENGTH = 1200;
const PICKER_TYPES = new Set<QuestionType>(["select", "radio", "checkbox"]);
const TYPES = new Set<QuestionType>(["text", "textarea", "number", "select", "radio", "checkbox"]);

const text = (input: unknown, max: number): string =>
  typeof input === "string" ? input.trim().replace(/\s+/g, " ").slice(0, max) : "";

export const parseQuestions = (input: unknown): ExtensionQuestion[] => {
  if (!Array.isArray(input)) return [];
  return input.slice(0, MAX_QUESTIONS).flatMap((raw): ExtensionQuestion[] => {
    const entry = (raw ?? {}) as Record<string, unknown>;
    const id = text(entry.id, 120);
    const label = text(entry.label, MAX_LABEL);
    const type = text(entry.type, 20) as QuestionType;
    if (!id || label.length < 2 || !TYPES.has(type)) return [];
    const options = Array.isArray(entry.options)
      ? entry.options.map((option) => text(option, 120)).filter(Boolean).slice(0, 30)
      : undefined;
    const maxLength = typeof entry.maxLength === "number" && entry.maxLength > 0
      ? Math.min(entry.maxLength, 5000)
      : undefined;
    return [{ id, label, type, options, maxLength }];
  });
};

const questionHash = (label: string, cvId: string): string =>
  crypto.createHash("sha256").update(`${cvId}|${label.toLowerCase()}`).digest("hex").slice(0, 40);

const YEARS = /(years?|سنوات|سنه)\b.*(experience|خبر)|(experience|خبر).*(years?|سنوات)/i;
const NOTICE = /notice period|when can you (start|join)|فتره الاخطار|موعد الالتحاق/i;
const SALARY = /salary|compensation|expected pay|الراتب|التوقع المالي/i;
const VISA = /visa|work permit|sponsorship|authoriz|تاشير|تصريح عمل/i;
const PHONE = /phone|mobile|contact number|رقم الهاتف|الموبايل/i;
const LOCATION = /current (city|location)|where are you (based|located)|المدينه|مكان الاقامه/i;
const RELOCATE = /relocat|willing to move|الانتقال/i;

type Profile = {
  phone: string | null;
  location: string | null;
  salaryExpectation: string | null;
  visaStatus: string | null;
  noticePeriod: string | null;
  relocationOpen: boolean;
};

const yearsOfExperience = (experience: unknown): number | null => {
  if (!Array.isArray(experience)) return null;
  const years = experience.reduce((total, entry) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const start = Number.parseInt(String(item.startDate ?? item.from ?? "").slice(0, 4), 10);
    const endRaw = String(item.endDate ?? item.to ?? "");
    const end = /present|current|حالي/i.test(endRaw)
      ? new Date().getFullYear()
      : Number.parseInt(endRaw.slice(0, 4), 10);
    if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) return total;
    return total + (end - start);
  }, 0);
  return years > 0 ? years : null;
};

const matchOption = (options: string[] | undefined, wanted: string): string | null => {
  if (!options?.length) return null;
  const needle = wanted.toLowerCase();
  const exact = options.find((option) => option.toLowerCase() === needle);
  if (exact) return exact;
  const partial = options.find((option) => option.toLowerCase().includes(needle) || needle.includes(option.toLowerCase()));
  return partial ?? null;
};

const yesNo = (value: boolean, options?: string[]): string =>
  matchOption(options, value ? "yes" : "no") ?? (value ? "Yes" : "No");

const profileAnswer = (
  question: ExtensionQuestion,
  profile: Profile,
  experienceYears: number | null,
): string | null => {
  const { label, options } = question;
  if (YEARS.test(label) && experienceYears !== null) {
    return matchOption(options, String(experienceYears)) ?? String(experienceYears);
  }
  if (NOTICE.test(label) && profile.noticePeriod) return matchOption(options, profile.noticePeriod) ?? profile.noticePeriod;
  if (SALARY.test(label) && profile.salaryExpectation) return profile.salaryExpectation;
  if (VISA.test(label) && profile.visaStatus) return matchOption(options, profile.visaStatus) ?? profile.visaStatus;
  if (PHONE.test(label) && profile.phone) return profile.phone;
  if (LOCATION.test(label) && profile.location) return profile.location;
  if (RELOCATE.test(label)) return yesNo(profile.relocationOpen, options);
  return null;
};

const promptFor = (
  question: ExtensionQuestion,
  job: { title: string; company: string; description: string },
  cvSummary: string,
): string => {
  const limit = question.maxLength ?? DEFAULT_MAX_LENGTH;
  const constraint = question.options?.length
    ? `Answer with EXACTLY ONE of these options, copied verbatim: ${question.options.join(" | ")}`
    : `Answer in at most ${limit} characters. Plain prose, no markdown, no greeting, no sign-off.`;
  return [
    `Job: ${job.title} at ${job.company}`,
    `Job description (truncated): ${job.description.slice(0, 1500)}`,
    "",
    `Candidate CV facts: ${cvSummary.slice(0, 1500)}`,
    "",
    `Application question: ${question.label}`,
    constraint,
    "",
    "Rules:",
    "- Answer in English even when the question or job description is in Arabic.",
    "- Cite at least one concrete fact from the CV (a metric, a technology, a named project).",
    "- Never invent experience the CV does not support.",
    "- Do not open with 'I am excited' or 'I am passionate'.",
    "- Write as the candidate, first person.",
  ].join("\n");
};

const cvFacts = (cv: { title: string | null; skills: unknown; experience: unknown; personalInfo: unknown }): string => {
  const collect = (value: unknown, depth = 0): string[] => {
    if (depth > 4) return [];
    if (typeof value === "string") return [value];
    if (typeof value === "number") return [String(value)];
    if (Array.isArray(value)) return value.flatMap((entry) => collect(entry, depth + 1));
    if (value && typeof value === "object") return Object.values(value).flatMap((entry) => collect(entry, depth + 1));
    return [];
  };
  return [cv.title ?? "", ...collect(cv.experience), ...collect(cv.skills), ...collect(cv.personalInfo)]
    .filter((entry) => entry.trim().length > 1)
    .join(" | ");
};

const generate = async (
  question: ExtensionQuestion,
  job: { title: string; company: string; description: string },
  cvSummary: string,
): Promise<string | null> => {
  try {
    const completion = await groqChat({
      model: MODELS.fast,
      temperature: 0.7,
      max_tokens: 400,
      messages: [
        { role: "system", content: "You write job application answers. Concrete, specific, grounded in the CV. English only." },
        { role: "user", content: promptFor(question, job, cvSummary) },
      ],
    });
    const value = completion.choices[0]?.message?.content?.trim();
    if (!value) return null;
    if (question.options?.length) return matchOption(question.options, value) ?? question.options[0];
    return question.maxLength ? value.slice(0, question.maxLength) : value;
  } catch (error) {
    logger.error("[extension] answer generation failed", error instanceof Error ? error.message : error);
    return null;
  }
};

export const answerQuestions = async (request: {
  userId: string;
  cvId: string;
  job: { title: string; company: string; description: string };
  questions: ExtensionQuestion[];
}): Promise<ExtensionAnswerResult[]> => {
  const { userId, cvId, job, questions } = request;
  if (questions.length === 0) return [];

  const [user, cv] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        phone: true, location: true, salaryExpectation: true,
        visaStatus: true, noticePeriod: true, relocationOpen: true,
      },
    }),
    prisma.cV.findFirst({
      where: { id: cvId, userId },
      select: { title: true, skills: true, experience: true, personalInfo: true },
    }),
  ]);
  if (!user || !cv) throw new Error("CV_NOT_FOUND");

  const experienceYears = yearsOfExperience(cv.experience);
  const cvSummary = cvFacts(cv);
  const hashes = questions.map((question) => questionHash(question.label, cvId));
  const cached = await prisma.extensionAnswer.findMany({
    where: { userId, questionHash: { in: hashes } },
    select: { questionHash: true, answer: true },
  });
  const cachedByHash = new Map(cached.map((row) => [row.questionHash, row.answer]));

  const results: ExtensionAnswerResult[] = [];
  for (const [index, question] of questions.entries()) {
    const copyable = !PICKER_TYPES.has(question.type);
    const fromProfile = profileAnswer(question, user, experienceYears);
    if (fromProfile) {
      results.push({ id: question.id, value: fromProfile, source: "profile", copyable });
      continue;
    }
    const hit = cachedByHash.get(hashes[index]);
    if (hit) {
      results.push({ id: question.id, value: hit, source: "cached", copyable });
      continue;
    }
    const generated = await generate(question, job, cvSummary);
    if (!generated) {
      results.push({ id: question.id, value: "", source: "unanswered", copyable });
      continue;
    }
    await prisma.extensionAnswer.upsert({
      where: { userId_questionHash: { userId, questionHash: hashes[index] } },
      create: { userId, questionHash: hashes[index], questionLabel: question.label, answer: generated },
      update: { answer: generated },
    });
    results.push({ id: question.id, value: generated, source: "generated", copyable });
  }
  return results;
};

export const saveEditedAnswer = async (request: {
  userId: string;
  cvId: string;
  label: string;
  answer: string;
}): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: request.userId },
    select: { learningConsent: true },
  });
  if (!user?.learningConsent) return false;

  const label = text(request.label, MAX_LABEL);
  const answer = text(request.answer, 5000);
  if (label.length < 2 || answer.length < 2) return false;

  const hash = questionHash(label, request.cvId);
  await prisma.extensionAnswer.upsert({
    where: { userId_questionHash: { userId: request.userId, questionHash: hash } },
    create: { userId: request.userId, questionHash: hash, questionLabel: label, answer, edited: true },
    update: { answer, edited: true },
  });
  return true;
};
