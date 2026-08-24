import { groqChat, MODELS } from "../lib/groqChat";
import { ProjectOwnership, coerceProjectOwnership } from "./projectOwnership";

export interface SkillCategory {
  name: string;
  skills: string[];
}

export interface BuilderFormData {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phoneCode: string;
    phone: string;
    country: string;
    city: string;
    town: string;
    professionalTitle: string;
    ProfessionalSummary: string;
    linkedin: string;
    github: string;
    portfolio: string;
  };
  experience: {
    jobTitle: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  education: {
    institution: string;
    degree: string;
    location: string;
    startYear: string;
    endYear: string;
    description: string;
  }[];
  projects: {
    name: string;
    technologies: string;
    demoUrl: string;
    githubUrl: string;
    description: string;
    ownership: ProjectOwnership;
  }[];
  skills: {
    skillCategories?: SkillCategory[];
    skills?: string[];
    languages: string;
    certifications: CertificationItem[];
  };
}

export interface CertificationItem {
  name: string;
  issuer: string;
  date: string;
  url: string;
  description: string;
}

const EMPTY: BuilderFormData = {
  personalInfo: { firstName: "", lastName: "", email: "", phoneCode: "", phone: "", country: "", city: "", town: "", professionalTitle: "", ProfessionalSummary: "", linkedin: "", github: "", portfolio: "" },
  experience: [],
  education: [],
  projects: [],
  skills: { skillCategories: [], languages: "", certifications: [] },
};

export const coerceSkillCategories = (input: any): SkillCategory[] => {
  const s = (v: any) => (typeof v === "string" ? v.trim() : "");
  const arr = (v: any) => (Array.isArray(v) ? v : []);

  if (Array.isArray(input?.skillCategories)) {
    const categories = arr(input.skillCategories)
      .map((cat: any) => ({
        name: s(cat?.name),
        skills: arr(cat?.skills).map(s).filter(Boolean),
      }))
      .filter((cat) => cat.name || cat.skills.length > 0);
    if (categories.length > 0) return categories;
  }

  if (Array.isArray(input?.skills)) {
    const flat = arr(input.skills).map(s).filter(Boolean);
    if (flat.length > 0) {
      return [{ name: "Other Skills", skills: flat }];
    }
  }

  if (Array.isArray(input)) {
    return arr(input)
      .map((cat: any) => {
        if (typeof cat === "string") {
          const trimmed = cat.trim();
          return trimmed ? { name: "", skills: [trimmed] } : null;
        }
        return {
          name: s(cat?.name),
          skills: arr(cat?.skills).map(s).filter(Boolean),
        };
      })
      .filter((cat): cat is SkillCategory => cat !== null && (Boolean(cat.name) || cat.skills.length > 0));
  }

  return [];
};

// Older CVs stored certifications as one comma-separated string.
export const coerceCertifications = (input: any): CertificationItem[] => {
  const text = (v: any) => (typeof v === "string" ? v : "");
  if (typeof input === "string") {
    return input.split(",").map((name) => name.trim()).filter(Boolean)
      .map((name) => ({ name, issuer: "", date: "", url: "", description: "" }));
  }
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) =>
      typeof entry === "string"
        ? { name: entry.trim(), issuer: "", date: "", url: "", description: "" }
        : { name: text(entry?.name), issuer: text(entry?.issuer), date: text(entry?.date), url: text(entry?.url), description: text(entry?.description) },
    )
    .filter((cert) => cert.name);
};

// Map arbitrary parsed shape onto the exact builder schema — never trust the LLM to be exact.
export function coerceFormData(p: any): BuilderFormData {
  const s = (v: any) => (typeof v === "string" ? v : "");
  const arr = (v: any) => (Array.isArray(v) ? v : []);

  // Clean phone and extract dialing code if merged
  let rawPhone = s(p?.personalInfo?.phone);
  let cleanPhone = rawPhone.replace(/[^\d+]/g, ""); // Keep only digits and plus
  let phoneCode = s(p?.personalInfo?.phoneCode || p?.personalInfo?.phone_code);

  if (cleanPhone.startsWith("+")) {
    // Try to extract country code (e.g. +20155...)
    const match = cleanPhone.match(/^(\+\d{1,4})(.*)$/);
    if (match) {
      if (!phoneCode) {
        phoneCode = match[1];
      }
      cleanPhone = match[2];
    }
  }

  // Remove leading zeros or non-digits from local phone number if country code is present
  cleanPhone = cleanPhone.replace(/[^\d]/g, "");

  let country = s(p?.personalInfo?.country);
  let city = s(p?.personalInfo?.city);
  let town = s(p?.personalInfo?.town);

  // If city/country contains a comma or is combined, split them
  if (city.includes(",") && !country) {
    const parts = city.split(",");
    city = parts[0].trim();
    country = parts[parts.length - 1].trim();
  } else if (country.includes(",") && !city) {
    const parts = country.split(",");
    city = parts[0].trim();
    country = parts[parts.length - 1].trim();
  }

  return {
    personalInfo: {
      firstName: s(p?.personalInfo?.firstName),
      lastName: s(p?.personalInfo?.lastName),
      email: s(p?.personalInfo?.email),
      phoneCode: phoneCode,
      phone: cleanPhone,
      country: country,
      city: city,
      town: town,
      professionalTitle: s(p?.personalInfo?.professionalTitle || p?.personalInfo?.title),
      ProfessionalSummary: s(p?.personalInfo?.ProfessionalSummary || p?.personalInfo?.professionalSummary || p?.personalInfo?.summary || p?.personalInfo?.aboutMe || p?.personalInfo?.profile || p?.personalInfo?.bio),
      linkedin: s(p?.personalInfo?.linkedin || p?.personalInfo?.linkedIn),
      github: s(p?.personalInfo?.github || p?.personalInfo?.gitHub || p?.personalInfo?.gitlab || p?.personalInfo?.gitLab || p?.personalInfo?.githubUrl || p?.personalInfo?.gitlabUrl),
      portfolio: s(p?.personalInfo?.portfolio || p?.personalInfo?.website || p?.personalInfo?.personalSite || p?.personalInfo?.personalWebsite || p?.personalInfo?.site),
    },
    experience: arr(p?.experience).map((e: any) => ({
      jobTitle: s(e?.jobTitle),
      company: s(e?.company),
      location: s(e?.location),
      startDate: s(e?.startDate),
      endDate: s(e?.endDate),
      description: s(e?.description),
    })),
    education: arr(p?.education).map((e: any) => ({
      institution: s(e?.institution),
      degree: s(e?.degree),
      location: s(e?.location),
      startYear: s(e?.startYear),
      endYear: s(e?.endYear),
      description: s(e?.description),
    })),
    projects: arr(p?.projects).map((pr: any) => ({
      name: s(pr?.name),
      technologies: s(pr?.technologies),
      demoUrl: s(pr?.demoUrl),
      githubUrl: s(pr?.githubUrl),
      description: s(pr?.description),
      ownership: coerceProjectOwnership(pr?.ownership),
    })),
    skills: {
      skillCategories: coerceSkillCategories(p?.skills),
      skills: arr(p?.skills?.skills).map(s).filter(Boolean),
      languages: s(p?.skills?.languages),
      certifications: coerceCertifications(p?.skills?.certifications),
    },
  };
}

export async function parseCvToStructured(cvText: string): Promise<BuilderFormData> {
  const userPrompt = `Extract this CV into structured JSON. Use ONLY information actually present — leave a field "" (or [] ) if absent. Never invent data.

Return ONLY this exact JSON shape:
{
  "personalInfo": { "firstName": "", "lastName": "", "email": "", "phoneCode": "", "phone": "", "country": "", "city": "", "town": "", "professionalTitle": "", "ProfessionalSummary": "", "linkedin": "", "github": "", "portfolio": "" },
  "experience": [ { "jobTitle": "", "company": "", "location": "", "startDate": "", "endDate": "", "description": "" } ],
  "education": [ { "institution": "", "degree": "", "location": "", "startYear": "", "endYear": "", "description": "" } ],
  "projects": [ { "name": "", "technologies": "", "demoUrl": "", "githubUrl": "", "description": "" } ],
  "skills": { "skillCategories": [ { "name": "", "skills": [] } ], "languages": "", "certifications": [ { "name": "", "issuer": "", "date": "", "url": "" } ] }
}

CRITICAL RULES:
1. SEMANTIC SECTION MAPPING (CLOSENESS OF NAME):
   Identify sections in the CV based on closeness of meaning/semantic intent to the schema fields, rather than requiring exact matches. For example:
   - "Work History", "Experience", "Professional Experience", "Employment History", "Roles", "Employment", "Career History" -> Map to "experience".
   - "Education", "Academic Background", "Studies", "University", "Degree" -> Map to "education".
   - "About Me", "Profile", "Summary", "Professional Profile", "Executive Summary", "Bio" -> Map to "ProfessionalSummary" under "personalInfo".
   - "Skills", "Core Competencies", "Technologies", "Expertise", "Technical Skills" -> Group into "skillCategories" under the "skills" object with relevant category names (e.g. "Languages", "Frameworks & Libraries", "Databases", "Tools & Platforms", "Soft Skills") and skills string arrays.
   - "Projects", "Personal Projects", "Academic Projects", "Open Source" -> Map to "projects".
   - "Languages" -> Map to "languages" under the "skills" object.
   - "Certifications", "Courses" -> Map to "certifications" under the "skills" object. One array entry per certification: "name" is the credential, "issuer" the awarding body, "date" when it was earned, "url" the verification link. Leave any part "" if the CV does not state it. Return [] if there are none.

2. PHONE NUMBER & COUNTRY DIALING CODE:
   - Extract any phone number and its country dial code (e.g. "+20").
   - Set "phoneCode" to the dialing code (e.g., "+20", "+1").
   - Set "phone" to the rest of the digits representing the local phone number.
   - You MUST ignore all spaces, dashes, or formatting characters within the number. For example, if it's "+20 155 273 456", phoneCode must be "+20" and phone must be "155273456". If it's "01255458932", phoneCode is "" and phone is "01255458932".

3. LOCATION, CITY & COUNTRY:
   - Parse combined locations (e.g. "Cairo, Egypt", "London, United Kingdom") and separate them.
   - Place the city name (e.g. "Cairo") in "city".
   - Place the country name (e.g. "Egypt") in "country".
   - Never put the combined value (like "Cairo, Egypt") into both fields.

4. SOCIALS & PORTFOLIO URLS:
   - Extract the user's LinkedIn profile URL (e.g., "linkedin.com/in/username" or "https://www.linkedin.com/in/username") if present in the CV, and place it in the "linkedin" field.
   - Extract the user's GitHub, GitLab, or bitbucket profile URL (e.g., "github.com/username" or "gitlab.com/username") if present in the CV, and place it in the "github" field.
   - Extract any personal website, portfolio, blog, or general links (excluding linkedin, github, gitlab, bitbucket) and place them in the "portfolio" field.

5. FULL EXTRACTION:
   - Extract EVERY SINGLE experience entry from the CV. Do NOT skip, merge, or summarize any job/role. If the CV lists 5 jobs, the output must have exactly 5 entries in the experience array.
   - Extract EVERY SINGLE education entry. Do NOT skip any.
   - Extract EVERY SINGLE project entry. Do NOT skip any.
   - Extract projects into the "projects" list instead of folding them into experience.
   - description = ALL the bullet points/details for that entry joined with newlines. Keep them FULLY INTACT — do NOT shorten, summarize, or omit any bullet point. Copy them verbatim.
   - The CV may span multiple pages. Extract ALL content from ALL pages.

CV:
---
${cvText}
---`;

  const response = await groqChat({
    model: MODELS.versatile,
    messages: [
      { role: "system", content: "You extract CVs into structured JSON. Output valid JSON only. Never fabricate." },
      { role: "user", content: userPrompt },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  }, { fallback: false });

  try {
    return coerceFormData(JSON.parse(response.choices[0].message?.content || "{}"));
  } catch {
    return EMPTY;
  }
}
