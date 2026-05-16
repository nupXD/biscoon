/* ═══════════════════════════════════════════════
   MESSAGES.JS — Biscoon inbox page
═══════════════════════════════════════════════ */

let messagesApiBase = window.location.origin || 'http://localhost:4000';
if (messagesApiBase.startsWith('file://')) messagesApiBase = 'http://localhost:4000';

let activeConversationId = null;

function msgEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function msgToken() {
  if (window.biscoonSession && typeof window.biscoonSession.getToken === 'function') {
    return window.biscoonSession.getToken();
  }
  return localStorage.getItem('biscoonToken') || '';
}

function formatMsgDate(value) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

async function msgRequest(path, options = {}) {
  const token = msgToken();
  if (!token) {
    window.location.href = 'login.html?redirect=/pages/auth/messages.html';
    throw new Error('Please sign in.');
  }
  const response = await fetch(`${messagesApiBase}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

async function loadConversations() {
  const list = document.getElementById('messagesList');
  if (!list) return;

  try {
    const data = await msgRequest('/api/messages');
    if (!data.conversations.length) {
      list.innerHTML = '<div class="messages-empty-state">No messages yet. Browse listings and send a message to get started.</div>';
      return;
    }

    list.innerHTML = data.conversations.map(conv => {
      const lastBody = conv.lastMessage ? conv.lastMessage.body : '';
      const preview = lastBody.length > 60 ? lastBody.slice(0, 57) + '...' : lastBody;
      const isUnread = conv.unreadCount > 0;
      return `
        <div class="messages-conv-card ${isUnread ? 'unread' : ''}" data-conv-id="${msgEscape(conv.id)}" role="button" tabindex="0">
          <div class="messages-conv-top">
            <span class="messages-conv-name">${msgEscape(conv.otherUserName)}</span>
            <span class="messages-conv-time">${msgEscape(formatMsgDate(conv.updatedAt))}</span>
          </div>
          <div class="messages-conv-listing">Re: ${msgEscape(conv.listingTitle || 'Listing')}</div>
          <div class="messages-conv-preview ${isUnread ? 'unread-text' : ''}">
            ${conv.lastMessage ? msgEscape(preview) : '<em>No messages yet</em>'}
            ${isUnread ? `<span class="messages-unread-badge" style="margin-left:6px">${conv.unreadCount}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    window.dispatchEvent(new Event('biscoon:messages-updated'));

    const params = new URLSearchParams(window.location.search);
    const openId = params.get('id');
    if (openId) openConversation(openId);
  } catch (err) {
    list.innerHTML = `<div class="messages-empty-state">${msgEscape(err.message)}</div>`;
  }
}

async function openConversation(id) {
  activeConversationId = id;

  document.querySelectorAll('.messages-conv-card').forEach(card => {
    card.classList.toggle('active', card.dataset.convId === id);
  });

  const thread = document.getElementById('messagesThread');
  if (!thread) return;
  thread.innerHTML = '<div class="messages-thread-empty"><div class="messages-thread-empty-icon">⏳</div><h3>Loading...</h3></div>';

  try {
    const conv = await msgRequest(`/api/messages/${encodeURIComponent(id)}`);

    const detailUrl = `../../pages/post/detail.html?id=${encodeURIComponent(conv.listingId)}`;
    thread.innerHTML = `
      <div class="messages-thread-head">
        <div class="messages-thread-head-name">${msgEscape(conv.otherUserName)}</div>
        <div class="messages-thread-head-listing">About: <a href="${msgEscape(detailUrl)}">${msgEscape(conv.listingTitle || 'Listing')}</a></div>
      </div>
      <div class="messages-thread-body" id="threadBody">
        ${conv.messages.map(m => `
          <div class="messages-bubble-row ${m.isOwn ? 'own' : 'other'}">
            <div class="messages-bubble">${msgEscape(m.body)}</div>
            <div class="messages-bubble-meta">${msgEscape(m.isOwn ? 'You' : m.senderName)} · ${msgEscape(formatMsgDate(m.createdAt))}</div>
          </div>
        `).join('') || '<div style="color:var(--text-muted);font-size:13px;text-align:center">No messages yet.</div>'}
      </div>
      <form class="messages-reply-form" id="replyForm">
        <textarea name="body" placeholder="Write a reply…" rows="2" required></textarea>
        <button class="btn-primary" type="submit">Send</button>
      </form>
    `;

    const threadBody = document.getElementById('threadBody');
    if (threadBody) threadBody.scrollTop = threadBody.scrollHeight;

    document.querySelectorAll('.messages-conv-card').forEach(card => {
      if (card.dataset.convId === id) {
        card.classList.remove('unread');
        const badge = card.querySelector('.messages-unread-badge');
        if (badge) badge.remove();
        const preview = card.querySelector('.messages-conv-preview');
        if (preview) preview.classList.remove('unread-text');
        card.style.borderLeft = '';
      }
    });

    window.dispatchEvent(new Event('biscoon:messages-updated'));

    document.getElementById('replyForm')?.addEventListener('submit', async function (e) {
      e.preventDefault();
      const textarea = this.querySelector('textarea');
      const body = textarea ? textarea.value.trim() : '';
      if (!body) return;
      const btn = this.querySelector('button');
      if (btn) btn.disabled = true;
      try {
        await msgRequest(`/api/messages/${encodeURIComponent(id)}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        });
        await openConversation(id);
        await loadConversations();
      } catch (err) {
        alert(err.message);
        if (btn) btn.disabled = false;
      }
    });
  } catch (err) {
    thread.innerHTML = `<div class="messages-thread-empty"><div class="messages-thread-empty-icon">⚠️</div><h3>${msgEscape(err.message)}</h3></div>`;
  }
}

document.addEventListener('click', function (e) {
  const card = e.target.closest('.messages-conv-card[data-conv-id]');
  if (card) openConversation(card.dataset.convId);
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    const card = e.target.closest('.messages-conv-card[data-conv-id]');
    if (card) openConversation(card.dataset.convId);
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const token = msgToken();
  if (!token) {
    window.location.href = 'login.html?redirect=/pages/auth/messages.html';
    return;
  }
  loadConversations();
});

/* ── Send-message modal (used from listing detail) ── */

function openSendMessageModal({ listingId, recipientId, listingTitle, recipientName }) {
  closeSendMessageModal();

  const modal = document.createElement('div');
  modal.id = 'sendMessageModal';
  modal.className = 'messages-send-modal';
  modal.innerHTML = `
    <div class="messages-send-backdrop" id="sendMsgBackdrop"></div>
    <div class="messages-send-panel" role="dialog" aria-modal="true" aria-labelledby="sendMsgTitle">
      <h3 id="sendMsgTitle">Message ${msgEscape(recipientName || 'Poster')}</h3>
      <p>About: ${msgEscape(listingTitle || 'this listing')}</p>
      <div class="messages-send-error" id="sendMsgError" style="display:none"></div>
      <textarea id="sendMsgBody" placeholder="Write your message…" rows="4"></textarea>
      <div class="messages-send-actions">
        <button class="btn-ghost" type="button" id="sendMsgCancel">Cancel</button>
        <button class="btn-primary" type="button" id="sendMsgSubmit">Send Message</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('sendMsgBackdrop').addEventListener('click', closeSendMessageModal);
  document.getElementById('sendMsgCancel').addEventListener('click', closeSendMessageModal);
  document.getElementById('sendMsgSubmit').addEventListener('click', async function () {
    const body = (document.getElementById('sendMsgBody')?.value || '').trim();
    const errEl = document.getElementById('sendMsgError');
    if (!body) { if (errEl) { errEl.textContent = 'Please write a message.'; errEl.style.display = ''; } return; }
    this.disabled = true;
    this.textContent = 'Sending…';
    try {
      const token = msgToken();
      if (!token) { window.location.href = getRelativeAuthPath('login.html'); return; }
      const response = await fetch(`${messagesApiBase}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listingId, recipientId, body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to send message.');
      closeSendMessageModal();
      const msgPath = typeof getRelativeAuthPath === 'function'
        ? `${getRelativeAuthPath('messages.html')}?id=${encodeURIComponent(data.conversationId)}`
        : `/pages/auth/messages.html?id=${encodeURIComponent(data.conversationId)}`;
      window.location.href = msgPath;
    } catch (err) {
      if (errEl) { errEl.textContent = err.message; errEl.style.display = ''; }
      this.disabled = false;
      this.textContent = 'Send Message';
    }
  });
}

function closeSendMessageModal() {
  const modal = document.getElementById('sendMessageModal');
  if (modal) modal.remove();
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeSendMessageModal();
});

window.openSendMessageModal = openSendMessageModal;
window.closeSendMessageModal = closeSendMessageModal;
