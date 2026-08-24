import prisma from "../lib/prisma";

export const DOCUMENT_TYPES = ["cover-letter", "linkedin-bio"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const isDocumentType = (v: unknown): v is DocumentType =>
  typeof v === "string" && (DOCUMENT_TYPES as readonly string[]).includes(v);

interface CvLike {
  personalInfo: unknown;
  experience: unknown;
  education: unknown;
  skills: unknown;
}

const line = (label: string, value: unknown): string =>
  value ? `${label}: ${value}\n` : "";

// Flattens a structured CV record into plain text for the AI generators.
export const cvToPlainText = (cv: CvLike): string => {
  const p = (cv.personalInfo ?? {}) as Record<string, unknown>;
  const exp = Array.isArray(cv.experience) ? cv.experience : [];
  const edu = Array.isArray(cv.education) ? cv.education : [];
  const sk = (cv.skills ?? {}) as Record<string, unknown>;

  let out = "";
  out += line("Name", [p.firstName, p.lastName].filter(Boolean).join(" "));
  out += line("Title", p.professionalTitle);
  out += line("Summary", p.ProfessionalSummary);

  if (exp.length) {
    out += "\nExperience:\n";
    for (const e of exp as Record<string, unknown>[]) {
      out += `- ${e.jobTitle ?? ""} at ${e.company ?? ""} (${e.startDate ?? ""}–${e.endDate ?? ""})\n`;
      if (e.description) out += `  ${e.description}\n`;
    }
  }

  if (edu.length) {
    out += "\nEducation:\n";
    for (const e of edu as Record<string, unknown>[]) {
      out += `- ${e.degree ?? ""}, ${e.institution ?? ""} (${e.endYear ?? ""})\n`;
    }
  }

  const skills = Array.isArray(sk.skills) ? sk.skills.join(", ") : "";
  if (skills) out += `\nSkills: ${skills}\n`;

  return out.trim();
};

export const createDocument = (data: {
  userId: string;
  type: DocumentType;
  title: string;
  content: string;
  targetRole?: string | null;
  targetCompany?: string | null;
}) => prisma.document.create({ data });

export const listDocuments = (userId: string, type?: DocumentType) =>
  prisma.document.findMany({
    where: { userId, type: type ?? { in: [...DOCUMENT_TYPES] } },
    orderBy: { updatedAt: "desc" },
  });

export const getDocument = (id: string, userId: string) =>
  prisma.document.findFirst({ where: { id, userId } });

export const updateDocument = async (
  id: string,
  userId: string,
  data: { title?: string; content?: string }
) => {
  const result = await prisma.document.updateMany({ where: { id, userId }, data });
  return result.count > 0;
};

export const deleteDocument = async (id: string, userId: string) => {
  const result = await prisma.document.deleteMany({ where: { id, userId } });
  return result.count > 0;
};

// Marks one document primary within its type and clears the flag on the user's others of that type.
export const setPrimaryDocument = async (id: string, userId: string) => {
  const doc = await prisma.document.findFirst({ where: { id, userId } });
  if (!doc) return false;
  await prisma.$transaction([
    prisma.document.updateMany({
      where: { userId, type: doc.type, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.document.update({ where: { id }, data: { isPrimary: true } }),
  ]);
  return true;
};
