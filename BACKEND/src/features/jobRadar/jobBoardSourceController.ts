import { Request, Response } from "express";
import {
  BOARD_PROVIDERS,
  createBoardSource,
  deleteBoardSource,
  listBoardSources,
  updateBoardSource,
} from "./jobBoardSourceService";

const invalidBoardSource = (error: unknown): string | null =>
  error instanceof Error && (error.message === "INVALID_BOARD_SOURCE" || error.message === "INVALID_BOARD_PROVIDER")
    ? error.message
    : null;

export const adminBoardSourcesController = async (_req: Request, res: Response) => {
  res.status(200).json({ providers: BOARD_PROVIDERS, sources: await listBoardSources() });
};

export const adminCreateBoardSourceController = async (req: Request, res: Response) => {
  try {
    res.status(201).json({ source: await createBoardSource(req.body) });
  } catch (error) {
    const code = invalidBoardSource(error);
    if (!code) throw error;
    res.status(400).json({ code, message: "Provider, board slug and company are required." });
  }
};

export const adminUpdateBoardSourceController = async (req: Request, res: Response) => {
  try {
    res.status(200).json({ source: await updateBoardSource(req.params.id, req.body) });
  } catch (error) {
    const code = invalidBoardSource(error);
    if (!code) throw error;
    res.status(400).json({ code, message: "Company must be at least 2 characters." });
  }
};

export const adminDeleteBoardSourceController = async (req: Request, res: Response) => {
  await deleteBoardSource(req.params.id);
  res.status(204).send();
};
