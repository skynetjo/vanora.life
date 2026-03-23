// ═══════════════════════════════════════════════════════
// VANORA — App v2 | Thread-connected panels · X-ray mode
// ═══════════════════════════════════════════════════════

// ── HEADER SCROLL ────────────────────────────────────
const hdr = document.getElementById('hdr');
window.addEventListener('scroll', () => {
  hdr.classList.toggle('solid', window.scrollY > 80);
  const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  document.getElementById('prog').style.width = Math.min(pct, 100) + '%';
}, { passive: true });

// ── SCROLL REVEAL ────────────────────────────────────
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
}, { threshold: 0.05 });
document.querySelectorAll('.rv').forEach(el => io.observe(el));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

// ── HERO SLIDER ───────────────────────────────────────
const HERO_SLIDES = [
  { id:'tiger',       label:'Bengal Tiger',     img:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Tiger_in_Ranthambhore.jpg/1280px-Tiger_in_Ranthambhore.jpg' },
  { id:'snowleopard', label:'Snow Leopard',      img:'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Schneeleopard-schneeleopard.jpg/1280px-Schneeleopard-schneeleopard.jpg' },
  { id:'elephant',    label:'Asian Elephant',    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Above_Gotland_-_Asian_elephant_at_Pinnawala_Elephant_Orphanage.jpg/1280px-Above_Gotland_-_Asian_elephant_at_Pinnawala_Elephant_Orphanage.jpg' },
  { id:'peacock',     label:'Indian Peacock',    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Indian_Peacock_DSC_0612.jpg/1280px-Indian_Peacock_DSC_0612.jpg' },
  { id:'gharial',     label:'Gharial',           img:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Female_gharial_%28Gavialis_gangeticus%29.jpg/1280px-Female_gharial_%28Gavialis_gangeticus%29.jpg' },
  { id:'kingcobra',   label:'King Cobra',        img:'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Ophiophagus_hannah_in_Kaeng_Krachan.jpg/1280px-Ophiophagus_hannah_in_Kaeng_Krachan.jpg' },
];

let heroIdx = 0, heroAuto;

function heroSlide(dir) {
  heroIdx = (heroIdx + dir + HERO_SLIDES.length) % HERO_SLIDES.length;
  updateHeroSlide();
  resetHeroAuto();
}
function updateHeroSlide() {
  const s = HERO_SLIDES[heroIdx];
  const img = document.getElementById('heroAnimalImg');
  if (img) {
    img.style.opacity = '0';
    setTimeout(() => { img.src = s.img; img.alt = s.label; img.style.opacity = '1'; }, 300);
  }
  const cnt = document.getElementById('slideCount');
  const lbl = document.getElementById('slideLabel');
  const sci = document.getElementById('heroSciLabel');
  if (cnt) cnt.textContent = String(heroIdx + 1).padStart(2,'0') + ' / ' + String(HERO_SLIDES.length).padStart(2,'0');
  if (lbl) lbl.textContent = s.label;
  if (sci) sci.textContent = SPECIES[s.id]?.sci || s.label;
}
function resetHeroAuto() {
  clearInterval(heroAuto);
  heroAuto = setInterval(() => heroSlide(1), 5000);
}

// ── THREAD CONNECTION ─────────────────────────────────
let activeCard = null;

function drawThread(fromEl) {
  const svg = document.getElementById('thread-svg');
  if (!svg || window.innerWidth < 769) return;

  const rect = fromEl.getBoundingClientRect();
  const panelW = Math.min(680, window.innerWidth * 0.94);
  const panelX = window.innerWidth - panelW;
  const panelY = window.innerHeight / 2;

  // Origin: right edge of card, vertically centred
  const x1 = rect.right;
  const y1 = rect.top + rect.height * 0.42;

  // Destination: left edge of panel at midpoint
  const x2 = panelX + 2;
  const y2 = panelY;

  // Control points for smooth bezier
  const cp1x = x1 + Math.abs(x2 - x1) * 0.45;
  const cp1y = y1;
  const cp2x = x2 - Math.abs(x2 - x1) * 0.25;
  const cp2y = y2;

  const d = `M${x1},${y1} C${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;

  svg.setAttribute('width', window.innerWidth);
  svg.setAttribute('height', window.innerHeight);
  svg.style.display = 'block';

  svg.innerHTML = `
    <path class="thread-path" d="${d}" stroke-dasharray="6 4"/>
    <circle class="thread-dot" cx="${x1}" cy="${y1}" r="4"/>
    <circle class="thread-dot" cx="${x2}" cy="${y2}" r="5" style="animation-delay:0.15s"/>
  `;
}

function hideThread() {
  const svg = document.getElementById('thread-svg');
  if (svg) svg.style.display = 'none';
}

// ── WIKIPEDIA PHOTO CACHE ─────────────────────────────
const wikiCache = {};

async function fetchSummary(term) {
  const slug = encodeURIComponent(term.replace(/ /g, '_'));
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('not found');
  return r.json();
}
function extractPhoto(d) {
  if (d.thumbnail?.source) return d.thumbnail.source.replace(/\/\d+px-/, '/500px-');
  if (d.originalimage?.source) return d.originalimage.source;
  return null;
}
async function getWikiData(sciName, commonName) {
  const key = (sciName || commonName).toLowerCase();
  if (wikiCache[key] !== undefined) return wikiCache[key];
  const tries = [sciName];
  const parts = (sciName || '').split(' ');
  if (parts.length === 3) tries.push(parts[0] + ' ' + parts[1]);
  if (commonName && !tries.includes(commonName)) tries.push(commonName);
  let result = null;
  for (const t of tries) {
    if (!t) continue;
    try {
      const d = await fetchSummary(t);
      const photo = extractPhoto(d);
      const extract = d.extract ? d.extract.substring(0, 600) : '';
      const url = d.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent((sciName||commonName).replace(/ /g,'_'))}`;
      result = { photo, extract, url };
      if (photo) break;
    } catch { /* try next */ }
  }
  wikiCache[key] = result;
  return result;
}
async function prefetchBatch(items) {
  await Promise.allSettled(items.map(ws => getWikiData(ws.sci || ws.name, ws.name)));
}

// ── TICKER ────────────────────────────────────────────
function buildTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const items = [...TICKER_FACTS, ...TICKER_FACTS].map(f =>
    `<span class="t-item"><span class="t-pip">◆</span>${f}</span>`).join('');
  track.innerHTML = items;
}

// ── STATUS LABELS ─────────────────────────────────────
const STATUS_NAMES = {
  LC:'Least Concern', NT:'Near Threatened', VU:'Vulnerable',
  EN:'Endangered', CR:'Critically Endangered', DD:'Data Deficient', NE:'Not Evaluated'
};

// ── CARD BUILDER ──────────────────────────────────────
function makeCard(name, sci, status, cat, photo, icon, id, isWiki) {
  const onclick = isWiki
    ? `handleCardClick(event,'wiki','${esc(name)}','${esc(sci)}','${esc(cat)}','${status}','${icon||'🐾'}')`
    : `handleCardClick(event,'deep','${id}')`;

  const hasXray = cat === 'birds' || cat === 'mammals';

  return `<div class="sp-card" id="card-${slugify(id||name)}" onclick="${onclick}" data-id="${id||slugify(name)}">
    <div class="sp-photo">
      ${photo ? `<img class="sp-img" src="${photo}" alt="${esc(name)}" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='none';this.parentElement.querySelector('.sp-no-photo').style.display='flex'">` : ''}
      <div class="sp-no-photo"${photo ? ' style="display:none"' : ''}>${icon||'🐾'}</div>
      <div class="sp-photo-grad"></div>
      <span class="sp-status b${status}">${STATUS_NAMES[status]||status}</span>
      ${hasXray ? `<div class="sp-xray-badge" onclick="event.stopPropagation();openSkeletonFor('${esc(name)}','${esc(sci)}','${photo||''}')">🦴</div>` : ''}
      <div class="sp-explore">Explore →</div>
      <div class="sp-overlay-name">
        <div class="sp-name">${name}</div>
        <div class="sp-sci">${sci}</div>
      </div>
    </div>
  </div>`;
}

function esc(s) { return (s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function slugify(s) { return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

// ── CARD CLICK HANDLER ────────────────────────────────
function handleCardClick(event, type, ...args) {
  const cardEl = event.currentTarget;

  // Deselect previous
  if (activeCard && activeCard !== cardEl) {
    activeCard.classList.remove('selected');
  }
  activeCard = cardEl;
  cardEl.classList.add('selected');

  // Draw thread
  setTimeout(() => drawThread(cardEl), 50);

  if (type === 'deep') {
    openSpecies(args[0]);
  } else {
    const [name, sci, cat, status, icon] = args;
    openWikiSpecies(name, sci, cat, status, icon);
  }
}

function openSpeciesFromBtn(event, id) {
  openSpecies(id);
}

// ── SPECIES GRID ──────────────────────────────────────
let currentFilter = 'all';
let wikiOffset = 0;
const WIKI_PAGE = 12;

function getWikiFiltered(filter) {
  if (filter === 'all') return WIKI_SPECIES;
  if (filter === 'endangered') return WIKI_SPECIES.filter(w => ['EN','CR','VU'].includes(w.status));
  return WIKI_SPECIES.filter(w => w.cat === filter);
}

async function buildSpeciesGrid(filter) {
  currentFilter = filter; wikiOffset = 0;
  const grid = document.getElementById('speciesGrid');
  if (!grid) return;

  let featured = Object.values(SPECIES);
  if (filter === 'endangered') featured = featured.filter(s => ['EN','CR','VU'].includes(s.status));
  else if (filter !== 'all') featured = featured.filter(s => s.category === filter);
  grid.innerHTML = featured.map(s => makeCard(s.name,s.sci,s.status,s.category,s.photo,s.icon,s.id,false)).join('');

  const wikiItems = getWikiFiltered(filter);
  const firstBatch = wikiItems.slice(0, WIKI_PAGE);
  wikiOffset = firstBatch.length;

  const skelIds = firstBatch.map((_,i) => `sk-${Date.now()}-${i}`);
  skelIds.forEach(sid => {
    const d = document.createElement('div'); d.id = sid; d.className = 'sp-skel'; grid.appendChild(d);
  });

  await prefetchBatch(firstBatch);
  firstBatch.forEach((ws,i) => {
    const cached = wikiCache[(ws.sci||ws.name).toLowerCase()];
    const el = document.getElementById(skelIds[i]);
    if (el) el.outerHTML = makeCard(ws.name,ws.sci,ws.status,ws.cat,cached?.photo||null,ws.icon||'🐾',slugify(ws.name),true);
  });

  const wrap = document.getElementById('loadMoreWrap');
  const btn  = document.getElementById('loadMoreBtn');
  if (wrap) wrap.style.display = wikiOffset < wikiItems.length ? 'block' : 'none';
  if (btn)  { btn.disabled = false; btn.textContent = 'Load more species →'; }
}

async function loadWikiSpecies() {
  const grid = document.getElementById('speciesGrid');
  if (!grid) return;
  const wikiItems = getWikiFiltered(currentFilter);
  const batch = wikiItems.slice(wikiOffset, wikiOffset + WIKI_PAGE);
  if (!batch.length) return;
  wikiOffset += batch.length;
  const btn = document.getElementById('loadMoreBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
  const skelIds = batch.map((_,i) => `sk-m-${Date.now()}-${i}`);
  skelIds.forEach(sid => {
    const d = document.createElement('div'); d.id = sid; d.className = 'sp-skel'; grid.appendChild(d);
  });
  await prefetchBatch(batch);
  batch.forEach((ws,i) => {
    const cached = wikiCache[(ws.sci||ws.name).toLowerCase()];
    const el = document.getElementById(skelIds[i]);
    if (el) el.outerHTML = makeCard(ws.name,ws.sci,ws.status,ws.cat,cached?.photo||null,ws.icon||'🐾',slugify(ws.name),true);
  });
  const wrap = document.getElementById('loadMoreWrap');
  if (btn)  { btn.disabled = false; btn.textContent = 'Load more species →'; }
  if (wrap) wrap.style.display = wikiOffset < wikiItems.length ? 'block' : 'none';
}

function setFilter(cat, btn) {
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  buildSpeciesGrid(cat);
}

// ── CATEGORY GRID ─────────────────────────────────────
function buildCatGrid() {
  const grid = document.getElementById('catGrid');
  if (!grid) return;
  grid.innerHTML = CAT_SECTIONS.map(c => `
    <div class="cat-card" onclick="showCatPage('${c.cat}')">
      <img class="cat-img" src="${c.photo}" alt="${c.name}" loading="lazy" onerror="this.style.display='none'">
      <div class="cat-arrow">→</div>
      <div class="cat-body">
        <div class="cat-count">${c.count}</div>
        <div class="cat-name">${c.name}</div>
      </div>
    </div>`).join('');
}

// ── A-Z ───────────────────────────────────────────────
let activeAZ = null;
function buildAZGrid() {
  const grid = document.getElementById('azGrid');
  if (!grid) return;
  grid.innerHTML = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l =>
    `<button class="az-btn" id="az-${l}" onclick="showAZ('${l}',this)">${l}</button>`).join('');
}

function showAZ(l, btn) {
  const results = document.getElementById('azResults');
  if (!results) return;
  if (activeAZ === l) {
    results.style.display = 'none'; activeAZ = null;
    document.querySelectorAll('.az-btn').forEach(b => b.classList.remove('active'));
    return;
  }
  activeAZ = l;
  document.querySelectorAll('.az-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const items = AZ_DATA[l] || [];
  results.innerHTML = items.length
    ? items.map(it => `<button class="az-item" onclick="${it.id
        ? `openSpeciesFromBtn(event,'${it.id}')`
        : `openWikiSpecies('${esc(it.n)}','${esc(it.sci||'')}','wildlife','${it.status||'LC'}','🐾')`}">
        <div class="az-item-n">${it.n}</div>
        <div class="az-item-s">${it.sci||''}</div>
        <span class="az-item-t">${it.cat||''}</span>
      </button>`).join('')
    : `<div class="az-item"><div class="az-item-n" style="color:var(--ink3)">No entries for "${l}"</div></div>`;
  results.style.display = 'grid';
}

// ── SEARCH ────────────────────────────────────────────
let searchTimer;
function doSearch(query, boxId) {
  clearTimeout(searchTimer);
  const box = document.getElementById(boxId);
  if (!box) return;
  if (query.length < 2) { box.classList.remove('show'); return; }
  searchTimer = setTimeout(async () => {
    const q = query.toLowerCase();
    const local = Object.values(SPECIES).filter(s =>
      s.name.toLowerCase().includes(q) || s.sci.toLowerCase().includes(q)
    ).slice(0, 5);
    const wm = WIKI_SPECIES.filter(w =>
      w.name.toLowerCase().includes(q) || (w.sci||'').toLowerCase().includes(q)
    ).slice(0, 5 - local.length);
    let html = local.map(s => `
      <div class="sug-item" onclick="openSpeciesFromBtn(event,'${s.id}');document.getElementById('${boxId}').classList.remove('show')">
        <div class="sug-thumb">${s.photo?`<img src="${s.photo}" alt="">`:s.icon}</div>
        <div><div class="sug-name">${s.name}</div><div class="sug-sci">${s.sci}</div></div>
        <span class="sug-tag">Profile</span>
      </div>`).join('') + wm.map(w => `
      <div class="sug-item" onclick="openWikiSpecies('${esc(w.name)}','${esc(w.sci)}','${w.cat}','${w.status}','${w.icon||'🐾'}');document.getElementById('${boxId}').classList.remove('show')">
        <div class="sug-thumb">${w.icon||'🐾'}</div>
        <div><div class="sug-name">${w.name}</div><div class="sug-sci">${w.sci}</div></div>
        <span class="sug-tag">Species</span>
      </div>`).join('');
    if (!html) {
      try {
        const r = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=4&namespace=0&format=json&origin=*`);
        const [,titles] = await r.json();
        html = titles.map(t => `
          <div class="sug-item" onclick="openWikiSpecies('${esc(t)}','','wildlife','LC','🔍');document.getElementById('${boxId}').classList.remove('show')">
            <div class="sug-thumb">🔍</div>
            <div><div class="sug-name">${t}</div><div class="sug-sci">Wikipedia</div></div>
            <span class="sug-tag">Wiki</span>
          </div>`).join('');
      } catch {}
    }
    box.innerHTML = html || `<div class="sug-item"><div style="color:var(--ink3);font-size:.8rem">No results found</div></div>`;
    box.classList.add('show');
  }, 200);
}

document.addEventListener('click', e => {
  if (!e.target.closest('.hdr-search') && !e.target.closest('.hero-search-wrap'))
    document.querySelectorAll('.sug-box').forEach(b => b.classList.remove('show'));
});

// ── CATEGORY PAGE ─────────────────────────────────────
let catPageFilter = 'mammals', catOffset = 0;

async function showCatPage(cat) {
  catPageFilter = cat; catOffset = 0;
  showView('category');
  const titles = {
    mammals: ['Mammals of India','500+ documented mammal species'],
    birds:   ['Birds of India','1,300+ resident and migratory bird species'],
    reptiles:['Reptiles of India','460+ species including crocodilians, snakes and turtles'],
    trees:   ['Trees of India','1,200+ native and naturalised tree species'],
  };
  const [title,sub] = titles[cat]||[cat,''];
  document.getElementById('catPageTitle').textContent = title;
  document.getElementById('catPageSub').textContent = sub;
  const grid = document.getElementById('catGrid2');
  grid.innerHTML = '';
  Object.values(SPECIES).filter(s => s.category === cat).forEach(s => {
    grid.insertAdjacentHTML('beforeend', makeCard(s.name,s.sci,s.status,s.category,s.photo,s.icon,s.id,false));
  });
  const wikiItems = WIKI_SPECIES.filter(w => w.cat === cat);
  const firstBatch = wikiItems.slice(0, WIKI_PAGE);
  catOffset = firstBatch.length;
  const skelIds = firstBatch.map((_,i) => `csk-${Date.now()}-${i}`);
  skelIds.forEach(sid => {
    const d = document.createElement('div'); d.id = sid; d.className = 'sp-skel'; grid.appendChild(d);
  });
  await prefetchBatch(firstBatch);
  firstBatch.forEach((ws,i) => {
    const cached = wikiCache[(ws.sci||ws.name).toLowerCase()];
    const el = document.getElementById(skelIds[i]);
    if (el) el.outerHTML = makeCard(ws.name,ws.sci,ws.status,ws.cat,cached?.photo||null,ws.icon||'🐾',slugify(ws.name),true);
  });
  const lm = document.getElementById('catLoadMore');
  const btn = document.getElementById('catLoadBtn');
  if (lm) lm.style.display = catOffset < wikiItems.length ? 'block' : 'none';
  if (btn) { btn.disabled = false; btn.textContent = `Load more ${cat} →`; btn.onclick = () => loadMoreCat(cat); }
}

async function loadMoreCat(cat) {
  const grid = document.getElementById('catGrid2');
  const wikiItems = WIKI_SPECIES.filter(w => w.cat === cat);
  const batch = wikiItems.slice(catOffset, catOffset + WIKI_PAGE);
  if (!batch.length) return;
  catOffset += batch.length;
  const btn = document.getElementById('catLoadBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
  const skelIds = batch.map((_,i) => `csk-m-${Date.now()}-${i}`);
  skelIds.forEach(sid => {
    const d = document.createElement('div'); d.id = sid; d.className = 'sp-skel'; grid.appendChild(d);
  });
  await prefetchBatch(batch);
  batch.forEach((ws,i) => {
    const cached = wikiCache[(ws.sci||ws.name).toLowerCase()];
    const el = document.getElementById(skelIds[i]);
    if (el) el.outerHTML = makeCard(ws.name,ws.sci,ws.status,ws.cat,cached?.photo||null,ws.icon||'🐾',slugify(ws.name),true);
  });
  const lm = document.getElementById('catLoadMore');
  if (btn)  { btn.disabled = false; btn.textContent = `Load more ${cat} →`; }
  if (lm) lm.style.display = catOffset < wikiItems.length ? 'block' : 'none';
}

// ── VIEW / MODAL ──────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name)?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
  closePanel();
}
function openModal()  { document.getElementById('modal').classList.add('show'); }
function closeModal() { document.getElementById('modal').classList.remove('show'); }
function modalSub() {
  const b = document.getElementById('mBtn');
  b.textContent = '✓ Subscribed! Welcome.';
  b.style.background = 'var(--leaf-l)';
  setTimeout(closeModal, 1800);
}
function nlSub() {
  const el = document.getElementById('nlEmail');
  if (!el?.value.includes('@')) { if(el) el.style.borderColor='var(--rose)'; return; }
  el.value = ''; el.placeholder = '✓ Subscribed — thank you!';
}

// ── PANEL OPEN/CLOSE ──────────────────────────────────
function openPanel() {
  document.getElementById('backdrop').classList.add('open');
  document.getElementById('panel').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closePanel() {
  stopAllSounds();
  hideThread();
  document.getElementById('backdrop').classList.remove('open');
  document.getElementById('panel').classList.remove('open');
  document.body.style.overflow = '';
  if (activeCard) { activeCard.classList.remove('selected'); activeCard = null; }
}

// ── SKELETON X-RAY ────────────────────────────────────
// Simplified bird skeleton SVG (inspired by the uploaded anatomy image)
const BIRD_SKELETON_SVG = `
<svg viewBox="0 0 280 320" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- Skull -->
  <ellipse cx="200" cy="62" rx="22" ry="18" stroke-width="1.5"/>
  <ellipse cx="200" cy="62" rx="10" ry="8" stroke="rgba(255,165,0,0.6)" fill="rgba(255,140,0,0.3)" stroke-width="1"/> <!-- eye -->
  <!-- Beak -->
  <path d="M218,58 L248,52 L216,66Z"/>
  <!-- Neck vertebrae -->
  <path d="M182,74 Q175,90 165,105 Q160,120 158,138"/>
  <circle cx="182" cy="74" r="2.5" fill="rgba(255,255,255,0.5)"/>
  <circle cx="172" cy="90" r="2.5" fill="rgba(255,255,255,0.5)"/>
  <circle cx="163" cy="108" r="2.5" fill="rgba(255,255,255,0.5)"/>
  <circle cx="158" cy="125" r="2.5" fill="rgba(255,255,255,0.5)"/>
  <!-- Spine / keel area -->
  <path d="M158,138 L152,165 L150,195"/>
  <circle cx="155" cy="150" r="2" fill="rgba(255,255,255,0.4)"/>
  <circle cx="152" cy="165" r="2" fill="rgba(255,255,255,0.4)"/>
  <circle cx="150" cy="180" r="2" fill="rgba(255,255,255,0.4)"/>
  <!-- Ribcage -->
  <path d="M158,138 Q135,148 125,162 Q118,180 125,195"/>
  <path d="M156,148 Q138,155 128,167 Q122,183 130,196"/>
  <path d="M153,158 Q138,162 131,172 Q127,186 133,197"/>
  <path d="M150,168 Q137,170 133,178 Q131,190 136,198"/>
  <!-- Right side ribs (mirror) -->
  <path d="M158,138 Q178,148 185,162 Q190,178 182,195"/>
  <path d="M156,148 Q174,155 180,167 Q183,183 176,196"/>
  <path d="M153,158 Q168,163 172,173 Q173,186 168,197"/>
  <!-- Sternum / keel -->
  <path d="M130,160 L128,200 Q128,215 150,218 Q170,215 170,200 L168,160" stroke-width="1" opacity="0.6"/>
  <!-- Pelvis -->
  <ellipse cx="150" cy="205" rx="28" ry="14" stroke-width="1.5" opacity="0.7"/>
  <!-- Tail / pygostyle -->
  <path d="M148,218 Q140,232 138,240 M152,218 Q158,232 160,240"/>
  <!-- Wing bones - humerus -->
  <path d="M158,140 Q100,110 55,80" stroke-width="2"/>
  <!-- Wing - radius/ulna -->
  <path d="M55,80 Q28,68 12,72"/>
  <path d="M55,80 Q30,90 16,100"/>
  <!-- Wing - hand/fingers -->
  <path d="M12,72 Q5,65 8,58"/>
  <path d="M12,72 Q4,72 2,78"/>
  <path d="M16,100 Q8,105 10,112"/>
  <!-- Coracoid / shoulder -->
  <ellipse cx="155" cy="142" rx="6" ry="4" fill="rgba(255,255,255,0.15)"/>
  <!-- Left leg - femur -->
  <path d="M138,210 Q128,230 118,252" stroke-width="2"/>
  <!-- Left tibia -->
  <path d="M118,252 Q114,270 112,290" stroke-width="1.8"/>
  <!-- Left toes -->
  <path d="M112,290 Q100,296 94,300 M112,290 Q108,298 108,306 M112,290 Q118,298 120,305 M112,290 Q122,293 128,292"/>
  <!-- Right leg - femur -->
  <path d="M162,210 Q170,230 178,252" stroke-width="2"/>
  <!-- Right tibia -->
  <path d="M178,252 Q180,272 182,290" stroke-width="1.8"/>
  <!-- Right toes -->
  <path d="M182,290 Q172,296 168,302 M182,290 Q178,298 178,305 M182,290 Q188,298 192,305 M182,290 Q192,293 198,292"/>
  <!-- Scapula -->
  <path d="M158,142 Q168,130 172,118" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
  <!-- Furcula (wishbone) -->
  <path d="M148,142 Q140,158 148,164 Q156,158 160,142" stroke="rgba(255,200,100,0.6)" stroke-width="1.2"/>
</svg>`;

// Mammal (big cat) skeleton - simplified
const MAMMAL_SKELETON_SVG = `
<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- Skull -->
  <ellipse cx="270" cy="80" rx="28" ry="22"/>
  <ellipse cx="268" cy="75" rx="8" ry="7" stroke="rgba(255,165,0,0.6)" fill="rgba(255,140,0,0.25)"/>
  <!-- Jaw -->
  <path d="M245,90 Q255,100 270,100 Q283,100 292,92"/>
  <!-- Teeth -->
  <path d="M248,98 L246,105 M254,100 L252,107 M285,97 L287,104 M291,95 L294,102"/>
  <!-- Spine -->
  <path d="M242,80 Q220,78 195,78 Q170,80 145,83 Q120,86 95,90 Q75,95 60,105"/>
  <!-- Vertebrae dots -->
  <circle cx="230" cy="79" r="2" fill="rgba(255,255,255,0.5)"/>
  <circle cx="210" cy="78" r="2" fill="rgba(255,255,255,0.5)"/>
  <circle cx="190" cy="79" r="2" fill="rgba(255,255,255,0.5)"/>
  <circle cx="170" cy="80" r="2" fill="rgba(255,255,255,0.5)"/>
  <circle cx="150" cy="83" r="2" fill="rgba(255,255,255,0.5)"/>
  <circle cx="130" cy="87" r="2" fill="rgba(255,255,255,0.5)"/>
  <circle cx="110" cy="91" r="2" fill="rgba(255,255,255,0.5)"/>
  <!-- Ribcage -->
  <path d="M230,80 Q240,95 235,115 Q220,128 200,128 Q180,128 168,115 Q164,95 170,80"/>
  <path d="M220,80 Q226,95 222,110"/>
  <path d="M210,80 Q214,96 210,110"/>
  <path d="M200,79 Q202,96 200,110"/>
  <path d="M190,79 Q188,96 190,110"/>
  <path d="M180,79 Q178,95 180,110"/>
  <!-- Pelvis -->
  <ellipse cx="110" cy="98" rx="22" ry="20" opacity="0.8"/>
  <!-- Tail vertebrae -->
  <path d="M60,105 Q40,110 20,118 Q8,124 2,128" stroke-width="1.5" stroke-dasharray="3 3"/>
  <!-- Front right leg -->
  <path d="M235,128 Q238,148 240,168" stroke-width="2"/>
  <path d="M240,168 Q242,182 240,195"/>
  <path d="M240,195 Q245,200 252,200 M240,195 Q238,202 234,204 M240,195 Q232,200 226,200"/>
  <!-- Front left leg -->
  <path d="M215,128 Q212,148 210,168" stroke-width="2"/>
  <path d="M210,168 Q208,182 208,195"/>
  <path d="M208,195 Q213,200 220,200 M208,195 Q206,202 202,204 M208,195 Q200,200 194,200"/>
  <!-- Rear right leg -->
  <path d="M122,115 Q128,138 130,162" stroke-width="2"/>
  <path d="M130,162 Q128,178 126,195"/>
  <path d="M126,195 Q130,200 137,200 M126,195 Q124,202 120,204 M126,195 Q118,200 112,200"/>
  <!-- Rear left leg -->
  <path d="M100,118 Q102,140 100,163" stroke-width="2"/>
  <path d="M100,163 Q98,178 96,195"/>
  <path d="M96,195 Q100,200 107,200 M96,195 Q94,202 90,204 M96,195 Q88,200 82,200"/>
  <!-- Scapula right -->
  <path d="M234,95 Q248,85 252,72" stroke="rgba(255,255,255,0.4)"/>
  <!-- Scapula left -->
  <path d="M218,95 Q205,85 200,72" stroke="rgba(255,255,255,0.4)"/>
</svg>`;

function openSkeletonFor(name, sci, imgUrl) {
  document.getElementById('skelTitle').textContent = name;
  document.getElementById('skelSci').textContent = sci;
  const img = document.getElementById('skelImg');
  if (imgUrl) { img.src = imgUrl; img.style.display = 'block'; }
  else img.style.display = 'none';

  // Choose skeleton based on name/sci
  const isBird = WIKI_SPECIES.find(w => w.name === name)?.cat === 'birds'
    || Object.values(SPECIES).find(s => s.name === name)?.category === 'birds'
    || name.toLowerCase().includes('bird') || name.toLowerCase().includes('crane')
    || name.toLowerCase().includes('peacock') || name.toLowerCase().includes('eagle')
    || name.toLowerCase().includes('flamingo') || name.toLowerCase().includes('owl');

  document.getElementById('skelSvgWrap').innerHTML = isBird ? BIRD_SKELETON_SVG : MAMMAL_SKELETON_SVG;
  skelMode('xray', document.querySelector('.skel-btn'));

  document.getElementById('skeletonModal').classList.add('show');
}

function skelMode(mode, btn) {
  document.querySelectorAll('.skel-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const img = document.getElementById('skelImg');
  const svgWrap = document.getElementById('skelSvgWrap');
  const label = document.getElementById('skelLabel');
  if (mode === 'xray') {
    img.style.filter = 'brightness(0.15) contrast(2) saturate(0)';
    svgWrap.style.opacity = '1';
    label.textContent = 'X-RAY VIEW';
  } else if (mode === 'photo') {
    img.style.filter = 'brightness(0.9) saturate(0.85)';
    svgWrap.style.opacity = '0';
    label.textContent = 'NORMAL PHOTO';
  } else {
    img.style.filter = 'brightness(0.45) contrast(1.5) saturate(0)';
    svgWrap.style.opacity = '0.7';
    label.textContent = 'OVERLAY VIEW';
  }
}

function closeSkeleton() {
  document.getElementById('skeletonModal').classList.remove('show');
}

// ── URL DEEP LINK ─────────────────────────────────────
function handleURLParams() {
  const sp = new URLSearchParams(window.location.search).get('species');
  if (sp) setTimeout(() => openSpecies(sp), 600);
}

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildTicker();
  buildSpeciesGrid('all');
  buildCatGrid();
  buildAZGrid();
  handleURLParams();
  resetHeroAuto();

  // Hero search
  document.querySelector('.hero-sb')?.addEventListener('click', () => {
    const v = document.getElementById('heroQ')?.value;
    if (v) doSearch(v, 'heroSug');
  });
  document.getElementById('heroQ')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch(e.target.value, 'heroSug');
  });
});
