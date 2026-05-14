const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { JWT_SECRET } = require('../config/env');
const { findUserByEmail, findUserById, sanitizeUser } = require('../utils/users');

const router = express.Router();

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
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

router.post('/login', async (req, res) => {
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

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.put('/me', authMiddleware, async (req, res) => {
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

module.exports = router;
