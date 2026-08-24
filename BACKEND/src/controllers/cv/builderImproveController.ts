import { Request, Response } from "express";
import { z } from "zod";
import { sendAiError } from "../../lib/aiError";
import { improveBuilderCV } from "../../services/builderImproveService";
import { coerceFormData } from "../../services/cvParseService";

const dimensionsSchema = z.array(z.object({
  name: z.string().min(1).max(100),
  score: z.number().min(0).max(100),
  details: z.array(z.string().min(1).max(1000)).max(10),
}).strict()).max(10);

export const improveBuilderCVController = async (req: Request, res: Response): Promise<void> => {
  if (!req.body?.formData || typeof req.body.formData !== "object") {
    res.status(400).json({ message: "formData is required" });
    return;
  }

  const dimensions = dimensionsSchema.safeParse(req.body.dimensions);
  if (!dimensions.success) {
    res.status(400).json({ message: "Valid score findings are required" });
    return;
  }

  try {
    const improved = await improveBuilderCV(coerceFormData(req.body.formData), dimensions.data);
    res.status(200).json(improved);
  } catch (error) {
    sendAiError(res, error, "Builder improvement error", "Failed to improve CV");
  }
};
