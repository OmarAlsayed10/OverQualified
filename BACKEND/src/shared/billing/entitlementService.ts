export const PAID_TIERS = ["pass", "pro", "ultra"] as const;
const PAID_TIER_SET = new Set<string>(PAID_TIERS);

interface EntitlementUser {
  role: string;
  planTier: string;
  proExpiresAt: Date | null;
}

export const hasPaidAccess = (user: EntitlementUser, now = Date.now()): boolean => {
  if (user.role === "admin") return true;
  return PAID_TIER_SET.has(user.planTier) && !!user.proExpiresAt && user.proExpiresAt.getTime() > now;
};

export const SUBSCRIPTION_TIERS = ["pro", "ultra"] as const;
const SUBSCRIPTION_TIER_SET = new Set<string>(SUBSCRIPTION_TIERS);

// The 7-day pass is paid access but not a subscription: subscriber-only features
// (interview answers, builder AI editing, suggestion auto-apply) use this instead.
export const hasSubscriptionAccess = (user: EntitlementUser, now = Date.now()): boolean => {
  if (user.role === "admin") return true;
  return SUBSCRIPTION_TIER_SET.has(user.planTier) && !!user.proExpiresAt && user.proExpiresAt.getTime() > now;
};
