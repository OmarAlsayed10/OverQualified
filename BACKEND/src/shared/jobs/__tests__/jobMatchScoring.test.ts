import { fitScore, jobDedupeKey, Preference, RawJob, tokenize } from "../jobMatchScoring";

const preference: Preference = {
  role: "frontend developer",
  level: "Senior",
  location: null,
  remote: false,
  keywords: "React TypeScript",
  blocklist: null,
};

const job: RawJob = {
  source: "fixture",
  externalId: "1",
  title: "Senior Frontend Developer",
  company: "Example",
  location: null,
  url: "https://example.com/job",
  postedAt: null,
  description: "Build React and TypeScript applications.",
};

describe("fitScore", () => {
  test("preserves the weighted role and keyword score", () => {
    expect(fitScore(preference, job)).toBe(80);
  });

  test("rejects titles that conflict with the selected level", () => {
    expect(fitScore({ ...preference, level: "Junior" }, job)).toBe(0);
  });

  test("scores an Arabic job title against an Arabic role name", () => {
    const arabicPreference: Preference = { ...preference, role: "مطور واجهات", level: null, keywords: null };
    const arabicJob: RawJob = { ...job, title: "مُطوِّر واجهات أمامية", description: "تطوير واجهات المستخدم" };
    expect(fitScore(arabicPreference, arabicJob)).toBeGreaterThanOrEqual(50);
  });
});

describe("tokenize", () => {
  test("normalizes Arabic orthography so spelling variants collide", () => {
    expect(tokenize("مُطَوِّر")).toEqual(tokenize("مطور"));
    expect(tokenize("إدارة")).toEqual(tokenize("اداره"));
  });

  test("strips the definite article from long Arabic words", () => {
    expect(tokenize("المحاسبة")).toEqual(["محاسبه"]);
  });

  test("converts Arabic-Indic digits", () => {
    expect(tokenize("خبرة ٥ سنوات")).toContain("سنوات");
    expect(tokenize("html٥")).toContain("html5");
  });

  test("keeps existing English behaviour", () => {
    expect(tokenize("Senior Front-End Developer")).toEqual(["senior", "frontend"]);
  });

  test("keeps short terms that carry role meaning", () => {
    expect(tokenize("QA Engineer")).toEqual(["qa"]);
    expect(tokenize("UI UX Designer")).toEqual(["ui", "ux", "designer"]);
    expect(tokenize("AI/ML Engineer")).toEqual(["ai", "ml"]);
    expect(tokenize("HR Business Partner")).toContain("hr");
    expect(tokenize("C# Developer")).toEqual(["c#"]);
  });

  test("still drops short noise words", () => {
    expect(tokenize("we do it in a day")).toEqual(["day"]);
  });

  test("collapses abbreviations onto one canonical term", () => {
    expect(tokenize("JS")).toEqual(tokenize("JavaScript"));
    expect(tokenize("3ds Max artist")).toContain("3d");
    expect(tokenize("k8s")).toEqual(["kubernetes"]);
    expect(tokenize("Postgres")).toEqual(tokenize("PostgreSQL"));
  });

  test("matches a QA role against a QA posting", () => {
    const qaPreference: Preference = { role: "qa engineer", level: null, location: null, remote: false, keywords: null, blocklist: null };
    const qaJob: RawJob = { ...job, title: "QA Engineer", description: "Manual and automation testing." };
    expect(fitScore(qaPreference, qaJob)).toBe(100);
  });
});

describe("jobDedupeKey", () => {
  test("collapses the same posting seen through different providers", () => {
    expect(jobDedupeKey({ company: "Paymob Solutions LLC", title: "Sr. Backend Engineer", country: "EG" }))
      .toBe(jobDedupeKey({ company: "Paymob", title: "Senior Backend Engineer", country: "EG" }));
  });

  test("keeps different roles at the same company apart", () => {
    expect(jobDedupeKey({ company: "Paymob", title: "Backend Engineer", country: "EG" }))
      .not.toBe(jobDedupeKey({ company: "Paymob", title: "Frontend Engineer", country: "EG" }));
  });

  test("keeps the same role in different countries apart", () => {
    expect(jobDedupeKey({ company: "Paymob", title: "Backend Engineer", country: "EG" }))
      .not.toBe(jobDedupeKey({ company: "Paymob", title: "Backend Engineer", country: "AE" }));
  });

  test("returns an empty key when identity is missing", () => {
    expect(jobDedupeKey({ company: "", title: "Backend Engineer", country: "EG" })).toBe("");
  });
});
