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
});

// ── Search ──
function doSearch() {
  const q = (document.getElementById('searchInput') || {}).value || '';
  const cat = (document.getElementById('searchCategory') || {}).value || '';
  if (q.trim() || cat) alert('Searching Biscoon' + (cat ? ' [' + cat + ']' : '') + (q ? ': ' + q.trim() : '') + '\n\n(Connect backend API for live results)');
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
