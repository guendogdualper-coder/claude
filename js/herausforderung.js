// Herausforderung (seit 13.63): die Prüfungsarena – allein gegen Welle um Welle, Gold für jede geschaffte Welle.
// - In jeder Stadt und jedem Lager steht ein Arenameister (welt.js, Platz aus TOWN_PLACES). Er schickt dich in eine
//   eigene Halle, im Mehrspieler bekommt jeder Lauf seine eigene. Seit 14.32 auch zu zweit: ein Gruppenmitglied im Kanal
//   wird eingeladen (Nachrichten ari/arj/ard), höchstens zwei je Halle, geprüft beim Host (arenaJoin); bis 14.31 allein.
// - seit 14.32 schneller: Schübe alle 3 s, Pausen 3 s, Monster laufen nach 0,35 s los (Messung im Auftrag 2026-11-10).
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
  firstPause: 3,        // Sekunden bis zur ersten Welle (seit 14.32: 3 statt 4; die Ankündigung „Welle 1“ bleibt)
  pause: 3,             // Pause nach einer geschafften Welle (seit 14.32: 3 statt 6)
  lives: 3,             // seit 13.70: drei Leben je Lauf (beim dritten Tod ist das gesammelte Gold verloren)
  // seit 14.32: Schübe alle 3 s (vorher 10, 12, 14 … s) mit je etwa 4 Monstern (zu zweit 6). Höchstens 30 (zu zweit
  // 40) leben gleichzeitig – vorher 50; was darüber liegt, rückt nach, sobald Platz ist (kein eigener Wartetakt)
  batchGap: 3, batchSize: 4,
  maxAlive: 30, maxAliveDuo: 40,
  spawnStun: 0.35,      // so lange steht ein Monster beim Erscheinen (seit 14.32: 0,35 statt 0,7 s)
  // seit 14.32 zu zweit (zwei Mitglieder derselben Gruppe in einer Halle): 1,5-mal so viele Monster, +25 % Leben,
  // +10 % Schaden, Wellenmeister insgesamt +50 % Leben – zusammen 1,5 × 1,25 ≈ 1,9-mal so viel Leben je Welle bei
  // doppelt so vielen Kämpfern, die Runde wird also nicht länger
  duo: { n: 1.5, hp: 1.25, atk: 1.1, boss: 1.2 },
  inviteWait: 20,       // so lange wartet die Halle auf das eingeladene Gruppenmitglied
  deadMax: 180,         // so lange (s) darf der Läufer tot in der Halle liegen, dann endet der Lauf
  eliteHp: 3, eliteAtk: 1.3,
  gate: '#ffc86a'       // Farbe von Lichtsäulen und Ausgang
};
const ARENA_THEME = '#6a5a48|#c9a35a|#ffb04a'; // Säulen, Banner, Statuen: Stein | Fugen | Leuchtfarbe

// Gebiet der Arena (nicht sicher, kein Dungeon): Name oben in der Ecke, Stimmung
const ARENA_ZONE = { id: 'arena', name: 'Prüfungsarena', levels: 'Herausforderung · allein oder zu zweit', ground: 'FLAGSTONE', ambient: { kind: 'dust', tint: [60, 40, 20, 0.06] } };
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
// seit 13.92 baut sich die Stärke langsamer auf (nicht die Menge): Welle 1 deutlich leichter (Stufe −7, 60 % Leben und
// Schaden), Welle 2–3 noch angenehm, 4–7 ungefähr wie draußen, ab Welle 8 spürbar härter (über der eigenen Stufe,
// jede Welle +6 % Leben und +4 % Schaden). Vorher: Welle 1 schon Stufe −4 mit vollen Werten, Elite ab Welle 3.
const ARENA_STR = [0, 0.6, 0.72, 0.82, 0.9, 0.95, 1.0, 1.05, 1.15];
function arenaStr(w) {
  return w < ARENA_STR.length ? ARENA_STR[Math.max(1, w)] : ARENA_STR[ARENA_STR.length - 1] + 0.06 * (w - ARENA_STR.length + 1);
}
function arenaWaveLevel(L, w) {
  const ml = w < 8 ? L - 8 + w : L + Math.floor((w - 8) / 2);
  return Math.max(1, Math.min(L + 8, ml));
}
// players: 1 allein, 2 zu zweit (seit 14.32)
function arenaWave(L, w, players = 1) {
  const boss = w % 5 === 0;
  const str = arenaStr(w);
  const duo = players >= 2 ? ARENA.duo : null;
  const n = Math.round(Math.min(60, 12 + 4 * (w - 1)) * (boss ? 0.6 : 1) * (duo ? duo.n : 1));
  // seit 14.32: Schübe von etwa 4 (zu zweit 6) Monstern alle 3 s; bis 14.31 waren es 2 + Welle/2 Schübe (höchstens 10)
  // im Abstand von 10, 12, 14 … s – Welle 4 brauchte so 36 s, bis das letzte Monster kam, jetzt 15 s
  const batches = Math.max(2, Math.ceil(n / (ARENA.batchSize * (duo ? duo.n : 1))));
  return {
    wave: w,
    ml: arenaWaveLevel(L, w),
    players: duo ? 2 : 1,
    // Bosswellen: der Wellenmeister (Mini-Boss) mit etwas kleinerem Gefolge (60 %)
    n,
    // Elite erst ab Welle 4 (seit 13.92)
    elites: w < 4 ? 0 : Math.round(Math.min(10, Math.floor(w / 3)) * (duo ? duo.n : 1)),
    boss,
    bossHp: (4 + 0.4 * w) * (duo ? duo.boss : 1),
    hpK: str * (duo ? duo.hp : 1),
    atkK: (w <= 8 ? str : ARENA_STR[8] + 0.04 * (w - 8)) * (duo ? duo.atk : 1),
    batches,
    // Abstände der Schübe in Sekunden (seit 14.32 gleichmäßig 3 s)
    gaps: Array.from({ length: batches - 1 }, () => ARENA.batchGap)
  };
}
// Gold je geschaffter Welle: seit 13.71 nach Stufe – Schritt je Welle = 200 + 20 × Stufe (Stufe 10: 400, Stufe 30: 800,
// Stufe 50: 1.200, Stufe 80: 1.800), Welle w bringt Schritt × w. 13.70 zahlte fest 2.000 × Welle, das war vor allem auf
// niedrigen Stufen viel zu viel (bis 16× normales Farmen); jetzt etwa das 2- bis 3-Fache.
// Ausgezahlt wird beim Verlassen oder Aufgeben; wer alle drei Leben verliert, verliert das Gold dieses Laufs.
const arenaGoldStep = (L) => 200 + 20 * Math.max(1, L | 0);
function arenaGold(L, w) {
  return arenaGoldStep(L) * Math.max(1, w | 0);
}
// Gold aller Wellen bis einschließlich w
const arenaGoldSum = (w, L) => (arenaGoldStep(L) * w * (w + 1)) / 2;
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
// seit 14.32 kann eine Halle zwei Teilnehmer haben (S.members: 'me' für den Host selbst, sonst die pid). Allein wie
// bisher; zu zweit lädt der Läufer beim Betreten ein Gruppenmitglied ein (S.invite = dessen Name). Nur dieser Name
// darf beitreten, nur solange die Halle noch auf den Start wartet und höchstens zwei – das prüft allein der Host
// (eine Rechnung nacheinander, gleichzeitige Anfragen können das Limit nicht umgehen). Wer die Halle verlässt, stirbt
// (drittes Leben) oder die Verbindung verliert, fällt heraus; der andere kämpft allein weiter.
const arenaHost = { slots: Array.from({ length: ARENA.slots }, () => null) };
const arenaNow = () => game.time;

function arenaMemberObj(id) {
  if (id === 'me') return game.player;
  const rp = net.players.get(id);
  return rp && !rp.gone ? rp : null;
}
function arenaOwnerObj(S) {
  return arenaMemberObj(S.owner);
}
const arenaMemberName = (id) => (id === 'me' ? (game.player && game.player.name) : (net.players.get(id) || {}).name) || '';
// Nachricht an alle Teilnehmer einer Halle (an sich selbst direkt, sonst über den Host)
function arenaTellOne(id, d) {
  if (id === 'me') arenaOnMsg(d);
  else if (typeof netSocial === 'function') netSocial(id, d);
}
function arenaTell(S, d) {
  for (const id of S.members.slice()) arenaTellOne(id, d);
}
// Stufe der Wellen: allein die eigene, zu zweit der Schnitt beider (Gruppen haben höchstens 15 Stufen Abstand)
function arenaSlotLevel(S) {
  const ls = S.members.map((id) => S.levels[id] || 1);
  return Math.max(1, Math.min(99, Math.round(ls.reduce((a, b) => a + b, 0) / ls.length)));
}
// freie Halle: ohne Läufer und ohne jemanden darin; invite = Name des Gruppenmitglieds für zu zweit (seit 14.32)
function arenaAlloc(owner, level, invite) {
  for (const S of arenaHost.slots) if (S && S.members.includes(owner)) arenaDrop(arenaHost.slots.indexOf(S), owner, null);
  const busy = new Set();
  if (game.player) busy.add(arenaSlotAt(game.player.x, game.player.y));
  if (net.mode === 'host') for (const rp of net.players.values()) busy.add(arenaSlotAt(rp.x, rp.y));
  for (let s = 0; s < ARENA.slots; s++) {
    if (arenaHost.slots[s] || busy.has(s)) continue;
    const S = { owner, members: [owner], levels: { [owner]: Math.max(1, Math.min(99, level | 0)) }, joinAt: { [owner]: arenaNow() },
      invite: invite || null, joined: false, level: 1, players: 1, state: 'reserved', wave: 0, at: arenaNow(), until: 0, queue: [],
      mons: new Set(), absent: {}, deadSince: {}, nextAt: 0, aggroAt: 0, spotK: 0 };
    S.level = arenaSlotLevel(S);
    arenaHost.slots[s] = S;
    return s;
  }
  return -1;
}
// Beitritt des eingeladenen Gruppenmitglieds (seit 14.32). Rückgabe: '' oder der Grund der Ablehnung
function arenaJoin(id, s, level) {
  const S = arenaHost.slots[s | 0];
  const name = arenaMemberName(id);
  if (!S || !S.invite) return 'Diese Halle erwartet niemanden mehr.';
  if (S.members.includes(id)) return '';
  if (S.members.length >= 2) return 'In der Halle sind schon zwei Spieler – mehr passen nicht hinein.';
  if (!name || S.invite !== name) return 'Du bist für diese Halle nicht eingeladen.';
  if (S.state !== 'reserved') return 'Der Lauf hat schon begonnen.';
  for (const o of arenaHost.slots) if (o && o !== S && o.members.includes(id)) arenaDrop(arenaHost.slots.indexOf(o), id, null);
  S.members.push(id);
  S.levels[id] = Math.max(1, Math.min(99, level | 0));
  S.joinAt[id] = arenaNow();
  S.joined = true;
  S.level = arenaSlotLevel(S);
  arenaTell(S, { k: 'arm', n: S.members.map(arenaMemberName) });
  return '';
}
// Einladung an das Gruppenmitglied schicken (seit 14.32); Rückgabe false, wenn es nicht im Kanal ist
function arenaInvite(S, s) {
  const d = { k: 'ari', s, n: arenaMemberName(S.owner) };
  if (game.player && S.invite === game.player.name && S.owner !== 'me') {
    arenaOnMsg(d);
    return true;
  }
  const on = typeof onlinePlayer === 'function' ? onlinePlayer(S.invite) : null;
  if (!on || on.pid === S.owner) return false;
  netSocial(on.pid, d);
  return true;
}
// Einladung abgelehnt oder abgelaufen: die Halle startet allein
function arenaUninvite(S, why) {
  if (!S.invite || S.joined) return;
  const who = S.invite;
  S.invite = null;
  arenaTell(S, { k: 'arv', n: who, r: why || '' });
}
// Ein Teilnehmer fällt heraus (why: Grund für ihn, null = ihm nichts mehr sagen); ist niemand mehr da, wird die Halle frei
function arenaDrop(s, id, why) {
  const S = arenaHost.slots[s];
  if (!S || !S.members.includes(id)) return;
  if (why) arenaTellOne(id, { k: 'are', r: why, w: S.wave });
  S.members = S.members.filter((x) => x !== id);
  if (!S.members.length) {
    arenaFree(s);
    return;
  }
  if (S.owner === id) S.owner = S.members[0];
  S.level = arenaSlotLevel(S);
  arenaTell(S, { k: 'arm', n: S.members.map(arenaMemberName), l: arenaMemberName(id) });
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
  const W = arenaWave(S.level, S.wave, S.players);
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
// Teilnehmer, die gerade in der Halle stehen und leben (Ziele der Monster)
function arenaFighters(S, s) {
  const out = [];
  for (const id of S.members) {
    const o = arenaMemberObj(id);
    if (o && !o.dead && arenaSlotAt(o.x, o.y) === s) out.push(o);
  }
  return out;
}
const arenaHidden = (o) => (o === game.player ? !!(game.stats && game.stats.invisible) : !!o.invisible);
// Ziel für ein Monster der Halle (seit 14.32): der Teilnehmer, den gerade weniger Monster jagen (Druck auf beide),
// bei Gleichstand der nähere; getarnte nicht
function arenaPickTarget(S, m, fighters) {
  let best = null;
  let bs = Infinity;
  for (const o of fighters) {
    if (arenaHidden(o)) continue;
    let n = 0;
    for (const x of S.mons) if (!x.dead && x !== m && x.target === o) n++;
    const sc = n * 1e4 + Math.hypot(o.x - m.x, o.y - m.y);
    if (sc < bs) { bs = sc; best = o; }
  }
  return best;
}
// Ziel noch gültig? Ein Teilnehmer in der Halle oder ein Diener (der als Tank Bedrohung gesammelt hat, gegner.js)
function arenaTargetOk(S, s, t) {
  if (!t || t.dead || t.gone || t.hp <= 0) return false;
  if (t.ally || t.remoteAlly) return typeof allyPresent === 'function' ? allyPresent(t) : game.allies.includes(t);
  return S.members.some((id) => arenaMemberObj(id) === t) && arenaSlotAt(t.x, t.y) === s && !arenaHidden(t);
}
function arenaSpawnOne(s, S, e, fighters) {
  const W = arenaWave(S.level, S.wave, S.players);
  const spots = arenaSpawnSpots(s);
  // eine Stelle ein Stück von allen Teilnehmern weg; seit 14.32 reihum über den Rand verteilt (Druck aus mehreren
  // Richtungen, kein Erscheinen direkt neben jemandem)
  const far = spots.filter((p) => fighters.every((o) => Math.hypot(p.x - o.x, p.y - o.y) > 6 * TILE));
  const list = far.length ? far : spots;
  S.spotK = (S.spotK + 3) % 997;
  const at = list[S.spotK % list.length];
  const pos = spotNear(at, e.role === 'boss' ? 10 : 30);
  const m = createMonster(e.type, pos.x, pos.y, { level: W.ml, respawn: false, zone: ARENA_ZONE });
  m.arenaSlot = s;
  arenaTune(m, W, e.role);
  // steht kurz, während es erscheint (Bosse ignorieren das), dann sofort auf einen Teilnehmer los
  m.stun = ARENA.spawnStun;
  m.state = 'chase';
  // seit 14.32: auf einem Bogen anlaufen statt alle auf denselben Punkt (gegner.js, m.flank)
  m.flank = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5);
  m.target = arenaPickTarget(S, m, fighters) || fighters[0] || arenaOwnerObj(S);
  game.monsters.push(m);
  S.mons.add(m);
  if (S.members.includes('me')) arenaSeen(m);
}
function arenaTickHost() {
  if (net.mode === 'client') return;
  const now = arenaNow();
  for (let s = 0; s < ARENA.slots; s++) {
    let S = arenaHost.slots[s];
    if (!S) continue;
    // Teilnehmer ohne Verbindung (oder anderer Charakter) fallen heraus
    for (const id of S.members.slice()) if (!arenaMemberObj(id)) arenaDrop(s, id, null);
    if (!(S = arenaHost.slots[s])) continue;
    const here = (id) => { const o = arenaMemberObj(id); return !!o && arenaSlotAt(o.x, o.y) === s; };
    if (S.state === 'reserved') {
      // zu zweit: auf das eingeladene Mitglied warten (höchstens ARENA.inviteWait s); wer zugesagt hat, muss kommen
      if (S.invite && !S.joined && now - S.at > ARENA.inviteWait) arenaUninvite(S, 'kommt nicht');
      for (const id of S.members.slice()) if (!here(id) && id !== S.owner && now - S.joinAt[id] > 15) arenaDrop(s, id, 'weg');
      if (!(S = arenaHost.slots[s])) continue;
      const waiting = S.invite && !S.joined;
      if (S.members.every(here) && !waiting) {
        S.state = 'pause';
        S.wave = 1;
        S.until = now + ARENA.firstPause;
        arenaTell(S, { k: 'arp', w: 1, t: ARENA.firstPause });
      } else if (!S.members.some(here) && now - S.at > 25 + (S.invite ? ARENA.inviteWait : 0)) arenaFree(s);
      continue;
    }
    // Tot (seit 13.70 drei Leben): solange alle Teilnehmer tot sind, wartet die Halle (Schübe stehen still); wer zu
    // lange liegt, fällt heraus. Zu zweit kämpft der andere weiter, die Monster wechseln auf ihn.
    const dt = Math.max(0, Math.min(1, now - (S.last ?? now)));
    S.last = now;
    for (const id of S.members.slice()) {
      const o = arenaMemberObj(id);
      if (o.dead) {
        if (S.deadSince[id] == null) S.deadSince[id] = now;
        if (now - S.deadSince[id] > ARENA.deadMax) arenaDrop(s, id, 'tod');
        continue;
      }
      S.deadSince[id] = null;
      if (!here(id)) {
        if (S.absent[id] == null) S.absent[id] = now;
        if (now - S.absent[id] > 3) arenaDrop(s, id, 'weg');
      } else S.absent[id] = null;
    }
    if (!(S = arenaHost.slots[s])) continue;
    if (S.members.every((id) => arenaMemberObj(id).dead)) {
      S.until += dt;
      S.nextAt += dt;
      if (S.batchAt != null) S.batchAt += dt;
      continue;
    }
    const fighters = arenaFighters(S, s);
    if (S.state === 'pause') {
      if (now < S.until) continue;
      S.state = 'fight';
      // Skalierung nach der tatsächlichen Teilnehmerzahl zu Beginn der Welle (seit 14.32)
      S.players = Math.min(2, S.members.length);
      S.batches = arenaBatches(S);
      S.batch = 0;
      S.batchAt = now;
      S.queue = [];
      S.mons.clear();
      S.nextAt = now;
      arenaTell(S, { k: 'arf', w: S.wave, n: S.batches.reduce((n, b) => n + b.length, 0), b: S.batches.length, pl: S.players });
      continue;
    }
    // Kampf: Verstärkung der Bosse übernehmen (Stufe und Werte der Welle), Schübe nach der Uhr, Ende der Welle
    const W = arenaWave(S.level, S.wave, S.players);
    const list = (typeof monsterIndex === 'function' ? monsterIndex().get(0) : null) || game.monsters;
    for (const m of list) {
      if (m.dead || m.arenaSlot != null || m.isStone || arenaSlotAt(m.x, m.y) !== s) continue;
      m.arenaSlot = s;
      arenaTune(m, W, 'mob');
      S.mons.add(m);
      if (S.members.includes('me')) arenaSeen(m);
    }
    let alive = 0;
    for (const m of S.mons) if (!m.dead) alive++;
    // nächster Schub nach seiner Zeit (nicht nach Kills). Seit 14.32: erst, wenn der vorige ganz erschienen ist; was
    // wegen der Obergrenze noch wartet, kommt, sobald ein Monster fällt (kein zweiter Takt)
    const cap = S.players >= 2 ? ARENA.maxAliveDuo : ARENA.maxAlive;
    if (S.batch < S.batches.length && now >= S.batchAt && !S.queue.length) {
      S.queue.push(...S.batches[S.batch]);
      const gap = W.gaps[S.batch];
      S.batch++;
      S.batchAt = gap != null ? now + gap : Infinity;
      const pending = S.batches.slice(S.batch).reduce((n, b) => n + b.length, 0);
      arenaTell(S, { k: 'ars', i: S.batch, b: S.batches.length, t: gap != null ? gap : -1, p: pending });
    }
    if (S.queue.length && now >= S.nextAt && alive < cap) {
      arenaSpawnOne(s, S, S.queue.shift(), fighters);
      S.nextAt = now + 0.12;
      alive++;
    }
    // Wer kein gültiges Ziel hat (Teilnehmer tot, weg oder getarnt), nimmt sofort einen Teilnehmer
    // (seit 14.32 alle 0,5 s statt 1 s; zu zweit den anderen)
    if (now >= S.aggroAt) {
      S.aggroAt = now + 0.5;
      for (const m of S.mons) {
        if (m.dead || (m.state === 'chase' && arenaTargetOk(S, s, m.target))) continue;
        const t = arenaPickTarget(S, m, fighters);
        if (!t) continue;
        m.state = 'chase';
        m.target = t;
        m.windup = 0;
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
// Gruppenmitglieder, die man zu zweit mitnehmen kann (seit 14.32): im Kanal, nicht man selbst
function arenaMates() {
  if (!game.party || !game.party.members || game.party.members.length < 2 || (net.mode !== 'host' && net.mode !== 'client')) return [];
  return game.party.members.filter((n) => n !== game.player.name && typeof onlinePlayer === 'function' && onlinePlayer(n));
}
// Betreten (vom Arenameister); mate: Name des Gruppenmitglieds für zu zweit (seit 14.32), join: Halle, in die man
// eingeladen wurde
function arenaEnter(mate, join) {
  const p = game.player;
  if (!p || p.dead) return;
  if (p.level < ARENA.minLevel) {
    ui.log(`Die Prüfungsarena öffnet sich ab Stufe ${ARENA.minLevel}.`, 'warn');
    return;
  }
  if (game.arenaRun) return;
  if (mate && net.mode !== 'host' && net.mode !== 'client') mate = null;
  const A = arenaSave(p);
  A.ret = { x: Math.round(p.x), y: Math.round(p.y) };
  arenaPayPending(p);
  const run = { p, slot: -1, level: p.level, mode: arenaModeOf(), phase: 'wait', wave: 0, cleared: 0, gold: 0, until: 0, n: 0, askAt: game.time, lastMsgAt: game.time, lives: ARENA.lives, nextBatch: 0, pending: 0, outSince: null, t0: null, xp: 0, mobGold: 0, kills: 0,
    mates: mate ? [mate] : [], waitFor: mate || null };
  game.arenaRun = run;
  if (run.mode === 'client') {
    netSocial('host', join != null ? { k: 'arj', s: join | 0, l: p.level } : { k: 'arq', l: p.level, ...(mate ? { pn: mate } : {}) });
    ui.closePanels();
    ui.log(join != null ? 'Du gehst mit in die Halle …' : mate ? 'Der Arenameister bereitet eure Halle vor – dein Gruppenmitglied wird eingeladen …' : 'Der Arenameister bereitet deine Halle vor …', 'info');
    return;
  }
  if (join != null) {
    const why = arenaJoin('me', join, p.level);
    if (why) {
      game.arenaRun = null;
      ui.log(why, 'warn');
      return;
    }
    arenaGo(join | 0);
    return;
  }
  const s = arenaAlloc('me', p.level, mate);
  if (s < 0) {
    game.arenaRun = null;
    ui.log('Alle Hallen der Arena sind gerade belegt. Versuch es gleich noch einmal.', 'warn');
    return;
  }
  if (mate && !arenaInvite(arenaHost.slots[s], s)) {
    arenaHost.slots[s].invite = null;
    run.waitFor = null;
    run.mates = [];
    ui.log('Dein Gruppenmitglied ist gerade nicht im Kanal – du gehst allein.', 'warn');
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
  if (run.t0 == null) run.t0 = game.time; // Uhr für die Abschlussübersicht (seit 13.85)
  const p = game.player;
  moveThrough(arenaEntry(s), ARENA.gate);
  arenaSave(p).runs++;
  ui.banner('Prüfungsarena', run.mates && run.mates.length ? 'Zu zweit gegen alle Wellen – viel Glück!' : 'Allein gegen alle Wellen – viel Glück!');
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
  } else if (run.slot >= 0 && arenaHost.slots[run.slot]) arenaDrop(run.slot, 'me', null); // zu zweit kämpft der andere weiter
  const txt = !run.cleared ? 'Keine Welle geschafft' : lost ? `${run.cleared} ${run.cleared === 1 ? 'Welle' : 'Wellen'} geschafft · ${arenaFmt(run.gold)} Gold verloren`
    : `${run.cleared} ${run.cleared === 1 ? 'Welle' : 'Wellen'} geschafft · ${arenaFmt(run.gold)} Gold ausgezahlt`;
  ui.banner(lost ? 'Herausforderung verloren' : 'Herausforderung beendet', txt);
  ui.log(`Herausforderung beendet: ${txt}. Bestwelle: ${A.best}.`, lost ? 'warn' : 'level');
  if (!lost && run.gold > 0) addText(p.x, p.y - 52, `+${arenaFmt(run.gold)} Gold`, 'gold');
  // zurück zum Arenameister (nicht nach dem Tod: dann bringt das Wiederbeleben dorthin)
  if (!p.dead && arenaInside(p)) moveThrough(arenaReturn(), ARENA.gate);
  arenaHud();
  if (run.t0 != null) arenaSummary(run, lost, A.best);
  saveGame();
}
// Abschlussübersicht (seit 13.85): kleines Fenster in der Mitte nach dem Lauf – Zeit, EP, Gold der Monster und der
// Wellen. Schließt sich mit ✕, per Antippen daneben oder nach 20 s von selbst. Liegt die Figur noch tot da, erscheint
// es erst nach dem Wiederbeleben.
function arenaSummaryCss() {
  if (document.getElementById('arenaSumCss')) return;
  const st = document.createElement('style');
  st.id = 'arenaSumCss';
  st.textContent = '#arenaSum{position:fixed;left:50%;top:42%;transform:translate(-50%,-50%) scale(.92);opacity:0;z-index:60;' +
    'min-width:230px;max-width:min(320px,calc(100vw - 32px));padding:14px 16px 12px;border-radius:12px;' +
    'background:rgba(24,18,12,.92);border:1px solid rgba(255,200,106,.55);box-shadow:0 6px 24px rgba(0,0,0,.55);' +
    'color:#f3e6cf;font-size:14px;transition:opacity .25s,transform .25s;pointer-events:auto}' +
    '#arenaSum.on{opacity:1;transform:translate(-50%,-50%) scale(1)}' +
    '#arenaSum h3{margin:0 26px 8px 0;font-size:16px;color:#ffc86a}' +
    '#arenaSum .x{position:absolute;top:6px;right:8px;width:30px;height:30px;border:0;border-radius:8px;' +
    'background:rgba(255,255,255,.08);color:#f3e6cf;font-size:16px;cursor:pointer}' +
    '#arenaSum dl{display:grid;grid-template-columns:auto auto;gap:4px 14px;margin:0}' +
    '#arenaSum dt{opacity:.8}#arenaSum dd{margin:0;text-align:right;font-weight:600}' +
    '#arenaSum dd.g{color:#ffd56a}#arenaSum dd.lost{color:#ff8a7a;text-decoration:line-through}' +
    '#arenaSum .sum{border-top:1px solid rgba(255,200,106,.3);padding-top:5px;margin-top:2px}';
  document.head.appendChild(st);
}
const arenaClock = (sec) => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} h`
    : `${m}:${String(s % 60).padStart(2, '0')} min`;
};
function arenaSummary(run, lost, best) {
  const info = {
    time: game.time - run.t0, xp: run.xp, kills: run.kills, mob: run.mobGold, wave: run.gold, cleared: run.cleared, lost, best
  };
  const show = () => {
    const p = game.player;
    if (p && p.dead) { later(0.5, show); return; }
    arenaSummaryCss();
    let el = document.getElementById('arenaSum');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'arenaSum';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Arena-Ergebnis');
    const total = info.mob + (info.lost ? 0 : info.wave);
    el.innerHTML = `<button class="x" type="button" aria-label="Schließen">✕</button>` +
      `<h3>${info.lost ? 'Arena verloren' : 'Arena beendet'}</h3><dl>` +
      `<dt>Zeit</dt><dd>${arenaClock(info.time)}</dd>` +
      `<dt>Wellen</dt><dd>${info.cleared}${info.best ? ` <small style="opacity:.7">(Beste: ${info.best})</small>` : ''}</dd>` +
      `<dt>Monster besiegt</dt><dd>${arenaFmt(info.kills)}</dd>` +
      `<dt>Erfahrung</dt><dd>+${arenaFmt(info.xp)} EP</dd>` +
      `<dt>Gold von Monstern</dt><dd class="g">+${arenaFmt(info.mob)}</dd>` +
      `<dt>Gold aus Wellen</dt><dd class="${info.lost && info.wave > 0 ? 'lost' : 'g'}">+${arenaFmt(info.wave)}</dd>` +
      `<dt class="sum">Gold gesamt</dt><dd class="sum g">+${arenaFmt(total)}</dd></dl>`;
    document.body.appendChild(el);
    let timer = 0;
    const close = () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', esc, true);
      el.classList.remove('on');
      setTimeout(() => el.remove(), 260);
    };
    const outside = (e) => { if (!el.contains(e.target)) close(); };
    const esc = (e) => { if (e.key === 'Escape' && el.isConnected) { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', esc, true);
    el.querySelector('.x').addEventListener('click', (e) => { e.stopPropagation(); close(); });
    requestAnimationFrame(() => el.classList.add('on'));
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 400);
    timer = setTimeout(close, 20000);
  };
  show();
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
  // seit 14.32: Einladung eines Gruppenmitglieds in seine Halle (zu zweit)
  if (d.k === 'ari') {
    const from = String(d.n || '');
    if (run || p.dead || p.level < ARENA.minLevel || !(typeof inMyParty === 'function' && inMyParty(from))) {
      arenaAnswerHost({ k: 'ard', s: d.s | 0 });
      return;
    }
    const ask = `<b>${escapeHtml(from)}</b> geht in die Prüfungsarena und nimmt dich mit – zu zweit gegen alle Wellen. Mitkommen?`;
    inviteToast(ask, () => arenaEnter(null, d.s | 0), () => arenaAnswerHost({ k: 'ard', s: d.s | 0 }));
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
    run.pauseLen = +d.t || ARENA.pause;
    if (run.wave === 1) ui.banner('Welle 1', 'Gleich geht es los!');
  } else if (d.k === 'arf') {
    run.phase = 'fight';
    run.wave = d.w | 0;
    run.players = d.pl === 2 ? 2 : 1; // seit 14.32: zu zweit gerechnete Welle
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
  } else if (d.k === 'arm') {
    // seit 14.32: wer in der Halle ist (zu zweit); l = wer gerade herausgefallen ist
    const me = p.name;
    run.mates = (Array.isArray(d.n) ? d.n : []).map(String).filter((n) => n && n !== me).slice(0, 1);
    if (run.waitFor && run.mates.includes(run.waitFor)) {
      ui.log('Dein Gruppenmitglied ist dabei – ihr kämpft zu zweit.', 'level');
      run.waitFor = null;
    }
    if (d.l && d.l !== me) ui.log('Dein Mitstreiter hat die Arena verlassen – du kämpfst allein weiter (ab der nächsten Welle wieder für einen).', 'warn');
  } else if (d.k === 'arv') {
    // Einladung abgelehnt oder nicht angenommen: allein
    if (run.waitFor) ui.log('Dein Gruppenmitglied kommt nicht mit – du kämpfst allein.', 'warn');
    run.waitFor = null;
    run.mates = [];
  }
  arenaHud();
}
// Antwort an den, der die Hallen führt (Host, oder man selbst)
function arenaAnswerHost(d) {
  if (net.mode === 'client') netSocial('host', d);
  else arenaSocial('me', d);
}
// Mitspieler ↔ Host (über onSocial)
function arenaSocial(pid, d) {
  if (d.k === 'arq') {
    if (net.mode !== 'host') return;
    // zu zweit (seit 14.32): pn = Gruppenmitglied, das eingeladen wird; ist es nicht im Kanal, geht es allein
    const mate = typeof d.pn === 'string' && d.pn ? d.pn.slice(0, 40) : null;
    const s = arenaAlloc(pid, d.l, mate);
    if (s < 0) {
      netSocial(pid, { k: 'arn', r: 'Alle Hallen der Arena sind gerade belegt. Versuch es gleich noch einmal.' });
      return;
    }
    netSocial(pid, { k: 'arg', s });
    if (mate && !arenaInvite(arenaHost.slots[s], s)) arenaUninvite(arenaHost.slots[s], 'nicht im Kanal');
    return;
  }
  // seit 14.32: Beitritt (arj) und Absage (ard) des eingeladenen Mitglieds – geprüft nur hier beim Host
  if (d.k === 'arj') {
    if (net.mode !== 'host') return;
    const why = arenaJoin(pid, d.s, d.l);
    netSocial(pid, why ? { k: 'arn', r: why } : { k: 'arg', s: d.s | 0 });
    return;
  }
  if (d.k === 'ard') {
    if (pid !== 'me' && net.mode !== 'host') return;
    const S = arenaHost.slots[d.s | 0];
    if (S && S.invite && S.invite === arenaMemberName(pid)) arenaUninvite(S, 'abgelehnt');
    return;
  }
  if (d.k === 'arx') {
    if (net.mode !== 'host') return;
    const s = arenaHost.slots.findIndex((S) => S && S.members.includes(pid));
    if (s >= 0) arenaDrop(s, pid, null);
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
    arenaHost.slots.forEach((S, s) => { if (S && S.members.includes('me')) arenaDrop(s, 'me', null); });
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
// seit 14.32 zu zweit: jeder bekommt jeden Kill in der Halle, es sind aber 1,5-mal so viele Monster – je Monster daher
// nur 1/1,5 der EP und des Golds, so bringt eine Welle jedem genau so viel wie allein (keine Abkürzung über Duo-Läufe)
function arenaKillReward(m) {
  const p = game.player;
  const run0 = game.arenaRun;
  const k = run0 && run0.players >= 2 ? 1 / ARENA.duo.n : 1;
  const xp = Math.max(1, Math.round(m.xp * MOB_XP_MUL * xpFactor(p.level, m.level) * k));
  const gold = m.gold ? Math.round(randInt(m.gold[0], m.gold[1]) * k) : 0;
  p.gold += gold;
  if (gold > 0) addText(m.x + 14, feetY(m) - 30, '+' + gold + ' Gold', 'gold');
  p.kills++;
  // für die Abschlussübersicht mitzählen (EP wie gainXp sie gutschreibt, samt Startbonus)
  const run = game.arenaRun;
  if (run) {
    run.mobGold += gold;
    run.kills++;
    if (p.level < MAX_LEVEL) run.xp += typeof eventXpActive === 'function' && eventXpActive() ? Math.round(xp * (1 + EVENT_XP.mul)) : xp;
  }
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
// Wiederbeleben nach dem Tod in der Arena: beim Arenameister, nicht in Kazehana
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
// seit 13.70 nicht mehr oben in der Mitte (dort liegen Ziel- und Bossleiste); am PC direkt über dem Chat.
// seit 13.72 am Handy eine schmale Pille links unter der Lebensanzeige („W5 · 12 Mon. · ♥♥♡ · 4.000 G“ und ✕).
// Antippen klappt sie auf (nächster Schub, Aufgeben mit Rückfrage). Die Lage wird nur beim Erscheinen, beim
// Auf-/Zuklappen und bei Größenänderung neu gesetzt, nicht in jedem Bild (kein Layout-Rechnen je Bild).
const arenaUi = { el: null, key: '', open: false, confirm: false, placeDue: true, touch: false };
const arenaBox = (id) => {
  const e = document.getElementById(id);
  if (!e || e.hidden || e.closest('[hidden]')) return null;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? r : null;
};
function arenaHudPlace(el) {
  arenaUi.placeDue = false;
  if (arenaUi.touch) {
    // Handy: unter Lebensanzeige, Buffs und (falls da) Gruppenrahmen, links am Rand
    const c = arenaBox('hudChar');
    let bottom = c ? c.bottom : 90;
    for (const id of ['buffList', 'partyFrame']) {
      const r = arenaBox(id);
      if (r && c && r.left < c.right) bottom = Math.max(bottom, r.bottom);
    }
    const left = Math.round(Math.max(6, c ? c.left : 6));
    let top = Math.round(bottom + 4);
    // nicht über Boss- und Zielleiste: liegt eine im Weg, rutscht die Pille darunter
    const w = el.getBoundingClientRect().width;
    const h = el.getBoundingClientRect().height;
    for (const id of ['bossBar', 'targetFrame']) {
      const r = arenaBox(id);
      if (r && left < r.right && r.left < left + w && top < r.bottom && r.top < top + h) top = Math.round(r.bottom + 4);
    }
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.bottom = '';
    return;
  }
  // PC: direkt über dem Chat
  const r = arenaBox('chatBox');
  if (r) {
    el.style.left = Math.round(Math.max(4, r.left)) + 'px';
    el.style.top = '';
    el.style.bottom = Math.round(window.innerHeight - r.top + 6) + 'px';
  } else {
    const c = arenaBox('hudChar');
    el.style.left = Math.round(c ? c.left : 8) + 'px';
    el.style.top = Math.round((c ? c.bottom : 120) + 6) + 'px';
    el.style.bottom = '';
  }
}
function arenaHudBuild() {
  const touch = !!(typeof input !== 'undefined' && input.touchUi);
  const el = document.createElement('div');
  el.id = 'arenaHud';
  arenaUi.touch = touch;
  // unter den Fenstern (z-index 10), über der Spielfläche
  el.style.cssText = 'position:fixed;left:8px;top:90px;z-index:5;max-width:' + (touch ? 'min(300px, 46vw)' : 'min(640px, calc(100vw - 16px))') + ';' +
    'display:flex;flex-wrap:wrap;align-items:center;color:#ffe9c2;text-shadow:0 1px 2px #000;white-space:nowrap;' +
    'background:rgba(30,18,8,.78);border:1px solid rgba(255,200,106,.55);box-shadow:0 2px 8px rgba(0,0,0,.4);' +
    (touch ? 'gap:2px 6px;padding:2px 3px 2px 9px;border-radius:13px;font:600 11px/1.2 system-ui,sans-serif;pointer-events:auto;'
      : 'gap:4px 9px;padding:5px 7px 5px 11px;border-radius:12px;font:600 12.5px/1.25 system-ui,sans-serif;pointer-events:none;');
  const btn = (a, txt, css) => `<button type="button" data-a="${a}" style="pointer-events:auto;cursor:pointer;font:700 ${touch ? 11 : 12}px system-ui,sans-serif;color:#fff;background:#7a2a1a;border:1px solid #c86a4a;border-radius:${touch ? 10 : 8}px;${css}">${txt}</button>`;
  if (touch) {
    el.innerHTML = '<span data-a="w" style="color:#ffc86a;font-weight:800"></span><span data-a="l"></span>' +
      '<span data-a="h" style="color:#ff6a5a;letter-spacing:.5px"></span><span data-a="g" style="color:#ffd96a"></span>' +
      btn('x', '✕', 'width:22px;height:20px;padding:0;line-height:18px') +
      '<div data-a="d" style="flex-basis:100%;display:none;flex-wrap:wrap;align-items:center;gap:4px 6px;padding:2px 0 3px;white-space:normal">' +
      '<span data-a="s" style="color:#ffd8a8"></span><span data-a="q" style="color:#ffb8a0"></span>' + btn('y', 'Aufgeben', 'padding:2px 8px') + '</div>';
    // Antippen: auf- und zuklappen; ✕ fragt erst nach
    el.addEventListener('click', (ev) => {
      const a = ev.target.closest('[data-a]') && ev.target.closest('[data-a]').dataset.a;
      if (a === 'y') { arenaUi.open = false; arenaUi.confirm = false; arenaStop('aufgeben'); return; }
      if (a === 'x') { arenaUi.confirm = !arenaUi.confirm || !arenaUi.open; arenaUi.open = arenaUi.confirm; }
      else { arenaUi.open = !arenaUi.open; arenaUi.confirm = false; }
      arenaUi.key = '';
      arenaHud();
    });
  } else {
    // PC (seit 13.92): eine Karte wie in der Turnierarena – Kopf mit Welle, Balken der besiegten Monster, Leben als
    // Herzen, Gold, nächster Schub bzw. Pause mit Fortschritt; der Inhalt wird in arenaHud geschrieben
    arenaPcCss();
    el.className = 'ar-pc';
    el.style.cssText = 'position:fixed;left:8px;top:90px;z-index:5;pointer-events:none';
    el.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-a="x"]')) arenaStop('aufgeben');
    });
  }
  el.hidden = true;
  document.body.appendChild(el);
  // neu setzen nur bei Größenänderung (Drehen, Fenster, Lebensanzeige, Buffs, Boss- oder Zielleiste erscheint),
  // nicht in jedem Bild
  const due = () => {
    arenaUi.placeDue = true;
    // auch wenn das Spiel gerade steht (Hochformat am Handy): gleich neu setzen
    if (arenaUi.el && !arenaUi.el.hidden) arenaHudPlace(arenaUi.el);
  };
  window.addEventListener('resize', due);
  window.addEventListener('orientationchange', due);
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(due);
    for (const id of ['hudChar', 'buffList', 'partyFrame', 'bossBar', 'targetFrame', 'chatBox']) {
      const e = document.getElementById(id);
      if (e) ro.observe(e);
    }
  }
  arenaUi.el = el;
}
function arenaHud() {
  const run = game.arenaRun;
  if (!arenaUi.el) arenaHudBuild();
  const el = arenaUi.el;
  if (!run || run.slot < 0 || !game.running) {
    if (!el.hidden) {
      el.hidden = true;
      arenaUi.open = false;
      arenaUi.confirm = false;
    }
    return;
  }
  const t = arenaUi.touch;
  // übrig: die lebenden und die noch kommenden (Verstärkung der Bosse zählt mit, sobald sie da ist)
  const rest = (run.left || 0) + Math.max(0, (run.n || 0) - (run.spawned || 0));
  if (!t) {
    arenaHudPc(el, run, rest);
    if (el.hidden) {
      el.hidden = false;
      arenaUi.placeDue = true;
    }
    if (arenaUi.placeDue) arenaHudPlace(el);
    return;
  }
  const pause = Math.max(0, Math.ceil(run.until - game.time));
  const left = run.phase === 'pause' ? (t ? `Pause ${pause} s` : `Nächste Welle in ${pause} s`) : run.phase === 'fight' ? (t ? `${rest} Mon.` : `Noch ${rest} Monster`) : run.waitFor ? 'Warte auf Mitspieler' : (t ? '…' : 'Gleich geht es los');
  const next = run.phase === 'fight' && run.nextBatch > game.time ? `Nächster Schub in ${Math.ceil(run.nextBatch - game.time)} s` : run.phase === 'pause' && t ? `Nächste Welle in ${pause} s` : '';
  const w = t ? `W${Math.max(1, run.wave)}` : `Welle ${Math.max(1, run.wave)}`;
  const hearts = `${'♥'.repeat(run.lives)}${'♡'.repeat(Math.max(0, ARENA.lives - run.lives))}`;
  const h = t ? hearts : `${hearts} ${run.lives}/${ARENA.lives}`;
  const g = t ? `${arenaFmt(run.gold)} G` : `${arenaFmt(run.gold)} Gold gesammelt`;
  const key = w + '|' + left + '|' + next + '|' + h + '|' + g + '|' + arenaUi.open + arenaUi.confirm;
  if (key !== arenaUi.key) {
    const sizeKey = arenaUi.open + '|' + arenaUi.confirm;
    if (arenaUi.sizeKey !== sizeKey) { arenaUi.sizeKey = sizeKey; arenaUi.placeDue = true; }
    arenaUi.key = key;
    el.querySelector('[data-a="w"]').textContent = w;
    el.querySelector('[data-a="l"]').textContent = left;
    el.querySelector('[data-a="h"]').textContent = h;
    el.querySelector('[data-a="g"]').textContent = g;
    const s = el.querySelector('[data-a="s"]');
    s.textContent = next;
    s.hidden = !next;
    if (t) {
      el.querySelector('[data-a="d"]').style.display = arenaUi.open ? 'flex' : 'none';
      el.querySelector('[data-a="q"]').textContent = arenaUi.confirm ? `Lauf beenden und ${arenaFmt(run.gold)} Gold auszahlen?` : '';
      el.querySelector('[data-a="y"]').textContent = arenaUi.confirm ? 'Ja, aufgeben' : 'Aufgeben';
    }
  }
  if (el.hidden) {
    el.hidden = false;
    arenaUi.placeDue = true;
  }
  if (arenaUi.placeDue) arenaHudPlace(el);
}

// PC-Karte der Prüfungsarena (seit 13.92)
function arenaPcCss() {
  if (document.getElementById('arenaPcCss')) return;
  const st = document.createElement('style');
  st.id = 'arenaPcCss';
  st.textContent =
    '#arenaHud.ar-pc{width:290px;border-radius:12px;overflow:hidden;color:#ffe9c2;text-shadow:0 1px 2px #000;font:600 12.5px/1.3 system-ui,sans-serif;' +
    'background:linear-gradient(180deg,rgba(58,34,16,.93),rgba(24,14,6,.9));border:1px solid rgba(255,200,106,.55);box-shadow:0 4px 16px rgba(0,0,0,.5)}' +
    '#arenaHud .hd{display:flex;align-items:center;justify-content:space-between;padding:6px 11px;background:rgba(255,200,106,.12);border-bottom:1px solid rgba(255,200,106,.3)}' +
    '#arenaHud .hd b{color:#ffc86a;font-size:13px}#arenaHud .hd .wv{font:900 16px/1 system-ui,sans-serif;color:#fff}' +
    '#arenaHud .bd{display:grid;gap:6px;padding:7px 11px 9px}' +
    '#arenaHud .row{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
    '#arenaHud .bar{height:9px;border-radius:5px;background:rgba(255,255,255,.14);overflow:hidden}#arenaHud .bar i{display:block;height:100%;transition:width .3s}' +
    '#arenaHud .hearts{color:#ff5a4a;font-size:15px;letter-spacing:2px}#arenaHud .gold{color:#ffd96a;font-weight:800}' +
    '#arenaHud .nx{padding:5px 8px;border-radius:8px;background:rgba(255,200,90,.1);border:1px solid rgba(255,200,90,.3);color:#ffe0a0;text-align:center}' +
    '#arenaHud .nx .bar{height:5px;margin-top:4px}#arenaHud .nx b{font-size:15px}' +
    '#arenaHud button{pointer-events:auto;cursor:pointer;font:700 12px system-ui,sans-serif;color:#fff;background:rgba(122,42,26,.85);border:1px solid #c86a4a;border-radius:8px;padding:4px 12px}' +
    '#arenaHud button:hover{background:#9a3a26}#arenaHud small{opacity:.8;font-weight:600}';
  document.head.appendChild(st);
}
function arenaHudPc(el, run, rest) {
  const now = game.time;
  const wave = Math.max(1, run.wave);
  const n = Math.max(1, run.n || 0);
  const done = run.phase === 'fight' ? Math.max(0, Math.min(1, 1 - rest / n)) : run.phase === 'pause' && run.cleared ? 1 : 0;
  const W = typeof arenaWave === 'function' ? arenaWave(run.level, wave) : null;
  let nx = '';
  if (run.phase === 'pause') {
    const left = Math.max(0, run.until - now);
    nx = `<div class="nx">${run.cleared ? 'Nächste Welle' : 'Welle 1'} in <b>${Math.ceil(left)}</b> s<div class="bar"><i style="width:${Math.round(Math.max(0, 1 - left / (run.pauseLen || ARENA.pause)) * 100)}%;background:#ffc85a"></i></div></div>`;
  } else if (run.phase === 'fight' && run.nextBatch > now) {
    nx = `<div class="nx">Nächster Schub in <b>${Math.ceil(run.nextBatch - now)}</b> s</div>`;
  } else if (run.phase !== 'fight') nx = run.waitFor ? '<div class="nx">Warte auf dein Gruppenmitglied …</div>' : '<div class="nx">Gleich geht es los …</div>';
  const kind = W && W.boss ? '<small>Wellenmeister</small>' : W && W.elites ? '<small>mit Elite</small>' : '';
  const hearts = `${'♥'.repeat(run.lives)}${'♡'.repeat(Math.max(0, ARENA.lives - run.lives))}`;
  const mate = run.mates && run.mates[0];
  const key = [wave, rest, run.phase, Math.ceil((run.until || 0) - now), Math.ceil((run.nextBatch || 0) - now), run.lives, run.gold, mate, run.waitFor].join('|');
  if (key === arenaUi.key) return;
  arenaUi.key = key;
  el.innerHTML = `<div class="hd"><b>Prüfungsarena${mate ? ' <small>zu zweit</small>' : ''}</b><span class="wv">Welle ${wave}</span></div>` +
    `<div class="bd"><div class="row"><span>${run.phase === 'fight' ? `Noch <b>${rest}</b> von ${n} Monstern` : run.phase === 'pause' && run.cleared ? `Welle ${run.cleared} geschafft!` : 'Bereit machen'}</span>${kind}</div>` +
    `<div class="bar"><i style="width:${Math.round(done * 100)}%;background:linear-gradient(90deg,#c8642a,#ffc86a)"></i></div>` +
    `${nx}<div class="row"><span class="hearts" title="Leben in diesem Lauf">${hearts}</span><span class="gold">${arenaFmt(run.gold)} Gold</span></div>` +
    `<div class="row"><small>Bestwelle ${arenaFmt((arenaSave().best) || 0)}</small><button type="button" data-a="x">Aufgeben</button></div></div>`;
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
  // seit 14.32 zu zweit: ein Gruppenmitglied im Kanal mitnehmen (es bekommt eine Einladung)
  const mates = arenaMates();
  const off = low || game.arenaRun ? 'disabled' : '';
  body.innerHTML =
    `<p class="quest-step">Herausforderung · allein oder zu zweit · ab Stufe ${ARENA.minLevel}</p>` +
    `<p>„Willkommen in der Prüfungsarena! Dort kämpfst du allein oder mit einem Gruppenmitglied gegen Welle um Welle. Jede Welle ist stärker als die davor – erst viele Monster, dann Elite, und jede fünfte Welle ein Wellenmeister. Für jede Welle, die du schaffst, zahle ich dir Gold.“</p>` +
    `<p><strong>Gold je geschaffter Welle:</strong></p><ul class="reward-list">${rows}</ul>` +
    `<p>Bis Welle 10 zusammen: ${arenaFmt(arenaGoldSum(10, L))} Gold</p>` +
    `<p class="hint-text">Die Monster kommen in Schüben nach der Uhr, nicht erst, wenn eines fällt. Sie geben volle Erfahrung und ihr normales Gold, aber keine Gegenstände, Steine, Tränke oder Material.</p>` +
    `<p class="hint-text">Du hast ${ARENA.lives} Leben. Nach einem Tod startest du in der Arena neu; beim dritten Tod ist der Lauf vorbei und das gesammelte Gold verloren. Das Wellengold wird ausgezahlt, wenn du die Arena verlässt oder aufgibst.</p>` +
    `<p class="hint-text">Zu zweit: höchstens zwei Spieler je Halle, beide aus derselben Gruppe. Es kommen ${String(ARENA.duo.n).replace('.', ',')}-mal so viele Monster mit ${Math.round((ARENA.duo.hp - 1) * 100)} % mehr Leben und ${Math.round((ARENA.duo.atk - 1) * 100)} % mehr Schaden. Wellengold, Erfahrung und Gold der Monster bekommt jeder so viel wie allein.</p>` +
    (party && !mates.length ? '<p class="hint-text">Für zu zweit muss ein Gruppenmitglied im selben Kanal sein.</p>' : '') +
    `<p>Deine Bestwelle: <b>${A.best || 0}</b></p>` +
    `<p>Läufe: ${A.runs || 0} · Gold aus der Arena: ${arenaFmt(A.gold || 0)}</p>` +
    `<button type="button" class="btn btn-primary" data-arena="go" ${off}>${low ? `Ab Stufe ${ARENA.minLevel}` : mates.length ? 'Allein betreten' : 'Arena betreten'}</button>` +
    mates.slice(0, 7).map((n, i) => ` <button type="button" class="btn" data-arena="duo" data-i="${i}" ${off}>Zu zweit mit <b class="no-tr">${escapeHtml(n)}</b></button>`).join('');
  for (const b of body.querySelectorAll('[data-arena]')) b.addEventListener('click', () => arenaEnter(b.dataset.arena === 'duo' ? mates[+b.dataset.i] : null));
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
NPC_LINES.arena = ['Allein oder zu zweit in die Arena – und mit vollen Taschen zurück.'];

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
