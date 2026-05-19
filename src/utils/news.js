const News = require('../models/News');

function slugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return slug || `news-${Date.now()}`;
}

async function createUniqueNewsSlug(title, existingId = '') {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;

  while (await News.exists({ slug, ...(existingId ? { id: { $ne: existingId } } : {}) })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function normalizeNewsArticle(article, options = {}) {
  const doc = article.toObject ? article.toObject() : article;
  const normalized = {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary,
    category: doc.category || 'community',
    status: doc.status || 'draft',
    featured: Boolean(doc.featured),
    imageUrl: doc.imageUrl || '',
    media: (doc.media || []).map(item => ({
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

module.exports = {
  createUniqueNewsSlug,
  normalizeNewsArticle,
  slugify,
};
