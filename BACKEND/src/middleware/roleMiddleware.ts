import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "./validateJWTMiddleware";
import prisma from "../lib/prisma";
import { hasPaidAccess, hasSubscriptionAccess } from "../shared/billing/entitlementService";

export const requireProUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as CustomRequest).user;

  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ code: "AUTH_REQUIRED", message: "Unauthorized" });
    return;
  }

  // Read live role/expiry from the DB, not the JWT claims: a token lives 1 day,
  // so a downgrade/revoke must take effect immediately, not on token expiry.
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true, planTier: true, proExpiresAt: true },
  });

  const isPro = !!dbUser && hasPaidAccess(dbUser);

  if (!isPro) {
    res
      .status(StatusCodes.FORBIDDEN)
      .json({ code: "PRO_REQUIRED", message: "Access restricted to paid users only." });
    return;
  }

  next();
};

export const requireSubscribedUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as CustomRequest).user;

  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ code: "AUTH_REQUIRED", message: "Unauthorized" });
    return;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true, planTier: true, proExpiresAt: true },
  });

  if (!dbUser || !hasSubscriptionAccess(dbUser)) {
    res
      .status(StatusCodes.FORBIDDEN)
      .json({ code: "SUBSCRIPTION_REQUIRED", message: "Access restricted to Pro and Ultra subscribers." });
    return;
  }

  next();
};
