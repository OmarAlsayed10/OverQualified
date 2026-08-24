import { FileText, Wand2, Pencil } from "../components/icons/MuiIcons";
import { ReactNode } from "react";
import { COLORS } from "../theme/tokens";

export interface FeatureHighlight {
  icon: ReactNode;
  headline: string;
  text: string;
}

export const BILLING_CYCLES = ["Monthly", "Annual"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];
export type PlanTier = "basic" | "pass" | "pro" | "ultra";

export interface TierInfo {
  title: string;
  badge?: string;
  features: string[];
  prices?: Record<BillingCycle, { monthly: string; total: string }>;
  freePrice?: string;
  freeValidText?: string;
}

export const PLAN_TIERS: Record<PlanTier, TierInfo> = {
  basic: {
    title: "Basic",
    freePrice: "$0",
    freeValidText: "Free forever",
    features: [
      "200 AI credits — one-time, lifetime",
      "≈ 1 CV analysis",
      "2 resume templates",
      "Basic resume sections",
      "OverQualified branding",
      "No Job Radar",
    ],
  },
  pass: {
    title: "7-Day Pass",
    freePrice: "99 EGP",
    freeValidText: "7 days full access · no subscription",
    features: [
      "1,500 AI credits — power every AI tool",
      "≈ 12 analyses, or mix across tools",
      "All Pro features for 7 days",
      "Job Radar access",
      "One-time — auto-expires, no renewal",
    ],
  },
  pro: {
    title: "Pro",
    badge: "POPULAR",
    features: [
      "5,000 AI credits / month",
      "Analysis, builder, optimizer & chat",
      "Job Radar access",
      "ATS check",
      "All resume templates",
      "No branding",
    ],
    prices: {
      Monthly: { monthly: "349 EGP", total: "Billed monthly" },
      Annual: { monthly: "217 EGP", total: "2599 EGP billed yearly" },
    },
  },
  ultra: {
    title: "Ultra",
    badge: "BEST VALUE",
    features: [
      "15,000 AI credits / month",
      "Everything in Pro",
      "Priority Job Radar",
      "Priority support",
    ],
    prices: {
      Monthly: { monthly: "499 EGP", total: "Billed monthly" },
      Annual: { monthly: "300 EGP", total: "3599 EGP billed yearly" },
    },
  },
};

export const TOPUP_NOTE = "Out of credits? Buy a top-up (+300 or +1000) anytime — no subscription change.";

export const CREDITS_NOTE = "Context-aware AI actions cost ~12 credits (due to deep CV analysis), a chat message ≈ 1.";

export const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    icon: <FileText color={COLORS.primary} size={32} />,
    headline: "One builder, hundreds of templates",
    text: "Choose from hundreds of professionally designed and ATS-friendly resume templates, tens of resume sections, and thousands of combinations made to make you stand out.",
  },
  {
    icon: <Wand2 color={COLORS.primary} size={32} />,
    headline: "AI Grammar & Content Checks",
    text: "Get a powerful AI-powered content analyzing tool. Don't let mistakes and typos cost a potential job. Cut out clichés, repetition, and vague wording.",
  },
  {
    icon: <Pencil color={COLORS.primary} size={32} />,
    headline: "Tailor your resume with a single click",
    text: "With our resume tailoring feature you can ensure your resume is relevant to the job you're applying for.",
  },
];
