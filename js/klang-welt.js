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

// Stimme (seit 9.5 natürlicher): Sägezahn mit Unterton, Atemrauschen und Luftstoß am Anfang, durch drei
// Formantfilter, die sich mit dem „Maul“ öffnen und schließen. Tonhöhe und Lautstärke zittern leicht und
// unregelmäßig (wie bei echten Stimmen), das Knurren pulsiert unregelmäßig statt gleichmäßig.
//   o.f Tonhöhe [[t, hz]], o.amp Lautstärke [[t, v]], o.form Formanten [[hz, q, g]], o.mouth Formant-Faktor
//   [[t, k]], o.breath 0…1, o.sub Unterton 0…1, o.rough [hz, tiefe], o.vib [hz, cent], o.jit Zittern (Anteil),
//   o.onset Luftstoß 0…1, o.drive 0…1, o.lp Tiefpass, o.type Wellenform, o.at Startzeit
function sCurve(pts, t, expo) {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [ta, va] = pts[i - 1];
      const [tb, vb] = pts[i];
      const u = (t - ta) / Math.max(1e-6, tb - ta);
      return expo && va > 0 && vb > 0 ? va * Math.pow(vb / va, u) : va + (vb - va) * u;
    }
  }
  return pts[pts.length - 1][1];
}
function sVoice(c, out, o) {
  const t0 = o.at || 0;
  const dur = o.amp[o.amp.length - 1][0];
  const rnd = o.rnd || Math.random;
  const jit = o.jit == null ? 0.012 : o.jit;
  // Tonhöhe alle 10 ms aus dem Verlauf, mit Zittern (Zufallsweg) und Vibrato
  const osc = c.createOscillator();
  osc.type = o.type || 'sawtooth';
  const sub = o.sub ? c.createOscillator() : null;
  if (sub) sub.type = 'sawtooth';
  let w = 0;
  for (let t = 0; t <= dur + 0.0001; t += 0.01) {
    w = w * 0.7 + (rnd() * 2 - 1) * jit;
    const vib = o.vib ? Math.sin(t * Math.PI * 2 * o.vib[0]) * (Math.pow(2, o.vib[1] / 1200) - 1) * Math.min(1, t / 0.15) : 0;
    const hz = Math.max(20, sCurve(o.f, t, true) * (1 + w + vib));
    if (t === 0) {
      osc.frequency.setValueAtTime(hz, t0);
      if (sub) sub.frequency.setValueAtTime(hz / 2, t0);
    } else {
      osc.frequency.linearRampToValueAtTime(hz, t0 + t);
      if (sub) sub.frequency.linearRampToValueAtTime(hz / 2, t0 + t);
    }
  }
  const src = c.createGain();
  osc.connect(src);
  if (sub) {
    const sg = c.createGain();
    sg.gain.value = o.sub * 0.8;
    sub.connect(sg);
    sg.connect(src);
  }
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
    // unregelmäßiges Pulsieren: halb gleichmäßig, halb aus gefiltertem Rauschen
    const am = c.createGain();
    am.gain.value = 1 - o.rough[1] / 2;
    const lfo = c.createOscillator();
    lfo.type = 'triangle';
    lfo.frequency.value = o.rough[0];
    const lg = c.createGain();
    lg.gain.value = o.rough[1] / 4;
    lfo.connect(lg);
    lg.connect(am.gain);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.05);
    const nz = sNoiseSrc(c, dur + 0.05);
    const nf = c.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = o.rough[0];
    const ng = c.createGain();
    ng.gain.value = o.rough[1] * 1.6;
    nz.connect(nf);
    nf.connect(ng);
    ng.connect(am.gain);
    nz.start(t0);
    node.connect(am);
    node = am;
  }
  if (o.drive) {
    const d = sDrive(c, o.drive);
    node.connect(d);
    node = d;
  }
  const sum = c.createGain();
  const mouth = o.mouth;
  for (const [hz, q, g] of o.form || [[700, 3, 1]]) {
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    if (mouth) {
      bp.frequency.setValueAtTime(hz * mouth[0][1], t0 + mouth[0][0]);
      for (let i = 1; i < mouth.length; i++) bp.frequency.linearRampToValueAtTime(hz * mouth[i][1], t0 + mouth[i][0]);
    } else bp.frequency.value = hz;
    bp.Q.value = q;
    const gg = c.createGain();
    gg.gain.value = g * Math.sqrt(q) * 0.9;
    node.connect(bp);
    bp.connect(gg);
    gg.connect(sum);
  }
  // Luftstoß am Anfang (Bellen, „Ha!“, Fauchen)
  if (o.onset) sNoise(c, out, { at: t0, f: (o.form ? o.form[1][0] : 1500) * 1.2, q: 0.9, amp: [[0, 0], [0.003, o.onset * (o.vol || 1)], [0.03, 0]] });
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = o.lp || 6000;
  // Lautstärke mit leichtem Flackern (alle 15 ms)
  const env = c.createGain();
  const shim = o.shimmer == null ? 0.06 : o.shimmer;
  env.gain.setValueAtTime(o.amp[0][1] * (o.vol || 1), t0);
  for (let t = 0.015; t < dur; t += 0.015) env.gain.linearRampToValueAtTime(Math.max(0, sCurve(o.amp, t) * (1 + (rnd() - 0.5) * shim) * (o.vol || 1)), t0 + t);
  env.gain.linearRampToValueAtTime(o.amp[o.amp.length - 1][1] * (o.vol || 1), t0 + dur);
  sum.connect(lp);
  lp.connect(env);
  env.connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
  if (sub) {
    sub.start(t0);
    sub.stop(t0 + dur + 0.05);
  }
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

// --- Körnige Klänge (seit 9.6): direkt als Samples berechnet ---------------------------------------------
// Viele winzige Einzelklänge (Körner): Knistern von Feuer, Knirschen und Splittern von Eis, Geröll, Funken.
// Jedes Korn ist ein kurzer, abklingender Resonanzton aus Rauschen (Frequenz zufällig zwischen f[0] und f[1]),
// Lautstärke zufällig mit langem Schwanz (wenige laute Knacker, viele leise). o.rate: Körner pro Sekunde
// (Zahl oder Verlauf [[t, rate]]), o.dec: Abklingzeit [min, max] in s, o.q: Schärfe (0.9 = weich … 0.995 = klingend)
function sGrains(c, out, o, r) {
  const at = o.at || 0;
  const dur = o.dur;
  const sr = c.sampleRate;
  const len = Math.ceil((dur + 0.15) * sr);
  const buf = c.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const env = o.amp || [[0, 1], [dur, 1]];
  const rate = Array.isArray(o.rate) ? o.rate : [[0, o.rate], [dur, o.rate]];
  let t = 0;
  while (t < dur) {
    const rt = Math.max(1, sCurve(rate, t));
    t += -Math.log(1 - r() * 0.999) / rt;
    if (t >= dur) break;
    const a = (o.vol || 0.5) * sCurve(env, t) * Math.pow(r(), o.tail || 2.2);
    if (a < 0.002) continue;
    const f = o.f[0] * Math.pow(o.f[1] / o.f[0], r());
    const dec = o.dec[0] + (o.dec[1] - o.dec[0]) * r();
    const rr = Math.pow(o.q || 0.97, 22050 / sr);
    const w = 2 * Math.PI * f / sr;
    const c1 = 2 * rr * Math.cos(w);
    const c2 = -rr * rr;
    let y1 = 0;
    let y2 = 0;
    const n0 = Math.floor(t * sr);
    const n = Math.min(len - n0, Math.ceil(dec * 5 * sr));
    const g = (1 - rr) * 2.2;
    for (let i = 0; i < n; i++) {
      const x = i < sr * 0.0015 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.15;
      const y = c1 * y1 + c2 * y2 + x * g;
      y2 = y1;
      y1 = y;
      d[n0 + i] += y * a * Math.exp(-i / (dec * sr));
    }
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(out);
  src.start(at);
}

// Blasen (Wasser): kurze Sinustöne, deren Höhe schnell steigt (so klingt eine platzende Luftblase)
function sBubbles(c, out, o, r) {
  const at = o.at || 0;
  const sr = c.sampleRate;
  const len = Math.ceil((o.dur + 0.1) * sr);
  const buf = c.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  let t = r() * 0.02;
  while (t < o.dur) {
    const f0 = o.f[0] * Math.pow(o.f[1] / o.f[0], r());
    const bd = 0.015 + r() * 0.04;
    const a = (o.vol || 0.4) * (0.3 + r() * 0.7);
    const n0 = Math.floor(t * sr);
    let ph = 0;
    for (let i = 0; i < bd * sr && n0 + i < len; i++) {
      const k = i / (bd * sr);
      ph += 2 * Math.PI * f0 * (1 + 1.8 * k * k) / sr;
      d[n0 + i] += Math.sin(ph) * a * Math.exp(-k * 4) * Math.min(1, i / 20);
    }
    t += -Math.log(1 - r() * 0.999) / o.rate;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(out);
  src.start(at);
}

// Grollen (Donner, Erdbeben): tiefes Rauschen, dessen Lautstärke unregelmäßig an- und abschwillt
function sRumble(c, out, o, r) {
  const at = o.at || 0;
  const pts = [[0, 0], [o.attack || 0.03, o.vol]];
  for (let t = (o.attack || 0.03) + 0.1; t < o.dur - 0.1; t += 0.08 + r() * 0.14) pts.push([t, o.vol * (0.35 + r() * 0.65) * (1 - t / o.dur * 0.6)]);
  pts.push([o.dur, 0]);
  sNoise(c, out, { at, f: o.f || [[0, 260], [o.dur, 90]], type: 'lowpass', q: 0.7, amp: pts, color: 'brown' });
}

// Metallklang (Klinge): unharmonische Teiltöne wie bei einer angeschlagenen Stahlplatte
function sMetal(c, out, f, at, dur, vol) {
  [[1, 1], [2.76, 0.5], [5.4, 0.3], [8.93, 0.18]].forEach(([k, g]) => sTone(c, out, { at, f: f * k, amp: [[0, 0], [0.002, vol * g], [dur * (1.2 - k * 0.08), 0]] }));
}

// --- Vokale (Formanten) ----------------------------------------------------------------------------
const FORM = {
  a: [[780, 6, 1], [1180, 8, 0.6], [2500, 12, 0.25]],
  o: [[470, 6, 1], [840, 8, 0.55], [2600, 12, 0.18]],
  u: [[330, 5, 1], [720, 8, 0.4], [2400, 12, 0.12]],
  e: [[430, 6, 1], [1750, 10, 0.5], [2650, 12, 0.3]],
  m: [[250, 5, 1], [1100, 8, 0.12], [2300, 10, 0.06]],
  growl: [[240, 3, 1], [650, 5, 0.65], [1700, 7, 0.3]],
  roar: [[380, 3, 1], [950, 4, 0.75], [2300, 6, 0.35]],
  snarl: [[620, 4, 1], [1500, 6, 0.75], [3200, 8, 0.45]],
  yelp: [[900, 5, 1], [1800, 7, 0.6], [3400, 9, 0.3]],
  bark: [[600, 4, 1], [1400, 6, 0.7], [2900, 8, 0.35]],
  nasal: [[300, 5, 1], [1250, 7, 0.45], [2600, 9, 0.15]]
};

// Grundlaut einer Stimme: v = { p, form, rough, drive, breath, vib, sub, lp }; Länge nach Ereignis.
// Seit 9.5 mit Maulbewegung (Formanten öffnen sich beim Schrei und schließen sich am Ende), Zittern und Luftstoß.
function vocal(c, out, v, ev, rnd, extra = {}) {
  const p = v.p * (0.94 + rnd() * 0.12);
  const base = { form: v.form, rough: v.rough, drive: v.drive, breath: v.breath, vib: v.vib, sub: v.sub, lp: v.lp, type: v.type, jit: v.jit == null ? 0.02 : v.jit, rnd, vol: 0.9 };
  if (ev === 'aggro') {
    const d = (v.long || 0.85) * (0.9 + rnd() * 0.2);
    sVoice(c, out, { ...base, onset: 0.3, f: [[0, p * 0.8], [d * 0.2, p * 1.3], [d * 0.55, p * 1.2], [d, p * 0.7]], mouth: [[0, 0.75], [d * 0.2, 1.15], [d * 0.7, 1.05], [d, 0.8]], amp: [[0, 0], [0.05, 1], [d * 0.6, 0.85], [d, 0]], ...extra });
    return d;
  }
  if (ev === 'attack') {
    const d = 0.26 * (0.85 + rnd() * 0.3);
    sVoice(c, out, { ...base, onset: 0.45, f: [[0, p * 1.2], [d * 0.3, p * 1.1], [d, p * 0.8]], mouth: [[0, 0.85], [0.04, 1.15], [d, 0.85]], amp: [[0, 0], [0.012, 1], [d * 0.5, 0.7], [d, 0]], rough: v.rough ? [v.rough[0], Math.min(1, v.rough[1] * 1.3)] : null, ...extra });
    return d;
  }
  if (ev === 'hurt') {
    const d = 0.18 * (0.85 + rnd() * 0.3);
    sVoice(c, out, { ...base, onset: 0.35, jit: (base.jit || 0.02) * 1.8, f: [[0, p * 1.75], [d * 0.25, p * 1.9], [d, p * 1.05]], mouth: [[0, 1.1], [d, 0.85]], amp: [[0, 0], [0.008, 0.9], [d, 0]], ...extra });
    return d;
  }
  const d = (v.dieLen || 1.15) * (0.9 + rnd() * 0.2);
  sVoice(c, out, { ...base, jit: (base.jit || 0.02) * 1.6, f: [[0, p * 1.3], [d * 0.25, p * 1.05], [d, p * 0.4]], mouth: [[0, 1.1], [d * 0.4, 1], [d, 0.7]], amp: [[0, 0], [0.04, 1], [d * 0.45, 0.7], [d, 0]], rough: v.rough ? [v.rough[0] * 0.7, Math.min(1, v.rough[1] * 1.4)] : [18, 0.4], ...extra });
  return d;
}

// Körperfall beim Tod: dumpfer Aufprall
function bodyFall(c, out, at, vol = 0.5) {
  sTone(c, out, { at, f: [[0, 120], [0.18, 48]], amp: [[0, 0], [0.006, vol], [0.22, 0]] });
  sNoise(c, out, { at, f: 500, type: 'lowpass', amp: [[0, 0], [0.004, vol * 0.6], [0.16, 0]], color: 'brown' });
}

// Bellen (Hund, Schakal): Luftstoß, Ton springt hoch und fällt, Maul öffnet sich schnell und schließt sich
function bark(c, out, at, p, r, k = 1) {
  const d = 0.13 * k;
  sVoice(c, out, { at, rnd: r, onset: 0.7, jit: 0.04, sub: 0.25, f: [[0, p * 0.85], [0.025, p * 1.15], [d, p * 0.7]], mouth: [[0, 0.65], [0.03, 1.2], [d, 0.8]], amp: [[0, 0], [0.006, 1], [0.04, 0.8], [d, 0]], form: FORM.bark, rough: [70, 0.35], breath: 0.35, drive: 0.3 });
  return d;
}

// --- Stimmen der Monster ---------------------------------------------------------------------------
// Jede Familie: eigene Bau-Funktion oder die Grundwerte v für vocal(). Seit 9.5 nach dem Vorbild echter Laute:
// Hunde bellen kurz mit Luftstoß, Wölfe heulen lang und rein, Bären und Riesen brüllen mit Unterton und
// unregelmäßigem Rasseln, Keiler grunzen nasal und quieken, Katzen fauchen, Hirsche röhren, Füchse kreischen.
const VOICES = {
  dog: { v: { p: 420, form: FORM.bark, rough: [60, 0.4], breath: 0.3, drive: 0.25, sub: 0.2 },
    build(c, out, ev, r) {
      if (ev === 'aggro') {
        const n = 2 + Math.floor(r() * 2);
        for (let i = 0; i < n; i++) bark(c, out, i * (0.19 + r() * 0.06), 430 + r() * 70, r);
        return n * 0.24;
      }
      if (ev === 'attack') {
        // Knurren, dann Zuschnappen
        sVoice(c, out, { rnd: r, f: [[0, 120], [0.18, 105]], amp: [[0, 0], [0.03, 0.7], [0.18, 0]], form: FORM.growl, rough: [30, 0.8], breath: 0.5, sub: 0.5, drive: 0.3 });
        bark(c, out, 0.16, 470 + r() * 60, r, 0.8);
        return 0.3;
      }
      if (ev === 'hurt') {
        // Aufjaulen
        sVoice(c, out, { rnd: r, onset: 0.3, jit: 0.03, f: [[0, 1050], [0.05, 1250], [0.24, 700]], mouth: [[0, 1.1], [0.24, 0.8]], amp: [[0, 0], [0.01, 0.9], [0.24, 0]], form: FORM.yelp, breath: 0.2 });
        return 0.26;
      }
      // Winseln, leiser werdend
      for (let i = 0; i < 3; i++) sVoice(c, out, { rnd: r, at: i * 0.32, f: [[0, 900 - i * 120], [0.28, 650 - i * 100]], amp: [[0, 0], [0.04, 0.8 - i * 0.2], [0.28, 0]], form: FORM.yelp, breath: 0.3 });
      bodyFall(c, out, 0.9, 0.35);
      return 1.05;
    } },
  fox: { v: { p: 820, form: FORM.snarl, breath: 0.35, drive: 0.45, jit: 0.05, long: 0.55 },
    build(c, out, ev, r) {
      if (ev === 'aggro' || ev === 'death') {
        // Fuchsschrei: rau, hoch und kurz abgehackt
        const n = ev === 'aggro' ? 2 : 1;
        for (let i = 0; i < n; i++) sVoice(c, out, { rnd: r, at: i * 0.45, onset: 0.3, jit: 0.06, f: [[0, 900], [0.08, 1250], [0.35, 800]], mouth: [[0, 0.8], [0.08, 1.2], [0.35, 0.9]], amp: [[0, 0], [0.02, 1], [0.25, 0.7], [0.38, 0]], form: FORM.snarl, rough: [45, 0.5], breath: 0.4, drive: 0.5 });
        return n * 0.45;
      }
      return vocal(c, out, this.v, ev, r);
    } },
  hyena: { v: { p: 420, form: FORM.a, breath: 0.3, drive: 0.25 },
    build(c, out, ev, r) {
      if (ev === 'aggro') {
        // Hyänenruf: lang ansteigendes „Huuup“
        sVoice(c, out, { rnd: r, f: [[0, 300], [0.7, 900], [0.8, 950]], mouth: [[0, 0.7], [0.8, 1.1]], amp: [[0, 0], [0.1, 0.9], [0.7, 0.8], [0.85, 0]], form: FORM.u, breath: 0.2, vib: [6, 18] });
        return 0.88;
      }
      if (ev === 'death' || ev === 'hurt') {
        // Kichern: schnelle, fallende Silben
        const n = ev === 'death' ? 6 : 3;
        for (let i = 0; i < n; i++) sVoice(c, out, { rnd: r, at: i * 0.1, onset: 0.2, jit: 0.04, f: [[0, 620 - i * 35], [0.07, 500 - i * 35]], amp: [[0, 0], [0.006, 0.9], [0.075, 0]], form: FORM.a, breath: 0.35, drive: 0.2 });
        return n * 0.1 + 0.1;
      }
      return vocal(c, out, this.v, ev, r);
    } },
  wolf: { v: { p: 150, form: FORM.growl, rough: [30, 0.6], breath: 0.35, drive: 0.3, sub: 0.5 },
    build(c, out, ev, r) {
      if (ev === 'aggro') {
        // Heulen: setzt leise an, steigt, hält lange mit leichtem Vibrato, bricht am Ende ab
        const p = 380 + r() * 60;
        sVoice(c, out, { rnd: r, jit: 0.006, f: [[0, p * 0.7], [0.35, p * 1.2], [1.2, p * 1.3], [1.55, p * 1.1], [1.7, p * 0.7]], mouth: [[0, 0.7], [0.4, 1.05], [1.3, 1.12], [1.7, 0.8]], amp: [[0, 0], [0.3, 0.7], [1.2, 0.75], [1.55, 0.6], [1.75, 0]], form: FORM.u, vib: [5.5, 14], breath: 0.1, type: 'triangle', lp: 2400, vol: 1.2 });
        return 1.75;
      }
      if (ev === 'attack') {
        // tiefes Knurren mit Unterton, dann Zähne schnappen
        sVoice(c, out, { rnd: r, f: [[0, 95], [0.28, 85]], mouth: [[0, 0.8], [0.15, 1.05], [0.28, 0.9]], amp: [[0, 0], [0.04, 0.85], [0.28, 0]], form: FORM.growl, rough: [26, 0.85], breath: 0.55, sub: 0.7, drive: 0.35 });
        sNoise(c, out, { at: 0.25, f: 2600, q: 2, amp: [[0, 0], [0.002, 0.8], [0.035, 0]] });
        sNoise(c, out, { at: 0.27, f: 1500, q: 3, amp: [[0, 0], [0.002, 0.5], [0.03, 0]] });
        return 0.32;
      }
      if (ev === 'hurt') {
        sVoice(c, out, { rnd: r, onset: 0.3, jit: 0.03, f: [[0, 950], [0.04, 1150], [0.2, 650]], mouth: [[0, 1.1], [0.2, 0.8]], amp: [[0, 0], [0.008, 0.9], [0.22, 0]], form: FORM.yelp, breath: 0.25 });
        return 0.24;
      }
      // Tod: Jaulen, das in ein Winseln übergeht
      sVoice(c, out, { rnd: r, jit: 0.03, f: [[0, 900], [0.3, 700], [0.9, 380]], mouth: [[0, 1.1], [0.9, 0.75]], amp: [[0, 0], [0.02, 0.9], [0.5, 0.6], [0.95, 0]], form: FORM.yelp, breath: 0.3 });
      bodyFall(c, out, 0.85, 0.4);
      return 1.05;
    } },
  hellhound: { v: { p: 105, form: FORM.growl, rough: [28, 0.8], breath: 0.5, drive: 0.7, sub: 0.7 },
    build(c, out, ev, r) {
      const d = vocal(c, out, this.v, ev, r);
      sNoise(c, out, { f: [[0, 600], [d, 1800]], type: 'bandpass', q: 0.8, amp: [[0, 0], [d * 0.3, 0.35], [d, 0]], color: 'pink', rough: [14, 0.6] });
      return d;
    } },
  boar: { v: { p: 105, form: FORM.nasal, rough: [42, 0.7], breath: 0.45, drive: 0.35, sub: 0.5 },
    build(c, out, ev, r) {
      if (ev === 'hurt' || ev === 'death') {
        // Quieken: hoch, schrill, zitternd
        const d = ev === 'death' ? 0.95 : 0.3;
        sVoice(c, out, { rnd: r, onset: 0.3, jit: 0.05, f: [[0, 1000], [d * 0.2, 1500], [d * 0.6, 1300], [d, 650]], mouth: [[0, 0.9], [d * 0.2, 1.2], [d, 0.85]], amp: [[0, 0], [0.015, 0.85], [d * 0.6, 0.6], [d, 0]], form: FORM.e, rough: [55, 0.35], breath: 0.35, drive: 0.35 });
        if (ev === 'death') bodyFall(c, out, d * 0.85, 0.5);
        return d;
      }
      // Grunzen: kurze nasale Stöße mit Rasseln
      const n = ev === 'aggro' ? 3 : 2;
      for (let i = 0; i < n; i++) sVoice(c, out, { rnd: r, at: i * (0.15 + r() * 0.05), onset: 0.25, f: [[0, 125], [0.11, 95]], mouth: [[0, 0.85], [0.04, 1.1], [0.11, 0.9]], amp: [[0, 0], [0.012, 1], [0.11, 0]], form: FORM.nasal, rough: [40, 0.8], breath: 0.5, sub: 0.6, drive: 0.4 });
      return n * 0.19;
    } },
  bear: { v: { p: 92, form: FORM.roar, rough: [24, 0.85], breath: 0.6, drive: 0.5, sub: 0.75, long: 1.25, dieLen: 1.5, jit: 0.03 } },
  cat: { v: { p: 210, form: FORM.snarl, rough: [45, 0.6], breath: 0.55, drive: 0.4, sub: 0.4 },
    build(c, out, ev, r) {
      if (ev === 'aggro' || ev === 'attack') {
        // Fauchen (zischend, flatternd), danach kurzes Knurren
        sNoise(c, out, { f: 3600, q: 1.1, amp: [[0, 0], [0.02, 0.85], [0.35, 0.55], [0.5, 0]], rough: [22, 0.4] });
        sVoice(c, out, { rnd: r, at: 0.1, f: [[0, 230], [0.35, 180]], mouth: [[0, 0.85], [0.1, 1.1], [0.35, 0.9]], amp: [[0, 0], [0.03, 0.7], [0.35, 0]], form: FORM.snarl, rough: [40, 0.7], breath: 0.45, sub: 0.4, drive: 0.4 });
        return 0.5;
      }
      return vocal(c, out, this.v, ev, r);
    } },
  deer: { v: { p: 200, form: FORM.roar, rough: [22, 0.5], breath: 0.45, drive: 0.3, sub: 0.5, long: 1.3 },
    build(c, out, ev, r) {
      if (ev === 'aggro') {
        // Röhren: tief ansetzen, hochziehen, lange rau halten
        sVoice(c, out, { rnd: r, jit: 0.025, f: [[0, 150], [0.3, 260], [1.1, 230], [1.4, 140]], mouth: [[0, 0.7], [0.3, 1.2], [1.4, 0.8]], amp: [[0, 0], [0.15, 0.9], [1.1, 0.8], [1.4, 0]], form: FORM.roar, rough: [20, 0.6], breath: 0.5, sub: 0.6, drive: 0.35 });
        return 1.4;
      }
      return vocal(c, out, this.v, ev, r);
    } },
  mammoth: { v: { p: 360, form: [[1100, 4, 1], [2300, 6, 0.5]], rough: [25, 0.35], drive: 0.6, long: 1.3, dieLen: 1.6, sub: 0.3 } },
  spider: {
    build(c, out, ev, r) {
      if (ev === 'death') {
        sVoice(c, out, { rnd: r, jit: 0.05, f: [[0, 1400], [0.5, 500]], amp: [[0, 0], [0.02, 0.6], [0.5, 0]], form: FORM.yelp, drive: 0.5, breath: 0.5 });
        sClicks(c, out, 14, 0.04, 3200, 0.5, r);
        return 0.65;
      }
      if (ev === 'hurt') {
        sNoise(c, out, { f: 4200, q: 2, amp: [[0, 0], [0.01, 0.6], [0.16, 0]], rough: [30, 0.5] });
        sClicks(c, out, 3, 0.03, 3000, 0.5, r);
        return 0.18;
      }
      sClicks(c, out, ev === 'aggro' ? 16 : 7, 0.035, 2800, 0.55, r);
      sNoise(c, out, { at: 0.05, f: 5200, q: 1.5, amp: [[0, 0], [0.04, ev === 'aggro' ? 0.45 : 0.6], [ev === 'aggro' ? 0.5 : 0.25, 0]], rough: [24, 0.5] });
      return ev === 'aggro' ? 0.6 : 0.3;
    } },
  scorpion: {
    build(c, out, ev, r) {
      if (ev === 'death') {
        sClicks(c, out, 12, 0.05, 1800, 0.6, r);
        bodyFall(c, out, 0.4, 0.35);
        return 0.7;
      }
      sClicks(c, out, ev === 'aggro' ? 10 : ev === 'hurt' ? 3 : 5, 0.05, 1500, 0.7, r);
      if (ev === 'aggro') sNoise(c, out, { at: 0.1, f: 3000, q: 1.5, amp: [[0, 0], [0.05, 0.35], [0.5, 0]], rough: [26, 0.8] });
      return ev === 'aggro' ? 0.6 : 0.28;
    } },
  snake: {
    build(c, out, ev, r) {
      const d = ev === 'aggro' ? 0.95 : ev === 'death' ? 1.0 : ev === 'attack' ? 0.35 : 0.2;
      // Zischen mit leichtem Flattern der Zunge; beim Biss ein kurzer Schlag
      sNoise(c, out, { f: ev === 'death' ? [[0, 5000], [d, 1800]] : 5600, q: 1.4, amp: [[0, 0], [ev === 'attack' ? 0.01 : 0.1, 0.75], [d * 0.7, 0.55], [d, 0]], rough: [17, 0.35] });
      sNoise(c, out, { f: 8000, type: 'highpass', amp: [[0, 0], [0.1, 0.18], [d, 0]] });
      if (ev === 'attack') sNoise(c, out, { at: 0.25, f: 1200, q: 2, amp: [[0, 0], [0.003, 0.5], [0.05, 0]] });
      return d;
    } },
  rattle: {
    build(c, out, ev, r) {
      if (ev === 'aggro' || ev === 'attack') {
        const d = ev === 'aggro' ? 1.1 : 0.5;
        sNoise(c, out, { f: 4200, q: 1.2, amp: [[0, 0], [0.04, 0.7], [d * 0.8, 0.6], [d, 0]], rough: [29, 1] });
        return d;
      }
      return VOICES.snake.build(c, out, ev, r);
    } },
  naga: { v: { p: 230, form: FORM.e, breath: 0.85, rough: [20, 0.2], drive: 0.15 },
    build(c, out, ev, r) {
      const d = vocal(c, out, this.v, ev, r);
      sNoise(c, out, { f: 5000, q: 1.5, amp: [[0, 0], [d * 0.2, 0.3], [d, 0]], rough: [16, 0.3] });
      return d;
    } },
  human: { v: { p: 125, form: FORM.a, rough: [18, 0.2], breath: 0.25, drive: 0.15, long: 0.6, dieLen: 0.8 },
    build(c, out, ev, r) {
      if (ev === 'aggro') {
        sVoice(c, out, { rnd: r, onset: 0.4, f: [[0, 160], [0.1, 215], [0.4, 150]], mouth: [[0, 0.8], [0.1, 1.1], [0.42, 0.85]], amp: [[0, 0], [0.025, 1], [0.32, 0.8], [0.44, 0]], form: FORM.e, breath: 0.25, drive: 0.15 });
        return 0.46;
      }
      if (ev === 'attack') return kiai(c, out, r, 125, 1.1);
      if (ev === 'hurt') return grunt(c, out, r, 140);
      const d = vocal(c, out, this.v, ev, r);
      bodyFall(c, out, d * 0.85, 0.4);
      return d;
    } },
  witch: { v: { p: 330, form: FORM.a, breath: 0.4, drive: 0.25 },
    build(c, out, ev, r) {
      if (ev === 'aggro' || ev === 'death') {
        const n = ev === 'aggro' ? 6 : 4;
        for (let i = 0; i < n; i++) sVoice(c, out, { rnd: r, at: i * 0.12, onset: 0.2, f: [[0, 520 - i * (ev === 'death' ? 50 : 15)], [0.1, 430 - i * (ev === 'death' ? 50 : 15)]], amp: [[0, 0], [0.01, 0.9], [0.1, 0]], form: FORM.a, breath: 0.45, drive: 0.25, vib: [9, 40] });
        return n * 0.12 + 0.1;
      }
      return vocal(c, out, this.v, ev, r);
    } },
  undead: { v: { p: 92, form: FORM.o, rough: [14, 0.5], breath: 0.6, drive: 0.35, long: 1.2, dieLen: 1.4 },
    build(c, out, ev, r) {
      const d = vocal(c, out, this.v, ev, r);
      if (ev === 'death') sClicks(c, out, 9, 0.05, 1900, 0.55, r, d * 0.5);
      return d;
    } },
  orc: { v: { p: 88, form: FORM.a, rough: [26, 0.55], breath: 0.3, drive: 0.55, long: 0.75, dieLen: 1.0, sub: 0.4 },
    build(c, out, ev, r) {
      if (ev === 'attack') return kiai(c, out, r, 90, 1.3, { drive: 0.5, rough: [26, 0.5], sub: 0.4 });
      if (ev === 'hurt') return grunt(c, out, r, 95, { drive: 0.4, sub: 0.4 });
      const d = vocal(c, out, this.v, ev, r);
      if (ev === 'death') bodyFall(c, out, d * 0.85, 0.55);
      return d;
    } },
  brute: { v: { p: 66, form: FORM.roar, rough: [24, 0.75], breath: 0.5, drive: 0.6, long: 1.1, dieLen: 1.5, sub: 0.7, jit: 0.03 },
    build(c, out, ev, r) {
      const d = vocal(c, out, this.v, ev, r);
      if (ev === 'death') bodyFall(c, out, d * 0.85, 0.8);
      return d;
    } },
  golem: {
    build(c, out, ev, r) {
      const d = ev === 'death' ? 1.3 : ev === 'aggro' ? 1.0 : ev === 'attack' ? 0.4 : 0.25;
      sNoise(c, out, { f: 260, type: 'lowpass', amp: [[0, 0], [0.05, 0.9], [d * 0.7, 0.6], [d, 0]], color: 'brown', rough: [12, 0.5] });
      sClicks(c, out, Math.round(d * 18), 0.05, 1300, 0.45, r);
      if (ev !== 'hurt') sVoice(c, out, { rnd: r, f: [[0, 58], [d, 42]], amp: [[0, 0], [0.1, 0.5], [d, 0]], form: FORM.growl, rough: [20, 0.6], drive: 0.6, breath: 0.3, sub: 0.5 });
      if (ev === 'death') bodyFall(c, out, d * 0.8, 0.9);
      return d;
    } },
  demon: { v: { p: 66, form: FORM.roar, rough: [30, 0.75], breath: 0.45, drive: 0.85, long: 1.1, dieLen: 1.5, sub: 0.7 },
    build(c, out, ev, r) {
      const d = vocal(c, out, this.v, ev, r);
      if (ev !== 'hurt') vocal(c, out, { ...this.v, p: 190, form: FORM.snarl, drive: 0.5, sub: 0 }, ev, r, { vol: 0.35 });
      return d;
    } },
  ghost: { v: { p: 380, form: FORM.u, breath: 0.35, vib: [6, 45], type: 'triangle', long: 1.4, dieLen: 1.6, jit: 0.008 },
    build(c, out, ev, r) {
      if (ev === 'attack') {
        sNoise(c, out, { f: [[0, 800], [0.4, 2400]], q: 2, amp: [[0, 0], [0.1, 0.6], [0.4, 0]] });
        return 0.4;
      }
      return vocal(c, out, this.v, ev, r);
    } },
  harpy: { v: { p: 950, form: [[1500, 5, 1], [3000, 7, 0.6]], rough: [40, 0.35], drive: 0.5, breath: 0.3, long: 0.7, jit: 0.04 },
    build(c, out, ev, r) {
      const d = vocal(c, out, this.v, ev, r);
      if (ev === 'aggro' || ev === 'attack') for (let i = 0; i < 3; i++) sNoise(c, out, { at: i * 0.16, f: 700, type: 'lowpass', amp: [[0, 0], [0.04, 0.4], [0.12, 0]] });
      return d;
    } },
  dragon: { v: { p: 70, form: FORM.roar, rough: [26, 0.8], breath: 0.6, drive: 0.75, long: 1.5, dieLen: 1.8, sub: 0.8, jit: 0.03 },
    build(c, out, ev, r) {
      if (ev === 'attack') {
        sNoise(c, out, { f: [[0, 400], [0.6, 1600]], type: 'bandpass', q: 0.7, amp: [[0, 0], [0.08, 0.9], [0.5, 0.7], [0.7, 0]], color: 'pink', rough: [15, 0.5] });
        sNoise(c, out, { f: 3000, q: 1, amp: [[0, 0], [0.1, 0.25], [0.7, 0]], rough: [17, 0.7] });
        return 0.7;
      }
      const d = vocal(c, out, this.v, ev, r);
      if (ev === 'death') bodyFall(c, out, d * 0.85, 1);
      return d;
    } },
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

// --- Kurze Kampflaute (seit 9.5) ------------------------------------------------------------------
// Kein langes Stöhnen, sondern schnelle Laute wie im Kampfsport: „Ha!“, „Hm!“, „Hyah!“, „Tsch!“ beim Schlag,
// ein kurzes „Uh!“ bei Treffern. p Grundton (Männer ≈ 130, Frauen ≈ 260).
function kiai(c, out, r, p, k = 1, extra = {}) {
  const kind = Math.floor(r() * 4);
  if (kind === 0) {
    // „Ha!“: Hauch, dann kurzer offener Vokal mit fallendem Ton
    sNoise(c, out, { f: 1600, q: 0.8, amp: [[0, 0], [0.004, 0.35], [0.03, 0]] });
    sVoice(c, out, { rnd: r, at: 0.018, onset: 0.15, jit: 0.02, f: [[0, p * 1.35 * k], [0.09, p * 1.05 * k]], mouth: [[0, 1.05], [0.09, 0.85]], amp: [[0, 0], [0.008, 1], [0.05, 0.55], [0.1, 0]], form: FORM.a, breath: 0.3, ...extra });
    return 0.13;
  }
  if (kind === 1) {
    // „Hm!“: kurzer, geschlossener Druck durch die Nase
    sVoice(c, out, { rnd: r, onset: 0.1, jit: 0.015, f: [[0, p * 1.2 * k], [0.08, p * 1.0 * k]], amp: [[0, 0], [0.006, 0.9], [0.05, 0.5], [0.085, 0]], form: FORM.m, breath: 0.15, ...extra });
    return 0.1;
  }
  if (kind === 2) {
    // „Hyah!“: steigt kurz an, dann fällt er, das Maul öffnet sich
    sNoise(c, out, { f: 2200, q: 0.8, amp: [[0, 0], [0.004, 0.3], [0.025, 0]] });
    sVoice(c, out, { rnd: r, at: 0.015, onset: 0.1, jit: 0.02, f: [[0, p * 1.2 * k], [0.05, p * 1.5 * k], [0.15, p * 1.1 * k]], mouth: [[0, 0.75], [0.05, 1.15], [0.15, 0.9]], amp: [[0, 0], [0.01, 0.9], [0.1, 0.6], [0.16, 0]], form: FORM.a, breath: 0.25, ...extra });
    return 0.18;
  }
  // „Tsch!“: nur scharfer Atem durch die Zähne
  sNoise(c, out, { f: [[0, 4200], [0.07, 3000]], q: 1.3, amp: [[0, 0], [0.006, 0.7], [0.08, 0]] });
  return 0.09;
}
function grunt(c, out, r, p, extra = {}) {
  // „Uh!“/„Hng!“: kehliger Anschlag, sehr kurz
  sNoise(c, out, { f: 900, q: 1, amp: [[0, 0], [0.002, 0.35], [0.02, 0]] });
  sVoice(c, out, { rnd: r, onset: 0.2, jit: 0.03, f: [[0, p * 1.3], [0.025, p * 1.4], [0.11, p * 1.0]], mouth: [[0, 0.95], [0.11, 0.8]], amp: [[0, 0], [0.006, 1], [0.045, 0.55], [0.11, 0]], form: Math.floor(r() * 2) ? FORM.u : FORM.m, breath: 0.35, ...extra });
  return 0.13;
}

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
  // Zauber je Element (seit 9.6 natürlicher): beim Wirken (el_*) und beim Einschlag (imp_*)
  // Klinge: Stahl klingt nach, Luft wird geschnitten
  el_klinge: (c, out, r) => {
    sNoise(c, out, { f: [[0, 1800], [0.18, 5500], [0.3, 3000]], q: 1.8, amp: [[0, 0], [0.06, 0.55], [0.3, 0]] });
    sMetal(c, out, 1150 + r() * 250, 0.05, 0.9, 0.22);
    sGrains(c, out, { at: 0.05, dur: 0.12, rate: 120, f: [3000, 7000], dec: [0.002, 0.006], q: 0.95, vol: 0.25 }, r);
    return 0.9;
  },
  // Erde: Fels bricht, Geröll prasselt, tiefes Grollen
  el_erde: (c, out, r) => {
    sTone(c, out, { f: [[0, 95], [0.35, 36]], amp: [[0, 0], [0.008, 1], [0.4, 0]] });
    sNoise(c, out, { f: 900, type: 'lowpass', amp: [[0, 0], [0.004, 0.7], [0.12, 0]], color: 'brown' });
    sGrains(c, out, { at: 0.03, dur: 0.7, rate: [[0, 160], [0.7, 15]], f: [250, 1600], dec: [0.008, 0.03], q: 0.93, vol: 0.55, amp: [[0, 1], [0.7, 0.2]] }, r);
    sRumble(c, out, { dur: 0.9, vol: 0.55, f: [[0, 220], [0.9, 70]] }, r);
    return 0.95;
  },
  // Feuer: Fauchen beim Entzünden, Brausen, prasselnde Funken
  el_feuer: (c, out, r) => {
    sNoise(c, out, { f: [[0, 250], [0.18, 2200], [0.7, 700]], type: 'lowpass', q: 0.8, amp: [[0, 0], [0.12, 0.9], [0.35, 0.55], [0.75, 0]], color: 'pink' });
    sNoise(c, out, { f: 320, q: 0.9, amp: [[0, 0], [0.15, 0.55], [0.75, 0]], color: 'brown', rough: [11, 0.6] });
    sGrains(c, out, { at: 0.08, dur: 0.75, rate: [[0, 20], [0.25, 70], [0.75, 25]], f: [900, 4500], dec: [0.001, 0.004], q: 0.9, vol: 0.7, tail: 3 }, r);
    return 0.85;
  },
  // Schatten: Sog rückwärts (schwillt an, reißt ab), tiefes Raunen und Flüstern
  el_schatten: (c, out, r) => {
    sNoise(c, out, { f: [[0, 400], [0.45, 2600]], q: 1.4, amp: [[0, 0], [0.42, 0.75], [0.47, 0]], color: 'pink' });
    sVoice(c, out, { rnd: r, f: [[0, 62], [0.7, 50]], amp: [[0, 0], [0.3, 0.5], [0.8, 0]], form: FORM.u, breath: 0.7, sub: 0.4, rough: [9, 0.5], vib: [3, 20], type: 'sawtooth' });
    sNoise(c, out, { at: 0.2, f: [[0, 2800], [0.5, 1800]], q: 6, amp: [[0, 0], [0.15, 0.18], [0.55, 0]], rough: [23, 0.7] });
    return 0.85;
  },
  // Seele: geisterhafter Hauch und ein schwebender, singender Ton
  el_seele: (c, out, r) => {
    sNoise(c, out, { f: [[0, 600], [0.5, 1100], [0.9, 800]], q: 5, amp: [[0, 0], [0.25, 0.35], [0.9, 0]] });
    sVoice(c, out, { rnd: r, f: [[0, 520], [0.4, 700], [0.9, 640]], amp: [[0, 0], [0.18, 0.4], [0.9, 0]], form: FORM.u, breath: 0.6, vib: [6, 25], type: 'triangle' });
    sGrains(c, out, { at: 0.1, dur: 0.7, rate: 30, f: [3500, 8000], dec: [0.01, 0.04], q: 0.995, vol: 0.12 }, r);
    return 0.95;
  },
  // Blitz: knisternde Ladung, scharfer Knall, kurzes Donnergrollen
  el_blitz: (c, out, r) => {
    sGrains(c, out, { dur: 0.16, rate: [[0, 150], [0.16, 600]], f: [1500, 6000], dec: [0.0005, 0.002], q: 0.85, vol: 0.5 }, r);
    sNoise(c, out, { at: 0.16, f: 2500, type: 'highpass', amp: [[0, 0], [0.002, 1], [0.05, 0.3], [0.12, 0]] });
    sTone(c, out, { at: 0.16, type: 'sawtooth', f: [[0, 180 + r() * 60], [0.2, 90]], amp: [[0, 0], [0.003, 0.35], [0.22, 0]], lp: 2500 });
    sNoise(c, out, { at: 0.16, f: 3000, q: 0.7, amp: [[0, 0], [0.003, 0.5], [0.25, 0]], rough: [70, 0.9] });
    sRumble(c, out, { at: 0.2, dur: 0.9, vol: 0.5, f: [[0, 300], [0.9, 80]] }, r);
    return 1.15;
  },
  // Eis: Kristalle wachsen knirschend, glasige Töne, ein Knacken zum Schluss
  el_eis: (c, out, r) => {
    sNoise(c, out, { f: [[0, 5000], [0.5, 2500]], q: 1.2, amp: [[0, 0], [0.15, 0.25], [0.55, 0]] });
    sGrains(c, out, { dur: 0.5, rate: [[0, 60], [0.45, 380]], f: [2500, 9000], dec: [0.001, 0.005], q: 0.96, vol: 0.55, amp: [[0, 0.4], [0.45, 1], [0.5, 0.2]] }, r);
    for (let i = 0; i < 3; i++) sBell(c, out, 2800 + r() * 2500, 0.1 + i * 0.12, 0.45, 0.07, 2.76, 0.8);
    sTone(c, out, { at: 0.48, f: [[0, 5200], [0.06, 400]], amp: [[0, 0], [0.002, 0.45], [0.07, 0]] });
    sNoise(c, out, { at: 0.48, f: 3500, q: 1.5, amp: [[0, 0], [0.002, 0.6], [0.04, 0]] });
    return 0.75;
  },
  // Wind: pfeifende Böe
  el_wind: (c, out, r) => {
    sNoise(c, out, { f: [[0, 400], [0.3, 1500], [0.75, 600]], q: 1.5, amp: [[0, 0], [0.25, 0.7], [0.75, 0]], color: 'pink' });
    sNoise(c, out, { f: [[0, 900 + r() * 300], [0.35, 1800], [0.7, 1100]], q: 14, amp: [[0, 0], [0.25, 0.3], [0.7, 0]] });
    return 0.8;
  },
  // Licht: heller Akkord, der aufblüht, mit Glitzern
  el_licht: (c, out, r) => {
    [880, 1109, 1319, 1760].forEach((f, i) => sTone(c, out, { at: i * 0.04, f: f * (1 + (r() - 0.5) * 0.004), amp: [[0, 0], [0.25, 0.12], [1.2, 0]] }));
    sBell(c, out, 2637, 0.05, 1.1, 0.1, 1.0, 0.5);
    sGrains(c, out, { at: 0.1, dur: 0.9, rate: 40, f: [4000, 9000], dec: [0.02, 0.06], q: 0.997, vol: 0.12 }, r);
    return 1.3;
  },
  // Blut: nasser Schlag, Spritzer, Tropfen
  el_blut: (c, out, r) => {
    sNoise(c, out, { f: [[0, 1400], [0.08, 500], [0.3, 250]], q: 3.5, amp: [[0, 0], [0.006, 0.8], [0.3, 0]], rough: [35, 0.7] });
    sTone(c, out, { f: [[0, 150], [0.25, 60]], amp: [[0, 0], [0.008, 0.5], [0.28, 0]] });
    sBubbles(c, out, { at: 0.1, dur: 0.25, rate: 25, f: [500, 1100], vol: 0.25 }, r);
    return 0.45;
  },
  // Knochen: trockenes Knacken und Splittern
  el_knochen: (c, out, r) => {
    sGrains(c, out, { dur: 0.3, rate: [[0, 60], [0.3, 15]], f: [700, 2200], dec: [0.004, 0.012], q: 0.97, vol: 0.8, tail: 1.5 }, r);
    sTone(c, out, { f: [[0, 260], [0.2, 120]], amp: [[0, 0], [0.004, 0.4], [0.2, 0]] });
    return 0.4;
  },
  el_frost: (c, out, r) => PLAYER_SND.el_eis(c, out, r),
  // Wasser (Heilung): Plätschern, Blasen und ein sanfter Glanzton
  el_wasser: (c, out, r) => {
    sNoise(c, out, { f: [[0, 2500], [0.6, 1200]], q: 0.8, amp: [[0, 0], [0.05, 0.3], [0.7, 0]], rough: [17, 0.6] });
    sBubbles(c, out, { dur: 0.8, rate: 45, f: [400, 1600], vol: 0.35 }, r);
    [784, 988, 1175].forEach((f, i) => sTone(c, out, { at: 0.1 + i * 0.06, f, amp: [[0, 0], [0.2, 0.08], [1.0, 0]] }));
    return 1.1;
  },
  // Großer Donner (Donnersturm): Knall direkt über dir und langes, rollendes Grollen
  el_donner: (c, out, r) => {
    PLAYER_SND.el_blitz(c, out, r);
    sRumble(c, out, { at: 0.3, dur: 1.7, vol: 0.85, attack: 0.15, f: [[0, 400], [1.7, 60]] }, r);
    return 2.0;
  },
  // Beben: Boden bricht, langes Grollen
  el_beben: (c, out, r) => {
    PLAYER_SND.el_erde(c, out, r);
    sRumble(c, out, { dur: 1.6, vol: 0.9, attack: 0.05, f: [[0, 180], [1.6, 45]] }, r);
    sGrains(c, out, { at: 0.2, dur: 1.2, rate: 60, f: [200, 900], dec: [0.01, 0.04], q: 0.92, vol: 0.35, amp: [[0, 1], [1.2, 0]] }, r);
    return 1.7;
  },
  // Eissturm (Blizzard): heulender Wind voller klirrender Eiskörner
  el_eissturm: (c, out, r) => {
    sNoise(c, out, { f: [[0, 500], [0.5, 1600], [1.4, 700]], q: 1.2, amp: [[0, 0], [0.4, 0.7], [1.4, 0]], color: 'pink' });
    sNoise(c, out, { f: [[0, 1200], [0.6, 2200], [1.4, 1400]], q: 12, amp: [[0, 0], [0.4, 0.22], [1.4, 0]] });
    sGrains(c, out, { at: 0.2, dur: 1.1, rate: 160, f: [3000, 9000], dec: [0.001, 0.003], q: 0.95, vol: 0.4, amp: [[0, 0.3], [0.4, 1], [1.1, 0]] }, r);
    return 1.45;
  },

  // Einschläge: kurz, nach Element
  imp_feuer: (c, out, r) => {
    sTone(c, out, { f: [[0, 110], [0.25, 40]], amp: [[0, 0], [0.004, 0.8], [0.3, 0]] });
    sNoise(c, out, { f: [[0, 3000], [0.3, 500]], type: 'lowpass', amp: [[0, 0], [0.005, 0.8], [0.4, 0]], color: 'pink' });
    sGrains(c, out, { at: 0.03, dur: 0.45, rate: [[0, 90], [0.45, 10]], f: [1200, 5000], dec: [0.001, 0.003], q: 0.9, vol: 0.6, tail: 3 }, r);
    return 0.5;
  },
  imp_eis: (c, out, r) => {
    sNoise(c, out, { f: 4500, type: 'highpass', amp: [[0, 0], [0.002, 0.8], [0.06, 0]] });
    sGrains(c, out, { dur: 0.35, rate: [[0, 500], [0.35, 30]], f: [2500, 9000], dec: [0.003, 0.02], q: 0.985, vol: 0.5 }, r);
    for (let i = 0; i < 3; i++) sBell(c, out, 3000 + r() * 3000, i * 0.03, 0.35, 0.06, 2.76, 0.7);
    return 0.45;
  },
  imp_blitz: (c, out, r) => {
    sNoise(c, out, { f: 3000, type: 'highpass', amp: [[0, 0], [0.001, 1], [0.04, 0.2], [0.1, 0]] });
    sGrains(c, out, { dur: 0.15, rate: 400, f: [2000, 7000], dec: [0.0005, 0.002], q: 0.85, vol: 0.45 }, r);
    sTone(c, out, { type: 'sawtooth', f: [[0, 200], [0.12, 90]], amp: [[0, 0], [0.002, 0.3], [0.14, 0]], lp: 2500 });
    return 0.2;
  },
  imp_erde: (c, out, r) => {
    sTone(c, out, { f: [[0, 130], [0.15, 50]], amp: [[0, 0], [0.003, 0.9], [0.18, 0]] });
    sGrains(c, out, { dur: 0.35, rate: [[0, 200], [0.35, 20]], f: [300, 1800], dec: [0.006, 0.02], q: 0.93, vol: 0.6 }, r);
    return 0.4;
  },
  imp_schatten: (c, out, r) => {
    sTone(c, out, { f: [[0, 90], [0.2, 45]], amp: [[0, 0], [0.004, 0.6], [0.22, 0]] });
    sNoise(c, out, { f: [[0, 1500], [0.25, 400]], q: 2, amp: [[0, 0], [0.005, 0.5], [0.28, 0]], color: 'pink' });
    return 0.3;
  },
  imp_seele: (c, out, r) => {
    sNoise(c, out, { f: [[0, 2000], [0.3, 900]], q: 4, amp: [[0, 0], [0.01, 0.5], [0.3, 0]] });
    sTone(c, out, { f: [[0, 900], [0.3, 600]], type: 'triangle', amp: [[0, 0], [0.01, 0.2], [0.3, 0]] });
    return 0.32;
  },
  imp_klinge: (c, out, r) => {
    PLAYER_SND.hit(c, out, r);
    sMetal(c, out, 1400 + r() * 300, 0, 0.4, 0.12);
    return 0.4;
  },
  // Eisstrahl: kalter, zischender Strom mit Knistern (wird als Schleife gespielt) und Splittern am Ende
  beam_loop: (c, out, r) => {
    sNoise(c, out, { f: [[0, 3500], [0.7, 4500], [1.4, 3200], [2.0, 3800]], q: 1.4, amp: [[0, 0.3], [2.0, 0.3]], rough: [13, 0.35] });
    sNoise(c, out, { f: 900, q: 0.8, amp: [[0, 0.22], [2.0, 0.22]], color: 'pink' });
    sTone(c, out, { f: 220, type: 'triangle', amp: [[0, 0.06], [2.0, 0.06]] });
    sGrains(c, out, { dur: 2.0, rate: 140, f: [2500, 9000], dec: [0.001, 0.004], q: 0.96, vol: 0.4 }, r);
    return 2.0;
  },
  // Strom der Elemente: rauschender Wasserschwall mit Blasen, knisternder Ladung und Feuerfauchen (Schleife)
  strom_loop: (c, out, r) => {
    sNoise(c, out, { f: [[0, 900], [0.8, 1300], [1.6, 800], [2.0, 1100]], q: 0.6, amp: [[0, 0.55], [2.0, 0.55]], color: 'pink', rough: [7, 0.35] });
    sNoise(c, out, { f: 260, type: 'lowpass', amp: [[0, 0.5], [2.0, 0.5]], color: 'brown', rough: [5, 0.4] });
    sBubbles(c, out, { dur: 2.0, rate: 70, f: [300, 1400], vol: 0.25 }, r);
    sGrains(c, out, { dur: 2.0, rate: 90, f: [1500, 6000], dec: [0.0005, 0.002], q: 0.85, vol: 0.3 }, r);
    sGrains(c, out, { dur: 2.0, rate: 25, f: [900, 3500], dec: [0.002, 0.006], q: 0.9, vol: 0.3, tail: 3 }, r);
    return 2.0;
  },
  // Schluss: großer Platscher, Donnerschlag, Erdbruch
  strom_end: (c, out, r) => {
    sNoise(c, out, { f: [[0, 3000], [0.5, 600]], type: 'lowpass', amp: [[0, 0], [0.01, 0.8], [0.6, 0]], color: 'pink' });
    sBubbles(c, out, { dur: 0.6, rate: 60, f: [300, 1500], vol: 0.3 }, r);
    PLAYER_SND.el_beben(c, out, r);
    sNoise(c, out, { at: 0.4, f: 2500, type: 'highpass', amp: [[0, 0], [0.002, 0.9], [0.06, 0.2], [0.15, 0]] });
    return 1.9;
  },
  imp_wasser: (c, out, r) => {
    sNoise(c, out, { f: [[0, 2500], [0.2, 900]], q: 0.8, amp: [[0, 0], [0.004, 0.6], [0.25, 0]] });
    sBubbles(c, out, { at: 0.02, dur: 0.2, rate: 60, f: [400, 1400], vol: 0.3 }, r);
    return 0.3;
  },
  beam_end: (c, out, r) => {
    sGrains(c, out, { dur: 0.25, rate: [[0, 300], [0.25, 20]], f: [3000, 9000], dec: [0.003, 0.015], q: 0.985, vol: 0.4 }, r);
    sNoise(c, out, { f: [[0, 4000], [0.3, 1500]], q: 1, amp: [[0, 0.3], [0.3, 0]] });
    return 0.35;
  },
  // Stimmen der Spieler (seit 9.5): kurze Kampflaute statt Stöhnen – „Ha!“, „Hm!“, „Hyah!“, „Tsch!“ beim Schlag,
  // ein lauterer Ruf bei Fertigkeiten, ein kurzes „Uh!“ bei Treffern; männlich tiefer, weiblich höher
  kiai_m: (c, out, r) => kiai(c, out, r, 135),
  kiai_f: (c, out, r) => kiai(c, out, r, 270),
  shout_m: (c, out, r) => kiai(c, out, r, 140, 1.15, { vol: 1.1, drive: 0.12 }) + 0.05,
  shout_f: (c, out, r) => kiai(c, out, r, 280, 1.12, { vol: 1.1 }) + 0.05,
  hurt_m: (c, out, r) => grunt(c, out, r, 140),
  hurt_f: (c, out, r) => grunt(c, out, r, 280),
  die_m: (c, out) => { sVoice(c, out, { onset: 0.3, jit: 0.03, f: [[0, 210], [0.45, 110]], mouth: [[0, 1.1], [0.45, 0.75]], amp: [[0, 0], [0.01, 1], [0.25, 0.6], [0.48, 0]], form: FORM.a, breath: 0.4, drive: 0.1 }); bodyFall(c, out, 0.45, 0.5); return 0.7; },
  die_f: (c, out) => { sVoice(c, out, { onset: 0.3, jit: 0.03, f: [[0, 420], [0.45, 230]], mouth: [[0, 1.1], [0.45, 0.75]], amp: [[0, 0], [0.01, 1], [0.25, 0.6], [0.48, 0]], form: FORM.a, breath: 0.45 }); bodyFall(c, out, 0.45, 0.45); return 0.7; },
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

// Klang-Element einer Fertigkeit (Magier-Elemente auf die allgemeinen abgebildet)
const SND_EL_MAP = { m_feuer: 'feuer', m_frost: 'eis', m_blitz: 'blitz', m_erde: 'erde', frost: 'eis' };
function sndElOf(id, el) {
  let e = el || (typeof SKILL_ELEMENT !== 'undefined' && SKILL_ELEMENT[id]) || 'klinge';
  e = SND_EL_MAP[e] || e;
  return PLAYER_SND['el_' + e] ? e : 'klinge';
}
// eigene Klänge großer Zauber
const SKILL_SND = { donnersturm: 'donner', erdbeben: 'beben', blitzschlag: 'eissturm', heilung: 'wasser', kristallgrab: 'eis', schwerkraft: 'beben' };

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
    // Kampflaut: beim dritten Schlag der Kette immer, sonst ab und zu
    if (p.combo === 2) this.kiai(p, true);
    else if (Math.random() < 0.35) this.kiai(p, false);
  },

  // Schuss des Grundangriffs
  shot(p, basic) {
    if (Math.random() < 0.25) this.kiai(p, false);
    if (basic.style === 'arrow') this.player('bow', { x: p.x, y: p.y, vol: 0.5 });
    else if (basic.el) this.player('el_' + (basic.el === 'frost' ? 'eis' : basic.el), { x: p.x, y: p.y, vol: 0.45, rate: 1.25 });
    else if (basic.style === 'wind') this.player('el_wind', { x: p.x, y: p.y, vol: 0.5, rate: 1.3 });
    else this.player('el_seele', { x: p.x, y: p.y, vol: 0.45, rate: 1.3 });
  },

  // Fertigkeit nach Element (Magier: eigenes Element); einige große Zauber haben einen eigenen Klang
  skill(sk, p) {
    const el = SKILL_SND[sk.id] || sndElOf(sk.id, sk.el);
    this.player('el_' + el, { x: p.x, y: p.y, vol: p === game.player ? 0.6 : 0.4, rev: 0.3 });
    this.kiai(p, true);
  },

  // Dauerklang (Eisstrahl, Strom der Elemente): Schleife solange er läuft (je Figur und Klang eine), am Ende ein Schlussklang
  beamLoop(p, key = 'beam_loop', base = 0.4) {
    const c = sfx.ac();
    if (!c) return;
    const slot = '_snd_' + key;
    let b = p[slot];
    if (!b) {
      const buf = this.buffer('p:' + key + '#0', PLAYER_SND[key], sndHash('p:' + key + '#0'));
      if (!buf) return;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = 0.2;
      src.loopEnd = buf.duration - 0.3;
      const g = c.createGain();
      g.gain.value = 0;
      src.connect(g);
      g.connect(sfx.master);
      src.start();
      b = p[slot] = { src, g };
    }
    const me = game.player;
    const d = me && p !== me ? Math.hypot(p.x - me.x, p.y - me.y) : 0;
    const vol = base * (p === me ? 1 : 0.6) * (d < 140 ? 1 : Math.max(0, 1 - (d - 140) / 760));
    b.g.gain.setTargetAtTime(vol, c.currentTime, 0.04);
    clearTimeout(b.off);
    // ohne Nachschub (Netz weg) nach 0,7 s aus
    b.off = setTimeout(() => this.beamStop(p, key), 700);
  },
  beamStop(p = game.player, key = 'beam_loop', endKey = 'beam_end') {
    const slot = '_snd_' + key;
    const b = p && p[slot];
    if (!b) return;
    p[slot] = null;
    clearTimeout(b.off);
    const c = sfx.ctx;
    if (c) {
      b.g.gain.setTargetAtTime(0, c.currentTime, 0.05);
      b.src.stop(c.currentTime + 0.3);
    }
    this.player(endKey, { x: p.x, y: p.y, vol: p === game.player ? 0.5 : 0.3, rev: 0.3 });
  },

  female(p) {
    return p.look ? p.look.sex === 1 : !!(DEFAULT_LOOKS[p.classId] && DEFAULT_LOOKS[p.classId].sex === 1);
  },
  // Kurzer Kampflaut („Ha!“, „Hm!“, „Hyah!“, scharfer Atem) – nie Stöhnen.
  // big: Fertigkeit oder letzter Schlag der Kette, etwas kräftiger; sonst höchstens alle 0,6 s
  kiai(p, big) {
    const now = performance.now();
    if (now - (p._kiaiAt || 0) < (big ? 250 : 600)) return;
    p._kiaiAt = now;
    const mine = p === game.player;
    this.player((big ? 'shout_' : 'kiai_') + (this.female(p) ? 'f' : 'm'), { x: p.x, y: p.y, vol: (mine ? 0.48 : 0.26) * (big ? 1.1 : 1), rate: 0.96 + Math.random() * 0.08, rev: 0.1, variants: 5 });
  },
  hurt(p) {
    this.player(this.female(p) ? 'hurt_f' : 'hurt_m', { vol: 0.42, rate: 0.95 + Math.random() * 0.1, rev: 0.08, variants: 4 });
  },
  die(p) {
    this.player(this.female(p) ? 'die_f' : 'die_m', { vol: 0.6, rev: 0.3, variants: 1 });
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
        // Einschlag nach Element, wenn gerade eine Fertigkeit traf (seit 9.6), sonst dumpfer Schlag
        const el = m._sEl && t - m._sElAt < 0.15 && PLAYER_SND['imp_' + m._sEl] ? m._sEl : null;
        if (el) this.player('imp_' + el, { x: m.x, y: m.y, vol: 0.5, rate: 0.92 + Math.random() * 0.16 });
        else if (!m.isStone) this.player('hit', { x: m.x, y: m.y, vol: 0.55, rate: 0.9 + Math.random() * 0.2 });
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
    for (const k of ['whoosh_l', 'whoosh_m', 'whoosh_h', 'hit', 'bow', 'coin', 'item', 'potion', 'hurt_m', 'hurt_f', 'kiai_m', 'kiai_f', 'shout_m', 'shout_f']) {
      const n = k.startsWith('kiai') || k.startsWith('shout') ? 5 : k.startsWith('hurt') ? 4 : SND_VARIANTS;
      for (let v = 0; v < n; v++) this.buffer('p:' + k + '#' + v, PLAYER_SND[k], sndHash('p:' + k + '#' + v));
    }
  }
};
