let activityApiBase = window.location.origin || 'http://localhost:4000';
if (activityApiBase.startsWith('file://')) {
  activityApiBase = 'http://localhost:4000';
}

let allActivityItems = [];
let activeActivityFilter = 'all';

function getActivityToken() {
  if (window.biscoonSession && typeof window.biscoonSession.getToken === 'function') {
    return window.biscoonSession.getToken();
  }
  return localStorage.getItem('biscoonToken');
}

function activityEscapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function formatActivityDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

async function loadActivity() {
  const list = document.getElementById('activityList');
  if (!list) return;

  const token = getActivityToken();
  if (!token) {
    window.location.href = 'login.html?redirect=/pages/auth/activity.html';
    return;
  }

  try {
    const response = await fetch(`${activityApiBase}/api/activity/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load activity.');
    allActivityItems = data.activities || [];
    renderActivity();
  } catch (error) {
    list.innerHTML = `<div class="activity-empty">${activityEscapeHtml(error.message)}</div>`;
  }
}

function renderActivity() {
  const list = document.getElementById('activityList');
  if (!list) return;

  const items = activeActivityFilter === 'all'
    ? allActivityItems
    : allActivityItems.filter(item => item.type === activeActivityFilter);

  if (!items.length) {
    list.innerHTML = '<div class="activity-empty">No activity yet.</div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <a class="activity-card" href="${activityEscapeHtml(item.url)}">
      <div class="activity-card-top">
        <span class="activity-label">${activityEscapeHtml(item.label)}</span>
        <span class="activity-date">${activityEscapeHtml(formatActivityDate(item.createdAt))}</span>
      </div>
      <div class="activity-title">${activityEscapeHtml(item.title || item.targetTitle || 'Activity')}</div>
      <div class="activity-body">${activityEscapeHtml(item.body || '')}</div>
      <div class="activity-target">${activityEscapeHtml(item.targetType === 'listing' ? 'Listing' : 'Discussion')}: ${activityEscapeHtml(item.targetTitle || '')}</div>
    </a>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-activity-filter]').forEach(button => {
    button.addEventListener('click', () => {
      activeActivityFilter = button.dataset.activityFilter;
      document.querySelectorAll('[data-activity-filter]').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      renderActivity();
    });
  });
  loadActivity();
});
