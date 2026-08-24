import { Request, Response, NextFunction } from "express";
import { renderCvPdf } from "../../services/pdfExportService";

const safeFileName = (name: unknown) =>
  String(name ?? "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_") || "My";

export const exportCvPdfController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { formData, sectionOrder, template, fontScale, name } = req.body ?? {};
    if (!formData || typeof formData !== "object") {
      res.status(400).json({ message: "formData is required" });
      return;
    }

    const { pdf, pageCount } = await renderCvPdf({ formData, sectionOrder, template, fontScale });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFileName(name)}_CV.pdf"`,
    );
    // The builder shows an estimated page count; this is the real one.
    res.setHeader("X-Page-Count", String(pageCount));
    res.send(pdf);
  } catch (error) {
    next(error);
  }
};
