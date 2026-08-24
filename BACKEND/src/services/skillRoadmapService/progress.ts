import prisma from "../../lib/prisma";
import { getOrGenerateSkillRoadmap } from "./generation";
import { normalizeSkillKey } from "./normalization";

export async function getUserSkillProgress(userId: string) {
  try {
    const list = await (prisma as any).userSkillProgress.findMany({
      where: { userId },
      include: { skillRoadmap: true },
      orderBy: { updatedAt: "desc" },
    });

    const seen = new Set<string>();
    const deduplicated: any[] = [];

    for (const item of list) {
      if (!item.skillRoadmap) continue;
      const canonicalKey = normalizeSkillKey(item.skillRoadmap.skillKey);
      if (!seen.has(canonicalKey)) {
        seen.add(canonicalKey);
        deduplicated.push({
          id: item.id,
          skillKey: canonicalKey,
          skill: item.skillRoadmap.skill,
          category: item.skillRoadmap.category,
          status: item.status,
          learnedAt: item.learnedAt,
          roadmap: {
            ...item.skillRoadmap,
            skillKey: canonicalKey,
          },
        });
      }
    }

    return deduplicated;
  } catch (err) {
    console.error("getUserSkillProgress error:", err);
    return [];
  }
}

export async function updateUserSkillProgress(userId: string, skillName: string, status: "in_progress" | "learned") {
  const roadmap = await getOrGenerateSkillRoadmap(skillName);
  const dbRoadmap = await (prisma as any).skillRoadmap.findUnique({ where: { skillKey: roadmap.skillKey } });
  if (!dbRoadmap) throw new Error("Could not find skill roadmap");

  const allUserProgress = await (prisma as any).userSkillProgress.findMany({
    where: { userId },
    include: { skillRoadmap: true },
    orderBy: { updatedAt: "desc" },
  });

  const matchingEntries = allUserProgress.filter((item: any) => {
    if (!item.skillRoadmap) return item.skillRoadmapId === dbRoadmap.id;
    return (
      normalizeSkillKey(item.skillRoadmap.skillKey) === roadmap.skillKey ||
      item.skillRoadmapId === dbRoadmap.id
    );
  });

  if (matchingEntries.length > 0) {
    const primary = matchingEntries[0];
    const updated = await (prisma as any).userSkillProgress.update({
      where: { id: primary.id },
      data: {
        skillRoadmapId: dbRoadmap.id,
        status,
        learnedAt: status === "learned" ? new Date() : null,
      },
    });

    if (matchingEntries.length > 1) {
      const duplicateIds = matchingEntries.slice(1).map((e: any) => e.id);
      await (prisma as any).userSkillProgress.deleteMany({
        where: { id: { in: duplicateIds } },
      });
    }

    return updated;
  } else {
    return await (prisma as any).userSkillProgress.create({
      data: {
        userId,
        skillRoadmapId: dbRoadmap.id,
        status,
        learnedAt: status === "learned" ? new Date() : null,
      },
    });
  }
}

export async function deleteUserSkillProgress(userId: string, skillName: string) {
  const roadmapKey = normalizeSkillKey(skillName);

  const allUserProgress = await (prisma as any).userSkillProgress.findMany({
    where: { userId },
    include: { skillRoadmap: true },
  });

  const matchingIds = allUserProgress
    .filter((item: any) => {
      if (!item.skillRoadmap) return false;
      const canonical = normalizeSkillKey(item.skillRoadmap.skillKey);
      return canonical === roadmapKey || normalizeSkillKey(item.skillRoadmap.skill) === roadmapKey;
    })
    .map((item: any) => item.id);

  if (matchingIds.length > 0) {
    await (prisma as any).userSkillProgress.deleteMany({
      where: { id: { in: matchingIds } },
    });
  }

  return { deletedCount: matchingIds.length };
}
