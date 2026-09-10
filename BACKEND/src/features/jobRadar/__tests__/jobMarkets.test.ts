import { cycleBatch, jobRows } from "../jobIngestionService";
import { MENA_MARKETS, PRIMARY_MARKET, resolveCountry } from "../../../shared/jobs/jobMarkets";
import { RawJob } from "../../../shared/jobs/jobMatchScoring";

const rawJob = (values: Partial<RawJob>): RawJob => ({
  source: "fixture",
  externalId: "1",
  title: "Backend Engineer",
  company: "Paymob",
  location: "Cairo, Egypt",
  url: "https://example.com/job",
  postedAt: null,
  description: "",
  ...values,
});

describe("resolveCountry", () => {
  test("resolves Egyptian cities without a country word", () => {
    expect(resolveCountry("New Cairo")).toBe("EG");
    expect(resolveCountry("Nasr City, Cairo")).toBe("EG");
  });

  test("resolves Arabic location names", () => {
    expect(resolveCountry("القاهرة")).toBe("EG");
    expect(resolveCountry("دبي، الإمارات")).toBe("AE");
    expect(resolveCountry("الرياض")).toBe("SA");
  });

  test("matches whole words only", () => {
    expect(resolveCountry("Romania")).toBeNull();
    expect(resolveCountry("Oman")).toBe("OM");
    expect(resolveCountry("Amman, Jordan")).toBe("JO");
  });

  test("returns null for location-free postings", () => {
    expect(resolveCountry("Remote")).toBeNull();
    expect(resolveCountry(null)).toBeNull();
    expect(resolveCountry("")).toBeNull();
  });

  test("every market has a resolvable label", () => {
    for (const market of MENA_MARKETS) expect(resolveCountry(market.label)).toBe(market.country);
  });
});

describe("cycleBatch", () => {
  test("walks the whole list across consecutive cycles", () => {
    const items = ["a", "b", "c", "d", "e"];
    const seen = new Set([0, 1, 2, 3, 4].flatMap((cycle) => cycleBatch(items, 2, cycle)));
    expect(seen.size).toBe(items.length);
  });

  test("tolerates an empty list", () => {
    expect(cycleBatch([], 3, 7)).toEqual([]);
  });
});

describe("jobRows", () => {
  test("stamps country and dedupe key", () => {
    const [row] = jobRows([rawJob({})]);
    expect(row.country).toBe("EG");
    expect(row.dedupeKey).toContain("paymob");
  });

  test("prefers the market country when the location text is unresolvable", () => {
    const [row] = jobRows([rawJob({ location: "Remote", country: PRIMARY_MARKET.country })]);
    expect(row.country).toBe("EG");
  });

  test("collapses the same posting arriving from two providers", () => {
    const rows = jobRows([
      rawJob({ source: "jooble", externalId: "a", company: "Paymob Solutions LLC", description: "short" }),
      rawJob({ source: "jsearch", externalId: "b", location: "القاهرة", description: "a much longer description" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("jsearch");
  });

  test("keeps rows without an identity separate", () => {
    const rows = jobRows([
      rawJob({ source: "jooble", externalId: "a", company: "" }),
      rawJob({ source: "jsearch", externalId: "b", company: "" }),
    ]);
    expect(rows).toHaveLength(2);
  });

  test("drops rows missing a url or title", () => {
    expect(jobRows([rawJob({ url: "" })])).toHaveLength(0);
    expect(jobRows([rawJob({ title: "" })])).toHaveLength(0);
  });
});
