# Biscoon - Nepali Community Marketplace

A static website marketplace platform designed for the Nepali community in the United States, providing services, jobs, housing, and community connections.

## 🌟 Overview

Biscoon is a comprehensive online marketplace that connects Nepali immigrants and businesses in the US. The platform offers categorized listings for jobs, housing, services, community events, and more, all tailored to the needs of the Nepali diaspora.

## ✨ Features

### Core Functionality
- **User Authentication**: Login and signup pages for user accounts
- **Listing Creation**: Form-based posting system with file upload capabilities
- **Category Organization**: Well-structured sections for different service types

### Categories Available
- **Jobs**: Employment opportunities, tutoring, healthcare, tech, finance, and more
- **Housing**: Real estate, paying guest accommodations, moving services
- **Marketplace**: Services, childcare, beauty, auto, restaurants, photography, and business sales
- **Community**: Events, matrimony, matchmaker services, sports, music, art, literature, yoga, and cultural organizations

### Technical Features
- Responsive design for mobile and desktop
- Clean, modern UI with Nepali language support
- Static site architecture for easy deployment
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
- No server required - runs entirely in the browser

### Installation
1. Clone or download the project files
2. Open `index.html` in your web browser
3. Navigate through the site using the menu and links

### Development
- Edit HTML files in the `pages/` directory
- Modify styles in `assets/css/main.css`
- Update JavaScript in `assets/js/biscoon.js`
- Add backend API routes in `server.js`

### Running the backend
1. Install dependencies with `npm install`
2. Start the server with `npm start`
3. Open the site through `http://localhost:4000/index.html`

### Backend and database
- The backend is built with `Express.js` in `server.js`
- User authentication and listing persistence are stored in SQLite
- The database file is created at `data/biscoon.db`
- Tables are created automatically on first run

### SQLite schema
- `users`
  - `id` TEXT PRIMARY KEY
  - `name` TEXT NOT NULL
  - `email` TEXT NOT NULL UNIQUE
  - `phone` TEXT
  - `password` TEXT NOT NULL
  - `createdAt` TEXT NOT NULL
- `listings`
  - `id` TEXT PRIMARY KEY
  - `userId` TEXT NOT NULL
  - `title` TEXT NOT NULL
  - `description` TEXT NOT NULL
  - `category` TEXT NOT NULL
  - `subcategory` TEXT
  - `price` TEXT
  - `location` TEXT
  - `contactEmail` TEXT
  - `contactPhone` TEXT
  - `images` TEXT
  - `createdAt` TEXT NOT NULL
  - `updatedAt` TEXT NOT NULL

### API endpoints
- `POST /api/auth/register`
  - Register a new user
  - Request body: `name`, `email`, `phone`, `password`, `confirmPassword`
  - Response: user data and JWT token
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
- `GET /api/listings`
  - Retrieve all listings
  - Optional query: `?category=<category>`
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
- **Static Site Architecture**: No backend dependencies

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

This is a static site project. To contribute:
1. Fork the repository
2. Make your changes
3. Test locally by opening `index.html`
4. Submit a pull request

## 📄 License

This project is open source. Please check individual files for licensing information.

---

**Built for the Nepali community in the US** 🇳🇵