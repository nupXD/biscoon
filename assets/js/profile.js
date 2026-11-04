let profileApiBase=window.location.origin||"http://localhost:4000";profileApiBase.startsWith("file://")&&(profileApiBase="http://localhost:4000");function getToken(){const e=window.biscoonSession;return e&&typeof e.getToken=="function"?e.getToken():localStorage.getItem("biscoonToken")}function showProfileMessage(e,i="error"){const t=document.getElementById("profileMessage");if(t){if(!e){t.textContent="",t.className="form-helper",t.style.display="none";return}t.style.display="",t.textContent=e,t.className=i==="success"?"form-helper success-text":"form-helper error-text"}}function showEditListingMessage(e,i="error"){const t=document.getElementById("editListingMessage");if(t){if(!e){t.textContent="",t.className="form-helper",t.style.display="none";return}t.style.display="",t.textContent=e,t.className=i==="success"?"form-helper success-text":"form-helper error-text"}}const MAX_PROFILE_LISTING_IMAGES=6;function getImageMarkup(e,i="Listing image",t="other"){const a=Array.isArray(e)&&e.length?e[0]:"";return a?`<img src="${escapeHtml(a)}" alt="${escapeHtml(i)}" loading="lazy">`:getDefaultListingImageMarkup(t)}function resizeImageFile(e){return new Promise((i,t)=>{const a=new FileReader;a.onload=()=>{const n=new Image;n.onload=()=>{const r=Math.min(1,1200/Math.max(n.width,n.height)),s=document.createElement("canvas");s.width=Math.round(n.width*r),s.height=Math.round(n.height*r),s.getContext("2d").drawImage(n,0,0,s.width,s.height),i(s.toDataURL("image/jpeg",.78))},n.onerror=t,n.src=a.result},a.onerror=t,a.readAsDataURL(e)})}function requireAuth(){if(!getToken()){showProfileMessage("Please sign in to access your profile and listings.","error");const i=document.getElementById("profileForm");i&&i.querySelectorAll("input, button").forEach(o=>o.disabled=!0);const t=document.getElementById("editListingForm");t&&t.querySelectorAll("input, button, textarea").forEach(o=>o.disabled=!0);const a=document.getElementById("profileListingList");a&&(a.innerHTML='<p>Please <a href="login.html">log in</a> to see your profile.</p>');const n=document.getElementById("profileSavedListingList");return n&&(n.innerHTML='<p>Please <a href="login.html">log in</a> to see saved listings.</p>'),!1}return!0}async function fetchProfile(){if(!requireAuth())return;const e=await fetch(`${profileApiBase}/api/auth/me`,{headers:{Authorization:`Bearer ${getToken()}`}});if(!e.ok){showProfileMessage("Unable to load profile. Please log in again.","error");return}const i=await e.json();document.getElementById("profileName").value=i.user.name||"",document.getElementById("profileEmail").value=i.user.email||"",document.getElementById("profilePhone").value=i.user.phone||"";const t=document.getElementById("emailVerifyBanner");t&&(t.hidden=!!i.user.emailVerified)}async function handleProfileSubmit(e){if(e.preventDefault(),!requireAuth())return;const t=e.target.querySelector('[type="submit"]'),a=t?t.textContent:"";t&&(t.disabled=!0,t.textContent="Saving\u2026");const n=document.getElementById("profileName").value.trim(),o=document.getElementById("profilePhone").value.trim(),r=document.getElementById("currentPassword").value,s=document.getElementById("newPassword").value,l=document.getElementById("confirmPassword").value,d={name:n,phone:o};(s||l||r)&&(d.currentPassword=r,d.newPassword=s,d.confirmPassword=l);try{const c=await fetch(`${profileApiBase}/api/auth/me`,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`},body:JSON.stringify(d)}),m=await c.json();if(!c.ok){showProfileMessage(m.error||"Unable to update profile.","error");return}m.token&&window.biscoonSession.start(m.token),showProfileMessage("Profile updated successfully.","success"),document.getElementById("currentPassword").value="",document.getElementById("newPassword").value="",document.getElementById("confirmPassword").value="",fetchProfile()}catch{showProfileMessage("Network error. Please check your connection and try again.","error")}finally{t&&(t.disabled=!1,t.textContent=a)}}function renderListingList(e){const i=document.getElementById("profileListingList");if(i){if(!e.length){i.innerHTML=`
      <div class="empty-state">
        <div class="icon">\u{1F4CB}</div>
        <h3>No listings yet</h3>
        <p>You have not posted any listings yet. Share a job, room, service, or anything with the Nepali community.</p>
        <a class="btn-primary" href="listing.html" style="display:inline-block;margin-top:14px;">+ Post a Free Listing</a>
      </div>`;return}i.innerHTML=`<div class="owner-listings-grid">${e.map(t=>`
      <div class="owner-listing-card view-profile-listing" role="button" tabindex="0" data-id="${escapeHtml(t.id)}">
        <span class="owner-listing-media">${getImageMarkup(t.images,t.title||"Listing image",t.category)}</span>
        <span class="owner-listing-body">
          <span class="owner-listing-title">${escapeHtml(t.title||"Untitled listing")}</span>
          <span class="owner-listing-summary">${escapeHtml(t.description||"No description provided.")}</span>
          <span class="owner-listing-meta">
            <span>${escapeHtml(t.category||"other")}</span>
            <span>${escapeHtml(t.subcategory||"General")}</span>
            <span>${escapeHtml(t.location||"N/A")}</span>
            <span>${escapeHtml(t.price||"Open")}</span>
          </span>
        </span>
        <span class="owner-listing-actions">
          <button class="btn-ghost edit-listing" type="button" data-id="${escapeHtml(t.id)}">Edit</button>
          <button class="btn-danger delete-listing" type="button" data-id="${escapeHtml(t.id)}">Delete</button>
        </span>
      </div>
    `).join("")}</div>`,i.querySelectorAll(".view-profile-listing").forEach(t=>{t.addEventListener("click",a=>{a.target.closest(".edit-listing, .delete-listing")||openProfileListingModal(a.currentTarget.dataset.id)}),t.addEventListener("keydown",a=>{const n=a;n.key!=="Enter"&&n.key!==" "||(n.preventDefault(),openProfileListingModal(n.currentTarget.dataset.id))})}),i.querySelectorAll(".edit-listing").forEach(t=>{t.addEventListener("click",a=>openProfileListingEditModal(a.currentTarget.dataset.id))}),i.querySelectorAll(".delete-listing").forEach(t=>{t.addEventListener("click",a=>deleteListing(a.currentTarget.dataset.id))})}}function renderSavedListingList(e){const i=document.getElementById("profileSavedListingList");if(i){if(!e.length){i.innerHTML=`
      <div class="empty-state">
        <div class="icon">\u{1F516}</div>
        <h3>No saved listings</h3>
        <p>Save useful listings from their detail view and they will appear here for quick access.</p>
        <a class="btn-primary" href="../../index.html" style="display:inline-block;margin-top:14px;">Browse Listings</a>
      </div>`;return}i.innerHTML=`<div class="owner-listings-grid">${e.map(t=>`
      <div class="owner-listing-card view-saved-listing" role="button" tabindex="0" data-id="${escapeHtml(t.id)}">
        <span class="owner-listing-media">${getImageMarkup(t.images,t.title||"Listing image",t.category)}</span>
        <span class="owner-listing-body">
          <span class="owner-listing-title">${escapeHtml(t.title||"Untitled listing")}</span>
          <span class="owner-listing-summary">${escapeHtml(t.description||"No description provided.")}</span>
          <span class="owner-listing-meta">
            <span>${escapeHtml(t.category||"other")}</span>
            <span>${escapeHtml(t.subcategory||"General")}</span>
            <span>${escapeHtml(t.location||"N/A")}</span>
          </span>
        </span>
        <span class="owner-listing-actions">
          <button class="btn-ghost view-saved-listing-btn" type="button" data-id="${escapeHtml(t.id)}">View</button>
          <button class="btn-danger unsave-listing" type="button" data-id="${escapeHtml(t.id)}">Unsave</button>
        </span>
      </div>
    `).join("")}</div>`,i.querySelectorAll(".view-saved-listing").forEach(t=>{t.addEventListener("click",a=>{if(a.target.closest(".owner-listing-actions"))return;const n=a.currentTarget.dataset.id;n&&openProfileListingModal(n)}),t.addEventListener("keydown",a=>{const n=a;if(n.key!=="Enter"&&n.key!==" ")return;n.preventDefault();const o=n.currentTarget.dataset.id;o&&openProfileListingModal(o)})}),i.querySelectorAll(".view-saved-listing-btn").forEach(t=>{t.addEventListener("click",a=>{a.stopPropagation(),openProfileListingModal(a.currentTarget.dataset.id)})}),i.querySelectorAll(".unsave-listing").forEach(t=>{t.addEventListener("click",a=>{a.stopPropagation(),unsaveListing(a.currentTarget.dataset.id)})})}}function ensureProfileListingModal(){let e=document.getElementById("profileListingModal");return e||(e=document.createElement("div"),e.id="profileListingModal",e.className="listing-modal",e.innerHTML=`
    <div class="listing-modal-backdrop" data-close-profile-listing-modal></div>
    <div class="listing-modal-panel" role="dialog" aria-modal="true" aria-labelledby="profileListingModalTitle">
      <button class="listing-modal-close" type="button" data-close-profile-listing-modal aria-label="Close listing details">\xD7</button>
      <div id="profileListingModalBody" class="listing-modal-body"></div>
    </div>
  `,document.body.appendChild(e),e)}function closeProfileListingModal(){const e=document.getElementById("profileListingModal");e&&(e.classList.remove("open"),document.body.classList.remove("listing-modal-open"))}function renderProfileListingModal(e){const i=Array.isArray(e.images)&&e.images.length?`<div class="listing-detail-gallery">${e.images.map(n=>`<img src="${escapeHtml(n)}" alt="${escapeHtml(e.title||"Listing image")}" loading="lazy">`).join("")}</div>`:`<div class="listing-detail-gallery">${getDefaultListingImageMarkup(e.category)}</div>`,t=[["Category",e.category],["Specific type",e.subcategory||"General"],["Location",e.location||"N/A"],["Location type",e.locationType],["Availability",e.availability],["Price note",e.priceNote],["Tags",Array.isArray(e.tags)?e.tags.join(", "):""],["Contact preference",e.contactPreference]].filter(([,n])=>n).map(([n,o])=>`<span><strong>${escapeHtml(n)}:</strong> ${escapeHtml(o)}</span>`).join(""),a=e.externalLink?`<a class="btn-ghost" href="${escapeHtml(e.externalLink)}" target="_blank" rel="noopener">Open link</a>`:"";return`
    <div class="listing-detail-kicker">${escapeHtml(e.category||"Listing")}</div>
    <h2 id="profileListingModalTitle">${escapeHtml(e.title||"Untitled listing")}</h2>
    ${i}
    <div class="listing-detail-meta">${t}</div>
    <div class="listing-detail-price">${escapeHtml(e.price||"Open")}</div>
    <p>${escapeHtml(e.description||"No description provided.")}</p>
    <div class="listing-detail-contact">
      ${e.contactEmail?`<a class="btn-primary" href="mailto:${escapeHtml(e.contactEmail)}">Email</a>`:""}
      ${e.contactPhone?`<a class="btn-ghost" href="tel:${escapeHtml(e.contactPhone)}">${escapeHtml(e.contactPhone)}</a>`:""}
      ${a}
      <button class="btn-primary" type="button" data-edit-profile-listing="${escapeHtml(e.id)}">Edit listing</button>
    </div>
  `}async function openProfileListingModal(e){if(!requireAuth())return;const i=ensureProfileListingModal(),t=i.querySelector("#profileListingModalBody");i.classList.add("open"),document.body.classList.add("listing-modal-open"),t.innerHTML='<div class="empty-state"><div class="icon">\u{1F4C4}</div><h3>Loading listing...</h3></div>';const a=await fetch(`${profileApiBase}/api/listings/${e}`,{headers:{Authorization:`Bearer ${getToken()}`}});if(!a.ok){t.innerHTML='<div class="empty-state"><div class="icon">\u{1F4C4}</div><h3>Unable to load listing</h3></div>';return}const n=await a.json();t.innerHTML=renderProfileListingModal(n),t.querySelector("[data-edit-profile-listing]")?.addEventListener("click",o=>{openProfileListingEditModal(o.currentTarget.dataset.editProfileListing)})}function tagsToInput(e){return Array.isArray(e)?e.join(", "):""}function inputToTags(e=""){return e.split(",").map(i=>i.trim()).filter(Boolean).slice(0,8)}function renderEditableImagePreview(e=[]){return`
    <div class="image-preview-list" id="modalEditImagePreview">
      ${e.map((i,t)=>`
        <div class="image-preview-item">
          <img src="${escapeHtml(i)}" alt="Listing image ${t+1}">
          <button class="image-remove-btn" type="button" data-remove-modal-image="${t}" aria-label="Remove image">\xD7</button>
        </div>
      `).join("")}
    </div>
  `}function renderProfileListingEditForm(e){return`
    <div class="listing-detail-kicker">Edit listing</div>
    <h2 id="profileListingModalTitle">${escapeHtml(e.title||"Untitled listing")}</h2>
    <form id="profileListingModalEditForm" data-editing-id="${escapeHtml(e.id)}">
      <div class="form-group">
        <label class="form-label" for="modalEditTitle">Headline</label>
        <input class="form-input" id="modalEditTitle" name="title" type="text" value="${escapeHtml(e.title||"")}" required />
      </div>
      <div class="form-row--two">
        <div class="form-group">
          <label class="form-label" for="modalEditCategory">Category</label>
          <select class="form-select" id="modalEditCategory" name="category" required>
          ${Array.from(new Set([e.category||"","jobs","housing","photography","marketplace","community","services","events","other"])).filter(Boolean).map(i=>`<option value="${escapeHtml(i)}" ${i===e.category?"selected":""}>${escapeHtml(i.charAt(0).toUpperCase()+i.slice(1))}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="modalEditSubcategory">Specific type</label>
          <input class="form-input" id="modalEditSubcategory" name="subcategory" type="text" value="${escapeHtml(e.subcategory||"")}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="modalEditDescription">Description</label>
        <textarea class="form-input" id="modalEditDescription" name="description" required>${escapeHtml(e.description||"")}</textarea>
      </div>
      <div class="form-row--two">
        <div class="form-group">
          <label class="form-label" for="modalEditLocation">Location</label>
          <input class="form-input" id="modalEditLocation" name="location" type="text" value="${escapeHtml(e.location||"")}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="modalEditLocationType">Location type</label>
          <input class="form-input" id="modalEditLocationType" name="locationType" type="text" value="${escapeHtml(e.locationType||"")}" />
        </div>
      </div>
      <div class="form-row--two">
        <div class="form-group">
          <label class="form-label" for="modalEditPrice">Price / rate</label>
          <input class="form-input" id="modalEditPrice" name="price" type="text" value="${escapeHtml(e.price||"")}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="modalEditPriceNote">Price note</label>
          <input class="form-input" id="modalEditPriceNote" name="priceNote" type="text" value="${escapeHtml(e.priceNote||"")}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="modalEditAvailability">Availability / timing</label>
        <input class="form-input" id="modalEditAvailability" name="availability" type="text" value="${escapeHtml(e.availability||"")}" />
      </div>
      <div class="form-row--two">
        <div class="form-group">
          <label class="form-label" for="modalEditContactEmail">Email</label>
          <input class="form-input" id="modalEditContactEmail" name="contactEmail" type="email" value="${escapeHtml(e.contactEmail||"")}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="modalEditContactPhone">Phone</label>
          <input class="form-input" id="modalEditContactPhone" name="contactPhone" type="tel" value="${escapeHtml(e.contactPhone||"")}" />
        </div>
      </div>
      <div class="form-row--two">
        <div class="form-group">
          <label class="form-label" for="modalEditContactPreference">Contact preference</label>
          <input class="form-input" id="modalEditContactPreference" name="contactPreference" type="text" value="${escapeHtml(e.contactPreference||"")}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="modalEditExternalLink">External link</label>
          <input class="form-input" id="modalEditExternalLink" name="externalLink" type="url" value="${escapeHtml(e.externalLink||"")}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="modalEditTags">Tags</label>
        <input class="form-input" id="modalEditTags" name="tags" type="text" value="${escapeHtml(tagsToInput(e.tags))}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="modalEditImages">Images</label>
        <input class="file-input" id="modalEditImages" name="imagesUpload[]" type="file" accept="image/*" multiple />
        <label class="btn-white file-upload-button" for="modalEditImages">Add images</label>
        <div class="field-note">You can keep, remove, or add multiple images. Maximum ${MAX_PROFILE_LISTING_IMAGES} images.</div>
        ${renderEditableImagePreview(Array.isArray(e.images)?e.images:[])}
      </div>
      <div id="profileListingModalMessage" class="form-helper"></div>
      <div class="listing-detail-contact">
        <button class="btn-primary" type="submit">Save changes</button>
        <button class="btn-ghost" type="button" data-view-profile-listing="${escapeHtml(e.id)}">Cancel</button>
      </div>
    </form>
  `}async function openProfileListingEditModal(e){if(!requireAuth())return;const i=ensureProfileListingModal(),t=i.querySelector("#profileListingModalBody");i.classList.add("open"),document.body.classList.add("listing-modal-open"),t.innerHTML='<div class="empty-state"><div class="icon">\u{1F4C4}</div><h3>Loading editor...</h3></div>';const a=await fetch(`${profileApiBase}/api/listings/${e}`,{headers:{Authorization:`Bearer ${getToken()}`}});if(!a.ok){t.innerHTML='<div class="empty-state"><div class="icon">\u{1F4C4}</div><h3>Unable to load editor</h3></div>';return}const n=await a.json();let o=Array.isArray(n.images)?[...n.images]:[];t.innerHTML=renderProfileListingEditForm(n);const r=()=>{const s=t.querySelector("#modalEditImagePreview");s&&(s.outerHTML=renderEditableImagePreview(o))};t.querySelector("[data-view-profile-listing]")?.addEventListener("click",s=>{openProfileListingModal(s.currentTarget.dataset.viewProfileListing)}),t.querySelector("#modalEditImages")?.addEventListener("change",async s=>{const l=s.currentTarget,d=Math.max(0,MAX_PROFILE_LISTING_IMAGES-o.length),c=Array.from(l.files||[]).filter(u=>u.type.startsWith("image/")).slice(0,d),m=await Promise.all(c.map(resizeImageFile));o=o.concat(m).slice(0,MAX_PROFILE_LISTING_IMAGES),l.value="",r()}),t.querySelector("#profileListingModalEditForm")?.addEventListener("click",s=>{const l=s.target.closest("[data-remove-modal-image]");l&&(o.splice(Number(l.dataset.removeModalImage),1),r())}),t.querySelector("#profileListingModalEditForm")?.addEventListener("submit",s=>{handleProfileListingModalEditSubmit(s,o)})}async function handleProfileListingModalEditSubmit(e,i){e.preventDefault();const t=e.currentTarget,a=t.querySelector("#profileListingModalMessage"),n=t.querySelector('[type="submit"]'),o=n?n.textContent:"";n&&(n.disabled=!0,n.textContent="Saving\u2026");const r=t.dataset.editingId,s=t.elements,l={title:s.title.value.trim(),description:s.description.value.trim(),category:s.category.value.trim(),subcategory:s.subcategory.value.trim(),location:s.location.value.trim(),locationType:s.locationType.value.trim(),availability:s.availability.value.trim(),price:s.price.value.trim(),priceNote:s.priceNote.value.trim(),contactEmail:s.contactEmail.value.trim(),contactPhone:s.contactPhone.value.trim(),contactPreference:s.contactPreference.value.trim(),externalLink:s.externalLink.value.trim(),tags:inputToTags(s.tags.value),images:Array.isArray(i)?i:[]};try{const d=await fetch(`${profileApiBase}/api/listings/${r}`,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`},body:JSON.stringify(l)}),c=await d.json();if(!d.ok){a&&(a.textContent=c.error||"Unable to update listing.",a.className="form-helper error-text");return}fetchMyListings(),openProfileListingModal(r),biscoonToast("Listing updated successfully.","success")}catch{a&&(a.textContent="Network error. Please check your connection and try again.",a.className="form-helper error-text")}finally{n&&(n.disabled=!1,n.textContent=o)}}async function fetchMyListings(){if(!requireAuth())return;const e=await fetch(`${profileApiBase}/api/listings/mine`,{headers:{Authorization:`Bearer ${getToken()}`}});if(!e.ok){document.getElementById("profileListingList").innerHTML=`
      <div class="empty-state">
        <div class="icon">\u26A0\uFE0F</div>
        <h3>Could not load listings</h3>
        <p>Something went wrong. <button class="btn-ghost" onclick="fetchMyListings()" style="display:inline;padding:4px 10px;font-size:13px;">Try again</button></p>
      </div>`;return}const i=await e.json();renderListingList(i.listings||[])}async function fetchSavedListings(){if(!requireAuth())return;const e=await fetch(`${profileApiBase}/api/listings/saved`,{headers:{Authorization:`Bearer ${getToken()}`}});if(!e.ok){document.getElementById("profileSavedListingList").innerHTML=`
      <div class="empty-state">
        <div class="icon">\u26A0\uFE0F</div>
        <h3>Could not load saved listings</h3>
        <p>Something went wrong. <button class="btn-ghost" onclick="fetchSavedListings()" style="display:inline;padding:4px 10px;font-size:13px;">Try again</button></p>
      </div>`;return}const i=await e.json();renderSavedListingList(i.listings||[])}async function unsaveListing(e){const i=await fetch(`${profileApiBase}/api/listings/${e}/save`,{method:"DELETE",headers:{Authorization:`Bearer ${getToken()}`}}),t=await i.json();if(!i.ok)return showProfileMessage(t.error||"Unable to unsave listing.","error");fetchSavedListings()}async function loadListingForEdit(e){const i=await fetch(`${profileApiBase}/api/listings/${e}`,{headers:{Authorization:`Bearer ${getToken()}`}});if(!i.ok)return showEditListingMessage("Unable to load listing for edit.","error");const t=await i.json();document.getElementById("editListingSection").style.display="block",document.getElementById("editListingForm").dataset.editingId=e,document.getElementById("editTitle").value=t.title||"",document.getElementById("editDescription").value=t.description||"",document.getElementById("editLocation").value=t.location||"",document.getElementById("editPrice").value=t.price||"",document.getElementById("editContactEmail").value=t.contactEmail||"",document.getElementById("editContactPhone").value=t.contactPhone||"",showEditListingMessage("Edit your listing and save changes.","success"),window.scrollTo({top:0,behavior:"smooth"})}async function handleEditListingSubmit(e){if(e.preventDefault(),!requireAuth())return;const i=document.getElementById("editListingForm"),t=i.dataset.editingId;if(!t)return showEditListingMessage("No listing selected for editing.","error");const a={title:document.getElementById("editTitle").value.trim(),description:document.getElementById("editDescription").value.trim(),location:document.getElementById("editLocation").value.trim(),price:document.getElementById("editPrice").value.trim(),contactEmail:document.getElementById("editContactEmail").value.trim(),contactPhone:document.getElementById("editContactPhone").value.trim()},n=await fetch(`${profileApiBase}/api/listings/${t}`,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`},body:JSON.stringify(a)}),o=await n.json();if(!n.ok)return showEditListingMessage(o.error||"Unable to update listing.","error");showEditListingMessage("Listing updated successfully.","success"),i.removeAttribute("data-editing-id"),i.reset(),fetchMyListings(),window.setTimeout(()=>{document.getElementById("editListingSection").style.display="none"},1400)}async function deleteListing(e){if(!confirm("Delete this listing? This cannot be undone."))return;const i=await fetch(`${profileApiBase}/api/listings/${e}`,{method:"DELETE",headers:{Authorization:`Bearer ${getToken()}`}}),t=await i.json();if(!i.ok)return showEditListingMessage(t.error||"Unable to delete listing.","error");fetchMyListings(),fetchSavedListings()}function handleLogout(){localStorage.removeItem("biscoonToken"),window.location.href="login.html"}async function handleProfileResendVerification(){const e=await fetch(`${profileApiBase}/api/auth/request-email-verification`,{method:"POST",headers:{Authorization:`Bearer ${getToken()}`,"Content-Type":"application/json"},body:"{}"}),i=await e.json().catch(()=>({}));if(!e.ok)return showProfileMessage(i.error||"Unable to resend confirmation email.","error");if(i.emailVerified){const t=document.getElementById("emailVerifyBanner");return t&&(t.hidden=!0),showProfileMessage("Your email is already confirmed.","success")}showProfileMessage("Confirmation email sent. Check your inbox.","success")}document.addEventListener("DOMContentLoaded",function(){document.getElementById("profileForm")?.addEventListener("submit",handleProfileSubmit),document.getElementById("editListingForm")?.addEventListener("submit",handleEditListingSubmit),document.getElementById("cancelEditListing")?.addEventListener("click",()=>{document.getElementById("editListingForm").removeAttribute("data-editing-id"),document.getElementById("editListingForm").reset(),document.getElementById("editListingSection").style.display="none",showEditListingMessage("","success")}),document.addEventListener("click",e=>{e.target.closest("[data-close-profile-listing-modal]")&&closeProfileListingModal()}),document.getElementById("logoutButton")?.addEventListener("click",handleLogout),document.getElementById("resendVerifyBtn")?.addEventListener("click",handleProfileResendVerification),requireAuth()&&(fetchProfile(),fetchMyListings(),fetchSavedListings())});
