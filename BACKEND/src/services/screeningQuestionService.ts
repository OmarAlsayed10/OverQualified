import { groqChat, MODELS } from "../lib/groqChat";

export interface ScreeningQA {
  id: string;
  question: string;
  answer: string;
  source: "ai" | "user";
  editable: boolean;
}

export interface ScreeningInput {
  jobTitle: string;
  company: string;
  jobDescription?: string | null;
  cvText?: string | null;
  userProfile?: {
    salaryExpectation?: string | null;
    salaryCurrency?: string | null;
    visaStatus?: string | null;
    noticePeriod?: string | null;
    workPreference?: string | null;
    relocationOpen?: boolean | null;
  } | null;
}

export async function generateScreeningQuestions(input: ScreeningInput): Promise<ScreeningQA[]> {
  const { jobTitle, company, jobDescription, cvText, userProfile } = input;

  // Salary, notice period, work authorisation, work mode and relocation are facts
  // about the candidate that only they can state. Guessing them puts a false claim
  // into a real job application, so an unset profile field stays unanswered.
  const NEEDS_USER_INPUT = "Not provided — please complete this answer before applying.";

  const defaultQAs: ScreeningQA[] = [
    {
      id: "q-1",
      question: `Why are you interested in joining ${company} as a ${jobTitle}?`,
      answer: `I am excited about ${company}'s mission and the opportunity to leverage my experience in delivering high-quality solutions for the ${jobTitle} role.`,
      source: "ai",
      editable: true,
    },
    {
      id: "q-2",
      question: "What are your salary expectations for this position?",
      answer: userProfile?.salaryExpectation
        ? `My salary expectation is ${userProfile.salaryExpectation} ${userProfile.salaryCurrency || "USD"}.`
        : NEEDS_USER_INPUT,
      source: "ai",
      editable: true,
    },
    {
      id: "q-3",
      question: "What is your notice period / availability?",
      answer: userProfile?.noticePeriod
        ? `My notice period is ${userProfile.noticePeriod.replace("_", " ")}.`
        : NEEDS_USER_INPUT,
      source: "ai",
      editable: true,
    },
    {
      id: "q-4",
      question: "What is your work authorization / visa status?",
      answer: userProfile?.visaStatus
        ? `My status: ${userProfile.visaStatus.replace("_", " ")}.`
        : NEEDS_USER_INPUT,
      source: "ai",
      editable: true,
    },
    {
      id: "q-5",
      question: "What is your work mode preference (remote, hybrid, on-site)?",
      answer: userProfile?.workPreference
        ? `Preference: ${userProfile.workPreference}.`
        : NEEDS_USER_INPUT,
      source: "ai",
      editable: true,
    },
    {
      id: "q-6",
      question: "Are you open to relocation?",
      answer:
        userProfile?.relocationOpen == null
          ? NEEDS_USER_INPUT
          : userProfile.relocationOpen
            ? "Yes, I am open to relocation."
            : "Currently seeking local or remote roles.",
      source: "ai",
      editable: true,
    },
  ];

  try {
    const prompt = `Generate 6 to 10 common application screening questions and personalized candidate answers for:
Job Title: ${jobTitle}
Company: ${company}
Job Description: ${jobDescription || "N/A"}
CV / Background Summary: ${cvText || "N/A"}
User Profile Defaults:
- Salary: ${userProfile?.salaryExpectation || "N/A"} ${userProfile?.salaryCurrency || "USD"}
- Visa Status: ${userProfile?.visaStatus || "N/A"}
- Notice Period: ${userProfile?.noticePeriod || "N/A"}
- Work Mode: ${userProfile?.workPreference || "N/A"}
- Relocation: ${userProfile?.relocationOpen ? "Yes" : "No"}

Never invent salary, notice period, work authorisation, visa status, work mode or
relocation willingness. Where the matching User Profile Default above is N/A, the
answer for that topic must be exactly: ${NEEDS_USER_INPUT}

Return ONLY a JSON object with this shape:
{
  "questions": [
    {
      "id": "q-1",
      "question": "question text",
      "answer": "personalized candidate answer grounding in profile and CV details",
      "source": "ai",
      "editable": true
    }
  ]
}`;

    const res = await groqChat({
      model: MODELS.fast,
      messages: [
        { role: "system", content: "You are an expert recruiter and job interview coach. Return JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = res.choices[0].message?.content || "";
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return parsed.questions.map((q: any, idx: number) => ({
        id: q.id || `q-${idx + 1}`,
        question: String(q.question || "").trim(),
        answer: String(q.answer || "").trim(),
        source: "ai",
        editable: true,
      }));
    }
  } catch (err) {
    console.error("[screeningQuestionService] AI generation failed, falling back to defaults:", err);
  }

  return defaultQAs;
}
