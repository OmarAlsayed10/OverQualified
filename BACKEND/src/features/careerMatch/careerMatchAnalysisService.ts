import { scoreCVWithBreakdown } from "../cv/cvScoring";
import { discoverRoles, matchVacancy, retryVacancyMatchWithVerbatimExcerpts, Language } from "./careerMatchService";
import { finalizeRoleDiscovery, finalizeVacancyMatch, recoverVacancyMatch } from "./careerMatchResultService";
import { RoleDiscovery, VacancyMatch } from "./careerMatchSchemas";
import { InvalidAiResponseError } from "../../lib/aiResponseValidation";

export interface CareerMatchAnalysisInput {
  cvText: string;
  targetJobTitle: string;
  experienceLevel: string;
  jobDescription: string;
  language: Language;
  pageCount: number;
}

async function roleDiscovery(input: CareerMatchAnalysisInput): Promise<RoleDiscovery> {
  const [candidateRoles, cvQuality] = await Promise.all([
    discoverRoles(input.cvText, input.targetJobTitle, input.experienceLevel, input.language),
    scoreCVWithBreakdown(input.cvText, "", input.experienceLevel, input.language, input.pageCount),
  ]);
  return finalizeRoleDiscovery(candidateRoles, cvQuality.total, input.cvText);
}

async function vacancyAnalysis(input: CareerMatchAnalysisInput): Promise<VacancyMatch> {
  const cvQuality = await scoreCVWithBreakdown(input.cvText, "", input.experienceLevel, input.language, input.pageCount);
  let providerResponse: unknown;
  try {
    const vacancyMatch = await matchVacancy(input.cvText, input.jobDescription, input.targetJobTitle, { experienceLevel: input.experienceLevel, language: input.language });
    providerResponse = vacancyMatch;
    return finalizeVacancyMatch(vacancyMatch, cvQuality.total, input.cvText, input.jobDescription);
  } catch (error) {
    if (!retryableMatchError(error)) throw error;
    if (error instanceof InvalidAiResponseError) providerResponse = error.responsePayload ?? providerResponse;
  }

  try {
    const vacancyMatch = await retryVacancyMatchWithVerbatimExcerpts(input.cvText, input.jobDescription, input.targetJobTitle, input.experienceLevel, input.language);
    providerResponse = vacancyMatch;
    return finalizeVacancyMatch(vacancyMatch, cvQuality.total, input.cvText, input.jobDescription);
  } catch (error) {
    if (recoverableMatchError(error)) providerResponse = error.responsePayload ?? providerResponse;
    else if (!providerResponse) throw error;
    return recoverVacancyMatch(providerResponse, cvQuality.total, input.cvText, input.jobDescription, input.targetJobTitle);
  }
}
const recoverableMatchError = (error: unknown): error is InvalidAiResponseError =>
  error instanceof InvalidAiResponseError
  && (error.reason === "invalid_shape" || error.reason === "source_evidence_mismatch");

const retryableMatchError = (error: unknown): boolean =>
  recoverableMatchError(error)
  || (typeof error === "object" && error !== null && "code" in error && error.code === "json_validate_failed");

export function analyzeCareerMatch(input: CareerMatchAnalysisInput): Promise<RoleDiscovery | VacancyMatch> {
  return input.jobDescription ? vacancyAnalysis(input) : roleDiscovery(input);
}
