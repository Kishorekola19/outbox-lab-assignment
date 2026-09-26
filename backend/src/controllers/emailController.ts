import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { emailQueue, EmailJobData } from '../queues/emailQueue';
import { indexEmail, searchEmailsInES } from '../elasticsearch/client';
import { config } from '../config/env';
import { dispatchEmail } from '../services/unifiedEmailService';

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export async function sendNowEmailHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const {
      subject,
      body,
      sender: reqSender,
      recipients: rawRecipients,
    } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and Body are required' });
    }

    let emailList: string[] = [];
    if (Array.isArray(rawRecipients)) {
      emailList = rawRecipients;
    } else if (typeof rawRecipients === 'string') {
      emailList = rawRecipients.split(/[\n,;\s]+/).filter(Boolean);
    }

    const validEmails = Array.from(
      new Set(emailList.map((e) => e.trim().toLowerCase()).filter(isValidEmail))
    );

    if (validEmails.length === 0) {
      return res.status(400).json({ error: 'No valid recipient email addresses found' });
    }

    // Check if user has connected Gmail
    const gmailConn = await prisma.gmailConnection.findUnique({ where: { userId } });
    if (!gmailConn || !gmailConn.connected || !gmailConn.refreshToken) {
      return res.status(400).json({
        error: `Real email delivery requires an authenticated Gmail account. Please connect your Gmail account in Settings/Integrations (or configure Google OAuth) before sending.`,
      });
    }

    const effectiveSender = gmailConn.email;
    console.log(`[API] Send Now request received for subject "${subject}" from authenticated Gmail sender ${effectiveSender}`);

    const now = new Date();

    // Create schedule & recipient rows with status PROCESSING
    const schedule = await prisma.$transaction(async (tx) => {
      const newSchedule = await tx.emailSchedule.create({
        data: {
          userId,
          subject,
          body,
          sender: effectiveSender,
          startTime: now,
          delayBetweenEmails: 0,
          hourlyLimit: 1000,
          status: 'PROCESSING',
        },
      });

      const recipientData = validEmails.map((email, index) => ({
        scheduleId: newSchedule.id,
        email,
        scheduledAt: now,
        idempotencyKey: `${newSchedule.id}_${email}_sendnow_${Date.now()}_${index}`,
        status: 'PROCESSING' as const,
      }));

      await tx.emailRecipient.createMany({
        data: recipientData,
      });

      return tx.emailSchedule.findUnique({
        where: { id: newSchedule.id },
        include: { recipients: true },
      });
    });

    if (!schedule) {
      throw new Error('Failed to create Send Now transaction');
    }

    console.log(`[API] Send Now record saved: scheduleId=${schedule.id}, recipientsCount=${validEmails.length}`);

    let sentCount = 0;
    let failedCount = 0;
    const results = [];

    // Dispatch emails immediately without BullMQ delay
    for (const recipient of schedule.recipients) {
      try {
        console.log(`[API] Direct dispatching email to ${recipient.email}...`);
        const sendResult = await dispatchEmail({
          userId,
          from: effectiveSender,
          to: recipient.email,
          subject,
          html: body,
        });

        if (!sendResult.messageId) {
          throw new Error('Gmail API did not return a message ID. Email cannot be verified as sent.');
        }

        const sentAt = new Date();
        const updatedRecipient = await prisma.emailRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'SENT',
            sentAt,
            gmailMessageId: sendResult.messageId,
          },
        });

        sentCount++;
        results.push({ email: recipient.email, status: 'SENT', messageId: sendResult.messageId });
        console.log(`[DB] Email marked SENT`);
        console.log(`[GMAIL] Gmail API response\nmessageId: ${sendResult.messageId}`);

        // Index in Elasticsearch
        await indexEmail({
          id: updatedRecipient.id,
          scheduleId: schedule.id,
          userId,
          sender: effectiveSender,
          recipient: recipient.email,
          subject,
          body,
          status: 'SENT',
          scheduledAt: recipient.scheduledAt,
          sentAt,
          createdAt: recipient.createdAt,
        });
      } catch (err: any) {
        failedCount++;
        console.error(`[GMAIL] ERROR\nstatus: FAILED\nmessage: ${err.message}`);
        console.error(`[DB] Email marked FAILED`);

        await prisma.emailRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorMessage: err.message,
          },
        });

        results.push({ email: recipient.email, status: 'FAILED', error: err.message });
      }
    }

    // Mark schedule status COMPLETED or FAILED
    await prisma.emailSchedule.update({
      where: { id: schedule.id },
      data: { status: failedCount === validEmails.length ? 'FAILED' : 'COMPLETED' },
    });

    if (failedCount > 0 && sentCount === 0) {
      return res.status(400).json({
        error: results[0]?.error || 'Failed to send email via Gmail API',
        sentCount,
        failedCount,
        results,
      });
    }

    return res.status(200).json({
      message: `Successfully sent ${sentCount} email(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      sentCount,
      failedCount,
      results,
    });
  } catch (error: any) {
    console.error('Error in Send Now API:', error);
    return res.status(500).json({ error: error.message || 'Send Now failed' });
  }
}

export async function scheduleEmailHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const {
      subject,
      body,
      sender: reqSender,
      recipients: rawRecipients,
      scheduledAt,
      startTime,
      delayBetweenEmails = 2,
      hourlyLimit = 100,
    } = req.body;

    const targetTimeString = scheduledAt || startTime;

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and Body are required' });
    }

    let emailList: string[] = [];
    if (Array.isArray(rawRecipients)) {
      emailList = rawRecipients;
    } else if (typeof rawRecipients === 'string') {
      emailList = rawRecipients.split(/[\n,;\s]+/).filter(Boolean);
    }

    const validEmails = Array.from(
      new Set(emailList.map((e) => e.trim().toLowerCase()).filter(isValidEmail))
    );

    if (validEmails.length === 0) {
      return res.status(400).json({ error: 'No valid recipient email addresses found' });
    }

    const gmailConn = await prisma.gmailConnection.findUnique({ where: { userId } });
    if (!gmailConn || !gmailConn.connected || !gmailConn.refreshToken) {
      return res.status(400).json({
        error: `Real email delivery requires an authenticated Gmail account. Please connect your Gmail account in Settings/Integrations (or configure Google OAuth) before scheduling emails.`,
      });
    }

    const effectiveSender = gmailConn.email;
    console.log(`[API] Schedule request received for subject "${subject}" targetTime=${targetTimeString} from authenticated Gmail sender ${effectiveSender}`);

    // Convert target time to UTC Date object
    const startDateTime = targetTimeString ? new Date(targetTimeString) : new Date();
    const effectiveDelay = Math.max(Number(delayBetweenEmails) || 2, Math.ceil(config.minEmailDelayMs / 1000));
    const nowMs = Date.now();

    // Create schedule & recipient rows in PostgreSQL
    const schedule = await prisma.$transaction(async (tx) => {
      const newSchedule = await tx.emailSchedule.create({
        data: {
          userId,
          subject,
          body,
          sender: effectiveSender,
          startTime: startDateTime,
          delayBetweenEmails: effectiveDelay,
          hourlyLimit: Number(hourlyLimit),
          status: 'SCHEDULED',
        },
      });

      const recipientData = validEmails.map((email, index) => {
        const scheduledTimeMs = Math.max(nowMs, startDateTime.getTime()) + index * effectiveDelay * 1000;
        const recipientScheduledAt = new Date(scheduledTimeMs);
        const idempotencyKey = `${newSchedule.id}_${email}_${index}`;

        return {
          scheduleId: newSchedule.id,
          email,
          scheduledAt: recipientScheduledAt,
          idempotencyKey,
          status: 'PENDING' as const,
        };
      });

      await tx.emailRecipient.createMany({
        data: recipientData,
      });

      return tx.emailSchedule.findUnique({
        where: { id: newSchedule.id },
        include: { recipients: true },
      });
    });

    if (!schedule) {
      throw new Error('Failed to create schedule transaction');
    }

    console.log(`[API] Email saved: scheduleId=${schedule.id}`);

    // Enqueue BullMQ delayed jobs
    for (const recipient of schedule.recipients) {
      const scheduledTimeMs = new Date(recipient.scheduledAt).getTime();
      const delayMs = Math.max(0, scheduledTimeMs - Date.now());

      const jobData: EmailJobData = {
        recipientId: recipient.id,
        scheduleId: schedule.id,
        userId,
        sender: effectiveSender,
        email: recipient.email,
        subject,
        body,
        hourlyLimit: Number(hourlyLimit),
        idempotencyKey: recipient.idempotencyKey,
        scheduledAt: recipient.scheduledAt.toISOString(),
      };

      try {
        await emailQueue.add('send-email', jobData, {
          delay: delayMs,
          jobId: recipient.idempotencyKey,
        });
      } catch (e: any) {
        console.warn(`[SCHEDULER] BullMQ queue notice: ${e.message}`);
      }

      console.log(`[SCHEDULER] Email scheduled: recipient=${recipient.email}, scheduledAt=${recipient.scheduledAt.toISOString()}, delayMs=${delayMs}, jobId=${recipient.idempotencyKey}`);

      // Index initial state in Elasticsearch
      await indexEmail({
        id: recipient.id,
        scheduleId: schedule.id,
        userId,
        sender: effectiveSender,
        recipient: recipient.email,
        subject,
        body,
        status: 'PENDING',
        scheduledAt: recipient.scheduledAt,
        createdAt: recipient.createdAt,
      });
    }

    return res.status(201).json({
      message: `Successfully scheduled ${validEmails.length} recipient(s)`,
      schedule,
      recipientCount: validEmails.length,
    });
  } catch (error: any) {
    console.error('Error in schedule API:', error);
    return res.status(500).json({ error: error.message || 'Schedule failed' });
  }
}

export async function getScheduledEmailsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const now = new Date();

    // Check for past-due scheduled emails that haven't sent yet
    const pastDueRecipients = await prisma.emailRecipient.findMany({
      where: {
        schedule: { userId },
        status: { in: ['PENDING', 'QUEUED', 'SCHEDULED', 'RESCHEDULED'] },
        scheduledAt: { lte: now },
      },
      include: { schedule: true },
    });

    if (pastDueRecipients.length > 0) {
      console.log(`[WORKER_RECOVERY] Found ${pastDueRecipients.length} past-due scheduled email(s). Auto-dispatching...`);
      for (const recipient of pastDueRecipients) {
        try {
          console.log(`[WORKER] Auto-dispatching past-due scheduled email to ${recipient.email}...`);
          const sendResult = await dispatchEmail({
            userId,
            from: recipient.schedule.sender,
            to: recipient.email,
            subject: recipient.schedule.subject,
            html: recipient.schedule.body,
          });

          if (!sendResult.messageId) {
            throw new Error('Gmail API did not return a message ID. Email cannot be verified as sent.');
          }

          await prisma.emailRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              gmailMessageId: sendResult.messageId,
            },
          });

          await prisma.emailSchedule.update({
            where: { id: recipient.scheduleId },
            data: { status: 'COMPLETED' },
          });

          console.log(`[DB] Email marked SENT`);
          console.log(`[GMAIL] Gmail API response\nmessageId: ${sendResult.messageId}`);
        } catch (e: any) {
          console.error(`[GMAIL] ERROR\nstatus: FAILED\nmessage: ${e.message}`);
          console.error(`[DB] Email marked FAILED`);
          await prisma.emailRecipient.update({
            where: { id: recipient.id },
            data: { status: 'FAILED', failedAt: new Date(), errorMessage: e.message },
          });
        }
      }
    }

    // Fetch remaining FUTURE scheduled emails
    const recipients = await prisma.emailRecipient.findMany({
      where: {
        schedule: { userId },
        status: { in: ['PENDING', 'QUEUED', 'RESCHEDULED', 'SCHEDULED', 'PROCESSING'] },
      },
      include: {
        schedule: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return res.json({
      count: recipients.length,
      emails: recipients.map((r) => ({
        id: r.id,
        recipient: r.email,
        subject: r.schedule.subject,
        body: r.schedule.body,
        status: r.status,
        scheduledAt: r.scheduledAt,
        sender: r.schedule.sender,
        scheduleId: r.scheduleId,
        gmailMessageId: r.gmailMessageId,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getSentEmailsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const recipients = await prisma.emailRecipient.findMany({
      where: {
        schedule: { userId },
        status: { in: ['SENT', 'FAILED'] },
      },
      include: {
        schedule: true,
      },
      orderBy: { sentAt: 'desc' },
    });

    return res.json({
      count: recipients.length,
      emails: recipients.map((r) => ({
        id: r.id,
        recipient: r.email,
        subject: r.schedule.subject,
        body: r.schedule.body,
        status: r.status,
        sentAt: r.sentAt || r.updatedAt,
        scheduledAt: r.scheduledAt,
        sender: r.schedule.sender,
        scheduleId: r.scheduleId,
        errorMessage: r.errorMessage,
        gmailMessageId: r.gmailMessageId,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getEmailByIdHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const recipient = await prisma.emailRecipient.findUnique({
      where: { id },
      include: { schedule: true },
    });

    if (!recipient || recipient.schedule.userId !== userId) {
      return res.status(404).json({ error: 'Email details not found' });
    }

    return res.json({
      email: {
        id: recipient.id,
        recipient: recipient.email,
        subject: recipient.schedule.subject,
        body: recipient.schedule.body,
        status: recipient.status,
        sender: recipient.schedule.sender,
        scheduledAt: recipient.scheduledAt,
        sentAt: recipient.sentAt,
        failedAt: recipient.failedAt,
        errorMessage: recipient.errorMessage,
        gmailMessageId: recipient.gmailMessageId,
        delayBetweenEmails: recipient.schedule.delayBetweenEmails,
        hourlyLimit: recipient.schedule.hourlyLimit,
        createdAt: recipient.createdAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function searchEmailsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { q, status } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query string q is required' });
    }

    const results = await searchEmailsInES(userId, q, typeof status === 'string' ? status : undefined);
    return res.json({ query: q, results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
