import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma";
import { ANON_LIMIT, creditStatusForUser } from "../../shared/billing/quotaService";

const tokenUserId = (req: Request): string | null => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try {
    return (jwt.verify(token, process.env.JWT_SECRET_Key!) as { userId: string }).userId;
  } catch {
    return null;
  }
};

export const quotaStatusController = async (req: Request, res: Response): Promise<void> => {
  const userId = tokenUserId(req);
  res.set("Cache-Control", "no-store");
  if (userId) {
    const creditStatus = await creditStatusForUser(userId);
    if (!creditStatus) {
      res.status(404).json({ code: "USER_NOT_FOUND", message: "User not found." });
      return;
    }
    res.json(creditStatus);
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const usage = await prisma.ipAnalysisUsage.findUnique({ where: { ip } });
  res.json({
    identity: "guest",
    freeAnalysesLimit: ANON_LIMIT,
    freeAnalysesRemaining: Math.max(0, ANON_LIMIT - (usage?.count ?? 0)),
  });
};
