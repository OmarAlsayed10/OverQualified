import { z } from "zod";

const score = z.number().int().min(0).max(100);
const nonEmpty = z.string().trim().min(1);

const roleFitBreakdownSchema = z.object({
  professionalExperience: z.number().int().min(0).max(40),
  relevantProjects: z.number().int().min(0).max(25),
  demonstratedSkills: z.number().int().min(0).max(20),
  educationAndTraining: z.number().int().min(0).max(15),
}).strip();

const roleCandidateSchema = z.object({
  title: nonEmpty,
  summary: nonEmpty,
  evidenceLevel: z.enum(["professional", "project", "training", "skills_only"]),
  fitBreakdown: roleFitBreakdownSchema,
  cvEvidence: z.array(nonEmpty).min(1).max(5),
  strengths: z.array(nonEmpty).min(1).max(5),
  gaps: z.array(nonEmpty).max(5),
}).strip();

const discoveryRecommendationSchema = z.object({
  action: nonEmpty,
  evidence: z.object({ cvExcerpt: nonEmpty, rationale: nonEmpty }).strip(),
}).strip();

const discoveryShape = {
  mode: z.literal("role_discovery"),
  inferredProfile: nonEmpty,
  roles: z.array(roleCandidateSchema).min(3).max(5),
  recommendations: z.array(discoveryRecommendationSchema).min(1).max(6),
};

export const roleDiscoveryAiSchema = z.object(discoveryShape).strip();

export const roleDiscoverySchema = z.object({
  ...discoveryShape,
  cvQualityScore: score,
  recommendations: z.array(discoveryRecommendationSchema).max(6),
  roles: z.array(roleCandidateSchema.extend({
    fitScore: score,
    fitType: z.enum(["primary", "adjacent", "stretch"]),
  }).strict()).min(3).max(5),
}).strict().superRefine((analysis, context) => {
  if (analysis.roles[0]?.fitType !== "primary") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["roles", 0, "fitType"], message: "The highest-ranked role must be primary." });
  }
  if (analysis.roles.filter((role) => role.fitType === "primary").length !== 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["roles"], message: "Exactly one primary role is required." });
  }
});

export const vacancyRequirementSchema = z.object({
  requirement: nonEmpty,
  cvEvidence: nonEmpty,
  explanation: nonEmpty,
  priority: z.enum(["must_have", "preferred"]),
  category: z.enum(["skill", "experience", "education", "certification", "eligibility", "responsibility"]),
  evidenceLevel: z.enum(["professional", "project", "training", "skills_only"]),
}).strip();

export const missingRequirementSchema = z.object({
  requirement: nonEmpty,
  explanation: nonEmpty,
  priority: z.enum(["must_have", "preferred"]),
  category: z.enum(["skill", "experience", "education", "certification", "eligibility", "responsibility"]),
}).strip();

export const vacancyRecommendationSchema = z.object({
  action: nonEmpty,
  evidence: z.object({
    cvExcerpt: nonEmpty,
    jobRequirement: nonEmpty,
    rationale: nonEmpty,
  }).strip(),
}).strip();

const vacancyMatchBreakdownSchema = z.object({
  requirementsMatch: z.number().int().min(0).max(45),
  relevantExperience: z.number().int().min(0).max(25),
  demonstratedSkills: z.number().int().min(0).max(20),
  evidenceQuality: z.number().int().min(0).max(10),
}).strip();

const vacancyShape = {
  mode: z.literal("vacancy_match"),
  inferredJobTitle: nonEmpty,
  summary: nonEmpty,
  matchedRequirements: z.array(vacancyRequirementSchema),
  partialRequirements: z.array(vacancyRequirementSchema),
  missingRequirements: z.array(missingRequirementSchema),
  recommendations: z.array(vacancyRecommendationSchema),
  alternativeRoles: z.array(nonEmpty),
};

export const vacancyMatchAiSchema = z.object(vacancyShape).strip();
export const vacancyMatchSchema = z.object({
  ...vacancyShape,
  reviewNeededRequirements: z.array(z.object({ requirement: nonEmpty, note: nonEmpty }).strict()).max(20),
  cvQualityScore: score,
  jobMatchScore: score,
  matchBreakdown: vacancyMatchBreakdownSchema,
  screeningRisk: z.enum(["low", "medium", "high"]),
  scoreLabel: z.enum(["strong_evidence_match", "partial_evidence_match", "low_evidence_match"]),
}).strict();

const marketSourceSchema = z.object({
  title: nonEmpty,
  url: z.string().url(),
  publishedAt: z.string().nullable(),
}).strip();

export const marketSnapshotSchema = z.object({
  searchedAt: z.string().datetime(),
  signals: z.array(z.object({
    roleTitle: nonEmpty,
    demand: z.enum(["strong", "moderate", "niche"]),
    summary: nonEmpty,
    sources: z.array(marketSourceSchema).min(1).max(5),
  }).strip()).min(1).max(5),
}).strip();

export const careerMatchCachedPayloadSchema = z.object({
  analysis: z.union([roleDiscoverySchema, vacancyMatchSchema]),
  marketSnapshot: marketSnapshotSchema.nullable(),
}).strict();

export type RoleDiscoveryAi = z.infer<typeof roleDiscoveryAiSchema>;
export type VacancyMatchAi = z.infer<typeof vacancyMatchAiSchema>;
export type RoleDiscovery = z.infer<typeof roleDiscoverySchema>;
export type VacancyMatch = z.infer<typeof vacancyMatchSchema>;
export type MarketSnapshot = z.infer<typeof marketSnapshotSchema>;
export type CareerMatchCachedPayload = z.infer<typeof careerMatchCachedPayloadSchema>;
