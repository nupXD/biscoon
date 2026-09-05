import Fuse from 'fuse.js';

type SearchItem = {
  title: string;
  subtitle: string;
  kind: 'listing' | 'discussion';
  url: string;
  tokens: string[];
};

let fuse: Fuse<SearchItem> | null = null;
let loading: Promise<void> | null = null;

function apiBase(): string {
  return window.location.origin.startsWith('file://') ? 'http://localhost:4000' : window.location.origin;
}

function relativeUrl(path: string): string {
  return path;
}

async function loadIndex(): Promise<void> {
  if (fuse || loading) return loading || Promise.resolve();
  loading = Promise.all([
    fetch(`${apiBase()}/api/listings?limit=100`).then(r => r.ok ? r.json() : { listings: [] }).catch(() => ({ listings: [] })),
    fetch(`${apiBase()}/api/discussions?limit=50`).then(r => r.ok ? r.json() : { discussions: [] }).catch(() => ({ discussions: [] })),
  ]).then(([listingData, discussionData]) => {
    const listings: SearchItem[] = (listingData.listings || []).map((listing: any) => ({
      title: listing.title || 'Untitled listing',
      subtitle: [listing.category, listing.subcategory, listing.location].filter(Boolean).join(' · '),
      kind: 'listing',
      url: relativeUrl(`/pages/post/detail.html?id=${encodeURIComponent(listing.id)}`),
      tokens: [listing.description, listing.availability, listing.price, ...(listing.tags || [])].filter(Boolean),
    }));
    const discussions: SearchItem[] = (discussionData.discussions || []).map((discussion: any) => ({
      title: discussion.title || 'Discussion',
      subtitle: ['Discussion', discussion.category, discussion.authorName].filter(Boolean).join(' · '),
      kind: 'discussion',
      url: relativeUrl(`/pages/community/discussions.html?id=${encodeURIComponent(discussion.id)}`),
      tokens: [discussion.body, ...(discussion.tags || [])].filter(Boolean),
    }));
    fuse = new Fuse([...listings, ...discussions], {
      keys: ['title', 'subtitle', 'tokens'],
      threshold: 0.35,
      ignoreLocation: true,
    });
  });
  return loading;
}

function saEscapeHtml(value = ''): string {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char));
}

function ensurePanel(input: HTMLInputElement): HTMLElement {
  const parent = input.closest('.nav-search') || input.parentElement || document.body;
  let panel = parent.querySelector<HTMLElement>('.biscoon-suggest-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'biscoon-suggest-panel';
    parent.appendChild(panel);
  }
  return panel;
}

function hidePanels(): void {
  document.querySelectorAll<HTMLElement>('.biscoon-suggest-panel').forEach(panel => {
    panel.hidden = true;
    panel.innerHTML = '';
  });
}

async function showSuggestions(input: HTMLInputElement): Promise<void> {
  const query = input.value.trim();
  const panel = ensurePanel(input);
  if (query.length < 2) {
    hidePanels();
    return;
  }
  await loadIndex();
  const results = (fuse?.search(query, { limit: 7 }) || []).map(result => result.item);
  if (!results.length) {
    panel.hidden = true;
    return;
  }
  panel.innerHTML = results.map(item => `
    <a class="biscoon-suggest-item" href="${saEscapeHtml(item.url)}">
      <span class="biscoon-suggest-kind">${item.kind === 'listing' ? 'Listing' : 'Discussion'}</span>
      <strong>${saEscapeHtml(item.title)}</strong>
      <small>${saEscapeHtml(item.subtitle)}</small>
    </a>
  `).join('');
  panel.hidden = false;
}

function bindInput(input: HTMLInputElement): void {
  if (input.dataset.fuseBound) return;
  input.dataset.fuseBound = 'true';
  input.setAttribute('autocomplete', 'off');
  input.addEventListener('focus', () => showSuggestions(input).catch(console.error));
  input.addEventListener('input', () => showSuggestions(input).catch(console.error));
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') hidePanels();
  });
}

function start(): void {
  document.querySelectorAll<HTMLInputElement>('.nav-search-input, #searchInput').forEach(bindInput);
  document.addEventListener('click', event => {
    if (!(event.target as HTMLElement | null)?.closest('.nav-search, .search-bar, .search-panel')) hidePanels();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
