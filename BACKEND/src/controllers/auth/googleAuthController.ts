import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { issueAuthToken } from "../../services/authSessionService";

type GoogleCallbackRequest = Request & { user: { id: string } };

export const googleAuthCallback = async (request: Request, response: Response): Promise<void> => {
  try {
    const userId = (request as GoogleCallbackRequest).user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      response.status(404).json({ message: "User not found" });
      return;
    }

    issueAuthToken(response, user);
    response.redirect(`${process.env.CLIENT_URL}/auth/success`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    response.status(500).json({ message: "Internal server error" });
  }
};
