import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import connectDatabase from '../src/config/database';
import User from '../src/models/User';

async function bootstrap(): Promise<void> {
  const email = z.string().email().parse(process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase());
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  if (password.length < 16 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Set BOOTSTRAP_ADMIN_PASSWORD to at least 16 characters and at most 72 UTF-8 bytes.');
  }
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Administrator';
  if (name.length > 120) throw new Error('Administrator name must be at most 120 characters.');
  await connectDatabase();
  if (await User.exists({ email })) throw new Error('Account already exists. No existing account was modified.');
  await User.create({ name, email, password: await bcrypt.hash(password, 12), role: 'super-admin', emailVerified: true });
  console.info('Administrator created successfully.');
}

bootstrap().catch(() => {
  console.error('Admin bootstrap failed. Check explicit credentials and database connectivity; existing accounts are never overwritten.');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
