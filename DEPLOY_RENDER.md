# Postify — Render Production Deployment Guide

This guide provides end-to-end instructions for deploying Postify to **Render** with **MongoDB Atlas**, **Resend**, and a dedicated **Weekly Digest Cron Job**.

---

## 1. Architecture Overview

Postify is deployed as a **Unified Web Service** paired with a **Scheduled Cron Job**:

```
                              [ Render Load Balancer ]
                               (TLS Termination HTTPS)
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    Postify Render Web Service         │
                      │    (Node.js + Express Server)         │
                      ├───────────────────┬───────────────────┤
                      │   REST APIs       │  Vite React SPA   │
                      │   /api/*          │  /feed, /login... │
                      │   Socket.IO       │  client/dist/     │
                      └─────────┬─────────┴─────────┬─────────┘
                                │                   │
              ┌─────────────────┼───────────────────┼─────────────────┐
              ▼                 ▼                   ▼                 ▼
     [ MongoDB Atlas ]  [ Resend API ]   [ Persistent Disk ]  [ Cron Service ]
      Managed Cluster     Transactional    /var/data/uploads   Weekly Mondays
     (M0 Free / M10+)      Email Radar     Avatar / Banners     09:00 UTC
```

### Why a Unified Web Service?

1. **Same-Origin First-Party Cookies**: Placing the compiled React frontend and Express backend on the same origin eliminates cross-site third-party cookie blocking (e.g., Apple Safari ITP, Google Privacy Sandbox). Cookies operate with `SameSite=Lax` securely.
2. **Eliminated CORS Latency**: Browser fetches to `/api/*` avoid OPTIONS preflight delays.
3. **Streamlined Socket.IO**: Real-time WebSockets connect directly to `window.location.origin` without origin mismatch issues.
4. **Social Crawler Link Previews**: Express intercepts crawler user-agents on `/post/:id` and `/projects/:username/:slug` to render full OpenGraph/Twitter HTML cards while serving the SPA shell to real human visitors.
5. **Cost-Efficiency**: Avoids running multiple dynos and coordinating disparate cold starts.

---

## 2. Prerequisites & Accounts

- A [Render](https://render.com/) account.
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account.
- A [Resend](https://resend.com/) account with a verified sending domain.
- A GitHub repository containing the Postify codebase.

---

## 3. Step 1: MongoDB Atlas Setup

1. **Create an Atlas Cluster**:
   - Log into MongoDB Atlas and click **Build a Database**.
   - Select the **M0 Free** (or **M10 Dedicated** for production performance).
   - Select a provider and region geographically close to your Render deployment (e.g., AWS `us-west-2` Oregon if Render is deployed in Oregon).
2. **Create a Database User**:
   - Go to **Security > Database Access > Add New Database User**.
   - Authentication Method: **Password**.
   - Username: `postify_app` (or chosen username).
   - Password: Click **Autogenerate Secure Password** and copy it safely.
   - Built-in Role: **Read and write to any database** (or restrict to `postify` db).
3. **Configure Network Access**:
   - Go to **Security > Network Access > Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Note*: Render services use dynamic IP addresses. IP allowlisting must permit `0.0.0.0/0` (Atlas database password authentication protects your database).
4. **Obtain Connection String**:
   - Go to **Database > Clusters > Connect > Drivers**.
   - Driver: `Node.js`, Version `5.5 or later`.
   - Copy the SRV connection URI:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/postify?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your database user credentials.
   - Specify `/postify` as the database name before query parameters.

### Optional: Local Data Migration to Atlas

> [!CAUTION]
> Never overwrite or drop existing local databases. Test this procedure on staging before migrating production records.

If you wish to copy your local data to Atlas:
```bash
# 1. Export local database to a backup directory
mongodump --uri="mongodb://127.0.0.1:27017/miniproject" --out="./backup-miniproject"

# 2. Restore into your Atlas cluster
mongorestore --uri="mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/postify?retryWrites=true&w=majority" --nsInclude="miniproject.*" --nsFrom="miniproject.*" --nsTo="postify.*" ./backup-miniproject/miniproject
```

---

## 4. Step 2: Uploads and Persistent Media Storage

### The Ephemeral Storage Problem on Render

Render Web Services run in containerized environments with ephemeral filesystems. Any files written to local disk (e.g., `./public/images/uploads/`) are **erased** whenever:
- A new build or commit is deployed.
- The web service instance restarts or is scaled.

### Recommended Approaches

#### Option A: ImageKit Cloud Storage (Recommended & Native Integration)

Postify includes first-class native integration with **ImageKit** (`imagekit.io`) for cloud media storage, global CDN delivery, and automatic image optimization. This completely eliminates the need for expensive Render persistent disks and works seamlessly across both free and paid Render tiers:

- **Permanent Storage**: Avatars and profile banners are streamed directly to ImageKit's global CDN (`/postify/avatars` and `/postify/banners`).
- **Disk Clean**: Temporary upload files on Render's container disk are immediately unlinked after successful cloud transfer, preventing disk exhaustion.
- **Graceful Fallback**: If ImageKit environment variables are omitted or empty, Postify seamlessly falls back to local disk storage (`UPLOADS_DIR` or `./public/images/uploads/`).
- **Setup in 2 minutes**:
  1. Sign up for a free account at [imagekit.io](https://imagekit.io).
  2. Navigate to **Developer Options > API Keys**.
  3. Copy your **Public Key**, **Private Key**, and **URL-Endpoint** (e.g., `https://ik.imagekit.io/your_id`).
  4. Add these three keys to your Render environment variables or `.env`.

#### Option B: Render Persistent Disk (Alternative Local Storage)
- If you run the web service on a **Starter** plan ($7/mo), you can attach a **Persistent Disk** ($0.25/GB/mo).
- Mount Path: `/var/data/uploads`
- Size: 1 GB (or as required)
- Environment Variable: `UPLOADS_DIR=/var/data/uploads`
- *How it works*: Postify's upload middleware dynamically detects `UPLOADS_DIR` and stores local uploads on the persistent volume.

---

## 5. Step 3: Render Deployment

### Method A: Blueprint Deployment (Fastest)

1. Connect your GitHub repository to Render.
2. In the Render Dashboard, click **New > Blueprint**.
3. Select your Postify repository. Render will automatically parse [render.yaml](file:///c:/Users/User/Projects/Postify/render.yaml).
4. Supply the sync variables in the prompted form:
   - `MONGODB_URI`: Your Atlas connection string.
   - `CLIENT_URL`: `https://<your-service-name>.onrender.com` (or your custom domain).
   - `CANONICAL_APP_URL`: Same as `CLIENT_URL`.
   - `RESEND_API_KEY`: Your Resend API key (`re_...`).
   - `RESEND_FROM_EMAIL`: Verified sender address (e.g. `digest@yourdomain.com`).
   - `IMAGEKIT_PUBLIC_KEY`: Your ImageKit public API key.
   - `IMAGEKIT_PRIVATE_KEY`: Your ImageKit private API key.
   - `IMAGEKIT_URL_ENDPOINT`: Your ImageKit URL endpoint (`https://ik.imagekit.io/...`).
5. Click **Apply**. Render will provision:
   - `postify-app` (Web Service).
   - `postify-digest-cron` (Weekly Cron Job).

---

### Method B: Manual Dashboard Setup

If not using Blueprints, create the services manually:

#### 1. Create the Web Service:
- **Type**: Web Service.
- **Environment**: Node.
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`
- **Plan**: Free or Starter.
- **Disk** (Optional if using local disk instead of ImageKit):
  - Name: `postify-uploads`
  - Mount Path: `/var/data/uploads`
  - Size: 1 GB
- **Environment Variables**:

| Variable | Value / Notes |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | `10000` (Render provides dynamic PORT, Express binds automatically) |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/postify?retryWrites=true&w=majority` |
| `JWT_SECRET` | 32+ character high-entropy string (e.g., generated with `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `7d` |
| `COOKIE_SAMESITE` | `lax` |
| `CLIENT_URL` | `https://your-service.onrender.com` |
| `CANONICAL_APP_URL` | `https://your-service.onrender.com` |
| `UPLOADS_DIR` | `/var/data/uploads` (if persistent disk mounted) |
| `IMAGEKIT_PUBLIC_KEY` | `public_xxxxxxxxxxxxxxxx` (from ImageKit dashboard) |
| `IMAGEKIT_PRIVATE_KEY` | `private_xxxxxxxxxxxxxxx` (from ImageKit dashboard) |
| `IMAGEKIT_URL_ENDPOINT` | `https://ik.imagekit.io/your_id` (from ImageKit dashboard) |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | `digest@yourdomain.com` |
| `RESEND_FROM_NAME` | `Postify Weekly Digest` |

---

## 6. Step 4: Configure the Weekly Digest Cron Job

The digest runner (`server/src/scripts/runDigestJob.js`) must NOT run inside every web server process. It runs as an independent cron job:

- **Type**: Cron Job.
- **Name**: `postify-digest-cron`
- **Schedule**: `0 9 * * 1` (Runs every Monday at 09:00 UTC).
- **Build Command**: `npm install`
- **Command**: `npm run digest:run` (or `node server/src/scripts/runDigestJob.js`)
- **Environment Variables**:
  - `NODE_ENV=production`
  - `MONGODB_URI` (same as Web Service)
  - `CLIENT_URL` (same as Web Service)
  - `CANONICAL_APP_URL` (same as Web Service)
  - `RESEND_API_KEY` (same as Web Service)
  - `RESEND_FROM_EMAIL` (same as Web Service)
  - `RESEND_FROM_NAME=Postify Weekly Digest`

---

## 7. Step 5: Post-Deployment Verification & Administrator Setup

### 1. Verify Health Endpoint
After deployment completes, probe the health check:
```bash
curl -i https://your-service.onrender.com/health
```
Expected response:
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "service": "Postify",
  "uptime": 45,
  "timestamp": "2026-10-19T18:00:00.000Z",
  "database": "connected"
}
```

### 2. Verify SPA & Route Direct Navigation
Open the following routes in a browser and verify they render without 404s:
- `https://your-service.onrender.com/`
- `https://your-service.onrender.com/feed`
- `https://your-service.onrender.com/search`
- `https://your-service.onrender.com/login`

### 3. Verify API 404 Behavior
Verify an invalid API endpoint returns JSON, not the React HTML shell:
```bash
curl -i https://your-service.onrender.com/api/invalid-route-test
```
Expected response:
```json
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "success": false,
  "message": "API endpoint not found: GET /api/invalid-route-test"
}
```

### 4. Assign the Initial Administrator Account
Do NOT create accounts with hardcoded passwords. Once you register your primary account via the web interface:
1. Open the Render Dashboard.
2. Select your `postify-app` Web Service.
3. Click the **Shell** tab (or connect via SSH).
4. Run the role assignment CLI tool:
   ```bash
   node server/src/scripts/assignRole.js your_email@domain.com admin
   ```
5. You will see:
   ```
   [RoleAssignment] Successfully assigned role "admin" to user your_email@domain.com (ID: 67...).
   ```

---

## 8. Step 6: Resend Domain Verification & Email Testing

1. In your **Resend Dashboard**, go to **Domains > Add Domain**.
2. Add your custom domain (e.g., `postify.dev`).
3. Add the displayed DNS records (DKIM, SPF, and MX) at your DNS registrar (Namecheap, Cloudflare, GoDaddy, etc.).
4. Wait for domain status to become **Verified**.
5. Test a dry-run digest job execution from the Render Shell:
   ```bash
   node server/src/scripts/runDigestJob.js
   ```
   Verify the output summary confirms digest generation without uncaught exceptions.

---

## 9. Custom Domains & HTTPS

1. In Render, go to **Settings > Custom Domains**.
2. Add your custom domain (e.g. `postify.dev` and `www.postify.dev`).
3. Point your DNS records as instructed:
   - `CNAME` for `www` to `your-service.onrender.com`.
   - `ANAME`/`ALIAS` for apex domain to `your-service.onrender.com`.
4. Render provisions a free Let's Encrypt TLS certificate automatically and redirects all HTTP traffic to HTTPS.
5. Update `CLIENT_URL` and `CANONICAL_APP_URL` in the Render environment variables to your new custom domain:
   ```
   CLIENT_URL=https://postify.dev
   CANONICAL_APP_URL=https://postify.dev
   ```
