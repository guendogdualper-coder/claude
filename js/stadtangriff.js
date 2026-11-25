'use strict';
// Stadt-Angriffe (nach 15.82, docs/risslauf-stadtangriff.md): alle zwei bis drei Stunden greifen Monsterwellen die Stadt
// jeder Karte an, auf der gerade jemand spielt – gekämpft wird vor einem ihrer Tore, die Stadt selbst bleibt sicher
// (Monster kommen nicht hinein, drinnen gibt es keinen Schaden: inVillage, canStand, damagePlayer).
// - Zeitplan aus der Uhr (Weltzeit, für alle gleich): Angriffe um 0:40 und 2:40, 5:40 und 7:40, 10:40 und 12:40 …
//   (alle fünf Stunden zwei, abwechselnd zwei und drei Stunden Abstand). Fünf Minuten vorher eine Meldung im Chat und
//   als Banner, eine Minute vorher eine Erinnerung. Welches Tor, rechnet jedes Gerät aus Angriff und Karte gleich aus.
// - Ablauf: drei bis fünf Wellen (aus der Nummer des Angriffs), dazwischen eine kurze Pause, am Ende ein Anführer mit
//   Gefolge. Die Angreifer erscheinen ein Stück vor dem Tor und ziehen zum Tor; vier Stadtwachen halten davor die
//   Stellung und kämpfen mit. Wer vor dem Tor ungestört steht, schlägt auf das Tor ein (Torfestigkeit); fällt es oder
//   dauert alles zu lange, ziehen die Angreifer ab.
// - Stärke: Stufe der Spieler an der Stadt (Schnitt, begrenzt auf die Stufen der Karte), Zahl und Leben der Angreifer
//   wachsen mit der Zahl der Spieler – allein gut zu schaffen.
// - Mehrspieler: Die Angriffe führt, wer die Monster führt (allein man selbst, im Kanal der Host, auch der
//   Welt-Wächter); er meldet den Stand (Nachricht 'ags') und das Ende ('age') an alle. Stadtwachen stehen auf jedem
//   Gerät selbst; ihren Schaden rechnet nur der Host.
// - Belohnung: jedes Gerät für die eigene Figur aus dem, was es selbst gesehen hat (eigener Schaden an den Angreifern im
//   Verhältnis zu ihrem Leben und den Spielern vor dem Tor, Zeit vor dem Tor): Erfahrung, Gold, kleine Chance auf einen
//   Ätherkern bzw. ein Juwel. Dazu wie immer Erfahrung und Beute für jedes selbst getroffene Monster.
// Keine Bodenringe, Runen oder Sterne als Effekt.

const ANGRIFF = {
  // Zeitplan (ms, Weltzeit): Angriff k beginnt um shift + ⌊k/2⌋ · period + offsets[k mod 2]
  period: 5 * 3600e3, offsets: [0, 2 * 3600e3], shift: 40 * 60e3,
  warn: 5 * 60e3, remind: 60e3,
  late: 120,            // so lange (s) nach dem Beginn darf ein Host noch anfangen
  waves: [3, 5],        // Zahl der Wellen (aus der Nummer des Angriffs)
  waveN: [6, 2],        // Angreifer je Welle allein: a + b · Welle
  perN: 0.5, perHp: 0.15, perAtk: 0.03, perLeader: 0.6,
  cap: 36,              // höchstens so viele Angreifer zugleich
  hp: 0.9, atk: 0.9,    // Leben und Schaden der Angreifer gegenüber gewöhnlichen Monstern ihrer Stufe
  leaderHp: 12, leaderAtk: 1.3, escort: 4,
  waveMax: 100,         // so lange (s) darf eine Welle dauern, dann kommt die nächste trotzdem
  first: 8, pause: 10,  // Sekunden bis zur ersten Welle bzw. zwischen zwei Wellen
  batch: 6,             // die zweite Hälfte einer Welle kommt so viel später (s)
  maxTime: 900,         // danach ziehen die Angreifer ab
  front: 5, spawn: 22,  // Kacheln vor dem Tor: Platz der Wachen bzw. wo die Angreifer erscheinen
  area: 45,             // so weit (Kacheln) um den Platz vor dem Tor gehört alles zum Angriff
  near: 80,             // Spieler so nah (Kacheln) an der Stadtmitte zählen für die Stärke
  gate: { hp: 100, every: 4, hit: 1, leader: 3, r: 4 },
  guards: 4, guardRange: 6, guardDmg: 0.06, guardLeader: 0.01, guardEvery: 1.2, guardSpeed: 115,
  seek: 14,             // Angreifer suchen sich Spieler in dieser Nähe (Kacheln)
  // Belohnung: Erfahrung = xp gewöhnliche Monster der Stufe, Gold a · Monstergold + b · Stufe, je × Beitrag (min … max);
  // Ätherkern ab Stufe kernAb mit kern · Beitrag, Juwel ab juwelAb mit juwel · Beitrag; Tor gefallen oder zu lange: × lost
  // help: die Wachen nehmen einen Teil der Arbeit ab – so viel mehr zählt der eigene Schaden
  lohn: { xp: 15, gold: [40, 200], kern: 0.06, kernAb: 40, juwel: 0.02, juwelAb: 75, min: 0.25, max: 1.6, lost: 0.4, present: 30, presentK: 0.6, help: 1.3 },
  color: '#ffb04a',
  testShift: 0          // nur für Tests: verschiebt die Uhr (ms)
};
const angNow = () => Date.now() + ANGRIFF.testShift;
const angFmt = (n) => Math.round(n).toLocaleString('de-DE');
const angStartOf = (k) => ANGRIFF.shift + Math.floor(k / 2) * ANGRIFF.period + ANGRIFF.offsets[((k % 2) + 2) % 2];
// Nummer des letzten Angriffs, der bis t begonnen hat
function angIndexAt(t) {
  const b = Math.floor((t - ANGRIFF.shift) / ANGRIFF.period);
  let k = b * 2 + 1;
  while (angStartOf(k) > t) k--;
  return k;
}
// Zahl der Wellen: 3, 4 oder 5, aus der Nummer des Angriffs
function angWaves(k) {
  const R = ANGRIFF.waves[1] - ANGRIFF.waves[0] + 1;
  return ANGRIFF.waves[0] + ((((k * 7 + 3) % R) + R) % R);
}
const ANG_TORE = [
  { name: 'Osttor', d: [1, 0] }, { name: 'Westtor', d: [-1, 0] }, { name: 'Südtor', d: [0, 1] }, { name: 'Nordtor', d: [0, -1] }
];

// --- Städte und Tore -------------------------------------------------------------------------------------------------
const ANG_TOWN = new Map();
function angMapLevels(wm) {
  const nums = String(wm.levels || '').match(/\d+/g);
  const lo = wm.minLevel || (nums ? +nums[0] : 1);
  const hi = nums ? Math.max(...nums.map(Number)) : lo;
  return [Math.max(1, Math.min(lo, hi)), Math.max(lo, hi)];
}
// Stadt einer Karte mit ihren Toren: Platz vor dem Tor (Wachen) und weiter draußen (Angreifer), beides begehbar
function angTown(mapId) {
  if (ANG_TOWN.has(mapId)) return ANG_TOWN.get(mapId);
  let T = null;
  const wm = WORLD_MAPS.find((m) => m.id === mapId);
  if (wm && game.world) {
    const cx = mapId === 1 ? CENTER_X : wm.cx;
    const cy = mapId === 1 ? CENTER_Y : wm.cy;
    const F = typeof mapFormInfo === 'function' ? mapFormInfo(mapId) : null;
    const zone = ZONES.find((z) => z.map === mapId && z.safe);
    const gates = [];
    const P = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
    ANG_TORE.forEach((G, k) => {
      if (F && F.gates && !F.gates[k]) return;
      const [dx, dy] = G.d;
      let s0 = -1;
      for (let s = 3; s < 80; s++) {
        const q = P(cx + dx * s, cy + dy * s);
        if (!inVillage(q.x, q.y)) { s0 = s; break; }
      }
      if (s0 < 0) return;
      const front = P(cx + dx * (s0 + ANGRIFF.front), cy + dy * (s0 + ANGRIFF.front));
      if (!canStand(front.x, front.y, 10, true)) return;
      // so weit hinaus, wie der Weg begehbar bleibt (mindestens 12 Kacheln vor dem Tor)
      let far = null;
      for (let s = s0 + ANGRIFF.spawn; s >= s0 + 12; s--) {
        const q = P(cx + dx * s, cy + dy * s);
        if (canStand(q.x, q.y, 10, true)) { far = q; break; }
      }
      if (!far) return;
      gates.push({ k, name: G.name, d: G.d, front, spawn: far, s0 });
    });
    // nicht vor dem Eingang des Turms der Verdammten kämpfen (nur feste Bauten: Dungeon-Eingänge wandern, und alle
    // Geräte müssen dieselben Tore haben)
    const avoid = typeof TURM_AT !== 'undefined' && typeof TURM_MAP !== 'undefined' && TURM_MAP && TURM_MAP.id === mapId ? [TURM_AT] : [];
    const near = (q, a) => hyp(q.x / TILE - a.x, q.y / TILE - a.y) < 14;
    const free = gates.filter((g) => !avoid.some((a) => near(g.front, a) || near(g.spawn, a)));
    if (free.length) gates.splice(0, gates.length, ...free);
    if (gates.length) {
      const [lo, hi] = angMapLevels(wm);
      T = { map: mapId, wm, cx, cy, name: mapId === 1 ? 'Kazehana' : (zone && zone.name) || wm.name, gates, lo, hi };
    }
  }
  ANG_TOWN.set(mapId, T);
  return T;
}
// Tor des Angriffs k auf dieser Karte (für alle gleich)
function angGateOf(T, k) {
  if (!T || !T.gates.length) return null;
  const h = (Math.imul((k >>> 0) ^ 0x51ed, 2654435761) + T.map * 97) >>> 0;
  return T.gates[h % T.gates.length];
}
const angMapOf = (e) => (e ? mapOfTile(Math.floor(e.x / TILE), Math.floor(e.y / TILE)) : null);

// --- Angreifer --------------------------------------------------------------------------------------------------------
// Arten der Karte nahe der Stufe; fehlen sie (kaum Monster auf der Karte), die nächstliegenden der Welt
function angPool(mapId, L) {
  const ok = (t) => t && !t.boss && !t.crystal && !t.raidBoss && !t.raid && !t.night && !t.weltboss && !t.inst && !t.turm && !t.rissElite;
  const local = [...new Set(ZONES.filter((z) => z.map === mapId && z.groups && !z.safe).flatMap((z) => z.groups.map((g) => g[0])))].filter((id) => ok(MONSTER_TYPES[id]));
  // lieber Arten, die von selbst angreifen (keine Rehe und Hasen vor dem Tor)
  const wild = local.filter((id) => MONSTER_TYPES[id].aggressive);
  if (wild.length >= 2) local.splice(0, local.length, ...wild);
  let near = local.filter((id) => Math.abs(MONSTER_TYPES[id].level - L) <= 6);
  if (near.length < 2) near = local.slice().sort((a, b) => Math.abs(MONSTER_TYPES[a].level - L) - Math.abs(MONSTER_TYPES[b].level - L)).slice(0, 3);
  if (near.length < 2) {
    const all = Object.keys(MONSTER_TYPES).filter((id) => ok(MONSTER_TYPES[id]) && !MONSTER_TYPES[id].dungeon);
    near = all.sort((a, b) => Math.abs(MONSTER_TYPES[a].level - L) - Math.abs(MONSTER_TYPES[b].level - L)).slice(0, 4);
  }
  return near;
}
// Anführer: ein Boss der Dungeons, dessen Stufe am nächsten liegt (ohne Endbosse, Instanzen und Weltbosse)
function angLeaderType(L) {
  const ids = Object.keys(MONSTER_TYPES).filter((id) => {
    const t = MONSTER_TYPES[id];
    return t.boss && !t.raid && !t.inst && !t.raidBoss && !t.weltboss && !t.rissHerr && !t.turm && (t.hpMul || 1) <= 40;
  });
  return ids.sort((a, b) => Math.abs(MONSTER_TYPES[a].level - L) - Math.abs(MONSTER_TYPES[b].level - L))[0] || null;
}
const angPl = (n) => Math.max(1, Math.min(40, n | 0 || 1));
function angScale(P) {
  const k = angPl(P) - 1;
  return { n: 1 + ANGRIFF.perN * k, hp: 1 + ANGRIFF.perHp * k, atk: 1 + ANGRIFF.perAtk * k, leader: 1 + ANGRIFF.perLeader * k };
}

// --- Angriffe führen (wer die Monster führt) ----------------------------------------------------------------------
// A = { k, map, T, gate, L, P, ph ('v' vor der ersten Welle, 'w' Welle, 'p' Pause, 'l' Anführer, 'e' vorbei), wave,
//   waves, until, waveAt, queue, mons, leader, gt (Torfestigkeit), gateAt, startAt, ok, endAt, tellAt }
const angHost = { maps: new Map(), done: new Set(), checkAt: 0 };
const angClock = () => game.time;
// Spieler auf einer Karte nahe der Stadt (für die Stärke), ohne den Welt-Wächter
function angPlayersAt(T) {
  const out = [];
  const add = (o) => {
    if (!o || o.dead || o.gone) return;
    const wm = angMapOf(o);
    if (wm && wm.id === T.map && hyp(o.x / TILE - T.cx, o.y / TILE - T.cy) < ANGRIFF.near) out.push(o);
  };
  if (!WAECHTER && game.player) add(game.player);
  if (net.mode === 'host') for (const rp of net.players.values()) if (!rp.waechter) add(rp);
  return out;
}
function angMapsWithPlayers() {
  const ids = new Set();
  const add = (o) => { const wm = o && !o.gone ? angMapOf(o) : null; if (wm) ids.add(wm.id); };
  if (!WAECHTER && game.player) add(game.player);
  if (net.mode === 'host') for (const rp of net.players.values()) if (!rp.waechter) add(rp);
  return ids;
}
function angBegin(mapId, k) {
  const T = angTown(mapId);
  const gate = angGateOf(T, k);
  if (!gate) return;
  const pl = angPlayersAt(T);
  const lv = pl.length ? pl.reduce((a, o) => a + (o.level || 1), 0) / pl.length : T.lo;
  const L = Math.max(T.lo, Math.min(T.hi, Math.round(lv)));
  const A = {
    k, map: mapId, T, gate, L, P: Math.max(1, pl.length), ph: 'v', wave: 0, waves: angWaves(k), until: angClock() + ANGRIFF.first,
    queue: [], mons: new Set(), leader: null, gt: ANGRIFF.gate.hp, gateAt: angClock() + ANGRIFF.gate.every, startAt: angClock(), ok: false, endAt: 0, tellAt: 0, dirty: true,
    pool: angPool(mapId, L), guards: angGuardsPlace(gate).map((at) => ({ x: at.x, y: at.y, homeX: at.x, homeY: at.y, facing: 1, moving: false, hitAt: Math.random(), r: 11 })),
    lastAt: angClock(), emptyAt: angClock()
  };
  angHost.maps.set(mapId, A);
}
function angSpawnOne(A, typeId, role) {
  const at = A.gate.spawn;
  const pos = spotNear(at, role === 'leader' ? 20 : 90);
  const t = MONSTER_TYPES[typeId];
  if (!t) return null;
  const m = createMonster(typeId, pos.x, pos.y, { level: A.L, respawn: false, zone: zoneAt(pos.x, pos.y) });
  const sc = angScale(A.P);
  const st = monsterStats(A.L, role === 'leader' ? 1 : t.hpMul, t.atkMul);
  if (role === 'leader') {
    m.maxHp = Math.max(1, Math.round(st.maxHp * ANGRIFF.leaderHp * sc.leader));
    m.atk = Math.round(st.atk * ANGRIFF.leaderAtk * sc.atk);
    m.level = A.L + 1;
    m.bossCd = 4;
    m.summoned = 0;
    m.angLeader = true;
  } else {
    m.maxHp = Math.max(1, Math.round(st.maxHp * ANGRIFF.hp * sc.hp));
    m.atk = Math.round(st.atk * ANGRIFF.atk * sc.atk);
    m.level = A.L;
  }
  m.hp = m.maxHp;
  m.def = st.def;
  // Heimat vor dem Tor: dorthin ziehen sie, wenn niemand sie aufhält
  m.homeX = A.gate.front.x + (Math.random() - 0.5) * 3 * TILE;
  m.homeY = A.gate.front.y + (Math.random() - 0.5) * 3 * TILE;
  m.state = 'return';
  m.stun = 0.35;
  m.flank = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5);
  m.angK = A.k;
  m.angMap = A.map;
  game.monsters.push(m);
  A.mons.add(m);
  return m;
}
function angStartWave(A) {
  A.wave++;
  A.ph = 'w';
  A.P = Math.max(1, angPlayersAt(A.T).length);
  const sc = angScale(A.P);
  const n = Math.min(ANGRIFF.cap, Math.round((ANGRIFF.waveN[0] + ANGRIFF.waveN[1] * A.wave) * sc.n));
  A.queue = [];
  for (let i = 0; i < n; i++) A.queue.push({ type: A.pool[randInt(0, A.pool.length - 1)], at: angClock() + (i < n / 2 ? i * 0.15 : ANGRIFF.batch + (i - n / 2) * 0.15) });
  A.waveAt = angClock();
  A.dirty = true;
}
function angStartLeader(A) {
  A.ph = 'l';
  A.P = Math.max(1, angPlayersAt(A.T).length);
  const lt = angLeaderType(A.L);
  if (lt) A.leader = angSpawnOne(A, lt, 'leader');
  for (let i = 0; i < ANGRIFF.escort; i++) angSpawnOne(A, A.pool[randInt(0, A.pool.length - 1)], 'mob');
  A.waveAt = angClock();
  A.dirty = true;
  angTellMap(A, { k: 'agl', m: A.map, a: A.k });
}
function angFinish(A, ok) {
  A.ph = 'e';
  A.ok = ok;
  A.endAt = angClock();
  A.dirty = true;
  angTellMap(A, { k: 'age', m: A.map, a: A.k, ok: ok ? 1 : 0, gt: Math.max(0, Math.round(A.gt)) });
}
// Meldung an alle (jeder prüft selbst, ob er auf der Karte ist); an die eigene Figur direkt
function angTellMap(A, d) {
  if (!WAECHTER && game.player) angOnMsg(d);
  if (net.mode === 'host' && typeof netSocial === 'function') {
    for (const [pid, rp] of net.players) {
      if (rp.waechter || rp.gone) continue;
      const wm = angMapOf(rp);
      if (wm && wm.id === A.map) netSocial(pid, d);
    }
  }
}
function angStateMsg(A) {
  const L = A.leader;
  let alive = 0;
  for (const m of A.mons) if (!m.dead) alive++;
  return { k: 'ags', m: A.map, a: A.k, ph: A.ph, w: A.wave, W: A.waves, n: alive, gt: Math.max(0, Math.round(A.gt)), lv: A.L, P: A.P, lh: L && !L.dead ? Math.round((L.hp / L.maxHp) * 100) / 100 : 0 };
}
function angTickHost() {
  if (net.mode === 'client') return;
  const now = angClock();
  // neuer Angriff: auf jeder Karte, auf der gerade jemand ist (einmal je Angriff und Karte)
  if (now >= angHost.checkAt) {
    angHost.checkAt = now + 1;
    const t = angNow();
    const k = angIndexAt(t);
    const since = (t - angStartOf(k)) / 1000;
    if (since >= 0 && since <= ANGRIFF.late) {
      for (const mapId of angMapsWithPlayers()) {
        const key = k + ':' + mapId;
        if (angHost.done.has(key) || angHost.maps.has(mapId)) continue;
        angHost.done.add(key);
        angBegin(mapId, k);
      }
    }
  }
  for (const [mapId, A] of angHost.maps) {
    if (A.ph === 'e') {
      // vorbei: übrige Angreifer ziehen ab
      if (now - A.endAt > 3 && A.mons.size) {
        for (const m of A.mons) if (!m.dead) particles(m.x, m.y - 10, { count: 8, color: ['#d8cfc0', '#b8ad9a'], speed: [30, 90], life: [0.4, 0.8], size: [2, 4], drag: 3 });
        const gone = [];
        game.monsters = game.monsters.filter((m) => {
          const mine = m.angK === A.k && m.angMap === A.map;
          if (mine) gone.push(m.id);
          return !mine;
        });
        if (game.target && game.target.angK === A.k) game.target = null;
        // Mitspieler entfernen sie ebenso (Meldung wie bei den Nachtmonstern, tag-nacht.js)
        if (gone.length && net.mode === 'host') netBroadcast({ t: 'gone', ids: gone });
        A.mons.clear();
      }
      if (now - A.endAt > 12) angHost.maps.delete(mapId);
      continue;
    }
    // Angreifer erscheinen nach ihrer Zeit (höchstens cap zugleich)
    let alive = 0;
    for (const m of A.mons) if (!m.dead) alive++;
    while (A.queue.length && A.queue[0].at <= now && alive < ANGRIFF.cap) {
      const q = A.queue.shift();
      if (angSpawnOne(A, q.type, 'mob')) alive++;
    }
    for (const m of A.mons) if (m.dead) A.mons.delete(m);
    // Tor: wer davor steht und nicht gerade einen Spieler jagt, schlägt auf das Tor ein
    if (now >= A.gateAt) {
      A.gateAt = now + ANGRIFF.gate.every;
      const f = A.gate.front;
      let hit = 0;
      for (const m of A.mons) {
        if (m.dead || hyp(m.x - f.x, m.y - f.y) > ANGRIFF.gate.r * TILE) continue;
        const busy = m.state === 'chase' && m.target && !m.target.dead && (m.target === game.player || m.target.remote);
        if (!busy) hit += m === A.leader ? ANGRIFF.gate.leader : ANGRIFF.gate.hit;
      }
      if (hit) { A.gt -= hit; A.dirty = true; }
      if (A.gt <= 0) { angFinish(A, false); continue; }
    }
    if (now - A.startAt > ANGRIFF.maxTime) { angFinish(A, false); continue; }
    // niemand mehr an der Stadt: nach anderthalb Minuten ziehen die Angreifer ab
    if (now - (A.seenAt || 0) > 2) {
      A.seenAt = now;
      if (angPlayersAt(A.T).length) A.emptyAt = now;
      else if (now - A.emptyAt > 90) { angFinish(A, false); continue; }
    }
    // Stadtwachen (rechnen hier, auch wenn die eigene Figur woanders ist)
    angGuardsTick(A.guards, A.mons, Math.max(0, Math.min(0.25, now - A.lastAt)), true);
    A.lastAt = now;
    if (A.ph === 'v' || A.ph === 'p') {
      if (now >= A.until) {
        if (A.wave < A.waves) angStartWave(A);
        else angStartLeader(A);
      }
    } else if (A.ph === 'w') {
      if ((!A.queue.length && alive === 0) || now - A.waveAt > ANGRIFF.waveMax) {
        A.ph = 'p';
        A.until = now + ANGRIFF.pause;
        A.dirty = true;
        angTellMap(A, { k: 'agw', m: A.map, a: A.k, w: A.wave });
      }
    } else if (A.ph === 'l') {
      if (!A.leader || A.leader.dead) angFinish(A, true);
    }
    // Angreifer ohne Ziel suchen sich den nächsten Spieler vor dem Tor, sonst ziehen sie weiter zum Tor
    if (now >= (A.seekAt || 0)) {
      A.seekAt = now + 0.5;
      const hunt = angHuntable();
      for (const m of A.mons) {
        if (m.dead || (m.state === 'chase' && m.target && !m.target.dead && !m.target.gone)) continue;
        let best = null;
        let bd = ANGRIFF.seek * TILE;
        for (const o of hunt) { const d = hyp(o.x - m.x, o.y - m.y); if (d < bd) { bd = d; best = o; } }
        if (best) { m.state = 'chase'; m.target = best; m.windup = 0; } else if (m.state === 'idle' && hyp(m.x - m.homeX, m.y - m.homeY) > 3 * TILE) m.state = 'return';
      }
    }
    if (A.dirty || now >= A.tellAt) {
      A.dirty = false;
      A.tellAt = now + 2;
      angTellMap(A, angStateMsg(A));
    }
  }
  if (angHost.done.size > 300) angHost.done = new Set([...angHost.done].slice(-100));
}
// Spieler, die Angreifer jagen dürfen (lebend, sichtbar, nicht in der Stadt)
function angHuntable() {
  const out = [];
  for (const o of huntablePlayers()) if (o && !o.dead && !o.gone && !playerHidden(o)) out.push(o);
  return out;
}

// --- Stadtwachen (jedes Gerät für sich; Schaden nur beim Host) ------------------------------------------------------
// Vier Wachen vor dem Tor, zwei vorn, zwei dahinter. Sie greifen Angreifer in ihrer Nähe an und kehren dann auf ihren
// Platz zurück. Monster greifen sie nicht an (sie gehören zur Stadt).
function angGuardsPlace(gate) {
  const [dx, dy] = gate.d;
  const px = -dy;
  const py = dx;
  const f = gate.front;
  const spots = [[1.6, 0], [-1.6, 0], [3.2, -1.6], [-3.2, -1.6]];
  return spots.slice(0, ANGRIFF.guards).map(([side, back]) => ({ x: f.x + (px * side + dx * back) * TILE, y: f.y + (py * side + dy * back) * TILE }));
}
function angGuardsUp(L) {
  const w = game.world;
  if (!w || L.guards) return;
  L.guards = angGuardsPlace(L.gate).map((at, i) => {
    const n = { id: 'wache', name: 'Stadtwache', x: at.x, y: at.y, r: 11, silent: true, angGuard: true, homeX: at.x, homeY: at.y, facing: L.gate.d[0] < 0 ? -1 : 1, moving: false, hitAt: i * 0.3 };
    w.npcs.push(n);
    vfxPillar(n, ANGRIFF.color);
    return n;
  });
}
function angGuardsDown(L) {
  if (!L.guards) return;
  const set = new Set(L.guards);
  if (game.world) game.world.npcs = game.world.npcs.filter((n) => !set.has(n));
  L.guards = null;
}
// Angreifer in der Nähe (beim Host aus dem Angriff, beim Mitspieler alles ohne Wiederkehr am Tor)
function angFoes(L) {
  const A = angHost.maps.get(L.map);
  if (A && net.mode !== 'client') return A.mons;
  const f = L.gate.front;
  const out = [];
  for (const m of monstersNear(f.x, f.y, ANGRIFF.area * TILE)) if (!m.dead && m.respawn === false && !m.isStone && hyp(m.x - f.x, m.y - f.y) < ANGRIFF.area * TILE) out.push(m);
  return out;
}
// guards: Wachen (beim Host Rechenfiguren des Angriffs, sonst die sichtbaren NPCs); hit: Schaden austeilen (nur Host)
function angGuardsTick(guards, foes, dt, hit) {
  if (!guards) return;
  const p = game.player;
  let i = 0;
  for (const g of guards) {
    i++;
    let best = null;
    let bd = Infinity;
    for (const m of foes) {
      if (m.dead) continue;
      const dh = hyp(m.x - g.homeX, m.y - g.homeY);
      if (dh > ANGRIFF.guardRange * TILE) continue;
      const d = hyp(m.x - g.x, m.y - g.y);
      if (d < bd) { bd = d; best = m; }
    }
    // jede Wache tritt von einer anderen Seite an ihr Ziel (sonst stünden zwei auf demselben Fleck)
    const a = i * 2.1;
    const off = best ? (best.r || 14) + 18 : 0;
    const tx = best ? best.x + Math.cos(a) * off : g.homeX;
    const ty = best ? best.y + Math.sin(a) * off * 0.7 : g.homeY;
    const dx = tx - g.x;
    const dy = ty - g.y;
    const d = hyp(dx, dy);
    g.moving = false;
    if (d > 4) {
      const st = Math.min(d - 3, ANGRIFF.guardSpeed * dt);
      g.x += (dx / d) * st;
      g.y += (dy / d) * st;
      g.moving = st > 0.5;
    }
    const fx = best ? best.x - g.x : dx;
    if (Math.abs(fx) > 2) g.facing = fx > 0 ? 1 : -1;
    if (!best || hyp(best.x - g.x, best.y - g.y) > (best.r || 14) + 34) continue;
    g.hitAt = (g.hitAt || 0) - dt;
    if (g.hitAt > 0) continue;
    g.hitAt = ANGRIFF.guardEvery * (0.85 + Math.random() * 0.3);
    if (p && Math.abs(best.x - p.x) < 1400 && Math.abs(best.y - p.y) < 1000) vfxImpact(best, false, '#ffe0a0');
    if (hit && !best.dead) {
      const pct = best.type && best.type.boss ? ANGRIFF.guardLeader : ANGRIFF.guardDmg;
      damageMonster(best, Math.max(1, Math.round(best.maxHp * pct)), false, null, false, false);
    }
  }
}

// --- Der eigene Blick auf den Angriff ------------------------------------------------------------------------------
// angLocal: { k, map, T, gate, ph, w, W, n, gt, lv, P, lh, at (letzte Meldung), startAt, dmg (eigener Schaden), seenHp,
//   seen (Nummern), maxP, present (s vor dem Tor), leaderSeen, leaderDead, ok, done, guards }
let angLocal = null;
const angSeenNote = { k: null, n5: false, n1: false, start: false, old: false };
function angInArea(L, e) {
  return !!(L && e && hyp(e.x - L.gate.front.x, e.y - L.gate.front.y) < ANGRIFF.area * TILE);
}
// Nachricht des Hosts prüfen (nur bekannte Felder, Zahlen im erlaubten Bereich)
function angClean(d) {
  const n = (v, lo, hi, def = lo) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def);
  return {
    k: d.k, m: Math.floor(n(d.m, 0, 999)), a: Math.floor(n(d.a, -1e9, 1e9)), ph: ['v', 'w', 'p', 'l', 'e'].includes(d.ph) ? d.ph : 'v',
    w: Math.floor(n(d.w, 0, 9)), W: Math.floor(n(d.W, 1, 9, 3)), n: Math.floor(n(d.n, 0, 999)), gt: n(d.gt, 0, ANGRIFF.gate.hp, ANGRIFF.gate.hp),
    lv: Math.floor(n(d.lv, 1, 99, 1)), P: Math.floor(n(d.P, 1, 100, 1)), lh: n(d.lh, 0, 1), ok: d.ok ? 1 : 0
  };
}
function angOnMsg(raw) {
  const p = game.player;
  if (!p || !raw || typeof raw !== 'object') return;
  const d = angClean(raw);
  const wm = angMapOf(p);
  if (!wm || wm.id !== d.m) return;
  const T = angTown(d.m);
  // Tor aus Angriff und Karte – auf jedem Gerät gleich; ein Host mit anderem Zeitplan wird nicht übernommen
  const gate = angGateOf(T, d.a);
  if (!gate) return;
  if (!angLocal || angLocal.k !== d.a || angLocal.map !== d.m) {
    if (angLocal) angEndLocal(false);
    angLocal = { p, k: d.a, map: d.m, T, gate, ph: 'v', w: 0, W: 3, n: 0, gt: ANGRIFF.gate.hp, lv: T.lo, P: 1, lh: 0, at: game.time, startAt: game.time,
      dmg: 0, seenHp: 0, seen: new Set(), maxP: 1, present: 0, leaderSeen: false, leaderDead: false, ok: false, done: false, guards: null };
    ui.banner('Angriff auf die Stadt!', `${T.name} · ${gate.name}`);
    ui.chat('', `Monster greifen die Stadt an · ${T.name} · ${gate.name}`, 'g', 'warn');
    angSeenNote.start = true;
  }
  const L = angLocal;
  if (L.done) return;
  L.at = game.time;
  if (d.k === 'ags') {
    const was = L.w;
    Object.assign(L, { ph: d.ph, w: d.w, W: d.W, n: d.n, gt: d.gt, lv: Math.max(T.lo, Math.min(T.hi, d.lv)), P: d.P, lh: d.lh });
    if (d.ph === 'w' && d.w !== was) ui.banner(`Welle ${d.w} von ${d.W}`, `${T.name} · ${gate.name}`);
  } else if (d.k === 'agl') {
    L.ph = 'l';
    ui.banner('Der Anführer greift an!', `${T.name} · ${gate.name}`);
    if (typeof shakeScreen === 'function') shakeScreen(5);
  } else if (d.k === 'agw') {
    ui.log(`Welle ${d.w} abgewehrt.`, 'info');
  } else if (d.k === 'age') {
    L.gt = d.gt;
    angEndLocal(!!d.ok);
  }
  angGuardsUp(L);
}
// eigener Schaden an den Angreifern (auch über Diener); beim Mitspieler sofort beim Treffer gezählt
function angTrack(m, amount, source) {
  const L = angLocal;
  const p = game.player;
  if (!L || L.done || !p || !(amount > 0) || !m || m.isStone || m.respawn !== false || !angInArea(L, m)) return;
  if (!(source === p || (source && source.ally && game.allies.includes(source)))) return;
  // auch gleich als gesehen zählen (wer in der ersten halben Sekunde fällt, entginge sonst dem Takt)
  if (!L.seen.has(m.id)) {
    L.seen.add(m.id);
    L.seenHp += m.maxHp || 0;
    if (m.type && m.type.boss) L.leaderSeen = true;
  }
  L.dmg += Math.min(amount, Math.max(0, m.hp));
}
if (typeof damageMonster === 'function') {
  const _angDamageMonster = damageMonster;
  // eslint-disable-next-line no-global-assign
  damageMonster = function (m, amount, crit, source) {
    try { angTrack(m, amount, source); } catch (e) { /* zählt nur mit */ }
    return _angDamageMonster.apply(this, arguments);
  };
}
// Beitrag der eigenen Figur: Anteil am Leben aller gesehenen Angreifer im Vergleich zu einem gleichen Anteil unter den
// Spielern vor dem Tor; wer nur da war (Heiler, Unterstützer), bekommt etwas nach der Zeit vor dem Tor
function angShare(L) {
  const W = ANGRIFF.lohn;
  const dur = Math.max(60, game.time - L.startAt);
  const byDmg = L.seenHp > 0 ? (W.help * L.dmg * Math.max(1, L.maxP)) / L.seenHp : 0;
  const byTime = W.presentK * Math.min(1, L.present / dur);
  if (L.dmg <= 0 && L.present < W.present) return 0;
  return Math.max(W.min, Math.min(W.max, Math.max(byDmg, byTime)));
}
function angLohn(L, r, ok) {
  const W = ANGRIFF.lohn;
  const k = r * (ok ? 1 : W.lost);
  const st = monsterStats(L.lv);
  const g = (st.gold[0] + st.gold[1]) / 2;
  return {
    xp: Math.round(st.xp * W.xp * k), gold: Math.round((g * W.gold[0] + W.gold[1] * L.lv) * k),
    kern: L.lv >= W.kernAb ? W.kern * k : 0, juwel: L.lv >= W.juwelAb ? W.juwel * k : 0
  };
}
function angEndLocal(ok) {
  const L = angLocal;
  if (!L || L.done) return;
  L.done = true;
  // Sieg beim Mitspieler nur, wenn er den Anführer selbst gesehen hat und der im eigenen Bild nicht mehr lebt
  const won = ok && (net.mode !== 'client' || (L.leaderSeen && !angLeaderAlive(L)));
  L.ok = won;
  const r = angShare(L);
  const p = game.player;
  const T = L.T;
  if (r > 0 && p) {
    const W = angLohn(L, r, won);
    const got = [];
    p.gold += W.gold;
    ui.loot('Gold', W.gold, lootIconUrl('gold'), '#ffd96a');
    got.push(['Gold', angFmt(W.gold)]);
    gainXp(W.xp);
    got.push(['Erfahrung', angFmt(W.xp)]);
    if (W.kern && Math.random() < W.kern) {
      p.materials.aetherkern = (p.materials.aetherkern || 0) + 1;
      if (typeof materialIconUrl === 'function') ui.loot('Ätherkern', 1, materialIconUrl('aetherkern'), MATERIAL_COLORS.aetherkern);
      got.push(['Ätherkern', '1']);
    }
    if (W.juwel && p.level >= ANGRIFF.lohn.juwelAb && typeof juwelDrop === 'function' && Math.random() < W.juwel) {
      juwelDrop(1);
      got.push(['Juwel', '1']);
    }
    angSummary(L, won, r, got);
    saveGame();
  }
  if (won) {
    ui.banner('Die Stadt ist gerettet!', `${T.name} · ${L.gate.name}`);
    ui.chat('', `Der Angriff ist abgewehrt · ${T.name} · ${L.gate.name}`, 'g', 'level');
  } else {
    ui.banner('Die Angreifer ziehen ab', L.gt <= 0 ? `Das Tor ist gefallen · ${L.gate.name}` : 'Sie waren zu lange vor dem Tor');
    ui.chat('', `Der Angriff ist vorbei – die Angreifer ziehen ab · ${T.name}`, 'g', 'info');
  }
  later(8, () => { if (angLocal === L) { angGuardsDown(L); angLocal = null; angHud(); } });
  angHud();
}
function angLeaderAlive(L) {
  for (const m of angFoes(L)) if (!m.dead && m.type && m.type.boss) return true;
  return false;
}
// Takt: Zählen (gesehene Angreifer, Spieler vor dem Tor, Zeit vor dem Tor), Wachen, Anzeige, Ansagen
function angLocalTick(dt) {
  const L = angLocal;
  const p = game.player;
  if (!L || !p) return;
  // anderer Charakter (Wechsel ohne Neuladen): neu beginnen
  if (L.p && L.p !== p) {
    angGuardsDown(L);
    angLocal = null;
    return;
  }
  // ohne Meldung des Hosts (Kanal gewechselt, Host weg): nach einer Weile vorbei, ohne Belohnung
  if (!L.done && game.time - L.at > 30) {
    L.done = true;
    angGuardsDown(L);
    angLocal = null;
    angHud();
    return;
  }
  if (!L.done) {
    L.tickAt = (L.tickAt || 0) - dt;
    if (L.tickAt <= 0) {
      L.tickAt = 0.5;
      const f = L.gate.front;
      for (const m of angFoes(L)) {
        if (m.dead || L.seen.has(m.id)) continue;
        L.seen.add(m.id);
        L.seenHp += m.maxHp || 0;
        if (m.type && m.type.boss) L.leaderSeen = true;
      }
      let P = 0;
      if (!p.dead && hyp(p.x - f.x, p.y - f.y) < ANGRIFF.area * TILE) { P++; L.present += 0.5; }
      for (const rp of net.players.values()) if (!rp.dead && !rp.gone && !rp.waechter && hyp(rp.x - f.x, rp.y - f.y) < ANGRIFF.area * TILE) P++;
      L.maxP = Math.max(L.maxP, P);
    }
  }
  const A = net.mode !== 'client' ? angHost.maps.get(L.map) : null;
  if (A && A.k === L.k && A.guards && L.guards) {
    L.guards.forEach((n, i) => {
      const g = A.guards[i];
      if (!g) return;
      n.x = g.x;
      n.y = g.y;
      n.moving = g.moving;
      n.facing = g.facing;
    });
  } else if (!L.done) angGuardsTick(L.guards, angFoes(L), dt, false);
}
function angAnnounceTick() {
  const p = game.player;
  if (!p || WAECHTER) return;
  const t = angNow();
  const k = angIndexAt(t);
  const next = k + 1;
  const left = angStartOf(next) - t;
  const wm = angMapOf(p);
  const T = wm ? angTown(wm.id) : null;
  if (angSeenNote.k !== next) Object.assign(angSeenNote, { k: next, n5: false, n1: false, start: false, old: false });
  if (!T) return;
  const gate = angGateOf(T, next);
  if (!gate) return;
  if (left <= ANGRIFF.warn && left > ANGRIFF.remind && !angSeenNote.n5) {
    angSeenNote.n5 = true;
    const min = Math.max(2, Math.ceil(left / 60000));
    ui.chat('', `Stadt-Angriff in ${min} Minuten – sammelt euch vor dem Tor · ${T.name} · ${gate.name}`, 'g', 'warn');
    ui.banner(`Stadt-Angriff in ${min} Minuten`, `${T.name} · ${gate.name}`);
  } else if (left <= ANGRIFF.remind && left > 0 && !angSeenNote.n1) {
    angSeenNote.n5 = true;
    angSeenNote.n1 = true;
    ui.chat('', `Noch eine Minute bis zum Stadt-Angriff · ${T.name} · ${gate.name}`, 'g', 'warn');
  }
  // Host mit älterer Version: kein Angriff, obwohl er beginnen müsste
  const since = (t - angStartOf(k)) / 1000;
  if (net.mode === 'client' && since > 40 && since < ANGRIFF.late + 60 && (!angLocal || angLocal.k !== k) && angSeenNote.k === k + 1 && !angSeenNote.old) {
    angSeenNote.old = true;
    const T0 = angTown(wm.id);
    if (T0 && hyp(p.x / TILE - T0.cx, p.y / TILE - T0.cy) < ANGRIFF.near) ui.log('Der Angriff bleibt aus – spielt der Host des Kanals eine ältere Version?', 'info');
  }
}
let angLastT = 0;
function angTick() {
  if (!game.player || !game.running) return;
  const dt = Math.max(0, Math.min(0.25, game.time - (angLastT || game.time)));
  angLastT = game.time;
  angTickHost();
  if (WAECHTER) return;
  angLocalTick(dt);
  angAnnounceTick();
  angHud();
}
const _angRaidWatch = raidWatch;
// eslint-disable-next-line no-global-assign
raidWatch = function () {
  _angRaidWatch();
  try { angTick(); } catch (e) { console.warn('Stadt-Angriff:', e); }
};
// Meldungen des Hosts ('ag…'): nur beim Mitspieler und nur vom Host; die eigene Führung ruft angOnMsg direkt auf
const _angOnSocial = onSocial;
// eslint-disable-next-line no-global-assign
onSocial = function (pid, d) {
  if (d && typeof d.k === 'string' && /^ag[a-z]$/.test(d.k)) {
    try {
      if (net.mode === 'client' && pid === 'host' && /^ag[slwe]$/.test(d.k)) angOnMsg(d);
    } catch (e) { console.warn('Stadt-Angriff:', e); }
    return;
  }
  return _angOnSocial(pid, d);
};
// Kills nur durch die Wachen geben nichts (beim Host und allein; beim Mitspieler prüft das netEligible über die
// Treffer-Liste des Hosts). Der Anführer gibt Erfahrung und etwas Gold, aber keine Beute eines Dungeon-Bosses (er kehrt
// auch nicht zurück) – die Belohnung des Angriffs kommt am Ende.
const angIsLeader = (m) => !!(m && m.type && m.type.boss && m.respawn === false && (m.angLeader || (angLocal && angInArea(angLocal, m))));
function angLeaderReward(m) {
  const p = game.player;
  p.kills++;
  const xp = Math.max(1, Math.round(monsterStats(m.level).xp * 3 * MOB_XP_MUL * xpFactor(p.level, m.level)));
  const gold = m.gold ? Math.round(randInt(m.gold[0], m.gold[1]) * 3) : 0;
  if (gold > 0) {
    p.gold += gold;
    addText(m.x + 14, feetY(m) - 30, '+' + gold.toLocaleString('de-DE') + ' Gold', 'gold');
  }
  gainXp(typeof partyXp === 'function' ? partyXp(xp, m) : xp);
}
const _angRewardKill = rewardKill;
// eslint-disable-next-line no-global-assign
rewardKill = function (m) {
  if (m && m.angK != null && net.mode !== 'client') {
    const me = game.player;
    if (!me || !m.tags || !m.tags.has(me.name)) return;
  }
  if (angIsLeader(m)) {
    angLeaderReward(m);
    return;
  }
  return _angRewardKill(m);
};

// --- Anzeige --------------------------------------------------------------------------------------------------------
function angCss() {
  if (document.getElementById('angCss')) return;
  const st = document.createElement('style');
  st.id = 'angCss';
  st.textContent =
    '#angHud{position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:5;pointer-events:none;min-width:230px;max-width:min(340px,calc(100vw - 32px));' +
    'padding:6px 12px 8px;border-radius:12px;background:linear-gradient(180deg,rgba(60,34,14,.92),rgba(26,14,8,.9));border:1px solid rgba(255,176,74,.6);' +
    'box-shadow:0 4px 14px rgba(0,0,0,.45);color:#ffe8cc;text-shadow:0 1px 2px #000;font:600 12.5px/1.3 system-ui,sans-serif;text-align:center}' +
    '#angHud b{color:#ffc86a;font-size:13.5px}#angHud .row{display:flex;justify-content:space-between;gap:10px;margin-top:3px}' +
    '#angHud .bar{height:6px;margin-top:4px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden}#angHud .bar i{display:block;height:100%;transition:width .3s;background:linear-gradient(90deg,#8a5a2a,#ffc86a)}' +
    '#angHud .bar.ld i{background:linear-gradient(90deg,#c8402f,#ff9a5a)}#angHud.touch{top:auto;bottom:118px;font-size:11px;min-width:0;padding:4px 10px 6px}' +
    'body.has-boss #angHud:not(.touch){top:96px}' +
    '#angSum{position:fixed;left:50%;top:42%;transform:translate(-50%,-50%) scale(.92);opacity:0;z-index:60;min-width:240px;max-width:min(340px,calc(100vw - 32px));padding:14px 16px 12px;border-radius:12px;' +
    'background:rgba(30,18,10,.94);border:1px solid rgba(255,176,74,.6);box-shadow:0 6px 24px rgba(0,0,0,.55);color:#f6e6d0;font-size:14px;transition:opacity .25s,transform .25s;pointer-events:auto}' +
    '#angSum.on{opacity:1;transform:translate(-50%,-50%) scale(1)}#angSum h3{margin:0 26px 8px 0;font-size:16px;color:#ffc86a}#angSum .x{position:absolute;top:6px;right:8px;width:30px;height:30px;border:0;border-radius:8px;background:rgba(255,255,255,.08);color:#f6e6d0;font-size:16px;cursor:pointer}' +
    '#angSum dl{display:grid;grid-template-columns:auto auto;gap:4px 14px;margin:0}#angSum dt{opacity:.8}#angSum dd{margin:0;text-align:right;font-weight:600}#angSum dd.g{color:#ffd56a}';
  document.head.appendChild(st);
}
const angUi = { key: '' };
function angHud() {
  const L = angLocal;
  const p = game.player;
  const wm = p ? angMapOf(p) : null;
  const show = !!(L && wm && wm.id === L.map && !(typeof game.rlRun !== 'undefined' && game.rlRun));
  let el = document.getElementById('angHud');
  if (!show) {
    if (el) el.remove();
    angUi.key = '';
    return;
  }
  angCss();
  const touch = !!(typeof input !== 'undefined' && input.touchUi);
  if (!el) {
    el = document.createElement('div');
    el.id = 'angHud';
    document.body.appendChild(el);
    angUi.key = '';
  }
  el.classList.toggle('touch', touch);
  const share = L.seenHp > 0 ? Math.min(100, Math.round((L.dmg / L.seenHp) * 100)) : 0;
  let what;
  if (L.done) what = L.ok || (L.leaderSeen && !angLeaderAlive(L) && L.gt > 0) ? 'Abgewehrt!' : 'Die Angreifer ziehen ab';
  else if (L.ph === 'v') what = 'Gleich kommen sie …';
  else if (L.ph === 'p') what = `Welle ${L.w} abgewehrt – die nächste kommt`;
  else if (L.ph === 'l') what = 'Der Anführer greift an!';
  else what = `Welle ${L.w} von ${L.W}`;
  const bar = L.ph === 'l' && !L.done ? Math.round(L.lh * 100) : Math.round(L.gt);
  const key = [touch, what, L.n, bar, share, L.ph].join('|');
  if (key === angUi.key) return;
  angUi.key = key;
  el.innerHTML = `<b>Angriff auf die Stadt</b> · <span>${L.T.name}</span> · <span>${L.gate.name}</span><div class="row"><span>${what}</span><span>${L.ph === 'l' && !L.done ? `Anführer ${bar} %` : `Tor ${bar} %`}</span></div>` +
    `<div class="bar${L.ph === 'l' && !L.done ? ' ld' : ''}"><i style="width:${bar}%"></i></div>` +
    (touch ? '' : `<div class="row"><small>Angreifer ${L.n}</small><small>Dein Beitrag ${share} %</small></div>`);
}
function angSummary(L, won, r, got) {
  angCss();
  let el = document.getElementById('angSum');
  if (el) el.remove();
  el = document.createElement('div');
  el.id = 'angSum';
  el.setAttribute('role', 'dialog');
  el.innerHTML = '<button class="x" type="button" aria-label="Schließen">✕</button>' +
    `<h3>${won ? 'Die Stadt ist gerettet!' : 'Die Angreifer ziehen ab'}</h3><dl>` +
    `<dt>Stadt</dt><dd>${L.T.name}</dd><dt>Tor</dt><dd>${L.gate.name}</dd><dt>Stufe</dt><dd>${L.lv}</dd>` +
    `<dt>Dein Schaden</dt><dd>${L.seenHp > 0 ? Math.min(100, Math.round((L.dmg / L.seenHp) * 100)) : 0} %</dd><dt>Belohnung</dt><dd>× ${(Math.round(r * (won ? 1 : ANGRIFF.lohn.lost) * 100) / 100).toLocaleString('de-DE')}</dd>` +
    got.map(([n, v]) => `<dt>${n}</dt><dd class="g">+${v}</dd>`).join('') + '</dl>';
  document.body.appendChild(el);
  const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 260); };
  el.querySelector('.x').addEventListener('click', close);
  requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(close, 14000);
}

// --- Ratgeber -------------------------------------------------------------------------------------------------------
if (typeof RATGEBER_WISSEN !== 'undefined') {
  RATGEBER_WISSEN.push({
    c: 'kampf', p: 2, q: 'Was sind Stadt-Angriffe?',
    a: 'Alle zwei bis drei Stunden (um 0:40, 2:40, 5:40, 7:40, 10:40, 12:40 … Weltzeit) greifen Monster die Stadt jeder Karte an, auf der gerade jemand spielt. Fünf Minuten vorher steht im Chat, welches Tor es trifft. ' +
      'Gekämpft wird vor dem Tor – die Stadt selbst bleibt sicher. Vier Stadtwachen helfen. Nach drei bis fünf Wellen kommt ein Anführer; fällt er, ist die Stadt gerettet. Bleiben Angreifer ungestört am Tor, schlagen sie es ein.',
    k: 'stadt angriff angriffe welle wellen tor stadtwache verteidigen anführer'
  }, {
    c: 'kampf', q: 'Was bringt die Verteidigung einer Stadt?',
    a: 'Jeder bekommt nach seinem <b>Beitrag</b> (eigener Schaden an den Angreifern im Vergleich zu den anderen vor dem Tor; wer nur heilt oder hilft, nach der Zeit vor dem Tor): Erfahrung und Gold, ab Stufe 40 mit etwas Glück einen Ätherkern, ab Stufe 75 selten ein Juwel. ' +
      'Dazu Erfahrung und Beute für jedes Monster, das du selbst triffst. Fällt das Tor oder dauert es zu lange, gibt es weniger. Die Stärke der Angreifer richtet sich nach der Zahl der Spieler – allein ist es gut zu schaffen.',
    k: 'stadt angriff belohnung beitrag tor gold erfahrung ätherkern juwel'
  });
}
