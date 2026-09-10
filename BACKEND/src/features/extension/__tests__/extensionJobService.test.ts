import { parseCapturedJob } from "../extensionJobService";

jest.mock("../../../lib/prisma", () => ({ __esModule: true, default: {} }));

describe("parseCapturedJob", () => {
  const valid = {
    url: "https://www.linkedin.com/jobs/view/123",
    title: "  Senior   Backend Engineer ",
    company: "Paymob",
    location: "Cairo, Egypt",
    description: "<p>Build APIs</p>",
    postedAt: "2026-09-01",
    board: "linkedin",
  };

  test("normalizes whitespace and strips markup", () => {
    const job = parseCapturedJob(valid);
    expect(job.title).toBe("Senior Backend Engineer");
    expect(job.description).toBe("Build APIs");
  });

  test("rejects a non-http url", () => {
    expect(() => parseCapturedJob({ ...valid, url: "javascript:alert(1)" })).toThrow("INVALID_CAPTURE");
  });

  test("rejects a missing title", () => {
    expect(() => parseCapturedJob({ ...valid, title: "" })).toThrow("INVALID_CAPTURE");
  });

  test("falls back for optional fields", () => {
    const job = parseCapturedJob({ url: valid.url, title: "QA Engineer" });
    expect(job).toMatchObject({ company: "Unknown", location: null, postedAt: null, board: "extension" });
  });

  test("caps an oversized description", () => {
    const job = parseCapturedJob({ ...valid, description: "x".repeat(50_000) });
    expect(job.description.length).toBeLessThanOrEqual(6000);
  });
});
