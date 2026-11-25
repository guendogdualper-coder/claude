// Erfolge und Titel (seit 15.76, docs/endgame-langzeit.md): Ziele für jede Stufe, die sich aus dem Spielstand ergeben
// (Stufe, Kills, Seelensteine, Endbosse, Weltbosse …) oder mitgezählt werden (Turm, Lv-80-Instanzen, Tagesaufträge).
// Jeder Erfolg bringt Erfolgspunkte, manche einen Titel. Der gewählte Titel steht im Charakterfenster und über dem Kopf –
// auch bei den Mitspielern (Zustand „ti“, netz.js). Spielstand: p.erf = { done: { id: Zeit }, titel: id, z: { … } }.
const ERFOLGE = [
  // Abenteuer
  { id: 'stufe10', kat: 'Abenteuer', name: 'Erste Schritte', text: 'Erreiche Stufe {n}', need: 10, val: (p) => p.level, pts: 5 },
  { id: 'stufe30', kat: 'Abenteuer', name: 'Auf eigenen Beinen', text: 'Erreiche Stufe {n}', need: 30, val: (p) => p.level, pts: 10 },
  { id: 'stufe60', kat: 'Abenteuer', name: 'Erfahrene Klinge', text: 'Erreiche Stufe {n}', need: 60, val: (p) => p.level, pts: 15 },
  { id: 'stufe80', kat: 'Abenteuer', name: 'Gipfelstürmer', text: 'Erreiche Stufe {n}', need: 80, val: (p) => p.level, pts: 25, titel: 'Gipfelstürmer' },
  { id: 'gold', kat: 'Abenteuer', name: 'Goldfürst', text: 'Besitze {n} Gold auf einmal', need: 10000000, val: (p) => p.gold, pts: 15, titel: 'Goldfürst' },
  { id: 'drache', kat: 'Abenteuer', name: 'Herr der Lüfte', text: 'Besitze die Glutschwinge', need: 1, val: (p) => ((p.horseTier | 0) >= 3 ? 1 : 0), pts: 20, titel: 'Drachenreiter' },
  // Kampf
  { id: 'kills1', kat: 'Kampf', name: 'Jäger', text: 'Besiege {n} Monster', need: 1000, val: (p) => p.kills, pts: 10 },
  { id: 'kills2', kat: 'Kampf', name: 'Schlächter', text: 'Besiege {n} Monster', need: 10000, val: (p) => p.kills, pts: 20, titel: 'der Unermüdliche' },
  { id: 'kills3', kat: 'Kampf', name: 'Geißel der Monster', text: 'Besiege {n} Monster', need: 100000, val: (p) => p.kills, pts: 50, titel: 'Geißel der Monster' },
  { id: 'steine1', kat: 'Kampf', name: 'Steinbrecher', text: 'Zerstöre {n} Seelensteine', need: 50, val: (p) => p.stones, pts: 10 },
  { id: 'steine2', kat: 'Kampf', name: 'Seelenbrecher', text: 'Zerstöre {n} Seelensteine', need: 500, val: (p) => p.stones, pts: 30, titel: 'Seelenbrecher' },
  { id: 'pvp1', kat: 'Kampf', name: 'Duellant', text: 'Gewinne {n} Rangkämpfe in der Turnierarena', need: 10, val: (p) => (p.pvp && p.pvp.w) | 0, pts: 15 },
  { id: 'pvp2', kat: 'Kampf', name: 'Champion der Arena', text: 'Gewinne {n} Rangkämpfe in der Turnierarena', need: 100, val: (p) => (p.pvp && p.pvp.w) | 0, pts: 50, titel: 'Champion' },
  // Endgame
  { id: 'endboss1', kat: 'Endgame', name: 'Bezwinger', text: 'Besiege einen Endboss', need: 1, val: (p) => erfRaids(p), pts: 10 },
  { id: 'endboss9', kat: 'Endgame', name: 'Die neun Endbosse', text: 'Besiege alle {n} Endbosse', need: 9, val: (p) => erfRaids(p), pts: 40, titel: 'Bezwinger der Neun' },
  { id: 'wb1', kat: 'Endgame', name: 'Riesentöter', text: 'Besiege einen Weltboss', need: 1, val: (p) => p.wbKills | 0, pts: 15 },
  { id: 'wb2', kat: 'Endgame', name: 'Weltenbrecher', text: 'Besiege {n} Weltbosse', need: 10, val: (p) => p.wbKills | 0, pts: 30, titel: 'Riesentöter' },
  { id: 'wb3', kat: 'Endgame', name: 'Legende der Welt', text: 'Besiege {n} Weltbosse', need: 50, val: (p) => p.wbKills | 0, pts: 60, titel: 'Weltenbrecher' },
  { id: 'turm1', kat: 'Endgame', name: 'Turmstürmer', text: 'Bezwinge den Turm der Verdammten', need: 1, val: (p) => erfZ(p, 'turm'), pts: 15 },
  { id: 'turm2', kat: 'Endgame', name: 'Herr des Turms', text: 'Bezwinge den Turm {n}-mal', need: 10, val: (p) => erfZ(p, 'turm'), pts: 40, titel: 'Turmherr' },
  { id: 'inst1', kat: 'Endgame', name: 'Tiefengänger', text: 'Besiege {n} Bosse der Lv-80-Instanzen', need: 10, val: (p) => erfZ(p, 'inst'), pts: 15 },
  { id: 'inst2', kat: 'Endgame', name: 'Schrecken der Tiefe', text: 'Besiege {n} Bosse der Lv-80-Instanzen', need: 50, val: (p) => erfZ(p, 'inst'), pts: 40, titel: 'Schrecken der Tiefe' },
  { id: 'mythisch', kat: 'Endgame', name: 'Mythos', text: 'Besiege einen Instanzboss oder den Turm auf Mythisch', need: 1, val: (p) => erfZ(p, 'myth'), pts: 30, titel: 'Mythos' },
  { id: 'tage1', kat: 'Endgame', name: 'Fleißig', text: 'Erledige {n} Tagesaufträge', need: 30, val: (p) => erfZ(p, 'tage'), pts: 15 },
  { id: 'tage2', kat: 'Endgame', name: 'Pflichtbewusst', text: 'Erledige {n} Tagesaufträge', need: 150, val: (p) => erfZ(p, 'tage'), pts: 40, titel: 'Pflichtbewusst' },
  { id: 'seele1', kat: 'Endgame', name: 'Seelenwanderer', text: 'Erreiche Seelenstufe {n}', need: 10, val: (p) => erfSeele(p), pts: 15 },
  { id: 'seele2', kat: 'Endgame', name: 'Seelenmeister', text: 'Erreiche Seelenstufe {n}', need: 50, val: (p) => erfSeele(p), pts: 40, titel: 'Seelenwanderer' },
  { id: 'seele3', kat: 'Endgame', name: 'Vollendete Seele', text: 'Erreiche Seelenstufe {n}', need: 100, val: (p) => erfSeele(p), pts: 100, titel: 'Vollendete Seele' },
  // Ausrüstung
  { id: 'plus20', kat: 'Ausrüstung', name: 'Meisterschmied', text: 'Trage ein Teil auf +20', need: 1, val: (p) => erfEq(p).filter((it) => it.plus >= 20).length, pts: 30, titel: 'Meisterschmied' },
  { id: 'leg5', kat: 'Ausrüstung', name: 'Legendenträger', text: 'Trage {n} legendäre Teile zugleich', need: 5, val: (p) => erfEq(p).filter((it) => rarityOf(it) >= 4).length, pts: 30, titel: 'Legendenträger' },
  { id: 'juwel4', kat: 'Ausrüstung', name: 'Juwelier', text: 'Trage {n} eingesetzte Juwelen', need: 4, val: (p) => (typeof juwelSum === 'function' ? juwelSum(p).n : 0), pts: 25 },
  { id: 'aufst', kat: 'Ausrüstung', name: 'Aufgestiegen', text: 'Lass ein Teil dreimal aufsteigen', need: 3, val: (p) => Math.max(0, ...erfEq(p).map((it) => (typeof aufstOf === 'function' ? aufstOf(it) : 0))), pts: 50, titel: 'der Aufgestiegene' },
  // seit 15.78: Ereignisse (ereignisse.js) – Winterfest, PvP-Saisons, Erbe der Ahnen
  { id: 'winter1', kat: 'Ereignisse', name: 'Festgast', text: 'Sammle {n} Schneeflocken beim Winterfest', need: 100, val: (p) => (p.ev && p.ev.flTot) | 0, pts: 10 },
  { id: 'winter2', kat: 'Ereignisse', name: 'Winterherz', text: 'Sammle {n} Schneeflocken beim Winterfest', need: 1000, val: (p) => (p.ev && p.ev.flTot) | 0, pts: 30, titel: 'Winterherz' },
  { id: 'saison1', kat: 'Ereignisse', name: 'Saisonkämpfer', text: 'Beende eine PvP-Saison mindestens auf Gold', need: 1, val: (p) => (((p.ev && p.ev.sTop) | 0) >= 2 ? 1 : 0), pts: 15 },
  { id: 'saison2', kat: 'Ereignisse', name: 'Saisonchampion', text: 'Beende eine PvP-Saison als Champion', need: 1, val: (p) => (((p.ev && p.ev.sTop) | 0) >= 5 ? 1 : 0), pts: 50, titel: 'Saisonchampion' },
  { id: 'erbe', kat: 'Ereignisse', name: 'Ahnenreihe', text: 'Bringe {n} Charaktere deines Kontos auf Stufe 80', need: 2, val: (p) => (p.level >= MAX_LEVEL ? 1 : 0) + (typeof evErbeScan === 'function' && p === game.player ? evErbeScan().n80 : 0), pts: 30, titel: 'Hüter der Ahnen' }
];
const ERFOLG_BY_ID = Object.fromEntries(ERFOLGE.map((e) => [e.id, e]));
if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('erf')) SAVE_FIELDS.push('erf');

function erfState(p) {
  p = p || game.player;
  if (!p.erf || typeof p.erf !== 'object') p.erf = {};
  const e = p.erf;
  if (!e.done || typeof e.done !== 'object') e.done = {};
  if (!e.z || typeof e.z !== 'object') e.z = {};
  if (e.titel && !(ERFOLG_BY_ID[e.titel] && ERFOLG_BY_ID[e.titel].titel && e.done[e.titel])) e.titel = '';
  return e;
}
const erfZ = (p, k) => (p.erf && p.erf.z && p.erf.z[k]) | 0;
const erfRaids = (p) => (p.quests && Array.isArray(p.quests.raidsDone) ? p.quests.raidsDone.length : 0);
const erfSeele = (p) => (p.seele && p.seele.lv) | 0;
const erfEq = (p) => Object.values(p.equipment || {}).filter((it) => it && it.slot);
const erfPoints = (p) => ERFOLGE.reduce((n, e) => n + (erfState(p).done[e.id] ? e.pts : 0), 0);
const erfText = (e) => e.text.replace('{n}', e.need.toLocaleString('de-DE'));
function erfZaehl(k, n = 1) {
  const p = game.player;
  if (!p) return;
  const z = erfState(p).z;
  z[k] = (z[k] | 0) + n;
}
// Titeltext eines Spielers (eigener oder Mitspieler)
function erfTitelOf(e) {
  if (!e) return '';
  const id = e === game.player ? (e.erf && e.erf.titel) : e.titelId;
  const E = id && ERFOLG_BY_ID[id];
  return E && E.titel ? (typeof trText === 'function' ? trText(E.titel) : E.titel) : '';
}
function erfTitelSet(id) {
  const p = game.player;
  const e = erfState(p);
  if (id && !(ERFOLG_BY_ID[id] && ERFOLG_BY_ID[id].titel && e.done[id])) return false;
  e.titel = id || '';
  if (typeof ui.renderCharPanel === 'function') ui.renderCharPanel();
  saveGame();
  return true;
}

// Prüfen (alle 3 s): neue Erfolge freischalten
function erfCheck() {
  if (typeof game === 'undefined') return; // seit 15.85: Zeitgeber kann vor spiel.js feuern (Laden unter Last)
  const p = game.player;
  if (!p || !game.running) return;
  const e = erfState(p);
  const neu = [];
  for (const E of ERFOLGE) {
    if (e.done[E.id]) continue;
    let v = 0;
    try { v = +E.val(p) || 0; } catch (err) { v = 0; }
    if (v >= E.need) {
      e.done[E.id] = Date.now();
      neu.push(E);
    }
  }
  if (!neu.length) return;
  for (const E of neu) ui.log(`Erfolg freigeschaltet · ${E.name} · +${E.pts} Punkte${E.titel ? ` · Titel: ${E.titel}` : ''}`, 'level');
  if (neu.length === 1) ui.banner('Neuer Erfolg!', neu[0].name + (neu[0].titel ? ' · Titel: ' + neu[0].titel : ''));
  else ui.banner('Neue Erfolge!', `${neu.length} Erfolge freigeschaltet`);
  try { if (typeof sfx !== 'undefined' && sfx.success) sfx.success(); } catch (err) { /* ohne Ton */ }
  saveGame();
}
setInterval(erfCheck, 3000);

// --- Zähler aus dem Spiel --------------------------------------------------------------------------------------------
if (typeof turmFinalLoot === 'function') {
  const _erfTurm = turmFinalLoot;
  turmFinalLoot = function (m) {
    const D = typeof diffLoot === 'function' ? diffLoot() : null;
    const r = _erfTurm(m);
    erfZaehl('turm');
    if (D && D.id >= 2) erfZaehl('myth');
    return r;
  };
}
if (typeof instFinalLoot === 'function') {
  const _erfInst = instFinalLoot;
  instFinalLoot = function (m, def) {
    const hi = def && instMobLevel(def) >= 75;
    const D = hi && typeof diffNow === 'function' ? diffNow() : null;
    const r = _erfInst(m, def);
    if (hi) erfZaehl('inst');
    if (D && D.id >= 2) erfZaehl('myth');
    return r;
  };
}
if (typeof aufgDone === 'function') {
  const _erfAufg = aufgDone;
  aufgDone = function (art, e) {
    const r = _erfAufg(art, e);
    if (art === 'tag') erfZaehl('tage');
    return r;
  };
}

// --- Titel bei den Mitspielern (netz.js) -------------------------------------------------------------------------------
if (typeof netPlayerState === 'function') {
  const _erfState = netPlayerState;
  netPlayerState = function () {
    const s = _erfState();
    const p = game.player;
    const id = p && p.erf && p.erf.titel;
    if (id && ERFOLG_BY_ID[id]) s.ti = id;
    return s;
  };
}
if (typeof netApplyState === 'function') {
  const _erfApply = netApplyState;
  netApplyState = function (rp, s) {
    const r = _erfApply(rp, s);
    if (rp && s) rp.titelId = typeof s.ti === 'string' && ERFOLG_BY_ID[s.ti] && ERFOLG_BY_ID[s.ti].titel ? s.ti : '';
    return r;
  };
}

// --- Seite „Erfolge“ im Charakterfenster (oberflaeche.js, CHAR_TABS_EXTRA) ------------------------------------------------
function erfCss() {
  if (document.getElementById('erfCss')) return;
  const st = document.createElement('style');
  st.id = 'erfCss';
  st.textContent = '.erf-kopf{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:2px 0 8px}.erf-pkt{font:700 22px/1 system-ui,sans-serif;color:#ffd96a}' +
    '.erf-pkt small{font-size:12px;color:#c9b88a;margin-left:4px}.erf-titel{flex:1;min-width:200px;font-size:12px;color:#d8cfbf}.erf-titel select{margin-left:6px;max-width:220px}' +
    '.erf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px;margin-bottom:8px}' +
    '.erf-e{padding:6px 8px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);font-size:12px;color:#c9c0ae}' +
    '.erf-e b{display:block;color:#e8e0d0;font-size:13px}.erf-e.done{border-color:rgba(255,211,77,.5);background:rgba(255,211,77,.08)}.erf-e.done b{color:#ffd96a}' +
    '.erf-e .erf-t{color:#9fe7b4}.erf-bar{position:relative;height:6px;margin-top:4px;border-radius:3px;background:rgba(0,0,0,.4);overflow:hidden}.erf-bar i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#8a5cff,#ffd34d)}';
  document.head.appendChild(st);
}
function erfHtml(p) {
  erfCss();
  const e = erfState(p);
  const fmt = (v) => Math.floor(v).toLocaleString('de-DE');
  const card = (E) => {
    const done = !!e.done[E.id];
    let v = 0;
    try { v = Math.min(E.need, +E.val(p) || 0); } catch (err) { v = 0; }
    return `<div class="erf-e${done ? ' done' : ''}"><b>${done ? '★ ' : ''}${E.name}</b><span>${erfText(E)}</span>` +
      `<span> · ${E.pts} Punkte</span>${E.titel ? `<span class="erf-t"> · Titel: ${E.titel}</span>` : ''}` +
      (done ? '' : `<div class="erf-bar"><i style="width:${((v / E.need) * 100).toFixed(1)}%"></i></div><small>${fmt(v)} / ${fmt(E.need)}</small>`) + '</div>';
  };
  const titel = ERFOLGE.filter((E) => E.titel && e.done[E.id]);
  const kats = [...new Set(ERFOLGE.map((E) => E.kat))];
  const n = ERFOLGE.filter((E) => e.done[E.id]).length;
  return `<div class="erf"><div class="erf-kopf"><div class="erf-pkt">${erfPoints(p)}<small>Erfolgspunkte · ${n} / ${ERFOLGE.length}</small></div>` +
    `<div class="erf-titel">Titel über deinem Kopf:<select data-erftitel><option value="">– kein Titel –</option>${titel.map((E) => `<option value="${E.id}" ${E.id === e.titel ? 'selected' : ''}>${E.titel}</option>`).join('')}</select>` +
    (titel.length ? '' : ' <small>Titel gibt es für besondere Erfolge.</small>') + '</div></div>' +
    kats.map((k) => `<h3>${k}</h3><div class="erf-grid">${ERFOLGE.filter((E) => E.kat === k).map(card).join('')}</div>`).join('') + '</div>';
}
const CHAR_TABS_EXTRA = [{
  id: 'erfolge', label: 'Erfolge', show: () => true, html: erfHtml,
  bind(root) {
    const sel = root && root.querySelector('[data-erftitel]');
    if (sel) sel.addEventListener('change', () => erfTitelSet(sel.value));
  }
}];
