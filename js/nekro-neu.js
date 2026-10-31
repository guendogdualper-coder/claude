// Nekromant neu (seit 11.7): keine Buffs mehr, nur Attacken – alle in 3D, ohne Kreise oder Dreiecke am Boden.
// Weg der Seelen: Blutsauger (Kanal, ersetzt die Schädelsalve) und Geisterflut (ersetzt den Buff Dunkle Macht).
// Weg der Knochen komplett neu: Lebensentzug (kurz, heilt), Knochenwurf (wirbelnder Knochen, verlangsamt),
// Blutlarve (springt und platzt, Blutung), Totenhand (Skeletthand packt und zerdrückt), Blutlanzen (sechs Lanzen
// aus dem Rücken) und als Ultimative Attacke der Sensenmann, der sich hinter dem Nekromanten erhebt.
// Aufbau wie magier-neu.js: SKILL_TYPES.<typ> (eigener Spieler: Treffer + Bild, Rückgabe = Eckdaten fürs Netz),
// MAGE2_REMOTE.<typ> (Mitspieler: nur Bild), FX3_DRAW (3D) und EXTRA_EFFECTS (2D).

const NK = {
  blood: '#c0101e', bright: '#ff4a5a', deep: '#6a0612', dark: '#2a0206', core: '#ffd0d4',
  bone: '#e8dcc0', boneDark: '#a8987a',
  ghost: '#9fe8d0', ghostPale: '#e6fff6', ghostDeep: '#2f9a6a',
  reap: '#b8a8ff', reapPale: '#ece6ff', robe: '#14101c', robe2: '#241a32'
};
const _nkA = new THREE.Vector3();
const _nkB = new THREE.Vector3();
const _nkC = new THREE.Vector3();
const _nkD = new THREE.Vector3();
const _nkE = new THREE.Vector3();
const _nkUp = new THREE.Vector3(0, 1, 0);
const _nkX = new THREE.Vector3(1, 0, 0);
const _nkZ = new THREE.Vector3(0, 0, 1);
// eigene Punkte für Anfang/Ende von Faden und Band (nkTether benutzt _nkA bis _nkE selbst)
const _nkP = new THREE.Vector3();
const _nkQ = new THREE.Vector3();
const _nkR = new THREE.Vector3();

// Körpermitte in Einheiten (Figur oder Gegner), auch für Punkte ohne Figur
function nkBody(out, f, x, y) {
  if (f && !f.dead && f.x != null) {
    const hgt = typeof figureHeight === 'function' ? figureHeight(f) * 0.55 * U3 : 0.9;
    return out.set(f.x * U3, Math.max(0.45, hgt), feetY(f) * U3);
  }
  return out.set(x * U3, 0.7, (y + 9) * U3);
}
// Hand der Figur: vor der Brust in Blickrichtung
function nkHand(out, f) {
  nkBody(out, f);
  const fx = f.facing ? f.facing.x : 1;
  const fz = f.facing ? f.facing.y : 0;
  out.x += fx * 0.38;
  out.z += fz * 0.3;
  out.y += 0.12;
  return out;
}
function nkHeal(p, amount) {
  const heal = Math.round(amount);
  if (heal <= 0 || p.dead) return 0;
  p.hp = Math.min(game.stats.maxHp, p.hp + heal);
  addText(p.x, p.y - 44, '+' + heal, 'heal');
  return heal;
}
// nächster Gegner zu einem Punkt (für Mitspieler-Bilder: das Ziel kommt als Ort)
function nkNear(x, y, r = 70) {
  let best = null;
  let bd = r;
  for (const m of game.monsters) {
    if (m.dead) continue;
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}
// Blutstropfen (deckend, damit er auf hellem Gras rot bleibt)
function nkDrop(h, x, y, z, s, op, color = NK.blood) {
  const o = fx3Take(h, 'smoke');
  o.position.set(x, y, z);
  o.scale.set(s, s * 1.25, 1);
  o.material.color.set(color);
  o.material.opacity = Math.max(0, Math.min(1, op));
  return o;
}
// Kugel (Larvenglied, Knöchel)
function nkBall(h, x, y, z, sx, sy, sz, color, op = 1) {
  const o = fx3Take(h, 'ball');
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  fx3Color(o, color, op);
  return o;
}
// Knochenstück zwischen a und b
function nkBone(h, a, b, w, color = NK.bone, op = 1) {
  const o = fx3Take(h, 'bone');
  fx3Segment(o, a, b, w);
  fx3Color(o, color, op);
  return o;
}
// gewundener Blutfaden von a nach b (zwei Stränge, deckend dunkel und hell leuchtender Kern)
function nkTether(h, a, b, t, op, r0 = 0.09, turns = 9) {
  const n = n3low() ? 8 : 16;
  _nkE.subVectors(b, a);
  const L = _nkE.length() || 1;
  _nkE.divideScalar(L);
  // zwei Senkrechte zum Faden
  _nkC.crossVectors(_nkE, _nkUp);
  if (_nkC.lengthSq() < 1e-4) _nkC.set(1, 0, 0);
  _nkC.normalize();
  _nkD.crossVectors(_nkC, _nkE).normalize();
  for (let strand = 0; strand < 2; strand++) {
    let px = a.x;
    let py = a.y;
    let pz = a.z;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const ph = u * turns + t * 14 + strand * Math.PI;
      const r = r0 * Math.sin(Math.PI * u) + 0.015;
      const sag = -Math.sin(Math.PI * u) * 0.12;
      const nx = a.x + (b.x - a.x) * u + (_nkC.x * Math.cos(ph) + _nkD.x * Math.sin(ph)) * r;
      const ny = a.y + (b.y - a.y) * u + (_nkC.y * Math.cos(ph) + _nkD.y * Math.sin(ph)) * r + sag;
      const nz = a.z + (b.z - a.z) * u + (_nkC.z * Math.cos(ph) + _nkD.z * Math.sin(ph)) * r;
      _nkA.set(px, py, pz);
      _nkB.set(nx, ny, nz);
      const o = fx3Take(h, 'segN');
      fx3Segment(o, _nkA, _nkB, 0.035);
      fx3Color(o, strand ? NK.deep : NK.blood, op);
      if (!n3low()) {
        const c = fx3Take(h, 'seg');
        fx3Segment(c, _nkA, _nkB, 0.012);
        fx3Color(c, NK.bright, op * 0.8);
      }
      px = nx;
      py = ny;
      pz = nz;
    }
  }
  return L;
}

// === Weg der Seelen: Blutsauger (gedrückt halten) =================================================
SKILL_TYPES.siphon = function (sk, pw, lvl) {
  const p = game.player;
  if (p.channel) return false;
  const t = pickTarget(sk.range);
  if (!t) {
    addText(p.x, p.y - 34, 'Kein Ziel', 'info');
    return false;
  }
  faceTowards(t.x, t.y);
  const i = classSkills(p).indexOf(sk);
  input.walkTo = null;
  p.channel = { i, sk, pw, lvl, rank: fxRank, start: game.time, next: game.time + 0.12, net: 0, held: true, on: new Map(), fx: null, target: t, healAcc: 0, healShow: 0 };
  p.channel.fx = addEffect({ type: 'siphon3', follow: p, tgt: t, x2: t.x, y2: t.y, dur: sk.maxDur + 1, live: true });
  startSwing(p, 'strahl', 1);
  return { bm: 1, tx: Math.round(t.x), ty: Math.round(t.y) };
};
CHANNEL_TICK.siphon = function (p, dt, c) {
  const sk = c.sk;
  // stirbt das Ziel oder läuft es weg, springt der Faden auf den nächsten Gegner in Reichweite (seit 11.8)
  if ((!c.target || c.target.dead || dist(c.target, p) > sk.range + 80) && !p.dead) {
    const next = pickTarget(sk.range);
    if (next && next !== c.target) {
      c.target = next;
      if (c.fx) c.fx.tgt = next;
    }
  }
  const t = c.target;
  const age = game.time - c.start;
  const cost = skillMana(sk, p) / sk.mp * sk.mpPerSec * dt;
  if (p.dead || p.dash || p.riding || (!c.held && age >= sk.minDur) || age >= sk.maxDur || p.mp < cost || inVillage(p.x, p.y) ||
      !t || t.dead || dist(t, p) > sk.range + 80) {
    if (c.healAcc) addText(p.x, p.y - 44, '+' + c.healAcc, 'heal');
    stopChannel(p);
    return;
  }
  p.mp -= cost;
  p.lastCombat = game.time;
  faceTowards(t.x, t.y);
  if (p.swingKind === 'strahl') p.swing = Math.max(p.swing, 0.5);
  else startSwing(p, 'strahl', 1);
  c.fx.x2 = t.x;
  c.fx.y2 = t.y;
  if (game.time - c.net >= 0.25) {
    c.net = game.time;
    netSkillFx(sk.id, sk.range, { bm: 2, tx: Math.round(t.x), ty: Math.round(t.y) });
  }
  // Heilzahlen gesammelt zeigen (sonst flackern fünf Zahlen pro Sekunde)
  if (c.healAcc && game.time - c.healShow > 0.6) {
    addText(p.x, p.y - 44, '+' + c.healAcc, 'heal');
    c.healAcc = 0;
    c.healShow = game.time;
  }
  if (game.time < c.next) return;
  c.next += sk.every;
  withRank(c.rank, () => {
    const dmg = hitMonster(t, sk.dmg * c.pw, { skill: sk.id, vfxColor: '#ff8a9a' }) || 0;
    const heal = Math.round(dmg * sk.leech);
    if (heal > 0 && !p.dead) {
      p.hp = Math.min(game.stats.maxHp, p.hp + heal);
      c.healAcc += heal;
    }
  });
  if (!V3.on) {
    const b = bodyCenter(t);
    particles(b.x, b.y, { count: 3, color: [NK.bright, NK.blood], speed: [30, 80], life: [0.25, 0.45], size: [2, 3.5], drag: 3 });
  }
};
MAGE2_REMOTE.siphon = (rp, sk, d) => {
  if (d.bm === 0) {
    if (rp.siphonFx) rp.siphonFx.dur = game.time - rp.siphonFx.start + 0.18;
    rp.siphonFx = null;
    return;
  }
  const m = nkNear(d.tx, d.ty);
  if (!rp.siphonFx || rp.siphonFx.dur < game.time - rp.siphonFx.start) rp.siphonFx = addEffect({ type: 'siphon3', follow: rp, tgt: m, x2: d.tx, y2: d.ty, dur: 6, live: true });
  rp.siphonFx.tgt = m;
  rp.siphonFx.x2 = d.tx;
  rp.siphonFx.y2 = d.ty;
  rp.siphonFx.dur = game.time - rp.siphonFx.start + 0.6;
  rp.beamColor = sk.color;
  rp.swingKind = 'strahl';
  rp.swingDur = 1;
  rp.swing = Math.max(rp.swing || 0, 0.55);
};

// === Weg der Seelen: Geisterflut (Zielort) ========================================================
SKILL_TYPES.ghostflood = function (sk, pw, lvl) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.35);
  input.walkTo = null;
  floodFx(p, pt.x, pt.y, sk, true, pw);
  return { tx: Math.round(pt.x), ty: Math.round(pt.y) };
};
function floodFx(owner, x, y, sk, local, pw) {
  const foes = enemiesInCircle(x, y, sk.radius).filter((m) => !m.dead);
  const ghosts = [];
  for (let k = 0; k < sk.ghosts; k++) {
    const m = foes.length ? foes[k % foes.length] : null;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * sk.radius * 0.8;
    ghosts.push({ m, x: m ? m.x : x + Math.cos(a) * r, y: m ? m.y : y + Math.sin(a) * r * 0.75, at: sk.rise + k * 0.06, ang0: (k / sk.ghosts) * Math.PI * 2 });
  }
  const end = sk.rise + sk.ghosts * 0.06 + 0.35;
  addEffect({ type: 'gflood3', owner, x, y: y + 9, ox: owner.x, oy: owner.y, ghosts, rise: sk.rise, R: sk.radius, end, dur: end + 0.9 });
  ghosts.forEach((g) => {
    later(g.at + 0.32, () => {
      if (g.m && !g.m.dead) { g.x = g.m.x; g.y = g.m.y; }
      g.hit = game.time;
      if (owner === game.player) shakeScreen(1.2);
      if (!V3.on) particles(g.x, g.y, { count: 10, color: [NK.ghost, NK.ghostPale], speed: [40, 120], life: [0.3, 0.6], size: [2, 4], drag: 3 });
      if (!local) return;
      for (const o of enemiesInCircle(g.x, g.y, sk.splash)) hitMonster(o, sk.dmg * pw, { skill: sk.id, vfxColor: NK.ghostPale });
    });
  });
  later(end, () => {
    if (owner === game.player) shakeScreen(5);
    if (!local) return;
    const B = sk.burst;
    for (const m of enemiesInCircle(x, y, sk.radius)) hitMonster(m, B.dmg * pw, { skill: sk.id, slow: B.slow, knockback: B.knockback, from: { x, y }, heavy: true, vfxColor: NK.ghostPale });
  });
}
MAGE2_REMOTE.ghostflood = (rp, sk, d) => floodFx(rp, d.tx, d.ty, sk, false, 0);

// === Weg der Knochen: Lebensentzug (kurz, heilt) ==================================================
SKILL_TYPES.lifetap = function (sk, pw, lvl) {
  const p = game.player;
  const t = pickTarget(sk.range);
  if (!t) {
    addText(p.x, p.y - 34, 'Kein Ziel', 'info');
    return false;
  }
  faceTowards(t.x, t.y);
  lockPlayer(p, 0.3);
  input.walkTo = null;
  tapFx(p, t, sk, true, pw);
  return { tx: Math.round(t.x), ty: Math.round(t.y) };
};
function tapFx(owner, t, sk, local, pw) {
  const e = addEffect({ type: 'lifetap3', owner, tgt: t, x: t.x, y: feetY(t), x2: t.x, y2: t.y, dur: 0.8 });
  let dmg = 0;
  later(0.15, () => {
    if (t && !t.dead) { e.x2 = t.x; e.y2 = t.y; }
    if (owner === game.player) shakeScreen(2);
    if (!V3.on && t) {
      const b = bodyCenter(t);
      particles(b.x, b.y, { count: 14, color: [NK.bright, NK.blood, NK.deep], speed: [60, 160], life: [0.3, 0.6], size: [2, 4], drag: 3, gravity: 200 });
    }
    if (local && t && !t.dead) dmg = hitMonster(t, sk.dmg * pw, { skill: sk.id, heavy: true, vfxColor: '#ff8a9a' }) || 0;
  });
  later(0.55, () => {
    if (local) nkHeal(owner, dmg * sk.heal);
  });
}
MAGE2_REMOTE.lifetap = (rp, sk, d) => tapFx(rp, nkNear(d.tx, d.ty) || { x: d.tx, y: d.ty, dead: true }, sk, false, 0);

// === Weg der Knochen: Knochenwurf (erster Gegner auf der Bahn, verlangsamt) =========================
SKILL_TYPES.bonethrow = function (sk, pw, lvl) {
  const p = game.player;
  const t = pickTarget(sk.range);
  if (t) faceTowards(t.x, t.y);
  lockPlayer(p, 0.2);
  input.walkTo = null;
  const dir = dirOf(p.facing.x, p.facing.y);
  const len = Math.max(40, wallFreeLength(p.x, p.y, dir, sk.range));
  let hit = null;
  let hu = Infinity;
  for (const m of aliveEnemies()) {
    const u = (m.x - p.x) * dir.x + (m.y - p.y) * dir.y;
    if (u < 0 || u > len + (m.r || 0)) continue;
    if (Math.abs((m.x - p.x) * dir.y - (m.y - p.y) * dir.x) > sk.width + (m.r || 0)) continue;
    if (u < hu) { hu = u; hit = m; }
  }
  const end = hit ? { x: hit.x, y: hit.y } : { x: p.x + dir.x * len, y: p.y + dir.y * len };
  boneFx(p, p.x, p.y, end.x, end.y, sk, true, pw, hit);
  return { x: Math.round(p.x), y: Math.round(p.y), tx: Math.round(end.x), ty: Math.round(end.y), h: hit ? 1 : 0 };
};
function boneFx(owner, x0, y0, x1, y1, sk, local, pw, hit) {
  const fly = Math.max(0.12, Math.hypot(x1 - x0, y1 - y0) / sk.speed);
  addEffect({ type: 'bone3', x: (x0 + x1) / 2, y: (y0 + y1) / 2 + 9, x0, y0: y0 + 9, x1, y1: y1 + 9, fly, hit: !!hit, dur: fly + 0.7 });
  later(fly, () => {
    if (!V3.on) particles(x1, y1 - 14, { count: 10, color: [NK.bone, NK.boneDark, '#ffffff'], speed: [60, 160], life: [0.3, 0.6], size: [2, 3.5], shape: 'square', drag: 3, gravity: 300 });
    if (!local || !hit || hit.dead) return;
    hitMonster(hit, sk.dmg * pw, { skill: sk.id, slow: sk.slow, heavy: true, vfxColor: '#fff4dc' });
  });
}
MAGE2_REMOTE.bonethrow = (rp, sk, d) => boneFx(rp, d.x ?? rp.x, d.y ?? rp.y, d.tx, d.ty, sk, false, 0, d.h ? {} : null);

// === Weg der Knochen: Blutlarve (Zielort, springt und platzt) =======================================
SKILL_TYPES.larva = function (sk, pw, lvl) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.3);
  input.walkTo = null;
  larvaFx(p, p.x, p.y, pt.x, pt.y, sk, true, pw);
  return { x: Math.round(p.x), y: Math.round(p.y), tx: Math.round(pt.x), ty: Math.round(pt.y) };
};
function larvaFx(owner, x0, y0, x, y, sk, local, pw) {
  addEffect({ type: 'larva3', x, y: y + 9, x0, y0: y0 + 9, x1: x, y1: y + 9, hop: sk.hop, wr: sk.wriggle, R: sk.radius, seed: Math.random() * 10, dur: sk.hop + sk.wriggle + 1.4 });
  later(sk.hop, () => {
    if (owner === game.player) shakeScreen(1);
  });
  later(sk.hop + sk.wriggle, () => {
    if (owner === game.player) shakeScreen(5);
    if (!V3.on) particles(x, y - 8, { count: 30, color: [NK.bright, NK.blood, NK.deep], speed: [80, 260], life: [0.4, 0.8], size: [2, 5], drag: 2, gravity: 300 });
    if (!local) return;
    for (const m of enemiesInCircle(x, y, sk.radius)) hitMonster(m, sk.dmg * pw, { skill: sk.id, bleed: sk.bleed, knockback: 25, from: { x, y }, heavy: true, vfxColor: '#ff8a9a' });
  });
}
MAGE2_REMOTE.larva = (rp, sk, d) => larvaFx(rp, d.x ?? rp.x, d.y ?? rp.y, d.tx, d.ty, sk, false, 0);

// === Weg der Knochen: Totenhand (packt und zerdrückt) =============================================
SKILL_TYPES.gravehand = function (sk, pw, lvl) {
  const p = game.player;
  const t = pickTarget(sk.range);
  if (!t) {
    addText(p.x, p.y - 34, 'Kein Ziel', 'info');
    return false;
  }
  faceTowards(t.x, t.y);
  lockPlayer(p, 0.3);
  input.walkTo = null;
  handFx(p, t.x, t.y, sk, true, pw);
  return { tx: Math.round(t.x), ty: Math.round(t.y) };
};
function handFx(owner, x, y, sk, local, pw) {
  const ang = Math.atan2(y - owner.y, x - owner.x);
  addEffect({ type: 'hand3', x, y: y + 9, R: sk.radius, grab: sk.grab, hold: sk.hold, ang, dur: sk.grab + sk.hold + 0.9 });
  let caught = [];
  later(sk.grab, () => {
    if (owner === game.player) shakeScreen(3);
    if (!V3.on) particles(x, y, { count: 16, color: ['#6a5a46', NK.bone], speed: [60, 160], life: [0.3, 0.6], size: [2, 4], shape: 'square', drag: 3, gravity: 300 });
    if (!local) return;
    caught = enemiesInCircle(x, y, sk.radius).filter((m) => !m.dead);
    for (const m of caught) hitMonster(m, sk.dmg * pw, { skill: sk.id, stun: sk.hold, heavy: true, vfxColor: '#fff4dc' });
  });
  later(sk.grab + sk.hold, () => {
    if (owner === game.player) shakeScreen(6);
    if (!local) return;
    for (const m of caught) if (!m.dead && Math.hypot(m.x - x, m.y - y) < sk.radius + 40) hitMonster(m, sk.crush * pw, { skill: sk.id, heavy: true, vfxColor: '#fff4dc' });
  });
}
MAGE2_REMOTE.gravehand = (rp, sk, d) => handFx(rp, d.tx, d.ty, sk, false, 0);

// === Weg der Knochen: Blutlanzen (bis zu sechs Ziele) =============================================
SKILL_TYPES.bloodlances = function (sk, pw, lvl) {
  const p = game.player;
  const foes = aliveEnemies().filter((m) => dist(m, p) < sk.range + (m.r || 0)).sort((a, b) => dist(a, p) - dist(b, p)).slice(0, sk.count);
  if (!foes.length) {
    addText(p.x, p.y - 34, 'Kein Ziel', 'info');
    return false;
  }
  faceTowards(foes[0].x, foes[0].y);
  lockPlayer(p, 0.4);
  input.walkTo = null;
  const pts = [];
  for (let k = 0; k < sk.count; k++) {
    const m = foes[k % foes.length];
    pts.push({ m, x: m.x, y: m.y });
  }
  lanceFx(p, pts, sk, true, pw);
  return { ts: pts.map((q) => [Math.round(q.x), Math.round(q.y)]) };
};
function lanceFx(owner, pts, sk, local, pw) {
  const grow = 0.3;
  const fly = 0.2;
  addEffect({ type: 'lances3', owner, x: owner.x, y: feetY(owner), pts, grow, fly, dur: grow + pts.length * 0.06 + fly + 0.6 });
  pts.forEach((q, k) => {
    later(grow + k * 0.06 + fly, () => {
      if (q.m && !q.m.dead) { q.x = q.m.x; q.y = q.m.y; }
      q.hit = game.time;
      if (owner === game.player) shakeScreen(1.2);
      if (!V3.on) particles(q.x, q.y - 14, { count: 8, color: [NK.bright, NK.blood], speed: [50, 140], life: [0.25, 0.5], size: [2, 3.5], drag: 3, gravity: 200 });
      if (!local || !q.m || q.m.dead) return;
      const dmg = hitMonster(q.m, sk.dmg * pw, { skill: sk.id, heavy: true, vfxColor: '#ff8a9a' }) || 0;
      const heal = Math.round(dmg * sk.leech);
      if (heal > 0 && !owner.dead) owner.hp = Math.min(game.stats.maxHp, owner.hp + heal);
      if (k === pts.length - 1) later(0.05, () => addText(owner.x, owner.y - 44, 'Lebensraub', 'heal'));
    });
  });
}
MAGE2_REMOTE.bloodlances = (rp, sk, d) => lanceFx(rp, (d.ts || []).map(([x, y]) => ({ m: nkNear(x, y, 40), x, y })), sk, false, 0);

// === Ultimative Attacke Weg der Knochen: Sensenmann ================================================
const REAPER = { R: 240, rise: 0.7, s1: 1.0, s1d: 0.32, s2: 1.65, s2d: 0.55, gone: 2.6, dur: 3.3, back: 70 };
ULT_RUN.sensenmann = function (p, u, pw) {
  const cx = p.x;
  const cy = p.y;
  const ang = Math.atan2(p.facing.y, p.facing.x);
  const e = reaperShow(p, cx, cy, ang);
  later(REAPER.s1 + REAPER.s1d * 0.5, () => {
    shakeScreen(7);
    flashScreen(u.color, 0.15);
    for (const m of enemiesInCircle(cx, cy, REAPER.R)) {
      let d = Math.abs(Math.atan2(m.y - cy, m.x - cx) - ang);
      if (d > Math.PI) d = Math.PI * 2 - d;
      if (d > 2.0) continue;
      hitMonster(m, 3 * pw, { heavy: true, slow: { amount: 0.4, duration: 3 }, knockback: 20, from: { x: cx, y: cy }, vfxColor: NK.reapPale });
    }
  });
  later(REAPER.s2 + REAPER.s2d * 0.5, () => {
    shakeScreen(10);
    flashScreen(u.color, 0.22);
    let n = 0;
    for (const m of enemiesInCircle(cx, cy, REAPER.R)) {
      const low = m.maxHp && m.hp / m.maxHp < 0.25;
      e.souls.push({ x: m.x, y: m.y, h: Math.max(0.5, figureHeight(m) * 0.5 * U3), t: game.time });
      hitMonster(m, (low ? 7 : 3.5) * pw, { heavy: true, vfxColor: NK.reapPale });
      n++;
    }
    later(0.55, () => nkHeal(p, game.stats.maxHp * Math.min(0.3, 0.04 * n)));
  });
};
function reaperShow(owner, x, y, ang) {
  const e = addEffect({ type: 'sensen3', owner, x, y: feetY(owner || { x, y }), ang, souls: [], dur: REAPER.dur });
  // Mitspieler: die Seelen der Gegner in Reichweite fliegen trotzdem sichtbar zum Sensenmann
  if (owner !== game.player) {
    later(REAPER.s2 + REAPER.s2d * 0.5, () => {
      for (const m of enemiesInCircle(x, y, REAPER.R)) e.souls.push({ x: m.x, y: m.y, h: Math.max(0.5, figureHeight(m) * 0.5 * U3), t: game.time });
    });
  }
  return e;
}
ULT_SHOW.sensenmann = (x, y) => {
  let owner = null;
  for (const rp of net.players.values()) if (!owner || Math.hypot(rp.x - x, rp.y - y) < Math.hypot(owner.x - x, owner.y - y)) owner = rp;
  const own = owner && Math.hypot(owner.x - x, owner.y - y) < 80 ? owner : null;
  reaperShow(own, x, y, own && own.facing ? Math.atan2(own.facing.y, own.facing.x) : -Math.PI / 2);
};

// === 3D =========================================================================================
['siphon3', 'gflood3', 'lifetap3', 'bone3', 'larva3', 'hand3', 'lances3', 'sensen3'].forEach((k) => FX3_TYPES.add(k));

// Blutsauger: gewundener Blutfaden, Blutstropfen wandern vom Ziel in die Hand
FX3_DRAW.siphon3 = function (h, e) {
  const f = e.follow;
  if (!f) return;
  const t = game.time - e.start;
  const fade = Math.min(1, t / 0.1) * Math.max(0, Math.min(1, (e.dur - t) / 0.15));
  if (fade <= 0) return;
  const a = nkHand(_nkP, f);
  const tg = e.tgt && !e.tgt.dead ? e.tgt : null;
  const b = nkBody(_nkQ, tg, e.x2, e.y2);
  const pulse = 0.8 + 0.2 * Math.sin(t * 16);
  nkTether(h, a, b, t, fade * pulse);
  const low = n3low();
  // Tropfen: vom Ziel (u = 1) zur Hand (u = 0)
  const nd = low ? 3 : 7;
  for (let k = 0; k < nd; k++) {
    const u = 1 - ((t * 1.6 + k / nd) % 1);
    const sag = -Math.sin(Math.PI * u) * 0.12;
    const x = a.x + (b.x - a.x) * u;
    const y = a.y + (b.y - a.y) * u + sag + Math.sin(u * 20 + t * 9) * 0.03;
    const z = a.z + (b.z - a.z) * u;
    nkDrop(h, x, y, z, 0.11 + 0.04 * Math.sin(k * 3 + t * 8), fade, k % 2 ? NK.blood : NK.deep);
    if (!low) n3Glow(h, x, y, z, 0.22, NK.bright, 0.35 * fade);
  }
  // Ziel: rotes Pochen, Spritzer; Hand: rote Glut
  n3Glow(h, b.x, b.y, b.z, 0.9 * pulse, NK.bright, 0.45 * fade);
  n3Glow(h, a.x, a.y, a.z, 0.5 * pulse, NK.bright, 0.55 * fade);
  if (!low) {
    for (let k = 0; k < 4; k++) {
      const u = (t * 2.2 + k * 0.25) % 1;
      const ang = k * 1.7 + t * 3;
      nkDrop(h, b.x + Math.cos(ang) * 0.25 * u, b.y + 0.15 * u - u * u * 0.5, b.z + Math.sin(ang) * 0.25 * u, 0.07, fade * (1 - u));
    }
  }
};

// Geisterflut: Geister wirbeln über dem Nekromanten hoch und stürzen auf die Ziele
function nkGhost(h, x, y, z, s, op, scream, vx, vz) {
  // Schweif entgegen der Flugrichtung
  const L = Math.hypot(vx, vz) || 1;
  for (let j = 1; j <= 4; j++) {
    n3Smoke(h, x - (vx / L) * j * 0.16 * s, y + j * 0.04, z - (vz / L) * j * 0.16 * s, s * (0.5 - j * 0.08), j % 2 ? NK.ghost : NK.ghostDeep, op * (0.75 - j * 0.15));
  }
  n3Smoke(h, x, y, z, s * 0.78, NK.ghostDeep, op * 0.85);
  n3Glow(h, x, y, z, s * 1.2, NK.ghost, op * 0.4);
  n3Smoke(h, x, y + s * 0.02, z + 0.01, s * 0.62, NK.ghostPale, op * 0.95);
  // Augen und schreiender Mund (dunkel)
  const { r: R } = FX3.cam;
  for (const side of [-1, 1]) {
    _nkA.set(x, y + s * 0.07, z + 0.02).addScaledVector(R, side * s * 0.12);
    n3Smoke(h, _nkA.x, _nkA.y, _nkA.z, s * 0.12, '#0a2a1a', op);
    n3Glow(h, _nkA.x, _nkA.y, _nkA.z + 0.01, s * 0.12, '#d8ffe8', op * 0.8);
  }
  const mo = n3Smoke(h, x, y - s * 0.12, z + 0.02, s * 0.12, '#0a2a1a', op);
  mo.scale.set(s * 0.12, s * (0.12 + 0.12 * scream), 1);
}
FX3_DRAW.gflood3 = function (h, e) {
  const t = game.time - e.start;
  const own = e.owner;
  const ox = (own ? own.x : e.ox) * U3;
  const oz = (own ? feetY(own) : e.oy + 9) * U3;
  const low = n3low();
  e.ghosts.forEach((g, k) => {
    const dive = g.at;
    const land = dive + 0.32;
    const s = 0.95;
    if (t < dive) {
      // Aufstieg in der Spirale (versetzt je Geist)
      const u = Math.min(1, Math.max(0, (t - k * 0.02) / dive));
      if (u <= 0) return;
      const a = g.ang0 + t * 7;
      const r = 0.3 + 0.9 * u;
      const x = ox + Math.cos(a) * r;
      const y = 0.6 + 2.4 * easeOut(u);
      const z = oz + Math.sin(a) * r * 0.8;
      nkGhost(h, x, y, z, s * (0.6 + 0.4 * u), Math.min(1, u * 3), 0.5 + 0.5 * Math.sin(t * 20 + k), -Math.sin(a), Math.cos(a));
    } else if (t < land) {
      // Sturzflug: Bogen vom Scheitel zum Ziel
      const u = easeIn3((t - dive) / 0.32);
      const a = g.ang0 + dive * 7;
      const sx = ox + Math.cos(a) * 1.2;
      const sy = 3.0;
      const sz = oz + Math.sin(a) * 1.2 * 0.8;
      const tx = g.x * U3;
      const tz = (g.y + 9) * U3;
      const cxp = (sx + tx) / 2;
      const czp = (sz + tz) / 2;
      const w = 1 - u;
      const x = w * w * sx + 2 * w * u * cxp + u * u * tx;
      const y = w * w * sy + 2 * w * u * 3.6 + u * u * 0.6;
      const z = w * w * sz + 2 * w * u * czp + u * u * tz;
      nkGhost(h, x, y, z, s, 1, 1, tx - sx, tz - sz);
    } else if (t < land + 0.5) {
      // Einschlag: grünes Seelenfeuer und Rauch
      const v = (t - land) / 0.5;
      const x = g.x * U3;
      const z = (g.y + 9) * U3;
      n3Glow(h, x, 0.5, z, 0.8 + 1.4 * v, NK.ghost, 0.75 * (1 - v));
      if (!low) {
        for (let j = 0; j < 4; j++) {
          const a = j * 1.57 + k;
          n3Flame(h, x + Math.cos(a) * 0.3 * v, 0.35 + 0.5 * v, z + Math.sin(a) * 0.3 * v, 0.35, 0.7 * (1 - v * 0.5), NK.ghost, 0.85 * (1 - v), a * 0.2, true);
        }
      }
      n3Smoke(h, x, 0.4 + v * 0.8, z, 0.6 + v * 0.9, '#1f3a2c', 0.5 * (1 - v));
    }
  });
  // Schluss: Seelenwelle – Flammen schießen auseinander, ohne Zeichen am Boden
  if (t >= e.end && t < e.end + 0.8) {
    const v = (t - e.end) / 0.8;
    const cx = e.x * U3;
    const cz = e.y * U3;
    const R = e.R * U3;
    n3Glow(h, cx, 0.8, cz, R * (0.8 + v), NK.ghost, 0.55 * (1 - v));
    const n = low ? 8 : 16;
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2;
      const r = R * easeOut(v);
      n3Flame(h, cx + Math.cos(a) * r, 0.4 + 0.3 * Math.sin(v * 3), cz + Math.sin(a) * r * 0.85, 0.5, 0.9 * (1 - v), j % 2 ? NK.ghost : NK.ghostDeep, 0.9 * (1 - v), 0, true);
      if (!low && j % 2) n3Smoke(h, cx + Math.cos(a) * r * 0.8, 0.5 + v, cz + Math.sin(a) * r * 0.7, 0.7, '#1f3a2c', 0.4 * (1 - v));
    }
  }
};

// Lebensentzug: Blutband schnellt zum Ziel, eine Blutkugel fliegt zurück in die Brust
FX3_DRAW.lifetap3 = function (h, e) {
  const own = e.owner;
  if (!own) return;
  const t = game.time - e.start;
  const a = nkHand(_nkP, own);
  const tg = e.tgt && !e.tgt.dead && e.tgt.x != null ? e.tgt : null;
  const b = nkBody(_nkQ, tg, e.x2, e.y2);
  if (t < 0.15) {
    // Band wächst zum Ziel
    const u = easeOut(t / 0.15);
    _nkR.lerpVectors(a, b, u);
    nkTether(h, a, _nkR, t, 1, 0.06, 5);
  } else if (t < 0.3) {
    // Ruck: das Band reißt, am Ziel spritzt Blut
    const v = (t - 0.15) / 0.15;
    _nkR.lerpVectors(b, a, v * 0.6);
    nkTether(h, _nkR, b, t, 1 - v, 0.06, 5);
  }
  if (t >= 0.15 && t < 0.55) {
    // Blutkugel fliegt im Bogen zurück
    const u = easeIn3((t - 0.15) / 0.4);
    const x = b.x + (a.x - b.x) * u;
    const y = b.y + (a.y - b.y) * u + Math.sin(Math.PI * u) * 0.6;
    const z = b.z + (a.z - b.z) * u;
    n3Glow(h, x, y, z, 0.6, NK.bright, 0.4);
    nkDrop(h, x, y, z, 0.36, 1, NK.blood);
    nkDrop(h, x - 0.06, y + 0.07, z + 0.02, 0.1, 0.9, NK.core);
    for (let j = 1; j <= 4; j++) {
      const w = Math.max(0, u - j * 0.06);
      nkDrop(h, b.x + (a.x - b.x) * w, b.y + (a.y - b.y) * w + Math.sin(Math.PI * w) * 0.6, b.z + (a.z - b.z) * w, 0.16 - j * 0.025, 0.8 - j * 0.15, NK.deep);
    }
  }
  if (t >= 0.15 && t < 0.5) {
    const v = (t - 0.15) / 0.35;
    n3Glow(h, b.x, b.y, b.z, 0.7 + v * 0.6, NK.bright, 0.35 * (1 - v));
    for (let j = 0; j < 8; j++) {
      const ang = j * 0.785;
      nkDrop(h, b.x + Math.cos(ang) * 0.5 * v, b.y + 0.4 * v - v * v * 0.9, b.z + Math.sin(ang) * 0.5 * v, 0.09, 1 - v);
    }
  }
  if (t >= 0.55) {
    // Heilung: rote Glut in der Brust, Funken steigen auf
    const v = (t - 0.55) / 0.25;
    nkBody(_nkC, own);
    n3Glow(h, _nkC.x, _nkC.y, _nkC.z, 0.7 * (1 + v), NK.bright, 0.35 * (1 - v));
    for (let j = 0; j < 5; j++) n3Glow(h, _nkC.x + Math.cos(j * 1.3) * 0.3, _nkC.y + v * 0.9 + j * 0.05, _nkC.z + Math.sin(j * 1.3) * 0.3, 0.14, '#ffb0b8', 1 - v);
  }
};

// Knochenwurf: ein großer Oberschenkelknochen überschlägt sich auf dem Weg, zersplittert beim Treffer
FX3_DRAW.bone3 = function (h, e) {
  const t = game.time - e.start;
  const x0 = e.x0 * U3;
  const z0 = e.y0 * U3;
  const x1 = e.x1 * U3;
  const z1 = e.y1 * U3;
  _nkE.set(x1 - x0, 0, z1 - z0);
  const L = _nkE.length() || 1;
  _nkE.divideScalar(L);
  if (t < e.fly) {
    const u = t / e.fly;
    const x = x0 + (x1 - x0) * u;
    const z = z0 + (z1 - z0) * u;
    const y = 0.9 + Math.sin(Math.PI * u) * 0.5;
    const spin = t * 22;
    // Achse dreht in der senkrechten Ebene der Flugbahn
    _nkC.copy(_nkE).multiplyScalar(Math.cos(spin)).addScaledVector(_nkUp, Math.sin(spin));
    const half = 0.55;
    _nkA.set(x, y, z).addScaledVector(_nkC, -half);
    _nkB.set(x, y, z).addScaledVector(_nkC, half);
    nkBone(h, _nkA, _nkB, 0.095);
    // Gelenkköpfe: je zwei Knubbel an beiden Enden
    _nkD.crossVectors(_nkC, _nkE).normalize();
    for (const [p, sgn] of [[_nkA, -1], [_nkB, 1]]) {
      for (const side of [-1, 1]) {
        nkBall(h, p.x + _nkD.x * side * 0.07 + _nkC.x * sgn * 0.04, p.y + _nkD.y * side * 0.07 + _nkC.y * sgn * 0.04, p.z + _nkD.z * side * 0.07 + _nkC.z * sgn * 0.04, 0.13, 0.13, 0.13, side > 0 ? NK.bone : NK.boneDark);
      }
    }
    // weißer Wirbel-Schweif
    if (!n3low()) {
      for (let j = 1; j <= 4; j++) {
        const w = Math.max(0, u - j * 0.05);
        n3Smoke(h, x0 + (x1 - x0) * w, 0.9 + Math.sin(Math.PI * w) * 0.5, z0 + (z1 - z0) * w, 0.32 - j * 0.05, '#f4ecd8', 0.35 - j * 0.07);
      }
    }
    return;
  }
  // Splitter und Staub nach dem Aufprall
  const v = Math.min(1, (t - e.fly) / 0.7);
  const n = e.hit ? 8 : 5;
  for (let j = 0; j < n; j++) {
    const a = j * (Math.PI * 2 / n) + 0.4;
    const sp = 0.9 + (j % 3) * 0.3;
    const px = x1 + Math.cos(a) * sp * v;
    const pz = z1 + Math.sin(a) * sp * v * 0.8;
    const py = Math.max(0.05, 0.9 + 1.4 * v - 3.2 * v * v);
    _nkA.set(px, py, pz);
    _nkB.set(px + Math.cos(a + v * 9) * 0.14, py + Math.sin(v * 9 + j) * 0.1, pz + Math.sin(a + v * 9) * 0.14);
    nkBone(h, _nkA, _nkB, 0.035, j % 2 ? NK.bone : NK.boneDark, 1 - v * 0.6);
  }
  n3Smoke(h, x1, 0.6 + v * 0.5, z1, 0.5 + v * 0.8, '#d8ccb0', 0.5 * (1 - v));
  if (e.hit && v < 0.4) n3Glow(h, x1, 0.9, z1, 1.2, '#fff4dc', 0.5 * (1 - v / 0.4));
};

// Blutlarve: Gliederkette springt im Bogen, windet sich, schwillt an und platzt
FX3_DRAW.larva3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const hop = e.hop;
  const burst = hop + e.wr;
  const x0 = e.x0 * U3;
  const z0 = e.y0 * U3;
  const x1 = e.x1 * U3;
  const z1 = e.y1 * U3;
  const segs = 6;
  if (t < burst) {
    const swell = t > hop ? 1 + 0.6 * ((t - hop) / e.wr) : 1;
    for (let i = 0; i < segs; i++) {
      // jedes Glied folgt dem Kopf mit kleinem Abstand auf der Bahn
      const lag = i * 0.035;
      let x;
      let y;
      let z;
      if (t - lag < hop) {
        const u = Math.max(0, (t - lag) / hop);
        x = x0 + (x1 - x0) * u;
        z = z0 + (z1 - z0) * u;
        y = 0.3 + Math.sin(Math.PI * u) * 2.2;
      } else {
        // am Boden: windet sich (Glieder seitlich versetzt, Welle läuft durch)
        const w = t - hop;
        const dx = x1 - x0;
        const dz = z1 - z0;
        const L = Math.hypot(dx, dz) || 1;
        const off = (i - segs / 2) * 0.17 * swell;
        const wig = Math.sin(w * 22 - i * 1.2) * 0.12 * swell;
        x = x1 - (dx / L) * off + (-dz / L) * wig;
        z = z1 - (dz / L) * off + (dx / L) * wig;
        y = 0.16 * swell + Math.abs(Math.sin(w * 22 - i)) * 0.05;
      }
      const r = (i === 0 ? 0.17 : 0.15 - i * 0.012) * swell;
      nkBall(h, x, y, z, r, r * 0.85, r, i % 2 ? '#8a0a1a' : '#b01828');
      if (!low) n3Glow(h, x - 0.04, y + r * 0.5, z + 0.04, r * 0.7, '#ffd0d4', 0.35);
      if (i === 0) {
        // Kiefer
        for (const side of [-1, 1]) {
          const c = fx3Take(h, 'cone');
          c.position.set(x + side * 0.08, y + 0.02, z + 0.12);
          c.scale.set(0.035, 0.14, 0.035);
          c.rotation.set(1.2, 0, side * 0.5);
          fx3Color(c, '#2a0206', 1);
        }
      }
    }
    if (t > hop) {
      const k = (t - hop) / e.wr;
      n3Glow(h, x1, 0.3, z1, 0.8 + 1.4 * k, NK.bright, 0.25 + 0.45 * k);
    }
    // Spur aus Tropfen während des Sprungs
    if (t < hop && !low) {
      for (let j = 1; j <= 4; j++) {
        const u = Math.max(0, t / hop - j * 0.06);
        nkDrop(h, x0 + (x1 - x0) * u, 0.3 + Math.sin(Math.PI * u) * 2.2 - j * 0.05, z0 + (z1 - z0) * u, 0.08, 0.8 - j * 0.15);
      }
    }
    return;
  }
  // Platzen: Blutfontäne, Tropfen fallen, Lachen bleiben kurz liegen
  const v = Math.min(1, (t - burst) / 1.2);
  const k = Math.min(1, (t - burst) / 0.45);
  n3Glow(h, x1, 0.5, z1, 1.4 + 2.4 * k, NK.bright, 0.7 * (1 - k));
  n3Smoke(h, x1, 0.4 + k * 0.8, z1, 0.8 + k * 1.6, NK.deep, 0.7 * (1 - k));
  const n = low ? 10 : 20;
  const R = e.R * U3;
  for (let j = 0; j < n; j++) {
    const a = n2h(j, e.seed) * Math.PI * 2;
    const sp = R * (0.5 + n2h(j, e.seed + 1) * 0.6);
    const up = 1.2 + n2h(j, e.seed + 2) * 1.8;
    const py = 0.3 + up * k - 4.2 * k * k;
    if (py < 0.03) continue;
    nkDrop(h, x1 + Math.cos(a) * sp * k, py, z1 + Math.sin(a) * sp * k * 0.8, 0.09 + n2h(j, e.seed + 3) * 0.08, 1 - k * 0.3, j % 3 ? NK.blood : NK.deep);
  }
  // Blutspritzer am Boden (unregelmäßig, kein Kreis)
  const lay = Math.min(1, (t - burst) / 0.35) * (1 - Math.max(0, v - 0.6) / 0.4);
  if (lay > 0) {
    for (let j = 0; j < (low ? 5 : 9); j++) {
      const a = n2h(j, e.seed + 7) * Math.PI * 2;
      const d = R * (0.15 + n2h(j, e.seed + 8) * 0.75);
      const o = fx3Take(h, 'planeN');
      fx3Ground(o, (x1 + Math.cos(a) * d) / U3, (z1 + Math.sin(a) * d * 0.8) / U3, 0.18 + n2h(j, e.seed + 9) * 0.3, 0.025, 'disc', a);
      fx3Color(o, j % 2 ? NK.deep : NK.blood, 0.85 * lay);
    }
  }
};

// Totenhand: Unterarm und fünf Finger aus Knochen brechen aus der Erde, schließen sich und zerdrücken
FX3_DRAW.hand3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const cx = e.x * U3;
  const cz = e.y * U3;
  const S = 1.45;
  const crushT = e.grab + e.hold;
  // Aufsteigen, Halten, Zerdrücken, Versinken
  const rise = easeOut(Math.min(1, t / e.grab));
  const sink = t > crushT + 0.25 ? easeIn3(Math.min(1, (t - crushT - 0.25) / 0.6)) : 0;
  const yo = -1.6 * S * (1 - rise) - 1.8 * S * sink;
  const op = 1 - sink * 0.6;
  let curl = 0;
  if (t > e.grab - 0.1) curl = 0.85 * easeOut(Math.min(1, (t - e.grab + 0.1) / 0.2));
  if (t > crushT) curl = 0.85 + 0.25 * easeOut(Math.min(1, (t - crushT) / 0.12));
  const shake = t > e.grab && t < crushT + 0.2 ? Math.sin(t * 60) * 0.025 : 0;
  // Boden bricht auf: Risse und Erdbrocken
  const crack = fx3Take(h, 'planeN');
  fx3Ground(crack, e.x, e.y, e.R * U3 * 1.3, 0.03, 'mcracks', e.ang);
  fx3Color(crack, '#1a120c', 0.8 * Math.min(1, t / 0.2) * (1 - sink));
  if (t < e.grab + 0.4) {
    const v = Math.min(1, t / (e.grab + 0.4));
    for (let j = 0; j < (low ? 4 : 8); j++) {
      const a = j * 0.785 + 0.3;
      const py = Math.max(0.05, 1.6 * v - 2.6 * v * v);
      const r = fx3Rock(h, 'rock', cx + Math.cos(a) * (0.5 + 1.1 * v), py, cz + Math.sin(a) * (0.4 + 0.9 * v), 0.12, 0.1, 0.11, '#5a4636');
      r.rotation.set(v * 6 + j, j, v * 4);
    }
  }
  // Unterarm: vom Boden hinter dem Ziel (zur Kamera hin) schräg hoch zum Handgelenk
  const wrist = _nkA.set(cx + shake, 0.35 * S + yo, cz + 0.55 * S);
  _nkB.set(cx + shake * 0.5, -0.6 * S + yo * 0.3, cz + 1.25 * S);
  nkBone(h, _nkB, wrist, 0.11 * S, NK.boneDark, op);
  _nkC.set(_nkB.x + 0.12 * S, _nkB.y, _nkB.z - 0.05);
  _nkD.set(wrist.x + 0.1 * S, wrist.y, wrist.z - 0.02);
  nkBone(h, _nkC, _nkD, 0.08 * S, NK.bone, op);
  nkBall(h, wrist.x, wrist.y, wrist.z, 0.17 * S, 0.14 * S, 0.17 * S, NK.bone, op);
  // Handfläche (Mittelhandknochen) als flacher Teller aus Kugeln
  const palm = _nkE.set(cx + shake, 0.42 * S + yo, cz + 0.15 * S);
  nkBall(h, palm.x, palm.y, palm.z, 0.32 * S, 0.1 * S, 0.3 * S, NK.bone, op);
  // fünf Finger im Halbkreis um das Ziel; der Daumen gegenüber
  const fingers = [-1.15, -0.55, 0, 0.55, Math.PI - 0.35];
  const lens = [[0.42, 0.34, 0.26], [0.46, 0.36, 0.28], [0.48, 0.38, 0.28], [0.44, 0.34, 0.26], [0.36, 0.3, 0.22]];
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  fingers.forEach((th, i) => {
    // Fingerwurzel am Rand der Handfläche; 0 = vom Kamerablick aus nach hinten (Norden)
    const ox = Math.sin(th);
    const oz = -Math.cos(th);
    p0.set(palm.x + ox * 0.36 * S, palm.y + 0.04 * S, palm.z + oz * 0.36 * S);
    // Winkel je Glied: offen steil nach oben/außen, geschlossen über die Mitte hinweg
    const open = [1.25, 1.35, 1.45];
    const closed = [1.6, 2.5, 3.3];
    for (let k = 0; k < 3; k++) {
      const phi = open[k] + (closed[k] - open[k]) * Math.min(1.1, curl);
      const L = lens[i][k] * S;
      p1.set(p0.x + ox * Math.cos(phi) * L, p0.y + Math.sin(phi) * L, p0.z + oz * Math.cos(phi) * L);
      nkBone(h, p0, p1, (0.065 - k * 0.012) * S, k === 2 ? NK.boneDark : NK.bone, op);
      nkBall(h, p0.x, p0.y, p0.z, (0.08 - k * 0.012) * S, (0.08 - k * 0.012) * S, (0.08 - k * 0.012) * S, NK.bone, op);
      p0.copy(p1);
    }
    // Krallenspitze
    const c = fx3Take(h, 'cone');
    c.position.copy(p0);
    c.scale.set(0.035 * S, 0.12 * S, 0.035 * S);
    c.rotation.set(oz * 1.4 * curl, 0, -ox * 1.4 * curl);
    fx3Color(c, '#3a2c1c', op);
  });
  // unheimliches rotes Glimmen in der Faust
  if (t > e.grab - 0.1 && sink < 1) n3Glow(h, cx, 0.8 * S + yo, cz + 0.1, 1.4 + 0.3 * Math.sin(t * 12), NK.bright, 0.35 * (1 - sink));
  // Knochenstaub beim Zerdrücken
  if (t > crushT && t < crushT + 0.6) {
    const v = (t - crushT) / 0.6;
    for (let j = 0; j < (low ? 4 : 8); j++) {
      const a = j * 0.785;
      n3Smoke(h, cx + Math.cos(a) * 0.9 * v, 0.6 + v * 0.8, cz + Math.sin(a) * 0.7 * v, 0.4 + v * 0.6, '#d8ccb0', 0.6 * (1 - v));
    }
  }
};

// Blutlanzen: wachsen wie Flügel aus dem Rücken, schießen nacheinander zu den Zielen
FX3_DRAW.lances3 = function (h, e) {
  const own = e.owner;
  if (!own) return;
  const t = game.time - e.start;
  const low = n3low();
  nkBody(_nkD, own);
  const n = e.pts.length;
  e.pts.forEach((q, k) => {
    // Flügelstellung: fächerförmig hinter der Figur (Norden = vom Betrachter weg), nach oben-außen geneigt
    const side = k % 2 ? 1 : -1;
    const row = Math.floor(k / 2);
    const fan = side * (0.5 + row * 0.38);
    _nkC.set(Math.sin(fan), 0.75 + row * 0.12, -0.55).normalize();
    const base = _nkA.set(_nkD.x + side * 0.12, _nkD.y + 0.25, _nkD.z - 0.12);
    const launch = e.grow + k * 0.06;
    const land = launch + e.fly;
    if (t < launch) {
      const g = easeOut(Math.min(1, t / e.grow));
      const len = 1.35 * g;
      const o = fx3Take(h, 'cone');
      fx3Cone(o, base, _nkC, len, 0.11);
      fx3Color(o, NK.blood, 1);
      if (!low) {
        const c = fx3Take(h, 'coneG');
        fx3Cone(c, base, _nkC, len * 0.9, 0.045);
        fx3Color(c, NK.bright, 0.8);
      }
      n3Glow(h, base.x + _nkC.x * len, base.y + _nkC.y * len, base.z + _nkC.z * len, 0.4, NK.bright, 0.5 * g);
      return;
    }
    const tip = _nkB.copy(base).addScaledVector(_nkC, 1.35);
    const tg = q.m && !q.m.dead ? q.m : null;
    const dst = nkBody(_nkE, tg, q.x, q.y);
    if (t < land) {
      const u = easeIn3((t - launch) / e.fly);
      const x = tip.x + (dst.x - tip.x) * u;
      const y = tip.y + (dst.y - tip.y) * u + Math.sin(Math.PI * u) * 0.5;
      const z = tip.z + (dst.z - tip.z) * u;
      _nkC.set(dst.x - tip.x, dst.y - tip.y + Math.cos(Math.PI * u) * 0.5, dst.z - tip.z).normalize();
      _nkA.set(x, y, z).addScaledVector(_nkC, -1.2);
      const o = fx3Take(h, 'cone');
      fx3Cone(o, _nkA, _nkC, 1.3, 0.11);
      fx3Color(o, NK.blood, 1);
      if (!low) {
        const c = fx3Take(h, 'coneG');
        fx3Cone(c, _nkA, _nkC, 1.2, 0.045);
        fx3Color(c, NK.bright, 0.9);
        for (let j = 1; j <= 3; j++) nkDrop(h, x - _nkC.x * (0.8 + j * 0.15), y - _nkC.y * (0.8 + j * 0.15), z - _nkC.z * (0.8 + j * 0.15), 0.07, 0.8 - j * 0.2);
      }
    } else if (t < land + 0.35) {
      const v = (t - land) / 0.35;
      n3Glow(h, dst.x, dst.y, dst.z, 0.7 + v, NK.bright, 0.6 * (1 - v));
      for (let j = 0; j < 5; j++) {
        const a = j * 1.26 + k;
        nkDrop(h, dst.x + Math.cos(a) * 0.4 * v, dst.y + 0.3 * v - 0.8 * v * v, dst.z + Math.sin(a) * 0.4 * v, 0.08, 1 - v);
      }
    }
  });
  if (n && t < e.grow + 0.2) n3Glow(h, _nkD.x, _nkD.y + 0.3, _nkD.z - 0.15, 1.2, NK.bright, 0.3);
};

// Sensenmann: riesige Kuttengestalt hinter dem Nekromanten, zwei Sensenhiebe, Seelen fliegen zu ihm
FX3_DRAW.sensen3 = function (h, e) {
  const t = game.time - e.start;
  const own = e.owner;
  const low = n3low();
  const ncx = (own ? own.x : e.x) * U3;
  const ncz = (own ? feetY(own) : e.y) * U3;
  // Gestalt steht hinter der Figur (vom Betrachter weg, Norden)
  const rx = ncx;
  const rz = ncz - REAPER.back * U3;
  const appear = easeOut(Math.min(1, t / REAPER.rise));
  const gone = Math.min(1, Math.max(0, (t - REAPER.gone) / (REAPER.dur - REAPER.gone)));
  const op = appear * (1 - gone);
  const yo = -3.2 * (1 - appear) + 0.15 * Math.sin(t * 2.4) - 1.2 * gone;
  const sway = Math.sin(t * 1.7) * 0.05;
  const R = REAPER.R * U3;
  // Nebel um den Fuß der Gestalt (kein Bodenzeichen)
  for (let j = 0; j < (low ? 5 : 10); j++) {
    const a = j * 0.628 + t * 0.6;
    n3Smoke(h, rx + Math.cos(a) * 1.3, 0.3 + (j % 3) * 0.15, rz + Math.sin(a) * 0.7, 1.1 + (j % 2) * 0.4, j % 2 ? '#0e0a16' : '#241a32', 0.55 * appear * (1 - gone * 0.5));
  }
  if (op <= 0.01) return;
  // Kutte: zwei Lagen, zerfetzter Saum
  const robe = fx3Take(h, 'robe');
  robe.position.set(rx, yo + 1.6, rz);
  robe.scale.set(1.05, 3.0, 0.85);
  robe.rotation.set(0, 0, sway);
  fx3Color(robe, NK.robe, op);
  const robe2 = fx3Take(h, 'robe');
  robe2.position.set(rx, yo + 1.85, rz + 0.12);
  robe2.scale.set(0.8, 2.4, 0.7);
  robe2.rotation.set(0.05, 0, sway);
  fx3Color(robe2, NK.robe2, op);
  for (let i = 0; i < (low ? 6 : 12); i++) {
    const a = (i / (low ? 6 : 12)) * Math.PI * 2;
    const rag = fx3Take(h, 'cone');
    rag.position.set(rx + Math.cos(a) * 0.95, yo + 0.15, rz + Math.sin(a) * 0.78);
    rag.scale.set(0.2, 0.75 + 0.2 * Math.sin(i * 2.3), 0.16);
    rag.rotation.set(Math.PI + Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35 + 0.3 * Math.sin(t * 6 + i * 1.7));
    fx3Color(rag, i % 2 ? NK.robe : NK.robe2, op);
  }
  // Schultern und Kapuze
  for (const side of [-1, 1]) {
    const sh = fx3Take(h, 'hood');
    sh.position.set(rx + side * 0.62, yo + 3.05, rz + 0.05);
    sh.scale.set(0.5, 0.7, 0.45);
    sh.rotation.set(0.1, 0, side * 0.9);
    fx3Color(sh, NK.robe2, op);
  }
  const hood = fx3Take(h, 'hood');
  hood.position.set(rx, yo + 3.75, rz);
  hood.scale.set(0.95, 1.7, 0.95);
  hood.rotation.set(0.28, 0, sway);
  fx3Color(hood, '#1c1428', op);
  // Kapuzenöffnung, Totenschädel, Augenflammen
  const fy = yo + 3.45;
  const hole = fx3Take(h, 'smoke');
  hole.position.set(rx, fy, rz + 0.62);
  hole.scale.set(1.05, 1.2, 1);
  hole.material.color.set('#05030a');
  hole.material.opacity = op;
  const skull = fx3Take(h, 'skull');
  skull.position.set(rx, fy - 0.08, rz + 0.66);
  skull.scale.set(1.65, 1.65, 1.65);
  skull.rotation.set(0, -Math.PI / 2, 0);
  if (skull.userData.eyeMat) {
    skull.userData.eyeMat.color.set(NK.reap);
    skull.userData.eyeMat.opacity = op;
  }
  // Kiefer klappt beim Hieb auf
  if (skull.userData.hinge) skull.userData.hinge.rotation.z = -0.35 * Math.max(0, Math.sin(Math.min(1, Math.max(0, (t - REAPER.s1) / 1.2)) * Math.PI * 2));
  for (const side of [-1, 1]) {
    const fl = 0.85 + 0.25 * Math.sin(t * 19 + side * 2);
    const eye = fx3Take(h, 'spriteFlame');
    fx3Map(eye, 'flame');
    eye.position.set(rx + side * 0.15, fy + 0.1, rz + 1.02);
    eye.scale.set(0.24 * fl, 0.4 * fl, 1);
    fx3Color(eye, NK.reap, op);
  }
  n3Glow(h, rx, fy, rz + 0.8, 1.6, NK.reap, 0.25 * op);
  // Sense: Stiel aus beiden Händen, gebogene Klinge
  const sw1 = Math.min(1, Math.max(0, (t - REAPER.s1) / REAPER.s1d));
  const sw2 = Math.min(1, Math.max(0, (t - REAPER.s2) / REAPER.s2d));
  const a0 = e.ang + 2.0;
  const a1 = e.ang - 2.0;
  let head;
  let lifted = false;
  if (t < REAPER.s1) {
    lifted = true;
    head = a0;
  } else if (t < REAPER.s2) head = a0 + (a1 - a0) * easeOut(sw1);
  else head = a1 - Math.PI * 2 * easeOut(sw2);
  const hand = _nkB.set(rx + 0.25, yo + 2.3, rz + 0.55);
  // Arme: Ärmel und Knochenhände
  for (const side of [-1, 1]) {
    _nkA.set(rx + side * 0.75, yo + 2.95, rz + 0.1);
    _nkC.set(hand.x + side * 0.25, hand.y + (side > 0 ? 0 : 0.35), hand.z);
    const sl = fx3Take(h, 'bone');
    fx3Segment(sl, _nkA, _nkC, 0.2);
    fx3Color(sl, NK.robe2, op);
    nkBall(h, _nkC.x, _nkC.y, _nkC.z, 0.16, 0.13, 0.16, NK.bone, op);
  }
  if (lifted) {
    // erhoben: Stiel schräg über der Schulter, die Klinge hängt groß über dem Kopf
    const lift = easeOut(Math.min(1, Math.max(0, (t - 0.3) / 0.5)));
    _nkC.set(0.5 - 0.3 * lift, 1, 0.1).normalize();
    _nkA.copy(hand).addScaledVector(_nkC, -1.4);
    _nkD.copy(hand).addScaledVector(_nkC, 3.0);
    const shaft = fx3Take(h, 'bone');
    fx3Segment(shaft, _nkA, _nkD, 0.08);
    fx3Color(shaft, '#2a2030', op);
    _nkA.copy(_nkD).addScaledVector(_nkX, -1.6);
    fx3Strip(fx3Take(h, 'stripN'), _nkA, _nkX, _nkUp, 1.6, 0.42, 0, 1.8, '#9a94b0', op, true);
    fx3Strip(fx3Take(h, 'strip'), _nkA, _nkX, _nkUp, 1.56, 0.14, 0.12, 1.7, NK.reapPale, op, true);
  } else {
    // im Hieb: die Klinge läuft auf dem Kreis um den Nekromanten, der Stiel reicht von den Händen hin
    const dir = 1;
    const tipR = R * 0.82;
    _nkA.set(ncx + Math.cos(head) * R * 0.55, 0.9, ncz + Math.sin(head) * R * 0.55);
    const shaft = fx3Take(h, 'bone');
    fx3Segment(shaft, hand, _nkA, 0.08);
    fx3Color(shaft, '#2a2030', op);
    _nkC.set(ncx, 0.75, ncz);
    fx3Strip(fx3Take(h, 'stripN'), _nkC, _nkX, _nkZ, tipR, 0.75, head + dir * 0.55, head, '#4a4458', op, true);
    fx3Strip(fx3Take(h, 'stripN'), _nkC, _nkX, _nkZ, tipR + 0.05, 0.45, head + dir * 0.5, head + dir * 0.02, '#b8b2cc', op, true);
    fx3Strip(fx3Take(h, 'strip'), _nkC, _nkX, _nkZ, tipR + 0.2, 0.14, head + dir * 0.48, head + dir * 0.03, NK.reapPale, op, true);
    // violette Sichelspur hinter der Klinge
    const swinging = (t >= REAPER.s1 && t < REAPER.s1 + REAPER.s1d + 0.25) || (t >= REAPER.s2 && t < REAPER.s2 + REAPER.s2d + 0.3);
    if (swinging) {
      const start = t < REAPER.s2 ? a0 : a1;
      const sw = t < REAPER.s2 ? sw1 : sw2;
      const tail = start + (head - start) * Math.min(1, Math.max(0, sw - 0.15) / 0.85);
      const tf = Math.min(1, (t < REAPER.s2 ? REAPER.s1 + REAPER.s1d + 0.25 - t : REAPER.s2 + REAPER.s2d + 0.3 - t) / 0.25);
      if (head !== tail) {
        fx3Strip(fx3Take(h, 'strip'), _nkC, _nkX, _nkZ, tipR, 0.7, tail, head, NK.reap, 0.8 * tf, false);
        fx3Strip(fx3Take(h, 'strip'), _nkC, _nkX, _nkZ, tipR - 0.2, 0.25, tail + (head - tail) * 0.35, head, '#ffffff', 0.7 * tf, false);
      }
    }
  }
  // Seelen: aus jedem Gegner des zweiten Hiebs zum Sensenmann
  for (const s of e.souls) {
    const u = Math.min(1, (game.time - s.t) / 0.6);
    if (u >= 1) continue;
    const sx = s.x * U3;
    const sz = (s.y + 9) * U3;
    const tx = rx;
    const ty = fy;
    const tz = rz + 0.7;
    const w = easeIn3(u);
    const x = sx + (tx - sx) * w;
    const y = s.h + (ty - s.h) * w + Math.sin(Math.PI * u) * 1.2;
    const z = sz + (tz - sz) * w;
    nkGhost(h, x, y, z, 0.45, 1 - u * 0.4, 1, tx - sx, tz - sz);
  }
  // Zerfall: Asche und Rauch steigen auf
  if (gone > 0) {
    for (let j = 0; j < (low ? 5 : 10); j++) {
      const a = j * 0.628;
      n3Smoke(h, rx + Math.cos(a) * 0.7, 1 + gone * 3 + (j % 4) * 0.4, rz + Math.sin(a) * 0.5, 0.8 + gone, '#1a1424', 0.6 * (1 - gone));
    }
  }
};

// === 2D (einfache Darstellung, 3D hat die eigentliche Optik) =======================================
EXTRA_EFFECTS.siphon3 = (ctx, e) => {
  const f = e.follow;
  if (!f) return;
  const t = game.time - e.start;
  const a = bodyCenter(f);
  const tg = e.tgt && !e.tgt.dead ? bodyCenter(e.tgt) : { x: e.x2, y: e.y2 - 16 };
  ctx.save();
  ctx.lineCap = 'round';
  for (const [w, col] of [[6, NK.deep], [3, NK.blood], [1.2, NK.bright]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    for (let i = 1; i <= 14; i++) {
      const s = i / 14;
      const wob = Math.sin(s * 12 - t * 20) * 3 * Math.sin(Math.PI * s);
      ctx.lineTo(a.x + (tg.x - a.x) * s, a.y + (tg.y - a.y) * s + wob + Math.sin(Math.PI * s) * 6);
    }
    ctx.stroke();
  }
  ctx.fillStyle = NK.bright;
  for (let k = 0; k < 5; k++) {
    const u = 1 - ((t * 1.6 + k / 5) % 1);
    ctx.beginPath();
    ctx.arc(a.x + (tg.x - a.x) * u, a.y + (tg.y - a.y) * u + Math.sin(Math.PI * u) * 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};
EXTRA_EFFECTS.gflood3 = (ctx, e, k) => {
  const t = game.time - e.start;
  ctx.save();
  for (const g of e.ghosts) {
    if (t < g.at || t > g.at + 0.32) continue;
    const u = (t - g.at) / 0.32;
    const ox = e.owner ? e.owner.x : e.ox;
    const oy = e.owner ? e.owner.y - 60 : e.oy - 60;
    ctx.fillStyle = NK.ghostPale;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(ox + (g.x - ox) * u, oy + (g.y - 10 - oy) * u, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};
EXTRA_EFFECTS.lifetap3 = (ctx, e) => {
  const t = game.time - e.start;
  if (!e.owner || t < 0.15 || t > 0.55) return;
  const a = bodyCenter(e.owner);
  const u = (t - 0.15) / 0.4;
  const b = { x: e.x2, y: e.y2 - 16 };
  ctx.fillStyle = NK.blood;
  ctx.beginPath();
  ctx.arc(b.x + (a.x - b.x) * u, b.y + (a.y - b.y) * u - Math.sin(Math.PI * u) * 18, 6, 0, Math.PI * 2);
  ctx.fill();
};
EXTRA_EFFECTS.bone3 = (ctx, e) => {
  const t = game.time - e.start;
  if (t > e.fly) return;
  const u = t / e.fly;
  const x = e.x0 + (e.x1 - e.x0) * u;
  const y = e.y0 - 9 + (e.y1 - e.y0) * u - 20 - Math.sin(Math.PI * u) * 14;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 22);
  ctx.fillStyle = NK.bone;
  ctx.fillRect(-12, -2.5, 24, 5);
  for (const s of [-1, 1]) for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 12, d * 3, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};
EXTRA_EFFECTS.larva3 = (ctx, e) => {
  const t = game.time - e.start;
  const burst = e.hop + e.wr;
  if (t > burst) return;
  const u = Math.min(1, t / e.hop);
  const x = e.x0 + (e.x1 - e.x0) * u;
  const y = e.y0 - 9 + (e.y1 - e.y0) * u - Math.sin(Math.PI * u) * 60;
  const sw = t > e.hop ? 1 + 0.6 * (t - e.hop) / e.wr : 1;
  ctx.fillStyle = NK.blood;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(x - i * 5 * sw, y + Math.sin(t * 20 - i) * 2, (6 - i * 0.6) * sw, 0, Math.PI * 2);
    ctx.fill();
  }
};
EXTRA_EFFECTS.hand3 = (ctx, e) => {
  const t = game.time - e.start;
  const up = Math.min(1, t / e.grab) * (t > e.grab + e.hold + 0.25 ? Math.max(0, 1 - (t - e.grab - e.hold - 0.25) / 0.6) : 1);
  const curl = t > e.grab ? 1 : 0;
  ctx.save();
  ctx.strokeStyle = NK.bone;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const x = e.x + (i - 2) * 9;
    const yb = e.y - 9;
    ctx.beginPath();
    ctx.moveTo(x, yb);
    ctx.quadraticCurveTo(x, yb - 34 * up, e.x + (curl ? (i - 2) * 2 : (i - 2) * 12), yb - (curl ? 22 : 44) * up);
    ctx.stroke();
  }
  ctx.restore();
};
EXTRA_EFFECTS.lances3 = (ctx, e) => {
  if (!e.owner) return;
  const t = game.time - e.start;
  const a = bodyCenter(e.owner);
  ctx.save();
  ctx.strokeStyle = NK.blood;
  ctx.lineWidth = 4;
  e.pts.forEach((q, k) => {
    const launch = e.grow + k * 0.06;
    if (t < launch || t > launch + e.fly) return;
    const u = (t - launch) / e.fly;
    const x = a.x + (q.x - a.x) * u;
    const y = a.y + (q.y - 16 - a.y) * u;
    const L = Math.hypot(q.x - a.x, q.y - a.y) || 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - ((q.x - a.x) / L) * 20, y - ((q.y - a.y) / L) * 20);
    ctx.stroke();
  });
  ctx.restore();
};
EXTRA_EFFECTS.sensen3 = (ctx, e) => {
  const t = game.time - e.start;
  const own = e.owner;
  const x = own ? own.x : e.x;
  const y = (own ? own.y : e.y) - 90;
  const op = Math.min(1, t / REAPER.rise) * (1 - Math.max(0, (t - REAPER.gone) / (REAPER.dur - REAPER.gone)));
  ctx.save();
  ctx.globalAlpha = op * 0.9;
  ctx.fillStyle = NK.robe;
  ctx.beginPath();
  ctx.moveTo(x, y - 60);
  ctx.lineTo(x - 30, y + 40);
  ctx.lineTo(x + 30, y + 40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = NK.bone;
  ctx.beginPath();
  ctx.arc(x, y - 40, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};
