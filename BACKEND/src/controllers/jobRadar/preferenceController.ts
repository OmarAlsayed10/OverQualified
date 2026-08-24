import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { selectedJobRoles } from "../../services/jobCatalogService";
import { listMatches, refreshMatchesForUser } from "../../services/jobRadarService";
import { authenticatedUserId } from "./shared";

export const getPreferenceController = async (request: Request, response: Response): Promise<void> => {
  const userId = authenticatedUserId(request);
  const preference = await prisma.jobPreference.findUnique({ where: { userId } });
  response.status(200).json({ preference });
};

export const setPreferenceController = async (request: Request, response: Response): Promise<void> => {
  const userId = authenticatedUserId(request);
  const { roleIds, level, location, remote, keywords, blocklist, active } = request.body;
  const roles = await selectedJobRoles(roleIds);
  const requestedRoleCount = Array.isArray(roleIds) ? new Set(roleIds).size : 0;
  if (roles.length === 0 || roles.length !== requestedRoleCount) {
    response.status(400).json({ code: "INVALID_JOB_ROLES", message: "Select between one and five available roles." });
    return;
  }

  const preferenceFields = {
    role: roles.map((role) => role.name).join(" | "),
    roleIds: roles.map((role) => role.id),
    level: level ? String(level).slice(0, 20) : null,
    location: location ? String(location).slice(0, 100) : null,
    remote: remote === true,
    keywords: keywords ? String(keywords).slice(0, 300) : null,
    blocklist: blocklist ? String(blocklist).slice(0, 500) : null,
    active: active !== false,
  };
  const preference = await prisma.jobPreference.upsert({
    where: { userId },
    create: { userId, ...preferenceFields },
    update: preferenceFields,
  });
  const refreshed = await refreshMatchesForUser(userId);
  const matches = await listMatches(userId, 1);
  response.status(200).json({ preference, refreshed, ...matches });
};
