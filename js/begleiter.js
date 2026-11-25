'use strict';
// Begleiter für Gruppeninhalte: Wer allein ist, füllt die Gruppe mit KI-Begleitern auf (Spielerwunsch: „es sind noch
// wenige Spieler online – Gruppeninhalte sollen auch allein spielbar sein“). Ausführlich mit Werten in docs/begleiter.md.
//
// - Gilt für Dungeons (auch über Risse), die Endboss-Hallen der Karten, die Instanzen (Lv 60 und Lv 80, Fünfergruppe),
//   den Höllenthron (bis 7) und den Turm der Verdammten (höchstens BEG.turmMax Begleiter).
// - Anheuern: Abschnitt „Begleiter“ am Eingang (Knopf „Mit Begleitern betreten“), drinnen am Steinkreis des Ausgangs
//   („Mit Begleitern auffüllen“), am Turm („Mit Begleitern beginnen“), im Gruppenfinder („Mit Begleitern los“) und auf der Seite
//   „Begleiter“ im Charakterfenster (Einstellungen). Rollen Tank, Heiler und Schaden frei wählbar oder automatisch nach
//   der eigenen Rolle (Gruppenfinder); aufgefüllt wird bis zur Gruppengröße des Inhalts.
// - Nur allein: Ist man in einer Gruppe mit echten Spielern oder steht ein echter Spieler im selben Inhalt
//   (BEG.realGrace s), gehen die Begleiter.
// - Miete in Gold je Betreten (begRent: nach Stufe und Art des Inhalts, eine Goldsenke). Wer kurz hinausgeht oder
//   fällt und in der Stadt aufsteht, hat BEG.keep s Zeit, ohne neue Miete zurückzukommen. Begleiter bekommen keine
//   Beute und keine Erfahrung, sie stehen nicht in der Gruppe (game.party) – Beute und Sperren bleiben wie allein.
// - Aussehen und Werte aus der Bot-Technik der Turnierarena (arena-bots.js, abotMake): Spielerfiguren mit Namen, die
//   Ausrüstung der eigenen Figur nachgebaut (für ihre Klasse), Statuspunkte, Klassensegen, Seelenstufen, Fertigkeiten
//   mit der Stufe der eigenen. Stärke: Leben × BEG.hp, Schaden nach der Formel der Figur (hitMonster) × BEG.dmg – mit
//   der KI (keine Ulti, keine Diener, Pausen wie ein Mensch) etwa 80 % einer gleich ausgerüsteten Figur (gemessen).
// - KI (begThink/begAct): folgen; Ziel des Spielers mit angreifen, sonst das des Tanks; der Tank sammelt Monster ein,
//   die andere angreifen (aller Schaden der Begleiter zählt für die Bedrohung beim Tank); der Heiler heilt (Fertigkeit,
//   Heilwelle, Gruppenheilung); Schaden kämpft mit Grundangriff und Fertigkeiten; Tränke; raus aus Warnflächen bzw.
//   hinein in Lichtkreise und geteilte Schläge; Wege um Mauern herum mit der Wegfindung der Monster (navMove).
// - Monster sehen die Begleiter wie Diener (Stellvertreter b.mx mit ally): Bedrohung, Zielwahl, Turm-Ziele und
//   Instanz-Angriffe laufen über den vorhandenen Code. Im Kanal führt der Host die Monster: Dort stehen die Begleiter
//   als Diener-Plätze ab BEG.slot0 in der Netzliste al; Treffer der Monster kommen als 'ahit' zurück.
// - Schaden an Begleitern: Nahkampf (monsterAttack), Geschosse, Flächen der Bosse (raidResolve, bskLand,
//   Splitterschlag, Stampfer), Lachen und liegende Flächen. Gefallene stehen nach dem Kampf wieder auf.
// - Skalierung: Wo Inhalte mit der Spielerzahl wachsen (Turm, Kristalle und Lichtkreise der Endbosse), zählt ein
//   Begleiter wie BEG.weight Spieler.
// - Anzeige: Gruppenanzeige mit Leben (partyExtraNames), Name und Balken über dem Kopf in Gruppenfarbe, 2D über
//   collectScene, 3D über V3.extra. Andere Spieler sehen die Begleiter nicht (in der ersten Fassung nur allein).

const BEG = {
  minLevel: 10,             // ab dieser Stufe (die ersten Dungeons)
  hp: 0.8,                  // Leben im Verhältnis zu einer gleich ausgerüsteten Figur derselben Stufe
  dmg: 0.95,                // Schaden: Formel der Figur × dmg; mit der KI ≈ 80 % der Figur (Messung in docs/begleiter.md)
  // je Weg (Klasse:Weg) zusätzlich, wo der Begleiter gegen die Spieler-KI des Balance-Simulators im Mittel dreier
  // Messungen (Stufe 60 und 70 mit +7 und Boni, Stufe 80 mit +9 und mehr Boni; Boss-Puppe, 40 s) klar über oder unter
  // 0,8 lag: 70 % des Abstands ausgeglichen (die Werte streuen je Lauf stark, docs/begleiter.md). Fehlt ein Weg, gilt 1
  weg: { 'ninja:1': 1.03, 'nekromant:1': 0.9, 'magier:0': 1.1, 'magier:1': 0.95, 'magier:2': 0.97, 'magier:3': 0.91 },
  weight: 0.7,              // zählt bei Inhalten, die mit der Spielerzahl wachsen, wie 0,7 Spieler
  turmMax: 4,               // höchstens so viele Begleiter im Turm der Verdammten
  keep: 300,                // so lange (s) darf man den Inhalt verlassen (Tod, kurz hinaus), dann gehen sie
  wantFor: 90,              // so lange (s) gilt ein vorbereitetes Anheuern (Knopf am Eingang, Gruppenfinder)
  realGrace: 3,             // so lange (s) darf ein echter Mitspieler im selben Inhalt stehen, dann gehen sie
  reviveAfter: 5,           // so lange (s) ohne Kampf, dann stehen Gefallene wieder auf (halbes Leben)
  fightR: 560,              // Monster bis so weit von der eigenen Figur zählen zum Kampf
  slot0: 60,                // Plätze der Begleiter in der Diener-Liste ans Netz (eigene Diener haben die Plätze 0–9)
  potions: 3,               // Lebenstränke je Kampf (größte Größe der Stufe) …
  potAt: 0.4,               // … unter diesem Anteil Leben
  calmAfter: 4,             // so lange (s) ohne Kampf, dann …
  calmRegen: 0.02,          // … je Sekunde dieser Anteil Leben
  // Miete je Begleiter und Betreten: (a × Stufe + b × Stufe²) × Art, auf 10 Gold gerundet
  rent: { a: 12, b: 0.4, kind: { dungeon: 0.8, raid: 2, inst: 1.5, thron: 2.5, turm: 3 } },
  // Heiler: Heilwelle (alle every s auf den Schwächsten unter below, pct des Höchstlebens), Gruppenheilung (alle
  // groupEvery s, wenn mindestens groupMin unter groupBelow sind), alles × mul (Stärke) × Heilkraft des Heilers
  heal: { every: 2.4, pct: 0.09, below: 0.85, groupEvery: 11, groupPct: 0.14, groupBelow: 0.7, groupMin: 2, range: 420, mul: 0.8 },
  react: [0.15, 0.45],      // Reaktionszeit (s) auf neue Warnflächen
  fxGap: 0.25               // Grafik „niedrig“: höchstens ein Fertigkeitsbild der Begleiter je so viele Sekunden
};
const BEG_ROLES = ['tank', 'heiler', 'schaden'];
const BEG_ROLE_NAME = { tank: 'Tank', heiler: 'Heiler', schaden: 'Schaden' };
// Klasse und Weg je Rolle: Tank = Krieger des Leibes, Heiler = Schamane der Heilung, Schaden = die übrigen Wege
// (ohne den Weg der Seelen: der lebt von Dienern, die Begleiter nicht haben)
const BEG_PATH_ROLE = { leib: 'tank', heilung: 'heiler' };
const BEG_NO_DPS = ['leib', 'heilung', 'seelen'];
const BEG_LABEL = { color: '#7dffb0', bar: '#3ee05a', tier: null };

// Laufzustand: list = Begleiter (Bot-Objekte aus abotMake, erweitert), hire = laufende Miete { key, kind, C, roles,
// at, outSince, cost }, want = vorbereitetes Anheuern { key, roles, at }, zones = Warnflächen für das Ausweichen
const beg = {
  list: [], hire: null, want: null, who: null, on: false, gen: 1, seq: 1, figs3: [], ov: false, zones: [],
  eng: [], engSet: new Set(), engT: -1, cAt: -1, cNow: null, realSince: null, fightAt: -99, fxAt: -99,
  countMode: false
};
if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('begleiter')) SAVE_FIELDS.push('begleiter');

const begRand = (a, b) => a + Math.random() * (b - a);
const begFmt = (n) => Math.round(n).toLocaleString('de-DE');
const begLowGfx = () => typeof opts !== 'undefined' && opts.graphics === 'niedrig';

// Spielstand p.begleiter = { wahl: 'auto' | { tank, heiler, schaden } (eigene Wahl), mal: wie oft angeheuert,
// gold: Miete insgesamt }
function begState(p) {
  p = p || game.player;
  if (!p.begleiter || typeof p.begleiter !== 'object') p.begleiter = {};
  const s = p.begleiter;
  if (s.wahl !== 'auto' && !(s.wahl && typeof s.wahl === 'object')) s.wahl = 'auto';
  if (s.wahl !== 'auto') for (const r of BEG_ROLES) s.wahl[r] = Math.max(0, Math.min(6, s.wahl[r] | 0));
  s.mal = Math.max(0, s.mal | 0);
  s.gold = Math.max(0, +s.gold || 0);
  return s;
}

// --- Inhalte ------------------------------------------------------------------------------------------------------
// Gruppeninhalt an einem Punkt: { key, kind, k, size, comp, name, minLevel } oder null. kind: dungeon, raid, inst,
// thron, turm. Je Inhalt ein festes Objekt (keine neuen Objekte je Bild).
const BEG_CONTENT = new Map();
function begContentOf(k) {
  let C = BEG_CONTENT.get(k);
  if (C !== undefined) return C;
  const d = DUNGEONS[k];
  if (!d) C = null;
  else {
    const kind = d.instanz ? 'thron' : d.inst60 ? 'inst' : d.raid ? 'raid' : 'dungeon';
    const size = kind === 'thron' ? (typeof HT !== 'undefined' ? HT.party[1] : 7) : kind === 'inst' && typeof INST !== 'undefined' ? INST.party[1] : 5;
    const comp = kind === 'thron' ? { tank: 1, heiler: 2, schaden: size - 3 } : { tank: 1, heiler: 1, schaden: size - 2 };
    C = { key: 'dg:' + k, kind, k, size, comp, name: d.name, minLevel: d.minLevel || 1 };
  }
  BEG_CONTENT.set(k, C);
  return C;
}
const BEG_TURM = { key: 'turm', kind: 'turm', k: -1, size: 5, comp: { tank: 1, heiler: 1, schaden: 3 }, name: 'Turm der Verdammten', minLevel: 80 };
function begContentAt(x, y) {
  if (typeof turmSlotAt === 'function' && turmSlotAt(x, y) >= 0) {
    if (typeof TURM !== 'undefined') { BEG_TURM.name = TURM.name; BEG_TURM.minLevel = TURM.level; }
    return BEG_TURM;
  }
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < WORLD_W || ty >= DUNGEON_H || ty < 0) return null;
  const k = dungeonIndexAt(tx, ty);
  return k >= 0 ? begContentOf(k) : null;
}
// Inhalt der eigenen Figur (höchstens alle 0,25 s neu bestimmt)
function begHere() {
  const p = game.player;
  if (game.time - beg.cAt > 0.25 || game.time < beg.cAt) {
    beg.cAt = game.time;
    beg.cNow = p ? begContentAt(p.x, p.y) : null;
  }
  return beg.cNow;
}
// Inhalt einer Aktivität des Gruppenfinders (GROUP_ACTIVITIES)
function begContentOfAct(act) {
  if (!act) return null;
  if (act.id === 'turm') return BEG_TURM;
  return act.dungeon >= 0 ? begContentOf(act.dungeon) : null;
}
const begMaxFor = (C) => (C ? Math.max(0, Math.min(C.kind === 'turm' ? BEG.turmMax : 6, C.size - 1)) : 0);

// --- Zusammensetzung ------------------------------------------------------------------------------------------------
// eigene Rolle aus dem Gruppenfinder (Vorschlag nach Weg, frei änderbar)
function begMyRole() {
  try { if (typeof gfMyRole === 'function') return gfMyRole(); } catch (e) { /* ohne Gruppenfinder */ }
  const p = game.player;
  return BEG_PATH_ROLE[classPath(p.classId, p.path | 0).id] || 'schaden';
}
// Rollen für einen Inhalt: automatisch (Empfehlung des Inhalts ohne die eigene Rolle) oder die eigene Wahl; immer bis
// zur Gruppengröße aufgefüllt (fehlende Plätze werden Schaden, zu viele fallen von hinten weg)
function begRolesFor(C, p) {
  const n = begMaxFor(C);
  if (!n) return [];
  const st = begState(p);
  let want;
  if (st.wahl === 'auto') {
    want = Object.assign({}, C.comp);
    const mine = begMyRole();
    if (want[mine] > 0) want[mine]--;
  } else want = st.wahl;
  const out = [];
  for (const r of BEG_ROLES) for (let i = 0; i < (want[r] | 0) && out.length < n; i++) out.push(r);
  while (out.length < n) out.push('schaden');
  return out;
}
// kurz als Text: „Tank · Heiler · 2 × Schaden“
function begRolesText(roles) {
  const c = { tank: 0, heiler: 0, schaden: 0 };
  for (const r of roles) c[r]++;
  return BEG_ROLES.filter((r) => c[r]).map((r) => (c[r] > 1 ? `${c[r]} × ${BEG_ROLE_NAME[r]}` : BEG_ROLE_NAME[r])).join(' · ');
}

// --- Miete ----------------------------------------------------------------------------------------------------------
function begRent(level, kind) {
  const L = Math.max(1, level | 0);
  const R = BEG.rent;
  return Math.max(10, Math.round(((R.a * L + R.b * L * L) * (R.kind[kind] || 1)) / 10) * 10);
}
const begRentTotal = (C, n, level) => (C ? begRent(level, C.kind) * n : 0);

// --- Begleiter bauen (Bot-Technik der Turnierarena) -------------------------------------------------------------------
const begPathIdx = (cls, id) => Math.max(0, CLASSES[cls].paths.findIndex((pa) => pa.id === id));
// Klasse und Weg je Rolle; Schaden: möglichst verschiedene Klassen
function begClassFor(role, usedCls) {
  if (role === 'tank') return ['krieger', begPathIdx('krieger', 'leib')];
  if (role === 'heiler') return ['schamane', begPathIdx('schamane', 'heilung')];
  const pool = [];
  for (const cls of ABOT_CLASSES) CLASSES[cls].paths.forEach((pa, k) => { if (!BEG_NO_DPS.includes(pa.id)) pool.push([cls, k]); });
  pool.sort(() => Math.random() - 0.5);
  return pool.find(([cls]) => !usedCls.has(cls)) || pool[0];
}
// Rollenname in der Sprache des Spiels (für die Zeile über dem Namen)
function begRoleLine(role) {
  const t = (s) => (typeof trText === 'function' ? trText(s) : s);
  return `${t('KI-Begleiter')} · ${t(BEG_ROLE_NAME[role])}`;
}
// ein Begleiter: abotMake (Name, Aussehen, Ausrüstung, Werte, Fertigkeiten), dazu Rolle, Stellvertreter für die Monster
// (mx), Körper für die Wegfindung (nb)
function begMake(spec, idx, ctx) {
  const n = beg.seq++;
  // der Tank trägt Schwert und Schild (der Weg des Leibes erlaubt auch Zweihänder – dann fehlte der Schild)
  const keepWeapon = abotWeapon;
  if (spec.role === 'tank' && spec.cls === 'krieger') abotWeapon = () => 'sword';
  let b;
  try {
    b = abotMake(n, 'A', idx, ctx, spec.cls, spec.path);
  } finally {
    abotWeapon = keepWeapon;
  }
  b.pid = 'beg:' + n;
  b.name = String(b.name).replace(/ \(Bot\)$/, '');
  b.role = spec.role;
  b.idx = idx;
  b.slot = BEG.slot0 + idx;
  b.k = BEG.hp;
  const f = b.fig;
  Object.assign(f, { name: b.name, peerId: b.pid, beg: true, begB: b, guild: begRoleLine(spec.role), rk: 0, abot: false });
  b.mx = { beg: true, ally: true, begB: b, id: 3e6 + n, slot: b.slot, x: 0, y: 0, r: 11, hp: 1, maxHp: 1, def: 0, level: b.level, classId: b.cls, path: b.path, dead: false, name: b.name };
  b.nb = { x: 0, y: 0, r: 11, facing: 1, nav: null };
  Object.assign(b, { potions: BEG.potions, potAt: 0, hurtAt: -99, fieldAt: 0, hazAt: 0, esc: null, escAt: -9, losAt: -9, los: true, stuckT: 0, farSince: null, healAt: game.time + begRand(0.5, 1.5), groupAt: game.time + begRand(3, 6), reactAt: 0, deadAt: 0, protectUntil: 0 });
  b.px = null;
  return b;
}

// --- Erlaubt? -----------------------------------------------------------------------------------------------------------
// Gruppe mit echten Spielern (game.party aus mindestens zwei)
const begPartyReal = () => !!(game.party && game.party.members && game.party.members.length > 1);
// Grund, warum gerade keine Begleiter gehen (leer = erlaubt); C = Inhalt
function begBlock(C) {
  const p = game.player;
  if (!p || WAECHTER) return 'Nicht verfügbar';
  if (!C) return 'Nur in Dungeons, Endboss-Hallen, Instanzen, im Höllenthron und im Turm';
  if (p.level < BEG.minLevel) return `Begleiter gibt es ab Stufe ${BEG.minLevel}`;
  if (begPartyReal()) return 'Nur allein – du bist in einer Gruppe';
  if (C.kind === 'turm' && p.level < C.minLevel) return `Der Turm öffnet sich erst ab Stufe ${C.minLevel}`;
  return '';
}
// echter Mitspieler im selben Inhalt (nicht der Welt-Wächter); im Turm nur in derselben Halle
function begRealIn(key) {
  if (typeof net === 'undefined' || !net.players || !netOnline()) return false;
  const p = game.player;
  const hall = key === 'turm' && p ? turmSlotAt(p.x, p.y) : -1;
  for (const rp of net.players.values()) {
    if (!rp || rp.gone || rp.waechter || !Number.isFinite(rp.x) || !Number.isFinite(rp.y)) continue;
    if (key === 'turm') {
      if (hall >= 0 && turmSlotAt(rp.x, rp.y) === hall) return true;
      continue;
    }
    const C = begContentAt(rp.x, rp.y);
    if (C && C.key === key) return true;
  }
  return false;
}

// --- Anheuern und Entlassen -------------------------------------------------------------------------------------------
// beim nächsten Betreten des Inhalts anheuern (Knopf am Eingang, Turm, Gruppenfinder)
function begArm(C, roles) {
  if (!C) return;
  beg.want = { key: C.key, roles: (roles || begRolesFor(C)).slice(), at: game.time };
}
// sofort anheuern (man steht im Inhalt). specs: Rollen ('tank' …) oder { role, cls, path }; o.free: ohne Miete (Tests)
function begHire(C, specs, o = {}) {
  const p = game.player;
  const why = begBlock(C);
  if (why) {
    ui.log(`Begleiter: ${why}.`, 'warn');
    return false;
  }
  // dieselbe Miete läuft noch (kurz draußen gewesen): ohne neue Miete zurück
  if (beg.hire && beg.hire.key === C.key && beg.list.length) {
    begReturn();
    return true;
  }
  if (beg.hire) begDismiss('');
  const list = (specs && specs.length ? specs : begRolesFor(C)).slice(0, begMaxFor(C) || 1);
  if (!list.length) return false;
  const cost = o.free ? 0 : begRentTotal(C, list.length, p.level);
  if ((p.gold || 0) < cost) {
    ui.log(`Für ${list.length} Begleiter fehlen dir ${begFmt(cost - (p.gold || 0))} Gold (Miete ${begFmt(cost)} Gold).`, 'warn');
    return false;
  }
  p.gold -= cost;
  const st = begState(p);
  st.mal++;
  st.gold += cost;
  // Bauplan wie bei den Bots der Arena: Ausrüstung der eigenen Figur (die stärkste der letzten Minuten) als Vorbild
  const peak = abotPeak(p);
  const used = new Set([String(p.name || '').toLowerCase()]);
  if (typeof net !== 'undefined' && net.players) for (const rp of net.players.values()) if (rp && rp.name) used.add(String(rp.name).toLowerCase());
  const ctx = {
    level: p.level, ref: peak.eq, fromCls: p.classId, k: BEG.hp, lvl: abotSkillLvl(p),
    seele: p.level >= MAX_LEVEL && p.seele ? p.seele : null, used, pts: 0
  };
  const usedCls = new Set();
  beg.gen++;
  beg.list = [];
  list.forEach((s, i) => {
    const spec = typeof s === 'string' ? { role: s } : Object.assign({}, s);
    if (!BEG_ROLE_NAME[spec.role]) spec.role = 'schaden';
    if (!spec.cls || !CLASSES[spec.cls]) [spec.cls, spec.path] = begClassFor(spec.role, usedCls);
    usedCls.add(spec.cls);
    beg.list.push(begMake(spec, i, ctx));
  });
  beg.hire = { key: C.key, kind: C.kind, C, roles: beg.list.map((b) => b.role), at: game.time, outSince: null, cost };
  beg.on = true;
  beg.realSince = null;
  beg.fightAt = -99;
  for (const b of beg.list) begPlace(b, true);
  begSync();
  ui.log(cost ? `${beg.list.length} Begleiter angeheuert (−${begFmt(cost)} Gold).` : `${beg.list.length} Begleiter angeheuert.`, 'level');
  if (typeof saveGame === 'function') saveGame();
  begRefreshUi();
  return true;
}
// alle gehen (why: Meldung, leer = still)
function begDismiss(why) {
  for (const b of beg.list) {
    if (b.chan) begStopChan(b);
    b.cast = null;
    if (why && beg.on && !b.dead && b.fig) {
      const f = b.fig;
      particles(f.x, feetY(f) - 18, { count: 14, color: ['#9fd0ff', '#ffffff'], speed: [30, 110], life: [0.3, 0.7], size: [1.5, 3], drag: 3 });
    }
    b.dead = true;
    if (b.mx) { b.mx.dead = true; b.mx.hp = 0; }
  }
  beg.list = [];
  beg.hire = null;
  beg.on = false;
  beg.gen++;
  beg.zones.length = 0;
  begSync();
  if (why) ui.log(why, 'info');
  begRefreshUi();
}
// zurück aus der Pause (man war kurz draußen): neben der eigenen Figur, volles Leben, alle wieder auf den Beinen
function begReturn() {
  const H = beg.hire;
  if (!H) return;
  H.outSince = null;
  beg.on = true;
  beg.gen++;
  for (const b of beg.list) {
    b.dead = false;
    b.hp = b.maxHp;
    b.potions = BEG.potions;
    b.tgt = null;
    b.want = null;
    b.cast = null;
    if (b.chan) begStopChan(b);
    begPlace(b, true);
  }
  begSync();
  begRefreshUi();
}
// Platz neben der eigenen Figur (Halbkreis hinter ihr); fx: Lichtsäule wie beim Betreten
function begPlace(b, fx) {
  const p = game.player;
  const n = Math.max(1, beg.list.length);
  const fa = Math.atan2(p.facing ? p.facing.y : 1, p.facing ? p.facing.x : 0);
  let x = p.x;
  let y = p.y;
  for (let k = 0; k < 6; k++) {
    const a = fa + Math.PI + (b.idx - (n - 1) / 2) * 0.75 + k * 0.9;
    const d = 40 + (b.idx % 2) * 18 + k * 6;
    const tx = p.x + Math.cos(a) * d;
    const ty = p.y + Math.sin(a) * d * 0.8;
    if (canStand(tx, ty, 9, false)) { x = tx; y = ty; break; }
  }
  const f = b.fig;
  f.x = f.tx = x;
  f.y = f.ty = y;
  f.glide = null;
  f.moving = false;
  b.last = { x, y };
  b.nb.x = x;
  b.nb.y = y;
  b.nb.nav = null;
  b.esc = null;
  b.farSince = null;
  if (fx) vfxPillar(f, '#9fd0ff', 0.8);
}

// --- Takt (aus updateAllies: in jedem Bild, allein, als Host und als Mitspieler) ---------------------------------------
function begTick(dt) {
  const p = game.player;
  if (!p || !game.running || WAECHTER) return;
  // andere Figur geladen: alles vergessen
  if (beg.who !== p) {
    if (beg.hire) begDismiss('');
    beg.want = null;
    beg.who = p;
  }
  const now = game.time;
  const C = begHere();
  const W = beg.want;
  if (W) {
    if (now - W.at > BEG.wantFor || now < W.at || begPartyReal()) beg.want = null;
    else if (C && C.key === W.key && !p.dead) {
      beg.want = null;
      begHire(C, W.roles);
    }
  }
  const H = beg.hire;
  if (!H) return;
  if (begPartyReal()) {
    begDismiss('Du bist jetzt in einer Gruppe mit echten Mitspielern – deine Begleiter gehen.');
    return;
  }
  // draußen (Ausgang, Tod in der Stadt, Teleport): Pause, nach BEG.keep s gehen sie
  if (!C || C.key !== H.key) {
    if (H.outSince == null) {
      H.outSince = now;
      beg.on = false;
      for (const b of beg.list) if (b.chan) begStopChan(b);
      beg.zones.length = 0;
      begSync();
      begRefreshUi();
    }
    if (now - H.outSince > BEG.keep || now < H.outSince) begDismiss('Deine Begleiter haben sich verabschiedet.');
    return;
  }
  if (H.outSince != null) begReturn();
  // echte Mitspieler im selben Inhalt (höchstens zweimal je Sekunde geprüft)
  if (now - (beg.realAt || -9) > 0.5 || now < beg.realAt) {
    beg.realAt = now;
    if (begRealIn(H.key)) {
      if (beg.realSince == null) beg.realSince = now;
      if (now - beg.realSince > BEG.realGrace) {
        begDismiss('Ein echter Mitspieler ist hier – deine Begleiter gehen.');
        return;
      }
    } else beg.realSince = null;
  }
  begRun(dt);
}
function begRun(dt) {
  const now = game.time;
  // Wegsuche: im Kanal führt niemand sonst das Budget, allein/als Host bekommen die Begleiter eine Suche je Bild dazu
  if (typeof NAV !== 'undefined') {
    if (net.mode === 'client') { NAV.left = Math.max(NAV.left, 2); NAV.ms = 0; }
    else if (NAV.left < 1) { NAV.left = 1; NAV.ms = Math.min(NAV.ms, NAV_FRAME_MS * 0.5); }
  }
  begZonesPrune(now);
  if (begEngaged().length) beg.fightAt = now;
  beg.tank = null;
  for (const b of beg.list) if (b.role === 'tank' && !b.dead) { beg.tank = b; break; }
  for (const b of beg.list) begBotTick(b, dt);
  begSeparate();
  begFieldsTick();
  begReviveCheck();
  begSync();
}
// Figuren für 2D/3D und Stellvertreter für die Monster nachziehen
function begSync() {
  const on = beg.on;
  beg.figs3.length = 0;
  for (const b of beg.list) {
    const f = b.fig;
    f.hp = b.dead ? 0 : Math.max(0, Math.round(b.hp));
    f.maxHp = b.maxHp;
    f.dead = b.dead || !on;
    f.level = b.level;
    const mx = b.mx;
    mx.x = f.x;
    mx.y = f.y;
    mx.hp = f.hp;
    mx.maxHp = b.maxHp;
    mx.dead = f.dead;
    mx.gone = !on;
    mx.level = b.level;
    mx.def = b.st ? b.st.def : 0;
    if (on && !b.dead) beg.figs3.push(f);
  }
  if (typeof V3 === 'undefined') return;
  // die Bots der Turnierarena haben Vorrang (dort gibt es keine Begleiter)
  if (typeof abot !== 'undefined' && abot.run) return;
  if (beg.figs3.length) V3.extra = beg.figs3;
  else if (V3.extra === beg.figs3) V3.extra = null;
}
// letzter Kampf der Gruppe (Treffer, erlittener Schaden, Monster im Kampf)
function begLastFight() {
  const p = game.player;
  return Math.max(beg.fightAt, (p && p.lastCombat) || -99, (p && p.hurtAt) || -99);
}

// --- Kampf: welche Monster zählen -------------------------------------------------------------------------------------
// Monster im Kampf mit der Gruppe (einmal je Bild): greifen die eigene Figur oder einen Begleiter an, wurden von einem
// Begleiter getroffen oder sind das Ziel der eigenen Figur, während sie kämpft – nur bis BEG.fightR um die Figur.
// Seelensteine nur, wenn die Figur sie angreift. Im Kanal führt der Host die Monster (ohne Ziel und Zustand): dort
// zählen eigene Treffer und Monster, die nah bei der Gruppe ausholen.
function begEngaged() {
  if (beg.engT === game.time) return beg.eng;
  beg.engT = game.time;
  const out = beg.eng;
  const set = beg.engSet;
  out.length = 0;
  set.clear();
  const p = game.player;
  if (!p || !beg.on) return out;
  const now = game.time;
  const local = net.mode !== 'client';
  const R = BEG.fightR;
  const pt = game.target;
  const fighting = now - (p.lastCombat || -99) < 5;
  for (const m of monstersNear(p.x, p.y, R)) {
    if (m.dead || m.duelProxy || m.pvp || Math.abs(m.x - p.x) > R || Math.abs(m.y - p.y) > R || hyp(m.x - p.x, m.y - p.y) > R) continue;
    let e;
    if (m === pt && fighting) e = true;
    else if (now - (m.begHitAt || -99) < 6) e = true;
    else if (m.isStone) e = local ? m.lastAttacker === p && now - (m.struckAt || -99) < 5 : now - (m.myHitAt || -99) < 5;
    else if (local) {
      const t = m.target;
      e = m.state === 'chase' && !!t && (t === p || !!t.beg || (!!t.ally && game.allies.includes(t)));
    } else e = now - (m.myHitAt || -99) < 6 || begNearSwing(m, now);
    if (e) {
      out.push(m);
      set.add(m);
    }
  }
  return out;
}
// Mitspieler-Modus: holt das Monster gerade nah bei der Figur oder einem Begleiter aus? (gemerkt für 4 s)
function begNearSwing(m, now) {
  if (m.attackAnim > 0 || m.windup > 0) {
    const p = game.player;
    const reach = (m.r || 12) + 110;
    let near = !p.dead && hyp(m.x - p.x, m.y - p.y) < reach;
    if (!near) for (const b of beg.list) if (!b.dead && hyp(m.x - b.fig.x, m.y - b.fig.y) < reach) { near = true; break; }
    if (near) m.begSwingAt = now;
  }
  return now - (m.begSwingAt || -99) < 4;
}
// greift das Monster jemand anderen als den Tank an?
function begLoose(m, tank) {
  if (net.mode !== 'client') return m.target !== tank.mx;
  const near = (e) => hyp(m.x - e.x, m.y - e.y) < (m.r || 12) + 90;
  if (near(tank.fig)) return false;
  const p = game.player;
  if (!p.dead && near(p)) return true;
  return beg.list.some((x) => x !== tank && !x.dead && near(x.fig));
}
// nächster Seelenkristall eines Endbosses (solange einer steht, ist der Boss geschützt)
function begCrystal(f) {
  if (typeof raidScan !== 'function') return null;
  let best = null;
  let bd = BEG.fightR;
  for (const c of raidScan().crystals) {
    if (c.dead) continue;
    const d = hyp(c.x - f.x, c.y - f.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// --- Ein Begleiter je Bild -----------------------------------------------------------------------------------------------
function begBotTick(b, dt) {
  const now = game.time;
  const f = b.fig;
  if (f.swing > 0) f.swing = Math.max(0, f.swing - dt);
  if (f.spin > 0) f.spin = Math.max(0, f.spin - dt);
  f.moving = false;
  if (b.dead) return;
  // Sprungschlag: auf der Bahn gleiten wie ein Mitspieler (remoteSkillFx setzt glide)
  const g = f.glide;
  if (g) {
    const k = (now - g.start) / g.dur;
    if (k >= 1) {
      f.x = g.x1;
      f.y = g.y1;
      f.glide = null;
    } else if (k >= 0) {
      f.x = g.x0 + (g.x1 - g.x0) * k;
      f.y = g.y0 + (g.y1 - g.y0) * k;
    }
  }
  if (b.buffs.some((x) => x.until <= now)) abotStats(b);
  // Leben: im Kampf wie die Figur (REGEN_RULES), nach BEG.calmAfter s Ruhe schnell; dann auch die Tränke wieder voll
  const calm = now - begLastFight() > BEG.calmAfter;
  if (b.hp < b.maxHp) {
    const k = calm ? BEG.calmRegen : Math.min(REGEN_RULES.combatMax, REGEN_RULES.combat + (b.st.regen || 0) * REGEN_RULES.combatItems);
    b.hp = Math.min(b.maxHp, b.hp + b.maxHp * k * dt);
  }
  if (calm) b.potions = BEG.potions;
  for (const e of b.sk) if (e.cd > 0) e.cd -= dt;
  if (b.atkCd > 0) b.atkCd -= dt;
  if (g) return;
  // weit weg (Teleport, Rückkehr, festgefahren): neben die eigene Figur
  const p = game.player;
  const dp = hyp(f.x - p.x, f.y - p.y);
  if (dp > 520) {
    if (b.farSince == null) b.farSince = now;
    if (dp > 900 || now - b.farSince > 6) {
      begPlace(b, true);
      return;
    }
  } else b.farSince = null;
  if (b.lock > now) return;
  // zuerst raus aus Warnflächen (bzw. hinein in den sicheren Kreis); Strahl und Wirken brechen dafür ab
  if (begAvoid(b, dt)) return;
  if (b.chan) { begChanTick(b); return; }
  if (b.cast) { begCastTick(b); return; }
  b.think -= dt;
  if (b.think <= 0) {
    b.think = begRand(0.2, 0.4);
    begThink(b);
  }
  begAct(b, dt);
}
function begThink(b) {
  const now = game.time;
  b.tgt = begPickTarget(b);
  const fr = b.hp / Math.max(1, b.maxHp);
  if (fr < BEG.potAt && b.potions > 0 && now >= b.potAt) begPotion(b);
  b.want = begPickSkill(b, b.tgt);
  // Sicht auf das Ziel (Fernkampf und Zauber nicht durch Mauern), alle 0,3 s
  if (b.tgt && now >= b.losAt) {
    b.losAt = now + 0.3;
    b.los = navSight(b.fig.x, b.fig.y, b.tgt.x, b.tgt.y, 4);
  }
}
// Ziel: der Tank nimmt Monster, die andere angreifen (die nächsten zuerst, sein bisheriges bevorzugt); Schaden und
// Heiler schlagen auf das Ziel der eigenen Figur, sonst auf das des Tanks, sonst auf das nächste Monster der Figur.
// Steht ein Kristallschild, brechen ihn die Schadensbegleiter.
function begPickTarget(b) {
  const list = begEngaged();
  const f = b.fig;
  const p = game.player;
  const cur = b.tgt && !b.tgt.dead && beg.engSet.has(b.tgt) ? b.tgt : null;
  if (b.role === 'schaden') {
    const cr = begCrystal(f);
    if (cr) return cr;
  }
  if (!list.length) return null;
  if (b.role === 'tank') {
    let best = null;
    let bs = Infinity;
    for (const m of list) {
      if (m.isStone || (m.type && m.type.crystal)) continue;
      const sc = hyp(m.x - f.x, m.y - f.y) + (begLoose(m, b) ? 0 : 320) + (m === cur ? -140 : 0) + (m.type && m.type.boss ? -60 : 0);
      if (sc < bs) { bs = sc; best = m; }
    }
    return best || cur || list[0];
  }
  const pt = game.target;
  if (pt && !pt.dead && beg.engSet.has(pt)) return pt;
  const tank = beg.tank;
  if (tank && tank.tgt && !tank.tgt.dead && beg.engSet.has(tank.tgt)) return tank.tgt;
  if (cur) return cur;
  let best = null;
  let bd = Infinity;
  for (const m of list) {
    const d = hyp(m.x - p.x, m.y - p.y);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}
// nächste Fertigkeit: Buffs im Kampf, Heilung bei wenig Leben, Sprünge auf Abstand, Fluchtschritt bei Nähe (Fernkampf),
// sonst die stärkste bereite (mit etwas Zufall); Flächen lieber, wenn mehrere Monster beisammen stehen
function begPickSkill(b, t) {
  const now = game.time;
  const f = b.fig;
  const d = t ? hyp(t.x - f.x, t.y - f.y) : Infinity;
  let best = null;
  let bs = 0;
  for (const e of b.sk) {
    if (e.cd > 0) continue;
    const P = e.plan;
    let sc = 0;
    if (P.a === 'b') sc = !t || d > 560 || b.buffs.some((x) => x.id === e.base.id && x.until > now) ? 0 : 95;
    else if (P.a === 'h') {
      const low = begLowAlly(b, BEG.heal.range);
      sc = low && low.fr < 0.55 ? 92 : 0;
    } else if (!t) sc = 0;
    else if (P.a === 'f') sc = d < 100 && !b.melee ? 70 : 0;
    else if (P.a === 'g') sc = d > 130 && d <= P.reach ? 75 : d <= 90 ? 25 + e.pow * 3 : 0;
    else {
      sc = 30 + (P.a === 'w' ? e.pow / (1 + P.cast) : P.a === 'c' ? e.pow / P.dur : e.pow) * 6 + Math.random() * 12;
      if ((P.a === 'z' || P.a === 'm') && begFoesIn(P.a === 'm' ? f.x : t.x, P.a === 'm' ? f.y : t.y, P.r || P.reach || 100, null).length > 1) sc += 15;
    }
    if (sc > bs) { bs = sc; best = e; }
  }
  return best;
}
function begInReach(b, e, t) {
  const d = hyp(t.x - b.fig.x, t.y - b.fig.y);
  const P = e.plan;
  if (P.a === 'm') return d <= P.reach + t.r;
  if (P.a === 's') return d <= P.reach + t.r + 10;
  return d <= P.reach + (t.r || 0) * 0.5;
}
function begAct(b, dt) {
  const now = game.time;
  const f = b.fig;
  if (b.role === 'heiler' && begHealerAct(b, dt)) return;
  const t = b.tgt;
  if (!t || t.dead) {
    b.tgt = null;
    begFollow(b, dt);
    return;
  }
  const d = hyp(t.x - f.x, t.y - f.y);
  const e = b.want && b.want.cd <= 0 ? b.want : null;
  const self = e && (e.plan.a === 'b' || e.plan.a === 'h');
  const sight = b.melee || b.los;
  let want = b.melee ? b.basic.range + t.r - 6 : b.keep;
  if (e && !self) {
    const ws = e.plan.a === 'm' || e.plan.a === 's' ? e.plan.reach * 0.85 + t.r * 0.5 : Math.min(e.plan.reach * 0.85, Math.max(want, 90));
    // Nahkämpfer bleiben in Reichweite ihres Grundangriffs
    want = b.melee ? Math.min(want, ws) : ws;
  }
  if (d > want || !sight) begGo(b, t.x, t.y, dt, 1);
  else if (!b.melee && d < Math.min(110, b.keep * 0.45)) begAway(b, t, dt, 0.9);
  if (!sight) return;
  if (e && now >= b.gcdUntil && (self || begInReach(b, e, t))) {
    begCast(b, e, t);
    return;
  }
  if (b.atkCd <= 0 && d - t.r <= b.basic.range + (b.melee ? 6 : 0)) begBasic(b, t);
}
// folgen: jeder hält seinen Platz hinter der eigenen Figur (Richtung der letzten Bewegung), schneller, wenn er zurückliegt
function begFollow(b, dt) {
  const p = game.player;
  const f = b.fig;
  if (p.moving && p.facing) beg.anchor = Math.atan2(p.facing.y, p.facing.x);
  const n = Math.max(1, beg.list.length);
  const a = (beg.anchor || 0) + Math.PI + (b.idx - (n - 1) / 2) * 0.62;
  const r = 44 + (b.idx % 2) * 20;
  const gx = p.x + Math.cos(a) * r;
  const gy = p.y + Math.sin(a) * r * 0.8;
  const d = hyp(gx - f.x, gy - f.y);
  if (d < 14) return;
  const dp = hyp(p.x - f.x, p.y - f.y);
  begGo(b, gx, gy, dt, dp > 260 ? 1.7 : dp > 140 ? 1.3 : d > 40 ? 1.05 : 0.75);
}
// Laufen mit der Wegfindung der Monster (navMove: gerade bei freier Sicht, sonst A* um Mauern herum, Ausweichen beim
// Festhängen) auf einem eigenen Körper (nb), damit die Figur ihre Blickrichtung behält
function begGo(b, gx, gy, dt, mul) {
  const f = b.fig;
  const nb = b.nb;
  nb.x = f.x;
  nb.y = f.y;
  const x0 = f.x;
  const y0 = f.y;
  const sp = ((b.st && (b.st.footSpeed || b.st.speed)) || 130) * (mul || 1);
  navMove(nb, gx, gy, sp, dt);
  // nicht aus Sicherheit in eine Warnfläche, Lache oder liegende Fläche hineinlaufen (auf ihr Ende warten)
  if ((beg.zones.length || (typeof INST_HAZ !== 'undefined' && INST_HAZ.length) || (typeof BSK_FIELDS !== 'undefined' && BSK_FIELDS.length)) && (nb.x !== x0 || nb.y !== y0)) {
    const off = feetY(f) - f.y;
    const now = game.time;
    if (begDanger(nb.x, nb.y + off, now) && !begDanger(x0, y0 + off, now)) {
      nb.x = x0;
      nb.y = y0;
    }
  }
  f.x = nb.x;
  f.y = nb.y;
  const moved = hyp(f.x - x0, f.y - y0);
  f.moving = moved > 0.2;
  if (f.moving && !(b.faceUntil > game.time)) f.facing = { x: (f.x - x0) / moved, y: (f.y - y0) / moved };
  return f.moving;
}
// weg von einem Punkt (Abstand halten)
function begAway(b, from, dt, mul) {
  const f = b.fig;
  const d = Math.max(1, hyp(f.x - from.x, f.y - from.y));
  begGo(b, f.x + ((f.x - from.x) / d) * 80, f.y + ((f.y - from.y) / d) * 80, dt, mul);
}
// Begleiter drängen sich nicht auf einen Punkt
function begSeparate() {
  const L = beg.list;
  for (let i = 0; i < L.length; i++) {
    const a = L[i];
    if (a.dead || a.fig.glide) continue;
    for (let j = i + 1; j < L.length; j++) {
      const c = L[j];
      if (c.dead || c.fig.glide) continue;
      const dx = c.fig.x - a.fig.x;
      const dy = c.fig.y - a.fig.y;
      const d = hyp(dx, dy) || 0.01;
      if (d >= 20) continue;
      const push = (20 - d) / 2;
      moveEntity(a.fig, (-dx / d) * push, (-dy / d) * push, false);
      moveEntity(c.fig, (dx / d) * push, (dy / d) * push, false);
    }
  }
}
// Lebenstrank: größte Größe der Stufe, Abklingzeit wie bei der Figur
function begPotion(b) {
  const sizes = POTION_SIZES.filter((s) => b.level >= (s.level || 1));
  const sz = sizes[sizes.length - 1] || POTION_SIZES[0];
  const a = Math.round(Math.min(sz.hp, b.maxHp - b.hp));
  b.potions--;
  b.potAt = game.time + POTION_CD + begRand(0.4, 1.2);
  if (a <= 0) return;
  b.hp += a;
  vfxPotion(b.fig, 'hp');
}
// Gefallene stehen wieder auf, sobald der Kampf vorbei ist (BEG.reviveAfter s Ruhe, die eigene Figur lebt)
function begReviveCheck() {
  if (!beg.list.some((b) => b.dead)) return;
  const p = game.player;
  if (p.dead || beg.eng.length || game.time - begLastFight() < BEG.reviveAfter) return;
  for (const b of beg.list) {
    if (!b.dead) continue;
    b.dead = false;
    b.hp = Math.round(b.maxHp * 0.5);
    b.potions = BEG.potions;
    b.tgt = null;
    b.want = null;
    b.cast = null;
    b.win = [];
    begPlace(b, true);
  }
  ui.log('Deine gefallenen Begleiter stehen wieder auf.', 'info');
}

// --- Angriffe ----------------------------------------------------------------------------------------------------------
// läuft die Miete noch und steht der Begleiter? (für später fällige Treffer)
const begLive = (b, gen) => beg.on && beg.gen === gen && !b.dead;
// Bild einer Fertigkeit wie bei einem Mitspieler (abotFx → remoteSkillFx); bei Grafik „niedrig“ höchstens eins je
// BEG.fxGap s (must: Bilder, die die Figur bewegen oder einen Strahl beginnen/beenden, immer)
function begFx(b, e, at, extra, must) {
  if (!must && begLowGfx()) {
    if (game.time - beg.fxAt < BEG.fxGap && game.time >= beg.fxAt) return;
    beg.fxAt = game.time;
  }
  abotFx(b, e, at, extra);
}
// Monster im Kampf im Kreis (x, y, r); t (das Ziel selbst) zählt auch, wenn es nicht zum Kampf gehört (Kristall, Stein)
function begFoesIn(x, y, r, t) {
  const out = [];
  for (const m of begEngaged()) if (!m.dead && hyp(m.x - x, m.y - y) <= r + (m.r || 0)) out.push(m);
  if (t && !t.dead && !beg.engSet.has(t) && hyp(t.x - x, t.y - y) <= r + (t.r || 0)) out.push(t);
  return out;
}
// Grundangriff wie die eigene Figur (Kombo im Nahkampf, Schuss im Fernkampf, Treffer im Bild der Animation)
function begBasic(b, t) {
  const f = b.fig;
  const ba = b.basic;
  const cd = ba.cooldown / Math.max(0.4, b.st.atkSpeed || 1);
  b.atkCd = cd * begRand(1, 1.1);
  const [base, imp] = BASIC_TIMING[b.wkind] || [0.42, 0.45];
  const dur = Math.max(0.12, Math.min(base, cd * 0.95));
  abotFace(b, t, dur + 0.1);
  const gen = beg.gen;
  const trim = CLASSES[b.cls].trim;
  if (ba.ranged) {
    startSwing(f, 'cast', dur);
    later(dur * imp, () => {
      if (!begLive(b, gen) || t.dead) return;
      const dd = hyp(t.x - f.x, t.y - f.y);
      if (dd > ba.range + 120) return;
      const spd = ba.style === 'arrow' ? BOW_ARROW.speed : CASTER_SHOT.speed;
      if (!begLowGfx() || game.time - beg.fxAt >= BEG.fxGap) {
        spawnProjectile({ owner: 'remote', x: f.x, y: f.y, target: t, speed: spd, range: dd + 40, mul: 0, color: ba.color || '#f0e0b0', radius: 5, style: ba.style, el: ba.el });
        if (typeof snd !== 'undefined') snd.shot(f, ba);
      }
      later(dd / spd, () => {
        if (begLive(b, gen) && !t.dead && hyp(t.x - f.x, t.y - f.y) <= ba.range + 160) begHit(b, t, ba.mul || 1, { basic: true, color: ba.color });
      });
    });
    return;
  }
  const dag = b.wkind === 'dagger';
  f.combo = ((f.combo || 0) + 1) % (dag ? 4 : 3);
  const cm = (dag ? [1, 1, 1.1, 1.3][f.combo] : f.combo === 2 ? 1.25 : 1) * (ba.mul || 1);
  startSwing(f, 'combo', dur);
  later(dur * imp, () => {
    if (!begLive(b, gen)) return;
    vfxSwing(f, trim);
    const ok = !t.dead && hyp(t.x - f.x, t.y - f.y) - (t.r || 0) <= ba.range + 30;
    if (ok) begHit(b, t, cm, { basic: true, color: trim });
    if (typeof snd !== 'undefined') snd.swing(f, ok);
  });
}
// Fertigkeit wirken: die Pläne der Bots (abotPlan) gegen Monster – Bild wie bei einem Mitspieler, Treffer mit begHit
function begCast(b, e, t) {
  const now = game.time;
  const f = b.fig;
  const sk = e.sk;
  const P = e.plan;
  const gen = beg.gen;
  e.cd = Math.max(1, sk.cooldown || 6) * begRand(ABOT.cdSlack[0], ABOT.cdSlack[1]);
  b.gcdUntil = now + Math.max((typeof gcdTime === 'function' && gcdTime(b.ch)) || 0, begRand(ABOT.gcd[0], ABOT.gcd[1]));
  b.want = null;
  // Kraft wie in useSkill: Stufe × Fertigkeitsschaden; aus der Tarnung die nächste Attacke × nextHitMul
  let pw = dmgScale(e.lvl) * (b.st.skillDmg || 1);
  if (P.a !== 'b' && P.a !== 'h' && b.nextHitMul > 1) {
    pw *= b.nextHitMul;
    b.nextHitMul = 1;
  }
  const color = skillColor(sk, CLASSES[b.cls].trim);
  const o = { skill: e.base.id, critBonus: sk.critBonus, color, heavy: false, stun: sk.stun || 0 };
  if (P.a === 'b' || P.a === 'h') {
    if (sk.anim) startSwing(f, sk.anim, sk.animDur || 0.7);
    else {
      startSwing(f, 'pose', 0.7);
      vfxPowerUp(f, color);
    }
  } else if (P.a !== 'c' && P.a !== 'w') startSwing(f, sk.anim || 'skill', sk.anim ? sk.animDur || 0.5 : 0.34);
  if (t) abotFace(b, t, Math.max(0.45, (sk.animDur || 0.34) + 0.12));
  const tp = t ? { x: t.x, y: t.y } : null;
  const at = (delay, fn) => later(delay, () => { if (begLive(b, gen)) fn(); });
  switch (P.a) {
    case 'b': {
      b.buffs = b.buffs.filter((x) => x.id !== e.base.id);
      const dur = skillDuration(sk, e.lvl);
      b.buffs.push({ id: e.base.id, lvl: e.lvl, until: now + dur, duration: dur, effects: abotBuffEffects(b, sk, e.lvl) });
      if (sk.nextHitMul) b.nextHitMul = sk.nextHitMul;
      abotStats(b);
      begFx(b, e, f, {});
      break;
    }
    case 'h': {
      const low = begLowAlly(b, BEG.heal.range);
      if (low) {
        begHealUnit(low, low.max * (sk.amount || 0.3) * levelCurve(e.lvl, 0.03, 0.015, BUFF_JUMP) * (b.st.healPower || 1) * BEG.heal.mul);
        vfxPillar(low.e, '#9be59b', 1);
      }
      if (sk.effects) {
        b.buffs = b.buffs.filter((x) => x.id !== e.base.id);
        const dur = skillDuration(sk, e.lvl);
        b.buffs.push({ id: e.base.id, lvl: e.lvl, until: now + dur, duration: dur, effects: abotBuffEffects(b, sk, e.lvl) });
        abotStats(b);
      }
      begFx(b, e, low ? low.e : f, {});
      break;
    }
    case 'm': {
      begFx(b, e, tp, {});
      const om = P.bleed ? Object.assign({}, o, { bleedStack: P.bleed }) : o;
      for (const [delay, mul] of P.hits) at(delay, () => { for (const m of begFoesIn(f.x, f.y, P.reach + 10, t)) begHit(b, m, mul * pw, om); });
      b.lock = now + Math.min(0.5, sk.lock || 0.3);
      break;
    }
    case 's':
      begFx(b, e, tp, {});
      for (const [delay, mul] of P.hits) at(delay, () => { if (!t.dead && hyp(t.x - f.x, t.y - f.y) <= P.reach + (t.r || 0) + 30) begHit(b, t, mul * pw, o); });
      b.lock = now + 0.3;
      break;
    case 'g': begGap(b, e, t, pw, o); break;
    case 'f': begStep(b, e, t, pw, o); break;
    case 'p': {
      const travel = P.speed ? hyp(tp.x - f.x, tp.y - f.y) / P.speed : 0;
      const aim = tp;
      const ex = {};
      if (sk.type === 'bshot') { ex.n = P.hits.length; ex.ev = sk.every; }
      if (sk.type === 'mwave') {
        const l = Math.max(1, hyp(aim.x - f.x, aim.y - f.y));
        ex.dx = Math.round(((aim.x - f.x) / l) * 1000);
        ex.dy = Math.round(((aim.y - f.y) / l) * 1000);
      }
      if (sk.type === 'bloodlances') ex.ts = P.hits.map((h, k) => [Math.round(aim.x + (k % 2 ? 7 : -7)), Math.round(aim.y + (k % 3) * 4 - 4)]);
      begFx(b, e, aim, ex);
      for (const [delay, mul] of P.hits) {
        at(delay + travel, () => {
          if (t.dead) return;
          // gezielte Geschosse treffen, wer am gezielten Punkt steht; sofortige Zauber das Ziel in Reichweite
          const ok = P.speed ? hyp(t.x - aim.x, t.y - aim.y) <= ABOT.shotR + (t.r || 0) : hyp(t.x - f.x, t.y - f.y) <= P.reach + 60;
          if (!ok) return;
          const dealt = begHit(b, t, mul * pw, o);
          if (P.heal && dealt > 0) begHealBot(b, dealt * P.heal);
          if (P.leech && dealt > 0) begHealBot(b, dealt * P.leech);
        });
      }
      b.lock = now + 0.25;
      break;
    }
    case 'z': {
      let c = { x: tp.x, y: tp.y };
      const dc = hyp(c.x - f.x, c.y - f.y);
      if (dc > P.reach) c = { x: f.x + ((c.x - f.x) / dc) * P.reach, y: f.y + ((c.y - f.y) / dc) * P.reach };
      const ex = { sd: 1 };
      if (sk.type === 'bregen' || sk.type === 'msnow') ex.n = sk.ticks;
      if (sk.type === 'mtornado') ex.n = 3;
      if (sk.type === 'mprison') ex.ho = sk.hold;
      begFx(b, e, c, ex);
      for (const [delay, mul] of P.hits) {
        if (!(mul > 0)) continue;
        at(delay, () => { for (const m of begFoesIn(c.x, c.y, P.r, t)) begHit(b, m, mul * pw, o); });
      }
      b.lock = now + 0.3;
      break;
    }
    case 'c':
      b.chan = { e, t, until: now + P.dur, next: now + 0.15, pw, o, gen };
      begFx(b, e, tp, { bm: 1 }, true);
      break;
    case 'w':
      b.cast = { e, t, at: now + P.cast, pw, o, gen };
      startSwing(f, sk.anim || 'zauber', P.cast);
      begFx(b, e, tp, { d: P.cast }, true);
      break;
  }
}
// Sprung, Blinzeln, Schattenkette und Blitzschritt: zum Ziel, dort die Treffer
function begGap(b, e, t, pw, o) {
  const f = b.fig;
  const P = e.plan;
  const sk = e.sk;
  const gen = beg.gen;
  const now = game.time;
  const d0 = Math.max(1, hyp(t.x - f.x, t.y - f.y));
  const dir = { x: (t.x - f.x) / d0, y: (t.y - f.y) / d0 };
  const hitAt = (pt, delay, mul) => later(delay, () => {
    if (!begLive(b, gen)) return;
    for (const m of begFoesIn(pt ? pt.x : f.x, pt ? pt.y : f.y, P.r, t)) begHit(b, m, mul * pw, o);
  });
  if (P.move === 'leap') {
    const L = abotReach(f.x, f.y, dir, Math.max(0, d0 - 24));
    begFx(b, e, L, {}, true);
    for (const [delay, mul] of P.hits) hitAt(L, delay, mul);
    b.lock = now + (sk.crouch || 0.06) + (sk.air || 0.28) + (sk.recover || 0.12);
    return;
  }
  if (P.move === 'blink') {
    const behind = { x: t.x + dir.x * 26, y: t.y + dir.y * 26 };
    const to = canStand(behind.x, behind.y, 8, false) ? behind : abotReach(f.x, f.y, dir, Math.max(0, d0 - 22));
    f.blinkHide = now + 0.12;
    begFx(b, e, t, {}, true);
    later(0.05, () => {
      if (!begLive(b, gen)) return;
      f.x = to.x;
      f.y = to.y;
      abotFace(b, t, 0.4);
    });
    for (const [delay, mul] of P.hits) hitAt(null, delay, mul);
    b.lock = now + 0.3;
    return;
  }
  if (P.move === 'chain') {
    const a0 = Math.atan2(-dir.y, -dir.x);
    const hops = [];
    for (let k = 0; k < P.hops; k++) {
      const a = a0 + k * 2.2;
      let x = t.x + Math.cos(a) * 34;
      let y = t.y + Math.sin(a) * 34;
      if (!canStand(x, y, 8, false)) { x = t.x; y = t.y; }
      hops.push([Math.round(x), Math.round(y), Math.round(t.x), Math.round(t.y)]);
    }
    begFx(b, e, t, { h: hops }, true);
    for (const [delay, mul] of P.hits) hitAt(t, delay, mul);
    b.lock = now + P.hops * (sk.every || 0.13) + 0.15;
    return;
  }
  // Blitzschritt: durch das Ziel hindurch bis hinter es, wer an der Strecke steht, wird getroffen
  const to = abotReach(f.x, f.y, dir, Math.min(P.reach, d0 + 40));
  const from = { x: f.x, y: f.y };
  begFx(b, e, to, { pre: 1, x0: Math.round(from.x), y0: Math.round(from.y), x1: Math.round(to.x), y1: Math.round(to.y) }, true);
  f.x = to.x;
  f.y = to.y;
  later(P.hits[0][0], () => {
    if (!begLive(b, gen)) return;
    const vx = to.x - from.x;
    const vy = to.y - from.y;
    const l2 = Math.max(1, vx * vx + vy * vy);
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    for (const m of begFoesIn(mx, my, Math.sqrt(l2) / 2 + P.r, t)) {
      const k = Math.max(0, Math.min(1, ((m.x - from.x) * vx + (m.y - from.y) * vy) / l2));
      if (hyp(m.x - (from.x + vx * k), m.y - (from.y + vy * k)) <= P.r + (m.r || 0)) begHit(b, m, P.hits[0][1] * pw, o);
    }
  });
  b.lock = now + 0.3;
}
// Fluchtschritt (Eisschritt, Schattenschritt): vom Ziel weg, Treffer am alten Platz
function begStep(b, e, t, pw, o) {
  const f = b.fig;
  const P = e.plan;
  const sk = e.sk;
  const gen = beg.gen;
  const now = game.time;
  const d0 = Math.max(1, hyp(f.x - t.x, f.y - t.y));
  let dir = { x: (f.x - t.x) / d0, y: (f.y - t.y) / d0 };
  let to = abotReach(f.x, f.y, dir, P.dist);
  if (to.l < 60) {
    for (const s of [1, -1]) {
      const sd = { x: -dir.y * s, y: dir.x * s };
      const alt = abotReach(f.x, f.y, sd, P.dist);
      if (alt.l > to.l) { to = alt; dir = sd; }
    }
  }
  const from = { x: f.x, y: f.y };
  begFx(b, e, to, { x0: Math.round(from.x), y0: Math.round(from.y), x1: Math.round(to.x), y1: Math.round(to.y), pre: 1 }, true);
  if (P.move === 'shadow') {
    f.blinkHide = now + (sk.hide || 0.2);
    later((sk.hide || 0.2) * 0.5, () => { if (begLive(b, gen)) { f.x = to.x; f.y = to.y; } });
  } else {
    f.x = to.x;
    f.y = to.y;
  }
  for (const [delay, mul] of P.hits) later(delay, () => { if (begLive(b, gen)) for (const m of begFoesIn(from.x, from.y, P.r, t)) begHit(b, m, mul * pw, o); });
  b.lock = now + 0.35;
}
// Strahl halten (Eisstrahl, Blutsauger): stehen bleiben, je Takt ein Treffer
function begChanTick(b) {
  const C = b.chan;
  const now = game.time;
  const f = b.fig;
  const t = C.t;
  const fight = beg.engSet.has(t) || (t && t.type && t.type.crystal);
  if (C.gen !== beg.gen || !t || t.dead || hyp(t.x - f.x, t.y - f.y) > C.e.plan.reach + 50 || now >= C.until || !fight) {
    begStopChan(b);
    return;
  }
  abotFace(b, t, 0.3);
  f.swingKind = 'strahl';
  f.swingDur = 1;
  f.swing = Math.max(f.swing || 0, 0.55);
  if (now < C.next) return;
  C.next += C.e.plan.every;
  begFx(b, C.e, t, { bm: 2 }, true);
  const dealt = begHit(b, t, C.e.plan.mul * C.pw, C.o);
  if (C.e.plan.leech && dealt > 0) begHealBot(b, dealt * C.e.plan.leech);
}
function begStopChan(b) {
  const C = b.chan;
  if (!C) return;
  b.chan = null;
  try { abotFx(b, C.e, C.t && !C.t.dead ? C.t : null, { bm: 0 }); } catch (err) { /* Bild egal */ }
}
// Wirken (Feuerball): stehen, nach der Wirkzeit fliegt das Geschoss zum Ziel und trifft im Umkreis
function begCastTick(b) {
  const C = b.cast;
  const now = game.time;
  const f = b.fig;
  const t = C.t;
  const P = C.e.plan;
  if (C.gen !== beg.gen || !t || t.dead || hyp(t.x - f.x, t.y - f.y) > P.reach + 120) {
    begFx(b, C.e, t && !t.dead ? t : null, { cx: 1 }, true);
    b.cast = null;
    return;
  }
  abotFace(b, t, 0.3);
  if (now < C.at) return;
  b.cast = null;
  const aim = { x: t.x, y: t.y };
  begFx(b, C.e, aim, { rel: 1 }, true);
  const gen = beg.gen;
  later(hyp(aim.x - f.x, aim.y - f.y) / P.speed, () => {
    if (!begLive(b, gen)) return;
    for (const m of begFoesIn(aim.x, aim.y, P.r, t)) begHit(b, m, P.hits[0][1] * C.pw, Object.assign({}, C.o, { heavy: true }));
  });
  b.lock = now + 0.3;
}

// --- Treffer auf Monster ----------------------------------------------------------------------------------------------
// Bedrohung: aller Schaden der Begleiter zählt für den Tank (lebt er nicht, für die eigene Figur) – so hält er die
// Monster; allein und als Host über die Quelle in damageMonster, im Kanal über seinen Diener-Platz (netClientDamage)
const begThreatSrc = () => (beg.tank && !beg.tank.dead && beg.on ? beg.tank.mx : game.player);
// Rechnung wie hitMonster für die eigene Figur (Stufe, Stark gegen Monster und Arten, Weg, Grundangriff, Krit,
// Waffenspanne), mit den Werten des Begleiters × BEG.dmg; Rückgabe: wirklich abgezogenes Leben
function begHit(b, m, mul, o) {
  if (!m || m.dead || m.duelProxy || m.pvp || b.dead || !b.st) return 0;
  const s = b.st;
  const now = game.time;
  const k0 = BEG.dmg * (BEG.weg[b.cls + ':' + b.path] || 1);
  let factor = mul * levelPenalty(b.level, m.level) * k0;
  if (m.vulnerable && m.vulnerable.until > now) factor *= m.vulnerable.mul;
  factor *= (1 + (s.monsterDmg || 0) + kindDmgBonus(s, m)) * pathDmgMul(b.ch, 'pve');
  if (o.basic) factor *= BASIC_MUL * (1 + (s.basicDmg || 0));
  if (o.skill && s.natureDmg) factor *= 1 + s.natureDmg;
  let atk = s.atk;
  if (s.wMax > s.wMin) atk = Math.max(1, atk + (s.wMin + Math.random() * (s.wMax - s.wMin) - s.wAvg) * (s.wMul || 1));
  const r = calcDamage(atk, factor, m.def, Math.min(CRIT_CAP, (s.crit || 0) + (o.critBonus || 0)), b.level, 1.8 + (s.critDmg || 0));
  if (o.stun > 0 && !m.isStone && !(m.type && m.type.boss)) m.stun = Math.max(m.stun || 0, o.stun);
  // stapelnde Blutung (Aderlass) und Gift aus der Ausrüstung wie bei der Figur – vor damageMonster, damit ein
  // Mitspieler sie mit dem Treffer an den Host schickt
  if (!m.isStone) {
    if (o.bleedStack) bleedStackOn(m, s.atk * o.bleedStack.dps * (s.skillDmg || 1) * k0, o.bleedStack, b.mx);
    if (s.poison > 0 && Math.random() < s.poison) {
      applyToxin(m, r.amount);
      if (m.toxin) m.toxin.by = b.mx;
    }
  }
  m.begHitAt = now;
  beg.fightAt = now;
  const hp0 = Math.max(0, m.hp);
  const src = begThreatSrc();
  damageMonster(m, r.amount, r.crit, src, false, false);
  const dealt = Math.max(0, Math.min(r.amount, hp0 - Math.max(0, m.hp)));
  if (dealt > 0) {
    // Schadensanzeige: eine Zeile je Begleiter. Im Kanal ohne Tank rechnet der Host diesen Schaden der eigenen Figur
    // zu (Treffer ohne Diener-Platz) – dann keine eigene Zeile, sonst stünde er doppelt da
    if (typeof dmeterAdd === 'function' && !(net.mode === 'client' && src === game.player)) dmeterAdd(b.name, b.cls, dealt);
    // Lebensraub wie bei der Figur (je Treffer höchstens 3 %)
    const k = (s.hpSteal || 0) + (s.omniVamp || 0);
    if (k > 0) begHealBot(b, Math.min(dealt * k, b.maxHp * 0.03));
  }
  vfxImpact(m, r.crit, o.color);
  if (o.skill && (!begLowGfx() || r.crit)) skillHitFx(o.skill, m, r.crit, o.heavy);
  return dealt;
}

// --- Heilen ----------------------------------------------------------------------------------------------------------
// Schwächster Verbündeter (eigene Figur oder Begleiter) in Reichweite r des Begleiters b (ohne r: überall);
// Rückgabe { e, b, hp, max, fr } (ein festes Objekt) oder null
const BEG_LOW = { e: null, b: null, hp: 0, max: 1, fr: 1 };
function begLowAlly(b, r) {
  const p = game.player;
  const f = b.fig;
  let best = null;
  let bf = 1.01;
  let bb = null;
  if (p && !p.dead && (!r || hyp(p.x - f.x, p.y - f.y) <= r)) {
    const fr = p.hp / Math.max(1, (game.stats && game.stats.maxHp) || p.hp || 1);
    if (fr < bf) { bf = fr; best = p; bb = null; }
  }
  for (const x of beg.list) {
    if (x.dead || (r && hyp(x.fig.x - f.x, x.fig.y - f.y) > r)) continue;
    const fr = x.hp / Math.max(1, x.maxHp);
    if (fr < bf) { bf = fr; best = x.fig; bb = x; }
  }
  if (!best) return null;
  BEG_LOW.e = best;
  BEG_LOW.b = bb;
  BEG_LOW.hp = bb ? bb.hp : p.hp;
  BEG_LOW.max = bb ? bb.maxHp : Math.max(1, (game.stats && game.stats.maxHp) || 1);
  BEG_LOW.fr = bf;
  return BEG_LOW;
}
function begHealBot(b, amount) {
  if (!b || b.dead || !(amount > 0)) return;
  b.hp = Math.min(b.maxHp, b.hp + amount);
}
// Heilung einer Einheit aus begLowAlly: Begleiter still, die eigene Figur mit grüner Zahl
function begHealUnit(u, amount) {
  if (!u || !(amount > 0)) return;
  if (u.b) {
    begHealBot(u.b, amount);
    return;
  }
  const p = game.player;
  if (!p || p.dead) return;
  const a = Math.round(Math.min(Math.max(0, game.stats.maxHp - p.hp), amount));
  if (a <= 0) return;
  p.hp += a;
  addText(p.x + begRand(-6, 6), p.y - 44, '+' + a, 'heal');
}
// Heiler: Heilwelle auf den Schwächsten (unter BEG.heal.below), Gruppenheilung, wenn mehrere angeschlagen sind;
// dabei nah genug bei der Gruppe und mit etwas Abstand zu den Monstern. true = dieses Bild nichts anderes
function begHealerAct(b, dt) {
  const now = game.time;
  const H = BEG.heal;
  const f = b.fig;
  const k = H.mul * (b.st.healPower || 1);
  // Gruppenheilung
  if (now >= b.groupAt) {
    let n = 0;
    const p = game.player;
    if (p && !p.dead && hyp(p.x - f.x, p.y - f.y) <= H.range && p.hp < game.stats.maxHp * H.groupBelow) n++;
    for (const x of beg.list) if (!x.dead && hyp(x.fig.x - f.x, x.fig.y - f.y) <= H.range && x.hp < x.maxHp * H.groupBelow) n++;
    if (n >= H.groupMin) {
      b.groupAt = now + H.groupEvery;
      b.healAt = Math.max(b.healAt, now + 0.8);
      startSwing(f, 'pose', 0.7);
      vfxPowerUp(f, '#9be59b');
      if (p && !p.dead && hyp(p.x - f.x, p.y - f.y) <= H.range) {
        begHealUnit({ b: null }, game.stats.maxHp * H.groupPct * k);
        vfxPillar(p, '#9be59b', 0.7);
      }
      for (const x of beg.list) {
        if (x.dead || hyp(x.fig.x - f.x, x.fig.y - f.y) > H.range) continue;
        begHealBot(x, x.maxHp * H.groupPct * k);
        if (!begLowGfx()) vfxPillar(x.fig, '#9be59b', 0.7);
      }
      return true;
    }
  }
  const low = begLowAlly(b, 0);
  if (!low || low.fr >= H.below) return false;
  const d = hyp(low.e.x - f.x, low.e.y - f.y);
  // zu weit weg: hin (nicht mitten in die Monster)
  if (d > H.range * 0.85) {
    begGo(b, low.e.x, low.e.y, dt, 1.1);
    return true;
  }
  if (now < b.healAt || now < b.gcdUntil) return false;
  b.healAt = now + H.every * begRand(0.95, 1.1);
  b.gcdUntil = Math.max(b.gcdUntil, now + 0.5);
  abotFace(b, low.e, 0.5);
  startSwing(f, 'cast', 0.45);
  const tgt = low.e;
  const amount = low.max * H.pct * k;
  const unit = { b: low.b };
  addEffect({ type: 'beam', x: f.x, y: f.y - 14, follow2: tgt, dur: 0.35, color: '#9be59b' });
  const gen = beg.gen;
  later(0.25, () => {
    if (!begLive(b, gen)) return;
    begHealUnit(unit, amount);
    if (!begLowGfx()) particles(tgt.x, feetY(tgt) - 20, { count: 10, color: ['#9be59b', '#e0ffd0'], speed: [20, 70], life: [0.4, 0.8], size: [2, 3.5], drag: 2, angle: -Math.PI / 2, spread: 0.9 });
  });
  return true;
}

// --- Schaden an Begleitern --------------------------------------------------------------------------------------------
// wie damagePlayer: Ausweichen und Blocken nur gegen normale Angriffe (o.sure/o.dot treffen immer), „Erlittener Schaden“
// und Abwehr gegen die Angriffsart; ohne Zahlen über dem Kopf (die Gruppenanzeige blinkt), nur das Aufblitzen der Figur
function begHurt(b, amount, src, o = {}) {
  if (!b || b.dead || !beg.on || !(amount > 0)) return 0;
  const now = game.time;
  if (now < b.protectUntil) return 0;
  const s = b.st;
  if (!o.sure && !o.dot) {
    if (Math.random() < (s.dodge || 0)) return 0;
    if (s.block > 0 && Math.random() < s.block) return 0;
  }
  let taken = s.damageTaken || 1;
  if (src && src.type && !src.duelProxy) {
    const res = attackResist(s, monsterAttackKind(src), monsterKind(src) === 'human');
    if (res > 0) taken = Math.max(0.4, taken - res);
  }
  const dmg = Math.max(1, Math.round(amount * taken));
  b.hp -= dmg;
  b.hurtAt = now;
  b.fig.hurtAt = now;
  beg.fightAt = now;
  if (b.hp <= 0) begDie(b);
  return dmg;
}
function begDie(b) {
  if (b.dead) return;
  b.dead = true;
  b.hp = 0;
  b.deadAt = game.time;
  if (b.chan) begStopChan(b);
  b.cast = null;
  b.tgt = null;
  b.want = null;
  const f = b.fig;
  particles(f.x, feetY(f) - 18, { count: 22, color: ['#9fd0ff', '#ffffff', '#c8c0b0'], speed: [40, 150], life: [0.4, 0.9], size: [2, 4], drag: 3 });
  addText(f.x, feetY(f) - 56, 'Gefallen', 'info');
  ui.log(`${b.name} ist gefallen – steht nach dem Kampf wieder auf.`, 'warn');
  begSync();
}

// --- Warnflächen: Ausweichen ------------------------------------------------------------------------------------------
// beg.zones: { z, at, until, mode, safe } – z im Bodenmaß wie bskInZone (y × 1,2): ['c', x, y, r] Kreis,
// ['b', x, y, r0, r1] Band, ['w', …] Ausschnitt, ['l', …] Bahn, dazu ['q', x, y, r, Viertel] (Viertelschlag: alles
// außer dem sicheren Viertel) und ['f', Figur, r] (Kreis, der einer Figur folgt). mode: 'out' = nicht drinstehen,
// 'in' = hinein (geteilter Schlag), 'safe' = in der Fläche nur in einem der Kreise safe sicher (Lichtkreise).
// at: ab wann die Begleiter reagieren (BEG.react), until: Einschlag
const begNum = (v, lo, hi) => Number.isFinite(+v) && +v >= lo && +v <= hi;
function begZoneAdd(z, delay, mode, safe) {
  if (!beg.on || !z) return;
  const now = game.time;
  const d = Math.max(0.2, Math.min(8, +delay || 1));
  beg.zones.push({ z, at: now + begRand(BEG.react[0], BEG.react[1]), until: now + d + 0.15, mode: mode || 'out', safe: safe || null });
  if (beg.zones.length > 200) beg.zones.splice(0, beg.zones.length - 200);
}
function begZonesPrune(now) {
  const Z = beg.zones;
  let n = 0;
  for (let i = 0; i < Z.length; i++) if (Z[i].until >= now && Z[i].until - now < 12) Z[n++] = Z[i];
  Z.length = n;
}
// Liegt der Fußpunkt (x, fy) in der Fläche?
function begZoneIn(z, x, fy) {
  const t = z[0];
  if (t === 'q') {
    const dx = x - z[1];
    const dy = (fy - z[2]) * 1.2;
    return hyp(dx, dy) < z[3] && (typeof htSector !== 'function' || htSector(dx, dy) !== z[4]);
  }
  if (t === 'f') {
    const e = z[1];
    return !!e && !e.dead && hyp(x - e.x, (fy - feetY(e)) * 1.2) < z[2];
  }
  return typeof bskInZone === 'function' ? bskInZone(z, x, fy) : t === 'c' && hyp(x - z[1], (fy - z[2]) * 1.2) < z[3];
}
// Ist der Fußpunkt in Gefahr? (Warnflächen ab ihrer Reaktionszeit, Lachen der Instanzen, liegende Flächen der Bosse)
function begDanger(x, fy, now) {
  for (const Z of beg.zones) {
    if (now < Z.at || now > Z.until) continue;
    if (Z.mode === 'out') { if (begZoneIn(Z.z, x, fy)) return true; }
    else if (Z.mode === 'in') { if (hyp(x - Z.z[1], fy - Z.z[2]) < 700 && !begZoneIn(Z.z, x, fy)) return true; }
    else if (begZoneIn(Z.z, x, fy) && !Z.safe.some((s) => begZoneIn(s, x, fy))) return true;
  }
  if (typeof INST_HAZ !== 'undefined') for (const h of INST_HAZ) if (now <= h.until && hyp(x - h.x, (fy - h.y) * 1.2) < h.r + 10) return true;
  if (typeof BSK_FIELDS !== 'undefined') for (const F of BSK_FIELDS) if (now <= F.until && hyp(x - F.x, (fy - F.y) * 1.2) < F.r + 10) return true;
  return false;
}
// nächster sicherer Platz, in gerader Linie erreichbar: Ringe um den Begleiter, dazu die Mitten der sicheren Kreise,
// der Rand großer Kreise und das sichere Viertel des Viertelschlags
function begEscape(b, now) {
  const f = b.fig;
  const off = feetY(f) - f.y;
  let best = null;
  let bd = Infinity;
  const cand = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const d = hyp(x - f.x, y - f.y);
    if (d >= bd || !canStand(x, y, 8, false) || begDanger(x, y + off, now) || !navSight(f.x, f.y, x, y, 4)) return;
    bd = d;
    best = { x, y };
  };
  for (const Z of beg.zones) {
    if (now < Z.at || now > Z.until) continue;
    const z = Z.z;
    if (Z.mode === 'safe') for (const s of Z.safe) cand(s[1] + begRand(-12, 12), s[2] - off + begRand(-8, 8));
    else if (Z.mode === 'in') cand(z[1] + begRand(-12, 12), z[2] - off + begRand(-8, 8));
    else if (z[0] === 'q') {
      for (const r of [160, 320, 480, 640]) cand(z[1] + Math.cos(z[4] * Math.PI / 2) * r, z[2] - off + (Math.sin(z[4] * Math.PI / 2) * r) / 1.2);
    } else if ((z[0] === 'c' && z[3] > 260) || z[0] === 'b') {
      const R = (z[0] === 'c' ? z[3] : z[4]) + 40;
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; cand(z[1] + Math.cos(a) * R, z[2] - off + (Math.sin(a) * R) / 1.2); }
      if (z[0] === 'b' && z[3] > 30) cand(z[1] + begRand(-20, 20), z[2] - off + begRand(-15, 15));
    }
  }
  for (const r of [45, 80, 120, 170, 230, 300, 380]) {
    if (r > bd) break;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + b.idx * 0.37;
      cand(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.85);
    }
  }
  return best;
}
// in Gefahr: zum sichersten nahen Platz (Strahl und Wirken brechen ab); true = dieses Bild nichts anderes
function begAvoid(b, dt) {
  const now = game.time;
  const f = b.fig;
  if ((!beg.zones.length && !(typeof INST_HAZ !== 'undefined' && INST_HAZ.length) && !(typeof BSK_FIELDS !== 'undefined' && BSK_FIELDS.length))
    || !begDanger(f.x, feetY(f), now)) {
    b.esc = null;
    return false;
  }
  if (!b.esc || now >= b.escAt) {
    b.escAt = now + 0.25;
    b.esc = begEscape(b, now);
  }
  if (!b.esc) return false;
  if (b.chan) begStopChan(b);
  if (b.cast) {
    begFx(b, b.cast.e, null, { cx: 1 }, true);
    b.cast = null;
  }
  begGo(b, b.esc.x, b.esc.y, dt, 1.15);
  return true;
}
// Schaden über Zeit in Lachen (Instanzen) und liegenden Flächen (Frost, Gift, Glut der Bosse), je 0,5 s
function begFieldsTick() {
  const now = game.time;
  const haz = typeof INST_HAZ !== 'undefined' && INST_HAZ.length ? INST_HAZ : null;
  const fld = typeof BSK_FIELDS !== 'undefined' && BSK_FIELDS.length ? BSK_FIELDS : null;
  if (!haz && !fld) return;
  for (const b of beg.list) {
    if (b.dead) continue;
    const f = b.fig;
    const fy = feetY(f);
    if (haz && now >= b.hazAt) {
      for (const h of haz) {
        if (now > h.until || hyp(f.x - h.x, (fy - h.y) * 1.2) >= h.r) continue;
        b.hazAt = now + 0.5;
        begHurt(b, calcDamage(h.atk, 0.22 * levelBonus(h.lvl, b.level), b.st.def, 0, h.lvl).amount, h.m, { sure: true });
        break;
      }
    }
    if (fld && now >= b.fieldAt && !b.dead) {
      for (const F of fld) {
        if (now > F.until || hyp(f.x - F.x, (fy - F.y) * 1.2) >= F.r) continue;
        b.fieldAt = now + 0.5;
        begHurt(b, calcDamage(F.a, (F.mul || 0.3) * levelBonus(F.l, b.level), b.st.def, 0, F.l).amount, F.m, { dot: true });
        break;
      }
    }
  }
}
// Warnflächen der Endboss-, Instanz- und Höllenthron-Angriffe (raidTelegraph, auch beim Mitspieler)
function begRaidZones(m, kind, circles, inner, delay) {
  if (!beg.on || !Array.isArray(circles)) return;
  const cs = circles.slice(0, 64).filter((c) => c && begNum(c.x, -1e7, 1e7) && begNum(c.y, -1e7, 1e7) && begNum(c.r, 1, 3000));
  if (!cs.length) return;
  const inn = begNum(inner, -8, 3000) ? +inner : 0;
  if (kind === 'ult') {
    const [big, ...safe] = cs;
    begZoneAdd(['c', big.x, big.y, big.r], delay, 'safe', safe.map((c) => ['c', c.x, c.y, c.r * 0.8]));
    return;
  }
  if (kind === 'doom') {
    begZoneAdd(['c', m.homeX, m.homeY + 10, typeof RAID_REACH !== 'undefined' ? RAID_REACH : 1100], delay, 'safe', cs.map((c) => ['c', c.x, c.y, c.r * 0.8]));
    return;
  }
  if (kind === 'quarter') {
    begZoneAdd(['q', cs[0].x, cs[0].y, cs[0].r, -inn - 1], delay);
    return;
  }
  for (const c of cs) begZoneAdd(inn > 0 ? ['b', c.x, c.y, Math.max(0, inn - 8), c.r + 8] : ['c', c.x, c.y, c.r + 8], delay);
}
// Warnflächen der eigenen Boss-Angriffe (bossangriffe.js); Seelenbann (Kharzul): Abstand zur eigenen Figur
function begBskZones(m, S) {
  if (!beg.on || !m || !S || !Array.isArray(S.z) || typeof bskSkill !== 'function') return;
  const K = bskSkill(m, S.k);
  const T = K && BSK_T[K.t];
  if (!T) return;
  const d = begNum(S.d, 0, 10) ? +S.d : 1.5;
  if (K.t === 'bann') {
    begZoneAdd(['f', game.player, S.z[0] && begNum(S.z[0][3], 10, 600) ? +S.z[0][3] : 150], d);
    return;
  }
  if (T.noHit) return;
  // beim Mitspieler schon von bskClean geprüft; hier noch einmal gekappt und nur endliche Zahlen
  for (const z of S.z.slice(0, 24)) {
    if (Array.isArray(z) && z.length <= 8 && typeof z[0] === 'string' && z.slice(1).every((v) => begNum(v, -1e7, 1e7))) begZoneAdd(z, d + Math.max(0, Math.min(12, bskZt(z))));
  }
}
// Treffer der Endboss-, Instanz- und Höllenthron-Angriffe auf Begleiter: dieselben Regeln wie raidResolve,
// instResolve und htQuarterResolve für die eigene Figur
function begRaidHit(m, kind, circles, inner, atk, lvl) {
  if (!beg.on || !m || !Array.isArray(circles)) return;
  const A = begNum(atk, 0, 1e9) ? +atk : m.atk || 0;
  const L = begNum(lvl, 1, 300) ? Math.round(+lvl) : m.level || 1;
  const inn = begNum(inner, -8, 3000) ? +inner : 0;
  const C = circles.slice(0, 64).filter((c) => c && begNum(c.x, -1e7, 1e7) && begNum(c.y, -1e7, 1e7) && begNum(c.r, 0, 3000));
  if (!C.length || !(A > 0)) return;
  const inst = !!(m.type && m.type.inst) && typeof INST_KINDS !== 'undefined' && INST_KINDS.has(kind);
  for (const b of beg.list) {
    if (b.dead) continue;
    const f = b.fig;
    const fy = feetY(f);
    const dd = (c) => hyp(f.x - c.x, (fy - c.y) * 1.2);
    const inC = (c) => dd(c) < c.r;
    let mul = 0;
    if (inst) {
      if (kind === 'ult') {
        const [big, ...safe] = C;
        if (inC(big) && !safe.some(inC)) mul = INST_MUL.ult;
      } else if (kind === 'ringout' || kind === 'core') {
        const d = dd(C[0]);
        if (d < C[0].r && d >= inn) mul = INST_MUL[kind];
      } else if (kind === 'chain') {
        const n = C.filter(inC).length;
        if (n) mul = INST_MUL.chain * n;
      } else if (C.some(inC)) {
        mul = INST_MUL[kind] || 2;
        // Sog: zum Boss gerissen (mit Kollision)
        if (kind === 'pull') {
          const dx = m.x - f.x;
          const dy = m.y - f.y;
          const d = hyp(dx, dy) || 1;
          const go = Math.max(0, d - ((m.r || 20) + 40));
          for (let s = 0; s < 8; s++) moveEntity(f, ((dx / d) * go) / 8, ((dy / d) * go) / 8, false);
        }
      }
    } else if (kind === 'quarter' || kind === 'qring' || kind === 'qcore') {
      if (typeof htInside === 'function' && !htInside(f)) continue;
      const c = C[0];
      const dx = f.x - c.x;
      const dy = (fy - c.y) * 1.2;
      const d = hyp(dx, dy);
      const hit = kind === 'quarter' ? d < c.r && (typeof htSector !== 'function' || htSector(dx, dy) !== -inn - 1) : kind === 'qring' ? d < c.r && d >= inn : d < c.r;
      if (hit) mul = RAID_MUL[kind] || 9.5;
    } else if (kind === 'doom') {
      if (hyp(f.x - m.homeX, f.y - m.homeY) <= RAID_REACH && !C.some(inC)) mul = RAID_MUL.doom || 14;
    } else if (C.some((c) => { const d = dd(c); return d < c.r && d >= inn; })) mul = RAID_MUL[kind] || 3;
    if (mul > 0) begHurt(b, calcDamage(A, mul * levelBonus(L, b.level), b.st.def, 0.05, L).amount, m, { sure: true });
  }
}
// Stampfer eines Dungeon-Bosses (updateBoss bzw. Nachricht 'slam' beim Mitspieler)
function begSlamHit(m, r, atk, lvl) {
  if (!beg.on || !m) return;
  for (const b of beg.list) {
    if (b.dead || hyp(b.fig.x - m.x, (b.fig.y - m.y) * 1.2) >= r) continue;
    begHurt(b, calcDamage(atk, 2.2 * levelBonus(lvl, b.level), b.st.def, 0.05, lvl).amount, m, { sure: true });
  }
}
// Splitterschlag (geteilt: wer im Kreis steht, teilt; steht niemand drin, trifft es alle voll) und Schmetterschlag
// der Elite (zone: nur wer drinsteht) – wie endgameShareResolve für die eigene Figur, Anteil am eigenen Höchstleben
function begShareHit(m, c, pct, zone) {
  if (!beg.on || !m || !c || !begNum(pct, 0, 1) || !begNum(c.x, -1e7, 1e7) || !begNum(c.y, -1e7, 1e7) || !begNum(c.r, 1, 2000)) return;
  const inside = (q) => hyp(q.x - c.x, (feetY(q) - c.y) * 1.2) < c.r;
  if (zone) {
    for (const b of beg.list) if (!b.dead && inside(b.fig)) begHurt(b, Math.round(b.maxHp * pct), m, { sure: true });
    return;
  }
  const all = endgamePlayersNear(m);
  const n = all.filter(inside).length;
  for (const b of beg.list) {
    if (b.dead || !all.includes(b.mx)) continue;
    const share = n ? (inside(b.fig) ? pct / n : 0) : pct;
    if (share > 0) begHurt(b, Math.round(b.maxHp * share), m, { sure: true });
  }
}
// Treffer eines Monsters (Host) auf einen Begleiter beim Mitspieler: Nachricht 'ahit' mit dem Platz (geprüft)
function begAhit(d) {
  const slot = d.s | 0;
  const b = beg.list.find((x) => x.slot === slot);
  if (!b || b.dead || !beg.on) return;
  const atk = begNum(d.atk, 0, 1e9) ? +d.atk : 0;
  const lvl = begNum(d.lvl, 1, 300) ? Math.round(+d.lvl) : b.level;
  if (!(atk > 0)) return;
  const m = typeof net !== 'undefined' && net.mons ? net.mons.get(d.id) : null;
  if (m) monsterStrikeFx(m, b.fig);
  begHurt(b, calcDamage(atk, levelBonus(lvl, b.level), b.st.def, 0.03, lvl).amount, m || null);
}

// --- Monster: Begleiter als Ziele (allein und als Host; im Kanal führt der Host die Monster) -----------------------------
// Stellvertreter b.mx: gültig, solange der Begleiter lebt und die Miete läuft (sonst suchen sich die Monster ein neues Ziel)
const begProxyOk = (t) => !!(t && t.beg && t.begB && beg.on && !t.begB.dead && beg.list.includes(t.begB));
if (typeof allyPresent === 'function') {
  const _begAllyPresent = allyPresent;
  allyPresent = function (t) {
    if (t && t.beg) return begProxyOk(t);
    return _begAllyPresent(t);
  };
}
// stirbt ein eigener Diener, nehmen Monster, die einen Diener jagen, wieder die Figur – Begleiter bleiben ihr Ziel
if (typeof releaseAllyTargets === 'function') {
  const _begRelease = releaseAllyTargets;
  releaseAllyTargets = function () {
    if (!beg.on) return _begRelease();
    const keep = [];
    for (const m of game.monsters) if (m.target && m.target.beg) keep.push(m, m.target);
    _begRelease();
    for (let i = 0; i < keep.length; i += 2) if (begProxyOk(keep[i + 1])) keep[i].target = keep[i + 1];
  };
}
// kein anderes Ziel (eigene Figur tot oder getarnt): der nächste Begleiter in Sicht
if (typeof nextTarget === 'function') {
  const _begNextTarget = nextTarget;
  nextTarget = function (m, players, leash) {
    const t = _begNextTarget(m, players, leash);
    if (t || !beg.on || hyp(m.x - m.homeX, m.y - m.homeY) > leash) return t;
    let best = null;
    let bd = 400;
    for (const b of beg.list) {
      if (b.dead) continue;
      const d = hyp(b.mx.x - m.x, b.mx.y - m.y);
      if (d < bd && navSight(m.x, m.y, b.mx.x, b.mx.y, 4)) { bd = d; best = b.mx; }
    }
    return best;
  };
}
// Nahkampf eines Monsters gegen einen Begleiter wie gegen die eigene Figur (Stufenabstand, Flankieren, Zermürbung,
// Ausweichen, Blocken); Fernkämpfer schießen wie immer (Geschosse: updateProjectiles unten)
if (typeof monsterAttack === 'function') {
  const _begMonsterAttack = monsterAttack;
  monsterAttack = function (m, target) {
    if (target && target.beg && !(m.type && m.type.ranged)) {
      const b = target.begB;
      m.attackAnim = 0.25;
      if (!b || b.dead || !beg.on) return;
      const eg = endgameStrike(m, target);
      monsterStrikeFx(m, b.fig);
      begHurt(b, calcDamage(m.atk, levelBonus(m.level, b.level) * eg.mul, b.st.def * (1 - eg.shred), 0.03, m.level).amount, m);
      return;
    }
    return _begMonsterAttack(m, target);
  };
}
if (typeof damageAlly === 'function') {
  const _begDamageAlly = damageAlly;
  damageAlly = function (a, amount) {
    if (a && a.beg) {
      if (a.begB) begHurt(a.begB, amount, null, {});
      return;
    }
    return _begDamageAlly(a, amount);
  };
}
// Geschosse der Monster treffen auch Begleiter (wie die eigene Figur: Bosse treffen immer)
if (typeof updateProjectiles === 'function') {
  const _begUpdateProjectiles = updateProjectiles;
  updateProjectiles = function (dt) {
    _begUpdateProjectiles(dt);
    if (!beg.on) return;
    let hit = false;
    for (const pr of game.projectiles) {
      if (pr.done || pr.owner !== 'monster') continue;
      for (const b of beg.list) {
        if (b.dead) continue;
        const f = b.fig;
        if (hyp(f.x - pr.x, f.y - pr.y) > (f.r || 11) + (pr.radius || 5)) continue;
        pr.done = true;
        hit = true;
        particles(f.x, feetY(f) - 18, { count: 6, color: [pr.color || '#ffffff', '#ffffff'], speed: [60, 140], life: [0.15, 0.3], size: [1.5, 2.5], shape: 'spark', drag: 6 });
        const src = pr.source || null;
        const lvl = src && begNum(src.level, 1, 300) ? src.level : b.level;
        const bt = src && src.type;
        begHurt(b, calcDamage(+pr.atk || 0, levelBonus(lvl, b.level), b.st.def, 0.03, lvl).amount, bt ? src : null, bt && (bt.boss || bt.raid) ? { sure: true } : {});
        break;
      }
    }
    if (hit) game.projectiles = game.projectiles.filter((pr) => !pr.done);
  };
}
// Flächen der Bosse: Warnflächen merken (Ausweichen) und Treffer auf Begleiter (auch beim Mitspieler über 'raid')
if (typeof raidTelegraph === 'function') {
  const _begRaidTelegraph = raidTelegraph;
  raidTelegraph = function (m, kind, circles, inner, delay) {
    const r = _begRaidTelegraph(m, kind, circles, inner, delay);
    try { begRaidZones(m, kind, circles, inner, delay); } catch (e) { /* nur Ausweichen */ }
    return r;
  };
}
if (typeof raidResolve === 'function') {
  const _begRaidResolve = raidResolve;
  raidResolve = function (m, kind, circles, inner, atk, lvl) {
    const r = _begRaidResolve(m, kind, circles, inner, atk, lvl);
    try { begRaidHit(m, kind, circles, inner, atk === undefined ? m && m.atk : atk, lvl === undefined ? m && m.level : lvl); } catch (e) { console.warn('Begleiter (Flächen):', e); }
    return r;
  };
}
if (typeof bskShow === 'function') {
  const _begBskShow = bskShow;
  bskShow = function (m, S) {
    const r = _begBskShow(m, S);
    try { begBskZones(m, S); } catch (e) { /* nur Ausweichen */ }
    return r;
  };
}
if (typeof bskLand === 'function') {
  const _begBskLand = bskLand;
  bskLand = function (m, S, K, T, th, zs, t) {
    const r = _begBskLand(m, S, K, T, th, zs, t);
    try {
      if (beg.on && m && !m.dead && T && !T.noHit && S && Array.isArray(zs)) {
        const mul = ((K && K.mul) || T.mul || 1) * (S.b ? BSK.bigMul : 1);
        const a = begNum(S.a, 0, 1e9) ? +S.a : m.atk;
        const l = begNum(S.l, 1, 300) ? Math.round(+S.l) : m.level;
        for (const b of beg.list) {
          if (b.dead || !bskNear(m, b.fig)) continue;
          const fy = feetY(b.fig);
          if (zs.some((z) => Array.isArray(z) && bskInZone(z, b.fig.x, fy))) begHurt(b, calcDamage(a, mul * levelBonus(l, b.level), b.st.def, 0.05, l).amount, m, { sure: true });
        }
      }
    } catch (e) { console.warn('Begleiter (Boss-Angriff):', e); }
    return r;
  };
}
// Splitterschlag: Begleiter zählen beim Teilen mit (allein und beim Mitspieler rechnet jedes Gerät den eigenen Anteil)
if (typeof endgamePlayersNear === 'function') {
  const _begEgNear = endgamePlayersNear;
  endgamePlayersNear = function (m) {
    const list = _begEgNear(m);
    if (beg.on && m) for (const b of beg.list) if (!b.dead && hyp(b.mx.x - m.x, b.mx.y - m.y) < ENDGAME.shareReach) list.push(b.mx);
    return list;
  };
}
if (typeof endgameShareShow === 'function') {
  const _begShareShow = endgameShareShow;
  endgameShareShow = function (m, c, delay, zone) {
    const r = _begShareShow(m, c, delay, zone);
    if (beg.on && c && begNum(c.x, -1e7, 1e7) && begNum(c.y, -1e7, 1e7) && begNum(c.r, 1, 2000)) begZoneAdd(['c', c.x, c.y, zone ? c.r + 8 : c.r * 0.7], delay, zone ? 'out' : 'in');
    return r;
  };
}
if (typeof endgameShareResolve === 'function') {
  const _begShareResolve = endgameShareResolve;
  endgameShareResolve = function (m, c, pct, zone) {
    const r = _begShareResolve(m, c, pct, zone);
    try { begShareHit(m, c, pct, zone); } catch (e) { console.warn('Begleiter (Splitterschlag):', e); }
    return r;
  };
}
// Stampfer der Dungeon-Bosse (allein/Host): Warnfläche beim Ausholen, Treffer beim Einschlag
if (typeof updateBoss === 'function') {
  const _begUpdateBoss = updateBoss;
  updateBoss = function (m, dt) {
    if (!beg.on) return _begUpdateBoss(m, dt);
    const c0 = m.cast;
    const r = _begUpdateBoss(m, dt);
    try {
      const B = m.type && m.type.boss;
      if (B && c0 && c0.kind === 'slam' && m.cast !== c0) begSlamHit(m, B.slam, m.atk, m.level);
      else if (B && m.cast && m.cast !== c0 && m.cast.kind === 'slam') begZoneAdd(['c', m.x, feetY(m), B.slam + 8], m.cast.at - game.time);
    } catch (e) { /* nur Begleiter */ }
    return r;
  };
}
// Endbosse: Begleiter stehen in der Halle wie Spieler (Meteore auf jeden, Sprung und Sturm auch auf sie). Für Kristalle
// und Lichtkreise (Skalierung) zählen sie je BEG.weight (countMode); als Host auch die Begleiter der Mitspieler
function begRaidCompanions(m, list, weighted) {
  const near = (x, y) => !inVillage(x, y) && (!m || hyp(x - m.homeX, y - m.homeY) < RAID_REACH);
  const add = [];
  if (beg.on) for (const b of beg.list) if (!b.dead && near(b.mx.x, b.mx.y)) add.push(b.mx);
  if (net.mode === 'host') {
    for (const rp of net.players.values()) {
      if (!rp || rp.gone || rp.dead || !Array.isArray(rp.allies)) continue;
      for (const al of rp.allies) if (al.begRemote && near(al.x, al.y)) add.push(al);
    }
  }
  if (!add.length) return list;
  if (weighted) add.length = Math.round(add.length * BEG.weight);
  for (const e of add) list.push(e);
  return list;
}
if (typeof raidPlayers === 'function') {
  const _begRaidPlayers = raidPlayers;
  raidPlayers = function (m) {
    const list = _begRaidPlayers(m);
    try { return begRaidCompanions(m, list, beg.countMode); } catch (e) { return list; }
  };
}
for (const fn of ['raidSummonCrystals', 'raidDoom']) {
  if (typeof window[fn] !== 'function') continue;
  const orig = window[fn];
  window[fn] = function (m) {
    beg.countMode = true;
    try { return orig(m); } finally { beg.countMode = false; }
  };
}

// Schadensanzeige: Schaden über Zeit, den ein Begleiter gesetzt hat (Blutung, Gift), in seine eigene Zeile
if (typeof dmeterHost === 'function') {
  const _begDmHost = dmeterHost;
  dmeterHost = function (src, amount) {
    if (src && src.beg && src.begB) {
      if (amount > 0 && typeof dmeterAdd === 'function') dmeterAdd(src.begB.name, src.begB.cls, amount);
      return;
    }
    return _begDmHost(src, amount);
  };
}
// Heilt die eigene Figur ihre Gruppe (Ulti-Heilung über healParty), heilt das auch die Begleiter im Umkreis
if (typeof healParty === 'function') {
  const _begHealParty = healParty;
  healParty = function (pct, x, y, r) {
    const res = _begHealParty(pct, x, y, r);
    if (beg.on && begNum(pct, 0, 5) && begNum(r, 0, 5000)) {
      const hp = (game.stats && game.stats.healPower) || 1;
      for (const b of beg.list) if (!b.dead && hyp(b.fig.x - x, b.fig.y - y) <= r) begHealBot(b, b.maxHp * Math.min(0.3, pct * hp));
    }
    return res;
  };
}

// --- Mitspieler-Modus: Begleiter als Diener-Plätze beim Host --------------------------------------------------------------
// Der Host führt die Monster. Die Begleiter stehen (ab Platz BEG.slot0) in der Diener-Liste des eigenen Zustands (al):
// So greifen Monster des Hosts sie an (Treffer kommen als 'ahit'), und Treffer der Begleiter gehen als Treffer des
// Tanks (Platz al) zum Host – die Bedrohung landet beim Tank. Das 7. Feld nennt die Rolle (t/h/s; ältere Versionen
// lesen es nicht).
const BEG_ROLE_CH = { tank: 't', heiler: 'h', schaden: 's' };
if (typeof netPlayerState === 'function') {
  const _begNetState = netPlayerState;
  netPlayerState = function () {
    const s = _begNetState();
    if (!s || !beg.on || net.mode !== 'client') return s;
    const al = Array.isArray(s.al) ? s.al.slice() : [];
    for (const b of beg.list) if (!b.dead) al.push([Math.round(b.fig.x), Math.round(b.fig.y), 0, b.fig.moving ? 2 : 0, b.slot, 0, BEG_ROLE_CH[b.role]]);
    if (al.length) s.al = al;
    return s;
  };
}
if (typeof netClientDamage === 'function') {
  const _begClientDamage = netClientDamage;
  netClientDamage = function (m, amount, crit, isDot, source) {
    if (!(source && source.beg)) return _begClientDamage(m, amount, crit, isDot, source);
    // nur für diesen Aufruf in der eigenen Diener-Liste: netClientDamage schickt dann den Platz (al) mit
    game.allies.push(source);
    try {
      return _begClientDamage(m, amount, crit, isDot, source);
    } finally {
      const i = game.allies.indexOf(source);
      if (i >= 0) game.allies.splice(i, 1);
    }
  };
}
if (typeof netOnClientData === 'function') {
  const _begNetClient = netOnClientData;
  netOnClientData = function (d) {
    if (d && typeof d === 'object' && d.t === 'ahit' && Number.isInteger(+d.s) && +d.s >= BEG.slot0 && +d.s < BEG.slot0 + 10) {
      try { begAhit(d); } catch (e) { /* fremde Daten */ }
      return;
    }
    const r = _begNetClient(d);
    try {
      if (beg.on && d && typeof d === 'object') {
        if (d.t === 'warn' && begNum(d.x, -1e7, 1e7) && begNum(d.y, -1e7, 1e7) && begNum(d.r, 1, 800)) begZoneAdd(['c', +d.x, +d.y, +d.r + 8], 1.1);
        else if (d.t === 'slam' && begNum(d.r, 1, 800) && begNum(d.atk, 0, 1e9) && begNum(d.lvl, 1, 300)) {
          const m = net.mons.get(d.id);
          if (m) begSlamHit(m, +d.r, +d.atk, Math.round(+d.lvl));
        }
      }
    } catch (e) { /* fremde Daten */ }
    return r;
  };
}
// andere Geräte: Diener-Plätze ab BEG.slot0 sind Begleiter – nicht als Skelett zeigen, nicht zerfallen lassen
if (typeof netRemoteAllies === 'function') {
  const _begRemoteAllies = netRemoteAllies;
  netRemoteAllies = function (rp, list) {
    _begRemoteAllies(rp, list);
    if (!rp || !Array.isArray(rp.allies) || !rp.allies.length) return;
    for (const al of rp.allies) {
      if (!(al.slot >= BEG.slot0)) continue;
      al.begRemote = true;
      al.name = ''; // kein Schild ohne Figur (3D-Schilder nehmen die Diener der Mitspieler mit)
      const e = Array.isArray(list) ? list.find((x) => Array.isArray(x) && x[4] === al.slot) : null;
      const ch = e && typeof e[6] === 'string' ? e[6] : '';
      al.begRole = ch === 't' ? 'tank' : ch === 'h' ? 'heiler' : ch === 's' ? 'schaden' : al.begRole || '';
    }
  };
}
if (typeof allyCrumble === 'function') {
  const _begCrumble = allyCrumble;
  allyCrumble = function (a) {
    if (a && (a.begRemote || a.beg)) return;
    return _begCrumble(a);
  };
}
if (typeof syncAlly3 === 'function') {
  const _begSyncAlly3 = syncAlly3;
  syncAlly3 = function (al, dt) {
    if (al && al.begRemote) return;
    return _begSyncAlly3(al, dt);
  };
}

// --- Turm der Verdammten ---------------------------------------------------------------------------------------------
// Begleiter in der Halle kämpfen wie Teilnehmer: Ziele der Verdammten (neue nehmen zuerst den Tank), und die Ebene
// beginnt erst von vorn, wenn auch sie liegen. Skalierung: je Begleiter BEG.weight Spieler (Zahl der Gegner, Steine,
// Schlüssel … mit der gerundeten Zahl, Leben und Schaden der Gegner genau).
function begTurmCount() {
  if (beg.hire && beg.hire.key === 'turm') return beg.list.length;
  if (beg.want && beg.want.key === 'turm') return beg.want.roles.length;
  return 0;
}
function begTurmExtra(S) {
  let n = 0;
  for (const id of S.members) {
    if (id === 'me') n += beg.hire && beg.hire.key === 'turm' ? beg.list.length : 0;
    else n += S.begN ? Math.max(0, Math.min(BEG.turmMax, S.begN[id] | 0)) : 0;
  }
  return n * BEG.weight;
}
if (typeof turmFighters === 'function') {
  const _begTurmFighters = turmFighters;
  turmFighters = function (S, s) {
    const out = _begTurmFighters(S, s);
    if (beg.on && S.members.includes('me')) for (const b of beg.list) if (!b.dead && turmSlotAt(b.fig.x, b.fig.y) === s) out.push(b.mx);
    if (net.mode === 'host') {
      for (const id of S.members) {
        const rp = id === 'me' ? null : net.players.get(id);
        if (!rp || rp.gone || rp.dead || !Array.isArray(rp.allies)) continue;
        for (const al of rp.allies) if (al.begRemote && turmSlotAt(al.x, al.y) === s) out.push(al);
      }
    }
    return out;
  };
}
if (typeof turmPickTarget === 'function') {
  const _begTurmPick = turmPickTarget;
  turmPickTarget = function (S, m, fighters) {
    for (const o of fighters) {
      if (o && ((o.beg && o.begB && o.begB.role === 'tank' && !o.begB.dead) || (o.begRemote && o.begRole === 'tank'))) return o;
    }
    return _begTurmPick(S, m, fighters);
  };
}
if (typeof turmStartLevel === 'function' && typeof turmTune === 'function') {
  const _begTurmStart = turmStartLevel;
  turmStartLevel = function (S, s) {
    const extra = begTurmExtra(S);
    S.begEff = 0;
    _begTurmStart(S, s);
    if (!(extra > 0)) return;
    const eff = Math.min(TURM.maxPlayers, S.members.length + extra);
    S.begEff = eff;
    S.players = turmPl(Math.round(eff));
    const E = S.level;
    const D = TURM_EBENEN[E];
    if (D.art === 'w') {
      S.queue = turmWave(E, S.players);
      S.total = S.queue.length;
    } else if (D.art === 'b' || D.art === 'f') for (const m of S.boss) turmTune(m, S, 'boss');
    else if (D.art === 's') turmStoneSet(s, [0, 2, 4, 6], 's', S.players);
    else if (D.art === 't') turmStoneSet(s, [0, 1, 2, 3, 4, 5, 6, 7], 't', S.players);
    turmTellState(S, s);
  };
  const _begTurmTune = turmTune;
  turmTune = function (m, S, art) {
    _begTurmTune(m, S, art);
    const eff = S && S.begEff;
    if (!(eff > 0)) return;
    // Leben und Schaden genau mit eff statt der gerundeten Zahl S.players
    const k1 = turmPl(S.players) - 1;
    const k2 = Math.max(0, eff - 1);
    const boss = art === 'boss';
    const hpK = (1 + (boss ? TURM.perBoss : TURM.perHp) * k2) / (1 + (boss ? TURM.perBoss : TURM.perHp) * k1);
    const atkK = (1 + (boss ? TURM.perBossAtk : TURM.perAtk) * k2) / (1 + (boss ? TURM.perBossAtk : TURM.perAtk) * k1);
    m.maxHp = Math.max(1, Math.round(m.maxHp * hpK));
    m.hp = m.maxHp;
    m.atk = Math.max(1, Math.round(m.atk * atkK));
  };
}
// Mitspieler: Zahl der eigenen Begleiter an den Host (beim Betreten und bei jeder Änderung); der Host merkt sie je
// Teilnehmer (geprüft: ganze Zahl 0 … BEG.turmMax, nur für den Absender selbst)
if (typeof turmToHost === 'function') {
  const _begTurmToHost = turmToHost;
  turmToHost = function (d) {
    if (d && (d.k === 'vtn' || d.k === 'vtj')) d.bg = begTurmCount();
    return _begTurmToHost(d);
  };
}
function begTurmTell() {
  if (net.mode === 'client' && game.turmRun && typeof turmToHost === 'function') turmToHost({ k: 'vtb', n: begTurmCount() });
}
function begTurmNote(pid, n) {
  const v = Number.isInteger(+n) ? Math.max(0, Math.min(BEG.turmMax, +n)) : 0;
  for (const S of turmHost.slots) {
    if (!S || !S.members.includes(pid)) continue;
    S.begN = S.begN || {};
    S.begN[pid] = v;
  }
}
if (typeof turmSocial === 'function') {
  const _begTurmSocial = turmSocial;
  turmSocial = function (pid, d) {
    if (d && d.k === 'vtb') {
      if (pid !== 'me' && net.mode === 'host') begTurmNote(pid, d.n);
      return;
    }
    const r = _begTurmSocial(pid, d);
    if (d && (d.k === 'vtn' || d.k === 'vtj') && pid !== 'me' && net.mode === 'host') begTurmNote(pid, d.bg);
    return r;
  };
}

// --- Höllenthron: Begleiter zählen zur Gruppengröße (6–7) -----------------------------------------------------------------
// vorgesehene Begleiter für einen Inhalt (vorbereitet oder angeheuert)
function begPlanned(C) {
  if (!C) return 0;
  if (beg.hire && beg.hire.key === C.key) return beg.list.length;
  if (beg.want && beg.want.key === C.key) return beg.want.roles.length;
  return 0;
}
if (typeof htChecks === 'function') {
  const _begHtChecks = htChecks;
  htChecks = function () {
    const list = _begHtChecks();
    try {
      const C = typeof htIndex === 'function' ? begContentOf(htIndex()) : null;
      const n = !begPartyReal() ? begPlanned(C) : 0;
      if (!n) return list;
      const g = list.find((c) => /^Gruppe aus /.test(c.text));
      if (g) {
        const real = game.party ? game.party.members.length : 1;
        const tot = real + n;
        g.ok = g.ok || (tot >= HT.party[0] && tot <= HT.party[1]);
        g.text = `Gruppe aus ${HT.party[0]}–${HT.party[1]} Spielern (jetzt ${real} + ${n} Begleiter)`;
      }
    } catch (e) { /* ohne Begleiter */ }
    return list;
  };
}

// --- Anzeige: Figuren, Namen, Gruppenanzeige ------------------------------------------------------------------------------
// 2D: Begleiter als Spielerfiguren in der Szene (drawPlayer über e.remote, Name und Balken über drawLabel)
if (typeof collectScene === 'function') {
  const _begCollect = collectScene;
  collectScene = function (view, x0, y0, x1, y1, inView) {
    const list = _begCollect(view, x0, y0, x1, y1, inView);
    let changed = false;
    // Begleiter anderer Spieler (Diener-Plätze) nicht als Skelett
    let n = 0;
    for (let i = 0; i < list.length; i++) if (!list[i].begRemote) list[n++] = list[i];
    if (n < list.length) list.length = n;
    if (beg.on) for (const b of beg.list) if (!b.dead && inView(b.fig)) { list.push(b.fig); changed = true; }
    if (changed) list.sort((a, c) => sceneBaseY(a) - sceneBaseY(c));
    return list;
  };
}
// 3D: Figuren über V3.extra (begSync); Name und Balken: während drawOverlay3 stehen sie in der Liste der Schilder
if (typeof drawOverlay3 === 'function' && typeof v3Monsters === 'function') {
  const _begOverlay3 = drawOverlay3;
  drawOverlay3 = function (ctx) {
    beg.ov = beg.on && beg.figs3.length > 0;
    try {
      return _begOverlay3(ctx);
    } finally {
      beg.ov = false;
    }
  };
  const _begV3Monsters = v3Monsters;
  v3Monsters = function () {
    const l = _begV3Monsters();
    if (!beg.ov) return l;
    return l.concat(beg.figs3);
  };
}
// Name und Lebensbalken über dem Kopf in Gruppenfarbe, darüber „Begleiter · Rolle“ (Zeile der Gilde)
if (typeof pvpLabelInfo === 'function') {
  const _begLabel = pvpLabelInfo;
  pvpLabelInfo = function (e) {
    if (e && e.beg) return BEG_LABEL;
    return _begLabel(e);
  };
}
// Gruppenanzeige: Begleiter stehen unter der eigenen Gruppe (wie die Mitstreiter im Turm), mit Leben und Rollen-Zeichen
if (typeof partyExtraNames === 'function') {
  const _begExtraNames = partyExtraNames;
  partyExtraNames = function () {
    const out = _begExtraNames();
    if (beg.on) for (const b of beg.list) if (!out.includes(b.name)) out.push(b.name);
    return out;
  };
}
if (typeof partyMember === 'function') {
  const _begPartyMember = partyMember;
  partyMember = function (name) {
    if (beg.list.length) {
      const b = beg.list.find((x) => x.name === name);
      if (b) return { pid: null, rp: b.fig, beg: b };
    }
    return _begPartyMember(name);
  };
}
if (typeof partyHudBuild === 'function') {
  const _begHudBuild = partyHudBuild;
  partyHudBuild = function (el, names, extra = 0) {
    _begHudBuild(el, names, extra);
    if (!beg.list.length || typeof partyHudRows === 'undefined') return;
    for (const b of beg.list) {
      const r = partyHudRows.get(b.name);
      if (!r || !r.el) continue;
      r.el.classList.add('pm-beg');
      const line = r.el.querySelector('.pm-line');
      if (line && !line.querySelector('.pm-role') && typeof gfRoleIcon === 'function') {
        line.insertAdjacentHTML('afterbegin', `<span class="pm-role" title="${escapeHtml(BEG_ROLE_NAME[b.role] || '')}">${gfRoleIcon(b.role, 'inline')}</span>`);
      }
    }
  };
}
// Antippen eines Begleiters in der Gruppenanzeige: Seite „Begleiter“ im Charakterfenster
(function begHudClick() {
  const el = typeof document !== 'undefined' && document.getElementById('partyFrame');
  if (!el) return;
  el.addEventListener('click', (e) => {
    const row = e.target && e.target.closest ? e.target.closest('.pm.pm-beg') : null;
    if (!row || (typeof hudLayout !== 'undefined' && hudLayout.editing)) return;
    e.stopPropagation();
    begOpenChar();
  }, true);
})();
function begOpenChar() {
  ui.charTab = 'begleiter';
  if ($('panelChar').hidden) ui.toggle('panelChar');
  else ui.renderCharPanel();
}

// --- Fenster ------------------------------------------------------------------------------------------------------------
const begIcon = (r) => (typeof gfRoleIcon === 'function' ? gfRoleIcon(r, 'inline') : '');
// Rollenwahl: automatisch (nach der eigenen Rolle aus dem Gruppenfinder) oder selbst (Zähler je Rolle, bis 6 zusammen)
function begChooserHtml(C) {
  const p = game.player;
  const st = begState(p);
  const auto = st.wahl === 'auto';
  const roles = begRolesFor(C, p);
  let h = '<div class="beg-mode"><button type="button" class="beg-chip' + (auto ? ' on' : '') + '" data-begmode="auto">Automatisch</button>' +
    '<button type="button" class="beg-chip' + (auto ? '' : ' on') + '" data-begmode="frei">Selbst wählen</button></div>';
  if (auto) h += `<p class="beg-hint"><span>Passend zu deiner Rolle:</span> ${begIcon(begMyRole())} <b>${BEG_ROLE_NAME[begMyRole()]}</b></p>`;
  else {
    h += '<div class="beg-roles">' + BEG_ROLES.map((r) => `<span class="beg-role">${begIcon(r)}<span>${BEG_ROLE_NAME[r]}</span>` +
      `<button type="button" class="mini-btn" data-begm="${r}" aria-label="weniger">−</button><b>${st.wahl[r] | 0}</b>` +
      `<button type="button" class="mini-btn" data-begp="${r}" aria-label="mehr">+</button></span>`).join('') + '</div>';
  }
  if (roles.length) h += `<p class="beg-sum">${roles.map(begIcon).join('')} <b>${roles.length} Begleiter</b> <span>${begRolesText(roles)}</span></p>`;
  return h;
}
function begChooserBind(root, redraw) {
  const st = begState(game.player);
  root.querySelectorAll('[data-begmode]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.begmode === 'auto') st.wahl = 'auto';
    else if (st.wahl === 'auto') {
      const r = begRolesFor(BEG_CONTENT_5);
      st.wahl = { tank: 0, heiler: 0, schaden: 0 };
      for (const x of r) st.wahl[x]++;
    }
    redraw();
  }));
  const step = (r, k) => {
    if (st.wahl === 'auto') return;
    const sum = BEG_ROLES.reduce((a, x) => a + (st.wahl[x] | 0), 0);
    if (k > 0 && sum >= 6) return;
    st.wahl[r] = Math.max(0, Math.min(6, (st.wahl[r] | 0) + k));
    redraw();
  };
  root.querySelectorAll('[data-begm]').forEach((b) => b.addEventListener('click', () => step(b.dataset.begm, -1)));
  root.querySelectorAll('[data-begp]').forEach((b) => b.addEventListener('click', () => step(b.dataset.begp, 1)));
}
// Vorlage einer Fünfergruppe (Charakterfenster: Rollenwahl ohne bestimmten Inhalt)
const BEG_CONTENT_5 = { key: '', kind: 'dungeon', k: -1, size: 5, comp: { tank: 1, heiler: 1, schaden: 3 }, name: '', minLevel: 1 };
// Miete und Hinweise für einen Inhalt; Rückgabe { html, ok, cost, roles }
function begOffer(C) {
  const p = game.player;
  const roles = begRolesFor(C, p);
  const kept = !!(beg.hire && beg.hire.key === C.key && beg.list.length);
  const cost = kept ? 0 : begRentTotal(C, roles.length, p.level);
  const why = begBlock(C) || (C.minLevel > p.level && C.kind !== 'turm' ? `Erst ab Stufe ${C.minLevel}` : '');
  let html = '';
  if (kept) {
    const left = beg.hire.outSince != null ? Math.max(0, Math.ceil(BEG.keep - (game.time - beg.hire.outSince))) : 0;
    html += `<p class="beg-cost"><span>Deine Begleiter sind schon bezahlt</span>${left ? ` <small>(${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')})</small>` : ''}</p>`;
  } else if (roles.length) {
    html += `<p class="beg-cost"><span>Miete je Betreten:</span> <b>${begFmt(cost)} Gold</b> <small>(${begFmt(begRent(p.level, C.kind))} Gold je Begleiter)</small></p>`;
    if (!why && (p.gold || 0) < cost) html += `<p class="form-error">Dir fehlen ${begFmt(cost - (p.gold || 0))} Gold.</p>`;
  }
  if (why) html += `<p class="form-error">${escapeHtml(why)}</p>`;
  return { html, ok: !why && roles.length > 0 && (p.gold || 0) >= cost, cost, roles };
}
const BEG_INFO = 'Allein unterwegs? KI-Begleiter füllen deine Gruppe auf. Sie kämpfen mit Fertigkeiten und Tränken, bekommen keine Beute und gehen, sobald ein echter Mitspieler dazukommt.';
// Abschnitt „Begleiter“ (Eingang, Ausgang, Turm, Gruppenfinder): C = Inhalt, mode 'enter' | 'here' | 'turm' | 'gf',
// go = Aktion des Knopfs
function begBoxHtml(C, mode) {
  const H = beg.hire;
  const here = mode === 'here' && H && H.key === C.key && beg.on;
  let h = '<div class="beg-box"><h4>' + begIcon('tank') + ' <span>Begleiter</span></h4>';
  if (here) {
    h += begListHtml() + '<div class="beg-acts"><button type="button" class="btn btn-ghost" data-begbye>Begleiter entlassen</button></div></div>';
    return h;
  }
  h += `<p class="hint-text">${BEG_INFO}</p>` + begChooserHtml(C);
  const o = begOffer(C);
  const label = mode === 'here' ? 'Mit Begleitern auffüllen' : mode === 'turm' ? 'Mit Begleitern beginnen' : mode === 'gf' ? 'Mit Begleitern los' : 'Mit Begleitern betreten';
  h += o.html + `<div class="beg-acts"><button type="button" class="btn btn-primary" data-beggo ${o.ok ? '' : 'disabled'}>${label}</button></div></div>`;
  return h;
}
// Liste der laufenden Begleiter (Charakterfenster, Ausgang)
function begListHtml() {
  if (!beg.list.length) return '';
  return '<div class="beg-list">' + beg.list.map((b) => {
    const fr = b.dead ? 0 : Math.max(0, Math.min(1, b.hp / Math.max(1, b.maxHp)));
    const pa = classPath(b.cls, b.path);
    return `<div class="beg-row${b.dead ? ' dead' : ''}">${begIcon(b.role)}<span class="beg-name"><b class="no-tr">${escapeHtml(b.name)}</b>` +
      `<small>${escapeHtml(CLASSES[b.cls].name)} · ${escapeHtml(pa ? pa.name : '')} · Stufe ${b.level | 0}</small></span>` +
      `<span class="beg-hp"><i style="transform:scaleX(${fr.toFixed(3)})"></i></span>${b.dead ? '<small class="beg-dead">gefallen</small>' : ''}</div>`;
  }).join('') + '</div>';
}
// Knöpfe eines Abschnitts binden; go(C, roles) führt hinein (Betreten, Turm, Gruppenfinder) bzw. heuert an
function begBoxBind(box, C, mode, go, redraw) {
  begChooserBind(box, redraw);
  const bye = box.querySelector('[data-begbye]');
  if (bye) bye.addEventListener('click', () => { begDismiss('Du hast deine Begleiter entlassen.'); redraw(); });
  const b = box.querySelector('[data-beggo]');
  if (!b) return;
  b.addEventListener('click', () => {
    const o = begOffer(C);
    if (!o.ok) { redraw(); return; }
    go(C, o.roles);
  });
}
// einen Abschnitt in ein Fenster setzen (vor das Element before, sonst ans Ende von body); neu zeichnen bei Änderung
function begMount(body, before, C, mode, go) {
  const box = document.createElement('div');
  box.className = 'beg-mount';
  const draw = () => {
    box.innerHTML = begBoxHtml(C, mode);
    begBoxBind(box, C, mode, go, draw);
  };
  draw();
  if (before && before.parentNode) before.parentNode.insertBefore(box, before);
  else body.appendChild(box);
  return box;
}

// Eingang (Dungeon, Riss, Endboss, Instanz, Höllenthron) und Ausgang im Inhalt
if (typeof ui !== 'undefined' && typeof ui.renderDungeon === 'function') {
  const _begRenderDungeon = ui.renderDungeon;
  ui.renderDungeon = function (npc) {
    const r = _begRenderDungeon.call(this, npc);
    try { begGateExtras(npc); } catch (e) { console.warn('Begleiter (Eingang):', e); }
    return r;
  };
}
function begGateExtras(npc) {
  const p = game.player;
  const body = $('npcBody');
  if (!body || !npc || !p || p.level < BEG.minLevel || WAECHTER) return;
  const C = begContentOf(npc.dungeon);
  if (!C) return;
  if (npc.id === 'ausgang') {
    begMount(body, null, C, 'here', (CC, roles) => {
      if (begHire(CC, roles)) ui.closePanels();
    });
    return;
  }
  const enter = body.querySelector('[data-dg="enter"]');
  begMount(body, enter, C, 'enter', (CC, roles) => {
    begArm(CC, roles);
    const err = npc.id === 'riss' ? enterRift(npc) : enterDungeon(npc.dungeon);
    if (err) {
      beg.want = null;
      ui.log(err, 'warn');
    }
  });
}
// Turm: „Mit Begleitern beginnen“ startet einen eigenen Durchgang (nur für die eigene Gruppe)
if (typeof turmWindowOpen === 'function') {
  const _begTurmWindow = turmWindowOpen;
  turmWindowOpen = function (npc) {
    const r = _begTurmWindow(npc);
    try {
      const body = $('npcBody');
      const p = game.player;
      if (body && p && !WAECHTER) {
        const btn = body.querySelector('[data-turm="neu"]');
        begMount(body, btn, BEG_TURM, 'turm', (C, roles) => {
          if (game.turmRun) return;
          begArm(C, roles);
          turmEnter({ open: false });
          if (!game.turmRun) beg.want = null;
        });
      }
    } catch (e) { console.warn('Begleiter (Turm):', e); }
    return r;
  };
}

// Gruppenfinder: Abschnitt „Begleiter“ mit eigener Auswahl der Aktivität, „Mit Begleitern los“ führt direkt hinein
function begGfActs() {
  return typeof GROUP_ACTIVITIES !== 'undefined' ? GROUP_ACTIVITIES.filter((a) => begContentOfAct(a)) : [];
}
function begGfRender() {
  const sec = document.getElementById('gfBeg');
  const p = game.player;
  if (!sec || !p) return;
  if (p.level < BEG.minLevel) {
    sec.hidden = true;
    return;
  }
  sec.hidden = false;
  const acts = begGfActs();
  if (!beg.gfAct || !acts.some((a) => a.id === beg.gfAct)) {
    const best = acts.filter((a) => a.minLevel <= p.level && a.cat === 'dungeon').sort((a, b) => b.minLevel - a.minLevel)[0] || acts[0];
    beg.gfAct = best ? best.id : '';
  }
  const act = acts.find((a) => a.id === beg.gfAct);
  const C = begContentOfAct(act);
  const cats = typeof GF_CATS !== 'undefined' ? GF_CATS : [];
  const opts = cats.map((c) => {
    const list = acts.filter((a) => a.cat === c.id).sort((a, b) => a.minLevel - b.minLevel);
    if (!list.length) return '';
    return `<optgroup label="${escapeHtml(c.name)}">` + list.map((a) => `<option value="${escapeHtml(a.id)}"${a.id === beg.gfAct ? ' selected' : ''}${a.minLevel > p.level ? ' disabled' : ''}>${escapeHtml(a.name)} · ab ${a.minLevel | 0}</option>`).join('') + '</optgroup>';
  }).join('');
  sec.innerHTML = '<h3>Begleiter <small>· allein spielen</small></h3>' +
    `<label class="gf-field beg-act"><span>Aktivität</span><select data-begact>${opts}</select></label>` +
    (C ? '<div class="beg-gfbox"></div>' : '');
  sec.querySelector('[data-begact]').addEventListener('change', (e) => {
    beg.gfAct = e.target.value;
    begGfRender();
  });
  const box = sec.querySelector('.beg-gfbox');
  if (!box || !C) return;
  const draw = () => {
    box.innerHTML = begBoxHtml(C, 'gf');
    begBoxBind(box, C, 'gf', (CC, roles) => begGfGo(act, CC, roles), draw);
  };
  draw();
}
function begGfGo(act, C, roles) {
  const p = game.player;
  if (!act || p.dead) return;
  if (act.minLevel > p.level) {
    ui.log(`${act.name}: erst ab Stufe ${act.minLevel}.`, 'warn');
    return;
  }
  begArm(C, roles);
  ui.closePanels();
  if (p.riding && typeof toggleRide === 'function') toggleRide();
  if (act.id === 'turm' || typeof act.go === 'function') {
    act.go(act);
    return;
  }
  const err = enterDungeon(act.dungeon);
  if (err) {
    beg.want = null;
    ui.log(`Gruppenfinder: ${err}`, 'warn');
  }
}
// Knopf „Begleiter“ im Formular „Gruppe eröffnen“: mit der dort gewählten Aktivität allein mit Begleitern los (geht es
// gerade nicht, zeigt der Abschnitt „Begleiter“ darüber den Grund)
function begGfFormButton() {
  const form = document.getElementById('gfForm');
  if (!form || form.querySelector('[data-begform]') || !game.player || game.player.level < BEG.minLevel) return;
  const sub = form.querySelector('button[type="submit"]');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn beg-formbtn';
  btn.dataset.begform = '1';
  btn.textContent = 'Begleiter';
  btn.title = 'Allein mit KI-Begleitern los';
  if (sub) sub.insertAdjacentElement('afterend', btn);
  else form.appendChild(btn);
  btn.addEventListener('click', () => {
    const sel = form.querySelector('#gfAct');
    const act = sel && typeof gfAct === 'function' ? gfAct(sel.value) : null;
    const C = begContentOfAct(act);
    if (!act || !C) return;
    const o = begOffer(C);
    if (o.ok && act.minLevel <= game.player.level) {
      begGfGo(act, C, o.roles);
      return;
    }
    beg.gfAct = act.id;
    begGfRender();
    const sec = document.getElementById('gfBeg');
    if (sec && sec.scrollIntoView) sec.scrollIntoView({ block: 'nearest' });
  });
}
// Abschnitt im Fenster des Gruppenfinders anlegen (unter der eigenen Rolle) und beim Zeichnen mitziehen
(function begGfSetup() {
  const panel = typeof document !== 'undefined' && document.getElementById('panelGf');
  const role = panel && panel.querySelector('#gfRole');
  if (!role) return;
  const sec = document.createElement('section');
  sec.id = 'gfBeg';
  sec.className = 'beg-gf';
  sec.setAttribute('aria-label', 'Begleiter');
  role.insertAdjacentElement('afterend', sec);
  if (typeof gfRender === 'function') {
    const _begGfRender = gfRender;
    gfRender = function (force) {
      const r = _begGfRender(force);
      try {
        const el = $('panelGf');
        // gfToggle zeichnet mit force, bevor das Fenster aufgeht
        if (!el || (el.hidden && !force) || !game.player) return r;
        const key = JSON.stringify([gfMyRole(), game.player.level, begPartyReal(), !!beg.hire, beg.list.length, Math.floor((game.player.gold || 0) / 1000)]);
        if (force || key !== beg.gfKey) {
          beg.gfKey = key;
          begGfRender();
        }
        begGfFormButton();
      } catch (e) { console.warn('Begleiter (Gruppenfinder):', e); }
      return r;
    };
  }
})();
// Turm der Verdammten im Gruppenfinder (für Begleiter und für echte Gruppen): Los führt zum Turm
function begTurmGo(act) {
  const p = game.player;
  const n = game.world && game.world.npcs.find((x) => x.id === 'turm');
  if (!n || !p) return;
  if (p.riding && typeof toggleRide === 'function') toggleRide();
  moveThrough({ x: n.x, y: n.y + 34 }, typeof TURM !== 'undefined' ? TURM.glut : '#ff6a2a');
  if (beg.want && beg.want.key === 'turm') {
    turmEnter({ open: false });
    if (!game.turmRun) beg.want = null;
    return;
  }
  ui.banner(act.name, 'Eingang erreicht – sprich mit dem Turm (F)');
}
if (typeof GROUP_ACTIVITIES !== 'undefined' && typeof TURM !== 'undefined' && !GROUP_ACTIVITIES.some((a) => a.id === 'turm')) {
  if (typeof GF_CATS !== 'undefined' && !GF_CATS.some((c) => c.id === 'turm')) GF_CATS.push({ id: 'turm', name: TURM.name });
  GROUP_ACTIVITIES.push({
    id: 'turm', cat: 'turm', name: TURM.name, minLevel: TURM.level, size: 5, comp: { tank: 1, heiler: 1, schaden: 3 },
    sub: 'Gruppen-Instanz · Seelenhain', status: () => (typeof instLockText === 'function' ? instLockText(TURM.id) : ''), go: begTurmGo
  });
}

// Seite „Begleiter“ im Charakterfenster: laufende Begleiter, Rollenwahl, Miete, Regeln
function begCharHtml(p) {
  begCss();
  const st = begState(p);
  const H = beg.hire;
  const C = begHere();
  let h = '<div class="beg-page"><section class="beg-box"><h3>Deine Begleiter</h3>';
  if (H && beg.list.length) {
    h += begListHtml();
    if (H.outSince != null) {
      const left = Math.max(0, Math.ceil(BEG.keep - (game.time - H.outSince)));
      h += `<p class="hint-text"><span>Sie warten im Inhalt auf dich:</span> <b>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b></p>`;
    }
    h += '<div class="beg-acts"><button type="button" class="btn btn-ghost" data-begbye>Begleiter entlassen</button></div>';
  } else if (C && !begBlock(C)) {
    h += '<p class="hint-text">Du bist in einem Gruppeninhalt – rufe hier Begleiter dazu.</p>' + begOffer(C).html +
      `<div class="beg-acts"><button type="button" class="btn btn-primary" data-beghere ${begOffer(C).ok ? '' : 'disabled'}>Mit Begleitern auffüllen</button></div>`;
  } else {
    h += '<p class="hint-text">Gerade keine. Anheuern kannst du am Eingang eines Dungeons, einer Endboss-Halle, einer Instanz, des Höllenthrons und des Turms, drinnen am Steinkreis des Ausgangs oder im Gruppenfinder (J).</p>';
  }
  h += '</section><section class="beg-box"><h3>Rollen</h3>' + begChooserHtml(BEG_CONTENT_5) +
    '<p class="hint-text">Aufgefüllt wird immer bis zur Gruppengröße: 4 Begleiter in Dungeons, Endboss-Hallen, Instanzen und im Turm, 6 im Höllenthron. Fehlende Plätze werden Schaden.</p></section>';
  const kinds = [['dungeon', 'Dungeon', 4], ['raid', 'Endboss', 4], ['inst', 'Instanz', 4], ['thron', 'Höllenthron', 6], ['turm', 'Turm der Verdammten', 4]];
  h += '<section class="beg-box"><h3>Miete je Betreten</h3><table class="beg-rent"><thead><tr><th></th><th>je Begleiter</th><th>zusammen</th></tr></thead><tbody>' + kinds.map(([k, name, n]) =>
    `<tr><td>${name}</td><td><b>${begFmt(begRent(p.level, k))} Gold</b></td><td><small>${begFmt(begRent(p.level, k) * n)} Gold</small></td></tr>`).join('') +
    `</tbody></table><p class="hint-text">Nach Stufe gestaffelt. Gehst du kurz hinaus oder fällst du, warten sie ${Math.round(BEG.keep / 60)} Minuten auf dich – ohne neue Miete.</p></section>`;
  h += '<section class="beg-box"><h3>So kämpfen sie</h3><ul class="beg-rules">' +
    '<li>Etwa 80 % so stark wie eine Figur deiner Stufe mit deiner Ausrüstung.</li>' +
    '<li>Der Tank hält die Monster, der Heiler heilt, Schaden greift dein Ziel an.</li>' +
    '<li>Sie laufen aus roten Warnflächen und in Lichtkreise.</li>' +
    '<li>Wer fällt, steht nach dem Kampf wieder auf.</li>' +
    '<li>Wo Gegner mit der Spielerzahl wachsen, zählt ein Begleiter wie 0,7 Spieler.</li>' +
    '<li>Nur allein: Kommt ein echter Mitspieler dazu, gehen sie.</li></ul>' +
    `<p class="hint-text"><span>Angeheuert:</span> <b>${st.mal}</b> · <span>Miete bisher:</span> <b>${begFmt(st.gold)} Gold</b></p></section></div>`;
  return h;
}
function begCharBind(root) {
  const redraw = () => ui.renderCharPanel();
  begChooserBind(root, redraw);
  const bye = root.querySelector('[data-begbye]');
  if (bye) bye.addEventListener('click', () => { begDismiss('Du hast deine Begleiter entlassen.'); redraw(); });
  const here = root.querySelector('[data-beghere]');
  if (here) here.addEventListener('click', () => {
    const C = begHere();
    if (C && begHire(C)) redraw();
  });
}
if (typeof CHAR_TABS_EXTRA !== 'undefined') {
  CHAR_TABS_EXTRA.push({ id: 'begleiter', label: 'Begleiter', show: (p) => !!p && p.level >= BEG.minLevel, html: begCharHtml, bind: begCharBind });
}
// offene Fenster nach Anheuern, Entlassen, Pause und Rückkehr neu zeichnen
function begRefreshUi() {
  try {
    if (typeof ui !== 'undefined' && ui.charTab === 'begleiter' && $('panelChar') && !$('panelChar').hidden) ui.renderCharPanel();
    const gfp = $('panelGf');
    if (gfp && !gfp.hidden) begGfRender();
    if (game.turmRun) begTurmTell();
    // Gruppenanzeige gleich neu (die Liste der Mitstreiter wird sonst nur alle 0,5 s Spielzeit bestimmt)
    if (typeof partyExtraAt !== 'undefined') partyExtraAt = -1;
    if (typeof partyHud === 'function' && game.player) partyHud(true);
  } catch (e) { /* Anzeige */ }
}

// --- Takt und Stil --------------------------------------------------------------------------------------------------------
// einmal je Bild nach den Dienern (spiel.js update → updateAllies), in jeder Netzrolle
if (typeof updateAllies === 'function') {
  const _begUpdateAllies = updateAllies;
  updateAllies = function (dt) {
    _begUpdateAllies(dt);
    try {
      begTick(dt);
    } catch (e) {
      if (!beg.err) {
        beg.err = true;
        console.error('Begleiter:', e);
      }
    }
  };
}
function begCss() {
  if (document.getElementById('begCss')) return;
  const st = document.createElement('style');
  st.id = 'begCss';
  st.textContent =
    '.beg-box{display:flex;flex-direction:column;gap:6px;padding:8px 10px;margin:8px 0;border-radius:10px;background:rgba(120,200,255,.06);border:1px solid rgba(140,200,255,.3)}' +
    '.beg-box h3,.beg-box h4{margin:0;display:flex;align-items:center;gap:6px}.beg-box h4{font-size:15px;color:#cfe8ff}' +
    '.beg-box .hint-text{margin:0}.beg-mode{display:flex;gap:6px;flex-wrap:wrap}' +
    '.beg-chip{padding:3px 10px;border-radius:12px;cursor:pointer;font-size:12.5px;font-weight:700;color:var(--parchment,#e8dcc0);background:rgba(255,240,210,.05);border:1px solid rgba(201,163,90,.3)}' +
    '.beg-chip.on{color:#10202c;background:#9fd0ff;border-color:#9fd0ff}' +
    '.beg-roles{display:flex;flex-wrap:wrap;gap:6px 12px}.beg-role{display:inline-flex;align-items:center;gap:5px;font-size:13px}' +
    '.beg-role b{min-width:14px;text-align:center}.beg-role .mini-btn{padding:0 7px;min-width:24px}' +
    '.beg-sum,.beg-hint,.beg-cost{margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;font-size:13px}' +
    '.beg-cost b{color:#ffd96a}.beg-cost small,.beg-sum span{color:var(--muted,#b8ab90)}.beg-acts{display:flex;flex-wrap:wrap;gap:8px}' +
    '.beg-acts .btn:disabled{opacity:.45;filter:grayscale(.7)}' +
    '.beg-list{display:flex;flex-direction:column;gap:4px}.beg-row{display:flex;align-items:center;gap:8px;padding:3px 6px;border-radius:6px;background:rgba(0,0,0,.2)}' +
    '.beg-row.dead{opacity:.55}.beg-name{display:flex;flex-direction:column;min-width:0;flex:1;line-height:1.15}.beg-name small{color:var(--muted,#b8ab90);font-size:11.5px}' +
    '.beg-hp{position:relative;width:70px;height:6px;border-radius:3px;background:rgba(0,0,0,.45);overflow:hidden}.beg-hp i{position:absolute;inset:0;background:#3ee05a;transform-origin:left}' +
    '.beg-dead{color:#ff9a7a}.beg-page{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:8px}.beg-page .beg-box{margin:0}' +
    '.beg-rent{width:100%;border-collapse:collapse;font-size:13px}.beg-rent td{padding:2px 4px}.beg-rent td b{color:#ffd96a}' +
    '.beg-rules{margin:0;padding-left:18px;font-size:13px;display:flex;flex-direction:column;gap:2px}' +
    '.beg-gf{display:flex;flex-direction:column;gap:6px}.beg-gf .beg-box{margin:0}.beg-act select{max-width:100%}' +
    '.pm-role{display:inline-flex;flex:none;margin-right:2px}.pm-role .gf-role-ico{width:13px;height:13px}' +
    '.pm.pm-beg .pm-name{color:#bff0d0}';
  document.head.appendChild(st);
}
if (typeof document !== 'undefined') {
  if (document.head) begCss();
  else document.addEventListener('DOMContentLoaded', begCss);
}

// --- Ratgeberin -------------------------------------------------------------------------------------------------------------
if (typeof RATGEBER_WISSEN !== 'undefined') {
  RATGEBER_WISSEN.push(
    {
      c: 'dungeons', p: 4, q: 'Kann ich Dungeons, Instanzen und den Turm allein spielen?',
      a: 'Ja – mit <b>Begleitern</b>. Das sind KI-Mitstreiter, die deine Gruppe auffüllen: am Eingang „Mit Begleitern betreten“, ' +
        'drinnen am Steinkreis des Ausgangs „Mit Begleitern auffüllen“, am Turm „Mit Begleitern beginnen“ oder im Gruppenfinder (J) „Mit Begleitern los“. ' +
        'Rollen wählst du selbst oder automatisch passend zu deiner Rolle: Der Tank hält die Monster, der Heiler heilt, Schaden greift dein Ziel an. ' +
        'Sie sind etwa 80 % so stark wie eine Figur deiner Stufe mit deiner Ausrüstung und laufen aus roten Warnflächen.',
      k: 'begleiter allein solo ki bot bots mitstreiter gruppe auffuellen dungeon instanz turm hoellenthron endboss raid tank heiler schaden alleine spielen'
    },
    {
      c: 'dungeons', p: 2, q: 'Was kosten Begleiter und was bekommen sie?',
      a: 'Begleiter kosten <b>Miete in Gold je Betreten</b>, nach deiner Stufe gestaffelt und je nach Inhalt verschieden (Dungeon am günstigsten, ' +
        'dann Instanz, Endboss, Höllenthron und Turm). Die Tabelle steht im Charakterfenster auf der Seite „Begleiter“. Sie bekommen <b>keine Beute</b> ' +
        'und keine Erfahrung – alles bleibt wie allein. Gehst du kurz hinaus oder fällst du, warten sie 5 Minuten ohne neue Miete.',
      k: 'begleiter miete kosten gold preis beute erfahrung bezahlen teuer'
    },
    {
      c: 'zusammen', p: 2, q: 'Warum sind meine Begleiter gegangen?',
      a: 'Begleiter gibt es nur, solange du allein bist. Bist du in einer Gruppe mit echten Spielern oder kommt ein echter Mitspieler in denselben Inhalt, ' +
        'gehen sie nach wenigen Sekunden. Sie gehen auch, wenn du den Inhalt länger als 5 Minuten verlässt. Gefallene Begleiter stehen nach dem Kampf wieder auf.',
      k: 'begleiter weg gegangen verschwunden verabschiedet mitspieler gruppe tot gefallen wiederbeleben'
    }
  );
}
