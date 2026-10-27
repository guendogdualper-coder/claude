// Spielfigur: Erstellen, Werte berechnen, Erfahrung, Speichern.

const SAVE_KEY = 'seelenstein.spielstand.v1';
const MAX_LEVEL = 99;
const MAX_SKILL_LEVEL = 20;

// Diese Felder landen im Spielstand
const SAVE_FIELDS = ['name', 'classId', 'level', 'xp', 'gold', 'skillPoints', 'skillLevels', 'potions',
  'splinters', 'kills', 'stones', 'deaths', 'hp', 'mp', 'x', 'y', 'playTime', 'equipment', 'inventory', 'scrolls', 'itemsVersion', 'attrs', 'statPoints', 'materials'];

// Statuspunkte: pro Stufe 3 Punkte, frei auf vier Werte verteilbar
const STAT_POINTS_PER_LEVEL = 3;
const MAX_ATTR = 90;
const ATTRS = [
  { id: 'str', name: 'Stärke', short: 'STR', text: '+1 Angriff je Punkt' },
  { id: 'vit', name: 'Vitalität', short: 'VIT', text: '+6 Leben und +0,3 Rüstung je Punkt' },
  { id: 'int', name: 'Intelligenz', short: 'INT', text: '+5 Mana und +1 % Fertigkeitsschaden je Punkt' },
  { id: 'dex', name: 'Geschick', short: 'DEX', text: '+0,3 % kritische Treffer, +0,25 % Ausweichen und +0,5 % Angriffstempo je Punkt' }
];

// Erfahrung, die für die nächste Stufe nötig ist. Wächst stark – so entsteht der Grind.
function xpToNext(level) {
  return Math.round(80 * Math.pow(level, 2.1) + 50 * level);
}

// Zu schwache Monster geben kaum noch Erfahrung, stärkere etwas mehr
function xpFactor(playerLevel, monsterLevel) {
  const diff = monsterLevel - playerLevel;
  if (diff >= 0) return Math.min(1.5, 1 + diff * 0.05);
  return Math.max(0.05, 1 + diff * 0.12);
}

function newCharacter(name, classId) {
  return {
    name, classId, level: 1, xp: 0, gold: 30, skillPoints: 0, skillLevels: [1, 1, 1, 1, 1],
    potions: { hp: 5, mp: 5 }, splinters: 0, kills: 0, stones: 0, deaths: 0,
    hp: null, mp: null, x: null, y: null, playTime: 0,
    equipment: starterEquipment(), inventory: [], scrolls: 0, itemsVersion: 2,
    attrs: { str: 0, vit: 0, int: 0, dex: 0 }, statPoints: 0,
    materials: { boniPlus: 0, boni5: 0, switcher: 0, star: 0 }
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
  p.equipment = { ...starterEquipment(), helm: null, schild: null, schuhe: null, guertel: null, ...(save.equipment || starterEquipment()) };
  p.inventory = Array.isArray(save.inventory) ? save.inventory : [];
  p.scrolls = save.scrolls || 0;
  if (save.equipment && (save.itemsVersion || 1) < 2) {
    Object.values(p.equipment).forEach(migrateItem);
    p.inventory.forEach(migrateItem);
  }
  p.itemsVersion = 2;
  p.materials = { boniPlus: 0, boni5: 0, switcher: 0, star: 0, ...(save.materials || {}) };
  // Spielstände ohne Statuswerte bekommen die Punkte aller bisherigen Stufen nachträglich
  if (!save.attrs) {
    p.attrs = { str: 0, vit: 0, int: 0, dex: 0 };
    p.statPoints = (p.level - 1) * STAT_POINTS_PER_LEVEL;
  } else {
    p.attrs = { str: 0, vit: 0, int: 0, dex: 0, ...save.attrs };
    p.statPoints = save.statPoints || 0;
  }
  const stats = playerStats(p);
  if (p.hp == null || p.hp <= 0) p.hp = stats.maxHp;
  if (p.mp == null) p.mp = stats.maxMp;
  const spawn = villageSpawn();
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
  let speedMul = 1;
  // Boni der Ausrüstung
  const bonus = {};
  for (const item of Object.values(p.equipment || {})) {
    if (!item) continue;
    for (const [k, v] of Object.entries(itemBonusStats(item))) bonus[k] = (bonus[k] || 0) + v;
  }
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
  for (const item of Object.values(p.equipment || {})) {
    if (!item) continue;
    const st = itemStats(item, item.plus, p.classId);
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
  s.block = Math.min(MAX_BLOCK, s.block);
  // Statuswerte (eigene Punkte plus Boni auf der Ausrüstung)
  const own = p.attrs || {};
  const a = { str: (own.str || 0) + (bonus.str || 0), vit: (own.vit || 0) + (bonus.vit || 0), int: (own.int || 0) + (bonus.int || 0), dex: (own.dex || 0) + (bonus.dex || 0) };
  s.atk += (a.str || 0) * 1;
  s.maxHp += (a.vit || 0) * 6;
  s.def += (a.vit || 0) * 0.3;
  s.maxMp += (a.int || 0) * 5;
  s.skillDmg = 1 + (a.int || 0) * 0.01 + (bonus.skillDmg || 0);
  s.crit += (a.dex || 0) * 0.003;
  s.dodge += (a.dex || 0) * 0.0025;
  s.atkSpeed += (a.dex || 0) * 0.005;
  s.def = Math.round(s.def);
  for (const b of p.buffs) {
    const e = b.effects;
    if (e.atk) atkMul += e.atk;
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
  s.def = Math.round(s.def);
  s.speed *= speedMul;
  s.damageTaken = Math.max(0.2, s.damageTaken);
  return s;
}

function gainXp(amount) {
  const p = game.player;
  if (p.level >= MAX_LEVEL) return;
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
    const unlocked = CLASSES[p.classId].skills.find((sk) => sk.unlock === p.level);
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

function upgradeSkill(i) {
  const p = game.player;
  const sk = CLASSES[p.classId].skills[i];
  if (p.skillPoints <= 0 || p.level < sk.unlock || p.skillLevels[i] >= MAX_SKILL_LEVEL) return;
  p.skillLevels[i]++;
  p.skillPoints--;
  ui.log(sk.name + ' ist jetzt auf Stufe ' + p.skillLevels[i] + '.', 'info');
  ui.buildSkillBar();
  ui.renderCharPanel();
  saveGame();
}

function usePotion(kind) {
  const p = game.player;
  if (!p || p.dead || p.potionCd > 0) return;
  const s = game.stats;
  const name = kind === 'hp' ? 'Rote Tränke' : 'Blaue Tränke';
  if (p.potions[kind] <= 0) {
    ui.log('Keine ' + name + ' mehr. Die Händlerin im Dorf verkauft neue.', 'warn');
    return;
  }
  if (kind === 'hp' && p.hp >= s.maxHp) return;
  if (kind === 'mp' && p.mp >= s.maxMp) return;
  p.potions[kind]--;
  p.potionCd = 0.5;
  if (kind === 'hp') {
    const amount = Math.round(s.maxHp * 0.35);
    p.hp = Math.min(s.maxHp, p.hp + amount);
    addText(p.x, p.y - 30, '+' + amount, 'heal');
  } else {
    const amount = Math.round(s.maxMp * 0.4);
    p.mp = Math.min(s.maxMp, p.mp + amount);
    addText(p.x, p.y - 30, '+' + amount + ' MP', 'mana');
  }
}

// --- Speichern ------------------------------------------------------------

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !CLASSES[data.classId] || typeof data.name !== 'string') return null;
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
