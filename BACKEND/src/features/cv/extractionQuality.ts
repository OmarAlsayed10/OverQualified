import { getDocumentProxy } from "unpdf";
import { experienceSection } from "./cvScoring/textParse";
import { estimateYearsExperience } from "./cvScoring/levelModel";

// A PDF stores drawing instructions; its readable text is a side-channel the generator may fill in
// well, badly, or not at all. When it is filled in badly we read a partial CV and score it as if it
// were whole — a LaTeX CV came through with every line cut to ~57 characters, which destroyed all
// three of its date ranges and dropped a four-year engineer to Fresh.
// These signals say "we probably did not read this file properly". They are recorded, never shown:
// the user's CV is fine, it is our reading of it that failed.

export interface ExtractionQuality {
  pages: number;
  charsPerPage: number;
  lineClustering: number;
  experienceFound: boolean;
  datesParsed: boolean;
  suspect: boolean;
}

// A width-based truncation leaves nearly every long line the same length. Real prose does not.
const MIN_LONG_LINE = 40;
const CLUSTERING_LIMIT = 0.5;
// Two pages of a real CV run past a thousand characters; near-zero means a scan with no text layer.
const MIN_CHARS_PER_PAGE = 200;

export const lineClustering = (text: string): number => {
  const long = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > MIN_LONG_LINE);
  if (!long.length) return 0;

  const counts = new Map<number, number>();
  for (const line of long) counts.set(line.length, (counts.get(line.length) ?? 0) + 1);

  let modal = 0;
  let modalCount = 0;
  for (const [length, n] of counts) {
    if (n > modalCount) {
      modal = length;
      modalCount = n;
    }
  }
  return long.filter((line) => Math.abs(line.length - modal) <= 3).length / long.length;
};

export const extractionQuality = (text: string, pages: number): ExtractionQuality => {
  const pageCount = Math.max(1, pages);
  const charsPerPage = Math.round(text.length / pageCount);
  const clustering = lineClustering(text);
  // An Experience section that is plainly there but yields no parseable date at all is the
  // cheapest signal of a bad read — a real CV always dates its roles.
  const hasExperience = experienceSection(text).length > 100;
  const datesParsed = estimateYearsExperience(text) > 0;

  // `suspect` means "we probably misread the file". It deliberately does NOT include a missing
  // experience section: a fresh graduate with only projects has none, and Fresh is the right answer
  // for them. Two of the sample CVs were exactly that. `experienceFound` and `datesParsed` are
  // recorded separately so a CV we could not level is still visible in the data — collapsing all
  // three into one flag is what hid four such CVs behind an "ok".
  return {
    pages: pageCount,
    charsPerPage,
    lineClustering: Number(clustering.toFixed(2)),
    experienceFound: hasExperience,
    datesParsed,
    suspect:
      clustering > CLUSTERING_LIMIT ||
      charsPerPage < MIN_CHARS_PER_PAGE ||
      (hasExperience && !datesParsed),
  };
};

// Which tool produced the file. This is the field that decides whether a bad read is a long tail or
// a handful of generators worth handling directly — no personal data in either value.
export const pdfOrigin = async (
  buffer: Buffer,
  mimeType: string,
): Promise<{ producer: string | null; creator: string | null }> => {
  if (mimeType !== "application/pdf") return { producer: null, creator: null };
  try {
    const document = await getDocumentProxy(new Uint8Array(buffer));
    const meta = (await document.getMetadata()) as unknown as { info?: Record<string, unknown> };
    const value = (key: string) => {
      const raw = meta.info?.[key];
      return typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 120) : null;
    };
    return { producer: value("Producer"), creator: value("Creator") };
  } catch {
    return { producer: null, creator: null };
  }
};
