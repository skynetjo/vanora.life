// ═══════════════════════════════════════════════════════
// ROOTS & ROARS — Species Detail Panel
// Slide-in panel with full species profile
// ═══════════════════════════════════════════════════════

const IUCN_CATS = ['NE','DD','LC','NT','VU','EN','CR','EW','EX'];
const IUCN_LABELS = {
  NE:'Not Evaluated', DD:'Data Deficient', LC:'Least Concern', NT:'Near Threatened',
  VU:'Vulnerable', EN:'Endangered', CR:'Critically Endangered', EW:'Extinct in Wild', EX:'Extinct'
};

let panelHistory = [];
let currentSpeciesId = null;

function openSpecies(id) {
  const s = SPECIES[id];
  if (!s) return;

  // Track history for prev/next nav
  if (currentSpeciesId && currentSpeciesId !== id) {
    panelHistory.push(currentSpeciesId);
  }
  currentSpeciesId = id;

  stopAllSounds();
  renderPanel(s);

  // Open overlay & panel
  document.getElementById('panelOverlay').classList.add('open');
  document.getElementById('speciesPanel').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Animate diet bars after a delay
  setTimeout(() => {
    document.querySelectorAll('.diet-fill').forEach(el => {
      el.style.width = el.dataset.pct + '%';
    });
  }, 400);
}

function closePanel() {
  stopAllSounds();
  document.getElementById('panelOverlay').classList.remove('open');
  document.getElementById('speciesPanel').classList.remove('open');
  document.body.style.overflow = '';
  currentSpeciesId = null;
  panelHistory = [];
}

function renderPanel(s) {
  const panel = document.getElementById('speciesPanel');

  const iucnCircles = IUCN_CATS.map(c =>
    `<div class="iucn-c ic-${c}${c === s.iucn ? ' act' : ''}" title="${IUCN_LABELS[c]}">${c}</div>`
  ).join('');

  const statsHTML = s.stats.map(st =>
    `<div class="pstat">
      <div class="pstat-lbl">${st.l}</div>
      <div class="pstat-val">${st.v} <span class="pstat-unit">${st.u}</span></div>
    </div>`
  ).join('');

  const dietHTML = s.diet.map(d =>
    `<div class="diet-row">
      <div class="diet-lbl">${d.label}</div>
      <div class="diet-track"><div class="diet-fill" style="background:${d.color};" data-pct="${d.pct}"></div></div>
      <div class="diet-pct">${d.pct}%</div>
    </div>`
  ).join('');

  const matingHTML = s.mating.map(m =>
    `<div class="mating-item">
      <div class="mating-lbl">${m.l}</div>
      <div class="mating-val">${m.v}</div>
    </div>`
  ).join('');

  const funFactsHTML = s.funFacts.map(f =>
    `<div class="ff-card">
      <div class="ff-icon">${f.icon}</div>
      <p class="ff-text">${f.text}</p>
    </div>`
  ).join('');

  const attrsHTML = s.attrs.map(a =>
    `<span class="attr-chip" style="background:${a.cls}22;border-color:${a.cls}44;color:${a.cls}cc;">${a.lbl}</span>`
  ).join('');

  const taxHTML = Object.entries(s.taxonomy).map(([k, v]) =>
    `<div class="taxon-row">
      <span class="taxon-key">${k}</span>
      <span class="taxon-val${k === 'Species' ? ' plain' : ''}">${v}</span>
    </div>`
  ).join('');

  const relatedHTML = (s.related || [])
    .filter(rid => SPECIES[rid])
    .map(rid => {
      const r = SPECIES[rid];
      return `<div class="rel-card" onclick="openSpecies('${rid}')">
        <div class="rel-icon">${r.icon}</div>
        <div>
          <div class="rel-name">${r.name}</div>
          <div class="rel-sci">${r.sci}</div>
        </div>
      </div>`;
    }).join('');

  const threatsHTML = (s.threats || []).map(t =>
    `<div class="threat-item">⚠️ ${t}</div>`
  ).join('');

  const rangeHTML = (s.range || []).map(r =>
    `<span class="range-tag">${r}</span>`
  ).join('');

  const trendCls = s.popTrend === 'Decreasing' ? 'trend-dec' : s.popTrend === 'Increasing' ? 'trend-inc' : 'trend-sta';
  const trendIcon = s.popTrend === 'Decreasing' ? '↘' : s.popTrend === 'Increasing' ? '↗' : '→';

  const hasPrev = panelHistory.length > 0;

  panel.innerHTML = `
    <!-- Close bar -->
    <div class="panel-close">
      <button class="panel-close-btn" onclick="closePanel()">
        ← Close
      </button>
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <button class="share-btn" onclick="shareSpecies('${s.id}')">🔗 Share</button>
        ${hasPrev ? `<button class="pnav-btn" onclick="goBack()" title="Previous">←</button>` : ''}
      </div>
    </div>

    <!-- Hero -->
    <div class="panel-hero">
      <img class="panel-hero-img" src="${s.photo}" alt="${s.name}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
      <div class="panel-hero-emoji" style="display:none;">${s.icon}</div>
      <div class="panel-hero-emoji">${s.icon}</div>
      <div class="panel-hero-overlay"></div>
      <div class="panel-hero-content">
        <div class="panel-status-badges">
          <span class="p-badge b-${s.status}">${s.statusLabel}</span>
          <span class="p-badge b-cat">${s.category.charAt(0).toUpperCase() + s.category.slice(1)}</span>
        </div>
        <div class="panel-name">${s.name}</div>
        <div class="panel-sci">${s.sci}</div>
      </div>
    </div>

    <!-- Quick stats -->
    <div class="panel-stats">${statsHTML}</div>

    <!-- Sound bar -->
    <div class="panel-sound-bar">
      <button class="sound-play-btn" data-id="${s.id}" onclick="playSound('${s.id}', this)">
        <span class="sound-play-icon">▶</span> Play ${s.name}
      </button>
      <div class="sound-waves-viz">
        <div class="swv"></div><div class="swv"></div><div class="swv"></div>
        <div class="swv"></div><div class="swv"></div><div class="swv"></div>
        <div class="swv"></div>
      </div>
      <span class="sound-note">🎧 Auto-plays on click</span>
    </div>

    <!-- Body -->
    <div class="panel-body">

      <!-- About -->
      <div class="psec">
        <div class="psec-h">About ${s.name}</div>
        <p class="psec-text">${s.about}</p>
      </div>

      <!-- Characteristics -->
      <div class="psec">
        <div class="psec-h">Characteristics</div>
        <div class="attr-chips">${attrsHTML}</div>
      </div>

      <!-- Diet -->
      <div class="psec">
        <div class="psec-h">Diet & Feeding</div>
        <div>${dietHTML}</div>
      </div>

      <!-- Habitat & Range -->
      <div class="psec">
        <div class="psec-h">Habitat & Range</div>
        <p class="psec-text">${s.habitat}</p>
        <div class="range-tags" style="margin-top:1rem;">${rangeHTML}</div>
      </div>

      <!-- Behaviour -->
      <div class="psec">
        <div class="psec-h">Behaviour & Lifestyle</div>
        <p class="psec-text">${s.behavior}</p>
      </div>

      <!-- Mating -->
      <div class="psec">
        <div class="psec-h">Mating & Reproduction</div>
        <div class="mating-grid">${matingHTML}</div>
      </div>

      <!-- Fun facts -->
      <div class="psec" style="background:var(--surface);">
        <div class="psec-h" style="color:var(--amber-l);">★ Fascinating Facts</div>
        <div class="fun-facts">${funFactsHTML}</div>
      </div>

      <!-- Conservation -->
      <div class="psec">
        <div class="psec-h">Population & Conservation</div>
        <div class="iucn-stats">
          <div class="iucn-stat">
            <div class="iucn-stat-lbl">Population Trend</div>
            <div class="iucn-stat-val ${trendCls}">${trendIcon} ${s.popTrend}</div>
          </div>
          <div class="iucn-stat">
            <div class="iucn-stat-lbl">Population Size</div>
            <div class="iucn-stat-val">${s.popNum}</div>
          </div>
        </div>
        <div class="iucn-scale">${iucnCircles}</div>
        <p style="font-size:0.6rem;color:var(--ink3);letter-spacing:0.08em;margin-top:0.5rem;">← NE (Not Evaluated) to EX (Extinct) — IUCN Red List Scale →</p>
        <div style="margin-top:0.75rem;background:var(--surface2);border-radius:6px;padding:0.75rem 1rem;font-size:0.82rem;color:var(--ink2);">
          📍 ${s.popWhere}
        </div>
      </div>

      <!-- Threats -->
      <div class="psec">
        <div class="psec-h">Threats & Conservation</div>
        <div class="threat-list">${threatsHTML}</div>
      </div>

      <!-- Taxonomy -->
      <div class="psec">
        <div class="psec-h">Scientific Classification</div>
        <div class="taxon-table">${taxHTML}</div>
      </div>

      <!-- Related -->
      ${relatedHTML ? `<div class="psec">
        <div class="psec-h">Related Species</div>
        <div class="related-grid">${relatedHTML}</div>
      </div>` : ''}

    </div>
  `;

  // Scroll panel to top
  panel.scrollTop = 0;
}

function goBack() {
  if (panelHistory.length > 0) {
    const prevId = panelHistory.pop();
    currentSpeciesId = prevId;
    stopAllSounds();
    const s = SPECIES[prevId];
    if (s) {
      renderPanel(s);
      setTimeout(() => {
        document.querySelectorAll('.diet-fill').forEach(el => {
          el.style.width = el.dataset.pct + '%';
        });
      }, 400);
    }
  }
}

function shareSpecies(id) {
  const s = SPECIES[id];
  if (!s) return;
  if (navigator.share) {
    navigator.share({
      title: `${s.name} — Roots & Roars`,
      text: `Discover the ${s.name} (${s.sci}) on Roots & Roars, India's wildlife encyclopedia.`,
      url: window.location.href
    });
  } else {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('Link copied to clipboard!');
    });
  }
}
