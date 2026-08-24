import { groqChat, MODELS } from "../lib/groqChat";

const EMPHASIS: Record<string, string> = {
  A: "Emphasize IMPACT and RESULTS: lead every experience bullet with an accomplishment (action verb + what + outcome), and surface quantified impact — but only using numbers already present in the original. Do not invent metrics.",
  B: "Emphasize SKILLS and KEYWORDS: weave the concrete technologies, tools, and terminology a recruiter or ATS would search for this role into the summary, skills, and experience — only where the candidate genuinely has them. Do not invent skills.",
};

async function rewriteVariant(
  cvText: string,
  job: { title: string; company: string },
  label: string
): Promise<{ label: string; content:string }> {
  const systemPrompt = `You are a world-class CV writer. Rewrite this CV tailored to a specific role. You may only use facts present in the original — never invent employers, numbers, dates, titles, skills, or achievements the candidate did not state. Keep the candidate's existing section order and layout. Return ONLY the rewritten CV in plain text, no preamble or commentary.`;

  const userPrompt = `TARGET ROLE: ${job.title} at ${job.company}

${EMPHASIS[label]}

Keep every real role, project, and skill. Do not remove content to shorten. Tailor wording to the target role only where the candidate genuinely qualifies.

ORIGINAL CV:
---
${cvText}
---`;

  const response = await groqChat({
    model: MODELS.versatile,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 6000,
  }, { fallback: false });

  return { label, content: response.choices[0].message?.content?.trim() || "" };
}

export async function generateVariants(
  cvText: string,
  job: { title: string; company: string }
): Promise<{ label: string; content: string }[]> {
  return Promise.all([
    rewriteVariant(cvText, job, "A"),
    rewriteVariant(cvText, job, "B"),
  ]);
}
