import { STATIC_ROADMAPS } from "./catalog";
import { SkillRoadmapData } from "./schema";

export function get2026MarketTrendRecommendations(): SkillRoadmapData[] {
  return [
    {
      skill: "AI Agentic Systems & Autonomous Workflows",
      skillKey: "ai-agents",
      category: "2026_market_trend",
      officialDocs: STATIC_ROADMAPS["ai-agents"].officialDocs,
      playground: STATIC_ROADMAPS["ai-agents"].playground,
      projectIdeas: STATIC_ROADMAPS["ai-agents"].projectIdeas,
      courseLinks: STATIC_ROADMAPS["ai-agents"].courseLinks,
    },
    {
      skill: "Full-Stack Web Architecture (Next.js & Prisma)",
      skillKey: "fullstack-nextjs",
      category: "2026_market_trend",
      officialDocs: STATIC_ROADMAPS["fullstack-nextjs"].officialDocs,
      playground: STATIC_ROADMAPS["fullstack-nextjs"].playground,
      projectIdeas: STATIC_ROADMAPS["fullstack-nextjs"].projectIdeas,
      courseLinks: STATIC_ROADMAPS["fullstack-nextjs"].courseLinks,
    },
    {
      skill: "Docker & Cloud Native Containerization",
      skillKey: "docker",
      category: "2026_market_trend",
      officialDocs: STATIC_ROADMAPS["docker"].officialDocs,
      playground: STATIC_ROADMAPS["docker"].playground,
      projectIdeas: STATIC_ROADMAPS["docker"].projectIdeas,
      courseLinks: STATIC_ROADMAPS["docker"].courseLinks,
    },
  ];
}
