import { parseTrustProxyHops } from "../env";

describe("parseTrustProxyHops", () => {
  test.each([
    [undefined, 0],
    ["0", 0],
    ["2", 2],
  ])("accepts %p as %i proxy hops", (configuredValue, expectedHops) => {
    expect(parseTrustProxyHops(configuredValue)).toBe(expectedHops);
  });

  test.each(["", "-1", "1.5", "two", "999999999999999999999"])(
    "rejects invalid proxy hop value %p",
    (configuredValue) => {
      expect(() => parseTrustProxyHops(configuredValue)).toThrow(
        "TRUST_PROXY_HOPS must be a non-negative integer."
      );
    }
  );
});
