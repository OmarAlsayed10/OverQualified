import { Request, Response } from "express";
import { CustomRequest } from "../middleware/validateJWTMiddleware";
import { estimateTextPageCount, extractText } from "../services/extractTextService";
import { extractionQuality, pdfOrigin } from "../services/extractionQuality";
import { aiResponse, hasAiResponse } from "../services/aiService";
import { scoreCVWithBreakdown, hasScore } from "../services/cvScoring";
import { canSpend, canAnonAnalyze, consumeAnonAnalyze } from "../services/quotaService";
import { runWithUser } from "../lib/creditContext";
import { isGroqRateLimit } from "../lib/groqChat";
import prisma from "../lib/prisma";
import { InvalidAiResponseError } from "../lib/aiResponseValidation";
import { normalizeLanguage } from "../lib/aiLanguage";
import { renderedCvAnalysisArtifact, savedCvAnalysisArtifact } from "../services/savedCvAnalysisService";
import { hasPaidAccess } from "../services/entitlementService";
import { coerceFormData } from "../services/cvParseService";

export const analyzeCVController = async (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  const cvText = (
    typeof req.body?.cvText === "string" ? req.body.cvText : ""
  ).slice(0, 30000);
  const cvId = typeof req.body?.cvId === "string" ? req.body.cvId.trim() : "";
  let builderCv: Record<string, unknown> | null = null;
  if (typeof req.body?.builderCv === "string") {
    try {
      const parsed = JSON.parse(req.body.builderCv);
      if (typeof parsed !== "object" || parsed === null || typeof parsed.formData !== "object") {
        res.status(400).json({ message: "Builder CV data is invalid" });
        return;
      }
      builderCv = parsed;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      res.status(400).json({ message: "Builder CV data is invalid" });
      return;
    }
  }

  console.log("[cv-analyze] request received", {
    hasFile: !!file,
    fileName: file?.originalname ?? null,
    mimeType: file?.mimetype ?? null,
    inlineTextLength: cvText.length,
    hasSavedCv: Boolean(cvId),
    hasBuilderCv: Boolean(builderCv),
  });

  const sourceCount = Number(Boolean(file)) + Number(cvText.trim().length >= 30) + Number(Boolean(cvId)) + Number(Boolean(builderCv));
  if (sourceCount !== 1) {
    res.status(400).json({ message: "Choose exactly one CV source" });
    return;
  }

  const level = (
    typeof req.body?.level === "string" ? req.body.level : ""
  ).slice(0, 20);
  const language = normalizeLanguage(req.body?.language);

  try {
    // The requester is optional here — /analyze stays public — and is attached upstream by
    // the optionalAuth middleware. Quota falls back to the IP when nobody is signed in.
    const userId = (req as CustomRequest).user?.userId;
    let isPro = false;
    if (userId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, planTier: true, proExpiresAt: true },
      });
      isPro = !!dbUser && hasPaidAccess(dbUser);
    }
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    if ((cvId || builderCv) && !userId) {
      res.status(401).json({ message: "Sign in to analyze this CV" });
      return;
    }

    const savedCv = cvId
      ? await prisma.cV.findFirst({ where: { id: cvId, userId: userId! } })
      : null;
    if (cvId && !savedCv) {
      res.status(404).json({ message: "CV not found" });
      return;
    }

    const extracted = file
      ? await extractText(file.buffer, file.mimetype)
      : savedCv
        ? await savedCvAnalysisArtifact(savedCv)
        : builderCv
          ? await renderedCvAnalysisArtifact({
              formData: coerceFormData(builderCv.formData),
              sectionOrder: Array.isArray(builderCv.sectionOrder)
                ? builderCv.sectionOrder.filter((section): section is string => typeof section === "string")
                : undefined,
              template: typeof builderCv.template === "string" ? builderCv.template : undefined,
              fontScale: typeof builderCv.fontScale === "number" ? builderCv.fontScale : undefined,
            })
          : { text: cvText, pageCount: estimateTextPageCount(cvText) };
    const extractedText = extracted.text.slice(0, 30000);
    const pageCount = extracted.pageCount;

    if ((file || savedCv || builderCv) && extractedText.trim().length < 100) {
      res.status(400).json({
        message: "Couldn't read enough text from this CV.",
      });
      return;
    }

    // A repeat of the exact same CV+role+level is served from cache — free, no quota spent.
    // Viewing an already-analyzed CV in the other language is also free: language is
    // clamped to en/ar, so this caps a paid analysis at one regeneration, not unlimited.
    const analyzedIn = async (candidate: "en" | "ar") =>
      (await hasScore(extractedText, "", level, candidate, pageCount)) &&
      (await hasAiResponse(extractedText, "", "", candidate));
    const cached = (await analyzedIn("en")) || (await analyzedIn("ar"));
    if (!cached) {
      const gate = userId ? await canSpend({ userId, ip }) : await canAnonAnalyze(ip);
      if (!gate.ok) {
        res.status(429).json({ code: gate.code, message: gate.message });
        return;
      }
    }

    // aiResponse and scoring are independent — run them concurrently to cut latency.
    // Logged-in callers are billed real credits inside groqChat via the ALS context.
    const [ai, score] = await runWithUser(userId, () =>
      Promise.all([
        aiResponse(extractedText, "", "", language),
        scoreCVWithBreakdown(extractedText, "", level, language, pageCount),
      ])
    );

    if (!cached && !userId) await consumeAnonAnalyze(ip);
    const {
      sectionsToImprove,
      positiveFeedback,
      neutralFeedback,
      negativeFeedback,
      interviewQuestions,
      atsCheckerNotes,
      matchJobTitle,
    } = ai;
    const {
      total: qualityScore,
      categories: scoreBreakdown,
      dimensions,
      levelContext,
    } = score;

    console.log("[cv-analyze] scoring summary", {
      qualityScore,
      impactDimension:
        dimensions.find((d) => d.name === "Impact & Results")?.score ?? null,
      workExperienceCategory:
        scoreBreakdown.find((c) => c.name === "Work Experience")?.earned ??
        null,
    });

    // Record analysis event for home page live metrics, plus how well we managed to read the file.
    // Measurements only — no CV content is stored, and nothing here is shown to the user.
    try {
      const quality = extractionQuality(extractedText, pageCount);
      const origin = file
        ? await pdfOrigin(file.buffer, file.mimetype)
        : { producer: null, creator: null };
      if (quality.suspect) {
        console.warn("[cv-analyze] extraction looks incomplete", { ...quality, ...origin });
      }
      await prisma.analysisEvent.create({
        data: {
          userId: userId ?? null,
          ip,
          ...quality,
          ...origin,
          score: qualityScore,
        },
      });
    } catch (e) {
      console.error("[cv-analyze] failed to record AnalysisEvent", e);
    }

    // Per-dimension details are a Pro perk — free users see the scores, not the fixes.
    const gatedDimensions = dimensions.map((d) =>
      isPro ? d : { name: d.name, score: d.score, details: [] as string[] },
    );

    res.status(200).json({
      message: "CV analyzed successfully",
      originalFile: file
        ? { name: file.originalname, type: file.mimetype, size: file.size }
        : {
            name: savedCv?.title || "Saved CV",
            type: savedCv ? "application/pdf" : "text/plain",
            size: extractedText.length,
          },
      extractedText,
      pageCount,
      level,
      qualityScore,
      scoreBreakdown,
      dimensions: gatedDimensions,
      detailsLocked: !isPro,
      levelContext,
      sectionsToImprove,
      positiveFeedback,
      neutralFeedback,
      negativeFeedback,
      interviewQuestions,
      atsCheckerNotes,
      matchJobTitle,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    if (error instanceof InvalidAiResponseError) {
      res.status(502).json({
        code: "PROVIDER_INVALID_RESPONSE",
        message: "The AI returned an invalid analysis. Please retry.",
      });
      return;
    }
    if (isGroqRateLimit(error)) {
      res.status(503).json({
        code: "PROVIDER_BUSY",
        message:
          "The analysis service is busy right now. Please try again in a moment.",
      });
      return;
    }
    console.error("CV analyze error:", error);
    res.status(500).json({ code: "ANALYSIS_FAILED", message: "Failed to analyze CV" });
  }
};
