'use strict';

// Endgame ab Stufe 80 (docs/endgame-80.md): Ab Stufe 80 soll das Spiel erst richtig losgehen – viel Ausrüstung farmen,
// viel Gold beim Schmied lassen und mit dem Gold etwas Sinnvolles anfangen. Dieses Modul bringt:
//
// 1. Lv-80-Varianten (item.v80): Jedes Ewig-Teil (Lv 80) ohne Set, das auf den Lv-80-Karten, in den Lv-80-Instanzen,
//    im Turm der Verdammten oder bei den Lv-80-Endbossen fällt, gehört zu einer von zwölf Prägungen (E80_FAM). Eine
//    Prägung hat einen eigenen Namen je Teil („Splitterschwert“, „Rankenrobe“), eigene Farben, eigene Formen in 3D
//    (Helm, Schultern, Brust, Rücken, Waffe) und ein Zeichen im Symbol – und einen Bonus-Schwerpunkt: Ihre Boni würfeln
//    öfter (E80.focusMul) und mindestens einer der Boni stammt aus dem Schwerpunkt. Grundwerte, Seltenheit, Zahl der Boni
//    und damit das Itemlevel bleiben wie bei jedem anderen Ewig-Teil: Höheres Itemlevel ist weiter wirklich besser.
// 2. Schmied ab Stufe 70 teuer (E80.smith): Abgründig (Lv 70) und Ewig (Lv 80) kosten ab dem ersten Plus viel Gold und
//    steigen mit jedem Plus um einen festen Faktor. Chancen, Splitter, Monsterteile und Ätherkerne bleiben.
// 3. Der Veredler (NPC in den Hauptstädten Kazehana und Mondfall und in den Lv-80-Lagern) mit drei Goldsenken:
//    - Bonus neu würfeln: einen gewählten Bonus (1–7) eines Teils ab Lv 60 – Art und Wert oder nur den Wert. Kostet Gold
//      (steigt mit jedem Neuwurf am selben Teil, item.rr) und einen Switcher bzw. Sternen-Switcher. Der alte Bonus lässt
//      sich gleich danach zurückholen (die Kosten bleiben weg).
//    - Veredeln (item.ved, Stufe 1–5): Ewig-Teile bekommen je Stufe +4 % Grundwerte (Angriff, Rüstung, Leben, Mana).
//      Gold, Ätherkerne und Seelensplitter, die Kosten steigen je Stufe, es geht nie etwas kaputt.
//    - Färben (item.dye): Ewig-Teile ohne Set in einer von acht Farben, rein fürs Aussehen.
// Alte Teile ohne die neuen Felder bleiben, wie sie sind. Die Felder reisen mit in Spielstand, Handel, Post,
// Auktionshaus, Konto-Lager (itemClean), Betrachten und zu den Mitspielern (netPlayerState: eq.v80, eq.dye, eq.ved).

const E80 = {
  tier: 9, // Ewig (Lv 80)
  focusMul: 3, // Gewicht der Schwerpunkt-Boni beim Würfeln
  // Woher welche Prägung kommt
  pools: {
    map: { 10: ['splitter', 'prismen'], 17: ['irrlicht', 'ranken'], 18: ['gischt', 'sturmflut'], 19: ['zenit', 'blueten'] },
    inst: ['bastion'],
    turm: ['fluch'],
    raid: { aelvyr: ['wyrm'], tarkon: ['titan'], ignar: ['titan'] }
  },
  // Schmied: Gold für den Schritt +n → +n+1 = base × g^n (gerundet), nur für diese Gegenstandsstufen
  smith: { 8: { base: 8000, g: 1.22 }, 9: { base: 20000, g: 1.25 } },
  // Neuwurf: Gold = base × Stufenfaktor × g^(bisherige Neuwürfe am Teil); Bonus 6/7 kostet special-mal so viel
  reroll: { base: 40000, g: 1.5, tierMul: { 7: 0.15, 8: 0.4, 9: 1 }, special: 2, minTier: 7 },
  // Veredeln: Stufe 1–5, je Stufe +per der Grundwerte (wirkt wie die Seltenheit vor dem Plus)
  ved: { max: 5, per: 0.04, gold: [250000, 500000, 1000000, 2000000, 4000000], cores: [1, 2, 3, 4, 5], splinters: [40, 80, 120, 160, 240] },
  dye: { gold: 100000 },
  npc: { id: 'veredler', maps: [1, 11, 10, 17, 18, 19] },
  src: null // Prägungen der Quelle, während Beute verteilt wird (e80With)
};

// Prägungen: prefix + Gegenstandsart ergibt den Namen (aus „Ewigkeitsschwert“ wird „Splitterschwert“).
// c Stoff/Leder, m Metall, a Leuchtfarbe; focus: Bonus-Schwerpunkt ('main' = Hauptwert der Klasse); motif: Formen in 3D
const E80_FAM = {
  splitter: { prefix: 'Splitter', name: 'Splitter', from: 'Seelensteine im Kristallabgrund', c: '#2e3866', m: '#cfe0ff', a: '#8fe8ff', focus: ['crit', 'critDmg', 'dodge', 'atkSpeed', 'atk'], motif: 'shards' },
  prismen: { prefix: 'Prismen', name: 'Prismen', from: 'Seelensteine im Kristallabgrund', c: '#46286a', m: '#e8d8ff', a: '#d08cff', focus: ['main', 'mp', 'resMagic', 'critDmg'], motif: 'prism' },
  irrlicht: { prefix: 'Irrlicht', name: 'Irrlicht', from: 'Seelensteine im Seelenhain', c: '#24403c', m: '#b8d8d0', a: '#d8ffe8', focus: ['dodge', 'speed', 'resMagic', 'regen', 'crit'], motif: 'wisp' },
  ranken: { prefix: 'Ranken', name: 'Ranken', from: 'Seelensteine im Seelenhain', c: '#2e4a24', m: '#8a6a44', a: '#9fe36a', focus: ['hp', 'regen', 'hpSteal', 'poison', 'vit'], motif: 'vines' },
  gischt: { prefix: 'Gischt', name: 'Gischt', from: 'Seelensteine an der Nebelküste', c: '#1e5a66', m: '#e8f6f4', a: '#9ff0ff', focus: ['atkSpeed', 'resRanged', 'dodge', 'speed', 'regen'], motif: 'spray' },
  sturmflut: { prefix: 'Sturmflut', name: 'Sturmflut', from: 'Seelensteine an der Nebelküste', c: '#1a2a4a', m: '#c8a050', a: '#4ad0ff', focus: ['atk', 'monsterDmg', 'def', 'critDmg'], motif: 'flood' },
  zenit: { prefix: 'Zenit', name: 'Zenit', from: 'Seelensteine auf den Himmelsterrassen', c: '#e2d8c0', m: '#e8c46a', a: '#fff0a0', focus: ['def', 'dmgReduce', 'resMelee', 'vit'], motif: 'zenith' },
  blueten: { prefix: 'Blüten', name: 'Blüten', from: 'Seelensteine auf den Himmelsterrassen', c: '#ecd8e4', m: '#c88aa0', a: '#ffb8d8', focus: ['goldFind', 'dropFind', 'regen', 'hp', 'monsterDmg'], motif: 'blossom' },
  bastion: { prefix: 'Bastions', name: 'Bastion', from: 'Lv-80-Instanzen (Seelensteine und Monster)', c: '#2a3238', m: '#8a96a0', a: '#5fe8c8', focus: ['def', 'dmgReduce', 'block', 'resHuman', 'hp', 'vsHuman'], motif: 'bastion' },
  fluch: { prefix: 'Fluch', name: 'Fluch', from: 'Turm der Verdammten', c: '#2a1416', m: '#4e444c', a: '#ff4a3a', focus: ['vsDemon', 'vsUndead', 'poison', 'hpSteal', 'dmgReduce', 'resHuman'], motif: 'chains' },
  wyrm: { prefix: 'Wyrm', name: 'Wyrm', from: 'Endboss Aelvyr (Hort des Abgrundwyrms)', c: '#221a3a', m: '#6a5a9a', a: '#c08aff', focus: ['atk', 'critDmg', 'vsBeast', 'resMagic', 'atkSpeed'], motif: 'wyrm' },
  titan: { prefix: 'Titanen', name: 'Titan', from: 'Endbosse Tarkon und Ignar', c: '#5a4a3a', m: '#b07a40', a: '#ffb060', focus: ['hp', 'vsOrc', 'resMelee', 'atk', 'main'], motif: 'titan' }
};
// Färben (nur Aussehen): Stoff c, Metall m
const E80_DYES = {
  nacht: { name: 'Nachtschwarz', c: '#1a1820', m: '#6a6878' },
  blut: { name: 'Blutrot', c: '#6a1218', m: '#c8a050' },
  smaragd: { name: 'Smaragd', c: '#145a3a', m: '#c8d8c0' },
  saphir: { name: 'Saphir', c: '#16306e', m: '#d8e2ee' },
  gold: { name: 'Gold', c: '#8a6a1a', m: '#f0d07a' },
  schnee: { name: 'Schneeweiß', c: '#e8eaf0', m: '#b8c0d0' },
  amethyst: { name: 'Amethyst', c: '#4a2470', m: '#d6c0f0' },
  kupfer: { name: 'Kupfer', c: '#6a3018', m: '#e09060' }
};

const e80Has = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
for (const [id, f] of Object.entries(E80_FAM)) f.id = id;
for (const [id, d] of Object.entries(E80_DYES)) d.id = id;
const e80IsSet = (it) => !!(it && typeof it.set === 'string' && it.set);
// Prägung / Farbe / Veredelung eines Teils (nur gültige Werte, nur Ewig)
function e80Fam(it) {
  if (!it || it.tier !== E80.tier || e80IsSet(it) || !e80Has(E80_FAM, it.v80)) return null;
  return E80_FAM[it.v80];
}
function e80Dye(it) {
  if (!it || it.tier !== E80.tier || e80IsSet(it) || !e80Has(E80_DYES, it.dye)) return null;
  return E80_DYES[it.dye];
}
function e80Ved(it) {
  if (!it || it.tier !== E80.tier) return 0;
  const v = it.ved | 0;
  return v > 0 ? Math.min(E80.ved.max, v) : 0;
}

// --- Schwerpunkt der Boni ----------------------------------------------------------------------------------------
// Schwerpunkt-Boni, die auf diesem Teil möglich sind ('main' wird zum Hauptwert der Klasse des Teils)
function e80Focus(F, item) {
  const fit = bonusAttrsFor(item);
  const noMana = noManaFor(item);
  const out = [];
  for (let id of F.focus) {
    if (id === 'main') id = fit[0];
    const d = BONUS_TYPES[id];
    if (!d || !d.slots.includes(item.slot) || out.includes(id)) continue;
    if (ATTR_BONUS_IDS.includes(id) && !fit.includes(id)) continue;
    if (noMana && id === 'mp') continue;
    out.push(id);
  }
  return out;
}
// Würfeln wie bisher (rollBonus in ausruestung.js), nur mit stärkerem Gewicht auf dem Schwerpunkt
const _e80RollBonus = rollBonus;
// eslint-disable-next-line no-global-assign
rollBonus = function (item, special) {
  const F = !special ? e80Fam(item) : null;
  if (!F) return _e80RollBonus(item, special);
  bonusUmstellen(item);
  const taken = new Set((item.bonuses || []).map((b) => b.t));
  const fit = bonusAttrsFor(item);
  const noMana = noManaFor(item);
  const focus = e80Focus(F, item);
  const ids = Object.keys(BONUS_TYPES).filter((id) => !taken.has(id) && BONUS_TYPES[id].slots.includes(item.slot) && (!ATTR_BONUS_IDS.includes(id) || fit.includes(id)) && !(noMana && id === 'mp'));
  const w = ids.map((id) => (id === fit[0] ? BONUS_WEIGHT_MAIN : BONUS_WEIGHTS[id] || 1) * (focus.includes(id) ? E80.focusMul : 1));
  let x = Math.random() * w.reduce((a, b) => a + b, 0);
  let k = 0;
  while (k < ids.length - 1 && (x -= w[k]) >= 0) k++;
  const t = ids[k];
  if (!t) return { t, v: 0 };
  return { t, v: bonusValue(BONUS_TYPES[t], item.tier) };
};
// Ein Teil zur Prägung machen; hat es Boni, aber keinen aus dem Schwerpunkt, wird der letzte Bonus durch einen
// Schwerpunkt-Bonus ersetzt (gleiche Zahl der Boni, Wert zweimal gewürfelt, der bessere bleibt)
function e80Tag(item, famId) {
  if (!item || isBook(item) || !item.slot || item.tier !== E80.tier || e80IsSet(item) || item.v80 || !e80Has(E80_FAM, famId)) return item;
  item.v80 = famId;
  const F = e80Fam(item);
  const list = item.bonuses || [];
  const focus = e80Focus(F, item);
  if (list.length && focus.length && !list.some((b) => focus.includes(b.t))) {
    const free = focus.filter((id) => !list.some((b) => b.t === id));
    const t = free[randInt(0, free.length - 1)];
    if (t) {
      const d = BONUS_TYPES[t];
      let v = bonusValue(d, item.tier);
      const v2 = bonusValue(d, item.tier);
      if (bonusRollQuality({ t, v: v2 }, item.tier) > bonusRollQuality({ t, v }, item.tier)) v = v2;
      list[list.length - 1] = { t, v };
      clampItemBonuses(item);
    }
  }
  return item;
}

// --- Woher: Beute bekommt die Prägung ihrer Quelle --------------------------------------------------------------
function e80SrcOf(m) {
  if (!m) return null;
  try {
    if (typeof turmMonSlot === 'function' && turmMonSlot(m) >= 0) return E80.pools.turm;
  } catch (e) { /* kein Turm */ }
  let z = m.zone;
  if (!z && typeof zoneAt === 'function' && game.world && game.world.zoneIdx) z = zoneAt(m.x, m.y);
  if (!z) return null;
  const d = z.dungeon;
  if (d) {
    if (d.raid) return E80.pools.raid[d.boss] || null;
    if (d.inst60 && typeof instMobLevel === 'function' && instMobLevel(d) >= 75) return E80.pools.inst;
    return d.entry && E80.pools.map[d.entry.map] ? E80.pools.map[d.entry.map] : null;
  }
  return E80.pools.map[z.map] || null;
}
function e80With(m, fn) {
  const prev = E80.src;
  E80.src = prev || e80SrcOf(m);
  try { return fn(); } finally { E80.src = prev; }
}
const _e80AddToBag = addToBag;
// eslint-disable-next-line no-global-assign
addToBag = function (item) {
  if (E80.src && item && !isBook(item) && item.slot) e80Tag(item, E80.src[randInt(0, E80.src.length - 1)]);
  return _e80AddToBag(item);
};
const _e80RewardKillInner = rewardKillInner;
// eslint-disable-next-line no-global-assign
rewardKillInner = function (m) { return e80With(m, () => _e80RewardKillInner(m)); };
const _e80RollLoot = rollLoot;
// eslint-disable-next-line no-global-assign
rollLoot = function (m) { return e80With(m, () => _e80RollLoot(m)); };
if (typeof turmBossLoot === 'function') {
  const _e80TurmBoss = turmBossLoot;
  // eslint-disable-next-line no-global-assign
  turmBossLoot = function (m) {
    const prev = E80.src;
    E80.src = E80.pools.turm;
    try { return _e80TurmBoss(m); } finally { E80.src = prev; }
  };
}

// --- Name, Werte, Anzeige ----------------------------------------------------------------------------------------
const _e80ItemName = itemName;
// eslint-disable-next-line no-global-assign
itemName = function (item) {
  const n = _e80ItemName(item);
  const F = e80Fam(item);
  if (!F || typeof n !== 'string' || !/^Ewigkeits/.test(n)) return n;
  return F.prefix + n.slice('Ewigkeits'.length);
};
// Veredelung: wie die Seltenheit ein Faktor auf Angriff, Rüstung, Leben und Mana vor dem Plus – damit steigt auch das
// Itemlevel (itemIlvl rechnet mit rarityStatMul)
const _e80RarityStatMul = rarityStatMul;
// eslint-disable-next-line no-global-assign
rarityStatMul = function (item) {
  const r = _e80RarityStatMul(item);
  const v = e80Ved(item);
  return v ? r * (1 + E80.ved.per * v) : r;
};
// Verkaufswert: veredelte Teile etwas mehr
const _e80SellValue = sellValue;
// eslint-disable-next-line no-global-assign
sellValue = function (item) {
  const v = _e80SellValue(item);
  return e80Ved(item) ? Math.round(v * (1 + 0.25 * e80Ved(item))) : v;
};
function e80BonusNames(ids) {
  return ids.map((id) => (BONUS_TYPES[id] ? BONUS_TYPES[id].name : id)).join(', ');
}
function e80Pips(v) {
  let s = '';
  for (let k = 1; k <= E80.ved.max; k++) s += k <= v ? '◆' : '◇';
  return s;
}
// Zeile unter der Seltenheit (Hinweis, Inventar, Schmied, Betrachten, Handel, Post, Auktionshaus)
function e80LineHtml(item) {
  const F = e80Fam(item);
  const v = e80Ved(item);
  const D = e80Dye(item);
  if (!F && !v && !D) return '';
  const parts = [];
  if (F) parts.push(`<span class="e80-fam" style="color:${F.a}"><span>Prägung</span> <b>${F.name}</b></span> · <span>Schwerpunkt: ${e80BonusNames(e80Focus(F, item))}</span>`);
  if (v) parts.push(`<span class="e80-ved"><span>Veredelt</span> <b>${e80Pips(v)}</b> <span>(Grundwerte +${Math.round(E80.ved.per * v * 100)} %)</span></span>`);
  if (D) parts.push(`<span class="e80-dye"><span>Gefärbt:</span> <i style="background:${D.c};border-color:${D.m}"></i><span>${D.name}</span></span>`);
  return `<small class="e80-line">${parts.join('<br>')}</small>`;
}
const _e80RarityLine = rarityLineHtml;
// eslint-disable-next-line no-global-assign
rarityLineHtml = function (item) {
  return _e80RarityLine(item) + e80LineHtml(item);
};

// --- Schmied: Kostenkurve ab Stufe 70 -------------------------------------------------------------------------------
// Rundung auf lesbare Beträge (unter 100.000 auf 500, unter 1 Mio. auf 5.000, darüber auf 10.000)
function e80Round(v) {
  const st = v < 100000 ? 500 : v < 1000000 ? 5000 : 10000;
  return Math.max(st, Math.round(v / st) * st);
}
function e80SmithGold(tier, plus) {
  const S = E80.smith[tier];
  return S ? e80Round(S.base * Math.pow(S.g, plus)) : null;
}
const _e80UpgradeCost = upgradeCost;
// eslint-disable-next-line no-global-assign
upgradeCost = function (item) {
  const c = _e80UpgradeCost(item);
  const g = item ? e80SmithGold(item.tier, item.plus) : null;
  if (g != null) c.gold = Math.max(c.gold, g); // nie billiger als die alte Rechnung
  return c;
};

// --- Farben (gearHue, figuren.js): Prägung und Färbung färben Stoff und Metall um ---------------------------------
const _e80GearHue = gearHue;
// eslint-disable-next-line no-global-assign
gearHue = function (it) {
  const F = e80Fam(it);
  const D = e80Dye(it);
  if (!F && !D) return _e80GearHue(it);
  return { c: D ? D.c : F.c, m: D ? D.m : F.m, a: F ? F.a : D.m, f: 0.8, fm: 0.62, k: 'e' + (F ? F.id : '') + (D ? '-' + D.id : '') };
};

// --- Symbol: Zeichen der Prägung unten rechts, Waffen dazu leicht in ihrer Farbe ----------------------------------
const E80_SIGIL = {
  shards(ctx, F) {
    ctx.fillStyle = F.a;
    for (const [x, h, w] of [[-2.6, 4.6, 1.6], [0, 6.4, 2], [2.6, 4.2, 1.6]]) {
      ctx.beginPath(); ctx.moveTo(x, -h * 0.55); ctx.lineTo(x + w, 1.6); ctx.lineTo(x, 3.6); ctx.lineTo(x - w, 1.6); ctx.closePath(); ctx.fill();
    }
  },
  prism(ctx, F) {
    ctx.fillStyle = F.a;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; ctx.lineTo(Math.cos(a) * 4, Math.sin(a) * 4); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(0, -2.6); ctx.lineTo(1.6, 0); ctx.lineTo(0, 2.6); ctx.lineTo(-1.6, 0); ctx.closePath(); ctx.fill();
  },
  wisp(ctx, F) {
    const g = ctx.createRadialGradient(0, 0, 0.3, 0, 0, 4.4);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, F.a); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0.4, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = F.m; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -1.6); ctx.quadraticCurveTo(-1.6, -4.6, 1.4, -5.4); ctx.stroke();
  },
  vines(ctx, F) {
    ctx.fillStyle = F.a;
    for (const [x, y, r] of [[-1.8, -1.4, -0.7], [1.8, 0.2, 0.7], [-1.2, 2.4, -0.5]]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.beginPath(); ctx.ellipse(0, 0, 1.4, 2.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = F.m; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, 4.4); ctx.bezierCurveTo(-2, 2, 2, -1, 0, -4.4); ctx.stroke();
  },
  spray(ctx, F) {
    ctx.strokeStyle = F.a; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (const y of [-1.8, 1.2]) { ctx.beginPath(); ctx.moveTo(-4, y + 1); ctx.bezierCurveTo(-2, y - 2, 0, y + 2, 1.6, y - 1); ctx.quadraticCurveTo(3.4, y - 2.6, 4, y); ctx.stroke(); }
  },
  flood(ctx, F) {
    ctx.strokeStyle = F.m; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -3.8); ctx.lineTo(0, 3.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0.6, 3.4, 0.25, Math.PI - 0.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2.2, -2.2); ctx.lineTo(2.2, -2.2); ctx.stroke();
    ctx.fillStyle = F.a; ctx.beginPath(); ctx.arc(0, -4.2, 1, 0, Math.PI * 2); ctx.fill();
  },
  zenith(ctx, F) {
    ctx.fillStyle = F.m; ctx.beginPath(); ctx.arc(0, 0.4, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = F.a; ctx.beginPath(); ctx.arc(0, 0.4, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = F.m; ctx.beginPath(); ctx.moveTo(-1.2, -3); ctx.lineTo(0, -5.4); ctx.lineTo(1.2, -3); ctx.closePath(); ctx.fill();
  },
  blossom(ctx, F) {
    ctx.fillStyle = F.a;
    for (let k = 0; k < 5; k++) { ctx.save(); ctx.rotate((k / 5) * Math.PI * 2); ctx.beginPath(); ctx.ellipse(0, -2.4, 1.5, 2.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.arc(0, 0, 1.2, 0, Math.PI * 2); ctx.fill();
  },
  bastion(ctx, F) {
    ctx.fillStyle = F.m;
    ctx.fillRect(-3.6, -1.4, 7.2, 5.2);
    for (const x of [-3.6, -0.9, 1.8]) ctx.fillRect(x, -3.6, 1.8, 2.4);
    ctx.fillStyle = F.a; ctx.fillRect(-0.7, 0.4, 1.4, 2.6);
  },
  chains(ctx, F) {
    ctx.strokeStyle = F.m; ctx.lineWidth = 1.1;
    for (const [x, y, r] of [[-2, -2, 0.8], [0, 0, -0.8], [2, 2, 0.8]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.beginPath(); ctx.ellipse(0, 0, 1.2, 2.2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = F.a; ctx.beginPath(); ctx.arc(2.6, -2.6, 1.2, 0, Math.PI * 2); ctx.fill();
  },
  wyrm(ctx, F) {
    ctx.fillStyle = F.a;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 1, 2.4); ctx.quadraticCurveTo(s * 4.4, -0.6, s * 2.4, -4.8); ctx.quadraticCurveTo(s * 2.8, -1, s * -0.6, 1.4); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = F.m; ctx.beginPath(); ctx.ellipse(0, 2.2, 2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  },
  titan(ctx, F) {
    ctx.fillStyle = '#9a9084';
    ctx.beginPath(); ctx.moveTo(-4, 3.6); ctx.lineTo(-2.4, -2.4); ctx.lineTo(0, -4.2); ctx.lineTo(2.6, -2); ctx.lineTo(4, 3.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = F.m; ctx.fillRect(-3.4, 0.2, 6.8, 1.3);
    ctx.fillStyle = F.a; ctx.beginPath(); ctx.arc(0, -1.6, 0.9, 0, Math.PI * 2); ctx.fill();
  }
};
function e80Badge(ctx, F) {
  ctx.save();
  ctx.translate(12, 12);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  // Plakette: runde Münze mit Rand in der Leuchtfarbe
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(14,12,22,0.9)';
  ctx.fill();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = F.a;
  ctx.stroke();
  ctx.scale(0.95, 0.95);
  (E80_SIGIL[F.motif] || E80_SIGIL.shards)(ctx, F);
  ctx.restore();
}
const _e80DrawItemArt = drawItemArt;
// eslint-disable-next-line no-global-assign
drawItemArt = function (ctx, item) {
  _e80DrawItemArt(ctx, item);
  const F = e80Fam(item);
  const D = e80Dye(item);
  if (!F && !D) return;
  // Waffen und Köcher färbt gearCol nicht um: ein Hauch der Prägungs- bzw. Färbefarbe über dem Gezeichneten
  if (item.slot === 'waffe' || item.slot === 'koecher') {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = D ? 0.32 : 0.24;
    ctx.fillStyle = D ? D.c : F.a;
    ctx.fillRect(-20, -20, 40, 40);
    ctx.restore();
  }
  if (F) e80Badge(ctx, F);
};

// --- 3D: Formen der Prägungen -------------------------------------------------------------------------------------
// Je Motiv: helm(H, F) im Kopfrahmen (Einheit = Kopfradius, +z vorn), schulter(S, sx, F) auf der Schulter,
// brust(W, g, F) und ruecken(W, g, F) im Rahmen der Brust, waffe(W, F, len, kind) im Rahmen der Waffe (y entlang der
// Klinge, Griff unten). Kleiner als die Klassen-Sets: eine Prägung ist ein Merkmal, kein ganzes Set.
const e80Chest = (g, dy = 0) => { const y = g.chestY + dy; return [y, torsoAt3(g, y)[1]]; };
const e80Glow = (o) => Object.assign({ mat: 'glow' }, o || {});
const E80_LOOK = {
  shards: {
    helm(H, F) {
      for (let k = -2; k <= 2; k++) {
        const ak = Math.abs(k);
        coneAlong(H, G3.gem(), [k * 0.3, 0.86 - ak * 0.1, 0.12 - ak * 0.12], [k * 0.4, 1, -0.2], 0.42 - ak * 0.09, 0.11, F.a, e80Glow());
      }
      H(G3.gem(), F.m, { p: [0, 0.42, 0.98], s: [0.08, 0.12, 0.05], shine: 1 });
    },
    schulter(S, sx, F) {
      for (let k = 0; k < 3; k++) coneAlong(S, G3.gem(), [sx * (0.03 + k * 0.03), 0.09, (k - 1) * 0.055], [sx * (0.5 + k * 0.25), 1, (k - 1) * 0.35], 0.11 - k * 0.018, 0.026, k === 1 ? F.a : F.m, k === 1 ? e80Glow() : { shine: 1 });
    },
    brust(W, g, F) {
      const [y, z] = e80Chest(g, 0.05);
      for (const [x, dy, s] of [[0, 0, 1], [-0.028, -0.02, 0.6], [0.028, -0.02, 0.6]]) W(G3.gem(), F.a, e80Glow({ p: [x, y + dy, z + 0.012], s: [0.014 * s, 0.03 * s, 0.01 * s] }));
    },
    ruecken(W, g, F) {
      for (const sx of [-1, 1]) {
        coneAlong(W, G3.gem(), [sx * 0.07, g.shY + 0.02, -0.26], [sx * 0.55, 1, -0.35], 0.3, 0.045, F.a, e80Glow());
        coneAlong(W, G3.gem(), [sx * 0.13, g.shY - 0.06, -0.25], [sx * 0.9, 0.7, -0.3], 0.18, 0.032, F.m, { shine: 1 });
      }
    },
    waffe(W, F, len) {
      for (const [y, x, s] of [[0.55, 0.07, 1], [0.7, -0.07, 0.8], [0.85, 0.05, 0.6]]) W(G3.gem(), F.a, e80Glow({ p: [x, len * y, 0.02], s: [0.018 * s, 0.04 * s, 0.018 * s] }));
    }
  },
  prism: {
    helm(H, F) {
      H(G3.gem(), F.a, e80Glow({ p: [0, 1.32, 0.42], s: [0.16, 0.34, 0.16] }));
      H(G3.gem(), '#ffffff', e80Glow({ p: [0, 1.32, 0.45], s: [0.06, 0.16, 0.06] }));
      for (const sx of [-1, 1]) H(G3.gem(), F.a, e80Glow({ p: [sx * 0.62, 1.0, 0.36], s: [0.08, 0.17, 0.08], r: [0, 0, -sx * 0.3] }));
    },
    schulter(S, sx, F) {
      S(G3.disc(), F.m, { p: [sx * 0.03, 0.085, 0], r: [Math.PI / 2 - 0.3, 0, sx * 0.3], s: [0.07, 0.07, 0.5], shine: 1 });
      S(G3.gem(), F.a, e80Glow({ p: [sx * 0.035, 0.13, 0], s: [0.024, 0.05, 0.024] }));
    },
    brust(W, g, F) {
      const [y, z] = e80Chest(g, 0.04);
      W(roundBox(0.05, 0.05, 0.012, 0.01), F.m, { p: [0, y, z + 0.006], r: [0, 0, Math.PI / 4], shine: 1 });
      W(G3.gem(), F.a, e80Glow({ p: [0, y, z + 0.016], s: [0.018, 0.03, 0.012] }));
    },
    ruecken(W, g, F) {
      for (const [dy, s] of [[0.42, 1], [0.24, 0.75], [0.1, 0.55]]) W(G3.gem(), F.a, e80Glow({ p: [0, g.shY + dy, -0.32], s: [0.05 * s, 0.11 * s, 0.05 * s] }));
    },
    waffe(W, F, len) {
      W(G3.gem(), F.a, e80Glow({ p: [0, len + 0.09, 0], s: [0.035, 0.07, 0.035] }));
      W(G3.gem(), F.m, { p: [0, 0.03, 0.04], s: [0.02, 0.035, 0.016], shine: 1 });
    }
  },
  wisp: {
    helm(H, F) {
      // Irrlicht am Stiel: ein dünner Stiel wächst von der Stirn nach oben und vorn, an der Spitze das Licht
      curvedHorn3(H, [[0, 0.82, 0.55], [0, 1.25, 0.6], [0, 1.5, 0.9], [0, 1.45, 1.22]], 0.05, F.m, { shine: 0.6 });
      H(sphere3(0.15, 10, 8), F.a, e80Glow({ p: [0, 1.38, 1.3] }));
      H(sphere3(0.24, 10, 8), F.a, e80Glow({ p: [0, 1.38, 1.3], s: [1, 1.1, 1] }));
      for (const [x, y, z] of [[0.92, 0.5, -0.3], [-0.85, 0.85, -0.45]]) H(sphere3(0.09, 8, 6), F.a, e80Glow({ p: [x, y, z] }));
    },
    schulter(S, sx, F) {
      curvedHorn3(S, [[sx * 0.02, 0.06, -0.02], [sx * 0.06, 0.16, -0.03], [sx * 0.12, 0.22, -0.02], [sx * 0.17, 0.2, 0]], 0.01, F.m, { shine: 0.6 });
      S(sphere3(0.026, 8, 6), F.a, e80Glow({ p: [sx * 0.18, 0.19, 0] }));
    },
    brust(W, g, F) {
      const [y, z] = e80Chest(g, 0.05);
      for (const sx of [-1, 1]) W(G3.feather(), F.m, { p: [sx * 0.012, y - 0.01, z + 0.008], r: [0, 0, -sx * 1.1], s: 0.04, shine: 0.6 });
      W(sphere3(0.016, 8, 6), F.a, e80Glow({ p: [0, y + 0.004, z + 0.016] }));
    },
    ruecken(W, g, F) {
      for (let k = 0; k < 4; k++) {
        const a = -0.9 + k * 0.6;
        W(sphere3(0.035 - k * 0.004, 8, 6), F.a, e80Glow({ p: [Math.sin(a) * 0.28, g.shY + 0.12 + Math.cos(a) * 0.14, -0.34 - k * 0.02] }));
      }
    },
    waffe(W, F, len) {
      for (const [y, x] of [[0.6, 0.08], [0.85, -0.07]]) W(sphere3(0.022, 8, 6), F.a, e80Glow({ p: [x, len * y, 0.02] }));
    }
  },
  vines: {
    helm(H, F) {
      for (let k = 0; k < 9; k++) {
        const a = (k - 4) * 0.36;
        H(G3.feather(), k % 2 ? F.a : '#5a9a3a', { p: [Math.sin(a) * 0.9, 0.55, Math.cos(a) * 0.9], r: [-0.3, a, -a * 0.55], s: 0.55 - Math.abs(k - 4) * 0.04, shine: 0.4 });
      }
      for (const sx of [-1, 1]) H(sphere3(0.07, 8, 6), '#ff6a6a', e80Glow({ p: [sx * 0.55, 0.74, 0.78] }));
    },
    schulter(S, sx, F) {
      for (let k = 0; k < 3; k++) S(G3.feather(), k === 1 ? F.a : '#5a9a3a', { p: [sx * 0.04, 0.07, (k - 1) * 0.04], r: [0, 0, -sx * (0.4 + k * 0.35)], s: 0.13, shine: 0.4 });
      curvedHorn3(S, [[sx * 0.02, 0.05, 0.05], [sx * 0.08, 0.1, 0.07], [sx * 0.11, 0.14, 0.04], [sx * 0.09, 0.17, 0.0]], 0.011, F.m);
    },
    brust(W, g, F) {
      for (let k = 0; k < 6; k++) {
        const t = k / 5;
        const y = g.chestY + 0.12 - t * 0.2;
        const z = torsoAt3(g, y)[1] + 0.008;
        const x = -0.12 + t * 0.24;
        W(sphere3(0.008, 6, 4), F.m, { p: [x, y, z] });
        if (k % 2) W(G3.feather(), F.a, { p: [x, y, z + 0.004], r: [0, 0, 1.2], s: 0.035, shine: 0.4 });
      }
    },
    ruecken(W, g, F) {
      for (const sx of [-1, 1]) {
        curvedHorn3(W, [[sx * 0.1, g.shY - 0.2, -0.24], [sx * 0.16, g.shY + 0.05, -0.27], [sx * 0.2, g.shY + 0.28, -0.26], [sx * 0.12, g.shY + 0.42, -0.22]], 0.022, F.m, { shine: 0.3 });
        W(G3.feather(), F.a, { p: [sx * 0.12, g.shY + 0.4, -0.22], r: [0.3, 0, -sx * 0.5], s: 0.12, shine: 0.4 });
      }
    },
    waffe(W, F, len) {
      for (let k = 0; k < 8; k++) {
        const a = k * 1.3;
        W(sphere3(0.011, 6, 4), F.m, { p: [Math.cos(a) * 0.03, -0.1 + k * 0.05, Math.sin(a) * 0.03] });
      }
      W(G3.feather(), F.a, { p: [0.03, 0.25, 0], r: [0, 0, -0.8], s: 0.07, shine: 0.4 });
    }
  },
  spray: {
    helm(H, F) {
      for (let k = 0; k < 3; k++) H(G3.feather(), k === 1 ? F.c : F.a, { p: [0, 0.88, 0.35 - k * 0.42], r: [-0.4 - k * 0.3, 0, 0], s: [1.6, 0.9 - k * 0.15, 1], top: '#ffffff', topK: 0.55, shine: 0.6 });
      for (const sx of [-1, 1]) H(sphere3(0.07, 8, 6), '#ffffff', { p: [sx * 0.4, 1.0, 0.5], shine: 1 });
    },
    schulter(S, sx, F) {
      curvedHorn3(S, [[sx * 0.0, 0.06, 0.04], [sx * 0.07, 0.14, 0.05], [sx * 0.14, 0.15, 0.02], [sx * 0.16, 0.1, -0.02]], 0.03, F.m, { shine: 0.8 });
      for (const k of [0, 1, 2]) S(sphere3(0.012, 6, 4), '#ffffff', { p: [sx * (0.05 + k * 0.035), 0.16 + (k % 2) * 0.01, 0.04], shine: 1 });
    },
    brust(W, g, F) {
      const [y, z] = e80Chest(g, 0.06);
      for (let k = -2; k <= 2; k++) W(sphere3(0.012 - Math.abs(k) * 0.002, 6, 4), k ? '#ffffff' : F.a, k ? { p: [k * 0.025, y - Math.abs(k) * 0.01, z + 0.01], shine: 1 } : e80Glow({ p: [0, y, z + 0.012] }));
    },
    ruecken(W, g, F) {
      // zwei Flossen und eine Welle, die sich über dem Rücken bricht, mit Schaumperlen
      for (const sx of [-1, 1]) wing3(W, [sx * 0.1, g.shY - 0.02, -0.25], sx, 3, 0.4, mixColor(F.c, F.a, 0.35), '#e8fffc', { shine: 0.5 }, -0.4);
      curvedHorn3(W, [[-0.2, g.shY - 0.12, -0.27], [-0.05, g.shY + 0.1, -0.3], [0.1, g.shY + 0.22, -0.29], [0.2, g.shY + 0.16, -0.25], [0.18, g.shY + 0.06, -0.22]], 0.04, F.m, { shine: 0.8 });
      for (let k = 0; k < 4; k++) W(sphere3(0.018, 6, 4), '#ffffff', { p: [0.2 - k * 0.04, g.shY + 0.24 - k * 0.02, -0.28], shine: 1 });
    },
    waffe(W, F) {
      for (const sx of [-1, 1]) W(G3.feather(), F.a, { p: [sx * 0.02, 0.04, 0], r: [0, 0, -sx * 1.25], s: 0.11, top: '#ffffff', topK: 0.5, shine: 0.6 });
    }
  },
  flood: {
    helm(H, F) {
      // Dreizack über der Stirn
      for (let k = -1; k <= 1; k++) coneAlong(H, G3.spike(), [k * 0.26, 0.86 - Math.abs(k) * 0.08, 0.6], [k * 0.3, 1, 0.25], k ? 0.4 : 0.6, 0.2, F.m, { shine: 1 });
      H(roundBox(0.7, 0.08, 0.08, 0.03), F.m, { p: [0, 0.82, 0.62], shine: 1 });
      H(G3.gem(), F.a, e80Glow({ p: [0, 1.45, 0.82], s: [0.06, 0.1, 0.06] }));
    },
    schulter(S, sx, F) {
      crescent3(S, [sx * 0.04, 0.09, 0], 0.07, 0.012, sx > 0 ? 0.3 : Math.PI - 0.3, 2.4, F.m);
      coneAlong(S, G3.spike(), [sx * 0.04, 0.09, 0], [sx * 0.2, 1, 0], 0.09, 0.05, F.m, { shine: 1 });
    },
    brust(W, g, F) {
      const [y, z] = e80Chest(g, 0.04);
      W(roundBox(0.01, 0.07, 0.008, 0.004), F.m, { p: [0, y, z + 0.008], shine: 1 });
      crescent3(W, [0, y - 0.01, z + 0.008], 0.03, 0.005, -Math.PI / 2, 2.4, F.m);
      W(sphere3(0.009, 6, 4), F.a, e80Glow({ p: [0, y + 0.038, z + 0.01] }));
    },
    ruecken(W, g, F) {
      for (const sx of [-1, 1]) {
        limbBetween(W, [-sx * 0.2, g.shY - 0.36, -0.25], [sx * 0.22, g.shY + 0.3, -0.27], 0.012, 0.012, '#3a2a1a', { seg: 5 });
        coneAlong(W, G3.spike(), [sx * 0.22, g.shY + 0.3, -0.27], [sx * 0.6, 1, 0], 0.09, 0.07, F.m, { shine: 1 });
      }
    },
    waffe(W, F) {
      crescent3(W, [0, 0.05, 0], 0.05, 0.009, Math.PI / 2, 2.6, F.m);
      W(sphere3(0.013, 6, 4), F.a, e80Glow({ p: [0, 0.08, 0.01] }));
    }
  },
  zenith: {
    helm(H, F) {
      H(G3.feather(), F.m, { p: [0, 0.9, -0.05], r: [-0.25, 0, 0], s: [2.2, 1.0, 1.4], top: '#fff6d8', topK: 0.5, shine: 1 });
      H(G3.disc(), F.m, { p: [0, 0.62, 0.98], s: [0.22, 0.22, 0.6], shine: 1 });
      H(G3.gem(), F.a, e80Glow({ p: [0, 0.62, 1.04], s: [0.1, 0.1, 0.06] }));
    },
    schulter(S, sx, F) {
      for (let k = 0; k < 3; k++) S(G3.scale(), k === 1 ? F.c : F.m, { p: [sx * (0.03 + k * 0.02), 0.08 + k * 0.012, (k - 1) * 0.04], s: [0.06, 0.07, 0.05], r: [0, 0, sx * (0.6 + k * 0.25)], shine: 1 });
    },
    brust(W, g, F) {
      const [y, z] = e80Chest(g, 0.05);
      W(G3.disc(), F.m, { p: [0, y, z + 0.008], s: [0.03, 0.03, 0.12], shine: 1 });
      W(G3.gem(), F.a, e80Glow({ p: [0, y, z + 0.016], s: [0.013, 0.013, 0.008] }));
    },
    ruecken(W, g, F) {
      for (const sx of [-1, 1]) wing3(W, [sx * 0.11, g.shY + 0.02, -0.24], sx, 4, 0.42, F.m, '#fff6d8', { shine: 1 }, -0.3);
    },
    waffe(W, F) {
      W(G3.disc(), F.m, { p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0], s: [0.045, 0.045, 0.2], shine: 1 });
      W(G3.gem(), F.a, e80Glow({ p: [0, 0.05, 0], s: [0.016, 0.016, 0.016] }));
    }
  },
  blossom: {
    helm(H, F) {
      const flower = (at, s) => {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          H(G3.feather(), k % 2 ? F.a : '#ffe0ee', { p: at, r: [0, 0, a], s: [s * 1.5, s, s], shine: 0.5 });
        }
        H(sphere3(s * 0.22, 8, 6), '#fff2b0', e80Glow({ p: [at[0], at[1], at[2] + 0.02] }));
      };
      flower([0.72, 0.72, 0.52], 0.32);
      flower([0.92, 0.38, 0.35], 0.2);
      flower([-0.82, 0.62, 0.42], 0.22);
    },
    schulter(S, sx, F) {
      for (let k = 0; k < 5; k++) S(G3.feather(), k % 2 ? F.a : '#ffe0ee', { p: [sx * 0.04, 0.1, 0.02], r: [Math.PI / 2 - 0.2, 0, (k / 5) * Math.PI * 2], s: [0.07, 0.05, 0.05], shine: 0.5 });
      S(sphere3(0.012, 6, 4), '#fff2b0', e80Glow({ p: [sx * 0.04, 0.11, 0.02] }));
    },
    brust(W, g, F) {
      const [y, z] = e80Chest(g, 0.06);
      for (let k = 0; k < 5; k++) W(G3.feather(), k % 2 ? F.a : '#ffe0ee', { p: [-0.05, y, z + 0.008], r: [0, 0, (k / 5) * Math.PI * 2], s: [0.04, 0.026, 0.026], shine: 0.5 });
      W(sphere3(0.008, 6, 4), '#fff2b0', e80Glow({ p: [-0.05, y, z + 0.014] }));
    },
    ruecken(W, g, F) {
      curvedHorn3(W, [[-0.16, g.shY - 0.3, -0.25], [-0.08, g.shY + 0.02, -0.28], [0.06, g.shY + 0.26, -0.27], [0.2, g.shY + 0.36, -0.22]], 0.02, '#6a4a3a', { shine: 0.2 });
      for (const [x, dy] of [[-0.06, 0.06], [0.07, 0.26], [0.2, 0.36]]) {
        for (let k = 0; k < 5; k++) W(G3.feather(), k % 2 ? F.a : '#ffe0ee', { p: [x, g.shY + dy, -0.29], r: [0, 0, (k / 5) * Math.PI * 2], s: [0.06, 0.04, 0.04], shine: 0.5 });
      }
    },
    waffe(W, F) {
      for (let k = 0; k < 5; k++) W(G3.feather(), k % 2 ? F.a : '#ffe0ee', { p: [0, 0.04, 0.02], r: [0, 0, (k / 5) * Math.PI * 2], s: [0.05, 0.035, 0.035], shine: 0.5 });
    }
  },
  bastion: {
    helm(H, F) {
      for (let k = -2; k <= 2; k++) H(roundBox(0.2, 0.26, 0.2, 0.03), F.m, { p: [0, 1.0, k * 0.26], shine: 0.7 });
      H(roundBox(0.24, 0.12, 1.25, 0.04), F.m, { p: [0, 0.86, 0], shine: 0.7 });
      H(roundBox(0.6, 0.06, 0.04, 0.02), F.a, e80Glow({ p: [0, 0.2, 1.02] }));
    },
    schulter(S, sx, F) {
      S(roundBox(0.1, 0.035, 0.13, 0.01), F.m, { p: [sx * 0.04, 0.1, 0], r: [0, 0, sx * 0.35], shine: 0.7 });
      for (const z of [-0.04, 0.04]) S(roundBox(0.03, 0.035, 0.03, 0.006), F.m, { p: [sx * 0.05, 0.13, z], r: [0, 0, sx * 0.35], shine: 0.7 });
    },
    brust(W, g, F) {
      const [y, z] = e80Chest(g, 0.03);
      W(roundBox(0.07, 0.08, 0.014, 0.006), F.m, { p: [0, y, z + 0.006], shine: 0.8 });
      W(roundBox(0.012, 0.04, 0.004, 0.002), F.a, e80Glow({ p: [0, y, z + 0.014] }));
    },
    ruecken(W, g, F) {
      for (const sx of [-1, 1]) {
        W(roundBox(0.07, 0.34, 0.06, 0.012), F.m, { p: [sx * 0.11, g.shY + 0.0, -0.27], shine: 0.6 });
        for (const dx of [-0.022, 0.022]) W(roundBox(0.022, 0.04, 0.06, 0.006), F.m, { p: [sx * 0.11 + dx, g.shY + 0.19, -0.27], shine: 0.6 });
        W(roundBox(0.014, 0.05, 0.004, 0.002), F.a, e80Glow({ p: [sx * 0.11, g.shY + 0.06, -0.304] }));
      }
    },
    waffe(W, F) {
      W(roundBox(0.09, 0.03, 0.04, 0.008), F.m, { p: [0, 0.035, 0], shine: 0.8 });
      W(G3.gem(), F.a, e80Glow({ p: [0, 0.035, 0.024], s: [0.012, 0.012, 0.008] }));
    }
  },
  chains: {
    helm(H, F) {
      for (const sx of [-1, 1]) curvedHorn3(H, [[sx * 0.55, 0.6, 0.2], [sx * 0.86, 0.88, 0.05], [sx * 0.92, 1.18, -0.18], [sx * 0.74, 1.36, -0.36]], 0.11, F.m, { shine: 0.6 });
      for (let k = 0; k < 7; k++) {
        const t = k / 6;
        H(torus3(0.07, 0.018, Math.PI * 2, 3, 8), '#8e8496', { p: [-0.6 + t * 1.2, 0.5 - Math.sin(t * Math.PI) * 0.3, -0.85], r: [0, k % 2 ? Math.PI / 2 : 0, Math.PI / 2], shine: 0.8 });
      }
      H(G3.gem(), F.a, e80Glow({ p: [0, 0.5, 0.98], s: [0.07, 0.1, 0.05] }));
    },
    schulter(S, sx, F) {
      for (let k = 0; k < 4; k++) S(torus3(0.016, 0.004, Math.PI * 2, 3, 8), '#8e8496', { p: [sx * (0.0 + k * 0.03), 0.1 - Math.sin((k / 3) * Math.PI) * 0.03, 0.05], r: [0, k % 2 ? Math.PI / 2 : 0, Math.PI / 2], shine: 0.8 });
      coneAlong(S, horn3(1, 0.3, 5), [sx * 0.05, 0.1, -0.02], [sx * 0.4, 1, -0.2], 0.1, 0.06, F.m, { shine: 0.6 });
    },
    brust(W, g, F) {
      for (const d of [-1, 1]) {
        for (let k = 0; k < 6; k++) {
          const t = k / 5;
          const y = g.chestY + 0.11 - t * 0.2;
          const z = torsoAt3(g, y)[1] + 0.012;
          W(torus3(0.012, 0.0035, Math.PI * 2, 3, 8), '#8e8496', { p: [d * (-0.1 + t * 0.2), y, z], r: [0, k % 2 ? Math.PI / 2 : 0, d * 0.8], shine: 0.8 });
        }
      }
      const [y, z] = e80Chest(g, 0.01);
      W(sphere3(0.014, 8, 6), F.a, e80Glow({ p: [0, y, z + 0.02] }));
    },
    ruecken(W, g, F) {
      for (const sx of [-1, 1]) {
        coneAlong(W, horn3(1, 0.3, 5), [sx * 0.1, g.shY + 0.1, -0.3], [sx * 0.5, 1, -0.5], 0.26, 0.09, '#5a4e58', { shine: 0.6 });
        W(sphere3(0.018, 6, 4), F.a, e80Glow({ p: [sx * 0.1, g.shY + 0.1, -0.31] }));
        for (let k = 0; k < 6; k++) W(torus3(0.024, 0.006, Math.PI * 2, 3, 8), '#9a90a4', { p: [sx * (0.17 - k * 0.06), g.shY + 0.12 - k * 0.06, -0.32], r: [0, k % 2 ? Math.PI / 2 : 0, sx * 0.8], shine: 0.9 });
      }
    },
    waffe(W, F) {
      for (let k = 0; k < 4; k++) W(torus3(0.014, 0.004, Math.PI * 2, 3, 8), '#8e8496', { p: [0.02, -0.02 - k * 0.025, 0.02], r: [0, k % 2 ? Math.PI / 2 : 0, 0], shine: 0.8 });
      W(sphere3(0.01, 6, 4), F.a, e80Glow({ p: [0.02, -0.13, 0.02] }));
    }
  },
  wyrm: {
    helm(H, F) {
      for (const sx of [-1, 1]) curvedHorn3(H, [[sx * 0.45, 0.66, 0.35], [sx * 0.62, 0.92, 0.0], [sx * 0.6, 1.02, -0.45], [sx * 0.42, 0.98, -0.9]], 0.12, F.m, { shine: 0.7 });
      for (let k = 0; k < 4; k++) H(G3.scale(), F.c, { p: [0, 0.98 - k * 0.04, 0.3 - k * 0.3], s: [0.1, 0.12, 0.14], r: [-0.6 - k * 0.3, 0, 0], shine: 0.8 });
      H(G3.gem(), F.a, e80Glow({ p: [0, 0.45, 0.98], s: [0.06, 0.09, 0.05] }));
    },
    schulter(S, sx, F) {
      for (let k = 0; k < 3; k++) S(G3.scale(), k === 1 ? F.c : F.m, { p: [sx * (0.03 + k * 0.025), 0.085 - k * 0.012, (k - 1) * 0.035], s: [0.055, 0.06, 0.05], r: [0, 0, sx * (0.5 + k * 0.3)], shine: 0.9 });
      coneAlong(S, horn3(1, 0.3, 5), [sx * 0.05, 0.1, 0], [sx * 0.5, 1, -0.3], 0.09, 0.05, F.m, { shine: 0.7 });
    },
    brust(W, g, F) {
      const [y, z] = e80Chest(g, 0.05);
      for (const [x, dy] of [[0, 0], [-0.025, -0.022], [0.025, -0.022]]) W(G3.scale(), F.m, { p: [x, y + dy, z + 0.006], s: [0.02, 0.022, 0.012], r: [Math.PI / 2, 0, 0], shine: 0.9 });
      W(G3.gem(), F.a, e80Glow({ p: [0, y + 0.01, z + 0.014], s: [0.01, 0.016, 0.008] }));
    },
    ruecken(W, g, F) {
      // Rückenkamm über dem Umhang: Stacheln vom Nacken abwärts, nach hinten oben gerichtet
      for (let k = 0; k < 5; k++) {
        const y = g.shY + 0.18 - k * 0.1;
        coneAlong(W, G3.spike(), [0, y, -0.3], [0, 0.7, -1], 0.17 - k * 0.02, 0.1, '#8a78c8', { shine: 0.8 });
        coneAlong(W, G3.spike(), [0, y, -0.31], [0, 0.7, -1], 0.09 - k * 0.01, 0.045, F.a, e80Glow());
      }
    },
    waffe(W, F) {
      for (const sx of [-1, 1]) coneAlong(W, horn3(1, 0.3, 5), [sx * 0.02, 0.03, 0], [sx * 0.8, 0.6, 0], 0.07, 0.05, F.m, { shine: 0.7 });
      W(G3.gem(), F.a, e80Glow({ p: [0, 0.04, 0.02], s: [0.014, 0.02, 0.01] }));
    }
  },
  titan: {
    helm(H, F) {
      coneAlong(H, G3.spike(), [0, 0.86, 0.58], [0, 1, 0.55], 0.55, 0.4, '#8a8478', { shine: 0.2 });
      H(torus3(0.62, 0.06, Math.PI * 2, 4, 18), F.m, { p: [0, 0.78, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
      for (const sx of [-1, 1]) H(roundBox(0.24, 0.3, 0.24, 0.08), '#8a8478', { p: [sx * 0.8, 0.5, -0.1], shine: 0.2 });
      H(G3.gem(), F.a, e80Glow({ p: [0, 0.62, 0.96], s: [0.06, 0.08, 0.05] }));
    },
    schulter(S, sx, F) {
      S(roundBox(0.11, 0.07, 0.12, 0.03), '#8a8478', { p: [sx * 0.04, 0.12, 0], r: [0.1, 0.2, sx * 0.3], shine: 0.2 });
      S(roundBox(0.115, 0.018, 0.125, 0.006), F.m, { p: [sx * 0.04, 0.115, 0], r: [0.1, 0.2, sx * 0.3], shine: 1 });
    },
    brust(W, g, F) {
      const [y, z] = e80Chest(g, 0.03);
      W(roundBox(0.08, 0.07, 0.016, 0.01), '#8a8478', { p: [0, y, z + 0.006], r: [0, 0, 0.05], shine: 0.2 });
      for (const x of [-0.03, 0.03]) W(sphere3(0.007, 6, 4), F.m, { p: [x, y + 0.025, z + 0.015], shine: 1 });
      W(G3.gem(), F.a, e80Glow({ p: [0, y - 0.005, z + 0.016], s: [0.01, 0.014, 0.008] }));
    },
    ruecken(W, g, F) {
      for (const sx of [-1, 1]) {
        W(roundBox(0.09, 0.4, 0.06, 0.03), '#8a8478', { p: [sx * 0.12, g.shY + 0.04, -0.27], r: [0, 0, -sx * 0.18], shine: 0.2 });
        W(roundBox(0.095, 0.02, 0.065, 0.006), F.m, { p: [sx * 0.115, g.shY + 0.0, -0.27], r: [0, 0, -sx * 0.18], shine: 1 });
      }
    },
    waffe(W, F) {
      W(roundBox(0.05, 0.05, 0.05, 0.015), '#8a8478', { p: [0, -0.2, 0], shine: 0.2 });
      W(torus3(0.03, 0.006, Math.PI * 2, 3, 10), F.m, { p: [0, -0.2, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
    }
  }
};
const e80Look = (it) => {
  const F = e80Fam(it);
  return F ? { F, L: E80_LOOK[F.motif] } : null;
};
if (typeof playerConfig3 === 'function') {
  const _e80Config = playerConfig3;
  // eslint-disable-next-line no-global-assign
  playerConfig3 = function (p) {
    const c = _e80Config(p);
    if (!p || !c) return c;
    const eq = p.equipment || {};
    // Prägung und Färbung der Waffen als ein Schlüssel „prägung|farbe“ (weapon3 unten liest ihn)
    const wkey = (it) => (e80Fam(it) || e80Dye(it) ? (e80Fam(it) ? it.v80 : '') + '|' + (e80Dye(it) ? it.dye : '') : null);
    if (c.weapon && eq.waffe && wkey(eq.waffe)) c.weapon.v80 = wkey(eq.waffe);
    if (c.offhand && eq.schild && wkey(eq.schild)) c.offhand.v80 = wkey(eq.schild);
    const teil = { helm: e80Look(eq.helm), schultern: e80Look(eq.schultern), ruestung: e80Look(eq.ruestung), umhang: e80Look(eq.umhang) };
    if (!teil.helm && !teil.schultern && !teil.ruestung && !teil.umhang) return c;
    if (teil.helm) {
      const hg = c.headgear;
      c.headgear = (A, hb, hc, hr, spin) => {
        if (hg) hg(A, hb, hc, hr, spin);
        teil.helm.L.helm(sub3(headFrame3(A, hb, hc, hr), [0, 0, 0], [0, 0, 0], 1.15), teil.helm.F);
      };
    }
    const gear = c.gear;
    c.gear = (A, g) => {
      if (gear) gear(A, g);
      if (g.belly) return;
      const W = frame3(A, BH.chest, [0, 0, 0]);
      if (teil.ruestung) teil.ruestung.L.brust(W, g, teil.ruestung.F);
      if (teil.umhang) teil.umhang.L.ruecken(W, g, teil.umhang.F);
      if (teil.schultern) for (const [sx, ab] of [[1, BH.armL], [-1, BH.armR]]) teil.schultern.L.schulter(frame3(A, ab, [sx * (g.shX + 0.045), g.shY + 0.075, 0]), sx, teil.schultern.F);
    };
    return c;
  };
}
if (typeof weapon3 === 'function') {
  const _e80Weapon3 = weapon3;
  // eslint-disable-next-line no-global-assign
  weapon3 = function (A, kind, tier, bone, at, rot, wg, o = {}) {
    const [fid, did] = o && typeof o.v80 === 'string' ? o.v80.split('|') : [];
    const F = e80Has(E80_FAM, fid) ? E80_FAM[fid] : null;
    const D = e80Has(E80_DYES, did) ? E80_DYES[did] : null;
    // Waffe in den Farben der Prägung bzw. Färbung: Metall und Griff zum Metallton, Leuchtteile zur Leuchtfarbe
    const tint = (col, oo) => {
      if (typeof col !== 'string' || col[0] !== '#' || col.length !== 7) return col;
      if (oo && oo.mat === 'wglow') return col;
      if (oo && oo.mat === 'glow') return F ? mixColor(col, F.a, 0.6) : col;
      return mixColor(col, D ? D.c : F.m, D ? 0.55 : 0.45);
    };
    const A2 = F || D ? (geo, col, oo) => A(geo, tint(col, oo), oo) : A;
    const r = _e80Weapon3(A2, kind, tier, bone, at, rot, wg, o);
    const L = F && E80_LOOK[F.motif];
    if (!L) return r;
    const M = partFrame(at, rot);
    if (o.left) M.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    const len = (typeof WEAPON_LEN3 !== 'undefined' && WEAPON_LEN3[kind]) || 0.6;
    // Bogen, Fächer und Glocke: das Merkmal sitzt am Griff
    L.waffe(framed(A, M, bone), F, kind === 'bow' || kind === 'fan' || kind === 'bell' ? 0.12 : len, kind);
    return r;
  };
}

// --- Mehrspieler: Prägung, Farbe und Veredelung reisen mit ----------------------------------------------------------
if (typeof netPlayerState === 'function') {
  const _e80Net = netPlayerState;
  // eslint-disable-next-line no-global-assign
  netPlayerState = function () {
    const s = _e80Net();
    const eq = (game.player && game.player.equipment) || {};
    if (s && s.eq) {
      for (const sl of Object.keys(s.eq)) {
        const it = eq[sl];
        if (!it) continue;
        if (e80Fam(it)) s.eq[sl].v80 = it.v80;
        if (e80Dye(it)) s.eq[sl].dye = it.dye;
        if (e80Ved(it)) s.eq[sl].ved = e80Ved(it);
      }
    }
    return s;
  };
}
if (typeof itemClean === 'function') {
  const _e80Clean = itemClean;
  // eslint-disable-next-line no-global-assign
  itemClean = function (raw) {
    const it = _e80Clean(raw);
    if (!it || it.book != null || !raw) return it;
    const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
    if (it.tier === E80.tier && !e80IsSet(it)) {
      if (e80Has(E80_FAM, raw.v80)) it.v80 = raw.v80;
      if (e80Has(E80_DYES, raw.dye)) it.dye = raw.dye;
    }
    if (it.tier === E80.tier && int(raw.ved, 1, E80.ved.max)) it.ved = raw.ved;
    if (int(raw.rr, 1, 9999)) it.rr = raw.rr;
    return it;
  };
}

// --- Der Veredler ------------------------------------------------------------------------------------------------
// Kosten
function e80RerollCost(item, special) {
  const R = E80.reroll;
  const tm = R.tierMul[item.tier];
  if (!tm) return null;
  const n = Math.max(0, item.rr | 0);
  return { gold: e80Round(R.base * tm * Math.pow(R.g, n) * (special ? R.special : 1)), mat: special ? 'switch67' : 'switcher', n: n + 1 };
}
function e80VedCost(item) {
  const v = e80Ved(item);
  if (!item || item.tier !== E80.tier || v >= E80.ved.max) return null;
  return { gold: E80.ved.gold[v], cores: E80.ved.cores[v], splinters: E80.ved.splinters[v], to: v + 1 };
}
const e80CanDye = (item) => !!item && !isBook(item) && item.tier === E80.tier && !e80IsSet(item);
// Neu würfeln: Bonus i (0–4 normal, 5–6 besonders); mode 'all' = Art und Wert, 'value' = nur Wert
function e80Reroll(item, i, mode) {
  const p = game.player;
  if (!item || isBook(item) || !item.slot) return { error: 'Kein Gegenstand gewählt.' };
  const special = i >= MAX_NORMAL_BONUS;
  const list = special ? item.specials || [] : item.bonuses || [];
  const k = special ? i - MAX_NORMAL_BONUS : i;
  const old = list[k];
  if (!old) return { error: 'Diesen Bonus hat der Gegenstand nicht.' };
  const cost = e80RerollCost(item, special);
  if (!cost) return { error: 'Neu würfeln geht erst bei Ausrüstung ab Stufe 60.' };
  if (p.gold < cost.gold) return { error: `Dir fehlen ${(cost.gold - p.gold).toLocaleString('de-DE')} Gold.` };
  if (!(p.materials[cost.mat] > 0)) return { error: `Dafür brauchst du einen ${matDef(cost.mat).name}.` };
  bonusUmstellen(item);
  let nb;
  if (mode === 'value') {
    const d = (special ? SPECIAL_BONUS_TYPES : BONUS_TYPES)[old.t];
    if (!d) return { error: 'Dieser Bonus lässt sich nicht neu würfeln.' };
    nb = { t: old.t, v: bonusValue(d, item.tier) };
  } else {
    // Art und Wert: der alte Bonus kommt kurz aus der Liste, damit auch dieselbe Art wieder kommen kann
    list.splice(k, 1);
    nb = rollBonus(item, special);
    list.splice(k, 0, old);
    if (!nb || !nb.t) return { error: 'Für diesen Platz gibt es keinen anderen Bonus.' };
  }
  p.gold -= cost.gold;
  p.materials[cost.mat]--;
  list[k] = nb;
  item.rr = (item.rr | 0) + 1;
  clampItemBonuses(item);
  afterGearChange();
  return { old: { ...old }, now: { ...list[k] }, special, k, cost };
}
function e80Undo(item, u) {
  if (!item || !u) return false;
  const list = u.special ? item.specials : item.bonuses;
  if (!list || !list[u.k] || list[u.k].t !== u.now.t || list[u.k].v !== u.now.v) return false;
  // die alte Art darf nicht inzwischen woanders auf dem Teil stehen
  if (list.some((b, j) => j !== u.k && b.t === u.old.t)) return false;
  list[u.k] = { ...u.old };
  afterGearChange();
  return true;
}
function e80Veredeln(item) {
  const p = game.player;
  const c = e80VedCost(item);
  if (!c) return { error: item && item.tier === E80.tier ? 'Dieses Teil ist schon voll veredelt.' : 'Veredeln geht nur bei Ewig-Ausrüstung (Stufe 80).' };
  if (p.gold < c.gold) return { error: `Dir fehlen ${(c.gold - p.gold).toLocaleString('de-DE')} Gold.` };
  if ((p.materials.aetherkern || 0) < c.cores) return { error: `Dir fehlen ${c.cores - (p.materials.aetherkern || 0)} Ätherkerne.` };
  if ((p.splinters || 0) < c.splinters) return { error: `Dir fehlen ${c.splinters - (p.splinters || 0)} Seelensplitter.` };
  p.gold -= c.gold;
  p.materials.aetherkern -= c.cores;
  p.splinters -= c.splinters;
  item.ved = c.to;
  afterGearChange();
  return { to: c.to };
}
function e80Faerben(item, dyeId) {
  const p = game.player;
  if (!e80CanDye(item)) return { error: 'Färben geht nur bei Ewig-Ausrüstung (Stufe 80) ohne Set.' };
  if (dyeId != null && !e80Has(E80_DYES, dyeId)) return { error: 'Diese Farbe gibt es nicht.' };
  if ((item.dye || null) === (dyeId || null)) return { error: 'Das Teil hat diese Farbe schon.' };
  if (p.gold < E80.dye.gold) return { error: `Dir fehlen ${(E80.dye.gold - p.gold).toLocaleString('de-DE')} Gold.` };
  p.gold -= E80.dye.gold;
  if (dyeId) item.dye = dyeId; else delete item.dye;
  afterGearChange();
  return { ok: true };
}

// Fenster
const e80Ui = { ref: null, tab: 'reroll', sel: 0, undo: null, dye: null, msg: '', msgCls: '' };
function e80Css() {
  if (document.getElementById('e80Css')) return;
  const st = document.createElement('style');
  st.id = 'e80Css';
  st.textContent = `
.e80-line { display: block; margin-top: 2px; font-size: 11.5px; line-height: 1.35; color: var(--muted); }
.e80-line b { font-weight: 700; }
.e80-ved b { color: #9fe8ff; letter-spacing: 1px; }
.e80-dye i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; border: 2px solid; vertical-align: -1px; margin: 0 3px; }
.e80 { display: flex; flex-direction: column; gap: 8px; }
.e80 > p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.35; }
.e80-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: 10px; align-items: start; }
.e80-pick h3, .e80-work h3 { margin: 2px 0 6px; font-size: 14px; }
.e80-pick .smith-list { max-height: 46vh; overflow-y: auto; }
.e80-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.e80-tabs button { flex: 1 1 0; min-height: 40px; padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(201,162,74,.4); background: rgba(0,0,0,.28); color: #f3e3b5; font: inherit; font-size: 13px; cursor: pointer; }
.e80-tabs button.on { background: rgba(201,162,74,.28); border-color: #e8c46a; color: #fff; }
.e80-tabs button:disabled { opacity: .4; cursor: default; }
.e80-head { display: flex; gap: 10px; align-items: center; background: rgba(0,0,0,.25); border: 1px solid rgba(201,162,74,.3); border-radius: 8px; padding: 6px 8px; }
.e80-head img { width: 56px; height: 56px; flex: none; }
.e80-head div { min-width: 0; display: flex; flex-direction: column; }
.e80-head strong { font-size: 15px; }
.e80-bons { display: flex; flex-direction: column; gap: 4px; margin: 6px 0; }
.e80-bons button { display: flex; align-items: center; gap: 8px; min-height: 40px; text-align: left; padding: 6px 9px; border-radius: 8px; border: 1px solid rgba(255,255,255,.12); background: rgba(0,0,0,.25); color: #ece2cb; font: inherit; font-size: 13px; cursor: pointer; }
.e80-bons button.on { border-color: #e8c46a; background: rgba(232,196,106,.16); }
.e80-bons button.special { color: #ffd34d; }
.e80-bons .bn { flex: none; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.1); font-size: 11px; }
.e80-row { display: flex; gap: 6px; flex-wrap: wrap; }
.e80-row .btn { flex: 1 1 150px; min-height: 42px; }
.e80-msg { min-height: 1.2em; font-size: 13px; color: #b8f0a0; }
.e80-msg.warn { color: #ff9a8a; }
.e80-undo { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; background: rgba(0,0,0,.25); border: 1px dashed rgba(201,162,74,.45); border-radius: 8px; padding: 6px 8px; font-size: 13px; }
.e80-undo .mini-btn { min-height: 36px; }
.e80-steps { display: flex; gap: 4px; font-size: 20px; color: #5a6a7a; letter-spacing: 2px; }
.e80-steps b { color: #9fe8ff; }
.e80-dyes { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 6px; }
.e80-dyes button { display: flex; flex-direction: column; align-items: center; gap: 3px; min-height: 58px; padding: 6px 4px; border-radius: 8px; border: 1px solid rgba(255,255,255,.14); background: rgba(0,0,0,.25); color: #ece2cb; font: inherit; font-size: 12px; cursor: pointer; }
.e80-dyes button.on { border-color: #e8c46a; background: rgba(232,196,106,.16); }
.e80-dyes i { width: 26px; height: 26px; border-radius: 6px; border: 3px solid; }
.e80-prev { display: flex; gap: 10px; align-items: center; }
.e80-prev img { width: 64px; height: 64px; }
@media (max-width: 720px) {
  .e80-grid { grid-template-columns: 1fr; }
  .e80-pick .smith-list { max-height: 30vh; }
}`;
  document.head.appendChild(st);
}
function e80Refs(p) {
  const refs = [];
  equipSlotsFor(p.classId).forEach((sl) => { const it = p.equipment[sl.id]; if (it && it.tier >= E80.reroll.minTier) refs.push({ where: 'equip', key: sl.id }); });
  p.inventory.forEach((it, i) => { if (it && !isBook(it) && it.slot && it.tier >= E80.reroll.minTier) refs.push({ where: 'bag', key: i }); });
  return refs;
}
const e80Fmt = (n) => Math.round(n || 0).toLocaleString('de-DE');
function e80Chip(icon, big, small, ok) {
  return `<div class="cost-chip${ok ? '' : ' lack'}"><img src="${icon}" alt=""><b>${big}</b><small>${small}</small></div>`;
}
function e80Render() {
  const p = game.player;
  const body = $('npcBody');
  if (!p || !body) return;
  e80Css();
  const refs = e80Refs(p);
  const same = (a, b) => a && b && a.where === b.where && a.key === b.key;
  if (e80Ui.ref && !refs.some((r) => same(r, e80Ui.ref))) e80Ui.ref = null;
  if (!e80Ui.ref && refs.length) e80Ui.ref = refs[0];
  const item = e80Ui.ref ? itemAt(e80Ui.ref) : null;
  const tiles = refs.map((r) => {
    const it = itemAt(r);
    const label = r.where === 'equip' ? slotLabel(r.key, p) : undefined;
    return gear.tile(it, `data-e80ref="${r.where}:${r.key}" class-sel="${same(r, e80Ui.ref)}"`, label, r.where === 'equip' ? r.key : undefined);
  }).join('');
  const lv80 = item && item.tier === E80.tier;
  if (!lv80 && e80Ui.tab !== 'reroll') e80Ui.tab = 'reroll';
  if (lv80 && e80Ui.tab === 'dye' && !e80CanDye(item)) e80Ui.tab = 'reroll';
  const tab = (id, name, ok) => `<button type="button" data-e80tab="${id}" class="${e80Ui.tab === id ? 'on' : ''}" ${ok ? '' : 'disabled'}>${name}</button>`;
  let work = '';
  if (!item) work = '<p class="hint-text">Du hast keine Ausrüstung ab Stufe 60. Der Veredler arbeitet nur an starken Teilen.</p>';
  else {
    work = `<div class="e80-head"><img src="${itemIconUrl(item)}" alt=""><div><strong style="color:${itemColor(item)}">${itemFullName(item)}</strong>${rarityLineHtml(item)}${setLineHtml(item)}</div></div>` +
      `<div class="e80-tabs">${tab('reroll', 'Bonus neu würfeln', true)}${tab('ved', 'Veredeln', lv80)}${tab('dye', 'Färben', e80CanDye(item))}</div>`;
    if (e80Ui.tab === 'reroll') work += e80RerollHtml(item, p);
    else if (e80Ui.tab === 'ved') work += e80VedHtml(item, p);
    else work += e80DyeHtml(item, p);
  }
  body.innerHTML = `<div class="e80"><p>„Gold allein macht niemanden stark – aber in meinen Händen wird es zu Glanz. Ich würfle einzelne Boni neu, veredle ewige Ausrüstung und gebe ihr eine neue Farbe. Billig ist das nicht.“</p>` +
    `<div class="e80-grid"><section class="e80-pick"><h3>Ausrüstung ab Stufe 60</h3><div class="smith-list">${tiles || '<p class="hint-text">Nichts dabei.</p>'}</div></section>` +
    `<section class="e80-work">${work}<div class="e80-msg${e80Ui.msgCls ? ' ' + e80Ui.msgCls : ''}">${e80Ui.msg || ''}</div></section></div>` +
    `<p class="hint-text">Gold: <b>${e80Fmt(p.gold)}</b> · Switcher ${p.materials.switcher || 0} · Sternen-Switcher ${p.materials.switch67 || 0} · Ätherkerne ${p.materials.aetherkern || 0} · Seelensplitter ${e80Fmt(p.splinters)}</p></div>`;
  body.querySelectorAll('[data-e80ref]').forEach((b) => {
    if (b.getAttribute('class-sel') === 'true') b.classList.add('selected');
    b.addEventListener('click', () => {
      const [where, key] = b.dataset.e80ref.split(':');
      e80Ui.ref = { where, key: where === 'bag' ? Number(key) : key };
      e80Ui.sel = 0; e80Ui.undo = null; e80Ui.dye = null; e80Ui.msg = '';
      e80Render();
    });
  });
  body.querySelectorAll('[data-e80tab]').forEach((b) => b.addEventListener('click', () => { e80Ui.tab = b.dataset.e80tab; e80Ui.msg = ''; e80Render(); }));
  body.querySelectorAll('[data-e80bon]').forEach((b) => b.addEventListener('click', () => { e80Ui.sel = Number(b.dataset.e80bon); e80Render(); }));
  body.querySelectorAll('[data-e80roll]').forEach((b) => b.addEventListener('click', () => {
    const it = itemAt(e80Ui.ref);
    const r = e80Reroll(it, e80Ui.sel, b.dataset.e80roll);
    if (r.error) { e80Ui.msg = r.error; e80Ui.msgCls = 'warn'; } else {
      e80Ui.undo = { uid: it.uid, k: r.k, special: r.special, old: r.old, now: r.now };
      e80Ui.msg = `Neu gewürfelt: ${bonusText(r.old, r.special)} → ${bonusText(r.now, r.special)}`;
      e80Ui.msgCls = '';
      try { sfx.success(); } catch (e) { /* ohne Ton */ }
    }
    e80Render();
  }));
  const ub = body.querySelector('[data-e80undo]');
  if (ub) ub.addEventListener('click', () => {
    const it = itemAt(e80Ui.ref);
    const ok = it && e80Ui.undo && it.uid === e80Ui.undo.uid && e80Undo(it, e80Ui.undo);
    e80Ui.msg = ok ? `Alter Bonus zurück: ${bonusText(e80Ui.undo.old, e80Ui.undo.special)}` : 'Der alte Bonus lässt sich nicht mehr zurückholen.';
    e80Ui.msgCls = ok ? '' : 'warn';
    e80Ui.undo = null;
    e80Render();
  });
  const vb = body.querySelector('[data-e80ved]');
  if (vb) vb.addEventListener('click', () => {
    const it = itemAt(e80Ui.ref);
    const r = e80Veredeln(it);
    e80Ui.msg = r.error || `Veredelt! ${itemName(it)} hat jetzt Stufe ${r.to} (${e80Pips(r.to)}).`;
    e80Ui.msgCls = r.error ? 'warn' : '';
    if (!r.error) { try { sfx.success(); } catch (e) { /* ohne Ton */ } }
    e80Render();
  });
  body.querySelectorAll('[data-e80dye]').forEach((b) => b.addEventListener('click', () => { e80Ui.dye = b.dataset.e80dye; e80Render(); }));
  const db = body.querySelector('[data-e80dyego]');
  if (db) db.addEventListener('click', () => {
    const it = itemAt(e80Ui.ref);
    const id = e80Ui.dye === 'keine' ? null : e80Ui.dye;
    const r = e80Faerben(it, id);
    e80Ui.msg = r.error || (id ? `Gefärbt: ${E80_DYES[id].name}.` : 'Die ursprüngliche Farbe ist zurück.');
    e80Ui.msgCls = r.error ? 'warn' : '';
    if (!r.error) { e80Ui.dye = null; try { sfx.success(); } catch (e) { /* ohne Ton */ } }
    e80Render();
  });
}
function e80RerollHtml(item, p) {
  const bons = (item.bonuses || []).map((b, i) => ({ b, i, special: false })).concat((item.specials || []).map((b, j) => ({ b, i: MAX_NORMAL_BONUS + j, special: true })));
  if (!bons.length) return '<p class="hint-text">Dieses Teil hat noch keine Boni. Boni kommen mit Verstärkungen und Sternensteinen dazu.</p>';
  if (!bons.some((x) => x.i === e80Ui.sel)) e80Ui.sel = bons[0].i;
  const cur = bons.find((x) => x.i === e80Ui.sel);
  const cost = e80RerollCost(item, cur.special);
  const mat = matDef(cost.mat);
  const have = p.materials[cost.mat] || 0;
  const list = bons.map((x) => `<button type="button" data-e80bon="${x.i}" class="${x.i === e80Ui.sel ? 'on' : ''}${x.special ? ' special' : ''}"><span class="bn">${x.i + 1}</span><span>${bonusText(x.b, x.special)}</span></button>`).join('');
  const ok = p.gold >= cost.gold && have > 0;
  const undo = e80Ui.undo && e80Ui.undo.uid === item.uid
    ? `<div class="e80-undo"><span>Vorher: <b>${bonusText(e80Ui.undo.old, e80Ui.undo.special)}</b></span><button type="button" class="mini-btn" data-e80undo="1">Alten Bonus zurückholen</button><small class="hint-text">Die Kosten bleiben weg.</small></div>` : '';
  return `<div class="e80-bons">${list}</div>` +
    `<div class="smith-costs">${e80Chip(lootIconUrl('gold'), e80Fmt(cost.gold) + ' Gold', 'du hast ' + e80Fmt(p.gold), p.gold >= cost.gold)}` +
    `${e80Chip(materialIconUrl(cost.mat), '1 × ' + mat.name, 'du hast ' + have, have > 0)}</div>` +
    `<p class="hint-text">Neuwurf Nr. ${cost.n} an diesem Teil – jeder weitere kostet das ${String(E80.reroll.g).replace('.', ',')}-Fache.${e80Fam(item) ? ' Die Prägung würfelt ihren Schwerpunkt öfter.' : ''}</p>` +
    `<div class="e80-row"><button type="button" class="btn btn-primary" data-e80roll="all" ${ok ? '' : 'disabled'}>Art und Wert neu</button>` +
    `<button type="button" class="btn" data-e80roll="value" ${ok ? '' : 'disabled'}>Nur den Wert neu</button></div>` + undo;
}
function e80VedHtml(item, p) {
  const v = e80Ved(item);
  const steps = `<div class="e80-steps">${Array.from({ length: E80.ved.max }, (_, k) => (k < v ? '<b>◆</b>' : '◇')).join('')}</div>`;
  const c = e80VedCost(item);
  if (!c) return steps + `<p>Voll veredelt: Grundwerte +${Math.round(E80.ved.per * v * 100)} %. Mehr geht nicht.</p>`;
  const now = itemStats(item);
  const next = itemStats(Object.assign({}, item, { ved: c.to }));
  const rows = sortedStats(next).filter(([k]) => ['dmg', 'atk', 'def', 'hp', 'mp'].includes(k)).map(([k, val]) => {
    const label = k === 'dmg' ? 'Schaden' : STAT_LABELS[k];
    const strip = (t) => t.replace(label, '').trim();
    return `<tr><th>${label}</th><td>${strip(statText(k, now[k] != null ? now[k] : 0))}</td><td class="arrow">→</td><td class="up">${strip(statText(k, val))}</td></tr>`;
  }).join('');
  const cores = p.materials.aetherkern || 0;
  const ok = p.gold >= c.gold && cores >= c.cores && p.splinters >= c.splinters;
  return steps + `<p class="hint-text">Stufe ${c.to} von ${E80.ved.max}: Grundwerte +${Math.round(E80.ved.per * c.to * 100)} % (vorher +${Math.round(E80.ved.per * v * 100)} %). Gelingt immer – nichts geht kaputt. Itemlevel ${itemIlvl(item)} → ${itemIlvl(Object.assign({}, item, { ved: c.to }))}.</p>` +
    (rows ? `<table class="smith-delta">${rows}</table>` : '') +
    `<div class="smith-costs">${e80Chip(lootIconUrl('gold'), e80Fmt(c.gold) + ' Gold', 'du hast ' + e80Fmt(p.gold), p.gold >= c.gold)}` +
    `${e80Chip(materialIconUrl('aetherkern'), c.cores + ' × Ätherkern', 'du hast ' + cores, cores >= c.cores)}` +
    `${e80Chip(lootIconUrl('splinter'), c.splinters + ' Seelensplitter', 'du hast ' + e80Fmt(p.splinters), p.splinters >= c.splinters)}</div>` +
    `<div class="e80-row"><button type="button" class="btn btn-primary" data-e80ved="1" ${ok ? '' : 'disabled'}>Veredeln auf Stufe ${c.to}</button></div>`;
}
function e80DyeHtml(item, p) {
  const cur = item.dye && e80Has(E80_DYES, item.dye) ? item.dye : 'keine';
  const pick = e80Ui.dye || cur;
  const prev = Object.assign({}, item);
  if (pick === 'keine') delete prev.dye; else prev.dye = pick;
  const btn = (id, name, c, m) => `<button type="button" data-e80dye="${id}" class="${pick === id ? 'on' : ''}"><i style="background:${c};border-color:${m}"></i><span>${name}${cur === id ? ' ✓' : ''}</span></button>`;
  const F = e80Fam(item);
  const base = F ? [F.c, F.m] : ['#ece6f0', '#bcb8d0'];
  const list = btn('keine', 'Ursprünglich', base[0], base[1]) + Object.entries(E80_DYES).map(([id, D]) => btn(id, D.name, D.c, D.m)).join('');
  const ok = p.gold >= E80.dye.gold && pick !== cur;
  return `<div class="e80-prev"><img src="${itemIconUrl(prev)}" alt=""><p class="hint-text">Nur fürs Aussehen – an der Figur, im Symbol und bei den Mitspielern. Die Werte bleiben gleich.</p></div>` +
    `<div class="e80-dyes">${list}</div>` +
    `<div class="smith-costs">${e80Chip(lootIconUrl('gold'), e80Fmt(E80.dye.gold) + ' Gold', 'du hast ' + e80Fmt(p.gold), p.gold >= E80.dye.gold)}</div>` +
    `<div class="e80-row"><button type="button" class="btn btn-primary" data-e80dyego="1" ${ok ? '' : 'disabled'}>Färben</button></div>`;
}

// In die Welt: neben dem Schmied jeder dieser Städte und Lager (feste Zahlen, alle Mitspieler sehen ihn gleich)
const E80_NPC_NAMES = { 1: 'Veredler Hiroshi', 11: 'Veredlerin Yoru', 10: 'Veredlerin Sayaka', 17: 'Veredler Tsukimi', 18: 'Veredlerin Nami', 19: 'Veredler Asahi' };
function e80Place(w, mapId) {
  const sm = townPlace(mapId, 'schmied');
  if (!sm) return null;
  const S = { x: sm.x + (sm.stand === 'e' ? -2.6 : 2.6), y: sm.y - 2.2 };
  const props = w.props.filter((pr) => Math.abs(pr.x / TILE - S.x) < 12 && Math.abs(pr.y / TILE - S.y) < 12);
  const free = typeof rgFreeAt === 'function' ? rgFreeAt : () => true;
  for (let r = 0; r <= 4; r += 0.5) {
    const steps = r ? Math.max(8, Math.round(r * 8)) : 1;
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      const x = Math.round((S.x + Math.cos(a) * r) * 20) / 20;
      const y = Math.round((S.y + Math.sin(a) * r) * 20) / 20;
      if (typeof inVillage === 'function' && !inVillage(x * TILE, y * TILE)) continue;
      // etwas Abstand zu den anderen Leuten, damit sich die Namen über den Köpfen nicht überdecken
      if (w.npcs.some((n) => !n.wander && Math.hypot(n.x / TILE - x, n.y / TILE - y) < 2.6)) continue;
      if (free(w, x, y, props)) return { x, y };
    }
  }
  return null;
}
if (typeof generateWorld === 'function') {
  const _e80GenerateWorld = generateWorld;
  // eslint-disable-next-line no-global-assign
  generateWorld = function () {
    const w = _e80GenerateWorld.apply(this, arguments);
    for (const mapId of E80.npc.maps) {
      try {
        if (mapId !== 1 && w.maps && !w.maps.some((m) => m.id === mapId)) continue; // Kazehana steht nicht in w.maps
        const at = e80Place(w, mapId);
        if (at) w.npcs.push({ id: E80.npc.id, name: E80_NPC_NAMES[mapId] || 'Veredler', x: at.x * TILE, y: at.y * TILE, r: 11, restYaw: -0.4 });
      } catch (e) {
        console.warn('Veredler: kein Platz auf Map ' + mapId, e);
      }
    }
    return w;
  };
}
// Aussehen: Feinschmied mit Lupe und Lederschürze über einem dunkelblauen Gewand, Goldfäden an den Ärmeln
if (typeof NPC_ART !== 'undefined') {
  NPC_ART[E80.npc.id] = (ctx) => villagerArt(ctx, {
    skin: '#e8c4a0', boots: '#2a2018', robe: '#1e2a48', torso: '#1e2a48', sleeve: '#1e2a48', cuff: '#e8c46a', eyes: {},
    body: (ctx, half) => {
      box(ctx, -half + 1, -14, half * 2 - 2, 10, 1.4, '#6b4a2e');
      box(ctx, -half, -12.8, half * 2, 2.4, 1, '#3a2618');
      dot(ctx, 0, -11.6, 1.5, 1.5, '#e8c46a');
    },
    head: (ctx, cx, cy) => {
      hairCap(ctx, cx, cy, '#3a3030', 10);
      oval(ctx, cx + 3.4, cy + 0.6, 2.2, 2.2, '#9fe8ff');
      stroke(ctx, '#c9a35a', 0.8, [[cx + 5.4, cy + 0.6], [cx + 8, cy - 2]]);
    },
    extra: (ctx) => {
      // kleiner Hammer und ein glänzender Edelstein in der Hand
      stroke(ctx, '#6b4a2e', 1.4, [[6, -12], [9, -18]]);
      box(ctx, 7.4, -20.4, 4, 2.4, 0.6, '#9aa0a8');
      poly(ctx, [[-8, -12], [-6, -14.5], [-4, -12], [-6, -9.5]], '#9fe8ff');
    }
  });
}
if (typeof NPC3 !== 'undefined') {
  NPC3[E80.npc.id] = {
    skin: '#e8c4a0', robe: '#1e2a48', torso: '#1e2a48', sleeve: '#1e2a48', pants: '#2a2018', boots: '#2a2018',
    hemTrim: '#e8c46a', cuff: '#e8c46a', collar: '#e8c46a', apron: '#6b4a2e', belt: '#3a2618',
    hair: { style: 5, color: '#3a3030' }, beard: '#3a3030', weapon: { kind: 'club', tier: 0 }, eyeShape: 3
  };
}
if (typeof NPC_TALK_LABEL !== 'undefined') NPC_TALK_LABEL[E80.npc.id] = 'Veredeln';
if (typeof NPC_LINES !== 'undefined') NPC_LINES[E80.npc.id] = ['Ewige Ausrüstung verdient ewigen Glanz.', 'Ein Bonus gefällt dir nicht? Gib her.'];
if (typeof NPC_ICONS !== 'undefined') {
  // Zeichen über dem Kopf: ein geschliffener Edelstein (Raute mit Facetten)
  NPC_ICONS[E80.npc.id] = (ctx) => {
    poly(ctx, [[-7, -3], [-3.5, -8], [3.5, -8], [7, -3], [0, 8]], '#9fe8ff');
    poly(ctx, [[-7, -3], [7, -3], [0, 8]], '#5ab8e0');
    poly(ctx, [[-3.5, -8], [3.5, -8], [2, -3], [-2, -3]], '#e8fbff');
  };
}
if (typeof ui !== 'undefined' && ui.openNpc) {
  const _e80OpenNpc = ui.openNpc;
  ui.openNpc = function (npc) {
    const r = _e80OpenNpc.call(this, npc);
    if (npc && npc.id === E80.npc.id) {
      e80Ui.ref = null; e80Ui.tab = 'reroll'; e80Ui.sel = 0; e80Ui.undo = null; e80Ui.dye = null; e80Ui.msg = ''; e80Ui.msgCls = '';
      e80Render();
    }
    return r;
  };
}
