import assert from "node:assert/strict";
import { skillTokens } from "./textParse";

// Real extracted text from an uploaded CV. The summary mentions "interpersonal skills" three
// lines above the actual SKILLS heading — that used to win the match and the parser then read
// the experience bullets as the skills list.
const cvText = [
  "AHMED SHERIF MOSTAFA",
  "PROFESSIONAL SUMMARY",
  "Motivated Call Center and Customer Service Representative with experience in sales, communication, and client support. Skilled in",
  "handling customer inquiries, resolving issues efficiently, and achieving sales targets. Strong interpersonal skills, teamwork abilities, and",
  "commitment to delivering excellent customer experiences.",
  "WORK EXPERIENCE",
  "Customer Service & Sales Representative — Tag Company Aug 2025 - Nov 2025",
  "• Handled 50+ customer calls daily, providing product information and resolving issues efficiently.",
  "• Trained in effective communication, negotiation, and CRM systems for client management.",
  "SKILLS",
  "Technical Tools, Administrative Skills, Conflict Resolution, Customer Service, Communication, Sales, Negotiation, CRM, Time Man-",
  "agement, Teamwork, Collaboration, Adaptability, Multitasking, Public Health, Infection Control",
  "EDUCATION",
  "Diploma in Technical Health Studies — Tanta Health Technical Institute 2022",
].join("\n");

const tokens = skillTokens(cvText);

assert.equal(tokens[0], "Technical Tools");
assert.equal(tokens.at(-1), "Infection Control");
assert.equal(tokens.length, 15);

// Nothing from the summary, the experience bullets, or the section after SKILLS.
assert.ok(!tokens.some((token) => /Handled|WORK EXPERIENCE|Diploma|EDUCATION/i.test(token)));

// PDF line-wrap hyphenation is rejoined, not counted as two skills.
assert.ok(tokens.includes("Time Management"));
assert.ok(!tokens.some((token) => token.endsWith("-")));

// No skills section at all still returns nothing.
assert.deepEqual(skillTokens("SUMMARY\nStrong interpersonal skills and teamwork."), []);

console.log("textParse skillTokens ok");
