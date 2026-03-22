// ═══════════════════════════════════════════════════════
// ROOTS & ROARS — Main Application v5.1
// Key fix: Wikipedia photos pre-fetched before cards render
// ═══════════════════════════════════════════════════════

// ── CURSOR ──────────────────────────────────────────
const cur = document.getElementById('cur');
const curR = document.getElementById('curRing');
const curL = document.getElementById('curLabel');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cur.style.left = mx + 'px'; cur.style.top = my + 'px';
  const lbl = document.elementFromPoint(mx, my)?.closest('[data-cursor]')?.dataset.cursor;
  if (lbl) { curL.textContent = lbl; curL.classList.add('show'); } else { curL.classList.remove('show'); }
  curL.style.left = mx + 'px'; curL.style.top = my + 'px';
});
(function animCursor() {
  rx += (mx - rx) * .12; ry += (my - ry) * .12;
  curR.style.left = rx + 'px'; curR.style.top = ry + 'px';
  requestAnimationFrame(animCursor);
})();
document.addEventListener('mousedown', () => cur.style.transform = 'translate(-50%,-50%) scale(1.8)');
document.addEventListener('mouseup',   () => cur.style.transform = 'translate(-50%,-50%) scale(1)');

// ── HEADER SCROLL ────────────────────────────────────
const hdr = document.getElementById('hdr');
window.addEventListener('scroll', () => {
  hdr.classList.toggle('solid', window.scrollY > 50);
  const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  document.getElementById('prog').style.width = Math.min(pct, 100) + '%';
}, { passive: true });

// ── SCROLL REVEAL ────────────────────────────────────
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
}, { threshold: 0.05 });
document.querySelectorAll('.rv').forEach(el => io.observe(el));

document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

// ── WIKIPEDIA PHOTO CACHE ─────────────────────────────
const wikiCache = {};

async function getWikiData(term) {
  const key = term.toLowerCase();
  if (wikiCache[key] !== undefined) return wikiCache[key];
  try {
    const slug = encodeURIComponent(term.replace(/ /g, '_'));
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
      signal: AbortSignal.timeout(7000)
    });
    if (!r.ok) throw new Error('not found');
    const d = await r.json();
    let photo = null;
    if (d.thumbnail?.source) {
      photo = d.thumbnail.source.replace(/\/\d+px-/, '/500px-');
    } else if (d.originalimage?.source) {
      photo = d.originalimage.source;
    }
    const result = {
      photo,
      extract: d.extract ? d.extract.substring(0, 600) : '',
      url: d.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${slug}`
    };
    wikiCache[key] = result;
    return result;
  } catch {
    wikiCache[key] = null;
    return null;
  }
}

async function prefetchBatch(items) {
  await Promise.allSettled(items.map(ws => getWikiData(ws.sci || ws.name)));
}

// ── MOSAIC ────────────────────────────────────────────
function buildMosaic() {
  const grid = document.getElementById('mosaic');
  if (!grid) return;
  grid.innerHTML = MOSAIC.map(m => {
    const s = SPECIES[m.id];
    if (!s) return '';
    return `<div class="mc ${m.span}" onclick="openSpecies('${s.id}')" data-cursor="View">
      <img src="${s.photo}" alt="${s.name}" loading="lazy" onerror="this.style.opacity='0'">
      <div class="mc-lbl">
        <div class="mc-name">${s.name}</div>
        <span class="mc-badge b${s.status}">${s.status}</span>
      </div>
    </div>`;
  }).join('');
}

// ── TICKER ────────────────────────────────────────────
function buildTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const items = [...TICKER_FACTS, ...TICKER_FACTS].map(f =>
    `<span class="t-item"><span style="color:var(--green-d);margin-right:.5rem">◆</span>${f}</span>`).join('');
  track.innerHTML = items;
}

// ── STATUS ────────────────────────────────────────────
const STATUS_NAMES = {
  LC:'Least Concern', NT:'Near Threatened', VU:'Vulnerable',
  EN:'Endangered', CR:'Critically Endangered', DD:'Data Deficient', NE:'Not Evaluated'
};

function statusBadge(code) {
  return `<span class="sp-status b${code}">${STATUS_NAMES[code] || code}</span>`;
}

// ── CARD BUILDER ──────────────────────────────────────
function makeCard(name, sci, status, cat, photo, icon, id, isWiki) {
  const onclick = isWiki
    ? `openWikiSpecies('${esc(name)}','${esc(sci)}','${esc(cat)}','${status}','${icon || '🐾'}')`
    : `openSpecies('${id}')`;

  return `<div class="sp-card" onclick="${onclick}" data-cursor="Explore">
    ${photo
      ? `<img class="sp-img" src="${photo}" alt="${esc(name)}" loading="lazy" onerror="this.parentNode.classList.add('no-photo');this.style.display='none'">`
      : `<div class="sp-no-photo">${icon || '🐾'}</div>`
    }
    <div class="sp-body">
      ${statusBadge(status)}
      <div class="sp-name">${name}</div>
      <div class="sp-sci">${sci}</div>
      <div class="sp-cta">View Profile →</div>
    </div>
  </div>`;
}

function esc(s) { return (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
function slugify(s) { return (s||'').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

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
  currentFilter = filter;
  wikiOffset = 0;
  const grid = document.getElementById('speciesGrid');
  if (!grid) return;

  // Deep profiles — photos already in data.js, render immediately
  let featured = Object.values(SPECIES);
  if (filter === 'endangered') featured = featured.filter(s => ['EN','CR','VU'].includes(s.status));
  else if (filter !== 'all')   featured = featured.filter(s => s.category === filter);
  grid.innerHTML = featured.map(s => makeCard(s.name, s.sci, s.status, s.category, s.photo, s.icon, s.id, false)).join('');

  // Wiki species — skeletons first, then photos load
  const wikiItems = getWikiFiltered(filter);
  const firstBatch = wikiItems.slice(0, WIKI_PAGE);
  wikiOffset = firstBatch.length;

  // Place skeletons
  const skelIds = firstBatch.map((_, i) => `sk-${Date.now()}-${i}`);
  skelIds.forEach(sid => {
    const d = document.createElement('div');
    d.id = sid; d.className = 'sp-skel';
    grid.appendChild(d);
  });

  // Fetch all photos in parallel, then swap in real cards
  await prefetchBatch(firstBatch);
  firstBatch.forEach((ws, i) => {
    const cached = wikiCache[(ws.sci || ws.name).toLowerCase()];
    const el = document.getElementById(skelIds[i]);
    if (el) el.outerHTML = makeCard(ws.name, ws.sci, ws.status, ws.cat, cached?.photo || null, ws.icon || '🐾', slugify(ws.name), true);
  });

  // Load more button
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

  const skelIds = batch.map((_, i) => `sk-m-${Date.now()}-${i}`);
  skelIds.forEach(sid => {
    const d = document.createElement('div');
    d.id = sid; d.className = 'sp-skel';
    grid.appendChild(d);
  });

  await prefetchBatch(batch);
  batch.forEach((ws, i) => {
    const cached = wikiCache[(ws.sci || ws.name).toLowerCase()];
    const el = document.getElementById(skelIds[i]);
    if (el) el.outerHTML = makeCard(ws.name, ws.sci, ws.status, ws.cat, cached?.photo || null, ws.icon || '🐾', slugify(ws.name), true);
  });

  const wrap = document.getElementById('loadMoreWrap');
  if (btn)  { btn.disabled = false; btn.textContent = 'Load more species →'; }
  if (wrap) wrap.style.display = wikiOffset < wikiItems.length ? 'block' : 'none';
}

// ── FILTER TABS ───────────────────────────────────────
function setFilter(cat, btn) {
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  buildSpeciesGrid(cat);
}

// ── CATEGORY SECTION GRID ─────────────────────────────
function buildCatGrid() {
  const grid = document.getElementById('catGrid');
  if (!grid) return;
  grid.innerHTML = CAT_SECTIONS.map(c => `
    <div class="cat-card" onclick="showCatPage('${c.cat}')" data-cursor="Browse">
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
    `<button class="az-btn" id="az-${l}" onclick="showAZ('${l}',this)">${l}</button>`
  ).join('');
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
        <div class="sug-thumb">${s.photo ? `<img src="${s.photo}" alt="">` : s.icon}</div>
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
        const [, titles] = await r.json();
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
    mammals: ['Mammals of India', '500+ documented mammal species'],
    birds:   ['Birds of India',   '1,300+ resident and migratory bird species'],
    reptiles:['Reptiles of India','460+ species including crocodilians, snakes and turtles'],
    trees:   ['Trees of India',   '1,200+ native and naturalised tree species'],
  };
  const [title, sub] = titles[cat] || [cat, ''];
  document.getElementById('catPageTitle').textContent = title;
  document.getElementById('catPageSub').textContent = sub;

  const grid = document.getElementById('catGrid2');
  grid.innerHTML = '';

  Object.values(SPECIES).filter(s => s.category === cat).forEach(s => {
    grid.insertAdjacentHTML('beforeend', makeCard(s.name, s.sci, s.status, s.category, s.photo, s.icon, s.id, false));
  });

  const wikiItems = WIKI_SPECIES.filter(w => w.cat === cat);
  const firstBatch = wikiItems.slice(0, WIKI_PAGE);
  catOffset = firstBatch.length;

  const skelIds = firstBatch.map((_, i) => `csk-${Date.now()}-${i}`);
  skelIds.forEach(sid => {
    const d = document.createElement('div'); d.id = sid; d.className = 'sp-skel'; grid.appendChild(d);
  });

  await prefetchBatch(firstBatch);
  firstBatch.forEach((ws, i) => {
    const cached = wikiCache[(ws.sci||ws.name).toLowerCase()];
    const el = document.getElementById(skelIds[i]);
    if (el) el.outerHTML = makeCard(ws.name, ws.sci, ws.status, ws.cat, cached?.photo||null, ws.icon||'🐾', slugify(ws.name), true);
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

  const skelIds = batch.map((_, i) => `csk-m-${Date.now()}-${i}`);
  skelIds.forEach(sid => {
    const d = document.createElement('div'); d.id = sid; d.className = 'sp-skel'; grid.appendChild(d);
  });

  await prefetchBatch(batch);
  batch.forEach((ws, i) => {
    const cached = wikiCache[(ws.sci||ws.name).toLowerCase()];
    const el = document.getElementById(skelIds[i]);
    if (el) el.outerHTML = makeCard(ws.name, ws.sci, ws.status, ws.cat, cached?.photo||null, ws.icon||'🐾', slugify(ws.name), true);
  });

  const lm = document.getElementById('catLoadMore');
  if (btn)  { btn.disabled = false; btn.textContent = `Load more ${cat} →`; }
  if (lm) lm.style.display = catOffset < wikiItems.length ? 'block' : 'none';
}

// ── VIEW MANAGER ──────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name)?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ── MODAL ─────────────────────────────────────────────
function openModal()  { document.getElementById('modal').classList.add('show'); }
function closeModal() { document.getElementById('modal').classList.remove('show'); }
function modalSub() {
  const b = document.getElementById('mBtn');
  b.textContent = '✓ Subscribed! Welcome to Roots & Roars';
  b.style.background = 'var(--green-l)';
  setTimeout(closeModal, 1800);
}
function nlSub() {
  const el = document.getElementById('nlEmail');
  if (!el?.value.includes('@')) { if(el) el.style.borderColor = 'var(--rose)'; return; }
  el.value = ''; el.placeholder = '✓ Subscribed — thank you!';
}
function toggleMode() {
  const b = document.getElementById('modeBtn');
  b.textContent = b.textContent === '☀️' ? '🌙' : '☀️';
}

// ── URL DEEP LINK ──────────────────────────────────────
function handleURLParams() {
  const sp = new URLSearchParams(window.location.search).get('species');
  if (sp) setTimeout(() => openSpecies(sp), 600);
}

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildMosaic();
  buildTicker();
  buildSpeciesGrid('all');
  buildCatGrid();
  buildAZGrid();
  handleURLParams();

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
