import {
  isLocked,
  nextLockoutState,
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from "../loginLockoutService";

describe("Login Lockout Service (Pure Functions)", () => {
  const baseTime = 1700000000000;

  describe("isLocked", () => {
    test("returns false when user is null or undefined", () => {
      expect(isLocked(null, baseTime)).toBe(false);
      expect(isLocked(undefined, baseTime)).toBe(false);
    });

    test("returns false when lockedUntil is null or undefined", () => {
      expect(isLocked({ lockedUntil: null }, baseTime)).toBe(false);
      expect(isLocked({}, baseTime)).toBe(false);
    });

    test("returns true when lockedUntil is in the future", () => {
      const user = { lockedUntil: new Date(baseTime + 60000) };
      expect(isLocked(user, baseTime)).toBe(true);
    });

    test("returns false when lockedUntil has expired", () => {
      const user = { lockedUntil: new Date(baseTime - 1000) };
      expect(isLocked(user, baseTime)).toBe(false);
    });

    test("returns false when lockedUntil exactly equals now", () => {
      const user = { lockedUntil: new Date(baseTime) };
      expect(isLocked(user, baseTime)).toBe(false);
    });
  });

  describe("nextLockoutState", () => {
    test("increments attempts below threshold without locking", () => {
      const state1 = nextLockoutState({ failedLoginAttempts: 0 }, baseTime);
      expect(state1.failedLoginAttempts).toBe(1);
      expect(state1.lockedUntil).toBeNull();

      const state4 = nextLockoutState({ failedLoginAttempts: 3 }, baseTime);
      expect(state4.failedLoginAttempts).toBe(4);
      expect(state4.lockedUntil).toBeNull();
    });

    test(`locks account on ${MAX_FAILED_LOGIN_ATTEMPTS}th consecutive failure`, () => {
      const state5 = nextLockoutState({ failedLoginAttempts: 4 }, baseTime);
      expect(state5.failedLoginAttempts).toBe(5);
      expect(state5.lockedUntil).toEqual(new Date(baseTime + LOCKOUT_DURATION_MS));
      expect(state5.lockedUntil!.getTime() - baseTime).toBe(15 * 60 * 1000);
    });

    test("starts the count over once a lockout has been served", () => {
      const state = nextLockoutState(
        { failedLoginAttempts: 5, lockedUntil: new Date(baseTime - 1000) },
        baseTime
      );
      expect(state.failedLoginAttempts).toBe(1);
      expect(state.lockedUntil).toBeNull();
    });

    test("keeps counting while a lockout is still in force", () => {
      const state = nextLockoutState(
        { failedLoginAttempts: 5, lockedUntil: new Date(baseTime + 60000) },
        baseTime
      );
      expect(state.failedLoginAttempts).toBe(6);
      expect(state.lockedUntil).toEqual(new Date(baseTime + LOCKOUT_DURATION_MS));
    });
  });
});
