import { Request, Response } from "express";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import { pendingJobSubmissions, reviewJobSubmission, submitJob } from "./jobSubmissionService";

const userId = (req: Request): string => (req as CustomRequest).user!.userId;

export const submitJobController = async (req: Request, res: Response) => {
  try {
    const submission = await submitJob({ userId: userId(req), ...req.body });
    res.status(201).json({ submission });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JOB_SUBMISSION") {
      res.status(400).json({ message: "Add a title, company, valid link, and job details." });
      return;
    }
    throw error;
  }
};

export const adminJobSubmissionsController = async (_req: Request, res: Response) => {
  res.status(200).json({ submissions: await pendingJobSubmissions() });
};

export const adminReviewJobSubmissionController = async (req: Request, res: Response) => {
  try {
    const submission = await reviewJobSubmission(req.params.id, req.body.action);
    res.status(200).json({ submission });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INVALID_JOB_REVIEW") {
      res.status(400).json({ message: "Action must be approve or reject." });
      return;
    }
    if (code === "JOB_SUBMISSION_NOT_FOUND") {
      res.status(404).json({ message: "Job submission not found." });
      return;
    }
    if (code === "JOB_SUBMISSION_REVIEWED") {
      res.status(409).json({ message: "Job submission has already been reviewed." });
      return;
    }
    throw error;
  }
};