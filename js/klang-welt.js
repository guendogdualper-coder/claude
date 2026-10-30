// Klänge der Welt (seit 9.4): Monsterstimmen, Schläge, Treffer, Zauber, Beute – alles im Browser erzeugt.
// Jeder Klang wird beim ersten Gebrauch einmal vorberechnet (OfflineAudioContext) und danach nur noch
// abgespielt; das schont das Handy. Höhe und Lautstärke ändern sich beim Abspielen (Größe des Monsters,
// Zufall, Entfernung), links/rechts nach der Lage zur Figur.
//
// Stimmen der Monster: je Art eine Familie (VOICE_OF) mit vier Lauten – Schrei beim Angriff auf dich (aggro),
// Angriff (attack), Schmerz (hurt) und Tod (death). Unbekannte Arten nehmen die Familie ihrer Form.

const SND_RATE = 32000;
const SND_VARIANTS = 3;

// --- Vorberechnen ----------------------------------------------------------------------------------
function sndRender(dur, build) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) return Promise.resolve(null);
  const c = new OAC(1, Math.max(1, Math.ceil(dur * SND_RATE)), SND_RATE);
  build(c, c.destination);
  return new Promise((resolve) => {
    c.oncomplete = (e) => resolve(e.renderedBuffer);
    const r = c.startRendering();
    if (r && r.then) r.then(resolve, () => resolve(null));
  });
}

// Zahl aus einem Text (Startwert je Klang und Variante)
function sndHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Zufall mit Startwert (Varianten klingen verschieden, aber jedes Mal gleich)
function sndRand(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// --- Bausteine (in einem Offline-Kontext c, Ausgang out) -------------------------------------------
function sNoiseSrc(c, dur, color = 'white') {
  const len = Math.max(1, Math.ceil(dur * c.sampleRate));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (color === 'brown') {
      b = (b + 0.02 * w) / 1.02;
      d[i] = b * 3.5;
    } else if (color === 'pink') {
      b = 0.97 * b + 0.03 * w;
      d[i] = (w * 0.4 + b * 2.2);
    } else d[i] = w;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

// Hüllkurve: pts [[t, wert], …] linear verbunden
function sEnv(param, pts) {
  param.setValueAtTime(pts[0][1], pts[0][0]);
  for (let i = 1; i < pts.length; i++) param.linearRampToValueAtTime(pts[i][1], pts[i][0]);
}
// Tonhöhe: pts [[t, hz], …] exponentiell verbunden (klingt natürlicher)
function sPitch(param, pts) {
  param.setValueAtTime(Math.max(1, pts[0][1]), pts[0][0]);
  for (let i = 1; i < pts.length; i++) param.exponentialRampToValueAtTime(Math.max(1, pts[i][1]), pts[i][0]);
}

function sDrive(c, k) {
  const sh = c.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * (1 + k * 8)) / Math.tanh(1 + k * 8);
  }
  sh.curve = curve;
  return sh;
}

// Stimme: Sägezahn (und etwas Atemrauschen) durch drei Formantfilter, mit Vibrato, Rauheit (schnelles
// Pulsieren der Lautstärke, klingt nach Knurren) und Verzerrung.
//   o.f Tonhöhe [[t, hz]], o.amp Lautstärke [[t, v]], o.form Formanten [[hz, q, g]], o.breath 0…1,
//   o.rough [hz, tiefe], o.vib [hz, cent], o.drive 0…1, o.lp Tiefpass, o.type Wellenform, o.at Startzeit
function sVoice(c, out, o) {
  const t0 = o.at || 0;
  const dur = o.amp[o.amp.length - 1][0];
  const osc = c.createOscillator();
  osc.type = o.type || 'sawtooth';
  sPitch(osc.frequency, o.f.map(([t, f]) => [t0 + t, f]));
  if (o.vib) {
    const lfo = c.createOscillator();
    lfo.frequency.value = o.vib[0];
    const lg = c.createGain();
    lg.gain.value = o.f[0][1] * (Math.pow(2, o.vib[1] / 1200) - 1);
    lfo.connect(lg);
    lg.connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.05);
  }
  const src = c.createGain();
  src.gain.value = 1;
  osc.connect(src);
  if (o.breath) {
    const nz = sNoiseSrc(c, dur + 0.05, 'pink');
    const ng = c.createGain();
    ng.gain.value = o.breath;
    nz.connect(ng);
    ng.connect(src);
    nz.start(t0);
  }
  let node = src;
  if (o.rough) {
    const am = c.createGain();
    am.gain.value = 1 - o.rough[1] / 2;
    const lfo = c.createOscillator();
    lfo.type = 'triangle';
    lfo.frequency.value = o.rough[0];
    const lg = c.createGain();
    lg.gain.value = o.rough[1] / 2;
    lfo.connect(lg);
    lg.connect(am.gain);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.05);
    node.connect(am);
    node = am;
  }
  if (o.drive) {
    const d = sDrive(c, o.drive);
    node.connect(d);
    node = d;
  }
  const sum = c.createGain();
  for (const [hz, q, g] of o.form || [[700, 3, 1]]) {
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = hz;
    bp.Q.value = q;
    const gg = c.createGain();
    gg.gain.value = g * Math.sqrt(q) * 0.9;
    node.connect(bp);
    bp.connect(gg);
    gg.connect(sum);
  }
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = o.lp || 6000;
  const env = c.createGain();
  sEnv(env.gain, o.amp.map(([t, v]) => [t0 + t, v * (o.vol || 1)]));
  sum.connect(lp);
  lp.connect(env);
  env.connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// gefiltertes Rauschen mit Hüllkurve; o.f Filterfrequenz (Zahl oder [[t, hz]]), o.type Filterart
function sNoise(c, out, o) {
  const t0 = o.at || 0;
  const dur = o.amp[o.amp.length - 1][0];
  const nz = sNoiseSrc(c, dur + 0.05, o.color || 'white');
  const f = c.createBiquadFilter();
  f.type = o.type || 'bandpass';
  if (Array.isArray(o.f)) sPitch(f.frequency, o.f.map(([t, hz]) => [t0 + t, hz]));
  else f.frequency.value = o.f;
  f.Q.value = o.q || 1;
  const env = c.createGain();
  sEnv(env.gain, o.amp.map(([t, v]) => [t0 + t, v * (o.vol || 1)]));
  let node = f;
  if (o.rough) {
    const am = c.createGain();
    am.gain.value = 1 - o.rough[1] / 2;
    const lfo = c.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = o.rough[0];
    const lg = c.createGain();
    lg.gain.value = o.rough[1] / 2;
    lfo.connect(lg);
    lg.connect(am.gain);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.05);
    f.connect(am);
    node = am;
  }
  nz.connect(f);
  node.connect(env);
  env.connect(out);
  nz.start(t0);
}

// Ton mit Tonhöhenverlauf (Schlag, Glocke, Zupfen)
function sTone(c, out, o) {
  const t0 = o.at || 0;
  const dur = o.amp[o.amp.length - 1][0];
  const osc = c.createOscillator();
  osc.type = o.type || 'sine';
  sPitch(osc.frequency, (o.f.length ? o.f : [[0, o.f]]).map(([t, hz]) => [t0 + t, hz]));
  const env = c.createGain();
  sEnv(env.gain, o.amp.map(([t, v]) => [t0 + t, v * (o.vol || 1)]));
  osc.connect(env);
  if (o.lp) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = o.lp;
    env.connect(lp);
    lp.connect(out);
  } else env.connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// Glocke (FM): Träger und Modulator mit abklingendem Index – Münzen, Kristalle, Stufenaufstieg
function sBell(c, out, hz, at, dur, vol = 0.3, ratio = 3.5, index = 2) {
  const car = c.createOscillator();
  car.frequency.value = hz;
  const mod = c.createOscillator();
  mod.frequency.value = hz * ratio;
  const mg = c.createGain();
  sEnv(mg.gain, [[at, hz * index], [at + dur * 0.6, hz * index * 0.08], [at + dur, 0]]);
  mod.connect(mg);
  mg.connect(car.frequency);
  const env = c.createGain();
  sEnv(env.gain, [[at, 0], [at + 0.004, vol], [at + dur * 0.3, vol * 0.45], [at + dur, 0]]);
  car.connect(env);
  env.connect(out);
  car.start(at);
  mod.start(at);
  car.stop(at + dur + 0.05);
  mod.stop(at + dur + 0.05);
}

// kurze Klicks (Spinnen, Skorpione, Steinchen): n Klicks mit Abstand gap
function sClicks(c, out, n, gap, hz, vol, rnd, at = 0) {
  for (let i = 0; i < n; i++) {
    const t = at + i * gap * (0.7 + rnd() * 0.6);
    sNoise(c, out, { at: t, f: hz * (0.8 + rnd() * 0.5), q: 4, type: 'bandpass', amp: [[0, 0], [0.002, vol], [0.022, 0]] });
  }
}

// --- Vokale (Formanten) ----------------------------------------------------------------------------
const FORM = {
  a: [[780, 6, 1], [1180, 8, 0.6], [2500, 12, 0.25]],
  o: [[470, 6, 1], [840, 8, 0.55], [2600, 12, 0.18]],
  u: [[330, 5, 1], [720, 8, 0.4], [2400, 12, 0.12]],
  e: [[430, 6, 1], [1750, 10, 0.5], [2650, 12, 0.3]],
  growl: [[240, 3, 1], [650, 5, 0.65], [1700, 7, 0.3]],
  snarl: [[620, 4, 1], [1500, 6, 0.75], [3200, 8, 0.45]],
  yelp: [[900, 5, 1], [1800, 7, 0.6], [3400, 9, 0.3]]
};

// Grundlaut einer Stimme: v = { p, form, rough, drive, breath, vib, lp }; Länge nach Ereignis
function vocal(c, out, v, ev, rnd, extra = {}) {
  const p = v.p * (0.94 + rnd() * 0.12);
  const base = { form: v.form, rough: v.rough, drive: v.drive, breath: v.breath, vib: v.vib, lp: v.lp, type: v.type, vol: 0.9 };
  if (ev === 'aggro') {
    const d = (v.long || 0.85) * (0.9 + rnd() * 0.2);
    sVoice(c, out, { ...base, f: [[0, p * 0.85], [d * 0.25, p * 1.3], [d, p * 0.7]], amp: [[0, 0], [0.06, 1], [d * 0.6, 0.85], [d, 0]], ...extra });
    return d;
  }
  if (ev === 'attack') {
    const d = 0.26 * (0.85 + rnd() * 0.3);
    sVoice(c, out, { ...base, f: [[0, p * 1.15], [d, p * 0.8]], amp: [[0, 0], [0.015, 1], [d * 0.5, 0.7], [d, 0]], rough: v.rough ? [v.rough[0], Math.min(1, v.rough[1] * 1.3)] : null, ...extra });
    return d;
  }
  if (ev === 'hurt') {
    const d = 0.2 * (0.85 + rnd() * 0.3);
    sVoice(c, out, { ...base, f: [[0, p * 1.7], [d, p * 1.05]], amp: [[0, 0], [0.01, 0.9], [d, 0]], ...extra });
    return d;
  }
  const d = (v.dieLen || 1.15) * (0.9 + rnd() * 0.2);
  sVoice(c, out, { ...base, f: [[0, p * 1.25], [d * 0.3, p], [d, p * 0.42]], amp: [[0, 0], [0.04, 1], [d * 0.45, 0.75], [d, 0]], rough: v.rough ? [v.rough[0] * 0.7, Math.min(1, v.rough[1] * 1.4)] : [18, 0.4], ...extra });
  return d;
}

// Körperfall beim Tod: dumpfer Aufprall
function bodyFall(c, out, at, vol = 0.5) {
  sTone(c, out, { at, f: [[0, 120], [0.18, 48]], amp: [[0, 0], [0.006, vol], [0.22, 0]] });
  sNoise(c, out, { at, f: 500, type: 'lowpass', amp: [[0, 0], [0.004, vol * 0.6], [0.16, 0]], color: 'brown' });
}

// --- Stimmen der Monster ---------------------------------------------------------------------------
// Jede Familie: Länge des Lauts je Ereignis und eine Bau-Funktion
const VOICES = {
  dog: { v: { p: 340, form: FORM.yelp, rough: [40, 0.5], breath: 0.25, drive: 0.25 },
    build(c, out, ev, r) {
      if (ev === 'aggro' || ev === 'attack') {
        // Bellen: zwei kurze Stöße
        const n = ev === 'aggro' ? 2 : 1;
        for (let i = 0; i < n; i++) sVoice(c, out, { at: i * 0.2, f: [[0, 420 + r() * 60], [0.11, 300]], amp: [[0, 0], [0.008, 1], [0.05, 0.7], [0.12, 0]], form: FORM.a, rough: [55, 0.4], breath: 0.35, drive: 0.35 });
        return n * 0.2;
      }
      return vocal(c, out, this.v, ev, r);
    } },
  fox: { v: { p: 520, form: FORM.yelp, rough: [30, 0.3], breath: 0.3, drive: 0.2, long: 0.5 } },
  hyena: { v: { p: 420, form: FORM.a, breath: 0.3, drive: 0.25 },
    build(c, out, ev, r) {
      if (ev === 'aggro' || ev === 'death') {
        // Kichern: schnelle, fallende Silben
        for (let i = 0; i < 5; i++) sVoice(c, out, { at: i * 0.11, f: [[0, 560 - i * 30], [0.08, 460 - i * 30]], amp: [[0, 0], [0.008, 0.9], [0.08, 0]], form: FORM.a, breath: 0.3, drive: 0.2 });
        return 0.6;
      }
      return vocal(c, out, this.v, ev, r);
    } },
  wolf: { v: { p: 150, form: FORM.growl, rough: [32, 0.55], breath: 0.3, drive: 0.35 },
    build(c, out, ev, r) {
      if (ev === 'aggro') {
        // Heulen: langer Ton, steigt und fällt, mit Vibrato
        const p = 330 + r() * 50;
        sVoice(c, out, { f: [[0, p * 0.8], [0.3, p * 1.35], [1.0, p * 1.4], [1.5, p * 0.9]], amp: [[0, 0], [0.15, 0.8], [1.1, 0.7], [1.5, 0]], form: FORM.u, vib: [5, 22], breath: 0.15, type: 'triangle', vol: 1.2 });
        return 1.5;
      }
      if (ev === 'attack') {
        // Knurren und Zuschnappen
        sVoice(c, out, { f: [[0, 110], [0.3, 95]], amp: [[0, 0], [0.04, 0.8], [0.3, 0]], form: FORM.growl, rough: [36, 0.7], breath: 0.4, drive: 0.4 });
        sNoise(c, out, { at: 0.24, f: 2200, q: 2, amp: [[0, 0], [0.003, 0.7], [0.05, 0]] });
        return 0.32;
      }
      if (ev === 'hurt') {
        sVoice(c, out, { f: [[0, 900], [0.18, 600]], amp: [[0, 0], [0.01, 0.9], [0.18, 0]], form: FORM.yelp, breath: 0.25 });
        return 0.2;
      }
      return vocal(c, out, { ...this.v, p: 300, form: FORM.yelp }, ev, r);
    } },
  hellhound: { v: { p: 110, form: FORM.growl, rough: [30, 0.7], breath: 0.4, drive: 0.7 },
    build(c, out, ev, r) {
      const d = vocal(c, out, this.v, ev, r);
      // Fauchen von Feuer dahinter
      sNoise(c, out, { f: [[0, 600], [d, 1800]], type: 'bandpass', q: 0.8, amp: [[0, 0], [d * 0.3, 0.35], [d, 0]], color: 'pink' });
      return d;
    } },
  boar: { v: { p: 105, form: FORM.o, rough: [45, 0.65], breath: 0.4, drive: 0.35 },
    build(c, out, ev, r) {
      if (ev === 'hurt' || ev === 'death') {
        // Quieken
        const d = ev === 'death' ? 0.9 : 0.28;
        sVoice(c, out, { f: [[0, 900], [d * 0.3, 1200], [d, 600]], amp: [[0, 0], [0.02, 0.8], [d * 0.6, 0.6], [d, 0]], form: FORM.e, rough: [60, 0.3], breath: 0.3, drive: 0.3 });
        if (ev === 'death') bodyFall(c, out, d * 0.8);
        return d;
      }
      // Grunzen: zwei Stöße
      for (let i = 0; i < 2; i++) sVoice(c, out, { at: i * 0.17, f: [[0, 120], [0.13, 95]], amp: [[0, 0], [0.02, 1], [0.13, 0]], form: FORM.o, rough: [48, 0.7], breath: 0.45, drive: 0.4 });
      return 0.32;
    } },
  bear: { v: { p: 78, form: FORM.growl, rough: [30, 0.6], breath: 0.45, drive: 0.55, long: 1.1, dieLen: 1.5 } },
  cat: { v: { p: 230, form: FORM.snarl, rough: [50, 0.45], breath: 0.5, drive: 0.4 },
    build(c, out, ev, r) {
      if (ev === 'aggro' || ev === 'attack') {
        // Fauchen und kurzes Knurren
        sNoise(c, out, { f: 3500, q: 1.2, amp: [[0, 0], [0.03, 0.8], [0.4, 0.5], [0.55, 0]] });
        sVoice(c, out, { at: 0.08, f: [[0, 260], [0.35, 200]], amp: [[0, 0], [0.03, 0.7], [0.35, 0]], form: FORM.snarl, rough: [52, 0.6], breath: 0.4, drive: 0.4 });
        return 0.55;
      }
      return vocal(c, out, this.v, ev, r);
    } },
  deer: { v: { p: 170, form: FORM.o, rough: [20, 0.25], breath: 0.35, drive: 0.25, long: 1.2 } },
  mammoth: { v: { p: 330, form: [[1100, 4, 1], [2300, 6, 0.5]], rough: [25, 0.3], drive: 0.6, long: 1.3, dieLen: 1.6 } },
  spider: {
    build(c, out, ev, r) {
      if (ev === 'death') {
        sVoice(c, out, { f: [[0, 1400], [0.5, 500]], amp: [[0, 0], [0.02, 0.6], [0.5, 0]], form: FORM.yelp, drive: 0.5, breath: 0.4 });
        sClicks(c, out, 14, 0.04, 3200, 0.5, r);
        return 0.65;
      }
      if (ev === 'hurt') {
        sNoise(c, out, { f: 4200, q: 2, amp: [[0, 0], [0.01, 0.6], [0.16, 0]] });
        sClicks(c, out, 3, 0.03, 3000, 0.5, r);
        return 0.18;
      }
      // Zirpen und Klappern der Kiefer, beim Angriff mit Zischen
      sClicks(c, out, ev === 'aggro' ? 16 : 7, 0.035, 2800, 0.55, r);
      sNoise(c, out, { at: 0.05, f: 5200, q: 1.5, amp: [[0, 0], [0.04, ev === 'aggro' ? 0.45 : 0.6], [ev === 'aggro' ? 0.5 : 0.25, 0]] });
      return ev === 'aggro' ? 0.6 : 0.3;
    } },
  scorpion: {
    build(c, out, ev, r) {
      if (ev === 'death') {
        sClicks(c, out, 12, 0.05, 1800, 0.6, r);
        bodyFall(c, out, 0.4, 0.35);
        return 0.7;
      }
      // Scheren klacken, beim Schrei rasselnd
      sClicks(c, out, ev === 'aggro' ? 10 : ev === 'hurt' ? 3 : 5, 0.05, 1500, 0.7, r);
      if (ev === 'aggro') sNoise(c, out, { at: 0.1, f: 3000, q: 1.5, amp: [[0, 0], [0.05, 0.35], [0.5, 0]], rough: [26, 0.8] });
      return ev === 'aggro' ? 0.6 : 0.28;
    } },
  snake: {
    build(c, out, ev, r) {
      const d = ev === 'aggro' ? 0.9 : ev === 'death' ? 1.0 : ev === 'attack' ? 0.35 : 0.2;
      // Zischen; beim Tod leiser werdend und tiefer
      sNoise(c, out, { f: ev === 'death' ? [[0, 5000], [d, 1800]] : 5400, q: 1.6, amp: [[0, 0], [ev === 'attack' ? 0.01 : 0.08, 0.75], [d * 0.7, 0.55], [d, 0]] });
      if (ev === 'attack') sNoise(c, out, { at: 0.25, f: 1200, q: 2, amp: [[0, 0], [0.003, 0.5], [0.05, 0]] });
      return d;
    } },
  rattle: {
    build(c, out, ev, r) {
      if (ev === 'aggro' || ev === 'attack') {
        // Rassel: Rauschen, schnell pulsierend
        const d = ev === 'aggro' ? 1.0 : 0.45;
        sNoise(c, out, { f: 4200, q: 1.2, amp: [[0, 0], [0.04, 0.7], [d * 0.8, 0.6], [d, 0]], rough: [28, 1] });
        return d;
      }
      return VOICES.snake.build(c, out, ev, r);
    } },
  naga: { v: { p: 230, form: FORM.e, breath: 0.85, rough: [20, 0.2], drive: 0.15 },
    build(c, out, ev, r) {
      const d = vocal(c, out, this.v, ev, r);
      sNoise(c, out, { f: 5000, q: 1.5, amp: [[0, 0], [d * 0.2, 0.3], [d, 0]] });
      return d;
    } },
  human: { v: { p: 125, form: FORM.a, rough: [18, 0.2], breath: 0.25, drive: 0.15, long: 0.6, dieLen: 1.0 },
    build(c, out, ev, r) {
      if (ev === 'aggro') {
        // Ruf: „Hey!“ mit zwei Vokalen
        sVoice(c, out, { f: [[0, 160], [0.12, 210], [0.45, 150]], amp: [[0, 0], [0.03, 1], [0.35, 0.8], [0.48, 0]], form: FORM.e, breath: 0.25, drive: 0.15 });
        return 0.5;
      }
      if (ev === 'hurt') {
        sVoice(c, out, { f: [[0, 190], [0.2, 140]], amp: [[0, 0], [0.01, 0.9], [0.2, 0]], form: FORM.u, breath: 0.35, drive: 0.15 });
        return 0.22;
      }
      const d = vocal(c, out, this.v, ev, r);
      if (ev === 'death') bodyFall(c, out, d * 0.85, 0.4);
      return d;
    } },
  witch: { v: { p: 330, form: FORM.a, breath: 0.4, drive: 0.25 },
    build(c, out, ev, r) {
      if (ev === 'aggro' || ev === 'death') {
        // Kichern: hohe, schnell zerhackte Silben
        const n = ev === 'aggro' ? 6 : 4;
        for (let i = 0; i < n; i++) sVoice(c, out, { at: i * 0.12, f: [[0, 520 - i * (ev === 'death' ? 50 : 15)], [0.1, 430 - i * (ev === 'death' ? 50 : 15)]], amp: [[0, 0], [0.01, 0.9], [0.1, 0]], form: FORM.a, breath: 0.45, drive: 0.25, vib: [9, 40] });
        return n * 0.12 + 0.1;
      }
      return vocal(c, out, this.v, ev, r);
    } },
  undead: { v: { p: 92, form: FORM.o, rough: [14, 0.5], breath: 0.6, drive: 0.35, long: 1.2, dieLen: 1.4 },
    build(c, out, ev, r) {
      const d = vocal(c, out, this.v, ev, r);
      if (ev === 'death') {
        // Knochen klappern zu Boden
        sClicks(c, out, 9, 0.05, 1900, 0.55, r, d * 0.5);
      }
      return d;
    } },
  orc: { v: { p: 88, form: FORM.a, rough: [26, 0.55], breath: 0.3, drive: 0.55, long: 0.75, dieLen: 1.1 },
    build(c, out, ev, r) {
      const d = vocal(c, out, this.v, ev, r);
      if (ev === 'death') bodyFall(c, out, d * 0.85, 0.55);
      return d;
    } },
  brute: { v: { p: 62, form: FORM.growl, rough: [28, 0.6], breath: 0.4, drive: 0.6, long: 1.1, dieLen: 1.5 },
    build(c, out, ev, r) {
      const d = vocal(c, out, this.v, ev, r);
      if (ev === 'death') bodyFall(c, out, d * 0.85, 0.8);
      return d;
    } },
  golem: {
    build(c, out, ev, r) {
      const d = ev === 'death' ? 1.3 : ev === 'aggro' ? 1.0 : ev === 'attack' ? 0.4 : 0.25;
      // Felsen mahlen: tiefes Grollen, Knirschen, Steinchen
      sNoise(c, out, { f: 260, type: 'lowpass', amp: [[0, 0], [0.05, 0.9], [d * 0.7, 0.6], [d, 0]], color: 'brown', rough: [12, 0.5] });
      sClicks(c, out, Math.round(d * 18), 0.05, 1300, 0.45, r);
      if (ev !== 'hurt') sVoice(c, out, { f: [[0, 58], [d, 42]], amp: [[0, 0], [0.1, 0.5], [d, 0]], form: FORM.growl, rough: [20, 0.6], drive: 0.6, breath: 0.3 });
      if (ev === 'death') bodyFall(c, out, d * 0.8, 0.9);
      return d;
    } },
  demon: { v: { p: 66, form: FORM.growl, rough: [34, 0.65], breath: 0.4, drive: 0.85, long: 1.1, dieLen: 1.5 },
    build(c, out, ev, r) {
      const d = vocal(c, out, this.v, ev, r);
      // zweite, höhere Stimme darüber (unheimlich)
      if (ev !== 'hurt') vocal(c, out, { ...this.v, p: 190, form: FORM.snarl, drive: 0.5 }, ev, r, { vol: 0.35 });
      return d;
    } },
  ghost: { v: { p: 380, form: FORM.u, breath: 0.35, vib: [6, 45], type: 'triangle', long: 1.4, dieLen: 1.6 },
    build(c, out, ev, r) {
      if (ev === 'attack') {
        sNoise(c, out, { f: [[0, 800], [0.4, 2400]], q: 2, amp: [[0, 0], [0.1, 0.6], [0.4, 0]] });
        return 0.4;
      }
      return vocal(c, out, this.v, ev, r);
    } },
  harpy: { v: { p: 900, form: [[1500, 5, 1], [3000, 7, 0.6]], rough: [40, 0.3], drive: 0.5, breath: 0.3, long: 0.7 },
    build(c, out, ev, r) {
      const d = vocal(c, out, this.v, ev, r);
      // Flügelschläge
      if (ev === 'aggro' || ev === 'attack') for (let i = 0; i < 3; i++) sNoise(c, out, { at: i * 0.16, f: 700, type: 'lowpass', amp: [[0, 0], [0.04, 0.4], [0.12, 0]] });
      return d;
    } },
  dragon: { v: { p: 70, form: FORM.growl, rough: [30, 0.7], breath: 0.5, drive: 0.8, long: 1.5, dieLen: 1.8 },
    build(c, out, ev, r) {
      if (ev === 'attack') {
        // Feueratem
        sNoise(c, out, { f: [[0, 400], [0.6, 1600]], type: 'bandpass', q: 0.7, amp: [[0, 0], [0.08, 0.9], [0.5, 0.7], [0.7, 0]], color: 'pink' });
        sNoise(c, out, { f: 3000, q: 1, amp: [[0, 0], [0.1, 0.25], [0.7, 0]], rough: [17, 0.7] });
        return 0.7;
      }
      const d = vocal(c, out, this.v, ev, r);
      if (ev === 'death') bodyFall(c, out, d * 0.85, 1);
      return d;
    } },
  // Seelensteine: Kristallklang beim Treffer, Zerspringen beim Tod
  stone: {
    build(c, out, ev, r) {
      if (ev === 'death') {
        sNoise(c, out, { f: 2500, type: 'highpass', amp: [[0, 0], [0.005, 0.8], [0.6, 0]] });
        sTone(c, out, { f: [[0, 95], [0.7, 40]], amp: [[0, 0], [0.01, 0.7], [0.8, 0]] });
        for (let i = 0; i < 9; i++) sBell(c, out, 1800 + r() * 2600, 0.03 + i * 0.05, 0.4, 0.12, 2.7, 1.2);
        return 1.0;
      }
      if (ev === 'hurt') {
        sBell(c, out, 1300 + r() * 600, 0, 0.5, 0.35, 2.76, 1.5);
        sNoise(c, out, { f: 3500, type: 'highpass', amp: [[0, 0], [0.003, 0.4], [0.06, 0]] });
        return 0.5;
      }
      return 0.05;
    } }
};

// Art → Stimme (sonst nach Form)
const VOICE_OF = {
  hund: 'dog', schakal: 'dog', fuchs: 'fox', hyaene: 'hyena',
  wolf: 'wolf', alphawolf: 'wolf', eiswolf: 'wolf', moorwolf: 'wolf', warg: 'wolf', fenris: 'wolf', hoellenhund: 'hellhound',
  wildschwein: 'boar', dornenkeiler: 'boar',
  braunbaer: 'bear', eisbaer: 'bear', ursus: 'bear',
  luchs: 'cat', panther: 'cat', glutkatze: 'cat',
  hirsch: 'deer', donnerbock: 'deer', mammut: 'mammoth',
  waldspinne: 'spider', hoehlenspinne: 'spider', giftspinne: 'spider', spinnenkoenigin: 'spider',
  skorpion: 'scorpion',
  sandviper: 'snake', kobra: 'snake', riesenpython: 'snake', klapperschlange: 'rattle',
  naga: 'naga', nagapriesterin: 'naga', nagakoenigin: 'naga', vritra: 'naga',
  sumpfhexe: 'witch',
  untoter: 'undead', grabwaechter: 'undead', gruftkoenig: 'undead', ghul: 'undead', morrak: 'undead',
  lavagolem: 'golem', eisgolem: 'golem', steintitan: 'golem', tarkon: 'golem',
  frostgeist: 'ghost', seelenfresser: 'ghost', eiskoenig: 'ghost',
  harpyie: 'harpy', gargoyle: 'harpy',
  feuerdrache: 'dragon', drachenbrut: 'dragon', urdrache: 'dragon', ignar: 'dragon'
};
const VOICE_OF_SHAPE = { beast: 'wolf', boar: 'boar', humanoid: 'human', orc: 'orc', brute: 'brute', demon: 'demon', ghost: 'ghost', snake: 'snake' };
function voiceOf(m) {
  if (m.isStone) return 'stone';
  return VOICE_OF[m.typeId] || VOICE_OF_SHAPE[m.type && m.type.shape] || 'brute';
}

// --- Klänge der Spieler ----------------------------------------------------------------------------
const PLAYER_SND = {
  // Schwung: Luft zischt vorbei (leicht, mittel, schwer)
  whoosh_l: (c, out) => { sNoise(c, out, { f: [[0, 900], [0.09, 3200], [0.18, 1500]], q: 1.6, amp: [[0, 0], [0.05, 0.55], [0.18, 0]] }); return 0.2; },
  whoosh_m: (c, out) => { sNoise(c, out, { f: [[0, 600], [0.12, 2400], [0.26, 900]], q: 1.4, amp: [[0, 0], [0.08, 0.65], [0.26, 0]] }); return 0.28; },
  whoosh_h: (c, out) => {
    sNoise(c, out, { f: [[0, 350], [0.18, 1500], [0.38, 500]], q: 1.2, amp: [[0, 0], [0.12, 0.8], [0.38, 0]] });
    sNoise(c, out, { f: 180, type: 'lowpass', amp: [[0, 0], [0.15, 0.35], [0.38, 0]], color: 'brown' });
    return 0.4;
  },
  // Treffer: dumpfer Schlag mit kurzem Knacken
  hit: (c, out, r) => {
    sTone(c, out, { f: [[0, 150 + r() * 30], [0.12, 55]], amp: [[0, 0], [0.003, 0.9], [0.14, 0]] });
    sNoise(c, out, { f: 1800, q: 0.8, amp: [[0, 0], [0.002, 0.7], [0.05, 0]] });
    sNoise(c, out, { f: 400, type: 'lowpass', amp: [[0, 0], [0.003, 0.5], [0.09, 0]], color: 'brown' });
    return 0.16;
  },
  // Bogen: Sehne schnalzt, Pfeil zischt
  bow: (c, out) => {
    sTone(c, out, { type: 'sawtooth', f: [[0, 130], [0.12, 110]], amp: [[0, 0], [0.002, 0.45], [0.14, 0]], lp: 1200 });
    sNoise(c, out, { at: 0.02, f: [[0, 3000], [0.2, 1500]], q: 2, amp: [[0, 0], [0.02, 0.35], [0.22, 0]] });
    return 0.25;
  },
  // Zauber je Element
  el_klinge: (c, out, r) => {
    sNoise(c, out, { f: [[0, 2500], [0.25, 6000]], q: 2, amp: [[0, 0], [0.03, 0.6], [0.3, 0]] });
    sBell(c, out, 2200 + r() * 300, 0.03, 0.5, 0.15, 1.41, 1.2);
    return 0.55;
  },
  el_erde: (c, out) => {
    sTone(c, out, { f: [[0, 90], [0.4, 38]], amp: [[0, 0], [0.01, 0.9], [0.45, 0]] });
    sNoise(c, out, { f: 300, type: 'lowpass', amp: [[0, 0], [0.02, 0.8], [0.6, 0]], color: 'brown', rough: [14, 0.5] });
    return 0.65;
  },
  el_feuer: (c, out) => {
    sNoise(c, out, { f: [[0, 300], [0.5, 1400]], q: 0.7, amp: [[0, 0], [0.12, 0.8], [0.45, 0.5], [0.65, 0]], color: 'pink' });
    sNoise(c, out, { f: 3500, q: 1, amp: [[0, 0], [0.1, 0.25], [0.6, 0]], rough: [19, 0.9] });
    return 0.7;
  },
  el_schatten: (c, out) => {
    sVoice(c, out, { f: [[0, 70], [0.6, 55]], amp: [[0, 0], [0.25, 0.5], [0.7, 0]], form: FORM.u, breath: 0.6, vib: [3, 30], type: 'sawtooth' });
    sNoise(c, out, { f: [[0, 2000], [0.6, 500]], q: 3, amp: [[0, 0], [0.3, 0.3], [0.7, 0]] });
    return 0.75;
  },
  el_seele: (c, out) => {
    sVoice(c, out, { f: [[0, 520], [0.6, 690]], amp: [[0, 0], [0.15, 0.45], [0.7, 0]], form: FORM.u, breath: 0.5, vib: [7, 35], type: 'triangle' });
    sNoise(c, out, { f: 4000, q: 3, amp: [[0, 0], [0.2, 0.2], [0.7, 0]] });
    return 0.75;
  },
  el_blitz: (c, out, r) => {
    for (let i = 0; i < 4; i++) sTone(c, out, { at: i * 0.05, type: 'sawtooth', f: [[0, 1800 + r() * 1500], [0.05, 120]], amp: [[0, 0], [0.002, 0.35], [0.06, 0]] });
    sNoise(c, out, { f: 3500, q: 0.6, amp: [[0, 0], [0.005, 0.8], [0.12, 0.3], [0.45, 0]], rough: [55, 0.9] });
    sTone(c, out, { f: [[0, 70], [0.45, 40]], amp: [[0, 0], [0.01, 0.5], [0.5, 0]] });
    return 0.5;
  },
  el_eis: (c, out, r) => {
    for (let i = 0; i < 5; i++) sBell(c, out, 2400 + r() * 2200, i * 0.04, 0.6, 0.13, 2.76, 1.3);
    sNoise(c, out, { f: 6000, type: 'highpass', amp: [[0, 0], [0.004, 0.6], [0.12, 0]] });
    return 0.7;
  },
  el_wind: (c, out) => {
    sNoise(c, out, { f: [[0, 500], [0.3, 1800], [0.7, 700]], q: 2.2, amp: [[0, 0], [0.2, 0.7], [0.7, 0]], color: 'pink' });
    return 0.72;
  },
  el_licht: (c, out) => {
    [880, 1109, 1319, 1760].forEach((f, i) => sBell(c, out, f, i * 0.05, 1.2, 0.14, 1.0, 0.6));
    sNoise(c, out, { f: 7000, type: 'highpass', amp: [[0, 0], [0.3, 0.12], [1.0, 0]] });
    return 1.25;
  },
  el_blut: (c, out) => {
    sNoise(c, out, { f: [[0, 900], [0.25, 300]], q: 3, amp: [[0, 0], [0.01, 0.8], [0.3, 0]] });
    sTone(c, out, { f: [[0, 160], [0.3, 70]], amp: [[0, 0], [0.01, 0.5], [0.3, 0]] });
    return 0.35;
  },
  el_knochen: (c, out, r) => {
    sClicks(c, out, 7, 0.035, 2200, 0.7, r);
    sTone(c, out, { f: [[0, 260], [0.2, 120]], amp: [[0, 0], [0.004, 0.5], [0.2, 0]] });
    return 0.35;
  },
  el_frost: (c, out, r) => PLAYER_SND.el_eis(c, out, r),
  // Stimmen der Spieler: Schmerz und Tod, männlich und weiblich
  hurt_m: (c, out, r) => { sVoice(c, out, { f: [[0, 175 + r() * 20], [0.22, 120]], amp: [[0, 0], [0.01, 0.9], [0.22, 0]], form: FORM.u, breath: 0.35, drive: 0.1 }); return 0.24; },
  hurt_f: (c, out, r) => { sVoice(c, out, { f: [[0, 360 + r() * 30], [0.2, 250]], amp: [[0, 0], [0.01, 0.85], [0.2, 0]], form: FORM.a, breath: 0.4 }); return 0.22; },
  die_m: (c, out) => { sVoice(c, out, { f: [[0, 190], [0.9, 85]], amp: [[0, 0], [0.04, 0.9], [0.6, 0.6], [1.0, 0]], form: FORM.a, breath: 0.4, drive: 0.1, rough: [12, 0.3] }); bodyFall(c, out, 0.85, 0.5); return 1.1; },
  die_f: (c, out) => { sVoice(c, out, { f: [[0, 400], [0.9, 190]], amp: [[0, 0], [0.04, 0.85], [0.6, 0.6], [1.0, 0]], form: FORM.a, breath: 0.45, rough: [10, 0.25] }); bodyFall(c, out, 0.85, 0.45); return 1.1; },
  // Stufenaufstieg: aufsteigendes Glockenspiel
  levelup: (c, out) => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => sBell(c, out, f, i * 0.09, 1.4, 0.2, 1.0, 0.8));
    sBell(c, out, 2093, 0.5, 1.6, 0.1, 2.0, 0.5);
    return 2.1;
  },
  // Gold: Münzen klimpern
  coin: (c, out, r) => {
    for (let i = 0; i < 4; i++) sBell(c, out, 2600 + r() * 1400, i * 0.045 + r() * 0.02, 0.28, 0.12, 2.4, 1.1);
    return 0.45;
  },
  // Gegenstand aufgehoben: weicher Glanz
  item: (c, out) => { sBell(c, out, 1175, 0, 0.5, 0.18, 2.0, 0.7); sBell(c, out, 1760, 0.07, 0.6, 0.12, 2.0, 0.6); return 0.7; },
  // Trank: Gluckern und Funkeln
  potion: (c, out, r) => {
    for (let i = 0; i < 3; i++) sTone(c, out, { at: i * 0.11, f: [[0, 260 + r() * 60], [0.09, 520 + r() * 80]], amp: [[0, 0], [0.01, 0.5], [0.09, 0]] });
    sBell(c, out, 1900, 0.36, 0.5, 0.1, 2.0, 0.6);
    return 0.85;
  }
};

// --- Abspielen ---------------------------------------------------------------------------------------
const snd = {
  bufs: new Map(),
  busy: new Set(),
  last: new Map(),
  active: 0,

  // Puffer bereitstellen (beim ersten Mal vorberechnen); liefert ihn, wenn schon fertig
  buffer(key, build, seed) {
    const b = this.bufs.get(key);
    if (b) return b;
    if (this.busy.has(key) || !sfx.on) return null;
    this.busy.add(key);
    let len = 0;
    // Länge vorab messen: Bauen in einen stummen Mess-Kontext ist zu teuer, darum großzügig 2,2 s und danach kürzen
    sndRender(2.2, (c, out) => { len = build(c, out, sndRand(seed)) || 1; }).then((buf) => {
      this.busy.delete(key);
      if (!buf) return;
      const n = Math.min(buf.length, Math.ceil((len + 0.25) * buf.sampleRate));
      const ctx = sfx.ctx;
      if (!ctx) return;
      const cut = ctx.createBuffer(1, n, buf.sampleRate);
      const d = cut.getChannelData(0);
      d.set(buf.getChannelData(0).subarray(0, n));
      // auf gleiche Spitze bringen (leise Laute lauter, übersteuerte zurück); die Lautstärke regelt dann play()
      let peak = 0;
      for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
      if (peak > 0.001) {
        const k = Math.min(4, 0.9 / peak);
        for (let i = 0; i < n; i++) d[i] *= k;
      }
      this.bufs.set(key, cut);
      const w = this.wait && this.wait.get(key);
      if (w && performance.now() - w.at < 250) this.out(cut, w.o);
      if (w) this.wait.delete(key);
    });
    return null;
  },

  // Abspielen: o.x/o.y Weltort (sonst mittig), o.vol, o.rate, o.rev (Hallanteil)
  out(buf, o) {
    const c = sfx.ac();
    if (!c || !buf || this.active >= 18) return;
    let vol = o.vol == null ? 1 : o.vol;
    let pan = 0;
    const p = game.player;
    if (p && o.x != null) {
      let dx = o.x - p.x;
      const dy = o.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 900) return;
      vol *= d < 140 ? 1 : Math.pow(Math.max(0, 1 - (d - 140) / 760), 1.6);
      // im Schulterblick zur Kamera gedreht
      if (typeof V3 !== 'undefined' && V3.on && V3.yaw) {
        const cs = Math.cos(V3.yaw);
        const sn = Math.sin(V3.yaw);
        dx = dx * cs - dy * sn;
      }
      pan = Math.max(-0.85, Math.min(0.85, dx / 420));
    }
    if (vol < 0.02) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = o.rate || 1;
    const g = c.createGain();
    g.gain.value = vol * 0.9;
    src.connect(g);
    let node = g;
    if (pan && c.createStereoPanner) {
      const pn = c.createStereoPanner();
      pn.pan.value = pan;
      g.connect(pn);
      node = pn;
    }
    node.connect(sfx.master);
    const rev = o.rev == null ? 0.18 : o.rev;
    if (rev > 0 && sfx.verb) {
      const sg = c.createGain();
      sg.gain.value = rev;
      node.connect(sg);
      sg.connect(sfx.verb);
    }
    this.active++;
    src.onended = () => { this.active--; };
    src.start();
  },

  play(key, build, o = {}) {
    if (!sfx.on || !sfx.ctx) return;
    // derselbe Klang höchstens alle 40 ms
    const now = performance.now();
    if (now - (this.last.get(key) || 0) < 40) return;
    this.last.set(key, now);
    const v = Math.floor(Math.random() * (o.variants || SND_VARIANTS));
    const k = key + '#' + v;
    const buf = this.buffer(k, build, sndHash(k));
    if (buf) this.out(buf, o);
    else {
      if (!this.wait) this.wait = new Map();
      this.wait.set(k, { at: now, o });
    }
  },

  player(key, o = {}) {
    const b = PLAYER_SND[key];
    if (b) this.play('p:' + key, b, o);
  },

  // Monsterlaut: Höhe nach Größe (große Monster tiefer), Bosse lauter und mit mehr Hall
  mob(m, ev) {
    const name = voiceOf(m);
    const V = VOICES[name];
    if (!V) return;
    const build = V.build ? (c, out, r) => V.build(c, out, ev, r) : (c, out, r) => vocal(c, out, V.v, ev, r);
    const size = (m.type && m.type.size) || 14;
    const boss = !!(m.type && (m.type.boss || m.type.raid));
    const rate = Math.max(0.6, Math.min(1.3, Math.pow(14 / size, 0.35))) * (0.95 + Math.random() * 0.1);
    this.play('m:' + name + ':' + ev, build, { x: m.x, y: m.y, rate, vol: (boss ? 0.9 : 0.6) * (ev === 'hurt' ? 0.7 : ev === 'death' ? 0.85 : 1), rev: boss ? 0.4 : 0.2 });
  },

  // Schwung der Waffe (im Treffer-Bild)
  swing(p) {
    const kind = weaponKindOf(p);
    const key = kind === 'dagger' ? 'whoosh_l' : kind === 'greatsword' || kind === 'greataxe' || kind === 'scythe' ? 'whoosh_h' : 'whoosh_m';
    this.player(key, { x: p.x, y: p.y, vol: p === game.player ? 0.42 : 0.28, rate: 0.92 + Math.random() * 0.16 });
  },

  // Schuss des Grundangriffs
  shot(p, basic) {
    if (basic.style === 'arrow') this.player('bow', { x: p.x, y: p.y, vol: 0.5 });
    else if (basic.el) this.player('el_' + (basic.el === 'frost' ? 'eis' : basic.el), { x: p.x, y: p.y, vol: 0.45, rate: 1.25 });
    else if (basic.style === 'wind') this.player('el_wind', { x: p.x, y: p.y, vol: 0.5, rate: 1.3 });
    else this.player('el_seele', { x: p.x, y: p.y, vol: 0.45, rate: 1.3 });
  },

  // Fertigkeit nach Element (Magier: eigenes Element)
  skill(sk, p) {
    let el = sk.el || (typeof SKILL_ELEMENT !== 'undefined' && SKILL_ELEMENT[sk.id]) || 'klinge';
    if (el === 'frost') el = 'eis';
    if (!PLAYER_SND['el_' + el]) el = 'klinge';
    this.player('el_' + el, { x: p.x, y: p.y, vol: p === game.player ? 0.6 : 0.4, rev: 0.3 });
  },

  hurt(p) {
    const female = p.look ? p.look.sex === 1 : DEFAULT_LOOKS[p.classId] && DEFAULT_LOOKS[p.classId].sex === 1;
    this.player(female ? 'hurt_f' : 'hurt_m', { vol: 0.5, variants: 3 });
  },
  die(p) {
    const female = p.look ? p.look.sex === 1 : DEFAULT_LOOKS[p.classId] && DEFAULT_LOOKS[p.classId].sex === 1;
    this.player(female ? 'die_f' : 'die_m', { vol: 0.7, rev: 0.4, variants: 1 });
  },

  // Jedes Bild: Monster in der Nähe beobachten – Angriff, Treffer, Tod und erster Angriff auf dich.
  // So hören alle im Kanal dieselben Laute, egal wer das Monster führt oder trifft.
  update() {
    if (!sfx.on || !sfx.ctx || !game.player || !game.running) return;
    const p = game.player;
    const t = game.time;
    for (const m of game.monsters) {
      const dx = m.x - p.x;
      const dy = m.y - p.y;
      if (dx * dx + dy * dy > 810000) {
        m._sDead = m.dead;
        continue;
      }
      if (m.dead) {
        if (!m._sDead) {
          m._sDead = true;
          this.mob(m, 'death');
        }
        continue;
      }
      m._sDead = false;
      const s = m._snd || (m._snd = { atk: false, hit: 0, hurtAt: -9, aggroAt: -99, state: m.state });
      // Treffer: Aufprall immer, Schmerzlaut höchstens alle 0,5 s
      if (m.hitFlash > s.hit + 0.02) {
        if (!m.isStone) this.player('hit', { x: m.x, y: m.y, vol: 0.55, rate: 0.9 + Math.random() * 0.2 });
        if (t - s.hurtAt > 0.5) {
          s.hurtAt = t;
          this.mob(m, 'hurt');
        }
      }
      s.hit = m.hitFlash || 0;
      if (m.isStone) continue;
      // Angriff: steigende Flanke der Angriffsanimation (bei allen im Kanal)
      const atk = m.attackAnim > 0;
      if (atk && !s.atk) this.mob(m, 'attack');
      s.atk = atk;
      // Schrei, wenn ein Monster dich ins Visier nimmt (höchstens alle 8 s je Monster)
      if (m.state === 'chase' && s.state !== 'chase' && t - s.aggroAt > 8) {
        s.aggroAt = t;
        this.mob(m, 'aggro');
      }
      s.state = m.state;
    }
  },

  // Häufige Klänge vorab berechnen, damit der erste Schlag nicht stumm bleibt
  warm() {
    for (const k of ['whoosh_l', 'whoosh_m', 'whoosh_h', 'hit', 'bow', 'coin', 'item', 'potion', 'hurt_m', 'hurt_f']) {
      for (let v = 0; v < SND_VARIANTS; v++) this.buffer('p:' + k + '#' + v, PLAYER_SND[k], sndHash('p:' + k + '#' + v));
    }
  }
};
