# Biscoon

Biscoon is a community marketplace and information hub for Nepalis in the United States. It brings jobs, housing, services, local businesses, events, community discussions, news, and cultural connections into one searchable platform.

The application uses a static HTML/CSS frontend with browser-side TypeScript, an Express API, MongoDB, and Socket.IO. It also includes role-based moderation and a protected administration dashboard.

## Highlights

- Category-aware listings for jobs, housing, services, events, marketplace items, and photography
- Keyword, category, and location search with optional Elasticsearch acceleration
- User accounts, profiles, email-verification support, saved listings, and activity history
- Confirmation email, resend verification, forgot-password, and reset-password flows with SMTP or local outbox delivery
- Discussions with comments, nested replies, and notifications
- Private, listing-linked conversations with encrypted message bodies
- Community newsroom with draft, publish, feature, and rich-media workflows
- Diaspora utility pages for Unique Connections, AD/BS date conversion, Nepali radio links, and donations
- Real-time notifications and messaging through Socket.IO
- Admin tools for users, listings, discussions, comments, reports, announcements, news, audit logs, and deleted content
- Responsive galleries, PhotoSwipe lightboxes, MapLibre previews, event calendars, and accessible reduced-motion behavior
- Production health checks, graceful shutdown, Docker support, Sentry hooks, and CI checks

## Recent UI and UX updates

Homepage, category browse, listing publish, and admin share one clearer visual system:

- **Lean first paint** — one NEWS ticker; hero is brand + search + location (no markets/crypto strip or stats dashboard)
- **Grouped categories** — Jobs / Housing / Marketplace / Community rows fill the section width; “Show all categories” expands the rest
- **Live category pages** — stub stats and placeholder cards removed; `#listingsFeed` loads real listings with load-more / pagination
- **Homepage filter chips** — CSP-safe `data-filter` handlers; clicking Jobs, Paying Guest, etc. fetches matching live listings
- **Post listing** — lean form; guests see a single “Sign in to publish” gate (same pattern as comments)
- **Design tokens** — `--space-*`, `--radius-*`, `--shadow-*`, and missing grays in `assets/css/main.css`
- **Admin brand fonts** — Cormorant + IBM Plex on the admin dashboard and login
- **Motion** — softer card hover (`translateY`), lighter page-hero entrance, heatmap pulse reduced

## Latest project refresh

The current UI pass moves Biscoon closer to a compact community dashboard:

- **Dashboard homepage** — the landing page now uses a dense two-column home layout with quick links, live news modules, category cards, local community blocks, and inline listing previews.
- **Shared navy navigation** — `assets/css/dash-nav.css` centralizes the newer sticky header used by the homepage and refreshed inner pages.
- **Live info bar** — the homepage shows Kathmandu weather and Nepali rupee FX rates. Browser code calls local API endpoints instead of third-party weather APIs directly.
- **Weather proxy API** — `GET /api/weather?lat=<lat>&lon=<lon>&city=<name>` fetches Open-Meteo data server-side and returns normalized weather widget fields.
- **Legacy category redirects** — thin subcategory HTML pages were folded into parent browse hubs with `?subcategory=` URLs. Deleted pages are preserved as 301 redirects through `src/config/legacyPageRedirects.ts`.
- **Browse hub subcategories** — parent category pages can select and sync subcategory chips from the URL, keeping older deep links usable while reducing duplicated static pages.
- **Client type safety cleanup** — browser TypeScript and generated JavaScript were rebuilt so shared helpers do not collide across global scripts.
- **Account recovery pages** — signup, login, verification, password reset, and profile verification prompts now share one browser auth module.
- **Community utilities** — the homepage now links to Unique Connections, Nepali Radio, a Bikram Sambat date converter, and a donation page.
- **Mail delivery fallback** — SMTP sends account emails when configured; development writes HTML copies to `data/mail-outbox/`.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, TypeScript, esbuild |
| API | Node.js, Express, TypeScript |
| Database | MongoDB, Mongoose |
| Realtime | Socket.IO |
| Search | MongoDB text search; optional Elasticsearch 7 |
| UI libraries | PhotoSwipe, MapLibre GL, FullCalendar, Swiper, Tiptap, Fuse.js |
| Validation and security | Zod, JWT, bcrypt, Helmet, CORS, sanitize-html |
| Testing | Jest, Supertest, mongodb-memory-server |
| Operations | Docker Compose, Sentry, GitHub Actions |

## Requirements

- Node.js 20 or newer
- npm
- MongoDB 7 or a compatible MongoDB service
- Elasticsearch 7.x (optional)

## Quick Start

1. Install dependencies.

   ```bash
   npm ci
   ```

2. Create your local environment file.

   ```bash
   cp .env.example .env
   ```

   The development defaults work with MongoDB on `localhost:27017`. Replace the placeholder secrets before sharing or deploying the app.

3. Start MongoDB in a separate terminal.

   ```bash
   npm run mongo
   ```

4. Start the application.

   ```bash
   npm run dev
   ```

5. Open [http://localhost:4000](http://localhost:4000).

In development, the server automatically tries the next available port if port `4000` is occupied.

## Environment Variables

| Variable | Required in production | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Yes | Use `production` for production safeguards and caching |
| `PORT` | No | HTTP port; defaults to `4000` |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret; at least 32 characters in production |
| `MSG_ENCRYPTION_KEY` | Yes | Message encryption key; at least 32 characters in production |
| `CORS_ORIGINS` | Yes | Comma-separated allowed browser origins |
| `APP_BASE_URL` | Recommended | Public application URL |
| `ELASTICSEARCH_URL` | No | Enables Elasticsearch when the service is available |
| `EMAIL_VERIFICATION_REQUIRED` | No | Blocks sign-in and protected actions until email is confirmed. Defaults to on except in tests |
| `SMTP_HOST` | No | SMTP server for confirmation and password-reset email |
| `SMTP_PORT` | No | SMTP port; defaults to `587` |
| `SMTP_USER` / `SMTP_PASS` | No | SMTP credentials |
| `SMTP_SECURE` | No | `true` for port 465 TLS |
| `MAIL_FROM` | No | From address; defaults to `Biscoon <noreply@biscoon.com>` |
| `UPLOAD_DIR` | No | Upload directory; defaults to `uploads` |
| `JSON_BODY_LIMIT` | No | JSON request limit; defaults to `25mb` |
| `TRUST_PROXY` | Recommended | Express proxy setting; defaults to `1` in production |
| `SENTRY_DSN` | No | Enables server-side Sentry reporting |
| `SENTRY_TRACES_SAMPLE_RATE` | No | Sentry trace sample rate; defaults to `0.05` |

Production startup fails when `MONGODB_URI`, `JWT_SECRET`, `MSG_ENCRYPTION_KEY`, or `CORS_ORIGINS` is missing. See [.env.example](.env.example) for a complete template and [DEPLOYMENT.md](DEPLOYMENT.md) for production guidance.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the TypeScript server with Nodemon |
| `npm run mongo` | Start a local MongoDB instance in `data/mongo` |
| `npm run build` | Compile server TypeScript into `dist` |
| `npm run build:client` | Build browser TypeScript and copy vendor assets |
| `npm start` | Run the compiled server |
| `npm run test` | Run the Jest API test suite |
| `npm run typecheck` | Type-check server code |
| `npm run typecheck:client` | Type-check browser code |
| `npm run check` | Run tests, both type-checks, and the client build |
| `npm run seed` | Reset and seed local users and listings |
| `npm run migrate:conversations` | Migrate conversation records and indexes |

> **Warning:** `npm run seed` clears users and listings. Run it only against a disposable development database.

## Contributing

- Create a feature branch from `main` before making changes.
- Keep local environment files and generated data out of commits.
- Run `npm run check` before opening a pull request so CI has the best chance of passing.

## Project Structure

```text
.
├── assets/
│   ├── css/             # Global and page-specific styles
│   ├── js/              # Generated browser JavaScript
│   ├── ts/              # Browser TypeScript sources
│   └── vendor/          # Locally served third-party assets
├── pages/               # Static application pages
│   ├── admin/
│   ├── auth/
│   ├── community/
│   ├── housing/
│   ├── jobs/
│   ├── marketplace/
│   ├── news/
│   ├── post/
│   └── donate.html
├── scripts/             # Migration and maintenance scripts
├── src/
│   ├── config/          # Environment, database, and monitoring setup
│   ├── middleware/      # Authentication, authorization, and rate limiting
│   ├── models/          # Mongoose models
│   ├── routes/          # Express API routes
│   ├── services/        # Realtime and search integrations
│   └── utils/           # Shared validation and domain helpers
├── tests/               # API integration tests
├── server.ts            # HTTP server and lifecycle entry point
├── Dockerfile
└── docker-compose.yml
```

Edit browser behavior in `assets/ts`, not the generated files in `assets/js`. Rebuild generated assets with `npm run build:client`.

Recent frontend layout work also uses `assets/css/dash-nav.css` as the shared header stylesheet for the dashboard homepage and refreshed inner pages.

## Application Areas

### Listings and Search

Listings are stored in MongoDB and rendered dynamically across the homepage, category pages, profile pages, and listing details. Homepage filter chips and category pages load live API results (skeletons, load more, sort). Posting fields stay lean; guests must sign in before publish. Regular listings support up to six images; photography showcases support up to twelve.

Search falls back to MongoDB when Elasticsearch is not configured or unavailable. If `ELASTICSEARCH_URL` is set and reachable, the server initializes the required indexes at startup.

### Community and News

Authenticated members can create discussion topics, comment, reply, and receive related notifications. Community utility pages include Unique Connections prompts, Nepali radio links, and an AD/BS date converter. The newsroom supports public published stories while keeping drafts private. Authorized staff can edit rich text, place media, and feature stories from the admin dashboard.

### Accounts and Email

Registration creates an email-confirmation token. When `EMAIL_VERIFICATION_REQUIRED` is on, users must verify before signing in or performing protected actions. Members can request a new verification email from profile or auth screens, and forgot-password sends a one-hour reset link. Configure SMTP with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, and `MAIL_FROM`; without SMTP, development writes rendered emails to `data/mail-outbox/` and returns test links in non-production API responses.

### Messaging and Notifications

Socket.IO provides same-origin real-time updates. Conversations are tied to listings, and message bodies are encrypted at rest. Keep `MSG_ENCRYPTION_KEY` stable: changing it makes existing encrypted messages unreadable.

### Administration

The dashboard at `/pages/admin/dashboard.html` is available to super admins and staff with assigned permissions. It includes analytics, content management, moderation queues, announcements, audit history, and read-only conversation metadata. Message content is intentionally excluded from admin views.

## API Overview

All JSON endpoints are mounted under `/api`.

| Prefix | Responsibility |
| --- | --- |
| `/api/auth` | Registration, login, profiles, password and email flows |
| `/api/listings` | Listings, images, comments, saves, and search |
| `/api/discussions` | Topics, comments, and replies |
| `/api/messages` | Conversations and encrypted messages |
| `/api/notifications` | Notification feeds and read state |
| `/api/activity` | User activity history |
| `/api/news` | Public and managed newsroom content |
| `/api/market` | Market ticker data |
| `/api/weather` | Server-side Open-Meteo proxy for weather widgets |
| `/api/announcements` | Active site announcements |
| `/api/moderation` | User reporting workflows |
| `/api/admin` | Protected administration operations |
| `/api/spotlight` | Homepage spotlight content |

Operational endpoints:

- `GET /api/health` reports service, environment, uptime, and database state.
- `GET /api/ready` returns `200` only when MongoDB is connected; otherwise it returns `503`.

Static compatibility redirects:

- Removed thin pages such as `/pages/jobs/tech.html`, `/pages/community/music.html`, and `/pages/marketplace/auto.html` now redirect to their parent browse page with the matching `subcategory` query string.

## Validation

Run the complete local quality gate before opening a pull request:

```bash
npm run check
```

The same command runs in GitHub Actions for pushes and pull requests. It executes the API tests, server and browser type-checks, and the browser build.

## Docker

Create `.env` with strong secrets and a local allowed origin, then run:

```bash
docker compose up --build
```

The Compose stack starts MongoDB and the application at [http://localhost:4000](http://localhost:4000), with named volumes for database data and uploads.

## Deployment Notes

- Run behind HTTPS and configure WebSocket upgrades for `/socket.io/`.
- Persist both MongoDB data and the configured upload directory.
- Back up database data and uploads together.
- Keep JWT and message-encryption secrets stable.
- Set SMTP_* to send confirmation and password-reset mail. Until then, local copies land in `data/mail-outbox/`.
- Use `/api/ready` for container or load-balancer readiness checks.
- Review [DEPLOYMENT.md](DEPLOYMENT.md) before deploying or creating the first super admin.

## License

This repository is private and does not currently declare an open-source license.
