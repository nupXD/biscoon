const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'biscoon_dev_secret';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/biscoon';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── MongoDB Connection ──
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✓ Connected to MongoDB');
}).catch(err => {
  console.error('✗ MongoDB connection error:', err);
  process.exit(1);
});

// ── User Schema ──
const userSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'users' });

// ── Listing Schema ──
const listingSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, required: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, index: true },
  subcategory: { type: String },
  price: { type: String },
  location: { type: String, index: true },
  contactEmail: { type: String },
  contactPhone: { type: String },
  images: [{ type: String }],
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'listings' });

// ── Text Index for full-text search (ready for Elasticsearch) ──
listingSchema.index({
  title: 'text',
  description: 'text',
  category: 'text',
  location: 'text',
});

const User = mongoose.model('User', userSchema);
const Listing = mongoose.model('Listing', listingSchema);

// ── Helper Functions ──
function sanitizeUser(user) {
  const userObj = user.toObject ? user.toObject() : user;
  const { password, ...safe } = userObj;
  return safe;
}

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

async function findUserByEmail(email) {
  return User.findOne({ email: email.toLowerCase() });
}

async function findUserById(id) {
  return User.findOne({ id });
}

async function findListingById(id) {
  return Listing.findOne({ id });
}

function normalizeListing(listing) {
  if (!listing) return null;
  const listingObj = listing.toObject ? listing.toObject() : listing;
  return {
    ...listingObj,
    images: listingObj.images || [],
  };
}


// ── Auth Middleware ──
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing authentication token.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(payload.id);
    if (!user) return res.status(401).json({ error: 'Invalid token.' });
    req.user = sanitizeUser(user);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// ── AUTH ENDPOINTS ──

app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, password, confirmPassword } = req.body;
  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({
    id: uuidv4(),
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : '',
    password: passwordHash,
  });

  try {
    await user.save();
  } catch (err) {
    if (err && err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    throw err;
  }

  return res.status(201).json({
    user: sanitizeUser(user),
    token: createToken(user),
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  return res.json({
    user: sanitizeUser(user),
    token: createToken(user),
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.put('/api/auth/me', authMiddleware, async (req, res) => {
  const { name, phone, currentPassword, newPassword, confirmPassword } = req.body;
  const user = await findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const updatedName = name ? name.trim() : user.name;
  const updatedPhone = phone ? phone.trim() : user.phone || '';
  let passwordHash = user.password;

  if (newPassword || confirmPassword || currentPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to change your password.' });
    }
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation are required.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.password);
    if (!currentMatches) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    passwordHash = await bcrypt.hash(newPassword, 10);
  }

  user.name = updatedName;
  user.phone = updatedPhone;
  user.password = passwordHash;
  await user.save();

  const updatedUser = await findUserById(user.id);
  res.json({ user: sanitizeUser(updatedUser) });
});



// ── LISTING ENDPOINTS ──

app.post('/api/listings', authMiddleware, async (req, res) => {
  const { title, description, category, subcategory, price, location, contactEmail, contactPhone, images } = req.body;
  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required.' });
  }

  const listing = new Listing({
    id: uuidv4(),
    userId: req.user.id,
    title: title.trim(),
    description: description.trim(),
    category: category.trim(),
    subcategory: subcategory ? subcategory.trim() : '',
    price: price ? String(price).trim() : '',
    location: location ? location.trim() : '',
    contactEmail: contactEmail ? contactEmail.trim() : '',
    contactPhone: contactPhone ? contactPhone.trim() : '',
    images: Array.isArray(images) ? images : [],
  });

  await listing.save();

  res.status(201).json({
    listing: normalizeListing(listing),
  });
});

app.get('/api/listings', async (req, res) => {
  const category = req.query.category;
  const subcategory = req.query.subcategory;
  const search = req.query.search;
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 0, 100);

  let query = {};
  if (category) {
    query.category = category;
  }
  if (subcategory) {
    query.subcategory = subcategory;
  }

  let listingsQuery;
  if (search) {
    // Full-text search (ready for Elasticsearch)
    listingsQuery = Listing.find({ $text: { $search: search }, ...query }).sort({ createdAt: -1 });
  } else {
    listingsQuery = Listing.find(query).sort({ createdAt: -1 });
  }

  if (limit) {
    listingsQuery = listingsQuery.limit(limit);
  }

  const listings = await listingsQuery;
  res.json({ listings: listings.map(normalizeListing) });
});

app.get('/api/listings/mine', authMiddleware, async (req, res) => {
  const listings = await Listing.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json({ listings: listings.map(normalizeListing) });
});

app.get('/api/listings/:id', async (req, res) => {
  const listing = await findListingById(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found.' });
  }
  res.json(normalizeListing(listing));
});

app.put('/api/listings/:id', authMiddleware, async (req, res) => {
  const listing = await findListingById(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found.' });
  }
  if (listing.userId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to edit this listing.' });
  }

  const {
    title = listing.title,
    description = listing.description,
    category = listing.category,
    subcategory = listing.subcategory,
    price = listing.price,
    location = listing.location,
    contactEmail = listing.contactEmail,
    contactPhone = listing.contactPhone,
    images = listing.images,
  } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required.' });
  }

  listing.title = title.trim();
  listing.description = description.trim();
  listing.category = category.trim();
  listing.subcategory = subcategory ? String(subcategory).trim() : '';
  listing.price = price ? String(price).trim() : '';
  listing.location = location ? String(location).trim() : '';
  listing.contactEmail = contactEmail ? String(contactEmail).trim() : '';
  listing.contactPhone = contactPhone ? String(contactPhone).trim() : '';
  listing.images = Array.isArray(images) ? images : [];
  listing.updatedAt = new Date();

  await listing.save();

  res.json({
    listing: normalizeListing(listing),
  });
});

app.delete('/api/listings/:id', authMiddleware, async (req, res) => {
  const listing = await findListingById(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found.' });
  }
  if (listing.userId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to delete this listing.' });
  }

  await Listing.deleteOne({ id: listing.id });
  res.json({ success: true, message: 'Listing deleted successfully.' });
});

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`🚀 Biscoon backend running at http://localhost:${PORT}`);
});
