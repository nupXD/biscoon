const BASE=window.location.origin.startsWith("file://")?"http://localhost:4000":window.location.origin,ADMIN_TOKEN_KEY="biscoonAdminToken",ADMIN_SESSION_KEY="biscoonAdminSession",ADMIN_LAST_ACTIVITY_KEY="biscoonAdminLastActivity",ADMIN_SIDEBAR_COLLAPSED_KEY="biscoonAdminSidebarCollapsed";let _token="",_me=null,_view="",_newsMediaDraft=[],_newsEditorState=null;function newsDraftSnapshot(){window.BiscoonNewsEditor?.sync?.();const e=t=>document.getElementById(t)?.value||"";return JSON.stringify({title:e("newsTitle"),summary:e("newsSummary"),body:e("newsBody"),category:e("newsCategory"),status:e("newsStatus"),imageUrl:e("newsImageUrl"),sourceName:e("newsSource"),authorName:e("newsAuthor"),featured:!!document.getElementById("newsFeatured")?.checked,media:_newsMediaDraft})}function persistNewsDraft(){if(!(!_newsEditorState||!document.getElementById("newsTitle")))try{const e=newsDraftSnapshot();e!==_newsEditorState.baseline?sessionStorage.setItem(_newsEditorState.key,e):sessionStorage.removeItem(_newsEditorState.key);const t=document.getElementById("newsDraftStatus");t&&!_newsEditorState.pending&&(t.textContent=e===_newsEditorState.baseline?"No unsaved changes":"Draft backed up in this tab")}catch{const e=document.getElementById("newsDraftStatus");e&&(e.textContent="Draft backup unavailable. Save before leaving.")}}window.addEventListener("beforeunload",e=>{_newsEditorState&&(persistNewsDraft(),(_newsEditorState.saving||_newsEditorState.pending||newsDraftSnapshot()!==_newsEditorState.baseline)&&(e.preventDefault(),e.returnValue=""))});for(const e of["input","change","click","news-editor-change"])document.addEventListener(e,()=>{_newsEditorState&&queueMicrotask(persistNewsDraft)});const _s={users:{page:1,search:"",kind:"regular"},listings:{page:1,category:"",search:""},events:{page:1,search:""},news:{page:1,status:"all",category:"",search:"",featured:"all",range:"all"},discussions:{page:1,search:""},comments:{page:1,type:"all",search:""},reports:{page:1,status:"open"},spotlight:{},announcements:{},audit:{page:1,action:"all",targetType:"all",search:""},dashboard:{range:"all",updatedAt:0}};let _dashRefreshTimer=null,_dashUpdatedTimer=null;document.addEventListener("DOMContentLoaded",async()=>{if(setupAdminShell(),_token=localStorage.getItem(ADMIN_TOKEN_KEY)||"",!_token){goLogin();return}try{const e=await api("/api/auth/me"),t=e.user||e;if(!isAdminRole(t.role)){notify("Access denied. Admin accounts only.","error"),window.location.href="../../index.html";return}_me=t,document.getElementById("adminName").textContent=`${_me.name} \xB7 ${roleLabel(_me.role)}`,syncNavVisibility(),navigate(firstAccessibleView())}catch{goLogin()}});async function api(e,t={}){const i={Authorization:`Bearer ${_token}`,...t.headers||{}};t.body&&(i["Content-Type"]="application/json");const a=await fetch(BASE+e,{...t,headers:i}),n=await a.json();if(!a.ok)throw new Error(n.error||"Request failed.");return localStorage.setItem(ADMIN_LAST_ACTIVITY_KEY,String(Date.now())),n}function goLogin(){window.location.href="login.html"}const VIEW_TITLES={dashboard:"Dashboard",users:"Users",listings:"Listings",events:"Events",news:"News",discussions:"Discussions",comments:"Comments",reports:"Reports",spotlight:"Homepage Spotlight",announcements:"Announcements",audit:"Audit Logs",trash:"Trash"},VIEW_HINTS={dashboard:"Live snapshot of users, listings, news, discussions, and recent activity.",users:"Review regular accounts and manage admin users with assigned privileges.",listings:"Inspect, edit, and moderate public listings across all categories.",events:"Create, edit, and manage community events posted on Biscoon.",news:"Draft, publish, feature, and manage newsroom stories with rich media.",discussions:"Create and moderate community discussion threads.",comments:"Review listing and discussion comments from one moderation queue.",reports:"Track reported content and move each report through review.",spotlight:"Banners that rotate in the homepage hero. Live ones appear to visitors; paused ones stay hidden.",announcements:"Publish site-wide messages and control visibility.",trash:"Soft-deleted content \u2014 the internet is forever. Only super-admins can restore or permanently delete.",audit:"Review super-admin activity, content changes, and moderation actions."},VIEW_PERMISSION={users:"users",listings:"listings",events:"listings",news:"news",discussions:"discussions",comments:"comments",reports:"reports",spotlight:"announcements",announcements:"announcements"},ADMIN_PERMISSION_DEFS=[{key:"users",label:"Regular Users",description:"View regular accounts, inspect their content, and remove regular users."},{key:"listings",label:"Listings",description:"View, edit, and delete marketplace listings and events."},{key:"news",label:"News",description:"Create, edit, publish, feature, and delete newsroom stories."},{key:"discussions",label:"Discussions",description:"Create, view, edit, and delete community discussions."},{key:"comments",label:"Comments",description:"Review and remove listing or discussion comments."},{key:"reports",label:"Reports",description:"Review reports and update moderation status."},{key:"announcements",label:"Announcements",description:"Create, pause, activate, and delete site announcements."}];function navigate(e){if(!closeModal())return;if(!canAccessView(e)){content('<div class="admin-error">You do not have permission to open this admin section.</div>');return}stopDashboardAutoRefresh(),_view=e,document.querySelectorAll(".admin-nav-link").forEach(i=>i.classList.toggle("active",i.dataset.view===e)),document.getElementById("viewTitle").textContent=VIEW_TITLES[e]||e;const t=document.getElementById("viewHint");t&&(t.textContent=VIEW_HINTS[e]||"Manage Biscoon admin operations."),content(loadingState(VIEW_TITLES[e]||"Loading")),{dashboard:showDashboard,users:showUsers,listings:showListings,events:showEvents,news:showNews,discussions:showDiscussions,comments:showComments,reports:showReports,spotlight:showSpotlights,announcements:showAnnouncements,audit:showAuditLogs,trash:showTrash}[e]?.()}function content(e){const t=document.getElementById("adminContent");t&&(t.innerHTML=e,t.classList.remove("admin-content-enter"),t.offsetWidth,t.classList.add("admin-content-enter"))}function loadingState(e="Loading"){return`
    <div class="admin-loading-shell" aria-live="polite">
      <div class="admin-loading-head">
        <span class="admin-loading-spinner"></span>
        <span>${esc(e)}\u2026</span>
      </div>
      <div class="admin-skeleton-grid">
        <span></span><span></span><span></span>
      </div>
      <div class="admin-skeleton-card">
        <span></span><span></span><span></span><span></span>
      </div>
    </div>`}function setupAdminShell(){const e=document.getElementById("adminLayout"),t=document.getElementById("adminSidebarToggle"),i=document.getElementById("adminSidebarClose"),a=document.getElementById("adminSidebarBackdrop"),n=document.getElementById("adminNav"),d=document.getElementById("adminRefreshView"),s=()=>window.matchMedia("(max-width: 768px)").matches;if(!document.getElementById("adminToastHost")){const l=document.createElement("div");l.id="adminToastHost",l.className="admin-toast-host",document.body.appendChild(l)}e&&localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY)==="true"&&e.classList.add("admin-sidebar-collapsed");const o=()=>e?.classList.remove("admin-sidebar-mobile-open");t?.addEventListener("click",()=>{if(s()){e?.classList.toggle("admin-sidebar-mobile-open");return}const l=!e?.classList.contains("admin-sidebar-collapsed");e?.classList.toggle("admin-sidebar-collapsed",l),localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY,String(l))}),i?.addEventListener("click",o),a?.addEventListener("click",o),n?.addEventListener("click",l=>{s()&&l.target.closest(".admin-nav-link")&&o()}),document.addEventListener("keydown",l=>{l.key==="Escape"&&o()}),window.addEventListener("resize",()=>{s()||o()}),d?.addEventListener("click",()=>refreshCurrentView(!0)),setupGlobalSearch()}function setupGlobalSearch(){const e=document.createElement("div");e.id="adminGlobalSearch",e.className="admin-gs-overlay",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-label","Global search");const t=document.createElement("div");t.className="admin-gs-box";const i=document.createElement("div");i.className="admin-gs-input-row";const a="http://www.w3.org/2000/svg",n=document.createElementNS(a,"svg");n.setAttribute("class","admin-gs-icon"),n.setAttribute("width","18"),n.setAttribute("height","18"),n.setAttribute("viewBox","0 0 16 16"),n.setAttribute("fill","none"),n.setAttribute("aria-hidden","true");const d=document.createElementNS(a,"circle");d.setAttribute("cx","6.5"),d.setAttribute("cy","6.5"),d.setAttribute("r","4.5"),d.setAttribute("stroke","currentColor"),d.setAttribute("stroke-width","1.6");const s=document.createElementNS(a,"path");s.setAttribute("d","M10.5 10.5L14 14"),s.setAttribute("stroke","currentColor"),s.setAttribute("stroke-width","1.6"),s.setAttribute("stroke-linecap","round"),n.appendChild(d),n.appendChild(s);const o=document.createElement("input");o.id="adminGsInput",o.className="admin-gs-input",o.type="search",o.placeholder="Search users, listings, discussions, news\u2026",o.setAttribute("autocomplete","off"),o.setAttribute("spellcheck","false");const l=document.createElement("kbd");l.className="admin-gs-esc",l.textContent="Esc",i.appendChild(n),i.appendChild(o),i.appendChild(l);const c=document.createElement("div");c.id="adminGsResults",c.className="admin-gs-results",t.appendChild(i),t.appendChild(c),e.appendChild(t),document.body.appendChild(e);let u,r=-1;function y(){e.classList.add("open"),o.value="",c.textContent="",r=-1,setTimeout(()=>o.focus(),60)}function E(){e.classList.remove("open"),o.blur()}document.getElementById("adminSearchTrigger")?.addEventListener("click",y),e.addEventListener("click",v=>{v.target===e&&E()}),document.addEventListener("keydown",v=>{if((v.metaKey||v.ctrlKey)&&v.key==="k"){v.preventDefault(),y();return}if(v.key==="Escape"&&e.classList.contains("open")){E();return}if(!e.classList.contains("open"))return;const h=c.querySelectorAll(".admin-gs-item");v.key==="ArrowDown"&&(v.preventDefault(),r=Math.min(r+1,h.length-1),x(h)),v.key==="ArrowUp"&&(v.preventDefault(),r=Math.max(r-1,0),x(h)),v.key==="Enter"&&r>=0&&(v.preventDefault(),h[r]?.click())});function x(v){v.forEach((h,L)=>h.classList.toggle("active",L===r)),v[r]?.scrollIntoView({block:"nearest"})}function S(v){c.textContent="";const h=document.createElement("div");h.className="admin-gs-hint",h.textContent=v,c.appendChild(h)}const B={user:"\u{1F464}",listing:"\u{1F4CB}",discussion:"\u{1F4AC}",news:"\u{1F4F0}"},A={user:"blue",listing:"green",discussion:"purple",news:"red"};function H(v){const h=document.createElement("button");h.className="admin-gs-item",h.dataset.gsType=String(v.type||""),h.dataset.gsId=String(v.id||"");const L=document.createElement("span");L.className="admin-gs-item-icon",L.textContent=B[v.type]||"\u{1F4C4}";const f=document.createElement("span");f.className="admin-gs-item-body";const $=document.createElement("span");$.className="admin-gs-item-label",$.textContent=String(v.label||"\u2014");const M=document.createElement("span");M.className="admin-gs-item-sub",M.textContent=String(v.sub||v.category||""),f.appendChild($),f.appendChild(M);const p=document.createElement("span");return p.className=`admin-badge admin-badge-${A[v.type]||"gray"}`,p.textContent=String(v.type),h.appendChild(L),h.appendChild(f),h.appendChild(p),h.addEventListener("click",()=>{const g=h.dataset.gsType,b=h.dataset.gsId;E(),g==="user"?(navigate("users"),setTimeout(()=>document.querySelector(`[data-view-user="${CSS.escape(b)}"]`)?.click(),600)):g==="listing"?(navigate("listings"),setTimeout(()=>document.querySelector(`[data-view-listing="${CSS.escape(b)}"]`)?.click(),600)):g==="discussion"?(navigate("discussions"),setTimeout(()=>document.querySelector(`[data-view-discussion="${CSS.escape(b)}"]`)?.click(),600)):g==="news"&&navigate("news")}),h}o.addEventListener("input",()=>{const v=o.value.trim();if(r=-1,clearTimeout(u),v.length<2){v.length?S("Type at least 2 characters\u2026"):c.textContent="";return}S("Searching\u2026"),u=setTimeout(async()=>{var h;try{const L=await api(`/api/admin/search?q=${encodeURIComponent(v)}`);if(c.textContent="",!L.results.length){S("No results found.");return}const f={};for(const $ of L.results)(f[h=$.type]??(f[h]=[])).push($);for(const[$,M]of Object.entries(f)){const p=document.createElement("div");p.className="admin-gs-group";const g=document.createElement("div");g.className="admin-gs-group-label",g.textContent=capitalize($==="news"?"News":$+"s"),p.appendChild(g);for(const b of M)p.appendChild(H(b));c.appendChild(p)}}catch{S("Search failed. Try again.")}},260)})}function refreshCurrentView(e=!1){const i={dashboard:showDashboard,users:showUsers,listings:showListings,events:showEvents,news:showNews,discussions:showDiscussions,comments:showComments,reports:showReports,spotlight:showSpotlights,announcements:showAnnouncements,audit:showAuditLogs,trash:showTrash}[_view];i&&(content(loadingState("Refreshing")),i(),e&&notify("Refreshing current view.","info"))}function notify(e,t="info"){const i=document.getElementById("adminToastHost");if(!i||!e)return;const a=document.createElement("div");a.className=`admin-toast admin-toast-${t}`;const n=t==="success"?"\u2713":t==="error"||t==="warning"?"!":"i";a.innerHTML=`<span class="admin-toast-icon">${n}</span><span>${esc(e)}</span>`,i.appendChild(a),requestAnimationFrame(()=>a.classList.add("show")),setTimeout(()=>{a.classList.remove("show"),setTimeout(()=>a.remove(),180)},t==="error"?5200:3200)}function confirmAction(e,t={}){return new Promise(i=>{const a=document.createElement("div");a.className="admin-confirm-overlay";const n=t.tone==="danger"?"danger":"primary";a.innerHTML=`
      <div class="admin-confirm" role="dialog" aria-modal="true">
        <div class="admin-confirm-icon admin-confirm-icon-${n}">${n==="danger"?"!":"?"}</div>
        <div class="admin-confirm-body">
          <div class="admin-confirm-title">${esc(t.title||"Confirm action")}</div>
          <div class="admin-confirm-message">${esc(e)}</div>
        </div>
        <div class="admin-confirm-actions">
          <button class="admin-btn admin-btn-ghost" data-confirm-cancel>Cancel</button>
          <button class="admin-btn ${n==="danger"?"admin-btn-danger-solid":"admin-btn-primary"}" data-confirm-ok>${esc(t.confirmText||"Confirm")}</button>
        </div>
      </div>`,document.body.appendChild(a);const d=s=>{a.classList.remove("show"),setTimeout(()=>a.remove(),160),i(s)};a.addEventListener("click",s=>{(s.target===a||s.target.closest("[data-confirm-cancel]"))&&d(!1),s.target.closest("[data-confirm-ok]")&&d(!0)}),requestAnimationFrame(()=>a.classList.add("show")),a.querySelector("[data-confirm-ok]")?.focus()})}function isTypingTarget(e){const t=e?.tagName?.toLowerCase();return t==="input"||t==="textarea"||t==="select"||e?.isContentEditable}function esc(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]??t)}function fmtDate(e){return e?new Date(e).toLocaleDateString(void 0,{month:"short",day:"numeric",year:"numeric"}):"\u2014"}function fmtTime(e){if(!e)return"\u2014";const t=new Date(e),a=(new Date().getTime()-t.getTime())/1e3;return a<60?"just now":a<3600?`${Math.floor(a/60)}m ago`:a<86400?`${Math.floor(a/3600)}h ago`:fmtDate(e)}function badge(e,t="gray"){return`<span class="admin-badge admin-badge-${t}">${esc(e)}</span>`}function capitalize(e){return e?e.charAt(0).toUpperCase()+e.slice(1):""}function isSuperAdminRole(e){return e==="super-admin"||e==="admin"}function isStaffAdminRole(e){return e==="staff"||e==="sub-admin"}function isAdminRole(e){return isSuperAdminRole(e)||isStaffAdminRole(e)}function canManageStaff(){return isSuperAdminRole(_me?.role??"")}function roleLabel(e){return isSuperAdminRole(e)?"Super Admin":isStaffAdminRole(e)?"Admin User":"Regular User"}function roleBadge(e){const t=e||"user",i=isSuperAdminRole(t)?"red":isStaffAdminRole(t)?"blue":"gray";return badge(roleLabel(t),i)}function assignedPermissions(e=_me){return isSuperAdminRole(e?.role)?ADMIN_PERMISSION_DEFS.map(t=>t.key):e?.role==="sub-admin"&&(!e.permissions||e.permissions.length===0)?ADMIN_PERMISSION_DEFS.map(t=>t.key):Array.isArray(e?.permissions)?e.permissions:[]}function hasAdminPermission(e){return isSuperAdminRole(_me?.role)||assignedPermissions(_me).includes(e)}function canAccessView(e){return e==="audit"?canManageStaff():!VIEW_PERMISSION[e]||hasAdminPermission(VIEW_PERMISSION[e])}function firstAccessibleView(){return["dashboard","users","listings","news","discussions","comments","reports","announcements","audit"].find(canAccessView)||"dashboard"}function syncNavVisibility(){document.querySelectorAll(".admin-nav-link[data-view]").forEach(e=>{e.hidden=!canAccessView(e.dataset.view)})}function permissionSummary(e=[]){return e.length?ADMIN_PERMISSION_DEFS.filter(i=>e.includes(i.key)).map(i=>badge(i.label,"blue")).join(" "):'<span class="admin-muted">No privileges</span>'}function permissionCheckboxes(e=[]){const t=new Set(e);return`<div class="admin-permission-grid">
    ${ADMIN_PERMISSION_DEFS.map(i=>`
      <label class="admin-check-row">
        <input type="checkbox" value="${esc(i.key)}" data-staff-permission${t.has(i.key)?" checked":""}>
        <span>
          <strong>${esc(i.label)}</strong>
          <small>${esc(i.description)}</small>
        </span>
      </label>
    `).join("")}
  </div>`}function table(e,t){return t.length?`<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr>${e.map(i=>`<th>${i}</th>`).join("")}</tr></thead>
    <tbody>${t.map(i=>`<tr>${i.map(a=>`<td>${a}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`:'<div class="admin-empty">No records found.</div>'}function pager(e,t,i){if(t<=1)return"";const a=Math.min(t,9),n=Array.from({length:a},(d,s)=>s+1).map(d=>`<button class="admin-page-btn${d===e?" active":""}" data-page="${d}" data-pager-view="${i}">${d}</button>`);return t>a&&n.push(`<span style="padding:0 6px;color:#6b7a8d;align-self:center">\u2026 ${t}</span>`),`<div class="admin-pagination">${n.join("")}</div>`}function tabs(e,t,i){return`<div class="admin-tabs">${e.map(a=>`<button class="admin-tab${a.value===t?" active":""}" data-${i}="${a.value}">${a.label}</button>`).join("")}</div>`}const DASH_RANGES=[{value:"today",label:"Today"},{value:"7d",label:"7d"},{value:"30d",label:"30d"},{value:"all",label:"All"}];function stopDashboardAutoRefresh(){_dashRefreshTimer&&(clearInterval(_dashRefreshTimer),_dashRefreshTimer=null),_dashUpdatedTimer&&(clearInterval(_dashUpdatedTimer),_dashUpdatedTimer=null)}function startDashboardAutoRefresh(){stopDashboardAutoRefresh(),_dashRefreshTimer=setInterval(()=>{_view!=="dashboard"||document.hidden||showDashboard(!0)},6e4),_dashUpdatedTimer=setInterval(()=>{if(_view!=="dashboard")return;const e=document.getElementById("dashUpdatedAt");e&&_s.dashboard.updatedAt&&(e.textContent=formatUpdatedAgo(_s.dashboard.updatedAt))},1e3)}function formatUpdatedAgo(e){const t=Math.max(0,Math.floor((Date.now()-e)/1e3));return t<5?"Updated just now":t<60?`Updated ${t}s ago`:`Updated ${Math.floor(t/60)}m ago`}function rangeTrendLabel(e){return e==="today"?"today":e==="7d"?"this week":e==="30d"?"this month":"this week"}function animateStatValues(e=document){e.querySelectorAll("[data-count-to]").forEach(t=>{const i=Number(t.dataset.countTo||0),a=650,n=performance.now(),d=0;function s(o){const l=Math.min(1,(o-n)/a),c=1-Math.pow(1-l,3);t.textContent=Math.round(d+(i-d)*c).toLocaleString(),l<1&&requestAnimationFrame(s)}requestAnimationFrame(s)})}async function showDashboard(e=!1){try{e||content(loadingState("Dashboard"));const t=_s.dashboard.range||"all",[i,a]=await Promise.all([api(`/api/admin/stats?range=${encodeURIComponent(t)}`),api("/api/admin/feed")]);if(_view!=="dashboard")return;const n=i,d=n.byCategory[0]?.count||1;_s.dashboard.updatedAt=Date.now();const s=rangeTrendLabel(t);content(`
      <div class="dash-header">
        <div>
          <div class="dash-greeting">Welcome back, ${esc(_me.name.split(" ")[0])} \u{1F44B}</div>
          <div class="dash-updated" id="dashUpdatedAt">${formatUpdatedAgo(_s.dashboard.updatedAt)}</div>
        </div>
        <div class="dash-header-actions">
          <div class="dash-range" role="tablist" aria-label="Dashboard time range">
            ${DASH_RANGES.map(o=>`
              <button type="button" class="dash-range-btn${o.value===t?" active":""}" data-dash-range="${o.value}" role="tab" aria-selected="${o.value===t}">${o.label}</button>
            `).join("")}
          </div>
          <button class="admin-btn admin-btn-ghost dash-refresh" id="dashRefresh" type="button">\u21BA Refresh</button>
        </div>
      </div>

      <div class="dash-stat-grid">
        ${hasAdminPermission("users")?statCard("\u{1F465}",t==="all"?"Total Users":"Users",n.users.total,n.users.thisWeek,n.users.today,"blue","users",s):""}
        ${hasAdminPermission("listings")?statCard("\u{1F4CB}",t==="all"?"Total Listings":"Listings",n.listings.total,n.listings.thisWeek,n.listings.today,"green","listings",s):""}
        ${hasAdminPermission("news")?statCard("\u{1F4F0}",t==="all"?"Published News":"News",n.news.total,n.news.thisWeek,null,"red","news",s):""}
        ${hasAdminPermission("discussions")?statCard("\u{1F4AC}","Discussions",n.discussions.total,n.discussions.thisWeek,null,"purple","discussions",s):""}
      </div>

      <div class="dash-quick-actions">
        ${hasAdminPermission("users")?'<button class="dash-action-btn" data-nav-to="users" data-user-kind="regular">\u{1F465} Regular Users</button>':""}
        ${canManageStaff()?'<button class="dash-action-btn" data-nav-to="users" data-user-kind="staff">\u{1F6E1} Admin Users</button>':""}
        ${hasAdminPermission("listings")?'<button class="dash-action-btn" data-nav-to="listings">\u{1F4CB} Manage Listings</button>':""}
        ${hasAdminPermission("news")?'<button class="dash-action-btn" data-nav-to="news">\u{1F4F0} Publish News</button>':""}
        ${hasAdminPermission("discussions")?'<button class="dash-action-btn" data-nav-to="discussions">\u{1F4AC} Start Discussion</button>':""}
        ${hasAdminPermission("comments")?'<button class="dash-action-btn" data-nav-to="comments">\u{1F5E8}\uFE0F Review Comments</button>':""}
        ${hasAdminPermission("announcements")?'<button class="dash-action-btn dash-action-primary" data-nav-to="announcements">\u{1F4E2} Create Announcement</button>':""}
        ${canManageStaff()?'<button class="dash-action-btn" data-nav-to="audit">\u{1F9FE} Audit Logs</button>':""}
      </div>

      <div class="admin-two-col">
        <div class="admin-card">
          <div class="admin-card-head">
            <span>Recent Activity</span>
            <span class="dash-card-sub">${a.feed.length} events</span>
          </div>
          <div class="admin-feed">
            ${a.feed.map(o=>`
              <div class="admin-feed-item dash-feed-clickable" data-feed-type="${esc(o.type)}" data-feed-id="${esc(o.id||"")}" tabindex="0" role="button">
                <div class="admin-feed-icon admin-feed-icon-${esc(o.type)}">${o.icon}</div>
                <div class="admin-feed-body">
                  <div class="admin-feed-title">${esc(o.title)}</div>
                  <div class="admin-feed-sub"><span class="dash-feed-chip">${esc(o.type)}</span> ${esc(o.sub)}</div>
                </div>
                <div class="admin-feed-meta">
                  <div class="admin-feed-time">${fmtTime(o.date)}</div>
                  <div class="dash-feed-open">Open \u2192</div>
                </div>
              </div>
            `).join("")||'<div class="admin-empty">No activity yet.</div>'}
          </div>
        </div>

        ${hasAdminPermission("listings")?`<div class="admin-card">
          <div class="admin-card-head">
            <span>Listings by Category</span>
            <span class="dash-card-sub">${n.byCategory.length} categories \xB7 click to filter</span>
          </div>
          <div class="dash-bar-chart">
            ${n.byCategory.map(o=>`
              <div class="dash-bar-row dash-bar-clickable" data-nav-to="listings" data-listing-category="${esc(o.category)}" tabindex="0" role="button" title="Open ${esc(capitalize(o.category))} listings">
                <div class="dash-bar-label" title="${esc(capitalize(o.category))}">${esc(capitalize(o.category))}</div>
                <div class="dash-bar-track">
                  <div class="dash-bar-fill" style="width:${Math.round(o.count/d*100)}%"></div>
                  <span class="dash-bar-count">${o.count}</span>
                </div>
              </div>
            `).join("")||'<div class="admin-empty">No listings yet.</div>'}
          </div>
        </div>`:""}
      </div>

      <div class="admin-two-col">
        ${hasAdminPermission("users")?`<div class="admin-card">
          <div class="admin-card-head">
            <span>Recent Users</span>
            ${hasAdminPermission("users")?'<button class="dash-see-all" data-nav-to="users" data-user-kind="regular">See all \u2192</button>':""}
          </div>
          <div class="dash-mini-list">
            ${(n.recentUsers||[]).map(o=>`
              <div class="dash-mini-item dash-mini-clickable" data-view-user="${esc(o.id)}" data-view-user-name="${esc(o.name)}" data-view-user-email="${esc(o.email)}" data-view-user-role="${esc(o.role||"user")}" data-view-user-joined="${esc(o.createdAt)}" data-view-user-listings="0" title="View user profile">
                <div class="dash-mini-avatar" style="background:${userColor(o.name)}">${esc(o.name.charAt(0).toUpperCase())}</div>
                <div class="dash-mini-body">
                  <div class="dash-mini-name">${esc(o.name)}</div>
                  <div class="dash-mini-sub">${esc(o.email)}</div>
                </div>
                <div class="dash-mini-meta">
                  ${isAdminRole(o.role)?roleBadge(o.role):""}
                  <span class="dash-mini-date">${fmtTime(o.createdAt)}</span>
                </div>
              </div>
            `).join("")||'<div class="admin-empty">No users yet.</div>'}
          </div>
        </div>`:""}

        ${hasAdminPermission("listings")?`<div class="admin-card">
          <div class="admin-card-head">
            <span>Recent Listings</span>
            <button class="dash-see-all" data-nav-to="listings">See all \u2192</button>
          </div>
          <div class="dash-mini-list">
            ${(n.recentListings||[]).map(o=>`
              <div class="dash-mini-item dash-mini-clickable" data-view-listing="${esc(o.id)}" title="View listing">
                <div class="dash-mini-cat-icon">${catEmoji(o.category)}</div>
                <div class="dash-mini-body">
                  <div class="dash-mini-name">${esc(o.title)}</div>
                  <div class="dash-mini-sub">${esc(o.location||capitalize(o.category)||"\u2014")}</div>
                </div>
                <div class="dash-mini-meta">
                  ${badge(o.category,"green")}
                  <span class="dash-mini-date">${fmtTime(o.createdAt)}</span>
                </div>
              </div>
            `).join("")||'<div class="admin-empty">No listings yet.</div>'}
          </div>
        </div>`:""}
      </div>
    `),animateStatValues(),startDashboardAutoRefresh(),document.getElementById("dashRefresh")?.addEventListener("click",()=>{content(loadingState("Refreshing dashboard")),showDashboard()}),document.querySelectorAll("[data-dash-range]").forEach(o=>{o.addEventListener("click",()=>{const l=o.dataset.dashRange;!l||l===_s.dashboard.range||(_s.dashboard.range=l,content(loadingState("Updating dashboard")),showDashboard())})}),document.querySelectorAll("[data-nav-to]").forEach(o=>{const l=()=>{o.dataset.userKind&&(_s.users.kind=o.dataset.userKind),o.dataset.listingCategory!==void 0&&(_s.listings.category=o.dataset.listingCategory||"",_s.listings.page=1),navigate(o.dataset.navTo)};o.addEventListener("click",l),o.addEventListener("keydown",c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),l())})}),document.querySelectorAll(".dash-feed-clickable").forEach(o=>{const l=()=>{const c=o.dataset.feedType||"",u=o.dataset.feedId||"";if(c==="listing"&&u){navigate("listings"),setTimeout(()=>{document.querySelector(`[data-view-listing="${CSS.escape(u)}"]`)?.click()},350);return}if(c==="discussion"&&u){navigate("discussions"),setTimeout(()=>{document.querySelector(`[data-view-discussion="${CSS.escape(u)}"]`)?.click()},350);return}if(c==="user"&&u){navigate("users");return}const r={user:"users",listing:"listings",discussion:"discussions"};r[c]&&navigate(r[c])};o.addEventListener("click",l),o.addEventListener("keydown",c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),l())})})}catch(t){content(`<div class="admin-error">${esc(t.message)}</div>`)}}function statCard(e,t,i,a,n,d,s,o="this week"){const l=s&&canAccessView(s),c=a>0?`<span class="dash-trend-up">\u2191 ${a} ${esc(o)}</span>`:`<span class="dash-trend-zero">No new ${esc(o)}</span>`,u=n!==null?` \xB7 <span class="dash-today-val">${n} today</span>`:"";return`<div class="admin-stat-card admin-stat-${d}${l?" dash-stat-clickable":""}"${l?` data-nav-to="${s}" tabindex="0" role="button"`:""}>
    <div class="admin-stat-icon">${e}</div>
    <div class="admin-stat-content">
      <div class="admin-stat-value" data-count-to="${Number(i)||0}">0</div>
      <div class="admin-stat-label">${t}</div>
      <div class="dash-stat-footer">${c}${u}</div>
    </div>
    <div class="dash-stat-arr">\u203A</div>
  </div>`}function userColor(e){const t=["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#6366f1","#14b8a6"];let i=0;for(let a=0;a<e.length;a++)i=(i+e.charCodeAt(a))%t.length;return t[i]}function catEmoji(e){return{jobs:"\u{1F4BC}",housing:"\u{1F3E0}",pg:"\u{1F6CF}",services:"\u{1F527}",kinbech:"\u{1F6D2}",restaurants:"\u{1F37D}",shops:"\u{1F3EA}",events:"\u{1F389}",tech:"\u{1F4BB}",healthcare:"\u{1F3E5}",education:"\u{1F4DA}",auto:"\u{1F697}",beauty:"\u{1F484}",childcare:"\u{1F476}",cleaning:"\u{1F9F9}",photography:"\u{1F4F7}",produce:"\u{1F96C}",organizations:"\u{1F3E2}",discussions:"\u{1F4AC}",student:"\u{1F393}",finance:"\u{1F4B0}",immigration:"\u2708\uFE0F"}[e]||"\u{1F4E6}"}const LISTING_VIEW_PROFILES={base:{kindLabel:"Listing",subcategoryLabel:"Specific type",descriptionLabel:"Description",locationLabel:"Location",locationTypeLabel:"Location type",priceLabel:"Price / rate",availabilityLabel:"Availability"},photography:{kindLabel:"Photography showcase",subcategoryLabel:"Photo style / genre",descriptionLabel:"Caption / story",omitFields:["location","locationType","price","availability","contactEmail","contactPhone","contactPreference","externalLink"]},housing:{kindLabel:"Housing listing",subcategoryLabel:"Housing type",descriptionLabel:"Housing details",locationLabel:"Area / neighborhood",locationTypeLabel:"Showing format",priceLabel:"Rent / cost",availabilityLabel:"Move-in / availability"},jobs:{kindLabel:"Job listing",subcategoryLabel:"Role type",descriptionLabel:"Job description",locationLabel:"Work location",locationTypeLabel:"Work setup",priceLabel:"Pay / compensation",availabilityLabel:"Start date / schedule",contactPreferenceLabel:"Application method",externalLinkLabel:"Application link"},marketplace:{kindLabel:"Marketplace listing",subcategoryLabel:"Item / business type",descriptionLabel:"Item details",locationLabel:"Pickup / service area",locationTypeLabel:"Pickup format",priceLabel:"Asking price",availabilityLabel:"Pickup / availability"},service:{kindLabel:"Service listing",subcategoryLabel:"Service type",descriptionLabel:"Service details",locationLabel:"Service area",locationTypeLabel:"Service format",priceLabel:"Rate / starting price",availabilityLabel:"Booking availability"},professional:{kindLabel:"Professional listing",subcategoryLabel:"Professional type",descriptionLabel:"Professional details",locationLabel:"Practice / service area",locationTypeLabel:"Consultation format",priceLabel:"Consultation fee",availabilityLabel:"Appointment availability"},event:{kindLabel:"Event listing",subcategoryLabel:"Event type",descriptionLabel:"Event details",locationLabel:"Venue / area",locationTypeLabel:"Event format",priceLabel:"Ticket / entry cost",availabilityLabel:"Date / timing",externalLinkLabel:"RSVP / ticket link"},community:{kindLabel:"Community post",subcategoryLabel:"Community type",descriptionLabel:"Community details",locationLabel:"Community area",locationTypeLabel:"Participation format",priceLabel:"Cost / membership",availabilityLabel:"Schedule / availability"}};function readableLabel(e){return String(e||"").trim().replace(/[-_]+/g," ").replace(/\s+/g," ").replace(/\b\w/g,t=>t.toUpperCase())}function listingViewKind(e={}){const t=String(e.category||"").trim().toLowerCase(),i=String(e.subcategory||"").trim().toLowerCase(),a=n=>n.includes(t)||n.includes(i);return t==="photography"?"photography":a(["housing","pg","paying-guest","real-estate","room","apartment","roommate","studio","sublet","moving"])?"housing":t==="jobs"||a(["rojgar","tech","healthcare","student","full-time","part-time","contract","internship","remote"])?"jobs":a(["events","concert","puja","meetup","fundraiser","class","festival","networking","music","art","sports"])?"event":a(["legal","immigration","cpa","finance","insurance","education","tutoring","jyotish"])?"professional":a(["services","cleaning","childcare","beauty","translation","handyman","catering","delivery"])?"service":a(["marketplace","kinbech","restaurants","shops","produce","auto","business-for-sale","furniture","electronics","vehicle","appliance","books"])?"marketplace":a(["community","organizations","literature","yoga","matchmaker","matrimony","pen-pals","travel"])?"community":"base"}function listingViewProfile(e={}){return LISTING_VIEW_PROFILES[listingViewKind(e)]||LISTING_VIEW_PROFILES.base}function listingValue(e){return e!=null&&String(e).trim()!==""}function listingField(e,t,i={}){if(!listingValue(t))return"";const a=i.full?" admin-modal-full":"",n=i.raw?String(t):esc(t);return`
    <div class="admin-modal-field${a}">
      <label class="admin-modal-label">${esc(e)}</label>
      <div class="admin-view-val">${n}</div>
    </div>`}function safeHttpUrl(e){const t=String(e||"").trim();return/^https?:\/\//i.test(t)?t:""}function safeMediaUrl(e){const t=String(e||"").trim();return/^https?:\/\//i.test(t)||t.startsWith("/uploads/")||/^data:image\//i.test(t)?t:""}function listingGallery(e=[],t=!1){const i=(Array.isArray(e)?e:[]).map(safeMediaUrl).filter(Boolean);return i.length?`<div class="admin-listing-gallery" data-pswp-gallery>
    ${i.map((a,n)=>`
      <a href="${esc(a)}" class="admin-listing-photo-link" data-pswp-src="${esc(a)}" data-pswp-width="1600" data-pswp-height="1200">
        <img src="${esc(a)}" alt="Listing photo ${n+1}" loading="lazy">
      </a>
    `).join("")}
  </div>`:t?'<div class="admin-listing-gallery-empty">No photos attached to this photography post.</div>':""}function sectionHero(e,t,i=""){return`<div class="ix-hero">
    <div>
      <div class="ix-hero-title">${esc(e)}</div>
      <div class="ix-hero-sub">${esc(t)}</div>
    </div>
    <div class="ix-hero-actions">${i}</div>
  </div>`}function sectionStat(e,t,i=!1,a=""){return`<button type="button" class="ix-stat${i?" active":""}" ${a}>
    <span class="ix-stat-value" data-count-to="${Number(t)||0}">0</span>
    <span class="ix-stat-label">${esc(e)}</span>
  </button>`}function wireInteractiveRows(e,t){document.querySelectorAll(e).forEach(i=>{i.addEventListener("click",a=>{a.target.closest(".ix-actions, .news-row-actions, button, select, a, input")||t(i)}),i.addEventListener("keydown",a=>{(a.key==="Enter"||a.key===" ")&&(a.preventDefault(),t(i))})})}function bindSearch(e,t,i=350){let a;document.getElementById(e)?.addEventListener("input",n=>{clearTimeout(a),a=setTimeout(()=>t(n.target.value.trim()),i)})}async function showUsers(e){if(e!==void 0&&(_s.users.page=e),_s.users.kind==="staff"){await showStaffUsers(_s.users.page);return}const{page:t,search:i}=_s.users;try{const a=await api(`/api/admin/users?${new URLSearchParams({page:String(t),limit:String(20),search:i})}`),n=(a.users||[]).filter(d=>(d.listingCount||0)>0).length;content(`
      ${sectionHero("Users","Review community accounts. Click a row to open the profile.",canManageStaff()?tabs([{label:"Regular Users",value:"regular"},{label:"Admin Users",value:"staff"}],_s.users.kind,"user-kind"):"")}
      <div class="ix-stat-grid">
        ${sectionStat("Total users",a.total,!0)}
        ${sectionStat("With listings",n)}
        ${sectionStat("On this page",(a.users||[]).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="userSearch" type="search" placeholder="Search name or email\u2026" value="${esc(i)}">
        <span class="ix-count">${a.total.toLocaleString()} regular user${a.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(a.users||[]).length?`<div class="ix-list">
          ${a.users.map(d=>`
            <article class="ix-row" tabindex="0" role="button"
              data-view-user="${esc(d.id)}" data-view-user-name="${esc(d.name)}" data-view-user-email="${esc(d.email)}" data-view-user-role="${esc(d.role||"user")}" data-view-user-joined="${esc(d.createdAt)}" data-view-user-listings="${d.listingCount}">
              <div class="ix-avatar" style="background:${userColor(d.name)}">${esc((d.name||"?").charAt(0).toUpperCase())}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(d.name)}</div>
                <div class="ix-meta">${esc(d.email)}${d.phone?` \xB7 ${esc(d.phone)}`:""} \xB7 \u{1F4CB} ${d.listingCount||0} listings \xB7 Joined ${fmtDate(d.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-ghost" type="button" data-view-user="${esc(d.id)}" data-view-user-name="${esc(d.name)}" data-view-user-email="${esc(d.email)}" data-view-user-role="${esc(d.role||"user")}" data-view-user-joined="${esc(d.createdAt)}" data-view-user-listings="${d.listingCount}">\u{1F441} View</button>
                <button class="admin-btn admin-btn-danger" type="button" data-del-user="${esc(d.id)}" data-del-name="${esc(d.name)}">\u{1F5D1}</button>
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No users match this search.</div>'}
        ${pager(a.page,a.pages,"users")}
      </div>
    `),animateStatValues(),bindSearch("userSearch",d=>{_s.users.search=d,showUsers(1)},380)}catch(a){content(`<div class="admin-error">${esc(a.message)}</div>`)}}async function showStaffUsers(e){if(!canManageStaff()){_s.users.kind="regular",content('<div class="admin-error">Super admin access is required to manage admin users.</div>');return}e!==void 0&&(_s.users.page=e);const{page:t,search:i}=_s.users;try{const a=await api(`/api/admin/staff?${new URLSearchParams({page:String(t),limit:String(20),search:i})}`);content(`
      ${sectionHero("Admin Users","Manage staff accounts and privileges.",`
        ${tabs([{label:"Regular Users",value:"regular"},{label:"Admin Users",value:"staff"}],_s.users.kind,"user-kind")}
        <button class="admin-btn admin-btn-primary" data-create-staff type="button">+ Create Admin User</button>
      `)}
      <div class="ix-stat-grid">
        ${sectionStat("Admin users",a.total,!0)}
        ${sectionStat("On this page",(a.staff||[]).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="userSearch" type="search" placeholder="Search admin users\u2026" value="${esc(i)}">
        <span class="ix-count">${a.total.toLocaleString()} admin user${a.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(a.staff||[]).length?`<div class="ix-list">
          ${a.staff.map(n=>`
            <article class="ix-row" tabindex="0" role="button" data-edit-staff-row="${esc(n.id)}" data-can-edit="${n.canEdit?"1":"0"}">
              <div class="ix-avatar" style="background:${userColor(n.name)}">${esc((n.name||"?").charAt(0).toUpperCase())}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(n.name)} ${roleBadge(n.role)}</div>
                <div class="ix-meta">${esc(n.email)} \xB7 Created ${fmtDate(n.createdAt)}</div>
                <div class="ix-sub">${n.canEdit?permissionSummary(n.permissions):badge("All privileges","red")}</div>
              </div>
              <div class="ix-actions">
                ${n.canEdit?`<button class="admin-btn admin-btn-ghost" type="button" data-edit-staff="${esc(n.id)}">\u270F\uFE0F Edit</button>
                     <button class="admin-btn admin-btn-danger" type="button" data-del-staff="${esc(n.id)}" data-del-name="${esc(n.name)}">\u{1F5D1}</button>`:'<span class="admin-you">Protected</span>'}
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No admin users found.</div>'}
        ${pager(a.page,a.pages,"users")}
      </div>
    `),animateStatValues(),bindSearch("userSearch",n=>{_s.users.search=n,showUsers(1)},380),wireInteractiveRows("[data-edit-staff-row]",n=>{n.dataset.canEdit==="1"&&openEditStaffModal(n.dataset.editStaffRow)})}catch(a){content(`<div class="admin-error">${esc(a.message)}</div>`)}}async function openUserDetail(e,t,i,a,n,d){let s;try{s=await api(`/api/admin/users/${encodeURIComponent(e)}/content`)}catch(u){notify(u.message,"error");return}const o=a||"user",l=s.listings.length?s.listings.map(u=>`<tr>
        <td><span class="admin-link" data-view-listing="${esc(u.id)}">${esc(u.title)}</span></td>
        <td>${badge(u.category,"green")}</td>
        <td>${esc(u.location||"\u2014")}</td>
        <td>${fmtDate(u.createdAt)}</td>
        <td>
          <div class="admin-actions">
            <button class="admin-btn admin-btn-ghost" style="font-size:11px" data-view-listing="${esc(u.id)}">\u{1F441} View</button>
            <button class="admin-btn admin-btn-danger" style="font-size:11px" data-del-listing="${esc(u.id)}">\u{1F5D1}</button>
          </div>
        </td>
      </tr>`).join(""):'<tr><td colspan="5" style="text-align:center;color:#6b7a8d;padding:16px">No listings yet.</td></tr>',c=s.discussions.length?s.discussions.map(u=>`<tr>
        <td><span class="admin-link" data-view-discussion="${esc(u.id)}">${esc(u.title)}</span></td>
        <td>${badge(u.category)}</td>
        <td>${u.commentCount}</td>
        <td>${fmtDate(u.createdAt)}</td>
        <td>
          <div class="admin-actions">
            <button class="admin-btn admin-btn-ghost" style="font-size:11px" data-view-discussion="${esc(u.id)}">\u{1F441} View</button>
            <button class="admin-btn admin-btn-danger" style="font-size:11px" data-del-discussion="${esc(u.id)}">\u{1F5D1}</button>
          </div>
        </td>
      </tr>`).join(""):'<tr><td colspan="5" style="text-align:center;color:#6b7a8d;padding:16px">No discussions yet.</td></tr>';openModal(`\u{1F464} ${esc(t)}`,`
    <div class="admin-user-profile-head">
      <div class="admin-user-profile-avatar" style="background:${userColor(t)}">${esc(t.charAt(0).toUpperCase())}</div>
      <div style="flex:1;min-width:0">
        <div class="admin-user-profile-name">${esc(t)}</div>
        <div class="admin-user-profile-email">${esc(i||"\u2014")}</div>
        <div class="admin-user-profile-stats">
          ${roleBadge(o)}
          <span>\u{1F4CB} ${s.listings.length} listing${s.listings.length!==1?"s":""}</span>
          <span>\u{1F4AC} ${s.discussions.length} discussion${s.discussions.length!==1?"s":""}</span>
          ${n?`<span>\u{1F5D3} Joined ${fmtDate(n)}</span>`:""}
        </div>
      </div>
      ${e!==_me.id?`
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button class="admin-btn admin-btn-danger" style="font-size:11.5px" data-del-user="${esc(e)}" data-del-name="${esc(t)}">\u{1F5D1} Delete User</button>
        </div>`:'<span class="admin-you" style="flex-shrink:0">You</span>'}
    </div>

    <div style="margin-bottom:18px">
      <div class="admin-section-label">Listings (${s.listings.length})</div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Title</th><th>Category</th><th>Location</th><th>Date</th><th></th></tr></thead>
        <tbody>${l}</tbody>
      </table></div>
    </div>
    <div>
      <div class="admin-section-label">Discussions (${s.discussions.length})</div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Title</th><th>Category</th><th>Comments</th><th>Date</th><th></th></tr></thead>
        <tbody>${c}</tbody>
      </table></div>
    </div>
  `,null)}function collectStaffForm(e){const t=Array.from(document.querySelectorAll("[data-staff-permission]:checked")).map(n=>n.value),i=document.getElementById("staffPassword")?.value||"",a={name:document.getElementById("staffName")?.value.trim(),email:document.getElementById("staffEmail")?.value.trim(),phone:document.getElementById("staffPhone")?.value.trim(),permissions:t};return(i||e)&&(a.password=i),a}function staffFormHtml(e={},t=!1){return`
    <div class="admin-modal-grid">
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="staffName">Name</label>
        <input class="admin-modal-input" id="staffName" required value="${esc(e.name||"")}" autocomplete="off">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="staffEmail">Email</label>
        <input class="admin-modal-input" id="staffEmail" required type="email" value="${esc(e.email||"")}" autocomplete="off">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="staffPhone">Phone (optional)</label>
        <input class="admin-modal-input" id="staffPhone" type="tel" value="${esc(e.phone||"")}" autocomplete="off">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="staffPassword">${t?"Password":"New Password"}</label>
        <input class="admin-modal-input" id="staffPassword" type="password" minlength="8" ${t?"required":""} placeholder="${t?"Minimum 8 characters":"Leave blank to keep current password"}" autocomplete="new-password">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Privileges</label>
        ${permissionCheckboxes(e.permissions||[])}
      </div>
    </div>
  `}function openCreateStaffModal(){openModal("Create Admin User",staffFormHtml({},!0),async()=>{await api("/api/admin/staff",{method:"POST",body:JSON.stringify(collectStaffForm(!0))}),showUsers(1)})}async function openEditStaffModal(e){let t;try{t=await api(`/api/admin/staff/${encodeURIComponent(e)}`)}catch(i){notify(i.message,"error");return}openModal("Edit Admin User",staffFormHtml(t.staff,!1),async()=>{await api(`/api/admin/staff/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify(collectStaffForm(!1))}),showUsers(1)})}const CATEGORIES=["","jobs","housing","pg","services","kinbech","restaurants","shops","childcare","beauty","auto","cleaning","photography","produce","organizations","events","discussions","tech","healthcare","education","student","finance","immigration","other"],DISCUSSION_CATEGORIES=[{value:"general",label:"General"},{value:"jobs",label:"Jobs"},{value:"housing",label:"Housing"},{value:"services",label:"Services"},{value:"events",label:"Events"},{value:"newcomers",label:"Newcomers"},{value:"immigration",label:"Immigration"},{value:"education",label:"Education"},{value:"business",label:"Business"},{value:"community",label:"Community"}];function discussionCategoryOptions(e="general"){const t=e||"general",i=DISCUSSION_CATEGORIES.some(a=>a.value===t);return`${DISCUSSION_CATEGORIES.map(a=>`<option value="${esc(a.value)}"${a.value===t?" selected":""}>${esc(a.label)}</option>`).join("")}${i?"":`<option value="${esc(t)}" selected>${esc(capitalize(t))}</option>`}`}async function showListings(e){e!==void 0&&(_s.listings.page=e);const{page:t,category:i,search:a}=_s.listings;try{const n=await api(`/api/admin/listings?${new URLSearchParams({page:String(t),limit:String(20),category:i,search:a})}`),d=CATEGORIES.filter(Boolean).slice(0,8);content(`
      ${sectionHero("Listings","Inspect and moderate marketplace posts. Click a card to open details.")}
      <div class="ix-chip-row">
        <button type="button" class="ix-chip${i?"":" active"}" data-listing-chip="">All</button>
        ${d.map(s=>`<button type="button" class="ix-chip${i===s?" active":""}" data-listing-chip="${esc(s)}">${esc(capitalize(s))}</button>`).join("")}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="listingSearch" type="search" placeholder="Search listings\u2026" value="${esc(a)}">
        <select class="admin-select" id="listingCat">
          ${CATEGORIES.map(s=>`<option value="${esc(s)}"${s===i?" selected":""}>${s?capitalize(s):"All categories"}</option>`).join("")}
        </select>
        <span class="ix-count">${n.total.toLocaleString()} listing${n.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(n.listings||[]).length?`<div class="ix-list">
          ${n.listings.map(s=>`
            <article class="ix-row" tabindex="0" role="button" data-open-listing="${esc(s.id)}">
              <div class="ix-icon">${catEmoji(s.category)}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(s.title)}</div>
                <div class="ix-meta">${badge(s.category)} \xB7 ${esc(s.location||"No location")} \xB7 ${fmtDate(s.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-ghost" type="button" data-view-listing="${esc(s.id)}">\u{1F441} View</button>
                <button class="admin-btn admin-btn-ghost" type="button" data-edit-listing="${esc(s.id)}">\u270F\uFE0F Edit</button>
                <button class="admin-btn admin-btn-danger" type="button" data-del-listing="${esc(s.id)}">\u{1F5D1}</button>
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No listings match these filters.</div>'}
        ${pager(n.page,n.pages,"listings")}
      </div>
    `),bindSearch("listingSearch",s=>{_s.listings.search=s,showListings(1)},380),document.getElementById("listingCat")?.addEventListener("change",s=>{_s.listings.category=s.target.value,showListings(1)}),document.querySelectorAll("[data-listing-chip]").forEach(s=>{s.addEventListener("click",()=>{_s.listings.category=s.dataset.listingChip||"",showListings(1)})}),wireInteractiveRows("[data-open-listing]",s=>openViewListing(s.dataset.openListing))}catch(n){content(`<div class="admin-error">${esc(n.message)}</div>`)}}async function showEvents(e){e!==void 0&&(_s.events.page=e);const{page:t,search:i}=_s.events;try{const a=await api(`/api/admin/listings?${new URLSearchParams({page:String(t),limit:String(20),category:"events",search:i})}`);content(`
      ${sectionHero("Events","Create and manage community events.",'<button class="admin-btn admin-btn-primary" data-create-event type="button">\uFF0B Add Event</button>')}
      <div class="ix-stat-grid">
        ${sectionStat("Events",a.total,!0)}
        ${sectionStat("On this page",(a.listings||[]).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="eventSearch" type="search" placeholder="Search events\u2026" value="${esc(i)}">
        <span class="ix-count">${a.total.toLocaleString()} event${a.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(a.listings||[]).length?`<div class="ix-list">
          ${a.listings.map(n=>`
            <article class="ix-row" tabindex="0" role="button" data-open-listing="${esc(n.id)}">
              <div class="ix-icon">\u{1F389}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(n.title)}</div>
                <div class="ix-meta">${esc(n.availability||"Date TBD")} \xB7 ${esc(n.location||"Location TBD")} \xB7 Posted ${fmtDate(n.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-ghost" type="button" data-view-listing="${esc(n.id)}">\u{1F441} View</button>
                <button class="admin-btn admin-btn-ghost" type="button" data-edit-event="${esc(n.id)}">\u270F\uFE0F Edit</button>
                <button class="admin-btn admin-btn-danger" type="button" data-del-event="${esc(n.id)}" data-del-title="${esc(n.title)}">\u{1F5D1}</button>
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No events yet. Add one to get started.</div>'}
        ${pager(a.page,a.pages,"events")}
      </div>
    `),animateStatValues(),bindSearch("eventSearch",n=>{_s.events.search=n,showEvents(1)},380),wireInteractiveRows("[data-open-listing]",n=>openViewListing(n.dataset.openListing))}catch(a){content(`<div class="admin-error">${esc(a.message)}</div>`)}}function eventFormHtml(e={}){return`
    <div class="admin-modal-grid">
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="evTitle">Event title</label>
        <input class="admin-modal-input" id="evTitle" required maxlength="200" value="${esc(e.title||"")}" placeholder="e.g. Nepali New Year Celebration">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="evDesc">Description</label>
        <textarea class="admin-modal-textarea" id="evDesc" rows="5" placeholder="Event details, agenda, speakers\u2026">${esc(e.description||"")}</textarea>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="evDate">Date &amp; Time</label>
        <input class="admin-modal-input" id="evDate" value="${esc(e.availability||"")}" placeholder="e.g. Date, time, and time zone (e.g. May 10 \xB7 5 PM ET)">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="evLocation">Location / Venue</label>
        <input class="admin-modal-input" id="evLocation" value="${esc(e.location||"")}" placeholder="e.g. Boston City Hall, MA">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="evPrice">Price / Admission (optional)</label>
        <input class="admin-modal-input" id="evPrice" value="${esc(e.price||"")}" placeholder="Free, $10, Members only\u2026">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="evPhone">Contact Phone (optional)</label>
        <input class="admin-modal-input" id="evPhone" type="tel" value="${esc(e.contactPhone||"")}" placeholder="+1-555-\u2026">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="evEmail">Contact Email (optional)</label>
        <input class="admin-modal-input" id="evEmail" type="email" value="${esc(e.contactEmail||"")}" placeholder="events@example.com">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="evLink">RSVP / Tickets link (optional)</label>
        <input class="admin-modal-input" id="evLink" type="url" value="${esc(e.externalLink||"")}" placeholder="https://\u2026">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="evTags">Tags (comma-separated) (optional)</label>
        <input class="admin-modal-input" id="evTags" value="${esc((e.tags||[]).join(", "))}" placeholder="puja, concert, fundraiser, networking">
      </div>
    </div>
  `}function collectEventPayload(){return{category:"events",title:document.getElementById("evTitle").value.trim(),description:document.getElementById("evDesc").value.trim(),availability:document.getElementById("evDate").value.trim(),location:document.getElementById("evLocation").value.trim(),price:document.getElementById("evPrice").value.trim(),contactPhone:document.getElementById("evPhone").value.trim(),contactEmail:document.getElementById("evEmail").value.trim(),externalLink:document.getElementById("evLink").value.trim(),tags:document.getElementById("evTags").value.split(",").map(e=>e.trim()).filter(Boolean)}}function openCreateEvent(){openModal("Add Event",eventFormHtml(),async()=>{const e=collectEventPayload();if(!e.title)throw notify("Event title is required.","error"),new Error("validation");await api("/api/listings",{method:"POST",body:JSON.stringify(e)}),showEvents(1),notify("Event created.","success")})}async function openEditEvent(e){let t;try{t=await api(`/api/admin/listings/${encodeURIComponent(e)}`)}catch(i){notify(i.message,"error");return}openModal("Edit Event",`<div class="admin-modal-meta">Posted ${fmtDate(t.createdAt)}</div>${eventFormHtml(t)}`,async()=>{const i=collectEventPayload();if(!i.title)throw notify("Event title is required.","error"),new Error("validation");await api(`/api/admin/listings/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify(i)}),showEvents(1),notify("Event updated.","success")})}const NEWS_CATEGORIES=["","community","nepal","usa","business","immigration","culture","opinion","sports","technology","world"];function newsCategoryLabel(e){return e==="usa"?"USA":capitalize(e||"community")}function newsStatusBadge(e){return badge(e==="published"?"Published":"Draft",e==="published"?"green":"gray")}function formatNewsInline(e){return esc(e||"").replace(/\n/g,"<br>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/\[font=(serif|sans|mono)\]([\s\S]*?)\[\/font\]/g,'<span class="news-font-$1">$2</span>')}function renderNewsMediaBlock(e={}){if(!e.url)return"";const t=e.caption?`<figcaption>${esc(e.caption)}</figcaption>`:"";return`<figure class="admin-news-media">${e.type==="video"?`<video controls preload="metadata" src="${esc(e.url)}"></video>`:`<img src="${esc(e.url)}" alt="${esc(e.caption||"Article image")}">`}${t}</figure>`}function isNewsHtmlBody(e=""){return/<\/?[a-z][\s\S]*>/i.test(String(e||""))}function renderHtmlNewsBody(e="",t=[]){const i=Object.fromEntries((t||[]).map(n=>[n.id,n])),a=document.createElement("div");return a.innerHTML=String(e||""),a.querySelectorAll("p").forEach(n=>{const d=/^\[\[media:([a-zA-Z0-9_-]+)\]\]$/.exec(n.textContent?.trim()||"");if(!d)return;const s=renderNewsMediaBlock(i[d[1]]);if(!s){n.remove();return}const o=document.createElement("template");o.innerHTML=s,n.replaceWith(o.content.cloneNode(!0))}),a.innerHTML}function formatNewsBody(e,t=[]){if(isNewsHtmlBody(e))return renderHtmlNewsBody(e,t);const i=Object.fromEntries((t||[]).map(o=>[o.id,o])),a=String(e||"").split(/\r?\n/),n=[];let d=[];function s(){d.length&&(n.push(`<p>${formatNewsInline(d.join(`
`))}</p>`),d=[])}return a.forEach(o=>{const l=o.trim(),c=/^\[\[media:([a-zA-Z0-9_-]+)\]\]$/.exec(l);if(c){s(),n.push(renderNewsMediaBlock(i[c[1]]));return}if(!l){s();return}if(l.startsWith("## ")){s(),n.push(`<h3>${formatNewsInline(l.slice(3))}</h3>`);return}if(l.startsWith("> ")){s(),n.push(`<blockquote>${formatNewsInline(l.slice(2))}</blockquote>`);return}d.push(o)}),s(),n.join("")}function readFileAsDataUrl(e){return new Promise((t,i)=>{const a=new FileReader;a.onload=()=>t(a.result),a.onerror=()=>i(new Error("Could not read selected file.")),a.readAsDataURL(e)})}async function prepareNewsImage(e){if(e.size<=614400)return readFileAsDataUrl(e);const i=URL.createObjectURL(e);try{const a=new Image;await new Promise((o,l)=>{a.onload=()=>o(),a.onerror=()=>l(new Error(`Could not open ${e.name}. Try a JPG, PNG, or WebP image.`)),a.src=i});const n=document.createElement("canvas"),d=n.getContext("2d");if(!d)throw new Error("Image processing is unavailable in this browser.");let s=Math.min(1,2400/Math.max(a.naturalWidth,a.naturalHeight));for(let o=0;o<6;o++){n.width=Math.max(1,Math.round(a.naturalWidth*s)),n.height=Math.max(1,Math.round(a.naturalHeight*s)),d.fillStyle="#fff",d.fillRect(0,0,n.width,n.height),d.drawImage(a,0,0,n.width,n.height);const l=await new Promise(c=>n.toBlob(c,"image/jpeg",.85));if(!l)throw new Error(`Could not process ${e.name}. Try a different image.`);if(l.size<=614400)return readFileAsDataUrl(new File([l],"news-photo.jpg",{type:"image/jpeg"}));s*=.75}throw new Error(`Could not resize ${e.name}. Try exporting it as a JPG.`)}finally{URL.revokeObjectURL(i)}}function newsMediaTypeFromFile(e){return e?.type?.startsWith("video/")?"video":"image"}function newsMediaLibraryHtml(){return _newsMediaDraft.length?`<div class="admin-news-media-list">
    ${_newsMediaDraft.map(e=>`
      <div class="admin-news-media-item">
        <div class="admin-news-media-thumb">
          ${e.type==="video"?`<video src="${esc(e.url)}" muted></video><span>Video</span>`:`<img src="${esc(e.url)}" alt="${esc(e.caption||"Media image")}"><span>Image</span>`}
        </div>
        <div class="admin-news-media-meta">
          <input class="admin-modal-input" data-news-media-caption="${esc(e.id)}" value="${esc(e.caption||"")}" placeholder="Caption">
          <small>Click in your story, then insert here.</small>
        </div>
        <div class="admin-news-media-actions">
          <button class="admin-btn admin-btn-ghost" type="button" data-insert-news-media="${esc(e.id)}">Insert at cursor</button>
          <button class="admin-btn admin-btn-danger" type="button" data-remove-news-media="${esc(e.id)}">Remove</button>
        </div>
      </div>
    `).join("")}
  </div>`:'<div class="admin-empty admin-empty-compact">No story media yet. Upload images or videos, then insert them into the article body.</div>'}function renderNewsMediaLibrary(){const e=document.getElementById("newsMediaLibrary");e&&(e.innerHTML=newsMediaLibraryHtml())}function insertIntoNewsBody(e,t=""){const i=document.getElementById("newsBody");if(!i)return;const a=i.selectionStart??i.value.length,n=i.selectionEnd??i.value.length,d=i.value.slice(a,n);i.value=`${i.value.slice(0,a)}${e}${d||""}${t}${i.value.slice(n)}`;const s=d?a+e.length+d.length+t.length:a+e.length;i.focus(),i.setSelectionRange(s,s)}async function uploadNewsMedia(e){const t=newsMediaTypeFromFile(e),i=t==="image"?await prepareNewsImage(e):await readFileAsDataUrl(e),a=JSON.stringify({type:t,url:i});if(!_newsEditorState||new Blob([a]).size>_newsEditorState.maxRequestBytes)throw new Error(`${e.name} exceeds this server's upload limit. Choose a smaller file.`);return(await api("/api/admin/news/media",{method:"POST",body:a})).media}async function runNewsMediaTask(e){const t=_newsEditorState;if(!t||t.pending||t.saving){notify("Wait for the current upload or save to finish.","error");return}t.pending=!0;const i=document.querySelector(".news-editor-shell"),a=document.getElementById("adminModalSave");i&&(i.inert=!0),a&&(a.disabled=!0);const n=document.getElementById("newsDraftStatus");n&&(n.textContent="Uploading media\u2026 Please keep this page open.");try{await e()}catch(d){notify(d.message||"Media upload failed. Try again.","error")}finally{t.pending=!1,i&&(i.inert=!1),a&&(a.disabled=!1),persistNewsDraft()}}async function collectNewsPayload(){window.BiscoonNewsEditor?.sync?.();let e=document.getElementById("newsImageUrl")?.value.trim()||"";if(_newsEditorState?.pending)throw new Error("Wait for media uploads to finish before saving.");return{title:document.getElementById("newsTitle")?.value.trim(),category:document.getElementById("newsCategory")?.value,summary:document.getElementById("newsSummary")?.value.trim(),body:document.getElementById("newsBody")?.value.trim(),imageUrl:e,sourceName:document.getElementById("newsSource")?.value.trim(),authorName:document.getElementById("newsAuthor")?.value.trim(),status:document.getElementById("newsStatus")?.value,featured:!!document.getElementById("newsFeatured")?.checked,media:_newsMediaDraft.map(t=>({id:t.id,type:t.type,url:t.url,caption:t.caption||"",createdAt:t.createdAt||new Date().toISOString()}))}}function newsFormHtml(e={}){const t=e.status||"draft",i=e.category||"community",a=e.title||"",n=e.summary||"";return`
    <div class="news-compose-intro"><div><span class="news-compose-eyebrow">BISCOON NEWSROOM</span><h3>A story worth sharing.</h3><p>Give your community the context, details, and voices that matter.</p></div><span class="news-compose-note">Write \xB7 Preview \xB7 Publish</span></div>
    <div class="news-editor-shell">
      <div class="news-editor-main">
        <div class="news-editor-section">
          <div class="news-editor-section-label">01 / The headline</div>
          <div class="admin-modal-field admin-modal-full">
            <div class="news-field-head">
              <label class="admin-modal-label" for="newsTitle">Headline</label>
              <span class="news-char-count" id="newsTitleCount">${a.length}/180</span>
            </div>
            <input class="admin-modal-input news-headline-input" id="newsTitle" aria-required="true" maxlength="180" value="${esc(a)}" placeholder="Write a clear, specific headline\u2026">
          </div>
          <div class="admin-modal-field admin-modal-full">
            <div class="news-field-head">
              <label class="admin-modal-label" for="newsSummary">Short summary</label>
              <span class="news-char-count" id="newsSummaryCount">${n.length}/360</span>
            </div>
            <textarea class="admin-modal-textarea" id="newsSummary" aria-required="true" rows="3" maxlength="360" placeholder="What happened, and why does it matter?">${esc(n)}</textarea>
          </div>
        </div>

        <div class="news-editor-section">
          <div class="news-editor-section-label">02 / Tell the story</div>
          <div class="admin-news-formatbar" role="toolbar" aria-label="Article formatting">
            <div class="admin-news-format-group">
              <button type="button" class="admin-news-format-btn" id="newsAddInlineImages">\uFF0B Add images</button>
              <input id="newsInlineImages" type="file" accept="image/*" multiple hidden aria-label="Insert images into story">
            </div>
            <div class="admin-news-format-group">
              <button type="button" class="admin-news-format-btn" data-news-format="bold" title="Bold (\u2318B)" aria-pressed="false"><strong>B</strong></button>
              <button type="button" class="admin-news-format-btn" data-news-format="italic" title="Italic (\u2318I)" aria-pressed="false"><em>I</em></button>
              <button type="button" class="admin-news-format-btn" data-news-format="h2" title="Heading" aria-pressed="false">H2</button>
              <button type="button" class="admin-news-format-btn" data-news-format="quote" title="Quote" aria-pressed="false">\u201C\u201D</button>
            </div>
            <div class="admin-news-format-group">
              <button type="button" class="admin-news-format-btn" data-news-format="bullet" title="Bullet list" aria-pressed="false">\u2022 List</button>
              <button type="button" class="admin-news-format-btn" data-news-format="ordered" title="Numbered list" aria-pressed="false">1. List</button>
            </div>
            <div class="admin-news-format-group">
              <button type="button" class="admin-news-format-btn" data-news-format="font-serif" title="Serif font" aria-pressed="false" style="font-family:Georgia,serif">Serif</button>
              <button type="button" class="admin-news-format-btn" data-news-format="font-sans" title="Sans font" aria-pressed="false">Sans</button>
              <button type="button" class="admin-news-format-btn" data-news-format="font-mono" title="Mono font" aria-pressed="false" style="font-family:monospace">Mono</button>
            </div>
            <div class="admin-news-format-group">
              <button type="button" class="admin-news-format-btn" data-news-format="undo" title="Undo">\u21B6</button>
              <button type="button" class="admin-news-format-btn" data-news-format="redo" title="Redo">\u21B7</button>
              <button type="button" class="admin-news-format-btn" data-news-format="clear" title="Clear formatting">Clear</button>
            </div>
          </div>
          <div class="admin-news-rich-editor" id="newsRichEditor"></div>
          <div class="admin-news-editor-hint"><span id="newsWritingStats">0 words \xB7 0 min read</span><span>Click between paragraphs, then Add images. Select text to format it.</span></div>
          <textarea class="admin-modal-textarea admin-news-hidden-body" id="newsBody" rows="12">${esc(e.body||"")}</textarea>
        </div>
        <details class="news-editor-section news-media-details">
          <summary class="news-editor-section-label">Add a cover image <span>Optional</span></summary>
          <div class="news-dropzone" id="newsCoverDrop" tabindex="0">
            <div class="news-dropzone-preview" id="newsCoverPreview">
              ${e.imageUrl?`<img src="${esc(e.imageUrl)}" alt="${esc(e.title||"Cover image")}">`:'<div class="news-dropzone-empty">Drop an image here, paste a URL, or choose a file</div>'}
            </div>
            <div class="news-dropzone-actions">
              <input class="admin-modal-input" id="newsImageUrl" aria-label="Cover image URL" value="${esc(e.imageUrl||"")}" placeholder="https://\u2026 or leave blank">
              <label class="admin-btn admin-btn-ghost news-file-btn">
                Choose file
                <input id="newsImageFile" aria-label="Upload cover image" type="file" accept="image/*" hidden>
              </label>
            </div>
          </div>
        </details>

        <details class="news-editor-section news-media-details">
          <summary class="news-editor-section-label">Add photos & videos <span>Optional</span></summary>
          <div class="news-dropzone news-dropzone-media" id="newsMediaDrop" tabindex="0">
            <div class="news-dropzone-empty">Add multiple photos or videos. Large photos are resized automatically.</div>
            <label class="admin-btn admin-btn-ghost news-file-btn">
              Choose files
              <input id="newsMediaFiles" aria-label="Upload story photos or videos" type="file" accept="image/*,video/*" multiple hidden>
            </label>
          </div>
          <div id="newsMediaLibrary">${newsMediaLibraryHtml()}</div>
        </details>

      </div>

      <aside class="news-editor-preview">
        <div class="news-editor-section">
          <div class="news-editor-section-label">Ready when you are</div>
          <div class="news-pill-row" role="group" aria-label="Status">
            <button type="button" class="news-pill${t==="draft"?" active":""}" data-news-status-pill="draft" aria-pressed="${t==="draft"}">Save as draft</button>
            <button type="button" class="news-pill${t==="published"?" active":""}" data-news-status-pill="published" aria-pressed="${t==="published"}">Publish to news</button>
          </div>
          <p class="news-publish-help" id="newsPublishHelp">${t==="published"?"Saving makes this story visible on the news page.":"Only admins can see drafts. Publish when your story is ready."}</p><input type="hidden" id="newsStatus" value="${esc(t)}">

          <div class="news-editor-section-label">Choose a desk</div><div class="news-chip-row" role="group" aria-label="Category">
            ${NEWS_CATEGORIES.filter(Boolean).map(d=>`
              <button type="button" class="news-chip${d===i?" active":""}" data-news-category-chip="${esc(d)}">${esc(newsCategoryLabel(d))}</button>
            `).join("")}
          </div>
          <input type="hidden" id="newsCategory" value="${esc(i)}">

          <label class="news-featured-toggle">
            <input type="checkbox" id="newsFeatured"${e.featured?" checked":""}>
            <span class="news-featured-ui">
              <strong>\u2605 Feature this story</strong>
              <small>Highlight in Trending. Not required to appear in news.</small>
            </span>
          </label>

          <div class="admin-modal-grid" style="margin-top:12px">
            <div class="admin-modal-field">
              <label class="admin-modal-label" for="newsSource">Source</label>
              <input class="admin-modal-input" id="newsSource" value="${esc(e.sourceName||"Biscoon Newsroom")}">
            </div>
            <div class="admin-modal-field">
              <label class="admin-modal-label" for="newsAuthor">Author</label>
              <input class="admin-modal-input" id="newsAuthor" value="${esc(e.authorName||"")}" placeholder="Optional">
            </div>
          </div>
        </div>


        <div class="news-preview-label">Your story at a glance</div>
        <div class="news-preview-card news-preview-trigger" id="newsFullPreviewTrigger" role="button" tabindex="0" aria-haspopup="dialog" aria-label="Preview the full story">
          <div class="news-preview-cover" id="newsPreviewCover">
            ${e.imageUrl?`<img src="${esc(e.imageUrl)}" alt="${esc(e.title||"Cover image")}">`:"<span>Cover preview</span>"}
          </div>
          <div class="news-preview-badges">
            <span class="admin-badge admin-badge-blue" id="newsPreviewCategory">${esc(newsCategoryLabel(i))}</span>
            <span class="admin-badge ${t==="published"?"admin-badge-green":"admin-badge-gray"}" id="newsPreviewStatus">${esc(capitalize(t))}</span>
            <span class="admin-badge admin-badge-red" id="newsPreviewFeatured" style="display:${e.featured?"":"none"}">Featured</span>
          </div>
          <h3 class="news-preview-title" id="newsPreviewTitle">${esc(a||"Your headline appears here")}</h3>
          <p class="news-preview-summary" id="newsPreviewSummary">${esc(n||"Your short summary appears here as you write.")}</p>
          <div class="news-preview-byline" id="newsPreviewByline">${esc(e.sourceName||"Biscoon Newsroom")}${e.authorName?" \xB7 "+esc(e.authorName):""}</div>
        </div>
        <div class="news-preview-hint">Click the card to preview your full story \u2192</div><p class="news-preview-hint" id="newsDraftStatus" role="status">No unsaved changes</p>
      </aside>
    </div>
  `}function openNewsFullPreview(){if(document.getElementById("newsFullPreview"))return;window.BiscoonNewsEditor?.sync?.();const e=n=>document.getElementById(n)?.value.trim()||"",t=e("newsTitle")||"Your headline appears here",i=e("newsImageUrl")||_newsMediaDraft.find(n=>n.type==="image")?.url||"",a=document.createElement("dialog");a.id="newsFullPreview",a.className="news-full-preview",a.setAttribute("aria-labelledby","newsFullPreviewLabel"),a.innerHTML=`
    <header class="news-full-preview-toolbar">
      <div><strong id="newsFullPreviewLabel">Story preview</strong><small>Preview only \xB7 Your edits have not been saved</small></div>
      <button class="admin-btn admin-btn-ghost" type="button" data-close-full-preview autofocus>\u2190 Back to editing</button>
    </header>
    <article class="news-full-preview-article">
      <div class="news-compose-eyebrow">${esc(newsCategoryLabel(e("newsCategory")))}</div>
      <h1>${esc(t)}</h1>
      <div class="news-preview-byline">${esc(e("newsSource")||"Biscoon Newsroom")}${e("newsAuthor")?` \xB7 By ${esc(e("newsAuthor"))}`:""}</div>
      ${i?`<img class="news-full-preview-cover" src="${esc(i)}" alt="${esc(t)}">`:""}
      <p class="news-full-preview-summary">${esc(e("newsSummary")||"Your short summary appears here.")}</p>
      <div class="admin-news-body">${formatNewsBody(e("newsBody"),_newsMediaDraft)||"<p>Your story will appear here as you write.</p>"}</div>
    </article>`,a.querySelector("[data-close-full-preview]")?.addEventListener("click",()=>a.close()),a.addEventListener("keydown",n=>{n.key==="Escape"&&n.stopPropagation()}),a.addEventListener("close",()=>{a.remove(),document.getElementById("newsFullPreviewTrigger")?.focus()}),document.getElementById("adminModalOverlay")?.appendChild(a),a.showModal()}function wireNewsEditorInteractivity(){const e=document.getElementById("newsFullPreviewTrigger");e?.addEventListener("click",openNewsFullPreview),e?.addEventListener("keydown",p=>{(p.key==="Enter"||p.key===" ")&&(p.preventDefault(),openNewsFullPreview())});const t=document.getElementById("newsTitle"),i=document.getElementById("newsSummary"),a=document.getElementById("newsSource"),n=document.getElementById("newsAuthor"),d=document.getElementById("newsImageUrl"),s=document.getElementById("newsImageFile"),o=document.getElementById("newsFeatured"),l=document.getElementById("newsStatus"),c=document.getElementById("newsCategory"),u=document.getElementById("adminModalSave"),r=document.getElementById("newsPreviewTitle"),y=document.getElementById("newsPreviewSummary"),E=document.getElementById("newsPreviewByline"),x=document.getElementById("newsPreviewCategory"),S=document.getElementById("newsPreviewStatus"),B=document.getElementById("newsPreviewFeatured"),A=document.getElementById("newsPreviewCover"),H=document.getElementById("newsCoverPreview"),v=document.getElementById("newsTitleCount"),h=document.getElementById("newsSummaryCount");function L(p){const g=esc(t?.value.trim()||"Cover image"),b=p?`<img src="${esc(p)}" alt="${g}">`:'<div class="news-dropzone-empty">Drop an image here, paste a URL, or choose a file</div>';H&&(H.innerHTML=b),A&&(A.innerHTML=p?`<img src="${esc(p)}" alt="${g}">`:"<span>Cover preview</span>")}function f(){if(r&&(r.textContent=t?.value.trim()||"Your headline appears here"),y&&(y.textContent=i?.value.trim()||"Your short summary appears here as you write."),v&&(v.textContent=`${t?.value.length||0}/180`),h&&(h.textContent=`${i?.value.length||0}/360`),E){const p=a?.value.trim()||"Biscoon Newsroom",g=n?.value.trim();E.textContent=g?`${p} \xB7 ${g}`:p}x&&c&&(x.textContent=newsCategoryLabel(c.value)),S&&l&&(S.textContent=capitalize(l.value||"draft"),S.className=`admin-badge ${l.value==="published"?"admin-badge-green":"admin-badge-gray"}`),B&&(B.style.display=o?.checked?"":"none"),u&&l&&(u.textContent=l.value==="published"?u.disabled?"Saving\u2026":"Publish Story":u.disabled?"Saving\u2026":"Save Draft")}function $(){const p=document.getElementById("newsBody"),g=document.createElement("div");g.innerHTML=p?.value||"";const b=(g.textContent||"").trim().split(/\s+/).filter(Boolean).length,w=document.getElementById("newsWritingStats");w&&(w.textContent=`${b} words \xB7 ${Math.ceil(b/200)} min read`)}document.getElementById("newsRichEditor")?.addEventListener("input",()=>{window.BiscoonNewsEditor?.sync?.(),$()}),$(),document.getElementById("newsAddInlineImages")?.addEventListener("click",()=>{document.getElementById("newsInlineImages")?.click()}),t?.addEventListener("input",f),i?.addEventListener("input",f),a?.addEventListener("input",f),n?.addEventListener("input",f),o?.addEventListener("change",f),document.querySelectorAll("[data-news-status-pill]").forEach(p=>{p.addEventListener("click",()=>{const g=p.dataset.newsStatusPill||"draft";l&&(l.value=g),document.querySelectorAll("[data-news-status-pill]").forEach(w=>{w.classList.toggle("active",w===p),w.setAttribute("aria-pressed",String(w===p))});const b=document.getElementById("newsPublishHelp");b&&(b.textContent=g==="published"?"Saving makes this story visible on the news page.":"Only admins can see drafts. Publish when your story is ready."),f()})}),document.querySelectorAll("[data-news-category-chip]").forEach(p=>{p.addEventListener("click",()=>{const g=p.dataset.newsCategoryChip||"community";c&&(c.value=g),document.querySelectorAll("[data-news-category-chip]").forEach(b=>b.classList.toggle("active",b===p)),f()})}),d?.addEventListener("input",()=>{L(d.value.trim())}),s?.addEventListener("change",async()=>{const p=s.files?.[0];if(p)try{await runNewsMediaTask(async()=>{const g=await uploadNewsMedia(p);d&&(d.value=g.url),s&&(s.value=""),L(g.url)})}catch(g){notify(g.message||"Could not read image.","error")}});function M(p,g){const b=document.getElementById(p);b&&(["dragenter","dragover"].forEach(w=>{b.addEventListener(w,C=>{C.preventDefault(),b.classList.add("is-dragover")})}),["dragleave","drop"].forEach(w=>{b.addEventListener(w,C=>{C.preventDefault(),b.classList.remove("is-dragover")})}),b.addEventListener("drop",w=>{const C=w.dataTransfer?.files;C?.length&&g(C)}))}M("newsCoverDrop",async p=>{const g=p[0];if(!g||!g.type.startsWith("image/")){notify("Please drop an image file.","error");return}try{await runNewsMediaTask(async()=>{const b=await uploadNewsMedia(g);d&&(d.value=b.url),s&&(s.value=""),L(b.url)})}catch(b){notify(b.message||"Could not read image.","error")}}),M("newsMediaDrop",p=>{const g=document.getElementById("newsMediaFiles");if(!g)return;const b=new DataTransfer;Array.from(p).forEach(w=>b.items.add(w)),g.files=b.files,g.dispatchEvent(new Event("change",{bubbles:!0}))}),f()}async function showNews(e){e!==void 0&&(_s.news.page=e);const{page:t,status:i,category:a,search:n,featured:d,range:s}=_s.news;try{const o=new URLSearchParams({page:String(t),limit:String(20),status:i,category:a,search:n,featured:d,range:s}),l=await api(`/api/admin/news?${o}`),c=l.summary||{all:l.total,published:0,draft:0,featured:0};content(`
      <div class="news-hero">
        <div class="news-hero-copy">
          <div class="news-hero-title">Newsroom</div>
          <div class="news-hero-sub">Draft, publish, feature, and moderate stories. Click a card or row to jump in.</div>
        </div>
        <div class="dash-header-actions">
          <div class="dash-range" role="tablist" aria-label="News time range">
            ${DASH_RANGES.map(r=>`
              <button type="button" class="dash-range-btn${r.value===s?" active":""}" data-news-range="${r.value}" role="tab" aria-selected="${r.value===s}">${r.label}</button>
            `).join("")}
          </div>
          <button class="admin-btn admin-btn-primary" data-create-news type="button">+ Publish News</button>
        </div>
      </div>

      <div class="news-stat-grid">
        <button type="button" class="news-stat-card${i==="all"&&d==="all"?" active":""}" data-news-filter-status="all" data-news-filter-featured="all">
          <span class="news-stat-value" data-count-to="${c.all||0}">0</span>
          <span class="news-stat-label">All stories</span>
        </button>
        <button type="button" class="news-stat-card${i==="published"?" active":""}" data-news-filter-status="published" data-news-filter-featured="all">
          <span class="news-stat-value" data-count-to="${c.published||0}">0</span>
          <span class="news-stat-label">Published</span>
        </button>
        <button type="button" class="news-stat-card${i==="draft"?" active":""}" data-news-filter-status="draft" data-news-filter-featured="all">
          <span class="news-stat-value" data-count-to="${c.draft||0}">0</span>
          <span class="news-stat-label">Drafts</span>
        </button>
        <button type="button" class="news-stat-card${d==="yes"?" active":""}" data-news-filter-status="all" data-news-filter-featured="yes">
          <span class="news-stat-value" data-count-to="${c.featured||0}">0</span>
          <span class="news-stat-label">Featured</span>
        </button>
      </div>

      <div class="admin-toolbar news-toolbar">
        <input class="admin-search" id="newsSearch" type="search" placeholder="Search news\u2026" value="${esc(n)}">
        <div class="admin-tabs" role="tablist">
          ${[{value:"all",label:"All"},{value:"published",label:"Published"},{value:"draft",label:"Draft"}].map(r=>`<button type="button" class="admin-tab${i===r.value?" active":""}" data-news-status-tab="${r.value}">${r.label}</button>`).join("")}
        </div>
        <select class="admin-select" id="newsCategoryFilter">
          ${NEWS_CATEGORIES.map(r=>`<option value="${esc(r)}"${r===a?" selected":""}>${r?newsCategoryLabel(r):"All categories"}</option>`).join("")}
        </select>
        <button type="button" class="admin-btn${d==="yes"?" admin-btn-primary":" admin-btn-ghost"}" data-news-featured-toggle aria-pressed="${d==="yes"}">\u2605 Featured only</button>
        <span class="news-toolbar-count">${l.total.toLocaleString()} stor${l.total===1?"y":"ies"}</span>
      </div>

      <div class="admin-card news-table-card">
        ${l.news.length?`
          <div class="news-list">
            ${l.news.map(r=>`
              <article class="news-row" data-news-open="${esc(r.id)}" tabindex="0" role="button">
                <div class="news-row-thumb">
                  ${r.imageUrl?`<img src="${esc(r.imageUrl)}" alt="${esc(r.title||"News")}" loading="lazy">`:`<span>${esc((r.title||"N").charAt(0).toUpperCase())}</span>`}
                </div>
                <div class="news-row-body">
                  <div class="news-row-title">${esc(r.title)}</div>
                  <div class="news-row-meta">
                    ${badge(newsCategoryLabel(r.category),"blue")}
                    ${newsStatusBadge(r.status)}
                    ${r.featured?badge("Featured","red"):""}
                    <span class="admin-muted">${r.publishedAt?fmtDate(r.publishedAt):"Not published"}</span>
                  </div>
                  ${r.summary?`<div class="news-row-summary">${esc(r.summary)}</div>`:""}
                </div>
                <div class="news-row-actions">
                  <button class="admin-btn admin-btn-ghost" type="button" data-toggle-news-featured="${esc(r.id)}" data-featured="${r.featured?"1":"0"}" title="Toggle featured">${r.featured?"\u2605":"\u2606"}</button>
                  <button class="admin-btn admin-btn-ghost" type="button" data-toggle-news-status="${esc(r.id)}" data-status="${esc(r.status||"draft")}" title="Toggle publish">${r.status==="published"?"Unpublish":"Publish"}</button>
                  <button class="admin-btn admin-btn-ghost" type="button" data-edit-news="${esc(r.id)}">\u270F\uFE0F Edit</button>
                  <button class="admin-btn admin-btn-danger" type="button" data-del-news="${esc(r.id)}" data-del-title="${esc(r.title)}">\u{1F5D1}</button>
                </div>
              </article>
            `).join("")}
          </div>
        `:'<div class="admin-empty">No stories match these filters.</div>'}
        ${pager(l.page,l.pages,"news")}
      </div>
    `),animateStatValues();let u;document.getElementById("newsSearch")?.addEventListener("input",r=>{clearTimeout(u),u=setTimeout(()=>{_s.news.search=r.target.value.trim(),showNews(1)},350)}),document.getElementById("newsCategoryFilter")?.addEventListener("change",r=>{_s.news.category=r.target.value,showNews(1)}),document.querySelectorAll("[data-news-range]").forEach(r=>{r.addEventListener("click",()=>{const y=r.dataset.newsRange;!y||y===_s.news.range||(_s.news.range=y,showNews(1))})}),document.querySelectorAll("[data-news-filter-status]").forEach(r=>{r.addEventListener("click",()=>{_s.news.status=r.dataset.newsFilterStatus||"all",_s.news.featured=r.dataset.newsFilterFeatured||"all",showNews(1)})}),document.querySelectorAll("[data-news-status-tab]").forEach(r=>{r.addEventListener("click",()=>{_s.news.status=r.dataset.newsStatusTab||"all",showNews(1)})}),document.querySelectorAll("[data-news-featured-toggle]").forEach(r=>{r.addEventListener("click",()=>{_s.news.featured=_s.news.featured==="yes"?"all":"yes",showNews(1)})}),document.querySelectorAll(".news-row").forEach(r=>{const y=()=>openViewNews(r.dataset.newsOpen);r.addEventListener("click",E=>{E.target.closest(".news-row-actions")||y()}),r.addEventListener("keydown",E=>{(E.key==="Enter"||E.key===" ")&&(E.preventDefault(),y())})})}catch(o){content(`<div class="admin-error">${esc(o.message)}</div>`)}}async function openViewNews(e){let t;try{t=await api(`/api/admin/news/${encodeURIComponent(e)}`)}catch(a){notify(a.message,"error");return}const i=t.article;openModal(esc(i.title),`
    <div class="admin-modal-meta" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      ${badge(newsCategoryLabel(i.category),"blue")}
      ${newsStatusBadge(i.status)}
      ${i.featured?badge("Featured","red"):""}
      <span>${esc(i.sourceName||"Biscoon Newsroom")}</span>
      ${i.authorName?`<span>By ${esc(i.authorName)}</span>`:""}
      <span style="margin-left:auto;font-size:12px">${i.publishedAt?`Published ${fmtDate(i.publishedAt)}`:`Updated ${fmtDate(i.updatedAt)}`}</span>
    </div>
    ${i.imageUrl?`<img src="${esc(i.imageUrl)}" alt="${esc(i.title||"News")}" class="admin-news-preview">`:""}
    <div class="admin-view-desc" style="margin-top:12px">${esc(i.summary)}</div>
    <div class="admin-news-body">${formatNewsBody(i.body,i.media||[])}</div>
    <div class="admin-view-actions">
      <button class="admin-btn" style="background:#E63946;color:#fff;border-color:#E63946" data-edit-news="${esc(i.id)}">\u270F\uFE0F Edit News</button>
      <button class="admin-btn admin-btn-danger" data-del-news="${esc(i.id)}" data-del-title="${esc(i.title)}">\u{1F5D1} Delete</button>
    </div>
  `,null)}async function openNewsEditor(e=""){if(!closeModal())return;let t={},i;try{i=(await api("/api/admin/news/media-limits")).maxRequestBytes,e&&(t=(await api(`/api/admin/news/${encodeURIComponent(e)}`)).article)}catch(s){notify(s.message,"error");return}const a=`biscoon-news-draft:${_me?.id||"session"}:${e||"new"}`;let n=!1;try{const s=sessionStorage.getItem(a);s&&window.confirm("Restore your unsaved news draft from this tab?")?(t={...t,...JSON.parse(s)},n=!0):s&&sessionStorage.removeItem(a)}catch{}_newsMediaDraft=(t.media||[]).map(s=>({...s})),openModal(e?"Edit News Story":"Create News Story",newsFormHtml(t),async()=>{const s=_newsEditorState;if(!s||s.pending)throw new Error("Wait for media uploads to finish before saving.");s.saving=!0;const o=document.querySelector(".news-editor-shell");o&&(o.inert=!0);try{const l=JSON.stringify(await collectNewsPayload());if(new Blob([l]).size>s.maxRequestBytes)throw new Error("This story exceeds the upload limit. Remove some media or shorten the story.");await api(e?`/api/admin/news/${encodeURIComponent(e)}`:"/api/admin/news",{method:e?"PUT":"POST",body:l}),s.baseline=newsDraftSnapshot();try{sessionStorage.removeItem(a)}catch{}showNews(1)}finally{s.saving=!1,o&&(o.inert=!1)}}),_newsEditorState={key:a,baseline:"",saving:!1,pending:!1,maxRequestBytes:i};const d=document.getElementById("adminModalOverlay");d?.querySelector(".admin-modal")?.classList.add("admin-modal-wide"),requestAnimationFrame(()=>{!d?.isConnected||!_newsEditorState||(window.BiscoonNewsEditor?.mount?.({element:"#newsRichEditor",textarea:"#newsBody",media:()=>_newsMediaDraft}),wireNewsEditorInteractivity(),_newsEditorState.baseline=n?"":newsDraftSnapshot(),persistNewsDraft())})}async function showDiscussions(e){e!==void 0&&(_s.discussions.page=e);const{page:t,search:i}=_s.discussions;try{const a=await api(`/api/admin/discussions?${new URLSearchParams({page:String(t),limit:"20",search:i})}`),n=(a.discussions||[]).reduce((d,s)=>d+(s.commentCount||0),0);content(`
      ${sectionHero("Discussions","Moderate community threads. Click a row to open.",'<button class="admin-btn admin-btn-primary" data-create-discussion type="button">+ Add Discussion</button>')}
      <div class="ix-stat-grid">
        ${sectionStat("Discussions",a.total,!0)}
        ${sectionStat("Comments (page)",n)}
        ${sectionStat("On this page",(a.discussions||[]).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="discussionSearch" type="search" placeholder="Search discussions\u2026" value="${esc(i)}">
        <span class="ix-count">${a.total.toLocaleString()} discussion${a.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(a.discussions||[]).length?`<div class="ix-list">
          ${a.discussions.map(d=>`
            <article class="ix-row" tabindex="0" role="button" data-open-discussion="${esc(d.id)}">
              <div class="ix-icon">\u{1F4AC}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(d.title)}</div>
                <div class="ix-meta">${esc(d.authorName)} \xB7 ${badge(d.category)} \xB7 ${d.commentCount||0} comments \xB7 ${fmtDate(d.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-ghost" type="button" data-view-discussion="${esc(d.id)}">\u{1F441} View</button>
                <button class="admin-btn admin-btn-ghost" type="button" data-edit-discussion="${esc(d.id)}">\u270F\uFE0F Edit</button>
                <button class="admin-btn admin-btn-danger" type="button" data-del-discussion="${esc(d.id)}">\u{1F5D1}</button>
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No discussions found.</div>'}
        ${pager(a.page,a.pages,"discussions")}
      </div>
    `),animateStatValues(),bindSearch("discussionSearch",d=>{_s.discussions.search=d,showDiscussions(1)},380),wireInteractiveRows("[data-open-discussion]",d=>{d.querySelector("[data-view-discussion]")?.click()})}catch(a){content(`<div class="admin-error">${esc(a.message)}</div>`)}}async function showComments(e){e!==void 0&&(_s.comments.page=e);const{page:t,type:i,search:a}=_s.comments;try{const n=await api(`/api/admin/comments?${new URLSearchParams({page:String(t),limit:String(25),type:i,search:a})}`),d=(n.comments||[]).filter(o=>o.parentType==="listing").length,s=(n.comments||[]).filter(o=>o.parentType==="discussion").length;content(`
      ${sectionHero("Comments","Moderate user comments across listings and discussions.",tabs([{label:"All",value:"all"},{label:"Listing Comments",value:"listing"},{label:"Discussion Comments",value:"discussion"}],i,"comment-type"))}
      <div class="ix-stat-grid">
        ${sectionStat("Total",n.total,i==="all")}
        ${sectionStat("Listings (page)",d,i==="listing")}
        ${sectionStat("Discussions (page)",s,i==="discussion")}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="commentSearch" type="search" placeholder="Search comments\u2026" value="${esc(a)}">
        <span class="ix-count">${n.total.toLocaleString()} comment${n.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(n.comments||[]).length?`<div class="ix-list">
          ${n.comments.map(o=>`
            <article class="ix-row ix-row-static">
              <div class="ix-icon">${o.parentType==="listing"?"\u{1F4CB}":"\u{1F4AC}"}</div>
              <div class="ix-body">
                <div class="ix-title">${esc((o.body||"").slice(0,160))}${(o.body||"").length>160?"\u2026":""}</div>
                <div class="ix-meta">${esc(o.authorName)} \xB7 on ${esc(o.parentTitle)} \xB7 ${badge(o.parentType,o.parentType==="listing"?"green":"blue")} \xB7 ${fmtDate(o.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-danger" type="button" data-del-comment data-comment-id="${esc(o.id)}" data-parent-id="${esc(o.parentId)}" data-parent-type="${esc(o.parentType)}">\u{1F5D1} Remove</button>
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No comments match these filters.</div>'}
        ${pager(n.page,n.pages,"comments")}
      </div>
    `),animateStatValues(),bindSearch("commentSearch",o=>{_s.comments.search=o,showComments(1)},380)}catch(n){content(`<div class="admin-error">${esc(n.message)}</div>`)}}async function showReports(e){e!==void 0&&(_s.reports.page=e);const{page:t,status:i}=_s.reports;try{const a=await api(`/api/admin/reports?${new URLSearchParams({page:String(t),limit:String(25),status:i})}`);content(`
      ${sectionHero("Reports","Triage abuse reports. Change status inline without leaving the list.",tabs([{label:"Open",value:"open"},{label:"Reviewing",value:"reviewing"},{label:"Resolved",value:"resolved"},{label:"Dismissed",value:"dismissed"},{label:"All",value:"all"}],i,"report-status"))}
      <div class="ix-stat-grid">
        ${sectionStat("In filter",a.total,!0)}
        ${sectionStat("On this page",(a.reports||[]).length)}
      </div>
      <div class="admin-card ix-card">
        ${(a.reports||[]).length?`<div class="ix-list">
          ${a.reports.map(n=>`
            <article class="ix-row ix-row-static">
              <div class="ix-icon">${n.reason==="scam"||n.reason==="illegal"?"\u{1F6A8}":"\u2691"}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(n.targetType)} \xB7 ${badge(n.reason,n.reason==="scam"||n.reason==="illegal"?"red":"blue")} ${badge(n.status,n.status==="open"?"red":n.status==="resolved"?"green":"gray")}</div>
                <div class="ix-meta">Reporter ${esc(n.reporterName||n.reporterId)} \xB7 ${fmtDate(n.createdAt)} \xB7 <span class="admin-muted">${esc(n.targetId)}</span></div>
                <div class="ix-sub">${esc(n.details||"No details provided.")}</div>
              </div>
              <div class="ix-actions">
                <select class="admin-select-sm" data-report-status-update="${esc(n.id)}" aria-label="Report status">
                  ${["open","reviewing","resolved","dismissed"].map(d=>`<option value="${d}"${d===n.status?" selected":""}>${capitalize(d)}</option>`).join("")}
                </select>
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No reports in this status.</div>'}
        ${pager(a.page,a.pages,"reports")}
      </div>
    `),animateStatValues()}catch(a){content(`<div class="admin-error">${esc(a.message)}</div>`)}}const AUDIT_ACTIONS=["all","admin_user.created","admin_user.updated","admin_user.deleted","regular_user.deleted","news.created","news.updated","news.deleted","listing.updated","listing.deleted","discussion.created","discussion.updated","discussion.deleted","report.status_updated","listing_comment.deleted","discussion_comment.deleted","announcement.created","announcement.toggled","announcement.deleted"],AUDIT_TARGET_TYPES=["all","staff","user","news","listing","discussion","report","listing_comment","discussion_comment","announcement"];function auditLabel(e){return readableLabel(e).replace(/\bId\b/g,"ID")}function auditActionBadge(e){const t=e.includes("deleted")?"red":e.includes("created")?"green":e.includes("updated")||e.includes("toggled")?"blue":"gray";return badge(auditLabel(e),t)}async function showAuditLogs(e){if(!canManageStaff()){content('<div class="admin-error">Super admin access is required to view audit logs.</div>');return}e!==void 0&&(_s.audit.page=e);const{page:t,action:i,targetType:a,search:n}=_s.audit;try{const d=await api(`/api/admin/audit-logs?${new URLSearchParams({page:String(t),limit:"25",action:i,targetType:a,search:n})}`);content(`
      ${sectionHero("Audit Logs","Trace admin actions across the platform.")}
      <div class="ix-stat-grid">
        ${sectionStat("Events",d.total,!0)}
        ${sectionStat("On this page",(d.auditLogs||[]).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="auditSearch" type="search" placeholder="Search actor, target, or action\u2026" value="${esc(n)}">
        <select class="admin-select" id="auditActionFilter">
          ${AUDIT_ACTIONS.map(s=>`<option value="${esc(s)}"${s===i?" selected":""}>${s==="all"?"All actions":auditLabel(s)}</option>`).join("")}
        </select>
        <select class="admin-select" id="auditTargetFilter">
          ${AUDIT_TARGET_TYPES.map(s=>`<option value="${esc(s)}"${s===a?" selected":""}>${s==="all"?"All targets":auditLabel(s)}</option>`).join("")}
        </select>
        <span class="ix-count">${d.total.toLocaleString()} audit event${d.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(d.auditLogs||[]).length?`<div class="ix-list">
          ${d.auditLogs.map(s=>`
            <article class="ix-row ix-row-static">
              <div class="ix-body">
                <div class="ix-title">${auditActionBadge(s.action||"action")}</div>
                <div class="ix-meta"><strong>${esc(s.actorName||"Admin")}</strong> \xB7 ${esc(s.actorEmail||s.actorId||"")} \xB7 ${fmtTime(s.createdAt)} \xB7 ${fmtDate(s.createdAt)}</div>
                <div class="ix-sub">Target: ${esc(s.targetTitle||auditLabel(s.targetType||"target"))}${s.targetType?` (${esc(s.targetType)}${s.targetId?` \xB7 ${esc(s.targetId)}`:""})`:""}</div>
                <div class="ix-sub admin-muted">${esc(formatAuditMetadata(s.metadata))}</div>
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No audit events match these filters.</div>'}
        ${pager(d.page,d.pages,"audit")}
      </div>
    `),animateStatValues(),bindSearch("auditSearch",s=>{_s.audit.search=s,showAuditLogs(1)},350),document.getElementById("auditActionFilter")?.addEventListener("change",s=>{_s.audit.action=s.target.value,showAuditLogs(1)}),document.getElementById("auditTargetFilter")?.addEventListener("change",s=>{_s.audit.targetType=s.target.value,showAuditLogs(1)})}catch(d){content(`<div class="admin-error">${esc(d.message)}</div>`)}}function formatAuditMetadata(e={}){const t=Object.entries(e||{}).filter(([,i])=>i!=null&&i!=="");return t.length?t.map(([i,a])=>`${auditLabel(i)}: ${Array.isArray(a)?a.join(", "):a}`).join(" \xB7 "):"\u2014"}async function showTrash(){try{const e=await api("/api/admin/trash"),t=(n,d)=>`<button class="admin-btn admin-btn-ghost" style="font-size:11px" data-restore-type="${esc(n)}" data-restore-id="${esc(d)}">\u21A9 Restore</button>`,i=(e.listings?.length||0)+(e.discussions?.length||0)+(e.news?.length||0)+(e.announcements?.length||0)+(e.spotlights?.length||0)+(e.users?.length||0),a=(n,d,s,o,l)=>s.length?`
        <div class="admin-card ix-card" style="margin-bottom:20px">
          <div class="ix-section-head">
            <span>${d} ${n}</span>
            <span class="ix-count">${s.length} item${s.length!==1?"s":""}</span>
          </div>
          <div class="ix-list">
            ${s.map(c=>`
              <article class="ix-row ix-row-static">
                <div class="ix-body">
                  <div class="ix-title">${esc(c.title||c.name||"(untitled)")}</div>
                  <div class="ix-meta">${o(c)} \xB7 Deleted ${fmtDate(c.deletedAt)}</div>
                </div>
                <div class="ix-actions">${t(l,c.id)}</div>
              </article>`).join("")}
          </div>
        </div>`:"";content(`
      ${sectionHero("Trash","Soft-deleted items stay recoverable for super-admins.")}
      <div class="ix-stat-grid">
        ${sectionStat("Total items",i,!0)}
        ${sectionStat("Listings",e.listings?.length||0)}
        ${sectionStat("News",e.news?.length||0)}
        ${sectionStat("Users",e.users?.length||0)}
      </div>
      <div class="ix-note">\u{1F310} <strong>The internet is forever.</strong> Deleted content is preserved here and invisible to regular users.</div>
      ${a("Listings","\u{1F4CB}",e.listings||[],n=>badge(n.category||"","gray"),"listing")}
      ${a("Discussions","\u{1F4AC}",e.discussions||[],n=>esc(n.authorName||""),"discussion")}
      ${a("News","\u{1F4F0}",e.news||[],n=>badge(n.status||"draft",n.status==="published"?"green":"gray"),"news")}
      ${a("Announcements","\u{1F4E2}",e.announcements||[],()=>"","announcement")}
      ${a("Spotlights","\u{1F3AC}",e.spotlights||[],n=>badge(n.type||"ad","blue"),"spotlight")}
      ${a("Users","\u{1F464}",e.users||[],n=>`${esc(n.email||"")} \xB7 ${badge(n.role||"user","gray")}`,"user")}
      ${i===0?'<div class="admin-empty">Trash is empty \u2014 nothing has been soft-deleted yet.</div>':""}
    `),animateStatValues()}catch(e){content(`<div class="admin-error">${esc(e.message)}</div>`)}}function isHttpUrl(e){try{const t=new URL(e);return t.protocol==="http:"||t.protocol==="https:"}catch{return!1}}function isSpotlightImageValue(e){return e?e.startsWith("data:image/")||e.startsWith("/uploads/")||e.startsWith("uploads/")?!0:isHttpUrl(e):!1}function clearSpotlightFieldErrors(e=document){e.querySelectorAll(".is-invalid").forEach(t=>t.classList.remove("is-invalid")),e.querySelectorAll("[data-spot-field-error]").forEach(t=>{t.textContent="",t.hidden=!0})}function setSpotlightFieldError(e,t){document.getElementById(e)?.classList.add("is-invalid");const a=document.querySelector(`[data-spot-field-error="${e}"]`);a&&(a.textContent=t,a.hidden=!1)}function validateSpotlightFields(e,t){clearSpotlightFieldErrors();const i=[];e.title?e.title.length<3&&i.push({id:t.title,message:"Headline should be at least 3 characters."}):i.push({id:t.title,message:"Add a headline for the homepage banner."}),e.imageUrl?isSpotlightImageValue(e.imageUrl)||i.push({id:t.image,message:"Use a valid image URL (https://\u2026) or upload a file."}):i.push({id:t.image,message:"Upload an image or paste an https:// URL."}),e.ctaText&&!e.ctaUrl&&i.push({id:t.ctaUrl,message:"Add a link so the banner can open the ad, or clear the button label."}),e.ctaUrl&&!isHttpUrl(e.ctaUrl)&&i.push({id:t.ctaUrl,message:"Link must start with http:// or https://"}),(!Number.isFinite(e.order)||e.order<0||!Number.isInteger(e.order))&&i.push({id:t.order,message:"Order must be a whole number 0 or higher."});const a=e.startDate?Date.parse(e.startDate):NaN,n=e.endDate?Date.parse(e.endDate):NaN;e.startDate&&Number.isNaN(a)&&i.push({id:t.start,message:"Pick a valid start date and time."}),e.endDate&&Number.isNaN(n)&&i.push({id:t.end,message:"Pick a valid end date and time."}),e.startDate&&e.endDate&&!Number.isNaN(a)&&!Number.isNaN(n)&&n<=a&&i.push({id:t.end,message:"End must be after the start time."}),e.badgeText&&e.badgeText.length>40&&i.push({id:t.badgeText,message:"Badge text max is 40 characters."});for(const d of i)setSpotlightFieldError(d.id,d.message);return i[0]?.message||null}function readSpotlightCreateValues(){const e=document.getElementById("spotImageUrl"),t=e?.getAttribute("data-file-data")||"";return{title:document.getElementById("spotTitle")?.value.trim()||"",subtitle:document.getElementById("spotSubtitle")?.value.trim()||"",body:document.getElementById("spotBody")?.value.trim()||"",imageUrl:t||e?.value.trim()||"",badgeText:document.getElementById("spotBadgeText")?.value.trim()||"",badgeColor:document.getElementById("spotBadgeColor")?.value.trim()||"",ctaText:document.getElementById("spotCtaText")?.value.trim()||"",ctaUrl:document.getElementById("spotCtaUrl")?.value.trim()||"",type:document.getElementById("spotType")?.value||"ad",order:Number(document.getElementById("spotOrder")?.value),startDate:document.getElementById("spotStart")?.value||null,endDate:document.getElementById("spotEnd")?.value||null}}function readSpotlightEditValues(e=""){const t=document.getElementById("editSpotImageUrl"),i=t?.getAttribute("data-file-data")||"";return{title:document.getElementById("editSpotTitle")?.value.trim()||"",subtitle:document.getElementById("editSpotSubtitle")?.value.trim()||"",body:document.getElementById("editSpotBody")?.value.trim()||"",imageUrl:i||t?.value.trim()||e||"",badgeText:document.getElementById("editSpotBadgeText")?.value.trim()||"",badgeColor:document.getElementById("editSpotBadgeColor")?.value.trim()||"",ctaText:document.getElementById("editSpotCtaText")?.value.trim()||"",ctaUrl:document.getElementById("editSpotCtaUrl")?.value.trim()||"",type:document.getElementById("editSpotType")?.value||"ad",order:Number(document.getElementById("editSpotOrder")?.value),startDate:document.getElementById("editSpotStart")?.value||null,endDate:document.getElementById("editSpotEnd")?.value||null}}function spotlightPreviewHtml(e={}){const t={ad:"Ad",event:"Event",news:"News",promo:"Promo"},i=!!(e.ctaUrl||"").trim(),a=e.badgeText?`<span class="admin-spot-preview-badge" style="background:${esc(e.badgeColor||"#E63946")}">${esc(e.badgeText)}</span>`:`<span class="admin-spot-preview-badge admin-spot-preview-badge--type">${esc(t[e.type||"ad"]||"Ad")}</span>`,n=e.imageUrl?`background-image:url("${esc(e.imageUrl).replace(/"/g,"%22")}")`:"background:linear-gradient(135deg,#1a2332,#3d4f66)",d=(e.ctaText||"").trim()||(i?"Learn more":"");return`
    <div class="admin-spot-preview${i?" admin-spot-preview--linked":""}" style="${n}">
      <div class="admin-spot-preview-overlay"></div>
      <div class="admin-spot-preview-content">
        ${a}
        <h3 class="admin-spot-preview-title">${esc(e.title||"Your headline here")}</h3>
        <p class="admin-spot-preview-sub">${esc(e.subtitle||"Optional supporting line")}</p>
        ${e.body?`<p class="admin-spot-preview-body">${esc(e.body)}</p>`:""}
        ${d?`<span class="admin-spot-preview-cta">${esc(d)}</span>`:'<span class="admin-spot-preview-cta admin-spot-preview-cta--ghost">Add a link to make this clickable</span>'}
        ${i?'<span class="admin-spot-preview-clickhint">Clicking the banner opens the ad link</span>':""}
      </div>
    </div>`}function bindSpotlightComposer(){const e=document.getElementById("spotComposer");if(!e)return;const t=()=>{const n=document.getElementById("spotImageUrl"),s=n?.getAttribute("data-file-data")||""||n?.value.trim()||"",o=document.getElementById("spotLivePreview");o&&(o.innerHTML=spotlightPreviewHtml({title:document.getElementById("spotTitle")?.value.trim(),subtitle:document.getElementById("spotSubtitle")?.value.trim(),body:document.getElementById("spotBody")?.value.trim(),badgeText:document.getElementById("spotBadgeText")?.value.trim(),badgeColor:document.getElementById("spotBadgeColor")?.value.trim()||"#E63946",ctaText:document.getElementById("spotCtaText")?.value.trim(),ctaUrl:document.getElementById("spotCtaUrl")?.value.trim(),imageUrl:s,type:document.getElementById("spotType")?.value||"ad"}))},i=n=>{n.addEventListener("input",()=>{n.classList.remove("is-invalid");const d=document.querySelector(`[data-spot-field-error="${n.id}"]`);d&&(d.hidden=!0,d.textContent="")})};e.querySelectorAll("#spotTitle,#spotSubtitle,#spotBody,#spotBadgeText,#spotBadgeColor,#spotCtaText,#spotCtaUrl,#spotOrder,#spotStart,#spotEnd,#spotImageUrl").forEach(n=>{n.addEventListener("input",t),n.addEventListener("change",t),i(n)}),e.querySelectorAll(".admin-spot-type[data-type]").forEach(n=>{n.addEventListener("click",()=>{e.querySelectorAll(".admin-spot-type").forEach(s=>s.classList.remove("is-active")),n.classList.add("is-active");const d=document.getElementById("spotType");d&&(d.value=n.dataset.type||"ad"),t()})}),document.getElementById("spotToggleComposer")?.addEventListener("click",()=>{const n=document.getElementById("spotComposerPanel"),d=document.getElementById("spotToggleComposer");if(!n||!d)return;n.hasAttribute("hidden")?(n.removeAttribute("hidden"),d.textContent="Hide form",document.getElementById("spotTitle")?.focus()):(n.setAttribute("hidden",""),d.textContent="+ New spotlight")}),document.getElementById("spotCancelComposer")?.addEventListener("click",()=>{const n=document.getElementById("spotComposerPanel"),d=document.getElementById("spotToggleComposer");n&&n.setAttribute("hidden",""),d&&(d.textContent="+ New spotlight")});function a(n){const d=document.getElementById("spotImgPreviewWrap"),s=document.getElementById("spotImgPreview");!d||!s||(n?(s.src=n,d.hidden=!1):(d.hidden=!0,s.src=""),t())}document.getElementById("spotImageFile")?.addEventListener("change",async function(){const n=this.files?.[0];if(!n)return;const d=document.getElementById("spotFileLbl");d&&(d.textContent=`\u{1F4C1} ${n.name}`);try{const s=await readFileAsDataUrl(n),o=document.getElementById("spotImageUrl");o&&(o.value="",o.setAttribute("data-file-data",s)),a(s)}catch{}}),document.getElementById("spotImageUrl")?.addEventListener("blur",function(){this.value.trim()&&(this.removeAttribute("data-file-data"),a(this.value.trim()))}),document.getElementById("spotSubmit")?.addEventListener("click",async()=>{const n=readSpotlightCreateValues(),d=document.getElementById("spotFormError"),s=document.getElementById("spotSubmit");if(!d||!s)return;d.hidden=!0;const o=validateSpotlightFields(n,{title:"spotTitle",image:"spotImageUrl",ctaText:"spotCtaText",ctaUrl:"spotCtaUrl",order:"spotOrder",start:"spotStart",end:"spotEnd",badgeText:"spotBadgeText"});if(o){d.textContent=o,d.hidden=!1,document.querySelector(".is-invalid")?.scrollIntoView({behavior:"smooth",block:"center"});return}s.disabled=!0,s.textContent="Publishing\u2026";try{await api("/api/admin/spotlights",{method:"POST",body:JSON.stringify(n)}),notify("Spotlight published. Add another anytime with + New spotlight.","success"),showSpotlights()}catch(l){d.textContent=l.message,d.hidden=!1,s.disabled=!1,s.textContent="Publish to homepage"}}),t()}function bindSpotlightList(e){const t=document.getElementById("spotList"),i=document.getElementById("spotEmpty"),a=document.getElementById("spotSearch"),n=Array.from(document.querySelectorAll(".admin-spot-filter[data-status]")),d=()=>{const s=(a?.value||"").trim().toLowerCase(),o=n.find(c=>c.classList.contains("is-active"))?.dataset.status||"all";let l=0;t?.querySelectorAll("[data-spot-card]").forEach(c=>{const u=(c.dataset.spotSearch||"").toLowerCase(),r=c.dataset.spotActive==="true",x=(!s||u.includes(s))&&(o==="all"||o==="live"&&r||o==="paused"&&!r);c.hidden=!x,x&&(l+=1)}),i&&(i.hidden=l>0||e.length===0)};a?.addEventListener("input",d),n.forEach(s=>{s.addEventListener("click",()=>{n.forEach(o=>o.classList.remove("is-active")),s.classList.add("is-active"),d()})}),wireInteractiveRows("[data-open-spot]",s=>openViewSpotlight(s.dataset.openSpot))}async function showSpotlights(){try{const t=(await api("/api/admin/spotlights")).spotlights||[],i={ad:"blue",event:"green",news:"gray",promo:"red"},a={ad:"Ad",event:"Event",news:"News",promo:"Promo"},n=t.filter(s=>s.active).length,d=t.length===0;content(`
      ${sectionHero("Homepage Spotlight","These banners rotate in the homepage hero. Turn Live on so visitors see them.")}
      <div class="admin-spot-guide">
        <div class="admin-spot-guide-steps">
          <div><strong>1</strong><span>Create a banner</span></div>
          <div><strong>2</strong><span>Flip Live when ready</span></div>
          <div><strong>3</strong><span>Reorder with \u2191 \u2193</span></div>
        </div>
        <p>You can publish <strong>multiple</strong> spotlights \u2014 live ones rotate in the homepage carousel. Add a link so visitors open the ad when they click the banner.</p>
      </div>
      <div class="ix-stat-grid">
        ${sectionStat("Total",t.length,!0)}
        ${sectionStat("Live on site",n)}
        ${sectionStat("Paused",t.length-n)}
      </div>

      <div class="admin-spot-toolbar">
        <input class="admin-ann-input admin-spot-search" id="spotSearch" type="search" placeholder="Search title, type, badge\u2026" aria-label="Search spotlights">
        <div class="admin-spot-filters" role="group" aria-label="Filter by status">
          <button type="button" class="admin-spot-filter is-active" data-status="all">All</button>
          <button type="button" class="admin-spot-filter" data-status="live">Live</button>
          <button type="button" class="admin-spot-filter" data-status="paused">Paused</button>
        </div>
        <button type="button" class="admin-btn" id="spotToggleComposer" style="background:#E63946;color:#fff;border-color:#E63946;margin-left:auto">${d?"Hide form":"+ New spotlight"}</button>
      </div>

      <div class="admin-spot-composer" id="spotComposerPanel" ${d?"":"hidden"}>
        <div class="admin-spot-composer-grid" id="spotComposer">
          <div class="admin-ann-form admin-spot-form">
            <div class="admin-ann-form-title">Create a homepage banner</div>
            <p class="admin-spot-form-hint">Fill the fields \u2014 the preview on the right updates as you type.</p>
            <div id="spotFormError" class="admin-spot-error" hidden></div>
            <div class="admin-ann-grid">
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label">Headline <span style="color:#E63946">*</span></label>
                <input class="admin-ann-input" id="spotTitle" placeholder="e.g. Dashain Mela 2026 \u2014 Register Now" maxlength="200" required>
                <div class="admin-spot-field-error" data-spot-field-error="spotTitle" hidden></div>
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label" for="spotSubtitle">Supporting line</label>
                <input class="admin-ann-input" id="spotSubtitle" placeholder="One short sentence under the headline" maxlength="200">
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label" for="spotBody">Extra details (optional)</label>
                <textarea class="admin-ann-textarea" id="spotBody" placeholder="Shown under the supporting line" rows="2" maxlength="400"></textarea>
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label">Banner image <span style="color:#E63946">*</span></label>
                <div class="admin-spot-image-row">
                  <label class="admin-spot-file" id="spotFileLbl">\u{1F4C1} Choose image<input type="file" id="spotImageFile" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label>
                  <input class="admin-ann-input" id="spotImageUrl" type="url" placeholder="or paste https:// image URL">
                </div>
                <div id="spotImgPreviewWrap" class="admin-spot-thumb-wrap" hidden>
                  <img id="spotImgPreview" class="admin-spot-thumb" src="" alt="Banner preview">
                </div>
                <div class="admin-spot-field-error" data-spot-field-error="spotImageUrl" hidden></div>
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label" for="spotType">Type</label>
                <input type="hidden" id="spotType" value="ad">
                <div class="admin-spot-types" role="group" aria-label="Spotlight type">
                  <button type="button" class="admin-spot-type is-active" data-type="ad">\u{1F4E3} Ad</button>
                  <button type="button" class="admin-spot-type" data-type="event">\u{1F389} Event</button>
                  <button type="button" class="admin-spot-type" data-type="news">\u{1F4F0} News</button>
                  <button type="button" class="admin-spot-type" data-type="promo">\u{1F525} Promo</button>
                </div>
              </div>
              <div class="admin-ann-field">
                <label class="admin-ann-label" for="spotBadgeText">Corner badge</label>
                <input class="admin-ann-input" id="spotBadgeText" placeholder="e.g. FREE ENTRY" maxlength="40">
                <div class="admin-spot-field-error" data-spot-field-error="spotBadgeText" hidden></div>
              </div>
              <div class="admin-ann-field">
                <label class="admin-ann-label" for="spotBadgeColor">Badge color</label>
                <input class="admin-ann-input" id="spotBadgeColor" type="color" value="#E63946">
              </div>
              <div class="admin-ann-field">
                <label class="admin-ann-label" for="spotCtaText">Button label (optional)</label>
                <input class="admin-ann-input" id="spotCtaText" placeholder="e.g. Register Now" maxlength="60">
                <div class="admin-spot-field-error" data-spot-field-error="spotCtaText" hidden></div>
              </div>
              <div class="admin-ann-field">
                <label class="admin-ann-label" for="spotCtaUrl">Ad link \u2014 click banner opens this</label>
                <input class="admin-ann-input" id="spotCtaUrl" type="url" placeholder="https://\u2026" inputmode="url">
                <div class="admin-spot-field-error" data-spot-field-error="spotCtaUrl" hidden></div>
              </div>
              <div class="admin-ann-field">
                <label class="admin-ann-label" for="spotOrder">Carousel order</label>
                <input class="admin-ann-input" id="spotOrder" type="number" value="0" min="0" step="1" title="Lower numbers show first">
                <div class="admin-spot-field-error" data-spot-field-error="spotOrder" hidden></div>
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label">Schedule (optional)</label>
                <div class="admin-spot-schedule">
                  <div>
                    <span class="admin-spot-schedule-label">Show from</span>
                    <input class="admin-ann-input" id="spotStart" type="datetime-local" aria-label="Show from">
                    <div class="admin-spot-field-error" data-spot-field-error="spotStart" hidden></div>
                  </div>
                  <div>
                    <span class="admin-spot-schedule-label">Show until</span>
                    <input class="admin-ann-input" id="spotEnd" type="datetime-local" aria-label="Show until">
                    <div class="admin-spot-field-error" data-spot-field-error="spotEnd" hidden></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="admin-ann-actions admin-spot-actions">
              <button type="button" class="admin-btn admin-btn-ghost" id="spotCancelComposer">Cancel</button>
              <button type="button" class="admin-btn" id="spotSubmit" style="background:#E63946;color:#fff;border-color:#E63946">Publish to homepage</button>
            </div>
          </div>
          <aside class="admin-spot-preview-pane">
            <div class="admin-spot-preview-label">Homepage preview</div>
            <div id="spotLivePreview">${spotlightPreviewHtml({})}</div>
            <p class="admin-spot-preview-note">Visitors see this in the homepage carousel. With a link, clicking the banner opens the ad. Multiple live spotlights rotate automatically.</p>
          </aside>
        </div>
      </div>

      <div class="admin-spot-list-head">
        <h3>Your spotlights</h3>
        <span>${t.length} total \xB7 ${n} live</span>
      </div>
      <div class="admin-ann-list admin-spot-list" id="spotList">
        ${t.length?t.map((s,o)=>`
          <div class="admin-spot-card ix-clickable-card" tabindex="0" role="button"
               data-open-spot="${esc(s.id)}" data-spot-card
               data-spot-active="${s.active?"true":"false"}"
               data-spot-search="${esc([s.title,s.subtitle,s.type,s.badgeText,s.ctaText].filter(Boolean).join(" "))}">
            <div class="admin-spot-card-media" style="${s.imageUrl?`background-image:url('${esc(s.imageUrl).replace(/'/g,"%27")}')`:""}">
              ${s.active?'<span class="admin-spot-pill admin-spot-pill--live">Live</span>':'<span class="admin-spot-pill">Paused</span>'}
            </div>
            <div class="admin-spot-card-body">
              <div class="admin-spot-card-title">${esc(s.title||"Untitled")}</div>
              ${s.subtitle?`<div class="admin-spot-card-sub">${esc(s.subtitle)}</div>`:""}
              <div class="admin-ann-card-meta">
                ${badge(a[s.type||"ad"]||"Ad",i[s.type||""]||"gray")}
                ${s.badgeText?badge(s.badgeText,"blue"):""}
                <span>Order ${s.order??o}</span>
                ${s.endDate?`<span>Until ${fmtDate(s.endDate)}</span>`:""}
                ${s.ctaText?`<span>Button: ${esc(s.ctaText)}</span>`:""}
              </div>
            </div>
            <div class="admin-spot-card-actions">
              <button type="button" class="admin-spot-switch ${s.active?"is-on":""}" data-toggle-spot="${esc(s.id)}" title="${s.active?"Pause on homepage":"Show on homepage"}" aria-pressed="${s.active?"true":"false"}">
                <span class="admin-spot-switch-knob"></span>
                <span class="admin-spot-switch-label">${s.active?"Live":"Paused"}</span>
              </button>
              <button type="button" class="admin-btn admin-btn-ghost" data-move-spot="${esc(s.id)}" data-move-dir="-1" title="Show earlier in carousel">\u2191</button>
              <button type="button" class="admin-btn admin-btn-ghost" data-move-spot="${esc(s.id)}" data-move-dir="1" title="Show later in carousel">\u2193</button>
              <button type="button" class="admin-btn admin-btn-ghost" data-edit-spot="${esc(s.id)}">Edit</button>
              <button type="button" class="admin-btn admin-btn-danger" data-del-spot="${esc(s.id)}" title="Delete">\u{1F5D1}</button>
            </div>
          </div>
        `).join(""):'<div class="admin-empty">No spotlights yet. Click <strong>+ New spotlight</strong> to create your first homepage banner.</div>'}
      </div>
      <div class="admin-empty" id="spotEmpty" hidden>No spotlights match this search or filter.</div>
    `),animateStatValues(),bindSpotlightComposer(),bindSpotlightList(t)}catch(e){content(`<div class="admin-error">${esc(e.message)}</div>`)}}async function openViewSpotlight(e){let t;try{t=await api(`/api/admin/spotlights/${encodeURIComponent(e)}`)}catch(n){notify(n.message,"error");return}const i={ad:"blue",event:"green",news:"gray",promo:"red"},a={ad:"Ad",event:"Event",news:"News",promo:"Promo"};openModal(esc(t.title||"Untitled spotlight"),`
    <div class="admin-spot-view">
      ${spotlightPreviewHtml(t)}
      <div class="admin-spot-view-meta">
        <div class="admin-spot-view-row"><span>Status</span>${badge(t.active?"Live on homepage":"Paused",t.active?"green":"gray")}</div>
        <div class="admin-spot-view-row"><span>Type</span>${badge(a[t.type||"ad"]||"Ad",i[t.type||""]||"gray")}</div>
        <div class="admin-spot-view-row"><span>Carousel order</span><strong>${t.order??0}</strong></div>
        ${t.ctaUrl?`<div class="admin-spot-view-row"><span>Button link</span><a href="${esc(t.ctaUrl)}" target="_blank" rel="noopener">${esc(t.ctaUrl)}</a></div>`:""}
        ${t.startDate?`<div class="admin-spot-view-row"><span>Shows from</span>${fmtDate(t.startDate)}</div>`:""}
        ${t.endDate?`<div class="admin-spot-view-row"><span>Shows until</span>${fmtDate(t.endDate)}</div>`:""}
        <div class="admin-spot-view-row"><span>Created</span>${esc(t.createdBy||"admin")} \xB7 ${fmtDate(t.createdAt)}</div>
      </div>
      <div class="admin-spot-view-actions">
        <button type="button" class="admin-btn" data-spot-view-edit="${esc(t.id)}" style="background:#E63946;color:#fff;border-color:#E63946">Edit banner</button>
        <button type="button" class="admin-btn admin-btn-ghost" data-spot-view-toggle="${esc(t.id)}">${t.active?"Pause on homepage":"Make live"}</button>
      </div>
    </div>
  `,null),requestAnimationFrame(()=>{document.querySelector("[data-spot-view-edit]")?.addEventListener("click",()=>{closeModal(),openEditSpotlight(e)}),document.querySelector("[data-spot-view-toggle]")?.addEventListener("click",async()=>{try{await api(`/api/admin/spotlights/${encodeURIComponent(e)}/toggle`,{method:"PUT"}),closeModal(),showSpotlights(),notify(t.active?"Spotlight paused.":"Spotlight is live on the homepage.","success")}catch(n){notify(n.message,"error")}})})}function spotlightFormHtml(e={}){const t=a=>{if(!a)return"";try{return new Date(a).toISOString().slice(0,16)}catch{return""}},i=e.type||"ad";return`
    <div class="admin-spot-edit-layout">
      <div class="admin-modal-grid">
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label">Headline <span style="color:#E63946">*</span></label>
          <input class="admin-modal-input" id="editSpotTitle" maxlength="200" value="${esc(e.title||"")}" required>
          <div class="admin-spot-field-error" data-spot-field-error="editSpotTitle" hidden></div>
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label" for="editSpotSubtitle">Supporting line</label>
          <input class="admin-modal-input" id="editSpotSubtitle" maxlength="200" value="${esc(e.subtitle||"")}">
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label" for="editSpotBody">Extra details</label>
          <textarea class="admin-modal-textarea" id="editSpotBody" rows="2" maxlength="400">${esc(e.body||"")}</textarea>
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label">Banner image</label>
          <div class="admin-spot-image-row">
            <label class="admin-spot-file" id="editSpotFileLbl">\u{1F4C1} Choose image
              <input type="file" id="editSpotImageFile" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
            </label>
            <input class="admin-modal-input" id="editSpotImageUrl" type="url" placeholder="or paste https:// URL" value="${esc(e.imageUrl||"")}">
          </div>
          <div id="editSpotImgPreviewWrap" class="admin-spot-thumb-wrap" ${e.imageUrl?"":"hidden"}>
            <img id="editSpotImgPreview" class="admin-spot-thumb" src="${esc(e.imageUrl||"")}" alt="Banner preview">
          </div>
          <div class="admin-spot-field-error" data-spot-field-error="editSpotImageUrl" hidden></div>
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label" for="editSpotType">Type</label>
          <input type="hidden" id="editSpotType" value="${esc(i)}">
          <div class="admin-spot-types" id="editSpotTypes" role="group" aria-label="Spotlight type">
            <button type="button" class="admin-spot-type ${i==="ad"?"is-active":""}" data-type="ad">\u{1F4E3} Ad</button>
            <button type="button" class="admin-spot-type ${i==="event"?"is-active":""}" data-type="event">\u{1F389} Event</button>
            <button type="button" class="admin-spot-type ${i==="news"?"is-active":""}" data-type="news">\u{1F4F0} News</button>
            <button type="button" class="admin-spot-type ${i==="promo"?"is-active":""}" data-type="promo">\u{1F525} Promo</button>
          </div>
        </div>
        <div class="admin-modal-field">
          <label class="admin-modal-label" for="editSpotBadgeText">Corner badge</label>
          <input class="admin-modal-input" id="editSpotBadgeText" maxlength="40" value="${esc(e.badgeText||"")}">
          <div class="admin-spot-field-error" data-spot-field-error="editSpotBadgeText" hidden></div>
        </div>
        <div class="admin-modal-field">
          <label class="admin-modal-label" for="editSpotBadgeColor">Badge color</label>
          <input class="admin-modal-input" id="editSpotBadgeColor" type="color" value="${esc(e.badgeColor||"#E63946")}">
        </div>
        <div class="admin-modal-field">
          <label class="admin-modal-label" for="editSpotCtaText">Button label (optional)</label>
          <input class="admin-modal-input" id="editSpotCtaText" maxlength="60" value="${esc(e.ctaText||"")}">
          <div class="admin-spot-field-error" data-spot-field-error="editSpotCtaText" hidden></div>
        </div>
        <div class="admin-modal-field">
          <label class="admin-modal-label" for="editSpotCtaUrl">Ad link \u2014 click banner opens this</label>
          <input class="admin-modal-input" id="editSpotCtaUrl" type="url" value="${esc(e.ctaUrl||"")}" inputmode="url" placeholder="https://\u2026">
          <div class="admin-spot-field-error" data-spot-field-error="editSpotCtaUrl" hidden></div>
        </div>
        <div class="admin-modal-field">
          <label class="admin-modal-label" for="editSpotOrder">Carousel order</label>
          <input class="admin-modal-input" id="editSpotOrder" type="number" min="0" step="1" value="${e.order??0}">
          <div class="admin-spot-field-error" data-spot-field-error="editSpotOrder" hidden></div>
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label">Schedule (optional)</label>
          <div class="admin-spot-schedule">
            <div>
              <span class="admin-spot-schedule-label">Show from</span>
              <input class="admin-modal-input" id="editSpotStart" type="datetime-local" value="${t(e.startDate)}" aria-label="Show from">
              <div class="admin-spot-field-error" data-spot-field-error="editSpotStart" hidden></div>
            </div>
            <div>
              <span class="admin-spot-schedule-label">Show until</span>
              <input class="admin-modal-input" id="editSpotEnd" type="datetime-local" value="${t(e.endDate)}" aria-label="Show until">
              <div class="admin-spot-field-error" data-spot-field-error="editSpotEnd" hidden></div>
            </div>
          </div>
        </div>
      </div>
      <aside class="admin-spot-preview-pane admin-spot-preview-pane--modal">
        <div class="admin-spot-preview-label">Homepage preview</div>
        <div id="editSpotLivePreview">${spotlightPreviewHtml(e)}</div>
      </aside>
    </div>`}async function openEditSpotlight(e){let t;try{t=await api(`/api/admin/spotlights/${encodeURIComponent(e)}`)}catch(i){notify(i.message,"error");return}openModal("Edit homepage banner",spotlightFormHtml(t),async()=>{const i=readSpotlightEditValues(t.imageUrl||""),a=validateSpotlightFields(i,{title:"editSpotTitle",image:"editSpotImageUrl",ctaText:"editSpotCtaText",ctaUrl:"editSpotCtaUrl",order:"editSpotOrder",start:"editSpotStart",end:"editSpotEnd",badgeText:"editSpotBadgeText"});if(a)throw document.querySelector(".is-invalid")?.scrollIntoView({behavior:"smooth",block:"center"}),new Error(a);await api(`/api/admin/spotlights/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify(i)}),showSpotlights()}),requestAnimationFrame(()=>{document.querySelector("#adminModalOverlay .admin-modal")?.classList.add("admin-modal-wide");const a=()=>{const n=document.getElementById("editSpotImageUrl"),d=n?.getAttribute("data-file-data")||"",s=document.getElementById("editSpotLivePreview");s&&(s.innerHTML=spotlightPreviewHtml({title:document.getElementById("editSpotTitle")?.value.trim(),subtitle:document.getElementById("editSpotSubtitle")?.value.trim(),body:document.getElementById("editSpotBody")?.value.trim(),badgeText:document.getElementById("editSpotBadgeText")?.value.trim(),badgeColor:document.getElementById("editSpotBadgeColor")?.value.trim()||"#E63946",ctaText:document.getElementById("editSpotCtaText")?.value.trim(),ctaUrl:document.getElementById("editSpotCtaUrl")?.value.trim(),imageUrl:d||n?.value.trim()||t.imageUrl||"",type:document.getElementById("editSpotType")?.value||"ad"}))};document.querySelectorAll("#editSpotTitle,#editSpotSubtitle,#editSpotBody,#editSpotBadgeText,#editSpotBadgeColor,#editSpotCtaText,#editSpotCtaUrl,#editSpotOrder,#editSpotStart,#editSpotEnd,#editSpotImageUrl").forEach(n=>{n.addEventListener("input",()=>{a(),n.classList.remove("is-invalid");const d=document.querySelector(`[data-spot-field-error="${n.id}"]`);d&&(d.hidden=!0,d.textContent="")}),n.addEventListener("change",a)}),document.querySelectorAll("#editSpotTypes .admin-spot-type").forEach(n=>{n.addEventListener("click",()=>{document.querySelectorAll("#editSpotTypes .admin-spot-type").forEach(s=>s.classList.remove("is-active")),n.classList.add("is-active");const d=document.getElementById("editSpotType");d&&(d.value=n.dataset.type||"ad"),a()})}),document.getElementById("editSpotImageFile")?.addEventListener("change",async function(){const n=this.files?.[0];if(!n)return;const d=document.getElementById("editSpotFileLbl");if(d){const s=d.querySelector("input");d.textContent=`\u{1F4C1} ${n.name}`,s&&d.appendChild(s)}try{const s=await readFileAsDataUrl(n),o=document.getElementById("editSpotImageUrl");o&&(o.value="",o.setAttribute("data-file-data",s));const l=document.getElementById("editSpotImgPreviewWrap"),c=document.getElementById("editSpotImgPreview");l&&c&&(c.src=s,l.hidden=!1),a()}catch{}}),document.getElementById("editSpotImageUrl")?.addEventListener("blur",function(){const n=document.getElementById("editSpotImgPreviewWrap"),d=document.getElementById("editSpotImgPreview");n&&d&&this.value.trim()&&(this.removeAttribute("data-file-data"),d.src=this.value.trim(),n.hidden=!1,a())})})}async function showAnnouncements(){try{const e=await api("/api/admin/announcements"),t={info:"blue",warning:"red",success:"green"},i=(e.announcements||[]).filter(a=>a.active).length;content(`
      ${sectionHero("Announcements","Site-wide banners for all users. Pause or activate instantly.")}
      <div class="ix-stat-grid">
        ${sectionStat("Total",(e.announcements||[]).length,!0)}
        ${sectionStat("Live",i)}
        ${sectionStat("Inactive",(e.announcements||[]).length-i)}
      </div>
      <div class="admin-ann-form">
        <div class="admin-ann-form-title">\u{1F4E2} Create New Announcement</div>
        <div id="annFormError" role="alert" style="display:none;background:#fce8e8;border:1.5px solid #f8c3c3;border-radius:8px;padding:10px 14px;font-size:13px;color:#E63946;margin-bottom:12px"></div>
        <div class="admin-ann-grid">
          <div class="admin-ann-field admin-ann-full">
            <label class="admin-ann-label" for="annTitle">Title</label>
            <input class="admin-ann-input" id="annTitle" placeholder="e.g. Site maintenance this Saturday">
          </div>
          <div class="admin-ann-field admin-ann-full">
            <label class="admin-ann-label" for="annBody">Message</label>
            <textarea class="admin-ann-textarea" id="annBody" placeholder="Write the announcement message shown to all users\u2026"></textarea>
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label" for="annType">Type</label>
            <select class="admin-ann-select" id="annType">
              <option value="info">\u2139\uFE0F Info (blue)</option>
              <option value="warning">\u26A0\uFE0F Warning (yellow)</option>
              <option value="success">\u2705 Success (green)</option>
            </select>
          </div>
          <div class="admin-ann-field">
            <label class="admin-ann-label" for="annExpiry">Expires at (optional)</label>
            <input class="admin-ann-input" id="annExpiry" type="datetime-local" aria-describedby="annExpiryHelp"><p class="field-guidance" id="annExpiryHelp">Uses your device\u2019s local time. Leave blank to keep the announcement active until you turn it off.</p>
          </div>
        </div>
        <div class="admin-ann-actions">
          <button class="admin-btn" id="annSubmit" style="background:#E63946;color:#fff;border-color:#E63946;padding:9px 22px;font-size:13px">Publish Announcement</button>
        </div>
      </div>

      <div class="admin-ann-list" id="annList">
        ${e.announcements.length?e.announcements.map(a=>`
          <div class="admin-ann-card">
            <div class="admin-ann-stripe admin-ann-stripe-${a.type}"></div>
            <div class="admin-ann-content">
              <div class="admin-ann-card-title">${esc(a.title)}</div>
              <div class="admin-ann-card-body">${esc(a.body)}</div>
              <div class="admin-ann-card-meta">
                ${badge(a.active?"Live":"Inactive",a.active?"green":"gray")}
                ${badge(a.type,t[a.type]||"gray")}
                <span>By ${esc(a.createdBy||"admin")}</span>
                <span>${fmtDate(a.createdAt)}</span>
                ${a.expiresAt?`<span>Expires ${fmtDate(a.expiresAt)}</span>`:""}
              </div>
            </div>
            <div class="admin-ann-card-actions">
              <button class="admin-btn admin-btn-ghost" data-toggle-ann="${esc(a.id)}" title="${a.active?"Deactivate":"Activate"}">
                ${a.active?"\u23F8 Pause":"\u25B6 Activate"}
              </button>
              <button class="admin-btn admin-btn-danger" data-del-ann="${esc(a.id)}">\u{1F5D1}</button>
            </div>
          </div>
        `).join(""):'<div class="admin-empty">No announcements yet. Create one above.</div>'}
      </div>
    `),animateStatValues(),document.getElementById("annSubmit")?.addEventListener("click",async()=>{const a=document.getElementById("annTitle")?.value.trim(),n=document.getElementById("annBody")?.value.trim(),d=document.getElementById("annType")?.value,s=document.getElementById("annExpiry")?.value,o=document.getElementById("annFormError"),l=document.getElementById("annSubmit");if(o.style.display="none",!a||!n){document.getElementById(a?"annBody":"annTitle")?.focus(),o.textContent="Title and message are required.",o.style.display="block";return}l.disabled=!0,l.textContent="Publishing\u2026";try{await api("/api/admin/announcements",{method:"POST",body:JSON.stringify({title:a,body:n,type:d,expiresAt:s||null})}),showAnnouncements(),notify("Announcement published.","success")}catch(c){o.textContent=c.message,o.style.display="block",l.disabled=!1,l.textContent="Publish Announcement"}})}catch(e){content(`<div class="admin-error">${esc(e.message)}</div>`)}}async function openViewListing(e){let t;try{t=await api(`/api/admin/listings/${encodeURIComponent(e)}`)}catch(y){notify(y.message,"error");return}const i=Array.isArray(t.comments)?t.comments:[],a=Array.isArray(t.tags)?t.tags.filter(Boolean):[],n=listingViewProfile(t),d=new Set(n.omitFields||[]),s=listingViewKind(t)==="photography",o=safeHttpUrl(t.externalLink),l=t.price?`${esc(t.price)}${t.priceNote?` <span class="admin-view-note">(${esc(t.priceNote)})</span>`:""}`:"",c=t.externalLink?o?`<a href="${esc(o)}" target="_blank" rel="noopener" class="admin-view-link">${esc(t.externalLink)}</a>`:esc(t.externalLink):"",u=[listingField(n.subcategoryLabel||"Specific type",readableLabel(t.subcategory)),d.has("location")?"":listingField(n.locationLabel||"Location",t.location),d.has("locationType")?"":listingField(n.locationTypeLabel||"Location type",readableLabel(t.locationType)),d.has("price")?"":listingField(n.priceLabel||"Price / rate",l,{raw:!0}),d.has("availability")?"":listingField(n.availabilityLabel||"Availability",t.availability),d.has("contactEmail")?"":listingField("Contact email",t.contactEmail),d.has("contactPhone")?"":listingField("Contact phone",t.contactPhone),d.has("contactPreference")?"":listingField(n.contactPreferenceLabel||"Contact preference",readableLabel(t.contactPreference)),d.has("externalLink")?"":listingField(n.externalLinkLabel||"External link",c,{raw:!0,full:!0}),a.length?`
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Tags</label>
        <div class="admin-view-val admin-listing-tags">${a.map(y=>badge(y)).join("")}</div>
      </div>`:"",t.description?`
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">${esc(n.descriptionLabel||"Description")}</label>
        <div class="admin-view-desc">${esc(t.description)}</div>
      </div>`:"",listingField("Listing ID",t.id),listingField("Posted by user",t.userId),t.updatedAt?listingField("Last updated",fmtDate(t.updatedAt)):""].filter(Boolean).join(""),r=i.length?i.map(y=>`
        <div class="admin-view-comment">
          <div class="admin-view-comment-head">
            <strong>${esc(y.authorName||"\u2014")}</strong>
            <span>${fmtTime(y.createdAt)}</span>
          </div>
          <div class="admin-view-comment-body">${esc(y.body)}</div>
        </div>`).join(""):'<div style="color:#9ca3af;font-size:13px;padding:6px 0">No comments yet.</div>';openModal(esc(t.title),`
    <div class="admin-modal-meta" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      ${badge(readableLabel(t.category||"Listing"),"green")}
      ${t.subcategory?badge(readableLabel(t.subcategory),s?"blue":"gray"):""}
      <span>${esc(n.kindLabel||"Listing")}</span>
      ${!d.has("location")&&t.location?`<span>\u{1F4CD} ${esc(t.location)}</span>`:""}
      ${!d.has("locationType")&&t.locationType?`<span>${esc(readableLabel(t.locationType))}</span>`:""}
      <span style="margin-left:auto;font-size:12px">Posted ${fmtDate(t.createdAt)}</span>
    </div>

    ${listingGallery(t.images,s)}

    <div class="admin-modal-grid" style="margin-top:12px">
      ${u}
    </div>

    <div style="margin-top:16px">
      <div class="admin-modal-label" style="margin-bottom:10px">Comments (${i.length})</div>
      <div class="admin-view-comments">${r}</div>
    </div>

    <div class="admin-view-actions">
      <button class="admin-btn" style="background:#E63946;color:#fff;border-color:#E63946" data-edit-listing="${esc(t.id)}">\u270F\uFE0F Edit Listing</button>
      <button class="admin-btn admin-btn-danger" data-del-listing="${esc(t.id)}">\u{1F5D1} Delete</button>
    </div>
  `,null)}async function openViewDiscussion(e){let t;try{t=await api(`/api/admin/discussions/${encodeURIComponent(e)}`)}catch(a){notify(a.message,"error");return}const i=(t.comments||[]).length?(t.comments||[]).map(a=>`
        <div class="admin-view-comment">
          <div class="admin-view-comment-head">
            <strong>${esc(a.authorName||"\u2014")}</strong>
            <span>${fmtTime(a.createdAt)}</span>
          </div>
          <div class="admin-view-comment-body">${esc(a.body)}</div>
        </div>`).join(""):'<div style="color:#9ca3af;font-size:13px;padding:6px 0">No comments yet.</div>';openModal(esc(t.title),`
    <div class="admin-modal-meta" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      ${badge(capitalize(t.category||""),"blue")}
      <span>by <strong>${esc(t.authorName)}</strong></span>
      <span>\u{1F4AC} ${t.commentCount} comment${t.commentCount!==1?"s":""}</span>
      ${t.tags?.length?t.tags.map(a=>badge(a)).join(""):""}
      <span style="margin-left:auto;font-size:12px">Posted ${fmtDate(t.createdAt)}</span>
    </div>

    ${t.body?`
      <div style="margin-top:14px">
        <div class="admin-modal-label" style="margin-bottom:8px">Body</div>
        <div class="admin-view-desc">${esc(t.body)}</div>
      </div>`:""}

    <div style="margin-top:16px">
      <div class="admin-modal-label" style="margin-bottom:10px">Comments (${t.commentCount})</div>
      <div class="admin-view-comments">${i}</div>
    </div>

    <div class="admin-view-actions">
      <button class="admin-btn" style="background:#E63946;color:#fff;border-color:#E63946" data-edit-discussion="${esc(t.id)}">\u270F\uFE0F Edit Discussion</button>
      <button class="admin-btn admin-btn-danger" data-del-discussion="${esc(t.id)}">\u{1F5D1} Delete</button>
    </div>
  `,null)}async function openEditListing(e){let t;try{t=await api(`/api/admin/listings/${encodeURIComponent(e)}`)}catch(i){notify(i.message,"error");return}openModal("Edit Listing",`
    <div class="admin-modal-meta">Posted ${fmtDate(t.createdAt)}</div>
    <div class="admin-modal-grid">
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="mTitle">Title</label>
        <input class="admin-modal-input" id="mTitle" required value="${esc(t.title||"")}">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="mDesc">Description</label>
        <textarea class="admin-modal-textarea" id="mDesc" required rows="5">${esc(t.description||"")}</textarea>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mCat">Category</label>
        <select class="admin-modal-select" id="mCat">
          ${CATEGORIES.filter(i=>i).map(i=>`<option value="${i}"${i===t.category?" selected":""}>${capitalize(i)}</option>`).join("")}
        </select>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mSubcat">Subcategory</label>
        <input class="admin-modal-input" id="mSubcat" value="${esc(t.subcategory||"")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mLocation">Location</label>
        <input class="admin-modal-input" id="mLocation" value="${esc(t.location||"")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mPrice">Price (optional)</label>
        <input class="admin-modal-input" id="mPrice" value="${esc(t.price||"")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mPriceNote">Price Note (optional)</label>
        <input class="admin-modal-input" id="mPriceNote" value="${esc(t.priceNote||"")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mAvail">Availability (optional)</label>
        <input class="admin-modal-input" id="mAvail" value="${esc(t.availability||"")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mPhone">Contact Phone (optional)</label>
        <input class="admin-modal-input" id="mPhone" value="${esc(t.contactPhone||"")}">
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="mLink">External Link (optional)</label>
        <input class="admin-modal-input" id="mLink" value="${esc(t.externalLink||"")}">
      </div>
    </div>
  `,async()=>{await api(`/api/admin/listings/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify({title:document.getElementById("mTitle").value.trim(),description:document.getElementById("mDesc").value.trim(),category:document.getElementById("mCat").value,subcategory:document.getElementById("mSubcat").value.trim(),location:document.getElementById("mLocation").value.trim(),price:document.getElementById("mPrice").value.trim(),priceNote:document.getElementById("mPriceNote").value.trim(),availability:document.getElementById("mAvail").value.trim(),contactPhone:document.getElementById("mPhone").value.trim(),externalLink:document.getElementById("mLink").value.trim()})}),showListings(1)})}function discussionFormHtml(e={}){return`
    ${e.id?`<div class="admin-modal-meta">By ${esc(e.authorName)} \xB7 ${e.commentCount} comment${e.commentCount!==1?"s":""} \xB7 ${fmtDate(e.createdAt)}</div>`:""}
    <div class="admin-modal-grid">
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="dTitle">Title</label>
        <input class="admin-modal-input" id="dTitle" required maxlength="200" value="${esc(e.title||"")}">
      </div>
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label" for="dBody">Body</label>
        <textarea class="admin-modal-textarea" id="dBody" required rows="8">${esc(e.body||"")}</textarea>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="dCat">Category</label>
        <select class="admin-modal-select" id="dCat">
          ${discussionCategoryOptions(e.category||"general")}
        </select>
      </div>
      <div class="admin-modal-field">
        <label class="admin-modal-label" for="dTags">Tags (comma-separated) (optional)</label>
        <input class="admin-modal-input" id="dTags" value="${esc((e.tags||[]).join(", "))}" placeholder="visa, boston, housing">
      </div>
    </div>
  `}function collectDiscussionPayload(){return{title:document.getElementById("dTitle").value.trim(),body:document.getElementById("dBody").value.trim(),category:document.getElementById("dCat").value,tags:document.getElementById("dTags").value.split(",").map(e=>e.trim()).filter(Boolean)}}async function openCreateDiscussion(){openModal("Create Discussion",discussionFormHtml(),async()=>{await api("/api/admin/discussions",{method:"POST",body:JSON.stringify(collectDiscussionPayload())}),showDiscussions(1)})}async function openEditDiscussion(e){let t;try{t=await api(`/api/admin/discussions/${encodeURIComponent(e)}`)}catch(i){notify(i.message,"error");return}openModal("Edit Discussion",discussionFormHtml(t),async()=>{await api(`/api/admin/discussions/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify(collectDiscussionPayload())}),showDiscussions(1)})}function openModal(e,t,i){if(!closeModal())return;const a=document.createElement("div");a.id="adminModalOverlay",a.className="admin-modal-overlay";const n=i!==null;a.innerHTML=`
    <div class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle">
      <div class="admin-modal-head">
        <div class="admin-modal-title" id="adminModalTitle">${e}</div>
        <button class="admin-modal-close" id="adminModalClose" aria-label="Close form" type="button">\xD7</button>
      </div>
      <div class="admin-modal-error" id="adminModalError" role="alert" tabindex="-1"></div>
      ${t}
      ${n?`<div class="admin-modal-actions">
        <button class="admin-btn admin-btn-ghost" id="adminModalCancel">Cancel</button>
        <button class="admin-btn" id="adminModalSave" style="background:#E63946;color:#fff;border-color:#E63946;padding:8px 20px;font-size:13px">${e.startsWith("Create ")?esc(e):"Save changes"}</button>
      </div>`:`<div class="admin-modal-actions">
        <button class="admin-btn admin-btn-ghost" id="adminModalCancel">Close</button>
      </div>`}
    </div>
  `,document.body.appendChild(a),requestAnimationFrame(()=>a.classList.add("show")),document.getElementById("adminModalClose").addEventListener("click",()=>closeModal()),document.getElementById("adminModalCancel").addEventListener("click",()=>closeModal()),i&&document.getElementById("adminModalSave").addEventListener("click",async()=>{const d=document.getElementById("adminModalError"),s=document.getElementById("adminModalSave");d.style.display="none";const o=Array.from(a.querySelectorAll("input, select, textarea")).find(c=>c.willValidate&&!c.checkValidity());if(o){o.reportValidity(),o.focus();return}const l=s.textContent;s.disabled=!0,s.textContent="Saving\u2026";try{await i(),closeModal(!0),notify("Changes saved successfully.","success")}catch(c){d.textContent=c.message,d.style.display="block",s.disabled=!1,s.textContent=l,d.focus(),notify(c.message,"error")}})}function closeModal(e=!1){if(_newsEditorState&&!e){if(_newsEditorState.saving||_newsEditorState.pending)return notify("Please wait for the current upload or save to finish.","error"),!1;if(newsDraftSnapshot()!==_newsEditorState.baseline&&(persistNewsDraft(),!window.confirm("Close this editor? Your unsaved draft will be kept in this tab for recovery.")))return!1}return _newsEditorState&&window.BiscoonNewsEditor?.destroy?.(),_newsEditorState=null,document.getElementById("adminModalOverlay")?.remove(),!0}document.addEventListener("keydown",e=>{if(e.key==="Escape"&&closeModal(),e.key==="/"&&!isTypingTarget(e.target)&&!document.getElementById("adminModalOverlay")){const t=document.querySelector(".admin-search");t&&(e.preventDefault(),t.focus(),t.select?.())}}),document.addEventListener("click",async e=>{const t=e.target.closest("[data-view]");if(t&&t.closest(".admin-nav")){navigate(t.dataset.view);return}if(e.target.id==="adminModalOverlay"){e.target.querySelector(".news-editor-shell")||closeModal();return}const i=e.target.closest("[data-news-format]");if(i){if(window.BiscoonNewsEditor?.runCommand?.(i.dataset.newsFormat||"")){e.preventDefault();return}return}const a=e.target.closest("[data-insert-news-media]");if(a){if(window.BiscoonNewsEditor?.insertMedia?.(a.dataset.insertNewsMedia))return;insertIntoNewsBody(`

[[media:${a.dataset.insertNewsMedia}]]

`);return}const n=e.target.closest("[data-remove-news-media]");if(n){const m=n.dataset.removeNewsMedia;_newsMediaDraft=_newsMediaDraft.filter(I=>I.id!==m);const T=document.getElementById("newsBody");T&&(T.value=T.value.replace(new RegExp(`\\n?\\n?\\[\\[media:${m}\\]\\]\\n?\\n?`,"g"),`

`)),renderNewsMediaLibrary(),window.BiscoonNewsEditor?.mount?.({element:"#newsRichEditor",textarea:"#newsBody",media:()=>_newsMediaDraft});return}const d=e.target.closest("[data-page][data-pager-view]");if(d){const m=d.dataset.pagerView;_s[m]&&(_s[m].page=parseInt(d.dataset.page)),{users:showUsers,listings:showListings,events:showEvents,news:showNews,discussions:showDiscussions,comments:showComments,reports:showReports,audit:showAuditLogs}[m]?.();return}const s=e.target.closest("[data-comment-type]");if(s){_s.comments.type=s.dataset.commentType,showComments(1);return}const o=e.target.closest("[data-report-status]");if(o){_s.reports.status=o.dataset.reportStatus,showReports(1);return}const l=e.target.closest("[data-user-kind]");if(l&&l.closest(".admin-tabs")){_s.users.kind=l.dataset.userKind,_s.users.page=1,showUsers(1);return}if(e.target.closest("[data-create-staff]")){openCreateStaffModal();return}const c=e.target.closest("[data-edit-staff]");if(c){openEditStaffModal(c.dataset.editStaff);return}const u=e.target.closest("[data-del-staff]");if(u){if(!await confirmAction(`Delete admin user "${u.dataset.delName||"this user"}"?`,{title:"Delete admin user",confirmText:"Delete user",tone:"danger"}))return;try{await api(`/api/admin/staff/${encodeURIComponent(u.dataset.delStaff)}`,{method:"DELETE"}),closeModal(),showUsers(1),notify("Admin user deleted.","success")}catch(m){notify(m.message,"error")}return}if(e.target.closest("[data-create-event]")){openCreateEvent();return}const r=e.target.closest("[data-edit-event]");if(r){openEditEvent(r.dataset.editEvent);return}const y=e.target.closest("[data-del-event]");if(y){if(!await confirmAction(`Delete "${y.dataset.delTitle||"this event"}"?`,{title:"Delete event",confirmText:"Delete event",tone:"danger"}))return;try{await api(`/api/admin/listings/${encodeURIComponent(y.dataset.delEvent)}`,{method:"DELETE"}),closeModal(),showEvents(1),notify("Event deleted.","success")}catch(m){notify(m.message,"error")}return}if(e.target.closest("[data-create-news]")){openNewsEditor();return}if(e.target.closest("[data-create-discussion]")){openCreateDiscussion();return}const E=e.target.closest("[data-view-news]");if(E){openViewNews(E.dataset.viewNews);return}const x=e.target.closest("[data-edit-news]");if(x){openNewsEditor(x.dataset.editNews);return}const S=e.target.closest("[data-toggle-news-featured]");if(S){e.stopPropagation();const m=S.dataset.toggleNewsFeatured,T=S.dataset.featured!=="1";try{await api(`/api/admin/news/${encodeURIComponent(m)}/featured`,{method:"PUT",body:JSON.stringify({featured:T})}),showNews(),notify(T?"Story featured.":"Story unfeatured.","success")}catch(I){notify(I.message,"error")}return}const B=e.target.closest("[data-toggle-news-status]");if(B){e.stopPropagation();const m=B.dataset.toggleNewsStatus,T=B.dataset.status==="published"?"draft":"published";try{await api(`/api/admin/news/${encodeURIComponent(m)}/status`,{method:"PUT",body:JSON.stringify({status:T})}),showNews(),notify(T==="published"?"Story published.":"Story moved to draft.","success")}catch(I){notify(I.message,"error")}return}const A=e.target.closest("[data-del-news]");if(A){if(!await confirmAction(`Delete "${A.dataset.delTitle||"this story"}"?`,{title:"Delete news story",confirmText:"Delete story",tone:"danger"}))return;try{await api(`/api/admin/news/${encodeURIComponent(A.dataset.delNews)}`,{method:"DELETE"}),closeModal(),showNews(1),notify("News story deleted.","success")}catch(m){notify(m.message,"error")}return}const H=e.target.closest("[data-view-user]");if(H){const m=H.dataset;openUserDetail(m.viewUser,m.viewUserName,m.viewUserEmail,m.viewUserRole,m.viewUserJoined,m.viewUserListings);return}const v=e.target.closest("[data-view-listing]");if(v){openViewListing(v.dataset.viewListing);return}const h=e.target.closest("[data-edit-listing]");if(h){openEditListing(h.dataset.editListing);return}const L=e.target.closest("[data-view-discussion]");if(L){openViewDiscussion(L.dataset.viewDiscussion);return}const f=e.target.closest("[data-edit-discussion]");if(f){openEditDiscussion(f.dataset.editDiscussion);return}const $=e.target.closest("[data-del-user]");if($){if(!await confirmAction(`Delete "${$.dataset.delName||"this user"}"? Their listings will also be removed.`,{title:"Delete regular user",confirmText:"Delete user",tone:"danger"}))return;try{await api(`/api/admin/users/${encodeURIComponent($.dataset.delUser)}`,{method:"DELETE"}),closeModal(),showUsers(1),notify("Regular user deleted.","success")}catch(m){notify(m.message,"error")}return}const M=e.target.closest("[data-del-listing]");if(M){if(!await confirmAction("Delete this listing?",{title:"Delete listing",confirmText:"Delete listing",tone:"danger"}))return;try{await api(`/api/admin/listings/${encodeURIComponent(M.dataset.delListing)}`,{method:"DELETE"}),closeModal(),showListings(1),notify("Listing deleted.","success")}catch(m){notify(m.message,"error")}return}const p=e.target.closest("[data-del-discussion]");if(p){if(!await confirmAction("Delete this discussion and all its comments?",{title:"Delete discussion",confirmText:"Delete discussion",tone:"danger"}))return;try{await api(`/api/admin/discussions/${encodeURIComponent(p.dataset.delDiscussion)}`,{method:"DELETE"}),closeModal(),showDiscussions(1),notify("Discussion deleted.","success")}catch(m){notify(m.message,"error")}return}const g=e.target.closest("[data-del-comment]");if(g){if(!await confirmAction("Remove this comment?",{title:"Remove comment",confirmText:"Remove comment",tone:"danger"}))return;const{commentId:m,parentId:T,parentType:I}=g.dataset;try{await api(`/api/admin/${I}s/${encodeURIComponent(T)}/comments/${encodeURIComponent(m)}`,{method:"DELETE"}),showComments(1),notify("Comment removed.","success")}catch(k){notify(k.message,"error")}return}const b=e.target.closest("[data-restore-type]");if(b){const m=b.dataset.restoreType,T=b.dataset.restoreId;if(!await confirmAction(`Restore this ${m}? It will become visible again.`,{title:"Restore item",confirmText:"Restore",tone:"primary"}))return;try{await api(`/api/admin/trash/${encodeURIComponent(m)}/${encodeURIComponent(T)}/restore`,{method:"PUT"}),showTrash(),notify(`${capitalize(m)} restored successfully.`,"success")}catch(I){notify(I.message,"error")}return}const w=e.target.closest("[data-view-spot]");if(w){openViewSpotlight(w.dataset.viewSpot);return}const C=e.target.closest("[data-edit-spot]");if(C){openEditSpotlight(C.dataset.editSpot);return}const R=e.target.closest("[data-toggle-spot]");if(R){try{await api(`/api/admin/spotlights/${encodeURIComponent(R.dataset.toggleSpot)}/toggle`,{method:"PUT"}),showSpotlights(),notify("Spotlight updated \u2014 Live means it shows on the homepage.","success")}catch(m){notify(m.message,"error")}return}const U=e.target.closest("[data-move-spot]");if(U){const m=U.dataset.moveSpot,T=Number(U.dataset.moveDir||0);try{const k=[...(await api("/api/admin/spotlights")).spotlights||[]].sort((D,z)=>(D.order??0)-(z.order??0)),P=k.findIndex(D=>D.id===m),N=P+T;if(P<0||N<0||N>=k.length)return;const j=k[P],V=k[N],W=j.order??P,_=V.order??N;await api(`/api/admin/spotlights/${encodeURIComponent(j.id)}`,{method:"PUT",body:JSON.stringify({order:_})}),await api(`/api/admin/spotlights/${encodeURIComponent(V.id)}`,{method:"PUT",body:JSON.stringify({order:W})}),showSpotlights(),notify("Carousel order updated.","success")}catch(I){notify(I.message,"error")}return}const F=e.target.closest("[data-del-spot]");if(F){if(!await confirmAction("Delete this spotlight?",{title:"Delete spotlight",confirmText:"Delete spotlight",tone:"danger"}))return;try{await api(`/api/admin/spotlights/${encodeURIComponent(F.dataset.delSpot)}`,{method:"DELETE"}),showSpotlights(),notify("Spotlight deleted.","success")}catch(m){notify(m.message,"error")}return}const O=e.target.closest("[data-toggle-ann]");if(O){try{await api(`/api/admin/announcements/${encodeURIComponent(O.dataset.toggleAnn)}/toggle`,{method:"PUT"}),showAnnouncements(),notify("Announcement status updated.","success")}catch(m){notify(m.message,"error")}return}const q=e.target.closest("[data-del-ann]");if(q){if(!await confirmAction("Delete this announcement?",{title:"Delete announcement",confirmText:"Delete announcement",tone:"danger"}))return;try{await api(`/api/admin/announcements/${encodeURIComponent(q.dataset.delAnn)}`,{method:"DELETE"}),showAnnouncements(),notify("Announcement deleted.","success")}catch(m){notify(m.message,"error")}return}if(e.target.closest("#adminLogout")){if(!closeModal())return;localStorage.removeItem(ADMIN_TOKEN_KEY),localStorage.removeItem(ADMIN_SESSION_KEY),localStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY),window.location.href="login.html"}}),document.addEventListener("change",async e=>{if(e.target.closest("#newsMediaFiles, #newsInlineImages")){const i=Array.from(e.target.files||[]);if(!i.length)return;const a=e.target.id==="newsInlineImages";await runNewsMediaTask(async()=>{if(_newsMediaDraft.length+i.length>24)throw new Error("A story can contain up to 24 media items.");for(const n of i){if(!n.type.startsWith("image/")&&!n.type.startsWith("video/"))throw new Error("Choose image or video files.");if(n.type.startsWith("video/")&&n.size>18*1024*1024)throw new Error(`${n.name} is too large. Videos must be under 18 MB.`)}for(const n of i){const d=await uploadNewsMedia(n);_newsMediaDraft.push(d),a&&window.BiscoonNewsEditor?.insertMedia?.(d),renderNewsMediaLibrary(),persistNewsDraft()}document.getElementById("newsMediaLibrary")?.closest("details")?.setAttribute("open",""),notify(`${i.length} media item${i.length!==1?"s":""} ${a?"inserted into your story":"added to the library"}.`,"success")}),e.target.value="";return}const t=e.target.closest("[data-report-status-update]");if(t)try{await api(`/api/admin/reports/${encodeURIComponent(t.dataset.reportStatusUpdate)}/status`,{method:"PUT",body:JSON.stringify({status:t.value})}),showReports(1),notify("Report status updated.","success")}catch(i){notify(i.message,"error")}}),document.addEventListener("input",e=>{const t=e.target.closest("[data-news-media-caption]");if(!t)return;const i=_newsMediaDraft.find(a=>a.id===t.dataset.newsMediaCaption);i&&(i.caption=t.value.trim())});
