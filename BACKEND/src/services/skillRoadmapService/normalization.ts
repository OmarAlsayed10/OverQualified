
const SKILL_ALIASES: Record<string, string> = {
  postgres: "postgresql",
  postgresql: "postgresql",
  "postgre-sql": "postgresql",
  "postgres-database": "postgresql",
  "postgresql-database": "postgresql",
  "postgres-db": "postgresql",
  "postgres-sql": "postgresql",
  "relational-database-postgresql": "postgresql",
  "relational-database": "postgresql",
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  react: "react",
  reactjs: "react",
  "react-js": "react",
  node: "nodejs",
  nodejs: "nodejs",
  "node-js": "nodejs",
  next: "nextjs",
  nextjs: "nextjs",
  "next-js": "nextjs",
  docker: "docker",
  k8s: "kubernetes",
  kubernetes: "kubernetes",
};

export function normalizeSkillKey(skillName: string): string {
  if (!skillName || typeof skillName !== "string") return "";
  const baseKey = skillName
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  if (SKILL_ALIASES[baseKey]) return SKILL_ALIASES[baseKey];

  if (/postgres|pg-sql|pg-vector|postgre/i.test(baseKey)) return "postgresql";

  const isSingleToken = !baseKey.includes("-");
  if (isSingleToken) {
    if (/^react/i.test(baseKey)) return "react";
    if (/^node/i.test(baseKey)) return "nodejs";
    if (/^next/i.test(baseKey)) return "nextjs";
    if (/^vue/i.test(baseKey)) return "vuejs";
    if (/^express/i.test(baseKey)) return "expressjs";
    if (/^docker/i.test(baseKey)) return "docker";
    if (/^kubernetes|^k8s/i.test(baseKey)) return "kubernetes";
    if (/^ts$|^typescript/i.test(baseKey)) return "typescript";
    if (/^js$|^javascript/i.test(baseKey)) return "javascript";
    if (/^python/i.test(baseKey)) return "python";
    if (/^mongo/i.test(baseKey)) return "mongodb";
  }

  return baseKey;
}

export function extractCoreSkillQuery(skillName: string): string {
  if (!skillName || typeof skillName !== "string") return "technology";
  let cleaned = skillName
    .replace(/^(experience with|knowledge of|proficiency in|strong background in|hands-on experience with|ability to|understanding of|familiarity with|working knowledge of|expert in|skills in|demonstrated experience with)\s+/i, "")
    .replace(/\s+(on the|in the|for the|with|and|or)\s+(frontend|backend|data layer|fullstack|stack|system|application|environment|infrastructure|team|role|project).*$/i, "")
    .trim();

  if (!cleaned || cleaned.length > 50) {
    const words = skillName.replace(/[^\w\s#+.-]/g, "").split(/\s+/).filter(w => w.length > 2);
    cleaned = words.slice(0, 4).join(" ");
  }
  return cleaned || skillName.trim().slice(0, 40);
}
