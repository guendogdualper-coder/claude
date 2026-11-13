// Flammenwoge (seit 14.89, Feuermagier Platz 3 statt „Brand“): Eine Wand aus Feuer bricht vor dem Magier aus dem
// Boden und rollt nach vorn. Jeder Gegner auf ihrem Weg wird einmal getroffen, ein Stück mitgerissen und in Brand
// gesetzt. Hinter der Woge brennt der Boden kurz nach (nur Bild). Richtung: zum Ziel, sonst in Blickrichtung.
// Bild: 2D eine Reihe lodernder Flammen quer zur Laufrichtung mit Glutsaum vorn, Glut und Rauch dahinter;
// 3D echte Flammenkörper (flmFunnel, Form FLM_WAVE) als Wand, dazu Funken, Hitzeschein und Brandspur.
// Kein Ring, keine Runen am Boden.

const FLM_WAVE = { pow: 1, twist: 1.2, spin: 1.2, bands: 0, bandK: 0, rise: 3.8, wob: 0.5, bend: 0.12, heat: 1.2, top: 0.4, front: 0.85, back: 0.7, smoke: 0.45, base: 0.2 };

// Lage der Woge zur Zeit t: Mittelpunkt der Front (Pixel) und Breite
function waveAt(e, t) {
  const s = Math.min(e.L, Math.max(0, t) * e.speed);
  const u = s / e.L;
  return { s, u, x: e.x0 + e.dx * s, y: e.y0 + e.dy * s, w: e.W0 + (e.W - e.W0) * u };
}

SKILL_TYPES.mwave = function (sk, pw) {
  const p = game.player;
  const t = pickTarget(sk.length + 60);
  let dx = p.facing ? p.facing.x : 1;
  let dy = p.facing ? p.facing.y : 0;
  if (t) {
    const d = Math.hypot(t.x - p.x, t.y - p.y) || 1;
    dx = (t.x - p.x) / d;
    dy = (t.y - p.y) / d;
    faceTowards(t.x, t.y);
  }
  const n = Math.hypot(dx, dy) || 1;
  dx /= n;
  dy /= n;
  lockPlayer(p, 0.3);
  input.walkTo = null;
  waveFx(p, dx, dy, sk, true, pw);
  return { dx: Math.round(dx * 1000), dy: Math.round(dy * 1000) };
};

function waveFx(owner, dx, dy, sk, local, pw) {
  const e = addEffect({
    type: 'mwave3', x: owner.x + dx * 18, y: owner.y + dy * 18, x0: owner.x + dx * 18, y0: owner.y + dy * 18, dx, dy, L: sk.length, W: sk.width, W0: sk.width * 0.55,
    speed: sk.speed, delay: 0.12, dur: 0.12 + sk.length / sk.speed + 1.1, seed: Math.floor(Math.random() * 1000)
  });
  if (owner === game.player) shakeScreen(2);
  if (!local) return;
  const hit = new Set();
  const steps = Math.ceil(sk.length / sk.speed / 0.05) + 1;
  for (let k = 0; k <= steps; k++) {
    later(e.delay + k * 0.05, () => {
      const w = waveAt(e, k * 0.05);
      for (const m of game.monsters) {
        if (m.dead || hit.has(m)) continue;
        const rx = m.x - e.x0;
        const ry = m.y - e.y0;
        const along = rx * dx + ry * dy;
        const side = Math.abs(rx * -dy + ry * dx);
        if (along < -20 || along > w.s + 18 || side > w.w / 2 + (m.r || 12)) continue;
        if (typeof isEnemy === 'function' && !isEnemy(m)) continue;
        hit.add(m);
        hitMonster(m, sk.dmg * pw, { skill: sk.id, burn: sk.burn, vfxColor: '#ffb04a' });
        // ein Stück mitreißen (nicht Steine und Bosse)
        if (!m.dead && !m.isStone && !(m.type && (m.type.boss || m.type.raid))) {
          m.x += dx * sk.push;
          m.y += dy * sk.push;
        }
      }
    });
  }
}
MAGE2_REMOTE.mwave = (rp, sk, d) => waveFx(rp, (d.dx || 1000) / 1000, (d.dy || 0) / 1000, sk, false, 0);

// --- 2D ------------------------------------------------------------------------------------------------------
EXTRA_EFFECTS.mwave3 = (ctx, e, k, x, y) => {
  const T = game.time - e.start;
  const t = T - e.delay;
  if (t < 0) return;
  const run = e.L / e.speed;
  const w = waveAt(e, t);
  const fade = clamp01((e.dur - T) / 0.6);
  const ox = x - e.x0;
  const oy = y - e.y0;
  const px = -e.dy;
  const py = e.dx;
  ctx.save();
  // Glut und kleine Flammen auf der Spur (verlöschen nach und nach)
  for (let i = 0; i < 12; i++) {
    const s = (i + 0.5) / 12 * w.s;
    const age = t - s / e.speed;
    const a = clamp01(1 - age / 0.9) * fade;
    if (a <= 0.02) continue;
    const side = (n2h(i, e.seed) - 0.5) * w.w * 0.8;
    const fx = e.x0 + ox + e.dx * s + px * side;
    const fy = e.y0 + oy + (e.dy * s + py * side) * 0.75;
    glow2(ctx, fx, fy, 16, '#1a0806', 0.35 * a);
    flame2d(ctx, fx, fy, 10, 18 * a, T, i + e.seed, 0.8 * a);
  }
  // die Wand: Flammen quer zur Laufrichtung, in der Mitte am höchsten
  const vis = clamp01(t / 0.12) * (t < run ? 1 : clamp01(1 - (t - run) / 0.35));
  if (vis > 0.02) {
    const cx = w.x + ox;
    const cy = w.y + oy;
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, cx + e.dx * 10, cy + e.dy * 10 - 14, w.w * 0.62, '#ff6a1a', 0.45 * vis);
    ctx.globalCompositeOperation = 'source-over';
    // glühender Saum am Fuß der Wand (eine Linie quer zur Laufrichtung, kein Kreis)
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 * vis;
    ctx.strokeStyle = '#ff6a1a';
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(cx - px * w.w * 0.5, cy - py * w.w * 0.5 * 0.75);
    ctx.lineTo(cx + px * w.w * 0.5, cy + py * w.w * 0.5 * 0.75);
    ctx.stroke();
    ctx.globalAlpha = 0.7 * vis;
    ctx.strokeStyle = '#ffd36a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const N = 11;
    for (let j = 0; j < N; j++) {
      const v = j / (N - 1) - 0.5;
      const hgt = (20 + 20 * (1 - Math.abs(v) * 1.6)) * vis;
      const fx = cx + px * v * w.w;
      const fy = cy + py * v * w.w * 0.75;
      flame2d(ctx, fx, fy, 18, hgt, T, j * 3 + e.seed, vis, e.dx * 0.3);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 8; j++) {
      const q = (T * 1.4 + n2h(j, e.seed)) % 1;
      const v = n2h(j, e.seed + 3) - 0.5;
      spark2d(ctx, cx + px * v * w.w + e.dx * 8, cy + py * v * w.w * 0.75 - q * 60, 5, j % 2 ? '#ffd36a' : '#fff1c8', (1 - q) * vis);
    }
    ctx.globalCompositeOperation = 'source-over';
    smoke2d(ctx, cx - e.dx * 20, cy - 70 * vis, 22, 0.3 * vis);
  }
  ctx.restore();
};

// --- 3D ------------------------------------------------------------------------------------------------------
FX3_TYPES.add('mwave3');
FX3_DRAW.mwave3 = function (h, e) {
  const T = game.time - e.start;
  const t = T - e.delay;
  if (t < 0) return;
  const low = n3low();
  const run = e.L / e.speed;
  const w = waveAt(e, t);
  const fade = clamp01((e.dur - T) / 0.6);
  const px = -e.dy;
  const py = e.dx;
  // Brandspur hinter der Woge (unregelmäßige Flecken)
  for (let i = 0; i < (low ? 2 : 4); i++) {
    const s = (i + 0.5) / 4 * w.s;
    flmScorch(h, e.x0 + e.dx * s, e.y0 + e.dy * s, w.w * 0.42 * U3, 0.5 * fade, 0.3 * clamp01(1 - (t - s / e.speed) / 1), e.seed * 0.17 + i);
  }
  // kleine Nachflammen auf der Spur
  for (let i = 0; i < (low ? 4 : 9); i++) {
    const s = (i + 0.5) / 9 * w.s;
    const a = clamp01(1 - (t - s / e.speed) / 0.9) * fade;
    if (a <= 0.03) continue;
    const side = (n2h(i, e.seed) - 0.5) * w.w * 0.8;
    fire3(h, (e.x0 + e.dx * s + px * side) * U3, 0, (e.y0 + e.dy * s + py * side) * U3, 0.5, 0.9 * a, T, i + e.seed, 0.9 * a);
  }
  const vis = clamp01(t / 0.12) * (t < run ? 1 : clamp01(1 - (t - run) / 0.35));
  if (vis <= 0.02) return;
  // die Wand aus Flammenkörpern
  const N = low ? 4 : 6;
  for (let j = 0; j < N; j++) {
    const v = j / (N - 1) - 0.5;
    const x = (w.x + px * v * w.w) * U3;
    const z = (w.y + py * v * w.w) * U3;
    const H = (2.1 + 1.4 * (1 - Math.abs(v) * 1.5)) * vis;
    flmFunnel(h, x, 0, z, H, 0.4, 0.68, 0.95 * vis, e.seed * 0.1 + j * 1.3, FLM_WAVE, T + j * 0.29);
  }
  const cx = w.x * U3;
  const cz = w.y * U3;
  n3Glow(h, cx + e.dx * 0.3, 0.8, cz + e.dy * 0.3, w.w * U3 * 0.6, FIRE3.hot, 0.35 * vis);
  for (let j = 0; j < (low ? 4 : flmN(10)); j++) {
    const v = n2h(j, e.seed + 5) - 0.5;
    const q = (T * 1.5 + n2h(j, e.seed)) % 1;
    flmSpark(h, (w.x + px * v * w.w) * U3, 0.3 + q * 2.2, (w.y + py * v * w.w) * U3, e.dx * 2.5, 2.2, e.dy * 2.5, 0.22, 0.06, j % 2 ? FIRE3.hot : FIRE3.core, (1 - q) * vis);
  }
  if (typeof fireLight3 === 'function') fireLight3(cx, 1.2, cz, 1.4 * vis, 7);
};

// --- Symbol: eine Flammenwand rollt nach rechts, davor ein Glutsaum, dahinter Funken -------------------------
Object.assign(SKILL_ART, {
  flammenwoge(ctx, IK) {
    IK.light(ctx, 4, 4, 22, '#e8362a', 0.55);
    // Bewegungsspur
    for (const [y, l] of [[-10, 14], [0, 18], [10, 14]]) IK.fill(ctx, (c) => { c.moveTo(-20, y - 1.5); c.lineTo(-20 + l, y - 0.6); c.lineTo(-20 + l, y + 0.6); c.lineTo(-20, y + 1.5); c.closePath(); }, '#ff8a4a', 0.5);
    // die Wand: Flammen von oben nach unten versetzt, leicht nach vorn geneigt
    for (const [x, y, hh] of [[2, -12, 14], [6, -4, 20], [8, 6, 22], [6, 14, 16], [-2, -6, 14], [0, 8, 15]]) IK.flame(ctx, x, y + 8, hh, 0.35, IKN.fire, x * 0.2);
    for (const [x, y, hh] of [[9, -2, 16], [10, 9, 15]]) IK.flame(ctx, x, y + 8, hh, 0.3, IKN.hot);
    IK.sparkles(ctx, 9, '#ffc070', 51, 20, 8, -6, 1.3);
  }
});
