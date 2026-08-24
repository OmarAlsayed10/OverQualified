import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { normalizeEmail } from "../../lib/normalizeEmail";
import { revokeSessions } from "../../lib/sessionRevocationCache";
import { CustomRequest, readTokenClaims } from "../../middleware/validateJWTMiddleware";
import { clearAuthCookie, issueAuthToken, SESSION_MAX_AGE_MS } from "../../services/authSessionService";
import { hasPaidAccess } from "../../services/entitlementService";
import { isLocked, nextLockoutState } from "../../services/loginLockoutService";

const PROFILE_FIELDS = ["phone", "location", "title", "linkedin", "github", "portfolio", "summary", "avatarColor", "skills", "onboarded"] as const;
const profileDefault = (field: string) => field === "onboarded" ? false : field === "skills" ? [] : null;
const profileFields = (user: Record<string, unknown>) => Object.fromEntries(
  PROFILE_FIELDS.map((field) => [field, user[field] ?? profileDefault(field)]),
);

export const login = async (request: Request, response: Response): Promise<void> => {
  const { email, password } = request.body;
  if (!email || !password) {
    response.status(400).json({ message: "Email and password are required." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user) {
    response.status(401).json({ message: "Invalid credentials." });
    return;
  }
  if (user.googleId && !user.passwordHash) {
    response.status(400).json({ message: "This account uses Google Sign-In. Please log in with Google." });
    return;
  }
  if (!user.emailVerified) {
    response.status(403).json({ message: "Email not verified. Please check your inbox for the OTP." });
    return;
  }

  const passwordIsValid = await bcrypt.compare(password, user.passwordHash!);
  if (isLocked(user)) {
    response.status(401).json({ message: "Invalid credentials." });
    return;
  }
  if (!passwordIsValid) {
    await prisma.user.update({ where: { id: user.id }, data: nextLockoutState(user) });
    response.status(401).json({ message: "Invalid credentials." });
    return;
  }
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  issueAuthToken(response, user);
  response.status(200).json({
    message: "Login successful.",
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      planTier: user.planTier,
      isPro: hasPaidAccess(user),
      proExpiresAt: user.proExpiresAt ? user.proExpiresAt.getTime() : null,
    },
  });
};

export const logout = async (request: Request, response: Response): Promise<void> => {
  const claims = readTokenClaims(request);
  clearAuthCookie(response);
  if (claims?.userId) {
    const revokedAt = new Date();
    try {
      await prisma.user.update({
        where: { id: claims.userId },
        data: { sessionsValidFrom: revokedAt },
      });
    } catch (error) {
      console.error(
        `[logout] durable revocation failed for user ${claims.userId} — token remains valid until it expires`,
        error,
      );
    }
    revokeSessions(claims.userId, revokedAt);
  }
  response.status(200).json({ message: "Logged out successfully" });
};

export const getCurrentUser = async (request: Request, response: Response): Promise<void> => {
  const authenticatedRequest = request as CustomRequest;
  if (!authenticatedRequest.user) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: authenticatedRequest.user.userId } });
  if (!user) {
    clearAuthCookie(response);
    response.status(401).json({ code: "AUTH_REQUIRED", message: "Account no longer exists." });
    return;
  }

  const ip = request.ip || request.socket.remoteAddress || null;
  if (ip && user.lastIp !== ip) {
    prisma.user.update({ where: { id: user.id }, data: { lastIp: ip } }).catch(() => {});
  }

  const sessionStart = authenticatedRequest.user.sessionStart ?? Date.now();
  if (Date.now() - sessionStart < SESSION_MAX_AGE_MS) {
    issueAuthToken(response, user, sessionStart);
  }

  response.status(200).json({
    user: {
      ...authenticatedRequest.user,
      role: user.role,
      planTier: user.planTier ?? "basic",
      isPro: hasPaidAccess(user),
      proExpiresAt: user.proExpiresAt ?? authenticatedRequest.user.proExpiresAt,
      firstName: user.firstName,
      lastName: user.lastName,
      photo: user.photo,
      isGoogleUser: !!user.googleId,
      ...profileFields(user as unknown as Record<string, unknown>),
    },
  });
};
