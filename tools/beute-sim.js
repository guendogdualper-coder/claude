#!/usr/bin/env node
// Seelenstein – Beute-Simulator (seit 14.32, Auftrag 05/06: Ist-Analyse der Ausrüstungs-Beute und des Itemlevels)
//
// Läuft mit dem ECHTEN Spielcode im Browser (Playwright, headless Chromium, 2D): Je Klasse/Weg wird eine Figur
// gestartet, dann werden die Beute-Funktionen des Spiels (rollLoot, bossLoot, raidLoot, htGuardLoot, instMiniLoot,
// instFinalLoot, questGearItem) sehr oft mit echten Monstern aus createMonster/createStone aufgerufen. Abgefangen
// werden nur Anzeige und Tasche (addToBag legt den Gegenstand in eine Liste statt in die Tasche, ui.loot/Effekte
// stumm). Es wird KEINE Spieldatei verändert und nichts gespeichert (saveGame ist während des Laufs stumm).
//
// Aufruf (Spiel muss über HTTP erreichbar sein, z. B. python3 -m http.server 8792 im Repo):
//   NODE_PATH=/opt/node22/lib/node_modules node tools/beute-sim.js --url http://localhost:8792/ [--n 4000] [--out beute.json]
//   --n      Würfe je Quelle und Gebiet (Monster: Tötungen; Steine, Bosse, Instanzen: Siege), Standard 3000
//   --out    Rohdaten als JSON (Standard: keine Datei)
//   --ohne-rollbest  bessere Bonus-Würfe schwerer Quellen (RARITY_DROPS[].rollBest, seit 14.32) nur zur Laufzeit
//                    abschalten – zum Vergleich vorher/nachher
// Ausgabe: Markdown-Tabellen je Quelle (Teile je 100 Siege, Seltenheit, Stufe, Plus, Boni, iLvl) und eine Liste
// ungültiger Teile (unbekannte Stufe/Platz/Waffenart, falsche Klasse, Boni, die auf dem Platz nicht vorkommen dürfen …).

const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')));
}
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL = arg('--url', 'http://localhost:8792/');
const N = +arg('--n', 3000);
const OUT = arg('--out', null);
const NO_BEST = process.argv.includes('--ohne-rollbest');

// Klasse, Weg (für Waffenart und Köcher)
const SETUPS = [['krieger', 0], ['ninja', 0], ['ninja', 1], ['schamane', 0], ['nekromant', 0], ['magier', 0]];

async function simInPage(cfg) {
  const [cls, pathId, n, noBest] = cfg;
  if (noBest && typeof RARITY_DROPS !== 'undefined') for (const r of Object.values(RARITY_DROPS)) if (r.rollBest) r.rollBest = 1;
  const s = newCharacter('Sim', cls, pathId);
  s.level = 80;
  startGame(s);
  ui.closePanels();
  const p = game.player;
  if (cls === 'ninja' && pathId === 1) p.equipment.waffe = makeItem('waffe', 0, 0, 'ninja', 'bow');
  if (cls === 'ninja' && pathId === 0) p.equipment.waffe = makeItem('waffe', 0, 0, 'ninja', 'dagger');
  game.stats = playerStats(p);
  // stumm schalten, Tasche abfangen
  let cap = [];
  const noop = () => {};
  window.addToBag = (it) => { cap.push(it); return true; };
  for (const f of ['announceRarity', 'later', 'particles', 'flashScreen', 'shakeScreen', 'addEffect', 'saveGame', 'vfxLootFly', 'addBooks', 'addSkillMat', 'forgeCoreDrop']) window[f] = noop;
  window.addMobMat = noop;
  window.giveSplinters = noop;
  ui.loot = noop; ui.banner = noop; ui.log = noop;
  if (typeof htInside === 'function') window.htInside = () => true;

  const ilvl = typeof itemIlvl === 'function' ? itemIlvl : null;
  // Prüfung eines Teils: Liste von Fehlern (leer = gültig)
  const check = (it) => {
    const e = [];
    if (!ITEM_TIERS[it.tier]) e.push('Stufe ' + it.tier);
    if (!ALL_SLOTS.includes(it.slot)) e.push('Platz ' + it.slot);
    let nm; try { nm = itemName(it); } catch (x) { nm = null; }
    if (typeof nm !== 'string' || !nm) e.push('kein Name');
    if (CLASS_SLOTS.includes(it.slot) && !CLASSES[it.cls]) e.push('Klasse ' + it.cls);
    if (it.slot === 'waffe' && !(CLASS_WEAPON_KINDS[it.cls] || []).includes(it.kind)) e.push('Waffenart ' + it.kind + ' für ' + it.cls);
    if (it.slot === 'schild' && it.cls !== 'krieger') e.push('Schild nicht Krieger');
    if (it.slot === 'koecher' && it.cls !== 'ninja') e.push('Köcher nicht Ninja');
    if (!(it.rarity >= 0 && it.rarity <= maxRarityForTier(it.tier))) e.push('Seltenheit ' + it.rarity + ' auf Stufe ' + it.tier);
    if (!(it.plus >= 0 && it.plus <= MAX_DROP_PLUS)) e.push('Plus ' + it.plus);
    const seen = new Set();
    for (const b of it.bonuses || []) {
      const d = BONUS_TYPES[b.t];
      if (!d) { e.push('Bonus ' + b.t); continue; }
      if (seen.has(b.t)) e.push('doppelter Bonus ' + b.t);
      seen.add(b.t);
      if (!d.slots.includes(it.slot)) e.push('Bonus ' + b.t + ' auf ' + it.slot);
      if (ATTR_BONUS_IDS.includes(b.t) && !bonusAttrsFor(it, it.cls || p.classId).includes(b.t)) e.push('Statuswert ' + b.t + ' passt nicht zur Klasse');
      if (b.t === 'mp' && noManaFor(it)) e.push('Mana auf Krieger/Ninja-Teil');
      if (d.steps && !d.steps.includes(b.v)) e.push('Leben ' + b.v + ' keine Stufe');
      if (!(b.v > 0) || (d.max && b.v > d.max + 1e-9)) e.push('Bonuswert ' + b.t + '=' + b.v);
    }
    if ((it.bonuses || []).length > MAX_NORMAL_BONUS) e.push('zu viele Boni');
    const st = itemStats(it);
    for (const [k, v] of Object.entries(st)) if (Array.isArray(v) ? v.some((x) => !isFinite(x)) : !isFinite(v)) e.push('Wert ' + k);
    return e;
  };
  const out = [];
  // Ergebnis einer Quelle sammeln
  const run = (src, label, level, times, fn) => {
    cap = [];
    for (let k = 0; k < times; k++) fn(k);
    const items = cap.map((it) => {
      const err = check(it);
      const own = it.cls ? it.cls === p.classId : true;
      return {
        r: it.rarity, t: it.tier, req: ITEM_TIERS[it.tier] ? ITEM_TIERS[it.tier].level : -1, pl: it.plus, b: (it.bonuses || []).length,
        own, wear: own && !wearProblem(it, { ...p, level: 80 }), il: ilvl ? ilvl(it) : null, slot: it.slot, err: err.join('; ')
      };
    });
    out.push({ src, label, level, times, items });
  };
  const mon = (id, level, zone) => createMonster(id, p.x, p.y, { level, zone });

  // 1) normale Monster je Gebiet (Gruppenarten, Stufe der Art)
  for (const z of ZONES) {
    if (!z.groups) continue;
    const ids = z.groups.map((g) => g[0]).filter((id) => MONSTER_TYPES[id]);
    if (!ids.length) continue;
    const lv = Math.round(ids.reduce((a, id) => a + MONSTER_TYPES[id].level, 0) / ids.length);
    run('mob', z.name, lv, n, (k) => { const id = ids[k % ids.length]; rollLoot(mon(id, MONSTER_TYPES[id].level, z)); });
    // 2) Seelensteine des Gebiets und 3) die Monster, die sie rufen
    for (const [slv] of z.stones || []) {
      const st = createStone(z, slv, 0, 1, { x: p.x, y: p.y });
      if (!st) continue;
      run('stone', z.name + ' Stein ' + slv, slv, Math.round(n / 4), () => rollLoot(createStone(z, slv, 0, 1, { x: p.x, y: p.y })));
      run('stoneMob', z.name + ' Stein-Monster ' + slv, slv, n, (k) => { const m = mon(ids[k % ids.length], slv, z); m.stone = st; rollLoot(m); });
    }
  }
  // 4) Dungeon-Monster und -Bosse, Endbosse (Raids)
  for (const d of DUNGEONS) {
    const dz = ZONES.find((z) => z.dungeon === d) || { dungeon: d };
    const mobs = (d.mobs || []).filter((id) => MONSTER_TYPES[id]);
    // Stufe wie beim Bestücken: Höllenthron HT.mobLevel, Lv-60/80-Instanzen instMobLevel, sonst die der Art
    const lvOf = (id) => (d.instanz && typeof HT !== 'undefined' ? HT.mobLevel : d.inst60 ? instMobLevel(d) : MONSTER_TYPES[id].level);
    if (mobs.length) run('dungeonMob', d.name, lvOf(mobs[0]), n, (k) => rollLoot(mon(mobs[k % mobs.length], lvOf(mobs[k % mobs.length]), dz)));
    if (d.inst60) continue;
    const bt = MONSTER_TYPES[d.boss];
    if (!bt) continue;
    if (bt.raid) run('raid', d.name + ' (' + bt.name + ')', bt.level, Math.round(n / 10), () => raidLoot(mon(d.boss, bt.level, dz)));
    else if (bt.boss) run('boss', d.name + ' (' + bt.name + ')', bt.level, Math.round(n / 4), () => bossLoot(mon(d.boss, bt.level, { dungeon: d })));
  }
  // 5) Höllenthron-Wächter (htGuardLoot) und Lv-60/80-Instanzen
  const ht = DUNGEONS.find((d) => d.instanz);
  if (ht && typeof htGuardLoot === 'function') for (const g of ht.guards || []) {
    const t = MONSTER_TYPES[g];
    if (t) run('htGuard', 'Höllenthron ' + t.name, t.level, Math.round(n / 10), () => { const m = mon(g, t.level, { dungeon: ht }); htGuardLoot(m); });
  }
  if (typeof instMiniLoot === 'function') for (const d of DUNGEONS.filter((x) => x.inst60)) {
    const lv = instMobLevel(d);
    for (const id of d.minis || []) {
      const t = MONSTER_TYPES[id];
      if (t && t.inst) { run('instMini', d.name + ' ' + t.name, lv, Math.round(n / 10), () => instMiniLoot(mon(id, lv, { dungeon: d }), INST.miniEpic[t.inst.rank] || 0.1)); break; }
    }
    const bt = MONSTER_TYPES[d.boss];
    if (bt) run('instFinal', d.name + ' (' + bt.name + ')', lv, Math.round(n / 10), () => instFinalLoot(mon(d.boss, lv, { dungeon: d }), d));
  }
  // 6) Ausrüstung aus Aufträgen (QUEST_GEAR) auf einigen Stufen
  if (typeof questGearItem === 'function') for (const lv of [10, 30, 60, 80]) for (const kind of Object.keys(QUEST_GEAR)) {
    p.level = lv;
    run('quest', 'Auftrag ' + kind + ' Lv ' + lv, lv, Math.round(n / 10), () => cap.push(questGearItem(kind)));
  }
  p.level = 80;
  return out;
}

function pct(a, b) { return b ? (100 * a / b).toFixed(1) : '–'; }
function q(arr, f) { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; }

(async () => {
  const b = await chromium.launch();
  const all = [];
  for (const [cls, pid] of SETUPS) {
    const pg = await (await b.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
    const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => localStorage.setItem('seelenstein.optionen', JSON.stringify({ view: '2d', optsVer: 2, sound: false, music: false })));
    await pg.goto(URL, { timeout: 180000 });
    await pg.waitForTimeout(1200);
    const res = await pg.evaluate(simInPage, [cls, pid, N, NO_BEST]);
    for (const r of res) all.push({ cls: cls + pid, ...r });
    if (errs.length) console.error(cls, pid, 'Seitenfehler:', errs.slice(0, 3));
    await pg.close();
  }
  await b.close();
  if (OUT) require('fs').writeFileSync(OUT, JSON.stringify(all));

  // Zusammenfassen über die Klassen: je Quelle + Bezeichnung
  const groups = new Map();
  for (const r of all) {
    const k = r.src + '|' + r.label;
    const g = groups.get(k) || { src: r.src, label: r.label, level: r.level, times: 0, items: [] };
    g.times += r.times;
    g.items.push(...r.items);
    groups.set(k, g);
  }
  const RN = ['grau', 'grün', 'blau', 'lila', 'gold'];
  const rows = [];
  const bad = new Map();
  for (const g of groups.values()) {
    const it = g.items;
    const rc = [0, 0, 0, 0, 0];
    for (const x of it) rc[x.r]++;
    const il = it.map((x) => x.il).filter((x) => x != null);
    for (const x of it) if (x.err) bad.set(x.err, (bad.get(x.err) || 0) + 1);
    rows.push({
      src: g.src, label: g.label, lv: g.level, per100: (100 * it.length / g.times).toFixed(g.src === 'mob' || g.src.endsWith('Mob') ? 2 : 0),
      rar: rc.map((c, i) => c ? `${RN[i]} ${pct(c, it.length)}` : '').filter(Boolean).join(' · '),
      req: it.length ? `${Math.min(...it.map((x) => x.req))}–${Math.max(...it.map((x) => x.req))}` : '–',
      reqAvg: it.length ? (it.reduce((a, x) => a + x.req, 0) / it.length).toFixed(0) : '–',
      plus: it.length ? (it.reduce((a, x) => a + x.pl, 0) / it.length).toFixed(2) : '–',
      bon: it.length ? (it.reduce((a, x) => a + x.b, 0) / it.length).toFixed(2) : '–',
      own: pct(it.filter((x) => x.own).length, it.length),
      wear: pct(it.filter((x) => x.wear).length, it.filter((x) => x.own).length),
      il: il.length ? `${q(il, 0.1)} / ${q(il, 0.5)} / ${q(il, 0.9)} / ${Math.max(...il)}` : '–',
      n: it.length
    });
  }
  const order = ['mob', 'stoneMob', 'stone', 'dungeonMob', 'boss', 'raid', 'htGuard', 'instMini', 'instFinal', 'quest'];
  rows.sort((a, b) => order.indexOf(a.src) - order.indexOf(b.src) || a.lv - b.lv);
  console.log(`Beute-Simulation: ${N} Würfe je Quelle/Gebiet (Steine ÷4, Bosse ÷4, Endbosse/Instanzen/Aufträge ÷10) × ${SETUPS.length} Klassen/Wege\n`);
  console.log('| Quelle | Gebiet / Gegner | Lv | Teile je 100 | Seltenheit (%) | Benötigte Stufe (Ø) | Plus Ø | Boni Ø | eigene Klasse % | davon tragbar % | iLvl p10/p50/p90/max | Teile |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.src} | ${r.label} | ${r.lv} | ${r.per100} | ${r.rar} | ${r.req} (${r.reqAvg}) | ${r.plus} | ${r.bon} | ${r.own} | ${r.wear} | ${r.il} | ${r.n} |`);
  console.log('\nUngültige Teile:', bad.size ? '' : 'keine');
  for (const [e, c] of bad) console.log(`- ${c} × ${e}`);
})();
