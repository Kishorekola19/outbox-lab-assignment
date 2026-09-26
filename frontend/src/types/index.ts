export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  slackConnection?: {
    connected: boolean;
    slackUserId?: string;
  };
}

export type RecipientStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED' | 'RESCHEDULED';

export interface EmailItem {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: RecipientStatus;
  scheduledAt: string;
  sentAt?: string | null;
  sender: string;
  scheduleId: string;
  errorMessage?: string | null;
  delayBetweenEmails?: number;
  hourlyLimit?: number;
}

export interface SchedulePayload {
  subject: string;
  body: string;
  sender?: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}

export interface SlackStatus {
  connected: boolean;
  slackUserId?: string | null;
  slackChannelId?: string | null;
  updatedAt?: string | null;
}
