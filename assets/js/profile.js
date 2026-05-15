let profileApiBase = window.location.origin || 'http://localhost:4000';
if (profileApiBase.startsWith('file://')) {
  profileApiBase = 'http://localhost:4000';
}

function getToken() {
  if (window.biscoonSession && typeof window.biscoonSession.getToken === 'function') {
    return window.biscoonSession.getToken();
  }
  return localStorage.getItem('biscoonToken');
}

function showProfileMessage(message, type = 'error') {
  const el = document.getElementById('profileMessage');
  if (!el) return;
  if (!message) {
    el.textContent = '';
    el.className = 'form-helper';
    el.style.display = 'none';
    return;
  }
  el.style.display = '';
  el.textContent = message;
  el.className = type === 'success' ? 'form-helper success-text' : 'form-helper error-text';
}

function showEditListingMessage(message, type = 'error') {
  const el = document.getElementById('editListingMessage');
  if (!el) return;
  if (!message) {
    el.textContent = '';
    el.className = 'form-helper';
    el.style.display = 'none';
    return;
  }
  el.style.display = '';
  el.textContent = message;
  el.className = type === 'success' ? 'form-helper success-text' : 'form-helper error-text';
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

const MAX_PROFILE_LISTING_IMAGES = 6;

function getDefaultListingImageMarkup(category = 'other') {
  const defaults = {
    jobs: '💼',
    rojgar: '💼',
    housing: '🏠',
    'paying-guest': '🏡',
    'real-estate': '🏘️',
    services: '🛠️',
    cleaning: '🧹',
    restaurants: '🍛',
    kinbech: '🛍️',
    auto: '🚗',
    events: '📅',
    community: '🤝',
  };
  return `<span class="listing-default-image">${defaults[category] || '📄'}</span>`;
}

function getImageMarkup(images, alt = 'Listing image', category = 'other') {
  const image = Array.isArray(images) && images.length ? images[0] : '';
  return image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}">` : getDefaultListingImageMarkup(category);
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function requireAuth() {
  const token = getToken();
  if (!token) {
    showProfileMessage('Please sign in to access your profile and listings.', 'error');
    const profileForm = document.getElementById('profileForm');
    if (profileForm) profileForm.querySelectorAll('input, button').forEach(el => el.disabled = true);
    const editForm = document.getElementById('editListingForm');
    if (editForm) editForm.querySelectorAll('input, button, textarea').forEach(el => el.disabled = true);
    const listingList = document.getElementById('profileListingList');
    if (listingList) listingList.innerHTML = '<p>Please <a href="login.html">log in</a> to see your profile.</p>';
    return false;
  }
  return true;
}

async function fetchProfile() {
  if (!requireAuth()) return;

  const response = await fetch(`${profileApiBase}/api/auth/me`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!response.ok) {
    showProfileMessage('Unable to load profile. Please log in again.', 'error');
    return;
  }

  const data = await response.json();
  document.getElementById('profileName').value = data.user.name || '';
  document.getElementById('profileEmail').value = data.user.email || '';
  document.getElementById('profilePhone').value = data.user.phone || '';
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  if (!requireAuth()) return;

  const name = document.getElementById('profileName').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  const body = { name, phone };
  if (newPassword || confirmPassword || currentPassword) {
    body.currentPassword = currentPassword;
    body.newPassword = newPassword;
    body.confirmPassword = confirmPassword;
  }

  const response = await fetch(`${profileApiBase}/api/auth/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    return showProfileMessage(data.error || 'Unable to update profile.', 'error');
  }

  showProfileMessage('Profile updated successfully.', 'success');
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  fetchProfile();
}

function renderListingList(listings) {
  const listEl = document.getElementById('profileListingList');
  if (!listEl) return;

  if (!listings.length) {
    listEl.innerHTML = '<p>You have not posted any listings yet.</p>';
    return;
  }

  listEl.innerHTML = `<div class="owner-listings-grid">${
    listings
    .map(listing => `
      <div class="owner-listing-card view-profile-listing" role="button" tabindex="0" data-id="${escapeHtml(listing.id)}">
        <span class="owner-listing-media">${getImageMarkup(listing.images, listing.title || 'Listing image', listing.category)}</span>
        <span class="owner-listing-body">
          <span class="owner-listing-title">${escapeHtml(listing.title || 'Untitled listing')}</span>
          <span class="owner-listing-summary">${escapeHtml(listing.description || 'No description provided.')}</span>
          <span class="owner-listing-meta">
            <span>${escapeHtml(listing.category || 'other')}</span>
            <span>${escapeHtml(listing.subcategory || 'General')}</span>
            <span>${escapeHtml(listing.location || 'N/A')}</span>
            <span>${escapeHtml(listing.price || 'Open')}</span>
          </span>
        </span>
        <span class="owner-listing-actions">
          <button class="btn-ghost edit-listing" type="button" data-id="${escapeHtml(listing.id)}">Edit</button>
          <button class="btn-danger delete-listing" type="button" data-id="${escapeHtml(listing.id)}">Delete</button>
        </span>
      </div>
    `)
    .join('')
  }</div>`;

  listEl.querySelectorAll('.view-profile-listing').forEach(card => {
    card.addEventListener('click', event => {
      if (event.target.closest('.edit-listing, .delete-listing')) return;
      openProfileListingModal(event.currentTarget.dataset.id);
    });
    card.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openProfileListingModal(event.currentTarget.dataset.id);
    });
  });

  listEl.querySelectorAll('.edit-listing').forEach(button => {
    button.addEventListener('click', event => openProfileListingEditModal(event.currentTarget.dataset.id));
  });
  listEl.querySelectorAll('.delete-listing').forEach(button => {
    button.addEventListener('click', event => deleteListing(event.currentTarget.dataset.id));
  });
}

function ensureProfileListingModal() {
  let modal = document.getElementById('profileListingModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'profileListingModal';
  modal.className = 'listing-modal';
  modal.innerHTML = `
    <div class="listing-modal-backdrop" data-close-profile-listing-modal></div>
    <div class="listing-modal-panel" role="dialog" aria-modal="true" aria-labelledby="profileListingModalTitle">
      <button class="listing-modal-close" type="button" data-close-profile-listing-modal aria-label="Close listing details">×</button>
      <div id="profileListingModalBody" class="listing-modal-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function closeProfileListingModal() {
  const modal = document.getElementById('profileListingModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.classList.remove('listing-modal-open');
}

function renderProfileListingModal(listing) {
  const images = Array.isArray(listing.images) && listing.images.length
    ? `<div class="listing-detail-gallery">${listing.images.map(image => `<img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title || 'Listing image')}">`).join('')}</div>`
    : `<div class="listing-detail-gallery">${getDefaultListingImageMarkup(listing.category)}</div>`;
  const detailRows = [
    ['Category', listing.category],
    ['Specific type', listing.subcategory || 'General'],
    ['Location', listing.location || 'N/A'],
    ['Location type', listing.locationType],
    ['Availability', listing.availability],
    ['Price note', listing.priceNote],
    ['Tags', Array.isArray(listing.tags) ? listing.tags.join(', ') : ''],
    ['Contact preference', listing.contactPreference],
  ].filter(([, value]) => value).map(([label, value]) => `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`).join('');
  const externalLink = listing.externalLink ? `<a class="btn-ghost" href="${escapeHtml(listing.externalLink)}" target="_blank" rel="noopener">Open link</a>` : '';

  return `
    <div class="listing-detail-kicker">${escapeHtml(listing.category || 'Listing')}</div>
    <h2 id="profileListingModalTitle">${escapeHtml(listing.title || 'Untitled listing')}</h2>
    ${images}
    <div class="listing-detail-meta">${detailRows}</div>
    <div class="listing-detail-price">${escapeHtml(listing.price || 'Open')}</div>
    <p>${escapeHtml(listing.description || 'No description provided.')}</p>
    <div class="listing-detail-contact">
      ${listing.contactEmail ? `<a class="btn-primary" href="mailto:${escapeHtml(listing.contactEmail)}">Email</a>` : ''}
      ${listing.contactPhone ? `<a class="btn-ghost" href="tel:${escapeHtml(listing.contactPhone)}">${escapeHtml(listing.contactPhone)}</a>` : ''}
      ${externalLink}
      <button class="btn-primary" type="button" data-edit-profile-listing="${escapeHtml(listing.id)}">Edit listing</button>
    </div>
  `;
}

async function openProfileListingModal(id) {
  if (!requireAuth()) return;
  const modal = ensureProfileListingModal();
  const body = modal.querySelector('#profileListingModalBody');
  modal.classList.add('open');
  document.body.classList.add('listing-modal-open');
  body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Loading listing...</h3></div>';

  const response = await fetch(`${profileApiBase}/api/listings/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) {
    body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Unable to load listing</h3></div>';
    return;
  }

  const listing = await response.json();
  body.innerHTML = renderProfileListingModal(listing);
  body.querySelector('[data-edit-profile-listing]')?.addEventListener('click', event => {
    openProfileListingEditModal(event.currentTarget.dataset.editProfileListing);
  });
}

function tagsToInput(tags) {
  return Array.isArray(tags) ? tags.join(', ') : '';
}

function inputToTags(value = '') {
  return value.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 8);
}

function renderEditableImagePreview(images = []) {
  return `
    <div class="image-preview-list" id="modalEditImagePreview">
      ${images.map((image, index) => `
        <div class="image-preview-item">
          <img src="${escapeHtml(image)}" alt="Listing image ${index + 1}">
          <button class="image-remove-btn" type="button" data-remove-modal-image="${index}" aria-label="Remove image">×</button>
        </div>
      `).join('')}
    </div>
  `;
}

function renderProfileListingEditForm(listing) {
  return `
    <div class="listing-detail-kicker">Edit listing</div>
    <h2 id="profileListingModalTitle">${escapeHtml(listing.title || 'Untitled listing')}</h2>
    <form id="profileListingModalEditForm" data-editing-id="${escapeHtml(listing.id)}">
      <div class="form-group">
        <label class="form-label" for="modalEditTitle">Headline</label>
        <input class="form-input" id="modalEditTitle" name="title" type="text" value="${escapeHtml(listing.title || '')}" required />
      </div>
      <div class="form-row--two">
        <div class="form-group">
          <label class="form-label" for="modalEditCategory">Category</label>
          <input class="form-input" id="modalEditCategory" name="category" type="text" value="${escapeHtml(listing.category || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="modalEditSubcategory">Specific type</label>
          <input class="form-input" id="modalEditSubcategory" name="subcategory" type="text" value="${escapeHtml(listing.subcategory || '')}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="modalEditDescription">Description</label>
        <textarea class="form-input" id="modalEditDescription" name="description" required>${escapeHtml(listing.description || '')}</textarea>
      </div>
      <div class="form-row--two">
        <div class="form-group">
          <label class="form-label" for="modalEditLocation">Location</label>
          <input class="form-input" id="modalEditLocation" name="location" type="text" value="${escapeHtml(listing.location || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="modalEditLocationType">Location type</label>
          <input class="form-input" id="modalEditLocationType" name="locationType" type="text" value="${escapeHtml(listing.locationType || '')}" />
        </div>
      </div>
      <div class="form-row--two">
        <div class="form-group">
          <label class="form-label" for="modalEditPrice">Price / rate</label>
          <input class="form-input" id="modalEditPrice" name="price" type="text" value="${escapeHtml(listing.price || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="modalEditPriceNote">Price note</label>
          <input class="form-input" id="modalEditPriceNote" name="priceNote" type="text" value="${escapeHtml(listing.priceNote || '')}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="modalEditAvailability">Availability / timing</label>
        <input class="form-input" id="modalEditAvailability" name="availability" type="text" value="${escapeHtml(listing.availability || '')}" />
      </div>
      <div class="form-row--two">
        <div class="form-group">
          <label class="form-label" for="modalEditContactEmail">Email</label>
          <input class="form-input" id="modalEditContactEmail" name="contactEmail" type="email" value="${escapeHtml(listing.contactEmail || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="modalEditContactPhone">Phone</label>
          <input class="form-input" id="modalEditContactPhone" name="contactPhone" type="tel" value="${escapeHtml(listing.contactPhone || '')}" />
        </div>
      </div>
      <div class="form-row--two">
        <div class="form-group">
          <label class="form-label" for="modalEditContactPreference">Contact preference</label>
          <input class="form-input" id="modalEditContactPreference" name="contactPreference" type="text" value="${escapeHtml(listing.contactPreference || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="modalEditExternalLink">External link</label>
          <input class="form-input" id="modalEditExternalLink" name="externalLink" type="url" value="${escapeHtml(listing.externalLink || '')}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="modalEditTags">Tags</label>
        <input class="form-input" id="modalEditTags" name="tags" type="text" value="${escapeHtml(tagsToInput(listing.tags))}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="modalEditImages">Images</label>
        <input class="file-input" id="modalEditImages" name="imagesUpload[]" type="file" accept="image/*" multiple />
        <label class="btn-white file-upload-button" for="modalEditImages">Add images</label>
        <div class="field-note">You can keep, remove, or add multiple images. Maximum ${MAX_PROFILE_LISTING_IMAGES} images.</div>
        ${renderEditableImagePreview(Array.isArray(listing.images) ? listing.images : [])}
      </div>
      <div id="profileListingModalMessage" class="form-helper"></div>
      <div class="listing-detail-contact">
        <button class="btn-primary" type="submit">Save changes</button>
        <button class="btn-ghost" type="button" data-view-profile-listing="${escapeHtml(listing.id)}">Cancel</button>
      </div>
    </form>
  `;
}

async function openProfileListingEditModal(id) {
  if (!requireAuth()) return;
  const modal = ensureProfileListingModal();
  const body = modal.querySelector('#profileListingModalBody');
  modal.classList.add('open');
  document.body.classList.add('listing-modal-open');
  body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Loading editor...</h3></div>';

  const response = await fetch(`${profileApiBase}/api/listings/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) {
    body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Unable to load editor</h3></div>';
    return;
  }

  const listing = await response.json();
  let editableImages = Array.isArray(listing.images) ? [...listing.images] : [];
  body.innerHTML = renderProfileListingEditForm(listing);
  const renderImages = () => {
    const preview = body.querySelector('#modalEditImagePreview');
    if (!preview) return;
    preview.outerHTML = renderEditableImagePreview(editableImages);
  };
  body.querySelector('[data-view-profile-listing]')?.addEventListener('click', event => {
    openProfileListingModal(event.currentTarget.dataset.viewProfileListing);
  });
  body.querySelector('#modalEditImages')?.addEventListener('change', async event => {
    const slotsLeft = Math.max(0, MAX_PROFILE_LISTING_IMAGES - editableImages.length);
    const files = Array.from(event.currentTarget.files || []).filter(file => file.type.startsWith('image/')).slice(0, slotsLeft);
    const newImages = await Promise.all(files.map(resizeImageFile));
    editableImages = editableImages.concat(newImages).slice(0, MAX_PROFILE_LISTING_IMAGES);
    event.currentTarget.value = '';
    renderImages();
  });
  body.querySelector('#profileListingModalEditForm')?.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-remove-modal-image]');
    if (!removeButton) return;
    editableImages.splice(Number(removeButton.dataset.removeModalImage), 1);
    renderImages();
  });
  body.querySelector('#profileListingModalEditForm')?.addEventListener('submit', event => {
    handleProfileListingModalEditSubmit(event, editableImages);
  });
}

async function handleProfileListingModalEditSubmit(event, editableImages) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector('#profileListingModalMessage');
  const listingId = form.dataset.editingId;
  const fields = form.elements;
  const body = {
    title: fields.title.value.trim(),
    description: fields.description.value.trim(),
    category: fields.category.value.trim(),
    subcategory: fields.subcategory.value.trim(),
    location: fields.location.value.trim(),
    locationType: fields.locationType.value.trim(),
    availability: fields.availability.value.trim(),
    price: fields.price.value.trim(),
    priceNote: fields.priceNote.value.trim(),
    contactEmail: fields.contactEmail.value.trim(),
    contactPhone: fields.contactPhone.value.trim(),
    contactPreference: fields.contactPreference.value.trim(),
    externalLink: fields.externalLink.value.trim(),
    tags: inputToTags(fields.tags.value),
    images: Array.isArray(editableImages) ? editableImages : [],
  };

  const response = await fetch(`${profileApiBase}/api/listings/${listingId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    if (message) {
      message.textContent = data.error || 'Unable to update listing.';
      message.className = 'form-helper error-text';
    }
    return;
  }

  fetchMyListings();
  openProfileListingModal(listingId);
}

async function fetchMyListings() {
  if (!requireAuth()) return;

  const response = await fetch(`${profileApiBase}/api/listings/mine`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!response.ok) {
    document.getElementById('profileListingList').innerHTML = '<p>Unable to load your listings.</p>';
    return;
  }

  const data = await response.json();
  renderListingList(data.listings || []);
}

async function loadListingForEdit(id) {
  const response = await fetch(`${profileApiBase}/api/listings/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!response.ok) {
    return showEditListingMessage('Unable to load listing for edit.', 'error');
  }

  const listing = await response.json();
  document.getElementById('editListingSection').style.display = 'block';
  document.getElementById('editListingForm').dataset.editingId = id;
  document.getElementById('editTitle').value = listing.title || '';
  document.getElementById('editDescription').value = listing.description || '';
  document.getElementById('editLocation').value = listing.location || '';
  document.getElementById('editPrice').value = listing.price || '';
  document.getElementById('editContactEmail').value = listing.contactEmail || '';
  document.getElementById('editContactPhone').value = listing.contactPhone || '';
  showEditListingMessage('Edit your listing and save changes.', 'success');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleEditListingSubmit(event) {
  event.preventDefault();
  if (!requireAuth()) return;

  const form = document.getElementById('editListingForm');
  const listingId = form.dataset.editingId;
  if (!listingId) {
    return showEditListingMessage('No listing selected for editing.', 'error');
  }

  const body = {
    title: document.getElementById('editTitle').value.trim(),
    description: document.getElementById('editDescription').value.trim(),
    location: document.getElementById('editLocation').value.trim(),
    price: document.getElementById('editPrice').value.trim(),
    contactEmail: document.getElementById('editContactEmail').value.trim(),
    contactPhone: document.getElementById('editContactPhone').value.trim(),
  };

  const response = await fetch(`${profileApiBase}/api/listings/${listingId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    return showEditListingMessage(data.error || 'Unable to update listing.', 'error');
  }

  showEditListingMessage('Listing updated successfully.', 'success');
  form.removeAttribute('data-editing-id');
  form.reset();
  document.getElementById('editListingSection').style.display = 'none';
  fetchMyListings();
}

async function deleteListing(id) {
  if (!confirm('Delete this listing? This cannot be undone.')) return;
  const response = await fetch(`${profileApiBase}/api/listings/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await response.json();
  if (!response.ok) {
    return showEditListingMessage(data.error || 'Unable to delete listing.', 'error');
  }
  fetchMyListings();
}

function handleLogout() {
  localStorage.removeItem('biscoonToken');
  window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('profileForm')?.addEventListener('submit', handleProfileSubmit);
  document.getElementById('editListingForm')?.addEventListener('submit', handleEditListingSubmit);
  document.getElementById('cancelEditListing')?.addEventListener('click', () => {
    document.getElementById('editListingForm').removeAttribute('data-editing-id');
    document.getElementById('editListingForm').reset();
    document.getElementById('editListingSection').style.display = 'none';
    showEditListingMessage('', 'success');
  });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-close-profile-listing-modal]')) closeProfileListingModal();
  });
  document.getElementById('logoutButton')?.addEventListener('click', handleLogout);

  if (requireAuth()) {
    fetchProfile();
    fetchMyListings();
  }
});
