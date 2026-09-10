interface CvRoleSource {
  personalInfo?: { professionalTitle?: string };
  experience?: Array<{ jobTitle?: string }>;
  projects?: Array<{ technologies?: string; description?: string }>;
}

const BACKEND_PROJECT = /\b(?:node(?:\.js)?|nest(?:js)?|express|django|flask|spring|laravel|asp\.net)\b/i;
const GENERIC_ROLE_WORDS = new Set(["developer", "engineer", "engineering", "junior", "lead", "mid", "senior", "software", "web"]);

export const roleSuggestionsFromCv = (cv: CvRoleSource | null | undefined): string[] => {
  const projectEvidence = (cv?.projects ?? []).map((project) => `${project.technologies ?? ""} ${project.description ?? ""}`).join(" ");
  const roles = [
    cv?.personalInfo?.professionalTitle,
    BACKEND_PROJECT.test(projectEvidence) ? "Backend Developer" : undefined,
    ...(cv?.experience ?? []).map((experience) => experience.jobTitle),
  ];
  const seen = new Set<string>();
  return roles.flatMap((role) => {
    const trimmedRole = role?.trim();
    if (!trimmedRole) return [];
    const key = trimmedRole.toLocaleLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    return [trimmedRole];
  }).slice(0, 6);
};

export const roleSuggestionForJobDescription = (roles: string[], jobDescription: string): string | undefined => {
  const vacancy = jobDescription.toLocaleLowerCase();
  const exactRole = roles.find((role) => vacancy.includes(role.toLocaleLowerCase()));
  if (exactRole) return exactRole;
  const ranked = roles.map((role) => {
    const terms = role.toLocaleLowerCase().match(/[a-z0-9+#.]+/g)?.filter((term) => !GENERIC_ROLE_WORDS.has(term)) ?? [];
    const score = terms.reduce((total, term) => total + (vacancy.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"))?.length ?? 0), 0);
    return { role, score };
  }).sort((left, right) => right.score - left.score);
  return ranked[0]?.score ? ranked[0].role : undefined;
};
