/* ═══════════════════════════════════════════════
   MESSAGES.JS — Biscoon inbox page
═══════════════════════════════════════════════ */

let messagesApiBase = window.location.origin || 'http://localhost:4000';
if (messagesApiBase.startsWith('file://')) messagesApiBase = 'http://localhost:4000';

let activeConversationId = null;
let pendingAttachments = [];   // [{ name, mimeType, size, data }]
const messageBlobUrls = new Set();

function releaseMessageAttachments() {
  messageBlobUrls.forEach(url => URL.revokeObjectURL(url));
  messageBlobUrls.clear();
}

async function fetchMessageAttachment(value) {
  const url = new URL(value, messagesApiBase);
  if (url.origin !== new URL(messagesApiBase).origin || !url.pathname.startsWith('/api/messages/')) {
    throw new Error('Invalid attachment URL.');
  }
  const response = await fetch(url.href, { headers: { Authorization: `Bearer ${msgToken()}` } });
  if (!response.ok) throw new Error('Unable to download attachment.');
  return response.blob();
}

async function loadMessageAttachments(container) {
  for (const element of container.querySelectorAll('[data-attachment-url]')) {
    if (element.dataset.attachmentLoaded) continue;
    element.dataset.attachmentLoaded = 'true';
    try {
      const blob = await fetchMessageAttachment(element.dataset.attachmentUrl);
      if (!element.isConnected) continue;
      const url = URL.createObjectURL(blob);
      messageBlobUrls.add(url);
      element.src = url;
    } catch {
      if (element.isConnected) {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'btn-ghost';
        retry.textContent = 'Retry attachment';
        element.replaceWith(retry);
        retry.addEventListener('click', () => {
          delete element.dataset.attachmentLoaded;
          retry.replaceWith(element);
          void loadMessageAttachments(container);
        });
      }
    }
  }
}

window.addEventListener('pagehide', releaseMessageAttachments);

const MAX_ATTACHMENTS = 5;
const MAX_VIDEO_BYTES = 12 * 1024 * 1024;   // 12 MB
const MAX_FILE_BYTES  = 6 * 1024 * 1024;    // 6 MB

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

/* ── Image compression (same approach as listing.js) ── */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function fileTypeIcon(mimeType) {
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType === 'text/csv') return '📊';
  if (mimeType.startsWith('text/')) return '📃';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '🗜️';
  return '📎';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ── Attachment picking ── */
async function pickAttachments() {
  if (pendingAttachments.length >= MAX_ATTACHMENTS) {
    alert(`Maximum ${MAX_ATTACHMENTS} attachments per message.`);
    return;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = 'image/*,video/*,.pdf,.doc,.docx,.txt,.xlsx,.csv,.zip';
  input.onchange = async () => {
    const files = Array.from(input.files).slice(0, MAX_ATTACHMENTS - pendingAttachments.length);
    for (const file of files) {
      try {
        let data;
        if (file.type.startsWith('image/')) {
          data = await compressImage(file);
        } else {
          const limit = file.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_FILE_BYTES;
          if (file.size > limit) {
            alert(`"${file.name}" is too large (max ${formatBytes(limit)}).`);
            continue;
          }
          data = await readFileAsDataURL(file);
        }
        pendingAttachments.push({ name: file.name, mimeType: file.type.startsWith('image/') ? 'image/jpeg' : file.type, size: file.size, data });
      } catch {
        alert(`Could not read "${file.name}".`);
      }
    }
    renderAttachmentPreview();
  };
  input.click();
}

function renderAttachmentPreview(containerId = 'attachPreview') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const attachments = containerId === 'modalAttachPreview' ? modalPendingAttachments : pendingAttachments;
  if (!attachments.length) { container.innerHTML = ''; return; }
  container.innerHTML = attachments.map((att, i) => {
    if (att.mimeType.startsWith('image/')) {
      return `<div class="messages-attach-item" data-idx="${i}">
        <img src="${att.data}" alt="${msgEscape(att.name)}">
        <button class="messages-attach-remove" type="button" data-remove="${i}" aria-label="Remove ${msgEscape(att.name)}" title="Remove attachment">×</button>
      </div>`;
    }
    if (att.mimeType.startsWith('video/')) {
      return `<div class="messages-attach-item video-item" data-idx="${i}">
        <span class="messages-attach-icon">🎬</span>
        <span class="messages-attach-name">${msgEscape(att.name)}</span>
        <button class="messages-attach-remove" type="button" data-remove="${i}" aria-label="Remove ${msgEscape(att.name)}" title="Remove attachment">×</button>
      </div>`;
    }
    return `<div class="messages-attach-item file-item" data-idx="${i}">
      <span class="messages-attach-icon">${fileTypeIcon(att.mimeType)}</span>
      <span class="messages-attach-name">${msgEscape(att.name)}</span>
      <button class="messages-attach-remove" type="button" data-remove="${i}" aria-label="Remove ${msgEscape(att.name)}" title="Remove attachment">×</button>
    </div>`;
  }).join('');
}

document.addEventListener('click', function (e) {
  const removeBtn = e.target.closest('[data-remove]');
  if (removeBtn && removeBtn.closest('#attachPreview, #modalAttachPreview')) {
    const idx = parseInt(removeBtn.dataset.remove, 10);
    const previewId = removeBtn.closest('#modalAttachPreview') ? 'modalAttachPreview' : 'attachPreview';
    const attachments = previewId === 'modalAttachPreview' ? modalPendingAttachments : pendingAttachments;
    attachments.splice(idx, 1);
    renderAttachmentPreview(previewId);
  }
});

/* ── Render attachments inside a message bubble ── */
function renderBubbleAttachments(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return '';
  const items = attachments.map(att => {
    if (att.mimeType.startsWith('image/')) {
      return `<img class="msg-attach-image" data-attachment-url="${msgEscape(att.data)}" alt="${msgEscape(att.name)}" role="button" tabindex="0" aria-label="Preview ${msgEscape(att.name)}" data-lightbox>`;
    }
    if (att.mimeType.startsWith('video/')) {
      return `<video class="msg-attach-video" data-attachment-url="${msgEscape(att.data)}" controls preload="metadata">
        Your browser does not support video.
      </video>`;
    }
    return `<a class="msg-attach-file" href="${msgEscape(att.data)}" data-download-attachment download="${msgEscape(att.name)}">
      <span class="msg-attach-file-icon">${fileTypeIcon(att.mimeType)}</span>
      ${msgEscape(att.name)}
    </a>`;
  }).join('');
  return `<div class="msg-bubble-attachments">${items}</div>`;
}

document.addEventListener('click', async event => {
  const link = event.target.closest('[data-download-attachment]');
  if (!link) return;
  event.preventDefault();
  try {
    const blob = await fetchMessageAttachment(link.getAttribute('href'));
    const url = URL.createObjectURL(blob);
    const download = document.createElement('a');
    download.href = url;
    download.download = link.download;
    document.body.appendChild(download);
    download.click();
    download.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    alert(error.message);
  }
});

function showMessageDialog(dialog, focusTarget) {
  const opener = document.activeElement;
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (opener?.isConnected && !document.querySelector('dialog[open]')) opener.focus();
  }, { once: true });
  document.body.appendChild(dialog);
  dialog.showModal();
  dialog.querySelector(focusTarget)?.focus();
}

/* ── Lightbox for images ── */
document.addEventListener('click', function (e) {
  const img = e.target.closest('[data-lightbox]');
  if (img && img.getAttribute('src')) {
    const lb = document.createElement('dialog');
    lb.className = 'msg-lightbox';
    lb.setAttribute('aria-label', 'Image preview');
    lb.innerHTML = `<button class="msg-lightbox-close" type="button" aria-label="Close image preview">&times;</button><img src="${msgEscape(img.src)}" alt="${msgEscape(img.alt)}">`;
    lb.addEventListener('click', event => {
      if (event.target === lb || event.target.closest('.msg-lightbox-close')) lb.close();
    });
    showMessageDialog(lb, 'button');
  }
});

/* ── Conversation list ── */
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
      let preview = '';
      if (conv.lastMessage) {
        if (conv.lastMessage.body) {
          preview = conv.lastMessage.body.length > 55 ? conv.lastMessage.body.slice(0, 52) + '…' : conv.lastMessage.body;
        } else if (conv.lastMessage.hasAttachments) {
          preview = conv.lastMessage.attachmentCount === 1 ? '📎 Attachment' : `📎 ${conv.lastMessage.attachmentCount} attachments`;
        }
      }
      const isUnread = conv.unreadCount > 0;
      return `
        <div class="messages-conv-card ${isUnread ? 'unread' : ''}" data-conv-id="${msgEscape(conv.id)}" role="button" tabindex="0">
          <div class="messages-conv-top">
            <span class="messages-conv-name">${msgEscape(conv.otherUserName)}</span>
            <span class="messages-conv-time">${msgEscape(formatMsgDate(conv.updatedAt))}</span>
          </div>
          <div class="messages-conv-listing">Re: ${msgEscape(conv.listingTitle || 'Listing')}</div>
          <div class="messages-conv-preview ${isUnread ? 'unread-text' : ''}">
            ${preview ? msgEscape(preview) : '<em>No messages yet</em>'}
            ${isUnread ? `<span class="messages-unread-badge" style="margin-left:6px">${conv.unreadCount}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    window.dispatchEvent(new Event('biscoon:messages-updated'));

    const params = new URLSearchParams(window.location.search);
    const openId = params.get('id');
    if (openId && !activeConversationId) openConversation(openId);
  } catch (err) {
    list.innerHTML = `<div class="messages-empty-state">${msgEscape(err.message)}</div>`;
  }
}

/* ── Thread view ── */
function renderMessageRows(messages) {
  return messages.map(message => `
    <div class="messages-bubble-row ${message.isOwn ? 'own' : 'other'}">
      <div class="messages-bubble">
        ${message.body ? msgEscape(message.body) : ''}
        ${renderBubbleAttachments(message.attachments)}
      </div>
      <div class="messages-bubble-meta">${msgEscape(message.isOwn ? 'You' : message.senderName)} · ${msgEscape(formatMsgDate(message.createdAt))}</div>
    </div>
  `).join('');
}

async function openConversation(id) {
  activeConversationId = id;
  document.querySelector('.messages-layout')?.classList.add('thread-open');
  if (window.matchMedia('(max-width: 768px)').matches) document.getElementById('messagesBack')?.focus();
  pendingAttachments = [];
  releaseMessageAttachments();
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set('id', id);
  window.history.replaceState({}, '', currentUrl);

  document.querySelectorAll('.messages-conv-card').forEach(card => {
    card.classList.toggle('active', card.dataset.convId === id);
  });

  const thread = document.getElementById('messagesThread');
  if (!thread) return;
  thread.innerHTML = '<div class="messages-thread-empty"><div class="messages-thread-empty-icon">⏳</div><h3>Loading…</h3></div>';

  try {
    const conv = await msgRequest(`/api/messages/${encodeURIComponent(id)}?limit=100`);
    if (activeConversationId !== id) return;
    const detailUrl = `../../pages/post/detail.html?id=${encodeURIComponent(conv.listingId)}`;

    thread.innerHTML = `
      <div class="messages-thread-head">
        <div class="messages-thread-head-name">${msgEscape(conv.otherUserName)}</div>
        <div class="messages-thread-head-listing">About: <a href="${msgEscape(detailUrl)}">${msgEscape(conv.listingTitle || 'Listing')}</a></div>
        ${conv.previousConversationId ? `<button class="btn-ghost" type="button" data-previous-thread="${msgEscape(conv.previousConversationId)}">Previous thread</button>` : ''}
      </div>
      <div class="messages-thread-body" id="threadBody">
        <button class="btn-ghost" type="button" id="olderMessages" ${conv.hasMore ? '' : 'hidden'}>Earlier messages</button>
        <div id="messageRows">${renderMessageRows(conv.messages) || '<div>No messages yet.</div>'}</div>
      </div>
      ${conv.canContinue ? '<div class="messages-reply-form"><button class="btn-primary" type="button" id="continueConversation">Continue in a new thread</button></div>' : `<form class="messages-reply-form" id="replyForm">
        <div class="messages-attach-preview" id="attachPreview"></div>
        <div class="messages-reply-input-row">
          <button class="messages-attach-btn" type="button" id="attachBtn" title="Attach file">📎</button>
          <textarea name="body" placeholder="Write a reply…" rows="2"></textarea>
          <button class="btn-primary" type="submit">Send</button>
        </div>
      </form>`}
    `;

    const threadBody = document.getElementById('threadBody');
    if (threadBody) threadBody.scrollTop = threadBody.scrollHeight;
    void loadMessageAttachments(thread);
    let before = conv.nextBefore;
    document.getElementById('olderMessages')?.addEventListener('click', async function () {
      this.disabled = true;
      try {
        const older = await msgRequest(`/api/messages/${encodeURIComponent(id)}?limit=100&before=${encodeURIComponent(before)}`);
        if (activeConversationId !== id) return;
        const oldHeight = threadBody.scrollHeight;
        document.getElementById('messageRows').insertAdjacentHTML('afterbegin', renderMessageRows(older.messages));
        before = older.nextBefore;
        this.hidden = !older.hasMore;
        threadBody.scrollTop += threadBody.scrollHeight - oldHeight;
        void loadMessageAttachments(thread);
      } catch (error) { alert(error.message); }
      finally { this.disabled = false; }
    });
    thread.querySelector('[data-previous-thread]')?.addEventListener('click', event => openConversation(event.currentTarget.dataset.previousThread));
    document.getElementById('continueConversation')?.addEventListener('click', async function () {
      this.disabled = true;
      try {
        const next = await msgRequest(`/api/messages/${encodeURIComponent(id)}/continue`, { method: 'POST' });
        await openConversation(next.conversationId);
        await loadConversations();
      } catch (error) { alert(error.message); this.disabled = false; }
    });

    document.querySelectorAll('.messages-conv-card').forEach(card => {
      if (card.dataset.convId === id) {
        card.classList.remove('unread');
        card.querySelector('.messages-unread-badge')?.remove();
        card.querySelector('.messages-conv-preview')?.classList.remove('unread-text');
        card.style.borderLeft = '';
      }
    });
    window.dispatchEvent(new Event('biscoon:messages-updated'));

    document.getElementById('attachBtn')?.addEventListener('click', () => pickAttachments());

    document.getElementById('replyForm')?.addEventListener('submit', async function (e) {
      e.preventDefault();
      const textarea = this.querySelector('textarea');
      const body = textarea ? textarea.value.trim() : '';
      if (!body && !pendingAttachments.length) return;
      const btn = this.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        await msgRequest(`/api/messages/${encodeURIComponent(id)}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body, attachments: pendingAttachments }),
        });
        pendingAttachments = [];
        await openConversation(id);
        await loadConversations();
      } catch (err) {
        alert(err.message);
        if (btn) btn.disabled = false;
      }
    });
  } catch (err) {
    if (activeConversationId !== id) return;
    thread.innerHTML = `<div class="messages-thread-empty"><div class="messages-thread-empty-icon">⚠️</div><h3>${msgEscape(err.message)}</h3></div>`;
  }
}

/* ── Event delegation ── */
document.addEventListener('click', function (e) {
  if (e.target.closest('#messagesBack')) {
    const previousId = activeConversationId;
    activeConversationId = null;
    pendingAttachments = [];
    releaseMessageAttachments();
    document.querySelector('.messages-layout')?.classList.remove('thread-open');
    const thread = document.getElementById('messagesThread');
    if (thread) thread.innerHTML = '<div class="messages-thread-empty"><h3>Select a conversation</h3></div>';
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url);
    const cards = Array.from(document.querySelectorAll('.messages-conv-card'));
    cards.find(card => card.dataset.convId === previousId)?.focus();
    return;
  }
  const card = e.target.closest('.messages-conv-card[data-conv-id]');
  if (card) openConversation(card.dataset.convId);
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' || e.key === ' ') {
    const card = e.target.closest('.messages-conv-card[data-conv-id]');
    if (card) { e.preventDefault(); openConversation(card.dataset.convId); }
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-lightbox]')) {
    e.preventDefault(); e.target.click();
  }
});

document.addEventListener('DOMContentLoaded', function () {
  if (!msgToken()) {
    window.location.href = 'login.html?redirect=/pages/auth/messages.html';
    return;
  }
  loadConversations();
});

/* ══════════════════════════════════════════════════════
   Send-message modal (used from listing detail in biscoon.js)
   Kept here as a standalone export for reuse.
══════════════════════════════════════════════════════ */
let modalPendingAttachments = [];

function openSendMessageModal({ listingId, recipientId, listingTitle, recipientName }) {
  closeSendMessageModal();
  modalPendingAttachments = [];

  const modal = document.createElement('dialog');
  modal.id = 'sendMessageModal';
  modal.className = 'messages-send-modal';
  modal.setAttribute('aria-labelledby', 'sendMsgTitle');
  modal.innerHTML = `
    <div class="messages-send-backdrop" id="sendMsgBackdrop"></div>
    <div class="messages-send-panel">
      <h3 id="sendMsgTitle">Message ${msgEscape(recipientName || 'Poster')}</h3>
      <p>About: ${msgEscape(listingTitle || 'this listing')}</p>
      <div class="messages-send-error" id="sendMsgError" style="display:none"></div>
      <div class="messages-attach-preview" id="modalAttachPreview" style="margin-bottom:8px"></div>
      <textarea id="sendMsgBody" aria-label="Message" placeholder="Write your message…" rows="4"></textarea>
      <div class="messages-send-actions" style="margin-top:10px">
        <button class="messages-attach-btn" type="button" id="modalAttachBtn" title="Attach file" style="margin-right:auto">📎</button>
        <button class="btn-ghost" type="button" id="sendMsgCancel">Cancel</button>
        <button class="btn-primary" type="button" id="sendMsgSubmit">Send</button>
      </div>
    </div>
  `;
  showMessageDialog(modal, '#sendMsgBody');
  modal.addEventListener('close', () => {
    if (!document.getElementById('sendMessageModal')) modalPendingAttachments = [];
  });

  document.getElementById('sendMsgBackdrop').addEventListener('click', closeSendMessageModal);
  document.getElementById('sendMsgCancel').addEventListener('click', closeSendMessageModal);
  document.getElementById('sendMsgBody')?.focus();

  document.getElementById('modalAttachBtn').addEventListener('click', async () => {
    if (modalPendingAttachments.length >= MAX_ATTACHMENTS) {
      alert(`Maximum ${MAX_ATTACHMENTS} attachments.`);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*,.pdf,.doc,.docx,.txt,.xlsx,.csv,.zip';
    input.onchange = async () => {
      const files = Array.from(input.files).slice(0, MAX_ATTACHMENTS - modalPendingAttachments.length);
      for (const file of files) {
        try {
          let data;
          if (file.type.startsWith('image/')) {
            data = await compressImage(file);
          } else {
            const limit = file.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_FILE_BYTES;
            if (file.size > limit) { alert(`"${file.name}" is too large (max ${formatBytes(limit)}).`); continue; }
            data = await readFileAsDataURL(file);
          }
          modalPendingAttachments.push({ name: file.name, mimeType: file.type.startsWith('image/') ? 'image/jpeg' : file.type, size: file.size, data });
        } catch { alert(`Could not read "${file.name}".`); }
      }
      renderAttachmentPreview('modalAttachPreview');
    };
    input.click();
  });

  document.getElementById('sendMsgSubmit').addEventListener('click', async function () {
    const body = (document.getElementById('sendMsgBody')?.value || '').trim();
    const errEl = document.getElementById('sendMsgError');
    if (!body && !modalPendingAttachments.length) {
      if (errEl) { errEl.textContent = 'Please write a message or attach a file.'; errEl.style.display = ''; }
      return;
    }
    this.disabled = true;
    this.textContent = 'Sending…';
    try {
      const token = msgToken();
      const response = await fetch(`${messagesApiBase}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listingId, recipientId, body, attachments: modalPendingAttachments }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to send message.');
      closeSendMessageModal();
      const authPath = typeof getRelativeAuthPath === 'function' ? getRelativeAuthPath('messages.html') : '/pages/auth/messages.html';
      window.location.href = `${authPath}?id=${encodeURIComponent(data.conversationId)}`;
    } catch (err) {
      if (errEl) { errEl.textContent = err.message; errEl.style.display = ''; }
      this.disabled = false;
      this.textContent = 'Send';
    }
  });
}

function closeSendMessageModal() {
  const modal = document.getElementById('sendMessageModal');
  modal?.close();
  modal?.remove();
  modalPendingAttachments = [];
}


window.openSendMessageModal = openSendMessageModal;
window.closeSendMessageModal = closeSendMessageModal;
