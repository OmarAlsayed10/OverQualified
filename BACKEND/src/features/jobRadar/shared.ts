import { Request } from "express";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";

export const VALID_JOB_MATCH_STATUSES = ["matched", "applied", "interview", "offer", "rejected", "dismissed"];
export const MAX_CV_TEXT = 30000;
export const authenticatedUserId = (request: Request): string => (request as CustomRequest).user!.userId;
export const requestedLanguage = (language: unknown): "en" | "ar" => language === "ar" ? "ar" : "en";
