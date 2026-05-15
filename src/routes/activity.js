const express = require('express');
const Discussion = require('../models/Discussion');
const Listing = require('../models/Listing');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function cleanComment(comment) {
  const commentObj = comment.toObject ? comment.toObject() : comment;
  return {
    id: commentObj.id,
    body: commentObj.body,
    parentId: commentObj.parentId || '',
    createdAt: commentObj.createdAt,
  };
}

router.get('/mine', authMiddleware, async (req, res) => {
  const [createdDiscussions, commentedDiscussions, commentedListings] = await Promise.all([
    Discussion.find({ userId: req.user.id }).sort({ createdAt: -1 }),
    Discussion.find({ 'comments.userId': req.user.id }).sort({ updatedAt: -1 }),
    Listing.find({ 'comments.userId': req.user.id }).sort({ updatedAt: -1 }),
  ]);

  const activities = [];

  createdDiscussions.forEach(discussion => {
    activities.push({
      id: `discussion-topic-${discussion.id}`,
      type: 'discussion_topic',
      label: 'Discussion posted',
      title: discussion.title,
      body: discussion.body,
      targetType: 'discussion',
      targetId: discussion.id,
      targetTitle: discussion.title,
      url: `/pages/community/discussions.html?id=${encodeURIComponent(discussion.id)}`,
      createdAt: discussion.createdAt,
    });
  });

  commentedDiscussions.forEach(discussion => {
    discussion.comments
      .filter(comment => comment.userId === req.user.id)
      .forEach(comment => {
        const cleaned = cleanComment(comment);
        activities.push({
          id: `discussion-comment-${discussion.id}-${cleaned.id}`,
          type: cleaned.parentId ? 'discussion_reply' : 'discussion_comment',
          label: cleaned.parentId ? 'Discussion reply' : 'Discussion comment',
          title: discussion.title,
          body: cleaned.body,
          targetType: 'discussion',
          targetId: discussion.id,
          targetTitle: discussion.title,
          url: `/pages/community/discussions.html?id=${encodeURIComponent(discussion.id)}`,
          createdAt: cleaned.createdAt,
        });
      });
  });

  commentedListings.forEach(listing => {
    listing.comments
      .filter(comment => comment.userId === req.user.id)
      .forEach(comment => {
        const cleaned = cleanComment(comment);
        activities.push({
          id: `listing-comment-${listing.id}-${cleaned.id}`,
          type: 'listing_comment',
          label: 'Listing comment',
          title: listing.title,
          body: cleaned.body,
          targetType: 'listing',
          targetId: listing.id,
          targetTitle: listing.title,
          url: `/pages/post/detail.html?id=${encodeURIComponent(listing.id)}`,
          createdAt: cleaned.createdAt,
        });
      });
  });

  activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ activities });
});

module.exports = router;
