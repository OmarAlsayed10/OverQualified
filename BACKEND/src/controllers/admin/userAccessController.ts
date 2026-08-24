import { Request, Response } from "express";
import { addBannedUser, removeBannedUser } from "../../lib/banCache";
import prisma from "../../lib/prisma";
import { deleteUserAccount } from "../../services/accountDeletionService";
import { rejectAdminMutation } from "./rejectAdminMutation";

export const deleteUserController = async (request: Request, response: Response): Promise<void> => {
  try {
    if (await rejectAdminMutation(request.params.id, response)) return;
    const deleted = await deleteUserAccount(request.params.id);
    if (!deleted) {
      response.status(404).json({ message: "User not found." });
      return;
    }
    response.status(200).json({
      message: "User account permanently deleted.",
      userId: request.params.id,
    });
  } catch (error) {
    console.error("Admin account deletion error:", error);
    response.status(500).json({ message: "Failed to delete user account." });
  }
};

export const banUserController = async (request: Request, response: Response): Promise<void> => {
  const { reason } = request.body;
  if (await rejectAdminMutation(request.params.id, response)) return;
  const user = await prisma.user.update({
    where: { id: request.params.id },
    data: { banned: true, bannedReason: reason ?? null },
    select: { id: true, banned: true, bannedReason: true },
  });
  addBannedUser(user.id);
  response.status(200).json({ message: "User banned.", user });
};

export const unbanUserController = async (request: Request, response: Response): Promise<void> => {
  const user = await prisma.user.update({
    where: { id: request.params.id },
    data: { banned: false, bannedReason: null },
    select: { id: true, banned: true },
  });
  removeBannedUser(user.id);
  response.status(200).json({ message: "User unbanned.", user });
};
