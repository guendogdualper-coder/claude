// Tages- und Wochenaufträge (seit 15.75, docs/endgame-langzeit.md): Ab Stufe 80 gibt es jeden Tag drei kleine Aufträge (für
// jede Figur und jeden Tag fest aus AUFG_TAG ausgewählt) und jede Woche drei größere (AUFG_WOCHE). Der Fortschritt zählt
// überall, die Belohnung kommt sofort wie bei den Nachtjagden – keine Abgabe. Alle drei eines Tages geben zusätzlich die
// Tagestruhe, alle drei einer Woche (Montag bis Sonntag) die Wochentruhe mit einem Ausrüstungsteil.
// Gespeichert in p.aufg = { tag, d: [{ id, need, n }], woche, w: [{ id, need, n }], tt, wt } (tt/wt: Truhe geholt).

const AUFG = { level: 80 };
// Vorrat der Tagesaufträge; need: [kleinste, größte] Anzahl
const AUFG_TAG = [
  { id: 'mobs', need: [150, 250], text: (n) => `${n} Monster ab Stufe 75 besiegen`, where: 'Lv-80-Karten' },
  { id: 'steine', need: [3, 5], text: (n) => `${n} Seelensteine ab Stufe 75 zerstören`, where: 'Lv-80-Karten' },
  { id: 'elite', need: [20, 30], text: (n) => `${n} Elite-Gegner besiegen`, where: 'Lv-80-Dungeons und Instanzen' },
  { id: 'instanz', need: [1, 1], text: () => 'Den Boss einer Lv-80-Instanz besiegen', where: 'Lv-80-Instanzen' },
  { id: 'gold', need: [250000, 400000], text: (n) => `${n.toLocaleString('de-DE')} Gold von Monstern sammeln`, where: 'überall' }
];
const AUFG_WOCHE = [
  { id: 'tage', need: 15, text: (n) => `${n} Tagesaufträge erledigen`, where: 'Tagesaufträge' },
  { id: 'weltboss', need: 3, text: (n) => `${n} Weltbosse besiegen`, where: 'Weltbosse auf den Lv-80-Karten' },
  { id: 'boss80', need: 5, text: (n) => `${n} große Bosse ab Stufe 75 besiegen (Instanz, Endboss, Turm)`, where: 'Instanzen, Endboss-Hallen, Turm' }
];
// Belohnungen: je Auftrag und für die Truhen (seelenEp als Anteil der Erfahrung für Stufe 80)
const AUFG_LOHN = {
  tag: { gold: 100000, splinters: 15, ep: 0.5 },
  tagTruhe: { gold: 150000, splinters: 25, kerne: 1 },
  woche: { gold: 500000, splinters: 40, kerne: 2, ep: 1.5 },
  wocheTruhe: { kerne: 3, seelenstein: 1, legendary: 0.3 }
};

// im Spielstand (spieler.js speichert nur SAVE_FIELDS)
if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('aufg')) SAVE_FIELDS.push('aufg');

// Montag der laufenden Woche als Datumstext (Gerätezeit)
function aufgWeekKey(d = new Date()) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return dailyKey(m);
}
// fester Zufall je Figur und Tag (FNV-Hash als Startwert)
function aufgRng(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function aufgState(p) {
  p = p || game.player;
  if (!p || p.level < AUFG.level) return null;
  if (!p.aufg || typeof p.aufg !== 'object') p.aufg = {};
  const a = p.aufg;
  const tag = dailyKey();
  if (a.tag !== tag || !Array.isArray(a.d)) {
    const rnd = aufgRng(tag + '|' + p.name + '|' + p.classId);
    const pool = AUFG_TAG.slice();
    a.d = [];
    for (let k = 0; k < 3 && pool.length; k++) {
      const t = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      const [lo, hi] = t.need;
      const step = hi >= 1000 ? 50000 : hi >= 50 ? 10 : 1;
      const need = lo + Math.round((rnd() * (hi - lo)) / step) * step;
      a.d.push({ id: t.id, need, n: 0 });
    }
    a.tag = tag;
    a.tt = 0;
  }
  const woche = aufgWeekKey();
  if (a.woche !== woche || !Array.isArray(a.w)) {
    a.w = AUFG_WOCHE.map((t) => ({ id: t.id, need: t.need, n: 0 }));
    a.woche = woche;
    a.wt = 0;
  }
  return a;
}
const aufgDef = (list, id) => list.find((t) => t.id === id);

// Fortschritt: kind ist die Art des Auftrags, n die Menge
function aufgAdd(kind, n = 1) {
  const p = game.player;
  const a = aufgState(p);
  if (!a || !(n > 0)) return;
  for (const e of a.d) {
    if (e.id !== kind || e.n >= e.need) continue;
    e.n = Math.min(e.need, e.n + n);
    if (e.n >= e.need) aufgDone('tag', e);
  }
  for (const e of a.w) {
    if (e.id !== kind || e.n >= e.need) continue;
    e.n = Math.min(e.need, e.n + n);
    if (e.n >= e.need) aufgDone('woche', e);
  }
  aufgRedraw();
}
// Auftragsliste neu zeichnen – höchstens zweimal je Sekunde (Gold zählt bei jedem Kill)
let aufgRedrawAt = 0;
function aufgRedraw() {
  if (aufgRedrawAt) return;
  aufgRedrawAt = setTimeout(() => {
    aufgRedrawAt = 0;
    if (typeof ui !== 'undefined' && ui.renderQuestTrack && game.player) ui.renderQuestTrack();
  }, 500);
}
function aufgGive(r) {
  const p = game.player;
  const parts = [];
  if (r.gold) {
    p.gold += r.gold;
    parts.push(`${r.gold.toLocaleString('de-DE')} Gold`);
  }
  if (r.splinters) {
    p.splinters += r.splinters;
    parts.push(`${r.splinters} × Seelensplitter`);
  }
  if (r.kerne) {
    p.materials.aetherkern = (p.materials.aetherkern || 0) + r.kerne;
    ui.loot('Ätherkern', r.kerne, materialIconUrl('aetherkern'), MATERIAL_COLORS.aetherkern);
    parts.push(`${r.kerne} × Ätherkern`);
  }
  if (r.seelenstein) {
    addSkillMat('seelenstein', r.seelenstein);
    parts.push(`${r.seelenstein} × Seelenstein (Gegenstand)`);
  }
  if (r.ep) {
    const xp = Math.round(xpToNext(MAX_LEVEL) * r.ep);
    gainXp(xp);
    parts.push(`${xp.toLocaleString('de-DE')} Seelen-EP`);
  }
  return parts;
}
function aufgDone(art, e) {
  const p = game.player;
  const a = p.aufg;
  const def = aufgDef(art === 'tag' ? AUFG_TAG : AUFG_WOCHE, e.id);
  const parts = aufgGive(art === 'tag' ? AUFG_LOHN.tag : AUFG_LOHN.woche);
  // (Meldungen in Teilen mit „ · “: so übersetzt sprache.js jedes Stück einzeln)
  const head = art === 'tag' ? 'Tagesauftrag erledigt' : 'Wochenauftrag erledigt';
  ui.banner(head, def.text(e.need));
  ui.log([head, def.text(e.need), ...parts].join(' · '), 'level');
  if (art === 'tag') {
    aufgAdd('tage', 1);
    if (!a.tt && a.d.every((x) => x.n >= x.need)) {
      a.tt = 1;
      const more = aufgGive(AUFG_LOHN.tagTruhe);
      ui.banner('Tagestruhe', 'Alle drei Tagesaufträge erledigt');
      ui.log(['Tagestruhe', ...more].join(' · '), 'level');
    }
  } else if (!a.wt && a.w.every((x) => x.n >= x.need)) {
    a.wt = 1;
    const more = aufgGive(AUFG_LOHN.wocheTruhe);
    // ein Ausrüstungsteil für die eigene Klasse (Stufe 80): mit Glück legendär, sonst episch
    const leg = typeof pechLeg === 'function' ? pechLeg('woche', AUFG_LOHN.wocheTruhe.legendary) : Math.random() < AUFG_LOHN.wocheTruhe.legendary;
    if (leg) dropLegendary(null);
    else giveRarityItem(rollRarityItem(80, 3), null);
    ui.banner('Wochentruhe', leg ? 'Ein legendäres Teil!' : 'Ein episches Teil!');
    ui.log(['Wochentruhe', ...more, 'ein Ausrüstungsteil'].join(' · '), 'level');
  }
  if (typeof sfx !== 'undefined' && sfx.success) sfx.success();
  saveGame();
}

// --- Ereignisse ---------------------------------------------------------------------------------------------------
const _aufgQuestEvent = questEvent;
questEvent = function (kind, m) {
  _aufgQuestEvent(kind, m);
  const p = game.player;
  if (!p || p.level < AUFG.level || !m) return;
  if (kind === 'kill' && !m.isStone) {
    if (m.level >= 75) aufgAdd('mobs');
    if (m.elite80) aufgAdd('elite');
  } else if (kind === 'stone' && m.level >= 75) aufgAdd('steine');
};
const _aufgMonsterGold = monsterGold;
monsterGold = function (g) {
  const v = _aufgMonsterGold(g);
  if (v > 0 && game.player && game.player.level >= AUFG.level) aufgAdd('gold', v);
  return v;
};
if (typeof instFinalLoot === 'function') {
  const _aufgInstFinal = instFinalLoot;
  instFinalLoot = function (m, def) {
    _aufgInstFinal(m, def);
    if (def && instMobLevel(def) >= 75) {
      aufgAdd('instanz');
      aufgAdd('boss80');
    }
  };
}
const _aufgRaidLoot = raidLoot;
raidLoot = function (m) {
  _aufgRaidLoot(m);
  if (m && m.level >= 75) aufgAdd('boss80');
};
if (typeof turmFinalLoot === 'function') {
  const _aufgTurmFinal = turmFinalLoot;
  turmFinalLoot = function (m) {
    const r = _aufgTurmFinal(m);
    aufgAdd('boss80');
    return r;
  };
}

// --- Anzeige ---------------------------------------------------------------------------------------------------------
// Questfenster (Nebenquests): jeder Tages- und Wochenauftrag einzeln, nicht abbrechbar
function aufgQuestList() {
  const p = game.player;
  const a = aufgState(p);
  if (!a) return [];
  const out = [];
  const lohn = (r) => `${r.gold.toLocaleString('de-DE')} Gold, ${r.splinters} Seelensplitter`;
  for (const e of a.d) {
    const def = aufgDef(AUFG_TAG, e.id);
    out.push({ key: 'aufg:' + e.id, title: 'Tagesauftrag', sub: `Täglich · automatisch aktiv, kein Annehmen nötig · ${a.d.filter((x) => x.n >= x.need).length} von 3 erledigt · Belohnung sofort: ${lohn(AUFG_LOHN.tag)}`,
      goal: def.text(e.need), have: Math.min(e.n, e.need), need: e.need, where: def.where, active: true, xp: Math.round(xpToNext(MAX_LEVEL) * AUFG_LOHN.tag.ep) });
  }
  for (const e of a.w) {
    const def = aufgDef(AUFG_WOCHE, e.id);
    out.push({ key: 'woche:' + e.id, title: 'Wochenauftrag', sub: `Wöchentlich · automatisch aktiv, kein Annehmen nötig · bis Sonntag · Belohnung sofort: ${lohn(AUFG_LOHN.woche)}, ${AUFG_LOHN.woche.kerne} Ätherkerne`,
      goal: def.text(e.need), have: Math.min(e.n, e.need), need: e.need, where: def.where, active: true, xp: Math.round(xpToNext(MAX_LEVEL) * AUFG_LOHN.woche.ep) });
  }
  return out;
}
if (typeof SIDE_QUEST_SOURCES !== 'undefined') SIDE_QUEST_SOURCES.push(aufgQuestList);
// Auftragsliste rechts: eine Zeile für den Tag (nächster offener Auftrag), solange noch etwas offen ist
// (seit 15.86: der verfolgte Tagesauftrag statt des nächsten offenen, dazu ein verfolgter Wochenauftrag)
function aufgTrackRows() {
  const a = aufgState(game.player);
  if (!a) return [];
  const rows = [];
  const t = aufgPicked();
  const open = a.d.filter((e) => e.n < e.need);
  const e = t && t.art === 'aufg' ? t.e : open[0];
  if (e) {
    const def = aufgDef(AUFG_TAG, e.id);
    rows.push({ key: 'aufg:' + e.id, title: `Tagesaufträge ${3 - open.length}/3`, goal: def.text(e.need), have: Math.min(e.n, e.need), need: e.need, where: def.where, giver: '' });
  }
  if (t && t.art === 'woche') {
    rows.push({ key: t.key, title: 'Wochenauftrag', goal: t.def.text(t.e.need), have: Math.min(t.e.n, t.e.need), need: t.e.need, where: t.def.where, giver: '' });
  }
  return rows;
}

// --- Verfolgen (seit 15.86) ----------------------------------------------------------------------------------------
// „Verfolgen“ im Questfenster setzt guide.pick auf 'aufg:<id>' bzw. 'woche:<id>'. Bis 15.85 kannte der Wegweiser diese
// Schlüssel nicht, der Knopf blieb ohne Wirkung. Jetzt kommt der gewählte Auftrag (nur dieser, damit kein Auftrag von
// selbst verfolgt wird) in guideEntries. Ein Ziel bekommt er, wo eins auf der eigenen Karte ist: Monster ab Stufe 75,
// Elite, Seelensteine ab 75, der laufende Weltboss oder der Eingang einer Lv-80-Instanz. Sonst bleibt er ohne Pfeil
// verfolgt (Zeile in der Auftragsliste mit Ortsangabe).
const AUFG_ZIEL = {
  mobs: (m) => !m.isStone && m.level >= 75,
  gold: (m) => !m.isStone && m.level >= 75,
  elite: (m) => !m.isStone && !!m.elite80,
  steine: (m) => m.isStone && m.level >= 75
};
function aufgPicked() {
  const k = typeof guide !== 'undefined' && typeof guide.pick === 'string' ? guide.pick : '';
  const i = k.indexOf(':');
  const art = i > 0 ? k.slice(0, i) : '';
  if (art !== 'aufg' && art !== 'woche') return null;
  const a = aufgState(game.player);
  if (!a) return null;
  const e = (art === 'aufg' ? a.d : a.w).find((x) => x.id === k.slice(i + 1));
  return e && e.n < e.need ? { key: k, art, e, def: aufgDef(art === 'aufg' ? AUFG_TAG : AUFG_WOCHE, e.id) } : null;
}
const aufgInstTor = (n) => {
  const dg = n && n.id !== 'ausgang' && n.dungeon != null && game.world.dungeons ? game.world.dungeons[n.dungeon] : null;
  return !!(dg && dg.def && dg.def.inst60 && instMobLevel(dg.def) >= 75);
};
function aufgGuideEntry() {
  const t = aufgPicked();
  const p = game.player;
  if (!t || !p || !game.world) return null;
  const out = { key: t.key, kind: 'side', title: t.def.text(t.e.need), aufgOhneZiel: true };
  const area = mapAreaAt(p.x / TILE, p.y / TILE);
  if (!area) return out;
  const fit = AUFG_ZIEL[t.e.id];
  if (fit) {
    const m = nearestIn(game.monsters, area, p, (x) => !x.dead && fit(x));
    if (m) return Object.assign(out, { aufgOhneZiel: false, monster: m.typeId, at: { x: m.x, y: m.y, name: m.name } });
  } else if (t.e.id === 'weltboss') {
    const w = typeof wbGuideEntry === 'function' ? wbGuideEntry() : null;
    if (w) return Object.assign(out, { aufgOhneZiel: false, monster: w.monster, at: w.at });
  } else if (t.e.id === 'instanz' || t.e.id === 'boss80') {
    const n = nearestIn(game.world.npcs, area, p, aufgInstTor);
    if (n) return Object.assign(out, { aufgOhneZiel: false, npc: n });
  }
  return out;
}
if (typeof guideEntries === 'function') {
  const _aufgGuideEntries = guideEntries;
  guideEntries = function () {
    const out = _aufgGuideEntries();
    const e = aufgGuideEntry();
    if (e) out.push(e);
    return out;
  };
}
if (typeof guideTarget === 'function') {
  const _aufgGuideTarget = guideTarget;
  guideTarget = function (e, p) {
    return e && e.aufgOhneZiel ? null : _aufgGuideTarget(e, p);
  };
}
