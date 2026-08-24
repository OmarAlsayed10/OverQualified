import { groqChat, MODELS } from "../lib/groqChat";
import { BuilderFormData, SkillCategory, coerceSkillCategories } from "./cvParseService";
import { buildCvContext } from "../lib/cvContextBuilder";

// The CV keeps whatever language it is already written in, regardless of the language
// the user types their instructions in.
export const cvOutputLanguage = (existingCvText: string): "Arabic" | "English" => {
  const arabic = (existingCvText.match(/[؀-ۿ]/g) || []).length;
  const latin = (existingCvText.match(/[A-Za-z]/g) || []).length;
  return arabic > latin ? "Arabic" : "English";
};

// Turn a user's rough notes for ONE item into polished CV content — no fabrication.
export async function polishEntry(
  sectionName: string,
  raw: string,
  jobTitle = "",
  formData?: BuilderFormData
): Promise<string> {
  const guide: Record<string, string> = {
    experience: "2-4 concise achievement bullets using the Google XYZ formula (action verb + what + measurable result). One bullet per line, start each with '- '.",
    education: "a short, clean description line (relevant coursework, honors, or focus).",
    skills: "a comma-separated list of specific, relevant skills.",
    summary: "a 2-3 sentence professional summary naming the role, key strengths, and value. NEVER open with cliché phrases like 'Results-Driven', 'Highly motivated', 'Dynamic professional', 'Seasoned', or 'Detail-oriented'. Instead, lead with the candidate's actual role title or a concrete strength.",
  };
  const rule = guide[sectionName.toLowerCase()] || "polished, professional CV wording.";
  const cvContext = formData ? buildCvContext(formData, { compact: true }) : "";

  const response = await groqChat({
    model: MODELS.versatile,
    messages: [
      { role: "system", content: `You turn a candidate's rough notes into polished, professional CV text. Use ONLY the facts they give — never invent metrics, employers, dates, or achievements. Return only the text, no preamble.\n\nLANGUAGE:\nWrite the output in ${cvOutputLanguage(cvContext)}. This is fixed. The notes may be written in Arabic, English, or a mix — never mirror the language of the notes, and never switch languages because the notes were phrased in another one.\n\nCRITICAL — CREATIVE ENHANCEMENT:\nDo NOT just split or reformat the user's exact words into separate bullets. You MUST creatively rewrite and enhance the content into polished, impactful professional language:\n- Start each bullet with a unique, strong action verb. NEVER repeat the same verb across bullets.\n- Transform plain statements into achievement-oriented bullets: 'Accomplished [X] by doing [Y], resulting in [Z]' — but ONLY when the user actually stated the result. Otherwise write the action alone.\n- Preserve the user's facts and metrics but elevate the language to sound professional and impactful\n- Use industry-standard terminology and keywords naturally\n\nHARD LIMIT — ENHANCE WORDING, NEVER ADD FACTS:\nEnhancement means better wording for what the user said. It never means new information.\n- Never invent outcomes, results, metrics, scope, tools, or responsibilities the user did not state.\n- Write no more bullets than the user's facts support. Never pad to reach a target count.\n- A certification, course, or credential is a completed qualification, not a job duty. Never expand it into responsibilities performed or results achieved.\n- If the note is too thin to enhance, return it cleanly worded and stop.\n- NEVER open a summary with cliché phrases like 'Results-Driven', 'Highly motivated', 'Dynamic professional', 'Seasoned', 'Detail-oriented', 'Passionate', or 'Expert'. Lead with the candidate's actual role title or a concrete strength instead.\n\nALWAYS follow ATS (Applicant Tracking System) rules:\n- Quantify achievements with metrics where the user provides data\n- Use industry keywords naturally\n- Avoid personal pronouns (I, me, my)\n- Use simple bullet format (start each with '- ') for experience/project descriptions\n- Keep content concise and scannable${cvContext ? `\n\nCANDIDATE'S FULL CV CONTEXT:\n${cvContext}\n\nUse this context to ensure your polished text complements the rest of their CV. Avoid repeating action verbs or achievements that already exist in their other entries.` : ""}` },
      { role: "user", content: `Section: ${sectionName}${jobTitle ? ` (target role: ${jobTitle})` : ""}\nRough notes: ${raw}\n\nWrite ${rule}` },
    ],
    temperature: 0.4,
    max_tokens: 400,
  });

  return (response.choices[0].message?.content || "").trim();
}

export const generateAIContent = async (
  jobTitle: string,
  sectionName: string,
  industry: string,
  experience: string,
  formData?: BuilderFormData
): Promise<string> => {
  const cvContext = formData ? buildCvContext(formData, { excludeSection: sectionName }) : "";
  
  const response = await groqChat({
    model: MODELS.fast,
    messages: [
      {
        role: "system",
        content: `You write CV content. Output ONLY the finished text for the requested section — no preamble, no labels, no headings, no quotes, no explanation. Never start with phrases like 'Here's' or 'Sure'. Do not repeat the section name.\n\nALWAYS follow ATS best practices: use strong action verbs, quantify achievements, use industry keywords naturally, avoid pronouns (I, me, my), use simple bullet format ('- ') for descriptions.\n\n${cvContext ? `CANDIDATE'S EXISTING CV CONTEXT:\n${cvContext}\n\nYou must generate the ${sectionName} to perfectly fit this specific candidate. Synthesize their actual skills, experience, and background into the generated text. Do not invent fake metrics or employers, but do create highly relevant, professional content that builds upon what they actually know and have done.` : "Generate high-quality professional content for this role."}`,
      },
      {
        role: "user",
        content: `Write a ${sectionName} for a ${jobTitle} in the ${industry} industry at ${experience}. Return only the content itself.`,
      },
    ],
    max_tokens: 250,
    temperature: 0.5,
    top_p: 1,
    frequency_penalty: 0.3,
    presence_penalty: 0.1,
  });

  return (response.choices[0].message?.content || "")
    .trim()
    .replace(/\*\*/g, "")
    .replace(/^\s*(sure|here'?s|here is|below is)\b[^:]*:?\s*/i, "")
    .replace(new RegExp(`^\\s*${sectionName}\\s*:?\\s*`, "i"), "")
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ")
    .trim();
};

const wordCount = (text: unknown): number =>
  typeof text === "string" ? text.trim().split(/\s+/).filter(Boolean).length : 0;

// Total words in the fields the optimizer is allowed to touch — the CV's variable mass.
function proseWordCount(formData: any): number {
  const entries = [
    ...(Array.isArray(formData?.experience) ? formData.experience : []),
    ...(Array.isArray(formData?.education) ? formData.education : []),
    ...(Array.isArray(formData?.projects) ? formData.projects : []),
  ];
  return (
    wordCount(formData?.personalInfo?.ProfessionalSummary) +
    entries.reduce((sum: number, entry: any) => sum + wordCount(entry?.description), 0)
  );
}

export async function optimizeCvLength(formData: any, currentPages = 2): Promise<any> {
  const expCount = Array.isArray(formData?.experience) ? formData.experience.length : 0;
  const eduCount = Array.isArray(formData?.education) ? formData.education.length : 0;
  const projCount = Array.isArray(formData?.projects) ? formData.projects.length : 0;

  const currentWords = proseWordCount(formData);
  const pages = Math.max(2, Math.min(6, Math.round(currentPages)));
  // Entry headers, dates and skills don't shrink, so the prose has to absorb the whole overflow.
  const targetWords = Math.max(150, Math.round(currentWords / pages));
  const maxBullets = pages >= 3 ? 2 : 3;

  const systemPrompt = `You are a professional CV writing assistant. Your job is to CUT a ${pages}-page CV down to ONE page by compressing its prose. Cutting hard is the whole point — a rewrite that is nearly as long as the original is a failure.

LENGTH TARGET — THIS IS THE PRIMARY REQUIREMENT:
- The descriptions and the professional summary currently total about ${currentWords} words.
- Your output MUST total about ${targetWords} words across those same fields. Going over is a failure.
- Keep at most ${maxBullets} bullets per experience or project entry. Merge related bullets into one stronger bullet rather than deleting an achievement outright.
- Cut filler, repeated tooling names, restated job duties, and any phrase that does not add a fact. Prefer "Cut API latency 45% with Redis caching" over "Was responsible for working on improving the performance of the API by implementing a caching layer using Redis".

ABSOLUTE RULES — VIOLATION IS UNACCEPTABLE:
1. NEVER remove any experience, education, or project entry. The input has ${expCount} experience entries, ${eduCount} education entries, and ${projCount} project entries. The output MUST have the EXACT SAME number of entries in each array.
2. NEVER remove or change any jobTitle, company, institution, degree, dates, location, or project name.
3. ONLY shorten the "description" and "ProfessionalSummary" text fields.
4. KEEP every number, percentage, and metric the candidate already wrote, and keep the strongest achievement of every entry. Never invent a number.
5. Return a JSON object matching the exact input structure (personalInfo, experience, education, projects, skills).
6. Do NOT remove any skills, languages, or certifications.
7. CROSS-SECTION CONSOLIDATION: content repeated across experience and project descriptions should survive in ONE place only. If a skill is already evident from the descriptions, drop it from the summary.`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Compress this CV to about ${targetWords} words of description/summary text. Do NOT remove any entries:\n\n${JSON.stringify(formData)}`,
    },
  ];

  let content = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await groqChat({
      model: MODELS.versatile,
      response_format: { type: "json_object" },
      messages,
      temperature: 0.3,
    }, { fallback: false });

    content = response.choices[0].message?.content || "";
    let attemptWords = 0;
    try {
      attemptWords = proseWordCount(JSON.parse(content));
    } catch {
      break;
    }
    if (attemptWords <= targetWords * 1.25) break;

    console.warn(`optimizeCvLength: rewrite still ${attemptWords} words (target ${targetWords}) — retrying`);
    messages.push({ role: "assistant", content });
    messages.push({
      role: "user",
      content: `Too long. Your rewrite is ${attemptWords} words but the target is ${targetWords}. Cut roughly ${Math.round((1 - targetWords / attemptWords) * 100)}% more by merging bullets and deleting filler. Keep every entry, every metric, and the strongest achievement of each entry. Return the same JSON structure.`,
    });
  }

  try {
    const parsed = JSON.parse(content);

    const parsedExpCount = Array.isArray(parsed?.experience) ? parsed.experience.length : 0;
    const parsedEduCount = Array.isArray(parsed?.education) ? parsed.education.length : 0;
    const parsedProjCount = Array.isArray(parsed?.projects) ? parsed.projects.length : 0;

    if (parsedExpCount < expCount || parsedEduCount < eduCount || parsedProjCount < projCount) {
      console.warn(`optimizeCvLength: LLM dropped entries (exp: ${expCount}->${parsedExpCount}, edu: ${eduCount}->${parsedEduCount}, proj: ${projCount}->${parsedProjCount}). Merging descriptions only.`);

      const result = JSON.parse(JSON.stringify(formData));
      if (parsed?.personalInfo?.ProfessionalSummary) {
        result.personalInfo.ProfessionalSummary = parsed.personalInfo.ProfessionalSummary;
      }
      const mergeDescriptions = (target: any[], source: any[]) => {
        for (let i = 0; i < Math.min(target.length, source.length); i++) {
          if (source[i]?.description) target[i].description = source[i].description;
        }
      };
      mergeDescriptions(result.experience || [], parsed.experience || []);
      mergeDescriptions(result.education || [], parsed.education || []);
      mergeDescriptions(result.projects || [], parsed.projects || []);
      return result;
    }

    return parsed;
  } catch (e) {
    console.error("Failed to parse JSON response from Groq:", content);
    throw new Error("Failed to parse optimized CV JSON");
  }
}

export async function editFieldWithAI(
  sectionName: string,
  userPrompt: string,
  currentContent: string,
  context: { jobTitle?: string; company?: string; projectName?: string; technologies?: string; institution?: string; degree?: string },
  formData?: BuilderFormData
): Promise<string> {
  const contextParts: string[] = [];
  if (context.jobTitle) contextParts.push(`Role: ${context.jobTitle}`);
  if (context.company) contextParts.push(`Company: ${context.company}`);
  if (context.projectName) contextParts.push(`Project: ${context.projectName}`);
  if (context.technologies) contextParts.push(`Technologies: ${context.technologies}`);
  if (context.institution) contextParts.push(`Institution: ${context.institution}`);
  if (context.degree) contextParts.push(`Degree: ${context.degree}`);
  const contextStr = contextParts.length > 0 ? `\nField Context: ${contextParts.join(', ')}` : '';
  const existingContent = currentContent?.trim() ? `\nExisting content:\n${currentContent}` : '';
  const cvContext = formData ? buildCvContext(formData, { excludeSection: sectionName }) : '';

  const response = await groqChat({
    model: MODELS.versatile,
    messages: [
      {
        role: "system",
        content: `You are a professional CV writing assistant. You edit and generate CV content based on the user's instructions. Return ONLY the finished text — no preamble, no labels, no quotes, no explanation. NEVER ask follow-up questions — just return the content.

LANGUAGE:
Write the output in ${cvOutputLanguage(`${currentContent} ${cvContext}`)}. This is fixed. The user's instructions may be written in Arabic, English, or a mix — never mirror the language of the instructions, and never switch languages because the request was phrased in another one.

CRITICAL — CREATIVE ENHANCEMENT:
When the user provides rough notes, descriptions, or bullet points, you MUST creatively enhance and rewrite them into polished, impactful, ATS-optimized professional content. DO NOT just split or reformat the user's exact words. Instead:
- Choose precise opening verbs that describe the candidate's actual work and do not repeat an opening already used in the supplied CV context.
- Never use generic openings such as "Spearheaded", "Leveraged", "Utilized", "Orchestrated", or "Revolutionized". Prefer concrete verbs supported by the content, such as built, configured, diagnosed, migrated, tested, documented, reduced, or designed.
- Start each bullet with a strong action verb — but NEVER repeat the same verb across bullets. Draw from a wide vocabulary.
- Transform plain statements into achievement-oriented bullets: "Accomplished [X] by doing [Y], resulting in [Z]" — but ONLY when the user actually stated the result. Otherwise write the action alone.
- Preserve the user's facts and metrics but elevate the language to sound professional, impactful, and polished
- Use industry-standard terminology and keywords naturally
- NEVER open a summary with cliché phrases like 'Results-Driven', 'Highly motivated', 'Dynamic professional', 'Seasoned', or 'Detail-oriented'. Lead with the candidate's actual role title or a concrete strength instead.

HARD LIMIT — ENHANCE WORDING, NEVER ADD FACTS:
Enhancement means better wording for what the user said. It never means new information.
- Never invent outcomes, results, metrics, percentages, scope, team sizes, tools, or responsibilities the user did not state.
- Write no more bullets than the user's facts support. Two facts means two bullets. Never pad to reach a target count.
- A certification, course, credential, or training is a completed qualification, not a job duty. State that it was earned and what it covers. Never expand it into responsibilities performed, protocols implemented, or results achieved.
- If the user's note is too thin to enhance, return it cleanly worded and stop. A short accurate entry beats a padded invented one.

When there is EXISTING content, use it as a base to enhance — keep the professional structure and style but incorporate the user's new information and improve the wording. Do not throw away well-written existing content.

ATS (Applicant Tracking System) rules:
- Quantify achievements with metrics the user supplied — never estimate or invent a number
- Use industry-standard keywords naturally — never keyword-stuff
- Avoid personal pronouns (I, me, my, we)
- No graphics, icons, tables, or special characters
- Use simple bullet formatting (start each bullet with '- ') for experience and project descriptions
- Keep descriptions concise: max 3-4 bullets per entry
- Professional Summary: 2-3 sentences, name the role, key strengths, and value proposition
- Skills: comma-separated list of specific, relevant skills
- Certifications and Languages: a single comma-separated line, no bullets. Name each certification as the user gave it, with the issuing body when they stated it. Never add certifications they did not mention.
- Never fabricate information — only rephrase, enhance, or generate based on what the user provides
${cvContext ? `\nCANDIDATE'S FULL CV CONTEXT:\n${cvContext}\n\nYou have the candidate's full CV context. Use it to: avoid repeating action verbs or achievements already used in other entries, reference relevant skills/projects/education when writing experience bullets, and ensure tone and style consistency across sections. Check other entries to ensure no verb duplication and complementary achievement framing.` : ""}`
      },
      {
        role: "user",
        content: `Section: ${sectionName}${contextStr}${existingContent}\n\nUser request: ${userPrompt}`
      }
    ],
    temperature: 0.65,
    max_tokens: 500,
  });

  return (response.choices[0].message?.content || "").trim();
}

export async function generateSmartSkills(formData: BuilderFormData): Promise<SkillCategory[]> {
  const cvContext = buildCvContext(formData);
  if (!cvContext) return [];

  const response = await groqChat({
    model: MODELS.versatile,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert technical recruiter and CV analyzer. Extract and infer professional skills based only on evidence in the candidate's CV.

RULES:
1. Extract explicitly mentioned tools, languages, frameworks, methodologies, platforms, soft skills, and domain expertise.
2. Infer related skills only when the evidence is strong.
3. Group skills into specific professional categories such as Languages, Frameworks & Libraries, Databases, Tools & Platforms, Methodologies, Domain Expertise, and Soft Skills.
4. Use only relevant, non-empty categories and return 10-25 deduplicated skills total.

Return JSON in exactly this format:
{
  "skillCategories": [
    { "name": "Languages", "skills": ["JavaScript", "TypeScript", "Java"] },
    { "name": "Databases", "skills": ["SQL", "MongoDB", "NoSQL"] }
  ]
}`
      },
      {
        role: "user",
        content: `CANDIDATE'S CV CONTEXT:\n${cvContext}\n\nExtract and categorize their skills.`
      }
    ],
    temperature: 0.1,
  }, { fallback: false });

  const parsed = JSON.parse(response.choices[0].message?.content || "{}");
  return coerceSkillCategories(parsed);
}
