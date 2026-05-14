const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const listingSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, required: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, index: true },
  subcategory: { type: String },
  price: { type: String },
  location: { type: String, index: true },
  contactEmail: { type: String },
  contactPhone: { type: String },
  images: [{ type: String }],
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'listings' });

listingSchema.index({
  title: 'text',
  description: 'text',
  category: 'text',
  location: 'text',
});

module.exports = mongoose.model('Listing', listingSchema);
