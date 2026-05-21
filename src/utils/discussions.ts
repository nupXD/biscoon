import Discussion from '../models/Discussion';
import type { IDiscussion } from '../types';

function findDiscussionById(id: string) {
  return Discussion.findOne({ id });
}

function normalizeComment(comment: Record<string, unknown>): Record<string, unknown> {
  const commentObj = typeof (comment as { toObject?: () => unknown }).toObject === 'function'
    ? (comment as { toObject: () => Record<string, unknown> }).toObject()
    : comment;
  return {
    ...commentObj,
    parentId: (commentObj as { parentId?: string }).parentId || '',
  };
}

interface NormalizeDiscussionOptions {
  includeComments?: boolean;
}

function normalizeDiscussion(discussion: IDiscussion | null, options: NormalizeDiscussionOptions = {}): Record<string, unknown> | null {
  if (!discussion) return null;
  const { includeComments = true } = options;
  const discussionObj = discussion.toObject ? discussion.toObject() : discussion;
  const comments = Array.isArray(discussionObj.comments)
    ? discussionObj.comments.map((c: unknown) => normalizeComment(c as Record<string, unknown>))
    : [];

  return {
    ...discussionObj,
    tags: discussionObj.tags || [],
    commentCount: comments.length,
    comments: includeComments ? comments : undefined,
  };
}

export {
  findDiscussionById,
  normalizeDiscussion,
};
