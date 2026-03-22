// ═══════════════════════════════════════════════════════
// ROOTS & ROARS — App v7
// Hero: animalia.bio-style with animal slider
// Cards: square photo top, name below, no overlays
// Photos: 3-step fallback for max coverage
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

// ── HERO ANIMAL SLIDER ────────────────────────────────
// Cycles through featured species — like animalia.bio's 01/06 indicator
const HERO_SLIDES = [
  { id:'tiger',       label:'Bengal Tiger',     img:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Tiger_in_Ranthambhore.jpg/1280px-Tiger_in_Ranthambhore.jpg' },
  { id:'snowleopard', label:'Snow Leopard',      img:'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Schneeleopard-schneeleopard.jpg/1280px-Schneeleopard-schneeleopard.jpg' },
  { id:'elephant',    label:'Asian Elephant',    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Above_Gotland_-_Asian_elephant_at_Pinnawala_Elephant_Orphanage.jpg/1280px-Above_Gotland_-_Asian_elephant_at_Pinnawala_Elephant_Orphanage.jpg' },
  { id:'peacock',     label:'Indian Peacock',    img:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Indian_Peacock_DSC_0612.jpg/1280px-Indian_Peacock_DSC_0612.jpg' },
  { id:'gharial',     label:'Gharial',           img:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Female_gharial_%28Gavialis_gangeticus%29.jpg/1280px-Female_gharial_%28Gavialis_gangeticus%29.jpg' },
  { id:'kingcobra',   label:'King Cobra',        img:'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Ophiophagus_hannah_in_Kaeng_Krachan.jpg/1280px-Ophiophagus_hannah_in_Kaeng_Krachan.jpg' },
];

let heroIdx = 0;
let heroAuto;

function heroSlide(dir) {
  heroIdx = (heroIdx + dir + HERO_SLIDES.length) % HERO_SLIDES.length;
  updateHeroSlide();
  resetHeroAuto();
}

function updateHeroSlide() {
  const slide = HERO_SLIDES[heroIdx];
  const img = document.getElementById('heroAnimalImg');
  const count = document.getElementById('slideCount');
  const label = document.getElementById('slideLabel');
  if (img) {
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = slide.img;
      img.alt = slide.label;
      img.style.opacity = '1';
    }, 300);
  }
  if (count) count.textContent = String(heroIdx + 1).padStart(2,'0') + ' / ' + String(HERO_SLIDES.length).padStart(2,'0');
  if (label) label.textContent = slide.label;
}

function resetHeroAuto() {
  clearInterval(heroAuto);
  heroAuto = setInterval(() => heroSlide(1), 5000);
}

// ── WIKIPEDIA PHOTO CACHE ─────────────────────────────
const wikiCache = {};

async function fetchSummary(term) {
  const slug = encodeURIComponent(term.replace(/ /g, '_'));
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('not found');
  return r.json();
}

function extractPhoto(d) {
  if (d.thumbnail?.source) return d.thumbnail.source.replace(/\/\d+px-/, '/500px-');
  if (d.originalimage?.source) return d.originalimage.source;
  return null;
}

// 3-step fallback: full sci → genus+species → common name
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
    `<span class="t-item"><span style="color:var(--green-d);margin-right:.42rem">◆</span>${f}</span>`).join('');
  track.innerHTML = items;
}

// ── STATUS LABELS ─────────────────────────────────────
const STATUS_NAMES = {
  LC:'Least Concern', NT:'Near Threatened', VU:'Vulnerable',
  EN:'Endangered', CR:'Critically Endangered', DD:'Data Deficient', NE:'Not Evaluated'
};

// ── CARD — photo top, text below, zero overlay ─────────
function makeCard(name, sci, status, cat, photo, icon, id, isWiki) {
  const onclick = isWiki
    ? `openWikiSpecies('${esc(name)}','${esc(sci)}','${esc(cat)}','${status}','${icon||'🐾'}')`
    : `openSpecies('${id}')`;

  return `<div class="sp-card" onclick="${onclick}">
    <div class="sp-photo">
      ${photo ? `<img class="sp-img" src="${photo}" alt="${esc(name)}" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
      <div class="sp-no-photo"${photo ? ' style="display:none"' : ''}>${icon||'🐾'}</div>
      <span class="sp-status b${status}">${STATUS_NAMES[status]||status}</span>
    </div>
    <div class="sp-info">
      <div class="sp-name">${name}</div>
      <div class="sp-sci">${sci}</div>
    </div>
  </div>`;
}

function esc(s) { return (s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function slugify(s) { return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

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
  else if (filter !== 'all')   featured = featured.filter(s => s.category === filter);
  grid.innerHTML = featured.map(s => makeCard(s.name,s.sci,s.status,s.category,s.photo,s.icon,s.id,false)).join('');

  const wikiItems = getWikiFiltered(filter);
  const firstBatch = wikiItems.slice(0, WIKI_PAGE);
  wikiOffset = firstBatch.length;

  const skelIds = firstBatch.map((_,i) => `sk-${Date.now()}-${i}`);
  skelIds.forEach(sid => {
    const d = document.createElement('div');
    d.id = sid; d.className = 'sp-skel';
    grid.appendChild(d);
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
    const d = document.createElement('div');
    d.id = sid; d.className = 'sp-skel';
    grid.appendChild(d);
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

// ── A–Z ───────────────────────────────────────────────
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
        ? `openSpecies('${it.id}')`
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
      <div class="sug-item" onclick="openSpecies('${s.id}');document.getElementById('${boxId}').classList.remove('show')">
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
  }, 220);
}

document.addEventListener('click', e => {
  if (!e.target.closest('.hdr-search') && !e.target.closest('.hero-search-wrap'))
    document.querySelectorAll('.sug-box').forEach(b => b.classList.remove('show'));
});

// ── CATEGORY PAGE ─────────────────────────────────────
let catPageFilter = 'mammals';
let catOffset = 0;

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
  window.scrollTo({ top:0, behavior:'instant' });
}
function openModal()  { document.getElementById('modal').classList.add('show'); }
function closeModal() { document.getElementById('modal').classList.remove('show'); }
function modalSub() {
  const b = document.getElementById('mBtn');
  b.textContent = '✓ Subscribed! Welcome.';
  b.style.background = '#5bc672';
  setTimeout(closeModal, 1800);
}
function nlSub() {
  const el = document.getElementById('nlEmail');
  if (!el?.value.includes('@')) { if(el) el.style.borderColor='var(--rose)'; return; }
  el.value = ''; el.placeholder = '✓ Subscribed — thank you!';
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

  // Hero slider — auto-advance every 5s
  resetHeroAuto();

  // Hero search
  document.querySelector('.hero-sb')?.addEventListener('click', () => {
    const v = document.getElementById('heroQ')?.value;
    if (v) doSearch(v, 'heroSug');
  });
  document.getElementById('heroQ')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch(e.target.value, 'heroSug');
  });
  document.getElementById('heroQ')?.addEventListener('focus', e => {
    if (e.target.value.length > 1) document.getElementById('heroSug')?.classList.add('show');
  });
  document.getElementById('heroQ')?.addEventListener('blur', () => {
    setTimeout(() => document.getElementById('heroSug')?.classList.remove('show'), 220);
  });
});
