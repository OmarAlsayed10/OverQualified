export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export interface LockoutCandidate {
  lockedUntil?: Date | null;
}

export interface AttemptCounter extends LockoutCandidate {
  failedLoginAttempts: number;
}

export interface LockoutState {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export const isLocked = (
  user: LockoutCandidate | null | undefined,
  now: number = Date.now()
): boolean => {
  if (!user?.lockedUntil) return false;
  return user.lockedUntil.getTime() > now;
};

// A lockout that has already elapsed starts the count over. Carrying the old count forward
// would leave it at the threshold permanently, so a single further mistake would re-lock a
// legitimate user for the full duration every time.
export const nextLockoutState = (
  user: AttemptCounter,
  now: number = Date.now()
): LockoutState => {
  const lockoutServed = !!user.lockedUntil && user.lockedUntil.getTime() <= now;
  const priorAttempts = lockoutServed ? 0 : Math.max(0, user.failedLoginAttempts);
  const failedLoginAttempts = priorAttempts + 1;
  const isNowLocked = failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;

  return {
    failedLoginAttempts,
    lockedUntil: isNowLocked ? new Date(now + LOCKOUT_DURATION_MS) : null,
  };
};
