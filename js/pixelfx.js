'use strict';
// Pixel-Effekte für 2D (seit 15.61): Feuer, Leuchten, Rauch, Funken und Teilchen im Pixel-Stil statt weicher Verläufe.
//
// Vorbild war ein Video über Pixel-Effekte (nur angesehen, nichts übernommen): Flammen aus wenigen Farbstufen mit
// hellem Kern, harte Bildpunkte, Leuchten in Ringen statt Verlauf, Rauch als Ballen mit Licht oben links, Bilder im
// Takt von 12 je Sekunde. Alles hier ist eigener Code.
//
// Wirkt nur beim Malen in die Pixel-Fläche (pixel2d.js: flach PIX.x, schräg TILTBUF.g/f); 3D und der Stil „Fein“
// bleiben unberührt. Die bestehenden Bausteine flame2d, spark2d, smoke2d (feuerfeld.js), glow (zeichnen.js) und
// drawParticles (effekte.js) schalten dort auf die Pixel-Fassung um – damit sehen alle Fertigkeiten, die sie benutzen,
// sofort pixelig aus. Dazu kommt die neue 2D-Fassung der Inferno-Ulti (pxinferno).

// Farbstufen von heiß nach kalt
const PXFX_PAL = {
  feuer: ['#fffbe2', '#ffe36a', '#ffa630', '#f2552a', '#a8222a', '#4c1422'],
  frost: ['#ffffff', '#dcf6ff', '#94dcff', '#46a4f2', '#2c5cba', '#1c2a5c'],
  blitz: ['#ffffff', '#fffbc0', '#ffe94a', '#f0b020', '#9a6a10', '#3a2a10'],
  arkan: ['#fff0ff', '#f2bcff', '#c474ff', '#8c3ce2', '#4e1ca2', '#22104a'],
  gift: ['#f6ffe0', '#c8ff72', '#7ae042', '#3aa83a', '#1e6a2a', '#103418'],
  blut: ['#ffe2e2', '#ff7a7a', '#e02a3a', '#a0101e', '#5a0814', '#2a040a']
};
const PXFX_RGB = {};
for (const [k, l] of Object.entries(PXFX_PAL)) PXFX_RGB[k] = l.map((h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; });
const PXFX_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const PXFX_FPS = 12;

function pxHash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// Wertrauschen, in y mit der Periode py (Zellen) wiederholt – damit laufen die Flammenbilder nahtlos im Kreis
function pxNoise(x, y, py, s) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const y0 = ((iy % py) + py) % py;
  const y1 = (y0 + 1) % py;
  const a = pxHash(ix, y0, s);
  const b = pxHash(ix + 1, y0, s);
  const c = pxHash(ix, y1, s);
  const d = pxHash(ix + 1, y1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

// Malen wir gerade in die Pixel-Fläche?
function pxfxCtx(ctx) {
  if (typeof V3 !== 'undefined' && V3.on) return false;
  if (typeof PIX === 'undefined' || !PIX.inWorld) return false;
  if (ctx === PIX.x) return true;
  return typeof TILTBUF !== 'undefined' && (ctx === TILTBUF.g || ctx === TILTBUF.f || ctx === TILTBUF.p);
}
// nächste Größe aus einer Reihe (wenige gebackene Bilder, jedes Bildpunkt für Bildpunkt)
const PXFX_SIZES = [3, 4, 5, 6, 8, 10, 12, 14, 17, 20, 24, 28, 33, 39, 46, 54, 64, 76, 90];
function pxSize(v) {
  let best = PXFX_SIZES[0];
  for (const s of PXFX_SIZES) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
  return best;
}

// --- Flammen ------------------------------------------------------------------------------------------------------
const PXFX_NF = 8;
const PXFX_FLAMES = new Map();
function pxFlameFrames(pw, ph, pal) {
  const key = pw + 'x' + ph + pal;
  let fr = PXFX_FLAMES.get(key);
  if (fr) return fr;
  const P = PXFX_RGB[pal] || PXFX_RGB.feuer;
  fr = [];
  const PY = 5;
  for (let f = 0; f < PXFX_NF; f++) {
    const c = newCanvas(pw, ph);
    const g = c.getContext('2d');
    const img = g.createImageData(pw, ph);
    const d = img.data;
    const ph2 = (f / PXFX_NF) * Math.PI * 2;
    for (let y = 0; y < ph; y++) {
      const v = (y + 0.5) / ph;
      // Breite: unten rund, nach oben spitz
      let w = v < 0.76 ? Math.pow(v / 0.76, 0.72) : Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.76) / 0.24, 2)));
      w = Math.max(0.06, w * 0.94);
      const sway = 0.24 * (1 - v) * (1 - v) * Math.sin(v * 5.2 + ph2);
      for (let x = 0; x < pw; x++) {
        const u = ((x + 0.5) / pw) * 2 - 1;
        const body = 1 - Math.abs(u - sway) / w;
        const n = pxNoise((x / pw) * 3.2 + 7, v * PY + (f / PXFX_NF) * PY, PY, 11);
        let h = body * (0.45 + 0.8 * v) + (n - 0.5) * 0.75 - (1 - v) * 0.1;
        h += (PXFX_BAYER[(y & 3) * 4 + (x & 3)] - 0.5) * 0.16;
        let idx = h > 0.8 ? 0 : h > 0.62 ? 1 : h > 0.45 ? 2 : h > 0.29 ? 3 : h > 0.15 ? 4 : -1;
        // einzelne Glutpunkte über der Spitze
        if (idx < 0 && v < 0.45 && body > -0.6 && n > 0.83 && pxHash(x, y + f * 31, 5) > 0.55) idx = 2;
        if (idx < 0) continue;
        const o = (y * pw + x) * 4;
        const col = P[idx];
        d[o] = col[0];
        d[o + 1] = col[1];
        d[o + 2] = col[2];
        d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    fr.push(c);
  }
  if (PXFX_FLAMES.size > 260) PXFX_FLAMES.delete(PXFX_FLAMES.keys().next().value);
  PXFX_FLAMES.set(key, fr);
  return fr;
}
// Flamme mit dem Fuß bei (x, y), w × hh Welt-Einheiten
function pxFlame(ctx, x, y, w, hh, t, seed, a, rot, pal) {
  if (a <= 0.06 || hh <= 2) return;
  const U = PIX.units;
  const ph = pxSize(hh / U);
  const asp = w / hh;
  const pw = Math.max(3, Math.round(ph * (asp < 0.42 ? 0.38 : asp < 0.6 ? 0.52 : asp < 0.8 ? 0.68 : 0.9)));
  const fr = pxFlameFrames(pw, ph, pal || 'feuer');
  const img = fr[(Math.floor(t * PXFX_FPS + seed * 3.7) % PXFX_NF + PXFX_NF) % PXFX_NF];
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = a > 0.7 ? 1 : a > 0.35 ? 0.7 : 0.4;
  if (rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(img, (-pw / 2) * U, -ph * U, pw * U, ph * U);
    ctx.restore();
  } else ctx.drawImage(img, Math.round(x / U - pw / 2) * U, Math.round(y / U - ph) * U, pw * U, ph * U);
  ctx.globalAlpha = ga;
}

// --- Leuchten und Rauch als Ringe aus wenigen Stufen ------------------------------------------------------------------
const PXFX_DISCS = new Map();
function pxHexRgb(hex) {
  const n = parseInt(String(hex).slice(1, 7), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function pxDisc(hex, rb, kind) {
  const key = hex + rb + kind;
  let c = PXFX_DISCS.get(key);
  if (c) return c;
  const n = rb * 2 + 1;
  c = newCanvas(n, n);
  const g = c.getContext('2d');
  const img = g.createImageData(n, n);
  const d = img.data;
  const [r, gg, b] = pxHexRgb(hex);
  const lum = (r * 0.3 + gg * 0.59 + b * 0.11) / 255;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (x - rb) / (rb + 0.5);
      const dy = (y - rb) / (rb + 0.5);
      const q = Math.hypot(dx, dy);
      if (q > 1) continue;
      const bay = PXFX_BAYER[(y & 3) * 4 + (x & 3)];
      let al;
      let cr = r;
      let cg = gg;
      let cb = b;
      if (kind === 'puff') {
        // Rauchballen: gerastert durchscheinend, Licht oben links, ausgefranster Rand
        const edge = 0.8 + 0.18 * pxHash(Math.round(Math.atan2(dy, dx) * 4), 3, rb);
        if (q > edge) continue;
        const lv = Math.floor((1 - q / edge) * 3 + (bay - 0.5) * 1.1);
        if (lv <= 0 && bay > 0.5) continue;
        al = [70, 120, 165, 200][Math.max(0, Math.min(3, lv))];
        const lt = -(dx + dy) * 0.7;
        const m = lt > 0.3 ? 1.28 : lt < -0.35 ? 0.8 : 1;
        cr = Math.min(255, r * m);
        cg = Math.min(255, gg * m);
        cb = Math.min(255, b * m);
      } else {
        // Leuchten: vier Stufen mit geordnetem Raster an den Übergängen statt Verlauf; helle Farben mit weißlichem Kern
        const lv = Math.floor((1 - q) * 4 + (bay - 0.5) * 0.95);
        if (lv < 0 || (lv === 0 && bay > 0.55)) continue;
        const big = rb >= 18 ? 0.7 : 1;
        al = [48, 92, 156, 228][Math.min(3, lv)] * big;
        if (q < 0.2 && lum > 0.35) {
          cr = r + (255 - r) * 0.55;
          cg = gg + (255 - gg) * 0.55;
          cb = b + (255 - b) * 0.55;
        }
      }
      const o = (y * n + x) * 4;
      d[o] = cr;
      d[o + 1] = cg;
      d[o + 2] = cb;
      d[o + 3] = al;
    }
  }
  g.putImageData(img, 0, 0);
  if (PXFX_DISCS.size > 600) PXFX_DISCS.delete(PXFX_DISCS.keys().next().value);
  PXFX_DISCS.set(key, c);
  return c;
}
function pxGlow(ctx, x, y, r, hex, alpha, kind) {
  if (alpha <= 0.01 || r <= 0) return;
  const U = PIX.units;
  const rb = r / U < 2.2 ? Math.max(1, Math.round(r / U)) : pxSize(r / U);
  const c = pxDisc(hex, rb, kind || 'glow');
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * Math.min(1, alpha);
  ctx.drawImage(c, (Math.round(x / U) - rb) * U, (Math.round(y / U) - rb) * U, (rb * 2 + 1) * U, (rb * 2 + 1) * U);
  ctx.globalAlpha = a;
}

// --- Funkenstrich -------------------------------------------------------------------------------------------------
function pxStreak(ctx, x0, y0, x1, y1, col, head) {
  const U = PIX.units;
  const ax = Math.round(x0 / U);
  const ay = Math.round(y0 / U);
  const bx = Math.round(x1 / U);
  const by = Math.round(y1 / U);
  const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) ctx.fillRect(Math.round(ax + ((bx - ax) * i) / n) * U, Math.round(ay + ((by - ay) * i) / n) * U, U, U);
  ctx.fillStyle = head || '#fff6d8';
  ctx.fillRect(bx * U, by * U, U, U);
}

// --- Die bestehenden Bausteine auf Pixel umschalten -------------------------------------------------------------------
if (typeof flame2d === 'function') {
  const _f = flame2d;
  flame2d = function (ctx, x, y, w, hh, t, seed, a, rot = 0) {
    if (!pxfxCtx(ctx)) return _f(ctx, x, y, w, hh, t, seed, a, rot);
    const fl = 1 + 0.08 * Math.sin(t * 17 + seed * 5);
    pxFlame(ctx, x, y, w, hh * fl, t, seed, a, rot, 'feuer');
  };
}
if (typeof spark2d === 'function') {
  const _s = spark2d;
  spark2d = function (ctx, x, y, len, col, a) {
    if (!pxfxCtx(ctx)) return _s(ctx, x, y, len, col, a);
    if (a <= 0.1) return;
    const ga = ctx.globalAlpha;
    ctx.globalAlpha = a > 0.5 ? 1 : 0.6;
    pxStreak(ctx, x, y, x + len * 0.15, y - len, col);
    ctx.globalAlpha = ga;
  };
}
if (typeof smoke2d === 'function') {
  const _m = smoke2d;
  smoke2d = function (ctx, x, y, r, a) {
    if (!pxfxCtx(ctx)) return _m(ctx, x, y, r, a);
    if (a <= 0.05) return;
    ctx.globalAlpha = 1;
    pxGlow(ctx, x, y, r * 0.75, '#7a6e68', a > 0.45 ? 0.85 : a > 0.2 ? 0.55 : 0.3, 'puff');
  };
}
if (typeof glow === 'function') {
  const _g = glow;
  glow = function (ctx, x, y, r, hex, alpha) {
    if (!pxfxCtx(ctx)) return _g(ctx, x, y, r, hex, alpha);
    pxGlow(ctx, x, y, r, hex, alpha);
  };
}
// Teilchen: harte Bildpunkte, Funken als Pixelstrich, zum Ende flackernd statt verblassend
if (typeof drawParticles === 'function') {
  const _p = drawParticles;
  drawParticles = function (ctx) {
    if (!pxfxCtx(ctx)) return _p(ctx);
    const U = PIX.units;
    ctx.save();
    for (const q of game.particles) {
      const k = q.life / q.max;
      if (k < 0.3 && (Math.floor(q.rot * 97) & 1)) continue;
      ctx.globalCompositeOperation = q.glow ? 'lighter' : 'source-over';
      ctx.globalAlpha = k > 0.45 ? 1 : 0.7;
      if (q.shape === 'spark' || q.shape === 'shard') {
        const L = q.shape === 'spark' ? 0.045 : 0.03;
        pxStreak(ctx, q.x - q.vx * L, q.y - q.vy * L, q.x, q.y, q.color, q.shape === 'spark' ? '#ffffff' : q.color);
        continue;
      }
      const sz = q.shape === 'ember' ? q.size * (0.4 + 0.6 * k) : q.size * (0.5 + 0.5 * k);
      const s = Math.max(1, Math.round(sz / U));
      const px = Math.round(q.x / U) - (s >> 1);
      const py = Math.round(q.y / U) - (s >> 1);
      ctx.fillStyle = q.color;
      ctx.fillRect(px * U, py * U, s * U, s * U);
      // heller Kern bei größeren leuchtenden Teilchen
      if (q.glow && s >= 3 && k > 0.4) {
        ctx.fillStyle = '#fff6e0';
        ctx.fillRect((px + (s >> 1)) * U, (py + (s >> 1)) * U, U, U);
      }
    }
    ctx.restore();
  };
}

// --- Aufrechte Effektteile in der Tiefensortierung ------------------------------------------------------------------
// Flammenwände und Feuerhosen stehen zwischen den Figuren: was weiter unten steht, verdeckt, was dahinter steht.
// Jede Effektart mit Eintrag in PXFX_STAND legt je Bild ihre Flammen als Weltobjekte ('pxflame') in die Szene.
const PXFX_STAND = {};
if (typeof collectWorldObjects === 'function') {
  const _c = collectWorldObjects;
  collectWorldObjects = function (list, x0, y0, x1, y1) {
    _c(list, x0, y0, x1, y1);
    if ((typeof V3 !== 'undefined' && V3.on) || !game.effects || !game.effects.length) return;
    const X0 = x0 * TILE - 60;
    const Y0 = y0 * TILE - 40;
    const X1 = (x1 + 1) * TILE + 60;
    const Y1 = (y1 + 1) * TILE + 200;
    for (const e of game.effects) {
      const f = PXFX_STAND[e.type];
      if (!f) continue;
      f(e, game.time - e.start, (o) => {
        if (o.x > X0 && o.x < X1 && o.y > Y0 && o.y < Y1) list.push(o);
      });
    }
  };
}
if (typeof drawWorldObject === 'function') {
  const _d = drawWorldObject;
  drawWorldObject = function (ctx, o) {
    if (o.worldObj !== 'pxflame') return _d(ctx, o);
    const ga = ctx.globalAlpha;
    const gc = ctx.globalCompositeOperation;
    if (o.glow) {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, o.x, o.y - o.lift - o.hh * 0.35, o.hh * 0.6, o.pal === 'feuer' || !o.pal ? '#ff7a2a' : PXFX_PAL[o.pal][2], 0.35 * o.a);
      ctx.globalCompositeOperation = gc;
    }
    if (pxfxCtx(ctx)) pxFlame(ctx, o.x, o.y - o.lift, o.w, o.hh, o.t, o.seed, o.a, 0, o.pal);
    else if (typeof flame2d === 'function') flame2d(ctx, o.x, o.y - o.lift, o.w, o.hh, o.t, o.seed, o.a, 0);
    ctx.globalAlpha = ga;
  };
}

// --- Inferno in 2D (Feuer-Ulti) -------------------------------------------------------------------------------------
// Ablauf wie in 3D (inferno3): Glut zieht sich zusammen, eine Feuerhose bricht um die Figur aus, drei Flammenwände
// rollen nacheinander nach außen (Radius und Zeit wie die Treffer, novaHitTime), Rauch steigt, Glut fliegt, der
// Boden reißt glühend auf. Kein Siegel, kein flacher Ring am Boden.
const PXINF = { dur: 4.4, column: [0.12, 1.9], H: 118 };
function pxInfWave(k, t) {
  const [R, grow] = INFERNO_WAVES[k];
  const t0 = k * 0.45;
  const u = t - t0;
  if (u < 0) return null;
  const q = u < grow ? 1 - Math.pow(1 - u / grow, 2) : 1;
  const r = R * (0.08 + 0.92 * q);
  const life = u < grow ? 1 : Math.max(0, 1 - (u - grow) / 0.6);
  if (life <= 0) return null;
  return { r, u, grow, life, R };
}
PXFX_STAND.pxinferno = function (e, t, push) {
  const cx = e.x;
  const fy = e.y;
  // Feuerhose: Flammen auf einer Schraube um die Figur, oben weiter
  const [c0, c1] = PXINF.column;
  if (t > c0 && t < c1) {
    const rise = Math.min(1, (t - c0) / 0.35);
    const fade = t > c1 - 0.45 ? (c1 - t) / 0.45 : 1;
    const H = PXINF.H * rise;
    const n = 26;
    const lift0 = t > c1 - 0.45 ? (0.45 - (c1 - t)) * 90 : 0;
    for (let i = 0; i < n; i++) {
      const v = i / (n - 1);
      const h = v * H + lift0;
      const a = t * 8.5 + i * 1.15;
      const rr = 7 + h * 0.2;
      const s = 0.8 + 0.2 * Math.sin(i * 2.1 + t * 6);
      const hh = (24 + h * 0.24) * s;
      push({ worldObj: 'pxflame', x: cx + Math.cos(a) * rr, y: fy + Math.sin(a) * rr * 0.45 + 0.5, lift: h, w: hh * 0.72, hh, t, seed: i + e.seed, a: fade * (v < 0.92 ? 1 : 0.7) });
    }
    // Feuerkranz um die Füße
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + t * 2;
      const hh = 20 * rise * fade * (0.8 + 0.3 * Math.sin(t * 9 + i));
      if (hh > 5) push({ worldObj: 'pxflame', x: cx + Math.cos(a) * 18, y: fy + Math.sin(a) * 12, lift: 0, w: hh * 0.7, hh, t, seed: i * 3 + 70, a: 1 });
    }
  }
  // drei Flammenwände
  for (let k = 0; k < 3; k++) {
    const W = pxInfWave(k, t);
    if (!W) continue;
    // Grafik „Niedrig“: halb so viele Flammen, ohne zweite Reihe
    const low = typeof opts !== 'undefined' && opts.graphics === 'niedrig';
    const n = Math.max(12, Math.min(low ? 36 : 72, Math.round((W.r * Math.PI * 2) / (low ? 22 : 12))));
    const H0 = (34 + k * 6) * (1 - 0.35 * Math.min(1, W.u / W.grow)) * W.life;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + k * 0.7 + e.seed;
      const j = pxHash(i, k, 7);
      const rr = W.r * (0.97 + 0.06 * j);
      const hh = H0 * (0.75 + 0.5 * pxHash(i, k, 9)) * (0.85 + 0.15 * Math.sin(t * 11 + i));
      if (hh < 5) continue;
      push({ worldObj: 'pxflame', x: cx + Math.cos(a) * rr, y: fy + Math.sin(a) * rr, lift: 0, w: hh * 0.62, hh, t, seed: i * 1.7 + k * 5 + e.seed, a: 1, glow: i % 4 === 0 });
      // zweite Reihe dicht dahinter: die Wand bekommt Tiefe
      if (low) continue;
      const a2 = a + Math.PI / n;
      const r3 = rr - 9 - 5 * j;
      push({ worldObj: 'pxflame', x: cx + Math.cos(a2) * r3, y: fy + Math.sin(a2) * r3, lift: 0, w: hh * 0.55, hh: hh * 0.8, t, seed: i * 2.3 + k * 7 + 33, a: 1 });
      // Nachglut innen hinter der Front
      if (i % 3 === 0 && W.r > 60) {
        const r2 = W.r * (0.62 + 0.15 * j);
        const h2 = hh * 0.42 * Math.min(1, W.life * 1.4);
        if (h2 > 5) push({ worldObj: 'pxflame', x: cx + Math.cos(a + 0.2) * r2, y: fy + Math.sin(a + 0.2) * r2, lift: 0, w: h2 * 0.7, hh: h2, t, seed: i + 50 + k * 9, a: 0.8 });
      }
    }
  }
};
// flach am Boden (vor den Figuren gemalt): glühende Risse und der Glutschein unter den Wänden; darüber Rauch
EXTRA_EFFECTS.pxinferno = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  ctx.globalAlpha = 1;
  if (e.ground) {
    // Risse: gezackte Linien vom Mittelpunkt, die mit den Wänden mitwachsen und nachglühen
    const U = PIX.units;
    const reach = Math.max(0, ...[0, 1, 2].map((k2) => { const W = pxInfWave(k2, t); return W ? W.r : 0; }), t > 1.4 ? 270 : 0);
    const cool = t < 2.2 ? 1 : Math.max(0, 1 - (t - 2.2) / 2.2);
    if (cool > 0) {
      for (let j = 0; j < 7; j++) {
        let a = (j / 7) * Math.PI * 2 + e.seed * 1.3;
        let px = x;
        let py = y;
        const L = Math.min(reach * 0.85, 70 + 130 * pxHash(j, 1, 3));
        for (let s = 0; s < L; s += 7) {
          a += (pxHash(j, s, 4) - 0.5) * 0.9;
          const nx = px + Math.cos(a) * 7;
          const ny = py + Math.sin(a) * 7;
          const hot = cool * (1 - s / (L + 1));
          if (typeof pxfxCtx === 'function' && pxfxCtx(ctx)) {
            ctx.globalCompositeOperation = 'source-over';
            const c1c = hot > 0.55 ? '#ffb040' : hot > 0.25 ? '#e2502a' : '#5a1a12';
            const c2c = hot > 0.55 ? '#fff0b0' : hot > 0.25 ? '#ff8a3a' : '#7a2a1a';
            pxStreak(ctx, px, py, nx, ny, c1c, c2c);
            if (s < 45) pxStreak(ctx, px + U, py, nx + U, ny, c1c, c2c);
          } else {
            ctx.strokeStyle = hot > 0.4 ? '#ff8a3a' : '#7a2014';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(nx, ny);
            ctx.stroke();
          }
          px = nx;
          py = ny;
          void U;
        }
      }
    }
    // Glutschein unter den Wänden
    ctx.globalCompositeOperation = 'lighter';
    for (let k2 = 0; k2 < 3; k2++) {
      const W = pxInfWave(k2, t);
      if (!W) continue;
      const n = Math.max(8, Math.min(28, Math.round(W.r / 9)));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k2;
        glow(ctx, x + Math.cos(a) * W.r, y + Math.sin(a) * W.r, 22, '#c8401a', 0.35 * W.life);
      }
    }
    // unter der Feuerhose
    if (t > PXINF.column[0] && t < PXINF.column[1]) glow(ctx, x, y, 40, '#e8602a', 0.4);
    // Glutnester: verstreute glühende Kohlen, die langsam auskühlen
    if (t > 0.9) {
      const cool2 = Math.max(0, 1 - (t - 0.9) / 3.5);
      for (let i = 0; i < 26; i++) {
        const a = pxHash(i, 2, 8) * Math.PI * 2;
        const d = 30 + Math.sqrt(pxHash(i, 3, 8)) * 220;
        if (d > reach) continue;
        const hot = cool2 * (0.6 + 0.4 * Math.sin(t * 5 + i));
        if (hot < 0.08) continue;
        glow(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, 7, '#ff6a1a', 0.6 * hot);
        glow(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, 2.5, '#ffe36a', hot);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    return;
  }
  // Rauch über den Wänden und aus der Feuerhose
  for (let k2 = 0; k2 < 3; k2++) {
    const W = pxInfWave(k2, t);
    if (!W || W.u < 0.3) continue;
    const n = Math.max(4, Math.min(9, Math.round(W.r / 30)));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + k2 * 1.3 + 0.4;
      const up = 30 + W.u * 45 + 12 * pxHash(i, k2, 2);
      smoke2d(ctx, x + Math.cos(a) * W.r * 0.92, y + Math.sin(a) * W.r * 0.92 - up, 8 + W.u * 10, 0.4 * W.life);
    }
  }
  if (t > 1.2 && t < 3.2) {
    const u = (t - 1.2) / 2;
    for (let i = 0; i < 6; i++) smoke2d(ctx, x + Math.sin(i * 2.3 + t) * (10 + u * 30), y - PXINF.H - 10 - u * 60 - i * 9, 14 + u * 18, 0.6 * (1 - u));
  }
  // Hitzeflimmern ganz oben: Glutpunkte
  ctx.globalCompositeOperation = 'lighter';
  if (t < PXINF.column[1]) glow(ctx, x, y - PXINF.H * 0.6, 40, '#ff9a3a', 0.45 * Math.min(1, t * 4));
  ctx.globalCompositeOperation = 'source-over';
};

// Inferno-Optik: in 2D die neue Fassung, in 3D unverändert (inferno3)
if (typeof infernoFx === 'function') {
  const _inf = infernoFx;
  infernoFx = function (x, fy, near) {
    if (typeof V3 !== 'undefined' && V3.on) return _inf(x, fy, near);
    const seed = Math.random() * 6.28;
    // ground: Risse und Glutschein (vor den Figuren), sonst Rauch (danach); die Flammen selbst über PXFX_STAND
    addEffect({ type: 'pxinferno', x, y: fy, dur: PXINF.dur, seed });
    addEffect({ type: 'pxinferno', ground: true, x, y: fy, dur: PXINF.dur, seed, quiet: true });
    // Ausholen: Glut zieht sich zur Figur zusammen
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      particles(x + Math.cos(a) * 70, fy - 20 + Math.sin(a) * 40, { count: 1, color: ['#ffe36a', '#ffa630', '#fffbe2'], angle: a + Math.PI, spread: 0.1, speed: [220, 260], life: [0.22, 0.3], size: [2, 3.5], shape: 'spark', drag: 1, glow: true });
    }
    INFERNO_WAVES.forEach(([R], k) => {
      later(k * 0.45, () => {
        // Glut fliegt aus der Front hoch
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + k;
          particles(x + Math.cos(a) * R * 0.35, fy + Math.sin(a) * R * 0.35, { count: 1, color: ['#ffe36a', '#ffa630', '#f2552a', '#fffbe2'], angle: -Math.PI / 2 + Math.cos(a) * 0.6, spread: 0.5, speed: [120, 260], life: [0.7, 1.3], size: [2, 4], shape: 'square', drag: 1.1, gravity: 160, glow: true, jitter: 6 });
        }
        if (near) shakeScreen(4 + k * 1.5);
      });
    });
  };
}

// --- Explosion als Bildfolge (Feuerball, Phönix …) -------------------------------------------------------------------
const PXFX_BLAST_N = 10;
const PXFX_BLASTS = new Map();
function pxBlastFrames(R, pal) {
  const key = R + pal;
  let fr = PXFX_BLASTS.get(key);
  if (fr) return fr;
  const P = PXFX_RGB[pal] || PXFX_RGB.feuer;
  fr = [];
  const n = R * 2 + 1;
  for (let f = 0; f < PXFX_BLAST_N; f++) {
    const u = f / (PXFX_BLAST_N - 1);
    const c = newCanvas(n, n);
    const g = c.getContext('2d');
    const img = g.createImageData(n, n);
    const d = img.data;
    // Feuerball wächst schnell, kühlt ab und zerfällt von innen zu Rauch
    const rf = R * (0.35 + 0.65 * Math.sqrt(u));
    const heat0 = 1.35 - u * 1.25;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dx = x - R;
        const dy = y - R;
        const q = Math.hypot(dx, dy) / rf;
        const nz = pxNoise(x * 0.32 + 3, y * 0.32 + u * 2.5, 997, 23);
        if (q > 1 + (nz - 0.5) * 0.5) continue;
        const bay = PXFX_BAYER[(y & 3) * 4 + (x & 3)];
        let h = (1 - q) * 1.1 * heat0 + (nz - 0.5) * 0.6 + (bay - 0.5) * 0.18 + (dy < 0 ? -dy / rf * 0.15 : 0);
        // innen hohl werdend (Rauchring)
        if (u > 0.5 && q < (u - 0.5) * 1.6 && pxHash(x, y, f) > 0.3) continue;
        let col;
        if (h > 0.85) col = P[0];
        else if (h > 0.62) col = P[1];
        else if (h > 0.42) col = P[2];
        else if (h > 0.26) col = P[3];
        else if (h > 0.12) col = P[4];
        else if (h > 0.02 && bay < 0.5 - u * 0.3) col = P[5];
        else continue;
        const o = (y * n + x) * 4;
        d[o] = col[0];
        d[o + 1] = col[1];
        d[o + 2] = col[2];
        d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    fr.push(c);
  }
  if (PXFX_BLASTS.size > 40) PXFX_BLASTS.delete(PXFX_BLASTS.keys().next().value);
  PXFX_BLASTS.set(key, fr);
  return fr;
}
// u: 0..1 Verlauf, R Welt-Einheiten
function pxBlast(ctx, x, y, R, u, pal) {
  if (u < 0 || u >= 1) return;
  const U = PIX.units;
  const Rp = pxSize(R / U);
  const fr = pxBlastFrames(Rp, pal || 'feuer');
  const img = fr[Math.min(PXFX_BLAST_N - 1, Math.floor(u * PXFX_BLAST_N))];
  ctx.drawImage(img, (Math.round(x / U) - Rp) * U, (Math.round(y / U) - Rp) * U, (Rp * 2 + 1) * U, (Rp * 2 + 1) * U);
}

// Feuerball-Explosion: Bildfolge statt Lichtfleck, dann Funken und aufsteigender Rauch
if (EXTRA_EFFECTS.mburst3) {
  const _b = EXTRA_EFFECTS.mburst3;
  EXTRA_EFFECTS.mburst3 = (ctx, e, k, x, y) => {
    if (!pxfxCtx(ctx)) return _b(ctx, e, k, x, y);
    const t = game.time - e.start;
    if (t > 1.6) return;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    if (t < 0.35) glow(ctx, x, y - 18, e.R * (0.6 + t), '#ff7a2a', 0.7 * (1 - t / 0.35));
    ctx.globalCompositeOperation = 'source-over';
    pxBlast(ctx, x, y - 20 - t * 10, Math.min(60, e.R * 0.55), t / 0.75, 'feuer');
    // kleinere Nachexplosionen ringsum
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.6;
      const tt = t - 0.06 - i * 0.05;
      pxBlast(ctx, x + Math.cos(a) * e.R * 0.42, y - 10 + Math.sin(a) * e.R * 0.3, Math.min(30, e.R * 0.26), tt / 0.55, 'feuer');
    }
    for (let i = 0; i < 14; i++) {
      const a = pxHash(i, 5, 1) * 6.28;
      const vh = 90 + 140 * pxHash(i, 6, 1);
      const vy = 100 + 150 * pxHash(i, 7, 1);
      const py = vy * t - 170 * t * t;
      if (py < 0) continue;
      spark2d(ctx, x + Math.cos(a) * vh * t, y + Math.sin(a) * vh * t * 0.5 - py, 6, i % 2 ? '#ffd36a' : '#fff1c8', 1 - t / 1.2);
    }
    if (t > 0.45) for (let i = 0; i < 5; i++) smoke2d(ctx, x + (i - 2) * 12 + Math.sin(t * 2 + i) * 4, y - 40 - (t - 0.45) * 50 - (i % 2) * 8, 10 + (t - 0.45) * 14, 0.6 * (1 - (t - 0.45) / 1.15));
    ctx.restore();
  };
}

// Feuertornado: Trichter aus Pixel-Flammen statt gestapelter Lichtflecken
if (EXTRA_EFFECTS.mtornado3) {
  const _tn = EXTRA_EFFECTS.mtornado3;
  EXTRA_EFFECTS.mtornado3 = (ctx, e, k, x, y) => {
    if (!pxfxCtx(ctx)) return _tn(ctx, e, k, x, y);
    const t = game.time - e.start - e.delay;
    if (t < 0 || t > e.life) return;
    const vis = easeOut(clamp01(t / 0.45)) * clamp01((e.life - t) / 0.55);
    const H = 118 * vis;
    ctx.save();
    ctx.globalAlpha = 1;
    for (let i = 0; i < e.n; i++) {
      const c = tornadoPos(e, i, t);
      const bx = x + (c.x - e.x);
      const by = y + (c.y - e.y) * 0.7;
      const ph = i * 1.7;
      const ax = (v) => bx + Math.sin(t * 3.1 + v * 3.4 + ph) * 9 * v;
      const rw = (v) => (5 + 26 * Math.pow(v, 1.35)) * vis;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, bx, by - 2, 30 * vis, '#ff5a1a', 0.5 * vis);
      glow(ctx, ax(0.5), by - H * 0.5, 34 * vis, '#e8361a', 0.3 * vis);
      ctx.globalCompositeOperation = 'source-over';
      // hinten (dunkler Teil der Schraube), dann vorn
      for (const side of [-1, 1]) {
        for (let j = 0; j < 14; j++) {
          const v = j / 13;
          const a = -t * 10 + v * 8 + ph + (side < 0 ? Math.PI : 0);
          const s2 = Math.sin(a) * side;
          if (s2 < 0) continue;
          const r = rw(v);
          const hh = (16 + 22 * v) * vis;
          pxFlame(ctx, ax(v) + Math.cos(a) * r, by - v * H + Math.sin(a) * r * 0.3 + hh * 0.6, hh * 0.7, hh, t, j + i * 20 + (side < 0 ? 9 : 0), side < 0 ? 0.6 : 1, 0, 'feuer');
        }
      }
      for (let j = 0; j < 5; j++) {
        const a = -t * 6 + j * 1.26 + ph;
        flame2d(ctx, bx + Math.cos(a) * 12 * vis, by + Math.sin(a) * 4, 16, 30 * vis, t, j + i * 5, 0.9 * vis, Math.cos(a) * 0.35);
      }
      smoke2d(ctx, ax(1) + Math.sin(t * 1.3 + i) * 10, by - H - 10 - ((t * 0.6) % 1) * 18, 18 * vis, 0.5 * vis);
    }
    ctx.restore();
  };
}

// Treffer: heller Kern, der in der Trefferfarbe abkühlt, und kurze Pixelsplitter in zufälligen Richtungen
if (typeof drawEffect === 'function') {
  const _de = drawEffect;
  drawEffect = function (ctx, e) {
    // große Bodensiegel der Ultis (Dreieck, Kreis mit Zeichen) gibt es im Pixel-Stil nicht – Bodenregel: keine Runen
    if (e.type === 'sigil3' && (e.R || 0) >= 100 && pxfxCtx(ctx)) return;
    if (e.type !== 'impact' || !pxfxCtx(ctx)) return _de(ctx, e);
    const k = Math.min(1, (game.time - e.start) / e.dur);
    const { x, y } = effectOrigin(e);
    const col = e.color || '#fff2d0';
    const R = e.big ? 26 : 15;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (k < 0.5) {
      glow(ctx, x, y, R * (0.5 + k), k < 0.2 ? '#ffffff' : col, 1 - k * 1.6);
      glow(ctx, x, y, R * 0.3, '#ffffff', 1 - k * 2);
    }
    const n = e.big ? 9 : 6;
    const seed = Math.floor(e.start * 1000) % 997;
    for (let i = 0; i < n; i++) {
      const a = pxHash(i, seed, 41) * Math.PI * 2;
      const L = R * (0.7 + 0.8 * pxHash(i, seed, 42));
      const d0 = L * (0.25 + 0.9 * k);
      const d1 = d0 + L * 0.45 * (1 - k);
      if (k > 0.85 && i % 2) continue;
      pxStreak(ctx, x + Math.cos(a) * d0, y + Math.sin(a) * d0, x + Math.cos(a) * d1, y + Math.sin(a) * d1, col, k < 0.5 ? '#ffffff' : col);
    }
    ctx.restore();
  };
}
