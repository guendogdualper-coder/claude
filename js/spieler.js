// Spielfigur: Erstellen, Werte berechnen, Erfahrung, Speichern.

const SAVE_KEY = 'seelenstein.spielstand.v1';
const MAX_LEVEL = 80; // seit 13.37 (vorher 99)
// Fertigkeiten: Stufe 1–15 mit Fertigkeitspunkten. Auf Stufe 15 erweckt ein Klick die Fertigkeit
// (E1, kostet einen Punkt). E1 bleibt intern Stufe 18, die Stufen 16/17 werden seit 8.5 nicht mehr erreicht.
// Seit 14.1 kostet jede Stufe in einem Rang genau einen Gegenstand dieses Rangs (item, siehe SKILL_ITEMS):
//   E1–E10  je 1 Fertigkeitsbuch der Fertigkeit       (Seelensteine aller Stufen, Lehrmeister, Belohnungen)
//   H1–H10  je 1 Schriftrolle, für jede Fertigkeit     (nur Seelensteine ab Stufe 40)
//   L1–V    je 1 Seelenstein (Gegenstand), für jede    (nur Seelensteine ab Stufe 45)
// Der Aufstieg in den nächsten Rang kostet einen Gegenstand des NEUEN Rangs (books = 1) und geht wie bisher schon aus
// den letzten drei Stufen eines Rangs (z. B. E8, E9, E10 → H1). Die übersprungenen Stufen kosten nichts extra: Das war
// schon vor 14.1 so, H1 ist von E8 aus dasselbe wie von E10, und das Zurücksetzen gibt genau diesen kürzesten Weg zurück.
// Vorher (bis 14.0) brauchte alles Fertigkeitsschriftrollen der Fertigkeit, der Aufstieg 3/5/10 Stück.
const SKILL_POINT_MAX = 15;
const SKILL_BASE_MAX = 17; // Kurvenanker für dmgScale/buffScale, nicht ändern
const SKILL_RANKS = [
  { id: 'E', name: 'Erwacht', from: 18, levels: 10, minLevel: 1, books: 0, item: 'book', color: '#9fd0ff' },
  { id: 'H', name: 'Heroisch', from: 28, levels: 10, minLevel: 35, books: 1, item: 'rolle', color: '#c58cff' },
  { id: 'L', name: 'Legendär', from: 38, levels: 10, minLevel: 50, books: 1, item: 'seelenstein', color: '#ffd34d' },
  { id: 'V', name: 'Vollendet', from: 48, levels: 1, minLevel: 65, books: 1, item: 'seelenstein', color: '#ff6a4a' }
];
// seit 14.1: die Gegenstände der Ränge (Namen, Knöpfe, Gründe). books in SKILL_RANKS = Anzahl für den Aufstieg.
const SKILL_ITEMS = {
  book: { name: 'Fertigkeitsbuch', many: 'Fertigkeitsbücher', use: 'Buch lesen',
    missing: () => 'Kein Fertigkeitsbuch dieser Fertigkeit – aus Seelensteinen, beim Lehrmeister oder als Belohnung' },
  rolle: { name: 'Schriftrolle', many: 'Schriftrollen', use: 'Schriftrolle nutzen',
    missing: () => `Keine Schriftrolle – Schriftrollen gibt es nur aus Seelensteinen ab Stufe ${SKILL_MAT_DROP.rolle.stone}` },
  seelenstein: { name: 'Seelenstein', many: 'Seelensteine', use: 'Seelenstein nutzen',
    missing: () => `Kein Seelenstein (Gegenstand) – den gibt es nur aus Seelensteinen ab Stufe ${SKILL_MAT_DROP.seelenstein.stone}` }
};
// Wie viele Gegenstände einer Sorte die Figur hat (Bücher je Fertigkeit, Schriftrollen und Seelensteine für alle)
function skillItemHave(p, item, skId) {
  return item === 'book' ? bookCount(p, skId) : Math.max(0, (p.materials && p.materials[item]) || 0);
}
function skillItemTake(p, item, skId, n = 1) {
  if (item === 'book') takeBooks(p, skId, n);
  else p.materials[item] = Math.max(0, (p.materials[item] || 0) - n);
}
const MAX_SKILL_LEVEL = 48;

// Rang einer Fertigkeitsstufe: -1 = normal, sonst Index in SKILL_RANKS
function skillRank(lvl) {
  for (let r = SKILL_RANKS.length - 1; r >= 0; r--) if (lvl >= SKILL_RANKS[r].from) return r;
  return -1;
}

// Anzeige: 12, E3, H10, L1, V
function skillLevelText(lvl) {
  const r = skillRank(lvl);
  if (r < 0) return String(lvl);
  const rank = SKILL_RANKS[r];
  return rank.levels === 1 ? rank.id : rank.id + (lvl - rank.from + 1);
}

// Nächste erreichbare Stufe (für die Vorschau): der Punkt auf 15 erweckt sofort zu E1 (seit 8.9), ganz oben nichts mehr
function nextSkillLevel(lvl) {
  if (lvl >= MAX_SKILL_LEVEL) return null;
  return skillRank(lvl) < 0 && lvl + 1 >= SKILL_POINT_MAX ? SKILL_RANKS[0].from : lvl + 1;
}

// Was mit einer Fertigkeit gerade möglich ist (für Knöpfe im Charakterfenster)
function skillActions(p, i) {
  const sk = classSkills(p)[i];
  const lvl = p.skillLevels[i];
  const out = [];
  if (p.level < sk.unlock) return out;
  const r = skillRank(lvl);
  if (r < 0) {
    // seit 8.9: der Punkt auf Stufe 15 erweckt automatisch zu E1
    if (lvl < SKILL_POINT_MAX) out.push({ type: 'point', label: lvl + 1 >= SKILL_POINT_MAX ? `Verbessern → ${SKILL_RANKS[0].id}1` : 'Verbessern', ok: p.skillPoints > 0, why: 'Kein Fertigkeitspunkt frei' });
    else out.push({ type: 'rankup', label: `Erwecken → ${SKILL_RANKS[0].id}1`, ok: true, why: '' });
    return out;
  }
  // seit 14.1: type 'book' heißt „eine Stufe im Rang“, item sagt womit (Buch, Schriftrolle oder Seelenstein)
  const rank = SKILL_RANKS[r];
  const pos = lvl - rank.from + 1;
  const it = SKILL_ITEMS[rank.item];
  const have = skillItemHave(p, rank.item, sk.id);
  if (pos < rank.levels) out.push({ type: 'book', item: rank.item, label: `${it.use} (${have})`, ok: have > 0, why: have > 0 ? '' : it.missing(sk) });
  const next = SKILL_RANKS[r + 1];
  if (next && pos >= rank.levels - 2) {
    const nit = SKILL_ITEMS[next.item];
    const nhave = skillItemHave(p, next.item, sk.id);
    const lack = nhave < next.books;
    // übersprungene Stufen (Aufstieg aus E8 oder E9) kosten nichts extra
    const skip = pos < rank.levels ? `Überspringt ${rank.id}${pos + 1}${pos + 1 < rank.levels ? '–' + rank.id + rank.levels : ''} ohne Mehrkosten.` : '';
    out.push({
      type: 'rankup', item: next.item, skip,
      label: `${next.name} → ${next.levels === 1 ? next.id : next.id + '1'} · ${nit.name} (${nhave})`,
      ok: !lack && p.level >= next.minLevel,
      why: p.level < next.minLevel ? `${next.name} ab Stufe ${next.minLevel}` : lack ? nit.missing(sk) : ''
    });
  }
  return out;
}

// Reihenfolge der Fertigkeiten in der Leiste: Platz -> Fertigkeit
const SKILL_HOLD_MS = 500;
const SKILL_HOLD_AIM_MS = 1100; // seit 14.2: Fertigkeiten mit Zielkreis am Handy (Ziehen zielt)
// Seit 10.7 darf ein Platz leer sein (null): Fertigkeiten lassen sich aus der Leiste ziehen.
// Seit 13.20 hat die Leiste sechs Plätze (Tasten 1–5 und 6): die Ultimative Attacke (Wert ULT_BAR) liegt auf einem
// davon und lässt sich wie jede Fertigkeit tauschen. Alte Spielstände (fünf Plätze) bekommen sie auf Platz 6.
const ULT_BAR = 5;
function skillOrder(p) {
  let o = p.skillOrder;
  if (Array.isArray(o) && o.length === 5 && !o.includes(ULT_BAR)) o = p.skillOrder = o.concat([ULT_BAR]);
  const used = Array.isArray(o) ? o.filter((k) => k != null) : [];
  const ok = Array.isArray(o) && o.length === 6 && used.every((k) => Number.isInteger(k) && k >= 0 && k <= ULT_BAR) &&
    new Set(used).size === used.length && used.includes(ULT_BAR);
  if (!ok) p.skillOrder = [0, 1, 2, 3, 4, ULT_BAR];
  return p.skillOrder.slice();
}
// Einen Platz der Leiste auslösen (Fertigkeit oder Ultimative Attacke)
function useBarEntry(v) {
  if (v === ULT_BAR) useUltimate();
  else if (v != null) useSkill(v);
}
// Name eines Leisteneintrags (für Meldungen)
function barEntryName(p, v) {
  if (v === ULT_BAR) { const u = ultimateOf(p); return u ? u.name : 'Ultimative Attacke'; }
  return v != null && classSkills(p)[v] ? classSkills(p)[v].name : '';
}

// Diese Felder landen im Spielstand
const SAVE_FIELDS = ['name', 'classId', 'path', 'level', 'xp', 'gold', 'skillPoints', 'skillLevels', 'potions',
  'splinters', 'kills', 'stones', 'deaths', 'hp', 'mp', 'x', 'y', 'playTime', 'equipment', 'inventory', 'scrolls', 'itemsVersion', 'attrs', 'statPoints', 'materials', 'worldVersion', 'quests', 'upmats', 'books', 'skillOrder', 'horse', 'riding', 'dualWield', 'titanGrip', 'dagger2', 'quiverGiven', 'goldGift', 'pathSkills', 'ultCd', 'friends', 'guild', 'look', 'daily', 'horseTier', 'resets', 'storage', 'quick', 'quickSet', 'arrows', 'bowPathGift',
  // seit 13.86: Turnierarena (turnierarena.js) – Rangpunkte, Siege, Niederlagen, offener Rangkampf
  'pvp',
  // seit 14.1: Stand des Rang-Aufstiegs (Bücher, Schriftrollen, Seelensteine) für den einmaligen Hinweis
  'skillCostVer',
  // seit 14.39: Farbe der Glutschwinge (rot, blau, schwarz, weiss)
  'dragonColor',
  // seit 14.67: Drachenfarbe endgültig gewählt (beim Kauf bzw. einmal nachträglich für Käufer vor 14.67)
  'dragonColorLocked',
  // seit 14.54: Seite (licht | schatten, seiten.js); fehlt bei älteren Spielständen – dann wird einmal gewählt
  'faction'];
const SKILL_COST_VER = 1;

// Statuspunkte: pro Stufe 3 Punkte, frei auf vier Werte verteilbar
const STAT_POINTS_PER_LEVEL = 2; // seit 13.49 zwei je Stufe (10.1 bis 13.48 einer, davor drei)
const MAX_ATTR = 90;
const ATTRS = [
  // seit 14.10 alle Statuswerte halb so stark (2 Punkte je Stufe bleiben): Stufe 12 mit 22 Punkten im Hauptwert gab
  // +26 % Fertigkeitsschaden, +22 % Angriffsschaden und dazu +33 festen Fertigkeitsangriff – fast doppelter Schaden
  { id: 'str', name: 'Stärke', short: 'STR', text: '+0,5 Angriff je Punkt' },
  { id: 'vit', name: 'Vitalität', short: 'VIT', text: '+6 Leben und +0,3 Rüstung je Punkt' },
  { id: 'int', name: 'Intelligenz', short: 'INT', text: '+5 Mana und +0,5 % Fertigkeitsschaden je Punkt' },
  { id: 'dex', name: 'Geschick', short: 'DEX', text: '+0,15 % kritische Treffer, +0,15 % Ausweichen und +0,15 % Angriffstempo je Punkt' }
];
// Hauptwert jeder Klasse: stärkt je Punkt zusätzlich Fertigkeiten, normale Angriffe und Buffs (Auren, Heilung, Schilde).
// Bei Intelligenz als Hauptwert ersetzt das den allgemeinen Fertigkeitsschaden der Intelligenz.
const MAIN_ATTR = { krieger: 'str', ninja: 'dex', schamane: 'int', nekromant: 'int', magier: 'int' };
// Name des Hauptwerts einer Klasse (seit 13.4 an jeder Fertigkeit angezeigt: „wird stärker mit Geschick“)
function mainAttrName(classId) {
  const a = ATTRS.find((x) => x.id === MAIN_ATTR[classId]);
  return a ? a.name : '';
}
const ATTR_PT = { str: 0.5, int: 0.005, crit: 0.0015, dodge: 0.0015, speed: 0.0015 }; // seit 14.10 (vorher 1 / 0,01 / 0,003 / 0,0025 / 0,003)
const MAIN_SKILL = 0.006; // seit 14.10 (vorher 0,012)
// Mehr als so viele Punkte (eigene plus Ausrüstung) zählen für den Hauptwert-Bonus nicht
const MAIN_ATTR_CAP = 120;
// seit 13.37: der Hauptwert zählt für Fertigkeiten zusätzlich wie fester Angriff (je Punkt so viel), damit schon
// ein einzelner Punkt den Fertigkeitsschaden sichtbar erhöht (vorher nur +1,2 % je Punkt, das ging beim Runden unter)
const MAIN_SKILL_FLAT = 0.6; // seit 14.10 (13.41 bis 14.9: 1,5, davor 1,0)
const MAIN_BASIC = 0.005; // seit 14.10 (vorher 0,01)
const MAIN_BUFF = 0.005; // seit 14.10 (vorher 0,01)

// Erfahrung, die für die nächste Stufe nötig ist. Wächst stark – so entsteht der Grind.
// Ab Stufe 10 braucht jede Stufe 40 % mehr Erfahrung als die Grundformel (davor steigt es langsam an)
// Seit Version 5.8 wächst der Bedarf mit jeder Stufe zusätzlich um 10 %: hohe Stufen dauern spürbar länger
function xpToNext(level) {
  return Math.round((80 * Math.pow(level, 2.1) + 50 * level) * (1 + 0.4 * Math.min(1, (level - 1) / 9)) * (1 + 0.1 * (level - 1)));
}

// Zu schwache Monster geben kaum noch Erfahrung, stärkere etwas mehr
function xpFactor(playerLevel, monsterLevel) {
  const diff = monsterLevel - playerLevel;
  if (diff >= 0) return Math.min(1.25, 1 + diff * 0.04);
  return Math.max(0.05, 1 + diff * 0.12);
}

function newCharacter(name, classId, path = 0, look = null) {
  return {
    look: look ? { ...look } : { ...DEFAULT_LOOKS[classId] },
    name, classId, path, level: 1, xp: 0, gold: 30, skillPoints: 0, skillLevels: [1, 1, 1, 1, 1],
    potions: { hp: 5, mp: 5 }, splinters: 0, kills: 0, stones: 0, deaths: 0,
    hp: null, mp: null, x: null, y: null, playTime: 0,
    equipment: starterEquipment(classId), inventory: [], scrolls: 0, itemsVersion: 3,
    attrs: { str: 0, vit: 0, int: 0, dex: 0 }, statPoints: 0,
    materials: { boniPlus: 0, boni5: 0, switcher: 0, star: 0, switch67: 0, rolle: 0, seelenstein: 0 },
    worldVersion: WORLD_VERSION, quests: null, upmats: {}, books: 0, skillCostVer: SKILL_COST_VER
  };
}

// Aus dem Spielstand wird die Figur mit allen Laufzeit-Feldern
function makePlayer(save) {
  const p = {
    ...newCharacter(save.name, save.classId),
    ...save,
    r: 11,
    facing: { x: 0, y: 1 },
    attackCd: 0,
    skillCd: [0, 0, 0, 0, 0],
    potCd: { hp: 0, mp: 0 },
    buffs: [],
    shield: 0,
    shieldUntil: 0,
    nextHitMul: 1,
    swing: 0,
    dash: null,
    dead: false,
    lastCombat: -99,
    moving: false
  };
  p.potions = { hp: 0, mp: 0, ...save.potions };
  migratePotions(p); // seit 14.32: L-Tränke werden 1:1 zu XL (daten/zonen.js)
  // Wer schon ein Pferd hat, reitet ab 7.3 das Reitpferd (Stufe 1)
  p.horseTier = p.horse ? Math.max(1, save.horseTier || 1) : 0;
  // seit 14.39: Drachenfarbe, unbekannt oder alt → Rot (die bisherige Farbe)
  p.dragonColor = dragonColorOf(save);
  // seit 14.67: fehlt bei älteren Spielständen → noch nicht festgelegt (wer schon einen Drachen hat, wählt einmal)
  p.dragonColorLocked = !!save.dragonColorLocked;
  // Ältere Spielstände ohne Ausrüstung bekommen die Startausrüstung
  p.equipment = { ...starterEquipment(save.classId), helm: null, schultern: null, umhang: null, schild: null, schuhe: null, guertel: null, ...(save.equipment || starterEquipment(save.classId)) };
  p.inventory = Array.isArray(save.inventory) ? save.inventory : [];
  // Lager (seit 9.1): erst nach dem Kauf vorhanden
  p.storage = save.storage && save.storage.open && Array.isArray(save.storage.items) ? save.storage : null;
  // 10.3: Bücherstapel (und sehr alte Gegenstände) ohne Kennung bekommen eine, sonst lassen sie sich nicht handeln
  for (const it of [...(p.inventory || []), ...((p.storage && p.storage.items) || [])]) if (it && !it.uid) it.uid = newUid();
  p.scrolls = save.scrolls || 0;
  if (save.equipment && (save.itemsVersion || 1) < 2) {
    Object.values(p.equipment).forEach(migrateItem);
    p.inventory.filter((it) => !isBook(it)).forEach(migrateItem);
  }
  if ((save.itemsVersion || 1) < 3) {
    Object.values(p.equipment).forEach(clampItemBonuses);
    p.inventory.forEach(clampItemBonuses);
  }
  p.itemsVersion = 3;
  // 13.56: Seltenheit für alte Gegenstände (frühere legendäre Teile gold/lila/blau, sonst nach Boni)
  migrateRarity(p);
  // Waffe, Rüstung und Helm gehören jetzt einer Klasse; alte Gegenstände bekommen die eigene
  Object.values(p.equipment).forEach((it) => assignClass(it, p.classId));
  p.inventory.forEach((it) => { if (!isBook(it)) assignClass(it, p.classId); });
  // 13.49: Statuswerte auf der Ausrüstung passend zur Klasse
  Object.values(p.equipment).forEach((it) => fitItemAttrs(it, p.classId));
  p.inventory.forEach((it) => { if (!isBook(it)) fitItemAttrs(it, p.classId); });
  // 14.21: Leben-Boni auch im Lager auf die festen Stufen (und nicht mehr auf Waffe/Köcher)
  if (p.storage) p.storage.items.forEach((it) => fixLifeBonus(it));
  // Seit Version 3.2: Schild nur Krieger, Zweihänder nur Weg des Leibes. Was nicht mehr passt, kommt in die Tasche.
  p.gearMoved = enforceGearRules(p);
  p.upmats = { ...(save.upmats || {}) };
  // Bis Version 2.5 waren Bücher eine einfache Zahl: jetzt Bücher zu den eigenen Fertigkeiten.
  // books bleibt als 0 im Spielstand und zeigt, dass der Stand die Ränge schon kennt.
  p.books = 0;
  if (save.books > 0) {
    const own = CLASSES[p.classId].paths[p.path || 0].skills;
    for (let k = 0; k < save.books; k++) addBookItem(p, own[k % own.length].id, 1, true);
  }
  // Fertigkeiten über Stufe 17 aus älteren Spielständen: Punkte zurück, Stufe auf 17
  p.skillLevels = (p.skillLevels || [1, 1, 1, 1, 1]).map((lvl) => {
    if (save.books == null && lvl > SKILL_BASE_MAX) {
      p.skillPoints += lvl - SKILL_BASE_MAX;
      return SKILL_BASE_MAX;
    }
    return lvl;
  });
  p.materials = { boniPlus: 0, boni5: 0, switcher: 0, star: 0, switch67: 0, rolle: 0, seelenstein: 0, ...(save.materials || {}) };
  // seit 14.1: neuer Aufstieg der Ränge. Fertigkeiten auf E/H/L/V behalten ihre Stufe, Bücher in Tasche und Lager
  // bleiben (gelten jetzt für E1–E10). Beim ersten Start danach erklärt ein Hinweis im Log den neuen Weg (spiel.js).
  if ((save.skillCostVer || 0) < SKILL_COST_VER) {
    p.skillCostNotice = true;
    p.skillCostVer = SKILL_COST_VER;
  }
  // Spielstände ohne Statuswerte bekommen die Punkte aller bisherigen Stufen nachträglich
  if (!save.attrs) {
    p.attrs = { str: 0, vit: 0, int: 0, dex: 0 };
    p.statPoints = (p.level - 1) * STAT_POINTS_PER_LEVEL;
  } else {
    p.attrs = { str: 0, vit: 0, int: 0, dex: 0, ...save.attrs };
    p.statPoints = save.statPoints || 0;
    // 10.1: nur noch 1 Statuspunkt pro Stufe – wer mehr hat (alte 3 pro Stufe), bekommt alle Punkte zurück
    // und verteilt die neue Zahl kostenlos neu
    const allowed = (p.level - 1) * STAT_POINTS_PER_LEVEL;
    if (statPointsSpent(p) + p.statPoints > allowed) {
      p.attrs = { str: 0, vit: 0, int: 0, dex: 0 };
      p.statPoints = allowed;
      p.statNotice = true;
    }
    // 13.49: zwei Punkte je Stufe – wer weniger hat, bekommt die fehlenden Punkte aller bisherigen Stufen dazu
    else if (statPointsSpent(p) + p.statPoints < allowed) p.statPoints = allowed - statPointsSpent(p);
  }
  // Spielstände vor den zwei Wegen: Fertigkeitspunkte zurückgeben, der Weg wird beim Start gewählt
  if (save.path == null) {
    p.path = 0;
    p.needsPath = true;
    p.skillPoints += (p.skillLevels || []).reduce((a, v) => a + Math.max(0, v - 1), 0);
    p.skillLevels = [1, 1, 1, 1, 1];
  }
  // 8.5: Punkte nur bis 15. Seit 8.9 wird alles ab Stufe 15 (ohne Rang) automatisch E1; 16/17 gibt Punkte zurück.
  p.skillLevels = p.skillLevels.map((lvl) => {
    if (lvl >= SKILL_POINT_MAX && skillRank(lvl) < 0) { p.skillPoints += Math.max(0, lvl - SKILL_POINT_MAX); return SKILL_RANKS[0].from; }
    return lvl;
  });
  // Seit 8.9 kostet E1 14 Punkte (Stufe 1 → 15, das Erwecken ist frei). Wer mehr bezahlt hat, bekommt die Differenz
  // zurück. Je Stufe gibt es einen Punkt; es wird nie etwas abgezogen, mehrfaches Laden ändert nichts.
  {
    const spent = p.skillLevels.reduce((a, l) => a + (skillRank(l) >= 0 ? SKILL_POINT_MAX - 1 : Math.max(0, Math.min(l, SKILL_POINT_MAX) - 1)), 0);
    p.skillPoints = Math.max(p.skillPoints, (p.level - 1) - spent);
    clampSkillPoints(p);
  }
  // Die Welt ist größer geworden: alte Positionen passen nicht mehr. Aus Welt 6 (6.2/6.3), Welt 7 (bis 10.5) und
  // Welt 8 (10.6) geht es im Lager derselben Map weiter, sonst im Dorf.
  let campOf = null;
  let keepPos = false;
  if ((save.worldVersion || 1) < WORLD_VERSION) {
    if (save.worldVersion === 6 && save.x != null) {
      const OLD = { 4: [0, 0, 100, 90], 5: [100, 0, 100, 90], 6: [200, 0, 100, 90], 7: [0, 210, 100, 90], 8: [100, 210, 100, 90], 9: [200, 210, 100, 90], 2: [0, 300, 200, 200], 3: [200, 300, 200, 200] };
      const tx = save.x / TILE;
      const ty = save.y / TILE;
      for (const [id, [x, y, w, h]] of Object.entries(OLD)) if (tx >= x && tx < x + w && ty >= y && ty < y + h) campOf = Number(id);
    } else if ((save.worldVersion === 7 || save.worldVersion === 8) && save.x != null) {
      // Welt 7: Maps 300 × 120, Welt 8 (10.6): 360 × 150 – je Map die linke obere Ecke
      const OLD = save.worldVersion === 7
        ? { w: 300, h: 120, at: { 4: [300, 0], 5: [600, 0], 6: [300, 120], 2: [600, 120], 7: [300, 240], 8: [600, 240], 3: [300, 360], 9: [600, 360] } }
        : { w: 360, h: 150, at: { 4: [360, 0], 5: [720, 0], 6: [360, 150], 2: [720, 150], 7: [360, 300], 8: [720, 300], 3: [360, 450], 9: [720, 450] } };
      const tx = save.x / TILE;
      const ty = save.y / TILE;
      for (const [id, [x, y]] of Object.entries(OLD.at)) if (tx >= x && tx < x + OLD.w && ty >= y && ty < y + OLD.h) campOf = Number(id);
    } else if ((save.worldVersion === 12 || save.worldVersion === 13) && save.x != null) {
      // seit 13.96 (Welt 14, davor 13.95 Welt 13 mit neuem Dorfplan): Wege und Dorf sind neu, die Maps liegen gleich –
      // im Lager derselben Map weiter
      const wm = mapOfTile(Math.floor(save.x / TILE), Math.floor(save.y / TILE));
      if (wm && wm.id !== 1) campOf = wm.id;
    } else if (save.worldVersion === 14 && save.x != null) {
      // seit 14.50 (Welt 15): Die Städte und Lager der Maps 2–10 liegen an neuer Stelle (WORLD_MAPS.town), Kazehana,
      // die Dungeons und die Arenen bleiben gleich – dort geht es an derselben Stelle weiter. Wer in oder nahe der
      // alten Stadt einer anderen Map stand (dort ist jetzt Wildnis mit Monstern), kommt in die neue Stadt derselben
      // Map; sonst bleibt die Stelle (blockiert dort jetzt etwas: unten in die Stadt dieser Map)
      const tx = Math.floor(save.x / TILE);
      const ty = Math.floor(save.y / TILE);
      const wm = mapOfTile(tx, ty);
      if (wm && wm.id !== 1 && Math.max(Math.abs(tx + 0.5 - wm.oldCx), Math.abs(ty + 0.5 - wm.oldCy)) < (wm.camp || CAMP_HALF) + 10) campOf = wm.id;
      else keepPos = true;
    }
    if (!keepPos) {
      p.x = null;
      p.y = null;
    }
  }
  p.worldVersion = WORLD_VERSION;
  const stats = playerStats(p);
  if (p.hp == null || p.hp <= 0) p.hp = stats.maxHp;
  if (p.mp == null) p.mp = stats.maxMp;
  const camp = campOf && game.world && game.world.maps ? game.world.maps.find((m) => m.id === campOf) : null;
  // seit 14.50: blockierte Stelle auf einer Map: in die Stadt bzw. das Lager dieser Map (vorher immer nach Kazehana)
  const spawn = camp ? camp.spawn : villageSpawn(p.x != null && p.y != null ? p : undefined);
  if (p.x == null || !canStand(p.x, p.y, p.r * 0.7, false)) {
    // seit 14.16: wer in einer Stadt mit neuer Form auf Wasser, Mauer oder Haus stünde, kommt zum Weltentor dieser Stadt
    let rescue = p.x != null && typeof townRescue === 'function' ? townRescue(p.x, p.y) : null;
    // seit 14.32: Grundrisse der Dungeons haben sich geändert – wer jetzt im Fels stünde, beginnt am Anfang desselben
    // Dungeons (statt im Dorf)
    if (!rescue && p.x != null && game.world && game.world.dungeons && p.x / TILE >= WORLD_W && p.y / TILE < DUNGEON_H) {
      const dg = game.world.dungeons[dungeonIndexAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE))];
      if (dg && dg.start) rescue = dg.start;
    }
    p.x = (rescue || spawn).x;
    p.y = (rescue || spawn).y;
  }
  return p;
}

// Obergrenze des Lauftempos zu Fuß (Schuhe, Boni, Buffs), das Pferd zählt nicht mit
const FOOT_SPEED_CAP = 1.25;

// Endwerte aus Klasse, Stufe und aktiven Buffs
const PLAYER_CRIT_CAP = 0.4;
// Boni, die unverändert als Wert in playerStats landen (seit 14.15)
const PLAYER_BONUS_KEYS = ['poison', 'vsBeast', 'vsHuman', 'vsOrc', 'vsUndead', 'vsDemon', 'resHuman', 'resMagic', 'resMelee', 'resRanged', 'goldFind', 'dropFind'];
// Ausweichen (seit 14.32 als Tabelle statt fester Zahl im Code, Werte unverändert): cap ist die Obergrenze der Summe aus
// Ausrüstung (Umhang, Schuhe, Ninja-Rüstung), Boni (zusammen höchstens BONUS_CAPS.dodge), Geschick (ATTR_PT.dodge je
// Punkt) und Buffs (Schattenschleier). Gewürfelt wird einmal je Treffer in damagePlayer (kampf.js), vor dem Blocken;
// im PvP zählt die Hälfte (PVP_DMG.dodgeMul). Bestand, Messung und Varianten: docs/auftrag-2026-11-10-kampf.md
const DODGE_RULES = { cap: 0.45 };

function playerStats(p) {
  const c = CLASSES[p.classId];
  const L = p.level - 1;
  const s = {
    maxHp: Math.round(c.base.hp + c.perLevel.hp * L),
    maxMp: Math.round(c.base.mp + c.perLevel.mp * L),
    atk: c.base.atk + c.perLevel.atk * L,
    def: c.base.def + c.perLevel.def * L,
    crit: c.base.crit,
    speed: c.base.speed,
    atkSpeed: 1,
    damageTaken: 1,
    dodge: 0,
    regen: 0,
    reflect: 0,
    block: 0,
    // Kälte (seit 8.6, Frostpanzer des Magiers): Nahkämpfer, die dich schlagen, werden so stark verlangsamt
    chill: 0,
    invisible: false,
    // Waffenschaden (seit 13.10): Spanne und Mittelwert, der im Angriff steckt
    wMin: 0, wMax: 0, wAvg: 0
  };
  let atkMul = 1;
  let atkFlat = 0;
  let defFlat = 0; // feste Rüstung aus Buffs (Frostpanzer, seit 13.52)
  let defMul = 1;
  let speedMul = 1;
  // Boni der Ausrüstung
  const bonus = {};
  const eq = p.equipment || {};
  // Eine zweite Waffe in der Nebenhand (Schwert oder Axt, Dolch, Zweihänder) zählt nur zum Teil
  const offhand = isOffhand(eq.schild) ? eq.schild : null;
  for (const item of Object.values(eq)) {
    if (!item || !canWear(item, p)) continue;
    // seit 13.85: eine Waffe, die gerade nicht in die Nebenhand passt, bringt auch keine Boni
    if (item === offhand && !offhandAllows(p, item)) continue;
    const share = item === offhand ? offhandRules(p).bonus : 1;
    for (const [k, v] of Object.entries(itemBonusStats(item))) bonus[k] = (bonus[k] || 0) + v * share;
  }
  // seit 14.55: Set-Boni (angelegte Teile desselben Sets, seltenheit.js) zählen wie Boni der Ausrüstung, mit denselben
  // Obergrenzen; Leben daraus gilt im PvP wie Ausrüstungs-Leben nur zum Teil (bonusHp, PVP_DMG.lifeShare)
  if (typeof setBonusStats === 'function') for (const [k, v] of Object.entries(setBonusStats(p))) bonus[k] = (bonus[k] || 0) + v;
  for (const [k, cap] of Object.entries(BONUS_CAPS)) if (bonus[k] > cap) bonus[k] = cap;
  s.atk += bonus.atk || 0;
  s.def += bonus.def || 0;
  s.maxHp += bonus.hp || 0;
  s.bonusHp = bonus.hp || 0; // seit 14.23: für PvP (zählt dort nur zum Teil, PVP_DMG.lifeShare)
  s.maxMp += bonus.mp || 0;
  s.crit += bonus.crit || 0;
  s.atkSpeed += bonus.atkSpeed || 0;
  s.dodge += bonus.dodge || 0;
  s.block += bonus.block || 0;
  s.regen += bonus.regen || 0;
  speedMul += bonus.speed || 0;
  s.monsterDmg = bonus.monsterDmg || 0;
  s.hpSteal = bonus.hpSteal || 0;
  s.basicDmg = bonus.basicDmg || 0;
  s.damageTaken -= (bonus.dmgReduce || 0) + (bonus.resist || 0);
  // seit 14.15: Gift, „Stark gegen …“ je Monsterart, Abwehr je Angriffsart, Gold und Beute (Summe, gedeckelt mit BONUS_CAPS)
  for (const k of PLAYER_BONUS_KEYS) s[k] = bonus[k] || 0;
  let magic = 0;
  for (const item of Object.values(eq)) {
    if (!item || !canWear(item, p)) continue;
    if (item === offhand) {
      const dw = offhandRules(p);
      if (!offhandAllows(p, item)) continue;
      const ost = itemStats(item);
      s.atk += Math.round((ost.atk || 0) * dw.atk);
      s.wAvg += Math.round((ost.atk || 0) * dw.atk);
      s.atkSpeed += dw.atkSpeed;
      // Waffenschaden der Nebenhand (seit 13.10, Spanne wie bei der Haupthand)
      if (ost.dmg) { s.wMin += Math.round(ost.dmg[0] * dw.atk); s.wMax += Math.round(ost.dmg[1] * dw.atk); }
      if (ost.crit) s.crit += ost.crit * dw.bonus;
      continue;
    }
    const st = itemStats(item);
    if (st.dmg) { s.wMin += st.dmg[0]; s.wMax += st.dmg[1]; s.wAvg += st.atk || 0; }
    s.atkSpeed += st.atkSpeed || 0;
    magic += st.magic || 0;
    s.atk += st.atk || 0;
    s.def += st.def || 0;
    s.maxHp += st.hp || 0;
    s.maxMp += st.mp || 0;
    s.crit += st.crit || 0;
    s.dodge += st.dodge || 0;
    s.block += st.block || 0;
    s.regen += st.regen || 0;
    speedMul += st.speed || 0;
    // Hauptwert der Klassen-Ausrüstung (seit 13.49) zählt wie Statuspunkte
    for (const at of ['str', 'vit', 'int', 'dex']) if (st[at]) bonus[at] = (bonus[at] || 0) + st[at];
  }
  // Blocken nur mit Schild (und nicht mit einer Zweihandwaffe oder zweitem Schwert)
  const twoHand = eq.waffe && WEAPON_KINDS[eq.waffe.kind] && WEAPON_KINDS[eq.waffe.kind].twoHanded;
  s.block = eq.schild && !offhand && !twoHand ? Math.max(0, Math.min(MAX_BLOCK, s.block)) : 0;
  // Statuswerte (eigene Punkte plus Boni auf der Ausrüstung)
  const own = p.attrs || {};
  // Intelligenz aus Buffs (Arkane Erleuchtung des Magiers, seit 13.1)
  let buffInt = 0;
  for (const b of p.buffs) if (b.effects && b.effects.int) buffInt += b.effects.int;
  const a = { str: (own.str || 0) + (bonus.str || 0), vit: (own.vit || 0) + (bonus.vit || 0), int: (own.int || 0) + (bonus.int || 0) + buffInt, dex: (own.dex || 0) + (bonus.dex || 0) };
  s.atk += Math.round((a.str || 0) * ATTR_PT.str);
  s.maxHp += (a.vit || 0) * 6;
  s.def += (a.vit || 0) * 0.3;
  s.maxMp += (a.int || 0) * 5;
  const mainId = MAIN_ATTR[p.classId];
  const main = Math.min(MAIN_ATTR_CAP, a[mainId] || 0);
  s.skillDmg = 1 + (mainId === 'int' ? 0 : (a.int || 0) * ATTR_PT.int) + main * MAIN_SKILL + (bonus.skillDmg || 0) + magic;
  s.basicDmg += main * MAIN_BASIC;
  s.buffPower = 1 + main * MAIN_BUFF;
  s.magic = magic;
  s.crit += (a.dex || 0) * ATTR_PT.crit;
  s.dodge += (a.dex || 0) * ATTR_PT.dodge;
  s.atkSpeed += (a.dex || 0) * ATTR_PT.speed; // 13.31 bis 14.9: 0,003, davor 0,005
  s.def = Math.round(s.def);
  // Klassensegen (seit 13.1): Naturschaden, kritischer Schaden, Omni-Vampir
  s.natureDmg = 0;
  s.critDmg = bonus.critDmg || 0; // seit 14.15 auch als Bonus der Ausrüstung
  s.omniVamp = 0;
  // Heilkraft (seit 13.26, Segen des Lichts): verstärkt alle Heilungen
  s.healPower = 1;
  for (const b of p.buffs) {
    const e = b.effects;
    if (e.healPower) s.healPower += e.healPower;
    if (e.natureDmg) s.natureDmg += e.natureDmg;
    if (e.critDmg) s.critDmg += e.critDmg;
    if (e.omniVamp) s.omniVamp += e.omniVamp;
    if (e.atk) atkMul += e.atk;
    if (e.atkFlat) atkFlat += e.atkFlat;
    if (e.def) defMul += e.def;
    if (e.skillDmg) s.skillDmg += e.skillDmg;
    if (e.hpSteal) s.hpSteal += e.hpSteal;
    if (e.speed) speedMul += e.speed;
    if (e.atkSpeed) s.atkSpeed += e.atkSpeed;
    if (e.damageTaken) s.damageTaken += e.damageTaken;
    if (e.crit) s.crit += e.crit;
    if (e.dodge) s.dodge += e.dodge;
    if (e.regen) s.regen += e.regen;
    if (e.reflect) s.reflect += e.reflect;
    if (e.chill) s.chill = Math.max(s.chill || 0, e.chill);
    if (e.chillDur) s.chillDur = Math.max(s.chillDur || 0, e.chillDur);
    if (e.defFlat) defFlat += e.defFlat;
    if (e.invisible) s.invisible = true;
  }
  // fester Angriff aus Buffs (Aura des Schwertes, seit 13.4) kommt nach den Prozenten dazu
  s.atk = Math.round(s.atk * atkMul + atkFlat);
  if (main > 0 && s.atk > 0) s.skillDmg *= 1 + (main * MAIN_SKILL_FLAT) / s.atk;
  // seit 13.87: Stärke der Fertigkeiten = Angriff × Fertigkeitsschaden (so rechnet jeder Treffer). skillDmg allein
  // taugt nicht zum Vergleichen: der feste Hauptwert-Anteil oben wird durch den Angriff geteilt, eine bessere Waffe
  // senkt den Faktor also, obwohl jeder Treffer härter wird (Lv-5-Zepter zeigte „+8 % Fertigkeitsschaden“ gegen Lv 80)
  s.skillPower = s.atk * s.skillDmg;
  s.wMul = atkMul;
  s.maxHp = Math.round(s.maxHp * (1 + (bonus.hpPct || 0)));
  s.def = Math.round(s.def * defMul + defFlat);
  // Obergrenzen, damit hohe Ränge und viele Buffs zusammen nicht ausufern
  // Lauftempo (seit 8.5): Gegenstände, Boni und Buffs zählen zu Fuß und sind auf +25 % begrenzt,
  // das Pferd kommt danach dazu
  const foot = Math.min(FOOT_SPEED_CAP, speedMul);
  const ride = p.riding ? rideSpeed(p) : 0;
  s.footMul = foot;
  s.rideMul = ride;
  s.footSpeed = c.base.speed * foot;
  s.speed = c.base.speed * (foot + ride);
  s.atkSpeed = Math.min(2.5, s.atkSpeed);
  // seit 14.32 nie unter 0 (ein Abzug aus Buffs hätte sonst „−30 %“ angezeigt; gewürfelt wurde dann einfach nie)
  s.dodge = Math.max(0, Math.min(DODGE_RULES.cap, s.dodge));
  // seit 14.6: kritische Treffer höchstens 40 % (der Ninja kam mit Geschick, Segen und Ausrüstung auf fast 60 %)
  s.crit = Math.min(PLAYER_CRIT_CAP, s.crit);
  // Weg des Dolches (seit 14.13): 5 % Lebensraub, damit der Nahkampf-Ninja an Seelensteinen mit Wellen länger durchhält
  if (p.classId === 'ninja' && (p.path | 0) === 0) s.hpSteal = (s.hpSteal || 0) + 0.05;
  s.reflect = Math.min(0.8, s.reflect);
  s.regen *= s.healPower;
  s.damageTaken = Math.max(0.4, s.damageTaken);
  return s;
}

// Mehrere Erfahrungsgewinne kurz hintereinander (Flächenangriffe) erscheinen als eine Zahl
function showXpGain() {
  const p = game.player;
  if (!p || !(p.xpPop >= 1)) return;
  addText(p.x, feetY(p) - 74, '+' + Math.round(p.xpPop).toLocaleString('de-DE') + ' EP', 'xpgain');
  p.xpPop = 0;
  ui.xpPulse();
}

function gainXp(amount) {
  const p = game.player;
  if (p.level >= MAX_LEVEL) return;
  // Startbonus (seit 13.10, bis 22.11.): +20 % auf jede Erfahrung
  if (eventXpActive()) amount = Math.round(amount * (1 + EVENT_XP.mul));
  if (!(p.xpPop > 0)) later(0.18, showXpGain);
  p.xpPop = (p.xpPop || 0) + amount;
  p.xp += amount;
  while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level++;
    const sp0 = p.skillPoints || 0;
    p.skillPoints = sp0 + 1;
    clampSkillPoints(p);
    const gotPoint = p.skillPoints > sp0;
    p.statPoints = (p.statPoints || 0) + STAT_POINTS_PER_LEVEL;
    const s = playerStats(p);
    p.hp = s.maxHp;
    p.mp = s.maxMp;
    vfxLevelUp(p);
    snd.player('levelup', { vol: 0.6, rev: 0.5, variants: 1 });
    ui.log('Stufenaufstieg! Du bist jetzt Stufe ' + p.level + '.' + (gotPoint ? ' Du hast einen Fertigkeitspunkt erhalten.' : ''), 'level');
    const unlocked = classSkills(p).find((sk) => sk.unlock === p.level);
    if (unlocked) ui.log('Neue Fertigkeit freigeschaltet: ' + unlocked.name + '.', 'level');
    const tier = ITEM_TIERS.findIndex((t) => t.level === p.level);
    ui.log(`${STAT_POINTS_PER_LEVEL} neue Statuspunkte. Verteile sie im Charakterfenster.`, 'level');
    ui.banner('Stufe ' + p.level, unlocked ? 'Neue Fertigkeit: ' + unlocked.name
      : tier > 0 ? 'Du kannst jetzt Ausrüstung der Stufe ' + p.level + ' tragen' : 'Neuer Fertigkeitspunkt');
    ui.buildSkillBar();
    saveGame();
  }
}

// Lehrmeister (seit 8.7): Fertigkeitsbücher der eigenen Klasse kaufen, Status- und Fertigkeitspunkte zurücksetzen.
// Das erste Zurücksetzen kostet 10.000 Gold, jedes weitere das Doppelte (höchstens 5 Mio.); Status und Fertigkeiten getrennt.
const TEACHER = { bookPrice: 100000, resetBase: 10000, resetMax: 5000000 };
function resetCost(p, kind) {
  const n = (p.resets && p.resets[kind]) || 0;
  return Math.min(TEACHER.resetMax, TEACHER.resetBase * 2 ** n);
}
function payReset(p, kind) {
  const cost = resetCost(p, kind);
  if (p.gold < cost) return false;
  p.gold -= cost;
  p.resets = { stat: 0, skill: 0, ...p.resets };
  p.resets[kind]++;
  return true;
}
// Alle verteilten Statuspunkte zurück
function statPointsSpent(p) {
  return Object.values(p.attrs || {}).reduce((a, v) => a + (v || 0), 0);
}
function resetStats() {
  const p = game.player;
  const spent = statPointsSpent(p);
  if (!spent || !payReset(p, 'stat')) return false;
  p.attrs = { str: 0, vit: 0, int: 0, dex: 0 };
  p.statPoints = (p.statPoints || 0) + spent;
  game.stats = playerStats(p);
  p.hp = Math.min(p.hp, game.stats.maxHp);
  p.mp = Math.min(p.mp, game.stats.maxMp);
  return true;
}
// Fertigkeiten zurücksetzen (seit 10.2): alle fünf auf Stufe 1, auch erweckte (E/H/L/V), alle Fertigkeitspunkte
// zurück (eine je Stufe ab 2). Wahlweise mit neuem Weg der Klasse.
// Seit 14.1 kommen die Gegenstände zurück, die die Stufe mindestens gekostet hat (Rangaufstieg geht schon 2 Stufen vor
// dem Ende eines Rangs): Bücher für E, Schriftrollen für H, Seelensteine für L und V. V kostet so 7 Bücher,
// 8 Schriftrollen und 9 Seelensteine. Gezählt wird nach der Stufe, nicht danach, womit sie vor 14.1 bezahlt wurde.
function skillItemsSpent(lvl) {
  const out = { book: 0, rolle: 0, seelenstein: 0 };
  const r = skillRank(lvl);
  if (r < 0) return out;
  // abgeschlossene Ränge auf dem kürzesten Weg (bis zur drittletzten Stufe), dazu je ein Gegenstand für den Aufstieg
  for (let k = 0; k < r; k++) out[SKILL_RANKS[k].item] += Math.max(0, SKILL_RANKS[k].levels - 3);
  for (let k = 1; k <= r; k++) out[SKILL_RANKS[k].item] += SKILL_RANKS[k].books;
  out[SKILL_RANKS[r].item] += lvl - SKILL_RANKS[r].from;
  return out;
}
// Summe über alle Fertigkeiten (für Lehrmeister und Elementwechsel)
function skillItemsBack(levels) {
  const out = { book: 0, rolle: 0, seelenstein: 0 };
  for (const l of levels || []) { const n = skillItemsSpent(l); for (const k in out) out[k] += n[k]; }
  return out;
}
// Text wie „3 Fertigkeitsbücher, 1 Schriftrolle“ (leer, wenn nichts)
function skillItemsText(n) {
  return ['book', 'rolle', 'seelenstein'].filter((k) => n[k] > 0)
    .map((k) => `${n[k]} ${n[k] === 1 ? SKILL_ITEMS[k].name : SKILL_ITEMS[k].many}`).join(', ');
}
// Fertigkeitspunkte (seit 13.37 begrenzt): mehr als nötig, um alle fünf Fertigkeiten auf E1 zu bringen
// (je 14 Punkte), gibt es nicht. Danach geht es mit Büchern, Schriftrollen und Seelensteinen weiter (seit 14.1).
const SKILL_POINT_CAP = 5 * (SKILL_POINT_MAX - 1);
function skillPointsSpent(levels) {
  return (levels || []).reduce((a, l) => a + (skillRank(l) >= 0 ? SKILL_POINT_MAX - 1 : Math.max(0, Math.min(l, SKILL_POINT_MAX) - 1)), 0);
}
function clampSkillPoints(p) {
  p.skillPoints = Math.max(0, Math.min(p.skillPoints || 0, SKILL_POINT_CAP - skillPointsSpent(p.skillLevels)));
}
function skillPointsBack(p) {
  return skillPointsSpent(p.skillLevels);
}
function canResetSkills(p, path = p.path || 0) {
  return path !== (p.path || 0) || p.skillLevels.some((l) => l > 1);
}
// Was beim Zurücksetzen oder Wegwechsel endet: Buffs der Klasse und der Ultimates, Diener, Geister, Strahl
function endSkillEffects(p) {
  const ids = new Set(CLASSES[p.classId].paths.flatMap((pt) => pt.skills.map((sk) => sk.id)));
  Object.values(ULTIMATES).forEach((u) => { if (u.buff) ids.add(u.buff.id); });
  ids.add('steinhaut');
  ids.add('donnerkrone');
  // seit 13.67 kein Fertigkeits-Buff mehr (Klassensegen), ein noch laufender alter Falkenblick endet trotzdem
  ids.add('falkenblick');
  p.buffs = p.buffs.filter((b) => !ids.has(b.id));
  if (p.channel) stopChannel(p);
  for (const a of game.allies) allyCrumble(a);
  game.allies = [];
  releaseAllyTargets();
}
function giveBooks(p, id, n) {
  for (; n > 0; n -= BOOK_STACK) addBookItem(p, id, Math.min(n, BOOK_STACK), true);
}
function resetSkills(path = game.player.path || 0) {
  const p = game.player;
  const c = CLASSES[p.classId];
  if (!c.paths[path] || !canResetSkills(p, path) || !payReset(p, 'skill')) return false;
  const oldPath = p.path || 0;
  const books = p.skillLevels.map(skillItemsSpent);
  let moved = [];
  let restored = false;
  endSkillEffects(p);
  if (path !== oldPath) {
    // Bücher des alten Wegs in der Tasche werden zu Büchern derselben Plätze im neuen Weg
    c.paths[oldPath].skills.forEach((sk, i) => {
      const n = bookCount(p, sk.id);
      if (n) { takeBooks(p, sk.id, n); giveBooks(p, c.paths[path].skills[i].id, n); }
    });
    // Seit 13.24 bleibt jeder Weg mit seinen Stufen gespeichert (z. B. E2, 10, …): der alte Weg wird gemerkt,
    // ein schon gespielter Weg kommt genau so zurück. Punkte, die dort stecken, bleiben dort; neue Stufen geben
    // neue Punkte. Gelesene Bücher, Schriftrollen und Seelensteine gehören zu ihrem Weg und kommen nicht zurück.
    if (!p.pathSkills || typeof p.pathSkills !== 'object') p.pathSkills = {};
    p.pathSkills[oldPath] = { levels: p.skillLevels.slice(), spent: skillPointsSpent(p.skillLevels) };
    p.path = path;
    moved = enforceGearRules(p);
    const st = p.pathSkills[path];
    if (st && Array.isArray(st.levels) && st.levels.length === 5) {
      p.skillLevels = st.levels.slice();
      p.skillPoints = Math.max(0, p.level - 1 - (st.spent || 0));
      restored = true;
    } else {
      p.skillLevels = [1, 1, 1, 1, 1];
      p.skillPoints = p.level - 1;
    }
    clampSkillPoints(p);
    delete p.pathSkills[path];
    game.stats = playerStats(p);
    p.hp = Math.min(p.hp, game.stats.maxHp);
    p.mp = Math.min(p.mp, game.stats.maxMp);
    return { books: 0, items: null, moved: moved.length, changed: true, restored };
  }
  const skills = classSkills(p);
  // seit 14.1: Bücher zur jeweiligen Fertigkeit, Schriftrollen und Seelensteine als Zähler
  const items = skillItemsBack(p.skillLevels);
  books.forEach((n, i) => giveBooks(p, skills[i].id, n.book));
  p.materials.rolle = (p.materials.rolle || 0) + items.rolle;
  p.materials.seelenstein = (p.materials.seelenstein || 0) + items.seelenstein;
  p.skillLevels = [1, 1, 1, 1, 1];
  p.skillPoints = p.level - 1;
  clampSkillPoints(p);
  game.stats = playerStats(p);
  p.hp = Math.min(p.hp, game.stats.maxHp);
  p.mp = Math.min(p.mp, game.stats.maxMp);
  return { books: items.book, items, moved: moved.length, changed: path !== oldPath };
}
// --- Lager (seit 9.1) ------------------------------------------------------------------------------
// Bei jedem Lagerverwalter (Kazehana und jede Stadt bzw. jedes Lager) liegt dasselbe Lager. Einmal 1.000 Gold,
// danach frei nutzbar, ohne Passwort. 6 Seiten zu je 30 Plätzen. Bücher stapeln sich wie in der Tasche.
const STORAGE = { price: 1000, page: 30, pages: 6 };
const STORAGE_SIZE = STORAGE.page * STORAGE.pages;
function buyStorage(p) {
  if (p.storage) return 'ok';
  if (p.gold < STORAGE.price) return 'gold';
  p.gold -= STORAGE.price;
  p.storage = { open: true, items: [] };
  return 'ok';
}
// Gegenstand aus der Tasche (i) ins Lager; Bücher kommen auf einen passenden Stapel
function storeItem(p, i) {
  const it = p.inventory[i];
  const st = p.storage;
  if (!it || !st) return 'none';
  if (isBook(it)) {
    const stack = st.items.find((x) => x.book === it.book && x.count + it.count <= BOOK_STACK);
    if (stack) {
      stack.count += it.count;
      p.inventory.splice(i, 1);
      return 'ok';
    }
  }
  if (st.items.length >= STORAGE_SIZE) return 'full';
  st.items.push(it);
  p.inventory.splice(i, 1);
  return 'ok';
}
// Gegenstand aus dem Lager (i) in die Tasche
function takeItem(p, i) {
  const st = p.storage;
  const it = st && st.items[i];
  if (!it) return 'none';
  if (isBook(it)) {
    const stack = bagBookStack(p, it.book, it.count); // seit 14.84: nicht auf gesperrten Seiten (sozial-freischalten.js)
    if (stack) {
      stack.count += it.count;
      st.items.splice(i, 1);
      return 'ok';
    }
  }
  if (bagFree(p) <= 0) return 'full';
  delete it.bagPos; // seit 14.84: auf den ersten freien Platz, nie auf eine gesperrte Seite
  p.inventory.push(it);
  st.items.splice(i, 1);
  return 'ok';
}

// Ein Fertigkeitsbuch der eigenen Klasse kaufen (seit 14.1 nur noch für E1–E10; Schriftrollen und Seelensteine
// gibt es beim Lehrmeister nicht)
function buyBook(id) {
  const p = game.player;
  if (p.gold < TEACHER.bookPrice) return 'gold';
  if (!addBookItem(p, id, 1)) return 'bag';
  p.gold -= TEACHER.bookPrice;
  return 'ok';
}

function raiseAttr(id, n = 1) {
  const p = game.player;
  const add = Math.min(n, p.statPoints, MAX_ATTR - (p.attrs[id] || 0));
  if (add <= 0) return;
  p.attrs[id] += add;
  p.statPoints -= add;
  const before = game.stats;
  game.stats = playerStats(p);
  // Mehr Leben oder Mana füllt den neuen Teil gleich auf
  p.hp += Math.max(0, game.stats.maxHp - before.maxHp);
  p.mp += Math.max(0, game.stats.maxMp - before.maxMp);
  ui.renderCharPanel();
  // seit 13.41: Leiste neu bauen, damit der höhere Schaden sofort in den Infofeldern der Fertigkeiten steht
  ui.buildSkillBar();
  const sk0 = classSkills(p).find((sk) => sk.kind === 'angriff' && p.level >= sk.unlock);
  if (id === MAIN_ATTR[p.classId] && sk0 && typeof skillHitNum === 'function') {
    const i0 = classSkills(p).indexOf(sk0);
    addText(p.x, p.y - 52, `${skillRankName(sk0, p.skillLevels[i0])}: ${skillHitNum(sk0.dmg || 1, p.skillLevels[i0], game.stats)} Schaden`, 'info');
  }
  saveGame();
}

// Erwecken: Stufe 15 wird E1, mit eigenem Banner und Leuchten
function awakenSkill(p, i, sk) {
  const e1 = SKILL_RANKS[0];
  p.skillLevels[i] = e1.from;
  // seit 13.39 mit neuem Namen je Rang (rangnamen.js)
  ui.banner('Erweckt!', `${skillRankName(sk, 1)} wird zu ${skillRankName(sk, e1.from)} (${skillLevelText(e1.from)})`);
  ui.log(`${sk.name} ist erwacht und heißt jetzt „${skillRankName(sk, e1.from)}“.`, 'level');
  vfxLevelUp(p);
  rankCastFx(p, 0, e1.color);
  // laufende Diener sofort auf den neuen Rang umbauen (Skelette werden zu Knochenhunden)
  if (sk.type === 'summon') convertAllies(sk, p.skillLevels[i]);
}

function upgradeSkill(i, type = 'point') {
  const p = game.player;
  const sk = classSkills(p)[i];
  const act = skillActions(p, i).find((a) => a.type === type);
  if (!act || !act.ok) return;
  const lvl = p.skillLevels[i];
  if (type === 'point') {
    if (lvl >= SKILL_POINT_MAX) return;
    p.skillLevels[i]++;
    p.skillPoints--;
    // Stufe 15 erreicht: sofort erweckt (E1)
    if (p.skillLevels[i] >= SKILL_POINT_MAX) awakenSkill(p, i, sk);
  } else if (type === 'book') {
    // seit 14.1: E mit Buch, H mit Schriftrolle, L mit Seelenstein
    skillItemTake(p, act.item, sk.id, 1);
    p.skillLevels[i]++;
  } else {
    // in den nächsten Rang (Erwecken kostet seit 8.9 nichts mehr, es passiert auf 15 von selbst)
    const next = SKILL_RANKS[skillRank(lvl) + 1];
    if (next === SKILL_RANKS[0]) awakenSkill(p, i, sk);
    else {
      skillItemTake(p, next.item, sk.id, next.books);
      p.skillLevels[i] = next.from;
      ui.banner(`${next.name}: ${skillRankName(sk, next.from)}`, `${skillRankName(sk, lvl)} wird zu ${skillRankName(sk, next.from)} (${skillLevelText(next.from)})`);
      vfxLevelUp(p);
      rankCastFx(p, skillRank(next.from), next.color);
      // seit 13.94: auch beim Aufstieg nach H, L und V werden laufende Diener umgebaut (Hunde werden zu Drachen)
      if (sk.type === 'summon') convertAllies(sk, p.skillLevels[i]);
    }
  }
  ui.log(`${skillRankName(sk, p.skillLevels[i])} ist jetzt auf Stufe ${skillLevelText(p.skillLevels[i])}.`, 'info');
  refreshBuff(sk, p.skillLevels[i]);
  ui.buildSkillBar();
  ui.renderCharPanel();
  saveGame();
}

// Pferd (seit 7.3, Tempo seit 8.5): Reitpferd aus der Stallmeister-Prüfung (ab Stufe 20) +35 %,
// Kriegsross (ab Stufe 40 beim Stallmeister für 200.000 Gold) +65 %. Das Tempo zählt zusätzlich zum Fußtempo.
// Wer angreift oder eine Fertigkeit nutzt, steigt dabei ab.
// seit 14.18: Reitpferd 100.000 Gold (nach der Prüfung des Stallmeisters), Kriegsross +90 % statt +65 % (insgesamt
// gut 15 % schneller als vorher: 1,65 → 1,90 des Lauftempos zu Fuß)
// seit 14.27: dritte Stufe ist der Drache „Glutschwinge“ (ab Stufe 60 beim Stallmeister für 500.000 Gold, +110 %,
// etwa 10 % schneller als das Kriegsross). Er fliegt knapp über dem Boden: Bäume, Felsen, Wasser, Lava und Abgründe
// halten ihn nicht auf, Mauern, Häuser, Säulen, Höhlenwände und der Felsrand der Karten schon (tileBlockedFlying).
// Fliegen geht nur in der offenen Welt – nicht in Dungeons, Instanzen, Arena, Turnierarena und Duellen.
const HORSES = [null, { name: 'Reitpferd', speed: 0.35, level: 20, price: 100000 }, { name: 'Kriegsross', speed: 0.9, level: 40, price: 200000 },
  { name: 'Glutschwinge', speed: 1.1, level: 60, price: 500000, fly: true }];
// seit 14.39: Farbe der Glutschwinge – beim Stallmeister beim Kauf gewählt (p.dragonColor im Spielstand). Bis 14.66
// jederzeit kostenlos änderbar; seit 14.67 endgültig (p.dragonColorLocked, Rückfrage vor dem Kauf), Käufer von
// vor 14.67 dürfen einmal nachträglich festlegen. 'rot' ist die bisherige Farbe: Standard für alte Spielstände und für Mitspieler,
// deren Version keine Farbe schickt (Netzfeld dc). Farbwerte: drei-drache.js (DRACHE3_FARBEN) und figuren.js
// (DRAGON2D_FARBEN).
const DRAGON_COLORS = {
  rot: { name: 'Rot', swatch: '#7a1f1d', glow: '#ffb63c' },
  blau: { name: 'Blau', swatch: '#24497e', glow: '#7fe0ff' },
  schwarz: { name: 'Schwarz', swatch: '#211c26', glow: '#c45cff' },
  weiss: { name: 'Weiß', swatch: '#e2ded5', glow: '#ffd36a' }
};
const DRAGON_COLOR_IDS = Object.keys(DRAGON_COLORS);
const dragonColorOf = (p) => (p && DRAGON_COLORS[p.dragonColor] ? p.dragonColor : 'rot');
// Tatsächlich gerittene Stufe (seit 14.27): wo der Drache nicht fliegen darf, ritt man bis 14.31 stattdessen das
// Kriegsross. Seit 14.32 bleibt man dort auf dem Drachen, er läuft aber am Boden (p.dragonGround: kein Flug, normale
// Kollision wie zu Fuß) – mit dem Tempo des Kriegsrosses, damit sich in engen Gängen gegenüber 14.31 nichts ändert.
// rideTierNow bleibt für ältere Aufrufer erhalten (ist auf dem Drachen jetzt immer 3).
const rideTierOf = (p) => (p && ((p.horseTier === 3 && p.rideTierNow) || p.horseTier)) || 1;
const rideSpeed = (p) => (p && p.dragonGround && rideTierOf(p) === 3 ? HORSES[2] : HORSES[rideTierOf(p)] || HORSES[1]).speed;
const hasDragon = (p) => !!(p && p.horse && p.horseTier === 3);
// Darf der Drache hier fliegen? Nur in der offenen Welt (eine der Karten), ohne Dungeon, Duell und Turnierkampf.
// Dungeons, Instanzen, die Prüfungsarena und die Turnierarena liegen außerhalb der Karten (mapOfTile ist leer).
function dragonSkyOk(p) {
  if (!p || !game.world) return false;
  if (!mapOfTile(Math.floor(p.x / TILE), Math.floor(p.y / TILE))) return false;
  if (zoneAt(p.x, p.y).dungeon) return false;
  if (game.duel) return false;
  if (typeof pvpActive === 'function' && pvpActive()) return false;
  return true;
}
// Nächste Stelle, an der man zu Fuß stehen kann (zum Landen über Wasser, Bäumen oder Lava): Ring um Ring um die
// eigene Kachel, die nächste freie Kachelmitte gewinnt. Fallback: das Lager bzw. die Stadt der Karte.
function landingSpot(p) {
  const r = (p.r || 11) * 0.7;
  if (canStand(p.x, p.y, r, false)) return null;
  const tx0 = Math.floor(p.x / TILE);
  const ty0 = Math.floor(p.y / TILE);
  for (let ring = 1; ring <= 24; ring++) {
    let best = null;
    let bd = Infinity;
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const x = (tx0 + dx + 0.5) * TILE;
        const y = (ty0 + dy + 0.5) * TILE;
        if (!canStand(x, y, r, false)) continue;
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < bd) {
          bd = d;
          best = { x, y };
        }
      }
    }
    if (best) return best;
  }
  return villageSpawn(p);
}
// Nach dem Landen auf einer blockierten Stelle (Wasser, Baum, Lava …) zur nächsten freien Stelle versetzen
function landSafely(p) {
  const at = landingSpot(p);
  if (!at) return false;
  p.x = at.x;
  p.y = at.y;
  if (typeof input !== 'undefined') input.walkTo = null;
  return true;
}
function toggleRide(on) {
  const p = game.player;
  if (!p || p.dead || !p.horse) {
    if (p && !p.horse) ui.log('Du hast noch kein Pferd. Jeder Stallmeister (Jun in Kazehana und in jedem Lager) hat eine Prüfung für dich (ab Stufe 20).', 'warn');
    return;
  }
  const next = on == null ? !p.riding : on;
  if (next === !!p.riding) return;
  if (next && game.time - p.lastCombat < 3) {
    addText(p.x, p.y - 34, 'Nicht mitten im Kampf', 'info');
    return;
  }
  const dragon = hasDragon(p);
  // seit 14.27: wo der Drache nicht fliegen darf (Dungeon, Instanz, Arena, Duell), ritt man das Kriegsross;
  // seit 14.32 läuft dort der Drache selbst am Boden (Tempo wie das Kriegsross)
  const ground = next && dragon && !dragonSkyOk(p);
  if (ground) ui.log('Hier kann deine Glutschwinge nicht fliegen – sie trägt dich am Boden (so schnell wie ein Kriegsross).', 'info');
  p.riding = next;
  p.flying = next && dragon && !ground;
  // seit 14.39: Aufsitzen beginnt immer „tief“, Absteigen landet aus jeder Flughöhe
  p.flyHigh = false;
  p.dragonGround = ground;
  p.rideTierNow = p.horseTier || 1;
  // abgestiegen über Wasser, Bäumen oder Lava: an der nächsten freien Stelle landen
  if (!next && dragon) landSafely(p);
  game.stats = playerStats(p);
  particles(p.x, feetY(p), { count: 16, color: dragon ? ['#d8c2a0', '#b89878'] : ['#c9b28a', '#a88f62'], speed: [30, 90], life: [0.3, 0.6], size: [2, 4], drag: 3, glow: false });
  if (dragon) ui.log(next ? 'Du schwingst dich auf deine Glutschwinge.' : 'Deine Glutschwinge landet, du steigst ab.', 'info');
  else ui.log(next ? 'Du sitzt auf deinem Pferd.' : 'Du steigst ab.', 'info');
  // seit 10.6: das Pferd wiehert, wenn man es ruft, und schnaubt beim Absteigen; der Drache (seit 14.27) ruft kurz
  // und landet mit Flügelschlägen (erzeugte Klänge, klang-welt.js)
  if (typeof snd !== 'undefined') {
    if (dragon) { if (snd.dragon) snd.dragon(p, next ? 'ruf' : 'land'); }
    else snd.horse(p, next ? 'neigh' : 'snort');
  }
  ui.updateHorseButton();
}
// --- Flughöhe auf dem Drachen (seit 14.39) -----------------------------------------------------------------------
// Im Flug kann man zwischen „tief“ (wie bisher, knapp über den Bäumen) und „hoch“ wechseln (Taste X bzw. Bild↑/
// Bild↓, Knopf neben dem Drachen-Knopf). Tempo, Kampf und alles andere bleiben gleich; seit 14.45 fliegt man oben
// über alles hinweg (Häuser, Mauern, Seelensteine, Portale – flyingOverAll in welt.js), tief wie bisher. p.flyHigh ist der Wunsch; wirksam nur im
// Flug (dragonFlying). Absteigen, Angriff/Fertigkeit (steigt ab), Tod, Dungeon/Instanz/Arena/Duell (Boden) und
// Teleport setzen auf „tief“ zurück. Mitspieler bekommen es als Netzfeld fh.
const DRAGON_HIGH = { up: 1.2, down: 1.0 };
const dragonFlying = (p) => !!(p && p.riding && !p.dead && rideTierOf(p) === 3 && !p.dragonGround);
// Weicher Übergang 0 (tief) … 1 (hoch), je Figur in Spielzeit: Steigen 1,2 s, Sinken 1,0 s (geglättet).
// p.__fhDir: +1 steigt, -1 sinkt, 0 ruhig (für den Flügelschlag in 3D). Mehrfach je Bild aufrufbar.
function dragonHighK(p) {
  if (!p) return 0;
  const want = p.flyHigh && dragonFlying(p) ? 1 : 0;
  const t = game.time;
  const dt = Math.min(2, Math.max(0, t - (p.__fhAt ?? t)));
  p.__fhAt = t;
  let k = p.__fhK || 0;
  if (want > k) k = Math.min(1, k + dt / DRAGON_HIGH.up);
  else if (want < k) k = Math.max(0, k - dt / DRAGON_HIGH.down);
  p.__fhK = k;
  p.__fhDir = want > k ? 1 : want < k ? -1 : 0;
  return k * k * (3 - 2 * k);
}
// Steigen (on = true), Sinken (false) oder wechseln (nichts)
function setFlyHigh(on) {
  const p = game.player;
  if (!dragonFlying(p)) return;
  const next = on == null ? !p.flyHigh : !!on;
  if (next === !!p.flyHigh) return;
  p.flyHigh = next;
  if (typeof snd !== 'undefined' && snd.dragon) snd.dragon(p, next ? 'steig' : 'sink');
  if (typeof ui !== 'undefined' && ui.updateFlyButton) ui.updateFlyButton();
}
// Jedes Bild vor dem Laufen: der Drache landet von selbst, wo er nicht fliegen darf (Dungeon, Arena, Duell …),
// und wer nicht (mehr) fliegt, steht nie auf Wasser oder in einem Baum
function dragonRideTick(p) {
  if (!p) return;
  dragonRideTick0(p);
  // seit 14.39: Flughöhe nur im Flug (nach dem Bodenzustand oben geprüft); nach einem Sprung der Position
  // (Teleport, Reise, Dungeon, Wiederbeleben, Landen auf freier Stelle) sofort wieder „tief“, ohne sichtbares Sinken
  const jump = p.__fhX != null && Math.hypot(p.x - p.__fhX, p.y - p.__fhY) > 4 * TILE;
  p.__fhX = p.x;
  p.__fhY = p.y;
  if (p.flyHigh && (jump || !dragonFlying(p))) p.flyHigh = false;
  if (jump) p.__fhK = 0;
  // seit 14.45: oben fliegt man über Häuser, Mauern, Seelensteine und Portale (flyingOverAll, welt.js). Sinken erst,
  // wenn darunter Platz ist – sonst steckte der Drache nach dem Sinken in einem Haus fest
  if (!p.flyHigh && !jump && dragonFlying(p) && (p.__fhK || 0) > 0.05 && typeof canSinkHere === 'function' && !canSinkHere(p)) {
    p.flyHigh = true;
    if (p === game.player && typeof ui !== 'undefined' && ui.log && !(game.time - (p.__noSinkAt || -99) < 4)) {
      p.__noSinkAt = game.time;
      ui.log('Hier kann der Drache nicht sinken – erst über freien Boden fliegen.', 'warn');
    }
  }
  if (typeof ui !== 'undefined' && ui.updateFlyButton) ui.updateFlyButton();
}
function dragonRideTick0(p) {
  if (p.dead) return;
  if (p.riding && hasDragon(p)) {
    // seit 14.27: statt abzusteigen landet der Drache; seit 14.32 läuft er dort am Boden weiter (vorher Kriegsross),
    // draußen fliegt er wieder. Jedes Bild vor dem Laufen geprüft: Eintritt, Teleport, Wiederverbinden, Laden.
    const sky = dragonSkyOk(p);
    p.rideTierNow = p.horseTier || 1;
    if (p.dragonGround !== !sky) {
      p.dragonGround = !sky;
      game.stats = playerStats(p);
      if (typeof ui !== 'undefined' && ui.updateHorseButton) ui.updateHorseButton();
    }
    if (sky) { p.flying = true; return; }
    if (p.flying) { p.flying = false; landSafely(p); }
    return;
  }
  p.rideTierNow = p.horseTier || 1;
  if (p.dragonGround) {
    p.dragonGround = false;
    if (p.riding) game.stats = playerStats(p);
  }
  if (p.flying) {
    p.flying = false;
    landSafely(p);
  }
}

// Trinken: nimmt die kleinste Größe, die das Fehlende auffüllt, sonst die größte vorhandene.
// Seit 6.6 je Sorte 3 s Abklingzeit (kein Durchtrinken), Leben und Mana getrennt.
const POTION_CD = 3;
// sizeId (seit 11.0, aus den Vorräten im Inventar): genau diese Größe trinken
function usePotion(kind, sizeId) {
  const p = game.player;
  if (!p || p.dead) return;
  if (!p.potCd) p.potCd = { hp: 0, mp: 0 };
  if (p.potCd[kind] > 0) {
    addText(p.x, p.y - 34, `Noch ${p.potCd[kind].toFixed(1).replace('.', ',')} s`, 'info');
    return;
  }
  const s = game.stats;
  const name = potionInfo(kind).plural;
  if (potionTotal(p, kind) <= 0) {
    ui.log('Keine ' + name + ' mehr. Die Händlerin im Dorf verkauft neue.', 'warn');
    return;
  }
  const hp = kind === 'hp';
  if (hp && p.hp >= s.maxHp) return;
  if (!hp && p.mp >= s.maxMp) return;
  const missing = hp ? s.maxHp - p.hp : s.maxMp - p.mp;
  const have = POTION_SIZES.filter((sz) => (p.potions[potKey(kind, sz.id)] || 0) > 0);
  // die kleinste Größe, die das Fehlende (fast) auffüllt, sonst die größte vorhandene
  const size = (sizeId && have.find((sz) => sz.id === sizeId)) || have.find((sz) => (hp ? sz.hp : sz.mp) >= missing * 0.9) || have[have.length - 1];
  p.potions[potKey(kind, size.id)]--;
  p.potCd[kind] = POTION_CD;
  vfxPotion(p, kind);
  snd.player('potion', { vol: 0.4 });
  // seit 14.32: im Duell und in der Turnierarena wirken Tränke zu PVP_DMG.potion (85 %) – so bleibt die Heilung im PvP
  // trotz der stärkeren Tränke etwa wie vorher (die PvP-Messung aus 14.30 gilt weiter)
  const k = typeof pvpActive === 'function' && pvpActive() ? PVP_DMG.potion : 1;
  if (hp) {
    // nur die wirklich geheilte Menge anzeigen, ganzzahlig (Leben hat durch Regeneration Nachkommastellen)
    const amount = Math.min(Math.round(size.hp * k), s.maxHp - p.hp);
    p.hp = Math.min(s.maxHp, p.hp + amount);
    addText(p.x, p.y - 30, `+${Math.round(amount).toLocaleString('de-DE')} Leben`, 'heal');
  } else {
    const amount = Math.min(Math.round(size.mp * k), s.maxMp - p.mp);
    p.mp = Math.min(s.maxMp, p.mp + amount);
    addText(p.x, p.y - 30, `+${Math.round(amount).toLocaleString('de-DE')} Mana`, 'mana');
  }
}

// --- Speichern ------------------------------------------------------------
// Seit 7.4: bis zu vier Charaktere (Plätze 0–3). Jeder Platz trägt savedAt; ein gelöschter Platz bleibt als
// { deleted: true, savedAt } stehen, damit das Löschen beim Abgleich mit dem Konto (konto.js) mitwandert.
// Der zuletzt gespielte Charakter steht zusätzlich unter dem alten Schlüssel (Sicherung, ältere Versionen).
const SLOTS_KEY = 'seelenstein.charaktere.v2';
const MAX_CHARS = 4;
let saveSlot = null;

// Umbenannte Fertigkeiten (alte ID -> neue ID); gilt für Spielstände und für Bücher aus dem Handel
const SKILL_RENAMED = { giftpfeil: 'tarnung', klingensturm: 'hinterhalt', giftnebel: 'blitzangriff', dreifachschlag: 'sichelwelle', sturmangriff: 'sprungschlag', schildstoss: 'felsenfaust',
  seelenpfeil: 'schaedelsalve', seelensturm: 'seelenkaefig', fluch: 'seelenschnitter', frostlanze: 'eisstrahl', seelenschnitter: 'totenruf',
  // 11.5: Feuer- und Blitzmagier umgebaut
  feuernova: 'glutfeld', flammenschritt: 'brand', glutherz: 'phoenix', blitznova: 'blitzspeer', ladung: 'gewitter',
  erdnova: 'steinschlag', erdsprung: 'erdspitzen', basalthaut: 'bergsturz',
  // 11.7: Nekromant ohne Buffs, Weg der Knochen neu
  schaedelsalve: 'blutsauger', dunklemacht: 'geisterflut', knochenspeer: 'knochenwurf', knochenpanzer: 'blutlarve', laehmung: 'totenhand', blutopfer: 'blutlanzen',
  // 13.39: Feuermagier – Glutfeld statt Drachenodem
  drachenodem: 'glutfeld',
  // 13.40: Feuertornados statt Flammenkreis
  flammenkreis: 'feuertornado',
  // 13.54: Frostmagier – Blizzard (Schneesturm) statt Kristallgrab
  kristallgrab: 'schneesturm',
  // 13.64: Frostmagier – Eisgefängnis (Flächen-Betäubung) statt Frostpanzer; Platz 4, Stufe und Bücher gehen mit
  frostpanzer: 'eisgefaengnis',
  // 13.57: Ninja – Weg des Schattens wird zum Weg des Falken (Bogen); Hinterhalt und Tarnung bleiben beim Dolch-Weg
  // (seit 13.76 führt der Schattensprung gleich zum Pfeilregen, die Liste wird nur einmal nachgeschlagen)
  schattensprung: 'pfeilregen', laehmklinge: 'durchschuss',
  // 13.67: Falkenblick wird Klassensegen, auf Platz 5 kommt der Schattenschritt (Stufen und Bücher gehen mit)
  schattenmantel: 'schattenwechsel', falkenblick: 'schattenwechsel',
  // 13.70: Giftfalle statt Pfeilhagel (Platz 2: Stufe, Rang und Leistenplatz bleiben, Schriftrollen in Tasche, Lager,
  // Konto-Lager, Post und Handel werden mitgenommen); seit 13.76 Pfeilregen statt Giftfalle – beide zeigen direkt dorthin
  pfeilhagel: 'pfeilregen', giftfalle: 'pfeilregen',
  // 13.85: Dolch-Ninja – Schattenkette (Angriff) statt Leichtfüßigkeit (Buff), Platz 5: Stufe, Rang, Leistenplatz und
  // Bücher (Tasche, Lager, Konto-Lager, Post, Handel) gehen mit
  leichtfuessigkeit: 'schattenkette',
  // 14.16: Bogen-Ninja – Splitterfalke (Flächenschaden am gewählten Ort) statt Rückensprung, Platz 4: Stufe, Rang,
  // Leistenplatz und Bücher (Tasche, Lager, Konto-Lager, Post, Handel) gehen mit
  rueckensprung: 'splitterfalke' };
// seit 13.76: Ketten auflösen (z. B. Seelenpfeil → Schädelsalve → Blutsauger), damit ein einziges Nachschlagen reicht
for (const k of Object.keys(SKILL_RENAMED)) {
  let v = SKILL_RENAMED[k];
  for (let n = 0; n < 10 && SKILL_RENAMED[v] && SKILL_RENAMED[v] !== v; n++) v = SKILL_RENAMED[v];
  SKILL_RENAMED[k] = v;
}
// Spielstand prüfen und alte Namen nachziehen
function fixSave(data) {
  if (!data || data.deleted || !CLASSES[data.classId] || typeof data.name !== 'string') return null;
  // Version 5.2: Giftpfeil wurde durch Tarnung ersetzt
  // Version 6.3: Klingensturm wurde zu Hinterhalt, Giftnebel zu Blitzangriff
  // Version 8.3: Dreifachschlag → Sichelwelle, Sturmangriff → Sprungschlag, Schildstoß → Felsenfaust
  // Version 8.5: Seelenpfeil → Schädelsalve, Seelensturm → Seelenkäfig, Fluch der Schwäche → Seelenschnitter
  // Version 9.6: Frostlanze → Eisstrahl (auch im Lager); Version 10.0: Seelenschnitter → Totenruf
  for (const it of data.inventory || []) if (it && SKILL_RENAMED[it.book]) it.book = SKILL_RENAMED[it.book];
  for (const it of (data.storage && data.storage.items) || []) if (it && SKILL_RENAMED[it.book]) it.book = SKILL_RENAMED[it.book];
  return data;
}

function readSlots() {
  let st = null;
  try { st = JSON.parse(localStorage.getItem(SLOTS_KEY) || 'null'); } catch { st = null; }
  if (!st || !Array.isArray(st.slots)) {
    st = { slots: [], last: null };
    // alter einzelner Spielstand wird Platz 1
    try {
      const old = fixSave(JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'));
      if (old) {
        st.slots[0] = Object.assign({ savedAt: Date.now() }, old);
        st.last = 0;
        localStorage.setItem(SLOTS_KEY, JSON.stringify(st));
      }
    } catch { /* kaputt oder privat */ }
  }
  for (let k = 0; k < MAX_CHARS; k++) if (st.slots[k] === undefined) st.slots[k] = null;
  st.slots.length = MAX_CHARS;
  return st;
}

function writeSlots(st, quiet) {
  try { localStorage.setItem(SLOTS_KEY, JSON.stringify(st)); } catch { /* privat */ }
  if (!quiet && typeof cloudSoon === 'function') cloudSoon();
}

// Charakter einer Klasse, die dieses Spiel noch nicht kennt (gespeichert von einer neueren Version, seit 8.6):
// der Platz bleibt belegt, damit ihn hier niemand überschreibt
function unknownSave(sv) {
  return !!(sv && !sv.deleted && typeof sv.classId === 'string' && !CLASSES[sv.classId]);
}
function slotTaken(sv) {
  return !!fixSave(sv) || unknownSave(sv);
}

// Alle vier Plätze für die Charakterauswahl (null = frei, unknown = braucht eine neuere Version)
function listSaves() {
  return readSlots().slots.map((sv) => fixSave(sv) ||
    (unknownSave(sv) ? { unknown: true, name: typeof sv.name === 'string' ? sv.name : '?', classId: sv.classId, level: sv.level | 0 } : null));
}
function lastSlot() {
  const st = readSlots();
  return st.last != null && fixSave(st.slots[st.last]) ? st.last : null;
}

// Platz für einen Spielstand: derselbe Charakter (Name und Klasse) oder der erste freie
function slotFor(save) {
  const st = readSlots();
  const same = st.slots.findIndex((sv) => fixSave(sv) && sv.name === save.name && sv.classId === save.classId);
  if (same >= 0) return same;
  const free = st.slots.findIndex((sv) => !slotTaken(sv));
  return free >= 0 ? free : null;
}

function loadSave(slot) {
  const st = readSlots();
  const k = slot != null ? slot : saveSlot != null ? saveSlot : st.last;
  if (k == null) return null;
  return fixSave(st.slots[k]);
}

function saveGame() {
  const p = game.player;
  // auf einem anderen Gerät weitergespielt: dieses Spiel ist veraltet und speichert nicht mehr
  if (!p || (typeof account !== 'undefined' && account.stale)) return;
  const data = {};
  for (const f of SAVE_FIELDS) data[f] = p[f];
  if (p.dead) {
    const spawn = villageSpawn();
    data.x = spawn.x;
    data.y = spawn.y;
    data.hp = null;
  }
  const st = readSlots();
  if (saveSlot == null) saveSlot = slotFor(data);
  if (saveSlot == null) saveSlot = st.last != null ? st.last : 0;
  // neuer Zeitstempel nur bei echtem Fortschritt (nicht fürs bloße Herumstehen): so überschreibt ein
  // vergessenes, offenes Spiel auf einem anderen Gerät beim Abgleich nicht den neueren Stand
  const prev = st.slots[saveSlot];
  data.savedAt = prev && !prev.deleted && saveCore(prev) === saveCore(data) ? prev.savedAt : Date.now();
  st.slots[saveSlot] = data;
  st.last = saveSlot;
  writeSlots(st);
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Speicher nicht verfügbar (z. B. privates Fenster) – das Spiel läuft trotzdem
  }
}

// Spielstand ohne Werte, die sich ständig ändern (Ort, Leben, Spielzeit)
const SAVE_VOLATILE = new Set(['savedAt', 'playTime', 'x', 'y', 'hp', 'mp', 'riding']);
function saveCore(sv) {
  return JSON.stringify(sv, (k, v) => (SAVE_VOLATILE.has(k) ? undefined : v));
}

// Charakter löschen (bleibt als Grabstein stehen, damit das Konto es mitbekommt)
function deleteSave(slot = saveSlot) {
  const st = readSlots();
  if (slot == null) return;
  st.slots[slot] = { deleted: true, savedAt: Date.now() };
  if (st.last === slot) st.last = null;
  if (saveSlot === slot) saveSlot = null;
  writeSlots(st);
  try {
    const old = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!old || !st.slots.some((sv) => fixSave(sv) && sv.name === old.name && sv.classId === old.classId)) localStorage.removeItem(SAVE_KEY);
  } catch { /* egal */ }
}
