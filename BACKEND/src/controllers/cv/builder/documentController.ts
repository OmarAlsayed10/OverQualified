import { NextFunction, Request, Response } from "express";
import { deleteCV, getCVById, updateCV } from "../../../services/cvBuilderService";
import { authenticatedUserId } from "./authenticatedUserId";

export const getCV = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const userId = authenticatedUserId(request);
    if (!userId) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }
    const cvResponse = await getCVById(request.params.cvId, userId);
    response.status(cvResponse.status).json(cvResponse);
  } catch (error) {
    next(error);
  }
};

export const editCV = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const userId = authenticatedUserId(request);
    if (!userId) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }
    const cvResponse = await updateCV(request.params.cvId, userId, request.body);
    response.status(cvResponse.status).json(cvResponse);
  } catch (error) {
    next(error);
  }
};

export const removeCV = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const userId = authenticatedUserId(request);
    if (!userId) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }
    const cvResponse = await deleteCV(request.params.cvId, userId);
    response.status(cvResponse.status).json(cvResponse);
  } catch (error) {
    next(error);
  }
};
