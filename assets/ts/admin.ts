/* ═══════════════════════════════════════════
   ADMIN.TS — Biscoon admin panel
═══════════════════════════════════════════ */

// ── Admin interfaces ──

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'staff' | 'sub-admin' | 'admin' | 'super-admin';
  permissions: string[];
  emailVerified?: boolean;
  createdAt?: string;
  phone?: string;
}

interface AdminListing {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  location?: string;
  locationType?: string;
  price?: string;
  priceNote?: string;
  availability?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPreference?: string;
  externalLink?: string;
  tags?: string[];
  images?: string[];
  commentCount?: number;
  userId?: string;
  createdAt?: string;
}

interface AdminDiscussion {
  id: string;
  title?: string;
  body?: string;
  category?: string;
  authorName?: string;
  tags?: string[];
  commentCount?: number;
  userId?: string;
  createdAt?: string;
}

interface AdminNewsMediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption?: string;
}

interface AdminNews {
  id: string;
  slug?: string;
  title?: string;
  summary?: string;
  body?: string;
  category?: string;
  status?: 'draft' | 'published';
  featured?: boolean;
  sourceName?: string;
  authorName?: string;
  imageUrl?: string;
  createdBy?: string;
  publishedAt?: string;
  updatedAt?: string;
  media?: AdminNewsMediaItem[];
  createdAt?: string;
}

interface AdminReport {
  id: string;
  reporterId?: string;
  targetType?: string;
  targetId?: string;
  reason?: string;
  status?: 'open' | 'reviewed' | 'dismissed';
  createdAt?: string;
}

interface AdminSpotlight {
  id: string;
  title?: string;
  subtitle?: string;
  body?: string;
  badgeText?: string;
  badgeColor?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  type?: string;
  active?: boolean;
  order?: number;
  startDate?: string;
  endDate?: string;
  createdBy?: string;
  createdAt?: string;
}

interface AdminAnnouncement {
  id: string;
  title?: string;
  body?: string;
  message?: string;
  type?: string;
  status?: 'active' | 'paused' | 'expired';
  active?: boolean;
  createdBy?: string;
  expiresAt?: string;
  createdAt?: string;
}

interface AdminComment {
  id: string;
  authorName?: string;
  body?: string;
  parentId?: string;
  targetType?: 'listing' | 'discussion';
  targetId?: string;
  targetTitle?: string;
  createdAt?: string;
}

interface MediaDraft {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption?: string;
}

interface ConfirmOptions {
  title?: string;
  tone?: 'danger' | 'primary';
  confirmText?: string;
}

const BASE = window.location.origin.startsWith('file://')
  ? 'http://localhost:4000'
  : window.location.origin;

const ADMIN_TOKEN_KEY = 'biscoonAdminToken';
const ADMIN_SESSION_KEY = 'biscoonAdminSession';
const ADMIN_LAST_ACTIVITY_KEY = 'biscoonAdminLastActivity';
const ADMIN_SIDEBAR_COLLAPSED_KEY = 'biscoonAdminSidebarCollapsed';

let _token: string = '';
let _me: AdminUser | null = null;
let _view: string = '';
let _newsMediaDraft: MediaDraft[] = [];
let _newsEditorState: { key: string; baseline: string; saving: boolean; pending: boolean; maxRequestBytes: number } | null = null;

let _modalBaseline = '';
let _modalSaving = false;
let _modalReturnFocus: HTMLElement | null = null;
let _inlineBaseline = '';
function inlineSnapshot(): string {
  return JSON.stringify(Array.from(document.querySelectorAll<HTMLInputElement>('.admin-ann-form input, .admin-ann-form textarea, .admin-ann-form select, #spotTitle, #spotSubtitle, #spotBody, #spotImageUrl, #spotImageFile, #spotType, #spotBadgeText, #spotBadgeColor, #spotCtaText, #spotCtaUrl, #spotOrder, #spotStart, #spotEnd')).map(field => [field.id, field.value, field.checked]));
}
function allowInlineLeave(): boolean {
  const busy = document.querySelector<HTMLButtonElement>('#spotSubmit, #annSubmit')?.disabled;
  if (busy) { notify('Please wait for publishing to finish.', 'info'); return false; }
  if (_inlineBaseline && inlineSnapshot() !== _inlineBaseline && !window.confirm('Discard your unsaved changes? Choose Cancel to keep editing.')) return false;
  _inlineBaseline = '';
  return true;
}
function modalSnapshot(): string {
  return JSON.stringify(Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('#adminModalOverlay input, #adminModalOverlay textarea, #adminModalOverlay select')).map(field => [field.id, field.value, (field as HTMLInputElement).checked]));
}
function modalIsDirty(): boolean {
  return !!document.getElementById('adminModalSave') && !_newsEditorState && modalSnapshot() !== _modalBaseline;
}
function trapDialogFocus(overlay: HTMLElement, onEscape: () => void): void {
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onEscape(); }
    if (event.key !== 'Tab') return;
    const items = Array.from(overlay.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex="0"]')).filter(el => !el.hasAttribute('disabled') && !el.closest('[inert]') && el.getClientRects().length);
    const first = items[0], last = items[items.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  });
}

function newsDraftSnapshot(): string {
  window.BiscoonNewsEditor?.sync?.();
  const value = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value || '';
  return JSON.stringify({
    title: value('newsTitle'), summary: value('newsSummary'), body: value('newsBody'),
    category: value('newsCategory'), status: value('newsStatus'), imageUrl: value('newsImageUrl'),
    sourceName: value('newsSource'), authorName: value('newsAuthor'),
    featured: Boolean((document.getElementById('newsFeatured') as HTMLInputElement | null)?.checked),
    media: _newsMediaDraft,
  });
}

function persistNewsDraft(): void {
  if (!_newsEditorState || !document.getElementById('newsTitle')) return;
  try {
    const snapshot = newsDraftSnapshot();
    if (snapshot !== _newsEditorState.baseline) sessionStorage.setItem(_newsEditorState.key, snapshot);
    else sessionStorage.removeItem(_newsEditorState.key);
    const hint = document.getElementById('newsDraftStatus');
    if (hint && !_newsEditorState.pending) hint.textContent = snapshot === _newsEditorState.baseline ? 'No unsaved changes' : 'Draft backed up in this tab';
  } catch {
    const hint = document.getElementById('newsDraftStatus');
    if (hint) hint.textContent = 'Draft backup unavailable. Save before leaving.';
  }
}

window.addEventListener('beforeunload', event => {
  if (_modalSaving || modalIsDirty() || (_inlineBaseline && inlineSnapshot() !== _inlineBaseline)) { event.preventDefault(); event.returnValue = ''; }
  if (!_newsEditorState) return;
  persistNewsDraft();
  if (_newsEditorState.saving || _newsEditorState.pending || newsDraftSnapshot() !== _newsEditorState.baseline) {
    event.preventDefault();
    event.returnValue = '';
  }
});
for (const eventName of ['input', 'change', 'click', 'news-editor-change']) {
  document.addEventListener(eventName, () => {
    if (_newsEditorState) queueMicrotask(persistNewsDraft);
  });
}


const _s = {
  users:         { page: 1, search: '', kind: 'regular' },
  listings:      { page: 1, category: '', search: '' },
  events:        { page: 1, search: '' },
  news:          { page: 1, status: 'all', category: '', search: '', featured: 'all', range: 'all' as 'today' | '7d' | '30d' | 'all' },
  discussions:   { page: 1, search: '' },
  comments:      { page: 1, type: 'all', search: '' },
  reports:       { page: 1, status: 'open' },
  spotlight:     {},
  announcements: {},
  audit:         { page: 1, action: 'all', targetType: 'all', search: '' },
  dashboard:     { range: 'all' as 'today' | '7d' | '30d' | 'all', updatedAt: 0 },
};

const workspaceDefaults = JSON.parse(JSON.stringify(_s));
function writeWorkspace(push = false): void {
  if (!_view) return;
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('view', _view);
  for (const [key, value] of Object.entries(_s[_view] || {})) {
    if (key !== 'updatedAt' && value !== '' && value !== workspaceDefaults[_view]?.[key]) url.searchParams.set(key, String(value));
  }
  if (url.href !== window.location.href) history[push ? 'pushState' : 'replaceState']({}, '', url);
}
function restoreWorkspace(): void {
  const query = new URLSearchParams(window.location.search);
  const candidate = query.get('view') || firstAccessibleView();
  const view = canAccessView(candidate) && (Object.prototype.hasOwnProperty.call(workspaceDefaults, candidate) || candidate === 'trash') ? candidate : firstAccessibleView();
  if (_s[view]) {
    Object.assign(_s[view], workspaceDefaults[view]);
    for (const key of Object.keys(_s[view])) {
      const value = query.get(key);
      if (value === null || key === 'updatedAt') continue;
      _s[view][key] = key === 'page' ? Math.max(1, Math.min(100000, Number(value) || 1)) : value;
    }
  }
  navigate(view, false);
}
window.addEventListener('popstate', () => {
  if (!_me) return;
  if (!closeModal() || !allowInlineLeave()) { writeWorkspace(true); return; }
  restoreWorkspace();
});

let _dashRefreshTimer: ReturnType<typeof setInterval> | null = null;
let _dashUpdatedTimer: ReturnType<typeof setInterval> | null = null;

/* ── Bootstrap ── */
document.addEventListener('DOMContentLoaded', async () => {
  setupAdminShell();
  _token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
  if (!_token) { goLogin(); return; }
  try {
    const apiResult: any = await api('/api/auth/me');
    const user: AdminUser = apiResult.user || apiResult;
    if (!isAdminRole(user.role)) {
      notify('Access denied. Admin accounts only.', 'error');
      window.location.href = '../../index.html';
      return;
    }
    _me = user;
    document.getElementById('adminName').textContent = `${_me.name} · ${roleLabel(_me.role)}`;
    syncNavVisibility();
    restoreWorkspace();
    void updateAttentionCounts();
  } catch {
    goLogin();
  }
});

/* ── API ── */
async function api(path: string, opts: RequestInit & { headers?: Record<string, string> } = {}): Promise<any> {
  const headers: Record<string, string> = { Authorization: `Bearer ${_token}`, ...(opts.headers as Record<string, string> || {}) };
  if (opts.body) headers['Content-Type'] = 'application/json';
  const r = await fetch(BASE + path, { ...opts, headers });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Request failed.');
  localStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(Date.now()));
  return d;
}

function goLogin(): void { window.location.href = 'login.html'; }

/* ── Navigation ── */
const VIEW_TITLES = {
  dashboard: 'Dashboard', users: 'Users', listings: 'Listings',
  events: 'Events',
  news: 'News', discussions: 'Discussions', comments: 'Comments', reports: 'Reports',
  spotlight: 'Homepage Spotlight', announcements: 'Announcements', audit: 'Audit Logs', trash: 'Trash',
};

const VIEW_HINTS = {
  dashboard: 'Live snapshot of users, listings, news, discussions, and recent activity.',
  users: 'Review regular accounts and manage admin users with assigned privileges.',
  listings: 'Inspect, edit, and moderate public listings across all categories.',
  events: 'Create, edit, and manage community events posted on Biscoon.',
  news: 'Draft, publish, feature, and manage newsroom stories with rich media.',
  discussions: 'Create and moderate community discussion threads.',
  comments: 'Review listing and discussion comments from one moderation queue.',
  reports: 'Track reported content and move each report through review.',
  spotlight: 'Banners that rotate in the homepage hero. Live ones appear to visitors; paused ones stay hidden.',
  announcements: 'Publish site-wide messages and control visibility.',
  trash: 'Soft-deleted content — the internet is forever. Only super-admins can restore or permanently delete.',
  audit: 'Review super-admin activity, content changes, and moderation actions.',
};

const VIEW_PERMISSION = {
  users: 'users',
  listings: 'listings',
  events: 'listings',
  news: 'news',
  discussions: 'discussions',
  comments: 'comments',
  reports: 'reports',
  spotlight: 'announcements',
  announcements: 'announcements',
};

const ADMIN_PERMISSION_DEFS = [
  { key: 'users', label: 'Regular Users', description: 'View regular accounts, inspect their content, and remove regular users.' },
  { key: 'listings', label: 'Listings', description: 'View, edit, and delete marketplace listings and events.' },
  { key: 'news', label: 'News', description: 'Create, edit, publish, feature, and delete newsroom stories.' },
  { key: 'discussions', label: 'Discussions', description: 'Create, view, edit, and delete community discussions.' },
  { key: 'comments', label: 'Comments', description: 'Review and remove listing or discussion comments.' },
  { key: 'reports', label: 'Reports', description: 'Review reports and update moderation status.' },
  { key: 'announcements', label: 'Announcements', description: 'Create, pause, activate, and delete site announcements.' },
];

function navigate(view: string, push = true): void {
  if (!closeModal() || !allowInlineLeave()) return;
  if (!canAccessView(view)) {
    content('<div class="admin-error">You do not have permission to open this admin section.</div>');
    return;
  }
  stopDashboardAutoRefresh();
  _view = view;
  writeWorkspace(push);
  document.querySelectorAll<HTMLElement>('.admin-nav-link').forEach(l =>
    l.classList.toggle('active', l.dataset.view === view));
  document.getElementById('viewTitle').textContent = VIEW_TITLES[view] || view;
  const hint = document.getElementById('viewHint');
  if (hint) hint.textContent = VIEW_HINTS[view] || 'Manage Biscoon admin operations.';
  content(loadingState(VIEW_TITLES[view] || 'Loading'));
  ({ dashboard: showDashboard, users: showUsers, listings: showListings,
     events: showEvents,
     news: showNews, discussions: showDiscussions,
     comments: showComments, reports: showReports,
     spotlight: showSpotlights, announcements: showAnnouncements,
     audit: showAuditLogs, trash: showTrash })[view]?.();
}

function content(html: string): void {
  const el = document.getElementById('adminContent');
  if (!el) return;
  el.innerHTML = html;
  _inlineBaseline = inlineSnapshot();
  el.classList.remove('admin-content-enter');
  void el.offsetWidth;
  el.classList.add('admin-content-enter');
}

function loadingState(label: string = 'Loading'): string {
  return `
    <div class="admin-loading-shell" aria-live="polite">
      <div class="admin-loading-head">
        <span class="admin-loading-spinner"></span>
        <span>${esc(label)}…</span>
      </div>
      <div class="admin-skeleton-grid">
        <span></span><span></span><span></span>
      </div>
      <div class="admin-skeleton-card">
        <span></span><span></span><span></span><span></span>
      </div>
    </div>`;
}

function setupAdminShell(): void {
  const layout = document.getElementById('adminLayout');
  const sidebarToggle = document.getElementById('adminSidebarToggle');
  const sidebarClose = document.getElementById('adminSidebarClose');
  const sidebarBackdrop = document.getElementById('adminSidebarBackdrop');
  const nav = document.getElementById('adminNav');
  const refreshBtn = document.getElementById('adminRefreshView');
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  if (!document.getElementById('adminToastHost')) {
    const host = document.createElement('div');
    host.id = 'adminToastHost';
    host.className = 'admin-toast-host';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }

  if (layout && localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === 'true') {
    layout.classList.add('admin-sidebar-collapsed');
  }

  const closeMobileSidebar = () => layout?.classList.remove('admin-sidebar-mobile-open');

  sidebarToggle?.addEventListener('click', () => {
    if (isMobile()) {
      layout?.classList.toggle('admin-sidebar-mobile-open');
      return;
    }
    const collapsed = !layout?.classList.contains('admin-sidebar-collapsed');
    layout?.classList.toggle('admin-sidebar-collapsed', collapsed);
    localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, String(collapsed));
  });

  sidebarClose?.addEventListener('click', closeMobileSidebar);
  sidebarBackdrop?.addEventListener('click', closeMobileSidebar);
  nav?.addEventListener('click', e => {
    if (isMobile() && (e.target as HTMLElement).closest('.admin-nav-link')) closeMobileSidebar();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileSidebar();
  });
  window.addEventListener('resize', () => {
    if (!isMobile()) closeMobileSidebar();
  });

  refreshBtn?.addEventListener('click', () => refreshCurrentView(true));
  setupGlobalSearch();
}

function setupGlobalSearch(): void {
  const overlay = document.createElement('div');
  overlay.id = 'adminGlobalSearch';
  overlay.className = 'admin-gs-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Global search');

  const box = document.createElement('div');
  box.className = 'admin-gs-box';

  const inputRow = document.createElement('div');
  inputRow.className = 'admin-gs-input-row';

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'admin-gs-icon');
  svg.setAttribute('width', '18'); svg.setAttribute('height', '18');
  svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const c = document.createElementNS(ns, 'circle');
  c.setAttribute('cx','6.5'); c.setAttribute('cy','6.5'); c.setAttribute('r','4.5');
  c.setAttribute('stroke','currentColor'); c.setAttribute('stroke-width','1.6');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d','M10.5 10.5L14 14'); p.setAttribute('stroke','currentColor');
  p.setAttribute('stroke-width','1.6'); p.setAttribute('stroke-linecap','round');
  svg.appendChild(c); svg.appendChild(p);

  const input = document.createElement('input');
  input.id = 'adminGsInput'; input.className = 'admin-gs-input';
  input.type = 'search'; input.placeholder = 'Search users, listings, discussions, news…';
  input.setAttribute('autocomplete', 'off'); input.setAttribute('spellcheck', 'false');

  const escKbd = document.createElement('kbd');
  escKbd.className = 'admin-gs-esc'; escKbd.textContent = 'Esc';

  inputRow.appendChild(svg); inputRow.appendChild(input); inputRow.appendChild(escKbd);

  const results = document.createElement('div');
  results.id = 'adminGsResults'; results.className = 'admin-gs-results';

  box.appendChild(inputRow); box.appendChild(results);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  let timer: ReturnType<typeof setTimeout>;
  let activeIdx = -1;

  function openSearch(): void {
    overlay.classList.add('open');
    input.value = ''; results.textContent = ''; activeIdx = -1;
    setTimeout(() => input.focus(), 60);
  }
  function closeSearch(): void { overlay.classList.remove('open'); input.blur(); }

  document.getElementById('adminSearchTrigger')?.addEventListener('click', openSearch);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); return; }
    if (e.key === 'Escape' && overlay.classList.contains('open')) { closeSearch(); return; }
    if (!overlay.classList.contains('open')) return;
    const items = results.querySelectorAll<HTMLElement>('.admin-gs-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); highlightItem(items); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); highlightItem(items); }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); items[activeIdx]?.click(); }
  });

  function highlightItem(items: NodeListOf<HTMLElement>): void {
    items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
    items[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }

  function hint(text: string): void {
    results.textContent = '';
    const d = document.createElement('div');
    d.className = 'admin-gs-hint'; d.textContent = text;
    results.appendChild(d);
  }

  const ICONS: Record<string, string> = { user:'👤', listing:'📋', discussion:'💬', news:'📰' };
  const COLORS: Record<string, string> = { user:'blue', listing:'green', discussion:'purple', news:'red' };

  function buildItem(item: any): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'admin-gs-item';
    btn.dataset.gsType = String(item.type || '');
    btn.dataset.gsId   = String(item.id   || '');

    const ico = document.createElement('span');
    ico.className = 'admin-gs-item-icon'; ico.textContent = ICONS[item.type] || '📄';

    const body = document.createElement('span');
    body.className = 'admin-gs-item-body';

    const lbl = document.createElement('span');
    lbl.className = 'admin-gs-item-label'; lbl.textContent = String(item.label || '—');

    const sub = document.createElement('span');
    sub.className = 'admin-gs-item-sub'; sub.textContent = String(item.sub || item.category || '');

    body.appendChild(lbl); body.appendChild(sub);

    const bdg = document.createElement('span');
    bdg.className = `admin-badge admin-badge-${COLORS[item.type] || 'gray'}`;
    bdg.textContent = String(item.type);

    btn.appendChild(ico); btn.appendChild(body); btn.appendChild(bdg);

    btn.addEventListener('click', () => {
      const type = btn.dataset.gsType;
      const id   = btn.dataset.gsId;
      closeSearch();
      if (type === 'user') {
        navigate('users');
        setTimeout(() => document.querySelector<HTMLElement>(`[data-view-user="${CSS.escape(id)}"]`)?.click(), 600);
      } else if (type === 'listing') {
        navigate('listings');
        setTimeout(() => document.querySelector<HTMLElement>(`[data-view-listing="${CSS.escape(id)}"]`)?.click(), 600);
      } else if (type === 'discussion') {
        navigate('discussions');
        setTimeout(() => document.querySelector<HTMLElement>(`[data-view-discussion="${CSS.escape(id)}"]`)?.click(), 600);
      } else if (type === 'news') {
        navigate('news');
      }
    });
    return btn;
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    activeIdx = -1; clearTimeout(timer);
    if (q.length < 2) { q.length ? hint('Type at least 2 characters…') : (results.textContent = ''); return; }
    hint('Searching…');
    timer = setTimeout(async () => {
      try {
        const data = await api(`/api/admin/search?q=${encodeURIComponent(q)}`);
        results.textContent = '';
        if (!data.results.length) { hint('No results found.'); return; }
        const grouped: Record<string, any[]> = {};
        for (const r of data.results) { (grouped[r.type] ??= []).push(r); }
        for (const [type, items] of Object.entries(grouped)) {
          const grp = document.createElement('div');
          grp.className = 'admin-gs-group';
          const lbl = document.createElement('div');
          lbl.className = 'admin-gs-group-label';
          lbl.textContent = capitalize(type === 'news' ? 'News' : type + 's');
          grp.appendChild(lbl);
          for (const item of items) grp.appendChild(buildItem(item));
          results.appendChild(grp);
        }
      } catch { hint('Search failed. Try again.'); }
    }, 260);
  });
}

function refreshCurrentView(showToast: boolean = false): void {
  if (!closeModal() || !allowInlineLeave()) return;
  const handlers = {
    dashboard: showDashboard,
    users: showUsers,
    listings: showListings,
    events: showEvents,
    news: showNews,
    discussions: showDiscussions,
    comments: showComments,
    reports: showReports,
    spotlight: showSpotlights,
    announcements: showAnnouncements,
    audit: showAuditLogs,
    trash: showTrash,
  };
  const refresh = handlers[_view];
  if (!refresh) return;
  content(loadingState('Refreshing'));
  refresh();
  if (showToast) notify('Refreshing current view.', 'info');
}

function notify(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
  const host = document.getElementById('adminToastHost');
  if (!host || !message) return;
  const toast = document.createElement('div');
  toast.className = `admin-toast admin-toast-${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '!' : type === 'warning' ? '!' : 'i';
  toast.innerHTML = `<span class="admin-toast-icon">${icon}</span><span>${esc(message)}</span>`;
  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 180);
  }, type === 'error' ? 5200 : 3200);
}

function confirmAction(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  return new Promise(resolve => {
    const previousFocus = document.activeElement as HTMLElement;
    const background = document.getElementById('adminModalOverlay') || document.getElementById('adminLayout');
    const alreadyInert = background?.hasAttribute('inert');
    background?.setAttribute('inert', '');
    const overlay = document.createElement('div');
    overlay.className = 'admin-confirm-overlay';
    const tone = options.tone === 'danger' ? 'danger' : 'primary';
    overlay.innerHTML = `
      <div class="admin-confirm" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
        <div class="admin-confirm-icon admin-confirm-icon-${tone}">${tone === 'danger' ? '!' : '?'}</div>
        <div class="admin-confirm-body">
          <div class="admin-confirm-title" id="confirmTitle">${esc(options.title || 'Confirm action')}</div>
          <div class="admin-confirm-message">${esc(message)}</div>
        </div>
        <div class="admin-confirm-actions">
          <button class="admin-btn admin-btn-ghost" data-confirm-cancel>Cancel</button>
          <button class="admin-btn ${tone === 'danger' ? 'admin-btn-danger-solid' : 'admin-btn-primary'}" data-confirm-ok>${esc(options.confirmText || 'Confirm')}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    let finished = false;
    const finish = value => {
      if (finished) return;
      finished = true;
      overlay.classList.remove('show');
      setTimeout(() => { overlay.remove(); if (!alreadyInert) background?.removeAttribute('inert'); previousFocus?.focus(); }, 160);
      resolve(value);
    };
    overlay.addEventListener('click', e => {
      if (e.target === overlay || (e.target as HTMLElement).closest<HTMLElement>('[data-confirm-cancel]')) finish(false);
      if ((e.target as HTMLElement).closest<HTMLElement>('[data-confirm-ok]')) finish(true);
    });
    requestAnimationFrame(() => overlay.classList.add('show'));
    trapDialogFocus(overlay, () => finish(false));
    overlay.querySelector<HTMLElement>('[data-confirm-cancel]')?.focus();
  });
}

function isTypingTarget(target: HTMLElement | null): boolean {
  const tag = target?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
}

/* ── Helpers ── */
function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}
function fmtDate(v: string | undefined | null): string {
  if (!v) return '—';
  return new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(v: string | undefined | null): string {
  if (!v) return '—';
  const d = new Date(v), now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return fmtDate(v);
}
function badge(text: string, color: string = 'gray'): string {
  return `<span class="admin-badge admin-badge-${color}">${esc(text)}</span>`;
}
function capitalize(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function isSuperAdminRole(role: string): boolean { return role === 'super-admin' || role === 'admin'; }
function isStaffAdminRole(role: string): boolean { return role === 'staff' || role === 'sub-admin'; }
function isAdminRole(role: string): boolean { return isSuperAdminRole(role) || isStaffAdminRole(role); }
function canManageStaff(): boolean { return isSuperAdminRole(_me?.role ?? ''); }
function roleLabel(role: string): string {
  if (isSuperAdminRole(role)) return 'Super Admin';
  if (isStaffAdminRole(role)) return 'Admin User';
  return 'Regular User';
}
function roleBadge(role: string): string {
  const cleanRole = role || 'user';
  const color = isSuperAdminRole(cleanRole) ? 'red' : isStaffAdminRole(cleanRole) ? 'blue' : 'gray';
  return badge(roleLabel(cleanRole), color);
}
function assignedPermissions(user: AdminUser | null = _me): string[] {
  if (isSuperAdminRole(user?.role)) return ADMIN_PERMISSION_DEFS.map(permission => permission.key);
  if (user?.role === 'sub-admin' && (!user.permissions || user.permissions.length === 0)) {
    return ADMIN_PERMISSION_DEFS.map(permission => permission.key);
  }
  return Array.isArray(user?.permissions) ? user.permissions : [];
}
function hasAdminPermission(permission: string): boolean {
  return isSuperAdminRole(_me?.role) || assignedPermissions(_me).includes(permission);
}
function canAccessView(view: string): boolean {
  if (view === 'audit') return canManageStaff();
  return !VIEW_PERMISSION[view] || hasAdminPermission(VIEW_PERMISSION[view]);
}
function firstAccessibleView(): string {
  return ['dashboard', 'users', 'listings', 'news', 'discussions', 'comments', 'reports', 'announcements', 'audit']
    .find(canAccessView) || 'dashboard';
}
function syncNavVisibility(): void {
  document.querySelectorAll<HTMLElement>('.admin-nav-link[data-view]').forEach(link => {
    link.hidden = !canAccessView(link.dataset.view);
    const label = link.querySelector('.admin-nav-label')?.textContent || '';
    link.setAttribute('aria-label', label);
    link.title = label;
  });
  document.querySelectorAll<HTMLElement>('.admin-nav-group').forEach(group => { group.hidden = !group.querySelector('.admin-nav-link:not([hidden])'); });
}
function permissionSummary(permissions: string[] = []): string {
  if (!permissions.length) return '<span class="admin-muted">No privileges</span>';
  const labels = ADMIN_PERMISSION_DEFS
    .filter(permission => permissions.includes(permission.key))
    .map(permission => badge(permission.label, 'blue'));
  return labels.join(' ');
}
function permissionCheckboxes(selected: string[] = []): string {
  const selectedSet = new Set(selected);
  return `<div class="admin-permission-grid">
    ${ADMIN_PERMISSION_DEFS.map(permission => `
      <label class="admin-check-row">
        <input type="checkbox" value="${esc(permission.key)}" data-staff-permission${selectedSet.has(permission.key) ? ' checked' : ''}>
        <span>
          <strong>${esc(permission.label)}</strong>
          <small>${esc(permission.description)}</small>
        </span>
      </label>
    `).join('')}
  </div>`;
}
function table(headers: string[], rows: string[][]): string {
  if (!rows.length) return '<div class="admin-empty">No records found.</div>';
  return `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}
function pager(current: number, total: number, view: string): string {
  if (total <= 1) return '';
  const max = Math.min(total, 9);
  const btns = Array.from({ length: max }, (_, i) => i + 1).map(i =>
    `<button class="admin-page-btn${i === current ? ' active' : ''}" data-page="${i}" data-pager-view="${view}">${i}</button>`
  );
  if (total > max) btns.push(`<span style="padding:0 6px;color:#6b7a8d;align-self:center">… ${total}</span>`);
  return `<div class="admin-pagination">${btns.join('')}</div>`;
}
function tabs(options: Array<{ value: string; label: string }>, active: string, attr: string): string {
  return `<div class="admin-tabs">${options.map(o =>
    `<button class="admin-tab${o.value === active ? ' active' : ''}" data-${attr}="${o.value}">${o.label}</button>`
  ).join('')}</div>`;
}

/* ══════════════════════════════════════
   DASHBOARD
══════════════════════════════════════ */
const DASH_RANGES: Array<{ value: 'today' | '7d' | '30d' | 'all'; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All' },
];

function stopDashboardAutoRefresh(): void {
  if (_dashRefreshTimer) { clearInterval(_dashRefreshTimer); _dashRefreshTimer = null; }
  if (_dashUpdatedTimer) { clearInterval(_dashUpdatedTimer); _dashUpdatedTimer = null; }
}

function startDashboardAutoRefresh(): void {
  stopDashboardAutoRefresh();
  _dashRefreshTimer = setInterval(() => {
    if (_view !== 'dashboard' || document.hidden || document.getElementById('adminModalOverlay') || document.querySelector('.admin-confirm-overlay')) return;
    showDashboard(true);
  }, 60000);
  _dashUpdatedTimer = setInterval(() => {
    if (_view !== 'dashboard') return;
    const el = document.getElementById('dashUpdatedAt');
    if (el && _s.dashboard.updatedAt) el.textContent = formatUpdatedAgo(_s.dashboard.updatedAt);
  }, 1000);
}

function formatUpdatedAgo(ts: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 5) return 'Updated just now';
  if (sec < 60) return `Updated ${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `Updated ${min}m ago`;
}

function rangeTrendLabel(range: string): string {
  if (range === 'today') return 'today';
  if (range === '7d') return 'this week';
  if (range === '30d') return 'this month';
  return 'this week';
}

function animateStatValues(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-count-to]').forEach((el) => {
    const target = Number(el.dataset.countTo || 0);
    const duration = 650;
    const start = performance.now();
    const from = 0;
    function frame(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (target - from) * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

async function updateAttentionCounts(): Promise<void> {
  const count = async (path: string) => { try { const data = await api(path); return Number(data.total || 0); } catch { return null; } };
  const [open, reviewing, drafts] = await Promise.all([
    hasAdminPermission('reports') ? count('/api/admin/reports?status=open&limit=1') : null,
    hasAdminPermission('reports') ? count('/api/admin/reports?status=reviewing&limit=1') : null,
    hasAdminPermission('news') ? count('/api/admin/news?status=draft&limit=1') : null,
  ]);
  const reports = open === null || reviewing === null ? null : open + reviewing;
  const badge = document.getElementById('reportsNavCount');
  if (badge) { badge.textContent = reports === null ? '' : String(reports); badge.hidden = reports === null; }
  const host = document.getElementById('dashboardAttention');
  if (host) {
    host.innerHTML = `<div class="attention-intro"><div class="attention-heading">Community desk</div><h2>Needs attention</h2><p>Review community reports and finish unpublished stories.</p></div><div class="attention-actions">
      ${hasAdminPermission('reports') ? `<button class="admin-btn admin-btn-ghost" data-attention="reports">${reports === null ? 'Reports unavailable — open reports' : `${open} open reports`}</button>` : ''}
      ${hasAdminPermission('reports') && reviewing !== null ? `<button class="admin-btn admin-btn-ghost" data-attention="reviewing">${reviewing} reports in review</button>` : ''}
      ${hasAdminPermission('news') ? `<button class="admin-btn admin-btn-ghost" data-attention="news">${drafts === null ? 'Draft count unavailable — open news' : `${drafts} unpublished drafts`}</button>` : ''}
      </div>`;
  }
}

async function showDashboard(soft = false): Promise<void> {
  writeWorkspace();
  try {
    if (!soft) content(loadingState('Dashboard'));
    const range = _s.dashboard.range || 'all';
    const [stats, feedData] = await Promise.all([
      api(`/api/admin/stats?range=${encodeURIComponent(range)}`),
      api('/api/admin/feed'),
    ]);
    if (_view !== 'dashboard') return;
    const s = stats;
    const maxCat = s.byCategory[0]?.count || 1;
    _s.dashboard.updatedAt = Date.now();
    const trendLabel = rangeTrendLabel(range);

    content(`
      <div class="dash-header">
        <div>
          <div class="dash-greeting">Welcome back, ${esc(_me!.name.split(' ')[0])}</div>
          <div class="dash-updated" id="dashUpdatedAt">${formatUpdatedAgo(_s.dashboard.updatedAt)}</div>
        </div>
        <div class="dash-header-actions">
          <div class="dash-range" role="tablist" aria-label="Dashboard time range">
            ${DASH_RANGES.map(r => `
              <button type="button" class="dash-range-btn${r.value === range ? ' active' : ''}" data-dash-range="${r.value}" role="tab" aria-selected="${r.value === range}">${r.label}</button>
            `).join('')}
          </div>
          <button class="admin-btn admin-btn-ghost dash-refresh" id="dashRefresh" type="button">↺ Refresh</button>
        </div>
      </div>

      ${(hasAdminPermission('reports') || hasAdminPermission('news')) ? '<section class="admin-attention" id="dashboardAttention" aria-live="polite">Loading items that need attention…</section>' : ''}
      <div class="dash-stat-grid">
        ${hasAdminPermission('users') ? statCard('👥', range === 'all' ? 'Total Users' : 'Users', s.users.total, s.users.thisWeek, s.users.today, 'blue', 'users', trendLabel) : ''}
        ${hasAdminPermission('listings') ? statCard('📋', range === 'all' ? 'Total Listings' : 'Listings', s.listings.total, s.listings.thisWeek, s.listings.today, 'green', 'listings', trendLabel) : ''}
        ${hasAdminPermission('news') ? statCard('📰', range === 'all' ? 'Published News' : 'News', s.news.total, s.news.thisWeek, null, 'red', 'news', trendLabel) : ''}
        ${hasAdminPermission('discussions') ? statCard('💬', 'Discussions', s.discussions.total, s.discussions.thisWeek, null, 'purple', 'discussions', trendLabel) : ''}
      </div>

      <div class="dash-quick-actions">
        ${hasAdminPermission('users') ? '<button class="dash-action-btn" data-nav-to="users" data-user-kind="regular">Regular Users</button>' : ''}
        ${canManageStaff() ? '<button class="dash-action-btn" data-nav-to="users" data-user-kind="staff">Admin Users</button>' : ''}
        ${hasAdminPermission('listings') ? '<button class="dash-action-btn" data-nav-to="listings">Manage Listings</button>' : ''}
        ${hasAdminPermission('news') ? '<button class="dash-action-btn dash-action-primary" data-create-news>Publish News</button>' : ''}
        ${hasAdminPermission('discussions') ? '<button class="dash-action-btn" data-create-discussion>Start Discussion</button>' : ''}
        ${hasAdminPermission('comments') ? '<button class="dash-action-btn" data-nav-to="comments">Review Comments</button>' : ''}
        ${hasAdminPermission('announcements') ? '<button class="dash-action-btn" data-nav-to="announcements">Create Announcement</button>' : ''}
        ${canManageStaff() ? '<button class="dash-action-btn" data-nav-to="audit">Audit Logs</button>' : ''}
      </div>

      <div class="admin-two-col">
        <div class="admin-card">
          <div class="admin-card-head">
            <span>Recent Activity</span>
            <span class="dash-card-sub">${feedData.feed.length} events</span>
          </div>
          <div class="admin-feed">
            ${feedData.feed.map((f: any) => `
              <div class="admin-feed-item dash-feed-clickable" data-feed-type="${esc(f.type)}" data-feed-id="${esc(f.id || '')}" tabindex="0" role="button">
                <div class="admin-feed-icon admin-feed-icon-${esc(f.type)}">${f.icon}</div>
                <div class="admin-feed-body">
                  <div class="admin-feed-title">${esc(f.title)}</div>
                  <div class="admin-feed-sub"><span class="dash-feed-chip">${esc(f.type)}</span> ${esc(f.sub)}</div>
                </div>
                <div class="admin-feed-meta">
                  <div class="admin-feed-time">${fmtTime(f.date)}</div>
                  <div class="dash-feed-open">Open →</div>
                </div>
              </div>
            `).join('') || '<div class="admin-empty">No activity yet.</div>'}
          </div>
        </div>

        ${hasAdminPermission('listings') ? `<div class="admin-card">
          <div class="admin-card-head">
            <span>Listings by Category</span>
            <span class="dash-card-sub">${s.byCategory.length} categories · click to filter</span>
          </div>
          <div class="dash-bar-chart">
            ${s.byCategory.map((c: any) => `
              <div class="dash-bar-row dash-bar-clickable" data-nav-to="listings" data-listing-category="${esc(c.category)}" tabindex="0" role="button" title="Open ${esc(capitalize(c.category))} listings">
                <div class="dash-bar-label" title="${esc(capitalize(c.category))}">${esc(capitalize(c.category))}</div>
                <div class="dash-bar-track">
                  <div class="dash-bar-fill" style="width:${Math.round((c.count / maxCat) * 100)}%"></div>
                  <span class="dash-bar-count">${c.count}</span>
                </div>
              </div>
            `).join('') || '<div class="admin-empty">No listings yet.</div>'}
          </div>
        </div>` : ''}
      </div>

      <div class="admin-two-col">
        ${hasAdminPermission('users') ? `<div class="admin-card">
          <div class="admin-card-head">
            <span>Recent Users</span>
            ${hasAdminPermission('users') ? '<button class="dash-see-all" data-nav-to="users" data-user-kind="regular">See all →</button>' : ''}
          </div>
          <div class="dash-mini-list">
            ${(s.recentUsers || []).map((u: any) => `
              <div class="dash-mini-item dash-mini-clickable" data-view-user="${esc(u.id)}" data-view-user-name="${esc(u.name)}" data-view-user-email="${esc(u.email)}" data-view-user-role="${esc(u.role||'user')}" data-view-user-joined="${esc(u.createdAt)}" data-view-user-listings="0" title="View user profile">
                <div class="dash-mini-avatar" style="background:${userColor(u.name)}">${esc(u.name.charAt(0).toUpperCase())}</div>
                <div class="dash-mini-body">
                  <div class="dash-mini-name">${esc(u.name)}</div>
                  <div class="dash-mini-sub">${esc(u.email)}</div>
                </div>
                <div class="dash-mini-meta">
                  ${isAdminRole(u.role) ? roleBadge(u.role) : ''}
                  <span class="dash-mini-date">${fmtTime(u.createdAt)}</span>
                </div>
              </div>
            `).join('') || '<div class="admin-empty">No users yet.</div>'}
          </div>
        </div>` : ''}

        ${hasAdminPermission('listings') ? `<div class="admin-card">
          <div class="admin-card-head">
            <span>Recent Listings</span>
            <button class="dash-see-all" data-nav-to="listings">See all →</button>
          </div>
          <div class="dash-mini-list">
            ${(s.recentListings || []).map((l: any) => `
              <div class="dash-mini-item dash-mini-clickable" data-view-listing="${esc(l.id)}" title="View listing">
                <div class="dash-mini-cat-icon">${catEmoji(l.category)}</div>
                <div class="dash-mini-body">
                  <div class="dash-mini-name">${esc(l.title)}</div>
                  <div class="dash-mini-sub">${esc(l.location || capitalize(l.category) || '—')}</div>
                </div>
                <div class="dash-mini-meta">
                  ${badge(l.category, 'green')}
                  <span class="dash-mini-date">${fmtTime(l.createdAt)}</span>
                </div>
              </div>
            `).join('') || '<div class="admin-empty">No listings yet.</div>'}
          </div>
        </div>` : ''}
      </div>
    `);

    animateStatValues();
    startDashboardAutoRefresh();

    document.getElementById('dashRefresh')?.addEventListener('click', () => {
      content(loadingState('Refreshing dashboard'));
      showDashboard();
    });

    document.querySelectorAll<HTMLElement>('[data-dash-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.dashRange as 'today' | '7d' | '30d' | 'all';
        if (!next || next === _s.dashboard.range) return;
        _s.dashboard.range = next;
        content(loadingState('Updating dashboard'));
        showDashboard();
      });
    });

    void updateAttentionCounts();
    document.querySelectorAll<HTMLElement>('[data-nav-to]').forEach(el => {
      const activate = () => {
        if (el.dataset.userKind) _s.users.kind = el.dataset.userKind;
        if (el.dataset.listingCategory !== undefined) {
          _s.listings.category = el.dataset.listingCategory || '';
          _s.listings.page = 1;
        }
        navigate(el.dataset.navTo!);
      };
      el.addEventListener('click', activate);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    });

    document.querySelectorAll<HTMLElement>('.dash-feed-clickable').forEach(el => {
      const activate = () => {
        const type = el.dataset.feedType || '';
        const id = el.dataset.feedId || '';
        if (type === 'listing' && id) {
          navigate('listings');
          setTimeout(() => {
            const btn = document.querySelector<HTMLElement>(`[data-view-listing="${CSS.escape(id)}"]`);
            btn?.click();
          }, 350);
          return;
        }
        if (type === 'discussion' && id) {
          navigate('discussions');
          setTimeout(() => {
            const btn = document.querySelector<HTMLElement>(`[data-view-discussion="${CSS.escape(id)}"]`);
            btn?.click();
          }, 350);
          return;
        }
        if (type === 'user' && id) {
          navigate('users');
          return;
        }
        const map: Record<string, string> = { user: 'users', listing: 'listings', discussion: 'discussions' };
        if (map[type]) navigate(map[type]);
      };
      el.addEventListener('click', activate);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    });

  } catch (err: any) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}

function statCard(icon: string, label: string, value: number, weekCount: number, todayCount: number | null, color: string, navTo: string, trendLabel = 'this week'): string {
  const clickable = navTo && canAccessView(navTo);
  const trendHtml = weekCount > 0
    ? `<span class="dash-trend-up">↑ ${weekCount} ${esc(trendLabel)}</span>`
    : `<span class="dash-trend-zero">No new ${esc(trendLabel)}</span>`;
  const todayHtml = todayCount != null
    ? ` · <span class="dash-today-val">${todayCount} today</span>`
    : '';
  return `<div class="admin-stat-card admin-stat-${color}${clickable ? ' dash-stat-clickable' : ''}"${clickable ? ` data-nav-to="${navTo}" tabindex="0" role="button"` : ''}>
    <div class="admin-stat-icon" aria-hidden="true">${document.querySelector(`.admin-nav-link[data-view="${navTo}"] .admin-nav-icon`)?.innerHTML || esc(icon)}</div>
    <div class="admin-stat-content">
      <div class="admin-stat-value" data-count-to="${Number(value) || 0}">0</div>
      <div class="admin-stat-label">${label}</div>
      <div class="dash-stat-footer">${trendHtml}${todayHtml}</div>
    </div>
    <div class="dash-stat-arr">›</div>
  </div>`;
}

function userColor(name: string): string {
  const colors = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#6366f1','#14b8a6'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % colors.length;
  return colors[h];
}
function catEmoji(cat: string): string {
  const m = { jobs:'💼',housing:'🏠',pg:'🛏',services:'🔧',kinbech:'🛒',restaurants:'🍽',shops:'🏪',events:'🎉',tech:'💻',healthcare:'🏥',education:'📚',auto:'🚗',beauty:'💄',childcare:'👶',cleaning:'🧹',photography:'📷',produce:'🥬',organizations:'🏢',discussions:'💬',student:'🎓',finance:'💰',immigration:'✈️' };
  return m[cat] || '📦';
}

const LISTING_VIEW_PROFILES = {
  base: {
    kindLabel: 'Listing',
    subcategoryLabel: 'Specific type',
    descriptionLabel: 'Description',
    locationLabel: 'Location',
    locationTypeLabel: 'Location type',
    priceLabel: 'Price / rate',
    availabilityLabel: 'Availability',
  },
  photography: {
    kindLabel: 'Photography showcase',
    subcategoryLabel: 'Photo style / genre',
    descriptionLabel: 'Caption / story',
    omitFields: ['location', 'locationType', 'price', 'availability', 'contactEmail', 'contactPhone', 'contactPreference', 'externalLink'],
  },
  housing: {
    kindLabel: 'Housing listing',
    subcategoryLabel: 'Housing type',
    descriptionLabel: 'Housing details',
    locationLabel: 'Area / neighborhood',
    locationTypeLabel: 'Showing format',
    priceLabel: 'Rent / cost',
    availabilityLabel: 'Move-in / availability',
  },
  jobs: {
    kindLabel: 'Job listing',
    subcategoryLabel: 'Role type',
    descriptionLabel: 'Job description',
    locationLabel: 'Work location',
    locationTypeLabel: 'Work setup',
    priceLabel: 'Pay / compensation',
    availabilityLabel: 'Start date / schedule',
    contactPreferenceLabel: 'Application method',
    externalLinkLabel: 'Application link',
  },
  marketplace: {
    kindLabel: 'Marketplace listing',
    subcategoryLabel: 'Item / business type',
    descriptionLabel: 'Item details',
    locationLabel: 'Pickup / service area',
    locationTypeLabel: 'Pickup format',
    priceLabel: 'Asking price',
    availabilityLabel: 'Pickup / availability',
  },
  service: {
    kindLabel: 'Service listing',
    subcategoryLabel: 'Service type',
    descriptionLabel: 'Service details',
    locationLabel: 'Service area',
    locationTypeLabel: 'Service format',
    priceLabel: 'Rate / starting price',
    availabilityLabel: 'Booking availability',
  },
  professional: {
    kindLabel: 'Professional listing',
    subcategoryLabel: 'Professional type',
    descriptionLabel: 'Professional details',
    locationLabel: 'Practice / service area',
    locationTypeLabel: 'Consultation format',
    priceLabel: 'Consultation fee',
    availabilityLabel: 'Appointment availability',
  },
  event: {
    kindLabel: 'Event listing',
    subcategoryLabel: 'Event type',
    descriptionLabel: 'Event details',
    locationLabel: 'Venue / area',
    locationTypeLabel: 'Event format',
    priceLabel: 'Ticket / entry cost',
    availabilityLabel: 'Date / timing',
    externalLinkLabel: 'RSVP / ticket link',
  },
  community: {
    kindLabel: 'Community post',
    subcategoryLabel: 'Community type',
    descriptionLabel: 'Community details',
    locationLabel: 'Community area',
    locationTypeLabel: 'Participation format',
    priceLabel: 'Cost / membership',
    availabilityLabel: 'Schedule / availability',
  },
};

function readableLabel(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function listingViewKind(listing: Partial<AdminListing> = {}): string {
  const category = String(listing.category || '').trim().toLowerCase();
  const subcategory = String(listing.subcategory || '').trim().toLowerCase();
  const hasAny = (items: string[]): boolean => items.includes(category) || items.includes(subcategory);

  if (category === 'photography') return 'photography';
  if (hasAny(['housing', 'pg', 'paying-guest', 'real-estate', 'room', 'apartment', 'roommate', 'studio', 'sublet', 'moving'])) return 'housing';
  if (category === 'jobs' || hasAny(['rojgar', 'tech', 'healthcare', 'student', 'full-time', 'part-time', 'contract', 'internship', 'remote'])) return 'jobs';
  if (hasAny(['events', 'concert', 'puja', 'meetup', 'fundraiser', 'class', 'festival', 'networking', 'music', 'art', 'sports'])) return 'event';
  if (hasAny(['legal', 'immigration', 'cpa', 'finance', 'insurance', 'education', 'tutoring', 'jyotish'])) return 'professional';
  if (hasAny(['services', 'cleaning', 'childcare', 'beauty', 'translation', 'handyman', 'catering', 'delivery'])) return 'service';
  if (hasAny(['marketplace', 'kinbech', 'restaurants', 'shops', 'produce', 'auto', 'business-for-sale', 'furniture', 'electronics', 'vehicle', 'appliance', 'books'])) return 'marketplace';
  if (hasAny(['community', 'organizations', 'literature', 'yoga', 'matchmaker', 'matrimony', 'pen-pals', 'travel'])) return 'community';
  return 'base';
}

function listingViewProfile(listing: Partial<AdminListing> = {}): any {
  return LISTING_VIEW_PROFILES[listingViewKind(listing)] || LISTING_VIEW_PROFILES.base;
}

function listingValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function listingField(label: string, value: unknown, options: { full?: boolean; raw?: boolean } = {}): string {
  if (!listingValue(value)) return '';
  const full = options.full ? ' admin-modal-full' : '';
  const content = options.raw ? String(value) : esc(value);
  return `
    <div class="admin-modal-field${full}">
      <label class="admin-modal-label">${esc(label)}</label>
      <div class="admin-view-val">${content}</div>
    </div>`;
}

function safeHttpUrl(value: unknown): string {
  const url = String(value || '').trim();
  return /^https?:\/\//i.test(url) ? url : '';
}

function safeMediaUrl(value: unknown): string {
  const url = String(value || '').trim();
  if (/^https?:\/\//i.test(url) || url.startsWith('/uploads/') || /^data:image\//i.test(url)) return url;
  return '';
}

function listingGallery(images: string[] = [], isPhotography: boolean = false): string {
  const safeImages = (Array.isArray(images) ? images : [])
    .map(safeMediaUrl)
    .filter(Boolean);

  if (!safeImages.length) {
    return isPhotography
      ? '<div class="admin-listing-gallery-empty">No photos attached to this photography post.</div>'
      : '';
  }

  return `<div class="admin-listing-gallery" data-pswp-gallery>
    ${safeImages.map((src, index) => `
      <a href="${esc(src)}" class="admin-listing-photo-link" data-pswp-src="${esc(src)}" data-pswp-width="1600" data-pswp-height="1200">
        <img src="${esc(src)}" alt="Listing photo ${index + 1}" loading="lazy">
      </a>
    `).join('')}
  </div>`;
}

/* ══════════════════════════════════════
   SHARED INTERACTIVE SECTION HELPERS
══════════════════════════════════════ */
function sectionHero(title: string, sub: string, actionsHtml = ''): string {
  return `<div class="ix-hero">
    <div>
      <div class="ix-hero-title">${esc(title)}</div>
      <div class="ix-hero-sub">${esc(sub)}</div>
    </div>
    <div class="ix-hero-actions">${actionsHtml}</div>
  </div>`;
}

function sectionStat(label: string, value: number | string, active = false, attrs = ''): string {
  return `<button type="button" class="ix-stat${active ? ' active' : ''}" ${attrs}>
    <span class="ix-stat-value" data-count-to="${Number(value) || 0}">0</span>
    <span class="ix-stat-label">${esc(label)}</span>
  </button>`;
}

function wireInteractiveRows(selector: string, openFn: (el: HTMLElement) => void): void {
  document.querySelectorAll<HTMLElement>(selector).forEach(row => {
    row.addEventListener('click', e => {
      if ((e.target as HTMLElement).closest('.ix-actions, .news-row-actions, button, select, a, input')) return;
      openFn(row);
    });
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFn(row);
      }
    });
  });
}

function bindSearch(id: string, onChange: (value: string) => void, delay = 350): void {
  let timer: ReturnType<typeof setTimeout>;
  document.getElementById(id)?.addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(() => onChange((e.target as HTMLInputElement).value.trim()), delay);
  });
}

/* ══════════════════════════════════════
   USERS
══════════════════════════════════════ */
async function showUsers(page?: number): Promise<void> {
  if (page !== undefined) _s.users.page = page;
  writeWorkspace();
  if (_s.users.kind === 'staff') {
    await showStaffUsers(_s.users.page);
    return;
  }
  const { page: p, search } = _s.users;
  try {
    const data = await api(`/api/admin/users?${new URLSearchParams({ page: String(p), limit: String(20), search })}`);
    const withListings = (data.users || []).filter((u: any) => (u.listingCount || 0) > 0).length;
    content(`
      ${sectionHero('Users', 'Review community accounts. Click a row to open the profile.', canManageStaff() ? tabs(
          [{ label: 'Regular Users', value: 'regular' }, { label: 'Admin Users', value: 'staff' }],
          _s.users.kind, 'user-kind'
        ) : '')}
      <div class="ix-stat-grid">
        ${sectionStat('Total users', data.total, true)}
        ${sectionStat('With listings', withListings)}
        ${sectionStat('On this page', (data.users || []).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="userSearch" aria-label="Search users" type="search" placeholder="Search name or email…" value="${esc(search)}">
        <span class="ix-count">${data.total.toLocaleString()} regular user${data.total !== 1 ? 's' : ''}</span>
      </div>
      <div class="admin-card ix-card">
        ${(data.users || []).length ? `<div class="ix-list">
          ${data.users.map((u: any) => `
            <article class="ix-row" tabindex="0" role="button"
              data-view-user="${esc(u.id)}" data-view-user-name="${esc(u.name)}" data-view-user-email="${esc(u.email)}" data-view-user-role="${esc(u.role||'user')}" data-view-user-joined="${esc(u.createdAt)}" data-view-user-listings="${u.listingCount}">
              <div class="ix-avatar" style="background:${userColor(u.name)}">${esc((u.name || '?').charAt(0).toUpperCase())}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(u.name)}</div>
                <div class="ix-meta">${esc(u.email)}${u.phone ? ` · ${esc(u.phone)}` : ''} · 📋 ${u.listingCount || 0} listings · Joined ${fmtDate(u.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-ghost" type="button" data-view-user="${esc(u.id)}" data-view-user-name="${esc(u.name)}" data-view-user-email="${esc(u.email)}" data-view-user-role="${esc(u.role||'user')}" data-view-user-joined="${esc(u.createdAt)}" data-view-user-listings="${u.listingCount}">👁 View</button>
                <button class="admin-btn admin-btn-danger" type="button" data-del-user="${esc(u.id)}" data-del-name="${esc(u.name)}">🗑</button>
              </div>
            </article>`).join('')}
        </div>` : '<div class="admin-empty">No users match this search.</div>'}
        ${pager(data.page, data.pages, 'users')}
      </div>
    `);
    animateStatValues();
    bindSearch('userSearch', v => { _s.users.search = v; showUsers(1); }, 380);
  } catch (err: any) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

async function showStaffUsers(page?: number): Promise<void> {
  if (!canManageStaff()) {
    _s.users.kind = 'regular';
    content('<div class="admin-error">Super admin access is required to manage admin users.</div>');
    return;
  }
  if (page !== undefined) _s.users.page = page;
  writeWorkspace();
  const { page: p, search } = _s.users;
  try {
    const data = await api(`/api/admin/staff?${new URLSearchParams({ page: String(p), limit: String(20), search })}`);
    content(`
      ${sectionHero('Admin Users', 'Manage staff accounts and privileges.', `
        ${tabs([{ label: 'Regular Users', value: 'regular' }, { label: 'Admin Users', value: 'staff' }], _s.users.kind, 'user-kind')}
        <button class="admin-btn admin-btn-primary" data-create-staff type="button">+ Create Admin User</button>
      `)}
      <div class="ix-stat-grid">
        ${sectionStat('Admin users', data.total, true)}
        ${sectionStat('On this page', (data.staff || []).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="userSearch" aria-label="Search users" type="search" placeholder="Search admin users…" value="${esc(search)}">
        <span class="ix-count">${data.total.toLocaleString()} admin user${data.total !== 1 ? 's' : ''}</span>
      </div>
      <div class="admin-card ix-card">
        ${(data.staff || []).length ? `<div class="ix-list">
          ${data.staff.map((staff: any) => `
            <article class="ix-row" tabindex="0" role="button" data-edit-staff-row="${esc(staff.id)}" data-can-edit="${staff.canEdit ? '1' : '0'}">
              <div class="ix-avatar" style="background:${userColor(staff.name)}">${esc((staff.name || '?').charAt(0).toUpperCase())}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(staff.name)} ${roleBadge(staff.role)}</div>
                <div class="ix-meta">${esc(staff.email)} · Created ${fmtDate(staff.createdAt)}</div>
                <div class="ix-sub">${staff.canEdit ? permissionSummary(staff.permissions) : badge('All privileges', 'red')}</div>
              </div>
              <div class="ix-actions">
                ${staff.canEdit
                  ? `<button class="admin-btn admin-btn-ghost" type="button" data-edit-staff="${esc(staff.id)}">✏️ Edit</button>
                     <button class="admin-btn admin-btn-danger" type="button" data-del-staff="${esc(staff.id)}" data-del-name="${esc(staff.name)}">🗑</button>`
                  : '<span class="admin-you">Protected</span>'}
              </div>
            </article>`).join('')}
        </div>` : '<div class="admin-empty">No admin users found.</div>'}
        ${pager(data.page, data.pages, 'users')}
      </div>
    `);
    animateStatValues();
    bindSearch('userSearch', v => { _s.users.search = v; showUsers(1); }, 380);
    wireInteractiveRows('[data-edit-staff-row]', row => {
      if (row.dataset.canEdit === '1') openEditStaffModal(row.dataset.editStaffRow!);
    });
  } catch (err: any) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

async function openUserDetail(userId: string, userName: string, userEmail: string, userRole: string, userJoined: string, listingCount: string | number): Promise<void> {
  let data;
  try { data = await api(`/api/admin/users/${encodeURIComponent(userId)}/content`); }
  catch (err) { notify(err.message, 'error'); return; }

  const role = userRole || 'user';

  const listingRows = data.listings.length
    ? data.listings.map(l => `<tr>
        <td><span class="admin-link" data-view-listing="${esc(l.id)}">${esc(l.title)}</span></td>
        <td>${badge(l.category, 'green')}</td>
        <td>${esc(l.location || '—')}</td>
        <td>${fmtDate(l.createdAt)}</td>
        <td>
          <div class="admin-actions">
            <button class="admin-btn admin-btn-ghost" style="font-size:11px" data-view-listing="${esc(l.id)}">👁 View</button>
            <button class="admin-btn admin-btn-danger" style="font-size:11px" data-del-listing="${esc(l.id)}">🗑</button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#6b7a8d;padding:16px">No listings yet.</td></tr>';

  const discussionRows = data.discussions.length
    ? data.discussions.map(d => `<tr>
        <td><span class="admin-link" data-view-discussion="${esc(d.id)}">${esc(d.title)}</span></td>
        <td>${badge(d.category)}</td>
        <td>${d.commentCount}</td>
        <td>${fmtDate(d.createdAt)}</td>
        <td>
          <div class="admin-actions">
            <button class="admin-btn admin-btn-ghost" style="font-size:11px" data-view-discussion="${esc(d.id)}">👁 View</button>
            <button class="admin-btn admin-btn-danger" style="font-size:11px" data-del-discussion="${esc(d.id)}">🗑</button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#6b7a8d;padding:16px">No discussions yet.</td></tr>';

  openModal(`👤 ${esc(userName)}`, `
    <div class="admin-user-profile-head">
      <div class="admin-user-profile-avatar" style="background:${userColor(userName)}">${esc(userName.charAt(0).toUpperCase())}</div>
      <div style="flex:1;min-width:0">
        <div class="admin-user-profile-name">${esc(userName)}</div>
        <div class="admin-user-profile-email">${esc(userEmail || '—')}</div>
        <div class="admin-user-profile-stats">
          ${roleBadge(role)}
          <span>📋 ${data.listings.length} listing${data.listings.length !== 1 ? 's' : ''}</span>
          <span>💬 ${data.discussions.length} discussion${data.discussions.length !== 1 ? 's' : ''}</span>
          ${userJoined ? `<span>🗓 Joined ${fmtDate(userJoined)}</span>` : ''}
        </div>
      </div>
      ${userId !== _me.id ? `
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button class="admin-btn admin-btn-danger" style="font-size:11.5px" data-del-user="${esc(userId)}" data-del-name="${esc(userName)}">🗑 Delete User</button>
        </div>` : '<span class="admin-you" style="flex-shrink:0">You</span>'}
    </div>

    <div style="margin-bottom:18px">
      <div class="admin-section-label">Listings (${data.listings.length})</div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Title</th><th>Category</th><th>Location</th><th>Date</th><th></th></tr></thead>
        <tbody>${listingRows}</tbody>
      </table></div>
    </div>
    <div>
      <div class="admin-section-label">Discussions (${data.discussions.length})</div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Title</th><th>Category</th><th>Comments</th><th>Date</th><th></th></tr></thead>
        <tbody>${discussionRows}</tbody>
      </table></div>
    </div>
  `, null);
}

function collectStaffForm(requirePassword: boolean): Record<string, any> {
  const permissions = Array.from(document.querySelectorAll<HTMLInputElement>('[data-staff-permission]:checked'))
    .map(input => input.value);
  const password = (document.getElementById('staffPassword') as HTMLInputElement)?.value || '';
  const payload: Record<string, any> = {
    name: (document.getElementById('staffName') as HTMLInputElement)?.value.trim(),
    email: (document.getElementById('staffEmail') as HTMLInputElement)?.value.trim(),
    phone: (document.getElementById('staffPhone') as HTMLInputElement)?.value.trim(),
    permissions,
  };
  if (password || requirePassword) payload.password = password;
  return payload;
}

function staffFormHtml(staff: Partial<AdminUser> = {}, isCreate: boolean = false): string {
  return `
    <div class="admin-modal-grid">
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="staffName">Name</label>
        <input class="admin-modal-input" id="staffName" required value="${esc(staff.name || '')}" autocomplete="off">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="staffEmail">Email</label>
        <input class="admin-modal-input" id="staffEmail" required type="email" value="${esc(staff.email || '')}" autocomplete="off">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="staffPhone">Phone (optional)</label>
        <input class="admin-modal-input" id="staffPhone" type="tel" value="${esc(staff.phone || '')}" autocomplete="off">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="staffPassword">${isCreate ? 'Password' : 'New Password'}</label>
        <input class="admin-modal-input" id="staffPassword" type="password" minlength="8" ${isCreate ? 'required' : ''} placeholder="${isCreate ? 'Minimum 8 characters' : 'Leave blank to keep current password'}" autocomplete="new-password">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Privileges</label>
        ${permissionCheckboxes(staff.permissions || [])}
      </div>
    </div>
  `;
}

function openCreateStaffModal(): void {
  openModal('Create Admin User', staffFormHtml({}, true), async () => {
    await api('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify(collectStaffForm(true)),
    });
    showUsers(1);
  });
}

async function openEditStaffModal(id: string): Promise<void> {
  let data;
  try { data = await api(`/api/admin/staff/${encodeURIComponent(id)}`); }
  catch (err) { notify(err.message, 'error'); return; }

  openModal('Edit Admin User', staffFormHtml(data.staff, false), async () => {
    await api(`/api/admin/staff/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(collectStaffForm(false)),
    });
    showUsers(1);
  });
}

/* ══════════════════════════════════════
   LISTINGS
══════════════════════════════════════ */
const CATEGORIES = [
  '', 'jobs', 'housing', 'pg', 'services', 'kinbech', 'restaurants', 'shops',
  'childcare', 'beauty', 'auto', 'cleaning', 'photography', 'produce',
  'organizations', 'events', 'discussions', 'tech', 'healthcare', 'education',
  'student', 'finance', 'immigration', 'other',
];

const DISCUSSION_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'jobs', label: 'Jobs' },
  { value: 'housing', label: 'Housing' },
  { value: 'services', label: 'Services' },
  { value: 'events', label: 'Events' },
  { value: 'newcomers', label: 'Newcomers' },
  { value: 'immigration', label: 'Immigration' },
  { value: 'education', label: 'Education' },
  { value: 'business', label: 'Business' },
  { value: 'community', label: 'Community' },
];

function discussionCategoryOptions(selected: string = 'general'): string {
  const selectedValue = selected || 'general';
  const known = DISCUSSION_CATEGORIES.some(category => category.value === selectedValue);
  return `${DISCUSSION_CATEGORIES.map(category =>
    `<option value="${esc(category.value)}"${category.value === selectedValue ? ' selected' : ''}>${esc(category.label)}</option>`
  ).join('')}${known ? '' : `<option value="${esc(selectedValue)}" selected>${esc(capitalize(selectedValue))}</option>`}`;
}

async function showListings(page?: number): Promise<void> {
  if (page !== undefined) _s.listings.page = page;
  writeWorkspace();
  const { page: p, category, search } = _s.listings;
  try {
    const data = await api(`/api/admin/listings?${new URLSearchParams({ page: String(p), limit: String(20), category, search })}`);
    const topCats = CATEGORIES.filter(Boolean).slice(0, 8);
    content(`
      ${sectionHero('Listings', 'Inspect and moderate marketplace posts. Click a card to open details.')}
      <div class="ix-chip-row">
        <button type="button" class="ix-chip${!category ? ' active' : ''}" data-listing-chip="">All</button>
        ${topCats.map(c => `<button type="button" class="ix-chip${category === c ? ' active' : ''}" data-listing-chip="${esc(c)}">${esc(capitalize(c))}</button>`).join('')}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="listingSearch" aria-label="Search listings" type="search" placeholder="Search listings…" value="${esc(search)}">
        <select class="admin-select" id="listingCat" aria-label="Listing category">
          ${CATEGORIES.map(c => `<option value="${esc(c)}"${c === category ? ' selected' : ''}>${c ? capitalize(c) : 'All categories'}</option>`).join('')}
        </select>
        <span class="ix-count">${data.total.toLocaleString()} listing${data.total !== 1 ? 's' : ''}</span>
      </div>
      <div class="admin-card ix-card">
        ${(data.listings || []).length ? `<div class="ix-list">
          ${data.listings.map((l: any) => `
            <article class="ix-row" tabindex="0" role="button" data-open-listing="${esc(l.id)}">
              <div class="ix-icon">${catEmoji(l.category)}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(l.title)}</div>
                <div class="ix-meta">${badge(l.category)} · ${esc(l.location || 'No location')} · ${fmtDate(l.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-ghost" type="button" data-view-listing="${esc(l.id)}">👁 View</button>
                <button class="admin-btn admin-btn-ghost" type="button" data-edit-listing="${esc(l.id)}">✏️ Edit</button>
                <button class="admin-btn admin-btn-danger" type="button" data-del-listing="${esc(l.id)}">🗑</button>
              </div>
            </article>`).join('')}
        </div>` : '<div class="admin-empty">No listings match these filters.</div>'}
        ${pager(data.page, data.pages, 'listings')}
      </div>
    `);
    bindSearch('listingSearch', v => { _s.listings.search = v; showListings(1); }, 380);
    document.getElementById('listingCat')?.addEventListener('change', e => {
      _s.listings.category = (e.target as HTMLInputElement).value; showListings(1);
    });
    document.querySelectorAll<HTMLElement>('[data-listing-chip]').forEach(btn => {
      btn.addEventListener('click', () => {
        _s.listings.category = btn.dataset.listingChip || '';
        showListings(1);
      });
    });
    wireInteractiveRows('[data-open-listing]', row => openViewListing(row.dataset.openListing!));
  } catch (err: any) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

/* ══════════════════════════════════════
   EVENTS
══════════════════════════════════════ */
async function showEvents(page?: number): Promise<void> {
  if (page !== undefined) _s.events.page = page;
  writeWorkspace();
  const { page: p, search } = _s.events;
  try {
    const data = await api(`/api/admin/listings?${new URLSearchParams({ page: String(p), limit: String(20), category: 'events', search })}`);
    content(`
      ${sectionHero('Events', 'Create and manage community events.', '<button class="admin-btn admin-btn-primary" data-create-event type="button">＋ Add Event</button>')}
      <div class="ix-stat-grid">
        ${sectionStat('Events', data.total, true)}
        ${sectionStat('On this page', (data.listings || []).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="eventSearch" aria-label="Search events" type="search" placeholder="Search events…" value="${esc(search)}">
        <span class="ix-count">${data.total.toLocaleString()} event${data.total !== 1 ? 's' : ''}</span>
      </div>
      <div class="admin-card ix-card">
        ${(data.listings || []).length ? `<div class="ix-list">
          ${data.listings.map((l: any) => `
            <article class="ix-row" tabindex="0" role="button" data-open-listing="${esc(l.id)}">
              <div class="ix-icon">🎉</div>
              <div class="ix-body">
                <div class="ix-title">${esc(l.title)}</div>
                <div class="ix-meta">${esc(l.availability || 'Date TBD')} · ${esc(l.location || 'Location TBD')} · Posted ${fmtDate(l.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-ghost" type="button" data-view-listing="${esc(l.id)}">👁 View</button>
                <button class="admin-btn admin-btn-ghost" type="button" data-edit-event="${esc(l.id)}">✏️ Edit</button>
                <button class="admin-btn admin-btn-danger" type="button" data-del-event="${esc(l.id)}" data-del-title="${esc(l.title)}">🗑</button>
              </div>
            </article>`).join('')}
        </div>` : '<div class="admin-empty">No events yet. Add one to get started.</div>'}
        ${pager(data.page, data.pages, 'events')}
      </div>
    `);
    animateStatValues();
    bindSearch('eventSearch', v => { _s.events.search = v; showEvents(1); }, 380);
    wireInteractiveRows('[data-open-listing]', row => openViewListing(row.dataset.openListing!));
  } catch (err: any) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

function eventFormHtml(ev: Partial<AdminListing> = {}): string {
  return `
    <div class="admin-modal-grid">
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="evTitle">Event title</label>
        <input class="admin-modal-input" id="evTitle" required maxlength="200" value="${esc(ev.title || '')}" placeholder="e.g. Nepali New Year Celebration">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="evDesc">Description</label>
        <textarea class="admin-modal-textarea" id="evDesc" rows="5" placeholder="Event details, agenda, speakers…">${esc(ev.description || '')}</textarea>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="evDate">Date &amp; Time</label>
        <input class="admin-modal-input" id="evDate" value="${esc(ev.availability || '')}" aria-describedby="evDateHelp" placeholder="e.g. May 10, 5 PM ET"><p id="evDateHelp" class="field-guidance">Include the date, start time, and time zone.</p>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="evLocation">Location / Venue</label>
        <input class="admin-modal-input" id="evLocation" value="${esc(ev.location || '')}" placeholder="e.g. Boston City Hall, MA">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="evPrice">Price / Admission (optional)</label>
        <input class="admin-modal-input" id="evPrice" value="${esc(ev.price || '')}" placeholder="Free, $10, Members only…">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="evPhone">Contact Phone (optional)</label>
        <input class="admin-modal-input" id="evPhone" type="tel" value="${esc(ev.contactPhone || '')}" placeholder="+1-555-…">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="evEmail">Contact Email (optional)</label>
        <input class="admin-modal-input" id="evEmail" type="email" value="${esc(ev.contactEmail || '')}" placeholder="events@example.com">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="evLink">RSVP / Tickets link (optional)</label>
        <input class="admin-modal-input" id="evLink" type="url" value="${esc(ev.externalLink || '')}" placeholder="https://…">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="evTags">Tags (comma-separated) (optional)</label>
        <input class="admin-modal-input" id="evTags" value="${esc((ev.tags || []).join(', '))}" placeholder="puja, concert, fundraiser, networking">
      </div>
    </div>
  `;
}

function collectEventPayload() {
  return {
    category: 'events',
    title: (document.getElementById('evTitle') as HTMLInputElement).value.trim(),
    description: (document.getElementById('evDesc') as HTMLInputElement).value.trim(),
    availability: (document.getElementById('evDate') as HTMLInputElement).value.trim(),
    location: (document.getElementById('evLocation') as HTMLInputElement).value.trim(),
    price: (document.getElementById('evPrice') as HTMLInputElement).value.trim(),
    contactPhone: (document.getElementById('evPhone') as HTMLInputElement).value.trim(),
    contactEmail: (document.getElementById('evEmail') as HTMLInputElement).value.trim(),
    externalLink: (document.getElementById('evLink') as HTMLInputElement).value.trim(),
    tags: (document.getElementById('evTags') as HTMLInputElement).value.split(',').map(t => t.trim()).filter(Boolean),
  };
}

function openCreateEvent(): void {
  openModal('Add Event', eventFormHtml(), async () => {
    const payload = collectEventPayload();
    if (!payload.title) { notify('Event title is required.', 'error'); throw new Error('validation'); }
    await api('/api/listings', { method: 'POST', body: JSON.stringify(payload) });
    showEvents(1);
    notify('Event created.', 'success');
  });
}

async function openEditEvent(id: string): Promise<void> {
  let ev;
  try { ev = await api(`/api/admin/listings/${encodeURIComponent(id)}`); }
  catch (err) { notify(err.message, 'error'); return; }

  openModal('Edit Event', `<div class="admin-modal-meta">Posted ${fmtDate(ev.createdAt)}</div>${eventFormHtml(ev)}`, async () => {
    const payload = collectEventPayload();
    if (!payload.title) { notify('Event title is required.', 'error'); throw new Error('validation'); }
    await api(`/api/admin/listings/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
    showEvents(1);
    notify('Event updated.', 'success');
  });
}

/* ══════════════════════════════════════
   NEWS
══════════════════════════════════════ */
const NEWS_CATEGORIES = ['', 'community', 'nepal', 'usa', 'business', 'immigration', 'culture', 'opinion', 'sports', 'technology', 'world'];

function newsCategoryLabel(value: string): string {
  return value === 'usa' ? 'USA' : capitalize(value || 'community');
}

function newsStatusBadge(status: string): string {
  return badge(status === 'published' ? 'Published' : 'Draft', status === 'published' ? 'green' : 'gray');
}

function formatNewsInline(value: string): string {
  return esc(value || '')
    .replace(/\n/g, '<br>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[font=(serif|sans|mono)\]([\s\S]*?)\[\/font\]/g, '<span class="news-font-$1">$2</span>');
}

function renderNewsMediaBlock(media: Partial<MediaDraft> = {}): string {
  if (!media.url) return '';
  const caption = media.caption ? `<figcaption>${esc(media.caption)}</figcaption>` : '';
  const mediaHtml = media.type === 'video'
    ? `<video controls preload="metadata" src="${esc(media.url)}"></video>`
    : `<img src="${esc(media.url)}" alt="${esc(media.caption || 'Article image')}">`;
  return `<figure class="admin-news-media">${mediaHtml}${caption}</figure>`;
}

function isNewsHtmlBody(value: string = ''): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ''));
}

function renderHtmlNewsBody(value: string = '', mediaItems: MediaDraft[] = []): string {
  const mediaMap = Object.fromEntries((mediaItems || []).map(item => [item.id, item]));
  const wrapper = document.createElement('div');
  wrapper.innerHTML = String(value || '');
  wrapper.querySelectorAll<HTMLElement>('p').forEach(paragraph => {
    const mediaMatch = /^\[\[media:([a-zA-Z0-9_-]+)\]\]$/.exec(paragraph.textContent?.trim() || '');
    if (!mediaMatch) return;
    const mediaHtml = renderNewsMediaBlock(mediaMap[mediaMatch[1]]);
    if (!mediaHtml) {
      paragraph.remove();
      return;
    }
    const template = document.createElement('template');
    template.innerHTML = mediaHtml;
    paragraph.replaceWith(template.content.cloneNode(true));
  });
  return wrapper.innerHTML;
}

function formatNewsBody(value: string, mediaItems: MediaDraft[] = []): string {
  if (isNewsHtmlBody(value)) return renderHtmlNewsBody(value, mediaItems);
  const mediaMap = Object.fromEntries((mediaItems || []).map(item => [item.id, item]));
  const lines = String(value || '').split(/\r?\n/);
  const html = [];
  let paragraph = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${formatNewsInline(paragraph.join('\n'))}</p>`);
    paragraph = [];
  }

  lines.forEach(line => {
    const trimmed = line.trim();
    const mediaMatch = /^\[\[media:([a-zA-Z0-9_-]+)\]\]$/.exec(trimmed);
    if (mediaMatch) {
      flushParagraph();
      html.push(renderNewsMediaBlock(mediaMap[mediaMatch[1]]));
      return;
    }
    if (!trimmed) {
      flushParagraph();
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushParagraph();
      html.push(`<h3>${formatNewsInline(trimmed.slice(3))}</h3>`);
      return;
    }
    if (trimmed.startsWith('> ')) {
      flushParagraph();
      html.push(`<blockquote>${formatNewsInline(trimmed.slice(2))}</blockquote>`);
      return;
    }
    paragraph.push(line);
  });
  flushParagraph();
  return html.join('');
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read selected file.'));
    reader.readAsDataURL(file);
  });
}

async function prepareNewsImage(file: File): Promise<string> {
  // Keep small uploads intact; optimize larger photos before JSON/base64 transport.
  const targetBytes = 600 * 1024;
  if (file.size <= targetBytes) return readFileAsDataUrl(file);
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Could not open ${file.name}. Try a JPG, PNG, or WebP image.`));
      image.src = objectUrl;
    });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable in this browser.');
    let scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
    for (let attempt = 0; attempt < 6; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .85));
      if (!blob) throw new Error(`Could not process ${file.name}. Try a different image.`);
      if (blob.size <= targetBytes) {
        return readFileAsDataUrl(new File([blob], 'news-photo.jpg', { type: 'image/jpeg' }));
      }
      scale *= .75;
    }
    throw new Error(`Could not resize ${file.name}. Try exporting it as a JPG.`);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function newsMediaTypeFromFile(file: File): 'video' | 'image' {
  return file?.type?.startsWith('video/') ? 'video' : 'image';
}

function newsMediaLibraryHtml(): string {
  if (!_newsMediaDraft.length) {
    return '<div class="admin-empty admin-empty-compact">No story media yet. Upload images or videos, then insert them into the article body.</div>';
  }
  return `<div class="admin-news-media-list">
    ${_newsMediaDraft.map(item => `
      <div class="admin-news-media-item">
        <div class="admin-news-media-thumb">
          ${item.type === 'video'
            ? `<video src="${esc(item.url)}" muted></video><span>Video</span>`
            : `<img src="${esc(item.url)}" alt="${esc(item.caption || 'Media image')}"><span>Image</span>`}
        </div>
        <div class="admin-news-media-meta">
          <input class="admin-modal-input" data-news-media-caption="${esc(item.id)}" value="${esc(item.caption || '')}" placeholder="Caption">
          <small>Click in your story, then insert here.</small>
        </div>
        <div class="admin-news-media-actions">
          <button class="admin-btn admin-btn-ghost" type="button" data-insert-news-media="${esc(item.id)}">Insert at cursor</button>
          <button class="admin-btn admin-btn-danger" type="button" data-remove-news-media="${esc(item.id)}">Remove</button>
        </div>
      </div>
    `).join('')}
  </div>`;
}

function renderNewsMediaLibrary(): void {
  const target = document.getElementById('newsMediaLibrary');
  if (target) target.innerHTML = newsMediaLibraryHtml();
}

function insertIntoNewsBody(openText: string, closeText: string = ''): void {
  const textarea = (document.getElementById('newsBody') as HTMLTextAreaElement | null);
  if (!textarea) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const selected = textarea.value.slice(start, end);
  textarea.value = `${textarea.value.slice(0, start)}${openText}${selected || ''}${closeText}${textarea.value.slice(end)}`;
  const caret = selected ? start + openText.length + selected.length + closeText.length : start + openText.length;
  textarea.focus();
  textarea.setSelectionRange(caret, caret);
}

async function uploadNewsMedia(file: File): Promise<MediaDraft> {
  const type = newsMediaTypeFromFile(file);
  const url = type === 'image' ? await prepareNewsImage(file) : await readFileAsDataUrl(file);
  const body = JSON.stringify({ type, url });
  if (!_newsEditorState || new Blob([body]).size > _newsEditorState.maxRequestBytes) {
    throw new Error(`${file.name} exceeds this server's upload limit. Choose a smaller file.`);
  }
  return (await api('/api/admin/news/media', { method: 'POST', body })).media;
}

async function runNewsMediaTask(work: () => Promise<void>): Promise<void> {
  const state = _newsEditorState;
  if (!state || state.pending || state.saving) {
    notify('Wait for the current upload or save to finish.', 'error'); return;
  }
  state.pending = true;
  const shell = document.querySelector<HTMLElement>('.news-editor-shell');
  const save = document.getElementById('adminModalSave') as HTMLButtonElement | null;
  if (shell) shell.inert = true;
  if (save) save.disabled = true;
  const hint = document.getElementById('newsDraftStatus');
  if (hint) hint.textContent = 'Uploading media… Please keep this page open.';
  try { await work(); }
  catch (error) { notify(error.message || 'Media upload failed. Try again.', 'error'); }
  finally {
    state.pending = false;
    if (shell) shell.inert = false;
    if (save) save.disabled = false;
    persistNewsDraft();
  }
}

async function collectNewsPayload(): Promise<Record<string, unknown>> {
  window.BiscoonNewsEditor?.sync?.();
  let imageUrl = (document.getElementById('newsImageUrl') as HTMLInputElement)?.value.trim() || '';
  if (_newsEditorState?.pending) throw new Error('Wait for media uploads to finish before saving.');

  return {
    title: (document.getElementById('newsTitle') as HTMLInputElement)?.value.trim(),
    category: (document.getElementById('newsCategory') as HTMLInputElement)?.value,
    summary: (document.getElementById('newsSummary') as HTMLInputElement)?.value.trim(),
    body: (document.getElementById('newsBody') as HTMLInputElement)?.value.trim(),
    imageUrl,
    sourceName: (document.getElementById('newsSource') as HTMLInputElement)?.value.trim(),
    authorName: (document.getElementById('newsAuthor') as HTMLInputElement)?.value.trim(),
    status: (document.getElementById('newsStatus') as HTMLInputElement)?.value,
    featured: Boolean((document.getElementById('newsFeatured') as HTMLInputElement)?.checked),
    media: (_newsMediaDraft as any[]).map(item => ({
      id: item.id,
      type: item.type,
      url: item.url,
      caption: item.caption || '',
      createdAt: (item as any).createdAt || new Date().toISOString(),
    })),
  };
}

function newsFormHtml(article: Partial<AdminNews> = {}): string {
  const status = article.status || 'draft';
  const category = article.category || 'community';
  const title = article.title || '';
  const summary = article.summary || '';
  return `
    <div class="news-compose-intro"><div><span class="news-compose-eyebrow">BISCOON NEWSROOM</span><h3>A story worth sharing.</h3><p>Give your community the context, details, and voices that matter.</p></div><span class="news-compose-note">Write · Preview · Publish</span></div>
    <div class="news-editor-shell">
      <div class="news-editor-main">
        <div class="news-editor-section">
          <div class="news-editor-section-label">01 / The headline</div>
          <div class="admin-modal-field admin-modal-full">
            <div class="news-field-head">
              <label class="admin-modal-label" for="newsTitle">Headline</label>
              <span class="news-char-count" id="newsTitleCount">${title.length}/180</span>
            </div>
            <input class="admin-modal-input news-headline-input" id="newsTitle" aria-required="true" maxlength="180" value="${esc(title)}" placeholder="Write your headline…">
          </div>
          <div class="admin-modal-field admin-modal-full">
            <div class="news-field-head">
              <label class="admin-modal-label" for="newsSummary">Short summary</label>
              <span class="news-char-count" id="newsSummaryCount">${summary.length}/360</span>
            </div>
            <textarea class="admin-modal-textarea" id="newsSummary" aria-required="true" rows="3" maxlength="360" placeholder="What happened, and why does it matter?">${esc(summary)}</textarea>
          </div>
        </div>

        <div class="news-editor-section">
          <div class="news-editor-section-label">02 / Tell the story</div>
          <div class="admin-news-formatbar" role="toolbar" aria-label="Article formatting">
            <div class="admin-news-format-group">
              <button type="button" class="admin-news-format-btn" id="newsAddInlineImages">＋ Add images</button>
              <input id="newsInlineImages" type="file" accept="image/*" multiple hidden aria-label="Insert images into story">
            </div>
            <div class="admin-news-format-group">
              <button type="button" class="admin-news-format-btn" data-news-format="bold" title="Bold (⌘B)" aria-pressed="false"><strong>B</strong></button>
              <button type="button" class="admin-news-format-btn" data-news-format="italic" title="Italic (⌘I)" aria-pressed="false"><em>I</em></button>
              <button type="button" class="admin-news-format-btn" data-news-format="h2" title="Heading" aria-pressed="false">H2</button>
              <button type="button" class="admin-news-format-btn" data-news-format="quote" title="Quote" aria-pressed="false">“”</button>
            </div>
            <div class="admin-news-format-group">
              <button type="button" class="admin-news-format-btn" data-news-format="bullet" title="Bullet list" aria-pressed="false">• List</button>
              <button type="button" class="admin-news-format-btn" data-news-format="ordered" title="Numbered list" aria-pressed="false">1. List</button>
            </div>
            <div class="admin-news-format-group">
              <button type="button" class="admin-news-format-btn" data-news-format="font-serif" title="Serif font" aria-pressed="false" style="font-family:Georgia,serif">Serif</button>
              <button type="button" class="admin-news-format-btn" data-news-format="font-sans" title="Sans font" aria-pressed="false">Sans</button>
              <button type="button" class="admin-news-format-btn" data-news-format="font-mono" title="Mono font" aria-pressed="false" style="font-family:monospace">Mono</button>
            </div>
            <div class="admin-news-format-group">
              <button type="button" class="admin-news-format-btn" data-news-format="undo" title="Undo">↶</button>
              <button type="button" class="admin-news-format-btn" data-news-format="redo" title="Redo">↷</button>
              <button type="button" class="admin-news-format-btn" data-news-format="clear" title="Clear formatting">Clear</button>
            </div>
          </div>
          <div class="admin-news-rich-editor" id="newsRichEditor"></div>
          <div class="admin-news-editor-hint"><span id="newsWritingStats">0 words · 0 min read</span><span>Click between paragraphs, then Add images. Select text to format it.</span></div>
          <textarea class="admin-modal-textarea admin-news-hidden-body" id="newsBody" rows="12">${esc(article.body || '')}</textarea>
        </div>
        <details class="news-editor-section news-media-details">
          <summary class="news-editor-section-label">Add a cover image <span>Optional</span></summary>
          <div class="news-dropzone" id="newsCoverDrop" tabindex="0">
            <div class="news-dropzone-preview" id="newsCoverPreview">
              ${article.imageUrl ? `<img src="${esc(article.imageUrl)}" alt="${esc(article.title || 'Cover image')}">` : '<div class="news-dropzone-empty">Drop an image here, paste a URL, or choose a file</div>'}
            </div>
            <div class="news-dropzone-actions">
              <input class="admin-modal-input" id="newsImageUrl" aria-label="Cover image URL" value="${esc(article.imageUrl || '')}" placeholder="https://… or leave blank">
              <label class="admin-btn admin-btn-ghost news-file-btn">
                Choose file
                <input id="newsImageFile" aria-label="Upload cover image" type="file" accept="image/*" hidden>
              </label>
            </div>
          </div>
        </details>

        <details class="news-editor-section news-media-details">
          <summary class="news-editor-section-label">Add photos & videos <span>Optional</span></summary>
          <div class="news-dropzone news-dropzone-media" id="newsMediaDrop" tabindex="0">
            <div class="news-dropzone-empty">Add multiple photos or videos. Large photos are resized automatically.</div>
            <label class="admin-btn admin-btn-ghost news-file-btn">
              Choose files
              <input id="newsMediaFiles" aria-label="Upload story photos or videos" type="file" accept="image/*,video/*" multiple hidden>
            </label>
          </div>
          <div id="newsMediaLibrary">${newsMediaLibraryHtml()}</div>
        </details>

      </div>

      <aside class="news-editor-preview">
        <div class="news-editor-section">
          <div class="news-editor-section-label">Ready when you are</div>
          <div class="news-pill-row" role="group" aria-label="Status">
            <button type="button" class="news-pill${status === 'draft' ? ' active' : ''}" data-news-status-pill="draft" aria-pressed="${status === 'draft'}">Save as draft</button>
            <button type="button" class="news-pill${status === 'published' ? ' active' : ''}" data-news-status-pill="published" aria-pressed="${status === 'published'}">Publish to news</button>
          </div>
          <p class="news-publish-help" id="newsPublishHelp">${status === 'published' ? 'Saving makes this story visible on the news page.' : 'Only admins can see drafts. Publish when your story is ready.'}</p><input type="hidden" id="newsStatus" value="${esc(status)}">

          <div class="news-editor-section-label">Choose a desk</div><div class="news-chip-row" role="group" aria-label="Category">
            ${NEWS_CATEGORIES.filter(Boolean).map(cat => `
              <button type="button" class="news-chip${cat === category ? ' active' : ''}" data-news-category-chip="${esc(cat)}">${esc(newsCategoryLabel(cat))}</button>
            `).join('')}
          </div>
          <input type="hidden" id="newsCategory" value="${esc(category)}">

          <label class="news-featured-toggle">
            <input type="checkbox" id="newsFeatured"${article.featured ? ' checked' : ''}>
            <span class="news-featured-ui">
              <strong>★ Feature this story</strong>
              <small>Highlight in Trending. Not required to appear in news.</small>
            </span>
          </label>

          <div class="admin-modal-grid" style="margin-top:12px">
            <div class="admin-modal-field">
              <label class="admin-modal-label" for="newsSource">Source</label>
              <input class="admin-modal-input" id="newsSource" value="${esc(article.sourceName || 'Biscoon Newsroom')}">
            </div>
            <div class="admin-modal-field">
              <label class="admin-modal-label" for="newsAuthor">Author</label>
              <input class="admin-modal-input" id="newsAuthor" value="${esc(article.authorName || '')}" placeholder="Optional">
            </div>
          </div>
        </div>


        <div class="news-preview-label">Your story at a glance</div>
        <div class="news-preview-card news-preview-trigger" id="newsFullPreviewTrigger" role="button" tabindex="0" aria-haspopup="dialog" aria-label="Preview the full story">
          <div class="news-preview-cover" id="newsPreviewCover">
            ${article.imageUrl ? `<img src="${esc(article.imageUrl)}" alt="${esc(article.title || 'Cover image')}">` : '<span>Cover preview</span>'}
          </div>
          <div class="news-preview-badges">
            <span class="admin-badge admin-badge-blue" id="newsPreviewCategory">${esc(newsCategoryLabel(category))}</span>
            <span class="admin-badge ${status === 'published' ? 'admin-badge-green' : 'admin-badge-gray'}" id="newsPreviewStatus">${esc(capitalize(status))}</span>
            <span class="admin-badge admin-badge-red" id="newsPreviewFeatured" style="display:${article.featured ? '' : 'none'}">Featured</span>
          </div>
          <h3 class="news-preview-title" id="newsPreviewTitle">${esc(title || 'Your headline appears here')}</h3>
          <p class="news-preview-summary" id="newsPreviewSummary">${esc(summary || 'Your short summary appears here as you write.')}</p>
          <div class="news-preview-byline" id="newsPreviewByline">${esc(article.sourceName || 'Biscoon Newsroom')}${article.authorName ? ' · ' + esc(article.authorName) : ''}</div>
        </div>
        <div class="news-preview-hint">Click the card to preview your full story →</div><p class="news-preview-hint" id="newsDraftStatus" role="status">No unsaved changes</p>
      </aside>
    </div>
  `;
}

function openNewsFullPreview(): void {
  if (document.getElementById('newsFullPreview')) return;
  window.BiscoonNewsEditor?.sync?.();
  const value = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() || '';
  const title = value('newsTitle') || 'Your headline appears here';
  const cover = value('newsImageUrl') || _newsMediaDraft.find(item => item.type === 'image')?.url || '';
  const dialog = document.createElement('dialog');
  dialog.id = 'newsFullPreview';
  dialog.className = 'news-full-preview';
  dialog.setAttribute('aria-labelledby', 'newsFullPreviewLabel');
  dialog.innerHTML = `
    <header class="news-full-preview-toolbar">
      <div><strong id="newsFullPreviewLabel">Story preview</strong><small>Preview only · Your edits have not been saved</small></div>
      <button class="admin-btn admin-btn-ghost" type="button" data-close-full-preview autofocus>← Back to editing</button>
    </header>
    <article class="news-full-preview-article">
      <div class="news-compose-eyebrow">${esc(newsCategoryLabel(value('newsCategory')))}</div>
      <h1>${esc(title)}</h1>
      <div class="news-preview-byline">${esc(value('newsSource') || 'Biscoon Newsroom')}${value('newsAuthor') ? ` · By ${esc(value('newsAuthor'))}` : ''}</div>
      ${cover ? `<img class="news-full-preview-cover" src="${esc(cover)}" alt="${esc(title)}">` : ''}
      <p class="news-full-preview-summary">${esc(value('newsSummary') || 'Your short summary appears here.')}</p>
      <div class="admin-news-body">${formatNewsBody(value('newsBody'), _newsMediaDraft) || '<p>Your story will appear here as you write.</p>'}</div>
    </article>`;
  dialog.querySelector('[data-close-full-preview]')?.addEventListener('click', () => dialog.close());
  // Keep Escape inside this preview so the underlying editor stays open.
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') event.stopPropagation();
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    document.getElementById('newsFullPreviewTrigger')?.focus();
  });
  document.getElementById('adminModalOverlay')?.appendChild(dialog);
  dialog.showModal();
}

function wireNewsEditorInteractivity(): void {
  const previewTrigger = document.getElementById('newsFullPreviewTrigger');
  previewTrigger?.addEventListener('click', openNewsFullPreview);
  previewTrigger?.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openNewsFullPreview();
    }
  });
  const title = document.getElementById('newsTitle') as HTMLInputElement | null;
  const summary = document.getElementById('newsSummary') as HTMLTextAreaElement | null;
  const source = document.getElementById('newsSource') as HTMLInputElement | null;
  const author = document.getElementById('newsAuthor') as HTMLInputElement | null;
  const imageUrl = document.getElementById('newsImageUrl') as HTMLInputElement | null;
  const imageFile = document.getElementById('newsImageFile') as HTMLInputElement | null;
  const featured = document.getElementById('newsFeatured') as HTMLInputElement | null;
  const statusInput = document.getElementById('newsStatus') as HTMLInputElement | null;
  const categoryInput = document.getElementById('newsCategory') as HTMLInputElement | null;
  const saveBtn = document.getElementById('adminModalSave') as HTMLButtonElement | null;

  const previewTitle = document.getElementById('newsPreviewTitle');
  const previewSummary = document.getElementById('newsPreviewSummary');
  const previewByline = document.getElementById('newsPreviewByline');
  const previewCategory = document.getElementById('newsPreviewCategory');
  const previewStatus = document.getElementById('newsPreviewStatus');
  const previewFeatured = document.getElementById('newsPreviewFeatured');
  const previewCover = document.getElementById('newsPreviewCover');
  const coverPreview = document.getElementById('newsCoverPreview');
  const titleCount = document.getElementById('newsTitleCount');
  const summaryCount = document.getElementById('newsSummaryCount');

  function setCover(url: string) {
    const coverAlt = esc(title?.value.trim() || 'Cover image');
    const html = url
      ? `<img src="${esc(url)}" alt="${coverAlt}">`
      : '<div class="news-dropzone-empty">Drop an image here, paste a URL, or choose a file</div>';
    if (coverPreview) coverPreview.innerHTML = html;
    if (previewCover) {
      previewCover.innerHTML = url ? `<img src="${esc(url)}" alt="${coverAlt}">` : '<span>Cover preview</span>';
    }
  }

  function refreshPreview() {
    if (previewTitle) previewTitle.textContent = title?.value.trim() || 'Your headline appears here';
    if (previewSummary) previewSummary.textContent = summary?.value.trim() || 'Your short summary appears here as you write.';
    if (titleCount) titleCount.textContent = `${title?.value.length || 0}/180`;
    if (summaryCount) summaryCount.textContent = `${summary?.value.length || 0}/360`;
    if (previewByline) {
      const src = source?.value.trim() || 'Biscoon Newsroom';
      const by = author?.value.trim();
      previewByline.textContent = by ? `${src} · ${by}` : src;
    }
    if (previewCategory && categoryInput) previewCategory.textContent = newsCategoryLabel(categoryInput.value);
    if (previewStatus && statusInput) {
      previewStatus.textContent = capitalize(statusInput.value || 'draft');
      previewStatus.className = `admin-badge ${statusInput.value === 'published' ? 'admin-badge-green' : 'admin-badge-gray'}`;
    }
    if (previewFeatured) previewFeatured.style.display = featured?.checked ? '' : 'none';
    if (saveBtn && statusInput) {
      saveBtn.textContent = statusInput.value === 'published' ? (saveBtn.disabled ? 'Saving…' : 'Publish Story') : (saveBtn.disabled ? 'Saving…' : 'Save Draft');
    }
  }

  function refreshWritingStats() {
    const body = document.getElementById('newsBody') as HTMLTextAreaElement | null;
    const text = document.createElement('div');
    text.innerHTML = body?.value || '';
    const words = (text.textContent || '').trim().split(/\s+/).filter(Boolean).length;
    const stats = document.getElementById('newsWritingStats');
    if (stats) stats.textContent = `${words} words · ${Math.ceil(words / 200)} min read`;
  }
  document.getElementById('newsRichEditor')?.addEventListener('input', () => {
    window.BiscoonNewsEditor?.sync?.();
    refreshWritingStats();
  });
  refreshWritingStats();
  document.getElementById('newsAddInlineImages')?.addEventListener('click', () => {
    (document.getElementById('newsInlineImages') as HTMLInputElement | null)?.click();
  });

  title?.addEventListener('input', refreshPreview);
  summary?.addEventListener('input', refreshPreview);
  source?.addEventListener('input', refreshPreview);
  author?.addEventListener('input', refreshPreview);
  featured?.addEventListener('change', refreshPreview);

  document.querySelectorAll<HTMLElement>('[data-news-status-pill]').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.newsStatusPill || 'draft';
      if (statusInput) statusInput.value = value;
      document.querySelectorAll('[data-news-status-pill]').forEach(el => {
        el.classList.toggle('active', el === btn);
        el.setAttribute('aria-pressed', String(el === btn));
      });
      const help = document.getElementById('newsPublishHelp');
      if (help) help.textContent = value === 'published' ? 'Saving makes this story visible on the news page.' : 'Only admins can see drafts. Publish when your story is ready.';
      refreshPreview();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-news-category-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.newsCategoryChip || 'community';
      if (categoryInput) categoryInput.value = value;
      document.querySelectorAll('[data-news-category-chip]').forEach(el => el.classList.toggle('active', el === btn));
      refreshPreview();
    });
  });

  imageUrl?.addEventListener('input', () => {
    setCover(imageUrl.value.trim());
  });

  imageFile?.addEventListener('change', async () => {
    const file = imageFile.files?.[0];
    if (!file) return;
    try {
      await runNewsMediaTask(async () => {
        const media = await uploadNewsMedia(file);
        if (imageUrl) imageUrl.value = media.url;
        if (imageFile) imageFile.value = '';
        setCover(media.url);
      });
    } catch (err: any) {
      notify(err.message || 'Could not read image.', 'error');
    }
  });

  function bindDropzone(zoneId: string, onFiles: (files: FileList) => void) {
    const zone = document.getElementById(zoneId);
    if (!zone) return;
    ['dragenter', 'dragover'].forEach(evt => {
      zone.addEventListener(evt, e => {
        e.preventDefault();
        zone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      zone.addEventListener(evt, e => {
        e.preventDefault();
        zone.classList.remove('is-dragover');
      });
    });
    zone.addEventListener('drop', e => {
      const files = (e as DragEvent).dataTransfer?.files;
      if (files?.length) onFiles(files);
    });
  }

  bindDropzone('newsCoverDrop', async (files) => {
    const file = files[0];
    if (!file || !file.type.startsWith('image/')) {
      notify('Please drop an image file.', 'error');
      return;
    }
    try {
      await runNewsMediaTask(async () => {
        const media = await uploadNewsMedia(file);
        if (imageUrl) imageUrl.value = media.url;
        if (imageFile) imageFile.value = '';
        setCover(media.url);
      });
    } catch (err: any) {
      notify(err.message || 'Could not read image.', 'error');
    }
  });

  bindDropzone('newsMediaDrop', (files) => {
    const input = document.getElementById('newsMediaFiles') as HTMLInputElement | null;
    if (!input) return;
    const dt = new DataTransfer();
    Array.from(files).forEach(f => dt.items.add(f));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  refreshPreview();
}

async function showNews(page?: number): Promise<void> {
  if (page !== undefined) _s.news.page = page;
  writeWorkspace();
  const { page: p, status, category, search, featured, range } = _s.news;
  try {
    const params = new URLSearchParams({
      page: String(p),
      limit: String(20),
      status,
      category,
      search,
      featured,
      range,
    });
    const data = await api(`/api/admin/news?${params}`);
    const summary = data.summary || { all: data.total, published: 0, draft: 0, featured: 0 };

    content(`
      <div class="news-hero">
        <div class="news-hero-copy">
          <div class="news-hero-title">Newsroom</div>
          <div class="news-hero-sub">Draft, publish, feature, and moderate stories. Click a card or row to jump in.</div>
        </div>
        <div class="dash-header-actions">
          <div class="dash-range" role="tablist" aria-label="News time range">
            ${DASH_RANGES.map(r => `
              <button type="button" class="dash-range-btn${r.value === range ? ' active' : ''}" data-news-range="${r.value}" role="tab" aria-selected="${r.value === range}">${r.label}</button>
            `).join('')}
          </div>
          <button class="admin-btn admin-btn-primary" data-create-news type="button">+ Publish News</button>
        </div>
      </div>

      <div class="news-stat-grid">
        <button type="button" class="news-stat-card${status === 'all' && featured === 'all' ? ' active' : ''}" data-news-filter-status="all" data-news-filter-featured="all">
          <span class="news-stat-value" data-count-to="${summary.all || 0}">0</span>
          <span class="news-stat-label">All stories</span>
        </button>
        <button type="button" class="news-stat-card${status === 'published' ? ' active' : ''}" data-news-filter-status="published" data-news-filter-featured="all">
          <span class="news-stat-value" data-count-to="${summary.published || 0}">0</span>
          <span class="news-stat-label">Published</span>
        </button>
        <button type="button" class="news-stat-card${status === 'draft' ? ' active' : ''}" data-news-filter-status="draft" data-news-filter-featured="all">
          <span class="news-stat-value" data-count-to="${summary.draft || 0}">0</span>
          <span class="news-stat-label">Drafts</span>
        </button>
        <button type="button" class="news-stat-card${featured === 'yes' ? ' active' : ''}" data-news-filter-status="all" data-news-filter-featured="yes">
          <span class="news-stat-value" data-count-to="${summary.featured || 0}">0</span>
          <span class="news-stat-label">Featured</span>
        </button>
      </div>

      <div class="admin-toolbar news-toolbar">
        <input class="admin-search" id="newsSearch" aria-label="Search news" type="search" placeholder="Search news…" value="${esc(search)}">
        <div class="admin-tabs" role="tablist">
          ${[
            { value: 'all', label: 'All' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
          ].map(tab => `<button type="button" class="admin-tab${status === tab.value ? ' active' : ''}" data-news-status-tab="${tab.value}">${tab.label}</button>`).join('')}
        </div>
        <select class="admin-select" id="newsCategoryFilter" aria-label="News category">
          ${NEWS_CATEGORIES.map(value => `<option value="${esc(value)}"${value === category ? ' selected' : ''}>${value ? newsCategoryLabel(value) : 'All categories'}</option>`).join('')}
        </select>
        <button type="button" class="admin-btn${featured === 'yes' ? ' admin-btn-primary' : ' admin-btn-ghost'}" data-news-featured-toggle aria-pressed="${featured === 'yes'}">★ Featured only</button>
        <span class="news-toolbar-count">${data.total.toLocaleString()} stor${data.total === 1 ? 'y' : 'ies'}</span>
      </div>

      <div class="admin-card news-table-card">
        ${data.news.length ? `
          <div class="news-list">
            ${data.news.map((article: any) => `
              <article class="news-row" data-news-open="${esc(article.id)}" tabindex="0" role="button">
                <div class="news-row-thumb">
                  ${article.imageUrl
                    ? `<img src="${esc(article.imageUrl)}" alt="${esc(article.title || 'News')}" loading="lazy">`
                    : `<span>${esc((article.title || 'N').charAt(0).toUpperCase())}</span>`}
                </div>
                <div class="news-row-body">
                  <div class="news-row-title">${esc(article.title)}</div>
                  <div class="news-row-meta">
                    ${badge(newsCategoryLabel(article.category), 'blue')}
                    ${newsStatusBadge(article.status)}
                    ${article.featured ? badge('Featured', 'red') : ''}
                    <span class="admin-muted">${article.publishedAt ? fmtDate(article.publishedAt) : 'Not published'}</span>
                  </div>
                  ${article.summary ? `<div class="news-row-summary">${esc(article.summary)}</div>` : ''}
                </div>
                <div class="news-row-actions">
                  <button class="admin-btn admin-btn-ghost" type="button" data-toggle-news-featured="${esc(article.id)}" data-featured="${article.featured ? '1' : '0'}" aria-pressed="${Boolean(article.featured)}" aria-label="${article.featured ? 'Remove from featured stories' : 'Feature this story'}">${article.featured ? '★ Featured' : '☆ Feature'}</button>
                  <button class="admin-btn admin-btn-ghost" type="button" data-toggle-news-status="${esc(article.id)}" data-status="${esc(article.status || 'draft')}" title="Toggle publish">${article.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                  <button class="admin-btn admin-btn-ghost" type="button" data-edit-news="${esc(article.id)}">Edit</button>
                  <button class="admin-btn admin-btn-danger" type="button" data-del-news="${esc(article.id)}" data-del-title="${esc(article.title)}" aria-label="Move story to trash">Trash</button>
                </div>
              </article>
            `).join('')}
          </div>
        ` : '<div class="admin-empty">No stories match these filters.</div>'}
        ${pager(data.page, data.pages, 'news')}
      </div>
    `);

    animateStatValues();

    let timer: ReturnType<typeof setTimeout>;
    document.getElementById('newsSearch')?.addEventListener('input', e => {
      clearTimeout(timer);
      timer = setTimeout(() => { _s.news.search = (e.target as HTMLInputElement).value.trim(); showNews(1); }, 350);
    });
    document.getElementById('newsCategoryFilter')?.addEventListener('change', e => {
      _s.news.category = (e.target as HTMLInputElement).value; showNews(1);
    });
    document.querySelectorAll<HTMLElement>('[data-news-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.newsRange as 'today' | '7d' | '30d' | 'all';
        if (!next || next === _s.news.range) return;
        _s.news.range = next;
        showNews(1);
      });
    });
    document.querySelectorAll<HTMLElement>('[data-news-filter-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        _s.news.status = btn.dataset.newsFilterStatus || 'all';
        _s.news.featured = (btn.dataset.newsFilterFeatured as string) || 'all';
        showNews(1);
      });
    });
    document.querySelectorAll<HTMLElement>('[data-news-status-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        _s.news.status = btn.dataset.newsStatusTab || 'all';
        showNews(1);
      });
    });
    document.querySelectorAll<HTMLElement>('[data-news-featured-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        _s.news.featured = _s.news.featured === 'yes' ? 'all' : 'yes';
        showNews(1);
      });
    });
    document.querySelectorAll<HTMLElement>('.news-row').forEach(row => {
      const open = () => openViewNews(row.dataset.newsOpen!);
      row.addEventListener('click', e => {
        if ((e.target as HTMLElement).closest('.news-row-actions')) return;
        open();
      });
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });
  } catch (err: any) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

async function openViewNews(id: string): Promise<void> {
  let data;
  try { data = await api(`/api/admin/news/${encodeURIComponent(id)}`); }
  catch (err) { notify(err.message, 'error'); return; }
  const article = data.article;
  openModal(esc(article.title), `
    <div class="admin-modal-meta" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      ${badge(newsCategoryLabel(article.category), 'blue')}
      ${newsStatusBadge(article.status)}
      ${article.featured ? badge('Featured', 'red') : ''}
      <span>${esc(article.sourceName || 'Biscoon Newsroom')}</span>
      ${article.authorName ? `<span>By ${esc(article.authorName)}</span>` : ''}
      <span style="margin-left:auto;font-size:12px">${article.publishedAt ? `Published ${fmtDate(article.publishedAt)}` : `Updated ${fmtDate(article.updatedAt)}`}</span>
    </div>
    ${article.imageUrl ? `<img src="${esc(article.imageUrl)}" alt="${esc(article.title || 'News')}" class="admin-news-preview">` : ''}
    <div class="admin-view-desc" style="margin-top:12px">${esc(article.summary)}</div>
    <div class="admin-news-body">${formatNewsBody(article.body, article.media || [])}</div>
    <div class="admin-view-actions">
      <button class="admin-btn" style="background:#E63946;color:#fff;border-color:#E63946" data-edit-news="${esc(article.id)}">Edit News</button>
      <button class="admin-btn admin-btn-danger" data-del-news="${esc(article.id)}" data-del-title="${esc(article.title)}" aria-label="Move story to trash">Trash Delete</button>
    </div>
  `, null);
}

async function openNewsEditor(id: string = ''): Promise<void> {
  if (!closeModal()) return;
  let article: Partial<AdminNews> = {};
  let maxRequestBytes: number;
  try {
    const limits = await api('/api/admin/news/media-limits');
    maxRequestBytes = limits.maxRequestBytes;
    if (id) article = (await api(`/api/admin/news/${encodeURIComponent(id)}`)).article;
  } catch (err) { notify(err.message, 'error'); return; }
  const key = `biscoon-news-draft:${_me?.id || 'session'}:${id || 'new'}`;
  let restored = false;
  try {
    const saved = sessionStorage.getItem(key);
    if (saved && window.confirm('Restore your unsaved news draft from this tab?')) {
      article = { ...article, ...JSON.parse(saved) };
      restored = true;
    } else if (saved) sessionStorage.removeItem(key);
  } catch { /* Editing still works when browser storage is unavailable. */ }
  _newsMediaDraft = (article.media || []).map(item => ({ ...item }));
  openModal(id ? 'Edit News Story' : 'Create News Story', newsFormHtml(article), async () => {
    const state = _newsEditorState;
    if (!state || state.pending) throw new Error('Wait for media uploads to finish before saving.');
    state.saving = true;
    const shell = document.querySelector<HTMLElement>('.news-editor-shell');
    if (shell) shell.inert = true;
    try {
      const body = JSON.stringify(await collectNewsPayload());
      if (new Blob([body]).size > state.maxRequestBytes) throw new Error('This story exceeds the upload limit. Remove some media or shorten the story.');
      await api(id ? `/api/admin/news/${encodeURIComponent(id)}` : '/api/admin/news', {
        method: id ? 'PUT' : 'POST', body,
      });
      state.baseline = newsDraftSnapshot();
      try { sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
      showNews(1);
    } finally { state.saving = false; if (shell) shell.inert = false; }
  });
  _newsEditorState = { key, baseline: '', saving: false, pending: false, maxRequestBytes };
  const overlay = document.getElementById('adminModalOverlay');
  overlay?.querySelector('.admin-modal')?.classList.add('admin-modal-wide');
  requestAnimationFrame(() => {
    if (!overlay?.isConnected || !_newsEditorState) return;
    window.BiscoonNewsEditor?.mount?.({ element: '#newsRichEditor', textarea: '#newsBody', media: () => _newsMediaDraft });
    wireNewsEditorInteractivity();
    _newsEditorState.baseline = restored ? '' : newsDraftSnapshot();
    persistNewsDraft();
  });
}

/* ══════════════════════════════════════
   DISCUSSIONS
══════════════════════════════════════ */
async function showDiscussions(page?: number): Promise<void> {
  if (page !== undefined) _s.discussions.page = page;
  writeWorkspace();
  const { page: p, search } = _s.discussions;
  try {
    const data = await api(`/api/admin/discussions?${new URLSearchParams({ page: String(p), limit: '20', search })}`);
    const totalComments = (data.discussions || []).reduce((sum: number, d: any) => sum + (d.commentCount || 0), 0);
    content(`
      ${sectionHero('Discussions', 'Moderate community threads. Click a row to open.', '<button class="admin-btn admin-btn-primary" data-create-discussion type="button">+ Add Discussion</button>')}
      <div class="ix-stat-grid">
        ${sectionStat('Discussions', data.total, true)}
        ${sectionStat('Comments (page)', totalComments)}
        ${sectionStat('On this page', (data.discussions || []).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="discussionSearch" aria-label="Search discussions" type="search" placeholder="Search discussions…" value="${esc(search)}">
        <span class="ix-count">${data.total.toLocaleString()} discussion${data.total !== 1 ? 's' : ''}</span>
      </div>
      <div class="admin-card ix-card">
        ${(data.discussions || []).length ? `<div class="ix-list">
          ${data.discussions.map((d: any) => `
            <article class="ix-row" tabindex="0" role="button" data-open-discussion="${esc(d.id)}">
              <div class="ix-icon">💬</div>
              <div class="ix-body">
                <div class="ix-title">${esc(d.title)}</div>
                <div class="ix-meta">${esc(d.authorName)} · ${badge(d.category)} · ${d.commentCount || 0} comments · ${fmtDate(d.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-ghost" type="button" data-view-discussion="${esc(d.id)}">👁 View</button>
                <button class="admin-btn admin-btn-ghost" type="button" data-edit-discussion="${esc(d.id)}">✏️ Edit</button>
                <button class="admin-btn admin-btn-danger" type="button" data-del-discussion="${esc(d.id)}">🗑</button>
              </div>
            </article>`).join('')}
        </div>` : '<div class="admin-empty">No discussions found.</div>'}
        ${pager(data.page, data.pages, 'discussions')}
      </div>
    `);
    animateStatValues();
    bindSearch('discussionSearch', v => { _s.discussions.search = v; showDiscussions(1); }, 380);
    wireInteractiveRows('[data-open-discussion]', row => {
      const btn = row.querySelector('[data-view-discussion]') as HTMLElement | null;
      btn?.click();
    });
  } catch (err: any) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

/* ══════════════════════════════════════
   COMMENTS MODERATION
══════════════════════════════════════ */
async function showComments(page?: number): Promise<void> {
  if (page !== undefined) _s.comments.page = page;
  writeWorkspace();
  const { page: p, type, search } = _s.comments;
  try {
    const data = await api(`/api/admin/comments?${new URLSearchParams({ page: String(p), limit: String(25), type, search })}`);
    const listingCount = (data.comments || []).filter((c: any) => c.parentType === 'listing').length;
    const discussionCount = (data.comments || []).filter((c: any) => c.parentType === 'discussion').length;
    content(`
      ${sectionHero('Comments', 'Moderate user comments across listings and discussions.', tabs(
        [{ label: 'All', value: 'all' }, { label: 'Listing Comments', value: 'listing' }, { label: 'Discussion Comments', value: 'discussion' }],
        type, 'comment-type'
      ))}
      <div class="ix-stat-grid">
        ${sectionStat('Total', data.total, type === 'all')}
        ${sectionStat('Listings (page)', listingCount, type === 'listing')}
        ${sectionStat('Discussions (page)', discussionCount, type === 'discussion')}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="commentSearch" aria-label="Search comments" type="search" placeholder="Search comments…" value="${esc(search)}">
        <span class="ix-count">${data.total.toLocaleString()} comment${data.total !== 1 ? 's' : ''}</span>
      </div>
      <div class="admin-card ix-card">
        ${(data.comments || []).length ? `<div class="ix-list">
          ${data.comments.map((c: any) => `
            <article class="ix-row ix-row-static">
              <div class="ix-icon">${c.parentType === 'listing' ? '📋' : '💬'}</div>
              <div class="ix-body">
                <div class="ix-title">${esc((c.body || '').slice(0, 160))}${(c.body || '').length > 160 ? '…' : ''}</div>
                <div class="ix-meta">${esc(c.authorName)} · on ${esc(c.parentTitle)} · ${badge(c.parentType, c.parentType === 'listing' ? 'green' : 'blue')} · ${fmtDate(c.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-danger" type="button" data-del-comment data-comment-id="${esc(c.id)}" data-parent-id="${esc(c.parentId)}" data-parent-type="${esc(c.parentType)}">🗑 Remove</button>
              </div>
            </article>`).join('')}
        </div>` : '<div class="admin-empty">No comments match these filters.</div>'}
        ${pager(data.page, data.pages, 'comments')}
      </div>
    `);
    animateStatValues();
    bindSearch('commentSearch', v => { _s.comments.search = v; showComments(1); }, 380);
  } catch (err: any) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

/* ══════════════════════════════════════
   REPORTS
══════════════════════════════════════ */
async function showReports(page?: number): Promise<void> {
  void updateAttentionCounts();
  if (page !== undefined) _s.reports.page = page;
  writeWorkspace();
  const { page: p, status } = _s.reports;
  try {
    const data = await api(`/api/admin/reports?${new URLSearchParams({ page: String(p), limit: String(25), status })}`);
    content(`
      ${sectionHero('Reports', 'Triage abuse reports. Change status inline without leaving the list.', tabs(
        [
          { label: 'Open', value: 'open' },
          { label: 'Reviewing', value: 'reviewing' },
          { label: 'Resolved', value: 'resolved' },
          { label: 'Dismissed', value: 'dismissed' },
          { label: 'All', value: 'all' },
        ],
        status, 'report-status'
      ))}
      <div class="ix-stat-grid">
        ${sectionStat('In filter', data.total, true)}
        ${sectionStat('On this page', (data.reports || []).length)}
      </div>
      <div class="admin-card ix-card">
        ${(data.reports || []).length ? `<div class="ix-list">
          ${data.reports.map((r: any) => `
            <article class="ix-row ix-row-static">
              <div class="ix-icon">${r.reason === 'scam' || r.reason === 'illegal' ? '🚨' : '⚑'}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(r.targetType)} · ${badge(r.reason, r.reason === 'scam' || r.reason === 'illegal' ? 'red' : 'blue')} ${badge(r.status, r.status === 'open' ? 'red' : r.status === 'resolved' ? 'green' : 'gray')}</div>
                <div class="ix-meta">Reporter ${esc(r.reporterName || r.reporterId)} · ${fmtDate(r.createdAt)} · <span class="admin-muted">${esc(r.targetId)}</span></div>
                <div class="ix-sub">${esc(r.details || 'No details provided.')}</div>
              </div>
              <div class="ix-actions">
                <select class="admin-select-sm" data-report-status-update="${esc(r.id)}" aria-label="Report status">
                  ${['open', 'reviewing', 'resolved', 'dismissed'].map(value => `<option value="${value}"${value === r.status ? ' selected' : ''}>${capitalize(value)}</option>`).join('')}
                </select>
              </div>
            </article>`).join('')}
        </div>` : '<div class="admin-empty">No reports in this status.</div>'}
        ${pager(data.page, data.pages, 'reports')}
      </div>
    `);
    animateStatValues();
  } catch (err: any) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

/* ══════════════════════════════════════
   AUDIT LOGS
══════════════════════════════════════ */
const AUDIT_ACTIONS = [
  'all',
  'admin_user.created',
  'admin_user.updated',
  'admin_user.deleted',
  'regular_user.deleted',
  'news.created',
  'news.updated',
  'news.deleted',
  'listing.updated',
  'listing.deleted',
  'discussion.created',
  'discussion.updated',
  'discussion.deleted',
  'report.status_updated',
  'listing_comment.deleted',
  'discussion_comment.deleted',
  'announcement.created',
  'announcement.toggled',
  'announcement.deleted',
];

const AUDIT_TARGET_TYPES = [
  'all', 'staff', 'user', 'news', 'listing', 'discussion', 'report',
  'listing_comment', 'discussion_comment', 'announcement',
];

function auditLabel(value: unknown): string {
  return readableLabel(value).replace(/\bId\b/g, 'ID');
}

function auditActionBadge(action: string): string {
  const color = action.includes('deleted') ? 'red'
    : action.includes('created') ? 'green'
      : action.includes('updated') || action.includes('toggled') ? 'blue'
        : 'gray';
  return badge(auditLabel(action), color);
}

async function showAuditLogs(page?: number): Promise<void> {
  if (!canManageStaff()) {
    content('<div class="admin-error">Super admin access is required to view audit logs.</div>');
    return;
  }
  if (page !== undefined) _s.audit.page = page;
  writeWorkspace();
  const { page: p, action, targetType, search } = _s.audit;

  try {
    const data = await api(`/api/admin/audit-logs?${new URLSearchParams({ page: String(p), limit: '25',
      action,
      targetType,
      search,
    })}`);

    content(`
      ${sectionHero('Audit Logs', 'Trace admin actions across the platform.')}
      <div class="ix-stat-grid">
        ${sectionStat('Events', data.total, true)}
        ${sectionStat('On this page', (data.auditLogs || []).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="auditSearch" aria-label="Search audit logs" type="search" placeholder="Search actor, target, or action…" value="${esc(search)}">
        <select class="admin-select" id="auditActionFilter" aria-label="Audit action">
          ${AUDIT_ACTIONS.map(value => `<option value="${esc(value)}"${value === action ? ' selected' : ''}>${value === 'all' ? 'All actions' : auditLabel(value)}</option>`).join('')}
        </select>
        <select class="admin-select" id="auditTargetFilter" aria-label="Record type">
          ${AUDIT_TARGET_TYPES.map(value => `<option value="${esc(value)}"${value === targetType ? ' selected' : ''}>${value === 'all' ? 'All targets' : auditLabel(value)}</option>`).join('')}
        </select>
        <span class="ix-count">${data.total.toLocaleString()} audit event${data.total !== 1 ? 's' : ''}</span>
      </div>
      <div class="admin-card ix-card">
        ${(data.auditLogs || []).length ? `<div class="ix-list">
          ${data.auditLogs.map((log: any) => `
            <article class="ix-row ix-row-static">
              <div class="ix-body">
                <div class="ix-title">${auditActionBadge(log.action || 'action')}</div>
                <div class="ix-meta"><strong>${esc(log.actorName || 'Admin')}</strong> · ${esc(log.actorEmail || log.actorId || '')} · ${fmtTime(log.createdAt)} · ${fmtDate(log.createdAt)}</div>
                <div class="ix-sub">Target: ${esc(log.targetTitle || auditLabel(log.targetType || 'target'))}${log.targetType ? ` (${esc(log.targetType)}${log.targetId ? ` · ${esc(log.targetId)}` : ''})` : ''}</div>
                <div class="ix-sub admin-muted">${esc(formatAuditMetadata(log.metadata))}</div>
              </div>
            </article>`).join('')}
        </div>` : '<div class="admin-empty">No audit events match these filters.</div>'}
        ${pager(data.page, data.pages, 'audit')}
      </div>
    `);
    animateStatValues();
    bindSearch('auditSearch', v => { _s.audit.search = v; showAuditLogs(1); }, 350);
    document.getElementById('auditActionFilter')?.addEventListener('change', e => {
      _s.audit.action = (e.target as HTMLInputElement).value; showAuditLogs(1);
    });
    document.getElementById('auditTargetFilter')?.addEventListener('change', e => {
      _s.audit.targetType = (e.target as HTMLInputElement).value; showAuditLogs(1);
    });
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}

function formatAuditMetadata(metadata: Record<string, unknown> = {}): string {
  const entries = Object.entries(metadata || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) return '—';
  return entries
    .map(([key, value]) => `${auditLabel(key)}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' · ');
}

/* ══════════════════════════════════════
   ANNOUNCEMENTS
══════════════════════════════════════ */
/* ── Trash ── */
async function showTrash(): Promise<void> {
  try {
    const data = await api('/api/admin/trash');

    const restoreBtn = (type: string, id: string) =>
      `<button class="admin-btn admin-btn-ghost" style="font-size:11px" data-restore-type="${esc(type)}" data-restore-id="${esc(id)}">↩ Restore</button>`;

    const trashTotal = (data.listings?.length || 0) + (data.discussions?.length || 0) + (data.news?.length || 0)
      + (data.announcements?.length || 0) + (data.spotlights?.length || 0) + (data.users?.length || 0);

    const ixSection = (label: string, icon: string, items: any[], metaFn: (item: any) => string, type: string) => {
      if (!items.length) return '';
      return `
        <div class="admin-card ix-card" style="margin-bottom:20px">
          <div class="ix-section-head">
            <span>${icon} ${label}</span>
            <span class="ix-count">${items.length} item${items.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="ix-list">
            ${items.map((item: any) => `
              <article class="ix-row ix-row-static">
                <div class="ix-body">
                  <div class="ix-title">${esc(item.title || item.name || '(untitled)')}</div>
                  <div class="ix-meta">${metaFn(item)} · Deleted ${fmtDate(item.deletedAt)}</div>
                </div>
                <div class="ix-actions">${restoreBtn(type, item.id)}</div>
              </article>`).join('')}
          </div>
        </div>`;
    };

    content(`
      ${sectionHero('Trash', 'Soft-deleted items stay recoverable for super-admins.')}
      <div class="ix-stat-grid">
        ${sectionStat('Total items', trashTotal, true)}
        ${sectionStat('Listings', data.listings?.length || 0)}
        ${sectionStat('News', data.news?.length || 0)}
        ${sectionStat('Users', data.users?.length || 0)}
      </div>
      <div class="ix-note">🌐 <strong>The internet is forever.</strong> Deleted content is preserved here and invisible to regular users.</div>
      ${ixSection('Listings', '📋', data.listings || [], l => badge(l.category || '', 'gray'), 'listing')}
      ${ixSection('Discussions', '💬', data.discussions || [], d => esc(d.authorName || ''), 'discussion')}
      ${ixSection('News', '📰', data.news || [], n => badge(n.status || 'draft', n.status === 'published' ? 'green' : 'gray'), 'news')}
      ${ixSection('Announcements', '📢', data.announcements || [], () => '', 'announcement')}
      ${ixSection('Spotlights', '🎬', data.spotlights || [], s => badge(s.type || 'ad', 'blue'), 'spotlight')}
      ${ixSection('Users', '👤', data.users || [], u => `${esc(u.email || '')} · ${badge(u.role || 'user', 'gray')}`, 'user')}
      ${trashTotal === 0 ? '<div class="admin-empty">Trash is empty — nothing has been soft-deleted yet.</div>' : ''}
    `);
    animateStatValues();
  } catch (err: any) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

/* ── Hero Spotlights ── */
type SpotlightFieldMap = Record<string, string>;

type SpotlightFormValues = {
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  badgeText: string;
  badgeColor: string;
  ctaText: string;
  ctaUrl: string;
  type: string;
  order: number;
  startDate: string | null;
  endDate: string | null;
};

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSpotlightImageValue(value: string): boolean {
  if (!value) return false;
  if (value.startsWith('data:image/')) return true;
  if (value.startsWith('/uploads/') || value.startsWith('uploads/')) return true;
  return isHttpUrl(value);
}

function clearSpotlightFieldErrors(root: ParentNode = document): void {
  root.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  root.querySelectorAll('[data-spot-field-error]').forEach(el => {
    el.textContent = '';
    (el as HTMLElement).hidden = true;
  });
}

function setSpotlightFieldError(fieldId: string, message: string): void {
  const input = document.getElementById(fieldId);
  input?.classList.add('is-invalid');
  const err = document.querySelector(`[data-spot-field-error="${fieldId}"]`) as HTMLElement | null;
  if (err) {
    err.textContent = message;
    err.hidden = false;
  }
}

function validateSpotlightFields(values: SpotlightFormValues, ids: SpotlightFieldMap): string | null {
  clearSpotlightFieldErrors();
  const errors: Array<{ id: string; message: string }> = [];

  if (!values.title) {
    errors.push({ id: ids.title, message: 'Add a headline for the homepage banner.' });
  } else if (values.title.length < 3) {
    errors.push({ id: ids.title, message: 'Headline should be at least 3 characters.' });
  }

  if (values.imageUrl && !isSpotlightImageValue(values.imageUrl)) {
    errors.push({ id: ids.image, message: 'Use a valid image URL (https://…) or upload a file.' });
  }

  if (values.ctaText && !values.ctaUrl) {
    errors.push({ id: ids.ctaUrl, message: 'Add the event page, registration link, or destination visitors should open.' });
  }
  if (values.ctaUrl && !isHttpUrl(values.ctaUrl) && !(values.ctaUrl.startsWith('/') && !values.ctaUrl.startsWith('//') && !values.ctaUrl.includes('\\'))) {
    errors.push({ id: ids.ctaUrl, message: 'Use an https:// link or a Biscoon path starting with /.' });
  }

  if (!Number.isFinite(values.order) || values.order < 0 || !Number.isInteger(values.order)) {
    errors.push({ id: ids.order, message: 'Order must be a whole number 0 or higher.' });
  }

  const startMs = values.startDate ? Date.parse(values.startDate) : NaN;
  const endMs = values.endDate ? Date.parse(values.endDate) : NaN;
  if (values.startDate && Number.isNaN(startMs)) {
    errors.push({ id: ids.start, message: 'Pick a valid start date and time.' });
  }
  if (values.endDate && Number.isNaN(endMs)) {
    errors.push({ id: ids.end, message: 'Pick a valid end date and time.' });
  }
  if (values.startDate && values.endDate && !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs <= startMs) {
    errors.push({ id: ids.end, message: 'End must be after the start time.' });
  }

  if (values.badgeText && values.badgeText.length > 40) {
    errors.push({ id: ids.badgeText, message: 'Badge text max is 40 characters.' });
  }

  for (const err of errors) setSpotlightFieldError(err.id, err.message);
  return errors[0]?.message || null;
}

function readSpotlightCreateValues(): SpotlightFormValues {
  const urlInput = document.getElementById('spotImageUrl') as HTMLInputElement | null;
  const fileData = urlInput?.getAttribute('data-file-data') || '';
  return {
    title: (document.getElementById('spotTitle') as HTMLInputElement)?.value.trim() || '',
    subtitle: (document.getElementById('spotSubtitle') as HTMLInputElement)?.value.trim() || '',
    body: (document.getElementById('spotBody') as HTMLTextAreaElement)?.value.trim() || '',
    imageUrl: fileData || urlInput?.value.trim() || '',
    badgeText: (document.getElementById('spotBadgeText') as HTMLInputElement)?.value.trim() || '',
    badgeColor: (document.getElementById('spotBadgeColor') as HTMLInputElement)?.value.trim() || '',
    ctaText: (document.getElementById('spotCtaText') as HTMLInputElement)?.value.trim() || '',
    ctaUrl: (document.getElementById('spotCtaUrl') as HTMLInputElement)?.value.trim() || '',
    type: (document.getElementById('spotType') as HTMLInputElement)?.value || 'event',
    order: Number((document.getElementById('spotOrder') as HTMLInputElement)?.value),
    startDate: (document.getElementById('spotStart') as HTMLInputElement)?.value || null,
    endDate: (document.getElementById('spotEnd') as HTMLInputElement)?.value || null,
  };
}

function readSpotlightEditValues(fallbackImage = ''): SpotlightFormValues {
  const urlInput = document.getElementById('editSpotImageUrl') as HTMLInputElement | null;
  const fileData = urlInput?.getAttribute('data-file-data') || '';
  return {
    title: (document.getElementById('editSpotTitle') as HTMLInputElement)?.value.trim() || '',
    subtitle: (document.getElementById('editSpotSubtitle') as HTMLInputElement)?.value.trim() || '',
    body: (document.getElementById('editSpotBody') as HTMLTextAreaElement)?.value.trim() || '',
    imageUrl: fileData || (urlInput ? urlInput.value.trim() : fallbackImage) || '',
    badgeText: (document.getElementById('editSpotBadgeText') as HTMLInputElement)?.value.trim() || '',
    badgeColor: (document.getElementById('editSpotBadgeColor') as HTMLInputElement)?.value.trim() || '',
    ctaText: (document.getElementById('editSpotCtaText') as HTMLInputElement)?.value.trim() || '',
    ctaUrl: (document.getElementById('editSpotCtaUrl') as HTMLInputElement)?.value.trim() || '',
    type: (document.getElementById('editSpotType') as HTMLInputElement)?.value || 'event',
    order: Number((document.getElementById('editSpotOrder') as HTMLInputElement)?.value),
    startDate: (document.getElementById('editSpotStart') as HTMLInputElement)?.value || null,
    endDate: (document.getElementById('editSpotEnd') as HTMLInputElement)?.value || null,
  };
}

function spotlightPreviewHtml(s: Partial<AdminSpotlight> = {}): string {
  return `<div class="admin-event-preview">${s.imageUrl && isSpotlightImageValue(s.imageUrl) ? `<img class="admin-event-preview-art" src="${esc(s.imageUrl)}" alt="Event artwork">` : ''}<span class="admin-event-preview-label">${s.type === 'event' || !s.type ? 'Event spotlight' : 'Community spotlight'}</span>${s.badgeText ? `<span class="admin-badge admin-badge-red">${esc(s.badgeText)}</span>` : ''}<h3>${esc(s.title || 'Your event title')}</h3><p>${esc(s.subtitle || 'Date · Time · Location')}</p>${s.body ? `<p>${esc(s.body)}</p>` : ''}<strong>${esc(s.ctaText || 'View event')} →</strong><small>The entire alert opens your destination.</small></div>`;
}

function bindSpotlightComposer(): void {
  const form = document.getElementById('spotComposer');
  if (!form) return;

  const syncPreview = (): void => {
    const urlInput = document.getElementById('spotImageUrl') as HTMLInputElement | null;
    const fileData = urlInput?.getAttribute('data-file-data') || '';
    const imageUrl = fileData || urlInput?.value.trim() || '';
    const previewHost = document.getElementById('spotLivePreview');
    if (!previewHost) return;
    previewHost.innerHTML = spotlightPreviewHtml({
      title: (document.getElementById('spotTitle') as HTMLInputElement)?.value.trim(),
      subtitle: (document.getElementById('spotSubtitle') as HTMLInputElement)?.value.trim(),
      body: (document.getElementById('spotBody') as HTMLTextAreaElement)?.value.trim(),
      badgeText: (document.getElementById('spotBadgeText') as HTMLInputElement)?.value.trim(),
      badgeColor: (document.getElementById('spotBadgeColor') as HTMLInputElement)?.value.trim() || '#E63946',
      ctaText: (document.getElementById('spotCtaText') as HTMLInputElement)?.value.trim(),
      ctaUrl: (document.getElementById('spotCtaUrl') as HTMLInputElement)?.value.trim(),
      imageUrl,
      type: (document.getElementById('spotType') as HTMLInputElement)?.value || 'event',
    });
  };

  const clearFieldOnEdit = (el: Element): void => {
    el.addEventListener('input', () => {
      el.classList.remove('is-invalid');
      const err = document.querySelector(`[data-spot-field-error="${el.id}"]`) as HTMLElement | null;
      if (err) { err.hidden = true; err.textContent = ''; }
    });
  };

  form.querySelectorAll('#spotTitle,#spotSubtitle,#spotBody,#spotBadgeText,#spotBadgeColor,#spotCtaText,#spotCtaUrl,#spotOrder,#spotStart,#spotEnd,#spotImageUrl').forEach(el => {
    el.addEventListener('input', syncPreview);
    el.addEventListener('change', syncPreview);
    clearFieldOnEdit(el);
  });

  form.querySelectorAll<HTMLButtonElement>('.admin-spot-type[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      form.querySelectorAll('.admin-spot-type').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const hidden = document.getElementById('spotType') as HTMLInputElement | null;
      if (hidden) hidden.value = btn.dataset.type || 'ad';
      syncPreview();
    });
  });

  document.getElementById('spotToggleComposer')?.addEventListener('click', () => {
    const panel = document.getElementById('spotComposerPanel');
    const btn = document.getElementById('spotToggleComposer');
    if (!panel || !btn) return;
    const open = panel.hasAttribute('hidden');
    if (open) {
      panel.removeAttribute('hidden');
      btn.textContent = 'Hide form';
      (document.getElementById('spotTitle') as HTMLInputElement | null)?.focus();
    } else {
      panel.setAttribute('hidden', '');
      btn.textContent = '+ New spotlight';
    }
  });

  document.getElementById('spotCancelComposer')?.addEventListener('click', () => {
    const panel = document.getElementById('spotComposerPanel');
    const btn = document.getElementById('spotToggleComposer');
    if (panel) panel.setAttribute('hidden', '');
    if (btn) btn.textContent = '+ New spotlight';
  });

  function showSpotImgPreview(src: string): void {
    const wrap = document.getElementById('spotImgPreviewWrap') as HTMLDivElement | null;
    const img = document.getElementById('spotImgPreview') as HTMLImageElement | null;
    if (!wrap || !img) return;
    if (src) { img.src = src; wrap.hidden = false; }
    else { wrap.hidden = true; img.src = ''; }
    syncPreview();
  }

  document.getElementById('spotImageFile')?.addEventListener('change', async function (this: HTMLInputElement) {
    const file = this.files?.[0];
    if (!file) return;
    const lbl = document.getElementById('spotFileLbl');
    if (lbl) lbl.textContent = `📁 ${file.name}`;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const urlInput = document.getElementById('spotImageUrl') as HTMLInputElement | null;
      if (urlInput) {
        urlInput.value = '';
        urlInput.setAttribute('data-file-data', dataUrl);
      }
      showSpotImgPreview(dataUrl);
    } catch (_) { /* ignore */ }
  });

  document.getElementById('spotImageUrl')?.addEventListener('blur', function (this: HTMLInputElement) {
    if (this.value.trim()) {
      this.removeAttribute('data-file-data');
      showSpotImgPreview(this.value.trim());
    }
  });

  document.getElementById('spotSubmit')?.addEventListener('click', async () => {
    const values = readSpotlightCreateValues();
    const errEl = document.getElementById('spotFormError');
    const btn = document.getElementById('spotSubmit') as HTMLButtonElement | null;
    if (!errEl || !btn) return;

    errEl.hidden = true;
    const firstError = validateSpotlightFields(values, {
      title: 'spotTitle',
      image: 'spotImageUrl',
      ctaText: 'spotCtaText',
      ctaUrl: 'spotCtaUrl',
      order: 'spotOrder',
      start: 'spotStart',
      end: 'spotEnd',
      badgeText: 'spotBadgeText',
    });
    if (firstError) {
      errEl.textContent = firstError;
      errEl.hidden = false;
      document.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Publishing…';
    try {
      await api('/api/admin/spotlights', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      notify('Spotlight published. Add another anytime with + New spotlight.', 'success');
      showSpotlights();
    } catch (err: any) {
      errEl.textContent = err.message;
      errEl.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Publish to homepage';
    }
  });

  syncPreview();
}

function bindSpotlightList(spots: AdminSpotlight[]): void {
  const list = document.getElementById('spotList');
  const empty = document.getElementById('spotEmpty');
  const search = document.getElementById('spotSearch') as HTMLInputElement | null;
  const chips = Array.from(document.querySelectorAll<HTMLButtonElement>('.admin-spot-filter[data-status]'));

  const apply = (): void => {
    const q = (search?.value || '').trim().toLowerCase();
    const status = chips.find(c => c.classList.contains('is-active'))?.dataset.status || 'all';
    let shown = 0;
    list?.querySelectorAll<HTMLElement>('[data-spot-card]').forEach(card => {
      const hay = (card.dataset.spotSearch || '').toLowerCase();
      const active = card.dataset.spotActive === 'true';
      const matchQ = !q || hay.includes(q);
      const matchS = status === 'all' || (status === 'live' && active) || (status === 'paused' && !active);
      const ok = matchQ && matchS;
      card.hidden = !ok;
      if (ok) shown += 1;
    });
    if (empty) empty.hidden = shown > 0 || spots.length === 0;
  };

  search?.addEventListener('input', apply);
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      apply();
    });
  });

  wireInteractiveRows('[data-open-spot]', row => openViewSpotlight(row.dataset.openSpot!));
}

async function showSpotlights(): Promise<void> {
  try {
    const data = await api('/api/admin/spotlights');
    const spots: AdminSpotlight[] = data.spotlights || [];
    const typeColors: Record<string, string> = { ad: 'blue', event: 'green', news: 'gray', promo: 'red' };
    const typeLabels: Record<string, string> = { ad: 'Ad', event: 'Event', news: 'News', promo: 'Promo' };
    const activeCount = spots.filter(s => s.active).length;
    const openComposer = spots.length === 0;

    content(`
      ${sectionHero('Homepage Spotlight', 'A full-screen event spotlight welcomes visitors once per tab session. They can open the event or skip to the homepage.')}
      <div class="admin-spot-guide">
        <div class="admin-spot-guide-steps">
          <div><strong>1</strong><span>Create an event alert</span></div>
          <div><strong>2</strong><span>Flip Live when ready</span></div>
          <div><strong>3</strong><span>Reorder with ↑ ↓</span></div>
        </div>
        <p>The first active event opens as a full-screen poster. Visitors can click it to open your destination or choose Skip this. Add the date, time and venue below; the visibility schedule controls when the spotlight is shown.</p>
      </div>
      <div class="ix-stat-grid">
        ${sectionStat('Total', spots.length, true)}
        ${sectionStat('Live on site', activeCount)}
        ${sectionStat('Paused', spots.length - activeCount)}
      </div>

      <div class="admin-spot-toolbar">
        <input class="admin-ann-input admin-spot-search" id="spotSearch" aria-label="Search spotlights" type="search" placeholder="Search title, type, badge…">
        <div class="admin-spot-filters" role="group" aria-label="Filter by status">
          <button type="button" class="admin-spot-filter is-active" data-status="all">All</button>
          <button type="button" class="admin-spot-filter" data-status="live">Live</button>
          <button type="button" class="admin-spot-filter" data-status="paused">Paused</button>
        </div>
        <button type="button" class="admin-btn" id="spotToggleComposer" style="background:#E63946;color:#fff;border-color:#E63946;margin-left:auto">${openComposer ? 'Hide form' : '+ New spotlight'}</button>
      </div>

      <div class="admin-spot-composer" id="spotComposerPanel" ${openComposer ? '' : 'hidden'}>
        <div class="admin-spot-composer-grid" id="spotComposer">
          <div class="admin-ann-form admin-spot-form">
            <div class="admin-ann-form-title">Create an event spotlight</div>
            <p class="admin-spot-form-hint">Fill the fields — the preview on the right updates as you type.</p>
            <div id="spotFormError" class="admin-spot-error" hidden></div>
            <div class="admin-ann-grid">
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label">Headline <span style="color:#E63946">*</span></label>
                <input class="admin-ann-input" id="spotTitle" placeholder="e.g. Dashain Mela 2026 — Register Now" maxlength="200" required>
                <div class="admin-spot-field-error" data-spot-field-error="spotTitle" hidden></div>
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label" for="spotSubtitle">Date, time &amp; location</label>
                <input class="admin-ann-input" id="spotSubtitle" placeholder="e.g. Nov 21 · 5 PM ET · Boston City Hall" maxlength="200">
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label" for="spotBody">Extra details (optional)</label>
                <textarea class="admin-ann-textarea" id="spotBody" placeholder="Shown under the supporting line" rows="2" maxlength="400"></textarea>
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label">Event poster (optional)</label>
                <div class="admin-spot-image-row">
                  <label class="admin-spot-file" id="spotFileLbl">📁 Choose image<input type="file" id="spotImageFile" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label>
                  <input class="admin-ann-input" id="spotImageUrl" type="url" placeholder="or paste https:// image URL">
                </div>
                <div id="spotImgPreviewWrap" class="admin-spot-thumb-wrap" hidden>
                  <img id="spotImgPreview" class="admin-spot-thumb" src="" alt="Banner preview">
                </div>
                <div class="admin-spot-field-error" data-spot-field-error="spotImageUrl" hidden></div>
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label" for="spotType">Type</label>
                <input type="hidden" id="spotType" value="event">
                <div class="admin-spot-types" role="group" aria-label="Spotlight type">
                  <button type="button" class="admin-spot-type" data-type="ad">📣 Ad</button>
                  <button type="button" class="admin-spot-type is-active" data-type="event">🎉 Event</button>
                  <button type="button" class="admin-spot-type" data-type="news">News</button>
                  <button type="button" class="admin-spot-type" data-type="promo">🔥 Promo</button>
                </div>
              </div>
              <div class="admin-ann-field">
                <label class="admin-ann-label" for="spotBadgeText">Corner badge</label>
                <input class="admin-ann-input" id="spotBadgeText" placeholder="e.g. FREE ENTRY" maxlength="40">
                <div class="admin-spot-field-error" data-spot-field-error="spotBadgeText" hidden></div>
              </div>
              <div class="admin-ann-field">
                <label class="admin-ann-label" for="spotBadgeColor">Badge color</label>
                <input class="admin-ann-input" id="spotBadgeColor" type="color" value="#E63946">
              </div>
              <div class="admin-ann-field">
                <label class="admin-ann-label" for="spotCtaText">Button label (optional)</label>
                <input class="admin-ann-input" id="spotCtaText" placeholder="e.g. Register Now" maxlength="60">
                <div class="admin-spot-field-error" data-spot-field-error="spotCtaText" hidden></div>
              </div>
              <div class="admin-ann-field">
                <label class="admin-ann-label" for="spotCtaUrl">Destination — where clicking the alert takes visitors</label>
                <input class="admin-ann-input" id="spotCtaUrl" type="text" value="/pages/community/events.html" placeholder="https://… or /pages/post/detail.html?id=…" inputmode="url">
                <div class="admin-spot-field-error" data-spot-field-error="spotCtaUrl" hidden></div>
              </div>
              <div class="admin-ann-field">
                <label class="admin-ann-label" for="spotOrder">Display order</label>
                <input class="admin-ann-input" id="spotOrder" type="number" value="0" min="0" step="1" title="Lower numbers show first">
                <div class="admin-spot-field-error" data-spot-field-error="spotOrder" hidden></div>
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label">Alert visibility schedule (optional)</label>
                <div class="admin-spot-schedule">
                  <div>
                    <span class="admin-spot-schedule-label">Show alert from</span>
                    <input class="admin-ann-input" id="spotStart" type="datetime-local" aria-label="Show from">
                    <div class="admin-spot-field-error" data-spot-field-error="spotStart" hidden></div>
                  </div>
                  <div>
                    <span class="admin-spot-schedule-label">Hide alert after</span>
                    <input class="admin-ann-input" id="spotEnd" type="datetime-local" aria-label="Show until">
                    <div class="admin-spot-field-error" data-spot-field-error="spotEnd" hidden></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="admin-ann-actions admin-spot-actions">
              <button type="button" class="admin-btn admin-btn-ghost" id="spotCancelComposer">Cancel</button>
              <button type="button" class="admin-btn" id="spotSubmit" style="background:#E63946;color:#fff;border-color:#E63946">Publish to homepage</button>
            </div>
          </div>
          <aside class="admin-spot-preview-pane">
            <div class="admin-spot-preview-label">Homepage preview</div>
            <div id="spotLivePreview">${spotlightPreviewHtml({})}</div>
            <p class="admin-spot-preview-note">The first event appears full-screen with a Skip this button. Upload a wide poster for the best result; artwork is displayed without cropping. Alerts remain on the homepage after skipping.</p>
          </aside>
        </div>
      </div>

      <div class="admin-spot-list-head">
        <h3>Your spotlights</h3>
        <span>${spots.length} total · ${activeCount} live</span>
      </div>
      <div class="admin-ann-list admin-spot-list" id="spotList">
        ${spots.length ? spots.map((s, index) => `
          <div class="admin-spot-card ix-clickable-card" tabindex="0" role="button"
               data-open-spot="${esc(s.id)}" data-spot-card
               data-spot-active="${s.active ? 'true' : 'false'}"
               data-spot-search="${esc([s.title, s.subtitle, s.type, s.badgeText, s.ctaText].filter(Boolean).join(' '))}">
            <div class="admin-spot-card-media" style="${s.imageUrl ? `background-image:url('${esc(s.imageUrl).replace(/'/g, '%27')}')` : ''}">
              ${s.active ? '<span class="admin-spot-pill admin-spot-pill--live">Live</span>' : '<span class="admin-spot-pill">Paused</span>'}
            </div>
            <div class="admin-spot-card-body">
              <div class="admin-spot-card-title">${esc(s.title || 'Untitled')}</div>
              ${s.subtitle ? `<div class="admin-spot-card-sub">${esc(s.subtitle)}</div>` : ''}
              <div class="admin-ann-card-meta">
                ${badge(typeLabels[s.type || 'ad'] || 'Ad', typeColors[s.type || ''] || 'gray')}
                ${s.badgeText ? badge(s.badgeText, 'blue') : ''}
                <span>Order ${s.order ?? index}</span>
                ${s.endDate ? `<span>Until ${fmtDate(s.endDate)}</span>` : ''}
                ${s.ctaText ? `<span>Button: ${esc(s.ctaText)}</span>` : ''}
              </div>
            </div>
            <div class="admin-spot-card-actions">
              <button type="button" class="admin-spot-switch ${s.active ? 'is-on' : ''}" data-toggle-spot="${esc(s.id)}" title="${s.active ? 'Pause on homepage' : 'Show on homepage'}" aria-pressed="${s.active ? 'true' : 'false'}">
                <span class="admin-spot-switch-knob"></span>
                <span class="admin-spot-switch-label">${s.active ? 'Live' : 'Paused'}</span>
              </button>
              <button type="button" class="admin-btn admin-btn-ghost" data-move-spot="${esc(s.id)}" data-move-dir="-1" title="Show earlier within its type">↑</button>
              <button type="button" class="admin-btn admin-btn-ghost" data-move-spot="${esc(s.id)}" data-move-dir="1" title="Show later within its type">↓</button>
              <button type="button" class="admin-btn admin-btn-ghost" data-edit-spot="${esc(s.id)}">Edit</button>
              <button type="button" class="admin-btn admin-btn-danger" data-del-spot="${esc(s.id)}" title="Delete">🗑</button>
            </div>
          </div>
        `).join('') : '<div class="admin-empty">No spotlights yet. Click <strong>+ New spotlight</strong> to create your first homepage banner.</div>'}
      </div>
      <div class="admin-empty" id="spotEmpty" hidden>No spotlights match this search or filter.</div>
    `);

    animateStatValues();
    bindSpotlightComposer();
    bindSpotlightList(spots);
  } catch (err: any) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}

async function openViewSpotlight(id: string): Promise<void> {
  let s: AdminSpotlight;
  try { s = await api(`/api/admin/spotlights/${encodeURIComponent(id)}`); }
  catch (err: any) { notify(err.message, 'error'); return; }

  const typeColors: Record<string, string> = { ad: 'blue', event: 'green', news: 'gray', promo: 'red' };
  const typeLabels: Record<string, string> = { ad: 'Ad', event: 'Event', news: 'News', promo: 'Promo' };
  openModal(esc(s.title || 'Untitled spotlight'), `
    <div class="admin-spot-view">
      ${spotlightPreviewHtml(s)}
      <div class="admin-spot-view-meta">
        <div class="admin-spot-view-row"><span>Status</span>${badge(s.active ? 'Live on homepage' : 'Paused', s.active ? 'green' : 'gray')}</div>
        <div class="admin-spot-view-row"><span>Type</span>${badge(typeLabels[s.type || 'ad'] || 'Ad', typeColors[s.type || ''] || 'gray')}</div>
        <div class="admin-spot-view-row"><span>Display order</span><strong>${s.order ?? 0}</strong></div>
        ${s.ctaUrl ? `<div class="admin-spot-view-row"><span>Button link</span><a href="${esc(s.ctaUrl)}" target="_blank" rel="noopener">${esc(s.ctaUrl)}</a></div>` : ''}
        ${s.startDate ? `<div class="admin-spot-view-row"><span>Shows from</span>${fmtDate(s.startDate)}</div>` : ''}
        ${s.endDate ? `<div class="admin-spot-view-row"><span>Shows until</span>${fmtDate(s.endDate)}</div>` : ''}
        <div class="admin-spot-view-row"><span>Created</span>${esc(s.createdBy || 'admin')} · ${fmtDate(s.createdAt)}</div>
      </div>
      <div class="admin-spot-view-actions">
        <button type="button" class="admin-btn" data-spot-view-edit="${esc(s.id)}" style="background:#E63946;color:#fff;border-color:#E63946">Edit banner</button>
        <button type="button" class="admin-btn admin-btn-ghost" data-spot-view-toggle="${esc(s.id)}">${s.active ? 'Pause on homepage' : 'Make live'}</button>
      </div>
    </div>
  `, null);

  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[data-spot-view-edit]')?.addEventListener('click', () => {
      closeModal();
      openEditSpotlight(id);
    });
    document.querySelector<HTMLElement>('[data-spot-view-toggle]')?.addEventListener('click', async () => {
      try {
        await api(`/api/admin/spotlights/${encodeURIComponent(id)}/toggle`, { method: 'PUT' });
        closeModal();
        showSpotlights();
        notify(s.active ? 'Spotlight paused.' : 'Spotlight is live on the homepage.', 'success');
      } catch (err: any) { notify(err.message, 'error'); }
    });
  });
}

function spotlightFormHtml(s: Partial<AdminSpotlight> = {}): string {
  const toDatetimeLocal = (d?: string) => {
    if (!d) return '';
    try { return new Date(d).toISOString().slice(0, 16); } catch { return ''; }
  };
  const type = s.type || 'ad';
  return `
    <div class="admin-spot-edit-layout">
      <div class="admin-modal-grid">
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label">Headline <span style="color:#E63946">*</span></label>
          <input class="admin-modal-input" id="editSpotTitle" maxlength="200" value="${esc(s.title || '')}" required>
          <div class="admin-spot-field-error" data-spot-field-error="editSpotTitle" hidden></div>
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label" for="editSpotSubtitle">Date, time &amp; location</label>
          <input class="admin-modal-input" id="editSpotSubtitle" maxlength="200" value="${esc(s.subtitle || '')}">
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label" for="editSpotBody">Extra details</label>
          <textarea class="admin-modal-textarea" id="editSpotBody" rows="2" maxlength="400">${esc(s.body || '')}</textarea>
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label">Event poster (optional)</label>
          <div class="admin-spot-image-row">
            <label class="admin-spot-file" id="editSpotFileLbl">📁 Choose image
              <input type="file" id="editSpotImageFile" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
            </label>
            <input class="admin-modal-input" id="editSpotImageUrl" type="text" placeholder="or paste https:// URL" value="${esc(s.imageUrl || '')}">
          </div>
          <div id="editSpotImgPreviewWrap" class="admin-spot-thumb-wrap" ${s.imageUrl ? '' : 'hidden'}>
            <img id="editSpotImgPreview" class="admin-spot-thumb" src="${esc(s.imageUrl || '')}" alt="Banner preview">
          </div>
          <div class="admin-spot-field-error" data-spot-field-error="editSpotImageUrl" hidden></div>
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label" for="editSpotType">Type</label>
          <input type="hidden" id="editSpotType" value="${esc(type)}">
          <div class="admin-spot-types" id="editSpotTypes" role="group" aria-label="Spotlight type">
            <button type="button" class="admin-spot-type ${type === 'ad' ? 'is-active' : ''}" data-type="ad">📣 Ad</button>
            <button type="button" class="admin-spot-type ${type === 'event' ? 'is-active' : ''}" data-type="event">🎉 Event</button>
            <button type="button" class="admin-spot-type ${type === 'news' ? 'is-active' : ''}" data-type="news">News</button>
            <button type="button" class="admin-spot-type ${type === 'promo' ? 'is-active' : ''}" data-type="promo">🔥 Promo</button>
          </div>
        </div>
        <div class="admin-modal-field">
          <label class="admin-modal-label" for="editSpotBadgeText">Corner badge</label>
          <input class="admin-modal-input" id="editSpotBadgeText" maxlength="40" value="${esc(s.badgeText || '')}">
          <div class="admin-spot-field-error" data-spot-field-error="editSpotBadgeText" hidden></div>
        </div>
        <div class="admin-modal-field">
          <label class="admin-modal-label" for="editSpotBadgeColor">Badge color</label>
          <input class="admin-modal-input" id="editSpotBadgeColor" type="color" value="${esc(s.badgeColor || '#E63946')}">
        </div>
        <div class="admin-modal-field">
          <label class="admin-modal-label" for="editSpotCtaText">Button label (optional)</label>
          <input class="admin-modal-input" id="editSpotCtaText" maxlength="60" value="${esc(s.ctaText || '')}">
          <div class="admin-spot-field-error" data-spot-field-error="editSpotCtaText" hidden></div>
        </div>
        <div class="admin-modal-field">
          <label class="admin-modal-label" for="editSpotCtaUrl">Destination — where clicking the alert takes visitors</label>
          <input class="admin-modal-input" id="editSpotCtaUrl" type="text" value="${esc(s.ctaUrl || '')}" inputmode="url" placeholder="https://…">
          <div class="admin-spot-field-error" data-spot-field-error="editSpotCtaUrl" hidden></div>
        </div>
        <div class="admin-modal-field">
          <label class="admin-modal-label" for="editSpotOrder">Display order</label>
          <input class="admin-modal-input" id="editSpotOrder" type="number" min="0" step="1" value="${s.order ?? 0}">
          <div class="admin-spot-field-error" data-spot-field-error="editSpotOrder" hidden></div>
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label">Alert visibility schedule (optional)</label>
          <div class="admin-spot-schedule">
            <div>
              <span class="admin-spot-schedule-label">Show alert from</span>
              <input class="admin-modal-input" id="editSpotStart" type="datetime-local" value="${toDatetimeLocal(s.startDate)}" aria-label="Show from">
              <div class="admin-spot-field-error" data-spot-field-error="editSpotStart" hidden></div>
            </div>
            <div>
              <span class="admin-spot-schedule-label">Hide alert after</span>
              <input class="admin-modal-input" id="editSpotEnd" type="datetime-local" value="${toDatetimeLocal(s.endDate)}" aria-label="Show until">
              <div class="admin-spot-field-error" data-spot-field-error="editSpotEnd" hidden></div>
            </div>
          </div>
        </div>
      </div>
      <aside class="admin-spot-preview-pane admin-spot-preview-pane--modal">
        <div class="admin-spot-preview-label">Homepage preview</div>
        <div id="editSpotLivePreview">${spotlightPreviewHtml(s)}</div>
      </aside>
    </div>`;
}

async function openEditSpotlight(id: string): Promise<void> {
  let s: AdminSpotlight;
  try { s = await api(`/api/admin/spotlights/${encodeURIComponent(id)}`); }
  catch (err: any) { notify(err.message, 'error'); return; }

  openModal(`Edit homepage alert`, spotlightFormHtml(s), async () => {
    const payload = readSpotlightEditValues(s.imageUrl || '');
    const firstError = validateSpotlightFields(payload, {
      title: 'editSpotTitle',
      image: 'editSpotImageUrl',
      ctaText: 'editSpotCtaText',
      ctaUrl: 'editSpotCtaUrl',
      order: 'editSpotOrder',
      start: 'editSpotStart',
      end: 'editSpotEnd',
      badgeText: 'editSpotBadgeText',
    });
    if (firstError) {
      document.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      throw new Error(firstError);
    }
    await api(`/api/admin/spotlights/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
    showSpotlights();
  });

  requestAnimationFrame(() => {
    const modal = document.querySelector('#adminModalOverlay .admin-modal');
    modal?.classList.add('admin-modal-wide');

    const syncPreview = (): void => {
      const urlInput = document.getElementById('editSpotImageUrl') as HTMLInputElement | null;
      const fileData = urlInput?.getAttribute('data-file-data') || '';
      const host = document.getElementById('editSpotLivePreview');
      if (!host) return;
      host.innerHTML = spotlightPreviewHtml({
        title: (document.getElementById('editSpotTitle') as HTMLInputElement)?.value.trim(),
        subtitle: (document.getElementById('editSpotSubtitle') as HTMLInputElement)?.value.trim(),
        body: (document.getElementById('editSpotBody') as HTMLTextAreaElement)?.value.trim(),
        badgeText: (document.getElementById('editSpotBadgeText') as HTMLInputElement)?.value.trim(),
        badgeColor: (document.getElementById('editSpotBadgeColor') as HTMLInputElement)?.value.trim() || '#E63946',
        ctaText: (document.getElementById('editSpotCtaText') as HTMLInputElement)?.value.trim(),
        ctaUrl: (document.getElementById('editSpotCtaUrl') as HTMLInputElement)?.value.trim(),
        imageUrl: fileData || urlInput?.value.trim() || s.imageUrl || '',
        type: (document.getElementById('editSpotType') as HTMLInputElement)?.value || 'event',
      });
    };

    document.querySelectorAll('#editSpotTitle,#editSpotSubtitle,#editSpotBody,#editSpotBadgeText,#editSpotBadgeColor,#editSpotCtaText,#editSpotCtaUrl,#editSpotOrder,#editSpotStart,#editSpotEnd,#editSpotImageUrl').forEach(el => {
      el.addEventListener('input', () => {
        syncPreview();
        el.classList.remove('is-invalid');
        const err = document.querySelector(`[data-spot-field-error="${(el as HTMLElement).id}"]`) as HTMLElement | null;
        if (err) { err.hidden = true; err.textContent = ''; }
      });
      el.addEventListener('change', syncPreview);
    });

    document.querySelectorAll<HTMLButtonElement>('#editSpotTypes .admin-spot-type').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#editSpotTypes .admin-spot-type').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const hidden = document.getElementById('editSpotType') as HTMLInputElement | null;
        if (hidden) hidden.value = btn.dataset.type || 'ad';
        syncPreview();
      });
    });

    document.getElementById('editSpotImageFile')?.addEventListener('change', async function (this: HTMLInputElement) {
      const file = this.files?.[0];
      if (!file) return;
      const lbl = document.getElementById('editSpotFileLbl');
      if (lbl) {
        const input = lbl.querySelector('input');
        lbl.textContent = `📁 ${file.name}`;
        if (input) lbl.appendChild(input);
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const urlInput2 = document.getElementById('editSpotImageUrl') as HTMLInputElement | null;
        if (urlInput2) { urlInput2.value = ''; urlInput2.setAttribute('data-file-data', dataUrl); }
        const wrap = document.getElementById('editSpotImgPreviewWrap') as HTMLDivElement | null;
        const img = document.getElementById('editSpotImgPreview') as HTMLImageElement | null;
        if (wrap && img) { img.src = dataUrl; wrap.hidden = false; }
        syncPreview();
      } catch (_) { /* ignore */ }
    });

    document.getElementById('editSpotImageUrl')?.addEventListener('blur', function (this: HTMLInputElement) {
      const wrap = document.getElementById('editSpotImgPreviewWrap') as HTMLDivElement | null;
      const img = document.getElementById('editSpotImgPreview') as HTMLImageElement | null;
      if (wrap && img && this.value.trim()) {
        this.removeAttribute('data-file-data');
        img.src = this.value.trim();
        wrap.hidden = false;
        syncPreview();
      }
    });
  });
}

async function showAnnouncements(): Promise<void> {
  try {
    const data = await api('/api/admin/announcements');
    const typeColors = { info: 'blue', warning: 'red', success: 'green' };

    const eligible = (data.announcements || []).filter((a: any) => a.active && (!a.expiresAt || new Date(a.expiresAt).getTime() > Date.now()));
    const liveId = eligible[0]?.id;
    const activeCount = eligible.length;
    content(`
      ${sectionHero('Announcements', 'The newest active, unexpired announcement appears below the public site header. Older active notices wait until it is paused or expires.')}
      <div class="ix-stat-grid">
        ${sectionStat('Total', (data.announcements || []).length, true)}
        ${sectionStat('Showing publicly', liveId ? 1 : 0)}
        ${sectionStat('Waiting', Math.max(0, activeCount - 1))}
        ${sectionStat('Inactive', (data.announcements || []).length - activeCount)}
      </div>
      <div class="admin-ann-form">
        <div class="admin-ann-form-title">📢 Create New Announcement</div>
        <div id="annFormError" role="alert" style="display:none;background:#fce8e8;border:1.5px solid #f8c3c3;border-radius:8px;padding:10px 14px;font-size:13px;color:#E63946;margin-bottom:12px"></div>
        <div class="admin-ann-grid">
          <div class="admin-ann-field admin-ann-full">
            <label class="admin-ann-label" for="annTitle">Title</label>
            <input class="admin-ann-input" id="annTitle" placeholder="e.g. Site maintenance this Saturday">
          </div>
          <div class="admin-ann-field admin-ann-full">
            <label class="admin-ann-label" for="annBody">Message</label>
            <textarea class="admin-ann-textarea" id="annBody" placeholder="Write the announcement message shown to all users…"></textarea>
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label" for="annType">Type</label>
            <select class="admin-ann-select" id="annType">
              <option value="info">ℹ️ Info (blue)</option>
              <option value="warning">⚠️ Warning (yellow)</option>
              <option value="success">✅ Success (green)</option>
            </select>
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label" for="annExpiry">Expires at (optional)</label>
            <input class="admin-ann-input" id="annExpiry" type="datetime-local" aria-describedby="annExpiryHelp"><p class="field-guidance" id="annExpiryHelp">Uses your device’s local time. Leave blank to keep the announcement active until you turn it off.</p>
          </div>
        </div>
        <div class="admin-ann-actions">
          <button class="admin-btn" id="annSubmit" style="background:#E63946;color:#fff;border-color:#E63946;padding:9px 22px;font-size:13px">Publish Announcement</button>
        </div>
      </div>

      <div class="admin-ann-list" id="annList">
        ${data.announcements.length ? data.announcements.map(a => `
          <div class="admin-ann-card">
            <div class="admin-ann-stripe admin-ann-stripe-${a.type}"></div>
            <div class="admin-ann-content">
              <div class="admin-ann-card-title">${esc(a.title)}</div>
              <div class="admin-ann-card-body">${esc(a.body)}</div>
              <div class="admin-ann-card-meta">
                ${badge(a.expiresAt && new Date(a.expiresAt).getTime() <= Date.now() ? 'Expired' : a.id === liveId ? 'Showing publicly' : a.active ? 'Waiting' : 'Paused', a.id === liveId ? 'green' : 'gray')}
                ${badge(a.type, typeColors[a.type] || 'gray')}
                <span>By ${esc(a.createdBy || 'admin')}</span>
                <span>${fmtDate(a.createdAt)}</span>
                ${a.expiresAt ? `<span>Expires ${fmtDate(a.expiresAt)}</span>` : ''}
              </div>
            </div>
            <div class="admin-ann-card-actions">
              <button class="admin-btn admin-btn-ghost" data-toggle-ann="${esc(a.id)}" title="${a.active ? 'Deactivate' : 'Activate'}">
                ${a.active ? '⏸ Pause' : '▶ Activate'}
              </button>
              <button class="admin-btn admin-btn-danger" data-del-ann="${esc(a.id)}">🗑</button>
            </div>
          </div>
        `).join('') : '<div class="admin-empty">No announcements yet. Create one above.</div>'}
      </div>
    `);

    animateStatValues();

    document.getElementById('annSubmit')?.addEventListener('click', async () => {
      const title   = (document.getElementById('annTitle') as HTMLInputElement)?.value.trim();
      const body    = (document.getElementById('annBody') as HTMLInputElement)?.value.trim();
      const type    = (document.getElementById('annType') as HTMLInputElement)?.value;
      const expiry  = (document.getElementById('annExpiry') as HTMLInputElement)?.value;
      const errEl   = document.getElementById('annFormError');
      const btn     = document.getElementById('annSubmit') as HTMLButtonElement | null;

      errEl.style.display = 'none';
      if (!title || !body) {
        document.getElementById(!title ? 'annTitle' : 'annBody')?.focus();
        errEl.textContent = 'Title and message are required.';
        errEl.style.display = 'block';
        return;
      }
      btn.disabled = true; btn.textContent = 'Publishing…';
      try {
        await api('/api/admin/announcements', {
          method: 'POST',
          body: JSON.stringify({ title, body, type, expiresAt: expiry ? new Date(expiry).toISOString() : null }),
        });
        showAnnouncements();
        notify('Announcement published.', 'success');
      } catch (err) {
        errEl.textContent = err.message; errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Publish Announcement';
      }
    });

  } catch (err) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

/* ══════════════════════════════════════
   VIEW MODAL (Listing)
══════════════════════════════════════ */
async function openViewListing(id: string): Promise<void> {
  let l;
  try { l = await api(`/api/admin/listings/${encodeURIComponent(id)}`); }
  catch (err) { notify(err.message, 'error'); return; }

  const comments = Array.isArray(l.comments) ? l.comments : [];
  const tags = Array.isArray(l.tags) ? l.tags.filter(Boolean) : [];
  const profile = listingViewProfile(l);
  const omit = new Set(profile.omitFields || []);
  const isPhotography = listingViewKind(l) === 'photography';
  const externalLink = safeHttpUrl(l.externalLink);
  const priceValue = l.price
    ? `${esc(l.price)}${l.priceNote ? ` <span class="admin-view-note">(${esc(l.priceNote)})</span>` : ''}`
    : '';
  const externalLinkValue = l.externalLink
    ? externalLink
      ? `<a href="${esc(externalLink)}" target="_blank" rel="noopener" class="admin-view-link">${esc(l.externalLink)}</a>`
      : esc(l.externalLink)
    : '';

  const detailFields = [
    listingField(profile.subcategoryLabel || 'Specific type', readableLabel(l.subcategory)),
    !omit.has('location') ? listingField(profile.locationLabel || 'Location', l.location) : '',
    !omit.has('locationType') ? listingField(profile.locationTypeLabel || 'Location type', readableLabel(l.locationType)) : '',
    !omit.has('price') ? listingField(profile.priceLabel || 'Price / rate', priceValue, { raw: true }) : '',
    !omit.has('availability') ? listingField(profile.availabilityLabel || 'Availability', l.availability) : '',
    !omit.has('contactEmail') ? listingField('Contact email', l.contactEmail) : '',
    !omit.has('contactPhone') ? listingField('Contact phone', l.contactPhone) : '',
    !omit.has('contactPreference') ? listingField(profile.contactPreferenceLabel || 'Contact preference', readableLabel(l.contactPreference)) : '',
    !omit.has('externalLink') ? listingField(profile.externalLinkLabel || 'External link', externalLinkValue, { raw: true, full: true }) : '',
    tags.length ? `
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Tags</label>
        <div class="admin-view-val admin-listing-tags">${tags.map(t => badge(t)).join('')}</div>
      </div>` : '',
    l.description ? `
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">${esc(profile.descriptionLabel || 'Description')}</label>
        <div class="admin-view-desc">${esc(l.description)}</div>
      </div>` : '',
    listingField('Listing ID', l.id),
    listingField('Posted by user', l.userId),
    l.updatedAt ? listingField('Last updated', fmtDate(l.updatedAt)) : '',
  ].filter(Boolean).join('');

  const commentHtml = comments.length
    ? comments.map(c => `
        <div class="admin-view-comment">
          <div class="admin-view-comment-head">
            <strong>${esc(c.authorName || '—')}</strong>
            <span>${fmtTime(c.createdAt)}</span>
          </div>
          <div class="admin-view-comment-body">${esc(c.body)}</div>
        </div>`).join('')
    : '<div style="color:#9ca3af;font-size:13px;padding:6px 0">No comments yet.</div>';

  openModal(esc(l.title), `
    <div class="admin-modal-meta" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      ${badge(readableLabel(l.category || 'Listing'), 'green')}
      ${l.subcategory ? badge(readableLabel(l.subcategory), isPhotography ? 'blue' : 'gray') : ''}
      <span>${esc(profile.kindLabel || 'Listing')}</span>
      ${!omit.has('location') && l.location ? `<span>📍 ${esc(l.location)}</span>` : ''}
      ${!omit.has('locationType') && l.locationType ? `<span>${esc(readableLabel(l.locationType))}</span>` : ''}
      <span style="margin-left:auto;font-size:12px">Posted ${fmtDate(l.createdAt)}</span>
    </div>

    ${listingGallery(l.images, isPhotography)}

    <div class="admin-modal-grid" style="margin-top:12px">
      ${detailFields}
    </div>

    <div style="margin-top:16px">
      <div class="admin-modal-label" style="margin-bottom:10px">Comments (${comments.length})</div>
      <div class="admin-view-comments">${commentHtml}</div>
    </div>

    <div class="admin-view-actions">
      <button class="admin-btn" style="background:#E63946;color:#fff;border-color:#E63946" data-edit-listing="${esc(l.id)}">✏️ Edit Listing</button>
      <button class="admin-btn admin-btn-danger" data-del-listing="${esc(l.id)}">🗑 Delete</button>
    </div>
  `, null);
}

/* ══════════════════════════════════════
   VIEW MODAL (Discussion)
══════════════════════════════════════ */
async function openViewDiscussion(id: string): Promise<void> {
  let d;
  try { d = await api(`/api/admin/discussions/${encodeURIComponent(id)}`); }
  catch (err) { notify(err.message, 'error'); return; }

  const commentHtml = (d.comments || []).length
    ? (d.comments || []).map(c => `
        <div class="admin-view-comment">
          <div class="admin-view-comment-head">
            <strong>${esc(c.authorName || '—')}</strong>
            <span>${fmtTime(c.createdAt)}</span>
          </div>
          <div class="admin-view-comment-body">${esc(c.body)}</div>
        </div>`).join('')
    : '<div style="color:#9ca3af;font-size:13px;padding:6px 0">No comments yet.</div>';

  openModal(esc(d.title), `
    <div class="admin-modal-meta" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      ${badge(capitalize(d.category || ''), 'blue')}
      <span>by <strong>${esc(d.authorName)}</strong></span>
      <span>💬 ${d.commentCount} comment${d.commentCount !== 1 ? 's' : ''}</span>
      ${d.tags?.length ? d.tags.map(t => badge(t)).join('') : ''}
      <span style="margin-left:auto;font-size:12px">Posted ${fmtDate(d.createdAt)}</span>
    </div>

    ${d.body ? `
      <div style="margin-top:14px">
        <div class="admin-modal-label" style="margin-bottom:8px">Body</div>
        <div class="admin-view-desc">${esc(d.body)}</div>
      </div>` : ''}

    <div style="margin-top:16px">
      <div class="admin-modal-label" style="margin-bottom:10px">Comments (${d.commentCount})</div>
      <div class="admin-view-comments">${commentHtml}</div>
    </div>

    <div class="admin-view-actions">
      <button class="admin-btn" style="background:#E63946;color:#fff;border-color:#E63946" data-edit-discussion="${esc(d.id)}">✏️ Edit Discussion</button>
      <button class="admin-btn admin-btn-danger" data-del-discussion="${esc(d.id)}">🗑 Delete</button>
    </div>
  `, null);
}

/* ══════════════════════════════════════
   EDIT MODALS (Listing + Discussion)
══════════════════════════════════════ */
async function openEditListing(id: string): Promise<void> {
  let l;
  try { l = await api(`/api/admin/listings/${encodeURIComponent(id)}`); }
  catch (err) { notify(err.message, 'error'); return; }

  openModal('Edit Listing', `
    <div class="admin-modal-meta">Posted ${fmtDate(l.createdAt)}</div>
    <div class="admin-modal-grid">
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="mTitle">Title</label>
        <input class="admin-modal-input" id="mTitle" required value="${esc(l.title || '')}">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="mDesc">Description</label>
        <textarea class="admin-modal-textarea" id="mDesc" required rows="5">${esc(l.description || '')}</textarea>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mCat">Category</label>
        <select class="admin-modal-select" id="mCat">
          ${CATEGORIES.filter(c => c).map(c => `<option value="${c}"${c === l.category ? ' selected' : ''}>${capitalize(c)}</option>`).join('')}
        </select>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mSubcat">Subcategory</label>
        <input class="admin-modal-input" id="mSubcat" value="${esc(l.subcategory || '')}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mLocation">Location</label>
        <input class="admin-modal-input" id="mLocation" value="${esc(l.location || '')}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mPrice">Price (optional)</label>
        <input class="admin-modal-input" id="mPrice" value="${esc(l.price || '')}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mPriceNote">Price Note (optional)</label>
        <input class="admin-modal-input" id="mPriceNote" value="${esc(l.priceNote || '')}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mAvail">Availability (optional)</label>
        <input class="admin-modal-input" id="mAvail" value="${esc(l.availability || '')}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mPhone">Contact Phone (optional)</label>
        <input class="admin-modal-input" id="mPhone" value="${esc(l.contactPhone || '')}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mLink">External Link (optional)</label>
        <input class="admin-modal-input" id="mLink" value="${esc(l.externalLink || '')}">
      </div>
    </div>
  `, async () => {
    await api(`/api/admin/listings/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: (document.getElementById('mTitle') as HTMLInputElement).value.trim(),
        description: (document.getElementById('mDesc') as HTMLInputElement).value.trim(),
        category: (document.getElementById('mCat') as HTMLInputElement).value,
        subcategory: (document.getElementById('mSubcat') as HTMLInputElement).value.trim(),
        location: (document.getElementById('mLocation') as HTMLInputElement).value.trim(),
        price: (document.getElementById('mPrice') as HTMLInputElement).value.trim(),
        priceNote: (document.getElementById('mPriceNote') as HTMLInputElement).value.trim(),
        availability: (document.getElementById('mAvail') as HTMLInputElement).value.trim(),
        contactPhone: (document.getElementById('mPhone') as HTMLInputElement).value.trim(),
        externalLink: (document.getElementById('mLink') as HTMLInputElement).value.trim(),
      }),
    });
    showListings(1);
  });
}

function discussionFormHtml(d: Partial<AdminDiscussion> = {}): string {
  return `
    ${d.id ? `<div class="admin-modal-meta">By ${esc(d.authorName)} · ${d.commentCount} comment${d.commentCount !== 1 ? 's' : ''} · ${fmtDate(d.createdAt)}</div>` : ''}
    <div class="admin-modal-grid">
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="dTitle">Title</label>
        <input class="admin-modal-input" id="dTitle" required maxlength="200" value="${esc(d.title || '')}">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="dBody">Body</label>
        <textarea class="admin-modal-textarea" id="dBody" required rows="8">${esc(d.body || '')}</textarea>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="dCat">Category</label>
        <select class="admin-modal-select" id="dCat">
          ${discussionCategoryOptions(d.category || 'general')}
        </select>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="dTags">Tags (comma-separated) (optional)</label>
        <input class="admin-modal-input" id="dTags" value="${esc((d.tags || []).join(', '))}" placeholder="visa, boston, housing">
      </div>
    </div>
  `;
}

function collectDiscussionPayload(): Record<string, unknown> {
  return {
    title: (document.getElementById('dTitle') as HTMLInputElement).value.trim(),
    body: (document.getElementById('dBody') as HTMLInputElement).value.trim(),
    category: (document.getElementById('dCat') as HTMLInputElement).value,
    tags: (document.getElementById('dTags') as HTMLInputElement).value.split(',').map(t => t.trim()).filter(Boolean),
  };
}

async function openCreateDiscussion(): Promise<void> {
  openModal('Create Discussion', discussionFormHtml(), async () => {
    await api('/api/admin/discussions', {
      method: 'POST',
      body: JSON.stringify(collectDiscussionPayload()),
    });
    showDiscussions(1);
  });
}

async function openEditDiscussion(id: string): Promise<void> {
  let d;
  try { d = await api(`/api/admin/discussions/${encodeURIComponent(id)}`); }
  catch (err) { notify(err.message, 'error'); return; }

  openModal('Edit Discussion', discussionFormHtml(d), async () => {
    await api(`/api/admin/discussions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(collectDiscussionPayload()),
    });
    showDiscussions(1);
  });
}

/* ══════════════════════════════════════
   MODAL ENGINE
══════════════════════════════════════ */
function openModal(title: string, bodyHtml: string, onSave: (() => Promise<void>) | null): void {
  if (!closeModal()) return;
  _modalReturnFocus = document.activeElement as HTMLElement;
  const overlay = document.createElement('div');
  overlay.id = 'adminModalOverlay';
  overlay.className = 'admin-modal-overlay';
  const hasActions = onSave !== null;
  overlay.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle">
      <div class="admin-modal-head">
        <div class="admin-modal-title" id="adminModalTitle">${title}</div>
        <button class="admin-modal-close" id="adminModalClose" aria-label="Close form" type="button">×</button>
      </div>
      <div class="admin-modal-error" id="adminModalError" role="alert" tabindex="-1"></div>
      ${bodyHtml}
      ${hasActions ? `<div class="admin-modal-actions">
        <button class="admin-btn admin-btn-ghost" id="adminModalCancel">Cancel</button>
        <button class="admin-btn" id="adminModalSave" style="background:#E63946;color:#fff;border-color:#E63946;padding:8px 20px;font-size:13px">${title.startsWith('Create ') ? esc(title) : 'Save changes'}</button>
      </div>` : `<div class="admin-modal-actions">
        <button class="admin-btn admin-btn-ghost" id="adminModalCancel">Close</button>
      </div>`}
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  _modalBaseline = modalSnapshot();
  trapDialogFocus(overlay, () => closeModal());
  document.getElementById('adminLayout')?.setAttribute('inert', '');
  requestAnimationFrame(() => overlay.querySelector<HTMLElement>('input:not([type=hidden]), textarea, select, #adminModalClose')?.focus());
  document.getElementById('adminModalClose').addEventListener('click', () => closeModal());
  document.getElementById('adminModalCancel').addEventListener('click', () => closeModal());
  if (onSave) {
    document.getElementById('adminModalSave').addEventListener('click', async () => {
      const errEl = document.getElementById('adminModalError');
      const btn = document.getElementById('adminModalSave') as HTMLButtonElement | null;
      errEl.style.display = 'none';
      const invalid = Array.from(overlay.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')).find(field => field.willValidate && !field.checkValidity());
      if (invalid) { invalid.reportValidity(); invalid.focus(); return; }
      const actionLabel = btn.textContent;
      _modalSaving = true;
      overlay.querySelector('.admin-modal')?.setAttribute('inert', '');
      btn.disabled = true; btn.textContent = 'Saving…';
      try {
        await onSave();
        closeModal(true);
        notify('Changes saved successfully.', 'success');
      }
      catch (err) {
        errEl.textContent = err.message; errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = actionLabel;
        errEl.focus();
        notify(err.message, 'error');
      } finally {
        _modalSaving = false;
        overlay.querySelector('.admin-modal')?.removeAttribute('inert');
        if (overlay.isConnected && errEl.style.display !== 'none') errEl.focus();
      }
    });
  }
}
function closeModal(saved = false): boolean {
  if (!saved && _modalSaving) { notify('Please wait for saving to finish.', 'info'); return false; }
  if (!saved && modalIsDirty() && !window.confirm('Discard your unsaved changes? Choose Cancel to keep editing.')) return false;
  if (_newsEditorState && !saved) {
    if (_newsEditorState.saving || _newsEditorState.pending) {
      notify('Please wait for the current upload or save to finish.', 'error');
      return false;
    }
    if (newsDraftSnapshot() !== _newsEditorState.baseline) {
      persistNewsDraft();
      if (!window.confirm('Close this editor? Your unsaved draft will be kept in this tab for recovery.')) return false;
    }
  }
  if (_newsEditorState) window.BiscoonNewsEditor?.destroy?.();
  _newsEditorState = null;
  const existed = document.getElementById('adminModalOverlay');
  existed?.remove();
  if (existed) { document.getElementById('adminLayout')?.removeAttribute('inert'); _modalReturnFocus?.focus(); }
  _modalBaseline = '';
  return true;
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === '/' && !isTypingTarget(e.target as HTMLElement | null) && !document.getElementById('adminModalOverlay')) {
    const search = document.querySelector<HTMLInputElement>('.admin-search');
    if (search) {
      e.preventDefault();
      search.focus();
      search.select?.();
    }
  }
});

/* ══════════════════════════════════════
   EVENT DELEGATION
══════════════════════════════════════ */
document.addEventListener('click', async e => {

  const attention = (e.target as HTMLElement).closest<HTMLElement>('[data-attention]');
  if (attention) {
    if (attention.dataset.attention === 'news') { _s.news.status = 'draft'; _s.news.page = 1; navigate('news'); }
    else { _s.reports.status = attention.dataset.attention === 'reviewing' ? 'reviewing' : 'open'; _s.reports.page = 1; navigate('reports'); }
    return;
  }
  // Navigation
  const navLink = (e.target as HTMLElement).closest<HTMLElement>('[data-view]');
  if (navLink && navLink.closest<HTMLElement>('.admin-nav')) { navigate(navLink.dataset.view); return; }

  // Keep the news composer open on backdrop clicks so writing is not discarded.
  if ((e.target as HTMLElement).id === 'adminModalOverlay') {
    if (!(e.target as HTMLElement).querySelector('.news-editor-shell')) closeModal();
    return;
  }

  // News body formatting — TipTap handles this in capture phase via BiscoonNewsEditor.
  // Keep a fallback only when the rich editor is not mounted.
  const newsFormat = (e.target as HTMLElement).closest<HTMLElement>('[data-news-format]');
  if (newsFormat) {
    if (window.BiscoonNewsEditor?.runCommand?.(newsFormat.dataset.newsFormat || '')) {
      e.preventDefault();
      return;
    }
    return;
  }

  // Insert news media at the cursor
  const insertNewsMedia = (e.target as HTMLElement).closest<HTMLElement>('[data-insert-news-media]');
  if (insertNewsMedia) {
    if (window.BiscoonNewsEditor?.insertMedia?.(insertNewsMedia.dataset.insertNewsMedia)) return;
    insertIntoNewsBody(`\n\n[[media:${insertNewsMedia.dataset.insertNewsMedia}]]\n\n`);
    return;
  }

  // Remove news media from the draft library
  const removeNewsMedia = (e.target as HTMLElement).closest<HTMLElement>('[data-remove-news-media]');
  if (removeNewsMedia) {
    const id = removeNewsMedia.dataset.removeNewsMedia;
    _newsMediaDraft = _newsMediaDraft.filter(item => item.id !== id);
    const body = (document.getElementById('newsBody') as HTMLTextAreaElement | null);
    if (body) body.value = body.value.replace(new RegExp(`\\n?\\n?\\[\\[media:${id}\\]\\]\\n?\\n?`, 'g'), '\n\n');
    renderNewsMediaLibrary();
    window.BiscoonNewsEditor?.mount?.({ element: '#newsRichEditor', textarea: '#newsBody', media: () => _newsMediaDraft });
    return;
  }

  // Pagination
  const pageBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-page][data-pager-view]');
  if (pageBtn) {
    const v = pageBtn.dataset.pagerView;
    _s[v] && (_s[v].page = parseInt(pageBtn.dataset.page));
    ({ users: showUsers, listings: showListings, events: showEvents, news: showNews,
       discussions: showDiscussions, comments: showComments, reports: showReports,
       audit: showAuditLogs })[v]?.();
    return;
  }

  // Comment type filter tabs
  const commentTab = (e.target as HTMLElement).closest<HTMLElement>('[data-comment-type]');
  if (commentTab) { _s.comments.type = commentTab.dataset.commentType; showComments(1); return; }

  // Report status filter tabs
  const reportTab = (e.target as HTMLElement).closest<HTMLElement>('[data-report-status]');
  if (reportTab) { _s.reports.status = reportTab.dataset.reportStatus; showReports(1); return; }

  // User account type tabs
  const userKindTab = (e.target as HTMLElement).closest<HTMLElement>('[data-user-kind]');
  if (userKindTab && userKindTab.closest<HTMLElement>('.admin-tabs')) {
    _s.users.kind = userKindTab.dataset.userKind;
    _s.users.page = 1;
    showUsers(1);
    return;
  }

  // Create admin user
  if ((e.target as HTMLElement).closest<HTMLElement>('[data-create-staff]')) {
    openCreateStaffModal();
    return;
  }

  // Edit admin user
  const editStaff = (e.target as HTMLElement).closest<HTMLElement>('[data-edit-staff]');
  if (editStaff) {
    openEditStaffModal(editStaff.dataset.editStaff);
    return;
  }

  // Delete admin user
  const delStaff = (e.target as HTMLElement).closest<HTMLElement>('[data-del-staff]');
  if (delStaff) {
    if (!await confirmAction(`Delete admin user "${delStaff.dataset.delName || 'this user'}"?`, {
      title: 'Delete admin user',
      confirmText: 'Delete user',
      tone: 'danger',
    })) return;
    try {
      await api(`/api/admin/staff/${encodeURIComponent(delStaff.dataset.delStaff)}`, { method: 'DELETE' });
      closeModal(); showUsers(1);
      notify('Admin user deleted.', 'success');
    } catch (err) { notify(err.message, 'error'); }
    return;
  }

  // Create event
  if ((e.target as HTMLElement).closest<HTMLElement>('[data-create-event]')) { openCreateEvent(); return; }

  // Edit event
  const editEvent = (e.target as HTMLElement).closest<HTMLElement>('[data-edit-event]');
  if (editEvent) { openEditEvent(editEvent.dataset.editEvent); return; }

  // Delete event
  const delEvent = (e.target as HTMLElement).closest<HTMLElement>('[data-del-event]');
  if (delEvent) {
    if (!await confirmAction(`Delete "${delEvent.dataset.delTitle || 'this event'}"?`, {
      title: 'Delete event', confirmText: 'Delete event', tone: 'danger',
    })) return;
    try {
      await api(`/api/admin/listings/${encodeURIComponent(delEvent.dataset.delEvent)}`, { method: 'DELETE' });
      closeModal(); showEvents(1);
      notify('Event deleted.', 'success');
    } catch (err) { notify(err.message, 'error'); }
    return;
  }

  // Create news
  if ((e.target as HTMLElement).closest<HTMLElement>('[data-create-news]')) {
    openNewsEditor();
    return;
  }

  // Create discussion
  if ((e.target as HTMLElement).closest<HTMLElement>('[data-create-discussion]')) {
    openCreateDiscussion();
    return;
  }

  // View news
  const viewNews = (e.target as HTMLElement).closest<HTMLElement>('[data-view-news]');
  if (viewNews) {
    openViewNews(viewNews.dataset.viewNews);
    return;
  }

  // Edit news
  const editNews = (e.target as HTMLElement).closest<HTMLElement>('[data-edit-news]');
  if (editNews) {
    openNewsEditor(editNews.dataset.editNews);
    return;
  }

  // Quick toggle featured
  const toggleFeatured = (e.target as HTMLElement).closest<HTMLElement>('[data-toggle-news-featured]');
  if (toggleFeatured) {
    e.stopPropagation();
    const id = toggleFeatured.dataset.toggleNewsFeatured!;
    const next = toggleFeatured.dataset.featured !== '1';
    try {
      await api(`/api/admin/news/${encodeURIComponent(id)}/featured`, {
        method: 'PUT',
        body: JSON.stringify({ featured: next }),
      });
      showNews();
      notify(next ? 'Story featured.' : 'Story unfeatured.', 'success');
    } catch (err: any) { notify(err.message, 'error'); }
    return;
  }

  // Quick toggle publish status
  const toggleStatus = (e.target as HTMLElement).closest<HTMLElement>('[data-toggle-news-status]');
  if (toggleStatus) {
    e.stopPropagation();
    const id = toggleStatus.dataset.toggleNewsStatus!;
    const next = toggleStatus.dataset.status === 'published' ? 'draft' : 'published';
    try {
      await api(`/api/admin/news/${encodeURIComponent(id)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: next }),
      });
      showNews();
      notify(next === 'published' ? 'Story published.' : 'Story moved to draft.', 'success');
    } catch (err: any) { notify(err.message, 'error'); }
    return;
  }

  // Delete news
  const delNews = (e.target as HTMLElement).closest<HTMLElement>('[data-del-news]');
  if (delNews) {
    if (!await confirmAction(`Delete "${delNews.dataset.delTitle || 'this story'}"?`, {
      title: 'Delete news story',
      confirmText: 'Delete story',
      tone: 'danger',
    })) return;
    try {
      await api(`/api/admin/news/${encodeURIComponent(delNews.dataset.delNews)}`, { method: 'DELETE' });
      closeModal(); showNews(1);
      notify('News story deleted.', 'success');
    } catch (err) { notify(err.message, 'error'); }
    return;
  }

  // View user detail
  const viewUser = (e.target as HTMLElement).closest<HTMLElement>('[data-view-user]');
  if (viewUser) {
    const d = viewUser.dataset;
    openUserDetail(d.viewUser, d.viewUserName, d.viewUserEmail, d.viewUserRole, d.viewUserJoined, d.viewUserListings);
    return;
  }

  // View listing
  const viewListing = (e.target as HTMLElement).closest<HTMLElement>('[data-view-listing]');
  if (viewListing) { openViewListing(viewListing.dataset.viewListing); return; }

  // Edit listing
  const editListing = (e.target as HTMLElement).closest<HTMLElement>('[data-edit-listing]');
  if (editListing) { openEditListing(editListing.dataset.editListing); return; }

  // View discussion
  const viewDiscussion = (e.target as HTMLElement).closest<HTMLElement>('[data-view-discussion]');
  if (viewDiscussion) { openViewDiscussion(viewDiscussion.dataset.viewDiscussion); return; }

  // Edit discussion
  const editDiscussion = (e.target as HTMLElement).closest<HTMLElement>('[data-edit-discussion]');
  if (editDiscussion) { openEditDiscussion(editDiscussion.dataset.editDiscussion); return; }

  // Delete user
  const delUser = (e.target as HTMLElement).closest<HTMLElement>('[data-del-user]');
  if (delUser) {
    if (!await confirmAction(`Delete "${delUser.dataset.delName || 'this user'}"? Their listings will also be removed.`, {
      title: 'Delete regular user',
      confirmText: 'Delete user',
      tone: 'danger',
    })) return;
    try {
      await api(`/api/admin/users/${encodeURIComponent(delUser.dataset.delUser)}`, { method: 'DELETE' });
      closeModal(); showUsers(1);
      notify('Regular user deleted.', 'success');
    } catch (err) { notify(err.message, 'error'); }
    return;
  }

  // Delete listing
  const delListing = (e.target as HTMLElement).closest<HTMLElement>('[data-del-listing]');
  if (delListing) {
    if (!await confirmAction('Delete this listing?', {
      title: 'Delete listing',
      confirmText: 'Delete listing',
      tone: 'danger',
    })) return;
    try {
      await api(`/api/admin/listings/${encodeURIComponent(delListing.dataset.delListing)}`, { method: 'DELETE' });
      closeModal(); showListings(1);
      notify('Listing deleted.', 'success');
    } catch (err) { notify(err.message, 'error'); }
    return;
  }

  // Delete discussion
  const delDiscussion = (e.target as HTMLElement).closest<HTMLElement>('[data-del-discussion]');
  if (delDiscussion) {
    if (!await confirmAction('Delete this discussion and all its comments?', {
      title: 'Delete discussion',
      confirmText: 'Delete discussion',
      tone: 'danger',
    })) return;
    try {
      await api(`/api/admin/discussions/${encodeURIComponent(delDiscussion.dataset.delDiscussion)}`, { method: 'DELETE' });
      closeModal(); showDiscussions(1);
      notify('Discussion deleted.', 'success');
    } catch (err) { notify(err.message, 'error'); }
    return;
  }

  // Delete comment
  const delComment = (e.target as HTMLElement).closest<HTMLElement>('[data-del-comment]');
  if (delComment) {
    if (!await confirmAction('Remove this comment?', {
      title: 'Remove comment',
      confirmText: 'Remove comment',
      tone: 'danger',
    })) return;
    const { commentId, parentId, parentType } = delComment.dataset;
    try {
      await api(`/api/admin/${parentType}s/${encodeURIComponent(parentId)}/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });
      showComments(1);
      notify('Comment removed.', 'success');
    } catch (err) { notify(err.message, 'error'); }
    return;
  }

  // Restore from trash
  const restoreBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-restore-type]');
  if (restoreBtn) {
    const type = restoreBtn.dataset.restoreType;
    const id   = restoreBtn.dataset.restoreId;
    if (!await confirmAction(`Restore this ${type}? It will become visible again.`, {
      title: 'Restore item',
      confirmText: 'Restore',
      tone: 'primary',
    })) return;
    try {
      await api(`/api/admin/trash/${encodeURIComponent(type)}/${encodeURIComponent(id)}/restore`, { method: 'PUT' });
      showTrash();
      notify(`${capitalize(type)} restored successfully.`, 'success');
    } catch (err) { notify(err.message, 'error'); }
    return;
  }

  // View spotlight
  const viewSpot = (e.target as HTMLElement).closest<HTMLElement>('[data-view-spot]');
  if (viewSpot) { openViewSpotlight(viewSpot.dataset.viewSpot); return; }

  // Edit spotlight
  const editSpot = (e.target as HTMLElement).closest<HTMLElement>('[data-edit-spot]');
  if (editSpot) { openEditSpotlight(editSpot.dataset.editSpot); return; }

  // Toggle spotlight
  const toggleSpot = (e.target as HTMLElement).closest<HTMLElement>('[data-toggle-spot]');
  if (toggleSpot) {
    try {
      await api(`/api/admin/spotlights/${encodeURIComponent(toggleSpot.dataset.toggleSpot!)}/toggle`, { method: 'PUT' });
      showSpotlights();
      notify('Spotlight updated — Live means it shows on the homepage.', 'success');
    } catch (err: any) { notify(err.message, 'error'); }
    return;
  }

  // Reorder spotlight alerts
  const moveSpot = (e.target as HTMLElement).closest<HTMLElement>('[data-move-spot]');
  if (moveSpot) {
    const id = moveSpot.dataset.moveSpot!;
    const dir = Number(moveSpot.dataset.moveDir || 0);
    try {
      const data = await api('/api/admin/spotlights');
      const items: AdminSpotlight[] = [...(data.spotlights || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const idx = items.findIndex(s => s.id === id);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= items.length) return;
      const a = items[idx];
      const b = items[swap];
      const orderA = a.order ?? idx;
      const orderB = b.order ?? swap;
      await api(`/api/admin/spotlights/${encodeURIComponent(a.id)}`, { method: 'PUT', body: JSON.stringify({ order: orderB }) });
      await api(`/api/admin/spotlights/${encodeURIComponent(b.id)}`, { method: 'PUT', body: JSON.stringify({ order: orderA }) });
      showSpotlights();
      notify('Display order updated.', 'success');
    } catch (err: any) { notify(err.message, 'error'); }
    return;
  }

  // Delete spotlight
  const delSpot = (e.target as HTMLElement).closest<HTMLElement>('[data-del-spot]');
  if (delSpot) {
    if (!await confirmAction('Delete this spotlight?', {
      title: 'Delete spotlight',
      confirmText: 'Delete spotlight',
      tone: 'danger',
    })) return;
    try {
      await api(`/api/admin/spotlights/${encodeURIComponent(delSpot.dataset.delSpot)}`, { method: 'DELETE' });
      showSpotlights();
      notify('Spotlight deleted.', 'success');
    } catch (err) { notify(err.message, 'error'); }
    return;
  }

  // Toggle announcement
  const toggleAnn = (e.target as HTMLElement).closest<HTMLElement>('[data-toggle-ann]');
  if (toggleAnn) {
    try {
      await api(`/api/admin/announcements/${encodeURIComponent(toggleAnn.dataset.toggleAnn)}/toggle`, { method: 'PUT' });
      showAnnouncements();
      notify('Announcement status updated.', 'success');
    } catch (err) { notify(err.message, 'error'); }
    return;
  }

  // Delete announcement
  const delAnn = (e.target as HTMLElement).closest<HTMLElement>('[data-del-ann]');
  if (delAnn) {
    if (!await confirmAction('Delete this announcement?', {
      title: 'Delete announcement',
      confirmText: 'Delete announcement',
      tone: 'danger',
    })) return;
    try {
      await api(`/api/admin/announcements/${encodeURIComponent(delAnn.dataset.delAnn)}`, { method: 'DELETE' });
      showAnnouncements();
      notify('Announcement deleted.', 'success');
    } catch (err) { notify(err.message, 'error'); }
    return;
  }

  // Logout
  if ((e.target as HTMLElement).closest<HTMLElement>('#adminLogout')) {
    if (!closeModal() || !allowInlineLeave()) return;
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
    window.location.href = 'login.html';
  }
});

document.addEventListener('change', async e => {
  if ((e.target as HTMLElement).closest<HTMLElement>('#newsMediaFiles, #newsInlineImages')) {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    if (!files.length) return;
    const inline = (e.target as HTMLInputElement).id === 'newsInlineImages';
    await runNewsMediaTask(async () => {
      if (_newsMediaDraft.length + files.length > 24) throw new Error('A story can contain up to 24 media items.');
      for (const file of files) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) throw new Error('Choose image or video files.');
        if (file.type.startsWith('video/') && file.size > 18 * 1024 * 1024) throw new Error(`${file.name} is too large. Videos must be under 18 MB.`);
      }
      for (const file of files) {
        const item = await uploadNewsMedia(file);
        _newsMediaDraft.push(item);
        if (inline) window.BiscoonNewsEditor?.insertMedia?.(item);
        renderNewsMediaLibrary();
        persistNewsDraft();
      }
      (document.getElementById('newsMediaLibrary')?.closest('details') as HTMLDetailsElement | null)?.setAttribute('open', '');
      notify(`${files.length} media item${files.length !== 1 ? 's' : ''} ${inline ? 'inserted into your story' : 'added to the library'}.`, 'success');
    });
    (e.target as HTMLInputElement).value = '';
    return;
  }

  const reportStatus = (e.target as HTMLElement).closest<HTMLElement>('[data-report-status-update]');
  if (!reportStatus) return;
  try {
    await api(`/api/admin/reports/${encodeURIComponent(reportStatus.dataset.reportStatusUpdate)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: (reportStatus as HTMLSelectElement).value }),
    });
    showReports(1);
    notify('Report status updated.', 'success');
  } catch (err) {
    notify(err.message, 'error');
  }
});

document.addEventListener('input', e => {
  const captionInput = (e.target as HTMLElement).closest<HTMLElement>('[data-news-media-caption]');
  if (!captionInput) return;
  const media = _newsMediaDraft.find(item => item.id === captionInput.dataset.newsMediaCaption);
  if (media) media.caption = (captionInput as HTMLInputElement).value.trim();
});
