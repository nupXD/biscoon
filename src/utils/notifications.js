const { v4: uuidv4 } = require('uuid');
const Notification = require('../models/Notification');

async function createNotification({
  userId,
  actorId,
  actorName,
  type,
  title,
  body = '',
  targetType,
  targetId,
  targetTitle = '',
  url,
}) {
  if (!userId || !actorId || userId === actorId) return null;

  const notification = new Notification({
    id: uuidv4(),
    userId,
    actorId,
    actorName,
    type,
    title,
    body,
    targetType,
    targetId,
    targetTitle,
    url,
  });

  await notification.save();
  return notification;
}

function normalizeNotification(notification) {
  if (!notification) return null;
  return notification.toObject ? notification.toObject() : notification;
}

module.exports = {
  createNotification,
  normalizeNotification,
};
