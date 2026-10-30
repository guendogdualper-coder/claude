// Magier (seit 8.6): Gelehrter der vier Elemente. Jeder Weg ist ein Element (Feuer, Frost, Blitz, Erde) mit
// gleichem Platzschema: 1 Nova um die Figur · 2 Element-Geschoss · 3 Elementsprung · 4 Buff · 5 großes Siegel.
// Hier stehen Ablauf und Aussehen: Fertigkeitstypen nova, mbolt, shift, sigil, die 3D-Effekte (nova3, sigil3 und
// kleine Bausteine), die Posen, die vier Ultimativen Attacken und die Effekte je Fertigkeit (SKILL_FX).
// Bodenregel: Alles läuft flach am Boden von den Füßen nach außen oder steigt aus einem Bodensiegel auf –
// nichts fällt vom Himmel, kein Teil steht höher als 2,6 Einheiten (Abgrenzung zum Schamanen).

// --- Hilfen ------------------------------------------------------------------------------------------

// Eingefroren werden nur gewöhnliche Monster: Bosse, Seelensteine und Duellgegner bekommen nur die Verlangsamung
const canFreeze = (m) => !!m && !m.isStone && !m.duelProxy && !(m.type && m.type.boss);
// Dauer wächst mit der Stufe wie bei Buffs (Stufe 1 = 1,0×, Stufe 15 = 1,28×, E1 ≈ 1,38×)
const mageDur = (base, lvl) => base * levelCurve(lvl || 1, 0.02, 0.01, DUR_JUMP);
// Fernwiedergabe: aus dem Rang eine Stufe machen (Nachhall ab E1)
const lvlFromRank = (rk) => (rk >= 0 ? SKILL_RANKS[rk].from : 1);
const mageLow = () => typeof opts !== 'undefined' && opts.graphics === 'niedrig';
const mageElOf = (key) => MAGE_EL[key] || MAGE_EL.arkan;
function unitVec(x, y) {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
}
// Front einer Nova (Anteil am Radius): quadratisch abbremsend, beginnt bei 8 % (§1.7)
const novaFront = (t, grow) => 0.08 + 0.92 * (1 - Math.pow(1 - clamp01(t / grow), 2));
// Zeit nach dem Start, zu der die Front den Abstand d erreicht
function novaHitTime(d, R, grow) {
  const q = clamp01((d / R - 0.08) / 0.92);
  return grow * (1 - Math.sqrt(1 - q));
}
// kleiner Zufall ohne Speicher (Zacken der Blitze, je Saat gleich)
const mHash = (i, s) => {
  const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return v - Math.floor(v) - 0.5;
};
const MAGE_SIG = { feuer: 0, frost: 1, blitz: 2, erde: 3, arkan: 0 };
const ownerKey = (owner) => (owner && owner.peerId) || 'me';

// --- Element-Farben für die Treffer-Funken (fertigkeiten.js) ----------------------------------------------
Object.assign(ELEMENT3, {
  m_feuer: { spark: '#ff8a4a', column: '#e8362a' },
  m_frost: { spark: '#eafcff', shard: '#3a7bff' },
  m_blitz: { spark: '#fff7b0', column: '#8a5aff' },
  m_erde: { spark: '#ffd98a', shard: '#3e3532' }
});
Object.assign(SKILL_ELEMENT, {
  feuernova: 'm_feuer', feuerball: 'm_feuer', flammenschritt: 'm_feuer', glutherz: 'm_feuer', flammenkreis: 'm_feuer',
  frostnova: 'm_frost', frostlanze: 'm_frost', eisschritt: 'm_frost', frostpanzer: 'm_frost', kristallgrab: 'm_frost',
  blitznova: 'm_blitz', kettenblitz: 'm_blitz', blitzschritt: 'm_blitz', ladung: 'm_blitz', kugelblitz: 'm_blitz',
  erdnova: 'm_erde', steingeschoss: 'm_erde', erdsprung: 'm_erde', basalthaut: 'm_erde', schwerkraft: 'm_erde'
});

// --- Nova (Platz 1, ab Stufe 1) ---------------------------------------------------------------------------

SKILL_TYPES.nova = function (sk, pw, lvl) {
  const p = game.player;
  lockPlayer(p, sk.lock || 0.2);
  input.walkTo = null;
  return novaFx(p, p.x, p.y, sk, true, pw, lvl);
};

// Höchstens eine Haupt-Nova und ein Nachhall (oder drei Splitter) je Spieler: die älteste fällt weg
function novaLimit(ow, group) {
  const max = group === 'small' ? 3 : 1;
  const live = game.effects.filter((q) => q.type === 'nova3' && q.owner === ow && q.group === group && game.time - q.start < q.dur);
  for (let i = 0; i <= live.length - max; i++) live[i].dur = game.time - live[i].start;
}

// owner: eigener Spieler oder Mitspieler; local: nur der eigene Spieler trifft; o.echo = Nachhall (ab E1),
// o.ts = Ziele der Blitznova aus dem Netz. Rückgabe: Eckdaten für Mitspieler.
function novaFx(owner, x, y, sk, local, pw, lvl, o = {}) {
  const E = mageElOf(sk.el);
  const echo = !!o.echo;
  const R = sk.radius * (echo ? 1.2 : 1);
  const at = (sk.castAt ?? 0.16) + (echo ? 0.3 : 0);
  const fy = y + 9;
  const ow = ownerKey(owner);
  // Erde: die Splitter heben sich schon vor dem Stoß (0,15 s Vorlauf)
  const lead = sk.el === 'erde' ? 0.15 : 0;
  // Blitz: Ziele beim Wirken festlegen, die Bögen kriechen zu ihnen
  const arcs = sk.el === 'blitz' && !echo ? novaArcTargets(x, y, sk, local, o.ts) : null;
  later(at - lead, () => {
    novaLimit(ow, echo ? 'echo' : 'main');
    addEffect({ type: 'nova3', ground: true, el: sk.el, x, y: fy, R, grow: sk.grow, lead, dur: lead + sk.grow + (sk.el === 'frost' ? 0.9 : 0.55), echo, owner: ow, group: echo ? 'echo' : 'main', ts: arcs ? arcs.pts : null, rot: Math.random() * 6.28 });
  });
  later(at, () => {
    if (!echo) addEffect({ type: 'sigil3', ground: true, el: sk.el, x, y: fy, R: R * 0.45, flash: true, dur: 0.4 });
    if (owner === game.player) shakeScreen(sk.el === 'erde' ? 4 : 2.5);
    if (!V3.on) novaParticles2d(x, fy, R, sk.el, echo);
  });
  // Nachspuren am Boden nach der Front
  if (!echo) {
    later(at + sk.grow, () => {
      // Brandring (in 3D als Bodenring in der richtigen Perspektive), Frost-Reif nur in 2D
      if (sk.el === 'feuer') {
        if (V3.on) addEffect({ type: 'mground3', ground: true, x, y: fy, R: R * 0.95, tex: 'ring', color: '#3a0e0e', fadeIn: 0.05, dur: 2.5, op: 0.7 });
        else addEffect({ type: 'decal', kind: 'ring', x, y: fy, r: R * 0.92, dur: 2.5, color: '#3a0e0e' });
      } else if (sk.el === 'frost' && !V3.on) addEffect({ type: 'decal', kind: 'splash', x, y: fy, r: R * 0.85, dur: 2.5, color: '#cfe6ff' });
    });
  }
  // Nachhall ab E1: zweite, weitere Front mit 35 % Schaden, ohne Betäubung und Einfrieren
  if (!echo && skillRank(lvl || 1) >= 0) novaFx(owner, x, y, sk, local, pw * 0.35, lvl, { echo: true });
  if (arcs) {
    if (local) novaArcs(owner, x, y, sk, pw, at, arcs);
    return { x: Math.round(x), y: Math.round(y), ts: arcs.pts };
  }
  if (!local) return;
  const seen = new Set();
  let ignites = 0;
  let first = true;
  for (const m of enemiesInCircle(x, y, R)) {
    later(at + novaHitTime(dist(m, { x, y }), R, sk.grow), () => {
      if (m.dead || seen.has(m.id) || owner.dead) return;
      seen.add(m.id);
      const burning = m.burn && m.burn.until > game.time;
      const fz = !echo && sk.freeze && canFreeze(m) ? mageDur(sk.freeze, lvl) : 0;
      if (!echo && sk.lift && canLift(m)) m.lift = { start: game.time, dur: 0.45, h: sk.lift };
      hitMonster(m, sk.dmg * pw, {
        skill: sk.id, burn: sk.burn, slow: sk.slow && { amount: sk.slow.amount, duration: sk.slow.duration + fz },
        stun: echo ? 0 : Math.max(sk.stun || 0, fz), freeze: fz > 0, knockback: echo ? 0 : sk.knockback, from: { x, y },
        heavy: !echo, duelMul: sk.duelMul, vfxColor: E.core
      });
      if (first && !echo) {
        first = false;
        hitStop(0.04);
      }
      if (sk.ignite && burning && !echo && ignites++ < 4) later(0.1, () => igniteBurst(m, sk, pw));
    });
  }
  return { x: Math.round(x), y: Math.round(y) };
}

// Ziele der Blitznova: lokal die nächsten Gegner im Radius, fern die Punkte aus dem Netz
function novaArcTargets(x, y, sk, local, ts) {
  if (local) {
    const ms = enemiesInCircle(x, y, sk.radius).sort((a, b) => dist(a, { x, y }) - dist(b, { x, y })).slice(0, sk.arcs || 8);
    return { ms, pts: ms.map((m) => [Math.round(m.x), Math.round(m.y)]) };
  }
  const pts = Array.isArray(ts) ? ts.filter((q) => Array.isArray(q) && isFinite(q[0]) && isFinite(q[1])).slice(0, 8) : [];
  return { ms: null, pts };
}

// Blitznova: Bogen k trifft bei at + 0,03·k und lädt auf; danach Überschläge zu Gegnern knapp außerhalb.
// Eine Treffermenge je Wurf: keine Doppeltreffer, kein Hochschaukeln in Gruppen.
function novaArcs(owner, x, y, sk, pw, at, arcs) {
  const hit = new Set();
  const E = mageElOf('blitz');
  arcs.ms.forEach((m, k) => {
    hit.add(m.id);
    later(at + 0.03 * k, () => {
      if (m.dead || owner.dead) return;
      hitMonster(m, sk.dmg * pw, { skill: sk.id, stun: sk.stun, heavy: true, duelMul: sk.duelMul, vfxColor: '#ffffff' });
      if (!m.duelProxy) m.charged = game.time + 5;
      if (k === 0) hitStop(0.04);
    });
  });
  const J = sk.jump;
  if (!J) return;
  later(at + 0.03 * arcs.ms.length + 0.06, () => {
    if (owner.dead) return;
    let jumps = 0;
    for (const src of arcs.ms) {
      if (jumps >= J.max) break;
      let best = null;
      let bd = J.r;
      for (const o of aliveEnemies()) {
        if (hit.has(o.id) || dist(o, { x, y }) <= sk.radius) continue;
        const d = dist(o, src);
        if (d < bd) { bd = d; best = o; }
      }
      if (!best) continue;
      hit.add(best.id);
      jumps++;
      const a = bodyCenter(src);
      const b = bodyCenter(best);
      addEffect({ type: 'chain', x: a.x, y: a.y, x2: b.x, y2: b.y, dur: 0.25, color: E.main });
      hitMonster(best, sk.dmg * pw * J.mul, { skill: sk.id, vfxColor: '#ffffff' });
    }
  });
}

// Feuer: ein brennender Gegner explodiert (r 55, 0,5×)
function igniteBurst(m, sk, pw) {
  if (!m) return;
  const fy = feetY(m);
  novaLimit('me', 'small');
  addEffect({ type: 'nova3', ground: true, el: 'feuer', x: m.x, y: fy, R: 55, grow: 0.16, dur: 0.4, small: true, owner: 'me', group: 'small', rot: Math.random() * 6.28 });
  addEffect({ type: 'sparks3', x: m.x, y: fy, h: 0.5, count: 8, color: '#ff8a4a', speed: 2.6, up: 1.4, dur: 0.5 });
  if (!V3.on) particles(m.x, fy - 8, { count: 14, color: ['#e8362a', '#ff8a4a', '#fff1c8'], speed: [80, 180], life: [0.25, 0.5], size: [2, 4], shape: 'ember', drag: 3 });
  for (const o of enemiesInCircle(m.x, m.y, 55)) hitMonster(o, 0.5 * pw, { skill: sk.id, vfxColor: '#fff1c8' });
}

// 2D: Teilchen, die mit der Front nach außen fliegen (in 3D erledigt nova3 das)
function novaParticles2d(x, fy, R, el, echo) {
  const n = echo ? 8 : 18;
  const col = { feuer: ['#e8362a', '#ff8a4a', '#fff1c8'], frost: ['#eafcff', '#9ff6ff', '#3a7bff'], blitz: ['#ffffff', '#fff7b0', '#8a5aff'], erde: ['#3e3532', '#f0a830', '#6a5a50'] }[el];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    particles(x + Math.cos(a) * 10, fy + Math.sin(a) * 5, { count: 1, color: col, angle: a, spread: 0.12, speed: [R * 2.2, R * 3], life: [0.3, 0.45], size: [2, 3.5], shape: el === 'feuer' ? 'ember' : el === 'blitz' ? 'spark' : 'square', drag: 3, glow: el !== 'erde' });
  }
  if (el === 'erde') particles(x, fy, { count: 10, color: ['#6a5a50', '#4a3e3a'], speed: [30, 90], life: [0.4, 0.8], size: [4, 8], drag: 3, glow: false });
}

// --- Element-Geschoss mit Haken (Platz 2) ------------------------------------------------------------------

SKILL_TYPES.mbolt = function (sk, pw, lvl) {
  const p = game.player;
  const t = pickTarget(sk.range);
  if (t) faceTowards(t.x, t.y);
  lockPlayer(p, 0.12);
  later(0.12, () => { if (!p.dead) spawnProjectile(mageBolt(p, sk, t && !t.dead ? t : null, pw, lvl, true)); });
  return {
    tx: t ? Math.round(t.x) : Math.round(p.x + p.facing.x * sk.range),
    ty: t ? Math.round(t.y) : Math.round(p.y + p.facing.y * sk.range)
  };
};

function mageBolt(owner, sk, t, pw, lvl, local) {
  return {
    owner: local ? 'player' : 'remote', x: owner.x, y: owner.y, target: sk.pierce ? null : t, dir: t ? null : { ...owner.facing },
    aimAt: sk.pierce && t ? { x: t.x, y: t.y } : null, speed: sk.speed, range: sk.range + 40, mul: sk.dmg * pw,
    color: mageElOf(sk.el).main, radius: sk.pierce ? 8 : 7, pierce: sk.pierce, chain: sk.chain || 0, chainMul: sk.chainMul,
    stun: sk.stun, slow: sk.slow, burn: sk.burn, knockback: sk.knockback, duelMul: sk.duelMul, style: sk.style, el: sk.el, skill: sk.id,
    hitMul: (m) => boltHitMul(sk, m), afterHit: (m, pr) => boltAfterHit(sk, m, pr, pw, lvl), onRemoteHit: (m) => boltImpactFx(sk, m)
  };
}

function boltHitMul(sk, m) {
  if (sk.shatter && m.frozen > game.time) return 1 + sk.shatter; // Frost: Zerspringen
  if (sk.discharge && m.charged > game.time) return 1 + sk.discharge; // Blitz: Entladung
  return 1;
}

function boltAfterHit(sk, m, pr, pw, lvl) {
  if (sk.shatter && m.frozen > game.time) {
    m.frozen = 0;
    m.stun = 0;
    m.unfreeze = true;
    iceShatterFx(m);
    // als Mitspieler sofort melden: der Treffer selbst ging noch mit Eis an den Host
    if (net.mode === 'client' && !m.duelProxy && !m.dead) netClientDamage(m, 0, false, false);
  }
  if (sk.discharge && m.charged > game.time) {
    m.charged = 0;
    addEffect({ type: 'sparks3', x: m.x, y: feetY(m), h: 0.8, count: 8, color: '#fff7b0', speed: 2.4, up: 1, dur: 0.4 });
  }
  if (sk.splash) {
    for (const o of enemiesInCircle(m.x, m.y, sk.splash.r)) {
      if (o === m || pr.hit.has(o.id)) continue;
      pr.hit.add(o.id);
      hitMonster(o, pr.mul * sk.splash.mul, { skill: sk.id, burn: sk.burn, stun: sk.splash.stun, vfxColor: pr.color });
    }
  }
  boltImpactFx(sk, m);
}

// Einschlag je Geschoss (auch für Geschosse der Mitspieler)
function boltImpactFx(sk, m) {
  const fy = feetY(m);
  const c = bodyCenter(m);
  if (sk.style === 'fireball') {
    novaLimit('me', 'small');
    addEffect({ type: 'nova3', ground: true, el: 'feuer', x: m.x, y: fy, R: 70, grow: 0.18, dur: 0.45, small: true, owner: 'me', group: 'small', rot: Math.random() * 6.28 });
    addEffect({ type: 'sparks3', x: m.x, y: fy, h: 0.6, count: 10, color: '#ff8a4a', speed: 2.8, up: 1.4, dur: 0.55 });
    addEffect({ type: 'decal', kind: 'scorch', x: m.x, y: fy, r: 30, dur: 2.5, color: '#2a0a0a' });
    if (!V3.on) particles(c.x, c.y, { count: 16, color: ['#e8362a', '#ff8a4a', '#fff1c8'], speed: [70, 190], life: [0.25, 0.5], size: [2, 4], shape: 'ember', drag: 3 });
  } else if (sk.style === 'frostlance') {
    addEffect({ type: 'shards3', x: m.x, y: fy, r: 18, count: 4, color: '#9ff6ff', glow: true, size: 0.45, dur: 0.45 });
    if (!V3.on) particles(c.x, c.y, { count: 8, color: ['#eafcff', '#9ff6ff', '#3a7bff'], speed: [60, 150], life: [0.2, 0.4], size: [1.5, 3], shape: 'square', drag: 4 });
  } else if (sk.style === 'arc') {
    addEffect({ type: 'impact', x: c.x, y: c.y, dur: 0.25, color: '#ffffff' });
    addEffect({ type: 'impact', x: c.x + 6, y: c.y - 4, dur: 0.25, color: '#8a5aff' });
  } else if (sk.style === 'stone') {
    novaLimit('me', 'small');
    addEffect({ type: 'nova3', ground: true, el: 'erde', x: m.x, y: fy, R: 55, grow: 0.18, dur: 0.5, small: true, owner: 'me', group: 'small', rot: Math.random() * 6.28 });
    addEffect({ type: 'mdebris3', x: m.x, y: fy, n: 5, size: 0.08, dur: 0.8 });
    if (!V3.on) particles(c.x, c.y + 10, { count: 10, color: ['#3e3532', '#6a5a50', '#f0a830'], speed: [60, 160], life: [0.3, 0.6], size: [2.5, 4.5], shape: 'square', drag: 2, glow: false, gravity: 500 });
  }
}

// Frost: Eisblock zerspringt (Frostlanze auf Eingefrorene)
function iceShatterFx(m) {
  const fy = feetY(m);
  m.ice3 = false;
  addEffect({ type: 'shards3', x: m.x, y: fy, r: 22, count: 8, color: '#eafcff', glow: true, size: 0.5, dur: 0.55 });
  addEffect({ type: 'sparks3', x: m.x, y: fy, h: 0.7, count: 10, color: '#eafcff', speed: 2.6, up: 1.2, dur: 0.5 });
  addEffect({ type: 'ring', x: m.x, y: fy, r: 26, dur: 0.3, color: '#ffffff', width: 4, grow: true });
  const c = bodyCenter(m);
  particles(c.x, c.y, { count: 12, color: ['#ffffff', '#eafcff', '#3a7bff'], speed: [80, 200], life: [0.25, 0.5], size: [2, 3.5], shape: 'square', drag: 3, gravity: 300 });
  hitStop(0.05);
}

// --- Elementsprung (Platz 3, ab Stufe 5) -------------------------------------------------------------------

SKILL_TYPES.shift = function (sk, pw, lvl) {
  const p = game.player;
  const plan = shiftPlan(p, sk);
  const len = shiftReach(p, plan.dir, plan.want);
  if (len < 24 && !plan.near) {
    addText(p.x, p.y - 34, 'Kein Platz', 'info');
    return false; // kein Mana, keine Abklingzeit
  }
  const a = { x: p.x, y: p.y };
  const b = { x: p.x + plan.dir.x * len, y: p.y + plan.dir.y * len };
  faceTowards(b.x, b.y);
  lockPlayer(p, 0.2);
  input.walkTo = null;
  p.blinkHide = game.time + 0.14;
  const ret = { x0: Math.round(a.x), y0: Math.round(a.y), x1: Math.round(b.x), y1: Math.round(b.y) };
  // vor dem Ortswechsel senden, damit Mitspieler die Figur nicht über den Bildschirm gleiten sehen
  netSkillFx(sk.id, 160, { ...ret, rk: fxRank >= 0 ? fxRank : undefined, pre: 1 });
  later(0.06, () => {
    if (p.dead) return;
    p.x = b.x;
    p.y = b.y;
  });
  shiftFx(p, a, b, sk, true, pw, lvl);
  return { ...ret, skipNet: true };
};

// Richtung und gewünschte Weite: beim Laufen in Blickrichtung; 'line'/'end' mit Ziel zum Ziel;
// sonst weg vom nächsten Gegner (Flucht)
function shiftPlan(p, sk) {
  if (p.moving) return { dir: { ...p.facing }, want: sk.distance };
  const t = pickTarget(sk.distance + 60);
  if (t && (sk.at === 'line' || sk.at === 'end')) {
    const d = dist(p, t);
    const dir = unitVec(t.x - p.x, t.y - p.y);
    // Blitzschritt schlägt knapp hinter dem Ziel ein, Erdsprung bricht kurz davor aus dem Boden;
    // steht das Ziel schon daneben, bricht der Erdsprung an Ort und Stelle aus (near)
    const want = sk.at === 'end' ? Math.max(0, Math.min(sk.distance, d - 24)) : Math.min(sk.distance, d + 40);
    return { dir, want, near: sk.at === 'end' && want < 24 };
  }
  const n = nearestEnemy(p, 160);
  return { dir: n ? unitVec(p.x - n.x, p.y - n.y) : { ...p.facing }, want: sk.distance };
}

// Freie Strecke ohne Wand, Wasser, Lava und (außerhalb des Duells) ohne Dorf
function shiftReach(p, dir, want) {
  let len = 0;
  for (let s = 6; s <= want; s += 6) {
    const nx = p.x + dir.x * s;
    const ny = p.y + dir.y * s;
    if (!canStand(nx, ny, p.r || 11, false) || (inVillage(nx, ny) && !duelFighting())) break;
    len = s;
  }
  return len;
}

// Optik (für alle) und Treffer (nur local) des Elementsprungs von a nach b
function shiftFx(owner, a, b, sk, local, pw, lvl) {
  const E = mageElOf(sk.el);
  const fa = a.y + 9;
  const fb = b.y + 9;
  const near = owner === game.player;
  const low = mageLow();
  const hitCircle = (cx, cy, opt) => {
    if (!local || owner.dead) return;
    for (const m of enemiesInCircle(cx, cy, sk.radius)) {
      const fz = sk.freeze && canFreeze(m) ? mageDur(sk.freeze, lvl) : 0;
      if (sk.lift && canLift(m)) m.lift = { start: game.time, dur: 0.45, h: sk.lift };
      hitMonster(m, sk.dmg * pw, {
        skill: sk.id, burn: sk.burn, slow: sk.slow && { amount: sk.slow.amount, duration: sk.slow.duration + fz },
        stun: Math.max(sk.stun || 0, fz), freeze: fz > 0, heavy: true, duelMul: sk.duelMul, vfxColor: E.core, ...opt
      });
    }
  };
  if (sk.el === 'feuer') {
    // Stichflamme am Start, dort explodiert das Feuer; Glutspur zum Ziel
    addEffect({ type: 'column3', x: a.x, y: fa, r: 16, hgt: 1.6, color: E.main, core: E.core, dur: 0.35 });
    later(0.08, () => {
      novaLimit(ownerKey(owner), 'small');
      addEffect({ type: 'nova3', ground: true, el: 'feuer', x: a.x, y: fa, R: sk.radius, grow: 0.2, dur: 0.6, small: true, owner: ownerKey(owner), group: 'small', rot: Math.random() * 6.28 });
      addEffect({ type: 'decal', kind: 'scorch', x: a.x, y: fa, r: sk.radius * 0.5, dur: 2.5, color: '#2a0a0a' });
      if (!V3.on) particles(a.x, fa - 6, { count: 20, color: ['#e8362a', '#ff8a4a', '#fff1c8'], speed: [80, 220], life: [0.3, 0.6], size: [2, 4], shape: 'ember', drag: 3 });
      hitCircle(a.x, a.y);
      if (near) shakeScreen(3);
    });
    if (!low) addEffect({ type: 'mtrail3', ground: true, x: (a.x + b.x) / 2, y: (fa + fb) / 2, x0: a.x, y0: fa, x1: b.x, y1: fb, el: 'feuer', w: 14, dur: 1.2 });
    later(0.08, () => addEffect({ type: 'sparks3', x: b.x, y: fb, h: 0.5, count: 8, color: E.hi, speed: 2, up: 1.2, dur: 0.5 }));
  } else if (sk.el === 'frost') {
    // Eisfigur am Start, die nach delayHit zerspringt; Gleitspur
    addEffect({ type: 'mcrys3', x: a.x, y: fa, list: MAGE_STATUE, color: '#9ff6ff', core: '#3a7bff', rise: 0.1, hold: sk.delayHit || 0.5, dur: (sk.delayHit || 0.5) + 0.3 });
    later(sk.delayHit || 0.5, () => {
      addEffect({ type: 'sparks3', x: a.x, y: fa, h: 0.8, count: 12, color: '#ffffff', speed: 2.8, up: 1.3, dur: 0.6 });
      novaLimit(ownerKey(owner), 'small');
      addEffect({ type: 'nova3', ground: true, el: 'frost', x: a.x, y: fa, R: sk.radius, grow: 0.22, dur: 0.9, small: true, owner: ownerKey(owner), group: 'small', rot: Math.random() * 6.28 });
      if (!V3.on) particles(a.x, fa - 20, { count: 18, color: ['#ffffff', '#eafcff', '#3a7bff'], speed: [80, 200], life: [0.3, 0.6], size: [2, 3.5], shape: 'square', drag: 3, gravity: 300 });
      hitCircle(a.x, a.y);
      if (near) shakeScreen(3);
    });
    if (!low) addEffect({ type: 'mtrail3', ground: true, x: (a.x + b.x) / 2, y: (fa + fb) / 2, x0: a.x, y0: fa, x1: b.x, y1: fb, el: 'frost', w: 16, dur: 1.5 });
  } else if (sk.el === 'blitz') {
    // Die Figur wird zum Blitz: Bodenblitz a→b, Einschlag bei b, Brandlinie, Nachbild am Start
    const dir = facingDir(owner.facing);
    addEffect({ type: 'afterimage', sprite: characterSprite(owner.classId, dir, 1, playerLook(owner)), x: a.x, y: fa, flip: dir === 'side' && owner.facing.x < 0, dur: 0.4, tint: E.main });
    addEffect({ type: 'mzap3', x: (a.x + b.x) / 2, y: (fa + fb) / 2, x0: a.x, y0: fa, x1: b.x, y1: fb, dur: 0.3, color: E.deep });
    addEffect({ type: 'mtrail3', ground: true, x: (a.x + b.x) / 2, y: (fa + fb) / 2, x0: a.x, y0: fa, x1: b.x, y1: fb, el: 'blitz', w: 10, dur: 1.5 });
    later(0.06, () => {
      addEffect({ type: 'impact', x: b.x, y: fb - 20, dur: 0.3, color: E.main, big: true });
      addEffect({ type: 'sparks3', x: b.x, y: fb, h: 0.5, count: 10, color: E.hi, speed: 2.8, up: 1.2, dur: 0.5 });
      if (!V3.on) particles(b.x, fb - 14, { count: 16, color: ['#ffffff', '#fff7b0', '#8a5aff'], speed: [80, 220], life: [0.15, 0.35], size: [1.5, 3], shape: 'spark', drag: 5 });
      if (near) shakeScreen(3);
      if (!local || owner.dead) return;
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const L2 = vx * vx + vy * vy || 1;
      for (const m of aliveEnemies()) {
        // Abstand zur Strecke a–b (wie beim Sturmangriff)
        const u = clamp01(((m.x - a.x) * vx + (m.y - a.y) * vy) / L2);
        if (Math.hypot(a.x + vx * u - m.x, a.y + vy * u - m.y) > (sk.width || 40) + m.r) continue;
        hitMonster(m, sk.dmg * pw, { skill: sk.id, stun: sk.stun, heavy: true, duelMul: sk.duelMul, vfxColor: '#ffffff' });
      }
    });
  } else if (sk.el === 'erde') {
    // Die Figur versinkt in einem glühenden Riss und bricht beim Ziel wieder aus dem Boden
    addEffect({ type: 'mground3', ground: true, x: a.x, y: fa, R: 30, tex: 'crk', color: E.main, dur: 1.2 });
    addEffect({ type: 'smoke3', x: a.x, y: fa, count: 4, color: '#4a3e3a', size: 0.5, dur: 0.6 });
    later(0.2, () => {
      novaLimit(ownerKey(owner), 'small');
      addEffect({ type: 'nova3', ground: true, el: 'erde', x: b.x, y: fb, R: sk.radius, grow: 0.22, dur: 0.75, small: true, owner: ownerKey(owner), group: 'small', rot: Math.random() * 6.28 });
      addEffect({ type: 'mdebris3', x: b.x, y: fb, n: 6, size: 0.09, dur: 0.8 });
      if (!V3.on) particles(b.x, fb - 6, { count: 16, color: ['#3e3532', '#6a5a50', '#f0a830'], angle: -Math.PI / 2, spread: 1.2, speed: [80, 200], life: [0.3, 0.6], size: [2.5, 4.5], shape: 'square', drag: 2, glow: false, gravity: 500 });
      hitCircle(b.x, b.y);
      if (near) shakeScreen(4);
    });
  }
}
// Eisfigur des Eisschritts: fünf Kristalle in Figurgröße [dx, dy, Höhe, Dicke, Neigung x, Neigung z]
const MAGE_STATUE = [[0, 0, 1.4, 0.16, 0, 0], [-7, 2, 1.1, 0.12, 0, 0.25], [7, 2, 1.0, 0.12, 0, -0.25], [-3, -4, 1.2, 0.11, -0.2, 0.1], [4, -3, 1.15, 0.1, -0.2, -0.12]];

// --- Großes Siegel mit Zielkreis (Platz 5, ab Stufe 10) -------------------------------------------------

SKILL_TYPES.sigil = function (sk, pw, lvl) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.3);
  input.walkTo = null;
  sigilFx(p, pt.x, pt.y, sk, true, pw, lvl);
  return { tx: Math.round(pt.x), ty: Math.round(pt.y) };
};

// Ein Siegel je Spieler: ein neues lässt das alte ausblenden. Ticks bei delay + k·every, der letzte bekommt sk.last.
function sigilFx(owner, x, y, sk, local, pw, lvl) {
  const fy = y + 9;
  const ow = ownerKey(owner);
  for (const q of game.effects) {
    if (q.type !== 'sigil3' || q.flash || q.owner !== ow || q.stop) continue;
    q.stop = true;
    q.dur = Math.min(q.dur, game.time - q.start + 0.3);
  }
  const last = sk.delay + (sk.ticks - 1) * sk.every;
  const tail = sk.el === 'frost' ? Math.max(1.8, sk.linger || 0) : sk.el === 'feuer' ? 0.5 : 0.35;
  const e = addEffect({ type: 'sigil3', ground: true, el: sk.el, x, y: fy, R: sk.radius, delay: sk.delay, ticks: sk.ticks, every: sk.every, last, dur: last + tail + 0.6, owner: ow, linger: sk.linger || 0 });
  if (sk.el === 'frost') addEffect({ type: 'mground3', ground: true, x, y: fy, R: sk.radius, tex: 'hex', color: '#3a7bff', fadeIn: 0.15, delay: sk.delay, dur: sk.delay + (sk.linger || 3), op: 0.75 });
  for (let k = 0; k < sk.ticks; k++) {
    later(sk.delay + k * sk.every, () => {
      if (e.stop) return;
      if (owner.dead || Math.hypot(owner.x - x, owner.y - y) > sk.range + 400) {
        // Tod, Kartenwechsel oder Reise: das Siegel erlischt
        e.stop = true;
        e.dur = Math.min(e.dur, game.time - e.start + 0.3);
        return;
      }
      sigilTick(owner, e, x, y, sk, k, k === sk.ticks - 1, local, pw, lvl);
    });
  }
  return e;
}

function sigilTick(owner, e, x, y, sk, k, last, local, pw, lvl) {
  const fy = y + 9;
  const E = mageElOf(sk.el);
  const near = Math.hypot(game.player.x - x, game.player.y - y) < 300;
  const L = last && sk.last ? { ...sk, ...sk.last } : sk;
  const foes = local ? enemiesInCircle(x, y, sk.radius) : null;
  if (sk.el === 'feuer') {
    // Flammenwand am Rand zieht sich zur Mitte zusammen, dort ein Glutblitz
    if (k === 0) addEffect({ type: 'decal', kind: 'scorch', x, y: fy, r: sk.radius * 0.8, dur: 3, color: '#2a0a0a' });
    later(0.4, () => {
      addEffect({ type: 'sparks3', x, y: fy, h: 0.4, count: 6, color: E.core, speed: 2.2, up: 1.4, dur: 0.5 });
      if (!V3.on) particles(x, fy - 8, { count: 12, color: ['#fff1c8', '#ff8a4a', '#e8362a'], speed: [60, 160], life: [0.25, 0.5], size: [2, 4], shape: 'ember', drag: 3 });
    });
    if (near) shakeScreen(last ? 3 : 1.2);
    if (!foes) return;
    let ignites = 0;
    for (const m of foes) {
      const burning = m.burn && m.burn.until > game.time;
      hitMonster(m, L.dmg * pw, { skill: sk.id, burn: sk.burn, heavy: last, vfxColor: E.core });
      if (L.ignite && burning && ignites++ < 4) later(0.1, () => igniteBurst(m, sk, pw));
    }
  } else if (sk.el === 'frost') {
    // Eiskristalle brechen auf; nach 1,6 s zerspringen sie, das Eisfeld verlangsamt noch linger s
    addEffect({ type: 'ring', x, y: fy, r: sk.radius, dur: 0.35, color: '#eafcff', width: 6, grow: true });
    later(1.6, () => {
      addEffect({ type: 'sparks3', x, y: fy, h: 0.9, count: 14, color: '#eafcff', speed: 3, up: 1.4, dur: 0.6 });
      particles(x, fy - 20, { count: 16, color: ['#ffffff', '#eafcff', '#3a7bff'], speed: [80, 220], life: [0.3, 0.6], size: [2, 3.5], shape: 'square', drag: 3, gravity: 300, jitter: sk.radius * 0.4 });
    });
    if (near) shakeScreen(3.5);
    if (!foes) return;
    for (const m of foes) {
      const fz = sk.freeze && canFreeze(m) ? mageDur(sk.freeze, lvl) : 0;
      hitMonster(m, L.dmg * pw, { skill: sk.id, slow: sk.slow && { amount: sk.slow.amount, duration: sk.slow.duration + fz }, stun: fz, freeze: fz > 0, heavy: true, duelMul: sk.duelMul, vfxColor: E.core });
    }
    // Nachwirkung: das Eisfeld verlangsamt alles, was es betritt (ohne Treffer)
    const n = Math.round((sk.linger || 0) / 0.5);
    for (let j = 1; j <= n; j++) {
      later(j * 0.5, () => {
        if (owner.dead) return;
        for (const m of enemiesInCircle(x, y, sk.radius)) {
          if (m.isStone || m.duelProxy) continue;
          setSlow(m, 1 - sk.slow.amount, 0.7);
          if (net.mode === 'client') netClientDamage(m, 0, false, false);
        }
      });
    }
  } else if (sk.el === 'blitz') {
    // die Kugel über dem Siegel schlägt waagrecht in die nächsten Gegner, aufgeladene zuerst
    const zaps = sk.zaps || 3;
    let list;
    if (foes) {
      list = foes.sort((a, b) => ((b.charged > game.time) - (a.charged > game.time)) || dist(a, { x, y }) - dist(b, { x, y })).slice(0, zaps);
    } else {
      list = game.monsters.filter((m) => !m.dead && Math.hypot(m.x - x, m.y - y) < sk.radius).slice(0, zaps);
    }
    for (const m of list) {
      const c = bodyCenter(m);
      addEffect({ type: 'chain', x, y: fy - 16, h1: 1.0, x2: c.x, y2: c.y, dur: 0.25, color: E.main });
      if (local) hitMonster(m, L.dmg * pw, { skill: sk.id, stun: L.stun || 0, heavy: last, vfxColor: '#ffffff' });
    }
    if (last) {
      if (!V3.on) addEffect({ type: 'ring', x, y: fy, r: sk.radius, dur: 0.45, color: E.deep, width: 8, grow: true });
      flashScreen(E.hi, 0.1);
    }
    if (!V3.on) particles(x, fy - 32, { count: 6, color: ['#ffffff', '#fff7b0', '#8a5aff'], speed: [60, 160], life: [0.15, 0.3], size: [1.5, 2.5], shape: 'spark', drag: 5 });
    if (near && last) shakeScreen(3);
  } else if (sk.el === 'erde') {
    // Sog zur Mitte, drei kreisende Felsen treffen; zum Schluss schlagen sie gemeinsam ein
    addEffect({ type: 'ring', x, y: fy, r: sk.radius * (last ? 1 : 0.6), dur: 0.4, color: E.main, width: last ? 10 : 4, grow: last });
    if (last) {
      later(0.12, () => {
        addEffect({ type: 'sparks3', x, y: fy, h: 0.4, count: 10, color: '#ffd98a', speed: 3, up: 1.4, dur: 0.6 });
        addEffect({ type: 'mdebris3', x, y: fy, n: 6, size: 0.1, dur: 0.9 });
        if (!V3.on) particles(x, fy - 6, { count: 20, color: ['#3e3532', '#f0a830', '#ffd98a'], angle: -Math.PI / 2, spread: 1.3, speed: [80, 220], life: [0.3, 0.7], size: [2.5, 5], shape: 'square', drag: 2, glow: false, gravity: 500 });
        if (near) shakeScreen(4);
      });
    }
    if (!foes) return;
    for (const m of foes) {
      // der erste Tick zieht heran (negativer Rückstoß, nicht bei Bossen) – im selben Treffer, keine „1“-Zahlen
      const pull = k === 0 && !(m.type && m.type.boss) && !m.isStone ? { knockback: -sk.pull, from: { x, y } } : {};
      if (last && L.lift && canLift(m)) m.lift = { start: game.time + 0.12, dur: 0.5, h: L.lift };
      hitMonster(m, L.dmg * pw, { skill: sk.id, stun: last ? L.stun : 0, heavy: last, duelMul: sk.duelMul, vfxColor: E.hi, ...pull });
    }
  }
}

// --- Effekte je Fertigkeit -----------------------------------------------------------------------------

// Beim Wirken: kleines Siegel unter den Füßen, Funken an der Hand
function mageCastFx(p, sk) {
  const E = mageElOf(sk.el);
  addEffect({ type: 'sigil3', ground: true, el: sk.el, follow: p, ox: 0, oy: 0, x: p.x, y: feetY(p), R: 26, flash: true, small: true, dur: 0.35 });
  const c = bodyCenter(p);
  particles(c.x + p.facing.x * 12, c.y + p.facing.y * 6, { count: 5, color: [E.main, E.hi, '#ffffff'], speed: [30, 90], life: [0.2, 0.35], size: [1.5, 2.5], shape: 'spark', drag: 4 });
}

// Treffer: Feuer Glut, Frost blaue Splitter, Blitz kurze Bögen, Erde dunkle Brocken
function mageHitFx(el) {
  return (m, crit, heavy) => {
    const c = bodyCenter(m);
    if (el === 'feuer') {
      particles(c.x, c.y, { count: 4, color: ['#ff8a4a', '#fff1c8', '#e8362a'], speed: [40, 120], life: [0.3, 0.5], size: [2, 3.5], shape: 'ember', drag: 3, gravity: -40 });
    } else if (el === 'frost') {
      particles(c.x, c.y, { count: 3, color: ['#3a7bff', '#9ff6ff', '#eafcff'], speed: [50, 130], life: [0.3, 0.5], size: [2, 3.5], shape: 'square', drag: 3, gravity: 300 });
    } else if (el === 'blitz') {
      for (let i = 0; i < (heavy || crit ? 2 : 1); i++) {
        const a = Math.random() * Math.PI * 2;
        addEffect({ type: 'chain', x: c.x, y: c.y, x2: c.x + Math.cos(a) * 26, y2: c.y + Math.sin(a) * 16, dur: 0.12, color: '#ffe94a' });
      }
    } else {
      particles(c.x, c.y + 8, { count: 3, color: ['#3e3532', '#5a4e48', '#f0a830'], speed: [50, 130], life: [0.35, 0.6], size: [2.5, 4], shape: 'square', drag: 2, glow: false, gravity: 500 });
    }
  };
}

// Buff-Wirken: Siegel-Blitz unter den Füßen und ein Ring
function mageBuffCast(p, sk) {
  const E = mageElOf(sk.el);
  addEffect({ type: 'sigil3', ground: true, el: sk.el, follow: p, ox: 0, oy: 0, x: p.x, y: feetY(p), R: 50, flash: true, dur: 0.6 });
  addEffect({ type: 'ring', follow: p, ox: 0, oy: 0, r: 50, dur: 0.5, color: E.main, width: 5, grow: true });
}

(function () {
  const skills = {
    feuer: ['feuernova', 'feuerball', 'flammenschritt', 'glutherz', 'flammenkreis'],
    frost: ['frostnova', 'frostlanze', 'eisschritt', 'frostpanzer', 'kristallgrab'],
    blitz: ['blitznova', 'kettenblitz', 'blitzschritt', 'ladung', 'kugelblitz'],
    erde: ['erdnova', 'steingeschoss', 'erdsprung', 'basalthaut', 'schwerkraft']
  };
  for (const [el, ids] of Object.entries(skills)) {
    ids.forEach((id, i) => {
      SKILL_FX[id] = { color: mageElOf(el).main, cast: i === 3 ? mageBuffCast : mageCastFx, hit: mageHitFx(el) };
    });
  }
})();

// Buff-Auren: aufsteigende Teilchen (2D und 3D) und eigene Körper an der Figur (aura3, drei-fx.js)
Object.assign(SKILL_FX.glutherz, {
  aura: { every: 0.5, color: ['#ff8a4a', '#fff1c8'], shape: 'ember' },
  aura3: (h, p, b, t) => mageAura3Glut(h, p, t)
});
Object.assign(SKILL_FX.frostpanzer, {
  aura: { every: 0.6, color: ['#9ff6ff', '#eafcff'], shape: 'square' },
  aura3: (h, p, b, t) => mageAura3Frost(h, p, t)
});
Object.assign(SKILL_FX.ladung, {
  aura: { every: 0.18, color: ['#fff7b0', '#ffffff'], shape: 'spark', size: [1, 2] },
  aura3: (h, p, b, t) => mageAura3Ladung(h, p, t)
});
Object.assign(SKILL_FX.basalthaut, {
  aura: { every: 0.7, color: ['#f0a830', '#5a4e48'], shape: 'square', glow: false },
  aura3: (h, p, b, t) => mageAura3Basalt(h, p, t),
  // der Schild fängt einen Treffer ab: Bernstein-Abdruck
  absorb: (p) => addEffect({ type: 'shield3', x: p.x, y: feetY(p), dur: 0.3, color: '#f0a830', size: 0.8 })
});

// --- 3D: Hilfen --------------------------------------------------------------------------------------

const _m3a = new THREE.Vector3();
const _m3b = new THREE.Vector3();
const _m3c = new THREE.Vector3();

// Teil aus dem Vorrat mit fester Textur und (optional) normaler Mischung: einmal je Teil eingerichtet
function mTake(h, kind, tex, normal) {
  const o = fx3Take(h, kind);
  if (!o.userData.mInit) {
    o.userData.mInit = true;
    if (normal && o.material.blending !== THREE.NormalBlending) {
      o.material.blending = THREE.NormalBlending;
      o.material.needsUpdate = true;
    }
    if (tex) fx3Map(o, tex);
  }
  return o;
}
// Sprite an Ort (Einheiten), Größe, Farbe, Deckkraft
function mSprite(h, kind, tex, x, y, z, s, color, op, normal) {
  const o = mTake(h, kind, tex, normal);
  // geteilte Vorräte (sprite) tauschen die Textur je Effekt: immer setzen (ändert nur bei Bedarf)
  fx3Map(o, tex);
  o.position.set(x, y, z);
  o.scale.set(s, s, 1);
  fx3Color(o, color, op);
  return o;
}
// flache Scheibe am Boden mit fester Textur
function mGround(h, kind, tex, xPx, zPx, r, y, rot, color, op, normal) {
  const o = mTake(h, kind, tex, normal);
  fx3Ground(o, xPx, zPx, Math.max(0.001, r), y, tex, rot);
  fx3Color(o, color, op);
  return o;
}
const MAGE_SIG_TEX = ['msig0', 'msig1', 'msig2', 'msig3'];

// --- 3D: Nova -----------------------------------------------------------------------------------------
// Jede Nova wächst flach am Boden nach außen (rf = Front), je Element eine eigene Form (§6.1).

FX3_TYPES.add('nova3');
FX3_TYPES.add('sigil3');
for (const t of ['mcrys3', 'mtrail3', 'mzap3', 'mdebris3', 'mground3', 'mcrown3', 'mmono3']) FX3_TYPES.add(t);

FX3_DRAW.nova3 = function (h, e) {
  const age = game.time - e.start;
  const t = age - (e.lead || 0);
  const E = mageElOf(e.el);
  const lite = e.small || e.echo;
  const op = lite ? 0.6 : 1;
  const low = mageLow();
  const R = e.R * U3;
  const rf = R * novaFront(Math.max(0, t), e.grow);
  const fade = t < e.grow ? 1 : clamp01(1 - (t - e.grow) / 0.55);
  const x = e.x * U3;
  const z = e.y * U3;
  const run = clamp01(t / e.grow);
  if (e.rank >= 0 && t >= 0 && fade > 0) mGround(h, 'plane', 'ring', e.x, e.y, rf * 1.15, 0.045, 0, e.rankColor, fade * 0.7);
  if (e.el === 'feuer') {
    if (t < 0 || fade <= 0) return;
    const n = lite ? 6 : 12;
    // Flammen werden beim Laufen niedriger; karminroter Glutring am Boden an der Front
    const hgt = (1.0 - 0.55 * run) * (lite ? 0.65 : 1);
    mGround(h, 'planeN', 'ring', e.x, e.y, rf * 1.05, 0.04, 0, E.main, fade * 0.6 * op, true);
    for (let i = 0; i < n; i++) {
      const a = e.rot + (i / n) * Math.PI * 2;
      const fl = 0.85 + 0.25 * Math.sin(age * 17 + i);
      const s = hgt * fl;
      const o = mTake(h, 'spriteMFlame', 'mflame', true);
      o.position.set(x + Math.cos(a) * rf, s * 0.45, z + Math.sin(a) * rf);
      o.scale.set(s * 0.6, s, 1);
      fx3Color(o, i % 2 ? E.hi : E.main, fade * op);
      // weißglühende Kerne zwischen den Flammen
      if (i % 2 === 0 && !low && !lite) mSprite(h, 'spriteMDisc', 'disc', x + Math.cos(a + Math.PI / n) * rf, 0.12, z + Math.sin(a + Math.PI / n) * rf, 0.25 * fl, E.core, fade * 0.9);
    }
  } else if (e.el === 'frost') {
    if (t < 0) return;
    // königsblaues Sechseck am Boden, bleibt bis zum Ende
    const hold = clamp01((e.dur - (e.lead || 0) - t) / 0.35);
    mGround(h, 'planeNHex', 'hexfrost', e.x, e.y, rf * 1.02, 0.045, e.rot, E.main, 0.7 * hold * op, true);
    if (fade > 0) {
      const n = lite ? 6 : 12;
      const len = (lite ? 0.35 : 0.6) * (0.7 + 0.3 * run);
      const ca = Math.cos(0.21);
      const sa = Math.sin(0.21);
      for (let i = 0; i < n; i++) {
        const a = e.rot + (i / n) * Math.PI * 2 + Math.PI / 6;
        _m3a.set(x + Math.cos(a) * rf * 0.9, 0.04, z + Math.sin(a) * rf * 0.9);
        _m3b.set(Math.cos(a) * ca, sa, Math.sin(a) * ca);
        const o = fx3Take(h, i % 2 ? 'coneG' : 'cone');
        fx3Cone(o, _m3a, _m3b, len, i % 2 ? 0.07 : 0.09);
        fx3Color(o, i % 2 ? E.core : E.main, fade * (i % 2 ? 0.95 : 1) * op);
      }
      if (!low && !lite) {
        for (let i = 0; i < 4; i++) {
          const a = e.rot * 3 + i * 1.7;
          const d = rf * (0.35 + 0.15 * i);
          const tw = 0.5 + 0.5 * Math.sin(age * 14 + i * 2);
          mSprite(h, 'sprite', 'spark', x + Math.cos(a) * d, 0.08, z + Math.sin(a) * d, 0.22 * tw, '#ffffff', fade * tw);
        }
      }
    }
  } else if (e.el === 'blitz') {
    if (t < 0 || fade <= 0) return;
    const ts = e.ts || [];
    const nT = Math.min(8, ts.length);
    const nArc = lite ? Math.max(3, Math.min(4, nT)) : Math.max(5, nT);
    const seed = Math.floor(age / 0.05);
    const tip = rf;
    for (let i = 0; i < nArc; i++) {
      let ax;
      let az;
      let L;
      if (i < nT && !lite) {
        const dx = (ts[i][0] - e.x) * U3;
        const dz = (ts[i][1] + 9 - e.y) * U3;
        L = Math.hypot(dx, dz) || 0.01;
        ax = dx / L;
        az = dz / L;
        L = Math.min(L, tip);
      } else {
        const a = e.rot + (i / nArc) * Math.PI * 2;
        ax = Math.cos(a);
        az = Math.sin(a);
        L = tip * 0.85;
      }
      // violetter Saum am Boden unter dem Bogen
      if (!lite) {
        const sm = mTake(h, 'planeN', 'disc', true);
        fx3Strip2(sm, e.x + ax * L / U3 * 0.5, e.y + az * L / U3 * 0.5, L * 0.5, 0.16, 0.042, 'disc', Math.atan2(-az, ax));
        fx3Color(sm, E.deep, 0.55 * fade);
      }
      // drei Zacken; nur Positionen verschieben (alle 0,05 s neu), keine neue Geometrie
      _m3a.set(x + ax * 0.2, 0.25, z + az * 0.2);
      for (let j = 1; j <= 3; j++) {
        const f = j / 3;
        const off = j < 3 ? mHash(i * 7 + j, seed) * 0.5 * L / 3 : 0;
        _m3b.set(x + ax * (0.2 + (L - 0.2) * f) - az * off, j < 3 ? 0.1 + 0.2 * (0.5 + mHash(i + j * 3, seed)) : 0.12, z + az * (0.2 + (L - 0.2) * f) + ax * off);
        const o = fx3Take(h, 'seg');
        fx3Segment(o, _m3a, _m3b, lite ? 0.035 : 0.05);
        fx3Color(o, j === 3 ? '#ffffff' : E.main, fade * op);
        _m3a.copy(_m3b);
      }
    }
    // violetter Ringblitz an der Front, Blitz an der Figur, zwei violette Kugeln
    mGround(h, 'planeN', 'ring', e.x, e.y, rf * 1.05, 0.05, 0, E.deep, fade * 0.75 * op, true);
    if (!lite) {
      if (age < 0.15) mSprite(h, 'sprite', 'spark', x, 0.5, z, 0.9, '#ffffff', 1 - age / 0.15);
      if (!low) {
        for (let i = 0; i < 2; i++) {
          const a = age * 9 + i * Math.PI;
          mSprite(h, 'spriteMDisc', 'disc', x + Math.cos(a) * 0.5, 0.45, z + Math.sin(a) * 0.5, 0.3, E.deep, fade);
        }
      }
    }
  } else if (e.el === 'erde') {
    // Basaltsplitter heben sich (Vorlauf), dann fliegen sie waagrecht mit der Front nach außen und fallen
    const n = lite ? 4 : 8;
    const sd = fx3Seed(h, n, (v, i) => ({ s: 0.2 + Math.random() * 0.1, spin: 3 + Math.random() * 4, ph: Math.random() * 6 }));
    const lead = e.lead || 0;
    const rise = lead > 0 ? clamp01(age / lead) : 1;
    const out = fade;
    if (out <= 0) return;
    if (t >= 0) mGround(h, 'planeCrk', 'mcracks', e.x, e.y, rf * 1.05, 0.045, e.rot, E.main, fade * (1 - 0.45 * run) * 0.95 * op);
    for (let i = 0; i < n; i++) {
      const q = sd[i];
      const a = e.rot + (i / n) * Math.PI * 2;
      const r = t < 0 ? 0.35 : Math.max(0.35, rf);
      const yy = t < 0 ? 0.05 + 0.5 * easeOut(rise) : Math.max(0.08, 0.55 - 2.2 * t * t);
      const s = q.s * (lite ? 0.7 : 1) * (t > e.grow ? fade : 1);
      if (s <= 0.01) continue;
      const rx = x + Math.cos(a) * r;
      const rz = z + Math.sin(a) * r;
      const o = fx3Rock(h, 'rock', rx, yy, rz, s, s * 0.8, s * 0.9, E.deep);
      o.rotation.set(q.ph + age * q.spin, a + 0.5 * rise, q.ph * 0.5 + age * q.spin * 0.6);
      if (!lite) mSprite(h, 'spriteMDisc', 'disc', rx, yy + 0.06, rz, 0.26 + 0.06 * Math.sin(age * 12 + i), E.main, 0.95 * fade);
    }
    if (!low && !lite && age < 0.6) {
      for (let i = 0; i < 3; i++) {
        const a = e.rot + i * 2.1;
        const k = clamp01(age / 0.6);
        const o = fx3Take(h, 'smoke');
        o.position.set(x + Math.cos(a) * (0.25 + 0.4 * k), 0.15 + 0.2 * k, z + Math.sin(a) * (0.25 + 0.4 * k) * 0.8);
        o.scale.set(0.45 + 0.4 * k, 0.45 + 0.4 * k, 1);
        o.material.color.set('#4a3e3a');
        o.material.opacity = 0.55 * (1 - k);
      }
    }
  }
};

// --- 3D: Siegel ---------------------------------------------------------------------------------------
// Dreiecks-Siegel am Boden (msig0–3): zeichnet sich ein (gut lesbare Warnung), dann die Nutzlast je Element.

FX3_DRAW.sigil3 = function (h, e) {
  const age = game.time - e.start;
  const E = mageElOf(e.el);
  const n = MAGE_SIG[e.el] || 0;
  const R = e.R * U3;
  const low = mageLow();
  const end = clamp01((e.dur - age) / (e.flash ? e.dur * 0.5 : 0.35));
  const appear = clamp01(age / 0.15);
  const x = (e.follow ? e.follow.x : e.x) * U3;
  const z = (e.follow ? feetY(e.follow) : e.y) * U3;
  const px = x / U3;
  const pz = z / U3;
  const draw = e.flash ? 1 : clamp01(age / Math.max(0.05, e.delay));
  const sc = (0.6 + 0.4 * easeOut(draw)) * R;
  const rot = age * 0.4 + (n === 1 || n === 3 ? Math.PI : 0);
  const op = appear * end * (e.flash ? 1 : draw < 1 ? 0.75 + 0.25 * Math.sin(age * 18) : 0.85) * (n === 2 ? 0.55 : n === 3 ? 0.75 : 1);
  // Rückseite in der dunklen Elementfarbe, darauf das leuchtende Dreieck
  mGround(h, 'planeNMs' + n, MAGE_SIG_TEX[n], px, pz, sc * 1.05, 0.04, rot, E.deep, op * (e.small ? 0.5 : 0.7), true);
  mGround(h, 'planeMs' + n, MAGE_SIG_TEX[n], px, pz, sc, 0.05, rot, E.main, op);
  if (e.rank >= 0) mGround(h, 'plane', 'ring', px, pz, sc * 1.12, 0.045, 0, e.rankColor, op * 0.7);
  if (e.flash) return;
  const T = age - e.delay;
  if (T < 0) return;
  const xx = e.x * U3;
  const zz = e.y * U3;
  if (e.el === 'feuer') {
    // je Puls 12 Flammen vom Rand zur Mitte (0,4 s), dann ein Glutblitz in der Mitte
    for (let k = 0; k < e.ticks; k++) {
      const u = (T - k * e.every) / 0.4;
      if (u < 0 || u > 1.25) continue;
      if (u <= 1) {
        const r = R * (1 - 0.85 * easeOut(u));
        const hh = 1.05 * (1 - 0.35 * u) * (u < 0.12 ? u / 0.12 : 1);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + k * 0.26;
          const fl = 0.85 + 0.25 * Math.sin(age * 17 + i * 1.3);
          const o = mTake(h, 'spriteMFlame', 'mflame', true);
          o.position.set(xx + Math.cos(a) * r, hh * fl * 0.5, zz + Math.sin(a) * r);
          o.scale.set(hh * fl * 0.6, hh * fl, 1);
          fx3Color(o, i % 2 ? E.hi : E.main, end);
        }
      }
      if (u > 0.85) mSprite(h, 'spriteMDisc', 'disc', xx, 0.35, zz, 0.9 * (1 - (u - 0.85) / 0.4) + 0.2, E.core, end * clamp01(1 - (u - 0.85) / 0.4));
    }
  } else if (e.el === 'frost') {
    // sieben Eiskristalle (Mitte und Sechseck bei 0,6 R) brechen auf und zerspringen nach 1,6 s
    const up = T < 0.15 ? easeOutBack(T / 0.15) : 1;
    const crack = clamp01((T - 1.6) / 0.15);
    if (crack < 1) {
      for (let i = 0; i < 7; i++) {
        const a = i ? ((i - 1) / 6) * Math.PI * 2 + Math.PI / 6 : 0;
        const d = i ? R * 0.6 : 0;
        const hh = (i ? 1.2 + 0.1 * (i % 3) : 1.8) * up * (1 - crack);
        if (hh <= 0.01) continue;
        const cx = xx + Math.cos(a) * d;
        const cz = zz + Math.sin(a) * d;
        const tilt = i ? 0.22 : 0;
        const o = fx3Take(h, 'cone');
        o.position.set(cx, hh / 2 - 0.05, cz);
        o.scale.set(0.3 * (i ? 0.85 : 1), hh, 0.3 * (i ? 0.85 : 1));
        o.rotation.set(Math.sin(a) * tilt, a, -Math.cos(a) * tilt);
        fx3Color(o, E.main, 1);
        const c = fx3Take(h, 'coneG');
        c.position.set(cx, hh * 0.55 - 0.05, cz);
        c.scale.set(0.16 * (i ? 0.85 : 1), hh * 1.08, 0.16 * (i ? 0.85 : 1));
        c.rotation.copy(o.rotation);
        fx3Color(c, E.core, 0.9);
      }
    }
    if (!low && T < (e.linger || 3)) {
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + 0.4;
        const k = (T * 0.25 + i / 3) % 1;
        const o = fx3Take(h, 'smoke');
        o.position.set(xx + Math.cos(a) * R * 0.5, 0.25 + k * 0.3, zz + Math.sin(a) * R * 0.4);
        o.scale.set(1 + k, 0.7 + k * 0.5, 1);
        o.material.color.set('#cfe6ff');
        o.material.opacity = 0.25 * Math.sin(k * Math.PI) * end;
      }
    }
  } else if (e.el === 'blitz') {
    // Kugel steigt aus dem Siegel (0,3 s) auf Höhe 1,0; beim letzten Schlag größer
    const rise = easeOut(clamp01(T / 0.3));
    const lastT = e.last - e.delay;
    const big = T >= lastT - 0.05 ? 1.4 : 1;
    const yy = 0.1 + 0.9 * rise;
    const pulse = 0.9 + 0.1 * Math.sin(age * 30);
    mSprite(h, 'spriteMDiscN', 'disc', xx, yy, zz, 0.95 * big, E.deep, 0.7 * end, true);
    mSprite(h, 'spriteMDisc', 'disc', xx, yy, zz, 0.7 * big * pulse, E.main, end);
    const st = mTake(h, 'spriteStar', 'star');
    st.position.set(xx, yy, zz);
    st.scale.set(0.9 * big, 0.9 * big, 1);
    st.material.rotation = age * 4;
    fx3Color(st, '#ffffff', end * 0.9);
    for (let i = 0; i < 3; i++) {
      const a = age * 7 + i * 2.094;
      mSprite(h, 'sprite', 'spark', xx + Math.cos(a) * 0.4, yy + Math.sin(a * 1.3) * 0.12, zz + Math.sin(a) * 0.4, 0.2, i ? E.hi : E.deep, end);
    }
    if (big > 1) mGround(h, 'planeN', 'ring', e.x, e.y, R * (0.6 + 0.4 * clamp01((T - lastT) / 0.3)), 0.05, 0, E.deep, end * 0.8, true);
  } else if (e.el === 'erde') {
    // Bernstein-Risse drehen langsam; drei Felsen kreisen und ziehen sich je Tick nach innen, zum Schluss Einsturz
    mGround(h, 'planeCrk', 'mcracks', e.x, e.y, R * 0.95, 0.045, age * 0.3, E.main, 0.3 * end * clamp01(T / 0.2));
    const lastT = e.last - e.delay;
    const done = clamp01(T / Math.max(0.01, lastT));
    const crash = clamp01((T - lastT) / 0.15);
    if (crash >= 1) return;
    const r = R * 0.5 * (1 - 0.45 * done) * (1 - crash);
    for (let i = 0; i < 3; i++) {
      const a = age * 2.2 + i * 2.094;
      const yy = 0.6 * (1 - crash) + 0.05 * Math.sin(age * 5 + i);
      const rx = xx + Math.cos(a) * r;
      const rz = zz + Math.sin(a) * r * 0.9;
      const o = fx3Rock(h, 'rock', rx, yy, rz, 0.3, 0.24, 0.27, E.deep);
      o.rotation.set(age * 3 + i, age * 2, i);
      if (!low) mSprite(h, 'spriteMDisc', 'disc', rx, yy, rz, 0.3, E.main, 0.8 * end);
    }
  }
};

// --- 3D: kleine Bausteine (Kristalle, Spuren, Bodenblitz, Splitter, Bodenmuster, Krone, Monolithen) -----------

// Kristallgruppe: list [dx, dy, Höhe, Dicke, Neigung x, Neigung z]; wächst in rise, steht hold, zerspringt
FX3_DRAW.mcrys3 = function (h, e) {
  const t = game.time - e.start;
  const up = t < e.rise ? easeOutBack(t / e.rise) : 1;
  const gone = clamp01((t - e.rise - e.hold) / 0.12);
  if (gone >= 1) return;
  const s = up * (1 - gone);
  const x = e.x * U3;
  const z = e.y * U3;
  for (const q of e.list) {
    const hh = q[2] * s;
    if (hh <= 0.01) continue;
    const cx = x + q[0] * U3;
    const cz = z + q[1] * U3;
    const o = fx3Take(h, 'cone');
    o.position.set(cx, hh / 2 - 0.04, cz);
    o.scale.set(q[3], hh, q[3]);
    o.rotation.set(q[4], 0, q[5]);
    fx3Color(o, e.color, 0.85);
    if (e.core) {
      const c = fx3Take(h, 'coneG');
      c.position.set(cx, hh * 0.45 - 0.04, cz);
      c.scale.set(q[3] * 0.5, hh * 0.85, q[3] * 0.5);
      c.rotation.set(q[4], 0, q[5]);
      fx3Color(c, e.core, 0.8);
    }
  }
};

// Spur am Boden von (x0, y0) nach (x1, y1): Glut (Feuer) oder Reif (Frost), blendet aus
FX3_DRAW.mtrail3 = function (h, e, k) {
  const dx = e.x1 - e.x0;
  const dz = e.y1 - e.y0;
  const len = Math.hypot(dx, dz);
  if (len < 2) return;
  const ang = Math.atan2(-dz, dx);
  const mx = (e.x0 + e.x1) / 2;
  const mz = (e.y0 + e.y1) / 2;
  const fade = 1 - k;
  const E = mageElOf(e.el);
  const under = mTake(h, 'planeN', 'disc', true);
  fx3Strip2(under, mx, mz, len * U3 / 2 + 0.2, e.w * U3, 0.035, 'disc', ang);
  fx3Color(under, e.el === 'frost' ? E.main : e.el === 'blitz' ? E.dark : '#2a0a0a', 0.6 * fade);
  const lit = fx3Take(h, 'plane');
  fx3Strip2(lit, mx, mz, len * U3 / 2, e.w * U3 * 0.45, 0.04, 'disc', ang);
  fx3Color(lit, e.el === 'frost' ? E.hi : E.deep, 0.8 * fade * fade);
  if (e.el === 'blitz') return;
  if (e.el === 'frost') {
    // Reifsechsecke entlang der Bahn
    for (let i = 0; i < 3; i++) {
      const f = (i + 0.5) / 3;
      mGround(h, 'planeNHex', 'hexfrost', e.x0 + dx * f, e.y0 + dz * f, e.w * U3 * 1.6, 0.045, i * 1.3, E.main, 0.7 * fade, true);
    }
  } else if (k < 0.6) {
    // Glutflammen entlang der Bahn
    for (let i = 0; i < 4; i++) {
      const f = (i + 0.5) / 4;
      const fl = (0.85 + 0.25 * Math.sin(game.time * 17 + i * 2)) * (1 - k / 0.6);
      const o = mTake(h, 'spriteMFlame', 'mflame', true);
      o.position.set((e.x0 + dx * f) * U3, 0.18 * fl, (e.y0 + dz * f) * U3);
      o.scale.set(0.22 * fl, 0.36 * fl, 1);
      fx3Color(o, i % 2 ? E.deep : E.main, 1 - k / 0.6);
    }
  }
};

// Bodenblitz (Blitzschritt): sechs Zacken a→b, weißer Kern, violetter Schein
FX3_DRAW.mzap3 = function (h, e, k) {
  const seed = Math.floor((game.time - e.start) / 0.05);
  const dx = (e.x1 - e.x0) * U3;
  const dz = (e.y1 - e.y0) * U3;
  const L = Math.hypot(dx, dz) || 1;
  const nx = -dz / L;
  const nz = dx / L;
  const fade = 1 - k;
  _m3a.set(e.x0 * U3, 0.3, e.y0 * U3);
  for (let j = 1; j <= 6; j++) {
    const f = j / 6;
    const off = j < 6 ? mHash(j, seed) * 0.35 : 0;
    _m3b.set(e.x0 * U3 + dx * f + nx * off, 0.25 + mHash(j + 9, seed) * 0.2, e.y0 * U3 + dz * f + nz * off);
    const core = fx3Take(h, 'seg');
    fx3Segment(core, _m3a, _m3b, 0.045);
    fx3Color(core, '#ffffff', fade);
    const glow = fx3Take(h, 'seg');
    fx3Segment(glow, _m3a, _m3b, 0.16);
    fx3Color(glow, e.color, fade * 0.6);
    _m3a.copy(_m3b);
  }
};

// Gesteinssplitter fliegen ballistisch vom Punkt weg
FX3_DRAW.mdebris3 = function (h, e) {
  const t = game.time - e.start;
  const sd = fx3Seed(h, e.n, (v, i) => ({ a: (i / e.n) * Math.PI * 2 + Math.random() * 0.6, sp: 1.6 + Math.random() * 1.6, up: 2 + Math.random() * 2, s: 0.7 + Math.random() * 0.6 }));
  const x = e.x * U3;
  const z = e.y * U3;
  const k = clamp01(t / e.dur);
  for (const q of sd) {
    const tt = Math.min(t, q.up / 4.9 * 1.15);
    const y = Math.max(0.04, 0.2 + q.up * tt - 4.9 * tt * tt);
    const s = (e.size || 0.08) * q.s * (1 - k * k);
    if (s <= 0.004) continue;
    const o = fx3Rock(h, 'rock', x + Math.cos(q.a) * q.sp * tt, y, z + Math.sin(q.a) * q.sp * tt * 0.85, s, s * 0.8, s, '#3e3532');
    o.rotation.set(t * 9 * q.s, q.a, t * 7);
  }
};

// Bodenmuster: hexfrost (Eisfeld) oder mcracks (Bernsteinrisse), mit Ein- und Ausblenden
FX3_DRAW.mground3 = function (h, e) {
  const t = game.time - e.start - (e.delay || 0);
  if (t < 0) return;
  const inn = clamp01(t / (e.fadeIn || 0.12));
  const out = clamp01((e.dur - (e.delay || 0) - t) / 0.5);
  const hex = e.tex === 'hex';
  const r = e.R * U3 * (0.6 + 0.4 * easeOut(inn));
  if (hex) mGround(h, 'planeNHex', 'hexfrost', e.x, e.y, r, 0.042, e.rot || 0, e.color, (e.op || 0.85) * inn * out, true);
  else if (e.tex === 'ring') mGround(h, 'planeN', 'ring', e.x, e.y, e.R * U3, 0.036, 0, e.color, (e.op || 0.7) * out, true);
  else mGround(h, 'planeCrk', 'mcracks', e.x, e.y, r, 0.042, e.rot || 0, e.color, (e.op || 0.95) * inn * out);
};

// Donnerkrone: sechs Blitzzacken über dem Kopf (folgt der Figur)
FX3_DRAW.mcrown3 = function (h, e, k) {
  const f = e.follow;
  if (!f) return;
  const t = game.time - e.start;
  const x = f.x * U3;
  const z = feetY(f) * U3;
  const y = Math.min(2.3, v3HeadHeight(f) + 0.2);
  const grow = easeOut(clamp01(t / 0.25));
  const fade = clamp01((1 - k) / 0.15);
  const seed = Math.floor(t / 0.06);
  for (let i = 0; i < 6; i++) {
    const a = t * 1.5 + i * 1.047;
    const cx = x + Math.cos(a) * 0.3;
    const cz = z + Math.sin(a) * 0.3;
    _m3a.set(cx, y, cz);
    _m3b.set(cx + Math.cos(a) * 0.08 + mHash(i, seed) * 0.1, y + 0.42 * grow, cz + Math.sin(a) * 0.08 + mHash(i + 5, seed) * 0.1);
    const o = fx3Take(h, 'seg');
    fx3Segment(o, _m3a, _m3b, 0.05);
    fx3Color(o, i % 2 ? '#ffffff' : e.color, fade);
    mSprite(h, 'sprite', 'spark', _m3b.x, _m3b.y, _m3b.z, 0.18, e.color, fade);
  }
  mSprite(h, 'spriteMDisc', 'disc', x, y + 0.08, z, 0.9 * grow, e.color, 0.45 * fade);
  mSprite(h, 'sprite', 'spark', x, y + 0.1, z, 0.5 + 0.15 * Math.sin(t * 30), '#ffffff', 0.7 * fade);
};

// Weltenbruch: acht Basaltmonolithen steigen im Kreis auf und kippen nach innen
FX3_DRAW.mmono3 = function (h, e) {
  const t = game.time - e.start;
  const x = e.x * U3;
  const z = e.y * U3;
  const R = e.R * U3;
  const up = t < e.rise ? easeOutBack(t / e.rise) : 1;
  const tip = clamp01((t - e.tipAt) / 0.22);
  const sink = clamp01((t - e.tipAt - 0.3) / 0.4);
  if (sink >= 1) return;
  const low = mageLow();
  for (let i = 0; i < e.n; i++) {
    const a = (i / e.n) * Math.PI * 2 + 0.2;
    const H = (1.5 + 0.25 * (i % 3)) * up;
    if (H <= 0.02) continue;
    const r = R * (1 - 0.55 * tip * tip);
    const cx = x + Math.cos(a) * r;
    const cz = z + Math.sin(a) * r;
    const lean = 1.15 * tip * tip;
    const o = fx3Rock(h, 'rockcol', cx, H / 2 - 0.06 - sink * H, cz, 0.34, H, 0.34, '#3e3532');
    o.rotation.set(Math.sin(a) * lean, a, -Math.cos(a) * lean);
    if (!low) mSprite(h, 'spriteMDisc', 'disc', cx, H * 0.45 * (1 - sink), cz, 0.4, '#f0a830', 0.8 * (1 - sink));
  }
};

// --- 3D: Buff-Auren (drei-fx.js ruft SKILL_FX[id].aura3 für jeden sichtbaren Spieler mit dem Buff) ----------

// freie Hand (links) aus der Blickrichtung: Seite (f.y, −f.x), etwas vor dem Körper
// (etwas vor dem Körper, damit der Körper sie von der Kamera aus nicht verdeckt)
function mageHand3(p, out, up) {
  const f = p.facing || { x: 0, y: 1 };
  const fy = feetY(p);
  return out.set((p.x + f.y * 6 + f.x * 10) * U3, up, (fy - f.x * 6 + f.y * 10 + 4) * U3);
}

function mageAura3Glut(h, p, t) {
  mageHand3(p, _m3c, 1.1 + 0.05 * Math.sin(t * 3));
  const fl = 0.9 + 0.15 * Math.sin(t * 13);
  const o = mTake(h, 'spriteMFlame', 'mflame', true);
  o.position.set(_m3c.x, _m3c.y + 0.1, _m3c.z);
  o.scale.set(0.4 * fl, 0.62 * fl, 1);
  fx3Color(o, '#e8362a', 0.95);
  mSprite(h, 'spriteMDisc', 'disc', _m3c.x, _m3c.y + 0.02, _m3c.z, 0.45 * fl, '#fff1c8', 1);
}

function mageAura3Frost(h, p, t) {
  const x = p.x * U3;
  const z = feetY(p) * U3;
  const hurt = p.hurtAt && t - p.hurtAt < 0.2;
  for (let i = 0; i < 4; i++) {
    const a = t * 0.8 + i * Math.PI / 2;
    const o = mTake(h, 'planeNHexV', 'hexfrost');
    o.position.set(x + Math.cos(a) * 0.48, 0.8 + 0.04 * Math.sin(t * 2 + i), z + Math.sin(a) * 0.48);
    o.rotation.set(0, Math.PI / 2 - a, 0);
    o.scale.set(0.24, 0.24, 1);
    fx3Color(o, hurt ? '#ffffff' : '#9ff6ff', hurt ? 0.95 : 0.8);
  }
}

function mageAura3Ladung(h, p, t) {
  const x = p.x * U3;
  const z = feetY(p) * U3;
  const seed = Math.floor(t / 0.1);
  // drei kurze Bögen an Schultern, Saum und Zepter, alle 0,1 s an neuer Stelle
  for (let i = 0; i < 3; i++) {
    const a = (mHash(i, seed) + 0.5) * Math.PI * 2;
    const yy = [1.05, 0.25, 0.7][i] + mHash(i + 3, seed) * 0.15;
    _m3a.set(x + Math.cos(a) * 0.3, yy, z + Math.sin(a) * 0.3 + 0.08);
    _m3b.set(_m3a.x + mHash(i + 7, seed) * 0.6, yy + mHash(i + 11, seed) * 0.4, _m3a.z + mHash(i + 13, seed) * 0.4);
    // über der Robe sichtbar (ohne Tiefentest)
    const o = fx3Take(h, 'segTop');
    fx3Segment(o, _m3a, _m3b, 0.04);
    fx3Color(o, i ? '#ffe94a' : '#ffffff', 1);
  }
  const f = p.facing || { x: 0, y: 1 };
  const tx = (p.x - f.y * 9 + f.x * 8) * U3;
  const tz = (feetY(p) + f.x * 9 + f.y * 8) * U3;
  mSprite(h, 'sprite', 'spark', tx, 1.25, tz, 0.22 + 0.08 * Math.sin(t * 40), '#ffe94a', 0.9);
}

function mageAura3Basalt(h, p, t) {
  const f = p.facing || { x: 0, y: 1 };
  const x = p.x * U3;
  const z = feetY(p) * U3;
  const head = Math.atan2(f.x, f.y);
  const low = mageLow();
  // Schultern links und rechts, Brust vorn
  const spots = [[0.24, 0, 1.0], [-0.24, 0, 1.0], [0, 0.17, 0.78]];
  for (let i = 0; i < 3; i++) {
    const [sx, fz, yy] = spots[i];
    const px = x + f.y * sx + f.x * fz;
    const pz = z - f.x * sx + f.y * fz;
    const o = fx3Rock(h, 'rock', px, yy, pz, 0.18, 0.05, 0.14, '#3e3532');
    o.rotation.set(i === 2 ? 1.2 : 0.2, head, i === 2 ? 0 : sx > 0 ? -0.5 : 0.5);
    if (!low) mSprite(h, 'spriteMDisc', 'disc', px, yy + 0.02, pz, 0.14 + 0.03 * Math.sin(t * 4 + i), '#f0a830', 0.8);
  }
}

// --- Posen (SKILL_POSE3, drei-figuren.js) ------------------------------------------------------------------
// sw läuft von 0 bis 1 über die Dauer der Pose; Vorzeichen wie bei den Krieger-Posen.

Object.assign(SKILL_POSE3, {
  // Nova: Zepter hoch über den Kopf, dann senkrecht vor den Füßen in den Boden rammen (bei castAt), halten, zurück.
  // Blitz reißt die Arme seitlich auf, Erde stampft zusätzlich.
  nova(B, sw, kind, p, a) {
    const E = mageEl(p);
    const dur = E.key === 'erde' ? 0.55 : 0.5;
    const T = sw * dur;
    const blitz = E.key === 'blitz';
    if (T < 0.12) {
      const k = easeOut(T / 0.12);
      setArm(B[BH.armR], -2.4 * k, 0, -0.15 * k);
      setArm(B[BH.armL], -1.2 * k, 0, 0.2 * k);
      B[BH.handL].rotation.x = 0.6 * k;
      B[BH.chest].rotation.x = -0.15 * k;
      B[BH.hips].position.y += 0.03 * k;
      B[BH.head].rotation.x += -0.1 * k;
      poseWeaponGlow(a, E.main, 0.5 * k);
      return;
    }
    const w = T < 0.38 ? 1 : 1 - easeInOut3(poseSeg(T, 0.38, dur));
    const d = Math.pow(poseSeg(T, 0.12, 0.18), 3);
    if (blitz) {
      setArm(B[BH.armR], (-2.4 + 1.6 * d) * w, 0, -1.2 * d * w);
      setArm(B[BH.armL], (-1.2 + 0.4 * d) * w, 0, 1.2 * d * w);
    } else {
      setArm(B[BH.armR], (-2.4 + 3.0 * d) * w, 0, -0.15 * w);
      setArm(B[BH.armL], (-1.2 + 1.0 * d) * w, 0, (0.2 + 0.9 * d) * w);
    }
    B[BH.chest].rotation.x = (-0.15 + 0.4 * d) * w;
    B[BH.hips].position.y -= (0.07 + (E.key === 'erde' && T < 0.24 ? 0.05 * Math.sin(poseSeg(T, 0.16, 0.24) * Math.PI) : 0)) * d * w;
    B[BH.legL].rotation.x = -0.35 * d * w;
    B[BH.legR].rotation.x = 0.35 * d * w;
    B[BH.cape].rotation.x = 0.3 * w;
    if (T >= 0.14 && T < 0.3) poseWeaponGlow(a, E.main, T < 0.2 ? 1 : 0.6);
  },

  // Geschoss: Zepter zur Schulter, Stoß nach vorn (das Geschoss startet bei 0,12 s), freie Hand zurück
  stoss(B, sw, kind, p, a) {
    const E = mageEl(p);
    const T = sw * 0.35;
    if (T < 0.12) {
      const k = easeOut(T / 0.12);
      setArm(B[BH.armR], 0.5 * k, 0, -0.35 * k);
      setArm(B[BH.armL], -0.4 * k, 0, 0.3 * k);
      B[BH.chest].rotation.y = 0.4 * k;
      B[BH.legR].rotation.x = 0.15 * k;
      poseWeaponGlow(a, E.main, 0.4 * k);
      return;
    }
    const w = T < 0.22 ? 1 : 1 - easeInOut3(poseSeg(T, 0.22, 0.35));
    const b = easeOut(poseSeg(T, 0.12, 0.17));
    setArm(B[BH.armR], (0.5 - 2.1 * b) * w, 0, -0.35 * (1 - b) * w);
    setArm(B[BH.armL], (-0.4 + 0.9 * b) * w, 0, (0.3 + 0.3 * b) * w);
    B[BH.chest].rotation.y = (0.4 - 0.7 * b) * w;
    B[BH.chest].rotation.x = 0.12 * b * w;
    B[BH.legR].rotation.x = (0.15 - 0.4 * b) * w;
    B[BH.legL].rotation.x = 0.25 * b * w;
    poseWeaponGlow(a, E.main, 0.9 * b * w);
  },

  // Siegel: das Zepter zeichnet ein Dreieck vor der Brust, dann beide Handflächen nach unten (Siegel erscheint)
  zauber(B, sw, kind, p, a) {
    const E = mageEl(p);
    const T = sw * 0.55;
    let ax;
    let az;
    if (T < 0.1) {
      const k = easeOut(T / 0.1);
      ax = -1.2 * k;
      az = -0.3 * k;
    } else if (T < 0.2) {
      const k = easeInOut3(poseSeg(T, 0.1, 0.2));
      ax = -1.2 - 0.4 * k;
      az = -0.3 + 0.5 * k;
    } else if (T < 0.3) {
      const k = easeInOut3(poseSeg(T, 0.2, 0.3));
      ax = -1.6 + 0.7 * k;
      az = 0.2 - 0.2 * k;
    } else {
      ax = -0.9;
      az = 0;
    }
    const down = easeOut(poseSeg(T, 0.36, 0.44));
    const w = T < 0.47 ? 1 : 1 - easeInOut3(poseSeg(T, 0.47, 0.55));
    setArm(B[BH.armR], (ax + 0.2 * down) * w, 0, az * w);
    setArm(B[BH.armL], (-0.5 * clamp01(T / 0.1) - 0.5 * down) * w, 0, (0.35 - 0.1 * down) * w);
    B[BH.handL].rotation.x = 0.8 * down * w;
    B[BH.handR].rotation.x = 0.5 * down * w;
    B[BH.chest].rotation.x = (0.05 + 0.15 * down) * w;
    B[BH.head].rotation.x += 0.1 * down * w;
    poseWeaponGlow(a, E.main, T < 0.3 ? 0.8 : 0.5 * w);
  },

  // Elementsprung: ducken, verborgen (blinkHide), aufrichten mit ausgebreiteten Armen. Erde steigt aus dem Boden.
  schritt(B, sw, kind, p, a) {
    const E = mageEl(p);
    const T = sw * 0.3;
    if (T < 0.08) {
      const k = easeOut(T / 0.08);
      B[BH.legL].rotation.x = -0.4 * k;
      B[BH.legR].rotation.x = 0.4 * k;
      B[BH.chest].rotation.x = 0.3 * k;
      B[BH.hips].position.y -= 0.1 * k;
      setArm(B[BH.armR], 0.4 * k, 0, -0.3 * k);
      setArm(B[BH.armL], 0.4 * k, 0, 0.3 * k);
      if (E.key === 'erde') B[BH.root].position.y -= 0.3 * k;
      return;
    }
    const k = T < 0.2 ? 0 : easeOut(poseSeg(T, 0.2, 0.3));
    setArm(B[BH.armR], -0.3 * (1 - k), 0, -0.5 * (1 - k * 0.6));
    setArm(B[BH.armL], -0.3 * (1 - k), 0, 0.5 * (1 - k * 0.6));
    B[BH.chest].rotation.x = 0.2 * (1 - k);
    B[BH.hips].position.y -= 0.08 * (1 - k);
    if (E.key === 'erde') B[BH.root].position.y -= 0.6 * (1 - k);
    poseWeaponGlow(a, E.main, 0.6 * (1 - k));
  }
});

// --- Ultimative Attacken (ab Stufe 30) -------------------------------------------------------------------

const MAGE_ULTS = {
  feuer: {
    id: 'inferno', name: 'Inferno', short: 'IN', color: '#e8362a',
    text: 'Drei gewaltige Feuernovas rollen nacheinander von dir aus über das Feld, jede weiter als die letzte. Alles darin brennt.',
    stats: 'je Welle 2× Angriff (Radius 130 / 200 / 270), Brand 0,5× je s für 4 s'
  },
  frost: {
    id: 'eiszeit', name: 'Eiszeit', short: 'EZ', color: '#3a7bff',
    text: 'Der Boden um dich gefriert zu einem Gletscher: Alle Gegner bis 260 weit erstarren 2 s im Eis, dann zerspringt es mit gewaltigem Schaden.',
    stats: '1,5× beim Einfrieren, 2 s eingefroren (Bosse nur verlangsamt), Zerspringen 4×'
  },
  blitz: {
    id: 'donnerkrone', name: 'Donnerkrone', short: 'DK', color: '#ffe94a',
    text: 'Eine Krone aus Blitzen erhebt sich über dir: Sechs Blitze schlagen waagrecht in die nächsten Gegner und springen weiter. Danach 10 s Donnerkrone.',
    stats: 'je Blitz 1,4× Angriff, Sprung 0,7×; Donnerkrone: +25 % Angriffstempo, +8 % Lauftempo',
    buff: { id: 'donnerkrone', name: 'Donnerkrone', duration: 10, effects: { atkSpeed: 0.25, speed: 0.08 } }
  },
  erde: {
    id: 'weltenbruch', name: 'Weltenbruch', short: 'WB', color: '#f0a830',
    text: 'Acht Basaltmonolithen brechen im Kreis um dich aus dem Boden und schleudern alle Gegner hoch, dann stürzen sie nach innen. Danach 12 s Steinhaut.',
    stats: '2× beim Aufbrechen (hochgeschleudert, 1,5 s betäubt), Einsturz 3,5×; Steinhaut: −25 % erlittener Schaden, +25 % Verteidigung',
    buff: { id: 'steinhaut', name: 'Steinhaut', duration: 12, effects: { damageTaken: -0.25, def: 0.25 } }
  }
};
for (const u of Object.values(MAGE_ULTS)) Object.assign(u, { kind: 'ultimativ', unlock: ULT_UNLOCK, cooldown: ULT_COOLDOWN, mp: 0 });
Object.assign(ULTIMATES, MAGE_ULTS);

// Inferno-Wellen: Radius und Wachstum
const INFERNO_WAVES = [[130, 0.35], [200, 0.4], [270, 0.45]];
// Eiszeit-Kristalle (einmal festgelegt): [dx, dy, Höhe, Dicke, Neigung x, Neigung z]
const EISZEIT_CRYS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2 + (i % 2) * 0.17;
  const d = 120 + (i % 3) * 45;
  return [Math.cos(a) * d, Math.sin(a) * d * 0.8, 0.9 + (i % 4) * 0.25, 0.2 + (i % 3) * 0.04, Math.sin(a) * 0.25, -Math.cos(a) * 0.25];
});

// Optik der Ultimates für alle (owner: eigener Spieler oder Mitspieler)
function infernoFx(x, fy, near) {
  // Dreieckssiegel statt ultsigil: dessen Runentextur ist das Hexagramm des Schamanen (Bodenregel)
  addEffect({ type: 'sigil3', ground: true, el: 'feuer', x, y: fy, R: 150, flash: true, dur: 1.8 });
  INFERNO_WAVES.forEach(([R, grow], k) => {
    later(k * 0.45, () => {
      addEffect({ type: 'nova3', ground: true, el: 'feuer', x, y: fy, R, grow, dur: grow + 0.55, owner: 'ult', group: 'ult' + k, rot: Math.random() * 6.28 });
      if (!V3.on) novaParticles2d(x, fy, R, 'feuer', false);
      if (near) shakeScreen(4 + k * 1.5);
    });
  });
  later(0.9 + 0.45, () => addEffect({ type: 'decal', kind: 'scorch', x, y: fy, r: 200, dur: 4, color: '#2a0a0a' }));
}
function eiszeitFx(x, fy, near) {
  addEffect({ type: 'mground3', ground: true, x, y: fy, R: 260, tex: 'hex', color: '#3a7bff', fadeIn: 0.25, dur: 3, op: 0.8 });
  addEffect({ type: 'mcrys3', x, y: fy, list: EISZEIT_CRYS, color: '#3a7bff', core: '#eafcff', rise: 0.25, hold: 1.75, dur: 2.15 });
  addEffect({ type: 'ring', x, y: fy, r: 260, dur: 0.5, color: '#eafcff', width: 10, grow: true });
  later(2, () => {
    addEffect({ type: 'sparks3', x, y: fy, h: 0.8, count: 20, color: '#eafcff', speed: 4.5, up: 1.6, dur: 0.8 });
    addEffect({ type: 'ring', x, y: fy, r: 260, dur: 0.55, color: '#ffffff', width: 14, grow: true });
    particles(x, fy - 20, { count: 40, color: ['#ffffff', '#eafcff', '#3a7bff'], speed: [120, 360], life: [0.4, 0.8], size: [2, 4], shape: 'square', drag: 2.5, gravity: 300, jitter: 120 });
    if (near) {
      shakeScreen(8);
      flashScreen('#cfe6ff', 0.25);
    }
  });
}
function donnerkroneFx(owner) {
  addEffect({ type: 'mcrown3', follow: owner, dur: 2.4, color: '#ffe94a' });
  addEffect({ type: 'sigil3', ground: true, el: 'blitz', follow: owner, ox: 0, oy: 0, x: owner.x, y: feetY(owner), R: 70, flash: true, dur: 0.8 });
}
function weltenbruchFx(x, fy, near) {
  addEffect({ type: 'mmono3', x, y: fy, R: 180, n: 8, rise: 0.3, tipAt: 1.0, dur: 1.75 });
  addEffect({ type: 'sigil3', ground: true, el: 'erde', x, y: fy, R: 110, flash: true, dur: 1.0 });
  later(0.3, () => {
    addEffect({ type: 'ring', x, y: fy, r: 220, dur: 0.5, color: '#f0a830', width: 10, grow: true });
    addEffect({ type: 'smoke3', x, y: fy, count: 6, color: '#4a3e3a', size: 1, dur: 0.8 });
    if (near) shakeScreen(5);
  });
  later(1.0 + 0.22, () => {
    addEffect({ type: 'mground3', ground: true, x, y: fy, R: 220, tex: 'crk', color: '#f0a830', dur: 1.6 });
    addEffect({ type: 'mdebris3', x, y: fy, n: 10, size: 0.12, dur: 1 });
    addEffect({ type: 'sparks3', x, y: fy, h: 0.5, count: 16, color: '#ffd98a', speed: 3.5, up: 1.4, dur: 0.7 });
    if (!V3.on) particles(x, fy - 10, { count: 40, color: ['#3e3532', '#6a5a50', '#f0a830'], speed: [100, 300], life: [0.4, 0.8], size: [3, 6], shape: 'square', drag: 2, glow: false, gravity: 500 });
    if (near) {
      shakeScreen(9);
      flashScreen('#f0a830', 0.2);
    }
  });
}

Object.assign(ULT_RUN, {
  inferno(p, u, pw) {
    const x = p.x;
    const y = p.y;
    infernoFx(x, feetY(p), true);
    flashScreen('#e8362a', 0.25);
    INFERNO_WAVES.forEach(([R, grow], k) => {
      const at = k * 0.45;
      const seen = new Set();
      for (const m of enemiesInCircle(x, y, R)) {
        later(at + novaHitTime(dist(m, { x, y }), R, grow), () => {
          if (m.dead || p.dead || seen.has(m.id)) return;
          seen.add(m.id);
          hitMonster(m, 2 * pw, { burn: { dps: 0.5, duration: 4 }, knockback: 30, from: { x, y }, heavy: true, vfxColor: '#fff1c8' });
        });
      }
    });
  },

  eiszeit(p, u, pw) {
    const x = p.x;
    const y = p.y;
    eiszeitFx(x, feetY(p), true);
    for (const m of enemiesInCircle(x, y, 260)) {
      if (canFreeze(m)) hitMonster(m, 1.5 * pw, { stun: 2, freeze: true, heavy: true, vfxColor: '#eafcff' });
      else hitMonster(m, 1.5 * pw, { slow: { amount: 0.5, duration: 3 }, heavy: true, vfxColor: '#eafcff' });
    }
    hitStop(0.06);
    later(2, () => {
      if (p.dead) return;
      for (const m of enemiesInCircle(x, y, 260)) {
        if (m.frozen > game.time) {
          m.frozen = 0;
          m.stun = 0;
          m.unfreeze = true;
          m.ice3 = false;
        }
      }
      ultHitCircle(x, y, 260, 4 * pw, { vfxColor: '#eafcff' });
    });
  },

  donnerkrone(p, u, pw) {
    donnerkroneFx(p);
    const hit = new Set();
    for (let k = 0; k < 6; k++) {
      later(0.2 + k * 0.35, () => {
        if (p.dead) return;
        // noch nicht getroffene zuerst, dann der nächste
        let best = null;
        let bd = Infinity;
        for (const m of aliveEnemies()) {
          const d = dist(m, p);
          if (d > 280) continue;
          const score = d + (hit.has(m.id) ? 1000 : 0);
          if (score < bd) { bd = score; best = m; }
        }
        if (!best) return;
        hit.add(best.id);
        const b = bodyCenter(best);
        addEffect({ type: 'chain', x: p.x, y: feetY(p) - 16, h1: 1.9, x2: b.x, y2: b.y, dur: 0.3, color: u.color });
        hitMonster(best, 1.4 * pw, { stun: 0.3, heavy: true, vfxColor: '#ffffff' });
        shakeScreen(3);
        // ein Sprung zum nächsten Gegner daneben
        let nxt = null;
        let nd = 150;
        for (const m of aliveEnemies()) {
          if (m === best) continue;
          const d = dist(m, best);
          if (d < nd) { nd = d; nxt = m; }
        }
        if (nxt) {
          const c = bodyCenter(nxt);
          addEffect({ type: 'chain', x: b.x, y: b.y, x2: c.x, y2: c.y, dur: 0.25, color: u.color });
          hitMonster(nxt, 0.7 * pw, { vfxColor: '#ffffff' });
        }
      });
    }
    later(0.2 + 6 * 0.35, () => { if (!p.dead) ultBuff(p, u.buff); });
  },

  weltenbruch(p, u, pw) {
    const x = p.x;
    const y = p.y;
    weltenbruchFx(x, feetY(p), true);
    later(0.3, () => {
      if (p.dead) return;
      for (const m of enemiesInCircle(x, y, 220)) {
        if (canLift(m)) m.lift = { start: game.time, dur: 0.7, h: 22 };
        hitMonster(m, 2 * pw, { stun: 1.5, heavy: true, vfxColor: '#ffd98a' });
      }
      hitStop(0.06);
    });
    later(1.22, () => {
      if (p.dead) return;
      ultHitCircle(x, y, 220, 3.5 * pw, { vfxColor: '#f0a830' });
      ultBuff(p, u.buff);
    });
  }
});

// Mitspieler sehen nur das Schauspiel (ultRemoteFx in ultimativ.js); y ist die Position der Figur
const MAGE_ULT_FX = {
  inferno: (x, y) => infernoFx(x, y + 9, Math.hypot(game.player.x - x, game.player.y - y) < 300),
  eiszeit: (x, y) => eiszeitFx(x, y + 9, Math.hypot(game.player.x - x, game.player.y - y) < 300),
  weltenbruch: (x, y) => weltenbruchFx(x, y + 9, Math.hypot(game.player.x - x, game.player.y - y) < 300),
  donnerkrone(x, y) {
    let owner = null;
    for (const rp of net.players.values()) if (!owner || Math.hypot(rp.x - x, rp.y - y) < Math.hypot(owner.x - x, owner.y - y)) owner = rp;
    if (owner && Math.hypot(owner.x - x, owner.y - y) < 80) {
      donnerkroneFx(owner);
      // Blitze zu den nächsten sichtbaren Monstern
      const foes = game.monsters.filter((m) => !m.dead && Math.hypot(m.x - x, m.y - y) < 280).sort((a, b) => dist(a, owner) - dist(b, owner)).slice(0, 6);
      foes.forEach((m, k) => later(0.2 + k * 0.35, () => {
        if (m.dead) return;
        const b = bodyCenter(m);
        addEffect({ type: 'chain', x: owner.x, y: feetY(owner) - 16, h1: 1.9, x2: b.x, y2: b.y, dur: 0.3, color: '#ffe94a' });
      }));
    } else {
      addEffect({ type: 'ring', x, y: y + 9, r: 120, dur: 0.6, color: '#ffe94a', width: 10, grow: true });
    }
  }
};

// --- 2D: eigene Effektarten ohne 3D (EXTRA_EFFECTS, effekte.js) ------------------------------------------------

EXTRA_EFFECTS.mcrys3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const up = t < e.rise ? easeOutBack(t / e.rise) : 1;
  const gone = clamp01((t - e.rise - e.hold) / 0.12);
  ctx.globalAlpha = 1 - gone;
  for (const q of e.list) {
    const hh = q[2] * 32 * up * (1 - gone);
    const w = q[3] * 32;
    const cx = x + q[0];
    const cy = y + q[1] * 0.6;
    const lean = q[5] * -hh * 0.6;
    ctx.fillStyle = e.color;
    ctx.strokeStyle = e.core || '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - w, cy);
    ctx.lineTo(cx + lean, cy - hh);
    ctx.lineTo(cx + w, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.2, cy - 2);
    ctx.lineTo(cx + lean * 0.8, cy - hh * 0.8);
    ctx.stroke();
  }
};
EXTRA_EFFECTS.mtrail3 = (ctx, e, k) => {
  ctx.globalCompositeOperation = e.el === 'feuer' ? 'lighter' : 'source-over';
  ctx.globalAlpha = (1 - k) * 0.7;
  ctx.strokeStyle = e.el === 'frost' ? '#3a7bff' : e.el === 'blitz' ? '#241a4a' : '#a0102e';
  ctx.lineCap = 'round';
  ctx.lineWidth = e.w;
  ctx.beginPath();
  ctx.moveTo(e.x0, e.y0);
  ctx.lineTo(e.x1, e.y1);
  ctx.stroke();
  ctx.lineWidth = e.w * 0.3;
  ctx.strokeStyle = e.el === 'frost' ? '#eafcff' : e.el === 'blitz' ? '#8a5aff' : '#ff8a4a';
  ctx.stroke();
};
EXTRA_EFFECTS.mzap3 = (ctx, e, k) => {
  const seed = Math.floor((game.time - e.start) / 0.05);
  ctx.globalCompositeOperation = 'lighter';
  for (const [w, c, al] of [[6, e.color, 0.6], [2, '#ffffff', 1]]) {
    ctx.globalAlpha = (1 - k) * al;
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(e.x0, e.y0 - 10);
    for (let j = 1; j <= 6; j++) {
      const f = j / 6;
      ctx.lineTo(e.x0 + (e.x1 - e.x0) * f + (j < 6 ? mHash(j, seed) * 18 : 0), e.y0 - 10 + (e.y1 - e.y0) * f + (j < 6 ? mHash(j + 9, seed) * 14 : 0));
    }
    ctx.stroke();
  }
};
EXTRA_EFFECTS.mdebris3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  ctx.globalAlpha = 1 - k * k;
  for (let i = 0; i < e.n; i++) {
    const a = (i / e.n) * Math.PI * 2 + e.start;
    const up = 90 + (i % 3) * 40;
    const yy = Math.min(0, -up * t + 600 * t * t * 0.5);
    ctx.fillStyle = i % 2 ? '#3e3532' : '#5a4e48';
    ctx.fillRect(x + Math.cos(a) * 70 * t - 2, y + Math.sin(a) * 30 * t + yy - 2, 4, 3);
  }
};
EXTRA_EFFECTS.mground3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start - (e.delay || 0);
  if (t < 0) return;
  const inn = clamp01(t / (e.fadeIn || 0.12));
  const out = clamp01((e.dur - (e.delay || 0) - t) / 0.5);
  const r = e.R * (0.6 + 0.4 * easeOut(inn));
  ctx.globalAlpha = inn * out * 0.75;
  if (e.tex === 'ring') {
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x, y, e.R, e.R * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (e.tex === 'hex') {
    ctx.fillStyle = 'rgba(58,123,255,0.22)';
    ctx.strokeStyle = '#9ff6ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5);
      else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5);
    }
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + e.start;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a + 0.2) * r * 0.5, y + Math.sin(a + 0.2) * r * 0.25);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5);
      ctx.stroke();
    }
  }
};
EXTRA_EFFECTS.mcrown3 = (ctx, e, k, x, y) => {
  const seed = Math.floor((game.time - e.start) / 0.06);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp01((1 - k) / 0.15);
  ctx.strokeStyle = e.color;
  ctx.lineWidth = 2;
  const hy = y - 58;
  for (let i = 0; i < 6; i++) {
    const a = (game.time - e.start) * 1.5 + (i / 6) * Math.PI * 2;
    const bx = x + Math.cos(a) * 10;
    const by = hy + Math.sin(a) * 4;
    zigzag(ctx, bx, by, bx + mHash(i, seed) * 4, by - 10, seed + i, 3);
    ctx.stroke();
  }
  glow(ctx, x, hy - 4, 14, e.color, 0.5);
};
EXTRA_EFFECTS.mmono3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const up = t < e.rise ? easeOutBack(t / e.rise) : 1;
  const tip = clamp01((t - e.tipAt) / 0.22);
  const sink = clamp01((t - e.tipAt - 0.3) / 0.4);
  ctx.globalAlpha = 1 - sink;
  for (let i = 0; i < e.n; i++) {
    const a = (i / e.n) * Math.PI * 2 + 0.2;
    const r = e.R * (1 - 0.55 * tip * tip);
    const cx = x + Math.cos(a) * r;
    const cy = y + Math.sin(a) * r * 0.5;
    const H = 48 * up * (1 - sink);
    const lean = -Math.cos(a) * 30 * tip * tip;
    ctx.fillStyle = '#3e3532';
    ctx.strokeStyle = '#1a1614';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy);
    ctx.lineTo(cx - 5 + lean, cy - H);
    ctx.lineTo(cx + 5 + lean, cy - H - 3);
    ctx.lineTo(cx + 7, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#f0a830';
    ctx.beginPath();
    ctx.moveTo(cx - 1, cy - 4);
    ctx.lineTo(cx + 1 + lean * 0.5, cy - H * 0.5);
    ctx.lineTo(cx + lean * 0.8, cy - H * 0.8);
    ctx.stroke();
  }
};
