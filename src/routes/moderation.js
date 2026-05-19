const express = require('express');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const Report = require('../models/Report');
const { validate } = require('../utils/validate');
const { getPagination, pagedResponse } = require('../utils/pagination');

const router = express.Router();

const reportCreateSchema = z.object({
  targetType: z.enum(['listing', 'discussion', 'listing_comment', 'discussion_comment', 'message', 'user']),
  targetId: z.string().trim().min(1).max(160),
  parentId: z.string().trim().max(160).optional().default(''),
  reason: z.enum(['spam', 'scam', 'harassment', 'illegal', 'misinformation', 'other']),
  details: z.string().trim().max(1000).optional().default(''),
});

function normalizeReport(report) {
  const item = report.toObject ? report.toObject() : report;
  delete item._id;
  delete item.__v;
  return item;
}

router.post('/reports', authMiddleware, async (req, res) => {
  const parsedPayload = validate(reportCreateSchema, req.body);
  if (parsedPayload.error) return res.status(400).json({ error: parsedPayload.error });

  const report = new Report({
    id: uuidv4(),
    reporterId: req.user.id,
    reporterName: req.user.name || req.user.email,
    ...parsedPayload.value,
  });
  await report.save();
  res.status(201).json({ report: normalizeReport(report) });
});

router.get('/reports/mine', authMiddleware, async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const [reports, total] = await Promise.all([
    Report.find({ reporterId: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments({ reporterId: req.user.id }),
  ]);
  res.json(pagedResponse('reports', reports.map(normalizeReport), total, page, limit));
});

module.exports = router;
