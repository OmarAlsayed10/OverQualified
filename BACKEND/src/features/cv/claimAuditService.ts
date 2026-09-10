import { unsourcedNumbers } from "../../lib/evidenceGrounding";

export type ClaimSection = "experience" | "projects" | "summary";

export interface ClaimFinding {
  section: ClaimSection;
  entryIndex: number;
  statement: string;
  unsourced: string[];
  challenge: string;
}

export interface AuditableEntry {
  description: string;
  evidence?: string;
}

const UNVERIFIABLE_PATTERNS: Array<{ pattern: RegExp; challenge: string }> = [
  {
    pattern: /\b(?:satisfaction|nps|morale)\b/i,
    challenge: "Which survey produced this figure, and can you name it?",
  },
  {
    pattern: /\b(?:interview|hire|hiring|conversion|retention)\s+rate/i,
    challenge: "This is an outcome after the user leaves your product. How did you observe it?",
  },
  {
    pattern: /\b(?:concurrent|simultaneous)\s+users?\b/i,
    challenge: "Was this load tested? An interviewer will ask which tool and what the setup was.",
  },
  {
    pattern: /\b100\s*%|\bzero\s+(?:downtime|bugs|errors)\b/i,
    challenge: "Absolute claims invite disproof. State the capability instead of the percentage.",
  },
];

const splitStatements = (description: string): string[] =>
  description
    .split(/\n|•|(?<=\.)\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

function challengeFor(statement: string, unsourced: string[]): string {
  const unverifiable = UNVERIFIABLE_PATTERNS.find(({ pattern }) => pattern.test(statement));
  if (unverifiable) return unverifiable.challenge;
  return `"${unsourced.join('", "')}" has no source in the evidence provided. How would you defend it in an interview?`;
}

export function auditEntries(
  section: ClaimSection,
  entries: AuditableEntry[],
  fallbackEvidence = "",
): ClaimFinding[] {
  return entries.flatMap((entry, entryIndex) => {
    const source = `${entry.evidence || ""}\n${fallbackEvidence}`;

    return splitStatements(entry.description || "").flatMap((statement) => {
      const unsourced = unsourcedNumbers(statement, source);
      if (unsourced.length === 0) return [];

      return [
        {
          section,
          entryIndex,
          statement,
          unsourced,
          challenge: challengeFor(statement, unsourced),
        },
      ];
    });
  });
}

export interface AuditableCV {
  summary?: string;
  experience?: AuditableEntry[];
  projects?: AuditableEntry[];
}

export function auditCV(cv: AuditableCV, fallbackEvidence = ""): ClaimFinding[] {
  return [
    ...auditEntries("summary", cv.summary ? [{ description: cv.summary }] : [], fallbackEvidence),
    ...auditEntries("experience", cv.experience || [], fallbackEvidence),
    ...auditEntries("projects", cv.projects || [], fallbackEvidence),
  ];
}
