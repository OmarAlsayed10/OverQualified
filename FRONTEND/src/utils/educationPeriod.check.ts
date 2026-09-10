import assert from "node:assert/strict";
import { educationEndLabel, educationPeriod } from "./educationPeriod.ts";

assert.equal(educationPeriod({ startYear: "2018", endYear: "2022", status: "graduated" }), "2018 – 2022");
assert.equal(educationPeriod({ startYear: "2018", endYear: "2022" }), "2018 – 2022");
assert.equal(educationPeriod({ startYear: "2023", endYear: "2027", status: "undergraduate" }), "2023 – Expected 2027");
assert.equal(educationPeriod({ startYear: "2023", endYear: "", status: "undergraduate" }), "2023 – Present");
assert.equal(educationEndLabel({ endYear: "2027", status: "undergraduate" }, () => "متوقع"), "متوقع 2027");

console.log("educationPeriod checks passed");
