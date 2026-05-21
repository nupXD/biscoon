# Biscoon - Nepali Community Marketplace

Biscoon is a dynamic community marketplace for Nepalis in the United States. It brings together listings for jobs, housing, paying guests, services, shops, restaurants, events, community organizations, and cultural connections in one searchable platform.

The project is built as a static HTML/CSS/JavaScript frontend served by an Express backend, with MongoDB/Mongoose for user accounts, live listing data, discussion topics, notifications, activity history, private messaging, and a super-admin panel.

## Project Goals

- Help Nepali community members find relevant listings by category, location, and search terms.
- Allow registered users to create, edit, delete, and manage their own listings.
- Keep users logged in across all pages, expire inactive sessions after one day, and hide sign-in/sign-up actions once authenticated.
- Make listings dynamic across the homepage, category pages, search results, profile, and post pages.
- Support discussion topics, comments, replies, notifications, and user activity history.
- Publish newsroom stories for community updates, immigration, business, culture, Nepal, and diaspora news.
- Keep category-specific posting flows focused so users only see fields that matter for housing, jobs, services, events, community posts, marketplace items, and photography.
- Keep the codebase readable by separating global CSS, page CSS, JavaScript, routes, models, and helpers.
- Provide an interactive super-admin panel so platform operators can monitor analytics, manage content, and assign staff privileges.

## Main Features

### Authentication

- User signup and login with JWT authentication.
- Duplicate email validation prevents the same email from registering more than once.
- Registration now creates hashed email-verification tokens, and password reset tokens are hashed at rest.
- `EMAIL_VERIFICATION_REQUIRED=true` can require verified email before posting, commenting, or messaging once an email provider is connected.
- Login state is persisted in `localStorage` with an inactivity timestamp.
- Sessions expire after one day of inactivity, matching the one-day JWT expiry.
- Logged-in users see profile, activity, notifications, add-listing, create-discussion, and logout dropdowns across pages.
- Logged-out users are redirected to login before creating or managing listings.

### Dynamic Listings

- Listings are stored in MongoDB.
- Homepage and category pages render live listing data from the API.
- Static sample listing cards are replaced at runtime with loading, empty, or live listing states.
- Search supports keywords, category filtering, and discussion results.
- Browse/load-more actions preserve the selected category or subcategory.
- Category filter chips are rebuilt from live listing subcategories.
- Listing cards open detail popups instead of redirecting away.
- Detail pages still exist for direct listing URLs.
- Listing detail views support authenticated comments.
- Logged-in users can save and unsave listings for later.

### Listing Posting

The posting form is category-aware. It changes labels, required fields, helper text, specific type suggestions, and availability options based on the chosen category.

Common fields include:

- Category
- Specific type/subcategory
- Title/headline
- Description
- Area/city and state
- Location type
- Availability/timing
- Price/rate
- Price note
- Contact email and phone
- Contact preference
- External link
- Tags
- Up to 6 images

The posting form builds a searchable location string such as `Allston, MA`.

Category-specific behavior:

- Housing requires location, rent/cost, move-in availability, and contact email.
- Jobs require work location, start/schedule availability, and contact email; pay can be optional.
- Marketplace items require location, asking price, and contact email.
- Events require venue/area, event date or timing, and contact email.
- Services, professional listings, and community posts keep price and availability optional unless the selected type needs them.
- Photography posts are treated as creative showcase posts, not booking/service listings.

### Photography Showcase

Photography has its own posting mode at `/pages/post/listing.html?category=photography` and appears publicly on `/pages/marketplace/photography.html`.

- Users can upload up to 12 photos for a photography post.
- At least one photo is required.
- Booking, location, price, contact, and external link fields are hidden.
- The form asks for photo style/genre, title, caption/story, tags, and images.
- The backend stores photography posts with `category: photography`, `location: Photography showcase`, and `locationType: showcase` for compatibility with existing listing queries.

### Listing Images

- Users can upload multiple images.
- Images are resized in the browser before saving.
- Up to 6 images can be stored per regular listing; photography posts allow up to 12 images.
- Existing images can be kept, removed, or replaced while editing.
- Listing cards show the first uploaded image.
- If no image exists, a category-based default visual is shown.
- Popups and detail pages show an image gallery, or a default image area when no images were uploaded.
- Listing galleries are enhanced with PhotoSwipe lightbox zoom on supported pages.

### Photography Showcase Gallery

The photography page (`/pages/marketplace/photography.html`) features a full visual portfolio experience:

- **Masonry grid** — 4-column responsive photo gallery with tall and wide span variants, hover zoom, and overlay labels.
- **"Photographer of the Week" banner** — featured photographer card with avatar, stats, and a 4-photo mini-strip gallery.
- **PhotoSwipe lightbox** — click any photo to open a full-screen carousel with keyboard navigation, swipe, zoom, close button, and previous/next arrows.
- **Photo listing cards** — each listing card shows a real photo thumbnail instead of an emoji icon, with an image-count badge for multi-photo posts.

### UX Enhancements

- Fuse.js powers lightweight autocomplete suggestions for listings and discussions from the shared search inputs.
- FullCalendar adds a calendar view to the Events page while keeping the existing event list.
- Tiptap powers the admin news editor for rich text, headings, quotes, font choices, and placed media.
- Socket.IO sends real-time notification/message updates to signed-in users.
- MapLibre renders an approximate local map preview on listing detail pages without requiring a cloud map provider.
- Sentry hooks are available for production error monitoring when `SENTRY_DSN` or a browser Sentry DSN meta tag is configured.
- PhotoSwipe lightbox is loaded on every page. It auto-activates via `MutationObserver` whenever `[data-pswp-gallery]` elements appear in the DOM — including dynamically opened listing modals and the admin gallery panel.

### Animation and Motion Design

The frontend uses an Emil Kowalski-inspired motion system applied consistently across all pages:

- **Custom easing variables** — `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out`, and `--ease-drawer` defined in `:root` and used for all transitions.
- **Touch guards** — all hover transforms are wrapped in `@media (hover: hover) and (pointer: fine)` so touch devices never trigger unintended animations.
- **`:active` scale states** — buttons, chips, cards, and links scale down slightly on press for tactile feedback.
- **No `transition: all`** — every transition explicitly lists only the properties being animated, preventing layout and paint thrashing across the entire CSS codebase.
- **Hero entrance stagger** — homepage hero elements (`biscoon-name`, `biscoon-sub`, search bar, stats strip, etc.) animate in with staggered `heroFadeUp` keyframes from 60 ms to 600 ms.
- **Category card scroll-reveal** — the category grid fades in with a 35 ms stagger between cards, triggered by `IntersectionObserver` when the section enters the viewport.
- **Section scroll-reveal** — journal, heatmap, Facebook groups, calendar, and CTA sections fade up from `translateY(28px)` as they scroll into view.
- **Counter animation** — stat numbers (`.stat-num`, `.hmap-num`) animate from 0 to their target value with a cubic ease-out over 1 100 ms when they first enter the viewport.
- **`prefers-reduced-motion`** — all entrance animations and counter animations are disabled when the user has requested reduced motion.

### Profile Management

The profile page lets authenticated users:

- View account details.
- Update name and phone.
- Change password with current password validation.
- View all their posted listings.
- Click a listing to open a popup detail view.
- Edit a listing inside the same popup.
- Add/remove listing images from the popup editor.
- Delete owned listings.

### Discussions

- Authenticated users can create discussion topics from the discussion page or user dropdown.
- Admin users with the Discussions privilege can create official discussion topics from the admin panel.
- The discussion page is optimized for browsing topics first.
- Creating a discussion opens a modal for logged-in users.
- Logged-out users are sent to login before creating topics, comments, or replies.
- Discussion topics support comments and nested replies.
- Homepage search can include discussions, and the search category dropdown can search only discussions.

### News

- Public news section at `/pages/news/index.html`.
- Published stories are available through `/api/news`; drafts stay private.
- News supports headline, summary, body, category, featured flag, source, author, hero image URL/upload, rich text markers, and story media.
- Admins can upload multiple images/videos, insert them into the article body where they want them, add captions, and use bold, heading, quote, and font controls.
- Readers can browse a newspaper-style front page, filter by category, search, and open full articles.
- Admin users with the News privilege can create, edit, publish, feature, and delete stories.

### Notifications

Authenticated users receive notifications when:

- Someone comments on their discussion topic.
- Someone replies to one of their discussion comments.
- Someone comments on their listing.
- The listing owner replies to their listing comment.

The notification dropdown badge shows unread notifications. The notifications page lets users view notifications and mark them read.

### My Activity

The activity page shows a user's:

- Discussion topics posted.
- Discussion comments.
- Discussion replies.
- Listing comments.
- Listing owner replies.

Listings posted by the user are intentionally not included in My Activity.

### Super Admin Panel

A protected admin panel at `/pages/admin/dashboard.html` gives operators full visibility into the platform.

**Access:** Super admins and admin users can access the panel. Regular users see a 403 error.

**Dashboard — Analytics:**
- Total users, listings, discussions, and active conversation threads.
- Growth metrics: new users and listings posted today, this week, and this month.
- Listings broken down by category.
- Recent users and recent listings tables.

**Users section:**
- Regular Users tab: paginated list of public signup users with name, email, phone, listing count, and join date.
- Admin Users tab: super-admin-only area for creating admin users and assigning privileges.
- Live search by name or email.
- Delete a regular user (removes their listings too).

**Admin user privileges:**
- Super admins have every privilege and can create admin users.
- Admin users are separate staff accounts created by a super admin only.
- Admin users can be assigned access to Regular Users, Listings, News, Discussions, Comments, Reports, and Announcements.

**Listings section:**
- Paginated list of all listings across all users.
- Filter by category and search by keyword.
- View category-aware listing details in a modal.
- Photography listings show the uploaded photo gallery, genre, tags, caption/story, comments, and hide irrelevant price/location/contact fields.
- Housing, jobs, events, services, professional, marketplace, and community listings use category-specific field labels.
- Edit or delete any listing.

**News section:**
- Create, edit, publish, feature, preview, and delete stories.
- Rich story editor supports inline formatting controls and a media library for images/videos.
- Drafts remain private until published.

**Discussions section:**
- Paginated list of all discussion topics with author, category, and comment count.
- Create official admin discussions.
- View, edit, or delete any discussion.

**Reports section:**
- Review user-submitted reports.
- Move reports between open, reviewing, resolved, and dismissed states.

**Announcements section:**
- Create site-wide info, warning, or success banners.
- Pause/reactivate active announcements and optionally set expiry dates.

**Audit Logs section:**
- Super-admin-only activity trail for admin user changes, news edits, listing moderation, discussion moderation, reports, comments, and announcements.
- Logs include actor, target, timestamp, action type, and lightweight context.

**Conversations section (read-only metadata):**
- Shows who is talking, about which listing, message count, and last activity time.
- Message content is never shown — it is encrypted at rest and intentionally excluded.

**Interactive dashboard:**
- Collapsible sidebar and sticky topbar with current-view context.
- Refresh current view button and polished loading skeletons.
- Toast notifications for saves, deletes, uploads, report status changes, and errors.
- Custom confirmation dialogs replace native browser confirm boxes.
- Press `/` to focus the visible search box.
- Clickable stat cards that navigate directly to the relevant section.
- Horizontal bar chart showing listing counts by category.
- Clickable recent users and recent listings mini-cards.
- Clickable activity feed items.
- Quick action buttons for common admin tasks.

**Full view modals:**
- Click any listing title or "View" button to see full listing details, images, contact info, tags, comments, and Edit/Delete actions.
- Click any discussion title or "View" button to see the full body, tags, author info, all comments, and Edit/Delete actions.
- Click any regular user row to see a full profile header, join date, listing/discussion counts, delete action, and all of their content.

**Separate admin and user login:**
- Admin login (`/pages/admin/login.html`) accepts super-admin and admin-user accounts. Regular users are blocked.
- Regular user login (`/pages/auth/login.html`) blocks admin accounts and directs them to the admin panel.
- Admin panel sessions use separate browser storage from regular website sessions, so an admin can be signed into the panel without also being signed into the public website.
- Cross-links are shown between the two pages.

**Setting up the first admin:**

Run `npm run seed` to create a ready-to-use super admin account:

```text
Email:    admin@biscoon.com
Password: admin123
```

To make an existing account the first super admin manually:

```js
// In a MongoDB shell:
db.users.updateOne({ email: "your@email.com" }, { $set: { role: "super-admin" } })
```

### Dynamic Stats

The backend exposes listing stats used by page UI:

- Total listings
- Listings posted today
- Listings posted this week
- Cities covered
- Counts by category
- Counts by subcategory

### Real-Time Market Tickers

The homepage displays four live scrolling tickers:

- **Markets** — NASDAQ 100, S&P 500, Dow Jones, and individual stocks (NVDA, AMD, AAPL, MU, CSCO, AKAM) sourced from Stooq.com.
- **Crypto** — BTC, ETH, XRP, SOL, BNB, DOGE, ADA, AVAX, LINK, DOT, USDT sourced from CoinGecko.
- **NPR Forex** — 15 currencies (USD, EUR, GBP, AUD, CAD, CHF, CNY, JPY, SAR, QAR, AED, SGD, HKD, KRW, MYR) relative to NPR, sourced from open.er-api.com.
- **News** — Biscoon community headlines; the full newsroom lives at `/pages/news/index.html`.

Data is fetched via the backend proxy at `/api/market` and cached for 60 seconds. The frontend polls every 60 seconds and updates the ticker values in place. If the API is unavailable, the static fallback values in the HTML remain visible.

## Technology Stack

- HTML5, CSS3, TypeScript (compiled to ES2020 with esbuild — no frontend framework)
- Node.js + Express.js
- MongoDB + Mongoose
- JWT (jsonwebtoken) + bcryptjs
- Zod (request validation)
- Helmet (HTTP security headers + CSP)
- Compression (gzip)
- express-async-errors (async error propagation)
- dotenv (environment config)
- uuid (deterministic IDs)
- TypeScript + esbuild — all frontend source lives in `assets/ts/`; `npm run build:client:core` compiles to `assets/js/`
- PhotoSwipe v5 (listing and gallery lightbox, loaded globally via MutationObserver)
- Tiptap (admin rich-text news editor)
- FullCalendar (events page calendar view)
- Fuse.js (search autocomplete)
- Socket.IO (real-time notifications and messages)
- MapLibre GL (listing detail map preview)
- Optional Sentry monitoring

## Production Readiness

- `src/app.ts` owns middleware, route mounting, static serving, CORS, Helmet CSP, compression, 404s, and error handling.
- `server.ts` handles process startup, port fallback, MongoDB connection, health endpoints, Socket.IO, and graceful shutdown.
- `src/config/env.ts` centralizes environment variables and fails fast in production when required secrets or CORS origins are missing.
- Email verification and password reset token storage are implemented without cloud/email delivery; production email delivery can be connected later.
- Admin audit logs provide accountability for privileged actions.
- GitHub Actions runs `npm run check` on pushes and pull requests.
- `npm run check` runs the Jest/Supertest API suite, server typecheck, client typecheck, and browser bundle build.
- Docker and Compose files are included for production-like local runs.
- `DEPLOYMENT.md` documents production env vars, health checks, upload persistence, reverse proxy notes, and first-super-admin setup.

## Project Structure

```text
biscoon-project/
├── index.html
├── package.json
├── package-lock.json
├── server.js               # Process startup, port fallback, graceful shutdown
├── seed.js
├── README.md
├── DEPLOYMENT.md
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── assets/
│   ├── css/
│   │   ├── main.css        # Global design system + PhotoSwipe import + easing vars
│   │   └── pages/          # Per-page CSS (admin/, auth/, community/, news/, etc.)
│   ├── ts/                 # TypeScript source (compiled by esbuild)
│   │   ├── biscoon.ts      # Auth UI, session, search, listings, nav, animations
│   │   ├── auth.ts
│   │   ├── admin.ts
│   │   ├── profile.ts
│   │   └── ticker.ts
│   ├── js/
│   │   ├── biscoon.js      # Compiled output
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── profile.js
│   │   ├── ticker.js
│   │   ├── news.js         # Public newsroom UI (not TypeScript-authored)
│   │   ├── listing.js      # Posting page logic
│   │   ├── activity.js
│   │   ├── discussions.js
│   │   ├── messages.js
│   │   ├── notifications.js
│   │   └── plugins/        # Pre-built vendor plugins loaded on-demand
│   │       ├── listing-lightbox.js   # PhotoSwipe v5 (all pages)
│   │       ├── listing-map.js        # MapLibre (listing detail)
│   │       ├── events-calendar.js    # FullCalendar (events page)
│   │       ├── search-autocomplete.js # Fuse.js (all pages)
│   │       ├── realtime-notifications.js # Socket.IO (signed-in users)
│   │       ├── news-editor.js        # Tiptap (admin panel)
│   │       └── error-monitor.js      # Sentry (optional)
│   └── vendor/
│       └── photoswipe/
│           └── photoswipe.css        # PhotoSwipe UI styles
├── pages/
│   ├── admin/              # dashboard.html, login.html
│   ├── auth/               # login, signup, profile, activity, notifications, messages
│   ├── community/          # discussions, organizations, events, literature, …
│   ├── housing/            # housing, paying-guest, real-estate, moving
│   ├── jobs/               # jobs, tech, healthcare, insurance, cpa, legal, …
│   ├── marketplace/        # kinbech, services, restaurants, shops, …
│   ├── news/               # index.html, article.html
│   └── post/               # listing.html, detail.html
├── scripts/
│   ├── extract-page-css.js
│   └── migrate-conversations.js
├── tests/
│   └── api.test.js         # Jest + Supertest + mongodb-memory-server
├── uploads/                # Saved listing images and message attachments (git-ignored)
└── src/
    ├── app.js              # Express app factory (routes, middleware, CSP, CORS)
    ├── config/
    │   ├── env.js          # All env vars with dev defaults and production guards
    │   └── database.js     # Mongoose connect
    ├── middleware/
    │   ├── auth.js         # JWT Bearer token middleware
    │   ├── admin.js        # Admin role + permission middleware
    │   ├── requireVerifiedEmail.js
    │   └── rateLimit.js    # Custom in-memory rate limiter (no Redis)
    ├── models/
    │   ├── AdminAuditLog.js
    │   ├── User.js         # Roles: user / staff / sub-admin / admin / super-admin
    │   ├── Listing.js      # Full listing + embedded comments; text index
    │   ├── Discussion.js   # Discussion + embedded comments; text index
    │   ├── Conversation.js # Private messages (body encrypted at rest)
    │   ├── Notification.js
    │   ├── Announcement.js # Site-wide banners (info / warning / success)
    │   └── Report.js       # Moderation reports with status workflow
    ├── routes/
    │   ├── auth.js         # register, login, /me
    │   ├── listings.js     # CRUD + comments + stats
    │   ├── discussions.js  # CRUD + comments
    │   ├── messages.js     # Conversations + replies + read state
    │   ├── notifications.js
    │   ├── activity.js
    │   ├── moderation.js   # User-facing report submission
    │   ├── announcements.js# Public active-announcement endpoint
    │   ├── market.js       # Proxy for stocks / crypto / NPR forex (60s cache)
    │   └── admin.js        # Full admin API (stats, users, staff, content, reports)
    └── utils/
        ├── users.js
        ├── listings.js
        ├── discussions.js
        ├── notifications.js
        ├── categories.js   # Category groups, aliases, and query builders
        ├── pagination.js   # getPagination + pagedResponse helpers
        ├── uploads.js      # saveBase64Upload — writes files to UPLOAD_DIR
        ├── validate.js     # Thin Zod wrapper returning { value } or { error }
        ├── crypto.js       # AES-256-GCM encrypt/decrypt for message bodies
        └── adminPermissions.js # Role/permission constants and helpers
```

## Important Files

- `server.js` — Process startup, port auto-increment (tries up to 10 ports), graceful SIGTERM/SIGINT shutdown.
- `src/app.js` — Express app factory: all middleware (Helmet CSP, CORS, compression), route mounting, 404 and error handlers.
- `src/config/env.js` — All env vars with development defaults; in production, missing or placeholder secrets cause an immediate crash.
- `src/config/database.js` — Mongoose connection.
- `src/middleware/auth.js` — JWT Bearer token validation; attaches `req.user`.
- `src/middleware/admin.js` — Checks that `req.user` has an admin role; exposes `requirePermission(key)` and `requireSuperAdmin` helpers.
- `src/middleware/rateLimit.js` — Custom in-memory rate limiter (no Redis required). Login: 8 attempts per 10 min, 30 min block. Register: 10 per hour, 1 hour block. Keyed on IP + email.
- `src/models/User.js` — Roles: `user`, `staff`, `sub-admin`, `admin`, `super-admin`. Granular permissions array for staff accounts.
- `src/models/Listing.js` — Full listing schema; compound indexes on category+date and userId+date; MongoDB full-text index.
- `src/models/Discussion.js` — Discussion schema; full-text index; sorted by `updatedAt` for active-thread feel.
- `src/models/Conversation.js` — Private messages per listing pair; message bodies AES-256-GCM encrypted; max 200 messages per thread.
- `src/models/Notification.js` — Per-user notifications with indexes for inbox and unread-count queries.
- `src/models/Announcement.js` — Site banners with type (info/warning/success), active flag, and optional expiry.
- `src/models/Report.js` — Moderation reports: targets listing/discussion/comment/message/user; statuses open → reviewing → resolved/dismissed.
- `src/models/News.js` — Newsroom stories with draft/published state, category, featured flag, source, author, and optional image.
- `src/routes/auth.js` — Register, login (rate-limited), GET/PUT `/me`.
- `src/routes/listings.js` — CRUD, image upload (base64 → disk), threaded comments with reply access control, stats aggregation.
- `src/routes/discussions.js` — CRUD + threaded comments + notifications.
- `src/routes/messages.js` — Inbox, conversation thread (cursor-paginated), reply, read state, attachment upload (images/video/docs).
- `src/routes/notifications.js` — List, mark read, mark all read, unread count.
- `src/routes/activity.js` — Aggregated user activity (discussions, comments, replies).
- `src/routes/moderation.js` — User-facing `POST /reports` and `GET /reports/mine`.
- `src/routes/announcements.js` — `GET /active` returns the newest active, non-expired announcement (or null).
- `src/routes/news.js` — Public published-news list and article detail endpoints.
- `src/routes/market.js` — Proxy for CoinGecko (crypto), Stooq (stocks), open.er-api (NPR forex); 60-second in-memory cache.
- `src/routes/admin.js` — Full admin API: analytics, regular user management, staff CRUD (super-admin only), news, listings/discussions/comments moderation, reports, announcements.
- `src/utils/categories.js` — Category groups, legacy aliases, and `listingCategoryFilter` query builder.
- `src/utils/crypto.js` — AES-256-GCM `encrypt`/`decrypt`; key derived from `MSG_ENCRYPTION_KEY` via SHA-256; graceful fallback for pre-encryption data.
- `src/utils/uploads.js` — `saveBase64Upload`: writes base64 payloads to `UPLOAD_DIR/<folder>/<timestamp>-<uuid>.<ext>`.
- `src/utils/validate.js` — Thin Zod `safeParse` wrapper returning `{ value }` or `{ error: string }`.
- `src/utils/adminPermissions.js` — Role hierarchy constants, `getAdminPermissions`, `hasAdminPermission`, `isSuperAdmin`.
- `src/utils/pagination.js` — `getPagination(query, defaults)` and `pagedResponse(key, items, total, page, limit)`.
- `assets/js/biscoon.js` — Shared frontend: JWT session, auth UI, nav, dynamic listings, listing popups, comments, notifications badge.
- `assets/js/admin.js` — Full admin panel SPA: dashboard, users, staff, news, listings, discussions, comments, reports, announcements, toasts, confirmations, and shell interactions.
- `assets/js/news.js` — Public newsroom front page, category filters, search, and article reader.
- `assets/js/listing.js` — Category-aware posting experience, including photography showcase mode.
- `assets/js/messages.js` — Inbox and conversation thread UI.
- `assets/js/ticker.js` — Polls `/api/market` every 60 s; updates ticker tracks in place.
- `assets/css/main.css` — Global design system and reusable components.
- `scripts/extract-page-css.js` — Extracts `<style>` blocks and `style="..."` into `assets/css/pages/` files.
- `scripts/migrate-conversations.js` — One-time backfill of `participantKey` on existing conversations.

## CSS Organization

The project avoids inline CSS in HTML pages.

- Global reusable styles and design tokens live in `assets/css/main.css`, including custom easing variables (`--ease-out`, `--ease-in-out`, `--ease-drawer`) and a `@import` for PhotoSwipe so the lightbox UI is available on every page.
- Page-specific styles live in `assets/css/pages/`.
- Each HTML page links `main.css` first and then its own page stylesheet.
- All hover transitions use explicit property lists (no `transition: all`) and are guarded with `@media (hover: hover) and (pointer: fine)` to prevent unintended animations on touch devices.
- If inline styles are introduced again, run:

```bash
node scripts/extract-page-css.js
```

This script extracts `<style>` blocks and `style="..."` attributes into matching CSS files under `assets/css/pages/`.

## Frontend TypeScript

All frontend JavaScript is authored in TypeScript under `assets/ts/` and compiled to `assets/js/` using esbuild.

```bash
npm run build:client:core   # compile biscoon.ts, auth.ts, admin.ts, profile.ts, ticker.ts
```

Source files:

```text
assets/ts/
├── biscoon.ts    # Auth UI, session, search, listings, nav, animations, plugin loader
├── auth.ts       # Signup / login page logic
├── admin.ts      # Admin panel SPA logic
├── profile.ts    # Profile page logic
└── ticker.ts     # Live market ticker polling
```

Plugin scripts under `assets/js/plugins/` are pre-built vendor bundles and are not TypeScript-authored.

## Pages

### Top Level

- `index.html`: Homepage with search, category browsing, dynamic listing sections, and stats.

### Auth

- `pages/auth/signup.html`: Account registration.
- `pages/auth/login.html`: User login.
- `pages/auth/profile.html`: Profile settings and owner listing management.
- `pages/auth/activity.html`: User discussion and comment activity history.
- `pages/auth/notifications.html`: User notifications.

### Posting

- `pages/post/listing.html`: Create, edit, delete, and view owned listings.
- `pages/post/detail.html`: Direct detail page for a listing ID.

### Jobs

- `pages/jobs/jobs.html`
- `pages/jobs/tech.html`
- `pages/jobs/healthcare.html`
- `pages/jobs/insurance.html`
- `pages/jobs/cpa.html`
- `pages/jobs/legal.html`
- `pages/jobs/finance.html`
- `pages/jobs/education.html`
- `pages/jobs/student.html`
- `pages/jobs/tutoring.html`
- `pages/jobs/ai-services.html`
- `pages/jobs/immigration.html`

### Housing

- `pages/housing/housing.html`
- `pages/housing/paying-guest.html`
- `pages/housing/real-estate.html`
- `pages/housing/moving.html`

### Marketplace

- `pages/marketplace/kinbech.html`
- `pages/marketplace/services.html`
- `pages/marketplace/restaurants.html`
- `pages/marketplace/shops.html`
- `pages/marketplace/childcare.html`
- `pages/marketplace/beauty.html`
- `pages/marketplace/auto.html`
- `pages/marketplace/cleaning.html`
- `pages/marketplace/photography.html`
- `pages/marketplace/produce.html`
- `pages/marketplace/business-for-sale.html`
- `pages/marketplace/translation.html`

### Community

- `pages/community/organizations.html`
- `pages/community/discussions.html`
- `pages/community/events.html`
- `pages/community/literature.html`
- `pages/community/music.html`
- `pages/community/art.html`
- `pages/community/sports.html`
- `pages/community/yoga.html`
- `pages/community/jyotish.html`
- `pages/community/matchmaker.html`
- `pages/community/matrimony.html`
- `pages/community/pen-pals.html`
- `pages/community/travel.html`

## Setup

### Requirements

- Node.js
- npm
- MongoDB
- Modern browser

### Install Dependencies

```bash
npm install
```

### Environment Variables

Configure these environment variables:

```bash
PORT=4000
MONGODB_URI=mongodb://localhost:27017/biscoon
JWT_SECRET=<strong-random-secret>
MSG_ENCRYPTION_KEY=<strong-random-secret>
NODE_ENV=development
CORS_ORIGINS=http://localhost:4000,http://localhost:4001
UPLOAD_DIR=uploads
JSON_BODY_LIMIT=25mb
TRUST_PROXY=
```

In `production`, both `JWT_SECRET` and `MSG_ENCRYPTION_KEY` are required and the server will fail fast if they are missing.
Use `.env.example` as the deployment checklist.
See `DEPLOYMENT.md` for Docker and production hosting notes.

### Start MongoDB

Start a local MongoDB service or provide a hosted MongoDB connection string with `MONGODB_URI`.

For this project-local database folder, you can run:

```bash
npm run mongo
```

Keep that terminal open, then start the app in another terminal.

### Start the App

```bash
npm start
```

### Conversation Migration (Required After Upgrading)

Run this once after pulling the latest backend changes:

```bash
npm run migrate:conversations
```

This backfills deterministic conversation participant keys and syncs conversation indexes.

Open:

```text
http://localhost:4000/index.html
```

If port `4000` is busy, the server automatically tries the next available port, such as `4001`.

### Development Mode

```bash
npm run dev
```

This uses `nodemon` to restart the backend when files change.

### Health Check

```text
GET /api/health
```

Returns service status, uptime, and a timestamp.

### Tests

```bash
npm test
```

The test suite uses Jest, Supertest, and an in-memory MongoDB instance.

### Seed Sample Data

```bash
npm run seed
```

This resets MongoDB sample data and creates a demo user/listings.

Sample login:

```text
Email: john@example.com
Password: password123
```

## NPM Scripts

```bash
npm start                      # node server.js
npm run start:prod             # NODE_ENV=production node server.js
npm run dev                    # nodemon server.js (auto-restart on change)
npm test                       # Jest + Supertest + mongodb-memory-server
npm run check                  # npm test && node --check on all .js files
npm run seed                   # Reset sample data, create demo user + super-admin
npm run mongo                  # Start local mongod at data/mongo/ (keep terminal open)
npm run build:client:core      # Compile assets/ts/*.ts → assets/js/ with esbuild
npm run migrate:conversations  # One-time backfill of participantKey on existing conversations
```

## Upload Storage

New listing images and message attachments are written to `UPLOAD_DIR` and stored in MongoDB as paths plus metadata instead of large base64 payloads. Existing base64 data still renders for backwards compatibility. The default upload folder is `uploads/`, which is git-ignored.

## Moderation

Authenticated users can submit reports through:

```text
POST /api/moderation/reports
GET  /api/moderation/reports/mine
```

Admins can review and update report status in the admin panel and through:

```text
GET /api/admin/reports
PUT /api/admin/reports/:id/status
```

## Data Model

### User

```text
id          String, unique (uuid)
name        String, required
email       String, required, unique, lowercase
phone       String
password    String, bcrypt hash (cost 10)
role        String, enum: user | staff | sub-admin | admin | super-admin
permissions Array<String>  — granular keys for staff accounts
createdBy   String         — id of the super-admin who created staff accounts
createdAt   Date
updatedAt   Date
```

### Listing

```text
id                  String, unique
userId              String, required
title               String, required
description         String, required (max 5000 chars)
category            String, required
subcategory         String
availability        String
price               String
priceNote           String
location            String
locationType        String
contactEmail        String
contactPhone        String
contactPreference   String
externalLink        String (http/https validated)
tags                Array<String>, max 8 tags × 40 chars
images              Array<String>, max 6 images × 3 MB (saved to disk, stored as path)
comments            Array<Comment>, max 300
createdAt           Date
updatedAt           Date
```

Indexes: `{ category, createdAt }`, `{ category, subcategory, createdAt }`, `{ userId, createdAt }`, full-text on title/description/category/location/tags.

### Discussion

```text
id          String, unique
userId      String, required
authorName  String, required
title       String, required
body        String, required (max 5000 chars)
category    String, indexed
tags        Array<String>, max 8
comments    Array<Comment>, max 300
createdAt   Date, indexed
updatedAt   Date
```

Full-text index on title/body/category/tags.

### Conversation

```text
id               String, unique
listingId        String, required
listingTitle     String
participantKey   String, indexed (sorted user-id pair, e.g. "uuid1:uuid2")
participantIds   Array<String>
participantNames Map<userId, name>
messages         Array<Message>, max 200
updatedAt        Date
createdAt        Date
```

Unique compound index on `{ listingId, participantKey }` prevents duplicate threads.

#### Embedded Message

```text
id          String
senderId    String
senderName  String
body        String (AES-256-GCM encrypted; falls back gracefully for pre-encryption data)
attachments Array<Attachment>  — images (4 MB), video (12 MB), docs/files (6 MB), max 5
readBy      Array<String>      — user IDs who have opened this message
createdAt   Date
```

### Notification

```text
id            String, unique
userId        String, indexed
actorId       String
actorName     String
type          String
title         String
body          String
targetType    String
targetId      String
targetTitle   String
url           String
read          Boolean, indexed
createdAt     Date, indexed
```

Compound indexes: `{ userId, createdAt }` (inbox), `{ userId, read }` (unread count).

### Announcement

```text
id          String, unique
title       String, required
body        String, required
type        String, enum: info | warning | success
active      Boolean
expiresAt   Date (null = no expiry)
createdBy   String
createdAt   Date
```

### Report

```text
id            String, unique
reporterId    String, indexed
reporterName  String
targetType    String, enum: listing | discussion | listing_comment | discussion_comment | message | user
targetId      String, indexed
parentId      String (parent listing/discussion id for comment reports)
reason        String, enum: spam | scam | harassment | illegal | misinformation | other
details       String (max 1000 chars)
status        String, enum: open | reviewing | resolved | dismissed
reviewedBy    String
reviewedAt    Date
createdAt     Date, indexed
updatedAt     Date
```

## API Reference

### Auth

#### `POST /api/auth/register`

Creates a new user.

Request body:

```json
{
  "name": "Anup",
  "email": "anup@example.com",
  "phone": "555-123-4567",
  "password": "password123",
  "confirmPassword": "password123"
}
```

Duplicate emails return `409`.

#### `POST /api/auth/login`

Logs in an existing regular user. Admin accounts are refused here and must use the admin login endpoint.

Request body:

```json
{
  "email": "anup@example.com",
  "password": "password123"
}
```

Returns user data and a JWT token. Tokens expire after one day.

#### `POST /api/auth/admin/login`

Logs in a super-admin or admin-user account for the admin panel. Regular users are refused here.

Request body:

```json
{
  "email": "admin@biscoon.com",
  "password": "password123"
}
```

Returns admin user data and a JWT token. Tokens expire after one day.

#### `GET /api/auth/me`

Returns the authenticated user.

Requires:

```text
Authorization: Bearer <token>
```

#### `PUT /api/auth/me`

Updates profile details and optionally password.

Requires:

```text
Authorization: Bearer <token>
```

### Listings

#### `POST /api/listings`

Creates a listing for the authenticated user.

Required fields:

```text
title
description
category
subcategory
location (regular listings only; photography defaults to Photography showcase)
```

Optional fields:

```text
availability
price
priceNote
locationType
contactEmail
contactPhone
contactPreference
externalLink
tags
images
```

Images accepts up to 6 image data URLs or image paths for regular listings. Photography posts use `category: "photography"` and accept up to 12 images; at least one image is required.

#### `GET /api/listings`

Returns listings.

Optional query parameters:

```text
category
subcategory
search
limit
```

Example:

```text
/api/listings?category=housing&subcategory=room&search=Boston&limit=20
```

#### `GET /api/listings/mine`

Returns listings owned by the authenticated user.

Requires:

```text
Authorization: Bearer <token>
```

#### `GET /api/listings/stats/summary`

Returns dynamic listing stats:

```json
{
  "total": 12,
  "today": 2,
  "week": 5,
  "cities": 4,
  "byCategory": {},
  "bySubcategory": {}
}
```

#### `GET /api/listings/:id`

Returns a single listing by public listing ID.

#### `POST /api/listings/:id/comments`

Adds a comment to a listing.

Requires:

```text
Authorization: Bearer <token>
```

Request body:

```json
{
  "body": "Is this still available?"
}
```

If the commenter is not the listing owner, the owner receives a notification. Replies inside a listing comment thread are limited to the listing owner and the original commenter.

#### `PUT /api/listings/:id`

Updates a listing owned by the authenticated user.

Requires:

```text
Authorization: Bearer <token>
```

Owners can update details, tags, contact information, and images.

#### `DELETE /api/listings/:id`

Deletes a listing owned by the authenticated user.

Requires:

```text
Authorization: Bearer <token>
```

### Discussions

#### `GET /api/discussions`

Returns discussion topics.

Optional query parameters:

```text
category
search
limit
```

#### `POST /api/discussions`

Creates a discussion topic for the authenticated user.

Requires:

```text
Authorization: Bearer <token>
```

Request body:

```json
{
  "title": "Best Nepali grocery stores in Boston?",
  "body": "Looking for recommendations near public transit.",
  "category": "general",
  "tags": "boston, grocery"
}
```

#### `GET /api/discussions/:id`

Returns one discussion topic with comments and replies.

#### `POST /api/discussions/:id/comments`

Adds a comment or reply to a discussion topic.

Requires:

```text
Authorization: Bearer <token>
```

Request body:

```json
{
  "body": "Try Somerville and Malden.",
  "parentId": ""
}
```

`parentId` is optional. When provided, the comment is treated as a reply.

Notifications are created for the discussion owner and, for replies, the parent comment author when they are different from the actor.

### Messages

#### `GET /api/messages`

Returns the authenticated user's inbox (up to 50 conversations), each with last-message preview and unread count.

Requires `Authorization: Bearer <token>`.

Response includes `unread` (total unread across all conversations) and `conversations[]`.

#### `GET /api/messages/unread`

Returns `{ unread: N }` — total unread message count. Used for the nav badge.

#### `GET /api/messages/status?listingId=&recipientId=`

Returns `{ exists: bool, conversationId: string }`. Used before starting a new thread.

#### `POST /api/messages`

Starts or continues a conversation tied to a specific listing.

Requires `Authorization: Bearer <token>`.

```json
{
  "listingId": "<id>",
  "recipientId": "<userId>",
  "body": "Is this still available?",
  "attachments": []
}
```

At least one of `body` or `attachments` is required. Returns `{ conversationId }`.

#### `GET /api/messages/:id`

Returns a conversation with paginated messages. Marks all unread messages as read.

Query params: `?limit=50&before=<messageId>` (cursor-based pagination, newest-first).

Requires `Authorization: Bearer <token>`.

#### `POST /api/messages/:id/reply`

Sends a message in an existing conversation.

Requires `Authorization: Bearer <token>`.

```json
{
  "body": "Yes, still available.",
  "attachments": []
}
```

**Attachment limits:** images 4 MB, video 12 MB, other files (PDF, docs, CSV, zip) 6 MB, max 5 per message. Accepted MIME types include `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`, `video/mp4`, `video/quicktime`, `video/webm`, `application/pdf`, Word, Excel, plain text, CSV, ZIP, RAR.

### Market

#### `GET /api/market`

Returns live market data (cached 60 seconds server-side).

```json
{
  "crypto": [{ "sym": "BTC", "price": 67000, "change": 1.23 }, ...],
  "stocks": [{ "sym": "NASDAQ", "price": 18500, "change": -0.4, "isIndex": true }, ...],
  "forex":  [{ "sym": "USD", "rate": 133.5 }, ...],
  "updatedAt": 1700000000000
}
```

Crypto source: CoinGecko. Stock source: Stooq.com. Forex source: open.er-api.com (NPR per foreign currency unit).

### Announcements

#### `GET /api/announcements/active`

Returns the newest active, non-expired site announcement (or `null`).

```json
{ "announcement": { "id": "...", "title": "...", "body": "...", "type": "info" } }
```

### News

#### `GET /api/news`

Returns published news stories. Supports pagination, category filtering, and search.

Optional query parameters:

```text
page
limit
category
search
```

#### `GET /api/news/:slug`

Returns one published news article by slug.

### Moderation

#### `POST /api/moderation/reports`

Submits a moderation report. Requires `Authorization: Bearer <token>`.

```json
{
  "targetType": "listing",
  "targetId": "<listingId>",
  "parentId": "",
  "reason": "spam",
  "details": "This looks like a scam."
}
```

#### `GET /api/moderation/reports/mine`

Returns the authenticated user's own reports (paginated).

### Admin

All admin endpoints require `Authorization: Bearer <token>` plus an admin role. Specific endpoints additionally require the matching permission key.

#### `GET /api/admin/stats`

Dashboard analytics: user counts (today/week/month), listing counts, discussion counts, conversation count, by-category breakdown, recent users, recent listings.

Permission-gated: fields are zeroed out for permissions the caller lacks.

#### `GET /api/admin/feed`

Activity feed: last 10 users, listings, and discussions merged and sorted by date. Returns up to 20 items.

#### Users (`users` permission)

```
GET    /api/admin/users              — paginated list with listing counts; ?search=
DELETE /api/admin/users/:id          — deletes user and all their listings
GET    /api/admin/users/:id/content  — user's listings and discussions
```

#### Staff (super-admin only)

```
GET    /api/admin/staff/permissions — list all assignable permission keys
GET    /api/admin/staff             — paginated staff list
GET    /api/admin/staff/:id
POST   /api/admin/staff             — create staff account with role and permissions
PUT    /api/admin/staff/:id         — update name/email/phone/permissions/password
DELETE /api/admin/staff/:id         — delete (cannot delete super-admins or yourself)
```

#### News (`news` permission)

```
GET    /api/admin/news              — paginated; ?search=&status=&category=
GET    /api/admin/news/:id          — includes full body and media
POST   /api/admin/news              — create draft or published story
PUT    /api/admin/news/:id          — update story, rich body, media, status, featured flag
DELETE /api/admin/news/:id
```

#### Listings (`listings` permission)

```
GET    /api/admin/listings           — paginated; ?search=&category=
GET    /api/admin/listings/:id
PUT    /api/admin/listings/:id       — editable fields: title, description, category, etc.
DELETE /api/admin/listings/:id
```

#### Discussions (`discussions` permission)

```
GET    /api/admin/discussions
POST   /api/admin/discussions       — create a discussion as the signed-in admin
GET    /api/admin/discussions/:id    — includes all comments
PUT    /api/admin/discussions/:id
DELETE /api/admin/discussions/:id
```

#### Comments (`comments` permission)

```
GET    /api/admin/comments           — all listing + discussion comments; ?type=listing|discussion|all
DELETE /api/admin/listings/:listingId/comments/:commentId
DELETE /api/admin/discussions/:discussionId/comments/:commentId
```

#### Conversations (`users` permission, metadata only)

```
GET    /api/admin/conversations      — participant names, listing, message count; no message bodies
```

#### Reports (`reports` permission)

```
GET    /api/admin/reports            — paginated; ?status=open|reviewing|resolved|dismissed
PUT    /api/admin/reports/:id/status — update status; body: { "status": "resolved" }
```

#### Announcements (`announcements` permission)

```
GET    /api/admin/announcements
POST   /api/admin/announcements      — body: { title, body, type, expiresAt }
PUT    /api/admin/announcements/:id/toggle — flip active/inactive
DELETE /api/admin/announcements/:id
```

### System

#### `GET /api/health`

Returns service name, environment, uptime, database state, and timestamp.

#### `GET /api/ready`

Returns 200 when MongoDB is connected, 503 otherwise. Suitable for Docker/K8s readiness probes.

---

### Notifications

#### `GET /api/notifications`

Returns notifications for the authenticated user and unread count.

Requires:

```text
Authorization: Bearer <token>
```

#### `PUT /api/notifications/:id/read`

Marks one notification as read.

Requires:

```text
Authorization: Bearer <token>
```

#### `PUT /api/notifications/read-all`

Marks all notifications as read for the authenticated user.

Requires:

```text
Authorization: Bearer <token>
```

### Activity

#### `GET /api/activity/mine`

Returns activity for the authenticated user.

Requires:

```text
Authorization: Bearer <token>
```

Included activity:

```text
discussion_topic
discussion_comment
discussion_reply
listing_comment
listing_reply
```

Listings posted by the user are not included.

## Frontend Behavior

### Authentication UI

`assets/js/biscoon.js` checks local login state and updates:

- Desktop navigation
- Mobile drawer
- User dropdown
- My Activity and Notifications dropdown links
- Notification unread badges
- Post listing redirects
- Protected listing actions
- One-day inactivity logout

### Listing Cards

Listing cards show:

- Thumbnail image or default category visual
- Title
- Location
- Posted date
- Contact email when available
- Category/subcategory tags
- Availability tags
- Price/rate

Clicking a dynamic listing opens a popup instead of navigating away.

Listing detail views also support authenticated comments. Commenting on someone else's listing creates a notification for the listing owner.

### Discussions UI

The discussion page displays topics first. Logged-in users can click Create Discussion to open a modal. Logged-out users see sign-in prompts for creating topics, comments, and replies.

### Notifications UI

The notifications page shows unread and read notifications. Clicking a notification marks it read and opens the related listing or discussion.

### My Activity UI

The activity page filters user activity by discussion posts, discussion comments, discussion replies, and listing comments.

### Profile Listings

The profile page renders owner listing cards. Clicking a card opens a popup with:

- Full listing details
- Image gallery
- Contact actions
- Edit listing action

Editing happens in the same popup.

### Posting Page Listings

The posting page also shows the current user's listings and supports:

- Create listing
- Edit listing
- Delete listing
- Image preview
- Multiple image upload
- Remove images before saving

## CSS and HTML Cleanliness

The project intentionally avoids inline CSS in HTML.

To check for inline styles:

```bash
rg "<style|style=\"" -g "*.html"
```

To extract inline CSS if it appears again:

```bash
node scripts/extract-page-css.js
```

## Validation and Checks

Run the full suite (tests + syntax check on every JS file):

```bash
npm run check
```

Or check individual files:

```bash
node --check server.js
node --check src/app.js
node --check src/routes/auth.js
node --check src/routes/listings.js
node --check src/routes/discussions.js
node --check src/routes/messages.js
node --check src/routes/notifications.js
node --check src/routes/activity.js
node --check src/routes/admin.js
node --check src/routes/market.js
node --check src/routes/moderation.js
node --check src/routes/announcements.js
node --check assets/js/biscoon.js
node --check assets/js/auth.js
node --check assets/js/activity.js
node --check assets/js/discussions.js
node --check assets/js/listing.js
node --check assets/js/messages.js
node --check assets/js/notifications.js
node --check assets/js/profile.js
node --check assets/js/admin.js
node --check assets/js/ticker.js
node --check scripts/extract-page-css.js
```

## Troubleshooting

### Port Already in Use

If port `4000` is busy, the server tries the next available port automatically.

To see what is using a port:

```bash
lsof -nP -iTCP:4000 -sTCP:LISTEN
```

To stop a process:

```bash
kill <PID>
```

### MongoDB Connection Error

Make sure MongoDB is running, or set:

```bash
MONGODB_URI=<your connection string>
```

### Login Issues

- Confirm the backend is running.
- Confirm MongoDB is running.
- Clear old browser local storage if token data is stale.
- Sessions expire after one day of inactivity.
- Use the seeded account after `npm run seed`.

### Images Are Too Large

Images are resized in the browser before saving. If requests are still too large, reduce image count or size. The backend JSON limit defaults to `25mb` and is controlled by the `JSON_BODY_LIMIT` environment variable (configured in `src/config/env.js`).

## Development Notes

- Do not commit local database files or private `.env` files.
- Keep global styles in `assets/css/main.css`.
- Keep page-only styles in `assets/css/pages/`.
- Keep shared frontend behavior in `assets/js/biscoon.js`.
- Keep page-specific frontend behavior in `auth.js`, `activity.js`, `discussions.js`, `listing.js`, `notifications.js`, or `profile.js`.
- Add new backend routes under `src/routes/`.
- Add new schemas under `src/models/`.

## Target Audience

- Nepali immigrants in the United States
- Nepali-owned businesses
- Students and professionals
- People seeking jobs, housing, roommates, or services
- Community organizers and cultural groups

## License

This project is currently private/internal unless a license is added.

---

Built for the Nepali community.
