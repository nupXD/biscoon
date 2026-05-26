import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import sanitizeHtml from 'sanitize-html';
import User from '../models/User';
import Listing from '../models/Listing';
import Discussion from '../models/Discussion';
import Conversation from '../models/Conversation';
import Announcement from '../models/Announcement';
import HeroSpotlight from '../models/HeroSpotlight';
import Report from '../models/Report';
import News from '../models/News';
import AdminAuditLog from '../models/AdminAuditLog';
import adminMiddleware from '../middleware/admin';
import { getPagination, pagedResponse } from '../utils/pagination';
import { listingCategoryFilter, normalizeCategory } from '../utils/categories';
import { saveBase64Upload } from '../utils/uploads';
import { createUniqueNewsSlug, normalizeNewsArticle } from '../utils/news';
import * as es from '../services/elasticsearch';
import {
  ADMIN_ACCOUNT_ROLES,
  ASSIGNABLE_ADMIN_PERMISSIONS,
  adminRoleLabel,
  getAdminPermissions,
  isSuperAdmin,
  normalizePermissions,
} from '../utils/adminPermissions';
import type { AuthRequest } from '../types';

const router = Router();
router.use(...(adminMiddleware as any));

const requirePermission = adminMiddleware.requirePermission;
const requireSuperAdmin = adminMiddleware.requireSuperAdmin;

function regularUserQuery(extra: Record<string, any> = {}): Record<string, any> {
  return { role: 'user', ...extra };
}

function adminUserQuery(extra: Record<string, any> = {}): Record<string, any> {
  return { role: { $in: ADMIN_ACCOUNT_ROLES }, ...extra };
}

function withSearch(query: Record<string, any>, search: string): Record<string, any> {
  if (!search) return query;
  const safeSearch = escapeRegExp(search);
  return {
    ...query,
    $or: [
      { name: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
    ],
  };
}

function staffResponse(user: any): any {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    roleLabel: adminRoleLabel(user.role),
    permissions: getAdminPermissions(user),
    createdBy: user.createdBy || '',
    createdAt: user.createdAt,
    canEdit: !isSuperAdmin(user),
  };
}

const SAFE_USER_PROJECTION = {
  password: 0,
  emailVerificationTokenHash: 0,
  emailVerificationExpiresAt: 0,
  passwordResetTokenHash: 0,
  passwordResetExpiresAt: 0,
};

async function recordAdminAudit(req: Request, details: Record<string, any> = {}): Promise<void> {
  const req_ = req as AuthRequest;
  try {
    await AdminAuditLog.create({
      id: uuidv4(),
      actorId: req_.user!.id,
      actorName: req_.user!.name || '',
      actorEmail: req_.user!.email || '',
      actorRole: req_.user!.role || '',
      action: details.action,
      targetType: details.targetType,
      targetId: details.targetId || '',
      targetTitle: details.targetTitle || '',
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
      metadata: details.metadata || {},
    });
  } catch (err: any) {
    console.error('Admin audit log failed:', err.message);
  }
}

const NEWS_CATEGORIES = ['community', 'nepal', 'usa', 'business', 'immigration', 'culture', 'opinion', 'sports', 'technology', 'world'];
const MAX_NEWS_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_NEWS_VIDEO_BYTES = 18 * 1024 * 1024;
const MAX_NEWS_MEDIA_ITEMS = 24;
const MAX_DISCUSSION_BODY_LENGTH = 5000;
const NEWS_ALLOWED_FONT_FAMILIES = /^(serif|monospace|system-ui,\s*sans-serif)$/i;

function cleanString(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function escapeRegExp(value: unknown): string {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanTags(tags: unknown): string[] {
  const source = Array.isArray(tags) ? tags : cleanString(tags).split(',');
  return source
    .map(tag => cleanString(tag).slice(0, 40))
    .filter(Boolean)
    .slice(0, 8);
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value || '');
}

function sanitizeNewsBody(value: string): string {
  if (!looksLikeHtml(value)) return value;
  return sanitizeHtml(value, {
    allowedTags: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
      'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'a', 'span',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      span: ['style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedStyles: {
      span: {
        'font-family': [NEWS_ALLOWED_FONT_FAMILIES],
      },
    },
    transformTags: {
      b: 'strong',
      i: 'em',
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  });
}

function getDiscussionPayload(body: Record<string, any> = {}): { error?: string; value?: any } {
  const title = cleanString(body.title).slice(0, 200);
  const discussionBody = cleanString(body.body).slice(0, MAX_DISCUSSION_BODY_LENGTH);
  const category = cleanString(body.category, 'general').slice(0, 80) || 'general';
  const tags = cleanTags(body.tags);

  if (!title || !discussionBody) {
    return { error: 'Title and body are required.' };
  }

  return {
    value: {
      title,
      body: discussionBody,
      category,
      tags,
      updatedAt: new Date(),
    },
  };
}

function getBase64Bytes(value: string): number {
  const sanitized = value.replace(/\s+/g, '');
  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((sanitized.length * 3) / 4) - padding);
}

const MAX_SPOTLIGHT_IMAGE_BYTES = 5 * 1024 * 1024;

function cleanSpotlightImage(value: unknown): string | null {
  const image = typeof value === 'string' ? value.trim() : '';
  if (!image) return null;
  if (/^https?:\/\//i.test(image) || image.startsWith('/uploads/')) return image;
  if (!image.startsWith('data:image/')) return null;
  const parts = image.match(/^data:(image\/[^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!parts) return null;
  const mimeType = parts[1].toLowerCase();
  const base64 = parts[2].replace(/\s+/g, '');
  if (getBase64Bytes(base64) > MAX_SPOTLIGHT_IMAGE_BYTES) return null;
  return saveBase64Upload({ folder: 'spotlight', mimeType, base64 });
}

function parseNewsMediaDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = /^data:((?:image|video)\/[^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2].replace(/\s+/g, ''),
  };
}

function cleanNewsImage(value: unknown): string | null {
  const image = cleanString(value);
  if (!image) return '';
  if (/^https?:\/\//i.test(image) || image.startsWith('/uploads/')) return image;
  if (!image.startsWith('data:image/')) return null;

  const parsed = parseNewsMediaDataUrl(image);
  if (!parsed || getBase64Bytes(parsed.base64) > MAX_NEWS_IMAGE_BYTES) return null;
  return saveBase64Upload({ folder: 'news', mimeType: parsed.mimeType, base64: parsed.base64 });
}

function inferNewsMediaType(item: any = {}, parsed: any = null): string {
  if (parsed?.mimeType?.startsWith('video/')) return 'video';
  if (parsed?.mimeType?.startsWith('image/')) return 'image';
  const explicitType = cleanString(item.type);
  return explicitType === 'video' ? 'video' : 'image';
}

function cleanNewsMediaUrl(value: unknown, type: string): string | null {
  const url = cleanString(value);
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('/uploads/')) return url;
  if (!url.startsWith('data:')) return null;

  const parsed = parseNewsMediaDataUrl(url);
  if (!parsed) return null;
  const mediaType = inferNewsMediaType({ type }, parsed);
  const maxBytes = mediaType === 'video' ? MAX_NEWS_VIDEO_BYTES : MAX_NEWS_IMAGE_BYTES;
  if (getBase64Bytes(parsed.base64) > maxBytes) return null;
  return saveBase64Upload({ folder: 'news', mimeType: parsed.mimeType, base64: parsed.base64 });
}

function cleanNewsMedia(items: any[] = [], existingItems: any[] = []): any[] {
  const source = Array.isArray(items) ? items : existingItems;
  const cleaned: any[] = [];

  for (const item of source.slice(0, MAX_NEWS_MEDIA_ITEMS)) {
    const parsed = typeof item.url === 'string' && item.url.startsWith('data:')
      ? parseNewsMediaDataUrl(item.url)
      : null;
    const type = inferNewsMediaType(item, parsed);
    const url = cleanNewsMediaUrl(item.url, type);
    if (!url) continue;

    cleaned.push({
      id: cleanString(item.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || uuidv4(),
      type,
      url,
      caption: cleanString(item.caption).slice(0, 240),
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    });
  }

  return cleaned;
}

function getNewsPayload(body: Record<string, any> = {}, existingArticle: any = null): { error?: string; value?: any } {
  const title = cleanString(body.title).slice(0, 180);
  const summary = cleanString(body.summary).slice(0, 360);
  const articleBody = sanitizeNewsBody(cleanString(body.body).slice(0, 20000)).slice(0, 20000);
  const category = NEWS_CATEGORIES.includes(cleanString(body.category)) ? cleanString(body.category) : 'community';
  const status = cleanString(body.status) === 'published' ? 'published' : 'draft';
  const media = body.media === undefined && existingArticle
    ? cleanNewsMedia(existingArticle.media || [])
    : cleanNewsMedia(body.media || [], existingArticle?.media || []);
  let imageUrl = body.imageUrl === undefined && existingArticle ? existingArticle.imageUrl : cleanNewsImage(body.imageUrl);
  if (!imageUrl) {
    imageUrl = media.find((item: any) => item.type === 'image')?.url || '';
  }

  if (!title || !summary || !articleBody) {
    return { error: 'Title, summary, and body are required.' };
  }
  if (imageUrl === null) {
    return { error: 'Image must be an http(s) URL, an existing upload path, or an image under 4MB.' };
  }

  const currentPublishedAt = existingArticle?.publishedAt || null;
  return {
    value: {
      title,
      summary,
      body: articleBody,
      category,
      status,
      featured: Boolean(body.featured),
      imageUrl,
      media,
      sourceName: cleanString(body.sourceName, 'Biscoon Newsroom').slice(0, 120) || 'Biscoon Newsroom',
      authorName: cleanString(body.authorName).slice(0, 120),
      publishedAt: status === 'published' ? (currentPublishedAt || new Date()) : null,
      updatedAt: new Date(),
    },
  };
}

/* -- Stats / Analytics -- */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const permissions = new Set(getAdminPermissions(req_.user));
  const canViewUsers = permissions.has('users');
  const canViewListings = permissions.has('listings');
  const canViewDiscussions = permissions.has('discussions');
  const canViewNews = permissions.has('news');
  const now = new Date();
  const dayAgo   = new Date(now.getTime() - 86400000);
  const weekAgo  = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const [
    totalUsers, usersToday, usersThisWeek, usersThisMonth,
    totalAdminUsers,
    totalListings, listingsToday, listingsThisWeek,
    totalNews, newsThisWeek,
    totalDiscussions, discussionsThisWeek,
    totalConversations,
    byCategory,
    recentUsers,
    recentListings,
  ] = await Promise.all([
    User.countDocuments(regularUserQuery()),
    User.countDocuments(regularUserQuery({ createdAt: { $gte: dayAgo } })),
    User.countDocuments(regularUserQuery({ createdAt: { $gte: weekAgo } })),
    User.countDocuments(regularUserQuery({ createdAt: { $gte: monthAgo } })),
    User.countDocuments(adminUserQuery()),
    Listing.countDocuments(),
    Listing.countDocuments({ createdAt: { $gte: dayAgo } }),
    Listing.countDocuments({ createdAt: { $gte: weekAgo } }),
    News.countDocuments({ status: 'published' }),
    News.countDocuments({ status: 'published', publishedAt: { $gte: weekAgo } }),
    Discussion.countDocuments(),
    Discussion.countDocuments({ createdAt: { $gte: weekAgo } }),
    Conversation.countDocuments(),
    Listing.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    User.find(regularUserQuery({ deleted: { $ne: true } }), { id: 1, name: 1, email: 1, role: 1, createdAt: 1 })
      .sort({ createdAt: -1 }).limit(8),
    Listing.find({ deleted: { $ne: true } }, { id: 1, title: 1, category: 1, userId: 1, location: 1, createdAt: 1 })
      .sort({ createdAt: -1 }).limit(8),
  ]);

  res.json({
    users: canViewUsers
      ? { total: totalUsers, today: usersToday, thisWeek: usersThisWeek, thisMonth: usersThisMonth }
      : { total: 0, today: 0, thisWeek: 0, thisMonth: 0 },
    adminUsers: { total: totalAdminUsers },
    listings: canViewListings
      ? { total: totalListings, today: listingsToday, thisWeek: listingsThisWeek }
      : { total: 0, today: 0, thisWeek: 0 },
    news: canViewNews
      ? { total: totalNews, thisWeek: newsThisWeek }
      : { total: 0, thisWeek: 0 },
    discussions: canViewDiscussions
      ? { total: totalDiscussions, thisWeek: discussionsThisWeek }
      : { total: 0, thisWeek: 0 },
    conversations: { total: totalConversations },
    byCategory: canViewListings ? byCategory.map((c: any) => ({ category: c._id || 'other', count: c.count })) : [],
    recentUsers: canViewUsers ? recentUsers.map((u: any) => ({
      id: u.id, name: u.name, email: u.email, role: u.role || 'user', createdAt: u.createdAt,
    })) : [],
    recentListings: canViewListings ? recentListings.map((l: any) => ({
      id: l.id, title: l.title, category: l.category, location: l.location, createdAt: l.createdAt,
    })) : [],
  });
});

/* -- Global search -- */
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const q = cleanString(req.query.q);
  if (!q || q.length < 2) { res.json({ results: [] }); return; }

  const safe = escapeRegExp(q);
  const opts = { $regex: safe, $options: 'i' };
  const limit = 5;

  const [users, listings, discussions, news] = await Promise.all([
    User.find({ $or: [{ name: opts }, { email: opts }] }, { name: 1, email: 1, role: 1 }).limit(limit),
    Listing.find({ deleted: { $ne: true }, $or: [{ title: opts }, { location: opts }, { category: opts }] }, { title: 1, category: 1, location: 1 }).limit(limit),
    Discussion.find({ deleted: { $ne: true }, $or: [{ title: opts }, { authorName: opts }, { category: opts }] }, { title: 1, authorName: 1, category: 1 }).limit(limit),
    News.find({ $or: [{ title: opts }, { summary: opts }, { category: opts }, { authorName: opts }] }, { title: 1, category: 1, status: 1 }).limit(limit),
  ]);

  res.json({
    results: [
      ...users.map((u: any) => ({ type: 'user', id: u.id || u._id, label: u.name, sub: u.email, role: u.role })),
      ...listings.map((l: any) => ({ type: 'listing', id: l.id, label: l.title, sub: l.location || l.category, category: l.category })),
      ...discussions.map((d: any) => ({ type: 'discussion', id: d.id, label: d.title, sub: d.authorName || d.category, category: d.category })),
      ...news.map((n: any) => ({ type: 'news', id: n.id || n._id, label: n.title, sub: n.category, status: n.status })),
    ],
  });
});

router.get('/audit-logs', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 25, maxLimit: 100 });
  const action = cleanString(req.query.action);
  const targetType = cleanString(req.query.targetType);
  const search = cleanString(req.query.search);

  let query: any = {};
  if (action && action !== 'all') query.action = action;
  if (targetType && targetType !== 'all') query.targetType = targetType;
  if (search) {
    const safeSearch = escapeRegExp(search);
    query = {
      ...query,
      $or: [
        { actorName: { $regex: safeSearch, $options: 'i' } },
        { actorEmail: { $regex: safeSearch, $options: 'i' } },
        { action: { $regex: safeSearch, $options: 'i' } },
        { targetType: { $regex: safeSearch, $options: 'i' } },
        { targetTitle: { $regex: safeSearch, $options: 'i' } },
        { targetId: { $regex: safeSearch, $options: 'i' } },
      ],
    };
  }

  const [logs, total] = await Promise.all([
    AdminAuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AdminAuditLog.countDocuments(query),
  ]);

  res.json(pagedResponse('auditLogs', logs.map((log: any) => {
    const item = log.toObject();
    delete item._id;
    delete item.__v;
    return item;
  }), total, page, limit));
});

/* -- Users -- */
router.get('/users', requirePermission('users'), async (req: Request, res: Response): Promise<void> => {
  const page   = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit  = Math.min(50, parseInt(req.query.limit as string) || 20);
  const search = String(req.query.search || '').trim();

  const query = withSearch(regularUserQuery({ deleted: { $ne: true } }), search);

  const [users, total] = await Promise.all([
    User.find(query, SAFE_USER_PROJECTION).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(query),
  ]);

  const userIds = users.map((u: any) => u.id);
  const counts  = await Listing.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c: any) => [c._id, c.count]));

  res.json({
    users: users.map((u: any) => ({
      id:          u.id,
      name:        u.name,
      email:       u.email,
      phone:       u.phone || '',
      role:        u.role || 'user',
      createdAt:   u.createdAt,
      listingCount: countMap[u.id] || 0,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

router.delete('/users/:id', requirePermission('users'), async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  if (req.params.id === req_.user!.id) {
    res.status(400).json({ error: 'Cannot delete your own account.' }); return;
  }
  const user = await User.findOne(regularUserQuery({ id: req.params.id }));
  if (!user) { res.status(404).json({ error: 'Regular user not found.' }); return; }
  const ownedListings = await Listing.find({ userId: user.id }, { id: 1 });
  const ownedListingIds = ownedListings.map((listing: any) => listing.id);

  const now = new Date();
  await Promise.all([
    Listing.updateMany({ userId: user.id }, { $set: { deleted: true, deletedAt: now } }),
    ownedListingIds.length
      ? User.updateMany(
        { savedListings: { $in: ownedListingIds } },
        { $pull: { savedListings: { $in: ownedListingIds } }, $set: { updatedAt: now } }
      )
      : Promise.resolve(),
  ]);
  user.deleted = true;
  user.deletedAt = now;
  await user.save();
  await recordAdminAudit(req, {
    action: 'regular_user.deleted',
    targetType: 'user',
    targetId: user.id,
    targetTitle: user.email,
  });
  res.json({ ok: true });
});

router.put('/users/:id/role', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  res.status(410).json({ error: 'Admin users must be created and managed from Admin Users.' });
});

router.get('/staff/permissions', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  res.json({ permissions: ASSIGNABLE_ADMIN_PERMISSIONS });
});

router.get('/staff', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  const page   = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit  = Math.min(50, parseInt(req.query.limit as string) || 20);
  const search = String(req.query.search || '').trim();
  const query = withSearch(adminUserQuery(), search);

  const [staffUsers, total] = await Promise.all([
    User.find(query, SAFE_USER_PROJECTION).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(query),
  ]);

  res.json({
    staff: staffUsers.map(staffResponse),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

router.get('/staff/:id', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  const staff = await User.findOne(adminUserQuery({ id: req.params.id }), SAFE_USER_PROJECTION);
  if (!staff) { res.status(404).json({ error: 'Admin user not found.' }); return; }
  res.json({ staff: staffResponse(staff) });
});

router.post('/staff', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');
  const permissions = normalizePermissions(req.body.permissions);

  if (!name || !email || !email.includes('@')) {
    res.status(400).json({ error: 'Name and a valid email are required.' }); return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' }); return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' }); return;
  }

  const staff = new User({
    id: uuidv4(),
    name,
    email,
    phone,
    password: await bcrypt.hash(password, 10),
    role: 'staff',
    permissions,
    emailVerified: true,
    createdBy: req_.user!.id,
  });
  await staff.save();
  await recordAdminAudit(req, {
    action: 'admin_user.created',
    targetType: 'staff',
    targetId: staff.id,
    targetTitle: staff.email,
    metadata: { permissions },
  });
  res.status(201).json({ staff: staffResponse(staff) });
});

router.put('/staff/:id', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  const staff = await User.findOne(adminUserQuery({ id: req.params.id }));
  if (!staff) { res.status(404).json({ error: 'Admin user not found.' }); return; }
  if (isSuperAdmin(staff)) {
    res.status(400).json({ error: 'Super admin accounts cannot be edited here.' }); return;
  }

  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = req.body.password === undefined ? '' : String(req.body.password || '');
  const permissions = normalizePermissions(req.body.permissions);

  if (!name || !email || !email.includes('@')) {
    res.status(400).json({ error: 'Name and a valid email are required.' }); return;
  }
  if (password && password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' }); return;
  }

  const existing = await User.findOne({ email });
  if (existing && existing.id !== staff.id) {
    res.status(409).json({ error: 'An account with this email already exists.' }); return;
  }

  staff.name = name;
  staff.email = email;
  staff.phone = phone;
  staff.role = 'staff';
  staff.permissions = permissions;
  staff.updatedAt = new Date();
  if (password) staff.password = await bcrypt.hash(password, 10);
  await staff.save();
  await recordAdminAudit(req, {
    action: 'admin_user.updated',
    targetType: 'staff',
    targetId: staff.id,
    targetTitle: staff.email,
    metadata: { permissions, passwordChanged: Boolean(password) },
  });

  res.json({ staff: staffResponse(staff) });
});

router.delete('/staff/:id', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  if (req.params.id === req_.user!.id) {
    res.status(400).json({ error: 'Cannot delete your own account.' }); return;
  }

  const staff = await User.findOne(adminUserQuery({ id: req.params.id }));
  if (!staff) { res.status(404).json({ error: 'Admin user not found.' }); return; }
  if (isSuperAdmin(staff)) {
    res.status(400).json({ error: 'Super admin accounts cannot be deleted here.' }); return;
  }

  staff.deleted = true;
  staff.deletedAt = new Date();
  await staff.save();
  await recordAdminAudit(req, {
    action: 'admin_user.deleted',
    targetType: 'staff',
    targetId: staff.id,
    targetTitle: staff.email,
  });
  res.json({ ok: true });
});

/* -- News -- */
router.get('/news', requirePermission('news'), async (req: Request, res: Response): Promise<void> => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const search = cleanString(req.query.search);
  const status = cleanString(req.query.status);
  const category = cleanString(req.query.category);

  let query: any = { deleted: { $ne: true } };
  if (status && status !== 'all') query.status = status === 'published' ? 'published' : 'draft';
  if (category && category !== 'all') query.category = category;
  if (search) query = { ...query, $text: { $search: search } };

  const [articles, total] = await Promise.all([
    News.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    News.countDocuments(query),
  ]);

  res.json(pagedResponse('news', articles.map((article: any) => normalizeNewsArticle(article, { includeBody: false })), total, page, limit));
});

router.get('/news/:id', requirePermission('news'), async (req: Request, res: Response): Promise<void> => {
  const article = await News.findOne({ $or: [{ id: req.params.id }, { slug: req.params.id }] });
  if (!article) { res.status(404).json({ error: 'News article not found.' }); return; }
  res.json({ article: normalizeNewsArticle(article, { includeBody: true }) });
});

router.post('/news', requirePermission('news'), async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const payload = getNewsPayload(req.body);
  if (payload.error) { res.status(400).json({ error: payload.error }); return; }

  const article = new News({
    id: uuidv4(),
    ...payload.value,
    slug: await createUniqueNewsSlug(payload.value.title),
    createdBy: req_.user!.id,
  });

  await article.save();
  await recordAdminAudit(req, {
    action: 'news.created',
    targetType: 'news',
    targetId: article.id,
    targetTitle: article.title,
    metadata: { status: article.status, category: article.category },
  });
  res.status(201).json({ article: normalizeNewsArticle(article, { includeBody: true }) });
});

router.put('/news/:id', requirePermission('news'), async (req: Request, res: Response): Promise<void> => {
  const article = await News.findOne({ id: req.params.id });
  if (!article) { res.status(404).json({ error: 'News article not found.' }); return; }

  const payload = getNewsPayload(req.body, article);
  if (payload.error) { res.status(400).json({ error: payload.error }); return; }

  Object.assign(article, payload.value);
  article.slug = await createUniqueNewsSlug(payload.value.title, article.id);
  await article.save();
  await recordAdminAudit(req, {
    action: 'news.updated',
    targetType: 'news',
    targetId: article.id,
    targetTitle: article.title,
    metadata: { status: article.status, category: article.category },
  });

  res.json({ article: normalizeNewsArticle(article, { includeBody: true }) });
});

router.delete('/news/:id', requirePermission('news'), async (req: Request, res: Response): Promise<void> => {
  const article = await News.findOne({ id: req.params.id, deleted: { $ne: true } });
  if (!article) { res.status(404).json({ error: 'News article not found.' }); return; }
  article.deleted = true;
  article.deletedAt = new Date();
  await article.save();
  await recordAdminAudit(req, {
    action: 'news.deleted',
    targetType: 'news',
    targetId: article.id,
    targetTitle: article.title,
  });
  res.json({ ok: true });
});

/* -- Listings -- */
router.get('/listings', requirePermission('listings'), async (req: Request, res: Response): Promise<void> => {
  const page     = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit    = Math.min(50, parseInt(req.query.limit as string) || 20);
  const search   = String(req.query.search || '').trim();
  const category = String(req.query.category || '').trim();

  const query: any = { deleted: { $ne: true } };
  Object.assign(query, listingCategoryFilter(category, ''));
  if (search) query.$text = { $search: search };

  const [listings, total] = await Promise.all([
    Listing.find(query, { images: 0, comments: 0, tags: 0 })
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Listing.countDocuments(query),
  ]);

  res.json({
    listings: listings.map((l: any) => l.toObject()),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

router.get('/listings/:id', requirePermission('listings'), async (req: Request, res: Response): Promise<void> => {
  const listing = await Listing.findOne({ id: req.params.id });
  if (!listing) { res.status(404).json({ error: 'Listing not found.' }); return; }
  res.json(listing.toObject());
});

router.put('/listings/:id', requirePermission('listings'), async (req: Request, res: Response): Promise<void> => {
  const EDITABLE = ['title', 'description', 'category', 'subcategory', 'location',
    'locationType', 'price', 'priceNote', 'availability', 'contactPhone', 'externalLink', 'tags'];
  const update: any = { updatedAt: new Date() };
  for (const key of EDITABLE) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  if (update.category !== undefined) update.category = normalizeCategory(update.category);
  const listing = await Listing.findOneAndUpdate({ id: req.params.id }, update, { new: true });
  if (!listing) { res.status(404).json({ error: 'Listing not found.' }); return; }
  es.indexListing(listing as any).catch(() => {});
  await recordAdminAudit(req, {
    action: 'listing.updated',
    targetType: 'listing',
    targetId: listing.id,
    targetTitle: listing.title,
    metadata: { category: listing.category },
  });
  res.json({ ok: true });
});

router.delete('/listings/:id', requirePermission('listings'), async (req: Request, res: Response): Promise<void> => {
  const listing = await Listing.findOne({ id: req.params.id, deleted: { $ne: true } });
  if (!listing) { res.status(404).json({ error: 'Listing not found.' }); return; }
  listing.deleted = true;
  listing.deletedAt = new Date();
  await listing.save();
  es.deleteListing(listing.id).catch(() => {});
  await recordAdminAudit(req, {
    action: 'listing.deleted',
    targetType: 'listing',
    targetId: listing.id,
    targetTitle: listing.title,
    metadata: { category: listing.category },
  });
  res.json({ ok: true });
});

/* -- Discussions -- */
router.get('/discussions', requirePermission('discussions'), async (req: Request, res: Response): Promise<void> => {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const search = cleanString(req.query.search);

  const baseQuery: any = { deleted: { $ne: true } };
  if (search) {
    const safeSearch = escapeRegExp(search);
    baseQuery.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { authorName: { $regex: safeSearch, $options: 'i' } },
      { category: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const [docs, total] = await Promise.all([
    Discussion.find(baseQuery, { body: 0 }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Discussion.countDocuments(baseQuery),
  ]);

  res.json({
    discussions: docs.map((d: any) => ({
      id: d.id,
      title: d.title,
      authorName: d.authorName,
      category: d.category,
      commentCount: d.comments?.length || 0,
      createdAt: d.createdAt,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

router.get('/discussions/:id', requirePermission('discussions'), async (req: Request, res: Response): Promise<void> => {
  const d = await Discussion.findOne({ id: req.params.id });
  if (!d) { res.status(404).json({ error: 'Discussion not found.' }); return; }
  res.json({
    id: d.id, title: d.title, body: d.body, authorName: d.authorName,
    category: d.category, tags: d.tags,
    commentCount: d.comments?.length || 0,
    comments: (d.comments || []).map((c: any) => ({
      id: c.id, authorName: c.authorName, body: c.body, createdAt: c.createdAt,
    })),
    createdAt: d.createdAt, updatedAt: d.updatedAt,
  });
});

router.post('/discussions', requirePermission('discussions'), async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const payload = getDiscussionPayload(req.body);
  if (payload.error) { res.status(400).json({ error: payload.error }); return; }

  const d = new Discussion({
    id: uuidv4(),
    userId: req_.user!.id,
    authorName: req_.user!.name || req_.user!.email || 'Biscoon Admin',
    ...payload.value,
    comments: [],
    createdAt: new Date(),
  });

  await d.save();
  await recordAdminAudit(req, {
    action: 'discussion.created',
    targetType: 'discussion',
    targetId: d.id,
    targetTitle: d.title,
    metadata: { category: d.category },
  });
  res.status(201).json({
    discussion: {
      id: d.id,
      title: d.title,
      body: d.body,
      authorName: d.authorName,
      category: d.category,
      tags: d.tags,
      commentCount: 0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    },
  });
});

router.put('/discussions/:id', requirePermission('discussions'), async (req: Request, res: Response): Promise<void> => {
  const payload = getDiscussionPayload(req.body);
  if (payload.error) { res.status(400).json({ error: payload.error }); return; }

  const d = await Discussion.findOneAndUpdate({ id: req.params.id }, payload.value, { new: true });
  if (!d) { res.status(404).json({ error: 'Discussion not found.' }); return; }
  es.indexDiscussion(d as any).catch(() => {});
  await recordAdminAudit(req, {
    action: 'discussion.updated',
    targetType: 'discussion',
    targetId: d.id,
    targetTitle: d.title,
    metadata: { category: d.category },
  });
  res.json({ ok: true });
});

router.delete('/discussions/:id', requirePermission('discussions'), async (req: Request, res: Response): Promise<void> => {
  const d = await Discussion.findOne({ id: req.params.id, deleted: { $ne: true } });
  if (!d) { res.status(404).json({ error: 'Discussion not found.' }); return; }
  d.deleted = true;
  d.deletedAt = new Date();
  await d.save();
  es.deleteDiscussion(d.id).catch(() => {});
  await recordAdminAudit(req, {
    action: 'discussion.deleted',
    targetType: 'discussion',
    targetId: d.id,
    targetTitle: d.title,
    metadata: { category: d.category },
  });
  res.json({ ok: true });
});

/* -- Conversations (metadata only -- no message bodies) -- */
router.get('/conversations', requirePermission('users'), async (req: Request, res: Response): Promise<void> => {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

  const [conversations, total] = await Promise.all([
    Conversation.aggregate([
      { $sort: { updatedAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: {
        _id: 0,
        id: 1,
        listingTitle: 1,
        participantNames: { $objectToArray: '$participantNames' },
        messageCount: { $size: '$messages' },
        updatedAt: 1,
        createdAt: 1,
      }},
    ]),
    Conversation.countDocuments(),
  ]);

  res.json({
    conversations: conversations.map((c: any) => ({
      id: c.id,
      listingTitle: c.listingTitle,
      participantNames: (c.participantNames || []).map((e: any) => e.v),
      messageCount: c.messageCount,
      updatedAt: c.updatedAt,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

/* -- Activity Feed -- */
router.get('/feed', async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const permissions = new Set(getAdminPermissions(req_.user));
  const [users, listings, discussions] = await Promise.all([
    permissions.has('users')
      ? User.find(regularUserQuery(), { id: 1, name: 1, email: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(10)
      : [],
    permissions.has('listings')
      ? Listing.find({}, { id: 1, title: 1, category: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(10)
      : [],
    permissions.has('discussions')
      ? Discussion.find({}, { id: 1, title: 1, authorName: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(10)
      : [],
  ]);

  const feed = [
    ...(users as any[]).map(u => ({ type: 'user', icon: '👤', title: u.name, sub: u.email, date: u.createdAt })),
    ...(listings as any[]).map(l => ({ type: 'listing', icon: '📋', title: l.title, sub: l.category, date: l.createdAt })),
    ...(discussions as any[]).map(d => ({ type: 'discussion', icon: '💬', title: d.title, sub: `by ${d.authorName}`, date: d.createdAt })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);

  res.json({ feed });
});

/* -- User detail -- */
router.get('/users/:id/content', requirePermission('users'), async (req: Request, res: Response): Promise<void> => {
  const user = await User.findOne(regularUserQuery({ id: req.params.id }), { id: 1 });
  if (!user) { res.status(404).json({ error: 'Regular user not found.' }); return; }
  const [listings, discussions] = await Promise.all([
    Listing.find({ userId: req.params.id }, { images: 0, comments: 0 }).sort({ createdAt: -1 }).limit(20),
    Discussion.find({ userId: req.params.id }, { body: 0 }).sort({ createdAt: -1 }).limit(20),
  ]);
  res.json({
    listings:    listings.map((l: any) => l.toObject()),
    discussions: discussions.map((d: any) => ({ id: d.id, title: d.title, category: d.category, commentCount: d.comments?.length || 0, createdAt: d.createdAt })),
  });
});

/* -- Comments moderation -- */
router.get('/comments', requirePermission('comments'), async (req: Request, res: Response): Promise<void> => {
  const type   = req.query.type || 'all';
  const page   = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit  = Math.min(50, parseInt(req.query.limit as string) || 25);
  const search = cleanString(req.query.search).toLowerCase();

  const results: any[] = [];

  if (type !== 'discussion') {
    const listings = await Listing.find({ 'comments.0': { $exists: true } }, { id: 1, title: 1, comments: 1 });
    for (const l of listings) {
      for (const c of (l.comments || [])) {
        results.push({ id: c.id, parentId: l.id, parentTitle: l.title, parentType: 'listing', authorName: c.authorName || '—', body: c.body, createdAt: c.createdAt });
      }
    }
  }

  if (type !== 'listing') {
    const discussions = await Discussion.find({ 'comments.0': { $exists: true } }, { id: 1, title: 1, comments: 1 });
    for (const d of discussions) {
      for (const c of (d.comments || [])) {
        results.push({ id: c.id, parentId: d.id, parentTitle: d.title, parentType: 'discussion', authorName: c.authorName || '—', body: c.body, createdAt: c.createdAt });
      }
    }
  }

  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = search
    ? results.filter(c =>
        c.body?.toLowerCase().includes(search) ||
        c.authorName?.toLowerCase().includes(search) ||
        c.parentTitle?.toLowerCase().includes(search)
      )
    : results;

  const total = filtered.length;
  res.json({ comments: filtered.slice((page - 1) * limit, page * limit), total, page, pages: Math.ceil(total / limit) });
});

/* -- Reports / Moderation -- */
router.get('/reports', requirePermission('reports'), async (req: Request, res: Response): Promise<void> => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 25, maxLimit: 50 });
  const status = String(req.query.status || '').trim();
  const query = status && status !== 'all' ? { status } : {};

  const [reports, total] = await Promise.all([
    Report.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(query),
  ]);

  res.json(pagedResponse('reports', reports.map((report: any) => {
    const item = report.toObject();
    delete item._id;
    delete item.__v;
    return item;
  }), total, page, limit));
});

router.put('/reports/:id/status', requirePermission('reports'), async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const status = String(req.body.status || '').trim();
  if (!['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
    res.status(400).json({ error: 'Invalid report status.' }); return;
  }

  const report = await Report.findOneAndUpdate(
    { id: req.params.id },
    {
      status,
      reviewedBy: req_.user!.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    },
    { new: true }
  );
  if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }
  await recordAdminAudit(req, {
    action: 'report.status_updated',
    targetType: 'report',
    targetId: report.id,
    targetTitle: report.targetType,
    metadata: { status: report.status, targetId: report.targetId },
  });
  res.json({ ok: true, status: report.status });
});

router.delete('/listings/:listingId/comments/:commentId', requirePermission('comments'), async (req: Request, res: Response): Promise<void> => {
  const listing = await Listing.findOne({ id: req.params.listingId }, { id: 1, title: 1 });
  await Listing.updateOne({ id: req.params.listingId }, { $pull: { comments: { id: req.params.commentId } } });
  await recordAdminAudit(req, {
    action: 'listing_comment.deleted',
    targetType: 'listing_comment',
    targetId: req.params.commentId,
    targetTitle: listing?.title || req.params.listingId,
    metadata: { listingId: req.params.listingId },
  });
  res.json({ ok: true });
});

router.delete('/discussions/:discussionId/comments/:commentId', requirePermission('comments'), async (req: Request, res: Response): Promise<void> => {
  const discussion = await Discussion.findOne({ id: req.params.discussionId }, { id: 1, title: 1 });
  await Discussion.updateOne({ id: req.params.discussionId }, { $pull: { comments: { id: req.params.commentId } } });
  await recordAdminAudit(req, {
    action: 'discussion_comment.deleted',
    targetType: 'discussion_comment',
    targetId: req.params.commentId,
    targetTitle: discussion?.title || req.params.discussionId,
    metadata: { discussionId: req.params.discussionId },
  });
  res.json({ ok: true });
});

/* -- Announcements -- */
router.get('/announcements', requirePermission('announcements'), async (req: Request, res: Response): Promise<void> => {
  const items = await Announcement.find({ deleted: { $ne: true } }).sort({ createdAt: -1 });
  res.json({ announcements: items });
});

router.post('/announcements', requirePermission('announcements'), async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const { title, body, type, expiresAt } = req.body;
  if (!title?.trim() || !body?.trim()) { res.status(400).json({ error: 'Title and body are required.' }); return; }
  const ann = new Announcement({
    id: uuidv4(),
    title: title.trim(),
    body: body.trim(),
    type: type || 'info',
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    createdBy: req_.user!.name || req_.user!.email,
  });
  await ann.save();
  await recordAdminAudit(req, {
    action: 'announcement.created',
    targetType: 'announcement',
    targetId: ann.id,
    targetTitle: ann.title,
    metadata: { type: ann.type, active: ann.active },
  });
  res.json({ ok: true, id: ann.id });
});

router.put('/announcements/:id/toggle', requirePermission('announcements'), async (req: Request, res: Response): Promise<void> => {
  const ann = await Announcement.findOne({ id: req.params.id });
  if (!ann) { res.status(404).json({ error: 'Not found.' }); return; }
  ann.active = !ann.active;
  await ann.save();
  await recordAdminAudit(req, {
    action: 'announcement.toggled',
    targetType: 'announcement',
    targetId: ann.id,
    targetTitle: ann.title,
    metadata: { active: ann.active },
  });
  res.json({ ok: true, active: ann.active });
});

router.delete('/announcements/:id', requirePermission('announcements'), async (req: Request, res: Response): Promise<void> => {
  const ann = await Announcement.findOne({ id: req.params.id, deleted: { $ne: true } });
  if (ann) { ann.deleted = true; ann.deletedAt = new Date(); await ann.save(); }
  await recordAdminAudit(req, {
    action: 'announcement.deleted',
    targetType: 'announcement',
    targetId: ann?.id || req.params.id,
    targetTitle: ann?.title || '',
  });
  res.json({ ok: true });
});

/* -- Trash (soft-deleted content) -- */
router.get('/trash', requireSuperAdmin, async (_req: Request, res: Response): Promise<void> => {
  const filter = { deleted: true };
  const [listings, discussions, news, announcements, spotlights, users] = await Promise.all([
    Listing.find(filter, { id: 1, title: 1, category: 1, userId: 1, deletedAt: 1 }).sort({ deletedAt: -1 }).limit(200),
    Discussion.find(filter, { id: 1, title: 1, authorName: 1, deletedAt: 1 }).sort({ deletedAt: -1 }).limit(200),
    News.find(filter, { id: 1, title: 1, status: 1, deletedAt: 1 }).sort({ deletedAt: -1 }).limit(200),
    Announcement.find(filter, { id: 1, title: 1, deletedAt: 1 }).sort({ deletedAt: -1 }).limit(200),
    HeroSpotlight.find(filter, { id: 1, title: 1, type: 1, deletedAt: 1 }).sort({ deletedAt: -1 }).limit(200),
    User.find(filter, { id: 1, name: 1, email: 1, role: 1, deletedAt: 1 }).sort({ deletedAt: -1 }).limit(200),
  ]);
  res.json({ listings, discussions, news, announcements, spotlights, users });
});

router.put('/trash/:type/:id/restore', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  const type = req.params.type as string;
  const id   = req.params.id as string;
  const ModelMap: Record<string, any> = {
    listing: Listing, discussion: Discussion, news: News,
    announcement: Announcement, spotlight: HeroSpotlight, user: User,
  };
  const Model = ModelMap[type];
  if (!Model) { res.status(400).json({ error: 'Unknown type.' }); return; }
  const doc = await Model.findOne({ id, deleted: true });
  if (!doc) { res.status(404).json({ error: 'Not found in trash.' }); return; }
  doc.deleted = false;
  doc.deletedAt = null;
  await doc.save();
  await recordAdminAudit(req, {
    action: `${type}.restored`,
    targetType: type,
    targetId: doc.id,
    targetTitle: doc.title || doc.name || doc.email || '',
  });
  res.json({ ok: true });
});

/* -- Hero Spotlights -- */
router.get('/spotlights', requirePermission('announcements'), async (_req: Request, res: Response): Promise<void> => {
  const items = await HeroSpotlight.find({ deleted: { $ne: true } }).sort({ order: 1, createdAt: -1 });
  res.json({ spotlights: items });
});

router.get('/spotlights/:id', requirePermission('announcements'), async (req: Request, res: Response): Promise<void> => {
  const spot = await HeroSpotlight.findOne({ id: req.params.id });
  if (!spot) { res.status(404).json({ error: 'Not found.' }); return; }
  res.json(spot);
});

router.post('/spotlights', requirePermission('announcements'), async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const { title, subtitle, body, badgeText, badgeColor, imageUrl, ctaText, ctaUrl, type, order, startDate, endDate } = req.body;
  if (!title?.trim()) { res.status(400).json({ error: 'Title is required.' }); return; }
  if (!imageUrl?.trim()) { res.status(400).json({ error: 'Image is required.' }); return; }
  const savedImageUrl = cleanSpotlightImage(imageUrl);
  if (!savedImageUrl) { res.status(400).json({ error: 'Invalid image. Provide an https:// URL or upload a JPG/PNG/WebP under 5MB.' }); return; }
  const spot = new HeroSpotlight({
    id: uuidv4(),
    title: title.trim(),
    subtitle: subtitle?.trim() || '',
    body: body?.trim() || '',
    badgeText: badgeText?.trim() || '',
    badgeColor: badgeColor?.trim() || '#C0392B',
    imageUrl: savedImageUrl,
    ctaText: ctaText?.trim() || '',
    ctaUrl: ctaUrl?.trim() || '',
    type: type || 'ad',
    order: typeof order === 'number' ? order : 0,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    createdBy: req_.user!.name || req_.user!.email,
  });
  await spot.save();
  await recordAdminAudit(req, {
    action: 'spotlight.created',
    targetType: 'spotlight',
    targetId: spot.id,
    targetTitle: spot.title,
  });
  res.json({ ok: true, id: spot.id });
});

router.put('/spotlights/:id', requirePermission('announcements'), async (req: Request, res: Response): Promise<void> => {
  const spot = await HeroSpotlight.findOne({ id: req.params.id });
  if (!spot) { res.status(404).json({ error: 'Not found.' }); return; }
  const { title, subtitle, body, badgeText, badgeColor, imageUrl, ctaText, ctaUrl, type, order, startDate, endDate } = req.body;
  if (title?.trim()) spot.title = title.trim();
  if (subtitle !== undefined) spot.subtitle = subtitle.trim();
  if (body !== undefined) spot.body = body.trim();
  if (badgeText !== undefined) spot.badgeText = badgeText.trim();
  if (badgeColor !== undefined) spot.badgeColor = badgeColor.trim();
  if (imageUrl?.trim()) {
    const saved = cleanSpotlightImage(imageUrl);
    if (saved) spot.imageUrl = saved;
  }
  if (ctaText !== undefined) spot.ctaText = ctaText.trim();
  if (ctaUrl !== undefined) spot.ctaUrl = ctaUrl.trim();
  if (type) spot.type = type;
  if (typeof order === 'number') spot.order = order;
  if (startDate !== undefined) spot.startDate = startDate ? new Date(startDate) : undefined;
  if (endDate !== undefined) spot.endDate = endDate ? new Date(endDate) : undefined;
  await spot.save();
  await recordAdminAudit(req, {
    action: 'spotlight.updated',
    targetType: 'spotlight',
    targetId: spot.id,
    targetTitle: spot.title,
  });
  res.json({ ok: true });
});

router.put('/spotlights/:id/toggle', requirePermission('announcements'), async (req: Request, res: Response): Promise<void> => {
  const spot = await HeroSpotlight.findOne({ id: req.params.id });
  if (!spot) { res.status(404).json({ error: 'Not found.' }); return; }
  spot.active = !spot.active;
  await spot.save();
  await recordAdminAudit(req, {
    action: 'spotlight.toggled',
    targetType: 'spotlight',
    targetId: spot.id,
    targetTitle: spot.title,
    metadata: { active: spot.active },
  });
  res.json({ ok: true, active: spot.active });
});

router.delete('/spotlights/:id', requirePermission('announcements'), async (req: Request, res: Response): Promise<void> => {
  const spot = await HeroSpotlight.findOne({ id: req.params.id, deleted: { $ne: true } });
  if (spot) { spot.deleted = true; spot.deletedAt = new Date(); await spot.save(); }
  await recordAdminAudit(req, {
    action: 'spotlight.deleted',
    targetType: 'spotlight',
    targetId: spot?.id || req.params.id,
    targetTitle: spot?.title || '',
  });
  res.json({ ok: true });
});

export default router;
