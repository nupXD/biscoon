const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const notificationSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, required: true },
  userId: { type: String, required: true, index: true },
  actorId: { type: String, required: true },
  actorName: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  targetType: { type: String, required: true },
  targetId: { type: String, required: true },
  targetTitle: { type: String, default: '' },
  url: { type: String, required: true },
  read: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
}, { collection: 'notifications' });

module.exports = mongoose.model('Notification', notificationSchema);
