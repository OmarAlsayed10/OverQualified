import { Request, Response } from "express";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import {
  createJobCategory,
  createJobRole,
  listActiveJobCatalog,
  listAdminJobCatalog,
  listRoleSuggestions,
  reviewRoleSuggestion,
  submitJobRoleSuggestion,
  updateJobCategory,
  updateJobRole,
} from "./jobCatalogService";

const userId = (req: Request): string => (req as CustomRequest).user!.userId;

export const getJobCatalogController = async (_req: Request, res: Response) => {
  res.status(200).json({ categories: await listActiveJobCatalog() });
};

export const submitRoleSuggestionController = async (req: Request, res: Response) => {
  try {
    const suggestion = await submitJobRoleSuggestion({ userId: userId(req), ...req.body });
    res.status(201).json({ suggestion });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_SUGGESTION") {
      res.status(400).json({ code: "INVALID_SUGGESTION", message: "Category and role are required." });
      return;
    }
    throw error;
  }
};

export const adminJobCatalogController = async (_req: Request, res: Response) => {
  res.status(200).json({ categories: await listAdminJobCatalog() });
};

export const adminCreateJobCategoryController = async (req: Request, res: Response) => {
  res.status(201).json({ category: await createJobCategory(req.body) });
};

export const adminUpdateJobCategoryController = async (req: Request, res: Response) => {
  res.status(200).json({ category: await updateJobCategory(req.params.id, req.body) });
};

export const adminCreateJobRoleController = async (req: Request, res: Response) => {
  res.status(201).json({ role: await createJobRole(req.params.categoryId, req.body) });
};

export const adminUpdateJobRoleController = async (req: Request, res: Response) => {
  res.status(200).json({ role: await updateJobRole(req.params.id, req.body) });
};

export const adminRoleSuggestionsController = async (req: Request, res: Response) => {
  res.status(200).json({ suggestions: await listRoleSuggestions(req.query.status) });
};

export const adminReviewRoleSuggestionController = async (req: Request, res: Response) => {
  res.status(200).json({ review: await reviewRoleSuggestion({ id: req.params.id, ...req.body }) });
};
