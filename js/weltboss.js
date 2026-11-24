// Weltbosse (seit 15.75, docs/endgame-langzeit.md): Alle WB.every erscheint auf einer der Lv-80-Karten ein Weltboss
// (Reihenfolge WB.maps, Arten in daten/weltbosse.js). Der Zeitplan hängt nur an der Uhrzeit, so kennt ihn jedes Gerät
// ohne Netz: WB.warn vorher kommt eine Ansage, dann steht der Boss WB.dur lang auf seiner Karte. Erzeugt wird er nur
// vom Host des Kanals (allein: vom eigenen Spiel); die Mitspieler bekommen ihn wie jedes Monster über den Zustand.
// Jeder, der mitgekämpft hat, bekommt genau ein Ausrüstungsteil (mit Glück legendär), Ätherkerne, Splitter, Gold und
// Seelen-Erfahrung. Leben nach Spielerzahl auf der Karte beim Erscheinen (WB.hpPerPlayer ab dem vierten).

const WB = {
  every: 3 * 3600e3, offset: 30 * 60e3, dur: 15 * 60e3, warn: 5 * 60e3,
  maps: [10, 17, 18, 19],
  types: { 10: 'wb_kristall', 17: 'wb_hain', 18: 'wb_riff', 19: 'wb_sonne' },
  minLevel: 75, hpPerPlayer: 0.25, legendary: 0.25, ep: 0.6
};
// 2D-Bild: das ihres Vorbilds (die Lv-80-Karten legen ihre Bilder erst nach figuren.js an, karte80.js/karte82.js)
if (typeof MONSTER_ART !== 'undefined') for (const id of Object.values(WB.types)) {
  const t = MONSTER_TYPES[id];
  if (t && !MONSTER_ART[id] && MONSTER_ART[t.look]) MONSTER_ART[id] = MONSTER_ART[t.look];
}
const wbState = { spawnedEvent: -1, doneEvent: -1, said: {} };
// besiegte Weltbosse im Spielstand (spieler.js speichert nur SAVE_FIELDS)
if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('wbKills')) SAVE_FIELDS.push('wbKills');
// besiegtes Ereignis auf dem Gerät merken (nach einem Neuladen ruft ein Host den Boss nicht noch einmal)
try { wbState.doneEvent = Number(localStorage.getItem('seelenstein.weltboss') || -1); } catch (e) { /* privat */ }
function wbMarkDone(i) {
  wbState.doneEvent = i;
  try { localStorage.setItem('seelenstein.weltboss', String(i)); } catch (e) { /* privat */ }
}

// Ereignis zu einem Zeitpunkt: Nummer, Anfang, Ende, Karte, Art
function wbEvent(now = Date.now()) {
  const i = Math.floor((now - WB.offset) / WB.every);
  const start = i * WB.every + WB.offset;
  const map = WB.maps[((i % WB.maps.length) + WB.maps.length) % WB.maps.length];
  return { i, start, end: start + WB.dur, map, type: WB.types[map] };
}
// laufendes oder nächstes Ereignis
function wbNext(now = Date.now()) {
  const e = wbEvent(now);
  return now < e.end ? e : wbEvent(e.start + WB.every);
}
// fester Platz auf der Karte: im ersten Jagdgebiet, auf halbem Weg durch den Ring, in eine feste Richtung je Karte
function wbSpot(map) {
  const wm = WORLD_MAPS.find((m) => m.id === map);
  const z = ZONES.find((x) => x.map === map && x.groups && x.groups.length && !x.safe && !x.dungeon);
  if (!wm || !z) return null;
  const r = (Math.max(z.minDist, (wm.camp || 8) + 8) + Math.min(z.maxDist, wm.reach || z.maxDist)) / 2;
  const a = 0.7 + map * 1.3;
  const pad = 6;
  const x = Math.max(wm.region[0] + pad, Math.min(wm.region[0] + wm.region[2] - pad, wm.cx + Math.cos(a) * r));
  const y = Math.max(wm.region[1] + pad, Math.min(wm.region[1] + wm.region[3] - pad, wm.cy + Math.sin(a) * r));
  return { x: x * TILE, y: y * TILE, zone: z };
}
const wbMapName = (map) => (WORLD_MAPS.find((m) => m.id === map) || {}).name || '';
const wbAlive = (type) => game.monsters.find((m) => m.typeId === type && !m.dead) || null;

// Spieler auf der Karte des Bosses (für sein Leben)
function wbPlayersOn(map) {
  let n = 0;
  const p = game.player;
  const on = (x, y) => {
    const wm = mapOfTile(x / TILE, y / TILE);
    return wm && wm.id === map;
  };
  if (p && on(p.x, p.y)) n++;
  if (typeof net !== 'undefined' && net.players) for (const rp of net.players.values()) if (rp && on(rp.x, rp.y)) n++;
  return Math.max(1, n);
}

function wbSpawn(e) {
  const at = wbSpot(e.map);
  if (!at || wbAlive(e.type)) return;
  const pos = spotNear(at, 3 * TILE);
  const m = createMonster(e.type, pos.x, pos.y, { respawn: false, zone: at.zone });
  const n = wbPlayersOn(e.map);
  const k = 1 + Math.max(0, n - 3) * WB.hpPerPlayer;
  m.maxHp = m.hp = Math.round(m.maxHp * k);
  m.bossCd = 4;
  m.summoned = 0;
  m.wbEvent = e.i;
  game.monsters.push(m);
  wbState.spawnedEvent = e.i;
}

// jede Sekunde: Ansagen, Erscheinen und Verschwinden
function wbTick() {
  const p = game.player;
  if (!p || !game.running || !game.world) return;
  const now = Date.now();
  const e = wbEvent(now);
  const next = wbNext(now);
  const name = MONSTER_TYPES[next.type].name;
  const where = wbMapName(next.map);
  const show = p.level >= WB.minLevel;
  const say = (key, title, text) => {
    if (wbState.said[key] || !show) return;
    wbState.said[key] = 1;
    ui.banner(title, text);
    ui.log(`${title} · ${text}`, 'level');
  };
  // Ansagen fünf und eine Minute vorher und beim Erscheinen
  const left = next.start - now;
  // (Texte in Teilen mit „ · “, damit sprache.js Name und Karte einzeln übersetzt)
  if (left > 0 && left <= WB.warn) say(next.i + 'w5', 'Weltboss in ' + Math.ceil(left / 60000) + ' Min.', `${name} · ${where}`);
  if (left > 0 && left <= 60e3) say(next.i + 'w1', 'Weltboss in 1 Min.', `${name} · ${where}`);
  if (now >= e.start && now < e.end && wbState.doneEvent !== e.i) say(e.i + 'go', 'Weltboss erschienen!', `${MONSTER_TYPES[e.type].name} · ${wbMapName(e.map)}`);
  // Erscheinen (nur Host oder allein), einmal je Ereignis
  const host = typeof net === 'undefined' || net.mode === 'off' || net.mode === 'host';
  if (host && now >= e.start && now < e.end - 30e3 && wbState.spawnedEvent !== e.i && wbState.doneEvent !== e.i) wbSpawn(e);
  // Ende der Zeit: der Boss zieht sich zurück (auch ein besiegter verschwindet dann aus der Liste)
  if (host && now >= e.end) {
    for (let k = game.monsters.length - 1; k >= 0; k--) {
      const m = game.monsters[k];
      if (!(m.type && m.type.weltboss && m.wbEvent != null && m.wbEvent <= e.i)) continue;
      if (!m.dead && show) ui.log(`Weltboss zieht sich zurück · ${m.name}`, 'info');
      game.monsters.splice(k, 1);
    }
  }
  // alte Ansagen vergessen
  if (Object.keys(wbState.said).length > 12) wbState.said = {};
}
setInterval(wbTick, 1000);

// --- Beute: für jeden, der mitgekämpft hat (aus rewardKill) ----------------------------------------------------------
function weltbossLoot(m) {
  const p = game.player;
  wbMarkDone(m.wbEvent != null ? m.wbEvent : wbEvent().i);
  // genau ein Ausrüstungsteil für die eigene Klasse (Stufe 80): mit Glück legendär, sonst episch
  // (bei voller Tasche geht nur dieses eine Teil verloren, kein episches als Ersatz)
  const leg = typeof pechLeg === 'function' ? pechLeg('weltboss', WB.legendary) : Math.random() < WB.legendary; // seit 15.76 mit Pech-Schutz
  if (leg) dropLegendary(m);
  else giveRarityItem(rollRarityItem(80, 3, null, Math.random() < 0.35 ? 'waffe' : null), m);
  const kerne = randInt(2, 3);
  p.materials.aetherkern = (p.materials.aetherkern || 0) + kerne;
  ui.loot('Ätherkern', kerne, materialIconUrl('aetherkern'), MATERIAL_COLORS.aetherkern);
  giveSplinters(randInt(25, 35));
  if (m.type.boss.mat && MOB_MATS[m.type.boss.mat]) addMobMat(m.type.boss.mat, dropCount(randInt(4, 6)), m);
  const gold = monsterGold(m.level * 2500);
  p.gold += gold;
  ui.loot('Gold', gold, lootIconUrl('gold'), '#ffd96a');
  gainXp(Math.round(xpToNext(MAX_LEVEL) * WB.ep));
  ui.banner('Weltboss besiegt!', `${m.name} · ${leg ? 'Ein legendäres Teil!' : 'Ein episches Teil!'}`);
  flashScreen(leg ? '#ffb21a' : '#ffd34d', 0.45);
  if (typeof aufgAdd === 'function') aufgAdd('weltboss');
  p.wbKills = (p.wbKills | 0) + 1;
  saveGame();
}
const _wbBossLoot = bossLoot;
bossLoot = function (m) {
  if (m && m.type && m.type.weltboss) return weltbossLoot(m);
  return _wbBossLoot(m);
};
// Wer den Tod eines Weltbosses mitbekommt (auch ohne Beute), merkt sich das Ereignis: ein neuer Host ruft ihn nicht nochmal
if (typeof netClientKill === 'function') {
  const _wbClientKill = netClientKill;
  netClientKill = function (m, who) {
    if (m && m.type && m.type.weltboss) wbMarkDone(m.wbEvent != null ? m.wbEvent : wbEvent().i);
    return _wbClientKill(m, who);
  };
}

// --- Anzeige: Zeile in der Auftragsliste und goldener Pfeil --------------------------------------------------------
function wbTrackRows() {
  const p = game.player;
  if (!p || p.level < WB.minLevel) return [];
  const now = Date.now();
  const e = wbEvent(now);
  if (now >= e.start && now < e.end && wbState.doneEvent !== e.i) {
    const t = MONSTER_TYPES[e.type];
    return [{ key: 'weltboss', title: 'Weltboss · ' + t.name, goal: `Jetzt! Noch ${Math.ceil((e.end - now) / 60000)} Min.`, have: 0, need: 1, where: wbMapName(e.map), giver: '' }];
  }
  // das nächste Ereignis (das laufende ist schon besiegt oder vorbei)
  const n = wbEvent(e.start + WB.every);
  const left = n.start - now;
  if (left > 15 * 60e3) return [];
  return [{ key: 'weltboss', title: 'Weltboss · ' + MONSTER_TYPES[n.type].name, goal: `erscheint in ${Math.ceil(left / 60000)} Min.`, have: 0, need: 1, where: wbMapName(n.map), giver: '' }];
}
function wbGuideEntry() {
  const p = game.player;
  if (!p || p.level < WB.minLevel) return null;
  const now = Date.now();
  const e = wbNext(now);
  if (e.start - now > 15 * 60e3 || wbState.doneEvent === e.i) return null;
  const at = wbSpot(e.map);
  if (!at) return null;
  return { key: 'weltboss', kind: 'main', title: 'Weltboss', monster: e.type, at: { x: at.x, y: at.y, name: MONSTER_TYPES[e.type].name, mapName: wbMapName(e.map) } };
}
if (typeof guideEntries === 'function') {
  const _wbGuideEntries = guideEntries;
  guideEntries = function () {
    const out = _wbGuideEntries();
    const e = wbGuideEntry();
    if (e) out.push(e);
    return out;
  };
}
// Auftragsliste neu zeichnen, wenn sich die Minuten ändern
let wbTrackMin = -1;
setInterval(() => {
  const p = game.player;
  if (!p || !game.running || p.level < WB.minLevel || typeof ui === 'undefined' || !ui.renderQuestTrack) return;
  const now = Date.now();
  const e = wbNext(now);
  const key = Math.floor(now / 60000) + (wbState.doneEvent === e.i ? 'x' : '');
  if (key !== wbTrackMin && e.start - now <= 15 * 60e3) {
    wbTrackMin = key;
    ui.renderQuestTrack();
  }
}, 5000);
