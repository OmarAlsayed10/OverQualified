import { Request, Response } from "express";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import { approvePaymentRequestAtomically } from "../../services/creditPurchaseService";
import { emailService } from "../../services/emailService";
import { withSignedScreenshot } from "../../services/importService";
import { listPendingPayments, rejectPaymentRequest } from "../../services/paymentService";

export const adminListPendingController = async (_request: Request, response: Response): Promise<void> => {
  const requests = await listPendingPayments();
  response.status(200).json({ requests: requests.map(withSignedScreenshot) });
};

export const adminApproveController = async (request: Request, response: Response): Promise<void> => {
  const reviewer = (request as CustomRequest).user!;
  try {
    const approved = await approvePaymentRequestAtomically(request.params.id, reviewer.email);
    await emailService.sendPaymentApproved(
      approved.user.email,
      approved.user.firstName,
      {
        displayName: approved.displayName,
        durationDays: approved.payment.plan?.durationDays ?? 0,
        credits: approved.payment.grantCreditsSnapshot,
      },
    );
    response.status(200).json({
      message: "Payment approved and the purchase was applied.",
      userId: approved.user.id,
      plan: approved.displayName,
      expiresAt: approved.user.proExpiresAt,
    });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      response.status(404).json({ message: "Payment request not found." });
      return;
    }
    if (error.message === "NOT_PENDING") {
      response.status(409).json({ message: "Payment request is not in PENDING state." });
      return;
    }
    console.error("Admin approve error:", error);
    response.status(500).json({ message: "Failed to approve payment." });
  }
};

export const adminRejectController = async (request: Request, response: Response): Promise<void> => {
  const { reason } = request.body;
  const reviewer = (request as CustomRequest).user!;
  if (!reason) {
    response.status(400).json({ message: "Rejection reason is required." });
    return;
  }

  try {
    const rejected = await rejectPaymentRequest(request.params.id, reason, reviewer.email);
    await emailService.sendPaymentRejected(rejected.user.email, rejected.user.firstName, reason);
    response.status(200).json({
      message: "Payment rejected. User has been notified.",
      requestId: rejected.id,
    });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      response.status(404).json({ message: "Payment request not found." });
      return;
    }
    if (error.message === "NOT_PENDING") {
      response.status(409).json({ message: "Payment request is not in PENDING state." });
      return;
    }
    console.error("Admin reject error:", error);
    response.status(500).json({ message: "Failed to reject payment." });
  }
};
