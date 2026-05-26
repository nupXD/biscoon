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
  initScrollProgress();

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
      } else {
        window.location.href = `../../index.html?search=${encodeURIComponent(query)}`;
      }
    });
  });

  // ── Geolocation ──
  const changeLocBtn = document.getElementById('changeLocation');
  if (changeLocBtn) {
    changeLocBtn.addEventListener('click', function (e: Event) {
      e.preventDefault();
      const loading = document.getElementById('locationLoading');
      const cond = document.getElementById('weatherCondition');
      if (loading) { loading.textContent = ' · Detecting…'; loading.style.display = 'inline'; }
      if (cond) cond.textContent = 'Updating…';
      detectLocationAndWeather().finally(() => {
        if (loading) loading.style.display = 'none';
      });
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

  // ── Weather ──
  loadWeather();

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

async function fetchWeatherForCoords(lat: number, lon: number, cityLabel: string): Promise<void> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', 'temperature_2m,weathercode,windspeed_10m,winddirection_10m,relativehumidity_2m');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('windspeed_unit', 'mph');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '1');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Weather API error');
  const data = await res.json();

  const cur = data.current;
  const daily = data.daily;
  const code = cur.weathercode;
  const meta = WMO_CODES[code] || { label: 'Unknown', emoji: '🌡️' };
  const temp = Math.round(cur.temperature_2m);
  const high = Math.round(daily.temperature_2m_max[0]);
  const low  = Math.round(daily.temperature_2m_min[0]);
  const wind = Math.round(cur.windspeed_10m);
  const dir  = windDegreesToCardinal(cur.winddirection_10m);

  updateWeatherWidget({
    icon:      meta.emoji,
    temp:      temp + '°F',
    condition: meta.label,
    city:      cityLabel,
    humidity:  cur.relativehumidity_2m + '%',
    wind:      wind + ' mph ' + dir,
    high:      high + '°',
    low:       low + '°',
  });
}

const WEATHER_DEFAULT: WeatherCoords = { lat: 42.3601, lon: -71.0589, city: 'Boston, Massachusetts' };

async function detectLocationAndWeather(): Promise<void> {
  let coords: WeatherCoords = WEATHER_DEFAULT;

  // Try IP geolocation — if it fails we still show weather for the default city
  try {
    const geo = await Promise.race([
      fetch('https://ipapi.co/json/').then(r => r.json()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ]) as any;
    if (geo && geo.latitude && geo.longitude && geo.city) {
      const region = geo.region || geo.region_code || '';
      coords = {
        lat: geo.latitude,
        lon: geo.longitude,
        city: geo.city + (region ? ', ' + region : ''),
      };
      const el = document.getElementById('cityName');
      if (el) el.textContent = coords.city;
    }
  } catch {
    // Location detection failed — use default coords, weather still loads
  }

  // Always attempt to fetch weather, even on location failure
  try {
    await fetchWeatherForCoords(coords.lat, coords.lon, coords.city);
  } catch {
    const cond = document.getElementById('weatherCondition');
    if (cond) cond.textContent = 'Unavailable';
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
        <span class="site-banner-title">${announcement.title}</span>${announcement.body}
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
      const cta = s.ctaText && s.ctaUrl ? safeUrl(s.ctaUrl) : '';
      const typeLabel = ({ ad: 'AD', event: 'EVENT', news: 'NEWS', promo: 'PROMO' })[s.type || 'ad'] || 'AD';
      const badgeHtml = s.badgeText
        ? `<span class="spotlight-badge" style="background:${escapeHtml(s.badgeColor || '#C0392B')}">${escapeHtml(s.badgeText)}</span>`
        : `<span class="spotlight-badge spotlight-badge-type">${typeLabel}</span>`;
      const ctaHtml = cta
        ? `<a href="${escapeHtml(cta)}" class="spotlight-cta" rel="noopener">${escapeHtml(s.ctaText!)}</a>`
        : '';
      // Use double quotes for style attribute; encode only " in URL to avoid breaking attribute boundary
      const cssImg = img.replace(/"/g, '%22');
      return `<div class="swiper-slide spotlight-slide" style="background-image:url(&quot;${cssImg}&quot;)">
        <div class="spotlight-overlay"></div>
        <div class="spotlight-content">
          ${badgeHtml}
          <h2 class="spotlight-title">${escapeHtml(s.title)}</h2>
          ${s.subtitle ? `<p class="spotlight-subtitle">${escapeHtml(s.subtitle)}</p>` : ''}
          ${s.body ? `<p class="spotlight-body">${escapeHtml(s.body)}</p>` : ''}
          ${ctaHtml}
        </div>
      </div>`;
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
    }

    wrap.appendChild(swiperDiv);

    // Activate 2-column hero layout
    document.getElementById('heroSection')?.classList.add('hero--has-spotlight');

    const Swiper = (window as any).Swiper;
    if (!Swiper) return;
    new Swiper('.spotlight-swiper', {
      loop: spotlights.length > 1,
      autoplay: spotlights.length > 1
        ? { delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true }
        : false,
      speed: 700,
      pagination: spotlights.length > 1 ? { el: '.spotlight-pagination', clickable: true } : false,
      keyboard: { enabled: true },
      a11y: { enabled: true },
    });
  } catch (_) {}
}

// ── Auth functions ──
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
        visibleDropdowns.add(dropdown);
      }
    });
    userDropdowns.forEach(el => {
      if (!visibleDropdowns.has(el)) (el as HTMLElement).style.display = 'none';
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
    userDropdowns.forEach(el => { (el as HTMLElement).style.display = 'none'; });
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
  const activeChip = document.querySelector('.filter-chips .chip.active[data-filter]') as HTMLElement | null;
  const chipFilter = activeChip ? activeChip.dataset.filter : '';
  return {
    category: scope.category,
    subcategory: chipFilter && chipFilter !== 'all' ? chipFilter : scope.subcategory,
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
    const action = target.closest('button, a') as HTMLElement | null;
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
        alert('Search results are available, but the current page cannot render them.');
      }
    })
    .catch(() => {
      alert('Unable to perform search at this time.');
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
    <button class="${token ? 'btn-primary' : 'btn-ghost'}" type="button" data-msg-listing-id="${escapeHtml(listingId)}" data-msg-recipient-id="${escapeHtml(recipientId)}" data-msg-listing-title="${escapeHtml(listingTitle)}" onclick="window._openMsgModal(this)">✉️ Message Poster</button>
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

async function fetchListings(category = '', search = '', limit = 0, subcategory = ''): Promise<Listing[]> {
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
    : escapeHtml(listing.price || 'Open');
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
    : `<div class="listing-detail-gallery">${getDefaultListingImageMarkup(listing.category || 'other')}</div>`;
  const contactPhone = listing.contactPhone
    ? `<a class="btn-ghost" href="tel:${escapeHtml(listing.contactPhone)}">${escapeHtml(listing.contactPhone)}</a>`
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
      ${isPhotoModal ? '' : `<span>📍 ${escapeHtml(listing.location || 'Remote / Flexible')}</span>`}
      <span>🕐 Posted ${escapeHtml(formatListingDate(listing.createdAt))}</span>
      ${listing.authorName ? `<span>👤 ${escapeHtml(listing.authorName)}</span>` : ''}
      ${listing.subcategory ? `<span>${escapeHtml(listing.subcategory)}</span>` : ''}
    </div>
    ${isPhotoModal ? '' : `<div class="listing-detail-price">${escapeHtml(listing.price || '')}</div>`}
    ${detailRows ? `<div class="listing-detail-meta">${detailRows}</div>` : ''}
    <p>${escapeHtml(listing.description || 'No description provided.')}</p>
    <div class="listing-detail-contact">${saveBtn}${messageBtn}${contactPhone}${externalLink}${reportBtn}</div>
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
  const reason = window.prompt('Why are you reporting this? Type spam, scam, harassment, illegal, misinformation, or other.', 'spam');
  if (!reason) return;
  const normalizedReason = reason.trim().toLowerCase();
  const allowed = ['spam', 'scam', 'harassment', 'illegal', 'misinformation', 'other'];
  if (!allowed.includes(normalizedReason)) {
    alert('Please use one of: spam, scam, harassment, illegal, misinformation, other.');
    return;
  }
  const details = window.prompt('Optional: add details for the admin team.', '') || '';
  const response = await fetch(`${getApiBase()}/api/moderation/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ targetType, targetId, reason: normalizedReason, details }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not submit report.');
  alert('Thanks. The report was sent to admins.');
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
        alert(error.message);
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
      alert(error.message);
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
    } catch (error: any) {
      alert(error.message);
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

  updateFilterChipsFromListings(listings);

  if (!listings.length) {
    (target as HTMLElement).dataset.dynamicState = 'empty';
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

  const grouped = listings.reduce((groups: Record<string, Listing[]>, listing) => {
    const category = listing.category || 'other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(listing);
    return groups;
  }, {});

  (target as HTMLElement).dataset.dynamicState = 'live';
  target.innerHTML = Object.entries(grouped).map(([category, items]) => {
    const meta = getCategoryMeta(category);
    return `
      <div class="section-divider" data-group="${escapeHtml(category)}">${meta.emoji} ${escapeHtml(meta.label)} <span class="count">${items.length} live</span></div>
      ${items.map(listingToCard).join('')}
    `;
  }).join('');
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
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  if (button) button.classList.add('active');

  try {
    const scope = getListingScopeForCategory(category);
    const listings = await fetchListings(scope.category, '', 0, scope.subcategory);
    renderListings(listings);
  } catch (error) {
    console.error(error);
    filterListings(category);
  }
}

async function hydrateDynamicListings(category = inferPageCategory()): Promise<void> {
  const target = getDynamicListingsContainer();
  if (!target) return;

  try {
    (target as HTMLElement).dataset.dynamicState = 'loading';
    target.innerHTML = `
      <div class="empty-state">
        <div class="icon">${escapeHtml(getCategoryEmoji(category || 'other'))}</div>
        <h3>Loading live listings...</h3>
      </div>
    `;
    const params = new URLSearchParams(window.location.search);
    const requestedScope = getListingScopeForCategory(params.get('category') || '');
    const requestedCategory = requestedScope.category;
    const requestedSubcategory = params.get('subcategory') || getActiveChipFilter() || requestedScope.subcategory;
    const requestedSearch = params.get('search') || '';
    const activeHomeFilter = document.querySelector('.filter-btn.active') as HTMLElement | null;
    const homeScope = activeHomeFilter ? getListingScopeForCategory(getFilterFromButton(activeHomeFilter)) : { category: '', subcategory: '' };
    const pageScope = getListingScopeForCategory(category);
    const selectedCategory = requestedCategory || homeScope.category || pageScope.category;
    const selectedSubcategory = requestedSubcategory || homeScope.subcategory || pageScope.subcategory;

    if (requestedCategory && activeHomeFilter) {
      document.querySelectorAll('.filter-btn').forEach(btn => {
        const btnEl = btn as HTMLElement;
        btnEl.classList.toggle('active', getListingScopeForCategory(getFilterFromButton(btnEl)).category === requestedCategory);
      });
    }

    const listings = await fetchListings(selectedCategory, requestedSearch, 100, selectedSubcategory);
    renderListings(listings, target);

    if (window.location.hash === '#listings') {
      target.closest('#listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    console.error(error);
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

      const target = getDynamicListingsContainer();
      if (!target) {
        filterListings(this.dataset.filter || '');
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
    const isPhotographyListing = listing.category === 'photography';
    const detailImages = Array.isArray(listing.images) ? listing.images : [];
    const detailGalleryClass = isPhotographyListing && detailImages.length > 1
      ? 'listing-detail-gallery photo-detail-gallery'
      : 'listing-detail-gallery';
    const gallery = detailImages.length
      ? `<div class="${detailGalleryClass}" data-pswp-gallery>${detailImages.map((image, index) => `<a href="${escapeHtml(image)}" data-pswp-src="${escapeHtml(image)}"${isPhotographyListing && index === 0 ? ' class="photo-hero-slot"' : ''} aria-label="Open image ${index + 1}"><img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title || 'Listing image')}" loading="lazy"></a>`).join('')}</div>`
      : `<div class="listing-detail-gallery">${getDefaultListingImageMarkup(listing.category || 'other')}</div>`;
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
    const detailActions = [
      detailSaveBtn,
      detailMessageBtn,
      !isPhotographyListing && listing.contactPhone ? `<a class="btn-ghost" href="tel:${escapeHtml(listing.contactPhone)}">${escapeHtml(listing.contactPhone)}</a>` : '',
      externalLink,
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
          ${isPhotographyListing ? '<span>Photo showcase</span>' : `<span>📍 ${escapeHtml(listing.location || 'Remote / Flexible')}</span>`}
          <span>🕐 Posted ${escapeHtml(formatListingDate(listing.createdAt))}</span>
          ${listing.authorName ? `<span>👤 ${escapeHtml(listing.authorName)}</span>` : ''}
          ${listing.subcategory ? `<span>${escapeHtml(listing.subcategory)}</span>` : ''}
        </div>
        ${isPhotographyListing ? '' : `<div class="listing-detail-price">${escapeHtml(listing.price || 'Open')}</div>`}
        ${detailRows ? `<div class="listing-detail-meta">${detailRows}</div>` : ''}
        <p>${escapeHtml(listing.description || 'No description provided.')}</p>
        ${detailActions ? `<div class="listing-detail-contact">${detailActions}</div>` : ''}
        ${mapBlock}
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
