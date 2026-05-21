import { io, Socket } from 'socket.io-client';

type RealtimePayload = {
  title?: string;
  body?: string;
  actorName?: string;
  conversationId?: string;
};

let socket: Socket | null = null;

function token(): string {
  const session = (window as any).biscoonSession;
  if (session && typeof session.getToken === 'function') return session.getToken();
  return localStorage.getItem('biscoonToken') || '';
}

function baseUrl(): string {
  return window.location.origin.startsWith('file://') ? 'http://localhost:4000' : window.location.origin;
}

function escapeHtml(value = ''): string {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char));
}

function toast(message: string): void {
  let tray = document.getElementById('biscoonRealtimeTray');
  if (!tray) {
    tray = document.createElement('div');
    tray.id = 'biscoonRealtimeTray';
    tray.className = 'biscoon-realtime-tray';
    document.body.appendChild(tray);
  }
  const item = document.createElement('div');
  item.className = 'biscoon-realtime-toast';
  item.innerHTML = escapeHtml(message);
  tray.appendChild(item);
  requestAnimationFrame(() => item.classList.add('show'));
  window.setTimeout(() => {
    item.classList.remove('show');
    window.setTimeout(() => item.remove(), 180);
  }, 4200);
}

function connect(): void {
  const authToken = token();
  if (!authToken || socket?.connected) return;
  socket = io(baseUrl(), {
    auth: { token: authToken },
    transports: ['websocket', 'polling'],
  });
  socket.on('notification:new', (payload: RealtimePayload) => {
    window.dispatchEvent(new Event('biscoon:notifications-updated'));
    if (typeof (window as any).loadNotifications === 'function') (window as any).loadNotifications();
    toast(payload.title || 'New notification');
  });
  socket.on('message:new', (payload: RealtimePayload) => {
    window.dispatchEvent(new Event('biscoon:messages-updated'));
    toast(payload.actorName ? `New message from ${payload.actorName}` : 'New message');
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', connect);
else connect();
window.addEventListener('storage', event => {
  if (event.key === 'biscoonToken') {
    socket?.disconnect();
    socket = null;
    connect();
  }
});
