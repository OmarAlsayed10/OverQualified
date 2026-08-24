// `*` is both a bullet glyph and the first half of `**bold**`. Stripping it blindly ate one
// asterisk off a line that opened with bold text, so the markup never matched and the text
// rendered plain. A lone `*` is a bullet; a doubled one is formatting.
const LEADING_MARKER = /^(?:[-–—•▪●‣⁃]|\*(?!\*))\s*/;

// Imported and AI-written descriptions arrive two ways: real newlines, or one long string with
// inline markers ("… efficiently. - Achieved …"). HTML collapses the newlines and nothing splits
// the inline form, so every bullet ended up in a single paragraph.
// A dash only starts a new bullet after sentence-ending punctuation, which keeps ranges like
// "2020 - 2024" and phrases like "Client - Acme" in one piece. Bullet glyphs always split.
const INLINE_MARKER = /(?<=[.;:!?])\s+(?=[-–—•*▪●‣⁃]\s+\S)|\s+(?=[•▪●‣⁃]\s*\S)/g;

const ACTION_VERB = /^(?:Architected|Automated|Built|Collaborated|Created|Delivered|Deployed|Designed|Developed|Engineered|Established|Implemented|Improved|Increased|Integrated|Launched|Led|Maintained|Managed|Migrated|Optimized|Reduced|Refactored|Resolved|Streamlined|Supported|Tested)\b/i;

const actionSentenceLines = (line: string): string[] =>
  line.split(/(?<=[.!?;])\s+/).reduce<string[]>((parts, sentence) => {
    const trimmed = sentence.trim();
    if (parts.length > 0 && ACTION_VERB.test(trimmed)) parts.push(trimmed);
    else if (parts.length === 0) parts.push(trimmed);
    else parts[parts.length - 1] = `${parts[parts.length - 1]} ${trimmed}`;
    return parts;
  }, []);

export const bulletLines = (text: string): string[] =>
  (text || '')
    .split('\n')
    .flatMap((line) => line.split(INLINE_MARKER))
    .map((line) => line.replace(LEADING_MARKER, '').trim())
    .flatMap(actionSentenceLines)
    .filter(Boolean);

export const normalizePastedBulletText = (text: string): string => {
  const lines = bulletLines(text);
  return lines.length > 1 ? lines.join('\n') : text;
};
