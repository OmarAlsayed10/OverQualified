import bcrypt from "bcryptjs";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import prisma from "../../lib/prisma";
import { emailService } from "../../shared/emailService";
import { normalizeEmail } from "../../lib/normalizeEmail";

export const BCRYPT_ROUNDS = 12;
export const OTP_TTL_MS = 10 * 60 * 1000;

type RegistrationInput = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  password?: unknown;
};

type RegistrationResponse = {
  status: 200 | 400 | 409;
  message: string;
};

export const hashOTP = (otp: string): string =>
  createHmac("sha256", process.env.JWT_SECRET_Key!).update(otp).digest("hex");

export const otpMatches = (input: string, storedHash: string): boolean => {
  const candidate = Buffer.from(hashOTP(input));
  const stored = Buffer.from(storedHash);
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
};

const validationFailure = ({ firstName, lastName, email, password }: RegistrationInput): RegistrationResponse | null => {
  if (!firstName || !lastName || !email || !password) {
    return { status: 400, message: "All fields are required." };
  }
  if (typeof password !== "string" || password.length < 8) {
    return { status: 400, message: "Password must be at least 8 characters." };
  }
  return null;
};

export const registerAccount = async (input: RegistrationInput): Promise<RegistrationResponse> => {
  const failure = validationFailure(input);
  if (failure) return failure;

  const { firstName, lastName, email, password } = input as Required<RegistrationInput>;
  const existing = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (existing?.emailVerified) {
    return { status: 409, message: "Email already registered." };
  }

  const otp = String(randomInt(100000, 999999));
  const passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
  const otpExpiry = new Date(Date.now() + OTP_TTL_MS);
  await prisma.user.upsert({
    where: { email: normalizeEmail(email) },
    update: { firstName: String(firstName), lastName: String(lastName), passwordHash, otp: hashOTP(otp), otpExpiry },
    create: { firstName: String(firstName), lastName: String(lastName), email: normalizeEmail(email), passwordHash, otp: hashOTP(otp), otpExpiry, emailVerified: false },
  });
  await emailService.sendOTP(normalizeEmail(email), String(firstName), otp);
  return { status: 200, message: "Verification code sent to your email." };
};
