/* ═══════════════════════════════════════════
   ADMIN.JS — Biscoon super-admin panel
═══════════════════════════════════════════ */

const BASE = window.location.origin.startsWith('file://')
  ? 'http://localhost:4000'
  : window.location.origin;

let _token = '';
let _me    = null;
let _view  = '';

const _s = {
  users:         { page: 1, search: '' },
  listings:      { page: 1, category: '', search: '' },
  discussions:   { page: 1 },
  comments:      { page: 1, type: 'all' },
  announcements: {},
};

/* ── Bootstrap ── */
document.addEventListener('DOMContentLoaded', async () => {
  _token = localStorage.getItem('biscoonToken') || '';
  if (!_token) { goLogin(); return; }
  try {
    _me = await api('/api/auth/me');
    const user = _me.user || _me;
    if (user.role !== 'admin') {
      alert('Access denied. Admin accounts only.');
      window.location.href = '../../index.html';
      return;
    }
    _me = user;
    document.getElementById('adminName').textContent = _me.name;
    navigate('dashboard');
  } catch {
    goLogin();
  }
});

/* ── API ── */
async function api(path, opts = {}) {
  const headers = { Authorization: `Bearer ${_token}`, ...(opts.headers || {}) };
  if (opts.body) headers['Content-Type'] = 'application/json';
  const r = await fetch(BASE + path, { ...opts, headers });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Request failed.');
  return d;
}

function goLogin() { window.location.href = 'login.html'; }

/* ── Navigation ── */
const VIEW_TITLES = {
  dashboard: 'Dashboard', users: 'Users', listings: 'Listings',
  discussions: 'Discussions', comments: 'Comments', announcements: 'Announcements',
};

function navigate(view) {
  _view = view;
  document.querySelectorAll('.admin-nav-link').forEach(l =>
    l.classList.toggle('active', l.dataset.view === view));
  document.getElementById('viewTitle').textContent = VIEW_TITLES[view] || view;
  content('<div class="admin-loading">Loading…</div>');
  ({ dashboard: showDashboard, users: showUsers, listings: showListings,
     discussions: showDiscussions,
     comments: showComments, announcements: showAnnouncements })[view]?.();
}

function content(html) { document.getElementById('adminContent').innerHTML = html; }

/* ── Helpers ── */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(v) {
  if (!v) return '—';
  const d = new Date(v), now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return fmtDate(v);
}
function badge(text, color = 'gray') {
  return `<span class="admin-badge admin-badge-${color}">${esc(text)}</span>`;
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function table(headers, rows) {
  if (!rows.length) return '<div class="admin-empty">No records found.</div>';
  return `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}
function pager(current, total, view) {
  if (total <= 1) return '';
  const max = Math.min(total, 9);
  const btns = Array.from({ length: max }, (_, i) => i + 1).map(i =>
    `<button class="admin-page-btn${i === current ? ' active' : ''}" data-page="${i}" data-pager-view="${view}">${i}</button>`
  );
  if (total > max) btns.push(`<span style="padding:0 6px;color:#6b7a8d;align-self:center">… ${total}</span>`);
  return `<div class="admin-pagination">${btns.join('')}</div>`;
}
function tabs(options, active, attr) {
  return `<div class="admin-tabs">${options.map(o =>
    `<button class="admin-tab${o.value === active ? ' active' : ''}" data-${attr}="${o.value}">${o.label}</button>`
  ).join('')}</div>`;
}

/* ══════════════════════════════════════
   DASHBOARD
══════════════════════════════════════ */
async function showDashboard() {
  try {
    const [stats, feedData] = await Promise.all([
      api('/api/admin/stats'),
      api('/api/admin/feed'),
    ]);
    const s = stats;
    const maxCat = s.byCategory[0]?.count || 1;

    content(`
      <div class="dash-header">
        <div class="dash-greeting">Welcome back, ${esc(_me.name.split(' ')[0])} 👋</div>
        <button class="admin-btn admin-btn-ghost dash-refresh" id="dashRefresh">↺ Refresh</button>
      </div>

      <div class="dash-stat-grid">
        ${statCard('👥', 'Total Users',    s.users.total,       s.users.thisWeek,       s.users.today,    'blue',   'users')}
        ${statCard('📋', 'Total Listings', s.listings.total,    s.listings.thisWeek,    s.listings.today, 'green',  'listings')}
        ${statCard('💬', 'Discussions',    s.discussions.total, s.discussions.thisWeek, null,             'purple', 'discussions')}
      </div>

      <div class="dash-quick-actions">
        <button class="dash-action-btn" data-nav-to="users">👥 Manage Users</button>
        <button class="dash-action-btn" data-nav-to="listings">📋 Manage Listings</button>
        <button class="dash-action-btn" data-nav-to="comments">🗨️ Review Comments</button>
        <button class="dash-action-btn dash-action-primary" data-nav-to="announcements">📢 Create Announcement</button>
      </div>

      <div class="admin-two-col">
        <div class="admin-card">
          <div class="admin-card-head">
            <span>Recent Activity</span>
            <span class="dash-card-sub">${feedData.feed.length} events</span>
          </div>
          <div class="admin-feed">
            ${feedData.feed.map(f => `
              <div class="admin-feed-item dash-feed-clickable" data-feed-type="${f.type}">
                <div class="admin-feed-icon admin-feed-icon-${f.type}">${f.icon}</div>
                <div class="admin-feed-body">
                  <div class="admin-feed-title">${esc(f.title)}</div>
                  <div class="admin-feed-sub">${esc(f.sub)}</div>
                </div>
                <div class="admin-feed-time">${fmtTime(f.date)}</div>
              </div>
            `).join('') || '<div class="admin-empty">No activity yet.</div>'}
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-head">
            <span>Listings by Category</span>
            <span class="dash-card-sub">${s.byCategory.length} categories</span>
          </div>
          <div class="dash-bar-chart">
            ${s.byCategory.map(c => `
              <div class="dash-bar-row">
                <div class="dash-bar-label" title="${esc(capitalize(c.category))}">${esc(capitalize(c.category))}</div>
                <div class="dash-bar-track">
                  <div class="dash-bar-fill" style="width:${Math.round((c.count / maxCat) * 100)}%"></div>
                  <span class="dash-bar-count">${c.count}</span>
                </div>
              </div>
            `).join('') || '<div class="admin-empty">No listings yet.</div>'}
          </div>
        </div>
      </div>

      <div class="admin-two-col">
        <div class="admin-card">
          <div class="admin-card-head">
            <span>Recent Users</span>
            <button class="dash-see-all" data-nav-to="users">See all →</button>
          </div>
          <div class="dash-mini-list">
            ${(s.recentUsers || []).map(u => `
              <div class="dash-mini-item dash-mini-clickable" data-view-user="${esc(u.id)}" data-view-user-name="${esc(u.name)}" data-view-user-email="${esc(u.email)}" data-view-user-role="${esc(u.role||'user')}" data-view-user-joined="${esc(u.createdAt)}" data-view-user-listings="0" title="View user profile">
                <div class="dash-mini-avatar" style="background:${userColor(u.name)}">${esc(u.name.charAt(0).toUpperCase())}</div>
                <div class="dash-mini-body">
                  <div class="dash-mini-name">${esc(u.name)}</div>
                  <div class="dash-mini-sub">${esc(u.email)}</div>
                </div>
                <div class="dash-mini-meta">
                  ${u.role === 'admin' ? badge('admin', 'red') : ''}
                  <span class="dash-mini-date">${fmtTime(u.createdAt)}</span>
                </div>
              </div>
            `).join('') || '<div class="admin-empty">No users yet.</div>'}
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-head">
            <span>Recent Listings</span>
            <button class="dash-see-all" data-nav-to="listings">See all →</button>
          </div>
          <div class="dash-mini-list">
            ${(s.recentListings || []).map(l => `
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
        </div>
      </div>
    `);

    document.getElementById('dashRefresh')?.addEventListener('click', () => {
      content('<div class="admin-loading">Refreshing…</div>');
      showDashboard();
    });

    document.querySelectorAll('[data-nav-to]').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.navTo));
    });

    document.querySelectorAll('.dash-feed-clickable').forEach(el => {
      el.addEventListener('click', () => {
        const map = { user: 'users', listing: 'listings', discussion: 'discussions' };
        if (map[el.dataset.feedType]) navigate(map[el.dataset.feedType]);
      });
    });

  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}

function statCard(icon, label, value, weekCount, todayCount, color, navTo) {
  const trendHtml = weekCount > 0
    ? `<span class="dash-trend-up">↑ ${weekCount} this week</span>`
    : `<span class="dash-trend-zero">No new this week</span>`;
  const todayHtml = todayCount !== null
    ? ` · <span class="dash-today-val">${todayCount} today</span>`
    : '';
  return `<div class="admin-stat-card admin-stat-${color} dash-stat-clickable" data-nav-to="${navTo}">
    <div class="admin-stat-icon">${icon}</div>
    <div class="admin-stat-content">
      <div class="admin-stat-value">${Number(value).toLocaleString()}</div>
      <div class="admin-stat-label">${label}</div>
      <div class="dash-stat-footer">${trendHtml}${todayHtml}</div>
    </div>
    <div class="dash-stat-arr">›</div>
  </div>`;
}

function userColor(name) {
  const colors = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#6366f1','#14b8a6'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % colors.length;
  return colors[h];
}
function catEmoji(cat) {
  const m = { jobs:'💼',housing:'🏠',pg:'🛏',services:'🔧',kinbech:'🛒',restaurants:'🍽',shops:'🏪',events:'🎉',tech:'💻',healthcare:'🏥',education:'📚',auto:'🚗',beauty:'💄',childcare:'👶',cleaning:'🧹',photography:'📷',produce:'🥬',organizations:'🏢',discussions:'💬',student:'🎓',finance:'💰',immigration:'✈️' };
  return m[cat] || '📦';
}

/* ══════════════════════════════════════
   USERS
══════════════════════════════════════ */
async function showUsers(page) {
  if (page !== undefined) _s.users.page = page;
  const { page: p, search } = _s.users;
  try {
    const data = await api(`/api/admin/users?${new URLSearchParams({ page: p, limit: 20, search })}`);
    content(`
      <div class="admin-toolbar">
        <input class="admin-search" id="userSearch" type="search" placeholder="Search name or email…" value="${esc(search)}">
        <span style="font-size:12.5px;color:#6b7a8d">${data.total.toLocaleString()} user${data.total !== 1 ? 's' : ''}</span>
      </div>
      <div class="admin-card">
        ${table(
          ['Name', 'Email', 'Phone', 'Role', 'Listings', 'Joined', 'Actions'],
          data.users.map(u => [
            `<span class="admin-link" data-view-user="${esc(u.id)}" data-view-user-name="${esc(u.name)}" data-view-user-email="${esc(u.email)}" data-view-user-role="${esc(u.role||'user')}" data-view-user-joined="${esc(u.createdAt)}" data-view-user-listings="${u.listingCount}">${esc(u.name)}</span>`,
            esc(u.email),
            esc(u.phone || '—'),
            badge(u.role || 'user', u.role === 'admin' ? 'red' : 'gray'),
            u.listingCount,
            fmtDate(u.createdAt),
            `<div class="admin-actions">
              <button class="admin-btn admin-btn-ghost" data-view-user="${esc(u.id)}" data-view-user-name="${esc(u.name)}" data-view-user-email="${esc(u.email)}" data-view-user-role="${esc(u.role||'user')}" data-view-user-joined="${esc(u.createdAt)}" data-view-user-listings="${u.listingCount}">👁 View</button>
              <button class="admin-btn admin-btn-ghost" data-promote="${esc(u.id)}" data-promote-to="${u.role === 'admin' ? 'user' : 'admin'}">
                ${u.role === 'admin' ? '👤 Demote' : '⭐ Promote'}
              </button>
              ${u.id !== _me.id
                ? `<button class="admin-btn admin-btn-danger" data-del-user="${esc(u.id)}" data-del-name="${esc(u.name)}">🗑</button>`
                : '<span class="admin-you">You</span>'}
            </div>`,
          ])
        )}
        ${pager(data.page, data.pages, 'users')}
      </div>
    `);
    let timer;
    document.getElementById('userSearch')?.addEventListener('input', e => {
      clearTimeout(timer);
      timer = setTimeout(() => { _s.users.search = e.target.value.trim(); showUsers(1); }, 380);
    });
  } catch (err) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

async function openUserDetail(userId, userName, userEmail, userRole, userJoined, listingCount) {
  let data;
  try { data = await api(`/api/admin/users/${encodeURIComponent(userId)}/content`); }
  catch (err) { alert(err.message); return; }

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
          ${badge(role, role === 'admin' ? 'red' : 'gray')}
          <span>📋 ${data.listings.length} listing${data.listings.length !== 1 ? 's' : ''}</span>
          <span>💬 ${data.discussions.length} discussion${data.discussions.length !== 1 ? 's' : ''}</span>
          ${userJoined ? `<span>🗓 Joined ${fmtDate(userJoined)}</span>` : ''}
        </div>
      </div>
      ${userId !== _me.id ? `
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button class="admin-btn admin-btn-ghost" style="font-size:11.5px" data-promote="${esc(userId)}" data-promote-to="${role === 'admin' ? 'user' : 'admin'}">
            ${role === 'admin' ? '👤 Demote' : '⭐ Promote to Admin'}
          </button>
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

/* ══════════════════════════════════════
   LISTINGS
══════════════════════════════════════ */
const CATEGORIES = [
  '', 'jobs', 'housing', 'pg', 'services', 'kinbech', 'restaurants', 'shops',
  'childcare', 'beauty', 'auto', 'cleaning', 'photography', 'produce',
  'organizations', 'events', 'discussions', 'tech', 'healthcare', 'education',
  'student', 'finance', 'immigration', 'other',
];

async function showListings(page) {
  if (page !== undefined) _s.listings.page = page;
  const { page: p, category, search } = _s.listings;
  try {
    const data = await api(`/api/admin/listings?${new URLSearchParams({ page: p, limit: 20, category, search })}`);
    content(`
      <div class="admin-toolbar">
        <input class="admin-search" id="listingSearch" type="search" placeholder="Search listings…" value="${esc(search)}">
        <select class="admin-select" id="listingCat">
          ${CATEGORIES.map(c => `<option value="${esc(c)}"${c === category ? ' selected' : ''}>${c ? capitalize(c) : 'All categories'}</option>`).join('')}
        </select>
        <span style="font-size:12.5px;color:#6b7a8d">${data.total.toLocaleString()} listing${data.total !== 1 ? 's' : ''}</span>
      </div>
      <div class="admin-card">
        ${table(
          ['Title', 'Category', 'Location', 'Posted', 'Actions'],
          data.listings.map(l => [
            `<span class="admin-link" data-view-listing="${esc(l.id)}">${esc(l.title)}</span>`,
            badge(l.category),
            esc(l.location || '—'),
            fmtDate(l.createdAt),
            `<div class="admin-actions">
               <button class="admin-btn admin-btn-ghost" data-view-listing="${esc(l.id)}">👁 View</button>
               <button class="admin-btn admin-btn-ghost" data-edit-listing="${esc(l.id)}">✏️ Edit</button>
               <button class="admin-btn admin-btn-danger" data-del-listing="${esc(l.id)}">🗑</button>
             </div>`,
          ])
        )}
        ${pager(data.page, data.pages, 'listings')}
      </div>
    `);
    let timer;
    document.getElementById('listingSearch')?.addEventListener('input', e => {
      clearTimeout(timer);
      timer = setTimeout(() => { _s.listings.search = e.target.value.trim(); showListings(1); }, 380);
    });
    document.getElementById('listingCat')?.addEventListener('change', e => {
      _s.listings.category = e.target.value; showListings(1);
    });
  } catch (err) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

/* ══════════════════════════════════════
   DISCUSSIONS
══════════════════════════════════════ */
async function showDiscussions(page) {
  if (page !== undefined) _s.discussions.page = page;
  const { page: p } = _s.discussions;
  try {
    const data = await api(`/api/admin/discussions?page=${p}&limit=20`);
    content(`
      <div class="admin-card">
        ${table(
          ['Title', 'Author', 'Category', 'Comments', 'Date', 'Actions'],
          data.discussions.map(d => [
            `<span class="admin-link" data-view-discussion="${esc(d.id)}">${esc(d.title)}</span>`,
            esc(d.authorName),
            badge(d.category),
            d.commentCount,
            fmtDate(d.createdAt),
            `<div class="admin-actions">
               <button class="admin-btn admin-btn-ghost" data-view-discussion="${esc(d.id)}">👁 View</button>
               <button class="admin-btn admin-btn-ghost" data-edit-discussion="${esc(d.id)}">✏️ Edit</button>
               <button class="admin-btn admin-btn-danger" data-del-discussion="${esc(d.id)}">🗑</button>
             </div>`,
          ])
        )}
        ${pager(data.page, data.pages, 'discussions')}
      </div>
    `);
  } catch (err) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

/* ══════════════════════════════════════
   COMMENTS MODERATION
══════════════════════════════════════ */
async function showComments(page) {
  if (page !== undefined) _s.comments.page = page;
  const { page: p, type } = _s.comments;
  try {
    const data = await api(`/api/admin/comments?${new URLSearchParams({ page: p, limit: 25, type })}`);
    content(`
      <div class="admin-toolbar">
        ${tabs(
          [{ label: 'All', value: 'all' }, { label: 'Listing Comments', value: 'listing' }, { label: 'Discussion Comments', value: 'discussion' }],
          type, 'comment-type'
        )}
        <span style="font-size:12.5px;color:#6b7a8d">${data.total.toLocaleString()} comment${data.total !== 1 ? 's' : ''}</span>
      </div>
      <div class="admin-card">
        ${table(
          ['Comment', 'Author', 'On', 'Type', 'Date', 'Action'],
          data.comments.map(c => [
            `<span style="max-width:280px;display:block;white-space:normal;line-height:1.4">${esc(c.body)}</span>`,
            esc(c.authorName),
            esc(c.parentTitle),
            badge(c.parentType, c.parentType === 'listing' ? 'green' : 'blue'),
            fmtDate(c.createdAt),
            `<button class="admin-btn admin-btn-danger" data-del-comment data-comment-id="${esc(c.id)}" data-parent-id="${esc(c.parentId)}" data-parent-type="${esc(c.parentType)}">🗑 Remove</button>`,
          ])
        )}
        ${pager(data.page, data.pages, 'comments')}
      </div>
    `);
  } catch (err) { content(`<div class="admin-error">${esc(err.message)}</div>`); }
}

/* ══════════════════════════════════════
   ANNOUNCEMENTS
══════════════════════════════════════ */
async function showAnnouncements() {
  try {
    const data = await api('/api/admin/announcements');
    const typeColors = { info: 'blue', warning: 'red', success: 'green' };

    content(`
      <div class="admin-ann-form">
        <div class="admin-ann-form-title">📢 Create New Announcement</div>
        <div id="annFormError" style="display:none;background:#fce8e8;border:1.5px solid #f8c3c3;border-radius:8px;padding:10px 14px;font-size:13px;color:#C0392B;margin-bottom:12px"></div>
        <div class="admin-ann-grid">
          <div class="admin-ann-field admin-ann-full">
            <label class="admin-ann-label">Title</label>
            <input class="admin-ann-input" id="annTitle" placeholder="e.g. Site maintenance this Saturday">
          </div>
          <div class="admin-ann-field admin-ann-full">
            <label class="admin-ann-label">Message</label>
            <textarea class="admin-ann-textarea" id="annBody" placeholder="Write the announcement message shown to all users…"></textarea>
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label">Type</label>
            <select class="admin-ann-select" id="annType">
              <option value="info">ℹ️ Info (blue)</option>
              <option value="warning">⚠️ Warning (yellow)</option>
              <option value="success">✅ Success (green)</option>
            </select>
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label">Expires at (optional)</label>
            <input class="admin-ann-input" id="annExpiry" type="datetime-local">
          </div>
        </div>
        <div class="admin-ann-actions">
          <button class="admin-btn" id="annSubmit" style="background:#C0392B;color:#fff;border-color:#C0392B;padding:9px 22px;font-size:13px">Publish Announcement</button>
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
                ${badge(a.active ? 'Live' : 'Inactive', a.active ? 'green' : 'gray')}
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

    document.getElementById('annSubmit')?.addEventListener('click', async () => {
      const title   = document.getElementById('annTitle')?.value.trim();
      const body    = document.getElementById('annBody')?.value.trim();
      const type    = document.getElementById('annType')?.value;
      const expiry  = document.getElementById('annExpiry')?.value;
      const errEl   = document.getElementById('annFormError');
      const btn     = document.getElementById('annSubmit');

      errEl.style.display = 'none';
      if (!title || !body) {
        errEl.textContent = 'Title and message are required.';
        errEl.style.display = 'block';
        return;
      }
      btn.disabled = true; btn.textContent = 'Publishing…';
      try {
        await api('/api/admin/announcements', {
          method: 'POST',
          body: JSON.stringify({ title, body, type, expiresAt: expiry || null }),
        });
        showAnnouncements();
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
async function openViewListing(id) {
  let l;
  try { l = await api(`/api/admin/listings/${encodeURIComponent(id)}`); }
  catch (err) { alert(err.message); return; }

  const commentHtml = (l.comments || []).length
    ? (l.comments || []).map(c => `
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
      ${badge(capitalize(l.category), 'green')}
      ${l.subcategory ? badge(l.subcategory) : ''}
      ${l.location ? `<span>📍 ${esc(l.location)}</span>` : ''}
      ${l.locationType ? `<span>${esc(l.locationType)}</span>` : ''}
      <span style="margin-left:auto;font-size:12px">Posted ${fmtDate(l.createdAt)}</span>
    </div>

    <div class="admin-modal-grid" style="margin-top:12px">
      ${l.price ? `
        <div class="admin-modal-field">
          <label class="admin-modal-label">Price</label>
          <div class="admin-view-val">${esc(l.price)}${l.priceNote ? ` <span style="color:#6b7a8d;font-size:12px">(${esc(l.priceNote)})</span>` : ''}</div>
        </div>` : ''}
      ${l.availability ? `
        <div class="admin-modal-field">
          <label class="admin-modal-label">Availability</label>
          <div class="admin-view-val">${esc(l.availability)}</div>
        </div>` : ''}
      ${l.contactPhone ? `
        <div class="admin-modal-field">
          <label class="admin-modal-label">Contact Phone</label>
          <div class="admin-view-val">${esc(l.contactPhone)}</div>
        </div>` : ''}
      ${l.externalLink ? `
        <div class="admin-modal-field">
          <label class="admin-modal-label">External Link</label>
          <div class="admin-view-val"><a href="${esc(l.externalLink)}" target="_blank" rel="noopener" style="color:#C0392B;word-break:break-all">${esc(l.externalLink)}</a></div>
        </div>` : ''}
      ${l.tags?.length ? `
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label">Tags</label>
          <div class="admin-view-val" style="display:flex;gap:6px;flex-wrap:wrap">${l.tags.map(t => badge(t)).join('')}</div>
        </div>` : ''}
      ${l.description ? `
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label">Description</label>
          <div class="admin-view-desc">${esc(l.description)}</div>
        </div>` : ''}
    </div>

    ${(l.comments || []).length ? `
      <div style="margin-top:16px">
        <div class="admin-modal-label" style="margin-bottom:10px">Comments (${l.comments.length})</div>
        <div class="admin-view-comments">${commentHtml}</div>
      </div>` : ''}

    <div class="admin-view-actions">
      <button class="admin-btn" style="background:#C0392B;color:#fff;border-color:#C0392B" data-edit-listing="${esc(l.id)}">✏️ Edit Listing</button>
      <button class="admin-btn admin-btn-danger" data-del-listing="${esc(l.id)}">🗑 Delete</button>
    </div>
  `, null);
}

/* ══════════════════════════════════════
   VIEW MODAL (Discussion)
══════════════════════════════════════ */
async function openViewDiscussion(id) {
  let d;
  try { d = await api(`/api/admin/discussions/${encodeURIComponent(id)}`); }
  catch (err) { alert(err.message); return; }

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
      <button class="admin-btn" style="background:#C0392B;color:#fff;border-color:#C0392B" data-edit-discussion="${esc(d.id)}">✏️ Edit Discussion</button>
      <button class="admin-btn admin-btn-danger" data-del-discussion="${esc(d.id)}">🗑 Delete</button>
    </div>
  `, null);
}

/* ══════════════════════════════════════
   EDIT MODALS (Listing + Discussion)
══════════════════════════════════════ */
async function openEditListing(id) {
  let l;
  try { l = await api(`/api/admin/listings/${encodeURIComponent(id)}`); }
  catch (err) { alert(err.message); return; }

  openModal('Edit Listing', `
    <div class="admin-modal-meta">Posted ${fmtDate(l.createdAt)}</div>
    <div class="admin-modal-grid">
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Title</label>
        <input class="admin-modal-input" id="mTitle" value="${esc(l.title || '')}">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Description</label>
        <textarea class="admin-modal-textarea" id="mDesc" rows="5">${esc(l.description || '')}</textarea>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Category</label>
        <select class="admin-modal-select" id="mCat">
          ${CATEGORIES.filter(c => c).map(c => `<option value="${c}"${c === l.category ? ' selected' : ''}>${capitalize(c)}</option>`).join('')}
        </select>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Subcategory</label>
        <input class="admin-modal-input" id="mSubcat" value="${esc(l.subcategory || '')}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Location</label>
        <input class="admin-modal-input" id="mLocation" value="${esc(l.location || '')}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Price</label>
        <input class="admin-modal-input" id="mPrice" value="${esc(l.price || '')}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Price Note</label>
        <input class="admin-modal-input" id="mPriceNote" value="${esc(l.priceNote || '')}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Availability</label>
        <input class="admin-modal-input" id="mAvail" value="${esc(l.availability || '')}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Contact Phone</label>
        <input class="admin-modal-input" id="mPhone" value="${esc(l.contactPhone || '')}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">External Link</label>
        <input class="admin-modal-input" id="mLink" value="${esc(l.externalLink || '')}">
      </div>
    </div>
  `, async () => {
    await api(`/api/admin/listings/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: document.getElementById('mTitle').value.trim(),
        description: document.getElementById('mDesc').value.trim(),
        category: document.getElementById('mCat').value,
        subcategory: document.getElementById('mSubcat').value.trim(),
        location: document.getElementById('mLocation').value.trim(),
        price: document.getElementById('mPrice').value.trim(),
        priceNote: document.getElementById('mPriceNote').value.trim(),
        availability: document.getElementById('mAvail').value.trim(),
        contactPhone: document.getElementById('mPhone').value.trim(),
        externalLink: document.getElementById('mLink').value.trim(),
      }),
    });
    showListings();
  });
}

async function openEditDiscussion(id) {
  let d;
  try { d = await api(`/api/admin/discussions/${encodeURIComponent(id)}`); }
  catch (err) { alert(err.message); return; }

  openModal('Edit Discussion', `
    <div class="admin-modal-meta">By ${esc(d.authorName)} · ${d.commentCount} comment${d.commentCount !== 1 ? 's' : ''} · ${fmtDate(d.createdAt)}</div>
    <div class="admin-modal-grid">
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Title</label>
        <input class="admin-modal-input" id="dTitle" value="${esc(d.title || '')}">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Body</label>
        <textarea class="admin-modal-textarea" id="dBody" rows="8">${esc(d.body || '')}</textarea>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Category</label>
        <input class="admin-modal-input" id="dCat" value="${esc(d.category || '')}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Tags (comma-separated)</label>
        <input class="admin-modal-input" id="dTags" value="${esc((d.tags || []).join(', '))}">
      </div>
    </div>
  `, async () => {
    const tags = document.getElementById('dTags').value.split(',').map(t => t.trim()).filter(Boolean);
    await api(`/api/admin/discussions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: document.getElementById('dTitle').value.trim(),
        body: document.getElementById('dBody').value.trim(),
        category: document.getElementById('dCat').value.trim(),
        tags,
      }),
    });
    showDiscussions();
  });
}

/* ══════════════════════════════════════
   MODAL ENGINE
══════════════════════════════════════ */
function openModal(title, bodyHtml, onSave) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.id = 'adminModalOverlay';
  overlay.className = 'admin-modal-overlay';
  const hasActions = onSave !== null;
  overlay.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true">
      <div class="admin-modal-head">
        <div class="admin-modal-title">${title}</div>
        <button class="admin-modal-close" id="adminModalClose">×</button>
      </div>
      <div class="admin-modal-error" id="adminModalError"></div>
      ${bodyHtml}
      ${hasActions ? `<div class="admin-modal-actions">
        <button class="admin-btn admin-btn-ghost" id="adminModalCancel">Cancel</button>
        <button class="admin-btn" id="adminModalSave" style="background:#C0392B;color:#fff;border-color:#C0392B;padding:8px 20px;font-size:13px">Save Changes</button>
      </div>` : `<div class="admin-modal-actions">
        <button class="admin-btn admin-btn-ghost" id="adminModalCancel">Close</button>
      </div>`}
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('adminModalClose').addEventListener('click', closeModal);
  document.getElementById('adminModalCancel').addEventListener('click', closeModal);
  if (onSave) {
    document.getElementById('adminModalSave').addEventListener('click', async () => {
      const errEl = document.getElementById('adminModalError');
      const btn = document.getElementById('adminModalSave');
      errEl.style.display = 'none';
      btn.disabled = true; btn.textContent = 'Saving…';
      try { await onSave(); closeModal(); }
      catch (err) {
        errEl.textContent = err.message; errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Save Changes';
      }
    });
  }
}
function closeModal() { document.getElementById('adminModalOverlay')?.remove(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ══════════════════════════════════════
   EVENT DELEGATION
══════════════════════════════════════ */
document.addEventListener('click', async e => {

  // Navigation
  const navLink = e.target.closest('[data-view]');
  if (navLink && navLink.closest('.admin-nav')) { navigate(navLink.dataset.view); return; }

  // Modal overlay close
  if (e.target.id === 'adminModalOverlay') { closeModal(); return; }

  // Pagination
  const pageBtn = e.target.closest('[data-page][data-pager-view]');
  if (pageBtn) {
    const v = pageBtn.dataset.pagerView;
    _s[v] && (_s[v].page = parseInt(pageBtn.dataset.page));
    ({ users: showUsers, listings: showListings, discussions: showDiscussions,
       comments: showComments })[v]?.();
    return;
  }

  // Comment type filter tabs
  const commentTab = e.target.closest('[data-comment-type]');
  if (commentTab) { _s.comments.type = commentTab.dataset.commentType; showComments(1); return; }

  // View user detail
  const viewUser = e.target.closest('[data-view-user]');
  if (viewUser) {
    const d = viewUser.dataset;
    openUserDetail(d.viewUser, d.viewUserName, d.viewUserEmail, d.viewUserRole, d.viewUserJoined, d.viewUserListings);
    return;
  }

  // Promote / demote
  const promoteBtn = e.target.closest('[data-promote]');
  if (promoteBtn) {
    const newRole = promoteBtn.dataset.promoteTo;
    if (!confirm(`Change this user to "${newRole}"?`)) return;
    try {
      await api(`/api/admin/users/${encodeURIComponent(promoteBtn.dataset.promote)}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) });
      showUsers();
    } catch (err) { alert(err.message); }
    return;
  }

  // View listing
  const viewListing = e.target.closest('[data-view-listing]');
  if (viewListing) { openViewListing(viewListing.dataset.viewListing); return; }

  // Edit listing
  const editListing = e.target.closest('[data-edit-listing]');
  if (editListing) { openEditListing(editListing.dataset.editListing); return; }

  // View discussion
  const viewDiscussion = e.target.closest('[data-view-discussion]');
  if (viewDiscussion) { openViewDiscussion(viewDiscussion.dataset.viewDiscussion); return; }

  // Edit discussion
  const editDiscussion = e.target.closest('[data-edit-discussion]');
  if (editDiscussion) { openEditDiscussion(editDiscussion.dataset.editDiscussion); return; }

  // Delete user
  const delUser = e.target.closest('[data-del-user]');
  if (delUser) {
    if (!confirm(`Delete "${delUser.dataset.delName || 'this user'}"? Their listings will also be removed.`)) return;
    try {
      await api(`/api/admin/users/${encodeURIComponent(delUser.dataset.delUser)}`, { method: 'DELETE' });
      closeModal(); showUsers();
    } catch (err) { alert(err.message); }
    return;
  }

  // Delete listing
  const delListing = e.target.closest('[data-del-listing]');
  if (delListing) {
    if (!confirm('Delete this listing?')) return;
    try {
      await api(`/api/admin/listings/${encodeURIComponent(delListing.dataset.delListing)}`, { method: 'DELETE' });
      closeModal(); showListings();
    } catch (err) { alert(err.message); }
    return;
  }

  // Delete discussion
  const delDiscussion = e.target.closest('[data-del-discussion]');
  if (delDiscussion) {
    if (!confirm('Delete this discussion and all its comments?')) return;
    try {
      await api(`/api/admin/discussions/${encodeURIComponent(delDiscussion.dataset.delDiscussion)}`, { method: 'DELETE' });
      closeModal(); showDiscussions();
    } catch (err) { alert(err.message); }
    return;
  }

  // Delete comment
  const delComment = e.target.closest('[data-del-comment]');
  if (delComment) {
    if (!confirm('Remove this comment?')) return;
    const { commentId, parentId, parentType } = delComment.dataset;
    try {
      await api(`/api/admin/${parentType}s/${encodeURIComponent(parentId)}/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });
      showComments();
    } catch (err) { alert(err.message); }
    return;
  }

  // Toggle announcement
  const toggleAnn = e.target.closest('[data-toggle-ann]');
  if (toggleAnn) {
    try {
      await api(`/api/admin/announcements/${encodeURIComponent(toggleAnn.dataset.toggleAnn)}/toggle`, { method: 'PUT' });
      showAnnouncements();
    } catch (err) { alert(err.message); }
    return;
  }

  // Delete announcement
  const delAnn = e.target.closest('[data-del-ann]');
  if (delAnn) {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api(`/api/admin/announcements/${encodeURIComponent(delAnn.dataset.delAnn)}`, { method: 'DELETE' });
      showAnnouncements();
    } catch (err) { alert(err.message); }
    return;
  }

  // Logout
  if (e.target.closest('#adminLogout')) {
    localStorage.removeItem('biscoonToken');
    localStorage.removeItem('biscoonSession');
    window.location.href = 'login.html';
  }
});
