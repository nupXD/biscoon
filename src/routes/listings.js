const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Listing = require('../models/Listing');
const authMiddleware = require('../middleware/auth');
const { findListingById, normalizeListing } = require('../utils/listings');

const router = express.Router();

function cleanString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function cleanTags(tags) {
  return Array.isArray(tags)
    ? tags.map(tag => cleanString(tag)).filter(Boolean).slice(0, 8)
    : [];
}

function cleanImages(images) {
  return Array.isArray(images)
    ? images
      .map(image => cleanString(image))
      .filter(image => image.startsWith('data:image/') || /^https?:\/\//i.test(image) || !image.includes(':'))
      .slice(0, 6)
    : [];
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

  const cleanTitle = cleanString(title);
  const cleanDescription = cleanString(description);
  const cleanCategory = cleanString(category);
  const cleanSubcategory = cleanString(subcategory);
  const cleanLocation = cleanString(location);

  if (!cleanTitle || !cleanDescription || !cleanCategory || !cleanSubcategory || !cleanLocation) {
    return res.status(400).json({ error: 'Title, description, category, specific type, and location are required.' });
  }

  const listing = new Listing({
    id: uuidv4(),
    userId: req.user.id,
    title: cleanTitle,
    description: cleanDescription,
    category: cleanCategory,
    subcategory: cleanSubcategory,
    availability: cleanString(availability),
    price: cleanString(price),
    priceNote: cleanString(priceNote),
    location: cleanLocation,
    locationType: cleanString(locationType),
    contactEmail: cleanString(contactEmail),
    contactPhone: cleanString(contactPhone),
    contactPreference: cleanString(contactPreference),
    externalLink: cleanString(externalLink),
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
  res.json(normalizeListing(listing));
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

  const cleanTitle = cleanString(title);
  const cleanDescription = cleanString(description);
  const cleanCategory = cleanString(category);
  const cleanSubcategory = cleanString(subcategory);
  const cleanLocation = cleanString(location);

  if (!cleanTitle || !cleanDescription || !cleanCategory || !cleanSubcategory || !cleanLocation) {
    return res.status(400).json({ error: 'Title, description, category, specific type, and location are required.' });
  }

  listing.title = cleanTitle;
  listing.description = cleanDescription;
  listing.category = cleanCategory;
  listing.subcategory = cleanSubcategory;
  listing.availability = cleanString(availability);
  listing.price = cleanString(price);
  listing.priceNote = cleanString(priceNote);
  listing.location = cleanLocation;
  listing.locationType = cleanString(locationType);
  listing.contactEmail = cleanString(contactEmail);
  listing.contactPhone = cleanString(contactPhone);
  listing.contactPreference = cleanString(contactPreference);
  listing.externalLink = cleanString(externalLink);
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
