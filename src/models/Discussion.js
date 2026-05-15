const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const commentSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, required: true },
  parentId: { type: String, default: '' },
  userId: { type: String, required: true },
  authorName: { type: String, required: true },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const discussionSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, required: true },
  userId: { type: String, required: true },
  authorName: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  category: { type: String, default: 'general', index: true },
  tags: [{ type: String }],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'discussions' });

discussionSchema.index({
  title: 'text',
  body: 'text',
  category: 'text',
  tags: 'text',
});

module.exports = mongoose.model('Discussion', discussionSchema);
