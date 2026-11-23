// Rang-Effekte in 2D (seit 15.71): bisher stiegen in 2D bei jedem Rang nur ein paar Funken auf – ob eine Attacke auf E
// oder auf V stand, war kaum zu sehen. Jetzt wie in 3D (rang-fx.js), aufrecht an der Figur, nichts am Boden, keine
// Sterne und Runen:
//   Erwacht (E)   – Funkenspirale in Blau-Weiß steigt um die Figur, ein Funkenkranz um die Brust
//   Heroisch (H)  – dazu zwei gegenläufige Kränze (Violett, Rosa, Blau) um Brust und Kopf mit Schweif
//   Legendär (L)  – dazu eine goldene Lichtsäule, ein Lichtblitz und kreisende Goldlichter über dem Kopf
//   Vollendet (V) – dazu Flammenflügel, eine Feuerkrone über dem Kopf und ein Glutsturm in Rot, Gold und Violett –
//                   das Zeichen der höchsten Stufe, auch für alle, die zusehen (auch bei Mitspielern)
// Treffer (rankhit2): ab Legendär ein goldener Lichtstoß mit aufsteigenden Lichtern, bei Vollendet schlagen
// Flammenzungen aus dem Getroffenen und Glut regnet.

const RANK2_C = typeof RANK3_COLORS !== 'undefined' ? RANK3_COLORS : [
  ['#9fd0ff', '#7affd8', '#e8f8ff', '#5ac8ff'],
  ['#c58cff', '#ff8ae0', '#7a9aff', '#e8d0ff'],
  ['#ffd34d', '#fff3b0', '#ff9a2a', '#ffffff'],
  ['#ff6a4a', '#ffd34d', '#c84aff', '#ffffff', '#ff2a1a']
];
const rk2c = (r, i) => RANK2_C[r][i % RANK2_C[r].length];
const rk2low = () => typeof opts !== 'undefined' && opts.graphics === 'niedrig';

// kleiner leuchtender Punkt (eckig, Pixel-Stil) mit weichem Schein
function rk2Dot(ctx, x, y, s, col, a) {
  if (a <= 0.02) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = col;
  ctx.fillRect(x - s / 2, y - s / 2, s, s);
  if (s > 2.2) glow(ctx, x, y, s * 2.6, col, a * 0.5);
  ctx.globalAlpha = 1;
}

// Flamme (Tropfen nach oben), Fuß bei (x, y), Höhe h, Breite w, leicht schwankend
function rk2Flame(ctx, x, y, w, h, col, a, sway) {
  if (a <= 0.02) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 0.9, y - h * 0.55, x + sway, y - h);
  ctx.quadraticCurveTo(x + w * 0.9, y - h * 0.55, x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

// Flammenflügel: ein Flügelbogen von der Schulter schräg nach außen oben, daran hängen sechs Flammenfedern nach unten
// außen (zur Spitze länger) – wie ein Vogelflügel aus Feuer, neben der Figur (der Körper bleibt frei); s = Seite
function rk2Wing(ctx, x, fy, s, t, open, a) {
  if (a <= 0.02 || open <= 0) return;
  const Sx = x + s * 8;
  const Sy = fy - 31;
  const Tx = x + s * (12 + 40 * open);
  const Ty = fy - 34 - 32 * open;
  const Cx = x + s * (10 + 22 * open);
  const Cy = fy - 38 - 30 * open;
  const q = (u) => [(1 - u) * (1 - u) * Sx + 2 * (1 - u) * u * Cx + u * u * Tx, (1 - u) * (1 - u) * Sy + 2 * (1 - u) * u * Cy + u * u * Ty];
  glow(ctx, x + s * 30 * open, fy - 46, 30, '#ff6a2a', a * 0.3);
  // Federn hinten zuerst (dunkler, länger), dann die hellen Kerne
  for (const [col, wk, lk, al] of [['#ff2a1a', 1, 1, 0.8], ['#ff8a2a', 0.7, 0.86, 0.85], ['#ffd34d', 0.42, 0.66, 0.9], ['#fff3c0', 0.2, 0.42, 0.85]]) {
    ctx.globalAlpha = Math.min(1, a * al);
    ctx.fillStyle = col;
    for (let i = 0; i < 6; i++) {
      const u = 0.12 + i * 0.17;
      const [ax, ay] = q(u);
      const ph = 0.25 + u * 0.75 + Math.sin(t * 9 + i * 1.3) * 0.06;
      const L = (12 + u * 26) * open * lk + Math.sin(t * 15 + i * 2) * 2;
      const dx = s * Math.sin(ph);
      const dy = Math.cos(ph);
      const w = (3.6 + u * 1.6) * wk;
      ctx.beginPath();
      ctx.moveTo(ax - dy * w * s, ay + dx * w * s);
      ctx.quadraticCurveTo(ax + dx * L * 0.6 - dy * w * 0.9 * s, ay + dy * L * 0.6 + dx * w * 0.9 * s, ax + dx * L, ay + dy * L);
      ctx.quadraticCurveTo(ax + dx * L * 0.6 + dy * w * 0.9 * s, ay + dy * L * 0.6 - dx * w * 0.9 * s, ax + dy * w * s, ay - dx * w * s);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Flügelbogen: dicke Flamme mit hellem Kern
  ctx.lineCap = 'round';
  for (const [col, w, al] of [['#ff4a1a', 6, 0.85], ['#ffb03a', 3.2, 0.9], ['#fff3c0', 1.3, 0.9]]) {
    ctx.globalAlpha = Math.min(1, a * al);
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(Sx, Sy);
    ctx.quadraticCurveTo(Cx, Cy, Tx, Ty);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.globalAlpha = 1;
}

EXTRA_EFFECTS.rankcast2 = (ctx, e, k) => {
  const ow = e.owner && !e.owner.gone && !e.owner.dead ? e.owner : null;
  const x = ow ? ow.x : e.x;
  const fy = ow ? feetY(ow) : e.y;
  const t = game.time - e.start;
  const r = e.rank;
  const low = rk2low();
  let fade = k < 0.12 ? k / 0.12 : 1 - Math.max(0, (k - 0.6) / 0.4);
  if (e.soft) fade *= 0.6;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Legendär: goldene Lichtsäule über dem Kopf, zwei Lichtstreifen seitlich am Körper (die Figur bleibt sichtbar),
  // ein kurzer Lichtblitz zu Beginn
  if (r >= 2 && !e.soft) {
    const g = ctx.createLinearGradient(0, fy - 48, 0, fy - 130);
    g.addColorStop(0, `rgba(255,211,77,${0.34 * fade})`);
    g.addColorStop(1, 'rgba(255,243,176,0)');
    ctx.fillStyle = g;
    const w = 12 + r * 2 + Math.sin(t * 9) * 1.5;
    ctx.fillRect(x - w, fy - 130, w * 2, 82);
    ctx.fillStyle = `rgba(255,224,120,${0.32 * fade})`;
    for (const sx of [-1, 1]) ctx.fillRect(x + sx * (13 + Math.sin(t * 7 + sx) * 1.5) - 1.5, fy - 48, 3, 46);
    if (t < 0.18) glow(ctx, x, fy - 60, 40 + r * 8, r >= 3 ? '#ffd34d' : '#fff3b0', (1 - t / 0.18) * 0.55);
  }
  // Vollendet: Flammenflügel (öffnen sich), Glutsturm, Feuerkrone
  if (r >= 3 && !e.soft) {
    const open = Math.min(1, t / 0.22) * (1 - Math.max(0, (k - 0.7) / 0.3) * 0.4);
    rk2Wing(ctx, x, fy, -1, t, open, fade);
    rk2Wing(ctx, x, fy, 1, t, open, fade);
    // Glutsturm: Funken in Rot, Gold und Violett wirbeln nach oben
    const ne = low ? 10 : 22;
    for (let i = 0; i < ne; i++) {
      const ph = (t * 0.9 + i / ne) % 1;
      const a = i * 1.7 + t * 5;
      const rr = 22 + ph * 18;
      rk2Dot(ctx, x + Math.cos(a) * rr, fy - 6 - ph * 96 + Math.sin(a) * rr * 0.3, 2.6 * (1 - ph * 0.6), rk2c(3, i), fade * (1 - ph));
    }
    // Feuerkrone über dem Kopf: sieben kleine Flammen auf einem schwebenden Kreis
    const cy = fy - 58 + Math.sin(t * 4) * 1.5;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + t * 2.4;
      const fx = x + Math.cos(a) * 11;
      const fyy = cy + Math.sin(a) * 3.5;
      const hh = 9 + Math.sin(t * 14 + i * 2) * 2.5;
      rk2Flame(ctx, fx, fyy, 3.2, hh, i % 2 ? '#ff6a2a' : '#ffd34d', fade * (Math.sin(a) > 0 ? 1 : 0.7), Math.sin(t * 11 + i) * 1.4);
      rk2Flame(ctx, fx, fyy, 1.6, hh * 0.6, '#fff3c0', fade * 0.8, 0);
    }
  }
  // 1) Funkenspirale (alle Ränge)
  const n = ((low ? 8 : 14) + r * (low ? 3 : 6)) >> (e.soft ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const ph = (t * (1.1 + r * 0.15) + i / n) % 1;
    const a = i * 2.399 + t * (3 + r);
    const rr = (15 + r * 2) * (1 - ph * 0.45);
    rk2Dot(ctx, x + Math.cos(a) * rr, fy - 4 - ph * (54 + r * 12) + Math.sin(a) * rr * 0.32, (r === 0 ? 3 : 2.4 + r * 0.3) * (1 - ph * 0.5), rk2c(r, i), fade * (1 - ph));
  }
  if (!e.soft) {
    if (r < 1) {
      // Erwacht: Funkenkranz um die Brust
      for (let i = 0; i < (low ? 6 : 9); i++) {
        const a = (i / (low ? 6 : 9)) * Math.PI * 2 + t * 4;
        rk2Dot(ctx, x + Math.cos(a) * 16, fy - 26 + Math.sin(a) * 5, 2.8, rk2c(0, i), fade * 0.9);
      }
    } else {
      // Heroisch: zwei gegenläufige Kränze mit Schweif um Brust und Kopf
      for (const [hy, dir, rad] of [[26, 1, 17], [46, -1, 13]]) {
        const cnt = low ? 5 : 8;
        for (let i = 0; i < cnt; i++) {
          for (let tail = 0; tail < 4; tail++) {
            const a = (i / cnt) * Math.PI * 2 + (t - tail * 0.03) * 5 * dir;
            rk2Dot(ctx, x + Math.cos(a) * rad, fy - hy + Math.sin(a) * rad * 0.3, 2.6 - tail * 0.5, rk2c(1, i), fade * (1 - tail * 0.25));
          }
        }
      }
      // Legendär: Goldlichter kreisen über dem Kopf (runde Lichter, keine Sterne)
      if (r >= 2) {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + t * 3;
          const ox = x + Math.cos(a) * 14;
          const oy = fy - 66 - (r >= 3 ? 8 : 0) + Math.sin(a) * 4;
          glow(ctx, ox, oy, 8, '#ffd34d', fade * 0.9);
          rk2Dot(ctx, ox, oy, 2.6, '#fff6d0', fade);
        }
      }
    }
  }
  ctx.restore();
};

EXTRA_EFFECTS.rankhit2 = (ctx, e, k) => {
  const m = e.target && !e.target.dead ? e.target : null;
  const c = m ? bodyCenter(m) : { x: e.x, y: e.y };
  const t = game.time - e.start;
  const r = e.rank;
  const fade = 1 - k;
  const low = rk2low();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Legendär: goldener Lichtstoß, Lichter steigen auf
  glow(ctx, c.x, c.y, (24 + r * 8) * (0.6 + k * 0.8), r >= 3 ? '#ffb03a' : '#ffd34d', fade * 0.85);
  for (let i = 0; i < (low ? 3 : 6); i++) {
    const a = e.seed + i * 1.9;
    rk2Dot(ctx, c.x + Math.cos(a) * (6 + k * 14), c.y - k * (22 + i * 3), 2.4, i % 2 ? '#fff6d0' : '#ffd34d', fade);
  }
  if (r >= 3) {
    // Vollendet: Flammenzungen schlagen nach außen, Glut regnet
    const nf = low ? 6 : 10;
    for (let i = 0; i < nf; i++) {
      const a = e.seed * 2 + (i / nf) * Math.PI * 2;
      const d = 6 + k * 26;
      const fx = c.x + Math.cos(a) * d;
      const fyy = c.y + Math.sin(a) * d * 0.6;
      ctx.save();
      ctx.translate(fx, fyy);
      ctx.rotate(a + Math.PI / 2);
      rk2Flame(ctx, 0, 0, 3.6 * (1 - k * 0.4), (12 + (i % 3) * 3) * (1 - k * 0.3), i % 2 ? '#ff6a2a' : '#ffd34d', fade, Math.sin(t * 15 + i) * 1.2);
      ctx.restore();
    }
    for (let i = 0; i < (low ? 5 : 10); i++) {
      const a = e.seed * 3 + i * 2.3;
      rk2Dot(ctx, c.x + Math.cos(a) * (10 + i * 2), c.y - 20 + k * (40 + (i % 4) * 8), 2.2, rk2c(3, i), fade);
    }
  }
  ctx.restore();
};
