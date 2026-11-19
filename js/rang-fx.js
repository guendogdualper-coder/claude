// Rang-Effekte in 3D (seit 12.6): jede Fertigkeit sieht mit ihrem Rang prächtiger aus, bei allen Klassen.
// Beim Wirken (rankcast3, an der Figur) und bei jedem Treffer (rankhit3, am Gegner), zusätzlich zur Attacke:
//   Erwacht (E)   – Spirale aus blau-weißen Funken steigt um die Figur, Treffer sprühen blau-weiß
//   Heroisch (H)  – dazu zwei gegenläufige Funkenkränze (violett, rosa, blau) um Brust und Kopf,
//                   Treffer mit kleinen violetten Blitzen
//   Legendär (L)  – dazu eine goldene Lichtsäule, ein Lichtblitz und kreisende Goldsterne über dem Kopf,
//                   Treffer mit goldenem Sternenkreuz
//   Vollendet (V) – dazu Flammenflügel hinter der Figur, eine Feuerkrone und ein Glutsturm in Rot, Gold und
//                   Violett; Treffer mit einer Feuernova und Glutregen
// Nichts davon liegt am Boden. In 2D bleibt es bei rankCastFx/rankHitFx (fertigkeiten.js).

const RANK3_COLORS = [
  ['#9fd0ff', '#7affd8', '#e8f8ff', '#5ac8ff'],
  ['#c58cff', '#ff8ae0', '#7a9aff', '#e8d0ff'],
  ['#ffd34d', '#fff3b0', '#ff9a2a', '#ffffff'],
  ['#ff6a4a', '#ffd34d', '#c84aff', '#ffffff', '#ff2a1a']
];
const rk3c = (r, i) => RANK3_COLORS[r][i % RANK3_COLORS[r].length];

FX3_TYPES.add('rankcast3');
FX3_TYPES.add('rankhit3');
EXTRA_EFFECTS.rankcast3 = () => {};
EXTRA_EFFECTS.rankhit3 = () => {};

FX3_DRAW.rankcast3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const r = e.rank;
  const low = n3low();
  const ow = e.owner && !e.owner.gone && !e.owner.dead ? e.owner : null;
  const x = (ow ? ow.x : e.x) * U3;
  const z = (ow ? feetY(ow) : e.y) * U3;
  let fade = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
  // seit 14.61 leise Fassung (e.soft): ohne Zusatzebenen, ohne großen Lichtfleck, Spirale halb so hell und dicht
  if (e.soft) fade *= 0.55;
  else {
    rankCastExtra3(h, e, x, z, t, r, fade, low);
    n3Glow(h, x, 1.0, z, 1.3 + r * 0.35, rk3c(r, 0), fade * (r >= 3 ? 0.3 : 0.45));
  }
  // 1) Funkenspirale (alle Ränge)
  const n = ((low ? 10 : 18) + r * (low ? 4 : 8)) >> (e.soft ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const ph = (t * (1.2 + r * 0.15) + i / n) % 1;
    const a = i * 2.399 + t * (3 + r);
    const rr = (0.5 + r * 0.08) * (1 - ph * 0.45);
    const y = 0.1 + ph * (1.7 + r * 0.35);
    n3Glow(h, x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, (r === 0 ? 0.36 : 0.22 + r * 0.03) * (1 - ph * 0.5), rk3c(r, i), fade * (1 - ph));
    if (!low && i % 3 === 0) n3Glow(h, x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, 0.08, '#ffffff', fade * (1 - ph));
  }
  if (e.soft) return;
  if (r < 1) {
    // Erwacht: ein Funkenkranz um die Brust
    for (let i = 0; i < (low ? 6 : 9); i++) {
      const a = (i / (low ? 6 : 9)) * Math.PI * 2 + t * 4;
      n3Glow(h, x + Math.cos(a) * 0.55, 1.05, z + Math.sin(a) * 0.55, 0.26, rk3c(0, i), fade * 0.9);
    }
    return;
  }
  // 2) zwei gegenläufige Kränze mit Schweif
  for (const [y, dir, rr] of [[0.95, 1, 0.62], [1.65, -1, 0.48]]) {
    const m = low ? 6 : 10;
    for (let i = 0; i < m; i++) {
      for (let s = 0; s < (low ? 1 : 3); s++) {
        const a = (i / m) * Math.PI * 2 + dir * (t * 4.5 - s * 0.12);
        n3Glow(h, x + Math.cos(a) * rr, y + Math.sin(a * 2 + t * 3) * 0.05, z + Math.sin(a) * rr, 0.2 - s * 0.05, rk3c(r, i + s), fade * (1 - s * 0.25));
      }
    }
  }
  if (r < 2) return;
  // 3) Lichtsäule, Blitz am Anfang, Goldsterne über dem Kopf
  fx3MageSprite(h, 'sprite', 'disc', x, 1.4, z, 0.9 + r * 0.12, 3.2 + r * 0.4, rk3c(r, 0), fade * (r >= 3 ? 0.3 : 0.45));
  fx3MageSprite(h, 'sprite', 'disc', x, 1.4, z, 0.35, 3.4 + r * 0.4, '#ffffff', fade * (r >= 3 ? 0.15 : 0.4));
  if (t < 0.25) n3Glow(h, x, 1.0, z, 2.6 * (t / 0.25 + 0.3), rk3c(r, 1), (1 - t / 0.25) * 0.7);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 2.2;
    const sx = x + Math.cos(a) * 0.42;
    const sz = z + Math.sin(a) * 0.42;
    const sy = 2.2 + Math.sin(t * 5 + i) * 0.06;
    fx3MageSprite(h, 'sprite', 'disc', sx, sy, sz, 0.34, 0.07, '#fff6d0', fade * 0.9);
    fx3MageSprite(h, 'sprite', 'disc', sx, sy, sz, 0.07, 0.34, '#fff6d0', fade * 0.9);
    n3Glow(h, sx, sy, sz, 0.2, rk3c(r, i), fade * 0.8);
  }
  if (r < 3) return;
  // 4) Vollendet: Flammenflügel, Feuerkrone, Glutsturm
  const wing = Math.min(1, t / 0.3);
  for (const side of [-1, 1]) {
    for (let i = 0; i < (low ? 3 : 6); i++) {
      const u = i / 5;
      const ang = side * (0.35 + u * 1.0);
      const len = (1.2 + u * 0.7) * wing;
      const wx = x + side * (0.25 + Math.sin(Math.abs(ang)) * len * 0.75);
      const wy = 1.25 + Math.cos(ang) * len * 0.55 + Math.sin(t * 9 + i) * 0.04;
      n3Flame(h, wx, wy, z - 0.25, 0.45 + u * 0.18, 1.2 + u * 0.5, i % 2 ? '#e8361a' : '#ff7a1a', fade * 0.95, -ang * 0.8, true);
      n3Flame(h, wx, wy - 0.1, z - 0.2, 0.22 + u * 0.08, 0.7 + u * 0.3, '#ffd34d', fade * 0.8, -ang * 0.8);
      n3Glow(h, wx, wy, z - 0.2, 0.5, i % 3 === 2 ? '#c84aff' : '#ff5a1a', fade * 0.3);
    }
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + t * 1.5;
    n3Flame(h, x + Math.cos(a) * 0.26, 2.05, z + Math.sin(a) * 0.26, 0.14, 0.32 + 0.06 * Math.sin(t * 14 + i), i % 2 ? '#ffd34d' : '#ff6a2a', fade * 0.9);
  }
  const m = low ? 14 : 30;
  for (let i = 0; i < m; i++) {
    const ph = (t * 1.6 + i / m) % 1;
    const a = i * 2.399 - t * 6;
    const rr = 0.4 + ph * 1.2;
    n3Glow(h, x + Math.cos(a) * rr, 0.3 + ph * 2.2, z + Math.sin(a) * rr, 0.09 + 0.05 * (1 - ph), rk3c(3, i), fade * (1 - ph));
  }
};

// Zusätzliche Ebenen beim Wirken (seit 13.50): jeder Rang bekommt etwas Eigenes, das man sofort erkennt.
//   E: Lichtwelle, die sich in Brusthöhe ausbreitet, und Strahlen, die nach oben schießen
//   H: dazu drei kreisende Arkan-Kugeln mit Schweif, zwischen denen Blitzbögen zucken
//   L: dazu ein goldenes Sonnenrad mit Strahlen hinter dem Kopf und fallende Lichtfedern
//   V: dazu ein Himmelsstrahl am Anfang, eine Flammen-Schockwelle und ein Glutring um die ganze Figur
function rankCastExtra3(h, e, x, z, t, r, fade, low) {
  // E – Lichtwelle (Ring aus Lichtern, wächst in den ersten 0,45 s) und Strahlen nach oben
  if (t < 0.45) {
    const u = t / 0.45;
    const rr = 0.4 + u * (1.2 + r * 0.35);
    const m = low ? 12 : 22;
    for (let i = 0; i < m; i++) {
      const a = (i / m) * Math.PI * 2;
      n3Glow(h, x + Math.cos(a) * rr, 1.0 + Math.sin(a * 3 + t * 8) * 0.04, z + Math.sin(a) * rr * 0.9, 0.34 + r * 0.05, rk3c(r, i), (1 - u) * 0.95);
    }
  }
  for (let i = 0; i < 4 + r * 2; i++) {
    const a = i * 2.1 + e.start;
    const ph = (t * 1.4 + i * 0.17) % 1;
    fx3MageSprite(h, 'sprite', 'disc', x + Math.cos(a) * 0.35, 0.6 + ph * (2.4 + r * 0.5), z + Math.sin(a) * 0.3, 0.06, 0.7 + r * 0.15, rk3c(r, i + 2), fade * (1 - ph) * 0.8);
  }
  if (r < 1) return;
  // H – drei Arkan-Kugeln kreisen schräg um die Figur, Blitzbögen springen zwischen ihnen
  const orbs = [];
  for (let i = 0; i < 3; i++) {
    const a = t * 3.2 + (i / 3) * Math.PI * 2;
    const ox = x + Math.cos(a) * 0.85;
    const oy = 1.25 + Math.sin(a + i) * 0.35;
    const oz = z + Math.sin(a) * 0.7;
    orbs.push({ x: ox, y: oy, z: oz });
    n3Glow(h, ox, oy, oz, 0.7, rk3c(r, i), fade * 0.95);
    n3Glow(h, ox, oy, oz, 0.22, '#ffffff', fade);
    for (let s2 = 1; s2 < (low ? 3 : 6); s2++) {
      const b = a - s2 * 0.12;
      n3Glow(h, x + Math.cos(b) * 0.85, 1.25 + Math.sin(b + i) * 0.35, z + Math.sin(b) * 0.7, 0.45 - s2 * 0.06, rk3c(r, i + s2), fade * (1 - s2 / 6) * 0.8);
    }
  }
  if (!low && Math.floor(t * 14) % 2 === 0) for (let i = 0; i < 3; i++) n3Bolt(h, orbs[i], orbs[(i + 1) % 3], 0.04, rk3c(r, i + 1), fade * 0.95, 6, 0.14);
  if (r < 2) return;
  // L – Sonnenrad hinter dem Kopf: Kreis aus Strahlen, dreht sich langsam; Lichtfedern sinken herab
  const hx = x;
  const hy = 2.05;
  const hz = z - 0.35;
  n3Glow(h, hx, hy, hz, 1.5 + r * 0.2, '#ffd34d', fade * 0.4);
  const rays = low ? 8 : 16;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + t * 0.8;
    const len = (i % 2 ? 0.8 : 1.25) * (0.9 + 0.1 * Math.sin(t * 6 + i));
    for (let j = 1; j <= 4; j++) {
      const d = 0.4 + (len * j) / 4;
      n3Glow(h, hx + Math.cos(a) * d, hy + Math.sin(a) * d, hz, 0.22 - j * 0.03, j === 4 ? '#fff6d0' : '#ffc23a', fade * (1 - j * 0.12));
    }
  }
  for (let i = 0; i < (low ? 5 : 10); i++) {
    const ph = (t * 0.7 + i / 10) % 1;
    const a = i * 2.4 + e.start;
    const fx = x + Math.cos(a) * (0.6 + n2h(i, 2) * 0.8) + Math.sin(t * 3 + i) * 0.15;
    const fz = z + Math.sin(a) * 0.6;
    fx3MageSprite(h, 'sprite', 'disc', fx, 3.2 - ph * 3.0, fz, 0.07, 0.22, '#fff3b0', fade * (1 - ph * 0.6));
  }
  if (r < 3) return;
  // V – Himmelsstrahl (kurz, sehr hoch), Flammen-Schockwelle und Glutring um die Figur
  if (t < 0.35) {
    const u = t / 0.35;
    fx3MageSprite(h, 'sprite', 'disc', x, 4.5, z, 1.3 * (1 - u * 0.5), 10, '#ffd0a0', (1 - u) * 0.75);
    fx3MageSprite(h, 'sprite', 'disc', x, 4.5, z, 0.45, 10, '#ffffff', (1 - u) * 0.9);
  }
  if (t > 0.15 && t < 0.85) {
    const u = (t - 0.15) / 0.7;
    const rr = 0.5 + u * 2.6;
    const m = low ? 10 : 20;
    for (let i = 0; i < m; i++) {
      const a = (i / m) * Math.PI * 2 + e.start;
      n3Flame(h, x + Math.cos(a) * rr, 0.35 + (1 - u) * 0.3, z + Math.sin(a) * rr * 0.85, 0.32 * (1 - u * 0.4), 0.9 * (1 - u * 0.7), i % 3 === 0 ? '#c84aff' : i % 2 ? '#ff6a2a' : '#ffd34d', (1 - u) * 0.9, 0, true);
    }
  }
  const ring = low ? 8 : 16;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2 - t * 2.4;
    n3Flame(h, x + Math.cos(a) * 0.75, 0.2, z + Math.sin(a) * 0.6, 0.18, 0.45 + 0.12 * Math.sin(t * 12 + i), i % 2 ? '#ff4a1a' : '#ffb03a', fade * 0.85);
  }
}

// Zusätzlich bei Treffern (seit 13.50): E Stoßring, H violette Splitter, L Sternschnuppe von oben,
// V Meteor aus dem Himmel mit Lichtsäule
function rankHitExtra3(h, e, x, y, z, t, k, r, low) {
  const fade = 1 - k;
  // E – Stoßring waagerecht in Trefferhöhe
  const rr = 0.25 + k * (0.9 + r * 0.2);
  const m = low ? 8 : 14;
  for (let i = 0; i < m; i++) {
    const a = (i / m) * Math.PI * 2 + e.seed;
    n3Glow(h, x + Math.cos(a) * rr, y, z + Math.sin(a) * rr * 0.8, 0.14 + r * 0.02, rk3c(r, i), fade * 0.8);
  }
  if (r < 1) return;
  // H – Splitter fliegen nach außen
  for (let i = 0; i < (low ? 4 : 8); i++) {
    const a = e.seed * 2 + i * 0.785;
    const d = 0.2 + k * 1.1;
    fx3MageSprite(h, 'sprite', 'disc', x + Math.cos(a) * d, y + Math.sin(a * 1.3) * d * 0.5, z + Math.sin(a) * d * 0.5, 0.05, 0.2, rk3c(r, i + 1), fade);
  }
  if (r < 2) return;
  // L – Sternschnuppe: fällt in der ersten Fünftelsekunde von oben in den Gegner
  if (t < 0.22) {
    const u = t / 0.22;
    const sy = y + 3.2 * (1 - u);
    for (let j = 0; j < 5; j++) n3Glow(h, x + 0.6 * (1 - u) + j * 0.08, sy + j * 0.22, z, 0.3 - j * 0.05, j ? '#ffd34d' : '#ffffff', 1 - j * 0.18);
  }
  if (r < 3) return;
  // V – Meteor: glühender Brocken mit Flammenschweif schlägt ein, danach eine kurze Lichtsäule
  if (t < 0.25) {
    const u = t / 0.25;
    const my = y + 4.5 * (1 - u);
    const mx = x - 1.2 * (1 - u);
    n3Glow(h, mx, my, z, 0.55, '#ffb03a', 0.95);
    n3Glow(h, mx, my, z, 0.22, '#ffffff', 1);
    for (let j = 1; j < 6; j++) n3Flame(h, mx - j * 0.18, my + j * 0.32, z, 0.26 - j * 0.03, 0.5, j % 2 ? '#ff4a1a' : '#ffd34d', 0.9 - j * 0.12, 0.6);
  } else {
    const u = Math.min(1, (t - 0.25) / 0.3);
    fx3MageSprite(h, 'sprite', 'disc', x, y + 1.5, z, 0.7 * (1 - u * 0.5), 3.5, '#ff8a3a', (1 - u) * 0.6);
  }
}

FX3_DRAW.rankhit3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const r = e.rank;
  const low = n3low() || FX3.hitCrowd;
  const m = e.target && !e.target.dead ? e.target : null;
  const x = (m ? m.x : e.x) * U3;
  const z = (m ? feetY(m) : e.y) * U3;
  const y = e.h || 0.8;
  const fade = 1 - k;
  rankHitExtra3(h, e, x, y, z, t, k, r, low);
  // Funkenstoß in den Rangfarben
  const n = (low ? 6 : 10) + r * (low ? 3 : 6);
  for (let i = 0; i < n; i++) {
    const a = i * 2.399 + e.seed;
    const el = (n2h(i, e.seed) - 0.3) * 1.4;
    const d = (0.2 + 0.9 * Math.pow(k, 0.6)) * (0.7 + 0.5 * n2h(i, 3));
    n3Glow(h, x + Math.cos(a) * d, y + el * d * 0.6 - k * k * 0.3, z + Math.sin(a) * d * 0.6, 0.12 * (1 - k * 0.5), rk3c(r, i), fade);
  }
  n3Glow(h, x, y, z, 0.6 + r * 0.25, rk3c(r, 0), fade * 0.6);
  if (r >= 1 && k < 0.6) {
    // kleine Blitze nach außen
    for (let i = 0; i < 2 + r; i++) {
      const a = e.seed * 3 + i * 2.1;
      n3Bolt(h, { x, y, z }, { x: x + Math.cos(a) * (0.6 + r * 0.1), y: y + Math.sin(a * 1.7) * 0.4, z: z + Math.sin(a) * 0.4 }, 0.035, rk3c(r, i + 1), (1 - k / 0.6) * 0.9, 5, 0.18);
    }
  }
  if (r >= 2) {
    // goldenes Sternenkreuz
    const s = 1.2 + r * 0.25;
    fx3MageSprite(h, 'sprite', 'disc', x, y, z + 0.05, s * (0.4 + k), 0.09, '#fff6d0', fade * 0.9);
    fx3MageSprite(h, 'sprite', 'disc', x, y, z + 0.05, 0.09, s * (0.4 + k), '#fff6d0', fade * 0.9);
  }
  if (r >= 3) {
    // Feuernova: Flammenkranz wächst nach außen, Glut regnet
    const rr = 0.3 + k * 1.3;
    for (let i = 0; i < (low ? 6 : 12); i++) {
      const a = (i / (low ? 6 : 12)) * Math.PI * 2 + e.seed;
      n3Flame(h, x + Math.cos(a) * rr, 0.3 + (1 - k) * 0.2, z + Math.sin(a) * rr * 0.8, 0.26, 0.6 * (1 - k * 0.6), i % 2 ? '#ff6a2a' : '#ffd34d', fade * 0.9);
    }
    for (let i = 0; i < (low ? 6 : 12); i++) {
      const a = i * 1.7 + e.seed;
      n3Glow(h, x + Math.cos(a) * 0.5 * n2h(i, 5), y + 0.8 - k * 1.4 * (0.6 + n2h(i, 6)), z + Math.sin(a) * 0.4, 0.08, i % 3 ? '#ff8a3a' : '#c84aff', fade);
    }
  }
};

// Aufrufe aus rankCastFx / rankHitFx (fertigkeiten.js): nur in 3D, sonst bleibt die 2D-Darstellung
// soft (seit 14.61, Schwertaura): nur die Funkenspirale, schwächer – die Fertigkeit zeigt ihren Rang selbst
function rankCast3(p, rank, soft = false) {
  if (typeof V3 === 'undefined' || !V3.on) return;
  addEffect({ type: 'rankcast3', owner: p, x: p.x, y: feetY(p), rank, soft, dur: soft ? 1.2 : 1.0 + rank * 0.3 });
}
function rankHit3(m, rank) {
  if (typeof V3 === 'undefined' || !V3.on) return;
  const c = bodyCenter(m);
  addEffect({ type: 'rankhit3', target: m, x: m.x, y: feetY(m), h: Math.max(0.5, (feetY(m) - c.y) * U3 + 0.3), rank, seed: Math.random() * 10, dur: 0.45 + rank * 0.12 });
}
