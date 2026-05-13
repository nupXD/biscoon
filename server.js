const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'biscoon_dev_secret';
const DB_FILE = path.join(__dirname, 'data', 'biscoon.db');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const db = new sqlite3.Database(DB_FILE, err => {
  if (err) {
    console.error('Unable to open database:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    price TEXT,
    location TEXT,
    contactEmail TEXT,
    contactPhone TEXT,
    images TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )`);
});

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

async function findUserByEmail(email) {
  return getAsync('SELECT * FROM users WHERE email = ?', [email]);
}

async function findUserById(id) {
  return getAsync('SELECT * FROM users WHERE id = ?', [id]);
}

async function findListingById(id) {
  return getAsync('SELECT * FROM listings WHERE id = ?', [id]);
}

function normalizeListing(listing) {
  if (!listing) return null;
  return {
    ...listing,
    images: listing.images ? JSON.parse(listing.images) : [],
  };
}

async function createUser(user) {
  return runAsync(
    'INSERT INTO users (id, name, email, phone, password, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [user.id, user.name, user.email, user.phone, user.password, user.createdAt]
  );
}

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
  const user = {
    id: uuidv4(),
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : '',
    password: passwordHash,
    createdAt: new Date().toISOString(),
  };

  await createUser(user);

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

app.post('/api/listings', authMiddleware, async (req, res) => {
  const { title, description, category, subcategory, price, location, contactEmail, contactPhone, images } = req.body;
  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required.' });
  }

  const listingId = uuidv4();
  const createdAt = new Date().toISOString();
  const imageList = Array.isArray(images) ? images : [];

  await runAsync(
    `INSERT INTO listings (id, userId, title, description, category, subcategory, price, location, contactEmail, contactPhone, images, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      listingId,
      req.user.id,
      title.trim(),
      description.trim(),
      category.trim(),
      subcategory ? subcategory.trim() : '',
      price ? String(price).trim() : '',
      location ? location.trim() : '',
      contactEmail ? contactEmail.trim() : '',
      contactPhone ? contactPhone.trim() : '',
      JSON.stringify(imageList),
      createdAt,
      createdAt,
    ]
  );

  res.status(201).json({
    listing: {
      id: listingId,
      userId: req.user.id,
      title,
      description,
      category,
      subcategory,
      price,
      location,
      contactEmail,
      contactPhone,
      images: imageList,
      createdAt,
      updatedAt: createdAt,
    },
  });
});

app.get('/api/listings', async (req, res) => {
  const category = req.query.category;
  let rows;
  if (category) {
    rows = await allAsync('SELECT * FROM listings WHERE category = ? ORDER BY createdAt DESC', [category]);
  } else {
    rows = await allAsync('SELECT * FROM listings ORDER BY createdAt DESC');
  }

  const listings = rows.map(listing => ({
    ...listing,
    images: listing.images ? JSON.parse(listing.images) : [],
  }));

  res.json({ listings });
});

app.get('/api/listings/:id', async (req, res) => {
  const listing = await findListingById(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found.' });
  }
  res.json(normalizeListing(listing));
});

app.get('/api/listings/mine', authMiddleware, async (req, res) => {
  const rows = await allAsync('SELECT * FROM listings WHERE userId = ? ORDER BY createdAt DESC', [req.user.id]);
  res.json({ listings: rows.map(normalizeListing) });
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
    images = listing.images ? JSON.parse(listing.images) : [],
  } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required.' });
  }

  const updatedAt = new Date().toISOString();
  const imageList = Array.isArray(images) ? images : [];

  await runAsync(
    `UPDATE listings SET title = ?, description = ?, category = ?, subcategory = ?, price = ?, location = ?, contactEmail = ?, contactPhone = ?, images = ?, updatedAt = ? WHERE id = ?`,
    [
      title.trim(),
      description.trim(),
      category.trim(),
      subcategory ? String(subcategory).trim() : '',
      price ? String(price).trim() : '',
      location ? String(location).trim() : '',
      contactEmail ? String(contactEmail).trim() : '',
      contactPhone ? String(contactPhone).trim() : '',
      JSON.stringify(imageList),
      updatedAt,
      listing.id,
    ]
  );

  res.json({
    listing: {
      ...listing,
      title,
      description,
      category,
      subcategory,
      price,
      location,
      contactEmail,
      contactPhone,
      images: imageList,
      updatedAt,
    },
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

  await runAsync('DELETE FROM listings WHERE id = ?', [listing.id]);
  res.json({ success: true, message: 'Listing deleted successfully.' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

app.listen(PORT, () => {
  console.log(`Biscoon auth backend is running at http://localhost:${PORT}`);
});
