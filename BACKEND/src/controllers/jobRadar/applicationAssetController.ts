import { Request, Response } from "express";
import { normalizeJobDescription } from "../../lib/jobDescriptionNormalizer";
import prisma from "../../lib/prisma";
import { generateCoverLetter } from "../../services/coverLetterService";
import { getPrimaryCV } from "../../services/cvBuilderService";
import { generateVariants } from "../../services/cvVariantService";
import { cvToPlainText } from "../../services/documentService";
import { authenticatedUserId, MAX_CV_TEXT, requestedLanguage } from "./shared";

export const generateCoverLetterController = async (request: Request, response: Response): Promise<void> => {
  const userId = authenticatedUserId(request);
  const { id } = request.params;
  const language = requestedLanguage(request.body.language);
  const match = await prisma.jobMatch.findFirst({ where: { id, userId } });
  if (!match) {
    response.status(404).json({ message: "Match not found." });
    return;
  }

  let cvText = typeof request.body.cvText === "string" ? request.body.cvText.trim() : "";
  if (!cvText) {
    const primaryCv = await getPrimaryCV(userId);
    if (primaryCv) cvText = cvToPlainText(primaryCv);
  }
  if (!cvText) {
    response.status(400).json({ message: "No CV found. Create a CV or pass cvText." });
    return;
  }

  const job = await prisma.job.findFirst({
    where: { source: match.source, externalId: match.externalId },
    select: { description: true },
  });
  const { english, letter } = await generateCoverLetter(
    cvText.slice(0, MAX_CV_TEXT),
    {
      title: match.title,
      company: match.company,
      description: normalizeJobDescription(job?.description ?? "").plainText,
    },
    language,
    (match as { coverLetter?: string | null }).coverLetter ?? "",
  );
  const updated = await (prisma.jobMatch as any).update({
    where: { id },
    data: language === "ar"
      ? { coverLetter: english, coverLetterAr: letter }
      : { coverLetter: letter },
  });
  response.status(200).json({
    coverLetter: language === "ar" ? updated.coverLetterAr : updated.coverLetter,
    language,
  });
};

export const generateVariantsController = async (request: Request, response: Response): Promise<void> => {
  const userId = authenticatedUserId(request);
  const { id } = request.params;
  const { cvText } = request.body;
  if (typeof cvText !== "string" || cvText.trim().length === 0) {
    response.status(400).json({ message: "cvText is required." });
    return;
  }

  const match = await prisma.jobMatch.findFirst({ where: { id, userId } });
  if (!match) {
    response.status(404).json({ message: "Match not found." });
    return;
  }
  const generatedVariants = await generateVariants(cvText.slice(0, MAX_CV_TEXT), {
    title: match.title,
    company: match.company,
  });
  const variants = await Promise.all(generatedVariants.map((variant) => prisma.cVVariant.create({
    data: { userId, jobMatchId: id, label: variant.label, content: variant.content },
    select: { id: true, label: true, content: true },
  })));
  response.status(200).json({ variants });
};

export const updateVariantOutcomeController = async (request: Request, response: Response): Promise<void> => {
  const userId = authenticatedUserId(request);
  const { id } = request.params;
  const { sent, response: receivedResponse } = request.body;
  const variant = await prisma.cVVariant.findFirst({ where: { id, userId } });
  if (!variant) {
    response.status(404).json({ message: "Variant not found." });
    return;
  }

  const updated = await prisma.cVVariant.update({
    where: { id },
    data: {
      sentCount: sent === true ? { increment: 1 } : undefined,
      responseCount: receivedResponse === true ? { increment: 1 } : undefined,
    },
  });
  response.status(200).json({ variant: updated });
};
