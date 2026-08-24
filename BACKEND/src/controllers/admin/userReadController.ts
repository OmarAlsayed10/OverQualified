import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { withSignedScreenshot } from "../../services/importService";

export const listUsersController = async (_request: Request, response: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      planTier: true,
      banned: true,
      credits: true,
      bonusCredits: true,
      proExpiresAt: true,
      createdAt: true,
      _count: { select: { cvs: true, paymentRequests: true } },
    },
  });
  response.status(200).json({ users });
};

export const getUserController = async (request: Request, response: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: request.params.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      photo: true,
      role: true,
      planTier: true,
      banned: true,
      bannedReason: true,
      lastIp: true,
      credits: true,
      bonusCredits: true,
      creditPeriod: true,
      proExpiresAt: true,
      googleId: true,
      createdAt: true,
      cvs: {
        select: {
          id: true,
          isPrimary: true,
          cloudinaryUrl: true,
          personalInfo: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      paymentRequests: {
        select: {
          id: true,
          status: true,
          amountSnapshot: true,
          currency: true,
          referenceNumber: true,
          screenshotUrl: true,
          rejectionReason: true,
          createdAt: true,
          reviewedAt: true,
          plan: { select: { displayName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!user) {
    response.status(404).json({ message: "User not found." });
    return;
  }
  response.status(200).json({
    user: { ...user, paymentRequests: user.paymentRequests.map(withSignedScreenshot) },
  });
};
