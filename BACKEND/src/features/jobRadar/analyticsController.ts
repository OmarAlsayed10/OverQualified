import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticatedUserId } from "./shared";

const mondayOf = (input: Date): string => {
  const date = new Date(input);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};

export const getAnalyticsController = async (request: Request, response: Response): Promise<void> => {
  const userId = authenticatedUserId(request);
  const matches = await prisma.jobMatch.findMany({
    where: { userId },
    select: { status: true, appliedAt: true },
  });
  const totals = { matched: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
  for (const match of matches) {
    if (match.status in totals) (totals as Record<string, number>)[match.status]++;
  }

  const appliedMatches = matches.filter((match) => match.appliedAt !== null);
  const applyRate = matches.length ? appliedMatches.length / matches.length : 0;
  const responseRate = appliedMatches.length
    ? (totals.interview + totals.offer) / appliedMatches.length
    : 0;
  const weeklyApplications = new Map<string, number>();
  for (const match of appliedMatches) {
    const week = mondayOf(match.appliedAt!);
    weeklyApplications.set(week, (weeklyApplications.get(week) ?? 0) + 1);
  }

  const currentMonday = new Date(`${mondayOf(new Date())}T00:00:00.000Z`);
  const byWeek: { week: string; applied: number }[] = [];
  for (let weeksAgo = 7; weeksAgo >= 0; weeksAgo--) {
    const date = new Date(currentMonday);
    date.setUTCDate(date.getUTCDate() - weeksAgo * 7);
    const week = date.toISOString().slice(0, 10);
    byWeek.push({ week, applied: weeklyApplications.get(week) ?? 0 });
  }
  response.status(200).json({ totals, applyRate, responseRate, byWeek });
};
