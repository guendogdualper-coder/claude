'use strict';
// Kochen (seit 15.83, docs/angeln-kochen.md): aus Fischen und Zutaten Gerichte mit kurzen, kleinen Buffs.
// - Kochstellen (steinerner Herd mit Topf) stehen in jeder Stadt und jedem Lager neben der Fischerin (angeln.js). Im
//   Freien entzündet man ein eigenes Lagerfeuer (Charakterfenster → „Angeln & Kochen“ oder ein freier Platz der
//   Leiste); es brennt KOCH.feuer Sekunden, Mitspieler sehen es und dürfen daran mitkochen.
// - Rezepte (KOCH_REZEPTE): Fisch (beliebig oder aus einem Gewässer) und Zutaten. Zutaten verkauft die Fischerin
//   (Kräuterbund, Meersalz, Fladenbrot, Butter) oder sie fallen von Monstern: Wildfleisch von wilden Tieren,
//   Frostminze im Frost, Glutpfeffer am Feuerberg, im Titanenkamm und im Aschewald. Der Topf nimmt zuerst die
//   häufigsten Fische; epische und legendäre nimmt er nie von selbst.
// - Kochstufe 1–100 steigt mit jedem Gericht; bessere Rezepte erst ab einer Kochstufe.
// - Gerichte liegen im Vorrat (verkaufbar, per Post und Auktionshaus handelbar wie die Fische). Essen gibt für
//   KOCH.dauer Sekunden Spielzeit eine Wirkung – immer nur EINE Mahlzeit, eine neue ersetzt die alte. Werte bewusst
//   klein: Lebensregeneration bis +0,4 %, Erfahrung +3–5 %, Mana bis +8 %, Leben bis +4 %, Verteidigung bis +5 %.
// Spielstand: p.koch = { xp, n: gekocht, rez: { id: Anzahl }, feuer: entzündete Lagerfeuer, mahl: Gericht, mahlT: Sekunden }

const KOCH = { dauer: 1800, feuer: 180, stufeK: 0.35, zutatChance: 0.05 };
const KOCH_MAX_STUFE = 100;
// Zutaten: kauf = Preis bei der Fischerin (sonst nicht käuflich), preis = Verkaufswert, quelle = Hinweis
Object.assign(FANG, {
  kraeuter: { id: 'kraeuter', art: 'zutat', name: 'Kräuterbund', form: 'kraeuter', r: 0, kauf: 40, preis: 10, text: 'Frische Kräuter. Gibt es bei der Fischerin.' },
  meersalz: { id: 'meersalz', art: 'zutat', name: 'Meersalz', form: 'salz', r: 0, kauf: 30, preis: 7, text: 'Grobes Salz in einem Leinensäckchen. Gibt es bei der Fischerin.' },
  fladenbrot: { id: 'fladenbrot', art: 'zutat', name: 'Fladenbrot', form: 'brot', r: 0, kauf: 60, preis: 15, text: 'Noch warm. Gibt es bei der Fischerin.' },
  butter: { id: 'butter', art: 'zutat', name: 'Butter', form: 'butter', r: 0, kauf: 80, preis: 20, text: 'Ein Stück frische Butter. Gibt es bei der Fischerin.' },
  wildfleisch: { id: 'wildfleisch', art: 'zutat', name: 'Wildfleisch', form: 'fleisch', r: 1, preis: 25, text: 'Von wilden Tieren (Wölfe, Keiler, Bären, Raubkatzen …).' },
  frostminze: { id: 'frostminze', art: 'zutat', name: 'Frostminze', form: 'minze', r: 1, preis: 60, text: 'Wächst nur im ewigen Eis: Monster im Frostgipfel und in Nachtfrost tragen sie bei sich.' },
  glutpfeffer: { id: 'glutpfeffer', art: 'zutat', name: 'Glutpfeffer', form: 'pfeffer', r: 1, preis: 90, text: 'Scharf wie Lava: von Monstern am Feuerberg, im Titanenkamm und im Aschewald.' }
});
const KOCH_LADEN = ['kraeuter', 'meersalz', 'fladenbrot', 'butter'];
// Fischgruppen der Rezepte (Gewässer aus angeln.js)
const KOCH_GRUPPE = {
  alle: { name: 'Fisch', pools: null },
  suess: { name: 'Süßwasserfisch', pools: ['see', 'warm', 'seele', 'himmel'] },
  moor: { name: 'Moorfisch', pools: ['moor', 'blut'] },
  eis: { name: 'Eisfisch', pools: ['eis'] },
  lava: { name: 'Lavafisch', pools: ['lava'] },
  meer: { name: 'Meeresfisch', pools: ['meer'] },
  selten: { name: 'seltener Fisch', pools: null, r: 2 }
};
// Rezepte: stufe = ab Kochstufe, zut = [['fisch', Gruppe, n] | ['zutat', id, n]], w = Wirkung,
// form/c = Bild des Gerichts
const KOCH_REZEPTE = [
  { id: 'fischspiess', name: 'Fischspieß', stufe: 1, zut: [['fisch', 'alle', 1]], w: { regen: 0.002 }, form: 'spiess', c: ['#b8783a', '#e8c890'] },
  { id: 'kraeuterfisch', name: 'Kräuterfisch', stufe: 8, zut: [['fisch', 'alle', 1], ['zutat', 'kraeuter', 1]], w: { regen: 0.003, xp: 0.03 }, form: 'teller', c: ['#d8a060', '#6ab04a'] },
  { id: 'fischsuppe', name: 'Fischsuppe', stufe: 18, zut: [['fisch', 'alle', 2], ['zutat', 'meersalz', 1], ['zutat', 'kraeuter', 1]], w: { mp: 0.06, regen: 0.002 }, form: 'schale', c: ['#e8d0a0', '#d88a3a'] },
  { id: 'raeucherbrot', name: 'Räucherfisch im Fladenbrot', stufe: 28, zut: [['fisch', 'moor', 1], ['zutat', 'fladenbrot', 1]], w: { hp: 0.03, def: 0.03 }, form: 'brotfisch', c: ['#a8703a', '#e8c880'] },
  { id: 'wildfischtopf', name: 'Wildfischtopf', stufe: 38, zut: [['fisch', 'alle', 1], ['zutat', 'wildfleisch', 1], ['zutat', 'kraeuter', 1]], w: { hp: 0.04, regen: 0.003 }, form: 'topf', c: ['#8a3a22', '#c87a3a'] },
  { id: 'frostminzfilet', name: 'Frostminzfilet', stufe: 45, zut: [['fisch', 'eis', 1], ['zutat', 'frostminze', 1]], w: { mp: 0.08, xp: 0.03 }, form: 'teller', c: ['#f0e8e0', '#7ad8c8'] },
  { id: 'glutpfefferaal', name: 'Glutpfeffer-Aal', stufe: 55, zut: [['fisch', 'lava', 1], ['zutat', 'glutpfeffer', 1]], w: { def: 0.05, regen: 0.003 }, form: 'spiess', c: ['#5a2a1a', '#ff6a2a'] },
  { id: 'meeresplatte', name: 'Meeresplatte', stufe: 65, zut: [['fisch', 'meer', 2], ['zutat', 'butter', 1], ['zutat', 'meersalz', 1]], w: { xp: 0.04, mp: 0.06 }, form: 'platte', c: ['#e8b890', '#f0e070'] },
  { id: 'festmahl', name: 'Festmahl des Anglers', stufe: 78, zut: [['fisch', 'selten', 1], ['zutat', 'wildfleisch', 1], ['zutat', 'butter', 1], ['zutat', 'fladenbrot', 1]], w: { xp: 0.05, regen: 0.004, def: 0.03 }, form: 'platte', c: ['#c87a3a', '#ffd34d'] }
];
const KOCH_BY_ID = {};
for (const R of KOCH_REZEPTE) {
  KOCH_BY_ID[R.id] = R;
  FANG[R.id] = { id: R.id, art: 'mahl', name: R.name, form: R.form, c: R.c, r: R.stufe < 15 ? 1 : R.stufe < 40 ? 2 : R.stufe < 70 ? 3 : 4, preis: Math.round(25 + R.stufe * 9) };
}
// Namen der Wirkungen (Werte als Anteil)
const KOCH_WIRKUNG = [
  ['regen', 'Lebensregeneration', 1],
  ['xp', 'Erfahrung', 0],
  ['mp', 'Mana', 0],
  ['hp', 'Leben', 0],
  ['def', 'Verteidigung', 0]
];
const kochPct = (v, nk) => '+' + (v * 100).toLocaleString('de-DE', { minimumFractionDigits: nk, maximumFractionDigits: nk }) + ' %';
function kochWirkungText(w) {
  return KOCH_WIRKUNG.filter(([k]) => w[k]).map(([k, name, nk]) => `${name} ${kochPct(w[k], nk)}`).join(' · ');
}
function kochMahlText(d) {
  const R = d && KOCH_BY_ID[d.id];
  return R ? `${kochWirkungText(R.w)} · ${Math.round(KOCH.dauer / 60)} Minuten` : '';
}

if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('koch')) SAVE_FIELDS.push('koch');
function kochState(p) {
  p = p || game.player;
  if (!p.koch || typeof p.koch !== 'object') p.koch = {};
  const K = p.koch;
  K.xp = anInt(K.xp, 0, 1e9);
  K.n = anInt(K.n, 0, 1e9);
  K.feuer = anInt(K.feuer, 0, 1e9);
  if (!K.rez || typeof K.rez !== 'object') K.rez = {};
  if (typeof K.mahl !== 'string' || !KOCH_BY_ID[K.mahl]) { K.mahl = ''; K.mahlT = 0; }
  K.mahlT = anInt(K.mahlT, 0, KOCH.dauer);
  if (!K.mahlT) K.mahl = '';
  return K;
}
const kochStufe = (xp) => Math.min(KOCH_MAX_STUFE, 1 + Math.floor(Math.sqrt(Math.max(0, xp) / KOCH.stufeK)));
const kochXpFuer = (st) => Math.ceil(KOCH.stufeK * Math.pow(Math.max(0, st - 1), 2));

// --- Zutaten zusammensuchen -------------------------------------------------------------------------------------
// Fische einer Gruppe, die der Topf nehmen darf: die häufigsten und billigsten zuerst; episch und legendär nie
function kochFische(p, gruppe) {
  const G = KOCH_GRUPPE[gruppe];
  if (!G) return [];
  return fangListe(p).filter(({ d }) => d.art === 'fisch' && d.r < 3 && (G.r == null || d.r >= G.r) && (!G.pools || G.pools.includes(d.pool)))
    .sort((a, b) => a.d.r - b.d.r || fangPreis(a.d) - fangPreis(b.d) || a.d.name.localeCompare(b.d.name));
}
// Was würde ein Kochen verbrauchen? [{ id, n }] oder null (fehlt etwas). mal = so oft hintereinander
function kochBedarf(p, R, mal = 1) {
  const take = new Map();
  for (const [art, was, n] of R.zut) {
    let need = n * mal;
    if (art === 'zutat') {
      if (fangN(p, was) - (take.get(was) || 0) < need) return null;
      take.set(was, (take.get(was) || 0) + need);
      continue;
    }
    for (const { d } of kochFische(p, was)) {
      const frei = fangN(p, d.id) - (take.get(d.id) || 0);
      const k = Math.min(frei, need);
      if (k > 0) { take.set(d.id, (take.get(d.id) || 0) + k); need -= k; }
      if (!need) break;
    }
    if (need) return null;
  }
  return [...take].map(([id, n]) => ({ id, n }));
}
function kochHabe(p, art, was) {
  if (art === 'zutat') return fangN(p, was);
  return kochFische(p, was).reduce((s, { n }) => s + n, 0);
}
// wie oft hintereinander (höchstens 5, so viel bietet das Fenster an)
function kochWieOft(p, R) {
  let lo = 0;
  for (let k = 1; k <= 5; k++) { if (kochBedarf(p, R, k)) lo = k; else break; }
  return lo;
}

// --- Kochen und Essen ---------------------------------------------------------------------------------------------
// Ist eine Kochstelle oder ein Lagerfeuer (eigenes oder eines Mitspielers) in der Nähe?
function kochFeuerNah(p) {
  if (!p || !game.world) return null;
  const such = (list) => {
    let best = null;
    let bd = 110;
    for (const n of list) {
      if (n.id !== 'kochstelle' && n.id !== 'lagerfeuer') continue;
      const d = hyp(n.x - p.x, n.y - p.y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  };
  // erst die Leute in Sichtweite (gemerkt, folgt der Kamera); direkt nach einem Sprung noch einmal alle
  if (typeof npcsNear !== 'function') return such(game.world.npcs);
  return such(npcsNear()) || such(game.world.npcs);
}
function kochKochen(id, mal = 1) {
  const p = game.player;
  const R = KOCH_BY_ID[id];
  if (!p || !R) return '';
  const K = kochState(p);
  if (!kochFeuerNah(p)) return 'Dafür brauchst du eine Kochstelle oder ein Lagerfeuer.';
  if (kochStufe(K.xp) < R.stufe) return `Erst ab Kochstufe ${R.stufe}.`;
  let n = 0;
  const st0 = kochStufe(K.xp);
  for (let k = 0; k < mal; k++) {
    const b = kochBedarf(p, R, 1);
    if (!b) break;
    for (const { id: zid, n: zn } of b) fangTake(p, zid, zn);
    fangAdd(p, R.id, 1);
    const neu = !K.rez[R.id];
    K.rez[R.id] = anInt(K.rez[R.id], 0, 1e9) + 1;
    K.n++;
    K.xp += (kochStufe(K.xp) > R.stufe + 25 ? 1 : 4 + Math.floor(R.stufe / 8)) + (neu ? 10 : 0);
    n++;
  }
  if (!n) return 'Dafür fehlen Zutaten.';
  const st1 = kochStufe(K.xp);
  anTon('feuer_wirken', { vol: 0.25, rate: 1.4, maxDur: 0.5 }, 'item');
  if (typeof ui !== 'undefined') {
    ui.loot(R.name, n, fangIconUrl(R.id), fangFarbe(FANG[R.id]));
    if (st1 > st0) { ui.log(`Kochstufe ${st1} erreicht!`, 'level'); ui.banner('Kochstufe ' + st1, 'Neue Rezepte rücken näher'); anTon('stufe', { vol: 0.35 }, 'levelup'); }
  }
  const f = kochFeuerNah(p);
  if (f && typeof particles === 'function' && !(typeof V3 !== 'undefined' && V3.on)) particles(f.x, f.y - 14, { count: 8, color: ['#ffd36a', '#ff8a2a', '#ffffff'], angle: -Math.PI / 2, spread: 0.7, speed: [20, 60], life: [0.4, 0.8], size: [1.2, 2.2], drag: 2, shape: 'ember' });
  if (typeof saveGame === 'function') saveGame();
  return n > 1 ? `Gekocht · ${n} × ${R.name}` : `Gekocht · ${R.name}`;
}
function kochEssen(id) {
  const p = game.player;
  const R = KOCH_BY_ID[id];
  if (!p || !R || p.dead) return false;
  if (!fangTake(p, id, 1)) return false;
  const K = kochState(p);
  const alt = K.mahl && K.mahl !== id ? KOCH_BY_ID[K.mahl] : null;
  K.mahl = id;
  K.mahlT = KOCH.dauer;
  game.stats = playerStats(p);
  anTon('heilung', { vol: 0.3, rate: 1.2 }, 'item');
  // warmer Dampf und ein paar Funken über der Figur (keine Ringe am Boden)
  if (typeof particles === 'function') {
    const fy = (typeof feetY === 'function' ? feetY(p) : p.y) - 20;
    particles(p.x, fy, { count: 9, color: ['#ffd36a', '#ffb070', '#fff3d0'], angle: -Math.PI / 2, spread: 0.7, speed: [25, 70], life: [0.5, 0.9], size: [1.4, 2.4], drag: 2, jitter: 6 });
    particles(p.x, fy + 6, { count: 5, color: ['rgba(255,255,255,0.55)', 'rgba(240,235,225,0.45)'], angle: -Math.PI / 2, spread: 0.4, speed: [12, 30], life: [0.7, 1.1], size: [2.5, 4], drag: 1, glow: false, jitter: 5 });
  }
  if (typeof ui !== 'undefined') {
    ui.banner(R.name, kochWirkungText(R.w));
    ui.log(`Gegessen · ${R.name} · ${kochWirkungText(R.w)} · ${Math.round(KOCH.dauer / 60)} Minuten`, 'level');
    if (alt) ui.log(`Mahlzeit ersetzt · ${alt.name}`, 'info');
  }
  if (typeof saveGame === 'function') saveGame();
  return true;
}
// Wirkung der aktiven Mahlzeit (nur die eigene Figur hat p.koch)
function kochWirkung(p) {
  const K = p && p.koch;
  if (!K || !(K.mahlT > 0) || !K.mahl) return null;
  const R = KOCH_BY_ID[K.mahl];
  return R ? R.w : null;
}
if (typeof playerStats === 'function') {
  const _kochStats = playerStats;
  // eslint-disable-next-line no-global-assign
  playerStats = function (p) {
    const s = _kochStats.apply(this, arguments);
    const W = kochWirkung(p);
    if (W && s) {
      if (W.regen) s.regen += W.regen;
      if (W.hp) { const add = Math.round(s.maxHp * W.hp); s.maxHp += add; s.bonusHp = (s.bonusHp || 0) + add; }
      if (W.mp) s.maxMp += Math.round(s.maxMp * W.mp);
      if (W.def) s.def += Math.round(s.def * W.def);
    }
    return s;
  };
}
if (typeof gainXp === 'function') {
  const _kochGainXp = gainXp;
  // eslint-disable-next-line no-global-assign
  gainXp = function (amount) {
    const W = game.player ? kochWirkung(game.player) : null;
    if (W && W.xp && amount > 0) amount = Math.round(amount * (1 + W.xp));
    return _kochGainXp.call(this, amount);
  };
}
// Die Mahlzeit wirkt nur im laufenden Spiel (wie der Erfahrungsring)
setInterval(() => {
  const p = typeof game !== 'undefined' ? game.player : null;
  if (!p || !game.running || document.hidden || !p.koch || !(p.koch.mahlT > 0)) return;
  p.koch.mahlT = Math.max(0, p.koch.mahlT - 1);
  if (!p.koch.mahlT) {
    const R = KOCH_BY_ID[p.koch.mahl];
    p.koch.mahl = '';
    if (R && typeof ui !== 'undefined') ui.log(`Mahlzeit vorbei · ${R.name}`, 'info');
    game.stats = playerStats(p);
  } else if (p.koch.mahlT === 120 && typeof ui !== 'undefined') ui.log('Deine Mahlzeit wirkt noch 2 Minuten.', 'info');
}, 1000);
// Symbol mit Restzeit in der Buff-Leiste (die Leiste wird von oberflaeche.js neu geschrieben: dann wieder einsetzen)
const KOCH_BUFF = { el: null, key: '' };
function kochBuffTick() {
  const p = game.player;
  const list = document.getElementById('buffList');
  if (!p || !list) return;
  const K = p.koch;
  const R = K && K.mahlT > 0 ? KOCH_BY_ID[K.mahl] : null;
  if (!R) {
    if (KOCH_BUFF.el && KOCH_BUFF.el.parentNode) KOCH_BUFF.el.remove();
    KOCH_BUFF.key = '';
    return;
  }
  const min = Math.ceil(K.mahlT / 60);
  if (!KOCH_BUFF.el) {
    KOCH_BUFF.el = document.createElement('div');
    KOCH_BUFF.el.className = 'buff-ico buff-mahl';
    KOCH_BUFF.el.innerHTML = '<img alt=""><span></span>';
  }
  if (KOCH_BUFF.el.parentNode !== list) { list.prepend(KOCH_BUFF.el); KOCH_BUFF.key = ''; }
  const key = R.id + '|' + min;
  if (key !== KOCH_BUFF.key) {
    KOCH_BUFF.key = key;
    const el = KOCH_BUFF.el;
    el.classList.toggle('ending', min <= 2);
    el.style.setProperty('--p', Math.min(1, K.mahlT / KOCH.dauer).toFixed(3));
    // Hinweis zeilenweise übersetzen (der Hinweiskasten übersetzt nur als Ganzes und verlöre sonst die Zeilen)
    const tr = (t) => (typeof trText === 'function' ? trText(t) : t);
    el.dataset.tip = [tr(R.name), tr(kochWirkungText(R.w)), tr(`noch ${min} min`)].join('\n');
    const img = el.querySelector('img');
    if (img.dataset.id !== R.id) { img.dataset.id = R.id; img.src = fangIconUrl(R.id); img.alt = R.name; }
    el.querySelector('span').textContent = min + ' m';
  }
  const hud = document.getElementById('hud');
  if (hud && !hud.classList.contains('has-buffs')) hud.classList.add('has-buffs');
}
if (typeof ui !== 'undefined' && typeof ui.update === 'function') {
  const _kochUiUpdate = ui.update;
  ui.update = function () {
    const r = _kochUiUpdate.apply(this, arguments);
    try { kochBuffTick(); } catch (err) { anFehler(err); }
    return r;
  };
}

// --- Zutaten von Monstern ----------------------------------------------------------------------------------------
const KOCH_FROST = new Set(['frost', 'nachtfrost', 'eisgrotte', 'gletschergruft']);
const KOCH_GLUT = new Set(['vulkan', 'titanenkamm', 'aschewald', 'drachenhort']);
const KOCH_GLUT_MONSTER = new Set(['hoellenhund', 'lavagolem', 'feuerdaemon', 'feuerdrache', 'glutkatze']);
function kochBeute(m) {
  const p = game.player;
  const t = m && m.type;
  if (!p || !t || m.isStone || t.boss || t.raid || t.crystal || t.inst || t.weltboss) return;
  const z = typeof zoneAt === 'function' ? zoneAt(m.x, m.y) : null;
  const zid = z ? z.id : '';
  let id = null;
  if ((t.shape === 'beast' || t.shape === 'boar') && Math.random() < KOCH.zutatChance) id = 'wildfleisch';
  else if (KOCH_FROST.has(zid) && Math.random() < KOCH.zutatChance) id = 'frostminze';
  else if ((KOCH_GLUT.has(zid) || KOCH_GLUT_MONSTER.has(m.typeId)) && Math.random() < KOCH.zutatChance) id = 'glutpfeffer';
  if (!id) return;
  fangAdd(p, id, 1);
  if (typeof ui !== 'undefined') ui.loot(FANG[id].name, 1, fangIconUrl(id), fangFarbe(FANG[id]));
}
if (typeof rollLoot === 'function') {
  const _kochRollLoot = rollLoot;
  // eslint-disable-next-line no-global-assign
  rollLoot = function (m) {
    const r = _kochRollLoot.apply(this, arguments);
    try { kochBeute(m); } catch (err) { anFehler(err); }
    return r;
  };
}

// --- Lagerfeuer im Freien -------------------------------------------------------------------------------------------
const KOCH_FEUER = { eigen: null, fremd: new Map(), syncAt: 0 };
function kochFeuer() {
  const p = game.player;
  if (!p || p.dead || !game.world || !game.running) return false;
  const sag = (t) => { if (typeof addText === 'function') addText(p.x, feetY(p) - 70, t, 'info'); return false; };
  if (p.riding && typeof toggleRide === 'function') toggleRide(false);
  if (p.riding) return sag('Erst absteigen.');
  if (typeof inVillage === 'function' && inVillage(p.x, p.y)) return sag('In der Stadt kochst du an der Kochstelle.');
  if (!mapOfTile(Math.floor(p.x / TILE), Math.floor(p.y / TILE))) return sag('Hier lässt sich kein Feuer machen.');
  if (game.time - (p.lastCombat || -99) < ANGELN.kampf) return sag('Nicht mitten im Kampf.');
  const f = p.facing || { x: 0, y: 1 };
  const a0 = Math.atan2(f.y, f.x);
  const fy = feetY(p);
  let at = null;
  for (const da of [0, 0.6, -0.6, 1.2, -1.2, Math.PI]) {
    const x = p.x + Math.cos(a0 + da) * 28;
    const y = fy + Math.sin(a0 + da) * 28;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const i = ty * MAP_W + tx;
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
    if (LIQUID.has(game.world.ground[i]) || game.world.ground[i] === GROUND.ICE || game.world.obj[i] !== OBJ.NONE || game.world.deco[i] === DECO.BRIDGE) continue;
    if (typeof canStand === 'function' && !canStand(x, y, 6, false)) continue;
    at = { x: Math.round(x), y: Math.round(y - 11 * 0.8) };
    break;
  }
  if (!at) return sag('Hier ist kein Platz für ein Feuer.');
  kochFeuerWeg();
  const n = { id: 'lagerfeuer', name: 'Lagerfeuer', x: at.x, y: at.y, r: 11, silent: true, own: true, until: game.time + KOCH.feuer, born: game.time };
  game.world.npcs.push(n);
  KOCH_FEUER.eigen = n;
  const K = kochState(p);
  K.feuer++;
  anTon('feuer_wirken', { x: at.x, y: at.y, vol: 0.4, rate: 1.1 }, 'item');
  if (typeof particles === 'function' && !(typeof V3 !== 'undefined' && V3.on)) particles(at.x, at.y, { count: 12, color: ['#ffd36a', '#ff8a2a', '#ffffff'], angle: -Math.PI / 2, spread: 0.9, speed: [20, 70], life: [0.4, 0.9], size: [1.2, 2.4], drag: 2, shape: 'ember' });
  if (typeof ui !== 'undefined') ui.log(`Lagerfeuer entzündet · Es brennt ${Math.round(KOCH.feuer / 60)} Minuten · Stell dich daneben und koche: Sprechen-Taste oder Knopf „Kochen“.`, 'info');
  if (typeof saveGame === 'function') saveGame();
  return true;
}
function kochFeuerWeg() {
  const n = KOCH_FEUER.eigen;
  KOCH_FEUER.eigen = null;
  if (!n || !game.world) return;
  game.world.npcs = game.world.npcs.filter((x) => x !== n);
  if (game.nearNpc === n) game.nearNpc = null;
}
// Lagerfeuer der Mitspieler: Zustand „lf“ = [x, y]; nur in der Welt, nah bei der Figur, auf festem Boden
function kochNetIn(rp, a) {
  if (!Array.isArray(a) || a.length < 2) { rp.lfPos = null; return; }
  const x = Number(a[0]);
  const y = Number(a[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > MAP_W * TILE || y > MAP_H * TILE || hyp(x - rp.x, y - rp.y) > 40 * TILE) { rp.lfPos = null; return; }
  rp.lfPos = { x: Math.round(x), y: Math.round(y) };
}
function kochTick() {
  const w = game.world;
  if (!w) return;
  const E = KOCH_FEUER.eigen;
  if (E && (game.time > E.until || !w.npcs.includes(E))) {
    kochFeuerWeg();
    if (typeof ui !== 'undefined' && game.running) ui.log('Dein Lagerfeuer ist erloschen.', 'info');
  }
  const now = performance.now();
  if (now - KOCH_FEUER.syncAt < 500) return;
  KOCH_FEUER.syncAt = now;
  // Feuer der Mitspieler nachziehen
  const da = new Set();
  if (typeof net !== 'undefined' && net.players) {
    for (const [pid, rp] of net.players) {
      if (!rp.lfPos) continue;
      da.add(pid);
      let n = KOCH_FEUER.fremd.get(pid);
      if (!n || !w.npcs.includes(n)) {
        n = { id: 'lagerfeuer', name: 'Lagerfeuer', x: rp.lfPos.x, y: rp.lfPos.y, r: 11, silent: true, remoteOf: pid, born: game.time };
        w.npcs.push(n);
        KOCH_FEUER.fremd.set(pid, n);
      }
      n.x = rp.lfPos.x;
      n.y = rp.lfPos.y;
    }
  }
  for (const [pid, n] of KOCH_FEUER.fremd) {
    if (da.has(pid)) continue;
    KOCH_FEUER.fremd.delete(pid);
    w.npcs = w.npcs.filter((x) => x !== n);
    if (game.nearNpc === n) game.nearNpc = null;
  }
}
if (typeof updateEffects === 'function') {
  const _kochUpdateEffects = updateEffects;
  // eslint-disable-next-line no-global-assign
  updateEffects = function (dt) {
    _kochUpdateEffects(dt);
    try { kochTick(); } catch (err) { anFehler(err); }
  };
}
if (typeof netPlayerState === 'function') {
  const _kochNetState = netPlayerState;
  // eslint-disable-next-line no-global-assign
  netPlayerState = function () {
    const s = _kochNetState.apply(this, arguments);
    const E = KOCH_FEUER.eigen;
    if (E && s) s.lf = [E.x, E.y];
    return s;
  };
}
if (typeof netApplyState === 'function') {
  const _kochNetApply = netApplyState;
  // eslint-disable-next-line no-global-assign
  netApplyState = function (rp, s) {
    const r = _kochNetApply.apply(this, arguments);
    try { if (rp && s) kochNetIn(rp, s.lf); } catch (err) { anFehler(err); }
    return r;
  };
}
// Freier Platz der Leiste: „Lagerfeuer“
if (typeof QUICK_ACTIONS !== 'undefined' && typeof QUICK_SVG !== 'undefined') {
  QUICK_SVG.lagerfeuer = '<svg viewBox="0 0 24 24"><path d="M5 20l14-5M5 15l14 5"/><path class="fill" d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 2.5 2 2.5 0-2-1-4 0-6.5z"/></svg>';
  QUICK_ACTIONS.lagerfeuer = { label: 'Lagerfeuer', svg: 'lagerfeuer' };
}
if (typeof runAction === 'function') {
  const _kochRunAction = runAction;
  // eslint-disable-next-line no-global-assign
  runAction = function (id, e) {
    if (id === 'lagerfeuer') { if (!(e && e.repeat)) kochFeuer(); return; }
    return _kochRunAction.apply(this, arguments);
  };
}
if (typeof NPC_TALK_LABEL !== 'undefined') { NPC_TALK_LABEL.kochstelle = 'Kochen'; NPC_TALK_LABEL.lagerfeuer = 'Kochen'; }
if (typeof NPC_ART !== 'undefined') { NPC_ART.kochstelle = () => {}; NPC_ART.lagerfeuer = () => {}; }

// --- Kochfenster ---------------------------------------------------------------------------------------------------
function kochRender(npc, msg) {
  const p = game.player;
  const body = document.getElementById('npcBody');
  if (!p || !body) return;
  anCss();
  kochCss();
  const K = kochState(p);
  const st = kochStufe(K.xp);
  const von = kochXpFuer(st);
  const bis = kochXpFuer(st + 1);
  const pct = st >= KOCH_MAX_STUFE ? 100 : Math.max(0, Math.min(100, ((K.xp - von) / Math.max(1, bis - von)) * 100));
  const aktiv = K.mahlT > 0 ? KOCH_BY_ID[K.mahl] : null;
  const karten = KOCH_REZEPTE.map((R) => {
    const zu = st < R.stufe;
    const oft = zu ? 0 : kochWieOft(p, R);
    const vorrat = fangN(p, R.id);
    const zut = R.zut.map(([art, was, n]) => {
      const name = art === 'zutat' ? FANG[was].name : KOCH_GRUPPE[was].name;
      const hab = kochHabe(p, art, was);
      return `<span class="koch-z${hab >= n ? ' ok' : ''}"><span>${n} × ${name}</span> <small>(${anDe(hab)})</small></span>`;
    }).join('');
    return `<div class="koch-r${zu ? ' zu' : ''}"><img src="${fangIconUrl(R.id)}" alt=""><div class="koch-r-text"><b style="color:${fangFarbe(FANG[R.id])}">${R.name}</b>` +
      `<small>${zu ? `ab Kochstufe ${R.stufe}` : kochWirkungText(R.w)}</small><div class="koch-zut">${zut}</div></div>` +
      `<div class="koch-r-knopf"><button type="button" class="mini-btn primary" data-koch="${R.id}" data-n="1" ${oft ? '' : 'disabled'}>Kochen</button>` +
      (oft > 1 ? `<button type="button" class="mini-btn" data-koch="${R.id}" data-n="${Math.min(5, oft)}">${Math.min(5, oft)}×</button>` : '') +
      (vorrat ? `<button type="button" class="mini-btn" data-kessen="${R.id}">Essen <small>(${anDe(vorrat)})</small></button>` : '') + '</div></div>';
  }).join('');
  body.innerHTML = `<div class="koch">` +
    `<p class="koch-kopf"><span>Kochstufe</span> <b class="an-gross">${st}</b> <small>/ ${KOCH_MAX_STUFE}</small> <span>Gerichte gekocht</span> <b>${anDe(K.n)}</b></p>` +
    `<div class="an-balken koch-balken"><i style="width:${pct.toFixed(1)}%"></i></div>` +
    `<p class="koch-aktiv">${aktiv ? `<img src="${fangIconUrl(aktiv.id)}" alt=""> <b>${aktiv.name}</b> <span>${kochWirkungText(aktiv.w)}</span> <small>noch ${Math.ceil(K.mahlT / 60)} min</small>` : `<span>Keine Mahlzeit aktiv. Gerichte wirken ${Math.round(KOCH.dauer / 60)} Minuten Spielzeit, immer nur eines.</span>`}</p>` +
    `<div class="koch-liste">${karten}</div>` +
    `<p class="hint-text">Der Topf nimmt zuerst die häufigsten Fische, epische und legendäre nie. Zutaten gibt es bei der Fischerin; Wildfleisch, Frostminze und Glutpfeffer bringen Monster.</p>` +
    `<p id="kochMsg" class="gear-msg">${msg ? anEsc(msg) : ''}</p></div>`;
  const panel = body.closest('.panel');
  if (panel) { panel.classList.remove('npc-klein'); panel.classList.add('npc-wide'); }
  body.querySelectorAll('[data-koch]').forEach((b) => b.addEventListener('click', () => kochRender(npc, kochKochen(b.dataset.koch, Number(b.dataset.n) || 1))));
  body.querySelectorAll('[data-kessen]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.kessen;
    const cur = kochState(p);
    if (cur.mahlT > 60 && cur.mahl && cur.mahl !== id && typeof armConfirm === 'function' && !armConfirm(b, 'Ersetzen?')) return;
    if (kochEssen(id)) kochRender(npc, `Gegessen · ${KOCH_BY_ID[id].name}`);
  }));
}
if (typeof ui !== 'undefined' && typeof ui.openNpc === 'function') {
  const _kochOpenNpc = ui.openNpc;
  ui.openNpc = function (npc) {
    const r = _kochOpenNpc.apply(this, arguments);
    if (npc && (npc.id === 'kochstelle' || npc.id === 'lagerfeuer')) kochRender(npc);
    return r;
  };
}

// --- Reiter „Zutaten“ bei der Fischerin -------------------------------------------------------------------------
function kochLadenHtml(p) {
  return '<div class="shop shop-klein">' + KOCH_LADEN.map((id) => {
    const d = FANG[id];
    return `<div class="shop-item"><img class="shop-icon" src="${fangIconUrl(id)}" alt=""><strong>${d.name} <span class="price">${anDe(d.kauf)} Gold</span></strong>` +
      `<small>im Gepäck: <b>${anDe(fangN(p, id))}</b></small>` +
      `<div class="buy"><button class="mini-btn" type="button" data-kkauf="${id}" data-n="1" ${p.gold < d.kauf ? 'disabled' : ''}>1</button>` +
      `<button class="mini-btn" type="button" data-kkauf="${id}" data-n="10" ${p.gold < d.kauf * 10 ? 'disabled' : ''}>10</button></div></div>`;
  }).join('') + '</div><p class="hint">Nicht zu kaufen: Wildfleisch (von wilden Tieren), Frostminze (Monster im Frost) und Glutpfeffer (Monster am Feuer). Gekocht wird an der Kochstelle neben mir oder an einem Lagerfeuer.</p>';
}
function kochLadenBind(body, neu) {
  body.querySelectorAll('[data-kkauf]').forEach((b) => b.addEventListener('click', () => {
    const p = game.player;
    const d = FANG[b.dataset.kkauf];
    const n = Math.max(1, Math.min(99, Number(b.dataset.n) || 1));
    if (!d || !KOCH_LADEN.includes(d.id)) return;
    if (p.gold < d.kauf * n) { neu('Dafür reicht dein Gold nicht.'); return; }
    p.gold -= d.kauf * n;
    fangAdd(p, d.id, n);
    anTon('gold', { vol: 0.3 }, 'coin');
    if (typeof saveGame === 'function') saveGame();
    neu(`Gekauft · ${n} × ${d.name}`);
  }));
}

// --- Abschnitt im Charakterfenster (Seite „Angeln & Kochen“, angeln.js) --------------------------------------------
function kochSeiteHtml(p) {
  kochCss();
  const K = kochState(p);
  const st = kochStufe(K.xp);
  const von = kochXpFuer(st);
  const bis = kochXpFuer(st + 1);
  const pct = st >= KOCH_MAX_STUFE ? 100 : Math.max(0, Math.min(100, ((K.xp - von) / Math.max(1, bis - von)) * 100));
  const aktiv = K.mahlT > 0 ? KOCH_BY_ID[K.mahl] : null;
  const brennt = KOCH_FEUER.eigen ? Math.max(0, Math.ceil(KOCH_FEUER.eigen.until - game.time)) : 0;
  return `<section class="an-karte"><h3>Kochen</h3><p class="an-zeile"><span>Kochstufe</span> <b class="an-gross">${st}</b> <small>/ ${KOCH_MAX_STUFE}</small></p>` +
    `<div class="an-balken koch-balken"><i style="width:${pct.toFixed(1)}%"></i></div>` +
    `<p class="an-zeile"><span>Gerichte gekocht</span> <b>${anDe(K.n)}</b> <span>Rezepte</span> <b>${KOCH_REZEPTE.filter((R) => K.rez[R.id]).length} / ${KOCH_REZEPTE.length}</b></p>` +
    `<p class="an-zeile"><span>Mahlzeit</span> ${aktiv ? `<b>${aktiv.name}</b> <small>${kochWirkungText(aktiv.w)} · noch ${Math.ceil(K.mahlT / 60)} min</small>` : '<b>–</b>'}</p>` +
    `<p class="an-zeile"><button type="button" class="btn btn-primary" data-kfeuer ${brennt ? 'disabled' : ''}>${brennt ? `Lagerfeuer brennt noch ${Math.ceil(brennt / 60)} min` : 'Lagerfeuer entzünden'}</button></p>` +
    `<p class="hint-text">In Städten und Lagern kochst du an der Kochstelle neben der Fischerin, draußen an deinem Lagerfeuer. Lege „Lagerfeuer“ auf einen freien Platz der Leiste, dann geht es mit einem Tipp.</p></section>`;
}
function kochSeiteBind(root) {
  const b = root.querySelector('[data-kfeuer]');
  if (b) b.addEventListener('click', () => {
    if (kochFeuer()) {
      if (typeof ui !== 'undefined') ui.closePanels();
    } else if (typeof ui !== 'undefined' && typeof ui.renderCharPanel === 'function') ui.renderCharPanel();
  });
}

// --- Symbole der Zutaten und Gerichte ------------------------------------------------------------------------------
FANG_KUNST.kraeuter = (g) => {
  for (const [a, c] of [[-0.5, '#4a8a3a'], [-0.15, '#6ab04a'], [0.2, '#5a9a3a'], [0.5, '#7ac05a']]) {
    g.save(); g.translate(32, 44); g.rotate(a);
    g.strokeStyle = '#3a6a2a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -28); g.stroke();
    for (let k = 0; k < 3; k++) { anOval(g, -4, -10 - k * 7, 4, 2.2, c, 'rgba(20,40,10,0.6)', 0.8); anOval(g, 4, -13 - k * 7, 4, 2.2, c, 'rgba(20,40,10,0.6)', 0.8); }
    g.restore();
  }
  anPoly(g, [[27, 40], [37, 40], [38, 46], [26, 46]], '#c8a060', AN_UMRISS, 1);
};
FANG_KUNST.salz = (g) => {
  g.beginPath(); g.moveTo(18, 22); g.quadraticCurveTo(12, 50, 22, 54); g.lineTo(42, 54); g.quadraticCurveTo(52, 50, 46, 22); g.closePath();
  g.fillStyle = '#d8ccb0'; g.fill(); g.strokeStyle = AN_UMRISS; g.lineWidth = 1.3; g.stroke();
  anPoly(g, [[20, 20], [44, 20], [40, 15], [24, 15]], '#c0b090', AN_UMRISS, 1);
  g.strokeStyle = '#8a5a3a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(20, 22); g.lineTo(44, 22); g.stroke();
  for (const [x, y] of [[28, 12], [33, 10], [37, 13], [31, 15]]) anPoly(g, [[x, y - 2], [x + 2, y], [x, y + 2], [x - 2, y]], '#ffffff', 'rgba(120,140,160,0.6)', 0.6);
};
FANG_KUNST.brot = (g) => {
  anOval(g, 32, 36, 22, 13, '#d8a050', AN_UMRISS, 1.4);
  anOval(g, 32, 33, 19, 9, '#e8c070');
  for (const [x, y] of [[24, 32], [33, 29], [40, 34], [28, 38], [37, 39]]) anOval(g, x, y, 2.2, 1.4, '#a8682a');
};
FANG_KUNST.butter = (g) => {
  anOval(g, 32, 44, 22, 8, '#c8d8e8', AN_UMRISS, 1.2);
  anPoly(g, [[18, 30], [40, 26], [46, 32], [46, 42], [24, 46], [18, 40]], '#f8e070', AN_UMRISS, 1.3);
  anPoly(g, [[18, 30], [40, 26], [46, 32], [24, 36]], '#fff0a0');
};
FANG_KUNST.fleisch = (g) => {
  g.save(); g.translate(30, 34); g.rotate(-0.4);
  anOval(g, 0, 0, 17, 12, '#c8504a', AN_UMRISS, 1.4);
  anOval(g, -2, -2, 12, 7, '#e07a6a');
  g.restore();
  anPoly(g, [[40, 26], [52, 16], [55, 18], [44, 30]], '#f0e8d8', AN_UMRISS, 1.1);
  anOval(g, 54, 15, 3, 3, '#f0e8d8', AN_UMRISS, 1);
};
FANG_KUNST.minze = (g) => {
  for (const [x, y, a] of [[24, 34, -0.6], [34, 28, 0.1], [40, 38, 0.7]]) {
    g.save(); g.translate(x, y); g.rotate(a);
    anOval(g, 0, 0, 7, 12, '#5ac8b0', 'rgba(20,60,50,0.7)', 1);
    g.strokeStyle = '#2a8a78'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(0, -11); g.lineTo(0, 11); g.stroke();
    g.restore();
  }
  for (const [x, y] of [[20, 22], [45, 24], [30, 46], [48, 44]]) anOval(g, x, y, 1.4, 1.4, '#ffffff');
};
FANG_KUNST.pfeffer = (g) => {
  for (const [x, y, a, c] of [[26, 34, -0.5, '#e0401a'], [38, 34, 0.4, '#ff8a2a']]) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.moveTo(0, -14); g.quadraticCurveTo(8, 0, 1, 16); g.quadraticCurveTo(-7, 0, 0, -14); g.fillStyle = c; g.fill(); g.strokeStyle = AN_UMRISS; g.lineWidth = 1.2; g.stroke();
    anPoly(g, [[-3, -14], [3, -14], [1, -19]], '#4a8a2a', AN_UMRISS, 0.8);
    g.restore();
  }
};
// Gerichte: Farben [Hauptfarbe, Beilage/Soße]
FANG_KUNST.spiess = (g, d) => {
  g.strokeStyle = '#8a6a3a'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(8, 52); g.lineTo(56, 12); g.stroke();
  g.save(); g.translate(32, 32); g.rotate(-0.7);
  anOval(g, 0, 0, 16, 7, d.c[0], AN_UMRISS, 1.3);
  anPoly(g, [[-15, 0], [-23, -6], [-23, 6]], d.c[0], AN_UMRISS, 1.1);
  g.strokeStyle = 'rgba(40,20,10,0.6)'; g.lineWidth = 1; for (const x of [-7, -1, 5]) { g.beginPath(); g.moveTo(x, -5); g.lineTo(x + 3, 5); g.stroke(); }
  anOval(g, 10, -2, 1.5, 1.5, '#f4f0e0');
  g.restore();
  for (const [x, y] of [[20, 18], [44, 46]]) anOval(g, x, y, 2, 2, d.c[1]);
};
FANG_KUNST.teller = (g, d) => {
  anOval(g, 32, 38, 26, 14, '#e8e4dc', AN_UMRISS, 1.3);
  anOval(g, 32, 37, 20, 10, '#f8f4ec');
  anOval(g, 30, 36, 14, 6, d.c[0], AN_UMRISS, 1.1);
  anPoly(g, [[16, 36], [11, 31], [11, 41]], d.c[0], AN_UMRISS, 1);
  for (const [x, y] of [[40, 32], [44, 37], [38, 41], [26, 41]]) anOval(g, x, y, 2.4, 1.6, d.c[1]);
};
FANG_KUNST.schale = (g, d) => {
  g.beginPath(); g.moveTo(10, 30); g.quadraticCurveTo(12, 56, 32, 56); g.quadraticCurveTo(52, 56, 54, 30); g.closePath();
  g.fillStyle = '#8a5a3a'; g.fill(); g.strokeStyle = AN_UMRISS; g.lineWidth = 1.3; g.stroke();
  anOval(g, 32, 30, 22, 7, d.c[0], AN_UMRISS, 1.2);
  for (const [x, y] of [[24, 29], [36, 31], [30, 32], [41, 28]]) anOval(g, x, y, 2.6, 1.6, d.c[1]);
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.4;
  for (const x of [26, 34, 41]) { g.beginPath(); g.moveTo(x, 22); g.quadraticCurveTo(x - 3, 16, x, 11); g.stroke(); }
};
FANG_KUNST.brotfisch = (g, d) => {
  anOval(g, 32, 38, 24, 12, d.c[1], AN_UMRISS, 1.3);
  anOval(g, 32, 33, 17, 5.5, d.c[0], AN_UMRISS, 1);
  anPoly(g, [[15, 33], [9, 28], [9, 38]], d.c[0], AN_UMRISS, 1);
  for (const [x, y] of [[26, 31], [36, 30]]) anOval(g, x, y, 2, 1.2, '#5a3a1a');
  anOval(g, 32, 44, 18, 5, '#c89050');
};
FANG_KUNST.topf = (g, d) => {
  anPoly(g, [[12, 26], [52, 26], [48, 52], [16, 52]], '#3a3a42', AN_UMRISS, 1.4);
  anOval(g, 32, 26, 20, 6, d.c[0], AN_UMRISS, 1.2);
  for (const [x, y] of [[25, 25], [36, 27], [40, 24]]) anOval(g, x, y, 3, 1.8, d.c[1]);
  anPoly(g, [[8, 28], [12, 28], [12, 32], [8, 32]], '#2a2a30');
  anPoly(g, [[52, 28], [56, 28], [56, 32], [52, 32]], '#2a2a30');
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.4;
  for (const x of [26, 36]) { g.beginPath(); g.moveTo(x, 19); g.quadraticCurveTo(x - 3, 13, x, 8); g.stroke(); }
};
FANG_KUNST.platte = (g, d) => {
  anOval(g, 32, 40, 29, 14, '#c8a060', AN_UMRISS, 1.3);
  anOval(g, 32, 39, 25, 11, '#e8c888');
  anOval(g, 24, 37, 11, 5, d.c[0], AN_UMRISS, 1);
  anPoly(g, [[13, 37], [8, 33], [8, 41]], d.c[0], AN_UMRISS, 1);
  anOval(g, 42, 36, 7, 5, '#c8504a', AN_UMRISS, 1);
  for (const [x, y] of [[36, 44], [44, 44], [30, 45], [48, 39]]) anOval(g, x, y, 2.2, 1.6, d.c[1]);
};

// --- 2D: Kochstelle (steinerner Herd mit Topf) und Lagerfeuer --------------------------------------------------------
function kochFlammen2d(ctx, x, y, s, t, k = 3) {
  ctx.save();
  for (let i = 0; i < k; i++) {
    const ph = t * 9 + i * 2.1;
    const h = (9 + 3.5 * Math.sin(ph) + 2 * Math.sin(ph * 1.7)) * s;
    const w = (4.2 - i * 0.6) * s;
    const ox = (i - (k - 1) / 2) * 3.4 * s;
    ctx.fillStyle = '#ff6a1a';
    ctx.beginPath(); ctx.moveTo(x + ox - w, y); ctx.quadraticCurveTo(x + ox - w * 0.6, y - h * 0.6, x + ox + Math.sin(ph) * 1.2, y - h); ctx.quadraticCurveTo(x + ox + w * 0.6, y - h * 0.6, x + ox + w, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd36a';
    ctx.beginPath(); ctx.moveTo(x + ox - w * 0.5, y); ctx.quadraticCurveTo(x + ox - w * 0.3, y - h * 0.4, x + ox + Math.sin(ph) * 0.8, y - h * 0.62); ctx.quadraticCurveTo(x + ox + w * 0.3, y - h * 0.4, x + ox + w * 0.5, y); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
const KOCH_HERD_BOUNDS = { x: -24, y: -44, w: 48, h: 50 };
function kochHerdArt(g) {
  // Sockel aus Feldsteinen, Feuerloch vorn, Steinplatte, Kamin hinten, eiserner Topf obenauf
  anPoly(g, [[-20, 2], [20, 2], [19, -18], [-19, -18]], '#8a8478', AN_UMRISS, 1.4);
  for (const [x, y, w] of [[-16, -6, 9], [-5, -12, 11], [8, -6, 10], [-13, -14, 7], [12, -14, 8]]) anOval(g, x, y, w / 2, 3, '#9a9488', 'rgba(40,30,20,0.35)', 0.6);
  anPoly(g, [[-9, 2], [9, 2], [9, -8], [6, -12], [-6, -12], [-9, -8]], '#1e1410', AN_UMRISS, 1);
  anPoly(g, [[-22, -18], [22, -18], [21, -22], [-21, -22]], '#6e685e', AN_UMRISS, 1.2);
  anPoly(g, [[11, -22], [18, -22], [18, -42], [11, -42]], '#7a746a', AN_UMRISS, 1.2);
  anPoly(g, [[10, -42], [19, -42], [19, -44], [10, -44]], '#5a544c');
  g.beginPath(); g.moveTo(-14, -22); g.quadraticCurveTo(-15, -33, -4, -34); g.quadraticCurveTo(7, -33, 6, -22); g.closePath();
  g.fillStyle = '#2e2c32'; g.fill(); g.strokeStyle = AN_UMRISS; g.lineWidth = 1.2; g.stroke();
  anOval(g, -4, -33, 10, 2.6, '#3e3a44', AN_UMRISS, 1);
  anOval(g, -4, -33, 8, 1.8, '#c8a070');
  g.strokeStyle = '#8a6a3a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-1, -33); g.lineTo(5, -41); g.stroke();
}
const KOCH_FEUER_BOUNDS = { x: -20, y: -26, w: 40, h: 32 };
function kochFeuerArt(g) {
  // ein paar Feldsteine, gekreuzte Scheite, ein Spieß mit Fisch
  for (const [x, y, rx] of [[-13, -1, 4.5], [12, -1, 4], [-7, 3, 4], [6, 3.5, 4.5], [0, -5, 3.5]]) anOval(g, x, y, rx, 2.8, '#8a8478', AN_UMRISS, 1);
  g.strokeStyle = '#5a3a22'; g.lineWidth = 3.2;
  g.beginPath(); g.moveTo(-10, 2); g.lineTo(10, -4); g.moveTo(-10, -4); g.lineTo(10, 2); g.stroke();
  g.strokeStyle = '#7a5a34'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(-15, 2); g.lineTo(-15, -20); g.moveTo(15, 2); g.lineTo(15, -20); g.moveTo(-17, -18); g.lineTo(17, -18); g.stroke();
  anOval(g, 0, -18, 7, 3, '#c8803a', AN_UMRISS, 0.9);
  anPoly(g, [[-7, -18], [-11, -21], [-11, -15]], '#c8803a', AN_UMRISS, 0.8);
}
function kochFeuer2d(ctx, n) {
  const herd = n.id === 'kochstelle';
  const fy = feetY(n);
  const t = game.time + (n.x % 7);
  if (typeof drawShadow === 'function') drawShadow(ctx, n.x, fy, herd ? 18 : 14);
  const sp = getSprite(herd ? 'kochherd' : 'kochfeuer', herd ? KOCH_HERD_BOUNDS : KOCH_FEUER_BOUNDS, herd ? kochHerdArt : kochFeuerArt);
  const b = sp.bounds;
  ctx.drawImage(sp.img, n.x + b.x, fy + b.y, b.w, b.h);
  if (typeof glow === 'function') glow(ctx, n.x, fy - (herd ? 5 : 3), herd ? 16 : 22, '#ff9a3a', 0.35 + 0.08 * Math.sin(t * 7));
  kochFlammen2d(ctx, n.x, fy - (herd ? 1 : -1), herd ? 0.75 : 1, t, herd ? 2 : 3);
  // Funken und beim Herd ein wenig Dampf aus dem Topf (nur in 2D, sparsam)
  const low = typeof opts !== 'undefined' && opts.graphics === 'niedrig';
  if (!low && typeof particles === 'function' && !(n.__kochFxAt > game.time - 0.35)) {
    n.__kochFxAt = game.time;
    particles(n.x + (Math.random() - 0.5) * 6, fy - 8, { count: 1, color: ['#ffd36a', '#ff8a2a'], angle: -Math.PI / 2, spread: 0.4, speed: [15, 35], life: [0.5, 0.9], size: [0.9, 1.5], drag: 1.5, shape: 'ember' });
    if (herd) particles(n.x - 4, fy - 36, { count: 1, color: ['rgba(240,240,240,0.55)'], angle: -Math.PI / 2, spread: 0.3, speed: [8, 18], life: [0.8, 1.3], size: [2, 3.5], drag: 0.6, glow: false });
  }
}
if (typeof drawNpc === 'function') {
  const _kochDrawNpc = drawNpc;
  // eslint-disable-next-line no-global-assign
  drawNpc = function (ctx, n) {
    if (n && (n.id === 'kochstelle' || n.id === 'lagerfeuer')) {
      try { kochFeuer2d(ctx, n); } catch (err) { anFehler(err); }
      return;
    }
    return _kochDrawNpc.apply(this, arguments);
  };
}

// --- 3D: Herd und Lagerfeuer als feste Figuren, Flammen, Rauch und Dampf in FX3_HOOKS --------------------------------
function kochHerdBuild3(b) {
  const A = adder(b, null);
  const rig = rigOf([[[0, 0, 0], -1]]);
  const stein = '#8a8478';
  A(wbox(1.25, 0.6, 0.8, 0.1), stein, { bone: 0, p: [0, 0.3, 0], shade: 0.3, top: '#9a9488', topK: 0.4 });
  A(wbox(1.35, 0.1, 0.9, 0.04), '#6e685e', { bone: 0, p: [0, 0.64, 0], top: '#7e786e', topK: 0.4 });
  A(wbox(0.5, 0.36, 0.06, 0.03), '#1e1410', { bone: 0, p: [0, 0.22, 0.4], noShadow: true });
  A(wbox(0.4, 0.05, 0.05, 0.02), '#ff7a2a', { bone: 0, p: [0, 0.08, 0.41], mat: 'glow', noShadow: true });
  A(cyl3(0.13, 0.15, 0.85, 8), '#7a746a', { bone: 0, p: [0.42, 1.08, -0.26] });
  A(cyl3(0.16, 0.16, 0.06, 8), '#5a544c', { bone: 0, p: [0.42, 1.52, -0.26] });
  // Topf mit Henkeln, Deckel halb offen, Holzlöffel
  A(sphere3(0.26, 12, 9), '#2e2c32', { bone: 0, p: [-0.18, 0.86, 0.05], s: [1, 0.78, 1], shine: 0.6 });
  A(torus3(0.25, 0.025, Math.PI * 2, 4, 14), '#3e3a44', { bone: 0, p: [-0.18, 1.04, 0.05], r: [Math.PI / 2, 0, 0], shine: 0.6 });
  A(cyl3(0.235, 0.235, 0.02, 14), '#c8a070', { bone: 0, p: [-0.18, 1.03, 0.05] });
  A(limb3(0.4, 0.015, 0.02, 5), '#8a6a3a', { bone: 0, p: [-0.1, 1.32, 0.02], r: [0, 0, -0.45] });
  for (const sx of [-1, 1]) A(torus3(0.05, 0.012, Math.PI * 2, 3, 8), '#3e3a44', { bone: 0, p: [-0.18 + sx * 0.27, 0.95, 0.05], r: [0, Math.PI / 2, 0] });
  return { rig, height: 1.6, family: 'kochstelle', blob: 0.8, scale: 1 };
}
function kochFeuerBuild3(b) {
  const A = adder(b, null);
  const rig = rigOf([[[0, 0, 0], -1]]);
  for (const [x, z, s] of [[-0.42, -0.05, 0.16], [0.4, 0.02, 0.14], [-0.22, 0.32, 0.13], [0.2, 0.34, 0.15], [0.02, -0.34, 0.12], [-0.36, -0.3, 0.1]]) A(sphere3(1, 7, 5), '#8a8478', { bone: 0, p: [x, s * 0.45, z], s: [s, s * 0.7, s * 0.9], shade: 0.3 });
  // drei gekreuzte Scheite (je von a nach b)
  for (const [a, b, c] of [[[-0.34, 0.06, -0.2], [0.34, 0.12, 0.2], '#5a3a22'], [[-0.34, 0.12, 0.2], [0.34, 0.06, -0.2], '#4a2e1a'], [[0, 0.1, -0.36], [0.02, 0.07, 0.36], '#6a4a2a']]) limbBetween(A, a, b, 0.05, 0.055, c, { bone: 0, seg: 6 });
  A(sphere3(0.14, 8, 6), '#ff7a2a', { bone: 0, p: [0, 0.06, 0], s: [1.6, 0.35, 1.6], mat: 'glow', noShadow: true });
  // Spieß mit Fisch
  for (const sx of [-1, 1]) A(limb3(0.7, 0.018, 0.022, 5), '#7a5a34', { bone: 0, p: [sx * 0.48, 0.7, 0] });
  limbBetween(A, [-0.54, 0.64, 0], [0.54, 0.64, 0], 0.015, 0.015, '#7a5a34', { bone: 0, seg: 5 });
  A(sphere3(0.15, 9, 7), '#c8803a', { bone: 0, p: [0, 0.64, 0], s: [1, 0.45, 0.4] });
  A(horn3(0.12, 0.07, 6), '#c8803a', { bone: 0, p: [-0.15, 0.64, 0], r: [0, 0, Math.PI / 2], s: [1, 1, 0.5] });
  return { rig, height: 0.9, family: 'lagerfeuer', blob: 0.6, scale: 1 };
}
if (typeof syncNpc3 === 'function') {
  const _kochSyncNpc3 = syncNpc3;
  // eslint-disable-next-line no-global-assign
  syncNpc3 = function (n, dt) {
    if (n && (n.id === 'kochstelle' || n.id === 'lagerfeuer')) {
      const herd = n.id === 'kochstelle';
      const a = actorFor(entityKey(n), herd ? 'kochherd3' : 'kochfeuer3', herd ? kochHerdBuild3 : kochFeuerBuild3);
      if (!a) return;
      resetBones(a);
      placeActor(a, n, feetY(n));
      a.group.rotation.y = herd ? 0 : 0.4;
      a.group.scale.setScalar(a.model.scale);
      return;
    }
    return _kochSyncNpc3.apply(this, arguments);
  };
}
function kochFx3(h) {
  if (typeof V3 === 'undefined' || !V3.on || typeof npcsNear !== 'function' || typeof n3Fire !== 'function') return;
  const low = typeof n3low === 'function' && n3low();
  const t = game.time;
  for (const n of npcsNear()) {
    if (n.id !== 'kochstelle' && n.id !== 'lagerfeuer') continue;
    if (typeof v3InView === 'function' && !v3InView(n.x, n.y, 120)) continue;
    const herd = n.id === 'kochstelle';
    const x = n.x * U3;
    const z = feetY(n) * U3 + (herd ? 0.42 : 0);
    const y = herd ? 0.12 : 0.1;
    const k = herd ? 0.45 : 1;
    const flick = 1 + 0.12 * Math.sin(t * 11 + n.x);
    n3Fire(h, x, y + 0.22 * k * flick, z, 0.38 * k, 0.55 * k * flick, '#ff6a1a', 0.95);
    if (!low) n3Fire(h, x + 0.1 * k, y + 0.16 * k, z - 0.05, 0.24 * k, 0.36 * k * (2 - flick), '#ff8a2a', 0.85, 0.2);
    if (typeof n3Glow === 'function') n3Glow(h, x, y + 0.2 * k, z, 0.9 * k + 0.4, '#ff9a3a', 0.3);
    if (low || typeof n3Smoke !== 'function') continue;
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.45 + i / 3 + (n.x % 3) * 0.1) % 1;
      if (herd) n3Smoke(h, x - 0.18 + Math.sin(t + i) * 0.05, 1.1 + ph * 0.8, feetY(n) * U3 + 0.05, 0.2 + ph * 0.3, '#f0f0f0', 0.35 * (1 - ph));
      else n3Smoke(h, x + Math.sin(t * 0.8 + i * 2) * 0.12, 0.8 + ph * 1.4, z, 0.25 + ph * 0.45, '#5a5650', 0.3 * (1 - ph));
    }
  }
}
if (typeof FX3_HOOKS !== 'undefined') FX3_HOOKS.push({ parts: [], fn: kochFx3 });

// --- Erfolge und Ratgeber ---------------------------------------------------------------------------------------
const kochZahl = (p, k) => (p.koch && Number.isFinite(p.koch[k]) ? p.koch[k] : 0);
anErfolgeEintragen([
  { id: 'koch1', kat: 'Angeln & Kochen', name: 'Erstes Gericht', text: 'Koche ein Gericht', need: 1, val: (p) => kochZahl(p, 'n'), pts: 5 },
  { id: 'koch2', kat: 'Angeln & Kochen', name: 'Feldkoch', text: 'Koche {n} Gerichte', need: 100, val: (p) => kochZahl(p, 'n'), pts: 15 },
  { id: 'kochrezepte', kat: 'Angeln & Kochen', name: 'Feinschmecker', text: 'Koche jedes Rezept einmal', need: KOCH_REZEPTE.length, val: (p) => (p.koch && p.koch.rez ? KOCH_REZEPTE.filter((R) => p.koch.rez[R.id]).length : 0), pts: 25, titel: 'Feinschmecker' },
  { id: 'kochstufe100', kat: 'Angeln & Kochen', name: 'Küchenmeister', text: 'Erreiche Kochstufe {n}', need: 100, val: (p) => kochStufe(kochZahl(p, 'xp')), pts: 40, titel: 'Küchenmeister' },
  { id: 'lagerfeuer', kat: 'Angeln & Kochen', name: 'Am Lagerfeuer', text: 'Entzünde {n} Lagerfeuer', need: 10, val: (p) => kochZahl(p, 'feuer'), pts: 10 }
]);
if (typeof RATGEBER_WISSEN !== 'undefined') {
  RATGEBER_WISSEN.push(
    {
      c: 'angeln', p: 2, q: 'Wie koche ich?',
      a: 'Geh zu einer Kochstelle (in jeder Stadt und jedem Lager neben der Fischerin) oder entzünde draußen ein Lagerfeuer und drücke {k:interact} bzw. tippe auf „Kochen“. ' +
        'Jedes Rezept braucht Fisch und Zutaten. Mit jedem Gericht steigt deine Kochstufe, bessere Rezepte gibt es erst ab einer bestimmten Kochstufe.',
      k: 'kochen koch kochstelle herd lagerfeuer rezept rezepte gericht gerichte kochstufe'
    },
    {
      c: 'angeln', q: 'Was bringen Gerichte?',
      a: () => 'Ein gegessenes Gericht wirkt ' + Math.round(KOCH.dauer / 60) + ' Minuten Spielzeit – immer nur eines, ein neues ersetzt das alte. Die Wirkungen sind klein: ' +
        KOCH_REZEPTE.map((R) => `<b>${R.name}</b> (${kochWirkungText(R.w)})`).join(', ') + '. Essen kannst du im Inventar unter „Vorräte“ oder an der Kochstelle.',
      k: 'gericht essen buff mahlzeit wirkung regeneration erfahrung mana verteidigung leben minuten'
    },
    {
      c: 'angeln', q: 'Woher bekomme ich Zutaten?',
      a: 'Kräuterbund, Meersalz, Fladenbrot und Butter verkauft die Fischerin. Wildfleisch lassen wilde Tiere fallen (Wölfe, Keiler, Bären, Raubkatzen), Frostminze Monster im Frostgipfel und in Nachtfrost, Glutpfeffer Monster am Feuerberg, im Titanenkamm und im Aschewald.',
      k: 'zutaten zutat kraeuter meersalz salz fladenbrot brot butter wildfleisch fleisch frostminze minze glutpfeffer pfeffer'
    },
    {
      c: 'angeln', q: 'Wie mache ich ein Lagerfeuer?',
      a: () => 'Im Charakterfenster ({k:char}) unter „Angeln &amp; Kochen“: „Lagerfeuer entzünden“ – oder lege „Lagerfeuer“ auf einen freien Platz der Leiste. Es brennt ' + Math.round(KOCH.feuer / 60) + ' Minuten vor deiner Figur (nicht in Städten, dort steht eine Kochstelle). Mitspieler sehen es und dürfen daran mitkochen.',
      k: 'lagerfeuer feuer entzuenden machen draussen kochen wildnis'
    }
  );
}

// --- Stil -----------------------------------------------------------------------------------------------------------
function kochCss() {
  if (document.getElementById('kochCss')) return;
  const st = document.createElement('style');
  st.id = 'kochCss';
  st.textContent =
    '.koch{display:flex;flex-direction:column;gap:6px}.koch-kopf{display:flex;flex-wrap:wrap;gap:4px 7px;align-items:baseline;margin:0;font-size:13px}.koch-kopf span{opacity:.8}' +
    '.koch-balken i{background:linear-gradient(90deg,#c8602a,#ffd36a)!important}' +
    '.koch-aktiv{display:flex;flex-wrap:wrap;align-items:center;gap:4px 7px;margin:0;padding:5px 8px;border-radius:8px;background:rgba(255,200,90,.08);border:1px solid rgba(255,200,90,.3);font-size:13px}' +
    '.koch-aktiv img{width:28px;height:28px}.koch-aktiv small{opacity:.75}' +
    '.koch-liste{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:6px}' +
    '.koch-r{display:grid;grid-template-columns:44px 1fr;gap:4px 8px;padding:6px 8px;border-radius:8px;background:rgba(0,0,0,.25);border:1px solid rgba(201,162,74,.3)}' +
    '.koch-r.zu{opacity:.55}.koch-r img{width:44px;height:44px;grid-row:span 2}.koch-r-text{display:flex;flex-direction:column;gap:2px;min-width:0}' +
    '.koch-r-text b{font-size:14px}.koch-r-text small{font-size:12px;color:#d8cfbf}.koch-zut{display:flex;flex-wrap:wrap;gap:2px 8px;font-size:12px}' +
    '.koch-z{color:#ff9a8a}.koch-z.ok{color:#9fe7b4}.koch-z small{opacity:.75}.koch-r-knopf{grid-column:2;display:flex;flex-wrap:wrap;gap:4px}' +
    '.buff-ico.buff-mahl img{border-radius:50%}';
  document.head.appendChild(st);
}
