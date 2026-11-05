// Ausrüstung: Gegenstände, Inventar, Beute, Händler, Schmied und die zugehörigen Fenster.

// --- Gegenstände -------------------------------------------------------------------
// Ein Gegenstand ist { uid, slot, tier, plus, cls, kind, rarity }; tier ist der Index in ITEM_TIERS.
// cls: Klasse, die ihn tragen kann (nur Waffe, Rüstung, Helm); kind: Waffenart (siehe WEAPON_KINDS).
// rarity (seit 13.56): Seltenheit 0–4 (RARITIES, seltenheit.js); neue Teile sind erst einmal Normal.

function makeItem(slot, tier, plus = 0, cls = null, kind = null) {
  const item = { uid: Math.random().toString(36).slice(2, 10), slot, tier, plus, rarity: 0 };
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

function wearProblem(item, who) {
  const classId = typeof who === 'string' ? who : who.classId;
  if (item.cls && item.cls !== classId) {
    return item.slot === 'schild' ? 'Schilde trägt nur der Krieger.' : `Nur für ${CLASSES[item.cls].name}.`;
  }
  // Seit Version 6.2: Ausrüstung erst ab der Stufe ihrer Gegenstandsstufe (z. B. Göttlich ab 60)
  const need = itemLevelReq(item);
  if (typeof who === 'object' && who.level < need) return `Erst ab Stufe ${need}.`;
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
  ['damageTaken', 'Erlittener Schaden', 'lessPct']
];
function compareItem(item, hand) {
  const p = game.player;
  if (!item || isBook(item) || !canWear(item, p)) return null;
  const now = playerStats(p);
  const slot = hand === 'off' ? 'schild' : equipSlotOf(item);
  const eq = { ...p.equipment, [slot]: item };
  if (slot === 'waffe' && WEAPON_KINDS[item.kind] && WEAPON_KINDS[item.kind].twoHanded && !(item.kind === 'bow' && isQuiver(eq.schild))) eq.schild = null;
  if (slot === 'waffe' && item.kind !== 'bow' && isQuiver(eq.schild)) eq.schild = null;
  if (slot === 'schild' && !isQuiver(item) && p.equipment.waffe && WEAPON_KINDS[p.equipment.waffe.kind]?.twoHanded) eq.waffe = null;
  const test = playerStats({ ...p, equipment: eq });
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
    out.push([name, `${sign}${val}`, better ? 1 : -1]);
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
  if (!canWear(item, p)) return '';
  const diff = compareItem(item, hand);
  const worn = p.equipment[hand === 'off' ? 'schild' : equipSlotOf(item)];
  const head = `<small class="cmp-head">${title}${worn && worn !== item ? ` (angelegt: ${itemFullName(worn)})` : worn === item ? '' : ' (Platz ist leer)'}:</small>`;
  if (!diff.length) return `<div class="cmp-box">${head}<span class="cmp same">gleich gut</span></div>`;
  return `<div class="cmp-box">${head}${diff.map(([n, v, b]) => `<span class="cmp ${b > 0 ? 'up' : 'down'}">${b > 0 ? '▲' : '▼'} ${v} ${n}</span>`).join('')}</div>`;
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

function bonusValue(def, tier) {
  const [lo, hi] = def.range;
  const r = lo + Math.random() * (hi - lo);
  if (def.fmt === 'flat') return Math.max(1, Math.round(r * (1 + tier * (def.tierScale || 0.35))));
  const v = Math.min(def.max || Infinity, r * (1 + tier * 0.1));
  if (def.fmt === 'pct1') return Math.round(v * 10000) / 10000;
  return Math.round(v * 1000) / 1000;
}

// Statuswerte, die auf diesem Gegenstand passen: nach seiner Klasse, sonst nach der eigenen Klasse
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
}

// Zufälliger Bonus, der auf diesem Gegenstand noch nicht vorkommt
function rollBonus(item, special) {
  const pool = special ? SPECIAL_BONUS_TYPES : BONUS_TYPES;
  const taken = new Set((special ? item.specials : item.bonuses || []).map((b) => b.t));
  const fit = bonusAttrsFor(item);
  const ids = Object.keys(pool).filter((id) => !taken.has(id) && (special || pool[id].slots.includes(item.slot)) && (special || !ATTR_BONUS_IDS.includes(id) || fit.includes(id)));
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

function addToBag(item) {
  const p = game.player;
  if (p.inventory.length >= BAG_SIZE) return false;
  p.inventory.push(item);
  return true;
}

// --- Fertigkeitsbücher --------------------------------------------------------------------
// Jedes Buch gehört zu genau einer Fertigkeit, aus allen Klassen und Wegen. Seelensteine lassen
// Bücher zu zufälligen Fertigkeiten fallen: Oft ist es nicht das eigene, dann verkauft man es.
// In der Tasche liegen Bücher gestapelt: { book: 'schwertaura', count: 3 }
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
  const changed = sorted.some((it, i) => it !== before[i]);
  if (changed) p.inventory.splice(0, p.inventory.length, ...sorted);
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
  const stack = p.inventory.find((it) => it.book === id && it.count + n <= BOOK_STACK);
  if (stack) {
    stack.count += n;
    return true;
  }
  if (!force && p.inventory.length >= BAG_SIZE) return false;
  p.inventory.push({ book: id, count: n, uid: newUid() });
  return true;
}

// n Bücher zu zufälligen Fertigkeiten; pool schränkt die Auswahl ein (z. B. eigene Fertigkeiten).
// Ohne pool zieht jedes Buch mit OWN_BOOK_BIAS aus den eigenen Fertigkeiten: Mit dem Magier (8.6) wuchs der
// Pool von 38 auf 58 Bücher; so bleiben eigene Bücher so häufig wie vorher (0,05 + 0,95 · 5/58 ≈ 13 %).
const OWN_BOOK_BIAS = 0.05;
// Seit 10.4: Fertigkeitsschriftrollen fallen erst aus Seelensteinen ab dieser Stufe, immer für die eigene Klasse
const SKILL_SCROLL_STONE = 40;
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
      ui.log(`Deine Tasche ist voll: Schriftrolle „${sk.name}“ bleibt liegen.`, 'warn');
      continue;
    }
    got.push(sk.name);
    const own = ownBook(p, id);
    ui.loot('Schriftrolle: ' + sk.name, 1, bookIconUrl(id), own ? '#ffd34d' : '#c58cff');
    if (own) ui.log(`Eine Schriftrolle für deine Fertigkeit ${sk.name}!`, 'level');
    if (from && !ui.dropAt) later(0.2 + k * 0.12, () => vfxLootFly(from, bookSprite(id).img));
  }
  if (got.length) ui.buildSkillBar();
  return got;
}

// Fertigkeitsschriftrolle (seit 10.4, vorher ein Buch): aufrechte Hängerolle wie ein fernöstliches Rollbild –
// Pergament mit Rand in der Farbe der Klasse, oben und unten ein dunkler Holzstab mit goldenen Knäufen, in der Mitte
// das Symbol der Fertigkeit in einem goldenen Siegel, unten eine Quaste. (Die Segensschriftrolle liegt quer.)
const BOOK_COVERS = { krieger: ['#8a2a1a', '#c8502a'], ninja: ['#3a2a5a', '#6a4a9a'], schamane: ['#145a5a', '#2a8a8a'], nekromant: ['#2a4a1a', '#4a7a2a'], magier: ['#1e2458', '#4a5ab8'] };
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
    // gleiches Bild wie in der Fertigkeitsleiste (seit 9.6)
    drawSkillScroll(ctx, dark, light, (c) => drawSkillIcon(c, e.sk));
  });
}
function bookIconUrl(id) {
  const key = 'bookicon:' + id;
  if (!iconCache.has(key)) iconCache.set(key, bookSprite(id).img.toDataURL());
  return iconCache.get(key);
}

function addMobMat(id, n, from) {
  const p = game.player;
  p.upmats[id] = (p.upmats[id] || 0) + n;
  const mat = MOB_MATS[id];
  ui.loot(mat.name, n, mobMatIconUrl(id), mat.color);
  if (from && !ui.dropAt) later(0.15, () => vfxLootFly(from, mobMatSprite(id).img));
}

// Beute: normale Monster selten, Seelensteine oft
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
  if (drops || sd) {
    const got = [];
    for (const [id, [chance, min, max]] of Object.entries((drops || sd).mats)) {
      if (id === 'switch67' && !drops) continue; // nur der Stein selbst, nicht seine Monster
      // Monster aus dem Stein: seit 13.41 nur noch selten etwas (vorher 12 % der Steinchance je Monster)
      if (Math.random() >= (drops ? chance : chance * 0.03)) continue;
      const n = drops ? randInt(min, max) : 1;
      p.materials[id] = (p.materials[id] || 0) + n;
      const mat = MATERIALS.find((x) => x.id === id);
      got.push(id);
      ui.loot(mat.name, n, materialIconUrl(id), MATERIAL_COLORS[id]);
      if (!ui.dropAt) for (let k = 0; k < n; k++) later(0.1 + got.length * 0.12 + k * 0.08, () => vfxLootFly(m, materialIconCanvas(id)));
    }
  }
  // Monster-Teile für den Schmied: jedes Monster lässt selten sein eigenes Teil fallen,
  // Seelensteine einige Teile der Monster ihres Gebiets
  if (!m.isStone && MOB_MATS[m.typeId] && Math.random() < (sideCollecting(m.typeId) ? SIDE_DROP : MOB_MAT_CHANCE)) addMobMat(m.typeId, 1, m);
  // Fertigkeitsschriftrollen (seit 10.4, vorher Bücher aus jedem Stein und selten von Monstern): nur noch aus
  // Seelensteinen ab Stufe 40, seltener (40: 22 %, 70: 37 %), und immer zu den Fertigkeiten der eigenen Klasse
  if (m.isStone && m.level >= SKILL_SCROLL_STONE && Math.random() < 0.22 + (m.level - SKILL_SCROLL_STONE) * 0.005) {
    addBooks(1, m, ownClassSkillIds(p));
  }
  if (m.isStone) {
    // Dungeon-Steine geben die Teile, die auch ihr Boss fallen lässt
    const all = m.zone.dungeon ? [MONSTER_TYPES[m.zone.dungeon.boss].boss.mat] : m.zone.groups.map((g) => g[0]).filter((id) => MOB_MATS[id]);
    const pool = all.filter((id) => MONSTER_TYPES[id].level <= m.level + 2);
    for (let k = randInt(1, 3); k > 0; k--) addMobMat(pool[randInt(0, pool.length - 1)] || all[0], 1, m);
  }
  if (Math.random() < (drops ? drops.gear : sd ? sd.gear * 0.12 : 0.025)) {
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
    if (addToBag(item)) {
      ui.loot(itemFullName(item), 1, itemIconUrl(item), itemColor(item));
      announceRarity(item);
    } else ui.log('Dein Inventar ist voll. ' + itemFullName(item) + ' ist verloren.', 'warn');
  }
  if (b.mat) addMobMat(b.mat, randInt(8, 12), m);
  const mats = { boniPlus: 2, switcher: 2, boni5: 1, ...(Math.random() < 0.5 ? { star: 1 } : {}), ...(m.level >= SWITCH67.stone && Math.random() < 0.5 ? { switch67: 1 } : {}) };
  for (const [id, n] of Object.entries(mats)) {
    p.materials[id] = (p.materials[id] || 0) + n;
    ui.loot(MATERIALS.find((x) => x.id === id).name, n, materialIconUrl(id), MATERIAL_COLORS[id]);
  }
  const gold = m.level * 1500;
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
    const item = makeItem(slots[randInt(0, slots.length - 1)], tier, randInt(3, 6), cls, lootKind(p, cls));
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
  if (b.mat) addMobMat(b.mat, randInt(3, 5), m);
  // seit 13.41 seltener (vorher 2 Verstärkungen, 1 Switcher, 50 % 5. Bonus, 25 % Sternenstein)
  const mats = { boniPlus: 1, ...(Math.random() < 0.5 ? { switcher: 1 } : {}), ...(Math.random() < 0.2 ? { boni5: 1 } : {}), ...(Math.random() < 0.1 ? { star: 1 } : {}) };
  for (const [id, n] of Object.entries(mats)) {
    p.materials[id] = (p.materials[id] || 0) + n;
    ui.loot(MATERIALS.find((x) => x.id === id).name, n, materialIconUrl(id), MATERIAL_COLORS[id]);
  }
  const gold = m.level * 300;
  p.gold += gold;
  ui.loot('Gold', gold, lootIconUrl('gold'), '#ffd96a');
  ui.banner(`${m.name} besiegt!`, 'Die Beute gehört dir');
  ui.log(`${m.name} ist gefallen. In 10 Minuten kehrt er zurück.`, 'level');
  addEffect({ type: 'ring', x: m.x, y: feetY(m), r: 160, dur: 0.9, color: b.color, width: 14, grow: true });
  particles(m.x, feetY(m) - 30, { count: 60, color: [b.color, '#ffffff', '#ffd34d'], speed: [80, 300], life: [0.5, 1.1], size: [2, 5], drag: 2 });
  flashScreen(b.color, 0.35);
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
  if (old) p.inventory.splice(index, 0, old);
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
  gear.message(`${isBook(item) ? 'Schriftrolle: ' + skillEntry(item.book).sk.name : itemFullName(item)} für ${value.toLocaleString('de-DE')} Gold verkauft.`, 'info');
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
// Farben je Stufe: Leder, Bronze, Eisen, Drache, Seele, Asche, Himmel, Götter, seit 13.53 Abgrund und Ewigkeit
// (Motive: voidEye2D und star2D in figuren.js)

const ARMOR_COLORS = ['#7a5a3c', '#8a6a3a', '#5a6a7a', '#9a2f2a', '#4a2f6a', '#4a2a22', '#2a4a7a', '#c8a03a', '#221a3a', '#ece6f0'];
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

// Dolch-Symbol (seit 13.19) aus denselben Klingenumrissen wie die 3D-Waffe (DAGGER_BLADES): Klinge entlang +x
function daggerIconArt(ctx, tier) {
  const K = 72;
  const pts = DAGGER_BLADES[tier];
  const blade = tier === 5 ? '#2a2224' : tier === 7 ? '#ffe9a0' : tier === 8 ? '#3a2e66' : tier === 2 ? '#3a3448' : tier === 4 ? '#5a6a8a' : TIER_METAL[tier];
  const glow = ['#ffffff', '#ffffff', '#b48cff', '#7ad86a', '#9fd0ff', '#ff7a2a', '#bff4ff', '#fff2b0', '#5ee8ff', '#ffb8e0'][tier];
  // Griff mit Wicklung und Knauf
  box(ctx, -9, -1.8, 9, 3.6, 1.2, tier === 0 ? '#6b4a2e' : tier === 4 ? '#2a2a3a' : darker(TIER_ACCENT ? TIER_ACCENT[tier] : '#5a3a2a', 0.2));
  for (const x of [-7.5, -5, -2.5]) stroke(ctx, tier === 7 ? '#e8c46a' : tier === 8 ? '#5ee8ff' : tier === 9 ? '#e2957c' : '#2a1a12', 0.9, [[x, -1.9], [x, 1.9]]);
  if (tier === 4) {
    ctx.beginPath();
    ctx.arc(-11.4, 0, 2.2, 0, Math.PI * 2);
    ctx.strokeStyle = '#8a9ab8';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else oval(ctx, -10, 0, 1.7, 1.7, tier >= 5 ? glow : tier === 0 ? '#8a8f96' : TIER_METAL[tier]);
  // Parierstange
  if (tier === 6) for (let k = 0; k < 4; k++) poly(ctx, [[0, 0], [Math.cos(k * Math.PI / 2) * 3.4, Math.sin(k * Math.PI / 2) * 3.4], [Math.cos(k * Math.PI / 2 + 0.5) * 1.2, Math.sin(k * Math.PI / 2 + 0.5) * 1.2]], '#e6f6ff');
  else if (tier === 8) for (const sy of [-1, 1]) {
    // Abgrund: zwei Tentakelhaken rollen sich zur Klinge ein
    stroke(ctx, OUTLINE, 2.6, [[0, sy * 1], [-1, sy * 4], [1.8, sy * 5.6], [2.6, sy * 3.8]]);
    stroke(ctx, '#3a2e66', 1.4, [[0, sy * 1], [-1, sy * 4], [1.8, sy * 5.6], [2.6, sy * 3.8]]);
  } else if (tier === 9) star2D(ctx, 0.4, 0, 4.6);
  else if (tier === 3) for (const sy of [-1, 1]) poly(ctx, [[0, sy * 1], [-2.5, sy * 4.5], [0.8, sy * 1.6]], '#e8dcc0');
  else if (tier === 5) for (const sy of [-1, 1]) poly(ctx, [[0, sy * 1], [2.5, sy * 4.6], [1, sy * 1]], '#2a2224');
  else if (tier !== 4 && tier !== 2) box(ctx, -0.4, -3.6, 1.8, 7.2, 0.7, tier === 7 ? '#e8c46a' : tier === 0 ? '#8a8f96' : TIER_METAL[tier]);
  else if (tier === 2) oval(ctx, 0.4, 0, 1.2, 2.6, '#2a2430');
  // Klinge: Umriss (y entlang der Klinge → x, x quer → y)
  ctx.beginPath();
  pts.forEach(([qx, qy], i) => (i ? ctx.lineTo(1 + qy * K, -qx * K) : ctx.moveTo(1 + qy * K, -qx * K)));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -4, 0, 4);
  g.addColorStop(0, lighter(blade, 0.5));
  g.addColorStop(0.5, blade);
  g.addColorStop(1, darker(blade, 0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = darker(blade, 0.55);
  ctx.lineWidth = 0.7;
  ctx.stroke();
  // Glühlinie bzw. Hohlkehle
  if (tier >= 2) stroke(ctx, glow, 0.9, [[3, 0], [1 + 0.16 * K, 0]]);
  else stroke(ctx, darker(blade, 0.25), 0.7, [[3, 0], [1 + 0.15 * K, 0]]);
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

function drawItemArt(ctx, item) {
  const { slot, tier } = item;
  const metal = TIER_METAL[tier];
  const c = ARMOR_COLORS[tier];
  if (slot === 'waffe') {
    const kind = item.kind || 'sword';
    const long = kind === 'staff' || kind === 'scythe' || kind === 'greatsword' || kind === 'greataxe' || kind === 'bell';
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    if (kind === 'dagger') {
      ctx.translate(-5, 0);
    } else if (kind === 'fan') {
      ctx.translate(-6, 0);
      ctx.scale(1.3, 1.3);
    } else if (kind === 'bow') {
      ctx.rotate(Math.PI / 4);
      ctx.translate(-2, 0);
      ctx.scale(1.35, 1.35);
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
    const robe = L.robe[tier];
    const trim = item.cls === 'schamane' ? L.gold[tier] : L.glow[tier];
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
    const robe = L.robe[tier];
    const silver = L.trim[tier];
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
    poly(ctx, [[-9, -10], [9, -10], [10, 10], [-10, 10]], L.torso[tier]);
    stroke(ctx, '#5a4030', 1.6, [[-8, -9], [8, 8]]);
    stroke(ctx, '#5a4030', 1.6, [[8, -9], [-8, 8]]);
    box(ctx, -10, -13, 20, 4.5, 2, L.scarf[tier]);
    poly(ctx, [[5, -10], [9, -10], [12, 2], [8, 2]], L.scarf[tier]);
    box(ctx, -10, 7, 20, 3, 1, L.scarf[tier]);
    if (tier === 8) voidEye2D(ctx, 0, -0.5, 1);
    else if (tier === 9) star2D(ctx, 0, -0.5, 4.6);
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
    if (tier === 8) voidEye2D(ctx, 0, 1, 1.1);
    else if (tier === 9) star2D(ctx, 0, 1, 4.8);
  } else if (slot === 'helm' && item.cls === 'ninja') {
    // Kapuze mit Augenschlitz
    const L = ARMOR_LOOK.ninja;
    oval(ctx, 0, 0, 12, 12, L.hood[tier]);
    box(ctx, -9, -3, 18, 6, 2.5, '#e9c6a1');
    for (const x of [-4, 4]) dot(ctx, x, 0, 1.6, 1.2, tier === 8 ? '#5ee8ff' : tier === 9 ? '#ffb8e0' : tier >= 6 ? '#9fe8ff' : '#21160f');
    if (tier >= 4) box(ctx, -10, -8, 20, 3, 1, L.scarf[tier]);
    if (tier === 8) voidEye2D(ctx, 0, -6.5, 0.8);
    else if (tier === 9) star2D(ctx, 0, -6.5, 4);
    poly(ctx, [[8, 4], [17, 12], [12, 13]], L.hood[tier]);
  } else if (slot === 'helm' && item.cls === 'schamane') {
    // Stirnband bzw. Krone mit Juwel
    const L = ARMOR_LOOK.schamane;
    const band = L.band[tier];
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
    const hat = L.hat[tier];
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
    poly(ctx, [[-12, 12], [-13, -2], [-4, -11], [2, -18], [6, -10], [13, -2], [12, 12]], L.hood[tier]);
    dot(ctx, 0, 4, 7, 7, '#0d120c');
    for (const x of [-3, 3]) dot(ctx, x, 3, 1.4, 1, L.glow[tier]);
    if (tier >= 4) for (const [x, h] of [[-6, 5], [0, 8], [6, 5]]) poly(ctx, [[x - 1.6, -10], [x, -10 - h], [x + 1.6, -10]], tier === 8 ? '#3a2e66' : tier === 9 ? '#efeaf6' : '#ddd5bb');
    if (tier === 8) voidEye2D(ctx, 0, -5, 0.9);
    else if (tier === 9) star2D(ctx, 0, -19, 4.4);
  } else if (slot === 'helm') {
    const hm = ARMOR_LOOK.krieger.helm[tier];
    paintShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 4, 13, Math.PI, 0); ctx.closePath(); }, hm, -13, -9, 26, 13);
    box(ctx, -14.5, 2.5, 29, 4, 1.8, c);
    box(ctx, -13, 6, 4, 8, 1.5, hm);
    box(ctx, 9, 6, 4, 8, 1.5, hm);
    if (tier >= 2) poly(ctx, [[-2, -9], [2, -9], [1.4, -16], [-1.4, -16]], ARMOR_LOOK.krieger.crest[tier]);
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
    shieldArt(ctx, tier);
    ctx.restore();
  } else if (slot === 'schultern') {
    // seit 13.12: zwei echte Schulterpanzer statt zwei Ovalen – hohe Hauptplatte mit Grat und Nieten,
    // darunter drei überlappende Schienen über dem Oberarm, in der Mitte ein Kragenstück, das beide verbindet
    shoulderIcon(ctx, tier, GEAR_LOOK.plate[tier], metal);
  } else if (slot === 'umhang') {
    // Umhang mit Spange und Saum
    const cl = GEAR_LOOK.cape[tier];
    poly(ctx, [[-7, -13], [7, -13], [13, 12], [6, 14], [0, 12], [-6, 14], [-13, 12]], cl);
    poly(ctx, [[-7, -13], [-3, -13], [-7, 12], [-13, 12]], darker(cl, 0.2));
    stroke(ctx, GEAR_LOOK.lining[tier], 1.4, [[-12, 11], [12, 11]]);
    stroke(ctx, darker(cl, 0.35), 0.8, [[-1, -10], [-3, 10]]);
    stroke(ctx, darker(cl, 0.35), 0.8, [[4, -10], [6, 10]]);
    box(ctx, -9, -15, 18, 3.5, 1.5, darker(cl, 0.1));
    oval(ctx, 0, -13, 2.8, 2.8, metal);
    if (tier === 8) voidEye2D(ctx, 0, 1, 1.1);
    else if (tier === 9) star2D(ctx, 0, 1, 5.4);
    else if (tier >= 3) poly(ctx, [[0, -3], [3, 1], [0, 5], [-3, 1]], metal);
  } else if (slot === 'guertel') {
    box(ctx, -15, -3.5, 30, 7, 2.5, c);
    stroke(ctx, darker(c, 0.35), 0.8, [[-14, -1.5], [14, -1.5]]);
    box(ctx, -5, -5.5, 10, 11, 2, metal);
    box(ctx, -2.5, -3, 5, 6, 1, darker(c, 0.2));
    if (tier >= 2) {
      oval(ctx, -10, 0, 1.6, 1.6, metal);
      oval(ctx, 10, 0, 1.6, 1.6, metal);
    }
    if (tier === 8) voidEye2D(ctx, 0, 0, 0.75);
    else if (tier === 9) star2D(ctx, 0, 0, 4.2);
    if (tier >= 3) poly(ctx, [[-3, 5.5], [3, 5.5], [0, 12]], tier === 8 ? '#5ee8ff' : tier === 9 ? '#ffb8e0' : tier >= 4 ? '#b48cff' : '#c8402f');
  } else {
    const boot = (x) => {
      box(ctx, x, -12, 7, 16, 2.5, c);
      box(ctx, x - 1, 2, 12, 6, 2.5, darker(c, 0.25));
      stroke(ctx, metal, 1, [[x, -8], [x + 7, -8]]);
    };
    boot(-11);
    boot(2);
    // seit 13.53: Abgrund mit Leerensplittern am Schaft, Ewigkeit mit Sternen
    if (tier === 8) for (const x of [-4, 9]) {
      poly(ctx, [[x - 1.6, -10], [x + 2.5, -17], [x + 1.4, -9]], '#3a2e66');
      stroke(ctx, '#5ee8ff', 0.7, [[x - 10, 7.6], [x + 1, 7.6]]);
    } else if (tier === 9) for (const x of [-7.5, 5.5]) star2D(ctx, x, -6, 3.6);
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
  },
  // Sternen-Switcher: dunkle Rune mit goldenem Stern, zwei Pfeile drehen sich darum
  switch67(ctx) {
    oval(ctx, 0, 0, 14, 14, '#3a1e4a');
    oval(ctx, 0, 0, 11.5, 11.5, '#5a2e6a');
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 5;
      const r = k % 2 ? 3.4 : 8;
      pts.push([Math.cos(a) * r, Math.sin(a) * r + 0.5]);
    }
    poly(ctx, pts, '#ffcf4a');
    dot(ctx, -1.2, -1.2, 1.8, 1.8, '#fff6d0');
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffb85a';
    ctx.lineWidth = 2.2;
    for (const a0 of [-0.35, Math.PI - 0.35]) {
      ctx.beginPath();
      ctx.arc(0, 0, 15.5, a0, a0 + 1.9);
      ctx.stroke();
      const a1 = a0 + 1.9;
      const tx = Math.cos(a1) * 15.5;
      const ty = Math.sin(a1) * 15.5;
      const nx = -Math.sin(a1);
      const ny = Math.cos(a1);
      poly(ctx, [[tx + nx * 4.5, ty + ny * 4.5], [tx + Math.cos(a1) * 3.5, ty + Math.sin(a1) * 3.5], [tx - Math.cos(a1) * 3.5, ty - Math.sin(a1) * 3.5]], '#ffb85a');
    }
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

// Tränke: Drachenblut (Leben) in einer bauchigen Flasche mit Wachssiegel,
// Mondtau (Mana) in einer geschliffenen Kristallflasche mit Mondsichel-Stöpsel.
function drawPotion(ctx, kind) {
  if (kind === 'hp') {
    const body = () => { ctx.beginPath(); ctx.arc(0, 5, 11.5, 0, Math.PI * 2); };
    // Glühen hinter der Flasche
    let g = ctx.createRadialGradient(0, 5, 2, 0, 5, 18);
    g.addColorStop(0, 'rgba(255, 90, 60, 0.45)');
    g.addColorStop(1, 'rgba(255, 90, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -14, 40, 38);
    // Glas
    box(ctx, -4, -11, 8, 9, 1.5, '#9a8a8a');
    body();
    ctx.fillStyle = '#4a2028';
    ctx.fill();
    // Flüssigkeit mit Wölbung
    ctx.save();
    body();
    ctx.clip();
    g = ctx.createLinearGradient(0, -2, 0, 17);
    g.addColorStop(0, '#ff5a3a');
    g.addColorStop(0.5, '#d01e22');
    g.addColorStop(1, '#6a0a16');
    ctx.fillStyle = g;
    ctx.fillRect(-12, -1, 24, 19);
    dot(ctx, 0, -1, 11.5, 2.4, '#ff8a5a');
    dot(ctx, 0, -1, 8, 1.3, '#ffb48a');
    g = ctx.createRadialGradient(-2, 8, 1, 0, 8, 10);
    g.addColorStop(0, 'rgba(255, 200, 120, 0.7)');
    g.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-12, -2, 24, 20);
    for (const [x, y, r] of [[3, 11, 1.4], [-4, 6, 1], [5, 4, 0.8], [-1, 13, 0.9]]) dot(ctx, x, y, r, r, 'rgba(255, 220, 180, 0.85)');
    ctx.restore();
    // Goldener Ring um den Bauch und Herz-Siegel
    ctx.strokeStyle = '#e8b83a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 6, 11.4, 3.2, 0, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.fillStyle = '#ffd96a';
    ctx.beginPath();
    ctx.moveTo(0, 12.5);
    ctx.bezierCurveTo(-4.5, 9.5, -3.5, 5.5, 0, 7.5);
    ctx.bezierCurveTo(3.5, 5.5, 4.5, 9.5, 0, 12.5);
    ctx.fill();
    // Glanz
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 5, 8.5, Math.PI * 1.05, Math.PI * 1.45);
    ctx.stroke();
    dot(ctx, 6, -0.5, 1.2, 1.2, 'rgba(255, 255, 255, 0.8)');
    stroke(ctx, 'rgba(255, 255, 255, 0.6)', 1, [[-2.5, -10], [-2.5, -3]]);
    // Halsring, Korken und rotes Wachssiegel
    box(ctx, -5.5, -12.5, 11, 2.6, 1.2, '#e8b83a');
    box(ctx, -3.5, -17.5, 7, 5.5, 1.5, '#8a5a32');
    poly(ctx, [[-5, -17], [5, -17], [5.5, -14], [3, -13.2], [2, -11.5], [0.6, -13.5], [-3, -13.4], [-5.5, -14.5]], '#b81a24');
    dot(ctx, -1.5, -15.8, 1.6, 0.8, 'rgba(255, 160, 150, 0.8)');
    return;
  }
  // Mondtau
  const shape = [[-4, -6], [4, -6], [10.5, 0], [9, 11], [0, 17], [-9, 11], [-10.5, 0]];
  const path = () => {
    ctx.beginPath();
    shape.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  let g = ctx.createRadialGradient(0, 5, 2, 0, 5, 19);
  g.addColorStop(0, 'rgba(90, 170, 255, 0.5)');
  g.addColorStop(1, 'rgba(90, 170, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(-20, -14, 40, 38);
  path();
  ctx.fillStyle = '#3a4a7a';
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  g = ctx.createLinearGradient(0, 0, 0, 17);
  g.addColorStop(0, '#7ad8ff');
  g.addColorStop(0.45, '#2f7ae8');
  g.addColorStop(1, '#1a2a8a');
  ctx.fillStyle = g;
  ctx.fillRect(-11, 1, 22, 17);
  dot(ctx, 0, 1, 10.5, 2, '#b8ecff');
  g = ctx.createRadialGradient(0, 9, 1, 0, 9, 9);
  g.addColorStop(0, 'rgba(220, 245, 255, 0.85)');
  g.addColorStop(1, 'rgba(220, 245, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(-11, 0, 22, 18);
  // Sternenfunken im Trank
  ctx.fillStyle = '#ffffff';
  for (const [x, y, r] of [[-4, 7, 2.2], [4, 11, 1.6], [2, 4, 1.2], [-2, 13, 1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.3, y - r * 0.3);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.3, y + r * 0.3);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.3, y + r * 0.3);
    ctx.lineTo(x - r, y);
    ctx.lineTo(x - r * 0.3, y - r * 0.3);
    ctx.fill();
  }
  ctx.restore();
  // Schliffkanten
  ctx.strokeStyle = 'rgba(200, 235, 255, 0.55)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-4, -6); ctx.lineTo(-3, 0); ctx.lineTo(0, 17);
  ctx.moveTo(4, -6); ctx.lineTo(3, 0); ctx.lineTo(0, 17);
  ctx.moveTo(-10.5, 0); ctx.lineTo(-3, 0); ctx.moveTo(10.5, 0); ctx.lineTo(3, 0);
  ctx.stroke();
  stroke(ctx, 'rgba(255, 255, 255, 0.85)', 1.6, [[-8.5, 1], [-7.5, 9]]);
  dot(ctx, 7, 2, 1.1, 1.1, 'rgba(255, 255, 255, 0.85)');
  // Silberner Hals und Mondsichel-Stöpsel
  box(ctx, -3, -10, 6, 4.5, 1, '#b8c4d8');
  box(ctx, -4.5, -7, 9, 2, 1, '#e8eef8');
  ctx.fillStyle = '#e8eef8';
  ctx.beginPath();
  ctx.arc(0, -14.5, 5, 0, Math.PI * 2);
  ctx.moveTo(6.4, -15.6);
  ctx.arc(2.2, -15.6, 4.2, 0, Math.PI * 2, true);
  ctx.fill();
  dot(ctx, -2.8, -14, 0.9, 1.3, '#ffffff');
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
  splinter(ctx) {
    poly(ctx, [[0, -14], [7, -2], [3, 13], [-5, 6], [-7, -4]], '#9a6ad8');
    poly(ctx, [[0, -14], [3, 13], [-5, 6], [-7, -4]], '#c9a8ff');
    stroke(ctx, '#f0e0ff', 1, [[-2, -6], [0, 4]]);
  },
  potHp(ctx) { drawPotion(ctx, 'hp'); },
  // Fertigkeitsschriftrolle allgemein (seit 10.4 statt eines Buchs)
  book(ctx) {
    drawSkillScroll(ctx, '#5a2a8a', '#7a3aaa', (c) => {
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
  if (size === 'S') return lootIconUrl(base);
  const key = 'pot:' + kind + size;
  if (!iconCache.has(key)) {
    const k = 1 + POTION_SIZES.findIndex((sz) => sz.id === size) * 0.07;
    const sp = bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => {
      ctx.save();
      ctx.translate(0, 2);
      ctx.scale(k * 0.92, k * 0.92);
      LOOT_ICON_ART[base](ctx);
      ctx.restore();
      // Größenzeichen unten rechts
      ctx.font = '900 9px sans-serif';
      ctx.textAlign = 'center';
      const w = size.length * 6 + 4;
      box(ctx, 19 - w, 10, w, 10, 3, size === 'XXL' ? '#ffd34d' : '#f4ecd8');
      ctx.fillStyle = '#1a1210';
      ctx.fillText(size, 19 - w / 2, 18.5);
    });
    iconCache.set(key, sp.img.toDataURL());
  }
  return iconCache.get(key);
}

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
      const gslot = slot === 'schild' && quiverMode(game.player) ? 'koecher' : slot;
      const ghost = slot ? `<img class="ghost" src="${itemIconUrl(makeItem(gslot, 0))}" alt="">` : '';
      return `<button type="button" class="item-tile empty${slot ? ' has-ghost' : ''}" ${attrs}${slot ? ` data-slot="${slot}"` : ''}>${ghost}<span class="slot-label">${label || 'leer'}</span></button>`;
    }
    if (isBook(item)) {
      const own = ownBook(game.player, item.book);
      return `<button type="button" class="item-tile book-tile${own ? ' own' : ''}" ${attrs} data-info="${escTip(itemTipHtml(item))}">` +
        `<img src="${bookIconUrl(item.book)}" alt="Schriftrolle: ${skillEntry(item.book).sk.name}">` +
        `<span class="item-count">${item.count}</span>` + (label ? `<span class="slot-label">${label}</span>` : '') + `</button>`;
    }
    const band = plusBand(item.plus);
    // Pfeil: besser oder schlechter als das Angelegte (nur für Gegenstände in der Tasche)
    const worn = Object.values(game.player.equipment).includes(item);
    const score = worn ? 0 : compareScore(item);
    const arrow = score > 0 ? '<span class="tile-cmp up">▲</span>' : score < 0 ? '<span class="tile-cmp down">▼</span>' : '';
    // Rahmen und Leuchten in der Farbe der Seltenheit (rar-0 … rar-4, css/seltenheit.css)
    return `<button type="button" class="item-tile band-${band} rar-${rarityOf(item)}${item.plus >= 8 ? ' sparkle' : ''}" ${attrs}${slot ? ` data-slot="${slot}"` : ''} data-info="${escTip(itemTipHtml(item))}">` +
      `<img src="${itemIconUrl(item)}" alt="${itemFullName(item)}">` + arrow +
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
    el.innerHTML =
      `<h3>Für den Schmied</h3><div class="mat-tiles">` +
      tile(lootIconUrl('splinter'), 'Seelensplitter', p.splinters) +
      tile(scrollIconUrl(), 'Segensschriftrollen', p.scrolls, 'Schützt beim Schmied vor dem Zerbrechen.') +
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
    this.multiArmed = false;
    this.renderInventory();
    document.getElementById('panelInv').hidden = false;
  },

  page: 0,
  multi: null,
  multiArmed: false,

  renderInventory() {
    const p = game.player;
    const s = playerStats(p);
    const trader = nearTrader();
    if (this.multi && !trader) this.multi = null;
    // Ausgewählter Gegenstand auf einer anderen Seite: dorthin blättern
    if (this.selected && this.selected.where === 'bag' && p.inventory[this.selected.key]) this.page = Math.floor(this.selected.key / BAG_PAGE);
    this.page = Math.max(0, Math.min(BAG_PAGES - 1, this.page));
    const equip = equipSlotsFor(p.classId).map((sl) => this.tile(p.equipment[sl.id], `data-equip="${sl.id}"`, slotLabel(sl.id, p), sl.id)).join('');
    let bag = '';
    for (let i = this.page * BAG_PAGE; i < (this.page + 1) * BAG_PAGE; i++) {
      const picked = this.multi && this.multi.has(i);
      bag += this.tile(p.inventory[i], `data-bag="${i}"${picked ? ' data-picked="1"' : ''}`);
    }
    const tabs = Array.from({ length: BAG_PAGES }, (_, k) => {
      const used = p.inventory.slice(k * BAG_PAGE, (k + 1) * BAG_PAGE).length;
      return `<button type="button" class="bag-tab${k === this.page ? ' on' : ''}" data-page="${k}">${['I', 'II', 'III', 'IV'][k]}<small>${used}</small></button>`;
    }).join('');
    // Mehrere verkaufen: nur bei einem Händler
    let sellBar;
    if (this.multi) {
      const value = [...this.multi].reduce((n, i) => n + (p.inventory[i] ? sellValue(p.inventory[i]) : 0), 0);
      sellBar = `<div class="multi-bar"><span><b>${this.multi.size}</b> ausgewählt · <span class="price">${value.toLocaleString('de-DE')} Gold</span></span>` +
        `<button type="button" class="mini-btn" data-multi="page">Ganze Seite</button>` +
        `<button type="button" class="mini-btn" data-multi="useless">Nicht nutzbar</button>` +
        `<button type="button" class="mini-btn ${this.multiArmed ? 'danger' : 'btn-sell'}" data-multi="sell" ${this.multi.size ? '' : 'disabled'}>${this.multiArmed ? 'Wirklich verkaufen?' : 'Verkaufen'}</button>` +
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
      `<section class="inv-bag${this.multi ? ' picking' : ''}"><h3>Tasche <small>${p.inventory.length}/${BAG_SIZE}</small><span class="bag-tabs">${tabs}</span></h3>` +
      sellBar + `<div class="bag-grid">${bag}</div>` +
      // Vorräte (seit 11.0): Tränke jeder Größe und Segensschriftrollen, antippen zum Trinken oder Verkaufen
      `<h4 class="sup-head">Vorräte <small>Tränke und Segensschriftrollen</small></h4>` +
      `<div class="sup-grid">${this.supplyList().map((x) => this.supplyTile(x)).join('') || '<small class="hint-text">Keine Tränke dabei. Die Händlerin verkauft welche.</small>'}</div>` +
      // Aufwertungsteile (seit 13.37 im eigenen Fenster, Taste U): hier nur eine Zeile mit Knopf
      `<button type="button" class="mats-open" id="btnMatsOpen"><img src="${lootIconUrl('splinter')}" alt="">` +
      `<span><b>Aufwertungsteile</b><small>Seelensplitter ${p.splinters} · Segensschriftrollen ${p.scrolls} · ${matKinds(p)} Teile-Arten</small></span>` +
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
      if (this.multi) return;
      this.selected = { where: 'sup', key: b.dataset.sup };
      this.sellArmed = false;
      this.renderDetail();
    }));
    body.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => {
      this.page = Number(b.dataset.page);
      this.selected = null;
      this.renderInventory();
    }));
    body.querySelectorAll('[data-multi]').forEach((b) => b.addEventListener('click', () => this.multiAction(b.dataset.multi)));
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
    if (this.multi) {
      document.getElementById('invDetail').innerHTML = '<p class="hint-text">Tippe alles an, was du verkaufen willst. „Nicht nutzbar“ wählt Ausrüstung anderer Klassen und Schriftrollen, die nicht zu deinen Fertigkeiten gehören.</p>';
      return;
    }
    this.renderDetail();
  },

  multiAction(act) {
    const p = game.player;
    if (act === 'start') {
      if (!nearTrader()) return;
      this.multi = new Set();
    } else if (act === 'cancel') {
      this.multi = null;
    } else if (act === 'page') {
      const ids = [];
      for (let i = this.page * BAG_PAGE; i < Math.min(p.inventory.length, (this.page + 1) * BAG_PAGE); i++) ids.push(i);
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
      for (const i of ids) {
        const it = p.inventory[i];
        if (!it) continue;
        gold += sellValue(it);
        p.inventory.splice(i, 1);
      }
      p.gold += gold;
      this.multi = new Set();
      this.selected = null;
      saveGame();
      this.multiArmed = false;
      this.renderInventory();
      this.message(`${ids.length} Sachen für ${gold.toLocaleString('de-DE')} Gold verkauft.`, 'success');
      return;
    }
    this.multiArmed = false;
    this.renderInventory();
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
    // Pfeile (seit 13.57, fernninja.js)
    if (typeof bowArrowSupplies === 'function') out.push(...bowArrowSupplies(p));
    return out;
  },

  supplyTile(x) {
    if (x.arrow != null) return bowArrowTile(x);
    const icon = x.kind ? potionIconUrl(x.kind, x.sz.id) : scrollIconUrl();
    const name = x.kind ? `${potionInfo(x.kind).name} ${x.sz.id}` : BLESSING.name;
    return `<button type="button" class="item-tile sup-tile" data-sup="${x.key}" data-info="${escTip(supplyTipHtml(x))}">` +
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
    const read = idx >= 0 ? skillActions(p, idx).find((a) => a.type === 'book') : null;
    const trader = nearTrader();
    const owner = `${CLASSES[e.cls].name} · ${CLASSES[e.cls].paths[e.path].name}`;
    const info = own
      ? (read ? `Gehört zu deiner Fertigkeit, die auf ${skillLevelText(p.skillLevels[idx])} steht.` : `Gehört zu deiner Fertigkeit. Lesen kannst du sie, sobald die Fertigkeit erweckt ist (ab E1), für den Rangaufstieg zählen die Schriftrollen automatisch.`)
      : 'Gehört nicht zu deinen Fertigkeiten. Verkaufe sie beim Händler oder handle sie.';
    el.innerHTML = `<div class="item-detail"><img src="${bookIconUrl(item.book)}" alt="">` +
      `<div class="item-info"><strong style="color:${own ? '#ffd34d' : '#c58cff'}">Schriftrolle: ${e.sk.name} × ${item.count}</strong>` +
      `<small>Fertigkeitsschriftrolle · ${owner}</small><span>${info}</span></div>` +
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
      return `<button type="button" class="mat-btn" data-mat="${m.id}" title="${m.name}: ${m.text}" ${have && can[m.id] ? '' : 'disabled'}>` +
        `<img src="${materialIconUrl(m.id)}" alt=""><span>${m.tag}</span><b>${have}</b></button>`;
    }).join('');
    el.innerHTML = `<div class="item-detail rar-${rarityOf(item)}"><img src="${itemIconUrl(item)}" alt="">` +
      `<div class="item-info"><strong style="color:${itemColor(item)}">${itemFullName(item)}</strong>` + rarityLineHtml(item) +
      `<small>${slotName} · ${itemKindText(item)} · ab Stufe ${need}</small>` +
      (canWear(item, p) ? '' : `<small class="need">${wearProblem(item, p)} Du kannst es verkaufen.</small>`) +
      (inOff ? `<small class="hint-text">Nebenhand: ${Math.round(offhandRules(p).atk * 100)} % des Angriffs, +${Math.round(offhandRules(p).atkSpeed * 100)} % Angriffstempo, Boni zur Hälfte, kein Blocken.</small>` : '') +
      (offIdle ? `<small class="need">${offhandProblem(p, item)}</small>` : '') +
      `<span>${this.statsList(item)}</span>` +
      (bonuses ? `<ul class="bonus-list">${bonuses}</ul>` : `<small class="hint-text">Noch keine Boni.</small>`) +
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
      `<div class="merchant-sell"><button type="button" class="btn btn-primary" data-open-sell>Tasche öffnen und verkaufen</button><small>Tasche ${p.inventory.length}/${BAG_SIZE}</small></div></div>` +
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
    return `<h3>Verkaufen</h3><p class="hint-text">Tippe in der Tasche alles an, was weg soll, und verkaufe es auf einmal. Tasche ${p.inventory.length}/${BAG_SIZE}.</p>` +
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
      (mat ? chip(mobMatIconUrl(mat.id), mat.count + ' × ' + MOB_MATS[mat.id].name, `du hast ${have} · von ${MONSTER_TYPES[mat.id].name} (Stufe ${MONSTER_TYPES[mat.id].level})`, have >= mat.count, mobMatTip(mat.id)) : '');
    const matHint = mat ? `<p class="hint-text">📍 ${MOB_MATS[mat.id].name}: ${MONSTER_TYPES[mat.id].name}, ${monsterWhere(mat.id)}</p>`
      : (item.plus + 1 >= upgradeMatStart(item.tier) ? '' : `<p class="hint-text">Ab +${upgradeMatStart(item.tier)} braucht der Schmied zusätzlich Teile von Monstern.</p>`);
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
      `<div class="smith-name" style="color:${itemColor(item)}">${itemName(item)}</div>` + rarityLineHtml(item) +
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
