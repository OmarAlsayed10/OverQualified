import { createHash } from "crypto";
import type { CV } from "@prisma/client";
import { extractText } from "./extractTextService";
import { renderCvPdf } from "./pdfExportService";

interface SavedCvAnalysisArtifact {
  text: string;
  pageCount: number;
}

const RENDER_VERSION = "2026-08-canonical-pdf";
const ARTIFACT_CACHE_MAX = 100;
const artifactCache = new Map<string, Promise<SavedCvAnalysisArtifact>>();

export const clearSavedCvAnalysisArtifacts = () => artifactCache.clear();

const renderFormData = (cv: CV) => {
  const skills = (cv.skills || {}) as Record<string, unknown>;
  const certifications = typeof skills.certifications === "string"
    ? skills.certifications
        .split(",")
        .map((name) => ({ name: name.trim(), issuer: "", date: "", url: "", description: "" }))
        .filter(({ name }) => name)
    : Array.isArray(skills.certifications)
      ? skills.certifications
      : [];

  let skillCategories = Array.isArray(skills.skillCategories)
    ? skills.skillCategories
    : [];
  if (skillCategories.length === 0 && Array.isArray(skills.skills)) {
    const flat = (skills.skills as unknown[]).filter((s): s is string => typeof s === "string" && Boolean(s.trim()));
    if (flat.length > 0) {
      skillCategories = [{ name: "Other Skills", skills: flat }];
    }
  }

  return {
    ...cv,
    skills: {
      ...skills,
      skillCategories,
      skills: Array.isArray(skills.skills) ? skills.skills : [],
      languages: typeof skills.languages === "string" ? skills.languages : "",
      certifications,
    },
  };
};

const artifactKey = (cv: CV) =>
  `saved-cv-pdf:${createHash("sha256")
    .update(JSON.stringify({
      version: RENDER_VERSION,
      id: cv.id,
      updatedAt: cv.updatedAt,
      template: cv.template,
      sectionOrder: cv.sectionOrder,
      fontScale: cv.fontScale,
      personalInfo: cv.personalInfo,
      experience: cv.experience,
      education: cv.education,
      projects: cv.projects,
      skills: cv.skills,
      customSections: cv.customSections,
    }))
    .digest("hex")}`;

export const renderedCvAnalysisArtifact = async (
  payload: Parameters<typeof renderCvPdf>[0],
): Promise<SavedCvAnalysisArtifact> => {
  const { pdf } = await renderCvPdf(payload);
  return extractText(pdf, "application/pdf");
};

const createArtifact = (cv: CV): Promise<SavedCvAnalysisArtifact> =>
  renderedCvAnalysisArtifact({
    formData: renderFormData(cv),
    sectionOrder: Array.isArray(cv.sectionOrder) ? cv.sectionOrder as string[] : undefined,
    template: cv.template,
    fontScale: cv.fontScale,
  });

export const savedCvAnalysisArtifact = (cv: CV): Promise<SavedCvAnalysisArtifact> => {
  const key = artifactKey(cv);
  const cached = artifactCache.get(key);
  if (cached) return cached;
  if (artifactCache.size >= ARTIFACT_CACHE_MAX) artifactCache.delete(artifactCache.keys().next().value!);

  const artifact = createArtifact(cv);
  artifactCache.set(key, artifact);
  void artifact.catch(() => {
    if (artifactCache.get(key) === artifact) artifactCache.delete(key);
  });
  return artifact;
};
