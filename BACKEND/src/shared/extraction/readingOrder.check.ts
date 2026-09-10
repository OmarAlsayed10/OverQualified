import assert from "node:assert/strict";
import { backwardJumpRatio, detectGutter, orderForReading } from "./readingOrder";

const item = (x: number, y: number, width: number, str: string) => ({ x, y, width, str });

// A sidebar CV: skills down the left, experience down the right, both running the full page.
const leftColumn = Array.from({ length: 12 }, (_, i) => item(50, 700 - i * 50, 150, `left ${i}`));
const rightColumn = Array.from({ length: 12 }, (_, i) => item(300, 700 - i * 50, 250, `right ${i}`));

// The drawing order interleaves the two columns, which is exactly what scrambles the reading order.
const scrambled = leftColumn.flatMap((left, i) => [left, rightColumn[i]]);

const gutter = detectGutter(scrambled);
assert.ok(gutter !== null && gutter > 200 && gutter < 300, `expected a gutter between the columns, got ${gutter}`);

const ordered = orderForReading(scrambled).map((entry) => entry.str);
assert.deepEqual(ordered.slice(0, 12), leftColumn.map((entry) => entry.str));
assert.deepEqual(ordered.slice(12), rightColumn.map((entry) => entry.str));

// Right-aligned dates leave a gap too, but they are not a column. Splitting there would tear every
// job title away from its own dates.
const body = Array.from({ length: 20 }, (_, i) => item(50, 700 - i * 30, 350, `duty ${i}`));
const dates = Array.from({ length: 5 }, (_, i) => item(480, 700 - i * 120, 70, `Jan 20${10 + i}`));
assert.equal(detectGutter([...body, ...dates]), null);

// A plain single-column CV has no empty channel to find.
const single = Array.from({ length: 25 }, (_, i) => item(50, 700 - i * 25, 500, `line ${i}`));
assert.equal(detectGutter(single), null);
assert.deepEqual(orderForReading(single), single);

// Too little text to judge — leave it alone rather than guess.
assert.equal(detectGutter(leftColumn.slice(0, 5)), null);

// A file that draws its text out of vertical order gets re-sorted, columns or not.
const scrambledPage = [
  item(50, 300, 200, "dates that were drawn first"),
  item(50, 250, 200, "more content"),
  item(50, 700, 200, "name at the top"),
  item(50, 650, 200, "the heading"),
  item(50, 500, 200, "middle"),
  item(50, 450, 200, "middle two"),
];
assert.ok(backwardJumpRatio(scrambledPage) > 0.15);
assert.deepEqual(
  orderForReading(scrambledPage).map((entry) => entry.str),
  ["name at the top", "the heading", "middle", "middle two", "dates that were drawn first", "more content"],
);

// A tidy single-column file is left exactly as it came: its drawing order is already correct, and
// re-sorting could only damage lines whose items share a y by a pixel or two.
assert.ok(backwardJumpRatio(single) < 0.15);
assert.deepEqual(orderForReading(single), single);

console.log("readingOrder ok");
