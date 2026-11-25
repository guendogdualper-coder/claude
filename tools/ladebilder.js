#!/usr/bin/env node
// Ladebilder aus dem Spiel (docs/werbung-ladebilder.md): rendert Szenen in 3D „Hoch“ ohne Bedienoberfläche mit freier
// Kamera und legt sie als bilder/lade-<name>.webp (2560 × 1440) ab. Das Ladebild (kartenladen.js, MAPLOAD_BILDER)
// und die Werbung in der Fassung „szenen“ (werbung.js, WERBUNG_SZENEN) zeigen dieselben Dateien.
//
// Aufruf (im Repo-Hauptordner):
//   node tools/ladebilder.js                         alle Szenen
//   node tools/ladebilder.js stadt,arena             nur diese
//   node tools/ladebilder.js stadt --probe           Probebild 960 × 540 als JPEG nach ./ladebild-proben (schnell)
// Optionen: --qualitaet 0.8 (WebP), --ziel <ordner> (statt bilder/)
// Voraussetzung: Node mit Playwright (Chromium). Gezeichnet wird in Software (SwiftShader): je Szene einige Minuten.
//
// Ablauf je Szene: Figur der Stufe 80 (legendäre +20-Ausrüstung) an den Ort setzen, warten bis die Karte gebaut ist,
// Tag erzwingen (dayNight.force), Szene herrichten (vorher), dann einige Schritte (schritt) mit Bildern dazwischen
// – Fertigkeiten wirken, Bots heranholen, Drache fliegen lassen – in einfacher Auflösung (schneller), zuletzt drei
// Bilder in voller Auflösung und ein Bildschirmfoto, auf dem nur die 3D-Fläche sichtbar ist (keine Namen, Balken,
// Wegweiser, Fenster). WebP-Qualität je Szene (qualitaet) oder --qualitaet.
// Die freie Kamera hängt sich hinter v3PlaceCamera (drei-kern.js): Ziel (Kacheln, Höhe in Einheiten), Richtung yaw
// (0 = Kamera im Süden), Neigung pitch, Abstand dist, Sichtwinkel fov.
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ARGS = process.argv.slice(2);
const arg = (k, d) => { const i = ARGS.indexOf(k); return i >= 0 && ARGS[i + 1] != null ? ARGS[i + 1] : d; };
const PROBE = ARGS.includes('--probe');
const NUR = (ARGS[0] && !ARGS[0].startsWith('--') ? ARGS[0] : '').split(',').filter(Boolean);
const QUAL = +arg('--qualitaet', 0.8);
const ZIEL = path.resolve(arg('--ziel', PROBE ? path.join(process.cwd(), 'ladebild-proben') : path.join(ROOT, 'bilder')));
const VULKAN = { x: 902.5, y: 737.5 }; // Vulkan im Lavasee des Feuerbergs (Wahrzeichen, wahrzeichen.js)

// --- Szenen -----------------------------------------------------------------------------------------------------
// ort: [Kachel x, y] der Figur (lädt die Karte), klasse/weg: Figur, nacht: 0 … 1 (0 = heller Tag)
const SZENEN = {
  kristallabgrund: {
    ort: [265, 727],
    vorher: () => {
      // Kristallhänge: die Stelle mit den meisten Kristallgruppen und Felsen am Abgrund (schwebende Drusen), Blick
      // über die Kristalle hinweg zum Abgrund
      const s = __LB.suche({ karte: 10, cx: 265, cy: 730, min: 18, max: 62, obj: { DEADTREE: 3, ROCK: 2 }, boden: { ABGRUND: 0.6 }, bodenMin: 25 });
      if (!s) return { fehler: 'keine Stelle' };
      __LB.hin(s.x, s.y);
      return { cam: { tx: s.x + s.rx * 5, ty: 1.2, tz: s.y + s.ry * 5, yaw: Math.atan2(-s.rx, -s.ry) + 0.35, pitch: 0.3, dist: 16, fov: 46 } };
    },
    bilder: 24
  },
  lichtwacht: {
    ort: [265, 727],
    cam: { tx: 265.5, ty: 7.2, tz: 718, yaw: -0.5, pitch: 0.22, dist: 19, fov: 42 },
    bilder: 16
  },
  stadt: {
    ort: [180, 186],
    vorher: () => {
      // Vögel fast anhalten (sonst fliegen sie weiter, bis das Bild fertig ist); die Kamera steht hoch über dem Rand
      // des Platzes, ausgerichtet nach dem äußeren Schwarm, und schaut über die Stadt – die Schwärme kreisen darüber
      // (die Uhr der Wahrzeichen ist eine eigene: ab dem ersten Aufruf läuft sie für die Vögel hundertmal langsamer)
      // Schwärme: Gruppen über der Stadtmitte in 6,6 / 7,4 / 8,2 Einheiten Höhe (wzVoegel in wahrzeichen.js)
      const an = WZ.anims.filter((a) => a.site && Math.abs(a.site.position.x - 180.5) < 0.6 && Math.abs(a.site.position.z - 180.5) < 0.6 && a.y > 6.4 && a.y < 8.4)
        .sort((a, b) => a.y - b.y);
      if (an.length < 3) return { fehler: 'keine Vögel (' + an.length + ')' };
      for (const a of an) if (!a.__orig) { let t0 = null; a.__orig = a.fn; a.fn = (o, t) => { if (t0 === null) t0 = t; a.__orig(o, t0 + (t - t0) * 0.01); }; }
      const g = an[2].g;
      g.updateMatrixWorld(true);
      const v = g.localToWorld(new THREE.Vector3(11.7, 0.35, -1.1));
      const ox = v.x - 180.5;
      const oz = v.z - 180.5;
      const l = Math.hypot(ox, oz) || 1;
      const cam = { x: v.x + (ox / l) * 4.5, y: v.y + 0.8, z: v.z + (oz / l) * 4.5 };
      const tgt = { x: 180.5, y: 2.5, z: 180.5 };
      const h = Math.hypot(cam.x - tgt.x, cam.z - tgt.z);
      return { cam: { tx: tgt.x, ty: tgt.y, tz: tgt.z, yaw: Math.atan2(cam.x - tgt.x, cam.z - tgt.z), pitch: Math.atan2(cam.y - tgt.y, h), dist: Math.hypot(h, cam.y - tgt.y), fov: 50 } };
    },
    qualitaet: 0.74,
    bilder: 16
  },
  winter: {
    ort: [650, 503],
    vorher: () => {
      // Frostgipfel: viele Tannen und Felsen an Eis oder Wasser, Blick über das Eis
      const s = __LB.suche({ karte: 7, cx: 650, cy: 495, min: 16, max: 70, obj: { PINE: 3, ROCK: 1 }, boden: { ICE: 0.5, WATER: 0.5 }, bodenMin: 20 });
      if (!s) return { fehler: 'keine Stelle' };
      __LB.hin(s.x, s.y);
      return { cam: { tx: s.x + s.rx * 4, ty: 1, tz: s.y + s.ry * 4, yaw: Math.atan2(-s.rx, -s.ry) + 0.3, pitch: 0.3, dist: 22, fov: 46 } };
    },
    bilder: 20
  },
  feuerberg: {
    ort: [895, 815],
    cam: { tx: VULKAN.x, ty: 3, tz: VULKAN.y + 4, yaw: 0.35, pitch: 0.3, dist: 34, fov: 44 },
    vorher: () => { __LB.hin(902, 770); },
    bilder: 24
  },
  drache: {
    ort: [895, 815], klasse: 'krieger',
    vorher: () => {
      const p = game.player;
      p.horse = true; p.horseTier = 3; p.lastCombat = -99;
      const V = __LB.vulkan;
      __LB.hin(Math.round(V.x) - 22, Math.round(V.y) + 16);
      // Monster in der Nähe weg (sonst greifen sie den Reiter an: Warnflächen im Bild)
      __LB.monsterWeg(18);
      toggleRide(true);
      // die Kamera folgt dem Reiter: schräg von vorn rechts, etwas darüber
      return { cam: { folgen: true, ty: 4.4, yaw: 1.05, pitch: 0.2, dist: 9.5, fov: 46 } };
    },
    schritte: 4,
    schritt: () => {
      const p = game.player;
      // nach dem Versetzen setzt das Spiel die Flughöhe auf „tief“ zurück – darum hier (wieder) steigen
      if (!p.flyHigh) setFlyHigh(true);
      input.walkTo = { x: (__LB.vulkan.x + 30) * TILE, y: (__LB.vulkan.y - 4) * TILE };
    },
    bilder: 10
  },
  endboss: {
    ort: [895, 815], klasse: 'magier', weg: 'feuer',
    vorher: () => {
      const c = __LB.nahFrei(__LB.vulkan.x - 10, __LB.vulkan.y + 22, 4);
      __LB.hin(c.x - 3, c.y + 7);
      const b = __LB.monster('azaroth', c.x, c.y);
      __LB.boss = b;
      if (typeof aggro === 'function') aggro(b, game.player); else { b.state = 'chase'; b.target = game.player; }
      return { cam: { tx: c.x + 0.5, ty: 3.6, tz: c.y + 3.5, yaw: 0.55, pitch: 0.24, dist: 22, fov: 44 } };
    },
    schritte: 4,
    schritt: (i) => { __LB.cast(i % 5, __LB.boss); },
    bilder: 8
  },
  arena: {
    ort: [180, 184], klasse: 'magier', weg: 'feuer',
    vorher: () => {
      if (!abotStart('r3')) return { fehler: 'abotStart' };
      return {};
    },
    schritte: 4,
    schritt: (i) => {
      const p = game.player;
      const R = typeof abot !== 'undefined' ? abot.run : null;
      if (!R) return;
      if (R.state === 'count') R.fightAt = Math.min(R.fightAt, game.time);
      if (i === 0) {
        // alle in die Mitte der Halle holen: die eigene Figur zwischen ihre Mitspieler, die Gegner 4–6 Kacheln davor
        const me = R.units.find((u) => u.pid === 'me');
        const foe = R.units.find((u) => u.team !== R.team);
        const mx = (me.e.x + foe.e.x) / 2;
        const my = (me.e.y + foe.e.y) / 2;
        const dir = Math.sign(foe.e.x - me.e.x) || 1;
        p.x = mx - dir * 3 * TILE;
        p.y = my + 1.5 * TILE;
        let a = 0;
        let f = 0;
        for (const u of R.units) {
          if (u.pid === 'me') continue;
          const feind = u.team !== R.team;
          const k = feind ? f++ : a++;
          u.e.x = u.e.tx = feind ? mx + dir * (2 + k * 1.2) * TILE : p.x - dir * 1.5 * TILE;
          u.e.y = u.e.ty = feind ? my + (k - 1) * 2.2 * TILE : p.y + (k ? 2 : -2) * TILE;
          if (u.b && u.b.last) { u.b.last.x = u.e.x; u.b.last.y = u.e.y; }
        }
        if (typeof abotSyncFigs === 'function') abotSyncFigs();
      }
      // Fertigkeiten auf einen Gegner (Stellvertreter zum Zielen wie bei echten Spielern)
      const fu = R.units.find((u) => u.team !== R.team && u.alive && u.b);
      if (i >= 1) __LB.cast((i + 1) % 5, fu && fu.b.px && fu.b.px.x != null ? fu.b.px : null);
      __LB.cam = { tx: p.x / TILE + Math.sign(R.units.find((u) => u.team !== R.team).e.x - p.x) * 2.5, ty: 1.2, tz: p.y / TILE, yaw: 0.6, pitch: 0.42, dist: 17, fov: 44 };
    },
    bilder: 8
  }
};

// --- im Browser ---------------------------------------------------------------------------------------------------
// Achtung: vorher/schritt laufen in der Seite – dort gibt es nur die Spielvariablen und __LB (nicht die Werte oben)
function seitenHelfer() {
  const L = (window.__LB = {});
  L.vulkan = { x: 902.5, y: 737.5 }; // wie VULKAN oben
  L.frames = (n) => new Promise((res) => { let k = 0; const f = () => { if (++k >= n) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  L.figur = (cls, weg) => {
    if (typeof weg === 'string') weg = Math.max(0, CLASSES[cls].paths.findIndex((x) => x.id === weg));
    const s = newCharacter('Aelin', cls, weg || 0);
    Object.assign(s, { level: 80, xp: 0, gold: 5e7, skillLevels: [40, 40, 40, 40, 40], skillPoints: 0, statPoints: 0, faction: 'licht', daily: { day: new Date().toISOString().slice(0, 10), claimed: true, streak: 1 } });
    startGame(s, 0);
    try { ui.closePanels(); } catch (e) { /* egal */ }
    clearTimeout(ui.dailyTimer);
    const p = game.player;
    const kinds = { krieger: 'sword', ninja: 'dagger', schamane: 'fan', nekromant: 'staff', magier: 'rod' };
    for (const sl of ['waffe', 'ruestung', 'helm', 'schultern', 'umhang', 'schuhe', 'guertel']) {
      const it = makeItem(sl, ITEM_TIERS.length - 1, 0, cls, sl === 'waffe' ? kinds[cls] : null);
      it.rarity = 4; it.plus = 20;
      p.equipment[sl] = it;
    }
    if (cls === 'krieger') { const sh = makeItem('schild', ITEM_TIERS.length - 1, 0, 'krieger'); sh.rarity = 4; sh.plus = 20; p.equipment.schild = sh; }
    game.stats = playerStats(p);
    p.hp = game.stats.maxHp; p.mp = game.stats.maxMp;
    window.damagePlayer = () => {};
    quality.pauseUntil = 1e15;
    renderer.maxDpr = gfx().dpr;
  };
  // Oberfläche aus: nur die 3D-Fläche bleibt (Namen, Balken und Wegweiser liegen auf der 2D-Fläche darüber)
  L.ohneOberflaeche = () => {
    if (!document.getElementById('lbOhneUi')) {
      const st = document.createElement('style');
      st.id = 'lbOhneUi';
      st.textContent = 'body > *:not(#welt3d):not(script):not(style) { visibility: hidden !important; }';
      document.head.append(st);
    }
    opts.names = false; opts.numbers = false; opts.selfBar = false;
  };
  L.hin = (tx, ty) => {
    const p = game.player;
    p.x = tx * TILE + TILE / 2; p.y = ty * TILE + TILE / 2;
    p.dash = null; p.leap = null; game.target = null;
    input.walkTo = null;
  };
  // Auflösung der 3D-Fläche: zum Einschwingen einfach (schnell), fürs Bild die der Grafikstufe (doppelt)
  L.aufloesung = (d) => {
    renderer.maxDpr = d;
    renderer.resizeDue = true;
  };
  L.geladen = () => !(typeof MAPLOAD !== 'undefined' && MAPLOAD.on) && !(typeof FULL3 !== 'undefined' && FULL3.loading);
  L.nahFrei = (x, y, R) => {
    for (let r = 0; r < 40; r++) for (let a = 0; a < Math.max(1, r * 6); a++) {
      const w = (a / Math.max(1, r * 6)) * Math.PI * 2;
      const cx = Math.round(x + Math.cos(w) * r);
      const cy = Math.round(y + Math.sin(w) * r);
      let ok = true;
      for (let dy = -R; dy <= R && ok; dy++) for (let dx = -R; dx <= R && ok; dx++) if (tileBlocked(cx + dx, cy + dy)) ok = false;
      if (ok) return { x: cx, y: cy };
    }
    return { x: Math.round(x), y: Math.round(y) };
  };
  // schöne Stelle suchen: Fenster von 15 × 15 Kacheln um (x, y) im Abstand min … max von der Stadt (cx, cy), Punkte je
  // Objekt bzw. Boden (obj/boden: { NAME: Gewicht }), die Mitte muss frei sein. Liefert die Stelle und die Richtung zum
  // Schwerpunkt des Bodens mit Gewicht (z. B. zum Abgrund oder Eis) – dorthin schaut die Kamera.
  L.suche = (o) => {
    const w = game.world;
    const [rx, ry, rw, rh] = WORLD_MAPS.find((m) => m.id === o.karte).region;
    let best = null;
    for (let y = ry + 12; y < ry + rh - 12; y += 3) for (let x = rx + 12; x < rx + rw - 12; x += 3) {
      const d = Math.hypot(x - o.cx, y - o.cy);
      if (d < o.min || d > o.max || tileBlocked(x, y)) continue;
      let pkt = 0, bx = 0, by = 0, bn = 0;
      for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
        const i = (y + dy) * MAP_W + (x + dx);
        for (const [k, g] of Object.entries(o.obj || {})) if (w.obj[i] === OBJ[k]) pkt += g;
        for (const [k, g] of Object.entries(o.boden || {})) if (w.ground[i] === GROUND[k]) { pkt += g; bx += dx; by += dy; bn++; }
      }
      if (o.bodenMin && bn < o.bodenMin) continue;
      if (!best || pkt > best.pkt) best = { x, y, pkt, rx: bn ? bx / bn : 0, ry: bn ? by / bn : 1 };
    }
    if (!best) return null;
    const l = Math.hypot(best.rx, best.ry) || 1;
    best.rx /= l;
    best.ry /= l;
    return best;
  };
  L.monsterWeg = (r) => {
    const p = game.player;
    const bleiben = game.monsters.filter((m) => Math.hypot(m.x - p.x, m.y - p.y) > r * TILE);
    game.monsters.length = 0;
    for (const m of bleiben) game.monsters.push(m);
  };
  L.monster = (type, tx, ty) => {
    const m = createMonster(type, tx * TILE, ty * TILE, { level: MONSTER_TYPES[type].level, respawn: false, zone: zoneAt(tx * TILE, ty * TILE) });
    game.monsters.push(m);
    return m;
  };
  L.cast = (i, t) => {
    const p = game.player;
    const sk = classSkills(p)[i];
    if (!sk) return;
    p.skillCd[i] = 0; p.gcdUntil = 0; p.mp = game.stats.maxMp;
    t = t || game.monsters.find((m) => !m.dead && Math.hypot(m.x - p.x, m.y - p.y) < 400);
    if (t) game.target = t;
    try {
      if (sk.aim) {
        game.aim = { i, sk, pt: t ? { x: t.x, y: t.y, r: 0 } : skillAimPoint(sk), until: game.time + 5, go: true };
        useSkill(i);
        if (game.aim && game.aim.fx) game.aim.fx.dur = 0;
        if (game.aim && game.aim.rangeFx) game.aim.rangeFx.dur = 0;
        game.aim = null;
        document.body.classList.remove('aiming');
      } else useSkill(i);
    } catch (e) { /* egal */ }
  };
  L.cam = null;
  const orig = v3PlaceCamera;
  v3PlaceCamera = function (fx, fy, dt) {
    orig(fx, fy, dt);
    const c = L.cam;
    if (!c) return;
    const cam = V3.camera;
    if (cam.fov !== (c.fov || 40)) { cam.fov = c.fov || 40; cam.updateProjectionMatrix(); }
    const cp = Math.cos(c.pitch);
    const tx = c.folgen ? fx * U3 : c.tx;
    const tz = c.folgen ? fy * U3 : c.tz;
    cam.position.set(tx + Math.sin(c.yaw) * cp * c.dist, c.ty + Math.sin(c.pitch) * c.dist, tz + Math.cos(c.yaw) * cp * c.dist);
    cam.lookAt(tx, c.ty, tz);
    cam.updateMatrixWorld();
    V3.camDist = c.dist;
    v3FitSun();
  };
}

// --- Ablauf -------------------------------------------------------------------------------------------------------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
function server() {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, path.normalize(p));
      if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(f, (e, d) => {
        if (e) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
        res.end(d);
      });
    });
    srv.listen(0, '127.0.0.1', () => ok({ srv, url: `http://127.0.0.1:${srv.address().port}/` }));
  });
}

(async () => {
  fs.mkdirSync(ZIEL, { recursive: true });
  const { srv, url } = await server();
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext(PROBE ? { viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  await ctx.route('**/sw.js', (r) => r.fulfill({ status: 404, body: '' }));
  await ctx.route((u) => !u.href.startsWith(url) && !/^(data|blob):/.test(u.href), (r) => r.abort());
  const pg = await ctx.newPage();
  const fehler = [];
  pg.on('pageerror', (e) => fehler.push(e.message));
  await pg.addInitScript(() => {
    localStorage.setItem('seelenstein.optionen', JSON.stringify({ optsVer: 5, view: '3d', graphics: 'hoch', camera: 'normal', fog: 'wenig', leistung: 'max', fps: '60', music: false, volume: 0, names: false, numbers: false, shake: false, vibrate: false, lang: 'de' }));
    localStorage.setItem('seelenstein.tipps', '1');
    localStorage.setItem('seelenstein.einfuehrung', '1');
  });
  await pg.goto(url, { timeout: 300000, waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof startGame === 'function' && game.world && typeof v3PlaceCamera === 'function', null, { timeout: 300000 });
  await pg.addScriptTag({ content: '(' + seitenHelfer.toString() + ')();' });
  // Bildwandler (WebP) auf einer leeren Seite – unabhängig von den Regeln der Spielseite
  const wandler = await ctx.newPage();
  let figur = '';
  for (const [name, sz] of Object.entries(SZENEN)) {
    if (NUR.length && !NUR.includes(name)) continue;
    const t0 = Date.now();
    // neue Figur nur bei anderer Klasse (startGame baut die Karte neu); sonst dieselbe weiterverwenden
    const wer = (sz.klasse || 'krieger') + ':' + (sz.weg == null ? 0 : sz.weg);
    if (wer !== figur) await pg.evaluate(([c, w]) => __LB.figur(c, w), [sz.klasse || 'krieger', sz.weg == null ? 0 : sz.weg]);
    figur = wer;
    await pg.evaluate(() => { __LB.cam = null; __LB.ohneOberflaeche(); });
    await pg.evaluate(([x, y]) => __LB.hin(x, y), sz.ort);
    await new Promise((r) => setTimeout(r, 800));
    await pg.waitForFunction(() => __LB.geladen(), null, { timeout: 600000, polling: 500 }).catch(() => console.log(name, ': Karte lädt sehr lange'));
    await pg.evaluate((n) => { if (typeof dayNight !== 'undefined') dayNight.force = n || 0; __LB.aufloesung(1); }, sz.nacht || 0);
    let cam = sz.cam || null;
    if (sz.vorher) {
      const r = await pg.evaluate(sz.vorher);
      if (r && r.fehler) { console.log(name, ': übersprungen –', r.fehler); continue; }
      if (r && r.cam) cam = r.cam;
    }
    if (cam) await pg.evaluate((c) => { __LB.cam = c; }, cam);
    for (let i = 0; i < (sz.schritte || 1); i++) {
      if (sz.schritt) await pg.evaluate(sz.schritt, i);
      await pg.evaluate((n) => __LB.frames(n), sz.bilder || 12);
    }
    // erst jetzt volle Auflösung: wenige Bilder in 2560 × 1440 (Software-Grafik ist langsam)
    await pg.evaluate(() => { __LB.aufloesung(gfx().dpr); return __LB.frames(3); });
    const png = await pg.screenshot({ timeout: 600000 });
    const datei = path.join(ZIEL, `lade-${name}.${PROBE ? 'jpg' : 'webp'}`);
    const daten = await wandler.evaluate(async ([b64, typ, q, w, h]) => {
      const im = new Image();
      im.src = 'data:image/png;base64,' + b64;
      await im.decode();
      const c = document.createElement('canvas');
      c.width = w || im.naturalWidth;
      c.height = h || im.naturalHeight;
      const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(im, 0, 0, c.width, c.height);
      return c.toDataURL(typ, q).split(',')[1];
    }, [png.toString('base64'), PROBE ? 'image/jpeg' : 'image/webp', PROBE ? 0.72 : sz.qualitaet || QUAL, PROBE ? 960 : 2560, PROBE ? 540 : 1440]);
    fs.writeFileSync(datei, Buffer.from(daten, 'base64'));
    console.log(`${name}: ${datei} · ${Math.round(fs.statSync(datei).size / 1024)} KB · ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  if (fehler.length) console.log('Seitenfehler:', fehler.slice(0, 5));
  await b.close();
  srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
