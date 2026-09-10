
import prisma from "../../lib/prisma";
import { normalizeJobDescription } from "../../lib/jobDescriptionNormalizer";
import { jobDedupeKey, Preference, RawJob } from "../../shared/jobs/jobMatchScoring";
import {
  fetchAdzuna,
  fetchCareerjet,
  fetchJSearch,
  fetchJooble,
  fetchRemotive,
  fetchRemoteOK,
  fetchTheMuse,
} from "./jobProviderAdapters";
import { fetchGreenhouseJobs, fetchLeverJobs } from "./jobSourceService";
import { fetchProvider, JobProvider, JobProviderDiagnostic, JobProviderOutcome, providerDiagnostics } from "./jobProviderOutcome";
import { JobMarket, MENA_MARKETS, PRIMARY_MARKET, resolveCountry } from "../../shared/jobs/jobMarkets";
import { logger } from "../../lib/logger";

const DESC_CAP = 6000;
const REMOTE_HINT = /\bremote\b/i;




const seedPref = (role: string, location: string): Preference => ({
  role,
  level: null,
  location: location || null,
  remote: false,
  keywords: null,
  blocklist: null,
});

const MAX_JOB_AGE_DAYS = 90;
const INGESTION_INTERVAL_HOURS = 6;
const JOB_PERSISTENCE_BATCH_SIZE = 100;

const positiveEnvNumber = (name: string, fallback: number): number =>
  Math.max(1, Math.trunc(Number(process.env[name] ?? fallback)) || fallback);

const ROLE_BATCH_SIZE = positiveEnvNumber("JOB_ROLE_BATCH_SIZE", 8);
const MARKET_BATCH_SIZE = positiveEnvNumber("JOB_MARKET_BATCH_SIZE", 3);
const MAX_CONCURRENT_PROVIDER_REQUESTS = positiveEnvNumber("JOB_PROVIDER_CONCURRENCY", 4);

const activeRoleNames = async (): Promise<string[]> => {
  const roles = await prisma.jobRole.findMany({
    where: { active: true, category: { active: true } },
    orderBy: { name: "asc" },
    select: { name: true },
  });
  if (roles.length === 0) logger.warn("[jobRadar] no active JobRole rows - only global providers will run");
  return roles.map((role) => role.name);
};

export const currentCycle = (): number => Math.floor(Date.now() / (INGESTION_INTERVAL_HOURS * 3_600_000));

export const cycleBatch = <Item>(items: Item[], size: number, cycle: number): Item[] => {
  if (items.length === 0) return [];
  const start = (cycle * size) % items.length;
  return Array.from({ length: Math.min(size, items.length) }, (_, offset) => items[(start + offset) % items.length]);
};

const currentMarkets = (cycle: number): JobMarket[] => [
  PRIMARY_MARKET,
  ...cycleBatch(MENA_MARKETS.filter((market) => market.country !== PRIMARY_MARKET.country), MARKET_BATCH_SIZE, cycle),
];

type JobRow = {
  source: string;
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  country: string | null;
  dedupeKey: string;
  remote: boolean;
  url: string;
  postedAt: Date | null;
  description: string;
};

const toJobRow = (job: RawJob): JobRow => {
  const country = resolveCountry(job.location) ?? job.country ?? null;
  return {
    source: job.source,
    externalId: job.externalId,
    title: job.title,
    company: job.company,
    location: job.location,
    country,
    dedupeKey: jobDedupeKey({ company: job.company, title: job.title, country }),
    remote: REMOTE_HINT.test(`${job.location ?? ""} ${job.title}`),
    url: job.url,
    postedAt: job.postedAt,
    description: normalizeJobDescription(job.description ?? "").plainText.slice(0, DESC_CAP),
  };
};

const preferredRow = (current: JobRow, candidate: JobRow): JobRow => {
  if (Boolean(current.postedAt) !== Boolean(candidate.postedAt)) return current.postedAt ? current : candidate;
  return candidate.description.length > current.description.length ? candidate : current;
};

export const jobRows = (jobs: RawJob[]): JobRow[] => {
  const bySourceId = new Map<string, RawJob>();
  for (const job of jobs) {
    if (job.url && job.title) bySourceId.set(`${job.source}:${job.externalId}`, job);
  }
  const collapsed = new Map<string, JobRow>();
  for (const job of bySourceId.values()) {
    const row = toJobRow(job);
    const key = row.dedupeKey || `${row.source}:${row.externalId}`;
    const current = collapsed.get(key);
    collapsed.set(key, current ? preferredRow(current, row) : row);
  }
  return [...collapsed.values()];
};

async function persistRaw(jobs: RawJob[]): Promise<number> {
  const rows = jobRows(jobs);
  for (let offset = 0; offset < rows.length; offset += JOB_PERSISTENCE_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + JOB_PERSISTENCE_BATCH_SIZE);
    await prisma.$transaction(batch.map((job) => prisma.job.upsert({
      where: { source_externalId: { source: job.source, externalId: job.externalId } },
      create: job,
      update: job,
    })));
  }
  return rows.length;
}

export interface JobIngestionResult {
  persisted: number;
  providers: JobProviderDiagnostic[];
}

const collectProviderOutcomes = async (providers: JobProvider[]): Promise<JobProviderOutcome[]> => {
  const outcomes: JobProviderOutcome[] = [];
  for (let offset = 0; offset < providers.length; offset += MAX_CONCURRENT_PROVIDER_REQUESTS) {
    outcomes.push(...await Promise.all(providers.slice(offset, offset + MAX_CONCURRENT_PROVIDER_REQUESTS).map(fetchProvider)));
  }
  return outcomes;
};

export async function ingestJobs(): Promise<JobIngestionResult> {
  const cycle = currentCycle();
  const roles = await activeRoleNames();
  const roleBatch = cycleBatch(roles, ROLE_BATCH_SIZE, cycle);
  const markets = currentMarkets(cycle);
  const globalProviders: JobProvider[] = [
    { id: "remoteok", configured: () => true, fetch: fetchRemoteOK },
    { id: "themuse", configured: () => true, fetch: () => fetchTheMuse(seedPref("", "")) },
    { id: "greenhouse", configured: () => true, fetch: fetchGreenhouseJobs },
    { id: "lever", configured: () => true, fetch: fetchLeverJobs },
  ];
  const roleProviders = roleBatch.flatMap((role): JobProvider[] => {
    const preference = seedPref(role, "");
    return [
      { id: "adzuna", configured: () => Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY), fetch: () => fetchAdzuna(preference) },
      { id: "remotive", configured: () => true, fetch: () => fetchRemotive(preference) },
    ];
  });
  const marketProviders = roleBatch.flatMap((role) => markets.flatMap((market): JobProvider[] => {
    const preference = seedPref(role, market.label);
    return [
      { id: "jsearch", configured: () => Boolean(process.env.JSEARCH_KEY), fetch: () => fetchJSearch(preference, market) },
      { id: "jooble", configured: () => Boolean(process.env.JOOBLE_KEY), fetch: () => fetchJooble(preference, market) },
      { id: "careerjet", configured: () => Boolean(process.env.CAREERJET_AFFID), fetch: () => fetchCareerjet(preference, market) },
    ];
  }));
  const outcomes = await collectProviderOutcomes([...globalProviders, ...roleProviders, ...marketProviders]);
  const persisted = await persistRaw(outcomes.flatMap((outcome) => outcome.jobs));
  const cutoff = new Date(Date.now() - MAX_JOB_AGE_DAYS * 86_400_000);
  await prisma.job.deleteMany({
    where: { OR: [{ postedAt: { lt: cutoff } }, { postedAt: null, createdAt: { lt: cutoff } }] },
  });
  return { persisted, providers: providerDiagnostics(outcomes) };
}
