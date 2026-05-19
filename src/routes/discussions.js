const express = require('express');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const Discussion = require('../models/Discussion');
const authMiddleware = require('../middleware/auth');
const { findDiscussionById, normalizeDiscussion } = require('../utils/discussions');
const { createNotification } = require('../utils/notifications');
const { validate } = require('../utils/validate');
const { getPagination, pagedResponse } = require('../utils/pagination');

const router = express.Router();
const MAX_DISCUSSION_COMMENTS = 300;
const MAX_DISCUSSION_BODY_LENGTH = 5000;

const discussionPayloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(MAX_DISCUSSION_BODY_LENGTH),
  category: z.string().trim().max(80).optional().default('general'),
  tags: z.union([z.array(z.string()), z.string()]).optional().default([]),
});

const discussionCommentPayloadSchema = z.object({
  body: z.string().trim().min(1).max(MAX_DISCUSSION_BODY_LENGTH),
  parentId: z.string().optional().default(''),
});

function cleanString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function cleanTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map(tag => cleanString(tag).slice(0, 40)).filter(Boolean).slice(0, 8);
  }
  return cleanString(tags)
    .split(',')
    .map(tag => tag.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 8);
}

router.get('/', async (req, res) => {
  const category = cleanString(req.query.category);
  const search = cleanString(req.query.search);
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 100 });

  const query = {};
  if (category && category !== 'all') query.category = category;

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
    discussions.map(discussion => normalizeDiscussion(discussion, { includeComments: false })),
    total,
    page,
    limit
  ));
});

router.post('/', authMiddleware, async (req, res) => {
  const parsedPayload = validate(discussionPayloadSchema, req.body);
  if (parsedPayload.error) return res.status(400).json({ error: parsedPayload.error });

  const title = cleanString(parsedPayload.value.title).slice(0, 200);
  const body = cleanString(parsedPayload.value.body).slice(0, MAX_DISCUSSION_BODY_LENGTH);
  const category = cleanString(parsedPayload.value.category, 'general') || 'general';
  const tags = cleanTags(parsedPayload.value.tags);

  const discussion = new Discussion({
    id: uuidv4(),
    userId: req.user.id,
    authorName: req.user.name || req.user.email,
    title,
    body,
    category,
    tags,
    comments: [],
  });

  await discussion.save();
  res.status(201).json({ discussion: normalizeDiscussion(discussion) });
});

router.get('/:id', async (req, res) => {
  const discussion = await findDiscussionById(req.params.id);
  if (!discussion) {
    return res.status(404).json({ error: 'Discussion topic not found.' });
  }

  res.json({ discussion: normalizeDiscussion(discussion) });
});

router.post('/:id/comments', authMiddleware, async (req, res) => {
  const discussion = await findDiscussionById(req.params.id);
  if (!discussion) {
    return res.status(404).json({ error: 'Discussion topic not found.' });
  }

  const parsedPayload = validate(discussionCommentPayloadSchema, req.body);
  if (parsedPayload.error) return res.status(400).json({ error: parsedPayload.error });

  const { body, parentId } = parsedPayload.value;
  if (discussion.comments.length >= MAX_DISCUSSION_COMMENTS) {
    return res.status(413).json({ error: 'This discussion has reached its maximum comment capacity.' });
  }

  const parentComment = parentId ? discussion.comments.find(comment => comment.id === parentId) : null;
  if (parentId && !parentComment) {
    return res.status(400).json({ error: 'Reply target was not found.' });
  }

  const comment = {
    id: uuidv4(),
    parentId,
    userId: req.user.id,
    authorName: req.user.name || req.user.email,
    body,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  discussion.comments.push(comment);
  discussion.updatedAt = new Date();
  await discussion.save();
  await createNotification({
    userId: discussion.userId,
    actorId: req.user.id,
    actorName: req.user.name || req.user.email,
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
      actorId: req.user.id,
      actorName: req.user.name || req.user.email,
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

module.exports = router;
