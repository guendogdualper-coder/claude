// Neue Magier-Zauber (seit 11.5): Feuer, Blitz und Erde umgebaut – weg von Bodenkreisen und Dreiecken, hin zu
// Zaubern, die man in 3D „sieht“: Flammenkegel, ein Feuerball mit Zauberzeit, Brand, ein Phönix, ein Blitzspeer,
// eine Gewitterwolke, Himmelsblitze hinter dem Blitzschritt, zwei kollidierende Felsen, Erdspitzen, ein Bergsturz
// und kreisende Felsen statt des Schwerkraftsiegels.
// Ablauf je Zauber: SKILL_TYPES.<typ> (eigener Spieler: Treffer + Bild, Rückgabe = Eckdaten fürs Netz),
// MAGE2_REMOTE.<typ> (Mitspieler: nur Bild), FX3_DRAW (3D) und EXTRA_EFFECTS (2D).

const MAGE2_REMOTE = {};
const n2h = (i, s = 0) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const dirOf = (fx, fy) => {
  const l = Math.hypot(fx, fy) || 1;
  return { x: fx / l, y: fy / l };
};
// Ziel oder Punkt vor der Figur (bis range)
function mage2Point(p, sk, front = 0.6) {
  const t = pickTarget(sk.range);
  if (t) {
    faceTowards(t.x, t.y);
    return { x: t.x, y: t.y, t };
  }
  return { x: p.x + p.facing.x * sk.range * front, y: p.y + p.facing.y * sk.range * front, t: null };
}
function liftOf(m, h) {
  if (h && canLift(m)) m.lift = { start: game.time, dur: 0.45, h };
}

// --- Feuer: Drachenodem (Kegel) ----------------------------------------------------------------------
SKILL_TYPES.mbreath = function (sk, pw, lvl) {
  const p = game.player;
  const t = pickTarget(sk.range + 20);
  if (t) faceTowards(t.x, t.y);
  lockPlayer(p, 0.35);
  input.walkTo = null;
  const ang = Math.atan2(p.facing.y, p.facing.x);
  breathFx(p, p.x, p.y, ang, sk, true, pw);
  return { a: +ang.toFixed(3), x: Math.round(p.x), y: Math.round(p.y) };
};
function breathFx(owner, x, y, ang, sk, local, pw) {
  addEffect({ type: 'mbreath3', owner, x, y: y + 9, ang, range: sk.range, angle: sk.angle, dur: 0.75 });
  if (owner === game.player) shakeScreen(2);
  if (!local) return;
  const half = (sk.angle * Math.PI) / 360;
  later(0.1, () => {
    for (const m of enemiesInCircle(x, y, sk.range + 10)) {
      const a = Math.atan2(m.y - y, m.x - x);
      let d = Math.abs(a - ang);
      if (d > Math.PI) d = Math.PI * 2 - d;
      if (d > half + 0.12) continue;
      hitMonster(m, sk.dmg * pw, { skill: sk.id, burn: sk.burn, knockback: sk.knockback, from: { x, y }, heavy: true, vfxColor: '#ff8a4a' });
    }
  });
}
MAGE2_REMOTE.mbreath = (rp, sk, d) => breathFx(rp, d.x ?? rp.x, d.y ?? rp.y, d.a ?? Math.atan2(d.fy, d.fx), sk, false, 0);

// --- Feuer: Feuerball mit Zauberzeit -----------------------------------------------------------------
SKILL_TYPES.mcast = function (sk, pw, lvl) {
  const p = game.player;
  if (p.mcast) return false;
  const t = pickTarget(sk.range);
  if (t) faceTowards(t.x, t.y);
  input.walkTo = null;
  clearAttack();
  const dur = sk.castTime;
  p.mcast = { sk, i: classSkills(p).indexOf(sk), t0: game.time, dur, target: t, pw, lvl, mana: skillMana(sk, p) };
  p.mcast.fx = addEffect({ type: 'mcast3', follow: p, ox: 0, oy: 0, owner: p, el: sk.el, dur: dur + 0.05 });
  p.mcast.bar = addEffect({ type: 'mcastbar', follow: p, ox: 0, oy: 26, name: sk.name, dur });
  return { cast: 1, d: dur };
};
// Abbruch: Bewegen, anderer Zauber, Tod – Mana und Abklingzeit zurück
function mageCastCancel(p, why) {
  const c = p.mcast;
  if (!c) return;
  p.mcast = null;
  p.mp = Math.min(game.stats.maxMp, p.mp + c.mana);
  if (c.i >= 0) p.skillCd[c.i] = 0;
  for (const e of [c.fx, c.bar]) if (e) e.dur = Math.max(0, game.time - e.start);
  if (p.swingKind === 'zauber') p.swing = 0;
  if (why) addText(p.x, p.y - 40, why, 'info');
  netSkillFx(c.sk.id, 160, { cx: 1 });
}
// jedes Bild (spiel.js): abbrechen oder nach der Zauberzeit loslassen
function mageCastTick() {
  const p = game.player;
  const c = p && p.mcast;
  if (!c) return;
  const mv = moveVector();
  if (p.dead || mv.x || mv.y || input.walkTo || p.channel) {
    mageCastCancel(p, p.dead ? '' : 'Abgebrochen');
    return;
  }
  if (game.time - c.t0 < c.dur) return;
  p.mcast = null;
  const sk = c.sk;
  const t = c.target && !c.target.dead && dist(p, c.target) <= sk.range + 40 ? c.target : pickTarget(sk.range);
  if (t) faceTowards(t.x, t.y);
  startSwing(p, 'stoss', 0.35);
  const tx = t ? t.x : p.x + p.facing.x * sk.range;
  const ty = t ? t.y : p.y + p.facing.y * sk.range;
  later(0.1, () => {
    if (p.dead) return;
    spawnProjectile({ ...mageBolt(p, sk, t && !t.dead ? t : null, c.pw, c.lvl, true), big: sk.big, radius: 16 });
  });
  addEffect({ type: 'sparks3', x: p.x + p.facing.x * 14, y: feetY(p), h: 1, count: 14, color: '#ffb04a', speed: 2.6, up: 1, dur: 0.5 });
  shakeScreen(4);
  if (typeof snd !== 'undefined') snd.skill(sk, p);
  netSkillFx(sk.id, 160, { rel: 1, tx: Math.round(tx), ty: Math.round(ty) });
}
MAGE2_REMOTE.mcast = (rp, sk, d) => {
  if (d.cx) {
    if (rp.mcastFx) rp.mcastFx.dur = Math.max(0, game.time - rp.mcastFx.start);
    rp.mcastFx = null;
    return;
  }
  if (d.rel) {
    if (rp.mcastFx) rp.mcastFx.dur = Math.max(0, game.time - rp.mcastFx.start);
    rp.mcastFx = null;
    spawnProjectile({ ...mageBolt(rp, sk, null, 0, 1, false), big: sk.big, radius: 16, dir: null, aimAt: { x: d.tx, y: d.ty }, range: Math.hypot(d.tx - rp.x, d.ty - rp.y) + 60 });
    return;
  }
  rp.mcastFx = addEffect({ type: 'mcast3', follow: rp, ox: 0, oy: 0, owner: rp, el: sk.el, dur: (d.d || sk.castTime) + 0.3 });
};

// --- Feuer: Brand (Feuerschaden über Zeit) ----------------------------------------------------------
SKILL_TYPES.mignite = function (sk, pw, lvl) {
  const p = game.player;
  const t = pickTarget(sk.range);
  if (!t) {
    addText(p.x, p.y - 34, 'Kein Ziel', 'info');
    return false;
  }
  faceTowards(t.x, t.y);
  lockPlayer(p, 0.2);
  igniteFx(p, t, sk);
  later(0.22, () => {
    if (t.dead) return;
    hitMonster(t, sk.dmg * pw, { skill: sk.id, burn: { dps: sk.burn.dps * pw, duration: sk.burn.duration }, vfxColor: '#ff8a4a' });
  });
  return { tx: Math.round(t.x), ty: Math.round(t.y) };
};
function igniteFx(owner, m, sk) {
  addEffect({ type: 'mignite3', follow: m, ox: 0, oy: 0, x0: owner.x, y0: owner.y, dur: sk.burn.duration + 0.25, fly: 0.22 });
}
MAGE2_REMOTE.mignite = (rp, sk, d) => {
  let best = null;
  let bd = 60;
  for (const m of game.monsters) {
    if (m.dead) continue;
    const dd = Math.hypot(m.x - d.tx, m.y - d.ty);
    if (dd < bd) { bd = dd; best = m; }
  }
  if (best) igniteFx(rp, best, sk);
};

// --- Feuer: Phönixflamme (Burst) --------------------------------------------------------------------
SKILL_TYPES.mphoenix = function (sk, pw, lvl) {
  const p = game.player;
  const pt = mage2Point(p, sk, 1);
  lockPlayer(p, 0.3);
  input.walkTo = null;
  phoenixFx(p, p.x, p.y, pt.x, pt.y, sk, true, pw, pt.t);
  return { x: Math.round(p.x), y: Math.round(p.y), tx: Math.round(pt.x), ty: Math.round(pt.y) };
};
function phoenixFx(owner, x0, y0, x1, y1, sk, local, pw, target) {
  const len = Math.max(40, Math.hypot(x1 - x0, y1 - y0));
  const fly = len / sk.speed;
  addEffect({ type: 'mphoenix3', x: (x0 + x1) / 2, y: (y0 + y1) / 2 + 9, x0, y0: y0 + 9, x1, y1: y1 + 9, fly, dur: fly + 0.9 });
  later(fly, () => {
    addEffect({ type: 'mburst3', x: x1, y: y1 + 9, R: sk.blast.r, dur: 1.1 });
    addEffect({ type: 'decal', kind: 'scorch', x: x1, y: y1 + 9, r: sk.blast.r * 0.55, dur: 3, color: '#2a0a0a' });
    if (owner === game.player) shakeScreen(7);
  });
  if (!local) return;
  // auf dem Weg: wer nah an der Bahn steht, brennt mit (je Gegner einmal)
  const vx = x1 - x0;
  const vy = y1 - y0;
  const L2 = vx * vx + vy * vy || 1;
  const hitSet = new Set();
  for (const m of aliveEnemies()) {
    const u = clamp01(((m.x - x0) * vx + (m.y - y0) * vy) / L2);
    if (u >= 0.95 || Math.hypot(x0 + vx * u - m.x, y0 + vy * u - m.y) > sk.pathR + m.r) continue;
    hitSet.add(m);
    later(fly * u, () => { if (!m.dead) hitMonster(m, sk.dmg * sk.pathMul * pw, { skill: sk.id, burn: sk.burn, vfxColor: '#ffb04a' }); });
  }
  later(fly, () => {
    const main = target && !target.dead ? target : null;
    for (const m of enemiesInCircle(x1, y1, sk.blast.r)) {
      const burning = m.burn && m.burn.until > game.time;
      const mul = (m === main ? 1 : sk.blast.mul) * (burning ? 1 + sk.combust : 1);
      hitMonster(m, sk.dmg * mul * pw, { skill: sk.id, burn: sk.burn, heavy: true, knockback: 30, from: { x: x1, y: y1 }, vfxColor: burning ? '#ffffff' : '#ffb04a' });
      if (burning) addEffect({ type: 'column3', x: m.x, y: feetY(m), r: 16, hgt: 1.8, color: '#ff6a1a', core: '#fff1c8', dur: 0.45 });
    }
  });
}
MAGE2_REMOTE.mphoenix = (rp, sk, d) => phoenixFx(rp, d.x ?? rp.x, d.y ?? rp.y, d.tx, d.ty, sk, false, 0, null);

// --- Blitz: Blitzspeer (Linie) -----------------------------------------------------------------------
SKILL_TYPES.mspear = function (sk, pw, lvl) {
  const p = game.player;
  const t = pickTarget(sk.range);
  if (t) faceTowards(t.x, t.y);
  lockPlayer(p, 0.2);
  input.walkTo = null;
  const dir = dirOf(p.facing.x, p.facing.y);
  const len = Math.max(40, wallFreeLength(p.x, p.y, dir, sk.range));
  const b = { x: p.x + dir.x * len, y: p.y + dir.y * len };
  spearFx(p, p.x, p.y, b.x, b.y, sk, true, pw);
  return { x: Math.round(p.x), y: Math.round(p.y), tx: Math.round(b.x), ty: Math.round(b.y) };
};
// Strecke bis zum Kartenrand (wie Geschosse fliegt der Speer über Stümpfe, Felsen und Wasser hinweg)
function wallFreeLength(x, y, dir, want) {
  let len = 0;
  for (let s = 8; s <= want; s += 8) {
    const tx = Math.floor((x + dir.x * s) / TILE);
    const ty = Math.floor((y + dir.y * s) / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) break;
    len = s;
  }
  return len;
}
function spearFx(owner, x0, y0, x1, y1, sk, local, pw) {
  const fly = 0.16;
  addEffect({ type: 'mspear3', x: (x0 + x1) / 2, y: (y0 + y1) / 2 + 9, x0, y0: y0 + 9, x1, y1: y1 + 9, fly, dur: 0.7 });
  later(fly, () => addEffect({ type: 'sparks3', x: x1, y: y1 + 9, h: 0.6, count: 10, color: '#fff7b0', speed: 2.6, up: 1, dur: 0.45 }));
  if (!local) return;
  const vx = x1 - x0;
  const vy = y1 - y0;
  const L2 = vx * vx + vy * vy || 1;
  for (const m of aliveEnemies()) {
    const u = clamp01(((m.x - x0) * vx + (m.y - y0) * vy) / L2);
    if (Math.hypot(x0 + vx * u - m.x, y0 + vy * u - m.y) > sk.width + m.r) continue;
    later(fly * u, () => {
      if (m.dead) return;
      hitMonster(m, sk.dmg * pw, { skill: sk.id, stun: sk.stun, heavy: true, vfxColor: '#ffffff' });
      if (!m.duelProxy) m.charged = game.time + sk.charge;
      addEffect({ type: 'sparks3', x: m.x, y: feetY(m), h: 0.8, count: 6, color: '#fff7b0', speed: 2.2, up: 1, dur: 0.35 });
    });
  }
}
MAGE2_REMOTE.mspear = (rp, sk, d) => spearFx(rp, d.x ?? rp.x, d.y ?? rp.y, d.tx, d.ty, sk, false, 0);

// --- Blitz: Gewitterwolke (Fläche aus der Ferne) -------------------------------------------------------
SKILL_TYPES.mstorm = function (sk, pw, lvl) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.3);
  input.walkTo = null;
  stormFx(p, pt.x, pt.y, sk, true, pw);
  return { tx: Math.round(pt.x), ty: Math.round(pt.y) };
};
function stormFx(owner, x, y, sk, local, pw) {
  const total = sk.form + sk.strikes * sk.every + 0.5;
  addEffect({ type: 'mstorm3', x, y: y + 9, R: sk.radius, form: sk.form, dur: total + 0.8 });
  const near = owner === game.player;
  for (let k = 0; k < sk.strikes; k++) {
    later(sk.form + k * sk.every, () => {
      // aufgeladene und nahe Gegner zuerst, sonst irgendwo in der Wolke
      let tx = x + (Math.random() - 0.5) * sk.radius * 1.2;
      let ty = y + (Math.random() - 0.5) * sk.radius * 0.9;
      let m = null;
      if (local) {
        const list = enemiesInCircle(x, y, sk.radius).filter((o) => !o.dead);
        if (list.length) {
          list.sort((a, b) => (b.charged > game.time) - (a.charged > game.time) || (a.stormHit || 0) - (b.stormHit || 0));
          m = list[0];
          m.stormHit = (m.stormHit || 0) + 1;
          tx = m.x;
          ty = m.y;
        }
      }
      addEffect({ type: 'mstrike3', x: tx, y: ty + 9, dur: 0.5, s: 1 });
      if (near) shakeScreen(2);
      if (m) {
        hitMonster(m, sk.dmg * pw, { skill: sk.id, stun: 0.2, heavy: true, vfxColor: '#ffffff' });
        for (const o of enemiesInCircle(tx, ty, 40)) if (o !== m) hitMonster(o, sk.dmg * 0.4 * pw, { skill: sk.id, vfxColor: '#fff7b0' });
      }
    });
  }
  later(sk.form + sk.strikes * sk.every + 0.1, () => {
    addEffect({ type: 'mstrike3', x, y: y + 9, dur: 0.7, s: 2.2 });
    addEffect({ type: 'ring', x, y: y + 9, r: sk.final.r, dur: 0.45, color: '#fff7b0', width: 8, grow: true });
    if (near) shakeScreen(6);
    if (!local) return;
    for (const m of enemiesInCircle(x, y, sk.final.r)) {
      m.stormHit = 0;
      hitMonster(m, sk.final.dmg * pw, { skill: sk.id, stun: sk.final.stun, heavy: true, vfxColor: '#ffffff' });
    }
  });
}
MAGE2_REMOTE.mstorm = (rp, sk, d) => stormFx(rp, d.tx, d.ty, sk, false, 0);

// Blitzschritt (seit 11.5): Himmelsblitze schlagen hinter dir auf deinem Weg ein (von shiftFx aufgerufen)
function blitzTrail(owner, a, b, sk, local, pw) {
  const T = sk.trail;
  const hits = new Map();
  for (let k = 1; k <= T.n; k++) {
    later(0.12 + k * T.every, () => {
      const u = k / (T.n + 1);
      const x = a.x + (b.x - a.x) * u + (Math.random() - 0.5) * 16;
      const y = a.y + (b.y - a.y) * u + (Math.random() - 0.5) * 10;
      addEffect({ type: 'mstrike3', x, y: y + 9, dur: 0.45, s: 0.9 });
      if (owner === game.player) shakeScreen(1.5);
      if (!local || owner.dead) return;
      for (const m of enemiesInCircle(x, y, T.r)) {
        const n = hits.get(m) || 0;
        if (n >= 2) continue;
        hits.set(m, n + 1);
        hitMonster(m, T.dmg * pw, { skill: sk.id, stun: 0.15, vfxColor: '#ffffff' });
      }
    });
  }
}

// --- Erde: Steinschlag (zwei Felsen prallen zusammen) ------------------------------------------------
SKILL_TYPES.mclash = function (sk, pw, lvl) {
  const p = game.player;
  const pt = mage2Point(p, sk, 0.6);
  lockPlayer(p, 0.25);
  input.walkTo = null;
  clashFx(p, pt.x, pt.y, sk, true, pw);
  return { tx: Math.round(pt.x), ty: Math.round(pt.y) };
};
function clashFx(owner, x, y, sk, local, pw) {
  const fly = 0.42;
  // quer zur Blickrichtung des Werfers: von links und rechts
  const d = dirOf(x - owner.x, y - owner.y);
  const off = 150;
  addEffect({ type: 'mclash3', x, y: y + 9, ax: x - d.y * off, ay: y + d.x * off + 9, bx: x + d.y * off, by: y - d.x * off + 9, fly, dur: fly + 1 });
  later(fly, () => {
    addEffect({ type: 'mdebris3', x, y: y + 9, n: 8, size: 0.1, dur: 0.9 });
    addEffect({ type: 'smoke3', x, y: y + 9, count: 5, color: '#6a5a50', size: 0.8, dur: 0.8 });
    addEffect({ type: 'decal', kind: 'crack', x, y: y + 9, r: sk.radius * 0.5, dur: 2.5, color: '#1a1210' });
    if (owner === game.player) shakeScreen(5);
    if (!local) return;
    for (const m of enemiesInCircle(x, y, sk.radius)) {
      liftOf(m, sk.lift);
      hitMonster(m, sk.dmg * pw, { skill: sk.id, stun: sk.stun, heavy: true, duelMul: sk.duelMul, vfxColor: '#f0a830' });
    }
  });
}
MAGE2_REMOTE.mclash = (rp, sk, d) => clashFx(rp, d.tx, d.ty, sk, false, 0);

// --- Erde: Erdspitzen (Dornen aus dem Boden) -----------------------------------------------------------
SKILL_TYPES.mspikes = function (sk, pw, lvl) {
  const p = game.player;
  const pt = mage2Point(p, sk, 0.45);
  lockPlayer(p, 0.3);
  input.walkTo = null;
  spikesFx(p, pt.x, pt.y, sk, true, pw);
  return { tx: Math.round(pt.x), ty: Math.round(pt.y) };
};
function spikesFx(owner, x, y, sk, local, pw) {
  addEffect({ type: 'mspikes3', x, y: y + 9, R: sk.radius, seed: Math.random() * 100, dur: 1.5 });
  addEffect({ type: 'decal', kind: 'crack', x, y: y + 9, r: sk.radius * 0.8, dur: 2.6, color: '#1a1210' });
  for (const [t, part] of [[0.08, 'out'], [0.3, 'in']]) {
    later(t, () => {
      if (owner === game.player) shakeScreen(3);
      if (!local) return;
      for (const m of enemiesInCircle(x, y, sk.radius)) {
        const r = Math.hypot(m.x - x, m.y - y);
        if ((part === 'out') !== (r > sk.radius * 0.45)) continue;
        liftOf(m, sk.lift);
        hitMonster(m, sk.dmg * pw, { skill: sk.id, stun: sk.stun, heavy: true, duelMul: sk.duelMul, vfxColor: '#f0a830' });
      }
    });
  }
}
MAGE2_REMOTE.mspikes = (rp, sk, d) => spikesFx(rp, d.tx, d.ty, sk, false, 0);

// --- Erde: Bergsturz (Fels vom Himmel) -----------------------------------------------------------------
SKILL_TYPES.mmeteor = function (sk, pw, lvl) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.3);
  input.walkTo = null;
  meteorFx(p, pt.x, pt.y, sk, true, pw);
  return { tx: Math.round(pt.x), ty: Math.round(pt.y) };
};
function meteorFx(owner, x, y, sk, local, pw) {
  addEffect({ type: 'mmeteor3', x, y: y + 9, R: sk.radius, fall: sk.fall, dur: sk.fall + 1.4 });
  addEffect({ type: 'warn', x, y: y + 9, r: sk.radius, dur: sk.fall, color: '#f0a830' });
  later(sk.fall, () => {
    addEffect({ type: 'mdebris3', x, y: y + 9, n: 12, size: 0.13, dur: 1.1 });
    addEffect({ type: 'smoke3', x, y: y + 9, count: 9, color: '#5a4a40', size: 1.1, dur: 1.2 });
    addEffect({ type: 'decal', kind: 'crack', x, y: y + 9, r: sk.radius * 0.9, dur: 3.5, color: '#120c08' });
    if (owner === game.player) shakeScreen(11);
    if (!local) return;
    for (const m of enemiesInCircle(x, y, sk.radius)) {
      liftOf(m, 20);
      hitMonster(m, sk.dmg * pw, { skill: sk.id, stun: sk.stun, knockback: sk.knockback, from: { x, y }, heavy: true, duelMul: sk.duelMul, vfxColor: '#f0a830' });
    }
  });
}
MAGE2_REMOTE.mmeteor = (rp, sk, d) => meteorFx(rp, d.tx, d.ty, sk, false, 0);

// --- Erde: Schwerkraft ohne Bodensiegel (kreisende Felsen) -----------------------------------------------
SKILL_TYPES.mgrav = function (sk, pw, lvl) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.3);
  input.walkTo = null;
  gravFx(p, pt.x, pt.y, sk, true, pw);
  return { tx: Math.round(pt.x), ty: Math.round(pt.y) };
};
function gravFx(owner, x, y, sk, local, pw) {
  const end = sk.delay + sk.ticks * sk.every;
  addEffect({ type: 'mgrav3', x, y: y + 9, R: sk.radius, rocks: sk.rocks || 8, delay: sk.delay, end, dur: end + 0.9 });
  for (let k = 1; k <= sk.ticks; k++) {
    later(sk.delay + (k - 1) * sk.every, () => {
      if (!local) return;
      for (const m of enemiesInCircle(x, y, sk.radius)) {
        // Sog zur Mitte
        if (!m.isStone && !(m.type && m.type.boss)) {
          const d = Math.hypot(m.x - x, m.y - y) || 1;
          const k2 = Math.min(1, sk.pull / d);
          m.kx = (x - m.x) * k2 * 3;
          m.ky = (y - m.y) * k2 * 3;
        }
        hitMonster(m, sk.dmg * pw, { skill: sk.id, duelMul: sk.duelMul, vfxColor: '#f0a830' });
      }
    });
  }
  later(end, () => {
    addEffect({ type: 'mdebris3', x, y: y + 9, n: 10, size: 0.11, dur: 1 });
    addEffect({ type: 'smoke3', x, y: y + 9, count: 6, color: '#5a4a40', size: 0.9, dur: 0.9 });
    if (owner === game.player) shakeScreen(8);
    if (!local) return;
    for (const m of enemiesInCircle(x, y, sk.radius)) {
      liftOf(m, sk.last.lift);
      hitMonster(m, sk.last.dmg * pw, { skill: sk.id, stun: sk.last.stun, heavy: true, duelMul: sk.duelMul, vfxColor: '#f0a830' });
    }
  });
}
MAGE2_REMOTE.mgrav = (rp, sk, d) => gravFx(rp, d.tx, d.ty, sk, false, 0);

// --- 2D: einfache Darstellung (3D hat die eigentliche Optik) ------------------------------------------
EXTRA_EFFECTS.mcastbar = (ctx, e, k, x, y) => {
  const w = 74;
  const h = 9;
  ctx.save();
  ctx.fillStyle = 'rgba(20,10,6,0.85)';
  ctx.strokeStyle = '#f0c870';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 4);
  ctx.fill();
  ctx.stroke();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#a0102e');
  g.addColorStop(0.6, '#ff6a1a');
  g.addColorStop(1, '#fff1c8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x - w / 2 + 1.5, y - h / 2 + 1.5, (w - 3) * Math.min(1, k), h - 3, 3);
  ctx.fill();
  ctx.font = '700 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  const left = Math.max(0, e.dur - (game.time - e.start)).toFixed(1).replace('.', ',');
  ctx.strokeText(`${e.name} ${left} s`, x, y + 16);
  ctx.fillStyle = '#fff1c8';
  ctx.fillText(`${e.name} ${left} s`, x, y + 16);
  ctx.restore();
};
const glow2 = (ctx, x, y, r, c, a) => { if (typeof glow === 'function') glow(ctx, x, y, r, c, a); };
EXTRA_EFFECTS.mbreath3 = (ctx, e, k, x, y) => {
  const half = (e.angle * Math.PI) / 360;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const a = e.ang + (n2h(i, 1) - 0.5) * 2 * half;
    const d = e.range * Math.min(1, k * 1.6) * (0.35 + 0.65 * n2h(i, 2));
    glow2(ctx, x + Math.cos(a) * d, y - 14 + Math.sin(a) * d * 0.8, 12 + 10 * k, i % 3 ? '#ff6a1a' : '#fff1c8', 0.6 * (1 - k));
  }
  ctx.restore();
};
EXTRA_EFFECTS.mcast3 = (ctx, e, k, x, y) => glow2(ctx, x + 10, y - 30, 8 + 14 * k, '#ff8a2a', 0.8);
EXTRA_EFFECTS.mburst3 = (ctx, e, k, x, y) => glow2(ctx, x, y - 10, e.R * (0.4 + 0.8 * k), k < 0.3 ? '#fff1c8' : '#ff5a1a', 0.8 * (1 - k));
EXTRA_EFFECTS.mignite3 = (ctx, e, k, x, y) => glow2(ctx, x, y - 16, 14, '#ff6a1a', 0.5 + 0.3 * Math.sin(game.time * 20));
EXTRA_EFFECTS.mphoenix3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const u = Math.min(1, t / e.fly);
  if (u >= 1) return;
  glow2(ctx, x + (e.x0 + (e.x1 - e.x0) * u - e.x), y + (e.y0 + (e.y1 - e.y0) * u - e.y) - 30, 26, '#ffb04a', 0.9);
};
EXTRA_EFFECTS.mspear3 = (ctx, e, k, x, y) => {
  ctx.save();
  ctx.strokeStyle = '#fff7b0';
  ctx.globalAlpha = 1 - k;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + e.x0 - e.x, y + e.y0 - e.y - 16);
  ctx.lineTo(x + e.x1 - e.x, y + e.y1 - e.y - 16);
  ctx.stroke();
  ctx.restore();
};
EXTRA_EFFECTS.mstorm3 = (ctx, e, k, x, y) => glow2(ctx, x, y - 80, e.R * 0.8, '#2a2440', 0.5 * (1 - k));
EXTRA_EFFECTS.mstrike3 = (ctx, e, k, x, y) => {
  if (k > 0.5) return;
  ctx.save();
  ctx.strokeStyle = '#fffbe0';
  ctx.lineWidth = 3 * (e.s || 1);
  ctx.beginPath();
  ctx.moveTo(x, y - 160);
  for (let i = 1; i <= 6; i++) ctx.lineTo(x + (Math.random() - 0.5) * 18, y - 160 + i * 26.6);
  ctx.stroke();
  ctx.restore();
  glow2(ctx, x, y, 22 * (e.s || 1), '#fff7b0', 0.8 * (1 - k * 2));
};
const rock2 = (ctx, x, y, r) => {
  ctx.fillStyle = '#4a3e3a';
  ctx.strokeStyle = '#f0a830';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const rr = r * (0.8 + 0.2 * n2h(i, r));
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};
EXTRA_EFFECTS.mclash3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const u = Math.min(1, t / e.fly);
  if (u >= 1) return;
  rock2(ctx, x + (e.ax - e.x) * (1 - u), y + (e.ay - e.y) * (1 - u) - 30, 13);
  rock2(ctx, x + (e.bx - e.x) * (1 - u), y + (e.by - e.y) * (1 - u) - 30, 13);
};
EXTRA_EFFECTS.mspikes3 = (ctx, e, k, x, y) => {
  ctx.save();
  ctx.fillStyle = '#3e3532';
  ctx.strokeStyle = '#f0a830';
  for (let i = 0; i < 12; i++) {
    const a = n2h(i, e.seed) * Math.PI * 2;
    const r = e.R * (i < 7 ? 0.6 + 0.35 * n2h(i, 3) : 0.35 * n2h(i, 4));
    const up = Math.max(0, Math.min(1, (k - (i < 7 ? 0.03 : 0.2)) * 6)) * (1 - Math.max(0, k - 0.75) * 4);
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r * 0.8;
    ctx.beginPath();
    ctx.moveTo(px - 5, py);
    ctx.lineTo(px, py - 30 * up);
    ctx.lineTo(px + 5, py);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
};
EXTRA_EFFECTS.mmeteor3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  if (t >= e.fall) return;
  const u = t / e.fall;
  rock2(ctx, x + 60 * (1 - u), y - 260 * (1 - u) - 20, 26);
};
EXTRA_EFFECTS.mgrav3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  if (t > e.end) return;
  const s = 1 - 0.6 * Math.min(1, t / e.end);
  for (let i = 0; i < e.rocks; i++) {
    const a = (i / e.rocks) * Math.PI * 2 + t * 3;
    rock2(ctx, x + Math.cos(a) * e.R * 0.8 * s, y + Math.sin(a) * e.R * 0.5 * s - 24, 9);
  }
};

// --- 3D -----------------------------------------------------------------------------------------------
['mbreath3', 'mcast3', 'mburst3', 'mignite3', 'mphoenix3', 'mspear3', 'mstorm3', 'mstrike3', 'mclash3', 'mspikes3', 'mmeteor3', 'mgrav3'].forEach((k) => FX3_TYPES.add(k));
const _n3a = new THREE.Vector3();
const _n3b = new THREE.Vector3();
const _n3c = new THREE.Vector3();
const _n3d = new THREE.Vector3();
const _n3up = new THREE.Vector3(0, 1, 0);
const n3low = () => typeof opts !== 'undefined' && opts.graphics === 'niedrig';
const FIRE3 = { core: '#fff6d8', hot: '#ffd36a', main: '#ff6a1a', deep: '#c81a0a', dark: '#3a0a06' };

// Flamme (aufrecht zur Kamera gedrehtes Flammenbild). normal: deckend gemischt – bleibt auf hellem Gras farbig
// statt weiß zu überstrahlen; darüber kommt nur ein kleiner leuchtender Kern
function n3Flame(h, x, y, z, w, hh, color, op, rot = 0, normal = false) {
  if (normal) {
    const o = mTake(h, 'n2FlameN', 'flame', true);
    o.position.set(x, y, z);
    o.scale.set(w, hh, 1);
    o.material.rotation = rot;
    fx3Color(o, color, op);
    return o;
  }
  const o = fx3MageSprite(h, 'spriteFlame', 'flame', x, y, z, w, hh, color, op);
  o.material.rotation = rot;
  return o;
}
// Flamme aus zwei Schichten: deckender Körper und heller Kern
function n3Fire(h, x, y, z, w, hh, body, op, rot = 0) {
  n3Flame(h, x, y, z, w, hh, body, op, rot, true);
  n3Flame(h, x, y - hh * 0.08, z, w * 0.5, hh * 0.55, FIRE3.hot, op * 0.8, rot);
}
function n3Glow(h, x, y, z, s, color, op) {
  return fx3MageSprite(h, 'sprite', 'disc', x, y, z, s, s, color, op);
}
function n3Smoke(h, x, y, z, s, color, op) {
  const o = fx3Take(h, 'smoke');
  o.position.set(x, y, z);
  o.scale.set(s, s, 1);
  o.material.color.set(color);
  o.material.opacity = Math.max(0, Math.min(1, op));
  return o;
}
// gezackter Blitz zwischen a und b (jedes Bild neu verzweigt): farbiger Mantel, weißer Kern
function n3Bolt(h, a, b, w, color, op, segs = 8, jit = 0.25) {
  let px = a.x;
  let py = a.y;
  let pz = a.z;
  for (let i = 1; i <= segs; i++) {
    const u = i / segs;
    const j = i === segs ? 0 : jit;
    const nx = a.x + (b.x - a.x) * u + (Math.random() - 0.5) * j;
    const ny = a.y + (b.y - a.y) * u + (Math.random() - 0.5) * j * 0.6;
    const nz = a.z + (b.z - a.z) * u + (Math.random() - 0.5) * j;
    _n3c.set(px, py, pz);
    _n3d.set(nx, ny, nz);
    const o = fx3Take(h, 'seg');
    fx3Segment(o, _n3c, _n3d, w);
    fx3Color(o, color, op);
    const c = fx3Take(h, 'seg');
    fx3Segment(c, _n3c, _n3d, w * 0.35);
    fx3Color(c, '#ffffff', op);
    px = nx;
    py = ny;
    pz = nz;
  }
}
// Basaltfelsen mit glühenden Bernsteinadern
function n3Boulder(h, x, y, z, s, rot, glowK = 1) {
  const r = fx3Rock(h, 'rock', x, y, z, s, s * 0.85, s * 0.95, '#8a7560');
  r.rotation.set(rot, rot * 1.3, rot * 0.7);
  if (n3low()) return r;
  for (let i = 0; i < 3; i++) {
    const a = rot * 2 + i * 2.1;
    n3Glow(h, x + Math.cos(a) * s * 0.75, y + Math.sin(a * 1.3) * s * 0.5, z + Math.sin(a) * s * 0.75, s * 0.7, '#f0a830', 0.55 * glowK);
  }
  return r;
}

// Drachenodem: Flammenstrahlen im Kegel, die nach außen wachsen und zu Rauch werden
FX3_DRAW.mbreath3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const ow = e.owner;
  const ox = ((ow && !ow.gone ? ow.x : e.x) + Math.cos(e.ang) * 10) * U3;
  const oz = ((ow && !ow.gone ? feetY(ow) : e.y) + Math.sin(e.ang) * 10) * U3;
  const half = (e.angle * Math.PI) / 360;
  const R = e.range * U3;
  const n = low ? 18 : 40;
  for (let i = 0; i < n; i++) {
    const born = n2h(i, 7) * 0.4;
    const age = t - born;
    if (age < 0 || age > 0.5) continue;
    const u = age / 0.5;
    const a = e.ang + (n2h(i, 1) - 0.5) * 2 * half * (0.4 + 0.6 * u);
    const d = R * (0.08 + 0.95 * Math.pow(u, 0.7)) * (0.75 + 0.25 * n2h(i, 2));
    const x = ox + Math.cos(a) * d;
    const z = oz + Math.sin(a) * d;
    const y = 0.75 - 0.35 * u + n2h(i, 3) * 0.3;
    const s = 0.35 + 1.3 * u;
    if (u < 0.75) {
      const col = u < 0.3 ? '#ff9a2a' : u < 0.55 ? FIRE3.main : FIRE3.deep;
      if (i % 3) n3Fire(h, x, y, z, s * 0.9, s * 1.3, col, 0.95 * (1 - u * 0.5), (n2h(i, 4) - 0.5) * 0.8);
      else n3Flame(h, x, y, z, s * 0.9, s * 1.3, col, 0.95 * (1 - u * 0.5), (n2h(i, 4) - 0.5) * 0.8, true);
    } else {
      n3Smoke(h, x, y + 0.3, z, s, '#2a1410', 0.5 * (1 - u));
    }
  }
  // Glut am Mund der Flamme und Hitzeschein
  const fade = Math.max(0, 1 - t / 0.55);
  n3Glow(h, ox, 0.8, oz, 0.7 * fade, FIRE3.hot, 0.6 * fade);
  for (let i = 0; i < (low ? 4 : 10); i++) {
    const u = ((t * 1.4 + n2h(i, 9)) % 1);
    const a = e.ang + (n2h(i, 8) - 0.5) * 2 * half;
    n3Glow(h, ox + Math.cos(a) * R * u, 0.4 + u * 1.4, oz + Math.sin(a) * R * u, 0.12, '#ffd8a0', (1 - u) * fade);
  }
};

// Feuerball beim Zaubern: wächst zwischen den Händen, Funken strömen spiralförmig hinein, Hitzeringe
FX3_DRAW.mcast3 = function (h, e) {
  const p = e.owner;
  if (!p || p.dead || p.gone) return;
  const t = game.time - e.start;
  const k = Math.min(1, t / Math.max(0.1, e.dur - 0.05));
  const low = n3low();
  mageHand3(p, _n3a, 1.55);
  const s = 0.25 + 1.05 * Math.pow(k, 0.8);
  const pulse = 1 + 0.06 * Math.sin(t * 18);
  // Kugel: deckende rote Hülle, darin ein heller Kern (kein weißer Fleck auf hellem Boden)
  const ball = mTake(h, 'n2BallN', 'disc', true);
  ball.position.copy(_n3a);
  ball.scale.set(s * 1.1 * pulse, s * 1.1 * pulse, 1);
  fx3Color(ball, FIRE3.deep, 0.9);
  n3Glow(h, _n3a.x, _n3a.y, _n3a.z, s * 1.4 * pulse, FIRE3.main, 0.35);
  n3Glow(h, _n3a.x, _n3a.y, _n3a.z, s * 0.75, FIRE3.hot, 0.8);
  n3Glow(h, _n3a.x, _n3a.y, _n3a.z, s * 0.35, FIRE3.core, 0.9);
  // Flammenzungen um die Kugel
  for (let i = 0; i < (low ? 4 : 8); i++) {
    const a = t * 4 + (i / 8) * Math.PI * 2;
    n3Flame(h, _n3a.x + Math.cos(a) * s * 0.5, _n3a.y + Math.sin(a) * s * 0.38, _n3a.z + Math.sin(a) * s * 0.22, s * 0.55, s * 0.95, i % 2 ? FIRE3.main : FIRE3.deep, 0.9, a + Math.PI / 2, true);
  }
  // Funken strömen hinein
  for (let i = 0; i < (low ? 6 : 16); i++) {
    const u = 1 - ((t * 0.9 + n2h(i, 2)) % 1);
    const a = n2h(i, 3) * 6.28 + u * 5;
    const r = 0.25 + 2.2 * u;
    n3Glow(h, _n3a.x + Math.cos(a) * r, _n3a.y + (n2h(i, 4) - 0.3) * 1.6 * u, _n3a.z + Math.sin(a) * r, 0.16, i % 3 ? '#ffb04a' : '#fff1c8', 0.9 * (1 - u * 0.5));
  }
  // Hitzeringe im Raum (senkrecht, drehend) – kein Kreis am Boden
  if (!low) {
    for (let i = 0; i < 2; i++) {
      const ring = fx3Take(h, 'planeMs0');
      fx3Map(ring, 'ring');
      ring.position.copy(_n3a);
      ring.rotation.set(t * (i ? 1.7 : -1.3), t * 1.1 + i, 0);
      const rs = s * (1.5 + 0.3 * i);
      ring.scale.set(rs, rs, 1);
      fx3Color(ring, i ? FIRE3.hot : FIRE3.main, 0.6 * k);
    }
  }
};

// Explosion (Feuerball groß, Phönix): Feuerkugel wächst, Flammen nach außen, Rauchpilz, Glutfunken
FX3_DRAW.mburst3 = function (h, e) {
  const t = game.time - e.start;
  const k = Math.min(1, t / e.dur);
  const x = e.x * U3;
  const z = e.y * U3;
  const R = e.R * U3;
  const low = n3low();
  const g = easeOut(Math.min(1, t / 0.25));
  const fade = Math.max(0, 1 - k * 1.3);
  n3Glow(h, x, 0.9 + 0.6 * g, z, R * 1.3 * g, FIRE3.main, 0.4 * fade);
  if (t < 0.15) n3Glow(h, x, 1, z, R * 0.8, FIRE3.hot, 0.8 * (1 - t / 0.15));
  for (let i = 0; i < (low ? 8 : 18); i++) {
    const a = n2h(i, 5) * 6.28;
    const up = n2h(i, 6);
    const d = R * (0.3 + 0.8 * g) * (0.5 + 0.5 * n2h(i, 7));
    n3Fire(h, x + Math.cos(a) * d, 0.4 + up * 1.6 * g, z + Math.sin(a) * d, 0.7 + R * 0.25, 1.1 + R * 0.35, i % 3 ? FIRE3.main : FIRE3.deep, fade, (n2h(i, 8) - 0.5));
  }
  // Rauch steigt auf
  for (let i = 0; i < (low ? 4 : 9); i++) {
    const u = Math.min(1, t / e.dur);
    const a = n2h(i, 11) * 6.28;
    n3Smoke(h, x + Math.cos(a) * R * 0.4 * u, 1 + u * 2.4 + n2h(i, 12), z + Math.sin(a) * R * 0.4 * u, 1 + u * 1.8, '#2a1a14', 0.55 * (1 - u) * Math.min(1, t * 6));
  }
  // Druckwelle in der Luft
  const ring = fx3Take(h, 'plane');
  fx3Ground(ring, e.x, e.y, Math.max(0.1, R * 1.4 * easeOut(Math.min(1, t / 0.4))), 0.3, 'ring');
  fx3Color(ring, FIRE3.hot, 0.8 * Math.max(0, 1 - t / 0.4));
};

// Brand: ein Funke fliegt zum Ziel, dann lodern Flammen am ganzen Körper, Glut steigt auf, Rauchfahne
FX3_DRAW.mignite3 = function (h, e) {
  const m = e.follow;
  if (!m || m.dead) return;
  const t = game.time - e.start;
  const low = n3low();
  const ht = Math.max(0.8, figureHeight(m) * U3 * 0.9);
  const x = m.x * U3;
  const z = feetY(m) * U3;
  if (t < e.fly) {
    const u = t / e.fly;
    const sx = e.x0 * U3;
    const sz = (e.y0 + 9) * U3;
    const px = sx + (x - sx) * u;
    const pz = sz + (z - sz) * u;
    const py = 1.3 + Math.sin(u * Math.PI) * 0.6;
    n3Glow(h, px, py, pz, 0.5, FIRE3.hot, 1);
    n3Flame(h, px, py, pz, 0.3, 0.55, FIRE3.main, 0.9);
    return;
  }
  const fade = Math.min(1, (e.dur - t) / 0.4);
  const flick = (i) => 0.85 + 0.25 * Math.sin(t * (13 + i) + i * 1.7);
  for (let i = 0; i < (low ? 3 : 6); i++) {
    const a = (i / 6) * Math.PI * 2 + t * 0.6;
    const r = Math.max(0.25, (m.r || 12) * U3 * 0.55);
    const yy = ht * (0.25 + 0.55 * n2h(i, 3));
    n3Fire(h, x + Math.cos(a) * r, yy, z + Math.sin(a) * r * 0.6, 0.5 * flick(i), 0.95 * flick(i), i % 2 ? FIRE3.main : FIRE3.deep, 0.9 * fade, Math.sin(t * 6 + i) * 0.2);
  }
  n3Glow(h, x, ht * 0.5, z, ht * 0.8, FIRE3.main, 0.25 * fade);
  for (let i = 0; i < (low ? 3 : 7); i++) {
    const u = (t * 0.8 + n2h(i, 5)) % 1;
    n3Glow(h, x + (n2h(i, 6) - 0.5) * 0.6, ht * 0.4 + u * 1.8, z + (n2h(i, 7) - 0.5) * 0.6, 0.12, '#ffc070', (1 - u) * fade);
  }
  if (!low) {
    const u = (t * 0.5) % 1;
    n3Smoke(h, x, ht + 0.3 + u * 1.2, z, 0.6 + u, '#1a0a06', 0.35 * (1 - u) * fade);
  }
};

// Phönix: Körper aus Feuer, zwei schlagende Flügel aus Flammen, langer Schweif, Funkenspur; stürzt am Ziel herab
FX3_DRAW.mphoenix3 = function (h, e) {
  const t = game.time - e.start;
  if (t > e.fly + 0.08) return;
  const low = n3low();
  const u = Math.min(1, t / e.fly);
  const x0 = e.x0 * U3;
  const z0 = e.y0 * U3;
  const x1 = e.x1 * U3;
  const z1 = e.y1 * U3;
  // Bahn: steigt auf, am Ende Sturzflug
  const yAt = (v) => 1.4 + Math.sin(Math.min(1, v) * Math.PI * 0.85) * 1.4 - Math.pow(Math.max(0, v - 0.75) / 0.25, 2) * 1.6;
  const x = x0 + (x1 - x0) * u;
  const z = z0 + (z1 - z0) * u;
  const y = yAt(u);
  const dx = x1 - x0;
  const dz = z1 - z0;
  const L = Math.hypot(dx, dz) || 1;
  const fx = dx / L;
  const fz = dz / L;
  // Seite (quer zur Flugrichtung)
  const sx = -fz;
  const sz = fx;
  const flap = Math.sin(t * 12);
  n3Glow(h, x, y, z, 1.6, FIRE3.main, 0.3);
  // Körper: deckend rot-orange, heller Kern
  n3Fire(h, x, y, z, 0.9, 1.3, FIRE3.main, 1, Math.atan2(fz, fx) * 0.3);
  n3Glow(h, x, y + 0.1, z, 0.45, FIRE3.core, 0.9);
  // Kopf vorn
  n3Fire(h, x + fx * 0.6, y + 0.35, z + fz * 0.6, 0.5, 0.8, '#ff9a2a', 1, 0);
  // Flügel: je Seite eine Kette aus Flammen, Spitzen schlagen auf und ab
  for (const side of [-1, 1]) {
    const n = low ? 4 : 7;
    for (let i = 1; i <= n; i++) {
      const v = i / n;
      const span = 2.9 * v;
      const lift = (0.3 + flap * 1.1) * v * v;
      n3Fire(h, x + sx * side * span - fx * 0.5 * v, y + lift, z + sz * side * span - fz * 0.5 * v, 0.75 * (1.1 - v * 0.4), 1.2 * (1.1 - v * 0.3), i % 2 ? FIRE3.main : FIRE3.deep, 0.95, side * (0.6 + flap * 0.4));
    }
  }
  // Schweif: Flammen und Funken hinter dem Körper entlang der Bahn
  const tail = low ? 5 : 10;
  for (let i = 1; i <= tail; i++) {
    const v = Math.max(0, u - i * 0.035);
    const tx = x0 + dx * v;
    const tz = z0 + dz * v;
    const s = 0.9 * (1 - i / (tail + 2));
    n3Flame(h, tx, yAt(v) - 0.05 * i, tz, s * 0.8, s * 1.3, i < 3 ? FIRE3.main : FIRE3.deep, 0.85 * (1 - i / (tail + 2)), Math.atan2(fz, fx), true);
  }
  if (!low && t >= (e.puff || 0)) {
    e.puff = t + 0.05;
    addEffect({ type: 'sparks3', x: e.x0 + (e.x1 - e.x0) * u, y: e.y0 + (e.y1 - e.y0) * u, h: y, count: 3, color: '#ffc070', speed: 1, up: -0.4, dur: 0.5 });
  }
};

// Blitzspeer: Spitze schießt nach vorn, dahinter eine gleißende Bahn, die noch zuckt und verglimmt
FX3_DRAW.mspear3 = function (h, e) {
  const t = game.time - e.start;
  const u = Math.min(1, t / e.fly);
  const y = 1.05;
  const fade = Math.max(0, 1 - Math.max(0, t - e.fly) / (e.dur - e.fly));
  _n3a.set(e.x0 * U3, y, e.y0 * U3);
  _n3b.set(e.x0 * U3 + (e.x1 - e.x0) * U3 * u, y, e.y0 * U3 + (e.y1 - e.y0) * U3 * u);
  n3Bolt(h, _n3a, _n3b, 0.09 * fade + 0.02, '#ffe94a', fade, n3low() ? 6 : 12, 0.22 * fade);
  // Speerspitze
  if (u < 1) {
    n3Glow(h, _n3b.x, y, _n3b.z, 1.1, '#fff7b0', 1);
    n3Glow(h, _n3b.x, y, _n3b.z, 0.5, '#ffffff', 1);
    const tip = fx3Take(h, 'coneG');
    _n3c.set(_n3b.x - (_n3b.x - _n3a.x) * 0.05, y, _n3b.z - (_n3b.z - _n3a.z) * 0.05);
    _n3d.subVectors(_n3b, _n3a).normalize();
    fx3Cone(tip, _n3c, _n3d, 0.9, 0.16);
    fx3Color(tip, '#fffbe0', 1);
  }
  // seitliche Funkenbögen entlang der Bahn
  if (!n3low()) {
    for (let i = 0; i < 4; i++) {
      const v = Math.random() * u;
      _n3c.set(_n3a.x + (_n3b.x - _n3a.x) * v, y, _n3a.z + (_n3b.z - _n3a.z) * v);
      _n3d.set(_n3c.x + (Math.random() - 0.5) * 0.8, y + (Math.random() - 0.3) * 0.6, _n3c.z + (Math.random() - 0.5) * 0.8);
      n3Bolt(h, _n3c, _n3d, 0.02, '#c8b0ff', 0.8 * fade, 3, 0.15);
    }
  }
};

// Gewitterwolke: dunkle Wolke ballt sich hoch über dem Ort, innen zucken Blitze, Regenschleier
FX3_DRAW.mstorm3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const grow = easeOut(Math.min(1, t / e.form));
  const fade = Math.min(1, (e.dur - t) / 0.7);
  const x = e.x * U3;
  const z = e.y * U3;
  const R = e.R * U3;
  const y = 4.6;
  const n = low ? 8 : 16;
  for (let i = 0; i < n; i++) {
    const a = n2h(i, 1) * 6.28 + t * 0.15;
    const r = R * Math.sqrt(n2h(i, 2)) * 0.9 * grow;
    const s = (1.6 + n2h(i, 3) * 1.6) * grow;
    n3Smoke(h, x + Math.cos(a) * r, y + (n2h(i, 4) - 0.5) * 0.7, z + Math.sin(a) * r * 0.8, s, i % 3 ? '#1a1a26' : '#2e2a40', 0.85 * fade);
  }
  // Blitze im Inneren der Wolke
  if (Math.random() < 0.35) {
    const a = Math.random() * 6.28;
    n3Glow(h, x + Math.cos(a) * R * 0.5, y - 0.2, z + Math.sin(a) * R * 0.4, 2.2, '#c8b0ff', 0.6 * fade);
  }
  // Regenschleier
  if (!low) {
    for (let i = 0; i < 14; i++) {
      const u = (t * 2.2 + n2h(i, 6)) % 1;
      const a = n2h(i, 7) * 6.28;
      const r = R * Math.sqrt(n2h(i, 8)) * 0.85 * grow;
      _n3a.set(x + Math.cos(a) * r, y - 0.4 - u * 3.8, z + Math.sin(a) * r * 0.8);
      _n3b.set(_n3a.x, _n3a.y - 0.5, _n3a.z);
      const o = fx3Take(h, 'seg');
      fx3Segment(o, _n3a, _n3b, 0.012);
      fx3Color(o, '#9ab0d8', 0.45 * fade);
    }
  }
  // Schatten am Boden (kein Kreis mit Muster, nur Dunkel)
  const sh = fx3Take(h, 'planeN');
  fx3Ground(sh, e.x, e.y, R * 1.1 * grow, 0.02, 'disc');
  fx3Color(sh, '#0a0a14', 0.35 * fade);
};

// Himmelsblitz: aus großer Höhe gezackt in den Boden, Lichtfleck, Funken
FX3_DRAW.mstrike3 = function (h, e) {
  const t = game.time - e.start;
  const s = e.s || 1;
  const x = e.x * U3;
  const z = e.y * U3;
  const k = t / e.dur;
  if (k < 0.45 && (k < 0.12 || Math.random() < 0.6)) {
    _n3a.set(x + (Math.random() - 0.5) * 0.6, 5.2, z + (Math.random() - 0.5) * 0.4);
    _n3b.set(x, 0.05, z);
    n3Bolt(h, _n3a, _n3b, 0.07 * s, '#ffe94a', 1, n3low() ? 7 : 12, 0.6);
    if (!n3low()) {
      _n3c.set(x + (Math.random() - 0.5) * 1.4, 2.4, z + (Math.random() - 0.5) * 1.4);
      _n3d.set(x + (Math.random() - 0.5) * 1.8, 0.05, z + (Math.random() - 0.5) * 1.8);
      n3Bolt(h, _n3c, _n3d, 0.03 * s, '#c8b0ff', 0.8, 5, 0.4);
    }
  }
  const fade = Math.max(0, 1 - k);
  n3Glow(h, x, 0.3, z, 1.6 * s * fade, '#fff7b0', 0.9 * fade);
  const burn = fx3Take(h, 'planeN');
  fx3Ground(burn, e.x, e.y, 0.5 * s, 0.025, 'disc');
  fx3Color(burn, '#120e08', 0.6 * fade);
};

// Steinschlag: zwei Felsen fliegen im Bogen von links und rechts heran und zerbersten aneinander
FX3_DRAW.mclash3 = function (h, e) {
  const t = game.time - e.start;
  const x = e.x * U3;
  const z = e.y * U3;
  if (t < e.fly) {
    const u = t / e.fly;
    const v = u * u;
    for (const [sx, sz, sgn] of [[e.ax, e.ay, 1], [e.bx, e.by, -1]]) {
      const px = sx * U3 + (x - sx * U3) * v;
      const pz = sz * U3 + (z - sz * U3) * v;
      const py = 1.2 + Math.sin(u * Math.PI) * 1.4;
      n3Boulder(h, px, py, pz, 0.55, t * 9 * sgn, 1);
      // Staubfahne
      if (!n3low()) for (let i = 1; i <= 3; i++) {
        const w = Math.max(0, v - i * 0.08);
        n3Smoke(h, sx * U3 + (x - sx * U3) * w, 1.2 + Math.sin(Math.sqrt(w) * Math.PI) * 1.4, sz * U3 + (z - sz * U3) * w, 0.5 + i * 0.15, '#6a5a50', 0.5 - i * 0.12);
      }
    }
    return;
  }
  // Zerbersten: Brocken fliegen auseinander, Bernsteinglut, Staubwolke
  const k = t - e.fly;
  const fade = Math.max(0, 1 - k / (e.dur - e.fly));
  n3Glow(h, x, 1.2, z, 2.5 * fade, '#f0a830', 0.8 * fade);
  for (let i = 0; i < (n3low() ? 5 : 10); i++) {
    const a = n2h(i, 1) * 6.28;
    const sp = 2 + n2h(i, 2) * 3;
    const px = x + Math.cos(a) * sp * k;
    const pz = z + Math.sin(a) * sp * k;
    const py = 1.2 + (2.5 + n2h(i, 3) * 2) * k - 9 * k * k;
    if (py < 0) continue;
    n3Boulder(h, px, py, pz, 0.12 + n2h(i, 4) * 0.12, k * 12 + i, fade);
  }
};

// Erdspitzen: zwei Wellen spitzer Basaltdornen (außen, dann innen) brechen heraus, Staub, dann versinken sie
FX3_DRAW.mspikes3 = function (h, e) {
  const t = game.time - e.start;
  const x = e.x * U3;
  const z = e.y * U3;
  const R = e.R * U3;
  const low = n3low();
  const n = low ? 10 : 22;
  for (let i = 0; i < n; i++) {
    const inner = i >= n * 0.6;
    const a = n2h(i, e.seed) * 6.28;
    const r = R * (inner ? 0.4 * Math.sqrt(n2h(i, 2)) : 0.5 + 0.48 * n2h(i, 3));
    const t0 = (inner ? 0.28 : 0.06) + n2h(i, 4) * 0.08;
    const age = t - t0;
    if (age < 0) continue;
    const up = easeOut(Math.min(1, age / 0.12));
    const down = Math.max(0, (t - (e.dur - 0.4)) / 0.4);
    const hgt = (0.9 + 1.2 * n2h(i, 5)) * (inner ? 1.3 : 1) * up * (1 - down);
    if (hgt <= 0.01) continue;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    const sp = fx3Take(h, 'cone');
    _n3a.set(px, -0.1, pz);
    _n3d.set((n2h(i, 6) - 0.5) * 0.4, 1, (n2h(i, 7) - 0.5) * 0.4).normalize();
    fx3Cone(sp, _n3a, _n3d, hgt, 0.16 + 0.1 * n2h(i, 8));
    sp.material.color.set(i % 3 ? '#8a7560' : '#a8957a');
    sp.material.opacity = 1;
    if (!low && age < 0.4) n3Glow(h, px, 0.15, pz, 0.6, '#f0a830', 0.7 * (1 - age / 0.4));
    if (!low && age < 0.25 && i % 2) n3Smoke(h, px, 0.3 + age * 2, pz, 0.6 + age * 2, '#6a5a50', 0.6 * (1 - age / 0.25));
  }
};

// Bergsturz: riesiger Fels fällt schräg vom Himmel mit Staubfahne und glühenden Adern, Einschlag mit Krater
FX3_DRAW.mmeteor3 = function (h, e) {
  const t = game.time - e.start;
  const x = e.x * U3;
  const z = e.y * U3;
  const R = e.R * U3;
  if (t < e.fall) {
    const u = t / e.fall;
    const v = u * u;
    const px = x + 2.5 * (1 - v);
    const py = 9 * (1 - v) + 0.8;
    const pz = z - 1.5 * (1 - v);
    n3Boulder(h, px, py, pz, 1.25, t * 3, 1.4);
    n3Glow(h, px, py, pz, 3.2, '#f0a830', 0.35);
    if (!n3low()) for (let i = 1; i <= 6; i++) {
      const w = Math.max(0, u - i * 0.05);
      const ww = w * w;
      n3Smoke(h, x + 2.5 * (1 - ww), 9 * (1 - ww) + 0.8, z - 1.5 * (1 - ww), 0.9 + i * 0.25, '#5a4a40', 0.55 - i * 0.07);
    }
    // wachsender Schatten
    const sh = fx3Take(h, 'planeN');
    fx3Ground(sh, e.x, e.y, R * (0.3 + 0.7 * u), 0.03, 'disc');
    fx3Color(sh, '#0a0806', 0.45 * u);
    return;
  }
  const k = t - e.fall;
  const fade = Math.max(0, 1 - k / (e.dur - e.fall));
  // der Fels steckt im Boden und bricht
  n3Boulder(h, x, 0.5 - k * 0.3, z, 1.25 * (1 - k * 0.3), 1.2, fade);
  n3Glow(h, x, 1, z, R * 2 * fade, '#f0a830', 0.5 * fade);
  const ring = fx3Take(h, 'plane');
  fx3Ground(ring, e.x, e.y, Math.max(0.1, R * 1.6 * easeOut(Math.min(1, k / 0.35))), 0.2, 'ring');
  fx3Color(ring, '#f0c070', 0.8 * Math.max(0, 1 - k / 0.35));
};

// Schwerkraft: Felsen reißen sich aus dem Boden und kreisen immer enger und schneller, dann krachen sie zusammen
FX3_DRAW.mgrav3 = function (h, e) {
  const t = game.time - e.start;
  const x = e.x * U3;
  const z = e.y * U3;
  const R = e.R * U3;
  const low = n3low();
  if (t <= e.end) {
    const rise = easeOut(Math.min(1, t / e.delay));
    const k = Math.min(1, t / e.end);
    const r = R * (0.95 - 0.55 * k * k);
    const spin = t * (1.6 + 3 * k * k);
    for (let i = 0; i < e.rocks; i++) {
      const a = (i / e.rocks) * 6.28 + spin;
      const yy = (0.4 + 1.1 * rise) + Math.sin(t * 3 + i) * 0.2;
      n3Boulder(h, x + Math.cos(a) * r, yy, z + Math.sin(a) * r, 0.32 + 0.12 * n2h(i, 1), t * 4 + i, 0.8 + 0.4 * k);
      if (!low && t < e.delay) n3Smoke(h, x + Math.cos(a) * R * 0.95, 0.3, z + Math.sin(a) * R * 0.95, 0.6, '#6a5a50', 0.5 * (1 - t / e.delay));
    }
    // Sog: Staubschleier ziehen zur Mitte
    if (!low) for (let i = 0; i < 10; i++) {
      const u = 1 - ((t * 0.9 + n2h(i, 3)) % 1);
      const a = n2h(i, 4) * 6.28 - t * 2;
      n3Smoke(h, x + Math.cos(a) * R * u, 0.25, z + Math.sin(a) * R * u, 0.5, '#7a6a58', 0.35 * (1 - u));
    }
    n3Glow(h, x, 1, z, 1.2 + 1.5 * k, '#f0a830', 0.4 + 0.4 * k);
    return;
  }
  // Zusammenprall: Brocken fliegen auseinander
  const k = t - e.end;
  const fade = Math.max(0, 1 - k / (e.dur - e.end));
  n3Glow(h, x, 1.2, z, 3 * fade, '#f0a830', 0.8 * fade);
  for (let i = 0; i < (low ? 5 : e.rocks + 4); i++) {
    const a = n2h(i, 9) * 6.28;
    const sp = 2.5 + n2h(i, 10) * 3;
    const py = 1.3 + 3 * k - 9 * k * k;
    if (py < 0) continue;
    n3Boulder(h, x + Math.cos(a) * sp * k, py, z + Math.sin(a) * sp * k, 0.18, k * 10 + i, fade);
  }
};
