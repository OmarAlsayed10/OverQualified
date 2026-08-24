import { AI_MODELS } from "../config/aiModels";

export const CREDIT_PRICING_VERSION = "2026-07-18";
export const COMMERCIAL_CREDIT_PRICE_CENTS = 70;
export const MIN_CUSTOM_AMOUNT_CENTS = 2_500;
export const MAX_CUSTOM_AMOUNT_CENTS = 500_000;
export const PROVIDER_USD_PER_CREDIT = 0.0001;

const DEFAULT_MARKUP = 2;
const DEFAULT_FX_BUFFER = 1.1;

export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface ProviderRate {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  toolUsdPerRequest?: number;
}

const PROVIDER_RATES: Record<string, ProviderRate> = {
  [AI_MODELS.fast]: { inputUsdPerMillion: 0.075, outputUsdPerMillion: 0.30 },
  [AI_MODELS.versatile]: { inputUsdPerMillion: 0.15, outputUsdPerMillion: 0.60 },
  [AI_MODELS.compoundMini]: {
    inputUsdPerMillion: 0.15,
    outputUsdPerMillion: 0.60,
    toolUsdPerRequest: 0.005,
  },
};

export class PricingConfigurationError extends Error {}

export interface CreditQuote {
  amountEGP: string;
  credits: number;
  egpPerCredit: string;
  pricingVersion: string;
}

export interface InvalidCreditQuote {
  code: "FRACTIONAL_CREDITS";
  lower: CreditQuote | null;
  higher: CreditQuote | null;
}

const environmentNumber = (name: string, fallback?: number): number => {
  const raw = process.env[name];
  if (!raw && fallback !== undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new PricingConfigurationError(name + " must be a positive number.");
  }
  return parsed;
};

const amountInCents = (amount: unknown): number | null => {
  const normalized = typeof amount === "number" ? amount.toFixed(2) : String(amount ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
};

const quoteFromCents = (cents: number): CreditQuote => ({
  amountEGP: (cents / 100).toFixed(2),
  credits: cents / COMMERCIAL_CREDIT_PRICE_CENTS,
  egpPerCredit: (COMMERCIAL_CREDIT_PRICE_CENTS / 100).toFixed(2),
  pricingVersion: CREDIT_PRICING_VERSION,
});

export const providerCostUsd = (model: string, usage: TokenUsage): number => {
  const rate = PROVIDER_RATES[model] ?? PROVIDER_RATES[AI_MODELS.versatile];
  const inputCost = ((usage.prompt_tokens ?? 0) * rate.inputUsdPerMillion) / 1_000_000;
  const outputCost = ((usage.completion_tokens ?? 0) * rate.outputUsdPerMillion) / 1_000_000;
  return inputCost + outputCost + (rate.toolUsdPerRequest ?? 0);
};

export const creditsForUsage = (model: string, usage: TokenUsage): number =>
  Math.max(1, Math.ceil(providerCostUsd(model, usage) / PROVIDER_USD_PER_CREDIT));

export const assertCommercialPriceIsSafe = (): void => {
  const commercialEgp = environmentNumber("COMMERCIAL_EGP_PER_CREDIT", 0.70);
  const commercialCents = Math.round(commercialEgp * 100);
  if (commercialCents !== COMMERCIAL_CREDIT_PRICE_CENTS) {
    throw new PricingConfigurationError("Commercial credit price does not match this pricing version.");
  }
  const usdToEgp = environmentNumber("USD_TO_EGP_RATE");
  const markup = environmentNumber("CREDIT_MARKUP_MULTIPLIER", DEFAULT_MARKUP);
  const fxBuffer = environmentNumber("CREDIT_FX_BUFFER", DEFAULT_FX_BUFFER);
  const minimumCents = PROVIDER_USD_PER_CREDIT * usdToEgp * markup * fxBuffer * 100;
  if (commercialCents < minimumCents) {
    throw new PricingConfigurationError("Configured credit price is below the provider-cost safety floor.");
  }
};

export const creditQuote = (amount: unknown): CreditQuote | InvalidCreditQuote => {
  assertCommercialPriceIsSafe();
  const cents = amountInCents(amount);
  if (cents === null || cents < MIN_CUSTOM_AMOUNT_CENTS || cents > MAX_CUSTOM_AMOUNT_CENTS) {
    throw new RangeError("Custom amount must be between 25 and 5000 EGP with at most two decimals.");
  }
  if (cents % COMMERCIAL_CREDIT_PRICE_CENTS === 0) return quoteFromCents(cents);

  const lowerCents = Math.floor(cents / COMMERCIAL_CREDIT_PRICE_CENTS) * COMMERCIAL_CREDIT_PRICE_CENTS;
  const higherCents = lowerCents + COMMERCIAL_CREDIT_PRICE_CENTS;
  return {
    code: "FRACTIONAL_CREDITS",
    lower: lowerCents >= MIN_CUSTOM_AMOUNT_CENTS ? quoteFromCents(lowerCents) : null,
    higher: higherCents <= MAX_CUSTOM_AMOUNT_CENTS ? quoteFromCents(higherCents) : null,
  };
};
