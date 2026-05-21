import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User';
import authMiddleware from '../middleware/auth';
import { authLoginLimiter, authRecoveryLimiter, authRegisterLimiter } from '../middleware/rateLimit';
import { APP_BASE_URL, EMAIL_VERIFICATION_REQUIRED, JWT_SECRET, isProduction } from '../config/env';
import { findUserByEmail, findUserById, sanitizeUser } from '../utils/users';
import { isAdminAccount } from '../utils/adminPermissions';
import { createAccountToken, hashAccountToken, tokenIsFresh } from '../utils/accountTokens';
import { validate } from '../utils/validate';
import type { AuthRequest, SanitizedUser } from '../types';

const router = Router();

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

const emailSchema = z.object({
  email: z.string().trim().email().max(240),
});

const tokenEmailSchema = emailSchema.extend({
  token: z.string().trim().min(16).max(200),
});

const resetPasswordSchema = tokenEmailSchema.extend({
  password: z.string().min(8).max(200),
  confirmPassword: z.string().min(8).max(200),
}).superRefine((payload, ctx) => {
  if (payload.password !== payload.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Passwords do not match.',
    });
  }
});

const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(50).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().max(200).optional(),
  confirmPassword: z.string().max(200).optional(),
});

function createToken(user: { id: string; email: string }): string {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
}

function buildAccountActionUrl(path: string, email: string, token: string): string {
  const url = new URL(path, APP_BASE_URL);
  url.searchParams.set('email', email);
  url.searchParams.set('token', token);
  return url.toString();
}

function accountActionPayload(type: string, email: string, token: string): Record<string, string> {
  if (isProduction) return {};
  return {
    [`${type}Token`]: token,
    [`${type}Url`]: buildAccountActionUrl(
      type === 'verification' ? '/api/auth/verify-email' : '/pages/auth/login.html',
      email,
      token
    ),
  };
}

async function authenticateLogin(body: unknown): Promise<{ user?: any; status?: number; error?: string }> {
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

router.post('/register', authRegisterLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsedPayload = validate(registerSchema, req.body);
  if (parsedPayload.error) { res.status(400).json({ error: parsedPayload.error }); return; }

  const { name, email, phone, password, confirmPassword } = parsedPayload.value;
  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match.' }); return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    res.status(409).json({ error: 'An account with this email already exists.' }); return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verification = createAccountToken(24);
  const user = new User({
    id: uuidv4(),
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : '',
    password: passwordHash,
    emailVerificationTokenHash: verification.tokenHash,
    emailVerificationExpiresAt: verification.expiresAt,
  });

  try {
    await user.save();
  } catch (err: any) {
    if (err && err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      res.status(409).json({ error: 'An account with this email already exists.' }); return;
    }
    throw err;
  }

  res.status(201).json({
    user: sanitizeUser(user),
    token: createToken(user),
    emailVerificationRequired: EMAIL_VERIFICATION_REQUIRED,
    ...accountActionPayload('verification', normalizedEmail, verification.token),
  });
});

router.post('/login', authLoginLimiter, async (req: Request, res: Response): Promise<void> => {
  const auth = await authenticateLogin(req.body);
  if (auth.error) { res.status(auth.status!).json({ error: auth.error }); return; }
  if (isAdminAccount(auth.user)) {
    res.status(403).json({ error: 'Admin accounts must sign in through the Admin Panel.' }); return;
  }

  res.json({
    user: sanitizeUser(auth.user),
    token: createToken(auth.user),
  });
});

router.post('/admin/login', authLoginLimiter, async (req: Request, res: Response): Promise<void> => {
  const auth = await authenticateLogin(req.body);
  if (auth.error) { res.status(auth.status!).json({ error: auth.error }); return; }
  if (!isAdminAccount(auth.user)) {
    res.status(403).json({ error: 'This account does not have admin access.' }); return;
  }

  res.json({
    user: sanitizeUser(auth.user),
    token: createToken(auth.user),
  });
});

router.post('/request-email-verification', authMiddleware, authRecoveryLimiter, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const user = await findUserById(req_.user!.id);
  if (!user) { res.status(404).json({ error: 'User not found.' }); return; }
  if (user.emailVerified) {
    res.json({ ok: true, emailVerified: true }); return;
  }

  const verification = createAccountToken(24);
  user.emailVerificationTokenHash = verification.tokenHash;
  user.emailVerificationExpiresAt = verification.expiresAt;
  user.updatedAt = new Date();
  await user.save();

  res.json({
    ok: true,
    emailVerified: false,
    emailVerificationRequired: EMAIL_VERIFICATION_REQUIRED,
    ...accountActionPayload('verification', user.email, verification.token),
  });
});

router.post('/verify-email', authRecoveryLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsedPayload = validate(tokenEmailSchema, req.body);
  if (parsedPayload.error) { res.status(400).json({ error: parsedPayload.error }); return; }

  const email = parsedPayload.value.email.trim().toLowerCase();
  const user = await findUserByEmail(email);
  if (!user) { res.status(400).json({ error: 'Invalid or expired verification token.' }); return; }

  const tokenHash = hashAccountToken(parsedPayload.value.token);
  if (
    user.emailVerificationTokenHash !== tokenHash
    || !tokenIsFresh(user.emailVerificationExpiresAt)
  ) {
    res.status(400).json({ error: 'Invalid or expired verification token.' }); return;
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  user.updatedAt = new Date();
  await user.save();

  res.json({
    ok: true,
    user: sanitizeUser(user),
    token: createToken(user),
  });
});

router.post('/forgot-password', authRecoveryLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsedPayload = validate(emailSchema, req.body);
  if (parsedPayload.error) { res.status(400).json({ error: parsedPayload.error }); return; }

  const email = parsedPayload.value.email.trim().toLowerCase();
  const user = await findUserByEmail(email);
  let recoveryPayload: Record<string, string> = {};

  if (user) {
    const reset = createAccountToken(1);
    user.passwordResetTokenHash = reset.tokenHash;
    user.passwordResetExpiresAt = reset.expiresAt;
    user.updatedAt = new Date();
    await user.save();
    recoveryPayload = accountActionPayload('reset', user.email, reset.token);
  }

  res.json({
    ok: true,
    message: 'If an account exists for that email, password reset instructions are ready.',
    ...recoveryPayload,
  });
});

router.post('/reset-password', authRecoveryLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsedPayload = validate(resetPasswordSchema, req.body);
  if (parsedPayload.error) { res.status(400).json({ error: parsedPayload.error }); return; }

  const { email, token, password } = parsedPayload.value;
  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user) { res.status(400).json({ error: 'Invalid or expired password reset token.' }); return; }

  const tokenHash = hashAccountToken(token);
  if (
    user.passwordResetTokenHash !== tokenHash
    || !tokenIsFresh(user.passwordResetExpiresAt)
  ) {
    res.status(400).json({ error: 'Invalid or expired password reset token.' }); return;
  }

  user.password = await bcrypt.hash(password, 10);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.emailVerified = true;
  user.updatedAt = new Date();
  await user.save();

  res.json({ ok: true });
});

router.get('/me', authMiddleware, (req: Request, res: Response): void => {
  const req_ = req as AuthRequest;
  res.json({ user: req_.user });
});

router.put('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const parsedPayload = validate(profileUpdateSchema, req.body);
  if (parsedPayload.error) { res.status(400).json({ error: parsedPayload.error }); return; }

  const { name, phone, currentPassword, newPassword, confirmPassword } = parsedPayload.value;
  const user = await findUserById(req_.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' }); return;
  }

  const updatedName = name ? name.trim() : user.name;
  const updatedPhone = phone ? phone.trim() : user.phone || '';
  let passwordHash = user.password;

  if (newPassword || confirmPassword || currentPassword) {
    if (!currentPassword) {
      res.status(400).json({ error: 'Current password is required to change your password.' }); return;
    }
    if (!newPassword || !confirmPassword) {
      res.status(400).json({ error: 'New password and confirmation are required.' }); return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'New passwords do not match.' }); return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' }); return;
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.password);
    if (!currentMatches) {
      res.status(401).json({ error: 'Current password is incorrect.' }); return;
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

export default router;
