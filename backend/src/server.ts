import express from 'express';
import cors from 'cors';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { config } from './config/env';
import { connectDatabase } from './config/db';
import { initEmailService } from './services/emailService';
import { initElasticsearch } from './elasticsearch/client';
import { emailQueue } from './queues/emailQueue';
import { startEmailWorker } from './workers/emailWorker';

import authRoutes from './routes/authRoutes';
import emailRoutes from './routes/emailRoutes';
import slackRoutes from './routes/slackRoutes';

const app = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (
        origin === config.frontendUrl ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Allow all for seamless deployment
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Bull Board Admin UI
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue as any) as any],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'reachinbox-backend',
    workerConcurrency: config.workerConcurrency,
    minDelayMs: config.minEmailDelayMs,
    hourlyLimit: config.maxEmailsPerHour,
  });
});

async function main() {
  console.log('🚀 Starting ReachInbox Email Scheduler Backend...');

  // Connect Database
  await connectDatabase();

  // Initialize Email Transporter (Ethereal)
  await initEmailService();

  // Initialize Elasticsearch Index
  await initElasticsearch();

  // Start BullMQ Email Worker
  startEmailWorker();

  // Start Express HTTP Server
  app.listen(config.port, () => {
    console.log(`✅ Backend server listening on http://localhost:${config.port}`);
    console.log(`📊 BullMQ Admin Dashboard live at http://localhost:${config.port}/admin/queues`);
  });
}

main().catch((err) => {
  console.error('❌ Fatal error during backend bootstrap:', err);
  process.exit(1);
});
