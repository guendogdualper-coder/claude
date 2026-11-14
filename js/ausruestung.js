// Ausrüstung: Gegenstände, Inventar, Beute, Händler, Schmied und die zugehörigen Fenster.

// --- Gegenstände -------------------------------------------------------------------
// Ein Gegenstand ist { uid, slot, tier, plus, cls, kind, rarity }; tier ist der Index in ITEM_TIERS.
// cls: Klasse, die ihn tragen kann (nur Waffe, Rüstung, Helm); kind: Waffenart (siehe WEAPON_KINDS).
// rarity (seit 13.56): Seltenheit 0–4 (RARITIES, seltenheit.js); neue Teile sind erst einmal Normal.

function makeItem(slot, tier, plus = 0, cls = null, kind = null) {
  // seit 14.16: keine Beute über +4 (MAX_DROP_PLUS), egal woher
  const item = { uid: Math.random().toString(36).slice(2, 10), slot, tier, plus: Math.max(0, Math.min(MAX_DROP_PLUS, plus | 0)), rarity: 0 };
  if (CLASS_SLOTS.includes(slot)) {
    item.cls = cls || (game.player ? game.player.classId : 'krieger');
    if (slot === 'waffe') item.kind = kind || CLASS_WEAPON_KINDS[item.cls][0];
  }
  if (slot === 'schild') item.cls = 'krieger';
  if (slot === 'koecher') item.cls = 'ninja';
  return item;
}

// Köcher (seit 13.20): liegt als eigener Gegenstand in der Tasche und wird im Platz der Nebenhand getragen,
// aber nur zusammen mit einem Bogen
function isQuiver(item) {
  return !!item && item.slot === 'koecher';
}
function equipSlotOf(item) {
  return isQuiver(item) ? 'schild' : item.slot;
}
// Trägt die Figur einen Bogen (dann gehört der Köcher in die Nebenhand)?
function quiverMode(p) {
  return !!p && p.classId === 'ninja' && !!p.equipment && !!p.equipment.waffe && p.equipment.waffe.kind === 'bow';
}
function slotNameOf(slotId) {
  if (slotId === 'koecher') return 'Köcher';
  const sl = EQUIP_SLOTS.find((s) => s.id === slotId);
  return sl ? sl.name : slotId;
}
// Bester Köcher aus der Tasche, wenn ein Bogen angelegt wird (Index oder -1)
function bestQuiverIndex(p) {
  let best = -1;
  p.inventory.forEach((it, i) => {
    if (!isQuiver(it) || !canWear(it, p)) return;
    const b = p.inventory[best];
    if (best < 0 || it.tier > b.tier || (it.tier === b.tier && it.plus > b.plus)) best = i;
  });
  return best;
}

function starterEquipment(classId = 'krieger') {
  return { waffe: makeItem('waffe', 0, 0, classId), ruestung: makeItem('ruestung', 0, 0, classId), helm: null, schultern: null, umhang: null, schild: null, schuhe: null, guertel: null };
}

// Spielstände vor Version 1.4 kannten nur vier Stufen (Lv 1, 8, 15, 22).
// Sie werden auf die gleichnamigen neuen Stufen gelegt, damit nichts schwächer wird.
function migrateItem(item) {
  if (item) item.tier = [0, 2, 3, 4][item.tier] ?? item.tier;
  return item;
}

// Gegenstände von vor Version 2.3 gehören noch keiner Klasse: sie werden der eigenen zugeordnet
function assignClass(item, classId) {
  if (item && item.slot === 'schild') item.cls = 'krieger'; // Schilde gehören seit Version 3.2 dem Krieger
  if (!item || !CLASS_SLOTS.includes(item.slot)) return item;
  if (!item.cls) item.cls = classId;
  if (item.slot === 'waffe' && !item.kind) item.kind = CLASS_WEAPON_KINDS[item.cls][0];
  return item;
}

// who: die Figur (prüft auch den Weg) oder nur eine Klasse
function canWear(item, who) {
  return !wearProblem(item, who);
}

// Warum ein Gegenstand nicht passt, als Text; leer, wenn er passt
// Mindeststufe eines Gegenstands: die Stufe seiner Gegenstandsstufe
function itemLevelReq(item) {
  return item && !isBook(item) && ITEM_TIERS[item.tier] ? ITEM_TIERS[item.tier].level : 1;
}

// --- Itemlevel (seit 14.32, Regeln bei ILVL in daten/gegenstaende.js) --------------------------------------------
// Nicht verwechseln: itemLevelReq = benötigte Stufe (zum Anlegen), itemIlvl = Itemlevel (Stärke des Teils).
// Würfelglück eines Bonus: 0 = unteres Ende seiner Spanne auf dieser Gegenstandsstufe, 1 = oberes (wie bonusValue)
function bonusRollQuality(b, tier, special) {
  const def = (special ? SPECIAL_BONUS_TYPES : BONUS_TYPES)[b && b.t];
  if (!def) return 0.5;
  if (def.steps) {
    const i = def.steps.indexOf(b.v);
    return i < 0 ? 0.5 : i / (def.steps.length - 1);
  }
  const t = tier || 0;
  const f = def.fmt === 'flat' ? 1 + t * (def.tierScale || 0.35) : 1 + t * 0.1;
  const lo = def.range[0] * f;
  const hi = Math.min(def.max || Infinity, def.range[1] * f);
  if (!(hi > lo)) return b.v >= hi ? 1 : 0;
  return Math.max(0, Math.min(1, (b.v - lo) / (hi - lo)));
}
// Stufe, auf der ein graues +0-Teil die Stärke exp(logS) hätte (Waffenschaden je Gegenstandsstufe als Maßstab)
function ilvlFromStrength(logS) {
  const T = ITEM_TIERS;
  const L = BASE_STATS.waffe.map((x) => Math.log(x.atk));
  for (let i = 1; i < T.length; i++) {
    if (logS <= L[i]) return T[i - 1].level + ((logS - L[i - 1]) / (L[i] - L[i - 1])) * (T[i].level - T[i - 1].level);
  }
  const n = T.length - 1;
  return T[n].level + ((logS - L[n]) * (T[n].level - T[n - 1].level)) / (L[n] - L[n - 1]);
}
// Itemlevel eines Teils (0 für Bücher und Unbekanntes); nie unter der benötigten Stufe
function itemIlvl(item) {
  if (!item || isBook(item) || !item.slot || !ITEM_TIERS[item.tier]) return 0;
  let m = rarityStatMul(item) * (1 + PLUS_BONUS * Math.max(0, item.plus | 0));
  let bw = 0;
  for (const b of item.bonuses || []) bw += ILVL.bonusBase + ILVL.bonusRoll * bonusRollQuality(b, item.tier);
  for (const b of item.specials || []) bw += ILVL.special * (ILVL.bonusBase + ILVL.bonusRoll * bonusRollQuality(b, item.tier, true));
  m *= 1 + bw;
  const base = Math.log(BASE_STATS.waffe[item.tier].atk);
  return Math.max(ITEM_TIERS[item.tier].level, Math.round(ilvlFromStrength(base + Math.log(m))));
}
// Ausrüstungslevel (seit 14.48, Bestenliste und Mitspieler): Durchschnitt der Itemlevel aller angelegten Teile
function gearLevelOf(equipment) {
  if (!equipment) return 0;
  let sum = 0;
  let n = 0;
  for (const it of Object.values(equipment)) {
    const v = itemIlvl(it);
    if (v > 0) { sum += v; n++; }
  }
  return n ? Math.round(sum / n) : 0;
}
// Benötigte Stufe als Text (rot, wenn die Figur sie noch nicht hat) – getrennt vom Itemlevel
function reqLevelHtml(item, p) {
  const need = itemLevelReq(item);
  const low = p && p.level < need;
  return `<span class="req-lvl${low ? ' need' : ''}">Benötigte Stufe ${need}</span>`;
}
// Itemlevel im Vergleich mit dem angelegten Teil (Hinweis und Vergleichsfeld); leer ohne angelegtes Teil
function ilvlCompareHtml(item, worn) {
  if (!item || !worn || worn === item || isBook(item) || isBook(worn)) return '';
  const a = itemIlvl(item);
  const b = itemIlvl(worn);
  const d = a - b;
  const cls = d > 0 ? 'up' : d < 0 ? 'down' : 'same';
  return `<span class="cmp ilvl-cmp ${cls}">Itemlevel ${a} · angelegt ${b}${d ? ` (${d > 0 ? '+' : '−'}${Math.abs(d)})` : ''}</span>`;
}

// seit 15.04: beim Vergleichen zählt die Stufengrenze nicht – ein Teil, das man erst eine Stufe später anlegen kann,
// zeigt trotzdem, ob es besser oder schlechter ist (falsche Klasse oder falscher Weg bleiben ohne Vergleich)
let WEAR_NO_LEVEL = false;
function canCompare(item, p) {
  WEAR_NO_LEVEL = true;
  try { return !wearProblem(item, p); } finally { WEAR_NO_LEVEL = false; }
}
function wearProblem(item, who) {
  const classId = typeof who === 'string' ? who : who.classId;
  if (item.cls && item.cls !== classId) {
    return item.slot === 'schild' ? 'Schilde trägt nur der Krieger.' : `Nur für ${CLASSES[item.cls].name}.`;
  }
  // Seit Version 6.2: Ausrüstung erst ab der Stufe ihrer Gegenstandsstufe (z. B. Göttlich ab 60)
  const need = itemLevelReq(item);
  if (typeof who === 'object' && who.level < need && !WEAR_NO_LEVEL) return `Erst ab Stufe ${need}.`;
  const k = item.slot === 'waffe' && WEAPON_KINDS[item.kind];
  if (k && k.path != null && typeof who === 'object' && (who.path || 0) !== k.path) {
    return `${k.name} führt nur der ${CLASSES[classId].paths[k.path].name}.`;
  }
  return '';
}

// Kann die Figur eine zweite Einhandwaffe (Schwert oder Axt) in der Nebenhand (Platz des Schildes) führen?
function canDualWield(p) {
  return p.classId === 'krieger' && !!p.dualWield && (p.path || 0) === DUAL_WIELD.path;
}
// Beidhändigkeit gelernt, wirkt aber auf dem jetzigen Weg nicht (seit 13.85: wird erklärt statt still zu scheitern)
function dualWieldIdle(p) {
  return p.classId === 'krieger' && !!p.dualWield && (p.path || 0) !== DUAL_WIELD.path;
}
// Titanengriff: Krieger des Leibes ab Stufe 20, gelernt beim Waffenhändler
function canTitanGrip(p) {
  return p.classId === 'krieger' && !!p.titanGrip && (p.path || 0) === TITAN_GRIP.path && p.level >= TITAN_GRIP.level;
}
// Waffenarten, die in die Nebenhand dürfen: Schwert oder Axt, auch gemischt (Krieger der Klinge mit
// Beidhändigkeit, seit 13.85 – vorher nur das Schwert), Dolch (Ninja) oder mit Titanengriff die Zweihandwaffe der
// Haupthand (zweite Streitaxt bzw. zweiter Zweihänder). Leer: keine Nebenhand.
function offhandKinds(p) {
  if (!p) return [];
  if (p.classId === 'ninja') return ['dagger'];
  if (canTitanGrip(p)) {
    const main = p.equipment && p.equipment.waffe;
    return [main && (main.kind === 'greataxe' || main.kind === 'greatsword') ? main.kind : 'greataxe'];
  }
  return canDualWield(p) ? DUAL_WIELD.kinds : [];
}
// Erste dieser Arten (für Texte) bzw. null ohne Nebenhand
function offhandKind(p) {
  return offhandKinds(p)[0] || null;
}
// Darf dieses Teil in die Nebenhand der Figur?
function offhandAllows(p, item) {
  return !!item && item.slot === 'waffe' && offhandKinds(p).includes(item.kind);
}
// Zwei Waffen führen (seit 13.85 für alle gleich): passt das Teil in die Nebenhand und hält die Haupthand schon eine
// Waffe, die selbst dorthin passen würde (Dolch zu Dolch, Schwert/Axt zu Schwert/Axt, Streitaxt zu Streitaxt)?
function offhandPair(p, item) {
  const main = p && p.equipment && p.equipment.waffe;
  return offhandAllows(p, item) && !!main && offhandAllows(p, main);
}
// Text, warum ein Teil nicht in die Nebenhand passt
function offhandProblem(p, item) {
  if (p.classId === 'ninja') return 'In die Nebenhand passt nur ein Dolch.';
  if (canTitanGrip(p)) return `Mit dem Titanengriff passt in die Nebenhand nur eine zweite Waffe wie in der Haupthand (${WEAPON_KINDS[offhandKind(p)].name}).`;
  if (canDualWield(p)) return 'In die Nebenhand passt nur ein Schwert oder eine Axt.';
  if (dualWieldIdle(p)) return `Deine Beidhändigkeit wirkt nur auf dem ${CLASSES.krieger.paths[DUAL_WIELD.path].name}. Auf dem ${CLASSES.krieger.paths[p.path || 0].name} führst du keine zweite Einhandwaffe.`;
  return 'Eine zweite Waffe führt nur ein Krieger der Klinge mit Beidhändigkeit (Schwert oder Axt) oder ein Krieger des Leibes mit Titanengriff (Zweihänder).';
}
// Daten der Nebenhand (Anteil am Angriff, Tempo, Boni)
function offhandRules(p) {
  return p.classId === 'ninja' ? DUAL_DAGGER : canTitanGrip(p) ? TITAN_GRIP : DUAL_WIELD;
}

// Waffe in der Nebenhand (zweites Schwert oder zweite Axt, zweiter Dolch, zweiter Zweihänder)
function isOffhand(item) {
  return !!item && item.slot === 'waffe';
}

// Name des Schildplatzes: mit Beidhändigkeit auch für eine zweite Waffe
function slotLabel(slotId, p = game.player) {
  if (slotId === 'schild' && quiverMode(p)) return 'Köcher';
  if (slotId === 'schild' && p && offhandKind(p)) return 'Nebenhand';
  return slotNameOf(slotId);
}

// Hält die Ausrüstung bei den Regeln: kein Schild ohne Krieger, kein Zweihänder ohne Weg des Leibes,
// keine zweite Waffe ohne Beidhändigkeit. Was nicht passt, wandert in die Tasche (notfalls über die Größe).
function enforceGearRules(p) {
  const moved = [];
  const eq = p.equipment;
  const off = (slot) => {
    const it = eq[slot];
    eq[slot] = null;
    p.inventory.push(it);
    moved.push(it);
  };
  if (p.classId !== 'krieger' && eq.schild && !(p.classId === 'ninja' && (isOffhand(eq.schild) || isQuiver(eq.schild)))) off('schild');
  // Ein angelegter Zweihänder (Streitaxt) wird für den Weg der Klinge zum Schwert (zur Axt) gleicher Stufe;
  // Plus und Boni bleiben
  const ONE_HAND = { greatsword: 'sword', greataxe: 'axe' };
  if (eq.waffe && ONE_HAND[eq.waffe.kind] && eq.waffe.cls === p.classId && !canWear(eq.waffe, p)) {
    eq.waffe.kind = ONE_HAND[eq.waffe.kind];
    moved.push(eq.waffe);
  }
  if (eq.waffe && !canWear(eq.waffe, p)) off('waffe');
  if (isOffhand(eq.schild) && !offhandAllows(p, eq.schild)) off('schild');
  if (eq.schild && !isOffhand(eq.schild) && !canWear(eq.schild, p)) off('schild');
  // Köcher nur zusammen mit einem Bogen, und ein Bogen lässt außer dem Köcher nichts in der Nebenhand zu
  if (isQuiver(eq.schild) && !quiverMode(p)) off('schild');
  if (eq.waffe && WEAPON_KINDS[eq.waffe.kind]?.twoHanded && eq.schild && !isQuiver(eq.schild) && !(canTitanGrip(p) && isOffhand(eq.schild))) off('schild');
  return moved;
}

function itemName(item) {
  const names = ITEM_NAMES[item.slot];
  if (!names) return 'Gegenstand';
  if (Array.isArray(names)) return names[item.tier];
  return item.slot === 'waffe' ? names[item.kind][item.tier] : names[item.cls][item.tier];
}

// Kurzbeschreibung: Waffenart bzw. Klasse
function itemKindText(item) {
  if (item.slot === 'waffe') {
    // unbekannte Waffenart (Gegenstand aus einer neueren Version): nicht abstürzen
    const k = WEAPON_KINDS[item.kind] || { name: 'Waffe' };
    const who = k.path != null ? CLASSES[item.cls].paths[k.path].name : CLASSES[item.cls].name;
    return `${k.name}${k.twoHanded ? ' (Zweihand)' : ''} · ${who}`;
  }
  // seit 13.67: Köcher geben keine unendlichen Übungspfeile mehr – geschossen wird nur mit gekauften Pfeilen
  if (isQuiver(item)) return `Köcher für den Bogen · trägt deine Pfeile (Munition kaufst du bei der Bogenmacherin)`;
  if (item.cls) return CLASSES[item.cls].name;
  return 'alle Klassen';
}

// Waffenart beim Händler (seit 13.57): Bögen nur bei der Bogenmacherin (kinds), nicht beim Waffenhändler (skipKinds)
function merchantKindOk(m, kind) {
  if (!kind) return true;
  if (m.kinds && !m.kinds.includes(kind)) return false;
  return !(m.skipKinds && m.skipKinds.includes(kind));
}

// Ladenpreis: Köcher kosten gut die Hälfte einer Waffe gleicher Stufe
function merchantPrice(type, slot, tier) {
  const base = MERCHANTS[type].prices[tier];
  return slot === 'koecher' ? Math.round(base * 0.6) : base;
}

// Pfeile im Köcher: Name und Farbe je Stufe
function quiverArrows(item) {
  return QUIVER_ARROWS[Math.max(0, Math.min(QUIVER_ARROWS.length - 1, item ? item.tier : 0))];
}

// seit 13.56 ohne „Legendär:“ davor – legendär ist jetzt die goldene Seltenheit (Farbe des Namens)
function itemFullName(item) {
  return itemName(item) + ' +' + item.plus;
}

// Farbe des Namens: die Seltenheit (seit 13.56; vorher nach dem Plus)
function itemColor(item) {
  return rarityColor(item);
}
// Farbe des Plus (+7 blau, +10 gold …), wie bisher
function plusColor(item) {
  return PLUS_COLORS[plusBand(item.plus)] || '#ece2cb';
}

// Werte inklusive Verbesserung. Anteile (Prozentwerte) wachsen um 10 % je Plus,
// ganze Zahlen um 10 % des Grundwerts, mindestens aber um 1.
function itemStats(item, plus = item.plus) {
  const t = item.tier;
  const base = { ...((BASE_STATS[item.slot] || [])[t] || {}) };
  let speed = null;
  if (item.slot === 'waffe') {
    const k = WEAPON_KINDS[item.kind] || { atkMul: 1, atkSpeed: 0 };
    base.atk = Math.round(base.atk * k.atkMul);
    if ((item.kind === 'dagger' || item.kind === 'bow') && CRIT_BY_TIER[t]) base.crit = CRIT_BY_TIER[t] * (item.kind === 'bow' ? 0.7 : 1);
    if (k.magic && t) {
      base.mp = MP_BY_TIER[t];
      base.magic = MAGIC_BY_TIER[t] * (k.magicMul || 1);
    }
    speed = k.atkSpeed + SPEED_BY_TIER[t];
  } else if (item.cls && CLASS_SLOTS.includes(item.slot)) {
    const c = CLASS_ARMOR[item.cls];
    if (base.def) base.def = Math.max(1, Math.round(base.def * c.def));
    if (base.hp) base.hp = Math.round(base.hp * c.hp);
    if (c.mp && base.hp) base.mp = (base.mp || 0) + Math.round(base.hp * c.mp);
    if (c.dodge && t) base.dodge = c.dodge * t;
  }
  // seit 14.15: Krieger und Ninja bekommen auf Helm und Umhang Leben statt Mana (gleicher Wert)
  if (base.mp && item.slot !== 'waffe' && noManaFor(item)) { base.hp = (base.hp || 0) + base.mp; delete base.mp; }
  // seit 13.49: Klassen-Ausrüstung trägt den Hauptwert der Klasse (Krieger Stärke, Ninja Geschick, sonst Intelligenz)
  let attr = null;
  if (item.cls && CLASS_SLOTS.includes(item.slot) && item.slot !== 'waffe' && CLASS_ATTR_BY_TIER[t]) attr = [MAIN_ATTR[item.cls], CLASS_ATTR_BY_TIER[t]];
  // seit 13.56: höhere Seltenheit, etwas mehr Angriff, Rüstung, Leben und Mana (Faktor vor dem Plus)
  const rm = rarityStatMul(item);
  if (rm !== 1) for (const k of RARITY_STAT_KEYS) if (base[k] >= 1) base[k] = Math.round(base[k] * rm);
  const out = {};
  for (const [k, v] of Object.entries(base)) {
    // seit 13.37: Waffenschaden wächst stärker je Plus (13 % statt 10 % des Grundwerts)
    const pb = item.slot === 'waffe' && k === 'atk' ? PLUS_BONUS_WEAPON : PLUS_BONUS;
    out[k] = v < 1 ? v * (1 + pb * plus) : v + plus * Math.max(1, Math.round(v * pb));
  }
  // Das Tempo einer Waffe hängt von ihrer Art ab; seit 13.37 gibt jedes Plus zusätzlich +0,5 % Angriffstempo
  if (speed != null && item.slot === 'waffe') out.atkSpeed = speed + plus * PLUS_ATK_SPEED;
  if (out.atkSpeed === 0) delete out.atkSpeed;
  // Waffenschaden (seit 13.10) als Spanne statt „Angriff +X“: jeder Schlag würfelt in dieser Spanne,
  // der Mittelwert entspricht dem bisherigen Angriffswert der Waffe (Stufe und Plus heben beide Grenzen)
  if (item.slot === 'waffe' && out.atk) out.dmg = weaponDmgRange(out.atk);
  // Das Lauftempo der Schuhe auch nicht (seit 8.5)
  if (base.speed) out.speed = base.speed;
  // Hauptwert der Klasse: fest, ohne Plus
  if (attr && attr[0]) out[attr[0]] = attr[1];
  return out;
}

// seit 13.49 heißen Leben und Mana auch so (vorher „Vitalität … Leben“ und „Intelligenz … Mana“ – das sah aus,
// als gäbe jeder Helm Intelligenz)
const STAT_LABELS = {
  atk: 'Angriff', def: 'Rüstung', hp: 'Leben', mp: 'Mana', crit: 'Kritisch',
  str: 'Stärke', vit: 'Vitalität', int: 'Intelligenz', dex: 'Geschick',
  speed: 'Lauftempo', dodge: 'Ausweichen', block: 'Blocken', regen: 'Regeneration',
  atkSpeed: 'Angriffstempo', magic: 'Magiestärke'
};
function weaponDmgRange(atk) {
  return [Math.max(1, Math.round(atk * 0.8)), Math.max(2, Math.round(atk * 1.25))];
}
const STAT_ORDER = ['dmg', 'atk', 'atkSpeed', 'magic', 'str', 'dex', 'int', 'vit', 'def', 'hp', 'mp', 'crit', 'block', 'dodge', 'speed', 'regen'];

function statText(k, v) {
  if (k === 'dmg') return `Schaden ${v[0]}–${v[1]}`;
  const pct = (x, d = 0) => (x * 100).toFixed(d).replace('.', ',');
  if (k === 'regen') return `${STAT_LABELS[k]} +${pct(v, 1)} %/s`;
  if (k === 'atkSpeed') return `${STAT_LABELS[k]} ${v >= 0 ? '+' : '−'}${pct(Math.abs(v))} %`;
  if (k === 'crit' || k === 'speed' || k === 'dodge' || k === 'block' || k === 'magic') return `${STAT_LABELS[k]} +${pct(v)} %`;
  return `${STAT_LABELS[k]} +${v}`;
}

function sortedStats(stats) {
  // Waffen zeigen ihren Schaden statt des Angriffswerts
  return STAT_ORDER.filter((k) => stats[k] != null && !(k === 'atk' && stats.dmg)).map((k) => [k, stats[k]]);
}

// --- Vergleich mit der angelegten Ausrüstung ----------------------------------------------
// Rechnet die eigenen Werte einmal mit dem Gegenstand angelegt und vergleicht sie mit jetzt.
// So zählen Boni, Statuspunkte und auch ein Schild, der bei Zweihandwaffen wegfällt, mit.
// Ergebnis: [[Name, Unterschied als Text, +1 besser / -1 schlechter], ...]
const COMPARE_STATS = [
  ['atk', 'Angriff', 'flat'], ['def', 'Verteidigung', 'flat'], ['maxHp', 'Leben', 'flat'], ['maxMp', 'Mana', 'flat'],
  // seit 13.87: Fertigkeitsschaden als Änderung des echten Treffers (Angriff × Faktor, playerStats.skillPower) statt
  // des Faktors allein – der sank mit mehr Angriff, so sah ein Lv-5-Zepter besser aus als ein Lv-80-Zepter
  ['crit', 'Kritisch', 'pct'], ['atkSpeed', 'Angriffstempo', 'pct'], ['skillPower', 'Fertigkeitsschaden', 'rel'],
  ['dodge', 'Ausweichen', 'pct'], ['block', 'Blocken', 'pct'], ['hpSteal', 'Lebensraub', 'pct'],
  ['monsterDmg', 'Gegen Monster', 'pct'], ['regen', 'Regeneration', 'pct1'], ['speed', 'Lauftempo', 'speed'],
  ['damageTaken', 'Erlittener Schaden', 'lessPct'],
  // seit 14.15
  ['critDmg', 'Kritischer Schaden', 'pct'], ['poison', 'Vergiftungschance', 'pct'],
  ['vsBeast', 'Gegen Tiere', 'pct'], ['vsHuman', 'Gegen Menschen', 'pct'], ['vsOrc', 'Gegen Orks und Riesen', 'pct'],
  ['vsUndead', 'Gegen Untote und Geister', 'pct'], ['vsDemon', 'Gegen Teufel und Dämonen', 'pct'],
  ['resHuman', 'Abwehr gegen Menschen', 'pct'], ['resMagic', 'Abwehr gegen Magie', 'pct'], ['resMelee', 'Abwehr gegen Nahkampf', 'pct'],
  ['resRanged', 'Abwehr gegen Fernkampf', 'pct'], ['goldFind', 'Mehr Gold', 'pct'], ['dropFind', 'Mehr Beute', 'pct']
];
function compareItem(item, hand) {
  const p = game.player;
  if (!item || isBook(item) || !canCompare(item, p)) return null;
  const now = playerStats(p);
  const slot = hand === 'off' ? 'schild' : equipSlotOf(item);
  const eq = { ...p.equipment, [slot]: item };
  if (slot === 'waffe' && WEAPON_KINDS[item.kind] && WEAPON_KINDS[item.kind].twoHanded && !(item.kind === 'bow' && isQuiver(eq.schild))) eq.schild = null;
  if (slot === 'waffe' && item.kind !== 'bow' && isQuiver(eq.schild)) eq.schild = null;
  if (slot === 'schild' && !isQuiver(item) && p.equipment.waffe && WEAPON_KINDS[p.equipment.waffe.kind]?.twoHanded) eq.waffe = null;
  let test;
  WEAR_NO_LEVEL = true;
  try { test = playerStats({ ...p, equipment: eq }); } finally { WEAR_NO_LEVEL = false; }
  const out = [];
  for (const [k, name, fmt] of COMPARE_STATS) {
    const a = now[k] || 0;
    const b = test[k] || 0;
    let d = b - a;
    if (fmt === 'speed' || fmt === 'rel') d = a ? d / a : 0;
    if (Math.abs(d) < (fmt === 'flat' ? 0.5 : 0.0005)) continue;
    const better = fmt === 'lessPct' ? d < 0 : d > 0;
    const sign = d > 0 ? '+' : '−';
    const abs = Math.abs(d);
    const val = fmt === 'flat' ? Math.round(abs) : fmt === 'pct1' ? (abs * 100).toFixed(1).replace('.', ',') + ' %/s' : (abs * 100).toFixed(1).replace('.', ',').replace(',0', '') + ' %';
    // 4. Wert (seit 15.06): Größe der Änderung als Anteil (bei festen Werten gemessen am bisherigen Wert), für compareGrade
    out.push([name, `${sign}${val}`, better ? 1 : -1, fmt === 'flat' ? abs / Math.max(1, Math.abs(a)) : abs]);
  }
  return out;
}

// Grobe Gesamtbewertung für die Pfeile auf den Kacheln: >0 besser, <0 schlechter.
// Seit 13.20 zählt bei Waffen, die in die Nebenhand passen (zweiter Dolch, zweites Schwert oder Axt), auch der
// Vergleich mit der Nebenhand: ist das Teil dort besser, zeigt die Kachel ▲.
function compareScore(item) {
  const p = game.player;
  const main = compareScoreHand(item);
  if (p && item && offhandPair(p, item)) {
    return Math.max(main, compareScoreHand(item, 'off'));
  }
  return main;
}
// Stärke des Unterschieds für die Pfeile auf den Kacheln (seit 15.06): −4 … +4. Das Vorzeichen kommt aus
// compareScore, die Zahl der Pfeile aus der Summe der Änderungen: 1 kleine Steigerung, 2 gut, 3 sehr gut, 4 gewaltig.
const CMP_GRADES = [0.04, 0.12, 0.3];
const CMP_WORDS = ['', 'etwas', 'deutlich', 'viel', 'gewaltig'];
function compareGrade(item) {
  const p = game.player;
  const score = compareScore(item);
  if (!score) return 0;
  let best = 0;
  for (const hand of p && item && offhandPair(p, item) ? [undefined, 'off'] : [undefined]) {
    const diff = compareItem(item, hand) || [];
    const m = diff.reduce((sum, d) => sum + d[2] * (d[3] || 0), 0);
    if (Math.abs(m) > Math.abs(best) && Math.sign(m) === Math.sign(score)) best = m;
  }
  const a = Math.abs(best);
  const n = a < CMP_GRADES[0] ? 1 : a < CMP_GRADES[1] ? 2 : a < CMP_GRADES[2] ? 3 : 4;
  return score > 0 ? n : -n;
}
function compareArrows(grade) {
  return Array(Math.abs(grade)).fill(grade > 0 ? '▲' : '▼').join('\u2009');
}
// Pfeile auf der Kachel (seit 15.09): übereinander gestapelte Winkel mit dunklem Rand statt eng gesetzter Dreiecke –
// ein bis vier lassen sich auf einen Blick zählen
function compareArrowsSvg(grade) {
  const n = Math.abs(grade);
  const up = grade > 0;
  const col = up ? (n === 4 ? '#c8ff7a' : '#6aff6a') : (n === 4 ? '#ff4a3a' : '#ff6a5a');
  const step = 5;
  const h = 6 + n * step;
  let d = '';
  for (let k = 0; k < n; k++) {
    const y = 2 + k * step;
    d += up ? `M2,${y + 5} L7,${y} L12,${y + 5} ` : `M2,${y} L7,${y + 5} L12,${y} `;
  }
  return `<svg class="tile-cmp-svg" width="14" height="${h}" viewBox="0 0 14 ${h}" aria-hidden="true">` +
    `<path d="${d}" fill="none" stroke="#0a0a0a" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function compareScoreHand(item, hand) {
  const diff = compareItem(item, hand);
  if (!diff || !diff.length) return 0;
  const up = diff.filter((d) => d[2] > 0).length;
  const down = diff.length - up;
  const core = diff.filter(([n]) => n === 'Angriff' || n === 'Verteidigung' || n === 'Leben');
  const coreScore = core.reduce((s, d) => s + d[2], 0);
  return coreScore !== 0 ? coreScore : up - down;
}

function compareHtml(item, title = 'Im Vergleich zu deiner Ausrüstung', hand) {
  const p = game.player;
  if (!item || isBook(item)) return '';
  if (!canCompare(item, p)) return '';
  const diff = compareItem(item, hand);
  const worn = p.equipment[hand === 'off' ? 'schild' : equipSlotOf(item)];
  const later = canWear(item, p) ? '' : ` – anlegbar ab Stufe ${itemLevelReq(item)}`;
  const head = `<small class="cmp-head">${title}${later}${worn && worn !== item ? ` (angelegt: ${itemFullName(worn)})` : worn === item ? '' : ' (Platz ist leer)'}:</small>`;
  // seit 14.32: Itemlevel beider Teile (die Werte darunter bleiben der eigentliche Vergleich)
  const il = ilvlCompareHtml(item, worn);
  if (!diff.length) return `<div class="cmp-box">${head}${il}<span class="cmp same">gleich gut</span></div>`;
  return `<div class="cmp-box">${head}${il}${diff.map(([n, v, b]) => `<span class="cmp ${b > 0 ? 'up' : 'down'}">${b > 0 ? '▲' : '▼'} ${v} ${n}</span>`).join('')}</div>`;
}

// Tränke zurückverkaufen (seit 11.0): die Händler zahlen 40 % des Ladenpreises
function potionSellValue(kind, sz) {
  return Math.max(1, Math.floor(potionInfo(kind).price * sz.price * 0.4));
}
function sellPotions(key, n) {
  const p = game.player;
  const kind = key.slice(0, 2);
  const sz = POTION_SIZES.find((x) => potKey(kind, x.id) === key);
  if (!sz || !nearTrader()) return 0;
  n = Math.min(n, p.potions[key] || 0);
  if (n <= 0) return 0;
  p.potions[key] -= n;
  p.gold += potionSellValue(kind, sz) * n;
  saveGame();
  return n;
}

function sellValue(item) {
  if (isBook(item)) return BOOK_PRICE * item.count;
  const bonuses = (item.bonuses || []).length + (item.specials || []).length * 2;
  return Math.round(12 * Math.pow(item.tier + 1, 2) * (1 + item.plus * 0.6) * (1 + bonuses * 0.25));
}

// --- Boni ---------------------------------------------------------------------------------

// Leben (seit 14.21): eine der festen Stufen; je höher die Gegenstandsstufe, desto öfter die großen Werte
const LIFE_STEP_WEIGHTS = (tier) => [Math.max(1, 6 - tier * 0.55), 3, 1.4 + tier * 0.22, 0.35 + tier * 0.14];
function bonusValue(def, tier) {
  if (def.steps) {
    const w = LIFE_STEP_WEIGHTS(tier || 0);
    let r = Math.random() * w.reduce((a, x) => a + x, 0);
    for (let k = 0; k < def.steps.length; k++) { r -= w[k]; if (r <= 0) return def.steps[k]; }
    return def.steps[def.steps.length - 1];
  }
  const [lo, hi] = def.range;
  const r = lo + Math.random() * (hi - lo);
  if (def.fmt === 'flat') return Math.max(1, Math.min(def.max || Infinity, Math.round(r * (1 + tier * (def.tierScale || 0.35)))));
  const v = Math.min(def.max || Infinity, r * (1 + tier * 0.1));
  if (def.fmt === 'pct1') return Math.round(v * 10000) / 10000;
  return Math.round(v * 1000) / 1000;
}

// Statuswerte, die auf diesem Gegenstand passen: nach seiner Klasse, sonst nach der eigenen Klasse
// Mana nur für Zauberer (seit 14.15): Krieger und Ninja bekommen auf Helm und Umhang Leben statt Mana und würfeln
// keinen Mana-Bonus mehr. Ihr Mana kommt aus der Klasse (perLevel.mp seit 14.15 höher, klassen.js).
const NO_MANA_CLASSES = ['krieger', 'ninja'];
function itemWearerClass(item, classId) {
  return item && item.cls && CLASS_BONUS_ATTRS[item.cls] ? item.cls : classId || (typeof game !== 'undefined' && game.player ? game.player.classId : null);
}
function noManaFor(item, classId) {
  return NO_MANA_CLASSES.includes(itemWearerClass(item, classId));
}
function bonusAttrsFor(item, classId) {
  const cls = item.cls && CLASS_BONUS_ATTRS[item.cls] ? item.cls : classId || (game.player ? game.player.classId : 'krieger');
  return CLASS_BONUS_ATTRS[cls] || ATTR_BONUS_IDS;
}
// Alte Gegenstände (vor 13.49): unpassende Statuswerte werden zum Hauptwert der Klasse (gleicher Wert)
function fitItemAttrs(item, classId) {
  if (!item || !item.bonuses) return;
  const fit = bonusAttrsFor(item, classId);
  const main = fit[0];
  for (const b of item.bonuses) {
    if (!ATTR_BONUS_IDS.includes(b.t) || fit.includes(b.t)) continue;
    const other = item.bonuses.find((x) => x !== b && x.t === main);
    if (other) { other.v += b.v; b.t = null; } else b.t = main;
  }
  item.bonuses = item.bonuses.filter((b) => b.t);
  // seit 14.15: Mana-Bonus bei Krieger und Ninja wird zu Leben (doppelter Wert, wie die Spannen 15–60 und 25–120)
  if (noManaFor(item, classId)) {
    for (const b of item.bonuses) {
      if (b.t !== 'mp') continue;
      const hp = item.bonuses.find((x) => x.t === 'hp');
      const v = Math.round(b.v * 2);
      if (hp) { hp.v = Math.min(BONUS_TYPES.hp.max || Infinity, hp.v + v); b.t = null; } else { b.t = 'hp'; b.v = Math.min(BONUS_TYPES.hp.max || Infinity, v); }
    }
    item.bonuses = item.bonuses.filter((b) => b.t);
  }
  fixLifeBonus(item);
}

// seit 14.21: Leben-Boni auf feste Stufen (200/350/500/1000, kleinere Werte rücken auf 200); auf Waffe und Köcher
// gibt es kein Leben mehr – dort wird der Bonus durch einen anderen passenden ersetzt (die Anzahl bleibt gleich)
function snapLife(v) {
  const steps = BONUS_TYPES.hp.steps;
  return steps.find((s) => s >= v) || steps[steps.length - 1]; // aufrunden: niemand verliert Leben
}
function fixLifeBonus(item) {
  if (!item || !item.bonuses || isBook(item)) return;
  const noLife = !BONUS_TYPES.hp.slots.includes(item.slot);
  for (const b of item.bonuses) {
    if (b.t !== 'hp') continue;
    if (noLife) {
      b.t = null;
      const nb = rollBonus(item, false);
      if (nb && nb.t) { b.t = nb.t; b.v = nb.v; }
    } else if (!BONUS_TYPES.hp.steps.includes(b.v)) b.v = snapLife(b.v);
  }
  item.bonuses = item.bonuses.filter((b) => b.t);
}

// Zufälliger Bonus, der auf diesem Gegenstand noch nicht vorkommt
function rollBonus(item, special) {
  const pool = special ? SPECIAL_BONUS_TYPES : BONUS_TYPES;
  const taken = new Set((special ? item.specials : item.bonuses || []).map((b) => b.t));
  const fit = bonusAttrsFor(item);
  const noMana = !special && noManaFor(item);
  const ids = Object.keys(pool).filter((id) => !taken.has(id) && (special || pool[id].slots.includes(item.slot)) && (special || !ATTR_BONUS_IDS.includes(id) || fit.includes(id)) && !(noMana && id === 'mp'));
  // seit 14.15 gewichtet (BONUS_WEIGHTS): Grundwerte und Hauptwert 3, Gold und Beute 0,7, sonst 1
  const w = ids.map((id) => (special ? 1 : id === fit[0] ? BONUS_WEIGHT_MAIN : BONUS_WEIGHTS[id] || 1));
  let x = Math.random() * w.reduce((a, b) => a + b, 0);
  let k = 0;
  while (k < ids.length - 1 && (x -= w[k]) >= 0) k++;
  const t = ids[k];
  if (!t) return { t, v: 0 };
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
  } else if (matId === 'switch67') {
    if (!item.specials.length) return { error: 'Der Gegenstand hat noch keinen Bonus 6 oder 7. Dafür braucht es zuerst einen Sternenstein.' };
    const n = item.specials.length;
    item.specials = [];
    for (let k = 0; k < n; k++) item.specials.push(rollBonus(item, true));
    text = `Bonus 6${n > 1 ? ' und 7' : ''} neu: ${item.specials.map((b) => bonusText(b, true)).join(' · ')}`;
  }
  p.materials[matId]--;
  afterGearChange();
  return { text };
}

// Summe aller Boni eines Gegenstands
// Seit Version 5.9: zu hohe Prozent-Boni alter Gegenstände auf die neue Höchstgrenze kürzen
function clampItemBonuses(item) {
  if (!item || isBook(item)) return;
  // Statuswerte (Stärke, Geschick …) auf die neue Höchstgrenze ihrer Gegenstandsstufe
  for (const b of item.bonuses || []) {
    const d = BONUS_TYPES[b.t];
    if (d && d.tierScale) b.v = Math.min(b.v, Math.round(d.range[1] * (1 + (item.tier || 0) * d.tierScale)));
  }
  for (const b of item.bonuses || []) { const d = BONUS_TYPES[b.t]; if (d && d.max && b.v > d.max) b.v = d.max; }
  for (const b of item.specials || []) { const d = SPECIAL_BONUS_TYPES[b.t]; if (d && d.max && b.v > d.max) b.v = d.max; }
}

function itemBonusStats(item) {
  const out = {};
  for (const b of item.bonuses || []) out[b.t] = (out[b.t] || 0) + b.v;
  for (const b of item.specials || []) out[b.t] = (out[b.t] || 0) + b.v;
  return out;
}

// Boni-Hinweis (seit 14.20): Hat ein Gegenstand noch freie Boni, sagt ein goldenes Feld, womit sie dazukommen
// (die Knöpfe stehen direkt darunter im Rucksack). short = eine Zeile fürs Infofeld beim Drüberfahren.
function bonusFreeInfo(item) {
  if (!item || isBook(item) || !item.slot) return null;
  const n = (item.bonuses || []).length;
  const sp = (item.specials || []).length;
  if (n < 4) return { mat: 'boniPlus', free: MAX_NORMAL_BONUS - n, text: n ? `Noch ${MAX_NORMAL_BONUS - n} von ${MAX_NORMAL_BONUS} Boni frei` : 'Noch keine Boni' };
  if (n === 4) return { mat: 'boni5', free: 1, text: 'Der 5. Bonus ist noch frei' };
  if (sp < MAX_SPECIAL_BONUS) return { mat: 'star', free: MAX_SPECIAL_BONUS - sp, text: sp ? 'Bonus 7 ist noch frei' : 'Bonus 6 und 7 sind noch frei' };
  return null;
}
function bonusHintHtml(item, p, short) {
  const f = bonusFreeInfo(item);
  if (!f) return '';
  const m = MATERIALS.find((x) => x.id === f.mat);
  if (short) return `<span class="tip-boni">✦ ${f.text} – im Rucksack mit ${m.name} hinzufügen</span>`;
  const have = (p && p.materials && p.materials[f.mat]) || 0;
  const sw = (item.bonuses || []).length && p && p.materials && p.materials.switcher > 0
    ? ` Mit dem Switcher würfelst du die vorhandenen Boni neu.` : '';
  return `<div class="bonus-hint"><b>✦ ${f.text}</b><span>` +
    (have ? `Tippe unten auf <b>${m.tag}</b> (${m.name}, ${have}×), um einen Bonus hinzuzufügen.`
      : `Mit einer <b>${m.name}</b> kommt ein Bonus dazu. ${f.mat === 'boniPlus' ? 'Verstärkungen fallen aus Seelensteinen, man bekommt sie auch im Auktionshaus und per Handel.' : f.mat === 'boni5' ? 'Seltene Verstärkungen fallen selten aus Seelensteinen.' : 'Sternensteine fallen aus Seelensteinen.'}`) +
    sw + `</span></div>`;
}

// Freie Plätze in der Tasche (seit 14.20): p.inventory bleibt eine lückenlose Liste (alles im Spiel rechnet damit),
// jedes Teil merkt sich aber seinen Platz im Raster (item.bagPos, 0 … BAG_SIZE-1). Teile ohne Platz oder mit einem
// schon belegten Platz rücken auf den ersten freien. Ziehen und Ablegen setzt nur bagPos, „Sortieren“ löscht es.
function bagLayout(p) {
  const inv = (p && p.inventory) || [];
  const slots = new Array(BAG_SIZE).fill(-1);
  const rest = [];
  inv.forEach((it, i) => {
    const s = it && Number.isInteger(it.bagPos) ? it.bagPos : -1;
    if (s >= 0 && s < BAG_SIZE && slots[s] < 0) slots[s] = i; else rest.push(i);
  });
  let f = 0;
  for (const i of rest) {
    while (f < BAG_SIZE && slots[f] >= 0) f++;
    if (f >= BAG_SIZE) break;
    slots[f] = i;
    if (inv[i]) inv[i].bagPos = f;
  }
  return slots;
}
// Teile einer Seite (Länge BAG_PAGE, null = frei) und Anzahl belegter Plätze je Seite
function bagPageItems(p, page, layout = bagLayout(p)) {
  return layout.slice(page * BAG_PAGE, (page + 1) * BAG_PAGE).map((i) => (i >= 0 ? p.inventory[i] : null));
}
function bagPageCount(p, page, layout = bagLayout(p)) {
  return layout.slice(page * BAG_PAGE, (page + 1) * BAG_PAGE).filter((i) => i >= 0).length;
}
function bagSlotOf(p, idx, layout = bagLayout(p)) {
  return layout.indexOf(idx);
}

// seit 14.84: Seite III und IV können gesperrt sein (sozial-freischalten.js). Dann sind nur die Plätze von Seite I und
// II frei für Neues; was schon auf III/IV liegt, bleibt dort und lässt sich nur herausnehmen.
const bagOpenSlots = () => (typeof sozialOffeneSeiten === 'function' ? sozialOffeneSeiten() : BAG_PAGES) * BAG_PAGE;
const bagSlotLocked = (s) => s >= bagOpenSlots();
// Freie Plätze für neue Sachen (Beute, Kauf, Post, Handel, Lager …)
function bagFree(p, layout) {
  const open = bagOpenSlots();
  if (open >= BAG_SIZE) return Math.max(0, BAG_SIZE - p.inventory.length);
  const lay = layout || bagLayout(p);
  let n = 0;
  for (let s = 0; s < open; s++) if (lay[s] < 0) n++;
  return n;
}
// Anzeige „belegt/Plätze“ (gesperrt: nur Seite I und II)
const bagCapText = (p) => `${p.inventory.length}/${bagOpenSlots()}`;
// Bücherstapel, auf den n Bücher passen – nur auf nutzbaren Seiten (auf III/IV wird nichts Neues abgelegt)
function bagBookStack(p, id, n) {
  const open = bagOpenSlots();
  const lay = open < BAG_SIZE ? bagLayout(p) : null;
  return p.inventory.find((it, i) => it && it.book === id && it.count + n <= BOOK_STACK && (!lay || lay.indexOf(i) < open)) || null;
}

function addToBag(item) {
  const p = game.player;
  if (bagFree(p) <= 0) return false;
  fixLifeBonus(item); // seit 14.21: auch Teile aus Handel, Post und Auktionshaus
  delete item.bagPos; // seit 14.84: Neues kommt auf den ersten freien Platz (nie auf eine gesperrte Seite)
  p.inventory.push(item);
  return true;
}

// --- Fertigkeitsbücher --------------------------------------------------------------------
// Jedes Buch gehört zu genau einer Fertigkeit, aus allen Klassen und Wegen. Bücher fremder Klassen
// (aus dem Handel) verkauft oder tauscht man. In der Tasche liegen Bücher gestapelt: { book: 'schwertaura', count: 3 }
// Seit 14.1 heißen sie wieder „Fertigkeitsbuch“ (10.4 bis 14.0 „Fertigkeitsschriftrolle“, das Format blieb gleich) und
// tragen eine Fertigkeit nur noch von E1 bis E10. Für H gibt es Schriftrollen, für L und V Seelensteine (SKILL_MATS).
const BOOK_STACK = 99;
const BOOK_PRICE = 2500;
let allSkillsCache = null;
function allSkills() {
  if (!allSkillsCache) {
    allSkillsCache = [];
    for (const [cls, c] of Object.entries(CLASSES)) c.paths.forEach((pt, path) => pt.skills.forEach((sk) => allSkillsCache.push({ sk, cls, path })));
  }
  return allSkillsCache;
}
const skillEntry = (id) => allSkills().find((e) => e.sk.id === id);
const isBook = (item) => !!(item && item.book);

// Tasche sortieren (seit 13.82): Ausrüstung nach Platz (Waffe, Helm, Rüstung …), darin zuerst, was die Figur tragen
// kann, dann Seltenheit, Gegenstandsstufe und Plus absteigend; danach Fertigkeitsbücher (eigene Klasse zuerst), dann
// alles Übrige. Die Reihenfolge innerhalb gleicher Teile bleibt erhalten (stabile Sortierung).
const SORT_SLOT_ORDER = ['waffe', 'schild', 'helm', 'ruestung', 'schultern', 'umhang', 'guertel', 'schuhe', 'koecher'];
function sortInventory(p) {
  if (!p || !Array.isArray(p.inventory) || p.inventory.length < 2) return false;
  const ownSkills = new Set((typeof classSkills === 'function' ? classSkills(p) : []).map((sk) => sk.id));
  const key = (it) => {
    if (!it) return [9, 0, 0, 0, 0, 0];
    if (isBook(it)) return [7, ownSkills.has(it.book) ? 0 : 1, 0, 0, 0, 0];
    const slot = SORT_SLOT_ORDER.indexOf(it.slot);
    if (slot < 0) return [8, 0, 0, 0, 0, 0];
    let wear = 1;
    try { wear = canWear(it, p) ? 0 : 1; } catch (e) { /* alte Teile */ }
    return [0, slot, wear, -rarityOf(it), -(it.tier || 0), -(it.plus || 0)];
  };
  const before = p.inventory.slice();
  const sorted = before.map((it, i) => ({ it, i, k: key(it) })).sort((a, b) => {
    for (let n = 0; n < a.k.length; n++) if (a.k[n] !== b.k[n]) return a.k[n] - b.k[n];
    return a.i - b.i;
  }).map((x) => x.it);
  // seit 14.20: Sortieren räumt auch frei gewählte Plätze wieder lückenlos von vorn ein
  const gaps = sorted.some((it, i) => it && it.bagPos !== i);
  const changed = sorted.some((it, i) => it !== before[i]) || gaps;
  if (changed) p.inventory.splice(0, p.inventory.length, ...sorted);
  p.inventory.forEach((it, i) => { if (it) it.bagPos = i; });
  return changed;
}
const ownBook = (p, id) => classSkills(p).some((sk) => sk.id === id);

function bookCount(p, id) {
  return p.inventory.reduce((n, it) => n + (it.book === id ? it.count : 0), 0);
}
function totalBooks(p, ownOnly) {
  return p.inventory.reduce((n, it) => n + (isBook(it) && (!ownOnly || ownBook(p, it.book)) ? it.count : 0), 0);
}
function takeBooks(p, id, n) {
  for (let k = p.inventory.length - 1; k >= 0 && n > 0; k--) {
    const it = p.inventory[k];
    if (it.book !== id) continue;
    const take = Math.min(n, it.count);
    it.count -= take;
    n -= take;
    if (!it.count) p.inventory.splice(k, 1);
  }
}
// Kennung je Platz in der Tasche (Gegenstände und seit 10.3 auch Bücherstapel; der Handel wählt danach aus)
const newUid = () => Math.random().toString(36).slice(2, 10);
// force: auch bei voller Tasche (nur beim Umwandeln alter Spielstände)
function addBookItem(p, id, n = 1, force = false) {
  const stack = bagBookStack(p, id, n); // seit 14.84: nicht auf gesperrten Seiten
  if (stack) {
    stack.count += n;
    return true;
  }
  if (!force && bagFree(p) <= 0) return false;
  p.inventory.push({ book: id, count: n, uid: newUid() });
  return true;
}

// n Bücher zu zufälligen Fertigkeiten; pool schränkt die Auswahl ein (z. B. eigene Fertigkeiten).
// Ohne pool zieht jedes Buch mit OWN_BOOK_BIAS aus den eigenen Fertigkeiten: Mit dem Magier (8.6) wuchs der
// Pool von 38 auf 58 Bücher; so bleiben eigene Bücher so häufig wie vorher (0,05 + 0,95 · 5/58 ≈ 13 %).
const OWN_BOOK_BIAS = 0.05;
// Seit 10.4 fielen die Bücher (damals Fertigkeitsschriftrollen) erst aus Seelensteinen ab Stufe 40. Seit 14.1 fallen
// sie aus Seelensteinen aller Stufen und ganz selten von Monstern; ab dieser Stufe fallen Schriftrollen (SKILL_MAT_DROP).
const SKILL_SCROLL_STONE = SKILL_MAT_DROP.rolle.stone;
const ownClassSkillIds = (p) => [...new Set(CLASSES[p.classId].paths.flatMap((pt) => pt.skills.map((sk) => sk.id)))];
function addBooks(n, from, pool) {
  const p = game.player;
  const ids = pool || [...new Set(allSkills().map((e) => e.sk.id))];
  const got = [];
  for (let k = 0; k < n; k++) {
    const mine = !pool && Math.random() < OWN_BOOK_BIAS ? classSkills(p).map((sk) => sk.id) : null;
    const id = mine ? mine[Math.floor(Math.random() * mine.length)] : ids[Math.floor(Math.random() * ids.length)];
    const sk = skillEntry(id).sk;
    if (!addBookItem(p, id, 1)) {
      ui.log(`Deine Tasche ist voll: Fertigkeitsbuch „${sk.name}“ bleibt liegen.`, 'warn');
      continue;
    }
    got.push(sk.name);
    const own = ownBook(p, id);
    ui.loot('Fertigkeitsbuch: ' + sk.name, 1, bookIconUrl(id), own ? '#ffd34d' : '#c58cff');
    if (own) ui.log(`Ein Fertigkeitsbuch für deine Fertigkeit ${sk.name}!`, 'level');
    if (from && !ui.dropAt) later(0.2 + k * 0.12, () => vfxLootFly(from, bookSprite(id).img));
  }
  if (got.length) ui.buildSkillBar();
  return got;
}

// Ätherkern (seit 14.16): seltenes Schmiede-Teil, Raten in FORGE_CORE (daten/gegenstaende.js)
function forgeCoreDrop(m) {
  const c = FORGE_CORE;
  let n = 0;
  if (m.isStone) { if (m.level >= c.stoneLevel && Math.random() < c.stone + (m.level - c.stoneLevel) * c.stoneStep) n = 1; }
  else if (m.type && m.type.inst) { if (Math.random() < c.inst) n = randInt(1, 2); }
  else if (m.type && m.type.raid) n = randInt(c.raid[0], c.raid[1]);
  else if (m.type && m.type.boss && m.level >= 35) { if (Math.random() < c.boss) n = 1; }
  if (!n) return;
  const p = game.player;
  p.materials.aetherkern = (p.materials.aetherkern || 0) + n;
  ui.loot('Ätherkern', n, materialIconUrl('aetherkern'), MATERIAL_COLORS.aetherkern);
  if (!ui.dropAt) later(0.3, () => vfxLootFly(m, materialIconCanvas('aetherkern')));
}

// Schriftrolle oder Seelenstein (Gegenstand) aufheben (seit 14.1): Zähler in p.materials, wie die Verstärkungen
function addSkillMat(id, n, from) {
  const p = game.player;
  p.materials[id] = (p.materials[id] || 0) + n;
  const m = matDef(id);
  ui.loot(id === 'seelenstein' ? 'Seelenstein (Gegenstand)' : m.name, n, materialIconUrl(id), MATERIAL_COLORS[id]);
  ui.log(id === 'seelenstein' ? 'Ein Seelenstein als Gegenstand! Er hebt eine Fertigkeit in L oder V um eine Stufe.' : 'Eine Schriftrolle! Sie hebt eine Fertigkeit in H um eine Stufe.', 'level');
  if (from && !ui.dropAt) later(0.25, () => vfxLootFly(from, materialIconCanvas(id)));
  ui.buildSkillBar();
}

// Fertigkeitsbuch (seit 14.1 wieder ein Buch; 10.4 bis 14.0 eine Hängerolle): gebundenes Buch mit Einband in der
// Farbe der Klasse, dunklem Rücken mit Goldbändern, Seitenschnitt rechts und unten, goldenen Eckbeschlägen, einem
// Lesebändchen und dem Symbol der Fertigkeit in einem goldenen Medaillon auf dem Deckel.
const BOOK_COVERS = { krieger: ['#8a2a1a', '#c8502a'], ninja: ['#3a2a5a', '#6a4a9a'], schamane: ['#145a5a', '#2a8a8a'], nekromant: ['#2a4a1a', '#4a7a2a'], magier: ['#1e2458', '#4a5ab8'] };
function drawSkillBook(ctx, dark, light, icon) {
  // Rückdeckel und Seitenblock (rechts und unten sichtbar)
  box(ctx, -11, -14, 24, 30, 2.2, dark);
  box(ctx, -11, -15.5, 23, 29.5, 1.2, '#f1e6c4');
  for (const x of [10.2, 11.2]) stroke(ctx, '#c9b583', 0.5, [[x, -13.5], [x, 12.5]]);
  for (const y of [12.6, 13.4]) stroke(ctx, '#c9b583', 0.5, [[-8, y], [10.5, y]]);
  // Lesebändchen
  poly(ctx, [[4.5, 12], [7.5, 12], [7.5, 19], [6, 17.4], [4.5, 19]], '#c8302a');
  // Vorderdeckel mit Rücken
  box(ctx, -13.5, -17, 23, 29, 2.2, light);
  box(ctx, -13.5, -17, 5.2, 29, 2, dark);
  for (const y of [-13, -9.5, 4.5, 8]) stroke(ctx, '#e8b83a', 1.1, [[-13.2, y], [-8.6, y]]);
  // Zierrahmen und Eckbeschläge
  ctx.strokeStyle = 'rgba(255, 220, 140, 0.55)';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(-6.6, -14.4, 14, 23.8);
  poly(ctx, [[9.5, -17], [9.5, -12.5], [5, -17]], '#e8b83a');
  poly(ctx, [[9.5, 12], [9.5, 7.5], [5, 12]], '#e8b83a');
  // Medaillon mit dem Symbol der Fertigkeit
  oval(ctx, 0.4, -2.5, 7.6, 7.6, '#e8b83a');
  oval(ctx, 0.4, -2.5, 6.6, 6.6, dark);
  if (icon) {
    ctx.save();
    ctx.translate(0.4, -2.5);
    ctx.beginPath();
    ctx.arc(0, 0, 6.4, 0, Math.PI * 2);
    ctx.clip();
    ctx.scale(0.27, 0.27);
    icon(ctx);
    ctx.restore();
  }
}
// Die Hängerolle bis 14.0 (wird nicht mehr gezeichnet, bleibt für Werkzeuge erhalten)
function drawSkillScroll(ctx, dark, light, icon) {
  // Pergament mit Rand in Klassenfarbe
  box(ctx, -9.5, -12, 19, 24, 1, light);
  box(ctx, -7.5, -11, 15, 22, 0.8, '#f1e6c4');
  stroke(ctx, '#d8c79a', 0.6, [[-6, 8.5], [6, 8.5]]);
  stroke(ctx, '#d8c79a', 0.6, [[-6, -8.5], [6, -8.5]]);
  // Holzstäbe oben und unten mit Knäufen
  for (const y of [-13.5, 13.5]) {
    box(ctx, -12, y - 1.8, 24, 3.6, 1.6, '#4a2e1a');
    stroke(ctx, '#7a5236', 0.7, [[-10.5, y - 0.8], [10.5, y - 0.8]]);
    oval(ctx, -12.5, y, 2.2, 2.4, '#e8b83a');
    oval(ctx, 12.5, y, 2.2, 2.4, '#e8b83a');
  }
  // Aufhängeschnur und Quaste
  stroke(ctx, dark, 0.9, [[-5, -15.2], [0, -18.5], [5, -15.2]]);
  stroke(ctx, dark, 1.2, [[9, 15.3], [10, 18.5]]);
  poly(ctx, [[8.6, 17.5], [11.4, 17.5], [12, 20], [8, 20]], light);
  // Siegel mit dem Symbol der Fertigkeit
  oval(ctx, 0, 0, 7.6, 7.6, '#e8b83a');
  oval(ctx, 0, 0, 6.6, 6.6, dark);
  if (icon) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 6.4, 0, Math.PI * 2);
    ctx.clip();
    ctx.scale(0.27, 0.27);
    icon(ctx);
    ctx.restore();
  }
}
function bookSprite(id) {
  return getSprite('book:' + id, { x: -20, y: -20, w: 40, h: 40 }, (ctx) => {
    const e = skillEntry(id);
    const [dark, light] = BOOK_COVERS[e.cls] || BOOK_COVERS.krieger;
    // gleiches Bild wie in der Fertigkeitsleiste (seit 9.6), seit 14.1 als Buch
    drawSkillBook(ctx, dark, light, (c) => drawSkillIcon(c, e.sk));
  }, undefined, true);
}
function bookIconUrl(id) {
  const key = 'bookicon2:' + id;
  // seit 14.60 in ICON_HI gebacken: das Buch mit Medaillon bleibt am Handy scharf
  if (!iconCache.has(key)) {
    const e = skillEntry(id);
    const [dark, light] = BOOK_COVERS[e.cls] || BOOK_COVERS.krieger;
    iconCache.set(key, bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => drawSkillBook(ctx, dark, light, (c) => drawSkillIcon(c, e.sk)), ICON_HI, true).img.toDataURL());
  }
  return iconCache.get(key);
}

function addMobMat(id, n, from) {
  const p = game.player;
  p.upmats[id] = (p.upmats[id] || 0) + n;
  const mat = MOB_MATS[id];
  ui.loot(mat.name, n, mobMatIconUrl(id), mat.color);
  if (from && !ui.dropAt) later(0.15, () => vfxLootFly(from, mobMatSprite(id).img));
}

// Seelensplitter geben und in der Beuteanzeige zeigen (seit 14.6 Ersatz für Boni-Materialien bei Bossen)
function giveSplinters(n) {
  if (!(n > 0)) return;
  game.player.splinters += n;
  ui.loot('Seelensplitter', n, lootIconUrl('splinter'), '#c9a8ff');
}

// Beute: normale Monster selten, Seelensteine oft
// Mehr Beute (Bonus, seit 14.15: dropChance/dropCount in kampf.js) wirkt auf Ausrüstung, Tränke und Monsterteile –
// nicht auf Seelensplitter, Segensschriftrollen, Fertigkeitsbücher, Schriftrollen, Seelensteine (Gegenstand),
// Verstärkungen, Switcher und Sternensteine: die bleiben bewusst selten
function rollLoot(m) {
  const p = game.player;
  // Monster aus einem Seelenstein bringen etwas von dessen Beute mit
  const sd = m.stone ? stoneDrops(m.stone.stoneType) : null;
  if (!m.isStone && Math.random() < (sd ? 0.1 : 0.03)) {
    p.splinters++;
    ui.loot('Seelensplitter', 1, lootIconUrl('splinter'), '#c9a8ff');
  }
  const drops = m.isStone ? stoneDrops(m.stoneType) : null;
  if (drops && m.level >= BLESSING.stone && Math.random() < drops.scroll) {
    p.scrolls++;
    ui.loot(BLESSING.name, 1, scrollIconUrl(), '#f3e2b0');
  }
  // Boni-Materialien nur vom Seelenstein selbst (seit 14.6 nicht mehr von den Monstern, die er ruft)
  if (drops) {
    const got = [];
    for (const [id, [chance, min, max]] of Object.entries(drops.mats)) {
      if (Math.random() >= chance) continue;
      const n = randInt(min, max);
      p.materials[id] = (p.materials[id] || 0) + n;
      const mat = MATERIALS.find((x) => x.id === id);
      got.push(id);
      ui.loot(mat.name, n, materialIconUrl(id), MATERIAL_COLORS[id]);
      if (!ui.dropAt) for (let k = 0; k < n; k++) later(0.1 + got.length * 0.12 + k * 0.08, () => vfxLootFly(m, materialIconCanvas(id)));
    }
  }
  // Monster-Teile für den Schmied: jedes Monster lässt selten sein eigenes Teil fallen,
  // Seelensteine einige Teile der Monster ihres Gebiets
  if (!m.isStone && MOB_MATS[m.typeId] && Math.random() < dropChance(sideCollecting(m.typeId) ? SIDE_DROP : MOB_MAT_CHANCE)) addMobMat(m.typeId, 1, m);
  // Gegenstände für die Fertigkeiten (seit 14.1, Raten in SKILL_MAT_DROP, daten/gegenstaende.js):
  // Fertigkeitsbücher aus jedem Seelenstein (18 %) und ganz selten von Monstern ab Stufe 20 (0,3 %), immer zur
  // eigenen Klasse; Schriftrollen nur aus Seelensteinen ab Stufe 40 (40: 22 %, 80: 42 %);
  // Seelensteine (Gegenstand) nur aus Seelensteinen ab Stufe 45 (seit 14.9: 45: 3,5 %, 60: 5 %, 80: 7 %).
  const bd = SKILL_MAT_DROP.book;
  if (m.isStone ? Math.random() < bd.stone : m.level >= bd.mobLevel && Math.random() < bd.mob) addBooks(1, m, ownClassSkillIds(p));
  if (m.isStone && Math.random() < skillMatChance('rolle', m.level)) addSkillMat('rolle', 1, m);
  if (m.isStone && Math.random() < skillMatChance('seelenstein', m.level)) addSkillMat('seelenstein', 1, m);
  if (m.isStone) {
    // Dungeon-Steine geben die Teile, die auch ihr Boss fallen lässt
    const all = m.zone.dungeon ? [MONSTER_TYPES[m.zone.dungeon.boss].boss.mat] : m.zone.groups.map((g) => g[0]).filter((id) => MOB_MATS[id]);
    const pool = all.filter((id) => MONSTER_TYPES[id].level <= m.level + 2);
    for (let k = dropCount(randInt(1, 3)); k > 0; k--) addMobMat(pool[randInt(0, pool.length - 1)] || all[0], 1, m);
  }
  // seit 14.10 seltener: Monster 1,2 % (vorher 2,5 %), Monster aus Steinen 6 % ihres Steins (vorher 12 %);
  // die Chancen der Steine selbst stehen in stoneDrops (monster.js)
  if (Math.random() < dropChance(drops ? drops.gear : sd ? sd.gear * 0.06 : 0.012)) {
    // Seelensteine ab Stufe 20 lassen schon Ausrüstung der nächsthöheren Gebiete fallen (Lv 30 ab Stein 20)
    const lootLevel = m.isStone && m.level >= 20 ? m.level + 10 : m.level;
    let tier = 0;
    ITEM_TIERS.forEach((t, i) => { if (lootLevel >= t.level) tier = i; });
    const plus = drops ? randInt(drops.plus[0], drops.plus[1]) : Math.random() < 0.25 ? 1 : 0;
    // meist für die eigene Klasse, manchmal für eine andere (zum Verkaufen)
    const cls = Math.random() < 0.7 ? p.classId : CLASS_ORDER[randInt(0, CLASS_ORDER.length - 1)];
    const slotList = (drops || sd || {}).slots;
    const slots = lootSlots(slotList || EQUIP_SLOTS.map((sl) => sl.id), cls);
    const item = makeItem(slots[randInt(0, slots.length - 1)], tier, plus, cls, lootKind(p, cls));
    rarityRoll(item, raritySourceOf(m), m); // Seltenheit (seit 13.56)
    if (addToBag(item)) {
      ui.loot(itemFullName(item), 1, itemIconUrl(item), itemColor(item));
      announceRarity(item);
      later(0.2, () => vfxLootFly(m, itemIconCanvas(item)));
      const c = bodyCenter(m);
      particles(c.x, c.y, { count: 14, color: [itemColor(item), '#ffffff'], angle: -Math.PI / 2, spread: 0.8, speed: [60, 150], life: [0.5, 0.9], size: [2, 3.5] });
    } else {
      ui.log('Dein Inventar ist voll. ' + itemFullName(item) + ' ist verloren.', 'warn');
    }
  }
}

// Schilde fallen nur für Krieger
// Endboss-Beute (seit 6.5): drei Endboss-Teile (item.legend) für die eigene Klasse (eine Waffe, zwei andere Teile)
// mit gleich vier Boni; dazu viele Verstärkungen, Schmiede-Teile und sehr viel Gold.
// Seit 13.56 sind sie episch (lila), unter Lv 60 so selten, wie ihre Stufe erlaubt (blau) – RARITY_DROPS.raid.
// Seit 11.0 auf +0 (vorher +7 bis +9): Hochschmieden muss man selbst, ab +4 mit Teilen aus der Map des Endbosses
// (item.raidMat, siehe upgradeMaterial); der Boss lässt davon gleich ein paar fallen.
function raidLoot(m) {
  const p = game.player;
  const b = m.type.boss;
  let tier = 0;
  ITEM_TIERS.forEach((t, i) => { if (m.level + 4 >= t.level) tier = i; });
  const others = lootSlots(EQUIP_SLOTS.map((sl) => sl.id).filter((s) => s !== 'waffe'), p.classId);
  const slots = ['waffe', others[randInt(0, others.length - 1)], others[randInt(0, others.length - 1)]];
  for (const slot of slots) {
    const item = makeItem(slot, tier, 0, p.classId, lootKind(p, p.classId));
    item.legend = true;
    if (b.mat) item.raidMat = b.mat;
    rarityRoll(item, 'raid', m);
    setTagItem(item, m); // seit 14.55: nur in einer Instanz mit Set (Abaddor im Höllenthron), Endbosse der Maps nie
    if (addToBag(item)) {
      ui.loot(itemFullName(item), 1, itemIconUrl(item), itemColor(item));
      announceRarity(item);
    } else ui.log('Dein Inventar ist voll. ' + itemFullName(item) + ' ist verloren.', 'warn');
  }
  if (b.mat) addMobMat(b.mat, dropCount(randInt(8, 12)), m);
  // seit 14.6 keine Boni-Materialien mehr (die gibt es nur aus Seelensteinen), dafür Seelensplitter
  giveSplinters(randInt(15, 25));
  const gold = monsterGold(m.level * 1500);
  p.gold += gold;
  ui.loot('Gold', gold, lootIconUrl('gold'), '#ffd96a');
  ui.banner('Endboss besiegt!', m.name);
  flashScreen('#ffd34d', 0.5);
  // Abaddor (Höllenthron) gibt noch mehr dazu
  if (m.type.teufel && typeof htLoot === 'function') htLoot(m);
}

function lootSlots(slots, cls) {
  // Statt eines Schildes fällt für Ninjas mit Bogen ein Köcher (seit 13.20)
  const quiver = cls === 'ninja' && quiverMode(game.player);
  const out = cls === 'krieger' ? slots : slots.flatMap((s) => (s !== 'schild' ? [s] : quiver ? ['koecher'] : []));
  return out.length ? out : ['ruestung'];
}

// Waffenart der Beute: für die eigene Klasse meist eine, die der eigene Weg führen kann
function lootKind(p, cls) {
  const kinds = CLASS_WEAPON_KINDS[cls];
  const own = cls === p.classId && Math.random() < 0.8 ? kinds.filter((k) => WEAPON_KINDS[k]?.path == null || WEAPON_KINDS[k].path === (p.path || 0)) : kinds;
  return own[randInt(0, own.length - 1)];
}

// Bosse: zwei Teile Ausrüstung über der eigenen Stufe (+3 bis +6), Bücher, Schmiede-Teile,
// Materialien, eine Segensschriftrolle und viel Gold
function bossLoot(m) {
  const p = game.player;
  const b = m.type.boss;
  let tier = 0;
  ITEM_TIERS.forEach((t, i) => { if (m.level + 8 >= t.level) tier = i; });
  for (let k = 0; k < 2; k++) {
    const cls = Math.random() < 0.85 ? p.classId : CLASS_ORDER[randInt(0, CLASS_ORDER.length - 1)];
    const slots = lootSlots(EQUIP_SLOTS.map((sl) => sl.id), cls);
    // seit 14.16 +1 bis +4 statt +3 bis +6, +4 selten (8 %)
    const r = Math.random();
    const item = makeItem(slots[randInt(0, slots.length - 1)], tier, r < 0.08 ? 4 : r < 0.3 ? 3 : r < 0.65 ? 2 : 1, cls, lootKind(p, cls));
    // grün oder blau; Dungeon-Bosse ab Stufe 50 mit kleiner Chance episch (seit 13.56)
    rarityRoll(item, 'boss', m);
    if (addToBag(item)) {
      ui.loot(itemFullName(item), 1, itemIconUrl(item), itemColor(item));
      announceRarity(item);
      later(0.2 + k * 0.25, () => vfxLootFly(m, itemIconCanvas(item)));
    } else {
      ui.log('Dein Inventar ist voll. ' + itemFullName(item) + ' ist verloren.', 'warn');
    }
  }
  if (b.mat) addMobMat(b.mat, dropCount(randInt(3, 5)), m);
  // seit 14.6 keine Boni-Materialien mehr (nur aus Seelensteinen), dafür Seelensplitter
  giveSplinters(randInt(4, 7));
  const gold = monsterGold(m.level * 300);
  p.gold += gold;
  ui.loot('Gold', gold, lootIconUrl('gold'), '#ffd96a');
  ui.banner(`${m.name} besiegt!`, 'Die Beute gehört dir');
  ui.log(`${m.name} ist gefallen. In 10 Minuten kehrt er zurück.`, 'level');
  // seit 14.82: Bosse mit eigenem 3D-Modell (bosse3d.js) zeigen ihren Tod selbst – ohne Ring und Bildschirmblitz
  const own3 = V3.on && typeof isBoss3 === 'function' && isBoss3(m.typeId);
  if (!own3) addEffect({ type: 'ring', x: m.x, y: feetY(m), r: 160, dur: 0.9, color: b.color, width: 14, grow: true });
  particles(m.x, feetY(m) - 30, { count: 60, color: [b.color, '#ffffff', '#ffd34d'], speed: [80, 300], life: [0.5, 1.1], size: [2, 5], drag: 2 });
  if (!own3) flashScreen(b.color, 0.35);
  shakeScreen(10);
}

// hand 'off': eine zweite Waffe in die Nebenhand (Beidhändigkeit, Titanengriff, Dolch des Ninjas);
// 'main': ausdrücklich in die Haupthand; ohne Angabe wandert eine zweite passende Waffe von selbst in die leere Nebenhand
function equipFromBag(index, hand) {
  const p = game.player;
  const item = p.inventory[index];
  if (!item || isBook(item)) return false;
  const need = ITEM_TIERS[item.tier].level;
  const problem = wearProblem(item, p);
  if (problem) {
    gear.message(`${itemName(item)}: ${problem}`, 'warn');
    return false;
  }
  if (p.level < need) {
    gear.message(`${itemName(item)} kannst du ab Stufe ${need} tragen.`, 'warn');
    return false;
  }
  if (isQuiver(item) && !quiverMode(p)) {
    gear.message(`${itemName(item)}: Einen Köcher trägst du zusammen mit einem Bogen.`, 'warn');
    return false;
  }
  // Ninja: ein zweiter Dolch wandert von selbst in die Nebenhand, wenn die Haupthand schon einen hat (seit 13.10);
  // seit 13.85 genauso Schwert oder Axt beim Krieger mit Beidhändigkeit (der Titanengriff bleibt beim Knopf „Nebenhand“)
  let off = hand === 'off';
  if (hand == null && !p.equipment.schild && !canTitanGrip(p) && offhandPair(p, item)) off = true;
  if (off && !offhandAllows(p, item)) {
    gear.message(offhandProblem(p, item), 'warn');
    return false;
  }
  // Schild oder Zweihandwaffe: beides zusammen geht nicht
  const weapon = p.equipment.waffe;
  if ((item.slot === 'schild' || (off && !canTitanGrip(p))) && weapon && WEAPON_KINDS[weapon.kind]?.twoHanded && !isQuiver(item)) {
    gear.message(`Mit ${itemName(weapon)} hast du keine Hand frei. Lege zuerst eine einhändige Waffe an.`, 'warn');
    return false;
  }
  const slot = off ? 'schild' : equipSlotOf(item);
  const old = p.equipment[slot];
  p.inventory.splice(index, 1);
  // das abgelegte Teil übernimmt den Platz in der Tasche (seit 14.20)
  // seit 14.84: liegt das neue Teil auf einer gesperrten Seite (III/IV), rückt das alte lieber auf einen freien Platz
  // von Seite I/II (ist dort keiner frei, bleibt es beim Tausch auf demselben Platz)
  if (old) { if (Number.isInteger(item.bagPos) && !bagSlotLocked(item.bagPos)) old.bagPos = item.bagPos; else delete old.bagPos; p.inventory.splice(index, 0, old); }
  delete item.bagPos;
  p.equipment[slot] = item;
  const bow = item.slot === 'waffe' && !off && item.kind === 'bow';
  if (item.slot === 'waffe' && !off && p.equipment.schild && (bow ? !isQuiver(p.equipment.schild) : WEAPON_KINDS[item.kind]?.twoHanded || isQuiver(p.equipment.schild))) {
    const shield = p.equipment.schild;
    if (addToBag(shield)) {
      p.equipment.schild = null;
      gear.message(isQuiver(shield) ? `Ohne Bogen brauchst du keinen Köcher. ${itemName(shield)} liegt jetzt in der Tasche.`
        : `${itemName(item)} braucht beide Hände. ${itemName(shield)} liegt jetzt in der Tasche.`, 'info');
    }
  }
  // Bogen angelegt (seit 13.20): den besten Köcher aus der Tasche gleich dazu; beim ersten Bogen gibt es einen geschenkt
  if (bow && !p.equipment.schild) {
    const qi = bestQuiverIndex(p);
    if (qi >= 0) {
      p.equipment.schild = p.inventory.splice(qi, 1)[0];
      gear.message(`${itemName(p.equipment.schild)} angelegt – Munition für deinen Bogen.`, 'info');
    } else if (!p.quiverGiven) {
      p.quiverGiven = true;
      p.equipment.schild = makeItem('koecher', 0, 0, 'ninja');
      gear.message('Zum Bogen gehört ein Köcher: Du bekommst einen Lederköcher. Bessere Köcher verkauft der Waffenhändler.', 'success');
    }
  }
  // Beidhändigkeit auf dem falschen Weg (seit 13.85): sagen, warum die neue Waffe die alte ersetzt hat
  if (!off && hand == null && old && dualWieldIdle(p) && !p.equipment.schild && DUAL_WIELD.kinds.includes(item.kind) && DUAL_WIELD.kinds.includes(old.kind)) {
    gear.message(offhandProblem(p, item), 'info');
  }
  afterGearChange();
  gear.selected = { where: 'equip', key: slot };
  return true;
}

function unequip(slot) {
  const p = game.player;
  const item = p.equipment[slot];
  if (!item) return;
  delete item.bagPos; // seit 14.20: kommt auf den ersten freien Platz (dropItem setzt ihn beim Ziehen gezielt)
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
  if (!item || !nearTrader()) return;
  const value = sellValue(item);
  p.inventory.splice(index, 1);
  p.gold += value;
  gear.message(`${isBook(item) ? 'Fertigkeitsbuch: ' + skillEntry(item.book).sk.name : itemFullName(item)} für ${value.toLocaleString('de-DE')} Gold verkauft.`, 'info');
  gear.selected = null;
  saveGame();
}

function afterGearChange() {
  const p = game.player;
  game.stats = playerStats(p);
  p.hp = Math.min(p.hp, game.stats.maxHp);
  p.mp = Math.min(p.mp, game.stats.maxMp);
  // das Bild oben links zeigt die angelegte Ausrüstung (Helm, Rüstung)
  const portrait = document.getElementById('hudPortrait');
  if (portrait && game.running) drawPortrait(portrait, p);
  saveGame();
}

// Verkaufen geht nur in der Nähe eines Händlers (auch Schmied und Alchemist kaufen an)
const TRADERS = ['haendler', 'waffen', 'ruestung', 'alchemist', 'schmied'];
function nearTrader() {
  const p = game.player;
  if (!p || !game.world) return null;
  return game.world.npcs.find((n) => TRADERS.includes(n.id) && dist(n, p) < 130) || null;
}

function itemAt(ref) {
  if (!ref) return null;
  const p = game.player;
  if (ref.where === 'sup') return null;
  return ref.where === 'equip' ? p.equipment[ref.key] : p.inventory[ref.key];
}

// --- Schmied --------------------------------------------------------------------------

// Text für den Hinweis an einem Monster-Teil: von welchem Monster und auf welcher Map
// Zahl der verschiedenen Aufwertungsteile im Gepäck (Verstärkungen und Monsterteile)
function matKinds(p) {
  return MATERIALS.filter((m) => (p.materials[m.id] || 0) > 0).length + Object.entries(p.upmats || {}).filter(([id, n]) => n > 0 && MOB_MATS[id]).length;
}
function mobMatTip(id) {
  const t = MONSTER_TYPES[id];
  return `${MOB_MATS[id].name}: fällt von ${t.name} (Stufe ${t.level}). Fundort: ${monsterWhere(id)}`.replace(/"/g, '&quot;');
}

function upgradeCost(item) {
  const step = UPGRADE_STEPS[item.plus];
  return { gold: step.gold * (item.tier + 1), splinters: step.splinters, mat: upgradeMaterial(item), core: upgradeCore(item) };
}

function canPayUpgrade(cost) {
  const p = game.player;
  return p.gold >= cost.gold && p.splinters >= cost.splinters && (!cost.mat || (p.upmats[cost.mat.id] || 0) >= cost.mat.count) &&
    (!cost.core || (p.materials[cost.core.id] || 0) >= cost.core.count);
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
  if (cost.core) p.materials[cost.core.id] -= cost.core.count;
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
// Farben je Stufe: Leder, Bronze, Eisen, Drache, Seele, Asche, Himmel, Götter, seit 13.53 Abgrund und Ewigkeit
// (Motive: voidEye2D und star2D in figuren.js)

const ARMOR_COLORS = ['#7a5a3c', '#8a6a3a', '#5a6a7a', '#9a2f2a', '#4a2f6a', '#4a2a22', '#2a4a7a', '#c8a03a', '#221a3a', '#ece6f0'];
const iconCache = new Map();

// Schild, auch für die Figur im Spiel (Mitte bei 0,0, etwa 22 Einheiten hoch)
// it (seit 14.59): Gegenstand für die Farbvariante (gearCol, figuren.js); ohne ihn die Stufenfarben
function shieldArt(ctx, tier, it = null) {
  const c = gearCol(it, ARMOR_COLORS[tier]);
  const metal = gearCol(it, TIER_METAL[tier], true);
  if (tier === 0) {
    oval(ctx, 0, 0, 9.5, 10.5, gearCol(it, '#8a6a44'));
    stroke(ctx, '#5a4030', 0.9, [[-4, -9.5], [-4, 9.5]]);
    stroke(ctx, '#5a4030', 0.9, [[4, -9.5], [4, 9.5]]);
    oval(ctx, 0, 0, 2.6, 2.6, metal);
    return;
  }
  // Ewigkeit (seit 13.53): Sternstrahlen ragen hinter dem Schild hervor
  if (tier === 9) star2D(ctx, 0, -0.5, 14, '#efeaf6', '#e2957c', null);
  poly(ctx, [[-9, -10], [9, -10], [9, 1], [0, 11], [-9, 1]], metal);
  poly(ctx, [[-6.5, -7.5], [6.5, -7.5], [6.5, 0], [0, 7.8], [-6.5, 0]], c);
  if (tier === 8) {
    // Abgrund: Leerenauge in der Mitte, cyanfarbene Risse zu den Ecken
    for (const [x, y] of [[-5.5, -6.5], [5.5, -6.5], [0, 7]]) stroke(ctx, '#5ee8ff', 0.7, [[x * 0.35, y * 0.3 - 0.5], [x, y]]);
    voidEye2D(ctx, 0, -0.5, 1.15);
  } else if (tier === 9) star2D(ctx, 0, -0.5, 6.2);
  else if (tier >= 3) poly(ctx, [[0, -5], [3.5, 0], [0, 5], [-3.5, 0]], tier >= 4 ? '#d6a8ff' : '#e8c46a');
  else oval(ctx, 0, -1, 2.4, 2.4, metal);
}

// Schulterpanzer-Symbol (seit 13.16): ein einzelner, großer Schulterpanzer schräg von vorn – gewölbte Hauptplatte mit
// Grat und Nietenrand, darunter drei Schienen, die zum Oberarm hin schmaler werden und nach außen fächern. Stufen: ab Drache Dornen auf dem Grat, ab Seele ein Juwel, ab Himmel Federn, Götter mit Goldranke.
function shoulderIcon(ctx, tier, pc, metal) {
  const glow = tier === 5 ? '#ff7a2a' : tier === 8 ? '#5ee8ff' : tier === 9 ? '#ffb8e0' : tier >= 6 ? '#9fe8ff' : '#d6a8ff';
  const edge = lighter(metal, 0.25);
  const dark = darker(pc, 0.5);
  const path = (pts) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i += 2) ctx.quadraticCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    ctx.closePath();
  };
  ctx.save();
  // Schatten am Boden
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(1, 16.5, 15, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // ganzer Panzer leicht nach außen (rechts) abfallend, wie er auf der Schulter liegt
  ctx.translate(0, 1);
  ctx.rotate(0.12);
  // Federn hinter dem Panzer (Himmel, Götter); seit 13.53 Leerensplitter (Abgrund) bzw. Sternstrahlen (Ewigkeit)
  if (tier === 8) {
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.translate(-6 + k * 4.5, -9);
      ctx.rotate(-0.5 + k * 0.32);
      poly(ctx, [[-1.6, 2], [0, -9 - (k % 2) * 4], [1.6, 2]], k % 2 ? '#2a2048' : '#3a2e66');
      stroke(ctx, '#5ee8ff', 0.6, [[0, 0], [0, -6 - (k % 2) * 3]]);
      ctx.restore();
    }
  }
  if (tier === 9) star2D(ctx, -3, -7, 15, '#efeaf6', '#e2957c', null);
  if (tier === 6 || tier === 7) {
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.translate(-9, -6);
      ctx.rotate(-1.35 + k * 0.3);
      path([[0, 0], [3, -8], [0.5, -16 + k], [-2.5, -8], [0, 0]]);
      ctx.fillStyle = k % 2 ? '#e8f6ff' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#9ab8d0';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }
  }
  // drei Schienen über dem Oberarm: jede schmaler, tiefer und weiter außen, wie ein Fächer zum Arm hin
  for (let k = 2; k >= 0; k--) {
    ctx.save();
    ctx.translate(5 + k * 2.4, 3 + k * 3.6);
    ctx.rotate(0.18 + k * 0.12);
    const hw = 11 - k * 2.4;
    path([[-hw, -1.4], [0, 1.2], [hw, -1.4], [hw + 0.6, 0.8], [hw - 0.2, 2.6], [0, 5], [-hw + 0.2, 2.6], [-hw - 0.6, 0.8], [-hw, -1.4]]);
    const g = ctx.createLinearGradient(0, -1.5, 0, 5);
    g.addColorStop(0, lighter(pc, 0.32));
    g.addColorStop(0.45, pc);
    g.addColorStop(1, darker(pc, 0.38));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-hw + 0.3, 2.6);
    ctx.quadraticCurveTo(0, 4.9, hw - 0.3, 2.6);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1;
    ctx.stroke();
    oval(ctx, -hw + 1.6, 0.8, 0.85, 0.85, edge);
    oval(ctx, hw - 1.6, 0.8, 0.85, 0.85, edge);
    ctx.restore();
  }
  // breite, flach gewölbte Hauptplatte (breiter als hoch)
  const cap = () => path([[-15, 1], [-16, -8], [-6, -13.5], [5, -14], [12.5, -8], [17, -2], [16, 4], [1, 7.5], [-15, 1]]);
  cap();
  const gm = ctx.createRadialGradient(-4, -7, 1, 1, -1, 19);
  gm.addColorStop(0, lighter(pc, 0.55));
  gm.addColorStop(0.35, lighter(pc, 0.12));
  gm.addColorStop(0.75, pc);
  gm.addColorStop(1, darker(pc, 0.45));
  ctx.fillStyle = gm;
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Metallrand ringsum (innen), Grat quer über die Wölbung, Glanzlicht
  ctx.save();
  cap();
  ctx.clip();
  cap();
  ctx.strokeStyle = metal;
  ctx.lineWidth = 3.2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, -5);
  ctx.quadraticCurveTo(2, -12.5, 15.5, 0);
  ctx.strokeStyle = darker(pc, 0.35);
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, -6.1);
  ctx.quadraticCurveTo(2, -13.6, 15.8, -1.1);
  ctx.strokeStyle = lighter(metal, 0.45);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.beginPath();
  ctx.ellipse(-5, -6, 4.6, 1.5, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Nieten auf dem Rand
  for (const [x, y] of [[-13.4, -0.2], [-14, -7], [-6, -11.6], [4, -12], [11.4, -6.6], [14.8, 1.6], [9, 4.6], [1, 5.6], [-7, 3.4]]) {
    oval(ctx, x, y, 1.05, 1.05, darker(metal, 0.25));
    oval(ctx, x - 0.25, y - 0.25, 0.55, 0.55, lighter(metal, 0.5));
  }
  // Götter: goldene Ranke auf der Platte (Ewigkeit: Roségold; Abgrund: cyanfarbener Riss)
  if (tier >= 7) {
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    if (tier === 8) {
      ctx.lineTo(-5, -4);
      ctx.lineTo(-1, -1);
      ctx.lineTo(5, -5);
      ctx.lineTo(12, -3);
    } else ctx.bezierCurveTo(-5, -6, 6, 2, 12, -4);
    ctx.strokeStyle = tier === 8 ? '#5ee8ff' : tier === 9 ? '#e2957c' : '#ffe9a0';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
  // Dornen auf dem Grat (Drache bis Asche)
  if (tier >= 3 && tier < 6) {
    for (const [x, y, h, a] of [[-6, -11, 6.5, -0.35], [2, -12.6, 8, 0], [9.5, -8.6, 6.5, 0.45]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      path([[-2, 0.6], [-0.6, -h * 0.5], [0, -h], [0.8, -h * 0.5], [2, 0.6], [0, 1], [-2, 0.6]]);
      const gs = ctx.createLinearGradient(-2, 0, 2, 0);
      gs.addColorStop(0, lighter(metal, 0.4));
      gs.addColorStop(1, darker(metal, 0.3));
      ctx.fillStyle = gs;
      ctx.fill();
      ctx.strokeStyle = darker(metal, 0.5);
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }
  }
  // Juwel in der Mitte der Platte (ab Seele); Abgrund mit Leerenauge, Ewigkeit mit Stern
  if (tier === 8) voidEye2D(ctx, 1.5, -2, 1.1);
  else if (tier === 9) star2D(ctx, 1.5, -2, 5);
  else if (tier >= 4) {
    oval(ctx, 1.5, -2, 3.2, 3.2, darker(metal, 0.3));
    oval(ctx, 1.5, -2, 2.4, 2.4, glow);
    oval(ctx, 0.7, -2.8, 0.9, 0.9, '#ffffff');
  }
  ctx.restore();
}

// Dolch-Symbol (seit 13.19) aus denselben Klingenumrissen wie die 3D-Waffe (DAGGER_BLADES): Klinge
// entlang +x. Seit 14.20 mit denselben Farben, Parierstangen und Knäufen wie der neue 3D-Dolch (DAGGER_LOOK3) und
// leuchtender Schneide ab Stufe 4
const DAGGER_ICON = [
  { blade: '#c7ccd3', grip: '#6b4a2e', wrap: '#2a1a12', guard: '#8a8f96' },
  { blade: '#d6dce4', grip: '#3a2a22', wrap: '#7a5a3a', guard: '#b8c0cc' },
  { blade: '#564a74', grip: '#1e1a26', wrap: '#6a4a9a', guard: '#2a2430', vein: '#b48cff' },
  { blade: '#a8b8a0', grip: '#2e5a2a', wrap: '#7ac25a', guard: '#e8dcc0', vein: '#9dff6a' },
  { blade: '#5a6a8a', grip: '#22283a', wrap: '#8a9ab8', guard: '#8a9ab8', edge: '#7ac8ff' },
  { blade: '#2a2224', grip: '#1a1214', wrap: '#ff7a2a', guard: '#2a2224', edge: '#ff7a2a' },
  { blade: '#d8f0ff', grip: '#8a9ab8', wrap: '#e6f6ff', guard: '#e6f6ff', edge: '#9fe8ff' },
  { blade: '#ffe9a0', grip: '#7a4a1a', wrap: '#e8c46a', guard: '#e8c46a', edge: '#fff2b0' },
  { blade: '#3a2e66', grip: '#120c1e', wrap: '#5ee8ff', guard: '#1c1432', edge: '#5ee8ff' },
  { blade: '#bcb8d0', grip: '#a8706a', wrap: '#e2957c', guard: '#e2957c', edge: '#ffb8e0' }
];
function daggerIconArt(ctx, tier) {
  const K = 72;
  const D = DAGGER_ICON[tier];
  const map = ([qx, qy]) => [1 + qy * K, -qx * K];
  const pts = DAGGER_BLADES[tier];
  // Griff mit Kreuzwicklung und Knauf
  box(ctx, -9, -1.8, 9, 3.6, 1.2, D.grip);
  for (const x of [-7.5, -5, -2.5]) stroke(ctx, D.wrap, 0.9, [[x - 0.8, -1.8], [x + 0.8, 1.8]]);
  if (tier === 2 || tier === 4) {
    ctx.beginPath();
    ctx.arc(-11.6, 0, 2.3, 0, Math.PI * 2);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = tier === 2 ? D.vein : D.guard;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  } else if (tier === 3) oval(ctx, -10.4, 0, 2.2, 1.7, D.grip);
  else if (tier === 0) oval(ctx, -10, 0, 1.7, 1.7, '#8a8f96');
  else if (tier === 1) poly(ctx, [[-9, -1.6], [-12, 0], [-9, 1.6]], D.guard);
  else poly(ctx, [[-9, -1.4], [-12.6, 0], [-9, 1.4]], D.edge);
  // Parierstange
  if (tier === 3) for (const sy of [-1, 1]) poly(ctx, [[0, sy * 1], [-2.5, sy * 4.5], [0.8, sy * 1.6]], D.guard);
  else if (tier === 5) for (const sy of [-1, 1]) poly(ctx, [[0, sy * 1], [2.5, sy * 4.6], [1, sy * 1]], D.guard);
  else if (tier === 8) for (const sy of [-1, 1]) {
    stroke(ctx, OUTLINE, 2.6, [[0, sy * 1], [-1, sy * 4], [1.8, sy * 5.6], [2.6, sy * 3.8]]);
    stroke(ctx, '#3a2e66', 1.4, [[0, sy * 1], [-1, sy * 4], [1.8, sy * 5.6], [2.6, sy * 3.8]]);
  } else if (tier === 2) oval(ctx, 0.4, 0, 1.2, 2.6, D.guard);
  else if (tier === 6) for (const sy of [-1, 1]) poly(ctx, [[-0.6, sy * 0.8], [2.4, sy * 5], [-0.4, sy * 3.6], [-1.2, sy * 1]], D.guard);
  else if (tier === 7) { box(ctx, -0.6, -5, 2, 10, 0.9, D.guard); oval(ctx, 0.4, 0, 1, 1, '#fff2b0'); }
  else if (tier === 9) { box(ctx, -0.4, -3.6, 1.6, 7.2, 0.7, D.guard); for (const y of [-2.2, 0, 2.2]) oval(ctx, 0.4, y, 0.7, 0.7, y ? '#9ad8ff' : '#ff9ad5'); }
  else box(ctx, -0.4, tier === 4 ? -2.8 : -3.6, 1.8, tier === 4 ? 5.6 : 7.2, 0.7, D.guard);
  // leuchtende Schneide (ab Stufe 4): etwas größerer Umriss in der Leuchtfarbe hinter der Klinge
  if (D.edge) {
    ctx.save();
    ctx.globalAlpha *= 0.85;
    poly(ctx, insetPts(pts, -0.006).map(map), D.edge);
    ctx.restore();
  }
  // Klinge: helle Schneide, dunklere Mitte, Ader (wie bladeIcon)
  bladeIcon(ctx, pts, null, map, D.blade, tier, 0.007);
  if (D.vein) stroke(ctx, D.vein, 0.9, [[3, 0], [1 + 0.15 * K, tier === 2 ? -0.03 * K : 0]]);
}

// Köcher (seit 13.20): schräger Lederköcher mit Riemen, oben ragen drei Pfeile mit Federn heraus.
// Höhere Stufen: Metallbeschläge, farbige Pfeilspitzen in der Farbe der Munition, ab Stufe 5 Glühen
const QUIVER_LEATHER = ['#7a5232', '#6b4a2e', '#3a3448', '#3e5a34', '#26304a', '#2a2224', '#e6eef8', '#b8862a', '#1a1428', '#f0e8f0'];
function quiverIconArt(ctx, tier) {
  const arrow = QUIVER_ARROWS[tier];
  const leather = QUIVER_LEATHER[tier];
  const trim = tier === 0 ? '#4a301c' : tier === 8 ? '#6e5cc0' : tier === 9 ? '#e2957c' : tier >= 6 ? '#ffd34d' : TIER_METAL[tier];
  ctx.save();
  ctx.rotate(0.5);
  // Pfeile (hinter dem Köcherrand): Schaft, Federn, Spitze oben
  for (const [dx, h] of [[-3.4, 15], [0, 17.5], [3.4, 14]]) {
    stroke(ctx, '#d9c79a', 1.1, [[dx, -6], [dx, -h]]);
    poly(ctx, [[dx, -h - 4], [dx - 2.2, -h + 0.4], [dx + 2.2, -h + 0.4]], arrow.color);
    poly(ctx, [[dx, -8], [dx - 2.4, -10.5], [dx - 2.4, -6.5], [dx, -5]], tier >= 2 ? arrow.color : '#e8e0cc');
    poly(ctx, [[dx, -8], [dx + 2.4, -10.5], [dx + 2.4, -6.5], [dx, -5]], tier >= 2 ? darker(arrow.color, 0.25) : '#c8402f');
  }
  // Köcherkörper (unten etwas schmaler)
  poly(ctx, [[-7, -7], [7, -7], [5.6, 15], [-5.6, 15]], leather);
  poly(ctx, [[-7, -7], [-3.5, -7], [-3, 15], [-5.6, 15]], darker(leather, 0.22));
  stroke(ctx, lighter(leather, 0.25), 0.8, [[2.5, -5], [2, 13]]);
  // Rand oben und Boden
  box(ctx, -7.8, -8.6, 15.6, 3.2, 1.2, trim);
  box(ctx, -6.2, 13.4, 12.4, 2.8, 1, trim);
  // Riemen quer und Schnalle
  stroke(ctx, darker(leather, 0.45), 1.6, [[-9, 1], [9, 5]]);
  if (tier >= 1) box(ctx, -1.6, 1.4, 3.2, 3.2, 0.8, trim);
  // Verzierung je Stufe
  if (tier === 8) voidEye2D(ctx, 0, 9.5, 0.9);
  else if (tier === 9) star2D(ctx, 0, 9.5, 4);
  else if (tier >= 3) poly(ctx, [[0, 6.5], [2.4, 9.5], [0, 12.5], [-2.4, 9.5]], tier >= 5 ? arrow.color : trim);
  if (tier >= 5) {
    ctx.globalAlpha = 0.35;
    oval(ctx, 0, -12, 7, 5, arrow.color);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// seit 14.32: Waffensymbole mittig und in einer Größe je Waffenart. Gemessen wurde die Ausdehnung aller Stufen im
// 40er-Feld (Mitte x, y und halbe Kantenlänge); Zweihänder, Streitaxt, Stab, Sense und Bogen füllen das Feld,
// Einhandwaffen bleiben sichtbar kleiner – so erkennt man Schwert und Zweihänder schon an der Größe.
const WEAPON_ICON_FIT = {
  sword: [1.5, -1.65, 18.3, 15.6], axe: [-3.5, -3.5, 17, 15.6], dagger: [0.85, -3.9, 18.9, 16],
  greatsword: [0.65, -0.6, 19.65, 18.6], greataxe: [-1.65, 0.75, 18.25, 18.6], bow: [1, -0.15, 23.15, 18.8],
  fan: [-1.25, 1, 19.3, 17.6], bell: [-0.5, 0.25, 15.5, 16.2], staff: [-3.5, 3.25, 16.3, 18.6], scythe: [-4.9, 1, 18, 18.6],
  rod: [1.85, -2.15, 17.15, 16.6]
};

function drawItemArt(ctx, item) {
  const { slot, tier } = item;
  // seit 14.59: Symbol in der Farbvariante des Teils (wie an der Figur), damit man sieht, was man trägt
  const tc = (col, m) => gearCol(item, col, m);
  const metal = tc(TIER_METAL[tier], true);
  const c = tc(ARMOR_COLORS[tier]);
  if (slot === 'waffe') {
    const kind = item.kind || 'sword';
    const long = kind === 'staff' || kind === 'scythe' || kind === 'greatsword' || kind === 'greataxe' || kind === 'bell';
    ctx.save();
    const fit = WEAPON_ICON_FIT[kind];
    if (fit) {
      const f = fit[3] / fit[2];
      ctx.translate(-fit[0] * f, -fit[1] * f);
      ctx.scale(f, f);
    }
    ctx.rotate(-Math.PI / 4);
    if (kind === 'dagger') {
      ctx.translate(-5, 0);
    } else if (kind === 'fan') {
      ctx.translate(-6, 0);
      ctx.scale(1.3, 1.3);
    } else if (kind === 'bow') {
      // seit 14.20 mittig (der Bogen ist jetzt länger und breiter)
      ctx.rotate(Math.PI / 4);
      ctx.translate(-8, 0);
      ctx.scale(1.3, 1.3);
    } else if (kind === 'rod') {
      // Zepter: kurz, dafür etwas größer
      ctx.translate(-11, 0);
      ctx.scale(1.02, 1.02);
    } else if (long) {
      ctx.translate(-15, 0);
      ctx.scale(0.85, 0.85);
    } else {
      ctx.translate(-12, 0);
    }
    if (kind === 'dagger') daggerIconArt(ctx, tier);
    else weaponArt(ctx, kind, tier);
    ctx.restore();
  } else if (slot === 'ruestung' && (item.cls === 'schamane' || item.cls === 'nekromant')) {
    // Robe mit weiten Ärmeln
    const L = ARMOR_LOOK[item.cls];
    const robe = tc(L.robe[tier]);
    const trim = item.cls === 'schamane' ? tc(L.gold[tier], true) : L.glow[tier];
    poly(ctx, [[-6, -12], [6, -12], [9, 13], [-9, 13]], robe);
    poly(ctx, [[-6, -12], [-15, 2], [-11, 5], [-5, -4]], darker(robe, 0.15));
    poly(ctx, [[6, -12], [15, 2], [11, 5], [5, -4]], darker(robe, 0.15));
    stroke(ctx, trim, 1.2, [[-3, -12], [0, -5], [3, -12]]);
    box(ctx, -8, 1, 16, 2.4, 1, trim);
    stroke(ctx, trim, 1, [[-9, 12.5], [9, 12.5]]);
    if (tier === 8) {
      voidEye2D(ctx, 0, 7.5, 0.9);
      for (const x of [-7, 7]) stroke(ctx, '#5ee8ff', 0.7, [[x, 12], [x * 0.8, 8], [x * 0.95, 5]]);
    } else if (tier === 9) star2D(ctx, 0, 7.5, 4.2);
  } else if (slot === 'ruestung' && item.cls === 'magier') {
    // Magier (seit 8.6): langer Mantel mit hohem Stehkragen, Mittelschlitz und Glockenstulpen
    const L = ARMOR_LOOK.magier;
    const robe = tc(L.robe[tier]);
    const silver = tc(L.trim[tier], true);
    const arkan = MAGE_EL.arkan.main;
    poly(ctx, [[-6, -11], [6, -11], [10, 14], [-10, 14]], robe);
    poly(ctx, [[-1, 0], [1, 0], [3.5, 14], [-3.5, 14]], darker(robe, 0.3));
    for (const sg of [-1, 1]) {
      poly(ctx, [[sg * 6, -11], [sg * 13, 5], [sg * 9.5, 7], [sg * 4.5, -3]], darker(robe, 0.12));
      poly(ctx, [[sg * 12.6, 4], [sg * 9.2, 6.4], [sg * 10, 9.6], [sg * 15, 6.6]], darker(robe, 0.12));
      stroke(ctx, silver, 1, [[sg * 10, 9.6], [sg * 15, 6.6]]);
      poly(ctx, [[sg * 2.4, -11], [sg * 6.6, -16], [sg * 6, -10.5]], mixColor(robe, silver, 0.35));
      stroke(ctx, silver, 0.9, [[sg * 1.8, -10], [sg * 1.8, 0], [sg * 3.6, 13.5]]);
    }
    stroke(ctx, tier === 7 ? '#e8c46a' : silver, 1.4, [[-9.6, 12.8], [9.6, 12.8]]);
    if (tier === 8) for (const x of [-7, 6]) stroke(ctx, '#5ee8ff', 0.7, [[x, 12.5], [x - 1, 9], [x + 0.6, 6.5]]);
    box(ctx, -7, 0, 14, 2, 0.8, tier === 0 ? '#c8b890' : '#2a2230');
    if (tier >= 2) for (const x of [-6, 0, 6]) mageGlyph2D(ctx, x, 10, 1.4, 'up', arkan, 0.8);
    if (tier === 8) voidEye2D(ctx, 0, -5, 1);
    else if (tier === 9) star2D(ctx, 0, -5, 4.4);
    else if (tier >= 4) mageGlyph2D(ctx, 0, -5, 2.6, 'up', arkan, 1);
  } else if (slot === 'ruestung' && item.cls === 'ninja') {
    // Wams mit Schal und Kreuzgurten
    const L = ARMOR_LOOK.ninja;
    const scarf = tc(L.scarf[tier]);
    poly(ctx, [[-9, -10], [9, -10], [10, 10], [-10, 10]], tc(L.torso[tier]));
    stroke(ctx, '#5a4030', 1.6, [[-8, -9], [8, 8]]);
    stroke(ctx, '#5a4030', 1.6, [[8, -9], [-8, 8]]);
    box(ctx, -10, -13, 20, 4.5, 2, scarf);
    poly(ctx, [[5, -10], [9, -10], [12, 2], [8, 2]], scarf);
    box(ctx, -10, 7, 20, 3, 1, scarf);
    if (tier === 8) voidEye2D(ctx, 0, -0.5, 1);
    else if (tier === 9) star2D(ctx, 0, -0.5, 4.6);
  } else if (slot === 'ruestung') {
    // seit 14.59: detailreicher Harnisch (chestIcon2D, figuren.js) – Leder, Kettenhemd, Platte mit Rand, Nieten und Wappen
    const k = ARMOR_LOOK.krieger;
    const plate = tier === 0 ? tc(k.torso[0]) : tier === 1 ? tc('#8a8070', true) : tc(GEAR_LOOK.plate[tier], true);
    chestIcon2D(ctx, tier, plate, tier === 7 ? tc('#6e2630') : tc(k.torso[tier]), tc(TIER_METAL[tier], true));
  } else if (slot === 'helm' && item.cls === 'ninja') {
    // Kapuze mit Augenschlitz
    const L = ARMOR_LOOK.ninja;
    const hood = tc(L.hood[tier]);
    oval(ctx, 0, 0, 12, 12, hood);
    box(ctx, -9, -3, 18, 6, 2.5, '#e9c6a1');
    for (const x of [-4, 4]) dot(ctx, x, 0, 1.6, 1.2, tier === 8 ? '#5ee8ff' : tier === 9 ? '#ffb8e0' : tier >= 6 ? '#9fe8ff' : '#21160f');
    if (tier >= 4) box(ctx, -10, -8, 20, 3, 1, L.scarf[tier]);
    if (tier === 8) voidEye2D(ctx, 0, -6.5, 0.8);
    else if (tier === 9) star2D(ctx, 0, -6.5, 4);
    poly(ctx, [[8, 4], [17, 12], [12, 13]], hood);
  } else if (slot === 'helm' && item.cls === 'schamane') {
    // Stirnband bzw. Krone mit Juwel
    const L = ARMOR_LOOK.schamane;
    const band = tc(L.band[tier]);
    box(ctx, -13, -2, 26, 6, 2.5, band);
    stroke(ctx, darker(band, 0.35), 0.8, [[-12, 1], [12, 1]]);
    if (tier === 8) for (const [x, h] of [[-9, 8], [-3, 12], [3, 12], [9, 8]]) {
      // Abgrund: Krone aus Leerensplittern mit cyanfarbenem Kern
      poly(ctx, [[x - 2.2, -2], [x, -2 - h], [x + 2.2, -2]], '#2a2048');
      stroke(ctx, '#5ee8ff', 0.7, [[x, -3], [x, -h * 0.75]]);
    } else if (tier === 9) {
      // Ewigkeit: Strahlenkranz und Stern in der Mitte
      for (const [x, h] of [[-10, 6], [-5, 10], [5, 10], [10, 6]]) poly(ctx, [[x - 1.6, -2], [x, -2 - h], [x + 1.6, -2]], '#efeaf6');
      star2D(ctx, 0, -8, 6);
    } else if (tier >= 3) for (const x of [-9, -3, 3, 9]) poly(ctx, [[x - 2.5, -2], [x, -10 - (tier >= 5 ? 3 : 0)], [x + 2.5, -2]], band);
    oval(ctx, 0, 1, 2.6, 2.6, tier === 8 ? '#5ee8ff' : tier === 9 ? '#ffb8e0' : tier >= 4 ? '#ffffff' : '#c8402f');
    if (tier < 3) for (const x of [-13, 13]) poly(ctx, [[x, 2], [x + (x < 0 ? -3 : 3), 12], [x + (x < 0 ? 1 : -1), 12]], band);
  } else if (slot === 'helm' && item.cls === 'magier') {
    // Spitzer Krempenhut; Erzmagierreif mit drei schwebenden Kristallen
    const L = ARMOR_LOOK.magier;
    const hat = tc(L.hat[tier]);
    const arkan = MAGE_EL.arkan.main;
    ctx.save();
    ctx.translate(0, 3);
    if (tier === 7) {
      box(ctx, -13, 2, 26, 4, 2, L.trim[tier]);
      oval(ctx, 0, 4, 2, 2, arkan);
      for (const [x, y] of [[-8, -6], [0, -10], [8, -6]]) rodCrystal(ctx, x, y, 0.75, arkan, true);
    } else {
      const bent = tier === 0 || tier === 6 || tier === 8;
      oval(ctx, 0, 9, 16, 4.6, darker(hat, 0.08));
      paintShape(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(-10, 8);
        ctx.quadraticCurveTo(-6, -4, bent ? -9 : 1, bent ? -14 : -19);
        ctx.quadraticCurveTo(5, -4, 10, 8);
        ctx.quadraticCurveTo(0, 10, -10, 8);
        ctx.closePath();
      }, hat, -10, -19, 20, 28);
      poly(ctx, [[-10, 8.4], [10, 8.4], [9, 4.6], [-9, 4.6]], tier === 1 ? L.trim[tier] : arkan);
      if (tier === 1) oval(ctx, 0, 6.5, 1.8, 1.8, arkan);
      if (tier === 3) rodCrystal(ctx, 1, -22, 0.7, arkan, true);
      if (tier === 4) mageGlyph2D(ctx, 1, -22.5, 2.6, 'up', arkan, 1.2);
      if (tier === 5) for (const [x, y] of [[-4, 0], [3, -5], [-1, -10]]) dot(ctx, x, y, 1, 0.8, '#ff7a2a');
      if (tier === 6) for (const [x, y] of [[-4, 1], [3, -3], [-2, -8], [4, 3]]) dot(ctx, x, y, 0.8, 0.8, '#ffffff');
      // seit 13.53: Abgrundhut mit Leerenauge und Splittern, Ewigkeitshut mit Stern auf der Spitze
      if (tier === 8) {
        voidEye2D(ctx, 0, 0, 0.9);
        for (const [x, y] of [[-12, -10], [-4, -18], [6, -12]]) poly(ctx, [[x, y - 2.4], [x + 1.2, y], [x, y + 2.4], [x - 1.2, y]], '#5ee8ff');
      }
      if (tier === 9) {
        for (const [x, y] of [[-4, 1], [3, -4], [-1, -10]]) dot(ctx, x, y, 0.8, 0.8, '#ffb8e0');
        star2D(ctx, 1, -20, 5);
      }
    }
    ctx.restore();
  } else if (slot === 'helm' && item.cls === 'nekromant') {
    // Spitze Kapuze, ab Stufe 5 mit Knochenkrone
    const L = ARMOR_LOOK.nekromant;
    poly(ctx, [[-12, 12], [-13, -2], [-4, -11], [2, -18], [6, -10], [13, -2], [12, 12]], tc(L.hood[tier]));
    dot(ctx, 0, 4, 7, 7, '#0d120c');
    for (const x of [-3, 3]) dot(ctx, x, 3, 1.4, 1, L.glow[tier]);
    if (tier >= 4) for (const [x, h] of [[-6, 5], [0, 8], [6, 5]]) poly(ctx, [[x - 1.6, -10], [x, -10 - h], [x + 1.6, -10]], tier === 8 ? '#3a2e66' : tier === 9 ? '#efeaf6' : '#ddd5bb');
    if (tier === 8) voidEye2D(ctx, 0, -5, 0.9);
    else if (tier === 9) star2D(ctx, 0, -19, 4.4);
  } else if (slot === 'helm') {
    // seit 14.59 im Stil der neuen Symbole: gewölbte Glocke mit Glanz, Stirnreif mit Nieten, Nasal und Wangenklappen
    const hm = tc(ARMOR_LOOK.krieger.helm[tier], tier >= 1);
    helmIcon2D(ctx, tier, hm, tier === 0 ? darker(hm, 0.2) : metal, tier >= 2 ? tc(ARMOR_LOOK.krieger.crest[tier]) : null);
    if (tier === 8) {
      // Abgrund: eingerollte Tentakelhörner und ein Leerenauge auf der Stirn
      for (const sg of [-1, 1]) {
        stroke(ctx, OUTLINE, 3.2, [[sg * 8, -5], [sg * 14, -10], [sg * 13, -17], [sg * 9, -16]]);
        stroke(ctx, '#3a2e66', 1.9, [[sg * 8, -5], [sg * 14, -10], [sg * 13, -17], [sg * 9, -16]]);
      }
      voidEye2D(ctx, 0, -2, 1);
    } else if (tier === 9) {
      // Ewigkeit: Strahlenkranz und Stern auf der Stirn
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.45;
        poly(ctx, [[Math.cos(a - 0.12) * 12, 4 + Math.sin(a - 0.12) * 12], [Math.cos(a) * (k % 2 ? 17 : 20), 4 + Math.sin(a) * (k % 2 ? 17 : 20)], [Math.cos(a + 0.12) * 12, 4 + Math.sin(a + 0.12) * 12]], k % 2 ? '#e2957c' : '#efeaf6');
      }
      star2D(ctx, 0, -2.5, 4.2);
    } else if (tier >= 4) {
      poly(ctx, [[-9, -6], [-13, -14], [-6, -8]], '#b48cff');
      poly(ctx, [[9, -6], [13, -14], [6, -8]], '#b48cff');
    }
  } else if (slot === 'koecher') {
    quiverIconArt(ctx, tier);
  } else if (slot === 'schild') {
    ctx.save();
    ctx.scale(1.35, 1.35);
    shieldArt(ctx, tier, item);
    ctx.restore();
  } else if (slot === 'schultern') {
    // seit 13.12: zwei echte Schulterpanzer statt zwei Ovalen – hohe Hauptplatte mit Grat und Nieten,
    // darunter drei überlappende Schienen über dem Oberarm, in der Mitte ein Kragenstück, das beide verbindet
    shoulderIcon(ctx, tier, tc(GEAR_LOOK.plate[tier], true), metal);
  } else if (slot === 'umhang') {
    // seit 14.59: fallender Umhang mit Falten, Futter, Saum, Kragen und Spangen (capeIcon2D, figuren.js)
    capeIcon2D(ctx, tier, tc(GEAR_LOOK.cape[tier]), tc(GEAR_LOOK.lining[tier]), metal);
  } else if (slot === 'guertel') {
    // seit 14.59: Ledergurt mit Naht, Schnalle, Schlaufe und Tasche (beltIcon2D, figuren.js)
    beltIcon2D(ctx, tier, tc(GEAR_LOOK.belt[tier]), metal);
  } else {
    // seit 14.59: zwei echte Stiefel mit Sohle, Stulpe, Riemen und Beschlägen (bootIcon2D, figuren.js)
    bootIcon2D(ctx, tier, tc(GEAR_LOOK.boots[tier]), metal);
  }
}
// Figur im Inventar: die eigene Spielfigur von vorn mit Waffe und Schild, die gerade angelegt sind
function drawDoll(canvas, who = game.player) {
  if (!canvas) return;
  // seit 9.1: in 3D die echte Figur, ganz im Bild; Antippen dreht sie weiter
  if (!canvas.dataset.turn) {
    canvas.dataset.turn = '1';
    canvas.dataset.yaw = '-0.4';
    canvas.addEventListener('click', () => {
      canvas.dataset.yaw = String(Number(canvas.dataset.yaw) + Math.PI / 4);
      drawDoll(canvas, who);
    });
  }
  // Fenster noch nicht sichtbar (keine Größe): im nächsten Bild zeichnen
  if (!canvas.clientWidth && !canvas.dataset.wait) {
    canvas.dataset.wait = '1';
    requestAnimationFrame(() => {
      delete canvas.dataset.wait;
      if (canvas.isConnected) drawDoll(canvas, who);
    });
    return;
  }
  if (typeof v3Portrait === 'function' && v3Portrait(canvas, who, Number(canvas.dataset.yaw))) return;
  const w = canvas.clientWidth || 76;
  const h = canvas.clientHeight || 100;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const p = who;
  const g = ctx.createRadialGradient(w / 2, h * 0.55, 4, w / 2, h * 0.55, h * 0.6);
  g.addColorStop(0, `rgba(${hexRgb(CLASSES[p.classId].trim)},0.35)`);
  g.addColorStop(1, `rgba(${hexRgb(CLASSES[p.classId].trim)},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const pose = { ...p, x: 0, y: 0, facing: { x: 0, y: 1 }, moving: false, spin: 0, swing: 0, buffs: [], shield: 0, glowUntil: 0 };
  // 2D: so groß, dass die Figur samt Waffe in Höhe und Breite passt
  const scale = Math.min(h / 82, w / 46);
  ctx.translate(w / 2, h - 8 * scale);
  ctx.scale(scale, scale);
  ctx.translate(0, -feetY(pose));
  drawPlayer(ctx, pose);
}

function itemIconUrl(item) {
  const band = plusBand(item.plus);
  const key = `${item.slot}:${item.tier}:${item.cls || ''}:${item.kind || ''}:${band}:${gearHueKey(item)}`;
  if (iconCache.has(key)) return iconCache.get(key);
  // seit 14.38 im Arbeitsspeicher gebacken (bakeSprite cpu, figuren.js): kein Zurücklesen von der Grafikkarte
  // seit 14.59 in ICON_HI gebacken und 144 Pixel groß: die detailreicheren Symbole bleiben am Handy scharf
  const sp = bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => drawItemArt(ctx, item), ICON_HI, true);
  const size = 144;
  const c = newCanvas(size, size);
  const ctx = c.getContext('2d', CPU_CANVAS);
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

// seit 14.60: Verstärkungen, Switcher, Sternensteine, Sternen-Switcher und Schriftrolle detailreich wie die
// Ausrüstungssymbole (geschliffene Steine, Pergament mit Holzstäben und Siegeln) – Zeichnungen in symbole-vorrat.js
const MATERIAL_ART = {
  boniPlus: (ctx) => vsBoniPlus(ctx),
  boni5: (ctx) => vsBoni5(ctx),
  switcher: (ctx) => vsSwitcher(ctx),
  star: (ctx) => vsStar(ctx),
  // Schriftrolle (seit 14.1, für H1–H10): zusammengerollte Pergamentrolle schräg, mit rotem Band und Wachssiegel
  rolle: (ctx) => vsRolle(ctx),
  // Seelenstein (seit 14.1, für L1–V): kantiger, leuchtender Kristall wie die Seelensteine der Welt (seit 13.85),
  // violett mit türkisem Kern, zwei kleine Splitter am Fuß
  seelenstein(ctx) {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 19);
    g.addColorStop(0, 'rgba(159, 232, 255, 0.55)');
    g.addColorStop(1, 'rgba(180, 140, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, 40, 40);
    poly(ctx, [[-10, 15], [-13, 7], [-8, 9]], '#5a3a9a');
    poly(ctx, [[10, 15], [13.5, 5], [8, 10]], '#6a4ab0');
    poly(ctx, [[0, -18], [8, -8], [7, 9], [0, 17], [-7, 9], [-8, -8]], '#6a4ab8');
    poly(ctx, [[0, -18], [-8, -8], [-7, 9], [0, 17], [-2.5, -6]], '#4a2e8a');
    poly(ctx, [[0, -18], [8, -8], [2.5, -6]], '#c8b4ff');
    poly(ctx, [[-2.5, -6], [2.5, -6], [3, 8], [0, 12], [-3, 8]], '#8fd8ff');
    dot(ctx, 0, 2, 2.2, 4, '#e8fbff');
    stroke(ctx, '#ffffff', 0.8, [[-5.5, -9], [-1.5, -15]]);
    dot(ctx, 9.5, -13, 0.9, 2.6, '#ffffff');
    dot(ctx, 9.5, -13, 2.6, 0.9, '#ffffff');
  },
  // Ätherkern (seit 14.16): runder, türkis leuchtender Kern in einer dunklen Steinfassung mit drei Klammern
  aetherkern(ctx) {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 19);
    g.addColorStop(0, 'rgba(127, 240, 208, 0.6)');
    g.addColorStop(1, 'rgba(60, 200, 180, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, 40, 40);
    poly(ctx, [[-13, -4], [-6, -14], [6, -14], [13, -4], [11, 9], [0, 15], [-11, 9]], '#3a4a52');
    poly(ctx, [[-13, -4], [-6, -14], [0, -10], [-9, -1]], '#56666e');
    oval(ctx, 0, 0, 8.5, 8.5, '#1e8a78');
    oval(ctx, 0, 0, 6, 6, '#4fe0c0');
    oval(ctx, -1.5, -1.8, 2.6, 2.6, '#e8fff8');
    for (const [x, y] of [[0, -11], [9.5, 6], [-9.5, 6]]) dot(ctx, x, y, 2, 2, '#c8b070');
  },
  // Sternen-Switcher: Obsidianscheibe mit Sternstein, zwei goldene Pfeile kreisen darum (seit 14.60 detailreich)
  switch67: (ctx) => vsSwitch67(ctx)
};

function materialSprite(id) {
  return getSprite('mat:' + id, { x: -20, y: -20, w: 40, h: 40 }, (ctx) => MATERIAL_ART[id](ctx), undefined, true);
}

function materialIconCanvas(id) {
  return materialSprite(id).img;
}

// seit 14.51: Symbole für Fenster (Vorräte) in doppelter Auflösung – am Handy (3 Bildpunkte je CSS-Pixel) sahen die
// 120-Pixel-Bilder in den Kacheln verwaschen und pixelig aus
const ICON_HI = 6;
function materialIconHiUrl(id) {
  const key = 'mathi:' + id;
  if (!iconCache.has(key)) iconCache.set(key, bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => MATERIAL_ART[id](ctx), ICON_HI, true).img.toDataURL());
  return iconCache.get(key);
}
// seit 14.60 dasselbe scharfe Bild wie materialIconHiUrl (Aufwertungsteile, Händler, Tagesbelohnung)
function materialIconUrl(id) {
  return materialIconHiUrl(id);
}

function itemIconCanvas(item) {
  return bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => drawItemArt(ctx, item)).img;
}

function scrollIconUrl() {
  if (iconCache.has('scroll')) return iconCache.get('scroll');
  // seit 14.32: Segensschriftrolle hochkant und offen, mit goldener Schutzrune (Schild mit Kreuz) und goldenem
  // Siegel am Band – vorher sah sie fast wie der Switcher aus und war im Inventar kaum von der Schriftrolle zu trennen
  // seit 14.60 detailreich: Pergament mit Goldrand, Wappen, Holzstäben mit Knäufen, Bändern und Siegel (symbole-vorrat.js)
  const sp = bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => vsBlessing(ctx), ICON_HI, true);
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
// seit 14.60 detailreich mit Verlauf, Maserung und Glanz (VS_MOB_ART in symbole-vorrat.js); die flachen Formen oben
// bleiben als Rückfall für unbekannte Arten
function mobMatArt(m) {
  return VS_MOB_ART[m.art] || MOB_MAT_ART[m.art];
}

function mobMatSprite(id) {
  const m = MOB_MATS[id];
  return getSprite('mm:' + id, { x: -20, y: -20, w: 40, h: 40 }, (ctx) => mobMatArt(m)(ctx, m.color), undefined, true);
}

function mobMatIconUrl(id) {
  const key = 'mm:' + id;
  // seit 14.60 in ICON_HI gebacken (Aufwertungsteile, Schmied)
  if (!iconCache.has(key)) {
    const m = MOB_MATS[id];
    iconCache.set(key, bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => mobMatArt(m)(ctx, m.color), ICON_HI, true).img.toDataURL());
  }
  return iconCache.get(key);
}

// Tränke: Drachenblut (Leben) mit Korken und rotem Wachssiegel, Mondtau (Mana) mit Mondsichel-Stöpsel.
// seit 14.60: Glasflasche mit Reflexen, Flüssigkeit mit Meniskus, Etikett; Form je Größe (art: S Fläschchen,
// M Kolben, XL Birnenflasche, XXL Karaffe mit Goldfuß) – Zeichnung vsPotion in symbole-vorrat.js
function drawPotion(ctx, kind, art = 1) {
  vsPotion(ctx, kind, art);
}

// Kleine Symbole für die Beuteanzeige: Gold, Seelensplitter, Bücher und Tränke
const LOOT_ICON_ART = {
  gold(ctx) {
    for (const [x, y] of [[-5, 4], [5, 4], [0, -3]]) {
      oval(ctx, x, y, 7.5, 5.5, '#e8b83a');
      oval(ctx, x, y - 1, 5.5, 3.6, '#ffd96a');
      stroke(ctx, '#a87a1a', 0.8, [[x - 2, y - 1], [x + 2, y - 1]]);
    }
  },
  // seit 14.60: geschliffener Kristallsplitter mit Facetten und Glühen (symbole-vorrat.js)
  splinter(ctx) { vsSplinter(ctx); },
  potHp(ctx) { drawPotion(ctx, 'hp'); },
  // Fertigkeitsbuch allgemein (10.4 bis 14.0 eine Hängerolle, seit 14.1 wieder ein Buch)
  book(ctx) {
    drawSkillBook(ctx, '#5a2a8a', '#7a3aaa', (c) => {
      oval(c, 0, 0, 14, 14, '#ffd34d');
      stroke(c, '#5a2a8a', 4, [[-8, 0], [8, 0]]);
      stroke(c, '#5a2a8a', 4, [[0, -8], [0, 8]]);
    });
  },
  potMp(ctx) { drawPotion(ctx, 'mp'); }
};

// Trank in einer Größe: S ist das normale Symbol, größere Flaschen werden größer und tragen ihr Zeichen
function potionIconUrl(kind, size = 'S') {
  const base = kind === 'hp' ? 'potHp' : 'potMp';
  // seit 14.32: auch S trägt sein Zeichen, und die Flasche wächst stetig von S bis XXL
  // (vorher war S ohne Zeichen in voller Größe und damit größer als M)
  const idx = POTION_SIZES.findIndex((sz) => sz.id === size);
  if (idx < 0) return lootIconUrl(base);
  const key = 'pot3:' + kind + size;
  if (!iconCache.has(key)) {
    // seit 14.32 nach sz.art (alte Reihenfolge S 0 … XXL 4): die Flasche wächst stetig, XL und XXL ohne L so groß wie bisher
    const sz = POTION_SIZES[idx];
    // seit 14.60: jede Größe mit eigener Flaschenform (drawPotion art), deshalb wächst sie nur noch wenig
    const art = sz.art != null ? sz.art : idx;
    const k = 0.86 + art * 0.035;
    const sp = bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => {
      ctx.save();
      ctx.translate(-1, 0.5);
      ctx.scale(k, k);
      drawPotion(ctx, kind, art);
      ctx.restore();
      // Größenzeichen unten rechts
      ctx.font = '900 9px sans-serif';
      ctx.textAlign = 'center';
      const w = size.length * 6 + 4;
      box(ctx, 19 - w, 10, w, 10, 3, size === 'XXL' ? '#ffd34d' : '#f4ecd8');
      ctx.strokeStyle = 'rgba(26, 18, 16, 0.75)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.roundRect(19 - w, 10, w, 10, 3);
      ctx.stroke();
      ctx.fillStyle = '#1a1210';
      ctx.fillText(size, 19 - w / 2, 18.5);
    }, ICON_HI, true);
    iconCache.set(key, sp.img.toDataURL());
  }
  return iconCache.get(key);
}

function lootIconUrl(kind) {
  const key = (kind === 'book' ? 'loot2:' : 'loot:') + kind;
  // seit 14.60 in ICON_HI gebacken (Fenster, Aufwertungsteile): scharf am Handy, einmal je Sorte
  if (!iconCache.has(key)) iconCache.set(key, bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => LOOT_ICON_ART[kind](ctx), ICON_HI, true).img.toDataURL());
  return iconCache.get(key);
}

// --- Fenster: Inventar und Schmied -------------------------------------------------------

// seit 14.32: Bestätigung für Knöpfe, die viel auf einmal wegnehmen (z. B. alle Tränke einer Sorte verkaufen):
// der erste Druck färbt den Knopf rot und fragt nach, erst der zweite innerhalb von 4 s führt aus.
function armConfirm(btn, ask = 'Wirklich verkaufen?') {
  if (btn.dataset.armed) return true;
  for (const o of document.querySelectorAll('[data-armed]')) { if (o !== btn && o._armReset) o._armReset(); }
  const old = btn.textContent;
  btn.dataset.armed = '1';
  btn.classList.add('danger');
  btn.textContent = ask;
  const t = setTimeout(() => btn._armReset && btn._armReset(), 4000);
  btn._armReset = () => { clearTimeout(t); delete btn.dataset.armed; btn.classList.remove('danger'); btn.textContent = old; btn._armReset = null; };
  return false;
}

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
      const gslot = slot === 'schild' && quiverMode(game.player) ? 'koecher' : slot;
      const ghost = slot ? `<img class="ghost" src="${itemIconUrl(makeItem(gslot, 0))}" alt="">` : '';
      return `<button type="button" class="item-tile empty${slot ? ' has-ghost' : ''}" ${attrs}${slot ? ` data-slot="${slot}"` : ''}>${ghost}<span class="slot-label">${label || 'leer'}</span></button>`;
    }
    if (isBook(item)) {
      const own = ownBook(game.player, item.book);
      return `<button type="button" class="item-tile book-tile${own ? ' own' : ''}" ${attrs} data-info="${escTip(itemTipHtml(item))}">` +
        `<img src="${bookIconUrl(item.book)}" alt="Fertigkeitsbuch: ${skillEntry(item.book).sk.name}">` +
        `<span class="item-count">${item.count}</span>` + (label ? `<span class="slot-label">${label}</span>` : '') + `</button>`;
    }
    const band = plusBand(item.plus);
    // Pfeil: besser oder schlechter als das Angelegte (nur für Gegenstände in der Tasche)
    const worn = Object.values(game.player.equipment).includes(item);
    // seit 15.06: ein bis vier Pfeile je nach Größe des Unterschieds (compareGrade)
    const score = worn ? 0 : compareGrade(item);
    const arrow = score ? `<span class="tile-cmp ${score > 0 ? 'up' : 'down'} g${Math.abs(score)}">${compareArrowsSvg(score)}</span>` : '';
    // Rahmen und Leuchten in der Farbe der Seltenheit (rar-0 … rar-4, css/seltenheit.css)
    return `<button type="button" class="item-tile band-${band} rar-${rarityOf(item)}${item.plus >= 8 ? ' sparkle' : ''}" ${attrs}${slot ? ` data-slot="${slot}"` : ''} data-info="${escTip(itemTipHtml(item))}">` +
      `<img src="${itemIconUrl(item)}" alt="${itemFullName(item)}">` + arrow +
      // seit 14.32: Seltenheit auch ohne Farbe erkennbar – 1 bis 4 Punkte oben links (css/seltenheit.css)
      (rarityOf(item) > 0 ? `<span class="rar-pips" aria-hidden="true"></span>` : '') +
      `<span class="item-plus" style="color:${plusColor(item)}">+${item.plus}</span>` +
      // Köcher: Pfeilvorrat (seit 13.67 echte Zahl statt ∞, rot bei 0; fernninja.js bowHudTick zählt live mit)
      (isQuiver(item) && typeof bowArrowUsable === 'function' ? (() => {
        const n = bowArrowUsable(game.player);
        const i = bowArrowSort(game.player);
        return `<span class="item-ammo quiver-ammo" style="color:${i >= 0 ? ARROW_TYPES[i].color : '#ff4a3a'}" title="${i >= 0 ? ARROW_TYPES[i].name : 'Keine Pfeile'}">${n > 9999 ? Math.floor(n / 1000) + 'k' : n}</span>`;
      })() : '') +
      (label ? `<span class="slot-label">${label}</span>` : '') + `</button>`;
  },

  statsList(item, plus) {
    return sortedStats(itemStats(item, plus)).map(([k, v]) => statText(k, v)).join(' · ');
  },

  // Aufwertungsteile (seit 13.37, Taste U): Seelensplitter, Segensschriftrollen, Verstärkungen und Monsterteile
  // für den Schmied in einem eigenen Fenster, damit der Rucksack übersichtlich bleibt
  renderMats() {
    const p = game.player;
    const el = document.getElementById('matsBody');
    if (!el || !p) return;
    const fmt = (n) => (n || 0).toLocaleString('de-DE');
    const tile = (icon, name, n, tip = '') => `<div class="mat-tile${n ? '' : ' empty'}"${tip ? ` data-tip="${tip}" tabindex="0"` : ''}>` +
      `<img src="${icon}" alt=""><b>${fmt(n)}</b><span>${name}</span></div>`;
    const mobs = Object.entries(p.upmats || {}).filter(([id, n]) => n > 0 && MOB_MATS[id]);
    // seit 14.1: Gegenstände für die Ränge der Fertigkeiten (nicht für den Schmied)
    const books = totalBooks(p, true);
    const skillTiles = `<h3>Für Fertigkeiten <small>je Stufe und je Rangaufstieg ein Gegenstand</small></h3><div class="mat-tiles">` +
      tile(lootIconUrl('book'), 'Fertigkeitsbücher · E1–E10', books, 'Fertigkeitsbücher deiner Fertigkeiten in der Tasche. Für E1–E10. Aus Seelensteinen aller Stufen, beim Lehrmeister und als Belohnung.') +
      tile(materialIconUrl('rolle'), 'Schriftrollen · Für H1–H10', p.materials.rolle || 0, matDef('rolle').text) +
      tile(materialIconUrl('seelenstein'), 'Seelensteine · Für L1–V', p.materials.seelenstein || 0, matDef('seelenstein').text) +
      `</div>`;
    el.innerHTML =
      (typeof epRingTile === 'function' ? epRingTile() : '') +
      skillTiles +
      `<h3>Für den Schmied</h3><div class="mat-tiles">` +
      tile(lootIconUrl('splinter'), 'Seelensplitter', p.splinters) +
      tile(scrollIconUrl(), 'Segensschriftrollen', p.scrolls, 'Schützt beim Schmied vor dem Zerbrechen.') +
      tile(materialIconUrl('aetherkern'), 'Ätherkerne', p.materials.aetherkern || 0, matDef('aetherkern').text) +
      `</div><h3>Verstärkungen und Steine</h3><div class="mat-tiles">` +
      MATERIALS.map((m) => tile(materialIconUrl(m.id), m.name, p.materials[m.id] || 0, m.text || '')).join('') +
      `</div><h3>Teile von Monstern <small>ab +6, Ausrüstung ab Stufe 30 schon ab +4</small></h3>` +
      (mobs.length ? `<div class="mat-tiles">` + mobs.map(([id, n]) => tile(mobMatIconUrl(id), MOB_MATS[id].name, n, mobMatTip(id))).join('') + `</div>`
        : '<p class="hint-text">Noch keine Teile von Monstern. Der Schmied zeigt dir, welche er braucht und wo sie fallen.</p>');
  },

  // Inventar ------------------------------------------------------------------------
  openInventory(sellMode = false) {
    ui.closePanels();
    this.selected = null;
    this.sellArmed = false;
    this.multi = sellMode && nearTrader() ? new Set() : null;
    this.multiSup = this.multi ? new Set() : null; // seit 14.20: Tränke gleich mit verkaufen (ganzer Stapel je Sorte)
    this.multiArmed = false;
    this.renderInventory();
    document.getElementById('panelInv').hidden = false;
    // seit 14.32: beim Öffnen wieder oben anfangen (revealDetail rollt sonst bis zum nächsten Öffnen nach unten)
    const ib = document.getElementById('invBody');
    if (ib) ib.scrollTop = 0;
  },

  page: 0,
  multi: null,
  multiSup: null,
  multiArmed: false,

  renderInventory() {
    const p = game.player;
    const s = playerStats(p);
    const trader = nearTrader();
    if (this.multi && !trader) this.multi = null;
    if (this.multi && !this.multiSup) this.multiSup = new Set();
    if (!this.multi) this.multiSup = null;
    // Ausgewählter Gegenstand auf einer anderen Seite: dorthin blättern
    const layout = bagLayout(p);
    if (this.selected && this.selected.where === 'bag' && p.inventory[this.selected.key]) this.page = Math.floor(bagSlotOf(p, this.selected.key, layout) / BAG_PAGE);
    this.page = Math.max(0, Math.min(BAG_PAGES - 1, this.page));
    const equip = equipSlotsFor(p.classId).map((sl) => this.tile(p.equipment[sl.id], `data-equip="${sl.id}"`, slotLabel(sl.id, p), sl.id)).join('');
    let bag = '';
    // seit 14.20: jedes Teil liegt auf seinem eigenen Platz (bagLayout), freie Plätze sind Ablageziele (data-bagslot)
    // seit 14.84: gesperrte Seite (sozial-freischalten.js): Teile ansehen und herausnehmen, freie Plätze sind kein Ablageziel
    const locked = bagSlotLocked(this.page * BAG_PAGE);
    for (let s = this.page * BAG_PAGE; s < (this.page + 1) * BAG_PAGE; s++) {
      const i = layout[s];
      const picked = i >= 0 && this.multi && this.multi.has(i);
      bag += i >= 0 ? this.tile(p.inventory[i], `data-bag="${i}"${picked ? ' data-picked="1"' : ''}`)
        : locked ? `<span class="item-tile empty soz-platz" aria-hidden="true">${SOZIAL_SCHLOSS}</span>` : this.tile(null, `data-bagslot="${s}"`);
    }
    const tabs = Array.from({ length: BAG_PAGES }, (_, k) => {
      const used = bagPageCount(p, k, layout);
      const zu = bagSlotLocked(k * BAG_PAGE);
      return `<button type="button" class="bag-tab${k === this.page ? ' on' : ''}${zu ? ' soz-zu' : ''}" data-page="${k}"${zu ? ' title="Gesperrt – folge uns auf TikTok und Instagram"' : ''}>${['I', 'II', 'III', 'IV'][k]}${zu ? SOZIAL_SCHLOSS : ''}<small>${used}</small></button>`;
    }).join('');
    // Mehrere verkaufen: nur bei einem Händler
    let sellBar;
    if (this.multi) {
      const value = [...this.multi].reduce((n, i) => n + (p.inventory[i] ? sellValue(p.inventory[i]) : 0), 0) + this.multiSupValue();
      const picked = this.multi.size + this.multiSupCount();
      sellBar = `<div class="multi-bar"><span><b>${picked}</b> ausgewählt · <span class="price">${value.toLocaleString('de-DE')} Gold</span></span>` +
        `<button type="button" class="mini-btn" data-multi="page">Ganze Seite</button>` +
        (this.supplyList().some((x) => x.kind) ? `<button type="button" class="mini-btn" data-multi="potions">Alle Tränke</button>` : '') +
        `<button type="button" class="mini-btn" data-multi="useless">Nicht nutzbar</button>` +
        `<button type="button" class="mini-btn ${this.multiArmed ? 'danger' : 'btn-sell'}" data-multi="sell" ${picked ? '' : 'disabled'}>${this.multiArmed ? 'Wirklich verkaufen?' : 'Verkaufen'}</button>` +
        `<button type="button" class="mini-btn" data-multi="cancel">Fertig</button></div>`;
    } else {
      sellBar = `<div class="multi-bar"><button type="button" class="mini-btn" data-sort-bag title="Tasche nach Art, Seltenheit und Stufe ordnen">⇅ Sortieren</button>` +
        `<button type="button" class="mini-btn" data-multi="start" ${trader ? '' : 'disabled'}>Mehrere verkaufen</button>` +
        `<small class="hint-text">${trader ? `${trader.name} kauft deine Sachen.` : 'Verkaufen geht nur bei einem Händler im Dorf.'}</small></div>`;
    }
    document.getElementById('invBody').innerHTML =
      `<div class="inv-layout">` +
      `<section class="inv-equip"><h3>Angelegt</h3><div class="equip-doll"><canvas id="invDoll" class="doll"></canvas><div class="equip-grid">${equip}</div></div>` +
      `<p class="inv-sum">Angriff ${s.atk} · Verteidigung ${s.def}<br>Leben ${s.maxHp} · Mana ${s.maxMp}</p></section>` +
      `<section class="inv-bag${this.multi ? ' picking' : ''}"><h3>Tasche <small>${bagCapText(p)}</small><span class="bag-tabs">${tabs}</span></h3>` +
      sellBar + (locked && typeof sozialHinweisHtml === 'function' ? sozialHinweisHtml() : '') + `<div class="bag-grid">${bag}</div>` +
      // Vorräte (seit 11.0): Tränke jeder Größe und Segensschriftrollen, antippen zum Trinken oder Verkaufen
      `<h4 class="sup-head">Vorräte <small>Tränke, Segensschriftrollen, Verstärkungen und Switcher</small></h4>` +
      `<div class="sup-grid">${this.supplyList().map((x) => this.supplyTile(x, !!(this.multiSup && this.multiSup.has(x.key)))).join('') || '<small class="hint-text">Keine Tränke dabei. Die Händlerin verkauft welche.</small>'}</div>` +
      // Aufwertungsteile (seit 13.37 im eigenen Fenster, Taste U): hier nur eine Zeile mit Knopf
      `<button type="button" class="mats-open" id="btnMatsOpen"><img src="${lootIconUrl('splinter')}" alt="">` +
      `<span><b>Aufwertungsteile</b><small>Seelensplitter ${p.splinters} · Segensschriftrollen ${p.scrolls} · ${matKinds(p)} Teile-Arten` +
      // seit 14.1: Schriftrollen und Seelensteine (Gegenstand) für die Fertigkeiten
      `${p.materials.rolle || p.materials.seelenstein ? ` · Schriftrollen ${p.materials.rolle || 0} · Seelensteine ${p.materials.seelenstein || 0}` : ''}</small></span>` +
      (typeof IS_PC !== 'undefined' && IS_PC ? `<kbd>${typeof keyLabel === 'function' && typeof actionKey === 'function' ? keyLabel(actionKey('mats')) : 'U'}</kbd>` : '') + `</button>` +
      `</section>` +
      `</div><div id="invDetail" class="item-detail-wrap"></div><p id="invMsg" class="gear-msg"></p>`;
    drawDoll(document.getElementById('invDoll'));
    // Gold oben im Fensterkopf, zählt bei Änderungen kurz hoch
    const goldEl = document.getElementById('invGold');
    const shownGold = Number(goldEl.dataset.v || p.gold);
    goldEl.dataset.v = p.gold;
    if (shownGold !== p.gold) {
      const chip = goldEl.parentElement;
      chip.classList.remove('bump');
      void chip.offsetWidth;
      chip.classList.add('bump');
    }
    goldEl.textContent = p.gold.toLocaleString('de-DE');
    const body = document.getElementById('invBody');
    const mo = document.getElementById('btnMatsOpen');
    if (mo) mo.addEventListener('click', () => ui.toggle('panelMats'));
    body.querySelectorAll('[data-equip]').forEach((b) => b.addEventListener('click', () => {
      this.selected = { where: 'equip', key: b.dataset.equip };
      this.sellArmed = false;
      this.renderDetail();
      this.revealDetail();
    }));
    body.querySelectorAll('[data-bag]').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.bag);
      if (this.multi) {
        if (!p.inventory[i]) return;
        if (this.multi.has(i)) this.multi.delete(i);
        else this.multi.add(i);
        this.multiArmed = false;
        this.renderInventory();
        return;
      }
      this.selected = { where: 'bag', key: i };
      this.sellArmed = false;
      this.renderDetail();
      this.revealDetail();
    }));
    // Rechtsklick auf ein angelegtes Teil legt es ab (seit 13.20, am PC), es wandert in die Tasche
    body.querySelectorAll('[data-equip]').forEach((b) => b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const slot = b.dataset.equip;
      const item = p.equipment[slot];
      if (this.multi || !item) return;
      const before = p.inventory.length;
      unequip(slot);
      const ok = p.inventory.length > before;
      this.selected = null;
      this.renderInventory();
      const m2 = document.getElementById('invMsg');
      if (m2) {
        m2.textContent = ok ? itemName(item) + ' abgelegt – liegt jetzt in der Tasche.' : 'Kein Platz im Inventar.';
        m2.className = ok ? 'gear-msg success' : 'gear-msg warn';
      }
    }));
    // Rechtsklick legt ein Teil direkt an (seit 13.5, am PC) – ohne erst „Anlegen“ zu drücken
    body.querySelectorAll('[data-bag]').forEach((b) => b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const i = Number(b.dataset.bag);
      const item = p.inventory[i];
      if (this.multi || !item || isBook(item) || !item.slot) return;
      const ok = equipFromBag(i);
      const msgEl = document.getElementById('invMsg');
      const msg = msgEl ? msgEl.textContent : '';
      const cls = msgEl ? msgEl.className : 'gear-msg';
      this.selected = ok ? null : { where: 'bag', key: i };
      this.renderInventory();
      const m2 = document.getElementById('invMsg');
      if (m2) {
        m2.textContent = ok ? itemName(item) + ' angelegt.' : msg;
        m2.className = ok ? 'gear-msg success' : cls;
      }
    }));
    body.querySelectorAll('[data-sup]').forEach((b) => b.addEventListener('click', () => {
      if (this.multi) {
        // seit 14.20: Tränke lassen sich mit auswählen (ganzer Stapel), Segensschriftrollen und Pfeile nicht
        const x = this.supplyList().find((s) => s.key === b.dataset.sup);
        if (!x || !x.kind) return;
        if (this.multiSup.has(x.key)) this.multiSup.delete(x.key); else this.multiSup.add(x.key);
        this.multiArmed = false;
        this.renderInventory();
        return;
      }
      this.selected = { where: 'sup', key: b.dataset.sup };
      this.sellArmed = false;
      this.renderDetail();
      this.revealDetail();
    }));
    body.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => {
      this.page = Number(b.dataset.page);
      this.selected = null;
      this.renderInventory();
    }));
    body.querySelectorAll('[data-multi]').forEach((b) => b.addEventListener('click', () => this.multiAction(b.dataset.multi)));
    if (locked && typeof sozialVerdrahten === 'function') sozialVerdrahten(body);
    const sortBtn = body.querySelector('[data-sort-bag]');
    if (sortBtn) sortBtn.addEventListener('click', () => {
      const changed = sortInventory(p);
      this.selected = null;
      this.page = 0;
      if (changed && typeof saveGame === 'function') saveGame();
      this.renderInventory();
      const msg = document.getElementById('invMsg');
      if (msg) msg.textContent = changed ? 'Tasche sortiert.' : 'Die Tasche ist schon sortiert.';
    });
    this.bindDrag(body);
    if (this.multi) {
      document.getElementById('invDetail').innerHTML = '<p class="hint-text">Tippe alles an, was du verkaufen willst – auch Tränke unter „Vorräte“ (immer der ganze Stapel). Mit den Reitern I–IV blätterst du durch alle Seiten der Tasche. „Nicht nutzbar“ wählt Ausrüstung anderer Klassen und Fertigkeitsbücher, die nicht zu deinen Fertigkeiten gehören.</p>';
      return;
    }
    this.renderDetail();
  },

  // seit 14.32: Das Detail mit den Knöpfen (Anlegen, Verkaufen …) steht unter der Tasche. Im Querformat am Handy
  // und bei 1280×720 lag es nach dem Antippen außerhalb des Fensters – jetzt rollt das Fenster bei Bedarf dorthin.
  revealDetail() {
    const el = document.getElementById('invDetail');
    if (!el || !el.firstElementChild) return;
    const box = el.closest('.panel-body') || el.closest('.panel');
    if (!box) return;
    const r = el.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const bottom = Math.min(b.bottom, window.innerHeight);
    if (r.bottom <= bottom + 1 && r.top >= b.top) return;
    try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(false); }
  },

  // Ziehen und Ablegen (seit 14.14): Teile in der Tasche verschieben (auf ein Teil = tauschen, auf einen freien
  // Platz = genau dorthin (seit 14.20), auf einen Reiter I–IV = auf diese Seite), aus der Tasche auf die Puppe ziehen =
  // anlegen, von der Puppe in die Tasche = ablegen. Maus: einfach ziehen. Handy: kurz gedrückt halten, dann ziehen.
  dnd: null,
  dndBlockClick: false,
  bindDrag(body) {
    if (!body || body.dataset.dnd) return;
    body.dataset.dnd = '1';
    const srcOf = (el) => {
      const p = game.player;
      if (!el || this.multi || !p) return null;
      if (el.dataset.bag != null) { const i = Number(el.dataset.bag); return p.inventory[i] ? { where: 'bag', key: i } : null; }
      if (el.dataset.equip != null) return p.equipment[el.dataset.equip] ? { where: 'equip', key: el.dataset.equip } : null;
      return null;
    };
    const targetAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const t = el && el.closest && el.closest('#invBody [data-bag], #invBody [data-bagslot], #invBody [data-equip], #invBody [data-page]');
      return t || null;
    };
    const start = (d) => {
      d.active = true;
      const img = d.el.querySelector('img:not(.ghost)');
      const g = document.createElement('div');
      g.className = 'dnd-ghost';
      if (img) g.append(img.cloneNode());
      document.body.append(g);
      d.ghost = g;
      d.el.classList.add('dnd-src');
      document.body.classList.add('dnd-on');
      if (d.touch && navigator.vibrate) try { navigator.vibrate(12); } catch (e) { /* egal */ }
      move(d, d.x, d.y);
    };
    const move = (d, x, y) => {
      d.x = x; d.y = y;
      if (!d.active) return;
      d.ghost.style.transform = `translate(${x - 28}px, ${y - 28}px)`;
      // seit 14.32: Hinweisfeld vom langen Halten (Handy) nicht über die Ablageziele mitschleppen
      if (typeof hideTip === 'function' && tipBox.target && Math.hypot(x - d.x0, y - d.y0) > 10) hideTip();
      const t = targetAt(x, y);
      if (t !== d.over) {
        if (d.over) d.over.classList.remove('dnd-over');
        d.over = t;
        if (t) t.classList.add('dnd-over');
        clearTimeout(d.pageTimer);
        // über einem Reiter kurz verweilen blättert um
        if (t && t.dataset.page != null && Number(t.dataset.page) !== this.page) {
          d.pageTimer = setTimeout(() => {
            if (this.dnd !== d) return;
            this.page = Number(t.dataset.page);
            this.selected = null;
            this.renderInventory();
            const src = document.querySelector(d.src.where === 'bag' ? `#invBody [data-bag="${d.src.key}"]` : `#invBody [data-equip="${d.src.key}"]`);
            if (src) src.classList.add('dnd-src');
            d.over = null;
          }, 380);
        }
      }
    };
    const stop = (d, drop) => {
      clearTimeout(d.timer);
      clearTimeout(d.pageTimer);
      if (this.dnd === d) this.dnd = null;
      if (!d.active) return;
      if (d.ghost) d.ghost.remove();
      document.body.classList.remove('dnd-on');
      document.querySelectorAll('#invBody .dnd-src, #invBody .dnd-over').forEach((e) => e.classList.remove('dnd-src', 'dnd-over'));
      // den Klick, der nach dem Loslassen kommt, schlucken
      this.dndBlockClick = true;
      setTimeout(() => { this.dndBlockClick = false; }, 60);
      if (drop) {
        const t = targetAt(d.x, d.y);
        if (t) this.dropItem(d.src, t.dataset.bag != null ? { where: 'bag', key: Number(t.dataset.bag) }
          : t.dataset.bagslot != null ? { where: 'slot', key: Number(t.dataset.bagslot) }
            : t.dataset.equip != null ? { where: 'equip', key: t.dataset.equip } : { where: 'page', key: Number(t.dataset.page) });
      }
    };
    body.addEventListener('click', (e) => { if (this.dndBlockClick) { e.stopPropagation(); e.preventDefault(); } }, true);
    body.addEventListener('dragstart', (e) => e.preventDefault());
    // Maus
    body.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const el = e.target.closest('[data-bag], [data-equip]');
      const src = srcOf(el);
      if (!src) return;
      e.preventDefault();
      const d = { el, src, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, active: false };
      this.dnd = d;
      const mm = (ev) => {
        if (!d.active && Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) > 6) start(d);
        move(d, ev.clientX, ev.clientY);
      };
      const mu = () => {
        document.removeEventListener('mousemove', mm);
        document.removeEventListener('mouseup', mu);
        stop(d, true);
      };
      document.addEventListener('mousemove', mm);
      document.addEventListener('mouseup', mu);
    });
    // Finger: gedrückt halten startet das Ziehen, vorher scrollt das Fenster wie gewohnt
    body.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const el = e.target.closest('[data-bag], [data-equip]');
      const src = srcOf(el);
      if (!src) return;
      const t0 = e.touches[0];
      const d = { el, src, x: t0.clientX, y: t0.clientY, x0: t0.clientX, y0: t0.clientY, active: false, touch: true };
      if (this.dnd) stop(this.dnd, false);
      this.dnd = d;
      d.timer = setTimeout(() => { if (this.dnd === d) start(d); }, 260);
      const tm = (ev) => {
        const t = ev.touches[0];
        if (!t) return;
        if (!d.active) {
          if (Math.hypot(t.clientX - d.x0, t.clientY - d.y0) > 10) { clearTimeout(d.timer); end(); stop(d, false); }
          return;
        }
        ev.preventDefault();
        move(d, t.clientX, t.clientY);
      };
      const end = () => {
        document.removeEventListener('touchmove', tm);
        document.removeEventListener('touchend', te);
        document.removeEventListener('touchcancel', tc);
      };
      const te = (ev) => { end(); if (d.active) ev.preventDefault(); stop(d, true); };
      const tc = () => { end(); stop(d, false); };
      document.addEventListener('touchmove', tm, { passive: false });
      document.addEventListener('touchend', te, { passive: false });
      document.addEventListener('touchcancel', tc);
    }, { passive: true });
    // langes Drücken am Handy öffnet sonst das Kontextmenü (= Anlegen): während des Ziehens nicht
    body.addEventListener('contextmenu', (e) => { if (this.dnd && this.dnd.touch) { e.preventDefault(); e.stopPropagation(); } }, true);
  },

  // seit 14.20: Ziel ist ein Platz im Raster. Freier Platz = das Teil liegt jetzt genau dort, anderes Teil = die
  // beiden tauschen die Plätze, Reiter = erster freier Platz dieser Seite. Die Liste p.inventory ändert sich dabei nicht.
  dropItem(src, dst) {
    const p = game.player;
    const inv = p.inventory;
    let text = '';
    let cls = 'success';
    const layout = bagLayout(p);
    // Platz im Raster, auf den gezogen wurde (-1 = keiner frei)
    const slotFor = (d) => {
      if (d.where === 'slot') return d.key;
      if (d.where === 'bag') return bagSlotOf(p, d.key, layout);
      if (d.where === 'page') {
        for (let s = d.key * BAG_PAGE; s < (d.key + 1) * BAG_PAGE; s++) if (layout[s] < 0) return s;
        return -1;
      }
      return -1;
    };
    if (src.where === 'bag') {
      const a = src.key;
      const item = inv[a];
      if (!item) return;
      if (dst.where === 'bag' || dst.where === 'slot' || dst.where === 'page') {
        const from = bagSlotOf(p, a, layout);
        const to = slotFor(dst);
        // seit 14.84: auf gesperrte Seiten nichts legen, und ein Tausch darf nichts von Seite I/II dorthin schieben
        const pageLocked = dst.where === 'page' && bagSlotLocked(dst.key * BAG_PAGE);
        if (pageLocked || (to >= 0 && to !== from && (bagSlotLocked(to) || (bagSlotLocked(from) && layout[to] >= 0)))) {
          text = pageLocked || bagSlotLocked(to) ? 'Seite III und IV sind noch gesperrt – von dort kannst du nur herausnehmen.'
            : 'Zieh es auf einen freien Platz auf Seite I oder II.';
          cls = 'warn';
        } else if (to < 0) { text = 'Auf dieser Seite ist kein Platz frei.'; cls = 'warn'; }
        else if (to !== from) {
          const other = layout[to] >= 0 ? inv[layout[to]] : null;
          item.bagPos = to;
          if (other) other.bagPos = from;
        }
        if (dst.where === 'page' && to >= 0 && cls !== 'warn') this.page = dst.key;
      } else if (dst.where === 'equip') {
        if (isBook(item) || !item.slot) { text = 'Das lässt sich nicht anlegen.'; cls = 'warn'; }
        else {
          const hand = dst.key === 'schild' && !isQuiver(item) && item.slot === 'waffe' ? 'off' : undefined;
          const ok = equipFromBag(a, hand); // ein getauschtes Teil übernimmt dort den Platz
          const msgEl = document.getElementById('invMsg');
          text = ok ? itemName(item) + ' angelegt.' : (msgEl ? msgEl.textContent : '');
          cls = ok ? 'success' : 'warn';
        }
      }
    } else if (src.where === 'equip') {
      const item = p.equipment[src.key];
      if (!item || dst.where === 'equip') return;
      let to = slotFor(dst);
      if (to >= 0 && bagSlotLocked(to)) to = -1; // seit 14.84: dann auf den ersten freien Platz von Seite I/II
      const before = inv.length;
      unequip(src.key);
      if (inv.length > before) {
        // auf den Platz legen, auf den es gezogen wurde; liegt dort schon etwas, rückt das auf einen freien Platz
        if (to >= 0) {
          if (layout[to] >= 0 && inv[layout[to]]) delete inv[layout[to]].bagPos;
          item.bagPos = to;
          if (dst.where === 'page') this.page = dst.key;
        }
        text = itemName(item) + ' abgelegt – liegt jetzt in der Tasche.';
      } else { text = 'Kein Platz im Inventar.'; cls = 'warn'; }
    }
    this.selected = null;
    if (typeof saveGame === 'function') saveGame();
    this.renderInventory();
    if (text) {
      const m2 = document.getElementById('invMsg');
      if (m2) { m2.textContent = text; m2.className = 'gear-msg ' + cls; }
    }
  },

  multiAction(act) {
    const p = game.player;
    if (act === 'start') {
      if (!nearTrader()) return;
      this.multi = new Set();
      this.multiSup = new Set();
    } else if (act === 'cancel') {
      this.multi = null;
      this.multiSup = null;
    } else if (act === 'potions') {
      const keys = this.supplyList().filter((x) => x.kind).map((x) => x.key);
      const all = keys.every((k) => this.multiSup.has(k));
      keys.forEach((k) => (all ? this.multiSup.delete(k) : this.multiSup.add(k)));
    } else if (act === 'page') {
      const lay = bagLayout(p);
      const ids = lay.slice(this.page * BAG_PAGE, (this.page + 1) * BAG_PAGE).filter((i) => i >= 0);
      const all = ids.every((i) => this.multi.has(i));
      ids.forEach((i) => (all ? this.multi.delete(i) : this.multi.add(i)));
    } else if (act === 'useless') {
      p.inventory.forEach((it, i) => {
        if (isBook(it) ? !ownBook(p, it.book) : !canWear(it, p)) this.multi.add(i);
      });
    } else if (act === 'sell') {
      if (!this.multiArmed) {
        this.multiArmed = true;
        this.renderInventory();
        return;
      }
      const ids = [...this.multi].sort((a, b) => b - a);
      let gold = 0;
      let count = 0;
      for (const i of ids) {
        const it = p.inventory[i];
        if (!it) continue;
        gold += sellValue(it);
        count++;
        p.inventory.splice(i, 1);
      }
      p.gold += gold;
      // Tränke (ganze Stapel) gleich mit
      let pots = 0;
      for (const x of this.supplyList().filter((s) => s.kind && this.multiSup && this.multiSup.has(s.key))) {
        const n = sellPotions(x.key, x.n);
        pots += n;
        gold += n * potionSellValue(x.kind, x.sz);
      }
      this.multi = new Set();
      this.multiSup = new Set();
      this.selected = null;
      saveGame();
      this.multiArmed = false;
      this.renderInventory();
      const what = [count ? `${count} ${count === 1 ? 'Sache' : 'Sachen'}` : '', pots ? `${pots} ${pots === 1 ? 'Trank' : 'Tränke'}` : ''].filter(Boolean).join(' und ');
      this.message(`${what} für ${gold.toLocaleString('de-DE')} Gold verkauft.`, 'success');
      return;
    }
    this.multiArmed = false;
    this.renderInventory();
  },

  // Mehrfachverkauf (seit 14.20): ausgewählte Trankstapel zählen mit (immer der ganze Stapel einer Sorte)
  multiSupValue() {
    if (!this.multiSup) return 0;
    return this.supplyList().filter((x) => x.kind && this.multiSup.has(x.key)).reduce((n, x) => n + potionSellValue(x.kind, x.sz) * x.n, 0);
  },
  multiSupCount() {
    if (!this.multiSup) return 0;
    return this.supplyList().filter((x) => x.kind && this.multiSup.has(x.key)).reduce((n, x) => n + x.n, 0);
  },

  // Vorräte: Tränke (je Sorte und Größe) und Segensschriftrollen
  supplyList() {
    const p = game.player;
    const out = [];
    for (const kind of ['hp', 'mp']) {
      for (const sz of POTION_SIZES) {
        const n = p.potions[potKey(kind, sz.id)] || 0;
        if (n > 0) out.push({ key: potKey(kind, sz.id), n, kind, sz });
      }
    }
    if (p.scrolls > 0) out.push({ key: 'scroll', n: p.scrolls });
    // seit 14.51: Verstärkungen, Switcher und Sternensteine (Schmied) mit in den Vorräten
    for (const m of MATERIALS) {
      const n = (p.materials && p.materials[m.id]) || 0;
      if (n > 0) out.push({ key: 'mat:' + m.id, n, mat: m });
    }
    // Pfeile (seit 13.57, fernninja.js)
    if (typeof bowArrowSupplies === 'function') out.push(...bowArrowSupplies(p));
    return out;
  },

  supplyTile(x, picked) {
    if (x.arrow != null) return bowArrowTile(x);
    const icon = x.mat ? materialIconHiUrl(x.mat.id) : x.kind ? potionIconUrl(x.kind, x.sz.id) : scrollIconUrl();
    const name = x.mat ? x.mat.name : x.kind ? `${potionInfo(x.kind).name} ${x.sz.id}` : BLESSING.name;
    return `<button type="button" class="item-tile sup-tile" data-sup="${x.key}"${picked ? ' data-picked="1"' : ''} data-info="${escTip(supplyTipHtml(x))}">` +
      `<img src="${icon}" alt="${name}"><span class="item-count">${x.n > 999 ? '999+' : x.n}</span></button>`;
  },

  renderSupplyDetail(el) {
    const p = game.player;
    const x = this.supplyList().find((s) => s.key === this.selected.key);
    if (!x) {
      this.selected = null;
      el.innerHTML = '<p class="hint-text">Tippe einen Gegenstand an, um ihn anzusehen, anzulegen oder zu verkaufen.</p>';
      return;
    }
    const tileEl = document.querySelector(`#invBody [data-sup="${x.key}"]`);
    if (tileEl) tileEl.classList.add('selected');
    if (x.arrow != null) return bowArrowDetail(el, x);
    if (x.mat) {
      el.innerHTML = `<div class="item-detail"><img src="${materialIconHiUrl(x.mat.id)}" alt="">` +
        `<div class="item-info"><strong style="color:${MATERIAL_COLORS[x.mat.id] || '#ffd34d'}">${x.mat.name} × ${x.n}</strong>` +
        `<small>${x.mat.tag} · für den Schmied · nicht verkäuflich</small><span>${x.mat.text}</span>` +
        `<small class="hint-text">Beim Schmied wählst du das Teil aus und setzt es auf einen Gegenstand.</small></div></div>`;
      return;
    }
    if (!x.kind) {
      el.innerHTML = `<div class="item-detail"><img src="${scrollIconUrl()}" alt="">` +
        `<div class="item-info"><strong style="color:#ffd34d">${BLESSING.name} × ${x.n}</strong>` +
        `<small>Für den Schmied · nicht verkäuflich</small><span>${BLESSING.text}</span>` +
        `<small class="hint-text">Fällt nur aus Seelensteinen ab Stufe ${BLESSING.stone}. Beim Schmied setzt du sie mit einem Haken ein.</small></div></div>`;
      return;
    }
    const info = potionInfo(x.kind);
    const amt = x.kind === 'hp' ? x.sz.hp : x.sz.mp;
    const each = potionSellValue(x.kind, x.sz);
    const trader = nearTrader();
    const off = trader ? '' : 'disabled title="Nur bei einem Händler"';
    const sell = (n, label) => `<button type="button" class="mini-btn btn-sell" data-psell="${n}" ${off}>${label} · ${(each * n).toLocaleString('de-DE')} Gold</button>`;
    el.innerHTML = `<div class="item-detail"><img src="${potionIconUrl(x.kind, x.sz.id)}" alt="">` +
      `<div class="item-info"><strong style="color:${info.color}">${info.name} ${x.sz.id} × ${x.n}</strong>` +
      `<small>${info.kind} (${x.sz.name}) · Taste ${x.kind === 'hp' ? 'Q' : 'E'} trinkt automatisch die passende Größe</small>` +
      `<span>+${amt.toLocaleString('de-DE')} ${x.kind === 'hp' ? 'Leben' : 'Mana'} · Händlerin zahlt ${each.toLocaleString('de-DE')} Gold je Trank</span>` +
      (trader ? '' : '<small class="hint-text">Verkaufen geht nur bei einem Händler.</small>') + `</div>` +
      `<div class="item-actions"><button type="button" class="mini-btn" data-pdrink>Jetzt trinken</button>` +
      sell(1, '1 verkaufen') + (x.n >= 10 ? sell(10, '10 verkaufen') : '') + (x.n > 1 ? sell(x.n, 'Alle verkaufen') : '') + `</div></div>`;
    el.querySelector('[data-pdrink]').addEventListener('click', () => {
      usePotion(x.kind, x.sz.id);
      this.renderInventory();
    });
    el.querySelectorAll('[data-psell]').forEach((b) => b.addEventListener('click', () => {
      // seit 14.32: „10 verkaufen“ und „Alle verkaufen“ erst nach einem zweiten Druck
      if (Number(b.dataset.psell) > 1 && !armConfirm(b)) return;
      const n = sellPotions(x.key, Number(b.dataset.psell));
      this.renderInventory();
      if (n) this.message(`${n} × ${info.name} ${x.sz.id} für ${(n * each).toLocaleString('de-DE')} Gold verkauft.`, 'success');
    }));
  },

  renderBookDetail(el, item) {
    const p = game.player;
    const e = skillEntry(item.book);
    const own = ownBook(p, item.book);
    const idx = classSkills(p).findIndex((sk) => sk.id === item.book);
    // seit 14.1: Bücher tragen nur E1–E10 (Lesen nur, solange die Fertigkeit in E steht)
    const read = idx >= 0 ? skillActions(p, idx).find((a) => a.type === 'book' && a.item === 'book') : null;
    const lvl = idx >= 0 ? p.skillLevels[idx] : 0;
    const trader = nearTrader();
    const owner = `${CLASSES[e.cls].name} · ${CLASSES[e.cls].paths[e.path].name}`;
    const info = own
      ? (read ? `Gehört zu deiner Fertigkeit, die auf ${skillLevelText(lvl)} steht. Ein Buch hebt sie um eine Stufe (bis E10).`
        : idx >= 0 && skillRank(lvl) > 0 ? `Deine Fertigkeit steht schon auf ${skillLevelText(lvl)}. Bücher gelten nur für E1–E10 – weiter geht es mit Schriftrollen (H) und Seelensteinen (L, V). Verkaufe es oder lege es fürs Zurücksetzen ins Lager.`
          : idx >= 0 && skillRank(lvl) === 0 ? `Deine Fertigkeit steht auf ${skillLevelText(lvl)}, höher geht es mit Büchern nicht – der Aufstieg nach Heroisch kostet eine Schriftrolle.`
            : `Gehört zu deiner Fertigkeit. Lesen kannst du es, sobald die Fertigkeit erweckt ist (ab E1), dann hebt jedes Buch sie um eine Stufe bis E10.`)
      : 'Gehört nicht zu deinen Fertigkeiten. Verkaufe es beim Händler oder handle es.';
    el.innerHTML = `<div class="item-detail"><img src="${bookIconUrl(item.book)}" alt="">` +
      `<div class="item-info"><strong style="color:${own ? '#ffd34d' : '#c58cff'}">Fertigkeitsbuch: ${e.sk.name} × ${item.count}</strong>` +
      `<small>Fertigkeitsbuch · ${owner}</small><span>${info}</span></div>` +
      `<div class="item-actions">` +
      (read ? `<button type="button" class="mini-btn" data-act="read" ${read.ok ? '' : 'disabled'}>Lesen</button>` : '') +
      `<button type="button" class="mini-btn ${this.sellArmed ? 'danger' : ''}" data-act="sell" ${trader ? '' : 'disabled title="Nur bei einem Händler"'}>${this.sellArmed ? 'Wirklich verkaufen?' : 'Verkaufen (' + sellValue(item).toLocaleString('de-DE') + ' Gold)'}</button>` +
      `</div></div>`;
    el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.act === 'read') upgradeSkill(idx, 'book');
      if (b.dataset.act === 'sell') {
        if (!this.sellArmed) {
          this.sellArmed = true;
          this.renderDetail();
          return;
        }
        sellFromBag(this.selected.key);
      }
      this.selected = itemAt(this.selected) ? this.selected : null;
      this.renderInventory();
    }));
  },

  renderDetail() {
    const el = document.getElementById('invDetail');
    if (!el) return;
    document.querySelectorAll('#invBody .item-tile').forEach((b) => b.classList.remove('selected'));
    if (this.selected && this.selected.where === 'sup') {
      this.renderSupplyDetail(el);
      return;
    }
    const item = itemAt(this.selected);
    if (!item) {
      el.innerHTML = '<p class="hint-text">Tippe einen Gegenstand an, um ihn anzusehen, anzulegen oder zu verkaufen.</p>';
      return;
    }
    const sel = this.selected.where === 'equip' ? `[data-equip="${this.selected.key}"]` : `[data-bag="${this.selected.key}"]`;
    const tileEl = document.querySelector('#invBody ' + sel);
    if (tileEl) tileEl.classList.add('selected');
    const p = game.player;
    if (isBook(item)) {
      this.renderBookDetail(el, item);
      return;
    }
    const trader = nearTrader();
    const need = ITEM_TIERS[item.tier].level;
    const inOff = this.selected.where === 'equip' && this.selected.key === 'schild' && isOffhand(item);
    const slotName = inOff ? 'Nebenhand' : slotNameOf(item.slot);
    const blocked = p.level < need || !canWear(item, p);
    const offOk = this.selected.where === 'bag' && offhandAllows(p, item);
    // Beidhändigkeit gelernt, aber auf dem anderen Weg (seit 13.85): Knopf bleibt, ein Druck erklärt es
    const offIdle = this.selected.where === 'bag' && !offOk && item.slot === 'waffe' && DUAL_WIELD.kinds.includes(item.kind) && dualWieldIdle(p);
    const actions = this.selected.where === 'equip'
      ? `<button type="button" class="mini-btn" data-act="unequip">Ablegen</button>`
      : `<button type="button" class="mini-btn" data-act="${offOk ? 'equipMain' : 'equip'}" ${blocked ? 'disabled' : ''}>${offOk ? 'Haupthand' : 'Anlegen'}</button>` +
        (offIdle ? `<button type="button" class="mini-btn" data-act="equipOff">Nebenhand</button>` : '') +
        (offOk ? `<button type="button" class="mini-btn" data-act="equipOff" ${blocked ? 'disabled' : ''}>Nebenhand</button>` : '') +
        `<button type="button" class="mini-btn ${this.sellArmed ? 'danger' : ''}" data-act="sell" ${trader ? '' : 'disabled title="Nur bei einem Händler"'}>${this.sellArmed ? 'Wirklich verkaufen?' : 'Verkaufen (' + sellValue(item).toLocaleString('de-DE') + ' Gold)'}</button>`;
    const bonuses = (item.bonuses || []).map((b, i) => `<li><span class="bn">${i + 1}</span>${bonusText(b)}</li>`).join('') +
      (item.specials || []).map((b, i) => `<li class="special"><span class="bn">${6 + i}</span>${bonusText(b, true)}</li>`).join('');
    const can = {
      boniPlus: (item.bonuses || []).length < 4,
      boni5: (item.bonuses || []).length === 4,
      switcher: (item.bonuses || []).length > 0,
      star: (item.specials || []).length < MAX_SPECIAL_BONUS,
      switch67: (item.specials || []).length > 0
    };
    const matBtns = MATERIALS.map((m) => {
      const have = p.materials[m.id] || 0;
      // seit 14.20: was jetzt auf diesen Gegenstand passt, leuchtet golden
      return `<button type="button" class="mat-btn${have && can[m.id] ? ' can' : ''}" data-mat="${m.id}" title="${m.name}: ${m.text}" ${have && can[m.id] ? '' : 'disabled'}>` +
        `<img src="${materialIconUrl(m.id)}" alt=""><span>${m.tag}</span><b>${have}</b></button>`;
    }).join('');
    el.innerHTML = `<div class="item-detail rar-${rarityOf(item)}"><img src="${itemIconUrl(item)}" alt="">` +
      `<div class="item-info"><strong style="color:${itemColor(item)}">${itemFullName(item)}</strong>` + rarityLineHtml(item) +
      `<small>${slotName} · ${itemKindText(item)} · ${reqLevelHtml(item, p)}</small>` +
      (canWear(item, p) ? '' : `<small class="need">${wearProblem(item, p)} Du kannst es verkaufen.</small>`) +
      (inOff ? `<small class="hint-text">Nebenhand: ${Math.round(offhandRules(p).atk * 100)} % des Angriffs, +${Math.round(offhandRules(p).atkSpeed * 100)} % Angriffstempo, Boni zur Hälfte, kein Blocken.</small>` : '') +
      (offIdle ? `<small class="need">${offhandProblem(p, item)}</small>` : '') +
      `<span>${this.statsList(item)}</span>` +
      (bonuses ? `<ul class="bonus-list">${bonuses}</ul>` : '') + bonusHintHtml(item, p) + setInfoHtml(item, p) +
      (this.selected.where === 'bag' ? compareHtml(item) + (offOk ? compareHtml(item, 'In der Nebenhand', 'off') : '') : '') +
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
      if (act === 'equipMain') equipFromBag(this.selected.key, 'main');
      if (act === 'equipOff') equipFromBag(this.selected.key, 'off');
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
    const lists = m.slots.filter((slot) => (slot !== 'schild' || p.classId === 'krieger') && (slot !== 'koecher' || p.classId === 'ninja'))
      .flatMap((slot) => (slot === 'waffe' ? CLASS_WEAPON_KINDS[p.classId].filter((kind) => merchantKindOk(m, kind) && canWear(makeItem('waffe', 0, 0, p.classId, kind), p)).map((kind) => ({ slot, kind })) : [{ slot }]));
    const groups = lists.map(({ slot, kind }) => {
      const slotName = slotNameOf(slot);
      const wk = WEAPON_KINDS[kind] || { name: 'Waffe', text: '' };
      const title = kind ? `${wk.name} für ${CLASSES[p.classId].name} <small>${wk.text}</small>`
        : slot === 'koecher' ? `Köcher für den Bogen <small>bessere Köcher treffen härter; geschossen wird nur mit gekauften Pfeilen</small>`
        : CLASS_SLOTS.includes(slot) ? `${slotName} für ${CLASSES[p.classId].name}` : slotName;
      const equipped = slot === 'koecher' ? (isQuiver(p.equipment.schild) ? p.equipment.schild : null) : p.equipment[slot];
      const eqStats = equipped ? itemStats(equipped) : {};
      const rows = m.prices.map((p0, tier) => {
        if (tier < MERCHANT_MIN_TIER) return '';
        const price = merchantPrice(this.merchant, slot, tier);
        const item = makeItem(slot, tier, 0, p.classId, kind);
        item.rarity = merchantRarity(tier); // seit 13.56: grau, das teuerste Teil grün
        const need = ITEM_TIERS[tier].level;
        const tooLow = p.level < need;
        // Grün: besser als das, was gerade angelegt ist; rot: schlechter
        const stats = sortedStats(itemStats(item)).map(([k, v]) => {
          const num = (x) => (Array.isArray(x) ? x[0] + x[1] : x || 0);
          const cur = num(eqStats[k]);
          const cls = num(v) > cur + 1e-9 ? 'up' : num(v) < cur - 1e-9 ? 'down' : '';
          return `<span class="${cls}">${statText(k, v)}</span>`;
        }).join(' · ');
        return `<div class="merchant-item${tooLow ? ' locked' : ''}">` +
          `<img class="mi-rar rar-${item.rarity}" src="${itemIconUrl(item)}" alt="">` +
          `<div class="mi-info"><strong style="color:${itemColor(item)}">${itemName(item)}</strong>` +
          `<small class="${tooLow ? 'need' : ''}">ab Stufe ${need} · ${ITEM_TIERS[tier].label}</small>` +
          (item.rarity ? `<small class="rar-line"><b style="color:${itemColor(item)}">${RARITIES[item.rarity].name}</b> · ${RARITIES[item.rarity].bonus.join('–')} zufällige Boni</small>` : '') +
          `<span class="mi-stats">${stats}</span>${tooLow ? '' : compareHtml(item, 'Gegenüber jetzt')}</div>` +
          `<div class="mi-buy"><span class="price">${price.toLocaleString('de-DE')} Gold</span>` +
          `<button type="button" class="mini-btn" data-buy-gear="${slot}:${tier}:${kind || ''}" ${p.gold < price ? 'disabled' : ''}>Kaufen</button>` +
          (tooLow ? '' : `<button type="button" class="mini-btn primary" data-buy-equip="${slot}:${tier}:${kind || ''}" ${p.gold < price ? 'disabled' : ''}>Kaufen &amp; anlegen</button>`) +
          `</div></div>`;
      }).join('');
      return `<section class="merchant-group"><h3>${title} <small>· angelegt: ${equipped ? itemFullName(equipped) : 'nichts'}</small></h3><div class="merchant-list">${rows}</div></section>`;
    }).join('');
    // seit 13.5 breit: Listen nebeneinander, Gold und Verkaufen oben – kaum noch scrollen
    const panel = body.closest('.panel');
    if (panel) panel.classList.add('npc-wide');
    const msg = keepMsg ? document.getElementById('merchantMsg') : null;
    const text = msg ? msg.textContent : '';
    const cls = msg ? msg.className : 'gear-msg';
    body.innerHTML = `<div class="merchant-top"><p class="merchant-greet">„${m.greeting}“</p>` +
      `<div class="merchant-gold"><span>Dein Gold</span><b>${p.gold.toLocaleString('de-DE')}</b></div>` +
      `<div class="merchant-sell"><button type="button" class="btn btn-primary" data-open-sell>Tasche öffnen und verkaufen</button><small>Tasche ${bagCapText(p)}</small></div></div>` +
      `<p id="merchantMsg" class="${cls}">${text}</p>` + (this.merchant === 'waffen' ? this.dualWieldHtml() : '') + `<div class="merchant-groups">${groups}` +
      // Bogenmacherin (seit 13.57): Pfeile je Sorte (fernninja.js)
      (m.arrows && typeof bowArrowShopHtml === 'function' ? bowArrowShopHtml() : '') + `</div>`;
    this.wireSell(body, () => this.renderMerchant(body, true));
    if (m.arrows && typeof bowArrowShopWire === 'function') bowArrowShopWire(body, () => this.renderMerchant(body, true));
    const learn = body.querySelector('[data-learn-dual]');
    if (learn) learn.addEventListener('click', () => this.learnDualWield());
    const learnT = body.querySelector('[data-learn-titan]');
    if (learnT) learnT.addEventListener('click', () => this.learnTitanGrip());
    body.querySelectorAll('[data-buy-gear]').forEach((b) => b.addEventListener('click', () => {
      const [slot, tier, kind] = b.dataset.buyGear.split(':');
      this.buyGear(slot, Number(tier), false, kind);
    }));
    body.querySelectorAll('[data-buy-equip]').forEach((b) => b.addEventListener('click', () => {
      const [slot, tier, kind] = b.dataset.buyEquip.split(':');
      this.buyGear(slot, Number(tier), true, kind);
    }));
  },

  // Titanengriff (seit 13.49): Krieger des Leibes, ab Stufe 20, einmalig gegen Gold
  titanGripHtml() {
    const p = game.player;
    const path = CLASSES.krieger.paths[TITAN_GRIP.path].name;
    const info = `Du führst eine Zweihandwaffe mit einer Hand – und eine zweite gleiche in der anderen (zwei Streitäxte oder zwei Zweihänder): ` +
      `+${Math.round(TITAN_GRIP.atk * 100)} % ihres Angriffs, +${Math.round(TITAN_GRIP.atkSpeed * 100)} % Angriffstempo, ihre Boni zur Hälfte. Kein Schild.`;
    let state;
    if (p.titanGrip) state = canTitanGrip(p) ? '<b class="up">Gelernt.</b> Lege eine zweite Streitaxt (oder einen zweiten Zweihänder) im Inventar mit „Nebenhand“ an.' : `<b>Gelernt</b>, wirkt aber nur auf dem ${path}.`;
    else if ((p.path || 0) !== TITAN_GRIP.path) state = `<span class="need">Nur für den ${path}.</span>`;
    else if (p.level < TITAN_GRIP.level) state = `<span class="need">Ab Stufe ${TITAN_GRIP.level}.</span>`;
    else state = `<button type="button" class="mini-btn primary" data-learn-titan ${p.gold < TITAN_GRIP.price ? 'disabled' : ''}>Lernen für ${TITAN_GRIP.price.toLocaleString('de-DE')} Gold</button>`;
    // Beidhändigkeit vom Weg der Klinge mitgebracht (seit 13.85): sagen, dass sie hier ruht
    const dual = dualWieldIdle(p) ? `<p><b>Beidhändigkeit gelernt</b>, wirkt aber nur auf dem ${CLASSES.krieger.paths[DUAL_WIELD.path].name}. Auf dem ${path} passt keine zweite Einhandwaffe in die Nebenhand.</p>` : '';
    return `<div class="learn-box"><h3>Titanengriff <small>· ${path} · ab Stufe ${TITAN_GRIP.level}</small></h3><p>${info}</p><p>${state}</p>${dual}</div>`;
  },

  learnTitanGrip() {
    const p = game.player;
    if (p.titanGrip || p.classId !== 'krieger' || (p.path || 0) !== TITAN_GRIP.path || p.level < TITAN_GRIP.level) return;
    if (p.gold < TITAN_GRIP.price) {
      this.message(`Dir fehlen ${(TITAN_GRIP.price - p.gold).toLocaleString('de-DE')} Gold.`, 'warn');
      return;
    }
    p.gold -= TITAN_GRIP.price;
    p.titanGrip = true;
    saveGame();
    ui.banner('Titanengriff gelernt', 'Zwei Zweihandwaffen – eine in jeder Hand');
    this.renderMerchant(undefined, true);
    this.message('Du kannst jetzt eine zweite Zweihandwaffe in der Nebenhand führen.', 'success');
  },

  // Beidhändigkeit: nur Krieger der Klinge, ab Stufe 30, einmalig gegen Gold
  // seit 13.85 Schwert oder Axt in der Nebenhand, auch gemischt
  dualWieldHtml() {
    const p = game.player;
    if (p.classId !== 'krieger') return '';
    if ((p.path || 0) === TITAN_GRIP.path) return this.titanGripHtml();
    const path = CLASSES.krieger.paths[DUAL_WIELD.path].name;
    const info = `Ein zweites Schwert oder eine Axt in der Nebenhand statt Schild (auch gemischt): +${Math.round(DUAL_WIELD.atk * 100)} % ihres Angriffs, ` +
      `+${Math.round(DUAL_WIELD.atkSpeed * 100)} % Angriffstempo, ihre Boni zur Hälfte. Dafür kein Blocken.`;
    let state;
    if (p.dualWield) state = canDualWield(p) ? '<b class="up">Gelernt.</b> Lege ein Schwert oder eine Axt im Inventar mit „Nebenhand“ an – hält die Haupthand schon eine, wandert die zweite von selbst dorthin.' : `<b>Gelernt</b>, wirkt aber nur auf dem ${path}.`;
    else if ((p.path || 0) !== DUAL_WIELD.path) state = `<span class="need">Nur für den ${path}.</span> Zweihänder bleiben dem Weg des Leibes.`;
    else if (p.level < DUAL_WIELD.level) state = `<span class="need">Ab Stufe ${DUAL_WIELD.level}.</span>`;
    else state = `<button type="button" class="mini-btn primary" data-learn-dual ${p.gold < DUAL_WIELD.price ? 'disabled' : ''}>Lernen für ${DUAL_WIELD.price.toLocaleString('de-DE')} Gold</button>`;
    return `<div class="learn-box"><h3>Beidhändigkeit <small>· ${path} · ab Stufe ${DUAL_WIELD.level}</small></h3><p>${info}</p><p>${state}</p></div>`;
  },

  learnDualWield() {
    const p = game.player;
    if (p.dualWield || p.classId !== 'krieger' || (p.path || 0) !== DUAL_WIELD.path || p.level < DUAL_WIELD.level) return;
    if (p.gold < DUAL_WIELD.price) {
      this.message(`Dir fehlen ${(DUAL_WIELD.price - p.gold).toLocaleString('de-DE')} Gold.`, 'warn');
      return;
    }
    p.gold -= DUAL_WIELD.price;
    p.dualWield = true;
    saveGame();
    ui.banner('Beidhändigkeit gelernt', 'Ein Schwert oder eine Axt passt jetzt in die Nebenhand');
    this.renderMerchant(undefined, true);
    this.message('Du kannst jetzt ein zweites Schwert oder eine Axt in der Nebenhand führen.', 'success');
  },

  // Verkaufen: öffnet die Tasche gleich zum Auswählen
  sellSectionHtml() {
    const p = game.player;
    return `<h3>Verkaufen</h3><p class="hint-text">Tippe in der Tasche alles an, was weg soll – Ausrüstung, Bücher und Tränke, auf allen Seiten I–IV – und verkaufe es auf einmal. Tasche ${bagCapText(p)}.</p>` +
      `<button type="button" class="btn btn-primary" data-open-sell>Tasche öffnen und verkaufen</button>`;
  },

  wireSell(body) {
    const b = body.querySelector('[data-open-sell]');
    if (b) b.addEventListener('click', () => this.openInventory(true));
  },

  buyGear(slot, tier, equip, kind) {
    const p = game.player;
    const m = MERCHANTS[this.merchant];
    if (!m || tier < MERCHANT_MIN_TIER || !m.prices[tier] || !m.slots.includes(slot)) return;
    if (slot === 'waffe' && !merchantKindOk(m, kind)) return;
    const price = merchantPrice(this.merchant, slot, tier);
    const item = makeItem(slot, tier, 0, p.classId, kind || null);
    applyRarity(item, merchantRarity(tier)); // seit 13.56: Händlerware grau oder grün (mit Boni)
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

  // Schmied: links die Figur mit der angelegten Ausrüstung, daneben die Tasche, rechts der Amboss
  renderSmith(body = document.getElementById('npcBody')) {
    const p = game.player;
    const refs = [];
    equipSlotsFor(p.classId).forEach((sl) => { if (p.equipment[sl.id]) refs.push({ where: 'equip', key: sl.id }); });
    p.inventory.forEach((it, i) => { if (!isBook(it)) refs.push({ where: 'bag', key: i }); });
    if (this.smithRef && !itemAt(this.smithRef)) this.smithRef = null;
    if (!this.smithRef && refs.length) this.smithRef = refs[0];
    const isSel = (where, key) => this.smithRef && this.smithRef.where === where && this.smithRef.key === key;
    const equip = equipSlotsFor(p.classId).map((sl) => this.tile(p.equipment[sl.id], `data-ref="equip:${sl.id}" class-sel="${isSel('equip', sl.id)}"`, slotLabel(sl.id, p), sl.id)).join('');
    const bag = p.inventory.map((it, i) => (isBook(it) ? '' : this.tile(it, `data-ref="bag:${i}" class-sel="${isSel('bag', i)}"`))).join('');
    body.innerHTML =
      `<p>„Zeig mir, was ich schmieden soll. Pass auf: Jeder Fehlschlag kann es zerbrechen, schon ab +0 – außer du hast eine Segensschriftrolle. Ab +6 brauche ich Teile von Monstern, für Ausrüstung ab Stufe 30 schon ab +4. Ich schmiede bis +20.“</p>` +
      `<div class="smith smith3">` +
      `<section class="smith-equip"><h3>Angelegt</h3><div class="equip-doll"><canvas id="smithDoll" class="doll"></canvas><div class="equip-grid">${equip}</div></div></section>` +
      `<section class="smith-bag"><h3>Tasche</h3><div class="smith-list">${bag || '<p class="hint-text">Keine Ausrüstung in der Tasche.</p>'}</div></section>` +
      `<div id="smithWork" class="smith-work"></div></div><p id="smithMsg" class="gear-msg"></p>`;
    drawDoll(document.getElementById('smithDoll'));
    body.querySelectorAll('[data-ref]').forEach((b) => {
      if (b.getAttribute('class-sel') === 'true') b.classList.add('selected');
      b.addEventListener('click', () => {
        if (this.forging) return;
        const [where, key] = b.dataset.ref.split(':');
        if (where === 'equip' && !p.equipment[key]) return;
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
    // seit 13.37 groß: Gegenstand mit Plus-Sprung, jeder Wert alt → neu mit Zuwachs, Kosten als große Kacheln
    const fmt = (n) => n.toLocaleString('de-DE');
    const chip = (icon, big, small, ok, tip = '') => `<div class="cost-chip${ok ? '' : ' lack'}"${tip ? ` data-tip="${tip}"` : ''}>` +
      `<img src="${icon}" alt=""><b>${big}</b><small>${small}</small></div>`;
    const costs = chip(lootIconUrl('gold'), fmt(cost.gold) + ' Gold', 'du hast ' + fmt(p.gold), p.gold >= cost.gold) +
      chip(lootIconUrl('splinter'), cost.splinters + ' Seelensplitter', 'du hast ' + fmt(p.splinters), p.splinters >= cost.splinters) +
      (mat ? chip(mobMatIconUrl(mat.id), mat.count + ' × ' + MOB_MATS[mat.id].name, `du hast ${have} · von ${MONSTER_TYPES[mat.id].name} (Stufe ${MONSTER_TYPES[mat.id].level})`, have >= mat.count, mobMatTip(mat.id)) : '') +
      (cost.core ? chip(materialIconUrl('aetherkern'), cost.core.count + ' × Ätherkern', `du hast ${p.materials.aetherkern || 0} · selten`, (p.materials.aetherkern || 0) >= cost.core.count, matDef('aetherkern').text) : '');
    const coreHint = cost.core ? '<p class="hint-text">💠 Ätherkern: aus Seelensteinen ab Stufe 40, Dungeon-, Riss-, Instanz- und Endbossen.</p>'
      : ITEM_TIERS[item.tier].level >= FORGE_CORE.minLevel && item.plus + 1 >= FORGE_CORE.from ? '' : ITEM_TIERS[item.tier].level >= FORGE_CORE.minLevel ? `<p class="hint-text">Ab +${FORGE_CORE.from} braucht diese Ausrüstung zusätzlich seltene Ätherkerne.</p>` : '';
    const matHint = coreHint + (mat ? `<p class="hint-text">📍 ${MOB_MATS[mat.id].name}: ${MONSTER_TYPES[mat.id].name}, ${monsterWhere(mat.id)}</p>`
      : (item.plus + 1 >= upgradeMatStart(item.tier) ? '' : `<p class="hint-text">Ab +${upgradeMatStart(item.tier)} braucht der Schmied zusätzlich Teile von Monstern.</p>`));
    const risk = step.fail === 'none' ? 'Bei Fehlschlag sind nur die Kosten weg.'
      : step.fail === 'down' ? `Bei Fehlschlag fällt der Gegenstand auf +${item.plus - 1} zurück.`
        : 'Bei Fehlschlag zerbricht der Gegenstand!';
    const next = { ...item, plus: item.plus + 1 };
    const where = this.smithRef.where === 'equip' ? '<span class="smith-where on">angelegt</span>' : '<span class="smith-where">in der Tasche</span>';
    const now = itemStats(item);
    const after = itemStats(item, item.plus + 1);
    const rows = sortedStats(after).map(([k, v]) => {
      const a = statText(k, now[k] != null ? now[k] : (k === 'dmg' ? [0, 0] : 0));
      const b = statText(k, v);
      const label = k === 'dmg' ? 'Schaden' : STAT_LABELS[k];
      const strip = (t) => t.replace(label, '').trim();
      return `<tr><th>${label}</th><td>${strip(a)}</td><td class="arrow">→</td><td class="up">${strip(b)}</td></tr>`;
    }).join('');
    el.innerHTML = `<div class="smith-head">${this.anvil(item)}<div class="smith-title">${where}` +
      `<div class="smith-name" style="color:${itemColor(item)}">${itemName(item)}</div>` + rarityLineHtml(item) + setLineHtml(item) +
      `<div class="smith-plus"><span style="color:${plusColor(item)}">+${item.plus}</span><i>→</i><span style="color:${plusColor(next)}">+${next.plus}</span></div></div></div>` +
      (this.smithRef.where === 'bag' ? compareHtml(item) : '') +
      `<table class="smith-delta">${rows}</table>` +
      `<div class="chance"><i style="width:${step.chance * 100}%"></i><span>Erfolgschance ${Math.round(step.chance * 100)} %</span></div>` +
      `<div class="smith-costs">${costs}</div>` + matHint +
      `<p class="smith-risk ${step.fail}">${risk}</p>` +
      // Haken für die Segensschriftrolle bleibt gesetzt, bis man ihn selbst wieder herausnimmt
      (step.fail !== 'none' ? `<label class="scroll-opt" for="useScroll"><input id="useScroll" type="checkbox" ${p.scrolls ? '' : 'disabled'} ${p.scrolls && this.scrollPref ? 'checked' : ''}>` +
        `<img class="mini-icon" src="${scrollIconUrl()}" alt=""> Segensschriftrolle verwenden (${p.scrolls} vorhanden)</label>` : '') +
      `<div class="forge-row"><button id="btnForge" type="button" class="btn btn-primary btn-forge" ${enough ? '' : 'disabled'}>Verbessern auf +${next.plus}</button>` +
      `<button id="btnSound" type="button" class="mini-btn" title="Klänge an oder aus">${sfx.on ? '🔊 Ton an' : '🔇 Ton aus'}</button></div>`;
    const sc = document.getElementById('useScroll');
    if (sc) sc.addEventListener('change', () => { this.scrollPref = sc.checked; });
    document.getElementById('btnForge').addEventListener('click', () => this.forge());
    document.getElementById('btnSound').addEventListener('click', (e) => {
      e.target.textContent = sfx.toggle() ? '🔊 Ton an' : '🔇 Ton aus';
    });
  },

  anvil(item) {
    return `<div class="anvil rar-${rarityOf(item)}" id="anvil"><img class="anvil-item" src="${itemIconUrl(item)}" alt="">` +
      `<span class="hammer"></span><span class="spark s1"></span><span class="spark s2"></span><span class="spark s3"></span></div>`;
  },

  forge() {
    if (this.forging) return;
    const scrollBox = document.getElementById('useScroll');
    const useScroll = !!(scrollBox && scrollBox.checked);
    const before = itemAt(this.smithRef);
    const name = itemName(before);
    const from = before.plus;
    const step = UPGRADE_STEPS[from];
    // seit 14.32: Kann das Teil zerbrechen (ohne Segensschriftrolle) und ist es etwas wert – angelegt, ab Selten
    // oder ab +4 –, fragt der Knopf einmal nach („Wirklich? …“), erst der zweite Druck schmiedet
    const btn = document.getElementById('btnForge');
    if (btn && step.fail === 'break' && !useScroll && (this.smithRef.where === 'equip' || rarityOf(before) >= 2 || from >= 4) &&
      !armConfirm(btn, 'Wirklich? Ohne Segensschriftrolle kann es zerbrechen!')) return;
    if (btn && btn._armReset) btn._armReset();
    const iconBefore = itemIconUrl(before);
    const res = upgradeItem(this.smithRef, useScroll);
    if (!res) return;
    this.forging = true;
    document.getElementById('btnForge').disabled = true;
    const anvil = document.getElementById('anvil');
    anvil.classList.add('forging');
    const smith = game.world.npcs.filter((n) => n.id === 'schmied').sort((a, b) => dist(a, game.player) - dist(b, game.player))[0];
    particles(smith.x + 12, feetY(smith) - 14, { count: 24, color: ['#ffd34d', '#ff9a3a', '#ffffff'], speed: [80, 200], life: [0.3, 0.6], size: [1.5, 2.5], shape: 'spark', drag: 4, gravity: 300 });
    const kind = res.result === 'success' ? 'ok' : res.result === 'break' ? 'break' : useScroll && step.fail !== 'none' ? 'saved' : 'fail';
    forgeScene(iconBefore, kind, { name, from, to: res.result === 'success' ? res.item.plus : from, color: plusColor(res.item) }, () => {
      this.forging = false;
      const msg = document.getElementById('smithMsg');
      if (!msg || !document.getElementById('anvil')) return; // Fenster wurde inzwischen geschlossen
      const p = game.player;
      if (res.result === 'success') {
        anvil.classList.add('success');
        msg.textContent = `Erfolg! ${name} ist jetzt +${res.item.plus}.`;
        msg.className = 'gear-msg success';
        addText(p.x, feetY(p) - 72, `${name} +${res.item.plus}`, 'crit');
        particles(p.x, feetY(p) - 20, { count: 30, color: [plusColor(res.item), '#ffffff', '#ffd34d'], speed: [60, 180], life: [0.5, 0.9], size: [2, 3.5] });
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
      }, 300);
    });
  }
};

// Schmiede-Szene über dem ganzen Bildschirm: drei Hammerschläge mit Funken und Klang, der
// Gegenstand glüht immer stärker, kurze Spannung, dann das Ergebnis mit eigenem Bild und Klang.
// kind: 'ok' (Erfolg), 'fail' (nur Kosten weg), 'saved' (Schriftrolle hat geschützt), 'break' (zerbrochen)
function forgeScene(icon, kind, info, done) {
  const fx = document.getElementById('forgeFx');
  const item = fx.querySelector('.ff-item');
  const halves = fx.querySelectorAll('.ff-half');
  const sparks = fx.querySelector('.ff-sparks');
  const title = fx.querySelector('.ff-text strong');
  const sub = fx.querySelector('.ff-text span');
  item.src = icon;
  halves.forEach((h) => { h.src = icon; });
  sparks.innerHTML = '';
  title.textContent = '';
  sub.textContent = '';
  fx.className = 'forge-fx';
  fx.style.setProperty('--heat', '0');
  fx.style.setProperty('--res', info.color);
  fx.hidden = false;
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const burst = (n, spread) => {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      const a = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      const d = 50 + Math.random() * 90;
      s.style.setProperty('--dx', Math.cos(a) * d + 'px');
      s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      s.style.animationDelay = Math.random() * 0.05 + 's';
      sparks.append(s);
      setTimeout(() => s.remove(), 800);
    }
  };
  [300, 700, 1100].forEach((ms, i) => at(ms, () => {
    fx.classList.remove('strike');
    void fx.offsetWidth;
    fx.classList.add('strike');
    fx.style.setProperty('--heat', String((i + 1) / 3));
    burst(10 + i * 4, 2.4);
    sfx.clang(i);
    buzz(18);
  }));
  at(1350, () => {
    fx.classList.add('suspense');
    sfx.riser();
  });
  at(1850, () => {
    fx.classList.remove('suspense');
    fx.classList.add('res-' + kind);
    if (kind === 'ok') {
      title.textContent = `+${info.to}`;
      sub.textContent = `${info.name} ist jetzt +${info.to}`;
      burst(36, 6.3);
      sfx.success();
    } else if (kind === 'break') {
      title.textContent = 'Zerbrochen!';
      sub.textContent = `${info.name} +${info.from} ist zersprungen`;
      burst(26, 6.3);
      sfx.shatter();
      shakeScreen(9);
      buzz([60, 40, 120]);
    } else if (kind === 'saved') {
      title.textContent = 'Geschützt';
      sub.textContent = `Fehlgeschlagen, die Segensschriftrolle hat ${info.name} gerettet`;
      sfx.saved();
    } else {
      title.textContent = 'Fehlgeschlagen';
      sub.textContent = `${info.name} bleibt +${info.from}`;
      sfx.fail();
    }
  });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    timers.forEach(clearTimeout);
    fx.hidden = true;
    fx.removeEventListener('click', skip);
    done();
  };
  // Antippen nach dem Ergebnis schließt sofort
  const skip = () => { if (fx.className.includes('res-')) close(); };
  fx.addEventListener('click', skip);
  at(kind === 'ok' || kind === 'break' ? 4000 : 3500, close);
}
