#!/usr/bin/env node
// Seelenstein – Balance-Simulator für alle Klassen und Wege (Bericht: docs/balance-klassen.md)
//
// Läuft mit dem ECHTEN Spielcode im Browser (Playwright, headless Chromium, 2D-Ansicht): Das Skript startet selbst
// einen kleinen Webserver auf das Repo, baut je Klasse/Weg/Stufe/Ausrüstung eine Figur und lässt sie mit einer
// einfachen Spieler-KI gegen Testmonster kämpfen. Schaden, Krits, Rüstung, Buffs, Klassensegen, Diener, Ulti,
// Lebensraub, Ausweichen und Blocken kommen dabei aus den Formeln des Spiels (update(), useSkill(), useUltimate()).
//
// Aufruf (im Repo-Ordner):
//   node tools/balance-sim.js                         alle 12 Wege, Stufe 10/30/50/70/80, Ausrüstung +7 und +15
//   node tools/balance-sim.js --stufen 30,50,70 --ausr std --wege krieger.klinge,ninja.dolch
//   node tools/balance-sim.js --vorschlag             dasselbe mit den Wertänderungen aus VORSCHLAG (nur zur Laufzeit)
//   node tools/balance-sim.js --tabellen ergebnis.json  nur die Tabellen aus einer früheren Messung drucken
//   node tools/balance-sim.js --vorschlag-datei v.json  eigene Wertänderungen (gleiches Format wie VORSCHLAG) ausprobieren
//   node tools/balance-sim.js --pvp                   PvP (seit 14.15, Bericht docs/balance-pvp.md): jeder Weg gegen jeden,
//                                                     Stufe 20/50/80, Ausrüstung std und top; --alt misst die Rechnung bis
//                                                     14.14, --wuerfe <n> Würfe je Paar (4), --pvp-zeit <s> längstes Duell (60),
//                                                     --pvp-tabellen <datei.json> druckt die Tabellen einer Messung
// Optionen: --out <datei.json> (Standard: balance-ergebnis.json bzw. balance-vorschlag.json im aktuellen Ordner),
//           --worker <n> (parallele Seiten, Standard 3), --url <http://…/> (statt des eigenen Servers),
//           --kurz (kürzere Läufe zum schnellen Probieren), --ohne-farm (Farm-Lauf weglassen), --root <repo> (Spielordner)
// Voraussetzung: Node mit Playwright (require('playwright')), Chromium installiert (npx playwright install chromium).
// Es wird KEINE Spieldatei verändert; Vorschläge werden nur im Browser auf die geladenen Daten gelegt.

const fs = require('fs');
const path = require('path');
const http = require('http');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  try { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); } catch (e2) {
    console.error('Playwright fehlt: npm i -g playwright && npx playwright install chromium');
    process.exit(1);
  }
}

// Repo-Ordner: tools/.. oder --root <ordner>
let ROOT = path.join(__dirname, '..');
{ const i = process.argv.indexOf('--root'); if (i > 0) ROOT = path.resolve(process.argv[i + 1]); }

// --- Was gemessen wird -------------------------------------------------------------------------------------------
const PATHS = [
  ['krieger', 0, 'krieger.klinge', 'Krieger · Klinge'],
  ['krieger', 1, 'krieger.leib', 'Krieger · Leib'],
  ['ninja', 0, 'ninja.dolch', 'Ninja · Dolch'],
  ['ninja', 1, 'ninja.falke', 'Ninja · Falke'],
  ['schamane', 0, 'schamane.drache', 'Schamane · Drache'],
  ['schamane', 1, 'schamane.heilung', 'Schamane · Heilung'],
  ['nekromant', 0, 'nekromant.seelen', 'Nekromant · Seelen'],
  ['nekromant', 1, 'nekromant.knochen', 'Nekromant · Knochen'],
  ['magier', 0, 'magier.feuer', 'Magier · Feuer'],
  ['magier', 1, 'magier.frost', 'Magier · Frost'],
  ['magier', 2, 'magier.blitz', 'Magier · Blitz'],
  ['magier', 3, 'magier.erde', 'Magier · Erde']
];
// Wege, an denen gerade gebaut wird (Messung = Stand im Arbeitsverzeichnis)
// Frost ist seit 13.66 fertig; der Weg des Falken wird gerade noch einmal umgebaut (Mehrfachschuss, seit 13.76 Pfeilregen, Schattenschritt)
const IN_ARBEIT = new Set(['ninja.falke']);
const LEVELS = [10, 30, 50, 70, 80];
// std: alles +7, Seltenheit Normal, keine Boni · gut: alles +15, Selten (blau) mit 3 Boni je Teil (Hauptwert, Leben, passender Wert)
// top (seit 14.15, für --pvp): alles +20, so selten wie die Stufe erlaubt (bis Episch), 5 Boni je Teil: die drei von „gut“ und zwei
// für den Kampf gegen Spieler (Stark/Abwehr gegen Menschen, Abwehr gegen Magie/Nahkampf/Fernkampf, kritischer Schaden)
const GEARS = { std: { plus: 7, prof: 'std' }, gut: { plus: 15, prof: 'gut' }, top: { plus: 20, prof: 'top' } };
// ohne --ausr misst der normale Lauf (PvE) wie bisher std und gut, der PvP-Lauf std und top
const PVE_GEARS = ['std', 'gut'];
const PVP_GEARS = ['std', 'top'];

// Gewichte der Gesamtwertung (Summe 1)
const WEIGHTS = { st: 0.25, aoe: 0.25, surv: 0.20, ctrl: 0.15, mob: 0.15 };

// --- Vorschlag (wird mit --vorschlag zur Laufzeit angewendet) -------------------------------------------------------
// set: Pfad in den Spieldaten = neuer Wert · ult: Kennung in ULT_RUN, mul: Faktor auf alle Treffer der Ulti
// segen: Klassensegen (Klasse, 'licht' oder 'falke'), fn: neue effects-Funktion
// ultbuff: Kennung in ULT_RUN, buff: { id, name, duration, effects } – neuer Buff nach dieser Ulti (kleine Code-Änderung)
// inject: Fertigkeits-Kennung, opts: zusätzliche Trefferwirkung (stun, slow …) – steht für ein NEUES Datenfeld, das die
//         Fertigkeit im Spielcode an hitMonster weitergeben muss (kleine Code-Änderung, im Bericht gekennzeichnet)
// Der Vorschlag aus docs/balance-klassen.md ist seit 13.68 im Spiel umgesetzt; die Liste ist deshalb leer.
// Für neue Versuche hier Einträge eintragen oder --vorschlag-datei <datei.json> benutzen. Beispiele:
//   { set: 'CLASSES.krieger.paths.0.skills.0.waveDmg', v: 1.6 }
//   { inject: 'glutfeld', opts: { stun: 0.35 } }
//   { ultbuff: 'inferno', buff: { id: 'glutmantel', name: 'Glutmantel', duration: 30, effects: { damageTaken: -0.35 } } }
//   { segen: 'magier', fn: '(lv) => ({ natureDmg: 0.04 + 0.02 * lv })' }
const VORSCHLAG = [];

// =================================================================================================================
// Seitenteil: läuft im Browser im Spiel. Wird als Text in die Seite gelegt (pageLib.toString()).
// =================================================================================================================
function pageLib() {
  const S = (window.SIM = {});
  let seed = 1;
  S.seed = (s) => { seed = (s >>> 0) || 1; };
  S.rng = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  Math.random = () => S.rng();

  // Anzeige, Speichern und Welt-Ereignisse aus (ändert keine Kampfformel)
  window.saveGame = () => {};
  if (typeof dayNightTick === 'function') window.dayNightTick = () => {};
  window.updateRifts = () => {};
  window.questTick = () => {};
  window.updateVillagers = () => {};
  window.updateAmbient = () => {};
  window.keepScreenOn = () => {};
  ui.update = () => {}; ui.log = () => {}; ui.banner = () => {}; ui.loot = () => {}; ui.showDeath = () => {};
  ui.buildSkillBar = () => {}; ui.renderCharPanel = () => {};
  window.addText = () => {};

  // --- Schadens-Zuordnung (Quelle je Treffer) ---
  S.ctx = null; S.cur = null; S.track = null;
  const origLater = window.later;
  window.later = function (delay, fn) {
    const c = S.ctx;
    return origLater(delay, function () { const prev = S.ctx; S.ctx = c; try { return fn(); } finally { S.ctx = prev; } });
  };
  const origHit = window.hitMonster;
  S.inject = {};
  window.hitMonster = function (m, mul, opts = {}) {
    // Vorschlag: zusätzliche Treffer-Wirkung für eine Fertigkeit (z. B. Glutfeld verlangsamt), wie ein neues Datenfeld
    if (opts.skill && S.inject[opts.skill] && S.ctx !== 'ULTI') opts = Object.assign({}, S.inject[opts.skill], opts);
    const prev = S.cur;
    S.cur = opts.ally ? 'Diener' : opts.basic ? 'Grundangriff' : S.ctx === 'ULTI' ? 'ULTI' : opts.skill ? opts.skill : (S.ctx || 'sonstige');
    try { return origHit(m, mul, opts); } finally { S.cur = prev; }
  };
  const origDmg = window.damageMonster;
  window.damageMonster = function (m, amount, crit, source, isDot) {
    if (S.track && m.simDummy && !m.dead) {
      const src = isDot ? 'DoT' : (S.cur || S.ctx || 'sonstige');
      S.track.total += amount;
      S.track.bySrc[src] = (S.track.bySrc[src] || 0) + amount;
    }
    return origDmg(m, amount, crit, source, isDot);
  };
  const origUseSkill = window.useSkill;
  window.useSkill = function (i) {
    const p = game.player; const sk = p && classSkills(p)[i]; const prev = S.ctx;
    S.ctx = sk ? sk.id : prev;
    try { return origUseSkill(i); } finally { S.ctx = prev; }
  };
  const origUlt = window.useUltimate;
  window.useUltimate = function () { const prev = S.ctx; S.ctx = 'ULTI'; try { return origUlt(); } finally { S.ctx = prev; } };
  // Boss-Puppe: Boss-Regeln (keine Betäubung, kein Einfrieren, kein Hochschleudern), aber ohne Boss-Angriffe
  const origBoss = window.updateBoss;
  window.updateBoss = function (m, dt) { return m.simDummy ? false : origBoss(m, dt); };

  // --- Werte zur Laufzeit ändern ---
  const saved = [];
  const glob = (name) => (name in window ? window[name] : eval(name));
  S.applyOverrides = (list) => {
    S.resetOverrides();
    for (const e of list || []) {
      if (e.set) {
        const parts = e.set.split('.');
        let o = glob(parts[0]);
        for (let k = 1; k < parts.length - 1; k++) o = o[parts[k]];
        const key = parts[parts.length - 1];
        saved.push({ o, key, v: o[key], had: key in o });
        o[key] = e.v;
      } else if (e.ult) {
        const run = glob('ULT_RUN'); const orig = run[e.ult];
        saved.push({ o: run, key: e.ult, v: orig, had: true });
        run[e.ult] = (p, u, pw) => orig(p, u, pw * e.mul);
      } else if (e.ultbuff) {
        // neuer Buff nach einer Ulti (wie Steinhaut/Donnerkrone): steht für "if (u.buff) ultBuff(p, u.buff)" im Ablauf
        const run = glob('ULT_RUN'); const orig = run[e.ultbuff];
        saved.push({ o: run, key: e.ultbuff, v: orig, had: true });
        run[e.ultbuff] = (p, u, pw) => { const r = orig(p, u, pw); if (r !== false) ultBuff(p, e.buff); return r; };
      } else if (e.inject) {
        saved.push({ o: S.inject, key: e.inject, v: S.inject[e.inject], had: e.inject in S.inject });
        S.inject[e.inject] = e.opts;
      } else if (e.segen) {
        const tab = e.segen === 'licht' ? glob('SEGEN_LICHT') : e.segen === 'falke' ? glob('SEGEN_FALKE') : glob('SEGEN')[e.segen];
        saved.push({ o: tab, key: 'effects', v: tab.effects, had: true });
        tab.effects = eval(e.fn);
      }
    }
  };
  S.resetOverrides = () => { while (saved.length) { const s = saved.pop(); if (s.had) s.o[s.key] = s.v; else delete s.o[s.key]; } };

  // --- Ausrüstung ---
  S.tierFor = (L) => { let t = 0; ITEM_TIERS.forEach((x, i) => { if (L >= x.level) t = i; }); return t; };
  const MID = (def, tier) => {
    // feste Stufen (seit 14.21 „Max. Leben“ 200/350/500/1000): Mittelwert der Stufen
    if (def.steps) return Math.round(def.steps.reduce((a, b) => a + b, 0) / def.steps.length);
    const r = (def.range[0] + def.range[1]) / 2;
    if (def.fmt === 'flat') return Math.max(1, Math.round(r * (1 + tier * (def.tierScale || 0.35))));
    const v = Math.min(def.max || Infinity, r * (1 + tier * 0.1));
    return def.fmt === 'pct1' ? Math.round(v * 10000) / 10000 : Math.round(v * 1000) / 1000;
  };
  const SLOT_BONUS = { waffe: 'atk', ruestung: 'dmgReduce', helm: 'crit', schultern: 'atk', umhang: 'dodge', schuhe: 'atkSpeed', guertel: 'atk', schild: 'block', koecher: 'atk' };
  // top: zwei Boni für den Kampf gegen Spieler je Platz (seit 14.15)
  const SLOT_PVP = { waffe: ['vsHuman', 'critDmg'], ruestung: ['resHuman', 'resMagic'], helm: ['resHuman', 'vsHuman'], schultern: ['resMagic', 'resMelee'],
    umhang: ['resHuman', 'resRanged'], schuhe: ['resHuman', 'resMelee'], guertel: ['vsHuman', 'resRanged'], schild: ['resHuman', 'resMagic'], koecher: ['vsHuman', 'critDmg'] };
  // nur Boni, die auf diesem Platz vorkommen können (seit 14.21 z. B. kein „Max. Leben“ auf Waffe und Köcher)
  const fits = (it) => (b) => !BONUS_TYPES[b].slots || BONUS_TYPES[b].slots.includes(it.slot) || ATTR_BONUS_IDS.includes(b);
  S.gear = (cls, path, L, plus, prof) => {
    const t = S.tierFor(L);
    const kind = cls === 'ninja' && path === 1 ? 'bow' : CLASS_WEAPON_KINDS[cls][0];
    const eq = {
      waffe: makeItem('waffe', t, plus, cls, kind), ruestung: makeItem('ruestung', t, plus, cls), helm: makeItem('helm', t, plus, cls),
      schultern: makeItem('schultern', t, plus), umhang: makeItem('umhang', t, plus), schild: null,
      schuhe: makeItem('schuhe', t, plus), guertel: makeItem('guertel', t, plus)
    };
    if (cls === 'krieger') eq.schild = makeItem('schild', t, plus);
    if (cls === 'ninja' && kind === 'dagger') eq.schild = makeItem('waffe', t, plus, 'ninja', 'dagger');
    if (cls === 'ninja' && kind === 'bow') eq.schild = makeItem('koecher', t, plus);
    if (prof === 'gut') for (const it of Object.values(eq)) {
      if (!it) continue;
      it.rarity = 2;
      it.bonuses = [MAIN_ATTR[cls], 'hp', SLOT_BONUS[it.slot] || 'atk'].filter(fits(it)).map((b) => ({ t: b, v: MID(BONUS_TYPES[b], it.tier) }));
    }
    if (prof === 'top') for (const it of Object.values(eq)) {
      if (!it) continue;
      it.rarity = capRarity(3, it.tier);
      it.bonuses = [MAIN_ATTR[cls], 'hp', SLOT_BONUS[it.slot] || 'atk', ...(SLOT_PVP[it.slot] || [])].filter(fits(it)).map((b) => ({ t: b, v: MID(BONUS_TYPES[b], it.tier) }));
    }
    return eq;
  };

  // --- Fertigkeitsstufen (für alle Wege gleich, ohne Vorliebe für eine Art von Fertigkeit) ---
  // bis Stufe 69: L−1 Punkte reihum auf alle freigeschalteten Fertigkeiten (Reihenfolge der Freischaltung), 15 → E1;
  // Stufe 70–79: alle H5 (Punkte voll + Schriftrollen); ab Stufe 80: alle L5
  S.skillLevels = (cls, path, L) => {
    if (L >= 80) return [42, 42, 42, 42, 42];
    if (L >= 70) return [32, 32, 32, 32, 32];
    const skills = CLASSES[cls].paths[path].skills;
    const lv = [1, 1, 1, 1, 1];
    let pts = L - 1;
    const order = skills.map((sk, i) => i).sort((a, b) => skills[a].unlock - skills[b].unlock);
    let guard = 0;
    while (pts > 0 && guard++ < 500) {
      let spent = false;
      for (const i of order) {
        if (pts <= 0) break;
        if (L < skills[i].unlock || lv[i] >= 15) continue;
        lv[i]++; pts--; spent = true;
      }
      if (!spent) break;
    }
    for (let i = 0; i < 5; i++) if (lv[i] >= 15) lv[i] = 18;
    return lv;
  };

  S.findArena = (zoneId) => {
    const zone = ZONES.find((z) => z.id === zoneId);
    for (let tries = 0; tries < 800; tries++) {
      const sp = randomSpotInZone(zone, 0.3, 0.9);
      if (!sp) continue;
      let ok = true;
      for (let dx = -340; dx <= 340 && ok; dx += 20) for (let dy = -340; dy <= 340 && ok; dy += 20) if (!canStand(sp.x + dx, sp.y + dy, 14, true)) ok = false;
      if (ok && !inVillage(sp.x, sp.y)) return { x: sp.x, y: sp.y, zone };
    }
    return null;
  };
  S.arena = null;

  S.make = (cls, path, L, opt = {}) => {
    const s = newCharacter('Sim', cls, path);
    s.level = L;
    s.daily = { last: dailyKey(), streak: 1 };
    s.equipment = S.gear(cls, path, L, opt.plus != null ? opt.plus : 7, opt.prof || 'std');
    s.dagger2 = true; s.quiverGiven = true; s.bowPathGift = true;
    s.skillLevels = opt.skillLevels || S.skillLevels(cls, path, L);
    const main = MAIN_ATTR[cls];
    const pts = STAT_POINTS_PER_LEVEL * (L - 1);
    s.attrs = { str: 0, vit: 0, int: 0, dex: 0 };
    s.attrs[main] = Math.min(MAX_ATTR, pts);
    s.attrs.vit = Math.min(MAX_ATTR, pts - s.attrs[main]);
    s.statPoints = 0;
    s.potions = {};
    for (const sz of POTION_SIZES) s.potions[potKey('mp', sz.id)] = 9999;
    let ai = 0; ARROW_TYPES.forEach((a, i) => { if (L >= a.level) ai = i; });
    s.arrows = { [ai]: 999999 };
    startGame(s);
    if (ui.closePanels) ui.closePanels();
    const p = game.player;
    const ar = S.arena || (S.arena = S.findArena('wiesen'));
    p.x = ar.x; p.y = ar.y; p.facing = { x: 1, y: 0 };
    game.monsters = []; game.allies = []; game.projectiles = []; game.timers = [];
    if (game.effects) game.effects.length = 0;
    if (game.graves) game.graves.length = 0;
    game.target = null; game.aim = null; game.hitStop = 0;
    p.buffs = [];
    if (opt.segen !== false && L >= SEGEN_UNLOCK && typeof useSegen === 'function') { p.segenAt = -99; useSegen(); }
    game.stats = playerStats(p);
    p.hp = game.stats.maxHp; p.mp = game.stats.maxMp;
    p.skillCd = [0, 0, 0, 0, 0]; p.ultCd = 0; p.lastCombat = -99;
    return p;
  };

  S.spawn = (typeId, level, dx, dy) => {
    const p = game.player;
    const m = createMonster(typeId, p.x + dx, p.y + dy, { level, respawn: false, groupId: 999 });
    m.respawn = false;
    game.monsters.push(m);
    return m;
  };

  // --- Spieler-KI ---
  S.ai = { mode: 'rotult', potHp: 0, potMp: 0.3, pots: 0, mpPots: 0 };
  S.pvpMode = false; // im PvP-Lauf zählt der Duellgegner (Stellvertreter) als Ziel
  const reach = (sk) => sk.range || (sk.distance ? sk.distance + 30 : 0) || sk.waveLen || sk.radius || 120;
  const prio = (sk) => (sk.channel || sk.castTime ? -1 : sk.cooldown);
  S.aiTick = () => {
    const p = game.player; const A = S.ai;
    if (p.dead || A.mode === 'none') return;
    const alive = (S.pvpMode ? aliveEnemies() : game.monsters).filter((m) => !m.dead);
    if (!alive.length) return;
    let t = game.target && !game.target.dead ? game.target : null;
    if (!t) { let bd = Infinity; for (const m of alive) { const d = dist(m, p); if (d < bd) { bd = d; t = m; } } game.target = t; }
    const s = game.stats;
    if (A.potHp && p.hp < s.maxHp * A.potHp && (!p.potCd || p.potCd.hp <= 0)) { usePotion('hp'); A.pots++; }
    if (A.potMp && p.mp < s.maxMp * A.potMp && (!p.potCd || p.potCd.mp <= 0)) { usePotion('mp'); A.mpPots++; }
    input.attackAt = game.time;
    if (A.mode === 'basic' || p.mcast || p.dash) return;
    const skills = classSkills(p);
    const d = dist(t, p) - (t.r || 0);
    const chanAge = p.channel ? game.time - p.channel.start : 99;
    if (A.mode === 'rotult' && p.level >= ULT_UNLOCK && p.ultCd <= 0 && d < 260 && !(p.channel && chanAge < 1.5)) {
      useUltimate();
      if (p.ultCd > 0) return;
    }
    const order = [0, 1, 2, 3, 4].sort((a, b) => prio(skills[b]) - prio(skills[a]));
    for (const i of order) {
      const sk = skills[i];
      if (p.level < sk.unlock || p.skillCd[i] > 0 || p.mp < skillMana(sk, p)) continue;
      if (sk.kind === 'buff') {
        if (p.buffs.some((b) => b.id === sk.id)) continue;
        if (sk.effects && sk.effects.invisible) { const hi = skills.findIndex((x) => x.id === 'hinterhalt'); if (hi >= 0 && p.skillCd[hi] > 0.3) continue; }
        if (p.channel && chanAge < 1.5) continue;
        useSkill(i); return;
      }
      if (sk.kind === 'heilung') { if (p.hp < s.maxHp * 0.6 || !p.buffs.some((b) => b.id === sk.id)) { useSkill(i); return; } continue; }
      if (sk.kind === 'beschwörung') {
        if (sk.type === 'summon' && game.allies.some((a) => !a.ghost && !a.dead)) continue;
        if (sk.type === 'revive' && game.allies.some((a) => a.ghost && !a.dead)) continue;
        if (p.channel && chanAge < 1.5) continue;
        useSkill(i);
        if (p.skillCd[i] > 0) return;
        continue;
      }
      if (d > reach(sk) + 10) continue;
      if (sk.channel) {
        const other = skills.some((o, j) => j !== i && !o.channel && o.kind === 'angriff' && p.level >= o.unlock && p.skillCd[j] <= 0 && p.mp >= skillMana(o, p) && d <= reach(o) + 10);
        if (other || p.channel) continue;
      } else if (p.channel && chanAge < 1.5) continue;
      if (sk.type === 'mcast' && d > 330) continue;
      useSkill(i);
      if (sk.aim && game.aim) useSkill(i);
      if (p.skillCd[i] > 0 || p.channel || p.mcast) return;
    }
  };

  // Zeit in Echtzeit (Bilder × dt): Treffer-Stopps (hitStop bei Krits) kosten wie im Spiel echte Zeit
  S.dt = 1 / 30;
  S.frameHook = null;
  S.run = (realT, stop) => {
    let frames = 0;
    const n = Math.round(realT / S.dt);
    while (frames < n) {
      S.aiTick();
      update(S.dt);
      frames++;
      if (S.frameHook) S.frameHook(frames * S.dt);
      if (stop && stop()) break;
    }
    return frames * S.dt;
  };

  // Buffs und Diener vor dem Kampf, danach Mana/Leben voll und Abklingzeiten (außer Buffs/Diener) frei
  S.prebuff = () => {
    const p = game.player; const skills = classSkills(p); const keep = game.monsters;
    game.monsters = [];
    skills.forEach((sk, i) => {
      if (p.level < sk.unlock) return;
      const pre = sk.kind === 'buff' ? !(sk.effects && sk.effects.invisible) : sk.kind === 'beschwörung' && sk.type === 'summon';
      if (!pre) return;
      // seit 13.85: globale Abklingzeit der Zauberer (applyGcd, kampf.js) abwarten, wie ein Spieler beim Vorbereiten
      if (p.skillCd[i] > 0) S.run(p.skillCd[i] + 0.05);
      p.mp = 1e6; useSkill(i); S.run(sk.kind === 'buff' ? 0.8 : 1.2);
    });
    game.monsters = keep;
    game.stats = playerStats(p);
    p.mp = game.stats.maxMp; p.hp = game.stats.maxHp;
    p.skillCd = p.skillCd.map((c, i) => (skills[i].kind === 'buff' || (skills[i].kind === 'beschwörung' && skills[i].type === 'summon') ? c : 0));
    p.ultCd = 0; p.lastCombat = -99; game.hitStop = 0;
  };

  // Puppen: Monster der Stufe L (Rüstung wie normale Monster), unendlich Leben, kein Schaden; boss = Boss-Regeln
  S.dummies = (L, n, boss) => {
    const list = [];
    for (let k = 0; k < n; k++) {
      const ang = k * 2.39996; const r = k === 0 ? 0 : 26 * Math.sqrt(k);
      const m = S.spawn('ork', L, 90 + Math.cos(ang) * r, Math.sin(ang) * r);
      if (boss) m.type = Object.assign({}, m.type, { boss: { color: '#ffffff' } });
      m.maxHp = m.hp = 1e12; m.atk = 0; m.simDummy = true;
      m.state = 'chase'; m.target = game.player;
      list.push(m);
    }
    return list;
  };

  const snap = () => {
    const s = game.stats;
    const r = (v, n = 3) => +(+v || 0).toFixed(n);
    return { maxHp: s.maxHp, maxMp: s.maxMp, atk: s.atk, def: s.def, crit: r(Math.min(0.6, s.crit)), critDmg: r(1.8 + (s.critDmg || 0), 2), atkSpeed: r(s.atkSpeed), skillDmg: r(s.skillDmg), dodge: r(s.dodge), block: r(s.block), damageTaken: r(s.damageTaken), regen: r(s.regen, 4), hpSteal: r(s.hpSteal), omniVamp: r(s.omniVamp), footSpeed: Math.round(s.footSpeed), healPower: r(s.healPower || 1, 2) };
  };

  // Einzelziel gegen Boss-Puppe: Zeitreihe 5 s (Burst) / 30 s / T
  S.single = (cls, path, L, opt = {}) => {
    S.seed(opt.seed || 7);
    S.make(cls, path, L, opt);
    S.ai.mode = 'rotult'; S.ai.potHp = 0; S.ai.potMp = 0.3; S.ai.mpPots = 0;
    S.prebuff();
    const stats = snap();
    const [m] = S.dummies(L, 1, true);
    game.target = m;
    S.track = { total: 0, bySrc: {} };
    const at = {};
    S.frameHook = (t) => { for (const k of [5, 30]) if (at[k] == null && t >= k - 1e-9) at[k] = S.track.total; };
    const T = S.run(opt.T || 120);
    S.frameHook = null;
    const tr = S.track; S.track = null;
    return { T, dps: tr.total / T, d5: at[5] / 5, d30: at[30] / 30, bySrc: tr.bySrc, stats, mpPotsPerMin: S.ai.mpPots / T * 60 };
  };

  // Fläche: n Puppen (normale Monster) im Haufen, die auf die Figur zulaufen; Kontrolle je Ziel und Minute
  S.aoe = (cls, path, L, n, opt = {}) => {
    S.seed(opt.seed || 9);
    S.make(cls, path, L, opt);
    S.ai.mode = 'rotult'; S.ai.potHp = 0; S.ai.potMp = 0.3; S.ai.mpPots = 0;
    S.prebuff();
    const list = S.dummies(L, n, false);
    game.target = list[0];
    S.track = { total: 0, bySrc: {} };
    let stun = 0, slowEq = 0;
    S.frameHook = () => {
      for (const m of list) {
        if (m.stun > 0) stun += S.dt;
        else if (m.slow && m.slow.until > game.time && m.slow.mul < 1) slowEq += (1 - m.slow.mul) * S.dt;
      }
    };
    const T = S.run(opt.T || 60);
    S.frameHook = null;
    const tr = S.track; S.track = null;
    return { T, dps: tr.total / T, bySrc: tr.bySrc, stunPerMin: stun * 60 / T / n, slowEqPerMin: slowEq * 60 / T / n };
  };

  // Überleben: 3 unsterbliche Monster der eigenen Stufe (Ork, Angriff × 1,3 wie die Zonen-Monster) greifen an, die Figur kämpft
  // mit ihrer Rotation (Heilung, Lebensraub, Diener, Betäubungen, Verlangsamung zählen), ohne Lebenstränke.
  // Das Leben wird nach jedem Bild auf 50 % zurückgesetzt (keine verschwendete Heilung, kein Zufallstod) und gemessen:
  //   dtps = erlittener Schaden/s, hps = Heilung/s → Zeit bis zum Tod = maxHp / max(dtps − hps, 0,1 × dtps)
  //   (Untergrenze des Netto-Verlusts 10 % von dtps, bei Heilüberschuss entsprechend weniger: wer mehr heilt als er
  //   einsteckt, gilt als "praktisch unbegrenzt", und mehr Überschuss zählt mehr)
  const origDie = window.playerDie;
  window.playerDie = function () { if (S.pin) { game.player.hp = 1; return; } return origDie(); };
  S.ttd = (cls, path, L, opt = {}) => {
    S.seed(opt.seed || 13);
    const p = S.make(cls, path, L, opt);
    S.ai.mode = 'rotult'; S.ai.potHp = 0; S.ai.potMp = 0.3;
    S.prebuff();
    const list = [];
    for (let j = 0; j < (opt.k || 3); j++) {
      const ang = j * 2.1;
      const m = S.spawn('ork', L, 110 + Math.cos(ang) * 30, Math.sin(ang) * 30);
      m.atk = Math.round(m.atk * 1.3);
      m.maxHp = m.hp = 1e12;
      m.state = 'chase'; m.target = p;
      list.push(m);
    }
    game.target = list[0];
    const maxHp = game.stats.maxHp;
    p.hp = maxHp * 0.5;
    let lost = 0, healed = 0;
    S.pin = true;
    S.frameHook = () => {
      const half = game.stats.maxHp * 0.5;
      const d = p.hp - half;
      if (d > 0) healed += d; else lost -= d;
      p.hp = half; p.dead = false;
    };
    const T = S.run(opt.T || 60);
    S.frameHook = null; S.pin = false;
    const dtps = lost / T, hps = healed / T;
    // seit 13.68: wer mehr heilt, als er einsteckt, bekommt den Überschuss angerechnet (Untergrenze 10 % × dtps/hps statt fest 10 %)
    const est = maxHp / Math.max(dtps - hps, 0.1 * dtps * Math.min(1, dtps / Math.max(hps, 1e-6)), 1e-6);
    return { T, est: +est.toFixed(1), raw: +(maxHp / Math.max(dtps, 1e-6)).toFixed(1), dtps: +dtps.toFixed(1), hps: +hps.toFixed(1), maxHp, monAtk: list[0].atk, capped: dtps - hps <= 0.1 * dtps };
  };

  // Effektives Leben gegen Monster der Stufe L (berechnet aus Spielwerten, Buffs aktiv; Treffer eines Monsters mit Angriffsfaktor 1,3)
  S.ehp = (cls, path, L, opt = {}) => {
    S.seed(5);
    S.make(cls, path, L, opt);
    S.prebuff();
    const s = game.stats;
    const armor = 1 - s.def / (s.def + 40 + 5 * (L - 1));
    const per = s.damageTaken * (1 - s.dodge) * (1 - s.block) * armor;
    const hit = monsterStats(L, 1, 1.3).atk * per;
    return { ehp: Math.round(s.maxHp / per), hits: +(s.maxHp / Math.max(1, hit)).toFixed(1), armor: +armor.toFixed(3), stats: snap() };
  };

  // Mobilität: Fußtempo (mit Buffs) + Sprung-/Teleportweite je Sekunde Abklingzeit; Reichweite des Grundangriffs
  const MOVE = { leap: 'distance', blink: 'range', shift: 'distance', bleap: 'distance', bshadow: 'range' };
  S.mobility = (cls, path, L, opt = {}) => {
    S.make(cls, path, L, opt);
    S.prebuff();
    const p = game.player; const s = game.stats;
    let jump = 0; const parts = [];
    for (const sk of classSkills(p)) {
      if (p.level < sk.unlock || !MOVE[sk.type]) continue;
      const w = sk[MOVE[sk.type]];
      jump += w / sk.cooldown;
      parts.push(`${sk.name} ${w}/${sk.cooldown} s`);
    }
    const basic = basicAttack(p);
    let range = basic.range;
    if (basic.style === 'arrow' && typeof bowRangeBonus === 'function') range = Math.round(range * (1 + (bowRangeBonus(p) || 0)));
    return { foot: Math.round(s.footSpeed), jump: +jump.toFixed(1), mob: +(s.footSpeed + jump).toFixed(1), range, ranged: !!basic.ranged, parts };
  };

  // Farmen: 90 s lang je 5 echte Monster der eigenen Stufe (Angriff × 1,3), neue Welle wenn alle tot; Lebenstränke unter 35 %
  S.farm = (cls, path, L, opt = {}) => {
    S.seed(opt.seed || 17);
    const p = S.make(cls, path, L, opt);
    for (const sz of POTION_SIZES) p.potions[potKey('hp', sz.id)] = 9999;
    S.ai.mode = 'rotult'; S.ai.potHp = 0.35; S.ai.potMp = 0.3; S.ai.pots = 0;
    S.prebuff();
    let spawned = 0, deaths = 0;
    const wave = () => {
      for (let j = 0; j < 5; j++) {
        const ang = j * 1.25;
        const m = S.spawn('ork', L, 150 + Math.cos(ang) * 40, Math.sin(ang) * 40);
        m.atk = Math.round(m.atk * 1.3);
        m.state = 'chase'; m.target = p;
        spawned++;
      }
    };
    wave();
    // besiegte Monster ohne Wiederkehr nimmt das Spiel selbst aus der Liste
    const aliveN = () => game.monsters.filter((m) => !m.dead).length;
    S.frameHook = () => {
      if (!aliveN()) wave();
      if (p.dead) { deaths++; p.dead = false; p.hp = game.stats.maxHp; p.mp = game.stats.maxMp; }
    };
    const T = S.run(opt.T || 90);
    S.frameHook = null;
    const kills = spawned - aliveN();
    return { kpm: +(kills / T * 60).toFixed(1), deaths, potsPerMin: +(S.ai.pots / T * 60).toFixed(1) };
  };

  // --- PvP (seit 14.15, --pvp) -------------------------------------------------------------------------------------
  // Ein Duell braucht zwei Figuren, das Spiel hat aber nur eine. Darum in zwei Schritten, beide mit dem echten Spielcode:
  //   1. Angriffsfolge (S.pvpStream): Figur A kämpft mit ihrer Rotation gegen einen Duell-Stellvertreter; jeder Treffer
  //      geht wie im Spiel über duelHit → pvpOutgoing und wird mit Zeitpunkt mitgeschrieben (Nachricht 'dh').
  //   2. Verteidigung (S.pvpDefend): Figur B kämpft genauso (Buffs, Heilung, Schilde, Ausweichen, Blocken), und die
  //      Treffer von A kommen zu ihren Zeitpunkten über duelReceive → pvpReceiveHit → damagePlayer bei ihr an (Gift,
  //      Deckel, Lebenspolster). B fällt, sobald sie auf 1 Leben kommt (duelLose). Ihr eigener Lebensraub läuft über
  //      die Rückmeldung, die A geschickt hätte (pvpIncoming mit den Werten von A).
  // Wer später fällt, gewinnt; die Dauer eines Duells ist die Zeit, bis der erste fällt. Bewegung, Reichweite und
  // Ausweichen durch Laufen zählen nicht (beide stehen), Betäubungen gehen im PvP ohnehin nicht über das Netz.
  const DUEL_PID = 'SIMGEGNER';
  S.netHook = null;
  window.netSocial = (pid, d) => { if (S.netHook) S.netHook(pid, d); };
  window.updateDuel = () => {};
  // Diener greifen den Duellgegner im Spiel nur im Netz an (allyScore, gegner.js: proxyOk); offline wie im Netz
  const origAllyScore = window.allyScore;
  window.allyScore = function (m, a, p, proxyOk) { return origAllyScore(m, a, p, proxyOk || S.pvpMode); };
  S.lostAt = null;
  S.t = 0;
  window.duelLose = () => { if (S.lostAt == null) S.lostAt = S.t; };
  S.duelSetup = (L) => {
    const p = game.player;
    game.duel = {
      pid: DUEL_PID, name: 'Gegner', fightAt: -1e9, endAt: 1e12, cx: p.x, cy: p.y, shown: 0,
      proxy: { id: 'duel', duelProxy: true, name: 'Gegner', r: 11, level: L, x: p.x + 60, y: p.y, hp: 1, maxHp: 1, def: 0, dead: false, hidden: false, isStone: false, type: {}, stun: 0 }
    };
    game.target = game.duel.proxy;
  };
  // Werte des Getroffenen, die pvpIncoming braucht
  S.recvSnap = () => {
    const s = game.stats;
    const o = { level: game.player.level };
    for (const k of ['def', 'damageTaken', 'resHuman', 'resMagic', 'resMelee', 'resRanged', 'maxHp', 'dodge', 'block']) o[k] = s[k] || 0;
    return o;
  };
  // vorher (bis 14.14): pvpMul fest 0,6, einfache Rüstung, Deckel 25/35 % je Treffer, kein Polster, kein Deckel je 1,5 s,
  // volle Heilung, kein Lebensraub im PvP, Krit immer ×1,8; „Erlittener Schaden“ wirkte über damagePlayer
  const NEW_PVP = { out: window.pvpOutgoing, recv: window.pvpReceiveHit, heal: window.pvpHealMul, ratio: window.pvpDealtRatio };
  S.legacy = false;
  S.pvpLegacy = (on) => {
    S.legacy = !!on;
    if (!on) { window.pvpOutgoing = NEW_PVP.out; window.pvpReceiveHit = NEW_PVP.recv; window.pvpHealMul = NEW_PVP.heal; window.pvpDealtRatio = NEW_PVP.ratio; return; }
    window.pvpHealMul = () => 1;
    window.pvpDealtRatio = () => 0.5;
    window.pvpOutgoing = (mul, opts) => {
      const p = game.player; const s = game.stats;
      const base = opts.atk != null ? opts.atk : s.atk;
      const crit = !opts.ally && Math.random() < s.crit + (opts.critBonus || 0);
      if (!opts.ally && !opts.dot) breakStealth(p);
      const raw = base * mul * (opts.ally ? 0.5 : 1) * (0.9 + Math.random() * 0.2) * (crit ? 1.8 : 1) * (opts.basic ? 1 + (s.basicDmg || 0) : 1) * (opts.duelMul || 1);
      return { a: Math.round(raw), c: crit ? 1 : 0, l: p.level };
    };
    window.pvpReceiveHit = (d, src) => {
      const p = game.player; const s = game.stats;
      const raw = d.a * 0.6 * (1 - s.def / (s.def + 40 + 5 * ((d.l || 1) - 1)));
      const capped = (d.l || 1) - p.level < 10;
      const amount = Math.max(1, Math.round(capped ? Math.min(raw, s.maxHp * (d.c ? 0.35 : 0.25)) : raw));
      const before = p.hp;
      damagePlayer(amount, src);
      return Math.max(0, Math.round(before - p.hp));
    };
  };
  const pvpPrep = (cls, path, L, gear, seed) => {
    // freier Platz einmal mit festem Wurf suchen (ein 680er-Quadrat ohne Hindernis ist selten; je nach Wurf fände
    // findArena in 800 Versuchen keinen)
    for (let k = 0; !S.arena && k < 20; k++) { S.seed(7 + k); S.arena = S.findArena('wiesen'); }
    S.seed(seed);
    S.make(cls, path, L, { plus: gear.plus, prof: gear.prof });
    S.ai.mode = 'rotult'; S.ai.potHp = 0; S.ai.potMp = 0.3; S.ai.mpPots = 0;
    S.prebuff();
    S.duelSetup(L);
    S.pvpMode = true;
    S.lostAt = null;
    S.t = 0;
    return game.player;
  };
  const pvpDone = () => { S.pvpMode = false; S.netHook = null; game.duel = null; game.player.toxin = null; };
  S.pvpStream = (cls, path, L, gear, seed, T) => {
    pvpPrep(cls, path, L, gear, seed);
    const snap = S.recvSnap();
    const hits = [];
    S.netHook = (pid, d) => { if (d.k === 'dh') { const h = Object.assign({}, d); h.t = +S.t.toFixed(3); hits.push(h); } };
    const n = Math.round(T / S.dt);
    for (let f = 0; f < n; f++) { S.t = f * S.dt; S.aiTick(); update(S.dt); }
    pvpDone();
    return { hits, snap };
  };
  S.pvpDefend = (cls, path, L, gear, seed, stream, opp, T) => {
    const p = pvpPrep(cls, path, L, gear, seed);
    const maxHp = game.stats.maxHp;
    let i = 0, maxHit = 0, maxHitCrit = 0, taken = 0, nHits = 0;
    // eigene Treffer: Rückmeldung wie vom Gegner (Lebensraub zu 60 %); im alten Stand gab es im PvP keinen Lebensraub
    S.netHook = (pid, d) => {
      if (d.k !== 'dh' || S.legacy || d.al) return;
      const dealt = pvpIncoming(opp.level, opp, d, null, 0);
      pvpNoteDealt(d.a, dealt);
      pvpLifeSteal(dealt);
    };
    const n = Math.round(T / S.dt);
    for (let f = 0; f < n && S.lostAt == null; f++) {
      S.t = f * S.dt;
      while (i < stream.length && stream[i].t <= S.t && S.lostAt == null) {
        const d = stream[i++];
        const before = p.hp;
        duelReceive(DUEL_PID, d);
        const pct = Math.max(0, before - p.hp) / maxHp;
        taken += Math.max(0, before - p.hp);
        nHits++;
        if (pct > maxHit) maxHit = pct;
        if (d.c && pct > maxHitCrit) maxHitCrit = pct;
      }
      S.aiTick();
      update(S.dt);
    }
    const res = { t: S.lostAt, maxHit: +maxHit.toFixed(4), maxHitCrit: +maxHitCrit.toFixed(4), hp: Math.round(p.hp), maxHp, taken: Math.round(taken), nHits };
    pvpDone();
    return res;
  };

  // Alles für eine Figur
  S.measure = (cls, path, L, gear, o) => {
    const opt = { plus: gear.plus, prof: gear.prof };
    const r = { cls, path, L };
    const sT = o.kurz ? 45 : 120;
    r.single = S.single(cls, path, L, { ...opt, T: sT });
    r.singleOhneSegen = L >= SEGEN_UNLOCK ? S.single(cls, path, L, { ...opt, T: sT, segen: false }) : r.single;
    r.aoe5 = S.aoe(cls, path, L, 5, { ...opt, T: o.kurz ? 30 : 60 });
    r.aoe10 = S.aoe(cls, path, L, 10, { ...opt, T: o.kurz ? 30 : 60 });
    r.ttd = S.ttd(cls, path, L, { ...opt, T: o.kurz ? 30 : 60 });
    r.ehp = S.ehp(cls, path, L, opt);
    r.mob = S.mobility(cls, path, L, opt);
    if (o.farm) r.farm = S.farm(cls, path, L, { ...opt, T: o.kurz ? 45 : 90 });
    return r;
  };
}

// =================================================================================================================
// Node-Teil: Server, Arbeiter, Wertung, Tabellen
// =================================================================================================================
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, path.normalize(p));
      if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}/` }));
  });
}

async function openPage(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
  // kein Service Worker (sonst liefert er alte Dateien aus dem Zwischenspeicher)
  await ctx.route('**/sw.js', (r) => r.fulfill({ status: 404, body: '' }));
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => console.log('  [Seitenfehler]', e.message));
  await pg.addInitScript(() => localStorage.setItem('seelenstein.optionen', JSON.stringify({ view: '2d', graphics: 'niedrig', optsVer: 2, volume: 0, music: false, numbers: false })));
  await pg.goto(url);
  await pg.waitForFunction(() => typeof startGame === 'function' && typeof game !== 'undefined' && game.world, null, { timeout: 90000 });
  await pg.waitForTimeout(500);
  await pg.addScriptTag({ content: '(' + pageLib.toString() + ')();' });
  return pg;
}

function parseArgs(argv) {
  const a = { stufen: LEVELS, ausr: PVE_GEARS, wege: null, vorschlag: false, out: null, worker: 3, url: null, kurz: false, farm: true, tabellen: null, pvp: false, alt: false, seeds: 4, pvpZeit: 60 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i];
    if (k === '--stufen') { a.stufen = v().split(',').map(Number); a.stufenSet = true; }
    else if (k === '--ausr') { a.ausr = v().split(','); a.ausrSet = true; }
    else if (k === '--pvp') a.pvp = true;
    else if (k === '--alt') a.alt = true;
    else if (k === '--wuerfe') a.seeds = +v();
    else if (k === '--pvp-zeit') a.pvpZeit = +v();
    else if (k === '--pvp-tabellen') a.pvpTabellen = v();
    else if (k === '--wege') a.wege = v().split(',');
    else if (k === '--vorschlag') a.vorschlag = true;
    else if (k === '--vorschlag-datei') { a.vorschlag = true; a.vdatei = v(); }
    else if (k === '--out') a.out = v();
    else if (k === '--worker') a.worker = +v();
    else if (k === '--url') a.url = v();
    else if (k === '--kurz') a.kurz = true;
    else if (k === '--ohne-farm') a.farm = false;
    else if (k === '--tabellen') a.tabellen = v();
    else if (k === '--root') v();
  }
  return a;
}

// --- Wertung ------------------------------------------------------------------------------------------------------
// Rohwerte je Kategorie:
//   st   Einzelziel: Schaden/s über 120 s gegen eine Boss-Puppe (Buffs, Segen, Ulti, Rotation)
//   aoe  Fläche: geometrisches Mittel aus Schaden/s gegen 5 und gegen 10 Gegner (60 s)
//   surv Überleben: Zeit bis zum Tod gegen 3 Monster der eigenen Stufe = maxHp / (Schaden/s − Heilung/s), siehe S.ttd
//   ctrl Kontrolle: Betäubt-Sekunden + 0,5 × gewichtete Verlangsamung (Anteil × Sekunden), je Gegner und Minute (5 Gegner)
//   mob  Mobilität & Abstand: halb Mobilität (Fußtempo + Sprungweite/s), halb Reichweite des Grundangriffs, je Verhältnis
//        zum Schnitt auf 0,5–2 begrenzt
// Index = 100 × Wert / geometrisches Mittel aller 12 Wege (Werte unter 5 % des Schnitts zählen als 5 %).
// Punkte = 100 + 50 × log2(Index/100), begrenzt auf 0–150: doppelt so gut = +50 Punkte (mehr zählt nicht), halb so gut = −50.
// Gesamt = gewichtetes Mittel der Punkte (WEIGHTS).
const CAT = { st: 'Einzelziel', aoe: 'Fläche', surv: 'Überleben', ctrl: 'Kontrolle', mob: 'Mobilität' };
function raw(r) {
  return {
    st: r.single.dps,
    aoe: Math.sqrt(r.aoe5.dps * r.aoe10.dps),
    surv: survEst(r.ttd),
    ctrl: r.aoe5.stunPerMin + 0.5 * r.aoe5.slowEqPerMin,
    mob: null, // braucht den Schnitt, siehe score()
    _mob: r.mob.mob, _range: r.mob.range
  };
}
// Zeit bis zum Tod aus erlittenem Schaden/s und Heilung/s (auch für ältere Messdateien neu gerechnet)
function survEst(t) {
  if (t.dtps == null) return t.est;
  const dtps = Math.max(t.dtps, 1e-6), hps = Math.max(t.hps, 0);
  return t.maxHp / Math.max(dtps - hps, 0.1 * dtps * Math.min(1, dtps / Math.max(hps, 1e-6)), 1e-6);
}
const geo = (xs) => Math.exp(xs.reduce((s, x) => s + Math.log(x), 0) / xs.length);
const POINTS_MAX = 150; // höchstens doppelt so gut wie der Schnitt zählt (mehr bringt keine Punkte)
const points = (idx) => Math.max(0, Math.min(POINTS_MAX, 100 + 50 * Math.log2(Math.max(1e-9, idx) / 100)));
function score(rows) {
  // rows: Ergebnisse EINER Stufe und EINER Ausrüstung (alle Wege)
  const R = rows.map((r) => ({ r, v: raw(r) }));
  const avgMob = geo(R.map((x) => x.v._mob));
  const avgRange = geo(R.map((x) => x.v._range));
  const clamp = (x) => Math.max(0.5, Math.min(2, x));
  for (const x of R) x.v.mob = 0.5 * clamp(x.v._mob / avgMob) + 0.5 * clamp(x.v._range / avgRange);
  const out = {};
  for (const k of Object.keys(WEIGHTS)) {
    const arith = R.reduce((s, x) => s + x.v[k], 0) / R.length;
    const ref = geo(R.map((x) => Math.max(x.v[k], 0.05 * arith)));
    for (const x of R) {
      const idx = 100 * Math.max(x.v[k], 0.05 * arith) / ref;
      x.idx = x.idx || {}; x.pts = x.pts || {};
      x.idx[k] = idx; x.pts[k] = points(idx);
    }
    out[k] = ref;
  }
  for (const x of R) x.total = Object.entries(WEIGHTS).reduce((s, [k, w]) => s + w * x.pts[k], 0);
  return R;
}

const fmt = (n, d = 0) => (n == null || isNaN(n) ? '–' : Number(n).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }));
const label = (cls, path) => { const p = PATHS.find((x) => x[0] === cls && x[1] === path); return p[3] + (IN_ARBEIT.has(p[2]) ? ' ⚒' : ''); };

function tables(data) {
  const out = [];
  const levels = [...new Set(data.results.map((r) => r.L))].sort((a, b) => a - b);
  const gears = [...new Set(data.results.map((r) => r.gear))];
  for (const g of gears) for (const L of levels) {
    const rows = data.results.filter((r) => r.L === L && r.gear === g);
    if (!rows.length) continue;
    const R = score(rows);
    out.push(`\n#### Stufe ${L} · Ausrüstung ${g === 'std' ? '+7' : '+15 (blau, Boni)'}\n`);
    out.push('| Weg | Einzelziel | Fläche | Überleben | Kontrolle | Mobilität | **Gesamt** | ST-DPS 120 s | Burst 5 s | Fläche 5 / 10 | Tod nach | Betäubt / Bremse s/min | Ulti % | Segen % |');
    out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
    for (const x of R) {
      const r = x.r;
      const ult = r.single.bySrc.ULTI ? 100 * r.single.bySrc.ULTI / (r.single.dps * r.single.T) : 0;
      const seg = r.singleOhneSegen && r.singleOhneSegen !== r.single ? 100 * (r.single.dps / r.singleOhneSegen.dps - 1) : 0;
      const t = (r.ttd.capped ? '≥' : '') + fmt(survEst(r.ttd), 0) + ' s';
      out.push(`| ${label(r.cls, r.path)} | ${fmt(x.idx.st)} | ${fmt(x.idx.aoe)} | ${fmt(x.idx.surv)} | ${fmt(x.idx.ctrl)} | ${fmt(x.idx.mob)} | **${fmt(x.total)}** | ${fmt(r.single.dps)} | ${fmt(r.single.d5)} | ${fmt(r.aoe5.dps)} / ${fmt(r.aoe10.dps)} | ${t} | ${fmt(r.aoe5.stunPerMin, 1)} / ${fmt(r.aoe5.slowEqPerMin, 1)} | ${fmt(ult)} | ${fmt(seg)} |`);
    }
  }
  return out.join('\n');
}

function totalsTable(data, gear) {
  const levels = [...new Set(data.results.map((r) => r.L))].sort((a, b) => a - b);
  const lines = ['| Weg | ' + levels.map((L) => 'Stufe ' + L).join(' | ') + ' | Ø |', '|---|' + levels.map(() => '---:').join('|') + '|---:|'];
  const tot = {};
  for (const L of levels) {
    const rows = data.results.filter((r) => r.L === L && r.gear === gear);
    if (!rows.length) continue;
    for (const x of score(rows)) (tot[x.r.cls + x.r.path] = tot[x.r.cls + x.r.path] || {})[L] = x.total;
  }
  for (const [cls, pa] of PATHS.map((p) => [p[0], p[1]])) {
    const t = tot[cls + pa];
    if (!t) continue;
    const vals = levels.map((L) => t[L]).filter((v) => v != null);
    lines.push(`| ${label(cls, pa)} | ${levels.map((L) => fmt(t[L])).join(' | ')} | **${fmt(vals.reduce((s, v) => s + v, 0) / vals.length)}** |`);
  }
  return lines.join('\n');
}

// --- PvP-Lauf (--pvp, seit 14.15) --------------------------------------------------------------------------------
// Jede Klasse und jeder Weg gegen jede andere (auch gegen sich selbst), je Stufe und Ausrüstung, mit mehreren Würfen.
// Ausgabe: Dauer bis zum Sieg (Median, 10 %/90 %), größter Einzeltreffer in % des Lebens, Siegquote je Paar.
const PVP_LEVELS = [20, 50, 80];
const median = (xs) => { const a = xs.slice().sort((x, y) => x - y); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const quant = (xs, q) => { const a = xs.slice().sort((x, y) => x - y); if (!a.length) return null; return a[Math.min(a.length - 1, Math.max(0, Math.round(q * (a.length - 1))))]; };

async function runJobs(pages, jobs, fn, label) {
  let next = 0, done = 0;
  const t0 = Date.now();
  await Promise.all(pages.map(async (pg) => {
    while (next < jobs.length) {
      const j = jobs[next++];
      await fn(pg, j);
      done++;
      if (done % 100 === 0 || done === jobs.length) console.log(`  [${label}] ${done}/${jobs.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  }));
}

// Auswertung: je Paar (A gegen B, Wurf s) fällt B nach tB (A hat getroffen) und A nach tA; wer später (oder gar nicht)
// fällt, gewinnt. Dauer = früherer Zeitpunkt; fällt keiner in T Sekunden, ist es unentschieden (Dauer T).
function pvpAnalyse(data) {
  const { results, T } = data;
  const key = (g, L, r, a, s) => `${g}|${L}|${r}|${a}|${s}`;
  const D = new Map(results.map((r) => [key(r.gear, r.L, r.recv, r.att, r.seed), r]));
  const ids = PATHS.map((p) => p[2]);
  const out = {};
  for (const g of data.gears) for (const L of data.levels) {
    const times = [], pairs = [];
    let maxHit = 0, maxHitWho = '', maxCrit = 0;
    for (let i = 0; i < ids.length; i++) for (let j = i; j < ids.length; j++) {
      const A = ids[i], B = ids[j];
      let winA = 0, n = 0;
      const pt = [];
      for (const s of data.seeds) {
        const rB = D.get(key(g, L, B, A, s)); // B wird von A getroffen
        const rA = D.get(key(g, L, A, B, s));
        if (!rA || !rB) continue;
        const tB = rB.t == null ? Infinity : rB.t, tA = rA.t == null ? Infinity : rA.t;
        const t = Math.min(tA, tB);
        const dur = isFinite(t) ? t : T;
        times.push(dur); pt.push(dur);
        n++;
        if (tB < tA) winA += 1; else if (tA === tB) winA += 0.5;
        for (const r of [rA, rB]) {
          if (r.maxHit > maxHit) { maxHit = r.maxHit; maxHitWho = `${r.att} → ${r.recv}`; }
          if (r.maxHitCrit > maxCrit) maxCrit = r.maxHitCrit;
        }
      }
      if (n) pairs.push({ A, B, n, quoteA: winA / n, t: median(pt) });
    }
    out[g + '|' + L] = { g, L, median: median(times), p10: quant(times, 0.1), p90: quant(times, 0.9), draws: times.filter((t) => t >= T).length, n: times.length, maxHit, maxHitWho, maxCrit, pairs };
  }
  return out;
}

const pathLabel = (id) => { const p = PATHS.find((x) => x[2] === id); return p ? p[3] : id; };
function pvpTables(data, A) {
  const lines = [];
  lines.push('| Ausrüstung | Stufe | Median bis Sieg | 10 % / 90 % | Unentschieden | größter Treffer | größter Krit | Paare über 65 % | höchste Siegquote |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---|');
  for (const x of Object.values(A)) {
    const non = x.pairs.filter((p) => p.A !== p.B);
    const over = non.filter((p) => Math.max(p.quoteA, 1 - p.quoteA) > 0.65);
    const top = non.slice().sort((a, b) => Math.max(b.quoteA, 1 - b.quoteA) - Math.max(a.quoteA, 1 - a.quoteA))[0];
    const tq = top ? (top.quoteA >= 0.5 ? `${pathLabel(top.A)} gegen ${pathLabel(top.B)} ${fmt(top.quoteA * 100)} %` : `${pathLabel(top.B)} gegen ${pathLabel(top.A)} ${fmt((1 - top.quoteA) * 100)} %`) : '–';
    lines.push(`| ${x.g} | ${x.L} | ${fmt(x.median, 1)} s | ${fmt(x.p10, 1)} / ${fmt(x.p90, 1)} s | ${x.draws}/${x.n} | ${fmt(x.maxHit * 100, 1)} % | ${fmt(x.maxCrit * 100, 1)} % | ${over.length}/${non.length} | ${tq} |`);
  }
  return lines.join('\n');
}
// Siegquote je Weg (Durchschnitt gegen alle anderen Wege) und Matrix über alle Stufen und Ausrüstungen
function pvpMatrix(data, A) {
  const ids = PATHS.map((p) => p[2]);
  const agg = {};
  for (const x of Object.values(A)) for (const p of x.pairs) {
    if (p.A === p.B) continue;
    const k = p.A + '|' + p.B;
    (agg[k] = agg[k] || { w: 0, n: 0 });
    agg[k].w += p.quoteA * p.n; agg[k].n += p.n;
  }
  const q = (a, b) => { if (a === b) return null; const x = agg[a + '|' + b]; if (x) return x.w / x.n; const y = agg[b + '|' + a]; return y ? 1 - y.w / y.n : null; };
  const short = (id) => pathLabel(id).replace('Krieger', 'Kr').replace('Ninja', 'Ni').replace('Schamane', 'Sch').replace('Nekromant', 'Nek').replace('Magier', 'Mag').replace(' · ', ' ');
  const lines = ['| Weg (Zeile gewinnt gegen Spalte) | ' + ids.map(short).join(' | ') + ' | Ø |', '|---|' + ids.map(() => '---:').join('|') + '|---:|'];
  for (const a of ids) {
    const vals = ids.map((b) => q(a, b));
    const nn = vals.filter((v) => v != null);
    lines.push(`| ${pathLabel(a)} | ${vals.map((v) => (v == null ? '–' : (v > 0.65 ? '**' : '') + fmt(v * 100) + (v > 0.65 ? '**' : ''))).join(' | ')} | ${fmt(nn.reduce((s, v) => s + v, 0) / nn.length * 100)} |`);
  }
  const over = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const v = q(ids[i], ids[j]); if (v != null && Math.max(v, 1 - v) > 0.65) over.push([ids[i], ids[j], v]); }
  return { table: lines.join('\n'), over, q };
}

async function mainPvp(a) {
  const gears = a.ausrSet ? a.ausr : PVP_GEARS;
  const levels = a.stufenSet ? a.stufen : PVP_LEVELS;
  const seeds = Array.from({ length: a.seeds || 4 }, (_, i) => 101 + i * 7);
  const T = a.pvpZeit || 60;
  const ids = PATHS.filter((p) => !a.wege || a.wege.includes(p[2]));
  const out = a.out || (a.alt ? 'balance-pvp-vorher.json' : 'balance-pvp.json');
  let srv = null;
  let url = a.url;
  if (!url) { const s = await startServer(); srv = s.srv; url = s.url; }
  const browser = await chromium.launch();
  const pages = await Promise.all(Array.from({ length: a.worker }, () => openPage(browser, url)));
  for (const pg of pages) await pg.evaluate((on) => SIM.pvpLegacy(on), !!a.alt);
  // Wertänderungen zum Ausprobieren (--vorschlag-datei, gleiches Format wie VORSCHLAG, z. B. { set: 'PVP_DMG.defMul', v: 1 })
  const vlist = a.vdatei ? JSON.parse(fs.readFileSync(a.vdatei, 'utf8')) : [];
  if (vlist.length) for (const pg of pages) await pg.evaluate((ov) => SIM.applyOverrides(ov), vlist);
  console.log(`[pvp] ${ids.length} Wege, Stufen ${levels.join('/')}, Ausrüstung ${gears.join('/')}, ${seeds.length} Würfe, ${a.alt ? 'ALTE Rechnung (bis 14.14)' : 'neue Rechnung'} · ${a.worker} Seiten`);
  const t0 = Date.now();
  // 1. Angriffsfolgen
  const streams = new Map();
  const sJobs = [];
  for (const g of gears) for (const L of levels) for (const [cls, pa, id] of ids) for (const seed of seeds) sJobs.push({ g, L, cls, pa, id, seed });
  await runJobs(pages, sJobs, async (pg, j) => {
    const r = await pg.evaluate(({ j, gear, T }) => { try { return SIM.pvpStream(j.cls, j.pa, j.L, gear, j.seed, T); } catch (e) { return { err: e.message + ' | ' + (e.stack || '').split('\n').slice(0, 3).join(' | ') }; } }, { j, gear: GEARS[j.g], T });
    if (r.err) console.log(`  ${j.id} L${j.L} ${j.g}: FEHLER ${r.err}`);
    streams.set(`${j.g}|${j.L}|${j.id}|${j.seed}`, r);
  }, 'Angriffe');
  // 2. Verteidigung: jeder Weg gegen jede Angriffsfolge
  const results = [];
  const dJobs = [];
  for (const g of gears) for (const L of levels) for (const [cls, pa, id] of ids) for (const [, , att] of ids) for (const seed of seeds) dJobs.push({ g, L, cls, pa, id, att, seed });
  await runJobs(pages, dJobs, async (pg, j) => {
    const st = streams.get(`${j.g}|${j.L}|${j.att}|${j.seed}`);
    if (!st || st.err) return;
    const r = await pg.evaluate(({ j, gear, st, T }) => { try { return SIM.pvpDefend(j.cls, j.pa, j.L, gear, j.seed + 5000, st.hits, st.snap, T); } catch (e) { return { err: e.message }; } }, { j, gear: GEARS[j.g], st, T });
    if (r.err) { console.log(`  ${j.id} ← ${j.att} L${j.L} ${j.g}: FEHLER ${r.err}`); return; }
    results.push({ gear: j.g, L: j.L, recv: j.id, att: j.att, seed: j.seed, ...r });
  }, 'Duelle');
  await browser.close();
  if (srv) srv.close();
  const data = { when: new Date().toISOString(), alt: !!a.alt, T, gears, levels, seeds, results };
  fs.writeFileSync(out, JSON.stringify(data));
  console.log(`[pvp] fertig in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${out}`);
  pvpReport(data);
}
function pvpReport(data) {
  const A = pvpAnalyse(data);
  console.log('\n' + pvpTables(data, A));
  const M = pvpMatrix(data, A);
  console.log('\nSiegquoten über alle Stufen und Ausrüstungen:\n' + M.table);
  console.log(`\nPaare über 65 %: ${M.over.length}` + (M.over.length ? ' – ' + M.over.map(([x, y, v]) => `${pathLabel(v >= 0.5 ? x : y)} gegen ${pathLabel(v >= 0.5 ? y : x)} ${fmt(Math.max(v, 1 - v) * 100)} %`).join(', ') : ''));
  return { A, M };
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.pvpTabellen) { pvpReport(JSON.parse(fs.readFileSync(a.pvpTabellen, 'utf8'))); return; }
  if (a.pvp) return mainPvp(a);
  if (a.tabellen) {
    const data = JSON.parse(fs.readFileSync(a.tabellen, 'utf8'));
    for (const g of [...new Set(data.results.map((r) => r.gear))]) console.log(`\n### Gesamtwertung (${g})\n\n` + totalsTable(data, g));
    console.log(tables(data));
    return;
  }
  const out = a.out || (a.vorschlag ? 'balance-vorschlag.json' : 'balance-ergebnis.json');
  let srv = null;
  let url = a.url;
  if (!url) { const s = await startServer(); srv = s.srv; url = s.url; }
  const browser = await chromium.launch();
  const jobs = [];
  for (const g of a.ausr) for (const L of a.stufen) for (const [cls, pa, id] of PATHS) if (!a.wege || a.wege.includes(id)) jobs.push({ cls, path: pa, L, gear: g });
  console.log(`[sim] ${jobs.length} Figuren, ${a.worker} Seiten, ${a.vorschlag ? 'MIT Vorschlag' : 'heutiger Stand'} · ${url}`);
  const vlist = a.vdatei ? JSON.parse(fs.readFileSync(a.vdatei, 'utf8')) : VORSCHLAG;
  const results = [];
  const t0 = Date.now();
  let next = 0;
  const work = async (w) => {
    const pg = await openPage(browser, url);
    while (next < jobs.length) {
      const j = jobs[next++];
      const t1 = Date.now();
      const r = await pg.evaluate(({ j, gear, o, ov }) => {
        try {
          SIM.applyOverrides(ov);
          const res = SIM.measure(j.cls, j.path, j.L, gear, o);
          SIM.resetOverrides();
          return res;
        } catch (e) { SIM.resetOverrides(); return { err: e.message + ' | ' + (e.stack || '').split('\n').slice(0, 4).join(' | ') }; }
      }, { j, gear: GEARS[j.gear], o: { kurz: a.kurz, farm: a.farm && j.gear === 'std' }, ov: a.vorschlag ? vlist : [] });
      if (r.err) { console.log(`  ${j.cls}.${j.path} L${j.L} ${j.gear}: FEHLER ${r.err}`); continue; }
      r.gear = j.gear;
      results.push(r);
      console.log(`  [${w}] ${label(j.cls, j.path).padEnd(22)} L${String(j.L).padEnd(3)} ${j.gear}  ST ${fmt(r.single.dps).padStart(7)}  Fl5 ${fmt(r.aoe5.dps).padStart(7)}  Tod ${((r.ttd.capped ? '≥' : '') + fmt(r.ttd.est)).padStart(5)} s  (${((Date.now() - t1) / 1000).toFixed(1)} s)`);
    }
  };
  await Promise.all(Array.from({ length: a.worker }, (_, w) => work(w)));
  await browser.close();
  if (srv) srv.close();
  const data = { when: new Date().toISOString(), vorschlag: a.vorschlag ? vlist : [], weights: WEIGHTS, results };
  fs.writeFileSync(out, JSON.stringify(data, null, 1));
  console.log(`[sim] fertig in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${out}`);
  for (const g of a.ausr) console.log(`\n### Gesamtwertung (${g})\n\n` + totalsTable(data, g));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { PATHS, LEVELS, GEARS, WEIGHTS, VORSCHLAG, score, raw, tables, totalsTable, IN_ARBEIT, survEst, pvpAnalyse, pvpTables, pvpMatrix };
