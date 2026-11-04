// Weg der Heilung (Schamane) in 3D (seit 13.26): eigene räumliche Auftritte statt flacher Kreise am Boden.
//  Lichtsturz    – eine Säule aus Himmelslicht stürzt auf das Ziel herab, zerbirst in Lichtstrahlen, Funken steigen auf
//  Windfessel    – ein Stoß aus Windbändern fegt von dir nach außen, um jeden Gegner schnüren sich drei Windbänder
//  Falkengeist   – ein leuchtender Geisterfalke kreist mit schlagenden Flügeln über dem Kopf (Krit-Buff)
//  Lichtkuppel   – Ulti: eine goldene Kuppel aus Lichtwaben wölbt sich über den Ort, Lichtsäulen am Rand,
//                  bei jedem Lichtschlag pulsiert sie, zum Schluss zerbirst sie in einem Lichtring
// Ohne 3D bleiben die einfachen 2D-Effekte.

const HFX3_TYPES = ['hlicht3', 'hwind3', 'hgust3', 'hdome3', 'hburst3'];
for (const t of HFX3_TYPES) FX3_TYPES.add(t);

const _hf3a = new THREE.Vector3();
const _hf3b = new THREE.Vector3();
const _hf3c = new THREE.Vector3();
const _hf3u = new THREE.Vector3(1, 0, 0);
const _hf3v = new THREE.Vector3(0, 0, 1);
const _hf3y = new THREE.Vector3(0, 1, 0);
const hfx3On = () => typeof V3 !== 'undefined' && V3.on;

// --- Lichtsturz ---------------------------------------------------------------------------------------------
FX3_DRAW.hlicht3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const low = n3low();
  const x = e.x * U3;
  const z = e.y * U3;
  const hit = 0.22;
  // 1) die Säule fällt von oben herab (bis zum Aufprall), danach steht sie kurz und verblasst
  const fall = Math.min(1, t / hit);
  const fade = t < hit ? 1 : Math.max(0, 1 - (t - hit) / (e.dur - hit));
  const top = 9;
  const bottom = top - (top - 0.05) * fall;
  _hf3a.set(x, top, z);
  _hf3b.set(x, bottom, z);
  for (const [r, col, op] of [[0.55, '#ffd36a', 0.35], [0.28, '#fff2a0', 0.75], [0.1, '#ffffff', 1]]) {
    const s = fx3Take(h, 'seg');
    fx3Segment(s, _hf3a, _hf3b, r * (t < hit ? 1 : 1 + (t - hit) * 2.5));
    fx3Color(s, col, op * fade);
  }
  n3Glow(h, x, bottom + 0.2, z, 1.4, '#fff2a0', 0.8 * fade);
  if (t < hit) return;
  const q = (t - hit) / (e.dur - hit);
  // 2) Aufprall: heller Kern, Lichtstrahlen fächern flach nach außen, Lichtkranz in Hüfthöhe
  n3Glow(h, x, 0.5, z, 2.6 * (1 - q * 0.5), '#ffffff', (1 - q) * 0.9);
  n3Glow(h, x, 0.4, z, (e.r * U3) * 2.2 * (0.6 + 0.4 * q), '#ffe9a0', (1 - q) * 0.5);
  const rays = low ? 8 : 14;
  for (let j = 0; j < rays; j++) {
    const a = (j / rays) * Math.PI * 2 + e.seed;
    const len = (e.r * U3) * (0.5 + 0.6 * easeOut(Math.min(1, q * 2.5)));
    _hf3a.set(x + Math.cos(a) * 0.2, 0.35 + (j % 2) * 0.25, z + Math.sin(a) * 0.2);
    _hf3b.set(x + Math.cos(a) * len, 0.15 + (j % 3) * 0.12, z + Math.sin(a) * len);
    const s = fx3Take(h, 'seg');
    fx3Segment(s, _hf3a, _hf3b, 0.05);
    fx3Color(s, j % 2 ? '#fff2a0' : '#ffffff', (1 - q) * 0.85);
  }
  const ring = fx3Take(h, 'strip');
  _hf3c.set(x, 0.5, z);
  fx3Strip(ring, _hf3c, _hf3u, _hf3v, (e.r * U3) * (0.3 + 0.8 * easeOut(Math.min(1, q * 2))), 0.22, 0, Math.PI * 2, '#fff2a0', (1 - q) * 0.8, true);
  // 3) Lichtfunken steigen auf
  for (let j = 0; j < (low ? 6 : 14); j++) {
    const a = j * 2.399 + e.seed;
    const rr = (e.r * U3) * (0.15 + ((j * 0.37) % 1) * 0.7);
    n3Glow(h, x + Math.cos(a) * rr, 0.2 + q * (1.4 + (j % 4) * 0.4), z + Math.sin(a) * rr, 0.18, j % 3 ? '#fff2a0' : '#ffffff', 1 - q);
  }
};

function heilerLicht(x, y, sk) {
  if (hfx3On()) {
    addEffect({ type: 'hlicht3', x, y, r: sk.radius || 100, dur: 0.95, seed: Math.random() * 6 });
    return;
  }
  // 2D: Lichtstrahl und heller Kranz
  addEffect({ type: 'ultbeam', x, y, w: 44, dur: 0.6, color: '#fff2a0' });
  later(0.2, () => addEffect({ type: 'ring', x, y, r: sk.radius || 100, dur: 0.45, color: '#fff2a0', width: 8, grow: true }));
}

// --- Windfessel ---------------------------------------------------------------------------------------------
// Stoß: Windbänder in zwei Höhen fegen vom Wirker nach außen (Bögen, kein Bodenkreis)
FX3_DRAW.hgust3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const o = e.follow;
  if (!o) return;
  const x = o.x * U3;
  const z = feetY(o) * U3;
  const R = (e.r || 170) * U3;
  for (let j = 0; j < 6; j++) {
    const q = Math.min(1, k * 1.4 + (j % 2) * 0.08);
    const a0 = j * 1.05 + t * 3;
    _hf3c.set(x, 0.5 + (j % 3) * 0.45, z);
    const s = fx3Take(h, 'strip');
    fx3Strip(s, _hf3c, _hf3u, _hf3v, 0.5 + R * easeOut(q), 0.2, a0, a0 + 1.6, j % 2 ? '#d8fff8' : '#ffffff', (1 - k) * 0.9, true);
  }
  for (let j = 0; j < 10; j++) {
    const a = j * 0.628 + t * 2;
    const rr = 0.5 + R * easeOut(Math.min(1, k * 1.3)) * (0.7 + (j % 3) * 0.1);
    const b = fx3Take(h, 'ball');
    b.position.set(x + Math.cos(a) * rr, 0.4 + (j % 4) * 0.35, z + Math.sin(a) * rr);
    b.scale.set(0.1, 0.015, 0.04);
    b.rotation.set(0, -a, 0.4);
    fx3Color(b, '#ffffff', 1 - k);
  }
};
// Fessel: drei Windbänder schnüren sich um den Gegner und drehen sich, Blätter wirbeln mit
FX3_DRAW.hwind3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const o = e.follow;
  if (!o || o.dead) return;
  const x = o.x * U3;
  const z = feetY(o) * U3;
  const tall = Math.max(0.9, (typeof figureHeight === 'function' ? figureHeight(o) : 40) * U3 * 0.9);
  const rad = Math.max(0.35, (o.r || 14) * U3 * 1.25);
  const fade = k < 0.12 ? k / 0.12 : k > 0.85 ? (1 - k) / 0.15 : 1;
  for (let j = 0; j < 3; j++) {
    const y = tall * (0.25 + j * 0.28) + Math.sin(t * 3 + j) * 0.05;
    const a0 = t * (5 + j) * (j % 2 ? -1 : 1) + j * 2;
    _hf3c.set(x, y, z);
    const s = fx3Take(h, 'strip');
    fx3Strip(s, _hf3c, _hf3u, _hf3v, rad * (1.25 - j * 0.12), 0.11, a0, a0 + 4.6, j === 1 ? '#ffffff' : '#d8fff8', fade * 0.85, true);
  }
  for (let j = 0; j < 4; j++) {
    const a = t * 6 + j * 1.57;
    const y = tall * (0.2 + ((t * 0.6 + j * 0.25) % 1) * 0.7);
    const b = fx3Take(h, 'ball');
    b.position.set(x + Math.cos(a) * rad * 1.2, y, z + Math.sin(a) * rad * 1.2);
    b.scale.set(0.07, 0.012, 0.035);
    b.rotation.set(Math.sin(t * 7 + j), -a, 0);
    fx3Color(b, j % 2 ? '#bfe8a0' : '#ffffff', fade);
  }
};

// --- Falkengeist (Krit-Buff) --------------------------------------------------------------------------------
// Falke aus Lichtformen: Körper, Kopf mit Schnabel, zwei Flügel aus je drei Federn, Fächerschwanz, Lichtschweif
function falke3(h, p, b, t) {
  const low = n3low();
  const x = p.x * U3;
  const z = feetY(p) * U3;
  const head = (typeof v3HeadHeight === 'function' ? v3HeadHeight(p) : 2) + 0.75;
  const a = t * 1.6;
  const R = 1.0;
  const fx = x + Math.cos(a) * R;
  const fz = z + Math.sin(a) * R;
  const fy = head + Math.sin(t * 2.3) * 0.12;
  // Flugrichtung (Tangente) und quer dazu
  const dx = -Math.sin(a);
  const dz = Math.cos(a);
  const flap = Math.sin(t * 9);
  // golden-orange, damit er sich auch auf hellem Gras abhebt (Krit = Gold)
  const col = '#ffc24a';
  const gold = '#fff2b0';
  // Körper und Kopf
  const body = fx3Take(h, 'ball');
  body.position.set(fx, fy, fz);
  body.scale.set(0.17, 0.13, 0.3);
  body.rotation.set(0, Math.atan2(dx, dz), 0);
  fx3Color(body, col, 0.95);
  const hd = fx3Take(h, 'ball');
  hd.position.set(fx + dx * 0.3, fy + 0.07, fz + dz * 0.3);
  hd.scale.set(0.11, 0.11, 0.12);
  fx3Color(hd, '#ffffff', 1);
  _hf3a.set(fx + dx * 0.4, fy + 0.05, fz + dz * 0.4);
  _hf3b.set(dx, -0.25, dz).normalize();
  const beak = fx3Take(h, 'coneG');
  fx3Cone(beak, _hf3a, _hf3b, 0.15, 0.05);
  fx3Color(beak, '#ff9a2a', 1);
  // Flügel: drei Federn je Seite, schlagen auf und ab
  for (const side of [-1, 1]) {
    const qx = -dz * side;
    const qz = dx * side;
    for (let f = 0; f < 3; f++) {
      _hf3a.set(fx + qx * 0.09 - dx * f * 0.08, fy + 0.04, fz + qz * 0.09 - dz * f * 0.08);
      _hf3b.set(qx * (0.95 - f * 0.1) - dx * (0.15 + f * 0.25), 0.35 * flap + 0.12 - f * 0.05, qz * (0.95 - f * 0.1) - dz * (0.15 + f * 0.25)).normalize();
      const w = fx3Take(h, 'coneG');
      fx3Cone(w, _hf3a, _hf3b, 0.7 - f * 0.12, 0.11);
      fx3Color(w, f === 0 ? gold : col, 0.95);
    }
  }
  // Schwanz: Fächer nach hinten
  for (const s of [-0.35, 0, 0.35]) {
    _hf3a.set(fx - dx * 0.25, fy, fz - dz * 0.25);
    _hf3b.set(-dx + (-dz) * s, -0.15, -dz + dx * s).normalize();
    const tl = fx3Take(h, 'coneG');
    fx3Cone(tl, _hf3a, _hf3b, 0.4, 0.08);
    fx3Color(tl, col, 0.9);
  }
  n3Glow(h, fx, fy, fz, 1.3, col, 0.55);
  // Lichtschweif hinter dem Falken
  if (!low) for (let j = 1; j <= 6; j++) {
    const aa = a - j * 0.14;
    n3Glow(h, x + Math.cos(aa) * R, fy - j * 0.01, z + Math.sin(aa) * R, 0.4 - j * 0.045, j % 2 ? gold : col, 0.65 - j * 0.08);
  }
  // ab und zu glüht er golden auf (zeigt den Krit-Buff deutlich; seit 13.83 ein weicher Schein statt Glitzerstern)
  const tw = Math.pow(Math.max(0, Math.sin(t * 1.3)), 10);
  if (tw > 0.05) n3Glow(h, fx, fy + 0.1, fz, 0.6 + tw * 0.6, gold, 0.6 * tw);
}
if (SKILL_FX.schutzgeist) {
  SKILL_FX.schutzgeist.aura3 = falke3;
  // kein Bodenring mehr (Falke statt Geist)
  delete SKILL_FX.schutzgeist.ring;
  SKILL_FX.schutzgeist.aura = { every: 0.3, color: ['#ffc24a', '#fff2b0'], shape: 'dot', up: true };
  SKILL_FX.schutzgeist.cast = (p) => {
    vfxPillar(p, '#ffc24a', 1);
    if (hfx3On()) addEffect({ type: 'nwind3', follow: p, dur: 0.9 });
  };
}

// --- Lichtkuppel (Ulti) -------------------------------------------------------------------------------------
FX3_DRAW.hdome3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const low = n3low();
  const x = e.x * U3;
  const z = e.y * U3;
  const R = e.r * U3;
  const rise = easeOut(Math.min(1, t / 0.6));
  const fade = k > 0.92 ? (1 - k) / 0.08 : 1;
  const pulse = e.pulseAt ? Math.max(0, 1 - (game.time - e.pulseAt) / 0.35) : 0;
  // Wabenkuppel (wächst aus dem Boden), darüber eine weiche zweite Haut
  const d = fx3Take(h, 'dome');
  d.position.set(x, 0, z);
  // flach (0,42 R), sonst stünde die Kamera in der Kuppel und die Waben füllten das ganze Bild
  const H = R * 0.42 * rise;
  d.scale.set(R, H, R);
  d.rotation.set(0, t * 0.2, 0);
  fx3Color(d, '#ffd36a', (0.22 + pulse * 0.3) * fade);
  const d2 = fx3Take(h, 'dome');
  d2.position.set(x, 0, z);
  d2.scale.set(R * 0.985, H * 0.985, R * 0.985);
  d2.rotation.set(0, -t * 0.12, 0);
  fx3Color(d2, '#fff2a0', (0.08 + pulse * 0.16) * fade);
  // Krone oben
  n3Glow(h, x, H, z, 2.2 + pulse * 1.5, '#ffffff', (0.6 + pulse * 0.4) * fade);
  // Lichtsäulen am Rand
  const n = low ? 6 : 10;
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2 + t * 0.25;
    const px = x + Math.cos(a) * R * 0.98;
    const pz = z + Math.sin(a) * R * 0.98;
    _hf3a.set(px, 0, pz);
    _hf3b.set(px, (1.6 + pulse * 0.8) * rise, pz);
    const s = fx3Take(h, 'seg');
    fx3Segment(s, _hf3a, _hf3b, 0.08 + pulse * 0.05);
    fx3Color(s, '#fff2a0', 0.8 * fade);
    n3Glow(h, px, _hf3b.y, pz, 0.5, '#ffffff', 0.7 * fade);
  }
  // aufsteigende Lichtfunken unter der Kuppel
  for (let j = 0; j < (low ? 10 : 26); j++) {
    const ph = (t * 0.45 + j / 26) % 1;
    const a = j * 2.399;
    const rr = R * (0.15 + ((j * 0.61) % 1) * 0.75);
    n3Glow(h, x + Math.cos(a + t * 0.3) * rr, 0.1 + ph * H * 0.9, z + Math.sin(a + t * 0.3) * rr, 0.16, j % 3 ? '#fff2a0' : '#bfffb0', (1 - ph) * fade);
  }
  // Puls: Lichtwelle läuft über die Kuppel nach außen
  if (pulse > 0) {
    const ring = fx3Take(h, 'strip');
    _hf3c.set(x, 0.3, z);
    fx3Strip(ring, _hf3c, _hf3u, _hf3v, R * (1 - pulse * 0.6), 0.35, 0, Math.PI * 2, '#ffffff', pulse * 0.7 * fade, true);
  }
};
// Zerbersten: Lichtring nach außen, Lichtsplitter fliegen hoch
FX3_DRAW.hburst3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const x = e.x * U3;
  const z = e.y * U3;
  const R = e.r * U3;
  n3Glow(h, x, 1.2, z, R * 2.5 * (0.5 + k), '#fff2a0', (1 - k) * 0.7);
  for (const [yy, ww] of [[0.4, 0.5], [1.4, 0.3]]) {
    const ring = fx3Take(h, 'strip');
    _hf3c.set(x, yy, z);
    fx3Strip(ring, _hf3c, _hf3u, _hf3v, R * (0.6 + easeOut(k) * 0.9), ww, 0, Math.PI * 2, '#ffffff', (1 - k), true);
  }
  for (let j = 0; j < 20; j++) {
    const a = j * 0.314 + e.seed;
    _hf3a.set(x + Math.cos(a) * R * 0.5, R * 0.3, z + Math.sin(a) * R * 0.5);
    _hf3b.set(Math.cos(a), 1.2, Math.sin(a)).normalize();
    _hf3c.copy(_hf3a).addScaledVector(_hf3b, easeOut(k) * R * 0.9);
    const s = fx3Take(h, 'seg');
    fx3Segment(s, _hf3a.lerp(_hf3c, 0.7), _hf3c, 0.05);
    fx3Color(s, j % 2 ? '#fff2a0' : '#ffffff', 1 - k);
  }
};

const heilerKuppeln = [];
function heilerKuppel(x, y, r, dur) {
  if (hfx3On()) {
    const e = { type: 'hdome3', x, y, r, dur };
    addEffect(e);
    heilerKuppeln.push(e);
    while (heilerKuppeln.length > 4) heilerKuppeln.shift();
  } else {
    addEffect({ type: 'ultsigil', ground: true, x, y, r, dur, color: '#fff2a0' });
  }
  addEffect({ type: 'ultbeam', x, y, w: 80, dur: 1, color: '#fff2a0' });
}
function heilerKuppelPuls(x, y, r) {
  for (const e of heilerKuppeln) if (e.x === x && e.y === y) e.pulseAt = game.time;
  particles(x, y - 20, { count: 10, color: ['#fff2a0', '#ffffff', '#9be59b'], angle: -Math.PI / 2, spread: 1.4, speed: [40, 120], life: [0.5, 0.9], size: [2, 3.5], drag: 1.5, jitter: r * 0.6 });
}
function heilerKuppelEnde(x, y, r) {
  if (hfx3On()) addEffect({ type: 'hburst3', x, y, r, dur: 0.8, seed: Math.random() * 6 });
  addEffect({ type: 'ring', x, y, r: r * 1.1, dur: 0.6, color: '#ffffff', width: 12, grow: true });
}
// Mitspieler sehen die Kuppel an der Stelle der Ulti
ULT_SHOW.himmelssegen = (x, y) => {
  heilerKuppel(x, y, 220, 6.3);
  for (let k = 1; k <= 10; k++) later(k * 0.6, () => heilerKuppelPuls(x, y, 220));
  later(6.3, () => heilerKuppelEnde(x, y, 220));
};

// --- Auslösen (eigener Schamane und Mitspieler) ------------------------------------------------------------
// Rückgabe true: die Fertigkeit ist hier vollständig dargestellt (Mitspieler: kein weiterer Standard-Effekt)
function heilerFx3(p, sk, t, remote) {
  if (sk.id === 'geisterfaust' && remote) {
    const tp = t && isFinite(t.x) ? { x: t.x, y: t.y } : { x: p.x + (p.facing ? p.facing.x : 0) * 120, y: p.y + (p.facing ? p.facing.y : 1) * 120 };
    heilerLicht(tp.x, tp.y, sk);
    return true;
  }
  if (sk.id === 'windfessel' && hfx3On()) {
    addEffect({ type: 'hgust3', follow: p, r: sk.radius, dur: 0.7 });
    if (remote) return true;
  }
  return false;
}
// Windfessel: in 3D Windbänder um die Gegner statt Bodenringe
if (SKILL_FX.windfessel) {
  SKILL_FX.windfessel.cast = (p, sk) => {
    if (!hfx3On()) addEffect({ type: 'tornado', follow: p, r: sk.radius * 0.6, dur: 0.7, color: '#d8fff8' });
  };
  SKILL_FX.windfessel.curseHit = (m, sk) => {
    if (hfx3On()) addEffect({ type: 'hwind3', follow: m, dur: Math.min(6, (sk && sk.duration) || 6) });
    else addEffect({ type: 'tornado', follow: m, ox: 0, oy: 0, r: 20, dur: 0.9, color: '#d8fff8' });
  };
}
