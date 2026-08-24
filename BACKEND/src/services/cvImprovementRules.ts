import type { ScoreDimension } from "./cvScoring";

const CANDIDATE_EVIDENCE_PATTERN = /quantif|with numbers?|no numbers?|percentage|measurable (?:result|outcome)|impact metrics?|(?:verified|exact|\$)\s?figure|numeric result|exact evidence|adding? a number|include a result|gpa/i;
const NO_ISSUE_PATTERN = /nothing blocking|strong here|strong — no specific issue|nothing to fix/i;

export const requiresCandidateEvidence = (recommendation: string): boolean =>
  CANDIDATE_EVIDENCE_PATTERN.test(recommendation);

export const fixableDimensionDetails = (dimensions: ScoreDimension[]): ScoreDimension[] =>
  dimensions
    .map((dimension) => ({
      ...dimension,
      details: dimension.details.filter((detail) =>
        !requiresCandidateEvidence(detail) && !NO_ISSUE_PATTERN.test(detail),
      ),
    }))
    .filter((dimension) => dimension.details.length > 0);
