// Spielfigur: Erstellen, Werte berechnen, Erfahrung, Speichern.

const SAVE_KEY = 'seelenstein.spielstand.v1';
const MAX_LEVEL = 99;
// Fertigkeiten: Stufe 1–15 mit Fertigkeitspunkten. Auf Stufe 15 erweckt ein Klick die Fertigkeit
// (E1, kostet einen Punkt). In den Rängen steigt man mit Fertigkeitsbüchern; aus den letzten drei
// Stufen eines Rangs geht es mit mehreren Büchern in den nächsten Rang.
// E1 bleibt intern Stufe 18, die Stufen 16/17 werden seit 8.5 nicht mehr erreicht.
const SKILL_POINT_MAX = 15;
const SKILL_BASE_MAX = 17; // Kurvenanker für dmgScale/buffScale, nicht ändern
const SKILL_RANKS = [
  { id: 'E', name: 'Erwacht', from: 18, levels: 10, minLevel: 1, books: 0, color: '#9fd0ff' },
  { id: 'H', name: 'Heroisch', from: 28, levels: 10, minLevel: 35, books: 3, color: '#c58cff' },
  { id: 'L', name: 'Legendär', from: 38, levels: 10, minLevel: 50, books: 5, color: '#ffd34d' },
  { id: 'V', name: 'Vollendet', from: 48, levels: 1, minLevel: 65, books: 10, color: '#ff6a4a' }
];
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
  const rank = SKILL_RANKS[r];
  const pos = lvl - rank.from + 1;
  const have = bookCount(p, sk.id);
  if (pos < rank.levels) out.push({ type: 'book', label: `Schriftrolle lesen (${have})`, ok: have > 0, why: `Keine Schriftrolle „${sk.name}“` });
  const next = SKILL_RANKS[r + 1];
  if (next && pos >= rank.levels - 2) {
    out.push({ type: 'rankup', label: `${next.name} → ${next.levels === 1 ? next.id : next.id + '1'} (${have}/${next.books} Schriftrollen)`, ok: have >= next.books && p.level >= next.minLevel, why: p.level < next.minLevel ? `ab Stufe ${next.minLevel}` : `${next.books} Schriftrollen „${sk.name}“ nötig` });
  }
  return out;
}

// Reihenfolge der Fertigkeiten in der Leiste: Platz -> Fertigkeit
const SKILL_HOLD_MS = 500;
// Seit 10.7 darf ein Platz leer sein (null): Fertigkeiten lassen sich aus der Leiste ziehen
function skillOrder(p) {
  const o = p.skillOrder;
  const used = Array.isArray(o) ? o.filter((k) => k != null) : [];
  const ok = Array.isArray(o) && o.length === 5 && used.every((k) => Number.isInteger(k) && k >= 0 && k < 5) && new Set(used).size === used.length;
  if (!ok) p.skillOrder = [0, 1, 2, 3, 4];
  return p.skillOrder.slice();
}

// Diese Felder landen im Spielstand
const SAVE_FIELDS = ['name', 'classId', 'path', 'level', 'xp', 'gold', 'skillPoints', 'skillLevels', 'potions',
  'splinters', 'kills', 'stones', 'deaths', 'hp', 'mp', 'x', 'y', 'playTime', 'equipment', 'inventory', 'scrolls', 'itemsVersion', 'attrs', 'statPoints', 'materials', 'worldVersion', 'quests', 'upmats', 'books', 'skillOrder', 'horse', 'riding', 'dualWield', 'ultCd', 'friends', 'guild', 'look', 'daily', 'horseTier', 'resets', 'storage', 'quick', 'quickSet'];

// Statuspunkte: pro Stufe 3 Punkte, frei auf vier Werte verteilbar
const STAT_POINTS_PER_LEVEL = 1; // seit 10.1 (vorher 3): sonst ist man zu schnell durch
const MAX_ATTR = 90;
const ATTRS = [
  { id: 'str', name: 'Stärke', short: 'STR', text: '+1 Angriff je Punkt' },
  { id: 'vit', name: 'Vitalität', short: 'VIT', text: '+6 Leben und +0,3 Rüstung je Punkt' },
  { id: 'int', name: 'Intelligenz', short: 'INT', text: '+5 Mana und +1 % Fertigkeitsschaden je Punkt' },
  { id: 'dex', name: 'Geschick', short: 'DEX', text: '+0,3 % kritische Treffer, +0,25 % Ausweichen und +0,5 % Angriffstempo je Punkt' }
];
// Hauptwert jeder Klasse: stärkt je Punkt zusätzlich Fertigkeiten, normale Angriffe und Buffs (Auren, Heilung, Schilde).
// Bei Intelligenz als Hauptwert ersetzt das den allgemeinen Fertigkeitsschaden der Intelligenz.
const MAIN_ATTR = { krieger: 'str', ninja: 'dex', schamane: 'int', nekromant: 'int', magier: 'int' };
const MAIN_SKILL = 0.012;
// Mehr als so viele Punkte (eigene plus Ausrüstung) zählen für den Hauptwert-Bonus nicht
const MAIN_ATTR_CAP = 120;
const MAIN_BASIC = 0.01;
const MAIN_BUFF = 0.01;

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
    materials: { boniPlus: 0, boni5: 0, switcher: 0, star: 0 },
    worldVersion: WORLD_VERSION, quests: null, upmats: {}, books: 0
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
  // Wer schon ein Pferd hat, reitet ab 7.3 das Reitpferd (Stufe 1)
  p.horseTier = p.horse ? Math.max(1, save.horseTier || 1) : 0;
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
  // Waffe, Rüstung und Helm gehören jetzt einer Klasse; alte Gegenstände bekommen die eigene
  Object.values(p.equipment).forEach((it) => assignClass(it, p.classId));
  p.inventory.forEach((it) => { if (!isBook(it)) assignClass(it, p.classId); });
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
  p.materials = { boniPlus: 0, boni5: 0, switcher: 0, star: 0, ...(save.materials || {}) };
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
  }
  // Die Welt ist größer geworden: alte Positionen passen nicht mehr. Aus Welt 6 (6.2/6.3), Welt 7 (bis 10.5) und
  // Welt 8 (10.6) geht es im Lager derselben Map weiter, sonst im Dorf.
  let campOf = null;
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
    }
    p.x = null;
    p.y = null;
  }
  p.worldVersion = WORLD_VERSION;
  const stats = playerStats(p);
  if (p.hp == null || p.hp <= 0) p.hp = stats.maxHp;
  if (p.mp == null) p.mp = stats.maxMp;
  const camp = campOf && game.world && game.world.maps ? game.world.maps.find((m) => m.id === campOf) : null;
  const spawn = camp ? camp.spawn : villageSpawn();
  if (p.x == null || !canStand(p.x, p.y, p.r * 0.7, false)) {
    p.x = spawn.x;
    p.y = spawn.y;
  }
  return p;
}

// Obergrenze des Lauftempos zu Fuß (Schuhe, Boni, Buffs), das Pferd zählt nicht mit
const FOOT_SPEED_CAP = 1.25;

// Endwerte aus Klasse, Stufe und aktiven Buffs
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
    invisible: false
  };
  let atkMul = 1;
  let defMul = 1;
  let speedMul = 1;
  // Boni der Ausrüstung
  const bonus = {};
  const eq = p.equipment || {};
  // Ein zweites Schwert in der Nebenhand zählt nur zum Teil
  const offhand = isOffhand(eq.schild) ? eq.schild : null;
  for (const item of Object.values(eq)) {
    if (!item || !canWear(item, p)) continue;
    const share = item === offhand ? DUAL_WIELD.bonus : 1;
    for (const [k, v] of Object.entries(itemBonusStats(item))) bonus[k] = (bonus[k] || 0) + v * share;
  }
  for (const [k, cap] of Object.entries(BONUS_CAPS)) if (bonus[k] > cap) bonus[k] = cap;
  s.atk += bonus.atk || 0;
  s.def += bonus.def || 0;
  s.maxHp += bonus.hp || 0;
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
  let magic = 0;
  for (const item of Object.values(eq)) {
    if (!item || !canWear(item, p)) continue;
    if (item === offhand) {
      if (!canDualWield(p)) continue;
      s.atk += Math.round((itemStats(item).atk || 0) * DUAL_WIELD.atk);
      s.atkSpeed += DUAL_WIELD.atkSpeed;
      continue;
    }
    const st = itemStats(item);
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
  }
  // Blocken nur mit Schild (und nicht mit einer Zweihandwaffe oder zweitem Schwert)
  const twoHand = eq.waffe && WEAPON_KINDS[eq.waffe.kind] && WEAPON_KINDS[eq.waffe.kind].twoHanded;
  s.block = eq.schild && !offhand && !twoHand ? Math.min(MAX_BLOCK, s.block) : 0;
  // Statuswerte (eigene Punkte plus Boni auf der Ausrüstung)
  const own = p.attrs || {};
  const a = { str: (own.str || 0) + (bonus.str || 0), vit: (own.vit || 0) + (bonus.vit || 0), int: (own.int || 0) + (bonus.int || 0), dex: (own.dex || 0) + (bonus.dex || 0) };
  s.atk += (a.str || 0) * 1;
  s.maxHp += (a.vit || 0) * 6;
  s.def += (a.vit || 0) * 0.3;
  s.maxMp += (a.int || 0) * 5;
  const mainId = MAIN_ATTR[p.classId];
  const main = Math.min(MAIN_ATTR_CAP, a[mainId] || 0);
  s.skillDmg = 1 + (mainId === 'int' ? 0 : (a.int || 0) * 0.01) + main * MAIN_SKILL + (bonus.skillDmg || 0) + magic;
  s.basicDmg += main * MAIN_BASIC;
  s.buffPower = 1 + main * MAIN_BUFF;
  s.magic = magic;
  s.crit += (a.dex || 0) * 0.003;
  s.dodge += (a.dex || 0) * 0.0025;
  s.atkSpeed += (a.dex || 0) * 0.005;
  s.def = Math.round(s.def);
  for (const b of p.buffs) {
    const e = b.effects;
    if (e.atk) atkMul += e.atk;
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
    if (e.invisible) s.invisible = true;
  }
  s.atk = Math.round(s.atk * atkMul);
  s.maxHp = Math.round(s.maxHp * (1 + (bonus.hpPct || 0)));
  s.def = Math.round(s.def * defMul);
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
  s.dodge = Math.min(0.45, s.dodge);
  s.reflect = Math.min(0.8, s.reflect);
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
  if (!(p.xpPop > 0)) later(0.18, showXpGain);
  p.xpPop = (p.xpPop || 0) + amount;
  p.xp += amount;
  while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level++;
    p.skillPoints++;
    p.statPoints = (p.statPoints || 0) + STAT_POINTS_PER_LEVEL;
    const s = playerStats(p);
    p.hp = s.maxHp;
    p.mp = s.maxMp;
    vfxLevelUp(p);
    snd.player('levelup', { vol: 0.6, rev: 0.5, variants: 1 });
    ui.log('Stufenaufstieg! Du bist jetzt Stufe ' + p.level + '. Du hast einen Fertigkeitspunkt erhalten.', 'level');
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
// zurück (eine je Stufe ab 2). Die gelesenen Bücher kommen als Bücher zurück – so viele, wie der Rang mindestens
// gekostet hat (Rangaufstieg geht schon 2 Stufen vor dem Ende eines Rangs). Wahlweise mit neuem Weg der Klasse.
function skillBooksSpent(lvl) {
  const r = skillRank(lvl);
  if (r < 0) return 0;
  let n = lvl - SKILL_RANKS[r].from;
  for (let k = 1; k <= r; k++) n += Math.max(0, SKILL_RANKS[k - 1].levels - 3) + SKILL_RANKS[k].books;
  return n;
}
function skillPointsBack(p) {
  return p.level - 1 - (p.skillPoints || 0);
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
  const books = p.skillLevels.map(skillBooksSpent);
  let moved = [];
  endSkillEffects(p);
  if (path !== oldPath) {
    // Bücher des alten Wegs in der Tasche werden zu Büchern derselben Plätze im neuen Weg
    c.paths[oldPath].skills.forEach((sk, i) => {
      const n = bookCount(p, sk.id);
      if (n) { takeBooks(p, sk.id, n); giveBooks(p, c.paths[path].skills[i].id, n); }
    });
    p.path = path;
    moved = enforceGearRules(p);
  }
  const skills = classSkills(p);
  books.forEach((n, i) => giveBooks(p, skills[i].id, n));
  p.skillLevels = [1, 1, 1, 1, 1];
  p.skillPoints = p.level - 1;
  game.stats = playerStats(p);
  p.hp = Math.min(p.hp, game.stats.maxHp);
  p.mp = Math.min(p.mp, game.stats.maxMp);
  return { books: books.reduce((a, n) => a + n, 0), moved: moved.length, changed: path !== oldPath };
}
// --- Lager (seit 9.1) ------------------------------------------------------------------------------
// Bei jedem Lagerverwalter (Vlotho und jede Stadt bzw. jedes Lager) liegt dasselbe Lager. Einmal 1.000 Gold,
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
    const stack = p.inventory.find((x) => x.book === it.book && x.count + it.count <= BOOK_STACK);
    if (stack) {
      stack.count += it.count;
      st.items.splice(i, 1);
      return 'ok';
    }
  }
  if (p.inventory.length >= BAG_SIZE) return 'full';
  p.inventory.push(it);
  st.items.splice(i, 1);
  return 'ok';
}

// Ein Fertigkeitsbuch der eigenen Klasse kaufen
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
  saveGame();
}

// Erwecken: Stufe 15 wird E1, mit eigenem Banner und Leuchten
function awakenSkill(p, i, sk) {
  const e1 = SKILL_RANKS[0];
  p.skillLevels[i] = e1.from;
  ui.banner('Erweckt!', `${sk.name} ist jetzt ${skillLevelText(e1.from)}`);
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
    p.skillLevels[i]++;
    takeBooks(p, sk.id, 1);
  } else {
    // in den nächsten Rang (Erwecken kostet seit 8.9 nichts mehr, es passiert auf 15 von selbst)
    const next = SKILL_RANKS[skillRank(lvl) + 1];
    if (next === SKILL_RANKS[0]) awakenSkill(p, i, sk);
    else {
      takeBooks(p, sk.id, next.books);
      p.skillLevels[i] = next.from;
      ui.banner(`${sk.name}: ${next.name}`, `Rang ${skillLevelText(next.from)} erreicht`);
      vfxLevelUp(p);
      rankCastFx(p, skillRank(next.from), next.color);
    }
  }
  ui.log(`${sk.name} ist jetzt auf Stufe ${skillLevelText(p.skillLevels[i])}.`, 'info');
  refreshBuff(sk, p.skillLevels[i]);
  ui.buildSkillBar();
  ui.renderCharPanel();
  saveGame();
}

// Pferd (seit 7.3, Tempo seit 8.5): Reitpferd aus der Stallmeister-Prüfung (ab Stufe 20) +35 %,
// Kriegsross (ab Stufe 40 beim Stallmeister für 200.000 Gold) +65 %. Das Tempo zählt zusätzlich zum Fußtempo.
// Wer angreift oder eine Fertigkeit nutzt, steigt dabei ab.
const HORSES = [null, { name: 'Reitpferd', speed: 0.35 }, { name: 'Kriegsross', speed: 0.65, level: 40, price: 200000 }];
const rideSpeed = (p) => (HORSES[p.horseTier || 1] || HORSES[1]).speed;
function toggleRide(on) {
  const p = game.player;
  if (!p || p.dead || !p.horse) {
    if (p && !p.horse) ui.log('Du hast noch kein Pferd. Jeder Stallmeister (Jun in Vlotho und in jedem Lager) hat eine Prüfung für dich (ab Stufe 20).', 'warn');
    return;
  }
  const next = on == null ? !p.riding : on;
  if (next === !!p.riding) return;
  if (next && game.time - p.lastCombat < 3) {
    addText(p.x, p.y - 34, 'Nicht mitten im Kampf', 'info');
    return;
  }
  p.riding = next;
  game.stats = playerStats(p);
  particles(p.x, feetY(p), { count: 16, color: ['#c9b28a', '#a88f62'], speed: [30, 90], life: [0.3, 0.6], size: [2, 4], drag: 3, glow: false });
  ui.log(next ? 'Du sitzt auf deinem Pferd.' : 'Du steigst ab.', 'info');
  // seit 10.6: das Pferd wiehert, wenn man es ruft, und schnaubt beim Absteigen
  if (typeof snd !== 'undefined') snd.horse(p, next ? 'neigh' : 'snort');
  ui.updateHorseButton();
}

// Trinken: nimmt die kleinste Größe, die das Fehlende auffüllt, sonst die größte vorhandene.
// Seit 6.6 je Sorte 3 s Abklingzeit (kein Durchtrinken), Leben und Mana getrennt.
const POTION_CD = 3;
function usePotion(kind) {
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
  const size = have.find((sz) => (hp ? sz.hp : sz.mp) >= missing * 0.9) || have[have.length - 1];
  p.potions[potKey(kind, size.id)]--;
  p.potCd[kind] = POTION_CD;
  vfxPotion(p, kind);
  snd.player('potion', { vol: 0.4 });
  if (hp) {
    const amount = Math.min(size.hp, s.maxHp - p.hp);
    p.hp = Math.min(s.maxHp, p.hp + amount);
    addText(p.x, p.y - 30, `+${amount} (${size.id})`, 'heal');
  } else {
    const amount = Math.min(size.mp, s.maxMp - p.mp);
    p.mp = Math.min(s.maxMp, p.mp + amount);
    addText(p.x, p.y - 30, `+${amount} MP (${size.id})`, 'mana');
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
  seelenpfeil: 'schaedelsalve', seelensturm: 'seelenkaefig', fluch: 'seelenschnitter', frostlanze: 'eisstrahl', seelenschnitter: 'totenruf' };
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
