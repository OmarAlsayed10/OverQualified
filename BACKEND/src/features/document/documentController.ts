import { Request, Response } from "express";
import { CustomRequest } from "../../middleware/validateJWTMiddleware";
import { generateCoverLetter } from "../../shared/documents/coverLetterService";
import { generateLinkedInBio } from "./bioService";
import { normalizeJobDescription } from "../../lib/jobDescriptionNormalizer";
import { getPrimaryCV } from "../cv/cvBuilderService";
import {
  DOCUMENT_TYPES,
  isDocumentType,
  cvToPlainText,
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  setPrimaryDocument,
  type DocumentType,
} from "../../shared/documents/documentService";

const MAX_CV_TEXT = 6000;
const cap = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const userId = (req: Request) => (req as CustomRequest).user?.userId;

const defaultTitle = (type: DocumentType, role: string, company: string): string => {
  if (type === "cover-letter") {
    const target = [role, company].filter(Boolean).join(" @ ");
    return target ? `Cover letter — ${target}` : "Cover letter";
  }
  return "LinkedIn bio";
};

// Generates a prose document from the user's primary CV.
export const createGeneratedDocument = async (req: Request, res: Response): Promise<void> => {
  const uid = userId(req);
  if (!uid) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { type } = req.body;
  if (!isDocumentType(type)) {
    res.status(400).json({ message: `type must be one of: ${DOCUMENT_TYPES.join(", ")}` });
    return;
  }

  const role = cap(req.body.targetRole, 100);
  const company = cap(req.body.targetCompany, 100);
  const jobDescription = normalizeJobDescription(cap(req.body.targetJobDescription, 4000)).plainText;
  if (type === "cover-letter" && !role) {
    res.status(400).json({ message: "targetRole is required for a cover letter." });
    return;
  }

  const cv = await getPrimaryCV(uid);
  if (!cv) {
    res.status(400).json({ message: "Create a CV first — documents are generated from your CV." });
    return;
  }

  const cvText = cvToPlainText(cv).slice(0, MAX_CV_TEXT);
  if (!cvText) {
    res.status(400).json({ message: "Your CV is empty. Add some details before generating." });
    return;
  }

  const content =
    type === "cover-letter"
      ? (await generateCoverLetter(cvText, { title: role, company, description: jobDescription })).letter
      : await generateLinkedInBio(cvText);

  if (!content) {
    res.status(502).json({ message: "Generation failed. Please try again." });
    return;
  }

  const title = cap(req.body.title, 150) || defaultTitle(type, role, company);

  const doc = await createDocument({
    userId: uid,
    type,
    title,
    content,
    targetRole: role || null,
    targetCompany: company || null,
  });

  res.status(201).json({ document: doc });
};

export const getUserDocuments = async (req: Request, res: Response): Promise<void> => {
  const uid = userId(req);
  if (!uid) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const type = req.query.type;
  const docs = await listDocuments(uid, isDocumentType(type) ? type : undefined);
  res.status(200).json({ documents: docs });
};

export const getUserDocument = async (req: Request, res: Response): Promise<void> => {
  const uid = userId(req);
  if (!uid) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const doc = await getDocument(req.params.id, uid);
  if (!doc) {
    res.status(404).json({ message: "Document not found." });
    return;
  }
  res.status(200).json({ document: doc });
};

export const editDocument = async (req: Request, res: Response): Promise<void> => {
  const uid = userId(req);
  if (!uid) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const data: { title?: string; content?: string } = {};
  if ("title" in req.body) data.title = cap(req.body.title, 150);
  if ("content" in req.body) data.content = cap(req.body.content, 10000);
  const ok = await updateDocument(req.params.id, uid, data);
  if (!ok) {
    res.status(404).json({ message: "Document not found." });
    return;
  }
  res.status(200).json({ message: "Document updated." });
};

export const removeDocument = async (req: Request, res: Response): Promise<void> => {
  const uid = userId(req);
  if (!uid) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const ok = await deleteDocument(req.params.id, uid);
  if (!ok) {
    res.status(404).json({ message: "Document not found." });
    return;
  }
  res.status(200).json({ message: "Document deleted." });
};

export const makePrimaryDocument = async (req: Request, res: Response): Promise<void> => {
  const uid = userId(req);
  if (!uid) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const ok = await setPrimaryDocument(req.params.id, uid);
  if (!ok) {
    res.status(404).json({ message: "Document not found." });
    return;
  }
  res.status(200).json({ message: "Primary document updated." });
};
