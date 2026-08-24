import { buildCvContext } from "../../lib/cvContextBuilder";
import prisma from "../../lib/prisma";
import { BuilderFormData, coerceFormData } from "../cvParseService";
import { StartInterviewInput } from "../interviewCoachSchema";

const cvFormData = (cv: {
  personalInfo: unknown;
  experience: unknown;
  education: unknown;
  projects: unknown;
  skills: unknown;
}): BuilderFormData => ({
  personalInfo: cv.personalInfo,
  experience: cv.experience,
  education: cv.education,
  projects: cv.projects,
  skills: cv.skills,
} as BuilderFormData);

export async function interviewSource(userId: string, input: StartInterviewInput) {
  if (input.cvId) {
    const cv = await prisma.cV.findFirst({ where: { id: input.cvId, userId } });
    if (!cv) return null;
    return {
      cvId: cv.id,
      cvTitle: cv.title?.trim().slice(0, 200) || "Untitled CV",
      cvContext: buildCvContext(cvFormData(cv)).slice(0, 30000).trim(),
    };
  }

  const uploadedCv = input.uploadedCv!;
  const cvContext = buildCvContext(coerceFormData(uploadedCv.formData)).slice(0, 30000).trim();
  return {
    cvId: null,
    cvTitle: uploadedCv.fileName.replace(/\.[^.]+$/, "").trim().slice(0, 200) || "Uploaded CV",
    cvContext,
  };
}
