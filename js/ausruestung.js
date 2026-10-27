// Ausrüstung: Gegenstände, Inventar, Beute, Händler, Schmied und die zugehörigen Fenster.

// --- Gegenstände -------------------------------------------------------------------
// Ein Gegenstand ist { uid, slot, tier, plus }; tier ist der Index in ITEM_TIERS.

function makeItem(slot, tier, plus = 0) {
  return { uid: Math.random().toString(36).slice(2, 10), slot, tier, plus };
}

function starterEquipment() {
  return { waffe: makeItem('waffe', 0), ruestung: makeItem('ruestung', 0), helm: null, schild: null, schuhe: null, guertel: null };
}

// Spielstände vor Version 1.4 kannten nur vier Stufen (Lv 1, 8, 15, 22).
// Sie werden auf die gleichnamigen neuen Stufen gelegt, damit nichts schwächer wird.
function migrateItem(item) {
  if (item) item.tier = [0, 2, 3, 4][item.tier] ?? item.tier;
  return item;
}

function itemName(item, classId = game.player.classId) {
  const names = ITEM_NAMES[item.slot];
  return Array.isArray(names) ? names[item.tier] : names[classId][item.tier];
}

function itemFullName(item) {
  return itemName(item) + ' +' + item.plus;
}

function itemColor(item) {
  return PLUS_COLORS[plusBand(item.plus)] || '#ece2cb';
}

// Werte inklusive Verbesserung. Anteile (Prozentwerte) wachsen um 10 % je Plus,
// ganze Zahlen um 10 % des Grundwerts, mindestens aber um 1.
function itemStats(item, plus = item.plus, classId = game.player.classId) {
  const base = { ...BASE_STATS[item.slot][item.tier] };
  if (item.slot === 'waffe') Object.assign(base, WEAPON_EXTRA[classId][item.tier]);
  const out = {};
  for (const [k, v] of Object.entries(base)) {
    out[k] = v < 1 ? v * (1 + PLUS_BONUS * plus) : v + plus * Math.max(1, Math.round(v * PLUS_BONUS));
  }
  return out;
}

const STAT_LABELS = {
  atk: 'Angriff', def: 'Rüstung', hp: 'Vitalität', mp: 'Intelligenz', crit: 'Kritisch',
  speed: 'Lauftempo', dodge: 'Ausweichen', block: 'Blocken', regen: 'Regeneration'
};
const STAT_ORDER = ['atk', 'def', 'hp', 'mp', 'crit', 'block', 'dodge', 'speed', 'regen'];

function statText(k, v) {
  const pct = (x, d = 0) => (x * 100).toFixed(d).replace('.', ',');
  if (k === 'regen') return `${STAT_LABELS[k]} +${pct(v, 1)} %/s`;
  if (k === 'crit' || k === 'speed' || k === 'dodge' || k === 'block') return `${STAT_LABELS[k]} +${pct(v)} %`;
  if (k === 'hp') return `${STAT_LABELS[k]} +${v} Leben`;
  if (k === 'mp') return `${STAT_LABELS[k]} +${v} Mana`;
  return `${STAT_LABELS[k]} +${v}`;
}

function sortedStats(stats) {
  return STAT_ORDER.filter((k) => stats[k] != null).map((k) => [k, stats[k]]);
}

function sellValue(item) {
  return Math.round(12 * Math.pow(item.tier + 1, 2) * (1 + item.plus * 0.6));
}

function addToBag(item) {
  const p = game.player;
  if (p.inventory.length >= BAG_SIZE) return false;
  p.inventory.push(item);
  return true;
}

// Beute: normale Monster selten, Seelensteine oft
function rollLoot(m) {
  const p = game.player;
  if (!m.isStone && Math.random() < 0.03) {
    p.splinters++;
    ui.log(m.name + ' hat einen Seelensplitter fallen lassen.', 'loot');
  }
  if (m.isStone && Math.random() < 0.25) {
    p.scrolls++;
    ui.log('Du hast eine Segensschriftrolle gefunden!', 'loot');
  }
  if (Math.random() < (m.isStone ? 0.4 : 0.025)) {
    let tier = 0;
    ITEM_TIERS.forEach((t, i) => { if (m.level >= t.level) tier = i; });
    const slot = EQUIP_SLOTS[Math.floor(Math.random() * EQUIP_SLOTS.length)].id;
    const plus = Math.random() < 0.25 ? 1 + Math.floor(Math.random() * 2) : 0;
    const item = makeItem(slot, tier, plus);
    if (addToBag(item)) {
      ui.log('Beute: ' + itemFullName(item) + '. Öffne das Inventar mit I.', 'loot');
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
  return { gold: step.gold * (item.tier + 1), splinters: step.splinters };
}

// Gibt das Ergebnis zurück: success, fail (nur Kosten weg), down (Plus sinkt), break (zerbrochen)
function upgradeItem(ref, useScroll) {
  const p = game.player;
  const item = itemAt(ref);
  if (!item || item.plus >= MAX_PLUS) return null;
  const cost = upgradeCost(item);
  if (p.gold < cost.gold || p.splinters < cost.splinters) return null;
  if (useScroll && p.scrolls <= 0) return null;
  p.gold -= cost.gold;
  p.splinters -= cost.splinters;
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
// Farben je Stufe: Leder, Bronze, Eisen, Drache, Seele

const ARMOR_COLORS = ['#7a5a3c', '#8a6a3a', '#5a6a7a', '#9a2f2a', '#4a2f6a'];
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

function drawItemArt(ctx, slot, tier, classId) {
  const metal = TIER_METAL[tier];
  const c = ARMOR_COLORS[tier];
  if (slot === 'waffe') {
    const kind = CLASS_WEAPON[classId];
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    if (kind === 'dagger') {
      ctx.translate(-9, 0);
      ctx.scale(1.6, 1.6);
    } else if (kind === 'fan') {
      ctx.translate(-6, 0);
      ctx.scale(1.3, 1.3);
    } else {
      ctx.translate(-12, 0);
    }
    weaponArt(ctx, kind, tier);
    ctx.restore();
  } else if (slot === 'ruestung') {
    poly(ctx, [[-9, -10], [9, -10], [11, 12], [-11, 12]], c);
    for (let k = 0; k < 3; k++) stroke(ctx, metal, 0.9, [[-8.5, -4 + k * 4.5], [8.5, -4 + k * 4.5]]);
    box(ctx, -10.5, 6, 21, 3, 1, metal);
    oval(ctx, -11, -9, 6, 4.5, c);
    oval(ctx, 11, -9, 6, 4.5, c);
    stroke(ctx, metal, 1, [[-15, -7], [-7, -7]]);
    stroke(ctx, metal, 1, [[7, -7], [15, -7]]);
    poly(ctx, [[-4, -10], [4, -10], [0, -5]], darker(c, 0.3));
  } else if (slot === 'helm') {
    paintShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 4, 13, Math.PI, 0); ctx.closePath(); }, metal, -13, -9, 26, 13);
    box(ctx, -14.5, 2.5, 29, 4, 1.8, c);
    box(ctx, -13, 6, 4, 8, 1.5, metal);
    box(ctx, 9, 6, 4, 8, 1.5, metal);
    if (tier >= 2) poly(ctx, [[-2, -9], [2, -9], [1.4, -16], [-1.4, -16]], tier >= 3 ? '#c8402f' : c);
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
function itemIconUrl(item, classId = game.player.classId) {
  const band = plusBand(item.plus);
  const key = `${item.slot}:${item.tier}:${classId}:${band}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const sp = bakeSprite({ x: -20, y: -20, w: 40, h: 40 }, (ctx) => drawItemArt(ctx, item.slot, item.tier, classId));
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

// --- Fenster: Inventar und Schmied -------------------------------------------------------

const gear = {
  selected: null,
  sellArmed: false,
  smithRef: null,
  forging: false,

  message(text, type = 'info') {
    const el = document.getElementById('invMsg') || document.getElementById('smithMsg') || document.getElementById('merchantMsg');
    if (el) {
      el.textContent = text;
      el.className = 'gear-msg ' + type;
    } else {
      ui.log(text, type);
    }
  },

  tile(item, attrs, label) {
    if (!item) return `<button type="button" class="item-tile empty" ${attrs}><span class="slot-label">${label || 'leer'}</span></button>`;
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
    const equip = EQUIP_SLOTS.map((sl) => this.tile(p.equipment[sl.id], `data-equip="${sl.id}"`, sl.name)).join('');
    let bag = '';
    for (let i = 0; i < BAG_SIZE; i++) bag += this.tile(p.inventory[i], `data-bag="${i}"`);
    document.getElementById('invBody').innerHTML =
      `<div class="inv-layout">` +
      `<section class="inv-equip"><h3>Angelegt</h3><div class="equip-grid">${equip}</div>` +
      `<p class="inv-sum">Angriff ${s.atk} · Verteidigung ${s.def}<br>Leben ${s.maxHp} · Mana ${s.maxMp}</p></section>` +
      `<section class="inv-bag"><h3>Tasche <small>${p.inventory.length}/${BAG_SIZE}</small></h3><div class="bag-grid">${bag}</div>` +
      `<p class="inv-sum">Gold ${p.gold.toLocaleString('de-DE')} · Seelensplitter ${p.splinters} · ` +
      `<img class="mini-icon" src="${scrollIconUrl()}" alt=""> Segensschriftrollen ${p.scrolls}</p></section>` +
      `</div><div id="invDetail" class="item-detail-wrap"></div><p id="invMsg" class="gear-msg"></p>`;
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
      : `<button type="button" class="mini-btn" data-act="equip" ${p.level < need ? 'disabled' : ''}>Anlegen</button>` +
        `<button type="button" class="mini-btn ${this.sellArmed ? 'danger' : ''}" data-act="sell">${this.sellArmed ? 'Wirklich verkaufen?' : 'Verkaufen (' + sellValue(item) + ' Gold)'}</button>`;
    el.innerHTML = `<div class="item-detail"><img src="${itemIconUrl(item)}" alt="">` +
      `<div class="item-info"><strong style="color:${itemColor(item)}">${itemFullName(item)}</strong>` +
      `<small>${slotName} · ${ITEM_TIERS[item.tier].label} · ab Stufe ${need}</small>` +
      `<span>${this.statsList(item)}</span></div><div class="item-actions">${actions}</div></div>`;
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
    const kinds = { krieger: 'Schwerter', ninja: 'Dolche', schamane: 'Fächer', nekromant: 'Stäbe' };
    const groups = m.slots.map((slot) => {
      const slotName = EQUIP_SLOTS.find((x) => x.id === slot).name;
      const title = slot === 'waffe' ? `${kinds[p.classId]} für ${CLASSES[p.classId].name}` : slotName;
      const equipped = p.equipment[slot];
      const eqStats = equipped ? itemStats(equipped) : {};
      const rows = m.prices.map((price, tier) => {
        const item = makeItem(slot, tier);
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
          `<button type="button" class="mini-btn" data-buy-gear="${slot}:${tier}" ${p.gold < price ? 'disabled' : ''}>Kaufen</button>` +
          (tooLow ? '' : `<button type="button" class="mini-btn primary" data-buy-equip="${slot}:${tier}" ${p.gold < price ? 'disabled' : ''}>Kaufen &amp; anlegen</button>`) +
          `</div></div>`;
      }).join('');
      return `<h3>${title} <small>angelegt: ${equipped ? itemFullName(equipped) : 'nichts'}</small></h3><div class="merchant-list">${rows}</div>`;
    }).join('');
    const msg = keepMsg ? document.getElementById('merchantMsg') : null;
    const text = msg ? msg.textContent : '';
    const cls = msg ? msg.className : 'gear-msg';
    body.innerHTML = `<p>„${m.greeting}“</p>` +
      `<p>Dein Gold: <span class="price">${p.gold.toLocaleString('de-DE')}</span> · Tasche ${p.inventory.length}/${BAG_SIZE}</p>` +
      `<p id="merchantMsg" class="${cls}">${text}</p>` + groups;
    body.querySelectorAll('[data-buy-gear]').forEach((b) => b.addEventListener('click', () => {
      const [slot, tier] = b.dataset.buyGear.split(':');
      this.buyGear(slot, Number(tier), false);
    }));
    body.querySelectorAll('[data-buy-equip]').forEach((b) => b.addEventListener('click', () => {
      const [slot, tier] = b.dataset.buyEquip.split(':');
      this.buyGear(slot, Number(tier), true);
    }));
  },

  buyGear(slot, tier, equip) {
    const p = game.player;
    const price = MERCHANTS[this.merchant].prices[tier];
    const item = makeItem(slot, tier);
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
      `<p>„Zeig mir, was ich schmieden soll. Bis +3 passiert nichts Schlimmes. Danach wird es gefährlich, ab +7 kann es zerbrechen.“</p>` +
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
    const enough = p.gold >= cost.gold && p.splinters >= cost.splinters;
    const risk = step.fail === 'none' ? 'Bei Fehlschlag sind nur die Kosten weg.'
      : step.fail === 'down' ? `Bei Fehlschlag fällt der Gegenstand auf +${item.plus - 1} zurück.`
        : 'Bei Fehlschlag zerbricht der Gegenstand!';
    const next = { ...item, plus: item.plus + 1 };
    el.innerHTML = this.anvil(item) +
      `<p class="smith-step"><strong style="color:${itemColor(item)}">${itemFullName(item)}</strong> → <strong style="color:${itemColor(next)}">+${next.plus}</strong></p>` +
      `<p class="smith-stats">${this.statsList(item)}<br>→ ${this.statsList(item, item.plus + 1)}</p>` +
      `<div class="chance"><i style="width:${step.chance * 100}%"></i><span>Erfolgschance ${Math.round(step.chance * 100)} %</span></div>` +
      `<p class="smith-cost">Kosten: <b class="${p.gold >= cost.gold ? '' : 'lack'}">${cost.gold.toLocaleString('de-DE')} Gold</b> und ` +
      `<b class="${p.splinters >= cost.splinters ? '' : 'lack'}">${cost.splinters} Seelensplitter</b> (du hast ${p.splinters})</p>` +
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
