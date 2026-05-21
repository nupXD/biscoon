import { Router, Request, Response } from 'express';
import Discussion from '../models/Discussion';
import Listing from '../models/Listing';
import authMiddleware from '../middleware/auth';
import type { AuthRequest } from '../types';

const router = Router();

function cleanComment(comment: any): { id: string; body: string; parentId: string; createdAt: Date } {
  const commentObj = comment.toObject ? comment.toObject() : comment;
  return {
    id: commentObj.id,
    body: commentObj.body,
    parentId: commentObj.parentId || '',
    createdAt: commentObj.createdAt,
  };
}

router.get('/mine', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const [createdDiscussions, commentedDiscussions, commentedListings] = await Promise.all([
    Discussion.find({ userId: req_.user!.id }).sort({ createdAt: -1 }),
    Discussion.find({ 'comments.userId': req_.user!.id }).sort({ updatedAt: -1 }),
    Listing.find({ 'comments.userId': req_.user!.id }).sort({ updatedAt: -1 }),
  ]);

  const activities: any[] = [];

  createdDiscussions.forEach((discussion: any) => {
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

  commentedDiscussions.forEach((discussion: any) => {
    discussion.comments
      .filter((comment: any) => comment.userId === req_.user!.id)
      .forEach((comment: any) => {
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

  commentedListings.forEach((listing: any) => {
    listing.comments
      .filter((comment: any) => comment.userId === req_.user!.id)
      .forEach((comment: any) => {
        const cleaned = cleanComment(comment);
        activities.push({
          id: `listing-comment-${listing.id}-${cleaned.id}`,
          type: cleaned.parentId ? 'listing_reply' : 'listing_comment',
          label: cleaned.parentId ? 'Listing reply' : 'Listing comment',
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

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ activities });
});

export default router;
