// Ausrüstung: Gegenstände, Inventar, Beute, Händler, Schmied und die zugehörigen Fenster.

// --- Gegenstände -------------------------------------------------------------------
// Ein Gegenstand ist { uid, slot, tier, plus, cls, kind }; tier ist der Index in ITEM_TIERS.
// cls: Klasse, die ihn tragen kann (nur Waffe, Rüstung, Helm); kind: Waffenart (siehe WEAPON_KINDS).

function makeItem(slot, tier, plus = 0, cls = null, kind = null) {
  const item = { uid: Math.random().toString(36).slice(2, 10), slot, tier, plus };
  if (CLASS_SLOTS.includes(slot)) {
    item.cls = cls || (game.player ? game.player.classId : 'krieger');
    if (slot === 'waffe') item.kind = kind || CLASS_WEAPON_KINDS[item.cls][0];
  }
  return item;
}

function starterEquipment(classId = 'krieger') {
  return { waffe: makeItem('waffe', 0, 0, classId), ruestung: makeItem('ruestung', 0, 0, classId), helm: null, schild: null, schuhe: null, guertel: null };
}

// Spielstände vor Version 1.4 kannten nur vier Stufen (Lv 1, 8, 15, 22).
// Sie werden auf die gleichnamigen neuen Stufen gelegt, damit nichts schwächer wird.
function migrateItem(item) {
  if (item) item.tier = [0, 2, 3, 4][item.tier] ?? item.tier;
  return item;
}

// Gegenstände von vor Version 2.3 gehören noch keiner Klasse: sie werden der eigenen zugeordnet
function assignClass(item, classId) {
  if (!item || !CLASS_SLOTS.includes(item.slot)) return item;
  if (!item.cls) item.cls = classId;
  if (item.slot === 'waffe' && !item.kind) item.kind = CLASS_WEAPON_KINDS[item.cls][0];
  return item;
}

function canWear(item, classId) {
  return !item.cls || item.cls === classId;
}

function itemName(item) {
  const names = ITEM_NAMES[item.slot];
  if (Array.isArray(names)) return names[item.tier];
  return item.slot === 'waffe' ? names[item.kind][item.tier] : names[item.cls][item.tier];
}

// Kurzbeschreibung: Waffenart bzw. Klasse
function itemKindText(item) {
  if (item.slot === 'waffe') return `${WEAPON_KINDS[item.kind].name} · ${CLASSES[item.cls].name}`;
  if (item.cls) return CLASSES[item.cls].name;
  return 'alle Klassen';
}

function itemFullName(item) {
  return itemName(item) + ' +' + item.plus;
}

function itemColor(item) {
  return PLUS_COLORS[plusBand(item.plus)] || '#ece2cb';
}

// Werte inklusive Verbesserung. Anteile (Prozentwerte) wachsen um 10 % je Plus,
// ganze Zahlen um 10 % des Grundwerts, mindestens aber um 1.
function itemStats(item, plus = item.plus) {
  const t = item.tier;
  const base = { ...BASE_STATS[item.slot][t] };
  let speed = null;
  if (item.slot === 'waffe') {
    const k = WEAPON_KINDS[item.kind];
    base.atk = Math.round(base.atk * k.atkMul);
    if ((item.kind === 'dagger' || item.kind === 'bow') && CRIT_BY_TIER[t]) base.crit = CRIT_BY_TIER[t] * (item.kind === 'bow' ? 0.7 : 1);
    if (k.magic && t) {
      base.mp = MP_BY_TIER[t];
      base.magic = MAGIC_BY_TIER[t] * (k.magicMul || 1);
    }
    speed = k.atkSpeed + SPEED_BY_TIER[t];
  } else if (item.cls) {
    const c = CLASS_ARMOR[item.cls];
    if (base.def) base.def = Math.max(1, Math.round(base.def * c.def));
    if (base.hp) base.hp = Math.round(base.hp * c.hp);
    if (c.mp && base.hp) base.mp = (base.mp || 0) + Math.round(base.hp * c.mp);
    if (c.dodge && t) base.dodge = c.dodge * t;
  }
  const out = {};
  for (const [k, v] of Object.entries(base)) {
    out[k] = v < 1 ? v * (1 + PLUS_BONUS * plus) : v + plus * Math.max(1, Math.round(v * PLUS_BONUS));
  }
  // Das Tempo einer Waffe hängt von ihrer Art ab und wächst nicht mit dem Plus
  if (speed) out.atkSpeed = speed;
  return out;
}

const STAT_LABELS = {
  atk: 'Angriff', def: 'Rüstung', hp: 'Vitalität', mp: 'Intelligenz', crit: 'Kritisch',
  speed: 'Lauftempo', dodge: 'Ausweichen', block: 'Blocken', regen: 'Regeneration',
  atkSpeed: 'Angriffstempo', magic: 'Magiestärke'
};
const STAT_ORDER = ['atk', 'atkSpeed', 'magic', 'def', 'hp', 'mp', 'crit', 'block', 'dodge', 'speed', 'regen'];

function statText(k, v) {
  const pct = (x, d = 0) => (x * 100).toFixed(d).replace('.', ',');
  if (k === 'regen') return `${STAT_LABELS[k]} +${pct(v, 1)} %/s`;
  if (k === 'atkSpeed') return `${STAT_LABELS[k]} ${v >= 0 ? '+' : '−'}${pct(Math.abs(v))} %`;
  if (k === 'crit' || k === 'speed' || k === 'dodge' || k === 'block' || k === 'magic') return `${STAT_LABELS[k]} +${pct(v)} %`;
  if (k === 'hp') return `${STAT_LABELS[k]} +${v} Leben`;
  if (k === 'mp') return `${STAT_LABELS[k]} +${v} Mana`;
  return `${STAT_LABELS[k]} +${v}`;
}

function sortedStats(stats) {
  return STAT_ORDER.filter((k) => stats[k] != null).map((k) => [k, stats[k]]);
}

function sellValue(item) {
  const bonuses = (item.bonuses || []).length + (item.specials || []).length * 2;
  return Math.round(12 * Math.pow(item.tier + 1, 2) * (1 + item.plus * 0.6) * (1 + bonuses * 0.25));
}

// --- Boni ---------------------------------------------------------------------------------

function bonusValue(def, tier) {
  const [lo, hi] = def.range;
  const v = (lo + Math.random() * (hi - lo)) * (1 + tier * 0.35);
  if (def.fmt === 'flat') return Math.max(1, Math.round(v));
  if (def.fmt === 'pct1') return Math.round(v * 10000) / 10000;
  return Math.round(v * 1000) / 1000;
}

// Zufälliger Bonus, der auf diesem Gegenstand noch nicht vorkommt
function rollBonus(item, special) {
  const pool = special ? SPECIAL_BONUS_TYPES : BONUS_TYPES;
  const taken = new Set((special ? item.specials : item.bonuses || []).map((b) => b.t));
  const ids = Object.keys(pool).filter((id) => !taken.has(id) && (special || pool[id].slots.includes(item.slot)));
  const t = ids[Math.floor(Math.random() * ids.length)];
  return { t, v: bonusValue(pool[t], item.tier) };
}

function bonusText(b, special) {
  const def = (special ? SPECIAL_BONUS_TYPES : BONUS_TYPES)[b.t];
  const pct = (x, d) => (x * 100).toFixed(d).replace('.', ',');
  if (def.fmt === 'flat') return `${def.name} +${b.v}`;
  if (def.fmt === 'pct1') return `${def.name} +${pct(b.v, 1)} %/s`;
  if (def.fmt === 'neg') return `${def.name} −${pct(b.v, 0)} %`;
  return `${def.name} +${pct(b.v, 0)} %`;
}

// Wendet ein Material auf einen Gegenstand an. Rückgabe: Meldung oder Fehler.
function applyMaterial(ref, matId) {
  const p = game.player;
  const item = itemAt(ref);
  if (!item) return { error: 'Kein Gegenstand gewählt.' };
  item.bonuses = item.bonuses || [];
  item.specials = item.specials || [];
  if (!(p.materials[matId] > 0)) return { error: 'Davon hast du nichts mehr.' };
  let text;
  if (matId === 'boniPlus') {
    if (item.bonuses.length >= 4) return { error: 'Boni + reicht bis zum 4. Bonus. Für den 5. brauchst du eine Seltene Verstärkung.' };
    const b = rollBonus(item, false);
    item.bonuses.push(b);
    text = `Neuer Bonus ${item.bonuses.length}: ${bonusText(b)}`;
  } else if (matId === 'boni5') {
    if (item.bonuses.length !== 4) return { error: 'Die Seltene Verstärkung braucht genau 4 Boni.' };
    const b = rollBonus(item, false);
    item.bonuses.push(b);
    text = `5. Bonus: ${bonusText(b)}`;
  } else if (matId === 'switcher') {
    if (!item.bonuses.length) return { error: 'Der Gegenstand hat noch keine Boni zum Umwürfeln.' };
    const n = item.bonuses.length;
    item.bonuses = [];
    for (let k = 0; k < n; k++) item.bonuses.push(rollBonus(item, false));
    text = 'Boni neu ausgewürfelt.';
  } else if (matId === 'star') {
    if (item.specials.length >= MAX_SPECIAL_BONUS) return { error: 'Der Gegenstand hat schon Bonus 6 und 7.' };
    const b = rollBonus(item, true);
    item.specials.push(b);
    text = `Bonus ${5 + item.specials.length}: ${bonusText(b, true)}`;
  }
  p.materials[matId]--;
  afterGearChange();
  return { text };
}

// Summe aller Boni eines Gegenstands
function itemBonusStats(item) {
  const out = {};
  for (const b of item.bonuses || []) out[b.t] = (out[b.t] || 0) + b.v;
  for (const b of item.specials || []) out[b.t] = (out[b.t] || 0) + b.v;
  return out;
}

function addToBag(item) {
  const p = game.player;
  if (p.inventory.length >= BAG_SIZE) return false;
  p.inventory.push(item);
  return true;
}

function addMobMat(id, n, from) {
  const p = game.player;
  p.upmats[id] = (p.upmats[id] || 0) + n;
  const mat = MOB_MATS[id];
  ui.loot(mat.name, n, mobMatIconUrl(id), mat.color);
  if (from) later(0.15, () => vfxLootFly(from, mobMatSprite(id).img));
}

// Beute: normale Monster selten, Seelensteine oft
function rollLoot(m) {
  const p = game.player;
  if (!m.isStone && Math.random() < 0.03) {
    p.splinters++;
    ui.loot('Seelensplitter', 1, lootIconUrl('splinter'), '#c9a8ff');
  }
  const drops = m.isStone ? stoneDrops(m.stoneType) : null;
  if (drops && Math.random() < drops.scroll) {
    p.scrolls++;
    ui.loot(BLESSING.name, 1, scrollIconUrl(), '#f3e2b0');
  }
  if (drops) {
    const got = [];
    for (const [id, [chance, min, max]] of Object.entries(drops.mats)) {
      if (Math.random() >= chance) continue;
      const n = randInt(min, max);
      p.materials[id] = (p.materials[id] || 0) + n;
      const mat = MATERIALS.find((x) => x.id === id);
      got.push(id);
      ui.loot(mat.name, n, materialIconUrl(id), MATERIAL_COLORS[id]);
      for (let k = 0; k < n; k++) later(0.1 + got.length * 0.12 + k * 0.08, () => vfxLootFly(m, materialIconCanvas(id)));
    }
  }
  // Monster-Teile für den Schmied: jedes Monster lässt selten sein eigenes Teil fallen,
  // Seelensteine einige Teile der Monster ihres Gebiets
  if (!m.isStone && MOB_MATS[m.typeId] && Math.random() < MOB_MAT_CHANCE) addMobMat(m.typeId, 1, m);
  if (m.isStone) {
    const pool = m.zone.groups.map((g) => g[0]).filter((id) => MONSTER_TYPES[id].level <= m.level + 2);
    for (let k = randInt(1, 3); k > 0; k--) addMobMat(pool[randInt(0, pool.length - 1)] || m.zone.groups[0][0], 1, m);
  }
  if (Math.random() < (drops ? drops.gear : 0.025)) {
    // Seelensteine ab Stufe 20 lassen schon Ausrüstung der nächsthöheren Gebiete fallen (Lv 30 ab Stein 20)
    const lootLevel = m.isStone && m.level >= 20 ? m.level + 10 : m.level;
    let tier = 0;
    ITEM_TIERS.forEach((t, i) => { if (lootLevel >= t.level) tier = i; });
    const slots = drops && drops.slots ? drops.slots : EQUIP_SLOTS.map((sl) => sl.id);
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const plus = drops ? randInt(drops.plus[0], drops.plus[1]) : Math.random() < 0.25 ? 1 : 0;
    // meist für die eigene Klasse, manchmal für eine andere (zum Verkaufen)
    const cls = Math.random() < 0.7 ? p.classId : CLASS_ORDER[randInt(0, CLASS_ORDER.length - 1)];
    const kinds = CLASS_WEAPON_KINDS[cls];
    const item = makeItem(slot, tier, plus, cls, kinds[randInt(0, kinds.length - 1)]);
    if (addToBag(item)) {
      ui.loot(itemFullName(item), 1, itemIconUrl(item), itemColor(item));
      later(0.2, () => vfxLootFly(m, itemIconCanvas(item)));
      const c = bodyCenter(m);
      particles(c.x, c.y, { count: 14, color: [itemColor(item), '#ffffff'], angle: -Math.PI / 2, spread: 0.8, speed: [60, 150], life: [0.5, 0.9], size: [2, 3.5] });
    } else {
      ui.log('Dein Inventar ist voll. ' + itemFullName(item) + ' ist verloren.', 'warn');
    }
  }
}

function equipFromBag(index) {
  const p = game.player;
  const item = p.inventory[index];
  if (!item) return false;
  const need = ITEM_TIERS[item.tier].level;
  if (!canWear(item, p.classId)) {
    gear.message(`${itemName(item)} kann nur ein ${CLASSES[item.cls].name} tragen.`, 'warn');
    return false;
  }
  if (p.level < need) {
    gear.message(`${itemName(item)} kannst du ab Stufe ${need} tragen.`, 'warn');
    return false;
  }
  const old = p.equipment[item.slot];
  p.inventory.splice(index, 1);
  if (old) p.inventory.splice(index, 0, old);
  p.equipment[item.slot] = item;
  afterGearChange();
  gear.selected = { where: 'equip', key: item.slot };
  return true;
}

function unequip(slot) {
  const p = game.player;
  const item = p.equipment[slot];
  if (!item) return;
  if (!addToBag(item)) {
    gear.message('Kein Platz im Inventar.', 'warn');
    return;
  }
  p.equipment[slot] = null;
  afterGearChange();
  gear.selected = { where: 'bag', key: p.inventory.length - 1 };
}

function sellFromBag(index) {
  const p = game.player;
  const item = p.inventory[index];
  if (!item) return;
  const value = sellValue(item);
  p.inventory.splice(index, 1);
  p.gold += value;
  gear.message(`${itemFullName(item)} für ${value} Gold verkauft.`, 'info');
  gear.selected = null;
  saveGame();
}

function afterGearChange() {
  const p = game.player;
  game.stats = playerStats(p);
  p.hp = Math.min(p.hp, game.stats.maxHp);
  p.mp = Math.min(p.mp, game.stats.maxMp);
  saveGame();
}

function itemAt(ref) {
  if (!ref) return null;
  const p = game.player;
  return ref.where === 'equip' ? p.equipment[ref.key] : p.inventory[ref.key];
}

// --- Schmied --------------------------------------------------------------------------

function upgradeCost(item) {
  const step = UPGRADE_STEPS[item.plus];
  return { gold: step.gold * (item.tier + 1), splinters: step.splinters, mat: upgradeMaterial(item) };
}

function canPayUpgrade(cost) {
  const p = game.player;
  return p.gold >= cost.gold && p.splinters >= cost.splinters && (!cost.mat || (p.upmats[cost.mat.id] || 0) >= cost.mat.count);
}

// Gibt das Ergebnis zurück: success, fail (nur Kosten weg), down (Plus sinkt), break (zerbrochen)
function upgradeItem(ref, useScroll) {
  const p = game.player;
  const item = itemAt(ref);
  if (!item || item.plus >= MAX_PLUS) return null;
  const cost = upgradeCost(item);
  if (!canPayUpgrade(cost)) return null;
  if (useScroll && p.scrolls <= 0) return null;
  p.gold -= cost.gold;
  p.splinters -= cost.splinters;
  if (cost.mat) p.upmats[cost.mat.id] -= cost.mat.count;
  if (useScroll) p.scrolls--;
  const step = UPGRADE_STEPS[item.plus];
  let result;
  if (Math.random() < step.chance) {
    item.plus++;
    result = 'success';
  } else if (useScroll || step.fail === 'none') {
    result = 'fail';
  } else if (step.fail === 'down') {
    item.plus--;
    result = 'down';
  } else {
    if (ref.where === 'equip') p.equipment[ref.key] = null;
    else p.inventory.splice(ref.key, 1);
    result = 'break';
  }
  afterGearChange();
  return { result, item };
}

// --- Symbole für Gegenstände (aus dem Zeichencode der Figuren) ---------------------------------
// Farben je Stufe: Leder, Bronze, Eisen, Drache, Seele, Asche, Himmel, Götter

const ARMOR_COLORS = ['#7a5a3c', '#8a6a3a', '#5a6a7a', '#9a2f2a', '#4a2f6a', '#4a2a22', '#2a4a7a', '#c8a03a'];
const iconCache = new Map();

// Schild, auch für die Figur im Spiel (Mitte bei 0,0, etwa 22 Einheiten hoch)
function shieldArt(ctx, tier) {
  const c = ARMOR_COLORS[tier];
  const metal = TIER_METAL[tier];
  if (tier === 0) {
    oval(ctx, 0, 0, 9.5, 10.5, '#8a6a44');
    stroke(ctx, '#5a4030', 0.9, [[-4, -9.5], [-4, 9.5]]);
    stroke(ctx, '#5a4030', 0.9, [[4, -9.5], [4, 9.5]]);
    oval(ctx, 0, 0, 2.6, 2.6, metal);
    return;
  }
  poly(ctx, [[-9, -10], [9, -10], [9, 1], [0, 11], [-9, 1]], metal);
  poly(ctx, [[-6.5, -7.5], [6.5, -7.5], [6.5, 0], [0, 7.8], [-6.5, 0]], c);
  if (tier >= 3) poly(ctx, [[0, -5], [3.5, 0], [0, 5], [-3.5, 0]], tier >= 4 ? '#d6a8ff' : '#e8c46a');
  else oval(ctx, 0, -1, 2.4, 2.4, metal);
}

function drawItemArt(ctx, item) {
  const { slot, tier } = item;
  const metal = TIER_METAL[tier];
  const c = ARMOR_COLORS[tier];
  if (slot === 'waffe') {
    const kind = item.kind || 'sword';
    const long = kind === 'staff' || kind === 'scythe' || kind === 'greatsword' || kind === 'bell';
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    if (kind === 'dagger') {
      ctx.translate(-9, 0);
      ctx.scale(1.6, 1.6);
    } else if (kind === 'fan') {
      ctx.translate(-6, 0);
      ctx.scale(1.3, 1.3);
    } else if (kind === 'bow') {
      ctx.rotate(Math.PI / 4);
      ctx.translate(-2, 0);
      ctx.scale(1.35, 1.35);
    } else if (long) {
      ctx.translate(-15, 0);
      ctx.scale(0.85, 0.85);
    } else {
      ctx.translate(-12, 0);
    }
    weaponArt(ctx, kind, tier);
    ctx.restore();
  } else if (slot === 'ruestung' && (item.cls === 'schamane' || item.cls === 'nekromant')) {
    // Robe mit weiten Ärmeln
    const L = ARMOR_LOOK[item.cls];
    const robe = L.robe[tier];
    const trim = item.cls === 'schamane' ? L.gold[tier] : L.glow[tier];
    poly(ctx, [[-6, -12], [6, -12], [9, 13], [-9, 13]], robe);
    poly(ctx, [[-6, -12], [-15, 2], [-11, 5], [-5, -4]], darker(robe, 0.15));
    poly(ctx, [[6, -12], [15, 2], [11, 5], [5, -4]], darker(robe, 0.15));
    stroke(ctx, trim, 1.2, [[-3, -12], [0, -5], [3, -12]]);
    box(ctx, -8, 1, 16, 2.4, 1, trim);
    stroke(ctx, trim, 1, [[-9, 12.5], [9, 12.5]]);
  } else if (slot === 'ruestung' && item.cls === 'ninja') {
    // Wams mit Schal und Kreuzgurten
    const L = ARMOR_LOOK.ninja;
    poly(ctx, [[-9, -10], [9, -10], [10, 10], [-10, 10]], L.torso[tier]);
    stroke(ctx, '#5a4030', 1.6, [[-8, -9], [8, 8]]);
    stroke(ctx, '#5a4030', 1.6, [[8, -9], [-8, 8]]);
    box(ctx, -10, -13, 20, 4.5, 2, L.scarf[tier]);
    poly(ctx, [[5, -10], [9, -10], [12, 2], [8, 2]], L.scarf[tier]);
    box(ctx, -10, 7, 20, 3, 1, L.scarf[tier]);
  } else if (slot === 'ruestung') {
    const k = ARMOR_LOOK.krieger;
    const body = k.torso[tier];
    const trim = k.trim[tier];
    poly(ctx, [[-9, -10], [9, -10], [11, 12], [-11, 12]], body);
    for (let i = 0; i < 3; i++) stroke(ctx, trim, 0.9, [[-8.5, -4 + i * 4.5], [8.5, -4 + i * 4.5]]);
    box(ctx, -10.5, 6, 21, 3, 1, trim);
    oval(ctx, -11, -9, 6, 4.5, body);
    oval(ctx, 11, -9, 6, 4.5, body);
    stroke(ctx, trim, 1, [[-15, -7], [-7, -7]]);
    stroke(ctx, trim, 1, [[7, -7], [15, -7]]);
    poly(ctx, [[-4, -10], [4, -10], [0, -5]], darker(body, 0.3));
    if (tier >= 4) for (const x of [-11, 11]) poly(ctx, [[x - 3, -12], [x, -18], [x + 3, -12]], trim);
  } else if (slot === 'helm' && item.cls === 'ninja') {
    // Kapuze mit Augenschlitz
    const L = ARMOR_LOOK.ninja;
    oval(ctx, 0, 0, 12, 12, L.hood[tier]);
    box(ctx, -9, -3, 18, 6, 2.5, '#e9c6a1');
    for (const x of [-4, 4]) dot(ctx, x, 0, 1.6, 1.2, tier >= 6 ? '#9fe8ff' : '#21160f');
    if (tier >= 4) box(ctx, -10, -8, 20, 3, 1, L.scarf[tier]);
    poly(ctx, [[8, 4], [17, 12], [12, 13]], L.hood[tier]);
  } else if (slot === 'helm' && item.cls === 'schamane') {
    // Stirnband bzw. Krone mit Juwel
    const L = ARMOR_LOOK.schamane;
    const band = L.band[tier];
    box(ctx, -13, -2, 26, 6, 2.5, band);
    stroke(ctx, darker(band, 0.35), 0.8, [[-12, 1], [12, 1]]);
    if (tier >= 3) for (const x of [-9, -3, 3, 9]) poly(ctx, [[x - 2.5, -2], [x, -10 - (tier >= 5 ? 3 : 0)], [x + 2.5, -2]], band);
    oval(ctx, 0, 1, 2.6, 2.6, tier >= 4 ? '#ffffff' : '#c8402f');
    if (tier < 3) for (const x of [-13, 13]) poly(ctx, [[x, 2], [x + (x < 0 ? -3 : 3), 12], [x + (x < 0 ? 1 : -1), 12]], band);
  } else if (slot === 'helm' && item.cls === 'nekromant') {
    // Spitze Kapuze, ab Stufe 5 mit Knochenkrone
    const L = ARMOR_LOOK.nekromant;
    poly(ctx, [[-12, 12], [-13, -2], [-4, -11], [2, -18], [6, -10], [13, -2], [12, 12]], L.hood[tier]);
    dot(ctx, 0, 4, 7, 7, '#0d120c');
    for (const x of [-3, 3]) dot(ctx, x, 3, 1.4, 1, L.glow[tier]);
    if (tier >= 4) for (const [x, h] of [[-6, 5], [0, 8], [6, 5]]) poly(ctx, [[x - 1.6, -10], [x, -10 - h], [x + 1.6, -10]], '#ddd5bb');
  } else if (slot === 'helm') {
    const hm = ARMOR_LOOK.krieger.helm[tier];
    paintShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 4, 13, Math.PI, 0); ctx.closePath(); }, hm, -13, -9, 26, 13);
    box(ctx, -14.5, 2.5, 29, 4, 1.8, c);
    box(ctx, -13, 6, 4, 8, 1.5, hm);
    box(ctx, 9, 6, 4, 8, 1.5, hm);
    if (tier >= 2) poly(ctx, [[-2, -9], [2, -9], [1.4, -16], [-1.4, -16]], ARMOR_LOOK.krieger.crest[tier]);
    if (tier >= 4) {
      poly(ctx, [[-9, -6], [-13, -14], [-6, -8]], '#b48cff');
      poly(ctx, [[9, -6], [13, -14], [6, -8]], '#b48cff');
    }
  } else if (slot === 'schild') {
    ctx.save();
    ctx.scale(1.35, 1.35);
    shieldArt(ctx, tier);
    ctx.restore();
  } else if (slot === 'guertel') {
    box(ctx, -15, -3.5, 30, 7, 2.5, c);
    stroke(ctx, darker(c, 0.35), 0.8, [[-14, -1.5], [14, -1.5]]);
    box(ctx, -5, -5.5, 10, 11, 2, metal);
    box(ctx, -2.5, -3, 5, 6, 1, darker(c, 0.2));
    if (tier >= 2) {
      oval(ctx, -10, 0, 1.6, 1.6, metal);
      oval(ctx, 10, 0, 1.6, 1.6, metal);
    }
    if (tier >= 3) poly(ctx, [[-3, 5.5], [3, 5.5], [0, 12]], tier >= 4 ? '#b48cff' : '#c8402f');
  } else {
    const boot = (x) => {
      box(ctx, x, -12, 7, 16, 2.5, c);
      box(ctx, x - 1, 2, 12, 6, 2.5, darker(c, 0.25));
      stroke(ctx, metal, 1, [[x, -8], [x + 7, -8]]);
    };
    boot(-11);
    boot(2);
  }
}
// Figur im Inventar: die eigene Spielfigur von vorn mit Waffe und Schild, die gerade angelegt sind
function drawDoll(canvas) {
  if (!canvas) return;
  const w = canvas.clientWidth || 76;
  const h = canvas.clientHeight || 100;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const p = game.player;
  const g = ctx.createRadialGradient(w / 2, h * 0.55, 4, w / 2, h * 0.55, h * 0.6);
  g.addColorStop(0, `rgba(${hexRgb(CLASSES[p.classId].trim)},0.35)`);
  g.addColorStop(1, `rgba(${hexRgb(CLASSES[p.classId].trim)},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const pose = { ...p, x: 0, y: 0, facing: { x: 0, y: 1 }, moving: false, spin: 0, swing: 0, buffs: [], shield: 0, glowUntil: 0 };
  const scale = h / 82;
  ctx.translate(w / 2, h - 8 * scale);
  ctx.scale(scale, scale);
  ctx.translate(0, -feetY(pose));
  drawPlayer(ctx, pose);
}

function itemIconUrl(item) {
  const band = plusBand(item.plus);
  const key = `${item.slot}:${item.tier}:${item.cls || ''}:${item.kind || ''}:${band}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const sp = bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => drawItemArt(ctx, item));
  const size = 96;
  const c = newCanvas(size, size);
  const ctx = c.getContext('2d');
  if (band) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    g.addColorStop(0, `rgba(${hexRgb(PLUS_COLORS[band])},0.55)`);
    g.addColorStop(1, `rgba(${hexRgb(PLUS_COLORS[band])},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.drawImage(sp.img, 0, 0, size, size);
  const url = c.toDataURL();
  iconCache.set(key, url);
  return url;
}

const MATERIAL_ART = {
  boniPlus(ctx) {
    poly(ctx, [[0, -14], [10, -4], [6, 12], [-6, 12], [-10, -4]], '#4a8ad8');
    poly(ctx, [[0, -14], [10, -4], [0, -1], [-10, -4]], '#9fd0ff');
    stroke(ctx, '#ffffff', 2, [[0, -6], [0, 6]]);
    stroke(ctx, '#ffffff', 2, [[-5, 0], [5, 0]]);
  },
  boni5(ctx) {
    poly(ctx, [[0, -15], [11, -5], [8, 12], [-8, 12], [-11, -5]], '#9a5ad8');
    poly(ctx, [[0, -15], [11, -5], [0, -1], [-11, -5]], '#e0c0ff');
    dot(ctx, 0, 4, 3.5, 3.5, '#fff2c0');
  },
  switcher(ctx) {
    box(ctx, -11, -8, 22, 16, 2, '#efe6cc');
    oval(ctx, -11, 0, 3, 8.5, '#5a8a3a');
    oval(ctx, 11, 0, 3, 8.5, '#5a8a3a');
    stroke(ctx, '#2a6a2a', 1.6, [[-5, -3], [4, -3]]);
    stroke(ctx, '#2a6a2a', 1.6, [[1, -6], [4, -3], [1, 0]]);
    stroke(ctx, '#2a6a2a', 1.6, [[5, 3], [-4, 3]]);
    stroke(ctx, '#2a6a2a', 1.6, [[-1, 0], [-4, 3], [-1, 6]]);
  },
  star(ctx) {
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 5;
      const r = k % 2 ? 6 : 15;
      pts.push([Math.cos(a) * r, Math.sin(a) * r + 1]);
    }
    poly(ctx, pts, '#ffcf4a');
    dot(ctx, -2, -2, 3, 3, '#fff6d0');
  }
};

function materialSprite(id) {
  return getSprite('mat:' + id, { x: -20, y: -20, w: 40, h: 40 }, (ctx) => MATERIAL_ART[id](ctx));
}

function materialIconCanvas(id) {
  return materialSprite(id).img;
}

function materialIconUrl(id) {
  const key = 'mat:' + id;
  if (!iconCache.has(key)) iconCache.set(key, materialSprite(id).img.toDataURL());
  return iconCache.get(key);
}

function itemIconCanvas(item) {
  return bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => drawItemArt(ctx, item)).img;
}

function scrollIconUrl() {
  if (iconCache.has('scroll')) return iconCache.get('scroll');
  const sp = bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => {
    box(ctx, -11, -8, 22, 16, 2, '#efe6cc');
    oval(ctx, -11, 0, 3, 8.5, '#d9cfa8');
    oval(ctx, 11, 0, 3, 8.5, '#d9cfa8');
    stroke(ctx, '#b33a2c', 1, [[-6, -4], [6, -4]]);
    stroke(ctx, '#b33a2c', 1, [[-6, 0], [4, 0]]);
    stroke(ctx, '#b33a2c', 1, [[-6, 4], [5, 4]]);
    oval(ctx, 0, 9, 3.2, 3.2, '#c8402f');
  });
  const url = sp.img.toDataURL();
  iconCache.set('scroll', url);
  return url;
}

// Symbole der Monster-Teile: wenige Grundformen in der Farbe des Teils
const MOB_MAT_ART = {
  fang(ctx, c) { poly(ctx, [[-6, -10], [6, -10], [3, 4], [0, 13], [-3, 4]], c); stroke(ctx, darker(c, 0.3), 0.8, [[-3, -6], [0, 8]]); },
  fur(ctx, c) { poly(ctx, [[-12, -6], [-6, -11], [0, -8], [6, -12], [12, -6], [10, 4], [12, 10], [4, 8], [0, 12], [-5, 8], [-12, 10], [-10, 2]], c); for (const x of [-6, 0, 6]) stroke(ctx, darker(c, 0.3), 0.8, [[x, -5], [x - 2, 4]]); },
  horn(ctx, c) { poly(ctx, [[-8, 10], [-3, 10], [6, -2], [9, -12], [2, -4]], c); stroke(ctx, darker(c, 0.3), 0.8, [[-4, 6], [0, 6]]); stroke(ctx, darker(c, 0.3), 0.8, [[0, 2], [3, 2]]); },
  badge(ctx, c) { poly(ctx, [[-9, -11], [9, -11], [9, 4], [0, 12], [-9, 4]], c); oval(ctx, 0, -2, 4, 4, '#e8c46a'); },
  arrow(ctx, c) { stroke(ctx, '#8a6a44', 2, [[-11, 11], [6, -6]]); poly(ctx, [[11, -11], [3, -8], [8, -3]], c); poly(ctx, [[-11, 11], [-12, 5], [-8, 8]], '#e8e0cc'); },
  silk(ctx, c) { oval(ctx, 0, 0, 10, 10, c); for (let k = 0; k < 4; k++) stroke(ctx, darker(c, 0.25), 0.8, [[-9, -6 + k * 4], [9, -4 + k * 4]]); },
  claw(ctx, c) { for (const x of [-6, 0, 6]) poly(ctx, [[x - 2.5, -8], [x + 2.5, -8], [x + 1, 10], [x - 1, 6]], c); },
  feather(ctx, c) { poly(ctx, [[-2, 12], [-6, 2], [-4, -8], [2, -13], [6, -4], [3, 6]], c); stroke(ctx, '#f4ecd8', 0.9, [[-2, 12], [2, -11]]); },
  core(ctx, c) { oval(ctx, 0, 0, 9, 9, darker(c, 0.4)); oval(ctx, 0, 0, 6, 6, c); oval(ctx, -2, -2, 2.4, 2.4, '#ffe9a0'); },
  crystal(ctx, c) { poly(ctx, [[0, -13], [7, -3], [4, 12], [-4, 12], [-7, -3]], c); poly(ctx, [[0, -13], [4, 12], [-4, 12]], lighter(c, 0.35)); },
  dust(ctx, c) { box(ctx, -8, -2, 16, 12, 3, '#8a6a44'); box(ctx, -6, -8, 12, 6, 2, '#a07a4a'); oval(ctx, 0, -4, 5, 2, c); },
  herb(ctx, c) { stroke(ctx, '#4a6a2a', 1.4, [[0, 12], [0, -6]]); for (const [x, y] of [[-6, -6], [6, -4], [-5, 2], [5, 4]]) oval(ctx, x, y, 4, 2.4, c); },
  scale(ctx, c) { poly(ctx, [[0, -12], [10, -4], [8, 8], [0, 12], [-8, 8], [-10, -4]], c); stroke(ctx, lighter(c, 0.35), 1, [[-5, -3], [0, -8], [5, -3]]); stroke(ctx, lighter(c, 0.35), 1, [[-5, 4], [0, -1], [5, 4]]); }
};

function mobMatSprite(id) {
  const m = MOB_MATS[id];
  return getSprite('mm:' + id, { x: -20, y: -20, w: 40, h: 40 }, (ctx) => MOB_MAT_ART[m.art](ctx, m.color));
}

function mobMatIconUrl(id) {
  const key = 'mm:' + id;
  if (!iconCache.has(key)) iconCache.set(key, mobMatSprite(id).img.toDataURL());
  return iconCache.get(key);
}

// Kleine Symbole für die Beuteanzeige: Gold, Seelensplitter, rote und blaue Tränke
const LOOT_ICON_ART = {
  gold(ctx) {
    for (const [x, y] of [[-5, 4], [5, 4], [0, -3]]) {
      oval(ctx, x, y, 7.5, 5.5, '#e8b83a');
      oval(ctx, x, y - 1, 5.5, 3.6, '#ffd96a');
      stroke(ctx, '#a87a1a', 0.8, [[x - 2, y - 1], [x + 2, y - 1]]);
    }
  },
  splinter(ctx) {
    poly(ctx, [[0, -14], [7, -2], [3, 13], [-5, 6], [-7, -4]], '#9a6ad8');
    poly(ctx, [[0, -14], [3, 13], [-5, 6], [-7, -4]], '#c9a8ff');
    stroke(ctx, '#f0e0ff', 1, [[-2, -6], [0, 4]]);
  },
  potHp(ctx) {
    box(ctx, -3, -13, 6, 6, 1, '#d8cfb8');
    oval(ctx, 0, 2, 9.5, 10, '#d4402f');
    oval(ctx, -3, -1, 3, 3.6, '#ff9a8a');
  },
  potMp(ctx) {
    box(ctx, -3, -13, 6, 6, 1, '#d8cfb8');
    oval(ctx, 0, 2, 9.5, 10, '#3a6ad8');
    oval(ctx, -3, -1, 3, 3.6, '#9ac0ff');
  }
};

function lootIconUrl(kind) {
  const key = 'loot:' + kind;
  if (!iconCache.has(key)) iconCache.set(key, bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => LOOT_ICON_ART[kind](ctx)).img.toDataURL());
  return iconCache.get(key);
}

// --- Fenster: Inventar und Schmied -------------------------------------------------------

const gear = {
  selected: null,
  sellArmed: false,
  smithRef: null,
  forging: false,

  sellArmedIndex: null,

  message(text, type = 'info') {
    // Meldung im gerade sichtbaren Fenster anzeigen
    const el = ['invMsg', 'smithMsg', 'merchantMsg', 'shopMsg']
      .map((id) => document.getElementById(id))
      .find((x) => x && !x.closest('.panel').hidden);
    if (el) el.hidden = false;
    if (el) {
      el.textContent = text;
      el.className = 'gear-msg ' + type;
    } else {
      ui.log(text, type);
    }
  },

  tile(item, attrs, label, slot) {
    if (!item) {
      // Leere Ausrüstungsplätze zeigen ein blasses Symbol, was dort hingehört
      const ghost = slot ? `<img class="ghost" src="${itemIconUrl(makeItem(slot, 0))}" alt="">` : '';
      return `<button type="button" class="item-tile empty${slot ? ' has-ghost' : ''}" ${attrs}>${ghost}<span class="slot-label">${label || 'leer'}</span></button>`;
    }
    const band = plusBand(item.plus);
    return `<button type="button" class="item-tile band-${band}" ${attrs}>` +
      `<img src="${itemIconUrl(item)}" alt="${itemFullName(item)}">` +
      `<span class="item-plus" style="color:${itemColor(item)}">+${item.plus}</span>` +
      (label ? `<span class="slot-label">${label}</span>` : '') + `</button>`;
  },

  statsList(item, plus) {
    return sortedStats(itemStats(item, plus)).map(([k, v]) => statText(k, v)).join(' · ');
  },

  // Inventar ------------------------------------------------------------------------
  openInventory() {
    ui.closePanels();
    this.selected = null;
    this.sellArmed = false;
    this.renderInventory();
    document.getElementById('panelInv').hidden = false;
  },

  renderInventory() {
    const p = game.player;
    const s = playerStats(p);
    const equip = EQUIP_SLOTS.map((sl) => this.tile(p.equipment[sl.id], `data-equip="${sl.id}"`, sl.name, sl.id)).join('');
    let bag = '';
    for (let i = 0; i < BAG_SIZE; i++) bag += this.tile(p.inventory[i], `data-bag="${i}"`);
    document.getElementById('invBody').innerHTML =
      `<div class="inv-layout">` +
      `<section class="inv-equip"><h3>Angelegt</h3><div class="equip-doll"><canvas id="invDoll" class="doll"></canvas><div class="equip-grid">${equip}</div></div>` +
      `<p class="inv-sum">Angriff ${s.atk} · Verteidigung ${s.def}<br>Leben ${s.maxHp} · Mana ${s.maxMp}</p></section>` +
      `<section class="inv-bag"><h3>Tasche <small>${p.inventory.length}/${BAG_SIZE}</small></h3><div class="bag-grid">${bag}</div>` +
      `<p class="inv-sum">Gold ${p.gold.toLocaleString('de-DE')} · Seelensplitter ${p.splinters} · ` +
      `<img class="mini-icon" src="${scrollIconUrl()}" alt=""> Segensschriftrollen ${p.scrolls}<br>` +
      MATERIALS.map((m) => `<span class="mat-count"><img class="mini-icon" src="${materialIconUrl(m.id)}" alt=""> ${m.tag} ${p.materials[m.id] || 0}</span>`).join(' ') +
      `</p></section>` +
      `</div><div id="invDetail" class="item-detail-wrap"></div><p id="invMsg" class="gear-msg"></p>`;
    drawDoll(document.getElementById('invDoll'));
    const body = document.getElementById('invBody');
    body.querySelectorAll('[data-equip]').forEach((b) => b.addEventListener('click', () => {
      this.selected = { where: 'equip', key: b.dataset.equip };
      this.sellArmed = false;
      this.renderDetail();
    }));
    body.querySelectorAll('[data-bag]').forEach((b) => b.addEventListener('click', () => {
      this.selected = { where: 'bag', key: Number(b.dataset.bag) };
      this.sellArmed = false;
      this.renderDetail();
    }));
    this.renderDetail();
  },

  renderDetail() {
    const el = document.getElementById('invDetail');
    if (!el) return;
    document.querySelectorAll('#invBody .item-tile').forEach((b) => b.classList.remove('selected'));
    const item = itemAt(this.selected);
    if (!item) {
      el.innerHTML = '<p class="hint-text">Tippe einen Gegenstand an, um ihn anzusehen, anzulegen oder zu verkaufen.</p>';
      return;
    }
    const sel = this.selected.where === 'equip' ? `[data-equip="${this.selected.key}"]` : `[data-bag="${this.selected.key}"]`;
    const tileEl = document.querySelector('#invBody ' + sel);
    if (tileEl) tileEl.classList.add('selected');
    const p = game.player;
    const need = ITEM_TIERS[item.tier].level;
    const slotName = EQUIP_SLOTS.find((s) => s.id === item.slot).name;
    const actions = this.selected.where === 'equip'
      ? `<button type="button" class="mini-btn" data-act="unequip">Ablegen</button>`
      : `<button type="button" class="mini-btn" data-act="equip" ${p.level < need || !canWear(item, p.classId) ? 'disabled' : ''}>Anlegen</button>` +
        `<button type="button" class="mini-btn ${this.sellArmed ? 'danger' : ''}" data-act="sell">${this.sellArmed ? 'Wirklich verkaufen?' : 'Verkaufen (' + sellValue(item) + ' Gold)'}</button>`;
    const bonuses = (item.bonuses || []).map((b, i) => `<li><span class="bn">${i + 1}</span>${bonusText(b)}</li>`).join('') +
      (item.specials || []).map((b, i) => `<li class="special"><span class="bn">${6 + i}</span>${bonusText(b, true)}</li>`).join('');
    const can = {
      boniPlus: (item.bonuses || []).length < 4,
      boni5: (item.bonuses || []).length === 4,
      switcher: (item.bonuses || []).length > 0,
      star: (item.specials || []).length < MAX_SPECIAL_BONUS
    };
    const matBtns = MATERIALS.map((m) => {
      const have = p.materials[m.id] || 0;
      return `<button type="button" class="mat-btn" data-mat="${m.id}" title="${m.name}: ${m.text}" ${have && can[m.id] ? '' : 'disabled'}>` +
        `<img src="${materialIconUrl(m.id)}" alt=""><span>${m.tag}</span><b>${have}</b></button>`;
    }).join('');
    el.innerHTML = `<div class="item-detail"><img src="${itemIconUrl(item)}" alt="">` +
      `<div class="item-info"><strong style="color:${itemColor(item)}">${itemFullName(item)}</strong>` +
      `<small>${slotName} · ${itemKindText(item)} · ${ITEM_TIERS[item.tier].label} · ab Stufe ${need}</small>` +
      (canWear(item, p.classId) ? '' : `<small class="need">Nur für ${CLASSES[item.cls].name}. Du kannst es verkaufen.</small>`) +
      `<span>${this.statsList(item)}</span>` +
      (bonuses ? `<ul class="bonus-list">${bonuses}</ul>` : `<small class="hint-text">Noch keine Boni.</small>`) +
      `</div><div class="item-actions">${actions}</div></div>` +
      `<div class="mat-row" id="matRow">${matBtns}</div>`;
    el.querySelectorAll('[data-mat]').forEach((b) => b.addEventListener('click', () => {
      const res = applyMaterial(this.selected, b.dataset.mat);
      const text = res.error || res.text;
      this.renderInventory();
      this.message(text, res.error ? 'warn' : 'success');
      if (!res.error) {
        const row = document.querySelector('#invDetail .item-detail');
        if (row) row.classList.add('enchanted');
        const pl = game.player;
        particles(pl.x, feetY(pl) - 24, { count: 18, color: ['#9fd0ff', '#e0c0ff', '#ffffff'], speed: [40, 120], life: [0.4, 0.8], size: [1.5, 3] });
      }
    }));
    el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'equip') equipFromBag(this.selected.key);
      if (act === 'unequip') unequip(this.selected.key);
      if (act === 'sell') {
        if (!this.sellArmed) {
          this.sellArmed = true;
          this.renderDetail();
          return;
        }
        sellFromBag(this.selected.key);
      }
      const msg = document.getElementById('invMsg').textContent;
      const cls = document.getElementById('invMsg').className;
      this.renderInventory();
      document.getElementById('invMsg').textContent = msg;
      document.getElementById('invMsg').className = cls;
    }));
  },

  // Waffen- und Rüstungshändler ---------------------------------------------------------
  merchant: null,

  openMerchant(type, body) {
    this.merchant = type;
    this.renderMerchant(body);
  },

  renderMerchant(body = document.getElementById('npcBody'), keepMsg) {
    const p = game.player;
    const m = MERCHANTS[this.merchant];
    // Waffen: jede Art der eigenen Klasse als eigene Liste; Rüstung und Helm nur für die eigene Klasse
    const lists = m.slots.flatMap((slot) => (slot === 'waffe' ? CLASS_WEAPON_KINDS[p.classId].map((kind) => ({ slot, kind })) : [{ slot }]));
    const groups = lists.map(({ slot, kind }) => {
      const slotName = EQUIP_SLOTS.find((x) => x.id === slot).name;
      const title = kind ? `${WEAPON_KINDS[kind].name} für ${CLASSES[p.classId].name} <small>${WEAPON_KINDS[kind].text}</small>`
        : CLASS_SLOTS.includes(slot) ? `${slotName} für ${CLASSES[p.classId].name}` : slotName;
      const equipped = p.equipment[slot];
      const eqStats = equipped ? itemStats(equipped) : {};
      const rows = m.prices.map((price, tier) => {
        const item = makeItem(slot, tier, 0, p.classId, kind);
        const need = ITEM_TIERS[tier].level;
        const tooLow = p.level < need;
        // Grün: besser als das, was gerade angelegt ist; rot: schlechter
        const stats = sortedStats(itemStats(item)).map(([k, v]) => {
          const cur = eqStats[k] || 0;
          const cls = v > cur + 1e-9 ? 'up' : v < cur - 1e-9 ? 'down' : '';
          return `<span class="${cls}">${statText(k, v)}</span>`;
        }).join(' · ');
        return `<div class="merchant-item${tooLow ? ' locked' : ''}">` +
          `<img src="${itemIconUrl(item)}" alt="">` +
          `<div class="mi-info"><strong>${itemName(item)}</strong>` +
          `<small class="${tooLow ? 'need' : ''}">ab Stufe ${need} · ${ITEM_TIERS[tier].label}</small>` +
          `<span class="mi-stats">${stats}</span></div>` +
          `<div class="mi-buy"><span class="price">${price.toLocaleString('de-DE')} Gold</span>` +
          `<button type="button" class="mini-btn" data-buy-gear="${slot}:${tier}:${kind || ''}" ${p.gold < price ? 'disabled' : ''}>Kaufen</button>` +
          (tooLow ? '' : `<button type="button" class="mini-btn primary" data-buy-equip="${slot}:${tier}:${kind || ''}" ${p.gold < price ? 'disabled' : ''}>Kaufen &amp; anlegen</button>`) +
          `</div></div>`;
      }).join('');
      return `<h3>${title} <small>· angelegt: ${equipped ? itemFullName(equipped) : 'nichts'}</small></h3><div class="merchant-list">${rows}</div>`;
    }).join('');
    const msg = keepMsg ? document.getElementById('merchantMsg') : null;
    const text = msg ? msg.textContent : '';
    const cls = msg ? msg.className : 'gear-msg';
    body.innerHTML = `<p>„${m.greeting}“</p>` +
      `<p>Dein Gold: <span class="price">${p.gold.toLocaleString('de-DE')}</span> · Tasche ${p.inventory.length}/${BAG_SIZE}</p>` +
      `<p id="merchantMsg" class="${cls}">${text}</p>` + groups + this.sellSectionHtml();
    this.wireSell(body, () => this.renderMerchant(body, true));
    body.querySelectorAll('[data-buy-gear]').forEach((b) => b.addEventListener('click', () => {
      const [slot, tier, kind] = b.dataset.buyGear.split(':');
      this.buyGear(slot, Number(tier), false, kind);
    }));
    body.querySelectorAll('[data-buy-equip]').forEach((b) => b.addEventListener('click', () => {
      const [slot, tier, kind] = b.dataset.buyEquip.split(':');
      this.buyGear(slot, Number(tier), true, kind);
    }));
  },

  // Verkaufsbereich, der in jedem Händlerfenster steht
  sellSectionHtml() {
    const p = game.player;
    if (!p.inventory.length) return `<h3>Verkaufen</h3><p class="hint-text">Deine Tasche ist leer.</p>`;
    return `<h3>Verkaufen <small>aus deiner Tasche</small></h3><div class="sell-grid">` +
      p.inventory.map((item, i) => {
        const armed = this.sellArmedIndex === i;
        return `<div class="sell-item">${this.tile(item, `data-sellinfo="${i}"`)}` +
          `<div class="si-info"><strong style="color:${itemColor(item)}">${itemFullName(item)}</strong>` +
          `<small>${(item.bonuses || []).length + (item.specials || []).length} Boni</small></div>` +
          `<button type="button" class="mini-btn ${armed ? 'danger' : ''}" data-sell="${i}">${armed ? 'Sicher?' : sellValue(item).toLocaleString('de-DE') + ' Gold'}</button></div>`;
      }).join('') + `</div>`;
  },

  wireSell(body, rerender) {
    body.querySelectorAll('[data-sell]').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.sell);
      if (this.sellArmedIndex !== i) {
        this.sellArmedIndex = i;
        rerender();
        return;
      }
      this.sellArmedIndex = null;
      const item = game.player.inventory[i];
      const value = sellValue(item);
      game.player.inventory.splice(i, 1);
      game.player.gold += value;
      saveGame();
      rerender();
      this.message(`${itemFullName(item)} für ${value.toLocaleString('de-DE')} Gold verkauft.`, 'success');
    }));
  },

  buyGear(slot, tier, equip, kind) {
    const p = game.player;
    const price = MERCHANTS[this.merchant].prices[tier];
    const item = makeItem(slot, tier, 0, p.classId, kind || null);
    if (p.gold < price) {
      this.message(`Dir fehlen ${(price - p.gold).toLocaleString('de-DE')} Gold.`, 'warn');
      return;
    }
    if (!addToBag(item)) {
      this.message('Deine Tasche ist voll. Verkaufe zuerst etwas im Inventar.', 'warn');
      return;
    }
    p.gold -= price;
    if (equip && equipFromBag(p.inventory.length - 1)) {
      this.message(`${itemName(item)} gekauft und angelegt.`, 'success');
    } else {
      this.message(`${itemName(item)} gekauft. Du findest es im Inventar.`, 'success');
    }
    saveGame();
    this.renderMerchant(undefined, true);
  },

  // Schmied ---------------------------------------------------------------------------
  openSmith(body) {
    this.smithRef = null;
    this.forging = false;
    this.renderSmith(body);
  },

  renderSmith(body = document.getElementById('npcBody')) {
    const p = game.player;
    const refs = [];
    EQUIP_SLOTS.forEach((sl) => { if (p.equipment[sl.id]) refs.push({ where: 'equip', key: sl.id }); });
    p.inventory.forEach((it, i) => refs.push({ where: 'bag', key: i }));
    if (this.smithRef && !itemAt(this.smithRef)) this.smithRef = null;
    if (!this.smithRef && refs.length) this.smithRef = refs[0];
    const list = refs.map((r) => {
      const it = itemAt(r);
      const sel = this.smithRef && r.where === this.smithRef.where && r.key === this.smithRef.key;
      return this.tile(it, `data-ref="${r.where}:${r.key}" class-sel="${sel}"`, r.where === 'equip' ? 'angelegt' : '');
    }).join('');
    body.innerHTML =
      `<p>„Zeig mir, was ich schmieden soll. Bis +3 passiert nichts Schlimmes, ab +7 kann es zerbrechen. Ab +6 brauche ich Teile von Monstern, für Ausrüstung ab Stufe 30 schon ab +4. Ich schmiede bis +20.“</p>` +
      `<div class="smith"><div class="smith-list">${list || '<p class="hint-text">Du hast keine Ausrüstung.</p>'}</div>` +
      `<div id="smithWork" class="smith-work"></div></div><p id="smithMsg" class="gear-msg"></p>`;
    body.querySelectorAll('[data-ref]').forEach((b) => {
      if (b.getAttribute('class-sel') === 'true') b.classList.add('selected');
      b.addEventListener('click', () => {
        if (this.forging) return;
        const [where, key] = b.dataset.ref.split(':');
        this.smithRef = { where, key: where === 'bag' ? Number(key) : key };
        this.renderSmith(body);
      });
    });
    this.renderWork();
  },

  renderWork() {
    const el = document.getElementById('smithWork');
    const item = itemAt(this.smithRef);
    if (!el) return;
    if (!item) {
      el.innerHTML = '';
      return;
    }
    const p = game.player;
    if (item.plus >= MAX_PLUS) {
      el.innerHTML = this.anvil(item) + `<p><strong style="color:${itemColor(item)}">${itemFullName(item)}</strong></p><p>Höher geht es nicht. Ein Meisterstück!</p>`;
      return;
    }
    const step = UPGRADE_STEPS[item.plus];
    const cost = upgradeCost(item);
    const enough = canPayUpgrade(cost);
    const mat = cost.mat;
    const have = mat ? p.upmats[mat.id] || 0 : 0;
    const matLine = mat
      ? `<p class="smith-cost smith-mat"><img class="mini-icon" src="${mobMatIconUrl(mat.id)}" alt=""> Dazu: <b class="${have >= mat.count ? '' : 'lack'}">${mat.count} × ${MOB_MATS[mat.id].name}</b> (du hast ${have}) ` +
        `<small>von: ${MONSTER_TYPES[mat.id].name}, Stufe ${MONSTER_TYPES[mat.id].level}</small></p>`
      : (item.plus + 1 >= upgradeMatStart(item.tier) ? '' : `<p class="hint-text">Ab +${upgradeMatStart(item.tier)} braucht der Schmied zusätzlich Teile von Monstern.</p>`);
    const risk = step.fail === 'none' ? 'Bei Fehlschlag sind nur die Kosten weg.'
      : step.fail === 'down' ? `Bei Fehlschlag fällt der Gegenstand auf +${item.plus - 1} zurück.`
        : 'Bei Fehlschlag zerbricht der Gegenstand!';
    const next = { ...item, plus: item.plus + 1 };
    el.innerHTML = this.anvil(item) +
      `<p class="smith-step"><strong style="color:${itemColor(item)}">${itemFullName(item)}</strong> → <strong style="color:${itemColor(next)}">+${next.plus}</strong></p>` +
      `<p class="smith-stats">${this.statsList(item)}<br>→ ${this.statsList(item, item.plus + 1)}</p>` +
      `<div class="chance"><i style="width:${step.chance * 100}%"></i><span>Erfolgschance ${Math.round(step.chance * 100)} %</span></div>` +
      `<p class="smith-cost">Kosten: <b class="${p.gold >= cost.gold ? '' : 'lack'}">${cost.gold.toLocaleString('de-DE')} Gold</b> und ` +
      `<b class="${p.splinters >= cost.splinters ? '' : 'lack'}">${cost.splinters} Seelensplitter</b> (du hast ${p.splinters})</p>` + matLine +
      `<p class="smith-risk ${step.fail}">${risk}</p>` +
      (step.fail !== 'none' ? `<label class="scroll-opt" for="useScroll"><input id="useScroll" type="checkbox" ${p.scrolls ? '' : 'disabled'}>` +
        `<img class="mini-icon" src="${scrollIconUrl()}" alt=""> Segensschriftrolle verwenden (${p.scrolls} vorhanden)</label>` : '') +
      `<button id="btnForge" type="button" class="btn btn-primary" ${enough ? '' : 'disabled'}>Verbessern</button>`;
    document.getElementById('btnForge').addEventListener('click', () => this.forge());
  },

  anvil(item) {
    return `<div class="anvil" id="anvil"><img class="anvil-item" src="${itemIconUrl(item)}" alt="">` +
      `<span class="hammer"></span><span class="spark s1"></span><span class="spark s2"></span><span class="spark s3"></span></div>`;
  },

  forge() {
    if (this.forging) return;
    const scrollBox = document.getElementById('useScroll');
    const useScroll = !!(scrollBox && scrollBox.checked);
    const before = itemAt(this.smithRef);
    const name = itemName(before);
    const from = before.plus;
    const res = upgradeItem(this.smithRef, useScroll);
    if (!res) return;
    this.forging = true;
    document.getElementById('btnForge').disabled = true;
    const anvil = document.getElementById('anvil');
    anvil.classList.add('forging');
    const smith = game.world.npcs.find((n) => n.id === 'schmied');
    particles(smith.x + 12, feetY(smith) - 14, { count: 24, color: ['#ffd34d', '#ff9a3a', '#ffffff'], speed: [80, 200], life: [0.3, 0.6], size: [1.5, 2.5], shape: 'spark', drag: 4, gravity: 300 });
    setTimeout(() => {
      this.forging = false;
      const msg = document.getElementById('smithMsg');
      if (!msg || !document.getElementById('anvil')) return; // Fenster wurde inzwischen geschlossen
      const p = game.player;
      if (res.result === 'success') {
        anvil.classList.add('success');
        msg.textContent = `Erfolg! ${name} ist jetzt +${res.item.plus}.`;
        msg.className = 'gear-msg success';
        addText(p.x, feetY(p) - 72, `${name} +${res.item.plus}`, 'crit');
        particles(p.x, feetY(p) - 20, { count: 30, color: [itemColor(res.item), '#ffffff', '#ffd34d'], speed: [60, 180], life: [0.5, 0.9], size: [2, 3.5] });
      } else {
        anvil.classList.add('fail');
        msg.className = 'gear-msg fail';
        if (res.result === 'fail') msg.textContent = useScroll ? `Fehlgeschlagen. Die Segensschriftrolle hat ${name} +${from} geschützt.` : `Fehlgeschlagen. ${name} bleibt +${from}.`;
        if (res.result === 'down') msg.textContent = `Fehlgeschlagen! ${name} ist auf +${res.item.plus} gefallen.`;
        if (res.result === 'break') msg.textContent = `Fehlgeschlagen! ${name} +${from} ist zerbrochen.`;
        shakeScreen(res.result === 'break' ? 6 : 3);
      }
      ui.log(msg.textContent, res.result === 'success' ? 'level' : 'warn');
      const text = msg.textContent;
      const cls = msg.className;
      setTimeout(() => {
        if (document.getElementById('panelNpc').hidden) return;
        this.renderSmith();
        const m2 = document.getElementById('smithMsg');
        m2.textContent = text;
        m2.className = cls;
      }, 1100);
    }, 950);
  }
};
