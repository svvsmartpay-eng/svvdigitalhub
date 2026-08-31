import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  if (!env.ENABLE_EMAIL_NOTIFICATIONS) return;
  try {
    const t = getTransporter();
    await t.sendMail({
      from: env.EMAIL_FROM,
      replyTo: opts.replyTo ?? env.EMAIL_REPLY_TO,
      to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    logger.info('Email sent', { to: opts.to, subject: opts.subject });
  } catch (err) {
    logger.error('Email send failed', { err, to: opts.to, subject: opts.subject });
    // Do not throw — email failure should not break main workflow
  }
}

export function issueNotificationEmail(params: {
  issueNo: string;
  assetName: string;
  branchCode: string;
  priority: string;
  raisedBy: string;
  description: string;
  dashboardUrl: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e3a5f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">SVV AMS – New Issue Raised</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold;">Issue No:</td><td style="padding: 8px;">${params.issueNo}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Asset:</td><td style="padding: 8px;">${params.assetName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Branch:</td><td style="padding: 8px;">${params.branchCode}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Priority:</td><td style="padding: 8px;"><span style="color: ${params.priority === 'CRITICAL' ? '#dc2626' : params.priority === 'HIGH' ? '#ea580c' : '#d97706'};">${params.priority}</span></td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Raised By:</td><td style="padding: 8px;">${params.raisedBy}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Description:</td><td style="padding: 8px;">${params.description}</td></tr>
        </table>
        <div style="margin-top: 20px;">
          <a href="${params.dashboardUrl}" style="background: #1e3a5f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Issue</a>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This is an automated notification from SVV AMS.</p>
      </div>
    </div>
  `;
}
