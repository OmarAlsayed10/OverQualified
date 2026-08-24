import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../lib/prisma";
import { emailService } from "../../services/emailService";
import { register } from "../auth";

jest.mock("../../lib/prisma", () => ({
  __esModule: true,
  default: { user: { findUnique: jest.fn(), upsert: jest.fn() } },
}));
jest.mock("bcryptjs", () => ({ __esModule: true, default: { hash: jest.fn() } }));
jest.mock("../../services/emailService", () => ({ emailService: { sendOTP: jest.fn() } }));

const mockedFindUser = prisma.user.findUnique as jest.Mock;
const mockedUpsertUser = prisma.user.upsert as jest.Mock;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedEmailService = emailService as jest.Mocked<typeof emailService>;

const createResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
};

describe("register", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.JWT_SECRET_Key = "test-secret";
  });

  test("rejects an incomplete registration", async () => {
    const response = createResponse();

    await register({ body: { firstName: "Ada" } } as Request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "All fields are required." });
  });

  test("creates an unverified account and sends an OTP", async () => {
    const response = createResponse();
    mockedFindUser.mockResolvedValueOnce(null);
    mockedBcrypt.hash.mockResolvedValueOnce("password-hash" as never);

    await register({ body: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", password: "secure-password" } } as Request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ message: "Verification code sent to your email." });
    expect(mockedUpsertUser).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: "ada@example.com" },
      create: expect.objectContaining({ emailVerified: false, passwordHash: "password-hash" }),
    }));
    expect(mockedEmailService.sendOTP).toHaveBeenCalledWith("ada@example.com", "Ada", expect.any(String));
  });
});
