import { z } from "zod";

const cappedText = (max: number) => z.string().trim().min(1).max(max);
const durationSchema = z.number().int().min(10).max(60)
  .refine((minutes) => minutes % 5 === 0, "Duration must use five-minute increments.");

const uploadedCvSchema = z.object({
  fileName: cappedText(255),
  formData: z.record(z.unknown()),
}).strip();

export const startInterviewSchema = z.object({
  cvId: z.string().uuid().optional(),
  uploadedCv: uploadedCvSchema.optional(),
  targetRole: cappedText(150),
  jobDescription: z.string().trim().max(12000).default(""),
  language: z.enum(["en", "ar"]).default("en"),
  durationMinutes: durationSchema.nullable().default(null),
}).strip().superRefine((input, context) => {
  if (Boolean(input.cvId) === Boolean(input.uploadedCv)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cvId"],
      message: "Choose one CV source.",
    });
  }
});

export const submitInterviewAnswerSchema = z.object({
  answer: cappedText(5000),
}).strip();

const evidenceExcerptSchema = z.string().trim().min(3).max(500);

const feedbackStrengthSchema = z.object({
  feedback: cappedText(500),
  evidenceExcerpt: evidenceExcerptSchema,
}).strip();

export const interviewFeedbackSchema = z.object({
  score: z.number().int().min(1).max(5),
  strengths: z.array(feedbackStrengthSchema).max(3),
  improvements: z.array(cappedText(500)).max(3),
}).strip();

const legacyInterviewFeedbackSchema = z.object({
  score: z.number().int().min(1).max(5),
  strengths: z.array(cappedText(500)).max(3),
  improvements: z.array(cappedText(500)).max(3),
  answerExcerpt: z.string().trim().max(500).nullable(),
  cvExcerpt: z.string().trim().max(500).nullable(),
}).strip().transform((feedback) => ({
  score: feedback.score,
  strengths: feedback.answerExcerpt
    ? feedback.strengths.map((entry) => ({ feedback: entry, evidenceExcerpt: feedback.answerExcerpt! }))
    : [],
  improvements: feedback.improvements,
}));

const reportFindingSchema = z.object({
  feedback: cappedText(700),
  evidenceExcerpt: evidenceExcerptSchema,
}).strip();

export const interviewReportSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  strengths: z.array(reportFindingSchema).min(1).max(4),
  improvements: z.array(reportFindingSchema).min(1).max(4),
  practiceNext: z.array(cappedText(500)).min(1).max(3),
  topicsNotReached: z.array(cappedText(300)).max(3),
}).strip();

const legacyInterviewReportSchema = interviewReportSchema
  .omit({ topicsNotReached: true })
  .extend({ topicsNotReached: z.array(cappedText(300)).max(3).default([]) });

const interviewTurnSchema = z.object({
  question: cappedText(1200),
  answer: cappedText(5000),
  feedback: z.union([interviewFeedbackSchema, legacyInterviewFeedbackSchema]),
}).strip();

export const storedInterviewSessionSchema = z.object({
  version: z.literal(1),
  cvId: z.string().uuid().nullable().default(null),
  cvTitle: cappedText(200),
  cvContext: cappedText(30000),
  targetRole: cappedText(150),
  jobDescription: z.string().max(12000),
  language: z.enum(["en", "ar"]),
  status: z.enum(["active", "completed"]),
  currentQuestion: cappedText(1200).nullable(),
  turns: z.array(interviewTurnSchema).max(15),
  report: z.union([interviewReportSchema, legacyInterviewReportSchema]).nullable(),
  durationMinutes: durationSchema.nullable().default(null),
  remainingSeconds: z.number().int().min(0).max(3600).nullable().default(null),
  questionLimit: z.number().int().min(5).max(15).default(5),
}).strip();

export type StartInterviewInput = z.infer<typeof startInterviewSchema>;
export type InterviewFeedback = z.infer<typeof interviewFeedbackSchema>;
export type InterviewReport = z.infer<typeof interviewReportSchema>;
export type StoredInterviewSession = z.infer<typeof storedInterviewSessionSchema>;
