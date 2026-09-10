import { z } from "zod";
import { logger } from "./logger";

export type InvalidAiResponseReason =
  | "malformed_json"
  | "invalid_shape"
  | "source_evidence_mismatch"
  | "uncalibrated_result";

export class InvalidAiResponseError extends Error {
  constructor(
    public readonly reason: InvalidAiResponseReason = "invalid_shape",
    message = "The AI provider returned an invalid response.",
    public readonly responsePayload?: unknown,
  ) {
    super(message);
    this.name = "InvalidAiResponseError";
  }
}

export function parseAiResponse<T>(raw: string, schema: z.ZodType<T>): T {
  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    throw new InvalidAiResponseError("malformed_json", "The AI provider returned malformed JSON.");
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    // Do not log the response: it can contain the user's CV. Paths are enough to debug the contract.
    logger.error(
      "AI response schema validation failed:",
      parsed.error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code })),
    );
    throw new InvalidAiResponseError("invalid_shape", undefined, value);
  }

  return parsed.data;
}

export const untrustedCandidatePayload = (
  cvText: string,
  targetRole = "",
  jobDescription = "",
): string => JSON.stringify({ cvText, targetRole, jobDescription });
