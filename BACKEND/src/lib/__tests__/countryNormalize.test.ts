import { normalizeCountry, countDistinctCountries } from "../countryNormalize";

describe("countryNormalize", () => {
  describe("normalizeCountry", () => {
    it("returns null for null, undefined, or empty location strings", () => {
      expect(normalizeCountry(null)).toBeNull();
      expect(normalizeCountry(undefined)).toBeNull();
      expect(normalizeCountry("")).toBeNull();
      expect(normalizeCountry("   ")).toBeNull();
    });

    it("normalizes known country aliases correctly", () => {
      expect(normalizeCountry("New York, NY, USA")).toBe("United States");
      expect(normalizeCountry("London, UK")).toBe("United Kingdom");
      expect(normalizeCountry("Dubai, UAE")).toBe("United Arab Emirates");
      expect(normalizeCountry("Riyadh, KSA")).toBe("Saudi Arabia");
      expect(normalizeCountry("Cairo, Egypt")).toBe("Egypt");
      expect(normalizeCountry("Berlin, Germany")).toBe("Germany");
    });

    it("excludes ambiguous locations", () => {
      expect(normalizeCountry("Remote")).toBeNull();
      expect(normalizeCountry("San Francisco, Remote")).toBeNull();
      expect(normalizeCountry("Worldwide")).toBeNull();
      expect(normalizeCountry("Global")).toBeNull();
      expect(normalizeCountry("Anywhere")).toBeNull();
      expect(normalizeCountry("Online")).toBeNull();
    });

    it("capitalizes unknown valid country names", () => {
      expect(normalizeCountry("Tokyo, japan")).toBe("Japan");
      expect(normalizeCountry("Madrid, spain")).toBe("Spain");
    });
  });

  describe("countDistinctCountries", () => {
    it("counts unique normalized countries and ignores invalid/ambiguous entries", () => {
      const locations = [
        "New York, USA",
        "Los Angeles, US",
        "London, UK",
        "Remote",
        "Cairo, Egypt",
        "Alexandria, Egypt",
        "Worldwide",
        null,
      ];
      // "USA" -> United States
      // "US" -> United States
      // "UK" -> United Kingdom
      // "Remote" -> null
      // "Egypt" -> Egypt (x2)
      // "Worldwide" -> null
      // null -> null
      // Distinct: United States, United Kingdom, Egypt = 3
      expect(countDistinctCountries(locations)).toBe(3);
    });
  });
});
