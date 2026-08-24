import prisma from "./prisma";

// ponytail: in-memory revocation list, single-instance only. Move to Redis if the
// server ever runs more than one process — a logout only revokes on the node that served it.
const revocations = new Map<string, number>();

// Must match the `expiresIn` used by authSessionService. A revocation
// older than the longest-lived token can no longer reject anything, because any token it
// would match has already failed signature verification on expiry.
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const pruneExpired = (now: number): void => {
  for (const [userId, revokedAt] of revocations) {
    if (now - revokedAt > TOKEN_MAX_AGE_MS) revocations.delete(userId);
  }
};

// Errors propagate: server.ts decides whether a failed boot load is fatal, exactly as it
// does for loadBanCache. Swallowing here would start the server with an empty cache and
// silently accept every previously revoked token.
export const loadRevocationCache = async (): Promise<void> => {
  const users = await prisma.user.findMany({
    where: { sessionsValidFrom: { not: null } },
    select: { id: true, sessionsValidFrom: true },
  });
  revocations.clear();
  users.forEach((user) => {
    if (user.sessionsValidFrom) {
      revocations.set(user.id, user.sessionsValidFrom.getTime());
    }
  });
  pruneExpired(Date.now());
};

export const revokeSessions = (userId: string, at: Date = new Date()): void => {
  const revokedAt = at.getTime();
  pruneExpired(revokedAt);
  revocations.set(userId, revokedAt);
};

export const isSessionRevoked = (
  userId: string,
  sessionStart?: number
): boolean => {
  const validFrom = revocations.get(userId);
  if (!validFrom) return false;
  if (!sessionStart) return true;
  return sessionStart < validFrom;
};
