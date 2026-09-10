import crypto from "crypto";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma";
import { EXTENSION_SCOPE } from "../../middleware/validateJWTMiddleware";

const PAIRING_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const PAIRING_CODE_LENGTH = 8;
const PAIRING_TTL_MINUTES = 10;
const EXTENSION_TOKEN_TTL = "90d";

const pairingCode = (): string =>
  Array.from(crypto.randomBytes(PAIRING_CODE_LENGTH))
    .map((byte) => PAIRING_CODE_ALPHABET[byte % PAIRING_CODE_ALPHABET.length])
    .join("");

export const startPairing = async () => {
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MINUTES * 60_000);
  const pairing = await prisma.extensionPairing.create({ data: { code: pairingCode(), expiresAt } });
  await prisma.extensionPairing.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return { code: pairing.code, expiresAt };
};

export const findPendingPairing = (code: string) =>
  prisma.extensionPairing.findFirst({
    where: { code, consumedAt: null, expiresAt: { gt: new Date() } },
  });

export const approvePairing = async (code: string, userId: string): Promise<boolean> => {
  const pairing = await findPendingPairing(code);
  if (!pairing || pairing.approvedAt) return false;
  await prisma.extensionPairing.update({
    where: { id: pairing.id },
    data: { userId, approvedAt: new Date() },
  });
  return true;
};

const extensionToken = (user: { id: string; email: string; role: string }): string =>
  jwt.sign(
    { userId: user.id, email: user.email, role: user.role, scope: EXTENSION_SCOPE },
    process.env.JWT_SECRET_Key!,
    { expiresIn: EXTENSION_TOKEN_TTL },
  );

export const claimPairing = async (code: string) => {
  const pairing = await findPendingPairing(code);
  if (!pairing) return { status: "expired" as const };
  if (!pairing.userId || !pairing.approvedAt) return { status: "pending" as const };

  const user = await prisma.user.findUnique({
    where: { id: pairing.userId },
    select: { id: true, email: true, role: true, firstName: true },
  });
  if (!user) return { status: "expired" as const };

  await prisma.extensionPairing.update({ where: { id: pairing.id }, data: { consumedAt: new Date() } });
  return { status: "approved" as const, token: extensionToken(user), firstName: user.firstName, email: user.email };
};
