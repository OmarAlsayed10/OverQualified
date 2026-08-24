import { NextFunction, Request, Response } from "express";
import prisma from "../../../lib/prisma";
import { createCV, getCVsByUser } from "../../../services/cvBuilderService";
import { hasPaidAccess } from "../../../services/entitlementService";
import { authenticatedUserId } from "./authenticatedUserId";

export const saveCV = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const userId = authenticatedUserId(request);
    if (!userId) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }
    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, planTier: true, proExpiresAt: true },
    });
    if (!account) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!hasPaidAccess(account)) {
      const userCvs = await getCVsByUser(userId);
      if (!Array.isArray(userCvs)) {
        response.status(500).json({ message: "Failed to fetch user CVs." });
        return;
      }
      if (userCvs.length >= 2) {
        response.status(403).json({ message: "Normal Users can only save up to 2 CVs." });
        return;
      }
    }

    const { title, template, sectionOrder, customSections, fontScale, personalInfo, experience, education, projects, skills } = request.body;
    const saveResponse = await createCV({
      userId,
      title,
      template,
      sectionOrder,
      customSections,
      fontScale,
      personalInfo,
      experience,
      education,
      projects,
      skills,
    });
    response.status(saveResponse.status).json(saveResponse);
  } catch (error) {
    next(error);
  }
};

export const getUserCVs = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const userId = authenticatedUserId(request);
    if (!userId) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }
    response.json(await getCVsByUser(userId));
  } catch (error) {
    next(error);
  }
};
