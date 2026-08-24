import prisma from "../../lib/prisma";
import { StartInterviewInput, StoredInterviewSession } from "../interviewCoachSchema";
import { evaluateAnswer, evaluateFinalAnswer, firstQuestion, generateReport } from "./coach";
import {
  parseStoredSession,
  publicSession,
  remainingAt,
  SESSION_TYPE,
  updateSession,
} from "./sessionDocument";
import { interviewSource } from "./source";
import { questionLimitFor, titleFor } from "./timing";

export async function createInterviewSession(userId: string, input: StartInterviewInput) {
  const source = await interviewSource(userId, input);
  if (!source) return null;
  if (!source.cvContext) {
    throw Object.assign(new Error("The selected CV does not contain enough content."), { status: 400 });
  }

  const question = await firstQuestion(input, source.cvContext);
  const questionLimit = questionLimitFor(input.durationMinutes);
  const session: StoredInterviewSession = {
    version: 1,
    ...source,
    targetRole: input.targetRole,
    jobDescription: input.jobDescription,
    language: input.language,
    status: "active",
    currentQuestion: question,
    turns: [],
    report: null,
    durationMinutes: input.durationMinutes,
    remainingSeconds: input.durationMinutes === null ? null : input.durationMinutes * 60,
    questionLimit,
  };
  const document = await prisma.document.create({
    data: {
      userId,
      type: SESSION_TYPE,
      title: titleFor(input.targetRole),
      content: JSON.stringify(session),
      targetRole: input.targetRole,
    },
  });
  return publicSession(document, session);
}

export async function listInterviewSessions(userId: string) {
  const documents = await prisma.document.findMany({
    where: { userId, type: SESSION_TYPE },
    orderBy: { updatedAt: "desc" },
  });
  return documents.flatMap((document) => {
    const session = parseStoredSession(document);
    return session ? [publicSession(document, session)] : [];
  });
}

export async function submitInterviewAnswer(userId: string, id: string, answer: string) {
  const document = await prisma.document.findFirst({ where: { id, userId, type: SESSION_TYPE } });
  if (!document) return { kind: "not_found" as const };
  const session = parseStoredSession(document);
  if (!session) return { kind: "not_found" as const };
  if (session.status !== "active" || !session.currentQuestion) return { kind: "completed" as const };

  const remainingSeconds = remainingAt(document, session);
  const finalTurn = session.turns.length + 1 >= session.questionLimit || remainingSeconds === 0;
  const evaluation = finalTurn
    ? await evaluateFinalAnswer(session, answer)
    : await evaluateAnswer(session, answer);
  const updatedSession: StoredInterviewSession = {
    ...session,
    status: finalTurn ? "completed" : "active",
    currentQuestion: finalTurn ? null : "nextQuestion" in evaluation ? evaluation.nextQuestion : null,
    turns: [...session.turns, {
      question: session.currentQuestion,
      answer,
      feedback: evaluation.feedback,
    }],
    report: "report" in evaluation ? evaluation.report : null,
    remainingSeconds,
  };
  const refreshed = await updateSession(document, updatedSession);
  if (!refreshed) return { kind: "conflict" as const };
  return { kind: "success" as const, session: publicSession(refreshed, updatedSession) };
}

export async function finishInterviewSession(userId: string, id: string) {
  const document = await prisma.document.findFirst({ where: { id, userId, type: SESSION_TYPE } });
  if (!document) return { kind: "not_found" as const };
  const session = parseStoredSession(document);
  if (!session) return { kind: "not_found" as const };
  if (session.status !== "active") return { kind: "completed" as const };

  const remainingSeconds = remainingAt(document, session);
  if (session.turns.length < 3 && remainingSeconds !== 0) return { kind: "too_early" as const };
  if (session.turns.length === 0) return { kind: "no_answers" as const };

  const report = await generateReport(session);
  const updatedSession: StoredInterviewSession = {
    ...session,
    status: "completed",
    currentQuestion: null,
    report,
    remainingSeconds,
  };
  const refreshed = await updateSession(document, updatedSession);
  if (!refreshed) return { kind: "conflict" as const };
  return { kind: "success" as const, session: publicSession(refreshed, updatedSession) };
}

export async function quitInterviewSession(userId: string, id: string) {
  const document = await prisma.document.findFirst({ where: { id, userId, type: SESSION_TYPE } });
  if (!document) return { kind: "not_found" as const };
  const session = parseStoredSession(document);
  if (!session) return { kind: "not_found" as const };
  if (session.status !== "active") return { kind: "completed" as const };

  const updatedSession: StoredInterviewSession = {
    ...session,
    status: "quit",
    currentQuestion: null,
    remainingSeconds: remainingAt(document, session),
  };
  const refreshed = await updateSession(document, updatedSession);
  if (!refreshed) return { kind: "conflict" as const };
  return { kind: "success" as const, session: publicSession(refreshed, updatedSession) };
}
