// Herausforderung (seit 13.63): die Prüfungsarena – allein gegen Welle um Welle, Gold für jede geschaffte Welle.
// - In jeder Stadt und jedem Lager steht ein Arenameister (welt.js, Platz aus TOWN_PLACES). Er schickt dich ALLEIN in
//   eine eigene Arena: Gruppenmitglieder bleiben draußen, im Mehrspieler bekommt jeder Spieler seine eigene Halle.
// - Die Arenen liegen im ungenutzten Fels unter dem Dungeon-Streifen (östlich der Maps), ARENA.slots Hallen nebeneinander.
//   Sie werden nach der Welt gebaut (arenaBuild über generateWorld): runde Halle mit Sandgrube, Säulen, Feuerbecken,
//   Bannern und einem Ausgang (Weltentor mit arenaExit).
// - Wellen (arenaWave): Welle 1 schon viele, aber schwächere Monster aus den Gebieten deiner Stufe; danach mehr, höhere
//   Stufe, mehr Leben und Schaden, ab Welle 4 Elite-Monster (dreifaches Leben), jede 5. Welle ein Dungeon-Boss als
//   Wellenmeister (Stampfer, Salven, Verstärkung), ab Welle 8 jagen alle wie in Dungeons. Ab etwa Welle 10–15 wird es
//   wirklich hart.
// - seit 13.70: Gold je Welle fest 2.000 × Welle, ausgezahlt beim Verlassen; drei Leben (beim dritten Tod ist das Gold
//   weg); Monster geben volle EP und Kill-Gold (keine Gegenstände); mehr Monster in Schüben nach der Uhr (arenaBatches).
// - bis 13.69: feste Summe Gold je geschaffter Welle (arenaGold), dazu nur die halbe Erfahrung je Monster – keine Beute,
//   kein Gold von den Monstern selbst. Bemessen an dem, was dieselben Monster draußen an Gold bringen (3 × Stufe + 1 je
//   Monster, nach Leben gewichtet), mit einem Faktor, der von 0,45 (Welle 1) bis 1,0 (ab Welle 29) steigt – in der Arena
//   tötet man etwa doppelt so schnell wie draußen, so liegt ein guter Lauf etwas über normalem Farmen.
// - Tod oder Verlassen beenden den Lauf; das Gold bleibt. Bestwelle, Läufe und Gold stehen im Spielstand (p.arena).
// - Mehrspieler: Die Wellen rechnet, wer die Monster führt (allein: man selbst, im Kanal: der Host, auch der Welt-Wächter).
//   Mitspieler fragen per Nachricht (onSocial, k: 'ar…') nach einer Halle und bekommen Wellenbeginn und -ende gemeldet;
//   das Gold rechnen sie selbst aus ihrer Stufe und der Welle.

const ARENA = {
  slots: 8, cols: 4, slotW: 46, slotH: 38, hallW: 34, hallH: 26, corner: 7,
  minLevel: 5,          // ab dieser Stufe
  firstPause: 4,        // Sekunden bis zur ersten Welle
  pause: 6,             // Pause nach einer geschafften Welle
  lives: 3,             // seit 13.70: drei Leben je Lauf (beim dritten Tod ist das gesammelte Gold verloren)
  maxAlive: 50,         // Schutz: mehr gleichzeitig lebende Monster je Halle hält der nächste Schub zurück
  deadMax: 180,         // so lange (s) darf der Läufer tot in der Halle liegen, dann endet der Lauf
  eliteHp: 3, eliteAtk: 1.3,
  gate: '#ffc86a'       // Farbe von Lichtsäulen und Ausgang
};
const ARENA_THEME = '#6a5a48|#c9a35a|#ffb04a'; // Säulen, Banner, Statuen: Stein | Fugen | Leuchtfarbe

// Gebiet der Arena (nicht sicher, kein Dungeon): Name oben in der Ecke, Stimmung
const ARENA_ZONE = { id: 'arena', name: 'Prüfungsarena', levels: 'Herausforderung · allein', ground: 'FLAGSTONE', ambient: { kind: 'dust', tint: [60, 40, 20, 0.06] } };
ZONES.push(ARENA_ZONE);
const ARENA_ZI = ZONES.length - 1;
// Licht in 3D: warmer Abend mit Fackelschein (drei-kern.js, v3UpdateMood), etwas gedämpft, damit der Sand nicht blendet
if (typeof MOOD3 !== 'undefined') MOOD3.arena = { sky: '#5e4a3a', sun: '#ffd8a8', sunI: 0.78, hemi: '#f0d8c0', ground: '#4a3a2a', hemiI: 0.62, near: 26, far: 62 };

// --- Lage der Hallen ------------------------------------------------------------------------------------------
function arenaSlotRect(s) {
  const c = s % ARENA.cols;
  const r = Math.floor(s / ARENA.cols);
  const x = WORLD_W + 14 + c * (ARENA.slotW + 4);
  const y = DUNGEON_H + 14 + r * (ARENA.slotH + 4);
  return { x, y, w: ARENA.slotW, h: ARENA.slotH, cx: x + ARENA.slotW / 2, cy: y + ARENA.slotH / 2 };
}
// Halle s, in der der Punkt (Pixel) liegt, sonst -1
function arenaSlotAt(px, py) {
  const tx = px / TILE;
  const ty = py / TILE;
  if (tx < WORLD_W || ty < DUNGEON_H) return -1;
  for (let s = 0; s < ARENA.slots; s++) {
    const R = arenaSlotRect(s);
    if (tx >= R.x && ty >= R.y && tx < R.x + R.w && ty < R.y + R.h) return s;
  }
  return -1;
}
const arenaInside = (e) => !!e && arenaSlotAt(e.x, e.y) >= 0;
// Kachel in der Halle? Ein Rechteck mit stark abgerundeten Ecken
function arenaInHall(s, tx, ty) {
  const R = arenaSlotRect(s);
  const hw = ARENA.hallW / 2;
  const hh = ARENA.hallH / 2;
  const dx = Math.abs(tx + 0.5 - R.cx);
  const dy = Math.abs(ty + 0.5 - R.cy);
  if (dx > hw || dy > hh) return false;
  const k = ARENA.corner;
  if (dx > hw - k && dy > hh - k) return Math.hypot(dx - (hw - k), dy - (hh - k)) <= k;
  return true;
}
// Punkt auf der Ellipse um die Mitte der Halle (Winkel a, 0 = Osten, π/2 = Süden), in Kacheln
function arenaRing(s, a, inset) {
  const R = arenaSlotRect(s);
  return { x: R.cx + Math.cos(a) * (ARENA.hallW / 2 - inset), y: R.cy + Math.sin(a) * (ARENA.hallH / 2 - inset) };
}
// Ankunft (unten in der Halle) und Ausgang (am Südrand), in Pixeln
function arenaEntry(s) {
  const R = arenaSlotRect(s);
  return { x: R.cx * TILE, y: (R.cy + ARENA.hallH / 2 - 5.5) * TILE };
}
// Stellen, an denen Monster erscheinen: ringsum am Rand, nicht am Ausgang
function arenaSpawnSpots(s) {
  const out = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.3) continue;
    const t = arenaRing(s, a, 2.6);
    out.push({ x: t.x * TILE, y: t.y * TILE });
  }
  return out;
}

// --- Bau der Hallen (nach der Welt) -----------------------------------------------------------------------------
function arenaBuild(w) {
  const T = (x, y) => ({ x: x * TILE, y: y * TILE });
  // der ganze Fels unter dem Dungeon-Streifen gehört zur Arena (gleiche Wände ringsum)
  for (let y = DUNGEON_H; y < MAP_H; y++) for (let x = WORLD_W; x < MAP_W; x++) w.zoneIdx[y * MAP_W + x] = ARENA_ZI;
  for (let s = 0; s < ARENA.slots; s++) {
    const R = arenaSlotRect(s);
    for (let y = R.y; y < R.y + R.h; y++) {
      for (let x = R.x; x < R.x + R.w; x++) {
        const i = y * MAP_W + x;
        w.zoneIdx[i] = ARENA_ZI;
        w.deco[i] = DECO.NONE;
        if (!arenaInHall(s, x, y)) {
          w.obj[i] = OBJ.CAVEWALL;
          w.ground[i] = GROUND.CAVE;
          continue;
        }
        w.obj[i] = OBJ.NONE;
        // Sandgrube in der Mitte, ein Ring aus hellen Platten darum, außen Steinplatten
        const ex = (x + 0.5 - R.cx) / 11;
        const ey = (y + 0.5 - R.cy) / 8;
        const e = ex * ex + ey * ey;
        w.ground[i] = e <= 1 ? GROUND.SAND : e <= 1.32 ? GROUND.PLAZA : GROUND.FLAGSTONE;
        if (e <= 1 && tileHash(x, y) % 13 === 0) w.deco[i] = DECO.PEBBLE;
      }
    }
    // Säulen im Kreis (blockieren, gezeichnet als Prop), nicht vor dem Ausgang
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + Math.PI / 10;
      if (Math.abs(a - Math.PI / 2) < 0.4) continue;
      const t = arenaRing(s, a, 4.2);
      const tx = Math.floor(t.x);
      const ty = Math.floor(t.y);
      w.obj[ty * MAP_W + tx] = OBJ.PILLAR;
      w.props.push({ type: 'dpillar', roof: ARENA_THEME, ...T(tx + 0.5, ty + 0.75) });
    }
    // Feuerbecken an der Wand ringsum
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      if (Math.abs(a - Math.PI / 2) < 0.5) continue;
      const t = arenaRing(s, a, 1.3);
      w.props.push({ type: 'brazier', roof: '#ffb04a', ...T(t.x, t.y + 0.4) });
    }
    // Banner an der Nordwand, Statuen neben dem Ausgang
    for (const dx of [-9, -3.5, 3.5, 9]) w.props.push({ type: 'dbanner', roof: ARENA_THEME, ...T(R.cx + dx, R.cy - ARENA.hallH / 2 + 1.1) });
    for (const dx of [-3.4, 3.4]) w.props.push({ type: 'dstatue', roof: ARENA_THEME, ...T(R.cx + dx, R.cy + ARENA.hallH / 2 - 1.2) });
    // Ausgang: ein Tor am Südrand (öffnet das Fenster zum Verlassen)
    w.npcs.push({ id: 'weltentor', name: 'Ausgang der Arena', x: R.cx * TILE, y: (R.cy + ARENA.hallH / 2 - 2.4) * TILE, r: 11, arenaExit: s });
  }
}
const _arenaGenerateWorld = generateWorld;
generateWorld = function () {
  const w = _arenaGenerateWorld();
  arenaBuild(w);
  return w;
};

// --- Wellen und Gold ----------------------------------------------------------------------------------------------
// Plan einer Welle für Spielerstufe L: Monsterstufe, Anzahl, Elite, Boss, Leben- und Schadensfaktor, Schübe
// seit 13.70: viel mehr Monster (Welle 1: 12, je Welle +4, höchstens 60), sie kommen in Schüben nach festen Zeiten
// (erster sofort, dann nach 10 s, 12 s, 14 s …) statt nachzurücken, wenn eines fällt
function arenaWave(L, w) {
  const boss = w % 5 === 0;
  const n = Math.round(Math.min(60, 12 + 4 * (w - 1)) * (boss ? 0.6 : 1));
  const batches = Math.min(10, 2 + Math.floor(w / 2));
  return {
    wave: w,
    ml: Math.max(1, Math.min(L + 8, L - 4 + Math.floor((w - 1) / 2))),
    // Bosswellen: der Wellenmeister (Mini-Boss) mit etwas kleinerem Gefolge (60 %)
    n,
    elites: Math.min(10, Math.floor(w / 3)),
    boss,
    bossHp: 4 + 0.4 * w,
    hpK: 1 + 0.05 * (w - 1),
    atkK: 1 + 0.03 * (w - 1),
    batches,
    // Abstände der Schübe in Sekunden: 10, 12, 14 …
    gaps: Array.from({ length: batches - 1 }, (_, k) => 10 + 2 * k)
  };
}
// Gold je geschaffter Welle (seit 13.70 fest): 2.000 × Welle – Welle 1 2.000, Welle 5 10.000, Welle 10 20.000.
// Ausgezahlt wird beim Verlassen oder Aufgeben; wer alle drei Leben verliert, verliert das Gold dieses Laufs.
const ARENA_GOLD_STEP = 2000;
function arenaGold(L, w) {
  return ARENA_GOLD_STEP * Math.max(1, w | 0);
}
// Gold aller Wellen bis einschließlich w
const arenaGoldSum = (w) => (ARENA_GOLD_STEP * w * (w + 1)) / 2;
// Monsterarten aus den Gebieten der Stufe (draußen, keine Bosse, keine Nachtmonster); ab Welle 6 auch Dungeon-Monster.
// In den ersten drei Wellen nur die leichteren (höchstens 1,6-faches Leben): viele, aber einfache Monster
function arenaPool(L, w) {
  const ok = (t) => !t.boss && !t.crystal && !t.raidBoss && !t.night && !t.inst && !t.raid && (!t.dungeon || w >= 6);
  const all = Object.keys(MONSTER_TYPES).filter((id) => ok(MONSTER_TYPES[id]));
  let near = all.filter((id) => MONSTER_TYPES[id].level >= L - 8 && MONSTER_TYPES[id].level <= L + 5);
  if (near.length < 3) near = all.sort((a, b) => Math.abs(MONSTER_TYPES[a].level - L) - Math.abs(MONSTER_TYPES[b].level - L)).slice(0, 4);
  const light = near.filter((id) => (MONSTER_TYPES[id].hpMul || 1) <= 1.6);
  return w <= 3 && light.length >= 2 ? light : near;
}
// Wellenmeister: der Dungeon-Boss, dessen Stufe am nächsten liegt (ohne Endbosse, Instanz- und Höllenthron-Wächter)
function arenaBossType(L) {
  const ids = Object.keys(MONSTER_TYPES).filter((id) => {
    const t = MONSTER_TYPES[id];
    return t.boss && !t.raid && !t.inst && !t.raidBoss && (t.hpMul || 1) <= 40;
  });
  return ids.sort((a, b) => Math.abs(MONSTER_TYPES[a].level - L) - Math.abs(MONSTER_TYPES[b].level - L))[0] || null;
}
// Werte eines Arena-Monsters an Stufe, Welle und Rolle anpassen
function arenaTune(m, W, role) {
  const t = m.type;
  const st = monsterStats(W.ml, t.hpMul, t.atkMul);
  m.level = W.ml;
  m.maxHp = Math.round(st.maxHp * W.hpK * (role === 'elite' ? ARENA.eliteHp : 1));
  m.atk = Math.round(st.atk * W.atkK * (role === 'elite' ? ARENA.eliteAtk : 1));
  m.def = st.def;
  m.xp = st.xp;
  if (role === 'boss') {
    const b = monsterStats(W.ml, 1, t.atkMul);
    m.maxHp = Math.round(b.maxHp * W.bossHp * W.hpK);
    // der erste Wellenmeister schlägt noch etwas schwächer zu (Welle 5: 0,875 – ab Welle 10 voll, danach mehr)
    m.atk = Math.round(b.atk * W.atkK * (0.75 + 0.025 * W.wave));
    m.level = W.ml + 1;
    m.xp = Math.round(monsterStats(W.ml).xp * 6);
    m.bossCd = 4;
    m.summoned = 0;
    // seit 13.70 klar als Mini-Boss zu erkennen: Name mit „Wellenmeister“ (Bossleiste oben, Banner beim Erscheinen)
    m.name = 'Wellenmeister: ' + t.name;
    m.arenaBoss = true;
  }
  if (role === 'elite') {
    m.elite = true;
    m.name = 'Elite: ' + t.name;
    m.xp *= 2;
  }
  m.hp = m.maxHp;
  // ab Welle 8 jagen sie wie in Dungeons (holen auf, Ansturm), davor kann man ausweichen
  m.inDungeon = W.wave >= 8;
}

// --- Hallen führen (wer die Monster führt: allein man selbst, im Kanal der Host) --------------------------------
const arenaHost = { slots: Array.from({ length: ARENA.slots }, () => null) };
const arenaNow = () => game.time;

function arenaOwnerObj(S) {
  if (S.owner === 'me') return game.player;
  const rp = net.players.get(S.owner);
  return rp && !rp.gone ? rp : null;
}
// Nachricht an den Läufer einer Halle (an sich selbst direkt, sonst über den Host)
function arenaTell(S, d) {
  if (S.owner === 'me') arenaOnMsg(d);
  else if (typeof netSocial === 'function') netSocial(S.owner, d);
}
// freie Halle: ohne Läufer und ohne jemanden darin
function arenaAlloc(owner, level) {
  for (const S of arenaHost.slots) if (S && S.owner === owner) arenaFree(arenaHost.slots.indexOf(S));
  const busy = new Set();
  if (game.player) busy.add(arenaSlotAt(game.player.x, game.player.y));
  if (net.mode === 'host') for (const rp of net.players.values()) busy.add(arenaSlotAt(rp.x, rp.y));
  for (let s = 0; s < ARENA.slots; s++) {
    if (arenaHost.slots[s] || busy.has(s)) continue;
    arenaHost.slots[s] = { owner, level: Math.max(1, Math.min(99, level | 0)), state: 'reserved', wave: 0, at: arenaNow(), until: 0, queue: [], mons: new Set(), absent: null, nextAt: 0, aggroAt: 0 };
    return s;
  }
  return -1;
}
// Halle räumen: ihre Monster verschwinden
function arenaFree(s) {
  const S = arenaHost.slots[s];
  arenaHost.slots[s] = null;
  if (!S) return;
  game.monsters = game.monsters.filter((m) => !(m.arenaSlot === s || (m.respawn === false && arenaSlotAt(m.homeX ?? m.x, m.homeY ?? m.y) === s)));
  if (game.target && game.target.arenaSlot === s) game.target = null;
}
function arenaEnd(s, why) {
  const S = arenaHost.slots[s];
  if (!S) return;
  arenaTell(S, { k: 'are', r: why, w: S.wave });
  arenaFree(s);
}
// Monster der Welle in Schübe aufteilen (seit 13.70): Elite gleichmäßig verteilt, der Wellenmeister kommt sicher
// in jeder 5. Welle, mit dem zweiten Schub
function arenaBatches(S) {
  const W = arenaWave(S.level, S.wave);
  const pool = arenaPool(S.level, S.wave);
  const q = [];
  for (let k = 0; k < W.n; k++) q.push({ type: pool[Math.floor(Math.random() * pool.length)], role: 'mob' });
  for (let k = 0; k < W.elites; k++) q[Math.min(q.length - 1, Math.floor(((k + 1) * q.length) / (W.elites + 1)))].role = 'elite';
  const out = Array.from({ length: W.batches }, () => []);
  q.forEach((e, k) => out[Math.min(W.batches - 1, Math.floor((k * W.batches) / q.length))].push(e));
  if (W.boss) {
    const bt = arenaBossType(S.level) || 'banditenfuerst';
    out[Math.min(1, out.length - 1)].unshift({ type: bt, role: 'boss' });
  }
  return out;
}
function arenaSpawnOne(s, S, e, owner) {
  const W = arenaWave(S.level, S.wave);
  const spots = arenaSpawnSpots(s);
  // eine Stelle ein Stück vom Läufer weg
  const far = spots.filter((p) => Math.hypot(p.x - owner.x, p.y - owner.y) > 6 * TILE);
  const at = (far.length ? far : spots)[Math.floor(Math.random() * (far.length || spots.length))];
  const pos = spotNear(at, e.role === 'boss' ? 10 : 30);
  const m = createMonster(e.type, pos.x, pos.y, { level: W.ml, respawn: false, zone: ARENA_ZONE });
  m.arenaSlot = s;
  arenaTune(m, W, e.role);
  // steht kurz, während es erscheint (Bosse ignorieren das)
  m.stun = 0.7;
  m.state = 'chase';
  m.target = owner;
  game.monsters.push(m);
  S.mons.add(m);
  if (S.owner === 'me') arenaSeen(m);
}
function arenaTickHost() {
  if (net.mode === 'client') return;
  const now = arenaNow();
  for (let s = 0; s < ARENA.slots; s++) {
    const S = arenaHost.slots[s];
    if (!S) continue;
    const o = arenaOwnerObj(S);
    if (!o) { arenaFree(s); continue; }
    const here = arenaSlotAt(o.x, o.y) === s;
    if (S.state === 'reserved') {
      if (here) {
        S.state = 'pause';
        S.wave = 1;
        S.until = now + ARENA.firstPause;
        arenaTell(S, { k: 'arp', w: 1, t: ARENA.firstPause });
      } else if (now - S.at > 25) arenaFree(s);
      continue;
    }
    // Tot (seit 13.70 drei Leben): die Halle wartet, Schübe stehen still, bis er wieder steht (oder zu lange liegt)
    const dt = Math.max(0, Math.min(1, now - (S.last ?? now)));
    S.last = now;
    if (o.dead) {
      if (S.deadSince == null) S.deadSince = now;
      if (now - S.deadSince > ARENA.deadMax) { arenaEnd(s, 'tod'); continue; }
      S.until += dt;
      S.nextAt += dt;
      if (S.batchAt != null) S.batchAt += dt;
      continue;
    }
    S.deadSince = null;
    if (!here) {
      if (S.absent == null) S.absent = now;
      if (now - S.absent > 3) { arenaEnd(s, 'weg'); continue; }
    } else S.absent = null;
    if (S.state === 'pause') {
      if (now < S.until) continue;
      S.state = 'fight';
      S.batches = arenaBatches(S);
      S.batch = 0;
      S.batchAt = now;
      S.queue = [];
      S.mons.clear();
      S.nextAt = now;
      arenaTell(S, { k: 'arf', w: S.wave, n: S.batches.reduce((n, b) => n + b.length, 0), b: S.batches.length });
      continue;
    }
    // Kampf: Verstärkung der Bosse übernehmen (Stufe und Werte der Welle), Schübe nach der Uhr, Ende der Welle
    const W = arenaWave(S.level, S.wave);
    const list = (typeof monsterIndex === 'function' ? monsterIndex().get(0) : null) || game.monsters;
    for (const m of list) {
      if (m.dead || m.arenaSlot != null || m.isStone || arenaSlotAt(m.x, m.y) !== s) continue;
      m.arenaSlot = s;
      arenaTune(m, W, 'mob');
      S.mons.add(m);
      if (S.owner === 'me') arenaSeen(m);
    }
    let alive = 0;
    for (const m of S.mons) if (!m.dead) alive++;
    // nächster Schub nach seiner Zeit (nicht nach Kills); nur bei sehr vielen lebenden Monstern wartet er
    if (S.batch < S.batches.length && now >= S.batchAt && alive + S.queue.length < ARENA.maxAlive) {
      S.queue.push(...S.batches[S.batch]);
      const gap = W.gaps[S.batch];
      S.batch++;
      S.batchAt = gap != null ? now + gap : Infinity;
      const pending = S.batches.slice(S.batch).reduce((n, b) => n + b.length, 0);
      arenaTell(S, { k: 'ars', i: S.batch, b: S.batches.length, t: gap != null ? gap : -1, p: pending });
    }
    if (S.queue.length && now >= S.nextAt) {
      arenaSpawnOne(s, S, S.queue.shift(), o);
      S.nextAt = now + 0.15;
      alive++;
    }
    // Wer den Läufer verloren hat (getarnt, zu weit weg), sucht ihn wieder
    if (now >= S.aggroAt) {
      S.aggroAt = now + 1;
      if (!(o === game.player ? game.stats.invisible : o.invisible)) {
        for (const m of S.mons) if (!m.dead && m.state !== 'chase') { m.state = 'chase'; m.target = o; }
      }
    }
    if (S.batch >= S.batches.length && !S.queue.length && alive === 0) {
      arenaTell(S, { k: 'arw', w: S.wave });
      S.wave++;
      S.state = 'pause';
      S.until = now + ARENA.pause;
      S.mons.clear();
      arenaTell(S, { k: 'arp', w: S.wave, t: ARENA.pause });
    }
  }
}

// --- Der eigene Lauf ---------------------------------------------------------------------------------------------
// game.arenaRun: { slot, level, mode, phase: 'wait' | 'pause' | 'fight', wave (laufende Welle), cleared, gold, until, n,
//   lives (seit 13.70), nextBatch (Zeit des nächsten Schubs), pending (Monster in späteren Schüben) }
// Das Gold der Wellen wird gesammelt (p.arena.pending, falls das Spiel zwischendurch zugeht) und erst beim Verlassen
// ausgezahlt; beim dritten Tod ist es verloren.
const arenaFmt = (n) => Math.round(n).toLocaleString('de-DE');
function arenaSave(p = game.player) {
  if (!p.arena || typeof p.arena !== 'object') p.arena = { best: 0, runs: 0, gold: 0, ret: null };
  return p.arena;
}
function arenaModeOf() {
  return net.mode === 'client' ? 'client' : 'local';
}
// Betreten (vom Arenameister)
function arenaEnter() {
  const p = game.player;
  if (!p || p.dead) return;
  if (p.level < ARENA.minLevel) {
    ui.log(`Die Prüfungsarena öffnet sich ab Stufe ${ARENA.minLevel}.`, 'warn');
    return;
  }
  if (game.arenaRun) return;
  const A = arenaSave(p);
  A.ret = { x: Math.round(p.x), y: Math.round(p.y) };
  arenaPayPending(p);
  const run = { p, slot: -1, level: p.level, mode: arenaModeOf(), phase: 'wait', wave: 0, cleared: 0, gold: 0, until: 0, n: 0, askAt: game.time, lastMsgAt: game.time, lives: ARENA.lives, nextBatch: 0, pending: 0, outSince: null };
  game.arenaRun = run;
  if (run.mode === 'client') {
    netSocial('host', { k: 'arq', l: p.level });
    ui.closePanels();
    ui.log('Der Arenameister bereitet deine Halle vor …', 'info');
    return;
  }
  const s = arenaAlloc('me', p.level);
  if (s < 0) {
    game.arenaRun = null;
    ui.log('Alle Hallen der Arena sind gerade belegt. Versuch es gleich noch einmal.', 'warn');
    return;
  }
  arenaGo(s);
}
// Mitspieler: alte Monster einer Halle wegräumen (vom Host nicht mehr gemeldet, z. B. aus einem früheren Lauf)
function arenaPurge(s) {
  if (net.mode !== 'client') return;
  const old = (m) => m.respawn === false && !m.isStone && arenaSlotAt(m.homeX ?? m.x, m.homeY ?? m.y) === s;
  for (const m of game.monsters) if (old(m)) net.mons.delete(m.id);
  game.monsters = game.monsters.filter((m) => !old(m));
  if (game.target && old(game.target)) game.target = null;
}
// in die zugeteilte Halle
function arenaGo(s) {
  const run = game.arenaRun;
  if (!run) return;
  arenaPurge(s);
  run.slot = s;
  run.phase = 'wait';
  run.lastMsgAt = game.time;
  const p = game.player;
  moveThrough(arenaEntry(s), ARENA.gate);
  arenaSave(p).runs++;
  ui.banner('Prüfungsarena', 'Allein gegen alle Wellen – viel Glück!');
  saveGame();
}
// Gold eines früheren Laufs, das nicht mehr ausgezahlt wurde (Spiel zu, Seite neu geladen): jetzt auszahlen
function arenaPayPending(p = game.player) {
  const A = arenaSave(p);
  const g = Math.max(0, Math.round(A.pending || 0));
  A.pending = 0;
  if (!g) return;
  p.gold += g;
  A.gold = (A.gold || 0) + g;
  ui.log(`Gold aus deinem letzten Arena-Lauf ausgezahlt: ${arenaFmt(g)} Gold.`, 'level');
  saveGame();
}
// Verlassen (Ausgang, Aufgeben, Ende vom Host): das gesammelte Gold wird ausgezahlt.
// why 'verloren' (seit 13.70): alle drei Leben verbraucht – das Gold dieses Laufs ist weg.
function arenaStop(why) {
  const run = game.arenaRun;
  if (!run) return;
  game.arenaRun = null;
  const p = game.player;
  const A = arenaSave(p);
  const lost = why === 'verloren';
  A.pending = 0;
  if (!lost && run.gold > 0) {
    p.gold += run.gold;
    A.gold = (A.gold || 0) + run.gold;
  }
  if (run.mode === 'client') {
    if (why !== 'host') netSocial('host', { k: 'arx' });
    // Monster der Halle verschwinden auch hier
    arenaPurge(run.slot);
  } else if (run.slot >= 0 && arenaHost.slots[run.slot] && arenaHost.slots[run.slot].owner === 'me') arenaFree(run.slot);
  const txt = !run.cleared ? 'Keine Welle geschafft' : lost ? `${run.cleared} ${run.cleared === 1 ? 'Welle' : 'Wellen'} geschafft · ${arenaFmt(run.gold)} Gold verloren`
    : `${run.cleared} ${run.cleared === 1 ? 'Welle' : 'Wellen'} geschafft · ${arenaFmt(run.gold)} Gold ausgezahlt`;
  ui.banner(lost ? 'Herausforderung verloren' : 'Herausforderung beendet', txt);
  ui.log(`Herausforderung beendet: ${txt}. Bestwelle: ${A.best}.`, lost ? 'warn' : 'level');
  if (!lost && run.gold > 0) addText(p.x, p.y - 52, `+${arenaFmt(run.gold)} Gold`, 'gold');
  // zurück zum Arenameister (nicht nach dem Tod: dann bringt das Wiederbeleben dorthin)
  if (!p.dead && arenaInside(p)) moveThrough(arenaReturn(), ARENA.gate);
  arenaHud();
  saveGame();
}
// Rückkehr: zum Arenameister, bei dem man losging (sonst in die Stadt)
function arenaReturn() {
  const r = arenaSave().ret;
  if (r && Number.isFinite(r.x) && Number.isFinite(r.y) && arenaSlotAt(r.x, r.y) < 0) return { x: r.x, y: r.y };
  return { x: CENTER_X * TILE, y: (CENTER_Y + 1) * TILE };
}
// Nachrichten zum Lauf (vom Host bzw. aus der eigenen Hallenführung)
function arenaOnMsg(d) {
  const run = game.arenaRun;
  const p = game.player;
  if (!p) return;
  if (d.k === 'arg') {
    if (run && run.mode === 'client' && run.slot < 0) arenaGo(d.s | 0);
    return;
  }
  if (d.k === 'arn') {
    if (run && run.slot < 0) {
      game.arenaRun = null;
      ui.log(d.r || 'Alle Hallen der Arena sind gerade belegt.', 'warn');
    }
    return;
  }
  if (!run) return;
  run.lastMsgAt = game.time;
  if (d.k === 'arp') {
    // zwischen zwei Wellen ist die Halle leer: Reste (verpasste Tode) entfernen
    if (run.mode === 'client' && run.phase === 'fight') arenaPurge(run.slot);
    run.phase = 'pause';
    run.wave = d.w | 0;
    run.until = game.time + (+d.t || ARENA.pause);
    if (run.wave === 1) ui.banner('Welle 1', 'Gleich geht es los!');
  } else if (d.k === 'arf') {
    run.phase = 'fight';
    run.wave = d.w | 0;
    run.n = d.n | 0;
    run.spawned = 0;
    run.pending = run.n;
    run.nextBatch = 0;
    const W = arenaWave(run.level, run.wave);
    ui.banner(`Welle ${run.wave}`, W.boss ? 'Ein Wellenmeister erscheint!' : W.elites ? `${run.n} Monster, darunter Elite` : `${run.n} Monster`);
  } else if (d.k === 'ars') {
    // ein Schub ist losgeschickt: wann der nächste kommt (t < 0: das war der letzte)
    run.nextBatch = +d.t >= 0 ? game.time + +d.t : 0;
    run.batch = d.i | 0;
    run.batches = d.b | 0;
    if (typeof sfx !== 'undefined' && sfx.riser) sfx.riser();
  } else if (d.k === 'arw') {
    const w = d.w | 0;
    if (w <= run.cleared) return;
    const g = arenaGold(run.level, w);
    run.gold += g;
    run.cleared = w;
    const A = arenaSave(p);
    // gesammelt, ausgezahlt wird beim Verlassen (falls das Spiel vorher zugeht: beim nächsten Start)
    A.pending = run.gold;
    if (w > (A.best || 0)) A.best = w;
    ui.banner(`Welle ${w} geschafft`, `+${arenaFmt(g)} Gold gesammelt`);
    addText(p.x, p.y - 52, `+${arenaFmt(g)} Gold`, 'gold');
    if (typeof sfx !== 'undefined' && sfx.success) sfx.success();
    vfxPillar(p, ARENA.gate, 1);
    saveGame();
  } else if (d.k === 'are') {
    arenaStop('host');
  }
  arenaHud();
}
// Mitspieler ↔ Host (über onSocial)
function arenaSocial(pid, d) {
  if (d.k === 'arq') {
    if (net.mode !== 'host') return;
    const s = arenaAlloc(pid, d.l);
    netSocial(pid, s < 0 ? { k: 'arn', r: 'Alle Hallen der Arena sind gerade belegt. Versuch es gleich noch einmal.' } : { k: 'arg', s });
    return;
  }
  if (d.k === 'arx') {
    if (net.mode !== 'host') return;
    const s = arenaHost.slots.findIndex((S) => S && S.owner === pid);
    if (s >= 0) arenaFree(s);
    return;
  }
  if (pid === 'host' || net.mode !== 'host') arenaOnMsg(d);
}
const _arenaOnSocial = onSocial;
onSocial = function (pid, d) {
  if (d && typeof d.k === 'string' && /^ar[a-z]$/.test(d.k)) {
    arenaSocial(pid, d);
    return;
  }
  return _arenaOnSocial(pid, d);
};

// Lichtsäule und aufsteigender Staub, wo ein Monster erscheint (sieht jeder, der es zum ersten Mal sieht)
const arenaSeenIds = new WeakSet();
function arenaSeen(m) {
  if (arenaSeenIds.has(m)) return;
  arenaSeenIds.add(m);
  const run = game.arenaRun;
  if (run && run.slot >= 0 && arenaSlotAt(m.homeX ?? m.x, m.homeY ?? m.y) === run.slot) run.spawned = (run.spawned || 0) + 1;
  const boss = m.type && m.type.boss;
  // Mitspieler bauen das Monster aus dem Schnappschuss: Name des Mini-Bosses auch hier (seit 13.70)
  if (boss && !String(m.name).startsWith('Wellenmeister')) m.name = 'Wellenmeister: ' + m.type.name;
  const y = feetY(m);
  if (V3.on) {
    addEffect({ type: 'column3', x: m.x, y, dur: 1.0, color: boss ? '#ff6a3a' : ARENA.gate, core: '#fff6dc', r: boss ? 44 : 26, hgt: boss ? 4.2 : 2.8 });
    addEffect({ type: 'smoke3', x: m.x, y, count: boss ? 16 : 10, color: '#8a7c6a', size: boss ? 1.6 : 1.1, op: 0.5, dur: 1.6 });
  } else {
    addEffect({ type: 'pillar', x: m.x, y, dur: 0.9, color: boss ? '#ff6a3a' : ARENA.gate });
    particles(m.x, y, { count: boss ? 40 : 22, color: ['#9a8c78', '#c8b89a', '#6a5e50'], angle: -Math.PI / 2, spread: 0.9, speed: [18, 70], life: [0.7, 1.4], size: [3, 6], jitter: boss ? 26 : 14, drag: 1.1, glow: false });
  }
  if (boss) {
    shakeScreen(6);
    ui.banner(m.name, 'Wellenmeister');
  }
}
function arenaSlotMonsters(s) {
  const list = (typeof monsterIndex === 'function' ? monsterIndex().get(0) : null) || game.monsters;
  return list.filter((m) => !m.dead && !m.isStone && arenaSlotAt(m.homeX ?? m.x, m.homeY ?? m.y) === s);
}

// jedes Bild (über raidWatch): Hallen führen, eigener Lauf, Anzeige
function arenaTick() {
  const p = game.player;
  if (!p || !game.world) return;
  arenaTickHost();
  if (WAECHTER) return;
  // anderer Charakter gestartet: alter Lauf und eigene Halle verfallen
  if (game.arenaRun && game.arenaRun.p !== p) {
    game.arenaRun = null;
    arenaHost.slots.forEach((S, s) => { if (S && S.owner === 'me') arenaFree(s); });
  }
  const run = game.arenaRun;
  const here = arenaSlotAt(p.x, p.y);
  if (here >= 0) {
    // keine Dungeon-Risse in der Arena
    if (game.riftAt != null && game.riftAt - game.time < 30) game.riftAt = game.time + 30;
  }
  if (!run) {
    // Gold eines abgebrochenen Laufs (Spiel war zu) gleich auszahlen
    if (p.arena && p.arena.pending > 0 && !p.dead) arenaPayPending(p);
    // in einer Halle ohne Lauf (z. B. nach dem Neuladen): zurück
    if (here >= 0 && !p.dead) {
      ui.log('Die Arena ist leer. Du kehrst zum Arenameister zurück.', 'info');
      moveThrough(arenaReturn(), ARENA.gate);
    }
    arenaHud();
    return;
  }
  // Mehrspieler ein- oder ausgeschaltet, Host gewechselt: Lauf endet (das Gold bleibt)
  if (run.mode !== arenaModeOf()) {
    arenaStop('host');
    return;
  }
  // tot (seit 13.70): der Lauf wartet auf „Hier neu starten“ (Leben zählt arenaDeath beim Tod)
  if (p.dead) {
    arenaHud();
    return;
  }
  if (run.slot < 0) {
    if (game.time - run.askAt > 8) {
      game.arenaRun = null;
      ui.log('Keine Antwort aus der Arena (spielt der Host eine ältere Version?). Versuch es später noch einmal.', 'warn');
    }
    arenaHud();
    return;
  }
  // Monster der eigenen Halle zum ersten Mal gesehen: Erscheinen zeigen
  const mons = arenaSlotMonsters(run.slot);
  for (const m of mons) arenaSeen(m);
  run.left = mons.length;
  // Halle verlassen (z. B. „In der Stadt neu starten“ nach einem Tod): Ende, das Gold wird ausgezahlt
  if (here !== run.slot && run.phase !== 'wait') {
    if (run.outSince == null) run.outSince = game.time;
    if (game.time - run.outSince > 1) {
      arenaStop('weg');
      return;
    }
  } else run.outSince = null;
  if (run.mode === 'client' && game.time - run.lastMsgAt > 75 && !mons.length) {
    arenaStop('host');
    return;
  }
  arenaHud();
}
const _arenaRaidWatch = raidWatch;
raidWatch = function () {
  _arenaRaidWatch();
  arenaTick();
};

// --- Belohnung je Monster (seit 13.70): volle Erfahrung und normales Kill-Gold, aber keine Gegenstände, Steine,
// Tränke oder Material ----------------------------------------------------------------------------------------------
function arenaKillReward(m) {
  const p = game.player;
  const xp = Math.max(1, Math.round(m.xp * MOB_XP_MUL * xpFactor(p.level, m.level)));
  const gold = m.gold ? randInt(m.gold[0], m.gold[1]) : 0;
  p.gold += gold;
  if (gold > 0) addText(m.x + 14, feetY(m) - 30, '+' + gold + ' Gold', 'gold');
  p.kills++;
  const bc = bodyCenter(m);
  particles(bc.x, bc.y, { count: 7, color: ['#d6b8ff', '#b48aff', '#ffffff'], angle: Math.atan2(p.y - m.y, p.x - m.x), spread: 0.5, speed: [dist(m, p) * 1.4, dist(m, p) * 2.2], life: [0.35, 0.5], size: [2, 3.2], drag: 0.6 });
  gainXp(xp);
}
const _arenaRewardKill = rewardKill;
rewardKill = function (m) {
  if (m && !m.isStone && m.respawn === false && arenaSlotAt(m.homeX ?? m.x, m.homeY ?? m.y) >= 0) {
    arenaKillReward(m);
    return;
  }
  return _arenaRewardKill(m);
};
// Wiederbeleben nach dem Tod in der Arena: beim Arenameister, nicht in Vlotho
const _arenaVillageSpawn = villageSpawn;
villageSpawn = function (p) {
  if (p && arenaInside(p)) return arenaReturn();
  return _arenaVillageSpawn(p);
};

// Tod in der Arena (seit 13.70): drei Leben. Jeder Tod kostet ein Leben; solange noch eins übrig ist, geht es mit
// „Hier neu starten“ in der Halle weiter (ohne EP-Verlust, die Schübe warten so lange). Beim dritten Tod endet der
// Lauf und das gesammelte Gold ist verloren; „In der Stadt neu starten“ bringt dann zum Arenameister.
function arenaDeath() {
  const run = game.arenaRun;
  const p = game.player;
  if (!run || run.slot < 0 || arenaSlotAt(p.x, p.y) !== run.slot) return false;
  run.lives = Math.max(0, run.lives - 1);
  p.deathXpLoss = 0;
  if (run.lives > 0) {
    $('deathText').textContent = `Noch ${run.lives} von ${ARENA.lives} Leben. Starte hier in der Arena neu und kämpf weiter – oder geh zurück in die Stadt, dann bekommst du das gesammelte Gold (${arenaFmt(run.gold)}).`;
    $('reviveHereCost').textContent = `${'♥'.repeat(run.lives)}${'♡'.repeat(ARENA.lives - run.lives)} · halbes Leben`;
  } else {
    const lost = run.gold;
    arenaStop('verloren');
    $('deathText').textContent = `Alle ${ARENA.lives} Leben verbraucht – die Herausforderung ist vorbei. ${lost > 0 ? `Das gesammelte Gold (${arenaFmt(lost)}) ist verloren.` : ''}`.trim();
    $('btnReviveHere').hidden = true;
  }
  arenaHud();
  return true;
}
const _arenaShowDeath = ui.showDeath;
ui.showDeath = function (lostXp) {
  const inArena = !!game.arenaRun && arenaInside(game.player);
  _arenaShowDeath.call(this, inArena ? 0 : lostXp);
  if (inArena) arenaDeath();
};

// --- Anzeige: Welle, Monster, nächster Schub, Leben, gesammeltes Gold, Aufgeben ---------------------------------
// seit 13.70 nicht mehr oben in der Mitte (dort liegen Ziel- und Bossleiste), sondern direkt über dem Chat
const arenaUi = { el: null, key: '', posAt: 0 };
function arenaHudPlace(el) {
  const chat = document.getElementById('chatBox');
  const r = chat && chat.offsetParent !== null ? chat.getBoundingClientRect() : null;
  if (r && r.width > 0) {
    // am Handy auch über dem Steuerknüppel und dem Beutel-Knopf (sie sitzen neben bzw. über dem Chat)
    let top = r.top;
    for (const id of ['stick', 'btnLoot']) {
      const e = document.getElementById(id);
      const rs = e && !e.closest('[hidden]') ? e.getBoundingClientRect() : null;
      if (rs && rs.width > 0 && rs.left < r.left + 520 && rs.top > window.innerHeight * 0.45) top = Math.min(top, rs.top);
    }
    el.style.left = Math.round(Math.max(4, r.left)) + 'px';
    el.style.top = '';
    el.style.bottom = Math.round(window.innerHeight - top + 6) + 'px';
  } else {
    // ohne Chat: links unter der Lebensanzeige
    const c = document.getElementById('hudChar');
    const rc = c ? c.getBoundingClientRect() : { left: 8, bottom: 120 };
    el.style.left = Math.round(rc.left) + 'px';
    el.style.top = Math.round(rc.bottom + 6) + 'px';
    el.style.bottom = '';
  }
}
function arenaHud() {
  const run = game.arenaRun;
  if (!arenaUi.el) {
    const el = document.createElement('div');
    el.id = 'arenaHud';
    // unter den Fenstern (z-index 10), über der Spielfläche; am Handy schmaler (zwei Zeilen), damit rechts die Knöpfe frei bleiben
    el.style.cssText = 'position:fixed;left:8px;bottom:200px;z-index:5;max-width:' + (input.touchUi ? 'min(470px, 56vw)' : 'min(640px, calc(100vw - 16px))') + ';' +
      'display:flex;flex-wrap:wrap;align-items:center;gap:4px 9px;padding:5px 7px 5px 11px;border-radius:12px;background:rgba(30,18,8,.82);' +
      'border:1px solid rgba(255,200,106,.65);color:#ffe9c2;font:600 12.5px/1.25 system-ui,sans-serif;text-shadow:0 1px 2px #000;' +
      'white-space:nowrap;pointer-events:none;box-shadow:0 2px 12px rgba(0,0,0,.45)';
    el.innerHTML = '<span data-a="w" style="color:#ffc86a;font-weight:800"></span><span data-a="l"></span><span data-a="s" style="color:#ffd8a8"></span>' +
      '<span data-a="h" style="color:#ff6a5a;letter-spacing:1px"></span><span data-a="g" style="color:#ffd96a"></span>' +
      '<button type="button" data-a="x" style="pointer-events:auto;cursor:pointer;font:700 12px system-ui,sans-serif;color:#fff;background:#7a2a1a;border:1px solid #c86a4a;border-radius:8px;padding:3px 9px">Aufgeben</button>';
    el.hidden = true;
    el.querySelector('[data-a="x"]').addEventListener('click', () => arenaStop('aufgeben'));
    document.body.appendChild(el);
    arenaUi.el = el;
  }
  const el = arenaUi.el;
  if (!run || run.slot < 0 || !game.running) {
    if (!el.hidden) el.hidden = true;
    return;
  }
  // übrig: die lebenden und die noch kommenden (Verstärkung der Bosse zählt mit, sobald sie da ist)
  const rest = (run.left || 0) + Math.max(0, (run.n || 0) - (run.spawned || 0));
  const left = run.phase === 'pause' ? `Nächste Welle in ${Math.max(0, Math.ceil(run.until - game.time))} s` : run.phase === 'fight' ? `Noch ${rest} Monster` : 'Gleich geht es los';
  const next = run.phase === 'fight' && run.nextBatch > game.time ? `Nächster Schub in ${Math.ceil(run.nextBatch - game.time)} s` : '';
  const w = `Welle ${Math.max(1, run.wave)}`;
  const h = `${'♥'.repeat(run.lives)}${'♡'.repeat(Math.max(0, ARENA.lives - run.lives))} ${run.lives}/${ARENA.lives}`;
  const g = `${arenaFmt(run.gold)} Gold gesammelt`;
  const key = w + '|' + left + '|' + next + '|' + h + '|' + g;
  if (key !== arenaUi.key) {
    arenaUi.key = key;
    el.querySelector('[data-a="w"]').textContent = w;
    el.querySelector('[data-a="l"]').textContent = left;
    el.querySelector('[data-a="s"]').textContent = next;
    el.querySelector('[data-a="s"]').hidden = !next;
    el.querySelector('[data-a="h"]').textContent = h;
    el.querySelector('[data-a="g"]').textContent = g;
  }
  // Lage nachführen (Chat kann verschoben werden, Fenstergröße ändert sich)
  if (el.hidden || performance.now() - arenaUi.posAt > 500) {
    arenaUi.posAt = performance.now();
    arenaHudPlace(el);
  }
  if (el.hidden) el.hidden = false;
}

// --- Fenster beim Arenameister und am Ausgang --------------------------------------------------------------------
function arenaRenderMaster(npc) {
  const p = game.player;
  const A = arenaSave(p);
  const body = $('npcBody');
  const L = p.level;
  const low = L < ARENA.minLevel;
  const rows = [1, 2, 5, 10, 15, 20].map((w) => `<li>Welle ${w}: ${arenaFmt(arenaGold(L, w))} Gold</li>`).join('');
  const party = game.party && game.party.members && game.party.members.length > 1;
  body.innerHTML =
    `<p class="quest-step">Herausforderung · allein · ab Stufe ${ARENA.minLevel}</p>` +
    `<p>„Willkommen in der Prüfungsarena! Dort kämpfst du ganz allein gegen Welle um Welle. Jede Welle ist stärker als die davor – erst viele Monster, dann Elite, und jede fünfte Welle ein Wellenmeister. Für jede Welle, die du schaffst, zahle ich dir Gold.“</p>` +
    `<p><strong>Gold je geschaffter Welle:</strong></p><ul class="reward-list">${rows}</ul>` +
    `<p>Bis Welle 10 zusammen: ${arenaFmt(arenaGoldSum(10))} Gold</p>` +
    `<p class="hint-text">Die Monster kommen in Schüben nach der Uhr, nicht erst, wenn eines fällt. Sie geben volle Erfahrung und ihr normales Gold, aber keine Gegenstände, Steine, Tränke oder Material.</p>` +
    `<p class="hint-text">Du hast ${ARENA.lives} Leben. Nach einem Tod startest du in der Arena neu; beim dritten Tod ist der Lauf vorbei und das gesammelte Gold verloren. Das Wellengold wird ausgezahlt, wenn du die Arena verlässt oder aufgibst.</p>` +
    (party ? '<p class="hint-text">Deine Gruppe wartet draußen – in die Arena geht jeder allein.</p>' : '') +
    `<p>Deine Bestwelle: <b>${A.best || 0}</b></p>` +
    `<p>Läufe: ${A.runs || 0} · Gold aus der Arena: ${arenaFmt(A.gold || 0)}</p>` +
    `<button type="button" class="btn btn-primary" data-arena="go" ${low || game.arenaRun ? 'disabled' : ''}>${low ? `Ab Stufe ${ARENA.minLevel}` : 'Arena betreten'}</button>`;
  const b = body.querySelector('[data-arena]');
  if (b) b.addEventListener('click', () => arenaEnter());
}
function arenaRenderExit() {
  const run = game.arenaRun;
  const body = $('npcBody');
  body.innerHTML = `<p>Ein Tor aus warmem Licht führt zurück zum Arenameister.</p>` +
    (run ? `<p>Geschafft: ${run.cleared} ${run.cleared === 1 ? 'Welle' : 'Wellen'} · ${arenaFmt(run.gold)} Gold</p><p class="hint-text">Wer geht, beendet den Lauf und bekommt das gesammelte Gold ausgezahlt.</p>` : '') +
    '<button type="button" class="btn btn-primary" data-arena="leave">Arena verlassen</button>';
  body.querySelector('[data-arena]').addEventListener('click', () => {
    if (game.arenaRun) arenaStop('aufgeben');
    else moveThrough(arenaReturn(), ARENA.gate);
  });
}
const _arenaOpenNpc = ui.openNpc;
ui.openNpc = function (npc) {
  if (npc && (npc.id === 'arena' || npc.arenaExit != null)) {
    this.closePanels();
    $('npcTitle').textContent = npc.name;
    if (npc.arenaExit != null) arenaRenderExit(npc);
    else arenaRenderMaster(npc);
    this.renderNpcQuests(npc);
    $('panelNpc').hidden = false;
    return;
  }
  return _arenaOpenNpc.call(this, npc);
};
NPC_TALK_LABEL.arena = 'Herausforderung';
if (!SAVE_FIELDS.includes('arena')) SAVE_FIELDS.push('arena');
NPC_LINES.arena = ['Allein in die Arena – und mit vollen Taschen zurück.'];

// --- Aussehen des Arenameisters ----------------------------------------------------------------------------------
// Veteran der Arena: Brustpanzer, roter Umhang, goldener Helm mit rotem Busch, ein Langschwert
STAND_COLORS.arena = '#7a1f1f';
NPC_ART.arena = (ctx) => villagerArt(ctx, {
  skin: '#d9a982', pants: '#2e2420', boots: '#2a1c14', torso: '#7a2a22', sleeve: '#d9a982', gloves: '#6b4a2e', wide: 1.1,
  behind: (ctx) => poly(ctx, [[-11, -26], [11, -26], [14, -4], [-14, -4]], '#9a1f1f'),
  body: (ctx, half) => {
    box(ctx, -half + 1.5, -24, half * 2 - 3, 12, 3, '#a8844a');
    stroke(ctx, '#e0c36a', 1, [[-half + 2, -18], [half - 2, -18]]);
    box(ctx, -half, -12.5, half * 2, 2.8, 1, '#c9a35a');
    dot(ctx, 0, -11.1, 2, 2, '#ffd34d');
  },
  head: (ctx, cx, cy) => {
    paintShape(ctx, () => {
      ctx.beginPath();
      ctx.arc(cx, cy - 0.5, 11.8, Math.PI * 1.0, Math.PI * 2.0);
      ctx.lineTo(cx + 11.8, cy + 1);
      ctx.lineTo(cx - 11.8, cy + 1);
      ctx.closePath();
    }, '#c9a35a', cx - 11.8, cy - 12.3, 23.6, 13.3);
    box(ctx, cx - 12.4, cy - 2, 24.8, 3, 1, '#a8844a');
    // roter Busch von vorn nach hinten
    oval(ctx, cx, cy - 15, 3.4, 6, '#c8302a');
    oval(ctx, cx, cy - 18, 2.2, 3.4, '#e8503a');
  },
  extra: (ctx) => heldWeapon(ctx, 'sword', 12, -12, -0.3, 4)
});
NPC3.arena = {
  skin: '#d9a982', torso: '#7a2a22', sleeve: '#d9a982', pants: '#2e2420', boots: '#2a1c14', gloves: '#6b4a2e',
  hair: { style: 3, color: '#1a1210' }, beard: '#3a2418', helm: '#c9a35a', cuirass: '#a8844a', cuirassRim: '#e0c36a',
  pads: '#8f98a3', padTrim: '#c9a35a', cape: '#9a1f1f', lining: '#5a1010', sash: '#c9a35a', belt: '#3a2618',
  weapon: { kind: 'sword', tier: 4 }, eyeShape: 3
};
NPC_ICONS.arena = (ctx) => npcBadge(ctx, '#7a1f1f', (c) => {
  // zwei gekreuzte Klingen über einer Goldmünze
  oval(c, 0, 3.2, 4.2, 4.2, '#ffd34d');
  oval(c, 0, 3.2, 2.6, 2.6, '#e0a82a');
  for (const sx of [-1, 1]) {
    stroke(c, '#e8eef4', 1.8, [[-sx * 7, -7], [sx * 5, 5]]);
    stroke(c, '#c9a35a', 2.2, [[sx * 3.4, 3.4], [sx * 6.6, 0.2]]);
    stroke(c, '#6b4a2e', 1.6, [[sx * 5, 5], [sx * 7, 7]]);
  }
});
// Stand: Waffengestell mit Schwertern und Schilden, Rüstungspuppe, Pokal und Goldmünzen
STAND3.arena = function (b, M) {
  stFrame3(b, M, { awning: ['#7a1f1f', '#e0c36a'], counter: false, sign: '#ffd34d' });
  b.add(wbox(2.0, 1.3, 0.05, 0.02), darker(ST3.wood, 0.2), { parent: M, p: [0, 0.95, -0.5] });
  stSword3(b, M, -0.55, 0.85, -0.44, 0.75, 0.5);
  stSword3(b, M, -0.25, 0.85, -0.44, 0.75, -0.5);
  stShield3(b, M, 0.45, 1.15, -0.43, 0.24, '#7a1f1f');
  stShield3(b, M, 0.85, 0.95, -0.43, 0.2, '#2f4a6a');
  stDummy3(b, M, -0.85, 0.15, '#a8844a', '#c9a35a', '#c8302a');
  // Tisch mit Pokal und Münzen
  b.add(wbox(0.8, 0.05, 0.45, 0.02), ST3.woodL, { parent: M, p: [0.45, 0.62, 0.2] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(wbox(0.05, 0.58, 0.05, 0.02), ST3.woodD, { parent: M, p: [0.45 + sx * 0.34, 0.31, 0.2 + sz * 0.16] });
  b.add(cyl3(0.07, 0.12, 0.05, 12), ST3.gold, { parent: M, p: [0.3, 0.67, 0.2], shine: 1 });
  b.add(cyl3(0.025, 0.025, 0.12, 8), ST3.gold, { parent: M, p: [0.3, 0.75, 0.2], shine: 1 });
  b.add(cyl3(0.13, 0.06, 0.18, 14), ST3.gold, { parent: M, p: [0.3, 0.9, 0.2], shine: 1, top: '#fff2c0', topK: 0.4 });
  for (let k = 0; k < 6; k++) b.add(cyl3(0.05, 0.05, 0.015, 10), '#ffd34d', { parent: M, p: [0.58 + (k % 3) * 0.06, 0.655 + Math.floor(k / 3) * 0.016, 0.18 + (k % 2) * 0.05], shine: 1 });
};
