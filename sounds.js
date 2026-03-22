// ═══════════════════════════════════════════════════
// ROOTS & ROARS — Sound Engine
// Real audio URLs where available, Web Audio synthesis fallback
// ═══════════════════════════════════════════════════

// Real audio URLs from Wikimedia Commons
const SOUND_URLS = {
  tiger: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Bengal_tiger_sound.ogg',
  elephant: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Elephant_trumpet.ogg',
  peacock: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Pavo_cristatus_call.ogg',
};

let audioCtx = null;
let currentNodes = [];
let audioElements = {};
let currentSndId = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function stopAllSounds() {
  currentNodes.forEach(n => { try { n.stop(); } catch(e){} });
  currentNodes = [];
  Object.values(audioElements).forEach(a => { a.pause(); a.currentTime = 0; });
  // Reset all sound buttons
  document.querySelectorAll('.snd-btn').forEach(b => {
    b.classList.remove('playing');
    b.innerHTML = `<span class="snd-ico">🔊</span> Play Sound`;
  });
  document.querySelectorAll('.wave-viz').forEach(w => w.classList.remove('playing'));
  currentSndId = null;
}

function playSound(id, btn) {
  if (currentSndId === id) { stopAllSounds(); return; }
  stopAllSounds();
  currentSndId = id;

  // Try real audio first
  if (SOUND_URLS[id]) {
    const a = audioElements[id] || new Audio();
    audioElements[id] = a;
    a.src = SOUND_URLS[id];
    a.onplay = () => setSoundPlaying(btn, true);
    a.onended = () => { stopAllSounds(); };
    a.onerror = () => synthesize(id, btn);
    a.play().catch(() => synthesize(id, btn));
    return;
  }
  synthesize(id, btn);
}

function setSoundPlaying(btn, playing) {
  if (!btn) return;
  if (playing) {
    btn.classList.add('playing');
    btn.innerHTML = `<span class="snd-ico">🔊</span> Stop`;
    const wv = btn.closest('.p-sound')?.querySelector('.wave-viz');
    if (wv) wv.classList.add('playing');
  } else {
    btn.classList.remove('playing');
    btn.innerHTML = `<span class="snd-ico">🔊</span> Play Sound`;
    const wv = btn.closest('.p-sound')?.querySelector('.wave-viz');
    if (wv) wv.classList.remove('playing');
  }
}

function synthesize(id, btn) {
  const ctx = getCtx();
  setSoundPlaying(btn, true);

  const synths = {
    tiger: () => {
      const dur = 3.2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noise = makeNoise(ctx, dur);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + dur);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(.4, ctx.currentTime + .3);
      gain.gain.linearRampToValueAtTime(.7, ctx.currentTime + 1.2);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      noise.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur);
      currentNodes.push(osc);
      setTimeout(() => stopAllSounds(), dur * 1000 + 100);
    },
    elephant: () => {
      const dur = 2.5;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + .4);
      osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 1.2);
      osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + dur);
      gain.gain.setValueAtTime(.5, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur);
      currentNodes.push(osc);
      setTimeout(() => stopAllSounds(), dur * 1000 + 100);
    },
    peacock: () => {
      const calls = [0, .7, 1.4];
      calls.forEach(t => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(700, ctx.currentTime + t);
        osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + t + .5);
        gain.gain.setValueAtTime(0, ctx.currentTime + t);
        gain.gain.linearRampToValueAtTime(.4, ctx.currentTime + t + .1);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + t + .5);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + .6);
        currentNodes.push(osc);
      });
      setTimeout(() => stopAllSounds(), 2200);
    },
    snowleopard: () => {
      const dur = 2.0;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + dur);
      gain.gain.setValueAtTime(.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur);
      currentNodes.push(osc);
      setTimeout(() => stopAllSounds(), dur * 1000 + 100);
    },
    gharial: () => {
      const noise = makeNoise(ctx, 2.0);
      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 200;
      filt.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(.6, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      noise.connect(filt); filt.connect(g); g.connect(ctx.destination);
      setTimeout(() => stopAllSounds(), 2100);
    },
    kingcobra: () => {
      const noise = makeNoise(ctx, 2.5);
      const filt = ctx.createBiquadFilter();
      filt.type = 'highpass';
      filt.frequency.value = 1200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(.4, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5);
      noise.connect(filt); filt.connect(g); g.connect(ctx.destination);
      const osc = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 120;
      g2.gain.setValueAtTime(.15, ctx.currentTime);
      g2.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5);
      osc.connect(g2); g2.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 2.5);
      currentNodes.push(osc);
      setTimeout(() => stopAllSounds(), 2600);
    },
    rhino: () => {
      const dur = 1.5;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + dur);
      gain.gain.setValueAtTime(.5, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur);
      currentNodes.push(osc);
      setTimeout(() => stopAllSounds(), dur * 1000 + 100);
    },
    gaur: () => {
      const dur = 1.8;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + dur);
      gain.gain.setValueAtTime(.4, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur);
      currentNodes.push(osc);
      setTimeout(() => stopAllSounds(), dur * 1000 + 100);
    },
    chital: () => {
      const barks = [0, .6];
      barks.forEach(t => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(550, ctx.currentTime + t);
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + t + .3);
        g.gain.setValueAtTime(.35, ctx.currentTime + t);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + t + .3);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + .4);
        currentNodes.push(osc);
      });
      setTimeout(() => stopAllSounds(), 1400);
    },
    forest: () => {
      const noise = makeNoise(ctx, 4.0);
      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 600;
      filt.Q.value = 0.3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(.25, ctx.currentTime + .5);
      g.gain.linearRampToValueAtTime(.2, ctx.currentTime + 3);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 4);
      noise.connect(filt); filt.connect(g); g.connect(ctx.destination);
      setTimeout(() => stopAllSounds(), 4100);
    },
  };

  const fn = synths[id] || synths.forest;
  fn();
}

function makeNoise(ctx, dur) {
  const len = ctx.sampleRate * dur;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.start();
  currentNodes.push(src);
  return src;
}
