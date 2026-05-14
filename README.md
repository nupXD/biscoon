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
- **Listing Creation**: Form-based posting system for jobs, housing, services, marketplace, and community categories
- **Specific Location Posting**: Listings collect area/city and state, then store a searchable location like `Allston, MA`
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

## 📁 Project Structure

```
biscoon-project/
├── index.html                    # Homepage
├── assets/
│   ├── css/
│   │   └── main.css             # Main stylesheet
│   └── js/
│       └── biscoon.js           # Main JavaScript file
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
- Modify styles in `assets/css/main.css`
- Update JavaScript in `assets/js/biscoon.js`
- Add backend API routes in `server.js`

### Running the backend
1. Install dependencies with `npm install`
2. Make sure MongoDB is running
3. Optionally set environment variables:
   - `PORT` defaults to `4000`
   - `MONGODB_URI` defaults to `mongodb://localhost:27017/biscoon`
   - `JWT_SECRET` defaults to a development-only secret
4. Start the server with `npm start`
5. Open the site through `http://localhost:4000/index.html`

### Backend and database
- The backend is built with `Express.js` in `server.js`
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
  - `price` String
  - `location` String, indexed
  - `contactEmail` String
  - `contactPhone` String
  - `images` Array of strings
  - `createdAt` Date, indexed
  - `updatedAt` Date
  - Text index across `title`, `description`, `category`, and `location`

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
  - Request body: `title`, `description`, `category`, optionally `subcategory`, `price`, `location`, `contactEmail`, `contactPhone`, `images`
  - The posting form builds `location` from area/city and state fields
- `GET /api/listings`
  - Retrieve all listings
  - Optional query: `?category=<category>&subcategory=<subcategory>&search=<term>&limit=<number>`
  - Category values line up with page slugs such as `jobs`, `housing`, `services`, `paying-guest`, `restaurants`, `tech`, and `immigration`
- `GET /api/listings/mine`
  - Retrieve listings created by the current authenticated user
  - Requires `Authorization: Bearer <token>` header
- `GET /api/listings/:id`
  - Retrieve a single listing by ID
- `PUT /api/listings/:id`
  - Update a listing owned by the authenticated user
  - Request body may include `title`, `description`, `category`, `subcategory`, `price`, `location`, `contactEmail`, `contactPhone`, `images`
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
