'use strict';
// Rissläufe (nach 15.82, docs/risslauf-stadtangriff.md): ein Dungeon auf Zeit ab Stufe 80, allein oder mit der Gruppe.
// - Zugang: die Rissmeisterin in Kazehana, Mondfall und den Lagern der Stufe-80-Karten (Kristallabgrund, Seelenhain,
//   Nebelküste, Himmelsterrassen). Ihr Fenster zeigt Schlüsselstufe, Bestwerte, Regeln der Woche und Belohnung.
// - Schlüsselstufe (p.riss.k): beginnt bei 1 und ist nach oben offen. Schafft man den Riss in der Zeit, steigt sie auf
//   die gelaufene Stufe + 1 (mit mehr als einem Drittel Restzeit + 2); zu spät geschafft, verlassen oder abgebrochen
//   (auch durch Neuladen), sobald die Uhr lief: sie sinkt um 1 – nur für den, der den Riss geöffnet hat, und nur auf
//   seiner eigenen Stufe (nie unter 1). Wählen darf man jede Stufe bis zur eigenen (darunter: Übung ohne Abzug).
// - Jede Stufe: Monster mit mehr Leben (× 1,08 je Stufe) und mehr Schaden (× 1,045 je Stufe).
// - Aufbau: jeder Lauf würfelt einen neuen Grundriss (Startwert vom Host, an alle Mitspieler geschickt) mit derselben
//   Technik wie die Dungeons (welt.js: Raumformen, gewundene Gänge, Säulen, Becken, Schmuck aus dungeonProps): ein Weg
//   aus 7–9 Räumen in einem Raster 4 × 4, ein bis zwei Seitenkammern, manchmal ein zweiter Weg. Fünf Themen (Kristall,
//   Leere, Glut, Frost, Tiefe) mit eigenen Wänden, Böden, Monstern und Rissherrn. Gebaut wird in einem von zwölf Feldern
//   im freien Fels östlich der Welt (wie Turm und Arenen außerhalb aller Karten, also ohne offenen Kampf zwischen
//   Spielern). Bei jedem Bau bekommt das Feld eine neue Kennung (regionRect3, mapAreaAt): 2D, 3D und Karte bauen neu.
// - Ablauf: Räume erwachen, sobald jemand in die Nähe kommt (so zählt die Gruppe, die gerade da ist). Jedes Monster
//   gibt Rissenergie (Elite viermal so viel); bei 80 % der Energie aller Räume erscheint der Rissherr im letzten Raum.
//   Fällt er, ist der Riss geschlossen. Jeder Tod kostet 10 Sekunden; nach 5 Sekunden steht man am Anfang wieder auf.
// - Regeln der Woche: aus der Kalenderwoche (ISO, Weltzeit) berechnet, für alle gleich, je Woche 2 oder 3 aus acht
//   (RL_REGELN). Was die eigene Figur trifft (Bersten, Giftspur, Rissblitze), rechnet jedes Gerät selbst; was die
//   Monster betrifft (Raserei, Schildbann, Elitenflut, Schwarm, Zeitdruck), rechnet der Host.
// - Mehrspieler wie Turm und Prüfungsarena: Die Felder führt, wer die Monster führt (allein man selbst, im Kanal der
//   Host, auch der Welt-Wächter). Nachrichten über onSocial (k: 'rl…'); Belohnung, Schlüsselstufe und Bestwerte rechnet
//   jedes Gerät für die eigene Figur.
// - Bestenliste: Die Datenbank-Regeln (docs/firebase-regeln.json, rangliste: "$other": false) erlauben keine neuen
//   Felder; deshalb persönliche Bestwerte (Charakterfenster, Ergebnisfenster) und in der Bestenliste ein Reiter
//   „Rissläufe“ mit den Spielern im eigenen Kanal (Feld rl im Spielerzustand) und den eigenen Charakteren.
// Keine Bodenringe, Runen oder Sterne als Effekt (Warnflächen ja).

const RISSLAUF = {
  id: 'risslauf', name: 'Risslauf', npc: 'rissmeister',
  minLevel: 80, level: 80, maxPlayers: 5,
  // Felder (Kacheln): zwei Reihen zu sechs im freien Fels östlich der Welt, unter den Hallen der Prüfungsarena (deren
  // untere Reihe endet bei DUNGEON_H + 690); jedes Feld 96 × 96 Kacheln im Abstand von 104
  slots: 12, cols: 6, size: 96, pitch: 104, x0: WORLD_W + 14, y0: DUNGEON_H + 712,
  lage: 1,              // Lage und Bauplan der Felder: Host und Mitspieler müssen dieselben haben
  grid: 4, cell: 22,    // Raster der Räume: 4 × 4 Felder zu 22 Kacheln (88 von 96 Kacheln, 4 Kacheln Rand)
  path: [7, 9],         // Räume auf dem Weg vom Start zum Rissherrn (beide mitgezählt)
  time: 600,            // Zeit in Sekunden (Regel „Zeitdruck“: × rush)
  rush: 0.75,
  fast: 1 / 3,          // so viel Restzeit (Anteil) für +2 statt +1
  deathTime: 10,        // so viele Sekunden kostet jeder Tod
  respawn: 5,           // so lange liegt man, dann steht man am Anfang des Risses wieder auf
  countdown: 5,         // Sekunden zwischen Ankunft und Start der Uhr
  inviteWait: 25,       // so lange wartet der Riss auf eingeladene Gruppenmitglieder
  ownerWait: 40,        // so lange wartet ein neuer Riss auf seinen Eigentümer
  absentMax: 12,        // so lange darf ein Teilnehmer ohne Verbindung oder außerhalb des Risses sein
  closeAfter: 90,       // so lange bleibt ein geschlossener Riss offen (Rückweg), dann bringt er alle hinaus
  hostLost: 15,         // so lange ohne Nachricht vom Host: der Lauf ist verloren (ohne Strafe)
  need: 0.8,            // Anteil der Rissenergie aller Räume, bis der Rissherr erscheint
  wake: 14,             // Räume erwachen, sobald jemand so nah (Kacheln) an ihren Rand kommt
  // Stärke je Schlüsselstufe L: Leben × base · hpUp^(L−1), Schaden × base · atkUp^(L−1)
  base: 0.9, hpUp: 1.08, atkUp: 1.045,
  // je weiterem Spieler: Zahl der Monster, ihr Leben und Schaden, Leben des Rissherrn
  perN: 0.35, perHp: 0.25, perAtk: 0.04, perBoss: 0.75,
  pack: [3, 5], elite: 0.35, eliteHp: 3.2, eliteAtk: 1.25, elitePts: 4,
  bossHp: 26,           // Leben des Rissherrn: so viele gewöhnliche Monster der Stufe 80
  bossAtk: 0.75,        // sein Schaden: Anteil am Angriff seiner Vorlage (Wächter der Instanzen sind für Gruppen gebaut)
  escort: 3,            // Gefolge, das mit ihm erscheint
  // Belohnung nach Schlüsselstufe L (nur bei Abschluss): Gold a + b·L, Splitter a + b·L (höchstens c), EP a + b·L,
  // Ätherkerne ab kernAb, alle kernJe Stufen einer mehr (höchstens kernMax), Juwel mit Chance a + b·L (höchstens c),
  // ab juwel2Ab auch Stufe II möglich; zu spät geschafft: × spaet (keine Juwelen); Regel „Zeitdruck“: × eile
  lohn: { gold: [12000, 2500], splitter: [6, 2, 80], xp: [50000, 10000], kernAb: 4, kernJe: 6, kernMax: 4, juwel: [0.02, 0.01, 0.25], juwel2Ab: 20, spaet: 0.5, eile: 1.3 },
  // Regeln: Schaden als Anteil am eigenen Höchstleben (a + b·L, höchstens c), Radius in Pixeln, Zeiten in Sekunden
  bersten: { r: 78, delay: 1.3, pct: [0.12, 0.004, 0.35] },
  gift: { r: 56, dur: 6, every: 0.5, pct: 0.025 },
  blitz: { r: 60, delay: 1.4, every: [7, 10], pct: [0.13, 0.004, 0.35] },
  wut: { at: 0.35, atk: 1.4 },
  schild: { at: [0.66, 0.33], adds: 3 },
  schwarm: { n: 1.4, hp: 0.75 },
  color: '#b48cff'
};
if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('riss')) SAVE_FIELDS.push('riss');

// Spielstand p.riss = { k: Schlüsselstufe, best: höchste in der Zeit geschaffte Stufe, bestT: Zeit dabei (s),
//   wk: Kalenderwoche, wkBest, wkT: Bestwert dieser Woche, runs, wins, hist: letzte Läufe [Stufe, Ergebnis, Zeit, Datum]
//   (Ergebnis 2 in der Zeit, 1 zu spät, 0 abgebrochen), ret: Rückkehrpunkt, open: laufender Lauf { id, lv, own, at } }
function rlState(p) {
  p = p || game.player;
  if (!p.riss || typeof p.riss !== 'object') p.riss = {};
  const r = p.riss;
  r.k = Math.max(1, r.k | 0);
  r.best = Math.max(0, r.best | 0);
  r.runs = Math.max(0, r.runs | 0);
  r.wins = Math.max(0, r.wins | 0);
  if (!Array.isArray(r.hist)) r.hist = [];
  const W = rlWeek().id;
  if (r.wk !== W) { r.wk = W; r.wkBest = 0; r.wkT = 0; }
  return r;
}
const rlFmt = (n) => Math.round(n).toLocaleString('de-DE');
const rlClock = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// --- Regeln der Woche ----------------------------------------------------------------------------------------------
const RL_REGELN = {
  berstend: { name: 'Berstende Leiber', text: 'Besiegte Monster platzen nach einem Augenblick – raus aus der roten Fläche!', farbe: '#ff6a4a' },
  rasend: { name: 'Raserei', text: 'Angeschlagene Monster (unter 35 % Leben) werden wütend und schlagen viel härter zu.', farbe: '#ff3a3a' },
  schild: { name: 'Schildbann', text: 'Der Rissherr hüllt sich bei zwei Dritteln und einem Drittel seines Lebens in einen Schild und ruft drei Schildwächter. Erst wenn sie fallen, ist er wieder verwundbar.', farbe: '#9fd8ff' },
  zeitdruck: { name: 'Zeitdruck', text: 'Ein Viertel weniger Zeit – dafür 30 % mehr Beute.', farbe: '#ffd36a' },
  elitenflut: { name: 'Elitenflut', text: 'Doppelt so viele Elite-Monster.', farbe: '#ffb04a' },
  blitze: { name: 'Rissblitze', text: 'Immer wieder schlagen Blitze aus dem Riss ein – achtet auf die Warnflächen unter euch.', farbe: '#cfe8ff' },
  giftspur: { name: 'Giftspur', text: 'Besiegte Monster hinterlassen eine Giftlache, die einige Sekunden brennt.', farbe: '#8fe36a' },
  schwarm: { name: 'Schwarm', text: 'Viel mehr Monster, jedes etwas schwächer.', farbe: '#c8a8ff' }
};
const RL_REGEL_IDS = Object.keys(RL_REGELN);
const RL_NICHT_ZUSAMMEN = [['berstend', 'giftspur'], ['schwarm', 'elitenflut']];
// Kalenderwoche nach ISO (Montag bis Sonntag, Weltzeit): { y, w, id: Jahr · 100 + Woche }
function rlWeek(t = Date.now()) {
  const d = new Date(t);
  const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = u.getUTCDay() || 7;
  u.setUTCDate(u.getUTCDate() + 4 - day);
  const y = u.getUTCFullYear();
  const w = Math.ceil(((u - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return { y, w, id: y * 100 + w };
}
// nächster Montag 0 Uhr (Weltzeit)
function rlWeekEnd(t = Date.now()) {
  const d = new Date(t);
  const day = d.getUTCDay() || 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 8 - day);
}
// zwei oder drei Regeln, aus der Nummer der Woche gewürfelt (für alle gleich)
const RL_WEEK_CACHE = new Map();
function rlRegelnDerWoche(id = rlWeek().id) {
  if (RL_WEEK_CACHE.has(id)) return RL_WEEK_CACHE.get(id);
  const rng = mulberry32(Math.imul(id, 2654435761) >>> 0);
  const n = rng() < 0.5 ? 2 : 3;
  const pool = RL_REGEL_IDS.slice();
  const out = [];
  while (out.length < n && pool.length) {
    const k = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    if (RL_NICHT_ZUSAMMEN.some(([a, b]) => (a === k && out.includes(b)) || (b === k && out.includes(a)))) continue;
    out.push(k);
  }
  RL_WEEK_CACHE.set(id, out);
  return out;
}
const rlHat = (rules, id) => Array.isArray(rules) && rules.includes(id);

// --- Themen, Gebiete und Gegner ------------------------------------------------------------------------------------
// je Thema: Boden (dazu Flecken aus alt), Becken (liquid), Höhle oder Halle, Schmuck, Wände, Portalfarbe, Stimmung,
// Monster der Räume (gewöhnliche Arten, im Riss auf Stufe 80) und der Rissherr (Fähigkeiten und Gestalt von boss)
const RL_THEMEN = {
  kristall: {
    name: 'Kristallriss', ground: 'KRISTALL', alt: 'CAVE', liquid: 'ABGRUND', cave: true, deco: ['CRYSTAL', 'PEBBLE', 'CRYSTAL'],
    wall: { top: '#6a5aa8', face: '#1c1438', line: '#d8c0ff' }, portal: '#c8a0ff', ambient: { kind: 'shards', tint: [70, 50, 140, 0.14] },
    mood3: { sky: '#2a2240', sun: '#e8dcff', sunI: 0.88, hemi: '#d0c8f0', ground: '#4a3a6a', hemiI: 0.78, near: 20, far: 46 },
    mobs: ['i_spiegelgolem', 'i_glasspinne', 'i_frostseele', 'kristallgolem', 'splitterspinne'], boss: 'brakkar',
    herr: 'Vexor, Herr des Kristallrisses', titel: 'Er zerspringt und setzt sich neu zusammen'
  },
  leere: {
    name: 'Leerenriss', ground: 'FLAGSTONE', alt: 'KRISTALL', liquid: 'ABGRUND', cave: false, deco: ['BONES', 'PEBBLE'],
    wall: { top: '#2c2648', face: '#0a0816', line: '#b48cff' }, portal: '#9a7aff', ambient: { kind: 'wisps', tint: [40, 20, 90, 0.16] },
    mood3: { sky: '#1e1830', sun: '#e0d4ff', sunI: 0.85, hemi: '#c8c0e8', ground: '#3a3050', hemiI: 0.76, near: 20, far: 46 },
    mobs: ['i_leerenwache', 'i_schattenjaeger', 'i_leerenwyrmling', 'leerenwolf', 'sternenschemen'], boss: 'morvaine',
    herr: 'Ombrath, Rachen der Leere', titel: 'Wer ihm zu nahe kommt, wird verschlungen'
  },
  glut: {
    name: 'Glutriss', ground: 'BASALT', alt: 'ASH', liquid: 'LAVA', cave: true, deco: ['CRACK', 'BONES', 'CRACK'],
    wall: { top: '#3a2c30', face: '#140c0e', line: '#ff7a2a' }, portal: '#ff7a3a', ambient: { kind: 'embers', tint: [110, 34, 12, 0.1] },
    mood3: { sky: '#2e1814', sun: '#ffd0a8', sunI: 0.86, hemi: '#e8c8b8', ground: '#4a2a20', hemiI: 0.74, near: 20, far: 46 },
    mobs: ['i_magmagolem', 'i_glutkatze', 'i_feuerimp', 'i_aschedaemon', 'i_brut'], boss: 'ignaroth',
    herr: 'Skarnoth, Glutherz des Risses', titel: 'Sein Herz brennt heißer als jede Esse'
  },
  frost: {
    name: 'Frostriss', ground: 'SNOW', alt: 'ICE', liquid: 'WATER', cave: true, deco: ['DRIFT', 'CRYSTAL', 'DRIFT'],
    wall: { top: '#8a9ac8', face: '#202848', line: '#e8f4ff' }, portal: '#9fe8ff', ambient: { kind: 'snow', tint: [180, 210, 255, 0.08] },
    mood3: { sky: '#3a4a64', sun: '#f0f6ff', sunI: 0.9, hemi: '#e0ecff', ground: '#6a7a98', hemiI: 0.8, near: 20, far: 46 },
    mobs: ['i_gletscherwolf', 'i_frostgolem', 'i_eisgeist', 'i_firnyeti', 'i_polarlicht'], boss: 'hrimfang',
    herr: 'Isvara, Herrin des Frostrisses', titel: 'Ihr Atem lässt den Riss gefrieren'
  },
  tiefe: {
    name: 'Tiefenriss', ground: 'GROTTENSAND', alt: 'CAVE', liquid: 'WATER', cave: true, deco: ['PEBBLE', 'MUSHROOM', 'PEBBLE'],
    wall: { top: '#2e5a5a', face: '#0a1e22', line: '#5fe8d8' }, portal: '#5fe8d8', ambient: { kind: 'blasen', tint: [20, 90, 100, 0.12] },
    mood3: { sky: '#163038', sun: '#d8fff8', sunI: 0.86, hemi: '#c0e8e4', ground: '#2a4a4a', hemiI: 0.78, near: 20, far: 46 },
    mobs: ['i_krabbenkrieger', 'i_muschelwaechter', 'i_tiefseeschlange', 'i_matrose', 'i_rankenkrake'], boss: 'tharos',
    herr: 'Thalassor, Wächter der Tiefe', titel: 'Aus dem Riss steigt das Meer'
  }
};
const RL_THEMA_IDS = Object.keys(RL_THEMEN);
// Kopie einer Monsterart mit eigenem Namen: Aussehen in 2D und 3D (Bild, Färbung, Bossmodell) von der Vorlage
function rlCloneType(id, base, extra) {
  const b = MONSTER_TYPES[base];
  if (!b) return false;
  MONSTER_TYPES[id] = Object.assign({}, b, { look: b.look || base }, extra);
  if (typeof MONSTER_ART !== 'undefined' && MONSTER_ART[base] && !MONSTER_ART[id]) MONSTER_ART[id] = MONSTER_ART[base];
  if (typeof MON3_LOOK !== 'undefined' && MON3_LOOK[base]) MON3_LOOK[id] = Object.assign({}, MON3_LOOK[base]);
  if (typeof BOSS3 !== 'undefined' && BOSS3[base]) BOSS3[id] = BOSS3[base];
  if (typeof MONSTER_KIND_IDS !== 'undefined' && MONSTER_KIND_IDS[base]) MONSTER_KIND_IDS[id] = MONSTER_KIND_IDS[base];
  return true;
}
for (const [tid, T] of Object.entries(RL_THEMEN)) {
  T.id = tid;
  T.mobs = T.mobs.filter((id) => MONSTER_TYPES[id]);
  if (!T.mobs.length) T.mobs = ['kristallgolem'];
  // Gebiet je Thema: Name oben in der Ecke, Stimmung, Wandfarbe (außerhalb aller Karten, kein offener Kampf)
  const z = { id: 'riss_' + tid, name: T.name, levels: 'Risslauf · ab Stufe 80', ground: T.ground, ambient: T.ambient, wallLook: { wall: T.wall, id: 'riss_' + tid }, riss: true };
  ZONES.push(z);
  T.zone = z;
  T.zi = ZONES.length - 1;
  if (typeof MOOD3 !== 'undefined') MOOD3[z.id] = T.mood3;
  if (typeof MON3_ZONE_THEME !== 'undefined') MON3_ZONE_THEME[z.id] = tid === 'glut' ? 'fire' : tid === 'frost' ? 'frost' : 'cave';
  // Elite: dieselbe Art, größer und mit eigenem Namen
  T.elites = {};
  for (const id of T.mobs) {
    const b = MONSTER_TYPES[id];
    const eid = 'riss_e_' + id;
    if (rlCloneType(eid, id, { name: 'Elite: ' + b.name, size: Math.round((b.size || 14) * 1.2), lookScale: +(((b.lookScale || 1) * 1.22).toFixed(3)), rissElite: true, aggressive: true })) T.elites[id] = eid;
  }
  // Rissherr: Fähigkeiten und Gestalt eines Wächters der Instanzen, ohne Siegel und Vernichtung
  const bb = MONSTER_TYPES[T.boss];
  T.herrId = 'riss_herr_' + tid;
  if (!bb || !rlCloneType(T.herrId, T.boss, {
    name: T.herr, level: RISSLAUF.level, rissHerr: true, aggressive: true,
    inst: Object.assign({}, bb.inst || {}, { final: false, ult: null, title: T.titel })
  })) T.herrId = null;
}
// 3D-Schmuck der Modelle im Thema (wie die Instanzen: einmal berechnen lassen, dann eintragen)
(function rlThema3() {
  if (typeof monsterTheme3 !== 'function') return;
  monsterTheme3('hund');
  if (typeof mon3ThemeOf === 'undefined' || !mon3ThemeOf) return;
  for (const T of Object.values(RL_THEMEN)) {
    for (const [id, eid] of Object.entries(T.elites)) if (mon3ThemeOf[id]) mon3ThemeOf[eid] = mon3ThemeOf[id];
    if (T.herrId && mon3ThemeOf[T.boss]) mon3ThemeOf[T.herrId] = mon3ThemeOf[T.boss];
  }
})();
const rlThemeOfZone = (z) => (z && z.riss ? RL_THEMEN[z.id.slice(5)] : null);

// --- Lage der Felder -----------------------------------------------------------------------------------------------
function rlSlotRect(s) {
  const c = s % RISSLAUF.cols;
  const r = Math.floor(s / RISSLAUF.cols);
  const x = RISSLAUF.x0 + c * RISSLAUF.pitch;
  const y = RISSLAUF.y0 + r * RISSLAUF.pitch;
  return { x, y, w: RISSLAUF.size, h: RISSLAUF.size, cx: x + RISSLAUF.size / 2, cy: y + RISSLAUF.size / 2 };
}
// Feld, in dem der Punkt (Pixel) liegt, sonst -1
function rlSlotAt(px, py) {
  const tx = px / TILE;
  const ty = py / TILE;
  if (!(tx >= RISSLAUF.x0 && ty >= RISSLAUF.y0)) return -1;
  const c = Math.floor((tx - RISSLAUF.x0) / RISSLAUF.pitch);
  const r = Math.floor((ty - RISSLAUF.y0) / RISSLAUF.pitch);
  if (c < 0 || c >= RISSLAUF.cols || r < 0) return -1;
  const s = r * RISSLAUF.cols + c;
  if (s >= RISSLAUF.slots) return -1;
  const R = rlSlotRect(s);
  return tx < R.x + R.w && ty < R.y + R.h ? s : -1;
}
const rlInside = (e) => !!e && rlSlotAt(e.x, e.y) >= 0;
const rlMonSlot = (m) => (m ? rlSlotAt(m.homeX ?? m.x, m.homeY ?? m.y) : -1);

// --- Grundriss (aus dem Startwert, für alle gleich) ----------------------------------------------------------------
const RL_SHAPES = ['hall', 'round', 'cross', 'pillars', 'hall', 'round'];
const RL_CAVE_SHAPES = ['cave', 'cave', 'round', 'pillars', 'cross', 'cave'];
// Raum in einem Feld des Rasters (Kacheln relativ zum Rand des Felds): Größe und Lage gewürfelt, Form je Rolle
function rlRoom(rng, cell, role, cave) {
  const cw = RISSLAUF.cell;
  const r = () => rng();
  const w = role === 'boss' ? 18 + Math.floor(r() * 3) : role === 'start' ? 10 + Math.floor(r() * 2) : role === 'schatz' ? 11 + Math.floor(r() * 3) : 12 + Math.floor(r() * 6);
  const h = role === 'boss' ? 17 + Math.floor(r() * 3) : role === 'start' ? 9 + Math.floor(r() * 2) : role === 'schatz' ? 10 + Math.floor(r() * 3) : 11 + Math.floor(r() * 5);
  const x = cell[0] * cw + 1 + Math.floor(r() * Math.max(1, cw - 1 - w));
  const y = cell[1] * cw + 1 + Math.floor(r() * Math.max(1, cw - 1 - h));
  let shape = role === 'start' ? 'hall' : role === 'boss' ? (r() < 0.5 ? 'round' : 'pillars') : role === 'schatz' ? (r() < 0.5 ? 'round' : 'cross')
    : (cave ? RL_CAVE_SHAPES : RL_SHAPES)[Math.floor(r() * 6)];
  if (cave && role === 'schatz' && r() < 0.5) shape = 'cave';
  const out = { x, y, w, h, shape, role, cell };
  if (shape === 'cave') Object.assign(out, { lobes: 3 + Math.floor(r() * 3), ph: r() * Math.PI * 2, ph2: r() * Math.PI * 2 });
  return out;
}
// Weg vom Start zum Rissherrn ohne Kreuzung (mindestens drei Kurven), Seitenkammern und manchmal ein zweiter Weg.
// links: Paare von Nummern in rooms + side (zuerst der Weg, dann die Seitenkammern)
function rlPlan(seed) {
  const rng = mulberry32((seed >>> 0) || 1);
  const N = RISSLAUF.grid;
  const key = (c, r) => r * N + c;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const theme = RL_THEMA_IDS[Math.floor(rng() * RL_THEMA_IDS.length)];
  let best = null;
  for (let tries = 0; tries < 600 && !best; tries++) {
    const want = RISSLAUF.path[0] + Math.floor(rng() * (RISSLAUF.path[1] - RISSLAUF.path[0] + 1));
    const c0 = Math.floor(rng() * N);
    const r0 = Math.floor(rng() * N);
    const path = [[c0, r0]];
    const used = new Set([key(c0, r0)]);
    while (path.length < want) {
      const [c, r] = path[path.length - 1];
      const next = dirs.map(([dc, dr]) => [c + dc, r + dr]).filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N && !used.has(key(x, y)));
      if (!next.length) break;
      const n = next[Math.floor(rng() * next.length)];
      path.push(n);
      used.add(key(n[0], n[1]));
    }
    if (path.length < want) continue;
    let turns = 0;
    for (let k = 2; k < path.length; k++) {
      const a = [path[k - 1][0] - path[k - 2][0], path[k - 1][1] - path[k - 2][1]];
      const b = [path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]];
      if (a[0] !== b[0] || a[1] !== b[1]) turns++;
    }
    const [sc, sr] = path[0];
    const [bc, br] = path[path.length - 1];
    if (turns < 3 || Math.abs(sc - bc) + Math.abs(sr - br) < 3) continue;
    const side = [];
    const order = path.slice(1, -1).map((cell, k) => [cell, k + 1]).sort(() => rng() - 0.5);
    const nSide = 1 + (rng() < 0.55 ? 1 : 0);
    for (const [[c, r], from] of order) {
      if (side.length >= nSide) break;
      const free = dirs.map(([dc, dr]) => [c + dc, r + dr]).filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N && !used.has(key(x, y)));
      if (!free.length) continue;
      const f = free[Math.floor(rng() * free.length)];
      used.add(key(f[0], f[1]));
      side.push({ cell: f, from });
    }
    const loops = [];
    if (rng() < 0.6) {
      const cand = [];
      for (let i = 1; i < path.length - 1; i++) {
        for (let j = i + 3; j < path.length - 1; j++) if (Math.abs(path[i][0] - path[j][0]) + Math.abs(path[i][1] - path[j][1]) === 1) cand.push([i, j]);
      }
      if (cand.length) loops.push(cand[Math.floor(rng() * cand.length)]);
    }
    best = { path, side, loops };
  }
  // (kommt praktisch nie vor) Schlange durch das Raster
  if (!best) {
    const path = [];
    for (let r = 0; r < N && path.length < RISSLAUF.path[1]; r++) for (let k = 0; k < N && path.length < RISSLAUF.path[1]; k++) path.push([r % 2 ? N - 1 - k : k, r]);
    best = { path, side: [], loops: [] };
  }
  const T = RL_THEMEN[theme];
  const rooms = best.path.map((cell, n) => rlRoom(rng, cell, n === 0 ? 'start' : n === best.path.length - 1 ? 'boss' : 'mob', T.cave));
  const side = best.side.map((sd) => Object.assign(rlRoom(rng, sd.cell, 'schatz', T.cave), { from: sd.from }));
  const links = rooms.slice(1).map((_, n) => [n, n + 1]).concat(side.map((r, k) => [r.from, rooms.length + k])).concat(best.loops);
  return { seed: seed >>> 0, theme, rooms, side, links };
}

// --- Bau ins Feld (Host und Mitspieler, aus demselben Grundriss) ----------------------------------------------------
// RL_BUILT[s]: zuletzt gebauter Riss eines Felds { seed, gen, theme, rooms, side, start, boss } (Kacheln, Mitte in Pixeln)
const RL_BUILT = [];
let RL_GEN = 0;
let RL_PORTAL_DG = -1;
function rlPortalDungeon() {
  if (RL_PORTAL_DG < 0) {
    RL_PORTAL_DG = DUNGEONS.findIndex((d) => d.id === 'leerenthron');
    if (RL_PORTAL_DG < 0) RL_PORTAL_DG = 0;
  }
  return RL_PORTAL_DG;
}
const rlInRect = (R, px, py) => px >= R.x * TILE && py >= R.y * TILE && px < (R.x + R.w) * TILE && py < (R.y + R.h) * TILE;
// Feld voll Fels (beim Erzeugen der Welt)
function rlFillRock(w, s) {
  const R = rlSlotRect(s);
  const T = RL_THEMEN.kristall;
  for (let y = R.y; y < R.y + R.h; y++) {
    for (let x = R.x; x < R.x + R.w; x++) {
      const i = y * MAP_W + x;
      w.zoneIdx[i] = T.zi;
      w.ground[i] = GROUND.CAVE;
      w.obj[i] = OBJ.CAVEWALL;
      w.deco[i] = DECO.NONE;
    }
  }
}
function rlBuild(s, plan) {
  const w = game.world;
  if (!w || s < 0 || s >= RISSLAUF.slots) return null;
  const R = rlSlotRect(s);
  const T = RL_THEMEN[plan.theme] || RL_THEMEN.kristall;
  const floor = GROUND[T.ground] != null ? GROUND[T.ground] : GROUND.CAVE;
  const alt = GROUND[T.alt] != null ? GROUND[T.alt] : floor;
  const liquid = GROUND[T.liquid] != null ? GROUND[T.liquid] : GROUND.WATER;
  const rng = mulberry32(((plan.seed >>> 0) ^ 0x2c1b3c6d) >>> 0);
  const I = (x, y) => y * MAP_W + x;
  for (let y = R.y; y < R.y + R.h; y++) {
    for (let x = R.x; x < R.x + R.w; x++) {
      const i = I(x, y);
      w.zoneIdx[i] = T.zi;
      w.ground[i] = floor;
      w.obj[i] = OBJ.CAVEWALL;
      w.deco[i] = DECO.NONE;
    }
  }
  const ox = R.x + 4;
  const oy = R.y + 4;
  const abs = (r) => Object.assign({}, r, { x: ox + r.x, y: oy + r.y, cx: ox + r.x + Math.floor(r.w / 2), cy: oy + r.y + Math.floor(r.h / 2) });
  const rooms = plan.rooms.map(abs);
  const side = plan.side.map(abs);
  const all = rooms.concat(side);
  const inner = (x, y) => x > R.x + 1 && y > R.y + 1 && x < R.x + R.w - 2 && y < R.y + R.h - 2;
  const carve = (x, y) => { if (inner(x, y)) w.obj[I(x, y)] = OBJ.NONE; };
  for (const r of all) {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (inRoomShape(r, x, y)) carve(x, y);
    // unregelmäßige Ränder, damit es wie eine Höhle wirkt (wie buildDungeons)
    if (r.shape === 'hall' && T.ground !== 'FLAGSTONE') {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (rng() < 0.4) carve(x, r.y - 1);
        if (rng() < 0.4) carve(x, r.y + r.h);
      }
      for (let y = r.y; y < r.y + r.h; y++) {
        if (rng() < 0.4) carve(r.x - 1, y);
        if (rng() < 0.4) carve(r.x + r.w, y);
      }
    }
  }
  // Gänge (drei Kacheln breit) als Z mit Knick; in Höhlen gewunden (weichen bis zu zwei Kacheln zur Seite aus)
  const wind = (a0, a1, put) => {
    const lo = Math.min(a0, a1);
    const hi = Math.max(a0, a1);
    let off = 0;
    for (let a = lo; a <= hi; a++) {
      const left = hi - a;
      if (T.cave) {
        if (left <= Math.abs(off) + 1) off -= Math.sign(off);
        else if (rng() < 0.22) off = Math.max(-2, Math.min(2, off + (rng() < 0.5 ? -1 : 1)));
      }
      for (let k = -1; k <= 1; k++) put(a, off + k);
    }
  };
  const lineX = (x0, x1, y) => wind(x0, x1, (x, o) => carve(x, y + o));
  const lineY = (y0, y1, x) => wind(y0, y1, (y, o) => carve(x + o, y));
  for (const [ia, ib] of plan.links) {
    const a = all[ia];
    const b = all[ib];
    if (!a || !b) continue;
    if (a.cell[1] === b.cell[1]) {
      const [L, Rr] = a.cx < b.cx ? [a, b] : [b, a];
      const mx = Math.round((L.x + L.w + Rr.x) / 2);
      const ly = L.cy + Math.round((rng() - 0.5) * (L.h - 5));
      const ry = Rr.cy + Math.round((rng() - 0.5) * (Rr.h - 5));
      lineX(L.cx, mx, ly);
      lineY(ly, ry, mx);
      lineX(mx, Rr.cx, ry);
    } else {
      const [Tp, B] = a.cy < b.cy ? [a, b] : [b, a];
      const my = Math.round((Tp.y + Tp.h + B.y) / 2);
      const tx = Tp.cx + Math.round((rng() - 0.5) * (Tp.w - 5));
      const bx = B.cx + Math.round((rng() - 0.5) * (B.w - 5));
      lineY(Tp.cy, my, tx);
      lineX(tx, bx, my);
      lineY(my, B.cy, bx);
    }
  }
  // Höhlen glätten: Fels mit mindestens fünf freien Nachbarn bricht weg (nur öffnen, nie schließen)
  if (T.cave) {
    const open = [];
    for (let y = R.y + 2; y < R.y + R.h - 2; y++) {
      for (let x = R.x + 2; x < R.x + R.w - 2; x++) {
        const i = I(x, y);
        if (w.obj[i] !== OBJ.CAVEWALL) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && w.obj[i + dy * MAP_W + dx] === OBJ.NONE) n++;
        if (n >= 5) open.push([x, y]);
      }
    }
    for (const [x, y] of open) carve(x, y);
  }
  // Säulenhallen: Säulen im Raster, nicht in der Mitte und nicht vor den Gängen
  const pillars = [];
  for (const r of all) {
    if (r.shape !== 'pillars') continue;
    for (let y = r.y + 2; y < r.y + r.h - 2; y += 3) {
      for (let x = r.x + 2; x < r.x + r.w - 2; x += 4) {
        if (Math.abs(x - r.cx) <= 2 && Math.abs(y - r.cy) <= 2) continue;
        const i = I(x, y);
        if (w.obj[i] !== OBJ.NONE || w.obj[i - 1] || w.obj[i + 1] || w.obj[i - MAP_W] || w.obj[i + MAP_W]) continue;
        w.obj[i] = OBJ.PILLAR;
        pillars.push({ x, y });
      }
    }
  }
  // Flecken aus dem zweiten Boden (weiche Gruppen von 3 × 3 Kacheln)
  for (let y = R.y + 1; y < R.y + R.h - 1; y++) {
    for (let x = R.x + 1; x < R.x + R.w - 1; x++) {
      const i = I(x, y);
      if (w.obj[i] === OBJ.CAVEWALL) continue;
      const h = (tileHash(Math.floor((x + (plan.seed & 7)) / 3), Math.floor(y / 3)) + tileHash(Math.floor(x / 4), Math.floor((y + 5) / 4))) % 9;
      if (h === 0 || (h === 1 && tileHash(x, y) % 3 === 0)) w.ground[i] = alt;
    }
  }
  // Becken in manchen großen Kampfräumen (Abgrund, Lava, Wasser)
  for (const r of rooms.slice(1, -1)) {
    if (r.w < 13 || r.h < 12 || r.shape === 'pillars' || rng() < 0.5) continue;
    const qx = rng() < 0.5 ? r.x + 2 : r.x + r.w - 5;
    const qy = rng() < 0.5 ? r.y + 2 : r.y + r.h - 5;
    let ok = true;
    for (let y = qy - 1; y < qy + 4 && ok; y++) for (let x = qx - 1; x < qx + 4; x++) if (w.obj[I(x, y)] !== OBJ.NONE) { ok = false; break; }
    if (!ok) continue;
    for (let y = qy; y < qy + 3; y++) {
      for (let x = qx; x < qx + 3; x++) {
        if ((x === qx || x === qx + 2) && (y === qy || y === qy + 2) && rng() < 0.7) continue;
        w.ground[I(x, y)] = liquid;
      }
    }
  }
  // Schmuck am Boden, selten und nicht in der Mitte der Räume
  const decos = T.deco.map((k) => DECO[k]).filter((d) => d != null);
  for (const r of all) {
    for (let y = r.y + 1; y < r.y + r.h - 1; y++) {
      for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
        const i = I(x, y);
        if (w.obj[i] || LIQUID.has(w.ground[i]) || Math.abs(x - r.cx) < 2 || rng() > 0.04) continue;
        w.deco[i] = decos[Math.floor(rng() * decos.length)] || DECO.PEBBLE;
      }
    }
  }
  // vom Start aus nicht erreichbarer Boden wird wieder Fels (dort kann nichts erscheinen oder hängen bleiben)
  {
    const reach = new Uint8Array(R.w * R.h);
    const at = (x, y) => (y - R.y) * R.w + (x - R.x);
    const st = [[rooms[0].cx, rooms[0].cy]];
    reach[at(rooms[0].cx, rooms[0].cy)] = 1;
    while (st.length) {
      const [x, y] = st.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx <= R.x || ny <= R.y || nx >= R.x + R.w - 1 || ny >= R.y + R.h - 1) continue;
        if (reach[at(nx, ny)] || w.obj[I(nx, ny)] === OBJ.CAVEWALL) continue;
        reach[at(nx, ny)] = 1;
        st.push([nx, ny]);
      }
    }
    for (let y = R.y; y < R.y + R.h; y++) {
      for (let x = R.x; x < R.x + R.w; x++) {
        const i = I(x, y);
        if (!reach[at(x, y)] && w.obj[i] !== OBJ.CAVEWALL) {
          w.obj[i] = OBJ.CAVEWALL;
          w.ground[i] = floor;
          w.deco[i] = DECO.NONE;
        }
      }
    }
  }
  // Schmuck wie in den gewürfelten Dungeons: Feuerbecken, Banner, Statuen, Thron im letzten Raum, Truhe und Gold in
  // den Seitenkammern (alte Bauten des Felds vorher weg)
  w.props = w.props.filter((pr) => !rlInRect(R, pr.x, pr.y));
  const dg = { def: { wall: T.wall, portal: T.portal }, rooms, side, pillars };
  for (const pr of dungeonProps(dg, w.obj, w.ground)) w.props.push(Object.assign({}, pr, { x: pr.tx * TILE, y: pr.ty * TILE }));
  // Ausgang (Steinkreis) oben links im ersten Raum
  w.npcs = w.npcs.filter((n) => !rlInRect(R, n.x, n.y));
  const ex = dungeonFreeTile(rooms[0], 0.16, 0.22, w.obj, w.ground);
  w.npcs.push({ id: 'ausgang', name: 'Rissausgang', x: (ex.x + 0.5) * TILE, y: (ex.y + 0.5) * TILE, r: 11, dungeon: rlPortalDungeon(), rlSlot: s });
  const center = (r) => ({ x: (r.cx + 0.5) * TILE, y: (r.cy + 0.5) * TILE });
  const B = RL_BUILT[s] = { seed: plan.seed, gen: ++RL_GEN, theme: T.id, rooms, side, start: center(rooms[0]), boss: center(rooms[rooms.length - 1]) };
  // Kacheln geändert: Hindernisse, Höhlentiefe (3D) und Nachbarliste neu
  if (typeof solidCache !== 'undefined') solidCache.at = -1;
  if (typeof CAVEDEPTH3 !== 'undefined') CAVEDEPTH3.key = '';
  if (typeof NPCS_NEAR !== 'undefined') NPCS_NEAR.at = -1e9;
  return B;
}
// Kennung des Felds für Bild und Karte (neu bei jedem Bau)
const rlKey = (s) => 'r' + s + 'g' + ((RL_BUILT[s] && RL_BUILT[s].gen) || 0);

// Die Felder entstehen mit der Welt (voll Fels); die Rissmeisterin steht in den großen Städten und Stufe-80-Lagern
const RL_NPC_NAMES = { 1: 'Rissmeisterin Ysmera', 11: 'Rissmeisterin Nalvi', 10: 'Rissmeisterin Liraya', 17: 'Rissmeisterin Oriel', 18: 'Rissmeisterin Merel', 19: 'Rissmeisterin Tavira' };
function rlNpcPlace(w, mapId) {
  const tp = townPlace(mapId, 'teleport') || townPlace(mapId, 'aeltester');
  if (!tp) return null;
  const S = { x: tp.x + (tp.stand === 'e' ? -2.4 : 2.4), y: tp.y + 1.6 };
  const props = w.props.filter((pr) => Math.abs(pr.x / TILE - S.x) < 12 && Math.abs(pr.y / TILE - S.y) < 12);
  const free = typeof rgFreeAt === 'function' ? rgFreeAt : () => true;
  for (let r = 0; r <= 5; r += 0.5) {
    const steps = r ? Math.max(8, Math.round(r * 8)) : 1;
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      const x = Math.round((S.x + Math.cos(a) * r) * 20) / 20;
      const y = Math.round((S.y + Math.sin(a) * r) * 20) / 20;
      if (!inVillage(x * TILE, y * TILE)) continue;
      if (w.npcs.some((n) => !n.wander && hyp(n.x / TILE - x, n.y / TILE - y) < 2.6)) continue;
      if (free(w, x, y, props)) return { x, y };
    }
  }
  return null;
}
const _rlGenerateWorld = generateWorld;
// eslint-disable-next-line no-global-assign
generateWorld = function () {
  const w = _rlGenerateWorld.apply(this, arguments);
  for (let s = 0; s < RISSLAUF.slots; s++) rlFillRock(w, s);
  RL_BUILT.length = 0;
  for (const mapId of Object.keys(RL_NPC_NAMES).map(Number)) {
    try {
      if (mapId !== 1 && w.maps && !w.maps.some((m) => m.id === mapId)) continue;
      const at = rlNpcPlace(w, mapId);
      if (at) w.npcs.push({ id: RISSLAUF.npc, name: RL_NPC_NAMES[mapId], x: at.x * TILE, y: at.y * TILE, r: 11, restYaw: 0.3 });
    } catch (e) {
      console.warn('Rissmeisterin: kein Platz auf Map ' + mapId, e);
    }
  }
  return w;
};

// --- Stärke --------------------------------------------------------------------------------------------------------
const rlHpK = (L) => RISSLAUF.base * Math.pow(RISSLAUF.hpUp, Math.max(0, L - 1));
const rlAtkK = (L) => RISSLAUF.base * Math.pow(RISSLAUF.atkUp, Math.max(0, L - 1));
const rlPl = (n) => Math.max(1, Math.min(RISSLAUF.maxPlayers, n | 0 || 1));
function rlScale(n) {
  const k = rlPl(n) - 1;
  return { n: 1 + RISSLAUF.perN * k, hp: 1 + RISSLAUF.perHp * k, atk: 1 + RISSLAUF.perAtk * k, boss: 1 + RISSLAUF.perBoss * k };
}
// Werte eines Monsters im Riss: art 'mob', 'elite', 'boss' (Rissherr), 'add' (Helfer des Rissherrn)
function rlTune(m, S, art) {
  const t = m.type;
  const sc = rlScale(S.players);
  const L = S.lv;
  const swarm = rlHat(S.rules, 'schwarm') && art !== 'boss' ? RISSLAUF.schwarm.hp : 1;
  if (art === 'boss') {
    const st = monsterStats(RISSLAUF.level, 1, t.atkMul);
    m.maxHp = Math.max(1, Math.round(st.maxHp * RISSLAUF.bossHp * rlHpK(L) * sc.boss));
    m.atk = Math.round(st.atk * RISSLAUF.bossAtk * rlAtkK(L) * sc.atk);
    m.bossCd = 4;
    m.summoned = 0;
  } else {
    const st = monsterStats(RISSLAUF.level, t.hpMul, t.atkMul);
    const e = art === 'elite';
    m.maxHp = Math.max(1, Math.round(st.maxHp * rlHpK(L) * sc.hp * swarm * (e ? RISSLAUF.eliteHp : art === 'add' ? 0.7 : 1)));
    m.atk = Math.round(st.atk * rlAtkK(L) * sc.atk * (e ? RISSLAUF.eliteAtk : 1));
    m.def = st.def;
    m.xp = st.xp * (e ? 3 : 1);
  }
  m.level = RISSLAUF.level;
  m.hp = m.maxHp;
  m.inDungeon = true;
}

// --- Felder führen (wer die Monster führt: allein man selbst, im Kanal der Host) -----------------------------------
// S = { id, owner, members ('me' = der Host selbst, sonst pid), names, invites, lv, seed, rules, theme, players, ph
//   ('w' warten, 'c' Countdown, 'r' läuft, 'd' geschlossen), at, cUntil, t0, lim, deaths, pts, need, rooms, mons,
//   boss, bossDead, shield, endT, closeAt, absent, lost, tellAt }
const rlHost = { slots: Array.from({ length: RISSLAUF.slots }, () => null), seq: 0 };
const rlNow = () => game.time;
function rlMemberObj(id) {
  if (id === 'me') return WAECHTER ? null : game.player;
  const rp = net.players.get(id);
  return rp && !rp.gone ? rp : null;
}
const rlMemberName = (id) => (id === 'me' ? (game.player && game.player.name) : (net.players.get(id) || {}).name) || '';
function rlTellOne(id, d) {
  if (id === 'me') rlOnMsg(d);
  else if (typeof netSocial === 'function') netSocial(id, d);
}
function rlTell(S, d) {
  for (const id of S.members.slice()) rlTellOne(id, d);
}
const rlHere = (S, s, id) => { const o = rlMemberObj(id); return !!o && rlSlotAt(o.x, o.y) === s; };
function rlFighters(S, s) {
  const out = [];
  for (const id of S.members) {
    const o = rlMemberObj(id);
    if (o && !o.dead && rlSlotAt(o.x, o.y) === s) out.push(o);
  }
  return out;
}
// Ein freies Feld für einen neuen Riss (niemand darin, kein laufender Riss)
function rlAlloc(owner, lv, rules, invites, pm) {
  for (const S of rlHost.slots) if (S && S.members.includes(owner)) rlDrop(rlHost.slots.indexOf(S), owner, null);
  const busy = new Set();
  if (game.player) busy.add(rlSlotAt(game.player.x, game.player.y));
  if (net.mode === 'host') for (const rp of net.players.values()) busy.add(rlSlotAt(rp.x, rp.y));
  for (let s = 0; s < RISSLAUF.slots; s++) {
    if (rlHost.slots[s] || busy.has(s)) continue;
    const seed = (Math.floor(Math.random() * 0x7fffffff) ^ Date.now()) >>> 0;
    const plan = rlPlan(seed);
    const B = rlBuild(s, plan);
    if (!B) return -1;
    const me = rlMemberName(owner);
    let inv = (Array.isArray(invites) ? invites : []).map((n) => String(n).slice(0, 40)).filter((n, i, a) => n && n !== me && a.indexOf(n) === i);
    if (Array.isArray(pm) && pm.length) inv = inv.filter((n) => pm.includes(n));
    inv = inv.slice(0, RISSLAUF.maxPlayers - 1);
    const lim = Math.round(RISSLAUF.time * (rlHat(rules, 'zeitdruck') ? RISSLAUF.rush : 1));
    const S = {
      id: ++rlHost.seq * 100 + s, owner, members: [owner], names: { [owner]: me }, invites: inv, lv, seed, rules: rules.slice(0, 3), theme: B.theme,
      players: 1, ph: 'w', at: rlNow(), cUntil: 0, t0: 0, lim, deaths: 0, pts: 0, need: 1, mons: new Set(), boss: null, bossDead: false,
      shield: null, shieldStep: 0, endT: 0, closeAt: 0, absent: {}, lost: {}, wasDead: {}, tellAt: 0, dirty: true, joinAt: { [owner]: rlNow() }
    };
    // Räume: Packs und Elite je Raum festlegen, daraus die Rissenergie bis zum Rissherrn
    const elite = RISSLAUF.elite * (rlHat(rules, 'elitenflut') ? 2 : 1);
    let total = 0;
    S.rooms = B.rooms.concat(B.side).map((r) => {
      const fight = r.role === 'mob' || r.role === 'schatz';
      const big = r.w * r.h >= 190;
      const packs = !fight ? [] : Array.from({ length: r.role === 'mob' && big ? 2 : 1 }, () => randInt(RISSLAUF.pack[0], RISSLAUF.pack[1]));
      const elites = !fight ? 0 : (r.role === 'schatz' ? 1 : 0) + (Math.random() < elite ? 1 : 0) + (big && rlHat(rules, 'elitenflut') && Math.random() < 0.5 ? 1 : 0);
      total += packs.reduce((a, b) => a + b, 0) + elites * RISSLAUF.elitePts;
      return { r, packs, elites, woke: !fight };
    });
    S.need = Math.max(1, Math.ceil(total * RISSLAUF.need));
    rlHost.slots[s] = S;
    return s;
  }
  return -1;
}
// Teilnehmer fällt heraus (why: Grund für ihn, null = ihm nichts mehr sagen); ist niemand mehr da, wird das Feld frei
function rlDrop(s, id, why) {
  const S = rlHost.slots[s];
  if (!S || !S.members.includes(id)) return;
  if (why) rlTellOne(id, { k: 'rlk', i: S.id, r: why });
  S.members = S.members.filter((x) => x !== id);
  if (!S.members.length) {
    rlFree(s);
    return;
  }
  if (S.owner === id) S.owner = S.members[0];
  S.dirty = true;
}
// Feld räumen: seine Monster verschwinden
function rlFree(s) {
  const S = rlHost.slots[s];
  rlHost.slots[s] = null;
  if (!S) return;
  const gone = [];
  game.monsters = game.monsters.filter((m) => {
    const mine = m.rlSlot === s || (m.respawn === false && !m.isStone && rlMonSlot(m) === s);
    if (mine) gone.push(m.id);
    return !mine;
  });
  if (game.target && (game.target.rlSlot === s || rlMonSlot(game.target) === s)) game.target = null;
  // Mitspieler entfernen sie ebenso (Meldung wie bei den Nachtmonstern, tag-nacht.js)
  if (gone.length && net.mode === 'host' && typeof netBroadcast === 'function') netBroadcast({ t: 'gone', ids: gone });
}
function rlStateMsg(S) {
  const now = rlNow();
  const el = S.ph === 'r' ? now - S.t0 + S.deaths * RISSLAUF.deathTime : S.ph === 'd' ? S.endT : 0;
  const b = S.boss;
  return {
    k: 'rls', i: S.id, ph: S.ph, t: Math.round(el * 10) / 10, lim: S.lim, pr: Math.min(1, Math.round((S.pts / S.need) * 1000) / 1000), d: S.deaths,
    m: S.members.length, b: S.bossDead ? 2 : b && !b.dead ? 1 : 0, bh: b && !b.dead ? Math.round((b.hp / b.maxHp) * 100) / 100 : 0, sh: S.shield ? 1 : 0,
    cd: S.ph === 'c' ? Math.max(0, Math.round((S.cUntil - now) * 10) / 10) : 0,
    w: S.ph === 'w' ? Math.max(0, Math.ceil(S.at + RISSLAUF.inviteWait - now)) : 0, p: rlPending(S).length
  };
}
// noch offene Einladungen (weder beigetreten noch abgesagt)
function rlPending(S) {
  if (!S.invites || !S.invites.length) return [];
  const inside = new Set(S.members.map(rlMemberName));
  return S.invites.filter((n) => !inside.has(n));
}
function rlInvite(S, s) {
  const d = { k: 'rli', s, i: S.id, n: rlMemberName(S.owner), lv: S.lv, ru: S.rules, t: RISSLAUF.inviteWait, lg: RISSLAUF.lage };
  const gone = [];
  for (const name of S.invites) {
    if (game.player && name === game.player.name && S.owner !== 'me' && !WAECHTER) { rlOnMsg(d); continue; }
    const on = typeof onlinePlayer === 'function' ? onlinePlayer(name) : null;
    if (!on || on.pid === S.owner) { gone.push(name); continue; }
    netSocial(on.pid, d);
  }
  if (gone.length) S.invites = S.invites.filter((n) => !gone.includes(n));
}
// Spielerplatz in einem Raum (frei, in der Form, nicht im Becken)
function rlRoomSpot(r, fx, fy) {
  const t = dungeonFreeTile(r, fx, fy, game.world.obj, game.world.ground);
  return { x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE };
}
function rlSpawn(S, s, typeId, art, at, gid, pts) {
  const T = RL_THEMEN[S.theme];
  const pos = art === 'boss' ? at : spotNear(at, art === 'elite' ? 20 : 44);
  const m = createMonster(typeId, pos.x, pos.y, { level: RISSLAUF.level, respawn: false, zone: T.zone, groupId: gid });
  m.rlSlot = s;
  m.rlPts = pts;
  rlTune(m, S, art);
  if (art === 'boss') {
    m.rlBoss = true;
  } else m.stun = 0.35;
  game.monsters.push(m);
  S.mons.add(m);
  return m;
}
// Raum erwacht: seine Packs erscheinen (Zahl nach den Spielern, die gerade im Riss sind)
function rlWake(S, s, room) {
  room.woke = true;
  const T = RL_THEMEN[S.theme];
  const sc = rlScale(S.players);
  const swarm = rlHat(S.rules, 'schwarm') ? RISSLAUF.schwarm.n : 1;
  const r = room.r;
  const spots = room.packs.length > 1 ? [[0.3, 0.35], [0.7, 0.65]] : [[0.5, 0.5]];
  room.packs.forEach((n0, k) => {
    const at = rlRoomSpot(r, spots[k][0], spots[k][1]);
    const n = Math.max(1, Math.round(n0 * sc.n * swarm));
    const gid = rlGid();
    // eine Art je Pack, manchmal gemischt
    const a = T.mobs[randInt(0, T.mobs.length - 1)];
    const b = T.mobs[randInt(0, T.mobs.length - 1)];
    for (let j = 0; j < n; j++) rlSpawn(S, s, j % 3 === 2 ? b : a, 'mob', at, gid, n0 / n);
  });
  for (let k = 0; k < room.elites; k++) {
    const base = T.mobs[randInt(0, T.mobs.length - 1)];
    const at = rlRoomSpot(r, 0.35 + 0.3 * Math.random(), 0.35 + 0.3 * Math.random());
    rlSpawn(S, s, T.elites[base] || base, 'elite', at, rlGid(), RISSLAUF.elitePts);
  }
}
// eigene Gruppennummer je Pack (aggro ruft die Gruppe zusammen), fern von denen der Welt
const rlGid = () => (rlHost.gid = ((rlHost.gid || 0) + 1) % 900000) + 7000000;
// Der Rissherr erscheint im letzten Raum, mit kleinem Gefolge
function rlBossSpawn(S, s) {
  const T = RL_THEMEN[S.theme];
  const B = RL_BUILT[s];
  if (!T.herrId || !B) { S.bossDead = true; return; }
  const at = B.boss;
  S.boss = rlSpawn(S, s, T.herrId, 'boss', at, 0, 0);
  const gid = rlGid();
  for (let k = 0; k < RISSLAUF.escort; k++) rlSpawn(S, s, T.mobs[randInt(0, T.mobs.length - 1)], 'add', at, gid, 0);
  S.dirty = true;
  rlTell(S, { k: 'rlb', i: S.id });
}
// Schildbann: Schildwächter rufen, der Rissherr ist unverwundbar, bis sie fallen
function rlShieldStart(S, s) {
  const T = RL_THEMEN[S.theme];
  const b = S.boss;
  S.shield = { adds: new Set() };
  for (let k = 0; k < RISSLAUF.schild.adds; k++) {
    const a = (k / RISSLAUF.schild.adds) * Math.PI * 2;
    const at = { x: b.x + Math.cos(a) * 3 * TILE, y: b.y + Math.sin(a) * 2.4 * TILE };
    const base = T.mobs[randInt(0, T.mobs.length - 1)];
    const m = rlSpawn(S, s, T.elites[base] || base, 'elite', at, rlGid(), 0);
    m.state = 'chase';
    S.shield.adds.add(m);
  }
  S.dirty = true;
  rlTell(S, { k: 'rlh', i: S.id, on: 1 });
}
function rlEndRun(S, s) {
  const now = rlNow();
  S.ph = 'd';
  S.endT = now - S.t0 + S.deaths * RISSLAUF.deathTime;
  S.closeAt = now + RISSLAUF.closeAfter;
  const inTime = S.endT <= S.lim;
  const fast = S.endT <= S.lim * (1 - RISSLAUF.fast);
  rlTell(S, { k: 'rle', i: S.id, it: inTime ? 1 : 0, f: fast ? 1 : 0, t: Math.round(S.endT * 10) / 10, lim: S.lim, lv: S.lv, d: S.deaths, ru: S.rules, th: S.theme, m: S.members.length });
  S.dirty = true;
}
function rlTickHost() {
  if (net.mode === 'client') return;
  const now = rlNow();
  for (let s = 0; s < RISSLAUF.slots; s++) {
    let S = rlHost.slots[s];
    if (!S) continue;
    // ohne Verbindung (oder anderer Charakter): nach einer Schonfrist heraus
    for (const id of S.members.slice()) {
      if (rlMemberObj(id)) { S.lost[id] = null; continue; }
      if (S.lost[id] == null) S.lost[id] = now;
      if (now - S.lost[id] > RISSLAUF.absentMax) rlDrop(s, id, null);
    }
    if (!(S = rlHost.slots[s])) continue;
    // außerhalb des Felds (Teleport, Rückweg): nach der Schonfrist heraus (wer nach dem Beitritt noch unterwegs ist, hat länger)
    for (const id of S.members.slice()) {
      const o = rlMemberObj(id);
      if (!o || o.dead || rlSlotAt(o.x, o.y) === s) { S.absent[id] = null; continue; }
      if (S.absent[id] == null) S.absent[id] = now;
      const grace = now - (S.joinAt[id] || 0) < 20 ? 25 : id === 'me' ? 3 : RISSLAUF.absentMax;
      if (now - S.absent[id] > grace) rlDrop(s, id, 'weg');
    }
    if (!(S = rlHost.slots[s])) continue;
    if (S.ph === 'w') {
      const pend = rlPending(S);
      if (pend.length && now - S.at > RISSLAUF.inviteWait) { S.invites = S.invites.filter((n) => !pend.includes(n)); S.dirty = true; }
      const ownerIn = rlHere(S, s, S.owner);
      if (!ownerIn && now - S.at > RISSLAUF.ownerWait) { rlTell(S, { k: 'rlk', i: S.id, r: 'zeit' }); rlFree(s); continue; }
      if (ownerIn && !rlPending(S).length) {
        S.ph = 'c';
        S.cUntil = now + RISSLAUF.countdown;
        S.dirty = true;
      }
    } else if (S.ph === 'c') {
      if (now >= S.cUntil) {
        S.ph = 'r';
        S.t0 = now;
        S.dirty = true;
      }
    } else if (S.ph === 'r') {
      // Tode zählt der Host selbst aus dem Zustand der Teilnehmer (keine Nachricht, die jemand fälschen könnte)
      for (const id of S.members) {
        const o = rlMemberObj(id);
        const dead = !!(o && o.dead);
        if (dead && !S.wasDead[id] && rlSlotAt(o.x, o.y) === s) { S.deaths++; S.dirty = true; }
        S.wasDead[id] = dead;
      }
      // Zahl der Spieler (für erwachende Räume und den Rissherrn): wer gerade im Riss ist
      const fighters = rlFighters(S, s);
      S.players = rlPl(Math.max(1, S.members.filter((id) => rlHere(S, s, id)).length));
      // Räume erwachen, wenn jemand nahe kommt
      for (const room of S.rooms) {
        if (room.woke) continue;
        const r = room.r;
        const W = RISSLAUF.wake;
        if (fighters.some((o) => o.x / TILE > r.x - W && o.x / TILE < r.x + r.w + W && o.y / TILE > r.y - W && o.y / TILE < r.y + r.h + W)) rlWake(S, s, room);
      }
      // Tote zählen (Rissenergie), Raserei, Schildbann
      for (const m of S.mons) {
        if (m.dead) {
          S.mons.delete(m);
          if (!S.boss || m !== S.boss) {
            if (m.rlPts) { S.pts += m.rlPts; S.dirty = true; }
          }
          continue;
        }
        if (rlHat(S.rules, 'rasend') && !m.rlWut && !m.rlBoss && m.hp < m.maxHp * RISSLAUF.wut.at) {
          m.rlWut = 1;
          m.atk = Math.round(m.atk * RISSLAUF.wut.atk);
        }
      }
      if (S.shield) {
        let alive = 0;
        for (const m of S.shield.adds) if (!m.dead) alive++;
        if (!alive) { S.shield = null; S.dirty = true; rlTell(S, { k: 'rlh', i: S.id, on: 0 }); }
      }
      const b = S.boss;
      if (!b && !S.bossDead && S.pts >= S.need) rlBossSpawn(S, s);
      else if (b && b.dead && !S.bossDead) {
        S.bossDead = true;
        S.boss = null;
        S.shield = null;
        rlEndRun(S, s);
      } else if (b && !b.dead && rlHat(S.rules, 'schild') && !S.shield && S.shieldStep < RISSLAUF.schild.at.length && b.hp <= b.maxHp * RISSLAUF.schild.at[S.shieldStep]) {
        S.shieldStep++;
        rlShieldStart(S, s);
      }
      // Bossleben für die Anzeige der Mitspieler
      if (b && !b.dead && Math.abs((S.bhLast ?? 1) - b.hp / b.maxHp) > 0.02) { S.bhLast = b.hp / b.maxHp; S.dirty = true; }
      // Monster ohne gültiges Ziel nehmen sich den nächsten Teilnehmer im Riss (kein Weglaufen in den Fels)
      if (now >= (S.aggroAt || 0) && fighters.length) {
        S.aggroAt = now + 0.6;
        for (const m of S.mons) {
          if (m.dead || m.state !== 'chase' || (m.target && !m.target.dead && !m.target.gone && rlSlotAt(m.target.x, m.target.y) === s)) continue;
          let best = null;
          let bd = Infinity;
          for (const o of fighters) { const d = hyp(o.x - m.x, o.y - m.y); if (d < bd) { bd = d; best = o; } }
          if (best && bd < 14 * TILE) { m.target = best; m.windup = 0; }
        }
      }
    } else if (S.ph === 'd') {
      if (now >= S.closeAt) {
        rlTell(S, { k: 'rlk', i: S.id, r: 'zu' });
        rlFree(s);
        continue;
      }
    }
    if (S.dirty || now >= S.tellAt) {
      S.dirty = false;
      S.tellAt = now + 1;
      rlTell(S, rlStateMsg(S));
    }
  }
}
// Gründe für eine Absage: nur als Kennung übers Netz, der Text kommt vom eigenen Gerät
const RL_WHY = {
  lage: 'Der Host spielt eine andere Version der Rissläufe – bitte alle neu laden.',
  stufe: `Rissläufe gibt es erst ab Stufe ${RISSLAUF.minLevel}.`,
  frei: 'Gerade ist kein Riss frei – versuch es gleich noch einmal.',
  alt: 'Diesen Riss gibt es nicht mehr.',
  einl: 'Du bist für diesen Riss nicht eingeladen.',
  voll: 'Der Riss ist voll.',
  boss: 'Der Rissherr ist schon erschienen – beitreten geht nicht mehr.'
};
// Anfragen an den Host (bzw. die eigene Hallenführung)
function rlSocial(pid, d) {
  const p = game.player;
  if (!p || !d) return;
  const rp = pid === 'me' ? p : net.players.get(pid);
  const lvl = pid === 'me' ? p.level : rp ? rp.level | 0 : 0;
  if (d.k === 'rln') {
    if ((d.lg | 0) !== RISSLAUF.lage) { rlTellOne(pid, { k: 'rlf', r: 'lage' }); return; }
    if (lvl < RISSLAUF.minLevel) { rlTellOne(pid, { k: 'rlf', r: 'stufe' }); return; }
    const lv = Number.isFinite(+d.lv) ? Math.max(1, Math.min(999, Math.floor(+d.lv))) : 1;
    const rules = (Array.isArray(d.ru) ? d.ru : rlRegelnDerWoche()).filter((x) => typeof x === 'string' && RL_REGELN[x]).slice(0, 3);
    const inv = Array.isArray(d.inv) ? d.inv.filter((x) => typeof x === 'string').slice(0, 8) : [];
    const pm = Array.isArray(d.pm) ? d.pm.filter((x) => typeof x === 'string').slice(0, 8) : null;
    const s = rlAlloc(pid, lv, rules, inv, pm);
    if (s < 0) { rlTellOne(pid, { k: 'rlf', r: 'frei' }); return; }
    const S = rlHost.slots[s];
    rlTellOne(pid, { k: 'rlg', s, i: S.id, seed: S.seed, lv: S.lv, ru: S.rules, o: rlMemberName(pid), lg: RISSLAUF.lage });
    if (S.invites.length) rlInvite(S, s);
    return;
  }
  if (d.k === 'rlj') {
    const s = d.s | 0;
    const S = s >= 0 && s < RISSLAUF.slots ? rlHost.slots[s] : null;
    const name = rlMemberName(pid);
    let why = '';
    if (!S || S.id !== (d.i | 0)) why = 'alt';
    else if ((d.lg | 0) !== RISSLAUF.lage) why = 'lage';
    else if (S.members.includes(pid)) why = '';
    else if (!S.invites.includes(name)) why = 'einl';
    else if (S.members.length >= RISSLAUF.maxPlayers) why = 'voll';
    else if (S.ph === 'd' || S.boss || S.bossDead) why = 'boss';
    else if (lvl < RISSLAUF.minLevel) why = 'stufe';
    if (why) { rlTellOne(pid, { k: 'rlf', r: why }); return; }
    if (!S.members.includes(pid)) {
      for (const o of rlHost.slots) if (o && o !== S && o.members.includes(pid)) rlDrop(rlHost.slots.indexOf(o), pid, null);
      S.members.push(pid);
      S.names[pid] = name;
      S.joinAt[pid] = rlNow();
      S.dirty = true;
    }
    rlTellOne(pid, { k: 'rlg', s, i: S.id, seed: S.seed, lv: S.lv, ru: S.rules, o: rlMemberName(S.owner), lg: RISSLAUF.lage });
    return;
  }
  if (d.k === 'rlx') {
    const S = rlHost.slots[d.s | 0];
    if (S && S.id === (d.i | 0)) { S.invites = S.invites.filter((n) => n !== rlMemberName(pid)); S.dirty = true; }
    return;
  }
  if (d.k === 'rlv') {
    for (let s = 0; s < RISSLAUF.slots; s++) {
      const S = rlHost.slots[s];
      if (S && S.members.includes(pid) && (!d.i || S.id === (d.i | 0))) rlDrop(s, pid, null);
    }
  }
}
// Anfragen (rln neu, rlj beitreten, rlx absagen, rlv verlassen) nimmt nur der Host an, und nur von Mitspielern im
// Kanal; Meldungen des Hosts (rlg los, rli Einladung, rlf abgelehnt, rls Zustand, rlb Rissherr, rlh Schild, rle Ende,
// rlk geschlossen) nur ein Mitspieler und nur vom Host. Die eigene Führung ruft beides direkt auf (rlTellOne, rlToHost).
const RL_ASK = /^rl[njxv]$/;
const RL_MSG = /^rl[gifsbhek]$/;
const _rlOnSocial = onSocial;
// eslint-disable-next-line no-global-assign
onSocial = function (pid, d) {
  if (d && typeof d.k === 'string' && /^rl[a-z]$/.test(d.k)) {
    try {
      if (RL_ASK.test(d.k)) { if (net.mode === 'host' && pid !== 'host' && net.players.has(pid)) rlSocial(pid, d); }
      else if (RL_MSG.test(d.k) && net.mode === 'client' && pid === 'host') rlOnMsg(d);
    } catch (e) { console.warn('Risslauf:', e); }
    return;
  }
  return _rlOnSocial(pid, d);
};

// --- Der eigene Lauf -----------------------------------------------------------------------------------------------
// game.rlRun: { slot, id, mode ('local' | 'client'), lv, rules, theme, owner, st (letzter Zustand), stAt, askAt,
//   lastMsgAt, respawnAt, deaths, kills, xp, gold, done, res (Ergebnis), blitzAt, pools, inviter }
const rlModeOf = () => (net.mode === 'client' ? 'client' : 'local');
function rlToHost(d) {
  if (net.mode === 'client') netSocial('host', d);
  else rlSocial('me', d);
}
// Wer gerade woanders kämpft, kann nicht hinein
function rlBusy(p) {
  if (game.rlRun) return 'Du bist schon in einem Riss.';
  if (game.arenaRun || game.turmRun || game.pvpMatch || game.duel) return 'Erst die Arena, den Turm bzw. das Duell beenden.';
  if (p.dead) return 'Erst wieder aufstehen.';
  if (p.level < RISSLAUF.minLevel) return `Rissläufe gibt es erst ab Stufe ${RISSLAUF.minLevel}.`;
  return '';
}
// Gruppenmitglieder im Kanal, die mitkommen können (Stufe 80)
function rlPartyMates() {
  const p = game.player;
  const party = game.party;
  if (!p || !party || !party.members || party.members.length < 2 || !netOnline()) return [];
  return party.members.filter((n) => n !== p.name).filter((n) => {
    const on = typeof onlinePlayer === 'function' ? onlinePlayer(n) : null;
    return on && !on.rp.gone && (on.rp.level | 0) >= RISSLAUF.minLevel;
  });
}
function rlStart(lv, withParty) {
  const p = game.player;
  if (!p) return;
  const busy = rlBusy(p);
  if (busy) { ui.log(`${RISSLAUF.name}: ${busy}`, 'warn'); return; }
  const st = rlState(p);
  lv = Math.max(1, Math.min(st.k, lv | 0 || st.k));
  const inv = withParty ? rlPartyMates() : [];
  const pm = game.party && game.party.members ? game.party.members.slice(0, 8) : undefined;
  const rules = rlRegelnDerWoche();
  game.rlRun = rlNewRun(0, lv, rules, true);
  ui.closePanels();
  ui.log('Die Rissmeisterin öffnet einen Riss …', 'info');
  rlToHost({ k: 'rln', lv, ru: rules, inv, pm, lg: RISSLAUF.lage });
}
// eigener Lauf, solange er auf die Antwort des Hosts wartet (lv und rules: erwartet, own: selbst geöffnet)
function rlNewRun(id, lv, rules, own) {
  return { p: game.player, slot: -1, id, mode: rlModeOf(), lv, lvReq: lv, rules: rules.slice(), own, askAt: game.time, lastMsgAt: game.time, deaths: 0, kills: 0, xp: 0, gold: 0, pools: [] };
}
// Nachricht des Hosts prüfen: nur bekannte Felder, Zahlen im erlaubten Bereich, Texte nur als Kennung
function rlClean(d) {
  const n = (v, lo, hi, def = lo) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def);
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  return {
    k: d.k, i: Math.floor(n(d.i, 0, 1e9)), s: Math.floor(n(d.s, -1, RISSLAUF.slots - 1, -1)), seed: n(d.seed, 0, 4294967295) >>> 0,
    lv: Math.floor(n(d.lv, 1, 999, 1)), lg: Math.floor(n(d.lg, 0, 999)), o: str(d.o, 40), n: str(d.n, 40),
    ru: Array.isArray(d.ru) ? d.ru.filter((x) => typeof x === 'string' && RL_REGELN[x]).slice(0, 3) : [],
    r: typeof d.r === 'string' && RL_WHY[d.r] ? d.r : typeof d.r === 'string' && ['zu', 'weg', 'zeit'].includes(d.r) ? d.r : '',
    ph: ['w', 'c', 'r', 'd'].includes(d.ph) ? d.ph : 'w', t: n(d.t, 0, 36000), lim: n(d.lim, 30, 3600, RISSLAUF.time), pr: n(d.pr, 0, 1),
    d: Math.floor(n(d.d, 0, 999)), m: Math.floor(n(d.m, 1, RISSLAUF.maxPlayers, 1)), b: Math.floor(n(d.b, 0, 2)), bh: n(d.bh, 0, 1), sh: d.sh ? 1 : 0,
    cd: n(d.cd, 0, 60), w: Math.floor(n(d.w, 0, 120)), p: Math.floor(n(d.p, 0, RISSLAUF.maxPlayers)), it: d.it ? 1 : 0, f: d.f ? 1 : 0, on: d.on ? 1 : 0,
    th: typeof d.th === 'string' && RL_THEMEN[d.th] ? d.th : ''
  };
}
// Mitspieler: alte Monster eines Felds wegräumen (vom Host nicht mehr gemeldet)
function rlPurge(s) {
  if (net.mode !== 'client') return;
  const old = (m) => m.respawn === false && !m.isStone && rlMonSlot(m) === s;
  for (const m of game.monsters) if (old(m)) net.mons.delete(m.id);
  game.monsters = game.monsters.filter((m) => !old(m));
  if (game.target && old(game.target)) game.target = null;
}
// Rückkehr: dahin, wo man losging (sonst Kazehana)
function rlReturnSpot() {
  const r = game.player && game.player.riss && game.player.riss.ret;
  if (r && Number.isFinite(r.x) && Number.isFinite(r.y) && rlSlotAt(r.x, r.y) < 0) return { x: r.x, y: r.y };
  return { x: CENTER_X * TILE, y: (CENTER_Y + 1) * TILE };
}
// in den zugeteilten Riss
function rlGo(d) {
  const run = game.rlRun;
  const p = game.player;
  if (!run || !p) return;
  if ((d.lg | 0) !== RISSLAUF.lage) {
    game.rlRun = null;
    if (net.mode === 'client') netSocial('host', { k: 'rlv', i: d.i | 0 });
    ui.log('Der Host spielt eine andere Version der Rissläufe. Wenn alle neu geladen haben, geht es hinein.', 'warn');
    return;
  }
  // nur der erwartete Riss: Stufe wie bestellt bzw. wie in der Einladung, beim Beitritt dieselbe Kennung
  const s = d.s;
  if (s < 0 || !d.i || d.lv !== run.lvReq || (run.id && d.i !== run.id)) {
    game.rlRun = null;
    if (net.mode === 'client' && d.i) netSocial('host', { k: 'rlv', i: d.i });
    ui.log(`${RISSLAUF.name}: Der Riss passt nicht zu deiner Anfrage – bitte noch einmal versuchen.`, 'warn');
    rlHud();
    return;
  }
  if (!(RL_BUILT[s] && RL_BUILT[s].seed === d.seed)) rlBuild(s, rlPlan(d.seed));
  const B = RL_BUILT[s];
  if (!B) return;
  rlPurge(s);
  Object.assign(run, { slot: s, id: d.i, lv: d.lv, rules: run.own ? run.rules : d.ru, theme: B.theme, owner: !!run.own, lastMsgAt: game.time, t0: game.time, tStart: null, bossSeen: false });
  const st = rlState(p);
  if (!rlInside(p)) st.ret = { x: Math.round(p.x), y: Math.round(p.y) };
  st.open = { id: run.id, lv: run.lv, own: run.owner ? 1 : 0, at: Date.now(), r: 0 };
  if (p.riding && typeof toggleRide === 'function') toggleRide();
  const T = RL_THEMEN[B.theme];
  moveThrough(spotNear(B.start, 30), T.portal);
  ui.banner(`${T.name} · Stufe ${run.lv}`, run.rules.map((x) => RL_REGELN[x].name).join(' · '));
  ui.log(`${RISSLAUF.name}: ${T.name} · Schlüsselstufe ${run.lv} · Die Uhr läuft, sobald alle da sind.`, 'info');
  rlHud();
  saveGame();
}
// am Anfang des Risses wieder aufstehen (ohne Verlust, mit gut halbem Leben und kurzem Schutz)
function rlRevive() {
  const run = game.rlRun;
  const p = game.player;
  if (!run || !p.dead || run.slot < 0 || !RL_BUILT[run.slot]) return;
  const s = playerStats(p);
  const at = spotNear(RL_BUILT[run.slot].start, 40);
  p.x = at.x;
  p.y = at.y;
  p.hp = Math.round(s.maxHp * 0.6);
  p.mp = Math.round(s.maxMp * 0.6);
  p.dead = false;
  p.deathXpLoss = 0;
  p.protectUntil = game.time + REVIVE_PROTECT;
  p.skillCd = [0, 0, 0, 0, 0];
  run.respawnAt = 0;
  $('panelDeath').hidden = true;
  vfxPillar(p, RL_THEMEN[run.theme].portal);
  saveGame();
}
// Schlüsselstufe nach einem abgebrochenen oder zu spät geschafften Lauf: −1, aber nur für den, der den Riss geöffnet
// hat, und nur auf der eigenen Schlüsselstufe (niedrigere Stufen sind Übungsläufe ohne Abzug)
function rlPenalty(st, lv, own) {
  if (!own || lv < st.k) return '';
  const old = st.k;
  st.k = Math.max(1, old - 1);
  return st.k < old ? `Schlüsselstufe ${old} → ${st.k}` : '';
}
function rlHist(st, lv, res, t) {
  st.hist.unshift([lv, res, Math.round(t || 0), Date.now()]);
  if (st.hist.length > 8) st.hist.length = 8;
}
// Verlassen (Ausgang, Knopf, Ende vom Host)
function rlStop(why) {
  const run = game.rlRun;
  if (!run) return;
  game.rlRun = null;
  const p = game.player;
  const st = rlState(p);
  if (run.slot >= 0) {
    if (run.mode === 'client') {
      if (why !== 'host' && why !== 'lost') netSocial('host', { k: 'rlv', i: run.id });
      rlPurge(run.slot);
    } else if (rlHost.slots[run.slot] && rlHost.slots[run.slot].id === run.id) rlDrop(run.slot, 'me', null);
  }
  // Strafe: Uhr lief, Riss nicht geschlossen, nicht wegen eines verlorenen Hosts
  const started = run.st && (run.st.ph === 'r' || run.st.ph === 'd');
  if (run.slot >= 0 && !run.done && started && why !== 'lost') {
    const txt = rlPenalty(st, run.lv, run.owner);
    rlHist(st, run.lv, 0, run.st ? run.st.t : 0);
    st.runs++;
    ui.log(`${RISSLAUF.name} abgebrochen${txt ? ' · ' + txt : ''}`, 'warn');
    if (txt) ui.banner('Riss verlassen', txt);
  }
  st.open = null;
  if (p.dead && rlInside(p)) {
    const s = playerStats(p);
    p.hp = s.maxHp;
    p.mp = s.maxMp;
    p.dead = false;
    p.deathXpLoss = 0;
    $('panelDeath').hidden = true;
  }
  if (rlInside(p)) moveThrough(rlReturnSpot(), RISSLAUF.color);
  rlHud();
  saveGame();
}
// Belohnung (Gold, Splitter, EP, Ätherkerne, Juwel) für eine Schlüsselstufe
function rlLohn(L, inTime, rules) {
  const W = RISSLAUF.lohn;
  const k = (inTime ? 1 : W.spaet) * (rlHat(rules, 'zeitdruck') ? W.eile : 1);
  const kern = L >= W.kernAb ? Math.min(W.kernMax, 1 + Math.floor((L - W.kernAb) / W.kernJe)) : 0;
  return {
    gold: Math.round(((W.gold[0] + W.gold[1] * L) * k) / 100) * 100,
    splitter: Math.round(Math.min(W.splitter[2], W.splitter[0] + W.splitter[1] * L) * k),
    xp: Math.round((W.xp[0] + W.xp[1] * L) * k),
    kerne: inTime ? kern : Math.floor(kern / 2),
    juwel: inTime ? Math.min(W.juwel[2], W.juwel[0] + W.juwel[1] * L) * (rlHat(rules, 'zeitdruck') ? W.eile : 1) : 0,
    juwel2: L >= W.juwel2Ab
  };
}
// Riss geschlossen: Belohnung, Schlüsselstufe, Bestwerte, Ergebnisfenster
// Die Belohnung rechnet jedes Gerät selbst: Stufe und Regeln wie beim Start des eigenen Laufs, die Zeit aus der eigenen
// Uhr (seit die Uhr lief, plus die Tode); der Host darf sie nur um wenige Sekunden genauer machen. Ohne erschienenen
// Rissherrn, ohne eigene Uhr oder wenn er im eigenen Bild noch lebt, gibt es nichts.
function rlCheckEnd(run, d) {
  const p = game.player;
  if (!p || run.tStart == null || !run.bossSeen || d.lv !== run.lv || rlSlotAt(p.x, p.y) !== run.slot) return null;
  for (const m of monstersNear(p.x, p.y, 2400)) if (!m.dead && m.type && m.type.rissHerr && rlMonSlot(m) === run.slot) return null;
  const lim = Math.round(RISSLAUF.time * (rlHat(run.rules, 'zeitdruck') ? RISSLAUF.rush : 1));
  // eigene Führung: die Spielzeit des Hosts ist die eigene; beim Mitspieler die echte Zeit seit dem Start der Uhr
  const own = run.mode === 'local' ? d.t : (performance.now() - run.tStartReal) / 1000 + d.d * RISSLAUF.deathTime;
  // höchstens 3 s schneller als die eigene Uhr (Verzögerung im Netz), höchstens 10 s langsamer
  const t = Math.max(0, Math.min(own + 10, Math.max(own - 3, d.t)));
  return { L: run.lv, lim, t, inTime: !!d.it && t <= lim + 1, fast: !!d.f && t <= lim * (1 - RISSLAUF.fast) + 1, deaths: d.d };
}
function rlFinish(run, d) {
  const p = game.player;
  const st = rlState(p);
  run.done = true;
  const E = rlCheckEnd(run, d);
  if (!E) {
    st.open = null;
    ui.log(`${RISSLAUF.name}: Das Ende des Risses ließ sich nicht bestätigen – keine Belohnung.`, 'warn');
    rlHud();
    saveGame();
    return;
  }
  const L = E.L;
  const inTime = E.inTime;
  const L2 = rlLohn(L, inTime, run.rules);
  const got = [];
  p.gold += L2.gold;
  ui.loot('Gold', L2.gold, lootIconUrl('gold'), '#ffd96a');
  got.push(['Gold', rlFmt(L2.gold)]);
  giveSplinters(L2.splitter);
  got.push(['Seelensplitter', String(L2.splitter)]);
  if (L2.kerne) {
    p.materials.aetherkern = (p.materials.aetherkern || 0) + L2.kerne;
    if (typeof materialIconUrl === 'function') ui.loot('Ätherkern', L2.kerne, materialIconUrl('aetherkern'), MATERIAL_COLORS.aetherkern);
    got.push(['Ätherkerne', String(L2.kerne)]);
  }
  if (L2.juwel > 0 && typeof juwelDrop === 'function' && p.level >= 75 && Math.random() < L2.juwel) {
    juwelDrop(L2.juwel2 ? 2 : 1);
    got.push(['Juwel', '1']);
  }
  gainXp(L2.xp);
  got.push(['Erfahrung', rlFmt(L2.xp)]);
  // Schlüsselstufe: in der Zeit +1 bzw. +2 (von der gelaufenen Stufe aus), zu spät −1 (nur auf der eigenen Stufe)
  const old = st.k;
  if (inTime) st.k = Math.max(st.k, L + (E.fast ? 2 : 1));
  else rlPenalty(st, L, run.owner);
  // Bestwerte (nur in der Zeit)
  let neu = false;
  const t = E.t;
  if (inTime) {
    if (L > st.best || (L === st.best && (!st.bestT || t < st.bestT))) { st.best = L; st.bestT = Math.round(t); neu = true; }
    if (L > (st.wkBest | 0) || (L === st.wkBest && (!st.wkT || t < st.wkT))) { st.wkBest = L; st.wkT = Math.round(t); }
    st.wins++;
  }
  st.runs++;
  rlHist(st, L, inTime ? 2 : 1, t);
  st.open = null;
  run.res = { L, inTime, fast: E.fast, t, lim: E.lim, deaths: E.deaths, old, k: st.k, got, neu, rules: run.rules, theme: run.theme };
  const T = RL_THEMEN[run.theme] || RL_THEMEN.kristall;
  ui.banner(inTime ? 'Riss geschlossen!' : 'Riss geschlossen – zu spät', `${T.name} · Stufe ${L} · ${rlClock(t)}`);
  ui.log(`${RISSLAUF.name}: Stufe ${L} in ${rlClock(t)} geschlossen${inTime ? '' : ' (zu spät)'} · Schlüsselstufe ${old} → ${st.k}`, inTime ? 'level' : 'warn');
  if (neu) ui.log(`${RISSLAUF.name}: Neuer Bestwert – Stufe ${L} in ${rlClock(t)}!`, 'level');
  rlSummary(run.res);
  rlHud();
  saveGame();
}

// Nachrichten zum Lauf (vom Host bzw. aus der eigenen Führung)
function rlOnMsg(raw) {
  const p = game.player;
  if (!p || !raw || typeof raw !== 'object') return;
  const d = rlClean(raw);
  const run = game.rlRun;
  if (d.k === 'rlg') {
    if (run && run.slot < 0) rlGo(d);
    return;
  }
  if (d.k === 'rli') {
    if (d.s >= 0 && d.i) rlInviteShow(d);
    return;
  }
  if (d.k === 'rlf') {
    if (run && run.slot < 0) {
      game.rlRun = null;
      ui.log(`${RISSLAUF.name}: ${RL_WHY[d.r] || 'Das geht gerade nicht.'}`, 'warn');
      rlHud();
    }
    return;
  }
  if (!run || run.slot < 0 || run.id !== d.i) return;
  run.lastMsgAt = game.time;
  if (d.k === 'rls') {
    const was = run.st ? run.st.ph : '';
    run.st = d;
    run.stAt = game.time;
    if (d.b) run.bossSeen = true;
    if (d.ph === 'r' && run.tStart == null) {
      // eigene Uhr ab dem Start (wer später dazukommt, übernimmt die bisherige Zeit des Hosts)
      run.tStart = game.time - d.t;
      run.tStartReal = performance.now() - d.t * 1000;
      const st = rlState(p);
      if (st.open && st.open.id === run.id) st.open.r = 1;
    }
    if (was !== 'r' && d.ph === 'r') {
      ui.banner('Die Uhr läuft!', `${rlClock(d.lim)} – findet und schließt den Riss`);
      if (typeof snd !== 'undefined' && snd.levelUp) try { snd.levelUp(); } catch (e) { /* ohne Klang */ }
    }
    rlHud();
  } else if (d.k === 'rlb') {
    run.bossSeen = true;
    const T = RL_THEMEN[run.theme];
    ui.banner('Der Rissherr ist erschienen!', `${T ? T.herr : ''} · Im letzten Raum`);
    if (typeof shakeScreen === 'function') shakeScreen(6);
  } else if (d.k === 'rlh') {
    if (d.on) ui.banner('Schildbann!', 'Besiegt die Schildwächter');
    else ui.log('Der Schild des Rissherrn ist gebrochen.', 'info');
  } else if (d.k === 'rle') {
    if (!run.done) rlFinish(run, d);
  } else if (d.k === 'rlk') {
    if (d.r === 'zu') ui.log('Der Riss schließt sich und bringt dich zurück.', 'info');
    else if (d.r === 'weg') ui.log('Du hast den Riss verlassen.', 'warn');
    else if (d.r === 'zeit') ui.log('Der Riss hat sich wieder geschlossen.', 'warn');
    rlStop('host');
  }
}

// --- Regeln, die die eigene Figur treffen (jedes Gerät für sich) ---------------------------------------------------
const rlPct = (a, L) => Math.min(a[2], a[0] + a[1] * L);
function rlHurt(pct, kind) {
  const p = game.player;
  if (!p || p.dead || !game.stats) return;
  const amt = Math.max(1, Math.round(game.stats.maxHp * pct));
  damagePlayer(amt, null, kind === 'dot' ? { dot: true } : { sure: true });
}
// Bersten und Giftspur beim Tod eines Monsters im eigenen Riss (auf jedem Gerät genau einmal: monsterDeathFx)
const _rlDeathFx = monsterDeathFx;
// eslint-disable-next-line no-global-assign
monsterDeathFx = function (m) {
  _rlDeathFx(m);
  try {
    const run = game.rlRun;
    if (!run || run.slot < 0 || !m || m.isStone || rlMonSlot(m) !== run.slot) return;
    if (m.type && m.type.rissHerr) return;
    const x = m.x;
    const y = feetY(m);
    if (rlHat(run.rules, 'berstend')) {
      const B = RISSLAUF.bersten;
      addEffect({ type: 'warn', x, y, r: B.r, dur: B.delay, color: '#ff4a2a' });
      later(B.delay, () => {
        const r2 = game.rlRun;
        if (!r2 || r2 !== run) return;
        particles(x, y - 10, { count: 18, color: ['#ff8a4a', '#ffd36a', '#c8402f'], speed: [80, 220], life: [0.3, 0.6], size: [2, 4], drag: 2.5 });
        const p = game.player;
        if (p && !p.dead && hyp(p.x - x, (p.y - y) * 1.2) < B.r) rlHurt(rlPct(B.pct, run.lv));
      });
    }
    if (rlHat(run.rules, 'giftspur')) {
      const G = RISSLAUF.gift;
      addEffect({ type: 'warn', x, y, r: G.r, dur: G.dur, color: '#6ad84a' });
      run.pools.push({ x, y, until: game.time + G.dur, next: game.time + 0.4 });
    }
  } catch (e) { /* ein Fehler hier darf den Kampf nie aufhalten */ }
};
function rlRulesTick(run) {
  const p = game.player;
  if (!p || p.dead || run.slot < 0 || rlSlotAt(p.x, p.y) !== run.slot || !run.st || run.st.ph !== 'r') return;
  // Giftlachen
  if (run.pools.length) {
    const G = RISSLAUF.gift;
    run.pools = run.pools.filter((q) => q.until > game.time);
    for (const q of run.pools) {
      if (game.time < q.next) continue;
      q.next = game.time + G.every;
      if (hyp(p.x - q.x, (p.y - q.y) * 1.2) < G.r) rlHurt(G.pct, 'dot');
    }
  }
  // Rissblitze: nicht im ersten Raum und nicht in den ersten Sekunden
  if (rlHat(run.rules, 'blitze')) {
    const Bz = RISSLAUF.blitz;
    if (!run.blitzAt) run.blitzAt = game.time + randInt(Bz.every[0], Bz.every[1]);
    const B = RL_BUILT[run.slot];
    const r0 = B && B.rooms[0];
    const inStart = r0 && p.x / TILE >= r0.x - 1 && p.x / TILE <= r0.x + r0.w + 1 && p.y / TILE >= r0.y - 1 && p.y / TILE <= r0.y + r0.h + 1;
    if (game.time >= run.blitzAt) {
      run.blitzAt = game.time + randInt(Bz.every[0], Bz.every[1]);
      if (inStart) return;
      const spots = [{ x: p.x + rand(-30, 30), y: p.y + rand(-24, 24) }];
      for (let k = 0; k < 2; k++) {
        const a = Math.random() * Math.PI * 2;
        const d = rand(90, 200);
        const c = { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.8 };
        if (canStand(c.x, c.y, 6)) spots.push(c);
      }
      for (const c of spots) addEffect({ type: 'warn', x: c.x, y: c.y, r: Bz.r, dur: Bz.delay, color: '#9fd8ff' });
      later(Bz.delay, () => {
        if (game.rlRun !== run) return;
        for (const c of spots) addEffect({ type: 'bolt', x: c.x, y: c.y, dur: 0.35, color: '#cfe8ff' });
        if (typeof shakeScreen === 'function') shakeScreen(3);
        const q = game.player;
        if (q && !q.dead && spots.some((c) => hyp(q.x - c.x, (q.y - c.y) * 1.2) < Bz.r)) rlHurt(rlPct(Bz.pct, run.lv));
      });
    }
  }
}
// Raserei und Schildbann sichtbar machen (auch bei Mitspielern: aus Leben und Zustand)
function rlFxTick(run) {
  const now = game.time;
  // Grafik „Niedrig“: ohne Funken (der Schild steht in der Anzeige, Treffer zeigen „Schild!“)
  if (now < (run.fxAt || 0) || (typeof opts !== 'undefined' && opts.graphics === 'niedrig')) return;
  run.fxAt = now + 0.35;
  const p = game.player;
  const wut = rlHat(run.rules, 'rasend');
  for (const m of monstersNear(p.x, p.y, 900)) {
    if (m.dead || m.isStone || rlMonSlot(m) !== run.slot) continue;
    if (m.type && m.type.rissHerr) {
      if (run.st && run.st.sh) {
        const c = bodyCenter(m);
        particles(c.x + rand(-26, 26), c.y + rand(-10, 18), { count: 3, color: ['#9fd8ff', '#e8f6ff'], speed: [20, 60], life: [0.5, 0.9], size: [2, 3.5], drag: 1.5, angle: -Math.PI / 2, spread: 0.6 });
      }
      continue;
    }
    if (wut && m.hp < m.maxHp * RISSLAUF.wut.at) {
      const c = bodyCenter(m);
      particles(c.x, c.y - 6, { count: 2, color: ['#ff3a2a', '#ff8a4a'], speed: [20, 50], life: [0.3, 0.6], size: [2, 3], drag: 2, angle: -Math.PI / 2, spread: 0.8 });
    }
  }
}
// Schildbann: der Rissherr ist unverwundbar (Treffer zeigen „Schild!“ wie beim versiegelten Instanzboss)
function rlBossShielded(m) {
  const s = m.rlSlot != null ? m.rlSlot : rlMonSlot(m);
  if (s < 0) return false;
  const S = rlHost.slots[s];
  if (S && net.mode !== 'client') return !!S.shield;
  const run = game.rlRun;
  return !!(run && run.slot === s && run.st && run.st.sh);
}
if (typeof instSealed === 'function') {
  const _rlInstSealed = instSealed;
  // eslint-disable-next-line no-global-assign
  instSealed = function (m) {
    if (m && m.type && m.type.rissHerr) return rlBossShielded(m);
    return _rlInstSealed(m);
  };
}

// --- Takt ----------------------------------------------------------------------------------------------------------
function rlTick() {
  const p = game.player;
  if (!p || !game.running) return;
  rlTickHost();
  if (WAECHTER) return;
  // anderer Charakter (Wechsel ohne Neuladen): der Lauf gehörte der alten Figur
  if (game.rlRun && game.rlRun.p !== p) game.rlRun = null;
  const run = game.rlRun;
  if (!run) {
    // nach dem Neuladen im Feld eines Risses: zurück; ein offener Lauf von vorher zählt als abgebrochen
    const st = p.riss;
    if (st && st.open) {
      const o = st.open;
      rlState(p).open = null;
      // nur, wenn die Uhr schon lief (vorher ist Verlassen ohne Abzug)
      if (o.r) {
        const txt = rlPenalty(rlState(p), Math.max(1, o.lv | 0), !!o.own);
        rlHist(rlState(p), o.lv | 0, 0, 0);
        rlState(p).runs++;
        ui.log(`${RISSLAUF.name}: Dein letzter Lauf (Stufe ${o.lv | 0}) wurde nicht beendet${txt ? ' · ' + txt : ''}`, 'warn');
      }
      saveGame();
    }
    if (rlInside(p) && !p.dead) moveThrough(rlReturnSpot(), RISSLAUF.color);
    return;
  }
  // Antwort des Hosts bleibt aus
  if (run.slot < 0) {
    if (game.time - run.askAt > 8) {
      game.rlRun = null;
      ui.log(net.mode === 'client' ? `${RISSLAUF.name}: Keine Antwort vom Host des Kanals – spielt er eine ältere Version?` : `${RISSLAUF.name}: Der Riss ließ sich nicht öffnen.`, 'warn');
      rlHud();
    }
    return;
  }
  if (run.mode === 'client' && (net.mode !== 'client' || game.time - run.lastMsgAt > RISSLAUF.hostLost)) {
    ui.log(`${RISSLAUF.name}: Die Verbindung zum Riss ist abgerissen – zurück in die Welt (ohne Verlust der Schlüsselstufe).`, 'warn');
    rlStop('lost');
    return;
  }
  if (p.dead && run.respawnAt && game.time >= run.respawnAt) rlRevive();
  try {
    rlRulesTick(run);
    rlFxTick(run);
  } catch (e) { /* weiter */ }
  rlHud();
}
const _rlRaidWatch = raidWatch;
// eslint-disable-next-line no-global-assign
raidWatch = function () {
  _rlRaidWatch();
  try { rlTick(); } catch (e) { console.warn('Risslauf:', e); }
};

// --- Belohnung je Monster: Erfahrung und etwas Gold, keine Gegenstände ---------------------------------------------
function rlKillReward(m) {
  const p = game.player;
  const run = game.rlRun;
  if (!run || run.slot < 0 || rlMonSlot(m) !== run.slot || rlSlotAt(p.x, p.y) !== run.slot) return;
  p.kills++;
  run.kills++;
  questEvent('kill', m);
  const boss = m.type && m.type.rissHerr;
  const k = boss ? 20 : m.type && m.type.rissElite ? 1 : 1 / rlScale(run.st ? run.st.m : 1).n;
  const xp = Math.max(1, Math.round(m.xp * MOB_XP_MUL * xpFactor(p.level, m.level) * k));
  const gold = !m.gold ? 0 : Math.round(randInt(m.gold[0], m.gold[1]) * k * (boss ? 1 : 0.6));
  if (gold > 0) {
    p.gold += gold;
    run.gold += gold;
    addText(m.x + 14, feetY(m) - 30, '+' + gold + ' Gold', 'gold');
  }
  run.xp += xp;
  gainXp(xp);
}
// Wer im Feld seines Laufs steht, bekommt jeden Kill dieses Felds; wer nicht dazugehört, nichts
const _rlNetEligible = netEligible;
// eslint-disable-next-line no-global-assign
netEligible = function (m, who, myHitAt) {
  const s = rlMonSlot(m);
  if (s >= 0 && m && m.respawn === false && !m.isStone) {
    const run = game.rlRun;
    const me = game.player;
    return !!(run && me && run.slot === s && rlSlotAt(me.x, me.y) === s);
  }
  return _rlNetEligible(m, who, myHitAt);
};
const _rlRewardKill = rewardKill;
// eslint-disable-next-line no-global-assign
rewardKill = function (m) {
  if (m && m.respawn === false && !m.isStone && rlMonSlot(m) >= 0) {
    rlKillReward(m);
    return;
  }
  return _rlRewardKill(m);
};

// Tod im Riss: kein Fenster, kein Verlust – nach 5 s am Anfang des Risses wieder auf; jeder Tod kostet 10 s
const _rlShowDeath = ui.showDeath;
ui.showDeath = function (lostXp) {
  const run = game.rlRun;
  const p = game.player;
  if (run && run.slot >= 0 && p && rlSlotAt(p.x, p.y) === run.slot) {
    this.closePanels();
    p.deathXpLoss = 0;
    run.respawnAt = game.time + RISSLAUF.respawn;
    run.deaths++;
    ui.banner('Gefallen', `In ${RISSLAUF.respawn} Sekunden stehst du am Anfang des Risses wieder auf (−${RISSLAUF.deathTime} s)`);
    rlHud();
    return;
  }
  return _rlShowDeath.call(this, lostXp);
};
const _rlVillageSpawn = villageSpawn;
// eslint-disable-next-line no-global-assign
villageSpawn = function (p) {
  if (p && rlInside(p)) {
    const run = game.rlRun;
    return run && run.slot >= 0 && p === game.player && RL_BUILT[run.slot] ? RL_BUILT[run.slot].start : rlReturnSpot();
  }
  return _rlVillageSpawn(p);
};

// --- Bild, Karte, Musik --------------------------------------------------------------------------------------------
if (typeof regionRect3 === 'function') {
  const _rlRegionRect3 = regionRect3;
  // eslint-disable-next-line no-global-assign
  regionRect3 = function (x, y) {
    const s = rlSlotAt(x, y);
    if (s < 0) return _rlRegionRect3(x, y);
    const R = rlSlotRect(s);
    return { r: [R.x, R.y, R.w, R.h], inset: 1, key: 'd' + rlKey(s) };
  };
}
if (typeof mapAreaAt === 'function') {
  const _rlMapAreaAt = mapAreaAt;
  // eslint-disable-next-line no-global-assign
  mapAreaAt = function (tx, ty) {
    const s = rlSlotAt(tx * TILE, ty * TILE);
    if (s < 0) return _rlMapAreaAt(tx, ty);
    const R = rlSlotRect(s);
    const key = rlKey(s);
    if (!rlHost.area || rlHost.area.key !== key) rlHost.area = { key, x: R.x, y: R.y, w: R.w, h: R.h, wm: null, dungeon: -1 };
    return rlHost.area;
  };
}
if (typeof music !== 'undefined' && music.moodAt) {
  const _rlMood = music.moodAt;
  music.moodAt = function (x, y) {
    if (rlSlotAt(x, y) >= 0) return 'dunkel';
    return _rlMood.call(this, x, y);
  };
}

// --- Ausgang und Rissmeisterin -------------------------------------------------------------------------------------
const _rlOpenNpc = ui.openNpc;
ui.openNpc = function (npc) {
  if (npc && npc.id === 'ausgang' && npc.rlSlot != null) {
    this.closePanels();
    $('npcTitle').textContent = npc.name;
    rlExitWindow();
    $('panelNpc').hidden = false;
    return;
  }
  if (npc && npc.id === RISSLAUF.npc) {
    this.closePanels();
    $('npcTitle').textContent = npc.name;
    rlWindowOpen(npc);
    this.renderNpcQuests(npc);
    $('panelNpc').hidden = false;
    return;
  }
  return _rlOpenNpc.call(this, npc);
};
function rlExitWindow() {
  const run = game.rlRun;
  const body = $('npcBody');
  const open = run && run.slot >= 0 && !run.done && run.st && run.st.ph === 'r';
  body.innerHTML = `<p>${open ? 'Der Steinkreis bringt dich zurück. Der Riss ist noch nicht geschlossen – verlässt du ihn jetzt, sinkt deine Schlüsselstufe um 1.' : 'Der Steinkreis bringt dich zurück an den Ort, an dem du aufgebrochen bist.'}</p>` +
    `<button type="button" class="btn ${open ? '' : 'btn-primary'}" data-rlexit>Riss verlassen</button>`;
  body.querySelector('[data-rlexit]').addEventListener('click', () => {
    ui.closePanels();
    if (game.rlRun) rlStop('self');
    else if (rlInside(game.player)) moveThrough(rlReturnSpot(), RISSLAUF.color);
  });
}
// Fenster der Rissmeisterin
const rlUi = { lv: 0, party: true, hudKey: '', el: null, touch: false, confirm: false, confirmAt: 0, placeAt: 0 };
function rlLohnHtml(L, rules) {
  const W = rlLohn(L, true, rules);
  return [`${rlFmt(W.gold)} Gold`, `${W.splitter} Seelensplitter`, `${rlFmt(W.xp)} EP`, W.kerne ? `${W.kerne} ${W.kerne === 1 ? 'Ätherkern' : 'Ätherkerne'}` : '', `${Math.round(W.juwel * 100)} % Juwel`].filter(Boolean).join(' · ');
}
function rlRulesHtml(rules) {
  return '<ul class="rl-rules">' + rules.map((id) => `<li style="--rc:${RL_REGELN[id].farbe}"><b>${RL_REGELN[id].name}</b><span>${RL_REGELN[id].text}</span></li>`).join('') + '</ul>';
}
function rlWindowOpen(npc) {
  rlCss();
  const p = game.player;
  const st = rlState(p);
  const rules = rlRegelnDerWoche();
  const busy = rlBusy(p);
  const mates = rlPartyMates();
  if (!rlUi.lv || rlUi.lv > st.k) rlUi.lv = st.k;
  const body = $('npcBody');
  const ende = new Date(rlWeekEnd());
  const opts2 = [];
  for (let L = st.k; L >= 1 && opts2.length < 40; L--) opts2.push(`<option value="${L}"${L === rlUi.lv ? ' selected' : ''}>Stufe ${L}</option>`);
  body.innerHTML =
    `<p class="quest-step raid-step">Dungeon auf Zeit · ab Stufe ${RISSLAUF.minLevel} · allein oder bis ${RISSLAUF.maxPlayers} Spieler</p><h3>${RISSLAUF.name}</h3>` +
    '<p>Hinter mir flackert ein Riss in andere Welten. Jeder Lauf führt durch einen neuen, gewürfelten Dungeon. Besiegt Monster, bis die Rissenergie voll ist – dann erscheint der Rissherr im letzten Raum. Schließt den Riss, bevor die Zeit abläuft.</p>' +
    `<div class="rl-stats"><div><small>Schlüsselstufe</small><b>${st.k}</b></div><div><small>Bestwert</small><b>${st.best ? st.best : '–'}</b>${st.best ? `<small>${rlClock(st.bestT)}</small>` : ''}</div>` +
    `<div><small>Diese Woche</small><b>${st.wkBest ? st.wkBest : '–'}</b>${st.wkBest ? `<small>${rlClock(st.wkT)}</small>` : ''}</div><div><small>Läufe</small><b>${st.wins}/${st.runs}</b></div></div>` +
    `<h4>Regeln dieser Woche</h4>${rlRulesHtml(rules)}<p class="hint-text">Neue Regeln ab Montag, ${ende.toLocaleDateString('de-DE')} (0 Uhr Weltzeit).</p>` +
    `<p class="hint-text">Zeit: ${((RISSLAUF.time * (rules.includes('zeitdruck') ? RISSLAUF.rush : 1)) / 60).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Minuten. In der Zeit geschafft: Schlüsselstufe +1 (mit mehr als einem Drittel Restzeit +2). Auf deiner eigenen Stufe zu spät, verlassen oder abgebrochen: −1. Jeder Tod kostet ${RISSLAUF.deathTime} Sekunden.</p>` +
    `<div class="rl-pick"><label><span>Stufe</span> <select data-rllv>${opts2.join('')}</select></label>` +
    (mates.length ? `<label class="rl-party"><input type="checkbox" data-rlparty ${rlUi.party ? 'checked' : ''}> <span>Gruppe einladen</span> <small>(${mates.length})</small></label>` : '') + '</div>' +
    `<p class="rl-lohn"><b class="legend-text">Belohnung:</b> <span data-rllohn>${rlLohnHtml(rlUi.lv, rules)}</span></p>` +
    `<button type="button" class="btn btn-primary" data-rlgo ${busy ? 'disabled' : ''}>${busy || 'Riss öffnen'}</button>` +
    '<p class="hint-text">Bestenliste: im Fenster „Bestenliste“ unter „Rissläufe“ (Spieler in deinem Kanal).</p>';
  const sel = body.querySelector('[data-rllv]');
  sel.addEventListener('change', () => {
    rlUi.lv = +sel.value || st.k;
    const l = body.querySelector('[data-rllohn]');
    if (l) l.textContent = rlLohnHtml(rlUi.lv, rules);
  });
  const pc = body.querySelector('[data-rlparty]');
  if (pc) pc.addEventListener('change', () => { rlUi.party = pc.checked; });
  body.querySelector('[data-rlgo]').addEventListener('click', () => rlStart(rlUi.lv, !!(pc && pc.checked)));
}

// Einladung der Gruppe: kleines Fenster mit Countdown
function rlInviteShow(d) {
  const p = game.player;
  const decline = () => rlToHost({ k: 'rlx', s: d.s | 0, i: d.i | 0 });
  if (!p || rlBusy(p) || (d.lg | 0) !== RISSLAUF.lage) { decline(); return; }
  rlCss();
  let el = document.getElementById('rlInv');
  if (el) el.remove();
  el = document.createElement('div');
  el.id = 'rlInv';
  el.setAttribute('role', 'dialog');
  const rules = Array.isArray(d.ru) ? d.ru.filter((x) => RL_REGELN[x]) : [];
  el.innerHTML = `<b class="no-tr">${escapeHtml(String(d.n || '?'))}</b> <span>öffnet einen Riss</span> <span>Stufe ${d.lv | 0}</span>` +
    `<small>${rules.map((x) => RL_REGELN[x].name).join(' · ')}</small><div><button type="button" class="btn btn-primary" data-y>Mitmachen</button> <button type="button" class="btn" data-n>Ablehnen</button> <small data-t></small></div>`;
  document.body.appendChild(el);
  const until = performance.now() + Math.max(5, (d.t | 0) - 2) * 1000;
  const close = () => { clearInterval(tick); el.remove(); };
  const tick = setInterval(() => {
    const left = Math.ceil((until - performance.now()) / 1000);
    const t = el.querySelector('[data-t]');
    if (t) t.textContent = left + ' s';
    if (left <= 0) { close(); decline(); }
  }, 250);
  el.querySelector('[data-y]').addEventListener('click', () => {
    close();
    const q = game.player;
    const busy = rlBusy(q);
    if (busy) { ui.log(`${RISSLAUF.name}: ${busy}`, 'warn'); decline(); return; }
    game.rlRun = rlNewRun(d.i | 0, d.lv | 0, rules, false);
    rlToHost({ k: 'rlj', s: d.s | 0, i: d.i | 0, lg: RISSLAUF.lage });
  });
  el.querySelector('[data-n]').addEventListener('click', () => { close(); decline(); });
}

// --- Anzeige während des Laufs -------------------------------------------------------------------------------------
function rlCss() {
  if (document.getElementById('rlCss')) return;
  const st = document.createElement('style');
  st.id = 'rlCss';
  st.textContent =
    '#rlHud{position:fixed;left:8px;top:90px;z-index:5;pointer-events:none;color:#efe4ff;text-shadow:0 1px 2px #000}' +
    '#rlHud.rl-pc{width:280px;border-radius:12px;overflow:hidden;font:600 12.5px/1.3 system-ui,sans-serif;background:linear-gradient(180deg,rgba(40,26,66,.94),rgba(16,10,28,.92));border:1px solid rgba(180,140,255,.55);box-shadow:0 4px 16px rgba(0,0,0,.5)}' +
    '#rlHud .hd{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px 10px;background:rgba(180,140,255,.14);border-bottom:1px solid rgba(180,140,255,.3)}' +
    '#rlHud .hd b{color:#d8c0ff;font-size:13px}#rlHud .tm{font:900 16px/1 system-ui,sans-serif;color:#fff}#rlHud .tm.late{color:#ff8a7a}#rlHud .tm.low{color:#ffd36a}' +
    '#rlHud .bd{display:grid;gap:5px;padding:7px 10px 9px}#rlHud .row{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
    '#rlHud .bar{height:8px;border-radius:5px;background:rgba(255,255,255,.14);overflow:hidden}#rlHud .bar i{display:block;height:100%;transition:width .3s;background:linear-gradient(90deg,#6a3ad8,#e0a8ff)}' +
    '#rlHud .bar.boss i{background:linear-gradient(90deg,#c8402f,#ff9a5a)}#rlHud .ru{display:flex;flex-wrap:wrap;gap:3px}#rlHud .ru span{padding:1px 6px;border-radius:8px;font-size:11px;background:rgba(0,0,0,.35);border:1px solid var(--rc)}' +
    '#rlHud .nx{padding:4px 8px;border-radius:8px;background:rgba(180,140,255,.12);border:1px solid rgba(180,140,255,.35);text-align:center;font-weight:700}' +
    '#rlHud button{pointer-events:auto;cursor:pointer;font:700 12px system-ui,sans-serif;color:#fff;background:rgba(74,42,122,.9);border:1px solid #a87ae0;border-radius:8px;padding:3px 10px}#rlHud button:hover{background:#5a3a9a}' +
    '#rlHud.rl-t{display:flex;flex-wrap:wrap;align-items:center;gap:2px 6px;max-width:min(330px,50vw);padding:2px 3px 2px 9px;border-radius:13px;white-space:nowrap;font:600 11px/1.25 system-ui,sans-serif;background:rgba(30,18,50,.82);border:1px solid rgba(180,140,255,.55)}' +
    '#rlHud.rl-t .tm{font-size:12px}#rlHud.rl-t button{padding:0 7px;height:20px;border-radius:10px;font-size:11px}#rlHud.rl-t .bar{flex-basis:100%;height:5px;margin:1px 6px 2px 0}' +
    '#rlSum{position:fixed;left:50%;top:44%;transform:translate(-50%,-50%) scale(.92);opacity:0;z-index:60;min-width:250px;max-width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 40px);overflow:auto;padding:14px 16px 12px;border-radius:12px;background:rgba(22,14,36,.95);border:1px solid rgba(180,140,255,.6);box-shadow:0 6px 24px rgba(0,0,0,.55);color:#efe4ff;font-size:14px;transition:opacity .25s,transform .25s;pointer-events:auto}' +
    '#rlSum.on{opacity:1;transform:translate(-50%,-50%) scale(1)}#rlSum h3{margin:0 26px 8px 0;font-size:16px;color:#d8c0ff}#rlSum .x{position:absolute;top:6px;right:8px;width:30px;height:30px;border:0;border-radius:8px;background:rgba(255,255,255,.08);color:#efe4ff;font-size:16px;cursor:pointer}' +
    '#rlSum dl{display:grid;grid-template-columns:auto auto;gap:4px 14px;margin:0}#rlSum dt{opacity:.8}#rlSum dd{margin:0;text-align:right;font-weight:600}#rlSum dd.g{color:#ffd56a}#rlSum dd.up{color:#9fe7b4}#rlSum dd.down{color:#ff9a8a}' +
    '#rlSum h4{margin:10px 0 4px;font-size:13px;color:#e0c8ff}#rlSum .neu{margin:8px 0 0;padding:4px 8px;border-radius:8px;background:rgba(255,211,77,.12);border:1px solid rgba(255,211,77,.5);color:#ffe08a;text-align:center;font-weight:700}' +
    '#rlInv{position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:61;display:grid;gap:5px;justify-items:center;padding:12px 16px;border-radius:12px;background:rgba(22,14,36,.95);border:1px solid rgba(180,140,255,.6);color:#efe4ff;box-shadow:0 6px 24px rgba(0,0,0,.55);max-width:calc(100vw - 32px);text-align:center}' +
    '#rlInv b{color:#d8c0ff}#rlInv small{opacity:.8}#rlInv .btn{min-height:36px}' +
    '.rl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}.rl-stats div{display:flex;flex-direction:column;align-items:center;padding:6px 4px;border-radius:8px;background:rgba(180,140,255,.08);border:1px solid rgba(180,140,255,.25)}' +
    '.rl-stats b{font-size:18px;color:#e0c8ff}.rl-stats small{font-size:11px;opacity:.8}' +
    '.rl-rules{list-style:none;margin:4px 0;padding:0;display:grid;gap:4px}.rl-rules li{display:flex;flex-direction:column;padding:5px 8px;border-radius:8px;background:rgba(0,0,0,.22);border-left:3px solid var(--rc)}.rl-rules li span{font-size:12px;opacity:.85}' +
    '.rl-pick{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:8px 0}.rl-pick select{min-height:34px;margin-left:4px}.rl-party{display:flex;align-items:center;gap:6px;cursor:pointer}.rl-party input{width:20px;height:20px;margin:0}' +
    '.rl-lohn{font-size:13px}.rl-page{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}.rl-page section{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 10px}' +
    '.rl-page h3{margin:0 0 6px;font-size:15px}.rl-hist{list-style:none;margin:0;padding:0;display:grid;gap:2px;font-size:12px}.rl-hist li{display:flex;justify-content:space-between;gap:8px}.rl-hist .ok{color:#9fe7b4}.rl-hist .late{color:#ffd36a}.rl-hist .ab{color:#ff9a8a}';
  document.head.appendChild(st);
}
const rlBox = (id) => {
  const e = document.getElementById(id);
  if (!e || e.hidden || e.closest('[hidden]')) return null;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? r : null;
};
// Platz: am PC über dem Chat (wie Turm und Prüfungsarena), am Handy eine schmale Pille unter der Lebensanzeige
function rlHudPlace(el) {
  rlUi.placeAt = performance.now();
  if (rlUi.touch) {
    const c = rlBox('hudChar');
    let bottom = c ? c.bottom : 90;
    for (const id of ['buffList', 'partyFrame']) {
      const r = rlBox(id);
      if (r && c && r.left < c.right) bottom = Math.max(bottom, r.bottom);
    }
    el.style.left = Math.round(Math.max(6, c ? c.left : 6)) + 'px';
    el.style.top = Math.round(bottom + 4) + 'px';
    el.style.bottom = 'auto';
    return;
  }
  const r = rlBox('chatBox');
  if (r) {
    el.style.left = Math.round(Math.max(4, r.left)) + 'px';
    el.style.top = 'auto';
    el.style.bottom = Math.round(window.innerHeight - r.top + 6) + 'px';
  } else {
    const c = rlBox('hudChar');
    el.style.left = Math.round(c ? c.left : 8) + 'px';
    el.style.top = Math.round((c ? c.bottom : 120) + 6) + 'px';
    el.style.bottom = 'auto';
  }
}
// Restzeit und Anzeige-Daten des eigenen Laufs
function rlView(run) {
  const st = run.st;
  if (!st) return { ph: 'w', el: 0, lim: RISSLAUF.time, pr: 0 };
  const el = st.ph === 'r' ? st.t + Math.max(0, game.time - (run.stAt || game.time)) : st.t;
  return { ph: st.ph, el, lim: st.lim || RISSLAUF.time, pr: st.pr || 0, b: st.b | 0, bh: st.bh || 0, sh: !!st.sh, d: st.d | 0, n: st.m | 0, cd: st.cd || 0, w: st.w | 0, pend: st.p | 0 };
}
function rlHud() {
  const run = game.rlRun;
  const p = game.player;
  const show = !!(run && run.slot >= 0 && p && rlSlotAt(p.x, p.y) === run.slot);
  let el = document.getElementById('rlHud');
  if (!show) {
    if (el) el.remove();
    rlUi.hudKey = '';
    rlUi.confirm = false;
    return;
  }
  rlCss();
  const touch = !!(typeof input !== 'undefined' && input.touchUi);
  if (!el || rlUi.touch !== touch) {
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'rlHud';
    rlUi.touch = touch;
    el.className = touch ? 'rl-t' : 'rl-pc';
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-a]');
      if (!b) return;
      if (b.dataset.a === 'x') {
        const r2 = game.rlRun;
        if (r2 && r2.done) { rlStop('self'); return; }
        rlUi.confirm = !rlUi.confirm;
        rlUi.confirmAt = performance.now();
        rlUi.hudKey = '';
        rlHud();
      } else if (b.dataset.a === 'y') { rlUi.confirm = false; rlStop('self'); } else if (b.dataset.a === 'n') { rlUi.confirm = false; rlUi.hudKey = ''; rlHud(); }
    });
    document.body.appendChild(el);
    rlUi.hudKey = '';
  }
  if (rlUi.confirm && performance.now() - rlUi.confirmAt > 8000) rlUi.confirm = false;
  const v = rlView(run);
  const T = RL_THEMEN[run.theme] || RL_THEMEN.kristall;
  const left = v.lim - v.el;
  const late = v.ph === 'r' && left < 0;
  const timeTxt = v.ph === 'w' || v.ph === 'c' ? rlClock(v.lim) : v.ph === 'd' && run.res ? rlClock(run.res.t) : late ? '+' + rlClock(-left) : rlClock(left);
  const tcls = 'tm' + (late || (run.res && !run.res.inTime) ? ' late' : left < 60 && v.ph === 'r' ? ' low' : '');
  let goal;
  if (v.ph === 'w') goal = v.pend ? `Warte auf die Gruppe … ${v.w} s` : 'Gleich geht es los …';
  else if (v.ph === 'c') goal = `Die Uhr startet in ${Math.ceil(v.cd)} s`;
  else if (v.ph === 'd') goal = run.res && run.res.inTime ? 'Riss geschlossen!' : 'Riss geschlossen – zu spät';
  else if (v.b === 1) goal = v.sh ? 'Schildbann: besiegt die Schildwächter' : `${T.herr}`;
  else goal = 'Rissenergie sammeln';
  const pct = v.b === 1 ? Math.round(v.bh * 100) : Math.round(v.pr * 100);
  const key = [touch, v.ph, timeTxt, tcls, goal, pct, v.b, v.d, v.n, rlUi.confirm, run.done ? 1 : 0].join('|');
  if (key === rlUi.hudKey && performance.now() - rlUi.placeAt < 1500) return;
  if (key !== rlUi.hudKey) {
    rlUi.hudKey = key;
    const rules = (run.rules || []).map((id) => `<span style="--rc:${RL_REGELN[id].farbe}">${RL_REGELN[id].name}</span>`).join('');
    const bar = `<div class="bar${v.b === 1 ? ' boss' : ''}"><i style="width:${pct}%"></i></div>`;
    const ask = rlUi.confirm ? `<div class="row"><span>${run.done ? 'Zurück in die Welt?' : 'Riss verlassen? Schlüsselstufe −1'}</span><span><button type="button" data-a="y">Ja</button> <button type="button" data-a="n">Nein</button></span></div>` : '';
    if (touch) {
      el.innerHTML = `<b style="color:#d8c0ff">Stufe ${run.lv}</b><span class="${tcls}">${timeTxt}</span><span>${goal}</span><span>${pct} %</span>` +
        (v.d ? `<span>Tode ${v.d}</span>` : '') + `<button type="button" data-a="x" aria-label="Riss verlassen">✕</button>${bar}` + (ask ? `<div style="flex-basis:100%">${ask}</div>` : '');
    } else {
      el.innerHTML = `<div class="hd"><b>${T.name} · Stufe ${run.lv}</b><span class="${tcls}">${timeTxt}</span></div><div class="bd">` +
        `<div class="row"><span>${goal}</span><span>${pct} %</span></div>${bar}` +
        (rules ? `<div class="ru">${rules}</div>` : '') +
        `<div class="row"><small>Tode ${v.d} · Spieler ${Math.max(1, v.n)}</small><button type="button" data-a="x">${run.done ? 'Zurück' : 'Verlassen'}</button></div>${ask}</div>`;
    }
  }
  rlHudPlace(el);
}
// Ergebnisfenster
function rlSummary(res) {
  const show = () => {
    const p = game.player;
    if (p && p.dead) { later(0.5, show); return; }
    rlCss();
    let el = document.getElementById('rlSum');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'rlSum';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Risslauf-Ergebnis');
    const T = RL_THEMEN[res.theme] || RL_THEMEN.kristall;
    const st = rlState(p);
    const kc = res.k > res.old ? 'up' : res.k < res.old ? 'down' : '';
    el.innerHTML = `<button class="x" type="button" aria-label="Schließen">✕</button>` +
      `<h3>${res.inTime ? 'Riss geschlossen!' : 'Riss geschlossen – zu spät'}</h3><dl>` +
      `<dt>Riss</dt><dd>${T.name}</dd><dt>Stufe</dt><dd>${res.L}</dd>` +
      `<dt>Zeit</dt><dd class="${res.inTime ? 'up' : 'down'}">${rlClock(res.t)} / ${rlClock(res.lim)}</dd>` +
      `<dt>Tode</dt><dd>${res.deaths}</dd>` +
      `<dt>Schlüsselstufe</dt><dd class="${kc}">${res.old} → ${res.k}</dd>` +
      `<dt>Bestwert</dt><dd>${st.best ? `Stufe ${st.best} · ${rlClock(st.bestT)}` : '–'}</dd>` +
      `<dt>Diese Woche</dt><dd>${st.wkBest ? `Stufe ${st.wkBest} · ${rlClock(st.wkT)}` : '–'}</dd></dl>` +
      `<h4>Belohnung</h4><dl>${res.got.map(([n, v]) => `<dt>${n}</dt><dd class="g">+${v}</dd>`).join('')}</dl>` +
      (res.neu ? '<p class="neu">Neuer Bestwert!</p>' : '') +
      (res.rules && res.rules.length ? `<h4>Regeln</h4><p style="margin:0;font-size:12px">${res.rules.map((id) => (RL_REGELN[id] ? RL_REGELN[id].name : '')).filter(Boolean).join(' · ')}</p>` : '');
    document.body.appendChild(el);
    let timer = 0;
    const close = () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', esc, true);
      el.classList.remove('on');
      setTimeout(() => el.remove(), 260);
    };
    const outside = (e) => { if (!el.contains(e.target)) close(); };
    const esc = (e) => { if (e.key === 'Escape' && el.isConnected) { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', esc, true);
    el.querySelector('.x').addEventListener('click', (e) => { e.stopPropagation(); close(); });
    requestAnimationFrame(() => el.classList.add('on'));
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 400);
    timer = setTimeout(close, 30000);
  };
  show();
}

// --- Seite „Rissläufe“ im Charakterfenster ---------------------------------------------------------------------------
function rlPageHtml(p) {
  rlCss();
  const st = rlState(p);
  const rules = rlRegelnDerWoche();
  const res = { 2: ['ok', 'in der Zeit'], 1: ['late', 'zu spät'], 0: ['ab', 'abgebrochen'] };
  const hist = st.hist.length ? '<ul class="rl-hist">' + st.hist.map(([lv, r, t, at]) => {
    const [c, txt] = res[r] || res[0];
    return `<li><span>Stufe ${lv | 0}</span><span class="${c}">${txt}</span><span>${t ? rlClock(t) : '–'}</span><small>${new Date(at || 0).toLocaleDateString('de-DE')}</small></li>`;
  }).join('') + '</ul>' : '<p class="hint-text">Noch kein Lauf.</p>';
  return '<div class="rl-page">' +
    `<section><h3>${RISSLAUF.name}</h3><div class="rl-stats"><div><small>Schlüsselstufe</small><b>${st.k}</b></div><div><small>Bestwert</small><b>${st.best || '–'}</b>${st.best ? `<small>${rlClock(st.bestT)}</small>` : ''}</div>` +
    `<div><small>Diese Woche</small><b>${st.wkBest || '–'}</b>${st.wkBest ? `<small>${rlClock(st.wkT)}</small>` : ''}</div><div><small>Läufe</small><b>${st.wins}/${st.runs}</b></div></div>` +
    `<p class="hint-text">Ab Stufe ${RISSLAUF.minLevel} bei der Rissmeisterin in Kazehana, Mondfall und den Lagern der Stufe-80-Karten.</p></section>` +
    `<section><h3>Regeln dieser Woche</h3>${rlRulesHtml(rules)}</section>` +
    `<section><h3>Letzte Läufe</h3>${hist}</section>` +
    `<section><h3>Belohnung</h3><p class="rl-lohn">Stufe ${st.k}: ${rlLohnHtml(st.k, rules)}</p><p class="hint-text">Zu spät geschafft: halbe Belohnung, kein Juwel. Dazu Erfahrung und etwas Gold für jedes Monster.</p></section>` +
    '</div>';
}
if (typeof CHAR_TABS_EXTRA !== 'undefined') {
  CHAR_TABS_EXTRA.push({ id: 'risslauf', label: 'Rissläufe', show: (p) => p.level >= RISSLAUF.minLevel || !!(p.riss && p.riss.runs), html: rlPageHtml, bind: () => {} });
}

// --- Bestenliste: Reiter „Rissläufe“ (Spieler im Kanal und die eigenen Charaktere, ohne Datenbank) ------------------
// Jede Figur schickt ihren Bestwert im Spielerzustand mit (rl: [Stufe, Sekunden]); ältere Versionen schicken nichts.
if (typeof netPlayerState === 'function') {
  const _rlNetPlayerState = netPlayerState;
  // eslint-disable-next-line no-global-assign
  netPlayerState = function () {
    const s = _rlNetPlayerState();
    const r = game.player && game.player.riss;
    if (r && r.best > 0) s.rl = [r.best | 0, Math.round(r.bestT || 0)];
    return s;
  };
}
if (typeof netApplyState === 'function') {
  const _rlNetApplyState = netApplyState;
  // eslint-disable-next-line no-global-assign
  netApplyState = function (rp, s) {
    _rlNetApplyState(rp, s);
    if (rp && s) rp.rissBest = Array.isArray(s.rl) && s.rl[0] > 0 && s.rl[0] < 10000 ? [s.rl[0] | 0, Math.max(0, s.rl[1] | 0)] : null;
  };
}
function rlRankList() {
  const out = [];
  const seen = new Set();
  const p = game.running ? game.player : null;
  if (p && p.riss && p.riss.best > 0) {
    out.push({ id: 'me', name: p.name, cls: p.classId, level: p.level, best: p.riss.best, t: p.riss.bestT || 0, online: true, me: true });
    seen.add(p.name + '|' + p.classId);
  }
  if (typeof net !== 'undefined' && net.players) {
    for (const rp of net.players.values()) {
      if (!rp || !rp.name || !rp.rissBest || !CLASSES[rp.classId]) continue;
      out.push({ id: 'n' + rp.name, name: String(rp.name).slice(0, 16), cls: rp.classId, level: rp.level | 0, best: rp.rissBest[0], t: rp.rissBest[1], online: true });
      seen.add(rp.name + '|' + rp.classId);
    }
  }
  try {
    for (const sv of listSaves()) {
      if (!sv || sv.unknown || !sv.riss || !(sv.riss.best > 0) || !CLASSES[sv.classId] || seen.has(sv.name + '|' + sv.classId)) continue;
      out.push({ id: 'c' + sv.name, name: sv.name, cls: sv.classId, level: sv.level | 0, best: sv.riss.best | 0, t: sv.riss.bestT | 0, own: true });
    }
  } catch (e) { /* ohne Charakterplätze */ }
  out.sort((a, b) => b.best - a.best || a.t - b.t || b.level - a.level);
  return out;
}
if (typeof RANK_TABS !== 'undefined' && typeof rankRender === 'function') {
  RANK_TABS.riss = { label: 'Rissläufe', field: null };
  const _rlRankRender = rankRender;
  // eslint-disable-next-line no-global-assign
  rankRender = async function () {
    if (rank.tab !== 'riss') return _rlRankRender.apply(this, arguments);
    const body = $('rankBody');
    if (!body || $('panelRank').hidden) return;
    const tabs = '<div class="rk-tabs" role="tablist">' + Object.entries(RANK_TABS).map(([id, t]) =>
      `<button type="button" role="tab" class="bag-tab${id === rank.tab ? ' on' : ''}" data-rtab="${id}" aria-selected="${id === rank.tab}">${t.label}</button>`).join('') + '</div>';
    const chips = '<div class="rk-cls" role="group" aria-label="Klasse"><button type="button" class="rk-chip' + (!rank.cls ? ' on' : '') + '" data-rcls="">Alle</button>' +
      CLASS_ORDER.map((id) => `<button type="button" class="rk-chip${rank.cls === id ? ' on' : ''}" data-rcls="${id}" style="--cc:${CLASSES[id].color}">${rankClassIcon(id, 18)}<span>${CLASSES[id].name}</span></button>`).join('') + '</div>';
    const all = rlRankList();
    const shown = rank.cls ? all.filter((e) => e.cls === rank.cls) : all;
    const row = (e, i) => {
      const medal = i < 3 ? ` rk-top rk-top${i + 1}` : '';
      return `<li class="rk-row${medal}${e.me ? ' rk-me' : ''}"><span class="rk-place">${i + 1}</span>${rankClassIcon(e.cls)}` +
        `<span class="rk-who"><b class="no-tr">${e.online ? '<i class="rk-on" title="online"></i>' : ''}${escapeHtml(e.name)}</b><small><span>${CLASSES[e.cls].name}</span> · <span>Stufe ${e.level}</span>${e.own ? ' · <span>dein Charakter</span>' : ''}</small></span>` +
        `<span class="rk-val"><b>${e.best}</b><small>${rlClock(e.t)}</small></span></li>`;
    };
    const list = shown.length ? `<ol class="rk-list">${shown.map(row).join('')}</ol>` : '<p class="rk-msg">Noch hat hier niemand einen Riss in der Zeit geschlossen.</p>';
    body.innerHTML = tabs + chips + `<div class="rk-scroll">${list}</div>` +
      '<div class="rk-foot"><small>Höchste in der Zeit geschaffte Schlüsselstufe (bei Gleichstand die schnellere Zeit) – Spieler in deinem Kanal und deine Charaktere auf diesem Gerät.</small>' +
      '<button type="button" class="mini-btn" data-rfresh>Aktualisieren</button></div>';
    body.querySelectorAll('[data-rtab]').forEach((b) => b.addEventListener('click', () => { rank.tab = b.dataset.rtab; rankRender(); }));
    body.querySelectorAll('[data-rcls]').forEach((b) => b.addEventListener('click', () => { rank.cls = b.dataset.rcls; rankRender(); }));
    const rf = body.querySelector('[data-rfresh]');
    if (rf) rf.addEventListener('click', () => rankRender());
  };
}

// --- Rissmeisterin: Aussehen (2D, daraus 3D) und Symbol ------------------------------------------------------------
// Seherin in violetter Robe mit silbernem Saum, langes helles Haar, ein Stab mit einem gespaltenen Kristall
if (typeof NPC_ART !== 'undefined' && typeof villagerArt === 'function') {
  NPC_ART[RISSLAUF.npc] = (ctx) => villagerArt(ctx, {
    skin: '#ecc8a6', boots: '#2a2032', robe: '#3e2a6e', torso: '#3e2a6e', sleeve: '#3e2a6e', cuff: '#d8c8ff', wideSleeves: true, eyes: {},
    behind: (c) => {
      box(c, 11, -46, 2.4, 46, 1, '#4a3a5a');
      poly(c, [[12.2, -58], [9.4, -50], [12.2, -45], [15, -50]], '#c8a0ff');
      stroke(c, '#fff4ff', 0.9, [[12.2, -56], [11.4, -51], [12.6, -48], [12, -46]]);
    },
    body: (c, half) => {
      box(c, -half, -13.5, half * 2, 2.8, 1, '#d8c8ff');
      stroke(c, 'rgba(216,200,255,0.7)', 0.8, [[-4, -24], [0, -18], [4, -24]]);
    },
    head: (c, cx, cy) => {
      hairCap(c, cx, cy, '#e8e2f4', 14);
      box(c, cx - 11, cy - 6.5, 22, 2, 1, '#c8a0ff');
    }
  });
}
if (typeof NPC3 !== 'undefined') {
  NPC3[RISSLAUF.npc] = { skin: '#ecc8a6', robe: '#3e2a6e', torso: '#3e2a6e', hemTrim: '#d8c8ff', cuff: '#d8c8ff', collar: '#d8c8ff', wideSleeves: true, hair: { style: 4, color: '#e8e2f4' }, band: '#c8a0ff', weapon: { kind: 'staff', tier: 3 }, belt: '#d8c8ff', beads: '#c8a0ff' };
}
if (typeof NPC_FORM !== 'undefined') NPC_FORM[RISSLAUF.npc] = { female: true, legLen: 0.37, headForm: { w: 0.93, h: 1.03 } };
if (typeof NPC_TALK_LABEL !== 'undefined') NPC_TALK_LABEL[RISSLAUF.npc] = 'Riss öffnen';
if (typeof NPC_ICONS !== 'undefined' && typeof npcBadge === 'function') {
  NPC_ICONS[RISSLAUF.npc] = (ctx) => npcBadge(ctx, '#3a2468', (c) => {
    // ein gezackter Spalt, der violett leuchtet
    poly(c, [[-1.5, -8], [2.5, -3.5], [0, -1], [3, 3.5], [-0.5, 8.5], [0.8, 3], [-2.5, 0.5], [0.2, -3]], '#1a0e30');
    stroke(c, '#d8b8ff', 1.1, [[-1, -7], [1.6, -3.4], [-0.6, -1], [2, 3.4], [0, 7.5]]);
    dot(c, 0.4, 0, 1.2, 1.2, '#f4e8ff');
  });
}

// --- Ratgeber -------------------------------------------------------------------------------------------------------
if (typeof RATGEBER_WISSEN !== 'undefined') {
  RATGEBER_WISSEN.push({
    c: 'dungeons', p: 3, q: 'Was sind Rissläufe?',
    a: 'Ab Stufe 80 öffnet die <b>Rissmeisterin</b> (Kazehana, Mondfall und die Lager der Stufe-80-Karten) einen Riss: einen Dungeon auf Zeit, der bei jedem Lauf neu gewürfelt wird – allein oder mit bis zu fünf Spielern. ' +
      'Besiegte Monster füllen die <b>Rissenergie</b>; ist sie voll, erscheint der Rissherr im letzten Raum. Fällt er, ist der Riss geschlossen. Du hast 10 Minuten, jeder Tod kostet 10 Sekunden.',
    k: 'riss risslauf rissläufe zeit dungeon schlüssel schlüsselstufe rissmeisterin rissherr stufe 80 endgame'
  }, {
    c: 'dungeons', q: 'Wie funktioniert die Schlüsselstufe bei Rissläufen?',
    a: 'Du beginnst mit Schlüsselstufe 1. Schaffst du den Riss in der Zeit, steigt sie um 1 – mit mehr als einem Drittel Restzeit um 2. Zu spät, verlassen oder abgebrochen (auch durch Neuladen), sobald die Uhr läuft: sie sinkt um 1. ' +
      'Jede Stufe gibt den Monstern 8 % mehr Leben und 4,5 % mehr Schaden – nach oben gibt es keine Grenze. Du darfst auch jede niedrigere Stufe wählen – dort gibt es keinen Abzug.',
    k: 'schlüsselstufe stufe steigt sinkt riss zeit drittel bestwert'
  }, {
    c: 'dungeons', q: 'Was sind die Regeln der Woche bei Rissläufen?',
    a: 'Jede Woche (ab Montag, 0 Uhr Weltzeit) gelten für alle zwei oder drei Regeln: <b>Berstende Leiber</b> (Monster platzen beim Tod), <b>Raserei</b> (angeschlagene Monster werden wütend), <b>Schildbann</b> (der Rissherr ruft Schildwächter), ' +
      '<b>Zeitdruck</b> (weniger Zeit, mehr Beute), <b>Elitenflut</b>, <b>Rissblitze</b>, <b>Giftspur</b> und <b>Schwarm</b>. Welche gerade gelten, steht bei der Rissmeisterin und im Charakterfenster unter „Rissläufe“.',
    k: 'regeln woche wöchentlich bersten raserei schild zeitdruck elite blitze gift schwarm riss'
  }, {
    c: 'dungeons', q: 'Was gibt es für Rissläufe?',
    a: 'Nach Schlüsselstufe: Gold, Seelensplitter, Erfahrung, ab Stufe 4 Ätherkerne und eine Chance auf ein Juwel (ab Stufe 20 auch Stufe II). Zu spät geschafft: die Hälfte, kein Juwel. ' +
      'Bestwerte stehen im Charakterfenster und in der Bestenliste unter „Rissläufe“ (Spieler in deinem Kanal und deine Charaktere).',
    k: 'belohnung beute riss risslauf gold splitter juwel ätherkern bestenliste bestwert'
  });
}
