// ═══════════════════════════════════════════════════════
// ROOTS & ROARS — Sound Engine
// Uses Web Audio API to synthesize animal sounds
// Also attempts to load from Wikimedia/Freesound if available
// ═══════════════════════════════════════════════════════

let audioCtx = null;
let currentNodes = [];
let currentSoundBtn = null;
let soundTimeout = null;

// Real audio URLs from Wikimedia Commons (OGG/MP3)
// These are actual animal recordings
const SOUND_URLS = {
  tiger: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/ab/Male_tiger_roar.ogg/Male_tiger_roar.ogg.mp3',
  elephant: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3d/Elephant_trumpeting.ogg/Elephant_trumpeting.ogg.mp3',
  peacock: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/5/51/Pavo_cristatus_call.ogg/Pavo_cristatus_call.ogg.mp3',
};

// Audio buffer cache
const audioCache = {};
let audioElements = {};

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function stopAllSounds() {
  // Stop Web Audio nodes
  currentNodes.forEach(n => { try { n.stop(); } catch(e) {} });
  currentNodes = [];

  // Stop HTML audio elements
  Object.values(audioElements).forEach(el => {
    el.pause();
    el.currentTime = 0;
  });

  if (soundTimeout) { clearTimeout(soundTimeout); soundTimeout = null; }

  // Reset all buttons
  document.querySelectorAll('.sound-play-btn').forEach(b => {
    b.classList.remove('playing');
    b.innerHTML = getSoundBtnInner(b.dataset.id);
  });

  currentSoundBtn = null;
}

function getSoundBtnInner(id) {
  const s = SPECIES[id];
  return `<span class="sound-play-icon">▶</span> Play ${s ? s.name : 'Sound'}`;
}

function getPlayingBtnInner(id) {
  const s = SPECIES[id];
  return `
    <span class="sound-play-icon">⏹</span> Stop
  `;
}

// Try loading a real audio file; fall back to synthesized sound
async function playSound(id, btn) {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  if (btn.classList.contains('playing')) {
    stopAllSounds();
    return;
  }

  stopAllSounds();
  btn.classList.add('playing');
  currentSoundBtn = btn;

  // Update surrounding wave viz
  const soundBar = btn.closest('.panel-sound-bar');
  if (soundBar) {
    const waveEl = soundBar.querySelector('.sound-waves-viz');
    if (waveEl) waveEl.closest('.sound-waves-viz')?.classList.add('playing');
  }

  // Try real audio first
  const url = SOUND_URLS[id];
  if (url) {
    try {
      await playRealAudio(id, url, btn);
      return;
    } catch(e) {
      // Fall through to synthesized
    }
  }

  // Synthesized fallback
  playSynthSound(id, btn, ctx);
}

async function playRealAudio(id, url, btn) {
  return new Promise((resolve, reject) => {
    let audio = audioElements[id];
    if (!audio) {
      audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audioElements[id] = audio;
    }

    audio.src = url;
    audio.volume = 0.8;

    audio.onended = () => {
      stopAllSounds();
      resolve();
    };
    audio.onerror = () => {
      reject(new Error('Audio load failed'));
    };

    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(resolve).catch(reject);
    }
  });
}

function playSynthSound(id, btn, ctx) {
  const t = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, t);
  master.gain.linearRampToValueAtTime(0.5, t + 0.08);
  master.connect(ctx.destination);

  const snd = SPECIES[id]?.sound || 'forest';
  let duration = 2000;

  if (snd === 'tiger' || snd === 'snowleopard') {
    // Low sawtooth roar/growl
    for (let h = 1; h <= 5; h++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      const freq = snd === 'tiger' ? 48 / h : 65 / h;
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.4);
      o.frequency.exponentialRampToValueAtTime(freq * 0.75, t + 1.6);
      g.gain.setValueAtTime(0.35 / h, t);
      g.gain.linearRampToValueAtTime(0, t + 1.8);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 1.8);
      currentNodes.push(o);
    }
    // Add noise layer for breath
    const nbuf = ctx.createBuffer(1, ctx.sampleRate * 1.8, ctx.sampleRate);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.08;
    const ns = ctx.createBufferSource();
    ns.buffer = nbuf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 300;
    ns.connect(filt); filt.connect(master);
    ns.start(t); ns.stop(t + 1.8);
    currentNodes.push(ns);
    duration = 2000;

  } else if (snd === 'elephant') {
    // Trumpet: rising sine sweep
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(80, t);
    o.frequency.exponentialRampToValueAtTime(450, t + 0.5);
    o.frequency.exponentialRampToValueAtTime(280, t + 1.1);
    master.gain.linearRampToValueAtTime(0.7, t + 0.1);
    master.gain.linearRampToValueAtTime(0, t + 1.3);
    o.connect(master);
    o.start(t); o.stop(t + 1.3);
    currentNodes.push(o);
    // Harmonic
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime(40, t);
    o2.frequency.exponentialRampToValueAtTime(220, t + 0.5);
    o2.frequency.exponentialRampToValueAtTime(140, t + 1.1);
    g2.gain.setValueAtTime(0.2, t); g2.gain.linearRampToValueAtTime(0, t + 1.3);
    o2.connect(g2); g2.connect(master);
    o2.start(t); o2.stop(t + 1.3);
    currentNodes.push(o2);
    duration = 1500;

  } else if (snd === 'peacock') {
    // "MEOW"-like descending call
    const calls = [0, 0.7, 1.4];
    calls.forEach(delay => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(1400, t + delay);
      o.frequency.exponentialRampToValueAtTime(900, t + delay + 0.25);
      o.frequency.exponentialRampToValueAtTime(600, t + delay + 0.45);
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(0.55, t + delay + 0.05);
      g.gain.linearRampToValueAtTime(0.4, t + delay + 0.2);
      g.gain.linearRampToValueAtTime(0, t + delay + 0.5);
      o.connect(g); g.connect(master);
      o.start(t + delay); o.stop(t + delay + 0.5);
      currentNodes.push(o);
    });
    duration = 2200;

  } else if (snd === 'gharial') {
    // Soft hiss + buzz
    const nbuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource();
    ns.buffer = nbuf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = 550; filt.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t); g.gain.linearRampToValueAtTime(0, t + 1.5);
    ns.connect(filt); filt.connect(g); g.connect(master);
    ns.start(t); ns.stop(t + 1.5);
    currentNodes.push(ns);
    duration = 1800;

  } else if (snd === 'kingcobra') {
    // Deep growling hiss
    const nbuf = ctx.createBuffer(1, ctx.sampleRate * 1.8, ctx.sampleRate);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource();
    ns.buffer = nbuf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass'; filt.frequency.value = 2000; filt.Q.value = 0.5;
    const filt2 = ctx.createBiquadFilter();
    filt2.type = 'lowpass'; filt2.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t); g.gain.linearRampToValueAtTime(0.3, t + 1.0); g.gain.linearRampToValueAtTime(0, t + 1.8);
    ns.connect(filt); filt.connect(filt2); filt2.connect(g); g.connect(master);
    ns.start(t); ns.stop(t + 1.8);
    currentNodes.push(ns);
    // Low growl component
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t);
    og.gain.setValueAtTime(0.2, t); og.gain.linearRampToValueAtTime(0, t + 1.2);
    o.connect(og); og.connect(master);
    o.start(t); o.stop(t + 1.2);
    currentNodes.push(o);
    duration = 2000;

  } else if (snd === 'rhino' || snd === 'gaur') {
    // Low grunt/snort
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(100, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.6);
    master.gain.linearRampToValueAtTime(0.6, t + 0.05);
    master.gain.linearRampToValueAtTime(0, t + 0.8);
    o.connect(master);
    o.start(t); o.stop(t + 0.8);
    currentNodes.push(o);
    duration = 1000;

  } else if (snd === 'chital') {
    // Sharp bark
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(750, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.18);
    master.gain.linearRampToValueAtTime(0.5, t + 0.03);
    master.gain.linearRampToValueAtTime(0, t + 0.22);
    o.connect(master);
    o.start(t); o.stop(t + 0.22);
    currentNodes.push(o);
    duration = 500;

  } else {
    // Forest ambience — layered filtered noise
    const nbuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.06;
    const ns = ctx.createBufferSource();
    ns.buffer = nbuf;
    ns.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = 900; filt.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t); g.gain.linearRampToValueAtTime(0.4, t + 2); g.gain.linearRampToValueAtTime(0, t + 3);
    ns.connect(filt); filt.connect(g); g.connect(master);
    ns.start(t); ns.stop(t + 3);
    currentNodes.push(ns);
    duration = 3200;
  }

  soundTimeout = setTimeout(() => stopAllSounds(), duration);
}
