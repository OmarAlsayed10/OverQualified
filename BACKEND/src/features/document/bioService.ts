import { groqChat, MODELS } from "../../lib/groqChat";

// Writes a first-person LinkedIn "About" section grounded only in the candidate's CV.
export async function generateLinkedInBio(cvText: string): Promise<string> {
  const systemPrompt = `You are a professional personal-branding writer. Write a LinkedIn "About" summary in the candidate's own first-person voice. Use only facts present in the CV — never invent employers, titles, metrics, or achievements. Return ONLY the summary text, no headers or placeholders.`;

  const userPrompt = `CANDIDATE CV:
---
${cvText}
---

Write a 120-180 word LinkedIn "About" section in the first person. Lead with who they are and their focus, weave in their real strengths, notable experience, and skills from the CV, and end with what they're interested in or open to. Warm and confident, not boastful. Ground every claim in the CV.`;

  const response = await groqChat({
    model: MODELS.fast,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 500,
  });

  return response.choices[0].message?.content?.trim() || "";
}
