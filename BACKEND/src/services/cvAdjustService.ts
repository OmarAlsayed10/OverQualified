import type { ScoreCategory, ScoreDimension } from "./cvScoring";
import { groqChat, MODELS } from "../lib/groqChat";
import { coerceFormData, type BuilderFormData } from "./cvParseService";
import { WEAK_OPENER_WORDS, startsWithActionVerb } from "./cvScoring/constants";
import { unsupportedNumberOccurrences } from "../lib/evidenceGrounding";
import { requiresCandidateEvidence } from "./cvImprovementRules";

export interface CVChange {
  section: string;
  what: string;
  why: string;
  impact: "high" | "medium" | "low";
}

export interface AdjustCVResult {
  adjustedCV: string;
  changes: CVChange[];
  // The same CV as fields, so the download can render through the real templates instead of the
  // plain-text fallback. Null whenever the model omits the block or returns unusable JSON — the
  // rewrite itself is still good, so a missing structure must never fail the request.
  formData: BuilderFormData | null;
}

const ENHANCE_FORMAT = `═══ FORMAT — CLEAN UP FOR ATS, KEEP THE CANDIDATE'S CONTENT ═══
Keep every real role, project, skill, date, and metric — never delete content to shorten. Improve the WRITING and fix ATS-hostile formatting:
- ALWAYS start with the candidate's header, before any section heading:
  Line 1: the candidate's Full Name (never a section word like "Summary").
  Line 2: the real contact facts that exist in the CV, separated by "  |  " — Role  |  Email  |  Phone  |  LinkedIn  |  GitHub  |  Location. Include only the ones the candidate actually provided; never drop one.
- Order the major sections: Summary → Experience → Skills → Education. Other sections (Projects, Certifications, Awards, Languages) keep their natural place around these.
- Use standard, plain section headings on their own line (Summary, Experience, Skills, Education).
- Use ONE bullet style throughout — a single "- " marker on every bullet. Never mix bullet glyphs.
- Use ONE date format throughout (e.g. "Jan 2023 – Present"). Make every role and education date match it exactly.
- Projects: put each project's title on its OWN header line as "Project Name – short descriptor | Tech, Tech, Tech" (use " | ", NO leading bullet, and NO separate "Tech:" line). Under it, list ONLY real achievement bullets. Never turn the project name, the tech list, or a repo/live link into a bullet.
- Start every experience/project bullet with a strong action verb (Built, Led, Reduced, Designed, Improved, Developed...). Never open a bullet with any of these, which the scorer counts as weak: ${WEAK_OPENER_WORDS.map((w) => `"${w}"`).join(", ")}.
- Turn weak/duty bullets into accomplishment statements using only facts already present. Preserve numeric claims only in the original claim where they appeared.
- Tighten the summary and skills wording; drop filler skills.
Single column — no tables, no multi-column tabs, no vertical bars.`;

const JAKE_FORMAT = `═══ REQUIRED FORMAT — "Jake's Resume" ATS template ═══
Length follows the content — two pages is fine. This template is usually described as one page, and
saying so here made the model drop real roles and bullets to hit that length, which contradicts the
never-shorten rule below.
Output plain text in EXACTLY this structure and order. Omit a section only if the original has zero content for it.

Line 1: Full Name
Line 2: the candidate's role / professional title ALONE on its own line — no contact details, no "|" on this line
Line 3: phone | email | linkedin-url | github-or-website   (only the ones present — the role must NOT be repeated here)
(blank line)
SUMMARY
<2-3 line summary>

EXPERIENCE
Job Title @ Company | Start – End
- XYZ accomplishment bullet
- XYZ accomplishment bullet

PROJECTS
Project Name | Tech or Date
- what it does / impact bullet

EDUCATION
Degree, Field @ School | Year

SKILLS
<sub-label>: ...
<sub-label>: ...

Rules for this format:
- Section headings are ALL-CAPS on their own line.
- Start every experience/project bullet with a strong action verb (Built, Led, Reduced, Designed, Improved, Developed...). Never open a bullet with any of these, which the scorer counts as weak: ${WEAK_OPENER_WORDS.map((w) => `"${w}"`).join(", ")}.
- ADAPT TO THE CANDIDATE'S FIELD — first infer their role family from the CV (software, data, design, lab/biotech science, healthcare, engineering, sales, marketing, finance, operations, legal, academic, education, skilled trade, etc.), then shape sections to fit:
  • Name the skills section for the field: TECHNICAL SKILLS (software/IT), LABORATORY SKILLS (lab science), CLINICAL SKILLS (healthcare), CORE COMPETENCIES (business/other).
  • Group skills under sub-labels that FIT the field (e.g. software → Languages/Frameworks/Tools; biotech → Techniques/Instruments/Software; sales → Methods/Tools/Domains). NEVER output a sub-label with nothing after it — omit empty labels entirely.
  • Keep PROJECTS only if the candidate has real projects; otherwise drop it. Non-technical fields typically use KEY ACHIEVEMENTS instead.
- Every experience/project/education entry header MUST use " | " to separate the left title from the right-side date/detail — this drives date alignment. Never omit the " | ". If there is no date, put the location or leave the right side empty but keep the " | ".
- This is a REFORMAT, not a rewrite. Carry EVERY real role, project, bullet, skill, metric, date, and contact detail from the original into this structure. Do NOT delete or summarize away any content — only move it into the template and strengthen the wording. If it existed in the original, it must exist in the output.
- MUST-KEEP sections — never drop or fold away COURSES, CERTIFICATIONS, INTERNSHIPS, TRAINING, AWARDS, LICENSES, or PUBLICATIONS if the original has them; they are real credentials and keywords. Keep them as their own ALL-CAPS section.
- The output must contain at least as many experience bullets and skills as the original. Never shorten to fit one page — length follows the content.
- Single column, no tables, no graphics.`;

const goldExample = (jake: boolean) => `═══ GOLD-STANDARD SHAPE — match this STRUCTURE and writing style; do NOT copy its facts ═══
Sample Candidate
${jake
  ? `Full Stack Developer
sample@example.com | github.com/sample | linkedin.com/in/sample`
  : `Full Stack Developer | React, Node.js, TypeScript | City | sample@example.com | github.com/sample | linkedin.com/in/sample`}
SUMMARY
Full Stack Developer building reliable web applications with documented frontend and backend experience.
EXPERIENCE
Full Stack Developer | Nimbus Cloud Systems — Remote | Start – Present
- Improved API responsiveness through caching and query optimization
- Delivered product features across documented releases
PROJECTS
TaskFlow – Team Productivity Platform | React, Node.js, PostgreSQL
- Built a real-time task application for collaborative work
- Implemented live collaboration with WebSocket communication
SKILLS
Languages: JavaScript, TypeScript, Python
Frontend: React, Next.js, Redux, Tailwind CSS

Notice: the project title is a HEADER line ending in " | Tech stack" — NEVER a bullet, and there is NO "Tech:" line. Every achievement bullet opens with a strong action verb, and the candidate's real numbers live inside the bullets. Follow this SHAPE using ONLY the candidate's own real facts and numbers.`;

export async function adjustCV(
  cvText: string,
  negativeFeedback: string[],
  sectionsToImprove: { section: string; suggestion: string }[],
  breakdown: ScoreCategory[],
  dimensions: ScoreDimension[],
  targetRole = "",
  level = "",
  applyJakeTemplate = false
): Promise<AdjustCVResult> {
  const role = targetRole.trim();
  const lvl = level.trim();

  // The exact per-dimension tips the user sees in the score breakdown — these ARE the fix list.
  const fixList = dimensions
    .filter((d) => d.score < 100)
    .flatMap((d) =>
      d.details
        .filter(
          (t) =>
            t &&
            !/nothing blocking|strong here|nothing to fix/i.test(t) &&
            !requiresCandidateEvidence(t)
        )
        .map((t) => `  • [${d.name}] ${t}`)
    )
    .join("\n");

  // Weakest categories as secondary context.
  const gaps = breakdown
    .filter((c) => c.tip !== null && !requiresCandidateEvidence(c.tip!))
    .sort((a, b) => a.earned / a.max - b.earned / b.max)
    .map((c) => `  • [${c.name}] ${c.tip}`)
    .join("\n");

  // AI qualitative notes as supplementary context
  const aiNotes = [
    ...negativeFeedback.map((f) => `  - ${f}`),
    ...sectionsToImprove.map((s) => `  - ${s.section}: ${s.suggestion}`),
  ].join("\n");

  const systemPrompt = `You are a world-class CV writer. Rewrite this CV to genuinely improve its quality against real hiring standards. Improve substance, not surface metrics. You may ONLY use facts present in the original. Adding ANY number, percentage, or metric that is not already in the original CV is a critical failure — never write "by 40%", "500+ users", or any figure the candidate did not state. If a bullet has no number in the original, it must have no number in your rewrite.`;

  const userPrompt = `═══ FIX LIST — apply EVERY item that does not require inventing data ═══
${fixList || gaps || "  (no specific issues flagged — apply the quality bar below)"}

═══ HARD RULES ═══
- The output MUST begin with the candidate's header: line 1 is their real Full Name (never "Summary" or any section word), then their real contact facts (role, email, phone, LinkedIn, GitHub, location) laid out exactly as the REQUIRED FORMAT section below specifies. Only THEN comes the first section. Never drop the name or any contact detail.
- Apply every fix above: reorder the sections to Summary → Experience → Skills → Education, use standard heading lines, unify to ONE date format, rewrite the exact dates flagged (e.g. "09/2021 – 07/2024" → "September 2021 – July 2024"), add or sharpen the Professional Summary using the candidate's real content, lead every bullet with a strong action verb, and remove any multi-column / tab / vertical-bar formatting.
- KEEP every real number, percentage, and metric exactly where its original claim appears. Never repeat one in an additional claim or move it to imply a different result.
- The ONLY things you may NEVER do: invent or change any number, percentage, or metric; invent skills, employers, job titles, calendar dates, schools, or degrees the candidate did not state. If a fix says "quantify" a bullet or "add N skills" and that data is not already in the CV, SKIP only that single item and apply all the others.
- Preserve every real detail — the candidate's name, contact links, and every role, project, skill, credential, and section (Courses, Certifications, Awards, Publications, etc.). Never delete content to shorten.

═══ SECONDARY CONTEXT ═══
${gaps || "  (none)"}

${applyJakeTemplate ? JAKE_FORMAT : ENHANCE_FORMAT}

${goldExample(applyJakeTemplate)}
${role || lvl ? `\n═══ TARGET — TAILOR TO THIS ═══\nThis candidate is targeting: ${lvl ? lvl + " " : ""}${role || "their stated role"}. Emphasize the experience, skills, and terminology expected of a ${lvl || ""} ${role || "candidate"} — only where the candidate genuinely has them. Do NOT invent skills or seniority the candidate lacks or inflate them beyond their real level.\n` : ""}
═══ SUPPLEMENTARY AI NOTES ═══
${aiNotes || "  (none)"}

═══ ORIGINAL CV ═══
${cvText}

${applyJakeTemplate
  ? "Rewrite the entire CV into the required ATS format above, improving real quality. Keep every real role, bullet and skill — never trim content to reach a page count. Then list every change you made."
  : "Rewrite the entire CV applying the improvements above while keeping its existing structure and section order. Then list every change you made."}

Use EXACTLY this format — no extra text before or after:

CV_START
<full rewritten CV — plain text, same structural style as original>
CV_END

CHANGES_START
[
  {"section":"<name>","what":"<what changed>","why":"<why it improves ATS score>","impact":"high|medium|low"},
  ...
]
CHANGES_END

FORMDATA_START
{
  "personalInfo": {"firstName":"","lastName":"","email":"","phoneCode":"","phone":"","city":"","country":"","professionalTitle":"","ProfessionalSummary":"","linkedin":"","github":"","portfolio":""},
  "experience": [{"jobTitle":"","company":"","location":"","startDate":"","endDate":"","description":"one bullet per line, no bullet characters"}],
  "education": [{"institution":"","degree":"","location":"","startYear":"","endYear":"","description":""}],
  "projects": [{"name":"","technologies":"","demoUrl":"","githubUrl":"","description":"one bullet per line, no bullet characters"}],
  "skills": {"skills":["one skill per array entry"],"languages":"","certifications":[{"name":"","issuer":"","date":"","url":"","description":""}]}
}
FORMDATA_END

FORMDATA rules — this is the SAME CV as above, just as fields instead of text:
- Every fact must already appear in the rewritten CV. Invent nothing, drop nothing.
- Dates stay exactly as written above ("Jan 2023", "Present"). Do not reformat them.
- description holds the achievement bullets separated by newlines, with NO leading "-" or "•".
- skills is a flat array of individual skills, never one comma-joined string.`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // A model that ignores its own output contract is the norm, not the exception — this same prompt
  // already specifies name on line 1 and contacts on line 2, and the model still returned them
  // joined. So a missing or malformed block degrades to null rather than throwing.
  const parseFormData = (raw: string): BuilderFormData | null => {
    const match = raw.match(/FORMDATA_START\s*([\s\S]*?)\s*FORMDATA_END/);
    if (!match) return null;
    try {
      const parsed = coerceFormData(JSON.parse(match[1].trim()));
      const hasName = `${parsed.personalInfo.firstName}${parsed.personalInfo.lastName}`.trim();
      // Structure with no name and no roles is not worth rendering a template from.
      if (!hasName && parsed.experience.length === 0) return null;
      return parsed;
    } catch (error) {
      console.warn("cvAdjustService: FORMDATA block was not usable JSON", error);
      return null;
    }
  };

  const parseChanges = (raw: string): CVChange[] => {
    const m = raw.match(/CHANGES_START\s*([\s\S]*?)\s*CHANGES_END/);
    if (!m) return [];
    try {
      const parsed = JSON.parse(m[1].trim());
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Bullets the scorer would mark weak, quoted back to the model so it knows which ones to redo.
  const weakOpenings = (cv: string): string[] =>
    cv
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[-•*]\s+/.test(line))
      .map((line) => line.replace(/^[-•*]\s+/, "").trim())
      .filter((bullet) => bullet && !startsWithActionVerb(bullet));

  let lastGoodRewrite: AdjustCVResult | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await groqChat({
      model: MODELS.versatile,
      messages,
      temperature: 0,
      max_tokens: 4500,
    });

    const raw = response.choices[0].message?.content || "";
    const cvMatch = raw.match(/CV_START\s*([\s\S]*?)\s*CV_END/);
    if (!cvMatch) {
      console.error("cvAdjustService: CV_START/CV_END markers missing in response:\n", raw.slice(0, 500));
      throw new Error("AI did not return a rewritten CV");
    }

    const candidate = cvMatch[1].trim();
    const formData = parseFormData(raw);
    const invented = [
      ...unsupportedNumberOccurrences(candidate, cvText),
      ...(formData ? unsupportedNumberOccurrences(JSON.stringify(formData), cvText) : []),
    ];
    const weakBullets = weakOpenings(candidate);

    if (invented.length === 0 && weakBullets.length === 0) {
      return { adjustedCV: candidate, changes: parseChanges(raw), formData };
    }

    // Naming the banned words in the prompt was not enough on its own, so the model has to be shown the offending bullet back.
    if (invented.length === 0) {
      console.warn(`cvAdjustService: ${weakBullets.length} weak bullet opening(s) — retry ${attempt + 1}/2`);
      lastGoodRewrite = { adjustedCV: candidate, changes: parseChanges(raw), formData };
      messages.push({ role: "assistant", content: raw });
      messages.push({
        role: "user",
        content: `These bullets open with a weak verb, which the scorer penalises:\n${weakBullets.map((b) => `  • ${b}`).join("\n")}\n\nRewrite ONLY those bullets to open with a strong action verb, keeping every fact and every number in its original claim. Return the full CV again in the exact same CV_START/CV_END, CHANGES_START/CHANGES_END and FORMDATA_START/FORMDATA_END format.`,
      });
      continue;
    }

    console.warn(`cvAdjustService: rewrite invented metrics ${JSON.stringify(invented)} — retry ${attempt + 1}/2`);
    messages.push({ role: "assistant", content: raw });
    messages.push({
      role: "user",
      content: `STOP — your rewrite INVENTED these figures that are NOT in the original CV: ${invented.join(", ")}. That is fake data and is forbidden. Regenerate the CV in the exact same CV_START/CV_END, CHANGES_START/CHANGES_END and FORMDATA_START/FORMDATA_END format, keeping every structural and wording improvement, but REMOVE every invented number and percentage. Any bullet with no number in the original must have no number.`,
    });
  }

  // A weak verb is a wording nit, not fabricated data. If the retries could not clear it, the
  // rewrite is still far better than the original — keep it rather than throwing the work away.
  if (lastGoodRewrite) {
    console.warn("cvAdjustService: weak bullet openings survived every retry — returning the rewrite anyway.");
    return lastGoodRewrite;
  }

  console.error("cvAdjustService: could not optimize without fabricating metrics — returning original CV unchanged.");
  return {
    adjustedCV: cvText,
    formData: null,
    changes: [
      {
        section: "All",
        what: "Kept your original content unchanged",
        why: "The optimizer could not improve the CV without inventing metrics, so nothing was fabricated. Add real numbers to your bullets to raise Impact and Content scores.",
        impact: "low",
      },
    ],
  };
}
