import assert from "node:assert/strict";
import { baseStrengthFromYears, bestFitLevel, levelFromYears } from "./levelModel";

// The buckets, including the 2-3 year band that used to fall through to Junior while the app's own
// LEVEL_EXPECTATIONS said Junior ended at 2.
const buckets: [number, string][] = [
  [0, "Fresh"],
  [0.42, "Fresh"],
  [0.99, "Fresh"],
  [1, "Junior"],
  [1.9, "Junior"],
  [2, "Mid"],
  [2.25, "Mid"],
  [4.9, "Mid"],
  [5, "Senior"],
  [7.9, "Senior"],
  [8, "Lead"],
];
for (const [years, level] of buckets) {
  assert.equal(levelFromYears(years), level, `${years} years should be ${level}`);
}

// The invariant that actually broke: the year buckets and the strength curve are two scales for the
// same thing, so a CV must never be labelled one level while its strength reads as another. Getting
// this wrong printed "your experience currently reads as Junior" on a CV labelled Mid.
for (const [years, level] of buckets) {
  assert.equal(
    bestFitLevel(baseStrengthFromYears(years)),
    level,
    `${years} years: strength ${baseStrengthFromYears(years).toFixed(1)} disagrees with bucket ${level}`,
  );
}

// Strength has to keep rising with experience, or fit would invert between levels.
let previous = -1;
for (let years = 0; years <= 12; years += 0.5) {
  const strength = baseStrengthFromYears(years);
  assert.ok(strength >= previous, `strength dipped at ${years} years`);
  previous = strength;
}

console.log("levelModel ok");
