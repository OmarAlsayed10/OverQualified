import { Request, Response } from "express";
import { withSignedScreenshot } from "../../services/importService";
import { listAllPayments } from "../../services/paymentService";

export const listAllPaymentsController = async (_request: Request, response: Response): Promise<void> => {
  const requests = await listAllPayments();
  response.status(200).json({ requests: requests.map(withSignedScreenshot) });
};
