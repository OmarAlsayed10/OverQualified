import { Document, Packer, Paragraph, TextRun, TabStopType, AlignmentType } from "docx";

const ACCENT = "1a1a1a";
const RIGHT_TAB = 10800;

const SECTION_HEADER_PATTERN = /^[A-Z][A-Z\s&\/]{2,}$/;

const SECTION_KEYWORDS = /^(professional\s+summary|summary|profile|objective|work\s+experience|experience|employment(\s+history)?|education|technical\s+skills|skills|projects?|certifications?|languages?|courses?|training|participations?|activities|achievements?|key\s+achievements|awards?|honors?|interests?|volunteer(ing)?|publications?|references?|contact|about\s+me)\s*:?\s*$/i;

function isHeader(line: string): boolean {
  if (line.length >= 50) return false;
  return SECTION_HEADER_PATTERN.test(line) || SECTION_KEYWORDS.test(line);
}

function headerText(line: string): string {
  return line.replace(/\s*:\s*$/, "");
}

// ponytail: entry headers are the only lines carrying " | "; skills use "Label: a, b"
function isEntryHeader(line: string): boolean {
  return line.includes(" | ");
}

export async function exportAdjustedCVToDocx(cvText: string): Promise<Buffer> {
  const lines = cvText.split("\n");
  let seenName = false;
  let seenContact = false;

  const paragraphs = lines.map((line) => {
    const trimmed = line.trim();

    if (trimmed === "") {
      return new Paragraph({ children: [new TextRun("")], spacing: { after: 60 } });
    }

    if (!seenName) {
      seenName = true;
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: trimmed, bold: true, size: 34, color: ACCENT })],
      });
    }

    if (!seenContact) {
      seenContact = true;
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [new TextRun({ text: trimmed, size: 18, color: "555555" })],
      });
    }

    if (isHeader(trimmed)) {
      return new Paragraph({
        spacing: { before: 200, after: 80 },
        border: { bottom: { color: ACCENT, size: 6, space: 2, style: "single" } },
        children: [new TextRun({ text: headerText(trimmed).toUpperCase(), bold: true, size: 22, color: ACCENT })],
      });
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      const body = trimmed.replace(/^[-•]\s*/, "");
      return new Paragraph({
        indent: { left: 300 },
        spacing: { after: 40 },
        children: [new TextRun({ text: `• ${body}`, size: 20 })],
      });
    }

    if (isEntryHeader(trimmed)) {
      const idx = trimmed.lastIndexOf(" | ");
      const left = trimmed.slice(0, idx).trim();
      const right = trimmed.slice(idx + 3).trim();
      return new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
        spacing: { before: 80, after: 20 },
        children: [
          new TextRun({ text: left, bold: true, size: 21 }),
          new TextRun({ text: "\t", size: 21 }),
          new TextRun({ text: right, italics: true, size: 20, color: "555555" }),
        ],
      });
    }

    return new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: trimmed, size: 20 })],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        },
        children: paragraphs,
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 20 },
          paragraph: { spacing: { line: 264 } },
        },
      },
    },
  });

  return Packer.toBuffer(doc);
}
