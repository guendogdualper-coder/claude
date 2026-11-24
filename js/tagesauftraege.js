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
    const leg = Math.random() < AUFG_LOHN.wocheTruhe.legendary;
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
    out.push({ key: 'aufg:' + e.id, title: 'Tagesauftrag', sub: `Täglich · ${a.d.filter((x) => x.n >= x.need).length} von 3 erledigt · Belohnung sofort: ${lohn(AUFG_LOHN.tag)}`,
      goal: def.text(e.need), have: Math.min(e.n, e.need), need: e.need, where: def.where, active: true, xp: Math.round(xpToNext(MAX_LEVEL) * AUFG_LOHN.tag.ep) });
  }
  for (const e of a.w) {
    const def = aufgDef(AUFG_WOCHE, e.id);
    out.push({ key: 'woche:' + e.id, title: 'Wochenauftrag', sub: `Wöchentlich · bis Sonntag · Belohnung sofort: ${lohn(AUFG_LOHN.woche)}, ${AUFG_LOHN.woche.kerne} Ätherkerne`,
      goal: def.text(e.need), have: Math.min(e.n, e.need), need: e.need, where: def.where, active: true, xp: Math.round(xpToNext(MAX_LEVEL) * AUFG_LOHN.woche.ep) });
  }
  return out;
}
if (typeof SIDE_QUEST_SOURCES !== 'undefined') SIDE_QUEST_SOURCES.push(aufgQuestList);
// Auftragsliste rechts: eine Zeile für den Tag (nächster offener Auftrag), solange noch etwas offen ist
function aufgTrackRows() {
  const a = aufgState(game.player);
  if (!a) return [];
  const open = a.d.filter((e) => e.n < e.need);
  if (!open.length) return [];
  const e = open[0];
  const def = aufgDef(AUFG_TAG, e.id);
  return [{ key: 'aufg:' + e.id, title: `Tagesaufträge ${3 - open.length}/3`, goal: def.text(e.need), have: Math.min(e.n, e.need), need: e.need, where: def.where, giver: '' }];
}
