const express = require('express');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const Conversation = require('../models/Conversation');
const Listing = require('../models/Listing');
const authMiddleware = require('../middleware/auth');
const { findUserById } = require('../utils/users');
const { encrypt, decrypt } = require('../utils/crypto');
const { validate } = require('../utils/validate');
const { saveBase64Upload, isStoredUpload } = require('../utils/uploads');

const router = express.Router();

const MAX_ATTACHMENTS = 5;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 12 * 1024 * 1024;
const MAX_FILE_BYTES = 6 * 1024 * 1024;
const MAX_MESSAGE_BODY_LENGTH = 4000;
const MAX_MESSAGES_PER_CONVERSATION = 200;
const DEFAULT_MESSAGE_PAGE_SIZE = 50;
const MAX_MESSAGE_PAGE_SIZE = 100;

const attachmentPayloadSchema = z.object({
  name: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(1),
  size: z.number().optional().default(0),
  data: z.string().trim().min(1),
});

const messageCreateSchema = z.object({
  listingId: z.string().trim().min(1),
  recipientId: z.string().trim().min(1),
  body: z.string().optional().default(''),
  attachments: z.array(attachmentPayloadSchema).optional().default([]),
});

const messageReplySchema = z.object({
  body: z.string().optional().default(''),
  attachments: z.array(attachmentPayloadSchema).optional().default([]),
});

const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
]);

function cleanString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function normalizeParticipantIds(ids) {
  return Array.from(new Set((ids || []).map(id => cleanString(id)).filter(Boolean))).sort();
}

function buildParticipantKeyFromIds(ids) {
  return normalizeParticipantIds(ids).join(':');
}

function buildParticipantKey(a, b) {
  return buildParticipantKeyFromIds([a, b]);
}

function normalizeConversationSummary(conv, currentUserId) {
  const lastMessage = conv.messages[conv.messages.length - 1] || null;
  const unreadCount = conv.messages.filter(
    message => message.senderId !== currentUserId && !message.readBy.includes(currentUserId)
  ).length;
  const otherUserId = conv.participantIds.find(id => id !== currentUserId) || '';
  const otherUserName = conv.participantNames && typeof conv.participantNames.get === 'function'
    ? (conv.participantNames.get(otherUserId) || 'Biscoon User')
    : 'Biscoon User';
  return {
    id: conv.id,
    listingId: conv.listingId,
    listingTitle: conv.listingTitle,
    otherUserId,
    otherUserName,
    lastMessage: lastMessage ? {
      senderId: lastMessage.senderId,
      senderName: lastMessage.senderName,
      body: lastMessage.body ? decrypt(lastMessage.body) : '',
      hasAttachments: Array.isArray(lastMessage.attachments) && lastMessage.attachments.length > 0,
      attachmentCount: Array.isArray(lastMessage.attachments) ? lastMessage.attachments.length : 0,
      createdAt: lastMessage.createdAt,
    } : null,
    unreadCount,
    updatedAt: conv.updatedAt,
  };
}

function getAttachmentSizeFromBase64(base64Value) {
  const sanitized = base64Value.replace(/\s+/g, '');
  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((sanitized.length * 3) / 4) - padding);
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(String(dataUrl || ''));
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2].replace(/\s+/g, ''),
  };
}

function maxBytesForMimeType(mimeType) {
  if (mimeType.startsWith('image/')) return MAX_IMAGE_BYTES;
  if (mimeType.startsWith('video/')) return MAX_VIDEO_BYTES;
  return MAX_FILE_BYTES;
}

function sanitizeAttachment(attachment) {
  if (!attachment || typeof attachment !== 'object') {
    return { error: 'Invalid attachment payload.' };
  }

  const name = cleanString(attachment.name).slice(0, 180);
  const mimeType = cleanString(attachment.mimeType).toLowerCase();
  const data = cleanString(attachment.data);

  if (!name || !mimeType || !data) {
    return { error: 'Attachment name, type, and data are required.' };
  }

  if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType)) {
    return { error: `Unsupported attachment type: ${mimeType}` };
  }

  const parsed = parseDataUrl(data);
  if (!parsed && !isStoredUpload(data)) {
    return { error: 'Attachment must be a valid base64 data URL.' };
  }
  if (parsed && parsed.mimeType !== mimeType) {
    return { error: 'Attachment MIME type does not match data payload.' };
  }

  const size = parsed ? getAttachmentSizeFromBase64(parsed.base64) : Number(attachment.size || 0);
  const maxBytes = maxBytesForMimeType(mimeType);
  if (size <= 0 || size > maxBytes) {
    return { error: `Attachment "${name}" exceeds the ${maxBytes} byte limit.` };
  }

  const storedData = parsed
    ? saveBase64Upload({ folder: 'messages', mimeType, base64: parsed.base64 })
    : data;

  return { value: { name, mimeType, size, data: storedData } };
}

function validateAttachments(rawAttachments) {
  if (rawAttachments === undefined || rawAttachments === null) return { attachments: [] };
  if (!Array.isArray(rawAttachments)) {
    return { error: 'Attachments must be an array.' };
  }
  if (rawAttachments.length > MAX_ATTACHMENTS) {
    return { error: `A maximum of ${MAX_ATTACHMENTS} attachments is allowed.` };
  }

  const attachments = [];
  for (const attachment of rawAttachments) {
    const sanitized = sanitizeAttachment(attachment);
    if (sanitized.error) return { error: sanitized.error };
    attachments.push(sanitized.value);
  }
  return { attachments };
}

function normalizeMessagePageLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MESSAGE_PAGE_SIZE;
  return Math.min(parsed, MAX_MESSAGE_PAGE_SIZE);
}

function buildConversationMessage(reqUser, body, attachments) {
  return {
    id: uuidv4(),
    senderId: reqUser.id,
    senderName: reqUser.name || reqUser.email,
    body: body ? encrypt(body) : '',
    attachments,
    readBy: [reqUser.id],
    createdAt: new Date(),
  };
}

async function findConversationByParticipantKey(listingId, participantIds) {
  const normalizedIds = normalizeParticipantIds(participantIds);
  const participantKey = buildParticipantKeyFromIds(normalizedIds);
  let conversation = await Conversation.findOne({ listingId, participantKey });

  if (!conversation) {
    conversation = await Conversation.findOne({ listingId, participantIds: normalizedIds });
    if (conversation && conversation.participantKey !== participantKey) {
      conversation.participantIds = normalizeParticipantIds(conversation.participantIds);
      conversation.participantKey = participantKey;
      await conversation.save();
    }
  }

  return { conversation, participantKey, participantIds: normalizedIds };
}

function appendMessageOrThrow(conversation, message) {
  if (conversation.messages.length >= MAX_MESSAGES_PER_CONVERSATION) {
    const error = new Error('This conversation has reached its message limit. Start a new thread from the listing page.');
    error.status = 413;
    throw error;
  }
  conversation.messages.push(message);
  conversation.updatedAt = new Date();
}

router.get('/', authMiddleware, async (req, res) => {
  const conversations = await Conversation.find({ participantIds: req.user.id })
    .sort({ updatedAt: -1 })
    .limit(50);
  const summaries = conversations.map(conversation => normalizeConversationSummary(conversation, req.user.id));
  const totalUnread = summaries.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
  res.json({ unread: totalUnread, conversations: summaries });
});

router.get('/unread', authMiddleware, async (req, res) => {
  const conversations = await Conversation.find({ participantIds: req.user.id });
  const unread = conversations.reduce((sum, conversation) => {
    return sum + conversation.messages.filter(
      message => message.senderId !== req.user.id && !message.readBy.includes(req.user.id)
    ).length;
  }, 0);
  res.json({ unread });
});

router.get('/status', authMiddleware, async (req, res) => {
  const listingId = cleanString(req.query.listingId);
  const recipientId = cleanString(req.query.recipientId);

  if (!listingId || !recipientId) {
    return res.status(400).json({ error: 'listingId and recipientId are required.' });
  }
  if (recipientId === req.user.id) {
    return res.json({ exists: false, conversationId: '' });
  }

  const lookup = await findConversationByParticipantKey(listingId, [req.user.id, recipientId]);
  return res.json({
    exists: Boolean(lookup.conversation),
    conversationId: lookup.conversation ? lookup.conversation.id : '',
  });
});

router.post('/', authMiddleware, async (req, res) => {
  const parsedPayload = validate(messageCreateSchema, req.body);
  if (parsedPayload.error) return res.status(400).json({ error: parsedPayload.error });

  const listingId = cleanString(parsedPayload.value.listingId);
  const recipientId = cleanString(parsedPayload.value.recipientId);
  const body = cleanString(parsedPayload.value.body).slice(0, MAX_MESSAGE_BODY_LENGTH);
  const validatedAttachments = validateAttachments(parsedPayload.value.attachments);

  if (validatedAttachments.error) {
    return res.status(400).json({ error: validatedAttachments.error });
  }
  if (!listingId || !recipientId) {
    return res.status(400).json({ error: 'listingId and recipientId are required.' });
  }
  if (!body && validatedAttachments.attachments.length === 0) {
    return res.status(400).json({ error: 'A message body or at least one attachment is required.' });
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

  const participantIds = [req.user.id, recipientId];
  const lookup = await findConversationByParticipantKey(listingId, participantIds);
  let conversation = lookup.conversation;
  const message = buildConversationMessage(req.user, body, validatedAttachments.attachments);

  if (!conversation) {
    conversation = new Conversation({
      id: uuidv4(),
      listingId,
      listingTitle: listing.title || '',
      participantKey: lookup.participantKey,
      participantIds: lookup.participantIds,
      participantNames: new Map([
        [req.user.id, req.user.name || req.user.email],
        [recipientId, recipient.name || recipient.email],
      ]),
      messages: [],
    });
  }

  try {
    appendMessageOrThrow(conversation, message);
    await conversation.save();
  } catch (error) {
    if (error && error.code === 11000) {
      const existing = await Conversation.findOne({ listingId, participantKey: lookup.participantKey });
      if (!existing) throw error;
      appendMessageOrThrow(existing, message);
      await existing.save();
      return res.json({ conversationId: existing.id });
    }
    throw error;
  }

  res.json({ conversationId: conversation.id });
});

router.get('/:id', authMiddleware, async (req, res) => {
  const conversation = await Conversation.findOne({ id: req.params.id, participantIds: req.user.id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });

  let changed = false;
  conversation.messages.forEach(message => {
    if (message.senderId !== req.user.id && !message.readBy.includes(req.user.id)) {
      message.readBy.push(req.user.id);
      changed = true;
    }
  });
  if (changed) await conversation.save();

  const otherUserId = conversation.participantIds.find(id => id !== req.user.id) || '';
  const otherUserName = conversation.participantNames && typeof conversation.participantNames.get === 'function'
    ? (conversation.participantNames.get(otherUserId) || 'Biscoon User')
    : 'Biscoon User';

  const pageLimit = normalizeMessagePageLimit(req.query.limit);
  const beforeMessageId = cleanString(req.query.before);
  const allMessages = conversation.messages || [];
  let endIndexExclusive = allMessages.length;
  if (beforeMessageId) {
    const foundIndex = allMessages.findIndex(message => message.id === beforeMessageId);
    if (foundIndex > -1) endIndexExclusive = foundIndex;
  }
  const startIndex = Math.max(0, endIndexExclusive - pageLimit);
  const pageMessages = allMessages.slice(startIndex, endIndexExclusive);
  const hasMore = startIndex > 0;
  const nextBefore = hasMore && pageMessages.length ? pageMessages[0].id : '';

  res.json({
    id: conversation.id,
    listingId: conversation.listingId,
    listingTitle: conversation.listingTitle,
    otherUserId,
    otherUserName,
    messages: pageMessages.map(message => ({
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      body: message.body ? decrypt(message.body) : '',
      attachments: message.attachments || [],
      createdAt: message.createdAt,
      isOwn: message.senderId === req.user.id,
    })),
    totalMessages: allMessages.length,
    hasMore,
    nextBefore,
    updatedAt: conversation.updatedAt,
  });
});

router.post('/:id/reply', authMiddleware, async (req, res) => {
  const parsedPayload = validate(messageReplySchema, req.body);
  if (parsedPayload.error) return res.status(400).json({ error: parsedPayload.error });

  const body = cleanString(parsedPayload.value.body).slice(0, MAX_MESSAGE_BODY_LENGTH);
  const validatedAttachments = validateAttachments(parsedPayload.value.attachments);
  if (validatedAttachments.error) {
    return res.status(400).json({ error: validatedAttachments.error });
  }
  if (!body && validatedAttachments.attachments.length === 0) {
    return res.status(400).json({ error: 'A message body or at least one attachment is required.' });
  }

  const conversation = await Conversation.findOne({ id: req.params.id, participantIds: req.user.id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });

  if (!conversation.participantKey) {
    conversation.participantIds = normalizeParticipantIds(conversation.participantIds);
    conversation.participantKey = buildParticipantKeyFromIds(conversation.participantIds);
  }

  appendMessageOrThrow(conversation, buildConversationMessage(req.user, body, validatedAttachments.attachments));
  await conversation.save();

  res.json({ conversationId: conversation.id });
});

module.exports = router;
