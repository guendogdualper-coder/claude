// Tagesbelohnung (seit 6.9): Wer an einem Tag spielt, holt sich einmal eine Belohnung ab.
// Sieben Tage in Folge bilden eine Reihe, Tag 7 ist der große Preis (Heldentruhe). Wer einen Tag auslässt, fängt
// wieder bei Tag 1 an. Die Reihe steht wie bisher in p.daily = { last, streak } – laufende Reihen gehen weiter.
//
// Neu gestaltet: kaum noch Gold und Seelensplitter (davon gibt es genug), dafür Dinge, die zur Stufe passen, nach
// Stufenbändern gestaffelt (DAILY_BANDS). Abgeglichen mit der Dropliste (docs/seelenstein-drops.md): Eine ganze Woche
// entspricht auf Stufe 80 etwa ein bis zwei Stunden Seelensteine (z. B. 4 Ätherkerne ≈ 50 Steine der Stufe 80, ein
// episches Ewig-Teil ≈ ein Instanz-Boss); für Anfänger ist sie ein spürbarer Schub (Erfahrungsringe, Bücher, die
// ersten Verstärkungen, ein episches Teil ihrer Stufe).
//   Tag 1 Proviant            Tränke eine Größe größer (sobald man ihr nahe ist), etwas Gold; Bogen-Ninja: Pfeile
//   Tag 2 Erfahrungsring      1 Erfahrungsring (+25 % EP für 60 min); auf Stufe 80 (keine EP mehr) 1 Ätherkern
//   Tag 3 Wissen der Meister  Fertigkeitsbücher (eigene Fertigkeiten, E1–E10), ab Stufe 40 Schriftrollen (H1–H10)
//   Tag 4 Schmiedekiste       Verstärkungen und Switcher
//   Tag 5 Segen des Schmieds  Segensschriftrollen, ein paar Splitter und Tränke
//   Tag 6 Sternenkiste        Seltene Verstärkung, ab 20 Sternenstein, ab 40 Sternen-Switcher und Ätherkern
//   Tag 7 Heldentruhe         ein episches Teil für die eigene Klasse auf der eigenen Stufe, dazu je Band
//                             Erfahrungsring, Bücher, Schriftrollen, Seelensteine oder Ätherkern; Bogen-Ninja: Pfeile
// Bücher und das Teil brauchen freie Plätze in der Tasche (bagFree: nur nutzbare Seiten). Fehlen sie, bleibt der Tag
// offen und es geht nichts verloren.
//
// Mit Werbung doppelt (seit 15.72): Ohne Werbung gibt es die Hälfte der Liste (aufgerundet, mindestens 1 – dailyScale),
// wer eine kurze Werbung ansieht (werbung.js, 30 s), bekommt das Doppelte davon, also wieder die ganze Liste.
// Ein Ausrüstungsteil bleibt ein Teil. Die Werbung geht vor dem Abholen (dann gleich doppelt) oder danach (dann kommt
// die zweite Hälfte dazu), einmal am Tag. Gemerkt in p.daily: ad = Tag der gesehenen Werbung, x2 = Tag der Verdopplung
// (beides als Datumstext, gilt also nur heute). War die Tasche nach der Werbung zu voll, bleibt die Werbung gezählt.

const DAILY_BANDS = [{ from: 1 }, { from: 20 }, { from: 40 }, { from: 60 }, { from: 80 }];
const dailyBand = (L) => DAILY_BANDS.reduce((b, x, i) => (L >= x.from ? i : b), 0);
function dailyBandText(b) {
  const next = DAILY_BANDS[b + 1];
  return next ? `Stufe ${DAILY_BANDS[b].from}–${next.from - 1}` : `Stufe ${DAILY_BANDS[b].from}`;
}
const dailyPick = (b, list) => list[Math.min(b, list.length - 1)];

// reward(L, b): L = Stufe, b = Stufenband (0 … 4). Schlüssel:
//   gold, splinters, scrolls (Segensschriftrollen), books (Fertigkeitsbücher eigener Fertigkeiten),
//   potions (je Leben und Mana), potUp (eine Größe größer), mats { id: Anzahl } (p.materials: Verstärkungen,
//   Erfahrungsring, Schriftrolle, Seelenstein, Ätherkern …), arrows (Bündel à ARROW_BUNDLE, nur Bogen-Ninja),
//   gear { rarity, plus } (Teil für die eigene Klasse)
const DAILY_DAYS = [
  { name: 'Proviant', icon: 'potion', reward: (L) => ({ potions: 10, potUp: true, gold: Math.max(300, 100 * L), arrows: 1 }) },
  { name: (L) => (L >= MAX_LEVEL ? 'Ätherkern' : 'Erfahrungsring'), icon: (L) => (L >= MAX_LEVEL ? 'aetherkern' : 'epring'),
    reward: (L) => (L >= MAX_LEVEL ? { mats: { aetherkern: 1 }, potions: 5 } : { mats: { epring: 1 } }) },
  { name: 'Wissen der Meister', icon: (L, b) => (b >= 2 ? 'rolle' : 'book'),
    reward: (L, b) => dailyPick(b, [{ books: 2 }, { books: 3 }, { books: 1, mats: { rolle: 2 } }, { mats: { rolle: 3 } }, { mats: { rolle: 4 } }]) },
  { name: 'Schmiedekiste', icon: 'switcher', reward: (L, b) => ({ mats: { boniPlus: 2 + b, switcher: 1 + b } }) },
  { name: 'Segen des Schmieds', icon: 'scroll',
    reward: (L, b) => ({ scrolls: dailyPick(b, [1, 1, 2, 2, 3]), splinters: dailyPick(b, [3, 5, 8, 10, 12]), potions: 5 }) },
  { name: 'Sternenkiste', icon: (L, b) => (b ? 'star' : 'boni5'),
    reward: (L, b) => ({ mats: dailyPick(b, [{ boni5: 1, boniPlus: 2 }, { boni5: 1, star: 1 }, { star: 1, switch67: 1, aetherkern: 1 },
      { star: 1, switch67: 1, aetherkern: 1, boni5: 1 }, { star: 2, switch67: 1, aetherkern: 2 }]) }) },
  { name: 'Heldentruhe', icon: 'chest', big: true,
    reward: (L, b) => Object.assign({ gear: { rarity: 3, plus: dailyPick(b, [1, 1, 2, 2, 2]) }, arrows: 2 },
      dailyPick(b, [{ mats: { epring: 1 }, books: 2 }, { mats: { epring: 1 }, scrolls: 1 }, { mats: { epring: 1, rolle: 2 } },
        { mats: { epring: 1, seelenstein: 1 } }, { mats: { seelenstein: 2, aetherkern: 1 } }])) }
];

// Datum als Text (Gerätezeit) und Abstand zweier Tage
function dailyKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dailyGap(a, b) {
  const t = (k) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 86400000);
}

// Stand heute: welcher Tag der Reihe dran ist und ob schon abgeholt
function dailyState(p = game.player) {
  const d = p.daily || { last: null, streak: 0 };
  const today = dailyKey();
  const adSeen = d.ad === today; // Werbung heute gesehen
  const doubled = d.x2 === today; // heute schon verdoppelt
  if (d.last === today) return { claimed: true, day: ((d.streak - 1) % 7) + 1, streak: d.streak, adSeen, doubled };
  const keep = d.last && dailyGap(d.last, today) === 1;
  const streak = keep ? d.streak + 1 : 1;
  return { claimed: false, day: ((streak - 1) % 7) + 1, streak, adSeen, doubled: false };
}

// Hälfte der Liste (aufgerundet, mindestens 1) mal mult: 1 = ohne Werbung, 2 = mit Werbung. Pfeile werden als Stückzahl
// halbiert (arrowCount), ein Ausrüstungsteil (gear) und potUp bleiben, wie sie sind.
function dailyScale(r, mult) {
  const h = (n) => Math.max(1, Math.ceil(n / 2)) * mult;
  const out = {};
  for (const [k, v] of Object.entries(r)) {
    if (k === 'mats') {
      out.mats = {};
      for (const [id, n] of Object.entries(v)) out.mats[id] = h(n);
    } else if (k === 'arrows') out.arrowCount = h(v * (typeof ARROW_BUNDLE !== 'undefined' ? ARROW_BUNDLE : 500));
    else if (typeof v === 'number') out[k] = h(v);
    else out[k] = v;
  }
  return out;
}
function dailyRewardFor(day, level, mult = 1) {
  return dailyScale(DAILY_DAYS[day - 1].reward(level, dailyBand(level)) || {}, mult === 2 ? 2 : 1);
}
const dailyVal = (v, day, level) => (typeof v === 'function' ? v(level, dailyBand(level)) : v);
const dailyName = (day, level) => dailyVal(DAILY_DAYS[day - 1].name, day, level);

// Bogen-Ninja: Pfeile der besten Sorte, die er schon benutzen darf
const dailyBow = (p) => typeof pathWeapon === 'function' && pathWeapon(p) === 'bow' && typeof ARROW_TYPES !== 'undefined';
const dailyArrowSort = (p) => ARROW_TYPES.reduce((best, a, i) => (p.level >= a.level ? i : best), 0);

// Tränke: die Größe zur Stufe, mit potUp eine größer, sobald man höchstens 10 Stufen davor ist
// (Stufe 1–9: M statt S, ab 15: XL statt M, ab 45: XXL statt XL)
function dailyPotSize(level, up) {
  const cur = potionSizeFor(level);
  if (!up) return cur;
  const next = POTION_SIZES[POTION_SIZES.indexOf(cur) + 1];
  return next && level >= next.level - 10 ? next : cur;
}

// Freie Plätze, die ein Tag braucht (Bücher können auf vorhandene Stapel gehen – gerechnet wird vorsichtig)
const dailyBagNeed = (r) => (r.books || 0) + (r.gear ? 1 : 0);

// Truhe für Tag 7 (Holz, Goldbeschläge, violettes Leuchten)
let dailyChestCache = null;
function dailyChestUrl() {
  if (dailyChestCache) return dailyChestCache;
  const sp = bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => {
    const glow = ctx.createRadialGradient(0, -2, 2, 0, 0, 20);
    glow.addColorStop(0, 'rgba(214, 160, 255, 0.75)');
    glow.addColorStop(0.55, 'rgba(150, 90, 240, 0.25)');
    glow.addColorStop(1, 'rgba(120, 60, 220, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-20, -20, 40, 40);
    const wood = ctx.createLinearGradient(0, -6, 0, 14);
    wood.addColorStop(0, '#9a5a2c');
    wood.addColorStop(1, '#5a3014');
    // Kasten
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.roundRect(-14, -3, 28, 16, 2);
    ctx.fill();
    // Deckel (gewölbt)
    const lid = ctx.createLinearGradient(0, -14, 0, -3);
    lid.addColorStop(0, '#b8743a');
    lid.addColorStop(1, '#7a4220');
    ctx.fillStyle = lid;
    ctx.beginPath();
    ctx.moveTo(-14, -3);
    ctx.lineTo(-14, -8);
    ctx.quadraticCurveTo(0, -17, 14, -8);
    ctx.lineTo(14, -3);
    ctx.closePath();
    ctx.fill();
    // Spalt mit Licht
    ctx.fillStyle = '#f3dcff';
    ctx.fillRect(-13, -4, 26, 1.6);
    // Goldbeschläge
    const gold = ctx.createLinearGradient(-14, -14, 14, 14);
    gold.addColorStop(0, '#fff2b0');
    gold.addColorStop(0.5, '#e8b83a');
    gold.addColorStop(1, '#9a6a12');
    ctx.fillStyle = gold;
    for (const x of [-10, 7]) ctx.fillRect(x, -10, 3, 23);
    ctx.fillRect(-14, 10, 28, 2.6);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.quadraticCurveTo(0, -17, 14, -8);
    ctx.stroke();
    // Schloss
    ctx.beginPath();
    ctx.roundRect(-3.4, -5, 6.8, 7.5, 1.5);
    ctx.fill();
    ctx.fillStyle = '#3a1a08';
    ctx.beginPath();
    ctx.arc(0, -1.8, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-0.5, -1.8, 1, 2.6);
    // Edelstein und Funken
    ctx.fillStyle = '#c890ff';
    ctx.beginPath();
    ctx.moveTo(0, -14.5); ctx.lineTo(2.2, -12); ctx.lineTo(0, -9.6); ctx.lineTo(-2.2, -12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const [x, y, s] of [[-15, -14, 1.6], [14, -16, 1.9], [16.5, 2, 1.1], [-17, 4, 1.1]]) {
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.9); ctx.lineTo(x + s * 0.45, y - s * 0.45); ctx.lineTo(x + s * 1.9, y); ctx.lineTo(x + s * 0.45, y + s * 0.45);
      ctx.lineTo(x, y + s * 1.9); ctx.lineTo(x - s * 0.45, y + s * 0.45); ctx.lineTo(x - s * 1.9, y); ctx.lineTo(x - s * 0.45, y - s * 0.45);
      ctx.closePath();
      ctx.fill();
    }
  }, typeof ICON_HI !== 'undefined' ? ICON_HI : 4, true);
  dailyChestCache = sp.img.toDataURL();
  return dailyChestCache;
}

function dailyIcon(kind, p = game.player) {
  if (kind === 'chest') return dailyChestUrl();
  if (kind === 'scroll') return scrollIconUrl();
  if (kind === 'potion') return potionIconUrl('hp', dailyPotSize(p ? p.level : 1, true).id);
  if (typeof matDef === 'function' && matDef(kind)) return materialIconUrl(kind);
  return lootIconUrl(kind);
}

// Was ein Tag bringt, als Liste mit Symbol (Kacheln) – nur was die Figur auch bekommt (Pfeile nur Bogen-Ninja)
function dailyEntries(day, p = game.player, mult = 1) {
  const L = p.level;
  const r = dailyRewardFor(day, L, mult);
  const out = [];
  const add = (icon, text, tip, cls) => out.push({ icon, text, tip: tip || '', cls: cls || '' });
  if (r.gear) {
    const rar = RARITIES[r.gear.rarity] || RARITIES[3];
    add(dailyChestUrl(), `${rar.name}es Teil${r.gear.plus ? ' +' + r.gear.plus : ''}`,
      `Ein ${rar.name.toLowerCase()}es Ausrüstungsteil für deine Klasse auf deiner Stufe (Waffen passend zu deinem Weg).`, 'epic');
  }
  for (const [id, n] of Object.entries(r.mats || {})) {
    const def = matDef(id);
    if (def) add(materialIconUrl(id), `${n}× ${def.name}`, def.text);
  }
  if (r.books) add(lootIconUrl('book'), `${r.books}× Fertigkeitsbuch`, 'Fertigkeitsbücher für Fertigkeiten deiner Klasse (E1–E10).');
  if (r.scrolls) add(scrollIconUrl(), `${r.scrolls}× ${BLESSING.name}`, BLESSING.text);
  if (r.potions) {
    const sz = dailyPotSize(L, r.potUp).id;
    for (const k of ['hp', 'mp']) add(potionIconUrl(k, sz), `${r.potions}× ${potionInfo(k).name} ${sz}`, potionInfo(k).text);
  }
  if (r.arrowCount && dailyBow(p)) {
    const i = dailyArrowSort(p);
    add(arrowIconUrl(i), `${r.arrowCount.toLocaleString('de-DE')} ${ARROW_TYPES[i].name}`, 'Pfeile für deinen Bogen (die beste Sorte deiner Stufe).');
  }
  if (r.splinters) add(lootIconUrl('splinter'), `${r.splinters} Seelensplitter`);
  if (r.gold) add(lootIconUrl('gold'), `${r.gold.toLocaleString('de-DE')} Gold`);
  return out;
}
// Kurzer Text, was ein Tag bringt (wie früher); mult 2 = mit Werbung
function dailyLines(day, level, mult = 1) {
  const p = game.player && game.player.level === level ? game.player : Object.assign({}, game.player || {}, { level });
  return dailyEntries(day, p, mult).map((e) => e.text);
}

// Ein Teil für die eigene Klasse (wie questGearItem in quests.js, aber mit fester Seltenheit und festem Plus)
function dailyGearItem(p, rarity, plus) {
  const tier = rarityTierFor(p.level);
  const wkind = questWeaponKind(p);
  let slots = lootSlots(EQUIP_SLOTS.map((sl) => sl.id), p.classId);
  slots = slots.filter((sl) => (sl !== 'koecher' || wkind === 'bow') && (sl !== 'schild' || offhandAllowsShield(p)));
  const slot = slots[randInt(0, slots.length - 1)];
  const item = makeItem(slot, tier, Math.min(plus, MAX_DROP_PLUS), p.classId, wkind);
  return applyRarity(item, rarity, 0, 2);
}

let dailyMsg = '';
// Reicht der Platz in der Tasche? Sonst Meldung (dailyMsg) und false
function dailyRoom(p, r, day) {
  const need = dailyBagNeed(r);
  if (!need || bagFree(p) >= need) return true;
  dailyMsg = `Für Tag ${day} brauchst du ${need} ${need === 1 ? 'freien Platz' : 'freie Plätze'} in der Tasche. Mach Platz und hol die Belohnung dann ab – sie wartet bis Mitternacht.`;
  ui.log(dailyMsg, 'warn');
  return false;
}
// Abholen: mult 2 = mit Werbung (doppelt). Ist die Werbung heute schon gesehen, gibt es ohnehin das Doppelte.
function claimDaily(mult) {
  const p = game.player;
  const st = dailyState(p);
  if (st.claimed) return null;
  const x2 = mult === 2 || st.adSeen;
  const r = dailyRewardFor(st.day, p.level, x2 ? 2 : 1);
  if (!dailyRoom(p, r, st.day)) return null;
  dailyMsg = '';
  const parts = dailyGrant(p, r);
  p.daily = Object.assign({}, p.daily || {}, { last: dailyKey(), streak: st.streak });
  if (x2) p.daily.x2 = dailyKey();
  ui.log(`Tagesbelohnung${x2 ? ' (doppelt)' : ''}: ` + parts.join(', ') + '.', 'level');
  vfxLevelUp(p);
  saveGame();
  if (r.books && ui.buildSkillBar) ui.buildSkillBar();
  ui.banner(`Tagesbelohnung · Tag ${st.day}`, dailyName(st.day, p.level));
  flashScreen(st.day === 7 ? '#c890ff' : '#ffd34d', 0.25);
  ui.updateDailyBadge();
  return st.day;
}
// Nachträglich verdoppeln (Werbung nach dem Abholen gesehen): die zweite Hälfte, ohne zweites Ausrüstungsteil
function claimDailyDouble() {
  const p = game.player;
  const st = dailyState(p);
  if (!st.claimed || st.doubled || !st.adSeen) return null;
  const r = dailyRewardFor(st.day, p.level, 1);
  delete r.gear;
  if (!dailyRoom(p, r, st.day)) return null;
  dailyMsg = '';
  const parts = dailyGrant(p, r);
  p.daily = Object.assign({}, p.daily, { x2: dailyKey() });
  ui.log('Tagesbelohnung verdoppelt: ' + parts.join(', ') + '.', 'level');
  vfxLevelUp(p);
  saveGame();
  if (r.books && ui.buildSkillBar) ui.buildSkillBar();
  ui.banner('Belohnung verdoppelt', dailyName(st.day, p.level));
  flashScreen('#ffd34d', 0.2);
  return st.day;
}
// Werbung ansehen und dann doppelt abholen bzw. verdoppeln. Der Platz in der Tasche wird vorher geprüft, damit niemand
// umsonst schaut; eine gesehene Werbung bleibt für heute gezählt (falls doch etwas schiefgeht).
function dailyWatchAd() {
  const p = game.player;
  if (!p) return;
  const st = dailyState(p);
  if (st.doubled || typeof werbungZeigen !== 'function') return;
  const r = dailyRewardFor(st.day, p.level, st.claimed ? 1 : 2);
  if (st.claimed) delete r.gear;
  if (!dailyRoom(p, r, st.day)) { renderDaily(); return; }
  const finish = () => {
    if (dailyState(p).claimed) claimDailyDouble();
    else claimDaily(2);
    if (!$('panelDaily').hidden) renderDaily();
  };
  if (st.adSeen) { finish(); return; }
  werbungZeigen('tagesbelohnung').then((ok) => {
    if (game.player !== p) return;
    if (!ok) {
      ui.log('Werbung abgebrochen – keine Verdopplung.', 'warn');
      if (!$('panelDaily').hidden) renderDaily();
      return;
    }
    p.daily = Object.assign({}, p.daily || {}, { ad: dailyKey() });
    saveGame();
    finish();
  });
}
// Gibt eine Belohnung (r aus dailyRewardFor) in Tasche und Vorräte; Rückgabe: Liste für die Meldung
function dailyGrant(p, r) {
  const parts = [];
  const loot = (name, n, icon, color) => { if (ui.loot) ui.loot(name, n, icon, color); };
  if (r.gear) {
    const item = dailyGearItem(p, r.gear.rarity, r.gear.plus);
    if (addToBag(item)) {
      parts.push(itemFullName(item));
      loot(itemFullName(item), 1, itemIconUrl(item), itemColor(item));
    }
  }
  for (const [id, n] of Object.entries(r.mats || {})) {
    if (!matDef(id)) continue;
    p.materials[id] = (p.materials[id] || 0) + n;
    parts.push(`${n} × ${matDef(id).name}`);
    loot(matDef(id).name, n, materialIconUrl(id), MATERIAL_COLORS[id]);
  }
  if (r.books) {
    const got = addBooks(r.books, null, classSkills(p).map((sk) => sk.id));
    if (got.length) parts.push('Fertigkeitsbücher: ' + got.join(', '));
  }
  if (r.scrolls) {
    p.scrolls = (p.scrolls || 0) + r.scrolls;
    parts.push(`${r.scrolls} × ${BLESSING.name}`);
    loot(BLESSING.name, r.scrolls, scrollIconUrl(), '#ffe08a');
  }
  if (r.potions) {
    const sz = dailyPotSize(p.level, r.potUp).id;
    for (const k of ['hp', 'mp']) {
      p.potions[potKey(k, sz)] = (p.potions[potKey(k, sz)] || 0) + r.potions;
      parts.push(`${r.potions} × ${potionInfo(k).name} (${sz})`);
      loot(`${potionInfo(k).name} ${sz}`, r.potions, potionIconUrl(k, sz), potionInfo(k).color);
    }
  }
  if (r.arrowCount && dailyBow(p)) {
    const i = dailyArrowSort(p);
    if (!p.arrows || typeof p.arrows !== 'object') p.arrows = {};
    const n = r.arrowCount;
    p.arrows[i] = (p.arrows[i] || 0) + n;
    parts.push(`${n.toLocaleString('de-DE')} ${ARROW_TYPES[i].name}`);
    loot(ARROW_TYPES[i].name, n, arrowIconUrl(i), ARROW_TYPES[i].color);
  }
  if (r.splinters) {
    p.splinters += r.splinters;
    parts.push(`${r.splinters} × Seelensplitter`);
    loot('Seelensplitter', r.splinters, lootIconUrl('splinter'), '#bfa8ff');
  }
  if (r.gold) {
    p.gold += r.gold;
    parts.push(`${r.gold.toLocaleString('de-DE')} Gold`);
    loot('Gold', r.gold, lootIconUrl('gold'), '#ffd34d');
  }
  return parts;
}

function renderDaily() {
  const p = game.player;
  if (!p) return;
  const st = dailyState(p);
  const adOk = typeof werbungZeigen === 'function' && typeof WERBUNG !== 'undefined';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const tiles = DAILY_DAYS.map((d, i) => {
    const day = i + 1;
    const cls = day < st.day || (st.claimed && day === st.day) ? 'done' : day === st.day ? 'today' : 'later';
    // Anzahl fett vorn („2× Verstärkung“, „500 Gold“)
    const txt = (t) => t.replace(/^([\d.]+×?) /, '<b>$1</b> ');
    const rows = dailyEntries(day, p).map((e) => `<li class="${e.cls}"${e.tip ? ` title="${esc(e.tip)}"` : ''}><img src="${e.icon}" alt=""><span>${txt(e.text)}</span></li>`).join('');
    // Heute: kleines Zeichen „×2“ (mit Werbung doppelt), nach dem Verdoppeln „×2 ✓“
    const x2 = day === st.day && adOk ? `<i class="daily-x2${st.doubled ? ' on' : ''}">×2${st.doubled ? ' ✓' : ''}</i>` : '';
    return `<div class="daily-tile ${cls}${d.big ? ' big' : ''}"><small>Tag ${day}</small>${x2}` +
      `<img class="daily-main" src="${dailyIcon(dailyVal(d.icon, day, p.level), p)}" alt=""><strong>${dailyName(day, p.level)}</strong>` +
      `<ul class="daily-rows">${rows}</ul>${cls === 'done' ? '<i class="daily-check">✓</i>' : ''}</div>`;
  }).join('');
  // Unten: ohne Werbung (Hälfte) oder mit Werbung (doppelt); nach dem Abholen noch verdoppeln
  const adBtn = (text) => `<button type="button" class="btn btn-primary daily-claim daily-ad" id="btnDailyAd"><span class="daily-adplay">▶ ×2</span><span>${text}</span></button>`;
  let foot;
  if (!st.claimed) {
    foot = `<div class="daily-claims"><button type="button" class="btn${adOk ? '' : ' btn-primary'} daily-claim" id="btnDailyClaim">Tag ${st.day} abholen</button>` +
      (adOk ? adBtn(st.adSeen ? 'Doppelt abholen' : 'Mit Werbung doppelt abholen') : '') + '</div>' +
      (adOk ? `<p class="hint-text daily-adhint">Ohne Werbung gibt es die Hälfte. Mit einer kurzen Werbung (${WERBUNG.dauer} s) bekommst du das Doppelte.</p>` : '');
  } else {
    foot = `<p class="hint-text">Heute schon abgeholt (Reihe: ${st.streak} ${st.streak === 1 ? 'Tag' : 'Tage'}). Morgen wartet Tag ${(st.day % 7) + 1}.</p>`;
    if (st.doubled) foot += `<p class="hint-text daily-adhint">✓ Heute mit Werbung verdoppelt.</p>`;
    else if (adOk) {
      foot += `<div class="daily-claims">${adBtn(st.adSeen ? 'Verdopplung abholen' : 'Mit Werbung verdoppeln')}</div>` +
        `<p class="hint-text daily-adhint">Mit einer kurzen Werbung (${WERBUNG.dauer} s) bekommst du dasselbe noch einmal.</p>`;
    }
  }
  $('dailyBody').innerHTML =
    `<p>Jeden Tag einmal abholen. Sieben Tage in Folge geben immer bessere Belohnungen – wer einen Tag auslässt, fängt wieder bei Tag 1 an.</p>` +
    `<p class="daily-band">Passend zu deiner Stufe: Belohnungen für <b>${dailyBandText(dailyBand(p.level))}</b>. Tippe auf eine Zeile für Einzelheiten.</p>` +
    `<div class="daily-grid">${tiles}</div>` +
    (dailyMsg && !st.doubled ? `<p class="daily-msg">${dailyMsg}</p>` : '') + foot;
  const b = $('btnDailyClaim');
  if (b) b.addEventListener('click', () => { claimDaily(); renderDaily(); });
  const ad = $('btnDailyAd');
  if (ad) ad.addEventListener('click', () => dailyWatchAd());
  // Zeilen antippen (Handy, kein Mauszeiger): Hinweis unten anzeigen
  $('dailyBody').querySelectorAll('.daily-rows li[title]').forEach((li) => li.addEventListener('click', () => {
    let tip = $('dailyBody').querySelector('.daily-tip');
    if (!tip) {
      tip = document.createElement('p');
      tip.className = 'daily-tip hint-text';
      $('dailyBody').querySelector('.daily-grid').after(tip);
    }
    tip.textContent = li.querySelector('span').textContent + ': ' + li.title;
    tip.hidden = false;
  }));
}

(function dailyCss() {
  const css = document.createElement('style');
  css.textContent =
    '#panelDaily.panel-wide { width: min(960px, calc(100vw - 24px)); }' +
    '.daily-band { margin: 2px 0 0; font-size: 12px; color: var(--muted, #a8997c); }' +
    '.daily-band b { color: #ffe9a8; font-weight: 700; }' +
    '.daily-tile .daily-main { width: 38px; height: 38px; }' +
    '.daily-tile.big .daily-main { width: 46px; height: 46px; filter: drop-shadow(0 0 6px rgba(200, 140, 255, 0.8)); }' +
    '.daily-tile.big.later { box-shadow: 0 0 14px rgba(190, 130, 255, 0.45), inset 0 0 12px rgba(214, 168, 255, 0.18); }' +
    '.daily-rows { list-style: none; margin: 2px 0 0; padding: 0; display: flex; flex-direction: column; gap: 2px; width: 100%; }' +
    '.daily-rows li { display: flex; align-items: center; gap: 3px; font-size: 10.5px; line-height: 1.15; text-align: left; cursor: help;' +
    ' padding: 1px 2px; border-radius: 4px; background: rgba(0, 0, 0, 0.18); }' +
    '.daily-rows li.epic { color: #d9b8ff; font-weight: 700; background: rgba(150, 90, 240, 0.22); }' +
    '.daily-tile .daily-rows img { width: 18px; height: 18px; flex: none; }' +
    '.daily-rows li span { min-width: 0; overflow-wrap: break-word; hyphens: auto; opacity: 0.92; }' +
    '.daily-rows li b { color: #fff1c4; font-weight: 800; }' +
    '.daily-msg { margin: 0 0 8px; padding: 6px 10px; border-radius: 6px; background: rgba(160, 60, 40, 0.3); color: #ffcf9a; font-size: 13px; text-align: center; }' +
    '.daily-tip { margin: -4px 0 8px; text-align: center; }' +
    // Werbung doppelt (seit 15.72)
    '.daily-claims { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin: 2px 0 4px; }' +
    '.daily-claims .daily-claim { margin: 0; }' +
    '.daily-ad { display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 0 14px rgba(255, 196, 60, 0.45); }' +
    '.daily-adplay { padding: 1px 6px; border-radius: 4px; background: rgba(40, 20, 0, 0.35); font-weight: 800; font-size: 0.92em; }' +
    '.daily-adhint { margin: 2px 0 6px; text-align: center; }' +
    '.daily-tile { position: relative; }' +
    '.daily-x2 { position: absolute; top: 3px; left: 4px; padding: 0 5px; border-radius: 4px; font-style: normal; font-weight: 800;' +
    ' font-size: 10.5px; line-height: 16px; color: #2a1a04; background: linear-gradient(180deg, #ffe58a, #ffb93a); }' +
    '.daily-x2.on { color: #0e2a0c; background: linear-gradient(180deg, #b9ff9a, #5fd85a); }' +
    '@media (max-width: 900px) { .daily-rows li { font-size: 9.5px; gap: 2px; } .daily-tile .daily-rows img { width: 15px; height: 15px; } .daily-tile .daily-main { width: 30px; height: 30px; } .daily-tile.big .daily-main { width: 36px; height: 36px; } }' +
    '@media (max-width: 700px) { .daily-rows li { font-size: 10.5px; } }';
  (document.head || document.documentElement).appendChild(css);
})();
