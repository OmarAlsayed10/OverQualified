import { Request, Response } from "express";
import { getAiStatus } from "../../shared/aiStatusService";

export const aiStatusController = async (_request: Request, response: Response): Promise<void> => {
  response.status(200).json(await getAiStatus());
};
