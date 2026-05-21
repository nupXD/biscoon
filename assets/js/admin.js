const BASE = window.location.origin.startsWith("file://") ? "http://localhost:4000" : window.location.origin;
const ADMIN_TOKEN_KEY = "biscoonAdminToken";
const ADMIN_SESSION_KEY = "biscoonAdminSession";
const ADMIN_LAST_ACTIVITY_KEY = "biscoonAdminLastActivity";
const ADMIN_SIDEBAR_COLLAPSED_KEY = "biscoonAdminSidebarCollapsed";
let _token = "";
let _me = null;
let _view = "";
let _newsMediaDraft = [];
const _s = {
  users: { page: 1, search: "", kind: "regular" },
  listings: { page: 1, category: "", search: "" },
  events: { page: 1, search: "" },
  news: { page: 1, status: "all", category: "", search: "" },
  discussions: { page: 1 },
  comments: { page: 1, type: "all" },
  reports: { page: 1, status: "open" },
  spotlight: {},
  announcements: {},
  audit: { page: 1, action: "all", targetType: "all", search: "" }
};
document.addEventListener("DOMContentLoaded", async () => {
  setupAdminShell();
  _token = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
  if (!_token) {
    goLogin();
    return;
  }
  try {
    const apiResult = await api("/api/auth/me");
    const user = apiResult.user || apiResult;
    if (!isAdminRole(user.role)) {
      notify("Access denied. Admin accounts only.", "error");
      window.location.href = "../../index.html";
      return;
    }
    _me = user;
    document.getElementById("adminName").textContent = `${_me.name} \xB7 ${roleLabel(_me.role)}`;
    syncNavVisibility();
    navigate(firstAccessibleView());
  } catch {
    goLogin();
  }
});
async function api(path, opts = {}) {
  const headers = { Authorization: `Bearer ${_token}`, ...opts.headers || {} };
  if (opts.body) headers["Content-Type"] = "application/json";
  const r = await fetch(BASE + path, { ...opts, headers });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Request failed.");
  localStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(Date.now()));
  return d;
}
function goLogin() {
  window.location.href = "login.html";
}
const VIEW_TITLES = {
  dashboard: "Dashboard",
  users: "Users",
  listings: "Listings",
  events: "Events",
  news: "News",
  discussions: "Discussions",
  comments: "Comments",
  reports: "Reports",
  spotlight: "Hero Spotlight",
  announcements: "Announcements",
  audit: "Audit Logs",
  trash: "Trash"
};
const VIEW_HINTS = {
  dashboard: "Live snapshot of users, listings, news, discussions, and recent activity.",
  users: "Review regular accounts and manage admin users with assigned privileges.",
  listings: "Inspect, edit, and moderate public listings across all categories.",
  events: "Create, edit, and manage community events posted on Biscoon.",
  news: "Draft, publish, feature, and manage newsroom stories with rich media.",
  discussions: "Create and moderate community discussion threads.",
  comments: "Review listing and discussion comments from one moderation queue.",
  reports: "Track reported content and move each report through review.",
  spotlight: "Manage Netflix-style hero banners shown on the homepage \u2014 ads, events, promos.",
  announcements: "Publish site-wide messages and control visibility.",
  trash: "Soft-deleted content \u2014 the internet is forever. Only super-admins can restore or permanently delete.",
  audit: "Review super-admin activity, content changes, and moderation actions."
};
const VIEW_PERMISSION = {
  users: "users",
  listings: "listings",
  events: "listings",
  news: "news",
  discussions: "discussions",
  comments: "comments",
  reports: "reports",
  spotlight: "announcements",
  announcements: "announcements"
};
const ADMIN_PERMISSION_DEFS = [
  { key: "users", label: "Regular Users", description: "View regular accounts, inspect their content, and remove regular users." },
  { key: "listings", label: "Listings", description: "View, edit, and delete marketplace listings and events." },
  { key: "news", label: "News", description: "Create, edit, publish, feature, and delete newsroom stories." },
  { key: "discussions", label: "Discussions", description: "Create, view, edit, and delete community discussions." },
  { key: "comments", label: "Comments", description: "Review and remove listing or discussion comments." },
  { key: "reports", label: "Reports", description: "Review reports and update moderation status." },
  { key: "announcements", label: "Announcements", description: "Create, pause, activate, and delete site announcements." }
];
function navigate(view) {
  if (!canAccessView(view)) {
    content('<div class="admin-error">You do not have permission to open this admin section.</div>');
    return;
  }
  _view = view;
  document.querySelectorAll(".admin-nav-link").forEach((l) => l.classList.toggle("active", l.dataset.view === view));
  document.getElementById("viewTitle").textContent = VIEW_TITLES[view] || view;
  const hint = document.getElementById("viewHint");
  if (hint) hint.textContent = VIEW_HINTS[view] || "Manage Biscoon admin operations.";
  content(loadingState(VIEW_TITLES[view] || "Loading"));
  ({
    dashboard: showDashboard,
    users: showUsers,
    listings: showListings,
    events: showEvents,
    news: showNews,
    discussions: showDiscussions,
    comments: showComments,
    reports: showReports,
    spotlight: showSpotlights,
    announcements: showAnnouncements,
    audit: showAuditLogs,
    trash: showTrash
  })[view]?.();
}
function content(html) {
  const el = document.getElementById("adminContent");
  if (!el) return;
  el.innerHTML = html;
  el.classList.remove("admin-content-enter");
  void el.offsetWidth;
  el.classList.add("admin-content-enter");
}
function loadingState(label = "Loading") {
  return `
    <div class="admin-loading-shell" aria-live="polite">
      <div class="admin-loading-head">
        <span class="admin-loading-spinner"></span>
        <span>${esc(label)}\u2026</span>
      </div>
      <div class="admin-skeleton-grid">
        <span></span><span></span><span></span>
      </div>
      <div class="admin-skeleton-card">
        <span></span><span></span><span></span><span></span>
      </div>
    </div>`;
}
function setupAdminShell() {
  const layout = document.getElementById("adminLayout");
  const sidebarToggle = document.getElementById("adminSidebarToggle");
  const refreshBtn = document.getElementById("adminRefreshView");
  if (!document.getElementById("adminToastHost")) {
    const host = document.createElement("div");
    host.id = "adminToastHost";
    host.className = "admin-toast-host";
    document.body.appendChild(host);
  }
  if (layout && localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "true") {
    layout.classList.add("admin-sidebar-collapsed");
  }
  sidebarToggle?.addEventListener("click", () => {
    const collapsed = !layout?.classList.contains("admin-sidebar-collapsed");
    layout?.classList.toggle("admin-sidebar-collapsed", collapsed);
    localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, String(collapsed));
  });
  refreshBtn?.addEventListener("click", () => refreshCurrentView(true));
}
function refreshCurrentView(showToast = false) {
  const handlers = {
    dashboard: showDashboard,
    users: showUsers,
    listings: showListings,
    events: showEvents,
    news: showNews,
    discussions: showDiscussions,
    comments: showComments,
    reports: showReports,
    spotlight: showSpotlights,
    announcements: showAnnouncements,
    audit: showAuditLogs,
    trash: showTrash
  };
  const refresh = handlers[_view];
  if (!refresh) return;
  content(loadingState("Refreshing"));
  refresh();
  if (showToast) notify("Refreshing current view.", "info");
}
function notify(message, type = "info") {
  const host = document.getElementById("adminToastHost");
  if (!host || !message) return;
  const toast = document.createElement("div");
  toast.className = `admin-toast admin-toast-${type}`;
  const icon = type === "success" ? "\u2713" : type === "error" ? "!" : type === "warning" ? "!" : "i";
  toast.innerHTML = `<span class="admin-toast-icon">${icon}</span><span>${esc(message)}</span>`;
  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 180);
  }, type === "error" ? 5200 : 3200);
}
function confirmAction(message, options = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "admin-confirm-overlay";
    const tone = options.tone === "danger" ? "danger" : "primary";
    overlay.innerHTML = `
      <div class="admin-confirm" role="dialog" aria-modal="true">
        <div class="admin-confirm-icon admin-confirm-icon-${tone}">${tone === "danger" ? "!" : "?"}</div>
        <div class="admin-confirm-body">
          <div class="admin-confirm-title">${esc(options.title || "Confirm action")}</div>
          <div class="admin-confirm-message">${esc(message)}</div>
        </div>
        <div class="admin-confirm-actions">
          <button class="admin-btn admin-btn-ghost" data-confirm-cancel>Cancel</button>
          <button class="admin-btn ${tone === "danger" ? "admin-btn-danger-solid" : "admin-btn-primary"}" data-confirm-ok>${esc(options.confirmText || "Confirm")}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const finish = (value) => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 160);
      resolve(value);
    };
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest("[data-confirm-cancel]")) finish(false);
      if (e.target.closest("[data-confirm-ok]")) finish(true);
    });
    requestAnimationFrame(() => overlay.classList.add("show"));
    overlay.querySelector("[data-confirm-ok]")?.focus();
  });
}
function isTypingTarget(target) {
  const tag = target?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
}
function esc(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c
  );
}
function fmtDate(v) {
  if (!v) return "\u2014";
  return new Date(v).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(v) {
  if (!v) return "\u2014";
  const d = new Date(v), now = /* @__PURE__ */ new Date();
  const diff = (now.getTime() - d.getTime()) / 1e3;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return fmtDate(v);
}
function badge(text, color = "gray") {
  return `<span class="admin-badge admin-badge-${color}">${esc(text)}</span>`;
}
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
function isSuperAdminRole(role) {
  return role === "super-admin" || role === "admin";
}
function isStaffAdminRole(role) {
  return role === "staff" || role === "sub-admin";
}
function isAdminRole(role) {
  return isSuperAdminRole(role) || isStaffAdminRole(role);
}
function canManageStaff() {
  return isSuperAdminRole(_me?.role ?? "");
}
function roleLabel(role) {
  if (isSuperAdminRole(role)) return "Super Admin";
  if (isStaffAdminRole(role)) return "Admin User";
  return "Regular User";
}
function roleBadge(role) {
  const cleanRole = role || "user";
  const color = isSuperAdminRole(cleanRole) ? "red" : isStaffAdminRole(cleanRole) ? "blue" : "gray";
  return badge(roleLabel(cleanRole), color);
}
function assignedPermissions(user = _me) {
  if (isSuperAdminRole(user?.role)) return ADMIN_PERMISSION_DEFS.map((permission) => permission.key);
  if (user?.role === "sub-admin" && (!user.permissions || user.permissions.length === 0)) {
    return ADMIN_PERMISSION_DEFS.map((permission) => permission.key);
  }
  return Array.isArray(user?.permissions) ? user.permissions : [];
}
function hasAdminPermission(permission) {
  return isSuperAdminRole(_me?.role) || assignedPermissions(_me).includes(permission);
}
function canAccessView(view) {
  if (view === "audit") return canManageStaff();
  return !VIEW_PERMISSION[view] || hasAdminPermission(VIEW_PERMISSION[view]);
}
function firstAccessibleView() {
  return ["dashboard", "users", "listings", "news", "discussions", "comments", "reports", "announcements", "audit"].find(canAccessView) || "dashboard";
}
function syncNavVisibility() {
  document.querySelectorAll(".admin-nav-link[data-view]").forEach((link) => {
    link.hidden = !canAccessView(link.dataset.view);
  });
}
function permissionSummary(permissions = []) {
  if (!permissions.length) return '<span class="admin-muted">No privileges</span>';
  const labels = ADMIN_PERMISSION_DEFS.filter((permission) => permissions.includes(permission.key)).map((permission) => badge(permission.label, "blue"));
  return labels.join(" ");
}
function permissionCheckboxes(selected = []) {
  const selectedSet = new Set(selected);
  return `<div class="admin-permission-grid">
    ${ADMIN_PERMISSION_DEFS.map((permission) => `
      <label class="admin-check-row">
        <input type="checkbox" value="${esc(permission.key)}" data-staff-permission${selectedSet.has(permission.key) ? " checked" : ""}>
        <span>
          <strong>${esc(permission.label)}</strong>
          <small>${esc(permission.description)}</small>
        </span>
      </label>
    `).join("")}
  </div>`;
}
function table(headers, rows) {
  if (!rows.length) return '<div class="admin-empty">No records found.</div>';
  return `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}
function pager(current, total, view) {
  if (total <= 1) return "";
  const max = Math.min(total, 9);
  const btns = Array.from({ length: max }, (_, i) => i + 1).map(
    (i) => `<button class="admin-page-btn${i === current ? " active" : ""}" data-page="${i}" data-pager-view="${view}">${i}</button>`
  );
  if (total > max) btns.push(`<span style="padding:0 6px;color:#6b7a8d;align-self:center">\u2026 ${total}</span>`);
  return `<div class="admin-pagination">${btns.join("")}</div>`;
}
function tabs(options, active, attr) {
  return `<div class="admin-tabs">${options.map(
    (o) => `<button class="admin-tab${o.value === active ? " active" : ""}" data-${attr}="${o.value}">${o.label}</button>`
  ).join("")}</div>`;
}
async function showDashboard() {
  try {
    const [stats, feedData] = await Promise.all([
      api("/api/admin/stats"),
      api("/api/admin/feed")
    ]);
    const s = stats;
    const maxCat = s.byCategory[0]?.count || 1;
    content(`
      <div class="dash-header">
        <div class="dash-greeting">Welcome back, ${esc(_me.name.split(" ")[0])} \u{1F44B}</div>
        <button class="admin-btn admin-btn-ghost dash-refresh" id="dashRefresh">\u21BA Refresh</button>
      </div>

      <div class="dash-stat-grid">
        ${hasAdminPermission("users") ? statCard("\u{1F465}", "Total Users", s.users.total, s.users.thisWeek, s.users.today, "blue", "users") : ""}
        ${hasAdminPermission("listings") ? statCard("\u{1F4CB}", "Total Listings", s.listings.total, s.listings.thisWeek, s.listings.today, "green", "listings") : ""}
        ${hasAdminPermission("news") ? statCard("\u{1F4F0}", "Published News", s.news.total, s.news.thisWeek, null, "red", "news") : ""}
        ${hasAdminPermission("discussions") ? statCard("\u{1F4AC}", "Discussions", s.discussions.total, s.discussions.thisWeek, null, "purple", "discussions") : ""}
      </div>

      <div class="dash-quick-actions">
        ${hasAdminPermission("users") ? '<button class="dash-action-btn" data-nav-to="users" data-user-kind="regular">\u{1F465} Regular Users</button>' : ""}
        ${canManageStaff() ? '<button class="dash-action-btn" data-nav-to="users" data-user-kind="staff">\u{1F6E1} Admin Users</button>' : ""}
        ${hasAdminPermission("listings") ? '<button class="dash-action-btn" data-nav-to="listings">\u{1F4CB} Manage Listings</button>' : ""}
        ${hasAdminPermission("news") ? '<button class="dash-action-btn" data-nav-to="news">\u{1F4F0} Publish News</button>' : ""}
        ${hasAdminPermission("discussions") ? '<button class="dash-action-btn" data-nav-to="discussions">\u{1F4AC} Start Discussion</button>' : ""}
        ${hasAdminPermission("comments") ? '<button class="dash-action-btn" data-nav-to="comments">\u{1F5E8}\uFE0F Review Comments</button>' : ""}
        ${hasAdminPermission("announcements") ? '<button class="dash-action-btn dash-action-primary" data-nav-to="announcements">\u{1F4E2} Create Announcement</button>' : ""}
        ${canManageStaff() ? '<button class="dash-action-btn" data-nav-to="audit">\u{1F9FE} Audit Logs</button>' : ""}
      </div>

      <div class="admin-two-col">
        <div class="admin-card">
          <div class="admin-card-head">
            <span>Recent Activity</span>
            <span class="dash-card-sub">${feedData.feed.length} events</span>
          </div>
          <div class="admin-feed">
            ${feedData.feed.map((f) => `
              <div class="admin-feed-item dash-feed-clickable" data-feed-type="${f.type}">
                <div class="admin-feed-icon admin-feed-icon-${f.type}">${f.icon}</div>
                <div class="admin-feed-body">
                  <div class="admin-feed-title">${esc(f.title)}</div>
                  <div class="admin-feed-sub">${esc(f.sub)}</div>
                </div>
                <div class="admin-feed-time">${fmtTime(f.date)}</div>
              </div>
            `).join("") || '<div class="admin-empty">No activity yet.</div>'}
          </div>
        </div>

        ${hasAdminPermission("listings") ? `<div class="admin-card">
          <div class="admin-card-head">
            <span>Listings by Category</span>
            <span class="dash-card-sub">${s.byCategory.length} categories</span>
          </div>
          <div class="dash-bar-chart">
            ${s.byCategory.map((c) => `
              <div class="dash-bar-row">
                <div class="dash-bar-label" title="${esc(capitalize(c.category))}">${esc(capitalize(c.category))}</div>
                <div class="dash-bar-track">
                  <div class="dash-bar-fill" style="width:${Math.round(c.count / maxCat * 100)}%"></div>
                  <span class="dash-bar-count">${c.count}</span>
                </div>
              </div>
            `).join("") || '<div class="admin-empty">No listings yet.</div>'}
          </div>
        </div>` : ""}
      </div>

      <div class="admin-two-col">
        ${hasAdminPermission("users") ? `<div class="admin-card">
          <div class="admin-card-head">
            <span>Recent Users</span>
            ${hasAdminPermission("users") ? '<button class="dash-see-all" data-nav-to="users" data-user-kind="regular">See all \u2192</button>' : ""}
          </div>
          <div class="dash-mini-list">
            ${(s.recentUsers || []).map((u) => `
              <div class="dash-mini-item dash-mini-clickable" data-view-user="${esc(u.id)}" data-view-user-name="${esc(u.name)}" data-view-user-email="${esc(u.email)}" data-view-user-role="${esc(u.role || "user")}" data-view-user-joined="${esc(u.createdAt)}" data-view-user-listings="0" title="View user profile">
                <div class="dash-mini-avatar" style="background:${userColor(u.name)}">${esc(u.name.charAt(0).toUpperCase())}</div>
                <div class="dash-mini-body">
                  <div class="dash-mini-name">${esc(u.name)}</div>
                  <div class="dash-mini-sub">${esc(u.email)}</div>
                </div>
                <div class="dash-mini-meta">
                  ${isAdminRole(u.role) ? roleBadge(u.role) : ""}
                  <span class="dash-mini-date">${fmtTime(u.createdAt)}</span>
                </div>
              </div>
            `).join("") || '<div class="admin-empty">No users yet.</div>'}
          </div>
        </div>` : ""}

        ${hasAdminPermission("listings") ? `<div class="admin-card">
          <div class="admin-card-head">
            <span>Recent Listings</span>
            <button class="dash-see-all" data-nav-to="listings">See all \u2192</button>
          </div>
          <div class="dash-mini-list">
            ${(s.recentListings || []).map((l) => `
              <div class="dash-mini-item dash-mini-clickable" data-view-listing="${esc(l.id)}" title="View listing">
                <div class="dash-mini-cat-icon">${catEmoji(l.category)}</div>
                <div class="dash-mini-body">
                  <div class="dash-mini-name">${esc(l.title)}</div>
                  <div class="dash-mini-sub">${esc(l.location || capitalize(l.category) || "\u2014")}</div>
                </div>
                <div class="dash-mini-meta">
                  ${badge(l.category, "green")}
                  <span class="dash-mini-date">${fmtTime(l.createdAt)}</span>
                </div>
              </div>
            `).join("") || '<div class="admin-empty">No listings yet.</div>'}
          </div>
        </div>` : ""}
      </div>
    `);
    document.getElementById("dashRefresh")?.addEventListener("click", () => {
      content(loadingState("Refreshing dashboard"));
      showDashboard();
    });
    document.querySelectorAll("[data-nav-to]").forEach((el) => {
      el.addEventListener("click", () => {
        if (el.dataset.userKind) _s.users.kind = el.dataset.userKind;
        navigate(el.dataset.navTo);
      });
    });
    document.querySelectorAll(".dash-feed-clickable").forEach((el) => {
      el.addEventListener("click", () => {
        const map = { user: "users", listing: "listings", discussion: "discussions" };
        if (map[el.dataset.feedType]) navigate(map[el.dataset.feedType]);
      });
    });
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}
function statCard(icon, label, value, weekCount, todayCount, color, navTo) {
  const clickable = navTo && canAccessView(navTo);
  const trendHtml = weekCount > 0 ? `<span class="dash-trend-up">\u2191 ${weekCount} this week</span>` : `<span class="dash-trend-zero">No new this week</span>`;
  const todayHtml = todayCount !== null ? ` \xB7 <span class="dash-today-val">${todayCount} today</span>` : "";
  return `<div class="admin-stat-card admin-stat-${color}${clickable ? " dash-stat-clickable" : ""}"${clickable ? ` data-nav-to="${navTo}"` : ""}>
    <div class="admin-stat-icon">${icon}</div>
    <div class="admin-stat-content">
      <div class="admin-stat-value">${Number(value).toLocaleString()}</div>
      <div class="admin-stat-label">${label}</div>
      <div class="dash-stat-footer">${trendHtml}${todayHtml}</div>
    </div>
    <div class="dash-stat-arr">\u203A</div>
  </div>`;
}
function userColor(name) {
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#14b8a6"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % colors.length;
  return colors[h];
}
function catEmoji(cat) {
  const m = { jobs: "\u{1F4BC}", housing: "\u{1F3E0}", pg: "\u{1F6CF}", services: "\u{1F527}", kinbech: "\u{1F6D2}", restaurants: "\u{1F37D}", shops: "\u{1F3EA}", events: "\u{1F389}", tech: "\u{1F4BB}", healthcare: "\u{1F3E5}", education: "\u{1F4DA}", auto: "\u{1F697}", beauty: "\u{1F484}", childcare: "\u{1F476}", cleaning: "\u{1F9F9}", photography: "\u{1F4F7}", produce: "\u{1F96C}", organizations: "\u{1F3E2}", discussions: "\u{1F4AC}", student: "\u{1F393}", finance: "\u{1F4B0}", immigration: "\u2708\uFE0F" };
  return m[cat] || "\u{1F4E6}";
}
const LISTING_VIEW_PROFILES = {
  base: {
    kindLabel: "Listing",
    subcategoryLabel: "Specific type",
    descriptionLabel: "Description",
    locationLabel: "Location",
    locationTypeLabel: "Location type",
    priceLabel: "Price / rate",
    availabilityLabel: "Availability"
  },
  photography: {
    kindLabel: "Photography showcase",
    subcategoryLabel: "Photo style / genre",
    descriptionLabel: "Caption / story",
    omitFields: ["location", "locationType", "price", "availability", "contactEmail", "contactPhone", "contactPreference", "externalLink"]
  },
  housing: {
    kindLabel: "Housing listing",
    subcategoryLabel: "Housing type",
    descriptionLabel: "Housing details",
    locationLabel: "Area / neighborhood",
    locationTypeLabel: "Showing format",
    priceLabel: "Rent / cost",
    availabilityLabel: "Move-in / availability"
  },
  jobs: {
    kindLabel: "Job listing",
    subcategoryLabel: "Role type",
    descriptionLabel: "Job description",
    locationLabel: "Work location",
    locationTypeLabel: "Work setup",
    priceLabel: "Pay / compensation",
    availabilityLabel: "Start date / schedule",
    contactPreferenceLabel: "Application method",
    externalLinkLabel: "Application link"
  },
  marketplace: {
    kindLabel: "Marketplace listing",
    subcategoryLabel: "Item / business type",
    descriptionLabel: "Item details",
    locationLabel: "Pickup / service area",
    locationTypeLabel: "Pickup format",
    priceLabel: "Asking price",
    availabilityLabel: "Pickup / availability"
  },
  service: {
    kindLabel: "Service listing",
    subcategoryLabel: "Service type",
    descriptionLabel: "Service details",
    locationLabel: "Service area",
    locationTypeLabel: "Service format",
    priceLabel: "Rate / starting price",
    availabilityLabel: "Booking availability"
  },
  professional: {
    kindLabel: "Professional listing",
    subcategoryLabel: "Professional type",
    descriptionLabel: "Professional details",
    locationLabel: "Practice / service area",
    locationTypeLabel: "Consultation format",
    priceLabel: "Consultation fee",
    availabilityLabel: "Appointment availability"
  },
  event: {
    kindLabel: "Event listing",
    subcategoryLabel: "Event type",
    descriptionLabel: "Event details",
    locationLabel: "Venue / area",
    locationTypeLabel: "Event format",
    priceLabel: "Ticket / entry cost",
    availabilityLabel: "Date / timing",
    externalLinkLabel: "RSVP / ticket link"
  },
  community: {
    kindLabel: "Community post",
    subcategoryLabel: "Community type",
    descriptionLabel: "Community details",
    locationLabel: "Community area",
    locationTypeLabel: "Participation format",
    priceLabel: "Cost / membership",
    availabilityLabel: "Schedule / availability"
  }
};
function readableLabel(value) {
  return String(value || "").trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function listingViewKind(listing = {}) {
  const category = String(listing.category || "").trim().toLowerCase();
  const subcategory = String(listing.subcategory || "").trim().toLowerCase();
  const hasAny = (items) => items.includes(category) || items.includes(subcategory);
  if (category === "photography") return "photography";
  if (hasAny(["housing", "pg", "paying-guest", "real-estate", "room", "apartment", "roommate", "studio", "sublet", "moving"])) return "housing";
  if (category === "jobs" || hasAny(["rojgar", "tech", "healthcare", "student", "full-time", "part-time", "contract", "internship", "remote"])) return "jobs";
  if (hasAny(["events", "concert", "puja", "meetup", "fundraiser", "class", "festival", "networking", "music", "art", "sports"])) return "event";
  if (hasAny(["legal", "immigration", "cpa", "finance", "insurance", "education", "tutoring", "jyotish"])) return "professional";
  if (hasAny(["services", "cleaning", "childcare", "beauty", "translation", "handyman", "catering", "delivery"])) return "service";
  if (hasAny(["marketplace", "kinbech", "restaurants", "shops", "produce", "auto", "business-for-sale", "furniture", "electronics", "vehicle", "appliance", "books"])) return "marketplace";
  if (hasAny(["community", "organizations", "literature", "yoga", "matchmaker", "matrimony", "pen-pals", "travel"])) return "community";
  return "base";
}
function listingViewProfile(listing = {}) {
  return LISTING_VIEW_PROFILES[listingViewKind(listing)] || LISTING_VIEW_PROFILES.base;
}
function listingValue(value) {
  return value !== void 0 && value !== null && String(value).trim() !== "";
}
function listingField(label, value, options = {}) {
  if (!listingValue(value)) return "";
  const full = options.full ? " admin-modal-full" : "";
  const content2 = options.raw ? String(value) : esc(value);
  return `
    <div class="admin-modal-field${full}">
      <label class="admin-modal-label">${esc(label)}</label>
      <div class="admin-view-val">${content2}</div>
    </div>`;
}
function safeHttpUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}
function safeMediaUrl(value) {
  const url = String(value || "").trim();
  if (/^https?:\/\//i.test(url) || url.startsWith("/uploads/") || /^data:image\//i.test(url)) return url;
  return "";
}
function listingGallery(images = [], isPhotography = false) {
  const safeImages = (Array.isArray(images) ? images : []).map(safeMediaUrl).filter(Boolean);
  if (!safeImages.length) {
    return isPhotography ? '<div class="admin-listing-gallery-empty">No photos attached to this photography post.</div>' : "";
  }
  return `<div class="admin-listing-gallery" data-pswp-gallery>
    ${safeImages.map((src, index) => `
      <a href="${esc(src)}" class="admin-listing-photo-link" data-pswp-src="${esc(src)}" data-pswp-width="1600" data-pswp-height="1200">
        <img src="${esc(src)}" alt="Listing photo ${index + 1}" loading="lazy">
      </a>
    `).join("")}
  </div>`;
}
async function showUsers(page) {
  if (page !== void 0) _s.users.page = page;
  if (_s.users.kind === "staff") {
    await showStaffUsers(_s.users.page);
    return;
  }
  const { page: p, search } = _s.users;
  try {
    const data = await api(`/api/admin/users?${new URLSearchParams({ page: String(p), limit: String(20), search })}`);
    content(`
      <div class="admin-toolbar">
        ${canManageStaff() ? tabs(
      [{ label: "Regular Users", value: "regular" }, { label: "Admin Users", value: "staff" }],
      _s.users.kind,
      "user-kind"
    ) : ""}
        <input class="admin-search" id="userSearch" type="search" placeholder="Search name or email\u2026" value="${esc(search)}">
        <span style="font-size:12.5px;color:#6b7a8d">${data.total.toLocaleString()} regular user${data.total !== 1 ? "s" : ""}</span>
      </div>
      <div class="admin-card">
        ${table(
      ["Name", "Email", "Phone", "Listings", "Joined", "Actions"],
      data.users.map((u) => [
        `<span class="admin-link" data-view-user="${esc(u.id)}" data-view-user-name="${esc(u.name)}" data-view-user-email="${esc(u.email)}" data-view-user-role="${esc(u.role || "user")}" data-view-user-joined="${esc(u.createdAt)}" data-view-user-listings="${u.listingCount}">${esc(u.name)}</span>`,
        esc(u.email),
        esc(u.phone || "\u2014"),
        u.listingCount,
        fmtDate(u.createdAt),
        `<div class="admin-actions">
              <button class="admin-btn admin-btn-ghost" data-view-user="${esc(u.id)}" data-view-user-name="${esc(u.name)}" data-view-user-email="${esc(u.email)}" data-view-user-role="${esc(u.role || "user")}" data-view-user-joined="${esc(u.createdAt)}" data-view-user-listings="${u.listingCount}">\u{1F441} View</button>
              <button class="admin-btn admin-btn-danger" data-del-user="${esc(u.id)}" data-del-name="${esc(u.name)}">\u{1F5D1}</button>
            </div>`
      ])
    )}
        ${pager(data.page, data.pages, "users")}
      </div>
    `);
    let timer;
    document.getElementById("userSearch")?.addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        _s.users.search = e.target.value.trim();
        showUsers(1);
      }, 380);
    });
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}
async function showStaffUsers(page) {
  if (!canManageStaff()) {
    _s.users.kind = "regular";
    content('<div class="admin-error">Super admin access is required to manage admin users.</div>');
    return;
  }
  if (page !== void 0) _s.users.page = page;
  const { page: p, search } = _s.users;
  try {
    const data = await api(`/api/admin/staff?${new URLSearchParams({ page: String(p), limit: String(20), search })}`);
    content(`
      <div class="admin-toolbar">
        ${tabs(
      [{ label: "Regular Users", value: "regular" }, { label: "Admin Users", value: "staff" }],
      _s.users.kind,
      "user-kind"
    )}
        <input class="admin-search" id="userSearch" type="search" placeholder="Search admin users\u2026" value="${esc(search)}">
        <button class="admin-btn admin-btn-primary" data-create-staff>+ Create Admin User</button>
        <span style="font-size:12.5px;color:#6b7a8d">${data.total.toLocaleString()} admin user${data.total !== 1 ? "s" : ""}</span>
      </div>
      <div class="admin-card">
        ${table(
      ["Name", "Email", "Role", "Privileges", "Created", "Actions"],
      data.staff.map((staff) => [
        esc(staff.name),
        esc(staff.email),
        roleBadge(staff.role),
        staff.canEdit ? permissionSummary(staff.permissions) : badge("All privileges", "red"),
        fmtDate(staff.createdAt),
        `<div class="admin-actions">
              ${staff.canEdit ? `<button class="admin-btn admin-btn-ghost" data-edit-staff="${esc(staff.id)}">\u270F\uFE0F Edit</button>
                   <button class="admin-btn admin-btn-danger" data-del-staff="${esc(staff.id)}" data-del-name="${esc(staff.name)}">\u{1F5D1}</button>` : '<span class="admin-you">Protected</span>'}
            </div>`
      ])
    )}
        ${pager(data.page, data.pages, "users")}
      </div>
    `);
    let timer;
    document.getElementById("userSearch")?.addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        _s.users.search = e.target.value.trim();
        showUsers(1);
      }, 380);
    });
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}
async function openUserDetail(userId, userName, userEmail, userRole, userJoined, listingCount) {
  let data;
  try {
    data = await api(`/api/admin/users/${encodeURIComponent(userId)}/content`);
  } catch (err) {
    notify(err.message, "error");
    return;
  }
  const role = userRole || "user";
  const listingRows = data.listings.length ? data.listings.map((l) => `<tr>
        <td><span class="admin-link" data-view-listing="${esc(l.id)}">${esc(l.title)}</span></td>
        <td>${badge(l.category, "green")}</td>
        <td>${esc(l.location || "\u2014")}</td>
        <td>${fmtDate(l.createdAt)}</td>
        <td>
          <div class="admin-actions">
            <button class="admin-btn admin-btn-ghost" style="font-size:11px" data-view-listing="${esc(l.id)}">\u{1F441} View</button>
            <button class="admin-btn admin-btn-danger" style="font-size:11px" data-del-listing="${esc(l.id)}">\u{1F5D1}</button>
          </div>
        </td>
      </tr>`).join("") : '<tr><td colspan="5" style="text-align:center;color:#6b7a8d;padding:16px">No listings yet.</td></tr>';
  const discussionRows = data.discussions.length ? data.discussions.map((d) => `<tr>
        <td><span class="admin-link" data-view-discussion="${esc(d.id)}">${esc(d.title)}</span></td>
        <td>${badge(d.category)}</td>
        <td>${d.commentCount}</td>
        <td>${fmtDate(d.createdAt)}</td>
        <td>
          <div class="admin-actions">
            <button class="admin-btn admin-btn-ghost" style="font-size:11px" data-view-discussion="${esc(d.id)}">\u{1F441} View</button>
            <button class="admin-btn admin-btn-danger" style="font-size:11px" data-del-discussion="${esc(d.id)}">\u{1F5D1}</button>
          </div>
        </td>
      </tr>`).join("") : '<tr><td colspan="5" style="text-align:center;color:#6b7a8d;padding:16px">No discussions yet.</td></tr>';
  openModal(`\u{1F464} ${esc(userName)}`, `
    <div class="admin-user-profile-head">
      <div class="admin-user-profile-avatar" style="background:${userColor(userName)}">${esc(userName.charAt(0).toUpperCase())}</div>
      <div style="flex:1;min-width:0">
        <div class="admin-user-profile-name">${esc(userName)}</div>
        <div class="admin-user-profile-email">${esc(userEmail || "\u2014")}</div>
        <div class="admin-user-profile-stats">
          ${roleBadge(role)}
          <span>\u{1F4CB} ${data.listings.length} listing${data.listings.length !== 1 ? "s" : ""}</span>
          <span>\u{1F4AC} ${data.discussions.length} discussion${data.discussions.length !== 1 ? "s" : ""}</span>
          ${userJoined ? `<span>\u{1F5D3} Joined ${fmtDate(userJoined)}</span>` : ""}
        </div>
      </div>
      ${userId !== _me.id ? `
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button class="admin-btn admin-btn-danger" style="font-size:11.5px" data-del-user="${esc(userId)}" data-del-name="${esc(userName)}">\u{1F5D1} Delete User</button>
        </div>` : '<span class="admin-you" style="flex-shrink:0">You</span>'}
    </div>

    <div style="margin-bottom:18px">
      <div class="admin-section-label">Listings (${data.listings.length})</div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Title</th><th>Category</th><th>Location</th><th>Date</th><th></th></tr></thead>
        <tbody>${listingRows}</tbody>
      </table></div>
    </div>
    <div>
      <div class="admin-section-label">Discussions (${data.discussions.length})</div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Title</th><th>Category</th><th>Comments</th><th>Date</th><th></th></tr></thead>
        <tbody>${discussionRows}</tbody>
      </table></div>
    </div>
  `, null);
}
function collectStaffForm(requirePassword) {
  const permissions = Array.from(document.querySelectorAll("[data-staff-permission]:checked")).map((input) => input.value);
  const password = document.getElementById("staffPassword")?.value || "";
  const payload = {
    name: document.getElementById("staffName")?.value.trim(),
    email: document.getElementById("staffEmail")?.value.trim(),
    phone: document.getElementById("staffPhone")?.value.trim(),
    permissions
  };
  if (password || requirePassword) payload.password = password;
  return payload;
}
function staffFormHtml(staff = {}, isCreate = false) {
  return `
    <div class="admin-modal-grid">
      <div class="admin-modal-field">
        <label class="admin-modal-label">Name</label>
        <input class="admin-modal-input" id="staffName" value="${esc(staff.name || "")}" autocomplete="off">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Email</label>
        <input class="admin-modal-input" id="staffEmail" type="email" value="${esc(staff.email || "")}" autocomplete="off">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Phone</label>
        <input class="admin-modal-input" id="staffPhone" value="${esc(staff.phone || "")}" autocomplete="off">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">${isCreate ? "Password" : "New Password"}</label>
        <input class="admin-modal-input" id="staffPassword" type="password" placeholder="${isCreate ? "Minimum 8 characters" : "Leave blank to keep current password"}" autocomplete="new-password">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Privileges</label>
        ${permissionCheckboxes(staff.permissions || [])}
      </div>
    </div>
  `;
}
function openCreateStaffModal() {
  openModal("Create Admin User", staffFormHtml({}, true), async () => {
    await api("/api/admin/staff", {
      method: "POST",
      body: JSON.stringify(collectStaffForm(true))
    });
    showUsers(1);
  });
}
async function openEditStaffModal(id) {
  let data;
  try {
    data = await api(`/api/admin/staff/${encodeURIComponent(id)}`);
  } catch (err) {
    notify(err.message, "error");
    return;
  }
  openModal("Edit Admin User", staffFormHtml(data.staff, false), async () => {
    await api(`/api/admin/staff/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(collectStaffForm(false))
    });
    showUsers(1);
  });
}
const CATEGORIES = [
  "",
  "jobs",
  "housing",
  "pg",
  "services",
  "kinbech",
  "restaurants",
  "shops",
  "childcare",
  "beauty",
  "auto",
  "cleaning",
  "photography",
  "produce",
  "organizations",
  "events",
  "discussions",
  "tech",
  "healthcare",
  "education",
  "student",
  "finance",
  "immigration",
  "other"
];
const DISCUSSION_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "jobs", label: "Jobs" },
  { value: "housing", label: "Housing" },
  { value: "services", label: "Services" },
  { value: "events", label: "Events" },
  { value: "newcomers", label: "Newcomers" },
  { value: "immigration", label: "Immigration" },
  { value: "education", label: "Education" },
  { value: "business", label: "Business" },
  { value: "community", label: "Community" }
];
function discussionCategoryOptions(selected = "general") {
  const selectedValue = selected || "general";
  const known = DISCUSSION_CATEGORIES.some((category) => category.value === selectedValue);
  return `${DISCUSSION_CATEGORIES.map(
    (category) => `<option value="${esc(category.value)}"${category.value === selectedValue ? " selected" : ""}>${esc(category.label)}</option>`
  ).join("")}${known ? "" : `<option value="${esc(selectedValue)}" selected>${esc(capitalize(selectedValue))}</option>`}`;
}
async function showListings(page) {
  if (page !== void 0) _s.listings.page = page;
  const { page: p, category, search } = _s.listings;
  try {
    const data = await api(`/api/admin/listings?${new URLSearchParams({ page: String(p), limit: String(20), category, search })}`);
    content(`
      <div class="admin-toolbar">
        <input class="admin-search" id="listingSearch" type="search" placeholder="Search listings\u2026" value="${esc(search)}">
        <select class="admin-select" id="listingCat">
          ${CATEGORIES.map((c) => `<option value="${esc(c)}"${c === category ? " selected" : ""}>${c ? capitalize(c) : "All categories"}</option>`).join("")}
        </select>
        <span style="font-size:12.5px;color:#6b7a8d">${data.total.toLocaleString()} listing${data.total !== 1 ? "s" : ""}</span>
      </div>
      <div class="admin-card">
        ${table(
      ["Title", "Category", "Location", "Posted", "Actions"],
      data.listings.map((l) => [
        `<span class="admin-link" data-view-listing="${esc(l.id)}">${esc(l.title)}</span>`,
        badge(l.category),
        esc(l.location || "\u2014"),
        fmtDate(l.createdAt),
        `<div class="admin-actions">
               <button class="admin-btn admin-btn-ghost" data-view-listing="${esc(l.id)}">\u{1F441} View</button>
               <button class="admin-btn admin-btn-ghost" data-edit-listing="${esc(l.id)}">\u270F\uFE0F Edit</button>
               <button class="admin-btn admin-btn-danger" data-del-listing="${esc(l.id)}">\u{1F5D1}</button>
             </div>`
      ])
    )}
        ${pager(data.page, data.pages, "listings")}
      </div>
    `);
    let timer;
    document.getElementById("listingSearch")?.addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        _s.listings.search = e.target.value.trim();
        showListings(1);
      }, 380);
    });
    document.getElementById("listingCat")?.addEventListener("change", (e) => {
      _s.listings.category = e.target.value;
      showListings(1);
    });
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}
async function showEvents(page) {
  if (page !== void 0) _s.events.page = page;
  const { page: p, search } = _s.events;
  try {
    const data = await api(`/api/admin/listings?${new URLSearchParams({ page: String(p), limit: String(20), category: "events", search })}`);
    content(`
      <div class="admin-toolbar">
        <input class="admin-search" id="eventSearch" type="search" placeholder="Search events\u2026" value="${esc(search)}">
        <span style="font-size:12.5px;color:#6b7a8d">${data.total.toLocaleString()} event${data.total !== 1 ? "s" : ""}</span>
        <button class="admin-btn" style="margin-left:auto;background:#C0392B;color:#fff;border-color:#C0392B" data-create-event>\uFF0B Add Event</button>
      </div>
      <div class="admin-card">
        ${table(
      ["Title", "Date / Time", "Location", "Posted", "Actions"],
      data.listings.map((l) => [
        `<span class="admin-link" data-view-listing="${esc(l.id)}">${esc(l.title)}</span>`,
        esc(l.availability || "\u2014"),
        esc(l.location || "\u2014"),
        fmtDate(l.createdAt),
        `<div class="admin-actions">
               <button class="admin-btn admin-btn-ghost" data-view-listing="${esc(l.id)}">\u{1F441} View</button>
               <button class="admin-btn admin-btn-ghost" data-edit-event="${esc(l.id)}">\u270F\uFE0F Edit</button>
               <button class="admin-btn admin-btn-danger" data-del-event="${esc(l.id)}" data-del-title="${esc(l.title)}">\u{1F5D1}</button>
             </div>`
      ])
    )}
        ${pager(data.page, data.pages, "events")}
      </div>
    `);
    let timer;
    document.getElementById("eventSearch")?.addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        _s.events.search = e.target.value.trim();
        showEvents(1);
      }, 380);
    });
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}
function eventFormHtml(ev = {}) {
  return `
    <div class="admin-modal-grid">
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Event title</label>
        <input class="admin-modal-input" id="evTitle" maxlength="200" value="${esc(ev.title || "")}" placeholder="e.g. Nepali New Year Celebration 2082">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Description</label>
        <textarea class="admin-modal-textarea" id="evDesc" rows="5" placeholder="Event details, agenda, speakers\u2026">${esc(ev.description || "")}</textarea>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Date &amp; Time</label>
        <input class="admin-modal-input" id="evDate" value="${esc(ev.availability || "")}" placeholder="e.g. April 14, 2025 \xB7 5:00 PM">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Location / Venue</label>
        <input class="admin-modal-input" id="evLocation" value="${esc(ev.location || "")}" placeholder="e.g. Boston City Hall, MA">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Price / Admission</label>
        <input class="admin-modal-input" id="evPrice" value="${esc(ev.price || "")}" placeholder="Free, $10, Members only\u2026">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Contact Phone</label>
        <input class="admin-modal-input" id="evPhone" value="${esc(ev.contactPhone || "")}" placeholder="+1-555-\u2026">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Contact Email</label>
        <input class="admin-modal-input" id="evEmail" value="${esc(ev.contactEmail || "")}" placeholder="events@example.com">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">RSVP / Tickets link</label>
        <input class="admin-modal-input" id="evLink" value="${esc(ev.externalLink || "")}" placeholder="https://\u2026">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Tags (comma-separated)</label>
        <input class="admin-modal-input" id="evTags" value="${esc((ev.tags || []).join(", "))}" placeholder="puja, concert, fundraiser, networking">
      </div>
    </div>
  `;
}
function collectEventPayload() {
  return {
    category: "events",
    title: document.getElementById("evTitle").value.trim(),
    description: document.getElementById("evDesc").value.trim(),
    availability: document.getElementById("evDate").value.trim(),
    location: document.getElementById("evLocation").value.trim(),
    price: document.getElementById("evPrice").value.trim(),
    contactPhone: document.getElementById("evPhone").value.trim(),
    contactEmail: document.getElementById("evEmail").value.trim(),
    externalLink: document.getElementById("evLink").value.trim(),
    tags: document.getElementById("evTags").value.split(",").map((t) => t.trim()).filter(Boolean)
  };
}
function openCreateEvent() {
  openModal("Add Event", eventFormHtml(), async () => {
    const payload = collectEventPayload();
    if (!payload.title) {
      notify("Event title is required.", "error");
      throw new Error("validation");
    }
    await api("/api/listings", { method: "POST", body: JSON.stringify(payload) });
    showEvents(1);
    notify("Event created.", "success");
  });
}
async function openEditEvent(id) {
  let ev;
  try {
    ev = await api(`/api/admin/listings/${encodeURIComponent(id)}`);
  } catch (err) {
    notify(err.message, "error");
    return;
  }
  openModal("Edit Event", `<div class="admin-modal-meta">Posted ${fmtDate(ev.createdAt)}</div>${eventFormHtml(ev)}`, async () => {
    const payload = collectEventPayload();
    if (!payload.title) {
      notify("Event title is required.", "error");
      throw new Error("validation");
    }
    await api(`/api/admin/listings/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });
    showEvents(1);
    notify("Event updated.", "success");
  });
}
const NEWS_CATEGORIES = ["", "community", "nepal", "usa", "business", "immigration", "culture", "opinion", "sports", "technology", "world"];
function newsCategoryLabel(value) {
  return value === "usa" ? "USA" : capitalize(value || "community");
}
function newsStatusBadge(status) {
  return badge(status === "published" ? "Published" : "Draft", status === "published" ? "green" : "gray");
}
function formatNewsInline(value) {
  return esc(value || "").replace(/\n/g, "<br>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\[font=(serif|sans|mono)\]([\s\S]*?)\[\/font\]/g, '<span class="news-font-$1">$2</span>');
}
function renderNewsMediaBlock(media = {}) {
  if (!media.url) return "";
  const caption = media.caption ? `<figcaption>${esc(media.caption)}</figcaption>` : "";
  const mediaHtml = media.type === "video" ? `<video controls preload="metadata" src="${esc(media.url)}"></video>` : `<img src="${esc(media.url)}" alt="">`;
  return `<figure class="admin-news-media">${mediaHtml}${caption}</figure>`;
}
function isNewsHtmlBody(value = "") {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}
function renderHtmlNewsBody(value = "", mediaItems = []) {
  const mediaMap = Object.fromEntries((mediaItems || []).map((item) => [item.id, item]));
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(value || "");
  wrapper.querySelectorAll("p").forEach((paragraph) => {
    const mediaMatch = /^\[\[media:([a-zA-Z0-9_-]+)\]\]$/.exec(paragraph.textContent?.trim() || "");
    if (!mediaMatch) return;
    const mediaHtml = renderNewsMediaBlock(mediaMap[mediaMatch[1]]);
    if (!mediaHtml) {
      paragraph.remove();
      return;
    }
    const template = document.createElement("template");
    template.innerHTML = mediaHtml;
    paragraph.replaceWith(template.content.cloneNode(true));
  });
  return wrapper.innerHTML;
}
function formatNewsBody(value, mediaItems = []) {
  if (isNewsHtmlBody(value)) return renderHtmlNewsBody(value, mediaItems);
  const mediaMap = Object.fromEntries((mediaItems || []).map((item) => [item.id, item]));
  const lines = String(value || "").split(/\r?\n/);
  const html = [];
  let paragraph = [];
  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${formatNewsInline(paragraph.join("\n"))}</p>`);
    paragraph = [];
  }
  lines.forEach((line) => {
    const trimmed = line.trim();
    const mediaMatch = /^\[\[media:([a-zA-Z0-9_-]+)\]\]$/.exec(trimmed);
    if (mediaMatch) {
      flushParagraph();
      html.push(renderNewsMediaBlock(mediaMap[mediaMatch[1]]));
      return;
    }
    if (!trimmed) {
      flushParagraph();
      return;
    }
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      html.push(`<h3>${formatNewsInline(trimmed.slice(3))}</h3>`);
      return;
    }
    if (trimmed.startsWith("> ")) {
      flushParagraph();
      html.push(`<blockquote>${formatNewsInline(trimmed.slice(2))}</blockquote>`);
      return;
    }
    paragraph.push(line);
  });
  flushParagraph();
  return html.join("");
}
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read selected file."));
    reader.readAsDataURL(file);
  });
}
function newsMediaTypeFromFile(file) {
  return file?.type?.startsWith("video/") ? "video" : "image";
}
function newsMediaLibraryHtml() {
  if (!_newsMediaDraft.length) {
    return '<div class="admin-empty admin-empty-compact">No story media yet. Upload images or videos, then insert them into the article body.</div>';
  }
  return `<div class="admin-news-media-list">
    ${_newsMediaDraft.map((item) => `
      <div class="admin-news-media-item">
        <div class="admin-news-media-thumb">
          ${item.type === "video" ? `<video src="${esc(item.url)}" muted></video><span>Video</span>` : `<img src="${esc(item.url)}" alt=""><span>Image</span>`}
        </div>
        <div class="admin-news-media-meta">
          <input class="admin-modal-input" data-news-media-caption="${esc(item.id)}" value="${esc(item.caption || "")}" placeholder="Caption">
          <code>[[media:${esc(item.id)}]]</code>
        </div>
        <div class="admin-news-media-actions">
          <button class="admin-btn admin-btn-ghost" type="button" data-insert-news-media="${esc(item.id)}">Insert</button>
          <button class="admin-btn admin-btn-danger" type="button" data-remove-news-media="${esc(item.id)}">Remove</button>
        </div>
      </div>
    `).join("")}
  </div>`;
}
function renderNewsMediaLibrary() {
  const target = document.getElementById("newsMediaLibrary");
  if (target) target.innerHTML = newsMediaLibraryHtml();
}
function insertIntoNewsBody(openText, closeText = "") {
  const textarea = document.getElementById("newsBody");
  if (!textarea) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const selected = textarea.value.slice(start, end);
  textarea.value = `${textarea.value.slice(0, start)}${openText}${selected || ""}${closeText}${textarea.value.slice(end)}`;
  const caret = selected ? start + openText.length + selected.length + closeText.length : start + openText.length;
  textarea.focus();
  textarea.setSelectionRange(caret, caret);
}
async function collectNewsPayload() {
  window.BiscoonNewsEditor?.sync?.();
  const imageFile = document.getElementById("newsImageFile")?.files?.[0];
  let imageUrl = document.getElementById("newsImageUrl")?.value.trim() || "";
  if (imageFile) imageUrl = await readFileAsDataUrl(imageFile);
  return {
    title: document.getElementById("newsTitle")?.value.trim(),
    category: document.getElementById("newsCategory")?.value,
    summary: document.getElementById("newsSummary")?.value.trim(),
    body: document.getElementById("newsBody")?.value.trim(),
    imageUrl,
    sourceName: document.getElementById("newsSource")?.value.trim(),
    authorName: document.getElementById("newsAuthor")?.value.trim(),
    status: document.getElementById("newsStatus")?.value,
    featured: Boolean(document.getElementById("newsFeatured")?.checked),
    media: _newsMediaDraft.map((item) => ({
      id: item.id,
      type: item.type,
      url: item.url,
      caption: item.caption || "",
      createdAt: item.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    }))
  };
}
function newsFormHtml(article = {}) {
  return `
    <div class="admin-modal-grid">
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Headline</label>
        <input class="admin-modal-input" id="newsTitle" maxlength="180" value="${esc(article.title || "")}">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Summary / Standfirst</label>
        <textarea class="admin-modal-textarea" id="newsSummary" rows="3" maxlength="360">${esc(article.summary || "")}</textarea>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Category</label>
        <select class="admin-modal-select" id="newsCategory">
          ${NEWS_CATEGORIES.filter(Boolean).map((category) => `<option value="${category}"${category === (article.category || "community") ? " selected" : ""}>${newsCategoryLabel(category)}</option>`).join("")}
        </select>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Status</label>
        <select class="admin-modal-select" id="newsStatus">
          ${["draft", "published"].map((status) => `<option value="${status}"${status === (article.status || "draft") ? " selected" : ""}>${capitalize(status)}</option>`).join("")}
        </select>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Source</label>
        <input class="admin-modal-input" id="newsSource" value="${esc(article.sourceName || "Biscoon Newsroom")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Author</label>
        <input class="admin-modal-input" id="newsAuthor" value="${esc(article.authorName || "")}" placeholder="Optional">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Image URL</label>
        <input class="admin-modal-input" id="newsImageUrl" value="${esc(article.imageUrl || "")}" placeholder="https://... or leave blank">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Upload Image</label>
        <input class="admin-modal-input" id="newsImageFile" type="file" accept="image/*">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Story Media</label>
        <input class="admin-modal-input" id="newsMediaFiles" type="file" accept="image/*,video/*" multiple>
        <div class="admin-news-help">Upload multiple images or videos. Use Insert to place media at the cursor in the article body.</div>
        <div id="newsMediaLibrary">${newsMediaLibraryHtml()}</div>
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-check-row admin-check-row-compact">
          <input type="checkbox" id="newsFeatured"${article.featured ? " checked" : ""}>
          <span><strong>Feature this story</strong><small>Featured stories appear first on the public news page.</small></span>
        </label>
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Article Body</label>
        <div class="admin-news-formatbar">
          <button type="button" class="admin-btn admin-btn-ghost" data-news-format="bold">Bold</button>
          <button type="button" class="admin-btn admin-btn-ghost" data-news-format="h2">Heading</button>
          <button type="button" class="admin-btn admin-btn-ghost" data-news-format="quote">Quote</button>
          <button type="button" class="admin-btn admin-btn-ghost" data-news-format="font-serif">Serif</button>
          <button type="button" class="admin-btn admin-btn-ghost" data-news-format="font-sans">Sans</button>
          <button type="button" class="admin-btn admin-btn-ghost" data-news-format="font-mono">Mono</button>
        </div>
        <div class="admin-news-rich-editor" id="newsRichEditor"></div>
        <textarea class="admin-modal-textarea admin-news-hidden-body" id="newsBody" rows="12">${esc(article.body || "")}</textarea>
      </div>
    </div>
  `;
}
async function showNews(page) {
  if (page !== void 0) _s.news.page = page;
  const { page: p, status, category, search } = _s.news;
  try {
    const data = await api(`/api/admin/news?${new URLSearchParams({ page: String(p), limit: String(20), status, category, search })}`);
    content(`
      <div class="admin-toolbar">
        <input class="admin-search" id="newsSearch" type="search" placeholder="Search news\u2026" value="${esc(search)}">
        <select class="admin-select" id="newsStatusFilter">
          ${["all", "published", "draft"].map((value) => `<option value="${value}"${value === status ? " selected" : ""}>${value === "all" ? "All status" : capitalize(value)}</option>`).join("")}
        </select>
        <select class="admin-select" id="newsCategoryFilter">
          ${NEWS_CATEGORIES.map((value) => `<option value="${esc(value)}"${value === category ? " selected" : ""}>${value ? newsCategoryLabel(value) : "All categories"}</option>`).join("")}
        </select>
        <button class="admin-btn admin-btn-primary" data-create-news>+ Publish News</button>
        <span style="font-size:12.5px;color:#6b7a8d">${data.total.toLocaleString()} stor${data.total === 1 ? "y" : "ies"}</span>
      </div>
      <div class="admin-card">
        ${table(
      ["Headline", "Category", "Status", "Featured", "Published", "Actions"],
      data.news.map((article) => [
        `<span class="admin-link" data-view-news="${esc(article.id)}">${esc(article.title)}</span>`,
        badge(newsCategoryLabel(article.category), "blue"),
        newsStatusBadge(article.status),
        article.featured ? badge("Featured", "red") : '<span class="admin-muted">No</span>',
        article.publishedAt ? fmtDate(article.publishedAt) : "\u2014",
        `<div class="admin-actions">
              <button class="admin-btn admin-btn-ghost" data-view-news="${esc(article.id)}">\u{1F441} View</button>
              <button class="admin-btn admin-btn-ghost" data-edit-news="${esc(article.id)}">\u270F\uFE0F Edit</button>
              <button class="admin-btn admin-btn-danger" data-del-news="${esc(article.id)}" data-del-title="${esc(article.title)}">\u{1F5D1}</button>
            </div>`
      ])
    )}
        ${pager(data.page, data.pages, "news")}
      </div>
    `);
    let timer;
    document.getElementById("newsSearch")?.addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        _s.news.search = e.target.value.trim();
        showNews(1);
      }, 350);
    });
    document.getElementById("newsStatusFilter")?.addEventListener("change", (e) => {
      _s.news.status = e.target.value;
      showNews(1);
    });
    document.getElementById("newsCategoryFilter")?.addEventListener("change", (e) => {
      _s.news.category = e.target.value;
      showNews(1);
    });
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}
async function openViewNews(id) {
  let data;
  try {
    data = await api(`/api/admin/news/${encodeURIComponent(id)}`);
  } catch (err) {
    notify(err.message, "error");
    return;
  }
  const article = data.article;
  openModal(esc(article.title), `
    <div class="admin-modal-meta" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      ${badge(newsCategoryLabel(article.category), "blue")}
      ${newsStatusBadge(article.status)}
      ${article.featured ? badge("Featured", "red") : ""}
      <span>${esc(article.sourceName || "Biscoon Newsroom")}</span>
      ${article.authorName ? `<span>By ${esc(article.authorName)}</span>` : ""}
      <span style="margin-left:auto;font-size:12px">${article.publishedAt ? `Published ${fmtDate(article.publishedAt)}` : `Updated ${fmtDate(article.updatedAt)}`}</span>
    </div>
    ${article.imageUrl ? `<img src="${esc(article.imageUrl)}" alt="" class="admin-news-preview">` : ""}
    <div class="admin-view-desc" style="margin-top:12px">${esc(article.summary)}</div>
    <div class="admin-news-body">${formatNewsBody(article.body, article.media || [])}</div>
    <div class="admin-view-actions">
      <button class="admin-btn" style="background:#C0392B;color:#fff;border-color:#C0392B" data-edit-news="${esc(article.id)}">\u270F\uFE0F Edit News</button>
      <button class="admin-btn admin-btn-danger" data-del-news="${esc(article.id)}" data-del-title="${esc(article.title)}">\u{1F5D1} Delete</button>
    </div>
  `, null);
}
async function openNewsEditor(id = "") {
  let article = {};
  if (id) {
    try {
      const data = await api(`/api/admin/news/${encodeURIComponent(id)}`);
      article = data.article;
    } catch (err) {
      notify(err.message, "error");
      return;
    }
  }
  _newsMediaDraft = (article.media || []).map((item) => ({ ...item }));
  openModal(id ? "Edit News Story" : "Create News Story", newsFormHtml(article), async () => {
    await api(id ? `/api/admin/news/${encodeURIComponent(id)}` : "/api/admin/news", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(await collectNewsPayload())
    });
    showNews(1);
  });
  requestAnimationFrame(() => {
    window.BiscoonNewsEditor?.mount?.({
      element: "#newsRichEditor",
      textarea: "#newsBody",
      media: () => _newsMediaDraft
    });
  });
}
async function showDiscussions(page) {
  if (page !== void 0) _s.discussions.page = page;
  const { page: p } = _s.discussions;
  try {
    const data = await api(`/api/admin/discussions?page=${p}&limit=20`);
    content(`
      <div class="admin-toolbar">
        <button class="admin-btn admin-btn-primary" data-create-discussion>+ Add Discussion</button>
        <span style="font-size:12.5px;color:#6b7a8d">${data.total.toLocaleString()} discussion${data.total !== 1 ? "s" : ""}</span>
      </div>
      <div class="admin-card">
        ${table(
      ["Title", "Author", "Category", "Comments", "Date", "Actions"],
      data.discussions.map((d) => [
        `<span class="admin-link" data-view-discussion="${esc(d.id)}">${esc(d.title)}</span>`,
        esc(d.authorName),
        badge(d.category),
        d.commentCount,
        fmtDate(d.createdAt),
        `<div class="admin-actions">
               <button class="admin-btn admin-btn-ghost" data-view-discussion="${esc(d.id)}">\u{1F441} View</button>
               <button class="admin-btn admin-btn-ghost" data-edit-discussion="${esc(d.id)}">\u270F\uFE0F Edit</button>
               <button class="admin-btn admin-btn-danger" data-del-discussion="${esc(d.id)}">\u{1F5D1}</button>
             </div>`
      ])
    )}
        ${pager(data.page, data.pages, "discussions")}
      </div>
    `);
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}
async function showComments(page) {
  if (page !== void 0) _s.comments.page = page;
  const { page: p, type } = _s.comments;
  try {
    const data = await api(`/api/admin/comments?${new URLSearchParams({ page: String(p), limit: String(25), type })}`);
    content(`
      <div class="admin-toolbar">
        ${tabs(
      [{ label: "All", value: "all" }, { label: "Listing Comments", value: "listing" }, { label: "Discussion Comments", value: "discussion" }],
      type,
      "comment-type"
    )}
        <span style="font-size:12.5px;color:#6b7a8d">${data.total.toLocaleString()} comment${data.total !== 1 ? "s" : ""}</span>
      </div>
      <div class="admin-card">
        ${table(
      ["Comment", "Author", "On", "Type", "Date", "Action"],
      data.comments.map((c) => [
        `<span style="max-width:280px;display:block;white-space:normal;line-height:1.4">${esc(c.body)}</span>`,
        esc(c.authorName),
        esc(c.parentTitle),
        badge(c.parentType, c.parentType === "listing" ? "green" : "blue"),
        fmtDate(c.createdAt),
        `<button class="admin-btn admin-btn-danger" data-del-comment data-comment-id="${esc(c.id)}" data-parent-id="${esc(c.parentId)}" data-parent-type="${esc(c.parentType)}">\u{1F5D1} Remove</button>`
      ])
    )}
        ${pager(data.page, data.pages, "comments")}
      </div>
    `);
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}
async function showReports(page) {
  if (page !== void 0) _s.reports.page = page;
  const { page: p, status } = _s.reports;
  try {
    const data = await api(`/api/admin/reports?${new URLSearchParams({ page: String(p), limit: String(25), status })}`);
    content(`
      <div class="admin-toolbar">
        ${tabs(
      [
        { label: "Open", value: "open" },
        { label: "Reviewing", value: "reviewing" },
        { label: "Resolved", value: "resolved" },
        { label: "Dismissed", value: "dismissed" },
        { label: "All", value: "all" }
      ],
      status,
      "report-status"
    )}
        <span style="font-size:12.5px;color:#6b7a8d">${data.total.toLocaleString()} report${data.total !== 1 ? "s" : ""}</span>
      </div>
      <div class="admin-card">
        ${table(
      ["Target", "Reason", "Reporter", "Details", "Status", "Date", "Action"],
      data.reports.map((r) => [
        `<strong>${esc(r.targetType)}</strong><br><span style="font-size:12px;color:#6b7a8d">${esc(r.targetId)}</span>`,
        badge(r.reason, r.reason === "scam" || r.reason === "illegal" ? "red" : "blue"),
        esc(r.reporterName || r.reporterId),
        `<span style="max-width:260px;display:block;white-space:normal;line-height:1.4">${esc(r.details || "\u2014")}</span>`,
        badge(r.status, r.status === "open" ? "red" : r.status === "resolved" ? "green" : "gray"),
        fmtDate(r.createdAt),
        `<select class="admin-select-sm" data-report-status-update="${esc(r.id)}" aria-label="Report status">
              ${["open", "reviewing", "resolved", "dismissed"].map((value) => `<option value="${value}"${value === r.status ? " selected" : ""}>${capitalize(value)}</option>`).join("")}
            </select>`
      ])
    )}
        ${pager(data.page, data.pages, "reports")}
      </div>
    `);
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}
const AUDIT_ACTIONS = [
  "all",
  "admin_user.created",
  "admin_user.updated",
  "admin_user.deleted",
  "regular_user.deleted",
  "news.created",
  "news.updated",
  "news.deleted",
  "listing.updated",
  "listing.deleted",
  "discussion.created",
  "discussion.updated",
  "discussion.deleted",
  "report.status_updated",
  "listing_comment.deleted",
  "discussion_comment.deleted",
  "announcement.created",
  "announcement.toggled",
  "announcement.deleted"
];
const AUDIT_TARGET_TYPES = [
  "all",
  "staff",
  "user",
  "news",
  "listing",
  "discussion",
  "report",
  "listing_comment",
  "discussion_comment",
  "announcement"
];
function auditLabel(value) {
  return readableLabel(value).replace(/\bId\b/g, "ID");
}
function auditActionBadge(action) {
  const color = action.includes("deleted") ? "red" : action.includes("created") ? "green" : action.includes("updated") || action.includes("toggled") ? "blue" : "gray";
  return badge(auditLabel(action), color);
}
async function showAuditLogs(page) {
  if (!canManageStaff()) {
    content('<div class="admin-error">Super admin access is required to view audit logs.</div>');
    return;
  }
  if (page !== void 0) _s.audit.page = page;
  const { page: p, action, targetType, search } = _s.audit;
  try {
    const data = await api(`/api/admin/audit-logs?${new URLSearchParams({
      page: String(p),
      limit: "25",
      action,
      targetType,
      search
    })}`);
    content(`
      <div class="admin-toolbar">
        <input class="admin-search" id="auditSearch" type="search" placeholder="Search actor, target, or action\u2026" value="${esc(search)}">
        <select class="admin-select" id="auditActionFilter">
          ${AUDIT_ACTIONS.map((value) => `<option value="${esc(value)}"${value === action ? " selected" : ""}>${value === "all" ? "All actions" : auditLabel(value)}</option>`).join("")}
        </select>
        <select class="admin-select" id="auditTargetFilter">
          ${AUDIT_TARGET_TYPES.map((value) => `<option value="${esc(value)}"${value === targetType ? " selected" : ""}>${value === "all" ? "All targets" : auditLabel(value)}</option>`).join("")}
        </select>
        <span style="font-size:12.5px;color:#6b7a8d">${data.total.toLocaleString()} audit event${data.total !== 1 ? "s" : ""}</span>
      </div>
      <div class="admin-card">
        ${table(
      ["Action", "Actor", "Target", "When", "Context"],
      data.auditLogs.map((log) => [
        auditActionBadge(log.action || "action"),
        `<strong>${esc(log.actorName || "Admin")}</strong><br><span class="admin-muted">${esc(log.actorEmail || log.actorId || "")}</span>`,
        `<strong>${esc(log.targetTitle || auditLabel(log.targetType || "target"))}</strong><br><span class="admin-muted">${esc(log.targetType || "")}${log.targetId ? ` \xB7 ${esc(log.targetId)}` : ""}</span>`,
        `${fmtTime(log.createdAt)}<br><span class="admin-muted">${fmtDate(log.createdAt)}</span>`,
        `<span style="max-width:260px;display:block;white-space:normal;line-height:1.4">${esc(formatAuditMetadata(log.metadata))}</span>`
      ])
    )}
        ${pager(data.page, data.pages, "audit")}
      </div>
    `);
    let timer;
    document.getElementById("auditSearch")?.addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        _s.audit.search = e.target.value.trim();
        showAuditLogs(1);
      }, 350);
    });
    document.getElementById("auditActionFilter")?.addEventListener("change", (e) => {
      _s.audit.action = e.target.value;
      showAuditLogs(1);
    });
    document.getElementById("auditTargetFilter")?.addEventListener("change", (e) => {
      _s.audit.targetType = e.target.value;
      showAuditLogs(1);
    });
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}
function formatAuditMetadata(metadata = {}) {
  const entries = Object.entries(metadata || {}).filter(([, value]) => value !== void 0 && value !== null && value !== "");
  if (!entries.length) return "\u2014";
  return entries.map(([key, value]) => `${auditLabel(key)}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" \xB7 ");
}
async function showTrash() {
  try {
    const data = await api("/api/admin/trash");
    const section = (label, icon, items, renderRow) => {
      if (!items.length) return "";
      return `
        <div class="admin-card" style="margin-bottom:24px">
          <div style="font-weight:700;font-size:14px;color:var(--navy);margin-bottom:14px;display:flex;align-items:center;gap:8px">
            <span>${icon}</span><span>${label}</span>
            <span style="font-size:11px;font-weight:400;color:#888;margin-left:auto">${items.length} item${items.length !== 1 ? "s" : ""}</span>
          </div>
          ${table(
        ["Title / Name", "Info", "Deleted", "Restore"],
        items.map(renderRow)
      )}
        </div>`;
    };
    const restoreBtn = (type, id) => `<button class="admin-btn admin-btn-ghost" style="font-size:11px" data-restore-type="${esc(type)}" data-restore-id="${esc(id)}">\u21A9 Restore</button>`;
    content(`
      <div style="max-width:900px">
        <div style="background:#fff8f0;border:1.5px solid #f5c97a;border-radius:10px;padding:14px 18px;margin-bottom:24px;font-size:13px;color:#7a5000;line-height:1.5">
          \u{1F310} <strong>The internet is forever.</strong> Deleted content is never truly gone \u2014 it's preserved here and invisible to regular users. Only super-admins can restore items.
        </div>
        ${section("Listings", "\u{1F4CB}", data.listings, (l) => [
      esc(l.title || "(untitled)"),
      badge(l.category || "", "gray"),
      fmtDate(l.deletedAt),
      restoreBtn("listing", l.id)
    ])}
        ${section("Discussions", "\u{1F4AC}", data.discussions, (d) => [
      esc(d.title || "(untitled)"),
      esc(d.authorName || ""),
      fmtDate(d.deletedAt),
      restoreBtn("discussion", d.id)
    ])}
        ${section("News", "\u{1F4F0}", data.news, (n) => [
      esc(n.title || "(untitled)"),
      badge(n.status || "draft", n.status === "published" ? "green" : "gray"),
      fmtDate(n.deletedAt),
      restoreBtn("news", n.id)
    ])}
        ${section("Announcements", "\u{1F4E2}", data.announcements, (a) => [
      esc(a.title || "(untitled)"),
      "",
      fmtDate(a.deletedAt),
      restoreBtn("announcement", a.id)
    ])}
        ${section("Spotlights", "\u{1F3AC}", data.spotlights, (s) => [
      esc(s.title || "(untitled)"),
      badge(s.type || "ad", "blue"),
      fmtDate(s.deletedAt),
      restoreBtn("spotlight", s.id)
    ])}
        ${section("Users", "\u{1F464}", data.users, (u) => [
      `${esc(u.name)} <span style="color:#888;font-size:11px">${esc(u.email)}</span>`,
      badge(u.role || "user", "gray"),
      fmtDate(u.deletedAt),
      restoreBtn("user", u.id)
    ])}
        ${!data.listings.length && !data.discussions.length && !data.news.length && !data.announcements.length && !data.spotlights.length && !data.users.length ? '<div class="admin-empty">Trash is empty \u2014 nothing has been soft-deleted yet.</div>' : ""}
      </div>
    `);
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}
async function showSpotlights() {
  try {
    let showSpotImgPreview2 = function(src) {
      const wrap = document.getElementById("spotImgPreviewWrap");
      const img = document.getElementById("spotImgPreview");
      if (!wrap || !img) return;
      if (src) {
        img.src = src;
        wrap.style.display = "block";
      } else {
        wrap.style.display = "none";
        img.src = "";
      }
    };
    var showSpotImgPreview = showSpotImgPreview2;
    const data = await api("/api/admin/spotlights");
    const typeColors = { ad: "blue", event: "green", news: "gray", promo: "red" };
    content(`
      <div class="admin-ann-form">
        <div class="admin-ann-form-title">\u{1F3AC} Create New Spotlight</div>
        <div id="spotFormError" style="display:none;background:#fce8e8;border:1.5px solid #f8c3c3;border-radius:8px;padding:10px 14px;font-size:13px;color:#C0392B;margin-bottom:12px"></div>
        <div class="admin-ann-grid">
          <div class="admin-ann-field admin-ann-full">
            <label class="admin-ann-label">Title <span style="color:#C0392B">*</span></label>
            <input class="admin-ann-input" id="spotTitle" placeholder="e.g. Dashain Mela 2025 \u2014 Register Now">
          </div>
          <div class="admin-ann-field admin-ann-full">
            <label class="admin-ann-label">Subtitle</label>
            <input class="admin-ann-input" id="spotSubtitle" placeholder="Short supporting line under the title">
          </div>
          <div class="admin-ann-field admin-ann-full">
            <label class="admin-ann-label">Description</label>
            <textarea class="admin-ann-textarea" id="spotBody" placeholder="Optional body text shown below the subtitle\u2026" rows="2"></textarea>
          </div>
          <div class="admin-ann-field admin-ann-full">
            <label class="admin-ann-label">Banner image <span style="color:#C0392B">*</span> <span style="font-weight:400;color:#888">(upload from PC or paste a URL \xB7 1920\xD71080 ideal, max 5MB)</span></label>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;background:white;transition:border-color .15s;white-space:nowrap" id="spotFileLbl">
                \u{1F4C1} Browse\u2026
                <input type="file" id="spotImageFile" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none">
              </label>
              <input class="admin-ann-input" id="spotImageUrl" type="url" placeholder="\u2026or paste https:// URL" style="flex:1;min-width:160px">
            </div>
            <div id="spotImgPreviewWrap" style="margin-top:8px;display:none">
              <img id="spotImgPreview" src="" alt="Preview" style="max-width:100%;max-height:160px;border-radius:6px;border:1.5px solid var(--border);object-fit:cover">
            </div>
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label">Badge text</label>
            <input class="admin-ann-input" id="spotBadgeText" placeholder="e.g. EVENT \xB7 FREE ENTRY">
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label">Badge color</label>
            <input class="admin-ann-input" id="spotBadgeColor" type="color" value="#C0392B" style="height:38px;padding:2px 6px">
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label">CTA button text</label>
            <input class="admin-ann-input" id="spotCtaText" placeholder="e.g. Register Now">
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label">CTA button URL</label>
            <input class="admin-ann-input" id="spotCtaUrl" type="url" placeholder="https://\u2026">
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label">Type</label>
            <select class="admin-ann-select" id="spotType">
              <option value="ad">\u{1F4E3} Ad</option>
              <option value="event">\u{1F389} Event</option>
              <option value="news">\u{1F4F0} News</option>
              <option value="promo">\u{1F525} Promo</option>
            </select>
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label">Display order</label>
            <input class="admin-ann-input" id="spotOrder" type="number" value="0" min="0" placeholder="0 = first">
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label">Show from (optional)</label>
            <input class="admin-ann-input" id="spotStart" type="datetime-local">
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label">Show until (optional)</label>
            <input class="admin-ann-input" id="spotEnd" type="datetime-local">
          </div>
        </div>
        <div class="admin-ann-actions">
          <button class="admin-btn" id="spotSubmit" style="background:#C0392B;color:#fff;border-color:#C0392B;padding:9px 22px;font-size:13px">Publish Spotlight</button>
        </div>
      </div>

      <div class="admin-ann-list" id="spotList">
        ${data.spotlights.length ? data.spotlights.map((s) => `
          <div class="admin-ann-card" style="align-items:flex-start">
            <div class="admin-ann-stripe admin-ann-stripe-${s.type === "event" ? "success" : s.type === "promo" ? "warning" : "info"}"></div>
            ${s.imageUrl ? `<img src="${esc(s.imageUrl)}" alt="" style="width:96px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;margin-right:2px;margin-top:2px">` : ""}
            <div class="admin-ann-content" style="flex:1;min-width:0">
              <div class="admin-ann-card-title">${esc(s.title)}</div>
              ${s.subtitle ? `<div style="font-size:12px;color:#555;margin-bottom:4px">${esc(s.subtitle)}</div>` : ""}
              <div class="admin-ann-card-meta">
                ${badge(s.active ? "Live" : "Inactive", s.active ? "green" : "gray")}
                ${badge(s.type || "ad", typeColors[s.type] || "gray")}
                ${s.badgeText ? badge(s.badgeText, "blue") : ""}
                <span>Order ${s.order ?? 0}</span>
                <span>By ${esc(s.createdBy || "admin")}</span>
                ${s.endDate ? `<span>Until ${fmtDate(s.endDate)}</span>` : ""}
              </div>
              ${s.ctaText ? `<div style="font-size:11px;color:#888;margin-top:4px">CTA: ${esc(s.ctaText)}</div>` : ""}
            </div>
            <div class="admin-ann-card-actions">
              <button class="admin-btn admin-btn-ghost" data-view-spot="${esc(s.id)}">\u{1F441} View</button>
              <button class="admin-btn admin-btn-ghost" data-edit-spot="${esc(s.id)}">\u270F\uFE0F Edit</button>
              <button class="admin-btn admin-btn-ghost" data-toggle-spot="${esc(s.id)}" title="${s.active ? "Deactivate" : "Activate"}">
                ${s.active ? "\u23F8 Pause" : "\u25B6 Activate"}
              </button>
              <button class="admin-btn admin-btn-danger" data-del-spot="${esc(s.id)}">\u{1F5D1}</button>
            </div>
          </div>
        `).join("") : '<div class="admin-empty">No spotlights yet. Create one above to show a hero banner on the homepage.</div>'}
      </div>
    `);
    document.getElementById("spotImageFile")?.addEventListener("change", async function() {
      const file = this.files?.[0];
      if (!file) return;
      const lbl = document.getElementById("spotFileLbl");
      if (lbl) lbl.textContent = `\u{1F4C1} ${file.name}`;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const urlInput = document.getElementById("spotImageUrl");
        if (urlInput) urlInput.value = "";
        document.getElementById("spotImageUrl")?.setAttribute("data-file-data", dataUrl);
        showSpotImgPreview2(dataUrl);
      } catch (_) {
      }
    });
    document.getElementById("spotImageUrl")?.addEventListener("blur", function() {
      if (this.value.trim()) showSpotImgPreview2(this.value.trim());
    });
    document.getElementById("spotSubmit")?.addEventListener("click", async () => {
      const title = document.getElementById("spotTitle")?.value.trim();
      const subtitle = document.getElementById("spotSubtitle")?.value.trim();
      const body = document.getElementById("spotBody")?.value.trim();
      const urlInput = document.getElementById("spotImageUrl");
      const fileData = urlInput?.getAttribute("data-file-data") || "";
      const imageUrl = fileData || urlInput?.value.trim() || "";
      const badgeText = document.getElementById("spotBadgeText")?.value.trim();
      const badgeColor = document.getElementById("spotBadgeColor")?.value.trim();
      const ctaText = document.getElementById("spotCtaText")?.value.trim();
      const ctaUrl = document.getElementById("spotCtaUrl")?.value.trim();
      const type = document.getElementById("spotType")?.value;
      const order = parseInt(document.getElementById("spotOrder")?.value || "0", 10);
      const startDate = document.getElementById("spotStart")?.value || null;
      const endDate = document.getElementById("spotEnd")?.value || null;
      const errEl = document.getElementById("spotFormError");
      const btn = document.getElementById("spotSubmit");
      errEl.style.display = "none";
      if (!title) {
        errEl.textContent = "Title is required.";
        errEl.style.display = "block";
        return;
      }
      if (!imageUrl) {
        errEl.textContent = "Image is required \u2014 upload a file or paste a URL.";
        errEl.style.display = "block";
        return;
      }
      btn.disabled = true;
      btn.textContent = "Publishing\u2026";
      try {
        await api("/api/admin/spotlights", {
          method: "POST",
          body: JSON.stringify({ title, subtitle, body, imageUrl, badgeText, badgeColor, ctaText, ctaUrl, type, order, startDate, endDate })
        });
        showSpotlights();
        notify("Spotlight published.", "success");
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = "block";
        btn.disabled = false;
        btn.textContent = "Publish Spotlight";
      }
    });
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}
async function openViewSpotlight(id) {
  let s;
  try {
    s = await api(`/api/admin/spotlights/${encodeURIComponent(id)}`);
  } catch (err) {
    notify(err.message, "error");
    return;
  }
  const typeColors = { ad: "blue", event: "green", news: "gray", promo: "red" };
  openModal(`\u{1F441} ${esc(s.title || "Spotlight")}`, `
    ${s.imageUrl ? `<img src="${esc(s.imageUrl)}" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:8px;margin-bottom:16px;display:block">` : ""}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 20px;font-size:13px">
      <div><span style="font-weight:600;color:#555;display:block;margin-bottom:3px">Status</span>${badge(s.active ? "Live" : "Inactive", s.active ? "green" : "gray")}</div>
      <div><span style="font-weight:600;color:#555;display:block;margin-bottom:3px">Type</span>${badge(s.type || "ad", typeColors[s.type || ""] || "gray")}</div>
      ${s.badgeText ? `<div><span style="font-weight:600;color:#555;display:block;margin-bottom:3px">Badge</span><span style="background:${esc(s.badgeColor || "#C0392B")};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${esc(s.badgeText)}</span></div>` : ""}
      <div><span style="font-weight:600;color:#555;display:block;margin-bottom:3px">Order</span>${s.order ?? 0}</div>
      ${s.subtitle ? `<div style="grid-column:1/-1"><span style="font-weight:600;color:#555;display:block;margin-bottom:3px">Subtitle</span>${esc(s.subtitle)}</div>` : ""}
      ${s.body ? `<div style="grid-column:1/-1"><span style="font-weight:600;color:#555;display:block;margin-bottom:3px">Body</span><span style="color:#555">${esc(s.body)}</span></div>` : ""}
      ${s.ctaText ? `<div><span style="font-weight:600;color:#555;display:block;margin-bottom:3px">CTA</span>${esc(s.ctaText)}</div>` : ""}
      ${s.ctaUrl ? `<div><span style="font-weight:600;color:#555;display:block;margin-bottom:3px">CTA URL</span><a href="${esc(s.ctaUrl)}" target="_blank" rel="noopener" style="color:var(--red);word-break:break-all">${esc(s.ctaUrl)}</a></div>` : ""}
      ${s.startDate ? `<div><span style="font-weight:600;color:#555;display:block;margin-bottom:3px">Show from</span>${fmtDate(s.startDate)}</div>` : ""}
      ${s.endDate ? `<div><span style="font-weight:600;color:#555;display:block;margin-bottom:3px">Show until</span>${fmtDate(s.endDate)}</div>` : ""}
      <div><span style="font-weight:600;color:#555;display:block;margin-bottom:3px">Created by</span>${esc(s.createdBy || "admin")}</div>
      <div><span style="font-weight:600;color:#555;display:block;margin-bottom:3px">Created</span>${fmtDate(s.createdAt)}</div>
    </div>
  `, null);
}
function spotlightFormHtml(s = {}) {
  const toDatetimeLocal = (d) => {
    if (!d) return "";
    try {
      return new Date(d).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };
  return `
    <div class="admin-modal-grid">
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Title <span style="color:#C0392B">*</span></label>
        <input class="admin-modal-input" id="editSpotTitle" maxlength="200" value="${esc(s.title || "")}">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Subtitle</label>
        <input class="admin-modal-input" id="editSpotSubtitle" maxlength="200" value="${esc(s.subtitle || "")}">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Description</label>
        <textarea class="admin-modal-textarea" id="editSpotBody" rows="2" maxlength="400">${esc(s.body || "")}</textarea>
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Banner image <span style="font-weight:400;color:#888">(upload or URL)</span></label>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;background:white;white-space:nowrap" id="editSpotFileLbl">
            \u{1F4C1} Browse\u2026
            <input type="file" id="editSpotImageFile" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none">
          </label>
          <input class="admin-modal-input" id="editSpotImageUrl" type="url" placeholder="\u2026or paste https:// URL" value="${esc(s.imageUrl || "")}" style="flex:1;min-width:160px">
        </div>
        <div id="editSpotImgPreviewWrap" style="margin-top:8px;${s.imageUrl ? "" : "display:none"}">
          <img id="editSpotImgPreview" src="${esc(s.imageUrl || "")}" alt="Preview" style="max-width:100%;max-height:140px;border-radius:6px;border:1.5px solid var(--border);object-fit:cover">
        </div>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Badge text</label>
        <input class="admin-modal-input" id="editSpotBadgeText" maxlength="40" value="${esc(s.badgeText || "")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Badge color</label>
        <input class="admin-modal-input" id="editSpotBadgeColor" type="color" value="${esc(s.badgeColor || "#C0392B")}" style="height:38px;padding:2px 6px">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">CTA button text</label>
        <input class="admin-modal-input" id="editSpotCtaText" maxlength="60" value="${esc(s.ctaText || "")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">CTA button URL</label>
        <input class="admin-modal-input" id="editSpotCtaUrl" type="url" value="${esc(s.ctaUrl || "")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Type</label>
        <select class="admin-modal-select" id="editSpotType">
          <option value="ad" ${s.type === "ad" || !s.type ? "selected" : ""}>\u{1F4E3} Ad</option>
          <option value="event" ${s.type === "event" ? "selected" : ""}>\u{1F389} Event</option>
          <option value="news" ${s.type === "news" ? "selected" : ""}>\u{1F4F0} News</option>
          <option value="promo" ${s.type === "promo" ? "selected" : ""}>\u{1F525} Promo</option>
        </select>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Display order</label>
        <input class="admin-modal-input" id="editSpotOrder" type="number" min="0" value="${s.order ?? 0}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Show from</label>
        <input class="admin-modal-input" id="editSpotStart" type="datetime-local" value="${toDatetimeLocal(s.startDate)}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Show until</label>
        <input class="admin-modal-input" id="editSpotEnd" type="datetime-local" value="${toDatetimeLocal(s.endDate)}">
      </div>
    </div>`;
}
async function openEditSpotlight(id) {
  let s;
  try {
    s = await api(`/api/admin/spotlights/${encodeURIComponent(id)}`);
  } catch (err) {
    notify(err.message, "error");
    return;
  }
  openModal(`\u270F\uFE0F Edit Spotlight`, spotlightFormHtml(s), async () => {
    const urlInput = document.getElementById("editSpotImageUrl");
    const fileData = urlInput?.getAttribute("data-file-data") || "";
    const imageUrl = fileData || urlInput?.value.trim() || s.imageUrl || "";
    const payload = {
      title: document.getElementById("editSpotTitle")?.value.trim(),
      subtitle: document.getElementById("editSpotSubtitle")?.value.trim(),
      body: document.getElementById("editSpotBody")?.value.trim(),
      imageUrl,
      badgeText: document.getElementById("editSpotBadgeText")?.value.trim(),
      badgeColor: document.getElementById("editSpotBadgeColor")?.value.trim(),
      ctaText: document.getElementById("editSpotCtaText")?.value.trim(),
      ctaUrl: document.getElementById("editSpotCtaUrl")?.value.trim(),
      type: document.getElementById("editSpotType")?.value,
      order: parseInt(document.getElementById("editSpotOrder")?.value || "0", 10),
      startDate: document.getElementById("editSpotStart")?.value || null,
      endDate: document.getElementById("editSpotEnd")?.value || null
    };
    if (!payload.title) throw new Error("Title is required.");
    await api(`/api/admin/spotlights/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });
    showSpotlights();
  });
  requestAnimationFrame(() => {
    document.getElementById("editSpotImageFile")?.addEventListener("change", async function() {
      const file = this.files?.[0];
      if (!file) return;
      const lbl = document.getElementById("editSpotFileLbl");
      if (lbl) lbl.textContent = `\u{1F4C1} ${file.name}`;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const urlInput2 = document.getElementById("editSpotImageUrl");
        if (urlInput2) {
          urlInput2.value = "";
          urlInput2.setAttribute("data-file-data", dataUrl);
        }
        const wrap = document.getElementById("editSpotImgPreviewWrap");
        const img = document.getElementById("editSpotImgPreview");
        if (wrap && img) {
          img.src = dataUrl;
          wrap.style.display = "block";
        }
      } catch (_) {
      }
    });
    document.getElementById("editSpotImageUrl")?.addEventListener("blur", function() {
      const wrap = document.getElementById("editSpotImgPreviewWrap");
      const img = document.getElementById("editSpotImgPreview");
      if (wrap && img && this.value.trim()) {
        img.src = this.value.trim();
        wrap.style.display = "block";
      }
    });
  });
}
async function showAnnouncements() {
  try {
    const data = await api("/api/admin/announcements");
    const typeColors = { info: "blue", warning: "red", success: "green" };
    content(`
      <div class="admin-ann-form">
        <div class="admin-ann-form-title">\u{1F4E2} Create New Announcement</div>
        <div id="annFormError" style="display:none;background:#fce8e8;border:1.5px solid #f8c3c3;border-radius:8px;padding:10px 14px;font-size:13px;color:#C0392B;margin-bottom:12px"></div>
        <div class="admin-ann-grid">
          <div class="admin-ann-field admin-ann-full">
            <label class="admin-ann-label">Title</label>
            <input class="admin-ann-input" id="annTitle" placeholder="e.g. Site maintenance this Saturday">
          </div>
          <div class="admin-ann-field admin-ann-full">
            <label class="admin-ann-label">Message</label>
            <textarea class="admin-ann-textarea" id="annBody" placeholder="Write the announcement message shown to all users\u2026"></textarea>
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label">Type</label>
            <select class="admin-ann-select" id="annType">
              <option value="info">\u2139\uFE0F Info (blue)</option>
              <option value="warning">\u26A0\uFE0F Warning (yellow)</option>
              <option value="success">\u2705 Success (green)</option>
            </select>
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label">Expires at (optional)</label>
            <input class="admin-ann-input" id="annExpiry" type="datetime-local">
          </div>
        </div>
        <div class="admin-ann-actions">
          <button class="admin-btn" id="annSubmit" style="background:#C0392B;color:#fff;border-color:#C0392B;padding:9px 22px;font-size:13px">Publish Announcement</button>
        </div>
      </div>

      <div class="admin-ann-list" id="annList">
        ${data.announcements.length ? data.announcements.map((a) => `
          <div class="admin-ann-card">
            <div class="admin-ann-stripe admin-ann-stripe-${a.type}"></div>
            <div class="admin-ann-content">
              <div class="admin-ann-card-title">${esc(a.title)}</div>
              <div class="admin-ann-card-body">${esc(a.body)}</div>
              <div class="admin-ann-card-meta">
                ${badge(a.active ? "Live" : "Inactive", a.active ? "green" : "gray")}
                ${badge(a.type, typeColors[a.type] || "gray")}
                <span>By ${esc(a.createdBy || "admin")}</span>
                <span>${fmtDate(a.createdAt)}</span>
                ${a.expiresAt ? `<span>Expires ${fmtDate(a.expiresAt)}</span>` : ""}
              </div>
            </div>
            <div class="admin-ann-card-actions">
              <button class="admin-btn admin-btn-ghost" data-toggle-ann="${esc(a.id)}" title="${a.active ? "Deactivate" : "Activate"}">
                ${a.active ? "\u23F8 Pause" : "\u25B6 Activate"}
              </button>
              <button class="admin-btn admin-btn-danger" data-del-ann="${esc(a.id)}">\u{1F5D1}</button>
            </div>
          </div>
        `).join("") : '<div class="admin-empty">No announcements yet. Create one above.</div>'}
      </div>
    `);
    document.getElementById("annSubmit")?.addEventListener("click", async () => {
      const title = document.getElementById("annTitle")?.value.trim();
      const body = document.getElementById("annBody")?.value.trim();
      const type = document.getElementById("annType")?.value;
      const expiry = document.getElementById("annExpiry")?.value;
      const errEl = document.getElementById("annFormError");
      const btn = document.getElementById("annSubmit");
      errEl.style.display = "none";
      if (!title || !body) {
        errEl.textContent = "Title and message are required.";
        errEl.style.display = "block";
        return;
      }
      btn.disabled = true;
      btn.textContent = "Publishing\u2026";
      try {
        await api("/api/admin/announcements", {
          method: "POST",
          body: JSON.stringify({ title, body, type, expiresAt: expiry || null })
        });
        showAnnouncements();
        notify("Announcement published.", "success");
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = "block";
        btn.disabled = false;
        btn.textContent = "Publish Announcement";
      }
    });
  } catch (err) {
    content(`<div class="admin-error">${esc(err.message)}</div>`);
  }
}
async function openViewListing(id) {
  let l;
  try {
    l = await api(`/api/admin/listings/${encodeURIComponent(id)}`);
  } catch (err) {
    notify(err.message, "error");
    return;
  }
  const comments = Array.isArray(l.comments) ? l.comments : [];
  const tags = Array.isArray(l.tags) ? l.tags.filter(Boolean) : [];
  const profile = listingViewProfile(l);
  const omit = new Set(profile.omitFields || []);
  const isPhotography = listingViewKind(l) === "photography";
  const externalLink = safeHttpUrl(l.externalLink);
  const priceValue = l.price ? `${esc(l.price)}${l.priceNote ? ` <span class="admin-view-note">(${esc(l.priceNote)})</span>` : ""}` : "";
  const externalLinkValue = l.externalLink ? externalLink ? `<a href="${esc(externalLink)}" target="_blank" rel="noopener" class="admin-view-link">${esc(l.externalLink)}</a>` : esc(l.externalLink) : "";
  const detailFields = [
    listingField(profile.subcategoryLabel || "Specific type", readableLabel(l.subcategory)),
    !omit.has("location") ? listingField(profile.locationLabel || "Location", l.location) : "",
    !omit.has("locationType") ? listingField(profile.locationTypeLabel || "Location type", readableLabel(l.locationType)) : "",
    !omit.has("price") ? listingField(profile.priceLabel || "Price / rate", priceValue, { raw: true }) : "",
    !omit.has("availability") ? listingField(profile.availabilityLabel || "Availability", l.availability) : "",
    !omit.has("contactEmail") ? listingField("Contact email", l.contactEmail) : "",
    !omit.has("contactPhone") ? listingField("Contact phone", l.contactPhone) : "",
    !omit.has("contactPreference") ? listingField(profile.contactPreferenceLabel || "Contact preference", readableLabel(l.contactPreference)) : "",
    !omit.has("externalLink") ? listingField(profile.externalLinkLabel || "External link", externalLinkValue, { raw: true, full: true }) : "",
    tags.length ? `
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Tags</label>
        <div class="admin-view-val admin-listing-tags">${tags.map((t) => badge(t)).join("")}</div>
      </div>` : "",
    l.description ? `
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">${esc(profile.descriptionLabel || "Description")}</label>
        <div class="admin-view-desc">${esc(l.description)}</div>
      </div>` : "",
    listingField("Listing ID", l.id),
    listingField("Posted by user", l.userId),
    l.updatedAt ? listingField("Last updated", fmtDate(l.updatedAt)) : ""
  ].filter(Boolean).join("");
  const commentHtml = comments.length ? comments.map((c) => `
        <div class="admin-view-comment">
          <div class="admin-view-comment-head">
            <strong>${esc(c.authorName || "\u2014")}</strong>
            <span>${fmtTime(c.createdAt)}</span>
          </div>
          <div class="admin-view-comment-body">${esc(c.body)}</div>
        </div>`).join("") : '<div style="color:#9ca3af;font-size:13px;padding:6px 0">No comments yet.</div>';
  openModal(esc(l.title), `
    <div class="admin-modal-meta" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      ${badge(readableLabel(l.category || "Listing"), "green")}
      ${l.subcategory ? badge(readableLabel(l.subcategory), isPhotography ? "blue" : "gray") : ""}
      <span>${esc(profile.kindLabel || "Listing")}</span>
      ${!omit.has("location") && l.location ? `<span>\u{1F4CD} ${esc(l.location)}</span>` : ""}
      ${!omit.has("locationType") && l.locationType ? `<span>${esc(readableLabel(l.locationType))}</span>` : ""}
      <span style="margin-left:auto;font-size:12px">Posted ${fmtDate(l.createdAt)}</span>
    </div>

    ${listingGallery(l.images, isPhotography)}

    <div class="admin-modal-grid" style="margin-top:12px">
      ${detailFields}
    </div>

    <div style="margin-top:16px">
      <div class="admin-modal-label" style="margin-bottom:10px">Comments (${comments.length})</div>
      <div class="admin-view-comments">${commentHtml}</div>
    </div>

    <div class="admin-view-actions">
      <button class="admin-btn" style="background:#C0392B;color:#fff;border-color:#C0392B" data-edit-listing="${esc(l.id)}">\u270F\uFE0F Edit Listing</button>
      <button class="admin-btn admin-btn-danger" data-del-listing="${esc(l.id)}">\u{1F5D1} Delete</button>
    </div>
  `, null);
}
async function openViewDiscussion(id) {
  let d;
  try {
    d = await api(`/api/admin/discussions/${encodeURIComponent(id)}`);
  } catch (err) {
    notify(err.message, "error");
    return;
  }
  const commentHtml = (d.comments || []).length ? (d.comments || []).map((c) => `
        <div class="admin-view-comment">
          <div class="admin-view-comment-head">
            <strong>${esc(c.authorName || "\u2014")}</strong>
            <span>${fmtTime(c.createdAt)}</span>
          </div>
          <div class="admin-view-comment-body">${esc(c.body)}</div>
        </div>`).join("") : '<div style="color:#9ca3af;font-size:13px;padding:6px 0">No comments yet.</div>';
  openModal(esc(d.title), `
    <div class="admin-modal-meta" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      ${badge(capitalize(d.category || ""), "blue")}
      <span>by <strong>${esc(d.authorName)}</strong></span>
      <span>\u{1F4AC} ${d.commentCount} comment${d.commentCount !== 1 ? "s" : ""}</span>
      ${d.tags?.length ? d.tags.map((t) => badge(t)).join("") : ""}
      <span style="margin-left:auto;font-size:12px">Posted ${fmtDate(d.createdAt)}</span>
    </div>

    ${d.body ? `
      <div style="margin-top:14px">
        <div class="admin-modal-label" style="margin-bottom:8px">Body</div>
        <div class="admin-view-desc">${esc(d.body)}</div>
      </div>` : ""}

    <div style="margin-top:16px">
      <div class="admin-modal-label" style="margin-bottom:10px">Comments (${d.commentCount})</div>
      <div class="admin-view-comments">${commentHtml}</div>
    </div>

    <div class="admin-view-actions">
      <button class="admin-btn" style="background:#C0392B;color:#fff;border-color:#C0392B" data-edit-discussion="${esc(d.id)}">\u270F\uFE0F Edit Discussion</button>
      <button class="admin-btn admin-btn-danger" data-del-discussion="${esc(d.id)}">\u{1F5D1} Delete</button>
    </div>
  `, null);
}
async function openEditListing(id) {
  let l;
  try {
    l = await api(`/api/admin/listings/${encodeURIComponent(id)}`);
  } catch (err) {
    notify(err.message, "error");
    return;
  }
  openModal("Edit Listing", `
    <div class="admin-modal-meta">Posted ${fmtDate(l.createdAt)}</div>
    <div class="admin-modal-grid">
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Title</label>
        <input class="admin-modal-input" id="mTitle" value="${esc(l.title || "")}">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Description</label>
        <textarea class="admin-modal-textarea" id="mDesc" rows="5">${esc(l.description || "")}</textarea>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Category</label>
        <select class="admin-modal-select" id="mCat">
          ${CATEGORIES.filter((c) => c).map((c) => `<option value="${c}"${c === l.category ? " selected" : ""}>${capitalize(c)}</option>`).join("")}
        </select>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Subcategory</label>
        <input class="admin-modal-input" id="mSubcat" value="${esc(l.subcategory || "")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Location</label>
        <input class="admin-modal-input" id="mLocation" value="${esc(l.location || "")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Price</label>
        <input class="admin-modal-input" id="mPrice" value="${esc(l.price || "")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Price Note</label>
        <input class="admin-modal-input" id="mPriceNote" value="${esc(l.priceNote || "")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Availability</label>
        <input class="admin-modal-input" id="mAvail" value="${esc(l.availability || "")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Contact Phone</label>
        <input class="admin-modal-input" id="mPhone" value="${esc(l.contactPhone || "")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">External Link</label>
        <input class="admin-modal-input" id="mLink" value="${esc(l.externalLink || "")}">
      </div>
    </div>
  `, async () => {
    await api(`/api/admin/listings/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({
        title: document.getElementById("mTitle").value.trim(),
        description: document.getElementById("mDesc").value.trim(),
        category: document.getElementById("mCat").value,
        subcategory: document.getElementById("mSubcat").value.trim(),
        location: document.getElementById("mLocation").value.trim(),
        price: document.getElementById("mPrice").value.trim(),
        priceNote: document.getElementById("mPriceNote").value.trim(),
        availability: document.getElementById("mAvail").value.trim(),
        contactPhone: document.getElementById("mPhone").value.trim(),
        externalLink: document.getElementById("mLink").value.trim()
      })
    });
    showListings(1);
  });
}
function discussionFormHtml(d = {}) {
  return `
    ${d.id ? `<div class="admin-modal-meta">By ${esc(d.authorName)} \xB7 ${d.commentCount} comment${d.commentCount !== 1 ? "s" : ""} \xB7 ${fmtDate(d.createdAt)}</div>` : ""}
    <div class="admin-modal-grid">
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Title</label>
        <input class="admin-modal-input" id="dTitle" maxlength="200" value="${esc(d.title || "")}">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Body</label>
        <textarea class="admin-modal-textarea" id="dBody" rows="8">${esc(d.body || "")}</textarea>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Category</label>
        <select class="admin-modal-select" id="dCat">
          ${discussionCategoryOptions(d.category || "general")}
        </select>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label">Tags (comma-separated)</label>
        <input class="admin-modal-input" id="dTags" value="${esc((d.tags || []).join(", "))}" placeholder="visa, boston, housing">
      </div>
    </div>
  `;
}
function collectDiscussionPayload() {
  return {
    title: document.getElementById("dTitle").value.trim(),
    body: document.getElementById("dBody").value.trim(),
    category: document.getElementById("dCat").value,
    tags: document.getElementById("dTags").value.split(",").map((t) => t.trim()).filter(Boolean)
  };
}
async function openCreateDiscussion() {
  openModal("Create Discussion", discussionFormHtml(), async () => {
    await api("/api/admin/discussions", {
      method: "POST",
      body: JSON.stringify(collectDiscussionPayload())
    });
    showDiscussions(1);
  });
}
async function openEditDiscussion(id) {
  let d;
  try {
    d = await api(`/api/admin/discussions/${encodeURIComponent(id)}`);
  } catch (err) {
    notify(err.message, "error");
    return;
  }
  openModal("Edit Discussion", discussionFormHtml(d), async () => {
    await api(`/api/admin/discussions/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(collectDiscussionPayload())
    });
    showDiscussions(1);
  });
}
function openModal(title, bodyHtml, onSave) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.id = "adminModalOverlay";
  overlay.className = "admin-modal-overlay";
  const hasActions = onSave !== null;
  overlay.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true">
      <div class="admin-modal-head">
        <div class="admin-modal-title">${title}</div>
        <button class="admin-modal-close" id="adminModalClose">\xD7</button>
      </div>
      <div class="admin-modal-error" id="adminModalError"></div>
      ${bodyHtml}
      ${hasActions ? `<div class="admin-modal-actions">
        <button class="admin-btn admin-btn-ghost" id="adminModalCancel">Cancel</button>
        <button class="admin-btn" id="adminModalSave" style="background:#C0392B;color:#fff;border-color:#C0392B;padding:8px 20px;font-size:13px">Save Changes</button>
      </div>` : `<div class="admin-modal-actions">
        <button class="admin-btn admin-btn-ghost" id="adminModalCancel">Close</button>
      </div>`}
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
  document.getElementById("adminModalClose").addEventListener("click", closeModal);
  document.getElementById("adminModalCancel").addEventListener("click", closeModal);
  if (onSave) {
    document.getElementById("adminModalSave").addEventListener("click", async () => {
      const errEl = document.getElementById("adminModalError");
      const btn = document.getElementById("adminModalSave");
      errEl.style.display = "none";
      btn.disabled = true;
      btn.textContent = "Saving\u2026";
      try {
        await onSave();
        closeModal();
        notify("Changes saved successfully.", "success");
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = "block";
        btn.disabled = false;
        btn.textContent = "Save Changes";
        notify(err.message, "error");
      }
    });
  }
}
function closeModal() {
  document.getElementById("adminModalOverlay")?.remove();
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  if (e.key === "/" && !isTypingTarget(e.target) && !document.getElementById("adminModalOverlay")) {
    const search = document.querySelector(".admin-search");
    if (search) {
      e.preventDefault();
      search.focus();
      search.select?.();
    }
  }
});
document.addEventListener("click", async (e) => {
  const navLink = e.target.closest("[data-view]");
  if (navLink && navLink.closest(".admin-nav")) {
    navigate(navLink.dataset.view);
    return;
  }
  if (e.target.id === "adminModalOverlay") {
    closeModal();
    return;
  }
  const newsFormat = e.target.closest("[data-news-format]");
  if (newsFormat) {
    const action = newsFormat.dataset.newsFormat;
    if (action === "bold") insertIntoNewsBody("**", "**");
    if (action === "h2") insertIntoNewsBody("## ");
    if (action === "quote") insertIntoNewsBody("> ");
    if (action === "font-serif") insertIntoNewsBody("[font=serif]", "[/font]");
    if (action === "font-sans") insertIntoNewsBody("[font=sans]", "[/font]");
    if (action === "font-mono") insertIntoNewsBody("[font=mono]", "[/font]");
    return;
  }
  const insertNewsMedia = e.target.closest("[data-insert-news-media]");
  if (insertNewsMedia) {
    if (window.BiscoonNewsEditor?.insertMedia?.(insertNewsMedia.dataset.insertNewsMedia)) return;
    insertIntoNewsBody(`

[[media:${insertNewsMedia.dataset.insertNewsMedia}]]

`);
    return;
  }
  const removeNewsMedia = e.target.closest("[data-remove-news-media]");
  if (removeNewsMedia) {
    const id = removeNewsMedia.dataset.removeNewsMedia;
    _newsMediaDraft = _newsMediaDraft.filter((item) => item.id !== id);
    const body = document.getElementById("newsBody");
    if (body) body.value = body.value.replace(new RegExp(`\\n?\\n?\\[\\[media:${id}\\]\\]\\n?\\n?`, "g"), "\n\n");
    renderNewsMediaLibrary();
    window.BiscoonNewsEditor?.mount?.({ element: "#newsRichEditor", textarea: "#newsBody", media: () => _newsMediaDraft });
    return;
  }
  const pageBtn = e.target.closest("[data-page][data-pager-view]");
  if (pageBtn) {
    const v = pageBtn.dataset.pagerView;
    _s[v] && (_s[v].page = parseInt(pageBtn.dataset.page));
    ({
      users: showUsers,
      listings: showListings,
      events: showEvents,
      news: showNews,
      discussions: showDiscussions,
      comments: showComments,
      reports: showReports,
      audit: showAuditLogs
    })[v]?.();
    return;
  }
  const commentTab = e.target.closest("[data-comment-type]");
  if (commentTab) {
    _s.comments.type = commentTab.dataset.commentType;
    showComments(1);
    return;
  }
  const reportTab = e.target.closest("[data-report-status]");
  if (reportTab) {
    _s.reports.status = reportTab.dataset.reportStatus;
    showReports(1);
    return;
  }
  const userKindTab = e.target.closest("[data-user-kind]");
  if (userKindTab && userKindTab.closest(".admin-tabs")) {
    _s.users.kind = userKindTab.dataset.userKind;
    _s.users.page = 1;
    showUsers(1);
    return;
  }
  if (e.target.closest("[data-create-staff]")) {
    openCreateStaffModal();
    return;
  }
  const editStaff = e.target.closest("[data-edit-staff]");
  if (editStaff) {
    openEditStaffModal(editStaff.dataset.editStaff);
    return;
  }
  const delStaff = e.target.closest("[data-del-staff]");
  if (delStaff) {
    if (!await confirmAction(`Delete admin user "${delStaff.dataset.delName || "this user"}"?`, {
      title: "Delete admin user",
      confirmText: "Delete user",
      tone: "danger"
    })) return;
    try {
      await api(`/api/admin/staff/${encodeURIComponent(delStaff.dataset.delStaff)}`, { method: "DELETE" });
      closeModal();
      showUsers(1);
      notify("Admin user deleted.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
    return;
  }
  if (e.target.closest("[data-create-event]")) {
    openCreateEvent();
    return;
  }
  const editEvent = e.target.closest("[data-edit-event]");
  if (editEvent) {
    openEditEvent(editEvent.dataset.editEvent);
    return;
  }
  const delEvent = e.target.closest("[data-del-event]");
  if (delEvent) {
    if (!await confirmAction(`Delete "${delEvent.dataset.delTitle || "this event"}"?`, {
      title: "Delete event",
      confirmText: "Delete event",
      tone: "danger"
    })) return;
    try {
      await api(`/api/admin/listings/${encodeURIComponent(delEvent.dataset.delEvent)}`, { method: "DELETE" });
      closeModal();
      showEvents(1);
      notify("Event deleted.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
    return;
  }
  if (e.target.closest("[data-create-news]")) {
    openNewsEditor();
    return;
  }
  if (e.target.closest("[data-create-discussion]")) {
    openCreateDiscussion();
    return;
  }
  const viewNews = e.target.closest("[data-view-news]");
  if (viewNews) {
    openViewNews(viewNews.dataset.viewNews);
    return;
  }
  const editNews = e.target.closest("[data-edit-news]");
  if (editNews) {
    openNewsEditor(editNews.dataset.editNews);
    return;
  }
  const delNews = e.target.closest("[data-del-news]");
  if (delNews) {
    if (!await confirmAction(`Delete "${delNews.dataset.delTitle || "this story"}"?`, {
      title: "Delete news story",
      confirmText: "Delete story",
      tone: "danger"
    })) return;
    try {
      await api(`/api/admin/news/${encodeURIComponent(delNews.dataset.delNews)}`, { method: "DELETE" });
      closeModal();
      showNews(1);
      notify("News story deleted.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
    return;
  }
  const viewUser = e.target.closest("[data-view-user]");
  if (viewUser) {
    const d = viewUser.dataset;
    openUserDetail(d.viewUser, d.viewUserName, d.viewUserEmail, d.viewUserRole, d.viewUserJoined, d.viewUserListings);
    return;
  }
  const viewListing = e.target.closest("[data-view-listing]");
  if (viewListing) {
    openViewListing(viewListing.dataset.viewListing);
    return;
  }
  const editListing = e.target.closest("[data-edit-listing]");
  if (editListing) {
    openEditListing(editListing.dataset.editListing);
    return;
  }
  const viewDiscussion = e.target.closest("[data-view-discussion]");
  if (viewDiscussion) {
    openViewDiscussion(viewDiscussion.dataset.viewDiscussion);
    return;
  }
  const editDiscussion = e.target.closest("[data-edit-discussion]");
  if (editDiscussion) {
    openEditDiscussion(editDiscussion.dataset.editDiscussion);
    return;
  }
  const delUser = e.target.closest("[data-del-user]");
  if (delUser) {
    if (!await confirmAction(`Delete "${delUser.dataset.delName || "this user"}"? Their listings will also be removed.`, {
      title: "Delete regular user",
      confirmText: "Delete user",
      tone: "danger"
    })) return;
    try {
      await api(`/api/admin/users/${encodeURIComponent(delUser.dataset.delUser)}`, { method: "DELETE" });
      closeModal();
      showUsers(1);
      notify("Regular user deleted.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
    return;
  }
  const delListing = e.target.closest("[data-del-listing]");
  if (delListing) {
    if (!await confirmAction("Delete this listing?", {
      title: "Delete listing",
      confirmText: "Delete listing",
      tone: "danger"
    })) return;
    try {
      await api(`/api/admin/listings/${encodeURIComponent(delListing.dataset.delListing)}`, { method: "DELETE" });
      closeModal();
      showListings(1);
      notify("Listing deleted.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
    return;
  }
  const delDiscussion = e.target.closest("[data-del-discussion]");
  if (delDiscussion) {
    if (!await confirmAction("Delete this discussion and all its comments?", {
      title: "Delete discussion",
      confirmText: "Delete discussion",
      tone: "danger"
    })) return;
    try {
      await api(`/api/admin/discussions/${encodeURIComponent(delDiscussion.dataset.delDiscussion)}`, { method: "DELETE" });
      closeModal();
      showDiscussions(1);
      notify("Discussion deleted.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
    return;
  }
  const delComment = e.target.closest("[data-del-comment]");
  if (delComment) {
    if (!await confirmAction("Remove this comment?", {
      title: "Remove comment",
      confirmText: "Remove comment",
      tone: "danger"
    })) return;
    const { commentId, parentId, parentType } = delComment.dataset;
    try {
      await api(`/api/admin/${parentType}s/${encodeURIComponent(parentId)}/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
      showComments(1);
      notify("Comment removed.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
    return;
  }
  const restoreBtn = e.target.closest("[data-restore-type]");
  if (restoreBtn) {
    const type = restoreBtn.dataset.restoreType;
    const id = restoreBtn.dataset.restoreId;
    if (!await confirmAction(`Restore this ${type}? It will become visible again.`, {
      title: "Restore item",
      confirmText: "Restore",
      tone: "primary"
    })) return;
    try {
      await api(`/api/admin/trash/${encodeURIComponent(type)}/${encodeURIComponent(id)}/restore`, { method: "PUT" });
      showTrash();
      notify(`${capitalize(type)} restored successfully.`, "success");
    } catch (err) {
      notify(err.message, "error");
    }
    return;
  }
  const viewSpot = e.target.closest("[data-view-spot]");
  if (viewSpot) {
    openViewSpotlight(viewSpot.dataset.viewSpot);
    return;
  }
  const editSpot = e.target.closest("[data-edit-spot]");
  if (editSpot) {
    openEditSpotlight(editSpot.dataset.editSpot);
    return;
  }
  const toggleSpot = e.target.closest("[data-toggle-spot]");
  if (toggleSpot) {
    try {
      await api(`/api/admin/spotlights/${encodeURIComponent(toggleSpot.dataset.toggleSpot)}/toggle`, { method: "PUT" });
      showSpotlights();
      notify("Spotlight status updated.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
    return;
  }
  const delSpot = e.target.closest("[data-del-spot]");
  if (delSpot) {
    if (!await confirmAction("Delete this spotlight?", {
      title: "Delete spotlight",
      confirmText: "Delete spotlight",
      tone: "danger"
    })) return;
    try {
      await api(`/api/admin/spotlights/${encodeURIComponent(delSpot.dataset.delSpot)}`, { method: "DELETE" });
      showSpotlights();
      notify("Spotlight deleted.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
    return;
  }
  const toggleAnn = e.target.closest("[data-toggle-ann]");
  if (toggleAnn) {
    try {
      await api(`/api/admin/announcements/${encodeURIComponent(toggleAnn.dataset.toggleAnn)}/toggle`, { method: "PUT" });
      showAnnouncements();
      notify("Announcement status updated.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
    return;
  }
  const delAnn = e.target.closest("[data-del-ann]");
  if (delAnn) {
    if (!await confirmAction("Delete this announcement?", {
      title: "Delete announcement",
      confirmText: "Delete announcement",
      tone: "danger"
    })) return;
    try {
      await api(`/api/admin/announcements/${encodeURIComponent(delAnn.dataset.delAnn)}`, { method: "DELETE" });
      showAnnouncements();
      notify("Announcement deleted.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
    return;
  }
  if (e.target.closest("#adminLogout")) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
    window.location.href = "login.html";
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.closest("#newsMediaFiles")) {
    const files = Array.from(e.target.files || []);
    try {
      const additions = await Promise.all(files.map(async (file, index) => ({
        id: `media-${Date.now()}-${index}`,
        type: newsMediaTypeFromFile(file),
        url: await readFileAsDataUrl(file),
        caption: "",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      })));
      _newsMediaDraft.push(...additions);
      renderNewsMediaLibrary();
      e.target.value = "";
      notify(`${additions.length} media item${additions.length !== 1 ? "s" : ""} added.`, "success");
    } catch (err) {
      notify(err.message, "error");
    }
    return;
  }
  const reportStatus = e.target.closest("[data-report-status-update]");
  if (!reportStatus) return;
  try {
    await api(`/api/admin/reports/${encodeURIComponent(reportStatus.dataset.reportStatusUpdate)}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: reportStatus.value })
    });
    showReports(1);
    notify("Report status updated.", "success");
  } catch (err) {
    notify(err.message, "error");
  }
});
document.addEventListener("input", (e) => {
  const captionInput = e.target.closest("[data-news-media-caption]");
  if (!captionInput) return;
  const media = _newsMediaDraft.find((item) => item.id === captionInput.dataset.newsMediaCaption);
  if (media) media.caption = captionInput.value.trim();
});
