import axios from "axios";
import { normalizeJobDescription } from "../../lib/jobDescriptionNormalizer";
import type { RawJob } from "../../shared/jobs/jobMatchScoring";
import { activeBoardSources, BoardSource, recordBoardRun } from "./jobBoardSourceService";

export { configuredJobBoards } from "./jobBoardSourceService";

const fromGreenhouse = (company: string, job: any): RawJob => ({
  source: "greenhouse",
  externalId: company + ":" + job.id,
  title: job.title ?? "",
  company,
  location: job.location?.name ?? null,
  url: job.absolute_url ?? "",
  postedAt: job.updated_at ? new Date(job.updated_at) : null,
  description: normalizeJobDescription(job.content ?? "").plainText,
});

const fetchBoards = async (
  provider: string,
  fetchOne: (source: BoardSource) => Promise<RawJob[]>,
): Promise<RawJob[]> => {
  const sources = await activeBoardSources(provider);
  const results = await Promise.all(sources.map(async (source) => {
    try {
      const jobs = await fetchOne(source);
      await recordBoardRun(source, { jobCount: jobs.length });
      return jobs;
    } catch (error) {
      await recordBoardRun(source, { jobCount: 0, error: error instanceof Error ? error.message : "unknown error" });
      return [];
    }
  }));
  return results.flat();
};

export async function fetchGreenhouseJobs(): Promise<RawJob[]> {
  return fetchBoards("greenhouse", async ({ company, slug }) => {
    const { data } = await axios.get(
      "https://boards-api.greenhouse.io/v1/boards/" + encodeURIComponent(slug) + "/jobs?content=true",
      { timeout: 15000 },
    );
    return (data.jobs ?? []).map((job: any) => fromGreenhouse(company, job));
  });
}

const fromLever = (company: string, job: any): RawJob => ({
  source: "lever",
  externalId: company + ":" + job.id,
  title: job.text ?? "",
  company,
  location: job.categories?.location ?? null,
  url: job.hostedUrl ?? "",
  postedAt: typeof job.createdAt === "number" ? new Date(job.createdAt) : null,
  description: normalizeJobDescription(job.descriptionPlain ?? job.description ?? "").plainText,
});

export async function fetchLeverJobs(): Promise<RawJob[]> {
  return fetchBoards("lever", async ({ company, slug }) => {
    const { data } = await axios.get(
      "https://api.lever.co/v0/postings/" + encodeURIComponent(slug) + "?mode=json",
      { timeout: 15000 },
    );
    return Array.isArray(data) ? data.map((job: any) => fromLever(company, job)) : [];
  });
}
