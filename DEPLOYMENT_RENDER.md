# Deploying ReachInbox Email Scheduler to Render

This project contains everything needed to deploy to **Render** with high availability:
- **Backend**: Express API + BullMQ Email Worker (Web Service)
- **Frontend**: Vite React SPA (Static Site)
- **Database**: Managed PostgreSQL (`openbox-db`)
- **Queue Cache**: Redis (Render Redis or Upstash Redis)

---

## Architecture on Render

```
                                  +------------------------------+
                                  |   Render Frontend            |
                                  |   (Static Site)              |
                                  +--------------+---------------+
                                                 |
                     /api/* proxied rewrite or Direct API URL
                                                 |
                                                 v
                                  +------------------------------+
                                  |   Render Backend             |
                                  |   (Web Service - Node.js)    |
                                  |   Express + BullMQ Worker    |
                                  +--------------+---------------+
                                                 |
                         +-----------------------+-----------------------+
                         |                                               |
                         v                                               v
          +------------------------------+                +------------------------------+
          |  Render Managed PostgreSQL   |                |  Render Redis / Upstash      |
          |  Database                    |                |  (Job queue & rate limits)   |
          +------------------------------+                +------------------------------+
```

---

## Option 1: One-Click Deploy with Blueprint (`render.yaml`)

We have created [`render.yaml`](./render.yaml) at the repository root.

1. **Push your code to GitHub / GitLab:**
   ```bash
   git add .
   git commit -m "Configure Render deployment and PostgreSQL migration"
   git push origin main
   ```
2. **Go to Render Dashboard:**
   - Visit [dashboard.render.com](https://dashboard.render.com/)
   - Click **New +** -> **Blueprint**
   - Connect your GitHub repository.
   - Render will detect [`render.yaml`](./render.yaml) and automatically provision:
     - **`openbox-backend`** (Web Service)
     - **`openbox-frontend`** (Static Site)
     - **`openbox-db`** (PostgreSQL Database)
3. **Fill in the Required Secret Environment Variables** when prompted:
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret
   - `GOOGLE_CALLBACK_URL`: `https://<your-backend-app>.onrender.com/api/auth/google/callback`
   - `GMAIL_REDIRECT_URI`: `https://<your-backend-app>.onrender.com/api/auth/gmail/callback`
   - `FRONTEND_URL`: `https://<your-frontend-app>.onrender.com`
4. Click **Apply**.

---

## Option 2: Step-by-Step Manual Deployment

If you prefer configuring services individually in the Render UI:

### Step 1: Create PostgreSQL Database
1. In Render Dashboard, click **New +** -> **PostgreSQL**.
2. **Name**: `openbox-db`
3. **Database**: `email_scheduler`
4. **User**: `reachinbox_user`
5. Click **Create Database**.
6. Copy the **Internal Database URL** (e.g., `postgresql://...`).

### Step 2: Create Redis Instance
1. In Render Dashboard, click **New +** -> **Redis** (or create a free Redis on [Upstash.com](https://upstash.com/)).
2. **Name**: `openbox-redis`
3. Click **Create Redis**.
4. Copy the **Internal Redis URL** (or Upstash `rediss://...` connection string).

### Step 3: Deploy Backend Web Service
1. Click **New +** -> **Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Name**: `openbox-backend`
   - **Language**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npx prisma db push && npm run build`
   - **Start Command**: `npm run start`
   - **Health Check Path**: `/api/health`
4. Add **Environment Variables**:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Port used by Render |
   | `DATABASE_URL` | *Paste PostgreSQL Internal URL* | Database connection |
   | `REDIS_URL` | *Paste Redis Internal URL* | Redis queue & rate-limiting |
   | `JWT_SECRET` | *Random 32-character string* | Token signing secret |
   | `GOOGLE_CLIENT_ID` | `your-client-id.apps.googleusercontent.com` | Google OAuth ID |
   | `GOOGLE_CLIENT_SECRET` | `your-google-client-secret` | Google OAuth Secret |
   | `GOOGLE_CALLBACK_URL` | `https://openbox-backend.onrender.com/api/auth/google/callback` | Callback URL |
   | `GMAIL_REDIRECT_URI` | `https://openbox-backend.onrender.com/api/auth/gmail/callback` | Gmail callback |
   | `FRONTEND_URL` | `https://openbox-frontend.onrender.com` | Frontend app URL |
   | `WORKER_CONCURRENCY` | `5` | Concurrency for BullMQ worker |
   | `MIN_EMAIL_DELAY_MS` | `2000` | Delay between consecutive emails |
   | `MAX_EMAILS_PER_HOUR` | `100` | Rate limiter |
5. Click **Deploy Web Service**.

### Step 4: Deploy Frontend Static Site
1. Click **New +** -> **Static Site**.
2. Connect your repository.
3. Configure settings:
   - **Name**: `openbox-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add **Environment Variable**:
   - `VITE_API_BASE_URL`: `https://<your-backend-service>.onrender.com/api` (or `/api` if using rewrite rules)
5. Under **Redirects/Rewrites**:
   - Add rewrite rule 1 (API Proxy):
     - **Source**: `/api/*`
     - **Destination**: `https://<your-backend-service>.onrender.com/api/*`
     - **Action**: Rewrite
   - Add rewrite rule 2 (SPA Routing):
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: Rewrite
6. Click **Deploy Static Site**.

---

## Step 5: Update Google Cloud Console Authorized Redirect URIs

To make sure **real Gmail delivery & Google authentication** work in production:

1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Select your OAuth 2.0 Client ID.
3. Under **Authorized JavaScript origins**, add:
   - `https://<your-frontend-service>.onrender.com`
   - `https://<your-backend-service>.onrender.com`
4. Under **Authorized redirect URIs**, add:
   - `https://<your-backend-service>.onrender.com/api/auth/google/callback`
   - `https://<your-backend-service>.onrender.com/api/auth/gmail/callback`
5. Save changes.

---

## Production Verification Checklist
- [x] Backend responds to `/api/health` with `status: ok`
- [x] Bull-Board dashboard accessible at `/admin/queues`
- [x] Prisma tables created in PostgreSQL automatically during build
- [x] Redis connected for BullMQ rate-limiting and job scheduling
- [x] Google Login & Gmail OAuth tokens stored securely in PostgreSQL
- [x] Real email delivery dispatches through Gmail API in production
