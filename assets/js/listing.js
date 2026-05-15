let listingApiBase = window.location.origin || 'http://localhost:4000';
if (listingApiBase.startsWith('file://')) {
  listingApiBase = 'http://localhost:4000';
}

let editingListingImages = [];
const MAX_LISTING_IMAGES = 6;

function getToken() {
  if (window.biscoonSession && typeof window.biscoonSession.getToken === 'function') {
    return window.biscoonSession.getToken();
  }
  return localStorage.getItem('biscoonToken');
}

function showListingMessage(message, type = 'error') {
  const el = document.getElementById('listingMessage');
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

function toggleListingForm(enabled) {
  const form = document.getElementById('listingForm');
  if (!form) return;
  Array.from(form.elements).forEach(element => {
    if (element.id === 'listingSigninLink') return;
    element.disabled = !enabled;
  });
}

function setListingAuthState() {
  const token = getToken();
  const form = document.getElementById('listingForm');
  const guard = document.getElementById('listingGuardMessage');
  const signinLink = document.getElementById('listingSigninLink');
  if (!form) return;

  if (token) {
    if (guard) guard.style.display = 'none';
    if (signinLink) signinLink.style.display = 'none';
    showListingMessage('', 'success');
    toggleListingForm(true);
  } else {
    if (guard) guard.style.display = 'block';
    if (signinLink) signinLink.style.display = '';
    showListingMessage('Please log in to publish, edit, or delete your listings.', 'error');
    toggleListingForm(false);
  }
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

async function serializeImages(inputEl) {
  if (!inputEl || !inputEl.files || inputEl.files.length === 0) return editingListingImages;
  const files = Array.from(inputEl.files).filter(file => file.type.startsWith('image/')).slice(0, MAX_LISTING_IMAGES);
  return Promise.all(files.map(resizeImageFile));
}

async function addSelectedImages(inputEl) {
  if (!inputEl || !inputEl.files || inputEl.files.length === 0) return editingListingImages;
  const slotsLeft = Math.max(0, MAX_LISTING_IMAGES - editingListingImages.length);
  const files = Array.from(inputEl.files).filter(file => file.type.startsWith('image/')).slice(0, slotsLeft);
  const newImages = await Promise.all(files.map(resizeImageFile));
  editingListingImages = editingListingImages.concat(newImages).slice(0, MAX_LISTING_IMAGES);
  inputEl.value = '';
  return editingListingImages;
}

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

function renderImagePreview(images = []) {
  const target = document.getElementById('imagePreviewList');
  if (!target) return;
  target.innerHTML = images.map((image, index) => `
    <div class="image-preview-item">
      <img src="${escapeHtml(image)}" alt="Selected listing image ${index + 1}">
      <button class="image-remove-btn" type="button" data-remove-listing-image="${index}" aria-label="Remove image">×</button>
    </div>
  `).join('');
}

function serializeTags(value = '') {
  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function tagsToInput(tags) {
  return Array.isArray(tags) ? tags.join(', ') : '';
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

function formatSpecificLocation(area, state) {
  return [area, state].map(value => value.trim()).filter(Boolean).join(', ');
}

function splitSpecificLocation(location = '') {
  const parts = location.split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return { area: location || '', state: '' };
  return {
    area: parts.slice(0, -1).join(', '),
    state: parts[parts.length - 1],
  };
}

async function mapFormToListing() {
  const category = document.getElementById('category');
  const subcategory = document.getElementById('subcategory');
  const availability = document.getElementById('availability');
  const title = document.getElementById('title');
  const description = document.getElementById('description');
  const area = document.getElementById('area');
  const state = document.getElementById('state');
  const locationType = document.getElementById('locationType');
  const location = document.getElementById('location');
  const price = document.getElementById('price');
  const priceNote = document.getElementById('priceNote');
  const contactEmail = document.getElementById('contactEmail');
  const contactPhone = document.getElementById('contactPhone');
  const contactPreference = document.getElementById('contactPreference');
  const externalLink = document.getElementById('link');
  const tags = document.getElementById('tags');
  const imagesUpload = document.getElementById('imagesUpload');
  const specificLocation = formatSpecificLocation(area.value, state.value);
  if (location) location.value = specificLocation;

  return {
    title: title.value.trim(),
    description: description.value.trim(),
    category: category.value.trim(),
    subcategory: subcategory.value.trim(),
    availability: availability.value.trim(),
    price: price.value.trim(),
    priceNote: priceNote.value.trim(),
    location: specificLocation,
    locationType: locationType.value.trim(),
    contactEmail: contactEmail.value.trim(),
    contactPhone: contactPhone.value.trim(),
    contactPreference: contactPreference.value.trim(),
    externalLink: externalLink.value.trim(),
    tags: serializeTags(tags.value),
    images: await serializeImages(imagesUpload),
  };
}

function resetListingForm() {
  const form = document.getElementById('listingForm');
  if (!form) return;
  form.removeAttribute('data-editing-id');
  form.reset();
  document.getElementById('listingSubmitButton').textContent = 'Publish listing';
  editingListingImages = [];
  renderImagePreview([]);
}

async function submitListing(event) {
  event.preventDefault();
  const token = getToken();
  if (!token) {
    showListingMessage('Please sign in to publish or manage listings.', 'error');
    return;
  }

  const listing = await mapFormToListing();
  if (!listing.title || !listing.description || !listing.category || !listing.subcategory || !listing.location) {
    showListingMessage('Title, description, category, specific type, area, and state are required.', 'error');
    return;
  }

  const form = document.getElementById('listingForm');
  const editingId = form.getAttribute('data-editing-id');
  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? `/api/listings/${editingId}` : '/api/listings';

  const response = await fetch(`${listingApiBase}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(listing),
  });

  const result = await response.json();
  if (!response.ok) {
    return showListingMessage(result.error || 'Unable to save listing.', 'error');
  }

  showListingMessage(editingId ? 'Listing updated successfully.' : 'Listing published successfully.', 'success');
  resetListingForm();
  fetchMyListings();
}

function renderListingList(listings) {
  const listEl = document.getElementById('listingList');
  if (!listEl) return;

  if (!listings || listings.length === 0) {
    listEl.innerHTML = '<p>No listings yet. Use the form above to create your first listing.</p>';
    return;
  }

  listEl.innerHTML = `<div class="my-listings-grid">${
    listings
    .map(listing => `
      <div class="my-listing-card view-listing" role="button" tabindex="0" data-id="${escapeHtml(listing.id)}">
        <span class="my-listing-media">${getImageMarkup(listing.images, listing.title || 'Listing image', listing.category)}</span>
        <span class="my-listing-body">
          <span class="my-listing-title">${escapeHtml(listing.title)}</span>
          <span class="my-listing-summary">${escapeHtml(listing.description)}</span>
          <span class="my-listing-meta">
            <span>${escapeHtml(listing.category)}</span>
            <span>${escapeHtml(listing.subcategory || 'General')}</span>
            <span>${escapeHtml(listing.location || 'N/A')}</span>
            <span>${escapeHtml(listing.price || 'Open')}</span>
          </span>
        </span>
        <span class="my-listing-actions">
          <button class="btn-ghost edit-listing" data-id="${escapeHtml(listing.id)}">Edit</button>
          <button class="btn-danger delete-listing" data-id="${escapeHtml(listing.id)}">Delete</button>
        </span>
      </div>
    `)
    .join('')
  }</div>`;

  listEl.querySelectorAll('.view-listing').forEach(button => {
    button.addEventListener('click', event => {
      if (event.target.closest('.edit-listing, .delete-listing')) return;
      openMyListingModal(event.currentTarget.dataset.id);
    });
    button.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openMyListingModal(event.currentTarget.dataset.id);
    });
  });

  listEl.querySelectorAll('.edit-listing').forEach(button => {
    button.addEventListener('click', event => loadListing(event.target.dataset.id));
  });

  listEl.querySelectorAll('.delete-listing').forEach(button => {
    button.addEventListener('click', event => deleteListing(event.target.dataset.id));
  });
}

function ensureMyListingModal() {
  let modal = document.getElementById('myListingModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'myListingModal';
  modal.className = 'listing-modal';
  modal.innerHTML = `
    <div class="listing-modal-backdrop" data-close-my-listing-modal></div>
    <div class="listing-modal-panel" role="dialog" aria-modal="true" aria-labelledby="myListingModalTitle">
      <button class="listing-modal-close" type="button" data-close-my-listing-modal aria-label="Close listing details">×</button>
      <div id="myListingModalBody" class="listing-modal-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function closeMyListingModal() {
  const modal = document.getElementById('myListingModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.classList.remove('listing-modal-open');
}

function renderListingDetail(listing) {
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
    <h2 id="myListingModalTitle">${escapeHtml(listing.title || 'Untitled listing')}</h2>
    ${images}
    <div class="listing-detail-meta">${detailRows}</div>
    <div class="listing-detail-price">${escapeHtml(listing.price || 'Open')}</div>
    <p>${escapeHtml(listing.description || 'No description provided.')}</p>
    <div class="listing-detail-contact">
      ${listing.contactEmail ? `<a class="btn-primary" href="mailto:${escapeHtml(listing.contactEmail)}">Email</a>` : ''}
      ${listing.contactPhone ? `<a class="btn-ghost" href="tel:${escapeHtml(listing.contactPhone)}">${escapeHtml(listing.contactPhone)}</a>` : ''}
      ${externalLink}
      <button class="btn-primary" type="button" data-edit-from-modal="${escapeHtml(listing.id)}">Edit listing</button>
    </div>
  `;
}

async function openMyListingModal(id) {
  const token = getToken();
  if (!token) return;
  const modal = ensureMyListingModal();
  const body = modal.querySelector('#myListingModalBody');
  modal.classList.add('open');
  document.body.classList.add('listing-modal-open');
  body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Loading listing...</h3></div>';

  const response = await fetch(`${listingApiBase}/api/listings/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Unable to load listing</h3></div>';
    return;
  }
  const listing = await response.json();
  body.innerHTML = renderListingDetail(listing);
  body.querySelector('[data-edit-from-modal]')?.addEventListener('click', event => {
    closeMyListingModal();
    loadListing(event.currentTarget.dataset.editFromModal);
  });
}

async function fetchMyListings() {
  const token = getToken();
  if (!token) {
    setListingAuthState();
    renderListingList([]);
    return;
  }

  const response = await fetch(`${listingApiBase}/api/listings/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    showListingMessage('Unable to load your listings.', 'error');
    renderListingList([]);
    return;
  }

  const data = await response.json();
  renderListingList(data.listings || []);
}

async function loadListing(id) {
  const token = getToken();
  if (!token) return;

  const response = await fetch(`${listingApiBase}/api/listings/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    showListingMessage('Unable to load listing details.', 'error');
    return;
  }

  const listing = await response.json();
  const form = document.getElementById('listingForm');
  if (!form) return;

  form.setAttribute('data-editing-id', id);
  document.getElementById('listingSubmitButton').textContent = 'Save changes';
  const locationParts = splitSpecificLocation(listing.location || '');
  document.getElementById('category').value = listing.category || '';
  document.getElementById('subcategory').value = listing.subcategory || '';
  document.getElementById('availability').value = listing.availability || '';
  document.getElementById('title').value = listing.title || '';
  document.getElementById('description').value = listing.description || '';
  document.getElementById('area').value = locationParts.area;
  document.getElementById('state').value = locationParts.state;
  document.getElementById('locationType').value = listing.locationType || 'in-person';
  document.getElementById('location').value = listing.location || '';
  document.getElementById('price').value = listing.price || '';
  document.getElementById('priceNote').value = listing.priceNote || '';
  document.getElementById('contactEmail').value = listing.contactEmail || '';
  document.getElementById('contactPhone').value = listing.contactPhone || '';
  document.getElementById('contactPreference').value = listing.contactPreference || 'email';
  document.getElementById('link').value = listing.externalLink || '';
  document.getElementById('tags').value = tagsToInput(listing.tags);
  editingListingImages = Array.isArray(listing.images) ? listing.images : [];
  renderImagePreview(editingListingImages);
  showListingMessage('Loaded listing for editing. Update the fields and save.', 'success');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteListing(id) {
  const token = getToken();
  if (!token) return;

  if (!confirm('Delete this listing? This cannot be undone.')) return;

  const response = await fetch(`${listingApiBase}/api/listings/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await response.json();
  if (!response.ok) {
    showListingMessage(result.error || 'Unable to delete listing.', 'error');
    return;
  }

  showListingMessage(result.message || 'Listing deleted.', 'success');
  fetchMyListings();
}

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('listingForm');
  if (form) {
    form.addEventListener('submit', submitListing);
  }
  document.getElementById('imagesUpload')?.addEventListener('change', async event => {
    editingListingImages = await addSelectedImages(event.currentTarget);
    renderImagePreview(editingListingImages);
  });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-close-my-listing-modal]')) closeMyListingModal();
    const removeButton = event.target.closest('[data-remove-listing-image]');
    if (removeButton) {
      editingListingImages.splice(Number(removeButton.dataset.removeListingImage), 1);
      renderImagePreview(editingListingImages);
    }
  });
  setListingAuthState();
  fetchMyListings();
});
