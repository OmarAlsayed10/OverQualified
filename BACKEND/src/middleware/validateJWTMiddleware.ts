import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { isUserBanned } from "../lib/banCache";
import { isSessionRevoked } from "../lib/sessionRevocationCache";

export interface CustomRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role?: string;
    proExpiresAt?: Date;
    sessionStart?: number;
  };
}

interface TokenClaims {
  userId: string;
  email: string;
  role: string;
  proExpiresAt: Date;
  sessionStart?: number;
  scope?: string;
}

export const EXTENSION_SCOPE = "extension";

const extractToken = (req: Request): string | undefined =>
  (req as CustomRequest).cookies?.token || req.headers.authorization?.split(" ")[1];

const verifyToken = (token: string): TokenClaims | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET_Key!) as TokenClaims;
  } catch {
    return null;
  }
};

// Where a token lives and how it is verified is defined once here. Rate limiting and the
// public analyze route both need to identify a caller without gating on one, and each
// having its own copy of this is how they drift apart.
export const readTokenClaims = (req: Request): TokenClaims | null => {
  const token = extractToken(req);
  return token ? verifyToken(token) : null;
};

const claimsToUser = (claims: TokenClaims): CustomRequest["user"] => ({
  userId: claims.userId,
  email: claims.email,
  role: claims.role,
  proExpiresAt: claims.proExpiresAt,
  sessionStart: claims.sessionStart,
});

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const customReq = req as CustomRequest;
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ code: "AUTH_REQUIRED", message: "Access denied. No token provided." });
    return;
  }

  const claims = verifyToken(token);
  if (!claims) {
    res.status(401).json({ code: "AUTH_REQUIRED", message: "Invalid or expired token." });
    return;
  }

  if (claims.scope === EXTENSION_SCOPE) {
    res.status(403).json({ code: "SCOPE_FORBIDDEN", message: "Extension tokens cannot access this route." });
    return;
  }

  if (isUserBanned(claims.userId)) {
    res.status(403).json({ code: "ACCOUNT_SUSPENDED", message: "Account suspended." });
    return;
  }

  if (isSessionRevoked(claims.userId, claims.sessionStart)) {
    res.status(401).json({ code: "AUTH_REQUIRED", message: "Invalid or expired token." });
    return;
  }

  customReq.user = claimsToUser(claims);
  next();
};

// For routes that serve signed-in and anonymous callers alike: attaches the user when a
// valid token is present, continues anonymously otherwise. A banned account stays
// anonymous rather than being rejected — the route is public either way, and this stops it
// spending the credits of the account it is banned from.
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const claims = readTokenClaims(req);
  if (
    claims &&
    claims.scope !== EXTENSION_SCOPE &&
    !isUserBanned(claims.userId) &&
    !isSessionRevoked(claims.userId, claims.sessionStart)
  ) {
    (req as CustomRequest).user = claimsToUser(claims);
  }
  next();
};

export const requireExtensionToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  const claims = token ? verifyToken(token) : null;
  if (!claims || claims.scope !== EXTENSION_SCOPE) {
    res.status(401).json({ code: "EXTENSION_AUTH_REQUIRED", message: "Connect the extension to your account." });
    return;
  }
  if (isUserBanned(claims.userId)) {
    res.status(403).json({ code: "ACCOUNT_SUSPENDED", message: "Account suspended." });
    return;
  }
  (req as CustomRequest).user = claimsToUser(claims);
  next();
};
