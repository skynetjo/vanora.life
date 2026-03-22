// ═══════════════════════════════════════════════════════
// ROOTS & ROARS — Main Application
// Wikipedia API integration for automatic photo + data loading
// ═══════════════════════════════════════════════════════

// ── CURSOR ───────────────────────────────────────────
const cur = document.getElementById('cur');
const curR = document.getElementById('curRing');
const curL = document.getElementById('curLabel');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cur.style.left = mx + 'px'; cur.style.top = my + 'px';
  // Label
  const el = document.elementFromPoint(mx, my);
  const lbl = el?.closest('[data-cursor]')?.dataset.cursor;
  if (lbl) { curL.textContent = lbl; curL.classList.add('show'); } else { curL.classList.remove('show'); }
  curL.style.left = mx + 'px'; curL.style.top = my + 'px';
});
(function animCursor() {
  rx += (mx - rx) * .12; ry += (my - ry) * .12;
  curR.style.left = rx + 'px'; curR.style.top = ry + 'px';
  requestAnimationFrame(animCursor);
})();
document.addEventListener('mousedown', () => { cur.style.transform = 'translate(-50%,-50%) scale(1.8)'; });
document.addEventListener('mouseup', () => { cur.style.transform = 'translate(-50%,-50%) scale(1)'; });

// ── HEADER ───────────────────────────────────────────
const hdr = document.getElementById('hdr');
window.addEventListener('scroll', () => {
  hdr.classList.toggle('solid', window.scrollY > 50);
  const prog = document.getElementById('prog');
  const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  prog.style.width = Math.min(pct, 100) + '%';
});

// ── REVEAL ───────────────────────────────────────────
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
}, { threshold: 0.06 });
document.querySelectorAll('.rv').forEach(el => io.observe(el));

// ESC closes panel
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

// ── WIKIPEDIA PHOTO CACHE ─────────────────────────────
const wikiPhotoCache = {};

async function fetchWikiPhoto(searchTerm) {
  if (wikiPhotoCache[searchTerm]) return wikiPhotoCache[searchTerm];
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm.replace(/ /g,'_'))}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const photo = data.thumbnail?.source?.replace(/\/\d+px-/, '/400px-') || null;
    wikiPhotoCache[searchTerm] = { photo, extract: data.extract?.substring(0,200) || '' };
    return wikiPhotoCache[searchTerm];
  } catch(e) { return null; }
}

// ── BUILD MOSAIC ──────────────────────────────────────
function buildMosaic() {
  const grid = document.getElementById('mosaic');
  if (!grid) return;
  grid.innerHTML = MOSAIC.map(m => {
    const s = SPECIES[m.id];
    if (!s) return '';
    return `<div class="mc ${m.span}" onclick="openSpecies('${s.id}')" data-cursor="View">
      ${s.photo ? `<img src="${s.photo}" alt="${s.name}" loading="lazy" onerror="this.style.display='none'">` : ''}
      <div class="mc-lbl">
        <div class="mc-name">${s.name}</div>
        <span class="mc-badge b${s.status}">${s.status}</span>
      </div>
    </div>`;
  }).join('');
}

// ── BUILD TICKER ──────────────────────────────────────
function buildTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const items = [...TICKER_FACTS, ...TICKER_FACTS].map(f =>
    `<span class="t-item"><span class="t-sep">◆</span>${f}</span>`).join('');
  track.innerHTML = items;
}

// ── STATUS BADGE HTML ─────────────────────────────────
function statusBadge(code) {
  const labels = { LC:'LC', NT:'Near Threatened', VU:'Vulnerable', EN:'Endangered', CR:'Critically Endangered', DD:'DD', NE:'NE' };
  return `<span class="sp-status b${code}">${labels[code] || code}</span>`;
}

// ── BUILD SPECIES GRID ────────────────────────────────
let currentFilter = 'all';
let wikiOffset = 0;
const WIKI_PAGE_SIZE = 16;

function buildSpeciesGrid(filter) {
  currentFilter = filter;
  wikiOffset = 0;
  const grid = document.getElementById('speciesGrid');
  if (!grid) return;

  // Featured deep profiles
  let featured = Object.values(SPECIES);
  if (filter === 'endangered') {
    featured = featured.filter(s => ['EN','CR','VU'].includes(s.status));
  } else if (filter !== 'all') {
    featured = featured.filter(s => s.category === filter);
  }

  // Render featured with real photos
  grid.innerHTML = featured.map(s => makeCard(s.name, s.sci, s.status, s.category, s.photo, s.icon, s.id, false)).join('');

  // Add Wikipedia species as skeleton cards, then load photos
  const wikiFiltered = getWikiFiltered(filter);
  wikiOffset = Math.min(WIKI_PAGE_SIZE, wikiFiltered.length);

  wikiFiltered.slice(0, WIKI_PAGE_SIZE).forEach((ws, i) => {
    const skId = `skel-${i}`;
    const div = document.createElement('div');
    div.id = skId;
    div.className = 'sp-skel';
    grid.appendChild(div);

    // Load photo async
    loadWikiCard(ws, skId);
  });

  const loadBtn = document.getElementById('loadMoreBtn');
  const loadWrap = document.getElementById('loadMoreWrap');
  if (loadBtn && loadWrap) {
    if (wikiOffset < wikiFiltered.length) {
      loadWrap.style.display = 'block';
      loadBtn.disabled = false;
      loadBtn.textContent = `📡 Load ${Math.min(WIKI_PAGE_SIZE, wikiFiltered.length - wikiOffset)} more species →`;
    } else {
      loadWrap.style.display = 'none';
    }
  }
}

function getWikiFiltered(filter) {
  if (filter === 'all') return WIKI_SPECIES;
  if (filter === 'endangered') return WIKI_SPECIES.filter(w => ['EN','CR','VU'].includes(w.status));
  return WIKI_SPECIES.filter(w => w.cat === filter);
}

async function loadWikiCard(ws, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const data = await fetchWikiPhoto(ws.sci || ws.name);
  const photo = data?.photo || null;
  const html = makeCard(ws.name, ws.sci, ws.status, ws.cat, photo, ws.icon || '🐾', slugify(ws.name), true);
  container.outerHTML = html;
  // Store in cache for onclick
  ws._wikiLoaded = true;
}

function loadWikiSpecies() {
  const grid = document.getElementById('speciesGrid');
  if (!grid) return;
  const wikiFiltered = getWikiFiltered(currentFilter);
  const nextBatch = wikiFiltered.slice(wikiOffset, wikiOffset + WIKI_PAGE_SIZE);
  wikiOffset += nextBatch.length;

  const btn = document.getElementById('loadMoreBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }

  nextBatch.forEach((ws, i) => {
    const skId = `skel-more-${Date.now()}-${i}`;
    const div = document.createElement('div');
    div.id = skId;
    div.className = 'sp-skel';
    grid.appendChild(div);
    loadWikiCard(ws, skId);
  });

  setTimeout(() => {
    const loadWrap = document.getElementById('loadMoreWrap');
    const btn2 = document.getElementById('loadMoreBtn');
    if (wikiOffset < wikiFiltered.length) {
      if (btn2) { btn2.disabled = false; btn2.textContent = `📡 Load ${Math.min(WIKI_PAGE_SIZE, wikiFiltered.length - wikiOffset)} more species →`; }
    } else {
      if (loadWrap) loadWrap.style.display = 'none';
    }
  }, 2000);
}

function makeCard(name, sci, status, cat, photo, icon, id, isWiki) {
  const onclick = isWiki
    ? `openWikiSpecies('${esc(name)}','${esc(sci)}','${esc(cat)}','${status}','${icon}')`
    : `openSpecies('${id}')`;
  return `<div class="sp-card" onclick="${onclick}" data-cursor="Explore">
    ${photo
      ? `<img class="sp-img" src="${photo}" alt="${esc(name)}" loading="lazy" onerror="this.nextElementSibling.style.display='flex';this.style.display='none'">`
      : ''}
    <div class="sp-emoji" style="${photo ? 'display:none' : ''}">${icon}</div>
    ${isWiki ? '<div class="sp-w-badge">W</div>' : ''}
    <div class="sp-body">
      ${statusBadge(status)}
      <div class="sp-name">${name}</div>
      <div class="sp-sci">${sci}</div>
      <div class="sp-cta">${isWiki ? 'Wikipedia' : 'Full Profile'} →</div>
    </div>
  </div>`;
}

function esc(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ── FILTER TABS ───────────────────────────────────────
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
    <div class="cat-card" onclick="showCatPage('${c.cat}')" data-cursor="Browse">
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
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  grid.innerHTML = letters.map(l =>
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
  if (!items.length) {
    results.innerHTML = `<div class="az-item"><div class="az-item-n">No entries yet for "${l}"</div></div>`;
  } else {
    results.innerHTML = items.map(it => `
      <button class="az-item" onclick="${it.id ? `openSpecies('${it.id}')` : `openWikiSpecies('${esc(it.n)}','${esc(it.sci || '')}','${it.cat?.toLowerCase() || 'wildlife'}','${it.status || 'LC'}','🐾')`}">
        <div class="az-item-n">${it.n}</div>
        <div class="az-item-s">${it.sci || ''}</div>
        <span class="az-item-t">${it.cat || ''}</span>
        ${!it.id ? `<span class="az-item-lnk">Wikipedia →</span>` : ''}
      </button>`).join('');
  }
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
    // Local matches (deep profiles)
    const local = Object.values(SPECIES).filter(s =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.sci.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 4);

    // Wiki species matches
    const wikiMatches = WIKI_SPECIES.filter(w =>
      w.name.toLowerCase().includes(query.toLowerCase()) ||
      (w.sci || '').toLowerCase().includes(query.toLowerCase())
    ).slice(0, 4);

    let html = '';
    local.forEach(s => {
      html += `<div class="sug-item" onclick="openSpecies('${s.id}');document.getElementById('${boxId}').classList.remove('show');">
        <div class="sug-thumb">${s.photo ? `<img src="${s.photo}" alt="">` : s.icon}</div>
        <div><div class="sug-name">${s.name}</div><div class="sug-sci">${s.sci}</div></div>
        <span class="sug-tag">Profile</span>
      </div>`;
    });
    wikiMatches.slice(0, 6 - local.length).forEach(w => {
      html += `<div class="sug-item sug-wiki" onclick="openWikiSpecies('${esc(w.name)}','${esc(w.sci)}','${w.cat}','${w.status}','${w.icon||'🐾'}');document.getElementById('${boxId}').classList.remove('show');">
        <div class="sug-thumb">${w.icon || '🐾'}</div>
        <div><div class="sug-name">${w.name}</div><div class="sug-sci">${w.sci}</div></div>
        <span class="sug-tag">W</span>
      </div>`;
    });

    // Also search Wikipedia API for unrecognized queries
    if (!html) {
      try {
        const res = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json&origin=*`);
        const [, titles, , urls] = await res.json();
        titles.slice(0,4).forEach((t, i) => {
          html += `<div class="sug-item sug-wiki" onclick="openWikiSpecies('${esc(t)}','','wildlife','LC','🐾');document.getElementById('${boxId}').classList.remove('show');">
            <div class="sug-thumb">🔍</div>
            <div><div class="sug-name">${t}</div><div class="sug-sci">From Wikipedia</div></div>
            <span class="sug-tag">Wiki</span>
          </div>`;
        });
      } catch(e) {}
    }

    if (!html) html = `<div class="sug-item"><div style="color:var(--ink3);font-size:.8rem;padding:.2rem 0;">No results found for "${query}"</div></div>`;
    box.innerHTML = html;
    box.classList.add('show');
  }, 200);
}

// Close search on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.hdr-search') && !e.target.closest('.hero-search-wrap')) {
    document.querySelectorAll('.sug-box').forEach(b => b.classList.remove('show'));
  }
});

// ── CATEGORY PAGE ──────────────────────────────────────
let catPageFilter = 'mammals';
let catWikiOffset = 0;

function showCatPage(cat) {
  catPageFilter = cat;
  catWikiOffset = 0;
  showView('category');

  const titles = {
    mammals: ['Mammals of India', '500+ documented mammal species — from Bengal Tigers to Pangolins'],
    birds: ['Birds of India', '1,300+ resident and migratory bird species'],
    reptiles: ['Reptiles of India', '460+ species including crocodilians, snakes, lizards and turtles'],
    trees: ['Trees of India', '1,200+ native and naturalized tree species'],
  };
  const [title, sub] = titles[cat] || [cat, ''];
  document.getElementById('catPageTitle').textContent = title;
  document.getElementById('catPageSub').textContent = sub;

  const grid = document.getElementById('catGrid2');
  grid.innerHTML = '';

  // Featured deep profiles
  const featured = Object.values(SPECIES).filter(s => s.category === cat);
  featured.forEach(s => {
    grid.insertAdjacentHTML('beforeend', makeCard(s.name, s.sci, s.status, s.category, s.photo, s.icon, s.id, false));
  });

  // Wikipedia species for this category
  const wikiItems = WIKI_SPECIES.filter(w => w.cat === cat);
  catWikiOffset = Math.min(WIKI_PAGE_SIZE, wikiItems.length);

  wikiItems.slice(0, WIKI_PAGE_SIZE).forEach((ws, i) => {
    const skId = `cat-skel-${i}`;
    const div = document.createElement('div');
    div.id = skId; div.className = 'sp-skel';
    grid.appendChild(div);
    loadWikiCard(ws, skId);
  });

  const loadMore = document.getElementById('catLoadMore');
  const catBtn = document.getElementById('catLoadBtn');
  if (loadMore && catBtn) {
    if (catWikiOffset < wikiItems.length) {
      loadMore.style.display = 'block';
      catBtn.textContent = `Load ${Math.min(WIKI_PAGE_SIZE, wikiItems.length - catWikiOffset)} more ${cat} →`;
      catBtn.onclick = () => loadMoreCat(cat);
    } else {
      loadMore.style.display = 'none';
    }
  }
}

function loadMoreCat(cat) {
  const grid = document.getElementById('catGrid2');
  const wikiItems = WIKI_SPECIES.filter(w => w.cat === cat);
  const nextBatch = wikiItems.slice(catWikiOffset, catWikiOffset + WIKI_PAGE_SIZE);
  catWikiOffset += nextBatch.length;

  const btn = document.getElementById('catLoadBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }

  nextBatch.forEach((ws, i) => {
    const skId = `cat-more-${Date.now()}-${i}`;
    const div = document.createElement('div');
    div.id = skId; div.className = 'sp-skel';
    grid.appendChild(div);
    loadWikiCard(ws, skId);
  });

  setTimeout(() => {
    const btn2 = document.getElementById('catLoadBtn');
    const lm = document.getElementById('catLoadMore');
    if (catWikiOffset < wikiItems.length) {
      if (btn2) { btn2.disabled = false; btn2.textContent = `Load ${Math.min(WIKI_PAGE_SIZE, wikiItems.length - catWikiOffset)} more ${cat} →`; }
    } else {
      if (lm) lm.style.display = 'none';
    }
  }, 2000);
}

// ── VIEW MANAGER ──────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + name);
  if (el) el.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ── MODAL ─────────────────────────────────────────────
function openModal() { document.getElementById('modal').classList.add('show'); }
function closeModal() { document.getElementById('modal').classList.remove('show'); }
function modalSub() {
  const btn = document.getElementById('mBtn');
  btn.textContent = '✓ Subscribed! Welcome to Roots & Roars';
  btn.style.background = 'var(--green-l)';
  setTimeout(closeModal, 1800);
}
function nlSub() {
  const el = document.getElementById('nlEmail');
  if (!el.value.includes('@')) { el.style.borderColor = 'var(--rose)'; return; }
  el.value = ''; el.placeholder = '✓ Subscribed! Thank you.';
}
function toggleMode() {
  const btn = document.getElementById('modeBtn');
  btn.textContent = btn.textContent === '☀️' ? '🌙' : '☀️';
}

// ── URL PARAMS (deep linking) ──────────────────────────
function handleURLParams() {
  const params = new URLSearchParams(window.location.search);
  const sp = params.get('species');
  if (sp) setTimeout(() => openSpecies(sp), 500);
}

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildMosaic();
  buildTicker();
  buildSpeciesGrid('all');
  buildCatGrid();
  buildAZGrid();
  handleURLParams();

  // Hero search button
  const heroSb = document.querySelector('.hero-sb');
  if (heroSb) {
    heroSb.addEventListener('click', () => {
      const q = document.getElementById('heroQ')?.value;
      if (q) doSearch(q, 'heroSug');
    });
    document.getElementById('heroQ')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { doSearch(e.target.value, 'heroSug'); }
    });
    // Show suggestions on input
    document.getElementById('heroQ')?.addEventListener('focus', e => {
      if (e.target.value.length > 1) document.getElementById('heroSug')?.classList.add('show');
    });
    document.getElementById('heroQ')?.addEventListener('blur', () => {
      setTimeout(() => document.getElementById('heroSug')?.classList.remove('show'), 220);
    });
  }
});
