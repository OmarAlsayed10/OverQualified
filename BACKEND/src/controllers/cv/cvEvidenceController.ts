import { Request, Response } from "express";
import { analyzeRepo, evidenceSourceText } from "../../services/repoAnalysisService";
import { auditCV } from "../../services/claimAuditService";
import { proposePositioning } from "../../services/positioningService";
import { GitHostError } from "../../lib/gitHostError";
import { hostFromUrl, resolveToken } from "../../services/gitHostCredentialService";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import { normalizeLanguage } from "../../lib/aiLanguage";
import { sendAiError } from "../../lib/aiError";

export const analyzeRepoController = async (req: Request, res: Response): Promise<void> => {
  const { repoUrl, authorIdentities } = req.body;

  if (!repoUrl) {
    res.status(400).json({ message: "repoUrl is required." });
    return;
  }

  const host = hostFromUrl(String(repoUrl));
  if (!host) {
    res.status(400).json({ message: "Only GitHub and GitLab repository URLs are supported." });
    return;
  }

  const token = await resolveToken((req as CustomRequest).user!.userId, host);

  try {
    const evidence = await analyzeRepo(repoUrl, {
      token,
      authorIdentities: Array.isArray(authorIdentities) ? authorIdentities : [],
    });
    res.status(200).json({ success: true, evidence, sourceText: evidenceSourceText(evidence) });
  } catch (error: any) {
    if (error instanceof GitHostError) {
      const needsToken = !token && (error.status === 403 || error.status === 429 || error.status === 404);
      if (needsToken) {
        res.status(428).json({ code: "git_token_required", host, message: error.message });
        return;
      }
      res.status(error.status === 404 ? 404 : 502).json({ message: error.message });
      return;
    }
    sendAiError(res, error, "Repository analysis error", "Failed to analyze repository");
  }
};

export const auditClaimsController = async (req: Request, res: Response): Promise<void> => {
  const { cv, evidence } = req.body;

  if (!cv || typeof cv !== "object") {
    res.status(400).json({ message: "cv is required." });
    return;
  }

  const findings = auditCV(cv, typeof evidence === "string" ? evidence : "");
  res.status(200).json({ success: true, findings, unsourcedCount: findings.length });
};

export const positioningController = async (req: Request, res: Response): Promise<void> => {
  const { cvText, targetRole, language } = req.body;

  if (!cvText || !targetRole) {
    res.status(400).json({ message: "cvText and targetRole are required." });
    return;
  }

  try {
    const positioning = await proposePositioning(
      cvText,
      targetRole,
      normalizeLanguage(language),
    );
    res.status(200).json({ success: true, positioning });
  } catch (error: any) {
    sendAiError(res, error, "Positioning error", "Failed to generate positioning");
  }
};
