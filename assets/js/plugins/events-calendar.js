(()=>{var v=["January","February","March","April","May","June","July","August","September","October","November","December"],k=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],H=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];function r(e){return String(e||"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]||t)}function D(e){return new Date(e.getFullYear(),e.getMonth(),e.getDate())}function y(e){let t=e.getDay(),n=t===0?-6:1-t,a=D(e);return a.setDate(a.getDate()+n),a}function h(e,t){let n=new Date(e);return n.setDate(n.getDate()+t),n}function d(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`}function P(e,t){if(t)return t;let n=e.getHours(),a=e.getMinutes();if(!n&&!a)return"";let i=n>=12?"pm":"am",o=n%12||12;return a?`${o}:${String(a).padStart(2,"0")}${i}`:`${o}:00${i}`}function O(e){let t=String(e||"").match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);if(!t)return"";let n=t[1],a=t[2]?`:${t[2]}`:":00";return`${n}${a}${t[3].toLowerCase()}`}function b(e,t){let n=String(e||"").trim();if(!n)return null;let a=n.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);if(a){let o=new Date(Number(a[1]),Number(a[2])-1,Number(a[3]));return Number.isNaN(o.getTime())?null:o}let i=n.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,?\s*(20\d{2}))?/i);if(i){let o=i[3]?Number(i[3]):t.getFullYear(),c=new Date(`${i[1]} ${i[2]}, ${o}`);return Number.isNaN(c.getTime())?null:c}return null}function C(e){return`/pages/post/detail.html?id=${encodeURIComponent(e)}`}function B(e,t=140){let n=String(e||"").replace(/\s+/g," ").trim();return n.length<=t?n:`${n.slice(0,t-1).trim()}\u2026`}function Y(e){let t=e.getFullYear();return[{title:"Boston Nepali Networking Night",date:`${t}-08-18`,time:"11:00am",location:"Cambridge, MA",description:"Meet founders, students, and new arrivals over tea \u2014 intros, job leads, and housing tips for Greater Boston."},{title:"Innovation Workshop",date:`${t}-08-20`,time:"04:00pm",location:"Lowell, MA",description:"A hands-on afternoon on storytelling, small-business setup, and community projects for Nepali youth and families."},{title:"Leadership Roundtable",date:`${t}-08-22`,time:"10:00am",location:"Quincy, MA",description:"Community organizers share how local associations plan Dashain, Tihar, and newcomer welcome weeks."},{title:"Neetesh Jung Kunwar \u2014 East Coast Tour",date:`${t}-08-15`,time:"07:00pm",location:"New York City, NY",description:"Live Nepali music night for the diaspora \u2014 doors open early, family seating available."},{title:"Sabin Rai & The Pharaoh \u2014 Live in Boston",date:`${t}-09-06`,time:"07:00pm",location:"Boston, MA",description:"An evening of Nepali rock and folk with the Boston community. Tickets at the door while they last."},{title:"Dashain Mela 2083 \u2014 Cultural Night",date:`${t}-09-20`,time:"04:00pm",location:"Dallas, TX",description:"Tika, food stalls, kids\u2019 games, and a cultural program for Dashain with Nepali families across Texas."},{title:"Pramod Kharel \u2014 Dashain Special Concert",date:`${t}-10-04`,time:"06:00pm",location:"Washington DC",description:"A Dashain concert for the DC\u2013Virginia\u2013Maryland Nepali community."}].map((a,i)=>{let[o,c,l]=a.date.split("-").map(Number);return{id:`sample-${i}`,title:a.title,description:a.description,body:a.description,location:a.location,href:`#event-sample-${i}`,image:"",start:new Date(o,c-1,l),timeLabel:a.time,sample:!0}})}function L(e){let t=`${e.availability||""} ${e.description||""} ${e.title||""}`,n=e.createdAt?new Date(e.createdAt):new Date,i=b(t,n)||b(e.availability||"",n)||D(n),o=String(e.description||"").replace(/\s+/g," ").trim()||e.location||"Nepali community gathering.",c=Array.isArray(e.images)&&e.images[0]?e.images[0]:"";return{id:e.id||`listing-${i.getTime()}`,title:e.title||"Community event",description:B(o),body:o,location:e.location||"",href:e.id?C(e.id):"#event",image:c,start:i,timeLabel:O(t)||P(i,"")}}function E(){let e=(new URLSearchParams(window.location.search).get("subcategory")||"").toLowerCase(),n=(document.querySelector(".chip.active")?.getAttribute("data-filter")||"").toLowerCase(),a=n&&n!=="all"?n:e;return!a||a==="events"}function M(e){return Array.from({length:7},(t,n)=>h(e,n))}function T(e,t){let n=d(t);return e.filter(a=>d(a.start)===n)}function A(e){return e.image?`<img src="${r(e.image)}" alt="${r(e.title||"Event")}" loading="lazy">`:'<span aria-hidden="true">\u{1F389}</span>'}function I(e,t){if(!t.length)return"";let n=k[e.getDay()],a=`${v[e.getMonth()]} ${e.getDate()}`;return`
    <section class="ev-group" data-group-day="${d(e)}">
      <div class="ev-group-head">
        <span>${r(n)}</span>
        <span>${r(a)}</span>
      </div>
      ${t.map(i=>`
        <a class="ev-row" href="${r(i.href)}" data-event-id="${r(i.id)}"${i.sample?"":` data-listing-id="${r(i.id)}"`}>
          <div class="ev-thumb">${A(i)}</div>
          <div class="ev-body">
            <div class="ev-title-row">
              <h3>${r(i.title)}</h3>
              <time>${r(i.timeLabel||"TBA")}</time>
            </div>
            <p>${r(i.description)}${i.location?` \xB7 ${r(i.location)}`:""}</p>
          </div>
        </a>
      `).join("")}
    </section>
  `}var s={monday:y(new Date),selected:"",query:"",events:[],searchOpen:!1,monthPickerOpen:!1,pickerYear:new Date().getFullYear()};function F(){let e=M(s.monday),t=new Set(e.map(d)),n=s.query.trim().toLowerCase();return s.events.filter(a=>t.has(d(a.start))).filter(a=>n?`${a.title} ${a.description} ${a.location}`.toLowerCase().includes(n):!0).sort((a,i)=>a.start.getTime()-i.start.getTime()||a.title.localeCompare(i.title))}function j(){let e=s.monday.getMonth(),t=s.monday.getFullYear(),n=v.map((a,i)=>`<button type="button" class="ev-picker-month${s.pickerYear===t&&i===e?" is-active":""}" data-pick-month="${i}">${a.slice(0,3)}</button>`).join("");return`
    <div class="ev-month-picker" role="dialog" aria-label="Choose month and year">
      <div class="ev-picker-year-nav">
        <button type="button" class="ev-month-btn" data-picker-year-shift="-1" aria-label="Previous year">\u2039</button>
        <span class="ev-picker-year">${s.pickerYear}</span>
        <button type="button" class="ev-month-btn" data-picker-year-shift="1" aria-label="Next year">\u203A</button>
      </div>
      <div class="ev-picker-months">${n}</div>
    </div>
  `}function q(e){let t=M(s.monday),n=v[s.monday.getMonth()];e.innerHTML=`
    <div class="ev-week-bar">
      <div class="ev-week-top">
        <div class="ev-month-nav">
          <button type="button" class="ev-month-btn" data-week-shift="-7" aria-label="Previous week">\u2039</button>
          <button type="button" class="ev-month-label" data-open-month-picker aria-haspopup="true" aria-expanded="${s.monthPickerOpen}">${r(n)} ${s.monday.getFullYear()}</button>
          <button type="button" class="ev-month-btn" data-week-shift="7" aria-label="Next week">\u203A</button>
          ${s.monthPickerOpen?j():""}
        </div>
        <div class="ev-week-tools">
          <button type="button" class="ev-icon-btn is-on" data-ev-tool="list" aria-label="List view" aria-pressed="true">\u2630</button>
          <button type="button" class="ev-icon-btn" data-ev-tool="search" aria-label="Search events" aria-pressed="${s.searchOpen}">\u2315</button>
          <a class="ev-icon-btn" href="../post/listing.html?category=events" aria-label="Post an event">+</a>
        </div>
      </div>
      <div class="ev-search-wrap${s.searchOpen?" is-open":""}">
        <input class="ev-search" type="search" placeholder="Search events" value="${r(s.query)}" aria-label="Search events">
      </div>
      <div class="ev-dow" aria-hidden="true">${t.map(a=>`<span>${H[a.getDay()]}</span>`).join("")}</div>
      <div class="ev-dates" role="listbox" aria-label="Days this week">
        ${t.map(a=>{let i=d(a),o=T(s.events,a).length>0,c=s.selected===i||!s.selected&&i===d(new Date)&&y(new Date).getTime()===s.monday.getTime();return`
            <button type="button" class="ev-date${c?" is-selected":""}${o?" has-event":""}" data-day="${i}" role="option" aria-selected="${c}">
              ${a.getDate()}
            </button>
          `}).join("")}
      </div>
    </div>
  `}function S(e){let t=F();if(!t.length){e.innerHTML=`
      <div class="ev-empty">
        <p>No events in this week.</p>
        <a class="btn-primary" href="../post/listing.html?category=events">Post an event</a>
      </div>
    `;return}let n=new Map;t.forEach(a=>{let i=d(a.start),o=n.get(i)||[];o.push(a),n.set(i,o)}),e.innerHTML=Array.from(n.entries()).map(([a,i])=>{let[o,c,l]=a.split("-").map(Number);return I(new Date(o,c-1,l),i)}).join("")}function u(){let e=document.getElementById("eventsWeekBar"),t=document.getElementById("eventsAgendaList");!e||!t||(q(e),S(t))}function R(e){return`${k[e.getDay()]}, ${v[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`}function W(){let e=document.getElementById("eventDetailModal");return e||(e=document.createElement("div"),e.id="eventDetailModal",e.className="listing-modal",e.innerHTML=`
    <div class="listing-modal-backdrop" data-close-event-detail></div>
    <div class="listing-modal-panel" role="dialog" aria-modal="true" aria-labelledby="eventDetailTitle">
      <button class="listing-modal-close" type="button" data-close-event-detail aria-label="Close event details">\xD7</button>
      <div id="eventDetailBody" class="listing-modal-body"></div>
    </div>
  `,document.body.appendChild(e),e.addEventListener("click",t=>{t.target.closest("[data-close-event-detail]")&&$()}),document.addEventListener("keydown",t=>{t.key==="Escape"&&e?.classList.contains("open")&&$()}),e)}function $(){let e=document.getElementById("eventDetailModal");e&&(e.classList.remove("open"),document.body.classList.remove("listing-modal-open"))}function J(e,t){let n=Array.isArray(t?.images)?t.images:e.image?[e.image]:[],a=n.length?`<div class="listing-detail-gallery">${n.map(p=>`<img src="${r(p)}" alt="${r(e.title||"Event")}">`).join("")}</div>`:`<div class="ev-detail-hero">${A(e)}</div>`,i=t?.contactPhone?String(t.contactPhone):"",o=t?.contactEmail?String(t.contactEmail):"",c=String(t?.description||e.body||e.description),l=e.sample?"":`<a class="btn-ghost" href="${r(e.href)}">Open full page</a>`,m=i?`<a class="btn-ghost" href="tel:${r(i)}">${r(i)}</a>`:"",f=o?`<a class="btn-ghost" href="mailto:${r(o)}">${r(o)}</a>`:"";return`
    <div class="listing-detail-kicker">\u{1F389} Event</div>
    <h2 id="eventDetailTitle">${r(e.title)}</h2>
    ${a}
    <div class="listing-detail-meta">
      <span>\u{1F4C5} ${r(R(e.start))}</span>
      <span>\u{1F550} ${r(e.timeLabel||"Time TBA")}</span>
      ${e.location?`<span>\u{1F4CD} ${r(e.location)}</span>`:""}
    </div>
    <p>${r(c)}</p>
    <div class="listing-detail-contact">
      ${m}${f}${l}
    </div>
  `}async function x(e){let t=s.events.find(o=>o.id===e);if(!t)return;let n=W(),a=n.querySelector("#eventDetailBody");n.classList.add("open"),document.body.classList.add("listing-modal-open"),a.innerHTML='<div class="empty-state"><div class="icon">\u{1F389}</div><h3>Loading event\u2026</h3></div>';let i=null;if(!t.sample&&t.id)try{let o=window.location.origin.startsWith("file://")?"http://localhost:4000":window.location.origin,c=await fetch(`${o}/api/listings/${encodeURIComponent(t.id)}`);c.ok&&(i=await c.json())}catch{i=null}a.innerHTML=J(t,i)}function K(e){e.addEventListener("click",t=>{let n=t.target,a=n.closest(".ev-row");if(a?.dataset.eventId){if(t.metaKey||t.ctrlKey||t.shiftKey)return;t.preventDefault(),x(a.dataset.eventId);return}let i=n.closest("[data-week-shift]");if(i){s.monday=h(s.monday,Number(i.dataset.weekShift)),s.selected="",s.monthPickerOpen=!1,u();return}if(n.closest("[data-open-month-picker]")){s.pickerYear=s.monday.getFullYear(),s.monthPickerOpen=!s.monthPickerOpen,u();return}let c=n.closest("[data-picker-year-shift]");if(c){s.pickerYear+=Number(c.dataset.pickerYearShift),u();return}let l=n.closest("[data-pick-month]");if(l){let p=Number(l.dataset.pickMonth),g=y(new Date(s.pickerYear,p,1));g.getMonth()!==p&&(g=h(g,7)),s.monday=g,s.selected="",s.monthPickerOpen=!1,u();return}let m=n.closest("[data-day]");if(m?.dataset.day){s.selected=m.dataset.day,u(),document.querySelector(`[data-group-day="${m.dataset.day}"]`)?.scrollIntoView({block:"start"});return}n.closest("[data-ev-tool]")?.dataset.evTool==="search"&&(s.searchOpen=!s.searchOpen,u(),e.querySelector(".ev-search")?.focus())}),e.addEventListener("input",t=>{let n=t.target;n.classList.contains("ev-search")&&(s.query=n.value,S(document.getElementById("eventsAgendaList")))}),document.addEventListener("click",t=>{!s.monthPickerOpen||t.target.closest(".ev-month-nav")||(s.monthPickerOpen=!1,u())}),document.addEventListener("keydown",t=>{t.key==="Escape"&&s.monthPickerOpen&&(s.monthPickerOpen=!1,u())})}async function U(){let e=window.location.origin.startsWith("file://")?"http://localhost:4000":window.location.origin,t=[`${e}/api/listings?category=community&subcategory=events&limit=80`,`${e}/api/listings?category=events&limit=80`],n=[];await Promise.all(t.map(async i=>{try{let o=await fetch(i);if(!o.ok)return;((await o.json()).listings||[]).forEach(l=>{let m=L(l);m&&n.push(m)})}catch{}}));let a=new Set;return n.filter(i=>{let o=`${i.title.toLowerCase()}|${d(i.start)}`;return a.has(o)?!1:(a.add(o),!0)})}function N(e){s.events=e.length?e:Y(new Date);let t=d(new Date);T(s.events,new Date).length&&(s.selected=t),u()}function z(e){if(!E()){document.body.classList.remove("events-agenda-on");return}document.body.classList.add("events-agenda-on");let t=(e||[]).map(n=>L(n)).filter(Boolean);t.length&&N(t)}async function G(){if(!/\/community\/events\.html$/.test(window.location.pathname))return;let e=document.getElementById("eventsAgenda");if(!e||(K(e),!E()))return;document.body.classList.add("events-agenda-on");let t=await U();N(t),window.addEventListener("biscoon:listings-rendered",(n=>{z(n.detail?.listings||[])}))}function w(){G().catch(console.error)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",w):w();})();
