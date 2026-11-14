// Licht und Schatten (seit 14.54, Konzept, Karten und Regeln in docs/fraktionen.md).
// Jeder Charakter gehört zu einer von zwei Seiten (p.faction 'licht' | 'schatten', SAVE_FIELDS). Bis Stufe 49 spielen
// die Seiten auf getrennten Karten (Licht: Maps 1, 4, 5, 6, 2, 7 · Schatten: Maps 11–16, WORLD_MAPS.side) und können
// sich dort nicht treffen. Ab Stufe 50 teilen sie sich die Karten ohne side (Totenmoor, Donnerklamm, Feuerberg,
// Kristallabgrund) – dort herrscht außerhalb der sicheren Städte offener Kampf zwischen den Seiten.
// Hier steht alles, was die Seiten im Spiel ausmacht:
//   - Wahl bei der Charaktererstellung (Feld „Seite“ mit Wappen) und einmal beim Einloggen für Charaktere ohne Seite
//   - Reisen: Weltentor und Wegweiser zeigen nur die eigenen und die gemeinsamen Karten; wer auf einer Karte der anderen
//     Seite steht (alter Spielstand, Einladung, Riss), kommt in die eigene Stadt seiner Stufe; Wiederbeleben und
//     Dungeon-Ausgänge je Seite (entry2 in daten/zonen.js)
//   - offener Kampf auf den gemeinsamen Karten: Spieler der anderen Seite stehen als Stellvertreter in der Zielliste
//     (wie in der Turnierarena, pvpFoes/pvpHit), Treffer gehen direkt an den Getroffenen ('oh'), der sie mit seinen
//     Werten abrechnet (pvpReceiveHit, PVP_DMG in kampf.js) und den Schaden zurückmeldet ('of')
//   - Gilde nur innerhalb der eigenen Seite; Gruppe, Handel und Gruppenfinder seit 14.71 auch über die Seiten hinweg
//     (Gruppenmitglieder greifen sich im offenen Kampf nicht an), Post nur an Charaktere der eigenen Seite (post.js), Chat bleibt für alle gemeinsam
//   - Netz: kurzes Feld fr ('s' = Schatten) im Spielerzustand; ältere Versionen ohne das Feld gelten als Licht
//   - Namen und Minikarte: die andere Seite rot, die eigene wie bisher; Bestenliste mit Wappen

const FACTIONS = {
  licht: {
    id: 'licht', name: 'Licht', title: 'Seite des Lichts', color: '#ffd36a', dark: '#6a4a0e', glow: '#fff2c0', home: 1,
    text: 'Der Sonnenbund hält Kazehana und die hellen Lande. Grüne Wiesen, alte Wälder, Wüsten und Gipfel – und überall Seelensteine, die gebrochen werden müssen.'
  },
  schatten: {
    id: 'schatten', name: 'Schatten', title: 'Seite des Schattens', color: '#a898ff', dark: '#221a48', glow: '#e0dcff', home: 11,
    text: 'Der Mondbund wacht über Mondfall und die Lande der Dämmerung. Aschewälder, Knochenwüsten, rote Steppen und ewige Winternacht – rau, dunkel und frei.'
  }
};
const FACTION_MEET = 50; // ab dieser Stufe teilen sich die Seiten die Karten (gemeinsame Karten haben minLevel 50)
const factionOf = (p) => (p && p.faction === 'schatten' ? 'schatten' : 'licht');
const myFaction = () => factionOf(typeof game !== 'undefined' ? game.player : null);
const mapAllowedFor = (wm, f) => !wm || !wm.side || wm.side === f;
// Gegner auf der anderen Seite? (Mitspieler aus dem Netz)
const factionFoe = (rp) => !!rp && !!game.player && factionOf(rp) !== myFaction();

// Wappen: Licht eine Sonne mit Strahlen, Schatten ein Sichelmond über einer dunklen Scheibe (eigene Zeichnungen)
function factionCrest(f, size = 28) {
  const F = FACTIONS[f] || FACTIONS.licht;
  const body = f === 'schatten'
    ? `<path d="M16 3.5a12.5 12.5 0 1 0 0 25a12.5 12.5 0 1 0 0-25z" fill="${F.dark}"/><path d="M19.5 6.5a10 10 0 1 0 0 19a8 8 0 1 1 0-19z" fill="${F.color}"/><path d="M8 24.5c3 1.6 8 1.6 11-.6" stroke="${F.glow}" stroke-width="1.2" fill="none" opacity=".6"/>`
    : `<g fill="${F.color}">${Array.from({ length: 12 }, (_, k) => `<path d="M16 1.5l1.6 5h-3.2z" transform="rotate(${k * 30} 16 16)"/>`).join('')}</g><path d="M16 8a8 8 0 1 0 0 16a8 8 0 1 0 0-16z" fill="${F.dark}"/><path d="M16 9.6a6.4 6.4 0 1 0 0 12.8a6.4 6.4 0 1 0 0-12.8z" fill="${F.color}"/>`;
  return `<svg class="fac-crest" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">${body}</svg>`;
}

// --- Heimat: Stadt der Seite zur Stufe -----------------------------------------------------------------------
// Bis Stufe 49 die Stadt der eigenen Karte dieser Stufe, ab 50 die erste Stadt der Seite (Kazehana bzw. Mondfall)
const FACTION_HOME_MAPS = { licht: [[40, 7], [30, 6], [20, 5], [10, 4], [0, 1]], schatten: [[40, 15], [30, 14], [20, 13], [10, 12], [0, 11]] };
function factionHomeMap(f, level) {
  if ((level || 1) >= FACTION_MEET) return FACTIONS[f].home;
  for (const [from, id] of FACTION_HOME_MAPS[f]) if ((level || 1) >= from) return id;
  return FACTIONS[f].home;
}
function mapSpawnSpot(id) {
  if (id === 1) return { x: CENTER_X * TILE, y: (CENTER_Y + 1) * TILE };
  const mp = game.world && game.world.maps ? game.world.maps.find((m) => m.id === id) : null;
  return mp ? { ...mp.spawn } : { x: CENTER_X * TILE, y: (CENTER_Y + 1) * TILE };
}
// Map des Dungeon-Eingangs für eine Seite (seit 14.96: Quests, Wegweiser und Fundorte zeigen den eigenen Eingang)
function dungeonMapFor(def, f = myFaction()) {
  if (!def || !def.entry) return 1;
  return def.entry2 && f === 'schatten' ? def.entry2.map : (def.entry.map || 1);
}
// Kann die Seite dieses Gebiet erreichen? (Map der eigenen Seite oder gemeinsam; Dungeons über ihren Eingang)
function zoneReachable(z, f = myFaction()) {
  if (!z) return false;
  const id = z.dungeon ? dungeonMapFor(z.dungeon, f) : z.map;
  if (z.dungeon && !z.dungeon.entry) return true; // Höllenthron u. Ä.: eigener Zugang
  return mapAllowedFor(WORLD_MAPS.find((m) => m.id === id), f);
}
// Fundorte für die eigene Seite zuerst (erreichbare vorn, die anderen nur, wenn es keine gibt)
function zonesForMe(zs, f = myFaction()) {
  const ok = zs.filter((z) => zoneReachable(z, f));
  return ok.length ? ok : zs;
}
// Ausgang eines Dungeons für die eigene Seite (zweiter Eingang auf den Schattenkarten)
function dungeonEntranceFor(dg, p = game.player) {
  return dg.entrance2 && factionOf(p) === 'schatten' ? dg.entrance2 : dg.entrance;
}

// --- Wahl bei der Erstellung ------------------------------------------------------------------------------------
const factionUi = { pick: null };
function factionPicked() {
  return factionUi.pick;
}
function factionCardsHtml(sel) {
  return Object.values(FACTIONS).map((F) => `<button type="button" class="fac-card fac-${F.id}${sel === F.id ? ' on' : ''}" data-faction="${F.id}" aria-pressed="${sel === F.id}">` +
    `${factionCrest(F.id, 44)}<span class="fac-txt"><b>${F.title}</b><small>${F.text}</small></span></button>`).join('');
}
function renderFactionPick() {
  const box = document.getElementById('factionPick');
  if (!box) return;
  box.innerHTML = factionCardsHtml(factionUi.pick) +
    '<p class="fac-note">Bis Stufe 49 spielen beide Seiten auf eigenen Karten. Ab Stufe 50 treffen sie sich – außerhalb der Städte herrscht dort offener Kampf.</p>';
  box.querySelectorAll('[data-faction]').forEach((b) => b.addEventListener('click', () => {
    factionUi.pick = b.dataset.faction;
    renderFactionPick();
  }));
}
renderFactionPick();

// --- Einmalige Wahl für Charaktere ohne Seite (beim nächsten Start) --------------------------------------------
function factionChoose(f) {
  const p = game.player;
  if (!p || !FACTIONS[f]) return;
  p.faction = f;
  const hc = document.getElementById('hudClass');
  if (hc && !hc.querySelector('.fac-crest')) hc.insertAdjacentHTML('afterbegin', `<span class="rk-fac" title="${FACTIONS[f].title}">${factionCrest(f, 13)}</span>`);
  const here = mapOfTile(p.x / TILE, p.y / TILE);
  // Schatten unter Stufe 50: in die Schattenstadt der eigenen Stufe; sonst nur, wenn man auf einer Karte der anderen
  // Seite steht (dann in die eigene Stadt)
  if ((f === 'schatten' && p.level < FACTION_MEET) || (here && !mapAllowedFor(here, f))) factionGoHome(true);
  // Name für die Post mit der neuen Seite anmelden (post.js)
  if (typeof postRegister === 'function' && typeof handelOn === 'function' && handelOn()) postRegister(p);
  saveGame();
  if (typeof ui !== 'undefined' && ui.renderQuestTrack) ui.renderQuestTrack();
  ui.banner(FACTIONS[f].title, f === 'schatten' ? 'Willkommen in den Landen der Dämmerung' : 'Willkommen im Licht');
  ui.log(`Du gehörst jetzt zur ${FACTIONS[f].title}.`, 'level');
}
function showFactionChoice() {
  if (typeof ssDialog !== 'function') return;
  let sel = null;
  const render = () => {
    const box = ssDialog('<h3 class="fac-head">Wähle deine Seite</h3>' +
      '<p>Die Welt hat sich geteilt. Wähle einmal, wohin du gehörst – das gilt für diesen Charakter für immer. Deine Stufe, Ausrüstung und Aufträge bleiben.</p>' +
      `<div class="fac-pick">${factionCardsHtml(sel)}</div>` +
      '<p class="fac-note">Wer unter Stufe 50 den Schatten wählt, reist in die Schattenstadt seiner Stufe. Ab Stufe 50 treffen sich beide Seiten auf denselben Karten – außerhalb der Städte herrscht offener Kampf.</p>' +
      `<button type="button" class="btn btn-primary" id="facOk" ${sel ? '' : 'disabled'}>${sel ? FACTIONS[sel].title + ' wählen' : 'Seite antippen'}</button>`, 'fac-dlg');
    const wrap = document.getElementById('ssDialog');
    if (wrap) wrap.dataset.busy = '1'; // nicht wegtippen: erst wählen
    wrap.querySelectorAll('[data-faction]').forEach((b) => b.addEventListener('click', () => { sel = b.dataset.faction; render(); }));
    const ok = document.getElementById('facOk');
    if (ok) ok.addEventListener('click', () => {
      if (!sel) return;
      ssDialogClose();
      factionChoose(sel);
    });
    return box;
  };
  render();
}

// --- Heimkehr und Sperre der fremden Karten -----------------------------------------------------------------------
function factionGoHome(quiet) {
  const p = game.player;
  const f = factionOf(p);
  const id = factionHomeMap(f, p.level);
  const spot = mapSpawnSpot(id);
  if (typeof moveThrough === 'function') moveThrough(spot, FACTIONS[f].color);
  else { p.x = spot.x; p.y = spot.y; }
  const wm = WORLD_MAPS.find((m) => m.id === id);
  if (!quiet && wm) ui.banner(wm.name, wm.levels);
}
// jedes Bild: steht man auf einer Karte der anderen Seite, geht es heim (höchstens alle 0,5 s geprüft)
const factionState = { at: 0, warned: 0 };
function factionLockTick() {
  const p = game.player;
  if (game.time < factionState.at) factionState.at = -9;
  if (!p || !game.world || p.dead || game.time - factionState.at < 0.5) return;
  factionState.at = game.time;
  if (!p.faction) return;
  const wm = mapOfTile(p.x / TILE, p.y / TILE);
  if (!wm || mapAllowedFor(wm, p.faction)) return;
  const other = FACTIONS[wm.side];
  ui.log(`${wm.name} gehört zur ${other ? other.title : 'anderen Seite'}. Du kehrst in deine eigene Stadt zurück.`, 'warn');
  factionGoHome(false);
}

// --- Spielstart: Wahl zeigen, falsche Karte verlassen -------------------------------------------------------------
if (typeof ui !== 'undefined' && ui.enterGame) {
  const _facEnter = ui.enterGame;
  ui.enterGame = function () {
    const r = _facEnter.apply(this, arguments);
    const p = game.player;
    if (p && typeof WAECHTER !== 'undefined' && WAECHTER) return r;
    // Wappen der Seite vor der Klasse oben links
    const hc = document.getElementById('hudClass');
    if (hc && p && p.faction && !hc.querySelector('.fac-crest')) hc.insertAdjacentHTML('afterbegin', `<span class="rk-fac" title="${FACTIONS[p.faction].title}">${factionCrest(p.faction, 13)}</span>`);
    if (p && !p.faction) setTimeout(() => { if (game.player === p && !p.faction) showFactionChoice(); }, 600);
    else if (p) {
      // neue Figur oder Spielstand auf einer Karte der anderen Seite: sofort in die eigene Stadt
      const wm = mapOfTile(p.x / TILE, p.y / TILE);
      if (wm && !mapAllowedFor(wm, p.faction)) {
        const spot = mapSpawnSpot(factionHomeMap(p.faction, p.level));
        p.x = spot.x;
        p.y = spot.y;
      }
    }
    return r;
  };
}

// Wiederbeleben: in der Stadt der Karte, in der man ist – nie in einer Stadt der anderen Seite (Dungeon mit zweitem
// Eingang: dessen Karte; sonst die Heimat der eigenen Stufe)
if (typeof villageSpawn === 'function') {
  const _facSpawn = villageSpawn;
  villageSpawn = function (p) {
    const spot = _facSpawn(p);
    const pl = p || (typeof game !== 'undefined' ? game.player : null);
    if (!pl || !pl.faction || !game.world || !game.world.maps) return spot;
    const wm = mapOfTile(spot.x / TILE, spot.y / TILE);
    if (!wm || mapAllowedFor(wm, pl.faction)) return spot;
    if (p && p.x != null) {
      const z = zoneAt(p.x, p.y);
      const e2 = z && z.dungeon && z.dungeon.entry2;
      if (e2 && pl.faction === 'schatten') return mapSpawnSpot(e2.map);
    }
    return mapSpawnSpot(factionHomeMap(pl.faction, pl.level));
  };
}
// Dungeon verlassen: am Eingang der eigenen Seite herauskommen
if (typeof leaveDungeon === 'function') {
  leaveDungeon = function (k) {
    moveThrough(dungeonEntranceFor(game.world.dungeons[k]), '#9fd0ff');
  };
}

// --- Reisen: Weltentor und Wegweiser -------------------------------------------------------------------------------
if (typeof ui !== 'undefined' && ui.renderWorldGate) {
  const _facGate = ui.renderWorldGate;
  ui.renderWorldGate = function (npc) {
    // WORLD_MAPS kurz auf die erlaubten Karten beschränken (Reihenfolge und Darstellung bleiben wie bisher)
    const f = myFaction();
    const all = WORLD_MAPS.slice();
    const mine = all.filter((m) => mapAllowedFor(m, f));
    WORLD_MAPS.length = 0;
    WORLD_MAPS.push(...mine);
    try {
      return _facGate.call(this, npc);
    } finally {
      WORLD_MAPS.length = 0;
      WORLD_MAPS.push(...all);
      const body = document.getElementById('npcBody');
      if (body && !body.querySelector('.fac-gate')) {
        body.insertAdjacentHTML('afterbegin', `<p class="fac-gate">${factionCrest(f, 18)} ${FACTIONS[f].title}: deine Karten bis Stufe 49 und die gemeinsamen Karten ab Stufe ${FACTION_MEET}.</p>`);
      }
    }
  };
}
// Wegweiser: an den Rand der Gebiete der eigenen Seite (Licht wie bisher, Schatten seine Karten 11–15) und der
// gemeinsamen Karten
const factionTravel = { licht: null, schatten: null };
if (typeof travelTargets === 'function') {
  const _facTravel = travelTargets;
  travelTargets = function () {
    const f = myFaction();
    if (f === 'licht') return _facTravel();
    if (factionTravel.schatten && factionTravel.world === game.world) return factionTravel.schatten;
    const ids = ['daemmerwiesen', 'aschewald', 'knochenwueste', 'blutsteppe', 'nachtfrost'];
    const list = ids.map((id) => ZONES.find((z) => z.id === id)).filter(Boolean).map((zone) => ({ zone, ...mapSpawnSpot(zone.map) }));
    for (const t of _facTravel()) if (mapAllowedFor(WORLD_MAPS.find((m) => m.id === t.zone.map), 'schatten')) list.push(t);
    if (typeof travelSort === 'function') travelSort(list);
    factionTravel.schatten = list;
    factionTravel.world = game.world;
    return list;
  };
}

// --- Hauptquests und Endbosse je Seite ----------------------------------------------------------------------------
function mainQuestList() {
  return myFaction() === 'schatten' ? MAIN_QUESTS_SCHATTEN : MAIN_QUESTS;
}
function raidBossList() {
  return myFaction() === 'schatten' ? RAID_BOSSES_SCHATTEN : RAID_BOSSES;
}

// --- Monster-Teile je Seite --------------------------------------------------------------------------------------
// Schattenmonster lassen eigene Teile fallen (Name und Farbe passend zum Monster). Der Schmied verlangt von jeder Seite
// die Teile ihrer eigenen Monster: Teile des Gegenstücks werden beim Aufheben in die eigenen umgerechnet.
const SHADOW_MAT_NAMES = {
  aschehund: 'Aschezahn', daemmerfuchs: 'Dämmerrute', nebelwolf: 'Nebelpelz', nachthirsch: 'Mondgeweih', nachtleitwolf: 'Nachtfell',
  schattenkeiler: 'Schattenhauer', aschenraeuber: 'Aschenabzeichen', russschuetze: 'Rußpfeilspitze', glutkeiler: 'Gluthauer',
  aschespinne: 'Aschenseide', russluchs: 'Rußkralle', kohlenbaer: 'Kohlenkralle', beinbrecher: 'Beinsplitter', aashyaene: 'Aaszahn',
  knochenruferin: 'Gebeinfeder', bleichskorpion: 'Bleichstachel', knochenhauptmann: 'Gebeinbanner', blutoger: 'Bluthorn',
  steppenwarg: 'Steppenpelz', blutdaemon: 'Blutdämonenhorn', blutmaul: 'Blutglut', mitternachtswolf: 'Mitternachtsfell', nachtbaer: 'Nachtpranke',
  dunkelyeti: 'Dunkelfell', nachtmammut: 'Nachtelfenbein', frostgespenst: 'Reifkristall', klippenviper: 'Klippenschuppe',
  klippenschakal: 'Klippenzahn', nachtrassler: 'Nachtrassel', schattenkobra: 'Schattengift', moorpython: 'Moorhaut', nebelpanther: 'Nebelkralle',
  moornaga: 'Moorperle', moorseherin: 'Seherinnensiegel'
};
if (typeof MOB_MATS !== 'undefined') {
  for (const [id, twin] of SHADOW_MOBS) {
    const base = MOB_MATS[twin];
    if (!base) continue;
    MOB_MATS[id] = { name: SHADOW_MAT_NAMES[id] || base.name, art: base.art, color: SHADOW_LOOKS && SHADOW_LOOKS[id] && SHADOW_LOOKS[id].tone ? mixColor(base.color, SHADOW_LOOKS[id].tone[0], 0.55) : base.color };
  }
}
// Teil der eigenen Seite zu einem Teil (Licht ↔ Schatten), sonst unverändert
function matForSide(id, f = myFaction()) {
  if (f === 'schatten') return SHADOW_TWIN_OF[id] && MOB_MATS[SHADOW_TWIN_OF[id]] ? SHADOW_TWIN_OF[id] : id;
  const t = MONSTER_TYPES[id];
  return t && t.side === 'schatten' && t.twin && MOB_MATS[t.twin] ? t.twin : id;
}
if (typeof addMobMat === 'function') {
  const _facAddMat = addMobMat;
  addMobMat = function (id, n, from) {
    return _facAddMat(matForSide(id), n, from);
  };
}
if (typeof upgradeMaterial === 'function') {
  const _facUpMat = upgradeMaterial;
  upgradeMaterial = function (item) {
    const m = _facUpMat(item);
    return m && typeof game !== 'undefined' && game.player ? { ...m, id: matForSide(m.id) } : m;
  };
}

// --- Gilde: nur die eigene Seite (Gruppe und Handel seit 14.71 mit allen) ------------------------------------------------------------------
// seit 14.71: Gruppe, Handel und Gruppenfinder auch über die Seiten hinweg (Wunsch: zusammen in Instanzen, handeln) –
// nur die Gilde bleibt bei der eigenen Seite
const FACTION_INVITES = {};
const FACTION_IGNORE = ['gi'];
if (typeof blockedSocial === 'function') {
  const _facBlocked = blockedSocial;
  blockedSocial = function (pid, d) {
    if (_facBlocked(pid, d)) return true;
    if (!d || typeof net === 'undefined' || !game.player) return false;
    const rp = net.players.get(pid);
    if (!rp || !factionFoe(rp)) return false;
    const inv = FACTION_INVITES[d.k];
    if (inv) {
      netSocial(pid, { k: inv[0], n: game.player.name, why: inv[1] });
      return true;
    }
    return FACTION_IGNORE.includes(d.k);
  };
}
// eigene Anfragen an die andere Seite gar nicht erst schicken (Hinweis statt Wartezeit)
if (typeof netSocial === 'function') {
  const _facSocial = netSocial;
  netSocial = function (pid, d) {
    if (d && d.k === 'gi' && typeof net !== 'undefined') {
      const rp = net.players.get(pid);
      if (rp && factionFoe(rp)) {
        ui.log(`${rp.name} gehört zur ${FACTIONS[factionOf(rp)].title}. Gilden gibt es nur innerhalb der eigenen Seite.`, 'warn');
        return;
      }
    }
    return _facSocial(pid, d);
  };
}

// Gruppenfinder: Einträge der anderen Seite sind zu sehen, aber nicht anzufragen
if (typeof gfJoinBlock === 'function') {
  const _facJoin = gfJoinBlock;
  gfJoinBlock = function (l) {
    const why = _facJoin(l);
    if (why || !l || typeof net === 'undefined') return why;
    // seit 14.71: Gruppen der anderen Seite dürfen angefragt werden
    return null;
  };
}

// --- Netz: Seite im Spielerzustand -------------------------------------------------------------------------------
if (typeof netPlayerState === 'function') {
  const _facState = netPlayerState;
  netPlayerState = function () {
    const s = _facState();
    if (game.player && game.player.faction === 'schatten') s.fr = 's';
    return s;
  };
}
if (typeof netApplyState === 'function') {
  const _facApply = netApplyState;
  netApplyState = function (rp, s) {
    _facApply(rp, s);
    // ältere Versionen ohne fr: Licht
    if (s) rp.faction = s.fr === 's' ? 'schatten' : 'licht';
  };
}

// --- Offener Kampf auf den gemeinsamen Karten ------------------------------------------------------------------
// Erlaubt, wenn beide ab Stufe 50 auf einer gemeinsamen Karte (ohne side) draußen stehen – nicht in Städten und
// Lagern, nicht in Dungeons, Instanzen oder Arenen (die liegen außerhalb aller Karten).
const OPEN_PVP = { minLevel: FACTION_MEET, engaged: 12 };
const openPvp = { proxies: new Map(), foes: [], lastHit: -99 };
function openPvpZone(x, y) {
  const wm = mapOfTile(x / TILE, y / TILE);
  return !!wm && !wm.side && !inVillage(x, y);
}
function openPvpAllowed(p, rp) {
  if (!p || !rp || rp.gone || !factionFoe(rp)) return false;
  // seit 14.71: wer zusammen in einer Gruppe ist, kämpft nicht gegeneinander
  if (typeof inMyParty === 'function' && inMyParty(rp.name)) return false;
  if ((p.level || 1) < OPEN_PVP.minLevel || (rp.level || 1) < OPEN_PVP.minLevel) return false;
  if (game.pvpMatch || game.duel) return false;
  return openPvpZone(p.x, p.y) && openPvpZone(rp.x, rp.y);
}
function openPvpTick() {
  const p = game.player;
  const list = openPvp.foes;
  list.length = 0;
  if (!p || p.dead || typeof net === 'undefined' || !netOnline()) return;
  for (const [pid, rp] of net.players) {
    if (rp.dead || remoteHidden(rp) || !openPvpAllowed(p, rp)) continue;
    let px = openPvp.proxies.get(pid);
    if (!px) {
      px = { id: 'open:' + pid, pvp: true, duelProxy: true, openPvp: true, pid, r: 11, def: 0, isStone: false, type: {}, stun: 0, dead: false };
      openPvp.proxies.set(pid, px);
    }
    Object.assign(px, { name: rp.name, x: rp.x, y: rp.y, hp: rp.hp, maxHp: rp.maxHp, level: rp.level, dead: !!rp.dead, hidden: false, classId: rp.classId });
    list.push(px);
  }
  const t = game.target;
  if (t && t.openPvp && !list.includes(t)) setTarget(null);
}
// Stellvertreter der Gegner zusätzlich in der Zielliste der Turnierarena (die gilt dort, wo es keine offenen Gegner gibt)
if (typeof pvpFoes === 'function') {
  const _facFoes = pvpFoes;
  pvpFoes = function () {
    const a = _facFoes();
    return openPvp.foes.length ? (a.length ? a.concat(openPvp.foes) : openPvp.foes) : a;
  };
}
// gerade im offenen Kampf (Tränke, Heilung, Gift wie im PvP)
if (typeof pvpActive === 'function') {
  const _facActive = pvpActive;
  pvpActive = function () {
    const dt = typeof game !== 'undefined' ? game.time - openPvp.lastHit : -1;
    return _facActive() || (dt >= 0 && dt < OPEN_PVP.engaged);
  };
}
if (typeof pvpHit === 'function') {
  const _facHit = pvpHit;
  pvpHit = function (m, mul, opts) {
    if (!m || !m.openPvp) return _facHit(m, mul, opts);
    const p = game.player;
    const rp = net.players.get(m.pid);
    if (p.dead || m.dead || !openPvpAllowed(p, rp)) return 0;
    const d = pvpOutgoing(mul, opts);
    netSocial(m.pid, { k: 'oh', ...d });
    openPvp.lastHit = game.time;
    vfxImpact(m, !!d.c, opts.vfxColor);
    if (opts.skill) skillHitFx(opts.skill, m, !!d.c, opts.heavy);
    p.lastCombat = game.time;
    if (d.c) shakeScreen(4);
    return Math.round(d.a * pvpDealtRatio(m));
  };
}
function openPvpSocial(pid, d) {
  const p = game.player;
  const rp = net.players.get(pid);
  if (!p || !rp) return;
  if (d.k === 'oh') {
    // getroffen: nur, wenn der offene Kampf hier wirklich gilt (beide draußen auf einer gemeinsamen Karte, ab 50)
    if (p.dead || !openPvpAllowed(p, rp)) return;
    let src = openPvp.proxies.get(pid);
    if (!src) src = { id: 'open:' + pid, pvp: true, duelProxy: true, openPvp: true, pid, x: rp.x, y: rp.y, r: 11, dead: false, level: rp.level, name: rp.name };
    openPvp.lastHit = game.time;
    const wasAlive = !p.dead;
    const dealt = pvpReceiveHit(d, src, (a) => netSocial(pid, { k: 'of', a, p: 1 }));
    netSocial(pid, { k: 'of', a: dealt, r: d.a, c: d.c ? 1 : 0, al: d.al ? 1 : 0, t: dealt ? '' : 'Abgewehrt' });
    if (wasAlive && p.dead) {
      netSocial(pid, { k: 'ok', n: p.name });
      ui.log(`${rp.name} (${FACTIONS[factionOf(rp)].title}) hat dich besiegt.`, 'warn');
    }
  } else if (d.k === 'of') {
    const m = openPvp.proxies.get(pid);
    if (!m) return;
    if (d.p) { if (d.a > 0) addText(m.x, feetY(m) - 50, String(d.a), 'toxin'); return; }
    addText(m.x, feetY(m) - 50, d.a > 0 ? String(d.a) : d.t || 'Abgewehrt', d.a > 0 ? (d.c ? 'crit' : 'dmg') : 'info');
    if (!d.al && d.r > 0) pvpNoteDealt(d.r, d.a);
    if (!d.al && d.a > 0) pvpLifeSteal(d.a);
  } else if (d.k === 'ok') {
    p.pvpKills = (p.pvpKills || 0) + 1;
    ui.banner('Sieg!', `Du hast ${rp.name} von der ${FACTIONS[factionOf(rp)].title} besiegt`);
    ui.log(`Du hast ${rp.name} besiegt.`, 'level');
  }
}
if (typeof onSocial === 'function') {
  const _facOnSocial = onSocial;
  onSocial = function (pid, d) {
    if (d && (d.k === 'oh' || d.k === 'of' || d.k === 'ok')) return openPvpSocial(pid, d);
    return _facOnSocial(pid, d);
  };
}

// --- Namen: die andere Seite rot ----------------------------------------------------------------------------------
if (typeof pvpLabelInfo === 'function') {
  const _facLabel = pvpLabelInfo;
  pvpLabelInfo = function (e) {
    const r = _facLabel(e);
    if (r || !e || !e.remote || !factionFoe(e)) return r;
    return { color: '#ff6a5a', bar: '#e0402a', tier: null };
  };
}

// --- jedes Bild (über raidWatch wie Arena und Turnier) -------------------------------------------------------------
if (typeof raidWatch === 'function') {
  const _facWatch = raidWatch;
  raidWatch = function () {
    _facWatch();
    if (!game.player || !game.running) return;
    factionLockTick();
    openPvpTick();
  };
}
