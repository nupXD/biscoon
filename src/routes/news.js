const express = require('express');
const News = require('../models/News');
const { getPagination, pagedResponse } = require('../utils/pagination');
const { normalizeNewsArticle } = require('../utils/news');

const router = express.Router();

function publishedNewsQuery(extra = {}) {
  return {
    status: 'published',
    publishedAt: { $lte: new Date() },
    ...extra,
  };
}

router.get('/', async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 12, maxLimit: 50 });
  const category = String(req.query.category || '').trim();
  const search = String(req.query.search || '').trim();

  let query = publishedNewsQuery();
  if (category && category !== 'all') query.category = category;
  if (search) query = { ...query, $text: { $search: search } };

  const [news, total] = await Promise.all([
    News.find(query)
      .sort({ featured: -1, publishedAt: -1 })
      .skip(skip)
      .limit(limit),
    News.countDocuments(query),
  ]);

  res.json(pagedResponse('news', news.map(article => normalizeNewsArticle(article)), total, page, limit));
});

router.get('/:slug', async (req, res) => {
  const slugOrId = String(req.params.slug || '').trim();
  const article = await News.findOne(publishedNewsQuery({
    $or: [{ slug: slugOrId }, { id: slugOrId }],
  }));
  if (!article) return res.status(404).json({ error: 'News article not found.' });
  res.json({ article: normalizeNewsArticle(article, { includeBody: true }) });
});

module.exports = router;
