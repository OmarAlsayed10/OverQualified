import assert from "node:assert/strict";
import { formatCountdown, msLeftInCycle } from "./offerCycle.ts";

const HOUR = 60 * 60 * 1000;
const CYCLE = 12 * HOUR;

// A fresh cycle starts at a full 12 hours and runs down to the next boundary.
assert.equal(msLeftInCycle(0), CYCLE);
assert.equal(msLeftInCycle(CYCLE - 1000), 1000);
assert.equal(msLeftInCycle(CYCLE), CYCLE);

// The value depends only on the clock, so a reload one second later continues the same
// countdown instead of restarting it.
const now = 1_756_500_000_000;
assert.equal(msLeftInCycle(now) - msLeftInCycle(now + 1000), 1000);
assert.ok(msLeftInCycle(now) > 0 && msLeftInCycle(now) <= CYCLE);

assert.equal(formatCountdown(CYCLE), "12:00:00");
assert.equal(formatCountdown(HOUR + 2 * 60 * 1000 + 3000), "01:02:03");
assert.equal(formatCountdown(0), "00:00:00");

console.log("offerCountdown checks passed");
