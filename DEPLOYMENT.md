# Biscoon Production Deployment

This app is set up for production-style deployment with explicit environment variables, scoped static serving, health checks, graceful shutdown, and Docker support.

## Required Environment

Set these in your hosting provider or `.env` file:

```bash
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://user:password@cluster.example/biscoon
JWT_SECRET=<at-least-32-random-characters>
MSG_ENCRYPTION_KEY=<at-least-32-random-characters>
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
APP_BASE_URL=https://your-domain.com
EMAIL_VERIFICATION_REQUIRED=true
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=Biscoon <noreply@biscoon.com>
UPLOAD_DIR=uploads
TRUST_PROXY=false
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.05
```

Production startup fails if `MONGODB_URI`, `JWT_SECRET`, `MSG_ENCRYPTION_KEY`, or `CORS_ORIGINS` are missing.

## Pre-Deploy Checks

```bash
npm ci
npm run check
```

GitHub Actions also runs `npm run check` on pushes and pull requests.

## Docker

Local production-like run:

```bash
cp .env.example .env
# edit .env with strong secrets and CORS_ORIGINS=http://localhost:4000
docker compose up --build
```

Open:

```text
http://localhost:4000
```

Health endpoints:

```text
GET /api/health
GET /api/ready
```

Use `/api/ready` for load balancer/container health checks because it returns `503` when MongoDB is not connected.

## Uploads

New listing images and message attachments are stored under `uploads/`. In production, mount this as persistent storage or replace `src/utils/uploads.ts` with object storage later. Do not rely on ephemeral container disk for long-term uploads.

## Email Verification

Signup sends a confirmation link. Password reset sends a one-hour link. Tokens are stored as hashes. Without `SMTP_HOST`, development writes copies of the emails to `data/mail-outbox/` and logs the link. Non-production API responses also include `verificationUrl` / `resetUrl` so the flow can be tested without a mailbox. Production responses never expose raw tokens, including when SMTP is missing or delivery fails. Production also disables the local email outbox and token-bearing fallback logs. Configure working SMTP before enabling public signup or password recovery. Set `EMAIL_VERIFICATION_REQUIRED=true` once you are ready to require confirmation before sign-in.

## Reverse Proxy

Run behind HTTPS. Configure `TRUST_PROXY` for the actual reverse-proxy topology: an explicit trusted address/CIDR list, or `1` only when every request must pass through exactly one trusted proxy. Leave it false for direct connections.

Socket.IO is served from the same origin as the Express app. Make sure your reverse proxy forwards WebSocket upgrades for `/socket.io/`.

## First Super Admin

After deployment, create the initial super admin only on an empty/non-production database:

```bash
npm run seed
```

Demo seeding is development-only and refuses to run with `NODE_ENV=production`. It is excluded from the production image. To create the first production administrator, build the server, then set `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (16+ characters, at most 72 UTF-8 bytes), and optionally `BOOTSTRAP_ADMIN_NAME` through your secret manager or terminal environment. Run `npm run bootstrap:admin`. This creates a new account only; it refuses to overwrite or elevate an existing account. It never prints the password.

## Operational Notes

- Keep `JWT_SECRET` and `MSG_ENCRYPTION_KEY` stable. Changing them invalidates sessions and makes old encrypted message bodies unreadable.
- Back up MongoDB and upload storage together.
- Review the super-admin Audit Logs page after privileged changes and moderation actions.
- Run `npm run migrate:conversations` after deploying conversation model/index changes.
- Configure provider-level logs and alerts for non-2xx spikes, `/api/ready` failures, and MongoDB connection errors.

## Proxy, publishing, and runtime safeguards

Use Node 22.12 or newer (CI and Docker use Node 22). `TRUST_PROXY` defaults to false for direct connections. Behind a reverse proxy, set an explicit trusted address/CIDR list or a numeric hop count such as `1`, only when the topology guarantees that hop. Do not expose a direct alternative path while trusting a fixed hop count. `true` is rejected.

Authentication has an independent IP request budget, and registration is limited per IP rather than per IP/email pair. Rate-limit counters are process-local; a multi-replica deployment still needs a shared limiter store at the application or edge layer.

News media uploads individually to the permission-protected `/api/admin/news/media` endpoint. Story saves contain references, not a combined base64 video batch. Each upload is checked against the server's configured JSON request size. Keep the JSON limit large enough for base64 overhead (the 25 MB default supports an 18 MB video).

The news editor backs up unsaved fields and completed media references in this browser tab's session storage. It asks before closing dirty work, offers restore when reopening the same story, and warns on refresh/navigation. Uploads and saves lock editing and dismissal until finished. This is tab-local recovery, not cross-device draft synchronization; storage-denied/quota failures are shown in the form. Browser closure can remove session-storage recovery.
