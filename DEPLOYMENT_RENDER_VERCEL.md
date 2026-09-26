# Full Deployment Guide: Backend on Render + Frontend on Vercel

This guide walks you through deploying the **Backend to Render** and the **Frontend to Vercel**.

---

## 1. Deploying the Backend on Render

The backend needs **PostgreSQL** and **Redis** along with the Express API and BullMQ worker.

### Step 1.1: Create Managed PostgreSQL on Render
1. Open [dashboard.render.com](https://dashboard.render.com/).
2. Click **New +** → **PostgreSQL**.
3. Set:
   - **Name**: `openbox-db`
   - **Database**: `email_scheduler`
   - **User**: `reachinbox_user`
4. Click **Create Database**.
5. Copy the **Internal Database URL** (e.g. `postgresql://reachinbox_user:...@dpg-...-a/email_scheduler`).

### Step 1.2: Create Redis on Render (or Upstash)
1. In Render Dashboard, click **New +** → **Redis** (or create a free serverless Redis on [upstash.com](https://upstash.com)).
2. Set:
   - **Name**: `openbox-redis`
3. Click **Create Redis**.
4. Copy the **Internal Redis URL** (or Upstash `rediss://...` connection URL).

### Step 1.3: Create Backend Web Service
1. Click **New +** → **Web Service**.
2. Connect your GitHub repository: `https://github.com/Kishorekola19/outbox-lab-assignment`.
3. Configure the service settings:
   - **Name**: `openbox-backend`
   - **Language**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npx prisma db push && npm run build`
   - **Start Command**: `npm run start`
   - **Health Check Path**: `/api/health`
4. Add the following **Environment Variables**:
   | Key | Value / Example | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production environment |
   | `PORT` | `10000` | Port for Render |
   | `DATABASE_URL` | *Paste PostgreSQL Internal Database URL* | Prisma PostgreSQL connection |
   | `REDIS_URL` | *Paste Redis Internal URL or Upstash URL* | BullMQ queue & rate limiter |
   | `JWT_SECRET` | *Any random 32-character string* | Token signing key |
   | `GOOGLE_CLIENT_ID` | *Your Google OAuth Client ID* | From Google Cloud Console |
   | `GOOGLE_CLIENT_SECRET` | *Your Google OAuth Client Secret* | From Google Cloud Console |
   | `GOOGLE_CALLBACK_URL` | `https://openbox-backend.onrender.com/api/auth/google/callback` | OAuth redirect |
   | `GMAIL_REDIRECT_URI` | `https://openbox-backend.onrender.com/api/auth/gmail/callback` | Gmail API redirect |
   | `FRONTEND_URL` | `https://<your-vercel-app>.vercel.app` | Vercel frontend URL |
   | `WORKER_CONCURRENCY` | `5` | Worker concurrency |
   | `MIN_EMAIL_DELAY_MS` | `2000` | Delay between emails |
   | `MAX_EMAILS_PER_HOUR` | `100` | Rate limit |
5. Click **Create Web Service**. Render will build and deploy the backend.
6. Note your live backend URL (e.g. `https://openbox-backend.onrender.com`).

---

## 2. Deploying the Frontend on Vercel

The frontend is a Vite + React Single Page Application (SPA).

### Step 2.1: Import Project in Vercel
1. Go to [vercel.com](https://vercel.com/) and log in.
2. Click **Add New…** → **Project**.
3. Select your repository: **`Kishorekola19/outbox-lab-assignment`**.

### Step 2.2: Configure Project Settings
1. **Framework Preset**: `Vite`
2. **Root Directory**: Click **Edit** and choose `frontend`.
3. **Build Command**: `npm run build` (or default `vite build`)
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

### Step 2.3: Add Environment Variables
Under **Environment Variables**, add:
- **Key**: `VITE_API_BASE_URL`
- **Value**: `https://openbox-backend.onrender.com/api` *(replace with your actual Render backend URL)*

### Step 2.4: Deploy
Click **Deploy**.
Vercel will build the frontend and provide your live URL (e.g., `https://outbox-lab-assignment.vercel.app`).

---

## 3. Update Google Cloud Console & Render Config

Now that both URLs are live:

1. **In Google Cloud Console**:
   - Go to **APIs & Services** → **Credentials**.
   - Under **Authorized JavaScript origins**:
     - Add `https://<your-vercel-app>.vercel.app`
     - Add `https://<your-backend-app>.onrender.com`
   - Under **Authorized redirect URIs**:
     - Add `https://<your-backend-app>.onrender.com/api/auth/google/callback`
     - Add `https://<your-backend-app>.onrender.com/api/auth/gmail/callback`
   - Save changes.

2. **In Render Dashboard**:
   - Update `FRONTEND_URL` to your live Vercel URL (e.g. `https://<your-vercel-app>.vercel.app`).
