import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import authMiddleware from '../middleware/auth';
import Report from '../models/Report';
import { reportCreateLimiter } from '../middleware/rateLimit';
import { validate } from '../utils/validate';
import { getPagination, pagedResponse } from '../utils/pagination';
import type { AuthRequest } from '../types';

const router = Router();

const reportCreateSchema = z.object({
  targetType: z.enum(['listing', 'discussion', 'listing_comment', 'discussion_comment', 'message', 'user']),
  targetId: z.string().trim().min(1).max(160),
  parentId: z.string().trim().max(160).optional().default(''),
  reason: z.enum(['spam', 'scam', 'harassment', 'illegal', 'misinformation', 'other']),
  details: z.string().trim().max(1000).optional().default(''),
});

function normalizeReport(report: any): any {
  const item = report.toObject ? report.toObject() : report;
  delete item._id;
  delete item.__v;
  return item;
}

router.post('/reports', authMiddleware, reportCreateLimiter, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const parsedPayload = validate(reportCreateSchema, req.body);
  if (parsedPayload.error) { res.status(400).json({ error: parsedPayload.error }); return; }

  const report = new Report({
    id: uuidv4(),
    reporterId: req_.user!.id,
    reporterName: req_.user!.name || req_.user!.email,
    ...parsedPayload.value,
  });
  await report.save();
  res.status(201).json({ report: normalizeReport(report) });
});

router.get('/reports/mine', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const req_ = req as AuthRequest;
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const [reports, total] = await Promise.all([
    Report.find({ reporterId: req_.user!.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments({ reporterId: req_.user!.id }),
  ]);
  res.json(pagedResponse('reports', reports.map(normalizeReport), total, page, limit));
});

export default router;
