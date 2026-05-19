const express = require('express');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { authLoginLimiter, authRegisterLimiter } = require('../middleware/rateLimit');
const { JWT_SECRET } = require('../config/env');
const { findUserByEmail, findUserById, sanitizeUser } = require('../utils/users');
const { isAdminAccount } = require('../utils/adminPermissions');
const { validate } = require('../utils/validate');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(240),
  phone: z.string().trim().max(50).optional().default(''),
  password: z.string().min(8).max(200),
  confirmPassword: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(240),
  password: z.string().min(1).max(200),
});

const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(50).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().max(200).optional(),
  confirmPassword: z.string().max(200).optional(),
});

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
}

async function authenticateLogin(body) {
  const parsedPayload = validate(loginSchema, body);
  if (parsedPayload.error) {
    return { status: 400, error: parsedPayload.error };
  }

  const { email, password } = parsedPayload.value;
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    return { status: 401, error: 'Invalid email or password.' };
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return { status: 401, error: 'Invalid email or password.' };
  }

  return { user };
}

router.post('/register', authRegisterLimiter, async (req, res) => {
  const parsedPayload = validate(registerSchema, req.body);
  if (parsedPayload.error) return res.status(400).json({ error: parsedPayload.error });

  const { name, email, phone, password, confirmPassword } = parsedPayload.value;
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
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

router.post('/login', authLoginLimiter, async (req, res) => {
  const auth = await authenticateLogin(req.body);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  if (isAdminAccount(auth.user)) {
    return res.status(403).json({ error: 'Admin accounts must sign in through the Admin Panel.' });
  }

  return res.json({
    user: sanitizeUser(auth.user),
    token: createToken(auth.user),
  });
});

router.post('/admin/login', authLoginLimiter, async (req, res) => {
  const auth = await authenticateLogin(req.body);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  if (!isAdminAccount(auth.user)) {
    return res.status(403).json({ error: 'This account does not have admin access.' });
  }

  return res.json({
    user: sanitizeUser(auth.user),
    token: createToken(auth.user),
  });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.put('/me', authMiddleware, async (req, res) => {
  const parsedPayload = validate(profileUpdateSchema, req.body);
  if (parsedPayload.error) return res.status(400).json({ error: parsedPayload.error });

  const { name, phone, currentPassword, newPassword, confirmPassword } = parsedPayload.value;
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
