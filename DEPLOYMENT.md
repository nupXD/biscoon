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
UPLOAD_DIR=uploads
TRUST_PROXY=1
```

Production startup fails if `MONGODB_URI`, `JWT_SECRET`, `MSG_ENCRYPTION_KEY`, or `CORS_ORIGINS` are missing.

## Pre-Deploy Checks

```bash
npm ci
npm run check
```

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

New listing images and message attachments are stored under `uploads/`. In production, mount this as persistent storage or replace `src/utils/uploads.js` with object storage such as S3, Cloudflare R2, or Cloudinary. Do not rely on ephemeral container disk for long-term uploads.

## Reverse Proxy

Run behind HTTPS. If using Nginx, Render, Railway, Fly, Heroku, or a cloud load balancer, keep `TRUST_PROXY=1` so Express understands proxy headers.

## First Super Admin

After deployment, create the initial super admin only on an empty/non-production database:

```bash
npm run seed
```

Warning: `npm run seed` clears users and listings. For a real production database, make an existing account the first super admin instead:

```js
db.users.updateOne({ email: "your@email.com" }, { $set: { role: "super-admin" } })
```

## Operational Notes

- Keep `JWT_SECRET` and `MSG_ENCRYPTION_KEY` stable. Changing them invalidates sessions and makes old encrypted message bodies unreadable.
- Back up MongoDB and upload storage together.
- Run `npm run migrate:conversations` after deploying conversation model/index changes.
- Configure provider-level logs and alerts for non-2xx spikes, `/api/ready` failures, and MongoDB connection errors.
