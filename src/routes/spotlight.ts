import { Router, Request, Response } from 'express';
import HeroSpotlight from '../models/HeroSpotlight';

const router = Router();

router.get('/active', async (_req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const spots = await HeroSpotlight.aggregate([{ $match: {
    active: true,
    deleted: { $ne: true },
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
    ],
  } },
    { $addFields: { eventPriority: { $cond: [{ $eq: ['$type', 'event'] }, 0, 1] } } },
    { $sort: { eventPriority: 1, order: 1, createdAt: -1 } },
    { $limit: 8 },
    { $project: { eventPriority: 0 } },
  ]);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ spotlights: spots });
});

export default router;
