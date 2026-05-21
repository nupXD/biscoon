import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User';
import Listing from '../models/Listing';
import authMiddleware from '../middleware/auth';
import requireVerifiedEmail from '../middleware/requireVerifiedEmail';
import { findListingById, normalizeListing } from '../utils/listings';
import { createNotification } from '../utils/notifications';
import { findUserById } from '../utils/users';
import { getPagination, pagedResponse } from '../utils/pagination';
import { validate } from '../utils/validate';
import { saveBase64Upload } from '../utils/uploads';
import { listingCategoryFilter, normalizeCategory } from '../utils/categories';
import * as es from '../services/elasticsearch';
import type { AuthRequest } from '../types';

const router = Router();
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

function cleanString(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function cleanTags(tags: unknown): string[] {
  return Array.isArray(tags)
    ? tags.map(tag => cleanString(tag).slice(0, 40)).filter(Boolean).slice(0, 8)
    : [];
}

function getBase64Bytes(value: string): number {
  const sanitized = value.replace(/\s+/g, '');
  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((sanitized.length * 3) / 4) - padding);
}

function parseImageDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = /^data:(image\/[^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2].replace(/\s+/g, ''),
  };
}

function maxImagesForCategory(category: string): number {
  return category === 'photography' ? MAX_PHOTOGRAPHY_IMAGES : MAX_LISTING_IMAGES;
}

function cleanImages(images: unknown, category = ''): string[] {
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
        const parsed = parseImageDataUrl(image)!;
        return saveBase64Upload({ folder: 'listings', mimeType: parsed.mimeType, base64: parsed.base64 });
      })
      .slice(0, maxImagesForCategory(category))
    : [];
}

function cleanExternalLink(value: unknown): string | null {
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

function findRootListingComment(comments: any[], comment: any): any {
  let current = comment;
  const seen = new Set<string>();
  while (current && current.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = comments.find(item => item.id === current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

router.post('/', authMiddleware, requireVerifiedEmail, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const parsedPayload = validate(listingPayloadSchema, req.body);
  if (parsedPayload.error) { res.status(400).json({ error: parsedPayload.error }); return; }

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
    res.status(400).json({ error: 'Title, description, category, specific type, and location are required.' }); return;
  }
  if (isPhotographyListing && !cleanedImages.length) {
    res.status(400).json({ error: 'Photography posts require at least one photo.' }); return;
  }
  if (!isPhotographyListing && cleanExternal === null) {
    res.status(400).json({ error: 'External link must start with http:// or https://.' }); return;
  }

  const listing = new Listing({
    id: uuidv4(),
    userId: req_.user!.id,
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
  es.indexListing(listing as any).catch(() => {});

  res.status(201).json({
    listing: normalizeListing(listing),
  });
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const category = req.query.category as string | undefined;
  const subcategory = req.query.subcategory as string | undefined;
  const search = req.query.search as string | undefined;
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 24, maxLimit: 100 });

  // Try Elasticsearch first; fall back to MongoDB text search
  if (search && await es.isAvailable()) {
    try {
      const { ids, total } = await es.searchListings({ search, category, subcategory, limit, skip });
      if (!ids.length) { res.json(pagedResponse('listings', [], total, page, limit)); return; }

      const docs = await Listing.find({ id: { $in: ids } });
      const order = new Map(ids.map((id: string, i: number) => [id, i]));
      docs.sort((a: any, b: any) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
      res.json(pagedResponse('listings', docs.map(normalizeListing), total, page, limit)); return;
    } catch (err: any) {
      console.warn('[ES] searchListings failed, falling back to MongoDB:', err.message);
    }
  }

  // MongoDB fallback
  let query: any = { deleted: { $ne: true }, ...listingCategoryFilter(category, subcategory) };
  if (search) query = { $text: { $search: search }, ...query };

  const [listings, total] = await Promise.all([
    Listing.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Listing.countDocuments(query),
  ]);
  res.json(pagedResponse('listings', listings.map(normalizeListing), total, page, limit));
});

router.get('/mine', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const listings = await Listing.find({ userId: req_.user!.id }).sort({ createdAt: -1 });
  res.json({ listings: listings.map(normalizeListing) });
});

router.get('/saved', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const user = await findUserById(req_.user!.id);
  if (!user) { res.status(404).json({ error: 'User not found.' }); return; }

  const savedIds = Array.isArray(user.savedListings) ? user.savedListings.slice(0, 200) : [];
  if (!savedIds.length) { res.json({ listings: [] }); return; }

  const listings = await Listing.find({ id: { $in: savedIds } });
  const listingMap = new Map(listings.map((listing: any) => [listing.id, listing]));
  const orderedListings = savedIds
    .map((id: string) => listingMap.get(id))
    .filter(Boolean)
    .map((listing: any) => ({ ...normalizeListing(listing), savedByMe: true }));

  res.json({ listings: orderedListings });
});

router.get('/stats/summary', async (req: Request, res: Response): Promise<void> => {
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
    byCategory: byCategory.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id || 'other'] = item.count;
      return acc;
    }, {}),
    bySubcategory: bySubcategory.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
  });
});

router.get('/:id/save', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const user = await findUserById(req_.user!.id);
  if (!user) { res.status(404).json({ error: 'User not found.' }); return; }
  const saved = Array.isArray(user.savedListings) && user.savedListings.includes(req.params.id as string);
  res.json({ saved });
});

router.post('/:id/save', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const listing = await findListingById(req.params.id as string);
  if (!listing) { res.status(404).json({ error: 'Listing not found.' }); return; }

  await User.updateOne(
    { id: req_.user!.id },
    { $addToSet: { savedListings: listing.id }, $set: { updatedAt: new Date() } }
  );
  res.json({ saved: true });
});

router.delete('/:id/save', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  await User.updateOne(
    { id: req_.user!.id },
    { $pull: { savedListings: req.params.id as string }, $set: { updatedAt: new Date() } }
  );
  res.json({ saved: false });
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const listing = await findListingById(req.params.id as string);
  if (!listing) {
    res.status(404).json({ error: 'Listing not found.' }); return;
  }
  const normalized = normalizeListing(listing);
  if (listing.userId) {
    const author = await findUserById(listing.userId);
    if (author) normalized.authorName = author.name || author.email;
  }
  res.json(normalized);
});

router.post('/:id/comments', authMiddleware, requireVerifiedEmail, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const listing = await findListingById(req.params.id as string);
  if (!listing) {
    res.status(404).json({ error: 'Listing not found.' }); return;
  }

  const parsedPayload = validate(commentPayloadSchema, req.body);
  if (parsedPayload.error) { res.status(400).json({ error: parsedPayload.error }); return; }
  const { body, parentId } = parsedPayload.value;
  if (listing.comments.length >= MAX_LISTING_COMMENTS) {
    res.status(413).json({ error: 'This listing has reached its maximum comment capacity.' }); return;
  }

  const parentComment = parentId ? listing.comments.find((comment: any) => comment.id === parentId) : null;
  if (parentId) {
    if (!parentComment) {
      res.status(400).json({ error: 'Reply target was not found.' }); return;
    }
    const rootComment = findRootListingComment(listing.comments, parentComment);
    const canReply = listing.userId === req_.user!.id || rootComment?.userId === req_.user!.id;
    if (!canReply) {
      res.status(403).json({ error: 'Only the listing owner and original commenter can reply in this thread.' }); return;
    }
  }

  listing.comments.push({
    id: uuidv4(),
    parentId,
    userId: req_.user!.id,
    authorName: req_.user!.name || req_.user!.email,
    body,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  listing.updatedAt = new Date();
  await listing.save();

  await createNotification({
    userId: parentComment ? parentComment.userId : listing.userId,
    actorId: req_.user!.id,
    actorName: req_.user!.name || req_.user!.email,
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

router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const listing = await findListingById(req.params.id as string);
  if (!listing) {
    res.status(404).json({ error: 'Listing not found.' }); return;
  }
  if (listing.userId !== req_.user!.id) {
    res.status(403).json({ error: 'You do not have permission to edit this listing.' }); return;
  }

  const parsedPayload = validate(partialListingPayloadSchema, req.body);
  if (parsedPayload.error) { res.status(400).json({ error: parsedPayload.error }); return; }

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
    res.status(400).json({ error: 'Title, description, category, specific type, and location are required.' }); return;
  }
  if (isPhotographyListing && !cleanedImages.length) {
    res.status(400).json({ error: 'Photography posts require at least one photo.' }); return;
  }
  if (!isPhotographyListing && cleanExternal === null) {
    res.status(400).json({ error: 'External link must start with http:// or https://.' }); return;
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
  es.indexListing(listing as any).catch(() => {});

  res.json({
    listing: normalizeListing(listing),
  });
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const listing = await findListingById(req.params.id as string);
  if (!listing) {
    res.status(404).json({ error: 'Listing not found.' }); return;
  }
  if (listing.userId !== req_.user!.id) {
    res.status(403).json({ error: 'You do not have permission to delete this listing.' }); return;
  }

  listing.deleted = true;
  listing.deletedAt = new Date();
  await listing.save();
  es.deleteListing(listing.id).catch(() => {});
  res.json({ success: true, message: 'Listing deleted successfully.' });
});

export default router;
