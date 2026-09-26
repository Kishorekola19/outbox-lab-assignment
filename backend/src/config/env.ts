import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.example') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  gmailRedirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:5000/api/auth/gmail/callback',

  emailProvider: process.env.EMAIL_PROVIDER || 'ethereal', // 'gmail' | 'ethereal'

  etherealHost: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
  etherealPort: parseInt(process.env.ETHEREAL_PORT || '587', 10),
  etherealUser: process.env.ETHEREAL_USER || '',
  etherealPassword: process.env.ETHEREAL_PASSWORD || '',

  elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',

  slackClientId: process.env.SLACK_CLIENT_ID || '',
  slackClientSecret: process.env.SLACK_CLIENT_SECRET || '',
  slackRedirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback',

  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  minEmailDelayMs: parseInt(process.env.MIN_EMAIL_DELAY_MS || '2000', 10),
  maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '100', 10),

  jwtSecret: process.env.JWT_SECRET || 'reachinbox_secret_jwt_2026',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
