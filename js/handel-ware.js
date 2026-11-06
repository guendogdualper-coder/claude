// Waren für Post und Auktionshaus (seit 13.63). Eine Ware ist entweder ein Gegenstand aus der Tasche (Ausrüstung oder
// ein Stapel Fertigkeitsbücher, Format wie im Spielstand, siehe ausruestung.js) oder eine Menge eines Vorrats:
//   { t: 'it', it: { uid, slot, tier, plus, rarity, cls, kind, bonuses, specials, legend, raidMat } }  Ausrüstung
//   { t: 'it', it: { uid, book, count } }                                                         Fertigkeitsbücher
//   { t: 'trank', k: 'hp' | 'mpL' …, n }    Tränke (Schlüssel wie p.potions)
//   { t: 'segen', n }                       Segensschriftrollen (p.scrolls)
//   { t: 'pfeil', i, n }                    Pfeile einer Sorte (p.arrows[i])
//   { t: 'mat', id, n }                     Verstärkungen und Steine (p.materials), seit 14.1 auch Schriftrollen
//                                           und Seelensteine (Gegenstand) für die Fertigkeiten (ALL_MATS)
//   { t: 'teil', id, n }                    Teile von Monstern (p.upmats)
//   { t: 'splitter', n }                    Seelensplitter
// In der Datenbank liegen Waren als Text (JSON). Was von dort kommt, prüft wareClean Feld für Feld: nur bekannte
// Felder mit gültigen Werten werden übernommen (keine Funktionen, keine fremden Eigenschaften), Gegenstände bekommen
// eine neue Kennung.

const WARE_MAX_N = 10000000;
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const plainObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o) && Object.getPrototypeOf(o) === Object.prototype;

// Tränke: Schlüssel → Sorte und Größe
function warePot(k) {
  const kind = String(k).slice(0, 2);
  const sz = POTION_SIZES.find((s) => potKey(kind, s.id) === k);
  return (kind === 'hp' || kind === 'mp') && sz ? { kind, sz } : null;
}

// Gegenstand aus fremder Quelle prüfen und sauber neu aufbauen (null = ungültig)
function itemClean(raw) {
  if (!plainObj(raw)) return null;
  if (raw.book != null) {
    const id = SKILL_RENAMED[raw.book] || raw.book;
    if (typeof id !== 'string' || !skillEntry(id) || !isInt(raw.count, 1, 9999)) return null;
    return { book: id, count: raw.count, uid: newUid() };
  }
  if (!ALL_SLOTS.includes(raw.slot) || !isInt(raw.tier, 0, ITEM_TIERS.length - 1) || !isInt(raw.plus, 0, MAX_PLUS)) return null;
  const it = { uid: newUid(), slot: raw.slot, tier: raw.tier, plus: raw.plus, rarity: isInt(raw.rarity, 0, RARITIES.length - 1) ? raw.rarity : 0 };
  if (raw.cls != null) {
    if (typeof raw.cls !== 'string' || !CLASSES[raw.cls]) return null;
    it.cls = raw.cls;
  }
  if (CLASS_SLOTS.includes(it.slot) && !it.cls) return null;
  if (it.slot === 'waffe') {
    if (typeof raw.kind !== 'string' || !WEAPON_KINDS[raw.kind] || !CLASS_WEAPON_KINDS[it.cls].includes(raw.kind)) return null;
    it.kind = raw.kind;
  }
  const bon = (list, pool, max) => {
    if (list == null) return [];
    if (!Array.isArray(list) || list.length > max) return null;
    const out = [];
    for (const b of list) {
      if (!plainObj(b) || typeof b.t !== 'string' || !Object.prototype.hasOwnProperty.call(pool, b.t) || typeof b.v !== 'number' || !isFinite(b.v) || b.v < 0 || b.v > 100000) return null;
      out.push({ t: b.t, v: b.v });
    }
    return out;
  };
  const bonuses = bon(raw.bonuses, BONUS_TYPES, MAX_NORMAL_BONUS);
  const specials = bon(raw.specials, SPECIAL_BONUS_TYPES, MAX_SPECIAL_BONUS);
  if (!bonuses || !specials) return null;
  if (bonuses.length) it.bonuses = bonuses;
  if (specials.length) it.specials = specials;
  if (raw.legend === true) it.legend = true;
  if (typeof raw.raidMat === 'string' && MOB_MATS[raw.raidMat]) it.raidMat = raw.raidMat;
  clampItemBonuses(it);
  return it;
}

// Ware aus fremder Quelle prüfen (null = ungültig)
function wareClean(raw) {
  if (!plainObj(raw) || typeof raw.t !== 'string') return null;
  const n = raw.n;
  switch (raw.t) {
    case 'it': { const it = itemClean(raw.it); return it ? { t: 'it', it } : null; }
    case 'trank': return warePot(raw.k) && isInt(n, 1, WARE_MAX_N) ? { t: 'trank', k: raw.k, n } : null;
    case 'segen': return isInt(n, 1, WARE_MAX_N) ? { t: 'segen', n } : null;
    case 'pfeil': return isInt(raw.i, 0, ARROW_TYPES.length - 1) && isInt(n, 1, WARE_MAX_N) ? { t: 'pfeil', i: raw.i, n } : null;
    case 'mat': return ALL_MATS.some((m) => m.id === raw.id) && isInt(n, 1, WARE_MAX_N) ? { t: 'mat', id: raw.id, n } : null;
    case 'teil': return typeof raw.id === 'string' && Object.prototype.hasOwnProperty.call(MOB_MATS, raw.id) && isInt(n, 1, WARE_MAX_N) ? { t: 'teil', id: raw.id, n } : null;
    case 'splitter': return isInt(n, 1, WARE_MAX_N) ? { t: 'splitter', n } : null;
    default: return null;
  }
}
// Liste von Waren aus Text (Datenbank); ungültig → null
function waresParse(text) {
  if (!text) return [];
  let list;
  try { list = JSON.parse(text); } catch { return null; }
  if (!Array.isArray(list) || list.length > 12) return null;
  const out = list.map(wareClean);
  return out.every(Boolean) ? out : null;
}
const waresText = (list) => JSON.stringify(list || []);

// --- Bestand des Spielers ------------------------------------------------------------------------------
// Vorräte, die man verschicken oder versteigern kann (Anzahl > 0)
function wareSupplies(p) {
  const out = [];
  for (const kind of ['hp', 'mp']) for (const sz of POTION_SIZES) {
    const k = potKey(kind, sz.id);
    if ((p.potions[k] || 0) > 0) out.push({ t: 'trank', k, n: p.potions[k] });
  }
  if (p.scrolls > 0) out.push({ t: 'segen', n: p.scrolls });
  for (let i = 0; i < ARROW_TYPES.length; i++) if (p.arrows && p.arrows[i] > 0) out.push({ t: 'pfeil', i, n: p.arrows[i] });
  for (const m of ALL_MATS) if ((p.materials[m.id] || 0) > 0) out.push({ t: 'mat', id: m.id, n: p.materials[m.id] });
  for (const [id, n] of Object.entries(p.upmats || {})) if (n > 0 && MOB_MATS[id]) out.push({ t: 'teil', id, n });
  if (p.splinters > 0) out.push({ t: 'splitter', n: p.splinters });
  return out;
}
// Schlüssel eines Vorrats (gleiche Sorte = gleicher Schlüssel)
function wareKey(w) {
  if (w.t === 'it') return 'it:' + w.it.uid;
  return w.t + ':' + (w.k != null ? w.k : w.i != null ? w.i : w.id != null ? w.id : '');
}
// so viel hat der Spieler davon (Gegenstände: 1 bzw. Größe des Stapels)
function wareHave(p, w) {
  switch (w.t) {
    case 'it': { const it = p.inventory.find((x) => x.uid === w.it.uid); return it ? (isBook(it) ? it.count : 1) : 0; }
    case 'trank': return p.potions[w.k] || 0;
    case 'segen': return p.scrolls || 0;
    case 'pfeil': return (p.arrows && p.arrows[w.i]) || 0;
    case 'mat': return p.materials[w.id] || 0;
    case 'teil': return (p.upmats && p.upmats[w.id]) || 0;
    case 'splitter': return p.splinters || 0;
  }
  return 0;
}
const wareCount = (w) => (w.t === 'it' ? (isBook(w.it) ? w.it.count : 1) : w.n);

// Ware vom Spieler nehmen (vorher mit wareHave geprüft). Gibt die abgegebene Ware zurück (Kopie) oder null.
function wareTake(p, w) {
  const n = wareCount(w);
  if (wareHave(p, w) < n) return null;
  switch (w.t) {
    case 'it': {
      const i = p.inventory.findIndex((x) => x.uid === w.it.uid);
      const it = p.inventory[i];
      if (isBook(it) && it.count > n) {
        it.count -= n;
        return { t: 'it', it: { book: it.book, count: n, uid: newUid() } };
      }
      p.inventory.splice(i, 1);
      return { t: 'it', it: JSON.parse(JSON.stringify(it)) };
    }
    case 'trank': p.potions[w.k] -= n; break;
    case 'segen': p.scrolls -= n; break;
    case 'pfeil': p.arrows[w.i] -= n; if (!p.arrows[w.i]) delete p.arrows[w.i]; break;
    case 'mat': p.materials[w.id] -= n; break;
    case 'teil': p.upmats[w.id] -= n; if (!p.upmats[w.id]) delete p.upmats[w.id]; break;
    case 'splitter': p.splinters -= n; break;
  }
  return JSON.parse(JSON.stringify(w));
}
// Ware dem Spieler geben (Platz vorher mit wareRoom prüfen). Gegenstände mit eigener Kennung.
function wareGive(p, w) {
  switch (w.t) {
    case 'it':
      if (isBook(w.it)) giveBooks(p, w.it.book, w.it.count);
      else p.inventory.push(Object.assign(JSON.parse(JSON.stringify(w.it)), { uid: w.it.uid || newUid() }));
      break;
    case 'trank': p.potions[w.k] = (p.potions[w.k] || 0) + w.n; break;
    case 'segen': p.scrolls = (p.scrolls || 0) + w.n; break;
    case 'pfeil':
      if (!p.arrows || typeof p.arrows !== 'object') p.arrows = {};
      p.arrows[w.i] = (p.arrows[w.i] || 0) + w.n;
      if (typeof bowHudDirty !== 'undefined') bowHudDirty = true;
      break;
    case 'mat': p.materials[w.id] = (p.materials[w.id] || 0) + w.n; break;
    case 'teil': p.upmats = p.upmats || {}; p.upmats[w.id] = (p.upmats[w.id] || 0) + w.n; break;
    case 'splitter': p.splinters = (p.splinters || 0) + w.n; break;
  }
}
// Passt das alles in die Tasche? (Ausrüstung braucht je einen Platz, Fertigkeitsbücher höchstens einen je Stapel)
function wareRoom(p, list) {
  const need = list.reduce((a, w) => a + (w.t !== 'it' ? 0 : isBook(w.it) ? Math.ceil(w.it.count / BOOK_STACK) : 1), 0);
  return p.inventory.length + need <= BAG_SIZE;
}

// --- Anzeige ---------------------------------------------------------------------------------------------
function wareName(w) {
  switch (w.t) {
    case 'it': return isBook(w.it) ? `Fertigkeitsbuch: ${skillEntry(w.it.book).sk.name}` : itemFullName(w.it);
    case 'trank': { const x = warePot(w.k); return `${potionInfo(x.kind).name} ${x.sz.id}`; }
    case 'segen': return BLESSING.name;
    case 'pfeil': return ARROW_TYPES[w.i].name;
    case 'mat': return w.id === 'seelenstein' ? 'Seelenstein (Gegenstand)' : matDef(w.id).name;
    case 'teil': return MOB_MATS[w.id].name;
    case 'splitter': return 'Seelensplitter';
  }
  return '?';
}
// Name ohne „+0“ für die Suche
function wareBaseName(w) {
  return w.t === 'it' && !isBook(w.it) ? itemName(w.it) : wareName(w);
}
function wareColor(w) {
  switch (w.t) {
    case 'it': return isBook(w.it) ? '#c58cff' : itemColor(w.it);
    case 'trank': return potionInfo(warePot(w.k).kind).color;
    case 'segen': return '#ffd34d';
    case 'pfeil': return ARROW_TYPES[w.i].color;
    case 'mat': return MATERIAL_COLORS[w.id] || '#9fd0ff';
    case 'teil': return MOB_MATS[w.id].color || '#e8dcc0';
    case 'splitter': return '#b9a0ff';
  }
  return '#ece2cb';
}
function wareIcon(w) {
  switch (w.t) {
    case 'it': return isBook(w.it) ? bookIconUrl(w.it.book) : itemIconUrl(w.it);
    case 'trank': { const x = warePot(w.k); return potionIconUrl(x.kind, x.sz.id); }
    case 'segen': return scrollIconUrl();
    case 'pfeil': return typeof arrowIconUrl === 'function' ? arrowIconUrl(w.i) : lootIconUrl('gold');
    case 'mat': return materialIconUrl(w.id);
    case 'teil': return mobMatIconUrl(w.id);
    case 'splitter': return lootIconUrl('splinter');
  }
  return '';
}
const fmtN = (n) => Number(n || 0).toLocaleString('de-DE');
// Infofeld (wie im Inventar)
function wareTip(w) {
  if (w.t === 'it') return itemTipHtml(w.it);
  const name = `<strong style="color:${wareColor(w)}">${wareName(w)} × ${fmtN(w.n)}</strong>`;
  switch (w.t) {
    case 'trank': { const x = warePot(w.k); const info = potionInfo(x.kind); return name + `<small>${info.kind} (${x.sz.name}) · ab Stufe ${x.sz.level}</small><span>+${fmtN(x.kind === 'hp' ? x.sz.hp : x.sz.mp)} ${x.kind === 'hp' ? 'Leben' : 'Mana'} je Trank</span>`; }
    case 'segen': return name + `<small>Für den Schmied</small><span>${BLESSING.text}</span>`;
    case 'pfeil': { const a = ARROW_TYPES[w.i]; return name + `<small>Munition für den Bogen · ab Stufe ${a.level}</small><span>+${Math.round(a.dmg * 100)} % Schaden aller Bogenschüsse</span>`; }
    case 'mat': {
      const m = matDef(w.id);
      // seit 14.1: Schriftrollen und Seelensteine sind für die Fertigkeiten, nicht für den Schmied
      return name + `<small>${SKILL_MATS.includes(m) ? 'Für deine Fertigkeiten · ' + m.tag : 'Verstärkung für den Gegenstand'}</small><span>${m.text}</span>`;
    }
    case 'teil': return name + `<small>Teil von Monstern · für den Schmied</small>` + (typeof mobMatTip === 'function' ? `<span>${mobMatTip(w.id)}</span>` : '');
    case 'splitter': return name + '<small>Für den Schmied</small><span>Seelensplitter braucht der Schmied zum Verbessern.</span>';
  }
  return name;
}
// Kachel (Gegenstände genau wie in der Tasche, Vorräte mit Anzahl)
function wareTile(w, attrs = '') {
  if (w.t === 'it') return gear.tile(w.it, attrs);
  const n = w.n > 99999 ? Math.floor(w.n / 1000) + 'k' : w.n;
  return `<button type="button" class="item-tile sup-tile" ${attrs} data-info="${escTip(wareTip(w))}">` +
    `<img src="${wareIcon(w)}" alt="${wareName(w)}"><span class="item-count">${n}</span></button>`;
}

// Einordnung fürs Auktionshaus: Kategorie, Art bzw. Platz, Klasse, Seltenheit, Stufe, Plus
function wareInfo(w) {
  if (w.t === 'it' && !isBook(w.it)) {
    const it = w.it;
    const lv = ITEM_TIERS[it.tier].level;
    if (it.slot === 'waffe') return { kat: 'waffe', art: it.kind, cls: it.cls, selt: rarityOf(it), stufe: lv, plus: it.plus };
    return { kat: 'ruestung', art: it.slot, cls: it.cls || null, selt: rarityOf(it), stufe: lv, plus: it.plus };
  }
  const v = { kat: 'verbrauch', cls: null, selt: 0, plus: 0, stufe: 1 };
  if (w.t === 'it') return Object.assign(v, { art: 'buch', cls: skillEntry(w.it.book).cls }); // seit 14.1 eigene Art
  if (w.t === 'trank') return Object.assign(v, { art: 'trank', stufe: warePot(w.k).sz.level });
  if (w.t === 'segen') return Object.assign(v, { art: 'schrift' });
  if (w.t === 'pfeil') return Object.assign(v, { art: 'pfeil', cls: 'ninja', stufe: ARROW_TYPES[w.i].level });
  // seit 14.1: Schriftrollen zu den Schriftrollen, Seelensteine (Gegenstand) zur Aufwertung
  if (w.t === 'mat' && w.id === 'rolle') return Object.assign(v, { art: 'schrift' });
  return Object.assign(v, { art: 'aufwertung' });
}

// --- Auswahl von Waren (Brief schreiben, Auktion einstellen) ----------------------------------------------
// Zeigt Tasche (mit Seiten) und Vorräte; Antippen wählt aus bzw. ab. Bei Vorräten und Bücherstapeln lässt sich
// die Anzahl einstellen. state: { sel: [{ key, w, n }], page, max }
function warePickHtml(st) {
  const p = game.player;
  st.page = Math.max(0, Math.min(BAG_PAGES - 1, st.page || 0));
  const picked = new Set(st.sel.map((s) => s.key));
  const roman = ['I', 'II', 'III', 'IV'];
  const tabs = Array.from({ length: BAG_PAGES }, (_, k) => `<button type="button" class="bag-tab${k === st.page ? ' on' : ''}" data-wpage="${k}">${roman[k]}<small>${p.inventory.slice(k * BAG_PAGE, (k + 1) * BAG_PAGE).length}</small></button>`).join('');
  let bag = '';
  for (let i = st.page * BAG_PAGE; i < (st.page + 1) * BAG_PAGE; i++) {
    const it = p.inventory[i];
    bag += it ? wareTile({ t: 'it', it }, `data-wpick="it:${it.uid}"${picked.has('it:' + it.uid) ? ' data-picked="1"' : ''}`) : gear.tile(null, '');
  }
  const sup = wareSupplies(p).map((w) => wareTile(w, `data-wpick="${wareKey(w)}"${picked.has(wareKey(w)) ? ' data-picked="1"' : ''}`)).join('');
  const chosen = st.sel.map((s) => {
    const have = wareHave(p, s.w);
    const many = have > 1;
    return `<div class="hd-chosen">${wareTile(Object.assign({}, s.w, s.w.t === 'it' ? {} : { n: s.n }), `data-wdrop="${s.key}"`)}` +
      `<span class="hd-chosen-name" style="color:${wareColor(s.w)}">${wareName(s.w)}</span>` +
      (many ? `<label class="hd-amount"><input type="number" min="1" max="${have}" step="1" value="${s.n}" data-wamount="${s.key}" inputmode="numeric"><small>/ ${fmtN(have)}</small></label>` : '') +
      `<button type="button" class="mini-btn" data-wdrop="${s.key}" aria-label="Entfernen">×</button></div>`;
  }).join('');
  return `<div class="hd-pick">` +
    `<div class="hd-chosen-list">${chosen || `<small class="hint-text">${st.max > 1 ? `Tippe unten auf bis zu ${st.max} Sachen aus Tasche oder Vorrat.` : 'Tippe unten auf einen Gegenstand oder Vorrat.'}</small>`}</div>` +
    `<div class="hd-pick-bag"><h4>Tasche <span class="bag-tabs">${tabs}</span></h4><div class="bag-grid">${bag}</div>` +
    (sup ? `<h4>Vorräte und Material</h4><div class="bag-grid">${sup}</div>` : '') + `</div></div>`;
}
// Klicks im Auswahlbereich; onChange() zeichnet neu
function warePickWire(el, st, onChange) {
  const p = game.player;
  const findWare = (key) => {
    if (key.startsWith('it:')) {
      const it = p.inventory.find((x) => 'it:' + x.uid === key);
      return it ? { t: 'it', it } : null;
    }
    return wareSupplies(p).find((w) => wareKey(w) === key) || null;
  };
  el.querySelectorAll('[data-wpick]').forEach((b) => b.addEventListener('click', () => {
    const key = b.dataset.wpick;
    const at = st.sel.findIndex((s) => s.key === key);
    if (at >= 0) st.sel.splice(at, 1);
    else {
      const w = findWare(key);
      if (!w) return;
      if (st.sel.length >= st.max) {
        if (st.max !== 1) return;
        st.sel.length = 0;
      }
      // Vorräte: erst einmal alles, Fertigkeitsbücher der ganze Stapel
      st.sel.push({ key, w: w.t === 'it' ? { t: 'it', it: w.it } : w, n: wareCount(w) });
    }
    onChange();
  }));
  el.querySelectorAll('[data-wdrop]').forEach((b) => b.addEventListener('click', () => {
    st.sel = st.sel.filter((s) => s.key !== b.dataset.wdrop);
    onChange();
  }));
  // Anzahl: nur den Wert und die Zahl auf der Kachel nachführen (ein Neuzeichnen würde den nächsten Klick verschlucken)
  el.querySelectorAll('[data-wamount]').forEach((inp) => inp.addEventListener('input', () => {
    const s = st.sel.find((x) => x.key === inp.dataset.wamount);
    if (!s) return;
    s.n = Math.max(1, Math.min(wareHave(p, s.w), Math.floor(Number(inp.value) || 1)));
    const cnt = inp.closest('.hd-chosen').querySelector('.item-count');
    if (cnt) cnt.textContent = s.n > 99999 ? Math.floor(s.n / 1000) + 'k' : s.n;
  }));
  el.querySelectorAll('[data-wpage]').forEach((b) => b.addEventListener('click', () => { st.page = Number(b.dataset.wpage); onChange(); }));
}
// Gewählte Waren als fertige Waren (mit Anzahl); null, wenn etwas nicht mehr da ist
function warePickList(st) {
  const p = game.player;
  const out = [];
  for (const s of st.sel) {
    const have = wareHave(p, s.w);
    const n = Math.max(1, Math.min(have, s.n));
    if (!have) return null;
    if (s.w.t === 'it') out.push(isBook(s.w.it) ? { t: 'it', it: { book: s.w.it.book, count: n, uid: s.w.it.uid } } : { t: 'it', it: s.w.it });
    else out.push(Object.assign({}, s.w, { n }));
  }
  return out;
}
// Gewählte Waren abgeben (Treuhand bis zur Bestätigung); gibt die Kopien zurück
function wareEscrow(p, list) {
  const out = [];
  for (const w of list) {
    const got = wareTake(p, w);
    if (!got) {
      for (const g of out) wareGive(p, g);
      return null;
    }
    out.push(got);
  }
  return out;
}
