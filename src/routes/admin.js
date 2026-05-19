const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Discussion = require('../models/Discussion');
const Conversation = require('../models/Conversation');
const Announcement = require('../models/Announcement');
const Report = require('../models/Report');
const News = require('../models/News');
const adminMiddleware = require('../middleware/admin');
const { getPagination, pagedResponse } = require('../utils/pagination');
const { listingCategoryFilter, normalizeCategory } = require('../utils/categories');
const { saveBase64Upload } = require('../utils/uploads');
const { createUniqueNewsSlug, normalizeNewsArticle } = require('../utils/news');
const {
  ADMIN_ACCOUNT_ROLES,
  ASSIGNABLE_ADMIN_PERMISSIONS,
  adminRoleLabel,
  getAdminPermissions,
  isSuperAdmin,
  normalizePermissions,
} = require('../utils/adminPermissions');

const router = express.Router();
router.use(...adminMiddleware);

const requirePermission = adminMiddleware.requirePermission;
const requireSuperAdmin = adminMiddleware.requireSuperAdmin;

function regularUserQuery(extra = {}) {
  return { role: 'user', ...extra };
}

function adminUserQuery(extra = {}) {
  return { role: { $in: ADMIN_ACCOUNT_ROLES }, ...extra };
}

function withSearch(query, search) {
  if (!search) return query;
  return {
    ...query,
    $or: [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ],
  };
}

function staffResponse(user) {
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

const NEWS_CATEGORIES = ['community', 'nepal', 'usa', 'business', 'immigration', 'culture', 'opinion', 'sports', 'technology', 'world'];
const MAX_NEWS_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_NEWS_VIDEO_BYTES = 18 * 1024 * 1024;
const MAX_NEWS_MEDIA_ITEMS = 24;
const MAX_DISCUSSION_BODY_LENGTH = 5000;

function cleanString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function cleanTags(tags) {
  const source = Array.isArray(tags) ? tags : cleanString(tags).split(',');
  return source
    .map(tag => cleanString(tag).slice(0, 40))
    .filter(Boolean)
    .slice(0, 8);
}

function getDiscussionPayload(body = {}) {
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

function getBase64Bytes(value) {
  const sanitized = value.replace(/\s+/g, '');
  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((sanitized.length * 3) / 4) - padding);
}

function parseNewsMediaDataUrl(dataUrl) {
  const match = /^data:((?:image|video)\/[^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2].replace(/\s+/g, ''),
  };
}

function cleanNewsImage(value) {
  const image = cleanString(value);
  if (!image) return '';
  if (/^https?:\/\//i.test(image) || image.startsWith('/uploads/')) return image;
  if (!image.startsWith('data:image/')) return null;

  const parsed = parseNewsMediaDataUrl(image);
  if (!parsed || getBase64Bytes(parsed.base64) > MAX_NEWS_IMAGE_BYTES) return null;
  return saveBase64Upload({ folder: 'news', mimeType: parsed.mimeType, base64: parsed.base64 });
}

function inferNewsMediaType(item = {}, parsed = null) {
  if (parsed?.mimeType?.startsWith('video/')) return 'video';
  if (parsed?.mimeType?.startsWith('image/')) return 'image';
  const explicitType = cleanString(item.type);
  return explicitType === 'video' ? 'video' : 'image';
}

function cleanNewsMediaUrl(value, type) {
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

function cleanNewsMedia(items = [], existingItems = []) {
  const source = Array.isArray(items) ? items : existingItems;
  const cleaned = [];

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

function getNewsPayload(body = {}, existingArticle = null) {
  const title = cleanString(body.title).slice(0, 180);
  const summary = cleanString(body.summary).slice(0, 360);
  const articleBody = cleanString(body.body).slice(0, 20000);
  const category = NEWS_CATEGORIES.includes(cleanString(body.category)) ? cleanString(body.category) : 'community';
  const status = cleanString(body.status) === 'published' ? 'published' : 'draft';
  const media = body.media === undefined && existingArticle
    ? cleanNewsMedia(existingArticle.media || [])
    : cleanNewsMedia(body.media || [], existingArticle?.media || []);
  let imageUrl = body.imageUrl === undefined && existingArticle ? existingArticle.imageUrl : cleanNewsImage(body.imageUrl);
  if (!imageUrl) {
    imageUrl = media.find(item => item.type === 'image')?.url || '';
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

/* ── Stats / Analytics ── */
router.get('/stats', async (req, res) => {
  const permissions = new Set(getAdminPermissions(req.user));
  const canViewUsers = permissions.has('users');
  const canViewListings = permissions.has('listings');
  const canViewDiscussions = permissions.has('discussions');
  const canViewNews = permissions.has('news');
  const now = new Date();
  const dayAgo   = new Date(now - 86400000);
  const weekAgo  = new Date(now - 7 * 86400000);
  const monthAgo = new Date(now - 30 * 86400000);

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
    User.find(regularUserQuery(), { id: 1, name: 1, email: 1, role: 1, createdAt: 1 })
      .sort({ createdAt: -1 }).limit(8),
    Listing.find({}, { id: 1, title: 1, category: 1, userId: 1, location: 1, createdAt: 1 })
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
    byCategory: canViewListings ? byCategory.map(c => ({ category: c._id || 'other', count: c.count })) : [],
    recentUsers: canViewUsers ? recentUsers.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role || 'user', createdAt: u.createdAt,
    })) : [],
    recentListings: canViewListings ? recentListings.map(l => ({
      id: l.id, title: l.title, category: l.category, location: l.location, createdAt: l.createdAt,
    })) : [],
  });
});

/* ── Users ── */
router.get('/users', requirePermission('users'), async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = Math.min(50, parseInt(req.query.limit) || 20);
  const search = String(req.query.search || '').trim();

  const query = withSearch(regularUserQuery(), search);

  const [users, total] = await Promise.all([
    User.find(query, { password: 0 }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(query),
  ]);

  const userIds = users.map(u => u.id);
  const counts  = await Listing.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map(c => [c._id, c.count]));

  res.json({
    users: users.map(u => ({
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

router.delete('/users/:id', requirePermission('users'), async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account.' });
  }
  const user = await User.findOne(regularUserQuery({ id: req.params.id }));
  if (!user) return res.status(404).json({ error: 'Regular user not found.' });

  await Promise.all([
    Listing.deleteMany({ userId: user.id }),
    User.deleteOne({ id: user.id }),
  ]);
  res.json({ ok: true });
});

router.put('/users/:id/role', requireSuperAdmin, async (req, res) => {
  res.status(410).json({ error: 'Admin users must be created and managed from Admin Users.' });
});

router.get('/staff/permissions', requireSuperAdmin, async (req, res) => {
  res.json({ permissions: ASSIGNABLE_ADMIN_PERMISSIONS });
});

router.get('/staff', requireSuperAdmin, async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = Math.min(50, parseInt(req.query.limit) || 20);
  const search = String(req.query.search || '').trim();
  const query = withSearch(adminUserQuery(), search);

  const [staffUsers, total] = await Promise.all([
    User.find(query, { password: 0 }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(query),
  ]);

  res.json({
    staff: staffUsers.map(staffResponse),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

router.get('/staff/:id', requireSuperAdmin, async (req, res) => {
  const staff = await User.findOne(adminUserQuery({ id: req.params.id }), { password: 0 });
  if (!staff) return res.status(404).json({ error: 'Admin user not found.' });
  res.json({ staff: staffResponse(staff) });
});

router.post('/staff', requireSuperAdmin, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');
  const permissions = normalizePermissions(req.body.permissions);

  if (!name || !email || !email.includes('@')) {
    return res.status(400).json({ error: 'Name and a valid email are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const staff = new User({
    id: uuidv4(),
    name,
    email,
    phone,
    password: await bcrypt.hash(password, 10),
    role: 'staff',
    permissions,
    createdBy: req.user.id,
  });
  await staff.save();
  res.status(201).json({ staff: staffResponse(staff) });
});

router.put('/staff/:id', requireSuperAdmin, async (req, res) => {
  const staff = await User.findOne(adminUserQuery({ id: req.params.id }));
  if (!staff) return res.status(404).json({ error: 'Admin user not found.' });
  if (isSuperAdmin(staff)) {
    return res.status(400).json({ error: 'Super admin accounts cannot be edited here.' });
  }

  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = req.body.password === undefined ? '' : String(req.body.password || '');
  const permissions = normalizePermissions(req.body.permissions);

  if (!name || !email || !email.includes('@')) {
    return res.status(400).json({ error: 'Name and a valid email are required.' });
  }
  if (password && password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existing = await User.findOne({ email });
  if (existing && existing.id !== staff.id) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  staff.name = name;
  staff.email = email;
  staff.phone = phone;
  staff.role = 'staff';
  staff.permissions = permissions;
  staff.updatedAt = new Date();
  if (password) staff.password = await bcrypt.hash(password, 10);
  await staff.save();

  res.json({ staff: staffResponse(staff) });
});

router.delete('/staff/:id', requireSuperAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account.' });
  }

  const staff = await User.findOne(adminUserQuery({ id: req.params.id }));
  if (!staff) return res.status(404).json({ error: 'Admin user not found.' });
  if (isSuperAdmin(staff)) {
    return res.status(400).json({ error: 'Super admin accounts cannot be deleted here.' });
  }

  await User.deleteOne({ id: staff.id });
  res.json({ ok: true });
});

/* ── News ── */
router.get('/news', requirePermission('news'), async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const search = cleanString(req.query.search);
  const status = cleanString(req.query.status);
  const category = cleanString(req.query.category);

  let query = {};
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

  res.json(pagedResponse('news', articles.map(article => normalizeNewsArticle(article, { includeBody: false })), total, page, limit));
});

router.get('/news/:id', requirePermission('news'), async (req, res) => {
  const article = await News.findOne({ $or: [{ id: req.params.id }, { slug: req.params.id }] });
  if (!article) return res.status(404).json({ error: 'News article not found.' });
  res.json({ article: normalizeNewsArticle(article, { includeBody: true }) });
});

router.post('/news', requirePermission('news'), async (req, res) => {
  const payload = getNewsPayload(req.body);
  if (payload.error) return res.status(400).json({ error: payload.error });

  const article = new News({
    id: uuidv4(),
    ...payload.value,
    slug: await createUniqueNewsSlug(payload.value.title),
    createdBy: req.user.id,
  });

  await article.save();
  res.status(201).json({ article: normalizeNewsArticle(article, { includeBody: true }) });
});

router.put('/news/:id', requirePermission('news'), async (req, res) => {
  const article = await News.findOne({ id: req.params.id });
  if (!article) return res.status(404).json({ error: 'News article not found.' });

  const payload = getNewsPayload(req.body, article);
  if (payload.error) return res.status(400).json({ error: payload.error });

  Object.assign(article, payload.value);
  article.slug = await createUniqueNewsSlug(payload.value.title, article.id);
  await article.save();

  res.json({ article: normalizeNewsArticle(article, { includeBody: true }) });
});

router.delete('/news/:id', requirePermission('news'), async (req, res) => {
  const article = await News.findOneAndDelete({ id: req.params.id });
  if (!article) return res.status(404).json({ error: 'News article not found.' });
  res.json({ ok: true });
});

/* ── Listings ── */
router.get('/listings', requirePermission('listings'), async (req, res) => {
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const limit    = Math.min(50, parseInt(req.query.limit) || 20);
  const search   = String(req.query.search || '').trim();
  const category = String(req.query.category || '').trim();

  const query = {};
  Object.assign(query, listingCategoryFilter(category, ''));
  if (search)   query.$text = { $search: search };

  const [listings, total] = await Promise.all([
    Listing.find(query, { images: 0, comments: 0, tags: 0 })
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Listing.countDocuments(query),
  ]);

  res.json({
    listings: listings.map(l => l.toObject()),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

router.get('/listings/:id', requirePermission('listings'), async (req, res) => {
  const listing = await Listing.findOne({ id: req.params.id });
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  res.json(listing.toObject());
});

router.put('/listings/:id', requirePermission('listings'), async (req, res) => {
  const EDITABLE = ['title', 'description', 'category', 'subcategory', 'location',
    'locationType', 'price', 'priceNote', 'availability', 'contactPhone', 'externalLink', 'tags'];
  const update = { updatedAt: new Date() };
  for (const key of EDITABLE) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  if (update.category !== undefined) update.category = normalizeCategory(update.category);
  const listing = await Listing.findOneAndUpdate({ id: req.params.id }, update, { new: true });
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  res.json({ ok: true });
});

router.delete('/listings/:id', requirePermission('listings'), async (req, res) => {
  const listing = await Listing.findOneAndDelete({ id: req.params.id });
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  res.json({ ok: true });
});

/* ── Discussions ── */
router.get('/discussions', requirePermission('discussions'), async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);

  const [docs, total] = await Promise.all([
    Discussion.find({}, { body: 0 }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Discussion.countDocuments(),
  ]);

  res.json({
    discussions: docs.map(d => ({
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

router.get('/discussions/:id', requirePermission('discussions'), async (req, res) => {
  const d = await Discussion.findOne({ id: req.params.id });
  if (!d) return res.status(404).json({ error: 'Discussion not found.' });
  res.json({
    id: d.id, title: d.title, body: d.body, authorName: d.authorName,
    category: d.category, tags: d.tags,
    commentCount: d.comments?.length || 0,
    comments: (d.comments || []).map(c => ({
      id: c.id, authorName: c.authorName, body: c.body, createdAt: c.createdAt,
    })),
    createdAt: d.createdAt, updatedAt: d.updatedAt,
  });
});

router.post('/discussions', requirePermission('discussions'), async (req, res) => {
  const payload = getDiscussionPayload(req.body);
  if (payload.error) return res.status(400).json({ error: payload.error });

  const d = new Discussion({
    id: uuidv4(),
    userId: req.user.id,
    authorName: req.user.name || req.user.email || 'Biscoon Admin',
    ...payload.value,
    comments: [],
    createdAt: new Date(),
  });

  await d.save();
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

router.put('/discussions/:id', requirePermission('discussions'), async (req, res) => {
  const payload = getDiscussionPayload(req.body);
  if (payload.error) return res.status(400).json({ error: payload.error });

  const d = await Discussion.findOneAndUpdate({ id: req.params.id }, payload.value, { new: true });
  if (!d) return res.status(404).json({ error: 'Discussion not found.' });
  res.json({ ok: true });
});

router.delete('/discussions/:id', requirePermission('discussions'), async (req, res) => {
  const d = await Discussion.findOneAndDelete({ id: req.params.id });
  if (!d) return res.status(404).json({ error: 'Discussion not found.' });
  res.json({ ok: true });
});

/* ── Conversations (metadata only — no message bodies) ── */
router.get('/conversations', requirePermission('users'), async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);

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
    conversations: conversations.map(c => ({
      id: c.id,
      listingTitle: c.listingTitle,
      participantNames: (c.participantNames || []).map(e => e.v),
      messageCount: c.messageCount,
      updatedAt: c.updatedAt,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

/* ── Activity Feed ── */
router.get('/feed', async (req, res) => {
  const permissions = new Set(getAdminPermissions(req.user));
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
    ...users.map(u => ({ type: 'user', icon: '👤', title: u.name, sub: u.email, date: u.createdAt })),
    ...listings.map(l => ({ type: 'listing', icon: '📋', title: l.title, sub: l.category, date: l.createdAt })),
    ...discussions.map(d => ({ type: 'discussion', icon: '💬', title: d.title, sub: `by ${d.authorName}`, date: d.createdAt })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

  res.json({ feed });
});

/* ── User detail ── */
router.get('/users/:id/content', requirePermission('users'), async (req, res) => {
  const user = await User.findOne(regularUserQuery({ id: req.params.id }), { id: 1 });
  if (!user) return res.status(404).json({ error: 'Regular user not found.' });
  const [listings, discussions] = await Promise.all([
    Listing.find({ userId: req.params.id }, { images: 0, comments: 0 }).sort({ createdAt: -1 }).limit(20),
    Discussion.find({ userId: req.params.id }, { body: 0 }).sort({ createdAt: -1 }).limit(20),
  ]);
  res.json({
    listings:    listings.map(l => l.toObject()),
    discussions: discussions.map(d => ({ id: d.id, title: d.title, category: d.category, commentCount: d.comments?.length || 0, createdAt: d.createdAt })),
  });
});

/* ── Comments moderation ── */
router.get('/comments', requirePermission('comments'), async (req, res) => {
  const type  = req.query.type || 'all';
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 25);

  const results = [];

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

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = results.length;
  res.json({ comments: results.slice((page - 1) * limit, page * limit), total, page, pages: Math.ceil(total / limit) });
});

/* ── Reports / Moderation ── */
router.get('/reports', requirePermission('reports'), async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 25, maxLimit: 50 });
  const status = String(req.query.status || '').trim();
  const query = status && status !== 'all' ? { status } : {};

  const [reports, total] = await Promise.all([
    Report.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(query),
  ]);

  res.json(pagedResponse('reports', reports.map(report => {
    const item = report.toObject();
    delete item._id;
    delete item.__v;
    return item;
  }), total, page, limit));
});

router.put('/reports/:id/status', requirePermission('reports'), async (req, res) => {
  const status = String(req.body.status || '').trim();
  if (!['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid report status.' });
  }

  const report = await Report.findOneAndUpdate(
    { id: req.params.id },
    {
      status,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    },
    { new: true }
  );
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  res.json({ ok: true, status: report.status });
});

router.delete('/listings/:listingId/comments/:commentId', requirePermission('comments'), async (req, res) => {
  await Listing.updateOne({ id: req.params.listingId }, { $pull: { comments: { id: req.params.commentId } } });
  res.json({ ok: true });
});

router.delete('/discussions/:discussionId/comments/:commentId', requirePermission('comments'), async (req, res) => {
  await Discussion.updateOne({ id: req.params.discussionId }, { $pull: { comments: { id: req.params.commentId } } });
  res.json({ ok: true });
});

/* ── Announcements ── */
router.get('/announcements', requirePermission('announcements'), async (req, res) => {
  const items = await Announcement.find().sort({ createdAt: -1 });
  res.json({ announcements: items });
});

router.post('/announcements', requirePermission('announcements'), async (req, res) => {
  const { title, body, type, expiresAt } = req.body;
  if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'Title and body are required.' });
  const ann = new Announcement({
    id: uuidv4(),
    title: title.trim(),
    body: body.trim(),
    type: type || 'info',
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    createdBy: req.user.name || req.user.email,
  });
  await ann.save();
  res.json({ ok: true, id: ann.id });
});

router.put('/announcements/:id/toggle', requirePermission('announcements'), async (req, res) => {
  const ann = await Announcement.findOne({ id: req.params.id });
  if (!ann) return res.status(404).json({ error: 'Not found.' });
  ann.active = !ann.active;
  await ann.save();
  res.json({ ok: true, active: ann.active });
});

router.delete('/announcements/:id', requirePermission('announcements'), async (req, res) => {
  await Announcement.findOneAndDelete({ id: req.params.id });
  res.json({ ok: true });
});

module.exports = router;
