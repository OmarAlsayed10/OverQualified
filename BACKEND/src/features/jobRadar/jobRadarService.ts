import { Job } from "@prisma/client";
import { fitScore, Preference, RawJob } from "../../shared/jobs/jobMatchScoring";
import { persistRankedMatches, RankedJob } from "./jobMatchPersistence";
import { loadMatchCandidates } from "./jobMatchCandidateRepository";

export { fitScore, Preference, RawJob } from "../../shared/jobs/jobMatchScoring";
export { listMatches } from "./jobMatchListRepository";

const daysAgo = (date: Date | null): number =>
  date ? (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24) : 999;
const MIN_FIT = 50;
const EARLY_BIRD_DAYS = 3;
const MAX_CONCURRENT_REFRESHES = 4;

let activeRefreshCount = 0;
const refreshWaiters: Array<() => void> = [];
const refreshesByUser = new Map<string, Promise<number>>();

const acquireRefreshSlot = async (): Promise<void> => {
  if (activeRefreshCount < MAX_CONCURRENT_REFRESHES) {
    activeRefreshCount++;
    return;
  }
  await new Promise<void>((resolve) => refreshWaiters.push(resolve));
};

const releaseRefreshSlot = (): void => {
  const nextRefresh = refreshWaiters.shift();
  if (nextRefresh) nextRefresh();
  else activeRefreshCount--;
};

const runWithRefreshSlot = async (refresh: () => Promise<number>): Promise<number> => {
  await acquireRefreshSlot();
  try {
    return await refresh();
  } finally {
    releaseRefreshSlot();
  }
};

const rankedJobs = (
  pref: Preference,
  roleNames: string[],
  candidates: Job[],
): RankedJob[] => {
  const blockedCompanies = new Set(
    (pref.blocklist ?? "").split(",").map((company) => company.trim().toLowerCase()).filter(Boolean),
  );
  const ranked: RankedJob[] = [];
  for (const job of candidates) {
    if (!job.url || blockedCompanies.has(job.company.toLowerCase())) continue;
    const fit = Math.max(...roleNames.map((role) => fitScore({ ...pref, role }, job)));
    if (fit < MIN_FIT) continue;
    ranked.push({ job, fitScore: fit, earlyBird: daysAgo(job.postedAt) <= EARLY_BIRD_DAYS });
  }
  return ranked;
};

const calculateMatchesForUser = async (userId: string): Promise<number> => {
  const matchCandidates = await loadMatchCandidates(userId);
  if (!matchCandidates) return 0;
  const ranked = rankedJobs(
    matchCandidates.preference,
    matchCandidates.roleNames,
    matchCandidates.candidates,
  );
  await persistRankedMatches(userId, ranked);
  return ranked.length;
};

export const refreshMatchesForUser = (userId: string): Promise<number> => {
  const runningRefresh = refreshesByUser.get(userId);
  if (runningRefresh) return runningRefresh;

  const refresh = runWithRefreshSlot(() => calculateMatchesForUser(userId))
    .finally(() => {
      if (refreshesByUser.get(userId) === refresh) refreshesByUser.delete(userId);
    });
  refreshesByUser.set(userId, refresh);
  return refresh;
};
