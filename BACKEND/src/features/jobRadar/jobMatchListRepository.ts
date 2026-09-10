import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";

const MIN_FIT = 50;
const PAGE_SIZE = 20;

const countryOf = (location: string | null): string | null => {
  if (!location) return null;
  const tail = location.split(",").pop()?.trim();
  return tail && tail.length > 1 ? tail : null;
};

export const listMatches = async (userId: string, page = 1, country?: string) => {
  const base: Prisma.JobMatchWhereInput = {
    userId,
    status: { not: "dismissed" },
    OR: [
      { fitScore: { gte: MIN_FIT } },
      { source: "manual", analysisStatus: "pending" } as Prisma.JobMatchWhereInput,
    ],
  };
  const where = country
    ? { ...base, location: { contains: country, mode: "insensitive" as const } }
    : base;
  const safePage = Math.max(1, Math.floor(page) || 1);

  const [matches, total, locGroups] = await Promise.all([
    prisma.jobMatch.findMany({
      where,
      orderBy: [{ earlyBird: "desc" }, { fitScore: "desc" }, { postedAt: "desc" }],
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.jobMatch.count({ where }),
    prisma.jobMatch.groupBy({ by: ["location"], where: base }),
  ]);

  const countries = [...new Set(locGroups.map((group) => countryOf(group.location)).filter((country): country is string => !!country))].sort();
  return { matches, total, page: safePage, pageSize: PAGE_SIZE, countries };
};
