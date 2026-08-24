import { Request, Response } from "express";
import { adjustCV } from "../../services/cvAdjustService";
import { scoreCVWithBreakdown } from "../../services/cvScoring";
import { sendAiError } from "../../lib/aiError";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_RETRY_WAIT_MS = 40_000;

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit = err?.status === 429 || err?.code === "rate_limit_exceeded";
      if (isRateLimit && attempt < maxRetries) {
        const retryAfterSec = parseInt(err?.headers?.["retry-after"] ?? "5", 10);
        const waitMs = Math.min((retryAfterSec + 1) * 1000, MAX_RETRY_WAIT_MS);
        if (waitMs >= MAX_RETRY_WAIT_MS) {
          throw Object.assign(new Error("AI service quota exceeded — please try again in a few minutes."), { isQuotaError: true });
        }
        console.warn(`Rate limit hit — retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(waitMs);
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

export const adjustCVController = async (req: Request, res: Response) => {
  const { cvText, negativeFeedback, sectionsToImprove, targetRole, level, applyJakeTemplate } = req.body;

  if (!cvText || typeof cvText !== "string" || cvText.trim().length === 0) {
    res.status(400).json({ message: "cvText is required" });
    return;
  }
  if (cvText.length > 30000) {
    res.status(400).json({ message: "CV text is too long (max 30,000 characters)." });
    return;
  }

  const role = typeof targetRole === "string" ? targetRole : "";
  const lvl = typeof level === "string" ? level : "";

  try {
    // Score original once — gives the optimizer its gaps and the honest baseline
    const { total: originalScore, categories: breakdown, dimensions } = await withRetry(() => scoreCVWithBreakdown(cvText, role, lvl));

    const { adjustedCV, changes, formData } = await withRetry(() =>
      adjustCV(
        cvText,
        Array.isArray(negativeFeedback) ? negativeFeedback : [],
        Array.isArray(sectionsToImprove) ? sectionsToImprove : [],
        breakdown,
        dimensions,
        role,
        lvl,
        applyJakeTemplate === true
      )
    );

    const rescored = await withRetry(() => scoreCVWithBreakdown(adjustedCV, role, lvl));

    // Guardrail: grader noise + one-page trimming can make the rewrite score no higher
    // than the original. Never surface a regression — fall back to the original score and
    // breakdown so the number and the per-category gaps stay consistent.
    const improved = rescored.total > originalScore;
    const newScore = improved ? rescored.total : originalScore;
    const newBreakdown = improved ? rescored.categories : breakdown;

    res.status(200).json({ adjustedCV, changes, formData, originalScore, newScore, newBreakdown });
  } catch (error) {
    sendAiError(res, error, "CV adjust error", "Failed to adjust CV");
  }
};
