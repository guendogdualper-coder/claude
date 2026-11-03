// Seltenheit (seit 13.56): jeder Gegenstand hat neben seiner Stufe (tier = Lv-Klammer, z. B. Göttlich ab Lv 60)
// eine Seltenheit item.rarity von 0 bis 4 – Normal (grau), Gewöhnlich (grün), Selten (blau), Episch (lila),
// Legendär (gold). Die Tabellen RARITIES (Farbe, Boni, Werte) und RARITY_DROPS (woher was kommt) stehen in
// daten/gegenstaende.js. Hier: Würfeln, Umstellen alter Spielstände, Anzeige-Hilfen und der Lichtstrahl über
// epischer und legendärer Beute am Boden (2D und 3D).
//
// Regeln in Kürze:
//   - Episch erst ab Gegenstandsstufe Göttlich (Lv 60), Legendär nur Ewig (Lv 80) – RARITIES[].minTier.
//   - Händler: grau, nur das Gehärtet-Teil (Lv 15) grün. Normale Monster: meist grau/grün, selten blau.
//   - Seelensteine, Dungeon-Monster, Bosse: grün/blau. Dungeon-Bosse ab Stufe 50: kleine Chance auf ein episches Teil.
//   - Endbosse der Maps: episch (unter Lv 60 so selten, wie die Stufe es erlaubt, also blau), wie bisher mit 4 Boni.
//   - Legendär nur in Instanzen: Höllenthron (Wächter 2 % je Teil, Abaddor 12 %), später die Lv-60-Instanzen.
//
// Schnittstelle für die Instanzen (später): rollRarityItem(level, rarity, cls), dropEpic(m, n), dropLegendary(m).

// --- Grundlagen ------------------------------------------------------------------------------------------------

// Seltenheit eines Gegenstands. Teile ohne Angabe (alte Spielstände, ältere Mitspieler) wie beim Umstellen schätzen.
function rarityOf(item) {
  if (!item || isBook(item)) return 0;
  const r = item.rarity;
  if (r >= 0 && r < RARITIES.length) return r | 0;
  return legacyRarity(item);
}
function rarityInfo(item) {
  return RARITIES[rarityOf(item)];
}
function rarityColor(item) {
  return rarityInfo(item).color;
}

// Alte Gegenstände: frühere legendäre Endboss-Teile werden gold (Lv 80), lila (ab Lv 60) oder blau;
// sonst nach Boni: ab 3 Boni blau, mit Boni grün, ohne grau
function legacyRarity(item) {
  const n = (item.bonuses || []).length;
  if (item.legend) return item.tier >= RARITIES[4].minTier ? 4 : item.tier >= RARITIES[3].minTier ? 3 : 2;
  if (n >= 3) return 2;
  return n ? 1 : 0;
}

// Höchste Seltenheit, die eine Gegenstandsstufe tragen kann
function maxRarityForTier(tier) {
  let r = 0;
  RARITIES.forEach((x, i) => { if ((tier || 0) >= x.minTier) r = i; });
  return r;
}
function capRarity(r, tier) {
  return Math.max(0, Math.min(r | 0, maxRarityForTier(tier)));
}

// Faktor auf die Grundwerte (itemStats in ausruestung.js)
function rarityStatMul(item) {
  return rarityInfo(item).statMul || 1;
}

// Seltenheit setzen und die mitgebrachten Boni würfeln. Vorhandene Boni bleiben; es kommen nur so viele dazu,
// bis die gewürfelte Anzahl (oder minBonus) erreicht ist.
function applyRarity(item, r, minBonus = 0) {
  r = capRarity(r, item.tier);
  item.rarity = r;
  const [lo, hi] = RARITIES[r].bonus;
  const n = Math.min(MAX_NORMAL_BONUS, Math.max(minBonus, randInt(lo, hi)));
  item.bonuses = item.bonuses || [];
  while (item.bonuses.length < n) {
    const b = rollBonus(item, false);
    if (!b.t) break;
    item.bonuses.push(b);
  }
  clampItemBonuses(item);
  return item;
}

function rarityPick(w) {
  const sum = w.reduce((s, x) => s + x, 0);
  let x = Math.random() * sum;
  for (let i = 0; i < w.length; i++) {
    x -= w[i];
    if (x < 0) return i;
  }
  return 0;
}

// Seltenheit für Beute aus der Quelle src (siehe RARITY_DROPS) würfeln. Episch hebt die Stufe auf mindestens
// Göttlich (Lv 60), legendär immer auf Ewig (Lv 80); sonst wird auf das gekappt, was die Stufe erlaubt.
function rollRarity(src, m, item) {
  const rule = RARITY_DROPS[src] || RARITY_DROPS.mob;
  if (rule.legendary && Math.random() < rule.legendary) {
    item.tier = ITEM_TIERS.length - 1;
    return 4;
  }
  if (rule.epic && (!rule.epicFrom || (m && m.level >= rule.epicFrom)) && Math.random() < rule.epic) {
    item.tier = Math.max(item.tier, RARITIES[3].minTier);
    return 3;
  }
  return capRarity(rarityPick(rule.w), item.tier);
}
// Würfeln und gleich anwenden; Rückgabe: der Gegenstand
function rarityRoll(item, src, m) {
  return applyRarity(item, rollRarity(src, m, item), (RARITY_DROPS[src] && RARITY_DROPS[src].minBonus) || 0);
}

// Quelle einer normalen Beute (rollLoot): Seelenstein, Monster aus Stein oder Dungeon, sonst normales Monster
function raritySourceOf(m) {
  if (m.isStone) return 'stone';
  if (m.stone || (m.type && m.type.dungeon)) return 'stoneMob';
  return 'mob';
}

// Händlerware: grau, das teuerste Teil grün
function merchantRarity(tier) {
  return capRarity(RARITY_DROPS.merchant.byTier[tier] || 0, tier);
}

// --- Schnittstelle für Instanzen ---------------------------------------------------------------------------------

// Gegenstandsstufe zu einer Stufe (wie bei den Bossen: die höchste Klammer, die level erreicht)
function rarityTierFor(level) {
  let tier = 0;
  ITEM_TIERS.forEach((t, i) => { if (level >= t.level) tier = i; });
  return tier;
}

// Ein Teil der Seltenheit rarity für eine Klasse (Standard: die eigene). Episch wird mindestens Göttlich (Lv 60),
// legendär immer Ewig (Lv 80). Waffe oder ein anderer Platz zufällig, wie bei den Endbossen.
function rollRarityItem(level, rarity, cls, slot) {
  const p = game.player;
  cls = cls || p.classId;
  let tier = rarityTierFor(level);
  if (rarity >= 3) tier = Math.max(tier, RARITIES[rarity].minTier);
  if (!slot) {
    const slots = lootSlots(EQUIP_SLOTS.map((sl) => sl.id), cls);
    slot = slots[randInt(0, slots.length - 1)];
  }
  const item = makeItem(slot, tier, 0, cls, lootKind(p, cls));
  return applyRarity(item, rarity, rarity >= 3 ? 4 : 0);
}

// Ein Teil in die Tasche legen und ankündigen (Beuteanzeige, Chat, Strahl); false bei voller Tasche
function giveRarityItem(item, m) {
  if (!addToBag(item)) {
    ui.log('Dein Inventar ist voll. ' + itemFullName(item) + ' ist verloren.', 'warn');
    return false;
  }
  ui.loot(itemFullName(item), 1, itemIconUrl(item), itemColor(item));
  announceRarity(item);
  return true;
}

// n epische Teile für die eigene Klasse (Instanzen: 1–2 je Durchgang), Stufe nach dem Gegner m
function dropEpic(m, n = 1) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const item = rollRarityItem((m && m.level) || game.player.level, 3, null, k === 0 && Math.random() < 0.4 ? 'waffe' : null);
    if (giveRarityItem(item, m)) out.push(item);
  }
  return out;
}

// Ein legendäres Teil (immer Ewig, Lv 80) – nur für Instanzen gedacht
function dropLegendary(m) {
  const item = rollRarityItem(80, 4);
  return giveRarityItem(item, m) ? item : null;
}

// --- Umstellen alter Spielstände ---------------------------------------------------------------------------------

// Beim Laden (spieler.js): Ausrüstung, Tasche und Lager bekommen eine Seltenheit
function migrateRarity(p) {
  const all = [...Object.values(p.equipment || {}), ...(p.inventory || []), ...((p.storage && p.storage.items) || [])];
  for (const it of all) if (it && !isBook(it) && it.slot && !(it.rarity >= 0 && it.rarity < RARITIES.length)) it.rarity = legacyRarity(it);
}

// --- Anzeige ---------------------------------------------------------------------------------------------------

// Zeile im Hinweis und in den Fenstern: „Episch · Göttlich (Lv 60)“ (Seltenheit in ihrer Farbe)
function rarityLineHtml(item) {
  const R = rarityInfo(item);
  const T = ITEM_TIERS[item.tier] || ITEM_TIERS[0];
  return `<small class="rar-line"><b style="color:${R.color}">${R.name}</b> · <span>${T.label}</span> (Lv ${T.level})</small>`;
}

// Nach dem Fund: Zeile im Chat (Reiter System) in der Farbe der Seltenheit; ab Episch ein Lichtstrahl an der
// Fundstelle, bei Legendär dazu ein goldenes Banner
function announceRarity(item) {
  const r = rarityOf(item);
  const R = RARITIES[r];
  const T = ITEM_TIERS[item.tier];
  ui.log(`Beute: ${itemFullName(item)} – ${R.name}, ${T.label} (Lv ${T.level})`, 'rar' + r);
  if (r < 3) return;
  // das Teil liegt kurz am Boden (groundLoot, effekte.js): der Strahl steht genau dort
  const name = itemFullName(item);
  let at = null;
  for (let i = game.effects.length - 1; i >= 0; i--) {
    const e = game.effects[i];
    if (e.type === 'grounditem' && e.name === name && !e.rarityBeam) {
      e.rarityBeam = true;
      at = e;
      break;
    }
  }
  const p = game.player;
  const x = at ? at.x : p.x;
  const y = at ? at.y : feetY(p);
  addEffect({ type: 'lootbeam', x, y, color: R.color, rarity: r, dur: r >= 4 ? 3.4 : 2.6 });
  if (r >= 4) {
    later(1.2, () => ui.banner('Legendär!', `${name} · ${T.label} (Lv ${T.level})`, 'rar-banner rar-4'));
    flashScreen(R.color, 0.3);
  }
}

// --- Lichtstrahl über epischer und legendärer Beute ----------------------------------------------------------------
// Ein weicher senkrechter Strahl in der Farbe der Seltenheit (keine Runen, keine Sterne am Boden).

// 2D (und als Ebene über 3D, falls 3D aus ist)
EXTRA_EFFECTS.lootbeam = (ctx, e, k, x, y) => {
  const a = Math.min(1, k * 7) * (k > 0.72 ? (1 - k) / 0.28 : 1);
  if (a <= 0.01) return;
  const gold = e.rarity >= 4;
  const h = gold ? 210 : 160;
  const w = gold ? 18 : 13;
  const rgb = hexRgb(e.color);
  const pulse = 0.85 + 0.15 * Math.sin((game.time - e.start) * 6);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, y - h, 0, y);
  g.addColorStop(0, `rgba(${rgb},0)`);
  g.addColorStop(0.55, `rgba(${rgb},0.35)`);
  g.addColorStop(1, `rgba(${rgb},0.85)`);
  ctx.globalAlpha = a * pulse;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.35, y - h);
  ctx.lineTo(x + w * 0.35, y - h);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x - w / 2, y);
  ctx.closePath();
  ctx.fill();
  // heller Kern
  const c = ctx.createLinearGradient(0, y - h * 0.85, 0, y);
  c.addColorStop(0, 'rgba(255,255,255,0)');
  c.addColorStop(1, 'rgba(255,255,255,0.75)');
  ctx.fillStyle = c;
  ctx.fillRect(x - w * 0.12, y - h * 0.85, w * 0.24, h * 0.85);
  glow(ctx, x, y, gold ? 30 : 22, e.color, 0.55 * a);
  // ein paar Lichtpunkte steigen im Strahl auf
  ctx.fillStyle = gold ? '#fff3c0' : '#f0e0ff';
  for (let i = 0; i < (gold ? 7 : 5); i++) {
    const ph = ((game.time - e.start) * 0.55 + i / (gold ? 7 : 5)) % 1;
    ctx.globalAlpha = a * (1 - ph) * 0.9;
    ctx.beginPath();
    ctx.arc(x + Math.sin(i * 2.3 + ph * 4) * w * 0.3, y - 6 - ph * h * 0.8, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
};

// 3D: offene Zylinder (deckende Farbe, leuchtender Mantel, heller Kern) mit weichem Schein am Fuß.
// Der deckende Zylinder ist normal gemischt (eigener Vorrat 'rarBeamN'): additiv allein wird Lila auf hellem Gras weißlich.
function rarityBeamTake(h) {
  const pool = FX3.pools.rarBeamN || (FX3.pools.rarBeamN = []);
  if (!pool.length) {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20, 1, true), new THREE.MeshBasicMaterial({
      map: fx3Texture('beam'), color: 0xffffff, transparent: true, opacity: 1, depthWrite: false,
      blending: THREE.NormalBlending, side: THREE.DoubleSide, fog: false
    }));
    o.renderOrder = 5;
    o.userData.kind = 'rarBeamN';
    o.visible = false;
    FX3.group.add(o);
    pool.push(o);
  }
  return fx3Take(h, 'rarBeamN');
}
if (typeof FX3_TYPES !== 'undefined' && typeof FX3_DRAW !== 'undefined') {
  FX3_TYPES.add('lootbeam');
  FX3_DRAW.lootbeam = (h, e, k) => {
    const a = Math.min(1, k * 7) * (k > 0.72 ? (1 - k) / 0.28 : 1);
    const gold = e.rarity >= 4;
    const t = game.time - e.start;
    const pulse = 0.85 + 0.15 * Math.sin(t * 6);
    const ht = gold ? 7.5 : 5.5;
    const r = gold ? 0.34 : 0.26;
    const solid = rarityBeamTake(h);
    fx3Wall(solid, e.x, e.y, r * 0.62, ht * 0.9);
    fx3Color(solid, gold ? '#ff9a00' : '#7a2ae0', a * (gold ? 0.45 : 0.8));
    const outer = fx3Take(h, 'wall');
    fx3Wall(outer, e.x, e.y, r, ht);
    fx3Color(outer, e.color, a * (gold ? 0.7 : 0.45) * pulse);
    const mid = fx3Take(h, 'wall');
    fx3Wall(mid, e.x, e.y, r * 0.5, ht * 1.05);
    fx3Color(mid, gold ? e.color : '#8a3cff', a * (gold ? 1 : 0.55));
    const core = fx3Take(h, 'wall');
    fx3Wall(core, e.x, e.y, r * 0.16, ht * 0.95);
    fx3Color(core, gold ? '#ffffff' : '#e6d0ff', a * (gold ? 0.7 : 0.25));
    const base = fx3Take(h, 'plane');
    fx3Ground(base, e.x, e.y, r * 3.2, 0.05, 'disc');
    fx3Color(base, e.color, a * 0.45);
    // aufsteigende Lichtpunkte
    if (typeof fx3MageSprite === 'function') {
      const n = gold ? 8 : 5;
      for (let i = 0; i < n; i++) {
        const ph = (t * 0.5 + i / n) % 1;
        const ang = i * 2.399 + t * 1.3;
        fx3MageSprite(h, 'sprite', 'disc', e.x * U3 + Math.cos(ang) * r * 0.7, 0.2 + ph * ht * 0.8, e.y * U3 + Math.sin(ang) * r * 0.7,
          0.16, 0.16, i % 2 ? '#ffffff' : e.color, a * (1 - ph));
      }
    }
  };
}
