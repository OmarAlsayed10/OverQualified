import { GitHost } from "@prisma/client";
import prisma from "../../lib/prisma";
import { encryptSecret, decryptSecret, secretHint } from "../../lib/secretBox";
import { GitHostError } from "../../lib/gitHostError";

export interface CredentialSummary {
  host: GitHost;
  hint: string;
  label: string | null;
  createdAt: Date;
}

const TOKEN_SHAPES: Record<GitHost, RegExp> = {
  GITHUB: /^(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})$/,
  GITLAB: /^(glpat-[A-Za-z0-9_-]{16,}|[A-Za-z0-9_-]{20,})$/,
};

export const hostFromUrl = (repoUrl: string): GitHost | null => {
  const value = repoUrl.toLowerCase();
  if (value.includes("github.com")) return "GITHUB";
  if (value.includes("gitlab.com")) return "GITLAB";
  return null;
};

export async function saveCredential(
  userId: string,
  host: GitHost,
  token: string,
  label?: string,
): Promise<CredentialSummary> {
  const trimmed = token.trim();
  if (!TOKEN_SHAPES[host].test(trimmed)) {
    throw new GitHostError(400, "That does not look like a valid access token for this provider.");
  }

  const record = await prisma.gitHostCredential.upsert({
    where: { userId_host: { userId, host } },
    create: {
      userId,
      host,
      token: encryptSecret(trimmed),
      hint: secretHint(trimmed),
      label: label || null,
    },
    update: {
      token: encryptSecret(trimmed),
      hint: secretHint(trimmed),
      label: label || null,
    },
  });

  return { host: record.host, hint: record.hint, label: record.label, createdAt: record.createdAt };
}

export async function listCredentials(userId: string): Promise<CredentialSummary[]> {
  const records = await prisma.gitHostCredential.findMany({
    where: { userId },
    select: { host: true, hint: true, label: true, createdAt: true },
  });
  return records;
}

export async function deleteCredential(userId: string, host: GitHost): Promise<void> {
  await prisma.gitHostCredential.deleteMany({ where: { userId, host } });
}

export async function resolveToken(userId: string, host: GitHost): Promise<string | undefined> {
  const record = await prisma.gitHostCredential.findUnique({
    where: { userId_host: { userId, host } },
    select: { token: true },
  });
  if (!record) return undefined;

  try {
    return decryptSecret(record.token);
  } catch {
    return undefined;
  }
}
