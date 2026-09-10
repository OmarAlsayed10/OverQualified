import assert from "node:assert/strict";
import { missingRequirements } from "./cvRequirements.ts";

const completePersonal = {
  firstName: "Omar", lastName: "Alsayed", professionalTitle: "Developer",
  email: "omar@example.com", phoneCode: "+20", phone: "1015556178", city: "Cairo",
};

const complete = {
  personalInfo: completePersonal,
  experience: [{ jobTitle: "Agent", company: "Acme", location: "Cairo", startDate: "2021", endDate: "2025" }],
  education: [{ status: "graduated", institution: "Cairo University", degree: "BSc", location: "Cairo", startYear: "2016", endYear: "2020" }],
  projects: [{ name: "OverQualified" }],
};

assert.deepEqual(missingRequirements(complete), []);

const missingStartDate = missingRequirements({
  ...complete,
  experience: [{ ...complete.experience[0], startDate: "" }],
});
assert.equal(missingStartDate.length, 1);
assert.deepEqual(missingStartDate[0], {
  section: "experience", label: "Experience", index: 1, message: "Start Date is required",
});

// An undergraduate owes no graduation year; a graduate does.
assert.deepEqual(
  missingRequirements({
    ...complete,
    education: [{ ...complete.education[0], status: "undergraduate", endYear: "" }],
  }),
  [],
);
assert.equal(
  missingRequirements({
    ...complete,
    education: [{ ...complete.education[0], endYear: "" }],
  })[0].message,
  "Graduation Year is required",
);

assert.equal(missingRequirements({ ...complete, personalInfo: { ...completePersonal, city: "" } })[0].section, "personal");

console.log("cvRequirements checks passed");
