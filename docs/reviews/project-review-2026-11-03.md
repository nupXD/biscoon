# Biscoon project review — November 3, 2026

The project has a working application and useful automated coverage, but account recovery has a confirmed production security defect that should be fixed before launch. Publishing reliability and dependency updates come next, followed by accessibility, performance, and shared UI structure.

This review covers the current working tree, including the recent news changes. It is a source/configuration review with automated checks and targeted local reproductions, not a complete penetration test or browser/device audit. No application fixes or dependency upgrades were made during this review. Existing local changes were preserved.

## Verification

- `npm run check`: **62 tests passed in four suites**, server/client typechecks passed, client build passed. The first sandboxed attempt could not bind MongoDB sockets; rerunning with permission passed.
- `npm run build`: production TypeScript compilation checked separately.
- Local `/api/ready`: database connected, service ready.
- Scanned **1,456 local href/src references** in the homepage and public/admin HTML, accounting for configured legacy redirects: **zero missing local targets**. This does not validate external websites, runtime-generated URLs, or fragment IDs.
- `npm audit --omit=dev`: **45 package findings: 2 critical, 13 high, 29 moderate, 1 low**. These counts include transitive/advisory propagation and are not 45 proven exploitable application flaws. Saved summary: [dependency audit](dependency-audit-2026-11-03.json).
- No browser automation was available in this session. Visual quality, keyboard behavior on real devices, Core Web Vitals, and real email delivery remain unverified. Docker deployment, backup restoration, and production infrastructure were not exercised.

## Fix before public deployment

### 1. Critical — password-reset tokens can be exposed in production

**Evidence:** `src/routes/auth.ts:73` and `src/routes/auth.ts:301`.

`accountActionPayload` suppresses tokens in production only when `includeLink` is false. The forgot-password endpoint passes `!emailSent`. Missing SMTP or a delivery error therefore puts a usable reset token and URL in the unauthenticated response. The same mechanism exposes email-verification tokens. This could allow account takeover without access to the account's mailbox when delivery fails.

**Reproduction:** executed the actual helper with `isProduction=true`, synthetic values, and the SMTP-failure flag; `returnsResetToken` was true. No account or live reset was used.

**Fix:** never return action tokens in production, regardless of delivery state. Return a generic response, record a non-secret delivery error, and retry mail separately. Add tests for SMTP success, missing configuration, false return, and thrown delivery errors. Existing coverage at `tests/security-regressions.test.js:150` checks only successful delivery.

### 2. High — production mail tokens are also written to disk/logs

**Evidence:** `src/services/mail.ts:44`, `src/services/mail.ts:72`.

The outbox is disabled only in tests, so production writes complete emails containing action links to disk. When SMTP is missing, it logs the message text too. These files are not publicly served by the app, but the unnecessary secret copies increase exposure through logs, backups, or host access.

**Fix:** restrict the development outbox and token-bearing logs to explicit development mode. Redact tokens and email addresses from operational logs as appropriate; add retention rules and mail-delivery monitoring.

### 3. High — update vulnerable production dependencies

**Evidence:** `package-lock.json`; saved audit JSON.

Audit reports critical package entries for `maplibre-gl` and `proxy-addr`, plus high entries including TipTap core, compression, Nodemailer, Sharp, Socket.IO parser, and Zod. Exploitability varies by feature and configuration; do not equate package severity with a demonstrated exploit here. For example, the proxy-addr advisory depends on particular trust-subnet configurations, which were not established in this app.

**Fix:** update compatible patch/minor dependencies first; review major-version changes separately, rebuild generated/vendor assets, and rerun API, editor, upload, and real-time tests. Do not blindly use `npm audit fix --force`. Add recurring advisory scanning in CI.

Sources: [proxy-addr advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [Nodemailer recipient parsing advisory](https://github.com/advisories/GHSA-cc9r-2j5m-2m83). The saved audit contains the other advisory links.

### 4. High — default proxy setting has the wrong type

**Evidence:** `src/config/env.ts:62`, `src/app.ts:42`, `docker-compose.yml`.

The default is the string `"1"`, passed unchanged to Express. It is not numeric one-hop trust. A local check of Express's trust function returned false for a loopback proxy with `"1"`, versus true with numeric `1`. Behind a reverse proxy this can misidentify client IPs and group unrelated users into the same rate-limit bucket.

**Fix:** explicitly parse supported configuration types, then choose the trust policy for the actual deployment topology. Test real forwarded-header behavior and reject spoofed headers on direct connections.

### 5. High — registration throttling can be bypassed by changing email

**Evidence:** `src/middleware/rateLimit.ts:78`, `src/middleware/rateLimit.ts:99`.

Registration uses an IP-plus-email key. New email values create new counters, so one client can keep submitting registrations while bypassing the advertised per-hour restriction. Recovery and login would also benefit from separate IP and account limits. Counters currently live in process memory, so they reset on restart and are not shared by replicas.

**Fix:** add an independent per-IP registration limit; layer account and IP limits for recovery/login. Use a shared counter store when deploying multiple instances. Test rotation of email values, not just repeated requests with the same email.

### 6. High — demo admin credentials are not restricted to development

**Evidence:** `seed.js:31`.

The seed script creates a fixed-password super-admin if that email does not exist. There is no production-mode guard. This review did not check whether any deployed database contains that account.

**Fix:** prevent demo seeding in production and provide a separate admin bootstrap command requiring explicitly supplied credentials. Review existing deployed accounts without printing their secrets. Keep sample data out of production images.

## Publishing and user experience

### 7. High — unsaved news can still be discarded

**Evidence:** `assets/ts/admin.ts:3833`, `assets/ts/admin.ts:3878`.

Backdrop dismissal was fixed, but Escape, Cancel, the close button, refresh, or leaving the page can still discard an unsaved story. No autosave or unload guard was found. The editor can also be closed while a save request is pending.

**Fix:** track dirty state, confirm deliberate discard, protect navigation, and add draft recovery. Disable dismissal during save or provide a reliable recoverable state. Add a browser test that writes text, inserts an image, attempts to leave, and confirms that the draft survives.

### 8. High — allowed media selections can exceed the request limit

**Evidence:** `assets/ts/admin.ts:4292`, `src/config/env.ts:61`, `src/routes/admin.ts:103`.

The UI accepts up to 24 media items and videos up to 18 MiB each, while all media is sent in one JSON payload capped at 25 MiB. Two individually valid 18 MiB videos become approximately **48 MiB of base64**, before JSON overhead, and cannot be saved. Automatic photo compression reduces this risk for photos but does not solve videos or mixed batches.

**Fix:** upload media individually and store references in the story payload. Until then, enforce the combined encoded request size and show a useful inline error before submitting. Add upload progress and prevent publish while media is still processing.

### 9. Medium — server silently drops media and truncates article text

**Evidence:** `src/routes/admin.ts:238`, `src/routes/admin.ts:265`.

Invalid media entries are skipped and excess items sliced away. Body HTML is truncated before and after sanitization at 20,000 characters. A user can save successfully while losing content, and truncation can cut markup. Files are written before required-field validation, leaving orphan uploads after some failed saves.

**Fix:** reject oversized/invalid content with explicit field errors, count limits in the editor, validate before storing files, and clean up abandoned uploads with a retention policy.

### 10. Medium — uploads have race conditions around editing

**Evidence:** `assets/ts/admin.ts:4292`, `assets/ts/plugins/news-editor.ts:212`.

Image conversion is asynchronous; save and other upload selections remain available while processing. Inline insertion uses the editor selection when conversion finishes, rather than a captured insertion point. Moving the cursor during processing can place images somewhere other than the original intended location. Closing/reopening the composer during processing also needs an explicit ownership/cancellation guard.

**Fix:** track an upload queue per editor instance, capture/map insertion positions, ignore results for closed editors, and lock publishing until pending media finishes. Add tests for simultaneous uploads and closing during conversion.

### 11. Medium — admin dialogs need keyboard and form-accessibility work

**Evidence:** `assets/ts/admin.ts:3840`, `pages/news/index.html:116`, `pages/community/discussions.html:140`.

The general admin modal has no accessible title association, focus trap, initial focus, or restoration behavior. Its × button has no accessible label. News and discussion search inputs lack explicit labels. The newer full-story preview uses a native dialog, which is a better starting point than the general modal.

**Fix:** consolidate dialog behavior with native dialog or an equivalent accessible component, label controls, associate errors with fields, and focus the first invalid field. Verify keyboard-only use and screen-reader announcements. Review benchmark: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).

## Performance, discoverability, and maintainability

### 12. Medium — article metadata is generic in the initial response

**Evidence:** `pages/news/article.html:8`, `assets/js/news.js:208`, `sitemap.xml:11`.

Every article URL initially serves the same title, canonical URL, description, and share image. JavaScript changes some metadata after fetching the article, but the HTML response itself has no story-specific metadata. The sitemap includes the news index, not individual published stories.

**Fix:** render published article metadata server-side, include the cover image and article structured data, and generate sitemap entries from published stories. Preserve 404 behavior and keep drafts excluded. Verify share previews and canonical URLs for two distinct stories.

### 13. Medium — stale frontend assets can survive deployment

**Evidence:** `src/app.ts:33`, `src/app.ts:122`, script references in public HTML.

Production assets and `/pages` HTML receive a one-day cache lifetime, but filenames such as `admin.js` and `news.js` do not change with content. Clients can retain old JavaScript after a deployment, which is especially problematic when form behavior or API expectations change.

**Fix:** fingerprint built assets and allow long immutable caching only for those files; revalidate HTML. Test an upgrade with an existing browser cache.

### 14. Medium — several queries do more work than the UI needs

**Evidence:** `src/routes/admin.ts:1121`, `src/routes/news.ts:30`, `src/utils/news.ts:34`, `src/routes/weather.ts:97`.

Comment moderation loads all comments from listings and discussions, sorts/filter them in Node, and only then paginates. News list queries load complete documents, and normalized list results include all inline media. Weather requests have no route-level cache or limiter. These are code-level scaling candidates; no production latency or load measurements were available.

**Fix:** paginate/filter comments in MongoDB, project only feed fields for news lists, and cache/coalesce weather calls with bounded keys and expiration. Measure query plans, response sizes, and timings before larger changes.

### 15. Medium — split large scripts and close typecheck gaps

**Evidence:** `assets/ts/admin.ts` (4,344 lines), `assets/ts/biscoon.ts` (3,594 lines), `assets/js/news.js`, `tsconfig.client.json`.

Admin and public behavior are concentrated in large scripts. The standalone news JavaScript is outside the TypeScript client include path. Both strictness and implicit-any checking are disabled. The admin dashboard loads the roughly 368 KiB minified editor plugin even before a user opens news editing; this size is uncompressed, not a measured network transfer.

**Fix:** separate news, accounts, listings, and messaging modules; migrate the news script into the build/typecheck pipeline; introduce stricter types incrementally. Load the rich editor only when needed. Keep generated assets reproducible rather than editing them directly.

### 16. Medium — add real browser workflow coverage

**Evidence:** `jest.config.cjs`, `tests/frontend-regressions.test.js`, `.github/workflows/check.yml`.

The existing tests are valuable, but frontend tests largely inspect strings or mocked DOM behavior. They do not verify actual focus, layout, media editing, image decoding, or navigation. The mail-failure issue demonstrates a concrete missing failure-path test despite a passing suite.

**Fix:** add browser tests for signup/verification, login, listing posting, news draft → preview → publish, multiple inline images, public article navigation, messaging, and small-screen navigation. Include keyboard interaction and failed network requests. Align CI's Node 20 and Docker's Node 22 or explicitly test both supported runtimes.

### 17. Medium — tighten deployment and operational safeguards

**Evidence:** `Dockerfile`, `docker-compose.yml`, `src/app.ts:172`, `DEPLOYMENT.md`.

The runtime image has no non-root `USER`. The generic error handler returns internal exception messages. Compose omits `SMTP_SECURE`, even though application configuration supports it. Persistent volumes exist, but backup restoration was not verified during this review.

**Fix:** run with a non-root account and explicit upload-directory ownership; return safe public errors with internal correlation IDs; pass all documented mail options; verify HTTPS/base URL and real SMTP delivery; document and test database/upload restore together. Add alerts for database readiness, mail failures, elevated errors, and disk growth.

## Recommended sequence

| Order | Work | Completion evidence |
| --- | --- | --- |
| 1 | Recovery-token leak, production mail logging, proxy parsing, registration limits, seed guard | Regression tests for each failure path; production-like configuration verified |
| 2 | Dependency patches and lockfile review | Audit findings triaged, checks pass, editor/uploads/messages exercised |
| 3 | Draft protection and upload lifecycle | Draft survives navigation; batches save reliably; no late uploads alter another editor |
| 4 | Accessible dialogs and form feedback | Keyboard/mobile browser tests and a manual screen-reader pass |
| 5 | Article metadata and cache-safe deployments | Correct initial HTML/share cards and fresh assets after deployment |
| 6 | Query improvements, module extraction, operational hardening | Before/after measurements, stable builds, successful restore drill |

Retain the existing strengths: scoped static serving, private attachment authorization, session revocation, permission-gated administration, server-side listing pagination/sorting, production secret checks, health/readiness endpoints, and the existing automated checks.

## Follow-up: critical fixes implemented

The initial findings above are preserved as the audit snapshot. Subsequent changes now:

- Suppress reset/verification tokens and action URLs in production for registration, resend verification, authenticated verification requests, and password recovery, regardless of SMTP success or failure.
- Restrict token-bearing mail outbox files and fallback message logging to development.
- Upgrade MapLibre to 6.16.0 and proxy-addr to 2.0.8. Adapt the map import to named exports and serve the separately shipped module worker from the same origin.
- Add production mail-success, missing-SMTP, and failed-SMTP regression cases, plus development fallback and map-worker integration coverage.
- Fresh production dependency audit: **0 critical**, 13 high, 29 moderate, 1 low (43 package findings). See [updated audit](dependency-audit-after-critical-fixes-2026-11-03.json). Other findings remain open.

These are local changes, not a production deployment. Existing deployed reset tokens, historical logs/outbox files, and active sessions were not modified. If the vulnerable recovery flow was publicly exposed, review the affected period and consider revoking outstanding recovery tokens and affected sessions during rollout.

Validation after the fixes: all 79 regression cases passed across the full-suite run and the corrected frontend-test rerun; both typechecks, server build, and client build passed. The new map worker returned HTTP 200 with a JavaScript content type. CI now uses Node 22, matching Docker and the updated map dependency requirements. Real-browser WebGL rendering and production deployment remain unverified.

## Follow-up: high-priority fixes implemented

All high-priority items identified in this review now have local fixes:

- **#2 mail handling:** production outbox/token logs disabled in the prior critical-fix pass.
- **#3 dependencies:** compatible security updates plus coordinated TipTap 3.32.2 and Nodemailer 10.3.1 upgrades. Production audit: **0 critical / 0 high / 3 moderate**. Including development dependencies: **0 critical / 0 high / 20 moderate / 3 low**. See [updated audit](dependency-audit-after-high-fixes-2026-11-03.json).
- **#4 proxy settings:** explicit parser handles numeric hop counts and trusted-address lists; direct deployments default to no trust. Compose no longer assumes a trusted proxy. Forwarded-header tests cover direct and explicitly trusted connections.
- **#5 registration:** per-IP registration limits plus a separate IP budget for authentication/recovery prevent changing emails from resetting the IP limit. Raw forwarded headers are not used as a fallback key.
- **#6 seeding:** production seed execution exits before database access; the runtime image excludes the seed script. The new compiled `bootstrap:admin` command requires explicit credentials and refuses to overwrite existing accounts.
- **#7 draft protection:** tab-local draft backup/restore, dirty-work close confirmation, unload protection, and upload/save dismissal locks. Completed media references are recovered with the text.
- **#8 upload limits:** media is uploaded individually behind admin/news permission checks; story saves contain references. The UI reads the configured server request limit, checks encoded payload size, and blocks save while uploading. A regression case verifies two videos whose combined base64 would exceed 25 MiB can upload separately and publish together.

Validation: **92 tests passed**, both typechecks, production server build, client build, and diff checks passed. The test runner now transforms the patched sanitizer's ESM parser dependencies; supported runtime is Node >=22.12.0. Nodemailer compatibility was tested with an in-memory stream transport, without sending email.

Remaining limits: browser/WebGL and real SMTP checks were not performed; changes are not deployed. Draft recovery is per browser tab, not a cross-device server autosave; storage failures are surfaced. Rate limiting remains process-local, so multi-replica hosting needs a shared application/edge limiter. Media cleanup and other medium-priority findings remain open. Historical deployed tokens/logs/accounts were not altered.
