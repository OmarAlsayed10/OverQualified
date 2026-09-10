import { v2 as cloudinary } from "cloudinary";
import {
  cloudinaryDeliveryTypeFromUrl,
  cloudinaryPublicIdFromUrl,
  signedScreenshotUrl,
} from "../importService";

describe("Cloudinary public ID extraction with upload and authenticated URLs", () => {
  beforeAll(() => {
    cloudinary.config({
      cloud_name: "demo",
      api_key: "test-key",
      api_secret: "test-secret",
    });
  });

  test.each([
    [
      "https://res.cloudinary.com/demo/image/upload/v1234567890/avatars/profile.jpg",
      "image" as const,
      "avatars/profile",
    ],
    [
      "https://res.cloudinary.com/demo/image/upload/avatars/profile.jpg",
      "image" as const,
      "avatars/profile",
    ],
    [
      "https://res.cloudinary.com/demo/image/authenticated/s--xyz123--/v1234567890/payment-screenshots/pay-123.jpg",
      "image" as const,
      "payment-screenshots/pay-123",
    ],
    [
      "https://res.cloudinary.com/demo/image/authenticated/v1234567890/payment-screenshots/pay-123.jpg",
      "image" as const,
      "payment-screenshots/pay-123",
    ],
    [
      "https://res.cloudinary.com/demo/image/authenticated/payment-screenshots/pay-123.jpg",
      "image" as const,
      "payment-screenshots/pay-123",
    ],
    [
      "https://res.cloudinary.com/demo/raw/upload/v1234567890/resumes/candidate.pdf",
      "raw" as const,
      "resumes/candidate.pdf",
    ],
    [
      "https://res.cloudinary.com/demo/raw/upload/resumes/candidate.pdf",
      "raw" as const,
      "resumes/candidate.pdf",
    ],
    [
      "https://res.cloudinary.com/demo/raw/authenticated/v1234567890/resumes/candidate.pdf",
      "raw" as const,
      "resumes/candidate.pdf",
    ],
  ])("extracts public ID from %s", (url, resourceType, expected) => {
    expect(cloudinaryPublicIdFromUrl(url, resourceType)).toBe(expected);
  });

  test("returns null for malformed or non-Cloudinary URLs", () => {
    expect(cloudinaryPublicIdFromUrl("https://example.com/avatar.jpg", "image")).toBeNull();
    expect(cloudinaryPublicIdFromUrl("not-a-valid-url", "image")).toBeNull();
    expect(cloudinaryPublicIdFromUrl("https://res.cloudinary.com/demo/image/", "image")).toBeNull();
  });

  test("generates signed screenshot url or returns null on malformed input", () => {
    expect(signedScreenshotUrl("not-a-valid-url")).toBeNull();
    const signed = signedScreenshotUrl(
      "https://res.cloudinary.com/demo/image/authenticated/v1234567890/payment-screenshots/pay-123.jpg"
    );
    expect(typeof signed).toBe("string");
    expect(signed).toContain("type=authenticated");
    expect(signed).toContain("payment-screenshots%2Fpay-123");
  });

  // Screenshots stored before private delivery are public assets. Signing one as
  // authenticated yields a URL that resolves to nothing, so the original must come back
  // untouched or admins lose access to every pre-existing payment proof.
  test("returns a legacy public screenshot url unchanged", () => {
    const legacy =
      "https://res.cloudinary.com/demo/image/upload/v1234567890/payment-screenshots/pay-legacy.jpg";
    expect(signedScreenshotUrl(legacy)).toBe(legacy);
  });

  test("reads delivery type back from the stored url", () => {
    expect(
      cloudinaryDeliveryTypeFromUrl(
        "https://res.cloudinary.com/demo/image/authenticated/v1/x.jpg"
      )
    ).toBe("authenticated");
    expect(
      cloudinaryDeliveryTypeFromUrl("https://res.cloudinary.com/demo/image/upload/v1/x.jpg")
    ).toBe("upload");
  });
});
