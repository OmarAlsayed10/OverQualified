import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { extractText } from "../shared/extraction/extractTextService";
import { extractionQuality, pdfOrigin } from "../features/cv/extractionQuality";

// Runs the real upload pipeline over a folder of sample CVs and reports how many we read badly.
// This is the pre-launch version of the telemetry: it answers "do we need a second PDF engine?"
// from files you gather yourself, with no user data involved.
//
//   npx tsx src/scripts/auditCvCorpus.ts "C:/path/to/cv-samples"

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
};

const audit = async (folder: string) => {
  const files = readdirSync(folder)
    .map((name) => join(folder, name))
    .filter((path) => statSync(path).isFile());

  if (!files.length) {
    console.log(`No files in ${folder}`);
    return;
  }

  const rows: Record<string, unknown>[] = [];
  let unsupported = 0;
  let failed = 0;

  for (const path of files) {
    const name = path.split(/[\\/]/).pop()!;
    const mimeType = MIME[extname(path).toLowerCase()];

    // Images land here: the pipeline accepts PDF and Word only, so a photographed CV is rejected
    // before any of this runs. Counting them is the point — it says whether OCR is worth having.
    if (!mimeType) {
      unsupported += 1;
      rows.push({ file: name, result: "UNSUPPORTED TYPE", producer: "", pages: "", chars: "", cluster: "", dates: "" });
      continue;
    }

    try {
      const buffer = readFileSync(path);
      const { text, pageCount } = await extractText(buffer, mimeType);
      const quality = extractionQuality(text, pageCount);
      const { producer, creator } = await pdfOrigin(buffer, mimeType);
      rows.push({
        file: name,
        result: quality.suspect ? "SUSPECT" : "ok",
        producer: producer ?? creator ?? "-",
        pages: quality.pages,
        chars: quality.charsPerPage,
        cluster: quality.lineClustering,
        expSection: quality.experienceFound ? "found" : "NOT FOUND",
        dates: quality.datesParsed ? "yes" : "NO",
        level: quality.datesParsed ? "" : "NO LEVEL",
      });
    } catch (error) {
      failed += 1;
      rows.push({
        file: name,
        result: `READ FAILED: ${error instanceof Error ? error.message : String(error)}`,
        producer: "", pages: "", chars: "", cluster: "", dates: "",
      });
    }
  }

  console.table(rows);

  const readable = rows.filter((r) => r.result === "ok" || r.result === "SUSPECT");
  const suspect = rows.filter((r) => r.result === "SUSPECT").length;
  const pct = (n: number) => `${Math.round((n / files.length) * 100)}%`;

  // The number that actually matters: CVs we could not assign an experience level to. It is not the
  // same as "suspect" — a CV can read perfectly and still yield no level if we miss its heading.
  const noLevel = rows.filter((r) => r.level === "NO LEVEL").length;

  console.log(`\nfiles                : ${files.length}`);
  console.log(`read cleanly         : ${readable.length - suspect} (${pct(readable.length - suspect)})`);
  console.log(`read but SUSPECT     : ${suspect} (${pct(suspect)})   <- looks like damaged extraction`);
  console.log(`NO EXPERIENCE LEVEL  : ${noLevel} (${pct(noLevel)})   <- scored as Fresh whatever their real history`);
  console.log(`unsupported type     : ${unsupported} (${pct(unsupported)})   <- images; OCR territory`);
  console.log(`failed to read       : ${failed} (${pct(failed)})`);

  const byProducer = new Map<string, { total: number; suspect: number }>();
  for (const row of rows) {
    if (!row.producer || row.producer === "-" || row.producer === "") continue;
    const key = String(row.producer);
    const entry = byProducer.get(key) ?? { total: 0, suspect: 0 };
    entry.total += 1;
    if (row.result === "SUSPECT") entry.suspect += 1;
    byProducer.set(key, entry);
  }
  if (byProducer.size) {
    console.log("\nby generator (which tools produce files we misread):");
    for (const [producer, { total, suspect: bad }] of [...byProducer].sort((a, b) => b[1].suspect - a[1].suspect)) {
      console.log(`  ${bad}/${total} suspect  ${producer}`);
    }
  }
};

const folder = process.argv[2];
if (!folder) {
  console.error('Usage: npx tsx src/scripts/auditCvCorpus.ts "C:/path/to/cv-samples"');
  process.exit(1);
}
audit(folder).catch((error) => {
  console.error(error);
  process.exit(1);
});
