import { githubGet, lastPageFromLinkHeader, parseGithubRepoUrl } from "../../lib/githubClient";
import { gitlabGet, gitlabProjectId, parseGitlabRepoUrl } from "../../lib/gitlabClient";
import { GitHostError } from "../../lib/gitHostError";

export type GitHost = "github" | "gitlab";
export type OwnershipLevel = "sole" | "primary" | "major" | "contributor";

export interface RepoAuthor {
  login: string;
  email?: string;
  commits: number;
  share: number;
}

export interface RepoEvidence {
  host: GitHost;
  repoUrl: string;
  owner: string;
  repo: string;
  description: string;
  totalCommits: number;
  authors: RepoAuthor[];
  languages: string[];
  dependencies: string[];
  firstCommit: string;
  lastCommit: string;
  matchedAuthor?: RepoAuthor;
  ownership?: OwnershipLevel;
}

const DEPENDENCY_MANIFESTS = [
  "package.json",
  "BACKEND/package.json",
  "FRONTEND/package.json",
  "backend/package.json",
  "frontend/package.json",
];

const BRANCHES = ["main", "master"];

export function classifyOwnership(share: number): OwnershipLevel {
  if (share >= 0.9) return "sole";
  if (share >= 0.5) return "primary";
  if (share >= 0.2) return "major";
  return "contributor";
}

export function describeOwnership(author: RepoAuthor, totalCommits: number): string {
  const level = classifyOwnership(author.share);
  const counted = `${author.commits} of ${totalCommits} commits`;
  if (level === "sole") return `Sole engineer, ${counted}`;
  if (level === "primary") return `Primary engineer, ${counted}`;
  if (level === "major") return `Major contributor, ${counted}`;
  return `Contributor, ${counted}`;
}

function toAuthors(entries: Array<{ login: string; email?: string; commits: number }>): RepoAuthor[] {
  const total = entries.reduce((sum, entry) => sum + entry.commits, 0);
  if (total === 0) return [];

  return entries
    .map((entry) => ({ ...entry, share: entry.commits / total }))
    .sort((a, b) => b.commits - a.commits);
}

function dependenciesFromManifest(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Object.keys({ ...parsed?.dependencies, ...parsed?.devDependencies });
  } catch {
    return [];
  }
}

async function githubEvidence(
  owner: string,
  repo: string,
  token?: string,
): Promise<Omit<RepoEvidence, "matchedAuthor" | "ownership">> {
  const [meta, contributors, languages] = await Promise.all([
    githubGet<{ description?: string }>(`/repos/${owner}/${repo}`, token),
    githubGet<Array<{ login: string; contributions: number }>>(
      `/repos/${owner}/${repo}/contributors?per_page=100`,
      token,
    ),
    githubGet<Record<string, number>>(`/repos/${owner}/${repo}/languages`, token).catch(() => ({
      data: {} as Record<string, number>,
      linkHeader: "",
    })),
  ]);

  const authors = toAuthors(
    (contributors.data || [])
      .filter((entry) => entry?.login)
      .map((entry) => ({ login: entry.login, commits: entry.contributions || 0 })),
  );

  const dependencies = new Set<string>();
  for (const manifest of DEPENDENCY_MANIFESTS) {
    try {
      const { data } = await githubGet<{ content?: string; encoding?: string }>(
        `/repos/${owner}/${repo}/contents/${manifest}`,
        token,
      );
      if (data?.content && data.encoding === "base64") {
        dependenciesFromManifest(Buffer.from(data.content, "base64").toString("utf8")).forEach(
          (name) => dependencies.add(name),
        );
      }
    } catch {
      continue;
    }
  }

  const newest = await githubGet<Array<{ commit?: { author?: { date?: string } } }>>(
    `/repos/${owner}/${repo}/commits?per_page=1`,
    token,
  ).catch(() => ({ data: [], linkHeader: "" }));

  const lastPage = lastPageFromLinkHeader(newest.linkHeader);
  const oldest = lastPage
    ? await githubGet<Array<{ commit?: { author?: { date?: string } } }>>(
        `/repos/${owner}/${repo}/commits?per_page=1&page=${lastPage}`,
        token,
      ).catch(() => ({ data: [], linkHeader: "" }))
    : newest;

  return {
    host: "github",
    repoUrl: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    description: meta.data?.description || "",
    totalCommits: authors.reduce((sum, author) => sum + author.commits, 0),
    authors,
    languages: Object.entries(languages.data || {})
      .sort(([, a], [, b]) => b - a)
      .map(([language]) => language),
    dependencies: [...dependencies],
    firstCommit: oldest.data?.[0]?.commit?.author?.date || "",
    lastCommit: newest.data?.[0]?.commit?.author?.date || "",
  };
}

async function gitlabEvidence(
  owner: string,
  repo: string,
  token?: string,
): Promise<Omit<RepoEvidence, "matchedAuthor" | "ownership">> {
  const projectId = gitlabProjectId(owner, repo);

  const [meta, contributors, languages] = await Promise.all([
    gitlabGet<{ description?: string; web_url?: string }>(`/projects/${projectId}`, token),
    gitlabGet<Array<{ name: string; email: string; commits: number }>>(
      `/projects/${projectId}/repository/contributors?per_page=100`,
      token,
    ),
    gitlabGet<Record<string, number>>(`/projects/${projectId}/languages`, token).catch(() => ({
      data: {} as Record<string, number>,
      total: null,
    })),
  ]);

  const authors = toAuthors(
    (contributors.data || [])
      .filter((entry) => entry?.name || entry?.email)
      .map((entry) => ({
        login: entry.name || entry.email,
        email: entry.email,
        commits: entry.commits || 0,
      })),
  );

  const dependencies = new Set<string>();
  for (const branch of BRANCHES) {
    for (const manifest of DEPENDENCY_MANIFESTS) {
      try {
        const { data } = await gitlabGet<{ content?: string; encoding?: string }>(
          `/projects/${projectId}/repository/files/${encodeURIComponent(manifest)}?ref=${branch}`,
          token,
        );
        if (data?.content) {
          dependenciesFromManifest(Buffer.from(data.content, "base64").toString("utf8")).forEach(
            (name) => dependencies.add(name),
          );
        }
      } catch {
        continue;
      }
    }
    if (dependencies.size > 0) break;
  }

  const commits = await gitlabGet<Array<{ committed_date?: string; created_at?: string }>>(
    `/projects/${projectId}/repository/commits?per_page=1`,
    token,
  ).catch(() => ({ data: [], total: null }));

  const oldest =
    commits.total && commits.total > 1
      ? await gitlabGet<Array<{ committed_date?: string; created_at?: string }>>(
          `/projects/${projectId}/repository/commits?per_page=1&page=${commits.total}`,
          token,
        ).catch(() => ({ data: [], total: null }))
      : commits;

  const commitDate = (entry?: { committed_date?: string; created_at?: string }) =>
    entry?.committed_date || entry?.created_at || "";

  return {
    host: "gitlab",
    repoUrl: meta.data?.web_url || `https://gitlab.com/${owner}/${repo}`,
    owner,
    repo,
    description: meta.data?.description || "",
    totalCommits: authors.reduce((sum, author) => sum + author.commits, 0),
    authors,
    languages: Object.entries(languages.data || {})
      .sort(([, a], [, b]) => b - a)
      .map(([language]) => language),
    dependencies: [...dependencies],
    firstCommit: commitDate(oldest.data?.[0]),
    lastCommit: commitDate(commits.data?.[0]),
  };
}

const matches = (author: RepoAuthor, identity: string): boolean => {
  const needle = identity.trim().toLowerCase();
  return author.login.toLowerCase() === needle || (author.email || "").toLowerCase() === needle;
};

export async function analyzeRepo(
  repoUrl: string,
  options: { token?: string; authorIdentities?: string[] } = {},
): Promise<RepoEvidence> {
  const { token, authorIdentities = [] } = options;

  const github = parseGithubRepoUrl(repoUrl);
  const gitlab = github ? null : parseGitlabRepoUrl(repoUrl);
  if (!github && !gitlab) {
    throw new GitHostError(400, "Only GitHub and GitLab repository URLs are supported.");
  }

  const base = github
    ? await githubEvidence(github.owner, github.repo, token)
    : await gitlabEvidence(gitlab!.owner, gitlab!.repo, token);

  const claimed = base.authors.filter((author) =>
    authorIdentities.some((identity) => matches(author, identity)),
  );

  if (claimed.length === 0) return base;

  const commits = claimed.reduce((sum, author) => sum + author.commits, 0);
  const matchedAuthor: RepoAuthor = {
    login: claimed[0].login,
    email: claimed[0].email,
    commits,
    share: base.totalCommits === 0 ? 0 : commits / base.totalCommits,
  };

  return { ...base, matchedAuthor, ownership: classifyOwnership(matchedAuthor.share) };
}

export function evidenceSourceText(evidence: RepoEvidence): string {
  return [
    evidence.description,
    evidence.matchedAuthor
      ? describeOwnership(evidence.matchedAuthor, evidence.totalCommits)
      : "",
    `Total commits: ${evidence.totalCommits}`,
    `Languages: ${evidence.languages.join(", ")}`,
    `Dependencies: ${evidence.dependencies.join(", ")}`,
    `First commit: ${evidence.firstCommit}`,
    `Last commit: ${evidence.lastCommit}`,
  ]
    .filter(Boolean)
    .join("\n");
}
