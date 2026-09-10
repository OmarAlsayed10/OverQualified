import { InvalidAiResponseError, parseAiResponse } from "../../../lib/aiResponseValidation";
import { finalizeRoleDiscovery, finalizeVacancyMatch, recoverVacancyMatch } from "../careerMatchResultService";
import { RoleDiscoveryAi, VacancyMatchAi, roleDiscoveryAiSchema } from "../careerMatchSchemas";

const cvText = `Built scalable
REST APIs for authentication.
Developed React dashboards for customers.
Docker, Jenkins, GitHub Actions
Improved page speed by 40%.`;

const roleAnalysis: RoleDiscoveryAi = {
  mode: "role_discovery",
  inferredProfile: "Full-stack developer with frontend depth",
  roles: [
    {
      title: "Full Stack Developer",
      summary: "Direct full-stack evidence",
      evidenceLevel: "professional",
      fitBreakdown: { professionalExperience: 35, relevantProjects: 22, demonstratedSkills: 18, educationAndTraining: 10 },
      cvEvidence: ["Built scalable REST APIs for authentication."],
      strengths: ["API delivery"],
      gaps: [],
    },
    {
      title: "Frontend Developer",
      summary: "Strong project evidence",
      evidenceLevel: "project",
      fitBreakdown: { professionalExperience: 20, relevantProjects: 24, demonstratedSkills: 18, educationAndTraining: 10 },
      cvEvidence: ["Developed React dashboards for customers."],
      strengths: ["React"],
      gaps: [],
    },
    {
      title: "DevOps Engineer",
      summary: "Skills exposure only",
      evidenceLevel: "skills_only",
      fitBreakdown: { professionalExperience: 30, relevantProjects: 20, demonstratedSkills: 20, educationAndTraining: 10 },
      cvEvidence: ["Docker, Jenkins, GitHub Actions"],
      strengths: ["Tool familiarity"],
      gaps: ["No demonstrated infrastructure ownership"],
    },
  ],
  recommendations: [{
    action: "Add scale to the performance result.",
    evidence: { cvExcerpt: "Improved page speed by 40%.", rationale: "The metric is useful evidence." },
  }],
};

const vacancyAnalysis: VacancyMatchAi = {
  mode: "vacancy_match",
  inferredJobTitle: "Full Stack Developer",
  summary: "Strong match",
  matchedRequirements: [{
    requirement: "Build scalable REST APIs",
    cvEvidence: "Built scalable REST APIs for authentication.",
    explanation: "Direct API evidence",
    priority: "must_have",
    category: "skill",
    evidenceLevel: "professional",
  }],
  partialRequirements: [],
  missingRequirements: [{
    requirement: "Operate Kubernetes clusters",
    explanation: "Not shown in the CV",
    priority: "preferred",
    category: "skill",
  }],
  recommendations: [{
    action: "Clarify infrastructure ownership.",
    evidence: {
      cvExcerpt: "Docker, Jenkins, GitHub Actions",
      jobRequirement: "Operate Kubernetes clusters",
      rationale: "Tools are listed but cluster operation is not demonstrated.",
    },
  }],
  alternativeRoles: ["Backend Developer"],
};

describe("Career Match score calibration", () => {
  test("2026-07 single-digit legacy scores are rejected", () => {
    const legacyRole = {
      summary: "Evidence-backed role",
      cvEvidence: ["Built scalable REST APIs for authentication."],
      strengths: ["API delivery"],
      gaps: [],
    };
    const legacyResponse = {
      mode: "role_discovery",
      inferredProfile: "Full Stack Developer",
      cvQualityScore: 8,
      roles: [
        { ...legacyRole, title: "Full Stack Developer", fitScore: 9, fitType: "primary" },
        { ...legacyRole, title: "Frontend Developer", fitScore: 8, fitType: "adjacent" },
        { ...legacyRole, title: "DevOps Engineer", fitScore: 6, fitType: "stretch" },
      ],
      recommendations: [{
        action: "Add metrics.",
        evidence: { cvExcerpt: "Improved page speed by 40%.", rationale: "Quantified evidence" },
      }],
    };
    expect(() => parseAiResponse(JSON.stringify(legacyResponse), roleDiscoveryAiSchema)).toThrow(InvalidAiResponseError);
  });

  test("2026-07 provider metadata is stripped from role discovery", () => {
    const providerResponse = {
      ...roleAnalysis,
      providerMetadata: { model: "career-match" },
      roles: roleAnalysis.roles.map((role) => ({ ...role, fitScore: 99 })),
    };

    expect(parseAiResponse(JSON.stringify(providerResponse), roleDiscoveryAiSchema)).toEqual(roleAnalysis);
  });

  test("server ranks roles and caps skills-only evidence", () => {
    const finalized = finalizeRoleDiscovery(roleAnalysis, 78, cvText);
    expect(finalized.cvQualityScore).toBe(78);
    expect(finalized.roles.map((role) => [role.title, role.fitScore, role.fitType])).toEqual([
      ["Full Stack Developer", 85, "primary"],
      ["Frontend Developer", 72, "adjacent"],
      ["DevOps Engineer", 45, "stretch"],
    ]);
  });

  test("citation absent from the CV rejects the analysis", () => {
    const inventedEvidence: RoleDiscoveryAi = {
      ...roleAnalysis,
      roles: [{ ...roleAnalysis.roles[0], cvEvidence: ["Operated Kubernetes in production"] }, ...roleAnalysis.roles.slice(1)],
    };
    expect(() => finalizeRoleDiscovery(inventedEvidence, 78, cvText)).toThrow(InvalidAiResponseError);
  });

  test("vacancy score is calculated from requirement status and evidence", () => {
    const jobDescription = "Build scalable REST APIs. Operate Kubernetes clusters.";
    const finalized = finalizeVacancyMatch(vacancyAnalysis, 78, cvText, jobDescription);
    expect(finalized.jobMatchScore).toBe(70);
    expect(finalized.matchBreakdown).toEqual({
      requirementsMatch: 30,
      relevantExperience: 17,
      demonstratedSkills: 13,
      evidenceQuality: 10,
    });
    expect(finalized.screeningRisk).toBe("low");
    expect(finalized.cvQualityScore).toBe(78);
  });

  test("2026-09 explicit vacancy alternatives use exact CV evidence", () => {
    const requirements = [
      "NgRx or another state-management approach.",
      "Angular Material, Tailwind, or structured SCSS.",
      "Testing tools — Jasmine, Jest, Cypress or Playwright.",
      "RTL layout experience, or Arabic alongside English.",
      "Server-side rendering with Angular Universal, or other SSR experience.",
    ];
    const source = `${cvText}\nRedux and Zustand state management\nTailwind CSS\nJest\nArabic English`;
    const analysis = finalizeVacancyMatch(
      {
        ...vacancyAnalysis,
        missingRequirements: [
          ...vacancyAnalysis.missingRequirements,
          ...requirements.map((requirement) => ({ requirement, explanation: "Not found", priority: "preferred" as const, category: "skill" as const })),
        ],
      },
      78,
      source,
      `Build scalable REST APIs. Operate Kubernetes clusters. ${requirements.join(" ")}`,
    );

    expect(analysis.matchedRequirements.map((entry) => entry.requirement)).toEqual([
      "Build scalable REST APIs",
      ...requirements.slice(0, 4),
    ]);
    expect(analysis.missingRequirements.map((entry) => entry.requirement)).toEqual([
      "Operate Kubernetes clusters",
      requirements[4],
    ]);
  });

  test("2026-09 related UI frameworks receive partial rather than exact credit", () => {
    const transferable = [
      "An understanding of responsive layout and cross-browser behaviour.",
      "Attention to visual detail — spacing, hover and loading states.",
      "Server-side rendering with Angular Universal, or other SSR experience.",
      "Accessibility awareness (WCAG basics, keyboard navigation, screen readers).",
    ];
    const unsupported = ["Basic RxJS observables.", "Practical SEO knowledge."];
    const source = `${cvText}\nNext.js, React, Tailwind CSS, Radix UI, Chakra UI`;
    const analysis = finalizeVacancyMatch(
      {
        ...vacancyAnalysis,
        missingRequirements: [...vacancyAnalysis.missingRequirements, ...[...transferable, ...unsupported].map((requirement) => ({ requirement, explanation: "Not found", priority: "preferred" as const, category: "skill" as const }))],
      },
      78,
      source,
      `Build scalable REST APIs. Operate Kubernetes clusters. ${[...transferable, ...unsupported].join(" ")}`,
    );

    expect(analysis.partialRequirements.map((entry) => entry.requirement)).toEqual(transferable);
    expect(analysis.missingRequirements.map((entry) => entry.requirement)).toEqual([
      "Operate Kubernetes clusters",
      ...unsupported,
    ]);
  });

  test("2026-09 unverifiable claimed matches count as missing in a recovered score", () => {
    const recovered = recoverVacancyMatch(
      {
        ...vacancyAnalysis,
        matchedRequirements: [{ ...vacancyAnalysis.matchedRequirements[0], cvEvidence: "Invented evidence" }],
      },
      78,
      cvText,
      "Build scalable REST APIs. Operate Kubernetes clusters.",
      "Full Stack Developer",
    );

    expect(recovered.matchedRequirements).toEqual([]);
    expect(recovered.missingRequirements).toHaveLength(2);
    expect(recovered.jobMatchScore).toBe(0);
  });

  test("missing must-have requirement raises screening risk", () => {
    const mustHaveMissing: VacancyMatchAi = {
      ...vacancyAnalysis,
      missingRequirements: vacancyAnalysis.missingRequirements.map((entry) => ({
        ...entry,
        priority: "must_have",
      })),
    };
    const finalized = finalizeVacancyMatch(
      mustHaveMissing,
      78,
      cvText,
      "Build scalable REST APIs. Operate Kubernetes clusters.",
    );
    expect(finalized.screeningRisk).toBe("high");
    expect(finalized.jobMatchScore).toBe(56);
  });
});
