# ReachInbox Email Scheduler Platform

A production-minded, full-stack Email Scheduling & Lead Outreach Platform built with **React**, **TypeScript**, **Node.js/Express**, **PostgreSQL**, **BullMQ**, **Redis**, **Elasticsearch**, **Nodemailer**, and **Slack OAuth**.

Designed for enterprise email campaigns with real-time delayed job scheduling, server restart persistence, Redis-backed hourly rate limiting, idempotency protection, and search capability.

---

## 🌟 Architecture Overview

```
                        ┌─────────────────────────┐
                        │   React / Vite Client   │
                        └────────────┬────────────┘
                                     │ REST APIs
                                     ▼
                        ┌─────────────────────────┐
                        │   Express.js Backend    │
                        └─────┬──────┬──────┬─────┘
                              │      │      │
          ┌───────────────────┘      │      └──────────────────┐
          ▼                          ▼                         ▼
┌──────────────────┐       ┌──────────────────┐      ┌──────────────────┐
│ PostgreSQL (ORM) │       │   BullMQ Queue   │      │  Elasticsearch   │
│  State Storage   │       │   Delay Engine   │      │   Search Index   │
└──────────────────┘       └─────────┬────────┘      └──────────────────┘
                                     │ Redis
                                     ▼
                           ┌──────────────────┐
                           │  BullMQ Worker   │
                           └─────────┬────────┘
                                     │ Send Email / Check Rate
                       ┌─────────────┴─────────────┐
                       ▼                           ▼
            ┌────────────────────┐       ┌────────────────────┐
            │ Nodemailer SMTP    │       │ Slack WebClient    │
            │ (Ethereal Email)   │       │ (Rate Limit Alert) │
            └────────────────────┘       └────────────────────┘
```

---

## ✨ Features

- **Google OAuth 2.0 Auth**: Authenticate securely using Google OAuth identity or 1-Click Demo authentication.
- **Visual Dashboard**: Clean SaaS UI matching provided screenshots with active counters, scheduled pills, sent pills, and email previews.
- **CSV/TXT Lead List Parsing**: Auto-detects valid email addresses, removes duplicates, displays recipient count chips, and ignores invalid strings.
- **Flexible Scheduling Controls**: Custom start time, configurable minimum delay between sends (`MIN_EMAIL_DELAY_MS`), and hourly limit per sender (`MAX_EMAILS_PER_HOUR`).
- **BullMQ Delayed Queue (No Cron)**: Reliable distributed scheduling backed by Redis delayed jobs.
- **Server Restart Persistence**: Scheduled jobs and queue states persist across backend restarts without duplicate job creation.
- **Idempotency Engine**: Prevents duplicate email sending using unique idempotency keys (`campaignId_email_index`).
- **Atomic Redis Rate Limiting**: Enforces hourly sender caps across concurrent workers. Automatically reschedules overflow jobs to the start of the next hour window.
- **Real Slack Integration**: Slack OAuth token exchange and live channel notifications triggered when hourly rate limits are hit.
- **Elasticsearch Search**: Full-text instant search across email recipients, subjects, and body content with database fallback.
- **Live Queue Dashboard**: Embedded Bull Board UI at `/admin/queues` for real-time monitoring of delayed, active, completed, and failed jobs.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18+)
- **npm** (v9+)
- **Docker & Docker Compose** (for PostgreSQL, Redis, and Elasticsearch)

### 2. Start Infrastructure via Docker
```bash
docker compose up -d
```
This launches:
- **PostgreSQL** on `localhost:5432`
- **Redis** on `localhost:6379`
- **Elasticsearch** on `localhost:9200`

### 3. Backend Setup
```bash
cd backend
npm install
npm run prisma:push
npm run dev
```
Backend runs at `http://localhost:5000`.
BullMQ Live Admin Board runs at `http://localhost:5000/admin/queues`.

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend application opens at `http://localhost:5173`.

---

## ⚙️ Environment Variables (`.env`)

See `.env.example` for full options:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/email_scheduler?schema=public"
REDIS_URL="redis://localhost:6379"
ELASTICSEARCH_URL="http://localhost:9200"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"

SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"
SLACK_REDIRECT_URI="http://localhost:5000/api/slack/callback"

WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=100

JWT_SECRET="reachinbox_super_secret_jwt_key_2026"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

---

## 💡 Technical Architecture Deep Dive

### 1. Scheduling Mechanics
Emails are **never** scheduled using in-memory timers (`setTimeout`) or OS cron jobs.
Instead, when a campaign is submitted:
1. `EmailSchedule` and `EmailRecipient` rows are created in PostgreSQL in a single database transaction.
2. For each recipient \(i\), scheduled time is calculated:
   $$\text{scheduledAt} = \max(\text{now}, \text{startTime}) + (i \times \text{delaySeconds} \times 1000)$$
3. A delayed job is pushed to BullMQ with `delay = scheduledAt - now`.

### 2. Server Restart Persistence
BullMQ persists delayed job definitions in Redis. If the backend process crashes or restarts:
1. Redis retains all delayed job timers.
2. On backend start, BullMQ reconnects and resumes reading pending jobs.
3. The worker verifies recipient status in PostgreSQL before execution.

### 3. Idempotency & Duplicate Prevention
To prevent duplicate emails:
1. Each `EmailRecipient` has a unique `idempotencyKey` (`scheduleId_email_index`).
2. Before calling Nodemailer, the worker queries PostgreSQL for the recipient status.
3. If `status === 'SENT'`, the worker skips sending and logs idempotency verification success.

### 4. Redis Rate Limiting & Rescheduling
1. Every hour window gets an atomic Redis key: `email-rate:{sender}:{YYYY-MM-DD-HH}`.
2. When a job fires, the worker inspects the counter.
3. If count \(\ge\) `hourlyLimit`:
   - Calculates milliseconds until start of next hour window.
   - Updates recipient status to `RESCHEDULED`.
   - Re-adds a delayed job to BullMQ for the next hour window.
   - Triggers a Slack notification if Slack is connected.

### 5. Handling 1000+ Emails
If 1000 emails are scheduled simultaneously:
- 1000 delayed jobs are added to BullMQ.
- Worker concurrency (`WORKER_CONCURRENCY=5`) processes jobs in parallel.
- The Redis rate limiter caps output at `MAX_EMAILS_PER_HOUR` (e.g. 100/hr).
- The remaining 900 jobs are automatically deferred to subsequent hour windows without server memory overhead or process blocks.

---

## 🎬 5-Minute Demo Flow

1. **Login**: Click **Login with Google** or **1-Click Demo Login as Oliver Brown**.
2. **Dashboard**: Observe sidebar counters, search header, and scheduled email rows.
3. **Compose Email**: Click **Compose**, enter subject, body, delay (e.g. 2s), and hourly limit (e.g. 3).
4. **Upload CSV**: Upload a `.csv` lead list and see recipient count chips auto-generate.
5. **Send Later**: Click clock icon / **Send Later**, pick a time window, and submit.
6. **BullMQ Live Board**: Open `/admin/queues` to observe delayed job timers counting down in real time.
7. **Slack Notification**: Connect Slack (or click 1-Click Mock Connect). Lower hourly limit to 1 and see Slack alert fire!
8. **Server Restart**: Kill the backend process (`Ctrl+C`), wait 10 seconds, restart backend. Note scheduled jobs resume right on time!
9. **Elasticsearch Search**: Search by lead email or keyword in top bar to see instant query results.

---

## 🧪 Running Tests

```bash
cd backend
npm test
```

Includes tests for:
- Recipient email parsing & validation
- CSV lead list deduplication
- Idempotency key generation
- Rate limit next-hour delay calculations
