import { Request } from "express";
import rateLimit from "express-rate-limit";
import prisma from "../lib/prisma";
import { CustomRequest, readTokenClaims } from "./validateJWTMiddleware";
import { logger } from "../lib/logger";

// Limiters run before authenticateToken on public routes, so the caller is identified
// from the token here.
const claimFromRequest = (req: Request): { userId: string; role?: string } | null => {
  const fromAuth = (req as CustomRequest).user;
  if (fromAuth) return { userId: fromAuth.userId, role: fromAuth.role };

  const claims = readTokenClaims(req);
  return claims ? { userId: claims.userId, role: claims.role } : null;
};

// Skipping a limiter removes every ceiling on login attempts, OTP sends and AI spend, so
// the admin role claim inside a 24h token is not enough on its own: a demoted admin would
// keep that bypass until the token expired. Confirm against the DB. Only tokens already
// claiming admin reach the query — every other request costs one string compare — and a
// failed lookup applies the limit rather than granting the bypass.
export const isAdminRequest = async (req: Request): Promise<boolean> => {
  const claim = claimFromRequest(req);
  if (claim?.role !== "admin") return false;

  try {
    const current = await prisma.user.findUnique({
      where: { id: claim.userId },
      select: { role: true },
    });
    return current?.role === "admin";
  } catch (err) {
    logger.error("[rate-limit] admin check failed, applying limit:", (err as Error).message);
    return false;
  }
};


// In a multi-node deployment swap MemoryStore for a Redis store here.
const json = (message: string) => ({ message });

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: isAdminRequest,
  standardHeaders: true,
  legacyHeaders: false,
  message: json("Too many auth attempts. Try again in 15 minutes."),
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: isAdminRequest,
  standardHeaders: true,
  legacyHeaders: false,
  message: json("Too many OTP requests. Try again in 1 hour."),
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  skip: isAdminRequest,
  standardHeaders: true,
  legacyHeaders: false,
  message: json("AI request limit reached. Try again in 1 hour."),
});

export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: isAdminRequest,
  standardHeaders: true,
  legacyHeaders: false,
  message: json("Too many payment attempts. Try again in 1 hour."),
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: isAdminRequest,
  standardHeaders: true,
  legacyHeaders: false,
  message: json("Too many requests. Please slow down."),
});
