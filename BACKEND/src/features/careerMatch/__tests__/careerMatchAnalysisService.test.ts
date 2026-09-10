import { scoreCVWithBreakdown } from "../../cv/cvScoring";
import { matchVacancy, retryVacancyMatchWithVerbatimExcerpts } from "../careerMatchService";
import { analyzeCareerMatch } from "../careerMatchAnalysisService";

jest.mock("../../cv/cvScoring", () => ({ scoreCVWithBreakdown: jest.fn() }));
jest.mock("../careerMatchService", () => ({
  discoverRoles: jest.fn(),
  matchVacancy: jest.fn(),
  retryVacancyMatchWithVerbatimExcerpts: jest.fn(),
}));

const cvText = "Software Engineer with Angular experience and responsive web application delivery.";
const jobDescription = "Build and maintain Angular applications.";
const requirement = {
  requirement: jobDescription,
  cvEvidence: "Angular experience",
  explanation: "Direct Angular evidence",
  priority: "must_have" as const,
  category: "skill" as const,
  evidenceLevel: "professional" as const,
};
const vacancyMatch = {
  mode: "vacancy_match" as const,
  inferredJobTitle: "Junior Engineer",
  summary: "Strong Angular evidence",
  matchedRequirements: [requirement],
  partialRequirements: [],
  missingRequirements: [],
  recommendations: [],
  alternativeRoles: [],
};

describe("Career Match analysis recovery", () => {
  test("2026-09 retries unverifiable vacancy evidence before returning a reduced result", async () => {
    jest.mocked(scoreCVWithBreakdown).mockResolvedValue({ total: 100, categories: [], dimensions: [] });
    jest.mocked(matchVacancy).mockResolvedValue({
      ...vacancyMatch,
      matchedRequirements: [{ ...requirement, cvEvidence: "Invented evidence" }],
    });
    jest.mocked(retryVacancyMatchWithVerbatimExcerpts).mockResolvedValue(vacancyMatch);

    const analysis = await analyzeCareerMatch({
      cvText,
      jobDescription,
      targetJobTitle: "Junior Engineer",
      experienceLevel: "Junior",
      language: "en",
      pageCount: 1,
    });

    if (analysis.mode !== "vacancy_match") throw new Error("Expected vacancy analysis");
    expect(analysis.summary).toBe("Strong Angular evidence");
    expect(analysis.matchedRequirements).toHaveLength(1);
  });

  test("2026-09 retries Groq JSON validation failures", async () => {
    const jsonError = Object.assign(new Error("JSON validation failed"), { code: "json_validate_failed" });
    jest.mocked(scoreCVWithBreakdown).mockResolvedValue({ total: 100, categories: [], dimensions: [] });
    jest.mocked(matchVacancy).mockRejectedValue(jsonError);
    jest.mocked(retryVacancyMatchWithVerbatimExcerpts).mockResolvedValue(vacancyMatch);

    const analysis = await analyzeCareerMatch({
      cvText,
      jobDescription,
      targetJobTitle: "Junior Engineer",
      experienceLevel: "Junior",
      language: "en",
      pageCount: 1,
    });

    if (analysis.mode !== "vacancy_match") throw new Error("Expected vacancy analysis");
    expect(analysis.summary).toBe("Strong Angular evidence");
    expect(analysis.matchedRequirements).toHaveLength(1);
  });

  test("2026-09 recovers the first response when Groq rejects the corrective retry", async () => {
    jest.mocked(scoreCVWithBreakdown).mockResolvedValue({ total: 100, categories: [], dimensions: [] });
    jest.mocked(matchVacancy).mockResolvedValue({
      ...vacancyMatch,
      matchedRequirements: [{ ...requirement, cvEvidence: "Invented evidence" }],
    });
    jest.mocked(retryVacancyMatchWithVerbatimExcerpts).mockRejectedValue(new Error("JSON validation failed"));

    const analysis = await analyzeCareerMatch({
      cvText,
      jobDescription,
      targetJobTitle: "Junior Engineer",
      experienceLevel: "Junior",
      language: "en",
      pageCount: 1,
    });

    if (analysis.mode !== "vacancy_match") throw new Error("Expected vacancy analysis");
    expect(analysis.summary).toBe("This is a best-effort comparison based only on verified evidence.");
    expect(analysis.missingRequirements).toHaveLength(1);
    expect(analysis.jobMatchScore).toBe(0);
  });
});
