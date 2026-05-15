const Discussion = require('../models/Discussion');

function findDiscussionById(id) {
  return Discussion.findOne({ id });
}

function normalizeComment(comment) {
  const commentObj = comment.toObject ? comment.toObject() : comment;
  return {
    ...commentObj,
    parentId: commentObj.parentId || '',
  };
}

function normalizeDiscussion(discussion, options = {}) {
  if (!discussion) return null;
  const { includeComments = true } = options;
  const discussionObj = discussion.toObject ? discussion.toObject() : discussion;
  const comments = Array.isArray(discussionObj.comments) ? discussionObj.comments.map(normalizeComment) : [];

  return {
    ...discussionObj,
    tags: discussionObj.tags || [],
    commentCount: comments.length,
    comments: includeComments ? comments : undefined,
  };
}

module.exports = {
  findDiscussionById,
  normalizeDiscussion,
};
