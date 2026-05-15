# Biscoon - Nepali Community Marketplace

Biscoon is a dynamic community marketplace for Nepalis in the United States. It brings together listings for jobs, housing, paying guests, services, shops, restaurants, events, community organizations, and cultural connections in one searchable platform.

The project is built as a static HTML/CSS/JavaScript frontend served by an Express backend, with MongoDB/Mongoose for user accounts and live listing data.

## Project Goals

- Help Nepali community members find relevant listings by category, location, and search terms.
- Allow registered users to create, edit, delete, and manage their own listings.
- Keep users logged in across all pages and hide sign-in/sign-up actions once authenticated.
- Make listings dynamic across the homepage, category pages, search results, profile, and post pages.
- Keep the codebase readable by separating global CSS, page CSS, JavaScript, routes, models, and helpers.

## Main Features

### Authentication

- User signup and login with JWT authentication.
- Duplicate email validation prevents the same email from registering more than once.
- Login state is persisted in `localStorage`.
- Logged-in users see profile/add-listing/logout dropdowns across pages.
- Logged-out users are redirected to login before creating or managing listings.

### Dynamic Listings

- Listings are stored in MongoDB.
- Homepage and category pages can render live listing data.
- Search supports keywords and category filtering.
- Browse/load-more actions preserve the selected category or subcategory.
- Listing cards open detail popups instead of redirecting away.
- Detail pages still exist for direct listing URLs.

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
│       ├── biscoon.js
│       ├── listing.js
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
- `src/routes/auth.js`: Register, login, and profile API routes.
- `src/routes/listings.js`: Listing CRUD, search, owner listings, and stats routes.
- `src/middleware/auth.js`: JWT auth middleware.
- `src/utils/users.js`: User lookup helpers.
- `src/utils/listings.js`: Listing lookup and normalization helpers.
- `assets/js/auth.js`: Signup/login frontend logic.
- `assets/js/biscoon.js`: Shared page behavior, login UI, search, dynamic listings, listing popups, and stats.
- `assets/js/listing.js`: Post listing page logic, image upload/editing, create/update/delete.
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

### Posting

- `pages/post/listing.html`: Create, edit, delete, and view owned listings.
- `pages/post/detail.html`: Direct detail page for a listing ID.

### Jobs

- `pages/jobs/jobs.html`
- `pages/jobs/rojgar.html`
- `pages/jobs/tech.html`
- `pages/jobs/healthcare.html`
- `pages/jobs/insurance.html`
- `pages/jobs/cpa.html`
- `pages/jobs/legal.html`
- `pages/jobs/finance.html`
- `pages/jobs/education.html`
- `pages/jobs/student.html`
- `pages/jobs/students.html`
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
```

For production, set a strong `JWT_SECRET`.

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
createdAt           Date, indexed
updatedAt           Date
```

Listings have a text index across title, description, category, location, and related searchable fields.

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

Returns user data and JWT token.

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

## Frontend Behavior

### Authentication UI

`assets/js/biscoon.js` checks local login state and updates:

- Desktop navigation
- Mobile drawer
- User dropdown
- Post listing redirects
- Protected listing actions

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
node --check assets/js/listing.js
node --check assets/js/profile.js
node --check src/routes/auth.js
node --check src/routes/listings.js
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
- Use the seeded account after `npm run seed`.

### Images Are Too Large

Images are resized in the browser before saving. If requests are still too large, reduce image count or size. The backend JSON limit is configured in `server.js`.

## Development Notes

- Do not commit local database files or private `.env` files.
- Keep global styles in `assets/css/main.css`.
- Keep page-only styles in `assets/css/pages/`.
- Keep shared frontend behavior in `assets/js/biscoon.js`.
- Keep page-specific frontend behavior in `auth.js`, `listing.js`, or `profile.js`.
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
