import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { config } from '../config/env';
import { EmailJobData, emailQueue } from '../queues/emailQueue';
import { prisma } from '../config/db';
import { dispatchEmail } from '../services/unifiedEmailService';
import { indexEmail } from '../elasticsearch/client';
import { sendSlackRateLimitNotification } from '../slack/slackService';

function getCurrentHourKey(sender: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  return `email-rate:${sender}:${year}-${month}-${day}-${hour}`;
}

function getCurrentHourWindow(): string {
  const now = new Date();
  const startHour = now.getHours();
  const endHour = (startHour + 1) % 24;
  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:00 ${ampm}`;
  };
  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
}

export function startEmailWorker() {
  const worker = new Worker<EmailJobData>(
    'email-queue',
    async (job: Job<EmailJobData>) => {
      const { recipientId, scheduleId, userId, sender, email, subject, body, hourlyLimit, idempotencyKey } = job.data;

      console.log(`\n[WORKER] Job received: jobId=${job.id}, recipient=${email}, scheduledAt=${job.data.scheduledAt || 'N/A'}`);

      // 1. Idempotency & Database Check
      const recipient = await prisma.emailRecipient.findUnique({
        where: { id: recipientId },
        include: { schedule: true },
      });

      if (!recipient) {
        console.warn(`[WORKER] Recipient record ${recipientId} not found in database. Skipping.`);
        return;
      }

      if (recipient.status === 'SENT') {
        console.log(`[WORKER] Idempotency check passed: Email to ${email} (key: ${idempotencyKey}) was already SENT. Skipping.`);
        return;
      }

      // Update status to PROCESSING
      await prisma.emailRecipient.update({
        where: { id: recipientId },
        data: { status: 'PROCESSING' },
      });
      await prisma.emailSchedule.update({
        where: { id: scheduleId },
        data: { status: 'PROCESSING' },
      });

      // 2. Redis Hourly Rate Limiting Check
      const rateKey = getCurrentHourKey(sender);
      const currentCountStr = await redisConnection.get(rateKey);
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
      const effectiveLimit = Math.min(hourlyLimit, config.maxEmailsPerHour);

      if (currentCount >= effectiveLimit) {
        console.warn(`[RATE_LIMIT] Limit reached for ${sender} (${currentCount}/${effectiveLimit}). Delaying job...`);

        // Calculate delay to next UTC hour window
        const now = new Date();
        const nextHour = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1, 0, 0, 0));
        const delayMs = nextHour.getTime() - now.getTime();

        // Update database recipient status to RESCHEDULED
        await prisma.emailRecipient.update({
          where: { id: recipientId },
          data: {
            status: 'RESCHEDULED',
            scheduledAt: nextHour,
          },
        });

        // Trigger Slack notification once per rate-limited hour window
        const alertKey = `slack-alert:${sender}:${rateKey}`;
        const alertSent = await redisConnection.get(alertKey);
        if (!alertSent) {
          await redisConnection.set(alertKey, 'true', 'EX', 3600);
          console.log(`[SLACK] Sending rate limit alert for ${sender}`);
          await sendSlackRateLimitNotification(userId, sender, effectiveLimit, getCurrentHourWindow());
        }

        // Reschedule BullMQ delayed job
        await emailQueue.add('send-email', { ...job.data, scheduledAt: nextHour.toISOString() }, {
          delay: delayMs,
          jobId: `${idempotencyKey}-rescheduled-${nextHour.getTime()}`,
        });

        console.log(`[SCHEDULER] Job for ${email} delayed by ${Math.round(delayMs / 1000)}s until next hour (${nextHour.toISOString()})`);
        return;
      }

      // 3. Increment Redis rate limiter counter atomically
      const pipeline = redisConnection.pipeline();
      pipeline.incr(rateKey);
      pipeline.expire(rateKey, 3600);
      await pipeline.exec();

      // 4. Send Email via Unified Email Service (Gmail API / Ethereal)
      try {
        console.log(`[WORKER] Sending email to ${email}...`);
        const sendResult = await dispatchEmail({
          userId,
          from: sender,
          to: email,
          subject,
          html: body,
        });

        if (!sendResult.messageId) {
          throw new Error('Gmail API did not return a message ID. Email cannot be verified as sent.');
        }

        const sentAt = new Date();

        // 5. Update Database status to SENT and save gmailMessageId
        const updatedRecipient = await prisma.emailRecipient.update({
          where: { id: recipientId },
          data: {
            status: 'SENT',
            sentAt,
            gmailMessageId: sendResult.messageId,
          },
        });

        console.log(`[WORKER] Email sent successfully to ${email}. MessageId: ${sendResult.messageId}`);
        console.log(`[DB] Email marked SENT`);
        console.log(`[GMAIL] Gmail API response\nmessageId: ${sendResult.messageId}`);

        // Check if all recipients for schedule are complete
        const remainingUnsent = await prisma.emailRecipient.count({
          where: {
            scheduleId,
            status: { notIn: ['SENT', 'FAILED'] },
          },
        });

        if (remainingUnsent === 0) {
          await prisma.emailSchedule.update({
            where: { id: scheduleId },
            data: { status: 'COMPLETED' },
          });
          console.log(`[DB] Schedule ${scheduleId} marked COMPLETED`);
        }

        // 6. Index into Elasticsearch
        await indexEmail({
          id: updatedRecipient.id,
          scheduleId,
          userId,
          sender,
          recipient: email,
          subject,
          body,
          status: 'SENT',
          scheduledAt: recipient.scheduledAt,
          sentAt,
          createdAt: recipient.createdAt,
        });
      } catch (err: any) {
        console.error(`[GMAIL] ERROR\nstatus: FAILED\nmessage: ${err.message}`);
        console.error(`[DB] Email marked FAILED`);

        await prisma.emailRecipient.update({
          where: { id: recipientId },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorMessage: err.message,
          },
        });

        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: config.workerConcurrency,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[WORKER] Job completed successfully: jobId=${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[WORKER] Job execution failed: jobId=${job?.id}, error=${err.message}`);
  });

  console.log(`[WORKER] BullMQ Worker started with concurrency: ${config.workerConcurrency}`);
  return worker;
}
