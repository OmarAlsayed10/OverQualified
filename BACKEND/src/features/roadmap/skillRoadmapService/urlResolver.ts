import { extractCoreSkillQuery } from "./normalization";

const fallbackUrl =(skillName: string, type: "docs" | "course" | "playground"): string => {
  const query = extractCoreSkillQuery(skillName);
  if (type === "docs") {
    return `https://www.google.com/search?q=${encodeURIComponent(query + " official documentation guide")}`;
  }
  if (type === "playground") {
    return `https://github.com/search?q=${encodeURIComponent(query + " starter playground sandbox")}&type=repositories`;
  }
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " tutorial course 2026")}`;
}

export const sanitizeUrl =(rawUrl: string, skillName: string, type: "docs" | "course" | "playground"): string => {
  if (!rawUrl || typeof rawUrl !== "string") {
    return fallbackUrl(skillName, type);
  }

  const query = extractCoreSkillQuery(skillName);

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();

    if (parsed.searchParams.has("q") || parsed.searchParams.has("query") || parsed.searchParams.has("search_query")) {
      return rawUrl;
    }

    const exactValidPrefixes = [
      "https://docs.docker.com",
      "https://kubernetes.io/docs",
      "https://react.dev",
      "https://www.typescriptlang.org",
      "https://typescriptlang.org",
      "https://www.postgresql.org/docs",
      "https://postgresql.org/docs",
      "https://developer.mozilla.org",
      "https://nextjs.org/docs",
      "https://prisma.io/docs",
      "https://www.prisma.io/docs",
      "https://labs.play-with-docker.com",
      "https://stackblitz.com",
      "https://killercoda.com",
      "https://db-fiddle.com",
      "https://codesandbox.io",
    ];

    if (exactValidPrefixes.some(prefix => rawUrl.startsWith(prefix))) {
      return rawUrl;
    }

    if (host.includes("coursera.org")) {
      return `https://www.coursera.org/search?query=${encodeURIComponent(query)}`;
    }
    if (host.includes("github.com")) {
      return `https://github.com/search?q=${encodeURIComponent(query + " starter playground")}&type=repositories`;
    }
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " tutorial course 2026")}`;
    }
    if (host.includes("freecodecamp.org")) {
      return `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(query)}`;
    }
  } catch {
  }

  return fallbackUrl(skillName, type);
}
