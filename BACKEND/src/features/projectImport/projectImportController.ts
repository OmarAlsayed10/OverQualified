import { Request, Response } from "express";
import { fetchReadmeFromRepo, generateProjectsFromReadme } from "./projectImportService";
import { sendAiError } from "../../lib/aiError";

export const importProjectFromUrlController = async (req: Request, res: Response): Promise<void> => {
  const { normalizedUrl, url } = req.body;
  const targetUrl = normalizedUrl || url;

  if (!targetUrl) {
    res.status(400).json({ message: "URL is required." });
    return;
  }

  try {
    const { text, cleanUrl } = await fetchReadmeFromRepo(targetUrl);
    const projects = await generateProjectsFromReadme(text, cleanUrl);
    res.status(200).json({ success: true, projects });
  } catch (error: any) {
    sendAiError(res, error, "Project import from URL error", error?.message || "Failed to import project from URL");
  }
};

export const importProjectFromFileController = async (req: Request, res: Response): Promise<void> => {
  const file = (req as Request & { file?: Express.Multer.File }).file;

  if (!file) {
    res.status(400).json({ message: "No file uploaded." });
    return;
  }

  try {
    const rawText = file.buffer.toString("utf8");
    const projects = await generateProjectsFromReadme(rawText);
    res.status(200).json({ success: true, projects });
  } catch (error: any) {
    sendAiError(res, error, "Project import from file error", error?.message || "Failed to process markdown file");
  }
};
