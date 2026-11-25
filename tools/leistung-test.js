#!/usr/bin/env node
// Seelenstein – Leistungstest (Bildzeiten mit vielen Monstern und Fertigkeiten, Bericht: docs/leistung.md)
//
// Startet einen eigenen kleinen Webserver auf das Repo, öffnet das Spiel in Chromium (Playwright, 3D-Ansicht) und
// misst je Klasse drei Lagen mit echter Bildwiederholung (requestAnimationFrame, keine virtuelle Uhr):
//   leer          – Figur steht auf einer freien Stelle (Monster im Umkreis entfernt)
//   30 Monster    – 30 Monster erscheinen auf einmal um die Figur und greifen an (erstes Bild = „Erscheinen“)
//   + Fertigkeiten – dazu alle Fertigkeiten der Klasse dreimal hintereinander (Abklingzeit jeweils zurückgesetzt)
// Ausgabe je Lage: Bildabstand Ø / 95 % / schlechtestes Bild, Rechenzeit im Spieltakt (frame) Ø und schlechteste,
// Zeichenaufrufe, Dreiecke, Texturen, Geometrien, Shader-Programme, Speicherbereinigungen (Sprünge im JS-Speicher,
// über performance.memory). In Headless-Chromium zeichnet die Software-Grafik (SwiftShader): die absoluten Zahlen
// sind viel höher als auf echter Hardware, es zählen die Verhältnisse (vorher/nachher, leer/voll).
//
// Aufruf (im Repo-Ordner):
//   node tools/leistung-test.js                               alle fünf Klassen, Grafik „ultra“, 1280×720
//   node tools/leistung-test.js --klassen magier,krieger      nur diese Klassen
//   node tools/leistung-test.js --grafik plus --bilder 200    andere Grafikstufe, mehr Bilder je Lage
//   node tools/leistung-test.js --handy                       Handy quer (844×390, 2-fach, Touch), Grafik „mittel“
//   node tools/leistung-test.js --monster ork --gebiet orktal --kamera schulter --json ergebnis.json
//   node tools/leistung-test.js --groesse 960x540                     andere Fenstergröße (Standard 1280×720)
// Optionen: --url <http://…/> (statt des eigenen Servers), --root <repo>, --gpu (echte Grafikkarte statt SwiftShader,
//           nur mit sichtbarem Fenster sinnvoll: --sichtbar)
// Voraussetzung: Node mit Playwright (require('playwright')), Chromium installiert (npx playwright install chromium).

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

const ARGS = process.argv.slice(2);
const arg = (k, def) => { const i = ARGS.indexOf(k); return i >= 0 && ARGS[i + 1] != null && !ARGS[i + 1].startsWith('--') ? ARGS[i + 1] : def; };
const flag = (k) => ARGS.includes(k);
let ROOT = path.resolve(arg('--root', path.join(__dirname, '..')));
const HANDY = flag('--handy');
const CFG = {
  klassen: arg('--klassen', 'krieger,ninja,schamane,nekromant,magier').split(','),
  grafik: arg('--grafik', HANDY ? 'mittel' : 'ultra'),
  kamera: arg('--kamera', 'normal'),
  monster: arg('--monster', 'ork'),
  gebiet: arg('--gebiet', 'orktal'),
  anzahl: +arg('--anzahl', 30),
  bilder: +arg('--bilder', 120),
  fps: arg('--fps', '60'),
  weg: +arg('--weg', 0),
  groesse: arg('--groesse', HANDY ? '844x390' : '1280x720').split('x').map(Number)
};

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

// --- im Browser: Messwerkzeug ----------------------------------------------------------------------
function pageLib() {
  const L = (window.__LT = {});
  // Spieltakt umhüllen: Rechenzeit je Bild und Zähler der Grafik (über alle Durchgänge eines Bildes, auch Grafik Plus)
  const orig = window.frame;
  L.work = [];
  L.gaps = [];
  L.heap = [];
  L.info = null;
  L.rec = false;
  let last = 0;
  window.frame = function (ts) {
    const gl = typeof V3 !== 'undefined' && V3.gl;
    if (gl) { gl.info.autoReset = false; gl.info.reset(); }
    const t0 = performance.now();
    orig(ts);
    const t1 = performance.now();
    if (L.rec) {
      L.work.push(t1 - t0);
      if (last) L.gaps.push(ts - last);
      if (performance.memory) L.heap.push(performance.memory.usedJSHeapSize);
      if (gl) {
        const i = gl.info;
        const r = { calls: i.render.calls, tris: i.render.triangles, tex: i.memory.textures, geo: i.memory.geometries, progs: (i.programs || []).length };
        if (!L.info) L.info = { calls: 0, tris: 0, n: 0, tex: 0, geo: 0, progs: 0 };
        L.info.calls += r.calls; L.info.tris += r.tris; L.info.n++;
        L.info.tex = Math.max(L.info.tex, r.tex); L.info.geo = Math.max(L.info.geo, r.geo); L.info.progs = Math.max(L.info.progs, r.progs);
      }
      if (L.onFrame) L.onFrame();
    }
    last = ts;
  };
  L.start = () => { L.work = []; L.gaps = []; L.heap = []; L.info = null; L.rec = true; };
  L.stop = () => {
    L.rec = false;
    const q = (a, k) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * k))] : 0; };
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    // Speicherbereinigung: der JS-Speicher fällt zwischen zwei Bildern um mehr als 512 KB
    let gc = 0;
    for (let i = 1; i < L.heap.length; i++) if (L.heap[i] < L.heap[i - 1] - 512 * 1024) gc++;
    const inf = L.info || { calls: 0, tris: 0, n: 1, tex: 0, geo: 0, progs: 0 };
    return {
      bilder: L.gaps.length, avg: avg(L.gaps), p95: q(L.gaps, 0.95), worst: Math.max(0, ...L.gaps),
      workAvg: avg(L.work), workP95: q(L.work, 0.95), workMax: Math.max(0, ...L.work), firstWork: L.work[0] || 0, firstGap: L.gaps[0] || 0,
      calls: Math.round(inf.calls / Math.max(1, inf.n)), tris: Math.round(inf.tris / Math.max(1, inf.n)), tex: inf.tex, geo: inf.geo, progs: inf.progs,
      gc, heapMB: L.heap.length ? +(L.heap[L.heap.length - 1] / 1048576).toFixed(1) : null,
      monster: game.monsters.filter((m) => !m.dead && Math.hypot(m.x - game.player.x, m.y - game.player.y) < 900).length,
      effekte: game.effects.length, teilchen: game.particles.length
    };
  };
  // n Bilder abwarten (echte Bildwiederholung)
  L.frames = (n) => new Promise((res) => { let k = 0; const f = () => { if (++k >= n) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  // Figur der Stufe 80 mit allen Fertigkeiten anlegen und an eine freie Stelle im Gebiet setzen
  L.setup = (cls, weg, gebiet) => {
    const s = newCharacter('Messung', cls, weg);
    Object.assign(s, { level: 80, xp: 0, gold: 1000, skillLevels: [40, 40, 40, 40, 40], skillPoints: 0, statPoints: 0, potions: { hp: 0, mp: 0 }, daily: { day: new Date().toISOString().slice(0, 10), claimed: true, streak: 1 } });
    startGame(s, 0);
    try { ui.closePanels(); } catch (e) {}
    clearTimeout(ui.dailyTimer);
    const z = ZONES.find((q) => q.id === gebiet) || ZONES[0];
    let sp = null;
    for (let k = 0; k < 80 && !sp; k++) {
      const c = randomSpotInZone(z, 0.3, 0.6);
      if (!c) continue;
      let ok = true;
      for (let dy = -4; dy <= 4 && ok; dy++) for (let dx = -4; dx <= 4 && ok; dx++) if (tileBlocked(Math.floor(c.x / TILE) + dx, Math.floor(c.y / TILE) + dy)) ok = false;
      if (ok) sp = c;
    }
    const p = game.player;
    if (sp) { p.x = sp.x; p.y = sp.y; }
    input.walkTo = null;
    L.god();
    // freie Bühne: Monster im Umkreis weg
    const keep = game.monsters.filter((m) => Math.hypot(m.x - p.x, m.y - p.y) > 900);
    game.monsters.length = 0;
    for (const m of keep) game.monsters.push(m);
    return { x: Math.round(p.x), y: Math.round(p.y), zone: z.id };
  };
  // unverwundbar und volles Mana (nur für die Messung)
  L.god = () => {
    const p = game.player;
    if (!p) return;
    if (p.dead) p.dead = false;
    p.hp = game.stats.maxHp;
    p.mp = game.stats.maxMp;
  };
  L.spawn = (type, n) => {
    const p = game.player;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const d = 100 + (k % 3) * 30;
      const m = createMonster(type, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.8, { level: MONSTER_TYPES[type].level, respawn: false, zone: zoneAt(p.x, p.y) });
      game.monsters.push(m);
      if (typeof aggro === 'function') aggro(m, p);
      else { m.state = 'chase'; m.target = p; }
    }
  };
  L.cast = (i) => {
    const p = game.player;
    const sk = classSkills(p)[i];
    if (!sk) return;
    p.skillCd[i] = 0;
    p.gcdUntil = 0;
    p.mp = game.stats.maxMp;
    const t = game.monsters.find((m) => !m.dead && Math.hypot(m.x - p.x, m.y - p.y) < 300);
    if (t) game.target = t;
    try {
      if (sk.aim) {
        const pt = t ? { x: t.x, y: t.y, r: 0 } : skillAimPoint(sk);
        game.aim = { i, sk, pt, until: game.time + 5, go: true };
        useSkill(i);
        if (game.aim && game.aim.fx) game.aim.fx.dur = 0;
        if (game.aim && game.aim.rangeFx) game.aim.rangeFx.dur = 0;
        game.aim = null;
        document.body.classList.remove('aiming');
      } else useSkill(i);
    } catch (e) { console.warn('Fertigkeit', i, e.message); }
  };
}

async function measureClass(browser, url, cls) {
  const ctx = await browser.newContext(HANDY
    ? { viewport: { width: CFG.groesse[0], height: CFG.groesse[1] }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: CFG.groesse[0], height: CFG.groesse[1] }, deviceScaleFactor: 1 });
  await ctx.route('**/sw.js', (r) => r.fulfill({ status: 404, body: '' }));
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => console.log('  [Seitenfehler]', e.message));
  await pg.addInitScript((c) => {
    localStorage.setItem('seelenstein.optionen', JSON.stringify({ view: '3d', graphics: c.grafik, camera: c.kamera, fps: c.fps, optsVer: 3, sound: false, music: false, volume: 0, musicVol: 0, numbers: true, names: true, shake: true, vibrate: false }));
    localStorage.setItem('seelenstein.tipps', '1');
  }, CFG);
  await pg.goto(url, { timeout: 300000 });
  await pg.waitForFunction(() => typeof startGame === 'function' && typeof game !== 'undefined' && game.world && typeof frame === 'function', null, { timeout: 180000 });
  await pg.addScriptTag({ content: '(' + pageLib.toString() + ')();' });
  const out = { klasse: cls };
  out.ort = await pg.evaluate(([c, w, g]) => __LT.setup(c, w, g), [cls, CFG.weg, CFG.gebiet]);
  // Unverwundbar je Bild; Anpassung der Bildqualität aus (sonst misst jede Lage eine andere Auflösung)
  await pg.evaluate(() => { __LT.onFrame = __LT.god; quality.pauseUntil = 1e15; });
  // Welt aufbauen und vorwärmen lassen (Kartenblöcke, Shader, Modelle der Monster dieser Karte)
  await pg.evaluate(() => { __LT.rec = true; __LT.onFrame = __LT.god; });
  await pg.evaluate(() => __LT.frames(240));
  // leer
  await pg.evaluate(() => __LT.start());
  await pg.evaluate((n) => __LT.frames(n), CFG.bilder);
  out.leer = await pg.evaluate(() => __LT.stop());
  // 30 Monster erscheinen
  await pg.evaluate(([t, n]) => { __LT.start(); __LT.spawn(t, n); }, [CFG.monster, CFG.anzahl]);
  await pg.evaluate((n) => __LT.frames(n), CFG.bilder);
  out.monster = await pg.evaluate(() => __LT.stop());
  // dazu alle Fertigkeiten dreimal (je Fertigkeit ein paar Bilder Abstand)
  await pg.evaluate(() => __LT.start());
  const n = await pg.evaluate(() => classSkills(game.player).length);
  const per = Math.max(4, Math.floor(CFG.bilder / (3 * n)));
  for (let r = 0; r < 3; r++) for (let i = 0; i < n; i++) {
    await pg.evaluate((i) => { __LT.cast(i); __LT.god(); }, i);
    await pg.evaluate((k) => __LT.frames(k), per);
  }
  out.kampf = await pg.evaluate(() => __LT.stop());
  out.version = await pg.evaluate(() => GAME_VERSION);
  await ctx.close();
  return out;
}

const f1 = (v) => (v == null ? '–' : (+v).toFixed(1));
function table(results) {
  const rows = [];
  rows.push('| Klasse | Lage | Bild Ø | 95 % | schlechtestes | Rechnen Ø | Rechnen max | Aufrufe | Dreiecke | Texturen | Geom. | Progr. | GC |');
  rows.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const r of results) {
    for (const [k, lab] of [['leer', 'leer'], ['monster', CFG.anzahl + ' ' + CFG.monster], ['kampf', '+ Fertigkeiten 3×']]) {
      const x = r[k];
      if (!x) continue;
      rows.push(`| ${r.klasse} | ${lab} | ${f1(x.avg)} | ${f1(x.p95)} | ${f1(x.worst)} | ${f1(x.workAvg)} | ${f1(x.workMax)} | ${x.calls} | ${x.tris.toLocaleString('de-DE')} | ${x.tex} | ${x.geo} | ${x.progs} | ${x.gc} |`);
    }
    rows.push(`| ${r.klasse} | Erscheinen (1. Bild) | | | ${f1(r.monster.firstGap)} | ${f1(r.monster.firstWork)} | | | | | | | |`);
  }
  return rows.join('\n');
}

(async () => {
  let srv = null;
  let url = arg('--url', null);
  if (!url) { srv = await startServer(); url = srv.url; }
  const launch = flag('--gpu') ? { headless: !flag('--sichtbar'), args: ['--enable-precise-memory-info', '--ignore-gpu-blocklist', '--enable-gpu'] }
    : { headless: !flag('--sichtbar'), args: ['--enable-precise-memory-info', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] };
  const browser = await chromium.launch(launch);
  console.log(`Leistungstest: ${CFG.klassen.join(', ')} · Grafik ${CFG.grafik} · Kamera ${CFG.kamera} · ${CFG.anzahl}× ${CFG.monster} · ${CFG.bilder} Bilder je Lage${HANDY ? ' · Handy' : ''}`);
  const results = [];
  for (const cls of CFG.klassen) {
    const t0 = Date.now();
    try {
      const r = await measureClass(browser, url, cls);
      results.push(r);
      console.log(`  ${cls}: fertig in ${((Date.now() - t0) / 1000).toFixed(0)} s (Version ${r.version})`);
    } catch (e) {
      console.log(`  ${cls}: Fehler ${e.message}`);
    }
  }
  console.log('\n' + table(results));
  const json = arg('--json', null);
  if (json) fs.writeFileSync(json, JSON.stringify({ cfg: CFG, handy: HANDY, results }, null, 1));
  await browser.close();
  if (srv) srv.srv.close();
})();
