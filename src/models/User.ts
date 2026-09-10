import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ASSIGNABLE_ADMIN_PERMISSIONS } from '../utils/adminPermissions';
import type { IUser } from '../types';

const ADMIN_PERMISSION_KEYS = ASSIGNABLE_ADMIN_PERMISSIONS.map(permission => permission.key);

const userSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  password: { type: String, required: true },
  sessionVersion: { type: Number, default: 0 },
  role: { type: String, default: 'user', enum: ['user', 'staff', 'sub-admin', 'admin', 'super-admin'] },
  permissions: [{ type: String, enum: ADMIN_PERMISSION_KEYS }],
  emailVerified: { type: Boolean, default: false },
  emailVerificationTokenHash: { type: String },
  emailVerificationExpiresAt: { type: Date },
  passwordResetTokenHash: { type: String },
  passwordResetExpiresAt: { type: Date },
  savedListings: [{ type: String }],
  createdBy: { type: String },
  deleted:   { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'users' });

userSchema.index({ emailVerificationTokenHash: 1 }, { sparse: true });
userSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });

export default mongoose.model<IUser>('User', userSchema);
