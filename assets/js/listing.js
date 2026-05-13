let listingApiBase = window.location.origin || 'http://localhost:4000';
if (listingApiBase.startsWith('file://')) {
  listingApiBase = 'http://localhost:4000';
}

function getToken() {
  return localStorage.getItem('biscoonToken');
}

function showListingMessage(message, type = 'error') {
  const el = document.getElementById('listingMessage');
  if (!el) return;
  el.textContent = message;
  el.className = type === 'success' ? 'form-helper success-text' : 'form-helper error-text';
}

function serializeImages(inputEl) {
  if (!inputEl || !inputEl.files) return [];
  return Array.from(inputEl.files).map(file => file.name);
}

function mapFormToListing() {
  const listingType = document.getElementById('listingType');
  const category = document.getElementById('category');
  const title = document.getElementById('title');
  const description = document.getElementById('description');
  const location = document.getElementById('location');
  const price = document.getElementById('price');
  const contactEmail = document.getElementById('contactEmail');
  const contactPhone = document.getElementById('contactPhone');
  const imagesUpload = document.getElementById('imagesUpload');

  return {
    title: title.value.trim(),
    description: description.value.trim(),
    category: category.value.trim(),
    subcategory: listingType.value.trim(),
    price: price.value.trim(),
    location: location.value.trim(),
    contactEmail: contactEmail.value.trim(),
    contactPhone: contactPhone.value.trim(),
    images: serializeImages(imagesUpload),
  };
}

function resetListingForm() {
  const form = document.getElementById('listingForm');
  if (!form) return;
  form.removeAttribute('data-editing-id');
  form.reset();
}

async function submitListing(event) {
  event.preventDefault();
  const token = getToken();
  if (!token) {
    showListingMessage('Please sign in to publish or manage listings.', 'error');
    return;
  }

  const listing = mapFormToListing();
  if (!listing.title || !listing.description || !listing.category) {
    showListingMessage('Title, description, and category are required.', 'error');
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

  listEl.innerHTML = listings
    .map(listing => `
      <div class="listing-card" data-id="${listing.id}">
        <h4>${listing.title}</h4>
        <p>${listing.description}</p>
        <p><strong>Category:</strong> ${listing.category}</p>
        <p><strong>Type:</strong> ${listing.subcategory || 'General'}</p>
        <p><strong>Location:</strong> ${listing.location || 'N/A'}</p>
        <p><strong>Price:</strong> ${listing.price || 'N/A'}</p>
        <p><strong>Contact:</strong> ${listing.contactEmail || ''} ${listing.contactPhone ? '• ' + listing.contactPhone : ''}</p>
        <div class="listing-actions">
          <button class="btn-ghost edit-listing" data-id="${listing.id}">Edit</button>
          <button class="btn-danger delete-listing" data-id="${listing.id}">Delete</button>
        </div>
      </div>
    `)
    .join('');

  listEl.querySelectorAll('.edit-listing').forEach(button => {
    button.addEventListener('click', event => loadListing(event.target.dataset.id));
  });

  listEl.querySelectorAll('.delete-listing').forEach(button => {
    button.addEventListener('click', event => deleteListing(event.target.dataset.id));
  });
}

async function fetchMyListings() {
  const token = getToken();
  if (!token) {
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
  document.getElementById('listingType').value = listing.subcategory || '';
  document.getElementById('category').value = listing.category || '';
  document.getElementById('title').value = listing.title || '';
  document.getElementById('description').value = listing.description || '';
  document.getElementById('location').value = listing.location || '';
  document.getElementById('price').value = listing.price || '';
  document.getElementById('contactEmail').value = listing.contactEmail || '';
  document.getElementById('contactPhone').value = listing.contactPhone || '';
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
  fetchMyListings();
});
