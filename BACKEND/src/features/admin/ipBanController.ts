import { Request, Response } from "express";
import { addBannedIp, removeBannedIp } from "../../lib/banCache";
import prisma from "../../lib/prisma";

export const listBannedIpsController = async (_request: Request, response: Response): Promise<void> => {
  const ips = await prisma.bannedIp.findMany({ orderBy: { createdAt: "desc" } });
  response.status(200).json({ ips });
};

export const banIpController = async (request: Request, response: Response): Promise<void> => {
  const { ip, reason } = request.body;
  if (!ip || typeof ip !== "string") {
    response.status(400).json({ message: "ip is required." });
    return;
  }
  const record = await prisma.bannedIp.upsert({
    where: { ip },
    create: { ip, reason: reason ?? null },
    update: { reason: reason ?? null },
  });
  addBannedIp(record.ip);
  response.status(200).json({ message: "IP banned.", ip: record });
};

export const unbanIpController = async (request: Request, response: Response): Promise<void> => {
  const ip = request.params.ip;
  await prisma.bannedIp.delete({ where: { ip } }).catch(() => null);
  removeBannedIp(ip);
  response.status(200).json({ message: "IP unbanned." });
};
