import { cloudinaryPublicIdFromUrl } from "../importService";

describe("Cloudinary asset identification", () => {
  test.each([
    [
      "https://res.cloudinary.com/demo/image/upload/v123/avatars/profile.jpg",
      "image" as const,
      "avatars/profile",
    ],
    [
      "https://res.cloudinary.com/demo/raw/upload/v123/resumes/candidate.pdf",
      "raw" as const,
      "resumes/candidate.pdf",
    ],
  ])("extracts the destroy public ID from %s", (url, resourceType, expected) => {
    expect(cloudinaryPublicIdFromUrl(url, resourceType)).toBe(expected);
  });

  test("rejects a URL that is not a Cloudinary upload URL", () => {
    expect(
      cloudinaryPublicIdFromUrl("https://example.com/avatar.jpg", "image"),
    ).toBeNull();
  });
});
