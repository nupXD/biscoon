import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import Conversation from '../models/Conversation';
import Listing from '../models/Listing';
import authMiddleware from '../middleware/auth';
import requireVerifiedEmail from '../middleware/requireVerifiedEmail';
import { findUserById } from '../utils/users';
import { encrypt, decrypt } from '../utils/crypto';
import { validate } from '../utils/validate';
import { saveBase64Upload, isStoredUpload } from '../utils/uploads';
import { emitToUser } from '../services/realtime';
import type { AuthRequest } from '../types';

const router = Router();

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

function cleanString(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function normalizeParticipantIds(ids: any[]): string[] {
  return Array.from(new Set((ids || []).map(id => cleanString(id)).filter(Boolean))).sort();
}

function buildParticipantKeyFromIds(ids: string[]): string {
  return normalizeParticipantIds(ids).join(':');
}

function buildParticipantKey(a: string, b: string): string {
  return buildParticipantKeyFromIds([a, b]);
}

function normalizeConversationSummary(conv: any, currentUserId: string): any {
  const lastMessage = conv.messages[conv.messages.length - 1] || null;
  const unreadCount = conv.messages.filter(
    (message: any) => message.senderId !== currentUserId && !message.readBy.includes(currentUserId)
  ).length;
  const otherUserId = conv.participantIds.find((id: string) => id !== currentUserId) || '';
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

function getAttachmentSizeFromBase64(base64Value: string): number {
  const sanitized = base64Value.replace(/\s+/g, '');
  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((sanitized.length * 3) / 4) - padding);
}

function parseDataUrl(dataUrl: unknown): { mimeType: string; base64: string } | null {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(String(dataUrl || ''));
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2].replace(/\s+/g, ''),
  };
}

function maxBytesForMimeType(mimeType: string): number {
  if (mimeType.startsWith('image/')) return MAX_IMAGE_BYTES;
  if (mimeType.startsWith('video/')) return MAX_VIDEO_BYTES;
  return MAX_FILE_BYTES;
}

function sanitizeAttachment(attachment: any): { error?: string; value?: any } {
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

function validateAttachments(rawAttachments: unknown): { error?: string; attachments?: any[] } {
  if (rawAttachments === undefined || rawAttachments === null) return { attachments: [] };
  if (!Array.isArray(rawAttachments)) {
    return { error: 'Attachments must be an array.' };
  }
  if (rawAttachments.length > MAX_ATTACHMENTS) {
    return { error: `A maximum of ${MAX_ATTACHMENTS} attachments is allowed.` };
  }

  const attachments: any[] = [];
  for (const attachment of rawAttachments) {
    const sanitized = sanitizeAttachment(attachment);
    if (sanitized.error) return { error: sanitized.error };
    attachments.push(sanitized.value);
  }
  return { attachments };
}

function normalizeMessagePageLimit(value: unknown): number {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MESSAGE_PAGE_SIZE;
  return Math.min(parsed, MAX_MESSAGE_PAGE_SIZE);
}

function buildConversationMessage(reqUser: any, body: string, attachments: any[]): any {
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

async function findConversationByParticipantKey(listingId: string, participantIds: string[]): Promise<{ conversation: any; participantKey: string; participantIds: string[] }> {
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

function appendMessageOrThrow(conversation: any, message: any): void {
  if (conversation.messages.length >= MAX_MESSAGES_PER_CONVERSATION) {
    const error: any = new Error('This conversation has reached its message limit. Start a new thread from the listing page.');
    error.status = 413;
    throw error;
  }
  conversation.messages.push(message);
  conversation.updatedAt = new Date();
}

function emitMessageRealtime(conversation: any, sender: any, body: string, attachmentCount = 0): void {
  const payload = {
    conversationId: conversation.id,
    listingId: conversation.listingId,
    listingTitle: conversation.listingTitle,
    actorName: sender.name || sender.email,
    body: body || (attachmentCount ? `${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}` : ''),
    updatedAt: conversation.updatedAt,
  };
  (conversation.participantIds || []).forEach((userId: string) => {
    if (userId && userId !== sender.id) emitToUser(userId, 'message:new', payload);
  });
}

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const conversations = await Conversation.find({ participantIds: req_.user!.id })
    .sort({ updatedAt: -1 })
    .limit(50);
  const summaries = conversations.map((conversation: any) => normalizeConversationSummary(conversation, req_.user!.id));
  const totalUnread = summaries.reduce((sum: number, conversation: any) => sum + conversation.unreadCount, 0);
  res.json({ unread: totalUnread, conversations: summaries });
});

router.get('/unread', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const conversations = await Conversation.find({ participantIds: req_.user!.id });
  const unread = conversations.reduce((sum: number, conversation: any) => {
    return sum + conversation.messages.filter(
      (message: any) => message.senderId !== req_.user!.id && !message.readBy.includes(req_.user!.id)
    ).length;
  }, 0);
  res.json({ unread });
});

router.get('/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const listingId = cleanString(req.query.listingId);
  const recipientId = cleanString(req.query.recipientId);

  if (!listingId || !recipientId) {
    res.status(400).json({ error: 'listingId and recipientId are required.' }); return;
  }
  if (recipientId === req_.user!.id) {
    res.json({ exists: false, conversationId: '' }); return;
  }

  const lookup = await findConversationByParticipantKey(listingId, [req_.user!.id, recipientId]);
  res.json({
    exists: Boolean(lookup.conversation),
    conversationId: lookup.conversation ? lookup.conversation.id : '',
  });
});

router.post('/', authMiddleware, requireVerifiedEmail, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const parsedPayload = validate(messageCreateSchema, req.body);
  if (parsedPayload.error) { res.status(400).json({ error: parsedPayload.error }); return; }

  const listingId = cleanString(parsedPayload.value.listingId);
  const recipientId = cleanString(parsedPayload.value.recipientId);
  const body = cleanString(parsedPayload.value.body).slice(0, MAX_MESSAGE_BODY_LENGTH);
  const validatedAttachments = validateAttachments(parsedPayload.value.attachments);

  if (validatedAttachments.error) {
    res.status(400).json({ error: validatedAttachments.error }); return;
  }
  if (!listingId || !recipientId) {
    res.status(400).json({ error: 'listingId and recipientId are required.' }); return;
  }
  if (!body && validatedAttachments.attachments!.length === 0) {
    res.status(400).json({ error: 'A message body or at least one attachment is required.' }); return;
  }
  if (recipientId === req_.user!.id) {
    res.status(400).json({ error: 'You cannot message yourself.' }); return;
  }

  const [listing, recipient] = await Promise.all([
    Listing.findOne({ id: listingId }),
    findUserById(recipientId),
  ]);
  if (!listing) { res.status(404).json({ error: 'Listing not found.' }); return; }
  if (!recipient) { res.status(404).json({ error: 'Recipient not found.' }); return; }

  const participantIds = [req_.user!.id, recipientId];
  const lookup = await findConversationByParticipantKey(listingId, participantIds);
  let conversation = lookup.conversation;
  const message = buildConversationMessage(req_.user!, body, validatedAttachments.attachments!);

  if (!conversation) {
    conversation = new Conversation({
      id: uuidv4(),
      listingId,
      listingTitle: listing.title || '',
      participantKey: lookup.participantKey,
      participantIds: lookup.participantIds,
      participantNames: new Map([
        [req_.user!.id, req_.user!.name || req_.user!.email],
        [recipientId, recipient.name || recipient.email],
      ]),
      messages: [],
    });
  }

  try {
    appendMessageOrThrow(conversation, message);
    await conversation.save();
  } catch (error: any) {
    if (error && error.code === 11000) {
      const existing = await Conversation.findOne({ listingId, participantKey: lookup.participantKey });
      if (!existing) throw error;
      appendMessageOrThrow(existing, message);
      await existing.save();
      emitMessageRealtime(existing, req_.user!, body, validatedAttachments.attachments!.length);
      res.json({ conversationId: existing.id }); return;
    }
    throw error;
  }

  emitMessageRealtime(conversation, req_.user!, body, validatedAttachments.attachments!.length);
  res.json({ conversationId: conversation.id });
});

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const conversation = await Conversation.findOne({ id: req.params.id, participantIds: req_.user!.id });
  if (!conversation) { res.status(404).json({ error: 'Conversation not found.' }); return; }

  let changed = false;
  conversation.messages.forEach((message: any) => {
    if (message.senderId !== req_.user!.id && !message.readBy.includes(req_.user!.id)) {
      message.readBy.push(req_.user!.id);
      changed = true;
    }
  });
  if (changed) await conversation.save();

  const otherUserId = conversation.participantIds.find((id: string) => id !== req_.user!.id) || '';
  const otherUserName = conversation.participantNames && typeof conversation.participantNames.get === 'function'
    ? (conversation.participantNames.get(otherUserId) || 'Biscoon User')
    : 'Biscoon User';

  const pageLimit = normalizeMessagePageLimit(req.query.limit);
  const beforeMessageId = cleanString(req.query.before);
  const allMessages = conversation.messages || [];
  let endIndexExclusive = allMessages.length;
  if (beforeMessageId) {
    const foundIndex = allMessages.findIndex((message: any) => message.id === beforeMessageId);
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
    messages: pageMessages.map((message: any) => ({
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      body: message.body ? decrypt(message.body) : '',
      attachments: message.attachments || [],
      createdAt: message.createdAt,
      isOwn: message.senderId === req_.user!.id,
    })),
    totalMessages: allMessages.length,
    hasMore,
    nextBefore,
    updatedAt: conversation.updatedAt,
  });
});

router.post('/:id/reply', authMiddleware, requireVerifiedEmail, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const parsedPayload = validate(messageReplySchema, req.body);
  if (parsedPayload.error) { res.status(400).json({ error: parsedPayload.error }); return; }

  const body = cleanString(parsedPayload.value.body).slice(0, MAX_MESSAGE_BODY_LENGTH);
  const validatedAttachments = validateAttachments(parsedPayload.value.attachments);
  if (validatedAttachments.error) {
    res.status(400).json({ error: validatedAttachments.error }); return;
  }
  if (!body && validatedAttachments.attachments!.length === 0) {
    res.status(400).json({ error: 'A message body or at least one attachment is required.' }); return;
  }

  const conversation = await Conversation.findOne({ id: req.params.id, participantIds: req_.user!.id });
  if (!conversation) { res.status(404).json({ error: 'Conversation not found.' }); return; }

  if (!conversation.participantKey) {
    conversation.participantIds = normalizeParticipantIds(conversation.participantIds);
    conversation.participantKey = buildParticipantKeyFromIds(conversation.participantIds);
  }

  appendMessageOrThrow(conversation, buildConversationMessage(req_.user!, body, validatedAttachments.attachments!));
  await conversation.save();
  emitMessageRealtime(conversation, req_.user!, body, validatedAttachments.attachments!.length);

  res.json({ conversationId: conversation.id });
});

export default router;
