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

const BISCOON_TOKEN_KEY = 'biscoonToken';
const BISCOON_LAST_ACTIVITY_KEY = 'biscoonLastActivity';
const BISCOON_SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const BISCOON_ACTIVITY_THROTTLE_MS = 60 * 1000;
let biscoonLastActivityWrite = 0;

function getSessionLastActivity() {
  const lastActivity = Number(localStorage.getItem(BISCOON_LAST_ACTIVITY_KEY));
  return Number.isFinite(lastActivity) ? lastActivity : 0;
}

function hasSessionExpired() {
  const token = localStorage.getItem(BISCOON_TOKEN_KEY);
  if (!token) return false;

  const lastActivity = getSessionLastActivity();
  if (!lastActivity) {
    localStorage.setItem(BISCOON_LAST_ACTIVITY_KEY, String(Date.now()));
    return false;
  }

  return Date.now() - lastActivity > BISCOON_SESSION_TIMEOUT_MS;
}

function getBiscoonToken() {
  if (hasSessionExpired()) {
    endBiscoonSession({ redirect: shouldRedirectAfterSessionEnd() });
    return '';
  }
  return localStorage.getItem(BISCOON_TOKEN_KEY) || '';
}

function startBiscoonSession(token) {
  if (!token) return;
  localStorage.setItem(BISCOON_TOKEN_KEY, token);
  localStorage.setItem(BISCOON_LAST_ACTIVITY_KEY, String(Date.now()));
  biscoonLastActivityWrite = Date.now();
}

function touchBiscoonSession(force = false) {
  if (!localStorage.getItem(BISCOON_TOKEN_KEY)) return;
  if (hasSessionExpired()) {
    endBiscoonSession({ redirect: shouldRedirectAfterSessionEnd() });
    return;
  }

  const now = Date.now();
  if (!force && now - biscoonLastActivityWrite < BISCOON_ACTIVITY_THROTTLE_MS) return;
  localStorage.setItem(BISCOON_LAST_ACTIVITY_KEY, String(now));
  biscoonLastActivityWrite = now;
}

function shouldRedirectAfterSessionEnd() {
  return window.location.pathname.endsWith('/pages/auth/profile.html')
    || window.location.pathname.endsWith('/pages/post/listing.html');
}

function getCurrentPathWithQuery() {
  return window.location.pathname + window.location.search + window.location.hash;
}

function endBiscoonSession(options = {}) {
  const { redirect = false, destination = '' } = options;
  localStorage.removeItem(BISCOON_TOKEN_KEY);
  localStorage.removeItem(BISCOON_LAST_ACTIVITY_KEY);

  if (redirect) {
    window.location.href = destination || getLoginPath(getCurrentPathWithQuery());
    return;
  }

  if (typeof checkAuthState === 'function') checkAuthState();
}

function bindBiscoonSessionActivity() {
  ['click', 'keydown', 'pointerdown', 'touchstart', 'scroll'].forEach(eventName => {
    window.addEventListener(eventName, () => touchBiscoonSession(), { passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) touchBiscoonSession(true);
  });

  window.addEventListener('storage', event => {
    if (event.key === BISCOON_TOKEN_KEY && !event.newValue) checkAuthState();
  });

  window.setInterval(() => {
    if (hasSessionExpired()) endBiscoonSession({ redirect: shouldRedirectAfterSessionEnd() });
  }, 60 * 1000);
}

window.biscoonSession = {
  start: startBiscoonSession,
  end: endBiscoonSession,
  getToken: getBiscoonToken,
  touch: touchBiscoonSession,
};

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
  document.querySelectorAll('.nav-search').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const navInput = form.querySelector('.nav-search-input');
      const mainInput = document.getElementById('searchInput');
      if (navInput && mainInput) mainInput.value = navInput.value;
      doSearch();
    });
  });

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
  bindDynamicFilterChips();

  // ── Auth state and user dropdown ──
  bindBiscoonSessionActivity();
  ensureAuthDropdowns();
  ensureNotificationLinks();
  checkAuthState();
  bindAuthDropdownEvents();
  bindNotificationEvents();
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
  const token = getBiscoonToken();
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

    fetchUserInfo(token);
    fetchNotificationSummary(token);
    fetchMessageSummary(token);
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

function getRelativeCommunityPath(page) {
  const isHome = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/';
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  const prefix = isHome ? 'pages/community' : depth >= 3 ? '../community' : 'community';
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
        <span class="user-total-badge"></span>
        <span class="dropdown-arrow">▼</span>
      </button>
      <div class="dropdown-menu" id="dropdownMenu">
        <a href="${getRelativeAuthPath('profile.html')}">📋 My Profile</a>
        <a href="${getRelativeAuthPath('activity.html')}">🧾 My Activity</a>
        <a href="${getRelativeAuthPath('notifications.html')}" class="notification-link">🔔 Notifications <span class="notification-badge"></span></a>
        <a href="${getRelativeAuthPath('messages.html')}" class="messages-nav-link">✉️ Messages <span class="messages-badge" style="display:none"></span></a>
        <a href="${getRelativePostPath('listing.html')}">➕ Add Listing</a>
        <a href="${getRelativeCommunityPath('discussions.html')}?create=1">💬 Create Discussion</a>
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
      <a href="${getRelativeAuthPath('activity.html')}">🧾 My Activity</a>
      <a href="${getRelativeAuthPath('notifications.html')}" class="notification-link">🔔 Notifications <span class="notification-badge"></span></a>
      <a href="${getRelativeAuthPath('messages.html')}" class="messages-nav-link">✉️ Messages <span class="messages-badge" style="display:none"></span></a>
      <a href="${getRelativePostPath('listing.html')}">➕ Add Listing</a>
      <a href="${getRelativeCommunityPath('discussions.html')}?create=1">💬 Create Discussion</a>
      <a href="#" id="mobileLogoutBtn">🚪 Logout</a>
    `;
    drawer.appendChild(menu);
  });
}

function ensureNotificationLinks() {
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    dedupeMenuLinks(menu, '.activity-link, a[href*="activity.html"]');
    if (!menu.querySelector('.activity-link')) {
      const notificationLink = menu.querySelector('.notification-link');
      const addListingLink = Array.from(menu.querySelectorAll('a')).find(link => link.textContent.toLowerCase().includes('add listing'));
      const logoutLink = menu.querySelector('#logoutBtn');
      const link = document.createElement('a');
      link.href = getRelativeAuthPath('activity.html');
      link.className = 'activity-link';
      link.innerHTML = '🧾 My Activity';
      menu.insertBefore(link, notificationLink || addListingLink || logoutLink || null);
    }

    if (!menu.querySelector('.notification-link')) {
      const addListingLink = Array.from(menu.querySelectorAll('a')).find(link => link.textContent.toLowerCase().includes('add listing'));
      const logoutLink = menu.querySelector('#logoutBtn');
      const link = document.createElement('a');
      link.href = getRelativeAuthPath('notifications.html');
      link.className = 'notification-link';
      link.innerHTML = '🔔 Notifications <span class="notification-badge"></span>';
      menu.insertBefore(link, addListingLink || logoutLink || null);
    }

    if (!menu.querySelector('.messages-nav-link')) {
      const addListingLink = Array.from(menu.querySelectorAll('a')).find(link => link.textContent.toLowerCase().includes('add listing'));
      const logoutLink = menu.querySelector('#logoutBtn');
      const link = document.createElement('a');
      link.href = getRelativeAuthPath('messages.html');
      link.className = 'messages-nav-link';
      link.innerHTML = '✉️ Messages <span class="messages-badge" style="display:none"></span>';
      menu.insertBefore(link, addListingLink || logoutLink || null);
    }
  });

  document.querySelectorAll('.mobile-user-menu').forEach(menu => {
    dedupeMenuLinks(menu, '.activity-link, a[href*="activity.html"]');
    if (!menu.querySelector('.activity-link')) {
      const notificationLink = menu.querySelector('.notification-link');
      const addListingLink = Array.from(menu.querySelectorAll('a')).find(link => link.textContent.toLowerCase().includes('add listing'));
      const logoutLink = menu.querySelector('#mobileLogoutBtn');
      const link = document.createElement('a');
      link.href = getRelativeAuthPath('activity.html');
      link.className = 'activity-link';
      link.innerHTML = '🧾 My Activity';
      menu.insertBefore(link, notificationLink || addListingLink || logoutLink || null);
    }

    if (!menu.querySelector('.notification-link')) {
      const addListingLink = Array.from(menu.querySelectorAll('a')).find(link => link.textContent.toLowerCase().includes('add listing'));
      const logoutLink = menu.querySelector('#mobileLogoutBtn');
      const link = document.createElement('a');
      link.href = getRelativeAuthPath('notifications.html');
      link.className = 'notification-link';
      link.innerHTML = '🔔 Notifications <span class="notification-badge"></span>';
      menu.insertBefore(link, addListingLink || logoutLink || null);
    }

    if (!menu.querySelector('.messages-nav-link')) {
      const addListingLink = Array.from(menu.querySelectorAll('a')).find(link => link.textContent.toLowerCase().includes('add listing'));
      const logoutLink = menu.querySelector('#mobileLogoutBtn');
      const link = document.createElement('a');
      link.href = getRelativeAuthPath('messages.html');
      link.className = 'messages-nav-link';
      link.innerHTML = '✉️ Messages <span class="messages-badge" style="display:none"></span>';
      menu.insertBefore(link, addListingLink || logoutLink || null);
    }
  });
}

function dedupeMenuLinks(menu, selector) {
  const links = Array.from(menu.querySelectorAll(selector));
  links.slice(1).forEach(link => link.remove());
  if (links[0] && selector.includes('activity')) links[0].classList.add('activity-link');
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

function getPostListingPath(category = '') {
  const base = '/pages/post/listing.html';
  return category ? `${base}?category=${encodeURIComponent(category)}` : base;
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
  const category = inferPageCategory();
  const postPath = getPostListingPath(category);
  const destination = getBiscoonToken() ? postPath : getLoginPath(postPath);
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
    || text.includes('view all categories')
    || text.includes('view all listings')
    || text.includes('load more listings');
}

function bindBrowseListingActions() {
  document.addEventListener('click', function(e) {
    const action = e.target.closest('button, a');
    if (!isBrowseListingAction(action)) return;
    e.preventDefault();
    const categoriesSection = document.getElementById('categories');
    if (categoriesSection) {
      categoriesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.href = '/index.html#categories';
    }
  });
}

function guardPostingPage() {
  if (!window.location.pathname.endsWith('/pages/post/listing.html')) return;
  if (getBiscoonToken()) return;
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

async function fetchNotificationSummary(token = getBiscoonToken()) {
  if (!token) return;
  try {
    const response = await fetch(`${getApiBase()}/api/notifications?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = await response.json();
    updateNotificationBadges(data.unread || 0);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
  }
}

async function fetchMessageSummary(token = getBiscoonToken()) {
  if (!token) return;
  try {
    const response = await fetch(`${getApiBase()}/api/messages/unread`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = await response.json();
    updateMessageBadges(data.unread || 0);
  } catch (error) {
    console.error('Failed to fetch message count:', error);
  }
}

function updateMessageBadges(count) {
  _biscoonUnreadMessages = count;
  document.querySelectorAll('.messages-badge').forEach(badge => {
    badge.textContent = count > 0 ? String(count) : '';
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  });
  updateUserTotalBadge();
}

let _biscoonUnreadNotifications = 0;
let _biscoonUnreadMessages = 0;

function updateUserTotalBadge() {
  const total = _biscoonUnreadNotifications + _biscoonUnreadMessages;
  document.querySelectorAll('.user-total-badge').forEach(badge => {
    badge.textContent = total > 0 ? String(total > 99 ? '99+' : total) : '';
    badge.style.display = total > 0 ? 'inline-flex' : 'none';
  });
}

function updateNotificationBadges(count) {
  _biscoonUnreadNotifications = count;
  document.querySelectorAll('.notification-badge').forEach(badge => {
    badge.textContent = count > 0 ? String(count) : '';
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  });
  updateUserTotalBadge();
}

function bindNotificationEvents() {
  window.addEventListener('biscoon:notifications-updated', () => fetchNotificationSummary());
  window.addEventListener('biscoon:messages-updated', () => fetchMessageSummary());
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
  endBiscoonSession({ destination: '/index.html', redirect: true });
}

// ── Search ──
function doSearch() {
  const q = (document.getElementById('searchInput') || {}).value || '';
  const cat = (document.getElementById('searchCategory') || {}).value || '';
  const query = q.trim();

  Promise.all([
    cat === 'discussions' ? Promise.resolve([]) : fetchListings(cat, query, 100),
    !cat || cat === 'all' || cat === 'discussions' ? fetchDiscussions(query, 25) : Promise.resolve([]),
  ])
    .then(([listings, discussions]) => {
      if (window.renderSearchResults) {
        window.renderSearchResults(listings, query, cat, discussions);
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
  if (pageMain) return pageMain;

  const layout = document.querySelector('.page-layout');
  const firstColumn = layout ? layout.firstElementChild : null;
  if (firstColumn) return firstColumn;

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

async function fetchDiscussions(search = '', limit = 25) {
  const url = new URL(`${getApiBase()}/api/discussions`);
  if (search) url.searchParams.set('search', search);
  if (limit) url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Unable to load discussions');
  const data = await response.json();
  return data.discussions || [];
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

function getDefaultListingImageMarkup(category = 'other') {
  return `<span class="listing-default-image">${escapeHtml(getCategoryEmoji(category))}</span>`;
}

function listingToCard(listing) {
  const category = listing.category || 'other';
  const meta = getCategoryMeta(category);
  const image = Array.isArray(listing.images) && listing.images.length ? listing.images[0] : '';
  const thumb = image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title || 'Listing image')}">` : getDefaultListingImageMarkup(category);
  const subcategory = listing.subcategory ? `<span class="tag tag-blue">${escapeHtml(listing.subcategory)}</span>` : '';
  const availability = listing.availability ? `<span class="tag tag-green">${escapeHtml(listing.availability)}</span>` : '';
  const tags = Array.isArray(listing.tags)
    ? listing.tags.slice(0, 2).map(tag => `<span class="tag tag-gray">${escapeHtml(tag)}</span>`).join('')
    : '';
  const contact = listing.contactEmail ? `<span>${escapeHtml(listing.contactEmail)}</span>` : '';
  return `
    <a class="listing-card" data-cat="${escapeHtml(category)}" data-listing-id="${escapeHtml(listing.id || '')}" href="${getListingPageHref(listing.id || '')}">
      <div class="listing-thumb">${thumb}</div>
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
          ${availability}
          ${tags}
        </div>
      </div>
      <div class="listing-price">${escapeHtml(listing.price || 'Open')}</div>
    </a>
  `;
}

function getDiscussionPageHref(id) {
  const prefix = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/' ? 'pages' : '..';
  return `${prefix}/community/discussions.html?id=${encodeURIComponent(id)}`;
}

function discussionToSearchCard(discussion) {
  const body = String(discussion.body || '');
  const excerpt = body.length > 150 ? `${body.slice(0, 147)}...` : body;
  return `
    <a class="search-discussion-card" href="${getDiscussionPageHref(discussion.id || '')}">
      <div class="search-discussion-kicker">
        <span class="discussion-category">${escapeHtml(discussion.category || 'general')}</span>
        <span>Discussion</span>
      </div>
      <div class="search-discussion-title">${escapeHtml(discussion.title || 'Untitled discussion')}</div>
      <div class="search-discussion-body">${escapeHtml(excerpt || 'Open this topic to read the conversation.')}</div>
      <div class="search-discussion-meta">
        <span>Started by ${escapeHtml(discussion.authorName || 'Community member')}</span>
        <span>${Number(discussion.commentCount || 0)} comments</span>
        <span>${escapeHtml(formatListingDate(discussion.updatedAt || discussion.createdAt))}</span>
      </div>
    </a>
  `;
}

function renderListingComments(listing) {
  const comments = Array.isArray(listing.comments) ? listing.comments : [];
  const token = getBiscoonToken();
  const currentUserId = getCurrentUserIdFromToken();
  const isOwner = token && currentUserId && listing.userId === currentUserId;
  const topLevelComments = comments.filter(comment => !comment.parentId);
  const repliesByParent = comments.reduce((groups, comment) => {
    if (!comment.parentId) return groups;
    if (!groups[comment.parentId]) groups[comment.parentId] = [];
    groups[comment.parentId].push(comment);
    return groups;
  }, {});
  const renderReplyForm = comment => `
    <button class="reply-toggle" type="button" data-listing-reply-target="${escapeHtml(comment.id)}">Reply</button>
    <form class="reply-form" data-listing-reply-form="${escapeHtml(comment.id)}" data-listing-comment-form="${escapeHtml(listing.id || '')}">
      <textarea class="form-input" name="body" placeholder="Write a reply" required></textarea>
      <input type="hidden" name="parentId" value="${escapeHtml(comment.id)}" />
      <div class="listing-comment-actions">
        <button class="btn-primary" type="submit">Post reply</button>
        <button class="btn-ghost" type="button" data-cancel-listing-reply="${escapeHtml(comment.id)}">Cancel</button>
      </div>
    </form>
  `;
  const renderThreadReplies = (parentId, rootUserId, depth = 1) => {
    const replies = repliesByParent[parentId] || [];
    const canReplyInThread = token && currentUserId && (isOwner || currentUserId === rootUserId);
    return replies.map(reply => `
      <article class="listing-comment-card listing-comment-reply" style="--reply-depth:${Math.min(depth, 4)}">
        <div class="listing-comment-meta">
          <strong>${escapeHtml(reply.authorName || 'Community member')}</strong>
          <span>${escapeHtml(formatListingDate(reply.createdAt))}</span>
        </div>
        <div class="listing-comment-body">${escapeHtml(reply.body || '')}</div>
        ${canReplyInThread ? renderReplyForm(reply) : ''}
        ${renderThreadReplies(reply.id, rootUserId, depth + 1)}
      </article>
    `).join('');
  };
  return `
    <section class="listing-comments" data-listing-comments="${escapeHtml(listing.id || '')}">
      <div class="listing-comments-head">${comments.length} comment${comments.length === 1 ? '' : 's'}</div>
      <form class="listing-comment-form" data-listing-comment-form="${escapeHtml(listing.id || '')}">
        <label class="form-label" for="listingComment-${escapeHtml(listing.id || '')}">Add a comment</label>
        <textarea class="form-input" id="listingComment-${escapeHtml(listing.id || '')}" name="body" ${token ? '' : 'disabled'} required></textarea>
        <div class="listing-comment-actions">
          <button class="btn-primary" type="submit" ${token ? '' : 'disabled'}>Post comment</button>
          ${token ? '' : `<a class="discussion-login-link" href="${getRelativeAuthPath('login.html')}?redirect=${encodeURIComponent(getListingPageHref(listing.id || ''))}">Sign in to comment</a>`}
        </div>
      </form>
      <div class="listing-comment-list">
        ${topLevelComments.length ? topLevelComments.map(comment => {
          const canReplyInThread = token && currentUserId && (isOwner || currentUserId === comment.userId);
          return `
          <article class="listing-comment-card">
            <div class="listing-comment-meta">
              <strong>${escapeHtml(comment.authorName || 'Community member')}</strong>
              <span>${escapeHtml(formatListingDate(comment.createdAt))}</span>
            </div>
            <div class="listing-comment-body">${escapeHtml(comment.body || '')}</div>
            ${canReplyInThread ? renderReplyForm(comment) : ''}
            ${renderThreadReplies(comment.id, comment.userId)}
          </article>
        `;
        }).join('') : '<div class="listing-comments-empty">No comments yet.</div>'}
      </div>
    </section>
  `;
}

function getCurrentUserIdFromToken() {
  const token = getBiscoonToken();
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    return payload.id || '';
  } catch (error) {
    return '';
  }
}

async function postListingComment(listingId, body, parentId = '') {
  const token = getBiscoonToken();
  if (!token) {
    window.location.href = `${getRelativeAuthPath('login.html')}?redirect=${encodeURIComponent(getListingPageHref(listingId))}`;
    return;
  }

  const response = await fetch(`${getApiBase()}/api/listings/${encodeURIComponent(listingId)}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ body, parentId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to post comment.');
  window.dispatchEvent(new Event('biscoon:notifications-updated'));
  return data.listing;
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
  const gallery = Array.isArray(listing.images) && listing.images.length
    ? `<div class="listing-detail-gallery">${listing.images.map(image => `<img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title || 'Listing image')}">`).join('')}</div>`
    : `<div class="listing-detail-gallery">${getDefaultListingImageMarkup(listing.category || 'other')}</div>`;
  const contactPhone = listing.contactPhone
    ? `<a class="btn-ghost" href="tel:${escapeHtml(listing.contactPhone)}">${escapeHtml(listing.contactPhone)}</a>`
    : '';
  const externalLink = listing.externalLink
    ? `<a class="btn-ghost" href="${escapeHtml(listing.externalLink)}" target="_blank" rel="noopener">Open link</a>`
    : '';
  const token = getBiscoonToken();
  const currentUserId = getCurrentUserIdFromToken();
  const isOwner = token && currentUserId && listing.userId === currentUserId;
  const messageBtn = !isOwner && listing.userId
    ? `<button class="${token ? 'btn-primary' : 'btn-ghost'}" type="button" data-msg-listing-id="${escapeHtml(listing.id || '')}" data-msg-recipient-id="${escapeHtml(listing.userId)}" data-msg-listing-title="${escapeHtml(listing.title || '')}" onclick="window._openMsgModal(this)">✉️ Message Poster</button>`
    : '';
  const detailRows = [
    listing.locationType ? ['Location type', listing.locationType] : null,
    listing.availability ? ['Availability', listing.availability] : null,
    listing.priceNote ? ['Price note', listing.priceNote] : null,
    listing.contactPreference ? ['Contact preference', listing.contactPreference] : null,
    Array.isArray(listing.tags) && listing.tags.length ? ['Tags', listing.tags.join(', ')] : null,
  ].filter(Boolean).map(([label, value]) => `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`).join('');

  return `
    <div class="listing-detail-kicker">${meta.emoji} ${escapeHtml(meta.label)}</div>
    <h2 id="listingModalTitle">${escapeHtml(listing.title || 'Untitled listing')}</h2>
    ${gallery}
    <div class="listing-detail-meta">
      <span>📍 ${escapeHtml(listing.location || 'Remote / Flexible')}</span>
      <span>🕐 Posted ${escapeHtml(formatListingDate(listing.createdAt))}</span>
      ${listing.authorName ? `<span>👤 ${escapeHtml(listing.authorName)}</span>` : ''}
      ${listing.subcategory ? `<span>${escapeHtml(listing.subcategory)}</span>` : ''}
    </div>
    <div class="listing-detail-price">${escapeHtml(listing.price || 'Open')}</div>
    ${detailRows ? `<div class="listing-detail-meta">${detailRows}</div>` : ''}
    <p>${escapeHtml(listing.description || 'No description provided.')}</p>
    <div class="listing-detail-contact">${messageBtn}${contactPhone}${externalLink}</div>
    ${renderListingComments(listing)}
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

  document.addEventListener('submit', async function(e) {
    const form = e.target.closest('[data-listing-comment-form]');
    if (!form) return;
    e.preventDefault();
    const listingId = form.dataset.listingCommentForm;
    const textarea = form.querySelector('textarea');
    const parentId = form.querySelector('[name="parentId"]')?.value || '';
    const body = textarea ? textarea.value.trim() : '';
    if (!body) return;

    try {
      const listing = await postListingComment(listingId, body, parentId);
      const modalBody = document.getElementById('listingModalBody');
      if (modalBody && document.getElementById('listingModal')?.classList.contains('open')) {
        modalBody.innerHTML = renderListingModalContent(listing);
      } else {
        await hydrateListingDetail();
      }
    } catch (error) {
      alert(error.message);
    }
  });

  document.addEventListener('click', function(e) {
    const replyButton = e.target.closest('[data-listing-reply-target]');
    if (replyButton) {
      const form = document.querySelector(`[data-listing-reply-form="${CSS.escape(replyButton.dataset.listingReplyTarget)}"]`);
      document.querySelectorAll('[data-listing-reply-form].open').forEach(openForm => {
        if (openForm !== form) openForm.classList.remove('open');
      });
      if (form) form.classList.toggle('open');
      return;
    }

    const cancelButton = e.target.closest('[data-cancel-listing-reply]');
    if (cancelButton) {
      const form = document.querySelector(`[data-listing-reply-form="${CSS.escape(cancelButton.dataset.cancelListingReply)}"]`);
      if (form) form.classList.remove('open');
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const sendModal = document.getElementById('biscoonSendMsgModal');
      if (sendModal) { sendModal.remove(); return; }
      closeListingModal();
    }
  });
}

function renderListings(listings, target = getDynamicListingsContainer()) {
  if (!target) return;

  updateFilterChipsFromListings(listings);

  if (!listings.length) {
    target.dataset.dynamicState = 'empty';
    target.innerHTML = `
      <div class="empty-state">
        <div class="icon">${escapeHtml(getCategoryEmoji(inferPageCategory() || 'other'))}</div>
        <h3>No live listings yet</h3>
        <p>Be the first to add a real post for this section.</p>
        <a class="btn-primary" href="${getPostListingPath(inferPageCategory())}">Post a Listing</a>
      </div>
    `;
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

function formatDynamicChipLabel(value) {
  return String(value || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function updateFilterChipsFromListings(listings) {
  const group = document.querySelector('.filter-chips');
  if (!group || group.dataset.staticFilters === 'true') return;
  if (group.dataset.dynamicFiltersBuilt === 'true') return;

  const subcategories = Array.from(new Set(
    listings
      .map(listing => listing.subcategory)
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));

  const chips = [
    '<button class="chip active" data-filter="all">All</button>',
    ...subcategories.map(subcategory => {
      const count = listings.filter(listing => listing.subcategory === subcategory).length;
      return `<button class="chip" data-filter="${escapeHtml(subcategory)}">${escapeHtml(formatDynamicChipLabel(subcategory))} (${count})</button>`;
    }),
  ];

  group.innerHTML = chips.join('');
  group.dataset.dynamicFiltersBuilt = 'true';
  bindDynamicFilterChips();
}

function updateHeroStats(stats, category = inferPageCategory()) {
  const heroStats = document.querySelectorAll('.page-hero-stat');
  if (!heroStats.length) return;

  const normalizedCategory = normalizeCategoryForListings(category);
  const categoryCount = normalizedCategory ? stats.byCategory?.[normalizedCategory] || 0 : stats.total;

  heroStats.forEach(stat => {
    const numEl = stat.querySelector('.num');
    const labelEl = stat.querySelector('.lbl');
    if (!numEl || !labelEl) return;
    const currentLabel = labelEl.textContent.toLowerCase();
    if (currentLabel.includes('active listing') || currentLabel.includes('listings')) {
      numEl.textContent = formatCount(categoryCount);
      if (normalizedCategory) labelEl.textContent = `${getCategoryMeta(normalizedCategory).label} Listings`;
    } else if (currentLabel.includes('new this week') || currentLabel.includes('this week')) {
      numEl.textContent = formatCount(stats.week);
    } else if (currentLabel.includes('new today') || currentLabel.includes('today')) {
      numEl.textContent = formatCount(stats.today);
    } else if (currentLabel.includes('cities')) {
      numEl.textContent = formatCount(stats.cities);
    }
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

function renderSearchResults(listings, search = '', category = '', discussions = []) {
  const panel = document.getElementById('searchResultsPanel');
  const meta = document.getElementById('searchResultsMeta');
  const container = document.getElementById('searchResultsContainer');
  if (!panel || !meta || !container) {
    renderListings(listings);
    return;
  }

  panel.style.display = 'block';
  const queryText = search ? ` for "${search}"` : '';
  const categoryText = category && category !== 'all'
    ? ` in ${category === 'discussions' ? 'Discussions' : getCategoryMeta(category).label}`
    : '';
  const totalResults = listings.length + discussions.length;
  const listingText = listings.length === 1 ? '1 listing' : `${listings.length} listings`;
  const discussionText = discussions.length === 1 ? '1 discussion' : `${discussions.length} discussions`;
  meta.textContent = totalResults
    ? `Showing ${listingText} and ${discussionText}${queryText}${categoryText}.`
    : `No results found${queryText}${categoryText}. Try a broader keyword or different category.`;

  container.innerHTML = totalResults
    ? `${listings.map(listingToCard).join('')}${discussions.map(discussionToSearchCard).join('')}`
    : '<div class="search-results-empty">No matching listings or discussions. Adjust your search and try again.</div>';
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
    target.dataset.dynamicState = 'loading';
    target.innerHTML = `
      <div class="empty-state">
        <div class="icon">${escapeHtml(getCategoryEmoji(category || 'other'))}</div>
        <h3>Loading live listings...</h3>
      </div>
    `;
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = normalizeCategoryForListings(params.get('category') || '');
    const requestedSubcategory = params.get('subcategory') || getActiveChipFilter();
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

function getActiveChipFilter() {
  const activeChip = document.querySelector('.filter-chips .chip.active[data-filter]');
  const filter = activeChip ? activeChip.dataset.filter : '';
  return filter && filter !== 'all' ? filter : '';
}

function bindDynamicFilterChips() {
  document.querySelectorAll('.chip[data-filter]').forEach(chip => {
    if (chip.dataset.dynamicFilterBound) return;
    chip.dataset.dynamicFilterBound = 'true';
    chip.addEventListener('click', async function () {
      const group = this.closest('.filter-chips');
      if (group) group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');

      const target = getDynamicListingsContainer();
      if (!target) {
        filterListings(this.dataset.filter);
        return;
      }

      await hydrateDynamicListings(inferPageCategory());
    });
  });
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
    const gallery = Array.isArray(listing.images) && listing.images.length
      ? `<div class="listing-detail-gallery">${listing.images.map(image => `<img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title || 'Listing image')}">`).join('')}</div>`
      : `<div class="listing-detail-gallery">${getDefaultListingImageMarkup(listing.category || 'other')}</div>`;
    const externalLink = listing.externalLink
      ? `<a class="btn-ghost" href="${escapeHtml(listing.externalLink)}" target="_blank" rel="noopener">Open link</a>`
      : '';
    const detailToken = getBiscoonToken();
    const detailUserId = getCurrentUserIdFromToken();
    const isDetailOwner = detailToken && detailUserId && listing.userId === detailUserId;
    const detailMessageBtn = !isDetailOwner && listing.userId
      ? `<button class="${detailToken ? 'btn-primary' : 'btn-ghost'}" type="button" data-msg-listing-id="${escapeHtml(listing.id || '')}" data-msg-recipient-id="${escapeHtml(listing.userId)}" data-msg-listing-title="${escapeHtml(listing.title || '')}" onclick="window._openMsgModal(this)">✉️ Message Poster</button>`
      : '';
    const detailRows = [
      listing.locationType ? ['Location type', listing.locationType] : null,
      listing.availability ? ['Availability', listing.availability] : null,
      listing.priceNote ? ['Price note', listing.priceNote] : null,
      listing.contactPreference ? ['Contact preference', listing.contactPreference] : null,
      Array.isArray(listing.tags) && listing.tags.length ? ['Tags', listing.tags.join(', ')] : null,
    ].filter(Boolean).map(([label, value]) => `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`).join('');
    target.innerHTML = `
      <article class="listing-detail-card">
        <div class="listing-detail-kicker">${meta.emoji} ${escapeHtml(meta.label)}</div>
        <h1>${escapeHtml(listing.title || 'Untitled listing')}</h1>
        ${gallery}
        <div class="listing-detail-meta">
          <span>📍 ${escapeHtml(listing.location || 'Remote / Flexible')}</span>
          <span>🕐 Posted ${escapeHtml(formatListingDate(listing.createdAt))}</span>
          ${listing.authorName ? `<span>👤 ${escapeHtml(listing.authorName)}</span>` : ''}
          ${listing.subcategory ? `<span>${escapeHtml(listing.subcategory)}</span>` : ''}
        </div>
        <div class="listing-detail-price">${escapeHtml(listing.price || 'Open')}</div>
        ${detailRows ? `<div class="listing-detail-meta">${detailRows}</div>` : ''}
        <p>${escapeHtml(listing.description || 'No description provided.')}</p>
        <div class="listing-detail-contact">
          ${detailMessageBtn}
          ${listing.contactPhone ? `<a class="btn-ghost" href="tel:${escapeHtml(listing.contactPhone)}">${escapeHtml(listing.contactPhone)}</a>` : ''}
          ${externalLink}
        </div>
        ${renderListingComments(listing)}
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

  bindDynamicFilterChips();
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

// ── Message Poster button handler ──
window._openMsgModal = function(btn) {
  const listingId = btn.dataset.msgListingId || '';
  const recipientId = btn.dataset.msgRecipientId || '';
  const listingTitle = btn.dataset.msgListingTitle || '';
  if (!getBiscoonToken()) {
    window.location.href = getLoginPath(window.location.href);
    return;
  }
  biscoonOpenSendMessageModal({ listingId, recipientId, listingTitle });
};

function biscoonOpenSendMessageModal({ listingId, recipientId, listingTitle }) {
  const existing = document.getElementById('biscoonSendMsgModal');
  if (existing) existing.remove();

  function esc(v) { return escapeHtml(v); }
  const modal = document.createElement('div');
  modal.id = 'biscoonSendMsgModal';
  modal.className = 'messages-send-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="position:absolute;inset:0;background:rgba(0,0,0,.45)" id="biscoonSendMsgBackdrop"></div>
    <div style="position:relative;z-index:1;background:white;border-radius:12px;padding:28px;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,.18);margin:0 16px" role="dialog" aria-modal="true">
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;color:var(--navy);margin-bottom:6px">Message Poster</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:18px">About: ${esc(listingTitle || 'this listing')}</p>
      <div id="biscoonSendMsgError" style="display:none;font-size:13px;color:var(--red);margin-bottom:10px"></div>
      <textarea id="biscoonSendMsgBody" placeholder="Write your message…" rows="4" style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:12px;font-size:14px;font-family:inherit;resize:vertical;min-height:90px;outline:none;margin-bottom:14px;transition:border-color .15s"></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn-ghost" type="button" id="biscoonSendMsgCancel">Cancel</button>
        <button class="btn-primary" type="button" id="biscoonSendMsgSubmit">Send Message</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => { const m = document.getElementById('biscoonSendMsgModal'); if (m) m.remove(); };
  document.getElementById('biscoonSendMsgBackdrop').addEventListener('click', closeModal);
  document.getElementById('biscoonSendMsgCancel').addEventListener('click', closeModal);

  const textarea = document.getElementById('biscoonSendMsgBody');
  if (textarea) textarea.focus();

  document.getElementById('biscoonSendMsgSubmit').addEventListener('click', async function() {
    const body = (document.getElementById('biscoonSendMsgBody')?.value || '').trim();
    const errEl = document.getElementById('biscoonSendMsgError');
    if (!body) { if (errEl) { errEl.textContent = 'Please write a message.'; errEl.style.display = ''; } return; }
    this.disabled = true;
    this.textContent = 'Sending…';
    try {
      const token = getBiscoonToken();
      const response = await fetch(`${getApiBase()}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listingId, recipientId, body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to send message.');
      closeModal();
      window.location.href = `${getRelativeAuthPath('messages.html')}?id=${encodeURIComponent(data.conversationId)}`;
    } catch (err) {
      if (errEl) { errEl.textContent = err.message; errEl.style.display = ''; }
      this.disabled = false;
      this.textContent = 'Send Message';
    }
  });
}
