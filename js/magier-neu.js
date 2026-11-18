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
  const l = hyp(fx, fy) || 1;
  return { x: fx / l, y: fy / l };
};
// Ziel oder Punkt vor der Figur (bis range)
function mage2Point(p, sk, front = 0.6) {
  // seit 13.85: Fertigkeiten mit Zielkreis (sk.aim, Erdspitzen) wirken am gewählten Ort
  if (sk.aim) {
    const pt = skillAimPoint(sk);
    faceTowards(pt.x, pt.y);
    return { x: pt.x, y: pt.y, t: null };
  }
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
  // seit 13.42: gewähltes Ziel (auch etwas außer Reichweite) hat Vorrang
  // seit 13.85 nur ein bewusst gewähltes Ziel (setTarget); ein Auto-Ziel wählt pickTarget neu
  const f = targetIsManual(game.target) && !game.target.dead && !game.target.hidden && dist(p, game.target) <= sk.range + 200 ? game.target : null;
  const t = f || pickTarget(sk.range);
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
  // seit 13.85: auch die globale Abklingzeit der übrigen Zauber zurücknehmen
  if (c.i >= 0) undoGcd(p, c.i);
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
  // seit 13.42: das gewählte Ziel bleibt das Ziel, auch wenn es etwas weiter weg ist (Reichweite wächst mit)
  const focus = targetIsManual(game.target) && !game.target.dead && !game.target.hidden && dist(p, game.target) <= sk.range + 200 ? game.target : null;
  const t = c.target && !c.target.dead && dist(p, c.target) <= sk.range + 200 ? c.target : focus || pickTarget(sk.range);
  if (t) faceTowards(t.x, t.y);
  startSwing(p, 'stoss', 0.35);
  const tx = t ? t.x : p.x + p.facing.x * sk.range;
  const ty = t ? t.y : p.y + p.facing.y * sk.range;
  later(0.1, () => {
    if (p.dead) return;
    const tt = t && !t.dead ? t : null;
    spawnProjectile({ ...mageBolt(p, sk, tt, c.pw, c.lvl, true), focusOnly: true, big: sk.big, radius: 16, range: tt ? Math.max(sk.range + 40, dist(p, tt) + 80) : sk.range + 40 });
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
    spawnProjectile({ ...mageBolt(rp, sk, null, 0, 1, false), big: sk.big, radius: 16, dir: null, aimAt: { x: d.tx, y: d.ty }, range: hyp(d.tx - rp.x, d.ty - rp.y) + 60 });
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
    const dd = hyp(m.x - d.tx, m.y - d.ty);
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
  const len = Math.max(40, hyp(x1 - x0, y1 - y0));
  const fly = len / sk.speed;
  addEffect({ type: 'mphoenix3', x: (x0 + x1) / 2, y: (y0 + y1) / 2 + 9, x0, y0: y0 + 9, x1, y1: y1 + 9, fly, dur: fly + 0.9 });
  later(fly, () => {
    addEffect({ type: 'mburst3', x: x1, y: y1 + 9, R: sk.blast.r, dur: 2.6 });
    if (!V3.on) addEffect({ type: 'decal', kind: 'scorch', x: x1, y: y1 + 9, r: sk.blast.r * 0.55, dur: 3, color: '#2a0a0a' });
    if (owner === game.player) shakeScreen(7);
  });
  if (!local) return;
  // auf dem Weg: wer nah an der Bahn steht, brennt mit (je Gegner einmal)
  const vx = x1 - x0;
  const vy = y1 - y0;
  const L2 = vx * vx + vy * vy || 1;
  const hitSet = new Set();
  for (const m of enemiesNear((x0 + x1) / 2, (y0 + y1) / 2, Math.sqrt(L2) / 2 + sk.pathR)) {
    const u = clamp01(((m.x - x0) * vx + (m.y - y0) * vy) / L2);
    if (u >= 0.95 || hyp(x0 + vx * u - m.x, y0 + vy * u - m.y) > sk.pathR + m.r) continue;
    hitSet.add(m);
    later(fly * u, () => { if (!m.dead) hitMonster(m, sk.dmg * sk.pathMul * pw, { skill: sk.id, burn: sk.burn, vfxColor: '#ffb04a' }); });
  }
  later(fly, () => {
    const main = target && !target.dead ? target : null;
    for (const m of enemiesInCircle(x1, y1, sk.blast.r)) {
      const burning = m.burn && m.burn.until > game.time;
      const mul = (m === main ? 1 : sk.blast.mul) * (burning ? 1 + sk.combust : 1);
      // seit 13.69 betäubt die Explosion (sk.stun)
      hitMonster(m, sk.dmg * mul * pw, { skill: sk.id, burn: sk.burn, stun: sk.stun, heavy: true, knockback: 30, from: { x: x1, y: y1 }, vfxColor: burning ? '#ffffff' : '#ffb04a' });
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
// Lähmung sichtbar machen: zuckende Bögen am Körper (mpara3), nur wo Lähmung auch wirkt (keine Bosse, Steine, Duellgegner)
function paraFx(m, dur) {
  if (canLift(m) && dur > 0) addEffect({ type: 'mpara3', follow: m, x: m.x, y: m.y, dur });
}
function spearFx(owner, x0, y0, x1, y1, sk, local, pw) {
  const vx = x1 - x0;
  const vy = y1 - y0;
  const L2 = vx * vx + vy * vy || 1;
  const len = Math.sqrt(L2);
  // gleiches Tempo wie bisher (390 in 0,16 s): der längere Speer ist etwas länger unterwegs
  const fly = Math.max(0.08, len / 2440);
  // seit der Überarbeitung des Blitzmagiers: längerer, wuchtiger Speer, die Bahn glüht länger nach (0,7 → 1,05 s)
  addEffect({ type: 'mspear3', x: (x0 + x1) / 2, y: (y0 + y1) / 2 + 9, x0, y0: y0 + 9, x1, y1: y1 + 9, fly, dur: fly + 0.85, seed: Math.random() * 90 });
  later(fly, () => {
    addEffect({ type: 'sparks3', x: x1, y: y1 + 9, h: 0.8, count: 14, color: '#fff7b0', speed: 3, up: 1.1, dur: 0.5 });
    if (!V3.on) particles(x1, y1 - 14, { count: 12, color: ['#ffffff', '#fff7b0', '#8a5aff'], speed: [70, 190], life: [0.2, 0.4], size: [1.5, 3], shape: 'spark', drag: 4 });
  });
  if (owner === game.player) shakeScreen(2.5);
  // Mitspieler: nur das Bild – wer auf der Bahn steht, zeigt ebenfalls die Lähmung
  const foes = local ? enemiesNear((x0 + x1) / 2, (y0 + y1) / 2, len / 2 + sk.width) : game.monsters;
  for (const m of foes) {
    if (m.dead || Math.abs(m.x - (x0 + x1) / 2) > len / 2 + 80 || Math.abs(m.y - (y0 + y1) / 2) > len / 2 + 80) continue;
    const u = clamp01(((m.x - x0) * vx + (m.y - y0) * vy) / L2);
    if (hyp(x0 + vx * u - m.x, y0 + vy * u - m.y) > sk.width + m.r) continue;
    later(fly * u, () => {
      if (m.dead) return;
      if (local) {
        // lähmt (sk.stun) und verlangsamt danach noch sk.slow.duration (die Verlangsamung läuft ab dem Treffer)
        hitMonster(m, sk.dmg * pw, { skill: sk.id, stun: sk.stun, slow: sk.slow && { amount: sk.slow.amount, duration: sk.stun + sk.slow.duration }, heavy: true, vfxColor: '#ffffff' });
        if (!m.duelProxy) m.charged = game.time + sk.charge;
      }
      if (m.dead) return;
      paraFx(m, sk.stun);
      addEffect({ type: 'sparks3', x: m.x, y: feetY(m), h: 0.8, count: 6, color: '#fff7b0', speed: 2.2, up: 1, dur: 0.35 });
    });
  }
}
MAGE2_REMOTE.mspear = (rp, sk, d) => spearFx(rp, d.x ?? rp.x, d.y ?? rp.y, d.tx, d.ty, sk, false, 0);

// --- Blitz: Kettenblitz als Soforttreffer ----------------------------------------------------------------
// Seit der Überarbeitung des Blitzmagiers fliegt kein kleiner Funke mehr: ein ganzer Blitz fährt vom Zepter ins Ziel
// und springt dann – leicht versetzt – zu den nächsten Gegnern. Trefferregeln wie beim alten Geschoss (kampf.js,
// updateProjectiles): getroffen wird der erste Gegner auf der Strecke zum Ziel, jeder Sprung sucht den nächsten noch
// nicht getroffenen Gegner im Umkreis CHAIN_R und ist um chainMul schwächer; ein Duell- oder Arenagegner beendet die
// Kette. SKILL_TYPES.mbolt (magier.js) ruft chainCast, wenn sk.instant gesetzt ist.
const CHAIN_R = 180;
const CHAIN_GAP = 0.1;
const KUGEL_H = 2.5; // Höhe der Blitzkugel (Einheiten) über dem Boden
function chainCast(sk, pw, lvl) {
  const p = game.player;
  const t = pickTarget(sk.range);
  if (t) faceTowards(t.x, t.y);
  lockPlayer(p, 0.12);
  later(0.12, () => { if (!p.dead) chainStrike(p, sk, t && !t.dead ? t : null, pw, lvl); });
  return {
    tx: t ? Math.round(t.x) : Math.round(p.x + p.facing.x * sk.range),
    ty: t ? Math.round(t.y) : Math.round(p.y + p.facing.y * sk.range)
  };
}
// erster lebender Gegner auf der Strecke (x, y) → dir, höchstens reach weit (Trefferbreite wie das Geschoss: r + 7)
function chainFirst(x, y, dir, reach, list) {
  let best = null;
  let bu = Infinity;
  for (const m of list) {
    if (m.dead) continue;
    const u = (m.x - x) * dir.x + (m.y - y) * dir.y;
    if (u < -m.r || u > reach + m.r + 7) continue;
    const d = Math.abs((m.x - x) * dir.y - (m.y - y) * dir.x);
    const rr = m.r + 7;
    if (d > rr) continue;
    const at = u - Math.sqrt(rr * rr - d * d);
    if (at > reach || at >= bu) continue;
    bu = at;
    best = m;
  }
  return best;
}
// nächster noch nicht getroffener Gegner im Sprungkreis um m
function chainNext(m, list, hit) {
  let best = null;
  let bd = CHAIN_R;
  for (const o of list) {
    if (o.dead || o === m || hit.has(o.id)) continue;
    const d = hyp(o.x - m.x, o.y - m.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function chainStrike(owner, sk, t, pw, lvl) {
  const x0 = owner.x;
  const y0 = owner.y;
  const dir = t ? dirOf(t.x - x0, t.y - y0) : dirOf(owner.facing.x, owner.facing.y);
  const reach = sk.range + 40;
  // Fokus respektieren: der erste Blitz schlägt im bewusst gewählten Ziel ein (Klick, Antippen, Tab), auch wenn Monster
  // davor stehen; erst die Sprünge gehen weiter zu den Nächsten
  const focus = t && !t.dead && !t.hidden && targetIsManual(t) && dist(owner, t) - (t.r || 0) <= reach ? t : null;
  const first = focus || chainFirst(x0, y0, dir, reach, enemiesNear(x0 + dir.x * reach / 2, y0 + dir.y * reach / 2, reach / 2 + 80));
  if (!first) {
    // ins Leere: der Blitz fährt in Blickrichtung und verpufft
    chainBoltFx(owner, null, { x: x0 + dir.x * reach, y: y0 + dir.y * reach }, 0);
    return;
  }
  const pr = { hit: new Set(), mul: sk.dmg * pw, color: mageElOf(sk.el).main };
  let left = sk.chain || 0;
  const strike = (src, m, k) => {
    chainBoltFx(k ? null : owner, src, m, k);
    pr.hit.add(m.id);
    // Entladung aufgeladener Gegner (hitMul) und Aufräumen danach (afterHit) wie beim Geschoss
    const hm = boltHitMul(sk, m);
    hitMonster(m, pr.mul * hm, { stun: sk.stun, slow: sk.slow, burn: sk.burn, vfxColor: pr.color, skill: sk.id, duelMul: sk.duelMul });
    boltAfterHit(sk, m, pr, pw, lvl);
    if (m.duelProxy || left <= 0) return;
    later(CHAIN_GAP, () => {
      const next = chainNext(m, enemiesNear(m.x, m.y, CHAIN_R), pr.hit);
      if (!next) return;
      // jeder Sprung schwächer (Kettenblitz −20 %)
      if (sk.chainMul) pr.mul *= sk.chainMul;
      left--;
      strike(m, next, k + 1);
    });
  };
  strike(null, first, 0);
}
// Bild: Blitz von der Hand (owner) bzw. vom letzten Getroffenen (src) nach dst (Gegner oder Punkt), dazu der Einschlag.
// k = 0 der große Blitz, k > 0 die dünneren Sprünge
function chainBoltFx(owner, src, dst, k) {
  const isFoe = dst.r != null;
  const bx = dst.x;
  const by = isFoe ? feetY(dst) : dst.y + 9;
  const bh = isFoe ? Math.max(0.5, figureHeight(dst) * 0.5 * U3) : 0.9;
  let ax;
  let ay;
  let ah;
  if (owner) {
    // aus dem Zepter: etwas vor der Figur in Brusthöhe
    const f = owner.facing || { x: 0, y: 1 };
    ax = owner.x + f.x * 14;
    ay = feetY(owner) + f.y * 10;
    ah = 1.25;
  } else {
    ax = src.x;
    ay = feetY(src);
    ah = Math.max(0.5, figureHeight(src) * 0.5 * U3);
  }
  const s = k ? 0.62 : 1;
  addEffect({ type: 'mkbolt3', x: (ax + bx) / 2, y: (ay + by) / 2, ax, ay, ah, bx, by, bh, to: isFoe ? dst : null, s, branch: k ? 1 : 3, dur: k ? 0.34 : 0.46, seed: Math.random() * 90 });
  zapHitFx(bx, by, bh, isFoe ? dst : null, k ? 0.7 : 1.25, isFoe ? (k ? 0.3 : 0.45) : 0);
  if (owner === game.player) shakeScreen(3);
}
// Einschlag eines Blitzes: Lichtblitz, Funkenstoß, kurze Bögen ringsum – und am Gegner knistert es noch kurz (crackle s)
function zapHitFx(x, fy, hgt, m, s, crackle) {
  addEffect({ type: 'mkhit3', x, y: fy, hgt, s, dur: 0.32 + 0.1 * s, seed: Math.random() * 90 });
  addEffect({ type: 'sparks3', x, y: fy, h: hgt, count: Math.round(9 * s), color: '#fff7b0', speed: 2.4 + s, up: 1.1, dur: 0.45 });
  if (!V3.on) particles(x, fy - hgt * TILE * 0.9, { count: Math.round(10 * s), color: ['#ffffff', '#fff7b0', '#8a5aff'], speed: [80, 220], life: [0.18, 0.38], size: [1.5, 3], shape: 'spark', drag: 4 });
  if (m && crackle > 0 && !m.isStone) addEffect({ type: 'mpara3', follow: m, x: m.x, y: m.y, dur: crackle });
}
// Mitspieler: nur das Bild. Ziel und Sprünge aus den Monstern am gemeldeten Ort (d.tx, d.ty)
function chainRemote(rp, sk, d) {
  later(0.12, () => {
    if (rp.gone) return;
    const x0 = rp.x;
    const y0 = rp.y;
    const far = hyp(d.tx - x0, d.ty - y0);
    const dir = far > 1 ? dirOf(d.tx - x0, d.ty - y0) : dirOf(rp.facing.x, rp.facing.y);
    const reach = Math.min(sk.range + 60, far + 30);
    const near = game.monsters.filter((m) => !m.dead && Math.abs(m.x - x0) < reach + CHAIN_R * 3 && Math.abs(m.y - y0) < reach + CHAIN_R * 3);
    const first = chainFirst(x0, y0, dir, reach, near);
    if (!first) {
      // kein Monster dort (z. B. ein Spieler im Duell): der Blitz endet am gemeldeten Punkt
      chainBoltFx(rp, null, { x: d.tx, y: d.ty }, 0);
      return;
    }
    const hit = new Set([first.id]);
    chainBoltFx(rp, null, first, 0);
    let from = first;
    for (let k = 1; k <= (sk.chain || 0); k++) {
      later(k * CHAIN_GAP, () => {
        const next = from && chainNext(from, near, hit);
        if (!next) { from = null; return; }
        hit.add(next.id);
        chainBoltFx(null, from, next, k);
        from = next;
      });
    }
  });
}

// --- Blitz: Kugelblitz (Ablauf in magier.js: sigilFx/sigilTick; Bild mkugel3) -----------------------------
// Blitz aus der Kugel über (x, fy) in den Gegner m
function kugelZapFx(x, fy, m, last) {
  const by = feetY(m);
  const bh = Math.max(0.5, figureHeight(m) * 0.5 * U3);
  addEffect({ type: 'mkbolt3', x: (x + m.x) / 2, y: (fy + by) / 2, ax: x, ay: fy, ah: KUGEL_H, bx: m.x, by, bh, to: m, s: last ? 1 : 0.85, branch: last ? 2 : 1, dur: last ? 0.42 : 0.34, seed: Math.random() * 90 });
  // kleinerer Einschlag als beim Kettenblitz: die Kugel bleibt der Blickfang
  zapHitFx(m.x, by, bh, m, last ? 0.9 : 0.5, last ? 0.5 : 0.25);
}
// die Kugel zerplatzt: Funkenstoß aus der Mitte (der Lichtblitz und die Blitze ringsum stecken in mkugel3)
function kugelBurstFx(x, fy, R) {
  addEffect({ type: 'sparks3', x, y: fy, h: KUGEL_H, count: 22, color: '#fff7b0', speed: 4.2, up: 0.9, dur: 0.6 });
  if (!V3.on) particles(x, fy - KUGEL_H * TILE * 0.9, { count: 26, color: ['#ffffff', '#fff7b0', '#ffe94a', '#8a5aff'], speed: [90, 300], life: [0.25, 0.55], size: [1.5, 3.5], shape: 'spark', drag: 3.5 });
}

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
  // seit der Überarbeitung des Blitzmagiers tobt unter der Wolke das Gewitterfeld (vorher beim Kugelblitz): bei jedem
  // Einschlag fahren mehrere Blitze vom Himmel ins Feld (strikes, every), zum Schluss (fin) besonders viele
  addEffect({ type: 'mstorm3', x, y: y + 9, R: sk.radius, form: sk.form, strikes: sk.strikes, every: sk.every, fin: sk.form + sk.strikes * sk.every + 0.1, dur: total + 0.8, seed: Math.random() * 90 });
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
      addEffect({ type: 'mstrike3', x: tx, y: ty + 9, dur: 0.5, s: 1.15, storm: true, seed: Math.random() * 90 });
      if (!V3.on) particles(tx, ty - 6, { count: 8, color: ['#ffffff', '#fff7b0', '#8a5aff'], speed: [70, 200], life: [0.18, 0.36], size: [1.5, 3], shape: 'spark', drag: 4 });
      if (near) shakeScreen(2);
      if (m) {
        hitMonster(m, sk.dmg * pw, { skill: sk.id, stun: 0.2, heavy: true, vfxColor: '#ffffff' });
        for (const o of enemiesInCircle(tx, ty, 40)) if (o !== m) hitMonster(o, sk.dmg * 0.4 * pw, { skill: sk.id, vfxColor: '#fff7b0' });
      }
    });
  }
  // Schluss (seit 12.0): die Wolke entlädt sich – ein Blitznetz springt zwischen allen Gegnern im Feld und lähmt sie
  later(sk.form + sk.strikes * sk.every + 0.1, () => {
    const caught = enemiesInCircle(x, y, sk.radius).filter((m) => !m.dead);
    addEffect({ type: 'mweb3', x, y: y + 9, foes: caught.slice(0, 12), dur: 0.7 });
    addEffect({ type: 'mstrike3', x, y: y + 9, dur: 0.6, s: 1.8, storm: true, seed: Math.random() * 90 });
    for (const m of caught) addEffect({ type: 'mpara3', follow: m, x: m.x, y: m.y, dur: sk.final.stun });
    if (near) shakeScreen(6);
    if (!local) return;
    for (const m of caught) {
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
        const r = hyp(m.x - x, m.y - y);
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
          const d = hyp(m.x - x, m.y - y) || 1;
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
// seit 14.3 mit den Flammenbildern aus feuerfeld.js (flame2d, spark2d, smoke2d): Feuer statt runder Lichtflecken
EXTRA_EFFECTS.mcast3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const r = 8 + 14 * k;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow2(ctx, x + 10, y - 30, r * 1.6, '#ff6a1a', 0.5);
  glow2(ctx, x + 10, y - 30, r * 0.7, '#fff1c8', 0.9);
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 4; i++) {
    const a = t * 3.2 + i * 1.57;
    flame2d(ctx, x + 10 + Math.cos(a) * r * 0.6, y - 26 + Math.sin(a) * r * 0.3, r * 0.9, r * 1.8, t, i + 11, 0.85);
  }
  ctx.restore();
};
EXTRA_EFFECTS.mburst3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  if (t > 1.15) return;
  const u = t / 1.15;
  const g = easeOut(Math.min(1, t / 0.3));
  ctx.save();
  // Glutkugel steigt auf und wird zu Rauch, Rauchring rollt nach außen
  ctx.globalCompositeOperation = 'lighter';
  glow2(ctx, x, y - 20 - u * 50, e.R * (0.3 + 0.5 * g), u < 0.3 ? '#fff1c8' : '#ff5a1a', 0.85 * (1 - u));
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rr = e.R * (0.3 + 0.7 * easeOut(u));
    smoke2d(ctx, x + Math.cos(a) * rr, y - 30 - u * 50 + Math.sin(a) * rr * 0.35, 14 + u * 16, 0.5 * (1 - u));
  }
  if (u < 0.5) for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    flame2d(ctx, x + Math.cos(a) * e.R * 0.5 * g, y + Math.sin(a) * e.R * 0.3 * g, 18, 36 * (1 - u * 2), t, i + 40, 1 - u * 2);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const a = n2h(i, 5) * 6.28;
    const vh = 80 + 120 * n2h(i, 6);
    const vy = 90 + 140 * n2h(i, 7);
    const py = vy * t - 160 * t * t;
    if (py < 0) continue;
    spark2d(ctx, x + Math.cos(a) * vh * t, y + Math.sin(a) * vh * t * 0.5 - py, 6, i % 2 ? '#ffd36a' : '#fff1c8', 1 - u);
  }
  ctx.restore();
};
EXTRA_EFFECTS.mignite3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  ctx.save();
  for (let i = 0; i < 3; i++) flame2d(ctx, x - 8 + i * 8, y + 2, 14, 30 + 8 * Math.sin(t * 9 + i), t, i, 0.85);
  ctx.globalCompositeOperation = 'lighter';
  glow2(ctx, x, y - 16, 16, '#ff6a1a', 0.35 + 0.15 * Math.sin(game.time * 20));
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.9 + i / 3) % 1;
    spark2d(ctx, x + Math.sin(i * 2 + t * 3) * 8, y - 20 - ph * 30, 4, '#ffd36a', 1 - ph);
  }
  ctx.restore();
};
EXTRA_EFFECTS.mphoenix3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const u = Math.min(1, t / e.fly);
  if (u >= 1) return;
  const bx = x + (e.x0 + (e.x1 - e.x0) * u - e.x);
  const by = y + (e.y0 + (e.y1 - e.y0) * u - e.y) - 34 - Math.sin(u * Math.PI) * 20;
  const dir = Math.sign(e.x1 - e.x0) || 1;
  const flap = Math.sin(t * 10.5);
  ctx.save();
  // Flügel aus Flammen (seitlich gelegte Flammenbilder), Schweif, Leib
  for (const s of [-1, 1]) {
    for (let j = 0; j < 4; j++) {
      const v = (j + 1) / 4;
      const ang = s * (1.25 - 0.5 * v) - flap * 0.45 * v * s;
      flame2d(ctx, bx + s * 6 * v, by + 4, 16 - 4 * v, 26 + 14 * v, t, j + (s > 0 ? 4 : 0), 0.95, ang);
    }
  }
  for (let j = 0; j < 3; j++) flame2d(ctx, bx - dir * (10 + j * 9), by + 8 + j * 2, 14 - j * 3, 26 - j * 4, t, 20 + j, 0.85 - j * 0.2, -dir * 1.4);
  ctx.globalCompositeOperation = 'lighter';
  glow2(ctx, bx, by, 22, '#ffb04a', 0.8);
  glow2(ctx, bx + dir * 6, by - 4, 8, '#ffffff', 0.9);
  ctx.restore();
};
// 2D-Blitze des Blitzmagiers (seit der Überarbeitung): kräftig und gezackt – dunkelvioletter Saum (bleibt auf hellem
// Boden sichtbar), gelb leuchtender Mantel, weißer Kern. Die Zacken stehen je Zuckung (seed) fest statt in jedem
// Bild neu zu rauschen; branch = Zahl der Seitenäste
function blz2Pts(ax, ay, bx, by, segs, jit, seed) {
  const pts = [[ax, ay]];
  for (let i = 1; i < segs; i++) {
    const u = i / segs;
    const env = jit * (0.55 + 0.45 * Math.sin(u * Math.PI));
    pts.push([ax + (bx - ax) * u + (n2h(i, seed) - 0.5) * 2 * env, ay + (by - ay) * u + (n2h(i, seed + 3.1) - 0.5) * 2 * env]);
  }
  pts.push([bx, by]);
  return pts;
}
function blz2Stroke(ctx, pts, w, a, col, rim) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    if (i) ctx.lineTo(pts[i][0], pts[i][1]);
    else ctx.moveTo(pts[i][0], pts[i][1]);
  }
  if (rim) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a * 0.6;
    ctx.strokeStyle = '#2e1a8a';
    ctx.lineWidth = w * 2.2 + 2;
    ctx.stroke();
  }
  // weicher Schein leuchtend, der Mantel deckend (bleibt auf hellem Boden gelb), der Kern wieder leuchtend weiß
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = col;
  ctx.globalAlpha = a * 0.3;
  ctx.lineWidth = w * 3.4;
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = a;
  ctx.lineWidth = w * 1.35;
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, w * 0.55);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}
function blz2(ctx, ax, ay, bx, by, w, a, seed, o) {
  if (a <= 0.01) return;
  const segs = (o && o.segs) || 7;
  const jit = o && o.jit != null ? o.jit : 9;
  const col = (o && o.color) || '#ffe94a';
  const pts = blz2Pts(ax, ay, bx, by, segs, jit, seed);
  blz2Stroke(ctx, pts, w, a, col, !(o && o.rim === false));
  const nb = (o && o.branch) || 0;
  if (!nb || segs < 3) return;
  const L = hyp(bx - ax, by - ay);
  const ang = Math.atan2(by - ay, bx - ax);
  for (let j = 0; j < nb; j++) {
    const p = pts[1 + Math.floor(n2h(j, seed + 21) * (segs - 2))];
    const ba = ang + (n2h(j, seed + 5) < 0.5 ? -1 : 1) * (0.4 + 0.55 * n2h(j, seed + 9));
    const bl = L * (0.14 + 0.16 * n2h(j, seed + 2));
    blz2Stroke(ctx, blz2Pts(p[0], p[1], p[0] + Math.cos(ba) * bl, p[1] + Math.sin(ba) * bl, 3, jit * 0.5, seed + j * 3.3), w * 0.5, a * 0.85, col, false);
  }
}
// Höhe über dem Boden: 3D-Einheiten → Pixel in der 2D-Ansicht
const BLZ2_H = TILE * 0.9;
// Blitzspeer in 2D: langer Speer mit gleißender Spitze, dahinter die gezackte Bahn, die nachglüht
EXTRA_EFFECTS.mspear3 = (ctx, e) => {
  const t = game.time - e.start;
  const u = Math.min(1, t / e.fly);
  const fade = Math.max(0, 1 - Math.max(0, t - e.fly) / (e.dur - e.fly));
  const ax = e.x0;
  const ay = e.y0 - 30;
  const tx = e.x0 + (e.x1 - e.x0) * u;
  const ty = e.y0 + (e.y1 - e.y0) * u - 30;
  const len = hyp(tx - ax, ty - ay);
  if (len < 2) return;
  ctx.save();
  blz2(ctx, ax, ay, tx, ty, 2 + 4 * fade, Math.min(1, fade * 1.5), (e.seed || 0) + Math.floor(t / 0.05), { segs: Math.max(4, Math.round(len / 36)), jit: 4 + 8 * fade, branch: 2 });
  ctx.globalAlpha = 1;
  if (u < 1) {
    const dx = (tx - ax) / len;
    const dy = (ty - ay) / len;
    const sl = Math.min(len, 110);
    // Schaft: gerade und gleißend
    blz2Stroke(ctx, [[tx - dx * sl, ty - dy * sl], [tx, ty]], 5, 1, '#ffe94a', true);
    // lange Spitze (Raute)
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(tx + dx * 16, ty + dy * 16);
    ctx.lineTo(tx - dx * 30 - dy * 9, ty - dy * 30 + dx * 9);
    ctx.lineTo(tx - dx * 20, ty - dy * 20);
    ctx.lineTo(tx - dx * 30 + dy * 9, ty - dy * 30 - dx * 9);
    ctx.closePath();
    ctx.fillStyle = '#fffbe0';
    ctx.strokeStyle = '#8a5aff';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, tx, ty, 38, '#ffe94a', 0.8);
    glow2(ctx, tx, ty, 16, '#ffffff', 1);
  } else if (t - e.fly < 0.3) {
    const f = 1 - (t - e.fly) / 0.3;
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, tx, ty, 26 + 30 * (1 - f), '#fff7b0', f);
  }
  ctx.restore();
};
// Kettenblitz und Blitze des Kugelblitzes in 2D: erst gleißend dick, dann dünner nachglühend
EXTRA_EFFECTS.mkbolt3 = (ctx, e, k) => {
  const t = game.time - e.start;
  const m = e.to;
  if (m && !m.dead) {
    e.bx = m.x;
    e.by = feetY(m);
  }
  const flash = clamp01(1 - t / 0.14);
  const ax = e.ax;
  const ay = e.ay - e.ah * BLZ2_H;
  const bx = e.bx;
  const by = e.by - e.bh * BLZ2_H;
  const len = hyp(bx - ax, by - ay);
  ctx.save();
  blz2(ctx, ax, ay, bx, by, e.s * (2.4 + 3.8 * flash), Math.min(1, (1 - k) * 1.6), e.seed + Math.floor(t / 0.05), { segs: Math.max(3, Math.min(12, Math.round(len / 28))), jit: Math.min(len * 0.12, 6 + 8 * e.s), branch: e.branch });
  if (flash > 0 && e.s >= 0.9) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, ax, ay, 30, '#fff7b0', flash);
  }
  ctx.restore();
};
// Einschlag in 2D: Lichtblitz und kurze Bögen ringsum
EXTRA_EFFECTS.mkhit3 = (ctx, e, k) => {
  const t = game.time - e.start;
  const s = e.s;
  const cy = e.y - e.hgt * BLZ2_H;
  const f = 1 - k;
  const g = easeOut(k);
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  glow2(ctx, e.x, cy, (28 + 32 * g) * s, '#ffe94a', 0.75 * f);
  glow2(ctx, e.x, cy, (13 + 15 * g) * s, '#ffffff', f);
  const n = Math.round(4 * s) + 3;
  const sd = e.seed + Math.floor(t / 0.05);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + n2h(i, e.seed) * 0.9;
    const r1 = (16 + 24 * n2h(i, sd)) * s * (0.6 + 0.6 * k);
    blz2(ctx, e.x + Math.cos(a) * 5 * s, cy + Math.sin(a) * 4 * s, e.x + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.8, 1.5 * s, f, sd + i * 3.7, { segs: 3, jit: 4 * s, rim: false });
  }
  ctx.restore();
};
// Gewitterwolke in 2D: dunkle Wolke oben, darunter fahren bei jedem Einschlag mehrere Blitze ins Feld
EXTRA_EFFECTS.mstorm3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const grow = easeOut(Math.min(1, t / e.form));
  const fade = clamp01((e.dur - t) / 0.7);
  const cy = y - 140;
  const R = e.R;
  const T = t - e.form;
  const ns = e.strikes || 0;
  ctx.save();
  for (let j = 0; j <= ns && ns; j++) {
    const fin = j === ns;
    const u = fin ? t - e.fin : T - j * e.every;
    if (!(u >= 0 && u < 0.3)) continue;
    const f = 1 - u / 0.3;
    const nb = fin ? 7 : 3;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, x, y - 8, R * (0.9 + 0.2 * f), '#ffe94a', f * (fin ? 0.38 : 0.16));
    for (let b = 0; b < nb; b++) {
      const a = n2h(b, e.seed + j * 7.3) * 6.283;
      const d = Math.sqrt(n2h(b, e.seed + j * 3.1 + 5)) * R * 0.85;
      const gx = x + Math.cos(a) * d;
      const gy = y + Math.sin(a) * d * 0.8;
      blz2(ctx, gx + (n2h(b, j + 2) - 0.5) * 44, cy + 10, gx, gy, fin ? 4 : 3, f, e.seed + j * 11 + b + Math.floor(u / 0.05) * 1.7, { segs: 6, jit: 13, branch: 1, rim: b < 4 });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      glow2(ctx, gx, gy - 4, (fin ? 30 : 22) * (0.6 + 0.4 * f), '#fff7b0', 0.9 * f);
    }
  }
  // knisternde Bögen dicht über dem Boden
  if (T > 0 && t < (e.fin || 0) + 0.3) {
    for (let i = 0; i < 3; i++) {
      const a0 = Math.random() * 6.283;
      const r0 = Math.random() * R * 0.8;
      const a1 = a0 + (Math.random() - 0.5) * 1.6;
      const r1 = Math.random() * R * 0.8;
      blz2(ctx, x + Math.cos(a0) * r0, y + Math.sin(a0) * r0 * 0.8 - 3, x + Math.cos(a1) * r1, y + Math.sin(a1) * r1 * 0.8 - 3, 1.2, 0.75 * fade, Math.random() * 90, { segs: 4, jit: 5, rim: false, color: i % 2 ? '#fff7b0' : '#b89aff' });
    }
  }
  // Wolke: dunkle Ballen, oben heller, dreht sich langsam; innen Wetterleuchten
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  for (let i = 0; i < 12; i++) {
    const a = n2h(i, 1) * 6.283 + t * 0.22 * (i % 2 ? 1 : -0.7);
    const r = R * Math.sqrt(n2h(i, 2)) * 0.9 * grow;
    const top = i % 3 === 0;
    glow2(ctx, x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.3 - (top ? 12 : 0), (38 + n2h(i, 3) * 36) * grow, top ? '#4a4668' : i % 2 ? '#14141e' : '#221e30', 0.9 * fade);
  }
  if (Math.random() < 0.4) {
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, x + (Math.random() - 0.5) * R, cy + 2, 30 + Math.random() * 34, Math.random() < 0.5 ? '#c8b0ff' : '#fff7b0', 0.5 * fade);
  }
  ctx.restore();
};
// Größe der Blitzkugel (0…1,3): wächst beim Entstehen, pulsiert und bläht sich bei jedem Schlag kurz auf
function kugelSize(e, t) {
  let g = easeOut(clamp01(t / Math.max(0.05, e.delay))) * (1 + 0.07 * Math.sin(t * 15));
  if (t >= e.delay && t <= e.last + 0.02) {
    const q = (t - e.delay) / e.every;
    g *= 1 + 0.3 * Math.max(0, 1 - ((q - Math.floor(q)) * e.every) / 0.18);
  }
  return g;
}
// Kugelblitz in 2D: grell knisternde Kugel über der Mitte, kurze Bögen ringsum in den Boden, zum Schluss zerplatzt sie
EXTRA_EFFECTS.mkugel3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const end = clamp01((e.dur - t) / 0.3);
  const cy = y - KUGEL_H * BLZ2_H;
  const tb = t - e.last;
  ctx.save();
  if (e.stop || tb < 0.05) {
    const g = kugelSize(e, t);
    const r = 17 * g;
    ctx.globalAlpha = 1;
    // dunkler Hof: hebt die Kugel von hellem Boden ab
    glow2(ctx, x, cy, r * 2.7, '#150c4a', 0.75 * end);
    glow2(ctx, x, cy, r * 1.7, '#ffd21e', end);
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, x, cy, r * 3.6, '#8a5aff', 0.4 * end);
    glow2(ctx, x, cy, r * 1.5, '#ffe94a', 0.5 * end);
    glow2(ctx, x, cy, r * 0.8, '#ffffff', end);
    for (let i = 0; i < 5; i++) {
      const a0 = Math.random() * 6.283;
      const a1 = a0 + 0.9 + Math.random() * 1.5;
      const rr = r * 0.72;
      blz2(ctx, x + Math.cos(a0) * rr, cy + Math.sin(a0) * rr, x + Math.cos(a1) * rr, cy + Math.sin(a1) * rr, 1.2, end, Math.random() * 90, { segs: 4, jit: r * 0.35, rim: false, color: i % 2 ? '#fff7b0' : '#c8b0ff' });
    }
    const sd = Math.floor(t / 0.09);
    for (let i = 0; i < 3 && t > e.delay * 0.6; i++) {
      if (n2h(i, sd + e.seed) > 0.7) continue;
      const a = n2h(i, sd * 1.3 + e.seed) * 6.283;
      const d = e.R * (0.2 + 0.5 * n2h(i, sd * 2.1 + 1));
      const gx = x + Math.cos(a) * d;
      const gy = y + Math.sin(a) * d * 0.8;
      blz2(ctx, x, cy, gx, gy, 1.7, 0.9 * end, sd * 3.1 + i * 7 + e.seed, { segs: 5, jit: 9, rim: false });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      glow2(ctx, gx, gy - 2, 12, '#fff7b0', 0.7 * end);
    }
  }
  if (!e.stop && tb >= 0) {
    const u = clamp01(tb / 0.45);
    const f = 1 - u;
    const g = easeOut(u);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, x, cy, 50 + 110 * g, '#ffe94a', 0.7 * f);
    glow2(ctx, x, cy, 24 + 60 * g, '#ffffff', f);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.283 + n2h(i, e.seed);
      const d = e.R * (0.5 + 0.45 * n2h(i, e.seed + 4));
      blz2(ctx, x, cy, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 0.8 + 3.2 * f, f, e.seed + i + Math.floor(tb / 0.05) * 1.9, { segs: 6, jit: 12, branch: 1, rim: i < 4 });
    }
  }
  ctx.restore();
};
// 2D: Blitznetz und Lähmung als zuckende Linien
const zap2 = (ctx, ax, ay, bx, by, col, w) => {
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  for (let i = 1; i < 6; i++) ctx.lineTo(ax + (bx - ax) * i / 6 + (Math.random() - 0.5) * 10, ay + (by - ay) * i / 6 + (Math.random() - 0.5) * 10);
  ctx.lineTo(bx, by);
  ctx.stroke();
};
EXTRA_EFFECTS.mweb3 = (ctx, e, k) => {
  const f = e.foes.filter((m) => m && !m.dead).map((m) => bodyCenter(m));
  ctx.save();
  ctx.globalAlpha = 1 - k;
  for (let i = 0; i < f.length; i++) if (f.length > 1) zap2(ctx, f[i].x, f[i].y, f[(i + 1) % f.length].x, f[(i + 1) % f.length].y, '#e8dcff', 2.5);
  ctx.restore();
};
EXTRA_EFFECTS.mpara3 = (ctx, e) => {
  const m = e.follow;
  if (!m || m.dead || Math.random() > 0.6) return;
  const c = bodyCenter(m);
  const a = Math.random() * 6.28;
  ctx.save();
  zap2(ctx, c.x + Math.cos(a) * 14, c.y + Math.sin(a) * 12, c.x - Math.cos(a) * 14, c.y - Math.sin(a) * 12, '#fff7b0', 1.6);
  ctx.restore();
};
EXTRA_EFFECTS.mstrike3 = (ctx, e, k, x, y) => {
  if (e.storm) {
    // Einschlag der Gewitterwolke: kräftiger gezackter Blitz aus der Wolke
    const s = e.s || 1;
    ctx.save();
    if (k < 0.5) blz2(ctx, x + (n2h(1, e.seed) - 0.5) * 44, y - 132, x, y, 3.6 * s, Math.min(1, (1 - k * 2) * 1.5), e.seed + Math.floor((game.time - e.start) / 0.05), { segs: 7, jit: 14, branch: 2 });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, x, y - 6, 32 * s, '#fff7b0', 0.9 * (1 - k));
    glow2(ctx, x, y - 6, 14 * s, '#ffffff', 1 - k);
    ctx.restore();
    return;
  }
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
['mbreath3', 'mcast3', 'mburst3', 'mignite3', 'mphoenix3', 'mspear3', 'mstorm3', 'mstrike3', 'mclash3', 'mspikes3', 'mmeteor3', 'mgrav3', 'mweb3', 'mpara3', 'mkbolt3', 'mkhit3', 'mkugel3'].forEach((k) => FX3_TYPES.add(k));
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
// Kräftiger Blitz des Blitzmagiers (seit der Überarbeitung): gezackt von a nach b, die Zacken stehen je Zuckung (seed)
// fest statt in jedem Bild neu zu rauschen. Schichten: dunkelvioletter Saum (segD, normal gemischt – so bleibt der Blitz
// auch auf hellem Boden sichtbar), weicher gelber Schein, gelber Mantel, weißer Kern. o: segs, jit (Einheiten),
// branch (Zahl der Seitenäste), rim/halo (false = ohne Saum/Schein), color. Auf niedriger Grafik nur Mantel und Kern.
const _z3c = new THREE.Vector3();
const _z3d = new THREE.Vector3();
const _z3e = new THREE.Vector3();
const _z3pts = new Float32Array(3 * 26);
function n3ZapSeg(h, w, color, op, rim, top) {
  // Stücke an beiden Enden etwas verlängert: an den Knicken bleiben keine Lücken
  _z3e.subVectors(_z3d, _z3c);
  const l = _z3e.length() || 1;
  _z3e.multiplyScalar((w * 0.7) / l);
  _z3c.sub(_z3e);
  _z3d.add(_z3e);
  if (rim) {
    const r = fx3Take(h, 'segD');
    fx3Segment(r, _z3c, _z3d, w * 1.8);
    fx3Color(r, '#2a1478', op * 0.7);
  }
  // Mantel normal gemischt (segN): bleibt auf hellem Gras kräftig gelb statt weiß zu überstrahlen; auf niedriger
  // Grafik leuchtend gemischt (seg), das lässt sich bündeln und spart Zeichenaufrufe
  // top: ohne Tiefenprüfung über allem (Bögen auf der Blitzkugel)
  const o = fx3Take(h, top ? 'segZTop' : n3low() ? 'seg' : 'segN');
  fx3Segment(o, _z3c, _z3d, w);
  fx3Color(o, color, op);
  const c = fx3Take(h, top ? 'segZTop' : 'seg');
  fx3Segment(c, _z3c, _z3d, w * 0.5);
  fx3Color(c, '#ffffff', op);
}
function n3Zap(h, a, b, w, op, seed, o) {
  if (op <= 0.01) return;
  const low = n3low();
  const segs = Math.min(25, (o && o.segs) || 9);
  const jit = o && o.jit != null ? o.jit : 0.35;
  const color = (o && o.color) || '#ffe94a';
  const rim = !low && !(o && o.rim === false);
  const halo = !low && !(o && o.halo === false);
  const ax = a.x;
  const ay = a.y;
  const az = a.z;
  const dx = b.x - ax;
  const dy = b.y - ay;
  const dz = b.z - az;
  const P = _z3pts;
  P[0] = ax;
  P[1] = ay;
  P[2] = az;
  for (let i = 1; i <= segs; i++) {
    const u = i / segs;
    const env = i === segs ? 0 : jit * (0.55 + 0.45 * Math.sin(u * Math.PI));
    P[i * 3] = ax + dx * u + (n2h(i, seed) - 0.5) * 2 * env;
    P[i * 3 + 1] = ay + dy * u + (n2h(i, seed + 3.1) - 0.5) * 1.2 * env;
    P[i * 3 + 2] = az + dz * u + (n2h(i, seed + 7.7) - 0.5) * 2 * env;
    _z3c.set(P[i * 3 - 3], P[i * 3 - 2], P[i * 3 - 1]);
    _z3d.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    n3ZapSeg(h, w, color, op, rim, o && o.top);
    // Leuchten: weiche Lichtflecken an den Knicken (gebündelte Sprites statt eines breiten Mantels)
    if (halo && (i < segs || segs < 4)) n3Glow(h, P[i * 3], P[i * 3 + 1], P[i * 3 + 2], w * 12 + 0.3, color, op * 0.4);
  }
  // Seitenäste: zweigen schräg nach vorn ab, dünner, ohne Saum
  const nb = low ? 0 : (o && o.branch) || 0;
  if (!nb || segs < 3) return;
  const L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  for (let j = 0; j < nb; j++) {
    const i = 1 + Math.floor(n2h(j, seed + 21) * (segs - 2));
    const bl = L * (0.12 + 0.16 * n2h(j, seed + 2));
    // Richtung: nach vorn, dazu kräftig zur Seite und etwas auf/ab
    const sx = (n2h(j, seed + 5) - 0.5) * 2;
    const sy = (n2h(j, seed + 9) - 0.5) * 1.2;
    const sz = (n2h(j, seed + 13) - 0.5) * 2;
    let px = P[i * 3];
    let py = P[i * 3 + 1];
    let pz = P[i * 3 + 2];
    const ex = px + (dx / L) * bl * 0.7 + sx * bl * 0.8;
    const ey = Math.max(0.05, py + (dy / L) * bl * 0.7 + sy * bl * 0.8);
    const ez = pz + (dz / L) * bl * 0.7 + sz * bl * 0.8;
    const x0 = px;
    const y0 = py;
    const z0 = pz;
    for (let q = 1; q <= 3; q++) {
      const v = q / 3;
      const jj = q === 3 ? 0 : jit * 0.4;
      const nx = x0 + (ex - x0) * v + (n2h(q, seed + j * 3.3 + 31) - 0.5) * 2 * jj;
      const ny = y0 + (ey - y0) * v + (n2h(q, seed + j * 3.3 + 37) - 0.5) * 1.2 * jj;
      const nz = z0 + (ez - z0) * v + (n2h(q, seed + j * 3.3 + 41) - 0.5) * 2 * jj;
      _z3c.set(px, py, pz);
      _z3d.set(nx, ny, nz);
      n3ZapSeg(h, w * 0.5 * (1 - 0.25 * v), color, op * 0.85, false);
      px = nx;
      py = ny;
      pz = nz;
    }
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

// Feuerball beim Zaubern: wächst zwischen den Händen. Seit 14.3 eine brodelnde Feuerkugel (flmBall, feuerfeld.js)
// mit Flammenzungen, die um sie lecken; Funken und Glut strömen spiralförmig hinein, Hitze flimmert darüber, das
// Feuer leuchtet die Figur an. Keine flachen Ringe mehr.
FX3_DRAW.mcast3 = function (h, e) {
  const p = e.owner;
  if (!p || p.dead || p.gone) return;
  const t = game.time - e.start;
  const k = Math.min(1, t / Math.max(0.1, e.dur - 0.05));
  const low = n3low();
  // seit 14.3 über dem Kopf (vorher vor der Brust: die große Kugel verdeckte die Figur)
  const r = (0.14 + 0.42 * Math.pow(k, 0.8)) * (1 + 0.05 * Math.sin(t * 18));
  const f = p.facing || { x: 0, y: 1 };
  _n3a.set((p.x + f.x * 6) * U3, 1.95 + r * 1.1 + 0.08 * Math.sin(t * 2.5), (feetY(p) + f.y * 6) * U3);
  flmBall(h, _n3a.x, _n3a.y, _n3a.z, r, r, r, 1, 1.3, t, 1.1 + 0.3 * k, 0, 0, null, 0.42, 2.6);
  n3Glow(h, _n3a.x, _n3a.y, _n3a.z, r * 4.5, FIRE3.main, 0.22 + 0.12 * k);
  // Glut löst sich oben ab, Funken strömen spiralförmig hinein
  for (let i = 0; i < (low ? 6 : flmN(16)); i++) {
    const u = 1 - ((t * 0.9 + n2h(i, 2)) % 1);
    const a = n2h(i, 3) * 6.28 + u * 5;
    const rr = r + 1.9 * u;
    const px = _n3a.x + Math.cos(a) * rr;
    const py = _n3a.y + (n2h(i, 4) - 0.6) * 1.8 * u;
    const pz = _n3a.z + Math.sin(a) * rr;
    flmSpark(h, px, py, pz, (_n3a.x - px) * 3 - Math.sin(a) * 2, (_n3a.y - py) * 3, (_n3a.z - pz) * 3 + Math.cos(a) * 2, 0.24, 0.055, i % 3 ? '#ffb04a' : '#fff1c8', 0.9 * (1 - u * 0.5));
  }
  for (let i = 0; i < (low ? 2 : 5); i++) {
    const ph = (t * 1.3 + i / 5) % 1;
    const a = i * 2.4 + t;
    flmSpark(h, _n3a.x + Math.cos(a) * r * 0.6, _n3a.y + r * 0.6 + ph * 1.1, _n3a.z + Math.sin(a) * r * 0.5, 0, 2, 0, 0.18, 0.05, FIRE3.hot, (1 - ph) * k);
  }
  // Rauch zieht über der Kugel ab
  if (!low) {
    const ph = (t * 0.7) % 1;
    n3Smoke(h, _n3a.x + Math.sin(t * 3) * 0.12, _n3a.y + r + 0.2 + ph * 1.1, _n3a.z, (0.35 + ph * 0.6) * (0.4 + k), '#2a1c18', 0.32 * Math.sin(ph * Math.PI) * k);
  }
  fireLight3(_n3a.x, _n3a.y, _n3a.z, 0.5 + 0.9 * k, 7);
};

// Explosion (Feuerball groß, Phönix). Seit 14.3: grelle Glutkugel, die aufsteigt, sich zum Feuerpilz aufbläht und
// zu Rauch auskühlt (flmBall mit uCool), darunter ein Stiel aus Feuer; ein Rauchring rollt in der Luft nach außen und
// oben, Glutsplitter fliegen im Bogen davon. Am Boden nur eine unregelmäßige Brandspur, die erkaltet – kein Ring.
FX3_DRAW.mburst3 = function (h, e) {
  const t = game.time - e.start;
  const x = e.x * U3;
  const z = e.y * U3;
  const R = e.R * U3;
  const low = n3low();
  const end = clamp01((e.dur - t) / 0.8);
  flmScorch(h, e.x, e.y, R * 0.75, end * clamp01(t / 0.15), clamp01(1 - t / 1.6), e.rot || (e.x * 0.37) % 6.28);
  const B = 1.15;
  if (t > B) return;
  const k = t / B;
  const g = easeOut(Math.min(1, t / 0.3));
  // Blitz
  if (t < 0.14) n3Glow(h, x, 1, z, R * 1.1 * (0.6 + t * 3), FIRE3.core, 0.85 * (1 - t / 0.14));
  // Glutkugel: wächst, steigt und kühlt zu Rauch
  const br = R * (0.17 + 0.27 * g);
  const by = 0.55 + br * 0.7 + k * 1.6;
  const cool = Math.max(0, (k - 0.25) / 0.75) * 1.05;
  flmBall(h, x, by, z, br, br * 0.82, br, Math.min(1, 1.6 - k), 1.9, t, 1.2, cool, 0, null, 0.5, 1.6);
  // Stiel des Feuerpilzes
  if (k > 0.12) flmFunnel(h, x, 0, z, by * (0.95 - 0.2 * k), br * 0.45, br * 0.32, 0.9 * (1 - k), 2.7, FLM_PILLAR, t);
  // Rauchring in der Luft: rollt nach außen und oben, unten noch rot angeleuchtet
  const ring = low ? 8 : flmN(14);
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2 + n2h(i, 13) * 0.4;
    const rr = R * (0.35 + 0.75 * easeOut(Math.min(1, k * 1.2)));
    const roll = Math.sin(a * 3 + t * 4) * 0.12;
    const s = (0.8 + 0.9 * k) * (0.85 + 0.3 * n2h(i, 14));
    const col = k < 0.25 ? '#6a2a14' : '#2c2420';
    n3Smoke(h, x + Math.cos(a) * rr, 0.5 + k * 1.7 + roll, z + Math.sin(a) * rr * 0.92, s, col, 0.62 * (1 - k) * Math.min(1, t * 8));
  }
  // Flammen schlagen kurz nach außen
  if (k < 0.45) {
    const n = low ? 4 : 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      const d = R * (0.25 + 0.6 * g);
      fire3(h, x + Math.cos(a) * d, 0, z + Math.sin(a) * d, 0.6, 1.1 * (1 - k / 0.45), t, i + 40, 1 - k / 0.45, Math.cos(a) * 0.5);
    }
  }
  // Glutsplitter im Bogen
  const sp = low ? 8 : flmN(18);
  for (let i = 0; i < sp; i++) {
    const a = n2h(i, 5) * 6.28;
    const vh = 2.5 + 4 * n2h(i, 6);
    const vy = 2.5 + 4.5 * n2h(i, 7);
    const py = 0.8 + vy * t - 5 * t * t;
    if (py < 0.04) continue;
    flmSpark(h, x + Math.cos(a) * vh * t, py, z + Math.sin(a) * vh * t, Math.cos(a) * vh, vy - 10 * t, Math.sin(a) * vh, 0.42, 0.08, i % 3 ? FIRE3.hot : FIRE3.core, 1 - k);
  }
  if (!low) {
    for (let i = 0; i < flmN(5); i++) flmAsh(h, x + Math.cos(i * 2.4) * R * 0.5 * k, 1 + k * 3 + n2h(i, 3), z + Math.sin(i * 2.4) * R * 0.4 * k, 0.08, 0.8 * (1 - k));
  }
  fireLight3(x, 1.4, z, 2.6 * (1 - k) + 0.3, R * 3);
};

// Brand: ein Funke fliegt zum Ziel, dann hüllt ein Flammenmantel den ganzen Körper ein (seit 14.3 flmFunnel: Zungen
// lecken nach oben, vorn durchscheinend, damit man den Gegner sieht), Glut steigt auf, Rauchfahne, Asche, Lichtschein
FX3_DRAW.mignite3 = function (h, e) {
  const m = e.follow;
  if (!m || m.dead) return;
  const t = game.time - e.start;
  const low = n3low();
  const ht = Math.max(1.1, figureHeight(m) * U3 * 1.25);
  const x = m.x * U3;
  const z = feetY(m) * U3;
  if (t < e.fly) {
    const u = t / e.fly;
    const sx = e.x0 * U3;
    const sz = (e.y0 + 9) * U3;
    const px = sx + (x - sx) * u;
    const pz = sz + (z - sz) * u;
    const py = 1.3 + Math.sin(u * Math.PI) * 0.6;
    _n3a.set(x - sx, 0, z - sz).normalize();
    flmBall(h, px, py, pz, 0.16, 0.16, 0.16, 1, 0.7, t, 1.5, 0, 1.6, _n3a, 0.3, 3);
    n3Glow(h, px, py, pz, 0.6, FIRE3.hot, 0.8);
    for (let i = 1; i <= 4; i++) flmSpark(h, px - _n3a.x * i * 0.18, py - 0.05 * i, pz - _n3a.z * i * 0.18, -_n3a.x * 3, 0.5, -_n3a.z * 3, 0.16, 0.05, FIRE3.hot, 1 - i * 0.2);
    return;
  }
  const fade = Math.min(1, (e.dur - t) / 0.4, (t - e.fly) / 0.15);
  // etwas weiter als der Körper (sonst verdeckt das Modell die vordere Flammenwand)
  const r = Math.max(0.42, (m.r || 12) * U3 * 1.2);
  flmFunnel(h, x, 0.02, z, ht * 1.3, r, r * 0.55, 0.95 * fade, (m.id || 1) * 0.37, FLM_SHEATH, t);
  n3Glow(h, x, ht * 0.5, z, ht * 0.9, FIRE3.main, 0.18 * fade);
  // dazu lodernde Zungen an Schultern und Seiten (klar lesbarer Umriss)
  for (let i = 0; i < (low ? 2 : 4); i++) {
    const a = (i / 4) * Math.PI * 2 + t * 0.7 + (m.id || 0);
    fire3(h, x + Math.cos(a) * r * 0.9, ht * (0.2 + 0.4 * n2h(i, 3)), z + Math.sin(a) * r * 0.7, r * 1.2, ht * 0.85, t + i * 0.3, i + (m.id || 0), 0.9 * fade, Math.cos(a) * 0.25);
  }
  for (let i = 0; i < (low ? 3 : flmN(8)); i++) {
    const u = (t * (0.7 + 0.3 * n2h(i, 4)) + n2h(i, 5)) % 1;
    flmSpark(h, x + (n2h(i, 6) - 0.5) * r * 1.6 + Math.sin(t * 4 + i) * 0.1, ht * 0.5 + u * 2, z + (n2h(i, 7) - 0.5) * r, 0, 2, 0, 0.18, 0.055, i % 3 ? '#ffc070' : FIRE3.core, (1 - u) * fade);
  }
  if (!low) {
    for (let i = 0; i < 2; i++) {
      const u = (t * 0.45 + i * 0.5) % 1;
      n3Smoke(h, x + Math.sin(t + i * 3) * 0.2, ht * 1.1 + u * 1.5, z, 0.55 + u * 0.9, '#1e120e', 0.4 * (1 - u) * fade);
    }
    flmAsh(h, x + Math.sin(t * 3) * r, ht + ((t * 0.5) % 1) * 1.5, z, 0.06, 0.7 * fade);
  }
  fireLight3(x, ht * 0.7, z, 0.9 * fade, 5);
};

// Phönix: FX3_DRAW.mphoenix3 in feuerfeld.js (seit 13.40)

// Blitzspeer: ein langer Speer mit gleißender Spitze schießt nach vorn, dahinter eine dicke Blitzbahn, die noch
// zuckt und nachglüht (seit der Überarbeitung des Blitzmagiers länger und wuchtiger)
FX3_DRAW.mspear3 = function (h, e) {
  const t = game.time - e.start;
  const u = Math.min(1, t / e.fly);
  const y = 1.05;
  const low = n3low();
  const fade = Math.max(0, 1 - Math.max(0, t - e.fly) / (e.dur - e.fly));
  _n3a.set(e.x0 * U3, y, e.y0 * U3);
  _n3b.set(e.x0 * U3 + (e.x1 - e.x0) * U3 * u, y, e.y0 * U3 + (e.y1 - e.y0) * U3 * u);
  const len = _n3a.distanceTo(_n3b);
  if (len < 0.05) return;
  // Bahn: dick beim Durchschlag, glüht dünner werdend nach
  n3Zap(h, _n3a, _n3b, 0.04 + 0.1 * fade, Math.min(1, fade * 1.5), (e.seed || 0) + Math.floor(t / 0.05), { segs: Math.max(4, Math.round(len / (low ? 2.2 : 1.15))), jit: 0.1 + 0.24 * fade, branch: 3 });
  if (u < 1) {
    // der Speer selbst: gerader, gleißender Schaft und lange Spitze
    _n3d.subVectors(_n3b, _n3a).normalize();
    const sl = Math.min(len, 3.6);
    _z3c.copy(_n3b).addScaledVector(_n3d, -sl);
    _z3d.copy(_n3b);
    n3ZapSeg(h, 0.12, '#ffe94a', 1, !low);
    _n3c.copy(_n3b).addScaledVector(_n3d, -1.5);
    const tip = fx3Take(h, 'coneG');
    fx3Cone(tip, _n3c, _n3d, 2.3, 0.3);
    fx3Color(tip, '#ffe94a', 0.9);
    const core = fx3Take(h, 'coneG');
    fx3Cone(core, _n3c, _n3d, 2.1, 0.15);
    fx3Color(core, '#ffffff', 1);
    n3Glow(h, _n3b.x + _n3d.x * 0.4, y, _n3b.z + _n3d.z * 0.4, 2.2, '#ffe94a', 0.75);
    n3Glow(h, _n3b.x + _n3d.x * 0.4, y, _n3b.z + _n3d.z * 0.4, 1.0, '#ffffff', 1);
  } else if (t - e.fly < 0.3) {
    // Aufblitzen am Ende der Bahn
    const f = 1 - (t - e.fly) / 0.3;
    n3Glow(h, _n3b.x, y, _n3b.z, 1 + 1.6 * (1 - f), '#fff7b0', f);
  }
  // seitliche Funkenbögen entlang der Bahn
  if (!low && fade > 0.2) {
    for (let i = 0; i < 5; i++) {
      const v = Math.random();
      _n3c.set(_n3a.x + (_n3b.x - _n3a.x) * v, y, _n3a.z + (_n3b.z - _n3a.z) * v);
      _n3d.set(_n3c.x + (Math.random() - 0.5) * 0.9, y + (Math.random() - 0.3) * 0.7, _n3c.z + (Math.random() - 0.5) * 0.9);
      n3Bolt(h, _n3c, _n3d, 0.022, i % 2 ? '#c8b0ff' : '#fff7b0', 0.85 * fade, 3, 0.15);
    }
  }
};

// Kettenblitz und die Blitze des Kugelblitzes: ein ganzer gezackter Blitz von a nach b mit Seitenästen – erst
// gleißend dick, dann dünner nachglühend; am Zepter blitzt es kurz auf
FX3_DRAW.mkbolt3 = function (h, e, k) {
  const t = game.time - e.start;
  const m = e.to;
  if (m && !m.dead) {
    e.bx = m.x;
    e.by = feetY(m);
  }
  const low = n3low();
  const flash = clamp01(1 - t / 0.14);
  _n3a.set(e.ax * U3, e.ah, e.ay * U3);
  _n3b.set(e.bx * U3, e.bh, e.by * U3);
  const len = _n3a.distanceTo(_n3b);
  n3Zap(h, _n3a, _n3b, e.s * (0.06 + 0.07 * flash), Math.min(1, (1 - k) * 1.6), e.seed + Math.floor(t / 0.05), { segs: Math.max(3, Math.min(low ? 7 : 14, Math.round(len / 0.7))), jit: Math.min(len * 0.14, 0.3 + 0.3 * e.s), branch: e.branch });
  if (flash > 0 && e.s >= 0.9) {
    n3Glow(h, _n3a.x, _n3a.y, _n3a.z, 0.5 + 1.5 * flash, '#fff7b0', flash);
    n3Glow(h, _n3a.x, _n3a.y, _n3a.z, 0.3 + 0.6 * flash, '#ffffff', flash);
  }
};

// Einschlag eines Blitzes: kräftiger Lichtblitz, kurze gezackte Bögen spritzen ringsum weg
FX3_DRAW.mkhit3 = function (h, e, k) {
  const t = game.time - e.start;
  const s = e.s;
  const x = e.x * U3;
  const z = e.y * U3;
  const y = e.hgt;
  const f = 1 - k;
  const g = easeOut(k);
  n3Glow(h, x, y, z, (1.4 + 1.6 * g) * s, '#ffe94a', 0.7 * f);
  n3Glow(h, x, y, z, (0.65 + 0.75 * g) * s, '#ffffff', f);
  const n = n3low() ? 3 : Math.round(4 * s) + 3;
  const sd = e.seed + Math.floor(t / 0.05);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + n2h(i, e.seed) * 0.9;
    const r1 = (0.5 + 0.75 * n2h(i, sd)) * s * (0.6 + 0.6 * k);
    _n3a.set(x + Math.cos(a) * 0.12 * s, y, z + Math.sin(a) * 0.12 * s);
    _n3b.set(x + Math.cos(a) * r1, Math.max(0.05, y + (n2h(i, e.seed + 2) - 0.35) * 1.3 * r1), z + Math.sin(a) * r1);
    n3Zap(h, _n3a, _n3b, 0.028 * s, f, sd + i * 3.7, { segs: 3, jit: 0.13 * s, rim: false, halo: false });
  }
};

// Kugelblitz: große, grell knisternde Blitzkugel schwebt über der Mitte des Felds – heller Kern, zuckende Bögen auf der
// Oberfläche, kurze Bögen ringsum in den Boden; die Schläge in die Gegner sind eigene Blitze (mkbolt3). Zum Schluss
// zerplatzt sie: Lichtblitz und Blitze nach allen Seiten in den Boden. Nichts liegt flach am Boden.
FX3_DRAW.mkugel3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const end = clamp01((e.dur - t) / 0.3);
  const x = e.x * U3;
  const z = e.y * U3;
  const R = e.R * U3;
  const tb = t - e.last;
  const cy = KUGEL_H + 0.06 * Math.sin(t * 3.1);
  if (e.stop || tb < 0.05) {
    const r = 1.3 * kugelSize(e, t);
    if (r > 0.02) {
      // Kugel aus Schichten (normal gemischt, eigene Vorräte – deckt auch auf hellem Gras): dunkelvioletter Hof, gelbe
      // Kugel, darüber leuchtend der weiße Kern und ein violetter Schein
      // (…Top: ohne Tiefenprüfung, die Kugel bleibt auch über den Gegnern darunter ganz zu sehen)
      const disc = (kind, s2, col, op2, order, normal) => {
        const d = mTake(h, kind, 'disc', normal);
        if (!d.userData.zInit) {
          d.userData.zInit = true;
          d.renderOrder = order;
        }
        d.position.set(x, cy, z);
        d.scale.set(s2, s2, 1);
        fx3Color(d, col, op2);
      };
      disc('n3DiscDTop', r * 3.6, '#1a0c5a', 0.8 * end, 7, true);
      disc('n3DiscYTop', r * 2.6, '#ffd21e', end, 8, true);
      disc('n3GlowTop', r * 6.5, '#8a5aff', 0.35 * end, 9, false);
      disc('n3GlowTop', r * 1.7, '#ffe94a', 0.55 * end, 9, false);
      disc('n3GlowTop', r * 0.85, '#ffffff', end, 9, false);
      // zuckende Bögen auf der Oberfläche (jedes Bild neu)
      const n = low ? 3 : 7;
      const rr = r * 0.72;
      for (let i = 0; i < n; i++) {
        const a0 = Math.random() * 6.283;
        const e0 = (Math.random() - 0.5) * 2.4;
        const a1 = a0 + 0.7 + Math.random() * 1.4;
        const e1 = (Math.random() - 0.5) * 2.4;
        _n3a.set(x + Math.cos(a0) * Math.cos(e0) * rr, cy + Math.sin(e0) * rr, z + Math.sin(a0) * Math.cos(e0) * rr);
        _n3b.set(x + Math.cos(a1) * Math.cos(e1) * rr, cy + Math.sin(e1) * rr, z + Math.sin(a1) * Math.cos(e1) * rr);
        n3Zap(h, _n3a, _n3b, 0.035, end, Math.random() * 90, { segs: 4, jit: r * 0.22, rim: false, halo: false, top: true, color: i % 2 ? '#b48cff' : '#fff7b0' });
      }
      // kurze Bögen ringsum in den Boden (stehen je Zuckung fest)
      const sd = Math.floor(t / 0.09);
      const ns = low ? 1 : 3;
      for (let i = 0; i < ns && t > e.delay * 0.6; i++) {
        if (n2h(i, sd + e.seed) > 0.7) continue;
        const a = n2h(i, sd * 1.3 + e.seed) * 6.283;
        const d2 = R * (0.2 + 0.5 * n2h(i, sd * 2.1 + 1));
        _n3a.set(x, cy, z);
        _n3b.set(x + Math.cos(a) * d2, 0.03, z + Math.sin(a) * d2 * 0.8);
        n3Zap(h, _n3a, _n3b, 0.032, 0.9 * end, sd * 3.1 + i * 7 + e.seed, { segs: 6, jit: 0.3, rim: false, halo: false });
        n3Glow(h, _n3b.x, 0.15, _n3b.z, 0.5, '#fff7b0', 0.7 * end);
      }
    }
  }
  if (!e.stop && tb >= 0) {
    // zerplatzt
    const u = clamp01(tb / 0.45);
    const f = 1 - u;
    const g = easeOut(u);
    n3Glow(h, x, cy, z, 2 + 5 * g, '#ffe94a', 0.7 * f);
    n3Glow(h, x, cy, z, 1 + 2.6 * g, '#ffffff', f);
    n3Glow(h, x, 0.5, z, R * 1.3, '#ffe94a', 0.3 * f);
    const nb = low ? 5 : 9;
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * 6.283 + n2h(i, e.seed);
      const d2 = R * (0.5 + 0.45 * n2h(i, e.seed + 4));
      _n3a.set(x, cy, z);
      _n3b.set(x + Math.cos(a) * d2, 0.03, z + Math.sin(a) * d2 * 0.8);
      n3Zap(h, _n3a, _n3b, 0.02 + 0.07 * f, f, e.seed + i + Math.floor(tb / 0.05) * 1.9, { segs: low ? 6 : 9, jit: 0.45, branch: 1, rim: i < 4 });
      n3Glow(h, _n3b.x, 0.2, _n3b.z, 1.1 * f + 0.2, '#fff7b0', 0.8 * f);
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
  const n = low ? 10 : 24;
  // zwei Lagen: dunkler Bauch unten, hellere Wülste oben, das Ganze dreht sich langsam
  for (let i = 0; i < n; i++) {
    const a = n2h(i, 1) * 6.28 + t * 0.22 * (i % 2 ? 1 : -0.7);
    const r = R * Math.sqrt(n2h(i, 2)) * 0.95 * grow;
    const s = (1.5 + n2h(i, 3) * 1.8) * grow;
    const top = i % 3 === 0;
    n3Smoke(h, x + Math.cos(a) * r, y + (top ? 0.5 : -0.1) + (n2h(i, 4) - 0.5) * 0.5, z + Math.sin(a) * r * 0.8, s, top ? '#3a3654' : i % 2 ? '#14141e' : '#221e30', 0.88 * fade);
  }
  // Wetterleuchten im Inneren: mehrere Stellen flackern auf, zuckende Bögen in der Wolke
  const flashes = low ? 1 : 3;
  for (let k = 0; k < flashes; k++) {
    if (Math.random() > 0.45) continue;
    const a = Math.random() * 6.28;
    const r = R * 0.6 * Math.random();
    n3Glow(h, x + Math.cos(a) * r, y - 0.3, z + Math.sin(a) * r * 0.8, 1.6 + Math.random() * 1.4, k % 2 ? '#c8b0ff' : '#fff7b0', 0.55 * fade);
    if (!low && Math.random() < 0.6) {
      _n3a.set(x + Math.cos(a) * r, y - 0.2, z + Math.sin(a) * r * 0.8);
      _n3b.set(_n3a.x + (Math.random() - 0.5) * 2.4, y - 0.4, _n3a.z + (Math.random() - 0.5) * 1.6);
      n3Bolt(h, _n3a, _n3b, 0.035, '#d8c8ff', 0.85 * fade, 5, 0.35);
    }
  }
  // Gewitterfeld unter der Wolke (seit der Überarbeitung des Blitzmagiers, vorher die Optik des Kugelblitzes): bei
  // jedem Einschlag fahren mehrere Blitze aus der Wolke ins Feld, zur Schlussentladung (fin) besonders viele
  const T = t - e.form;
  const ns = e.strikes || 0;
  for (let j = 0; j <= ns && ns; j++) {
    const fin = j === ns;
    const u = fin ? t - e.fin : T - j * e.every;
    if (!(u >= 0 && u < 0.3)) continue;
    const f = 1 - u / 0.3;
    const nb = fin ? (low ? 4 : 7) : low ? 2 : 3;
    const zs = e.seed + j * 11 + Math.floor(u / 0.05) * 1.7;
    for (let b = 0; b < nb; b++) {
      const a = n2h(b, e.seed + j * 7.3) * 6.283;
      const d = Math.sqrt(n2h(b, e.seed + j * 3.1 + 5)) * R * 0.85;
      const bx = x + Math.cos(a) * d;
      const bz = z + Math.sin(a) * d * 0.8;
      _n3a.set(bx + (n2h(b, j + 2) - 0.5) * 1.3, y - 0.3, bz + (n2h(b, j + 4) - 0.5) * 0.8);
      _n3b.set(bx, 0.03, bz);
      n3Zap(h, _n3a, _n3b, (fin ? 0.11 : 0.09) * (0.5 + 0.5 * f), Math.min(1, f * 1.5), zs + b, { segs: low ? 6 : 9, jit: 0.5, branch: 1, rim: b < 4 });
      n3Glow(h, bx, 0.2, bz, (fin ? 1.5 : 1.05) * (0.6 + 0.4 * f), '#fff7b0', 0.9 * f);
    }
    n3Glow(h, x, 0.5, z, R * 1.25 * (0.7 + 0.3 * f), '#ffe94a', f * (fin ? 0.42 : 0.18));
    // die Wolke wird von unten angeleuchtet
    n3Glow(h, x, y - 0.5, z, R * 1.4, '#c8b0ff', f * 0.35);
  }
  // knisternde Bögen dicht über dem Boden (jedes Bild neu verzweigt)
  if (T > 0 && t < (e.fin || 0) + 0.3) {
    const arcs = low ? 2 : 4;
    for (let j = 0; j < arcs; j++) {
      const a0 = Math.random() * Math.PI * 2;
      const r0 = Math.random() * R * 0.85;
      const a1 = a0 + (Math.random() - 0.5) * 1.6;
      const r1 = Math.random() * R * 0.85;
      _n3a.set(x + Math.cos(a0) * r0, 0.08, z + Math.sin(a0) * r0 * 0.8);
      _n3b.set(x + Math.cos(a1) * r1, 0.08, z + Math.sin(a1) * r1 * 0.8);
      n3Bolt(h, _n3a, _n3b, 0.025, j % 2 ? '#fff7b0' : '#8a5aff', 0.75 * fade, 5, 0.25);
    }
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
  // seit 12.0 nichts mehr am Boden (kein Schatten, kein Ring)
};

// Himmelsblitz: aus großer Höhe gezackt in den Boden, Lichtfleck, Funken
FX3_DRAW.mstrike3 = function (h, e) {
  const t = game.time - e.start;
  const s = e.s || 1;
  const x = e.x * U3;
  const z = e.y * U3;
  const k = t / e.dur;
  if (e.storm) {
    // Einschlag der Gewitterwolke: kräftiger gezackter Blitz aus der Wolke mit Seitenästen
    if (k < 0.5) {
      _n3a.set(x + (n2h(1, e.seed) - 0.5) * 1.4, 4.3, z + (n2h(2, e.seed) - 0.5) * 0.9);
      _n3b.set(x, 0.05, z);
      n3Zap(h, _n3a, _n3b, 0.09 * s * (1 - k), Math.min(1, (1 - k * 2) * 1.5), e.seed + Math.floor(t / 0.05), { segs: n3low() ? 7 : 11, jit: 0.55, branch: 2 });
    }
  } else if (k < 0.45 && (k < 0.12 || Math.random() < 0.6)) {
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
  // Einschlag: Lichtblitz in Körperhöhe und Funken (nichts am Boden)
  n3Glow(h, x, 0.8, z, 1.1 * s * fade, '#fff7b0', 0.75 * fade);
  if (!n3low() && k < 0.5) {
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + e.start * 7;
      const u = k * 2;
      n3Glow(h, x + Math.cos(a) * u * 0.9 * s, 0.4 + u * 1.2 - u * u * 1.4, z + Math.sin(a) * u * 0.7 * s, 0.16, '#fffbe0', 1 - u);
    }
  }
};

// Blitznetz (seit 12.0): Bögen springen von Gegner zu Gegner und hinauf in die Wolke
FX3_DRAW.mweb3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  const op = Math.max(0, 1 - k * 1.1);
  if (op <= 0) return;
  const foes = e.foes.filter((m) => m && !m.dead);
  const low = n3low();
  const pts = foes.map((m) => new THREE.Vector3(m.x * U3, Math.max(0.5, figureHeight(m) * 0.5 * U3), feetY(m) * U3));
  for (let i = 0; i < pts.length; i++) {
    // zum nächsten Gegner im Ring und hinauf zur Wolke
    const nx = pts[(i + 1) % pts.length];
    if (pts.length > 1 && (!low || i % 2 === 0)) n3Bolt(h, pts[i], nx, 0.045, '#e8dcff', op, 7, 0.45);
    if (i < (low ? 2 : 6)) {
      _n3a.set(pts[i].x + (Math.random() - 0.5) * 0.6, 4.4, pts[i].z + (Math.random() - 0.5) * 0.4);
      n3Bolt(h, _n3a, pts[i], 0.05, '#ffe94a', op, 9, 0.55);
    }
  }
};

// Lähmung (seit 12.0): kleine zuckende Blitze um den Körper, solange der Gegner gelähmt ist
FX3_DRAW.mpara3 = function (h, e) {
  const m = e.follow;
  if (!m || m.dead) return;
  const t = game.time - e.start;
  const fade = Math.min(1, (e.dur - t) / 0.25);
  const hgt = Math.max(0.6, figureHeight(m) * U3);
  const rr = Math.max(0.35, (m.r || 14) * U3 * 1.3);
  const cx = m.x * U3;
  const cz = feetY(m) * U3;
  const n = n3low() ? 1 : 3;
  for (let i = 0; i < n; i++) {
    if (Math.random() > 0.7) continue;
    const a = Math.random() * 6.28;
    const b = a + 0.8 + Math.random() * 1.6;
    _n3a.set(cx + Math.cos(a) * rr, hgt * (0.2 + Math.random() * 0.7), cz + Math.sin(a) * rr * 0.8);
    _n3b.set(cx + Math.cos(b) * rr, hgt * (0.2 + Math.random() * 0.7), cz + Math.sin(b) * rr * 0.8);
    n3Bolt(h, _n3a, _n3b, 0.022, i % 2 ? '#c8b0ff' : '#fff7b0', fade, 5, 0.25);
  }
  n3Glow(h, cx, hgt * 0.55, cz + 0.05, rr * 2.2, '#9a8aff', 0.22 * fade * (0.7 + 0.3 * Math.sin(t * 30)));
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

// --- Grundangriff des Blitzmagiers (seit 15.48): ein fliegender Blitzpfeil statt leuchtender Punkte ---------------
// Treffer, Tempo und Reichweite bleiben wie beim Geschoss (kampf.js); nur das Bild: gleißende Spitze, dahinter ein
// gezackter, flackernder Blitzkanal (bis zum Zepter, solange der Pfeil nah ist) mit einem Seitenast, kleine Bögen an
// der Spitze, beim Treffer ein kleiner Funkeneinschlag (blitzShotHit). Auch die Schüsse der Mitspieler (drei-fx.js).
// Sparsam: höchstens MAGE3_MAX Pfeile je Bild, auf Grafik „Niedrig“ ohne Saum, Ast und Bögen.
const _bs3a = new THREE.Vector3();
const _bs3b = new THREE.Vector3();
function mageShotBlitz3(h, pr) {
  const low = n3low();
  const y = PROJECTILE_LIFT * U3 * 1.3;
  const x = pr.x * U3;
  const z = pr.y * U3;
  const vl = hyp(pr.vx, pr.vy) || 1;
  const dx = pr.vx / vl;
  const dz = pr.vy / vl;
  const sd = (pr.seed || 1) * 7 + Math.floor(game.time / 0.04);
  // Kanal nach hinten: so lang wie der Weg seit dem Zepter, höchstens 1,6 Einheiten
  const L = Math.min(1.9, Math.max(0.25, (pr.traveled || 0) * U3));
  _bs3a.set(x, y, z);
  _bs3b.set(x - dx * L, y + (pr.traveled < 50 ? 0.15 : 0), z - dz * L);
  n3Zap(h, _bs3a, _bs3b, 0.045, 1, sd, { segs: low ? 4 : 7, jit: 0.15, branch: low ? 0 : 1, rim: !low, halo: false });
  const fl = 0.8 + 0.2 * n2h(sd, 3);
  fx3MageSprite(h, 'sprite', 'disc', x, y, z, 0.8 * fl, 0.8 * fl, pr.rank >= 0 ? SKILL_RANKS[pr.rank].color : '#ffe94a', 0.65);
  fx3MageSprite(h, 'sprite', 'spark', x, y, z, 0.36 * fl, 0.36 * fl, '#ffffff', 1);
  if (!low && n2h(sd, 5) < 0.6) {
    _bs3b.set(x + (n2h(sd, 6) - 0.5) * 0.5, y + (n2h(sd, 7) - 0.5) * 0.4, z + (n2h(sd, 8) - 0.5) * 0.5);
    n3Zap(h, _bs3a, _bs3b, 0.016, 0.9, sd + 11, { segs: 3, jit: 0.07, rim: false, halo: false, color: '#c8b0ff' });
  }
}
// 2D: im verschobenen und gedrehten Bild (Spitze bei 0,0, Flugrichtung nach rechts)
function mageShotBlitz2(ctx, pr) {
  const sd = (pr.seed || (pr.seed = 1 + Math.random() * 9)) * 7 + Math.floor(game.time / 0.04);
  const L = Math.min(56, Math.max(8, pr.traveled || 0));
  blz2(ctx, 0, 0, -L, 0, 1.9, 1, sd, { segs: 6, jit: 5, branch: 1 });
  if (n2h(sd, 5) < 0.6) blz2(ctx, 0, 0, (n2h(sd, 6) - 0.5) * 14, (n2h(sd, 7) - 0.5) * 14, 0.8, 0.9, sd + 11, { segs: 3, jit: 2, rim: false, color: '#c8b0ff' });
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  glow2(ctx, 0, 0, 15, pr.rank >= 0 ? SKILL_RANKS[pr.rank].color : '#ffe94a', 0.7);
  glow2(ctx, 0, 0, 7, '#ffffff', 1);
}
// kleiner Funkeneinschlag am Getroffenen (eigene Schüsse: afterHit, Mitspieler: onRemoteHit)
function blitzShotHit(m) {
  if (!m || m.dead) return;
  const b = feetY(m);
  const hgt = Math.max(0.5, figureHeight(m) * 0.5 * U3);
  addEffect({ type: 'mkhit3', x: m.x, y: b, hgt, s: 0.5, dur: 0.26, seed: Math.random() * 90 });
  if (!V3.on) particles(m.x, b - hgt * BLZ2_H, { count: 5, color: ['#ffffff', '#fff7b0', '#b89aff'], speed: [50, 140], life: [0.12, 0.26], size: [1.2, 2.4], shape: 'spark', drag: 4 });
}
