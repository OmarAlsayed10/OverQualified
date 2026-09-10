// A PDF emits text in drawing order, not reading order. For a sidebar CV that means the extracted
// stream can interleave the two columns, or place a heading after the content it introduces — one
// sample CV had its job dates appear above the "Experience :" heading, so we found no section and
// scored a six-year engineer as Fresh.
// Splitting on the empty vertical channel between the columns and reading one side fully before the
// other restores the order a human sees.

export interface PositionedItem {
  x: number;
  y: number;
  width: number;
  str: string;
}

// A gutter has to be a real channel, not the gap before a right-aligned date. These thresholds are
// what separate the two: a date column holds few items and hugs the rows of the text beside it,
// while a real column carries a large share of the page down most of its height.
const BINS = 120;
const MIN_GUTTER_RATIO = 0.04;
const EDGE_MARGIN = 0.2;
const MIN_SIDE_SHARE = 0.25;
const MIN_SIDE_HEIGHT_SHARE = 0.5;

const span = (values: number[]) => Math.max(...values) - Math.min(...values);

// The x coordinate of the empty channel splitting the page, or null when there is no second column.
export const detectGutter = (items: PositionedItem[]): number | null => {
  const real = items.filter((item) => item.str.trim());
  if (real.length < 20) return null;

  const left = Math.min(...real.map((item) => item.x));
  const right = Math.max(...real.map((item) => item.x + item.width));
  const pageWidth = right - left;
  if (pageWidth <= 0) return null;

  const covered = new Array<boolean>(BINS).fill(false);
  for (const item of real) {
    const from = Math.floor(((item.x - left) / pageWidth) * BINS);
    const to = Math.ceil(((item.x + item.width - left) / pageWidth) * BINS);
    for (let bin = Math.max(0, from); bin < Math.min(BINS, Math.max(to, from + 1)); bin += 1) {
      covered[bin] = true;
    }
  }

  let best: { start: number; end: number } | null = null;
  let runStart: number | null = null;
  for (let bin = 0; bin <= BINS; bin += 1) {
    const empty = bin < BINS && !covered[bin];
    if (empty && runStart === null) runStart = bin;
    if (!empty && runStart !== null) {
      const run = { start: runStart, end: bin };
      const centre = (run.start + run.end) / 2 / BINS;
      const width = (run.end - run.start) / BINS;
      const usable = centre > EDGE_MARGIN && centre < 1 - EDGE_MARGIN && width >= MIN_GUTTER_RATIO;
      if (usable && (!best || run.end - run.start > best.end - best.start)) best = run;
      runStart = null;
    }
  }
  if (!best) return null;

  const gutter = left + ((best.start + best.end) / 2 / BINS) * pageWidth;
  const leftSide = real.filter((item) => item.x + item.width <= gutter);
  const rightSide = real.filter((item) => item.x + item.width > gutter);

  const share = Math.min(leftSide.length, rightSide.length) / real.length;
  if (share < MIN_SIDE_SHARE) return null;

  // Both sides must run down the page. A stack of right-aligned dates does not.
  const pageHeight = span(real.map((item) => item.y));
  if (pageHeight <= 0) return null;
  const shortest = Math.min(span(leftSide.map((item) => item.y)), span(rightSide.map((item) => item.y)));
  if (shortest / pageHeight < MIN_SIDE_HEIGHT_SHARE) return null;

  return gutter;
};

// Top to bottom, then left to right within each line. PDF y grows upward, so a larger y is higher.
const readingOrder = <T extends PositionedItem>(items: T[]): T[] => {
  const byHeight = [...items].sort((a, b) => b.y - a.y);
  const lines: T[][] = [];
  for (const item of byHeight) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line[0].y - item.y) <= 2) line.push(item);
    else lines.push([item]);
  }
  return lines.flatMap((line) => line.sort((a, b) => a.x - b.x));
};

// Most generators draw a page roughly top to bottom. One CV in the sample set drew 38% of its text
// further UP the page than the item before it, which put job dates ahead of the "Experience :"
// heading they belong under — so the section looked empty and a six-year engineer scored as Fresh.
// Every other file in that set measured 4% or less, which is the margin this threshold sits in.
const SCRAMBLED_LIMIT = 0.15;
const BACKWARD_TOLERANCE = 5;

export const backwardJumpRatio = (items: PositionedItem[]): number => {
  const real = items.filter((item) => item.str.trim());
  if (real.length < 2) return 0;
  let jumps = 0;
  for (let i = 1; i < real.length; i += 1) {
    if (real[i].y > real[i - 1].y + BACKWARD_TOLERANCE) jumps += 1;
  }
  return jumps / (real.length - 1);
};

// Re-sorting is a last resort, not a default: for a well-behaved file the drawing order already is
// the reading order, and sorting by coordinate can only introduce errors on items that share a line.
export const orderForReading = <T extends PositionedItem>(items: T[]): T[] => {
  const gutter = detectGutter(items);
  if (gutter !== null) {
    return [
      ...readingOrder(items.filter((item) => item.x + item.width <= gutter)),
      ...readingOrder(items.filter((item) => item.x + item.width > gutter)),
    ];
  }
  return backwardJumpRatio(items) > SCRAMBLED_LIMIT ? readingOrder(items) : items;
};
