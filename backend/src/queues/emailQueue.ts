import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export interface EmailJobData {
  recipientId: string;
  scheduleId: string;
  userId: string;
  sender: string;
  email: string;
  subject: string;
  body: string;
  hourlyLimit: number;
  idempotencyKey: string;
  scheduledAt?: string;
}

export const emailQueue = new Queue<EmailJobData>('email-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

console.log('✅ BullMQ email-queue initialized');
