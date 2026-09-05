type AgendaEvent = {
  id: string;
  title: string;
  description: string;
  body: string;
  location: string;
  href: string;
  image: string;
  start: Date;
  timeLabel: string;
  sample?: boolean;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function evEscapeHtml(value: string): string {
  return String(value || '').replace(/[&<>"']/g, char => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
  ));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function mondayOf(date: Date): Date {
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = startOfDay(date);
  monday.setDate(monday.getDate() + offset);
  return monday;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(date: Date, fallback: string): string {
  if (fallback) return fallback;
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (!hours && !minutes) return '';
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 || 12;
  return minutes ? `${hour12}:${String(minutes).padStart(2, '0')}${suffix}` : `${hour12}:00${suffix}`;
}

function parseTimeLabel(text: string): string {
  const match = String(text || '').match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!match) return '';
  const hour = match[1];
  const minute = match[2] ? `:${match[2]}` : ':00';
  return `${hour}${minute}${match[3].toLowerCase()}`;
}

function parseEventDate(text: string, fallback: Date): Date | null {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const iso = raw.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const named = raw.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,?\s*(20\d{2}))?/i);
  if (named) {
    const year = named[3] ? Number(named[3]) : fallback.getFullYear();
    const date = new Date(`${named[1]} ${named[2]}, ${year}`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function listingHref(id: string): string {
  return `/pages/post/detail.html?id=${encodeURIComponent(id)}`;
}

function excerpt(text: string, max = 140): string {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function sampleEvents(now: Date): AgendaEvent[] {
  const year = now.getFullYear();
  const items = [
    { title: 'Boston Nepali Networking Night', date: `${year}-08-18`, time: '11:00am', location: 'Cambridge, MA', description: 'Meet founders, students, and new arrivals over tea — intros, job leads, and housing tips for Greater Boston.' },
    { title: 'Innovation Workshop', date: `${year}-08-20`, time: '04:00pm', location: 'Lowell, MA', description: 'A hands-on afternoon on storytelling, small-business setup, and community projects for Nepali youth and families.' },
    { title: 'Leadership Roundtable', date: `${year}-08-22`, time: '10:00am', location: 'Quincy, MA', description: 'Community organizers share how local associations plan Dashain, Tihar, and newcomer welcome weeks.' },
    { title: 'Neetesh Jung Kunwar — East Coast Tour', date: `${year}-08-15`, time: '07:00pm', location: 'New York City, NY', description: 'Live Nepali music night for the diaspora — doors open early, family seating available.' },
    { title: 'Sabin Rai & The Pharaoh — Live in Boston', date: `${year}-09-06`, time: '07:00pm', location: 'Boston, MA', description: 'An evening of Nepali rock and folk with the Boston community. Tickets at the door while they last.' },
    { title: 'Dashain Mela 2083 — Cultural Night', date: `${year}-09-20`, time: '04:00pm', location: 'Dallas, TX', description: 'Tika, food stalls, kids’ games, and a cultural program for Dashain with Nepali families across Texas.' },
    { title: 'Pramod Kharel — Dashain Special Concert', date: `${year}-10-04`, time: '06:00pm', location: 'Washington DC', description: 'A Dashain concert for the DC–Virginia–Maryland Nepali community.' },
  ];
  return items.map((item, index) => {
    const [y, m, d] = item.date.split('-').map(Number);
    return {
      id: `sample-${index}`,
      title: item.title,
      description: item.description,
      body: item.description,
      location: item.location,
      href: `#event-sample-${index}`,
      image: '',
      start: new Date(y, m - 1, d),
      timeLabel: item.time,
      sample: true,
    };
  });
}

function fromListing(listing: {
  id?: string;
  title?: string;
  description?: string;
  location?: string;
  availability?: string;
  images?: string[];
  createdAt?: string;
}): AgendaEvent | null {
  const blob = `${listing.availability || ''} ${listing.description || ''} ${listing.title || ''}`;
  const created = listing.createdAt ? new Date(listing.createdAt) : new Date();
  const parsed = parseEventDate(blob, created) || parseEventDate(listing.availability || '', created);
  const start = parsed || startOfDay(created);
  const body = String(listing.description || '').replace(/\s+/g, ' ').trim()
    || listing.location
    || 'Nepali community gathering.';
  const image = Array.isArray(listing.images) && listing.images[0] ? listing.images[0] : '';
  return {
    id: listing.id || `listing-${start.getTime()}`,
    title: listing.title || 'Community event',
    description: excerpt(body),
    body,
    location: listing.location || '',
    href: listing.id ? listingHref(listing.id) : '#event',
    image,
    start,
    timeLabel: parseTimeLabel(blob) || formatTime(start, ''),
  };
}

function isAgendaMode(): boolean {
  const sub = (new URLSearchParams(window.location.search).get('subcategory') || '').toLowerCase();
  const chip = document.querySelector('.chip.active') as HTMLElement | null;
  const chipFilter = (chip?.getAttribute('data-filter') || '').toLowerCase();
  const filter = chipFilter && chipFilter !== 'all' ? chipFilter : sub;
  return !filter || filter === 'events';
}

function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function eventsOnDay(events: AgendaEvent[], date: Date): AgendaEvent[] {
  const key = ymd(date);
  return events.filter(event => ymd(event.start) === key);
}

function renderThumb(event: AgendaEvent): string {
  if (event.image) {
    return `<img src="${evEscapeHtml(event.image)}" alt="${evEscapeHtml(event.title || 'Event')}" loading="lazy">`;
  }
  return `<span aria-hidden="true">🎉</span>`;
}

function renderGroup(date: Date, events: AgendaEvent[]): string {
  if (!events.length) return '';
  const dayName = DAYS[date.getDay()];
  const dateLabel = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return `
    <section class="ev-group" data-group-day="${ymd(date)}">
      <div class="ev-group-head">
        <span>${evEscapeHtml(dayName)}</span>
        <span>${evEscapeHtml(dateLabel)}</span>
      </div>
      ${events.map(event => `
        <a class="ev-row" href="${evEscapeHtml(event.href)}" data-event-id="${evEscapeHtml(event.id)}"${event.sample ? '' : ` data-listing-id="${evEscapeHtml(event.id)}"`}>
          <div class="ev-thumb">${renderThumb(event)}</div>
          <div class="ev-body">
            <div class="ev-title-row">
              <h3>${evEscapeHtml(event.title)}</h3>
              <time>${evEscapeHtml(event.timeLabel || 'TBA')}</time>
            </div>
            <p>${evEscapeHtml(event.description)}${event.location ? ` · ${evEscapeHtml(event.location)}` : ''}</p>
          </div>
        </a>
      `).join('')}
    </section>
  `;
}

const state = {
  monday: mondayOf(new Date()),
  selected: '',
  query: '',
  events: [] as AgendaEvent[],
  searchOpen: false,
  monthPickerOpen: false,
  pickerYear: new Date().getFullYear(),
};

function visibleEvents(): AgendaEvent[] {
  const days = weekDays(state.monday);
  const weekKeys = new Set(days.map(ymd));
  const q = state.query.trim().toLowerCase();
  return state.events
    .filter(event => weekKeys.has(ymd(event.start)))
    .filter(event => {
      if (!q) return true;
      return `${event.title} ${event.description} ${event.location}`.toLowerCase().includes(q);
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.title.localeCompare(b.title));
}

function renderMonthPicker(): string {
  const activeMonth = state.monday.getMonth();
  const activeYear = state.monday.getFullYear();
  const months = MONTHS.map((name, index) => {
    const isActive = state.pickerYear === activeYear && index === activeMonth;
    return `<button type="button" class="ev-picker-month${isActive ? ' is-active' : ''}" data-pick-month="${index}">${name.slice(0, 3)}</button>`;
  }).join('');
  return `
    <div class="ev-month-picker" role="dialog" aria-label="Choose month and year">
      <div class="ev-picker-year-nav">
        <button type="button" class="ev-month-btn" data-picker-year-shift="-1" aria-label="Previous year">‹</button>
        <span class="ev-picker-year">${state.pickerYear}</span>
        <button type="button" class="ev-month-btn" data-picker-year-shift="1" aria-label="Next year">›</button>
      </div>
      <div class="ev-picker-months">${months}</div>
    </div>
  `;
}

function renderWeek(root: HTMLElement): void {
  const days = weekDays(state.monday);
  const monthLabel = MONTHS[state.monday.getMonth()];
  root.innerHTML = `
    <div class="ev-week-bar">
      <div class="ev-week-top">
        <div class="ev-month-nav">
          <button type="button" class="ev-month-btn" data-week-shift="-7" aria-label="Previous week">‹</button>
          <button type="button" class="ev-month-label" data-open-month-picker aria-haspopup="true" aria-expanded="${state.monthPickerOpen}">${evEscapeHtml(monthLabel)} ${state.monday.getFullYear()}</button>
          <button type="button" class="ev-month-btn" data-week-shift="7" aria-label="Next week">›</button>
          ${state.monthPickerOpen ? renderMonthPicker() : ''}
        </div>
        <div class="ev-week-tools">
          <button type="button" class="ev-icon-btn is-on" data-ev-tool="list" aria-label="List view" aria-pressed="true">☰</button>
          <button type="button" class="ev-icon-btn" data-ev-tool="search" aria-label="Search events" aria-pressed="${state.searchOpen}">⌕</button>
          <a class="ev-icon-btn" href="../post/listing.html?category=events" aria-label="Post an event">+</a>
        </div>
      </div>
      <div class="ev-search-wrap${state.searchOpen ? ' is-open' : ''}">
        <input class="ev-search" type="search" placeholder="Search events" value="${evEscapeHtml(state.query)}" aria-label="Search events">
      </div>
      <div class="ev-dow" aria-hidden="true">${days.map(day => `<span>${DAYS_SHORT[day.getDay()]}</span>`).join('')}</div>
      <div class="ev-dates" role="listbox" aria-label="Days this week">
        ${days.map(day => {
          const key = ymd(day);
          const has = eventsOnDay(state.events, day).length > 0;
          const selected = state.selected === key || (!state.selected && key === ymd(new Date()) && mondayOf(new Date()).getTime() === state.monday.getTime());
          return `
            <button type="button" class="ev-date${selected ? ' is-selected' : ''}${has ? ' has-event' : ''}" data-day="${key}" role="option" aria-selected="${selected}">
              ${day.getDate()}
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderList(root: HTMLElement): void {
  const items = visibleEvents();
  if (!items.length) {
    root.innerHTML = `
      <div class="ev-empty">
        <p>No events in this week.</p>
        <a class="btn-primary" href="../post/listing.html?category=events">Post an event</a>
      </div>
    `;
    return;
  }
  const groups = new Map<string, AgendaEvent[]>();
  items.forEach(event => {
    const key = ymd(event.start);
    const bucket = groups.get(key) || [];
    bucket.push(event);
    groups.set(key, bucket);
  });
  root.innerHTML = Array.from(groups.entries()).map(([key, events]) => {
    const [y, m, d] = key.split('-').map(Number);
    return renderGroup(new Date(y, m - 1, d), events);
  }).join('');
}

function paint(): void {
  const week = document.getElementById('eventsWeekBar');
  const list = document.getElementById('eventsAgendaList');
  if (!week || !list) return;
  renderWeek(week);
  renderList(list);
}

function formatLongDate(date: Date): string {
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function ensureEventModal(): HTMLElement {
  let modal = document.getElementById('eventDetailModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'eventDetailModal';
  modal.className = 'listing-modal';
  modal.innerHTML = `
    <div class="listing-modal-backdrop" data-close-event-detail></div>
    <div class="listing-modal-panel" role="dialog" aria-modal="true" aria-labelledby="eventDetailTitle">
      <button class="listing-modal-close" type="button" data-close-event-detail aria-label="Close event details">×</button>
      <div id="eventDetailBody" class="listing-modal-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', event => {
    if ((event.target as HTMLElement).closest('[data-close-event-detail]')) {
      closeEventDetail();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal?.classList.contains('open')) closeEventDetail();
  });
  return modal;
}

function closeEventDetail(): void {
  const modal = document.getElementById('eventDetailModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.classList.remove('listing-modal-open');
}

function renderEventDetail(event: AgendaEvent, listing?: Record<string, unknown> | null): string {
  const images = Array.isArray(listing?.images) ? listing.images as string[] : (event.image ? [event.image] : []);
  const gallery = images.length
    ? `<div class="listing-detail-gallery">${images.map(image => `<img src="${evEscapeHtml(image)}" alt="${evEscapeHtml(event.title || 'Event')}">`).join('')}</div>`
    : `<div class="ev-detail-hero">${renderThumb(event)}</div>`;
  const phone = listing?.contactPhone ? String(listing.contactPhone) : '';
  const email = listing?.contactEmail ? String(listing.contactEmail) : '';
  const body = String(listing?.description || event.body || event.description);
  const listingLink = event.sample
    ? ''
    : `<a class="btn-ghost" href="${evEscapeHtml(event.href)}">Open full page</a>`;
  const phoneBtn = phone ? `<a class="btn-ghost" href="tel:${evEscapeHtml(phone)}">${evEscapeHtml(phone)}</a>` : '';
  const emailBtn = email ? `<a class="btn-ghost" href="mailto:${evEscapeHtml(email)}">${evEscapeHtml(email)}</a>` : '';
  return `
    <div class="listing-detail-kicker">🎉 Event</div>
    <h2 id="eventDetailTitle">${evEscapeHtml(event.title)}</h2>
    ${gallery}
    <div class="listing-detail-meta">
      <span>📅 ${evEscapeHtml(formatLongDate(event.start))}</span>
      <span>🕐 ${evEscapeHtml(event.timeLabel || 'Time TBA')}</span>
      ${event.location ? `<span>📍 ${evEscapeHtml(event.location)}</span>` : ''}
    </div>
    <p>${evEscapeHtml(body)}</p>
    <div class="listing-detail-contact">
      ${phoneBtn}${emailBtn}${listingLink}
    </div>
  `;
}

async function openEventDetail(id: string): Promise<void> {
  const event = state.events.find(item => item.id === id);
  if (!event) return;
  const modal = ensureEventModal();
  const body = modal.querySelector('#eventDetailBody') as HTMLElement;
  modal.classList.add('open');
  document.body.classList.add('listing-modal-open');
  body.innerHTML = '<div class="empty-state"><div class="icon">🎉</div><h3>Loading event…</h3></div>';

  let listing: Record<string, unknown> | null = null;
  if (!event.sample && event.id) {
    try {
      const base = window.location.origin.startsWith('file://') ? 'http://localhost:4000' : window.location.origin;
      const response = await fetch(`${base}/api/listings/${encodeURIComponent(event.id)}`);
      if (response.ok) listing = await response.json();
    } catch {
      listing = null;
    }
  }
  body.innerHTML = renderEventDetail(event, listing);
}

function bind(root: HTMLElement): void {
  root.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLAnchorElement>('.ev-row');
    if (row?.dataset.eventId) {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      openEventDetail(row.dataset.eventId);
      return;
    }
    const shift = target.closest<HTMLElement>('[data-week-shift]');
    if (shift) {
      state.monday = addDays(state.monday, Number(shift.dataset.weekShift));
      state.selected = '';
      state.monthPickerOpen = false;
      paint();
      return;
    }
    const openPicker = target.closest<HTMLElement>('[data-open-month-picker]');
    if (openPicker) {
      state.pickerYear = state.monday.getFullYear();
      state.monthPickerOpen = !state.monthPickerOpen;
      paint();
      return;
    }
    const yearShift = target.closest<HTMLElement>('[data-picker-year-shift]');
    if (yearShift) {
      state.pickerYear += Number(yearShift.dataset.pickerYearShift);
      paint();
      return;
    }
    const pickMonth = target.closest<HTMLElement>('[data-pick-month]');
    if (pickMonth) {
      const monthIndex = Number(pickMonth.dataset.pickMonth);
      let monday = mondayOf(new Date(state.pickerYear, monthIndex, 1));
      if (monday.getMonth() !== monthIndex) monday = addDays(monday, 7);
      state.monday = monday;
      state.selected = '';
      state.monthPickerOpen = false;
      paint();
      return;
    }
    const dayBtn = target.closest<HTMLButtonElement>('[data-day]');
    if (dayBtn?.dataset.day) {
      state.selected = dayBtn.dataset.day;
      paint();
      document.querySelector<HTMLElement>(`[data-group-day="${dayBtn.dataset.day}"]`)?.scrollIntoView({ block: 'start' });
      return;
    }
    const tool = target.closest<HTMLElement>('[data-ev-tool]');
    if (tool?.dataset.evTool === 'search') {
      state.searchOpen = !state.searchOpen;
      paint();
      root.querySelector<HTMLInputElement>('.ev-search')?.focus();
    }
  });
  root.addEventListener('input', event => {
    const input = event.target as HTMLInputElement;
    if (!input.classList.contains('ev-search')) return;
    state.query = input.value;
    renderList(document.getElementById('eventsAgendaList') as HTMLElement);
  });
  document.addEventListener('click', event => {
    if (!state.monthPickerOpen) return;
    const target = event.target as HTMLElement;
    if (target.closest('.ev-month-nav')) return;
    state.monthPickerOpen = false;
    paint();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.monthPickerOpen) {
      state.monthPickerOpen = false;
      paint();
    }
  });
}

async function fetchLiveEvents(): Promise<AgendaEvent[]> {
  const base = window.location.origin.startsWith('file://') ? 'http://localhost:4000' : window.location.origin;
  const urls = [
    `${base}/api/listings?category=community&subcategory=events&limit=80`,
    `${base}/api/listings?category=events&limit=80`,
  ];
  const listings: AgendaEvent[] = [];
  await Promise.all(urls.map(async url => {
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const data = await response.json();
      (data.listings || []).forEach((item: Record<string, unknown>) => {
        const event = fromListing(item as never);
        if (event) listings.push(event);
      });
    } catch {
      /* ignore */
    }
  }));
  const seen = new Set<string>();
  return listings.filter(event => {
    const key = `${event.title.toLowerCase()}|${ymd(event.start)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function setEvents(live: AgendaEvent[]): void {
  state.events = live.length ? live : sampleEvents(new Date());
  const today = ymd(new Date());
  if (eventsOnDay(state.events, new Date()).length) state.selected = today;
  paint();
}

function applyListings(listings: unknown[]): void {
  if (!isAgendaMode()) {
    document.body.classList.remove('events-agenda-on');
    return;
  }
  document.body.classList.add('events-agenda-on');
  const live = (listings || []).map(item => fromListing(item as never)).filter(Boolean) as AgendaEvent[];
  if (live.length) setEvents(live);
}

async function initEventsAgenda(): Promise<void> {
  if (!/\/community\/events\.html$/.test(window.location.pathname)) return;
  const root = document.getElementById('eventsAgenda');
  if (!root) return;
  bind(root);
  if (!isAgendaMode()) return;
  document.body.classList.add('events-agenda-on');
  const live = await fetchLiveEvents();
  setEvents(live);
  window.addEventListener('biscoon:listings-rendered', ((event: CustomEvent) => {
    applyListings(event.detail?.listings || []);
  }) as EventListener);
}

function start(): void {
  initEventsAgenda().catch(console.error);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
