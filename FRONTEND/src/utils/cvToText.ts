import { bulletLines } from "../templates/bulletLines.ts";

interface RawCv {
  personalInfo?: Record<string, unknown>;
  experience?: Record<string, unknown>[];
  education?: Record<string, unknown>[];
  projects?: Record<string, unknown>[];
  customSections?: Record<string, unknown>[];
  sectionOrder?: string[];
  skills?: {
    skills?: string[];
    languages?: string | string[];
    certifications?: unknown;
  };
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const line = (...parts: unknown[]) => parts.map(text).filter(Boolean).join(" | ").trim();
const dateRange = (from: unknown, to: unknown) => [text(from), text(to)].filter(Boolean).join(" - ");

// The analyser reads a saved CV through this and an uploaded CV through PDF text extraction.
// They used to disagree: this wrote "Skills: a, b, c" on one line, which is not a heading, so
// the skills section was invisible to the parser and the same CV scored lower when picked from
// the profile than when uploaded. Everything here mirrors the exported layout — an uppercase
// heading on its own line, then the content, then a blank line.
const section = (heading: string, body: string): string =>
  body.trim() ? `${heading}\n${body.trim()}` : "";

const bullets = (description: unknown): string =>
  bulletLines(text(description))
    .map((bullet) => `• ${bullet}`)
    .join("\n");

const entry = (header: string, description: unknown): string => {
  const body = bullets(description);
  return [header, body].filter(Boolean).join("\n");
};

const certificationsText = (input: unknown): string => {
  if (typeof input === "string") {
    return input
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .join("\n");
  }
  if (!Array.isArray(input)) return "";
  return input
    .map((cert) => {
      if (typeof cert === "string") return cert;
      if (!cert || typeof cert !== "object") return "";
      const item = cert as Record<string, unknown>;
      const detail = [text(item.issuer), text(item.date)].filter(Boolean).join(", ");
      const header = detail ? `${text(item.name)} — ${detail}` : text(item.name);
      return entry(header, item.description);
    })
    .filter(Boolean)
    .join("\n");
};

export const cvToText = (cv: RawCv): string => {
  const personal = cv.personalInfo ?? {};
  const blocks: string[] = [];

  blocks.push([text(personal.firstName), text(personal.lastName)].filter(Boolean).join(" "));
  blocks.push(text(personal.professionalTitle));
  blocks.push(line(personal.email, personal.phone, [text(personal.city), text(personal.country)].filter(Boolean).join(", ")));

  const experience = (cv.experience ?? [])
    .map((item) =>
      entry(
        line(item.jobTitle, item.company, item.location, dateRange(item.startDate, item.endDate)),
        item.description,
      ),
    )
    .filter((item) => item.trim());

  const projects = (cv.projects ?? [])
    .map((item) => entry(line(item.name, item.technologies), item.description))
    .filter((item) => item.trim());

  const education = (cv.education ?? [])
    .map((item) =>
      entry(
        line(item.degree, item.institution, item.location, dateRange(item.startYear, item.endYear)),
        item.description,
      ),
    )
    .filter((item) => item.trim());

  const skills = cv.skills ?? {};
  const languages = Array.isArray(skills.languages) ? skills.languages.join(", ") : text(skills.languages);

  const formattedSkillCategories = Array.isArray(skills.skillCategories)
    ? skills.skillCategories
        .map((cat: any) => {
          const catName = text(cat?.name).trim();
          const catSkills = Array.isArray(cat?.skills)
            ? cat.skills.map(text).filter(Boolean)
            : typeof cat?.skills === "string"
              ? [cat.skills.trim()]
              : [];
          if (catSkills.length === 0) return "";
          return catName ? `${catName}: ${catSkills.join(", ")}` : catSkills.join(", ");
        })
        .filter(Boolean)
        .join("\n")
    : "";

  const skillsContent = formattedSkillCategories || (Array.isArray(skills.skills) ? skills.skills.join(", ") : text(skills.skills));

  const sections: Record<string, string> = {
    personal: section("PROFESSIONAL SUMMARY", text(personal.ProfessionalSummary)),
    experience: section("WORK EXPERIENCE", experience.join("\n\n")),
    projects: section("PROJECTS", projects.join("\n\n")),
    education: section("EDUCATION", education.join("\n\n")),
    skills: section("SKILLS", skillsContent),
    languages: section("LANGUAGES", languages),
    certifications: section("CERTIFICATIONS", certificationsText(skills.certifications)),
  };

  for (const custom of cv.customSections ?? []) {
    const items = (Array.isArray(custom.items) ? custom.items : [])
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => entry(line(item.title, item.subtitle, item.date), item.description))
      .filter((item) => item.trim());
    sections[`custom:${text(custom.id)}`] = section(text(custom.title).toUpperCase(), items.join("\n\n"));
  }

  // Emitted in the CV's own order, because that is the order the exported PDF prints in.
  // Section order is itself scored, so a different order here would score a different CV.
  const order = (cv.sectionOrder ?? []).filter((key) => key in sections);
  const ordered = order.length ? order : Object.keys(sections);
  for (const key of [...ordered, ...Object.keys(sections).filter((key) => !ordered.includes(key))]) {
    blocks.push(sections[key]);
  }

  return blocks.filter(Boolean).join("\n\n").trim();
};
