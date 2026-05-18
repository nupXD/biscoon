# Biscoon - Nepali Community Marketplace

Biscoon is a dynamic community marketplace for Nepalis in the United States. It brings together listings for jobs, housing, paying guests, services, shops, restaurants, events, community organizations, and cultural connections in one searchable platform.

The project is built as a static HTML/CSS/JavaScript frontend served by an Express backend, with MongoDB/Mongoose for user accounts, live listing data, discussion topics, notifications, activity history, private messaging, and a super-admin panel.

## Project Goals

- Help Nepali community members find relevant listings by category, location, and search terms.
- Allow registered users to create, edit, delete, and manage their own listings.
- Keep users logged in across all pages, expire inactive sessions after one day, and hide sign-in/sign-up actions once authenticated.
- Make listings dynamic across the homepage, category pages, search results, profile, and post pages.
- Support discussion topics, comments, replies, notifications, and user activity history.
- Keep the codebase readable by separating global CSS, page CSS, JavaScript, routes, models, and helpers.
- Provide a super-admin panel so platform operators can monitor analytics and manage all content.

## Main Features

### Authentication

- User signup and login with JWT authentication.
- Duplicate email validation prevents the same email from registering more than once.
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
- Contact email and phone
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

**Access:** Only users with `role: "admin"` in the database can access the panel. Regular users see a 403 error.

**Dashboard — Analytics:**
- Total users, listings, discussions, and active conversation threads.
- Growth metrics: new users and listings posted today, this week, and this month.
- Listings broken down by category.
- Recent users and recent listings tables.

**Users section:**
- Paginated list of all registered users with name, email, phone, role, listing count, and join date.
- Live search by name or email.
- Promote any user to admin or demote back to user.
- Delete a user (removes their listings too). Admins cannot delete themselves.

**Listings section:**
- Paginated list of all listings across all users.
- Filter by category and search by keyword.
- Delete any listing.

**Discussions section:**
- Paginated list of all discussion topics with author, category, and comment count.
- Delete any discussion.

**Conversations section (read-only metadata):**
- Shows who is talking, about which listing, message count, and last activity time.
- Message content is never shown — it is encrypted at rest and intentionally excluded.

**Setting up the first admin:**

Run `npm run seed` to create a ready-to-use admin account:

```text
Email:    admin@biscoon.com
Password: admin123
```

To promote an existing user manually:

```js
// In a MongoDB shell:
db.users.updateOne({ email: "your@email.com" }, { $set: { role: "admin" } })
```

### Dynamic Stats

The backend exposes listing stats used by page UI:

- Total listings
- Listings posted today
- Listings posted this week
- Cities covered
- Counts by category
- Counts by subcategory

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
│       ├── notifications.js
│       └── profile.js
├── pages/
│   ├── auth/
│   ├── community/
│   ├── housing/
│   ├── jobs/
│   ├── marketplace/
│   └── post/
├── scripts/
│   └── extract-page-css.js
└── src/
    ├── config/
    ├── middleware/
    ├── models/
    ├── routes/
    └── utils/
```

## Important Files

- `server.js`: Express app setup, static file serving, route mounting, and port fallback startup.
- `src/config/env.js`: Environment defaults for port, MongoDB URI, JWT secret, and static root.
- `src/config/database.js`: MongoDB connection setup.
- `src/models/User.js`: User schema.
- `src/models/Listing.js`: Listing schema.
- `src/models/Discussion.js`: Discussion topic and comment schema.
- `src/models/Notification.js`: User notification schema.
- `src/routes/auth.js`: Register, login, and profile API routes.
- `src/routes/listings.js`: Listing CRUD, search, owner listings, and stats routes.
- `src/routes/discussions.js`: Discussion topic, comment, and reply routes.
- `src/routes/notifications.js`: Notification listing and read-state routes.
- `src/routes/activity.js`: Authenticated user activity aggregation route.
- `src/middleware/auth.js`: JWT auth middleware.
- `src/utils/users.js`: User lookup helpers.
- `src/utils/listings.js`: Listing lookup and normalization helpers.
- `src/utils/discussions.js`: Discussion lookup and normalization helpers.
- `src/utils/notifications.js`: Notification creation and normalization helpers.
- `assets/js/activity.js`: My Activity frontend logic.
- `assets/js/auth.js`: Signup/login frontend logic.
- `assets/js/biscoon.js`: Shared page behavior, session handling, login UI, search, dynamic listings, listing popups, comments, notifications, and stats.
- `assets/js/discussions.js`: Discussion page topic/comment/reply logic.
- `assets/js/listing.js`: Post listing page logic, image upload/editing, create/update/delete.
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
```

In `production`, both `JWT_SECRET` and `MSG_ENCRYPTION_KEY` are required and the server will fail fast if they are missing.

### Start MongoDB

Start a local MongoDB service or provide a hosted MongoDB connection string with `MONGODB_URI`.

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
category            String, required, indexed
subcategory         String
availability        String
price               String
priceNote           String
location            String, indexed
locationType        String
contactEmail        String
contactPhone        String
contactPreference   String
externalLink        String
tags                Array<String>
images              Array<String>, max 6
comments            Array<Comment>
createdAt           Date, indexed
updatedAt           Date
```

Listings have a text index across title, description, category, location, and related searchable fields.

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
location
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

Images accepts up to 6 image data URLs or image paths.

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

Useful syntax checks:

```bash
node --check server.js
node --check assets/js/biscoon.js
node --check assets/js/auth.js
node --check assets/js/activity.js
node --check assets/js/discussions.js
node --check assets/js/listing.js
node --check assets/js/notifications.js
node --check assets/js/profile.js
node --check src/routes/activity.js
node --check src/routes/auth.js
node --check src/routes/discussions.js
node --check src/routes/listings.js
node --check src/routes/notifications.js
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

Images are resized in the browser before saving. If requests are still too large, reduce image count or size. The backend JSON limit is configured in `server.js`.

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
