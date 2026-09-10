import { extractCoreSkillQuery, normalizeSkillKey } from "../skillRoadmapService";

describe("skillRoadmapService utilities", () => {
  describe("extractCoreSkillQuery", () => {
    it("extracts core tech from verbose requirements", () => {
      const verbose = "Experience with PostgreSQL or Prisma on the frontend data layer";
      const result = extractCoreSkillQuery(verbose);
      expect(result).toBe("PostgreSQL or Prisma");
    });

    it("handles simple skill names", () => {
      expect(extractCoreSkillQuery("Docker")).toBe("Docker");
      expect(extractCoreSkillQuery("Kubernetes")).toBe("Kubernetes");
    });

    it("handles prefix phrases like proficiency in", () => {
      expect(extractCoreSkillQuery("Proficiency in React and Next.js")).toBe("React and Next.js");
    });
  });

  describe("normalizeSkillKey", () => {
    it("normalizes skill keys cleanly", () => {
      expect(normalizeSkillKey("React & Next.js")).toBe("react-next-js");
      expect(normalizeSkillKey("Docker Containerization")).toBe("docker-containerization");
    });
  });
});
