import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import {
  APP_BASE_URL,
  MAIL_FROM,
  NODE_ENV,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  STATIC_ROOT,
} from '../config/env';

interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return String(value || '').replace(/[&<>"']/g, char => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
  ));
}

function brandedEmail(title: string, intro: string, actionUrl: string, actionLabel: string, extra: string): MailMessage['html'] {
  const safeUrl = escapeHtml(actionUrl);
  return `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Inter,system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border:1px solid #e2e8f0;border-top:3px solid #e63946;border-radius:16px;padding:28px;">
    <p style="font-size:20px;font-weight:800;letter-spacing:-.6px;margin:0 0 8px;">Bis<span style="color:#e63946;">coon</span>.com</p>
    <h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(title)}</h1>
    <p style="font-size:14px;line-height:1.7;color:#475569;">${escapeHtml(intro)}</p>
    <p style="margin:24px 0;"><a href="${safeUrl}" style="display:inline-block;background:#e63946;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:20px;">${escapeHtml(actionLabel)}</a></p>
    <p style="font-size:12px;line-height:1.6;color:#64748b;">${escapeHtml(extra)}</p>
    <p style="font-size:11px;color:#94a3b8;word-break:break-all;">${safeUrl}</p>
  </div>
</body></html>`;
}

function writeOutbox(message: MailMessage): void {
  if (NODE_ENV !== 'development') return;
  const dir = path.join(STATIC_ROOT, 'data', 'mail-outbox');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeTo = message.to.replace(/[^a-zA-Z0-9@._-]/g, '_');
  fs.writeFileSync(
    path.join(dir, `${stamp}-${safeTo}.html`),
    `<!-- to: ${message.to} subject: ${message.subject} -->\n${message.html}`
  );
}

async function sendViaSmtp(message: MailMessage): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  await transporter.sendMail({
    from: MAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

export async function sendMail(message: MailMessage): Promise<boolean> {
  writeOutbox(message);
  if (!SMTP_HOST) {
    if (NODE_ENV === 'development') {
      console.info(`[mail] SMTP is not configured. Confirmation was not sent to ${message.to}`);
      console.info(message.text);
    }
    return false;
  }
  await sendViaSmtp(message);
  return true;
}

export function isMailConfigured(): boolean {
  return Boolean(SMTP_HOST);
}

export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const url = new URL('/pages/auth/verify-email.html', APP_BASE_URL);
  url.searchParams.set('email', to);
  url.searchParams.set('token', token);
  const actionUrl = url.toString();
  return sendMail({
    to,
    subject: 'Confirm your Biscoon account',
    text: `Confirm your Biscoon account:\n${actionUrl}\n\nThis link expires in 24 hours.`,
    html: brandedEmail(
      'Confirm your email',
      'Thanks for joining Biscoon. Confirm this address so you can sign in, post listings, and reset your password later.',
      actionUrl,
      'Confirm email',
      'This link expires in 24 hours. If you did not create a Biscoon account, you can ignore this email.'
    ),
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  const url = new URL('/pages/auth/reset-password.html', APP_BASE_URL);
  url.searchParams.set('email', to);
  url.searchParams.set('token', token);
  const actionUrl = url.toString();
  return sendMail({
    to,
    subject: 'Reset your Biscoon password',
    text: `Reset your Biscoon password:\n${actionUrl}\n\nThis link expires in 1 hour.`,
    html: brandedEmail(
      'Reset your password',
      'We received a request to reset the password for this Biscoon account. Choose a new password with the button below.',
      actionUrl,
      'Choose a new password',
      'This link expires in 1 hour. If you did not ask for a reset, you can ignore this email and your password will stay the same.'
    ),
  });
}
