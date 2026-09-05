import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import Discussion from '../models/Discussion';
import authMiddleware from '../middleware/auth';
import requireVerifiedEmail from '../middleware/requireVerifiedEmail';
import { contentCreateLimiter, commentCreateLimiter } from '../middleware/rateLimit';
import { findDiscussionById, normalizeDiscussion } from '../utils/discussions';
import { createNotification } from '../utils/notifications';
import { validate } from '../utils/validate';
import { getPagination, pagedResponse } from '../utils/pagination';
import * as es from '../services/elasticsearch';
import type { AuthRequest } from '../types';

const router = Router();
const MAX_DISCUSSION_COMMENTS = 300;
const MAX_DISCUSSION_BODY_LENGTH = 5000;

const discussionPayloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(MAX_DISCUSSION_BODY_LENGTH),
  category: z.string().trim().max(80).optional().default('general'),
  location: z.string().trim().max(120).optional().default(''),
  tags: z.union([z.array(z.string()), z.string()]).optional().default([]),
});

const discussionCommentPayloadSchema = z.object({
  body: z.string().trim().min(1).max(MAX_DISCUSSION_BODY_LENGTH),
  parentId: z.string().optional().default(''),
});

function cleanString(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function escapeRegExp(value: unknown): string {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function primaryLocationTerm(near: string): string {
  return near.split(',')[0].trim();
}

function cleanTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags.map(tag => cleanString(tag).slice(0, 40)).filter(Boolean).slice(0, 8);
  }
  return cleanString(tags)
    .split(',')
    .map(tag => tag.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 8);
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const category = cleanString(req.query.category);
  const search = cleanString(req.query.search);
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 100 });

  // Try Elasticsearch first; fall back to MongoDB text search
  if (search && await es.isAvailable()) {
    try {
      const { ids, total } = await es.searchDiscussions({ search, category, limit, skip });
      if (!ids.length) { res.json(pagedResponse('discussions', [], total, page, limit)); return; }

      const docs = await Discussion.find({ id: { $in: ids } });
      const order = new Map(ids.map((id: string, i: number) => [id, i]));
      docs.sort((a: any, b: any) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
      res.json(pagedResponse(
        'discussions',
        docs.map((d: any) => normalizeDiscussion(d, { includeComments: false })),
        total,
        page,
        limit,
      )); return;
    } catch (err: any) {
      console.warn('[ES] searchDiscussions failed, falling back to MongoDB:', err.message);
    }
  }

  // MongoDB fallback
  const query: any = {};
  if (category && category !== 'all') query.category = category;

  const near = !search ? cleanString(req.query.near).slice(0, 120) : '';
  const nearTerm = near ? primaryLocationTerm(near) : '';

  if (nearTerm) {
    const nearRegex = new RegExp(escapeRegExp(nearTerm), 'i');
    const [discussions, totalCount] = await Promise.all([
      Discussion.aggregate([
        { $match: query },
        { $addFields: { _nearMatch: { $cond: [{ $regexMatch: { input: { $ifNull: ['$location', ''] }, regex: nearRegex } }, 0, 1] } } },
        { $sort: { _nearMatch: 1, updatedAt: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _nearMatch: 0 } },
      ]),
      Discussion.countDocuments(query),
    ]);
    res.json(pagedResponse(
      'discussions',
      discussions.map((discussion: any) => normalizeDiscussion(discussion, { includeComments: false })),
      totalCount,
      page,
      limit,
    ));
    return;
  }

  let discussionsQuery;
  if (search) {
    discussionsQuery = Discussion.find({ $text: { $search: search }, ...query }).sort({ createdAt: -1 });
  } else {
    discussionsQuery = Discussion.find(query).sort({ updatedAt: -1, createdAt: -1 });
  }

  const [discussions, total] = await Promise.all([
    discussionsQuery.skip(skip).limit(limit),
    Discussion.countDocuments(search ? { $text: { $search: search }, ...query } : query),
  ]);
  res.json(pagedResponse(
    'discussions',
    discussions.map((discussion: any) => normalizeDiscussion(discussion, { includeComments: false })),
    total,
    page,
    limit,
  ));
});

router.post('/', authMiddleware, requireVerifiedEmail, contentCreateLimiter, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const parsedPayload = validate(discussionPayloadSchema, req.body);
  if (parsedPayload.error) { res.status(400).json({ error: parsedPayload.error }); return; }

  const title = cleanString(parsedPayload.value.title).slice(0, 200);
  const body = cleanString(parsedPayload.value.body).slice(0, MAX_DISCUSSION_BODY_LENGTH);
  const category = cleanString(parsedPayload.value.category, 'general') || 'general';
  const location = cleanString(parsedPayload.value.location).slice(0, 120);
  const tags = cleanTags(parsedPayload.value.tags);

  const discussion = new Discussion({
    id: uuidv4(),
    userId: req_.user!.id,
    authorName: req_.user!.name || req_.user!.email,
    title,
    body,
    category,
    location,
    tags,
    comments: [],
  });

  await discussion.save();
  es.indexDiscussion(discussion as any).catch(() => {});
  res.status(201).json({ discussion: normalizeDiscussion(discussion) });
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const discussion = await findDiscussionById(req.params.id as string);
  if (!discussion) {
    res.status(404).json({ error: 'Discussion topic not found.' }); return;
  }

  res.json({ discussion: normalizeDiscussion(discussion) });
});

router.post('/:id/comments', authMiddleware, requireVerifiedEmail, commentCreateLimiter, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const discussion = await findDiscussionById(req.params.id as string);
  if (!discussion) {
    res.status(404).json({ error: 'Discussion topic not found.' }); return;
  }

  const parsedPayload = validate(discussionCommentPayloadSchema, req.body);
  if (parsedPayload.error) { res.status(400).json({ error: parsedPayload.error }); return; }

  const { body, parentId } = parsedPayload.value;
  if (discussion.comments.length >= MAX_DISCUSSION_COMMENTS) {
    res.status(413).json({ error: 'This discussion has reached its maximum comment capacity.' }); return;
  }

  const parentComment = parentId ? discussion.comments.find((comment: any) => comment.id === parentId) : null;
  if (parentId && !parentComment) {
    res.status(400).json({ error: 'Reply target was not found.' }); return;
  }

  const comment = {
    id: uuidv4(),
    parentId,
    userId: req_.user!.id,
    authorName: req_.user!.name || req_.user!.email,
    body,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  discussion.comments.push(comment);
  discussion.updatedAt = new Date();
  await discussion.save();
  await createNotification({
    userId: discussion.userId,
    actorId: req_.user!.id,
    actorName: req_.user!.name || req_.user!.email,
    type: parentId ? 'discussion_reply' : 'discussion_comment',
    title: parentId ? 'New reply on your discussion topic' : 'New comment on your discussion topic',
    body,
    targetType: 'discussion',
    targetId: discussion.id,
    targetTitle: discussion.title,
    url: `/pages/community/discussions.html?id=${encodeURIComponent(discussion.id)}`,
  });
  if (parentComment) {
    await createNotification({
      userId: parentComment.userId,
      actorId: req_.user!.id,
      actorName: req_.user!.name || req_.user!.email,
      type: 'discussion_comment_reply',
      title: 'New reply to your discussion comment',
      body,
      targetType: 'discussion',
      targetId: discussion.id,
      targetTitle: discussion.title,
      url: `/pages/community/discussions.html?id=${encodeURIComponent(discussion.id)}`,
    });
  }

  res.status(201).json({ discussion: normalizeDiscussion(discussion) });
});

export default router;
