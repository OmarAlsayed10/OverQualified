import { NextFunction, Request, Response } from "express";
import { CustomRequest } from "../middleware/validateJWTMiddleware";
import {
  createInterviewSession,
  finishInterviewSession,
  listInterviewSessions,
  submitInterviewAnswer,
} from "../services/interviewCoachService";
import {
  startInterviewSchema,
  submitInterviewAnswerSchema,
} from "../services/interviewCoachSchema";

const userIdFrom = (req: Request) => (req as CustomRequest).user!.userId;

export async function startInterviewController(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = startInterviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Choose a CV and enter a valid target role." });
      return;
    }
    const session = await createInterviewSession(userIdFrom(req), parsed.data);
    if (!session) {
      res.status(404).json({ message: "CV not found." });
      return;
    }
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
}

export async function listInterviewsController(req: Request, res: Response, next: NextFunction) {
  try {
    const sessions = await listInterviewSessions(userIdFrom(req));
    res.status(200).json({ sessions });
  } catch (error) {
    next(error);
  }
}

export async function finishInterviewController(req: Request, res: Response, next: NextFunction) {
  try {
    const outcome = await finishInterviewSession(userIdFrom(req), req.params.id);
    if (outcome.kind === "not_found") {
      res.status(404).json({ message: "Interview session not found." });
      return;
    }
    if (outcome.kind === "completed") {
      res.status(409).json({ message: "This interview is already complete." });
      return;
    }
    if (outcome.kind === "too_early") {
      res.status(400).json({ message: "Answer at least three questions before finishing early." });
      return;
    }
    if (outcome.kind === "no_answers") {
      res.status(400).json({ message: "Answer the current question before finishing." });
      return;
    }
    if (outcome.kind === "conflict") {
      res.status(409).json({ message: "This interview changed in another request. Reload and try again." });
      return;
    }
    res.status(200).json({ session: outcome.session });
  } catch (error) {
    next(error);
  }
}

export async function answerInterviewController(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = submitInterviewAnswerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Enter an answer before continuing." });
      return;
    }
    const outcome = await submitInterviewAnswer(userIdFrom(req), req.params.id, parsed.data.answer);
    if (outcome.kind === "not_found") {
      res.status(404).json({ message: "Interview session not found." });
      return;
    }
    if (outcome.kind === "completed") {
      res.status(409).json({ message: "This interview is already complete." });
      return;
    }
    if (outcome.kind === "conflict") {
      res.status(409).json({ message: "This interview changed in another request. Reload and try again." });
      return;
    }
    res.status(200).json({ session: outcome.session });
  } catch (error) {
    next(error);
  }
}
