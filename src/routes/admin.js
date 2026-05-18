const express = require('express');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Discussion = require('../models/Discussion');
const Conversation = require('../models/Conversation');
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
      id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt,
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
    users: users.map(u => ({ ...u.toObject(), listingCount: countMap[u.id] || 0 })),
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
    category: d.category, tags: d.tags, commentCount: d.comments?.length || 0,
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

module.exports = router;
