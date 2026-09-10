import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request, Response } from "express";
import { PROJECT_IMPORT_CONSTANTS } from "../config/projectImportConstants";
import { CustomRequest } from "./validateJWTMiddleware";
import prisma from "../lib/prisma";
import { hasPaidAccess } from "../shared/billing/entitlementService";
import { isAdminRequest } from "./rateLimitMiddleware";

export const projectImportLimiter = rateLimit({
  windowMs: PROJECT_IMPORT_CONSTANTS.WINDOW_MS,
  skip: isAdminRequest,
  max: async (req: Request): Promise<number> => {
    const user = (req as CustomRequest).user;
    if (!user) return PROJECT_IMPORT_CONSTANTS.FREE_USER_RATE_LIMIT;

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { role: true, planTier: true, proExpiresAt: true },
      });
      const isPro = !!dbUser && hasPaidAccess(dbUser);
      return isPro
        ? PROJECT_IMPORT_CONSTANTS.PRO_USER_RATE_LIMIT
        : PROJECT_IMPORT_CONSTANTS.FREE_USER_RATE_LIMIT;
    } catch {
      return PROJECT_IMPORT_CONSTANTS.FREE_USER_RATE_LIMIT;
    }
  },
  keyGenerator: (req: Request): string => {
    const user = (req as CustomRequest).user;
    return user ? `user_${user.userId}` : ipKeyGenerator(req.ip ?? "unknown");
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: (req: Request, res: Response) => {
    res.status(429).json({
      message: "Project import limit reached. Free users: 2 imports per 15 mins. Pro users: 5 imports per 15 mins.",
    });
  },
});
