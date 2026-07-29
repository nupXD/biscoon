function toggleMenu() {
  const d = document.getElementById("mobileDrawer");
  const h = document.getElementById("hamburger");
  const isOpen = d.classList.toggle("open");
  h.classList.toggle("open");
  h.setAttribute("aria-expanded", String(isOpen));
}
function closeMobileMenu() {
  const d = document.getElementById("mobileDrawer");
  const h = document.getElementById("hamburger");
  if (!d) return;
  d.classList.remove("open");
  if (h) {
    h.classList.remove("open");
    h.setAttribute("aria-expanded", "false");
  }
}
const BISCOON_TOKEN_KEY = "biscoonToken";
const BISCOON_LAST_ACTIVITY_KEY = "biscoonLastActivity";
const BISCOON_SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1e3;
const BISCOON_ACTIVITY_THROTTLE_MS = 60 * 1e3;
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
    return "";
  }
  return localStorage.getItem(BISCOON_TOKEN_KEY) || "";
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
  return window.location.pathname.endsWith("/pages/auth/profile.html") || window.location.pathname.endsWith("/pages/post/listing.html");
}
function getCurrentPathWithQuery() {
  return window.location.pathname + window.location.search + window.location.hash;
}
function endBiscoonSession(options = {}) {
  const { redirect = false, destination = "" } = options;
  localStorage.removeItem(BISCOON_TOKEN_KEY);
  localStorage.removeItem(BISCOON_LAST_ACTIVITY_KEY);
  if (redirect) {
    window.location.href = destination || getLoginPath(getCurrentPathWithQuery());
    return;
  }
  if (typeof checkAuthState === "function") checkAuthState();
}
function bindBiscoonSessionActivity() {
  ["click", "keydown", "pointerdown", "touchstart", "scroll"].forEach((eventName) => {
    window.addEventListener(eventName, () => touchBiscoonSession(), { passive: true });
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) touchBiscoonSession(true);
  });
  window.addEventListener("storage", (event) => {
    if (event.key === BISCOON_TOKEN_KEY && !event.newValue) checkAuthState();
  });
  window.setInterval(() => {
    if (hasSessionExpired()) endBiscoonSession({ redirect: shouldRedirectAfterSessionEnd() });
  }, 60 * 1e3);
}
window.biscoonSession = {
  start: startBiscoonSession,
  end: endBiscoonSession,
  getToken: getBiscoonToken,
  touch: touchBiscoonSession
};
function biscoonScriptUrl(relativePath) {
  const script = document.querySelector('script[src$="assets/js/biscoon.js"], script[src$="biscoon.js"]');
  return script?.src ? new URL(relativePath, script.src).toString() : relativePath;
}
function loadBiscoonPlugin(name) {
  if (document.querySelector(`script[data-biscoon-plugin="${name}"]`)) return;
  const script = document.createElement("script");
  script.src = biscoonScriptUrl(`plugins/${name}.js`);
  script.defer = true;
  script.dataset.biscoonPlugin = name;
  document.head.appendChild(script);
}
function loadEnhancementPlugins() {
  if (document.querySelector('meta[name="biscoon-sentry-dsn"]') || window.BISCOON_SENTRY_DSN) {
    loadBiscoonPlugin("error-monitor");
  }
  loadBiscoonPlugin("search-autocomplete");
  if (getBiscoonToken()) loadBiscoonPlugin("realtime-notifications");
  loadBiscoonPlugin("listing-lightbox");
  if (document.getElementById("listingDetail")) {
    loadBiscoonPlugin("listing-map");
  }
  if (/\/community\/events\.html$/.test(window.location.pathname)) {
    loadBiscoonPlugin("events-calendar");
  }
}
function getRelativeNewsPath() {
  return "/pages/news/index.html";
}
function ensureNewsNavLink() {
  const newsPath = getRelativeNewsPath();
  document.querySelectorAll(".nav-links").forEach((nav) => {
    if (nav.querySelector(".news-nav-link")) return;
    const a = document.createElement("a");
    a.href = newsPath;
    a.className = "news-nav-link";
    a.textContent = "News";
    const discussions = Array.from(nav.querySelectorAll("a")).find((link) => /discussions/i.test(link.textContent || ""));
    discussions ? nav.insertBefore(a, discussions) : nav.appendChild(a);
  });
  document.querySelectorAll(".mobile-drawer").forEach((drawer) => {
    if (drawer.querySelector(".news-nav-link")) return;
    const a = document.createElement("a");
    a.href = newsPath;
    a.className = "news-nav-link";
    a.textContent = "News";
    const discussions = Array.from(drawer.querySelectorAll("a")).find((link) => /discussions/i.test(link.textContent || ""));
    const authButtons = drawer.querySelector(".mobile-drawer-btns");
    if (discussions) drawer.insertBefore(a, discussions);
    else if (authButtons) drawer.insertBefore(a, authButtons);
    else drawer.appendChild(a);
  });
}
function animateCounterEl(el) {
  const original = el.textContent?.trim() || "";
  const match = original.match(/^([\d.]+)(.*?)$/);
  if (!match) return;
  const target = parseFloat(match[1]);
  if (!target) return;
  const isFloat = match[1].includes(".");
  const suffix = match[2] || "";
  const duration = 1100;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const current = target * eased;
    el.textContent = (isFloat ? current.toFixed(1) : Math.round(current).toString()) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function initCounterAnimation() {
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.dataset.counted) return;
      el.dataset.counted = "true";
      io.unobserve(el);
      animateCounterEl(el);
    });
  }, { threshold: 0.7 });
  document.querySelectorAll(".stat-num, .hmap-num").forEach((el) => io.observe(el));
}
function initScrollReveal() {
  if (!("IntersectionObserver" in window)) return;
  const catSection = document.querySelector(".cat-section");
  if (catSection) {
    catSection.classList.add("animate-ready");
    const catIo = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        catSection.classList.add("is-revealed");
        catIo.disconnect();
      }
    }, { threshold: 0.08 });
    catIo.observe(catSection);
  }
  const revealTargets = [
    ".journal-section",
    ".heatmap-section",
    ".fb-grid",
    ".cal-section",
    ".home-cta"
  ];
  const revealIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        revealIo.unobserve(entry.target);
      }
    });
  }, { threshold: 0.07, rootMargin: "-20px 0px" });
  revealTargets.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.classList.add("reveal-section");
      revealIo.observe(el);
    });
  });
}
function initScrollProgress() {
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.prepend(bar);
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        ticking = false;
        return;
      }
      const pct = Math.min(100, scrollTop / docHeight * 100);
      bar.style.width = pct + "%";
      bar.classList.toggle("visible", scrollTop > 60);
      ticking = false;
    });
  }, { passive: true });
}
document.addEventListener("DOMContentLoaded", function() {
  loadEnhancementPlugins();
  ensureNewsNavLink();
  initScrollProgress();
  document.getElementById("hamburger")?.addEventListener("click", toggleMenu);
  document.addEventListener("click", function(e) {
    const d = document.getElementById("mobileDrawer");
    const h = document.getElementById("hamburger");
    const target = e.target;
    if (d && h && !d.contains(target) && !h.contains(target)) {
      closeMobileMenu();
    }
    const anchorTarget = e.target;
    if (d && d.contains(target) && anchorTarget.closest("a[href]")) {
      closeMobileMenu();
    }
  });
  document.addEventListener("keydown", function(e) {
    if (e.key !== "Escape") return;
    closeMobileMenu();
    document.querySelectorAll(".user-btn.open").forEach((btn) => {
      btn.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      const menu = btn.closest(".user-dropdown")?.querySelector(".dropdown-menu");
      if (menu) menu.classList.remove("open");
    });
  });
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a, .mobile-drawer a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (href === currentPage || currentPage === "index.html" && href === "./" || href.includes(currentPage)) {
      a.classList.add("active");
    }
  });
  const searchBtn = document.querySelector(".search-btn");
  if (searchBtn) searchBtn.addEventListener("click", doSearch);
  const clearBtn = document.getElementById("clearSearchBtn");
  if (clearBtn) clearBtn.addEventListener("click", clearSearch);
  const si = document.getElementById("searchInput");
  if (si && !si.closest("form")) si.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });
  document.querySelectorAll(".nav-search").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const navInput = form.querySelector(".nav-search-input");
      const query = navInput ? navInput.value.trim() : "";
      if (!query) return;
      if (document.getElementById("searchResultsPanel")) {
        const mainInput = document.getElementById("searchInput");
        if (mainInput) mainInput.value = query;
        doSearch();
      } else {
        window.location.href = `../../index.html?search=${encodeURIComponent(query)}`;
      }
    });
  });
  const changeLocBtn = document.getElementById("changeLocation");
  if (changeLocBtn) {
    changeLocBtn.addEventListener("click", function(e) {
      e.preventDefault();
      const loading = document.getElementById("locationLoading");
      const cond = document.getElementById("weatherCondition");
      if (loading) {
        loading.textContent = " \xB7 Detecting\u2026";
        loading.style.display = "inline";
      }
      if (cond) cond.textContent = "Updating\u2026";
      detectLocationAndWeather().finally(() => {
        if (loading) loading.style.display = "none";
      });
    });
  }
  buildHeatmap();
  bindDynamicFilterChips();
  bindSortSelect();
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
  loadWeather();
  checkSiteAnnouncement();
  initHeroSpotlight();
  initCounterAnimation();
  initScrollReveal();
  const urlSearch = new URLSearchParams(window.location.search).get("search");
  if (urlSearch) {
    const mainInput = document.getElementById("searchInput");
    if (mainInput) mainInput.value = urlSearch;
    doSearch();
  }
  document.addEventListener("click", function(e) {
    document.querySelectorAll("#userDropdown").forEach((dropdown) => {
      const menu = dropdown.querySelector("#dropdownMenu");
      const btn = dropdown.querySelector("#userBtn");
      if (menu && btn && !dropdown.contains(e.target)) {
        btn.classList.remove("open");
        menu.classList.remove("open");
      }
    });
  });
});
const WMO_CODES = {
  0: { label: "Clear Sky", emoji: "\u2600\uFE0F" },
  1: { label: "Mainly Clear", emoji: "\u{1F324}\uFE0F" },
  2: { label: "Partly Cloudy", emoji: "\u26C5" },
  3: { label: "Overcast", emoji: "\u2601\uFE0F" },
  45: { label: "Foggy", emoji: "\u{1F32B}\uFE0F" },
  48: { label: "Icy Fog", emoji: "\u{1F32B}\uFE0F" },
  51: { label: "Light Drizzle", emoji: "\u{1F326}\uFE0F" },
  53: { label: "Drizzle", emoji: "\u{1F326}\uFE0F" },
  55: { label: "Heavy Drizzle", emoji: "\u{1F327}\uFE0F" },
  61: { label: "Light Rain", emoji: "\u{1F327}\uFE0F" },
  63: { label: "Rain", emoji: "\u{1F327}\uFE0F" },
  65: { label: "Heavy Rain", emoji: "\u{1F327}\uFE0F" },
  66: { label: "Freezing Rain", emoji: "\u{1F328}\uFE0F" },
  67: { label: "Heavy Freezing Rain", emoji: "\u{1F328}\uFE0F" },
  71: { label: "Light Snow", emoji: "\u{1F328}\uFE0F" },
  73: { label: "Snow", emoji: "\u{1F328}\uFE0F" },
  75: { label: "Heavy Snow", emoji: "\u2744\uFE0F" },
  77: { label: "Snow Grains", emoji: "\u2744\uFE0F" },
  80: { label: "Light Showers", emoji: "\u{1F326}\uFE0F" },
  81: { label: "Showers", emoji: "\u{1F326}\uFE0F" },
  82: { label: "Heavy Showers", emoji: "\u{1F327}\uFE0F" },
  85: { label: "Snow Showers", emoji: "\u{1F328}\uFE0F" },
  86: { label: "Heavy Snow Showers", emoji: "\u{1F328}\uFE0F" },
  95: { label: "Thunderstorm", emoji: "\u26C8\uFE0F" },
  96: { label: "Thunderstorm", emoji: "\u26C8\uFE0F" },
  99: { label: "Thunderstorm + Hail", emoji: "\u26C8\uFE0F" }
};
function windDegreesToCardinal(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}
function updateWeatherWidget({ icon, temp, condition, city, humidity, wind, high, low }) {
  const set = (id, val, clearStyle) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    if (clearStyle) el.removeAttribute("style");
  };
  set("weatherIcon", icon);
  set("weatherTemp", temp, true);
  set("weatherCondition", condition);
  set("weatherCity", city);
  set("weatherHumidity", humidity);
  set("weatherWind", wind);
  set("weatherHighLow", high + " / " + low);
  const header = document.getElementById("weatherHeader");
  if (header) header.textContent = "\u{1F324} " + city.split(",")[0].trim() + " Weather";
}
async function fetchWeatherForCoords(lat, lon, cityLabel) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,weathercode,windspeed_10m,winddirection_10m,relativehumidity_2m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("windspeed_unit", "mph");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Weather API error");
  const data = await res.json();
  const cur = data.current;
  const daily = data.daily;
  const code = cur.weathercode;
  const meta = WMO_CODES[code] || { label: "Unknown", emoji: "\u{1F321}\uFE0F" };
  const temp = Math.round(cur.temperature_2m);
  const high = Math.round(daily.temperature_2m_max[0]);
  const low = Math.round(daily.temperature_2m_min[0]);
  const wind = Math.round(cur.windspeed_10m);
  const dir = windDegreesToCardinal(cur.winddirection_10m);
  updateWeatherWidget({
    icon: meta.emoji,
    temp: temp + "\xB0F",
    condition: meta.label,
    city: cityLabel,
    humidity: cur.relativehumidity_2m + "%",
    wind: wind + " mph " + dir,
    high: high + "\xB0",
    low: low + "\xB0"
  });
}
const WEATHER_DEFAULT = { lat: 42.3601, lon: -71.0589, city: "Boston, Massachusetts" };
async function detectLocationAndWeather() {
  let coords = WEATHER_DEFAULT;
  try {
    const geo = await Promise.race([
      fetch("https://ipapi.co/json/").then((r) => r.json()),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4e3))
    ]);
    if (geo && geo.latitude && geo.longitude && geo.city) {
      const region = geo.region || geo.region_code || "";
      coords = {
        lat: geo.latitude,
        lon: geo.longitude,
        city: geo.city + (region ? ", " + region : "")
      };
      const el = document.getElementById("cityName");
      if (el) el.textContent = coords.city;
    }
  } catch {
  }
  try {
    await fetchWeatherForCoords(coords.lat, coords.lon, coords.city);
  } catch {
    const cond = document.getElementById("weatherCondition");
    if (cond) cond.textContent = "Unavailable";
  }
}
async function loadWeather() {
  if (!document.getElementById("weatherWidget")) return;
  await detectLocationAndWeather();
}
async function checkSiteAnnouncement() {
  const DISMISS_KEY = "biscoonDismissedAnnouncement";
  try {
    const res = await fetch("/api/announcements/active");
    if (!res.ok) return;
    const { announcement } = await res.json();
    if (!announcement) return;
    if (sessionStorage.getItem(DISMISS_KEY) === announcement.id) return;
    const nav = document.querySelector("nav");
    if (!nav) return;
    const typeClass = `site-banner-${announcement.type || "info"}`;
    const banner = document.createElement("div");
    banner.className = `site-banner ${typeClass}`;
    banner.id = "siteBanner";
    banner.innerHTML = `
      <span class="site-banner-text">
        <span class="site-banner-title">${announcement.title}</span>${announcement.body}
      </span>
      <button class="site-banner-close" aria-label="Dismiss">\xD7</button>`;
    nav.insertAdjacentElement("afterend", banner);
    banner.querySelector(".site-banner-close").addEventListener("click", () => {
      sessionStorage.setItem(DISMISS_KEY, announcement.id);
      banner.remove();
    });
  } catch (_) {
  }
}
async function initHeroSpotlight() {
  const wrap = document.getElementById("heroSpotlightWrap");
  if (!wrap) return;
  try {
    const res = await fetch(`${getApiBase()}/api/spotlight/active`);
    if (!res.ok) return;
    const { spotlights } = await res.json();
    if (!spotlights || spotlights.length === 0) return;
    const safeUrl = (u) => {
      if (!u) return "";
      if (u.startsWith("/uploads/")) return u;
      try {
        const p = new URL(u);
        return p.protocol === "https:" || p.protocol === "http:" ? u : "";
      } catch {
        return "";
      }
    };
    const buildSlide = (s) => {
      const img = safeUrl(s.imageUrl);
      const cta = s.ctaText && s.ctaUrl ? safeUrl(s.ctaUrl) : "";
      const typeLabel = { ad: "AD", event: "EVENT", news: "NEWS", promo: "PROMO" }[s.type || "ad"] || "AD";
      const badgeHtml = s.badgeText ? `<span class="spotlight-badge" style="background:${escapeHtml(s.badgeColor || "#C0392B")}">${escapeHtml(s.badgeText)}</span>` : `<span class="spotlight-badge spotlight-badge-type">${typeLabel}</span>`;
      const ctaHtml = cta ? `<a href="${escapeHtml(cta)}" class="spotlight-cta" rel="noopener">${escapeHtml(s.ctaText)}</a>` : "";
      const cssImg = img.replace(/"/g, "%22");
      return `<div class="swiper-slide spotlight-slide" style="background-image:url(&quot;${cssImg}&quot;)">
        <div class="spotlight-overlay"></div>
        <div class="spotlight-content">
          ${badgeHtml}
          <h2 class="spotlight-title">${escapeHtml(s.title)}</h2>
          ${s.subtitle ? `<p class="spotlight-subtitle">${escapeHtml(s.subtitle)}</p>` : ""}
          ${s.body ? `<p class="spotlight-body">${escapeHtml(s.body)}</p>` : ""}
          ${ctaHtml}
        </div>
      </div>`;
    };
    const swiperDiv = document.createElement("div");
    swiperDiv.className = "swiper spotlight-swiper";
    const wrapperDiv = document.createElement("div");
    wrapperDiv.className = "swiper-wrapper";
    wrapperDiv.innerHTML = spotlights.map(buildSlide).join("");
    swiperDiv.appendChild(wrapperDiv);
    if (spotlights.length > 1) {
      const pag = document.createElement("div");
      pag.className = "swiper-pagination spotlight-pagination";
      swiperDiv.appendChild(pag);
    }
    wrap.appendChild(swiperDiv);
    document.getElementById("heroSection")?.classList.add("hero--has-spotlight");
    const Swiper = window.Swiper;
    if (!Swiper) return;
    new Swiper(".spotlight-swiper", {
      loop: spotlights.length > 1,
      autoplay: spotlights.length > 1 ? { delay: 6e3, disableOnInteraction: false, pauseOnMouseEnter: true } : false,
      speed: 700,
      pagination: spotlights.length > 1 ? { el: ".spotlight-pagination", clickable: true } : false,
      keyboard: { enabled: true },
      a11y: { enabled: true }
    });
  } catch (_) {
  }
}
function checkAuthState() {
  const token = getBiscoonToken();
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const navCtas = document.querySelectorAll("#navCtas, .nav-ctas");
  const userDropdowns = document.querySelectorAll(".user-dropdown");
  const mobileBtns = document.querySelectorAll(".mobile-drawer-btns, #mobileBtns");
  const mobileUserMenus = document.querySelectorAll(".mobile-user-menu");
  const looseAuthLinks = document.querySelectorAll(
    'nav > a.btn-ghost[href*="login"], nav > a.btn-primary[href*="signup"], .mobile-drawer a.btn-ghost[href*="login"], .mobile-drawer a.btn-primary[href*="signup"]'
  );
  const visibleDropdowns = /* @__PURE__ */ new Set();
  if (token) {
    document.body.classList.add("biscoon-logged-in");
    document.body.classList.remove("biscoon-logged-out");
    navCtas.forEach((el) => {
      el.style.display = "none";
    });
    document.querySelectorAll("nav").forEach((nav) => {
      const dropdown = nav.querySelector(".user-dropdown");
      if (dropdown) {
        dropdown.style.display = "block";
        visibleDropdowns.add(dropdown);
      }
    });
    userDropdowns.forEach((el) => {
      if (!visibleDropdowns.has(el)) el.style.display = "none";
    });
    mobileBtns.forEach((el) => {
      el.style.display = "";
    });
    mobileUserMenus.forEach((el) => {
      el.style.display = "";
    });
    looseAuthLinks.forEach((el) => {
      el.style.display = "none";
    });
    if (currentPage === "login.html" || currentPage === "signup.html") {
      window.location.href = "profile.html";
      return;
    }
    fetchUserInfo(token);
    fetchNotificationSummary(token);
    fetchMessageSummary(token);
  } else {
    document.body.classList.add("biscoon-logged-out");
    document.body.classList.remove("biscoon-logged-in");
    navCtas.forEach((el) => {
      el.style.display = "flex";
    });
    userDropdowns.forEach((el) => {
      el.style.display = "none";
    });
    mobileBtns.forEach((el) => {
      el.style.display = "";
    });
    mobileUserMenus.forEach((el) => {
      el.style.display = "";
    });
    looseAuthLinks.forEach((el) => {
      el.style.display = "";
    });
  }
}
function getRelativeAuthPath(page) {
  const depth = window.location.pathname.split("/").filter(Boolean).length;
  const isHome = window.location.pathname.endsWith("/index.html") || window.location.pathname === "/";
  const prefix = isHome ? "pages/auth" : depth >= 3 ? "../auth" : "auth";
  return `${prefix}/${page}`;
}
function getRelativePostPath(page) {
  const isHome = window.location.pathname.endsWith("/index.html") || window.location.pathname === "/";
  const depth = window.location.pathname.split("/").filter(Boolean).length;
  const prefix = isHome ? "pages/post" : depth >= 3 ? "../post" : "post";
  return `${prefix}/${page}`;
}
function getRelativeCommunityPath(page) {
  const isHome = window.location.pathname.endsWith("/index.html") || window.location.pathname === "/";
  const depth = window.location.pathname.split("/").filter(Boolean).length;
  const prefix = isHome ? "pages/community" : depth >= 3 ? "../community" : "community";
  return `${prefix}/${page}`;
}
function ensureAuthDropdowns() {
  document.querySelectorAll("nav").forEach((nav) => {
    if (nav.querySelector(".user-dropdown")) return;
    const dropdown = document.createElement("div");
    dropdown.className = "user-dropdown";
    dropdown.id = "userDropdown";
    dropdown.style.display = "none";
    dropdown.innerHTML = `
      <button class="user-btn" id="userBtn" type="button">
        <span class="user-avatar">\u{1F464}</span>
        <span class="user-name" id="userName">Profile</span>
        <span class="user-total-badge"></span>
        <span class="dropdown-arrow">\u25BC</span>
      </button>
      <div class="dropdown-menu" id="dropdownMenu">
        <a href="${getRelativeAuthPath("profile.html")}">\u{1F4CB} My Profile</a>
        <a href="${getRelativeAuthPath("activity.html")}">\u{1F9FE} My Activity</a>
        <a href="${getRelativeAuthPath("notifications.html")}" class="notification-link">\u{1F514} Notifications <span class="notification-badge"></span></a>
        <a href="${getRelativeAuthPath("messages.html")}" class="messages-nav-link">\u2709\uFE0F Messages <span class="messages-badge" style="display:none"></span></a>
        <a href="${getRelativePostPath("listing.html")}">\u2795 Add Listing</a>
        <a href="${getRelativeCommunityPath("discussions.html")}?create=1">\u{1F4AC} Create Discussion</a>
        <a href="#" id="logoutBtn">\u{1F6AA} Logout</a>
      </div>
    `;
    const hamburger = nav.querySelector(".hamburger");
    if (hamburger) {
      nav.insertBefore(dropdown, hamburger);
    } else {
      nav.appendChild(dropdown);
    }
  });
  document.querySelectorAll(".mobile-drawer").forEach((drawer) => {
    if (drawer.querySelector(".mobile-user-menu")) return;
    const menu = document.createElement("div");
    menu.className = "mobile-user-menu";
    menu.id = "mobileUserMenu";
    menu.innerHTML = `
      <div class="mobile-user-info">
        <span class="user-avatar">\u{1F464}</span>
        <span class="user-name" id="mobileUserName">Profile</span>
      </div>
      <a href="${getRelativeAuthPath("profile.html")}">\u{1F4CB} My Profile</a>
      <a href="${getRelativeAuthPath("activity.html")}">\u{1F9FE} My Activity</a>
      <a href="${getRelativeAuthPath("notifications.html")}" class="notification-link">\u{1F514} Notifications <span class="notification-badge"></span></a>
      <a href="${getRelativeAuthPath("messages.html")}" class="messages-nav-link">\u2709\uFE0F Messages <span class="messages-badge" style="display:none"></span></a>
      <a href="${getRelativePostPath("listing.html")}">\u2795 Add Listing</a>
      <a href="${getRelativeCommunityPath("discussions.html")}?create=1">\u{1F4AC} Create Discussion</a>
      <a href="#" id="mobileLogoutBtn">\u{1F6AA} Logout</a>
    `;
    drawer.appendChild(menu);
  });
}
function ensureNotificationLinks() {
  document.querySelectorAll(".dropdown-menu").forEach((menu) => {
    dedupeMenuLinks(menu, '.activity-link, a[href*="activity.html"]');
    if (!menu.querySelector(".activity-link")) {
      const notificationLink = menu.querySelector(".notification-link");
      const addListingLink = Array.from(menu.querySelectorAll("a")).find((link2) => link2.textContent.toLowerCase().includes("add listing"));
      const logoutLink = menu.querySelector("#logoutBtn");
      const link = document.createElement("a");
      link.href = getRelativeAuthPath("activity.html");
      link.className = "activity-link";
      link.innerHTML = "\u{1F9FE} My Activity";
      menu.insertBefore(link, notificationLink || addListingLink || logoutLink || null);
    }
    if (!menu.querySelector(".notification-link")) {
      const addListingLink = Array.from(menu.querySelectorAll("a")).find((link2) => link2.textContent.toLowerCase().includes("add listing"));
      const logoutLink = menu.querySelector("#logoutBtn");
      const link = document.createElement("a");
      link.href = getRelativeAuthPath("notifications.html");
      link.className = "notification-link";
      link.innerHTML = '\u{1F514} Notifications <span class="notification-badge"></span>';
      menu.insertBefore(link, addListingLink || logoutLink || null);
    }
    if (!menu.querySelector(".messages-nav-link")) {
      const addListingLink = Array.from(menu.querySelectorAll("a")).find((link2) => link2.textContent.toLowerCase().includes("add listing"));
      const logoutLink = menu.querySelector("#logoutBtn");
      const link = document.createElement("a");
      link.href = getRelativeAuthPath("messages.html");
      link.className = "messages-nav-link";
      link.innerHTML = '\u2709\uFE0F Messages <span class="messages-badge" style="display:none"></span>';
      menu.insertBefore(link, addListingLink || logoutLink || null);
    }
  });
  document.querySelectorAll(".mobile-user-menu").forEach((menu) => {
    dedupeMenuLinks(menu, '.activity-link, a[href*="activity.html"]');
    if (!menu.querySelector(".activity-link")) {
      const notificationLink = menu.querySelector(".notification-link");
      const addListingLink = Array.from(menu.querySelectorAll("a")).find((link2) => link2.textContent.toLowerCase().includes("add listing"));
      const logoutLink = menu.querySelector("#mobileLogoutBtn");
      const link = document.createElement("a");
      link.href = getRelativeAuthPath("activity.html");
      link.className = "activity-link";
      link.innerHTML = "\u{1F9FE} My Activity";
      menu.insertBefore(link, notificationLink || addListingLink || logoutLink || null);
    }
    if (!menu.querySelector(".notification-link")) {
      const addListingLink = Array.from(menu.querySelectorAll("a")).find((link2) => link2.textContent.toLowerCase().includes("add listing"));
      const logoutLink = menu.querySelector("#mobileLogoutBtn");
      const link = document.createElement("a");
      link.href = getRelativeAuthPath("notifications.html");
      link.className = "notification-link";
      link.innerHTML = '\u{1F514} Notifications <span class="notification-badge"></span>';
      menu.insertBefore(link, addListingLink || logoutLink || null);
    }
    if (!menu.querySelector(".messages-nav-link")) {
      const addListingLink = Array.from(menu.querySelectorAll("a")).find((link2) => link2.textContent.toLowerCase().includes("add listing"));
      const logoutLink = menu.querySelector("#mobileLogoutBtn");
      const link = document.createElement("a");
      link.href = getRelativeAuthPath("messages.html");
      link.className = "messages-nav-link";
      link.innerHTML = '\u2709\uFE0F Messages <span class="messages-badge" style="display:none"></span>';
      menu.insertBefore(link, addListingLink || logoutLink || null);
    }
  });
}
function dedupeMenuLinks(menu, selector) {
  const links = Array.from(menu.querySelectorAll(selector));
  links.slice(1).forEach((link) => link.remove());
  if (links[0] && selector.includes("activity")) links[0].classList.add("activity-link");
}
function bindAuthDropdownEvents() {
  document.querySelectorAll("#userBtn").forEach((btn) => {
    const el = btn;
    if (el.dataset.authBound) return;
    el.dataset.authBound = "true";
    el.addEventListener("click", toggleDropdown);
  });
  document.querySelectorAll("#logoutBtn, #mobileLogoutBtn").forEach((btn) => {
    const el = btn;
    if (el.dataset.authBound) return;
    el.dataset.authBound = "true";
    el.addEventListener("click", function(e) {
      e.preventDefault();
      logout();
    });
  });
}
function getPostListingPath(category = "") {
  const base = "/pages/post/listing.html";
  return category ? `${base}?category=${encodeURIComponent(category)}` : base;
}
function getHomeListingsPath(category = "", subcategory = "") {
  const url = new URL("/index.html", window.location.origin);
  if (category && category !== "all") url.searchParams.set("category", category);
  if (subcategory && subcategory !== "all") url.searchParams.set("subcategory", subcategory);
  url.hash = "listings";
  return url.pathname + url.search + url.hash;
}
function getLoginPath(redirectTo = getPostListingPath()) {
  const url = new URL("/pages/auth/login.html", window.location.origin);
  url.searchParams.set("redirect", redirectTo);
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
  const rawHref = anchor.getAttribute("href") || "";
  if (rawHref.includes("post/listing.html")) return true;
  return rawHref === "listing.html" && window.location.pathname.includes("/pages/post/");
}
function isPostActionButton(button) {
  if (!button) return false;
  const text = button.textContent.trim().toLowerCase();
  return text.includes("post now") || text.includes("post a listing") || text.includes("post a free listing");
}
function bindProtectedPostActions() {
  document.addEventListener("click", function(e) {
    const target = e.target;
    const anchor = target.closest("a");
    if (isPostListingAnchor(anchor)) {
      e.preventDefault();
      goToPostOrLogin();
      return;
    }
    const button = target.closest("button");
    if (isPostActionButton(button)) {
      e.preventDefault();
      goToPostOrLogin();
    }
  });
}
function normalizeCategoryForListings(category) {
  const aliases = {
    realestate: "real-estate",
    pg: "paying-guest",
    students: "student",
    rojgar: "jobs"
  };
  return aliases[category] || category || "";
}
const BISCOON_SPECIFIC_TYPE_SCOPE = {
  tech: { category: "jobs", subcategory: "tech" },
  healthcare: { category: "jobs", subcategory: "healthcare" },
  insurance: { category: "jobs", subcategory: "insurance" },
  cpa: { category: "jobs", subcategory: "cpa" },
  legal: { category: "jobs", subcategory: "legal" },
  finance: { category: "jobs", subcategory: "finance" },
  education: { category: "jobs", subcategory: "education" },
  student: { category: "jobs", subcategory: "student" },
  tutoring: { category: "jobs", subcategory: "tutoring" },
  "ai-services": { category: "jobs", subcategory: "ai-services" },
  immigration: { category: "jobs", subcategory: "immigration" },
  "paying-guest": { category: "housing", subcategory: "paying-guest" },
  "real-estate": { category: "housing", subcategory: "real-estate" },
  moving: { category: "housing", subcategory: "moving" },
  kinbech: { category: "marketplace", subcategory: "kinbech" },
  services: { category: "marketplace", subcategory: "services" },
  restaurants: { category: "marketplace", subcategory: "restaurants" },
  shops: { category: "marketplace", subcategory: "shops" },
  childcare: { category: "marketplace", subcategory: "childcare" },
  beauty: { category: "marketplace", subcategory: "beauty" },
  auto: { category: "marketplace", subcategory: "auto" },
  cleaning: { category: "marketplace", subcategory: "cleaning" },
  photography: { category: "photography", subcategory: "" },
  produce: { category: "marketplace", subcategory: "produce" },
  "business-for-sale": { category: "marketplace", subcategory: "business-for-sale" },
  translation: { category: "marketplace", subcategory: "translation" },
  organizations: { category: "community", subcategory: "organizations" },
  events: { category: "community", subcategory: "events" },
  literature: { category: "community", subcategory: "literature" },
  music: { category: "community", subcategory: "music" },
  art: { category: "community", subcategory: "art" },
  sports: { category: "community", subcategory: "sports" },
  yoga: { category: "community", subcategory: "yoga" },
  jyotish: { category: "community", subcategory: "jyotish" },
  matchmaker: { category: "community", subcategory: "matchmaker" },
  matrimony: { category: "community", subcategory: "matrimony" },
  "pen-pals": { category: "community", subcategory: "pen-pals" },
  travel: { category: "community", subcategory: "travel" }
};
function getListingScopeForCategory(category) {
  const normalized = normalizeCategoryForListings(category);
  return BISCOON_SPECIFIC_TYPE_SCOPE[normalized] || { category: normalized, subcategory: "" };
}
function getSelectedBrowseScope() {
  const activeHomeFilter = document.querySelector(".filter-btn.active");
  if (activeHomeFilter) {
    return getListingScopeForCategory(getFilterFromButton(activeHomeFilter));
  }
  const scope = getListingScopeForCategory(inferPageCategory());
  const chipFilter = getActiveChipFilter();
  return {
    category: scope.category,
    subcategory: scope.subcategory || chipFilter || ""
  };
}
function isBrowseListingAction(element) {
  if (!element) return false;
  if (element.classList.contains("load-more")) return true;
  const text = element.textContent.trim().toLowerCase();
  return text.includes("browse all listings") || text.includes("browse all categories") || text.includes("view all categories") || text.includes("view all listings") || text.includes("load more listings");
}
function bindBrowseListingActions() {
  document.addEventListener("click", function(e) {
    const target = e.target;
    const pageBtn = target.closest("[data-listings-page]");
    if (pageBtn) {
      e.preventDefault();
      const page = Number(pageBtn.dataset.listingsPage || 0);
      if (!page || page < 1) return;
      hydrateDynamicListings(inferPageCategory(), { page, append: false }).then(() => {
        document.getElementById("listingsFeed")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    const moreBtn = target.closest("[data-listings-more]");
    if (moreBtn) {
      e.preventDefault();
      if (!browseSession || browseSession.page >= browseSession.pages) return;
      moreBtn.setAttribute("disabled", "true");
      moreBtn.textContent = "Loading\u2026";
      hydrateDynamicListings(inferPageCategory(), { page: browseSession.page + 1, append: true });
      return;
    }
    const action = target.closest("button, a");
    if (!isBrowseListingAction(action)) return;
    if (action?.classList.contains("load-more") && action.hasAttribute("data-listings-more")) return;
    e.preventDefault();
    const categoriesSection = document.getElementById("categories");
    if (categoriesSection) {
      categoriesSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = "/index.html#categories";
    }
  });
}
function guardPostingPage() {
  if (!window.location.pathname.endsWith("/pages/post/listing.html")) return;
  if (getBiscoonToken()) return;
  window.location.href = getLoginPath(getPostListingPath());
}
async function fetchUserInfo(token) {
  try {
    const apiBase = getApiBase();
    const response = await fetch(apiBase + "/api/auth/me", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) {
      localStorage.removeItem("biscoonToken");
      checkAuthState();
      return;
    }
    const data = await response.json();
    const user = data.user || data;
    if (user && ["super-admin", "admin", "staff", "sub-admin"].includes(user.role)) {
      endBiscoonSession({ redirect: false });
      return;
    }
    if (user && user.name) {
      const userNameEls = document.querySelectorAll("#userName, #mobileUserName");
      userNameEls.forEach((el) => el.textContent = user.name);
    }
  } catch (error) {
    console.error("Failed to fetch user info:", error);
  }
}
function getRelativeAdminPath() {
  return "/pages/admin/dashboard.html";
}
function injectAdminLink() {
  const adminPath = getRelativeAdminPath();
  document.querySelectorAll("#dropdownMenu").forEach((menu) => {
    if (menu.querySelector(".admin-panel-link")) return;
    const a = document.createElement("a");
    a.href = adminPath;
    a.className = "admin-panel-link";
    a.innerHTML = '\u{1F6E1} Admin Panel <span class="admin-nav-badge">ADMIN</span>';
    const logout2 = menu.querySelector("#logoutBtn");
    logout2 ? menu.insertBefore(a, logout2) : menu.appendChild(a);
  });
  document.querySelectorAll(".mobile-user-menu").forEach((menu) => {
    if (menu.querySelector(".admin-panel-link")) return;
    const a = document.createElement("a");
    a.href = adminPath;
    a.className = "admin-panel-link";
    a.innerHTML = "\u{1F6E1} Admin Panel";
    const logout2 = menu.querySelector("#mobileLogoutBtn");
    logout2 ? menu.insertBefore(a, logout2) : menu.appendChild(a);
  });
  document.querySelectorAll(".user-btn").forEach((btn) => {
    if (btn.querySelector(".admin-nav-badge")) return;
    const badge = document.createElement("span");
    badge.className = "admin-nav-badge";
    badge.textContent = "ADMIN";
    const arrow = btn.querySelector(".dropdown-arrow");
    arrow ? btn.insertBefore(badge, arrow) : btn.appendChild(badge);
  });
}
async function fetchNotificationSummary(token = getBiscoonToken()) {
  if (!token) return;
  try {
    const response = await fetch(`${getApiBase()}/api/notifications?limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return;
    const data = await response.json();
    updateNotificationBadges(data.unread || 0);
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
  }
}
async function fetchMessageSummary(token = getBiscoonToken()) {
  if (!token) return;
  try {
    const response = await fetch(`${getApiBase()}/api/messages/unread`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return;
    const data = await response.json();
    updateMessageBadges(data.unread || 0);
  } catch (error) {
    console.error("Failed to fetch message count:", error);
  }
}
function updateMessageBadges(count) {
  _biscoonUnreadMessages = count;
  document.querySelectorAll(".messages-badge").forEach((badge) => {
    badge.textContent = count > 0 ? String(count) : "";
    badge.style.display = count > 0 ? "inline-flex" : "none";
  });
  updateUserTotalBadge();
}
let _biscoonUnreadNotifications = 0;
let _biscoonUnreadMessages = 0;
function updateUserTotalBadge() {
  const total = _biscoonUnreadNotifications + _biscoonUnreadMessages;
  document.querySelectorAll(".user-total-badge").forEach((badge) => {
    badge.textContent = total > 0 ? String(total > 99 ? "99+" : total) : "";
    badge.style.display = total > 0 ? "inline-flex" : "none";
  });
}
function updateNotificationBadges(count) {
  _biscoonUnreadNotifications = count;
  document.querySelectorAll(".notification-badge").forEach((badge) => {
    badge.textContent = count > 0 ? String(count) : "";
    badge.style.display = count > 0 ? "inline-flex" : "none";
  });
  updateUserTotalBadge();
}
function bindNotificationEvents() {
  window.addEventListener("biscoon:notifications-updated", () => fetchNotificationSummary());
  window.addEventListener("biscoon:messages-updated", () => fetchMessageSummary());
}
function toggleDropdown(event) {
  const currentTarget = event?.currentTarget;
  const dropdown = currentTarget?.closest(".user-dropdown");
  const btn = dropdown ? dropdown.querySelector("#userBtn") : document.getElementById("userBtn");
  const menu = dropdown ? dropdown.querySelector("#dropdownMenu") : document.getElementById("dropdownMenu");
  if (btn && menu) {
    const isOpen = btn.classList.toggle("open");
    menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      const first = menu.querySelector("a, button");
      if (first) first.focus();
    }
  }
}
function logout() {
  endBiscoonSession({ destination: "/index.html", redirect: true });
}
function doSearch() {
  const searchInput = document.getElementById("searchInput");
  const searchCategory = document.getElementById("searchCategory");
  const q = searchInput ? searchInput.value : "";
  const cat = searchCategory ? searchCategory.value : "";
  const query = q.trim();
  const btn = document.querySelector(".search-btn");
  const originalText = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "...";
  }
  Promise.all([
    cat === "discussions" ? Promise.resolve([]) : fetchListings(cat, query, 100),
    !cat || cat === "all" || cat === "discussions" ? fetchDiscussions(query, 25) : Promise.resolve([])
  ]).then(([listings, discussions]) => {
    if (window.renderSearchResults) {
      window.renderSearchResults(listings, query, cat, discussions);
    } else if (window.renderListings) {
      window.renderListings(listings);
    } else {
      alert("Search results are available, but the current page cannot render them.");
    }
  }).catch(() => {
    alert("Unable to perform search at this time.");
  }).finally(() => {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}
window.doSearch = doSearch;
window.clearSearch = clearSearch;
function filterListings(cat) {
  document.querySelectorAll(".listing-card[data-cat], .card[data-cat]").forEach((el) => {
    el.style.display = cat === "all" || !cat || el.dataset.cat === cat ? "" : "none";
  });
  document.querySelectorAll(".section-divider[data-group]").forEach((el) => {
    el.style.display = cat === "all" || !cat ? "" : "none";
  });
}
const BISCOON_CATEGORY_META = {
  "ai-services": { label: "AI Services", emoji: "\u{1F916}" },
  art: { label: "Art", emoji: "\u{1F3A8}" },
  auto: { label: "Auto / Cars", emoji: "\u{1F697}" },
  beauty: { label: "Beauty / Salon", emoji: "\u{1F487}" },
  "business-for-sale": { label: "Business for Sale", emoji: "\u{1F3E2}" },
  childcare: { label: "Child Care", emoji: "\u{1F476}" },
  cleaning: { label: "Cleaning", emoji: "\u{1F9F9}" },
  community: { label: "Community", emoji: "\u{1F91D}" },
  cpa: { label: "CPA / Accounting", emoji: "\u{1F4CA}" },
  education: { label: "Education", emoji: "\u{1F4DA}" },
  events: { label: "Events", emoji: "\u{1F389}" },
  finance: { label: "Finance", emoji: "\u{1F4B9}" },
  healthcare: { label: "Healthcare", emoji: "\u{1F3E5}" },
  housing: { label: "Housing", emoji: "\u{1F3E0}" },
  immigration: { label: "Immigration", emoji: "\u{1F6C2}" },
  insurance: { label: "Insurance", emoji: "\u{1F6E1}\uFE0F" },
  jobs: { label: "Jobs", emoji: "\u{1F4BC}" },
  jyotish: { label: "Jyotish", emoji: "\u{1F52E}" },
  kinbech: { label: "Kinbech", emoji: "\u{1F6CD}\uFE0F" },
  legal: { label: "Legal Services", emoji: "\u2696\uFE0F" },
  literature: { label: "Literature", emoji: "\u{1F4D6}" },
  matchmaker: { label: "Matchmaker", emoji: "\u{1F491}" },
  marketplace: { label: "Marketplace", emoji: "\u{1F6CD}\uFE0F" },
  matrimony: { label: "Matrimony", emoji: "\u{1F48D}" },
  moving: { label: "Moving", emoji: "\u{1F4E6}" },
  music: { label: "Music", emoji: "\u{1F3B5}" },
  organizations: { label: "Organizations", emoji: "\u{1F3DB}\uFE0F" },
  "paying-guest": { label: "Paying Guest", emoji: "\u{1F3E1}" },
  pg: { label: "Paying Guest", emoji: "\u{1F3E1}" },
  "pen-pals": { label: "Pen Pals", emoji: "\u2709\uFE0F" },
  photography: { label: "Photography", emoji: "\u{1F4F8}" },
  produce: { label: "Produce", emoji: "\u{1F96C}" },
  "real-estate": { label: "Real Estate", emoji: "\u{1F3D7}\uFE0F" },
  restaurants: { label: "Restaurants", emoji: "\u{1F35B}" },
  rojgar: { label: "Rojgar", emoji: "\u{1F4BC}" },
  services: { label: "Services", emoji: "\u{1F527}" },
  shops: { label: "Shops", emoji: "\u{1F3EA}" },
  sports: { label: "Sports", emoji: "\u26BD" },
  student: { label: "Student Network", emoji: "\u{1F393}" },
  students: { label: "Student Network", emoji: "\u{1F393}" },
  tech: { label: "Tech Services", emoji: "\u{1F4BB}" },
  translation: { label: "Translation", emoji: "\u{1F310}" },
  travel: { label: "Travel", emoji: "\u2708\uFE0F" },
  tutoring: { label: "Tutoring", emoji: "\u{1F4DD}" },
  yoga: { label: "Yoga", emoji: "\u{1F9D8}" },
  other: { label: "Other", emoji: "\u{1F4C4}" }
};
function getApiBase() {
  const origin = window.location.origin || "http://localhost:4000";
  return origin.startsWith("file://") ? "http://localhost:4000" : origin;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char] || char);
}
function safeExternalHref(value) {
  const candidate = String(value || "").trim();
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}
const _biscoonConversationStatusCache = /* @__PURE__ */ new Map();
function getConversationStatusCacheKey(listingId = "", recipientId = "") {
  return `${String(listingId)}::${String(recipientId)}`;
}
function cacheConversationStatus(listingId = "", recipientId = "", conversationId = "") {
  if (!listingId || !recipientId) return;
  _biscoonConversationStatusCache.set(getConversationStatusCacheKey(listingId, recipientId), conversationId || "");
}
async function fetchExistingConversationId(listingId = "", recipientId = "") {
  const token = getBiscoonToken();
  if (!token || !listingId || !recipientId) return "";
  const key = getConversationStatusCacheKey(listingId, recipientId);
  if (_biscoonConversationStatusCache.has(key)) {
    return _biscoonConversationStatusCache.get(key) || "";
  }
  try {
    const params = new URLSearchParams({
      listingId: String(listingId),
      recipientId: String(recipientId)
    });
    const response = await fetch(`${getApiBase()}/api/messages/status?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      cacheConversationStatus(listingId, recipientId, "");
      return "";
    }
    const data = await response.json();
    const conversationId = data && data.exists ? String(data.conversationId || "") : "";
    cacheConversationStatus(listingId, recipientId, conversationId);
    return conversationId;
  } catch {
    cacheConversationStatus(listingId, recipientId, "");
    return "";
  }
}
function getMessagePosterActionMarkup({ listingId = "", recipientId = "", listingTitle = "", token = "", isOwner = false, conversationId = "" }) {
  if (isOwner || !recipientId) return "";
  const cleanConversationId = String(conversationId || "");
  if (token && cleanConversationId) {
    return `
      <span class="tag tag-green">Already messaged</span>
      <a class="btn-ghost" href="${getRelativeAuthPath("messages.html")}?id=${encodeURIComponent(cleanConversationId)}">Open chat</a>
    `;
  }
  return `
    <button class="${token ? "btn-primary" : "btn-ghost"}" type="button" data-msg-listing-id="${escapeHtml(listingId)}" data-msg-recipient-id="${escapeHtml(recipientId)}" data-msg-listing-title="${escapeHtml(listingTitle)}" onclick="window._openMsgModal(this)">\u2709\uFE0F Message Poster</button>
  `;
}
function getCategoryMeta(category) {
  return BISCOON_CATEGORY_META[category] || {
    label: String(category || "other").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    emoji: "\u{1F4C4}"
  };
}
function getCategoryEmoji(category) {
  return getCategoryMeta(category).emoji;
}
function getListingPageHref(id) {
  const prefix = window.location.pathname.endsWith("/index.html") || window.location.pathname === "/" ? "pages" : "..";
  return `${prefix}/post/detail.html?id=${encodeURIComponent(id)}`;
}
function formatListingDate(value) {
  if (!value) return "Just posted";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently posted";
  return date.toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
}
function inferPageCategory() {
  const filename = window.location.pathname.split("/").pop() || "index.html";
  const slug = filename.replace(".html", "");
  if (slug === "index") return "";
  if (slug === "jobs" || slug === "rojgar") return "jobs";
  if (slug === "students") return "student";
  return slug;
}
function getDynamicListingsContainer() {
  const homeContainer = document.getElementById("listingsContainer");
  if (homeContainer) return homeContainer;
  const pageMain = document.querySelector(".page-main");
  if (pageMain) return pageMain;
  const layout = document.querySelector(".page-layout");
  const firstColumn = layout ? layout.firstElementChild : null;
  if (firstColumn) return firstColumn;
  return null;
}
const LISTINGS_PAGE_SIZE = 12;
let browseSession = null;
async function fetchListingsPage(options = {}) {
  const {
    category = "",
    subcategory = "",
    search = "",
    page = 1,
    limit = LISTINGS_PAGE_SIZE
  } = options;
  const url = new URL(`${getApiBase()}/api/listings`);
  if (category && category !== "all") url.searchParams.set("category", category);
  if (subcategory && subcategory !== "all") url.searchParams.set("subcategory", subcategory);
  if (search) url.searchParams.set("search", search);
  url.searchParams.set("page", String(Math.max(1, page)));
  url.searchParams.set("limit", String(limit || LISTINGS_PAGE_SIZE));
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error("Unable to load listings");
  const data = await response.json();
  return {
    listings: data.listings || [],
    total: Number(data.total || 0),
    page: Number(data.page || page),
    pages: Number(data.pages || 1),
    limit: Number(data.limit || limit || LISTINGS_PAGE_SIZE)
  };
}
async function fetchListings(category = "", search = "", limit = 0, subcategory = "") {
  const data = await fetchListingsPage({
    category,
    subcategory,
    search,
    page: 1,
    limit: limit || 48
  });
  return data.listings;
}
function listingSkeletons(count = 5) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-thumb"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line-short"></div>
        <div class="skeleton skeleton-line-xs"></div>
      </div>
    </div>
  `).join("");
}
function ensureListingsShell(target) {
  let feed = target.querySelector("#listingsFeed");
  let controls = target.querySelector("#listingsControls");
  if (feed && controls) return { feed, controls };
  feed = document.createElement("div");
  feed.id = "listingsFeed";
  feed.className = "listings-feed";
  controls = document.createElement("div");
  controls.id = "listingsControls";
  controls.className = "listings-controls";
  controls.innerHTML = `
    <button type="button" class="load-more" data-listings-more hidden>Load more listings \u2192</button>
    <div class="pagination" data-listings-pager hidden></div>
  `;
  target.innerHTML = "";
  target.appendChild(feed);
  target.appendChild(controls);
  return { feed, controls };
}
function relevanceScore(listing, query) {
  const q = query.toLowerCase();
  if (!q) return 0;
  const title = String(listing.title || "").toLowerCase();
  const desc = String(listing.description || "").toLowerCase();
  let score = 0;
  if (title.includes(q)) score += 3;
  if (desc.includes(q)) score += 1;
  return score;
}
function sortListingsClient(listings, sort, search = "") {
  const items = [...listings];
  if (sort === "relevant") {
    items.sort((a, b) => relevanceScore(b, search) - relevanceScore(a, search) || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return items;
  }
  if (sort === "closest") {
    items.sort((a, b) => String(a.location || "").localeCompare(String(b.location || "")) || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return items;
  }
  items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return items;
}
function getActiveSortValue() {
  const select = document.querySelector(".sort-select");
  return select?.value || "newest";
}
function bindSortSelect() {
  document.querySelectorAll(".sort-select").forEach((select) => {
    if (select.dataset.sortBound === "true") return;
    select.dataset.sortBound = "true";
    Array.from(select.options).forEach((opt, index) => {
      const label = (opt.textContent || "").toLowerCase();
      if (label.includes("newest")) opt.value = "newest";
      else if (label.includes("relevant")) opt.value = "relevant";
      else if (label.includes("closest")) opt.value = "closest";
      else if (!opt.value) opt.value = ["newest", "relevant", "closest"][index] || "newest";
    });
    select.addEventListener("change", () => {
      if (!browseSession) return;
      browseSession.sort = select.value;
      const feed = document.getElementById("listingsFeed");
      if (!feed) return;
      renderListingsIntoFeed(browseSession.items, feed, false);
    });
  });
}
function updateListingsControls(controls, session) {
  const more = controls.querySelector("[data-listings-more]");
  const pager = controls.querySelector("[data-listings-pager]");
  if (more) {
    const hasMore = session.page < session.pages;
    more.hidden = !hasMore;
    more.disabled = false;
    more.textContent = hasMore ? `Load more listings \u2192 (${session.items.length} of ${session.total})` : "All listings loaded";
  }
  if (pager) {
    if (session.pages <= 1) {
      pager.hidden = true;
      pager.innerHTML = "";
      return;
    }
    pager.hidden = false;
    const start = Math.max(1, session.page - 2);
    const end = Math.min(session.pages, start + 4);
    const buttons = [
      `<button type="button" class="pg-btn" data-listings-page="${session.page - 1}" ${session.page <= 1 ? "disabled" : ""}>\u2190 Prev</button>`
    ];
    for (let i = start; i <= end; i += 1) {
      buttons.push(`<button type="button" class="pg-btn${i === session.page ? " active" : ""}" data-listings-page="${i}">${i}</button>`);
    }
    buttons.push(`<button type="button" class="pg-btn" data-listings-page="${session.page + 1}" ${session.page >= session.pages ? "disabled" : ""}>Next \u2192</button>`);
    pager.innerHTML = buttons.join("");
  }
}
function resolveBrowseQuery(category = inferPageCategory()) {
  const params = new URLSearchParams(window.location.search);
  const requestedScope = getListingScopeForCategory(params.get("category") || "");
  const pageScope = getListingScopeForCategory(category);
  const activeHomeFilter = document.querySelector(".filter-btn.active");
  const homeScope = activeHomeFilter ? getListingScopeForCategory(getFilterFromButton(activeHomeFilter)) : { category: "", subcategory: "" };
  const chip = getActiveChipFilter();
  const requestedSearch = params.get("search") || "";
  const selectedCategory = requestedScope.category || homeScope.category || pageScope.category;
  const baseSubcategory = params.get("subcategory") || pageScope.subcategory || homeScope.subcategory || requestedScope.subcategory || "";
  let selectedSubcategory = baseSubcategory;
  let search = requestedSearch;
  if (chip) {
    if (baseSubcategory && chip !== baseSubcategory) {
      search = [requestedSearch, chip].filter(Boolean).join(" ").trim();
    } else if (!baseSubcategory) {
      selectedSubcategory = chip;
    }
  }
  return { category: selectedCategory, subcategory: selectedSubcategory, search };
}
function renderListingsIntoFeed(listings, feed, append) {
  const sorted = sortListingsClient(listings, browseSession?.sort || getActiveSortValue(), browseSession?.search || "");
  if (append) {
    feed.insertAdjacentHTML("beforeend", sorted.map(listingToCard).join(""));
    return;
  }
  updateFilterChipsFromListings(sorted);
  if (!sorted.length) {
    feed.parentElement?.setAttribute("data-dynamic-state", "empty");
    feed.innerHTML = `
      <div class="empty-state">
        <div class="icon">${escapeHtml(getCategoryEmoji(inferPageCategory() || "other"))}</div>
        <h3>No live listings yet</h3>
        <p>Be the first to add a real post for this section.</p>
        <a class="btn-primary" href="${getPostListingPath(inferPageCategory())}">Post a Listing</a>
      </div>
    `;
    return;
  }
  const grouped = sorted.reduce((groups, listing) => {
    const cat = listing.category || "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(listing);
    return groups;
  }, {});
  feed.parentElement?.setAttribute("data-dynamic-state", "live");
  feed.innerHTML = Object.entries(grouped).map(([cat, items]) => {
    const meta = getCategoryMeta(cat);
    return `
      <div class="section-divider" data-group="${escapeHtml(cat)}">${meta.emoji} ${escapeHtml(meta.label)} <span class="count">${items.length} live</span></div>
      ${items.map(listingToCard).join("")}
    `;
  }).join("");
}
async function fetchDiscussions(search = "", limit = 25) {
  const url = new URL(`${getApiBase()}/api/discussions`);
  if (search) url.searchParams.set("search", search);
  if (limit) url.searchParams.set("limit", String(limit));
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error("Unable to load discussions");
  const data = await response.json();
  return data.discussions || [];
}
async function fetchListingStats() {
  const response = await fetch(`${getApiBase()}/api/listings/stats/summary`);
  if (!response.ok) throw new Error("Unable to load listing stats");
  return response.json();
}
function formatCount(value, fallback = "0") {
  const number = Number(value || 0);
  if (!number) return fallback;
  return number.toLocaleString();
}
function getDefaultListingImageMarkup(category = "other") {
  return `<span class="listing-default-image">${escapeHtml(getCategoryEmoji(category))}</span>`;
}
function listingToCard(listing) {
  const category = listing.category || "other";
  const isPhotographyListing = category === "photography";
  const meta = getCategoryMeta(category);
  const images = Array.isArray(listing.images) ? listing.images : [];
  const image = images.length ? images[0] : "";
  const imageCount = images.length;
  const countBadge = isPhotographyListing && imageCount > 1 ? `<span class="photo-count-badge">\u{1F4F7} ${imageCount}</span>` : "";
  const thumb = image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title || "Listing image")}" loading="lazy">${countBadge}` : getDefaultListingImageMarkup(category);
  const thumbClass = isPhotographyListing && image ? "listing-thumb listing-thumb--photo listing-thumb--photo-card" : "listing-thumb";
  const subcategory = listing.subcategory ? `<span class="tag tag-blue">${escapeHtml(listing.subcategory)}</span>` : "";
  const availability = listing.availability ? `<span class="tag tag-green">${escapeHtml(listing.availability)}</span>` : "";
  const tags = Array.isArray(listing.tags) ? listing.tags.slice(0, 2).map((tag) => `<span class="tag tag-gray">${escapeHtml(tag)}</span>`).join("") : "";
  const contact = !isPhotographyListing && listing.contactEmail ? `<span>${escapeHtml(listing.contactEmail)}</span>` : "";
  const priceText = isPhotographyListing ? `\u{1F4F7} ${imageCount} photo${imageCount !== 1 ? "s" : ""}` : escapeHtml(listing.price || "Open");
  return `
    <a class="listing-card${isPhotographyListing ? " listing-card--photo" : ""}" data-cat="${escapeHtml(category)}" data-listing-id="${escapeHtml(listing.id || "")}" href="${getListingPageHref(listing.id || "")}">
      <div class="${thumbClass}">${thumb}</div>
      <div class="listing-body">
        <div class="listing-title">${escapeHtml(listing.title || "Untitled listing")}</div>
        <div class="listing-meta">
          ${isPhotographyListing ? `<span>\u{1F4CD} ${escapeHtml(listing.location || "Photo showcase")}</span>` : `<span>\u{1F4CD} ${escapeHtml(listing.location || "Remote / Flexible")}</span>`}
          <span>\u{1F550} ${escapeHtml(formatListingDate(listing.createdAt))}</span>
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
function getDiscussionPageHref(id) {
  const prefix = window.location.pathname.endsWith("/index.html") || window.location.pathname === "/" ? "pages" : "..";
  return `${prefix}/community/discussions.html?id=${encodeURIComponent(id)}`;
}
function discussionToSearchCard(discussion) {
  const body = String(discussion.body || "");
  const excerpt = body.length > 150 ? `${body.slice(0, 147)}...` : body;
  return `
    <a class="search-discussion-card" href="${getDiscussionPageHref(discussion.id || "")}">
      <div class="search-discussion-kicker">
        <span class="discussion-category">${escapeHtml(discussion.category || "general")}</span>
        <span>Discussion</span>
      </div>
      <div class="search-discussion-title">${escapeHtml(discussion.title || "Untitled discussion")}</div>
      <div class="search-discussion-body">${escapeHtml(excerpt || "Open this topic to read the conversation.")}</div>
      <div class="search-discussion-meta">
        <span>Started by ${escapeHtml(discussion.authorName || "Community member")}</span>
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
  const topLevelComments = comments.filter((comment) => !comment.parentId);
  const repliesByParent = comments.reduce((groups, comment) => {
    if (!comment.parentId) return groups;
    if (!groups[comment.parentId]) groups[comment.parentId] = [];
    groups[comment.parentId].push(comment);
    return groups;
  }, {});
  const renderReplyForm = (comment) => `
    <button class="reply-toggle" type="button" data-listing-reply-target="${escapeHtml(comment.id)}">Reply</button>
    <form class="reply-form" data-listing-reply-form="${escapeHtml(comment.id)}" data-listing-comment-form="${escapeHtml(listing.id || "")}">
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
    return replies.map((reply) => `
      <article class="listing-comment-card listing-comment-reply" style="--reply-depth:${Math.min(depth, 4)}">
        <div class="listing-comment-meta">
          <strong>${escapeHtml(reply.authorName || "Community member")}</strong>
          <span>${escapeHtml(formatListingDate(reply.createdAt))}</span>
        </div>
        <div class="listing-comment-body">${escapeHtml(reply.body || "")}</div>
        ${canReplyInThread ? renderReplyForm(reply) : ""}
        ${renderThreadReplies(reply.id, rootUserId, depth + 1)}
      </article>
    `).join("");
  };
  const loginHref = `${getRelativeAuthPath("login.html")}?redirect=${encodeURIComponent(getListingPageHref(listing.id || ""))}`;
  const composeBlock = token ? `
      <form class="listing-comment-form" data-listing-comment-form="${escapeHtml(listing.id || "")}">
        <label class="form-label" for="listingComment-${escapeHtml(listing.id || "")}">Add a comment</label>
        <textarea class="form-input" id="listingComment-${escapeHtml(listing.id || "")}" name="body" placeholder="Share a question or tip\u2026" required></textarea>
        <div class="listing-comment-actions">
          <button class="btn-primary" type="submit">Post comment</button>
        </div>
      </form>` : `
      <div class="listing-comment-signin">
        <p>Join the conversation after you sign in.</p>
        <a class="btn-primary" href="${loginHref}">Sign in to comment</a>
      </div>`;
  return `
    <section class="listing-comments" data-listing-comments="${escapeHtml(listing.id || "")}">
      <div class="listing-comments-head">${comments.length} comment${comments.length === 1 ? "" : "s"}</div>
      ${composeBlock}
      <div class="listing-comment-list">
        ${topLevelComments.length ? topLevelComments.map((comment) => {
    const canReplyInThread = token && currentUserId && (isOwner || currentUserId === comment.userId);
    return `
          <article class="listing-comment-card">
            <div class="listing-comment-meta">
              <strong>${escapeHtml(comment.authorName || "Community member")}</strong>
              <span>${escapeHtml(formatListingDate(comment.createdAt))}</span>
            </div>
            <div class="listing-comment-body">${escapeHtml(comment.body || "")}</div>
            ${canReplyInThread ? renderReplyForm(comment) : ""}
            ${renderThreadReplies(comment.id, comment.userId || "")}
          </article>
        `;
  }).join("") : '<div class="listing-comments-empty">No comments yet.</div>'}
      </div>
    </section>
  `;
}
function getCurrentUserIdFromToken() {
  const token = getBiscoonToken();
  if (!token) return "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload.id || "";
  } catch (error) {
    return "";
  }
}
async function postListingComment(listingId, body, parentId = "") {
  const token = getBiscoonToken();
  if (!token) {
    window.location.href = `${getRelativeAuthPath("login.html")}?redirect=${encodeURIComponent(getListingPageHref(listingId))}`;
    return;
  }
  const response = await fetch(`${getApiBase()}/api/listings/${encodeURIComponent(listingId)}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ body, parentId })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to post comment.");
  window.dispatchEvent(new Event("biscoon:notifications-updated"));
  return data.listing;
}
function ensureListingModal() {
  let modal = document.getElementById("listingModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "listingModal";
  modal.className = "listing-modal";
  modal.innerHTML = `
    <div class="listing-modal-backdrop" data-close-listing-modal></div>
    <div class="listing-modal-panel" role="dialog" aria-modal="true" aria-labelledby="listingModalTitle">
      <button class="listing-modal-close" type="button" data-close-listing-modal aria-label="Close listing details">\xD7</button>
      <div id="listingModalBody" class="listing-modal-body">
        <div class="empty-state"><div class="icon">\u{1F4C4}</div><h3>Loading listing...</h3></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}
function closeListingModal() {
  const modal = document.getElementById("listingModal");
  if (!modal) return;
  modal.classList.remove("open");
  document.body.classList.remove("listing-modal-open");
}
function renderListingModalContent(listing) {
  const meta = getCategoryMeta(listing.category || "other");
  const isPhotoModal = (listing.category || "other") === "photography";
  const modalImages = Array.isArray(listing.images) ? listing.images : [];
  const galleryClass = isPhotoModal && modalImages.length > 1 ? "listing-detail-gallery photo-detail-gallery" : "listing-detail-gallery";
  const gallery = modalImages.length ? `<div class="${galleryClass}" data-pswp-gallery>${modalImages.map((image, index) => `<a href="${escapeHtml(image)}" data-pswp-src="${escapeHtml(image)}"${isPhotoModal && index === 0 ? ' class="photo-hero-slot"' : ""} aria-label="Open image ${index + 1}"><img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title || "Listing image")}" loading="lazy"></a>`).join("")}</div>` : `<div class="listing-detail-gallery">${getDefaultListingImageMarkup(listing.category || "other")}</div>`;
  const contactPhone = listing.contactPhone ? `<a class="btn-ghost" href="tel:${escapeHtml(listing.contactPhone)}">${escapeHtml(listing.contactPhone)}</a>` : "";
  const externalHref = safeExternalHref(listing.externalLink);
  const externalLink = externalHref ? `<a class="btn-ghost" href="${escapeHtml(externalHref)}" target="_blank" rel="noopener">Open link</a>` : "";
  const token = getBiscoonToken();
  const currentUserId = getCurrentUserIdFromToken();
  const isOwner = !!(token && currentUserId && listing.userId === currentUserId);
  const messageBtn = getMessagePosterActionMarkup({
    listingId: listing.id || "",
    recipientId: listing.userId || "",
    listingTitle: listing.title || "",
    token,
    isOwner,
    conversationId: listing.existingConversationId || ""
  });
  const reportBtn = token && listing.id ? `<button class="btn-ghost" type="button" data-report-target="listing" data-report-id="${escapeHtml(listing.id)}">Report</button>` : "";
  const saveBtn = token && listing.id ? `<button class="btn-ghost${listing.savedByMe ? " saved" : ""}" type="button" data-save-listing="${escapeHtml(listing.id)}" data-saved="${listing.savedByMe ? "true" : "false"}">${listing.savedByMe ? "Saved" : "Save listing"}</button>` : "";
  const detailRows = [
    listing.locationType ? ["Location type", listing.locationType] : null,
    listing.availability ? ["Availability", listing.availability] : null,
    listing.priceNote ? ["Price note", listing.priceNote] : null,
    listing.contactPreference ? ["Contact preference", listing.contactPreference] : null,
    Array.isArray(listing.tags) && listing.tags.length ? ["Tags", listing.tags.join(", ")] : null
  ].filter(Boolean).map((item) => {
    const [label, value] = item;
    return `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`;
  }).join("");
  return `
    <div class="listing-detail-kicker">${meta.emoji} ${escapeHtml(meta.label)}</div>
    <h2 id="listingModalTitle">${escapeHtml(listing.title || "Untitled listing")}</h2>
    ${gallery}
    <div class="listing-detail-meta">
      ${isPhotoModal ? "" : `<span>\u{1F4CD} ${escapeHtml(listing.location || "Remote / Flexible")}</span>`}
      <span>\u{1F550} Posted ${escapeHtml(formatListingDate(listing.createdAt))}</span>
      ${listing.authorName ? `<span>\u{1F464} ${escapeHtml(listing.authorName)}</span>` : ""}
      ${listing.subcategory ? `<span>${escapeHtml(listing.subcategory)}</span>` : ""}
    </div>
    ${isPhotoModal ? "" : `<div class="listing-detail-price">${escapeHtml(listing.price || "")}</div>`}
    ${detailRows ? `<div class="listing-detail-meta">${detailRows}</div>` : ""}
    <p>${escapeHtml(listing.description || "No description provided.")}</p>
    <div class="listing-detail-contact">${saveBtn}${messageBtn}${contactPhone}${externalLink}${reportBtn}</div>
    ${renderListingComments(listing)}
  `;
}
async function fetchSavedListingStatus(listingId) {
  const token = getBiscoonToken();
  if (!token || !listingId) return false;
  const response = await fetch(`${getApiBase()}/api/listings/${encodeURIComponent(listingId)}/save`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return false;
  const data = await response.json();
  return Boolean(data.saved);
}
async function setSavedListingStatus(listingId, saved) {
  const token = getBiscoonToken();
  if (!token) {
    window.location.href = getLoginPath(window.location.pathname + window.location.search);
    return { saved: false };
  }
  const response = await fetch(`${getApiBase()}/api/listings/${encodeURIComponent(listingId)}/save`, {
    method: saved ? "POST" : "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not update saved listing.");
  return data;
}
async function submitReport(targetType, targetId) {
  const token = getBiscoonToken();
  if (!token) {
    window.location.href = getLoginPath(window.location.pathname + window.location.search);
    return;
  }
  const reason = window.prompt("Why are you reporting this? Type spam, scam, harassment, illegal, misinformation, or other.", "spam");
  if (!reason) return;
  const normalizedReason = reason.trim().toLowerCase();
  const allowed = ["spam", "scam", "harassment", "illegal", "misinformation", "other"];
  if (!allowed.includes(normalizedReason)) {
    alert("Please use one of: spam, scam, harassment, illegal, misinformation, other.");
    return;
  }
  const details = window.prompt("Optional: add details for the admin team.", "") || "";
  const response = await fetch(`${getApiBase()}/api/moderation/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ targetType, targetId, reason: normalizedReason, details })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not submit report.");
  alert("Thanks. The report was sent to admins.");
}
async function openListingModal(id) {
  if (!id) return;
  const modal = ensureListingModal();
  const body = modal.querySelector("#listingModalBody");
  modal.classList.add("open");
  document.body.classList.add("listing-modal-open");
  body.innerHTML = '<div class="empty-state"><div class="icon">\u{1F4C4}</div><h3>Loading listing...</h3></div>';
  try {
    const response = await fetch(`${getApiBase()}/api/listings/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error("Listing not found");
    const listing = await response.json();
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
    body.innerHTML = '<div class="empty-state"><div class="icon">\u{1F4C4}</div><h3>Listing not found</h3><p>This listing may have been removed.</p></div>';
  }
}
function bindListingDetailModal() {
  document.addEventListener("click", function(e) {
    const target = e.target;
    const closeTarget = target.closest("[data-close-listing-modal]");
    if (closeTarget) {
      e.preventDefault();
      closeListingModal();
      return;
    }
    const card = target.closest(".listing-card[data-listing-id]");
    if (!card) return;
    e.preventDefault();
    openListingModal(card.dataset.listingId || "");
  });
  document.addEventListener("click", async function(e) {
    const target = e.target;
    const saveButton = target.closest("[data-save-listing]");
    if (saveButton) {
      e.preventDefault();
      const listingId = saveButton.dataset.saveListing || "";
      const nextSaved = saveButton.dataset.saved !== "true";
      saveButton.disabled = true;
      try {
        const data = await setSavedListingStatus(listingId, nextSaved);
        saveButton.dataset.saved = data.saved ? "true" : "false";
        saveButton.classList.toggle("saved", Boolean(data.saved));
        saveButton.textContent = data.saved ? "Saved" : "Save listing";
      } catch (error) {
        alert(error.message);
      } finally {
        saveButton.disabled = false;
      }
      return;
    }
    const reportButton = target.closest("[data-report-target][data-report-id]");
    if (!reportButton) return;
    e.preventDefault();
    try {
      await submitReport(reportButton.dataset.reportTarget || "", reportButton.dataset.reportId || "");
    } catch (error) {
      alert(error.message);
    }
  });
  document.addEventListener("submit", async function(e) {
    const target = e.target;
    const form = target.closest("[data-listing-comment-form]");
    if (!form) return;
    e.preventDefault();
    const listingId = form.dataset.listingCommentForm || "";
    const textarea = form.querySelector("textarea");
    const parentIdInput = form.querySelector('[name="parentId"]');
    const parentId = parentIdInput?.value || "";
    const body = textarea ? textarea.value.trim() : "";
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
      const modalBody = document.getElementById("listingModalBody");
      if (modalBody && document.getElementById("listingModal")?.classList.contains("open")) {
        if (listing) modalBody.innerHTML = renderListingModalContent(listing);
      } else {
        await hydrateListingDetail();
      }
    } catch (error) {
      alert(error.message);
    }
  });
  document.addEventListener("click", function(e) {
    const target = e.target;
    const replyButton = target.closest("[data-listing-reply-target]");
    if (replyButton) {
      const replyTarget = replyButton.dataset.listingReplyTarget || "";
      const form = document.querySelector(`[data-listing-reply-form="${CSS.escape(replyTarget)}"]`);
      document.querySelectorAll("[data-listing-reply-form].open").forEach((openForm) => {
        if (openForm !== form) openForm.classList.remove("open");
      });
      if (form) form.classList.toggle("open");
      return;
    }
    const cancelButton = target.closest("[data-cancel-listing-reply]");
    if (cancelButton) {
      const cancelTarget = cancelButton.dataset.cancelListingReply || "";
      const form = document.querySelector(`[data-listing-reply-form="${CSS.escape(cancelTarget)}"]`);
      if (form) form.classList.remove("open");
    }
  });
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      const sendModal = document.getElementById("biscoonSendMsgModal");
      if (sendModal) {
        sendModal.remove();
        return;
      }
      closeListingModal();
    }
  });
}
function renderListings(listings, target = getDynamicListingsContainer()) {
  if (!target) return;
  const { feed, controls } = ensureListingsShell(target);
  browseSession = {
    category: "",
    subcategory: "",
    search: "",
    page: 1,
    pages: 1,
    total: listings.length,
    sort: getActiveSortValue(),
    items: listings
  };
  renderListingsIntoFeed(listings, feed, false);
  updateListingsControls(controls, browseSession);
}
function formatDynamicChipLabel(value) {
  return String(value || "").replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
function updateFilterChipsFromListings(listings) {
  const group = document.querySelector(".filter-chips");
  if (!group || group.dataset.staticFilters === "true") return;
  if (group.dataset.dynamicFiltersBuilt === "true") return;
  const subcategories = Array.from(new Set(
    listings.map((listing) => listing.subcategory).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));
  const chips = [
    '<button class="chip active" data-filter="all">All</button>',
    ...subcategories.map((subcategory) => {
      const count = listings.filter((listing) => listing.subcategory === subcategory).length;
      return `<button class="chip" data-filter="${escapeHtml(subcategory)}">${escapeHtml(formatDynamicChipLabel(subcategory))} (${count})</button>`;
    })
  ];
  group.innerHTML = chips.join("");
  group.dataset.dynamicFiltersBuilt = "true";
  bindDynamicFilterChips();
}
function updateHeroStats(stats, category = inferPageCategory()) {
  const heroStats = document.querySelectorAll(".page-hero-stat");
  if (!heroStats.length) return;
  const normalizedCategory = normalizeCategoryForListings(category);
  const categoryCount = normalizedCategory ? stats.byCategory?.[normalizedCategory] || 0 : stats.total;
  heroStats.forEach((stat) => {
    const numEl = stat.querySelector(".num");
    const labelEl = stat.querySelector(".lbl");
    if (!numEl || !labelEl) return;
    const currentLabel = labelEl.textContent.toLowerCase();
    if (currentLabel.includes("active listing") || currentLabel.includes("listings")) {
      numEl.textContent = formatCount(categoryCount);
      if (normalizedCategory) labelEl.textContent = `${getCategoryMeta(normalizedCategory).label} Listings`;
    } else if (currentLabel.includes("new this week") || currentLabel.includes("this week")) {
      numEl.textContent = formatCount(stats.week);
    } else if (currentLabel.includes("new today") || currentLabel.includes("today")) {
      numEl.textContent = formatCount(stats.today);
    } else if (currentLabel.includes("cities")) {
      numEl.textContent = formatCount(stats.cities);
    }
  });
}
function updateSidebarStats(stats, category = inferPageCategory()) {
  const normalizedCategory = normalizeCategoryForListings(category);
  const categoryCount = normalizedCategory ? stats.byCategory?.[normalizedCategory] || 0 : stats.total;
  document.querySelectorAll(".widget-row").forEach((row) => {
    const label = row.querySelector(".lbl")?.textContent.toLowerCase() || "";
    const value = row.querySelector(".val");
    if (!value) return;
    if (label.includes("active listing") || label.includes("service listings") || label.includes("listed org") || label.includes("works published") || label.includes("rooms available") || label.includes("pg rooms")) {
      value.textContent = formatCount(categoryCount);
    } else if (label.includes("new today") || label.includes("listings today")) {
      value.textContent = `${formatCount(stats.today)} new`;
    } else if (label.includes("new this week") || label.includes("new this month")) {
      value.textContent = formatCount(stats.week);
    } else if (label.includes("cities")) {
      value.textContent = formatCount(stats.cities);
    }
  });
}
function updateHomeStats(stats) {
  const listingStatRows = Array.from(document.querySelectorAll(".widget-row"));
  listingStatRows.forEach((row) => {
    const label = row.querySelector(".lbl")?.textContent.toLowerCase() || "";
    const value = row.querySelector(".val");
    if (!value) return;
    if (label.includes("active listings")) value.textContent = formatCount(stats.total);
    if (label.includes("pg rooms")) value.textContent = formatCount(stats.byCategory?.pg || stats.byCategory?.["paying-guest"] || 0);
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
function renderSearchResults(listings, search = "", category = "", discussions = []) {
  const panel = document.getElementById("searchResultsPanel");
  const meta = document.getElementById("searchResultsMeta");
  const container = document.getElementById("searchResultsContainer");
  if (!panel || !meta || !container) {
    renderListings(listings);
    return;
  }
  const totalResults = listings.length + discussions.length;
  const queryText = search ? ` for "${search}"` : "";
  const categoryText = category && category !== "all" ? ` in ${category === "discussions" ? "Discussions" : getCategoryMeta(category).label}` : "";
  const listingText = listings.length === 1 ? "1 listing" : `${listings.length} listings`;
  const discussionText = discussions.length === 1 ? "1 discussion" : `${discussions.length} discussions`;
  meta.textContent = totalResults ? `Showing ${listingText} and ${discussionText}${queryText}${categoryText}.` : `No results found${queryText}${categoryText}. Try a broader keyword or different category.`;
  container.innerHTML = totalResults ? `${listings.map(listingToCard).join("")}${discussions.map(discussionToSearchCard).join("")}` : '<div class="search-results-empty">No matching listings or discussions. Adjust your search and try again.</div>';
  panel.style.display = "block";
  requestAnimationFrame(() => panel.scrollIntoView({ behavior: "smooth", block: "start" }));
}
function clearSearch() {
  const input = document.getElementById("searchInput");
  const select = document.getElementById("searchCategory");
  const panel = document.getElementById("searchResultsPanel");
  if (input) input.value = "";
  if (select) select.value = "";
  if (panel) panel.style.display = "none";
}
function getFilterFromButton(button) {
  if (!button) return "all";
  if (button.dataset.filter) return button.dataset.filter;
  const onclick = button.getAttribute("onclick") || "";
  const match = onclick.match(/'([^']+)'/);
  return match ? match[1] : "all";
}
async function setFilter(button, category) {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
    btn.setAttribute("aria-pressed", "false");
  });
  if (button) {
    button.classList.add("active");
    button.setAttribute("aria-pressed", "true");
  }
  try {
    await hydrateDynamicListings(category === "all" ? "" : category, { page: 1, append: false });
    document.getElementById("listingsContainer")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    filterListings(category);
  }
}
function bindHomeFilterButtons() {
  document.querySelectorAll(".filter-bar .filter-btn[data-filter]").forEach((btn) => {
    if (btn.dataset.filterBound === "true") return;
    btn.dataset.filterBound = "true";
    btn.addEventListener("click", () => {
      void setFilter(btn, btn.dataset.filter || "all");
    });
  });
}
window.setFilter = setFilter;
async function hydrateDynamicListings(category = inferPageCategory(), options = {}) {
  const target = getDynamicListingsContainer();
  if (!target) return;
  const page = Math.max(1, options.page || 1);
  const append = Boolean(options.append);
  try {
    const { feed, controls } = ensureListingsShell(target);
    target.dataset.dynamicState = append ? "live" : "loading";
    if (!append) feed.innerHTML = listingSkeletons();
    const query = resolveBrowseQuery(category);
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = getListingScopeForCategory(params.get("category") || "").category;
    const activeHomeFilter = document.querySelector(".filter-btn.active");
    if (requestedCategory && activeHomeFilter) {
      document.querySelectorAll(".filter-btn").forEach((btn) => {
        const btnEl = btn;
        btnEl.classList.toggle(
          "active",
          getListingScopeForCategory(getFilterFromButton(btnEl)).category === requestedCategory
        );
      });
    }
    const data = await fetchListingsPage({
      category: query.category,
      subcategory: query.subcategory,
      search: query.search,
      page,
      limit: LISTINGS_PAGE_SIZE
    });
    const sort = getActiveSortValue();
    if (append && browseSession) {
      browseSession = {
        ...browseSession,
        ...query,
        page: data.page,
        pages: data.pages,
        total: data.total,
        sort,
        items: [...browseSession.items, ...data.listings]
      };
      renderListingsIntoFeed(browseSession.items, feed, false);
    } else {
      browseSession = {
        ...query,
        page: data.page,
        pages: data.pages,
        total: data.total,
        sort,
        items: data.listings
      };
      renderListingsIntoFeed(data.listings, feed, false);
    }
    updateListingsControls(controls, browseSession);
    if (!append && window.location.hash === "#listings") {
      target.closest("#listings")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (error) {
    console.error(error);
    const feed = document.getElementById("listingsFeed");
    if (feed && !append) {
      feed.innerHTML = `
        <div class="empty-state">
          <div class="icon">\u26A0\uFE0F</div>
          <h3>Could not load listings</h3>
          <p>Check your connection and try again.</p>
        </div>
      `;
    }
  }
}
function getActiveChipFilter() {
  const activeChip = document.querySelector(".filter-chips .chip.active[data-filter]");
  const filter = activeChip ? activeChip.dataset.filter : "";
  return filter && filter !== "all" ? filter : "";
}
function bindDynamicFilterChips() {
  document.querySelectorAll(".chip[data-filter]").forEach((chip) => {
    const chipEl = chip;
    if (chipEl.dataset.dynamicFilterBound) return;
    chipEl.dataset.dynamicFilterBound = "true";
    chipEl.addEventListener("click", async function() {
      const group = this.closest(".filter-chips");
      if (group) group.querySelectorAll(".chip").forEach((c) => {
        c.classList.remove("active");
        c.setAttribute("aria-pressed", "false");
      });
      this.classList.add("active");
      this.setAttribute("aria-pressed", "true");
      const target = getDynamicListingsContainer();
      if (!target) {
        filterListings(this.dataset.filter || "");
        return;
      }
      await hydrateDynamicListings(inferPageCategory());
    });
  });
}
async function hydrateListingDetail() {
  const target = document.getElementById("listingDetail");
  if (!target) return;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    target.innerHTML = '<div class="empty-state"><div class="icon">\u{1F4C4}</div><h3>Listing not found</h3><p>No listing id was provided.</p></div>';
    return;
  }
  try {
    const response = await fetch(`${getApiBase()}/api/listings/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error("Listing not found");
    const listing = await response.json();
    const meta = getCategoryMeta(listing.category || "other");
    const isPhotographyListing = listing.category === "photography";
    const detailImages = Array.isArray(listing.images) ? listing.images : [];
    const detailGalleryClass = isPhotographyListing && detailImages.length > 1 ? "listing-detail-gallery photo-detail-gallery" : "listing-detail-gallery";
    const gallery = detailImages.length ? `<div class="${detailGalleryClass}" data-pswp-gallery>${detailImages.map((image, index) => `<a href="${escapeHtml(image)}" data-pswp-src="${escapeHtml(image)}"${isPhotographyListing && index === 0 ? ' class="photo-hero-slot"' : ""} aria-label="Open image ${index + 1}"><img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title || "Listing image")}" loading="lazy"></a>`).join("")}</div>` : `<div class="listing-detail-gallery">${getDefaultListingImageMarkup(listing.category || "other")}</div>`;
    const externalHref = safeExternalHref(listing.externalLink);
    const externalLink = !isPhotographyListing && externalHref ? `<a class="btn-ghost" href="${escapeHtml(externalHref)}" target="_blank" rel="noopener">Open link</a>` : "";
    const detailToken = getBiscoonToken();
    const detailUserId = getCurrentUserIdFromToken();
    const isDetailOwner = !!(detailToken && detailUserId && listing.userId === detailUserId);
    if (!isPhotographyListing && detailToken && listing.userId && !isDetailOwner) {
      listing.existingConversationId = await fetchExistingConversationId(listing.id, listing.userId);
    }
    if (detailToken && listing.id) {
      listing.savedByMe = await fetchSavedListingStatus(listing.id);
    }
    const detailSaveBtn = detailToken && listing.id ? `<button class="btn-ghost${listing.savedByMe ? " saved" : ""}" type="button" data-save-listing="${escapeHtml(listing.id)}" data-saved="${listing.savedByMe ? "true" : "false"}">${listing.savedByMe ? "Saved" : "Save listing"}</button>` : "";
    const detailMessageBtn = isPhotographyListing ? "" : getMessagePosterActionMarkup({
      listingId: listing.id || "",
      recipientId: listing.userId || "",
      listingTitle: listing.title || "",
      token: detailToken,
      isOwner: isDetailOwner,
      conversationId: listing.existingConversationId || ""
    });
    const detailActions = [
      detailSaveBtn,
      detailMessageBtn,
      !isPhotographyListing && listing.contactPhone ? `<a class="btn-ghost" href="tel:${escapeHtml(listing.contactPhone)}">${escapeHtml(listing.contactPhone)}</a>` : "",
      externalLink
    ].filter(Boolean).join("");
    const mapHref = listing.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.location)}` : "";
    const mapBlock = !isPhotographyListing && listing.location ? `
      <div class="listing-map-shell" data-listing-map data-location="${escapeHtml(listing.location)}">
        <div class="listing-map-canvas" data-map-canvas></div>
        <div class="listing-map-meta">
          <span>Approximate area: ${escapeHtml(listing.location)}</span>
          <a href="${escapeHtml(mapHref)}" target="_blank" rel="noopener">Open full map</a>
        </div>
      </div>
    ` : "";
    const detailRows = [
      !isPhotographyListing && listing.locationType ? ["Location type", listing.locationType] : null,
      !isPhotographyListing && listing.availability ? ["Availability", listing.availability] : null,
      !isPhotographyListing && listing.priceNote ? ["Price note", listing.priceNote] : null,
      !isPhotographyListing && listing.contactPreference ? ["Contact preference", listing.contactPreference] : null,
      Array.isArray(listing.tags) && listing.tags.length ? ["Tags", listing.tags.join(", ")] : null
    ].filter(Boolean).map((item) => {
      const [label, value] = item;
      return `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`;
    }).join("");
    target.innerHTML = `
      <article class="listing-detail-card">
        <div class="listing-detail-kicker">${meta.emoji} ${escapeHtml(meta.label)}</div>
        <h1>${escapeHtml(listing.title || "Untitled listing")}</h1>
        ${gallery}
        <div class="listing-detail-meta">
          ${isPhotographyListing ? "<span>Photo showcase</span>" : `<span>\u{1F4CD} ${escapeHtml(listing.location || "Remote / Flexible")}</span>`}
          <span>\u{1F550} Posted ${escapeHtml(formatListingDate(listing.createdAt))}</span>
          ${listing.authorName ? `<span>\u{1F464} ${escapeHtml(listing.authorName)}</span>` : ""}
          ${listing.subcategory ? `<span>${escapeHtml(listing.subcategory)}</span>` : ""}
        </div>
        ${isPhotographyListing ? "" : `<div class="listing-detail-price">${escapeHtml(listing.price || "Open")}</div>`}
        ${detailRows ? `<div class="listing-detail-meta">${detailRows}</div>` : ""}
        <p>${escapeHtml(listing.description || "No description provided.")}</p>
        ${detailActions ? `<div class="listing-detail-contact">${detailActions}</div>` : ""}
        ${mapBlock}
        ${renderListingComments(listing)}
      </article>
    `;
  } catch (error) {
    target.innerHTML = '<div class="empty-state"><div class="icon">\u{1F4C4}</div><h3>Listing not found</h3><p>This listing may have been removed.</p></div>';
  }
}
document.addEventListener("DOMContentLoaded", function() {
  bindHomeFilterButtons();
  hydrateDynamicListings();
  hydrateListingDetail();
  hydrateDynamicStats();
  bindDynamicFilterChips();
});
function buildHeatmap() {
  const container = document.getElementById("heatmapDots");
  if (!container) return;
  const cities = [
    { name: "New York, NY", x: 68, y: 32, pop: 45e3, sz: 28 },
    { name: "Boston, MA", x: 71, y: 23, pop: 28e3, sz: 23 },
    { name: "San Francisco, CA", x: 7, y: 39, pop: 35e3, sz: 25 },
    { name: "Chicago, IL", x: 52, y: 30, pop: 18e3, sz: 18 },
    { name: "Houston, TX", x: 45, y: 65, pop: 22e3, sz: 20 },
    { name: "Washington DC", x: 66, y: 38, pop: 12e3, sz: 16 },
    { name: "Los Angeles, CA", x: 11, y: 53, pop: 25e3, sz: 21 },
    { name: "Seattle, WA", x: 8, y: 17, pop: 14e3, sz: 17 },
    { name: "Dallas, TX", x: 44, y: 59, pop: 9e3, sz: 14 },
    { name: "Philadelphia, PA", x: 67, y: 35, pop: 8e3, sz: 13 },
    { name: "Atlanta, GA", x: 58, y: 55, pop: 7e3, sz: 13 },
    { name: "Denver, CO", x: 32, y: 37, pop: 7500, sz: 12 },
    { name: "Minneapolis, MN", x: 48, y: 20, pop: 5e3, sz: 11 },
    { name: "Lowell, MA", x: 71, y: 21, pop: 6e3, sz: 12 },
    { name: "San Jose, CA", x: 7, y: 43, pop: 8e3, sz: 13 }
  ];
  cities.forEach((c) => {
    const dot = document.createElement("div");
    dot.className = "heatmap-dot";
    dot.style.cssText = `left:${c.x}%;top:${c.y}%;width:${c.sz}px;height:${c.sz}px;font-size:${Math.max(7, Math.floor(c.sz / 3.5))}px;animation-delay:${Math.random() * 2}s`;
    const tip = document.createElement("div");
    tip.className = "heatmap-tooltip";
    tip.innerHTML = `<strong>${c.name}</strong><br>~${c.pop.toLocaleString()} Nepalis`;
    dot.appendChild(tip);
    container.appendChild(dot);
  });
}
function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
window._openMsgModal = function(btn) {
  const listingId = btn.dataset.msgListingId || "";
  const recipientId = btn.dataset.msgRecipientId || "";
  const listingTitle = btn.dataset.msgListingTitle || "";
  if (!getBiscoonToken()) {
    window.location.href = getLoginPath(window.location.href);
    return;
  }
  biscoonOpenSendMessageModal({ listingId, recipientId, listingTitle });
};
function biscoonOpenSendMessageModal({ listingId, recipientId, listingTitle }) {
  const existing = document.getElementById("biscoonSendMsgModal");
  if (existing) existing.remove();
  function esc(v) {
    return escapeHtml(v);
  }
  const modal = document.createElement("div");
  modal.id = "biscoonSendMsgModal";
  modal.className = "messages-send-modal";
  modal.style.cssText = "position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center";
  modal.innerHTML = `
    <div style="position:absolute;inset:0;background:rgba(0,0,0,.45)" id="biscoonSendMsgBackdrop"></div>
    <div style="position:relative;z-index:1;background:white;border-radius:12px;padding:28px;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,.18);margin:0 16px" role="dialog" aria-modal="true">
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;color:var(--navy);margin-bottom:6px">Message Poster</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:18px">About: ${esc(listingTitle || "this listing")}</p>
      <div id="biscoonSendMsgError" style="display:none;font-size:13px;color:var(--red);margin-bottom:10px"></div>
      <textarea id="biscoonSendMsgBody" placeholder="Write your message\u2026" rows="4" style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:12px;font-size:14px;font-family:inherit;resize:vertical;min-height:90px;outline:none;margin-bottom:14px;transition:border-color .15s"></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn-ghost" type="button" id="biscoonSendMsgCancel">Cancel</button>
        <button class="btn-primary" type="button" id="biscoonSendMsgSubmit">Send Message</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const closeModal = () => {
    const m = document.getElementById("biscoonSendMsgModal");
    if (m) m.remove();
  };
  document.getElementById("biscoonSendMsgBackdrop").addEventListener("click", closeModal);
  document.getElementById("biscoonSendMsgCancel").addEventListener("click", closeModal);
  const textarea = document.getElementById("biscoonSendMsgBody");
  if (textarea) textarea.focus();
  document.getElementById("biscoonSendMsgSubmit").addEventListener("click", async function() {
    const body = (document.getElementById("biscoonSendMsgBody")?.value || "").trim();
    const errEl = document.getElementById("biscoonSendMsgError");
    if (!body) {
      if (errEl) {
        errEl.textContent = "Please write a message.";
        errEl.style.display = "";
      }
      return;
    }
    this.disabled = true;
    this.textContent = "Sending\u2026";
    try {
      const token = getBiscoonToken();
      const response = await fetch(`${getApiBase()}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listingId, recipientId, body })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send message.");
      cacheConversationStatus(listingId, recipientId, data.conversationId || "");
      closeModal();
      window.location.href = `${getRelativeAuthPath("messages.html")}?id=${encodeURIComponent(data.conversationId)}`;
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message;
        errEl.style.display = "";
      }
      this.disabled = false;
      this.textContent = "Send Message";
    }
  });
}
