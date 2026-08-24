import { Request, Response } from "express";
import { displayName } from "../../lib/displayName";
import prisma from "../../lib/prisma";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import { submitCustomPaymentRequest } from "../../services/creditPurchaseService";
import { PricingConfigurationError } from "../../services/creditPricingService";
import { emailService } from "../../services/emailService";
import {
  getLatestPaymentStatus,
  listUserPayments,
  submitPaymentRequest,
} from "../../services/paymentService";

const PAYMENT_REFERENCE_PATTERN = /^[A-Za-z0-9._\/-]{1,100}$/;

const normalizedPaymentReference = (reference: unknown): string | null => {
  if (typeof reference !== "string") return null;
  const normalized = reference.trim();
  return PAYMENT_REFERENCE_PATTERN.test(normalized) ? normalized : null;
};

export const submitPaymentController = async (request: Request, response: Response): Promise<void> => {
  const user = (request as CustomRequest).user!;
  const { planId, customAmountEGP } = request.body;
  const paymentReference = normalizedPaymentReference(request.body.referenceNumber);
  const screenshot = request.file;
  const hasPlan = typeof planId === "string" && planId.length > 0;
  const hasCustomAmount = customAmountEGP !== undefined && customAmountEGP !== null;
  if (hasPlan === hasCustomAmount || !paymentReference || !screenshot) {
    response.status(400).json({
      code: "INVALID_PAYMENT_SUBMISSION",
      message: "Choose either a plan or a custom credit amount, then provide a valid reference and screenshot.",
    });
    return;
  }

  try {
    const paymentRequest = hasCustomAmount
      ? await submitCustomPaymentRequest({
          userId: user.userId,
          amountEGP: customAmountEGP,
          referenceNumber: paymentReference,
          screenshotUrl: screenshot.path,
        })
      : await submitPaymentRequest(user.userId, planId, paymentReference, screenshot.path);
    try {
      const paymentUser = await prisma.user.findUnique({ where: { id: user.userId } });
      if (paymentUser) {
        await emailService.sendPaymentReceivedToAdmin({
          requestId: paymentRequest.id,
          userEmail: paymentUser.email,
          userName: displayName(paymentUser.firstName, paymentUser.lastName),
          referenceNumber: paymentReference,
          amount: paymentRequest.amountSnapshot.toString(),
        });
      }
    } catch (emailError) {
      console.error("Admin notification email failed (payment still recorded):", emailError);
    }

    response.status(201).json({
      message: "Payment submitted. We will review it within 24 hours.",
      requestId: paymentRequest.id,
      status: paymentRequest.status,
      plan: {
        displayName: paymentRequest.plan?.displayName ?? "+" + paymentRequest.grantCreditsSnapshot + " Credits",
        durationDays: paymentRequest.plan?.durationDays ?? 0,
      },
    });
  } catch (error: any) {
    if (error.message === "PENDING_EXISTS") {
      response.status(409).json({
        message: "You already have a pending payment request. Please wait for it to be reviewed.",
      });
      return;
    }
    if (error.message === "PLAN_NOT_FOUND") {
      response.status(404).json({ message: "Selected plan not found." });
      return;
    }
    if (error.code === "P2002") {
      response.status(409).json({
        code: "REFERENCE_ALREADY_USED",
        message: "That transfer reference has already been submitted. Check the reference number, or contact support if you believe this is an error.",
      });
      return;
    }
    console.error("Payment submit error:", error);
    if (error.message === "INVALID_CREDIT_QUOTE" || error instanceof RangeError) {
      response.status(422).json({
        code: "INVALID_CREDIT_QUOTE",
        message: "Enter an amount that buys a whole number of credits.",
      });
      return;
    }
    if (error instanceof PricingConfigurationError) {
      response.status(503).json({
        code: "PRICING_UNAVAILABLE",
        message: "Credit purchasing is temporarily unavailable.",
      });
      return;
    }
    response.status(500).json({ message: "Failed to submit payment." });
  }
};

export const paymentStatusController = async (request: Request, response: Response): Promise<void> => {
  const user = (request as CustomRequest).user!;
  const paymentRequest = await getLatestPaymentStatus(user.userId);
  response.status(200).json({ paymentRequest });
};

export const paymentHistoryController = async (request: Request, response: Response): Promise<void> => {
  const user = (request as CustomRequest).user!;
  const payments = await listUserPayments(user.userId);
  response.status(200).json({ payments });
};
