import assert from "node:assert/strict";
import { WEAK_OPENER_WORDS, startsWithActionVerb } from "./constants";

// The prompt names these words and the scorer punishes them. They drifted apart once already: the
// prompt banned "Followed" (which scored as strong) and never mentioned "Participated" (which the
// scorer marked weak), so the optimizer left exactly that bullet unfixed. Any word the rewriter is
// told to avoid must be a word the scorer actually rejects, or the advice is a lie.
for (const word of WEAK_OPENER_WORDS) {
  assert.equal(
    startsWithActionVerb(`${word} the deployment pipeline for the platform team`),
    false,
    `prompt tells the optimizer to avoid "${word}", but the scorer counts it as a strong verb`,
  );
}

// The bullet from the real optimizer run that started this — it must now read as weak.
assert.equal(startsWithActionVerb("Participated in 90% of code reviews to maintain code quality."), false);

// Genuine action verbs must survive, or the optimizer would be told to avoid good writing.
for (const strong of [
  "Built a payment service handling two million requests a day",
  "Led the migration of three legacy services",
  "Reduced checkout latency by rewriting the settlement path",
  "Boosted monthly sales by 10% through upselling",
  "Wrote the onboarding documentation",
]) {
  assert.equal(startsWithActionVerb(strong), true, `"${strong.slice(0, 30)}…" should be strong`);
}

console.log("weakOpeners ok");
