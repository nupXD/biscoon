const express = require('express');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');
const { normalizeNotification } = require('../utils/notifications');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 50, 100);
  const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(limit);
  const unread = await Notification.countDocuments({ userId: req.user.id, read: false });
  res.json({ unread, notifications: notifications.map(normalizeNotification) });
});

router.put('/:id/read', authMiddleware, async (req, res) => {
  const notification = await Notification.findOne({ id: req.params.id, userId: req.user.id });
  if (!notification) return res.status(404).json({ error: 'Notification not found.' });

  notification.read = true;
  await notification.save();
  res.json({ notification: normalizeNotification(notification) });
});

router.put('/read-all', authMiddleware, async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } });
  res.json({ success: true });
});

module.exports = router;
