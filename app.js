// ═══════════════════════════════════════════════════════
// ROOTS & ROARS — Main Application
// ═══════════════════════════════════════════════════════

// ── Custom Cursor
const curDot = document.getElementById('curDot');
const curRing = document.getElementById('curRing');
const curText = document.getElementById('curText');

let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  curDot.style.left = mouseX + 'px';
  curDot.style.top = mouseY + 'px';
});

// Smooth ring follow
function animateRing() {
  ringX += (mouseX - ringX) * 0.12;
  ringY += (mouseY - ringY) * 0.12;
  curRing.style.left = ringX + 'px';
  curRing.style.top = ringY + 'px';
  curText.style.left = ringX + 'px';
  curText.style.top = ringY + 'px';
  requestAnimationFrame(animateRing);
}
animateRing();

document.addEventListener('click', () => {
  curDot.style.transform = 'translate(-50%,-50%) scale(2.5)';
  setTimeout(() => curDot.style.transform = 'translate(-50%,-50%) scale(1)', 180);
});

// Hoverable elements cursor
document.addEventListener('mouseover', e => {
  const el = e.target.closest('[data-cursor]');
  if (el) {
    curText.textContent = el.dataset.cursor;
    curText.classList.add('show');
    curRing.style.width = '48px';
    curRing.style.height = '48px';
  } else {
    curText.classList.remove('show');
    curRing.style.width = '28px';
    curRing.style.height = '28px';
  }
});

// ── Header scroll
const hdr = document.getElementById('hdr');
window.addEventListener('scroll', () => {
  hdr.classList.toggle('solid', window.scrollY > 60);
  // Progress bar
  const prog = document.getElementById('prog');
  const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  prog.style.width = Math.min(pct, 100) + '%';
});

// ── Dark/Light (already dark by default)
function toggleMode() {
  document.body.classList.toggle('light-mode');
  document.getElementById('modeBtn').textContent =
    document.body.classList.contains('light-mode') ? '🌙' : '☀️';
}

// ── Scroll reveal
const rvObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('on');
      rvObs.unobserve(e.target);
    }
  });
}, { threshold: 0.06 });
document.querySelectorAll('.rv').forEach(el => rvObs.observe(el));

// ── Build hero mosaic
function buildMosaic() {
  const mosaic = document.getElementById('heroMosaic');
  mosaic.innerHTML = MOSAIC_SPECIES.map(m => {
    const s = SPECIES[m.id];
    if (!s) return '';
    return `
      <div class="mosaic-cell ${m.span}" onclick="openSpecies('${s.id}')" data-cursor="Explore">
        <img class="mosaic-img" src="${s.photo}" alt="${s.name}"
             onerror="this.style.display='none';this.parentElement.querySelector('.mosaic-emoji').style.display='flex';">
        <div class="mosaic-emoji" style="display:none;font-size:5rem;align-items:center;justify-content:center;height:100%;background:${s.heroGrad};">${s.icon}</div>
        <div class="mosaic-label">
          <div class="mosaic-name">${s.name}</div>
          <span class="mosaic-status s-${s.status}">${s.statusLabel}</span>
        </div>
      </div>`;
  }).join('');
}
buildMosaic();

// ── Ticker
function buildTicker() {
  const track = document.getElementById('tickerTrack');
  const items = TICKER_FACTS.map(f =>
    `<div class="ticker-item"><span class="ticker-sep">◆</span> ${f} </div>`
  ).join('');
  track.innerHTML = items + items; // duplicate for seamless loop
}
buildTicker();

// ── Filter tabs and species grid
function buildSpeciesGrid(filter = 'all') {
  const grid = document.getElementById('speciesGrid');
  const allSpecies = Object.values(SPECIES);
  const filtered = filter === 'all' ? allSpecies
    : filter === 'endangered' ? allSpecies.filter(s => ['EN','CR','VU'].includes(s.status))
    : allSpecies.filter(s => s.category === filter);

  grid.innerHTML = filtered.map(s => `
    <div class="sp-card" onclick="openSpecies('${s.id}')" data-cursor="Explore">
      <img class="sp-img" src="${s.photo}" alt="${s.name}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
      <div class="sp-emoji-bg" style="display:none;background:${s.heroGrad};">${s.icon}</div>
      <div class="sp-card-body">
        <span class="sp-card-status s-${s.status}">${s.statusLabel}</span>
        <div class="sp-name">${s.name}</div>
        <div class="sp-sci">${s.sci}</div>
        <div class="sp-explore">Explore full profile →</div>
      </div>
    </div>`).join('');

  // Re-attach cursor data
  grid.querySelectorAll('[data-cursor]').forEach(el => {
    // handled via event delegation above
  });
}
buildSpeciesGrid();

function setFilter(cat, btn) {
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  buildSpeciesGrid(cat);
}

// ── Collections
function buildCollections() {
  const grid = document.getElementById('collGrid');
  grid.innerHTML = COLLECTIONS.map((c, i) => `
    <div class="coll-card" onclick="filterByCat('${c.cat}')" data-cursor="View all">
      <div class="coll-bg">
        <img class="coll-img" src="${c.photo}" alt="${c.name}"
             onerror="this.style.display='none';">
      </div>
      <div class="coll-arrow">→</div>
      <div class="coll-body">
        <div class="coll-count">${c.count}</div>
        <div class="coll-name">${c.name}</div>
      </div>
    </div>`).join('');
}
buildCollections();

function filterByCat(cat) {
  // Scroll to grid and filter
  document.getElementById('gridSection').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    const tabs = document.querySelectorAll('.ftab');
    tabs.forEach(t => {
      if (t.dataset.cat === cat) {
        t.classList.add('active');
        setFilter(cat, t);
      } else {
        t.classList.remove('active');
      }
    });
  }, 600);
}

// ── A-Z Browse
function buildAZGrid() {
  const grid = document.getElementById('azGrid');
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'az-btn';
    btn.textContent = l;
    btn.onclick = () => showAZ(l, btn);
    grid.appendChild(btn);
  });
}
buildAZGrid();

function showAZ(l, btn) {
  document.querySelectorAll('.az-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const data = AZ_DATA[l] || [];
  const results = document.getElementById('azResults');
  results.style.display = 'grid';
  results.innerHTML = data.length
    ? data.map(d => `
        <button class="az-item" onclick="${d.id ? `openSpecies('${d.id}')` : ''}" style="${d.id ? '' : 'cursor:default;'}">
          <div class="az-item-name">${d.n}</div>
          <div class="az-item-sci">${d.sci}</div>
          <div class="az-item-tag">${d.cat}</div>
          ${d.id ? '<div class="az-item-link">View full profile →</div>' : ''}
        </button>`).join('')
    : '<div style="padding:2rem;color:var(--ink3);font-size:0.88rem;">More species coming soon for this letter.</div>';
}

// ── Search
function handleSearch(query, targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  if (!query || query.length < 2) { target.classList.remove('show'); return; }

  const q = query.toLowerCase();
  const results = Object.values(SPECIES).filter(s =>
    s.name.toLowerCase().includes(q) || s.sci.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
  );

  if (!results.length) {
    target.innerHTML = '<div class="suggest-item" style="padding:1rem;color:var(--ink3);font-size:0.85rem;">No species found — try another name</div>';
    target.classList.add('show');
    return;
  }

  target.innerHTML = results.slice(0, 6).map(s => `
    <div class="suggest-item" onclick="openSpecies('${s.id}');document.getElementById('${targetId}').classList.remove('show');">
      <div class="si-thumb" style="background:${s.heroGrad};">${s.icon}</div>
      <div>
        <div class="si-name">${s.name}</div>
        <div class="si-sci">${s.sci}</div>
      </div>
      <div class="si-tag">${s.category}</div>
    </div>`).join('');
  target.classList.add('show');
}

// Close search on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.hdr-search') && !e.target.closest('.hero-search-wrap')) {
    document.getElementById('hdrSuggest')?.classList.remove('show');
    document.getElementById('heroSuggest')?.classList.remove('show');
  }
  // Close panel on overlay click
  if (e.target === document.getElementById('panelOverlay')) {
    closePanel();
  }
});

// Keyboard: ESC closes panel
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePanel();
});

// ── Modal
function openModal() {
  document.getElementById('modal').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modal').classList.remove('show');
  document.body.style.overflow = '';
}
function modalSub() {
  const btn = document.getElementById('mBtn');
  btn.textContent = '✓ Welcome aboard!';
  btn.style.background = '#3d7a4f';
  setTimeout(() => {
    closeModal();
    btn.textContent = "Subscribe — It's Free";
    btn.style.background = '';
  }, 2000);
}
function nlSub() {
  const e = document.getElementById('nlEmail');
  const b = document.querySelector('.nl-btn');
  if (!e.value.includes('@')) { e.style.border = '1px solid #c0453a'; return; }
  b.textContent = '✓ Subscribed!';
  b.style.background = '#2d6a3f';
  setTimeout(() => { b.textContent = 'Subscribe Free'; b.style.background = ''; e.value = ''; }, 3000);
}

// Close modal on bg click
document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ── Category view
const catMeta = {
  mammals: { title: 'Mammals of India', sub: '500+ documented species from tigers to pangolins' },
  birds: { title: 'Birds of India', sub: '1,300+ resident and migratory species' },
  reptiles: { title: 'Reptiles of India', sub: '460+ species including crocodilians, snakes and lizards' },
  trees: { title: 'Trees of India', sub: '1,200+ native and naturalised tree species' },
  insects: { title: 'Insects & Butterflies of India', sub: 'Over 1,600 documented species' },
};

function showCategoryView(cat) {
  const info = catMeta[cat] || { title: 'Species', sub: '' };
  document.getElementById('catViewTitle').textContent = info.title;
  document.getElementById('catViewSub').textContent = info.sub;

  const filtered = Object.values(SPECIES).filter(s => s.category === cat);
  document.getElementById('catSpeciesGrid').innerHTML = filtered.map(s => `
    <div class="sp-card" onclick="openSpecies('${s.id}')" data-cursor="Explore">
      <img class="sp-img" src="${s.photo}" alt="${s.name}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
      <div class="sp-emoji-bg" style="display:none;background:${s.heroGrad};">${s.icon}</div>
      <div class="sp-card-body">
        <span class="sp-card-status s-${s.status}">${s.statusLabel}</span>
        <div class="sp-name">${s.name}</div>
        <div class="sp-sci">${s.sci}</div>
        <div class="sp-explore">Explore full profile →</div>
      </div>
    </div>`).join('') || '<p style="color:var(--ink3);padding:2rem;">More species coming soon!</p>';

  showView('category');
}

// ── View manager
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  window.scrollTo(0, 0);
}
