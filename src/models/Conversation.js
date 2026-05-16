const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const messageSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  body: { type: String, required: true },
  readBy: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, required: true },
  listingId: { type: String, required: true },
  listingTitle: { type: String, default: '' },
  participantIds: [{ type: String }],
  participantNames: { type: Map, of: String },
  messages: [messageSchema],
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'conversations' });

// Compound index: look up conversations by participant (inbox query)
conversationSchema.index({ participantIds: 1, updatedAt: -1 });
// Compound index: dedup check — find existing conversation for a listing between two users
conversationSchema.index({ listingId: 1, participantIds: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
