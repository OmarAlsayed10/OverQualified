import { Request, Response } from "express";
import { parseCvToStructured, coerceFormData } from "../services/cvParseService";
import { extractText } from "../services/extractTextService";
import { polishEntry, optimizeCvLength, editFieldWithAI, generateSmartSkills } from "../services/AIWritingService";
import { conversationalBuild } from "../services/conversationalBuildService";
import { sendAiError } from "../lib/aiError";
import { InvalidAiResponseError } from "../lib/aiResponseValidation";

const MAX_TEXT = 30000;

export const importCvController = async (req: Request, res: Response) => {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }
  try {
    const { text, pageCount } = await extractText(file.buffer, file.mimetype);
    if (!text || text.trim().length < 30) {
      res.status(422).json({ message: "Couldn't read enough text from this file." });
      return;
    }
    const formData = await parseCvToStructured(text.slice(0, MAX_TEXT));
    res.status(200).json({ formData, pageCount });
  } catch (error) {
    sendAiError(res, error, "CV import error", "Failed to import CV");
  }
};

export const uploadCvPhotoController = (req: Request, res: Response) => {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file?.path) {
    res.status(400).json({ message: "No photo uploaded" });
    return;
  }
  res.status(200).json({ url: file.path });
};

export const parseCvController = async (req: Request, res: Response) => {
  const { cvText } = req.body;
  if (!cvText || typeof cvText !== "string" || cvText.trim().length === 0) {
    res.status(400).json({ message: "cvText is required" });
    return;
  }
  if (cvText.length > MAX_TEXT) {
    res.status(400).json({ message: "CV text is too long." });
    return;
  }
  try {
    const formData = await parseCvToStructured(cvText);
    res.status(200).json({ formData });
  } catch (error) {
    sendAiError(res, error, "CV parse error", "Failed to parse CV");
  }
};

export const conversationalBuildController = async (req: Request, res: Response) => {
  const { messages, formData } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ message: "messages are required" });
    return;
  }
  try {
    const result = await conversationalBuild(messages, coerceFormData(formData));
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof InvalidAiResponseError) {
      res.status(502).json({
        code: "AI_RESPONSE_INVALID",
        message: "The AI response could not be verified. Your CV was not updated.",
      });
      return;
    }
    sendAiError(res, error, "Conversational build error", "Failed to process message");
  }
};

export const polishEntryController = async (req: Request, res: Response) => {
  const { sectionName, raw, jobTitle, formData } = req.body;
  if (!sectionName || !raw || typeof raw !== "string" || raw.trim().length === 0) {
    res.status(400).json({ message: "sectionName and raw are required" });
    return;
  }
  if (raw.length > 5000) {
    res.status(400).json({ message: "Notes are too long (max 5,000 characters)." });
    return;
  }
  try {
    const polished = await polishEntry(String(sectionName), raw, typeof jobTitle === "string" ? jobTitle : "", formData);
    res.status(200).json({ polished });
  } catch (error) {
    sendAiError(res, error, "Polish entry error", "Failed to polish entry");
  }
};

export const optimizeCvLengthController = async (req: Request, res: Response) => {
  const { formData, currentPages } = req.body;
  if (!formData) {
    res.status(400).json({ message: "formData is required" });
    return;
  }
  try {
    const optimized = await optimizeCvLength(formData, Number(currentPages) || 2);
    res.status(200).json({ formData: optimized });
  } catch (error) {
    sendAiError(res, error, "Optimize CV length error", "Failed to optimize CV length");
  }
};

export const editFieldWithAIController = async (req: Request, res: Response) => {
  const { sectionName, userPrompt, currentContent, context, formData } = req.body;
  if (!sectionName || !userPrompt || typeof userPrompt !== "string" || userPrompt.trim().length === 0) {
    res.status(400).json({ message: "sectionName and userPrompt are required" });
    return;
  }
  if (userPrompt.length > 1000) {
    res.status(400).json({ message: "Prompt is too long (max 1,000 characters)." });
    return;
  }
  try {
    const result = await editFieldWithAI(
      String(sectionName),
      userPrompt,
      typeof currentContent === "string" ? currentContent : "",
      context && typeof context === "object" ? context : {},
      formData
    );
    res.status(200).json({ result });
  } catch (error) {
    sendAiError(res, error, "Edit field with AI error", "Failed to edit field with AI");
  }
};

export const generateSmartSkillsController = async (req: Request, res: Response) => {
  const { formData } = req.body;
  if (!formData) {
    res.status(400).json({ message: "formData is required" });
    return;
  }
  try {
    const skillCategories = await generateSmartSkills(formData);
    const skills = skillCategories.flatMap((category) => category.skills);
    res.status(200).json({ skillCategories, skills });
  } catch (error) {
    sendAiError(res, error, "Generate smart skills error", "Failed to generate skills");
  }
};
