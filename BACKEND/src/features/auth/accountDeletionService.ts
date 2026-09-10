import prisma from "../../lib/prisma";
import { removeBannedUser } from "../../lib/banCache";
import {
  CloudinaryAsset,
  deleteCloudinaryAssets,
} from "../../shared/media/importService";
import { clearCVAnalysisCaches } from "../cv/cvAnalysisCacheService";

export const deleteUserAccount = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      photo: true,
      cvs: { select: { cloudinaryUrl: true } },
      paymentRequests: { select: { screenshotUrl: true } },
    },
  });

  if (!user) return false;

  const assets: CloudinaryAsset[] = [];
  if (user.photo) assets.push({ url: user.photo, resourceType: "image" });

  user.cvs.forEach((cv) => {
    if (cv.cloudinaryUrl) {
      assets.push({ url: cv.cloudinaryUrl, resourceType: "raw" });
    }
  });
  user.paymentRequests.forEach((payment) => {
    if (payment.screenshotUrl) {
      assets.push({ url: payment.screenshotUrl, resourceType: "image" });
    }
  });

  // Keep database references if external deletion fails so cleanup can be retried.
  await deleteCloudinaryAssets(assets);
  await prisma.user.delete({ where: { id: userId } });
  removeBannedUser(userId);
  clearCVAnalysisCaches();
  return true;
};