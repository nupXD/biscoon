import { Router, Request, Response } from 'express';
import Notification from '../models/Notification';
import authMiddleware from '../middleware/auth';
import { normalizeNotification } from '../utils/notifications';
import type { AuthRequest } from '../types';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const limit = Math.min(Number.parseInt(req.query.limit as string, 10) || 50, 100);
  const notifications = await Notification.find({ userId: req_.user!.id }).sort({ createdAt: -1 }).limit(limit);
  const unread = await Notification.countDocuments({ userId: req_.user!.id, read: false });
  res.json({ unread, notifications: notifications.map(normalizeNotification) });
});

router.put('/:id/read', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const notification = await Notification.findOne({ id: req.params.id, userId: req_.user!.id });
  if (!notification) { res.status(404).json({ error: 'Notification not found.' }); return; }

  notification.read = true;
  await notification.save();
  res.json({ notification: normalizeNotification(notification) });
});

router.put('/read-all', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  await Notification.updateMany({ userId: req_.user!.id, read: false }, { $set: { read: true } });
  res.json({ success: true });
});

export default router;
