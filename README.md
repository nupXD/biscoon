# Biscoon - Nepali Community Marketplace

A dynamic marketplace platform designed for the Nepali community in the United States, providing services, jobs, housing, and community connections.

## 🌟 Overview

Biscoon is a comprehensive online marketplace that connects Nepali immigrants and businesses in the US. The platform offers categorized listings for jobs, housing, services, community events, and more, all tailored to the needs of the Nepali diaspora.

## ✨ Features

### Core Functionality
- **User Authentication**: Login and signup pages for user accounts
- **Persistent Login UI**: Logged-in users see profile/add-listing/logout dropdowns across every page
- **Duplicate Email Protection**: Registration blocks duplicate email addresses, including case-insensitive matches
- **Dynamic Listings**: Homepage, search results, and category pages can render live MongoDB listings
- **Dynamic Page Stats**: Hero stats, sidebar stats, and category counts hydrate from live listing data
- **Listing Creation**: Form-based posting system for jobs, housing, services, marketplace, and community categories
- **Specific Location Posting**: Listings collect area/city and state, then store a searchable location like `Allston, MA`
- **Listing Images**: Users can upload, preview, remove, and edit up to 6 listing images; category defaults appear when no images are uploaded
- **Listing Detail Popups**: Listing cards open detail popups with image galleries, contact actions, and owner edit controls
- **Category Organization**: Well-structured sections for different service types

### Categories Available
- **Jobs**: Employment opportunities, tutoring, healthcare, tech, finance, and more
- **Housing**: Real estate, paying guest accommodations, moving services
- **Marketplace**: Services, childcare, beauty, auto, restaurants, photography, and business sales
- **Community**: Events, matrimony, matchmaker services, sports, music, art, literature, yoga, and cultural organizations

### Technical Features
- Responsive design for mobile and desktop
- Clean, modern UI with Nepali language support
- Express-backed frontend with dynamic MongoDB data
- Organized file structure with modular CSS and JavaScript
- Page-specific CSS extracted to `assets/css/pages/` so HTML files stay readable and avoid inline CSS

## 📁 Project Structure

```
biscoon-project/
├── index.html                    # Homepage
├── assets/
│   ├── css/
│   │   ├── main.css             # Global shared stylesheet
│   │   └── pages/               # Page-specific extracted stylesheets
│   └── js/
│       ├── auth.js              # Login/signup handlers
│       ├── biscoon.js           # Shared navigation, auth UI, search, dynamic listings
│       ├── listing.js           # Listing create/edit page handlers
│       └── profile.js           # Profile and my-listings handlers
├── src/
│   ├── config/                  # Environment and database connection
│   ├── middleware/              # Express middleware
│   ├── models/                  # Mongoose models
│   ├── routes/                  # API route modules
│   └── utils/                   # Shared backend helpers
├── server.js                    # Express app wiring and startup
├── seed.js                      # Optional sample MongoDB seed data
├── scripts/
│   └── extract-page-css.js      # Helper to extract inline/page CSS into assets/css/pages
└── pages/
    ├── auth/
    │   ├── login.html           # User login page
    │   └── signup.html          # User registration page
    ├── post/
    │   └── listing.html         # Create new listing page
    ├── community/
    │   ├── art.html
    │   ├── events.html
    │   ├── jyotish.html
    │   ├── literature.html
    │   ├── matchmaker.html
    │   ├── matrimony.html
    │   ├── music.html
    │   ├── organizations.html
    │   ├── pen-pals.html
    │   ├── sports.html
    │   ├── travel.html
    │   └── yoga.html
    ├── housing/
    │   ├── housing.html
    │   ├── moving.html
    │   ├── paying-guest.html
    │   └── real-estate.html
    ├── jobs/
    │   ├── ai-services.html
    │   ├── cpa.html
    │   ├── education.html
    │   ├── finance.html
    │   ├── healthcare.html
    │   ├── immigration.html
    │   ├── insurance.html
    │   ├── jobs.html
    │   ├── legal.html
    │   ├── rojgar.html
    │   ├── student.html
    │   ├── students.html
    │   ├── tech.html
    │   └── tutoring.html
    └── marketplace/
        ├── auto.html
        ├── beauty.html
        ├── business-for-sale.html
        ├── childcare.html
        ├── cleaning.html
        ├── kinbech.html
        ├── photography.html
        ├── produce.html
        ├── restaurants.html
        ├── services.html
        ├── shops.html
        └── translation.html
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js and npm for the backend
- MongoDB running locally, or a hosted MongoDB connection string

### Installation
1. Clone or download the project files
2. Install dependencies with `npm install`
3. Start MongoDB locally or set `MONGODB_URI`
4. Start the server with `npm start`
5. Open `http://localhost:4000/index.html`

### Development
- Edit HTML files in the `pages/` directory
- Modify global styles in `assets/css/main.css`
- Modify page-specific styles in `assets/css/pages/`
- Run `node scripts/extract-page-css.js` if inline/page CSS needs to be extracted again
- Update JavaScript in `assets/js/biscoon.js`
- Add backend API routes in `src/routes/`
- Add Mongoose schemas in `src/models/`

### Running the backend
1. Install dependencies with `npm install`
2. Make sure MongoDB is running
3. Optionally set environment variables:
   - `PORT` defaults to `4000`
   - `MONGODB_URI` defaults to `mongodb://localhost:27017/biscoon`
   - `JWT_SECRET` defaults to a development-only secret
4. Start the server with `npm start`
5. Open the site through `http://localhost:4000/index.html`

If port `4000` is already in use, the server automatically tries the next available port, such as `4001`.

### Optional sample data
Run `npm run seed` to reset MongoDB and create one sample user plus sample listings.

Sample login:
- Email: `john@example.com`
- Password: `password123`

### Backend and database
- The backend is built with `Express.js` in `server.js` and route/model modules in `src/`
- User authentication and listing persistence are stored in MongoDB through Mongoose
- The default database is `biscoon` at `mongodb://localhost:27017/biscoon`
- Collections and indexes are created by Mongoose when the server starts and data is written

### MongoDB collections
- `users`
  - `id` String, unique
  - `name` String, required
  - `email` String, required, unique, lowercase
  - `phone` String
  - `password` String, required, bcrypt hash
  - `createdAt` Date
- `listings`
  - `id` String, unique
  - `userId` String, required
  - `title` String, required
  - `description` String, required
  - `category` String, required, indexed
  - `subcategory` String
  - `availability` String
  - `price` String
  - `priceNote` String
  - `location` String, indexed
  - `locationType` String
  - `contactEmail` String
  - `contactPhone` String
  - `contactPreference` String
  - `externalLink` String
  - `tags` Array of strings
  - `images` Array of strings, up to 6 browser-readable image data URLs or image paths
  - `createdAt` Date, indexed
  - `updatedAt` Date
  - Text index across `title`, `description`, `category`, `subcategory`, `availability`, `location`, and `tags`

### API endpoints
- `POST /api/auth/register`
  - Register a new user
  - Request body: `name`, `email`, `phone`, `password`, `confirmPassword`
  - Response: user data and JWT token
  - Duplicate emails return `409` with `An account with this email already exists.`
- `POST /api/auth/login`
  - Login with existing user credentials
  - Request body: `email`, `password`
  - Response: user data and JWT token
- `GET /api/auth/me`
  - Returns current authenticated user
  - Requires `Authorization: Bearer <token>` header
- `POST /api/listings`
  - Create a new listing for the authenticated user
  - Request body: `title`, `description`, `category`, `subcategory`, `location`, and optionally `availability`, `price`, `priceNote`, `locationType`, `contactEmail`, `contactPhone`, `contactPreference`, `externalLink`, `tags`, `images`
  - The posting form builds `location` from area/city and state fields
  - `images` accepts up to 6 uploaded image data URLs or image paths
- `GET /api/listings`
  - Retrieve all listings
  - Optional query: `?category=<category>&subcategory=<subcategory>&search=<term>&limit=<number>`
  - Category values line up with page slugs such as `jobs`, `housing`, `services`, `paying-guest`, `restaurants`, `tech`, and `immigration`
- `GET /api/listings/stats/summary`
  - Retrieve dynamic counts for total listings, today's listings, this week's listings, cities covered, category counts, and subcategory counts
- `GET /api/listings/mine`
  - Retrieve listings created by the current authenticated user
  - Requires `Authorization: Bearer <token>` header
- `GET /api/listings/:id`
  - Retrieve a single listing by ID
- `PUT /api/listings/:id`
  - Update a listing owned by the authenticated user
  - Request body may include `title`, `description`, `category`, `subcategory`, `location`, `availability`, `price`, `priceNote`, `locationType`, `contactEmail`, `contactPhone`, `contactPreference`, `externalLink`, `tags`, `images`
  - Owners can add, remove, and replace listing images through the profile/listing edit UI
  - Requires `Authorization: Bearer <token>` header
- `DELETE /api/listings/:id`
  - Delete a listing owned by the authenticated user
  - Requires `Authorization: Bearer <token>` header

## 🛠️ Technologies Used

- **HTML5**: Semantic markup and structure
- **CSS3**: Responsive design and styling
- **JavaScript**: Interactive functionality
- **Express.js**: Backend API and static file serving
- **MongoDB + Mongoose**: User and listing persistence
- **JWT + bcryptjs**: Authentication tokens and password hashing

## 🎯 Target Audience

- Nepali immigrants in the United States
- Businesses serving the Nepali community
- Individuals seeking services, jobs, or housing
- Community organizers and event planners

## 📱 Responsive Design

The site is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile phones

## 🔗 Navigation

- **Homepage**: Overview and featured listings
- **Categories**: Organized by jobs, housing, marketplace, and community
- **Authentication**: User login and registration
- **Posting**: Create new listings with forms and file uploads

## 🤝 Contributing

To contribute:
1. Fork the repository
2. Make your changes
3. Test locally through `npm start`
4. Submit a pull request

---

**Built for the Nepali community in the US** 🇳🇵
