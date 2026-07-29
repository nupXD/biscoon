let discussionApiBase = window.location.origin || 'http://localhost:4000';
if (discussionApiBase.startsWith('file://')) {
  discussionApiBase = 'http://localhost:4000';
}

let discussionTopics = [];
let activeDiscussionId = '';

function getDiscussionToken() {
  if (window.biscoonSession && typeof window.biscoonSession.getToken === 'function') {
    return window.biscoonSession.getToken();
  }
  return localStorage.getItem('biscoonToken');
}

function discussionEscapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function formatDiscussionDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function showDiscussionMessage(message, type = 'error') {
  const el = document.getElementById('discussionMessage');
  if (!el) return;
  el.textContent = message;
  el.className = type === 'success' ? 'form-helper success-text' : 'form-helper error-text';
}

function setDiscussionAuthState() {
  const hasToken = Boolean(getDiscussionToken());
  const createButton = document.getElementById('openDiscussionModal');
  const loginLink = document.querySelector('.discussion-login-link');
  if (createButton) createButton.style.display = hasToken ? '' : 'none';
  if (loginLink) loginLink.style.display = hasToken ? 'none' : '';
}

function openDiscussionModal() {
  if (!getDiscussionToken()) {
    window.location.href = '../auth/login.html?redirect=/pages/community/discussions.html';
    return;
  }
  const modal = document.getElementById('discussionModal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('discussion-modal-open');
  document.getElementById('discussionTitle')?.focus();
}

function closeDiscussionModal() {
  const modal = document.getElementById('discussionModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('discussion-modal-open');
  showDiscussionMessage('');
}

async function discussionFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getDiscussionToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${discussionApiBase}${path}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function renderDiscussionList() {
  const list = document.getElementById('discussionList');
  if (!list) return;

  if (!discussionTopics.length) {
    list.innerHTML = '<div class="discussion-empty">No discussions yet. Start the first topic.</div>';
    return;
  }

  list.innerHTML = discussionTopics.map(topic => `
    <button class="discussion-list-item ${topic.id === activeDiscussionId ? 'active' : ''}" type="button" data-discussion-id="${discussionEscapeHtml(topic.id)}">
      <div class="discussion-list-title">${discussionEscapeHtml(topic.title)}</div>
      <div class="discussion-list-meta">
        <span class="discussion-category">${discussionEscapeHtml(topic.category || 'general')}</span>
        <span>${discussionEscapeHtml(topic.authorName || 'Community member')}</span>
        <span>${Number(topic.commentCount || 0)} comments</span>
        <span>${formatDiscussionDate(topic.updatedAt || topic.createdAt)}</span>
      </div>
    </button>
  `).join('');
}

function groupComments(comments = []) {
  const byParent = new Map();
  comments.forEach(comment => {
    const key = comment.parentId || '';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(comment);
  });
  byParent.forEach(group => group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
  return byParent;
}

function renderCommentTree(byParent, parentId = '', depth = 0) {
  const comments = byParent.get(parentId) || [];
  return comments.map(comment => `
    <article class="comment-card ${depth ? 'reply' : ''}">
      <div class="comment-meta">
        <span class="comment-author">${discussionEscapeHtml(comment.authorName || 'Community member')}</span>
        <span>${formatDiscussionDate(comment.createdAt)}</span>
      </div>
      <div class="comment-body">${discussionEscapeHtml(comment.body)}</div>
      <button class="reply-toggle" type="button" data-reply-target="${discussionEscapeHtml(comment.id)}">Reply</button>
      <form class="reply-form" data-reply-form="${discussionEscapeHtml(comment.id)}">
        <textarea class="form-input" name="body" placeholder="Write a reply" required></textarea>
        <div class="comment-actions">
          <button class="btn-primary" type="submit">Post reply</button>
          <button class="btn-ghost" type="button" data-cancel-reply="${discussionEscapeHtml(comment.id)}">Cancel</button>
        </div>
      </form>
      ${renderCommentTree(byParent, comment.id, depth + 1)}
    </article>
  `).join('');
}

function renderDiscussionDetail(topic) {
  const detail = document.getElementById('discussionDetail');
  if (!detail) return;

  const byParent = groupComments(topic.comments || []);
  const commentsMarkup = renderCommentTree(byParent);
  const hasToken = Boolean(getDiscussionToken());

  detail.innerHTML = `
    <div class="discussion-topic-head">
      <h1 class="discussion-topic-title">${discussionEscapeHtml(topic.title)}</h1>
      <div class="discussion-topic-meta">
        <span class="discussion-category">${discussionEscapeHtml(topic.category || 'general')}</span>
        <span>Started by ${discussionEscapeHtml(topic.authorName || 'Community member')}</span>
        <span>${formatDiscussionDate(topic.createdAt)}</span>
      </div>
      <div class="discussion-topic-body">${discussionEscapeHtml(topic.body)}</div>
      ${(topic.tags || []).length ? `<div class="discussion-tags">${topic.tags.map(tag => `<span class="discussion-tag">${discussionEscapeHtml(tag)}</span>`).join('')}</div>` : ''}
    </div>
    ${hasToken ? `<form class="comment-compose" id="commentForm">
      <label class="form-label" for="commentBody">Add a comment</label>
      <textarea class="form-input" id="commentBody" name="body" placeholder="Share a question or tip…" required></textarea>
      <div class="comment-actions">
        <button class="btn-primary" type="submit">Post comment</button>
      </div>
    </form>` : `<div class="listing-comment-signin comment-compose">
      <p>Join the conversation after you sign in.</p>
      <a class="btn-primary" href="../auth/login.html?redirect=/pages/community/discussions.html">Sign in to comment</a>
    </div>`}
    <div class="comments-head">${Number(topic.comments?.length || 0)} comments</div>
    <div class="comment-list">${commentsMarkup || '<div class="discussion-empty">No comments yet. Be the first to reply.</div>'}</div>
  `;
}

async function loadDiscussions() {
  const list = document.getElementById('discussionList');
  if (list) list.innerHTML = '<div class="discussion-loading">Loading discussions...</div>';
  const search = document.getElementById('discussionSearch')?.value.trim() || '';
  const category = document.getElementById('discussionFilter')?.value || 'all';
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category && category !== 'all') params.set('category', category);

  const data = await discussionFetch(`/api/discussions${params.toString() ? `?${params}` : ''}`);
  discussionTopics = data.discussions || [];
  if (!activeDiscussionId && discussionTopics.length) activeDiscussionId = discussionTopics[0].id;
  if (activeDiscussionId && !discussionTopics.some(topic => topic.id === activeDiscussionId) && !new URLSearchParams(window.location.search).get('id')) {
    activeDiscussionId = discussionTopics[0]?.id || '';
  }
  renderDiscussionList();
  if (activeDiscussionId) await loadDiscussionDetail(activeDiscussionId);
}

async function loadDiscussionDetail(id) {
  activeDiscussionId = id;
  const url = new URL(window.location.href);
  url.searchParams.set('id', id);
  window.history.replaceState({}, '', url.toString());
  renderDiscussionList();
  const detail = document.getElementById('discussionDetail');
  if (detail) detail.innerHTML = '<div class="discussion-loading">Loading topic...</div>';
  const data = await discussionFetch(`/api/discussions/${encodeURIComponent(id)}`);
  renderDiscussionDetail(data.discussion);
}

async function handleDiscussionSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const body = {
    title: form.querySelector('#discussionTitle').value.trim(),
    category: form.querySelector('#discussionCategory').value,
    body: form.querySelector('#discussionBody').value.trim(),
    tags: form.querySelector('#discussionTags').value,
  };

  try {
    const data = await discussionFetch('/api/discussions', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    form.reset();
    closeDiscussionModal();
    activeDiscussionId = data.discussion.id;
    await loadDiscussions();
  } catch (error) {
    showDiscussionMessage(error.message, 'error');
  }
}

async function postComment(body, parentId = '') {
  if (!activeDiscussionId) return;
  const data = await discussionFetch(`/api/discussions/${encodeURIComponent(activeDiscussionId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body, parentId }),
  });
  renderDiscussionDetail(data.discussion);
  await loadDiscussions();
}

function bindDiscussionEvents() {
  document.getElementById('discussionForm')?.addEventListener('submit', handleDiscussionSubmit);
  document.getElementById('openDiscussionModal')?.addEventListener('click', openDiscussionModal);
  document.getElementById('discussionSearch')?.addEventListener('input', () => {
    window.clearTimeout(window.discussionSearchTimer);
    window.discussionSearchTimer = window.setTimeout(() => loadDiscussions().catch(console.error), 250);
  });
  document.getElementById('discussionFilter')?.addEventListener('change', () => loadDiscussions().catch(console.error));

  document.addEventListener('click', event => {
    if (event.target.closest('[data-close-discussion-modal]')) {
      closeDiscussionModal();
      return;
    }

    const topicButton = event.target.closest('[data-discussion-id]');
    if (topicButton) {
      loadDiscussionDetail(topicButton.dataset.discussionId).catch(console.error);
      return;
    }

    const replyButton = event.target.closest('[data-reply-target]');
    if (replyButton) {
      const form = document.querySelector(`[data-reply-form="${CSS.escape(replyButton.dataset.replyTarget)}"]`);
      if (form) form.classList.add('open');
      return;
    }

    const cancelButton = event.target.closest('[data-cancel-reply]');
    if (cancelButton) {
      const form = document.querySelector(`[data-reply-form="${CSS.escape(cancelButton.dataset.cancelReply)}"]`);
      if (form) form.classList.remove('open');
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDiscussionModal();
  });

  document.addEventListener('submit', event => {
    if (event.target.id === 'commentForm') {
      event.preventDefault();
      const value = event.target.querySelector('textarea').value.trim();
      if (value) postComment(value).catch(error => showDiscussionMessage(error.message, 'error'));
      return;
    }

    const replyForm = event.target.closest('[data-reply-form]');
    if (replyForm) {
      event.preventDefault();
      const value = replyForm.querySelector('textarea').value.trim();
      if (value) postComment(value, replyForm.dataset.replyForm).catch(error => showDiscussionMessage(error.message, 'error'));
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  activeDiscussionId = new URLSearchParams(window.location.search).get('id') || '';
  setDiscussionAuthState();
  bindDiscussionEvents();
  if (new URLSearchParams(window.location.search).get('create') === '1') {
    window.setTimeout(openDiscussionModal, 0);
  }
  loadDiscussions().catch(error => {
    const list = document.getElementById('discussionList');
    if (list) list.innerHTML = `<div class="discussion-error">${discussionEscapeHtml(error.message)}</div>`;
  });
});
