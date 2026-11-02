// Glutfeld (seit 13.39): erste Attacke des Feuermagiers statt des Drachenodems. Am Ziel (ohne Ziel ein Stück vor
// dir) reißt der Boden glühend auf: ein Kreis aus Glutrissen mit einem Flammensaum, in dem 2,5 s lang
// Flammensäulen aus dem Boden schlagen. Alle Gegner im Kreis nehmen jede halbe Sekunde Feuerschaden, der letzte
// Puls setzt sie in Brand. Ablauf wie die übrigen Magier-Zauber (magier-neu.js): SKILL_TYPES (eigener Spieler:
// Treffer + Bild), MAGE2_REMOTE (Mitspieler: nur Bild), EXTRA_EFFECTS (2D) und FX3_DRAW (3D).

SKILL_TYPES.mfield = function (sk, pw) {
  const p = game.player;
  const pt = mage2Point(p, sk, 0.7);
  lockPlayer(p, 0.3);
  input.walkTo = null;
  const x = Math.round(pt.x);
  const y = Math.round(pt.y);
  fieldFx(p, x, y, sk, true, pw);
  return { tx: x, ty: y };
};

function fieldDur(sk) {
  return sk.delay + sk.ticks * sk.every + 0.6;
}

function fieldFx(owner, x, y, sk, local, pw) {
  addEffect({ type: 'mfield3', x, y, R: sk.radius, delay: sk.delay, every: sk.every, ticks: sk.ticks, seed: Math.floor(Math.random() * 1000), dur: fieldDur(sk) });
  if (!local) return;
  for (let k = 0; k < sk.ticks; k++) {
    later(sk.delay + k * sk.every, () => {
      const last = k === sk.ticks - 1;
      for (const m of enemiesInCircle(x, y, sk.radius)) {
        hitMonster(m, sk.dmg * pw, { skill: sk.id, burn: last ? sk.burn : null, vfxColor: '#ff8a4a' });
      }
      if (k === 0 && owner === game.player) shakeScreen(2.5);
    });
  }
}
MAGE2_REMOTE.mfield = (rp, sk, d) => fieldFx(rp, d.tx ?? rp.x, d.ty ?? rp.y, sk, false, 0);

// Wo und wann die Flammensäulen aus dem Boden schlagen: je Puls drei bis fünf Stellen im Kreis
function fieldBursts(e) {
  if (e._bursts) return e._bursts;
  const out = [];
  for (let k = 0; k < e.ticks; k++) {
    const n = 3 + ((k + e.seed) % 3);
    for (let i = 0; i < n; i++) {
      const a = n2h(e.seed + k * 7 + i, 1) * Math.PI * 2;
      const d = Math.sqrt(n2h(e.seed + k * 7 + i, 2)) * e.R * 0.82;
      out.push({ at: e.delay + k * e.every + n2h(e.seed + k * 7 + i, 3) * e.every * 0.6, x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d * 0.9, big: n2h(e.seed + i, 4) });
    }
  }
  e._bursts = out;
  return out;
}

// --- 2D ------------------------------------------------------------------------------------------------
EXTRA_EFFECTS.mfield3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const on = clamp01(t / Math.max(0.05, e.delay));
  const out = clamp01((e.dur - t) / 0.5);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.45 * on * out;
  const g = ctx.createRadialGradient(x, y, 2, x, y, e.R);
  g.addColorStop(0, 'rgba(255,200,90,0.9)');
  g.addColorStop(0.6, 'rgba(255,90,20,0.6)');
  g.addColorStop(1, 'rgba(180,20,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, e.R, e.R * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (const b of fieldBursts(e)) {
    const u = (t - b.at) / 0.45;
    if (u < 0 || u > 1) continue;
    glow2(ctx, x + (b.x - e.x), y + (b.y - e.y) * 0.7 - 18 * Math.sin(u * Math.PI), 10 + 14 * (1 - u), u < 0.3 ? '#fff1c8' : '#ff6a1a', 0.85 * (1 - u));
  }
  ctx.restore();
};

// --- 3D ------------------------------------------------------------------------------------------------
FX3_TYPES.add('mfield3');
FX3_DRAW.mfield3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const on = clamp01(t / Math.max(0.05, e.delay));
  const out = clamp01((e.dur - t) / 0.55);
  const vis = on * out;
  const R = e.R * U3;
  const cx = e.x * U3;
  const cz = e.y * U3;
  // Boden: glühende Risse, die von der Mitte nach außen aufbrechen, darunter eine heiße Glut
  const grow = 0.35 + 0.65 * easeOut(on);
  // verbrannter, dunkler Boden (deckend gemischt, damit das Feld auch auf hellem Pflaster und Schnee kräftig wirkt)
  mGround(h, 'planeNScorch', 'disc', e.x, e.y, R * 1.12 * grow, 0.026, 0, '#3a0804', 0.7 * vis, true);
  mGround(h, 'planeNHeat', 'disc', e.x, e.y, R * 0.95 * grow, 0.03, 0, '#c81a0a', 0.55 * vis, true);
  mGround(h, 'planeGlowF', 'disc', e.x, e.y, R * 0.8 * grow, 0.034, 0, '#ff6a1a', 0.5 * vis);
  mGround(h, 'planeCrk', 'mcracks', e.x, e.y, R * 0.98 * grow, 0.045, e.seed * 0.1 + t * 0.15, '#ff7a1a', 0.95 * vis);
  mGround(h, 'planeCrk', 'mcracks', e.x, e.y, R * 0.6 * grow, 0.05, -e.seed * 0.07 - t * 0.25, '#ffd36a', 0.7 * vis);
  if (vis <= 0.01) return;
  // Flammensaum am Rand: kleine, unruhige Flammen ringsum
  const ring = low ? 10 : 20;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2 + e.seed;
    const fl = 0.75 + 0.25 * Math.sin(t * 13 + i * 2.3);
    const hh = (0.6 + 0.3 * n2h(i, 5)) * fl * vis;
    n3Fire(h, cx + Math.cos(a) * R * 0.97, hh * 0.5, cz + Math.sin(a) * R * 0.97, 0.5 * fl, hh, i % 3 ? FIRE3.main : FIRE3.deep, 0.9 * vis, Math.sin(t * 9 + i) * 0.15);
  }
  // Flammensäulen: schießen hoch, lodern kurz und sinken in Funken zusammen
  for (const b of fieldBursts(e)) {
    const age = t - b.at;
    if (age < 0 || age > 0.7) continue;
    const u = age / 0.7;
    const rise = u < 0.25 ? easeOut(u / 0.25) : 1 - (u - 0.25) / 0.75 * 0.65;
    const H = (1.6 + 1.2 * b.big) * rise;
    const x = b.x * U3;
    const z = b.y * U3;
    n3Fire(h, x, H * 0.5, z, 0.7 + 0.4 * b.big, H, FIRE3.main, 0.95 * (1 - u * 0.6));
    if (!low) n3Fire(h, x, H * 0.38, z, 0.85 + 0.4 * b.big, H * 0.6, FIRE3.deep, 0.75 * (1 - u));
    n3Glow(h, x, 0.12, z, 1.2 + b.big, FIRE3.hot, 0.6 * (1 - u));
    // Funken steigen aus der Säule
    const sp = low ? 2 : 5;
    for (let j = 0; j < sp; j++) {
      const ja = n2h(j, b.x) * Math.PI * 2;
      const jr = 0.2 + 0.4 * u;
      n3Glow(h, x + Math.cos(ja) * jr, H * 0.6 + u * 1.6 + j * 0.12, z + Math.sin(ja) * jr, 0.14, j % 2 ? FIRE3.core : FIRE3.hot, 0.9 * (1 - u));
    }
  }
  // aufsteigende Glut und etwas Rauch über dem ganzen Feld
  const em = low ? 6 : 16;
  for (let i = 0; i < em; i++) {
    const life = 1.1;
    const ph = ((t + n2h(i, 8) * life) % life) / life;
    const a = n2h(i, 9) * Math.PI * 2;
    const d = Math.sqrt(n2h(i, 10)) * R * 0.9;
    n3Glow(h, cx + Math.cos(a) * d, 0.1 + ph * 1.8, cz + Math.sin(a) * d, 0.12 + 0.08 * (1 - ph), i % 3 ? FIRE3.hot : FIRE3.core, 0.85 * (1 - ph) * vis);
  }
  if (!low && t > e.delay) {
    for (let i = 0; i < 4; i++) {
      const ph = ((t * 0.6 + i * 0.25) % 1);
      const a = i * 1.7 + e.seed;
      n3Smoke(h, cx + Math.cos(a) * R * 0.4, 0.8 + ph * 2.2, cz + Math.sin(a) * R * 0.4, 1.2 + ph * 1.4, '#3a2a24', 0.25 * (1 - ph) * vis);
    }
  }
};

// --- Symbol ---------------------------------------------------------------------------------------------
// Glutfeld: aufgerissener Boden in Schrägsicht, glühende Risse, drei Flammensäulen schießen heraus
SKILL_ART.glutfeld = function (ctx, IK) {
  IK.light(ctx, 0, 8, 24, '#ff5a1a', 0.6);
  // Bodenplatte als Ellipse mit Glut
  IK.glow(ctx, '#ff6a1a', 10, () => IK.fill(ctx, (c) => c.ellipse(0, 12, 21, 9, 0, 0, Math.PI * 2),
    IK.rad(ctx, 0, 12, 1, 21, [[0, '#fff1c8'], [0.35, '#ff8a4a'], [0.75, '#c81a0a'], [1, '#3a0a06']]), 0.9));
  // Risse
  ctx.save();
  ctx.strokeStyle = '#2a0806';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (const pts of [[[-16, 12], [-8, 10], [-3, 13], [4, 11]], [[3, 15], [9, 13], [17, 14]], [[-6, 16], [-1, 18], [6, 17]], [[0, 7], [-2, 10], [1, 12]]]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
  // Flammensäulen
  IK.flame(ctx, -10, 12, 22, -0.08, IKN.fire, -0.4);
  IK.flame(ctx, 10, 13, 22, 0.08, IKN.fire, 0.4);
  IK.flame(ctx, 0, 11, 34, 0, IKN.hot);
  IK.flame(ctx, -4, 12, 18, -0.15, IKN.hot, -0.3);
  IK.flame(ctx, 5, 12, 16, 0.2, IKN.hot, 0.3);
  IK.sparkles(ctx, 10, '#ffd8a0', 53, 18, 0, -6, 1.3);
};
