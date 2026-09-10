import { Request, Response } from "express";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import { logger } from "../../lib/logger";
import {
  getOrGenerateSkillRoadmap,
  getUserSkillProgress,
  updateUserSkillProgress,
  deleteUserSkillProgress,
  get2026MarketTrendRecommendations,
} from "./skillRoadmapService";

export const getSkillRoadmapController = async (req: Request, res: Response) => {
  const { skill, category } = req.body;
  if (!skill || typeof skill !== "string" || !skill.trim()) {
    res.status(400).json({ message: "Skill parameter is required." });
    return;
  }
  try {
    const roadmap = await getOrGenerateSkillRoadmap(skill.trim(), category || "skill");
    res.status(200).json({ roadmap });
  } catch (error) {
    logger.error("Skill roadmap error:", error);
    res.status(500).json({ message: "Failed to generate skill roadmap." });
  }
};

export const getSkillTrendsController = async (_req: Request, res: Response) => {
  try {
    const trends = get2026MarketTrendRecommendations();
    res.status(200).json({ trends });
  } catch (error) {
    logger.error("Skill trends error:", error);
    res.status(500).json({ message: "Failed to fetch market trends." });
  }
};

export const getUserSkillProgressController = async (req: Request, res: Response) => {
  const userId = (req as CustomRequest).user!.userId;
  try {
    const progress = await getUserSkillProgress(userId);
    res.status(200).json({ progress });
  } catch (error) {
    logger.error("Get skill progress error:", error);
    res.status(500).json({ message: "Failed to fetch skill progress." });
  }
};

export const updateUserSkillProgressController = async (req: Request, res: Response) => {
  const userId = (req as CustomRequest).user!.userId;
  const { skill, status } = req.body;
  if (!skill || typeof skill !== "string" || !["in_progress", "learned"].includes(status)) {
    res.status(400).json({ message: "Valid skill and status ('in_progress' or 'learned') are required." });
    return;
  }
  try {
    const record = await updateUserSkillProgress(userId, skill.trim(), status);
    res.status(200).json({ progress: record });
  } catch (error) {
    logger.error("Update skill progress error:", error);
    res.status(500).json({ message: "Failed to update skill progress." });
  }
};

export const deleteUserSkillProgressController = async (req: Request, res: Response) => {
  const userId = (req as CustomRequest).user!.userId;
  const { skill } = req.body;
  if (!skill || typeof skill !== "string" || !skill.trim()) {
    res.status(400).json({ message: "Skill parameter is required." });
    return;
  }
  try {
    const result = await deleteUserSkillProgress(userId, skill.trim());
    res.status(200).json({ message: "Skill progress deleted successfully.", ...result });
  } catch (error) {
    logger.error("Delete skill progress error:", error);
    res.status(500).json({ message: "Failed to delete skill progress." });
  }
};
