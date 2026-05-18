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
  conversations: { page: 1 },
};

/* ── Bootstrap ── */
document.addEventListener('DOMContentLoaded', async () => {
  _token = localStorage.getItem('biscoonToken') || '';
  if (!_token) { goLogin(); return; }
  try {
    _me = await api('/api/auth/me');
    if (_me.role !== 'admin') {
      alert('Access denied. Admin accounts only.');
      window.location.href = '../../index.html';
      return;
    }
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

function goLogin() {
  window.location.href = 'login.html';
}

/* ── Navigation ── */
const VIEW_TITLES = {
  dashboard:     'Dashboard',
  users:         'Users',
  listings:      'Listings',
  discussions:   'Discussions',
  conversations: 'Conversations',
};

function navigate(view) {
  _view = view;
  document.querySelectorAll('.admin-nav-link').forEach(l =>
    l.classList.toggle('active', l.dataset.view === view));
  document.getElementById('viewTitle').textContent = VIEW_TITLES[view] || view;
  content('<div class="admin-loading">Loading…</div>');
  ({ dashboard: showDashboard, users: showUsers, listings: showListings,
     discussions: showDiscussions, conversations: showConversations })[view]?.();
}

function content(html) {
  document.getElementById('adminContent').innerHTML = html;
}

/* ── Helpers ── */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function badge(text, color = 'gray') {
  return `<span class="admin-badge admin-badge-${color}">${esc(text)}</span>`;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function table(headers, rows) {
  if (!rows.length) return '<div class="admin-empty">No records found.</div>';
  return `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

function pager(current, total, view) {
  if (total <= 1) return '';
  const btns = [];
  const show = total <= 7 ? total : 7;
  for (let i = 1; i <= show; i++) {
    btns.push(`<button class="admin-page-btn${i === current ? ' active' : ''}" data-page="${i}" data-pager-view="${view}">${i}</button>`);
  }
  if (total > 7) btns.push(`<span style="padding:0 4px;color:#6b7a8d">… ${total} pages</span>`);
  return `<div class="admin-pagination">${btns.join('')}</div>`;
}

/* ── Dashboard ── */
async function showDashboard() {
  try {
    const s = await api('/api/admin/stats');
    content(`
      <div class="admin-stats-grid">
        ${statCard('👥', 'Total Users',    s.users.total,         `+${s.users.thisWeek} this week`,        'blue')}
        ${statCard('📋', 'Total Listings', s.listings.total,      `+${s.listings.thisWeek} this week`,     'green')}
        ${statCard('💬', 'Discussions',    s.discussions.total,   `+${s.discussions.thisWeek} this week`,  'purple')}
        ${statCard('✉️', 'Conversations',  s.conversations.total, 'active threads',                       'red')}
      </div>

      <div class="admin-two-col">
        <div class="admin-card">
          <div class="admin-card-head">Listings by Category</div>
          ${table(
            ['Category', 'Count'],
            s.byCategory.map(c => [badge(capitalize(c.category)), `<strong>${c.count}</strong>`])
          )}
        </div>
        <div class="admin-card">
          <div class="admin-card-head">Recent Users</div>
          ${table(
            ['Name', 'Email', 'Role', 'Joined'],
            s.recentUsers.map(u => [
              esc(u.name),
              esc(u.email),
              badge(u.role, u.role === 'admin' ? 'red' : 'gray'),
              fmtDate(u.createdAt),
            ])
          )}
        </div>
      </div>

      <div class="admin-card">
        <div class="admin-card-head">Recent Listings</div>
        ${table(
          ['Title', 'Category', 'Location', 'Date'],
          s.recentListings.map(l => [
            esc(l.title),
            badge(l.category),
            esc(l.location || '—'),
            fmtDate(l.createdAt),
          ])
        )}
      </div>

      <div class="admin-two-col">
        <div class="admin-card">
          <div class="admin-card-head">Users This Month</div>
          <div style="padding:20px;display:flex;gap:24px;align-items:flex-end">
            ${miniStat('Today',      s.users.today)}
            ${miniStat('This Week',  s.users.thisWeek)}
            ${miniStat('This Month', s.users.thisMonth)}
            ${miniStat('All Time',   s.users.total, true)}
          </div>
        </div>
        <div class="admin-card">
          <div class="admin-card-head">Listings Activity</div>
          <div style="padding:20px;display:flex;gap:24px;align-items:flex-end">
            ${miniStat('Today',      s.listings.today)}
            ${miniStat('This Week',  s.listings.thisWeek)}
            ${miniStat('All Time',   s.listings.total, true)}
          </div>
        </div>
      </div>
    `);
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}

function statCard(icon, label, value, sub, color) {
  return `<div class="admin-stat-card admin-stat-${color}">
    <div class="admin-stat-icon">${icon}</div>
    <div>
      <div class="admin-stat-value">${Number(value).toLocaleString()}</div>
      <div class="admin-stat-label">${label}</div>
      <div class="admin-stat-sub">${sub}</div>
    </div>
  </div>`;
}

function miniStat(label, value, highlight = false) {
  return `<div style="text-align:center">
    <div style="font-size:${highlight ? '26px' : '20px'};font-weight:700;color:${highlight ? '#C0392B' : '#1a2332'}">${Number(value).toLocaleString()}</div>
    <div style="font-size:11px;color:#6b7a8d;margin-top:3px">${label}</div>
  </div>`;
}

/* ── Users ── */
async function showUsers(page) {
  if (page !== undefined) _s.users.page = page;
  const { page: p, search } = _s.users;
  try {
    const params = new URLSearchParams({ page: p, limit: 20, search });
    const data = await api(`/api/admin/users?${params}`);

    content(`
      <div class="admin-toolbar">
        <input class="admin-search" id="userSearch" type="search" placeholder="Search name or email…" value="${esc(search)}">
        <span style="font-size:12.5px;color:#6b7a8d">${data.total} user${data.total !== 1 ? 's' : ''}</span>
      </div>
      <div class="admin-card">
        ${table(
          ['Name', 'Email', 'Phone', 'Role', 'Listings', 'Joined', 'Actions'],
          data.users.map(u => [
            esc(u.name),
            esc(u.email),
            esc(u.phone || '—'),
            badge(u.role, u.role === 'admin' ? 'red' : 'gray'),
            u.listingCount,
            fmtDate(u.createdAt),
            `<div class="admin-actions">
              <button class="admin-btn admin-btn-ghost" data-promote="${esc(u.id)}" data-promote-to="${u.role === 'admin' ? 'user' : 'admin'}" title="${u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}">
                ${u.role === 'admin' ? '👤 Demote' : '⭐ Promote'}
              </button>
              ${u.id !== _me.id
                ? `<button class="admin-btn admin-btn-danger" data-del-user="${esc(u.id)}" data-del-name="${esc(u.name)}" title="Delete user">🗑</button>`
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
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}

/* ── Listings ── */
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
    const params = new URLSearchParams({ page: p, limit: 20, category, search });
    const data = await api(`/api/admin/listings?${params}`);

    content(`
      <div class="admin-toolbar">
        <input class="admin-search" id="listingSearch" type="search" placeholder="Search listings…" value="${esc(search)}">
        <select class="admin-select" id="listingCat">
          ${CATEGORIES.map(c => `<option value="${esc(c)}"${c === category ? ' selected' : ''}>${c ? capitalize(c) : 'All categories'}</option>`).join('')}
        </select>
        <span style="font-size:12.5px;color:#6b7a8d">${data.total} listing${data.total !== 1 ? 's' : ''}</span>
      </div>
      <div class="admin-card">
        ${table(
          ['Title', 'Category', 'Location', 'Posted', 'Actions'],
          data.listings.map(l => [
            esc(l.title),
            badge(l.category),
            esc(l.location || '—'),
            fmtDate(l.createdAt),
            `<div class="admin-actions">
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
      _s.listings.category = e.target.value;
      showListings(1);
    });
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}

/* ── Discussions ── */
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
            esc(d.title),
            esc(d.authorName),
            badge(d.category),
            d.commentCount,
            fmtDate(d.createdAt),
            `<div class="admin-actions">
               <button class="admin-btn admin-btn-ghost" data-edit-discussion="${esc(d.id)}">✏️ Edit</button>
               <button class="admin-btn admin-btn-danger" data-del-discussion="${esc(d.id)}">🗑</button>
             </div>`,
          ])
        )}
        ${pager(data.page, data.pages, 'discussions')}
      </div>
    `);
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}

/* ── Conversations ── */
async function showConversations(page) {
  if (page !== undefined) _s.conversations.page = page;
  const { page: p } = _s.conversations;
  try {
    const data = await api(`/api/admin/conversations?page=${p}&limit=20`);

    content(`
      <div class="admin-notice">
        🔒 Message content is private. Only metadata is shown here — who's talking, about which listing, and how many messages.
      </div>
      <div class="admin-card">
        ${table(
          ['Participants', 'About Listing', 'Messages', 'Last Activity'],
          data.conversations.map(c => [
            esc(c.participantNames.join(' ↔ ')),
            esc(c.listingTitle || '—'),
            c.messageCount,
            fmtDate(c.updatedAt),
          ])
        )}
        ${pager(data.page, data.pages, 'conversations')}
      </div>
    `);
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}

/* ── Event delegation ── */
document.addEventListener('click', async e => {

  // Navigation
  const navLink = e.target.closest('[data-view]');
  if (navLink && navLink.closest('.admin-nav')) {
    navigate(navLink.dataset.view);
    return;
  }

  // Pagination
  const pageBtn = e.target.closest('[data-page][data-pager-view]');
  if (pageBtn) {
    const pg = parseInt(pageBtn.dataset.page);
    const v  = pageBtn.dataset.pagerView;
    if (v) { _s[v].page = pg; ({ users: showUsers, listings: showListings, discussions: showDiscussions, conversations: showConversations })[v]?.(); }
    return;
  }

  // Promote / demote user role
  const promoteBtn = e.target.closest('[data-promote]');
  if (promoteBtn) {
    const newRole = promoteBtn.dataset.promoteTo;
    if (!confirm(`Change this user to "${newRole}"?`)) return;
    try {
      await api(`/api/admin/users/${encodeURIComponent(promoteBtn.dataset.promote)}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      showUsers();
    } catch (err) { alert(err.message); }
    return;
  }

  // Delete user
  const delUser = e.target.closest('[data-del-user]');
  if (delUser) {
    const name = delUser.dataset.delName || 'this user';
    if (!confirm(`Delete "${name}"? Their listings will also be removed. This cannot be undone.`)) return;
    try {
      await api(`/api/admin/users/${encodeURIComponent(delUser.dataset.delUser)}`, { method: 'DELETE' });
      showUsers();
    } catch (err) { alert(err.message); }
    return;
  }

  // Edit listing
  const editListing = e.target.closest('[data-edit-listing]');
  if (editListing) { openEditListing(editListing.dataset.editListing); return; }

  // Edit discussion
  const editDiscussion = e.target.closest('[data-edit-discussion]');
  if (editDiscussion) { openEditDiscussion(editDiscussion.dataset.editDiscussion); return; }

  // Delete listing
  const delListing = e.target.closest('[data-del-listing]');
  if (delListing) {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await api(`/api/admin/listings/${encodeURIComponent(delListing.dataset.delListing)}`, { method: 'DELETE' });
      showListings();
    } catch (err) { alert(err.message); }
    return;
  }

  // Delete discussion
  const delDiscussion = e.target.closest('[data-del-discussion]');
  if (delDiscussion) {
    if (!confirm('Delete this discussion and all its comments? This cannot be undone.')) return;
    try {
      await api(`/api/admin/discussions/${encodeURIComponent(delDiscussion.dataset.delDiscussion)}`, { method: 'DELETE' });
      showDiscussions();
    } catch (err) { alert(err.message); }
    return;
  }

  // Close modal on overlay click
  if (e.target.closest('#adminModalOverlay') === e.target) { closeModal(); return; }
  if (e.target.closest('#adminModalClose')) { closeModal(); return; }

  // Logout
  if (e.target.closest('#adminLogout')) {
    localStorage.removeItem('biscoonToken');
    localStorage.removeItem('biscoonSession');
    window.location.href = 'login.html';
  }
});

/* ── Modal ── */
function openModal(title, bodyHtml, onSave) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.id = 'adminModalOverlay';
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true">
      <div class="admin-modal-head">
        <div class="admin-modal-title">${title}</div>
        <button class="admin-modal-close" id="adminModalClose" title="Close">×</button>
      </div>
      <div class="admin-modal-error" id="adminModalError"></div>
      ${bodyHtml}
      <div class="admin-modal-actions">
        <button class="admin-btn admin-btn-ghost" id="adminModalClose2">Cancel</button>
        <button class="admin-btn" id="adminModalSave" style="background:#C0392B;color:#fff;border-color:#C0392B;padding:8px 20px;font-size:13px">Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('adminModalClose2').addEventListener('click', closeModal);
  document.getElementById('adminModalSave').addEventListener('click', async () => {
    const errEl = document.getElementById('adminModalError');
    const saveBtn = document.getElementById('adminModalSave');
    errEl.style.display = 'none';
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      await onSave();
      closeModal();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });
}

function closeModal() {
  document.getElementById('adminModalOverlay')?.remove();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ── Edit Listing Modal ── */
async function openEditListing(id) {
  let l;
  try { l = await api(`/api/admin/listings/${encodeURIComponent(id)}`); }
  catch (err) { alert(err.message); return; }

  openModal('Edit Listing', `
    <div class="admin-modal-meta">
      Posted by user ID: ${esc(l.userId)} &nbsp;·&nbsp; Created: ${fmtDate(l.createdAt)}
    </div>
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
        title:       document.getElementById('mTitle').value.trim(),
        description: document.getElementById('mDesc').value.trim(),
        category:    document.getElementById('mCat').value,
        subcategory: document.getElementById('mSubcat').value.trim(),
        location:    document.getElementById('mLocation').value.trim(),
        price:       document.getElementById('mPrice').value.trim(),
        priceNote:   document.getElementById('mPriceNote').value.trim(),
        availability:document.getElementById('mAvail').value.trim(),
        contactPhone:document.getElementById('mPhone').value.trim(),
        externalLink:document.getElementById('mLink').value.trim(),
      }),
    });
    showListings();
  });
}

/* ── Edit Discussion Modal ── */
async function openEditDiscussion(id) {
  let d;
  try { d = await api(`/api/admin/discussions/${encodeURIComponent(id)}`); }
  catch (err) { alert(err.message); return; }

  openModal('Edit Discussion', `
    <div class="admin-modal-meta">
      By: ${esc(d.authorName)} &nbsp;·&nbsp; ${d.commentCount} comment${d.commentCount !== 1 ? 's' : ''} &nbsp;·&nbsp; Posted: ${fmtDate(d.createdAt)}
    </div>
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
    const rawTags = document.getElementById('dTags').value;
    const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);
    await api(`/api/admin/discussions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        title:    document.getElementById('dTitle').value.trim(),
        body:     document.getElementById('dBody').value.trim(),
        category: document.getElementById('dCat').value.trim(),
        tags,
      }),
    });
    showDiscussions();
  });
}
