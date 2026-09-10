import mammoth from "mammoth";
import { extractTextItems, getDocumentProxy, type StructuredTextItem } from "unpdf";
import fs from "fs";
import axios from "axios";
import { orderForReading } from "./readingOrder";

const mathWithPreciseSum = Math as typeof Math & {
    sumPrecise?: (values: Iterable<number>) => number;
};

mathWithPreciseSum.sumPrecise ??= (values) => {
    let sum = 0;
    let correction = 0;
    for (const value of values) {
        const next = sum + value;
        correction += Math.abs(sum) >= Math.abs(value) ? sum - next + value : value - next + sum;
        sum = next;
    }
    return sum + correction;
};

// unpdf's own extractText concatenates PDF text runs with no separator, so any layout that
// splits a line into runs (columns, right-aligned dates, tabs) comes back as glued words.
export const joinPageItems = (items: StructuredTextItem[]): string => items.map((item, index) => {
    const previous = items[index - 1];
    if (!previous) return item.str;
    if (previous.hasEOL || Math.abs(item.y - previous.y) > previous.fontSize * 0.5) return `\n${item.str}`;
    const alreadySpaced = /\s$/.test(previous.str) || /^\s/.test(item.str);
    // Arabic and Hebrew runs advance right-to-left, so the following item sits at a
    // smaller x. Take whichever side actually has the gap.
    const gap = Math.max(
      item.x - (previous.x + previous.width),
      previous.x - (item.x + item.width),
    );
    return alreadySpaced || gap <= previous.fontSize * 0.2 ? item.str : ` ${item.str}`;
}).join("");

const normalizePdfText = (pages: string[]): string => pages
    .join("\n\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const estimateTextPageCount = (text: string): number => {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 400));
};

export const extractText = async (fileInput: string | Buffer, mimeType: string): Promise<{ text: string; pageCount: number }> => {
    let buffer: Buffer;

    if (Buffer.isBuffer(fileInput)) {
        buffer = fileInput;
    } else if (fileInput.startsWith("http://") || fileInput.startsWith("https://")) {
        const response = await axios.get(fileInput, { responseType: "arraybuffer" });
        buffer = Buffer.from(response.data);
    } else {
        buffer = fs.readFileSync(fileInput);
    }

    const head4 = buffer.subarray(0, 4).toString("latin1");
    const isPdf = head4.startsWith("%PDF");
    const isZip = head4.startsWith("PK");
    const isOle = buffer.subarray(0, 4).toString("hex") === "d0cf11e0";

    let pageCount = 1;
    let text = "";

    if (mimeType === "application/pdf") {
        if (!isPdf) throw new Error("File is not a valid PDF.");
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const extracted = await extractTextItems(pdf);
        // Reading order before joining: a two-column page comes out of the PDF interleaved, and
        // joining it in drawing order glues the columns into gibberish.
        text = normalizePdfText(extracted.items.map((page) => joinPageItems(orderForReading(page))));
        pageCount = extracted.totalPages;
    } else if (
        mimeType === "application/msword" ||
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        if (!isZip && !isOle) throw new Error("File is not a valid Word document.");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        pageCount = estimateTextPageCount(text);
    } else {
        throw new Error("This file is unsupported, please upload PDF/Word");
    }

    return { text, pageCount };
};
