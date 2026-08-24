
import { Request, Response } from "express";
import { exportAdjustedCVToDocx } from "../../services/exportAdjustedCVService";

export const exportAdjustedCVController = async (req: Request, res: Response) => {
  const { adjustedCV } = req.body;

  if (!adjustedCV || typeof adjustedCV !== "string" || adjustedCV.trim().length === 0) {
    res.status(400).json({ message: "adjustedCV text is required" });
    return;
  }

  try {
    const buffer = await exportAdjustedCVToDocx(adjustedCV);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", 'attachment; filename="optimized-cv.docx"');
    res.send(buffer);
  } catch (error) {
    console.error("Export adjusted CV error:", error);
    res.status(500).json({ message: "Failed to export CV" });
  }
};
