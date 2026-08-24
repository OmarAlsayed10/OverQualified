import { z } from "zod";
import prisma from "../../lib/prisma";
import { MODELS, groqChat } from "../../lib/groqChat";
import { parseAiResponse } from "../../lib/aiResponseValidation";
import { STATIC_ROADMAPS } from "./catalog";
import { extractCoreSkillQuery, normalizeSkillKey } from "./normalization";
import { SkillRoadmapData, skillRoadmapSchema } from "./schema";
import { sanitizeUrl } from "./urlResolver";

export async function getOrGenerateSkillRoadmap(skillName: string, category: string = "skill"): Promise<SkillRoadmapData> {
  const skillKey = normalizeSkillKey(skillName);

  try {
    const existing = await (prisma as any).skillRoadmap.findUnique({
      where: { skillKey },
    });
    if (existing) {
      return skillRoadmapSchema.parse({
        skill: existing.skill,
        skillKey: existing.skillKey,
        category: existing.category,
        officialDocs: existing.officialDocs,
        playground: existing.playground,
        projectIdeas: existing.projectIdeas,
        courseLinks: existing.courseLinks,
      });
    }
  } catch (err) {
    console.warn("DB lookup for skill roadmap failed, falling back:", err);
  }

  let staticKey = skillKey;
  if (!STATIC_ROADMAPS[staticKey]) {
    const knownKeys = Object.keys(STATIC_ROADMAPS);
    const matchedKey = knownKeys.find(k => skillKey.includes(k));
    if (matchedKey) {
      staticKey = matchedKey;
    }
  }

  if (STATIC_ROADMAPS[staticKey]) {
    const staticData = { ...STATIC_ROADMAPS[staticKey], skillKey };
    try {
      await (prisma as any).skillRoadmap.upsert({
        where: { skillKey },
        create: staticData,
        update: staticData,
      });
    } catch (err) {
      console.warn("Failed to persist static roadmap to DB:", err);
    }
    return staticData;
  }

  const coreQuery = extractCoreSkillQuery(skillName);
  const prompt = `You are a tech mentor creating a practical learning roadmap for a missing candidate skill or requirement: "${skillName}" (Core Technology: "${coreQuery}", category: "${category}").
Return JSON only in this exact format:
{
  "skill": "${coreQuery}",
  "officialDocs": { "title": "Official Docs / Guide Name", "url": "https://docs.domain.com/..." },
  "playground": { "title": "Interactive Sandbox / Playground Name", "url": "https://sandbox.com/..." },
  "projectIdeas": [
    "Practical project idea 1 that proves hands-on mastery for a resume",
    "Practical project idea 2 to test and publish"
  ],
  "courseLinks": [
    { "title": "High quality tutorial or video guide", "url": "https://youtube.com/..." }
  ]
}`;

  try {
    const response = await groqChat(
      {
        model: MODELS.versatile,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a career mentor. Return clean valid JSON adhering strictly to the requested schema." },
          { role: "user", content: prompt },
        ],
      },
      { fallback: false },
    );

    const rawContent = response.choices[0]?.message?.content || "";
    const parsedAi = parseAiResponse(rawContent, z.object({
      skill: z.string().default(skillName),
      officialDocs: z.object({ title: z.string(), url: z.string() }).nullable().optional(),
      playground: z.object({ title: z.string(), url: z.string() }).nullable().optional(),
      projectIdeas: z.array(z.string()).default([]),
      courseLinks: z.array(z.object({ title: z.string(), url: z.string() })).default([]),
    }));

    const projectIdeas = parsedAi.projectIdeas && parsedAi.projectIdeas.length > 0
      ? parsedAi.projectIdeas
      : [`Build a minimal demo project using ${skillName} and push it to GitHub.`];

    const officialDocs = parsedAi.officialDocs?.url
      ? { title: parsedAi.officialDocs.title, url: sanitizeUrl(parsedAi.officialDocs.url, skillName, "docs") }
      : { title: `${skillName} Official Documentation`, url: sanitizeUrl("", skillName, "docs") };

    const playground = parsedAi.playground?.url
      ? { title: parsedAi.playground.title, url: sanitizeUrl(parsedAi.playground.url, skillName, "playground") }
      : null;

    const courseLinks = (parsedAi.courseLinks || []).map(link => ({
      title: link.title,
      url: sanitizeUrl(link.url, skillName, "course"),
    }));

    if (courseLinks.length === 0) {
      courseLinks.push({
        title: `${skillName} 2026 Comprehensive Tutorial`,
        url: sanitizeUrl("", skillName, "course"),
      });
    }

    const result: SkillRoadmapData = {
      skill: parsedAi.skill || skillName,
      skillKey,
      category,
      officialDocs,
      playground,
      projectIdeas,
      courseLinks,
    };

    try {
      await (prisma as any).skillRoadmap.upsert({
        where: { skillKey },
        create: result,
        update: result,
      });
    } catch (dbErr) {
      console.warn("Failed to cache AI skill roadmap to DB:", dbErr);
    }

    return result;
  } catch (aiErr) {
    console.error("AI Skill Roadmap generation failed, using fallback:", aiErr);
    const fallbackResult: SkillRoadmapData = {
      skill: skillName,
      skillKey,
      category,
      officialDocs: { title: `${skillName} Documentation Guide`, url: sanitizeUrl("", skillName, "docs") },
      playground: null,
      projectIdeas: [
        `Build a hands-on project demonstrating ${skillName} and add it to your GitHub portfolio.`,
        `Write a clear summary of your work with ${skillName} in your CV experience section.`,
      ],
      courseLinks: [
        { title: `${skillName} Full Tutorial (YouTube/Search)`, url: sanitizeUrl("", skillName, "course") },
      ],
    };
    return fallbackResult;
  }
}
