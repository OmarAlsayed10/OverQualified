import prisma from "../../lib/prisma";
import { groqChat } from "../../lib/groqChat";
import {
  createInterviewSession,
  finishInterviewSession,
  submitInterviewAnswer,
} from "../interviewCoachService";

jest.mock("../../lib/prisma", () => ({
  __esModule: true,
  default: {
    cV: { findFirst: jest.fn() },
    document: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  },
}));

jest.mock("../../lib/groqChat", () => ({
  groqChat: jest.fn(),
  MODELS: { fast: "test-fast", versatile: "test-versatile" },
}));

const mockedGroqChat = groqChat as jest.MockedFunction<typeof groqChat>;
const userId = "11111111-1111-4111-8111-111111111111";
const cvId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";
const timestamp = new Date("2026-08-24T10:00:00.000Z");

const cv = {
  id: cvId,
  userId,
  title: "Backend CV",
  personalInfo: {
    professionalTitle: "Backend Engineer",
    ProfessionalSummary: "Builds reliable APIs.",
  },
  experience: [{
    jobTitle: "Backend Engineer",
    company: "Acme",
    startDate: "2024",
    endDate: "Present",
    description: "Built payment APIs with TypeScript.",
  }],
  education: [],
  projects: [],
  skills: { skills: ["TypeScript"] },
};

const storedSession = {
  version: 1,
  cvId,
  cvTitle: "Backend CV",
  cvContext: "Title: Backend Engineer\nSummary: Builds reliable APIs.",
  targetRole: "Senior Backend Engineer",
  jobDescription: "",
  language: "en",
  status: "active",
  currentQuestion: "Tell me about a reliable API you built.",
  turns: [],
  report: null,
};

const documentRecord = (content: string) => ({
  id: sessionId,
  userId,
  type: "interview-session",
  title: "Interview practice · Senior Backend Engineer",
  content,
  targetRole: "Senior Backend Engineer",
  targetCompany: null,
  isPrimary: false,
  createdAt: timestamp,
  updatedAt: timestamp,
});

describe("interviewCoachService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("starts a persisted interview with a CV-grounded first question", async () => {
    (prisma.cV.findFirst as jest.Mock).mockResolvedValue(cv);
    mockedGroqChat.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        question: "How did you make the payment APIs reliable?",
      }) } }],
    } as never);
    (prisma.document.create as jest.Mock).mockResolvedValue(documentRecord("saved"));

    const session = await createInterviewSession(userId, {
      cvId,
      targetRole: "Senior Backend Engineer",
      jobDescription: "",
      language: "en",
      durationMinutes: null,
    });

    expect(session).toMatchObject({
      id: sessionId,
      cvId,
      targetRole: "Senior Backend Engineer",
      status: "active",
      currentQuestion: "How did you make the payment APIs reliable?",
      turns: [],
    });
  });

  test("starts an interview from an uploaded CV without requiring a saved CV", async () => {
    mockedGroqChat.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        question: "How do you design a reliable TypeScript API?",
      }) } }],
    } as never);
    (prisma.document.create as jest.Mock).mockResolvedValue({
      ...documentRecord("saved"),
      updatedAt: new Date(),
    });

    const session = await createInterviewSession(userId, {
      uploadedCv: {
        fileName: "backend-resume.pdf",
        formData: cv,
      },
      targetRole: "Senior Backend Engineer",
      jobDescription: "",
      language: "en",
      durationMinutes: 30,
    });

    expect(session).toMatchObject({
      cvId: null,
      cvTitle: "backend-resume",
      durationMinutes: 30,
      questionLimit: 10,
    });
    expect(session?.remainingSeconds).toBeGreaterThanOrEqual(1799);
    expect(session?.remainingSeconds).toBeLessThanOrEqual(1800);
  });

  test("short non-answers cannot receive generic positive feedback", async () => {
    (prisma.document.findFirst as jest.Mock).mockResolvedValue(
      documentRecord(JSON.stringify(storedSession)),
    );
    mockedGroqChat.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        score: 5,
        strengths: [{ feedback: "Clear communication.", evidenceExcerpt: "I don't know" }],
        improvements: ["Give an example."],
        nextQuestion: "How would you find the answer?",
      }) } }],
    } as never);
    (prisma.document.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.document.findUniqueOrThrow as jest.Mock).mockResolvedValue(documentRecord("updated"));

    const outcome = await submitInterviewAnswer(userId, sessionId, "I don't know");

    expect(outcome.kind).toBe("success");
    if (outcome.kind !== "success") throw new Error("Expected a successful answer.");
    expect(outcome.session.turns[0].feedback).toMatchObject({ score: 2, strengths: [] });
  });

  test("rejects feedback that quotes evidence absent from the answer", async () => {
    (prisma.document.findFirst as jest.Mock).mockResolvedValue(
      documentRecord(JSON.stringify(storedSession)),
    );
    mockedGroqChat.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        score: 4,
        strengths: [{ feedback: "Clear structure.", evidenceExcerpt: "I reduced latency by 90%." }],
        improvements: [],
        nextQuestion: "What trade-offs did you consider?",
      }) } }],
    } as never);

    await expect(
      submitInterviewAnswer(userId, sessionId, "I clarified requirements and tested the API."),
    ).rejects.toThrow("unsupported evidence");
    expect(prisma.document.updateMany).not.toHaveBeenCalled();
  });

  test("an expired timer completes after accepting the current answer", async () => {
    (prisma.document.findFirst as jest.Mock).mockResolvedValue(
      documentRecord(JSON.stringify({
        ...storedSession,
        durationMinutes: 10,
        remainingSeconds: 0,
        questionLimit: 5,
      })),
    );
    const answer = "I clarified requirements before implementing the payment API.";
    mockedGroqChat.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        score: 4,
        strengths: [{ feedback: "Explained the initial step.", evidenceExcerpt: "clarified requirements" }],
        improvements: ["Explain the resulting trade-offs."],
        report: {
          overallScore: 70,
          strengths: [{ feedback: "Started with requirements.", evidenceExcerpt: "clarified requirements" }],
          improvements: [{ feedback: "Expand the outcome.", evidenceExcerpt: "payment API" }],
          practiceNext: ["Practice describing technical trade-offs."],
          topicsNotReached: ["Operational monitoring"],
        },
      }) } }],
    } as never);
    (prisma.document.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.document.findUniqueOrThrow as jest.Mock).mockResolvedValue(documentRecord("updated"));

    const outcome = await submitInterviewAnswer(userId, sessionId, answer);

    expect(outcome.kind).toBe("success");
    if (outcome.kind !== "success") throw new Error("Expected a successful answer.");
    expect(outcome.session).toMatchObject({ status: "completed", remainingSeconds: 0 });
    expect(outcome.session.turns).toHaveLength(1);
  });

  test("finishes early after three completed answers", async () => {
    const turns = Array.from({ length: 3 }, (_, index) => ({
      question: `Question ${index + 1}`,
      answer: `Detailed answer ${index + 1}`,
      feedback: { score: 3, strengths: [], improvements: [] },
    }));
    (prisma.document.findFirst as jest.Mock).mockResolvedValue(
      documentRecord(JSON.stringify({ ...storedSession, turns, questionLimit: 8 })),
    );
    mockedGroqChat.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        report: {
          overallScore: 65,
          strengths: [{ feedback: "Provided a direct answer.", evidenceExcerpt: "Detailed answer 1" }],
          improvements: [{ feedback: "Add more context.", evidenceExcerpt: "Detailed answer 2" }],
          practiceNext: ["Practice structured examples."],
          topicsNotReached: ["Role-specific scenarios"],
        },
      }) } }],
    } as never);
    (prisma.document.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.document.findUniqueOrThrow as jest.Mock).mockResolvedValue(documentRecord("updated"));

    const outcome = await finishInterviewSession(userId, sessionId);

    expect(outcome.kind).toBe("success");
    if (outcome.kind !== "success") throw new Error("Expected a successful finish.");
    expect(outcome.session.status).toBe("completed");
  });

  test("rejects a final report finding without answer evidence", async () => {
    const turns = Array.from({ length: 4 }, (_, index) => ({
      question: `Question ${index + 1}`,
      answer: `Answer ${index + 1}`,
      feedback: {
        score: 3,
        strengths: [],
        improvements: [],
        answerExcerpt: null,
        cvExcerpt: null,
      },
    }));
    (prisma.document.findFirst as jest.Mock).mockResolvedValue(
      documentRecord(JSON.stringify({ ...storedSession, turns })),
    );
    mockedGroqChat.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        score: 4,
        strengths: [{ feedback: "Relevant answer.", evidenceExcerpt: "Final answer" }],
        improvements: [],
        report: {
          overallScore: 78,
          strengths: [{ feedback: "Demonstrated leadership.", evidenceExcerpt: "Led a team of 20" }],
          improvements: [{ feedback: "Add more context.", evidenceExcerpt: "Final answer" }],
          practiceNext: ["Use a clearer situation-action-result structure."],
          topicsNotReached: [],
        },
      }) } }],
    } as never);

    await expect(
      submitInterviewAnswer(userId, sessionId, "Final answer"),
    ).rejects.toThrow("report contained unsupported evidence");
    expect(prisma.document.updateMany).not.toHaveBeenCalled();
  });
});
