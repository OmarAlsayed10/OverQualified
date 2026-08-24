import { NextFunction, Request, Response } from "express";
import { getPrimaryCV, setPrimaryCV } from "../../../services/cvBuilderService";
import { authenticatedUserId } from "./authenticatedUserId";

export const getPrimary = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const userId = authenticatedUserId(request);
    if (!userId) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }
    const cv = await getPrimaryCV(userId);
    response.status(200).json({ cv: cv ?? null });
  } catch (error) {
    next(error);
  }
};

export const makePrimaryCV = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const userId = authenticatedUserId(request);
    if (!userId) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }
    const cvResponse = await setPrimaryCV(request.params.cvId, userId);
    response.status(cvResponse.status).json(cvResponse);
  } catch (error) {
    next(error);
  }
};
