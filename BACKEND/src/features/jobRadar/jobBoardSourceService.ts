import prisma from "../../lib/prisma";

export interface JobBoard {
  company: string;
  board: string;
}

export const configuredJobBoards = (value?: string): JobBoard[] =>
  (value ?? "")
    .split(",")
    .map((entry) => {
      const [company, ...boardParts] = entry.trim().split(":");
      return { company: company?.trim(), board: boardParts.join(":").trim() };
    })
    .filter((board): board is JobBoard => Boolean(board.company && board.board));

export const BOARD_PROVIDERS = ["greenhouse", "lever", "workable", "ashby", "smartrecruiters"] as const;
export type BoardProvider = (typeof BOARD_PROVIDERS)[number];

export interface BoardSource {
  id: string | null;
  provider: string;
  slug: string;
  company: string;
}

const envFallback = (provider: string): string | undefined =>
  provider === "greenhouse" ? process.env.GREENHOUSE_BOARDS
    : provider === "lever" ? process.env.LEVER_SITES
      : undefined;

const envSources = (provider: string): BoardSource[] =>
  configuredJobBoards(envFallback(provider)).map((board) => ({
    id: null,
    provider,
    slug: board.board,
    company: board.company,
  }));

export const activeBoardSources = async (provider: string): Promise<BoardSource[]> => {
  const rows = await prisma.jobBoardSource.findMany({
    where: { provider, active: true },
    orderBy: { company: "asc" },
    select: { id: true, provider: true, slug: true, company: true },
  });
  return rows.length ? rows : envSources(provider);
};

export const recordBoardRun = async (
  source: BoardSource,
  outcome: { jobCount: number; error?: string },
): Promise<void> => {
  if (!source.id) return;
  await prisma.jobBoardSource.update({
    where: { id: source.id },
    data: { lastRunAt: new Date(), lastJobCount: outcome.jobCount, lastError: outcome.error ?? null },
  });
};

const trimmed = (input: unknown, maxLength = 120): string =>
  typeof input === "string" ? input.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";

const validProvider = (input: unknown): BoardProvider => {
  const provider = trimmed(input).toLowerCase();
  if (!BOARD_PROVIDERS.includes(provider as BoardProvider)) throw new Error("INVALID_BOARD_PROVIDER");
  return provider as BoardProvider;
};

export const listBoardSources = () =>
  prisma.jobBoardSource.findMany({ orderBy: [{ provider: "asc" }, { company: "asc" }] });

export const createBoardSource = async (input: {
  provider: unknown;
  slug: unknown;
  company: unknown;
  country: unknown;
}) => {
  const provider = validProvider(input.provider);
  const slug = trimmed(input.slug);
  const company = trimmed(input.company);
  if (slug.length < 2 || company.length < 2) throw new Error("INVALID_BOARD_SOURCE");
  return prisma.jobBoardSource.create({
    data: { provider, slug, company, country: trimmed(input.country, 2).toUpperCase() || null },
  });
};

export const updateBoardSource = async (
  id: string,
  input: { company?: unknown; country?: unknown; active?: unknown },
) => {
  const company = input.company === undefined ? undefined : trimmed(input.company);
  if (company !== undefined && company.length < 2) throw new Error("INVALID_BOARD_SOURCE");
  return prisma.jobBoardSource.update({
    where: { id },
    data: {
      company,
      country: input.country === undefined ? undefined : trimmed(input.country, 2).toUpperCase() || null,
      active: typeof input.active === "boolean" ? input.active : undefined,
    },
  });
};

export const deleteBoardSource = (id: string) => prisma.jobBoardSource.delete({ where: { id } });
