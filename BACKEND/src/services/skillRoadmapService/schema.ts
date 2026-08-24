import { z } from "zod";

export const skillRoadmapSchema = z.object({
  skill: z.string().min(1),
  skillKey: z.string().min(1),
  category: z.string().default("skill"),
  officialDocs: z.object({ title: z.string(), url: z.string().url() }).nullable(),
  playground: z.object({ title: z.string(), url: z.string().url() }).nullable(),
  projectIdeas: z.array(z.string().min(1)).min(1).max(5),
  courseLinks: z.array(z.object({ title: z.string(), url: z.string().url() })).max(4),
});

export type SkillRoadmapData = z.infer<typeof skillRoadmapSchema>;
