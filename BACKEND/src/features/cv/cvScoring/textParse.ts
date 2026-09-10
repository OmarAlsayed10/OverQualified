import {
  PrimarySection,
  BULLET_PREFIX,
  BULLET_STRIP,
  BULLET_LABEL,
  ACTION_VERB,
  STD_HEADINGS,
  MONTH_YEAR_DATE,
  KEYWORD_SECTION,
} from "./constants";

export function trimmedLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function headingFamily(line: string): PrimarySection | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 45) return null;
  if (
    /^(professional\s+|career\s+|executive\s+)?(summary|profile|objective|about)\s*:?\s*$/i.test(
      trimmed,
    )
  )
    return "summary";
  if (
    /^((work\s+|professional\s+|relevant\s+)?experience|employment|work\s*history|employment\s*history|job\s*history|career\s*history|professional\s*background|responsibilities)\s*:?\s*$/i.test(
      trimmed,
    )
  )
    return "experience";
  if (
    /^(skills|technical\s+skills|technologies|competencies|tools|expertise)\s*:?\s*$/i.test(
      trimmed,
    )
  )
    return "skills";
  if (
    /^(education|academic\s*background|studies|degree)\s*:?\s*$/i.test(trimmed)
  )
    return "education";
  return null;
}

export function detectPrimarySectionOrder(text: string): PrimarySection[] {
  const seen = new Set<PrimarySection>();
  const order: PrimarySection[] = [];

  for (const line of trimmedLines(text)) {
    const family = headingFamily(line);
    if (!family || seen.has(family)) continue;
    seen.add(family);
    order.push(family);
  }

  return order;
}

export function suspiciousColumnLines(text: string): string[] {
  const lines = trimmedLines(text);
  const firstHeading = lines.findIndex(
    (l) => headingFamily(l) || isHeadingLine(l),
  );
  return lines.filter((line, i) => {
    const inHeaderBlock = firstHeading === -1 ? i < 3 : i < firstHeading;
    const pipeCount = (line.match(/[|┃│]/g) || []).length;
    const isLikelyContactLine =
      inHeaderBlock ||
      /@|linkedin|github|portfolio|https?:\/\//i.test(line) ||
      /(\+?\d[\d\s\-()/.]{6,}\d)/.test(line);
    const isShortPipeSeparatedList =
      pipeCount >= 2 &&
      line.length <= 120 &&
      line.split("|").every((part) =>
        /^[\p{L}\p{N}+#./&+\- ]{1,40}$/u.test(part.trim()),
      );

    if (/\t/.test(line)) return true;
    if (pipeCount >= 2 && !isLikelyContactLine && !isShortPipeSeparatedList)
      return true;
    if (/^\|.+\|$/.test(line) && !isLikelyContactLine) return true;
    return false;
  });
}

export function bulletStyleDetails(text: string): {
  styles: string[];
  standaloneMarkers: number;
  bulletCount: number;
} {
  const styles = new Set<string>();
  let standaloneMarkers = 0;
  let bulletCount = 0;

  for (const rawLine of text.split("\n")) {
    const trimmed = rawLine.trim();
    if (!BULLET_PREFIX.test(trimmed)) continue;
    bulletCount += 1;
    styles.add(trimmed[0]);
    if (/^[-•*–▪●‣⁃+>]$/.test(trimmed)) standaloneMarkers += 1;
  }

  return { styles: [...styles], standaloneMarkers, bulletCount };
}

export function detectDateStyles(text: string): string[] {
  const styles = new Set<string>();

  // Drop date-of-birth lines — a DOB like 24/10/2002 is not a role date format.
  const scan = text
    .split("\n")
    .filter((l) => !/\b(date\s+of\s+birth|d\.?o\.?b\.?|born)\b/i.test(l))
    .join("\n");

  // Spelled-out dating (Jan 2023, 2019–2021, 2023 – Present) vs numeric (01/2023).
  // Month-year and year-only are the SAME family — mixing them (jobs vs education)
  // is normal, not an inconsistency. Only spelled-out vs numeric is a real clash.
  const spelledOut =
    MONTH_YEAR_DATE.test(scan) ||
    /\b(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:present|current|now|ongoing|(?:19|20)\d{2})\b/i.test(
      scan,
    );
  if (spelledOut) styles.add("spelled-out");
  if (/\b(0?[1-9]|1[0-2])[\/\-.](19|20)\d{2}\b/.test(scan)) {
    styles.add("numeric");
  }

  return [...styles];
}

export function contentLines(text: string, bulletsOnly = false): string[] {
  const raw = text.split("\n");
  const merged: string[] = [];
  const fromBullet: boolean[] = [];

  for (const rawLine of raw) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (BULLET_PREFIX.test(trimmed)) {
      merged.push(trimmed.replace(BULLET_STRIP, "").trim());
      fromBullet.push(true);
      continue;
    }

    if (isHeadingLine(trimmed)) {
      merged.push(trimmed);
      fromBullet.push(false);
      continue;
    }

    if (merged.length > 0) {
      merged[merged.length - 1] +=
        `${merged[merged.length - 1] ? " " : ""}${trimmed}`;
    } else {
      merged.push(trimmed);
      fromBullet.push(false);
    }
  }

  return merged.filter(
    (l, i) =>
      l.length > 20 &&
      !isHeadingLine(l) &&
      !/https?:\/\//i.test(l) &&
      !/\b(demo|github\.com)\b/i.test(l) &&
      (!bulletsOnly || fromBullet[i]),
  );
}

export function isHeadingLine(line: string): boolean {
  const t = line.trim();
  return (
    t.length < 32 &&
    (/^[A-Z][A-Z\s&/]{2,}$/.test(t) ||
      STD_HEADINGS.some((h) => new RegExp(`^\\s*${h}\\s*:?\\s*$`, "i").test(t)))
  );
}

// Pull achievement bullets from an experience/projects block, glyph or glyph-less.
// PDFs often strip bullet markers, so we also start a new bullet on a "Label:" lead
// or an action-verb line, and merge lowercase wrap-lines into the current bullet.
export function experienceBullets(block: string): string[] {
  const raw = block
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim());

  const isHeader = (l: string): boolean => {
    const t = l.trim();
    return (
      / \| /.test(t) ||
      /\b(19|20)\d{2}\s*(?:–|-|—|to)\s*(?:present|current|now|(?:19|20)\d{2})\b/i.test(
        t,
      ) ||
      /^(role|tech|tech stack|technologies|stack|company)\s*:/i.test(t) ||
      /\bgithub repository\b/i.test(t) ||
      isHeadingLine(t)
    );
  };

  const startsBullet = (l: string): boolean => {
    const t = l.trim();
    const stripped = t.replace(BULLET_LABEL, "");
    return (
      BULLET_PREFIX.test(t) ||
      BULLET_LABEL.test(t) ||
      ACTION_VERB.test(stripped)
    );
  };

  const bullets: string[] = [];
  for (const line of raw) {
    if (isHeader(line)) continue;
    const clean = line.trim().replace(BULLET_STRIP, "");
    if (startsBullet(line)) bullets.push(clean);
    else if (bullets.length) bullets[bullets.length - 1] += ` ${clean}`;
  }
  return bullets.filter((b) => b.length > 20 && !/https?:\/\//i.test(b));
}

// Slice the Experience/Employment portion so education/degree date ranges don't
// get counted as work experience.
export function experienceSection(text: string): string {
  const lines = text.split("\n");
  // Real CVs label this section more loosely than the original list allowed — one in the sample set
  // headed its entire work history "RESPONSIBILITIES", so we found no section, parsed no dates, and
  // called a working candidate Fresh.
  const EXP_RE =
    /^\s*[-•*–▪●‣⁃+>]?\s*(work\s+|professional\s+|relevant\s+)?(experience|employment|work\s*history|employment\s*history|job\s*history|career\s*history|professional\s*background|responsibilities)\b/i;
  const STOP_RE =
    /^\s*[-•*–▪●‣⁃+>]?\s*(education|academic\s*background|studies|degree|skills|technical\s*skills|technologies|expertise|certifications?|courses?|awards?|honors?|references?|languages?|summary|profile|about\s*me|contact)\b/i;

  const start = lines.findIndex((l) => {
    const trimmed = l.trim();
    return trimmed.length < 45 && EXP_RE.test(trimmed);
  });
  if (start === -1) return "";

  const stop = lines.slice(start + 1).findIndex((l) => {
    const trimmed = l.trim();
    return (
      trimmed.length < 45 &&
      (STOP_RE.test(trimmed) ||
        /^\s*(personal\s+|academic\s+|selected\s+|technical\s+)?projects\b/i.test(
          trimmed,
        ))
    );
  });
  const end = stop === -1 ? lines.length : start + 1 + stop;
  return lines.slice(start + 1, end).join("\n");
}

export function projectsSection(text: string): string {
  const lines = text.split("\n");
  const PROJ_RE =
    /^\s*[-•*–▪●‣⁃+>]?\s*(personal\s+|academic\s+|selected\s+|technical\s+)?projects\b/i;
  const STOP_RE =
    /^\s*[-•*–▪●‣⁃+>]?\s*(education|academic\s*background|studies|degree|skills|technical\s*skills|technologies|expertise|certifications?|courses?|awards?|honors?|references?|languages?|summary|profile|about\s*me|contact)\b/i;
  // Real CVs label this section more loosely than the original list allowed — one in the sample set
  // headed its entire work history "RESPONSIBILITIES", so we found no section, parsed no dates, and
  // called a working candidate Fresh.
  const EXP_RE =
    /^\s*[-•*–▪●‣⁃+>]?\s*(work\s+|professional\s+|relevant\s+)?(experience|employment|work\s*history|employment\s*history|job\s*history|career\s*history|professional\s*background|responsibilities)\b/i;

  const start = lines.findIndex((l) => {
    const trimmed = l.trim();
    return trimmed.length < 45 && PROJ_RE.test(trimmed);
  });
  if (start === -1) return "";

  const stop = lines.slice(start + 1).findIndex((l) => {
    const trimmed = l.trim();
    return (
      trimmed.length < 45 && (STOP_RE.test(trimmed) || EXP_RE.test(trimmed))
    );
  });
  const end = stop === -1 ? lines.length : start + 1 + stop;
  return lines.slice(start + 1, end).join("\n");
}

export function summarySection(text: string): string {
  const lines = text.split("\n");
  const START =
    /^\s*(professional\s+|career\s+|executive\s+)?(summary|profile|objective|about\s*me)\s*:?\s*$/i;
  const start = lines.findIndex((l) => START.test(l.trim()));
  if (start === -1) return "";
  const rel = lines
    .slice(start + 1)
    .findIndex((l) => headingFamily(l.trim()) || isHeadingLine(l.trim()));
  const end = rel === -1 ? Math.min(lines.length, start + 6) : start + 1 + rel;
  return lines.slice(start + 1, end).join(" ").trim();
}

const SKILLS_HEADING = /\b(skills|technologies|competencies|tools|expertise)\b/i;

export function skillTokens(text: string): string[] {
  const lines = text.split("\n");
  // Anchor on a heading, not on any line containing the word. A summary reading "Strong
  // interpersonal skills, teamwork abilities" used to win the match, after which the parser
  // read the experience bullets as the skills list.
  const idx = lines.findIndex((l) => {
    const head = l.trim();
    return SKILLS_HEADING.test(head) && (isHeadingLine(head) || headingFamily(head) === "skills");
  });
  if (idx === -1) return [];

  const body: string[] = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (isHeadingLine(line) || headingFamily(line)) break;
    body.push(line);
  }

  return body
    // PDF text extraction wraps long lines mid-word ("Time Man-" / "agement"); rejoin those
    // before splitting, or the hyphenated halves count as two junk skills.
    .join("\n")
    .replace(/-\n/g, "")
    .replace(/\n/g, ", ")
    .split(/[,|•]/)
    .map((s) => s.replace(/^[a-z ]+:/i, "").trim())
    .filter((s) => s.length > 1 && s.length < 40);
}

export function keywordTokens(text: string): Set<string> {
  const lines = text.split("\n");
  const out = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const head = lines[i].trim();
    if (head.length > 45 || !KEYWORD_SECTION.test(head)) continue;
    for (let j = i + 1; j < Math.min(lines.length, i + 18); j++) {
      const raw = lines[j].trim();
      if (!raw) continue;
      if (headingFamily(raw) || isHeadingLine(raw)) break;
      for (const seg of raw.split(/[,|•·;/–—]/)) {
        const s = seg
          .replace(BULLET_STRIP, "")
          .replace(/^[A-Za-z ]{1,30}:/, "")
          .trim();
        if (s.length >= 2 && s.length <= 40 && /[A-Za-z]/.test(s) && s.split(/\s+/).length <= 6)
          out.add(s.toLowerCase());
      }
    }
  }
  return out;
}
