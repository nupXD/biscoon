import { Router, Request, Response } from 'express';
import News from '../models/News';
import { getPagination, pagedResponse } from '../utils/pagination';
import { normalizeNewsArticle } from '../utils/news';

const router = Router();

function publishedNewsQuery(extra: Record<string, any> = {}): Record<string, any> {
  return {
    status: 'published',
    deleted: { $ne: true },
    publishedAt: { $lte: new Date() },
    ...extra,
  };
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 12, maxLimit: 50 });
  const category = String(req.query.category || '').trim();
  const search = String(req.query.search || '').trim();

  let query: any = publishedNewsQuery();
  if (category && category !== 'all') query.category = category;
  if (search) query = { ...query, $text: { $search: search } };
  const sort: Record<string, 1 | -1> = req.query.sort === 'latest'
    ? { publishedAt: -1, _id: -1 }
    : { featured: -1, publishedAt: -1 };

  const [news, total] = await Promise.all([
    News.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    News.countDocuments(query),
  ]);

  res.json(pagedResponse('news', news.map((article: any) => normalizeNewsArticle(article)), total, page, limit));
});

router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  const slugOrId = String(req.params.slug || '').trim();
  const article = await News.findOne(publishedNewsQuery({
    $or: [{ slug: slugOrId }, { id: slugOrId }],
  }));
  if (!article) { res.status(404).json({ error: 'News article not found.' }); return; }
  res.json({ article: normalizeNewsArticle(article, { includeBody: true }) });
});

export default router;
