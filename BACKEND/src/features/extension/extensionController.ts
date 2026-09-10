import { Request, Response } from "express";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import { approvePairing, claimPairing, findPendingPairing, startPairing } from "./extensionAuthService";
import { captureJob, parseCapturedJob } from "./extensionJobService";
import { answerQuestions, parseQuestions, saveEditedAnswer } from "./extensionAnswerService";
import prisma from "../../lib/prisma";
import { renderCvPdf } from "../../shared/pdf/pdfExportService";

const userId = (req: Request): string => (req as CustomRequest).user!.userId;

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] as string));

const approvalPage = (code: string, body: string): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connect extension</title><style>
body{font:16px/1.5 system-ui,sans-serif;max-width:26rem;margin:4rem auto;padding:0 1rem;color:#111}
code{font-size:1.5rem;letter-spacing:.2em;background:#f4f4f5;padding:.4rem .6rem;border-radius:.4rem}
button{font:inherit;padding:.6rem 1.2rem;border:0;border-radius:.4rem;background:#111;color:#fff;cursor:pointer}
</style></head><body><h1>Connect extension</h1>${body.replace("__CODE__", escapeHtml(code))}</body></html>`;

export const startPairingController = async (_req: Request, res: Response) => {
  res.status(201).json(await startPairing());
};

export const claimPairingController = async (req: Request, res: Response) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  res.status(200).json(await claimPairing(code));
};

export const approvalPageController = async (req: Request, res: Response) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const pairing = await findPendingPairing(code);
  if (!pairing) {
    res.status(404).type("html").send(approvalPage(code, "<p>That code has expired. Open the extension and try again.</p>"));
    return;
  }
  res.status(200).type("html").send(approvalPage(code, `
    <p>Allow the OverQualified extension to read jobs and use your CVs on this account?</p>
    <p><code>__CODE__</code></p>
    <form method="POST" action="/api/extension/approve">
      <input type="hidden" name="code" value="__CODE__">
      <button type="submit">Connect</button>
    </form>`));
};

export const approvePairingController = async (req: Request, res: Response) => {
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  const approved = await approvePairing(code, userId(req));
  res.status(approved ? 200 : 400).type("html").send(approvalPage(code, approved
    ? "<p>Connected. Close this tab and return to the extension.</p>"
    : "<p>That code has expired. Open the extension and try again.</p>"));
};

export const captureJobController = async (req: Request, res: Response) => {
  try {
    res.status(200).json(await captureJob(userId(req), parseCapturedJob(req.body)));
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CAPTURE") {
      res.status(400).json({ code: "INVALID_CAPTURE", message: "A job url and title are required." });
      return;
    }
    throw error;
  }
};

export const answerQuestionsController = async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const questions = parseQuestions(body.questions);
  if (questions.length === 0) {
    res.status(400).json({ code: "NO_QUESTIONS", message: "No answerable questions were sent." });
    return;
  }
  const job = (body.job ?? {}) as Record<string, unknown>;
  try {
    const answers = await answerQuestions({
      userId: userId(req),
      cvId: typeof body.cvId === "string" ? body.cvId : "",
      job: {
        title: typeof job.title === "string" ? job.title : "",
        company: typeof job.company === "string" ? job.company : "",
        description: typeof job.description === "string" ? job.description : "",
      },
      questions,
    });
    res.status(200).json({ answers });
  } catch (error) {
    if (error instanceof Error && error.message === "CV_NOT_FOUND") {
      res.status(400).json({ code: "CV_NOT_FOUND", message: "Choose a CV before preparing answers." });
      return;
    }
    throw error;
  }
};

export const saveAnswerController = async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const saved = await saveEditedAnswer({
    userId: userId(req),
    cvId: typeof body.cvId === "string" ? body.cvId : "",
    label: typeof body.label === "string" ? body.label : "",
    answer: typeof body.answer === "string" ? body.answer : "",
  });
  res.status(200).json({ saved });
};

export const downloadCvController = async (req: Request, res: Response) => {
  const cv = await prisma.cV.findFirst({
    where: { id: req.params.cvId, userId: userId(req) },
  });
  if (!cv) {
    res.status(404).json({ code: "CV_NOT_FOUND", message: "That CV does not exist." });
    return;
  }
  const { pdf, pageCount } = await renderCvPdf({
    formData: {
      personalInfo: cv.personalInfo,
      experience: cv.experience,
      education: cv.education,
      projects: cv.projects,
      skills: cv.skills,
      customSections: cv.customSections,
    },
    sectionOrder: Array.isArray(cv.sectionOrder) ? (cv.sectionOrder as string[]) : undefined,
    template: cv.template,
    fontScale: cv.fontScale,
    sectionGap: cv.sectionGap,
  });
  const name = (cv.title || "CV").replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "_") || "CV";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${name}.pdf"`);
  res.setHeader("X-Page-Count", String(pageCount));
  res.send(pdf);
};

export const extensionMeController = async (req: Request, res: Response) => {
  res.status(200).json({ userId: userId(req), email: (req as CustomRequest).user!.email });
};
