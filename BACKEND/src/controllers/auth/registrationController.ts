import { Request, Response } from "express";
import { registerAccount } from "../../services/registrationService";

export const register = async (request: Request, response: Response): Promise<void> => {
  const registration = await registerAccount(request.body);
  response.status(registration.status).json({ message: registration.message });
};
