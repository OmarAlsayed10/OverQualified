import { Request, Response } from "express";
import { cvChat, getInterviewAnswers } from "../../services/cvChatService";
import { sendAiError } from "../../lib/aiError";
import { normalizeLanguage } from "../../lib/aiLanguage";

export const cvChatController = async (req: Request, res: Response) => {
  const { cvText, question } = req.body;

  if (!cvText || !question) {
    res.status(400).json({ message: "cvText and question are required" });
    return;
  }

  try {
    const answer = await cvChat(cvText, question, normalizeLanguage(req.body?.language));
    res.status(200).json({ answer });
  } catch (error) {
    sendAiError(res, error, "CV chat error", "Failed to get AI response");
  }
};

export const interviewAnswersController = async (req: Request, res: Response) => {
  const { cvText, questions } = req.body;

  if (!cvText || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ message: "cvText and questions array are required" });
    return;
  }

  try {
    const answers = await getInterviewAnswers(cvText, questions, normalizeLanguage(req.body?.language));
    res.status(200).json({ answers });
  } catch (error) {
    sendAiError(res, error, "Interview answers error", "Failed to generate interview answers");
  }
};
