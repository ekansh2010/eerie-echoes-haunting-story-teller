import nodemailer, { Transporter } from "nodemailer";
import { env, isTest } from "../config/env";
import { logger } from "../utils/logger";

export interface SentEmail {
  to: string;
  subject: string;
  html: string;
  /** The action link embedded in the email (verify/reset). */
  link: string;
}

/** In test mode emails are captured here instead of being sent. */
export const testOutbox: SentEmail[] = [];

let transporterPromise: Promise<Transporter | null> | null = null;

const createTransporter = async (): Promise<Transporter | null> => {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    logger.info("[Email] Using configured SMTP server");
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  if (env.NODE_ENV === "production") {
    logger.warn("[Email] SMTP is not configured; verification/reset emails will not be delivered");
    return null;
  }
  try {
    logger.info("[Email] No SMTP credentials; creating an Ethereal test inbox (dev only)");
    const account = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass },
    });
  } catch (err) {
    logger.error("[Email] Could not create Ethereal account", err);
    return null;
  }
};

const getTransporter = () => {
  if (!transporterPromise) transporterPromise = createTransporter();
  return transporterPromise;
};

const layout = (intro: string, body: string, link: string, cta: string, footer: string) => `
  <div style="background-color:#0b0606;color:#f2e6e6;font-family:'Courier New',Courier,monospace;padding:40px;border:2px solid #8b0000;max-width:600px;margin:0 auto;border-radius:8px;">
    <h1 style="color:#ff3b30;text-align:center;text-shadow:0 0 10px #ff3b30;border-bottom:2px solid #ff3b30;padding-bottom:15px;text-transform:uppercase;letter-spacing:2px;">Eerie Echoes</h1>
    <p style="font-size:16px;line-height:1.6;margin-top:25px;">${intro}</p>
    <p style="font-size:16px;line-height:1.6;">${body}</p>
    <div style="text-align:center;margin:40px 0;">
      <a href="${link}" style="background-color:#ff3b30;color:#ffffff;padding:15px 30px;text-decoration:none;border-radius:4px;font-weight:bold;border:1px solid #8b0000;text-transform:uppercase;letter-spacing:1px;display:inline-block;">${cta}</a>
    </div>
    <p style="font-size:12px;color:#887878;text-align:center;margin-top:40px;border-top:1px dashed #554444;padding-top:20px;">${footer}</p>
  </div>`;

/**
 * Sends an email and resolves to whether it was handed to a transport.
 * Never throws — email problems must not break the API request.
 */
const send = async (email: SentEmail): Promise<boolean> => {
  if (isTest) {
    testOutbox.push(email);
    return true;
  }
  try {
    const client = await getTransporter();
    if (!client) return false;
    const info = await client.sendMail({ from: env.SMTP_FROM, to: email.to, subject: email.subject, html: email.html });
    const preview = nodemailer.getTestMessageUrl(info);
    logger.info(`[Email] "${email.subject}" sent${preview ? ` — preview: ${preview}` : ""}`);
    return true;
  } catch (err) {
    logger.error("[Email] Failed to send email", err);
    return false;
  }
};

const frontendUrl = () => env.FRONTEND_URL.replace(/\/+$/, "");

export const sendVerificationEmail = (to: string, token: string) => {
  const link = `${frontendUrl()}/verify-email?token=${token}`;
  return send({
    to,
    link,
    subject: "💀 Verify your soul on Eerie Echoes 🩸",
    html: layout(
      "Greetings, traveler of the dark feed.",
      "Before you can fully join the void of stories, we must verify your email address. This link expires in 24 hours.",
      link,
      "Verify Soul",
      "If this was a mistake, ignore this scroll. It will dissolve in the shadow realm.",
    ),
  });
};

export const sendPasswordResetEmail = (to: string, token: string) => {
  const link = `${frontendUrl()}/reset-password?token=${token}`;
  return send({
    to,
    link,
    subject: "💀 Eerie Echoes — Reset your key to the void 🔑",
    html: layout(
      "A request to reset your password was heard from the shadows.",
      "Use the sigil below to create a new key. This link expires in 1 hour.",
      link,
      "Reset Password",
      "If you did not request this, you can safely ignore this email.",
    ),
  });
};
