import News from '../models/News';
import type { INews } from '../types';

function slugify(value: string): string {
  const slug = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return slug || `news-${Date.now()}`;
}

async function createUniqueNewsSlug(title: string, existingId = ''): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;

  while (await News.exists({ slug, ...(existingId ? { id: { $ne: existingId } } : {}) })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

interface NormalizeNewsOptions {
  includeBody?: boolean;
}

function normalizeNewsArticle(article: INews, options: NormalizeNewsOptions = {}): Record<string, unknown> {
  const doc = article.toObject ? article.toObject() : article;
  const normalized: Record<string, unknown> = {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary,
    category: doc.category || 'community',
    status: doc.status || 'draft',
    featured: Boolean(doc.featured),
    imageUrl: (doc as { imageUrl?: string }).imageUrl || '',
    media: ((doc as { media?: Array<{ id: string; type: string; url: string; caption?: string }> }).media || []).map(item => ({
      id: item.id,
      type: item.type,
      url: item.url,
      caption: item.caption || '',
    })),
    sourceName: doc.sourceName || 'Biscoon Newsroom',
    authorName: doc.authorName || '',
    publishedAt: doc.publishedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  if (options.includeBody) normalized.body = doc.body || '';
  return normalized;
}

export {
  createUniqueNewsSlug,
  normalizeNewsArticle,
  slugify,
};
