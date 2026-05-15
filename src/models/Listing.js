const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const listingCommentSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, required: true },
  userId: { type: String, required: true },
  authorName: { type: String, required: true },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const listingSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, required: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, index: true },
  subcategory: { type: String },
  availability: { type: String },
  price: { type: String },
  priceNote: { type: String },
  location: { type: String, index: true },
  locationType: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  contactPreference: { type: String },
  externalLink: { type: String },
  tags: [{ type: String }],
  images: [{ type: String }],
  comments: [listingCommentSchema],
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'listings' });

listingSchema.index({
  title: 'text',
  description: 'text',
  category: 'text',
  subcategory: 'text',
  availability: 'text',
  location: 'text',
  tags: 'text',
});

module.exports = mongoose.model('Listing', listingSchema);
