import { displayName } from "../displayName";

describe("displayName", () => {
  it("omits a missing surname without leaving whitespace", () => {
    expect(displayName("Reelane", "")).toBe("Reelane");
    expect(displayName("Reelane", null)).toBe("Reelane");
  });

  it("trims and joins non-empty name parts", () => {
    expect(displayName(" Reelane ", " Smith ")).toBe("Reelane Smith");
  });
});
