import { randomInt } from "crypto";
import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { normalizeEmail } from "../../lib/normalizeEmail";
import { emailService } from "../../services/emailService";
import { hasPaidAccess } from "../../services/entitlementService";
import { hashOTP, otpMatches, OTP_TTL_MS } from "../../services/registrationService";
import { issueAuthToken } from "../../services/authSessionService";

export const verifyOTP = async (request: Request, response: Response): Promise<void> => {
  const { email, otp } = request.body;
  if (!email || !otp) {
    response.status(400).json({ message: "Email and OTP are required." });
    return;
  }

  const emailAddress = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: emailAddress } });
  if (!user || !user.otp || !user.otpExpiry) {
    response.status(400).json({ message: "No pending verification for this email." });
    return;
  }
  if (new Date() > user.otpExpiry) {
    response.status(410).json({ message: "OTP has expired. Please request a new one." });
    return;
  }
  if (!otpMatches(otp, user.otp)) {
    response.status(401).json({ message: "Invalid OTP." });
    return;
  }

  const verified = await prisma.user.update({
    where: { email: emailAddress },
    data: { emailVerified: true, otp: null, otpExpiry: null },
  });
  await emailService.sendWelcome(emailAddress, verified.firstName);
  issueAuthToken(response, verified);
  response.status(200).json({
    message: "Email verified successfully.",
    user: {
      id: verified.id,
      email: verified.email,
      firstName: verified.firstName,
      lastName: verified.lastName,
      role: verified.role,
      planTier: verified.planTier,
      isPro: hasPaidAccess(verified),
      proExpiresAt: verified.proExpiresAt ? verified.proExpiresAt.getTime() : null,
    },
  });
};

export const resendOTP = async (request: Request, response: Response): Promise<void> => {
  const { email } = request.body;
  if (!email) {
    response.status(400).json({ message: "Email is required." });
    return;
  }

  const emailAddress = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: emailAddress } });
  if (!user || user.emailVerified) {
    response.status(200).json({ message: "If that email has a pending registration, a new code was sent." });
    return;
  }

  const otp = String(randomInt(100000, 999999));
  await prisma.user.update({
    where: { email: emailAddress },
    data: { otp: hashOTP(otp), otpExpiry: new Date(Date.now() + OTP_TTL_MS) },
  });
  await emailService.sendOTP(emailAddress, user.firstName, otp);
  response.status(200).json({ message: "If that email has a pending registration, a new code was sent." });
};
