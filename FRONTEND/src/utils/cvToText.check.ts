import assert from "node:assert/strict";
import { cvToText } from "./cvToText.ts";

const base = {
  personalInfo: {
    firstName: "Omar", lastName: "Alsayed", professionalTitle: "Full Stack Developer",
    email: "omar@example.com", phone: "+20 100", city: "Cairo", country: "Egypt",
    ProfessionalSummary: "Engineer with six years building web products.",
  },
  experience: [{
    jobTitle: "Engineer", company: "Acme", location: "Cairo", startDate: "2020", endDate: "2024",
    description: "- Built the billing service. - Cut load time 40%.",
  }],
  projects: [{ name: "OverQualified", technologies: "React", description: "CV builder" }],
  education: [{ degree: "BSc", institution: "Cairo University", startYear: "2016", endYear: "2020" }],
};

const full = cvToText({
  ...base,
  skills: {
    skills: ["React", "Node", "TypeScript"],
    languages: "English",
    certifications: [{ name: "AWS SAA", issuer: "Amazon", date: "2024", url: "", description: "Covered VPC design." }],
  },
  customSections: [{ id: "c1", title: "Courses", items: [{ title: "OSHA 30", subtitle: "OSHA", date: "2023", description: "Covered permits." }] }],
});

assert.ok(!full.includes("[object Object]"));

// The regression this file exists for: an uploaded CV and the same CV picked from the profile
// have to parse the same way. The scorer only recognises a section when its heading is alone
// on a line, so "Skills: React, Node" scored far lower than the identical uploaded PDF.
for (const heading of ["PROFESSIONAL SUMMARY", "WORK EXPERIENCE", "PROJECTS", "EDUCATION", "SKILLS", "LANGUAGES", "CERTIFICATIONS", "COURSES"]) {
  assert.ok(full.split("\n").includes(heading), `heading "${heading}" must be alone on its line`);
}

// Bullets are split one per line, so bullet counting and quantification match the PDF path.
const lines = full.split("\n");
assert.ok(lines.includes("• Built the billing service."));
assert.ok(lines.includes("• Cut load time 40%."));

assert.ok(full.includes("React, Node, TypeScript"));
assert.ok(full.includes("AWS SAA — Amazon, 2024"));
assert.ok(full.includes("• Covered VPC design."));
assert.ok(full.includes("OSHA 30 | OSHA | 2023"));

// Legacy and mixed certification shapes still render.
const legacy = cvToText({ ...base, skills: { skills: [], certifications: "Scrum Master, PMP" } });
assert.ok(legacy.split("\n").includes("Scrum Master"));
assert.ok(legacy.split("\n").includes("PMP"));
const mixed = cvToText({ ...base, skills: { skills: [], certifications: ["PMP", { name: "AWS SAA" }] } });
assert.ok(mixed.includes("PMP"));
assert.ok(mixed.includes("AWS SAA"));

// An empty section never emits a bare heading.
const sparse = cvToText({ personalInfo: { firstName: "A" } });
assert.ok(!sparse.includes("SKILLS"));
assert.ok(!sparse.includes("WORK EXPERIENCE"));

const categorized = cvToText({
  ...base,
  skills: {
    skillCategories: [
      { name: "Languages", skills: ["JavaScript", "TypeScript", "Java"] },
      { name: "Databases", skills: ["SQL", "MongoDB"] },
    ],
    languages: "English",
  },
});
assert.ok(categorized.includes("Languages: JavaScript, TypeScript, Java"));
assert.ok(categorized.includes("Databases: SQL, MongoDB"));

console.log("cvToText ok");
