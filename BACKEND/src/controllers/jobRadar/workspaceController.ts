import { Request, Response } from "express";
import { normalizeJobDescription } from "../../lib/jobDescriptionNormalizer";
import prisma from "../../lib/prisma";
import { getPrimaryCV } from "../../services/cvBuilderService";
import { cvToPlainText } from "../../services/documentService";
import { generateScreeningQuestions } from "../../services/screeningQuestionService";
import { authenticatedUserId, VALID_JOB_MATCH_STATUSES } from "./shared";

const DEFAULT_CHECKLIST = [
  { id: "check-1", label: "Tailored CV ready", done: false },
  { id: "check-2", label: "Cover letter reviewed", done: false },
  { id: "check-3", label: "Screening answers prepared", done: false },
  { id: "check-4", label: "Application submitted on job portal", done: false },
  { id: "check-5", label: "Follow-up date scheduled", done: false },
];

export const getWorkspaceController = async (request: Request, response: Response): Promise<void> => {
  const userId = authenticatedUserId(request);
  const { id } = request.params;
  const match = await prisma.jobMatch.findFirst({ where: { id, userId } });
  if (!match) {
    response.status(404).json({ message: "Job match not found." });
    return;
  }

  const job = await prisma.job.findUnique({
    where: { source_externalId: { source: match.source, externalId: match.externalId } },
  });
  const userProfile = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      title: true,
      skills: true,
      salaryExpectation: true,
      salaryCurrency: true,
      visaStatus: true,
      noticePeriod: true,
      workPreference: true,
      relocationOpen: true,
    },
  });
  const primaryCv = await getPrimaryCV(userId);
  const cvText = primaryCv ? cvToPlainText(primaryCv) : "";
  const cvVariants = await prisma.cVVariant.findMany({
    where: { userId, jobMatchId: id },
    select: { id: true, label: true, content: true, sentCount: true, responseCount: true },
  });
  const fallbackDescription = `Job Title: ${match.title}\nCompany: ${match.company}\nLocation: ${match.location || "Remote"}\nURL: ${match.url}`;
  response.status(200).json({
    match,
    job: { description: normalizeJobDescription(job?.description || fallbackDescription).plainText },
    userProfile,
    primaryCv: primaryCv ? { id: primaryCv.id, text: cvText } : null,
    cvVariants,
    checklist: (match as any).checklist || DEFAULT_CHECKLIST,
    screeningAnswers: (match as any).screeningAnswers || [],
  });
};

export const updateWorkspaceController = async (request: Request, response: Response): Promise<void> => {
  const userId = authenticatedUserId(request);
  const { id } = request.params;
  const { checklist, screeningAnswers, notes, reminderAt, selectedCvVariant, status, coverLetter } = request.body;
  const match = await prisma.jobMatch.findFirst({ where: { id, userId } });
  if (!match) {
    response.status(404).json({ message: "Match not found." });
    return;
  }

  const updateFields: any = {};
  if (checklist !== undefined) updateFields.checklist = checklist;
  if (screeningAnswers !== undefined) updateFields.screeningAnswers = screeningAnswers;
  if (notes !== undefined) updateFields.notes = notes;
  if (reminderAt !== undefined) {
    updateFields.reminderAt = reminderAt ? new Date(reminderAt) : null;
    updateFields.reminderSent = false;
  }
  if (selectedCvVariant !== undefined) updateFields.selectedCvVariant = selectedCvVariant;
  if (coverLetter !== undefined) updateFields.coverLetter = coverLetter;
  if (status && VALID_JOB_MATCH_STATUSES.includes(status)) {
    updateFields.status = status;
    if (status === "applied" && !match.appliedAt) updateFields.appliedAt = new Date();
  }
  const updated = await (prisma.jobMatch as any).update({ where: { id }, data: updateFields });
  response.status(200).json({ match: updated });
};

export const generateScreeningAnswersController = async (request: Request, response: Response): Promise<void> => {
  const userId = authenticatedUserId(request);
  const { id } = request.params;
  const match = await prisma.jobMatch.findFirst({ where: { id, userId } });
  if (!match) {
    response.status(404).json({ message: "Match not found." });
    return;
  }

  const job = await prisma.job.findUnique({
    where: { source_externalId: { source: match.source, externalId: match.externalId } },
  });
  const userProfile = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: {
      salaryExpectation: true,
      salaryCurrency: true,
      visaStatus: true,
      noticePeriod: true,
      workPreference: true,
      relocationOpen: true,
    },
  });
  const primaryCv = await getPrimaryCV(userId);
  const cvText = primaryCv ? cvToPlainText(primaryCv) : "";
  const questions = await generateScreeningQuestions({
    jobTitle: match.title,
    company: match.company,
    jobDescription: normalizeJobDescription(job?.description ?? "").plainText,
    cvText,
    userProfile,
  });
  const updated = await (prisma.jobMatch as any).update({
    where: { id },
    data: { screeningAnswers: questions as any },
  });
  response.status(200).json({ screeningAnswers: (updated as any).screeningAnswers });
};
