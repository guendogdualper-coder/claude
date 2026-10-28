// Spielfigur: Erstellen, Werte berechnen, Erfahrung, Speichern.

const SAVE_KEY = 'seelenstein.spielstand.v1';
const MAX_LEVEL = 99;
// Fertigkeiten: Stufe 1–17 mit Fertigkeitspunkten, danach vier Ränge.
// Ab Stufe 15 kann man eine Fertigkeit erwecken (Rang Erwacht, kostet einen Punkt).
// Auf Stufe 17 macht der nächste Fertigkeitspunkt die Fertigkeit direkt zu E1.
// In den Rängen steigt man mit Fertigkeitsbüchern; aus den letzten drei Stufen eines Rangs
// geht es mit mehreren Büchern in den nächsten Rang.
const SKILL_BASE_MAX = 17;
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

// Was mit einer Fertigkeit gerade möglich ist (für Knöpfe im Charakterfenster)
function skillActions(p, i) {
  const sk = classSkills(p)[i];
  const lvl = p.skillLevels[i];
  const out = [];
  if (p.level < sk.unlock) return out;
  const r = skillRank(lvl);
  if (r < 0) {
    if (lvl < SKILL_BASE_MAX) out.push({ type: 'point', label: 'Verbessern', ok: p.skillPoints > 0, why: 'Kein Fertigkeitspunkt frei' });
    if (lvl >= SKILL_BASE_MAX - 2) {
      const next = SKILL_RANKS[0];
      out.push({ type: 'rankup', label: `Erwecken → ${next.id}1`, ok: p.skillPoints > 0, why: 'Kein Fertigkeitspunkt frei' });
    }
    return out;
  }
  const rank = SKILL_RANKS[r];
  const pos = lvl - rank.from + 1;
  const have = bookCount(p, sk.id);
  if (pos < rank.levels) out.push({ type: 'book', label: `Buch lesen (${have})`, ok: have > 0, why: `Kein Buch „${sk.name}“` });
  const next = SKILL_RANKS[r + 1];
  if (next && pos >= rank.levels - 2) {
    out.push({ type: 'rankup', label: `${next.name} → ${next.levels === 1 ? next.id : next.id + '1'} (${have}/${next.books} Bücher)`, ok: have >= next.books && p.level >= next.minLevel, why: p.level < next.minLevel ? `ab Stufe ${next.minLevel}` : `${next.books} Bücher „${sk.name}“ nötig` });
  }
  return out;
}

// Reihenfolge der Fertigkeiten in der Leiste: Platz -> Fertigkeit
const SKILL_HOLD_MS = 500;
function skillOrder(p) {
  const o = p.skillOrder;
  const ok = Array.isArray(o) && o.length === 5 && [0, 1, 2, 3, 4].every((k) => o.includes(k));
  if (!ok) p.skillOrder = [0, 1, 2, 3, 4];
  return p.skillOrder.slice();
}

// Diese Felder landen im Spielstand
const SAVE_FIELDS = ['name', 'classId', 'path', 'level', 'xp', 'gold', 'skillPoints', 'skillLevels', 'potions',
  'splinters', 'kills', 'stones', 'deaths', 'hp', 'mp', 'x', 'y', 'playTime', 'equipment', 'inventory', 'scrolls', 'itemsVersion', 'attrs', 'statPoints', 'materials', 'worldVersion', 'quests', 'upmats', 'books', 'skillOrder', 'horse', 'riding', 'dualWield', 'ultCd', 'friends', 'guild', 'look'];

// Statuspunkte: pro Stufe 3 Punkte, frei auf vier Werte verteilbar
const STAT_POINTS_PER_LEVEL = 3;
const MAX_ATTR = 90;
const ATTRS = [
  { id: 'str', name: 'Stärke', short: 'STR', text: '+1 Angriff je Punkt' },
  { id: 'vit', name: 'Vitalität', short: 'VIT', text: '+6 Leben und +0,3 Rüstung je Punkt' },
  { id: 'int', name: 'Intelligenz', short: 'INT', text: '+5 Mana und +1 % Fertigkeitsschaden je Punkt' },
  { id: 'dex', name: 'Geschick', short: 'DEX', text: '+0,3 % kritische Treffer, +0,25 % Ausweichen und +0,5 % Angriffstempo je Punkt' }
];
// Hauptwert jeder Klasse: stärkt je Punkt zusätzlich Fertigkeiten, normale Angriffe und Buffs (Auren, Heilung, Schilde).
// Bei Intelligenz als Hauptwert ersetzt das den allgemeinen Fertigkeitsschaden der Intelligenz.
const MAIN_ATTR = { krieger: 'str', ninja: 'dex', schamane: 'int', nekromant: 'int' };
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
    potionCd: 0,
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
  // Ältere Spielstände ohne Ausrüstung bekommen die Startausrüstung
  p.equipment = { ...starterEquipment(save.classId), helm: null, schultern: null, umhang: null, schild: null, schuhe: null, guertel: null, ...(save.equipment || starterEquipment(save.classId)) };
  p.inventory = Array.isArray(save.inventory) ? save.inventory : [];
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
  }
  // Spielstände vor den zwei Wegen: Fertigkeitspunkte zurückgeben, der Weg wird beim Start gewählt
  if (save.path == null) {
    p.path = 0;
    p.needsPath = true;
    p.skillPoints += (p.skillLevels || []).reduce((a, v) => a + Math.max(0, v - 1), 0);
    p.skillLevels = [1, 1, 1, 1, 1];
  }
  // Die Welt ist größer geworden: alte Positionen passen nicht mehr. Aus Version 6.2/6.3 (Welt 6) geht es
  // im Lager derselben Map weiter, sonst im Dorf.
  let campOf = null;
  if ((save.worldVersion || 1) < WORLD_VERSION) {
    if (save.worldVersion === 6 && save.x != null) {
      const OLD = { 4: [0, 0, 100, 90], 5: [100, 0, 100, 90], 6: [200, 0, 100, 90], 7: [0, 210, 100, 90], 8: [100, 210, 100, 90], 9: [200, 210, 100, 90], 2: [0, 300, 200, 200], 3: [200, 300, 200, 200] };
      const tx = save.x / TILE;
      const ty = save.y / TILE;
      for (const [id, [x, y, w, h]] of Object.entries(OLD)) if (tx >= x && tx < x + w && ty >= y && ty < y + h) campOf = Number(id);
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
  if (p.riding) speedMul += RIDE_SPEED;
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
    if (e.invisible) s.invisible = true;
  }
  s.atk = Math.round(s.atk * atkMul);
  s.maxHp = Math.round(s.maxHp * (1 + (bonus.hpPct || 0)));
  s.def = Math.round(s.def * defMul);
  // Obergrenzen, damit hohe Ränge und viele Buffs zusammen nicht ausufern
  s.speed *= Math.min(1.9, speedMul);
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

function upgradeSkill(i, type = 'point') {
  const p = game.player;
  const sk = classSkills(p)[i];
  const act = skillActions(p, i).find((a) => a.type === type);
  if (!act || !act.ok) return;
  const lvl = p.skillLevels[i];
  if (type === 'point') {
    p.skillLevels[i]++;
    p.skillPoints--;
  } else if (type === 'book') {
    p.skillLevels[i]++;
    takeBooks(p, sk.id, 1);
  } else {
    // in den nächsten Rang
    const next = SKILL_RANKS[skillRank(lvl) + 1];
    if (next.books) takeBooks(p, sk.id, next.books);
    else p.skillPoints--;
    p.skillLevels[i] = next.from;
    ui.banner(`${sk.name}: ${next.name}`, `Rang ${skillLevelText(next.from)} erreicht`);
    vfxLevelUp(p);
    rankCastFx(p, skillRank(next.from), next.color);
  }
  ui.log(`${sk.name} ist jetzt auf Stufe ${skillLevelText(p.skillLevels[i])}.`, 'info');
  refreshBuff(sk, p.skillLevels[i]);
  ui.buildSkillBar();
  ui.renderCharPanel();
  saveGame();
}

// Pferd: Belohnung der Stallmeister-Prüfung. Reiten macht 60 % schneller;
// wer angreift oder eine Fertigkeit nutzt, steigt dabei ab.
const RIDE_SPEED = 0.6;
function toggleRide(on) {
  const p = game.player;
  if (!p || p.dead || !p.horse) {
    if (p && !p.horse) ui.log('Du hast noch kein Pferd. Jeder Stallmeister (Jun in Vlotho und in jedem Lager) hat eine Prüfung für dich (ab Stufe 30).', 'warn');
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
  ui.updateHorseButton();
}

// Trinken: nimmt die kleinste Größe, die das Fehlende auffüllt, sonst die größte vorhandene
function usePotion(kind) {
  const p = game.player;
  if (!p || p.dead || p.potionCd > 0) return;
  const s = game.stats;
  const name = potionInfo(kind).plural;
  if (potionTotal(p, kind) <= 0) {
    ui.log('Keine ' + name + ' mehr. Die Händlerin im Dorf verkauft neue.', 'warn');
    return;
  }
  const hp = kind === 'hp';
  if (hp && p.hp >= s.maxHp) return;
  if (!hp && p.mp >= s.maxMp) return;
  const missing = hp ? 1 - p.hp / s.maxHp : 1 - p.mp / s.maxMp;
  const have = POTION_SIZES.filter((sz) => (p.potions[potKey(kind, sz.id)] || 0) > 0);
  const size = have.find((sz) => (hp ? sz.heal : sz.mana) >= missing - 0.02) || have[have.length - 1];
  p.potions[potKey(kind, size.id)]--;
  p.potionCd = 0.5;
  vfxPotion(p, kind);
  if (hp) {
    const amount = Math.round(s.maxHp * size.heal);
    p.hp = Math.min(s.maxHp, p.hp + amount);
    addText(p.x, p.y - 30, `+${amount} (${size.id})`, 'heal');
  } else {
    const amount = Math.round(s.maxMp * size.mana);
    p.mp = Math.min(s.maxMp, p.mp + amount);
    addText(p.x, p.y - 30, `+${amount} MP (${size.id})`, 'mana');
  }
}

// --- Speichern ------------------------------------------------------------

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !CLASSES[data.classId] || typeof data.name !== 'string') return null;
    // Version 5.2: Giftpfeil wurde durch Tarnung ersetzt
    // Version 6.3: Klingensturm wurde zu Hinterhalt, Giftnebel zu Blitzangriff
    const renamed = { giftpfeil: 'tarnung', klingensturm: 'hinterhalt', giftnebel: 'blitzangriff' };
    for (const it of data.inventory || []) if (it && renamed[it.book]) it.book = renamed[it.book];
    return data;
  } catch {
    return null;
  }
}

function saveGame() {
  const p = game.player;
  if (!p) return;
  const data = {};
  for (const f of SAVE_FIELDS) data[f] = p[f];
  if (p.dead) {
    const spawn = villageSpawn();
    data.x = spawn.x;
    data.y = spawn.y;
    data.hp = null;
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Speicher nicht verfügbar (z. B. privates Fenster) – das Spiel läuft trotzdem
  }
}

function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* egal */ }
}
