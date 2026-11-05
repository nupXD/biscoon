const BASE=window.location.origin.startsWith("file://")?"http://localhost:4000":window.location.origin,ADMIN_TOKEN_KEY="biscoonAdminToken",ADMIN_SESSION_KEY="biscoonAdminSession",ADMIN_LAST_ACTIVITY_KEY="biscoonAdminLastActivity",ADMIN_SIDEBAR_COLLAPSED_KEY="biscoonAdminSidebarCollapsed";let _token="",_me=null,_view="",_newsMediaDraft=[],_newsEditorState=null,_modalBaseline="",_modalSaving=!1,_modalReturnFocus=null,_inlineBaseline="";function inlineSnapshot(){return JSON.stringify(Array.from(document.querySelectorAll(".admin-ann-form input, .admin-ann-form textarea, .admin-ann-form select, #spotTitle, #spotSubtitle, #spotBody, #spotImageUrl, #spotImageFile, #spotType, #spotBadgeText, #spotBadgeColor, #spotCtaText, #spotCtaUrl, #spotOrder, #spotStart, #spotEnd")).map(e=>[e.id,e.value,e.checked]))}function allowInlineLeave(){return document.querySelector("#spotSubmit, #annSubmit")?.disabled?(notify("Please wait for publishing to finish.","info"),!1):_inlineBaseline&&inlineSnapshot()!==_inlineBaseline&&!window.confirm("Discard your unsaved changes? Choose Cancel to keep editing.")?!1:(_inlineBaseline="",!0)}function modalSnapshot(){return JSON.stringify(Array.from(document.querySelectorAll("#adminModalOverlay input, #adminModalOverlay textarea, #adminModalOverlay select")).map(e=>[e.id,e.value,e.checked]))}function modalIsDirty(){return!!document.getElementById("adminModalSave")&&!_newsEditorState&&modalSnapshot()!==_modalBaseline}function trapDialogFocus(e,t){e.addEventListener("keydown",i=>{if(i.key==="Escape"&&(i.preventDefault(),i.stopPropagation(),t()),i.key!=="Tab")return;const n=Array.from(e.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')).filter(s=>!s.hasAttribute("disabled")&&!s.closest("[inert]")&&s.getClientRects().length),a=n[0],o=n[n.length-1];if(!a){i.preventDefault();return}i.shiftKey&&(document.activeElement===a||!e.contains(document.activeElement))?(i.preventDefault(),o.focus()):!i.shiftKey&&(document.activeElement===o||!e.contains(document.activeElement))&&(i.preventDefault(),a.focus())})}function newsDraftSnapshot(){window.BiscoonNewsEditor?.sync?.();const e=t=>document.getElementById(t)?.value||"";return JSON.stringify({title:e("newsTitle"),summary:e("newsSummary"),body:e("newsBody"),category:e("newsCategory"),status:e("newsStatus"),imageUrl:e("newsImageUrl"),sourceName:e("newsSource"),authorName:e("newsAuthor"),featured:!!document.getElementById("newsFeatured")?.checked,media:_newsMediaDraft})}function persistNewsDraft(){if(!(!_newsEditorState||!document.getElementById("newsTitle")))try{const e=newsDraftSnapshot();e!==_newsEditorState.baseline?sessionStorage.setItem(_newsEditorState.key,e):sessionStorage.removeItem(_newsEditorState.key);const t=document.getElementById("newsDraftStatus");t&&!_newsEditorState.pending&&(t.textContent=e===_newsEditorState.baseline?"No unsaved changes":"Draft backed up in this tab")}catch{const e=document.getElementById("newsDraftStatus");e&&(e.textContent="Draft backup unavailable. Save before leaving.")}}window.addEventListener("beforeunload",e=>{(_modalSaving||modalIsDirty()||_inlineBaseline&&inlineSnapshot()!==_inlineBaseline)&&(e.preventDefault(),e.returnValue=""),_newsEditorState&&(persistNewsDraft(),(_newsEditorState.saving||_newsEditorState.pending||newsDraftSnapshot()!==_newsEditorState.baseline)&&(e.preventDefault(),e.returnValue=""))});for(const e of["input","change","click","news-editor-change"])document.addEventListener(e,()=>{_newsEditorState&&queueMicrotask(persistNewsDraft)});const _s={users:{page:1,search:"",kind:"regular"},listings:{page:1,category:"",search:""},events:{page:1,search:""},news:{page:1,status:"all",category:"",search:"",featured:"all",range:"all"},discussions:{page:1,search:""},comments:{page:1,type:"all",search:""},reports:{page:1,status:"open"},spotlight:{},announcements:{},audit:{page:1,action:"all",targetType:"all",search:""},dashboard:{range:"all",updatedAt:0}},workspaceDefaults=JSON.parse(JSON.stringify(_s));function writeWorkspace(e=!1){if(!_view)return;const t=new URL(window.location.href);t.search="",t.searchParams.set("view",_view);for(const[i,n]of Object.entries(_s[_view]||{}))i!=="updatedAt"&&n!==""&&n!==workspaceDefaults[_view]?.[i]&&t.searchParams.set(i,String(n));t.href!==window.location.href&&history[e?"pushState":"replaceState"]({},"",t)}function restoreWorkspace(){const e=new URLSearchParams(window.location.search),t=e.get("view")||firstAccessibleView(),i=canAccessView(t)&&(Object.prototype.hasOwnProperty.call(workspaceDefaults,t)||t==="trash")?t:firstAccessibleView();if(_s[i]){Object.assign(_s[i],workspaceDefaults[i]);for(const n of Object.keys(_s[i])){const a=e.get(n);a===null||n==="updatedAt"||(_s[i][n]=n==="page"?Math.max(1,Math.min(1e5,Number(a)||1)):a)}}navigate(i,!1)}window.addEventListener("popstate",()=>{if(_me){if(!closeModal()||!allowInlineLeave()){writeWorkspace(!0);return}restoreWorkspace()}});let _dashRefreshTimer=null,_dashUpdatedTimer=null;document.addEventListener("DOMContentLoaded",async()=>{if(setupAdminShell(),_token=localStorage.getItem(ADMIN_TOKEN_KEY)||"",!_token){goLogin();return}try{const e=await api("/api/auth/me"),t=e.user||e;if(!isAdminRole(t.role)){notify("Access denied. Admin accounts only.","error"),window.location.href="../../index.html";return}_me=t,document.getElementById("adminName").textContent=`${_me.name} \xB7 ${roleLabel(_me.role)}`,syncNavVisibility(),restoreWorkspace(),updateAttentionCounts()}catch{goLogin()}});async function api(e,t={}){const i={Authorization:`Bearer ${_token}`,...t.headers||{}};t.body&&(i["Content-Type"]="application/json");const n=await fetch(BASE+e,{...t,headers:i}),a=await n.json();if(!n.ok)throw new Error(a.error||"Request failed.");return localStorage.setItem(ADMIN_LAST_ACTIVITY_KEY,String(Date.now())),a}function goLogin(){window.location.href="login.html"}const VIEW_TITLES={dashboard:"Dashboard",users:"Users",listings:"Listings",events:"Events",news:"News",discussions:"Discussions",comments:"Comments",reports:"Reports",spotlight:"Homepage Spotlight",announcements:"Announcements",audit:"Audit Logs",trash:"Trash"},VIEW_HINTS={dashboard:"Live snapshot of users, listings, news, discussions, and recent activity.",users:"Review regular accounts and manage admin users with assigned privileges.",listings:"Inspect, edit, and moderate public listings across all categories.",events:"Create, edit, and manage community events posted on Biscoon.",news:"Draft, publish, feature, and manage newsroom stories with rich media.",discussions:"Create and moderate community discussion threads.",comments:"Review listing and discussion comments from one moderation queue.",reports:"Track reported content and move each report through review.",spotlight:"Banners that rotate in the homepage hero. Live ones appear to visitors; paused ones stay hidden.",announcements:"Publish site-wide messages and control visibility.",trash:"Soft-deleted content \u2014 the internet is forever. Only super-admins can restore or permanently delete.",audit:"Review super-admin activity, content changes, and moderation actions."},VIEW_PERMISSION={users:"users",listings:"listings",events:"listings",news:"news",discussions:"discussions",comments:"comments",reports:"reports",spotlight:"announcements",announcements:"announcements"},ADMIN_PERMISSION_DEFS=[{key:"users",label:"Regular Users",description:"View regular accounts, inspect their content, and remove regular users."},{key:"listings",label:"Listings",description:"View, edit, and delete marketplace listings and events."},{key:"news",label:"News",description:"Create, edit, publish, feature, and delete newsroom stories."},{key:"discussions",label:"Discussions",description:"Create, view, edit, and delete community discussions."},{key:"comments",label:"Comments",description:"Review and remove listing or discussion comments."},{key:"reports",label:"Reports",description:"Review reports and update moderation status."},{key:"announcements",label:"Announcements",description:"Create, pause, activate, and delete site announcements."}];function navigate(e,t=!0){if(!closeModal()||!allowInlineLeave())return;if(!canAccessView(e)){content('<div class="admin-error">You do not have permission to open this admin section.</div>');return}stopDashboardAutoRefresh(),_view=e,writeWorkspace(t),document.querySelectorAll(".admin-nav-link").forEach(n=>n.classList.toggle("active",n.dataset.view===e)),document.getElementById("viewTitle").textContent=VIEW_TITLES[e]||e;const i=document.getElementById("viewHint");i&&(i.textContent=VIEW_HINTS[e]||"Manage Biscoon admin operations."),content(loadingState(VIEW_TITLES[e]||"Loading")),{dashboard:showDashboard,users:showUsers,listings:showListings,events:showEvents,news:showNews,discussions:showDiscussions,comments:showComments,reports:showReports,spotlight:showSpotlights,announcements:showAnnouncements,audit:showAuditLogs,trash:showTrash}[e]?.()}function content(e){const t=document.getElementById("adminContent");t&&(t.innerHTML=e,_inlineBaseline=inlineSnapshot(),t.classList.remove("admin-content-enter"),t.offsetWidth,t.classList.add("admin-content-enter"))}function loadingState(e="Loading"){return`
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
    </div>`}function setupAdminShell(){const e=document.getElementById("adminLayout"),t=document.getElementById("adminSidebarToggle"),i=document.getElementById("adminSidebarClose"),n=document.getElementById("adminSidebarBackdrop"),a=document.getElementById("adminNav"),o=document.getElementById("adminRefreshView"),s=()=>window.matchMedia("(max-width: 768px)").matches;if(!document.getElementById("adminToastHost")){const l=document.createElement("div");l.id="adminToastHost",l.className="admin-toast-host",l.setAttribute("aria-live","polite"),document.body.appendChild(l)}e&&localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY)==="true"&&e.classList.add("admin-sidebar-collapsed");const d=()=>e?.classList.remove("admin-sidebar-mobile-open");t?.addEventListener("click",()=>{if(s()){e?.classList.toggle("admin-sidebar-mobile-open");return}const l=!e?.classList.contains("admin-sidebar-collapsed");e?.classList.toggle("admin-sidebar-collapsed",l),localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY,String(l))}),i?.addEventListener("click",d),n?.addEventListener("click",d),a?.addEventListener("click",l=>{s()&&l.target.closest(".admin-nav-link")&&d()}),document.addEventListener("keydown",l=>{l.key==="Escape"&&d()}),window.addEventListener("resize",()=>{s()||d()}),o?.addEventListener("click",()=>refreshCurrentView(!0)),setupGlobalSearch()}function setupGlobalSearch(){const e=document.createElement("div");e.id="adminGlobalSearch",e.className="admin-gs-overlay",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-label","Global search");const t=document.createElement("div");t.className="admin-gs-box";const i=document.createElement("div");i.className="admin-gs-input-row";const n="http://www.w3.org/2000/svg",a=document.createElementNS(n,"svg");a.setAttribute("class","admin-gs-icon"),a.setAttribute("width","18"),a.setAttribute("height","18"),a.setAttribute("viewBox","0 0 16 16"),a.setAttribute("fill","none"),a.setAttribute("aria-hidden","true");const o=document.createElementNS(n,"circle");o.setAttribute("cx","6.5"),o.setAttribute("cy","6.5"),o.setAttribute("r","4.5"),o.setAttribute("stroke","currentColor"),o.setAttribute("stroke-width","1.6");const s=document.createElementNS(n,"path");s.setAttribute("d","M10.5 10.5L14 14"),s.setAttribute("stroke","currentColor"),s.setAttribute("stroke-width","1.6"),s.setAttribute("stroke-linecap","round"),a.appendChild(o),a.appendChild(s);const d=document.createElement("input");d.id="adminGsInput",d.className="admin-gs-input",d.type="search",d.placeholder="Search users, listings, discussions, news\u2026",d.setAttribute("autocomplete","off"),d.setAttribute("spellcheck","false");const l=document.createElement("kbd");l.className="admin-gs-esc",l.textContent="Esc",i.appendChild(a),i.appendChild(d),i.appendChild(l);const c=document.createElement("div");c.id="adminGsResults",c.className="admin-gs-results",t.appendChild(i),t.appendChild(c),e.appendChild(t),document.body.appendChild(e);let m,r=-1;function y(){e.classList.add("open"),d.value="",c.textContent="",r=-1,setTimeout(()=>d.focus(),60)}function E(){e.classList.remove("open"),d.blur()}document.getElementById("adminSearchTrigger")?.addEventListener("click",y),e.addEventListener("click",v=>{v.target===e&&E()}),document.addEventListener("keydown",v=>{if((v.metaKey||v.ctrlKey)&&v.key==="k"){v.preventDefault(),y();return}if(v.key==="Escape"&&e.classList.contains("open")){E();return}if(!e.classList.contains("open"))return;const h=c.querySelectorAll(".admin-gs-item");v.key==="ArrowDown"&&(v.preventDefault(),r=Math.min(r+1,h.length-1),x(h)),v.key==="ArrowUp"&&(v.preventDefault(),r=Math.max(r-1,0),x(h)),v.key==="Enter"&&r>=0&&(v.preventDefault(),h[r]?.click())});function x(v){v.forEach((h,$)=>h.classList.toggle("active",$===r)),v[r]?.scrollIntoView({block:"nearest"})}function M(v){c.textContent="";const h=document.createElement("div");h.className="admin-gs-hint",h.textContent=v,c.appendChild(h)}const A={user:"\u{1F464}",listing:"\u{1F4CB}",discussion:"\u{1F4AC}",news:"\u{1F4F0}"},B={user:"blue",listing:"green",discussion:"purple",news:"red"};function H(v){const h=document.createElement("button");h.className="admin-gs-item",h.dataset.gsType=String(v.type||""),h.dataset.gsId=String(v.id||"");const $=document.createElement("span");$.className="admin-gs-item-icon",$.textContent=A[v.type]||"\u{1F4C4}";const f=document.createElement("span");f.className="admin-gs-item-body";const L=document.createElement("span");L.className="admin-gs-item-label",L.textContent=String(v.label||"\u2014");const S=document.createElement("span");S.className="admin-gs-item-sub",S.textContent=String(v.sub||v.category||""),f.appendChild(L),f.appendChild(S);const p=document.createElement("span");return p.className=`admin-badge admin-badge-${B[v.type]||"gray"}`,p.textContent=String(v.type),h.appendChild($),h.appendChild(f),h.appendChild(p),h.addEventListener("click",()=>{const g=h.dataset.gsType,b=h.dataset.gsId;E(),g==="user"?(navigate("users"),setTimeout(()=>document.querySelector(`[data-view-user="${CSS.escape(b)}"]`)?.click(),600)):g==="listing"?(navigate("listings"),setTimeout(()=>document.querySelector(`[data-view-listing="${CSS.escape(b)}"]`)?.click(),600)):g==="discussion"?(navigate("discussions"),setTimeout(()=>document.querySelector(`[data-view-discussion="${CSS.escape(b)}"]`)?.click(),600)):g==="news"&&navigate("news")}),h}d.addEventListener("input",()=>{const v=d.value.trim();if(r=-1,clearTimeout(m),v.length<2){v.length?M("Type at least 2 characters\u2026"):c.textContent="";return}M("Searching\u2026"),m=setTimeout(async()=>{var h;try{const $=await api(`/api/admin/search?q=${encodeURIComponent(v)}`);if(c.textContent="",!$.results.length){M("No results found.");return}const f={};for(const L of $.results)(f[h=L.type]??(f[h]=[])).push(L);for(const[L,S]of Object.entries(f)){const p=document.createElement("div");p.className="admin-gs-group";const g=document.createElement("div");g.className="admin-gs-group-label",g.textContent=capitalize(L==="news"?"News":L+"s"),p.appendChild(g);for(const b of S)p.appendChild(H(b));c.appendChild(p)}}catch{M("Search failed. Try again.")}},260)})}function refreshCurrentView(e=!1){if(!closeModal()||!allowInlineLeave())return;const i={dashboard:showDashboard,users:showUsers,listings:showListings,events:showEvents,news:showNews,discussions:showDiscussions,comments:showComments,reports:showReports,spotlight:showSpotlights,announcements:showAnnouncements,audit:showAuditLogs,trash:showTrash}[_view];i&&(content(loadingState("Refreshing")),i(),e&&notify("Refreshing current view.","info"))}function notify(e,t="info"){const i=document.getElementById("adminToastHost");if(!i||!e)return;const n=document.createElement("div");n.className=`admin-toast admin-toast-${t}`;const a=t==="success"?"\u2713":t==="error"||t==="warning"?"!":"i";n.innerHTML=`<span class="admin-toast-icon">${a}</span><span>${esc(e)}</span>`,i.appendChild(n),requestAnimationFrame(()=>n.classList.add("show")),setTimeout(()=>{n.classList.remove("show"),setTimeout(()=>n.remove(),180)},t==="error"?5200:3200)}function confirmAction(e,t={}){return new Promise(i=>{const n=document.activeElement,a=document.getElementById("adminModalOverlay")||document.getElementById("adminLayout"),o=a?.hasAttribute("inert");a?.setAttribute("inert","");const s=document.createElement("div");s.className="admin-confirm-overlay";const d=t.tone==="danger"?"danger":"primary";s.innerHTML=`
      <div class="admin-confirm" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
        <div class="admin-confirm-icon admin-confirm-icon-${d}">${d==="danger"?"!":"?"}</div>
        <div class="admin-confirm-body">
          <div class="admin-confirm-title" id="confirmTitle">${esc(t.title||"Confirm action")}</div>
          <div class="admin-confirm-message">${esc(e)}</div>
        </div>
        <div class="admin-confirm-actions">
          <button class="admin-btn admin-btn-ghost" data-confirm-cancel>Cancel</button>
          <button class="admin-btn ${d==="danger"?"admin-btn-danger-solid":"admin-btn-primary"}" data-confirm-ok>${esc(t.confirmText||"Confirm")}</button>
        </div>
      </div>`,document.body.appendChild(s);let l=!1;const c=m=>{l||(l=!0,s.classList.remove("show"),setTimeout(()=>{s.remove(),o||a?.removeAttribute("inert"),n?.focus()},160),i(m))};s.addEventListener("click",m=>{(m.target===s||m.target.closest("[data-confirm-cancel]"))&&c(!1),m.target.closest("[data-confirm-ok]")&&c(!0)}),requestAnimationFrame(()=>s.classList.add("show")),trapDialogFocus(s,()=>c(!1)),s.querySelector("[data-confirm-cancel]")?.focus()})}function isTypingTarget(e){const t=e?.tagName?.toLowerCase();return t==="input"||t==="textarea"||t==="select"||e?.isContentEditable}function esc(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]??t)}function fmtDate(e){return e?new Date(e).toLocaleDateString(void 0,{month:"short",day:"numeric",year:"numeric"}):"\u2014"}function fmtTime(e){if(!e)return"\u2014";const t=new Date(e),n=(new Date().getTime()-t.getTime())/1e3;return n<60?"just now":n<3600?`${Math.floor(n/60)}m ago`:n<86400?`${Math.floor(n/3600)}h ago`:fmtDate(e)}function badge(e,t="gray"){return`<span class="admin-badge admin-badge-${t}">${esc(e)}</span>`}function capitalize(e){return e?e.charAt(0).toUpperCase()+e.slice(1):""}function isSuperAdminRole(e){return e==="super-admin"||e==="admin"}function isStaffAdminRole(e){return e==="staff"||e==="sub-admin"}function isAdminRole(e){return isSuperAdminRole(e)||isStaffAdminRole(e)}function canManageStaff(){return isSuperAdminRole(_me?.role??"")}function roleLabel(e){return isSuperAdminRole(e)?"Super Admin":isStaffAdminRole(e)?"Admin User":"Regular User"}function roleBadge(e){const t=e||"user",i=isSuperAdminRole(t)?"red":isStaffAdminRole(t)?"blue":"gray";return badge(roleLabel(t),i)}function assignedPermissions(e=_me){return isSuperAdminRole(e?.role)?ADMIN_PERMISSION_DEFS.map(t=>t.key):e?.role==="sub-admin"&&(!e.permissions||e.permissions.length===0)?ADMIN_PERMISSION_DEFS.map(t=>t.key):Array.isArray(e?.permissions)?e.permissions:[]}function hasAdminPermission(e){return isSuperAdminRole(_me?.role)||assignedPermissions(_me).includes(e)}function canAccessView(e){return e==="audit"?canManageStaff():!VIEW_PERMISSION[e]||hasAdminPermission(VIEW_PERMISSION[e])}function firstAccessibleView(){return["dashboard","users","listings","news","discussions","comments","reports","announcements","audit"].find(canAccessView)||"dashboard"}function syncNavVisibility(){document.querySelectorAll(".admin-nav-link[data-view]").forEach(e=>{e.hidden=!canAccessView(e.dataset.view);const t=e.querySelector(".admin-nav-label")?.textContent||"";e.setAttribute("aria-label",t),e.title=t}),document.querySelectorAll(".admin-nav-group").forEach(e=>{e.hidden=!e.querySelector(".admin-nav-link:not([hidden])")})}function permissionSummary(e=[]){return e.length?ADMIN_PERMISSION_DEFS.filter(i=>e.includes(i.key)).map(i=>badge(i.label,"blue")).join(" "):'<span class="admin-muted">No privileges</span>'}function permissionCheckboxes(e=[]){const t=new Set(e);return`<div class="admin-permission-grid">
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
    <tbody>${t.map(i=>`<tr>${i.map(n=>`<td>${n}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`:'<div class="admin-empty">No records found.</div>'}function pager(e,t,i){if(t<=1)return"";const n=Math.min(t,9),a=Array.from({length:n},(o,s)=>s+1).map(o=>`<button class="admin-page-btn${o===e?" active":""}" data-page="${o}" data-pager-view="${i}">${o}</button>`);return t>n&&a.push(`<span style="padding:0 6px;color:#6b7a8d;align-self:center">\u2026 ${t}</span>`),`<div class="admin-pagination">${a.join("")}</div>`}function tabs(e,t,i){return`<div class="admin-tabs">${e.map(n=>`<button class="admin-tab${n.value===t?" active":""}" data-${i}="${n.value}">${n.label}</button>`).join("")}</div>`}const DASH_RANGES=[{value:"today",label:"Today"},{value:"7d",label:"7d"},{value:"30d",label:"30d"},{value:"all",label:"All"}];function stopDashboardAutoRefresh(){_dashRefreshTimer&&(clearInterval(_dashRefreshTimer),_dashRefreshTimer=null),_dashUpdatedTimer&&(clearInterval(_dashUpdatedTimer),_dashUpdatedTimer=null)}function startDashboardAutoRefresh(){stopDashboardAutoRefresh(),_dashRefreshTimer=setInterval(()=>{_view!=="dashboard"||document.hidden||document.getElementById("adminModalOverlay")||document.querySelector(".admin-confirm-overlay")||showDashboard(!0)},6e4),_dashUpdatedTimer=setInterval(()=>{if(_view!=="dashboard")return;const e=document.getElementById("dashUpdatedAt");e&&_s.dashboard.updatedAt&&(e.textContent=formatUpdatedAgo(_s.dashboard.updatedAt))},1e3)}function formatUpdatedAgo(e){const t=Math.max(0,Math.floor((Date.now()-e)/1e3));return t<5?"Updated just now":t<60?`Updated ${t}s ago`:`Updated ${Math.floor(t/60)}m ago`}function rangeTrendLabel(e){return e==="today"?"today":e==="7d"?"this week":e==="30d"?"this month":"this week"}function animateStatValues(e=document){e.querySelectorAll("[data-count-to]").forEach(t=>{const i=Number(t.dataset.countTo||0),n=650,a=performance.now(),o=0;function s(d){const l=Math.min(1,(d-a)/n),c=1-Math.pow(1-l,3);t.textContent=Math.round(o+(i-o)*c).toLocaleString(),l<1&&requestAnimationFrame(s)}requestAnimationFrame(s)})}async function updateAttentionCounts(){const e=async d=>{try{const l=await api(d);return Number(l.total||0)}catch{return null}},[t,i,n]=await Promise.all([hasAdminPermission("reports")?e("/api/admin/reports?status=open&limit=1"):null,hasAdminPermission("reports")?e("/api/admin/reports?status=reviewing&limit=1"):null,hasAdminPermission("news")?e("/api/admin/news?status=draft&limit=1"):null]),a=t===null||i===null?null:t+i,o=document.getElementById("reportsNavCount");o&&(o.textContent=a===null?"":String(a),o.hidden=a===null);const s=document.getElementById("dashboardAttention");s&&(s.innerHTML=`<div class="attention-intro"><div class="attention-heading">Community desk</div><h2>Needs attention</h2><p>Review community reports and finish unpublished stories.</p></div><div class="attention-actions">
      ${hasAdminPermission("reports")?`<button class="admin-btn admin-btn-ghost" data-attention="reports">${a===null?"Reports unavailable \u2014 open reports":`${t} open reports`}</button>`:""}
      ${hasAdminPermission("reports")&&i!==null?`<button class="admin-btn admin-btn-ghost" data-attention="reviewing">${i} reports in review</button>`:""}
      ${hasAdminPermission("news")?`<button class="admin-btn admin-btn-ghost" data-attention="news">${n===null?"Draft count unavailable \u2014 open news":`${n} unpublished drafts`}</button>`:""}
      </div>`)}async function showDashboard(e=!1){writeWorkspace();try{e||content(loadingState("Dashboard"));const t=_s.dashboard.range||"all",[i,n]=await Promise.all([api(`/api/admin/stats?range=${encodeURIComponent(t)}`),api("/api/admin/feed")]);if(_view!=="dashboard")return;const a=i,o=a.byCategory[0]?.count||1;_s.dashboard.updatedAt=Date.now();const s=rangeTrendLabel(t);content(`
      <div class="dash-header">
        <div>
          <div class="dash-greeting">Welcome back, ${esc(_me.name.split(" ")[0])}</div>
          <div class="dash-updated" id="dashUpdatedAt">${formatUpdatedAgo(_s.dashboard.updatedAt)}</div>
        </div>
        <div class="dash-header-actions">
          <div class="dash-range" role="tablist" aria-label="Dashboard time range">
            ${DASH_RANGES.map(d=>`
              <button type="button" class="dash-range-btn${d.value===t?" active":""}" data-dash-range="${d.value}" role="tab" aria-selected="${d.value===t}">${d.label}</button>
            `).join("")}
          </div>
          <button class="admin-btn admin-btn-ghost dash-refresh" id="dashRefresh" type="button">\u21BA Refresh</button>
        </div>
      </div>

      ${hasAdminPermission("reports")||hasAdminPermission("news")?'<section class="admin-attention" id="dashboardAttention" aria-live="polite">Loading items that need attention\u2026</section>':""}
      <div class="dash-stat-grid">
        ${hasAdminPermission("users")?statCard("\u{1F465}",t==="all"?"Total Users":"Users",a.users.total,a.users.thisWeek,a.users.today,"blue","users",s):""}
        ${hasAdminPermission("listings")?statCard("\u{1F4CB}",t==="all"?"Total Listings":"Listings",a.listings.total,a.listings.thisWeek,a.listings.today,"green","listings",s):""}
        ${hasAdminPermission("news")?statCard("\u{1F4F0}",t==="all"?"Published News":"News",a.news.total,a.news.thisWeek,null,"red","news",s):""}
        ${hasAdminPermission("discussions")?statCard("\u{1F4AC}","Discussions",a.discussions.total,a.discussions.thisWeek,null,"purple","discussions",s):""}
      </div>

      <div class="dash-quick-actions">
        ${hasAdminPermission("users")?'<button class="dash-action-btn" data-nav-to="users" data-user-kind="regular">Regular Users</button>':""}
        ${canManageStaff()?'<button class="dash-action-btn" data-nav-to="users" data-user-kind="staff">Admin Users</button>':""}
        ${hasAdminPermission("listings")?'<button class="dash-action-btn" data-nav-to="listings">Manage Listings</button>':""}
        ${hasAdminPermission("news")?'<button class="dash-action-btn dash-action-primary" data-create-news>Publish News</button>':""}
        ${hasAdminPermission("discussions")?'<button class="dash-action-btn" data-create-discussion>Start Discussion</button>':""}
        ${hasAdminPermission("comments")?'<button class="dash-action-btn" data-nav-to="comments">Review Comments</button>':""}
        ${hasAdminPermission("announcements")?'<button class="dash-action-btn" data-nav-to="announcements">Create Announcement</button>':""}
        ${canManageStaff()?'<button class="dash-action-btn" data-nav-to="audit">Audit Logs</button>':""}
      </div>

      <div class="admin-two-col">
        <div class="admin-card">
          <div class="admin-card-head">
            <span>Recent Activity</span>
            <span class="dash-card-sub">${n.feed.length} events</span>
          </div>
          <div class="admin-feed">
            ${n.feed.map(d=>`
              <div class="admin-feed-item dash-feed-clickable" data-feed-type="${esc(d.type)}" data-feed-id="${esc(d.id||"")}" tabindex="0" role="button">
                <div class="admin-feed-icon admin-feed-icon-${esc(d.type)}">${d.icon}</div>
                <div class="admin-feed-body">
                  <div class="admin-feed-title">${esc(d.title)}</div>
                  <div class="admin-feed-sub"><span class="dash-feed-chip">${esc(d.type)}</span> ${esc(d.sub)}</div>
                </div>
                <div class="admin-feed-meta">
                  <div class="admin-feed-time">${fmtTime(d.date)}</div>
                  <div class="dash-feed-open">Open \u2192</div>
                </div>
              </div>
            `).join("")||'<div class="admin-empty">No activity yet.</div>'}
          </div>
        </div>

        ${hasAdminPermission("listings")?`<div class="admin-card">
          <div class="admin-card-head">
            <span>Listings by Category</span>
            <span class="dash-card-sub">${a.byCategory.length} categories \xB7 click to filter</span>
          </div>
          <div class="dash-bar-chart">
            ${a.byCategory.map(d=>`
              <div class="dash-bar-row dash-bar-clickable" data-nav-to="listings" data-listing-category="${esc(d.category)}" tabindex="0" role="button" title="Open ${esc(capitalize(d.category))} listings">
                <div class="dash-bar-label" title="${esc(capitalize(d.category))}">${esc(capitalize(d.category))}</div>
                <div class="dash-bar-track">
                  <div class="dash-bar-fill" style="width:${Math.round(d.count/o*100)}%"></div>
                  <span class="dash-bar-count">${d.count}</span>
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
            ${(a.recentUsers||[]).map(d=>`
              <div class="dash-mini-item dash-mini-clickable" data-view-user="${esc(d.id)}" data-view-user-name="${esc(d.name)}" data-view-user-email="${esc(d.email)}" data-view-user-role="${esc(d.role||"user")}" data-view-user-joined="${esc(d.createdAt)}" data-view-user-listings="0" title="View user profile">
                <div class="dash-mini-avatar" style="background:${userColor(d.name)}">${esc(d.name.charAt(0).toUpperCase())}</div>
                <div class="dash-mini-body">
                  <div class="dash-mini-name">${esc(d.name)}</div>
                  <div class="dash-mini-sub">${esc(d.email)}</div>
                </div>
                <div class="dash-mini-meta">
                  ${isAdminRole(d.role)?roleBadge(d.role):""}
                  <span class="dash-mini-date">${fmtTime(d.createdAt)}</span>
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
            ${(a.recentListings||[]).map(d=>`
              <div class="dash-mini-item dash-mini-clickable" data-view-listing="${esc(d.id)}" title="View listing">
                <div class="dash-mini-cat-icon">${catEmoji(d.category)}</div>
                <div class="dash-mini-body">
                  <div class="dash-mini-name">${esc(d.title)}</div>
                  <div class="dash-mini-sub">${esc(d.location||capitalize(d.category)||"\u2014")}</div>
                </div>
                <div class="dash-mini-meta">
                  ${badge(d.category,"green")}
                  <span class="dash-mini-date">${fmtTime(d.createdAt)}</span>
                </div>
              </div>
            `).join("")||'<div class="admin-empty">No listings yet.</div>'}
          </div>
        </div>`:""}
      </div>
    `),animateStatValues(),startDashboardAutoRefresh(),document.getElementById("dashRefresh")?.addEventListener("click",()=>{content(loadingState("Refreshing dashboard")),showDashboard()}),document.querySelectorAll("[data-dash-range]").forEach(d=>{d.addEventListener("click",()=>{const l=d.dataset.dashRange;!l||l===_s.dashboard.range||(_s.dashboard.range=l,content(loadingState("Updating dashboard")),showDashboard())})}),updateAttentionCounts(),document.querySelectorAll("[data-nav-to]").forEach(d=>{const l=()=>{d.dataset.userKind&&(_s.users.kind=d.dataset.userKind),d.dataset.listingCategory!==void 0&&(_s.listings.category=d.dataset.listingCategory||"",_s.listings.page=1),navigate(d.dataset.navTo)};d.addEventListener("click",l),d.addEventListener("keydown",c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),l())})}),document.querySelectorAll(".dash-feed-clickable").forEach(d=>{const l=()=>{const c=d.dataset.feedType||"",m=d.dataset.feedId||"";if(c==="listing"&&m){navigate("listings"),setTimeout(()=>{document.querySelector(`[data-view-listing="${CSS.escape(m)}"]`)?.click()},350);return}if(c==="discussion"&&m){navigate("discussions"),setTimeout(()=>{document.querySelector(`[data-view-discussion="${CSS.escape(m)}"]`)?.click()},350);return}if(c==="user"&&m){navigate("users");return}const r={user:"users",listing:"listings",discussion:"discussions"};r[c]&&navigate(r[c])};d.addEventListener("click",l),d.addEventListener("keydown",c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),l())})})}catch(t){content(`<div class="admin-error">${esc(t.message)}</div>`)}}function statCard(e,t,i,n,a,o,s,d="this week"){const l=s&&canAccessView(s),c=n>0?`<span class="dash-trend-up">\u2191 ${n} ${esc(d)}</span>`:`<span class="dash-trend-zero">No new ${esc(d)}</span>`,m=a!=null?` \xB7 <span class="dash-today-val">${a} today</span>`:"";return`<div class="admin-stat-card admin-stat-${o}${l?" dash-stat-clickable":""}"${l?` data-nav-to="${s}" tabindex="0" role="button"`:""}>
    <div class="admin-stat-icon" aria-hidden="true">${document.querySelector(`.admin-nav-link[data-view="${s}"] .admin-nav-icon`)?.innerHTML||esc(e)}</div>
    <div class="admin-stat-content">
      <div class="admin-stat-value" data-count-to="${Number(i)||0}">0</div>
      <div class="admin-stat-label">${t}</div>
      <div class="dash-stat-footer">${c}${m}</div>
    </div>
    <div class="dash-stat-arr">\u203A</div>
  </div>`}function userColor(e){const t=["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#6366f1","#14b8a6"];let i=0;for(let n=0;n<e.length;n++)i=(i+e.charCodeAt(n))%t.length;return t[i]}function catEmoji(e){return{jobs:"\u{1F4BC}",housing:"\u{1F3E0}",pg:"\u{1F6CF}",services:"\u{1F527}",kinbech:"\u{1F6D2}",restaurants:"\u{1F37D}",shops:"\u{1F3EA}",events:"\u{1F389}",tech:"\u{1F4BB}",healthcare:"\u{1F3E5}",education:"\u{1F4DA}",auto:"\u{1F697}",beauty:"\u{1F484}",childcare:"\u{1F476}",cleaning:"\u{1F9F9}",photography:"\u{1F4F7}",produce:"\u{1F96C}",organizations:"\u{1F3E2}",discussions:"\u{1F4AC}",student:"\u{1F393}",finance:"\u{1F4B0}",immigration:"\u2708\uFE0F"}[e]||"\u{1F4E6}"}const LISTING_VIEW_PROFILES={base:{kindLabel:"Listing",subcategoryLabel:"Specific type",descriptionLabel:"Description",locationLabel:"Location",locationTypeLabel:"Location type",priceLabel:"Price / rate",availabilityLabel:"Availability"},photography:{kindLabel:"Photography showcase",subcategoryLabel:"Photo style / genre",descriptionLabel:"Caption / story",omitFields:["location","locationType","price","availability","contactEmail","contactPhone","contactPreference","externalLink"]},housing:{kindLabel:"Housing listing",subcategoryLabel:"Housing type",descriptionLabel:"Housing details",locationLabel:"Area / neighborhood",locationTypeLabel:"Showing format",priceLabel:"Rent / cost",availabilityLabel:"Move-in / availability"},jobs:{kindLabel:"Job listing",subcategoryLabel:"Role type",descriptionLabel:"Job description",locationLabel:"Work location",locationTypeLabel:"Work setup",priceLabel:"Pay / compensation",availabilityLabel:"Start date / schedule",contactPreferenceLabel:"Application method",externalLinkLabel:"Application link"},marketplace:{kindLabel:"Marketplace listing",subcategoryLabel:"Item / business type",descriptionLabel:"Item details",locationLabel:"Pickup / service area",locationTypeLabel:"Pickup format",priceLabel:"Asking price",availabilityLabel:"Pickup / availability"},service:{kindLabel:"Service listing",subcategoryLabel:"Service type",descriptionLabel:"Service details",locationLabel:"Service area",locationTypeLabel:"Service format",priceLabel:"Rate / starting price",availabilityLabel:"Booking availability"},professional:{kindLabel:"Professional listing",subcategoryLabel:"Professional type",descriptionLabel:"Professional details",locationLabel:"Practice / service area",locationTypeLabel:"Consultation format",priceLabel:"Consultation fee",availabilityLabel:"Appointment availability"},event:{kindLabel:"Event listing",subcategoryLabel:"Event type",descriptionLabel:"Event details",locationLabel:"Venue / area",locationTypeLabel:"Event format",priceLabel:"Ticket / entry cost",availabilityLabel:"Date / timing",externalLinkLabel:"RSVP / ticket link"},community:{kindLabel:"Community post",subcategoryLabel:"Community type",descriptionLabel:"Community details",locationLabel:"Community area",locationTypeLabel:"Participation format",priceLabel:"Cost / membership",availabilityLabel:"Schedule / availability"}};function readableLabel(e){return String(e||"").trim().replace(/[-_]+/g," ").replace(/\s+/g," ").replace(/\b\w/g,t=>t.toUpperCase())}function listingViewKind(e={}){const t=String(e.category||"").trim().toLowerCase(),i=String(e.subcategory||"").trim().toLowerCase(),n=a=>a.includes(t)||a.includes(i);return t==="photography"?"photography":n(["housing","pg","paying-guest","real-estate","room","apartment","roommate","studio","sublet","moving"])?"housing":t==="jobs"||n(["rojgar","tech","healthcare","student","full-time","part-time","contract","internship","remote"])?"jobs":n(["events","concert","puja","meetup","fundraiser","class","festival","networking","music","art","sports"])?"event":n(["legal","immigration","cpa","finance","insurance","education","tutoring","jyotish"])?"professional":n(["services","cleaning","childcare","beauty","translation","handyman","catering","delivery"])?"service":n(["marketplace","kinbech","restaurants","shops","produce","auto","business-for-sale","furniture","electronics","vehicle","appliance","books"])?"marketplace":n(["community","organizations","literature","yoga","matchmaker","matrimony","pen-pals","travel"])?"community":"base"}function listingViewProfile(e={}){return LISTING_VIEW_PROFILES[listingViewKind(e)]||LISTING_VIEW_PROFILES.base}function listingValue(e){return e!=null&&String(e).trim()!==""}function listingField(e,t,i={}){if(!listingValue(t))return"";const n=i.full?" admin-modal-full":"",a=i.raw?String(t):esc(t);return`
    <div class="admin-modal-field${n}">
      <label class="admin-modal-label">${esc(e)}</label>
      <div class="admin-view-val">${a}</div>
    </div>`}function safeHttpUrl(e){const t=String(e||"").trim();return/^https?:\/\//i.test(t)?t:""}function safeMediaUrl(e){const t=String(e||"").trim();return/^https?:\/\//i.test(t)||t.startsWith("/uploads/")||/^data:image\//i.test(t)?t:""}function listingGallery(e=[],t=!1){const i=(Array.isArray(e)?e:[]).map(safeMediaUrl).filter(Boolean);return i.length?`<div class="admin-listing-gallery" data-pswp-gallery>
    ${i.map((n,a)=>`
      <a href="${esc(n)}" class="admin-listing-photo-link" data-pswp-src="${esc(n)}" data-pswp-width="1600" data-pswp-height="1200">
        <img src="${esc(n)}" alt="Listing photo ${a+1}" loading="lazy">
      </a>
    `).join("")}
  </div>`:t?'<div class="admin-listing-gallery-empty">No photos attached to this photography post.</div>':""}function sectionHero(e,t,i=""){return`<div class="ix-hero">
    <div>
      <div class="ix-hero-title">${esc(e)}</div>
      <div class="ix-hero-sub">${esc(t)}</div>
    </div>
    <div class="ix-hero-actions">${i}</div>
  </div>`}function sectionStat(e,t,i=!1,n=""){return`<button type="button" class="ix-stat${i?" active":""}" ${n}>
    <span class="ix-stat-value" data-count-to="${Number(t)||0}">0</span>
    <span class="ix-stat-label">${esc(e)}</span>
  </button>`}function wireInteractiveRows(e,t){document.querySelectorAll(e).forEach(i=>{i.addEventListener("click",n=>{n.target.closest(".ix-actions, .news-row-actions, button, select, a, input")||t(i)}),i.addEventListener("keydown",n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),t(i))})})}function bindSearch(e,t,i=350){let n;document.getElementById(e)?.addEventListener("input",a=>{clearTimeout(n),n=setTimeout(()=>t(a.target.value.trim()),i)})}async function showUsers(e){if(e!==void 0&&(_s.users.page=e),writeWorkspace(),_s.users.kind==="staff"){await showStaffUsers(_s.users.page);return}const{page:t,search:i}=_s.users;try{const n=await api(`/api/admin/users?${new URLSearchParams({page:String(t),limit:String(20),search:i})}`),a=(n.users||[]).filter(o=>(o.listingCount||0)>0).length;content(`
      ${sectionHero("Users","Review community accounts. Click a row to open the profile.",canManageStaff()?tabs([{label:"Regular Users",value:"regular"},{label:"Admin Users",value:"staff"}],_s.users.kind,"user-kind"):"")}
      <div class="ix-stat-grid">
        ${sectionStat("Total users",n.total,!0)}
        ${sectionStat("With listings",a)}
        ${sectionStat("On this page",(n.users||[]).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="userSearch" aria-label="Search users" type="search" placeholder="Search name or email\u2026" value="${esc(i)}">
        <span class="ix-count">${n.total.toLocaleString()} regular user${n.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(n.users||[]).length?`<div class="ix-list">
          ${n.users.map(o=>`
            <article class="ix-row" tabindex="0" role="button"
              data-view-user="${esc(o.id)}" data-view-user-name="${esc(o.name)}" data-view-user-email="${esc(o.email)}" data-view-user-role="${esc(o.role||"user")}" data-view-user-joined="${esc(o.createdAt)}" data-view-user-listings="${o.listingCount}">
              <div class="ix-avatar" style="background:${userColor(o.name)}">${esc((o.name||"?").charAt(0).toUpperCase())}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(o.name)}</div>
                <div class="ix-meta">${esc(o.email)}${o.phone?` \xB7 ${esc(o.phone)}`:""} \xB7 \u{1F4CB} ${o.listingCount||0} listings \xB7 Joined ${fmtDate(o.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-ghost" type="button" data-view-user="${esc(o.id)}" data-view-user-name="${esc(o.name)}" data-view-user-email="${esc(o.email)}" data-view-user-role="${esc(o.role||"user")}" data-view-user-joined="${esc(o.createdAt)}" data-view-user-listings="${o.listingCount}">\u{1F441} View</button>
                <button class="admin-btn admin-btn-danger" type="button" data-del-user="${esc(o.id)}" data-del-name="${esc(o.name)}">\u{1F5D1}</button>
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No users match this search.</div>'}
        ${pager(n.page,n.pages,"users")}
      </div>
    `),animateStatValues(),bindSearch("userSearch",o=>{_s.users.search=o,showUsers(1)},380)}catch(n){content(`<div class="admin-error">${esc(n.message)}</div>`)}}async function showStaffUsers(e){if(!canManageStaff()){_s.users.kind="regular",content('<div class="admin-error">Super admin access is required to manage admin users.</div>');return}e!==void 0&&(_s.users.page=e),writeWorkspace();const{page:t,search:i}=_s.users;try{const n=await api(`/api/admin/staff?${new URLSearchParams({page:String(t),limit:String(20),search:i})}`);content(`
      ${sectionHero("Admin Users","Manage staff accounts and privileges.",`
        ${tabs([{label:"Regular Users",value:"regular"},{label:"Admin Users",value:"staff"}],_s.users.kind,"user-kind")}
        <button class="admin-btn admin-btn-primary" data-create-staff type="button">+ Create Admin User</button>
      `)}
      <div class="ix-stat-grid">
        ${sectionStat("Admin users",n.total,!0)}
        ${sectionStat("On this page",(n.staff||[]).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="userSearch" aria-label="Search users" type="search" placeholder="Search admin users\u2026" value="${esc(i)}">
        <span class="ix-count">${n.total.toLocaleString()} admin user${n.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(n.staff||[]).length?`<div class="ix-list">
          ${n.staff.map(a=>`
            <article class="ix-row" tabindex="0" role="button" data-edit-staff-row="${esc(a.id)}" data-can-edit="${a.canEdit?"1":"0"}">
              <div class="ix-avatar" style="background:${userColor(a.name)}">${esc((a.name||"?").charAt(0).toUpperCase())}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(a.name)} ${roleBadge(a.role)}</div>
                <div class="ix-meta">${esc(a.email)} \xB7 Created ${fmtDate(a.createdAt)}</div>
                <div class="ix-sub">${a.canEdit?permissionSummary(a.permissions):badge("All privileges","red")}</div>
              </div>
              <div class="ix-actions">
                ${a.canEdit?`<button class="admin-btn admin-btn-ghost" type="button" data-edit-staff="${esc(a.id)}">\u270F\uFE0F Edit</button>
                     <button class="admin-btn admin-btn-danger" type="button" data-del-staff="${esc(a.id)}" data-del-name="${esc(a.name)}">\u{1F5D1}</button>`:'<span class="admin-you">Protected</span>'}
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No admin users found.</div>'}
        ${pager(n.page,n.pages,"users")}
      </div>
    `),animateStatValues(),bindSearch("userSearch",a=>{_s.users.search=a,showUsers(1)},380),wireInteractiveRows("[data-edit-staff-row]",a=>{a.dataset.canEdit==="1"&&openEditStaffModal(a.dataset.editStaffRow)})}catch(n){content(`<div class="admin-error">${esc(n.message)}</div>`)}}async function openUserDetail(e,t,i,n,a,o){let s;try{s=await api(`/api/admin/users/${encodeURIComponent(e)}/content`)}catch(m){notify(m.message,"error");return}const d=n||"user",l=s.listings.length?s.listings.map(m=>`<tr>
        <td><span class="admin-link" data-view-listing="${esc(m.id)}">${esc(m.title)}</span></td>
        <td>${badge(m.category,"green")}</td>
        <td>${esc(m.location||"\u2014")}</td>
        <td>${fmtDate(m.createdAt)}</td>
        <td>
          <div class="admin-actions">
            <button class="admin-btn admin-btn-ghost" style="font-size:11px" data-view-listing="${esc(m.id)}">\u{1F441} View</button>
            <button class="admin-btn admin-btn-danger" style="font-size:11px" data-del-listing="${esc(m.id)}">\u{1F5D1}</button>
          </div>
        </td>
      </tr>`).join(""):'<tr><td colspan="5" style="text-align:center;color:#6b7a8d;padding:16px">No listings yet.</td></tr>',c=s.discussions.length?s.discussions.map(m=>`<tr>
        <td><span class="admin-link" data-view-discussion="${esc(m.id)}">${esc(m.title)}</span></td>
        <td>${badge(m.category)}</td>
        <td>${m.commentCount}</td>
        <td>${fmtDate(m.createdAt)}</td>
        <td>
          <div class="admin-actions">
            <button class="admin-btn admin-btn-ghost" style="font-size:11px" data-view-discussion="${esc(m.id)}">\u{1F441} View</button>
            <button class="admin-btn admin-btn-danger" style="font-size:11px" data-del-discussion="${esc(m.id)}">\u{1F5D1}</button>
          </div>
        </td>
      </tr>`).join(""):'<tr><td colspan="5" style="text-align:center;color:#6b7a8d;padding:16px">No discussions yet.</td></tr>';openModal(`\u{1F464} ${esc(t)}`,`
    <div class="admin-user-profile-head">
      <div class="admin-user-profile-avatar" style="background:${userColor(t)}">${esc(t.charAt(0).toUpperCase())}</div>
      <div style="flex:1;min-width:0">
        <div class="admin-user-profile-name">${esc(t)}</div>
        <div class="admin-user-profile-email">${esc(i||"\u2014")}</div>
        <div class="admin-user-profile-stats">
          ${roleBadge(d)}
          <span>\u{1F4CB} ${s.listings.length} listing${s.listings.length!==1?"s":""}</span>
          <span>\u{1F4AC} ${s.discussions.length} discussion${s.discussions.length!==1?"s":""}</span>
          ${a?`<span>\u{1F5D3} Joined ${fmtDate(a)}</span>`:""}
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
  `,null)}function collectStaffForm(e){const t=Array.from(document.querySelectorAll("[data-staff-permission]:checked")).map(a=>a.value),i=document.getElementById("staffPassword")?.value||"",n={name:document.getElementById("staffName")?.value.trim(),email:document.getElementById("staffEmail")?.value.trim(),phone:document.getElementById("staffPhone")?.value.trim(),permissions:t};return(i||e)&&(n.password=i),n}function staffFormHtml(e={},t=!1){return`
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
  `}function openCreateStaffModal(){openModal("Create Admin User",staffFormHtml({},!0),async()=>{await api("/api/admin/staff",{method:"POST",body:JSON.stringify(collectStaffForm(!0))}),showUsers(1)})}async function openEditStaffModal(e){let t;try{t=await api(`/api/admin/staff/${encodeURIComponent(e)}`)}catch(i){notify(i.message,"error");return}openModal("Edit Admin User",staffFormHtml(t.staff,!1),async()=>{await api(`/api/admin/staff/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify(collectStaffForm(!1))}),showUsers(1)})}const CATEGORIES=["","jobs","housing","pg","services","kinbech","restaurants","shops","childcare","beauty","auto","cleaning","photography","produce","organizations","events","discussions","tech","healthcare","education","student","finance","immigration","other"],DISCUSSION_CATEGORIES=[{value:"general",label:"General"},{value:"jobs",label:"Jobs"},{value:"housing",label:"Housing"},{value:"services",label:"Services"},{value:"events",label:"Events"},{value:"newcomers",label:"Newcomers"},{value:"immigration",label:"Immigration"},{value:"education",label:"Education"},{value:"business",label:"Business"},{value:"community",label:"Community"}];function discussionCategoryOptions(e="general"){const t=e||"general",i=DISCUSSION_CATEGORIES.some(n=>n.value===t);return`${DISCUSSION_CATEGORIES.map(n=>`<option value="${esc(n.value)}"${n.value===t?" selected":""}>${esc(n.label)}</option>`).join("")}${i?"":`<option value="${esc(t)}" selected>${esc(capitalize(t))}</option>`}`}async function showListings(e){e!==void 0&&(_s.listings.page=e),writeWorkspace();const{page:t,category:i,search:n}=_s.listings;try{const a=await api(`/api/admin/listings?${new URLSearchParams({page:String(t),limit:String(20),category:i,search:n})}`),o=CATEGORIES.filter(Boolean).slice(0,8);content(`
      ${sectionHero("Listings","Inspect and moderate marketplace posts. Click a card to open details.")}
      <div class="ix-chip-row">
        <button type="button" class="ix-chip${i?"":" active"}" data-listing-chip="">All</button>
        ${o.map(s=>`<button type="button" class="ix-chip${i===s?" active":""}" data-listing-chip="${esc(s)}">${esc(capitalize(s))}</button>`).join("")}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="listingSearch" aria-label="Search listings" type="search" placeholder="Search listings\u2026" value="${esc(n)}">
        <select class="admin-select" id="listingCat" aria-label="Listing category">
          ${CATEGORIES.map(s=>`<option value="${esc(s)}"${s===i?" selected":""}>${s?capitalize(s):"All categories"}</option>`).join("")}
        </select>
        <span class="ix-count">${a.total.toLocaleString()} listing${a.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(a.listings||[]).length?`<div class="ix-list">
          ${a.listings.map(s=>`
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
        ${pager(a.page,a.pages,"listings")}
      </div>
    `),bindSearch("listingSearch",s=>{_s.listings.search=s,showListings(1)},380),document.getElementById("listingCat")?.addEventListener("change",s=>{_s.listings.category=s.target.value,showListings(1)}),document.querySelectorAll("[data-listing-chip]").forEach(s=>{s.addEventListener("click",()=>{_s.listings.category=s.dataset.listingChip||"",showListings(1)})}),wireInteractiveRows("[data-open-listing]",s=>openViewListing(s.dataset.openListing))}catch(a){content(`<div class="admin-error">${esc(a.message)}</div>`)}}async function showEvents(e){e!==void 0&&(_s.events.page=e),writeWorkspace();const{page:t,search:i}=_s.events;try{const n=await api(`/api/admin/listings?${new URLSearchParams({page:String(t),limit:String(20),category:"events",search:i})}`);content(`
      ${sectionHero("Events","Create and manage community events.",'<button class="admin-btn admin-btn-primary" data-create-event type="button">\uFF0B Add Event</button>')}
      <div class="ix-stat-grid">
        ${sectionStat("Events",n.total,!0)}
        ${sectionStat("On this page",(n.listings||[]).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="eventSearch" aria-label="Search events" type="search" placeholder="Search events\u2026" value="${esc(i)}">
        <span class="ix-count">${n.total.toLocaleString()} event${n.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(n.listings||[]).length?`<div class="ix-list">
          ${n.listings.map(a=>`
            <article class="ix-row" tabindex="0" role="button" data-open-listing="${esc(a.id)}">
              <div class="ix-icon">\u{1F389}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(a.title)}</div>
                <div class="ix-meta">${esc(a.availability||"Date TBD")} \xB7 ${esc(a.location||"Location TBD")} \xB7 Posted ${fmtDate(a.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-ghost" type="button" data-view-listing="${esc(a.id)}">\u{1F441} View</button>
                <button class="admin-btn admin-btn-ghost" type="button" data-edit-event="${esc(a.id)}">\u270F\uFE0F Edit</button>
                <button class="admin-btn admin-btn-danger" type="button" data-del-event="${esc(a.id)}" data-del-title="${esc(a.title)}">\u{1F5D1}</button>
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No events yet. Add one to get started.</div>'}
        ${pager(n.page,n.pages,"events")}
      </div>
    `),animateStatValues(),bindSearch("eventSearch",a=>{_s.events.search=a,showEvents(1)},380),wireInteractiveRows("[data-open-listing]",a=>openViewListing(a.dataset.openListing))}catch(n){content(`<div class="admin-error">${esc(n.message)}</div>`)}}function eventFormHtml(e={}){return`
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
        <input class="admin-modal-input" id="evDate" value="${esc(e.availability||"")}" aria-describedby="evDateHelp" placeholder="e.g. May 10, 5 PM ET"><p id="evDateHelp" class="field-guidance">Include the date, start time, and time zone.</p>
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
  `}function collectEventPayload(){return{category:"events",title:document.getElementById("evTitle").value.trim(),description:document.getElementById("evDesc").value.trim(),availability:document.getElementById("evDate").value.trim(),location:document.getElementById("evLocation").value.trim(),price:document.getElementById("evPrice").value.trim(),contactPhone:document.getElementById("evPhone").value.trim(),contactEmail:document.getElementById("evEmail").value.trim(),externalLink:document.getElementById("evLink").value.trim(),tags:document.getElementById("evTags").value.split(",").map(e=>e.trim()).filter(Boolean)}}function openCreateEvent(){openModal("Add Event",eventFormHtml(),async()=>{const e=collectEventPayload();if(!e.title)throw notify("Event title is required.","error"),new Error("validation");await api("/api/listings",{method:"POST",body:JSON.stringify(e)}),showEvents(1),notify("Event created.","success")})}async function openEditEvent(e){let t;try{t=await api(`/api/admin/listings/${encodeURIComponent(e)}`)}catch(i){notify(i.message,"error");return}openModal("Edit Event",`<div class="admin-modal-meta">Posted ${fmtDate(t.createdAt)}</div>${eventFormHtml(t)}`,async()=>{const i=collectEventPayload();if(!i.title)throw notify("Event title is required.","error"),new Error("validation");await api(`/api/admin/listings/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify(i)}),showEvents(1),notify("Event updated.","success")})}const NEWS_CATEGORIES=["","community","nepal","usa","business","immigration","culture","opinion","sports","technology","world"];function newsCategoryLabel(e){return e==="usa"?"USA":capitalize(e||"community")}function newsStatusBadge(e){return badge(e==="published"?"Published":"Draft",e==="published"?"green":"gray")}function formatNewsInline(e){return esc(e||"").replace(/\n/g,"<br>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/\[font=(serif|sans|mono)\]([\s\S]*?)\[\/font\]/g,'<span class="news-font-$1">$2</span>')}function renderNewsMediaBlock(e={}){if(!e.url)return"";const t=e.caption?`<figcaption>${esc(e.caption)}</figcaption>`:"";return`<figure class="admin-news-media">${e.type==="video"?`<video controls preload="metadata" src="${esc(e.url)}"></video>`:`<img src="${esc(e.url)}" alt="${esc(e.caption||"Article image")}">`}${t}</figure>`}function isNewsHtmlBody(e=""){return/<\/?[a-z][\s\S]*>/i.test(String(e||""))}function renderHtmlNewsBody(e="",t=[]){const i=Object.fromEntries((t||[]).map(a=>[a.id,a])),n=document.createElement("div");return n.innerHTML=String(e||""),n.querySelectorAll("p").forEach(a=>{const o=/^\[\[media:([a-zA-Z0-9_-]+)\]\]$/.exec(a.textContent?.trim()||"");if(!o)return;const s=renderNewsMediaBlock(i[o[1]]);if(!s){a.remove();return}const d=document.createElement("template");d.innerHTML=s,a.replaceWith(d.content.cloneNode(!0))}),n.innerHTML}function formatNewsBody(e,t=[]){if(isNewsHtmlBody(e))return renderHtmlNewsBody(e,t);const i=Object.fromEntries((t||[]).map(d=>[d.id,d])),n=String(e||"").split(/\r?\n/),a=[];let o=[];function s(){o.length&&(a.push(`<p>${formatNewsInline(o.join(`
`))}</p>`),o=[])}return n.forEach(d=>{const l=d.trim(),c=/^\[\[media:([a-zA-Z0-9_-]+)\]\]$/.exec(l);if(c){s(),a.push(renderNewsMediaBlock(i[c[1]]));return}if(!l){s();return}if(l.startsWith("## ")){s(),a.push(`<h3>${formatNewsInline(l.slice(3))}</h3>`);return}if(l.startsWith("> ")){s(),a.push(`<blockquote>${formatNewsInline(l.slice(2))}</blockquote>`);return}o.push(d)}),s(),a.join("")}function readFileAsDataUrl(e){return new Promise((t,i)=>{const n=new FileReader;n.onload=()=>t(n.result),n.onerror=()=>i(new Error("Could not read selected file.")),n.readAsDataURL(e)})}async function prepareNewsImage(e){if(e.size<=614400)return readFileAsDataUrl(e);const i=URL.createObjectURL(e);try{const n=new Image;await new Promise((d,l)=>{n.onload=()=>d(),n.onerror=()=>l(new Error(`Could not open ${e.name}. Try a JPG, PNG, or WebP image.`)),n.src=i});const a=document.createElement("canvas"),o=a.getContext("2d");if(!o)throw new Error("Image processing is unavailable in this browser.");let s=Math.min(1,2400/Math.max(n.naturalWidth,n.naturalHeight));for(let d=0;d<6;d++){a.width=Math.max(1,Math.round(n.naturalWidth*s)),a.height=Math.max(1,Math.round(n.naturalHeight*s)),o.fillStyle="#fff",o.fillRect(0,0,a.width,a.height),o.drawImage(n,0,0,a.width,a.height);const l=await new Promise(c=>a.toBlob(c,"image/jpeg",.85));if(!l)throw new Error(`Could not process ${e.name}. Try a different image.`);if(l.size<=614400)return readFileAsDataUrl(new File([l],"news-photo.jpg",{type:"image/jpeg"}));s*=.75}throw new Error(`Could not resize ${e.name}. Try exporting it as a JPG.`)}finally{URL.revokeObjectURL(i)}}function newsMediaTypeFromFile(e){return e?.type?.startsWith("video/")?"video":"image"}function newsMediaLibraryHtml(){return _newsMediaDraft.length?`<div class="admin-news-media-list">
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
  </div>`:'<div class="admin-empty admin-empty-compact">No story media yet. Upload images or videos, then insert them into the article body.</div>'}function renderNewsMediaLibrary(){const e=document.getElementById("newsMediaLibrary");e&&(e.innerHTML=newsMediaLibraryHtml())}function insertIntoNewsBody(e,t=""){const i=document.getElementById("newsBody");if(!i)return;const n=i.selectionStart??i.value.length,a=i.selectionEnd??i.value.length,o=i.value.slice(n,a);i.value=`${i.value.slice(0,n)}${e}${o||""}${t}${i.value.slice(a)}`;const s=o?n+e.length+o.length+t.length:n+e.length;i.focus(),i.setSelectionRange(s,s)}async function uploadNewsMedia(e){const t=newsMediaTypeFromFile(e),i=t==="image"?await prepareNewsImage(e):await readFileAsDataUrl(e),n=JSON.stringify({type:t,url:i});if(!_newsEditorState||new Blob([n]).size>_newsEditorState.maxRequestBytes)throw new Error(`${e.name} exceeds this server's upload limit. Choose a smaller file.`);return(await api("/api/admin/news/media",{method:"POST",body:n})).media}async function runNewsMediaTask(e){const t=_newsEditorState;if(!t||t.pending||t.saving){notify("Wait for the current upload or save to finish.","error");return}t.pending=!0;const i=document.querySelector(".news-editor-shell"),n=document.getElementById("adminModalSave");i&&(i.inert=!0),n&&(n.disabled=!0);const a=document.getElementById("newsDraftStatus");a&&(a.textContent="Uploading media\u2026 Please keep this page open.");try{await e()}catch(o){notify(o.message||"Media upload failed. Try again.","error")}finally{t.pending=!1,i&&(i.inert=!1),n&&(n.disabled=!1),persistNewsDraft()}}async function collectNewsPayload(){window.BiscoonNewsEditor?.sync?.();let e=document.getElementById("newsImageUrl")?.value.trim()||"";if(_newsEditorState?.pending)throw new Error("Wait for media uploads to finish before saving.");return{title:document.getElementById("newsTitle")?.value.trim(),category:document.getElementById("newsCategory")?.value,summary:document.getElementById("newsSummary")?.value.trim(),body:document.getElementById("newsBody")?.value.trim(),imageUrl:e,sourceName:document.getElementById("newsSource")?.value.trim(),authorName:document.getElementById("newsAuthor")?.value.trim(),status:document.getElementById("newsStatus")?.value,featured:!!document.getElementById("newsFeatured")?.checked,media:_newsMediaDraft.map(t=>({id:t.id,type:t.type,url:t.url,caption:t.caption||"",createdAt:t.createdAt||new Date().toISOString()}))}}function newsFormHtml(e={}){const t=e.status||"draft",i=e.category||"community",n=e.title||"",a=e.summary||"";return`
    <div class="news-compose-intro"><div><span class="news-compose-eyebrow">BISCOON NEWSROOM</span><h3>A story worth sharing.</h3><p>Give your community the context, details, and voices that matter.</p></div><span class="news-compose-note">Write \xB7 Preview \xB7 Publish</span></div>
    <div class="news-editor-shell">
      <div class="news-editor-main">
        <div class="news-editor-section">
          <div class="news-editor-section-label">01 / The headline</div>
          <div class="admin-modal-field admin-modal-full">
            <div class="news-field-head">
              <label class="admin-modal-label" for="newsTitle">Headline</label>
              <span class="news-char-count" id="newsTitleCount">${n.length}/180</span>
            </div>
            <input class="admin-modal-input news-headline-input" id="newsTitle" aria-required="true" maxlength="180" value="${esc(n)}" placeholder="Write your headline\u2026">
          </div>
          <div class="admin-modal-field admin-modal-full">
            <div class="news-field-head">
              <label class="admin-modal-label" for="newsSummary">Short summary</label>
              <span class="news-char-count" id="newsSummaryCount">${a.length}/360</span>
            </div>
            <textarea class="admin-modal-textarea" id="newsSummary" aria-required="true" rows="3" maxlength="360" placeholder="What happened, and why does it matter?">${esc(a)}</textarea>
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
            ${NEWS_CATEGORIES.filter(Boolean).map(o=>`
              <button type="button" class="news-chip${o===i?" active":""}" data-news-category-chip="${esc(o)}">${esc(newsCategoryLabel(o))}</button>
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
          <h3 class="news-preview-title" id="newsPreviewTitle">${esc(n||"Your headline appears here")}</h3>
          <p class="news-preview-summary" id="newsPreviewSummary">${esc(a||"Your short summary appears here as you write.")}</p>
          <div class="news-preview-byline" id="newsPreviewByline">${esc(e.sourceName||"Biscoon Newsroom")}${e.authorName?" \xB7 "+esc(e.authorName):""}</div>
        </div>
        <div class="news-preview-hint">Click the card to preview your full story \u2192</div><p class="news-preview-hint" id="newsDraftStatus" role="status">No unsaved changes</p>
      </aside>
    </div>
  `}function openNewsFullPreview(){if(document.getElementById("newsFullPreview"))return;window.BiscoonNewsEditor?.sync?.();const e=a=>document.getElementById(a)?.value.trim()||"",t=e("newsTitle")||"Your headline appears here",i=e("newsImageUrl")||_newsMediaDraft.find(a=>a.type==="image")?.url||"",n=document.createElement("dialog");n.id="newsFullPreview",n.className="news-full-preview",n.setAttribute("aria-labelledby","newsFullPreviewLabel"),n.innerHTML=`
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
    </article>`,n.querySelector("[data-close-full-preview]")?.addEventListener("click",()=>n.close()),n.addEventListener("keydown",a=>{a.key==="Escape"&&a.stopPropagation()}),n.addEventListener("close",()=>{n.remove(),document.getElementById("newsFullPreviewTrigger")?.focus()}),document.getElementById("adminModalOverlay")?.appendChild(n),n.showModal()}function wireNewsEditorInteractivity(){const e=document.getElementById("newsFullPreviewTrigger");e?.addEventListener("click",openNewsFullPreview),e?.addEventListener("keydown",p=>{(p.key==="Enter"||p.key===" ")&&(p.preventDefault(),openNewsFullPreview())});const t=document.getElementById("newsTitle"),i=document.getElementById("newsSummary"),n=document.getElementById("newsSource"),a=document.getElementById("newsAuthor"),o=document.getElementById("newsImageUrl"),s=document.getElementById("newsImageFile"),d=document.getElementById("newsFeatured"),l=document.getElementById("newsStatus"),c=document.getElementById("newsCategory"),m=document.getElementById("adminModalSave"),r=document.getElementById("newsPreviewTitle"),y=document.getElementById("newsPreviewSummary"),E=document.getElementById("newsPreviewByline"),x=document.getElementById("newsPreviewCategory"),M=document.getElementById("newsPreviewStatus"),A=document.getElementById("newsPreviewFeatured"),B=document.getElementById("newsPreviewCover"),H=document.getElementById("newsCoverPreview"),v=document.getElementById("newsTitleCount"),h=document.getElementById("newsSummaryCount");function $(p){const g=esc(t?.value.trim()||"Cover image"),b=p?`<img src="${esc(p)}" alt="${g}">`:'<div class="news-dropzone-empty">Drop an image here, paste a URL, or choose a file</div>';H&&(H.innerHTML=b),B&&(B.innerHTML=p?`<img src="${esc(p)}" alt="${g}">`:"<span>Cover preview</span>")}function f(){if(r&&(r.textContent=t?.value.trim()||"Your headline appears here"),y&&(y.textContent=i?.value.trim()||"Your short summary appears here as you write."),v&&(v.textContent=`${t?.value.length||0}/180`),h&&(h.textContent=`${i?.value.length||0}/360`),E){const p=n?.value.trim()||"Biscoon Newsroom",g=a?.value.trim();E.textContent=g?`${p} \xB7 ${g}`:p}x&&c&&(x.textContent=newsCategoryLabel(c.value)),M&&l&&(M.textContent=capitalize(l.value||"draft"),M.className=`admin-badge ${l.value==="published"?"admin-badge-green":"admin-badge-gray"}`),A&&(A.style.display=d?.checked?"":"none"),m&&l&&(m.textContent=l.value==="published"?m.disabled?"Saving\u2026":"Publish Story":m.disabled?"Saving\u2026":"Save Draft")}function L(){const p=document.getElementById("newsBody"),g=document.createElement("div");g.innerHTML=p?.value||"";const b=(g.textContent||"").trim().split(/\s+/).filter(Boolean).length,w=document.getElementById("newsWritingStats");w&&(w.textContent=`${b} words \xB7 ${Math.ceil(b/200)} min read`)}document.getElementById("newsRichEditor")?.addEventListener("input",()=>{window.BiscoonNewsEditor?.sync?.(),L()}),L(),document.getElementById("newsAddInlineImages")?.addEventListener("click",()=>{document.getElementById("newsInlineImages")?.click()}),t?.addEventListener("input",f),i?.addEventListener("input",f),n?.addEventListener("input",f),a?.addEventListener("input",f),d?.addEventListener("change",f),document.querySelectorAll("[data-news-status-pill]").forEach(p=>{p.addEventListener("click",()=>{const g=p.dataset.newsStatusPill||"draft";l&&(l.value=g),document.querySelectorAll("[data-news-status-pill]").forEach(w=>{w.classList.toggle("active",w===p),w.setAttribute("aria-pressed",String(w===p))});const b=document.getElementById("newsPublishHelp");b&&(b.textContent=g==="published"?"Saving makes this story visible on the news page.":"Only admins can see drafts. Publish when your story is ready."),f()})}),document.querySelectorAll("[data-news-category-chip]").forEach(p=>{p.addEventListener("click",()=>{const g=p.dataset.newsCategoryChip||"community";c&&(c.value=g),document.querySelectorAll("[data-news-category-chip]").forEach(b=>b.classList.toggle("active",b===p)),f()})}),o?.addEventListener("input",()=>{$(o.value.trim())}),s?.addEventListener("change",async()=>{const p=s.files?.[0];if(p)try{await runNewsMediaTask(async()=>{const g=await uploadNewsMedia(p);o&&(o.value=g.url),s&&(s.value=""),$(g.url)})}catch(g){notify(g.message||"Could not read image.","error")}});function S(p,g){const b=document.getElementById(p);b&&(["dragenter","dragover"].forEach(w=>{b.addEventListener(w,C=>{C.preventDefault(),b.classList.add("is-dragover")})}),["dragleave","drop"].forEach(w=>{b.addEventListener(w,C=>{C.preventDefault(),b.classList.remove("is-dragover")})}),b.addEventListener("drop",w=>{const C=w.dataTransfer?.files;C?.length&&g(C)}))}S("newsCoverDrop",async p=>{const g=p[0];if(!g||!g.type.startsWith("image/")){notify("Please drop an image file.","error");return}try{await runNewsMediaTask(async()=>{const b=await uploadNewsMedia(g);o&&(o.value=b.url),s&&(s.value=""),$(b.url)})}catch(b){notify(b.message||"Could not read image.","error")}}),S("newsMediaDrop",p=>{const g=document.getElementById("newsMediaFiles");if(!g)return;const b=new DataTransfer;Array.from(p).forEach(w=>b.items.add(w)),g.files=b.files,g.dispatchEvent(new Event("change",{bubbles:!0}))}),f()}async function showNews(e){e!==void 0&&(_s.news.page=e),writeWorkspace();const{page:t,status:i,category:n,search:a,featured:o,range:s}=_s.news;try{const d=new URLSearchParams({page:String(t),limit:String(20),status:i,category:n,search:a,featured:o,range:s}),l=await api(`/api/admin/news?${d}`),c=l.summary||{all:l.total,published:0,draft:0,featured:0};content(`
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
        <button type="button" class="news-stat-card${i==="all"&&o==="all"?" active":""}" data-news-filter-status="all" data-news-filter-featured="all">
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
        <button type="button" class="news-stat-card${o==="yes"?" active":""}" data-news-filter-status="all" data-news-filter-featured="yes">
          <span class="news-stat-value" data-count-to="${c.featured||0}">0</span>
          <span class="news-stat-label">Featured</span>
        </button>
      </div>

      <div class="admin-toolbar news-toolbar">
        <input class="admin-search" id="newsSearch" aria-label="Search news" type="search" placeholder="Search news\u2026" value="${esc(a)}">
        <div class="admin-tabs" role="tablist">
          ${[{value:"all",label:"All"},{value:"published",label:"Published"},{value:"draft",label:"Draft"}].map(r=>`<button type="button" class="admin-tab${i===r.value?" active":""}" data-news-status-tab="${r.value}">${r.label}</button>`).join("")}
        </div>
        <select class="admin-select" id="newsCategoryFilter" aria-label="News category">
          ${NEWS_CATEGORIES.map(r=>`<option value="${esc(r)}"${r===n?" selected":""}>${r?newsCategoryLabel(r):"All categories"}</option>`).join("")}
        </select>
        <button type="button" class="admin-btn${o==="yes"?" admin-btn-primary":" admin-btn-ghost"}" data-news-featured-toggle aria-pressed="${o==="yes"}">\u2605 Featured only</button>
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
                  <button class="admin-btn admin-btn-ghost" type="button" data-toggle-news-featured="${esc(r.id)}" data-featured="${r.featured?"1":"0"}" aria-pressed="${!!r.featured}" aria-label="${r.featured?"Remove from featured stories":"Feature this story"}">${r.featured?"\u2605 Featured":"\u2606 Feature"}</button>
                  <button class="admin-btn admin-btn-ghost" type="button" data-toggle-news-status="${esc(r.id)}" data-status="${esc(r.status||"draft")}" title="Toggle publish">${r.status==="published"?"Unpublish":"Publish"}</button>
                  <button class="admin-btn admin-btn-ghost" type="button" data-edit-news="${esc(r.id)}">Edit</button>
                  <button class="admin-btn admin-btn-danger" type="button" data-del-news="${esc(r.id)}" data-del-title="${esc(r.title)}" aria-label="Move story to trash">Trash</button>
                </div>
              </article>
            `).join("")}
          </div>
        `:'<div class="admin-empty">No stories match these filters.</div>'}
        ${pager(l.page,l.pages,"news")}
      </div>
    `),animateStatValues();let m;document.getElementById("newsSearch")?.addEventListener("input",r=>{clearTimeout(m),m=setTimeout(()=>{_s.news.search=r.target.value.trim(),showNews(1)},350)}),document.getElementById("newsCategoryFilter")?.addEventListener("change",r=>{_s.news.category=r.target.value,showNews(1)}),document.querySelectorAll("[data-news-range]").forEach(r=>{r.addEventListener("click",()=>{const y=r.dataset.newsRange;!y||y===_s.news.range||(_s.news.range=y,showNews(1))})}),document.querySelectorAll("[data-news-filter-status]").forEach(r=>{r.addEventListener("click",()=>{_s.news.status=r.dataset.newsFilterStatus||"all",_s.news.featured=r.dataset.newsFilterFeatured||"all",showNews(1)})}),document.querySelectorAll("[data-news-status-tab]").forEach(r=>{r.addEventListener("click",()=>{_s.news.status=r.dataset.newsStatusTab||"all",showNews(1)})}),document.querySelectorAll("[data-news-featured-toggle]").forEach(r=>{r.addEventListener("click",()=>{_s.news.featured=_s.news.featured==="yes"?"all":"yes",showNews(1)})}),document.querySelectorAll(".news-row").forEach(r=>{const y=()=>openViewNews(r.dataset.newsOpen);r.addEventListener("click",E=>{E.target.closest(".news-row-actions")||y()}),r.addEventListener("keydown",E=>{(E.key==="Enter"||E.key===" ")&&(E.preventDefault(),y())})})}catch(d){content(`<div class="admin-error">${esc(d.message)}</div>`)}}async function openViewNews(e){let t;try{t=await api(`/api/admin/news/${encodeURIComponent(e)}`)}catch(n){notify(n.message,"error");return}const i=t.article;openModal(esc(i.title),`
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
      <button class="admin-btn" style="background:#E63946;color:#fff;border-color:#E63946" data-edit-news="${esc(i.id)}">Edit News</button>
      <button class="admin-btn admin-btn-danger" data-del-news="${esc(i.id)}" data-del-title="${esc(i.title)}" aria-label="Move story to trash">Trash Delete</button>
    </div>
  `,null)}async function openNewsEditor(e=""){if(!closeModal())return;let t={},i;try{i=(await api("/api/admin/news/media-limits")).maxRequestBytes,e&&(t=(await api(`/api/admin/news/${encodeURIComponent(e)}`)).article)}catch(s){notify(s.message,"error");return}const n=`biscoon-news-draft:${_me?.id||"session"}:${e||"new"}`;let a=!1;try{const s=sessionStorage.getItem(n);s&&window.confirm("Restore your unsaved news draft from this tab?")?(t={...t,...JSON.parse(s)},a=!0):s&&sessionStorage.removeItem(n)}catch{}_newsMediaDraft=(t.media||[]).map(s=>({...s})),openModal(e?"Edit News Story":"Create News Story",newsFormHtml(t),async()=>{const s=_newsEditorState;if(!s||s.pending)throw new Error("Wait for media uploads to finish before saving.");s.saving=!0;const d=document.querySelector(".news-editor-shell");d&&(d.inert=!0);try{const l=JSON.stringify(await collectNewsPayload());if(new Blob([l]).size>s.maxRequestBytes)throw new Error("This story exceeds the upload limit. Remove some media or shorten the story.");await api(e?`/api/admin/news/${encodeURIComponent(e)}`:"/api/admin/news",{method:e?"PUT":"POST",body:l}),s.baseline=newsDraftSnapshot();try{sessionStorage.removeItem(n)}catch{}showNews(1)}finally{s.saving=!1,d&&(d.inert=!1)}}),_newsEditorState={key:n,baseline:"",saving:!1,pending:!1,maxRequestBytes:i};const o=document.getElementById("adminModalOverlay");o?.querySelector(".admin-modal")?.classList.add("admin-modal-wide"),requestAnimationFrame(()=>{!o?.isConnected||!_newsEditorState||(window.BiscoonNewsEditor?.mount?.({element:"#newsRichEditor",textarea:"#newsBody",media:()=>_newsMediaDraft}),wireNewsEditorInteractivity(),_newsEditorState.baseline=a?"":newsDraftSnapshot(),persistNewsDraft())})}async function showDiscussions(e){e!==void 0&&(_s.discussions.page=e),writeWorkspace();const{page:t,search:i}=_s.discussions;try{const n=await api(`/api/admin/discussions?${new URLSearchParams({page:String(t),limit:"20",search:i})}`),a=(n.discussions||[]).reduce((o,s)=>o+(s.commentCount||0),0);content(`
      ${sectionHero("Discussions","Moderate community threads. Click a row to open.",'<button class="admin-btn admin-btn-primary" data-create-discussion type="button">+ Add Discussion</button>')}
      <div class="ix-stat-grid">
        ${sectionStat("Discussions",n.total,!0)}
        ${sectionStat("Comments (page)",a)}
        ${sectionStat("On this page",(n.discussions||[]).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="discussionSearch" aria-label="Search discussions" type="search" placeholder="Search discussions\u2026" value="${esc(i)}">
        <span class="ix-count">${n.total.toLocaleString()} discussion${n.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(n.discussions||[]).length?`<div class="ix-list">
          ${n.discussions.map(o=>`
            <article class="ix-row" tabindex="0" role="button" data-open-discussion="${esc(o.id)}">
              <div class="ix-icon">\u{1F4AC}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(o.title)}</div>
                <div class="ix-meta">${esc(o.authorName)} \xB7 ${badge(o.category)} \xB7 ${o.commentCount||0} comments \xB7 ${fmtDate(o.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-ghost" type="button" data-view-discussion="${esc(o.id)}">\u{1F441} View</button>
                <button class="admin-btn admin-btn-ghost" type="button" data-edit-discussion="${esc(o.id)}">\u270F\uFE0F Edit</button>
                <button class="admin-btn admin-btn-danger" type="button" data-del-discussion="${esc(o.id)}">\u{1F5D1}</button>
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No discussions found.</div>'}
        ${pager(n.page,n.pages,"discussions")}
      </div>
    `),animateStatValues(),bindSearch("discussionSearch",o=>{_s.discussions.search=o,showDiscussions(1)},380),wireInteractiveRows("[data-open-discussion]",o=>{o.querySelector("[data-view-discussion]")?.click()})}catch(n){content(`<div class="admin-error">${esc(n.message)}</div>`)}}async function showComments(e){e!==void 0&&(_s.comments.page=e),writeWorkspace();const{page:t,type:i,search:n}=_s.comments;try{const a=await api(`/api/admin/comments?${new URLSearchParams({page:String(t),limit:String(25),type:i,search:n})}`),o=(a.comments||[]).filter(d=>d.parentType==="listing").length,s=(a.comments||[]).filter(d=>d.parentType==="discussion").length;content(`
      ${sectionHero("Comments","Moderate user comments across listings and discussions.",tabs([{label:"All",value:"all"},{label:"Listing Comments",value:"listing"},{label:"Discussion Comments",value:"discussion"}],i,"comment-type"))}
      <div class="ix-stat-grid">
        ${sectionStat("Total",a.total,i==="all")}
        ${sectionStat("Listings (page)",o,i==="listing")}
        ${sectionStat("Discussions (page)",s,i==="discussion")}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="commentSearch" aria-label="Search comments" type="search" placeholder="Search comments\u2026" value="${esc(n)}">
        <span class="ix-count">${a.total.toLocaleString()} comment${a.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(a.comments||[]).length?`<div class="ix-list">
          ${a.comments.map(d=>`
            <article class="ix-row ix-row-static">
              <div class="ix-icon">${d.parentType==="listing"?"\u{1F4CB}":"\u{1F4AC}"}</div>
              <div class="ix-body">
                <div class="ix-title">${esc((d.body||"").slice(0,160))}${(d.body||"").length>160?"\u2026":""}</div>
                <div class="ix-meta">${esc(d.authorName)} \xB7 on ${esc(d.parentTitle)} \xB7 ${badge(d.parentType,d.parentType==="listing"?"green":"blue")} \xB7 ${fmtDate(d.createdAt)}</div>
              </div>
              <div class="ix-actions">
                <button class="admin-btn admin-btn-danger" type="button" data-del-comment data-comment-id="${esc(d.id)}" data-parent-id="${esc(d.parentId)}" data-parent-type="${esc(d.parentType)}">\u{1F5D1} Remove</button>
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No comments match these filters.</div>'}
        ${pager(a.page,a.pages,"comments")}
      </div>
    `),animateStatValues(),bindSearch("commentSearch",d=>{_s.comments.search=d,showComments(1)},380)}catch(a){content(`<div class="admin-error">${esc(a.message)}</div>`)}}async function showReports(e){updateAttentionCounts(),e!==void 0&&(_s.reports.page=e),writeWorkspace();const{page:t,status:i}=_s.reports;try{const n=await api(`/api/admin/reports?${new URLSearchParams({page:String(t),limit:String(25),status:i})}`);content(`
      ${sectionHero("Reports","Triage abuse reports. Change status inline without leaving the list.",tabs([{label:"Open",value:"open"},{label:"Reviewing",value:"reviewing"},{label:"Resolved",value:"resolved"},{label:"Dismissed",value:"dismissed"},{label:"All",value:"all"}],i,"report-status"))}
      <div class="ix-stat-grid">
        ${sectionStat("In filter",n.total,!0)}
        ${sectionStat("On this page",(n.reports||[]).length)}
      </div>
      <div class="admin-card ix-card">
        ${(n.reports||[]).length?`<div class="ix-list">
          ${n.reports.map(a=>`
            <article class="ix-row ix-row-static">
              <div class="ix-icon">${a.reason==="scam"||a.reason==="illegal"?"\u{1F6A8}":"\u2691"}</div>
              <div class="ix-body">
                <div class="ix-title">${esc(a.targetType)} \xB7 ${badge(a.reason,a.reason==="scam"||a.reason==="illegal"?"red":"blue")} ${badge(a.status,a.status==="open"?"red":a.status==="resolved"?"green":"gray")}</div>
                <div class="ix-meta">Reporter ${esc(a.reporterName||a.reporterId)} \xB7 ${fmtDate(a.createdAt)} \xB7 <span class="admin-muted">${esc(a.targetId)}</span></div>
                <div class="ix-sub">${esc(a.details||"No details provided.")}</div>
              </div>
              <div class="ix-actions">
                <select class="admin-select-sm" data-report-status-update="${esc(a.id)}" aria-label="Report status">
                  ${["open","reviewing","resolved","dismissed"].map(o=>`<option value="${o}"${o===a.status?" selected":""}>${capitalize(o)}</option>`).join("")}
                </select>
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No reports in this status.</div>'}
        ${pager(n.page,n.pages,"reports")}
      </div>
    `),animateStatValues()}catch(n){content(`<div class="admin-error">${esc(n.message)}</div>`)}}const AUDIT_ACTIONS=["all","admin_user.created","admin_user.updated","admin_user.deleted","regular_user.deleted","news.created","news.updated","news.deleted","listing.updated","listing.deleted","discussion.created","discussion.updated","discussion.deleted","report.status_updated","listing_comment.deleted","discussion_comment.deleted","announcement.created","announcement.toggled","announcement.deleted"],AUDIT_TARGET_TYPES=["all","staff","user","news","listing","discussion","report","listing_comment","discussion_comment","announcement"];function auditLabel(e){return readableLabel(e).replace(/\bId\b/g,"ID")}function auditActionBadge(e){const t=e.includes("deleted")?"red":e.includes("created")?"green":e.includes("updated")||e.includes("toggled")?"blue":"gray";return badge(auditLabel(e),t)}async function showAuditLogs(e){if(!canManageStaff()){content('<div class="admin-error">Super admin access is required to view audit logs.</div>');return}e!==void 0&&(_s.audit.page=e),writeWorkspace();const{page:t,action:i,targetType:n,search:a}=_s.audit;try{const o=await api(`/api/admin/audit-logs?${new URLSearchParams({page:String(t),limit:"25",action:i,targetType:n,search:a})}`);content(`
      ${sectionHero("Audit Logs","Trace admin actions across the platform.")}
      <div class="ix-stat-grid">
        ${sectionStat("Events",o.total,!0)}
        ${sectionStat("On this page",(o.auditLogs||[]).length)}
      </div>
      <div class="admin-toolbar">
        <input class="admin-search" id="auditSearch" aria-label="Search audit logs" type="search" placeholder="Search actor, target, or action\u2026" value="${esc(a)}">
        <select class="admin-select" id="auditActionFilter" aria-label="Audit action">
          ${AUDIT_ACTIONS.map(s=>`<option value="${esc(s)}"${s===i?" selected":""}>${s==="all"?"All actions":auditLabel(s)}</option>`).join("")}
        </select>
        <select class="admin-select" id="auditTargetFilter" aria-label="Record type">
          ${AUDIT_TARGET_TYPES.map(s=>`<option value="${esc(s)}"${s===n?" selected":""}>${s==="all"?"All targets":auditLabel(s)}</option>`).join("")}
        </select>
        <span class="ix-count">${o.total.toLocaleString()} audit event${o.total!==1?"s":""}</span>
      </div>
      <div class="admin-card ix-card">
        ${(o.auditLogs||[]).length?`<div class="ix-list">
          ${o.auditLogs.map(s=>`
            <article class="ix-row ix-row-static">
              <div class="ix-body">
                <div class="ix-title">${auditActionBadge(s.action||"action")}</div>
                <div class="ix-meta"><strong>${esc(s.actorName||"Admin")}</strong> \xB7 ${esc(s.actorEmail||s.actorId||"")} \xB7 ${fmtTime(s.createdAt)} \xB7 ${fmtDate(s.createdAt)}</div>
                <div class="ix-sub">Target: ${esc(s.targetTitle||auditLabel(s.targetType||"target"))}${s.targetType?` (${esc(s.targetType)}${s.targetId?` \xB7 ${esc(s.targetId)}`:""})`:""}</div>
                <div class="ix-sub admin-muted">${esc(formatAuditMetadata(s.metadata))}</div>
              </div>
            </article>`).join("")}
        </div>`:'<div class="admin-empty">No audit events match these filters.</div>'}
        ${pager(o.page,o.pages,"audit")}
      </div>
    `),animateStatValues(),bindSearch("auditSearch",s=>{_s.audit.search=s,showAuditLogs(1)},350),document.getElementById("auditActionFilter")?.addEventListener("change",s=>{_s.audit.action=s.target.value,showAuditLogs(1)}),document.getElementById("auditTargetFilter")?.addEventListener("change",s=>{_s.audit.targetType=s.target.value,showAuditLogs(1)})}catch(o){content(`<div class="admin-error">${esc(o.message)}</div>`)}}function formatAuditMetadata(e={}){const t=Object.entries(e||{}).filter(([,i])=>i!=null&&i!=="");return t.length?t.map(([i,n])=>`${auditLabel(i)}: ${Array.isArray(n)?n.join(", "):n}`).join(" \xB7 "):"\u2014"}async function showTrash(){try{const e=await api("/api/admin/trash"),t=(a,o)=>`<button class="admin-btn admin-btn-ghost" style="font-size:11px" data-restore-type="${esc(a)}" data-restore-id="${esc(o)}">\u21A9 Restore</button>`,i=(e.listings?.length||0)+(e.discussions?.length||0)+(e.news?.length||0)+(e.announcements?.length||0)+(e.spotlights?.length||0)+(e.users?.length||0),n=(a,o,s,d,l)=>s.length?`
        <div class="admin-card ix-card" style="margin-bottom:20px">
          <div class="ix-section-head">
            <span>${o} ${a}</span>
            <span class="ix-count">${s.length} item${s.length!==1?"s":""}</span>
          </div>
          <div class="ix-list">
            ${s.map(c=>`
              <article class="ix-row ix-row-static">
                <div class="ix-body">
                  <div class="ix-title">${esc(c.title||c.name||"(untitled)")}</div>
                  <div class="ix-meta">${d(c)} \xB7 Deleted ${fmtDate(c.deletedAt)}</div>
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
      ${n("Listings","\u{1F4CB}",e.listings||[],a=>badge(a.category||"","gray"),"listing")}
      ${n("Discussions","\u{1F4AC}",e.discussions||[],a=>esc(a.authorName||""),"discussion")}
      ${n("News","\u{1F4F0}",e.news||[],a=>badge(a.status||"draft",a.status==="published"?"green":"gray"),"news")}
      ${n("Announcements","\u{1F4E2}",e.announcements||[],()=>"","announcement")}
      ${n("Spotlights","\u{1F3AC}",e.spotlights||[],a=>badge(a.type||"ad","blue"),"spotlight")}
      ${n("Users","\u{1F464}",e.users||[],a=>`${esc(a.email||"")} \xB7 ${badge(a.role||"user","gray")}`,"user")}
      ${i===0?'<div class="admin-empty">Trash is empty \u2014 nothing has been soft-deleted yet.</div>':""}
    `),animateStatValues()}catch(e){content(`<div class="admin-error">${esc(e.message)}</div>`)}}function isHttpUrl(e){try{const t=new URL(e);return t.protocol==="http:"||t.protocol==="https:"}catch{return!1}}function isSpotlightImageValue(e){return e?e.startsWith("data:image/")||e.startsWith("/uploads/")||e.startsWith("uploads/")?!0:isHttpUrl(e):!1}function clearSpotlightFieldErrors(e=document){e.querySelectorAll(".is-invalid").forEach(t=>t.classList.remove("is-invalid")),e.querySelectorAll("[data-spot-field-error]").forEach(t=>{t.textContent="",t.hidden=!0})}function setSpotlightFieldError(e,t){document.getElementById(e)?.classList.add("is-invalid");const n=document.querySelector(`[data-spot-field-error="${e}"]`);n&&(n.textContent=t,n.hidden=!1)}function validateSpotlightFields(e,t){clearSpotlightFieldErrors();const i=[];e.title?e.title.length<3&&i.push({id:t.title,message:"Headline should be at least 3 characters."}):i.push({id:t.title,message:"Add a headline for the homepage banner."}),e.imageUrl&&!isSpotlightImageValue(e.imageUrl)&&i.push({id:t.image,message:"Use a valid image URL (https://\u2026) or upload a file."}),e.ctaText&&!e.ctaUrl&&i.push({id:t.ctaUrl,message:"Add the event page, registration link, or destination visitors should open."}),e.ctaUrl&&!isHttpUrl(e.ctaUrl)&&!(e.ctaUrl.startsWith("/")&&!e.ctaUrl.startsWith("//")&&!e.ctaUrl.includes("\\"))&&i.push({id:t.ctaUrl,message:"Use an https:// link or a Biscoon path starting with /."}),(!Number.isFinite(e.order)||e.order<0||!Number.isInteger(e.order))&&i.push({id:t.order,message:"Order must be a whole number 0 or higher."});const n=e.startDate?Date.parse(e.startDate):NaN,a=e.endDate?Date.parse(e.endDate):NaN;e.startDate&&Number.isNaN(n)&&i.push({id:t.start,message:"Pick a valid start date and time."}),e.endDate&&Number.isNaN(a)&&i.push({id:t.end,message:"Pick a valid end date and time."}),e.startDate&&e.endDate&&!Number.isNaN(n)&&!Number.isNaN(a)&&a<=n&&i.push({id:t.end,message:"End must be after the start time."}),e.badgeText&&e.badgeText.length>40&&i.push({id:t.badgeText,message:"Badge text max is 40 characters."});for(const o of i)setSpotlightFieldError(o.id,o.message);return i[0]?.message||null}function readSpotlightCreateValues(){const e=document.getElementById("spotImageUrl"),t=e?.getAttribute("data-file-data")||"";return{title:document.getElementById("spotTitle")?.value.trim()||"",subtitle:document.getElementById("spotSubtitle")?.value.trim()||"",body:document.getElementById("spotBody")?.value.trim()||"",imageUrl:t||e?.value.trim()||"",badgeText:document.getElementById("spotBadgeText")?.value.trim()||"",badgeColor:document.getElementById("spotBadgeColor")?.value.trim()||"",ctaText:document.getElementById("spotCtaText")?.value.trim()||"",ctaUrl:document.getElementById("spotCtaUrl")?.value.trim()||"",type:document.getElementById("spotType")?.value||"event",order:Number(document.getElementById("spotOrder")?.value),startDate:document.getElementById("spotStart")?.value||null,endDate:document.getElementById("spotEnd")?.value||null}}function readSpotlightEditValues(e=""){const t=document.getElementById("editSpotImageUrl"),i=t?.getAttribute("data-file-data")||"";return{title:document.getElementById("editSpotTitle")?.value.trim()||"",subtitle:document.getElementById("editSpotSubtitle")?.value.trim()||"",body:document.getElementById("editSpotBody")?.value.trim()||"",imageUrl:i||(t?t.value.trim():e)||"",badgeText:document.getElementById("editSpotBadgeText")?.value.trim()||"",badgeColor:document.getElementById("editSpotBadgeColor")?.value.trim()||"",ctaText:document.getElementById("editSpotCtaText")?.value.trim()||"",ctaUrl:document.getElementById("editSpotCtaUrl")?.value.trim()||"",type:document.getElementById("editSpotType")?.value||"event",order:Number(document.getElementById("editSpotOrder")?.value),startDate:document.getElementById("editSpotStart")?.value||null,endDate:document.getElementById("editSpotEnd")?.value||null}}function spotlightPreviewHtml(e={}){return`<div class="admin-event-preview">${e.imageUrl&&isSpotlightImageValue(e.imageUrl)?`<img class="admin-event-preview-art" src="${esc(e.imageUrl)}" alt="Event artwork">`:""}<span class="admin-event-preview-label">${e.type==="event"||!e.type?"Event spotlight":"Community spotlight"}</span>${e.badgeText?`<span class="admin-badge admin-badge-red">${esc(e.badgeText)}</span>`:""}<h3>${esc(e.title||"Your event title")}</h3><p>${esc(e.subtitle||"Date \xB7 Time \xB7 Location")}</p>${e.body?`<p>${esc(e.body)}</p>`:""}<strong>${esc(e.ctaText||"View event")} \u2192</strong><small>The entire alert opens your destination.</small></div>`}function bindSpotlightComposer(){const e=document.getElementById("spotComposer");if(!e)return;const t=()=>{const a=document.getElementById("spotImageUrl"),s=a?.getAttribute("data-file-data")||""||a?.value.trim()||"",d=document.getElementById("spotLivePreview");d&&(d.innerHTML=spotlightPreviewHtml({title:document.getElementById("spotTitle")?.value.trim(),subtitle:document.getElementById("spotSubtitle")?.value.trim(),body:document.getElementById("spotBody")?.value.trim(),badgeText:document.getElementById("spotBadgeText")?.value.trim(),badgeColor:document.getElementById("spotBadgeColor")?.value.trim()||"#E63946",ctaText:document.getElementById("spotCtaText")?.value.trim(),ctaUrl:document.getElementById("spotCtaUrl")?.value.trim(),imageUrl:s,type:document.getElementById("spotType")?.value||"event"}))},i=a=>{a.addEventListener("input",()=>{a.classList.remove("is-invalid");const o=document.querySelector(`[data-spot-field-error="${a.id}"]`);o&&(o.hidden=!0,o.textContent="")})};e.querySelectorAll("#spotTitle,#spotSubtitle,#spotBody,#spotBadgeText,#spotBadgeColor,#spotCtaText,#spotCtaUrl,#spotOrder,#spotStart,#spotEnd,#spotImageUrl").forEach(a=>{a.addEventListener("input",t),a.addEventListener("change",t),i(a)}),e.querySelectorAll(".admin-spot-type[data-type]").forEach(a=>{a.addEventListener("click",()=>{e.querySelectorAll(".admin-spot-type").forEach(s=>s.classList.remove("is-active")),a.classList.add("is-active");const o=document.getElementById("spotType");o&&(o.value=a.dataset.type||"ad"),t()})}),document.getElementById("spotToggleComposer")?.addEventListener("click",()=>{const a=document.getElementById("spotComposerPanel"),o=document.getElementById("spotToggleComposer");if(!a||!o)return;a.hasAttribute("hidden")?(a.removeAttribute("hidden"),o.textContent="Hide form",document.getElementById("spotTitle")?.focus()):(a.setAttribute("hidden",""),o.textContent="+ New spotlight")}),document.getElementById("spotCancelComposer")?.addEventListener("click",()=>{const a=document.getElementById("spotComposerPanel"),o=document.getElementById("spotToggleComposer");a&&a.setAttribute("hidden",""),o&&(o.textContent="+ New spotlight")});function n(a){const o=document.getElementById("spotImgPreviewWrap"),s=document.getElementById("spotImgPreview");!o||!s||(a?(s.src=a,o.hidden=!1):(o.hidden=!0,s.src=""),t())}document.getElementById("spotImageFile")?.addEventListener("change",async function(){const a=this.files?.[0];if(!a)return;const o=document.getElementById("spotFileLbl");o&&(o.textContent=`\u{1F4C1} ${a.name}`);try{const s=await readFileAsDataUrl(a),d=document.getElementById("spotImageUrl");d&&(d.value="",d.setAttribute("data-file-data",s)),n(s)}catch{}}),document.getElementById("spotImageUrl")?.addEventListener("blur",function(){this.value.trim()&&(this.removeAttribute("data-file-data"),n(this.value.trim()))}),document.getElementById("spotSubmit")?.addEventListener("click",async()=>{const a=readSpotlightCreateValues(),o=document.getElementById("spotFormError"),s=document.getElementById("spotSubmit");if(!o||!s)return;o.hidden=!0;const d=validateSpotlightFields(a,{title:"spotTitle",image:"spotImageUrl",ctaText:"spotCtaText",ctaUrl:"spotCtaUrl",order:"spotOrder",start:"spotStart",end:"spotEnd",badgeText:"spotBadgeText"});if(d){o.textContent=d,o.hidden=!1,document.querySelector(".is-invalid")?.scrollIntoView({behavior:"smooth",block:"center"});return}s.disabled=!0,s.textContent="Publishing\u2026";try{await api("/api/admin/spotlights",{method:"POST",body:JSON.stringify(a)}),notify("Spotlight published. Add another anytime with + New spotlight.","success"),showSpotlights()}catch(l){o.textContent=l.message,o.hidden=!1,s.disabled=!1,s.textContent="Publish to homepage"}}),t()}function bindSpotlightList(e){const t=document.getElementById("spotList"),i=document.getElementById("spotEmpty"),n=document.getElementById("spotSearch"),a=Array.from(document.querySelectorAll(".admin-spot-filter[data-status]")),o=()=>{const s=(n?.value||"").trim().toLowerCase(),d=a.find(c=>c.classList.contains("is-active"))?.dataset.status||"all";let l=0;t?.querySelectorAll("[data-spot-card]").forEach(c=>{const m=(c.dataset.spotSearch||"").toLowerCase(),r=c.dataset.spotActive==="true",x=(!s||m.includes(s))&&(d==="all"||d==="live"&&r||d==="paused"&&!r);c.hidden=!x,x&&(l+=1)}),i&&(i.hidden=l>0||e.length===0)};n?.addEventListener("input",o),a.forEach(s=>{s.addEventListener("click",()=>{a.forEach(d=>d.classList.remove("is-active")),s.classList.add("is-active"),o()})}),wireInteractiveRows("[data-open-spot]",s=>openViewSpotlight(s.dataset.openSpot))}async function showSpotlights(){try{const t=(await api("/api/admin/spotlights")).spotlights||[],i={ad:"blue",event:"green",news:"gray",promo:"red"},n={ad:"Ad",event:"Event",news:"News",promo:"Promo"},a=t.filter(s=>s.active).length,o=t.length===0;content(`
      ${sectionHero("Homepage Spotlight","A full-screen event spotlight welcomes visitors once per tab session. They can open the event or skip to the homepage.")}
      <div class="admin-spot-guide">
        <div class="admin-spot-guide-steps">
          <div><strong>1</strong><span>Create an event alert</span></div>
          <div><strong>2</strong><span>Flip Live when ready</span></div>
          <div><strong>3</strong><span>Reorder with \u2191 \u2193</span></div>
        </div>
        <p>The first active event opens as a full-screen poster. Visitors can click it to open your destination or choose Skip this. Add the date, time and venue below; the visibility schedule controls when the spotlight is shown.</p>
      </div>
      <div class="ix-stat-grid">
        ${sectionStat("Total",t.length,!0)}
        ${sectionStat("Live on site",a)}
        ${sectionStat("Paused",t.length-a)}
      </div>

      <div class="admin-spot-toolbar">
        <input class="admin-ann-input admin-spot-search" id="spotSearch" aria-label="Search spotlights" type="search" placeholder="Search title, type, badge\u2026">
        <div class="admin-spot-filters" role="group" aria-label="Filter by status">
          <button type="button" class="admin-spot-filter is-active" data-status="all">All</button>
          <button type="button" class="admin-spot-filter" data-status="live">Live</button>
          <button type="button" class="admin-spot-filter" data-status="paused">Paused</button>
        </div>
        <button type="button" class="admin-btn" id="spotToggleComposer" style="background:#E63946;color:#fff;border-color:#E63946;margin-left:auto">${o?"Hide form":"+ New spotlight"}</button>
      </div>

      <div class="admin-spot-composer" id="spotComposerPanel" ${o?"":"hidden"}>
        <div class="admin-spot-composer-grid" id="spotComposer">
          <div class="admin-ann-form admin-spot-form">
            <div class="admin-ann-form-title">Create an event spotlight</div>
            <p class="admin-spot-form-hint">Fill the fields \u2014 the preview on the right updates as you type.</p>
            <div id="spotFormError" class="admin-spot-error" hidden></div>
            <div class="admin-ann-grid">
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label">Headline <span style="color:#E63946">*</span></label>
                <input class="admin-ann-input" id="spotTitle" placeholder="e.g. Dashain Mela 2026 \u2014 Register Now" maxlength="200" required>
                <div class="admin-spot-field-error" data-spot-field-error="spotTitle" hidden></div>
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label" for="spotSubtitle">Date, time &amp; location</label>
                <input class="admin-ann-input" id="spotSubtitle" placeholder="e.g. Nov 21 \xB7 5 PM ET \xB7 Boston City Hall" maxlength="200">
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label" for="spotBody">Extra details (optional)</label>
                <textarea class="admin-ann-textarea" id="spotBody" placeholder="Shown under the supporting line" rows="2" maxlength="400"></textarea>
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label">Event poster (optional)</label>
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
                <input type="hidden" id="spotType" value="event">
                <div class="admin-spot-types" role="group" aria-label="Spotlight type">
                  <button type="button" class="admin-spot-type" data-type="ad">\u{1F4E3} Ad</button>
                  <button type="button" class="admin-spot-type is-active" data-type="event">\u{1F389} Event</button>
                  <button type="button" class="admin-spot-type" data-type="news">News</button>
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
                <label class="admin-ann-label" for="spotCtaUrl">Destination \u2014 where clicking the alert takes visitors</label>
                <input class="admin-ann-input" id="spotCtaUrl" type="text" value="/pages/community/events.html" placeholder="https://\u2026 or /pages/post/detail.html?id=\u2026" inputmode="url">
                <div class="admin-spot-field-error" data-spot-field-error="spotCtaUrl" hidden></div>
              </div>
              <div class="admin-ann-field">
                <label class="admin-ann-label" for="spotOrder">Display order</label>
                <input class="admin-ann-input" id="spotOrder" type="number" value="0" min="0" step="1" title="Lower numbers show first">
                <div class="admin-spot-field-error" data-spot-field-error="spotOrder" hidden></div>
              </div>
              <div class="admin-ann-field admin-ann-full">
                <label class="admin-ann-label">Alert visibility schedule (optional)</label>
                <div class="admin-spot-schedule">
                  <div>
                    <span class="admin-spot-schedule-label">Show alert from</span>
                    <input class="admin-ann-input" id="spotStart" type="datetime-local" aria-label="Show from">
                    <div class="admin-spot-field-error" data-spot-field-error="spotStart" hidden></div>
                  </div>
                  <div>
                    <span class="admin-spot-schedule-label">Hide alert after</span>
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
            <p class="admin-spot-preview-note">The first event appears full-screen with a Skip this button. Upload a wide poster for the best result; artwork is displayed without cropping. Alerts remain on the homepage after skipping.</p>
          </aside>
        </div>
      </div>

      <div class="admin-spot-list-head">
        <h3>Your spotlights</h3>
        <span>${t.length} total \xB7 ${a} live</span>
      </div>
      <div class="admin-ann-list admin-spot-list" id="spotList">
        ${t.length?t.map((s,d)=>`
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
                ${badge(n[s.type||"ad"]||"Ad",i[s.type||""]||"gray")}
                ${s.badgeText?badge(s.badgeText,"blue"):""}
                <span>Order ${s.order??d}</span>
                ${s.endDate?`<span>Until ${fmtDate(s.endDate)}</span>`:""}
                ${s.ctaText?`<span>Button: ${esc(s.ctaText)}</span>`:""}
              </div>
            </div>
            <div class="admin-spot-card-actions">
              <button type="button" class="admin-spot-switch ${s.active?"is-on":""}" data-toggle-spot="${esc(s.id)}" title="${s.active?"Pause on homepage":"Show on homepage"}" aria-pressed="${s.active?"true":"false"}">
                <span class="admin-spot-switch-knob"></span>
                <span class="admin-spot-switch-label">${s.active?"Live":"Paused"}</span>
              </button>
              <button type="button" class="admin-btn admin-btn-ghost" data-move-spot="${esc(s.id)}" data-move-dir="-1" title="Show earlier within its type">\u2191</button>
              <button type="button" class="admin-btn admin-btn-ghost" data-move-spot="${esc(s.id)}" data-move-dir="1" title="Show later within its type">\u2193</button>
              <button type="button" class="admin-btn admin-btn-ghost" data-edit-spot="${esc(s.id)}">Edit</button>
              <button type="button" class="admin-btn admin-btn-danger" data-del-spot="${esc(s.id)}" title="Delete">\u{1F5D1}</button>
            </div>
          </div>
        `).join(""):'<div class="admin-empty">No spotlights yet. Click <strong>+ New spotlight</strong> to create your first homepage banner.</div>'}
      </div>
      <div class="admin-empty" id="spotEmpty" hidden>No spotlights match this search or filter.</div>
    `),animateStatValues(),bindSpotlightComposer(),bindSpotlightList(t)}catch(e){content(`<div class="admin-error">${esc(e.message)}</div>`)}}async function openViewSpotlight(e){let t;try{t=await api(`/api/admin/spotlights/${encodeURIComponent(e)}`)}catch(a){notify(a.message,"error");return}const i={ad:"blue",event:"green",news:"gray",promo:"red"},n={ad:"Ad",event:"Event",news:"News",promo:"Promo"};openModal(esc(t.title||"Untitled spotlight"),`
    <div class="admin-spot-view">
      ${spotlightPreviewHtml(t)}
      <div class="admin-spot-view-meta">
        <div class="admin-spot-view-row"><span>Status</span>${badge(t.active?"Live on homepage":"Paused",t.active?"green":"gray")}</div>
        <div class="admin-spot-view-row"><span>Type</span>${badge(n[t.type||"ad"]||"Ad",i[t.type||""]||"gray")}</div>
        <div class="admin-spot-view-row"><span>Display order</span><strong>${t.order??0}</strong></div>
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
  `,null),requestAnimationFrame(()=>{document.querySelector("[data-spot-view-edit]")?.addEventListener("click",()=>{closeModal(),openEditSpotlight(e)}),document.querySelector("[data-spot-view-toggle]")?.addEventListener("click",async()=>{try{await api(`/api/admin/spotlights/${encodeURIComponent(e)}/toggle`,{method:"PUT"}),closeModal(),showSpotlights(),notify(t.active?"Spotlight paused.":"Spotlight is live on the homepage.","success")}catch(a){notify(a.message,"error")}})})}function spotlightFormHtml(e={}){const t=n=>{if(!n)return"";try{return new Date(n).toISOString().slice(0,16)}catch{return""}},i=e.type||"ad";return`
    <div class="admin-spot-edit-layout">
      <div class="admin-modal-grid">
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label">Headline <span style="color:#E63946">*</span></label>
          <input class="admin-modal-input" id="editSpotTitle" maxlength="200" value="${esc(e.title||"")}" required>
          <div class="admin-spot-field-error" data-spot-field-error="editSpotTitle" hidden></div>
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label" for="editSpotSubtitle">Date, time &amp; location</label>
          <input class="admin-modal-input" id="editSpotSubtitle" maxlength="200" value="${esc(e.subtitle||"")}">
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label" for="editSpotBody">Extra details</label>
          <textarea class="admin-modal-textarea" id="editSpotBody" rows="2" maxlength="400">${esc(e.body||"")}</textarea>
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label">Event poster (optional)</label>
          <div class="admin-spot-image-row">
            <label class="admin-spot-file" id="editSpotFileLbl">\u{1F4C1} Choose image
              <input type="file" id="editSpotImageFile" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
            </label>
            <input class="admin-modal-input" id="editSpotImageUrl" type="text" placeholder="or paste https:// URL" value="${esc(e.imageUrl||"")}">
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
            <button type="button" class="admin-spot-type ${i==="news"?"is-active":""}" data-type="news">News</button>
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
          <label class="admin-modal-label" for="editSpotCtaUrl">Destination \u2014 where clicking the alert takes visitors</label>
          <input class="admin-modal-input" id="editSpotCtaUrl" type="text" value="${esc(e.ctaUrl||"")}" inputmode="url" placeholder="https://\u2026">
          <div class="admin-spot-field-error" data-spot-field-error="editSpotCtaUrl" hidden></div>
        </div>
        <div class="admin-modal-field">
          <label class="admin-modal-label" for="editSpotOrder">Display order</label>
          <input class="admin-modal-input" id="editSpotOrder" type="number" min="0" step="1" value="${e.order??0}">
          <div class="admin-spot-field-error" data-spot-field-error="editSpotOrder" hidden></div>
        </div>
        <div class="admin-modal-field admin-modal-full">
          <label class="admin-modal-label">Alert visibility schedule (optional)</label>
          <div class="admin-spot-schedule">
            <div>
              <span class="admin-spot-schedule-label">Show alert from</span>
              <input class="admin-modal-input" id="editSpotStart" type="datetime-local" value="${t(e.startDate)}" aria-label="Show from">
              <div class="admin-spot-field-error" data-spot-field-error="editSpotStart" hidden></div>
            </div>
            <div>
              <span class="admin-spot-schedule-label">Hide alert after</span>
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
    </div>`}async function openEditSpotlight(e){let t;try{t=await api(`/api/admin/spotlights/${encodeURIComponent(e)}`)}catch(i){notify(i.message,"error");return}openModal("Edit homepage alert",spotlightFormHtml(t),async()=>{const i=readSpotlightEditValues(t.imageUrl||""),n=validateSpotlightFields(i,{title:"editSpotTitle",image:"editSpotImageUrl",ctaText:"editSpotCtaText",ctaUrl:"editSpotCtaUrl",order:"editSpotOrder",start:"editSpotStart",end:"editSpotEnd",badgeText:"editSpotBadgeText"});if(n)throw document.querySelector(".is-invalid")?.scrollIntoView({behavior:"smooth",block:"center"}),new Error(n);await api(`/api/admin/spotlights/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify(i)}),showSpotlights()}),requestAnimationFrame(()=>{document.querySelector("#adminModalOverlay .admin-modal")?.classList.add("admin-modal-wide");const n=()=>{const a=document.getElementById("editSpotImageUrl"),o=a?.getAttribute("data-file-data")||"",s=document.getElementById("editSpotLivePreview");s&&(s.innerHTML=spotlightPreviewHtml({title:document.getElementById("editSpotTitle")?.value.trim(),subtitle:document.getElementById("editSpotSubtitle")?.value.trim(),body:document.getElementById("editSpotBody")?.value.trim(),badgeText:document.getElementById("editSpotBadgeText")?.value.trim(),badgeColor:document.getElementById("editSpotBadgeColor")?.value.trim()||"#E63946",ctaText:document.getElementById("editSpotCtaText")?.value.trim(),ctaUrl:document.getElementById("editSpotCtaUrl")?.value.trim(),imageUrl:o||a?.value.trim()||t.imageUrl||"",type:document.getElementById("editSpotType")?.value||"event"}))};document.querySelectorAll("#editSpotTitle,#editSpotSubtitle,#editSpotBody,#editSpotBadgeText,#editSpotBadgeColor,#editSpotCtaText,#editSpotCtaUrl,#editSpotOrder,#editSpotStart,#editSpotEnd,#editSpotImageUrl").forEach(a=>{a.addEventListener("input",()=>{n(),a.classList.remove("is-invalid");const o=document.querySelector(`[data-spot-field-error="${a.id}"]`);o&&(o.hidden=!0,o.textContent="")}),a.addEventListener("change",n)}),document.querySelectorAll("#editSpotTypes .admin-spot-type").forEach(a=>{a.addEventListener("click",()=>{document.querySelectorAll("#editSpotTypes .admin-spot-type").forEach(s=>s.classList.remove("is-active")),a.classList.add("is-active");const o=document.getElementById("editSpotType");o&&(o.value=a.dataset.type||"ad"),n()})}),document.getElementById("editSpotImageFile")?.addEventListener("change",async function(){const a=this.files?.[0];if(!a)return;const o=document.getElementById("editSpotFileLbl");if(o){const s=o.querySelector("input");o.textContent=`\u{1F4C1} ${a.name}`,s&&o.appendChild(s)}try{const s=await readFileAsDataUrl(a),d=document.getElementById("editSpotImageUrl");d&&(d.value="",d.setAttribute("data-file-data",s));const l=document.getElementById("editSpotImgPreviewWrap"),c=document.getElementById("editSpotImgPreview");l&&c&&(c.src=s,l.hidden=!1),n()}catch{}}),document.getElementById("editSpotImageUrl")?.addEventListener("blur",function(){const a=document.getElementById("editSpotImgPreviewWrap"),o=document.getElementById("editSpotImgPreview");a&&o&&this.value.trim()&&(this.removeAttribute("data-file-data"),o.src=this.value.trim(),a.hidden=!1,n())})})}async function showAnnouncements(){try{const e=await api("/api/admin/announcements"),t={info:"blue",warning:"red",success:"green"},i=(e.announcements||[]).filter(o=>o.active&&(!o.expiresAt||new Date(o.expiresAt).getTime()>Date.now())),n=i[0]?.id,a=i.length;content(`
      ${sectionHero("Announcements","The newest active, unexpired announcement appears below the public site header. Older active notices wait until it is paused or expires.")}
      <div class="ix-stat-grid">
        ${sectionStat("Total",(e.announcements||[]).length,!0)}
        ${sectionStat("Showing publicly",n?1:0)}
        ${sectionStat("Waiting",Math.max(0,a-1))}
        ${sectionStat("Inactive",(e.announcements||[]).length-a)}
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
        ${e.announcements.length?e.announcements.map(o=>`
          <div class="admin-ann-card">
            <div class="admin-ann-stripe admin-ann-stripe-${o.type}"></div>
            <div class="admin-ann-content">
              <div class="admin-ann-card-title">${esc(o.title)}</div>
              <div class="admin-ann-card-body">${esc(o.body)}</div>
              <div class="admin-ann-card-meta">
                ${badge(o.expiresAt&&new Date(o.expiresAt).getTime()<=Date.now()?"Expired":o.id===n?"Showing publicly":o.active?"Waiting":"Paused",o.id===n?"green":"gray")}
                ${badge(o.type,t[o.type]||"gray")}
                <span>By ${esc(o.createdBy||"admin")}</span>
                <span>${fmtDate(o.createdAt)}</span>
                ${o.expiresAt?`<span>Expires ${fmtDate(o.expiresAt)}</span>`:""}
              </div>
            </div>
            <div class="admin-ann-card-actions">
              <button class="admin-btn admin-btn-ghost" data-toggle-ann="${esc(o.id)}" title="${o.active?"Deactivate":"Activate"}">
                ${o.active?"\u23F8 Pause":"\u25B6 Activate"}
              </button>
              <button class="admin-btn admin-btn-danger" data-del-ann="${esc(o.id)}">\u{1F5D1}</button>
            </div>
          </div>
        `).join(""):'<div class="admin-empty">No announcements yet. Create one above.</div>'}
      </div>
    `),animateStatValues(),document.getElementById("annSubmit")?.addEventListener("click",async()=>{const o=document.getElementById("annTitle")?.value.trim(),s=document.getElementById("annBody")?.value.trim(),d=document.getElementById("annType")?.value,l=document.getElementById("annExpiry")?.value,c=document.getElementById("annFormError"),m=document.getElementById("annSubmit");if(c.style.display="none",!o||!s){document.getElementById(o?"annBody":"annTitle")?.focus(),c.textContent="Title and message are required.",c.style.display="block";return}m.disabled=!0,m.textContent="Publishing\u2026";try{await api("/api/admin/announcements",{method:"POST",body:JSON.stringify({title:o,body:s,type:d,expiresAt:l?new Date(l).toISOString():null})}),showAnnouncements(),notify("Announcement published.","success")}catch(r){c.textContent=r.message,c.style.display="block",m.disabled=!1,m.textContent="Publish Announcement"}})}catch(e){content(`<div class="admin-error">${esc(e.message)}</div>`)}}async function openViewListing(e){let t;try{t=await api(`/api/admin/listings/${encodeURIComponent(e)}`)}catch(y){notify(y.message,"error");return}const i=Array.isArray(t.comments)?t.comments:[],n=Array.isArray(t.tags)?t.tags.filter(Boolean):[],a=listingViewProfile(t),o=new Set(a.omitFields||[]),s=listingViewKind(t)==="photography",d=safeHttpUrl(t.externalLink),l=t.price?`${esc(t.price)}${t.priceNote?` <span class="admin-view-note">(${esc(t.priceNote)})</span>`:""}`:"",c=t.externalLink?d?`<a href="${esc(d)}" target="_blank" rel="noopener" class="admin-view-link">${esc(t.externalLink)}</a>`:esc(t.externalLink):"",m=[listingField(a.subcategoryLabel||"Specific type",readableLabel(t.subcategory)),o.has("location")?"":listingField(a.locationLabel||"Location",t.location),o.has("locationType")?"":listingField(a.locationTypeLabel||"Location type",readableLabel(t.locationType)),o.has("price")?"":listingField(a.priceLabel||"Price / rate",l,{raw:!0}),o.has("availability")?"":listingField(a.availabilityLabel||"Availability",t.availability),o.has("contactEmail")?"":listingField("Contact email",t.contactEmail),o.has("contactPhone")?"":listingField("Contact phone",t.contactPhone),o.has("contactPreference")?"":listingField(a.contactPreferenceLabel||"Contact preference",readableLabel(t.contactPreference)),o.has("externalLink")?"":listingField(a.externalLinkLabel||"External link",c,{raw:!0,full:!0}),n.length?`
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">Tags</label>
        <div class="admin-view-val admin-listing-tags">${n.map(y=>badge(y)).join("")}</div>
      </div>`:"",t.description?`
      <div class="admin-modal-field admin-modal-full">
        <label class="admin-modal-label">${esc(a.descriptionLabel||"Description")}</label>
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
      <span>${esc(a.kindLabel||"Listing")}</span>
      ${!o.has("location")&&t.location?`<span>\u{1F4CD} ${esc(t.location)}</span>`:""}
      ${!o.has("locationType")&&t.locationType?`<span>${esc(readableLabel(t.locationType))}</span>`:""}
      <span style="margin-left:auto;font-size:12px">Posted ${fmtDate(t.createdAt)}</span>
    </div>

    ${listingGallery(t.images,s)}

    <div class="admin-modal-grid" style="margin-top:12px">
      ${m}
    </div>

    <div style="margin-top:16px">
      <div class="admin-modal-label" style="margin-bottom:10px">Comments (${i.length})</div>
      <div class="admin-view-comments">${r}</div>
    </div>

    <div class="admin-view-actions">
      <button class="admin-btn" style="background:#E63946;color:#fff;border-color:#E63946" data-edit-listing="${esc(t.id)}">\u270F\uFE0F Edit Listing</button>
      <button class="admin-btn admin-btn-danger" data-del-listing="${esc(t.id)}">\u{1F5D1} Delete</button>
    </div>
  `,null)}async function openViewDiscussion(e){let t;try{t=await api(`/api/admin/discussions/${encodeURIComponent(e)}`)}catch(n){notify(n.message,"error");return}const i=(t.comments||[]).length?(t.comments||[]).map(n=>`
        <div class="admin-view-comment">
          <div class="admin-view-comment-head">
            <strong>${esc(n.authorName||"\u2014")}</strong>
            <span>${fmtTime(n.createdAt)}</span>
          </div>
          <div class="admin-view-comment-body">${esc(n.body)}</div>
        </div>`).join(""):'<div style="color:#9ca3af;font-size:13px;padding:6px 0">No comments yet.</div>';openModal(esc(t.title),`
    <div class="admin-modal-meta" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      ${badge(capitalize(t.category||""),"blue")}
      <span>by <strong>${esc(t.authorName)}</strong></span>
      <span>\u{1F4AC} ${t.commentCount} comment${t.commentCount!==1?"s":""}</span>
      ${t.tags?.length?t.tags.map(n=>badge(n)).join(""):""}
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
  `}function collectDiscussionPayload(){return{title:document.getElementById("dTitle").value.trim(),body:document.getElementById("dBody").value.trim(),category:document.getElementById("dCat").value,tags:document.getElementById("dTags").value.split(",").map(e=>e.trim()).filter(Boolean)}}async function openCreateDiscussion(){openModal("Create Discussion",discussionFormHtml(),async()=>{await api("/api/admin/discussions",{method:"POST",body:JSON.stringify(collectDiscussionPayload())}),showDiscussions(1)})}async function openEditDiscussion(e){let t;try{t=await api(`/api/admin/discussions/${encodeURIComponent(e)}`)}catch(i){notify(i.message,"error");return}openModal("Edit Discussion",discussionFormHtml(t),async()=>{await api(`/api/admin/discussions/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify(collectDiscussionPayload())}),showDiscussions(1)})}function openModal(e,t,i){if(!closeModal())return;_modalReturnFocus=document.activeElement;const n=document.createElement("div");n.id="adminModalOverlay",n.className="admin-modal-overlay";const a=i!==null;n.innerHTML=`
    <div class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle">
      <div class="admin-modal-head">
        <div class="admin-modal-title" id="adminModalTitle">${e}</div>
        <button class="admin-modal-close" id="adminModalClose" aria-label="Close form" type="button">\xD7</button>
      </div>
      <div class="admin-modal-error" id="adminModalError" role="alert" tabindex="-1"></div>
      ${t}
      ${a?`<div class="admin-modal-actions">
        <button class="admin-btn admin-btn-ghost" id="adminModalCancel">Cancel</button>
        <button class="admin-btn" id="adminModalSave" style="background:#E63946;color:#fff;border-color:#E63946;padding:8px 20px;font-size:13px">${e.startsWith("Create ")?esc(e):"Save changes"}</button>
      </div>`:`<div class="admin-modal-actions">
        <button class="admin-btn admin-btn-ghost" id="adminModalCancel">Close</button>
      </div>`}
    </div>
  `,document.body.appendChild(n),requestAnimationFrame(()=>n.classList.add("show")),_modalBaseline=modalSnapshot(),trapDialogFocus(n,()=>closeModal()),document.getElementById("adminLayout")?.setAttribute("inert",""),requestAnimationFrame(()=>n.querySelector("input:not([type=hidden]), textarea, select, #adminModalClose")?.focus()),document.getElementById("adminModalClose").addEventListener("click",()=>closeModal()),document.getElementById("adminModalCancel").addEventListener("click",()=>closeModal()),i&&document.getElementById("adminModalSave").addEventListener("click",async()=>{const o=document.getElementById("adminModalError"),s=document.getElementById("adminModalSave");o.style.display="none";const d=Array.from(n.querySelectorAll("input, select, textarea")).find(c=>c.willValidate&&!c.checkValidity());if(d){d.reportValidity(),d.focus();return}const l=s.textContent;_modalSaving=!0,n.querySelector(".admin-modal")?.setAttribute("inert",""),s.disabled=!0,s.textContent="Saving\u2026";try{await i(),closeModal(!0),notify("Changes saved successfully.","success")}catch(c){o.textContent=c.message,o.style.display="block",s.disabled=!1,s.textContent=l,o.focus(),notify(c.message,"error")}finally{_modalSaving=!1,n.querySelector(".admin-modal")?.removeAttribute("inert"),n.isConnected&&o.style.display!=="none"&&o.focus()}})}function closeModal(e=!1){if(!e&&_modalSaving)return notify("Please wait for saving to finish.","info"),!1;if(!e&&modalIsDirty()&&!window.confirm("Discard your unsaved changes? Choose Cancel to keep editing."))return!1;if(_newsEditorState&&!e){if(_newsEditorState.saving||_newsEditorState.pending)return notify("Please wait for the current upload or save to finish.","error"),!1;if(newsDraftSnapshot()!==_newsEditorState.baseline&&(persistNewsDraft(),!window.confirm("Close this editor? Your unsaved draft will be kept in this tab for recovery.")))return!1}_newsEditorState&&window.BiscoonNewsEditor?.destroy?.(),_newsEditorState=null;const t=document.getElementById("adminModalOverlay");return t?.remove(),t&&(document.getElementById("adminLayout")?.removeAttribute("inert"),_modalReturnFocus?.focus()),_modalBaseline="",!0}document.addEventListener("keydown",e=>{if(e.key==="Escape"&&closeModal(),e.key==="/"&&!isTypingTarget(e.target)&&!document.getElementById("adminModalOverlay")){const t=document.querySelector(".admin-search");t&&(e.preventDefault(),t.focus(),t.select?.())}}),document.addEventListener("click",async e=>{const t=e.target.closest("[data-attention]");if(t){t.dataset.attention==="news"?(_s.news.status="draft",_s.news.page=1,navigate("news")):(_s.reports.status=t.dataset.attention==="reviewing"?"reviewing":"open",_s.reports.page=1,navigate("reports"));return}const i=e.target.closest("[data-view]");if(i&&i.closest(".admin-nav")){navigate(i.dataset.view);return}if(e.target.id==="adminModalOverlay"){e.target.querySelector(".news-editor-shell")||closeModal();return}const n=e.target.closest("[data-news-format]");if(n){if(window.BiscoonNewsEditor?.runCommand?.(n.dataset.newsFormat||"")){e.preventDefault();return}return}const a=e.target.closest("[data-insert-news-media]");if(a){if(window.BiscoonNewsEditor?.insertMedia?.(a.dataset.insertNewsMedia))return;insertIntoNewsBody(`

[[media:${a.dataset.insertNewsMedia}]]

`);return}const o=e.target.closest("[data-remove-news-media]");if(o){const u=o.dataset.removeNewsMedia;_newsMediaDraft=_newsMediaDraft.filter(I=>I.id!==u);const T=document.getElementById("newsBody");T&&(T.value=T.value.replace(new RegExp(`\\n?\\n?\\[\\[media:${u}\\]\\]\\n?\\n?`,"g"),`

`)),renderNewsMediaLibrary(),window.BiscoonNewsEditor?.mount?.({element:"#newsRichEditor",textarea:"#newsBody",media:()=>_newsMediaDraft});return}const s=e.target.closest("[data-page][data-pager-view]");if(s){const u=s.dataset.pagerView;_s[u]&&(_s[u].page=parseInt(s.dataset.page)),{users:showUsers,listings:showListings,events:showEvents,news:showNews,discussions:showDiscussions,comments:showComments,reports:showReports,audit:showAuditLogs}[u]?.();return}const d=e.target.closest("[data-comment-type]");if(d){_s.comments.type=d.dataset.commentType,showComments(1);return}const l=e.target.closest("[data-report-status]");if(l){_s.reports.status=l.dataset.reportStatus,showReports(1);return}const c=e.target.closest("[data-user-kind]");if(c&&c.closest(".admin-tabs")){_s.users.kind=c.dataset.userKind,_s.users.page=1,showUsers(1);return}if(e.target.closest("[data-create-staff]")){openCreateStaffModal();return}const m=e.target.closest("[data-edit-staff]");if(m){openEditStaffModal(m.dataset.editStaff);return}const r=e.target.closest("[data-del-staff]");if(r){if(!await confirmAction(`Delete admin user "${r.dataset.delName||"this user"}"?`,{title:"Delete admin user",confirmText:"Delete user",tone:"danger"}))return;try{await api(`/api/admin/staff/${encodeURIComponent(r.dataset.delStaff)}`,{method:"DELETE"}),closeModal(),showUsers(1),notify("Admin user deleted.","success")}catch(u){notify(u.message,"error")}return}if(e.target.closest("[data-create-event]")){openCreateEvent();return}const y=e.target.closest("[data-edit-event]");if(y){openEditEvent(y.dataset.editEvent);return}const E=e.target.closest("[data-del-event]");if(E){if(!await confirmAction(`Delete "${E.dataset.delTitle||"this event"}"?`,{title:"Delete event",confirmText:"Delete event",tone:"danger"}))return;try{await api(`/api/admin/listings/${encodeURIComponent(E.dataset.delEvent)}`,{method:"DELETE"}),closeModal(),showEvents(1),notify("Event deleted.","success")}catch(u){notify(u.message,"error")}return}if(e.target.closest("[data-create-news]")){openNewsEditor();return}if(e.target.closest("[data-create-discussion]")){openCreateDiscussion();return}const x=e.target.closest("[data-view-news]");if(x){openViewNews(x.dataset.viewNews);return}const M=e.target.closest("[data-edit-news]");if(M){openNewsEditor(M.dataset.editNews);return}const A=e.target.closest("[data-toggle-news-featured]");if(A){e.stopPropagation();const u=A.dataset.toggleNewsFeatured,T=A.dataset.featured!=="1";try{await api(`/api/admin/news/${encodeURIComponent(u)}/featured`,{method:"PUT",body:JSON.stringify({featured:T})}),showNews(),notify(T?"Story featured.":"Story unfeatured.","success")}catch(I){notify(I.message,"error")}return}const B=e.target.closest("[data-toggle-news-status]");if(B){e.stopPropagation();const u=B.dataset.toggleNewsStatus,T=B.dataset.status==="published"?"draft":"published";try{await api(`/api/admin/news/${encodeURIComponent(u)}/status`,{method:"PUT",body:JSON.stringify({status:T})}),showNews(),notify(T==="published"?"Story published.":"Story moved to draft.","success")}catch(I){notify(I.message,"error")}return}const H=e.target.closest("[data-del-news]");if(H){if(!await confirmAction(`Delete "${H.dataset.delTitle||"this story"}"?`,{title:"Delete news story",confirmText:"Delete story",tone:"danger"}))return;try{await api(`/api/admin/news/${encodeURIComponent(H.dataset.delNews)}`,{method:"DELETE"}),closeModal(),showNews(1),notify("News story deleted.","success")}catch(u){notify(u.message,"error")}return}const v=e.target.closest("[data-view-user]");if(v){const u=v.dataset;openUserDetail(u.viewUser,u.viewUserName,u.viewUserEmail,u.viewUserRole,u.viewUserJoined,u.viewUserListings);return}const h=e.target.closest("[data-view-listing]");if(h){openViewListing(h.dataset.viewListing);return}const $=e.target.closest("[data-edit-listing]");if($){openEditListing($.dataset.editListing);return}const f=e.target.closest("[data-view-discussion]");if(f){openViewDiscussion(f.dataset.viewDiscussion);return}const L=e.target.closest("[data-edit-discussion]");if(L){openEditDiscussion(L.dataset.editDiscussion);return}const S=e.target.closest("[data-del-user]");if(S){if(!await confirmAction(`Delete "${S.dataset.delName||"this user"}"? Their listings will also be removed.`,{title:"Delete regular user",confirmText:"Delete user",tone:"danger"}))return;try{await api(`/api/admin/users/${encodeURIComponent(S.dataset.delUser)}`,{method:"DELETE"}),closeModal(),showUsers(1),notify("Regular user deleted.","success")}catch(u){notify(u.message,"error")}return}const p=e.target.closest("[data-del-listing]");if(p){if(!await confirmAction("Delete this listing?",{title:"Delete listing",confirmText:"Delete listing",tone:"danger"}))return;try{await api(`/api/admin/listings/${encodeURIComponent(p.dataset.delListing)}`,{method:"DELETE"}),closeModal(),showListings(1),notify("Listing deleted.","success")}catch(u){notify(u.message,"error")}return}const g=e.target.closest("[data-del-discussion]");if(g){if(!await confirmAction("Delete this discussion and all its comments?",{title:"Delete discussion",confirmText:"Delete discussion",tone:"danger"}))return;try{await api(`/api/admin/discussions/${encodeURIComponent(g.dataset.delDiscussion)}`,{method:"DELETE"}),closeModal(),showDiscussions(1),notify("Discussion deleted.","success")}catch(u){notify(u.message,"error")}return}const b=e.target.closest("[data-del-comment]");if(b){if(!await confirmAction("Remove this comment?",{title:"Remove comment",confirmText:"Remove comment",tone:"danger"}))return;const{commentId:u,parentId:T,parentType:I}=b.dataset;try{await api(`/api/admin/${I}s/${encodeURIComponent(T)}/comments/${encodeURIComponent(u)}`,{method:"DELETE"}),showComments(1),notify("Comment removed.","success")}catch(k){notify(k.message,"error")}return}const w=e.target.closest("[data-restore-type]");if(w){const u=w.dataset.restoreType,T=w.dataset.restoreId;if(!await confirmAction(`Restore this ${u}? It will become visible again.`,{title:"Restore item",confirmText:"Restore",tone:"primary"}))return;try{await api(`/api/admin/trash/${encodeURIComponent(u)}/${encodeURIComponent(T)}/restore`,{method:"PUT"}),showTrash(),notify(`${capitalize(u)} restored successfully.`,"success")}catch(I){notify(I.message,"error")}return}const C=e.target.closest("[data-view-spot]");if(C){openViewSpotlight(C.dataset.viewSpot);return}const R=e.target.closest("[data-edit-spot]");if(R){openEditSpotlight(R.dataset.editSpot);return}const O=e.target.closest("[data-toggle-spot]");if(O){try{await api(`/api/admin/spotlights/${encodeURIComponent(O.dataset.toggleSpot)}/toggle`,{method:"PUT"}),showSpotlights(),notify("Spotlight updated \u2014 Live means it shows on the homepage.","success")}catch(u){notify(u.message,"error")}return}const U=e.target.closest("[data-move-spot]");if(U){const u=U.dataset.moveSpot,T=Number(U.dataset.moveDir||0);try{const k=[...(await api("/api/admin/spotlights")).spotlights||[]].sort((D,J)=>(D.order??0)-(J.order??0)),P=k.findIndex(D=>D.id===u),N=P+T;if(P<0||N<0||N>=k.length)return;const V=k[P],W=k[N],_=V.order??P,z=W.order??N;await api(`/api/admin/spotlights/${encodeURIComponent(V.id)}`,{method:"PUT",body:JSON.stringify({order:z})}),await api(`/api/admin/spotlights/${encodeURIComponent(W.id)}`,{method:"PUT",body:JSON.stringify({order:_})}),showSpotlights(),notify("Display order updated.","success")}catch(I){notify(I.message,"error")}return}const q=e.target.closest("[data-del-spot]");if(q){if(!await confirmAction("Delete this spotlight?",{title:"Delete spotlight",confirmText:"Delete spotlight",tone:"danger"}))return;try{await api(`/api/admin/spotlights/${encodeURIComponent(q.dataset.delSpot)}`,{method:"DELETE"}),showSpotlights(),notify("Spotlight deleted.","success")}catch(u){notify(u.message,"error")}return}const F=e.target.closest("[data-toggle-ann]");if(F){try{await api(`/api/admin/announcements/${encodeURIComponent(F.dataset.toggleAnn)}/toggle`,{method:"PUT"}),showAnnouncements(),notify("Announcement status updated.","success")}catch(u){notify(u.message,"error")}return}const j=e.target.closest("[data-del-ann]");if(j){if(!await confirmAction("Delete this announcement?",{title:"Delete announcement",confirmText:"Delete announcement",tone:"danger"}))return;try{await api(`/api/admin/announcements/${encodeURIComponent(j.dataset.delAnn)}`,{method:"DELETE"}),showAnnouncements(),notify("Announcement deleted.","success")}catch(u){notify(u.message,"error")}return}if(e.target.closest("#adminLogout")){if(!closeModal()||!allowInlineLeave())return;localStorage.removeItem(ADMIN_TOKEN_KEY),localStorage.removeItem(ADMIN_SESSION_KEY),localStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY),window.location.href="login.html"}}),document.addEventListener("change",async e=>{if(e.target.closest("#newsMediaFiles, #newsInlineImages")){const i=Array.from(e.target.files||[]);if(!i.length)return;const n=e.target.id==="newsInlineImages";await runNewsMediaTask(async()=>{if(_newsMediaDraft.length+i.length>24)throw new Error("A story can contain up to 24 media items.");for(const a of i){if(!a.type.startsWith("image/")&&!a.type.startsWith("video/"))throw new Error("Choose image or video files.");if(a.type.startsWith("video/")&&a.size>18*1024*1024)throw new Error(`${a.name} is too large. Videos must be under 18 MB.`)}for(const a of i){const o=await uploadNewsMedia(a);_newsMediaDraft.push(o),n&&window.BiscoonNewsEditor?.insertMedia?.(o),renderNewsMediaLibrary(),persistNewsDraft()}document.getElementById("newsMediaLibrary")?.closest("details")?.setAttribute("open",""),notify(`${i.length} media item${i.length!==1?"s":""} ${n?"inserted into your story":"added to the library"}.`,"success")}),e.target.value="";return}const t=e.target.closest("[data-report-status-update]");if(t)try{await api(`/api/admin/reports/${encodeURIComponent(t.dataset.reportStatusUpdate)}/status`,{method:"PUT",body:JSON.stringify({status:t.value})}),showReports(1),notify("Report status updated.","success")}catch(i){notify(i.message,"error")}}),document.addEventListener("input",e=>{const t=e.target.closest("[data-news-media-caption]");if(!t)return;const i=_newsMediaDraft.find(n=>n.id===t.dataset.newsMediaCaption);i&&(i.caption=t.value.trim())});
