import { Request, Response } from "express";
import { GitHost } from "@prisma/client";
import {
  saveCredential,
  listCredentials,
  deleteCredential,
} from "./gitHostCredentialService";
import { GitHostError } from "../../lib/gitHostError";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import { logger } from "../../lib/logger";

const parseHost = (value: unknown): GitHost | null =>
  value === "GITHUB" || value === "GITLAB" ? value : null;

export const listGitCredentialsController = async (req: Request, res: Response): Promise<void> => {
  const credentials = await listCredentials((req as CustomRequest).user!.userId);
  res.status(200).json({ success: true, credentials });
};

export const saveGitCredentialController = async (req: Request, res: Response): Promise<void> => {
  const host = parseHost(req.body?.host);
  const { token, label } = req.body || {};

  if (!host || !token) {
    res.status(400).json({ message: "host and token are required." });
    return;
  }

  try {
    const credential = await saveCredential((req as CustomRequest).user!.userId, host, String(token), label);
    res.status(200).json({ success: true, credential });
  } catch (error: any) {
    if (error instanceof GitHostError) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    logger.error("Git credential save error");
    res.status(500).json({ message: "Could not save the access token." });
  }
};

export const deleteGitCredentialController = async (req: Request, res: Response): Promise<void> => {
  const host = parseHost(req.params?.host);

  if (!host) {
    res.status(400).json({ message: "Unknown provider." });
    return;
  }

  await deleteCredential((req as CustomRequest).user!.userId, host);
  res.status(200).json({ success: true });
};
