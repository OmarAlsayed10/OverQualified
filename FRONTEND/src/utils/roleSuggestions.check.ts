import assert from "node:assert/strict";
import { roleSuggestionForJobDescription, roleSuggestionsFromCv } from "./roleSuggestions.ts";

const roles = roleSuggestionsFromCv({
  personalInfo: { professionalTitle: "Software Engineer" },
  experience: [{ jobTitle: "Frontend Web Developer" }],
  projects: [{ technologies: "React, Node.js, NestJS, PostgreSQL", description: "Built REST APIs and web features." }],
});

assert.deepEqual(roles, ["Software Engineer", "Backend Developer", "Frontend Web Developer"]);
assert.equal(roleSuggestionForJobDescription(roles, "Build and maintain Angular frontend web applications."), "Frontend Web Developer");
assert.equal(roleSuggestionForJobDescription(roles, "Develop Node.js backend services and APIs."), "Backend Developer");
assert.equal(roleSuggestionForJobDescription(roles, "Manage financial audits and tax reporting."), undefined);

console.log("role suggestion checks passed");
