process.env.JWT_SECRET_Key = "test-secret";

const findUnique = jest.fn();
const update = jest.fn();
const sendPasswordResetOTP = jest.fn();

jest.mock("../../../lib/prisma", () => ({
  __esModule: true,
  default: { user: { findUnique: (...a: unknown[]) => findUnique(...a), update: (...a: unknown[]) => update(...a) } },
}));
jest.mock("../../../shared/emailService", () => ({
  emailService: { sendPasswordResetOTP: (...a: unknown[]) => sendPasswordResetOTP(...a) },
}));

import { confirmPasswordReset, requestPasswordReset } from "../passwordResetService";
import { hashOTP } from "../registrationService";

const verifiedUser = {
  id: "u1",
  email: "a@b.com",
  firstName: "Omar",
  emailVerified: true,
  passwordHash: "hashed",
  googleId: null,
  resetOtp: null as string | null,
  resetOtpExpiry: null as Date | null,
};

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset();
  sendPasswordResetOTP.mockReset();
});

describe("reset request", () => {
  test("sends a code to a verified password account", async () => {
    findUnique.mockResolvedValue(verifiedUser);
    await requestPasswordReset("a@b.com");

    expect(sendPasswordResetOTP).toHaveBeenCalledTimes(1);
    const stored = update.mock.calls[0][0].data.resetOtp;
    const mailed = sendPasswordResetOTP.mock.calls[0][2];
    expect(stored).toBe(hashOTP(mailed));
    expect(stored).not.toBe(mailed);
  });

  test.each([
    ["unknown email", null],
    ["google-only account", { ...verifiedUser, passwordHash: null, googleId: "g1" }],
    ["unverified account", { ...verifiedUser, emailVerified: false }],
  ])("stays silent for %s but answers identically", async (_label, user) => {
    findUnique.mockResolvedValue(user);
    const message = await requestPasswordReset("a@b.com");

    expect(sendPasswordResetOTP).not.toHaveBeenCalled();
    findUnique.mockResolvedValue(verifiedUser);
    expect(await requestPasswordReset("a@b.com")).toBe(message);
  });
});

describe("reset confirmation", () => {
  const future = () => new Date(Date.now() + 60_000);

  test("accepts a valid code and clears it so it cannot be reused", async () => {
    findUnique.mockResolvedValue({ ...verifiedUser, resetOtp: hashOTP("123456"), resetOtpExpiry: future() });

    const result = await confirmPasswordReset({ email: "a@b.com", otp: "123456", password: "newpassword1" });

    expect(result.status).toBe(200);
    const data = update.mock.calls[0][0].data;
    expect(data.resetOtp).toBeNull();
    expect(data.resetOtpExpiry).toBeNull();
    expect(data.passwordHash).not.toBe("newpassword1");
  });

  test.each([
    ["a wrong code", { resetOtp: hashOTP("999999"), resetOtpExpiry: future() }],
    ["an expired code", { resetOtp: hashOTP("123456"), resetOtpExpiry: new Date(Date.now() - 1) }],
    ["no pending code", { resetOtp: null, resetOtpExpiry: null }],
  ])("rejects %s without writing a password", async (_label, state) => {
    findUnique.mockResolvedValue({ ...verifiedUser, ...state });

    const result = await confirmPasswordReset({ email: "a@b.com", otp: "123456", password: "newpassword1" });

    expect(result.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  test("rejects a short password before touching the database", async () => {
    const result = await confirmPasswordReset({ email: "a@b.com", otp: "123456", password: "short" });

    expect(result.status).toBe(400);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
