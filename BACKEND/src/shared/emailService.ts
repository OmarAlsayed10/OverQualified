import nodemailer, { Transporter } from "nodemailer";

// Escape user-controlled values before interpolating into HTML emails (prevents HTML/script injection).
const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// CLIENT_URL is the validated deployment origin; a trailing slash would double up
// against the path appended to it.
const clientOrigin = (): string => (process.env.CLIENT_URL ?? "").replace(/\/+$/, "");

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

interface PaymentAdminNotification {
  requestId: string;
  userEmail: string;
  userName: string;
  referenceNumber: string;
  amount: string;
}

class EmailService {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Relays that sign for us (SES, Resend, Postmark) need no local key; this
      // only signs when a key is supplied for a self-hosted SMTP host.
      ...(process.env.EMAIL_DKIM_PRIVATE_KEY
        ? {
            dkim: {
              domainName: process.env.EMAIL_DKIM_DOMAIN!,
              keySelector: process.env.EMAIL_DKIM_SELECTOR!,
              privateKey: process.env.EMAIL_DKIM_PRIVATE_KEY,
            },
          }
        : {}),
    });
  }

  private async send(payload: EmailPayload): Promise<void> {
    await this.transporter.sendMail({
      // On a relay the authenticated user is not the sending identity, and a
      // From that does not align with the signing domain fails DMARC.
      from: process.env.EMAIL_FROM || `"OverQualified" <${process.env.EMAIL_USER}>`,
      disableFileAccess: true,
      disableUrlAccess: true,
      ...payload,
    });
  }

  async sendOTP(to: string, firstName: string, otp: string): Promise<void> {
    await this.send({
      to,
      subject: "OverQualified — Your Verification Code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Hello ${esc(firstName)},</h2>
          <p>Your one-time verification code is:</p>
          <div style="font-size:36px;letter-spacing:10px;font-weight:bold;padding:16px;background:#f4f4f4;display:inline-block;border-radius:8px">
            ${otp}
          </div>
          <p style="color:#888;font-size:13px">Expires in <strong>10 minutes</strong>. Do not share this code.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetOTP(
    to: string,
    firstName: string,
    otp: string
  ): Promise<void> {
    await this.send({
      to,
      subject: "OverQualified — Reset Your Password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Hello ${esc(firstName)},</h2>
          <p>Use this code to set a new password:</p>
          <div style="font-size:36px;letter-spacing:10px;font-weight:bold;padding:16px;background:#f4f4f4;display:inline-block;border-radius:8px">
            ${otp}
          </div>
          <p style="color:#888;font-size:13px">Expires in <strong>15 minutes</strong> and can be used once. If you did not ask for this, ignore this email — your password has not changed.</p>
        </div>
      `,
    });
  }

  async sendWelcome(to: string, firstName: string): Promise<void> {
    await this.send({
      to,
      subject: "Welcome to OverQualified!",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Welcome, ${esc(firstName)}!</h2>
          <p>Your account is verified. Start building a professional CV that beats ATS filters and lands interviews.</p>
        </div>
      `,
    });
  }

  async sendPaymentReceivedToAdmin(
    details: PaymentAdminNotification
  ): Promise<void> {
    const adminUrl = `${clientOrigin()}/admin`;
    await this.send({
      to: process.env.ADMIN_EMAIL!,
      subject: `[OverQualified] New Payment — Ref: ${details.referenceNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2>New InstaPay Payment Request</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:8px;border:1px solid #ddd"><strong>User</strong></td>
                <td style="padding:8px;border:1px solid #ddd">${esc(details.userName)} &lt;${esc(details.userEmail)}&gt;</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><strong>Reference #</strong></td>
                <td style="padding:8px;border:1px solid #ddd">${esc(details.referenceNumber)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><strong>Amount</strong></td>
                <td style="padding:8px;border:1px solid #ddd">${esc(details.amount)} EGP</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><strong>Request ID</strong></td>
                <td style="padding:8px;border:1px solid #ddd">${esc(details.requestId)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><strong>Review</strong></td>
                <td style="padding:8px;border:1px solid #ddd"><a href="${esc(adminUrl)}">View in Admin Dashboard</a></td></tr>
          </table>
          <br/>
          <p>Use your admin dashboard or API to approve or reject this request.</p>
        </div>
      `,
    });
  }

  async sendPaymentApproved(
    to: string,
    firstName: string,
    purchase: { displayName: string; durationDays: number; credits: number }
  ): Promise<void> {
    const granted =
      purchase.durationDays > 0
        ? `<strong>${esc(purchase.displayName)}</strong> is now active for ${purchase.durationDays} days`
        : `<strong>${purchase.credits} credits</strong> have been added to your balance`;
    await this.send({
      to,
      subject: "OverQualified — Payment Approved!",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Congratulations, ${esc(firstName)}!</h2>
          <p>Your payment has been verified. ${granted}.</p>
          <p>Enjoy CV optimization, AI writing, and interview prep.</p>
        </div>
      `,
    });
  }

  async sendPaymentRejected(
    to: string,
    firstName: string,
    reason: string
  ): Promise<void> {
    await this.send({
      to,
      subject: "OverQualified — Payment Could Not Be Verified",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Hi ${esc(firstName)},</h2>
          <p>Unfortunately we could not verify your payment:</p>
          <blockquote style="border-left:4px solid #e00;padding-left:12px;color:#555">${esc(reason)}</blockquote>
          <p>Please try again or contact our support team.</p>
        </div>
      `,
    });
  }

  async sendProExpiringSoon(
    to: string,
    firstName: string,
    daysLeft: number
  ): Promise<void> {
    await this.send({
      to,
      subject: `OverQualified Pro expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Hi ${esc(firstName)},</h2>
          <p>Your Pro subscription expires in <strong>${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>.</p>
          <p>Renew now to keep uninterrupted access to all Pro features.</p>
        </div>
      `,
    });
  }

  async sendJobDigest(
    to: string,
    firstName: string,
    jobs: { title: string; company: string; location: string | null; url: string; fitScore: number; earlyBird: boolean }[]
  ): Promise<void> {
    if (jobs.length === 0) return;
    const rows = jobs
      .map(
        (j) => `
        <div style="padding:12px 0;border-bottom:1px solid #eee">
          <a href="${esc(j.url)}" style="font-weight:bold;color:#2a5c45;text-decoration:none">${esc(j.title)}</a>
          ${j.earlyBird ? `<span style="background:#2a5c45;color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;margin-left:6px">Apply early</span>` : ""}
          <div style="color:#666;font-size:13px">${esc(j.company)}${j.location ? " · " + esc(j.location) : ""} · ${j.fitScore}% match</div>
        </div>`
      )
      .join("");
    await this.send({
      to,
      subject: `OverQualified — ${jobs.length} new job match${jobs.length !== 1 ? "es" : ""} for you`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2>Hi ${esc(firstName)},</h2>
          <p>Here are your top new matches. The <strong>Apply early</strong> ones were just posted — get in before the competition.</p>
          ${rows}
          <p style="color:#888;font-size:12px;margin-top:16px">Open OverQualified to see all matches and track your applications.</p>
        </div>
      `,
    });
  }

  async sendApplicationReminder(
    to: string,
    firstName: string,
    jobTitle: string,
    company: string,
    matchId: string,
    notes?: string | null
  ): Promise<void> {
    await this.send({
      to,
      subject: `Reminder: Follow up on your application for ${jobTitle} at ${company}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2>Hi ${esc(firstName)},</h2>
          <p>This is your reminder to follow up on your job application:</p>
          <div style="background:#f4f6f8;padding:16px;border-radius:8px;margin:16px 0">
            <h3 style="margin:0 0 8px 0;color:#2a5c45">${esc(jobTitle)}</h3>
            <p style="margin:0;color:#555"><strong>Company:</strong> ${esc(company)}</p>
            ${notes ? `<p style="margin:8px 0 0 0;color:#666"><strong>Notes:</strong> ${esc(notes)}</p>` : ""}
          </div>
          <p style="margin-top:16px"><a href="${clientOrigin()}/applications/${esc(matchId)}" style="background:#2a5c45;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;display:inline-block">Open Application Workspace</a></p>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
