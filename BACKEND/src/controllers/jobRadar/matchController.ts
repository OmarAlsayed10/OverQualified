import { Request, Response } from "express";
import { normalizeJobDescription } from "../../lib/jobDescriptionNormalizer";
import prisma from "../../lib/prisma";
import { ingestJobs } from "../../services/jobIngestionService";
import { listMatches, refreshMatchesForUser } from "../../services/jobRadarService";
import { authenticatedUserId, VALID_JOB_MATCH_STATUSES } from "./shared";

export const getMatchesController = async (request: Request, response: Response): Promise<void> => {
  const userId = authenticatedUserId(request);
  const page = Number(request.query.page) || 1;
  const country = typeof request.query.country === "string" && request.query.country
    ? request.query.country
    : undefined;
  response.status(200).json(await listMatches(userId, page, country));
};

export const updateMatchStatusController = async (request: Request, response: Response): Promise<void> => {
  const userId = authenticatedUserId(request);
  const { id } = request.params;
  const { status } = request.body;
  if (!VALID_JOB_MATCH_STATUSES.includes(status)) {
    response.status(400).json({ message: "Invalid status." });
    return;
  }

  const match = await prisma.jobMatch.findFirst({ where: { id, userId } });
  if (!match) {
    response.status(404).json({ message: "Match not found." });
    return;
  }
  const appliedAt = status === "applied" && !match.appliedAt ? { appliedAt: new Date() } : {};
  const updated = await prisma.jobMatch.update({ where: { id }, data: { status, ...appliedAt } });
  response.status(200).json({ match: updated });
};

export const refreshMatchesController = async (request: Request, response: Response): Promise<void> => {
  const userId = authenticatedUserId(request);
  const ingestion = await ingestJobs();
  const refreshed = await refreshMatchesForUser(userId);
  const matches = await listMatches(userId, 1);
  response.status(200).json({ refreshed, ingestion, ...matches });
};

export const getMatchDetailsController = async (request: Request, response: Response): Promise<void> => {
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
  const fallbackDescription = `Job Title: ${match.title}\nCompany: ${match.company}\nLocation: ${match.location || "Remote"}\nURL: ${match.url}`;
  response.status(200).json({
    match,
    description: normalizeJobDescription(job?.description || fallbackDescription).plainText,
  });
};

export const createCustomMatchController = async (request: Request, response: Response): Promise<void> => {
  const userId = authenticatedUserId(request);
  const { title, company, url, description } = request.body;
  const jobTitle = typeof title === "string" ? title.trim() : "";
  const jobCompany = typeof company === "string" ? company.trim() : "";
  const jobDescription = typeof description === "string"
    ? normalizeJobDescription(description).plainText
    : "";
  if (!jobTitle || !jobCompany || !jobDescription) {
    response.status(400).json({
      code: "JOB_DETAILS_REQUIRED",
      message: "Provide a job title, company, and description.",
    });
    return;
  }

  const jobUrl = typeof url === "string" && url.trim() ? url.trim() : "";
  const externalId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const source = "manual";
  await prisma.job.create({
    data: { source, externalId, title: jobTitle, company: jobCompany, url: jobUrl, description: jobDescription },
  });
  const match = await (prisma.jobMatch as any).create({
    data: {
      userId,
      source,
      externalId,
      title: jobTitle,
      company: jobCompany,
      url: jobUrl,
      status: "matched",
      analysisStatus: "pending",
    },
  });
  response.status(201).json({ match });
};
