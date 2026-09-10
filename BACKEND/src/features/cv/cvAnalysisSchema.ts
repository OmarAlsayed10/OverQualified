import { z } from "zod";

const cappedString = (max: number) => z
  .string()
  .trim()
  .min(1)
  .transform((text) => text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

const cappedArray = <T extends z.ZodTypeAny>(entry: T, min: number, max: number) => z
  .array(entry)
  .min(min)
  .transform((entries) => entries.slice(0, max));

const evidenceSchema = z.object({
  cvExcerpt: cappedString(500).nullable(),
  jobRequirement: cappedString(500).nullable(),
  rationale: cappedString(800),
}).strip();

export const analysisFindingSchema = z.object({
  sectionKey: z.enum(["summary", "experience", "education", "projects", "skills", "formatting", "other"]),
  section: cappedString(100),
  suggestion: cappedString(1500),
  evidence: evidenceSchema,
}).strip();

export const aiResultSchema = z.object({
  positiveFeedback: cappedArray(cappedString(1000), 2, 4),
  neutralFeedback: cappedArray(cappedString(1000), 1, 3),
  negativeFeedback: cappedArray(cappedString(1000), 0, 4),
  sectionsToImprove: cappedArray(analysisFindingSchema, 0, 10),
  atsCheckerNotes: cappedArray(cappedString(1000), 1, 4),
  matchJobTitle: cappedString(150),
  interviewQuestions: cappedArray(cappedString(1000), 10, 10),
}).strip();

export type AiResult = z.infer<typeof aiResultSchema>;
export type AnalysisFinding = z.infer<typeof analysisFindingSchema>;
