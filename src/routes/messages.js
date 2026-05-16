const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Conversation = require('../models/Conversation');
const Listing = require('../models/Listing');
const authMiddleware = require('../middleware/auth');
const { findUserById } = require('../utils/users');
const { encrypt, decrypt } = require('../utils/crypto');

const router = express.Router();

function normalizeConversationSummary(conv, currentUserId) {
  const lastMessage = conv.messages[conv.messages.length - 1] || null;
  const unreadCount = conv.messages.filter(
    m => m.senderId !== currentUserId && !m.readBy.includes(currentUserId)
  ).length;
  const otherUserId = conv.participantIds.find(id => id !== currentUserId) || '';
  const otherUserName = conv.participantNames.get(otherUserId) || 'Biscoon User';
  return {
    id: conv.id,
    listingId: conv.listingId,
    listingTitle: conv.listingTitle,
    otherUserId,
    otherUserName,
    lastMessage: lastMessage ? {
      senderId: lastMessage.senderId,
      senderName: lastMessage.senderName,
      body: decrypt(lastMessage.body),
      createdAt: lastMessage.createdAt,
    } : null,
    unreadCount,
    updatedAt: conv.updatedAt,
  };
}

router.get('/', authMiddleware, async (req, res) => {
  const conversations = await Conversation.find({ participantIds: req.user.id })
    .sort({ updatedAt: -1 })
    .limit(50);
  const summaries = conversations.map(conv => normalizeConversationSummary(conv, req.user.id));
  const totalUnread = summaries.reduce((sum, c) => sum + c.unreadCount, 0);
  res.json({ unread: totalUnread, conversations: summaries });
});

router.get('/unread', authMiddleware, async (req, res) => {
  const conversations = await Conversation.find({ participantIds: req.user.id });
  const unread = conversations.reduce((sum, conv) => {
    return sum + conv.messages.filter(
      m => m.senderId !== req.user.id && !m.readBy.includes(req.user.id)
    ).length;
  }, 0);
  res.json({ unread });
});

router.post('/', authMiddleware, async (req, res) => {
  const { listingId, recipientId, body } = req.body;
  if (!listingId || !recipientId || !String(body || '').trim()) {
    return res.status(400).json({ error: 'listingId, recipientId, and body are required.' });
  }
  if (recipientId === req.user.id) {
    return res.status(400).json({ error: 'You cannot message yourself.' });
  }

  const [listing, recipient] = await Promise.all([
    Listing.findOne({ id: listingId }),
    findUserById(recipientId),
  ]);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (!recipient) return res.status(404).json({ error: 'Recipient not found.' });

  const participantIds = [req.user.id, recipientId].sort();
  let conv = await Conversation.findOne({ listingId, participantIds });

  if (!conv) {
    conv = new Conversation({
      id: uuidv4(),
      listingId,
      listingTitle: listing.title || '',
      participantIds,
      participantNames: new Map([
        [req.user.id, req.user.name || req.user.email],
        [recipientId, recipient.name || recipient.email],
      ]),
      messages: [],
    });
  }

  conv.messages.push({
    id: uuidv4(),
    senderId: req.user.id,
    senderName: req.user.name || req.user.email,
    body: encrypt(String(body).trim()),
    readBy: [req.user.id],
    createdAt: new Date(),
  });
  conv.updatedAt = new Date();
  await conv.save();

  res.json({ conversationId: conv.id });
});

router.get('/:id', authMiddleware, async (req, res) => {
  const conv = await Conversation.findOne({ id: req.params.id, participantIds: req.user.id });
  if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

  let changed = false;
  conv.messages.forEach(m => {
    if (m.senderId !== req.user.id && !m.readBy.includes(req.user.id)) {
      m.readBy.push(req.user.id);
      changed = true;
    }
  });
  if (changed) await conv.save();

  const otherUserId = conv.participantIds.find(id => id !== req.user.id) || '';
  const otherUserName = conv.participantNames.get(otherUserId) || 'Biscoon User';

  res.json({
    id: conv.id,
    listingId: conv.listingId,
    listingTitle: conv.listingTitle,
    otherUserId,
    otherUserName,
    messages: conv.messages.map(m => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      body: decrypt(m.body),
      createdAt: m.createdAt,
      isOwn: m.senderId === req.user.id,
    })),
    updatedAt: conv.updatedAt,
  });
});

router.post('/:id/reply', authMiddleware, async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Message body is required.' });

  const conv = await Conversation.findOne({ id: req.params.id, participantIds: req.user.id });
  if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

  conv.messages.push({
    id: uuidv4(),
    senderId: req.user.id,
    senderName: req.user.name || req.user.email,
    body: encrypt(body),
    readBy: [req.user.id],
    createdAt: new Date(),
  });
  conv.updatedAt = new Date();
  await conv.save();

  res.json({ conversationId: conv.id });
});

module.exports = router;
