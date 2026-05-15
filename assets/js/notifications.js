let notificationsApiBase = window.location.origin || 'http://localhost:4000';
if (notificationsApiBase.startsWith('file://')) {
  notificationsApiBase = 'http://localhost:4000';
}

function getNotificationsToken() {
  if (window.biscoonSession && typeof window.biscoonSession.getToken === 'function') {
    return window.biscoonSession.getToken();
  }
  return localStorage.getItem('biscoonToken');
}

function notificationEscapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function formatNotificationDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

async function notificationRequest(path, options = {}) {
  const token = getNotificationsToken();
  if (!token) {
    window.location.href = 'login.html?redirect=/pages/auth/notifications.html';
    throw new Error('Please sign in.');
  }
  const response = await fetch(`${notificationsApiBase}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load notifications.');
  return data;
}

async function loadNotifications() {
  const list = document.getElementById('notificationsList');
  if (!list) return;

  try {
    const data = await notificationRequest('/api/notifications');
    if (!data.notifications.length) {
      list.innerHTML = '<div class="notifications-empty">No notifications yet.</div>';
      window.dispatchEvent(new Event('biscoon:notifications-updated'));
      return;
    }

    list.innerHTML = data.notifications.map(notification => `
      <a class="notification-card ${notification.read ? '' : 'unread'}" href="${notificationEscapeHtml(notification.url)}" data-notification-id="${notificationEscapeHtml(notification.id)}">
        <div class="notification-title">
          <span>${notificationEscapeHtml(notification.title)}</span>
          <span class="notification-time">${notificationEscapeHtml(formatNotificationDate(notification.createdAt))}</span>
        </div>
        <div class="notification-body">${notificationEscapeHtml(notification.actorName)}: ${notificationEscapeHtml(notification.body)}</div>
        <div class="notification-target">${notificationEscapeHtml(notification.targetTitle || '')}</div>
      </a>
    `).join('');
    window.dispatchEvent(new Event('biscoon:notifications-updated'));
  } catch (error) {
    list.innerHTML = `<div class="notifications-empty">${notificationEscapeHtml(error.message)}</div>`;
  }
}

document.addEventListener('click', async event => {
  const card = event.target.closest('[data-notification-id]');
  if (!card) return;
  event.preventDefault();
  try {
    await notificationRequest(`/api/notifications/${encodeURIComponent(card.dataset.notificationId)}/read`, { method: 'PUT' });
  } finally {
    window.location.href = card.getAttribute('href');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('markAllNotificationsRead')?.addEventListener('click', async () => {
    await notificationRequest('/api/notifications/read-all', { method: 'PUT' });
    await loadNotifications();
  });
  loadNotifications();
});
