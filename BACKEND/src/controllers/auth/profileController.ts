import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import { deleteUserAccount } from "../../services/accountDeletionService";
import { clearAuthCookie } from "../../services/authSessionService";
import { sanitizeProfile } from "../../services/profileService";

export const updateProfile = async (request: Request, response: Response): Promise<void> => {
  const authenticatedRequest = request as CustomRequest;
  const { firstName, lastName, onboarded } = request.body;
  if (!authenticatedRequest.user) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: authenticatedRequest.user.userId } });
    if (!user) {
      response.status(404).json({ message: "User not found" });
      return;
    }

    const nextFirstName = typeof firstName === "string" && firstName.trim()
      ? firstName.trim()
      : user.firstName;
    const nextLastName = typeof lastName === "string" ? lastName.trim() : user.lastName;
    const nameChanged = user.firstName !== nextFirstName || user.lastName !== nextLastName;
    const changedAt = new Date();
    if (nameChanged && user.lastNameChange) {
      const daysSinceChange = (changedAt.getTime() - user.lastNameChange.getTime()) / (1000 * 3600 * 24);
      if (daysSinceChange < 30) {
        response.status(400).json({
          message: `Name can only be changed once every 30 days. Remaining: ${Math.ceil(30 - daysSinceChange)} days.`,
        });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: authenticatedRequest.user.userId },
      data: {
        ...sanitizeProfile(request.body as Record<string, unknown>),
        firstName: nextFirstName,
        lastName: nextLastName,
        ...(nameChanged ? { lastNameChange: changedAt } : {}),
        ...(onboarded === true ? { onboarded: true } : {}),
      },
    });
    response.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Profile update error:", error);
    response.status(500).json({ message: "Failed to update profile" });
  }
};

export const deleteAccount = async (request: Request, response: Response): Promise<void> => {
  const authenticatedRequest = request as CustomRequest;
  if (!authenticatedRequest.user) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const deleted = await deleteUserAccount(authenticatedRequest.user.userId);
    if (!deleted) {
      response.status(404).json({ message: "User not found" });
      return;
    }
    clearAuthCookie(response);
    response.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Account deletion error:", error);
    response.status(500).json({ message: "Failed to delete account" });
  }
};
