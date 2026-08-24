jest.mock("nodemailer", () => {
  const sendMail = jest.fn();
  return {
    __esModule: true,
    default: { createTransport: () => ({ sendMail }) },
  };
});

process.env.CLIENT_URL = "https://overqualified.test/";
process.env.ADMIN_EMAIL = "admin@overqualified.test";

import nodemailer from "nodemailer";
import { emailService } from "../emailService";

const sendMail = (nodemailer.createTransport as unknown as () => { sendMail: jest.Mock })()
  .sendMail;

const lastHtml = (): string => sendMail.mock.calls.at(-1)![0].html;

describe("payment emails", () => {
  beforeEach(() => sendMail.mockClear());

  describe("sendPaymentApproved", () => {
    it("names the plan and its duration for a subscription", async () => {
      await emailService.sendPaymentApproved("user@test.com", "Omar", {
        displayName: "Pro Monthly",
        durationDays: 30,
        credits: 0,
      });

      const html = lastHtml();
      expect(html).toContain("Pro Monthly");
      expect(html).toContain("30 days");
      expect(html).not.toContain("credits have been added");
    });

    // A top-up grants no access period, so the subscription wording would be a false
    // promise of 30 days of Pro.
    it("names the credit grant for a top-up", async () => {
      await emailService.sendPaymentApproved("user@test.com", "Omar", {
        displayName: "+500 Credits",
        durationDays: 0,
        credits: 500,
      });

      const html = lastHtml();
      expect(html).toContain("500 credits");
      expect(html).not.toContain("days");
    });
  });

  describe("sendPaymentReceivedToAdmin", () => {
    it("links to the dashboard and never to the stored screenshot", async () => {
      await emailService.sendPaymentReceivedToAdmin({
        requestId: "req-1",
        userEmail: "user@test.com",
        userName: "Omar",
        referenceNumber: "ABC123",
        amount: "500.00",
      });

      const html = lastHtml();
      expect(html).toContain("https://overqualified.test/admin");
      expect(html).not.toContain("cloudinary");
      expect(html).not.toContain("X-Admin-Secret");
    });
  });
});
