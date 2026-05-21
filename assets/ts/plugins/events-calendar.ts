import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  url?: string;
  extendedProps?: Record<string, string>;
};

function pageYear(): number {
  const match = document.body.textContent?.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : new Date().getFullYear();
}

function parseDateFromText(value: string, year: number): string {
  const match = value.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})\b/i);
  if (!match) return '';
  const date = new Date(`${match[1]} ${match[2]}, ${year}`);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function staticEvents(): CalendarEvent[] {
  const year = pageYear();
  return Array.from(document.querySelectorAll<HTMLElement>('.page-layout .listing-card')).map((card, index) => {
    const title = card.querySelector('.listing-title')?.textContent?.trim() || `Event ${index + 1}`;
    const meta = card.querySelector('.listing-meta')?.textContent?.trim() || '';
    const start = parseDateFromText(meta, year);
    const id = `static-${index}`;
    card.dataset.calendarEventId = id;
    return start ? {
      id,
      title,
      start,
      extendedProps: { cardId: id, meta },
    } : null;
  }).filter(Boolean) as CalendarEvent[];
}

async function liveEvents(): Promise<CalendarEvent[]> {
  try {
    const base = window.location.origin.startsWith('file://') ? 'http://localhost:4000' : window.location.origin;
    const response = await fetch(`${base}/api/listings?category=events&limit=80`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.listings || []).map((item: any) => {
      const start = parseDateFromText(`${item.availability || ''} ${item.description || ''}`, new Date().getFullYear());
      return start ? {
        id: `live-${item.id}`,
        title: item.title || 'Community event',
        start,
        url: `/pages/post/detail.html?id=${encodeURIComponent(item.id)}`,
        extendedProps: { meta: item.location || '' },
      } : null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function dedupeEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  return events.filter(event => {
    const key = `${event.title.toLowerCase()}|${event.start}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ensurePanel(): HTMLElement | null {
  if (document.getElementById('biscoonEventsCalendar')) return document.getElementById('biscoonEventsCalendarPanel');
  const anchor = document.querySelector('.filter-sort-bar') || document.querySelector('.page-hero');
  if (!anchor) return null;
  const panel = document.createElement('section');
  panel.id = 'biscoonEventsCalendarPanel';
  panel.className = 'events-calendar-panel';
  panel.innerHTML = `
    <div class="events-calendar-head">
      <div>
        <span class="events-calendar-eyebrow">Calendar view</span>
        <h2>Browse events by date</h2>
      </div>
      <a class="events-calendar-post" href="../post/listing.html?category=events">Post event</a>
    </div>
    <div id="biscoonEventsCalendar"></div>
  `;
  anchor.insertAdjacentElement('afterend', panel);
  return panel;
}

async function initEventsCalendar(): Promise<void> {
  if (!/\/community\/events\.html$/.test(window.location.pathname)) return;
  const panel = ensurePanel();
  const calendarEl = document.getElementById('biscoonEventsCalendar');
  if (!panel || !calendarEl) return;
  const events = dedupeEvents([...staticEvents(), ...(await liveEvents())]);
  const calendar = new Calendar(calendarEl, {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    height: 'auto',
    events,
    eventClick(info) {
      const cardId = info.event.extendedProps.cardId;
      if (cardId) {
        info.jsEvent.preventDefault();
        document.querySelector<HTMLElement>(`[data-calendar-event-id="${cardId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
  });
  calendar.render();
}

function start(): void {
  initEventsCalendar().catch(console.error);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
