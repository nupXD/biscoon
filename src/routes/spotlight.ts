import { Router, Request, Response } from 'express';
import HeroSpotlight from '../models/HeroSpotlight';

const router = Router();

router.get('/active', async (_req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const spots = await HeroSpotlight.find({
    active: true,
    deleted: { $ne: true },
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
    ],
  }).sort({ order: 1, createdAt: -1 }).limit(8);
  res.json({ spotlights: spots });
});

export default router;
