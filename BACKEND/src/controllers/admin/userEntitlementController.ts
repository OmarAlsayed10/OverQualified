import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { allowance, isRefillTier, monthKey } from "../../services/quotaService";
import { rejectAdminMutation } from "./rejectAdminMutation";

const VALID_TIERS = ["basic", "pass", "pro", "ultra"] as const;

export const revokeProController = async (request: Request, response: Response): Promise<void> => {
  if (await rejectAdminMutation(request.params.id, response)) return;
  const user = await prisma.user.update({
    where: { id: request.params.id },
    data: {
      planTier: "basic",
      proExpiresAt: null,
      credits: allowance("basic"),
      bonusCredits: 0,
      creditPeriod: null,
    },
    select: { id: true, role: true, planTier: true, proExpiresAt: true },
  });
  response.status(200).json({ message: "Pro subscription revoked.", user });
};

export const setPlanController = async (request: Request, response: Response): Promise<void> => {
  const { planTier, durationDays } = request.body;
  if (!VALID_TIERS.includes(planTier)) {
    response.status(400).json({ message: `planTier must be one of ${VALID_TIERS.join(", ")}.` });
    return;
  }
  if (await rejectAdminMutation(request.params.id, response)) return;

  const existingUser = await prisma.user.findUnique({
    where: { id: request.params.id },
    select: { proExpiresAt: true },
  });
  if (!existingUser) {
    response.status(404).json({ message: "User not found." });
    return;
  }

  const paidPlan = planTier !== "basic";
  const currentTime = Date.now();
  const currentPlanIsValid = existingUser.proExpiresAt && existingUser.proExpiresAt.getTime() > currentTime;
  const duration = Number(durationDays) > 0 ? Number(durationDays) : 30;
  const proExpiresAt = !paidPlan
    ? null
    : currentPlanIsValid
      ? existingUser.proExpiresAt
      : new Date(currentTime + duration * 24 * 60 * 60 * 1000);
  const user = await prisma.user.update({
    where: { id: request.params.id },
    data: {
      planTier,
      proExpiresAt,
      credits: allowance(planTier),
      creditPeriod: isRefillTier(planTier) ? monthKey() : null,
    },
    select: { id: true, role: true, planTier: true, proExpiresAt: true },
  });
  response.status(200).json({ message: "Plan updated.", user });
};

export const grantAnalysesController = async (request: Request, response: Response): Promise<void> => {
  const amount = Number(request.body.amount);
  if (await rejectAdminMutation(request.params.id, response)) return;
  if (!Number.isInteger(amount) || amount === 0) {
    response.status(400).json({ message: "amount must be a non-zero integer." });
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: request.params.id },
    select: { bonusCredits: true },
  });
  if (!existingUser) {
    response.status(404).json({ message: "User not found." });
    return;
  }
  const bonusCredits = Math.max(0, existingUser.bonusCredits + amount);
  const user = await prisma.user.update({
    where: { id: request.params.id },
    data: { bonusCredits },
    select: { id: true, bonusCredits: true },
  });
  response.status(200).json({ message: "Bonus credits updated.", user });
};
