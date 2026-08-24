import { z } from "zod";
import { parseAiResponse } from "../lib/aiResponseValidation";
import { hasSameNumberOccurrences } from "../lib/evidenceGrounding";
import { groqChat, MODELS } from "../lib/groqChat";
import type { ScoreDimension } from "./cvScoring";
import { applyDeterministicGrammarCorrections } from "./cvScoring/objectiveScores";
import { fixableDimensionDetails } from "./cvImprovementRules";
import { BuilderFormData } from "./cvParseService";

export interface BuilderImprovementChange {
  section: string;
  what: string;
  why: string;
  before: string;
  after: string;
}

type EditableSection = "summary" | "experience" | "education" | "projects";

type ImprovementOutput = {
  professionalSummary: string;
  experienceDescriptions: string[];
  educationDescriptions: string[];
  projectDescriptions: string[];
};

const improvementSchema = (formData: BuilderFormData) => z.object({
  professionalSummary: z.string().max(3000),
  experienceDescriptions: z.array(z.string().max(8000)).length(formData.experience.length),
  educationDescriptions: z.array(z.string().max(4000)).length(formData.education.length),
  projectDescriptions: z.array(z.string().max(8000)).length(formData.projects.length),
}).strict();

const responseFormat = (formData: BuilderFormData) => ({
  type: "json_schema" as const,
  json_schema: {
    name: "builder_cv_improvements",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        professionalSummary: { type: "string", maxLength: 3000 },
        experienceDescriptions: {
          type: "array",
          minItems: formData.experience.length,
          maxItems: formData.experience.length,
          items: { type: "string", maxLength: 8000 },
        },
        educationDescriptions: {
          type: "array",
          minItems: formData.education.length,
          maxItems: formData.education.length,
          items: { type: "string", maxLength: 4000 },
        },
        projectDescriptions: {
          type: "array",
          minItems: formData.projects.length,
          maxItems: formData.projects.length,
          items: { type: "string", maxLength: 8000 },
        },
      },
      required: [
        "professionalSummary",
        "experienceDescriptions",
        "educationDescriptions",
        "projectDescriptions",
      ],
    },
  },
});

const safeRewrite = (original: string, proposed: string): string =>
  original.trim() && proposed.trim() && hasSameNumberOccurrences(original, proposed)
    ? proposed.trim()
    : original;

const DIMENSION_SECTIONS: Record<string, EditableSection[]> = {
  "Content Quality": ["summary", "experience", "projects"],
  "Keyword Match": ["summary", "experience", "projects"],
  "Grammar & Spelling": ["summary", "experience", "education", "projects"],
  "Impact & Results": ["experience", "projects"],
};

const quotedPhrases = (details: string[]): string[] =>
  details.flatMap((detail) => [...detail.matchAll(/["']([^"']{2,})["']/g)].map((match) => match[1].toLowerCase()));

const grammarSections = (
  formData: BuilderFormData,
  details: string[],
): EditableSection[] => {
  const phrases = quotedPhrases(details);
  const sectionText: Record<EditableSection, string> = {
    summary: formData.personalInfo.ProfessionalSummary,
    experience: formData.experience.map((entry) => entry.description).join("\n"),
    education: formData.education.map((entry) => entry.description).join("\n"),
    projects: formData.projects.map((entry) => entry.description).join("\n"),
  };
  return (Object.keys(sectionText) as EditableSection[]).filter((section) =>
    phrases.some((phrase) => sectionText[section].toLowerCase().includes(phrase)),
  );
};

const requestedSections = (
  formData: BuilderFormData,
  dimensions: ScoreDimension[],
): Set<EditableSection> => new Set(dimensions.flatMap((dimension) =>
  dimension.name === "Grammar & Spelling"
    ? grammarSections(formData, dimension.details)
    : DIMENSION_SECTIONS[dimension.name] ?? [],
));

const applyGrammarCorrections = (formData: BuilderFormData): BuilderFormData => ({
  ...formData,
  personalInfo: {
    ...formData.personalInfo,
    ProfessionalSummary: applyDeterministicGrammarCorrections(formData.personalInfo.ProfessionalSummary),
  },
  experience: formData.experience.map((entry) => ({
    ...entry,
    description: applyDeterministicGrammarCorrections(entry.description),
  })),
  education: formData.education.map((entry) => ({
    ...entry,
    description: applyDeterministicGrammarCorrections(entry.description),
  })),
  projects: formData.projects.map((entry) => ({
    ...entry,
    description: applyDeterministicGrammarCorrections(entry.description),
  })),
  skills: {
    ...formData.skills,
    certifications: formData.skills.certifications.map((certification) => ({
      ...certification,
      name: applyDeterministicGrammarCorrections(certification.name),
      issuer: applyDeterministicGrammarCorrections(certification.issuer),
      description: applyDeterministicGrammarCorrections(certification.description),
    })),
  },
});

const applySafeProse = (
  formData: BuilderFormData,
  proposal: ImprovementOutput,
  sections: Set<EditableSection>,
): BuilderFormData => ({
  ...formData,
  personalInfo: {
    ...formData.personalInfo,
    ProfessionalSummary: sections.has("summary")
      ? safeRewrite(formData.personalInfo.ProfessionalSummary, proposal.professionalSummary)
      : formData.personalInfo.ProfessionalSummary,
  },
  experience: formData.experience.map((entry, index) => ({
    ...entry,
    description: sections.has("experience")
      ? safeRewrite(entry.description, proposal.experienceDescriptions[index])
      : entry.description,
  })),
  education: formData.education.map((entry, index) => ({
    ...entry,
    description: sections.has("education")
      ? safeRewrite(entry.description, proposal.educationDescriptions[index])
      : entry.description,
  })),
  projects: formData.projects.map((entry, index) => ({
    ...entry,
    description: sections.has("projects")
      ? safeRewrite(entry.description, proposal.projectDescriptions[index])
      : entry.description,
  })),
});

type ProseField = [EditableSection, string, string, string];

const unsafeFieldNames = (
  formData: BuilderFormData,
  proposal: ImprovementOutput,
  sections: Set<EditableSection>,
): string[] => {
  const fields: ProseField[] = [
    ["summary", "Professional Summary", formData.personalInfo.ProfessionalSummary, proposal.professionalSummary],
    ...formData.experience.map((entry, index): ProseField => ["experience", `Experience ${index + 1}`, entry.description, proposal.experienceDescriptions[index]]),
    ...formData.education.map((entry, index): ProseField => ["education", `Education ${index + 1}`, entry.description, proposal.educationDescriptions[index]]),
    ...formData.projects.map((entry, index): ProseField => ["projects", `Project ${index + 1}`, entry.description, proposal.projectDescriptions[index]]),
  ];
  return fields.filter(([sectionKey, , original, proposed]) =>
    sections.has(sectionKey)
    && original.trim()
    && proposed.trim()
    && !hasSameNumberOccurrences(original, proposed),
  ).map(([, name]) => name);
};

const dimensionReason = (dimensions: ScoreDimension[], section: EditableSection): string =>
  dimensions.find((dimension) => DIMENSION_SECTIONS[dimension.name]?.includes(section))?.details[0]
  ?? "Improves clarity while preserving the candidate's existing facts.";

const changed = (original: string, improved: string): boolean =>
  original.trim() !== improved.trim();

const describeChanges = (
  original: BuilderFormData,
  improved: BuilderFormData,
  dimensions: ScoreDimension[],
): BuilderImprovementChange[] => {
  const changes: BuilderImprovementChange[] = [];
  if (changed(original.personalInfo.ProfessionalSummary, improved.personalInfo.ProfessionalSummary)) {
    changes.push({ section: "Professional Summary", what: "Reworded the existing summary.", why: dimensionReason(dimensions, "summary"), before: original.personalInfo.ProfessionalSummary, after: improved.personalInfo.ProfessionalSummary });
  }
  original.experience.forEach((entry, index) => {
    if (changed(entry.description, improved.experience[index].description)) {
      changes.push({ section: `Experience — ${entry.jobTitle || entry.company || index + 1}`, what: "Reworded the existing description.", why: dimensionReason(dimensions, "experience"), before: entry.description, after: improved.experience[index].description });
    }
  });
  original.education.forEach((entry, index) => {
    if (changed(entry.description, improved.education[index].description)) {
      changes.push({ section: `Education — ${entry.degree || entry.institution || index + 1}`, what: "Reworded the existing description.", why: dimensionReason(dimensions, "education"), before: entry.description, after: improved.education[index].description });
    }
  });
  original.projects.forEach((entry, index) => {
    if (changed(entry.description, improved.projects[index].description)) {
      changes.push({ section: `Project — ${entry.name || index + 1}`, what: "Reworded the existing description.", why: dimensionReason(dimensions, "projects"), before: entry.description, after: improved.projects[index].description });
    }
  });
  return changes;
};

const describeStructuredCorrections = (
  original: BuilderFormData,
  improved: BuilderFormData,
  grammarDimensions: ScoreDimension[],
): BuilderImprovementChange[] => {
  const changes: BuilderImprovementChange[] = [];
  const reason = grammarDimensions[0]?.details.join(" ") ?? "Corrects an exact spelling or spacing issue.";
  original.skills.certifications.forEach((certification, index) => {
    const corrected = improved.skills.certifications[index];
    if (certification.name !== corrected.name || certification.issuer !== corrected.issuer || certification.description !== corrected.description) {
      const before = [certification.name, certification.issuer, certification.description].filter(Boolean).join(" · ");
      const after = [corrected.name, corrected.issuer, corrected.description].filter(Boolean).join(" · ");
      changes.push({ section: `Certification — ${certification.name || index + 1}`, what: "Corrected an exact spelling issue.", why: reason, before, after });
    }
  });
  return changes;
};

const improvementMessages = (
  formData: BuilderFormData,
  dimensions: ScoreDimension[],
): { role: "system" | "user" | "assistant"; content: string }[] => [
  {
    role: "system",
    content: "You apply the supplied canonical CV score findings without performing a new analysis. Improve only existing professional-summary, experience, education, and project prose. Preserve every factual claim and keep every numeric occurrence in its original field exactly once. Never add, remove, duplicate, move, estimate, or alter numbers, percentages, dates, amounts, counts, versions, or metrics. Never invent facts, tools, skills, duties, outcomes, employers, titles, or credentials. Keep empty descriptions empty. Return strict JSON only.",
  },
  {
    role: "user",
    content: `Apply only the supplied score findings using facts already present in the same field. Keep output arrays aligned by index.\n\nCANONICAL_SCORE_FINDINGS:\n${JSON.stringify(dimensions)}\n\nSTRUCTURED_CV_UNTRUSTED_DATA:\n${JSON.stringify(formData)}`,
  },
];

const requestImprovement = async (
  formData: BuilderFormData,
  messages: ReturnType<typeof improvementMessages>,
): Promise<{ proposal: ImprovementOutput; raw: string }> => {
  const response = await groqChat({
    model: MODELS.versatile,
    messages,
    temperature: 0,
    max_tokens: 4000,
    response_format: responseFormat(formData),
  }, { fallback: false });
  const raw = response.choices[0]?.message?.content ?? "";
  return { proposal: parseAiResponse(raw, improvementSchema(formData)), raw };
};

export async function improveBuilderCV(
  formData: BuilderFormData,
  dimensions: ScoreDimension[],
): Promise<{ formData: BuilderFormData; changes: BuilderImprovementChange[] }> {
  const fixableDimensions = fixableDimensionDetails(dimensions);
  if (fixableDimensions.length === 0) return { formData, changes: [] };

  const grammarDimensions = fixableDimensions.filter((dimension) => dimension.name === "Grammar & Spelling");
  const correctedForm = grammarDimensions.length > 0 ? applyGrammarCorrections(formData) : formData;
  const deterministicChanges = [
    ...describeStructuredCorrections(formData, correctedForm, grammarDimensions),
    ...describeChanges(formData, correctedForm, grammarDimensions),
  ];
  const proseDimensions = fixableDimensions.filter((dimension) => dimension.name !== "Grammar & Spelling");
  const sections = requestedSections(correctedForm, proseDimensions);
  if (sections.size === 0) return { formData: correctedForm, changes: deterministicChanges };
  const messages = improvementMessages(correctedForm, proseDimensions);
  let generated = await requestImprovement(correctedForm, messages);
  const unsafeFields = unsafeFieldNames(correctedForm, generated.proposal, sections);

  if (unsafeFields.length > 0) {
    messages.push({ role: "assistant", content: generated.raw });
    messages.push({
      role: "user",
      content: `The following fields changed numeric facts: ${unsafeFields.join(", ")}. Rewrite those fields again while preserving every numeric occurrence exactly. Return the complete JSON response.`,
    });
    generated = await requestImprovement(correctedForm, messages);
  }

  const improved = applySafeProse(correctedForm, generated.proposal, sections);
  return {
    formData: improved,
    changes: [...deterministicChanges, ...describeChanges(correctedForm, improved, proseDimensions)],
  };
}
