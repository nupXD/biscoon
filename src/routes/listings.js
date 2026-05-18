const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Listing = require('../models/Listing');
const authMiddleware = require('../middleware/auth');
const { findListingById, normalizeListing } = require('../utils/listings');
const { createNotification } = require('../utils/notifications');
const { findUserById } = require('../utils/users');

const router = express.Router();
const MAX_LISTING_COMMENTS = 300;
const MAX_LISTING_IMAGES = 6;
const MAX_LISTING_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_LISTING_TEXT_LENGTH = 5000;

function cleanString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function cleanTags(tags) {
  return Array.isArray(tags)
    ? tags.map(tag => cleanString(tag).slice(0, 40)).filter(Boolean).slice(0, 8)
    : [];
}

function getBase64Bytes(value) {
  const sanitized = value.replace(/\s+/g, '');
  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((sanitized.length * 3) / 4) - padding);
}

function parseImageDataUrl(dataUrl) {
  const match = /^data:(image\/[^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2].replace(/\s+/g, ''),
  };
}

function cleanImages(images) {
  return Array.isArray(images)
    ? images
      .map(image => cleanString(image))
      .filter(image => {
        
        if (!image) return false;
        if (/^https?:\/\//i.test(image) || !image.includes(':')) return true;
        if (!image.startsWith('data:image/')) return false;
        const parsed = parseImageDataUrl(image);
        if (!parsed) return false;
        const size = getBase64Bytes(parsed.base64);
        return size > 0 && size <= MAX_LISTING_IMAGE_BYTES;
      })
      .slice(0, MAX_LISTING_IMAGES)
    : [];
}

function cleanExternalLink(value) {
  const link = cleanString(value);
  if (!link) return '';

  try {
    const parsed = new URL(link);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function findRootListingComment(comments, comment) {
  let current = comment;
  const seen = new Set();
  while (current && current.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = comments.find(item => item.id === current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

router.post('/', authMiddleware, async (req, res) => {
  const {
    title,
    description,
    category,
    subcategory,
    availability,
    price,
    priceNote,
    location,
    locationType,
    contactEmail,
    contactPhone,
    contactPreference,
    externalLink,
    tags,
    images,
  } = req.body;

  const cleanTitle = cleanString(title).slice(0, 200);
  const cleanDescription = cleanString(description).slice(0, MAX_LISTING_TEXT_LENGTH);
  const cleanCategory = cleanString(category).slice(0, 80);
  const cleanSubcategory = cleanString(subcategory).slice(0, 120);
  const cleanLocation = cleanString(location).slice(0, 220);
  const cleanExternal = cleanExternalLink(externalLink);

  if (!cleanTitle || !cleanDescription || !cleanCategory || !cleanSubcategory || !cleanLocation) {
    return res.status(400).json({ error: 'Title, description, category, specific type, and location are required.' });
  }
  if (cleanExternal === null) {
    return res.status(400).json({ error: 'External link must start with http:// or https://.' });
  }

  const listing = new Listing({
    id: uuidv4(),
    userId: req.user.id,
    title: cleanTitle,
    description: cleanDescription,
    category: cleanCategory,
    subcategory: cleanSubcategory,
    availability: cleanString(availability).slice(0, 160),
    price: cleanString(price).slice(0, 120),
    priceNote: cleanString(priceNote).slice(0, 220),
    location: cleanLocation,
    locationType: cleanString(locationType).slice(0, 80),
    contactEmail: cleanString(contactEmail).slice(0, 200),
    contactPhone: cleanString(contactPhone).slice(0, 50),
    contactPreference: cleanString(contactPreference).slice(0, 80),
    externalLink: cleanExternal,
    tags: cleanTags(tags),
    images: cleanImages(images),
  });

  await listing.save();

  res.status(201).json({
    listing: normalizeListing(listing),
  });
});

router.get('/', async (req, res) => {
  const category = req.query.category;
  const subcategory = req.query.subcategory;
  const search = req.query.search;
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 0, 100);

  let query = {};
  if (category) query.category = category;
  if (subcategory) query.subcategory = subcategory;

  let listingsQuery;
  if (search) {
    listingsQuery = Listing.find({ $text: { $search: search }, ...query }).sort({ createdAt: -1 });
  } else {
    listingsQuery = Listing.find(query).sort({ createdAt: -1 });
  }

  if (limit) listingsQuery = listingsQuery.limit(limit);

  const listings = await listingsQuery;
  res.json({ listings: listings.map(normalizeListing) });
});

router.get('/mine', authMiddleware, async (req, res) => {
  const listings = await Listing.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json({ listings: listings.map(normalizeListing) });
});

router.get('/stats/summary', async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

  const [total, today, week, byCategory, bySubcategory, cityRows] = await Promise.all([
    Listing.countDocuments({}),
    Listing.countDocuments({ createdAt: { $gte: startOfToday } }),
    Listing.countDocuments({ createdAt: { $gte: startOfWeek } }),
    Listing.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Listing.aggregate([
      { $match: { subcategory: { $nin: [null, ''] } } },
      { $group: { _id: '$subcategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Listing.aggregate([
      { $match: { location: { $nin: [null, ''] } } },
      { $project: { city: { $trim: { input: { $arrayElemAt: [{ $split: ['$location', ','] }, 0] } } } } },
      { $match: { city: { $ne: '' } } },
      { $group: { _id: '$city' } },
      { $count: 'count' },
    ]),
  ]);

  res.json({
    total,
    today,
    week,
    cities: cityRows[0]?.count || 0,
    byCategory: byCategory.reduce((acc, item) => {
      acc[item._id || 'other'] = item.count;
      return acc;
    }, {}),
    bySubcategory: bySubcategory.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
  });
});

router.get('/:id', async (req, res) => {
  const listing = await findListingById(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found.' });
  }
  const normalized = normalizeListing(listing);
  if (listing.userId) {
    const author = await findUserById(listing.userId);
    if (author) normalized.authorName = author.name || author.email;
  }
  res.json(normalized);
});

router.post('/:id/comments', authMiddleware, async (req, res) => {
  const listing = await findListingById(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found.' });
  }

  const body = cleanString(req.body.body).slice(0, MAX_LISTING_TEXT_LENGTH);
  const parentId = cleanString(req.body.parentId);
  if (!body) {
    return res.status(400).json({ error: 'Comment text is required.' });
  }
  if (listing.comments.length >= MAX_LISTING_COMMENTS) {
    return res.status(413).json({ error: 'This listing has reached its maximum comment capacity.' });
  }

  const parentComment = parentId ? listing.comments.find(comment => comment.id === parentId) : null;
  if (parentId) {
    if (!parentComment) {
      return res.status(400).json({ error: 'Reply target was not found.' });
    }
    const rootComment = findRootListingComment(listing.comments, parentComment);
    const canReply = listing.userId === req.user.id || rootComment?.userId === req.user.id;
    if (!canReply) {
      return res.status(403).json({ error: 'Only the listing owner and original commenter can reply in this thread.' });
    }
  }

  listing.comments.push({
    id: uuidv4(),
    parentId,
    userId: req.user.id,
    authorName: req.user.name || req.user.email,
    body,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  listing.updatedAt = new Date();
  await listing.save();

  await createNotification({
    userId: parentComment ? parentComment.userId : listing.userId,
    actorId: req.user.id,
    actorName: req.user.name || req.user.email,
    type: parentComment ? 'listing_comment_reply' : 'listing_comment',
    title: parentComment ? 'New reply to your listing comment' : 'New comment on your listing',
    body,
    targetType: 'listing',
    targetId: listing.id,
    targetTitle: listing.title,
    url: `/pages/post/detail.html?id=${encodeURIComponent(listing.id)}`,
  });

  res.status(201).json({ listing: normalizeListing(listing) });
});

router.put('/:id', authMiddleware, async (req, res) => {
  const listing = await findListingById(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found.' });
  }
  if (listing.userId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to edit this listing.' });
  }

  const {
    title = listing.title,
    description = listing.description,
    category = listing.category,
    subcategory = listing.subcategory,
    availability = listing.availability,
    price = listing.price,
    priceNote = listing.priceNote,
    location = listing.location,
    locationType = listing.locationType,
    contactEmail = listing.contactEmail,
    contactPhone = listing.contactPhone,
    contactPreference = listing.contactPreference,
    externalLink = listing.externalLink,
    tags = listing.tags,
    images = listing.images,
  } = req.body;

  const cleanTitle = cleanString(title).slice(0, 200);
  const cleanDescription = cleanString(description).slice(0, MAX_LISTING_TEXT_LENGTH);
  const cleanCategory = cleanString(category).slice(0, 80);
  const cleanSubcategory = cleanString(subcategory).slice(0, 120);
  const cleanLocation = cleanString(location).slice(0, 220);
  const cleanExternal = cleanExternalLink(externalLink);

  if (!cleanTitle || !cleanDescription || !cleanCategory || !cleanSubcategory || !cleanLocation) {
    return res.status(400).json({ error: 'Title, description, category, specific type, and location are required.' });
  }
  if (cleanExternal === null) {
    return res.status(400).json({ error: 'External link must start with http:// or https://.' });
  }

  listing.title = cleanTitle;
  listing.description = cleanDescription;
  listing.category = cleanCategory;
  listing.subcategory = cleanSubcategory;
  listing.availability = cleanString(availability).slice(0, 160);
  listing.price = cleanString(price).slice(0, 120);
  listing.priceNote = cleanString(priceNote).slice(0, 220);
  listing.location = cleanLocation;
  listing.locationType = cleanString(locationType).slice(0, 80);
  listing.contactEmail = cleanString(contactEmail).slice(0, 200);
  listing.contactPhone = cleanString(contactPhone).slice(0, 50);
  listing.contactPreference = cleanString(contactPreference).slice(0, 80);
  listing.externalLink = cleanExternal;
  listing.tags = cleanTags(tags);
  listing.images = cleanImages(images);
  listing.updatedAt = new Date();

  await listing.save();

  res.json({
    listing: normalizeListing(listing),
  });
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const listing = await findListingById(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found.' });
  }
  if (listing.userId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to delete this listing.' });
  }

  await Listing.deleteOne({ id: listing.id });
  res.json({ success: true, message: 'Listing deleted successfully.' });
});

module.exports = router;
