/**
 * notification.ts — Email notifications via Nodemailer (SMTP)
 *
 * Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in your .env
 * to enable email notifications. If SMTP_HOST is not set, notifications
 * are silently skipped (logged to console in development).
 */
import nodemailer from "nodemailer";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
  /** Optional recipient email. Defaults to OWNER_EMAIL if not provided. */
  to?: string;
};

function getTransporter() {
  if (!ENV.smtpHost) return null;
  return nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    auth: {
      user: ENV.smtpUser,
      pass: ENV.smtpPass,
    },
  });
}

/**
 * Send an email notification. Silently no-ops if SMTP is not configured.
 * Safe to call with `.catch(() => {})` — never throws.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<void> {
  const to = payload.to ?? ENV.ownerEmail;
  if (!to) {
    if (!ENV.isProduction) {
      console.log(`[Notification] (no SMTP) ${payload.title}: ${payload.content}`);
    }
    return;
  }

  const transporter = getTransporter();
  if (!transporter) {
    if (!ENV.isProduction) {
      console.log(`[Notification] (no SMTP) To: ${to} | ${payload.title}: ${payload.content}`);
    }
    return;
  }

  try {
    await transporter.sendMail({
      from: ENV.smtpFrom,
      to,
      subject: payload.title,
      text: payload.content,
      html: `<p>${payload.content.replace(/\n/g, "<br>")}</p>`,
    });
  } catch (err) {
    console.error("[Notification] Failed to send email:", err);
  }
}
