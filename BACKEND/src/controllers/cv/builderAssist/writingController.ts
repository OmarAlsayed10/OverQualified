import { Request, Response } from "express";
import { sendAiError } from "../../../lib/aiError";
import {
  editFieldWithAI,
  generateSmartSkills,
  optimizeCvLength,
  polishEntry,
} from "../../../services/AIWritingService";

export const polishEntryController = async (request: Request, response: Response) => {
  const { sectionName, raw, jobTitle, formData } = request.body;
  if (!sectionName || !raw || typeof raw !== "string" || raw.trim().length === 0) {
    response.status(400).json({ message: "sectionName and raw are required" });
    return;
  }
  if (raw.length > 5000) {
    response.status(400).json({ message: "Notes are too long (max 5,000 characters)." });
    return;
  }
  try {
    const polished = await polishEntry(String(sectionName), raw, typeof jobTitle === "string" ? jobTitle : "", formData);
    response.status(200).json({ polished });
  } catch (error) {
    sendAiError(response, error, "Polish entry error", "Failed to polish entry");
  }
};

export const optimizeCvLengthController = async (request: Request, response: Response) => {
  const { formData, currentPages } = request.body;
  if (!formData) {
    response.status(400).json({ message: "formData is required" });
    return;
  }
  try {
    const optimized = await optimizeCvLength(formData, Number(currentPages) || 2);
    response.status(200).json({ formData: optimized });
  } catch (error) {
    sendAiError(response, error, "Optimize CV length error", "Failed to optimize CV length");
  }
};

export const editFieldWithAIController = async (request: Request, response: Response) => {
  const { sectionName, userPrompt, currentContent, context, formData } = request.body;
  if (!sectionName || !userPrompt || typeof userPrompt !== "string" || userPrompt.trim().length === 0) {
    response.status(400).json({ message: "sectionName and userPrompt are required" });
    return;
  }
  if (userPrompt.length > 1000) {
    response.status(400).json({ message: "Prompt is too long (max 1,000 characters)." });
    return;
  }
  try {
    const result = await editFieldWithAI(
      String(sectionName),
      userPrompt,
      typeof currentContent === "string" ? currentContent : "",
      context && typeof context === "object" ? context : {},
      formData,
    );
    response.status(200).json({ result });
  } catch (error) {
    sendAiError(response, error, "Edit field with AI error", "Failed to edit field with AI");
  }
};

export const generateSmartSkillsController = async (request: Request, response: Response) => {
  const { formData } = request.body;
  if (!formData) {
    response.status(400).json({ message: "formData is required" });
    return;
  }
  try {
    const skillCategories = await generateSmartSkills(formData);
    const skills = skillCategories.flatMap((category) => category.skills);
    response.status(200).json({ skillCategories, skills });
  } catch (error) {
    sendAiError(response, error, "Generate smart skills error", "Failed to generate skills");
  }
};
