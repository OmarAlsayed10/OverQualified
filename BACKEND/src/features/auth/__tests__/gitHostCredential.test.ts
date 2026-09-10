import { encryptSecret, decryptSecret, secretHint } from "../../../lib/secretBox";
import { hostFromUrl } from "../gitHostCredentialService";

const ORIGINAL_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY;

beforeAll(() => {
  process.env.CREDENTIAL_ENCRYPTION_KEY = "test-key-that-is-at-least-32-characters-long";
});

afterAll(() => {
  process.env.CREDENTIAL_ENCRYPTION_KEY = ORIGINAL_KEY;
});

describe("secretBox", () => {
  it("round-trips a token", () => {
    const token = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";
    expect(decryptSecret(encryptSecret(token))).toBe(token);
  });

  it("never stores the token in readable form", () => {
    const token = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";
    expect(encryptSecret(token)).not.toContain(token);
  });

  it("produces a different ciphertext each time", () => {
    const token = "glpat-abcdefghijklmnopqrst";
    expect(encryptSecret(token)).not.toBe(encryptSecret(token));
  });

  it("rejects a tampered payload", () => {
    const encrypted = encryptSecret("ghp_abcdefghijklmnopqrstuvwxyz0123456789");
    const [iv, tag, ciphertext] = encrypted.split(".");
    const flipped = ciphertext.startsWith("A") ? `B${ciphertext.slice(1)}` : `A${ciphertext.slice(1)}`;
    expect(() => decryptSecret([iv, tag, flipped].join("."))).toThrow();
  });

  it("exposes only the last four characters as a hint", () => {
    expect(secretHint("ghp_abcdefghijklmnop6789")).toBe("6789");
  });

  it("refuses to encrypt without a strong key", () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = "short";
    expect(() => encryptSecret("value")).toThrow(/CREDENTIAL_ENCRYPTION_KEY/);
    process.env.CREDENTIAL_ENCRYPTION_KEY = "test-key-that-is-at-least-32-characters-long";
  });
});

describe("hostFromUrl", () => {
  it("detects the provider from a repository URL", () => {
    expect(hostFromUrl("https://github.com/OmarAlsayed10/Furnterra")).toBe("GITHUB");
    expect(hostFromUrl("https://gitlab.com/group/sub/repo")).toBe("GITLAB");
    expect(hostFromUrl("https://bitbucket.org/a/b")).toBeNull();
  });
});
