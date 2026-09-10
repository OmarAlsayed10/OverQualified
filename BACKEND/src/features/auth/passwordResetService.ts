import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import prisma from "../../lib/prisma";
import { emailService } from "../../shared/emailService";
import { BCRYPT_ROUNDS, hashOTP, otpMatches } from "./registrationService";
import { normalizeEmail } from "../../lib/normalizeEmail";

export const RESET_OTP_TTL_MS = 15 * 60 * 1000;

// Every request outcome returns this one message so the endpoint cannot be used
// to discover which email addresses have accounts.
const REQUEST_MESSAGE =
  "If an account exists for that email, a reset code has been sent.";

// Wrong code, expired code and unknown email are all reported identically for
// the same reason.
const INVALID_MESSAGE = "That reset code is invalid or has expired.";

type ResetInput = {
  email?: unknown;
  otp?: unknown;
  password?: unknown;
};

type ResetResponse = {
  status: 200 | 400;
  message: string;
};

export const requestPasswordReset = async (email: unknown): Promise<string> => {
  if (typeof email !== "string" || !email.trim()) return REQUEST_MESSAGE;

  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });

  // A Google-only account has no password to reset, and an unverified account
  // must finish registration instead.
  if (!user || !user.emailVerified || !user.passwordHash) return REQUEST_MESSAGE;

  const otp = String(randomInt(100000, 999999));
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetOtp: hashOTP(otp),
      resetOtpExpiry: new Date(Date.now() + RESET_OTP_TTL_MS),
    },
  });
  await emailService.sendPasswordResetOTP(user.email, user.firstName, otp);
  return REQUEST_MESSAGE;
};

export const confirmPasswordReset = async (
  input: ResetInput
): Promise<ResetResponse> => {
  const { email, otp, password } = input;

  if (typeof email !== "string" || typeof otp !== "string" || typeof password !== "string") {
    return { status: 400, message: "Email, code and new password are required." };
  }
  if (password.length < 8) {
    return { status: 400, message: "Password must be at least 8 characters." };
  }

  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (
    !user?.resetOtp ||
    !user.resetOtpExpiry ||
    user.resetOtpExpiry.getTime() < Date.now() ||
    !otpMatches(otp, user.resetOtp)
  ) {
    return { status: 400, message: INVALID_MESSAGE };
  }

  // Clearing the code in the same write makes it single-use.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      resetOtp: null,
      resetOtpExpiry: null,
    },
  });

  return { status: 200, message: "Password updated. You can log in now." };
};
