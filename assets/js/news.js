let newsApiBase = window.location.origin || 'http://localhost:4000';
if (newsApiBase.startsWith('file://')) newsApiBase = 'http://localhost:4000';

const newsState = {
  category: new URLSearchParams(window.location.search).get('category') || '',
  search: new URLSearchParams(window.location.search).get('search') || '',
};

function newsEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function newsDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function newsCategoryLabel(value) {
  return value === 'usa' ? 'USA' : (value ? value.charAt(0).toUpperCase() + value.slice(1) : 'News');
}

async function newsFetch(path) {
  const response = await fetch(`${newsApiBase}${path}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load news.');
  return data;
}

function newsImage(article, className = 'news-image') {
  if (article.imageUrl) {
    return `<img class="${className}" src="${newsEscape(article.imageUrl)}" alt="">`;
  }
  return `<div class="news-image-placeholder">B</div>`;
}

function articleMeta(article) {
  return `
    <div class="news-meta">
      <span>${newsEscape(article.sourceName || 'Biscoon Newsroom')}</span>
      ${article.authorName ? `<span>By ${newsEscape(article.authorName)}</span>` : ''}
      <span>${newsDate(article.publishedAt || article.createdAt)}</span>
    </div>
  `;
}

function leadStory(article) {
  return `
    <article class="news-lead" data-news-slug="${newsEscape(article.slug)}">
      ${newsImage(article)}
      <div class="news-category">${newsEscape(newsCategoryLabel(article.category))}</div>
      <h2 class="news-title">${newsEscape(article.title)}</h2>
      <p class="news-summary">${newsEscape(article.summary)}</p>
      ${articleMeta(article)}
    </article>
  `;
}

function storyCard(article) {
  return `
    <article class="news-card" data-news-slug="${newsEscape(article.slug)}">
      <div class="news-category">${newsEscape(newsCategoryLabel(article.category))}</div>
      <h3 class="news-title">${newsEscape(article.title)}</h3>
      <p class="news-summary">${newsEscape(article.summary)}</p>
      ${articleMeta(article)}
    </article>
  `;
}

function latestItem(article) {
  return `
    <article class="news-latest-item" data-news-slug="${newsEscape(article.slug)}">
      <div class="news-category">${newsEscape(newsCategoryLabel(article.category))}</div>
      <h3>${newsEscape(article.title)}</h3>
      <div class="news-meta"><span>${newsDate(article.publishedAt || article.createdAt)}</span></div>
    </article>
  `;
}

function renderNewsFront(articles) {
  const target = document.getElementById('newsFront');
  if (!target) return;
  if (!articles.length) {
    target.innerHTML = '<div class="news-empty">No published news yet.</div>';
    return;
  }

  const [lead, ...rest] = articles;
  const secondary = rest.slice(0, 4);
  const latest = rest.slice(4, 12);
  target.innerHTML = `
    <div class="news-layout">
      <div>
        ${leadStory(lead)}
        <div class="news-secondary-grid">${secondary.map(storyCard).join('')}</div>
      </div>
      <aside class="news-sidebar">
        <div class="news-sidebar-title">Latest</div>
        ${(latest.length ? latest : secondary).map(latestItem).join('')}
      </aside>
    </div>
  `;
}

function newsInlineFormat(value) {
  return newsEscape(value || '')
    .replace(/\n/g, '<br>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[font=(serif|sans|mono)\]([\s\S]*?)\[\/font\]/g, '<span class="news-font-$1">$2</span>');
}

function newsMediaBlock(media = {}) {
  if (!media.url) return '';
  const caption = media.caption ? `<figcaption>${newsEscape(media.caption)}</figcaption>` : '';
  const mediaHtml = media.type === 'video'
    ? `<video controls preload="metadata" src="${newsEscape(media.url)}"></video>`
    : `<img src="${newsEscape(media.url)}" alt="">`;
  return `<figure class="news-inline-media">${mediaHtml}${caption}</figure>`;
}

function articleBodyHtml(value, mediaItems = []) {
  const mediaMap = Object.fromEntries((mediaItems || []).map(item => [item.id, item]));
  const lines = String(value || '').split(/\r?\n/);
  const html = [];
  let paragraph = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${newsInlineFormat(paragraph.join('\n'))}</p>`);
    paragraph = [];
  }

  lines.forEach(line => {
    const trimmed = line.trim();
    const mediaMatch = /^\[\[media:([a-zA-Z0-9_-]+)\]\]$/.exec(trimmed);
    if (mediaMatch) {
      flushParagraph();
      html.push(newsMediaBlock(mediaMap[mediaMatch[1]]));
      return;
    }
    if (!trimmed) {
      flushParagraph();
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushParagraph();
      html.push(`<h3>${newsInlineFormat(trimmed.slice(3))}</h3>`);
      return;
    }
    if (trimmed.startsWith('> ')) {
      flushParagraph();
      html.push(`<blockquote>${newsInlineFormat(trimmed.slice(2))}</blockquote>`);
      return;
    }
    paragraph.push(line);
  });
  flushParagraph();
  return html.join('');
}

async function openNewsArticle(slug, pushState = true) {
  const reader = document.getElementById('newsReader');
  if (!reader) return;
  reader.hidden = false;
  reader.innerHTML = '<div class="news-loading">Loading story...</div>';

  const data = await newsFetch(`/api/news/${encodeURIComponent(slug)}`);
  const article = data.article;
  reader.innerHTML = `
    <article class="news-article">
      <button class="news-reader-close" type="button" data-close-news-reader>Back to headlines</button>
      <div class="news-category">${newsEscape(newsCategoryLabel(article.category))}</div>
      <h2>${newsEscape(article.title)}</h2>
      ${articleMeta(article)}
      ${article.imageUrl ? `<img src="${newsEscape(article.imageUrl)}" alt="">` : ''}
      <p class="news-summary">${newsEscape(article.summary)}</p>
      <div class="news-body">${articleBodyHtml(article.body, article.media || [])}</div>
    </article>
  `;
  if (pushState) {
    const url = new URL(window.location.href);
    url.searchParams.set('story', article.slug);
    window.history.replaceState({}, '', url.toString());
  }
  reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadNews() {
  const target = document.getElementById('newsFront');
  if (target) target.innerHTML = '<div class="news-loading">Loading latest stories...</div>';
  const params = new URLSearchParams({ page: '1', limit: '16' });
  if (newsState.category) params.set('category', newsState.category);
  if (newsState.search) params.set('search', newsState.search);
  const data = await newsFetch(`/api/news?${params}`);
  renderNewsFront(data.news || []);

  const story = new URLSearchParams(window.location.search).get('story');
  if (story) openNewsArticle(story, false).catch(error => {
    const reader = document.getElementById('newsReader');
    if (reader) {
      reader.hidden = false;
      reader.innerHTML = `<div class="news-empty">${newsEscape(error.message)}</div>`;
    }
  });
}

function bindNewsPage() {
  document.querySelectorAll('[data-news-category]').forEach(button => {
    button.classList.toggle('active', button.dataset.newsCategory === newsState.category);
    button.addEventListener('click', () => {
      newsState.category = button.dataset.newsCategory;
      document.querySelectorAll('[data-news-category]').forEach(item =>
        item.classList.toggle('active', item === button));
      const url = new URL(window.location.href);
      if (newsState.category) url.searchParams.set('category', newsState.category);
      else url.searchParams.delete('category');
      url.searchParams.delete('story');
      window.history.replaceState({}, '', url.toString());
      document.getElementById('newsReader')?.setAttribute('hidden', '');
      loadNews().catch(console.error);
    });
  });

  const searchInput = document.getElementById('newsSearchInput');
  if (searchInput) searchInput.value = newsState.search;
  document.getElementById('newsSearchForm')?.addEventListener('submit', event => {
    event.preventDefault();
    newsState.search = searchInput?.value.trim() || '';
    const url = new URL(window.location.href);
    if (newsState.search) url.searchParams.set('search', newsState.search);
    else url.searchParams.delete('search');
    url.searchParams.delete('story');
    window.history.replaceState({}, '', url.toString());
    loadNews().catch(console.error);
  });

  document.addEventListener('click', event => {
    const story = event.target.closest('[data-news-slug]');
    if (story) {
      openNewsArticle(story.dataset.newsSlug).catch(error => alert(error.message));
      return;
    }
    if (event.target.closest('[data-close-news-reader]')) {
      const reader = document.getElementById('newsReader');
      if (reader) reader.hidden = true;
      const url = new URL(window.location.href);
      url.searchParams.delete('story');
      window.history.replaceState({}, '', url.toString());
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindNewsPage();
  loadNews().catch(error => {
    const target = document.getElementById('newsFront');
    if (target) target.innerHTML = `<div class="news-empty">${newsEscape(error.message)}</div>`;
  });
});
