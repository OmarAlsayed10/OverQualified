import { Request, Response } from "express";
import { sendAiError } from "../../../lib/aiError";
import { parseCvToStructured } from "../../../services/cvParseService";
import { extractText } from "../../../services/extractTextService";

const MAX_TEXT = 30000;

export const importCvController = async (request: Request, response: Response) => {
  const file = (request as Request & { file?: Express.Multer.File }).file;
  if (!file) {
    response.status(400).json({ message: "No file uploaded" });
    return;
  }
  try {
    const { text, pageCount } = await extractText(file.buffer, file.mimetype);
    if (!text || text.trim().length < 30) {
      response.status(422).json({ message: "Couldn't read enough text from this file." });
      return;
    }
    const formData = await parseCvToStructured(text.slice(0, MAX_TEXT));
    response.status(200).json({ formData, pageCount });
  } catch (error) {
    sendAiError(response, error, "CV import error", "Failed to import CV");
  }
};

export const parseCvController = async (request: Request, response: Response) => {
  const { cvText } = request.body;
  if (!cvText || typeof cvText !== "string" || cvText.trim().length === 0) {
    response.status(400).json({ message: "cvText is required" });
    return;
  }
  if (cvText.length > MAX_TEXT) {
    response.status(400).json({ message: "CV text is too long." });
    return;
  }
  try {
    const formData = await parseCvToStructured(cvText);
    response.status(200).json({ formData });
  } catch (error) {
    sendAiError(response, error, "CV parse error", "Failed to parse CV");
  }
};

export const uploadCvPhotoController = (request: Request, response: Response) => {
  const file = (request as Request & { file?: Express.Multer.File }).file;
  if (!file?.path) {
    response.status(400).json({ message: "No photo uploaded" });
    return;
  }
  response.status(200).json({ url: file.path });
};
