import { PaymentStatus } from "@prisma/client";
import prisma from "../../lib/prisma";
import {
  CreditQuote,
  CREDIT_PRICING_VERSION,
  InvalidCreditQuote,
  creditQuote,
} from "./creditPricingService";
import { allowance, isRefillTier, monthKey } from "../../shared/billing/quotaService";

interface CustomPaymentRequest {
  userId: string;
  amountEGP: unknown;
  referenceNumber: string;
  screenshotUrl: string;
}

// Uniqueness is enforced on the stored column, so both submission paths must write
// the same canonical form or "ABC 123" and "abc123" would count as two transfers.
export const normalizeReference = (reference: string) =>
  reference.trim().toUpperCase().replace(/\s+/g, "");

const validQuote = (amountEGP: unknown): CreditQuote => {
  const quote = creditQuote(amountEGP);
  if ("code" in quote) throw new Error("INVALID_CREDIT_QUOTE");
  return quote;
};

export const customCreditQuote = (amountEGP: unknown): CreditQuote | InvalidCreditQuote =>
  creditQuote(amountEGP);

export const customInstapayDetails = (amountEGP: unknown) => {
  const quote = validQuote(amountEGP);
  const bankName = process.env.INSTAPAY_BANK_NAME!;
  const accountName = process.env.INSTAPAY_ACCOUNT_NAME!;
  const accountNumber = process.env.INSTAPAY_ACCOUNT_NUMBER!;
  return {
    bankName,
    accountName,
    accountNumber,
    amountEGP: quote.amountEGP,
    currency: "EGP" as const,
    planDisplayName: "+" + quote.credits + " Credits",
    durationDays: 0,
    grantCredits: quote.credits,
    instructions: [
      "Open your InstaPay app",
      "Send to: " + bankName + " — " + accountName + " (" + accountNumber + ")",
      "Exact amount: " + quote.amountEGP + " EGP",
      "Copy the reference number shown after the transfer",
      "Come back here and submit the reference number with your screenshot",
    ],
  };
};

export const submitCustomPaymentRequest = async (request: CustomPaymentRequest) => {
  const [pending, quote] = await Promise.all([
    prisma.paymentRequest.findFirst({
      where: { userId: request.userId, status: PaymentStatus.PENDING },
    }),
    Promise.resolve(validQuote(request.amountEGP)),
  ]);
  if (pending) throw new Error("PENDING_EXISTS");
  return prisma.paymentRequest.create({
    data: {
      userId: request.userId,
      planId: null,
      amountSnapshot: quote.amountEGP,
      purchaseKind: "CUSTOM_TOPUP",
      grantCreditsSnapshot: quote.credits,
      pricingVersion: quote.pricingVersion,
      referenceNumber: normalizeReference(request.referenceNumber),
      screenshotUrl: request.screenshotUrl,
    },
    include: { plan: true },
  });
};

export const approvePaymentRequestAtomically = async (
  requestId: string,
  reviewedByEmail: string,
) =>
  prisma.$transaction(async (tx) => {
    const payment = await tx.paymentRequest.findUnique({
      where: { id: requestId },
      include: { plan: true, user: true },
    });
    if (!payment) throw new Error("NOT_FOUND");
    if (payment.status !== PaymentStatus.PENDING) throw new Error("NOT_PENDING");

    const claimed = await tx.paymentRequest.updateMany({
      where: { id: requestId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.APPROVED, reviewedAt: new Date(), reviewedByEmail },
    });
    if (claimed.count !== 1) throw new Error("NOT_PENDING");

    let updatedUser;
    if (payment.purchaseKind === "CUSTOM_TOPUP" || payment.purchaseKind === "FIXED_TOPUP") {
      updatedUser = await tx.user.update({
        where: { id: payment.userId },
        data: { bonusCredits: { increment: payment.grantCreditsSnapshot } },
      });
    } else {
      if (!payment.plan) throw new Error("PLAN_NOT_FOUND");
      // Renewing before the current term ends extends it instead of restarting from
      // today, so an early renewal never burns the days already paid for.
      const currentExpiry = payment.user.proExpiresAt?.getTime() ?? 0;
      const extendFrom = Math.max(Date.now(), currentExpiry);
      const expiresAt = new Date(
        extendFrom + payment.plan.durationDays * 24 * 60 * 60 * 1000,
      );
      updatedUser = await tx.user.update({
        where: { id: payment.userId },
        data: {
          planTier: payment.plan.tier,
          proExpiresAt: expiresAt,
          credits: allowance(payment.plan.tier),
          creditPeriod: isRefillTier(payment.plan.tier) ? monthKey() : null,
        },
      });
    }

    const approvedPayment = await tx.paymentRequest.findUnique({
      where: { id: requestId },
      include: { plan: true },
    });
    if (!approvedPayment) throw new Error("NOT_FOUND");
    return {
      payment: approvedPayment,
      user: updatedUser,
      displayName: approvedPayment.plan?.displayName ??
        "+" + approvedPayment.grantCreditsSnapshot + " Credits",
    };
  });

export const fixedTopupSnapshot = (plan: {
  kind: string;
  grantCredits: number;
}) => ({
  purchaseKind: plan.kind === "topup" ? "FIXED_TOPUP" as const : "SUBSCRIPTION" as const,
  grantCreditsSnapshot: plan.kind === "topup" ? plan.grantCredits : 0,
  pricingVersion: plan.kind === "topup" ? CREDIT_PRICING_VERSION : null,
});
