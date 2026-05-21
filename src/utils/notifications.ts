import { v4 as uuidv4 } from 'uuid';
import Notification from '../models/Notification';
import { emitToUser } from '../services/realtime';

interface CreateNotificationParams {
  userId: string;
  actorId: string;
  actorName: string;
  type: string;
  title: string;
  body?: string;
  targetType: string;
  targetId: string;
  targetTitle?: string;
  url: string;
}

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
}: CreateNotificationParams) {
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
  emitToUser(userId, 'notification:new', normalizeNotification(notification));
  return notification;
}

function normalizeNotification(notification: { toObject?: () => unknown } | null): unknown {
  if (!notification) return null;
  return notification.toObject ? notification.toObject() : notification;
}

export {
  createNotification,
  normalizeNotification,
};
