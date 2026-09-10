export const PROJECT_OWNERSHIP = ["employed", "freelance", "founded", "independent"] as const;

export type ProjectOwnership = (typeof PROJECT_OWNERSHIP)[number];

const OWNERSHIP_LABELS: Record<ProjectOwnership, string> = {
  employed: "Built at work",
  freelance: "Freelance client engagement",
  founded: "Commercial product",
  independent: "Independent project",
};

export const isProjectOwnership = (value: unknown): value is ProjectOwnership =>
  PROJECT_OWNERSHIP.includes(value as ProjectOwnership);

export const coerceProjectOwnership = (value: unknown): ProjectOwnership =>
  isProjectOwnership(value) ? value : "independent";

export function ownershipLabel(ownership: ProjectOwnership, roleDetail = ""): string {
  const base = OWNERSHIP_LABELS[ownership];
  return roleDetail ? `${base} | ${roleDetail}` : base;
}
