import { hasPaidAccess, hasSubscriptionAccess } from "../entitlementService";

describe("hasPaidAccess", () => {
  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 60_000);

  it.each(["pass", "pro", "ultra"])("allows an active %s tier", (planTier) => {
    expect(hasPaidAccess({ role: "normal user", planTier, proExpiresAt: future })).toBe(true);
  });

  it("always allows admins", () => {
    expect(hasPaidAccess({ role: "admin", planTier: "basic", proExpiresAt: null })).toBe(true);
  });

  it.each([
    { role: "user", planTier: "basic", proExpiresAt: future },
    { role: "normal user", planTier: "pro", proExpiresAt: past },
    { role: "normal user", planTier: "pro", proExpiresAt: null },
  ])("rejects unpaid, expired, and missing-expiry access", (user) => {
    expect(hasPaidAccess(user)).toBe(false);
  });
});

describe("hasSubscriptionAccess", () => {
  const future = new Date(Date.now() + 60_000);

  it.each(["pro", "ultra"])("allows an active %s tier", (planTier) => {
    expect(hasSubscriptionAccess({ role: "normal user", planTier, proExpiresAt: future })).toBe(true);
  });

  it("always allows admins", () => {
    expect(hasSubscriptionAccess({ role: "admin", planTier: "basic", proExpiresAt: null })).toBe(true);
  });

  it.each(["basic", "pass"])("rejects the %s tier", (planTier) => {
    expect(hasSubscriptionAccess({ role: "normal user", planTier, proExpiresAt: future })).toBe(false);
  });
});
