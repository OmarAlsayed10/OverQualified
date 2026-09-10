import { fetchProvider } from "../jobProviderOutcome";

describe("fetchProvider", () => {
  test.each([
    ["unconfigured", false, Promise.resolve([]), { provider: "source", status: "unconfigured", jobs: [] }],
    ["empty", true, Promise.resolve([]), { provider: "source", status: "empty", jobs: [] }],
    ["success", true, Promise.resolve([{ source: "source", externalId: "1", title: "Role", company: "Company", location: null, url: "https://example.com", postedAt: null, description: "Description" }]), { provider: "source", status: "success", jobs: [{ source: "source", externalId: "1", title: "Role", company: "Company", location: null, url: "https://example.com", postedAt: null, description: "Description" }] }],
  ])("returns %s provider state", async (_scenario, configured, jobs, expected) => {
    await expect(fetchProvider({ id: "source", configured: () => configured, fetch: () => jobs })).resolves.toEqual(expected);
  });

  test("returns a redacted failure outcome", async () => {
    await expect(fetchProvider({ id: "source", configured: () => true, fetch: async () => { throw new Error("provider failed"); } })).resolves.toEqual({
      provider: "source",
      status: "failed",
      jobs: [],
      errorCode: "REQUEST_FAILED",
    });
  });
});
