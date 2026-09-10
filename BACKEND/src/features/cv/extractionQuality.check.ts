import assert from "node:assert/strict";
import { extractionQuality, lineClustering } from "./extractionQuality";

const cv = (experience: string) => `
Summary
Backend Engineer with 4+ years of experience building distributed systems for finance and ERP.

Experience
Backend Engineer - Acme
${experience}

Education
BSc Computer Science - Cairo University
`;

// A CV that reads cleanly: varied line lengths, dates the parser can use.
const healthy = cv(`Jan 2020 - Present
• Built a payment service handling two million requests a day for a regional bank.
• Led the migration of three legacy services onto a managed platform.
• Reduced checkout latency by rewriting the settlement path.`);

const healthyQuality = extractionQuality(healthy, 1);
assert.equal(healthyQuality.datesParsed, true);
assert.equal(healthyQuality.suspect, false);

// The real failure: every long line cut to the same width, which also destroys the date range.
const truncated = cv(`Jan 2020 - Prese
• Built a payment service handling two million requests
• Led the migration of three legacy services onto a mana
• Reduced checkout latency by rewriting the settlement p`);

const truncatedQuality = extractionQuality(truncated, 1);
assert.equal(truncatedQuality.datesParsed, false);
assert.equal(truncatedQuality.suspect, true);

// A scan carries almost no text layer at all.
assert.equal(extractionQuality("Mostafa Gamal\nBackend Engineer", 2).suspect, true);

// "RESPONSIBILITIES" is how one real CV headed its work history. Finding it is what turns a working
// candidate from Fresh into their real level.
const responsibilities = `
Summary
Quality Control Specialist with hands-on food safety and laboratory experience.

RESPONSIBILITIES
Quality Control Specialist - Three Chefs
Jul. 2021 - may. 2023
• Performed parasitology analysis and lab experiments across the production line.

EDUCATION
Faculty of Agriculture
`;
const found = extractionQuality(responsibilities, 1);
assert.equal(found.experienceFound, true);
assert.equal(found.datesParsed, true);

// A fresh graduate with projects and no jobs is not a misread file — Fresh is the right answer, so
// this must not be flagged as suspect.
const fresher = `
Summary
Computer Science fresh graduate with a strong interest in networks and backend development.

TECHNICAL PROJECTS
Resto Shopping App
• Built a Flutter storefront with cart and checkout flows.

EDUCATION
Tanta University 2020 - 2024
`;
const fresherQuality = extractionQuality(fresher, 1);
assert.equal(fresherQuality.experienceFound, false);
assert.equal(fresherQuality.suspect, false);

// Clustering is a ratio of the long lines only, so a short heading cannot swing it.
assert.equal(lineClustering(""), 0);
assert.ok(lineClustering(truncated) > 0.5);
assert.ok(lineClustering(healthy) < 0.5);

console.log("extractionQuality ok");
