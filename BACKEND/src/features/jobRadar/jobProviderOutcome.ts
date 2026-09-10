import { RawJob } from "../../shared/jobs/jobMatchScoring";
import { logger } from "../../lib/logger";

export type JobProviderStatus = "success" | "empty" | "unconfigured" | "failed";

export interface JobProviderOutcome {
  provider: string;
  status: JobProviderStatus;
  jobs: RawJob[];
  errorCode?: "REQUEST_FAILED";
}

export interface JobProvider {
  id: string;
  configured: () => boolean;
  fetch: () => Promise<RawJob[]>;
}

export interface JobProviderDiagnostic {
  provider: string;
  status: JobProviderStatus;
  jobCount: number;
  errorCode?: "REQUEST_FAILED";
}

export const providerDiagnostic = (outcome: JobProviderOutcome): JobProviderDiagnostic => ({
  provider: outcome.provider,
  status: outcome.status,
  jobCount: outcome.jobs.length,
  ...(outcome.errorCode ? { errorCode: outcome.errorCode } : {}),
});

export const providerDiagnostics = (outcomes: JobProviderOutcome[]): JobProviderDiagnostic[] => {
  const diagnostics = new Map<string, JobProviderDiagnostic>();
  for (const outcome of outcomes) {
    const current = diagnostics.get(outcome.provider);
    const diagnostic = providerDiagnostic(outcome);
    if (!current) diagnostics.set(outcome.provider, diagnostic);
    else if (current.status === "failed" || diagnostic.status === "failed") diagnostics.set(outcome.provider, { ...current, status: "failed", jobCount: current.jobCount + diagnostic.jobCount, errorCode: "REQUEST_FAILED" });
    else if (current.status === "success" || diagnostic.status === "success") diagnostics.set(outcome.provider, { ...current, status: "success", jobCount: current.jobCount + diagnostic.jobCount });
    else if (current.status === "empty" || diagnostic.status === "empty") diagnostics.set(outcome.provider, { ...current, status: "empty", jobCount: 0 });
  }
  return [...diagnostics.values()];
};

export async function fetchProvider(provider: JobProvider): Promise<JobProviderOutcome> {
  if (!provider.configured()) return { provider: provider.id, status: "unconfigured", jobs: [] };
  try {
    const jobs = await provider.fetch();
    return { provider: provider.id, status: jobs.length ? "success" : "empty", jobs };
  } catch (error) {
    logger.error(`[jobRadar] ${provider.id} fetch failed:`, error instanceof Error ? error.message : "unknown error");
    return { provider: provider.id, status: "failed", jobs: [], errorCode: "REQUEST_FAILED" };
  }
}
