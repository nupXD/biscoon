const express = require('express');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const Listing = require('../models/Listing');
const authMiddleware = require('../middleware/auth');
const { findListingById, normalizeListing } = require('../utils/listings');
const { createNotification } = require('../utils/notifications');
const { findUserById } = require('../utils/users');
const { getPagination, pagedResponse } = require('../utils/pagination');
const { validate } = require('../utils/validate');
const { saveBase64Upload } = require('../utils/uploads');
const { listingCategoryFilter, normalizeCategory } = require('../utils/categories');

const router = express.Router();
const MAX_LISTING_COMMENTS = 300;
const MAX_LISTING_IMAGES = 6;
const MAX_PHOTOGRAPHY_IMAGES = 12;
const MAX_LISTING_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_LISTING_TEXT_LENGTH = 5000;

const listingPayloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(MAX_LISTING_TEXT_LENGTH),
  category: z.string().trim().min(1).max(80),
  subcategory: z.string().trim().min(1).max(120),
  availability: z.string().optional().default(''),
  price: z.string().optional().default(''),
  priceNote: z.string().optional().default(''),
  location: z.string().trim().max(220).optional().default(''),
  locationType: z.string().optional().default(''),
  contactEmail: z.string().optional().default(''),
  contactPhone: z.string().optional().default(''),
  contactPreference: z.string().optional().default(''),
  externalLink: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
});

const partialListingPayloadSchema = listingPayloadSchema.partial();

const commentPayloadSchema = z.object({
  body: z.string().trim().min(1).max(MAX_LISTING_TEXT_LENGTH),
  parentId: z.string().optional().default(''),
});

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

function maxImagesForCategory(category) {
  return category === 'photography' ? MAX_PHOTOGRAPHY_IMAGES : MAX_LISTING_IMAGES;
}

function cleanImages(images, category = '') {
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
      .map(image => {
        if (!image.startsWith('data:image/')) return image;
        const parsed = parseImageDataUrl(image);
        return saveBase64Upload({ folder: 'listings', mimeType: parsed.mimeType, base64: parsed.base64 });
      })
      .slice(0, maxImagesForCategory(category))
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
  const parsedPayload = validate(listingPayloadSchema, req.body);
  if (parsedPayload.error) return res.status(400).json({ error: parsedPayload.error });

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
  } = parsedPayload.value;

  const cleanTitle = cleanString(title).slice(0, 200);
  const cleanDescription = cleanString(description).slice(0, MAX_LISTING_TEXT_LENGTH);
  const cleanCategory = normalizeCategory(cleanString(category).slice(0, 80));
  const isPhotographyListing = cleanCategory === 'photography';
  const cleanSubcategory = cleanString(subcategory).slice(0, 120);
  const cleanLocation = (cleanString(location) || (isPhotographyListing ? 'Photography showcase' : '')).slice(0, 220);
  const cleanExternal = cleanExternalLink(externalLink);
  const cleanedImages = cleanImages(images, cleanCategory);

  if (!cleanTitle || !cleanDescription || !cleanCategory || !cleanSubcategory || !cleanLocation) {
    return res.status(400).json({ error: 'Title, description, category, specific type, and location are required.' });
  }
  if (isPhotographyListing && !cleanedImages.length) {
    return res.status(400).json({ error: 'Photography posts require at least one photo.' });
  }
  if (!isPhotographyListing && cleanExternal === null) {
    return res.status(400).json({ error: 'External link must start with http:// or https://.' });
  }

  const listing = new Listing({
    id: uuidv4(),
    userId: req.user.id,
    title: cleanTitle,
    description: cleanDescription,
    category: cleanCategory,
    subcategory: cleanSubcategory,
    availability: isPhotographyListing ? '' : cleanString(availability).slice(0, 160),
    price: isPhotographyListing ? '' : cleanString(price).slice(0, 120),
    priceNote: isPhotographyListing ? '' : cleanString(priceNote).slice(0, 220),
    location: cleanLocation,
    locationType: isPhotographyListing ? 'showcase' : cleanString(locationType).slice(0, 80),
    contactEmail: isPhotographyListing ? '' : cleanString(contactEmail).slice(0, 200),
    contactPhone: isPhotographyListing ? '' : cleanString(contactPhone).slice(0, 50),
    contactPreference: isPhotographyListing ? '' : cleanString(contactPreference).slice(0, 80),
    externalLink: isPhotographyListing ? '' : cleanExternal,
    tags: cleanTags(tags),
    images: cleanedImages,
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
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 24, maxLimit: 100 });

  let query = listingCategoryFilter(category, subcategory);

  if (search) query = { $text: { $search: search }, ...query };

  const [listings, total] = await Promise.all([
    Listing.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Listing.countDocuments(query),
  ]);
  res.json(pagedResponse('listings', listings.map(normalizeListing), total, page, limit));
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

  const parsedPayload = validate(commentPayloadSchema, req.body);
  if (parsedPayload.error) return res.status(400).json({ error: parsedPayload.error });
  const { body, parentId } = parsedPayload.value;
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

  const parsedPayload = validate(partialListingPayloadSchema, req.body);
  if (parsedPayload.error) return res.status(400).json({ error: parsedPayload.error });

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
  } = parsedPayload.value;

  const cleanTitle = cleanString(title).slice(0, 200);
  const cleanDescription = cleanString(description).slice(0, MAX_LISTING_TEXT_LENGTH);
  const cleanCategory = normalizeCategory(cleanString(category).slice(0, 80));
  const isPhotographyListing = cleanCategory === 'photography';
  const cleanSubcategory = cleanString(subcategory).slice(0, 120);
  const cleanLocation = (cleanString(location) || (isPhotographyListing ? 'Photography showcase' : '')).slice(0, 220);
  const cleanExternal = cleanExternalLink(externalLink);
  const cleanedImages = cleanImages(images, cleanCategory);

  if (!cleanTitle || !cleanDescription || !cleanCategory || !cleanSubcategory || !cleanLocation) {
    return res.status(400).json({ error: 'Title, description, category, specific type, and location are required.' });
  }
  if (isPhotographyListing && !cleanedImages.length) {
    return res.status(400).json({ error: 'Photography posts require at least one photo.' });
  }
  if (!isPhotographyListing && cleanExternal === null) {
    return res.status(400).json({ error: 'External link must start with http:// or https://.' });
  }

  listing.title = cleanTitle;
  listing.description = cleanDescription;
  listing.category = cleanCategory;
  listing.subcategory = cleanSubcategory;
  listing.availability = isPhotographyListing ? '' : cleanString(availability).slice(0, 160);
  listing.price = isPhotographyListing ? '' : cleanString(price).slice(0, 120);
  listing.priceNote = isPhotographyListing ? '' : cleanString(priceNote).slice(0, 220);
  listing.location = cleanLocation;
  listing.locationType = isPhotographyListing ? 'showcase' : cleanString(locationType).slice(0, 80);
  listing.contactEmail = isPhotographyListing ? '' : cleanString(contactEmail).slice(0, 200);
  listing.contactPhone = isPhotographyListing ? '' : cleanString(contactPhone).slice(0, 50);
  listing.contactPreference = isPhotographyListing ? '' : cleanString(contactPreference).slice(0, 80);
  listing.externalLink = isPhotographyListing ? '' : cleanExternal;
  listing.tags = cleanTags(tags);
  listing.images = cleanedImages;
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
