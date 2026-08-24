import { AI_MODELS } from "../config/aiModels";
import {
  PricingConfigurationError,
  creditQuote,
  creditsForUsage,
} from "./creditPricingService";

describe("creditPricingService", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env.USD_TO_EGP_RATE = "50";
    process.env.CREDIT_MARKUP_MULTIPLIER = "2";
    process.env.CREDIT_FX_BUFFER = "1.10";
    process.env.COMMERCIAL_EGP_PER_CREDIT = "0.70";
  });

  afterAll(() => {
    process.env = original;
  });

  it.each([
    [70, 100],
    [350, 500],
    [1050, 1500],
  ])("quotes %s EGP as %s whole credits", (amount, credits) => {
    expect(creditQuote(amount)).toMatchObject({
      amountEGP: amount.toFixed(2),
      credits,
      egpPerCredit: "0.70",
    });
  });

  it("returns nearest valid combinations instead of fractional credits", () => {
    const result = creditQuote(350.25);
    expect(result).toMatchObject({
      code: "FRACTIONAL_CREDITS",
      lower: { amountEGP: "350.00", credits: 500 },
      higher: { amountEGP: "350.70", credits: 501 },
    });
  });

  it.each([24.99, 5000.01, "10.123", "not-money"])(
    "rejects an out-of-policy custom amount: %s",
    (amount) => {
      expect(() => creditQuote(amount)).toThrow(RangeError);
    },
  );

  it("rejects a commercial rate that does not match the active pricing version", () => {
    process.env.COMMERCIAL_EGP_PER_CREDIT = "0.69";
    expect(() => creditQuote(70)).toThrow(PricingConfigurationError);
  });

  it("disables quoting when the commercial rate is below the safety floor", () => {
    process.env.USD_TO_EGP_RATE = "10000";
    expect(() => creditQuote(70)).toThrow(PricingConfigurationError);
  });

  it("uses exact model input/output prices and compound tool cost", () => {
    expect(
      creditsForUsage(AI_MODELS.fast, {
        prompt_tokens: 1_000_000,
        completion_tokens: 0,
      }),
    ).toBe(750);
    expect(
      creditsForUsage(AI_MODELS.versatile, {
        prompt_tokens: 0,
        completion_tokens: 1_000_000,
      }),
    ).toBe(6000);
    expect(
      creditsForUsage("groq/compound-mini", {
        prompt_tokens: 0,
        completion_tokens: 0,
      }),
    ).toBe(50);
  });
});
