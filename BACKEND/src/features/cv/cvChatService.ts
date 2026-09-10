import { groqChat, MODELS } from "../../lib/groqChat";
import { Language, jsonProseLanguageInstruction } from "../../lib/aiLanguage";
import { translateProse } from "../../shared/translateProseService";
import { logger } from "../../lib/logger";

export async function cvChat(
  cvText: string,
  question: string,
  language: Language = "en"
): Promise<string> {
  const systemPrompt = `You are a professional career coach and interview preparation expert.${jsonProseLanguageInstruction(language)} You have been given a candidate's CV to review. Answer the candidate's questions about their CV, career prospects, interview preparation, and how to position themselves professionally.

Guidelines:
- Base all answers on the actual content of the CV provided
- Give specific, professional advice — not generic platitudes
- For interview questions, provide detailed model answers the candidate can adapt
- Be honest about weaknesses while remaining constructive
- Keep answers focused and actionable`;

  const userPrompt = `Here is the candidate's CV for context:
---
${cvText}
---

Candidate's question: ${question}

Provide a professional, specific answer based on their actual CV content.`;

  const response = await groqChat({
    model: MODELS.fast,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
  });

  return response.choices[0].message?.content || "I could not generate a response. Please try again.";
}

// Answers are always written in English then translated, so the Arabic reader gets the
// same answers rather than a separately reasoned set.
export async function getInterviewAnswers(
  cvText: string,
  questions: string[],
  language: Language = "en"
): Promise<{ question: string; answer: string }[]> {
  if (language !== "en") {
    const english = await getInterviewAnswers(cvText, questions, "en");
    const source = english.flatMap((item) => [item.question, item.answer]);
    const translated = await translateProse(source, language);
    if (translated === source) return english;
    return english.map((item, index) => ({
      question: translated[index * 2],
      answer: translated[index * 2 + 1],
    }));
  }

  const systemPrompt = `You are a senior interview coach who specializes in preparing candidates for competitive job interviews. You have access to the candidate's CV. For each interview question, provide a professional model answer that:
- Uses the STAR method (Situation, Task, Action, Result) for behavioral questions
- References specific experience, skills, or achievements from their actual CV
- Is confident, specific, and interview-ready
- Is 3-5 sentences long — concise but complete

Return ONLY a valid JSON array. No markdown, no extra text.`;

  const userPrompt = `Candidate's CV:
---
${cvText}
---

Generate professional model answers for these interview questions:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Return a JSON array in exactly this format:
[
  { "question": "<question text>", "answer": "<professional model answer>" }
]`;

  const response = await groqChat({
    model: MODELS.fast,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const resultText = response.choices[0].message?.content || "";
  const cleanedText = resultText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleanedText);
  } catch (e) {
    logger.error("cvChatService parse failed:", cleanedText);
    throw new Error("Failed to parse interview answers as JSON");
  }

  // handle both array root and wrapped object
  const arr = Array.isArray(parsed) ? parsed : (parsed.answers || parsed.questions || []);
  return arr;
}
