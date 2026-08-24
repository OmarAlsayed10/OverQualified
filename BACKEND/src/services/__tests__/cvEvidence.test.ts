import { hasSameNumberOccurrences, statementUsesOnlySourceNumbers, unsupportedNumberOccurrences, unsourcedNumbers } from "../../lib/evidenceGrounding";
import { lastPageFromLinkHeader, parseGithubRepoUrl } from "../../lib/githubClient";
import { parseGitlabRepoUrl, gitlabProjectId } from "../../lib/gitlabClient";
import { classifyOwnership, describeOwnership } from "../repoAnalysisService";
import { auditCV } from "../claimAuditService";
import { coerceProjectOwnership } from "../projectOwnership";
import { improveBuilderCV } from "../builderImproveService";
import { coerceFormData } from "../cvParseService";
import { fixableDimensionDetails, requiresCandidateEvidence } from "../cvImprovementRules";

describe("evidenceGrounding", () => {
  it("accepts numbers present in the source", () => {
    expect(statementUsesOnlySourceNumbers("Shipped 5 plugins", "the repo has 5 plugins")).toBe(true);
  });

  it("reports numbers absent from the source", () => {
    expect(unsourcedNumbers("Improved throughput by 60%", "no numbers here")).toEqual(["60"]);
  });

  it("does not treat a bare number as a percentage match", () => {
    expect(unsourcedNumbers("Reduced latency 40%", "version 40 of the spec")).toEqual(["40"]);
  });

  it("ignores thousands separators when matching", () => {
    expect(statementUsesOnlySourceNumbers("Served 10,000 users", "served 10000 users")).toBe(true);
  });

  it("rejects new and duplicated numeric claims in a rewrite", () => {
    const source = "Improved latency 40% and supported 3 teams";
    const rewrite = "Improved latency 40% and supported 3 teams while mentoring 3 teams and shipping 12 releases";

    expect(unsupportedNumberOccurrences(rewrite, source)).toEqual(["3", "12"]);
    expect(unsupportedNumberOccurrences(source, "Improved latency 40%")).toEqual(["3"]);
  });

  it("2026-08 rejects builder rewrites that alter numeric occurrences", () => {
    const original = "Built 6 plugins from June 2025 with 40% lower latency";

    expect(hasSameNumberOccurrences(original, "Delivered 6 plugins from June 2025 with 40% lower latency")).toBe(true);
    expect(hasSameNumberOccurrences(original, "Delivered 7 plugins from June 2025 with 40% lower latency")).toBe(false);
    expect(hasSameNumberOccurrences(original, "Delivered 6 plugins with 40% lower latency")).toBe(false);
  });
});

describe("cvImprovementRules", () => {
  it("2026-08 keeps automatic fixes away from candidate-owned metrics", () => {
    expect(requiresCandidateEvidence("Add quantified achievements to highlight impact")).toBe(true);
    expect(requiresCandidateEvidence("Optional: include a result in your summary only when you can verify the exact figure.")).toBe(true);
    expect(requiresCandidateEvidence("Optional: add a verified figure to 2 bullets only where you have exact evidence.")).toBe(true);
    expect(requiresCandidateEvidence("Correct the typo in the course title")).toBe(false);
  });

  it("applies an exact certification correction without rewriting prose", async () => {
    const formData = coerceFormData({
      personalInfo: { ProfessionalSummary: "Frontend developer.", professionalTitle: "React,TypeScript Developer" },
      skills: {
        certifications: [{ name: "he Ultimate React Course", issuer: "Udemy", date: "", url: "", description: "" }],
      },
    });

    const result = await improveBuilderCV(formData, [{
      name: "Grammar & Spelling",
      score: 90,
      details: ['Correct "he Ultimate React Course" to "The Ultimate React Course".'],
    }]);

    expect(result.formData.skills.certifications[0].name).toBe("The Ultimate React Course");
    expect(result.formData.personalInfo.ProfessionalSummary).toBe("Frontend developer.");
    expect(result.formData.personalInfo.professionalTitle).toBe("React,TypeScript Developer");
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({
      section: "Certification — he Ultimate React Course",
      before: "he Ultimate React Course · Udemy",
      after: "The Ultimate React Course · Udemy",
    });
  });

  it("keeps only actionable score details for rewriting", () => {
    const dimensions = fixableDimensionDetails([
      { name: "Grammar & Spelling", score: 80, details: ["Correct the typo in the course title"] },
      { name: "Content Quality", score: 95, details: ["Add a quantified result to the summary"] },
      { name: "Impact & Results", score: 87, details: ["Strong — no specific issue flagged here."] },
    ]);

    expect(dimensions).toEqual([
      { name: "Grammar & Spelling", score: 80, details: ["Correct the typo in the course title"] },
    ]);
  });
});

describe("classifyOwnership", () => {
  it("classifies by commit share", () => {
    expect(classifyOwnership(121 / 128)).toBe("sole");
    expect(classifyOwnership(145 / 219)).toBe("primary");
    expect(classifyOwnership(0.25)).toBe("major");
    expect(classifyOwnership(8 / 80)).toBe("contributor");
  });

  it("describes ownership with the raw counts", () => {
    expect(describeOwnership({ login: "x", commits: 121, share: 121 / 128 }, 128)).toBe(
      "Sole engineer, 121 of 128 commits",
    );
  });
});

describe("githubClient parsing", () => {
  it("extracts owner and repo, stripping .git", () => {
    expect(parseGithubRepoUrl("https://github.com/OmarAlsayed10/Furnterra.git")).toEqual({
      owner: "OmarAlsayed10",
      repo: "Furnterra",
    });
  });

  it("rejects non-GitHub hosts", () => {
    expect(parseGithubRepoUrl("https://gitlab.com/owner/repo")).toBeNull();
  });

  it("parses GitLab URLs including nested groups", () => {
    expect(parseGitlabRepoUrl("https://gitlab.com/penta-b/plugins/ma-plugin-bookmark")).toEqual({
      owner: "penta-b/plugins",
      repo: "ma-plugin-bookmark",
    });
  });

  it("strips the GitLab dash segment from tree URLs", () => {
    expect(parseGitlabRepoUrl("https://gitlab.com/group/repo/-")).toEqual({
      owner: "group",
      repo: "repo",
    });
  });

  it("url-encodes the GitLab project path", () => {
    expect(gitlabProjectId("penta-b/plugins", "ma-plugin-bookmark")).toBe(
      "penta-b%2Fplugins%2Fma-plugin-bookmark",
    );
  });

  it("reads the last page number from a Link header", () => {
    const header =
      '<https://api.github.com/repositories/1/commits?per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/commits?per_page=1&page=219>; rel="last"';
    expect(lastPageFromLinkHeader(header)).toBe(219);
  });

  it("returns null when there is only one page", () => {
    expect(lastPageFromLinkHeader("")).toBeNull();
  });
});

describe("auditCV", () => {
  it("flags an unsourced metric in an experience bullet", () => {
    const findings = auditCV({
      experience: [{ description: "Reduced page load times by 30%" }],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].section).toBe("experience");
    expect(findings[0].unsourced).toEqual(["30"]);
  });

  it("challenges unobservable outcomes specifically", () => {
    const findings = auditCV({
      experience: [{ description: "Drove a 40% increase in interview rates" }],
    });

    expect(findings[0].challenge).toContain("after the user leaves your product");
  });

  it("passes a bullet whose numbers appear in the evidence", () => {
    const findings = auditCV(
      { projects: [{ description: "Sole engineer, 121 of 128 commits" }] },
      "Sole engineer, 121 of 128 commits",
    );

    expect(findings).toEqual([]);
  });

  it("returns nothing for bullets with no numbers", () => {
    const findings = auditCV({
      experience: [{ description: "Built an offline-first clinic management system" }],
    });

    expect(findings).toEqual([]);
  });
});

describe("coerceProjectOwnership", () => {
  it("keeps a known value and defaults an unknown one", () => {
    expect(coerceProjectOwnership("founded")).toBe("founded");
    expect(coerceProjectOwnership("nonsense")).toBe("independent");
    expect(coerceProjectOwnership(undefined)).toBe("independent");
  });
});
