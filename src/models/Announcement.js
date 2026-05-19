const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const announcementSchema = new mongoose.Schema({
  id:        { type: String, default: uuidv4, unique: true, required: true },
  title:     { type: String, required: true },
  body:      { type: String, required: true },
  type:      { type: String, default: 'info', enum: ['info', 'warning', 'success'] },
  active:    { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  createdBy: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'announcements' });

announcementSchema.index({ active: 1, expiresAt: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
