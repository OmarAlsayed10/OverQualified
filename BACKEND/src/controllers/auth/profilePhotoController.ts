import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import { deleteImageFromCloudinary } from "../../services/importService";

export const updateProfilePhoto = async (request: Request, response: Response): Promise<void> => {
  const authenticatedRequest = request as CustomRequest;
  if (!authenticatedRequest.user) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (!request.file?.path) {
    response.status(400).json({ message: "No photo provided" });
    return;
  }

  const userId = authenticatedRequest.user.userId;
  const newPhoto = request.file.path;
  let newPhotoIsCurrent = false;
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { photo: true } });
    if (!currentUser) {
      await deleteImageFromCloudinary(newPhoto);
      response.status(404).json({ message: "User not found" });
      return;
    }

    const updatedUser = await prisma.user.update({ where: { id: userId }, data: { photo: newPhoto } });
    newPhotoIsCurrent = true;
    if (currentUser.photo && currentUser.photo !== newPhoto) {
      try {
        await deleteImageFromCloudinary(currentUser.photo);
      } catch (error) {
        await prisma.user.update({ where: { id: userId }, data: { photo: currentUser.photo } });
        newPhotoIsCurrent = false;
        throw error;
      }
    }
    response.status(200).json({ message: "Photo updated successfully", photo: updatedUser.photo });
  } catch (error) {
    if (!newPhotoIsCurrent) {
      try {
        await deleteImageFromCloudinary(newPhoto);
      } catch (cleanupError) {
        console.error("New photo cleanup error:", cleanupError);
      }
    }
    console.error("Photo update error:", error);
    response.status(500).json({ message: "Failed to update photo" });
  }
};

export const deleteProfilePhoto = async (request: Request, response: Response): Promise<void> => {
  const authenticatedRequest = request as CustomRequest;
  if (!authenticatedRequest.user) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: authenticatedRequest.user.userId } });
    if (user?.photo) await deleteImageFromCloudinary(user.photo);
    await prisma.user.update({
      where: { id: authenticatedRequest.user.userId },
      data: { photo: null },
    });
    response.status(200).json({ message: "Photo removed successfully" });
  } catch (error) {
    console.error("Photo delete error:", error);
    response.status(500).json({ message: "Failed to remove photo" });
  }
};
