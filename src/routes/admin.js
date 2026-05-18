const express = require('express');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Discussion = require('../models/Discussion');
const Conversation = require('../models/Conversation');
const Announcement = require('../models/Announcement');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();
router.use(...adminMiddleware);

/* ── Stats / Analytics ── */
router.get('/stats', async (req, res) => {
  const now = new Date();
  const dayAgo   = new Date(now - 86400000);
  const weekAgo  = new Date(now - 7 * 86400000);
  const monthAgo = new Date(now - 30 * 86400000);

  const [
    totalUsers, usersToday, usersThisWeek, usersThisMonth,
    totalListings, listingsToday, listingsThisWeek,
    totalDiscussions, discussionsThisWeek,
    totalConversations,
    byCategory,
    recentUsers,
    recentListings,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: dayAgo } }),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    User.countDocuments({ createdAt: { $gte: monthAgo } }),
    Listing.countDocuments(),
    Listing.countDocuments({ createdAt: { $gte: dayAgo } }),
    Listing.countDocuments({ createdAt: { $gte: weekAgo } }),
    Discussion.countDocuments(),
    Discussion.countDocuments({ createdAt: { $gte: weekAgo } }),
    Conversation.countDocuments(),
    Listing.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    User.find({}, { id: 1, name: 1, email: 1, role: 1, createdAt: 1 })
      .sort({ createdAt: -1 }).limit(8),
    Listing.find({}, { id: 1, title: 1, category: 1, userId: 1, location: 1, createdAt: 1 })
      .sort({ createdAt: -1 }).limit(8),
  ]);

  res.json({
    users:     { total: totalUsers, today: usersToday, thisWeek: usersThisWeek, thisMonth: usersThisMonth },
    listings:  { total: totalListings, today: listingsToday, thisWeek: listingsThisWeek },
    discussions: { total: totalDiscussions, thisWeek: discussionsThisWeek },
    conversations: { total: totalConversations },
    byCategory: byCategory.map(c => ({ category: c._id || 'other', count: c.count })),
    recentUsers: recentUsers.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role || 'user', createdAt: u.createdAt,
    })),
    recentListings: recentListings.map(l => ({
      id: l.id, title: l.title, category: l.category, location: l.location, createdAt: l.createdAt,
    })),
  });
});

/* ── Users ── */
router.get('/users', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = Math.min(50, parseInt(req.query.limit) || 20);
  const search = String(req.query.search || '').trim();

  const query = search
    ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
    : {};

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

router.delete('/users/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account.' });
  }
  const user = await User.findOne({ id: req.params.id });
  if (!user) return res.status(404).json({ error: 'User not found.' });

  await Promise.all([
    Listing.deleteMany({ userId: user.id }),
    User.deleteOne({ id: user.id }),
  ]);
  res.json({ ok: true });
});

router.put('/users/:id/role', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own role.' });
  }
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "user" or "admin".' });
  }
  const user = await User.findOneAndUpdate({ id: req.params.id }, { role }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ ok: true, role: user.role });
});

/* ── Listings ── */
router.get('/listings', async (req, res) => {
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const limit    = Math.min(50, parseInt(req.query.limit) || 20);
  const search   = String(req.query.search || '').trim();
  const category = String(req.query.category || '').trim();

  const query = {};
  if (category) query.category = category;
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

router.get('/listings/:id', async (req, res) => {
  const listing = await Listing.findOne({ id: req.params.id }, { images: 0 });
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  res.json(listing.toObject());
});

router.put('/listings/:id', async (req, res) => {
  const EDITABLE = ['title', 'description', 'category', 'subcategory', 'location',
    'locationType', 'price', 'priceNote', 'availability', 'contactPhone', 'externalLink', 'tags'];
  const update = { updatedAt: new Date() };
  for (const key of EDITABLE) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  const listing = await Listing.findOneAndUpdate({ id: req.params.id }, update, { new: true });
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  res.json({ ok: true });
});

router.delete('/listings/:id', async (req, res) => {
  const listing = await Listing.findOneAndDelete({ id: req.params.id });
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  res.json({ ok: true });
});

/* ── Discussions ── */
router.get('/discussions', async (req, res) => {
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

router.get('/discussions/:id', async (req, res) => {
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

router.put('/discussions/:id', async (req, res) => {
  const EDITABLE = ['title', 'body', 'category', 'tags'];
  const update = { updatedAt: new Date() };
  for (const key of EDITABLE) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  const d = await Discussion.findOneAndUpdate({ id: req.params.id }, update, { new: true });
  if (!d) return res.status(404).json({ error: 'Discussion not found.' });
  res.json({ ok: true });
});

router.delete('/discussions/:id', async (req, res) => {
  const d = await Discussion.findOneAndDelete({ id: req.params.id });
  if (!d) return res.status(404).json({ error: 'Discussion not found.' });
  res.json({ ok: true });
});

/* ── Conversations (metadata only — no message bodies) ── */
router.get('/conversations', async (req, res) => {
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
  const [users, listings, discussions] = await Promise.all([
    User.find({}, { id: 1, name: 1, email: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(10),
    Listing.find({}, { id: 1, title: 1, category: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(10),
    Discussion.find({}, { id: 1, title: 1, authorName: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(10),
  ]);

  const feed = [
    ...users.map(u => ({ type: 'user', icon: '👤', title: u.name, sub: u.email, date: u.createdAt })),
    ...listings.map(l => ({ type: 'listing', icon: '📋', title: l.title, sub: l.category, date: l.createdAt })),
    ...discussions.map(d => ({ type: 'discussion', icon: '💬', title: d.title, sub: `by ${d.authorName}`, date: d.createdAt })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

  res.json({ feed });
});

/* ── User detail ── */
router.get('/users/:id/content', async (req, res) => {
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
router.get('/comments', async (req, res) => {
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

router.delete('/listings/:listingId/comments/:commentId', async (req, res) => {
  await Listing.updateOne({ id: req.params.listingId }, { $pull: { comments: { id: req.params.commentId } } });
  res.json({ ok: true });
});

router.delete('/discussions/:discussionId/comments/:commentId', async (req, res) => {
  await Discussion.updateOne({ id: req.params.discussionId }, { $pull: { comments: { id: req.params.commentId } } });
  res.json({ ok: true });
});

/* ── Announcements ── */
router.get('/announcements', async (req, res) => {
  const items = await Announcement.find().sort({ createdAt: -1 });
  res.json({ announcements: items });
});

router.post('/announcements', async (req, res) => {
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

router.put('/announcements/:id/toggle', async (req, res) => {
  const ann = await Announcement.findOne({ id: req.params.id });
  if (!ann) return res.status(404).json({ error: 'Not found.' });
  ann.active = !ann.active;
  await ann.save();
  res.json({ ok: true, active: ann.active });
});

router.delete('/announcements/:id', async (req, res) => {
  await Announcement.findOneAndDelete({ id: req.params.id });
  res.json({ ok: true });
});

module.exports = router;
