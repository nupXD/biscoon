const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const reportSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, required: true },
  reporterId: { type: String, required: true, index: true },
  reporterName: { type: String, default: '' },
  targetType: {
    type: String,
    required: true,
    enum: ['listing', 'discussion', 'listing_comment', 'discussion_comment', 'message', 'user'],
    index: true,
  },
  targetId: { type: String, required: true, index: true },
  parentId: { type: String, default: '' },
  reason: {
    type: String,
    required: true,
    enum: ['spam', 'scam', 'harassment', 'illegal', 'misinformation', 'other'],
  },
  details: { type: String, default: '' },
  status: {
    type: String,
    default: 'open',
    enum: ['open', 'reviewing', 'resolved', 'dismissed'],
    index: true,
  },
  reviewedBy: { type: String, default: '' },
  reviewedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'reports' });

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('Report', reportSchema);
