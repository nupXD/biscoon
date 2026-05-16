# Biscoon - Nepali Community Marketplace

Biscoon is a dynamic community marketplace for Nepalis in the United States. It brings together listings for jobs, housing, paying guests, services, shops, restaurants, events, community organizations, and cultural connections in one searchable platform.

The project is built as a static HTML/CSS/JavaScript frontend served by an Express backend, with MongoDB/Mongoose for user accounts, live listing data, discussion topics, notifications, activity history, and private messaging.

## Project Goals

- Help Nepali community members find relevant listings by category, location, and search terms.
- Allow registered users to create, edit, delete, and manage their own listings.
- Keep users logged in across all pages, expire inactive sessions after one day, and hide sign-in/sign-up actions once authenticated.
- Make listings dynamic across the homepage, category pages, search results, profile, and post pages.
- Support discussion topics, comments, replies, notifications, and user activity history.
- Allow users to privately message listing posters directly from the listing view.
- Keep the codebase readable by separating global CSS, page CSS, JavaScript, routes, models, and helpers.

## Main Features

### Authentication

- User signup and login with JWT authentication.
- Duplicate email validation prevents the same email from registering more than once.
- Login state is persisted in `localStorage` with an inactivity timestamp.
- Sessions expire after one day of inactivity, matching the one-day JWT expiry.
- Logged-in users see profile, activity, notifications, messages, add-listing, create-discussion, and logout dropdowns across pages.
- Logged-out users are redirected to login before creating or managing listings.
- Passwords are hashed with bcryptjs (cost factor 10) and never stored in plain text.

### Dynamic Listings

- Listings are stored in MongoDB.
- Homepage and category pages render live listing data from the API.
- Static sample listing cards are replaced at runtime with loading, empty, or live listing states.
- Search supports keywords, category filtering, and discussion results.
- Browse/load-more actions preserve the selected category or subcategory.
- Category filter chips are rebuilt from live listing subcategories.
- Listing cards open detail popups instead of redirecting away.
- Detail pages still exist for direct listing URLs.
- Listing detail views show the poster's name and post date.
- Listing detail views support authenticated comments and private messaging.

### Listing Posting

Users can create meaningful listings with:

- Category
- Specific type/subcategory
- Title/headline
- Description
- Area/city and state
- Location type
- Availability/timing
- Price/rate
- Price note
- Contact phone
- Contact preference
- External link
- Tags
- Up to 6 images

The posting form builds a searchable location string such as `Allston, MA`.

### Listing Images

- Users can upload multiple images.
- Images are resized in the browser before saving.
- Up to 6 images can be stored per listing.
- Existing images can be kept, removed, or replaced while editing.
- Listing cards show the first uploaded image.
- If no image exists, a category-based default visual is shown.
- Popups and detail pages show an image gallery, or a default image area when no images were uploaded.

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

### Private Messaging

- Any logged-in user who is not the listing owner can message the poster directly from the listing detail view or popup.
- The "Message Poster" button is the primary contact action on every listing.
- Clicking it opens a send-message modal. Unauthenticated users are redirected to login first.
- Conversations are deduplicated per listing and per pair of users. Sending a second message adds to the existing conversation.
- The messages inbox at `/pages/auth/messages.html` shows all conversations sorted by most recent, with unread counts per conversation.
- Selecting a conversation shows the full thread with chat-style bubbles (own messages in red, received in grey).
- Users can reply inline from the thread view.
- All message bodies are encrypted at rest using AES-256-GCM before being stored in MongoDB. The database never stores readable message text.
- A combined unread badge on the user dropdown button shows the total of unread notifications plus unread messages at a glance.

### Discussions

- Authenticated users can create discussion topics from the discussion page or user dropdown.
- The discussion page is optimized for browsing topics first.
- Creating a discussion opens a modal for logged-in users.
- Logged-out users are sent to login before creating topics, comments, or replies.
- Discussion topics support comments and nested replies.
- Homepage search can include discussions, and the search category dropdown can search only discussions.

### Notifications

Authenticated users receive notifications when:

- Someone comments on their discussion topic.
- Someone replies to one of their discussion comments.
- Someone comments on their listing.
- The listing owner replies to their listing comment.

The notification dropdown badge shows unread notifications. The notifications page lets users view notifications and mark them read.

### Unread Badge

The user dropdown button shows a combined red badge with the total count of unread notifications plus unread messages. Individual badges also appear next to the Notifications and Messages links inside the dropdown.

### My Activity

The activity page shows a user's:

- Discussion topics posted.
- Discussion comments.
- Discussion replies.
- Listing comments.
- Listing owner replies.

Listings posted by the user are intentionally not included in My Activity.

### Dynamic Stats

The backend exposes listing stats used by page UI:

- Total listings
- Listings posted today
- Listings posted this week
- Cities covered
- Counts by category
- Counts by subcategory

## Security

- **Passwords** are hashed with bcryptjs and never stored in plain text.
- **Messages** are encrypted at rest with AES-256-GCM. The body stored in MongoDB is a hex-encoded `iv:tag:ciphertext` string. It is only decryptable with the server's `MSG_ENCRYPTION_KEY`.
- **Sessions** are JWT tokens (1-day expiry) stored in `localStorage` with an inactivity timestamp.
- **Auth middleware** validates every protected API route.

## Technology Stack

- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Node.js built-in `crypto` (AES-256-GCM for message encryption)

## Project Structure

```text
biscoon-project/
├── index.html
├── package.json
├── package-lock.json
├── server.js
├── seed.js
├── README.md
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   └── pages/
│   │       ├── index.css
│   │       ├── auth/
│   │       ├── community/
│   │       ├── housing/
│   │       ├── jobs/
│   │       ├── marketplace/
│   │       └── post/
│   └── js/
│       ├── auth.js
│       ├── activity.js
│       ├── biscoon.js
│       ├── discussions.js
│       ├── listing.js
│       ├── messages.js
│       ├── notifications.js
│       └── profile.js
├── pages/
│   ├── auth/
│   │   ├── login.html
│   │   ├── signup.html
│   │   ├── profile.html
│   │   ├── activity.html
│   │   ├── notifications.html
│   │   └── messages.html
│   ├── community/
│   ├── housing/
│   ├── jobs/
│   ├── marketplace/
│   └── post/
├── scripts/
│   └── extract-page-css.js
└── src/
    ├── config/
    │   ├── database.js
    │   └── env.js
    ├── middleware/
    │   └── auth.js
    ├── models/
    │   ├── Conversation.js
    │   ├── Discussion.js
    │   ├── Listing.js
    │   ├── Notification.js
    │   └── User.js
    ├── routes/
    │   ├── activity.js
    │   ├── auth.js
    │   ├── discussions.js
    │   ├── listings.js
    │   ├── messages.js
    │   └── notifications.js
    └── utils/
        ├── crypto.js
        ├── discussions.js
        ├── listings.js
        ├── notifications.js
        └── users.js
```

## Important Files

- `server.js`: Express app setup, static file serving, route mounting, global error handler, and port fallback startup.
- `src/config/env.js`: Environment defaults for port, MongoDB URI, JWT secret, message encryption key, and static root.
- `src/config/database.js`: MongoDB connection with reconnection event listeners.
- `src/models/User.js`: User schema.
- `src/models/Listing.js`: Listing schema with compound indexes.
- `src/models/Discussion.js`: Discussion topic and comment schema.
- `src/models/Notification.js`: User notification schema with compound indexes.
- `src/models/Conversation.js`: Private message conversation schema with compound indexes.
- `src/routes/auth.js`: Register, login, and profile API routes.
- `src/routes/listings.js`: Listing CRUD, search, owner listings, stats, and author name lookup.
- `src/routes/discussions.js`: Discussion topic, comment, and reply routes.
- `src/routes/notifications.js`: Notification listing and read-state routes.
- `src/routes/activity.js`: Authenticated user activity aggregation route.
- `src/routes/messages.js`: Private messaging routes with AES-256-GCM encryption/decryption.
- `src/middleware/auth.js`: JWT auth middleware.
- `src/utils/users.js`: User lookup helpers.
- `src/utils/listings.js`: Listing lookup and normalization helpers.
- `src/utils/discussions.js`: Discussion lookup and normalization helpers.
- `src/utils/notifications.js`: Notification creation and normalization helpers.
- `src/utils/crypto.js`: AES-256-GCM encrypt and decrypt helpers for message bodies.
- `assets/js/activity.js`: My Activity frontend logic.
- `assets/js/auth.js`: Signup/login frontend logic.
- `assets/js/biscoon.js`: Shared page behavior, session handling, login UI, search, dynamic listings, listing popups, comments, notifications, messages badge, and stats.
- `assets/js/discussions.js`: Discussion page topic/comment/reply logic.
- `assets/js/listing.js`: Post listing page logic, image upload/editing, create/update/delete.
- `assets/js/messages.js`: Messages inbox page logic, conversation selection, reply, and send-message modal.
- `assets/js/notifications.js`: Notifications page logic.
- `assets/js/profile.js`: Profile page logic, account update, owner listing popups, and popup editing.
- `assets/css/main.css`: Global shared design system and reusable components.
- `assets/css/pages/`: Extracted page-specific CSS files.
- `scripts/extract-page-css.js`: Utility script for extracting inline/page CSS into external CSS files.

## CSS Organization

The project avoids inline CSS in HTML pages.

- Global reusable styles live in `assets/css/main.css`.
- Page-specific styles live in `assets/css/pages/`.
- Each HTML page links `main.css` first and then its own page stylesheet.
- If inline styles are introduced again, run:

```bash
node scripts/extract-page-css.js
```

This script extracts `<style>` blocks and `style="..."` attributes into matching CSS files under `assets/css/pages/`.

## Pages

### Top Level

- `index.html`: Homepage with search, category browsing, dynamic listing sections, and stats.

### Auth

- `pages/auth/signup.html`: Account registration.
- `pages/auth/login.html`: User login.
- `pages/auth/profile.html`: Profile settings and owner listing management.
- `pages/auth/activity.html`: User discussion and comment activity history.
- `pages/auth/notifications.html`: User notifications.
- `pages/auth/messages.html`: Private message inbox and conversation threads.

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

The app works with defaults, but these can be configured:

```bash
PORT=4000
MONGODB_URI=mongodb://localhost:27017/biscoon
JWT_SECRET=biscoon_dev_secret
MSG_ENCRYPTION_KEY=biscoon_msg_encryption_key_dev_32
```

For production, set strong unique values for both `JWT_SECRET` and `MSG_ENCRYPTION_KEY`. The `MSG_ENCRYPTION_KEY` is used to derive the AES-256 key that encrypts all message bodies. Changing it after messages exist will make old messages unreadable.

### Start MongoDB

Start a local MongoDB service or provide a hosted MongoDB connection string with `MONGODB_URI`.

### Start the App

```bash
npm start
```

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

```json
{
  "start": "node server.js",
  "dev": "nodemon server.js",
  "seed": "node seed.js"
}
```

## Data Model

### User

```text
id          String, unique
name        String, required
email       String, required, unique, lowercase
phone       String
password    String, bcrypt hash
createdAt   Date
```

### Listing

```text
id                  String, unique
userId              String, required
title               String, required
description         String, required
category            String, required
subcategory         String
availability        String
price               String
priceNote           String
location            String
locationType        String
contactPhone        String
contactPreference   String
externalLink        String
tags                Array<String>
images              Array<String>, max 6
comments            Array<Comment>
createdAt           Date
updatedAt           Date
```

Compound indexes: `{ category, createdAt }`, `{ category, subcategory, createdAt }`, `{ userId, createdAt }`.
Text index across title, description, category, location, and related searchable fields.

### Discussion

```text
id          String, unique
userId      String, required
authorName  String, required
title       String, required
body        String, required
category    String, indexed
tags        Array<String>
comments    Array<Comment>
createdAt   Date, indexed
updatedAt   Date
```

### Notification

```text
id            String, unique
userId        String
actorId       String
actorName     String
type          String
title         String
body          String
targetType    String
targetId      String
targetTitle   String
url           String
read          Boolean
createdAt     Date
```

Compound indexes: `{ userId, createdAt }`, `{ userId, read }`.

### Conversation

```text
id                String, unique
listingId         String, required
listingTitle      String
participantIds    Array<String>   — sorted pair of user IDs
participantNames  Map<userId, name>
messages          Array<Message>
updatedAt         Date
createdAt         Date
```

Each embedded `Message`:

```text
id          String
senderId    String
senderName  String
body        String   — AES-256-GCM encrypted ciphertext (iv:tag:ciphertext in hex)
readBy      Array<String>   — user IDs who have read this message
createdAt   Date
```

Compound indexes: `{ participantIds, updatedAt }` for inbox queries, `{ listingId, participantIds }` unique for deduplication.

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

Logs in an existing user.

Request body:

```json
{
  "email": "anup@example.com",
  "password": "password123"
}
```

Returns user data and a JWT token. Tokens expire after one day.

#### `GET /api/auth/me`

Returns the authenticated user.

Requires: `Authorization: Bearer <token>`

#### `PUT /api/auth/me`

Updates profile details and optionally password.

Requires: `Authorization: Bearer <token>`

### Listings

#### `POST /api/listings`

Creates a listing for the authenticated user.

#### `GET /api/listings`

Returns listings. Optional query parameters: `category`, `subcategory`, `search`, `limit`.

#### `GET /api/listings/mine`

Returns listings owned by the authenticated user. Requires auth.

#### `GET /api/listings/stats/summary`

Returns dynamic listing stats.

#### `GET /api/listings/:id`

Returns a single listing by public listing ID, including `authorName` from the poster's user record.

#### `POST /api/listings/:id/comments`

Adds a comment to a listing. Requires auth.

#### `PUT /api/listings/:id`

Updates a listing owned by the authenticated user. Requires auth.

#### `DELETE /api/listings/:id`

Deletes a listing owned by the authenticated user. Requires auth.

### Discussions

#### `GET /api/discussions`

Returns discussion topics. Optional: `category`, `search`, `limit`.

#### `POST /api/discussions`

Creates a discussion topic. Requires auth.

#### `GET /api/discussions/:id`

Returns one discussion with comments and replies.

#### `POST /api/discussions/:id/comments`

Adds a comment or reply. Requires auth.

### Notifications

#### `GET /api/notifications`

Returns notifications and unread count for the authenticated user.

#### `PUT /api/notifications/:id/read`

Marks one notification as read.

#### `PUT /api/notifications/read-all`

Marks all notifications as read.

### Messages

All message routes require `Authorization: Bearer <token>`.

#### `GET /api/messages`

Returns all conversations for the authenticated user, sorted by most recent. Includes unread count per conversation and a decrypted last-message preview.

#### `GET /api/messages/unread`

Returns the total unread message count across all conversations.

#### `POST /api/messages`

Starts a new message or adds to an existing conversation.

Request body:

```json
{
  "listingId": "<listing id>",
  "recipientId": "<recipient user id>",
  "body": "Hi, is this still available?"
}
```

Returns `{ conversationId }`.

#### `GET /api/messages/:id`

Returns a full conversation thread with all decrypted messages. Marks received messages as read.

#### `POST /api/messages/:id/reply`

Adds a reply to an existing conversation.

Request body:

```json
{
  "body": "Yes, still available!"
}
```

### Activity

#### `GET /api/activity/mine`

Returns activity for the authenticated user (discussion posts, comments, replies, listing comments).

## Frontend Behavior

### Authentication UI

`assets/js/biscoon.js` checks local login state and updates:

- Desktop navigation
- Mobile drawer
- User dropdown button with combined unread badge
- My Activity, Notifications, and Messages dropdown links with individual unread badges
- Post listing redirects
- Protected listing actions
- One-day inactivity logout

### Listing Cards

Listing cards show thumbnail, title, location, posted date, category tags, and price. Clicking a dynamic listing opens a popup instead of navigating away.

### Listing Detail

Listing detail views (popup and direct page) show:

- Poster's name
- Posted date
- Message Poster button (primary action for non-owners who are logged in)
- Authenticated comment section

### Private Messaging UI

- The "Message Poster" button appears on every listing for non-owners.
- Clicking it opens an inline modal to compose and send a message.
- After sending, the user is redirected to the conversation in the messages inbox.
- The inbox shows conversation cards with the other person's name, listing title, message preview, and unread badge.
- Clicking a conversation loads the full thread with chat-style bubbles.
- Users reply from the thread view.

### Discussions UI

The discussion page displays topics first. Logged-in users can click Create Discussion to open a modal.

### Notifications UI

The notifications page shows unread and read notifications. Clicking a notification marks it read and opens the related content.

### My Activity UI

Filters activity by discussion posts, discussion comments, discussion replies, and listing comments.

### Profile Listings

The profile page renders owner listing cards. Clicking a card opens a popup with full details, image gallery, edit action, and delete action.

### Posting Page Listings

Supports create, edit, delete, image preview, multiple image upload, and removing images before saving.

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

Useful syntax checks:

```bash
node --check server.js
node --check assets/js/biscoon.js
node --check assets/js/auth.js
node --check assets/js/activity.js
node --check assets/js/discussions.js
node --check assets/js/listing.js
node --check assets/js/messages.js
node --check assets/js/notifications.js
node --check assets/js/profile.js
node --check src/routes/activity.js
node --check src/routes/auth.js
node --check src/routes/discussions.js
node --check src/routes/listings.js
node --check src/routes/messages.js
node --check src/routes/notifications.js
node --check src/utils/crypto.js
node --check scripts/extract-page-css.js
```

## Troubleshooting

### Port Already in Use

If port `4000` is busy, the server tries the next available port automatically.

```bash
lsof -nP -iTCP:4000 -sTCP:LISTEN
kill <PID>
```

### MongoDB Connection Error

Make sure MongoDB is running, or set `MONGODB_URI` to a hosted connection string. The server logs reconnection attempts automatically.

### Login Issues

- Confirm the backend is running.
- Confirm MongoDB is running.
- Clear old browser local storage if token data is stale.
- Sessions expire after one day of inactivity.
- Use the seeded account after `npm run seed`.

### Images Are Too Large

Images are resized in the browser before saving. The backend JSON limit is `8mb` (configured in `server.js`).

### Messages Not Decrypting

If `MSG_ENCRYPTION_KEY` is changed after messages have been stored, existing messages will not decrypt correctly. Keep the key stable across restarts. In development the default key is used automatically.

## Development Notes

- Do not commit local database files or private `.env` files.
- Keep global styles in `assets/css/main.css`.
- Keep page-only styles in `assets/css/pages/`.
- Keep shared frontend behavior in `assets/js/biscoon.js`.
- Keep page-specific frontend behavior in dedicated JS files.
- Add new backend routes under `src/routes/`.
- Add new schemas under `src/models/`.
- Set strong `JWT_SECRET` and `MSG_ENCRYPTION_KEY` values in production.

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
