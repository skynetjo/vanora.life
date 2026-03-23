// ═══════════════════════════════════════════════════════
// VANORA — Species Panel v2
// Thread-connected detail panel · Refined editorial design
// ═══════════════════════════════════════════════════════

const STATUS_LABELS = {
  LC:'Least Concern', NT:'Near Threatened', VU:'Vulnerable',
  EN:'Endangered', CR:'Critically Endangered', EW:'Extinct in Wild',
  EX:'Extinct', DD:'Data Deficient', NE:'Not Evaluated'
};

function openSpecies(id) {
  const s = SPECIES[id];
  if (s) {
    renderDeepPanel(s);
  } else {
    const ws = WIKI_SPECIES.find(w => w.id === id || slugify(w.name) === id);
    if (ws) {
      renderWikiPanel(ws.name, ws.sci, ws.cat, ws.status, ws.icon || '🐾');
    } else {
      renderWikiPanel(id, '', 'wildlife', 'LC', '🐾');
    }
  }
  openPanel();
}

function openWikiSpecies(name, sci, cat, status, icon) {
  renderWikiPanel(name, sci, cat, status, icon);
  openPanel();
}

function closePanel() {
  stopAllSounds();
  hideThread();
  document.getElementById('backdrop').classList.remove('open');
  document.getElementById('panel').classList.remove('open');
  document.body.style.overflow = '';
  if (typeof activeCard !== 'undefined' && activeCard) {
    activeCard.classList.remove('selected');
    activeCard = null;
  }
}

// ── WIKIPEDIA PANEL ───────────────────────────────────
async function renderWikiPanel(name, sci, cat, status, icon) {
  const panel = document.getElementById('panel');
  const isBird = cat === 'birds';
  const isMammal = cat === 'mammals';
  const canXray = isBird || isMammal;

  panel.innerHTML = `
    <div class="panel-notch"></div>
    <div class="p-topbar">
      <button class="p-close" onclick="closePanel()">Back</button>
      <div class="p-topright">
        ${canXray ? `<button class="p-share" onclick="openSkeletonFor('${esc(name)}','${esc(sci)}','')">🦴 X-Ray</button>` : ''}
        <button class="p-share" onclick="shareSpecies('${encodeURIComponent(name)}')">⎗ Share</button>
      </div>
    </div>
    <div class="p-hero" style="background:linear-gradient(140deg,#050e08,#0f2014);">
      <div class="p-hero-emoji-bg">${icon}</div>
      <div class="p-hero-grad"></div>
      <div class="p-wiki-src">📡 Wikipedia</div>
      <div class="p-hero-body">
        <div class="p-badges">
          <span class="p-badge b${status}">${STATUS_LABELS[status] || status}</span>
          <span class="p-badge p-badge-cat">${cat}</span>
        </div>
        <div class="p-name">${name}</div>
        <div class="p-sci">${sci}</div>
      </div>
    </div>
    <div class="p-body">
      <div class="p-sec">
        <div class="p-loading">
          <div class="p-spin"></div><br>Loading from Wikipedia…
        </div>
      </div>
    </div>`;

  try {
    const searchTerm = sci || name;
    const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm.replace(/ /g,'_'))}`;
    const res = await fetch(apiUrl);
    const data = await res.json();

    let imgUrl = data.thumbnail?.source?.replace(/\/\d+px-/, '/800px-') || '';
    if (!imgUrl && data.originalimage) imgUrl = data.originalimage.source;

    if (imgUrl) {
      const heroEl = panel.querySelector('.p-hero');
      const img = document.createElement('img');
      img.className = 'p-hero-img';
      img.src = imgUrl;
      img.alt = name;
      img.onerror = () => img.remove();
      heroEl.insertBefore(img, heroEl.firstChild);

      // Update x-ray button with real image
      if (canXray) {
        const xrayBtn = panel.querySelector('.p-share');
        if (xrayBtn && xrayBtn.textContent.includes('X-Ray')) {
          xrayBtn.onclick = () => openSkeletonFor(name, sci, imgUrl);
        }
      }
    }

    const extract = data.extract || 'No description available from Wikipedia.';
    const shortDesc = extract.length > 900 ? extract.substring(0, 900) + '…' : extract;
    const wikiUrl = data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g,'_'))}`;

    panel.querySelector('.p-body').innerHTML = `
      <div class="p-sec">
        <div class="p-sec-h">About</div>
        <div class="p-wiki-excerpt">${shortDesc}</div>
        <a class="p-wiki-link" href="${wikiUrl}" target="_blank" rel="noopener">
          📖 Read full Wikipedia article →
        </a>
      </div>
      ${sci ? `
      <div class="p-sec">
        <div class="p-sec-h">Scientific Classification</div>
        <table width="100%">
          <tr class="trow"><td class="tk">Scientific Name</td><td class="tv">${sci}</td></tr>
          <tr class="trow"><td class="tk">Common Name</td><td class="tv plain">${name}</td></tr>
          <tr class="trow"><td class="tk">Category</td><td class="tv plain" style="text-transform:capitalize">${cat}</td></tr>
          <tr class="trow"><td class="tk">IUCN Status</td><td><span class="b${status}" style="padding:.1rem .45rem;border-radius:4px;font-size:.62rem;font-weight:700">${STATUS_LABELS[status] || status}</span></td></tr>
        </table>
      </div>` : ''}
      ${canXray ? `
      <div class="p-sec" style="background:linear-gradient(135deg,rgba(255,255,255,0.02),rgba(29,158,64,0.04));border-radius:8px;">
        <div class="p-sec-h">🦴 Anatomy & Skeleton</div>
        <p class="p-text" style="margin-bottom:.82rem;">Explore the skeletal structure of this species with our interactive X-ray viewer.</p>
        <button onclick="openSkeletonFor('${esc(name)}','${esc(sci)}','${imgUrl||''}')" style="display:flex;align-items:center;gap:.5rem;padding:.5rem 1rem;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;color:var(--ink2);font-family:var(--sans);font-size:.7rem;font-weight:600;cursor:pointer;transition:all .2s;width:auto;" onmouseover="this.style.borderColor='var(--leaf-l)';this.style.color='var(--leaf-l)'" onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--ink2)'">
          🦴 Open Skeleton X-Ray Viewer
        </button>
      </div>` : ''}
    `;
  } catch(e) {
    const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent((sci||name).replace(/ /g,'_'))}`;
    panel.querySelector('.p-body').innerHTML = `
      <div class="p-sec">
        <div class="p-text">Could not load Wikipedia data. <a class="p-wiki-link" href="${wikiUrl}" target="_blank" rel="noopener" style="display:inline;">View on Wikipedia →</a></div>
      </div>`;
  }
}

// ── DEEP PROFILE PANEL ───────────────────────────────
function renderDeepPanel(s) {
  const panel = document.getElementById('panel');
  const dietColors = ['#1d9e40','#2eca55','#c07e18','#e09a2a','#3a7fa8','#9d4edd'];
  const iucnOrder = ['NE','DD','LC','NT','VU','EN','CR','EW','EX'];
  const canXray = s.category === 'birds' || s.category === 'mammals';

  const statsHtml = (s.stats || []).map(st => `
    <div class="pst">
      <div class="pst-l">${st.l}</div>
      <div class="pst-v">${st.v}</div>
      <div class="pst-u">${st.u}</div>
    </div>`).join('');

  const dietHtml = (s.diet || []).map((d, i) => `
    <div class="diet-row">
      <div class="diet-l">${d.label}</div>
      <div class="diet-t"><div class="diet-f" data-pct="${d.pct}" style="background:${d.color || dietColors[i%dietColors.length]}"></div></div>
      <div class="diet-p">${d.pct}%</div>
    </div>`).join('');

  const matingHtml = (s.mating || []).map(m => `
    <div class="m-item"><div class="m-l">${m.l}</div><div class="m-v">${m.v}</div></div>`).join('');

  const factsHtml = (s.funFacts || []).map(f => `
    <div class="ff-item"><div class="ff-ico">${f.icon}</div><div class="ff-txt">${f.text}</div></div>`).join('');

  const attrsHtml = (s.attrs || []).map(a => `
    <span class="chip" style="background:${a.cls}20;border-color:${a.cls}35;color:${a.cls === '#374151' ? '#9ca3af' : a.cls === '#14532d' ? 'var(--leaf-l)' : '#e5e7eb'}">${a.lbl}</span>`).join('');

  const iucnHtml = iucnOrder.map(code => `
    <div class="ic ic-${code} ${s.iucn === code ? 'act' : ''}">${code}</div>`).join('');

  const threatsHtml = (s.threats || []).map(t => `
    <div class="threat"><span>⚠</span><span>${t}</span></div>`).join('');

  const rangeHtml = (s.range || []).map(r => `<span class="rtag">${r}</span>`).join('');

  const taxonHtml = s.taxonomy ? Object.entries(s.taxonomy).map(([k,v]) => `
    <div class="trow"><span class="tk">${k}</span><span class="tv">${v}</span></div>`).join('') : '';

  const relatedHtml = (s.related || []).slice(0,4).map(id => {
    const r = SPECIES[id];
    if (!r) return '';
    return `<div class="rel-card" onclick="openSpecies('${id}')">
      <div class="rel-ico">${r.icon}</div>
      <div><div class="rel-name">${r.name}</div><div class="rel-sci">${r.sci}</div></div>
    </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="panel-notch"></div>
    <div class="p-topbar">
      <button class="p-close" onclick="closePanel()">Back</button>
      <div class="p-topright">
        ${canXray ? `<button class="p-share" onclick="openSkeletonFor('${esc(s.name)}','${esc(s.sci)}','${s.photo||''}')">🦴 X-Ray</button>` : ''}
        <button class="p-share" onclick="shareSpecies('${s.id}')">⎗ Share</button>
      </div>
    </div>

    <div class="p-hero">
      ${s.photo ? `<img class="p-hero-img" src="${s.photo}" alt="${s.name}" onerror="this.style.display='none'">` : ''}
      <div class="p-hero-emoji-bg">${s.icon}</div>
      <div class="p-hero-grad"></div>
      <div class="p-hero-body">
        <div class="p-badges">
          <span class="p-badge b${s.status}">${s.statusLabel}</span>
          <span class="p-badge p-badge-cat">${s.category}</span>
        </div>
        <div class="p-name">${s.name}</div>
        <div class="p-sci">${s.sci}</div>
      </div>
    </div>

    <div class="p-stats">${statsHtml}</div>

    <div class="p-sound">
      <button class="snd-btn" id="sndBtn" onclick="playSound('${s.sound || s.id}', this)">
        <span class="snd-ico">🔊</span> Play Sound
      </button>
      <div class="wave-viz">
        ${[1,2,3,4,5,6,7].map(() => '<div class="wv"></div>').join('')}
      </div>
      <span class="snd-note">Authentic call</span>
    </div>

    <div class="p-body">

      <div class="p-sec">
        <div class="p-sec-h">About</div>
        <p class="p-text">${s.about}</p>
      </div>

      ${s.attrs?.length ? `<div class="p-sec">
        <div class="p-sec-h">Characteristics</div>
        <div class="chip-wrap">${attrsHtml}</div>
      </div>` : ''}

      ${s.diet?.length ? `<div class="p-sec">
        <div class="p-sec-h">Diet Breakdown</div>
        ${dietHtml}
      </div>` : ''}

      ${s.habitat ? `<div class="p-sec">
        <div class="p-sec-h">Habitat</div>
        <p class="p-text">${s.habitat}</p>
      </div>` : ''}

      ${s.behavior ? `<div class="p-sec">
        <div class="p-sec-h">Behaviour</div>
        <p class="p-text">${s.behavior}</p>
      </div>` : ''}

      ${s.mating?.length ? `<div class="p-sec">
        <div class="p-sec-h">Breeding</div>
        <div class="m-grid">${matingHtml}</div>
      </div>` : ''}

      ${canXray ? `<div class="p-sec" style="background:linear-gradient(135deg,rgba(255,255,255,0.015),rgba(29,158,64,0.04));">
        <div class="p-sec-h">🦴 Anatomy & Skeleton</div>
        <p class="p-text" style="margin-bottom:.82rem;">Explore the internal skeletal structure with our interactive X-ray anatomy viewer.</p>
        <button onclick="openSkeletonFor('${esc(s.name)}','${esc(s.sci)}','${s.photo||''}')" style="display:flex;align-items:center;gap:.5rem;padding:.52rem 1.1rem;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;color:var(--ink2);font-family:var(--sans);font-size:.7rem;font-weight:600;cursor:pointer;transition:all .2s;" onmouseover="this.style.borderColor='var(--leaf-l)';this.style.color='var(--leaf-l)'" onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--ink2)'">
          🦴 Open X-Ray Skeleton Viewer
        </button>
      </div>` : ''}

      ${s.funFacts?.length ? `<div class="p-sec">
        <div class="p-sec-h">Did You Know?</div>
        <div class="ff-list">${factsHtml}</div>
      </div>` : ''}

      <div class="p-sec">
        <div class="p-sec-h">Conservation Status</div>
        <div class="iucn-scale">${iucnHtml}</div>
        <div class="iucn-row">
          <div class="iucn-box"><div class="iucn-box-l">Status</div><div class="iucn-box-v"><span class="b${s.iucn}" style="padding:.1rem .4rem;border-radius:4px;font-size:.7rem;font-weight:700">${s.statusLabel}</span></div></div>
          <div class="iucn-box"><div class="iucn-box-l">Population Trend</div><div class="iucn-box-v ${s.popTrend === 'Increasing' ? 'tinc' : s.popTrend === 'Decreasing' ? 'tdec' : 'tsta'}">${s.popTrend}</div></div>
          <div class="iucn-box"><div class="iucn-box-l">Known Population</div><div class="iucn-box-v">${s.popNum}</div></div>
          <div class="iucn-box"><div class="iucn-box-l">Primary Range</div><div class="iucn-box-v">${s.popWhere}</div></div>
        </div>
      </div>

      ${s.threats?.length ? `<div class="p-sec">
        <div class="p-sec-h">Major Threats</div>
        <div class="threats">${threatsHtml}</div>
      </div>` : ''}

      ${s.range?.length ? `<div class="p-sec">
        <div class="p-sec-h">Range in India</div>
        <div class="range-tags">${rangeHtml}</div>
      </div>` : ''}

      ${taxonHtml ? `<div class="p-sec">
        <div class="p-sec-h">Taxonomy</div>
        <table width="100%">${taxonHtml}</table>
      </div>` : ''}

      ${relatedHtml ? `<div class="p-sec">
        <div class="p-sec-h">Related Species</div>
        <div class="rel-grid">${relatedHtml}</div>
      </div>` : ''}

    </div>`;

  // Animate diet bars
  setTimeout(() => {
    panel.querySelectorAll('.diet-f').forEach(el => {
      el.style.width = el.dataset.pct + '%';
    });
  }, 450);
}

function shareSpecies(id) {
  const url = `${window.location.origin}${window.location.pathname}?species=${id}`;
  if (navigator.share) {
    navigator.share({ title: 'Vanora', url }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(url).then(() => {
      const btns = document.querySelectorAll('.p-share');
      btns.forEach(btn => {
        if (btn.textContent.includes('Share')) {
          btn.textContent = '✓ Copied!';
          setTimeout(() => btn.innerHTML = '⎗ Share', 2000);
        }
      });
    });
  }
}

function esc(s) { return (s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
