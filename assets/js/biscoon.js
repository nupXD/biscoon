/* ═══════════════════════════════════════════════
   BISCOON.JS — Shared JavaScript
   The Global Nepali Ecosystem
═══════════════════════════════════════════════ */

// ── Mobile menu ──
function toggleMenu() {
  const d = document.getElementById('mobileDrawer');
  const h = document.getElementById('hamburger');
  d.classList.toggle('open');
  h.classList.toggle('open');
}
document.addEventListener('DOMContentLoaded', function () {
  document.addEventListener('click', function (e) {
    const d = document.getElementById('mobileDrawer');
    const h = document.getElementById('hamburger');
    if (d && h && !d.contains(e.target) && !h.contains(e.target)) {
      d.classList.remove('open');
      h.classList.remove('open');
    }
  });

  // ── Mark active nav link ──
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-drawer a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === currentPage || (currentPage === 'index.html' && href === './') || href.includes(currentPage)) {
      a.classList.add('active');
    }
  });

  // ── Search enter key ──
  const si = document.getElementById('searchInput');
  if (si) si.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch() });

  // ── Geolocation ──
  const changeLocBtn = document.getElementById('changeLocation');
  if (changeLocBtn) {
    changeLocBtn.addEventListener('click', function (e) {
      e.preventDefault();
      const loading = document.getElementById('locationLoading');
      if (loading) loading.style.display = 'inline';
      fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(d => {
          if (d.city) {
            const el = document.getElementById('cityName');
            if (el) el.textContent = d.city + ', ' + (d.region || d.region_code || '');
          }
        })
        .catch(() => {})
        .finally(() => { if (loading) loading.style.display = 'none'; });
    });
  }

  // ── Heatmap ──
  buildHeatmap();

  // ── Filter chips ──
  document.querySelectorAll('.chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', function () {
      const group = this.closest('.filter-chips');
      if (group) group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      const filter = this.dataset.filter;
      filterListings(filter);
    });
  });

  // ── Auth state and user dropdown ──
  ensureAuthDropdowns();
  checkAuthState();
  bindAuthDropdownEvents();
  bindProtectedPostActions();
  bindListingDetailModal();
  bindBrowseListingActions();
  guardPostingPage();

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    document.querySelectorAll('#userDropdown').forEach(dropdown => {
      const menu = dropdown.querySelector('#dropdownMenu');
      const btn = dropdown.querySelector('#userBtn');
      if (menu && btn && !dropdown.contains(e.target)) {
        btn.classList.remove('open');
        menu.classList.remove('open');
      }
    });
  });
});

// ── Auth functions ──
function checkAuthState() {
  const token = localStorage.getItem('biscoonToken');
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navCtas = document.querySelectorAll('#navCtas, .nav-ctas');
  const userDropdowns = document.querySelectorAll('.user-dropdown');
  const mobileBtns = document.querySelectorAll('.mobile-drawer-btns, #mobileBtns');
  const mobileUserMenus = document.querySelectorAll('.mobile-user-menu');
  const looseAuthLinks = document.querySelectorAll(
    'nav > a.btn-ghost[href*="login"], nav > a.btn-primary[href*="signup"], .mobile-drawer a.btn-ghost[href*="login"], .mobile-drawer a.btn-primary[href*="signup"]'
  );
  const visibleDropdowns = new Set();

  if (token) {
    document.body.classList.add('biscoon-logged-in');
    document.body.classList.remove('biscoon-logged-out');

    // User is logged in
    navCtas.forEach(el => { el.style.display = 'none'; });
    document.querySelectorAll('nav').forEach(nav => {
      const dropdown = nav.querySelector('.user-dropdown');
      if (dropdown) {
        dropdown.style.display = 'block';
        visibleDropdowns.add(dropdown);
      }
    });
    userDropdowns.forEach(el => {
      if (!visibleDropdowns.has(el)) el.style.display = 'none';
    });
    mobileBtns.forEach(el => { el.style.display = ''; });
    mobileUserMenus.forEach(el => { el.style.display = ''; });
    looseAuthLinks.forEach(el => { el.style.display = 'none'; });

    if (currentPage === 'login.html' || currentPage === 'signup.html') {
      window.location.href = 'profile.html';
      return;
    }

    // Fetch user info
    fetchUserInfo(token);
  } else {
    document.body.classList.add('biscoon-logged-out');
    document.body.classList.remove('biscoon-logged-in');

    // User is not logged in
    navCtas.forEach(el => { el.style.display = 'flex'; });
    userDropdowns.forEach(el => { el.style.display = 'none'; });
    mobileBtns.forEach(el => { el.style.display = ''; });
    mobileUserMenus.forEach(el => { el.style.display = ''; });
    looseAuthLinks.forEach(el => { el.style.display = ''; });
  }
}

function getRelativeAuthPath(page) {
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  const isHome = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/';
  const prefix = isHome ? 'pages/auth' : depth >= 3 ? '../auth' : 'auth';
  return `${prefix}/${page}`;
}

function getRelativePostPath(page) {
  const isHome = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/';
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  const prefix = isHome ? 'pages/post' : depth >= 3 ? '../post' : 'post';
  return `${prefix}/${page}`;
}

function ensureAuthDropdowns() {
  document.querySelectorAll('nav').forEach(nav => {
    if (nav.querySelector('.user-dropdown')) return;

    const dropdown = document.createElement('div');
    dropdown.className = 'user-dropdown';
    dropdown.id = 'userDropdown';
    dropdown.style.display = 'none';
    dropdown.innerHTML = `
      <button class="user-btn" id="userBtn" type="button">
        <span class="user-avatar">👤</span>
        <span class="user-name" id="userName">Profile</span>
        <span class="dropdown-arrow">▼</span>
      </button>
      <div class="dropdown-menu" id="dropdownMenu">
        <a href="${getRelativeAuthPath('profile.html')}">📋 My Profile</a>
        <a href="${getRelativePostPath('listing.html')}">➕ Add Listing</a>
        <a href="#" id="logoutBtn">🚪 Logout</a>
      </div>
    `;

    const hamburger = nav.querySelector('.hamburger');
    if (hamburger) {
      nav.insertBefore(dropdown, hamburger);
    } else {
      nav.appendChild(dropdown);
    }
  });

  document.querySelectorAll('.mobile-drawer').forEach(drawer => {
    if (drawer.querySelector('.mobile-user-menu')) return;

    const menu = document.createElement('div');
    menu.className = 'mobile-user-menu';
    menu.id = 'mobileUserMenu';
    menu.innerHTML = `
      <div class="mobile-user-info">
        <span class="user-avatar">👤</span>
        <span class="user-name" id="mobileUserName">Profile</span>
      </div>
      <a href="${getRelativeAuthPath('profile.html')}">📋 My Profile</a>
      <a href="${getRelativePostPath('listing.html')}">➕ Add Listing</a>
      <a href="#" id="mobileLogoutBtn">🚪 Logout</a>
    `;
    drawer.appendChild(menu);
  });
}

function bindAuthDropdownEvents() {
  document.querySelectorAll('#userBtn').forEach(btn => {
    if (btn.dataset.authBound) return;
    btn.dataset.authBound = 'true';
    btn.addEventListener('click', toggleDropdown);
  });

  document.querySelectorAll('#logoutBtn, #mobileLogoutBtn').forEach(btn => {
    if (btn.dataset.authBound) return;
    btn.dataset.authBound = 'true';
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  });
}

function getPostListingPath() {
  return '/pages/post/listing.html';
}

function getHomeListingsPath(category = '', subcategory = '') {
  const url = new URL('/index.html', window.location.origin);
  if (category && category !== 'all') url.searchParams.set('category', category);
  if (subcategory && subcategory !== 'all') url.searchParams.set('subcategory', subcategory);
  url.hash = 'listings';
  return url.pathname + url.search + url.hash;
}

function getLoginPath(redirectTo = getPostListingPath()) {
  const url = new URL('/pages/auth/login.html', window.location.origin);
  url.searchParams.set('redirect', redirectTo);
  return url.pathname + url.search;
}

function goToPostOrLogin() {
  const destination = localStorage.getItem('biscoonToken')
    ? getPostListingPath()
    : getLoginPath(getPostListingPath());
  window.location.href = destination;
}

function isPostListingAnchor(anchor) {
  if (!anchor) return false;
  const rawHref = anchor.getAttribute('href') || '';
  if (rawHref.includes('post/listing.html')) return true;
  return rawHref === 'listing.html' && window.location.pathname.includes('/pages/post/');
}

function isPostActionButton(button) {
  if (!button) return false;
  const text = button.textContent.trim().toLowerCase();
  return text.includes('post now') || text.includes('post a listing') || text.includes('post a free listing');
}

function bindProtectedPostActions() {
  document.addEventListener('click', function(e) {
    const anchor = e.target.closest('a');
    if (isPostListingAnchor(anchor)) {
      e.preventDefault();
      goToPostOrLogin();
      return;
    }

    const button = e.target.closest('button');
    if (isPostActionButton(button)) {
      e.preventDefault();
      goToPostOrLogin();
    }
  });
}

function normalizeCategoryForListings(category) {
  const aliases = {
    realestate: 'real-estate',
    pg: 'pg',
    students: 'student',
    rojgar: 'jobs',
  };
  return aliases[category] || category || '';
}

function getSelectedBrowseScope() {
  const activeHomeFilter = document.querySelector('.filter-btn.active');
  if (activeHomeFilter) {
    return { category: normalizeCategoryForListings(getFilterFromButton(activeHomeFilter)), subcategory: '' };
  }

  const category = normalizeCategoryForListings(inferPageCategory());
  const activeChip = document.querySelector('.filter-chips .chip.active[data-filter]');
  const chipFilter = activeChip ? activeChip.dataset.filter : '';
  return {
    category,
    subcategory: chipFilter && chipFilter !== 'all' ? chipFilter : '',
  };
}

function isBrowseListingAction(element) {
  if (!element) return false;
  if (element.classList.contains('load-more')) return true;
  const text = element.textContent.trim().toLowerCase();
  return text.includes('browse all listings')
    || text.includes('browse all categories')
    || text.includes('view all listings')
    || text.includes('load more listings');
}

function bindBrowseListingActions() {
  document.addEventListener('click', function(e) {
    const action = e.target.closest('button, a');
    if (!isBrowseListingAction(action)) return;
    e.preventDefault();
    const { category, subcategory } = getSelectedBrowseScope();
    window.location.href = getHomeListingsPath(category, subcategory);
  });
}

function guardPostingPage() {
  if (!window.location.pathname.endsWith('/pages/post/listing.html')) return;
  if (localStorage.getItem('biscoonToken')) return;
  window.location.href = getLoginPath(getPostListingPath());
}

async function fetchUserInfo(token) {
  try {
    const apiBase = getApiBase();
    const response = await fetch(apiBase + '/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      localStorage.removeItem('biscoonToken');
      checkAuthState();
      return;
    }
    const data = await response.json();
    if (data.user && data.user.name) {
      const userNameEls = document.querySelectorAll('#userName, #mobileUserName');
      userNameEls.forEach(el => el.textContent = data.user.name);
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error);
  }
}

function toggleDropdown(event) {
  const dropdown = event?.currentTarget?.closest('.user-dropdown');
  const btn = dropdown ? dropdown.querySelector('#userBtn') : document.getElementById('userBtn');
  const menu = dropdown ? dropdown.querySelector('#dropdownMenu') : document.getElementById('dropdownMenu');
  if (btn && menu) {
    btn.classList.toggle('open');
    menu.classList.toggle('open');
  }
}

function logout() {
  localStorage.removeItem('biscoonToken');
  window.location.href = '/index.html';
}

// ── Search ──
function doSearch() {
  const q = (document.getElementById('searchInput') || {}).value || '';
  const cat = (document.getElementById('searchCategory') || {}).value || '';
  const url = new URL(`${window.location.origin}/api/listings`);

  if (q.trim()) url.searchParams.set('search', q.trim());
  if (cat) url.searchParams.set('category', cat);

  fetch(url.toString())
    .then(response => response.json())
    .then(data => {
      const listings = data.listings || [];
      if (window.renderSearchResults) {
        window.renderSearchResults(listings, q.trim(), cat);
      } else if (window.renderListings) {
        window.renderListings(listings);
      } else {
        alert('Search results are available, but the current page cannot render them.');
      }
    })
    .catch(() => {
      alert('Unable to perform search at this time.');
    });
}

// ── Filter listings by data-cat ──
function filterListings(cat) {
  document.querySelectorAll('.listing-card[data-cat], .card[data-cat]').forEach(el => {
    el.style.display = (cat === 'all' || !cat || el.dataset.cat === cat) ? '' : 'none';
  });
  document.querySelectorAll('.section-divider[data-group]').forEach(el => {
    el.style.display = (cat === 'all' || !cat) ? '' : 'none';
  });
}

// ── Dynamic listings ──
const BISCOON_CATEGORY_META = {
  'ai-services': { label: 'AI Services', emoji: '🤖' },
  art: { label: 'Art', emoji: '🎨' },
  auto: { label: 'Auto / Cars', emoji: '🚗' },
  beauty: { label: 'Beauty / Salon', emoji: '💇' },
  'business-for-sale': { label: 'Business for Sale', emoji: '🏢' },
  childcare: { label: 'Child Care', emoji: '👶' },
  cleaning: { label: 'Cleaning', emoji: '🧹' },
  community: { label: 'Community', emoji: '🤝' },
  cpa: { label: 'CPA / Accounting', emoji: '📊' },
  education: { label: 'Education', emoji: '📚' },
  events: { label: 'Events', emoji: '🎉' },
  finance: { label: 'Finance', emoji: '💹' },
  healthcare: { label: 'Healthcare', emoji: '🏥' },
  housing: { label: 'Housing', emoji: '🏠' },
  immigration: { label: 'Immigration', emoji: '🛂' },
  insurance: { label: 'Insurance', emoji: '🛡️' },
  jobs: { label: 'Jobs', emoji: '💼' },
  jyotish: { label: 'Jyotish', emoji: '🔮' },
  kinbech: { label: 'Kinbech', emoji: '🛍️' },
  legal: { label: 'Legal Services', emoji: '⚖️' },
  literature: { label: 'Literature', emoji: '📖' },
  matchmaker: { label: 'Matchmaker', emoji: '💑' },
  matrimony: { label: 'Matrimony', emoji: '💍' },
  moving: { label: 'Moving', emoji: '📦' },
  music: { label: 'Music', emoji: '🎵' },
  organizations: { label: 'Organizations', emoji: '🏛️' },
  'paying-guest': { label: 'Paying Guest', emoji: '🏡' },
  pg: { label: 'Paying Guest', emoji: '🏡' },
  'pen-pals': { label: 'Pen Pals', emoji: '✉️' },
  photography: { label: 'Photography', emoji: '📸' },
  produce: { label: 'Produce', emoji: '🥬' },
  'real-estate': { label: 'Real Estate', emoji: '🏗️' },
  restaurants: { label: 'Restaurants', emoji: '🍛' },
  rojgar: { label: 'Rojgar', emoji: '💼' },
  services: { label: 'Services', emoji: '🔧' },
  shops: { label: 'Shops', emoji: '🏪' },
  sports: { label: 'Sports', emoji: '⚽' },
  student: { label: 'Student Network', emoji: '🎓' },
  students: { label: 'Student Network', emoji: '🎓' },
  tech: { label: 'Tech Services', emoji: '💻' },
  translation: { label: 'Translation', emoji: '🌐' },
  travel: { label: 'Travel', emoji: '✈️' },
  tutoring: { label: 'Tutoring', emoji: '📝' },
  yoga: { label: 'Yoga', emoji: '🧘' },
  other: { label: 'Other', emoji: '📄' },
};

function getApiBase() {
  const origin = window.location.origin || 'http://localhost:4000';
  return origin.startsWith('file://') ? 'http://localhost:4000' : origin;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function getCategoryMeta(category) {
  return BISCOON_CATEGORY_META[category] || {
    label: String(category || 'other').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    emoji: '📄',
  };
}

function getCategoryEmoji(category) {
  return getCategoryMeta(category).emoji;
}

function getListingPageHref(id) {
  const prefix = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/' ? 'pages' : '..';
  return `${prefix}/post/detail.html?id=${encodeURIComponent(id)}`;
}

function formatListingDate(value) {
  if (!value) return 'Just posted';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently posted';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function inferPageCategory() {
  const filename = window.location.pathname.split('/').pop() || 'index.html';
  const slug = filename.replace('.html', '');
  if (slug === 'index') return '';
  if (slug === 'jobs' || slug === 'rojgar') return 'jobs';
  if (slug === 'students') return 'student';
  return slug;
}

function getDynamicListingsContainer() {
  const homeContainer = document.getElementById('listingsContainer');
  if (homeContainer) return homeContainer;

  const pageMain = document.querySelector('.page-main');
  if (pageMain && pageMain.querySelector('.listing-card')) return pageMain;

  const layout = document.querySelector('.page-layout');
  const firstColumn = layout ? layout.firstElementChild : null;
  if (firstColumn && firstColumn.querySelector('.listing-card')) return firstColumn;

  return null;
}

async function fetchListings(category = '', search = '', limit = 0, subcategory = '') {
  const url = new URL(`${getApiBase()}/api/listings`);
  if (category && category !== 'all') url.searchParams.set('category', category);
  if (subcategory && subcategory !== 'all') url.searchParams.set('subcategory', subcategory);
  if (search) url.searchParams.set('search', search);
  if (limit) url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Unable to load listings');
  const data = await response.json();
  return data.listings || [];
}

async function fetchListingStats() {
  const response = await fetch(`${getApiBase()}/api/listings/stats/summary`);
  if (!response.ok) throw new Error('Unable to load listing stats');
  return response.json();
}

function formatCount(value, fallback = '0') {
  const number = Number(value || 0);
  if (!number) return fallback;
  return number.toLocaleString();
}

function listingToCard(listing) {
  const category = listing.category || 'other';
  const meta = getCategoryMeta(category);
  const subcategory = listing.subcategory ? `<span class="tag tag-blue">${escapeHtml(listing.subcategory)}</span>` : '';
  const contact = listing.contactEmail ? `<span>${escapeHtml(listing.contactEmail)}</span>` : '';
  return `
    <a class="listing-card" data-cat="${escapeHtml(category)}" data-listing-id="${escapeHtml(listing.id || '')}" href="${getListingPageHref(listing.id || '')}">
      <div class="listing-thumb">${meta.emoji}</div>
      <div class="listing-body">
        <div class="listing-title">${escapeHtml(listing.title || 'Untitled listing')}</div>
        <div class="listing-meta">
          <span>📍 ${escapeHtml(listing.location || 'Remote / Flexible')}</span>
          <span>🕐 ${escapeHtml(formatListingDate(listing.createdAt))}</span>
          ${contact}
        </div>
        <div class="listing-tags">
          <span class="tag tag-gray">${escapeHtml(meta.label)}</span>
          ${subcategory}
        </div>
      </div>
      <div class="listing-price">${escapeHtml(listing.price || 'Open')}</div>
    </a>
  `;
}

function ensureListingModal() {
  let modal = document.getElementById('listingModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'listingModal';
  modal.className = 'listing-modal';
  modal.innerHTML = `
    <div class="listing-modal-backdrop" data-close-listing-modal></div>
    <div class="listing-modal-panel" role="dialog" aria-modal="true" aria-labelledby="listingModalTitle">
      <button class="listing-modal-close" type="button" data-close-listing-modal aria-label="Close listing details">×</button>
      <div id="listingModalBody" class="listing-modal-body">
        <div class="empty-state"><div class="icon">📄</div><h3>Loading listing...</h3></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function closeListingModal() {
  const modal = document.getElementById('listingModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.classList.remove('listing-modal-open');
}

function renderListingModalContent(listing) {
  const meta = getCategoryMeta(listing.category || 'other');
  const contactEmail = listing.contactEmail
    ? `<a class="btn-primary" href="mailto:${escapeHtml(listing.contactEmail)}">Email poster</a>`
    : '';
  const contactPhone = listing.contactPhone
    ? `<a class="btn-ghost" href="tel:${escapeHtml(listing.contactPhone)}">${escapeHtml(listing.contactPhone)}</a>`
    : '';

  return `
    <div class="listing-detail-kicker">${meta.emoji} ${escapeHtml(meta.label)}</div>
    <h2 id="listingModalTitle">${escapeHtml(listing.title || 'Untitled listing')}</h2>
    <div class="listing-detail-meta">
      <span>📍 ${escapeHtml(listing.location || 'Remote / Flexible')}</span>
      <span>🕐 ${escapeHtml(formatListingDate(listing.createdAt))}</span>
      ${listing.subcategory ? `<span>${escapeHtml(listing.subcategory)}</span>` : ''}
    </div>
    <div class="listing-detail-price">${escapeHtml(listing.price || 'Open')}</div>
    <p>${escapeHtml(listing.description || 'No description provided.')}</p>
    <div class="listing-detail-contact">${contactEmail}${contactPhone}</div>
  `;
}

async function openListingModal(id) {
  if (!id) return;
  const modal = ensureListingModal();
  const body = modal.querySelector('#listingModalBody');
  modal.classList.add('open');
  document.body.classList.add('listing-modal-open');
  body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Loading listing...</h3></div>';

  try {
    const response = await fetch(`${getApiBase()}/api/listings/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error('Listing not found');
    const listing = await response.json();
    body.innerHTML = renderListingModalContent(listing);
  } catch (error) {
    body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Listing not found</h3><p>This listing may have been removed.</p></div>';
  }
}

function bindListingDetailModal() {
  document.addEventListener('click', function(e) {
    const closeTarget = e.target.closest('[data-close-listing-modal]');
    if (closeTarget) {
      e.preventDefault();
      closeListingModal();
      return;
    }

    const card = e.target.closest('.listing-card[data-listing-id]');
    if (!card) return;
    e.preventDefault();
    openListingModal(card.dataset.listingId);
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeListingModal();
  });
}

function renderListings(listings, target = getDynamicListingsContainer()) {
  if (!target) return;

  if (!listings.length) {
    target.dataset.dynamicState = 'sample';
    if (!target.querySelector('.dynamic-listing-note')) {
      target.insertAdjacentHTML('afterbegin', '<div class="dynamic-listing-note">Showing sample listings until live posts are added for this section.</div>');
    }
    return;
  }

  const grouped = listings.reduce((groups, listing) => {
    const category = listing.category || 'other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(listing);
    return groups;
  }, {});

  target.dataset.dynamicState = 'live';
  target.innerHTML = Object.entries(grouped).map(([category, items]) => {
    const meta = getCategoryMeta(category);
    return `
      <div class="section-divider" data-group="${escapeHtml(category)}">${meta.emoji} ${escapeHtml(meta.label)} <span class="count">${items.length} live</span></div>
      ${items.map(listingToCard).join('')}
    `;
  }).join('');
}

function updateHeroStats(stats, category = inferPageCategory()) {
  const heroStats = document.querySelectorAll('.page-hero-stat');
  if (!heroStats.length) return;

  const normalizedCategory = normalizeCategoryForListings(category);
  const categoryCount = normalizedCategory ? stats.byCategory?.[normalizedCategory] || 0 : stats.total;
  const values = [
    { num: formatCount(categoryCount), label: normalizedCategory ? `${getCategoryMeta(normalizedCategory).label} Listings` : 'Active Listings' },
    { num: formatCount(stats.week), label: 'New This Week' },
    { num: formatCount(stats.cities), label: 'Cities Covered' },
  ];

  heroStats.forEach((stat, index) => {
    const value = values[index];
    if (!value) return;
    const num = stat.querySelector('.num');
    const label = stat.querySelector('.lbl');
    if (num) num.textContent = value.num;
    if (label) label.textContent = value.label;
  });
}

function updateSidebarStats(stats, category = inferPageCategory()) {
  const normalizedCategory = normalizeCategoryForListings(category);
  const categoryCount = normalizedCategory ? stats.byCategory?.[normalizedCategory] || 0 : stats.total;

  document.querySelectorAll('.widget-row').forEach(row => {
    const label = row.querySelector('.lbl')?.textContent.toLowerCase() || '';
    const value = row.querySelector('.val');
    if (!value) return;

    if (label.includes('active listing') || label.includes('service listings') || label.includes('listed org') || label.includes('works published') || label.includes('rooms available') || label.includes('pg rooms')) {
      value.textContent = formatCount(categoryCount);
    } else if (label.includes('new today') || label.includes('listings today')) {
      value.textContent = `${formatCount(stats.today)} new`;
    } else if (label.includes('new this week') || label.includes('new this month')) {
      value.textContent = formatCount(stats.week);
    } else if (label.includes('cities')) {
      value.textContent = formatCount(stats.cities);
    }
  });
}

function updateHomeStats(stats) {
  const listingStatRows = Array.from(document.querySelectorAll('.widget-row'));
  listingStatRows.forEach(row => {
    const label = row.querySelector('.lbl')?.textContent.toLowerCase() || '';
    const value = row.querySelector('.val');
    if (!value) return;

    if (label.includes('active listings')) value.textContent = formatCount(stats.total);
    if (label.includes('pg rooms')) value.textContent = formatCount(stats.byCategory?.pg || stats.byCategory?.['paying-guest'] || 0);
  });
}

async function hydrateDynamicStats(category = inferPageCategory()) {
  try {
    const stats = await fetchListingStats();
    updateHeroStats(stats, category);
    updateSidebarStats(stats, category);
    updateHomeStats(stats);
  } catch (error) {
    console.error(error);
  }
}

function renderSearchResults(listings, search = '', category = '') {
  const panel = document.getElementById('searchResultsPanel');
  const meta = document.getElementById('searchResultsMeta');
  const container = document.getElementById('searchResultsContainer');
  if (!panel || !meta || !container) {
    renderListings(listings);
    return;
  }

  panel.style.display = 'block';
  const queryText = search ? ` for "${search}"` : '';
  const categoryText = category && category !== 'all' ? ` in ${getCategoryMeta(category).label}` : '';
  meta.textContent = listings.length
    ? `Showing ${listings.length} matching listing${listings.length === 1 ? '' : 's'}${queryText}${categoryText}.`
    : `No results found${queryText}${categoryText}. Try a broader keyword or different category.`;

  container.innerHTML = listings.length
    ? listings.map(listingToCard).join('')
    : '<div class="search-results-empty">No matching listings. Adjust your search and try again.</div>';
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  const select = document.getElementById('searchCategory');
  const panel = document.getElementById('searchResultsPanel');
  if (input) input.value = '';
  if (select) select.value = '';
  if (panel) panel.style.display = 'none';
}

function getFilterFromButton(button) {
  if (!button) return 'all';
  if (button.dataset.filter) return button.dataset.filter;
  const onclick = button.getAttribute('onclick') || '';
  const match = onclick.match(/'([^']+)'/);
  return match ? match[1] : 'all';
}

async function setFilter(button, category) {
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  if (button) button.classList.add('active');

  try {
    const listings = await fetchListings(normalizeCategoryForListings(category));
    renderListings(listings);
  } catch (error) {
    console.error(error);
    filterListings(category);
  }
}

async function hydrateDynamicListings(category = inferPageCategory()) {
  const target = getDynamicListingsContainer();
  if (!target) return;

  try {
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = normalizeCategoryForListings(params.get('category') || '');
    const requestedSubcategory = params.get('subcategory') || '';
    const requestedSearch = params.get('search') || '';
    const activeHomeFilter = document.querySelector('.filter-btn.active');
    const homeCategory = activeHomeFilter ? normalizeCategoryForListings(getFilterFromButton(activeHomeFilter)) : '';
    const selectedCategory = requestedCategory || homeCategory || normalizeCategoryForListings(category);

    if (requestedCategory && activeHomeFilter) {
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', normalizeCategoryForListings(getFilterFromButton(btn)) === requestedCategory);
      });
    }

    const listings = await fetchListings(selectedCategory, requestedSearch, 100, requestedSubcategory);
    renderListings(listings, target);

    if (window.location.hash === '#listings') {
      target.closest('#listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    console.error(error);
  }
}

async function hydrateListingDetail() {
  const target = document.getElementById('listingDetail');
  if (!target) return;

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    target.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Listing not found</h3><p>No listing id was provided.</p></div>';
    return;
  }

  try {
    const response = await fetch(`${getApiBase()}/api/listings/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error('Listing not found');
    const listing = await response.json();
    const meta = getCategoryMeta(listing.category || 'other');
    target.innerHTML = `
      <article class="listing-detail-card">
        <div class="listing-detail-kicker">${meta.emoji} ${escapeHtml(meta.label)}</div>
        <h1>${escapeHtml(listing.title || 'Untitled listing')}</h1>
        <div class="listing-detail-meta">
          <span>📍 ${escapeHtml(listing.location || 'Remote / Flexible')}</span>
          <span>🕐 ${escapeHtml(formatListingDate(listing.createdAt))}</span>
          ${listing.subcategory ? `<span>${escapeHtml(listing.subcategory)}</span>` : ''}
        </div>
        <div class="listing-detail-price">${escapeHtml(listing.price || 'Open')}</div>
        <p>${escapeHtml(listing.description || 'No description provided.')}</p>
        <div class="listing-detail-contact">
          ${listing.contactEmail ? `<a class="btn-primary" href="mailto:${escapeHtml(listing.contactEmail)}">Email poster</a>` : ''}
          ${listing.contactPhone ? `<a class="btn-ghost" href="tel:${escapeHtml(listing.contactPhone)}">${escapeHtml(listing.contactPhone)}</a>` : ''}
        </div>
      </article>
    `;
  } catch (error) {
    target.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Listing not found</h3><p>This listing may have been removed.</p></div>';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  hydrateDynamicListings();
  hydrateListingDetail();
  hydrateDynamicStats();

  document.querySelectorAll('.chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', async function () {
      const category = inferPageCategory();
      const filter = this.dataset.filter;
      if (!category || filter === 'all') {
        await hydrateDynamicListings(category);
        return;
      }

      try {
        const listings = await fetchListings(category, filter);
        const filtered = listings.filter(listing => listing.subcategory === filter || listing.category === filter);
        renderListings(filtered.length ? filtered : listings);
      } catch (error) {
        console.error(error);
      }
    });
  });
});

// ── Heatmap ──
function buildHeatmap() {
  const container = document.getElementById('heatmapDots');
  if (!container) return;
  const cities = [
    { name: 'New York, NY',      x: 68, y: 32, pop: 45000, sz: 28 },
    { name: 'Boston, MA',        x: 71, y: 23, pop: 28000, sz: 23 },
    { name: 'San Francisco, CA', x:  7, y: 39, pop: 35000, sz: 25 },
    { name: 'Chicago, IL',       x: 52, y: 30, pop: 18000, sz: 18 },
    { name: 'Houston, TX',       x: 45, y: 65, pop: 22000, sz: 20 },
    { name: 'Washington DC',     x: 66, y: 38, pop: 12000, sz: 16 },
    { name: 'Los Angeles, CA',   x: 11, y: 53, pop: 25000, sz: 21 },
    { name: 'Seattle, WA',       x:  8, y: 17, pop: 14000, sz: 17 },
    { name: 'Dallas, TX',        x: 44, y: 59, pop:  9000, sz: 14 },
    { name: 'Philadelphia, PA',  x: 67, y: 35, pop:  8000, sz: 13 },
    { name: 'Atlanta, GA',       x: 58, y: 55, pop:  7000, sz: 13 },
    { name: 'Denver, CO',        x: 32, y: 37, pop:  7500, sz: 12 },
    { name: 'Minneapolis, MN',   x: 48, y: 20, pop:  5000, sz: 11 },
    { name: 'Lowell, MA',        x: 71, y: 21, pop:  6000, sz: 12 },
    { name: 'San Jose, CA',      x:  7, y: 43, pop:  8000, sz: 13 },
  ];
  cities.forEach(c => {
    const dot = document.createElement('div');
    dot.className = 'heatmap-dot';
    dot.style.cssText = `left:${c.x}%;top:${c.y}%;width:${c.sz}px;height:${c.sz}px;font-size:${Math.max(7, Math.floor(c.sz / 3.5))}px;animation-delay:${Math.random() * 2}s`;
    const tip = document.createElement('div');
    tip.className = 'heatmap-tooltip';
    tip.innerHTML = `<strong>${c.name}</strong><br>~${c.pop.toLocaleString()} Nepalis`;
    dot.appendChild(tip);
    container.appendChild(dot);
  });
}

// ── Scroll to section ──
function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
