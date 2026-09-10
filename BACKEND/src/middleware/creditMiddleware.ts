import { Request, Response, NextFunction } from "express";
import { CustomRequest } from "./validateJWTMiddleware";
import { runWithUser } from "../lib/creditContext";
import { canSpend } from "../shared/billing/quotaService";

// Puts the caller's id into async-local storage so groqChat can bill the right
// user without threading userId through every service signature.
export const withUserContext = (req: Request, _res: Response, next: NextFunction) => {
  runWithUser((req as CustomRequest).user?.userId, () => next());
};

// Blocks an AI route when the user has no credits left (deduction itself happens
// inside groqChat after the call completes).
export const requireCredits = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as CustomRequest).user?.userId;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const gate = await canSpend({ userId, ip: req.ip || "unknown" });
  if (!gate.ok) {
    res.status(429).json({ code: gate.code ?? "CREDITS_EXHAUSTED", message: gate.message });
    return;
  }
  next();
};
