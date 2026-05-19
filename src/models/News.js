const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const newsSchema = new mongoose.Schema({
  id:          { type: String, default: uuidv4, unique: true, required: true },
  slug:        { type: String, unique: true, required: true, lowercase: true },
  title:       { type: String, required: true },
  summary:     { type: String, required: true },
  body:        { type: String, required: true },
  category:    { type: String, default: 'community' },
  status:      { type: String, default: 'draft', enum: ['draft', 'published'] },
  featured:    { type: Boolean, default: false },
  imageUrl:    { type: String, default: '' },
  media:       [{
    id:        { type: String, default: uuidv4 },
    type:      { type: String, enum: ['image', 'video'], required: true },
    url:       { type: String, required: true },
    caption:   { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  }],
  sourceName:  { type: String, default: 'Biscoon Newsroom' },
  authorName:  { type: String, default: '' },
  createdBy:   { type: String, default: '' },
  publishedAt: { type: Date, default: null },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
}, { collection: 'news' });

newsSchema.index({ title: 'text', summary: 'text', body: 'text', category: 'text' });
newsSchema.index({ status: 1, publishedAt: -1, featured: -1 });
newsSchema.index({ category: 1, status: 1, publishedAt: -1 });

module.exports = mongoose.model('News', newsSchema);
