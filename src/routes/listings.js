const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Listing = require('../models/Listing');
const authMiddleware = require('../middleware/auth');
const { findListingById, normalizeListing } = require('../utils/listings');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  const { title, description, category, subcategory, price, location, contactEmail, contactPhone, images } = req.body;
  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required.' });
  }

  const listing = new Listing({
    id: uuidv4(),
    userId: req.user.id,
    title: title.trim(),
    description: description.trim(),
    category: category.trim(),
    subcategory: subcategory ? subcategory.trim() : '',
    price: price ? String(price).trim() : '',
    location: location ? location.trim() : '',
    contactEmail: contactEmail ? contactEmail.trim() : '',
    contactPhone: contactPhone ? contactPhone.trim() : '',
    images: Array.isArray(images) ? images : [],
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
    price = listing.price,
    location = listing.location,
    contactEmail = listing.contactEmail,
    contactPhone = listing.contactPhone,
    images = listing.images,
  } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required.' });
  }

  listing.title = title.trim();
  listing.description = description.trim();
  listing.category = category.trim();
  listing.subcategory = subcategory ? String(subcategory).trim() : '';
  listing.price = price ? String(price).trim() : '';
  listing.location = location ? String(location).trim() : '';
  listing.contactEmail = contactEmail ? String(contactEmail).trim() : '';
  listing.contactPhone = contactPhone ? String(contactPhone).trim() : '';
  listing.images = Array.isArray(images) ? images : [];
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
