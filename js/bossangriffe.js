'use strict';

// Eigene Angriffe der Bosse (seit 15.50). Vorher hatte jeder Endboss dieselben fünf bis sieben Angriffe (Stampfer,
// Meteore, Linie, Tankschlag, Sprung, Sturm, Nova) in fester Reihenfolge und dazu bei 75/40 % den Kristallschild und
// bei 55/20 % die Vernichtung – „gefühlt hat jeder Boss dieselbe Mechanik“. Jetzt bekommt jeder Boss eigene Angriffe
// aus seinem Thema (Daten: bossangriffe-bosse.js), die Auswahl kommt aus einem gemischten Beutel (nie zweimal
// dieselbe Reihenfolge) und starke Angriffe werden mit Pose und Warnfläche angekündigt.
//
// Grundformen (BSK_T): wellen (Ringe brechen nacheinander auf), bahnen (Streifen quer durch die Halle), hetzjagd
// (Sprünge nacheinander auf mehrere Spieler), schwenk (Atem fegt in Stufen über einen Bogen), felder (bleibende
// Flächen: Frost friert ein, Gift und Glut brennen), griff (Ranke, Kette oder Schwanz reißt heran bzw. hält fest),
// beschwoeren (Diener brechen an markierten Stellen hervor), wurf (Brocken auf den entferntesten Spieler), wirbel
// (der Boss wirbelt eine Bahn durch die Halle), muster (Einschläge im Schachbrett, zwei Wellen), entzug (Fessel saugt
// Leben, wer zum Boss läuft, reißt sie), sense (Bogenhieb vorn, dann hinten).
//
// Flächen (Zonen, im „Bodenmaß“ wie raidResolve: y × 1,2): ['c', x, y, r, t] Kreis · ['b', x, y, r0, r1, t] Band ·
// ['w', x, y, r, Mitte, halbe Breite, t] Kreisausschnitt · ['l', x0, y0, x1, y1, halbe Breite, t] Bahn. t: Sekunden nach
// der Ankündigungszeit d. Je Zeitpunkt trifft eine Fähigkeit einen Spieler höchstens einmal.
//
// Mehrspieler: Bosse führt, wer die Monster führt (Host). Er wählt die Flächen und schickt sie in der gewohnten
// Nachricht 'raid' mit (x: Fähigkeit, s: Flächen). Neue Mitspieler zeigen alles selbst und rechnen ihren Schaden
// selbst (wie bei allen Endboss-Angriffen); ältere Mitspieler lesen nur k/c und sehen einen Meteorregen auf denselben
// Stellen – kein Absturz, Schaden wie bei einem Meteor. Bewegungen des Bosses (Sprünge, Wirbel) macht nur der Host.
// Keine Bodenringe, Runen oder Sterne als Effekt; Warnflächen für Bossangriffe sind erlaubt.

const BSK = {
  fy: 1.2,          // Bodenmaß (wie hyp(dx, dy * 1.2) in raidResolve)
  maxZones: 96,     // höchstens so viele Flächen je Angriff (Nachricht und Zeichnen)
  fbMax: 36,        // höchstens so viele Ersatzkreise für ältere Mitspieler
  reach: 1300,      // nur wer so nah am Platz des Bosses steht, wird getroffen
  bigMul: 1.15,     // Phasen-Fassung: etwas stärker
  warn: '#ff3a2a',
  warn2: '#ffa22a'  // spätere Wellen derselben Fähigkeit
};
const BSK_T = {};      // Grundformen
const BSK_KITS = {};   // je Boss (typeId): { fx, skills: [{ id, t, name, … }], phases: [[Anteil, id], …] }
const BSK_FIELDS = []; // liegende Flächen (Frost, Gift, Glut …) beim eigenen Spieler
const BSK_TAU = Math.PI * 2;

// --- Nachschlagen ----------------------------------------------------------------------------------------------------
const bskKit = (m) => (m && m.typeId && BSK_KITS[m.typeId]) || null;
function bskSkill(m, id) {
  const kit = bskKit(m);
  return (kit && kit.skills.find((k) => k.id === id)) || null;
}
// Effekt-Thema (BS_FXT3, bosse3d.js): eigenes der Fähigkeit, sonst das des Bosses
function bskTh(m, K) {
  const key = (K && K.fx) || (bskKit(m) || {}).fx || (typeof BOSS3 !== 'undefined' && BOSS3[m.typeId] ? BOSS3[m.typeId].fx : null);
  return (typeof BS_FXT3 !== 'undefined' && (BS_FXT3[key] || BS_FXT3.erde)) || { core: '#ffffff', mid: '#ff8a4a', dark: '#3a2a20', tex: 'spark', deb: 'rock', debCol: ['#6a5a40', '#4a3e2c'], proj: 'rock' };
}
const bskZt = (z) => +z[z.length - 1] || 0;
const bskAng = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// Punkt im Bodenmaß relativ zu (x, y) → Welt
const bskW = (x, y, gx, gy) => ({ x: Math.round(x + gx), y: Math.round(y + gy / BSK.fy) });

// Liegt (px, py) (Füße) in der Fläche z?
function bskInZone(z, px, py) {
  const dx = px - z[1];
  const dy = (py - z[2]) * BSK.fy;
  switch (z[0]) {
    case 'c': return dx * dx + dy * dy < z[3] * z[3];
    case 'b': { const d = Math.hypot(dx, dy); return d >= z[3] && d < z[4]; }
    case 'w': {
      const d = Math.hypot(dx, dy);
      return d < z[3] && (d < 30 || Math.abs(bskAng(Math.atan2(dy, dx) - z[4])) <= z[5]);
    }
    case 'l': {
      const lx = z[3] - z[1];
      const ly = (z[4] - z[2]) * BSK.fy;
      const L = Math.hypot(lx, ly) || 1;
      const u = (dx * lx + dy * ly) / L;
      const v = Math.abs(dx * ly - dy * lx) / L;
      return u >= -z[5] * 0.5 && u <= L + z[5] * 0.5 && v < z[5];
    }
  }
  return false;
}
// Mitte einer Fläche (für Effekte)
function bskMid(z) {
  if (z[0] === 'l') return { x: (z[1] + z[3]) / 2, y: (z[2] + z[4]) / 2 };
  if (z[0] === 'w') { const r = z[3] * 0.55; return bskW(z[1], z[2], Math.cos(z[4]) * r, Math.sin(z[4]) * r); }
  return { x: z[1], y: z[2] };
}

// --- Spieler, Schaden, Zustände --------------------------------------------------------------------------------------
function bskPlayers(m) {
  // Dungeon-Bosse: nur wer in ihrem Raum steht (nicht nebenan hinter der Wand)
  const list = m.type && m.type.inst && typeof instPlayers === 'function' ? instPlayers(m) : m.type && m.type.raid ? raidPlayers(m) : raidPlayers(m).filter((pl) => Math.hypot(pl.x - m.homeX, pl.y - m.homeY) < 620);
  if (list.length) return list;
  const t = m.target && !m.target.dead ? m.target : null;
  return t ? [t] : [];
}
function bskTarget(m, list) {
  return m.target && !m.target.dead && list.includes(m.target) ? m.target : list[0] || null;
}
const bskNear = (m, p) => p && !p.dead && Math.hypot(p.x - m.homeX, p.y - m.homeY) < BSK.reach && !(typeof inVillage === 'function' && inVillage(p.x, p.y));
function bskHurt(S, mul, m, o) {
  const p = game.player;
  if (!p || p.dead) return 0;
  const amt = calcDamage(S.a, mul * levelBonus(S.l, p.level), game.stats.def, o && o.dot ? 0 : 0.05, S.l).amount;
  damagePlayer(amt, m, o && o.dot ? { dot: true } : undefined);
  return amt;
}
// Verlangsamung des eigenen Spielers (playerStats unten), Festhalten (lockPlayer, kampf.js)
function bskSlow(mul, dur) {
  const p = game.player;
  if (!p || p.dead) return;
  const until = game.time + dur;
  if (!p.bskSlow || p.bskSlow.until <= game.time || mul < p.bskSlow.mul) p.bskSlow = { mul, until };
  else p.bskSlow.until = Math.max(p.bskSlow.until, until);
  game.stats = playerStats(p);
  later(dur + 0.05, () => { if (game.player === p) game.stats = playerStats(p); });
}
function bskRoot(kind, dur, th) {
  const p = game.player;
  if (!p || p.dead) return;
  if (typeof lockPlayer === 'function') lockPlayer(p, dur);
  addEffect({ type: 'bskroot', follow: p, kind, dur, color: th.mid, th });
  if (typeof input !== 'undefined') input.walkTo = null;
}
if (typeof playerStats === 'function') {
  const _bskPlayerStats = playerStats;
  // eslint-disable-next-line no-global-assign
  playerStats = function (p) {
    const s = _bskPlayerStats(p);
    const sl = p && p === game.player && p.bskSlow;
    if (sl && sl.until > game.time) {
      s.speed *= sl.mul;
      s.footSpeed *= sl.mul;
    }
    return s;
  };
}
// Ziehen bzw. Stoßen des eigenen Spielers (mit Kollision, in kleinen Schritten)
function bskShove(p, tx, ty, keep) {
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy) || 1;
  const go = Math.max(0, d - keep);
  for (let s = 0; s < 10; s++) moveEntity(p, (dx / d) * go / 10, (dy / d) * go / 10, false);
}

// --- Klang (nur vorhandene Laute) ----------------------------------------------------------------------------------
const BSK_SND = { kzseele: 'imp_seele', hoellenseele: 'imp_feuer', feuer: 'imp_feuer', glut: 'imp_feuer', schatten: 'imp_schatten', blut: 'imp_schatten', eis: 'imp_eis', nachteis: 'imp_eis', kristall: 'imp_eis', spiegel: 'imp_eis', nordlicht: 'imp_eis', sturm: 'imp_blitz', himmel: 'imp_blitz', gift: 'imp_wasser', moor: 'imp_wasser', wasser: 'imp_wasser', seele: 'imp_seele', tod: 'imp_seele', leere: 'imp_schatten', knochen: 'imp_seele', nacht: 'imp_schatten' };
function bskSound(m, K, x, y, vol) {
  if (typeof snd === 'undefined' || !snd.player) return;
  const key = (K && K.fx) || (bskKit(m) || {}).fx || (typeof BOSS3 !== 'undefined' && BOSS3[m.typeId] ? BOSS3[m.typeId].fx : '');
  try { snd.player(BSK_SND[key] || 'imp_erde', { x, y, vol: vol || 0.8 }); } catch (e) { /* ohne Klang */ }
}

// --- Pose des Bosses (bosse3d.js bzw. aelvyr.js) -------------------------------------------------------------------
function bskPose(m, kind, d, tx, ty) {
  const dir = tx != null ? Math.atan2(tx - m.x, ty - feetY(m)) : (m.target && !m.target.dead ? Math.atan2(m.target.x - m.x, m.target.y - m.y) : null);
  const c = { kind, t0: game.time, d, dir };
  if (m.typeId === 'aelvyr') m.aelCast = c;
  else m.bsCast = c;
  m.attackAnim = 0.25;
}

// --- Ankündigung und Einschlag (Host und Mitspieler gleich) ---------------------------------------------------------
function bskShow(m, S) {
  const K = bskSkill(m, S.k);
  const T = K && BSK_T[K.t];
  if (!T) return;
  const th = bskTh(m, K);
  const col0 = K.warn || BSK.warn;
  for (const z of S.z) {
    const dur = S.d + bskZt(z);
    if (T.noWarn) continue;
    // spätere Wellen orange: erst rot, dann orange (seit 15.50)
    const col = bskZt(z) > 0.05 ? K.warn2 || BSK.warn2 : col0;
    if (z[0] === 'c') addEffect({ type: 'warn', x: z[1], y: z[2], r: z[3], dur, color: col });
    else addEffect({ type: 'bskwarn', ground: true, z, x: bskMid(z).x, y: bskMid(z).y, dur, color: col });
  }
  // Name des Angriffs: beim ersten Mal im Kampf und bei den Phasen-Fassungen als Banner, sonst klein über dem Boss
  m.bskSeen = m.bskSeen || {};
  if (S.b || !m.bskSeen[S.k]) {
    m.bskSeen[S.k] = 1;
    ui.banner(m.name, (S.b && K.bigSay) || K.say || K.name);
  } else addText(m.x, m.y - figureHeight(m) * 1.1, K.name, 'info');
  if (!T.noPose) {
    // Pose zum Ziel der ersten Fläche (Bahn: ihr Ende, Ausschnitt: seine Mitte, Kreis: wenn nicht unter dem Boss)
    const z0 = S.z[0];
    let tx = null;
    let ty = null;
    if (z0[0] === 'l') { tx = z0[3]; ty = z0[4]; }
    else if (z0[0] === 'w') { const q = bskW(z0[1], z0[2], Math.cos(z0[4]) * 200, Math.sin(z0[4]) * 200); tx = q.x; ty = q.y; }
    else if (z0[0] === 'c' && Math.hypot(z0[1] - m.x, z0[2] - feetY(m)) > 60) { tx = z0[1]; ty = z0[2]; }
    bskPose(m, K.pose || T.pose, S.d + 0.3, tx, ty);
  }
  if (T.show) T.show(m, S, K, th);
  const groups = new Map();
  for (const z of S.z) {
    const t = bskZt(z);
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(z);
  }
  S.hits = 0;
  for (const [t, zs] of groups) later(S.d + t, () => bskLand(m, S, K, T, th, zs, t));
  if (T.after) later(S.d + bskLast(S), () => { if (!m.dead) T.after(m, S, K, th); });
}
function bskLast(S) {
  let t = 0;
  for (const z of S.z) t = Math.max(t, bskZt(z));
  return t;
}
function bskLand(m, S, K, T, th, zs, t) {
  if (m.dead) return;
  if (T.land) T.land(m, S, K, th, zs, t);
  if (net.mode !== 'client' && T.host) T.host(m, S, K, zs, t);
  const p = game.player;
  if (T.noHit || !bskNear(m, p)) return;
  if (S.hits >= (K.maxHits || T.maxHits || 99)) return;
  const fy = feetY(p);
  if (!zs.some((z) => bskInZone(z, p.x, fy))) return;
  S.hits++;
  const mul = (K.mul || T.mul) * (S.b ? BSK.bigMul : 1);
  bskHurt(S, mul, m);
  if (K.slow && !T.ownSlow) bskSlow(1 - K.slow, 2.2);
  if (T.hit) T.hit(m, S, K, th, p, zs);
}

// --- Host: Angriff beginnen ----------------------------------------------------------------------------------------
function bskStart(m, id, big) {
  const K = bskSkill(m, id);
  const T = K && BSK_T[K.t];
  if (!T || m.dead) return false;
  const list = bskPlayers(m);
  if (!list.length) return false;
  const spec = T.spec(m, K, { list, tgt: bskTarget(m, list), fy: feetY(m), home: { x: m.homeX, y: m.homeY } }, !!big);
  if (!spec || !spec.z || !spec.z.length) return false;
  const z = spec.z.slice(0, BSK.maxZones).map((q) => q.map((v, i) => (i === 0 ? v : typeof v === 'number' ? +v.toFixed(i === q.length - 1 || q[0] === 'w' ? 3 : 0) : v)));
  const atk = Math.round(m.atk * (spec.atk || 1));
  const S = { k: id, z, d: +spec.d.toFixed(2), b: big ? 1 : 0, a: atk, l: m.level };
  if (spec.o) S.o = spec.o.map((v) => +(+v).toFixed(3));
  const now = game.time;
  // Der Boss hält still bis zum ersten Einschlag; spätere Wellen schlagen ein, während er schon weiterkämpft. Wer sich
  // dabei bewegt oder aus seiner Pose angreift (Sprünge, Wirbel, Atem, Doppelhieb, Totentanz …), hält bis zum Schluss.
  const end = S.d + (T.holdAll ? bskLast(S) : 0) + (spec.hold != null ? spec.hold : 0.3);
  m.cast = { kind: 'bsk', bsk: S, at: now + end, moves: (spec.moves || []).map((mv) => ({ at: now + mv.t, x: mv.x, y: mv.y, dur: mv.dur })) };
  m.windup = 0;
  m.rush = null;
  bskShow(m, S);
  if (net.mode === 'host') {
    const fb = bskFallback(S);
    netBroadcast({ t: 'raid', id: m.id, k: 'meteor', c: fb, in: 0, d: +(S.d + Math.min(1, bskLast(S))).toFixed(2), atk, lvl: m.level, x: id, s: S });
  }
  return true;
}
// Ersatzkreise für ältere Mitspieler (sie kennen die Fähigkeit nicht)
function bskFallback(S) {
  const out = [];
  const push = (x, y, r) => { if (out.length < BSK.fbMax) out.push([Math.round(x), Math.round(y), Math.max(40, Math.min(160, Math.round(r)))]); };
  for (const z of S.z) {
    if (z[0] === 'c') push(z[1], z[2], z[3]);
    else if (z[0] === 'b') {
      const r = (z[3] + z[4]) / 2;
      const n = Math.min(8, Math.max(4, Math.round(r / 60)));
      for (let i = 0; i < n; i++) { const p = bskW(z[1], z[2], Math.cos((i / n) * BSK_TAU) * r, Math.sin((i / n) * BSK_TAU) * r); push(p.x, p.y, (z[4] - z[3]) / 2); }
    } else if (z[0] === 'w') {
      for (const f of [0.35, 0.7]) { const p = bskW(z[1], z[2], Math.cos(z[4]) * z[3] * f, Math.sin(z[4]) * z[3] * f); push(p.x, p.y, z[3] * 0.3); }
    } else if (z[0] === 'l') {
      const L = Math.hypot(z[3] - z[1], z[4] - z[2]);
      const n = Math.min(6, Math.max(2, Math.round(L / (z[5] * 2.5))));
      for (let i = 0; i <= n; i++) push(z[1] + ((z[3] - z[1]) * i) / n, z[2] + ((z[4] - z[2]) * i) / n, z[5]);
    }
  }
  return out;
}

// Läuft eine eigene Fähigkeit? Dann hält der Boss still (oder springt/wirbelt nach Plan). true: nichts anderes tun.
function bskHold(m, dt) {
  const c = m.cast;
  if (!c || c.kind !== 'bsk') return false;
  const now = game.time;
  if (m.dash) {
    const d = m.dash;
    const k = Math.min(1, (now - d.t0) / d.dur);
    m.x = d.x0 + (d.x1 - d.x0) * k;
    m.y = d.y0 + (d.y1 - d.y0) * k;
    m.moving = true;
    if (k >= 1) m.dash = null;
    return true;
  }
  if (c.moves && c.moves.length && now >= c.moves[0].at) {
    const mv = c.moves.shift();
    m.dash = { x0: m.x, y0: m.y, x1: mv.x, y1: mv.y - m.r * 0.8, t0: now, dur: mv.dur };
    return true;
  }
  m.moving = false;
  if (now >= c.at) m.cast = null;
  return true;
}

// Nächster Angriff aus einem gemischten Beutel: jeder Angriff der Liste (Doppelte zählen doppelt) und jede eigene
// Fähigkeit zweimal; leer → neu mischen. So kommt nie dieselbe Reihenfolge, aber jeder Angriff gleich oft.
function bskNextMove(m, R, moves) {
  const kit = bskKit(m);
  const hpk = m.hp / m.maxHp;
  const own = kit ? kit.skills.filter((k) => !k.phaseOnly && (k.from == null || hpk <= k.from) && !(k.ok && !k.ok(m))).map((k) => k.id) : [];
  const key = moves.join(',') + '|' + own.join(',');
  if (!R.bag || !R.bag.length || R.bagKey !== key) {
    const bag = moves.concat(own, own);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    // nicht zweimal dasselbe hintereinander (auch nicht über die Grenze zweier Beutel)
    for (let i = bag.length - 1; i > 0; i--) {
      const prev = i === bag.length - 1 ? R.last : bag[i + 1];
      if (bag[i] === prev) { const j = Math.floor(Math.random() * i); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    }
    R.bag = bag;
    R.bagKey = key;
  }
  const k = R.bag.pop();
  R.last = k;
  R.step = (R.step || 0) + 1; // Kreuz der Instanzbosse wechselt weiter zwischen gerade und schräg
  return k;
}
const bskIsOwn = (m, kind) => !!bskSkill(m, kind);

// Phasen-Fähigkeiten der Endbosse (Lebensanteil → Fähigkeit in stärkerer Fassung), statt Kristallschild/Vernichtung
function bskPhase(m) {
  const kit = bskKit(m);
  if (!kit || !kit.phases || !m.raid) return false;
  const R = m.raid;
  const hpk = m.hp / m.maxHp;
  for (let i = 0; i < kit.phases.length; i++) {
    const [at, id] = kit.phases[i];
    if (hpk > at || (R.bskPh || 0) & (1 << i)) continue;
    R.bskPh = (R.bskPh || 0) | (1 << i);
    if (bskStart(m, id, true)) return true;
  }
  return false;
}

// Dungeon-Bosse (updateBoss): jeder dritte Angriff eine eigene Fähigkeit
function bskDungeonMove(m) {
  const kit = bskKit(m);
  if (!kit || !kit.skills.length || (m.bossTurn || 0) % 3 !== 0) return null;
  const R = m.bskR || (m.bskR = {});
  return bskNextMove(m, R, []);
}

if (typeof raidReset === 'function') {
  const _bskRaidReset = raidReset;
  // eslint-disable-next-line no-global-assign
  raidReset = function (m) {
    _bskRaidReset(m);
    if (m.raid) { m.raid.bskPh = 0; m.raid.bag = null; }
    m.bskSeen = null;
    if (m.cast && m.cast.kind === 'bsk') m.cast = null;
  };
}

// --- Mitspieler: Nachricht 'raid' mit eigener Fähigkeit -------------------------------------------------------------
function bskClean(s) {
  if (!s || typeof s.k !== 'string' || !Array.isArray(s.z)) return null;
  const num = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
  const z = [];
  for (const q of s.z.slice(0, BSK.maxZones)) {
    if (!Array.isArray(q) || typeof q[0] !== 'string') continue;
    const n = { c: 5, b: 6, w: 7, l: 7 }[q[0]];
    if (!n || q.length !== n || !q.slice(1).every((v) => num(v, -1e6, 1e7))) continue;
    if (!num(bskZt(q), 0, 12)) continue;
    z.push(q);
  }
  if (!z.length || !num(s.d, 0.2, 8) || !num(s.a, 0, 1e9) || !num(s.l, 1, 200)) return null;
  const o = Array.isArray(s.o) && s.o.length <= 8 && s.o.every((v) => num(v, -1e6, 1e6)) ? s.o : null;
  return { k: s.k, z, d: s.d, b: s.b ? 1 : 0, a: s.a, l: s.l, o };
}
if (typeof netOnClientData === 'function') {
  const _bskNetOnClientData = netOnClientData;
  // eslint-disable-next-line no-global-assign
  netOnClientData = function (d) {
    if (d && d.t === 'raid' && typeof d.x === 'string') {
      const m = net.mons.get(d.id);
      const S = m && bskSkill(m, d.x) ? bskClean(d.s) : null;
      if (S) {
        bskShow(m, S);
        return;
      }
    }
    return _bskNetOnClientData(d);
  };
}

// --- Liegende Flächen beim eigenen Spieler ----------------------------------------------------------------------------
function bskFieldAdd(m, S, K, th, z, dur) {
  const f = { x: z[1], y: z[2], r: z[3] * 0.92, until: game.time + dur, kind: K.field || 'glut', a: S.a, l: S.l, m, th, next: game.time + 0.25, mul: K.dot || 0.3, slow: K.slow || 0 };
  BSK_FIELDS.push(f);
  addEffect({ type: 'bskfield', ground: true, x: f.x, y: f.y, r: f.r, kind: f.kind, dur, color: th.mid, th, seed: Math.random() * 100 });
}
function bskFieldTick() {
  if (!BSK_FIELDS.length) return;
  const p = game.player;
  const now = game.time;
  for (let i = BSK_FIELDS.length - 1; i >= 0; i--) {
    const f = BSK_FIELDS[i];
    if (now > f.until) { BSK_FIELDS.splice(i, 1); continue; }
    if (!p || p.dead || now < f.next) continue;
    const dx = p.x - f.x;
    const dy = (feetY(p) - f.y) * BSK.fy;
    if (dx * dx + dy * dy > f.r * f.r) continue;
    f.next = now + 0.5;
    bskHurt({ a: f.a, l: f.l }, f.mul, f.m, { dot: true });
    if (f.slow) bskSlow(1 - f.slow, 0.7);
    // Frost: wer zu lange im Eis steht, friert fest (höchstens alle 3 s)
    if (f.kind === 'frost' && !(p.bskIceAt > now - 3)) {
      p.bskIce = (p.bskIce || 0) + 1;
      if (p.bskIce >= 3) {
        p.bskIce = 0;
        p.bskIceAt = now;
        bskRoot('eis', 1.1, f.th);
        addText(p.x, p.y - 44, 'Eingefroren!', 'hurt');
      }
    }
  }
}
// einmal je Bild (nach dem eigenen Spieler): aus updateParticles heraus, das in jedem Bild läuft
if (typeof updateParticles === 'function') {
  const _bskUpdateParticles = updateParticles;
  // eslint-disable-next-line no-global-assign
  updateParticles = function (dt) {
    _bskUpdateParticles(dt);
    try { bskFieldTick(); } catch (e) { /* nie das Bild anhalten */ }
  };
}

// --- 2D: Zeichnungen ---------------------------------------------------------------------------------------------
function bskPath2(ctx, z) {
  ctx.beginPath();
  if (z[0] === 'b') {
    ctx.arc(0, 0, z[4], 0, BSK_TAU);
    ctx.moveTo(z[3], 0);
    ctx.arc(0, 0, Math.max(0.5, z[3]), 0, BSK_TAU, true);
  } else if (z[0] === 'w') {
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, z[3], z[4] - z[5], z[4] + z[5]);
    ctx.closePath();
  } else if (z[0] === 'l') {
    const lx = z[3] - z[1];
    const ly = (z[4] - z[2]) * BSK.fy;
    const L = Math.hypot(lx, ly) || 1;
    const nx = (-ly / L) * z[5];
    const ny = (lx / L) * z[5];
    ctx.moveTo(nx, ny);
    ctx.lineTo(lx + nx, ly + ny);
    ctx.lineTo(lx - nx, ly - ny);
    ctx.lineTo(-nx, -ny);
    ctx.closePath();
  } else ctx.arc(0, 0, z[3], 0, BSK_TAU);
}
EXTRA_EFFECTS.bskwarn = (ctx, e, k) => {
  const z = e.z;
  ctx.save();
  ctx.translate(z[1], z[2]);
  ctx.scale(1, 1 / BSK.fy);
  ctx.fillStyle = e.color;
  ctx.strokeStyle = e.color;
  bskPath2(ctx, z);
  ctx.globalAlpha = 0.16 + 0.08 * Math.sin(game.time * 18);
  ctx.fill('evenodd');
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([10, 6]);
  ctx.lineDashOffset = -game.time * 40;
  ctx.stroke();
  ctx.setLineDash([]);
  // Füllstand: bis zum Einschlag wächst die Fläche von innen (Band: deckender)
  ctx.globalAlpha = 0.32;
  if (z[0] === 'l') {
    const lx = z[3] - z[1];
    const ly = (z[4] - z[2]) * BSK.fy;
    ctx.save();
    bskPath2(ctx, z);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(0, 0, Math.hypot(lx, ly) * k + z[5], 0, BSK_TAU);
    ctx.fill();
    ctx.restore();
  } else if (z[0] === 'b') {
    ctx.globalAlpha = 0.1 + 0.3 * k;
    bskPath2(ctx, z);
    ctx.fill('evenodd');
  } else {
    ctx.save();
    ctx.scale(Math.max(0.02, k), Math.max(0.02, k));
    bskPath2(ctx, z);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
};
// Zacken, Flammen oder Blasen brechen aus dem Boden (statt eines Rings)
EXTRA_EFFECTS.bskspike = (ctx, e, k, x, y) => {
  const th = e.th;
  const up = k < 0.2 ? k / 0.2 : 1 - Math.max(0, (k - 0.55) / 0.45);
  const n = e.n || 5;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * BSK_TAU + (e.seed || 0);
    const d = i ? (e.r || 40) * (0.35 + 0.6 * ((i * 7919) % 13) / 13) : 0;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d * 0.7;
    const h = (i ? 22 : 34) * up * (e.big || 1);
    if (th.tex === 'flame') {
      glow(ctx, px, py - h * 0.4, h * 0.9, th.mid, 0.55 * up);
      ctx.globalAlpha = 0.9 * up;
      ctx.fillStyle = th.mid;
      ctx.beginPath();
      ctx.moveTo(px - 7, py);
      ctx.quadraticCurveTo(px - 6, py - h * 0.6, px + Math.sin(game.time * 14 + i) * 3, py - h);
      ctx.quadraticCurveTo(px + 6, py - h * 0.6, px + 7, py);
      ctx.fill();
      ctx.fillStyle = th.core;
      ctx.beginPath();
      ctx.moveTo(px - 3, py);
      ctx.quadraticCurveTo(px, py - h * 0.5, px + 3, py);
      ctx.fill();
    } else if (th.deb === 'blob') {
      ctx.globalAlpha = 0.85 * up;
      ctx.fillStyle = th.debCol[i % th.debCol.length];
      ctx.beginPath();
      ctx.ellipse(px, py - h * 0.25, 6 + h * 0.2, 5 + h * 0.17, 0, 0, BSK_TAU);
      ctx.fill();
      ctx.globalAlpha = 0.5 * up;
      ctx.fillStyle = th.core;
      ctx.beginPath();
      ctx.arc(px - 2, py - h * 0.32, 2, 0, BSK_TAU);
      ctx.fill();
    } else {
      ctx.globalAlpha = up;
      ctx.fillStyle = th.debCol[i % th.debCol.length];
      ctx.beginPath();
      ctx.moveTo(px - 7, py);
      ctx.lineTo(px + (i % 2 ? 2 : -2), py - h);
      ctx.lineTo(px + 7, py);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = th.deb === 'ice' ? '#ffffff' : lighter(th.debCol[0], 0.3);
      ctx.globalAlpha = 0.6 * up;
      ctx.beginPath();
      ctx.moveTo(px - 2, py - 2);
      ctx.lineTo(px + (i % 2 ? 2 : -2), py - h);
      ctx.lineTo(px + 1, py - 2);
      ctx.fill();
    }
  }
  ctx.restore();
};
// Brocken, Eis, Speere … laufen eine Bahn entlang
EXTRA_EFFECTS.bskroll = (ctx, e, k) => {
  const th = e.th;
  const q = Math.min(1, k * 1.3);
  const x = e.x0 + (e.x1 - e.x0) * q;
  const y = e.y0 + (e.y1 - e.y0) * q;
  const s = e.s || 16;
  ctx.save();
  ctx.globalAlpha = 1 - Math.max(0, (k - 0.75) / 0.25);
  glow(ctx, x, y - s * 0.6, s * 2, th.mid, 0.35);
  ctx.translate(x, y - s * 0.7);
  ctx.rotate(game.time * 9);
  ctx.fillStyle = th.debCol[0];
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * BSK_TAU;
    const r = s * (0.8 + 0.25 * ((i * 37) % 5) / 5);
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = th.deb === 'ice' ? '#ffffff' : th.debCol[1] || th.debCol[0];
  ctx.globalAlpha *= 0.6;
  ctx.beginPath();
  ctx.arc(-s * 0.25, -s * 0.25, s * 0.35, 0, BSK_TAU);
  ctx.fill();
  ctx.restore();
};
// Geworfener Brocken (Bogen vom Boss zum Ziel)
EXTRA_EFFECTS.bskarc = (ctx, e, k) => {
  const th = e.th;
  const x = e.x0 + (e.x1 - e.x0) * k;
  const y = e.y0 + (e.y1 - e.y0) * k - Math.sin(Math.PI * k) * (e.h || 160);
  const s = e.s || 18;
  ctx.save();
  // Schatten am Boden zeigt, wo er landet
  ctx.globalAlpha = 0.25 + 0.35 * k;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(e.x0 + (e.x1 - e.x0) * k, e.y0 + (e.y1 - e.y0) * k, s * (0.6 + k), s * 0.4 * (0.6 + k), 0, 0, BSK_TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (th.tex === 'flame') glow(ctx, x, y, s * 2.2, th.mid, 0.6);
  ctx.translate(x, y);
  ctx.rotate(k * 9);
  if (e.obj === 'log') {
    ctx.fillStyle = '#5a3e26';
    ctx.fillRect(-s * 1.6, -s * 0.3, s * 3.2, s * 0.6);
    ctx.fillStyle = '#3e6a2a';
    ctx.beginPath();
    ctx.arc(s * 1.6, 0, s * 0.9, 0, BSK_TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = th.debCol[0];
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * BSK_TAU;
      const r = s * (0.85 + 0.3 * ((i * 53) % 7) / 7);
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = th.deb === 'ice' ? '#ffffff' : th.mid;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(-s * 0.3, -s * 0.3, s * 0.35, 0, BSK_TAU);
    ctx.fill();
  }
  ctx.restore();
};
// Liegende Fläche: Frost (Eiskristalle), Gift/Moor (Blasen), Glut (Kohlen und Flammen), Nebel, Blut
EXTRA_EFFECTS.bskfield = (ctx, e, k, x, y) => {
  const th = e.th;
  const t = game.time - e.start;
  const a = Math.min(1, t / 0.3) * Math.min(1, (e.dur - t) / 0.8);
  ctx.save();
  ctx.globalAlpha = 0.42 * a;
  const g = ctx.createRadialGradient(x, y, 0, x, y, e.r);
  g.addColorStop(0, e.kind === 'frost' ? '#e8f8ff' : th.mid);
  g.addColorStop(0.7, e.kind === 'frost' ? th.mid : th.dark);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, e.r, e.r / BSK.fy, 0, 0, BSK_TAU);
  ctx.fill();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const s = e.seed + i * 2.39;
    const d = e.r * (0.15 + 0.7 * ((s * 97) % 1));
    const px = x + Math.cos(s) * d;
    const py = y + (Math.sin(s) * d) / BSK.fy;
    if (e.kind === 'frost') {
      ctx.globalAlpha = 0.9 * a;
      ctx.fillStyle = i % 2 ? '#ffffff' : th.debCol[0];
      ctx.beginPath();
      ctx.moveTo(px - 4, py);
      ctx.lineTo(px, py - 14 - (i % 3) * 4);
      ctx.lineTo(px + 4, py);
      ctx.fill();
    } else if (e.kind === 'glut' || e.kind === 'feuer') {
      const f = 0.6 + 0.4 * Math.sin(game.time * 9 + s * 3);
      glow(ctx, px, py - 6, 14, th.mid, 0.5 * a * f);
      ctx.globalAlpha = a * f;
      ctx.fillStyle = th.core;
      ctx.beginPath();
      ctx.moveTo(px - 4, py);
      ctx.quadraticCurveTo(px, py - 16 * f, px + 4, py);
      ctx.fill();
    } else {
      // Blasen steigen und platzen
      const ph = (game.time * 0.8 + s) % 1;
      ctx.globalAlpha = 0.8 * a * (1 - ph);
      ctx.strokeStyle = th.core;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px, py - ph * 18, 2 + ph * 4, 0, BSK_TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
};
// Ranke, Kette, Schwanz: schnellt vom Boss zum Ziel und zieht sich zurück
EXTRA_EFFECTS.bsklash = (ctx, e, k) => {
  const th = e.th;
  const m = e.m;
  const x0 = m ? m.x : e.x0;
  const y0 = m ? m.y - (e.h0 || 40) : e.y0;
  const ext = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65;
  const x1 = x0 + (e.x1 - x0) * ext;
  const y1 = y0 + (e.y1 - y0) * ext;
  ctx.save();
  ctx.lineCap = 'round';
  const mx = (x0 + x1) / 2 + Math.sin(game.time * 12) * 12;
  const my = (y0 + y1) / 2 - 30;
  for (const [w, col, al] of [[e.w || 9, e.kind === 'kette' ? '#5a5a66' : th.dark, 0.95], [(e.w || 9) * 0.45, e.kind === 'kette' ? '#b8b8c4' : th.mid, 0.9]]) {
    ctx.globalAlpha = al;
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    if (e.kind === 'kette') ctx.setLineDash([7, 4]);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx, my, x1, y1);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  glow(ctx, x1, y1, 16, th.mid, 0.5);
  ctx.restore();
};
// Fessel (Entzug): pulsierender Strom vom Spieler zum Boss
EXTRA_EFFECTS.bsktether = (ctx, e, k) => {
  const a = e.a;
  const b = e.b;
  if (!a || !b || a.dead || b.dead) return;
  const th = e.th;
  const x0 = b.x;
  const y0 = b.y - 22;
  const x1 = a.x;
  const y1 = a.y - figureHeight(a) * 0.7;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.5 * Math.min(1, (1 - k) * 4);
  ctx.strokeStyle = th.mid;
  ctx.lineWidth = 7 + 2 * Math.sin(game.time * 14);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 40, x1, y1);
  ctx.stroke();
  ctx.globalAlpha = 0.9 * Math.min(1, (1 - k) * 4);
  ctx.strokeStyle = th.core;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.lineDashOffset = game.time * 60;
  ctx.stroke();
  ctx.restore();
};
// Festgehalten: Eisblock, Ranken oder Ketten um die Figur
EXTRA_EFFECTS.bskroot = (ctx, e, k, x, y) => {
  const th = e.th;
  const f = e.follow;
  const h = f ? figureHeight(f) : 46;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (1 - k) * 5);
  if (e.kind === 'eis') {
    ctx.fillStyle = 'rgba(160,220,255,0.35)';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x - 18, y - h * 0.8);
    ctx.lineTo(x - 4, y - h - 6);
    ctx.lineTo(x + 14, y - h * 0.9);
    ctx.lineTo(x + 17, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.strokeStyle = e.kind === 'kette' ? '#8a8a96' : th.dark;
    ctx.lineWidth = 3.2;
    for (let i = 0; i < 4; i++) {
      const yy = y - 6 - i * h * 0.16;
      ctx.beginPath();
      ctx.ellipse(x, yy, 13 - i, 5, Math.sin(game.time * 3 + i) * 0.2, 0, BSK_TAU);
      ctx.stroke();
    }
    ctx.strokeStyle = th.mid;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, y - 6, 13, 5, 0, 0, BSK_TAU);
    ctx.stroke();
  }
  ctx.restore();
};
// Atem fegt über einen Kreisausschnitt
EXTRA_EFFECTS.bskcone = (ctx, e, k) => {
  const th = e.th;
  const z = e.z;
  ctx.save();
  ctx.translate(z[1], z[2] - 20);
  ctx.scale(1, 1 / BSK.fy);
  const grow = Math.min(1, k / 0.25);
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, z[3] * grow);
  g.addColorStop(0, th.core);
  g.addColorStop(0.45, th.mid);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.75 * (1 - k);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, z[3] * grow, z[4] - z[5], z[4] + z[5]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

// --- 3D: Warnflächen als eigene Formen (Band, Ausschnitt, Bahn) ----------------------------------------------------------
const BSK3 = { live: new Set(), frame: 0 };
if (typeof FX3_TYPES !== 'undefined') for (const t of ['bskwarn', 'bskspike', 'bskroll', 'bskarc', 'bskfield', 'bsklash', 'bsktether', 'bskroot', 'bskcone', 'bskflame']) FX3_TYPES.add(t);
function bsk3Mat(color, op) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
}
function bsk3WarnBuild(e) {
  const z = e.z;
  const root = new THREE.Group();
  const flat = new THREE.Group();
  flat.rotation.x = Math.PI / 2;
  root.add(flat);
  root.scale.set(U3, 1, U3 / BSK.fy);
  const g = { e, root, parts: [] };
  const add = (geo, op, kind) => {
    const o = new THREE.Mesh(geo, bsk3Mat(e.color, op));
    o.renderOrder = 3;
    flat.add(o);
    g.parts.push({ o, op, kind });
    return o;
  };
  const edge = 6;
  if (z[0] === 'b') {
    root.position.set(z[1] * U3, 0.06, z[2] * U3);
    add(new THREE.RingGeometry(Math.max(0.5, z[3]), z[4], 72, 1), 0.2, 'fill');
    if (z[3] > 1) add(new THREE.RingGeometry(z[3], z[3] + edge, 72, 1), 0.85, 'edge');
    add(new THREE.RingGeometry(z[4] - edge, z[4], 72, 1), 0.85, 'edge');
  } else if (z[0] === 'w') {
    root.position.set(z[1] * U3, 0.06, z[2] * U3);
    add(new THREE.RingGeometry(1, z[3], 32, 1, z[4] - z[5], z[5] * 2), 0.18, 'fill');
    add(new THREE.RingGeometry(1, z[3], 32, 1, z[4] - z[5], z[5] * 2), 0.32, 'grow');
    add(new THREE.RingGeometry(z[3] - edge, z[3], 32, 1, z[4] - z[5], z[5] * 2), 0.9, 'edge');
    for (const s of [-1, 1]) {
      const b = add(new THREE.PlaneGeometry(z[3], edge).translate(z[3] / 2, 0, 0), 0.9, 'edge');
      b.rotation.z = z[4] + s * z[5];
    }
  } else if (z[0] === 'l') {
    root.position.set(z[1] * U3, 0.06, z[2] * U3);
    const lx = z[3] - z[1];
    const ly = (z[4] - z[2]) * BSK.fy;
    const L = Math.hypot(lx, ly) || 1;
    const a = Math.atan2(ly, lx);
    const w = z[5];
    const base = add(new THREE.PlaneGeometry(L, w * 2).translate(L / 2, 0, 0), 0.18, 'fill');
    base.rotation.z = a;
    const grow = add(new THREE.PlaneGeometry(1, w * 2).translate(0.5, 0, 0), 0.32, 'lane');
    grow.rotation.z = a;
    g.L = L;
    for (const s of [-1, 1]) {
      const b = add(new THREE.PlaneGeometry(L, edge).translate(L / 2, s * (w - edge / 2), 0), 0.9, 'edge');
      b.rotation.z = a;
    }
  }
  return g;
}
function bsk3Dispose(g) {
  g.root.parent && g.root.parent.remove(g.root);
  for (const p of g.parts) {
    p.o.geometry.dispose();
    p.o.material.dispose();
  }
  BSK3.live.delete(g);
}
if (typeof FX3_DRAW !== 'undefined') {
  FX3_DRAW.bskwarn = function (h, e, k) {
    let g = e.__bsk3;
    if (!g) {
      g = e.__bsk3 = bsk3WarnBuild(e);
      FX3.group.add(g.root);
      BSK3.live.add(g);
    }
    g.seen = BSK3.frame;
    g.root.visible = true;
    const pulse = 0.06 * Math.sin(game.time * 18);
    for (const p of g.parts) {
      if (p.kind === 'grow') p.o.scale.setScalar(Math.max(0.02, k));
      if (p.kind === 'lane') p.o.scale.x = Math.max(1, g.L * k);
      p.o.material.opacity = p.kind === 'fill' ? p.op + pulse + (e.z[0] === 'b' ? 0.22 * k : 0) : p.op;
    }
  };
  // reine 2D-Zeichnungen: in 3D übernehmen die Effekte unten bzw. bosse3d.js (bsAddFx3)
  FX3_DRAW.bskspike = () => {};
  // Flammenzungen: schießen hoch, flackern und fallen in sich zusammen (kein Brocken, kein Ring)
  FX3_DRAW.bskflame = (h, e, k) => {
    const th = e.th;
    const x0 = e.x * U3;
    const z0 = e.y * U3;
    const R = (e.r || 40) * U3;
    const up = k < 0.18 ? easeOut(k / 0.18) : 1 - Math.max(0, (k - 0.45) / 0.55);
    const n = e.n || 5;
    for (let i = 0; i < n; i++) {
      const a = e.seed + i * 2.39;
      const d = i ? R * (0.3 + 0.7 * ((i * 0.618) % 1)) : 0;
      const x = x0 + Math.cos(a) * d;
      const z = z0 + Math.sin(a) * d;
      const hgt = (i ? 1.3 : 2) * (e.big || 1) * up;
      const fl = 0.8 + 0.2 * Math.sin(game.time * 17 + i * 2.3);
      // Zunge aus drei Lagen: breit und dunkelorange unten, hell und schmal oben
      bsSprite3(h, x, 0.25 + hgt * 0.25, z, (0.9 + 0.3 * hgt) * fl, 'flame', th.mid, 0.85 * up);
      bsSprite3(h, x + 0.05 * Math.sin(game.time * 9 + i), 0.3 + hgt * 0.6, z, (0.6 + 0.2 * hgt) * fl, 'flame', th.core, 0.8 * up);
      bsSprite3(h, x, 0.35 + hgt, z, 0.35 * fl, 'flame', th.core, 0.7 * up);
      if (i % 2 === 0) bsSprite3(h, x, 0.1, z, 1.1 * up, 'disc', th.mid, 0.25 * up);
      // Funken steigen aus der Zunge
      const ph = (k * 1.7 + i * 0.31) % 1;
      bsSprite3(h, x + Math.sin(i * 3.1) * 0.3 * ph, 0.4 + hgt * (0.8 + ph), z + Math.cos(i * 2.7) * 0.3 * ph, 0.18, 'spark', th.core, 0.9 * (1 - ph) * up);
    }
    if (k < 0.6) bsSmoke3(h, x0, 0.8 + k * 2, z0, 1.2 + k * 2.5 * (e.big || 1), th.dark, 0.3 * (1 - k / 0.6));
  };
  FX3_DRAW.bskcone = () => {};
  FX3_DRAW.bskroll = (h, e, k) => {
    const th = e.th;
    const q = Math.min(1, k * 1.3);
    const x = (e.x0 + (e.x1 - e.x0) * q) * U3;
    const z = (e.y0 + (e.y1 - e.y0) * q) * U3;
    const s = (e.s || 16) / 16;
    const fade = 1 - Math.max(0, (k - 0.75) / 0.25);
    bsDebris3(h, th, x, 0.55 * s, z, 1.3 * s, game.time * 8 + (e.seed || 0), 0, fade);
    bsDebris3(h, th, x + 0.3, 0.9 * s, z - 0.2, 0.8 * s, game.time * 6 + 1, 1, fade);
    bsSmoke3(h, x - (e.x1 - e.x0) * 0.0015, 0.4, z - (e.y1 - e.y0) * 0.0015, 1.6 * s, th.dark, 0.35 * fade);
    if (th.tex === 'flame' || th.rise) bsSprite3(h, x, 1.1 * s, z, 1.4 * s, 'flame', th.mid, 0.6 * fade);
  };
  FX3_DRAW.bskarc = (h, e, k) => {
    const th = e.th;
    const x = (e.x0 + (e.x1 - e.x0) * k) * U3;
    const z = (e.y0 + (e.y1 - e.y0) * k) * U3;
    const y = 0.4 + (e.y3 || 3) * (1 - k) + Math.sin(Math.PI * k) * (e.hu || 4.5);
    const s = (e.s || 18) / 18;
    if (e.obj === 'log') {
      const o = fx3Take(h, 'bone');
      o.position.set(x, y, z);
      o.scale.set(0.3 * s, 2.6 * s, 0.3 * s);
      o.rotation.set(k * 7, 0.6, k * 5);
      o.material.color.set('#5a3e26');
      o.material.opacity = 1;
      const c = fx3Take(h, 'cone');
      c.position.set(x + Math.sin(k * 7) * 1.1 * s, y + Math.cos(k * 7) * 1.1 * s, z);
      c.scale.set(0.9 * s, 1.4 * s, 0.9 * s);
      c.rotation.set(k * 7, 0.6, k * 5);
      c.material.color.set('#3e6a2a');
      c.material.opacity = 1;
    } else bsDebris3(h, th, x, y, z, 1.6 * s, k * 9, 0, 1);
    if (th.tex === 'flame' || th.rise) bsSprite3(h, x, y, z, 2.2 * s, 'flame', th.mid, 0.7);
    bsSmoke3(h, x, y, z, 1.2 * s, th.dark, 0.25);
    // Schatten am Boden: wo er landet
    const sh = fx3Take(h, 'planeN');
    fx3Ground(sh, e.x1, e.y1, 1.2 * s * (0.4 + k), 0.03, 'disc');
    fx3Color(sh, '#000000', 0.35 * k);
  };
  FX3_DRAW.bskfield = (h, e) => {
    const th = e.th;
    const t = game.time - e.start;
    const a = Math.min(1, t / 0.3) * Math.min(1, (e.dur - t) / 0.8);
    const R = e.r * U3;
    const g = fx3Take(h, 'planeN');
    fx3Ground(g, e.x, e.y, R, 0.035, 'disc');
    fx3Color(g, e.kind === 'frost' ? '#d8f4ff' : th.dark, (e.kind === 'frost' ? 0.55 : 0.6) * a);
    const g2 = fx3Take(h, 'plane');
    fx3Ground(g2, e.x, e.y, R * 0.85, 0.04, 'disc');
    fx3Color(g2, th.mid, 0.22 * a);
    const x0 = e.x * U3;
    const z0 = e.y * U3;
    for (let i = 0; i < 8; i++) {
      const s = e.seed + i * 2.39;
      const d = R * (0.15 + 0.7 * ((s * 97) % 1));
      const px = x0 + Math.cos(s) * d;
      const pz = z0 + Math.sin(s) * d;
      if (e.kind === 'frost') {
        const o = fx3Take(h, 'coneG');
        const hh = 0.5 + 0.5 * ((s * 31) % 1);
        o.position.set(px, hh * 0.5, pz);
        o.scale.set(0.16, hh, 0.16);
        o.rotation.set(0.25 * Math.sin(s), 0, 0.25 * Math.cos(s));
        o.material.color.set(i % 2 ? '#ffffff' : th.debCol[0]);
        o.material.opacity = 0.85 * a;
      } else if (e.kind === 'glut' || e.kind === 'feuer') {
        const f = 0.6 + 0.4 * Math.sin(game.time * 9 + s * 3);
        bsSprite3(h, px, 0.35 + 0.25 * f, pz, 0.9 * f, 'flame', i % 2 ? th.mid : th.core, 0.75 * a);
        if (i % 3 === 0) fx3Rock(h, 'rock', px, 0.08, pz, 0.18, 0.1, 0.16, '#2a1a14');
      } else {
        const ph = (game.time * 0.8 + s) % 1;
        const o = fx3Take(h, 'ball');
        const r = 0.08 + ph * 0.14;
        o.position.set(px, 0.1 + ph * 0.6, pz);
        o.scale.set(r, r, r);
        o.material.color.set(th.debCol[i % th.debCol.length]);
        o.material.opacity = 0.75 * a * (1 - ph);
        if (i % 2 === 0) bsSmoke3(h, px, 0.4 + ph, pz, 0.9 + ph, th.mid, 0.18 * a * (1 - ph));
      }
    }
  };
  const _bskA = new THREE.Vector3();
  const _bskB = new THREE.Vector3();
  const _bskC = new THREE.Vector3();
  const _bskD = new THREE.Vector3();
  FX3_DRAW.bsklash = (h, e, k) => {
    const th = e.th;
    const m = e.m;
    if (m && typeof bsPt3 === 'function' && BOSS3[m.typeId]) bsPt3(m, e.at || 'weapon', _bskA);
    else _bskA.set((m ? m.x : e.x0) * U3, 2.2, (m ? feetY(m) : e.y0) * U3);
    const ext = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65;
    _bskC.set(e.x1 * U3, 0.9, e.y1 * U3);
    const n = 9;
    let px = _bskA.x;
    let py = _bskA.y;
    let pz = _bskA.z;
    for (let i = 1; i <= n; i++) {
      const u = (i / n) * ext;
      const x = _bskA.x + (_bskC.x - _bskA.x) * u;
      const z = _bskA.z + (_bskC.z - _bskA.z) * u;
      const y = _bskA.y + (_bskC.y - _bskA.y) * u + Math.sin(u * Math.PI) * 1.2 + 0.25 * Math.sin(game.time * 14 + i);
      _bskB.set(px, py, pz);
      _bskC.set(x, y, z);
      if (e.kind === 'kette') {
        const o = fx3Take(h, 'segN');
        fx3Segment(o, _bskB, _bskC, 0.07);
        fx3Color(o, i % 2 ? '#6a6a76' : '#9a9aa6', 1);
      } else {
        const o = fx3Take(h, 'segN');
        fx3Segment(o, _bskB, _bskC, 0.16 * (1 - u * 0.5));
        fx3Color(o, i % 2 ? th.dark : th.debCol[0], 1);
      }
      const gl = fx3Take(h, 'seg');
      fx3Segment(gl, _bskB, _bskC, 0.22);
      fx3Color(gl, th.mid, 0.25);
      px = x;
      py = y;
      pz = z;
      _bskC.set(e.x1 * U3, 0.9, e.y1 * U3);
    }
    bsSprite3(h, px, py, pz, 1.1, 'disc', th.mid, 0.5);
  };
  FX3_DRAW.bsktether = (h, e, k) => {
    const a = e.a;
    const b = e.b;
    if (!a || !b || a.dead || b.dead) return;
    const th = e.th;
    if (typeof bsPt3 === 'function' && BOSS3[b.typeId]) bsPt3(b, 'core', _bskA);
    else _bskA.set(b.x * U3, 2.4, feetY(b) * U3);
    _bskC.set(a.x * U3, 1.1, feetY(a) * U3);
    const fade = Math.min(1, (1 - k) * 4);
    const n = 8;
    let px = _bskA.x;
    let py = _bskA.y;
    let pz = _bskA.z;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const x = _bskA.x + (_bskC.x - _bskA.x) * u;
      const z = _bskA.z + (_bskC.z - _bskA.z) * u;
      const y = _bskA.y + (_bskC.y - _bskA.y) * u + Math.sin(u * Math.PI) * 0.8 + 0.12 * Math.sin(game.time * 16 + i * 1.7);
      _bskB.set(px, py, pz);
      _bskD.set(x, y, z);
      const o = fx3Take(h, 'seg');
      fx3Segment(o, _bskB, _bskD, 0.12);
      fx3Color(o, th.mid, 0.55 * fade);
      const c = fx3Take(h, 'seg');
      fx3Segment(c, _bskB, _bskD, 0.04);
      fx3Color(c, th.core, 0.9 * fade);
      px = x;
      py = y;
      pz = z;
    }
    // Lebenslichter wandern zum Boss
    for (let i = 0; i < 3; i++) {
      const u = 1 - ((game.time * 0.9 + i / 3) % 1);
      bsSprite3(h, _bskA.x + (_bskC.x - _bskA.x) * u, _bskA.y + (_bskC.y - _bskA.y) * u + Math.sin(u * Math.PI) * 0.8, _bskA.z + (_bskC.z - _bskA.z) * u, 0.45, 'disc', th.core, 0.85 * fade);
    }
  };
  FX3_DRAW.bskroot = (h, e, k) => {
    const f = e.follow;
    if (!f || f.dead) return;
    const th = e.th;
    const x = f.x * U3;
    const z = feetY(f) * U3;
    const fade = Math.min(1, (1 - k) * 5);
    if (e.kind === 'eis') {
      const o = fx3Take(h, 'ice');
      o.position.set(x, 0.85, z);
      o.scale.set(0.55, 0.95, 0.55);
      o.material.opacity = 0.45 * fade;
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26;
        const c = fx3Take(h, 'coneG');
        c.position.set(x + Math.cos(a) * 0.5, 0.35, z + Math.sin(a) * 0.5);
        c.scale.set(0.14, 0.7, 0.14);
        c.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
        c.material.color.set('#e8f8ff');
        c.material.opacity = 0.85 * fade;
      }
      return;
    }
    // Ranken bzw. Ketten winden sich um die Beine
    for (let i = 0; i < 10; i++) {
      const a = i * 1.1 + game.time * (e.kind === 'kette' ? 0 : 0.6);
      const y = 0.1 + i * 0.09;
      const r = 0.42 - i * 0.012;
      _bskB.set(x + Math.cos(a) * r, y, z + Math.sin(a) * r);
      _bskC.set(x + Math.cos(a + 1.1) * r, y + 0.09, z + Math.sin(a + 1.1) * r);
      const o = fx3Take(h, 'segN');
      fx3Segment(o, _bskB, _bskC, e.kind === 'kette' ? 0.045 : 0.07);
      fx3Color(o, e.kind === 'kette' ? (i % 2 ? '#6a6a76' : '#a8a8b4') : i % 2 ? th.dark : th.debCol[0], fade);
    }
    bsSprite3(h, x, 0.4, z, 1.2, 'disc', th.mid, 0.3 * fade);
  };
  FX3_HOOKS.push({
    parts: [],
    fn() {
      // Formen der Warnflächen: außer Sicht ausblenden, nach dem Ende freigeben
      for (const g of BSK3.live) {
        if (game.time - g.e.start >= g.e.dur || !game.effects.length) bsk3Dispose(g);
        else if (g.seen !== BSK3.frame) g.root.visible = false;
      }
      BSK3.frame++;
    }
  });
}

// --- Gemeinsame Effekte der Grundformen --------------------------------------------------------------------------
// Ausbruch an einer Stelle (2D: Zacken/Flammen/Blasen; 3D: bosse3d.js erupt)
// Thema ohne Brocken (deb 'flame', z. B. Kharzul): statt Felszacken lodern Flammenzungen auf und vergehen
function bskFlame(th, x, y, r, n, big) {
  addEffect({ type: V3.on ? 'bskflame' : 'bskspike', ground: true, x, y, r, n, big: big || 1, th, seed: Math.random() * 6, dur: 0.95 });
}
function bskErupt(th, x, y, r, big) {
  if (th.deb === 'flame') bskFlame(th, x, y, r * 0.6, big > 1.1 ? 7 : 5, big);
  else if (V3.on && typeof bsAddFx3 === 'function') bsAddFx3({ kind: 'erupt', th, x, y, r, big: big || 1, n: big > 1.1 ? 7 : 5, dur: 1.2 });
  else addEffect({ type: 'bskspike', ground: true, x, y, r: r * 0.6, th, n: 5, big: big || 1, seed: Math.random() * 6, dur: 0.9 });
  particles(x, y - 8, { count: 10, color: [th.mid, th.core, th.dark], speed: [60, 200], life: [0.3, 0.7], size: [2, 4], shape: th.tex === 'flame' ? 'ember' : 'square', drag: 3 });
}
function bskFall(th, x, y, lead) {
  if (V3.on && typeof bsAddFx3 === 'function') later(Math.max(0, lead - 0.5), () => bsAddFx3({ kind: 'fall', th, x, y, fall: 0.5, dur: 1.4 }));
  else later(Math.max(0, lead - 0.45), () => addEffect({ type: th.proj === 'bolt' ? 'bolt' : 'ultfall', kind: 'meteor', x, y, fall: 0.45, dur: th.proj === 'bolt' ? 0.4 : 0.9, color: th.mid }));
}
function bskBurst(th, x, y, r) {
  if (th.deb === 'flame') bskFlame(th, x, y, Math.max(40, (r || 6) * 14), 9, 1.3);
  else if (V3.on && typeof bsAddFx3 === 'function') bsAddFx3({ kind: 'burst', th, x, y, r: r || 6, dur: 1 });
  particles(x, y - 6, { count: 22, color: [th.mid, th.core, th.dark], speed: [120, 320], life: [0.3, 0.8], size: [2, 4.5], shape: th.tex === 'flame' ? 'ember' : 'square', drag: 3 });
  addEffect({ type: 'decal', kind: 'crack', x, y, r: Math.max(20, (r || 6) * 9), dur: 2.5, color: '#1a1210' });
}

// --- Grundformen -------------------------------------------------------------------------------------------------
// wellen: Bänder um den Boss brechen nacheinander auf. alt: erst die geraden, dann die ungeraden Bänder (wechseln!)
BSK_T.wellen = {
  pose: 'nova', mul: 3.3,
  spec(m, K, c, big) {
    const n = (K.n || 4) + (big ? 1 : 0);
    const w = K.w || 140;
    const gap = K.gap || (K.alt ? 1.25 : 0.6);
    const x = Math.round(m.x);
    const y = Math.round(c.fy);
    const z = [];
    for (let i = 0; i < n; i++) z.push(['b', x, y, i * w, (i + 1) * w, K.alt ? (i % 2) * gap : i * gap]);
    return { z, d: K.d || 1.6 };
  },
  land(m, S, K, th, zs) {
    shakeScreen(7);
    for (const z of zs) {
      const r = (z[3] + z[4]) / 2;
      const n = Math.max(3, Math.min(14, Math.round((BSK_TAU * r) / 150)));
      const a0 = Math.random() * BSK_TAU;
      for (let i = 0; i < n; i++) {
        const p = bskW(z[1], z[2], Math.cos(a0 + (i / n) * BSK_TAU) * r, Math.sin(a0 + (i / n) * BSK_TAU) * r);
        bskErupt(th, p.x, p.y, (z[4] - z[3]) * 0.8, 1.05);
      }
    }
    bskSound(m, K, zs[0][1], zs[0][2]);
  },
};
// bahnen: parallele Streifen quer durch die Halle, zwei Wellen im Wechsel
BSK_T.bahnen = {
  pose: 'meteor', mul: 3.6,
  spec(m, K, c, big) {
    const R = K.R || 540;
    const w = K.w || 62;
    const gap = K.gap || 1.2;
    const a = (Math.floor(Math.random() * 4) * Math.PI) / 4 + (Math.random() - 0.5) * 0.3;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const n = Math.floor((2 * R) / (2 * w));
    const z = [];
    const waves = big ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const o = -R + w + i * 2 * w;
      const a0 = bskW(c.home.x, c.home.y, -dy * o - dx * R, dx * o - dy * R);
      const a1 = bskW(c.home.x, c.home.y, -dy * o + dx * R, dx * o + dy * R);
      z.push(['l', a0.x, a0.y, a1.x, a1.y, w, (i % waves) * gap]);
    }
    return { z, d: K.d || 1.7 };
  },
  land(m, S, K, th, zs) {
    shakeScreen(6);
    for (const z of zs) {
      if (K.look === 'roll') {
        for (let f = 0.2; f < 1; f += 0.3) particles(z[1] + (z[3] - z[1]) * f, z[2] + (z[4] - z[2]) * f - 6, { count: 6, color: [th.mid, th.dark, th.debCol[0]], speed: [60, 180], life: [0.3, 0.6], size: [2, 4], shape: 'square', drag: 3 });
        continue;
      }
      if (K.look === 'fall') {
        for (let f = 0.15; f < 1; f += 0.3) bskFall(th, z[1] + (z[3] - z[1]) * f, z[2] + (z[4] - z[2]) * f, 0);
        continue;
      }
      // Zacken brechen nacheinander entlang der Bahn auf
      if (V3.on && typeof bsAddFx3 === 'function') bsAddFx3({ kind: 'quake', m: { x: z[1], y: z[2], r: 0 }, th, tx: z[3], ty: z[4], dur: 1.1 });
      else for (let f = 0.1; f < 1; f += 0.2) later(f * 0.3, () => addEffect({ type: 'bskspike', ground: true, x: z[1] + (z[3] - z[1]) * f, y: z[2] + (z[4] - z[2]) * f, r: z[5], th, n: 4, seed: f * 9, dur: 0.8 }));
    }
    bskSound(m, K, zs[0][1], zs[0][2]);
  },
  show(m, S, K, th) {
    if (K.look !== 'roll') return;
    // Brocken rollen die Bahn entlang (von der Seite, auf der der Boss steht); beim Einschlag sind sie mitten drin
    for (const z of S.z) later(Math.max(0, S.d + bskZt(z) - 0.45), () => {
      if (m.dead) return;
      const flip = Math.hypot(z[1] - m.x, z[2] - m.y) > Math.hypot(z[3] - m.x, z[4] - m.y);
      addEffect({ type: 'bskroll', x: (z[1] + z[3]) / 2, y: (z[2] + z[4]) / 2, x0: flip ? z[3] : z[1], y0: flip ? z[4] : z[2], x1: flip ? z[1] : z[3], y1: flip ? z[2] : z[4], s: z[5] * 0.32, th, seed: Math.random() * 6, dur: 0.85 });
    });
  },
};
// hetzjagd: Sprünge nacheinander auf (verschiedene) Spieler; teleport: verschwindet und taucht dort auf
BSK_T.hetzjagd = {
  pose: 'leap', mul: 3.3, noPose: true, holdAll: true,
  spec(m, K, c, big) {
    const n = (K.n || 3) + (big ? 2 : 0);
    const gap = K.gap || 0.95;
    const d = K.d || 1.3;
    const list = c.list.slice().sort(() => Math.random() - 0.5);
    const z = [];
    const moves = [];
    const R = K.r || 120;
    for (let i = 0; i < n; i++) {
      const v = list[i % list.length];
      let x = v.x;
      let y = feetY(v);
      // wer allein ist, wird nicht immer an derselben Stelle angesprungen: leicht versetzt in Laufrichtung
      if (i >= list.length) { const s = spotNear({ x: v.x, y: v.y }, 110); x = s.x; y = s.y + v.r * 0.8; }
      z.push(['c', Math.round(x), Math.round(y), R, +(i * gap).toFixed(2)]);
      moves.push({ t: d + i * gap - 0.3, x, y, dur: K.teleport ? 0.08 : 0.3 });
    }
    return { z, d, moves };
  },
  show(m, S, K, th) {
    S.z.forEach((z, i) => later(Math.max(0, S.d + bskZt(z) - 0.75), () => {
      if (m.dead) return;
      bskPose(m, 'leap', 0.75, z[1], z[2]);
      if (K.teleport) {
        // verschwindet im Schatten …
        particles(m.x, feetY(m) - 30, { count: 26, color: [th.dark, th.mid, '#000000'], speed: [40, 160], life: [0.4, 0.8], size: [3, 6], drag: 2 });
        if (V3.on && typeof bsAddFx3 === 'function') bsAddFx3({ kind: 'burst', th, x: m.x, y: feetY(m), r: 3, dur: 0.6 });
      }
    }));
  },
  land(m, S, K, th, zs) {
    const z = zs[0];
    shakeScreen(7);
    bskBurst(th, z[1], z[2], 6);
    bskSound(m, K, z[1], z[2], 0.7);
  },
  hit(m, S, K, th, p) {
    // Stoß weg von der Landestelle
    const z = S.z[0];
    if (K.knock) bskShove(p, p.x + (p.x - z[1]) * 0.6, p.y + (p.y - z[2]) * 0.6, 0);
  }
};
// schwenk: Atem/Strahl fegt in Stufen über einen Bogen
BSK_T.schwenk = {
  pose: 'line', mul: 3.1, noPose: true, holdAll: true,
  spec(m, K, c, big) {
    const n = (K.n || 5) + (big ? 2 : 0);
    const h = K.h || 0.34;
    const R = K.R || 460;
    const gap = K.gap || 0.32;
    const tgt = c.tgt || c.list[0];
    const a0 = Math.atan2((feetY(tgt) - c.fy) * BSK.fy, tgt.x - m.x);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const span = (n - 1) * h * 1.7;
    const z = [];
    for (let i = 0; i < n; i++) z.push(['w', Math.round(m.x), Math.round(c.fy), R, a0 - (dir * span) / 2 + dir * i * h * 1.7, h, +(i * gap).toFixed(2)]);
    return { z, d: K.d || 1.5 };
  },
  show(m, S, K, th) {
    const z0 = S.z[0];
    const p0 = bskW(z0[1], z0[2], Math.cos(z0[4]) * 200, Math.sin(z0[4]) * 200);
    bskPose(m, 'line', S.d + 0.2, p0.x, p0.y);
    if (V3.on && typeof bsAddFx3 === 'function') bsAddFx3({ kind: 'charge', m, th, at: 'emit', dur: S.d });
  },
  land(m, S, K, th, zs) {
    const z = zs[0];
    const tip = bskW(z[1], z[2], Math.cos(z[4]) * z[3], Math.sin(z[4]) * z[3]);
    if (m.bsCast) m.bsCast.dir = Math.atan2(tip.x - m.x, tip.y - feetY(m));
    if (m.aelCast) m.aelCast.dir = Math.atan2(tip.x - m.x, tip.y - feetY(m));
    if (V3.on && typeof bsAddFx3 === 'function') bsAddFx3({ kind: 'beam', m, th, at: 'emit', tx: tip.x, ty: tip.y, wide: 1.5, dur: 0.55 });
    else addEffect({ type: 'bskcone', z, th, x: z[1], y: z[2], dur: 0.5 });
    shakeScreen(3);
    if (z === S.z[0]) bskSound(m, K, z[1], z[2]);
  },
  hit(m, S, K, th) {
    if (K.dot) bskDotOn(m, S, th, K.dot, 4);
  }
};
// felder: Flächen unter allen Spielern (und ein paar dazu), danach liegen sie dort eine Weile
BSK_T.felder = {
  pose: 'meteor', mul: 1.8, ownSlow: true,
  spec(m, K, c, big) {
    const r = K.r || 105;
    const z = [];
    for (const pl of c.list) z.push(['c', Math.round(pl.x), Math.round(feetY(pl)), r, 0]);
    for (let i = 0; i < (K.extra || 2) + (big ? 3 : 0); i++) {
      const s = spotNear(c.home, 420);
      z.push(['c', Math.round(s.x), Math.round(s.y + 10), r, 0]);
    }
    return { z, d: K.d || 1.6 };
  },
  show(m, S, K, th) {
    if (!K.throw) {
      if (V3.on && typeof bsAddFx3 === 'function') bsAddFx3({ kind: 'charge', m, th, at: 'core', dur: S.d, big: 1.3 });
      return;
    }
    // geworfen bzw. gespuckt: Klumpen fliegen im Bogen auf die Stellen
    for (const z of S.z) later(Math.max(0, S.d - 0.7), () => {
      if (!m.dead) addEffect({ type: 'bskarc', x: z[1], y: z[2], x0: m.x, y0: m.y - 30, x1: z[1], y1: z[2], h: 140, hu: 3.5, s: 11, th, dur: 0.7 });
    });
  },
  land(m, S, K, th, zs) {
    for (const z of zs) {
      bskErupt(th, z[1], z[2], z[3], 0.9);
      bskFieldAdd(m, S, K, th, z, (K.dur || 7) * (S.b ? 1.3 : 1));
    }
    bskSound(m, K, zs[0][1], zs[0][2]);
  },
  hit(m, S, K, th, p) {
    if (K.field === 'frost') {
      bskRoot('eis', 1.0, th);
      addText(p.x, p.y - 44, 'Eingefroren!', 'hurt');
    }
  }
};
// griff: Ranke/Kette/Schwanz schnellt auf Spieler (Linie) und reißt sie heran; boden: Ranken aus dem Boden halten fest
BSK_T.griff = {
  pose: 'buster', mul: 2.9,
  spec(m, K, c, big) {
    const z = [];
    if (K.boden) {
      for (const pl of c.list) z.push(['c', Math.round(pl.x), Math.round(feetY(pl)), K.r || 90, 0]);
      return { z, d: K.d || 1.5 };
    }
    const n = Math.min(c.list.length, (K.n || 1) + (big ? 1 : 0));
    const list = c.list.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < n; i++) {
      const v = list[i];
      const vx = v.x;
      const vy = feetY(v);
      const L = Math.hypot(vx - m.x, (vy - c.fy) * BSK.fy) || 1;
      const ex = m.x + ((vx - m.x) / L) * (L + 90);
      const ey = c.fy + ((vy - c.fy) / L) * (L + 90);
      z.push(['l', Math.round(m.x), Math.round(c.fy), Math.round(ex), Math.round(ey), K.w || 52, 0]);
    }
    return { z, d: K.d || 1.5 };
  },
  show(m, S, K, th) {
    if (K.boden) {
      bskPose(m, 'slam', S.d + 0.3);
      for (const z of S.z) later(Math.max(0, S.d - 0.5), () => { if (!m.dead) bskErupt(th, z[1], z[2], z[3] * 0.6, 0.6); });
    } else if (V3.on && typeof bsAddFx3 === 'function') bsAddFx3({ kind: 'charge', m, th, at: K.at || 'weapon', dur: S.d });
  },
  land(m, S, K, th, zs) {
    if (K.boden) {
      for (const z of zs) bskErupt(th, z[1], z[2], z[3], 1.1);
    } else for (const z of zs) addEffect({ type: 'bsklash', x: z[3], y: z[4], m, x1: z[3], y1: z[4], kind: K.look || 'ranke', th, at: K.at || 'weapon', w: 9, dur: 0.75 });
    bskSound(m, K, zs[0][3] || zs[0][1], zs[0][4] || zs[0][2], 0.7);
  },
  hit(m, S, K, th, p) {
    if (K.boden) {
      bskRoot(K.look || 'ranke', K.root || 1.8, th);
      bskDotOn(m, S, th, K.dot || 0.25, 4);
      return;
    }
    // heran an den Boss, dann kurz festgehalten
    bskShove(p, m.x, m.y + m.r * 0.6, m.r + 36);
    bskRoot(K.look || 'ranke', K.root || 1.0, th);
  }
};
// beschwoeren: an markierten Stellen brechen Diener hervor (wer dort steht, wird getroffen)
BSK_T.beschwoeren = {
  pose: 'nova', mul: 2.5,
  spec(m, K, c, big) {
    const n = (K.n || 3) + (big ? 2 : 0) + Math.min(2, Math.floor((c.list.length - 1) / 2));
    const z = [];
    for (let i = 0; i < n; i++) {
      const s = spotNear(c.home, 380);
      z.push(['c', Math.round(s.x), Math.round(s.y + 10), K.r || 75, +(i * 0.15).toFixed(2)]);
    }
    return { z, d: K.d || 1.8 };
  },
  show(m, S, K, th) {
    if (V3.on && typeof bsAddFx3 === 'function') bsAddFx3({ kind: 'charge', m, th, at: 'core', dur: S.d, big: 1.4 });
    for (const z of S.z) addEffect({ type: 'decal', kind: 'crack', x: z[1], y: z[2], r: z[3] * 0.7, dur: S.d + 1.5, color: '#1a1210' });
  },
  land(m, S, K, th, zs) {
    for (const z of zs) bskErupt(th, z[1], z[2], z[3], 1.2);
    bskSound(m, K, zs[0][1], zs[0][2], 0.6);
  },
  host(m, S, K, zs) {
    const b = m.type.boss;
    const type = K.mob || (b && b.summon);
    if (!type || !MONSTER_TYPES[type]) return;
    for (const z of zs) {
      const add = createMonster(type, z[1], z[2] - 10, { respawn: false, zone: m.zone, level: Math.max(1, m.level - (K.lv || 5)) });
      add.raidAdd = true;
      add.hp = add.maxHp = Math.round(add.maxHp * (K.hp || 0.6));
      add.homeX = m.homeX;
      add.homeY = m.homeY;
      add.state = 'chase';
      const list = bskPlayers(m);
      add.target = list[randInt(0, Math.max(0, list.length - 1))] || game.player;
      add.stun = 0.4;
      game.monsters.push(add);
    }
  }
};
// wurf: großer Brocken (Baum, Fels, Eis, Glut) auf den Spieler, der am weitesten weg steht
BSK_T.wurf = {
  pose: 'buster', mul: 4.0,
  spec(m, K, c, big) {
    const far = c.list.slice().sort((a, b) => Math.hypot(b.x - m.x, b.y - m.y) - Math.hypot(a.x - m.x, a.y - m.y));
    const n = Math.min(far.length, 1 + (big ? 1 : 0) + (far.length >= 5 ? 1 : 0));
    const z = [];
    for (let i = 0; i < n; i++) z.push(['c', Math.round(far[i].x), Math.round(feetY(far[i])), K.r || 150, +(i * 0.5).toFixed(2)]);
    return { z, d: K.d || 2.0 };
  },
  show(m, S, K, th) {
    for (const z of S.z) later(Math.max(0, S.d + bskZt(z) - 0.85), () => {
      if (m.dead) return;
      bskPose(m, 'buster', 0.85, z[1], z[2]);
      addEffect({ type: 'bskarc', x: z[1], y: z[2], x0: m.x, y0: m.y - 60, x1: z[1], y1: z[2], h: 220, hu: 6, y3: 4, s: 22, obj: K.obj || 'rock', th, dur: 0.85 });
    });
  },
  land(m, S, K, th, zs) {
    const z = zs[0];
    shakeScreen(11);
    bskBurst(th, z[1], z[2], 9);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * BSK_TAU + 0.4; const p = bskW(z[1], z[2], Math.cos(a) * z[3] * 0.6, Math.sin(a) * z[3] * 0.6); bskErupt(th, p.x, p.y, 60, 0.8); }
    bskSound(m, K, z[1], z[2], 1);
  },
  hit(m, S, K, th, p) {
    const z = S.z[0];
    bskShove(p, p.x + (p.x - z[1] || 1) * 0.8, p.y + (p.y - z[2]) * 0.8, 0);
  }
};
// wirbel: der Boss wirbelt eine Bahn durch die Halle (über bis zu drei Spieler)
BSK_T.wirbel = {
  pose: 'charge', mul: 3.0, maxHits: 2, noPose: true, holdAll: true,
  spec(m, K, c, big) {
    const pts = [{ x: m.x, y: c.fy }];
    const list = c.list.slice().sort(() => Math.random() - 0.5);
    const legs = Math.min(3, Math.max(2, list.length)) + (big ? 1 : 0);
    for (let i = 0; i < legs; i++) {
      const v = list[i % list.length];
      let q = { x: v.x, y: feetY(v) };
      if (i >= list.length) { const s = spotNear(c.home, 380); q = { x: s.x, y: s.y + 10 }; }
      pts.push(q);
    }
    const sp = K.speed || 430;
    const d = K.d || 1.3;
    const z = [];
    const moves = [];
    let t = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.round(L / 75));
      for (let s = 1; s <= steps; s++) {
        const f = s / steps;
        z.push(['c', Math.round(a.x + (b.x - a.x) * f), Math.round(a.y + (b.y - a.y) * f), K.r || 85, +(t + (L * f) / sp).toFixed(2)]);
      }
      moves.push({ t: d + t, x: b.x, y: b.y, dur: L / sp });
      t += L / sp;
    }
    return { z: z.slice(0, BSK.maxZones), d, moves, hold: 0.2 };
  },
  show(m, S, K, th) {
    bskPose(m, 'charge', S.d + bskLast(S));
    const dur = bskLast(S) + 0.3;
    later(S.d, () => { if (!m.dead && V3.on && typeof bsAddFx3 === 'function') bsAddFx3({ kind: 'trail', m, th, dur }); });
    // kurze Klingenbögen rund um den Boss, solange er wirbelt (kein geschlossener Ring)
    for (let i = 0; i * 0.22 < dur; i++) later(S.d + i * 0.22, () => {
      if (m.dead) return;
      const a0 = i * 2.1;
      addEffect({ type: 'swoosh', follow: m, ox: 0, oy: -14, r: 100, width: 30, a0, a1: a0 + Math.PI * 1.15, dur: 0.26, color: i % 2 ? th.mid : th.core });
    });
  },
  land(m, S, K, th, zs) {
    const z = zs[0];
    particles(z[1], z[2] - 10, { count: 8, color: [th.mid, th.core, th.dark], speed: [80, 220], life: [0.3, 0.6], size: [2, 4], shape: 'square', drag: 3 });
    if (Math.random() < 0.35) bskSound(m, K, z[1], z[2], 0.5);
  }
};
// muster: Einschläge im Schachbrett, zwei (Phase: drei) Wellen
BSK_T.muster = {
  pose: 'meteor', mul: 3.2,
  spec(m, K, c, big) {
    const s = K.s || 200;
    const r = K.r || 92;
    const R = K.R || 560;
    const gap = K.gap || 1.15;
    const waves = big ? 3 : 2;
    const ox = Math.random() * s;
    const oy = Math.random() * s;
    const z = [];
    for (let gy = -R; gy <= R; gy += s) {
      for (let gx = -R; gx <= R; gx += s) {
        const x = gx + ox - s / 2;
        const y = gy + oy - s / 2;
        if (Math.hypot(x, y) > R) continue;
        const i = Math.round((gx + R) / s) + Math.round((gy + R) / s);
        const p = bskW(c.home.x, c.home.y, x, y);
        z.push(['c', p.x, p.y, r, ((i % waves) * gap)]);
      }
    }
    return { z, d: K.d || 1.6 };
  },
  show(m, S, K, th) {
    if (V3.on && typeof bsAddFx3 === 'function') bsAddFx3({ kind: 'charge', m, th, at: (BOSS3[m.typeId] || {}).skyAt || 'emit', dur: Math.min(1.2, S.d), big: 1.4 });
    for (const z of S.z) bskFall(th, z[1], z[2], S.d + bskZt(z));
  },
  land(m, S, K, th, zs) {
    shakeScreen(6);
    for (const z of zs) {
      particles(z[1], z[2] - 6, { count: 8, color: [th.mid, th.core], speed: [80, 240], life: [0.3, 0.6], size: [2, 4], shape: th.tex === 'flame' ? 'ember' : 'square', drag: 3 });
      addEffect({ type: 'decal', kind: 'scorch', x: z[1], y: z[2], r: z[3] * 0.5, dur: 2.5, color: '#1a1210' });
    }
    bskSound(m, K, zs[0][1], zs[0][2]);
  }
};
// entzug: Fesseln auf die Spieler, die am weitesten weg stehen; solange sie weit weg bleiben, saugt der Boss ihr Leben.
// Wer zu ihm läuft (näher als safe), reißt die Fessel. Markierung: Kreis unter dem Spieler (ohne Schaden).
BSK_T.entzug = {
  pose: 'nova', mul: 0, noHit: true,
  spec(m, K, c, big) {
    const far = c.list.slice().sort((a, b) => Math.hypot(b.x - m.x, b.y - m.y) - Math.hypot(a.x - m.x, a.y - m.y));
    const n = Math.min(far.length, (far.length >= 3 ? 2 : 1) + (big ? 1 : 0));
    const z = [];
    for (let i = 0; i < n; i++) z.push(['c', Math.round(far[i].x), Math.round(feetY(far[i])), 60, 0]);
    return { z, d: K.d || 1.0, hold: 0 };
  },
  show(m, S, K, th) {
    const all = [game.player, ...(net.players ? net.players.values() : [])].filter((o) => o && !o.dead && !o.gone && !o.waechter);
    S.ties = [];
    for (const z of S.z) {
      let best = null;
      let bd = 90;
      for (const o of all) { const d = Math.hypot(o.x - z[1], feetY(o) - z[2]); if (d < bd) { bd = d; best = o; } }
      if (!best || S.ties.includes(best)) continue;
      S.ties.push(best);
      const dur = S.d + (K.dur || 5);
      addEffect({ type: 'bsktether', a: best, b: m, th, x: best.x, y: best.y, follow: best, dur });
      if (best === game.player) {
        ui.banner(m.name, K.say2 || 'saugt dein Leben – lauf zu ihm, dann reißt die Fessel!');
      }
    }
  },
  after(m, S, K, th) {
    // Ticks: alle 0,5 s, solange der Gefesselte weit weg ist
    const safe = K.safe || 230;
    const ticks = Math.round((K.dur || 5) / 0.5);
    for (let i = 0; i < ticks; i++) later(i * 0.5, () => {
      if (m.dead) return;
      for (const o of S.ties) {
        if (!o || o.dead || o.bskFree === S) continue;
        const d = Math.hypot(o.x - m.x, o.y - m.y);
        if (d < safe + m.r) { o.bskFree = S; if (o === game.player) addText(o.x, o.y - 40, 'Fessel gerissen!', 'heal'); continue; }
        if (o === game.player) bskHurt(S, (K.dot || 0.5) * (S.b ? BSK.bigMul : 1), m, { dot: true });
        if (net.mode !== 'client') m.hp = Math.min(m.maxHp, m.hp + m.maxHp * (K.heal || 0.0025));
      }
    });
  }
};
// sense: Bogenhieb vorn, kurz danach hinten
BSK_T.sense = {
  pose: 'slam', mul: 4.0, holdAll: true,
  spec(m, K, c, big) {
    const tgt = c.tgt || c.list[0];
    const a = Math.atan2((feetY(tgt) - c.fy) * BSK.fy, tgt.x - m.x);
    const R = K.R || 330;
    const h = K.h || 1.15;
    const z = [['w', Math.round(m.x), Math.round(c.fy), R, a, h, 0]];
    if (K.back !== false) z.push(['w', Math.round(m.x), Math.round(c.fy), R, a + Math.PI, Math.PI - h + 0.05, K.gap || 0.8]);
    if (big) z.push(['w', Math.round(m.x), Math.round(c.fy), R + 60, a, h, (K.gap || 0.8) * 2]);
    return { z, d: K.d || 1.4 };
  },
  land(m, S, K, th, zs) {
    const z = zs[0];
    const a = z[4];
    addEffect({ type: 'swoosh', follow: m, ox: 0, oy: -20, r: z[3] * 0.8, width: 60, a0: a - z[5], a1: a + z[5], dur: 0.35, color: th.mid });
    for (let i = -2; i <= 2; i++) { const p = bskW(z[1], z[2], Math.cos(a + (i * z[5]) / 2.5) * z[3] * 0.7, Math.sin(a + (i * z[5]) / 2.5) * z[3] * 0.7); bskErupt(th, p.x, p.y, 60, 0.7); }
    shakeScreen(6);
    if (m.bsCast) m.bsCast = { kind: z === S.z[0] ? 'slam' : 'nova', t0: game.time - 0.5, d: 0.6, dir: Math.atan2(Math.cos(a), Math.sin(a) / BSK.fy) };
    bskSound(m, K, z[1], z[2], 0.8);
  },
  hit(m, S, K, th) { if (K.dot) bskDotOn(m, S, th, K.dot, 4); }
};

// Schaden über Zeit am eigenen Spieler (Gift, Blut, Glut): n Ticks zu 0,5 s
function bskDotOn(m, S, th, mul, n) {
  const p = game.player;
  for (let i = 1; i <= n; i++) later(i * 0.5, () => {
    if (game.player !== p || p.dead) return;
    bskHurt(S, mul, m, { dot: true });
    if (i === 1 || i === n) particles(p.x, p.y - 30, { count: 5, color: [th.mid, th.core], speed: [20, 60], life: [0.4, 0.7], size: [2, 3], drag: 2 });
  });
}
