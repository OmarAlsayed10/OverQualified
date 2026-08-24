import { Document } from "@prisma/client";
import prisma from "../../lib/prisma";
import { StoredInterviewSession, storedInterviewSessionSchema } from "../interviewCoachSchema";

export const SESSION_TYPE = "interview-session";

export const parseStoredSession = (document: Document): StoredInterviewSession | null => {
  try {
    const parsed = storedInterviewSessionSchema.safeParse(JSON.parse(document.content));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};

export const remainingAt = (document: Document, session: StoredInterviewSession, now = new Date()) => {
  if (session.remainingSeconds === null || session.status !== "active") return session.remainingSeconds;
  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - document.updatedAt.getTime()) / 1000));
  return Math.max(0, session.remainingSeconds - elapsedSeconds);
};

export const publicSession = (document: Document, session: StoredInterviewSession) => {
  const responseTime = new Date();
  return {
    id: document.id,
    title: document.title,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    cvId: session.cvId,
    cvTitle: session.cvTitle,
    targetRole: session.targetRole,
    jobDescription: session.jobDescription,
    language: session.language,
    status: session.status,
    currentQuestion: session.currentQuestion,
    turns: session.turns,
    report: session.report,
    durationMinutes: session.durationMinutes,
    remainingSeconds: remainingAt(document, session, responseTime),
    questionLimit: session.questionLimit,
  };
};

export const updateSession = async (
  document: Document,
  session: StoredInterviewSession,
) => {
  const updated = await prisma.document.updateMany({
    where: {
      id: document.id,
      userId: document.userId,
      type: SESSION_TYPE,
      updatedAt: document.updatedAt,
    },
    data: { content: JSON.stringify(session) },
  });
  if (updated.count === 0) return null;
  return prisma.document.findUniqueOrThrow({ where: { id: document.id } });
};
