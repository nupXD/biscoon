import { Request } from 'express';
import { Document } from 'mongoose';

// ── User ────────────────────────────────────────────────────────────────────
export type UserRole = 'user' | 'staff' | 'sub-admin' | 'admin' | 'super-admin';

export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  sessionVersion: number;
  role: UserRole;
  permissions: string[];
  emailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  savedListings: string[];
  createdBy?: string;
  deleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SanitizedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  permissions: string[];
  emailVerified: boolean;
  savedListings: string[];
  createdAt: Date;
}

// ── Listing ─────────────────────────────────────────────────────────────────
export interface IComment {
  id: string;
  authorId?: string;
  userId?: string;
  authorName: string;
  body: string;
  parentId?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IListing extends Document {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  locationType?: string;
  location?: string;
  price?: string;
  priceNote?: string;
  availability?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPreference?: string;
  externalLink?: string;
  tags: string[];
  images: string[];
  comments: IComment[];
  commentCount: number;
  deleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Discussion ───────────────────────────────────────────────────────────────
export interface IDiscussion extends Document {
  id: string;
  userId: string;
  authorName: string;
  title: string;
  body: string;
  category: string;
  location: string;
  tags: string[];
  comments: IComment[];
  commentCount: number;
  deleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── News ─────────────────────────────────────────────────────────────────────
export interface INews extends Document {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  status: 'draft' | 'published';
  featured: boolean;
  sourceName?: string;
  authorName?: string;
  createdBy: string;
  publishedAt?: Date;
  media?: Array<{ id: string; url: string; type: string; caption?: string }>;
  deleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Notification ─────────────────────────────────────────────────────────────
export interface INotification extends Document {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

// ── Announcement ─────────────────────────────────────────────────────────────
export interface IAnnouncement extends Document {
  id: string;
  title: string;
  body: string;
  message?: string;
  type: string;
  status?: 'active' | 'paused' | 'expired';
  active: boolean;
  createdBy: string;
  expiresAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
}

// ── HeroSpotlight ─────────────────────────────────────────────────────────────
export interface IHeroSpotlight extends Document {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  badgeText: string;
  badgeColor: string;
  imageUrl: string;
  ctaText: string;
  ctaUrl: string;
  type: 'ad' | 'event' | 'news' | 'promo';
  active: boolean;
  order: number;
  startDate?: Date;
  endDate?: Date;
  createdBy: string;
  deleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
}

// ── Report ───────────────────────────────────────────────────────────────────
export interface IReport extends Document {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: 'open' | 'reviewed' | 'dismissed';
  createdAt: Date;
}

// ── Express request augmentation ─────────────────────────────────────────────
export interface AuthRequest extends Request {
  user?: SanitizedUser;
}
