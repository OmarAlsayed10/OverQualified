import { Document, Packer, Paragraph, TextRun } from "docx";
import { coerceCertifications } from "./cvParseService";

// Replace ICV mongoose interface with a plain type
type CV = {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    professionalTitle: string;
    ProfessionalSummary: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  experience: {
    jobTitle: string;
    company: string;
    location: string;
    startDate: string | Date;
    endDate: string | Date;
    description: string;
  }[];
  education: {
    institution: string;
    degree: string;
    location: string;
    startYear: string | Date;
    endYear: string | Date;
    description: string;
  }[];
  skills: {
    skillCategories?: Array<{ name: string; skills: string[] }>;
    skills?: string[];
    languages?: string | string[];
    certifications?: unknown;
  };
};

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString("default", { month: "short", year: "numeric" });
}

export async function exportWordCV(CV: CV): Promise<Buffer> {
  const categories = (CV.skills?.skillCategories || []).filter(
    (cat) => cat.name?.trim() || (cat.skills && cat.skills.length > 0),
  );
  const legacySkills = CV.skills?.skills || [];
  const skillParagraphs = categories.length > 0
    ? categories.map((cat) => {
        const skillsText = Array.isArray(cat.skills) ? cat.skills.join(", ") : String(cat.skills || "");
        const runs: TextRun[] = [];
        if (cat.name?.trim()) {
          runs.push(new TextRun({ text: `${cat.name.trim()}: `, bold: true }));
        }
        runs.push(new TextRun(skillsText));
        return new Paragraph({
          children: runs,
          spacing: { after: 100 },
        });
      })
    : [
        new Paragraph({
          children: [new TextRun(legacySkills.join(", ") || "No skills listed")],
          spacing: { after: 200 },
        }),
      ];

  const languagesText = Array.isArray(CV.skills?.languages)
    ? CV.skills.languages.join(", ")
    : CV.skills?.languages || "No languages listed";
  const certificationsText =
    coerceCertifications(CV.skills?.certifications)
      .map((cert) => [cert.name, cert.issuer, cert.date].filter(Boolean).join(" · "))
      .join("; ") || "No certifications listed";

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "Personal Information", bold: true, size: 28 }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun(`Name: ${CV.personalInfo.firstName} ${CV.personalInfo.lastName}`),
              new TextRun({ break: 1 }),
              new TextRun(`Email: ${CV.personalInfo.email}`),
              new TextRun({ break: 1 }),
              new TextRun(`Phone: ${CV.personalInfo.phone}`),
              new TextRun({ break: 1 }),
              new TextRun(`Location: ${CV.personalInfo.location}`),
              new TextRun({ break: 1 }),
              new TextRun(`Professional Title: ${CV.personalInfo.professionalTitle}`),
              ...(CV.personalInfo.linkedin ? [new TextRun({ break: 1 }), new TextRun(`LinkedIn: ${CV.personalInfo.linkedin}`)] : []),
              ...(CV.personalInfo.github ? [new TextRun({ break: 1 }), new TextRun(`GitHub: ${CV.personalInfo.github}`)] : []),
              ...(CV.personalInfo.portfolio ? [new TextRun({ break: 1 }), new TextRun(`Portfolio: ${CV.personalInfo.portfolio}`)] : []),
              new TextRun({ break: 1 }),
              new TextRun(`Summary: ${CV.personalInfo.ProfessionalSummary}`),
            ],
            spacing: { after: 400 },
          }),

          new Paragraph({
            children: [new TextRun({ text: "Experience", bold: true, size: 28 })],
            spacing: { after: 200 },
          }),
          ...CV.experience.map((exp) =>
            new Paragraph({
              children: [
                new TextRun({ text: `${exp.jobTitle} at ${exp.company}`, bold: true }),
                new TextRun({ break: 1 }),
                new TextRun(`Location: ${exp.location}`),
                new TextRun({ break: 1 }),
                new TextRun(`From ${formatDate(exp.startDate)} to ${formatDate(exp.endDate)}`),
                new TextRun({ break: 1 }),
                new TextRun(`Description: ${exp.description}`),
              ],
              spacing: { after: 300 },
            })
          ),

          new Paragraph({
            children: [new TextRun({ text: "Education", bold: true, size: 28 })],
            spacing: { after: 200 },
          }),
          ...CV.education.map((edu) =>
            new Paragraph({
              children: [
                new TextRun({ text: edu.institution, bold: true }),
                new TextRun({ break: 1 }),
                new TextRun(`Degree: ${edu.degree}`),
                new TextRun({ break: 1 }),
                new TextRun(`Location: ${edu.location}`),
                new TextRun({ break: 1 }),
                new TextRun(`From ${formatDate(edu.startYear)} to ${formatDate(edu.endYear)}`),
                new TextRun({ break: 1 }),
                new TextRun(`Description: ${edu.description}`),
              ],
              spacing: { after: 300 },
            })
          ),

          new Paragraph({
            children: [new TextRun({ text: "Skills", bold: true, size: 28 })],
            spacing: { after: 200 },
          }),
          ...skillParagraphs,

          new Paragraph({
            children: [new TextRun({ text: "Languages", bold: true, size: 28 })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun(languagesText)],
            spacing: { after: 400 },
          }),

          new Paragraph({
            children: [new TextRun({ text: "Certifications", bold: true, size: 28 })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun(certificationsText)],
            spacing: { after: 400 },
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

export default exportWordCV;