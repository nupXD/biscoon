import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type { IListing } from '../types';

const listingCommentSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, required: true },
  parentId: { type: String, default: '' },
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
  category: { type: String, required: true },
  subcategory: { type: String },
  availability: { type: String },
  price: { type: String },
  priceNote: { type: String },
  location: { type: String },
  locationType: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  contactPreference: { type: String },
  externalLink: { type: String },
  tags: [{ type: String }],
  images: [{ type: String }],
  comments: [listingCommentSchema],
  deleted:   { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'listings' });

// Compound indexes: the most common queries are category (sorted by date) and category+subcategory
listingSchema.index({ category: 1, createdAt: -1 });
listingSchema.index({ category: 1, subcategory: 1, createdAt: -1 });
// userId index for "my listings" queries
listingSchema.index({ userId: 1, createdAt: -1 });
listingSchema.index({ deleted: 1, createdAt: -1 });

listingSchema.index({
  title: 'text',
  description: 'text',
  category: 'text',
  subcategory: 'text',
  availability: 'text',
  location: 'text',
  tags: 'text',
});

export default mongoose.model<IListing>('Listing', listingSchema);
