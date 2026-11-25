'use strict';
// Garderobe (seit 15.83, docs/garderobe-haustiere-emotes.md): Jedes Aussehen, das eine Figur einmal angelegt oder
// erbeutet hat, landet in ihrer Sammlung – je Platz, Form (Waffenart bzw. Klasse) und Stufe, mit der Farbe des Teils
// (Farbvariante, Set, Lv-80-Prägung und -Färbung). In der Sammlung (Charakterfenster, Seite „Sammlung“ → Garderobe)
// legt man ein gesammeltes Aussehen für etwas Gold auf ein angelegtes Teil desselben Platzes: Werte, Boni, Plus und
// Seltenheit bleiben, nur die Optik ändert sich. Zurück aufs Original geht jederzeit und kostenlos.
//
// Regeln: nur Aussehen, das die Figur selbst tragen dürfte (Klasse, Weg, Stufe – wearProblem); Waffen nur in derselben
// Art oder in der passenden Gruppe (Schwert ↔ Axt, Zweihänder ↔ Streitaxt), damit Haltung und Schläge stimmen.
//
// Spielstand: p.garderobe = { L: [Schlüssel …], neu: neue Einträge seit dem letzten Blick, init: 1 }.
// Am Gegenstand: item.optik = Schlüssel des übertragenen Aussehens. Es bleibt am Teil (auch abgelegt in der Tasche);
// Handel, Post, Auktionshaus und Konto-Lager (itemClean) nehmen es nicht mit – dort ist das Teil wieder im Original.
// Schlüssel: „Platz:Form:Stufe:Farbe“, Farbe = u (Stufenfarbe), v0–v9 (Farbvariante), z<Set>, e<Prägung>-<Färbung>.
//
// Sichtbar wird das Aussehen nur beim Zeichnen: drawPlayer (2D), playerLook, playerKey3/playerConfig3/syncPlayer3 (3D)
// bekommen für die Dauer des Aufrufs eine Sicht-Ausrüstung (gdSicht), deren Teile Tier, Art und Farbe des Aussehens
// tragen und alles andere (Plus, Seltenheit, Leuchten) vom echten Teil erben. Mitspieler bekommen eq[Platz].optik mit
// (netPlayerState) und zeigen es genauso; Spiellogik, Werte und Speichern sehen immer die echte Ausrüstung.

const GD = {
  max: 800, // höchstens so viele Einträge (Schutz des Spielstands, rund 20 KB)
  // Gold für ein Aussehen: wächst mit der Stufe des Aussehens und der eigenen Stufe (Lv 80, Ewig: 20.400 Gold)
  preis: (t, lv) => Math.round(((80 + 40 * (t + 1) * (t + 1)) * (1 + Math.max(1, lv) / 20)) / 10) * 10
};
if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('garderobe')) SAVE_FIELDS.push('garderobe');

// Plätze der Figur, in der Reihenfolge des Inventars
const GD_SLOTS = ['waffe', 'schild', 'helm', 'ruestung', 'schultern', 'umhang', 'guertel', 'schuhe'];
// Plätze, deren Form die Klasse ist (Waffen: die Waffenart)
const GD_FORM_CLS = new Set(['ruestung', 'helm']);
// Waffenarten, die dieselbe Haltung teilen (Einhänder des Kriegers, Zweihänder des Leibes)
const GD_KIND_GRUPPE = { sword: 'einhand', axe: 'einhand', greatsword: 'zweihand', greataxe: 'zweihand' };
const GD_ID = /^[a-z0-9_]{1,40}$/i;
const gdHas = (o, k) => typeof k === 'string' && !!o && Object.prototype.hasOwnProperty.call(o, k);
// nur bekannte Sets (Instanz- und Klassensets stehen alle in ITEM_SETS)
const gdSetOk = (id) => GD_ID.test(id) && typeof ITEM_SETS !== 'undefined' && gdHas(ITEM_SETS, id);
const gdDe = (n) => Math.round(n).toLocaleString('de-DE');

// --- Schlüssel ---------------------------------------------------------------------------------------------------
// Farbe vor dem Garderoben-Wrapper (gearHue wird weiter unten umgebogen)
const _gdGearHue = gearHue;
function gdFarbe(it) {
  if (typeof it.set === 'string' && it.set) return gdSetOk(it.set) ? 'z' + it.set : 'u';
  const F = typeof e80Fam === 'function' ? e80Fam(it) : null;
  const D = typeof e80Dye === 'function' ? e80Dye(it) : null;
  if (F || D) return 'e' + (F ? F.id : '') + '-' + (D ? D.id : '');
  if (!_gdGearHue(it)) return 'u';
  return 'v' + gearVariant(it);
}
function gdForm(it) {
  if (it.slot === 'waffe') return gdHas(WEAPON_KINDS, it.kind) ? it.kind : null;
  if (GD_FORM_CLS.has(it.slot)) return gdHas(CLASSES, it.cls) ? it.cls : null;
  return '';
}
// Schlüssel des eigenen (Original-)Aussehens eines Teils oder null
function gdSchluessel(it) {
  if (!it || typeof it !== 'object' || (typeof isBook === 'function' && isBook(it))) return null;
  if (!ALL_SLOTS.includes(it.slot) || !Number.isInteger(it.tier) || !ITEM_TIERS[it.tier]) return null;
  const f = gdForm(it);
  if (f == null) return null;
  return `${it.slot}:${f}:${it.tier}:${gdFarbe(it)}`;
}
// Schlüssel lesen und prüfen (gemerkt): { key, s, f, t, c } oder null. Gilt auch für Schlüssel von Mitspielern:
// nur Plätze, Waffenarten, Klassen, Stufen, Farbvarianten, Sets, Prägungen und Färbungen aus den eigenen Tabellen.
const GD_LIES = new Map();
function gdLies(key) {
  if (typeof key !== 'string' || key.length > 90) return null;
  let L = GD_LIES.get(key);
  if (L !== undefined) return L;
  L = null;
  const parts = key.split(':');
  if (parts.length === 4) {
    const [s, f, ts, c] = parts;
    const t = /^\d$/.test(ts) ? +ts : -1;
    const formOk = s === 'waffe' ? gdHas(WEAPON_KINDS, f) : GD_FORM_CLS.has(s) ? gdHas(CLASSES, f) : f === '';
    let colOk = c === 'u' || (/^v\d$/.test(c) && +c.slice(1) < GEAR_HUES.length) || (c[0] === 'z' && gdSetOk(c.slice(1)));
    if (!colOk && /^e[a-z]*-[a-z]*$/.test(c) && typeof E80_FAM !== 'undefined' && t === E80.tier) {
      const [fa, dy] = c.slice(1).split('-');
      colOk = !!(fa || dy) && (!fa || gdHas(E80_FAM, fa)) && (!dy || gdHas(E80_DYES, dy));
    }
    if (ALL_SLOTS.includes(s) && t >= 0 && t < ITEM_TIERS.length && formOk && colOk) L = { key, s, f, t, c };
  }
  if (GD_LIES.size > 4000) GD_LIES.clear();
  GD_LIES.set(key, L);
  return L;
}
// Farbe eines Aussehens an ein (Sicht-)Teil schreiben; __gdc steuert gearHue (siehe unten)
function gdFarbeSetzen(v, c) {
  v.fv = c[0] === 'v' ? +c.slice(1) : undefined;
  v.set = c[0] === 'z' ? c.slice(1) : undefined;
  let fa = '';
  let dy = '';
  if (c[0] === 'e') [fa, dy] = c.slice(1).split('-');
  v.v80 = fa || undefined;
  v.dye = dy || undefined;
  v.__gdc = c;
  return v;
}
// Ein Gegenstand, der genau so aussieht (für Symbol, Name, Tragen-Prüfung und Vorschau), gemerkt je Schlüssel
const GD_TEIL = new Map();
function gdTeil(L) {
  let it = GD_TEIL.get(L.key);
  if (it) return it;
  it = { uid: 'gd', slot: L.s, tier: L.t, plus: 0, rarity: 0 };
  if (L.s === 'waffe') {
    it.kind = L.f;
    it.cls = WEAPON_KINDS[L.f].cls;
  } else if (GD_FORM_CLS.has(L.s)) it.cls = L.f;
  else if (L.s === 'schild') it.cls = 'krieger';
  else if (L.s === 'koecher') it.cls = 'ninja';
  gdFarbeSetzen(it, L.c);
  GD_TEIL.set(L.key, it);
  return it;
}
// Passt die Form des Aussehens zu diesem Teil? (Platz, Waffenart bzw. -gruppe, Klasse) – gilt auch für Mitspieler
function gdPasst(L, it) {
  if (!L || !it || L.s !== it.slot) return false;
  if (L.s === 'waffe') return L.f === it.kind || (!!GD_KIND_GRUPPE[L.f] && GD_KIND_GRUPPE[L.f] === GD_KIND_GRUPPE[it.kind]);
  if (GD_FORM_CLS.has(L.s)) return L.f === it.cls;
  return true;
}
// Darf die eigene Figur dieses Aussehen auf dieses Teil legen? Leer = ja, sonst der Grund
function gdProblem(L, it, p) {
  if (!gdPasst(L, it)) return 'Passt nicht zu diesem Teil.';
  return wearProblem(gdTeil(L), p) || '';
}
// Klasse der Figur passt (beim Sammeln; Stufe und Weg zählen erst beim Übertragen)
const gdKlasseOk = (L, classId) => !wearProblem(gdTeil(L), classId);
const gdName = (L) => (L ? itemName(gdTeil(L)) : '');

// --- Sammlung ----------------------------------------------------------------------------------------------------
function gdState(p) {
  p = p || game.player;
  if (!p.garderobe || typeof p.garderobe !== 'object') p.garderobe = {};
  const g = p.garderobe;
  if (!Array.isArray(g.L)) g.L = [];
  g.neu = Math.max(0, g.neu | 0);
  // schnelles Nachschlagen, nicht im Spielstand (nicht aufzählbar)
  if (!g.__set || g.__set.size !== g.L.length) {
    const set = new Set();
    for (const k of g.L) if (gdLies(k)) set.add(k);
    g.L = [...set];
    Object.defineProperty(g, '__set', { value: set, writable: true, configurable: true, enumerable: false });
  }
  return g;
}
// Aussehen eines Teils aufnehmen (nur, was die eigene Klasse tragen kann); true = neu
function gdSammeln(it, p, still) {
  p = p || game.player;
  if (!p || !it) return false;
  const key = gdSchluessel(it);
  const L = key && gdLies(key);
  if (!L || !gdKlasseOk(L, p.classId)) return false;
  const g = gdState(p);
  if (g.__set.has(key) || g.L.length >= GD.max) return false;
  g.L.push(key);
  g.__set.add(key);
  if (!still) g.neu++;
  return true;
}
const gdHat = (p, key) => gdState(p).__set.has(key);

// erbeutet: alles, was in die Tasche kommt (Beute, Händler, Handel, Post …)
const _gdAddToBag = addToBag;
// eslint-disable-next-line no-global-assign
addToBag = function (item) {
  const r = _gdAddToBag(item);
  if (r) try { gdSammeln(item); } catch (err) { /* die Sammlung darf die Beute nie aufhalten */ }
  return r;
};
// angelegt: alle 2 s ein Blick auf die Ausrüstung; beim ersten Mal auch Tasche und Lager (was man schon besitzt)
function gdTakt() {
  const p = typeof game !== 'undefined' ? game.player : null;
  if (!p || !game.running || !p.equipment) return;
  const g = gdState(p);
  if (!g.init) {
    const alle = [...Object.values(p.equipment), ...(p.inventory || []), ...((p.storage && p.storage.items) || [])];
    for (const it of alle) gdSammeln(it, p, true);
    g.init = 1;
  }
  for (const sl of GD_SLOTS) {
    const it = p.equipment[sl];
    if (it) gdSammeln(it, p);
  }
}
setInterval(() => { try { gdTakt(); } catch (err) { /* nächster Takt */ } }, 2000);

// --- Aussehen übertragen -----------------------------------------------------------------------------------------
const gdPreis = (L, p) => GD.preis(L.t, p.level);
function gdAnlegen(slot, key) {
  const p = game.player;
  const it = p && p.equipment && p.equipment[slot];
  const L = gdLies(key);
  if (!it || !L || !gdHat(p, key)) return false;
  if (key === gdSchluessel(it)) return gdOriginal(slot);
  const prob = gdProblem(L, it, p);
  if (prob) {
    ui.log(prob, 'warn');
    return false;
  }
  if (it.optik === key) return true;
  const preis = gdPreis(L, p);
  if (p.gold < preis) {
    ui.log(`Nicht genug Gold · ${gdDe(preis)} Gold`, 'warn');
    return false;
  }
  p.gold -= preis;
  it.optik = key;
  afterGearChange();
  ui.log(`Aussehen übernommen · ${gdName(L)} · ${gdDe(preis)} Gold`, 'success');
  try { if (typeof sfx !== 'undefined' && sfx.success) sfx.success(); } catch (err) { /* ohne Ton */ }
  return true;
}
function gdOriginal(slot) {
  const p = game.player;
  const it = p && p.equipment && p.equipment[slot];
  if (!it || !it.optik) return false;
  delete it.optik;
  afterGearChange();
  ui.log(`Original-Aussehen · ${itemName(it)}`, 'info');
  return true;
}

// --- Beim Zeichnen: Sicht-Ausrüstung --------------------------------------------------------------------------------
// Ein Teil, das wie das Aussehen L aussieht und alles andere vom echten Teil erbt (Plus, Seltenheit, Boni, Leuchten)
function gdSichtTeil(it, L) {
  const v = Object.create(it);
  v.tier = L.t;
  if (L.s === 'waffe') v.kind = L.f;
  return gdFarbeSetzen(v, L.c);
}
// Sicht-Ausrüstung zu einer Ausrüstung (null, wenn kein Teil ein fremdes Aussehen trägt). Gemerkt, solange dieselben
// Teile mit demselben Aussehen angelegt sind; die Ausrüstung der Mitspieler kommt mit jeder Nachricht neu.
const GD_VIS = new WeakMap();
function gdSicht(eq) {
  if (!eq || typeof eq !== 'object' || eq.__gdVis) return null;
  let any = false;
  for (let i = 0; i < GD_SLOTS.length; i++) {
    const it = eq[GD_SLOTS[i]];
    if (it && it.optik) { any = true; break; }
  }
  if (!any) return null;
  const c = GD_VIS.get(eq);
  if (c) {
    let same = true;
    for (let i = 0; i < GD_SLOTS.length; i++) {
      const it = eq[GD_SLOTS[i]];
      if (c.src[i] !== it || c.opt[i] !== (it ? it.optik : undefined)) { same = false; break; }
    }
    if (same) return c.vis;
  }
  const vis = {};
  Object.defineProperty(vis, '__gdVis', { value: true });
  const src = [];
  const opt = [];
  for (const k in eq) vis[k] = eq[k];
  for (const sl of GD_SLOTS) {
    const it = eq[sl];
    src.push(it);
    opt.push(it ? it.optik : undefined);
    const L = it && it.optik ? gdLies(it.optik) : null;
    vis[sl] = L && gdPasst(L, it) ? gdSichtTeil(it, L) : it;
  }
  GD_VIS.set(eq, { src, opt, vis });
  return vis;
}
// Farben der Sicht-Teile: genau die des Aussehens (nicht die Seltenheit oder das Set des echten Teils)
const GD_HUE = new Map();
// eslint-disable-next-line no-global-assign
gearHue = function (it) {
  const c = it && it.__gdc;
  if (!c) return _gdGearHue(it);
  if (c === 'u') return null;
  const k = c + '|' + it.tier + '|' + it.slot;
  if (GD_HUE.has(k)) return GD_HUE.get(k);
  const base = { slot: it.slot, tier: it.tier, kind: it.kind, plus: 0, rarity: 0 };
  if (c[0] === 'v') base.fv = +c.slice(1);
  else if (c[0] === 'z') base.set = c.slice(1);
  else if (c[0] === 'e') {
    const [fa, dy] = c.slice(1).split('-');
    if (fa) base.v80 = fa;
    if (dy) base.dye = dy;
  }
  const h = _gdGearHue(base);
  if (GD_HUE.size > 600) GD_HUE.clear();
  GD_HUE.set(k, h);
  return h;
};
// Zeichnen mit der Sicht-Ausrüstung: für die Dauer des Aufrufs liegt sie an der Figur, danach wieder die echte
const _gdDrawPlayer = drawPlayer;
// eslint-disable-next-line no-global-assign
drawPlayer = function (ctx, p) {
  const eq = p && p.equipment;
  const vis = eq ? gdSicht(eq) : null;
  if (!vis) return _gdDrawPlayer(ctx, p);
  p.equipment = vis;
  try { return _gdDrawPlayer(ctx, p); } finally { p.equipment = eq; }
};
// Nachbilder (Ausweichen, Sprung) malen die Figur mit playerLook außerhalb von drawPlayer
const _gdPlayerLook = playerLook;
// eslint-disable-next-line no-global-assign
playerLook = function (p) {
  const eq = p && p.equipment;
  const vis = eq ? gdSicht(eq) : null;
  if (!vis) return _gdPlayerLook(p);
  p.equipment = vis;
  try { return _gdPlayerLook(p); } finally { p.equipment = eq; }
};
// 3D: Schlüssel und Bauplan der Figur, die Figur im Bild (Haltung je Waffenart) und das Figurenbild in Fenstern
for (const name of ['playerKey3', 'playerConfig3', 'syncPlayer3']) {
  if (typeof window[name] !== 'function') continue;
  const orig = window[name];
  window[name] = function (p, dt) {
    const eq = p && p.equipment;
    const vis = eq ? gdSicht(eq) : null;
    if (!vis) return orig(p, dt);
    p.equipment = vis;
    try { return orig(p, dt); } finally { p.equipment = eq; }
  };
}
if (typeof v3Portrait === 'function') {
  const _gdPortrait = v3Portrait;
  // eslint-disable-next-line no-global-assign
  v3Portrait = function (canvas, who, yaw, pose, live) {
    const eq = who && who.equipment;
    const vis = eq ? gdSicht(eq) : null;
    if (!vis) return _gdPortrait(canvas, who, yaw, pose, live);
    who.equipment = vis;
    try { return _gdPortrait(canvas, who, yaw, pose, live); } finally { who.equipment = eq; }
  };
}

// --- Mitspieler: Aussehen reist mit ---------------------------------------------------------------------------------
if (typeof netPlayerState === 'function') {
  const _gdNet = netPlayerState;
  // eslint-disable-next-line no-global-assign
  netPlayerState = function () {
    const s = _gdNet();
    const eq = game.player && game.player.equipment;
    if (s && s.eq && eq) {
      for (const sl of Object.keys(s.eq)) {
        const it = eq[sl];
        if (it && it.optik && gdPasst(gdLies(it.optik), it)) s.eq[sl].optik = it.optik;
      }
    }
    return s;
  };
}
// Empfang: Schlüssel VOR dem Original lesen (es säubert den Zustand womöglich), streng prüfen (gdLies: nur Werte aus den
// eigenen Tabellen; gdPasst: Form passt zum Teil) und nur geprüft wieder anhängen – alles andere fällt weg
if (typeof netApplyState === 'function') {
  const _gdApply = netApplyState;
  // eslint-disable-next-line no-global-assign
  netApplyState = function (rp, s) {
    let opt = null;
    const eq = s && typeof s === 'object' && s.eq && typeof s.eq === 'object' ? s.eq : null;
    if (eq) {
      for (const sl of GD_SLOTS) {
        const it = eq[sl];
        const k = it && typeof it === 'object' ? it.optik : null;
        if (typeof k === 'string' && gdLies(k)) (opt || (opt = {}))[sl] = k;
      }
    }
    const r = _gdApply(rp, s);
    const req = rp && rp.equipment && typeof rp.equipment === 'object' ? rp.equipment : null;
    if (req) {
      for (const sl of GD_SLOTS) {
        const it = req[sl];
        if (!it || typeof it !== 'object') continue;
        const k = opt && opt[sl];
        if (k && gdPasst(gdLies(k), it)) it.optik = k;
        else if (Object.prototype.hasOwnProperty.call(it, 'optik')) delete it.optik;
      }
    }
    return r;
  };
}

// Gegenstandskarte: übertragenes Aussehen nennen
if (typeof itemCardHtml === 'function') {
  const _gdCard = itemCardHtml;
  // eslint-disable-next-line no-global-assign
  itemCardHtml = function (item, p, o) {
    const h = _gdCard(item, p, o);
    const L = item && item.optik ? gdLies(item.optik) : null;
    if (!L || !gdPasst(L, item) || typeof h !== 'string' || !h.endsWith('</div>')) return h;
    return h.slice(0, -6) + `<small class="ic-note gd-note"><span>Aussehen:</span> <b>${gdName(L)}</b></small></div>`;
  };
}

// --- Erfolge -----------------------------------------------------------------------------------------------------
if (typeof ERFOLGE !== 'undefined' && typeof ERFOLG_BY_ID !== 'undefined') {
  const n = (p) => (p.garderobe && Array.isArray(p.garderobe.L) ? p.garderobe.L.length : 0);
  for (const E of [
    { id: 'garderobe1', kat: 'Sammlung', name: 'Modebewusst', text: 'Sammle {n} Aussehen in der Garderobe', need: 25, val: n, pts: 10 },
    { id: 'garderobe2', kat: 'Sammlung', name: 'Volle Kleiderkammer', text: 'Sammle {n} Aussehen in der Garderobe', need: 100, val: n, pts: 25, titel: 'der Gutgekleidete' }
  ]) {
    if (ERFOLG_BY_ID[E.id]) continue;
    ERFOLGE.push(E);
    ERFOLG_BY_ID[E.id] = E;
  }
}

// --- Seite „Sammlung“ im Charakterfenster ----------------------------------------------------------------------------
// Unterseiten: Garderobe (hier), Haustiere (haustiere.js), Emotes (emotes.js) – je { id, label, html, bind, dot, haupt }
// dot: Zahl am Unterreiter; haupt: zählt auch am Reiter „Sammlung“ (neue Haustiere ja, neue Aussehen nicht – die kommen
// mit fast jeder Beute)
const SAMMLUNG_SEITEN = [];
const SAMMLUNG = { seite: 'garderobe' };
function sammlungHtml(p) {
  const list = SAMMLUNG_SEITEN.filter((s) => !s.show || s.show(p));
  const cur = list.find((s) => s.id === SAMMLUNG.seite) || list[0];
  if (!cur) return '';
  SAMMLUNG.seite = cur.id;
  const dot = (s) => {
    const n = s.dot ? s.dot(p) : 0;
    return n > 0 ? `<i class="tab-dot">${n}</i>` : '';
  };
  return `<nav class="sm-tabs">${list.map((s) => `<button type="button" data-smseite="${s.id}" class="${s.id === cur.id ? 'on' : ''}">${s.label}${dot(s)}</button>`).join('')}</nav>` +
    `<div class="sm-seite" data-smseite-body="${cur.id}">${cur.html(p)}</div>`;
}
function sammlungBind(root) {
  root.querySelectorAll('[data-smseite]').forEach((b) => b.addEventListener('click', () => {
    SAMMLUNG.seite = b.dataset.smseite;
    ui.renderCharPanel();
  }));
  const cur = SAMMLUNG_SEITEN.find((s) => s.id === SAMMLUNG.seite);
  if (cur && cur.bind) cur.bind(root);
}
// Sammlung direkt öffnen (z. B. aus einer Meldung oder dem Emote-Menü)
function sammlungOeffnen(seite) {
  if (seite) SAMMLUNG.seite = seite;
  ui.charTab = 'sammlung';
  if ($('panelChar').hidden) ui.toggle('panelChar');
  else ui.renderCharPanel();
}
if (typeof CHAR_TABS_EXTRA !== 'undefined') {
  CHAR_TABS_EXTRA.push({
    id: 'sammlung', label: 'Sammlung', show: () => true, html: sammlungHtml, bind: sammlungBind,
    dot: (p) => SAMMLUNG_SEITEN.reduce((n, s) => n + (s.haupt && s.dot && (!s.show || s.show(p)) ? s.dot(p) || 0 : 0), 0)
  });
}

// Garderobe: gewählter Platz und gewähltes Aussehen (Vorschau)
const GD_UI = { slot: null, wahl: null };
// Plätze der Figur mit Namen (Nebenhand/Köcher wie im Inventar)
const gdPlaetze = (p) => equipSlotsFor(p.classId).map((sl) => sl.id);
// Aussehen, die auf dieses Teil passen (Form), sortiert nach Stufe und Farbe
function gdAuswahl(p, it) {
  const out = [];
  for (const k of gdState(p).L) {
    const L = gdLies(k);
    if (L && gdPasst(L, it)) out.push(L);
  }
  return out.sort((a, b) => a.t - b.t || (a.f < b.f ? -1 : a.f > b.f ? 1 : 0) || (a.c < b.c ? -1 : a.c > b.c ? 1 : 0));
}
function gdHtml(p) {
  const g = gdState(p);
  const plaetze = gdPlaetze(p);
  if (!GD_UI.slot || !plaetze.includes(GD_UI.slot) || !p.equipment[GD_UI.slot]) GD_UI.slot = plaetze.find((sl) => p.equipment[sl]) || plaetze[0];
  const slot = GD_UI.slot;
  const it = p.equipment[slot];
  const tiles = plaetze.map((sl) => {
    const t = p.equipment[sl];
    const Lt = t && t.optik ? gdLies(t.optik) : null;
    const lab = slotLabel(sl, p);
    if (!t) return `<button type="button" class="gd-platz leer" disabled><span class="gd-pl">${lab}</span></button>`;
    const icon = itemIconUrl(Lt && gdPasst(Lt, t) ? gdTeil(Lt) : t);
    return `<button type="button" class="gd-platz${sl === slot ? ' on' : ''}${Lt ? ' optik' : ''}" data-gdslot="${sl}" title="${itemName(t)}">` +
      `<img src="${icon}" alt=""><span class="gd-pl">${lab}</span>${Lt ? '<i class="gd-mark">✂</i>' : ''}</button>`;
  }).join('');
  let h = `<div class="gd"><div class="gd-links"><canvas id="gdDoll" class="doll gd-doll" title="Antippen dreht die Figur"></canvas>` +
    `<p class="gd-zahl"><b>${g.L.length}</b> <span>Aussehen gesammelt</span></p></div><div class="gd-rechts"><div class="gd-plaetze">${tiles}</div>`;
  if (!it) {
    h += '<p class="gd-hint">Lege zuerst ein Teil an. Jedes Aussehen, das du anlegst oder erbeutest, kommt in deine Garderobe.</p></div></div>';
    return h;
  }
  const own = gdSchluessel(it);
  const cur = it.optik && gdPasst(gdLies(it.optik), it) ? it.optik : own;
  const list = gdAuswahl(p, it);
  if (!GD_UI.wahl || !list.some((L) => L.key === GD_UI.wahl)) GD_UI.wahl = cur;
  const wahl = gdLies(GD_UI.wahl);
  const locked = [];
  const looks = list.map((L) => {
    const prob = L.key === own ? '' : gdProblem(L, it, p);
    if (prob) { locked.push(L); return ''; }
    const T = ITEM_TIERS[L.t];
    const cls = ['gd-look'];
    if (L.key === GD_UI.wahl) cls.push('wahl');
    if (L.key === cur) cls.push('jetzt');
    return `<button type="button" class="${cls.join(' ')}" data-gdlook="${L.key}" title="${gdName(L)} · ${T.label}">` +
      `<img src="${itemIconUrl(gdTeil(L))}" alt="">${L.key === own ? '<i class="gd-orig">Original</i>' : ''}</button>`;
  }).join('');
  h += `<div class="gd-wahl"><h4><span>${slotLabel(slot, p)}</span> · <span>${itemName(it)}</span></h4>` +
    `<p class="gd-jetzt"><span>Aussehen jetzt:</span> <b>${cur === own ? 'Original' : gdName(gdLies(cur))}</b></p>` +
    `<div class="gd-grid">${looks}</div>` +
    (locked.length ? `<p class="gd-hint"><span>Noch gesperrt (Stufe oder Weg):</span> <b>${locked.length}</b></p>` : '');
  // Aktion zum gewählten Aussehen
  if (wahl && wahl.key !== cur) {
    if (wahl.key === own) h += `<p class="gd-aktion"><button type="button" class="btn btn-primary" data-gdorig>Zurück zum Original</button> <span class="gd-hint">kostenlos</span></p>`;
    else {
      const preis = gdPreis(wahl, p);
      const ok = p.gold >= preis;
      h += `<p class="gd-aktion"><button type="button" class="btn btn-primary" data-gdkauf${ok ? '' : ' disabled'}><span>Aussehen übernehmen</span> · <b>${gdDe(preis)} Gold</b></button>` +
        (ok ? '' : ' <span class="gd-hint">Nicht genug Gold</span>') + '</p>';
    }
    h += `<p class="gd-vor"><span>Vorschau:</span> <b>${wahl.key === own ? 'Original' : gdName(wahl)}</b></p>`;
  } else if (cur !== own) h += `<p class="gd-aktion"><button type="button" class="btn" data-gdorig>Zurück zum Original</button> <span class="gd-hint">kostenlos</span></p>`;
  h += '<p class="gd-hint">Werte, Boni und Plus bleiben – nur die Optik ändert sich. Mitspieler sehen dein neues Aussehen.</p></div></div></div>';
  g.neu = 0;
  return h;
}
// Vorschau-Figur: die eigene Figur mit dem gewählten Aussehen am gewählten Platz
function gdVorschau(p) {
  const it = GD_UI.slot ? p.equipment[GD_UI.slot] : null;
  const eq = Object.assign({}, p.equipment);
  if (it && GD_UI.wahl) {
    const v = Object.create(it);
    v.optik = GD_UI.wahl === gdSchluessel(it) ? undefined : GD_UI.wahl;
    eq[GD_UI.slot] = v;
  }
  return { classId: p.classId, path: p.path, look: p.look, level: p.level, name: p.name, buffs: [], equipment: eq, x: 0, y: 0, r: 11, facing: { x: 0, y: 1 } };
}
function gdBind(root) {
  const p = game.player;
  root.querySelectorAll('[data-gdslot]').forEach((b) => b.addEventListener('click', () => {
    GD_UI.slot = b.dataset.gdslot;
    GD_UI.wahl = null;
    ui.renderCharPanel();
  }));
  root.querySelectorAll('[data-gdlook]').forEach((b) => b.addEventListener('click', () => {
    GD_UI.wahl = b.dataset.gdlook;
    ui.renderCharPanel();
  }));
  const kauf = root.querySelector('[data-gdkauf]');
  if (kauf) kauf.addEventListener('click', () => { if (gdAnlegen(GD_UI.slot, GD_UI.wahl)) ui.renderCharPanel(); });
  const orig = root.querySelector('[data-gdorig]');
  if (orig) orig.addEventListener('click', () => {
    gdOriginal(GD_UI.slot);
    GD_UI.wahl = null;
    ui.renderCharPanel();
  });
  const doll = root.querySelector('#gdDoll');
  if (doll && typeof drawDoll === 'function') drawDoll(doll, gdVorschau(p));
}
SAMMLUNG_SEITEN.push({ id: 'garderobe', label: 'Garderobe', html: gdHtml, bind: gdBind, dot: (p) => Math.min(99, gdState(p).neu) });

(function gdCss() {
  if (document.getElementById('gdCss')) return;
  const st = document.createElement('style');
  st.id = 'gdCss';
  st.textContent =
    // mit der Seite „Sammlung“ passen die Reiter auf Stufe 80 nicht mehr in eine Zeile: umbrechen statt abschneiden
    '.char-tabs{flex-wrap:wrap}' +
    '.sm-tabs{display:flex;gap:6px;margin:0 0 8px;flex-wrap:wrap}.sm-tabs button{position:relative;padding:5px 12px;border-radius:8px;border:1px solid var(--brass-dim,#6a5230);' +
    'background:rgba(0,0,0,.25);color:var(--parchment,#efe4c4);font:inherit;font-size:13px;font-weight:700;cursor:var(--zeiger-hand,pointer)}' +
    '.sm-tabs button.on{border-color:#f0d08a;background:rgba(240,208,138,.18);color:#ffe8b0}' +
    '.sm-tabs .tab-dot{position:absolute;top:-7px;right:-6px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;font-style:normal;font-size:10px;' +
    'line-height:16px;color:#fff;background:#d8402f;box-shadow:0 0 0 1.5px #120c08}' +
    '.gd{display:flex;gap:10px;align-items:flex-start}.gd-links{flex:none;display:flex;flex-direction:column;align-items:center;gap:4px}' +
    '.gd-doll{width:128px !important;height:176px;cursor:var(--zeiger-hand,pointer)}.gd-zahl{margin:0;font-size:12px;opacity:.85;text-align:center}.gd-zahl b{color:#ffd96a}' +
    '.gd-rechts{flex:1;min-width:0}.gd-plaetze{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:5px;margin-bottom:8px}' +
    '.gd-platz{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:3px 2px;border-radius:8px;border:1px solid rgba(255,255,255,.14);' +
    'background:rgba(0,0,0,.28);color:inherit;font:inherit;cursor:var(--zeiger-hand,pointer)}.gd-platz img{width:38px;height:38px}' +
    '.gd-platz.on{border-color:#f0d08a;box-shadow:0 0 8px rgba(240,208,138,.35) inset}.gd-platz.leer{opacity:.4;cursor:default;min-height:52px;justify-content:flex-end}' +
    '.gd-pl{font-size:10px;opacity:.8;white-space:nowrap;overflow:hidden;max-width:100%;text-overflow:ellipsis}' +
    '.gd-mark{position:absolute;top:1px;right:3px;font-style:normal;font-size:11px;color:#ffd96a}' +
    '.gd-wahl h4{margin:2px 0 4px;font-size:14px}.gd-jetzt,.gd-vor{margin:2px 0;font-size:12px}.gd-jetzt b,.gd-vor b{color:#ffe8b0}' +
    '.gd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(50px,1fr));gap:5px;margin:6px 0;max-height:220px;overflow-y:auto;padding:2px}' +
    '.gd-look{position:relative;aspect-ratio:1;padding:2px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.3);cursor:var(--zeiger-hand,pointer)}' +
    '.gd-look img{width:100%;height:100%}.gd-look.jetzt{border-color:#9fe08f}.gd-look.wahl{border-color:#f0d08a;box-shadow:0 0 0 2px rgba(240,208,138,.5)}' +
    '.gd-orig{position:absolute;left:0;right:0;bottom:1px;font-style:normal;font-size:9px;text-align:center;color:#ffe8b0;text-shadow:0 1px 2px #000}' +
    '.gd-aktion{margin:6px 0;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.gd-hint{opacity:.75;font-size:12px;margin:4px 0}' +
    '.gd-note b{color:#ffe8b0}' +
    '@media (max-width:640px){.gd{flex-direction:column;align-items:stretch}.gd-links{flex-direction:row;justify-content:center}.gd-doll{width:96px !important;height:132px}}';
  document.head.appendChild(st);
})();

// --- Ratgeber ----------------------------------------------------------------------------------------------------
if (typeof RATGEBER_WISSEN !== 'undefined') {
  RATGEBER_WISSEN.push(
    {
      c: 'ausruestung', q: 'Wie ändere ich das Aussehen meiner Ausrüstung (Garderobe)?',
      a: 'Jedes Aussehen, das du einmal anlegst oder erbeutest, kommt in deine <b>Garderobe</b> (Charakterfenster → <b>Sammlung</b> → Garderobe). ' +
        'Wähle dort einen Platz und ein gesammeltes Aussehen: Die Figur zeigt dir eine Vorschau, für etwas Gold übernimmt dein angelegtes Teil die Optik. ' +
        'Werte, Boni, Plus und Seltenheit bleiben, nur das Aussehen ändert sich – Mitspieler sehen es auch. Zurück zum Original geht jederzeit kostenlos.',
      k: 'garderobe aussehen transmog optik skin kleidung mode umfaerben aussehen aendern rüstung aussehen waffe aussehen sammlung schneider'
    },
    {
      c: 'ausruestung', q: 'Welche Aussehen darf ich in der Garderobe nutzen?',
      a: 'Nur, was du selbst tragen dürftest: deine Klasse, dein Weg (Zweihänder nur der Weg des Leibes) und deine Stufe (ein Ewig-Aussehen erst ab Stufe 80). ' +
        'Waffen bleiben in ihrer Art – Schwert und Axt sowie Zweihänder und Streitaxt lassen sich untereinander tauschen. ' +
        'Gibst du ein Teil weg (Handel, Post, Auktionshaus, Konto-Lager), geht es im Original weiter; die gesammelten Aussehen bleiben dir.',
      k: 'garderobe gesperrt welche aussehen erlaubt klasse weg stufe waffenart schwert axt zweihaender handel aussehen weg'
    }
  );
}
