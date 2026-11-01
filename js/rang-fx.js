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
  const fade = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
  // 1) Funkenspirale (alle Ränge)
  n3Glow(h, x, 1.0, z, 1.3 + r * 0.35, rk3c(r, 0), fade * (r >= 3 ? 0.3 : 0.45));
  const n = (low ? 10 : 18) + r * (low ? 4 : 8);
  for (let i = 0; i < n; i++) {
    const ph = (t * (1.2 + r * 0.15) + i / n) % 1;
    const a = i * 2.399 + t * (3 + r);
    const rr = (0.5 + r * 0.08) * (1 - ph * 0.45);
    const y = 0.1 + ph * (1.7 + r * 0.35);
    n3Glow(h, x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, (r === 0 ? 0.36 : 0.22 + r * 0.03) * (1 - ph * 0.5), rk3c(r, i), fade * (1 - ph));
    if (!low && i % 3 === 0) n3Glow(h, x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, 0.08, '#ffffff', fade * (1 - ph));
  }
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

FX3_DRAW.rankhit3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const r = e.rank;
  const low = n3low();
  const m = e.target && !e.target.dead ? e.target : null;
  const x = (m ? m.x : e.x) * U3;
  const z = (m ? feetY(m) : e.y) * U3;
  const y = e.h || 0.8;
  const fade = 1 - k;
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
function rankCast3(p, rank) {
  if (typeof V3 === 'undefined' || !V3.on) return;
  addEffect({ type: 'rankcast3', owner: p, x: p.x, y: feetY(p), rank, dur: 0.9 + rank * 0.25 });
}
function rankHit3(m, rank) {
  if (typeof V3 === 'undefined' || !V3.on) return;
  const c = bodyCenter(m);
  addEffect({ type: 'rankhit3', target: m, x: m.x, y: feetY(m), h: Math.max(0.5, (feetY(m) - c.y) * U3 + 0.3), rank, seed: Math.random() * 10, dur: 0.45 + rank * 0.1 });
}
