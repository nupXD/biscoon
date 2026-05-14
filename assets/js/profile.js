let profileApiBase = window.location.origin || 'http://localhost:4000';
if (profileApiBase.startsWith('file://')) {
  profileApiBase = 'http://localhost:4000';
}

function getToken() {
  return localStorage.getItem('biscoonToken');
}

function showProfileMessage(message, type = 'error') {
  const el = document.getElementById('profileMessage');
  if (!el) return;
  el.textContent = message;
  el.className = type === 'success' ? 'form-helper success-text' : 'form-helper error-text';
}

function showEditListingMessage(message, type = 'error') {
  const el = document.getElementById('editListingMessage');
  if (!el) return;
  el.textContent = message;
  el.className = type === 'success' ? 'form-helper success-text' : 'form-helper error-text';
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

  listEl.innerHTML = listings
    .map(listing => `
      <div class="listing-card" data-id="${listing.id}">
        <h4>${listing.title}</h4>
        <p>${listing.description}</p>
        <p><strong>Category:</strong> ${listing.category}</p>
        <p><strong>Type:</strong> ${listing.subcategory || 'General'}</p>
        <p><strong>Location:</strong> ${listing.location || 'N/A'}</p>
        <p><strong>Price:</strong> ${listing.price || 'N/A'}</p>
        <div class="listing-actions">
          <button class="btn-ghost edit-listing" data-id="${listing.id}">Edit</button>
          <button class="btn-danger delete-listing" data-id="${listing.id}">Delete</button>
        </div>
      </div>
    `)
    .join('');

  listEl.querySelectorAll('.edit-listing').forEach(button => {
    button.addEventListener('click', event => loadListingForEdit(event.target.dataset.id));
  });
  listEl.querySelectorAll('.delete-listing').forEach(button => {
    button.addEventListener('click', event => deleteListing(event.target.dataset.id));
  });
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
  document.getElementById('logoutButton')?.addEventListener('click', handleLogout);

  if (requireAuth()) {
    fetchProfile();
    fetchMyListings();
  }
});
