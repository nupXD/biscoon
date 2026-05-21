import { Router, Request, Response } from 'express';
import Announcement from '../models/Announcement';

const router = Router();

router.get('/active', async (req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const ann = await Announcement.findOne({
    active: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }).sort({ createdAt: -1 });

  res.json({
    announcement: ann
      ? { id: ann.id, title: ann.title, body: ann.body, type: ann.type }
      : null,
  });
});

export default router;
