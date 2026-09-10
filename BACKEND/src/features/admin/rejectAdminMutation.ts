import { Response } from "express";
import prisma from "../../lib/prisma";

export const rejectAdminMutation = async (userId: string, response: Response): Promise<boolean> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) {
    response.status(404).json({ message: "User not found." });
    return true;
  }
  if (user.role === "admin") {
    response.status(403).json({ message: "Admin accounts cannot be modified." });
    return true;
  }
  return false;
};
