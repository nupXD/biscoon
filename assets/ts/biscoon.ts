/* ═══════════════════════════════════════════════
   BISCOON.TS — Shared TypeScript
   The Global Nepali Ecosystem
═══════════════════════════════════════════════ */

// ── Interfaces ──

interface BiscoonComment {
  id: string;
  authorName: string;
  body: string;
  parentId?: string;
  userId?: string;
  createdAt: string;
}

interface Listing {
  id: string;
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  location?: string;
  locationType?: string;
  price?: string;
  priceNote?: string;
  availability?: string;
  images?: string[];
  tags?: string[];
  comments?: BiscoonComment[];
  contactEmail?: string;
  contactPhone?: string;
  contactPreference?: string;
  externalLink?: string;
  authorName?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  savedByMe?: boolean;
  existingConversationId?: string;
}

interface Discussion {
  id: string;
  title: string;
  body?: string;
  category: string;
  authorName: string;
  commentCount?: number;
  comments?: BiscoonComment[];
  tags?: string[];
  updatedAt?: string;
  createdAt?: string;
}

interface HeroSpotlight {
  id: string;
  title: string;
  subtitle?: string;
  body?: string;
  badgeText?: string;
  badgeColor?: string;
  imageUrl: string;
  ctaText?: string;
  ctaUrl?: string;
  type?: string;
}

interface ListingStats {
  total: number;
  week: number;
  today: number;
  cities: number;
  byCategory?: Record<string, number>;
}

interface WeatherCoords {
  lat: number;
  lon: number;
  city: string;
}

interface WeatherWidgetParams {
  icon: string;
  temp: string;
  condition: string;
  city: string;
  humidity: string;
  wind: string;
  high: string;
  low: string;
}

interface EndSessionOptions {
  redirect?: boolean;
  destination?: string;
}

interface MessagePosterParams {
  listingId: string;
  recipientId: string;
  listingTitle: string;
  token: string;
  isOwner: boolean;
  conversationId: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  type?: string;
}

// ── Global Window extensions ──

interface Window {
  doSearch: () => void;
  clearSearch: () => void;
  checkAuthState: () => void;
  biscoonSession: {
    start: (token: string) => void;
    end: (options?: EndSessionOptions) => void;
    getToken: () => string;
    touch: (force?: boolean) => void;
  };
  renderSearchResults?: (listings: Listing[], search: string, category: string, discussions: Discussion[]) => void;
  renderListings?: (listings: Listing[]) => void;
  _openMsgModal: (btn: HTMLElement) => void;
}

// ── Mobile menu ──
function toggleMenu(): void {
  const d = document.getElementById('mobileDrawer') as HTMLElement;
  const h = document.getElementById('hamburger') as HTMLElement;
  const isOpen = d.classList.toggle('open');
  h.classList.toggle('open');
  h.setAttribute('aria-expanded', String(isOpen));
}

function closeMobileMenu(): void {
  const d = document.getElementById('mobileDrawer');
  const h = document.getElementById('hamburger');
  if (!d) return;
  d.classList.remove('open');
  if (h) { h.classList.remove('open'); h.setAttribute('aria-expanded', 'false'); }
}

const BISCOON_TOKEN_KEY = 'biscoonToken';
const BISCOON_LAST_ACTIVITY_KEY = 'biscoonLastActivity';
const BISCOON_SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const BISCOON_ACTIVITY_THROTTLE_MS = 60 * 1000;
let biscoonLastActivityWrite = 0;

function getSessionLastActivity(): number {
  const lastActivity = Number(localStorage.getItem(BISCOON_LAST_ACTIVITY_KEY));
  return Number.isFinite(lastActivity) ? lastActivity : 0;
}

function hasSessionExpired(): boolean {
  const token = localStorage.getItem(BISCOON_TOKEN_KEY);
  if (!token) return false;

  const lastActivity = getSessionLastActivity();
  if (!lastActivity) {
    localStorage.setItem(BISCOON_LAST_ACTIVITY_KEY, String(Date.now()));
    return false;
  }

  return Date.now() - lastActivity > BISCOON_SESSION_TIMEOUT_MS;
}

// ── Toast messages ──

function biscoonToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  if (!message) return;
  let host = document.getElementById('biscoonToastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'biscoonToastHost';
    host.className = 'biscoon-toast-host';
    document.body.appendChild(host);
  }
  const item = document.createElement('div');
  item.className = `biscoon-toast biscoon-toast-${type}`;
  item.textContent = message;
  host.appendChild(item);
  requestAnimationFrame(() => item.classList.add('show'));
  window.setTimeout(() => {
    item.classList.remove('show');
    window.setTimeout(() => item.remove(), 200);
  }, type === 'error' ? 5000 : 3400);
}

function getBiscoonToken(): string {
  if (hasSessionExpired()) {
    endBiscoonSession({ redirect: shouldRedirectAfterSessionEnd() });
    return '';
  }
  return localStorage.getItem(BISCOON_TOKEN_KEY) || '';
}

function startBiscoonSession(token: string): void {
  if (!token) return;
  localStorage.setItem(BISCOON_TOKEN_KEY, token);
  localStorage.setItem(BISCOON_LAST_ACTIVITY_KEY, String(Date.now()));
  biscoonLastActivityWrite = Date.now();
  window.dispatchEvent(new Event('biscoon:session-changed'));
}

function touchBiscoonSession(force = false): void {
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

function shouldRedirectAfterSessionEnd(): boolean {
  return window.location.pathname.endsWith('/pages/auth/profile.html')
    || window.location.pathname.endsWith('/pages/post/listing.html');
}

function getCurrentPathWithQuery(): string {
  return window.location.pathname + window.location.search + window.location.hash;
}

function endBiscoonSession(options: EndSessionOptions = {}): void {
  const { redirect = false, destination = '' } = options;
  localStorage.removeItem(BISCOON_TOKEN_KEY);
  localStorage.removeItem(BISCOON_LAST_ACTIVITY_KEY);

  if (redirect) {
    window.location.href = destination || getLoginPath(getCurrentPathWithQuery());
    return;
  }

  if (typeof checkAuthState === 'function') checkAuthState();
}

function bindBiscoonSessionActivity(): void {
  ['click', 'keydown', 'pointerdown', 'touchstart', 'scroll'].forEach(eventName => {
    window.addEventListener(eventName, () => touchBiscoonSession(), { passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) touchBiscoonSession(true);
  });

  window.addEventListener('storage', (event: StorageEvent) => {
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

function biscoonScriptUrl(relativePath: string): string {
  const script = document.querySelector('script[src$="assets/js/biscoon.js"], script[src$="biscoon.js"]') as HTMLScriptElement | null;
  return script?.src ? new URL(relativePath, script.src).toString() : relativePath;
}

function loadBiscoonPlugin(name: string): void {
  if (document.querySelector(`script[data-biscoon-plugin="${name}"]`)) return;
  const script = document.createElement('script');
  script.src = biscoonScriptUrl(`plugins/${name}.js`);
  script.defer = true;
  script.dataset.biscoonPlugin = name;
  document.head.appendChild(script);
}

function loadEnhancementPlugins(): void {
  if (document.querySelector('meta[name="biscoon-sentry-dsn"]') || (window as any).BISCOON_SENTRY_DSN) {
    loadBiscoonPlugin('error-monitor');
  }
  loadBiscoonPlugin('search-autocomplete');
  if (getBiscoonToken()) loadBiscoonPlugin('realtime-notifications');
  // Load on every page — the plugin's MutationObserver picks up [data-pswp-gallery]
  // elements dynamically (e.g. when a listing modal opens), so it's safe everywhere.
  loadBiscoonPlugin('listing-lightbox');
  if (document.getElementById('listingDetail')) {
    loadBiscoonPlugin('listing-map');
  }
  if (/\/community\/events\.html$/.test(window.location.pathname)) {
    loadBiscoonPlugin('events-calendar');
  }
}

function getRelativeNewsPath(): string {
  return '/pages/news/index.html';
}

function getRelativeDonatePath(): string {
  return '/pages/donate.html';
}

function ensureDonateNavLink(): void {
  const donatePath = getRelativeDonatePath();
  document.querySelectorAll('#navCtas').forEach(ctas => {
    if (ctas.querySelector('.donate-nav-link, .hbtn.donate')) return;
    const a = document.createElement('a');
    a.href = donatePath;
    a.className = 'btn-ghost hbtn donate donate-nav-link';
    a.textContent = 'Donate';
    const ghost = ctas.querySelector('.hbtn.ghost, .btn-ghost');
    ghost ? ctas.insertBefore(a, ghost) : ctas.prepend(a);
  });
  document.querySelectorAll('.mobile-drawer').forEach(drawer => {
    if (drawer.querySelector('.donate-nav-link, a[href$="donate.html"]')) return;
    const a = document.createElement('a');
    a.href = donatePath;
    a.className = 'donate-nav-link';
    a.textContent = 'Donate';
    const authButtons = drawer.querySelector('.mobile-drawer-btns');
    if (authButtons) drawer.insertBefore(a, authButtons);
    else drawer.appendChild(a);
  });
}

function ensureNewsNavLink(): void {
  const newsPath = getRelativeNewsPath();
  document.querySelectorAll('.nav-links').forEach(nav => {
    if (nav.querySelector('.news-nav-link')) return;
    const a = document.createElement('a');
    a.href = newsPath;
    a.className = 'news-nav-link';
    a.textContent = 'News';
    const discussions = Array.from(nav.querySelectorAll('a')).find(link => /discussions/i.test(link.textContent || ''));
    discussions ? nav.insertBefore(a, discussions) : nav.appendChild(a);
  });

  document.querySelectorAll('.mobile-drawer').forEach(drawer => {
    if (drawer.querySelector('.news-nav-link')) return;
    const a = document.createElement('a');
    a.href = newsPath;
    a.className = 'news-nav-link';
    a.textContent = 'News';
    const discussions = Array.from(drawer.querySelectorAll('a')).find(link => /discussions/i.test(link.textContent || ''));
    const authButtons = drawer.querySelector('.mobile-drawer-btns');
    if (discussions) drawer.insertBefore(a, discussions);
    else if (authButtons) drawer.insertBefore(a, authButtons);
    else drawer.appendChild(a);
  });
}

function animateCounterEl(el: HTMLElement): void {
  const original = el.textContent?.trim() || '';
  const match = original.match(/^([\d.]+)(.*?)$/);
  if (!match) return;
  const target = parseFloat(match[1]);
  if (!target) return;
  const isFloat = match[1].includes('.');
  const suffix = match[2] || '';
  const duration = 1100;
  const startTime = performance.now();
  function tick(now: number): void {
    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const current = target * eased;
    el.textContent = (isFloat ? current.toFixed(1) : Math.round(current).toString()) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function initCounterAnimation(): void {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target as HTMLElement;
      if (el.dataset.counted) return;
      el.dataset.counted = 'true';
      io.unobserve(el);
      animateCounterEl(el);
    });
  }, { threshold: 0.7 });
  document.querySelectorAll<HTMLElement>('.stat-num, .hmap-num').forEach(el => io.observe(el));
}

function initScrollReveal(): void {
  if (!('IntersectionObserver' in window)) return;

  const catSection = document.querySelector<HTMLElement>('.cat-section');
  if (catSection) {
    catSection.classList.add('animate-ready');
    const catIo = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        catSection.classList.add('is-revealed');
        catIo.disconnect();
      }
    }, { threshold: 0.08 });
    catIo.observe(catSection);
  }

  const revealTargets = [
    '.journal-section', '.heatmap-section', '.fb-grid',
    '.cal-section', '.home-cta',
  ];
  const revealIo = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        revealIo.unobserve(entry.target);
      }
    });
  }, { threshold: 0.07, rootMargin: '-20px 0px' });

  revealTargets.forEach(sel => {
    document.querySelectorAll<HTMLElement>(sel).forEach(el => {
      el.classList.add('reveal-section');
      revealIo.observe(el);
    });
  });
}

function initScrollProgress(): void {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.prepend(bar);
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) { ticking = false; return; }
      const pct = Math.min(100, (scrollTop / docHeight) * 100);
      bar.style.width = pct + '%';
      bar.classList.toggle('visible', scrollTop > 60);
      ticking = false;
    });
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', function () {
  loadEnhancementPlugins();
  ensureNewsNavLink();
  ensureDonateNavLink();
  initScrollProgress();
  document.getElementById('hamburger')?.addEventListener('click', toggleMenu);

  document.addEventListener('click', function (e: MouseEvent) {
    const d = document.getElementById('mobileDrawer');
    const h = document.getElementById('hamburger');
    const target = e.target as Node;
    if (d && h && !d.contains(target) && !h.contains(target)) {
      closeMobileMenu();
    }
    // Close drawer when a nav link inside it is clicked
    const anchorTarget = e.target as HTMLElement;
    if (d && d.contains(target) && anchorTarget.closest('a[href]')) {
      closeMobileMenu();
    }
  });

  // Escape key: close dropdown and mobile drawer
  document.addEventListener('keydown', function (e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    closeMobileMenu();
    document.querySelectorAll('.user-btn.open').forEach(btn => {
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      const menu = btn.closest('.user-dropdown')?.querySelector('.dropdown-menu');
      if (menu) menu.classList.remove('open');
    });
  });

  // ── Mark active nav link ──
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-drawer a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === currentPage || (currentPage === 'index.html' && href === './') || href.includes(currentPage)) {
      a.classList.add('active');
    }
  });

  // ── Search button + clear button + enter key ──
  const searchBtn = document.querySelector('.search-btn');
  if (searchBtn) searchBtn.addEventListener('click', doSearch);
  const clearBtn = document.getElementById('clearSearchBtn');
  if (clearBtn) clearBtn.addEventListener('click', clearSearch);
  const si = document.getElementById('searchInput') as HTMLInputElement | null;
  if (si && !si.closest('form')) si.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') doSearch() });
  document.querySelectorAll('.nav-search').forEach(form => {
    form.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const navInput = (form as HTMLFormElement).querySelector('.nav-search-input') as HTMLInputElement | null;
      const query = navInput ? navInput.value.trim() : '';
      if (!query) return;
      if (document.getElementById('searchResultsPanel')) {
        const mainInput = document.getElementById('searchInput') as HTMLInputElement | null;
        if (mainInput) mainInput.value = query;
        doSearch();
        return;
      }
      // Prefer in-page listing search when already on a browse page
      const pageSearch = document.getElementById('searchInput') as HTMLInputElement | null;
      if (pageSearch && document.getElementById('listingsFeed')) {
        pageSearch.value = query;
        pageSearch.dispatchEvent(new Event('input', { bubbles: true }));
        hydrateDynamicListings(inferPageCategory(), { page: 1, append: false });
        pageSearch.focus();
        return;
      }
      const logo = document.querySelector('.nav-logo') as HTMLAnchorElement | null;
      const home = new URL(logo?.getAttribute('href') || 'index.html', window.location.href);
      const jobsUrl = new URL('pages/jobs/jobs.html', home);
      jobsUrl.searchParams.set('q', query);
      window.location.href = jobsUrl.href;
    });
  });

  // Home dashboard: click/touch dropdowns (hover alone fails on mobile)
  document.querySelectorAll('.right-panel .dropdown').forEach(dd => {
    const original = dd.querySelector('.pill');
    if (!original) return;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = original.className;
    trigger.setAttribute('style', original.getAttribute('style') || '');
    trigger.innerHTML = original.innerHTML;
    trigger.setAttribute('aria-expanded', 'false');
    const menu = dd.querySelector<HTMLElement>('.dd-menu');
    if (menu) {
      menu.id = `home-menu-${Array.from(dd.parentElement!.children).indexOf(dd)}`;
      trigger.setAttribute('aria-controls', menu.id);
    }
    original.replaceWith(trigger);
    const closeMenus = () => {
      document.querySelectorAll('.right-panel .dropdown.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.pill')?.setAttribute('aria-expanded', 'false');
      });
    };
    trigger.addEventListener('click', (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const open = dd.classList.contains('open');
      closeMenus();
      if (!open) { dd.classList.add('open'); trigger.setAttribute('aria-expanded', 'true'); }
    });
    dd.addEventListener('keydown', (event: Event) => {
      const e = event as KeyboardEvent;
      if (e.key === 'Escape') { closeMenus(); trigger.focus(); }
      if (e.key === 'ArrowDown' && e.target === trigger) {
        e.preventDefault(); closeMenus(); dd.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true'); menu?.querySelector('a')?.focus();
      }
    });
    dd.addEventListener('focusout', (event: Event) => {
      if (!dd.contains((event as FocusEvent).relatedTarget as Node)) closeMenus();
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.right-panel .dropdown.open').forEach(el => {
      el.classList.remove('open'); el.querySelector('.pill')?.setAttribute('aria-expanded', 'false');
    });
  });

  // Live header date on homepage
  const hdrDate = document.getElementById('hdrDate');
  if (hdrDate) {
    const now = new Date();
    const western = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', weekday: 'long' });
    hdrDate.innerHTML = `📅 ${western}`;
  }

  initHomeInlineFeed();
  void initHomeRecentPosts();
  initHomeNewsTicker();
  initHomeNews();

  // ── Geolocation ──
  const changeLocBtn = document.getElementById('changeLocation');
  if (changeLocBtn) {
    changeLocBtn.addEventListener('click', function (e: Event) {
      e.preventDefault();
      const loading = document.getElementById('locationLoading');
      const cond = document.getElementById('weatherCondition');
      if (loading) { loading.textContent = ' · Detecting…'; loading.style.display = 'inline'; }
      if (cond) cond.textContent = 'Updating…';
      detectLocationAndWeather(true).finally(() => {
        if (loading) loading.style.display = 'none';
      });
    });
  }

  // ── Heatmap ──
  buildHeatmap();

  // ── Filter chips ──
  bindDynamicFilterChips();
  bindSortSelect();

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

  // ── Weather + live FX info bar ──
  initHomeInfoBar();

  // ── Announcement banner ──
  checkSiteAnnouncement();

  // ── Hero Spotlight ──
  initHeroSpotlight();

  // ── Counter animation + scroll reveals ──
  initCounterAnimation();
  initScrollReveal();

  // ── Auto-run search from URL param (e.g. redirected from inner page) ──
  const urlSearch = new URLSearchParams(window.location.search).get('search');
  if (urlSearch) {
    const mainInput = document.getElementById('searchInput') as HTMLInputElement | null;
    if (mainInput) mainInput.value = urlSearch;
    doSearch();
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e: MouseEvent) {
    document.querySelectorAll('#userDropdown').forEach(dropdown => {
      const menu = dropdown.querySelector('#dropdownMenu');
      const btn = dropdown.querySelector('#userBtn');
      if (menu && btn && !dropdown.contains(e.target as Node)) {
        btn.classList.remove('open');
        menu.classList.remove('open');
      }
    });
  });
});

// ── Weather ──
const WMO_CODES: Record<number, { label: string; emoji: string }> = {
  0:  { label: 'Clear Sky',          emoji: '☀️'  },
  1:  { label: 'Mainly Clear',       emoji: '🌤️' },
  2:  { label: 'Partly Cloudy',      emoji: '⛅'  },
  3:  { label: 'Overcast',           emoji: '☁️'  },
  45: { label: 'Foggy',              emoji: '🌫️' },
  48: { label: 'Icy Fog',            emoji: '🌫️' },
  51: { label: 'Light Drizzle',      emoji: '🌦️' },
  53: { label: 'Drizzle',            emoji: '🌦️' },
  55: { label: 'Heavy Drizzle',      emoji: '🌧️' },
  61: { label: 'Light Rain',         emoji: '🌧️' },
  63: { label: 'Rain',               emoji: '🌧️' },
  65: { label: 'Heavy Rain',         emoji: '🌧️' },
  66: { label: 'Freezing Rain',      emoji: '🌨️' },
  67: { label: 'Heavy Freezing Rain',emoji: '🌨️' },
  71: { label: 'Light Snow',         emoji: '🌨️' },
  73: { label: 'Snow',               emoji: '🌨️' },
  75: { label: 'Heavy Snow',         emoji: '❄️'  },
  77: { label: 'Snow Grains',        emoji: '❄️'  },
  80: { label: 'Light Showers',      emoji: '🌦️' },
  81: { label: 'Showers',            emoji: '🌦️' },
  82: { label: 'Heavy Showers',      emoji: '🌧️' },
  85: { label: 'Snow Showers',       emoji: '🌨️' },
  86: { label: 'Heavy Snow Showers', emoji: '🌨️' },
  95: { label: 'Thunderstorm',       emoji: '⛈️'  },
  96: { label: 'Thunderstorm',       emoji: '⛈️'  },
  99: { label: 'Thunderstorm + Hail',emoji: '⛈️'  },
};

function windDegreesToCardinal(deg: number): string {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function updateWeatherWidget({ icon, temp, condition, city, humidity, wind, high, low }: WeatherWidgetParams): void {
  const set = (id: string, val: string, clearStyle?: boolean) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    if (clearStyle) el.removeAttribute('style');
  };
  set('weatherIcon', icon);
  set('weatherTemp', temp, true);
  set('weatherCondition', condition);
  set('weatherCity', city);
  set('weatherHumidity', humidity);
  set('weatherWind', wind);
  set('weatherHighLow', high + ' / ' + low);
  const header = document.getElementById('weatherHeader');
  if (header) header.textContent = '🌤 ' + city.split(',')[0].trim() + ' Weather';
}

const WEATHER_CACHE_KEY = 'biscoonWeatherCache';

function cacheWeatherSnapshot(params: WeatherWidgetParams): void {
  try {
    sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ ...params, at: Date.now() }));
  } catch {
    // ignore quota / private mode
  }
}

function restoreCachedWeather(): boolean {
  try {
    const raw = sessionStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return false;
    const cached = JSON.parse(raw) as WeatherWidgetParams & { at?: number };
    if (!cached?.temp || !cached?.condition) return false;
    if (cached.at && Date.now() - cached.at > 3 * 60 * 60 * 1000) return false;
    updateWeatherWidget(cached);
    return true;
  } catch {
    return false;
  }
}

function showWeatherUnavailable(): void {
  if (restoreCachedWeather()) return;
  const icon = document.getElementById('weatherIcon');
  const temp = document.getElementById('weatherTemp');
  const cond = document.getElementById('weatherCondition');
  if (icon) icon.textContent = '⛅';
  if (temp) {
    temp.textContent = '—';
    temp.removeAttribute('style');
  }
  if (cond) cond.textContent = 'Unavailable · tap location to retry';
}

async function fetchWeatherForCoords(lat: number, lon: number, cityLabel: string): Promise<void> {
  const url = new URL(`${getApiBase()}/api/weather`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('city', cityLabel);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Weather API error');
  const w = data.weather || {};

  const snapshot: WeatherWidgetParams = {
    icon: String(w.icon || '⛅'),
    temp: String(w.temp || '—'),
    condition: String(w.condition || 'Unknown'),
    city: String(w.city || cityLabel),
    humidity: String(w.humidity || '—'),
    wind: String(w.wind || '—'),
    high: String(w.high || '—'),
    low: String(w.low || '—'),
  };
  updateWeatherWidget(snapshot);
  cacheWeatherSnapshot(snapshot);
}

const KTM_COORDS = { lat: 27.7172, lon: 85.3240, city: 'Kathmandu' };

async function loadKathmanduWeather(): Promise<void> {
  const icon = document.getElementById('ktmWeatherIcon');
  const temp = document.getElementById('ktmWeatherTemp');
  const cond = document.getElementById('ktmWeatherCondition');
  if (!icon && !temp && !cond) return;
  try {
    const url = new URL(`${getApiBase()}/api/weather`);
    url.searchParams.set('lat', String(KTM_COORDS.lat));
    url.searchParams.set('lon', String(KTM_COORDS.lon));
    url.searchParams.set('city', KTM_COORDS.city);
    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Weather unavailable');
    const w = data.weather || {};
    if (icon) icon.textContent = String(w.icon || '🌦');
    if (temp) temp.textContent = String(w.temp || '—');
    if (cond) cond.textContent = String(w.condition || '—');
  } catch {
    if (temp) temp.textContent = '—';
    if (cond) cond.textContent = 'Unavailable';
  }
}

const FOREX_PREV_KEY = 'biscoonForexPrev';
const INFO_BAR_FX = ['USD', 'GBP', 'AUD', 'CAD', 'EUR', 'QAR'] as const;

function applyInfoBarForex(rates: Array<{ sym: string; rate: number | null }>, updatedAt?: number | string): void {
  let prev: Record<string, number> = {};
  try {
    prev = JSON.parse(localStorage.getItem(FOREX_PREV_KEY) || '{}') || {};
  } catch {
    prev = {};
  }
  const next: Record<string, number> = { ...prev };

  INFO_BAR_FX.forEach(sym => {
    const row = document.querySelector(`[data-fx="${sym}"]`);
    if (!row) return;
    const rateEl = row.querySelector('[data-fx-rate]') as HTMLElement | null;
    const chgEl = row.querySelector('[data-fx-chg]') as HTMLElement | null;
    const hit = rates.find(r => r.sym === sym);
    if (!hit || hit.rate == null || !rateEl) return;
    const rate = Number(hit.rate);
    rateEl.textContent = rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    next[sym] = rate;
    if (!chgEl) return;
    const prior = Number(prev[sym]);
    if (!prior || !Number.isFinite(prior) || prior === rate) {
      chgEl.hidden = true;
      chgEl.textContent = '';
      chgEl.classList.remove('ib-up', 'ib-dn');
      return;
    }
    const pct = ((rate - prior) / prior) * 100;
    const up = pct >= 0;
    chgEl.hidden = false;
    chgEl.classList.toggle('ib-up', up);
    chgEl.classList.toggle('ib-dn', !up);
    chgEl.textContent = `${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`;
  });

  try {
    localStorage.setItem(FOREX_PREV_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }

  const stamp = document.getElementById('fxUpdatedAt');
  if (stamp && updatedAt) {
    const d = new Date(typeof updatedAt === 'number' ? updatedAt : updatedAt);
    if (!Number.isNaN(d.getTime())) {
      stamp.textContent = `Live · updated ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
  }
}

async function loadInfoBarForex(): Promise<void> {
  if (!document.querySelector('[data-fx]')) return;
  try {
    const res = await fetch(`${getApiBase()}/api/market`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.forex)) {
      applyInfoBarForex(data.forex, data.updatedAt);
    }
  } catch {
    // keep last-rendered values
  }
}

async function initHomeInfoBar(): Promise<void> {
  if (!document.body.classList.contains('is-home')) return;
  await Promise.all([
    loadWeather(),
    loadKathmanduWeather(),
    loadInfoBarForex(),
  ]);
  setInterval(() => {
    void loadWeather();
    void loadKathmanduWeather();
    void loadInfoBarForex();
  }, 60_000);
}

const WEATHER_DEFAULT: WeatherCoords = { lat: 42.3601, lon: -71.0589, city: 'Boston, Massachusetts' };

interface IpGeoResult {
  lat: number | null;
  lon: number | null;
  city: string;
}

const USER_GEO_CACHE_KEY = 'biscoonUserGeo';
let ipGeoPromise: Promise<IpGeoResult> | null = null;

function readCachedGeo(): IpGeoResult | null {
  try {
    const raw = sessionStorage.getItem(USER_GEO_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCachedGeo(result: IpGeoResult): void {
  try {
    sessionStorage.setItem(USER_GEO_CACHE_KEY, JSON.stringify(result));
  } catch {
    // sessionStorage unavailable (private browsing, etc.) — non-fatal
  }
}

// Detects the visitor's approximate city via IP geolocation. Cached per tab session so
// every page that wants to rank content by location (listings, discussions) doesn't
// re-hit the geolocation API on every fetch. Empty city on failure — callers must treat
// "unknown" as "don't rank by location", never guess or default to a specific place.
async function fetchIpGeo(forceRefresh = false): Promise<IpGeoResult> {
  if (!forceRefresh) {
    const cached = readCachedGeo();
    if (cached) return cached;
    if (ipGeoPromise) return ipGeoPromise;
  }

  ipGeoPromise = (async () => {
    let result: IpGeoResult = { lat: null, lon: null, city: '' };
    try {
      const geo = await Promise.race([
        fetch('https://ipapi.co/json/').then(r => r.json()),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
      ]) as any;
      if (geo && geo.city) {
        const region = geo.region || geo.region_code || '';
        result = {
          lat: typeof geo.latitude === 'number' ? geo.latitude : null,
          lon: typeof geo.longitude === 'number' ? geo.longitude : null,
          city: geo.city + (region ? ', ' + region : ''),
        };
      }
    } catch {
      // Location detection failed — result stays empty, callers fall back on their own defaults
    }
    writeCachedGeo(result);
    return result;
  })();

  return ipGeoPromise;
}

async function getUserLocationCity(): Promise<string> {
  const geo = await fetchIpGeo();
  return geo.city;
}

async function detectLocationAndWeather(forceRefresh = false): Promise<void> {
  const geo = await fetchIpGeo(forceRefresh);
  const coords: WeatherCoords = (geo.city && geo.lat !== null && geo.lon !== null)
    ? { lat: geo.lat, lon: geo.lon, city: geo.city }
    : WEATHER_DEFAULT;

  if (geo.city) {
    const el = document.getElementById('cityName');
    if (el) el.textContent = geo.city;
  }

  // Always attempt to fetch weather, even on location failure
  try {
    await fetchWeatherForCoords(coords.lat, coords.lon, coords.city);
  } catch {
    showWeatherUnavailable();
  }
}

async function loadWeather(): Promise<void> {
  if (!document.getElementById('weatherWidget')) return;
  await detectLocationAndWeather();
}

// ── Announcement banner ──
async function checkSiteAnnouncement(): Promise<void> {
  const DISMISS_KEY = 'biscoonDismissedAnnouncement';
  try {
    const res = await fetch('/api/announcements/active');
    if (!res.ok) return;
    const { announcement }: { announcement: Announcement | null } = await res.json();
    if (!announcement) return;
    if (sessionStorage.getItem(DISMISS_KEY) === announcement.id) return;

    const nav = document.querySelector('nav');
    if (!nav) return;

    const typeClass = `site-banner-${announcement.type || 'info'}`;
    const banner = document.createElement('div');
    banner.className = `site-banner ${typeClass}`;
    banner.id = 'siteBanner';
    banner.innerHTML = `
      <span class="site-banner-text">
        <span class="site-banner-title">${escapeHtml(announcement.title)}</span>${escapeHtml(announcement.body)}
      </span>
      <button class="site-banner-close" aria-label="Dismiss">×</button>`;
    nav.insertAdjacentElement('afterend', banner);

    (banner.querySelector('.site-banner-close') as HTMLButtonElement).addEventListener('click', () => {
      sessionStorage.setItem(DISMISS_KEY, announcement.id);
      banner.remove();
    });
  } catch (_) {}
}

// ── Hero Spotlight ──
async function initHeroSpotlight(): Promise<void> {
  const wrap = document.getElementById('heroSpotlightWrap');
  if (!wrap) return;
  try {
    const res = await fetch(`${getApiBase()}/api/spotlight/active`);
    if (!res.ok) return;
    const { spotlights }: { spotlights: HeroSpotlight[] } = await res.json();
    if (!spotlights || spotlights.length === 0) return;

    // Accept uploads/ paths AND http/https URLs
    const safeUrl = (u?: string): string => {
      if (!u) return '';
      if (u.startsWith('/uploads/')) return u;
      try { const p = new URL(u); return (p.protocol === 'https:' || p.protocol === 'http:') ? u : ''; } catch { return ''; }
    };

    const buildSlide = (s: HeroSpotlight): string => {
      const img = safeUrl(s.imageUrl);
      const link = safeUrl(s.ctaUrl);
      const typeLabel = ({ ad: 'AD', event: 'EVENT', news: 'NEWS', promo: 'PROMO' })[s.type || 'ad'] || 'AD';
      const badgeHtml = s.badgeText
        ? `<span class="spotlight-badge" style="background:${escapeHtml(s.badgeColor || '#E63946')}">${escapeHtml(s.badgeText)}</span>`
        : `<span class="spotlight-badge spotlight-badge-type">${typeLabel}</span>`;
      const ctaLabel = (s.ctaText || '').trim() || (link ? 'Learn more' : '');
      const ctaHtml = link
        ? `<span class="spotlight-cta">${escapeHtml(ctaLabel)}</span>`
        : '';
      // Use double quotes for style attribute; encode only " in URL to avoid breaking attribute boundary
      const cssImg = img.replace(/"/g, '%22');
      const slideClass = `swiper-slide spotlight-slide${link ? ' spotlight-slide--linked' : ''}`;
      const inner = `
        <div class="spotlight-overlay"></div>
        <div class="spotlight-content">
          ${badgeHtml}
          <h2 class="spotlight-title">${escapeHtml(s.title)}</h2>
          ${s.subtitle ? `<p class="spotlight-subtitle">${escapeHtml(s.subtitle)}</p>` : ''}
          ${s.body ? `<p class="spotlight-body">${escapeHtml(s.body)}</p>` : ''}
          ${ctaHtml}
        </div>`;
      // Whole banner is clickable when a link is set (image + text area)
      if (link) {
        return `<a class="${slideClass}" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" style="background-image:url(&quot;${cssImg}&quot;)" aria-label="${escapeHtml(s.title || 'Open spotlight')}">${inner}</a>`;
      }
      return `<div class="${slideClass}" style="background-image:url(&quot;${cssImg}&quot;)">${inner}</div>`;
    };

    const swiperDiv = document.createElement('div');
    swiperDiv.className = 'swiper spotlight-swiper';

    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'swiper-wrapper';
    wrapperDiv.innerHTML = spotlights.map(buildSlide).join('');
    swiperDiv.appendChild(wrapperDiv);

    if (spotlights.length > 1) {
      const pag = document.createElement('div');
      pag.className = 'swiper-pagination spotlight-pagination';
      swiperDiv.appendChild(pag);

      const hitPrev = document.createElement('button');
      hitPrev.type = 'button';
      hitPrev.className = 'spotlight-edge spotlight-edge--prev';
      hitPrev.setAttribute('aria-label', 'Previous spotlight');
      swiperDiv.appendChild(hitPrev);

      const hitNext = document.createElement('button');
      hitNext.type = 'button';
      hitNext.className = 'spotlight-edge spotlight-edge--next';
      hitNext.setAttribute('aria-label', 'Next spotlight');
      swiperDiv.appendChild(hitNext);
    }

    wrap.appendChild(swiperDiv);

    // Activate 2-column hero layout
    document.getElementById('heroSection')?.classList.add('hero--has-spotlight');

    const Swiper = (window as any).Swiper;
    if (!Swiper) return;
    const multi = spotlights.length > 1;
    new Swiper('.spotlight-swiper', {
      loop: multi,
      autoplay: multi
        ? { delay: 10000, disableOnInteraction: false, pauseOnMouseEnter: true }
        : false,
      speed: 700,
      pagination: multi ? { el: '.spotlight-pagination', clickable: true } : false,
      navigation: multi
        ? { nextEl: '.spotlight-edge--next', prevEl: '.spotlight-edge--prev' }
        : false,
      keyboard: { enabled: true },
      a11y: { enabled: true },
    });
  } catch (_) {}
}

// ── Auth functions ──
function syncUserPostButton(dropdown: HTMLElement, signedIn: boolean): void {
  const parent = dropdown.parentElement;
  if (!parent) return;
  let button = parent.querySelector<HTMLAnchorElement>(':scope > .nav-user-post');
  if (!signedIn) { button?.remove(); return; }
  dropdown.querySelector('.user-btn')?.setAttribute('aria-label', 'Account menu');
  if (!button) {
    button = document.createElement('a');
    button.className = 'btn-primary nav-user-post';
    button.href = '/pages/post/listing.html';
    button.textContent = 'Post Ad';
    parent.insertBefore(button, dropdown);
  }
}

function checkAuthState(): void {
  const token = getBiscoonToken();
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navCtas = document.querySelectorAll('#navCtas, .nav-ctas');
  const userDropdowns = document.querySelectorAll('.user-dropdown');
  const mobileBtns = document.querySelectorAll('.mobile-drawer-btns, #mobileBtns');
  const mobileUserMenus = document.querySelectorAll('.mobile-user-menu');
  const looseAuthLinks = document.querySelectorAll(
    'nav > a.btn-ghost[href*="login"], nav > a.btn-primary[href*="signup"], .mobile-drawer a.btn-ghost[href*="login"], .mobile-drawer a.btn-primary[href*="signup"]'
  );
  const visibleDropdowns = new Set<Element>();

  if (token) {
    document.body.classList.add('biscoon-logged-in');
    document.body.classList.remove('biscoon-logged-out');

    // User is logged in
    navCtas.forEach(el => { (el as HTMLElement).style.display = 'none'; });
    document.querySelectorAll('nav').forEach(nav => {
      const dropdown = nav.querySelector('.user-dropdown') as HTMLElement | null;
      if (dropdown) {
        dropdown.style.display = 'block';
        syncUserPostButton(dropdown, true);
        visibleDropdowns.add(dropdown);
      }
    });
    userDropdowns.forEach(el => {
      if (!visibleDropdowns.has(el)) {
        (el as HTMLElement).style.display = 'none';
        syncUserPostButton(el as HTMLElement, false);
      }
    });
    mobileBtns.forEach(el => { (el as HTMLElement).style.display = ''; });
    mobileUserMenus.forEach(el => { (el as HTMLElement).style.display = ''; });
    looseAuthLinks.forEach(el => { (el as HTMLElement).style.display = 'none'; });

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
    navCtas.forEach(el => { (el as HTMLElement).style.display = 'flex'; });
    userDropdowns.forEach(el => {
      (el as HTMLElement).style.display = 'none';
      syncUserPostButton(el as HTMLElement, false);
    });
    mobileBtns.forEach(el => { (el as HTMLElement).style.display = ''; });
    mobileUserMenus.forEach(el => { (el as HTMLElement).style.display = ''; });
    looseAuthLinks.forEach(el => { (el as HTMLElement).style.display = ''; });
  }
}

function getRelativeAuthPath(page: string): string {
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  const isHome = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/';
  const prefix = isHome ? 'pages/auth' : depth >= 3 ? '../auth' : 'auth';
  return `${prefix}/${page}`;
}

function getRelativePostPath(page: string): string {
  const isHome = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/';
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  const prefix = isHome ? 'pages/post' : depth >= 3 ? '../post' : 'post';
  return `${prefix}/${page}`;
}

function getRelativeCommunityPath(page: string): string {
  const isHome = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/';
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  const prefix = isHome ? 'pages/community' : depth >= 3 ? '../community' : 'community';
  return `${prefix}/${page}`;
}

function ensureAuthDropdowns(): void {
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

function ensureNotificationLinks(): void {
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

function dedupeMenuLinks(menu: Element, selector: string): void {
  const links = Array.from(menu.querySelectorAll(selector));
  links.slice(1).forEach(link => link.remove());
  if (links[0] && selector.includes('activity')) links[0].classList.add('activity-link');
}

function bindAuthDropdownEvents(): void {
  document.querySelectorAll('#userBtn').forEach(btn => {
    const el = btn as HTMLElement;
    if (el.dataset.authBound) return;
    el.dataset.authBound = 'true';
    el.addEventListener('click', toggleDropdown);
  });

  document.querySelectorAll('#logoutBtn, #mobileLogoutBtn').forEach(btn => {
    const el = btn as HTMLElement;
    if (el.dataset.authBound) return;
    el.dataset.authBound = 'true';
    el.addEventListener('click', function(e: Event) {
      e.preventDefault();
      logout();
    });
  });
}

function getPostListingPath(category = ''): string {
  const base = '/pages/post/listing.html';
  return category ? `${base}?category=${encodeURIComponent(category)}` : base;
}

function getHomeListingsPath(category = '', subcategory = ''): string {
  const url = new URL('/index.html', window.location.origin);
  if (category && category !== 'all') url.searchParams.set('category', category);
  if (subcategory && subcategory !== 'all') url.searchParams.set('subcategory', subcategory);
  url.hash = 'listings';
  return url.pathname + url.search + url.hash;
}

function getLoginPath(redirectTo = getPostListingPath()): string {
  const url = new URL('/pages/auth/login.html', window.location.origin);
  url.searchParams.set('redirect', redirectTo);
  return url.pathname + url.search;
}

function goToPostOrLogin(): void {
  const category = inferPageCategory();
  const postPath = getPostListingPath(category);
  const destination = getBiscoonToken() ? postPath : getLoginPath(postPath);
  window.location.href = destination;
}

function isPostListingAnchor(anchor: HTMLElement | null): boolean {
  if (!anchor) return false;
  const rawHref = anchor.getAttribute('href') || '';
  if (rawHref.includes('post/listing.html')) return true;
  return rawHref === 'listing.html' && window.location.pathname.includes('/pages/post/');
}

function isPostActionButton(button: HTMLElement | null): boolean {
  if (!button) return false;
  const text = button.textContent.trim().toLowerCase();
  return text.includes('post now') || text.includes('post a listing') || text.includes('post a free listing');
}

function bindProtectedPostActions(): void {
  document.addEventListener('click', function(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a') as HTMLElement | null;
    if (isPostListingAnchor(anchor)) {
      e.preventDefault();
      goToPostOrLogin();
      return;
    }

    const button = target.closest('button') as HTMLButtonElement | null;
    if (isPostActionButton(button)) {
      e.preventDefault();
      goToPostOrLogin();
    }
  });
}

function normalizeCategoryForListings(category: string): string {
  const aliases: Record<string, string> = {
    realestate: 'real-estate',
    pg: 'paying-guest',
    students: 'student',
    rojgar: 'jobs',
  };
  return aliases[category] || category || '';
}

const BISCOON_SPECIFIC_TYPE_SCOPE: Record<string, { category: string; subcategory: string }> = {
  tech: { category: 'jobs', subcategory: 'tech' },
  healthcare: { category: 'jobs', subcategory: 'healthcare' },
  insurance: { category: 'jobs', subcategory: 'insurance' },
  cpa: { category: 'jobs', subcategory: 'cpa' },
  legal: { category: 'jobs', subcategory: 'legal' },
  finance: { category: 'jobs', subcategory: 'finance' },
  education: { category: 'jobs', subcategory: 'education' },
  student: { category: 'jobs', subcategory: 'student' },
  tutoring: { category: 'jobs', subcategory: 'tutoring' },
  'ai-services': { category: 'jobs', subcategory: 'ai-services' },
  immigration: { category: 'jobs', subcategory: 'immigration' },
  'paying-guest': { category: 'housing', subcategory: 'paying-guest' },
  'real-estate': { category: 'housing', subcategory: 'real-estate' },
  moving: { category: 'housing', subcategory: 'moving' },
  kinbech: { category: 'marketplace', subcategory: 'kinbech' },
  services: { category: 'marketplace', subcategory: 'services' },
  restaurants: { category: 'marketplace', subcategory: 'restaurants' },
  shops: { category: 'marketplace', subcategory: 'shops' },
  childcare: { category: 'marketplace', subcategory: 'childcare' },
  beauty: { category: 'marketplace', subcategory: 'beauty' },
  auto: { category: 'marketplace', subcategory: 'auto' },
  cleaning: { category: 'marketplace', subcategory: 'cleaning' },
  photography: { category: 'photography', subcategory: '' },
  produce: { category: 'marketplace', subcategory: 'produce' },
  'business-for-sale': { category: 'marketplace', subcategory: 'business-for-sale' },
  translation: { category: 'marketplace', subcategory: 'translation' },
  organizations: { category: 'community', subcategory: 'organizations' },
  events: { category: 'community', subcategory: 'events' },
  literature: { category: 'community', subcategory: 'literature' },
  music: { category: 'community', subcategory: 'music' },
  art: { category: 'community', subcategory: 'art' },
  sports: { category: 'community', subcategory: 'sports' },
  yoga: { category: 'community', subcategory: 'yoga' },
  jyotish: { category: 'community', subcategory: 'jyotish' },
  matchmaker: { category: 'community', subcategory: 'matchmaker' },
  matrimony: { category: 'community', subcategory: 'matrimony' },
  'pen-pals': { category: 'community', subcategory: 'pen-pals' },
  travel: { category: 'community', subcategory: 'travel' },
};

function getListingScopeForCategory(category: string): { category: string; subcategory: string } {
  const normalized = normalizeCategoryForListings(category);
  return BISCOON_SPECIFIC_TYPE_SCOPE[normalized] || { category: normalized, subcategory: '' };
}

function getSelectedBrowseScope(): { category: string; subcategory: string } {
  const activeHomeFilter = document.querySelector('.filter-btn.active') as HTMLElement | null;
  if (activeHomeFilter) {
    return getListingScopeForCategory(getFilterFromButton(activeHomeFilter));
  }

  const scope = getListingScopeForCategory(inferPageCategory());
  const chipFilter = getActiveChipFilter();
  // Keep page subcategory; chips refine via search in resolveBrowseQuery, not by replacing scope
  return {
    category: scope.category,
    subcategory: scope.subcategory || chipFilter || '',
  };
}

function isBrowseListingAction(element: HTMLElement | null): boolean {
  if (!element) return false;
  if (element.classList.contains('load-more')) return true;
  const text = element.textContent.trim().toLowerCase();
  return text.includes('browse all listings')
    || text.includes('browse all categories')
    || text.includes('view all categories')
    || text.includes('view all listings')
    || text.includes('load more listings');
}

function bindBrowseListingActions(): void {
  document.addEventListener('click', function(e: MouseEvent) {
    const target = e.target as HTMLElement;

    const pageBtn = target.closest<HTMLElement>('[data-listings-page]');
    if (pageBtn) {
      e.preventDefault();
      const page = Number(pageBtn.dataset.listingsPage || 0);
      if (!page || page < 1) return;
      hydrateDynamicListings(inferPageCategory(), { page, append: false }).then(() => {
        document.getElementById('listingsFeed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    const moreBtn = target.closest<HTMLElement>('[data-listings-more]');
    if (moreBtn) {
      e.preventDefault();
      if (!browseSession || browseSession.page >= browseSession.pages) return;
      moreBtn.setAttribute('disabled', 'true');
      moreBtn.textContent = 'Loading…';
      hydrateDynamicListings(inferPageCategory(), { page: browseSession.page + 1, append: true });
      return;
    }

    const action = target.closest('button, a') as HTMLElement | null;
    if (!isBrowseListingAction(action)) return;
    // Real load-more is handled above via [data-listings-more]
    if (action?.classList.contains('load-more') && action.hasAttribute('data-listings-more')) return;

    e.preventDefault();
    const categoriesSection = document.getElementById('categories');
    if (categoriesSection) {
      categoriesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.href = '/index.html#categories';
    }
  });
}

function guardPostingPage(): void {
  if (!window.location.pathname.endsWith('/pages/post/listing.html')) return;
  if (getBiscoonToken()) return;
  window.location.href = getLoginPath(getPostListingPath());
}

async function fetchUserInfo(token: string): Promise<void> {
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
    const user = data.user || data;
    if (user && ['super-admin', 'admin', 'staff', 'sub-admin'].includes(user.role)) {
      endBiscoonSession({ redirect: false });
      return;
    }
    if (user && user.name) {
      const userNameEls = document.querySelectorAll('#userName, #mobileUserName');
      userNameEls.forEach(el => el.textContent = user.name);
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error);
  }
}

function getRelativeAdminPath(): string {
  return '/pages/admin/dashboard.html';
}

function injectAdminLink(): void {
  const adminPath = getRelativeAdminPath();

  // Desktop dropdown — insert before logout
  document.querySelectorAll('#dropdownMenu').forEach(menu => {
    if (menu.querySelector('.admin-panel-link')) return;
    const a = document.createElement('a');
    a.href = adminPath;
    a.className = 'admin-panel-link';
    a.innerHTML = '🛡 Admin Panel <span class="admin-nav-badge">ADMIN</span>';
    const logout = menu.querySelector('#logoutBtn');
    logout ? menu.insertBefore(a, logout) : menu.appendChild(a);
  });

  // Mobile menu — insert before logout
  document.querySelectorAll('.mobile-user-menu').forEach(menu => {
    if (menu.querySelector('.admin-panel-link')) return;
    const a = document.createElement('a');
    a.href = adminPath;
    a.className = 'admin-panel-link';
    a.innerHTML = '🛡 Admin Panel';
    const logout = menu.querySelector('#mobileLogoutBtn');
    logout ? menu.insertBefore(a, logout) : menu.appendChild(a);
  });

  // Badge on the user button
  document.querySelectorAll('.user-btn').forEach(btn => {
    if (btn.querySelector('.admin-nav-badge')) return;
    const badge = document.createElement('span');
    badge.className = 'admin-nav-badge';
    badge.textContent = 'ADMIN';
    const arrow = btn.querySelector('.dropdown-arrow');
    arrow ? btn.insertBefore(badge, arrow) : btn.appendChild(badge);
  });
}

async function fetchNotificationSummary(token = getBiscoonToken()): Promise<void> {
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

async function fetchMessageSummary(token = getBiscoonToken()): Promise<void> {
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

function updateMessageBadges(count: number): void {
  _biscoonUnreadMessages = count;
  document.querySelectorAll('.messages-badge').forEach(badge => {
    badge.textContent = count > 0 ? String(count) : '';
    (badge as HTMLElement).style.display = count > 0 ? 'inline-flex' : 'none';
  });
  updateUserTotalBadge();
}

let _biscoonUnreadNotifications = 0;
let _biscoonUnreadMessages = 0;

function updateUserTotalBadge(): void {
  const total = _biscoonUnreadNotifications + _biscoonUnreadMessages;
  document.querySelectorAll('.user-total-badge').forEach(badge => {
    badge.textContent = total > 0 ? String(total > 99 ? '99+' : total) : '';
    (badge as HTMLElement).style.display = total > 0 ? 'inline-flex' : 'none';
  });
}

function updateNotificationBadges(count: number): void {
  _biscoonUnreadNotifications = count;
  document.querySelectorAll('.notification-badge').forEach(badge => {
    badge.textContent = count > 0 ? String(count) : '';
    (badge as HTMLElement).style.display = count > 0 ? 'inline-flex' : 'none';
  });
  updateUserTotalBadge();
}

function bindNotificationEvents(): void {
  window.addEventListener('biscoon:notifications-updated', () => fetchNotificationSummary());
  window.addEventListener('biscoon:messages-updated', () => fetchMessageSummary());
}

function toggleDropdown(event: Event): void {
  const currentTarget = event?.currentTarget as HTMLElement | null;
  const dropdown = currentTarget?.closest('.user-dropdown');
  const btn = dropdown ? dropdown.querySelector('#userBtn') : document.getElementById('userBtn');
  const menu = dropdown ? dropdown.querySelector('#dropdownMenu') : document.getElementById('dropdownMenu');
  if (btn && menu) {
    const isOpen = btn.classList.toggle('open');
    menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      const first = menu.querySelector('a, button') as HTMLElement | null;
      if (first) first.focus();
    }
  }
}

function logout(): void {
  endBiscoonSession({ destination: '/index.html', redirect: true });
}

// ── Search ──
function doSearch(): void {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const searchCategory = document.getElementById('searchCategory') as HTMLSelectElement | null;
  const q = searchInput ? searchInput.value : '';
  const cat = searchCategory ? searchCategory.value : '';
  const query = q.trim();

  const btn = document.querySelector('.search-btn') as HTMLButtonElement | null;
  const originalText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  Promise.all([
    cat === 'discussions' ? Promise.resolve([]) : fetchListings(cat, query, 100),
    !cat || cat === 'all' || cat === 'discussions' ? fetchDiscussions(query, 25) : Promise.resolve([]),
  ])
    .then(([listings, discussions]: [Listing[], Discussion[]]) => {
      if (window.renderSearchResults) {
        window.renderSearchResults(listings, query, cat, discussions);
      } else if (window.renderListings) {
        window.renderListings(listings);
      } else {
        biscoonToast('Search results are available, but the current page cannot render them.', 'error');
      }
    })
    .catch(() => {
      biscoonToast('Unable to perform search at this time.', 'error');
    })
    .finally(() => {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    });
}
window.doSearch = doSearch;
window.clearSearch = clearSearch;

// ── Filter listings by data-cat ──
function filterListings(cat: string): void {
  document.querySelectorAll('.listing-card[data-cat], .card[data-cat]').forEach(el => {
    (el as HTMLElement).style.display = (cat === 'all' || !cat || (el as HTMLElement).dataset.cat === cat) ? '' : 'none';
  });
  document.querySelectorAll('.section-divider[data-group]').forEach(el => {
    (el as HTMLElement).style.display = (cat === 'all' || !cat) ? '' : 'none';
  });
}

// ── Dynamic listings ──
const BISCOON_CATEGORY_META: Record<string, { label: string; emoji: string }> = {
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
  marketplace: { label: 'Marketplace', emoji: '🛍️' },
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

function getApiBase(): string {
  const origin = window.location.origin || 'http://localhost:4000';
  return origin.startsWith('file://') ? 'http://localhost:4000' : origin;
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char));
}

const ICON_PIN = '<svg class="meta-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.5c-2.49 0-4.5 2.01-4.5 4.5 0 3.375 4.5 8.5 4.5 8.5s4.5-5.125 4.5-8.5c0-2.49-2.01-4.5-4.5-4.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><circle cx="8" cy="6" r="1.6" stroke="currentColor" stroke-width="1.3"/></svg>';
const ICON_CLOCK = '<svg class="meta-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.75V8l2.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_PERSON = '<svg class="meta-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="5.25" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M2.75 14c0-2.9 2.35-4.5 5.25-4.5s5.25 1.6 5.25 4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
const ICON_PHONE = '<svg class="meta-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4.2 2.5h2l1 2.7-1.4 1.1a8 8 0 0 0 3.9 3.9l1.1-1.4 2.7 1v2c0 .7-.6 1.2-1.3 1.1C7.3 12.4 3.6 8.7 3.1 3.8c-.1-.7.4-1.3 1.1-1.3Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const ICON_MAIL = '<svg class="meta-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 4.5 8 8.5l5.5-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// A bare number like "2232" gets a $ prefix so it reads as a price, not a random figure.
// Anything already containing a currency symbol or words (e.g. "$18/hr", "Negotiable", "Free")
// is left exactly as the poster typed it.
function formatListingPrice(price: string | null | undefined): string {
  const trimmed = String(price ?? '').trim();
  if (!trimmed) return 'Open';
  if (/^\d[\d,]*(\.\d+)?$/.test(trimmed)) return `$${trimmed}`;
  return trimmed;
}

interface PageMetaUpdate {
  title: string;
  description: string;
  url?: string;
}

function updatePageMeta({ title, description, url }: PageMetaUpdate): void {
  document.title = title;

  const setMeta = (selector: string, attr: string, value: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };
  setMeta('meta[name="description"]', 'content', description);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', description);

  const pageUrl = url || window.location.href.split('#')[0];
  setMeta('link[rel="canonical"]', 'href', pageUrl);
  setMeta('meta[property="og:url"]', 'content', pageUrl);
}

function safeExternalHref(value: string | null | undefined): string {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

const _biscoonConversationStatusCache = new Map<string, string>();

function getConversationStatusCacheKey(listingId = '', recipientId = ''): string {
  return `${String(listingId)}::${String(recipientId)}`;
}

function cacheConversationStatus(listingId = '', recipientId = '', conversationId = ''): void {
  if (!listingId || !recipientId) return;
  _biscoonConversationStatusCache.set(getConversationStatusCacheKey(listingId, recipientId), conversationId || '');
}

async function fetchExistingConversationId(listingId = '', recipientId = ''): Promise<string> {
  const token = getBiscoonToken();
  if (!token || !listingId || !recipientId) return '';

  const key = getConversationStatusCacheKey(listingId, recipientId);
  if (_biscoonConversationStatusCache.has(key)) {
    return _biscoonConversationStatusCache.get(key) || '';
  }

  try {
    const params = new URLSearchParams({
      listingId: String(listingId),
      recipientId: String(recipientId),
    });
    const response = await fetch(`${getApiBase()}/api/messages/status?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      cacheConversationStatus(listingId, recipientId, '');
      return '';
    }
    const data = await response.json();
    const conversationId = data && data.exists ? String(data.conversationId || '') : '';
    cacheConversationStatus(listingId, recipientId, conversationId);
    return conversationId;
  } catch {
    cacheConversationStatus(listingId, recipientId, '');
    return '';
  }
}

function getMessagePosterActionMarkup({ listingId = '', recipientId = '', listingTitle = '', token = '', isOwner = false, conversationId = '' }: MessagePosterParams): string {
  if (isOwner || !recipientId) return '';
  const cleanConversationId = String(conversationId || '');
  if (token && cleanConversationId) {
    return `
      <span class="tag tag-green">Already messaged</span>
      <a class="btn-ghost" href="${getRelativeAuthPath('messages.html')}?id=${encodeURIComponent(cleanConversationId)}">Open chat</a>
    `;
  }
  return `
    <button class="${token ? 'btn-primary' : 'btn-ghost'}" type="button" data-msg-listing-id="${escapeHtml(listingId)}" data-msg-recipient-id="${escapeHtml(recipientId)}" data-msg-listing-title="${escapeHtml(listingTitle)}" onclick="window._openMsgModal(this)">${ICON_MAIL}Message Poster</button>
  `;
}

function getCategoryMeta(category: string): { label: string; emoji: string } {
  return BISCOON_CATEGORY_META[category] || {
    label: String(category || 'other').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    emoji: '📄',
  };
}

function getCategoryEmoji(category: string): string {
  return getCategoryMeta(category).emoji;
}

function getListingPageHref(id: string): string {
  const prefix = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/' ? 'pages' : '..';
  return `${prefix}/post/detail.html?id=${encodeURIComponent(id)}`;
}

function formatListingDate(value: string | null | undefined): string {
  if (!value) return 'Just posted';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently posted';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function inferPageCategory(): string {
  const filename = window.location.pathname.split('/').pop() || 'index.html';
  const slug = filename.replace('.html', '');
  if (slug === 'index') return '';
  if (slug === 'jobs' || slug === 'rojgar') return 'jobs';
  if (slug === 'students') return 'student';
  return slug;
}

function getDynamicListingsContainer(): Element | null {
  const homeContainer = document.getElementById('listingsContainer');
  if (homeContainer) return homeContainer;

  const pageMain = document.querySelector('.page-main');
  if (pageMain) return pageMain;

  const layout = document.querySelector('.page-layout');
  const firstColumn = layout ? layout.firstElementChild : null;
  if (firstColumn) return firstColumn;

  return null;
}

const LISTINGS_PAGE_SIZE = 12;

type ListingsPage = {
  listings: Listing[];
  total: number;
  page: number;
  pages: number;
  limit: number;
};

type BrowseSession = {
  category: string;
  subcategory: string;
  search: string;
  page: number;
  pages: number;
  total: number;
  sort: string;
  items: Listing[];
};

let browseSession: BrowseSession | null = null;
let browseRequestId = 0;

async function fetchListingsPage(options: {
  category?: string;
  subcategory?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
} = {}): Promise<ListingsPage> {
  const {
    category = '',
    subcategory = '',
    search = '',
    page = 1,
    limit = LISTINGS_PAGE_SIZE,
    sort = '',
  } = options;
  const url = new URL(`${getApiBase()}/api/listings`);
  if (category && category !== 'all') url.searchParams.set('category', category);
  if (subcategory && subcategory !== 'all') url.searchParams.set('subcategory', subcategory);
  if (search) url.searchParams.set('search', search);
  url.searchParams.set('page', String(Math.max(1, page)));
  url.searchParams.set('limit', String(limit || LISTINGS_PAGE_SIZE));
  if (sort) url.searchParams.set('sort', sort);
  if ((!search && !sort) || sort === 'closest') {
    const near = await getUserLocationCity();
    if (near) url.searchParams.set('near', near);
  }

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Unable to load listings');
  const data = await response.json();
  return {
    listings: data.listings || [],
    total: Number(data.total || 0),
    page: Number(data.page || page),
    pages: Number(data.pages || 1),
    limit: Number(data.limit || limit || LISTINGS_PAGE_SIZE),
  };
}

async function fetchListings(category = '', search = '', limit = 0, subcategory = ''): Promise<Listing[]> {
  const data = await fetchListingsPage({
    category,
    subcategory,
    search,
    page: 1,
    limit: limit || 48,
  });
  return data.listings;
}

function listingSkeletons(count = 5): string {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-thumb"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line-short"></div>
        <div class="skeleton skeleton-line-xs"></div>
      </div>
    </div>
  `).join('');
}

function ensureListingsShell(target: Element): { feed: HTMLElement; controls: HTMLElement } {
  let feed = target.querySelector('#listingsFeed') as HTMLElement | null;
  let controls = target.querySelector('#listingsControls') as HTMLElement | null;
  if (feed && controls) return { feed, controls };

  feed = document.createElement('div');
  feed.id = 'listingsFeed';
  feed.className = 'listings-feed';
  controls = document.createElement('div');
  controls.id = 'listingsControls';
  controls.className = 'listings-controls';
  controls.innerHTML = `
    <button type="button" class="load-more" data-listings-more hidden>Load more listings →</button>
    <div class="pagination" data-listings-pager hidden></div>
  `;
  target.innerHTML = '';
  target.appendChild(feed);
  target.appendChild(controls);
  return { feed, controls };
}

function getActiveSortValue(): string {
  const select = document.querySelector('.sort-select') as HTMLSelectElement | null;
  return select?.value || 'closest';
}

function bindSortSelect(): void {
  document.querySelectorAll<HTMLSelectElement>('.sort-select').forEach(select => {
    if (select.dataset.sortBound === 'true') return;
    select.dataset.sortBound = 'true';
    Array.from(select.options).forEach((opt, index) => {
      const label = (opt.textContent || '').toLowerCase();
      if (label.includes('newest')) opt.value = 'newest';
      else if (label.includes('relevant')) opt.value = 'relevant';
      else if (label.includes('closest')) opt.value = 'closest';
      else if (label.includes('price') && label.includes('low')) opt.value = 'price-low';
      else if (label.includes('price') && label.includes('high')) opt.value = 'price-high';
      else if (!opt.value) opt.value = ['newest', 'relevant', 'closest'][index] || 'newest';
    });
    select.addEventListener('change', () => {
      void hydrateDynamicListings(inferPageCategory(), { page: 1, append: false });
    });
  });
}

function updateListingsControls(controls: HTMLElement, session: BrowseSession): void {
  const more = controls.querySelector('[data-listings-more]') as HTMLButtonElement | null;
  const pager = controls.querySelector('[data-listings-pager]') as HTMLElement | null;
  if (more) {
    const hasMore = session.page < session.pages;
    more.hidden = !hasMore;
    more.disabled = false;
    more.textContent = hasMore
      ? `Load more listings → (${session.items.length} of ${session.total})`
      : 'All listings loaded';
  }
  if (pager) {
    if (session.pages <= 1) {
      pager.hidden = true;
      pager.innerHTML = '';
      return;
    }
    pager.hidden = false;
    const start = Math.max(1, session.page - 2);
    const end = Math.min(session.pages, start + 4);
    const buttons: string[] = [
      `<button type="button" class="pg-btn" data-listings-page="${session.page - 1}" ${session.page <= 1 ? 'disabled' : ''}>← Prev</button>`,
    ];
    for (let i = start; i <= end; i += 1) {
      buttons.push(`<button type="button" class="pg-btn${i === session.page ? ' active' : ''}" data-listings-page="${i}">${i}</button>`);
    }
    buttons.push(`<button type="button" class="pg-btn" data-listings-page="${session.page + 1}" ${session.page >= session.pages ? 'disabled' : ''}>Next →</button>`);
    pager.innerHTML = buttons.join('');
  }
}

/** Parent browse hubs: filename → API category (subcategory comes from chips/URL). */
const BROWSE_HUB_CATEGORY: Record<string, string> = {
  jobs: 'jobs',
  housing: 'housing',
  kinbech: 'marketplace',
  services: 'marketplace',
  events: 'community',
};

function isBrowseHubPage(slug = inferPageCategory()): boolean {
  return Boolean(BROWSE_HUB_CATEGORY[slug]);
}

function getActiveChipElement(): HTMLElement | null {
  return document.querySelector('.filter-chips .chip.active[data-filter]') as HTMLElement | null;
}

function syncSubcategoryUrl(subcategory: string): void {
  if (!isBrowseHubPage()) return;
  const url = new URL(window.location.href);
  if (!subcategory || subcategory === 'all') url.searchParams.delete('subcategory');
  else url.searchParams.set('subcategory', subcategory);
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

function ensureChipForSubcategory(subcategory: string): void {
  const group = document.querySelector('.filter-chips') as HTMLElement | null;
  if (!group || !subcategory || subcategory === 'all') return;
  let chip = group.querySelector(`.chip[data-filter="${CSS.escape(subcategory)}"]`) as HTMLButtonElement | null;
  if (!chip) {
    chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.filter = subcategory;
    chip.setAttribute('aria-pressed', 'false');
    chip.textContent = subcategory.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    group.appendChild(chip);
  }
  group.querySelectorAll('.chip').forEach(c => {
    c.classList.remove('active');
    c.setAttribute('aria-pressed', 'false');
  });
  chip.classList.add('active');
  chip.setAttribute('aria-pressed', 'true');
}

function syncChipsFromUrl(): void {
  if (!isBrowseHubPage()) return;
  const sub = new URLSearchParams(window.location.search).get('subcategory') || 'all';
  ensureChipForSubcategory(sub === 'all' ? '' : sub);
  if (!sub || sub === 'all') {
    const group = document.querySelector('.filter-chips');
    const allChip = group?.querySelector('.chip[data-filter="all"]') as HTMLElement | null;
    group?.querySelectorAll('.chip').forEach(c => {
      c.classList.remove('active');
      c.setAttribute('aria-pressed', 'false');
    });
    if (allChip) {
      allChip.classList.add('active');
      allChip.setAttribute('aria-pressed', 'true');
    }
  }
}

function resolveBrowseQuery(category = inferPageCategory()): { category: string; subcategory: string; search: string } {
  const params = new URLSearchParams(window.location.search);
  const requestedScope = getListingScopeForCategory(params.get('category') || '');
  const pageScope = getListingScopeForCategory(category);
  const activeHomeFilter = document.querySelector('.filter-btn.active') as HTMLElement | null;
  const homeScope = activeHomeFilter
    ? getListingScopeForCategory(getFilterFromButton(activeHomeFilter))
    : { category: '', subcategory: '' };
  const activeChip = getActiveChipElement();
  const chip = getActiveChipFilter();
  const chipIsSearch = activeChip?.dataset.filterMode === 'search';
  const requestedSearch = params.get('search') || params.get('q') || '';
  const urlSub = params.get('subcategory') || '';
  const inputEl = document.getElementById('searchInput') as HTMLInputElement | null;
  const typedSearch = (inputEl?.value || '').trim();
  const effectiveSearch = typedSearch || requestedSearch;

  // Homepage / explicit category param
  if (homeScope.category || (requestedScope.category && !isBrowseHubPage(category))) {
    const selectedCategory = requestedScope.category || homeScope.category || pageScope.category;
    const selectedSubcategory = urlSub || homeScope.subcategory || requestedScope.subcategory || pageScope.subcategory || '';
    return { category: selectedCategory, subcategory: selectedSubcategory, search: effectiveSearch };
  }

  // Parent hub pages (jobs, housing, kinbech, services, events)
  if (isBrowseHubPage(category)) {
    const hubCategory = BROWSE_HUB_CATEGORY[category];
    let search = effectiveSearch;
    let selectedSubcategory = '';
    let selectedCategory = hubCategory;

    if (chip && chipIsSearch) {
      selectedSubcategory = urlSub;
      search = [effectiveSearch, chip].filter(Boolean).join(' ').trim();
    } else if (chip) {
      const scope = getListingScopeForCategory(chip);
      selectedCategory = scope.category || hubCategory;
      selectedSubcategory = scope.subcategory || chip;
    } else if (urlSub) {
      const scope = getListingScopeForCategory(urlSub);
      selectedCategory = scope.category || hubCategory;
      selectedSubcategory = scope.subcategory || urlSub;
    }

    return { category: selectedCategory, subcategory: selectedSubcategory, search };
  }

  // Dedicated specialty pages (student, immigration, paying-guest, …)
  const selectedCategory = requestedScope.category || pageScope.category;
  let selectedSubcategory = urlSub || pageScope.subcategory || requestedScope.subcategory || '';
  let search = effectiveSearch;
  if (chip) {
    if (selectedSubcategory && chip !== selectedSubcategory) {
      search = [effectiveSearch, chip].filter(Boolean).join(' ').trim();
    } else if (!selectedSubcategory) {
      selectedSubcategory = chip;
    }
  }
  return { category: selectedCategory, subcategory: selectedSubcategory, search };
}

function renderListingsIntoFeed(listings: Listing[], feed: HTMLElement, append: boolean): void {
  const sorted = listings;

  if (append) {
    feed.insertAdjacentHTML('beforeend', sorted.map(listingToCard).join(''));
    return;
  }

  updateFilterChipsFromListings(sorted);

  if (!sorted.length) {
    (feed.parentElement as HTMLElement | null)?.setAttribute('data-dynamic-state', 'empty');
    feed.innerHTML = `
      <div class="empty-state">
        <div class="icon">${escapeHtml(getCategoryEmoji(inferPageCategory() || 'other'))}</div>
        <h3>No live listings yet</h3>
        <p>Be the first to add a real post for this section.</p>
        <a class="btn-primary" href="${getPostListingPath(inferPageCategory())}">Post a Listing</a>
      </div>
    `;
    window.dispatchEvent(new CustomEvent('biscoon:listings-rendered', { detail: { listings: [], feed } }));
    return;
  }

  (feed.parentElement as HTMLElement | null)?.setAttribute('data-dynamic-state', 'live');
  feed.innerHTML = sorted.map(listingToCard).join('');
  window.dispatchEvent(new CustomEvent('biscoon:listings-rendered', { detail: { listings: sorted, feed } }));
}

async function fetchDiscussions(search = '', limit = 25): Promise<Discussion[]> {
  const url = new URL(`${getApiBase()}/api/discussions`);
  if (search) url.searchParams.set('search', search);
  if (limit) url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Unable to load discussions');
  const data = await response.json();
  return data.discussions || [];
}

async function fetchListingStats(): Promise<ListingStats> {
  const response = await fetch(`${getApiBase()}/api/listings/stats/summary`);
  if (!response.ok) throw new Error('Unable to load listing stats');
  return response.json();
}

function formatCount(value: number | string | null | undefined, fallback = '0'): string {
  const number = Number(value || 0);
  if (!number) return fallback;
  return number.toLocaleString();
}

function getDefaultListingImageMarkup(category = 'other'): string {
  return `<span class="listing-default-image">${escapeHtml(getCategoryEmoji(category))}</span>`;
}

function listingToCard(listing: Listing): string {
  const category = listing.category || 'other';
  const isPhotographyListing = category === 'photography';
  const meta = getCategoryMeta(category);
  const images = Array.isArray(listing.images) ? listing.images : [];
  const image = images.length ? images[0] : '';
  const imageCount = images.length;
  const countBadge = isPhotographyListing && imageCount > 1
    ? `<span class="photo-count-badge">📷 ${imageCount}</span>`
    : '';
  const thumb = image
    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title || 'Listing image')}" loading="lazy">${countBadge}`
    : getDefaultListingImageMarkup(category);
  const thumbClass = isPhotographyListing && image
    ? 'listing-thumb listing-thumb--photo listing-thumb--photo-card'
    : 'listing-thumb';
  const subcategory = listing.subcategory ? `<span class="tag tag-blue">${escapeHtml(listing.subcategory)}</span>` : '';
  const availability = listing.availability ? `<span class="tag tag-green">${escapeHtml(listing.availability)}</span>` : '';
  const tags = Array.isArray(listing.tags)
    ? listing.tags.slice(0, 2).map(tag => `<span class="tag tag-gray">${escapeHtml(tag)}</span>`).join('')
    : '';
  const contact = !isPhotographyListing && listing.contactEmail ? `<span>${escapeHtml(listing.contactEmail)}</span>` : '';
  const priceText = isPhotographyListing
    ? `📷 ${imageCount} photo${imageCount !== 1 ? 's' : ''}`
    : escapeHtml(formatListingPrice(listing.price));
  return `
    <a class="listing-card${isPhotographyListing ? ' listing-card--photo' : ''}" data-cat="${escapeHtml(category)}" data-listing-id="${escapeHtml(listing.id || '')}" href="${getListingPageHref(listing.id || '')}">
      <div class="${thumbClass}">${thumb}</div>
      <div class="listing-body">
        <div class="listing-title">${escapeHtml(listing.title || 'Untitled listing')}</div>
        <div class="listing-meta">
          ${isPhotographyListing ? `<span>📍 ${escapeHtml(listing.location || 'Photo showcase')}</span>` : `<span>📍 ${escapeHtml(listing.location || 'Remote / Flexible')}</span>`}
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
      <div class="listing-price">${priceText}</div>
    </a>
  `;
}

function getDiscussionPageHref(id: string): string {
  const prefix = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/' ? 'pages' : '..';
  return `${prefix}/community/discussions.html?id=${encodeURIComponent(id)}`;
}

function discussionToSearchCard(discussion: Discussion): string {
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

function renderListingComments(listing: Listing): string {
  const comments = Array.isArray(listing.comments) ? listing.comments : [];
  const token = getBiscoonToken();
  const currentUserId = getCurrentUserIdFromToken();
  const isOwner = token && currentUserId && listing.userId === currentUserId;
  const topLevelComments = comments.filter(comment => !comment.parentId);
  const repliesByParent = comments.reduce((groups: Record<string, BiscoonComment[]>, comment) => {
    if (!comment.parentId) return groups;
    if (!groups[comment.parentId]) groups[comment.parentId] = [];
    groups[comment.parentId].push(comment);
    return groups;
  }, {});
  const renderReplyForm = (comment: BiscoonComment) => `
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
  const renderThreadReplies = (parentId: string, rootUserId: string, depth = 1): string => {
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
  const loginHref = `${getRelativeAuthPath('login.html')}?redirect=${encodeURIComponent(getListingPageHref(listing.id || ''))}`;
  const composeBlock = token ? `
      <form class="listing-comment-form" data-listing-comment-form="${escapeHtml(listing.id || '')}">
        <label class="form-label" for="listingComment-${escapeHtml(listing.id || '')}">Add a comment</label>
        <textarea class="form-input" id="listingComment-${escapeHtml(listing.id || '')}" name="body" placeholder="Share a question or tip…" required></textarea>
        <div class="listing-comment-actions">
          <button class="btn-primary" type="submit">Post comment</button>
        </div>
      </form>` : `
      <div class="listing-comment-signin">
        <p>Join the conversation after you sign in.</p>
        <a class="btn-primary" href="${loginHref}">Sign in to comment</a>
      </div>`;

  return `
    <section class="listing-comments" data-listing-comments="${escapeHtml(listing.id || '')}">
      <div class="listing-comments-head">${comments.length} comment${comments.length === 1 ? '' : 's'}</div>
      ${composeBlock}
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
            ${renderThreadReplies(comment.id, comment.userId || '')}
          </article>
        `;
        }).join('') : '<div class="listing-comments-empty">No comments yet.</div>'}
      </div>
    </section>
  `;
}

function getCurrentUserIdFromToken(): string {
  const token = getBiscoonToken();
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    return payload.id || '';
  } catch (error) {
    return '';
  }
}

async function postListingComment(listingId: string, body: string, parentId = ''): Promise<Listing | undefined> {
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

function ensureListingModal(): HTMLElement {
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

function closeListingModal(): void {
  const modal = document.getElementById('listingModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.classList.remove('listing-modal-open');
}

function renderListingModalContent(listing: Listing): string {
  const meta = getCategoryMeta(listing.category || 'other');
  const isPhotoModal = (listing.category || 'other') === 'photography';
  const modalImages = Array.isArray(listing.images) ? listing.images : [];
  const galleryClass = isPhotoModal && modalImages.length > 1
    ? 'listing-detail-gallery photo-detail-gallery'
    : 'listing-detail-gallery';
  const gallery = modalImages.length
    ? `<div class="${galleryClass}" data-pswp-gallery>${modalImages.map((image, index) => `<a href="${escapeHtml(image)}" data-pswp-src="${escapeHtml(image)}"${isPhotoModal && index === 0 ? ' class="photo-hero-slot"' : ''} aria-label="Open image ${index + 1}"><img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title || 'Listing image')}" loading="lazy"></a>`).join('')}</div>`
    : '';
  const contactPhone = listing.contactPhone
    ? `<a class="contact-chip" href="tel:${escapeHtml(listing.contactPhone)}">${ICON_PHONE}${escapeHtml(listing.contactPhone)}</a>`
    : '';
  const contactEmail = listing.contactEmail
    ? `<a class="contact-chip" href="mailto:${escapeHtml(listing.contactEmail)}">${ICON_MAIL}${escapeHtml(listing.contactEmail)}</a>`
    : '';
  const externalHref = safeExternalHref(listing.externalLink);
  const externalLink = externalHref
    ? `<a class="btn-ghost" href="${escapeHtml(externalHref)}" target="_blank" rel="noopener">Open link</a>`
    : '';
  const token = getBiscoonToken();
  const currentUserId = getCurrentUserIdFromToken();
  const isOwner = !!(token && currentUserId && listing.userId === currentUserId);
  const messageBtn = getMessagePosterActionMarkup({
    listingId: listing.id || '',
    recipientId: listing.userId || '',
    listingTitle: listing.title || '',
    token,
    isOwner,
    conversationId: listing.existingConversationId || '',
  });
  const reportBtn = token && listing.id
    ? `<button class="btn-ghost" type="button" data-report-target="listing" data-report-id="${escapeHtml(listing.id)}">Report</button>`
    : '';
  const saveBtn = token && listing.id
    ? `<button class="btn-ghost${listing.savedByMe ? ' saved' : ''}" type="button" data-save-listing="${escapeHtml(listing.id)}" data-saved="${listing.savedByMe ? 'true' : 'false'}">${listing.savedByMe ? 'Saved' : 'Save listing'}</button>`
    : '';
  const detailRows = [
    listing.locationType ? ['Location type', listing.locationType] : null,
    listing.availability ? ['Availability', listing.availability] : null,
    listing.priceNote ? ['Price note', listing.priceNote] : null,
    listing.contactPreference ? ['Contact preference', listing.contactPreference] : null,
    Array.isArray(listing.tags) && listing.tags.length ? ['Tags', listing.tags.join(', ')] : null,
  ].filter(Boolean).map(item => {
    const [label, value] = item as [string, string];
    return `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`;
  }).join('');

  return `
    <div class="listing-detail-kicker">${meta.emoji} ${escapeHtml(meta.label)}</div>
    <h2 id="listingModalTitle">${escapeHtml(listing.title || 'Untitled listing')}</h2>
    ${gallery}
    <div class="listing-detail-meta">
      ${isPhotoModal ? '' : `<span>${ICON_PIN}${escapeHtml(listing.location || 'Remote / Flexible')}</span>`}
      <span>${ICON_CLOCK}Posted ${escapeHtml(formatListingDate(listing.createdAt))}</span>
      ${listing.authorName ? `<span>${ICON_PERSON}${escapeHtml(listing.authorName)}</span>` : ''}
      ${listing.subcategory ? `<span>${escapeHtml(listing.subcategory)}</span>` : ''}
    </div>
    ${isPhotoModal ? '' : `<div class="listing-detail-price">${escapeHtml(formatListingPrice(listing.price))}</div>`}
    ${detailRows ? `<div class="listing-detail-meta">${detailRows}</div>` : ''}
    <p>${escapeHtml(listing.description || 'No description provided.')}</p>
    <div class="listing-detail-contact">${saveBtn}${messageBtn}${externalLink}${reportBtn}</div>
    ${(contactPhone || contactEmail) ? `<div class="listing-detail-contact-info">${contactPhone}${contactEmail}</div>` : ''}
    ${renderListingComments(listing)}
  `;
}

async function fetchSavedListingStatus(listingId: string): Promise<boolean> {
  const token = getBiscoonToken();
  if (!token || !listingId) return false;
  const response = await fetch(`${getApiBase()}/api/listings/${encodeURIComponent(listingId)}/save`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return false;
  const data = await response.json();
  return Boolean(data.saved);
}

async function setSavedListingStatus(listingId: string, saved: boolean): Promise<{ saved: boolean }> {
  const token = getBiscoonToken();
  if (!token) {
    window.location.href = getLoginPath(window.location.pathname + window.location.search);
    return { saved: false };
  }
  const response = await fetch(`${getApiBase()}/api/listings/${encodeURIComponent(listingId)}/save`, {
    method: saved ? 'POST' : 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not update saved listing.');
  return data;
}

async function submitReport(targetType: string, targetId: string): Promise<void> {
  const token = getBiscoonToken();
  if (!token) {
    window.location.href = getLoginPath(window.location.pathname + window.location.search);
    return;
  }
  if (document.getElementById('reportDialog')) return;
  const previousFocus = document.activeElement as HTMLElement | null;
  const dialog = document.createElement('dialog');
  dialog.id = 'reportDialog';
  dialog.className = 'guidance-dialog';
  dialog.setAttribute('aria-labelledby', 'reportTitle');
  dialog.innerHTML = `
    <form id="reportForm">
      <h2 id="reportTitle">Report this content</h2>
      <p class="field-guidance">Tell the moderation team what needs attention.</p>
      <label class="form-label" for="reportReason">Reason</label>
      <select class="form-select" id="reportReason" name="reason" required>
        <option value="">Choose a reason</option>
        <option value="spam">Spam or unwanted promotion</option>
        <option value="scam">Scam or fraud</option>
        <option value="harassment">Harassment or abuse</option>
        <option value="illegal">Illegal content</option>
        <option value="misinformation">False or misleading information</option>
        <option value="other">Something else</option>
      </select>
      <label class="form-label" for="reportDetails">Details (optional)</label>
      <textarea class="form-input" id="reportDetails" name="details" rows="4" maxlength="1000" placeholder="Explain what the team should check."></textarea>
      <p id="reportError" role="alert" class="field-guidance-error"></p>
      <div class="guidance-dialog-actions">
        <button type="button" class="btn-ghost" id="reportCancel">Cancel</button>
        <button type="submit" class="btn-primary" id="reportSubmit">Send report</button>
      </div>
    </form>`;
  document.body.append(dialog);
  dialog.addEventListener('close', () => { dialog.remove(); previousFocus?.focus(); });
  dialog.querySelector('#reportCancel')!.addEventListener('click', () => dialog.close());
  dialog.querySelector('form')!.addEventListener('submit', async event => {
    event.preventDefault();
    const button = dialog.querySelector<HTMLButtonElement>('#reportSubmit')!;
    const error = dialog.querySelector<HTMLElement>('#reportError')!;
    button.disabled = true;
    button.textContent = 'Sending…';
    error.textContent = '';
    try {
      const reason = dialog.querySelector<HTMLSelectElement>('#reportReason')!.value;
      const details = dialog.querySelector<HTMLTextAreaElement>('#reportDetails')!.value.trim();
      const response = await fetch(`${getApiBase()}/api/moderation/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetType, targetId, reason, details }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit report. Please try again.');
      dialog.close();
      biscoonToast('Thanks. The report was sent to admins.', 'success');
    } catch (err) {
      error.textContent = err.message || 'Could not send your report. Please try again.';
    } finally {
      button.disabled = false;
      button.textContent = 'Send report';
    }
  });
  dialog.showModal();
}

async function openListingModal(id: string): Promise<void> {
  if (!id) return;
  const modal = ensureListingModal();
  const body = modal.querySelector('#listingModalBody') as HTMLElement;
  modal.classList.add('open');
  document.body.classList.add('listing-modal-open');
  body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Loading listing...</h3></div>';

  try {
    const response = await fetch(`${getApiBase()}/api/listings/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error('Listing not found');
    const listing: Listing = await response.json();
    const token = getBiscoonToken();
    const currentUserId = getCurrentUserIdFromToken();
    if (token && listing.userId && listing.userId !== currentUserId) {
      listing.existingConversationId = await fetchExistingConversationId(listing.id, listing.userId);
    }
    if (token && listing.id) {
      listing.savedByMe = await fetchSavedListingStatus(listing.id);
    }
    body.innerHTML = renderListingModalContent(listing);
  } catch (error) {
    body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Listing not found</h3><p>This listing may have been removed.</p></div>';
  }
}

function bindListingDetailModal(): void {
  document.addEventListener('click', function(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const closeTarget = target.closest('[data-close-listing-modal]');
    if (closeTarget) {
      e.preventDefault();
      closeListingModal();
      return;
    }

    const card = target.closest('.listing-card[data-listing-id]') as HTMLElement | null;
    if (!card) return;
    e.preventDefault();
    openListingModal(card.dataset.listingId || '');
  });

  document.addEventListener('click', async function(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const saveButton = target.closest('[data-save-listing]') as HTMLElement | null;
    if (saveButton) {
      e.preventDefault();
      const listingId = saveButton.dataset.saveListing || '';
      const nextSaved = saveButton.dataset.saved !== 'true';
      (saveButton as HTMLButtonElement).disabled = true;
      try {
        const data = await setSavedListingStatus(listingId, nextSaved);
        saveButton.dataset.saved = data.saved ? 'true' : 'false';
        saveButton.classList.toggle('saved', Boolean(data.saved));
        saveButton.textContent = data.saved ? 'Saved' : 'Save listing';
      } catch (error: any) {
        biscoonToast(error.message, 'error');
      } finally {
        (saveButton as HTMLButtonElement).disabled = false;
      }
      return;
    }

    const reportButton = target.closest('[data-report-target][data-report-id]') as HTMLElement | null;
    if (!reportButton) return;
    e.preventDefault();
    try {
      await submitReport(reportButton.dataset.reportTarget || '', reportButton.dataset.reportId || '');
    } catch (error: any) {
      biscoonToast(error.message, 'error');
    }
  });

  document.addEventListener('submit', async function(e: Event) {
    const target = e.target as HTMLElement;
    const form = target.closest('[data-listing-comment-form]') as HTMLElement | null;
    if (!form) return;
    e.preventDefault();
    const listingId = form.dataset.listingCommentForm || '';
    const textarea = form.querySelector('textarea') as HTMLTextAreaElement | null;
    const parentIdInput = form.querySelector('[name="parentId"]') as HTMLInputElement | null;
    const parentId = parentIdInput?.value || '';
    const body = textarea ? textarea.value.trim() : '';
    if (!body) return;

    try {
      const listing = await postListingComment(listingId, body, parentId);
      const token = getBiscoonToken();
      const currentUserId = getCurrentUserIdFromToken();
      if (token && listing && listing.userId && listing.userId !== currentUserId) {
        listing.existingConversationId = await fetchExistingConversationId(listing.id, listing.userId);
      }
      if (token && listing && listing.id) {
        listing.savedByMe = await fetchSavedListingStatus(listing.id);
      }
      const modalBody = document.getElementById('listingModalBody');
      if (modalBody && document.getElementById('listingModal')?.classList.contains('open')) {
        if (listing) modalBody.innerHTML = renderListingModalContent(listing);
      } else {
        await hydrateListingDetail();
      }
      biscoonToast('Comment posted.', 'success');
    } catch (error: any) {
      biscoonToast(error.message, 'error');
    }
  });

  document.addEventListener('click', function(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const replyButton = target.closest('[data-listing-reply-target]') as HTMLElement | null;
    if (replyButton) {
      const replyTarget = replyButton.dataset.listingReplyTarget || '';
      const form = document.querySelector(`[data-listing-reply-form="${CSS.escape(replyTarget)}"]`);
      document.querySelectorAll('[data-listing-reply-form].open').forEach(openForm => {
        if (openForm !== form) openForm.classList.remove('open');
      });
      if (form) form.classList.toggle('open');
      return;
    }

    const cancelButton = target.closest('[data-cancel-listing-reply]') as HTMLElement | null;
    if (cancelButton) {
      const cancelTarget = cancelButton.dataset.cancelListingReply || '';
      const form = document.querySelector(`[data-listing-reply-form="${CSS.escape(cancelTarget)}"]`);
      if (form) form.classList.remove('open');
    }
  });

  document.addEventListener('keydown', function(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      const sendModal = document.getElementById('biscoonSendMsgModal');
      if (sendModal) { sendModal.remove(); return; }
      closeListingModal();
    }
  });
}

function renderListings(listings: Listing[], target: Element | null = getDynamicListingsContainer()): void {
  if (!target) return;
  const { feed, controls } = ensureListingsShell(target);
  browseSession = {
    category: '',
    subcategory: '',
    search: '',
    page: 1,
    pages: 1,
    total: listings.length,
    sort: getActiveSortValue(),
    items: listings,
  };
  renderListingsIntoFeed(listings, feed, false);
  updateListingsControls(controls, browseSession);
}

function formatDynamicChipLabel(value: string): string {
  return String(value || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function updateFilterChipsFromListings(listings: Listing[]): void {
  const group = document.querySelector('.filter-chips') as HTMLElement | null;
  if (!group || group.dataset.staticFilters === 'true') return;
  if (group.dataset.dynamicFiltersBuilt === 'true') return;

  const subcategories = Array.from(new Set(
    listings
      .map(listing => listing.subcategory)
      .filter(Boolean)
  )).sort((a, b) => (a as string).localeCompare(b as string)) as string[];

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

function updateHeroStats(stats: ListingStats, category = inferPageCategory()): void {
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

function updateSidebarStats(stats: ListingStats, category = inferPageCategory()): void {
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

function updateHomeStats(stats: ListingStats): void {
  const listingStatRows = Array.from(document.querySelectorAll('.widget-row'));
  listingStatRows.forEach(row => {
    const label = row.querySelector('.lbl')?.textContent.toLowerCase() || '';
    const value = row.querySelector('.val');
    if (!value) return;

    if (label.includes('active listings')) value.textContent = formatCount(stats.total);
    if (label.includes('pg rooms')) value.textContent = formatCount(stats.byCategory?.pg || stats.byCategory?.['paying-guest'] || 0);
  });
}

async function hydrateDynamicStats(category = inferPageCategory()): Promise<void> {
  try {
    const stats = await fetchListingStats();
    updateHeroStats(stats, category);
    updateSidebarStats(stats, category);
    updateHomeStats(stats);
  } catch (error) {
    console.error(error);
  }
}

function renderSearchResults(listings: Listing[], search = '', category = '', discussions: Discussion[] = []): void {
  const panel = document.getElementById('searchResultsPanel');
  const meta = document.getElementById('searchResultsMeta');
  const container = document.getElementById('searchResultsContainer');
  if (!panel || !meta || !container) {
    renderListings(listings);
    return;
  }

  const totalResults = listings.length + discussions.length;
  const queryText = search ? ` for "${search}"` : '';
  const categoryText = category && category !== 'all'
    ? ` in ${category === 'discussions' ? 'Discussions' : getCategoryMeta(category).label}`
    : '';
  const listingText = listings.length === 1 ? '1 listing' : `${listings.length} listings`;
  const discussionText = discussions.length === 1 ? '1 discussion' : `${discussions.length} discussions`;

  meta.textContent = totalResults
    ? `Showing ${listingText} and ${discussionText}${queryText}${categoryText}.`
    : `No results found${queryText}${categoryText}. Try a broader keyword or different category.`;

  container.innerHTML = totalResults
    ? `${listings.map(listingToCard).join('')}${discussions.map(discussionToSearchCard).join('')}`
    : '<div class="search-results-empty">No matching listings or discussions. Adjust your search and try again.</div>';

  panel.style.display = 'block';
  requestAnimationFrame(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function clearSearch(): void {
  const input = document.getElementById('searchInput') as HTMLInputElement | null;
  const select = document.getElementById('searchCategory') as HTMLSelectElement | null;
  const panel = document.getElementById('searchResultsPanel');
  if (input) input.value = '';
  if (select) select.value = '';
  if (panel) panel.style.display = 'none';
}

function getFilterFromButton(button: HTMLElement | null): string {
  if (!button) return 'all';
  if (button.dataset.filter) return button.dataset.filter;
  const onclick = button.getAttribute('onclick') || '';
  const match = onclick.match(/'([^']+)'/);
  return match ? match[1] : 'all';
}

async function setFilter(button: HTMLElement | null, category: string): Promise<void> {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  });
  if (button) {
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
  }

  try {
    await hydrateDynamicListings(category === 'all' ? '' : category, { page: 1, append: false });
    document.getElementById('listingsContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error(error);
    filterListings(category);
  }
}

function readHomeFeedTarget(el: HTMLElement): {
  category: string;
  subcategory: string;
  search: string;
  title: string;
  moreHref: string;
} | null {
  const node = el.closest('[data-feed-cat]') as HTMLElement | null;
  if (!node) return null;
  const rawCat = node.dataset.feedCat || '';
  const rawSub = node.dataset.feedSub || '';
  const scope = getListingScopeForCategory(rawSub || rawCat);
  return {
    category: scope.category || rawCat,
    subcategory: scope.subcategory || (rawSub && rawSub !== rawCat ? rawSub : ''),
    search: node.dataset.feedSearch || '',
    title: node.dataset.feedTitle || node.textContent?.trim() || 'Listings',
    moreHref: node.dataset.feedMore || (node as HTMLAnchorElement).href || '#',
  };
}

async function showHomeInlineFeed(opts: {
  category: string;
  subcategory: string;
  search: string;
  title: string;
  moreHref: string;
}): Promise<void> {
  const panel = document.getElementById('homeInlineFeed');
  const body = document.getElementById('homeInlineFeedBody');
  const titleEl = document.getElementById('homeInlineFeedTitle');
  const more = document.getElementById('homeInlineFeedMore') as HTMLAnchorElement | null;
  if (!panel || !body || !titleEl) return;

  panel.hidden = false;
  titleEl.textContent = opts.title;
  if (more) more.href = opts.moreHref || '#';
  body.innerHTML = listingSkeletons(4);

  try {
    const listings = await fetchListings(opts.category, opts.search, 12, opts.subcategory);
    if (!listings.length) {
      body.innerHTML = `
        <div class="empty-state" style="padding:28px 16px">
          <div class="icon">📭</div>
          <h3>No ads yet</h3>
          <p>Be the first to post in this section.</p>
          <a class="btn-primary" href="${getPostListingPath(opts.subcategory || opts.category)}">+ Post Free Ad</a>
        </div>`;
    } else {
      body.innerHTML = listings.map(listingToCard).join('');
    }
  } catch {
    body.innerHTML = `<div class="empty-state" style="padding:28px 16px"><h3>Couldn’t load listings</h3><p>Try again in a moment.</p></div>`;
  }

  requestAnimationFrame(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
}

type HomeNewsArticle = {
  id?: string;
  slug?: string;
  title?: string;
  summary?: string;
  category?: string;
  featured?: boolean;
  imageUrl?: string;
  sourceName?: string;
  authorName?: string;
  publishedAt?: string;
  createdAt?: string;
};

function newsArticleHref(article: HomeNewsArticle): string {
  const slug = String(article.slug || '').trim();
  return slug ? `pages/news/article.html?story=${encodeURIComponent(slug)}` : 'pages/news/index.html';
}

function homeNewsCategoryLabel(category = ''): string {
  const value = String(category || 'news').trim().toLowerCase();
  if (value === 'usa') return 'USA';
  if (!value) return 'News';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function newsCategoryTone(category = '', index = 0): string {
  const value = String(category || '').toLowerCase();
  if (value === 'immigration' || value === 'culture') return 'purple';
  if (value === 'community' || value === 'business') return 'teal';
  return index % 3 === 1 ? 'teal' : index % 3 === 2 ? 'purple' : '';
}

function newsRelativeTime(value?: string): string {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? 'Yesterday' : `${days} days ago`;
  return formatListingDate(value);
}

function newsThumb(article: HomeNewsArticle): string {
  if (article.imageUrl) {
    return `<img src="${escapeHtml(article.imageUrl)}" alt="${escapeHtml(article.title || 'News')}" loading="lazy">`;
  }
  return '<span class="ni-placeholder" aria-hidden="true">B<span>NEWS</span></span>';
}

function renderHomeNewsItem(article: HomeNewsArticle): string {
  const when = newsRelativeTime(article.publishedAt || article.createdAt);
  return `
    <a class="n-item" href="${newsArticleHref(article)}">
      <div class="ni-thumb">${newsThumb(article)}</div>
      <div class="ni-content">
        <div class="ni-cat">${escapeHtml(homeNewsCategoryLabel(article.category))}</div>
        <h3 class="ni-title">${escapeHtml(article.title || 'Untitled story')}</h3>
        <div class="ni-meta">${escapeHtml(when || 'Biscoon Newsroom')}</div>
      </div>
    </a>`;
}

function renderHomeFeatured(article: HomeNewsArticle | null): string {
  if (!article) {
    return `<div class="home-news-empty">No featured stories yet. <a href="pages/news/index.html">Browse news →</a></div>`;
  }
  const when = newsRelativeTime(article.publishedAt || article.createdAt);
  const media = article.imageUrl
    ? `<img src="${escapeHtml(article.imageUrl)}" alt="${escapeHtml(article.title || 'News')}">`
    : 'B';
  return `
    <a class="feat-story" href="${newsArticleHref(article)}">
      <div class="feat-img">${media}</div>
      <div class="feat-cat">Top Story · ${escapeHtml(homeNewsCategoryLabel(article.category))}</div>
      <div class="feat-title">${escapeHtml(article.title || 'Untitled story')}</div>
      <div class="feat-meta">
        <span>${escapeHtml(article.sourceName || article.authorName || 'Biscoon Newsroom')}</span>
        ${when ? `<span>·</span><span>${escapeHtml(when)}</span>` : ''}
        ${article.featured ? '<span class="feat-badge">Featured</span>' : ''}
      </div>
    </a>`;
}

function renderHomeNewsTicker(articles: HomeNewsArticle[]): string {
  const items = articles.slice(0, 12);
  if (!items.length) {
    return `<span class="t-item">No headlines yet — check back soon &nbsp;<span class="t-sep">◆</span></span>`;
  }
  const html = items.map(article =>
    `<span class="t-item"><a href="${newsArticleHref(article)}">${escapeHtml(article.title || 'Untitled')}</a> &nbsp;<span class="t-sep">◆</span></span>`
  ).join('');
  // Duplicate for seamless CSS loop
  return html + html;
}

function initHomeNewsTicker(): void {
  const ticker = document.getElementById('homeNewsTicker');
  if (!ticker || ticker.dataset.newsTickerBound === 'true') return;
  ticker.dataset.newsTickerBound = 'true';
  let loading = false;

  const refresh = async (): Promise<void> => {
    if (loading || document.hidden) return;
    loading = true;
    ticker.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(`${getApiBase()}/api/news?sort=latest&limit=12`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load headlines.');
      const data = await response.json();
      if (!Array.isArray(data.news)) throw new Error('Invalid news response.');
      const html = renderHomeNewsTicker(data.news);
      // Preserve the scroll position when the headlines have not changed.
      if (ticker.innerHTML !== html) ticker.innerHTML = html;
    } catch {
      ticker.innerHTML = '<span class="t-item"><a href="pages/news/index.html">Headlines unavailable. Visit the News page.</a></span>';
    } finally {
      loading = false;
      ticker.setAttribute('aria-busy', 'false');
    }
  };

  void refresh();
  window.setInterval(() => { void refresh(); }, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refresh();
  });
}

function renderRecentPost(listing: Listing): string {
  const category = listing.category || 'other';
  const image = Array.isArray(listing.images) ? listing.images[0] : '';
  const meta = [getCategoryMeta(category).label, listing.location, formatListingDate(listing.createdAt)].filter(Boolean);
  return `<a class="home-recent-post" href="${getListingPageHref(listing.id || '')}">
    <span class="home-recent-thumb">${image
      ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" width="64" height="64">`
      : getDefaultListingImageMarkup(category)}</span>
    <span class="home-recent-content">
      <span class="home-recent-title">${escapeHtml(listing.title || 'Untitled listing')}</span>
      <span class="home-recent-meta">${escapeHtml(meta.join(' · '))}</span>
      ${listing.price && category !== 'photography' ? `<span class="home-recent-price">${escapeHtml(formatListingPrice(listing.price))}</span>` : ''}
    </span>
  </a>`;
}

async function initHomeRecentPosts(): Promise<void> {
  const target = document.getElementById('homeRecentPosts');
  if (!target) return;
  target.setAttribute('aria-busy', 'true');
  target.innerHTML = '<p class="home-recent-status">Loading recent posts...</p>';
  try {
    const { listings } = await fetchListingsPage({ page: 1, limit: 6, sort: 'newest' });
    target.innerHTML = listings.length
      ? listings.map(renderRecentPost).join('')
      : '<p class="home-recent-status">No posts yet. <a href="/pages/post/listing.html">Create the first post</a></p>';
  } catch {
    target.innerHTML = '<div class="home-recent-status"><p>Recent posts could not be loaded.</p><button class="btn-ghost" type="button">Try again</button></div>';
    target.querySelector('button')?.addEventListener('click', () => { void initHomeRecentPosts(); });
  } finally {
    target.setAttribute('aria-busy', 'false');
  }
}

async function initHomeNews(): Promise<void> {
  if (!document.body.classList.contains('is-home')) return;
  const featured = document.getElementById('homeFeaturedStory');
  const list = document.getElementById('homeBiscoonList');
  if (!featured && !list) return;
  try {
    const response = await fetch(`${getApiBase()}/api/news?sort=latest&limit=12`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load news.');
    const articles = (Array.isArray(data.news) ? data.news : []) as HomeNewsArticle[];
    const lead = articles[0] || null;
    if (featured) featured.innerHTML = renderHomeFeatured(lead);
    const remaining = featured ? articles.slice(1) : articles;
    if (list) list.innerHTML = remaining.length
      ? remaining.slice(0, 6).map(article => renderHomeNewsItem(article)).join('')
      : `<div class="home-news-empty">${lead ? 'You’re caught up. More stories coming soon.' : 'New stories will appear here when published.'}</div>`;
  } catch {
    if (featured) featured.innerHTML = '<div class="home-news-empty">Couldn’t load news. <a href="pages/news/index.html">Open newsroom →</a></div>';
    if (list) list.innerHTML = '<div class="home-news-empty">Couldn’t load stories. <a href="pages/news/index.html">Browse Biscoon News →</a></div>';
  }
}

function initHomeInlineFeed(): void {
  const panel = document.getElementById('homeInlineFeed');
  if (!panel || !document.body.classList.contains('is-home')) return;

  document.getElementById('homeInlineFeedClose')?.addEventListener('click', () => {
    panel.hidden = true;
  });

  const openFrom = (el: HTMLElement) => {
    const opts = readHomeFeedTarget(el);
    if (!opts) return;
    void showHomeInlineFeed(opts);
  };

  document.querySelectorAll<HTMLElement>('.home-feed-trigger').forEach(hdr => {
    const fire = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const card = hdr.closest('[data-feed-cat]') as HTMLElement | null;
      if (card) openFrom(card);
    };
    hdr.addEventListener('click', fire);
    hdr.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') fire(e);
    });
  });

  document.querySelector('.right-panel')?.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement | null;
    const hit = target?.closest('[data-feed-cat]') as HTMLElement | null;
    if (!hit) return;
    // Don't hijack post CTAs or external/dropdown menus
    if (target?.closest('.ch-sub, .dd-menu, .dropdown')) return;
    if (!hit.matches('.chip, .bz-item, .qcard, a.pill[data-feed-cat], .card[data-feed-cat]')) {
      // allow header-triggered cards only via .home-feed-trigger
      if (!target?.closest('.home-feed-trigger')) return;
    }
    if (hit.matches('a.pill') && hit.closest('.dropdown')) return;
    e.preventDefault();
    openFrom(hit);
  });
}

function bindHomeFilterButtons(): void {
  document.querySelectorAll<HTMLElement>('.filter-bar .filter-btn[data-filter]').forEach(btn => {
    if (btn.dataset.filterBound === 'true') return;
    btn.dataset.filterBound = 'true';
    btn.addEventListener('click', () => {
      void setFilter(btn, btn.dataset.filter || 'all');
    });
  });
}

(window as Window & { setFilter?: typeof setFilter }).setFilter = setFilter;

async function hydrateDynamicListings(
  category = inferPageCategory(),
  options: { page?: number; append?: boolean } = {},
): Promise<void> {
  const target = getDynamicListingsContainer();
  if (!target) return;
  const page = Math.max(1, options.page || 1);
  const append = Boolean(options.append);
  const requestId = ++browseRequestId;
  const sort = getActiveSortValue();

  try {
    const { feed, controls } = ensureListingsShell(target);
    (target as HTMLElement).dataset.dynamicState = append ? 'live' : 'loading';
    if (!append) feed.innerHTML = listingSkeletons();

    const query = resolveBrowseQuery(category);
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = getListingScopeForCategory(params.get('category') || '').category;
    const activeHomeFilter = document.querySelector('.filter-btn.active') as HTMLElement | null;
    if (requestedCategory && activeHomeFilter) {
      document.querySelectorAll('.filter-btn').forEach(btn => {
        const btnEl = btn as HTMLElement;
        btnEl.classList.toggle(
          'active',
          getListingScopeForCategory(getFilterFromButton(btnEl)).category === requestedCategory,
        );
      });
    }

    const data = await fetchListingsPage({
      category: query.category,
      subcategory: query.subcategory,
      search: query.search,
      page,
      limit: LISTINGS_PAGE_SIZE,
      sort,
    });
    if (requestId !== browseRequestId) return;

    if (append && browseSession) {
      browseSession = {
        ...browseSession,
        ...query,
        page: data.page,
        pages: data.pages,
        total: data.total,
        sort,
        items: [...browseSession.items, ...data.listings],
      };
      renderListingsIntoFeed(browseSession.items, feed, false);
    } else {
      browseSession = {
        ...query,
        page: data.page,
        pages: data.pages,
        total: data.total,
        sort,
        items: data.listings,
      };
      renderListingsIntoFeed(data.listings, feed, false);
    }

    updateListingsControls(controls, browseSession);

    if (!append && window.location.hash === '#listings') {
      target.closest('#listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    if (requestId !== browseRequestId) return;
    console.error(error);
    const feed = document.getElementById('listingsFeed');
    if (feed && !append) {
      feed.innerHTML = `
        <div class="empty-state">
          <div class="icon">⚠️</div>
          <h3>Could not load listings</h3>
          <p>Check your connection and try again.</p>
        </div>
      `;
    }
  }
}

function getActiveChipFilter(): string {
  const activeChip = document.querySelector('.filter-chips .chip.active[data-filter]') as HTMLElement | null;
  const filter = activeChip ? activeChip.dataset.filter : '';
  return filter && filter !== 'all' ? filter : '';
}

function bindDynamicFilterChips(): void {
  document.querySelectorAll('.chip[data-filter]').forEach(chip => {
    const chipEl = chip as HTMLElement;
    if (chipEl.dataset.dynamicFilterBound) return;
    chipEl.dataset.dynamicFilterBound = 'true';
    chipEl.addEventListener('click', async function (this: HTMLElement) {
      const group = this.closest('.filter-chips');
      if (group) group.querySelectorAll('.chip').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-pressed', 'true');

      const filter = this.dataset.filter || 'all';
      if (this.dataset.filterMode !== 'search') {
        syncSubcategoryUrl(filter === 'all' ? '' : filter);
      }

      const target = getDynamicListingsContainer();
      if (!target) {
        filterListings(filter);
        return;
      }

      await hydrateDynamicListings(inferPageCategory());
    });
  });
}

async function hydrateListingDetail(): Promise<void> {
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
    const listing: Listing = await response.json();
    const meta = getCategoryMeta(listing.category || 'other');
    const listingDescription = (listing.description || '').replace(/\s+/g, ' ').trim().slice(0, 155)
      || `${meta.label} listing on Biscoon.`;
    updatePageMeta({
      title: `${listing.title || 'Listing'} — Biscoon`,
      description: listingDescription,
      url: `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(listing.id || id)}`,
    });
    const isPhotographyListing = listing.category === 'photography';
    const detailImages = Array.isArray(listing.images) ? listing.images : [];
    const detailGalleryClass = isPhotographyListing && detailImages.length > 1
      ? 'listing-detail-gallery photo-detail-gallery'
      : 'listing-detail-gallery';
    // No photos: skip the gallery entirely rather than stretching a single emoji to fill a
    // full-width 4:3 box — most jobs/services ads have no photo, and that's normal, not broken.
    const gallery = detailImages.length
      ? `<div class="${detailGalleryClass}" data-pswp-gallery>${detailImages.map((image, index) => `<a href="${escapeHtml(image)}" data-pswp-src="${escapeHtml(image)}"${isPhotographyListing && index === 0 ? ' class="photo-hero-slot"' : ''} aria-label="Open image ${index + 1}"><img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title || 'Listing image')}" loading="lazy"></a>`).join('')}</div>`
      : '';
    const externalHref = safeExternalHref(listing.externalLink);
    const externalLink = !isPhotographyListing && externalHref
      ? `<a class="btn-ghost" href="${escapeHtml(externalHref)}" target="_blank" rel="noopener">Open link</a>`
      : '';
    const detailToken = getBiscoonToken();
    const detailUserId = getCurrentUserIdFromToken();
    const isDetailOwner = !!(detailToken && detailUserId && listing.userId === detailUserId);
    if (!isPhotographyListing && detailToken && listing.userId && !isDetailOwner) {
      listing.existingConversationId = await fetchExistingConversationId(listing.id, listing.userId);
    }
    if (detailToken && listing.id) {
      listing.savedByMe = await fetchSavedListingStatus(listing.id);
    }
    const detailSaveBtn = detailToken && listing.id
      ? `<button class="btn-ghost${listing.savedByMe ? ' saved' : ''}" type="button" data-save-listing="${escapeHtml(listing.id)}" data-saved="${listing.savedByMe ? 'true' : 'false'}">${listing.savedByMe ? 'Saved' : 'Save listing'}</button>`
      : '';
    const detailMessageBtn = isPhotographyListing ? '' : getMessagePosterActionMarkup({
      listingId: listing.id || '',
      recipientId: listing.userId || '',
      listingTitle: listing.title || '',
      token: detailToken,
      isOwner: isDetailOwner,
      conversationId: listing.existingConversationId || '',
    });
    const detailActions = [detailSaveBtn, detailMessageBtn, externalLink].filter(Boolean).join('');
    const contactInfo = [
      !isPhotographyListing && listing.contactPhone ? `<a class="contact-chip" href="tel:${escapeHtml(listing.contactPhone)}">${ICON_PHONE}${escapeHtml(listing.contactPhone)}</a>` : '',
      !isPhotographyListing && listing.contactEmail ? `<a class="contact-chip" href="mailto:${escapeHtml(listing.contactEmail)}">${ICON_MAIL}${escapeHtml(listing.contactEmail)}</a>` : '',
    ].filter(Boolean).join('');
    const mapHref = listing.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.location)}`
      : '';
    const mapBlock = !isPhotographyListing && listing.location ? `
      <div class="listing-map-shell" data-listing-map data-location="${escapeHtml(listing.location)}">
        <div class="listing-map-canvas" data-map-canvas></div>
        <div class="listing-map-meta">
          <span>Approximate area: ${escapeHtml(listing.location)}</span>
          <a href="${escapeHtml(mapHref)}" target="_blank" rel="noopener">Open full map</a>
        </div>
      </div>
    ` : '';
    const detailRows = [
      !isPhotographyListing && listing.locationType ? ['Location type', listing.locationType] : null,
      !isPhotographyListing && listing.availability ? ['Availability', listing.availability] : null,
      !isPhotographyListing && listing.priceNote ? ['Price note', listing.priceNote] : null,
      !isPhotographyListing && listing.contactPreference ? ['Contact preference', listing.contactPreference] : null,
      Array.isArray(listing.tags) && listing.tags.length ? ['Tags', listing.tags.join(', ')] : null,
    ].filter(Boolean).map(item => {
      const [label, value] = item as [string, string];
      return `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`;
    }).join('');
    target.innerHTML = `
      <article class="listing-detail-card">
        <div class="listing-detail-kicker">${meta.emoji} ${escapeHtml(meta.label)}</div>
        <h1>${escapeHtml(listing.title || 'Untitled listing')}</h1>
        ${gallery}
        <div class="listing-detail-meta">
          ${isPhotographyListing ? '<span>Photo showcase</span>' : `<span>${ICON_PIN}${escapeHtml(listing.location || 'Remote / Flexible')}</span>`}
          <span>${ICON_CLOCK}Posted ${escapeHtml(formatListingDate(listing.createdAt))}</span>
          ${listing.authorName ? `<span>${ICON_PERSON}${escapeHtml(listing.authorName)}</span>` : ''}
          ${listing.subcategory ? `<span>${escapeHtml(listing.subcategory)}</span>` : ''}
        </div>
        ${isPhotographyListing ? '' : `<div class="listing-detail-price">${escapeHtml(formatListingPrice(listing.price))}</div>`}
        ${detailRows ? `<div class="listing-detail-meta">${detailRows}</div>` : ''}
        <p>${escapeHtml(listing.description || 'No description provided.')}</p>
        ${detailActions ? `<div class="listing-detail-contact">${detailActions}</div>` : ''}
        ${contactInfo ? `<div class="listing-detail-contact-info">${contactInfo}</div>` : ''}
        ${mapBlock}
        ${renderListingComments(listing)}
      </article>
    `;
  } catch (error) {
    target.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Listing not found</h3><p>This listing may have been removed.</p></div>';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // Seed listing search from ?q= / ?search=
  const urlQ = new URLSearchParams(window.location.search).get('q')
    || new URLSearchParams(window.location.search).get('search');
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  if (urlQ && searchInput && !searchInput.value) searchInput.value = urlQ;
  if (searchInput && document.getElementById('listingsFeed')) {
    let timer: number | undefined;
    searchInput.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        hydrateDynamicListings(inferPageCategory(), { page: 1, append: false });
      }, 280);
    });
  }

  bindHomeFilterButtons();
  syncChipsFromUrl();
  bindDynamicFilterChips();
  hydrateDynamicListings();
  hydrateListingDetail();
  hydrateDynamicStats();
});

// ── Heatmap ──
function buildHeatmap(): void {
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
function scrollTo(id: string): void {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Message Poster button handler ──
window._openMsgModal = function(btn: HTMLElement): void {
  const listingId = btn.dataset.msgListingId || '';
  const recipientId = btn.dataset.msgRecipientId || '';
  const listingTitle = btn.dataset.msgListingTitle || '';
  if (!getBiscoonToken()) {
    window.location.href = getLoginPath(window.location.href);
    return;
  }
  biscoonOpenSendMessageModal({ listingId, recipientId, listingTitle });
};

function biscoonOpenSendMessageModal({ listingId, recipientId, listingTitle }: { listingId: string; recipientId: string; listingTitle: string }): void {
  const existing = document.getElementById('biscoonSendMsgModal');
  if (existing) existing.remove();

  function esc(v: string): string { return escapeHtml(v); }
  const modal = document.createElement('div');
  modal.id = 'biscoonSendMsgModal';
  modal.className = 'messages-send-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="position:absolute;inset:0;background:rgba(0,0,0,.45)" id="biscoonSendMsgBackdrop"></div>
    <div style="position:relative;z-index:1;background:white;border-radius:12px;padding:28px;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,.18);margin:0 16px" role="dialog" aria-modal="true">
      <h3 style="font-family:Inter,sans-serif;font-size:24px;color:var(--navy);margin-bottom:6px">Message Poster</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:18px">About: ${esc(listingTitle || 'this listing')}</p>
      <div id="biscoonSendMsgError" style="display:none;font-size:13px;color:var(--red);margin-bottom:10px"></div>
      <label for="biscoonSendMsgBody">Your message</label><textarea id="biscoonSendMsgBody" placeholder="Write your message…" rows="4" style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:12px;font-size:14px;font-family:inherit;resize:vertical;min-height:90px;outline:none;margin-bottom:14px;transition:border-color .15s"></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn-ghost" type="button" id="biscoonSendMsgCancel">Cancel</button>
        <button class="btn-primary" type="button" id="biscoonSendMsgSubmit">Send Message</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => { const m = document.getElementById('biscoonSendMsgModal'); if (m) m.remove(); };
  (document.getElementById('biscoonSendMsgBackdrop') as HTMLElement).addEventListener('click', closeModal);
  (document.getElementById('biscoonSendMsgCancel') as HTMLButtonElement).addEventListener('click', closeModal);

  const textarea = document.getElementById('biscoonSendMsgBody') as HTMLTextAreaElement | null;
  if (textarea) textarea.focus();

  (document.getElementById('biscoonSendMsgSubmit') as HTMLButtonElement).addEventListener('click', async function(this: HTMLButtonElement) {
    const body = ((document.getElementById('biscoonSendMsgBody') as HTMLTextAreaElement | null)?.value || '').trim();
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
      cacheConversationStatus(listingId, recipientId, data.conversationId || '');
      closeModal();
      window.location.href = `${getRelativeAuthPath('messages.html')}?id=${encodeURIComponent(data.conversationId)}`;
    } catch (err: any) {
      if (errEl) { errEl.textContent = err.message; errEl.style.display = ''; }
      this.disabled = false;
      this.textContent = 'Send Message';
    }
  });
}
