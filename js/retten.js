'use strict';
// Charakter retten (seit 15.49). Anlass: „Der Charakter Nibbatar3000 ist verbuggt, er kommt nicht mehr ins Spiel“ –
// ohne Spielstand ließ sich nicht sagen, ob es beim Laden hing, eine Fehlermeldung kam oder die Figur festsaß. Darum
// gibt es jetzt an allen Stellen einen Ausweg, der nichts löscht:
//
// 1. rettenReparieren(spielstand): bringt den Charakter in die sichere Stadt seiner Seite und Stufe (factionHomeMap,
//    seiten.js), beendet Reiten, Tod, offene Rangkämpfe und Rückkehrpunkte von Arena/Turm/Instanz/Dungeon (die liegen
//    nur im Ort, der ja neu ist) und repariert Daten, an denen das Spiel scheitern kann: unbekannte Fertigkeits-IDs
//    (Bücher → SKILL_RENAMED, sonst die erste Fertigkeit des eigenen Wegs), kaputte Zahlen und Felder, Gegenstände mit
//    unbekanntem Platz, unmöglicher Stufe, kaputten Boni, ungültiger Prägung/Farbe. Nicht reparierbare Gegenstände kommen
//    in p.fundsachen (bleiben im Spielstand, werden nie gelöscht), falsch angelegte in die Tasche.
// 2. Charakterauswahl: 🛟 je Charakter → Nachfrage → Reparatur, gespeichert auf dem Gerät und – mit Konto – im Konto
//    (ohne vorher ins Spiel zu müssen). Wichtig für Charaktere, die gar nicht mehr hineinkommen.
// 3. Robustes Betreten: wirft startGame einen Fehler, wirft danach jedes Bild einen Fehler (Spiel steht) oder hängt das
//    Ladebild ungewöhnlich lange, wird der Charakter einmal von selbst repariert und neu betreten. Klappt auch das nicht,
//    erscheint eine Meldung mit kurzem Fehlertext (fürs Bildschirmfoto) – nie ein stummes Hängen.
// 4. Einstellungen → Figur und Spiel: „Feststecken? In die Stadt zurück“ – 5 s Countdown (bricht bei Schaden ab),
//    danach in die sichere Stadt; Turm und Arena werden vorher über ihre eigenen Verlassen-Funktionen beendet
//    (turmStop, arenaStop). Im Duell und in der Turnierarena nicht möglich. Danach 10 Minuten Abklingzeit (p.rettenAt).
// 5. Weiter nach Absturz: Solange man spielt, merkt sich das Gerät alle paar Sekunden Charakter und Zeit
//    (RETTEN.weiterKey). Lädt die Seite neu, ohne dass man ausgeloggt hat (iOS beendet die Seite bei Speichermangel,
//    Neustart der Grafik in drei-kern.js), geht es binnen RETTEN.weiterMs direkt mit demselben Charakter weiter – ohne
//    Titel und Einführung, mit Konto nach dem Abgleich. Zweimal kurz hintereinander abgestürzt: keine Automatik mehr,
//    sondern ein Hinweis in der Auswahl (Schleife vermeiden).

const RETTEN = {
  cd: 10 * 60 * 1000, // Abklingzeit des Feststecken-Knopfs
  count: 5, // Countdown in s
  watchMs: 25000, // so lange nach dem Betreten auf Fehler achten
  frozenErrs: 25, // so viele Bildfehler in der Zeit heißen „das Spiel steht“
  loadMaxMs: 45000, // Ladebild länger als das: hängt
  weiterKey: 'seelenstein.weiter',
  weiterMs: 120000, // nach so viel Zeit ohne Spiel kein automatisches Weiter
  weiterStabil: 90000, // so lange ohne Absturz gilt eine Sitzung als stabil (Zähler zurück)
  enter: null, retry: 0, notes: null, autoN: 0, off: false, reloading: false,
  err: { list: [], shown: false }, stuck: null, timer: 0
};
if (typeof SAVE_FIELDS !== 'undefined') for (const f of ['fundsachen', 'rettenAt']) if (!SAVE_FIELDS.includes(f)) SAVE_FIELDS.push(f);

// --- Reparatur eines Spielstands (reine Daten, auch ohne laufendes Spiel) ---------------------------------------
const rtObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const rtNum = (v) => typeof v === 'number' && isFinite(v);
const rtHas = (o, k) => typeof k === 'string' && !!o && Object.prototype.hasOwnProperty.call(o, k);
function rtInt(v, lo, hi, def) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return rtNum(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : def;
}
// sichere Stadt der eigenen Seite zur Stufe (ab Stufe 50 Kazehana bzw. Mondfall)
function rettenStadt(sv) {
  const f = typeof factionOf === 'function' ? factionOf(sv) : 'licht';
  const id = typeof factionHomeMap === 'function' ? factionHomeMap(f, sv.level || 1) : 1;
  const spot = typeof mapSpawnSpot === 'function' && game.world ? mapSpawnSpot(id) : { x: CENTER_X * TILE, y: (CENTER_Y + 1) * TILE };
  const wm = typeof WORLD_MAPS !== 'undefined' ? WORLD_MAPS.find((m) => m.id === id) : null;
  return { x: spot.x, y: spot.y, id, name: wm ? wm.name : 'Kazehana', color: typeof FACTIONS !== 'undefined' && FACTIONS[f] ? FACTIONS[f].color : '#ffd36a' };
}
// Gegenstand prüfen und wo möglich reparieren; null = nicht zu reparieren (→ Fundsachen)
function rettenTeil(it, classId, path, fix) {
  if (!rtObj(it)) return null;
  if (it.book != null) {
    let id = typeof it.book === 'string' ? (SKILL_RENAMED[it.book] || it.book) : null;
    if (!id || typeof skillEntry !== 'function' || !skillEntry(id)) {
      // unbekannte Fertigkeit (z. B. aus einer älteren Version): Buch der ersten Fertigkeit des eigenen Wegs
      id = classPath(classId, path || 0).skills[0].id;
      fix.books++;
    } else if (id !== it.book) fix.renamed++;
    it.book = id;
    const n = rtInt(it.count != null ? it.count : it.n, 1, 9999, 1);
    if (n !== it.count) fix.items++;
    it.count = n;
    delete it.n;
    if (!it.uid) it.uid = newUid();
    return it;
  }
  if (!ALL_SLOTS.includes(it.slot)) return null;
  const tier = rtInt(it.tier, 0, ITEM_TIERS.length - 1, null);
  if (tier == null) return null;
  const before = JSON.stringify(it);
  it.tier = tier;
  it.plus = rtInt(it.plus, 0, MAX_PLUS, 0);
  if (it.rarity != null) it.rarity = rtInt(it.rarity, 0, RARITIES.length - 1, 0);
  if (it.cls != null && !(typeof it.cls === 'string' && rtHas(CLASSES, it.cls))) delete it.cls;
  if (it.slot === 'waffe' && !(typeof it.kind === 'string' && rtHas(WEAPON_KINDS, it.kind))) it.kind = CLASS_WEAPON_KINDS[it.cls || classId][0];
  for (const [k, pool] of [['bonuses', BONUS_TYPES], ['specials', SPECIAL_BONUS_TYPES]]) {
    if (it[k] == null) continue;
    if (!Array.isArray(it[k])) { delete it[k]; continue; }
    it[k] = it[k].filter((b) => rtObj(b) && rtHas(pool, b.t) && rtNum(b.v));
  }
  if (it.set != null && !(typeof it.set === 'string' && typeof ITEM_SETS !== 'undefined' && rtHas(ITEM_SETS, it.set))) delete it.set;
  if (typeof E80_FAM !== 'undefined') {
    if (it.v80 != null && !rtHas(E80_FAM, it.v80)) delete it.v80;
    if (it.dye != null && !rtHas(E80_DYES, it.dye)) delete it.dye;
    if (it.ved != null && !(Number.isInteger(it.ved) && it.ved >= 1 && it.ved <= E80.ved.max)) delete it.ved;
    if (it.rr != null && !(Number.isInteger(it.rr) && it.rr >= 1)) delete it.rr;
  }
  if (!it.uid) it.uid = newUid();
  if (JSON.stringify(it) !== before) fix.items++;
  return it;
}

// Spielstand reparieren und in die Stadt setzen. Ergebnis { save, notes } (save ist eine Kopie), null = nicht möglich
function rettenReparieren(raw) {
  let s;
  try { s = JSON.parse(JSON.stringify(raw)); } catch (e) { s = rtObj(raw) ? Object.assign({}, raw) : null; }
  if (!rtObj(s) || typeof s.name !== 'string' || !rtHas(CLASSES, s.classId)) return null;
  const C = CLASSES[s.classId];
  const notes = [];
  const fix = { items: 0, books: 0, renamed: 0, moved: 0, lost: 0, data: [] };
  // Grundwerte
  s.level = rtInt(s.level, 1, MAX_LEVEL, 1);
  if (s.path != null) {
    const pth = rtInt(s.path, 0, C.paths.length - 1, 0);
    if (pth !== s.path) fix.data.push('Weg');
    s.path = pth;
  }
  if (s.faction != null && s.faction !== 'licht' && s.faction !== 'schatten') {
    const f = String(s.faction).trim().toLowerCase();
    if (f === 'licht' || f === 'schatten') s.faction = f;
    else {
      delete s.faction;
      notes.push('Deine Seite (Licht oder Schatten) war beschädigt – du wählst sie beim Betreten neu.');
    }
  }
  for (const k of ['xp', 'gold', 'skillPoints', 'splinters', 'kills', 'stones', 'deaths', 'scrolls', 'statPoints', 'playTime', 'resets', 'books']) {
    if (s[k] == null || (rtNum(s[k]) && s[k] >= 0)) continue;
    s[k] = rtInt(s[k], 0, 1e13, 0);
    fix.data.push(k);
  }
  if (!rtNum(s.ultCd) || s.ultCd < 0 || s.ultCd > 600) s.ultCd = 0;
  // Fertigkeiten
  if (s.skillLevels != null) {
    const ok = Array.isArray(s.skillLevels) && s.skillLevels.length === 5 && s.skillLevels.every((l) => Number.isInteger(l) && l >= 1 && l <= MAX_SKILL_LEVEL);
    if (!ok) {
      const src = Array.isArray(s.skillLevels) ? s.skillLevels : [];
      s.skillLevels = [0, 1, 2, 3, 4].map((i) => rtInt(src[i], 1, MAX_SKILL_LEVEL, 1));
      fix.data.push('Fertigkeitsstufen');
    }
  }
  if (s.skillOrder != null) {
    const o = s.skillOrder;
    const used = Array.isArray(o) ? o.filter((k) => k != null) : [];
    const ok = Array.isArray(o) && (o.length === 5 || o.length === 6) && used.every((k) => Number.isInteger(k) && k >= 0 && k <= ULT_BAR) && new Set(used).size === used.length;
    if (!ok) { delete s.skillOrder; fix.data.push('Fertigkeitsleiste'); }
  }
  if (s.pathSkills != null) {
    if (!rtObj(s.pathSkills)) delete s.pathSkills;
    else for (const k of Object.keys(s.pathSkills)) {
      const v = s.pathSkills[k];
      if (!rtObj(v) || !Array.isArray(v.levels) || v.levels.length !== 5 || !(Number(k) >= 0 && Number(k) < C.paths.length)) delete s.pathSkills[k];
    }
  }
  // Felder, die ein Objekt bzw. eine Liste sein müssen (sonst fallen sie auf den Anfangswert zurück)
  for (const k of ['materials', 'upmats', 'potions', 'attrs', 'daily', 'quests', 'pvp', 'arena', 'instLock', 'ratgeber', 'look', 'guild']) {
    if (s[k] != null && !rtObj(s[k])) { delete s[k]; fix.data.push(k); }
  }
  for (const k of ['friends', 'fundsachen']) if (s[k] != null && !Array.isArray(s[k])) { delete s[k]; fix.data.push(k); }
  if (s.arrows != null && !rtObj(s.arrows) && !Array.isArray(s.arrows)) { delete s.arrows; fix.data.push('arrows'); }
  if (s.quick != null && !Array.isArray(s.quick)) delete s.quick;
  for (const k of ['materials', 'upmats', 'potions']) {
    if (!rtObj(s[k])) continue;
    for (const [m, v] of Object.entries(s[k])) if (!(rtNum(v) && v >= 0)) s[k][m] = rtInt(v, 0, 1e9, 0);
  }
  if (rtObj(s.attrs)) for (const a of ['str', 'vit', 'int', 'dex']) if (s.attrs[a] != null && !(Number.isInteger(s.attrs[a]) && s.attrs[a] >= 0 && s.attrs[a] <= MAX_ATTR)) s.attrs[a] = rtInt(s.attrs[a], 0, MAX_ATTR, 0);
  if (rtObj(s.quests) && s.quests.stable != null && !rtObj(s.quests.stable)) delete s.quests.stable;
  if (rtObj(s.look)) {
    const def = (typeof DEFAULT_LOOKS !== 'undefined' && DEFAULT_LOOKS[s.classId]) || {};
    for (const [k, v] of Object.entries(s.look)) if (!(Number.isInteger(v) && v >= 0 && v <= 40)) { if (def[k] != null) s.look[k] = def[k]; else delete s.look[k]; }
  }
  if (rtObj(s.instLock)) for (const [k, v] of Object.entries(s.instLock)) if (!(rtNum(v) || (rtObj(v) && rtNum(v.until)))) delete s.instLock[k];
  if (s.horseTier != null) s.horseTier = rtInt(s.horseTier, 0, 3, s.horse ? 1 : 0);
  // Gegenstände: Ausrüstung, Tasche, Lager
  const fund = Array.isArray(s.fundsachen) ? s.fundsachen : [];
  const inv = Array.isArray(s.inventory) ? s.inventory : rtObj(s.inventory) ? Object.values(s.inventory) : [];
  if (s.inventory != null && !Array.isArray(s.inventory)) fix.data.push('Tasche');
  const keep = (it, to) => {
    const r = rettenTeil(it, s.classId, s.path, fix);
    if (r) to.push(r);
    else if (it != null) { fund.push(it); fix.lost++; }
  };
  const bag = [];
  for (const it of inv) keep(it, bag);
  if (s.equipment != null) {
    if (!rtObj(s.equipment)) { fix.data.push('Ausrüstung'); s.equipment = null; } else {
      const eq = {};
      for (const [k, it] of Object.entries(s.equipment)) {
        if (it == null) { if (EQUIP_SLOTS.some((sl) => sl.id === k)) eq[k] = null; continue; }
        const r = rettenTeil(it, s.classId, s.path, fix);
        if (!r) { fund.push(it); fix.lost++; continue; }
        const fits = EQUIP_SLOTS.some((sl) => sl.id === k) && !isBook(r) && (r.slot === k || (k === 'schild' && ['schild', 'waffe', 'koecher'].includes(r.slot)));
        if (fits) eq[k] = r;
        else { bag.push(r); fix.moved++; }
      }
      s.equipment = eq;
    }
  }
  s.inventory = bag;
  if (s.storage != null) {
    if (!rtObj(s.storage)) delete s.storage;
    else {
      const items = Array.isArray(s.storage.items) ? s.storage.items : [];
      const out = [];
      for (const it of items) keep(it, out);
      s.storage.items = out;
    }
  }
  if (fund.length) s.fundsachen = fund;
  // Ort und Zustand: sichere Stadt, nicht reiten, nicht tot, kein offener Rangkampf, keine alten Rückkehrpunkte
  const town = rettenStadt(s);
  s.x = town.x;
  s.y = town.y;
  s.riding = false;
  if (!(rtNum(s.hp) && s.hp > 0)) s.hp = null;
  if (!(rtNum(s.mp) && s.mp >= 0)) s.mp = null;
  if (rtObj(s.pvp)) s.pvp.open = null;
  if (rtObj(s.arena)) { delete s.arena.ret; if (s.arena.pending != null && !rtNum(s.arena.pending)) s.arena.pending = 0; }
  // etwas neuer als der alte Stand: Ein auf einem anderen Gerät inzwischen weitergespielter Stand bleibt dabei der
  // neuere (mergeSlots, konto.js) – die Rettung überschreibt nie echten Fortschritt
  s.savedAt = (rtNum(s.savedAt) ? s.savedAt : 0) + 1;
  // Text für den Spieler
  notes.unshift(`${s.name} steht jetzt sicher in ${town.name}.`);
  if (fix.books) notes.push(`${fix.books} Fertigkeitsbuch-Stapel mit unbekannter Fertigkeit wurde${fix.books > 1 ? 'n' : ''} zu Büchern deiner Fertigkeit „${classPath(s.classId, s.path || 0).skills[0].name}“.`);
  if (fix.items) notes.push(`${fix.items} Gegenst${fix.items > 1 ? 'ände wurden' : 'and wurde'} repariert.`);
  if (fix.moved) notes.push(`${fix.moved} falsch angelegte${fix.moved > 1 ? '' : 'r'} Gegenst${fix.moved > 1 ? 'ände liegen' : 'and liegt'} jetzt in der Tasche.`);
  if (fix.lost) notes.push(`${fix.lost} beschädigte${fix.lost > 1 ? '' : 'r'} Gegenst${fix.lost > 1 ? 'ände wurden' : 'and wurde'} beiseitegelegt (nicht gelöscht).`);
  if (fix.data.length) notes.push('Beschädigte Spieldaten wurden zurückgesetzt.');
  return { save: s, notes, fix };
}

// Platz k reparieren und speichern (Gerät; mit Konto gleich hochladen wie beim normalen Speichern)
async function rettenPlatz(k) {
  // läuft gerade der Abgleich mit dem Konto, erst warten – sonst überschriebe er die Rettung mit dem alten Stand
  await rettenWarteKonto();
  const st = readSlots();
  const raw = st.slots[k];
  if (!fixSave(raw)) return { ok: false, msg: 'Dieser Charakter lässt sich hier nicht retten.' };
  const r = rettenReparieren(raw);
  if (!r) return { ok: false, msg: 'Dieser Charakter lässt sich hier nicht retten.' };
  st.slots[k] = r.save;
  writeSlots(st, true);
  // alter Einzel-Spielstand desselben Charakters (spieler.js SAVE_KEY) mitziehen
  try {
    const old = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (old && old.name === r.save.name && old.classId === r.save.classId) localStorage.setItem(SAVE_KEY, JSON.stringify(r.save));
  } catch (e) { /* egal */ }
  let cloud = null;
  if (typeof accountOn === 'function' && accountOn()) {
    account.dirty = true;
    try { await cloudPush(); cloud = account.state === 'ok'; } catch (e) { cloud = false; }
  }
  return { ok: true, notes: r.notes, cloud, save: r.save };
}
function rettenWarteKonto(maxMs = 10000) {
  return new Promise((res) => {
    const t0 = Date.now();
    const look = () => {
      if (typeof account === 'undefined' || account.state !== 'sync' || Date.now() - t0 > maxMs) res();
      else setTimeout(look, 200);
    };
    look();
  });
}

// --- Fenster ----------------------------------------------------------------------------------------------------
function rettenCss() {
  if (document.getElementById('rettenCss')) return;
  const st = document.createElement('style');
  st.id = 'rettenCss';
  st.textContent = `
.rt-dim { position: fixed; inset: 0; z-index: 3000; display: flex; align-items: center; justify-content: center; padding: 12px;
  background: rgba(6, 5, 4, 0.62); }
.rt-box { width: min(440px, 94vw); max-height: 88vh; overflow: auto; padding: 14px 16px; border-radius: 12px; color: #f3e2b0;
  background: linear-gradient(180deg, rgba(60, 48, 34, 0.98), rgba(28, 22, 16, 0.98)); border: 1px solid rgba(201, 163, 90, 0.6);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6); font-size: 14px; line-height: 1.4; }
.rt-box h3 { margin: 0 0 8px; font-size: 17px; color: #ffd34d; }
.rt-box p { margin: 0 0 8px; }
.rt-box ul { margin: 0 0 8px; padding-left: 18px; }
.rt-box .rt-warn { color: #ffb48a; }
.rt-box .rt-code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; padding: 6px 8px; border-radius: 6px;
  background: rgba(0, 0, 0, 0.45); color: #ffd0b0; word-break: break-word; user-select: text; -webkit-user-select: text; }
.rt-btns { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin-top: 10px; }
.rt-btns .btn { min-height: 40px; padding: 8px 14px; }
.char-fix { position: absolute; top: 2px; left: 4px; width: 30px; height: 30px; border: 0; padding: 0; background: transparent;
  font-size: 16px; line-height: 30px; opacity: 0.8; cursor: var(--zeiger-hand, pointer); }
.char-fix:hover, .char-fix:focus-visible { opacity: 1; }
.char-note { font-size: 11px; color: #9fe39f; }
.rt-count { position: fixed; left: 50%; top: 17%; transform: translate(-50%, -50%); z-index: 1500; pointer-events: none; text-align: center;
  color: #f3e2b0; text-shadow: 0 2px 8px #000, 0 0 2px #000; }
.rt-count b { display: block; font-size: 54px; color: #ffd34d; line-height: 1; }
.rt-count span { font-size: 15px; }`;
  document.head.append(st);
}
// Fenster mit Text und Knöpfen; buttons: [{ label, cls, fn }] (fn ohne Rückgabe false schließt das Fenster)
function rettenDialog(title, html, buttons) {
  rettenCss();
  rettenDialogZu();
  const dim = document.createElement('div');
  dim.className = 'rt-dim';
  dim.id = 'rtDialog';
  dim.innerHTML = `<div class="rt-box" role="alertdialog" aria-modal="true" aria-labelledby="rtTitel"><h3 id="rtTitel"></h3><div class="rt-text">${html}</div><div class="rt-btns"></div></div>`;
  dim.querySelector('#rtTitel').textContent = title;
  const row = dim.querySelector('.rt-btns');
  for (const b of buttons) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'btn ' + (b.cls || 'btn-ghost');
    el.textContent = b.label;
    el.addEventListener('click', async () => {
      const keepOpen = b.fn ? await b.fn(el) : undefined;
      if (keepOpen !== false) rettenDialogZu();
    });
    row.append(el);
  }
  // Tasten des Spiels nicht auslösen, Esc schließt (wie Abbrechen)
  dim.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') rettenDialogZu();
  });
  document.body.append(dim);
  const first = row.querySelector('.btn-primary') || row.querySelector('button');
  if (first) first.focus({ preventScroll: true });
  return dim;
}
function rettenDialogZu() {
  const d = document.getElementById('rtDialog');
  if (d) d.remove();
}
const rtEsc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rtFehlerText = (err) => {
  const m = err && (err.message || String(err));
  return String(m || 'unbekannt').replace(/\s+/g, ' ').slice(0, 160);
};
// Kurzinfo für die Meldung (Version, Ansicht, Gerät, Ort im Code)
function rettenInfo(err) {
  const where = err && err.stack ? String(err.stack).split('\n').find((l) => /\.js:\d+/.test(l)) : '';
  const file = where ? (where.match(/([\w-]+\.js:\d+)/) || [])[1] : '';
  const view = typeof V3 !== 'undefined' && V3.on ? '3D' : '2D';
  return `Version ${typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '?'} · ${view} · ${IS_PC ? 'PC' : 'Handy'}${file ? ' · ' + file : ''}`;
}

// --- Charakterauswahl: 🛟 Charakter retten -----------------------------------------------------------------------
function charRescueAsk(k) {
  const sv = listSaves()[k];
  if (!sv || sv.unknown) return;
  const cloud = typeof accountOn === 'function' && accountOn();
  rettenDialog(`${sv.name} retten?`,
    `<p>Hilft, wenn der Charakter nicht mehr ins Spiel kommt, feststeckt oder sich seltsam verhält:</p><ul>` +
    '<li>Er erscheint in der sicheren Stadt seiner Seite.</li>' +
    '<li>Instanz, Turm, Arena, Dungeon, Reiten und Tod werden beendet.</li>' +
    '<li>Beschädigte Daten werden repariert. Gegenstände, Gold und Stufen bleiben erhalten.</li></ul>' +
    `<p>${cloud ? 'Gespeichert wird auf diesem Gerät und im Konto.' : 'Gespeichert wird auf diesem Gerät.'}</p>`,
    [
      { label: 'Abbrechen' },
      {
        label: '🛟 Charakter retten', cls: 'btn-primary', fn: async (btn) => {
          btn.disabled = true;
          btn.textContent = 'Wird gerettet …';
          let r;
          try { r = await rettenPlatz(k); } catch (e) { r = { ok: false, msg: 'Fehler: ' + rtFehlerText(e) }; }
          if (typeof ui !== 'undefined' && !game.running) ui.showStart();
          if (!r.ok) {
            rettenDialog('Rettung nicht möglich', `<p>${rtEsc(r.msg)}</p>`, [{ label: 'OK', cls: 'btn-primary' }]);
            return false;
          }
          const extra = r.cloud === false ? '<p class="rt-warn">Das Konto war gerade nicht erreichbar – die Rettung wird hochgeladen, sobald wieder Verbindung besteht.</p>' : '';
          rettenDialog('Charakter gerettet', `<ul>${r.notes.map((n) => `<li>${rtEsc(n)}</li>`).join('')}</ul>${extra}`, [
            { label: 'OK' },
            { label: 'Jetzt spielen', cls: 'btn-primary', fn: () => { const save = loadSave(k); if (save) startGame(save, k); } }
          ]);
          return false;
        }
      }
    ]);
}

// --- Robustes Betreten -------------------------------------------------------------------------------------------
if (typeof startGame === 'function') {
  const _rettenStart = startGame;
  // eslint-disable-next-line no-global-assign
  startGame = function (save, slot) {
    // Welt-Wächter (waechter.js): ohne Spielstand und ohne Fenster, wie bisher
    if (typeof WAECHTER !== 'undefined' && WAECHTER) return _rettenStart.apply(this, arguments);
    const tries = RETTEN.retry;
    RETTEN.retry = 0;
    clearInterval(RETTEN.timer);
    const E = { save, slot: slot != null ? slot : null, t0: performance.now(), errs: 0, last: null, tries, done: false };
    RETTEN.enter = E;
    let r;
    try {
      r = _rettenStart.apply(this, arguments);
    } catch (err) {
      rettenBetretenFehler(E, err, 'start');
      return undefined;
    }
    if (!game.running) {
      // z. B. erst ein neues Passwort (neustart.js): kein Fehler
      RETTEN.enter = null;
      return r;
    }
    E.slot = typeof saveSlot !== 'undefined' && saveSlot != null ? saveSlot : E.slot;
    RETTEN.timer = setInterval(() => rettenWache(E), 500);
    if (tries && RETTEN.notes) {
      const notes = RETTEN.notes;
      RETTEN.notes = null;
      ui.log(`${game.player.name} kam nicht ins Spiel und wurde automatisch gerettet: ${notes.join(' ')}`, 'warn');
      ui.banner('Charakter gerettet', 'Er kam nicht ins Spiel und steht jetzt sicher in der Stadt');
    }
    rettenMerker();
    return r;
  };
}
function rettenWache(E) {
  if (RETTEN.enter !== E || E.done) { clearInterval(RETTEN.timer); return; }
  const age = performance.now() - E.t0;
  if (E.errs >= RETTEN.frozenErrs) return rettenBetretenFehler(E, E.last, 'bild');
  const loading = typeof MAPLOAD !== 'undefined' && MAPLOAD.on;
  if (loading && age > RETTEN.loadMaxMs) return rettenBetretenFehler(E, new Error('Ladebild hängt seit ' + Math.round(age / 1000) + ' s'), 'laden');
  if (age > RETTEN.watchMs && !loading) {
    E.done = true;
    clearInterval(RETTEN.timer);
  }
}
// aus frameFailed (spiel.js): jeder Bildfehler
function rettenBildFehler(err) {
  const E = RETTEN.enter;
  if (E && !E.done) {
    E.errs++;
    E.last = err;
    return;
  }
  // im laufenden Spiel: wirft fast jedes Bild, steht das Spiel – einmal eine Meldung statt stummen Hängens
  if (!game.running || RETTEN.err.shown || (typeof WAECHTER !== 'undefined' && WAECHTER)) return;
  const now = performance.now();
  const L = RETTEN.err.list;
  L.push(now);
  while (L.length && now - L[0] > 6000) L.shift();
  if (L.length >= 90) {
    RETTEN.err.shown = true;
    setTimeout(() => rettenSpielFehler(err), 0);
  }
}
function rettenBetretenFehler(E, err, kind) {
  if (E.done) return;
  E.done = true;
  clearInterval(RETTEN.timer);
  console.error('Betreten fehlgeschlagen (' + kind + '):', err);
  const name = (E.save && E.save.name) || '';
  // Spiel anhalten und Ladebild weg
  game.running = false;
  try { if (typeof MAPLOAD !== 'undefined' && MAPLOAD.el) { MAPLOAD.on = false; MAPLOAD.el.hidden = true; MAPLOAD.el.classList.remove('an'); clearInterval(MAPLOAD.tipTimer); } } catch (e) { /* egal */ }
  if (!E.tries) {
    // einmal von selbst reparieren und neu betreten
    let base = null;
    try { if (E.slot != null) base = readSlots().slots[E.slot]; } catch (e) { base = null; }
    if (!fixSave(base) || base.name !== name) base = E.save;
    const r = base ? rettenReparieren(base) : null;
    if (r) {
      try {
        if (E.slot != null) {
          const st = readSlots();
          st.slots[E.slot] = r.save;
          writeSlots(st);
        }
      } catch (e) { /* Speicher voll oder privat: trotzdem versuchen */ }
      RETTEN.retry = 1;
      RETTEN.notes = r.notes;
      if (typeof frameErrs !== 'undefined') frameErrs.clear();
      setTimeout(() => {
        try { ui.closePanels(); } catch (e) { /* egal */ }
        startGame(r.save, E.slot);
      }, 50);
      return;
    }
  }
  rettenWeiterAus();
  rettenFehlerFenster(name, E.slot, kind === 'laden' ? new Error('Ladebild hängt') : err, E.tries > 0);
}
// Meldung „Betreten fehlgeschlagen“ mit Kurztext fürs Bildschirmfoto, „Charakter retten“ und „Zur Charakterauswahl“
function rettenFehlerFenster(name, slot, err, nachRettung) {
  const btns = [{ label: 'Zur Charakterauswahl', fn: () => { rettenWeiterAus(); location.reload(); return false; } }];
  if (slot != null && fixSave(readSlots().slots[slot])) {
    btns.push({
      label: '🛟 Charakter retten', cls: 'btn-primary', fn: async (btn) => {
        btn.disabled = true;
        btn.textContent = 'Wird gerettet …';
        let r;
        try { r = await rettenPlatz(slot); } catch (e) { r = { ok: false, msg: 'Fehler: ' + rtFehlerText(e) }; }
        if (!r.ok) {
          rettenDialog('Rettung nicht möglich', `<p>${rtEsc(r.msg)}</p>`, [{ label: 'OK', cls: 'btn-primary', fn: () => { location.reload(); return false; } }]);
          return false;
        }
        // frisch betreten (neue Seite: alles, was der Fehler halb gebaut hat, ist weg)
        RETTEN.off = false;
        RETTEN.reloading = true;
        try {
          localStorage.setItem(RETTEN.weiterKey, JSON.stringify({ slot, name: r.save ? r.save.name : name, classId: readSlots().slots[slot].classId, at: Date.now(), auto: 1, why: 'retten' }));
        } catch (e) { /* dann über die Auswahl */ }
        location.reload();
        return false;
      }
    });
  }
  rettenDialog('Betreten fehlgeschlagen',
    `<p>${rtEsc(name || 'Der Charakter')} konnte nicht ins Spiel geladen werden${nachRettung ? ' – auch nicht nach einer automatischen Rettung' : ''}.</p>` +
    `<p>Mach bitte ein Bildschirmfoto dieser Meldung und schick es uns.${btns.length > 1 ? ' „Charakter retten“ bringt ihn in die sichere Stadt, repariert beschädigte Daten und versucht es noch einmal.' : ''}</p>` +
    `<p class="rt-code">${rtEsc(rtFehlerText(err))}<br>${rtEsc(rettenInfo(err))}</p>`, btns);
}

// Klick auf „Spielen“, aber der Spielstand dieses Platzes fehlt oder ist nicht lesbar (oberflaeche.js). Erst auf dem
// Gerät suchen (der Charakter kann nach einem Abgleich auf einem anderen Platz liegen), dann – mit Konto – im Konto;
// sonst eine Meldung statt nichts.
async function rettenLadeFehler(k, sv, err) {
  const name = sv && sv.name;
  const cls = sv && sv.classId;
  const same = (x) => !!(x && fixSave(x) && x.name === name && x.classId === cls);
  try {
    const st = readSlots();
    const j = st.slots.findIndex(same);
    if (j >= 0) { startGame(loadSave(j), j); return; }
  } catch (e) { err = err || e; }
  if (typeof accountOn === 'function' && accountOn() && typeof cloudGet === 'function') {
    rettenDialog('Spielstand wird gesucht …', `<p>${rtEsc(name || 'Der Charakter')} ist auf diesem Gerät nicht lesbar. Der Stand im Konto wird geholt …</p>`, []);
    try {
      const remote = await cloudGet();
      const j = remote ? remote.slots.findIndex(same) : -1;
      if (j >= 0) {
        const st = readSlots();
        // auf denselben Platz wie im Konto (dort ist er frei oder derselbe Charakter), sonst auf einen freien
        const at = !fixSave(st.slots[j]) || same(st.slots[j]) ? j : st.slots.findIndex((x) => !slotTaken(x));
        if (at >= 0) {
          st.slots[at] = remote.slots[j];
          writeSlots(st, true);
          rettenDialogZu();
          ui.showStart();
          const save = loadSave(at);
          if (save) { startGame(save, at); return; }
        }
      }
    } catch (e) { err = err || e; }
  }
  if (typeof ui !== 'undefined') ui.showStart();
  rettenFehlerFenster(name, fixSave(readSlots().slots[k]) ? k : null, err || new Error('Spielstand auf diesem Gerät nicht lesbar'), false);
}
// laufendes Spiel steht (fast jedes Bild ein Fehler)
function rettenSpielFehler(err) {
  if (!game.running) return;
  rettenDialog('Fehler im Spiel',
    '<p>Im Spiel ist wiederholt ein Fehler aufgetreten. Mach bitte ein Bildschirmfoto dieser Meldung und schick es uns.</p>' +
    `<p class="rt-code">${rtEsc(rtFehlerText(err))}<br>${rtEsc(rettenInfo(err))}</p>` +
    '<p>„Retten und neu laden“ bringt deinen Charakter in die sichere Stadt, repariert beschädigte Daten und lädt das Spiel neu.</p>',
    [
      { label: 'Weiterspielen' },
      {
        label: '🛟 Retten und neu laden', cls: 'btn-primary', fn: async (btn) => {
          btn.disabled = true;
          try { saveGame(); } catch (e) { /* der gespeicherte Stand wird gerettet */ }
          const k = typeof saveSlot !== 'undefined' ? saveSlot : null;
          if (k != null) { try { await rettenPlatz(k); } catch (e) { /* trotzdem neu laden */ } }
          rettenNeuLaden('fehler', rtFehlerText(err), true);
          return false;
        }
      }
    ]);
}

// --- Feststecken? In die Stadt zurück ----------------------------------------------------------------------------
// Was gerade läuft (für den Hinweis); null = nichts Besonderes
function rettenOrt(p) {
  if (game.turmRun || (typeof turmInside === 'function' && turmInside(p))) return 'im ' + (typeof TURM !== 'undefined' ? TURM.name : 'Turm der Verdammten');
  if (game.arenaRun || (typeof arenaInside === 'function' && arenaInside(p))) return 'in der Herausforderung (Arena)';
  const z = zoneAt(p.x, p.y);
  const d = z && z.dungeon;
  if (!d) return null;
  const inst = d.instanz || (typeof INSTANCES82 !== 'undefined' && INSTANCES82.includes(d)) || (typeof INSTANCES !== 'undefined' && INSTANCES.includes(d));
  return (inst ? 'in der Instanz ' : 'im Dungeon ') + (d.name || z.name || '');
}
function rettenRestMin(p) {
  const left = (Number(p.rettenAt) || 0) + RETTEN.cd - Date.now();
  return left > 0 ? Math.ceil(left / 60000) : 0;
}
// Zeile im Reiter „Figur und Spiel“ (optionen.js)
function rettenOptHtml() {
  const p = game.player;
  if (!p) return '';
  const rest = rettenRestMin(p);
  return '<section class="opt-group"><h3>Feststecken?</h3><div class="opt-btns">' +
    `<button type="button" class="btn btn-ghost" data-go="stuck">🏠 Feststecken? In die Stadt zurück${rest ? ` (${rest} Min.)` : ''}</button></div>` +
    `<p class="hint-text">Steckt deine Figur fest (Wand, Wasser, außerhalb der Karte), bringt dich das nach ${RETTEN.count} Sekunden in die sichere Stadt deiner Seite. Schaden bricht es ab. Danach erst in ${RETTEN.cd / 60000} Minuten wieder.</p></section>`;
}
function rettenFeststecken() {
  const p = game.player;
  if (!game.running || !p) return;
  if (game.duel || game.pvpMatch || (typeof pvpInside === 'function' && pvpInside(p))) {
    rettenDialog('Gerade nicht möglich', '<p>Im Duell und in der Turnierarena kannst du nicht in die Stadt zurück. Beende zuerst den Kampf.</p>', [{ label: 'OK', cls: 'btn-primary' }]);
    return;
  }
  if (p.dead) {
    rettenDialog('Gerade nicht möglich', '<p>Deine Figur ist gefallen. Nutze „Wiederbeleben“ – dann erscheinst du in der Stadt.</p>', [{ label: 'OK', cls: 'btn-primary' }]);
    return;
  }
  const rest = rettenRestMin(p);
  if (rest) {
    rettenDialog('Noch nicht wieder möglich', `<p>Du kannst erst in ${rest} ${rest === 1 ? 'Minute' : 'Minuten'} wieder in die Stadt zurück.</p>`, [{ label: 'OK', cls: 'btn-primary' }]);
    return;
  }
  const town = rettenStadt(p);
  const ort = rettenOrt(p);
  rettenDialog('In die Stadt zurück?',
    `<p>In ${RETTEN.count} Sekunden kehrst du nach ${rtEsc(town.name)} zurück. Nimmst du in der Zeit Schaden, bricht es ab.</p>` +
    (ort ? `<p class="rt-warn">Du bist gerade ${rtEsc(ort)}. Dein Fortschritt dort geht verloren.</p>` : '') +
    `<p>Danach geht das erst in ${RETTEN.cd / 60000} Minuten wieder.</p>`,
    [{ label: 'Abbrechen' }, { label: '🏠 In die Stadt', cls: 'btn-primary', fn: () => rettenCountdown() }]);
}
function rettenCountdown() {
  const p = game.player;
  if (!p) return;
  ui.closePanels();
  rettenCss();
  rettenCountdownZu();
  const el = document.createElement('div');
  el.className = 'rt-count';
  el.id = 'rtCount';
  el.innerHTML = `<b>${RETTEN.count}</b><span>Zurück in die Stadt …</span>`;
  document.body.append(el);
  // echte Sekunden (nicht game.time: das läuft bei sehr wenigen Bildern je Sekunde langsamer)
  const S = RETTEN.stuck = { p, end: performance.now() + RETTEN.count * 1000, hp: p.hp, shown: RETTEN.count, el, timer: 0 };
  ui.log(`In ${RETTEN.count} Sekunden geht es zurück in die Stadt. Schaden bricht es ab.`, 'info');
  S.timer = setInterval(() => {
    if (RETTEN.stuck !== S) { clearInterval(S.timer); return; }
    const q = game.player;
    if (!game.running || q !== S.p || q.dead) return rettenCountdownZu('Abgebrochen.');
    if (q.hp < S.hp - 0.5) return rettenCountdownZu('Abgebrochen – du hast Schaden genommen.');
    if (game.duel || game.pvpMatch) return rettenCountdownZu('Abgebrochen – Duell.');
    S.hp = Math.max(S.hp, q.hp);
    const left = Math.max(0, Math.ceil((S.end - performance.now()) / 1000));
    if (left !== S.shown) { S.shown = left; el.querySelector('b').textContent = String(left); }
    if (performance.now() >= S.end) {
      rettenCountdownZu();
      rettenNachHause();
    }
  }, 100);
}
function rettenCountdownZu(why) {
  const S = RETTEN.stuck;
  RETTEN.stuck = null;
  if (S) clearInterval(S.timer);
  const el = document.getElementById('rtCount');
  if (el) el.remove();
  if (why && typeof ui !== 'undefined') ui.log('In die Stadt: ' + why, 'warn');
}
function rettenNachHause() {
  const p = game.player;
  if (!p || !game.running) return;
  // laufende Turm- und Arenadurchgänge über ihre eigenen Funktionen beenden (Host und Gruppe erfahren es)
  try { if (game.turmRun && typeof turmStop === 'function') turmStop('retten'); } catch (e) { console.warn('turmStop', e); }
  try { if (game.arenaRun && typeof arenaStop === 'function') arenaStop('retten'); } catch (e) { console.warn('arenaStop', e); }
  p.dash = null;
  p.leap = null;
  if (p.channel && typeof stopChannel === 'function') { try { stopChannel(p); } catch (e) { /* egal */ } }
  if (input) { input.walkTo = null; input.attackWalk = false; }
  const town = rettenStadt(p);
  p.rettenAt = Date.now();
  if (typeof moveThrough === 'function') moveThrough({ x: town.x, y: town.y }, town.color);
  else { p.x = town.x; p.y = town.y; saveGame(); }
  if (typeof setTarget === 'function') setTarget(null);
  ui.banner(town.name, 'Zurück in der Stadt');
  ui.log(`Du bist zurück in ${town.name}.`, 'level');
  saveGame();
}

// --- Weiter nach Absturz oder Neuladen ---------------------------------------------------------------------------
function rettenMerker() {
  if (RETTEN.off || !game.running || !game.player || typeof saveSlot === 'undefined' || saveSlot == null) return;
  if (typeof WAECHTER !== 'undefined' && WAECHTER) return;
  const p = game.player;
  // nach einer stabilen Weile zählt ein neuer Absturz wieder als erster
  if (RETTEN.autoN && RETTEN.enter && performance.now() - RETTEN.enter.t0 > RETTEN.weiterStabil) RETTEN.autoN = 0;
  try {
    localStorage.setItem(RETTEN.weiterKey, JSON.stringify({ slot: saveSlot, name: p.name, classId: p.classId, at: Date.now(), auto: RETTEN.autoN }));
  } catch (e) { /* privat */ }
}
function rettenWeiterAus() {
  RETTEN.off = true;
  try { localStorage.removeItem(RETTEN.weiterKey); } catch (e) { /* privat */ }
}
// speichern, merken und neu laden (Neustart der Grafik, drei-kern.js; Fehler im Spiel)
function rettenNeuLaden(kind, why, saved) {
  if (RETTEN.reloading) return;
  RETTEN.reloading = true;
  try { if (!saved && game.running) saveGame(); } catch (e) { /* trotzdem neu laden */ }
  RETTEN.off = false;
  rettenMerker();
  try {
    const m = JSON.parse(localStorage.getItem(RETTEN.weiterKey) || 'null');
    if (m) { m.why = kind; localStorage.setItem(RETTEN.weiterKey, JSON.stringify(m)); }
  } catch (e) { /* egal */ }
  RETTEN.off = true;
  const go = () => location.reload();
  if (typeof accountOn === 'function' && accountOn() && typeof cloudPush === 'function') {
    account.dirty = true;
    Promise.race([cloudPush(true), new Promise((r) => setTimeout(r, 4000))]).then(go, go);
  } else setTimeout(go, 100);
}
setInterval(rettenMerker, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) rettenMerker(); });
// normales Schließen oder Neuladen (nicht beim Absturz – dann kommt kein pagehide): kein automatisches Weiter
window.addEventListener('pagehide', () => {
  if (RETTEN.reloading) return;
  try { localStorage.removeItem(RETTEN.weiterKey); } catch (e) { /* privat */ }
});

// Beim Laden der Seite: mit dem zuletzt gespielten Charakter direkt weiter?
async function rettenWeiter() {
  let m = null;
  try { m = JSON.parse(localStorage.getItem(RETTEN.weiterKey) || 'null'); } catch (e) { m = null; }
  if (!rtObj(m) || (typeof WAECHTER !== 'undefined' && WAECHTER)) return;
  try { localStorage.removeItem(RETTEN.weiterKey); } catch (e) { /* privat */ }
  if (!(Date.now() - (m.at || 0) < RETTEN.weiterMs)) return;
  // mit Konto erst den Abgleich abwarten (die Anmeldung bleibt, solange sie gültig ist)
  if (typeof accountOn === 'function' && accountOn()) await rettenWarteKonto(8000);
  if (game.running) return;
  if (typeof pwPflicht === 'function' && pwPflicht()) return;
  const sv = loadSave(m.slot);
  if (!sv || sv.name !== m.name || sv.classId !== m.classId) return;
  if ((m.auto || 0) >= 2) {
    // zweimal kurz hintereinander abgestürzt: nicht noch einmal von selbst (sonst eine Schleife), Hinweis in der Auswahl
    rettenDialog('Erneut abgestürzt',
      `<p>${rtEsc(sv.name)} ist mehrmals kurz hintereinander abgestürzt.</p>` +
      '<p>Versuche in der Charakterauswahl 🛟 „Charakter retten“. Hilft das nicht: In den Einstellungen unter Grafik die Qualität senken oder auf 2D stellen – das braucht deutlich weniger Speicher.</p>',
      [{ label: 'OK', cls: 'btn-primary' }]);
    return;
  }
  RETTEN.autoN = (m.auto || 0) + 1;
  if (typeof titelOffen === 'function' && titelOffen()) titelZu();
  console.info('Weiter nach Neuladen:', sv.name, m.why || 'absturz');
  startGame(sv, m.slot);
  if (!game.running) return;
  // keine Einführung (die gilt nur für neue Charaktere beim ersten Eintritt)
  if (typeof INTRO !== 'undefined') clearInterval(INTRO.wait);
  ui.log(m.why === 'grafik' ? 'Die Grafik wurde neu gestartet – weiter geht’s.' : `Weiter mit ${sv.name}.`, 'info');
}

// Charakterauswahl, die schon vor dieser Datei gezeichnet wurde, mit dem Rettungsknopf neu zeichnen
rettenCss();
if (typeof ui !== 'undefined' && typeof game !== 'undefined' && !game.running && document.getElementById('charSelect') && !document.getElementById('charSelect').hidden) {
  try { ui.showStart(); } catch (e) { /* egal */ }
}
setTimeout(() => { rettenWeiter().catch((e) => console.warn('Weiter nach Neuladen', e)); }, 300);
