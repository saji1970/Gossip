import 'dotenv/config';
import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

function createTransport() {
  if (!config.smtp.host || !config.smtp.user) {
    logger.warn('SMTP not configured — emails will be logged only');
    return null;
  }

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

const transporter = createTransport();

const worker = new Worker(
  'invite-queue',
  async (job) => {
    const { email, groupName, inviteLink, inviteId } = job.data;

    logger.info({ jobId: job.id, email, groupName }, 'processing invite email');

    const subject = `You're invited to join ${groupName} on Gossip!`;

    const text = [
      `Hi there!`,
      ``,
      `You've been invited to join "${groupName}" on Gossip.`,
      ``,
      `Click the link below to accept:`,
      inviteLink,
      ``,
      `This invite expires in 24 hours.`,
      ``,
      `— The Gossip Team`,
    ].join('\n');

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0F172A; color: #E2E8F0; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto; background: #1E293B; border-radius: 16px; padding: 32px; border: 1px solid rgba(129,140,248,0.2);">
    <h1 style="color: #818CF8; font-size: 24px; margin-bottom: 8px;">You're invited!</h1>
    <p style="font-size: 16px; line-height: 1.6;">
      You've been invited to join <strong style="color: #34D399;">${groupName}</strong> on Gossip.
    </p>
    <a href="${inviteLink}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #818CF8; color: #fff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
      Accept Invite
    </a>
    <p style="font-size: 13px; color: #64748B;">This invite expires in 24 hours.</p>
    <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;">
    <p style="font-size: 12px; color: #475569;">Gossip — Your voice-first chat app</p>
  </div>
</body>
</html>`;

    if (!transporter) {
      logger.info({ email, groupName, inviteLink }, 'SMTP not configured — email logged');
      return { sent: false, logged: true };
    }

    await transporter.sendMail({
      from: config.smtp.from,
      to: email,
      subject,
      text,
      html,
    });

    logger.info({ email, groupName, inviteId }, 'invite email sent');
    return { sent: true };
  },
  {
    connection,
    concurrency: 5,
    limiter: { max: 10, duration: 60000 },
  },
);

worker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, 'invite email job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'invite email job failed');
});

logger.info('Invite email worker started');
