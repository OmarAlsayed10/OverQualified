import { Request, Response } from "express";
import { confirmPasswordReset, requestPasswordReset } from "../../services/passwordResetService";

export const forgotPassword = async (request: Request, response: Response): Promise<void> => {
  const message = await requestPasswordReset(request.body?.email);
  response.status(200).json({ message });
};

export const resetPassword = async (request: Request, response: Response): Promise<void> => {
  const reset = await confirmPasswordReset(request.body ?? {});
  response.status(reset.status).json({ message: reset.message });
};
