#!/usr/bin/env node
// Seelenstein – Prüfwerkzeug für die Brücken aller Karten (seit 14.74, Bericht: docs/bruecken-74.md)
//
// Lädt das Spiel mit dem ECHTEN Spielcode im Browser (Playwright, headless Chromium, 2D-Ansicht), erzeugt die Welt wie
// jeder Spieler und prüft jede Brücke jeder Karte (zusammenhängende Brückenkacheln = eine Brücke):
//   schwebend  Ende einer Fahrspur liegt über Flüssigkeit/Abgrund statt auf Land (das „Stück, das nicht am Boden ist“)
//   insNichts  auf einer Seite erreicht keine Spur das Land (Brücke führt ins Leere)
//   hindernis  Spurende stößt an Baum, Mauer, Haus oder Felsrand
//   luecke     schwebendes Ende, und 1–3 Kacheln weiter geht eine andere Brücke weiter
//   quer       Kachel liegt quer zur Richtung, in der die Brücke das Gewässer überspannt
//   ecke       (nur zur Info, kein Fehler) Kacheln an einem Knick L-förmiger Dämme – seit 14.74 zeichnet 3D den
//              Knick ohne Geländer quer über den Weg
//   zacken     die Enden der Spuren einer Seite liegen mehr als 1 Kachel auseinander (ausgefranste Enden)
//   aufLand    Brückenkachel ohne Flüssigkeit darunter
//   doppelt    zwei Brücken verbinden dieselben beiden Landstücke dicht nebeneinander (Mitte < 16 Kacheln)
//   eng        zwei gleich gerichtete Brücken liegen parallel dicht nebeneinander (< 6 Kacheln), auch ohne gleiches Land
//   sinnlos    Brücke verbindet nur ein Landstück mit sich selbst und der Weg zu Fuß drumherum ist kaum länger
//              (höchstens Länge + 12, bei kleinen Stücken bis 24 Kacheln höchstens 2 · Länge + 14), oder führt nirgendwohin
// Dazu zwei Werte für das 3D-Bild (aus dem Code, der die Brücke zeichnet):
//   ohneAuflager  Kanten Brücke → Land ohne Auflager: dort hängt das Ende über der abfallenden Uferkante in der Luft
//                 (bis 14.73 jede Kante; seit 14.74 setzt bridge3Tile an jede Kante zum Land ein Widerlager)
//   innenGelaender  Geländer zwischen zwei Brückenkacheln (bis 14.73 bekam jede Kachel beidseits ein Geländer – eine
//                 breite Brücke sah aus wie mehrere schmale nebeneinander; seit 14.74 nur an Kanten zum Abgrund)
// Brücken in den Städten (Raster der Stadt) werden mitgeprüft, aber getrennt gezählt (sie gehören zum Grundriss).
// Dazu läuft mapFormReport (Erreichbarkeit) mit.
//
// Aufruf (im Repo-Ordner):
//   node tools/bruecken-pruefung.js                       eigener Webserver auf das Repo, Bericht in der Konsole
//   node tools/bruecken-pruefung.js --url http://localhost:8792/ --json ergebnis.json [--liste] [--karte 5]
// --liste druckt jede Brücke mit Befund, --karte nur diese Karte(n) (Komma-Liste).
// Im Spiel selbst: Inhalt von bridgeAudit (unten) in die Konsole kopieren und bridgeAudit() aufrufen.

const fs = require('fs');
const path = require('path');
const http = require('http');

// --- Browser-Teil: läuft im Spiel ---------------------------------------------------------------------------------
function bridgeAudit() {
  const w = game.world;
  const out = [];
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const wm of WORLD_MAPS) {
    const [rx, ry, rw, rh] = wm.region;
    const mp = w.maps.find((m) => m.id === wm.id);
    const tcx = mp ? mp.cx : wm.cx;
    const tcy = mp ? mp.cy : wm.cy;
    const half = wm.id === 1 ? VILLAGE_HALF : townLayoutHalf(wm.id) != null ? townLayoutHalf(wm.id) : mp && mp.half != null ? mp.half : wm.camp || CAMP_HALF;
    const inR = (x, y) => x >= rx && y >= ry && x < rx + rw && y < ry + rh;
    const I = (x, y) => y * MAP_W + x;
    const isB = (x, y) => inR(x, y) && w.deco[I(x, y)] === DECO.BRIDGE;
    const liq = (x, y) => !inR(x, y) || LIQUID.has(w.ground[I(x, y)]);
    const land = (x, y) => inR(x, y) && !liq(x, y) && !tileBlocked(x, y);
    // Richtung, in der die Kachel gezeichnet wird (true: waagrecht) – neue Fassung über bridgeDir3, sonst wie bis 14.73
    const dirOf = (x, y) => {
      if (typeof bridgeDir3 === 'function') return bridgeDir3(x, y);
      const f = bridgeDirAt(x, y);
      if (f !== undefined) return f;
      const way = (tx, ty) => groundAt(tx, ty) === GROUND.PATH || isB(tx, ty);
      return way(x - 1, y) && way(x + 1, y);
    };
    // Landstücke (begehbares Land ohne Brücken) für „doppelt“ und „sinnlos“
    const lab = new Int32Array(rw * rh).fill(-1);
    let nLab = 0;
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        const k = (y - ry) * rw + x - rx;
        if (lab[k] >= 0 || isB(x, y) || !land(x, y)) continue;
        const st = [[x, y]];
        lab[k] = nLab;
        while (st.length) {
          const [a, b] = st.pop();
          for (const [dx, dy] of N4) {
            const nx = a + dx;
            const ny = b + dy;
            if (!inR(nx, ny)) continue;
            const j = (ny - ry) * rw + nx - rx;
            if (lab[j] >= 0 || isB(nx, ny) || !land(nx, ny)) continue;
            lab[j] = nLab;
            st.push([nx, ny]);
          }
        }
        nLab++;
      }
    }
    const labAt = (x, y) => (inR(x, y) ? lab[(y - ry) * rw + x - rx] : -1);
    // Brücken sammeln
    const seen = new Uint8Array(rw * rh);
    const bridges = [];
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        if (!isB(x, y) || seen[(y - ry) * rw + x - rx]) continue;
        const tiles = [];
        const st = [[x, y]];
        seen[(y - ry) * rw + x - rx] = 1;
        while (st.length) {
          const t = st.pop();
          tiles.push(t);
          for (const [dx, dy] of N4) {
            const nx = t[0] + dx;
            const ny = t[1] + dy;
            if (!isB(nx, ny) || seen[(ny - ry) * rw + nx - rx]) continue;
            seen[(ny - ry) * rw + nx - rx] = 1;
            st.push([nx, ny]);
          }
        }
        bridges.push({ tiles });
      }
    }
    const list = [];
    for (const B of bridges) {
      const f = { schwebend: 0, insNichts: 0, hindernis: 0, luecke: 0, quer: 0, ecke: 0, zacken: 0, aufLand: 0 };
      const d3 = { ohneAuflager: 0, innenGelaender: 0 };
      const new3 = typeof bridge3Tile === 'function';
      let sx = 0;
      let sy = 0;
      let nh = 0;
      const set = new Set(B.tiles.map(([x, y]) => I(x, y)));
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [x, y] of B.tiles) {
        sx += x; sy += y;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        if (dirOf(x, y)) nh++;
        if (!LIQUID.has(w.ground[I(x, y)])) f.aufLand++;
      }
      const n = B.tiles.length;
      const horiz = nh * 2 >= n;
      const cx = sx / n;
      const cy = sy / n;
      const inTown = Math.max(Math.abs(cx + 0.5 - tcx), Math.abs(cy + 0.5 - tcy)) <= half + 0.5;
      const g0 = w.ground[I(...B.tiles[0])];
      const style = (typeof bridgeStyleAt === 'function' && bridgeStyleAt(I(...B.tiles[0]), g0)) || 'holz';
      const form = typeof FORM_BRIDGE !== 'undefined' && FORM_BRIDGE.has(I(...B.tiles[0]));
      // Spurenden: je Kachel in ihrer Richtung nach vorn und hinten
      const ends = { a: [], b: [] }; // a: kleinere Lage, b: größere
      const loose = [];
      const labs = new Set();
      const endTiles = [];
      for (const [x, y] of B.tiles) {
        const h = dirOf(x, y);
        const [dx, dy] = h ? [1, 0] : [0, 1];
        // quer: entlang der gezeichneten Richtung weder Brücke noch Land, quer dazu aber schon
        const along = [[x - dx, y - dy], [x + dx, y + dy]];
        const across = [[x - dy, y - dx], [x + dy, y + dx]];
        const ok = (p) => isB(...p) || land(...p);
        // 3D: Kanten zum Land (bis 14.73 ohne Auflager) und Geländer zwischen zwei Brückenkacheln (quer zur Richtung)
        if (!new3) {
          for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!isB(x + ax, y + ay) && !liq(x + ax, y + ay)) d3.ohneAuflager++;
          for (const p of across) if (isB(...p)) d3.innenGelaender++;
        }
        if (!along.some(ok) && across.some(ok)) f.quer++;
        for (const [s, side] of [[-1, 'a'], [1, 'b']]) {
          const nx = x + s * dx;
          const ny = y + s * dy;
          if (isB(nx, ny)) {
            // Knick: die Nachbarkachel läuft in die andere Richtung
            if (dirOf(nx, ny) !== h) f.ecke++;
            continue;
          }
          // Knick ohne Nachbarn in Laufrichtung: quer dazu geht die Brücke weiter
          const perp = across.some((p) => isB(...p) && dirOf(...p) !== h);
          if (land(nx, ny)) {
            ends[side].push(h ? x : y);
            labs.add(labAt(nx, ny));
            endTiles.push([x, y, nx, ny]);
          } else if (liq(nx, ny)) {
            if (perp) { f.ecke++; continue; }
            f.schwebend++;
            if (loose.length < 4) loose.push(`${x},${y}`);
            for (let k = 2; k <= 4; k++) if (isB(x + s * dx * k, y + s * dy * k) && !set.has(I(x + s * dx * k, y + s * dy * k))) { f.luecke++; break; }
          } else f.hindernis++;
        }
      }
      // Seiten ohne Landanschluss (nur für gerade Brücken sinnvoll)
      if (!f.ecke) {
        if (!ends.a.length) f.insNichts++;
        if (!ends.b.length) f.insNichts++;
        for (const s of ['a', 'b']) if (ends[s].length > 1 && Math.max(...ends[s]) - Math.min(...ends[s]) > 1) f.zacken++;
      }
      labs.delete(-1);
      const len = horiz ? x1 - x0 + 1 : y1 - y0 + 1;
      const wid = horiz ? y1 - y0 + 1 : x1 - x0 + 1;
      list.push({ id: list.length, x: Math.round(cx), y: Math.round(cy), n, len, wid, horiz, style, form, inTown, labs: [...labs].sort((a, b) => a - b), f, d3, endTiles, loose });
    }
    // sinnlos: verbindet nur ein Landstück mit sich selbst und der Umweg ist kurz, oder hat gar keinen Landanschluss
    const detour = (a, b, lim) => {
      // Breitensuche über Land (ohne Brücken) von a nach b, höchstens lim Schritte
      const key = (x, y) => (y - ry) * rw + x - rx;
      const dist = new Map([[key(a[0], a[1]), 0]]);
      let q = [a];
      for (let d = 0; d < lim && q.length; d++) {
        const nq = [];
        for (const [x, y] of q) {
          if (x === b[0] && y === b[1]) return d;
          for (const [dx, dy] of N4) {
            const nx = x + dx;
            const ny = y + dy;
            if (!inR(nx, ny) || isB(nx, ny) || !land(nx, ny) || dist.has(key(nx, ny))) continue;
            dist.set(key(nx, ny), d + 1);
            nq.push([nx, ny]);
          }
        }
        q = nq;
      }
      return Infinity;
    };
    for (const b of list) {
      b.f.sinnlos = 0;
      if (!b.endTiles.length) { b.f.sinnlos = 1; continue; }
      if (b.labs.length === 1 && !b.inTown) {
        // gegenüberliegende Enden suchen
        const ea = b.endTiles.filter((e) => (b.horiz ? e[2] < e[0] : e[3] < e[1]));
        const eb = b.endTiles.filter((e) => (b.horiz ? e[2] > e[0] : e[3] > e[1]));
        if (ea.length && eb.length) {
          const A = [ea[0][2], ea[0][3]];
          const Bp = [eb[0][2], eb[0][3]];
          const d = detour(A, Bp, b.len * 2 + 16);
          b.detour = d;
          if (d <= b.len + 12 || (b.n <= 24 && d <= 2 * b.len + 14)) b.f.sinnlos = 1;
        }
      }
    }
    // doppelt und eng
    for (const b of list) { b.f.doppelt = 0; b.f.eng = 0; }
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const A = list[i];
        const B = list[j];
        if (A.inTown || B.inTown) continue;
        const d = Math.hypot(A.x - B.x, A.y - B.y);
        if (A.labs.length === 2 && B.labs.length === 2 && A.labs[0] === B.labs[0] && A.labs[1] === B.labs[1] && d < 16) { A.f.doppelt++; B.f.doppelt++; }
        else if (A.horiz === B.horiz && d < 6) { A.f.eng++; B.f.eng++; }
      }
    }
    const keys = ['schwebend', 'insNichts', 'hindernis', 'luecke', 'quer', 'ecke', 'zacken', 'aufLand', 'doppelt', 'eng', 'sinnlos'];
    const sum = (arr) => Object.fromEntries(keys.map((k) => [k, arr.reduce((s, b) => s + (b.f[k] ? (k === 'schwebend' || k === 'quer' || k === 'ecke' || k === 'aufLand' || k === 'hindernis' ? b.f[k] : 1) : 0), 0)]));
    const wild = list.filter((b) => !b.inTown);
    const town = list.filter((b) => b.inTown);
    const byStyle = {};
    for (const b of list) byStyle[b.style] = (byStyle[b.style] || 0) + 1;
    out.push({
      map: wm.id, name: wm.name, bridges: list.length, wild: wild.length, town: town.length, tiles: list.reduce((s, b) => s + b.n, 0), byStyle,
      faultyWild: wild.filter((b) => keys.some((k) => k !== 'ecke' && b.f[k])).length, faultyTown: town.filter((b) => keys.some((k) => k !== 'ecke' && b.f[k])).length,
      sumWild: sum(wild), sumTown: sum(town),
      ohneAuflager: list.reduce((s, b) => s + b.d3.ohneAuflager, 0), innenGelaender: list.reduce((s, b) => s + b.d3.innenGelaender, 0),
      list: list.map(({ endTiles, ...b }) => b)
    });
  }
  return out;
}

// --- Node-Teil ----------------------------------------------------------------------------------------------------
if (typeof module !== 'undefined' && require.main === module) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const has = (k) => process.argv.includes(k);
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) {
    try { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); } catch (e2) {
      console.error('Playwright fehlt: npm i -g playwright && npx playwright install chromium');
      process.exit(1);
    }
  }
  const only = arg('--karte', '') ? arg('--karte').split(',').map(Number) : null;
  (async () => {
    let url = arg('--url', '');
    let server = null;
    if (!url) {
      const root = path.join(__dirname, '..');
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2' };
      server = http.createServer((req, res) => {
        const p = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
        if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
        fs.readFile(p, (err, data) => {
          if (err) { res.writeHead(404); return res.end(); }
          res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
          res.end(data);
        });
      });
      await new Promise((r) => server.listen(0, r));
      url = `http://localhost:${server.address().port}/`;
    }
    const browser = await chromium.launch();
    const page = await (await browser.newContext({ viewport: { width: 800, height: 600 } })).newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.addInitScript(() => localStorage.setItem('seelenstein.optionen', JSON.stringify({ view: '2d', optsVer: 2, sound: false, music: false })));
    await page.goto(url, { timeout: 180000 });
    await page.waitForFunction(() => typeof game !== 'undefined' && game.world, null, { timeout: 180000 });
    await page.evaluate(`window.bridgeAudit = ${bridgeAudit.toString()}`);
    const res = await page.evaluate(() => ({ audit: bridgeAudit(), reach: typeof mapFormReport === 'function' ? mapFormReport() : [], v: typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '?' }));
    await browser.close();
    if (server) server.close();
    const keys = ['schwebend', 'insNichts', 'hindernis', 'luecke', 'quer', 'ecke', 'zacken', 'aufLand', 'doppelt', 'eng', 'sinnlos'];
    console.log(`Brückenprüfung (Spielstand ${res.v}, ${url})`);
    console.log('Map | Brücken (Wildnis/Stadt) | mit Befund W/S | ' + keys.join(' | ') + ' (Wildnis; Stadt in Klammern)');
    const tot = { b: 0, fw: 0, ft: 0 };
    for (const m of res.audit) {
      if (only && !only.includes(m.map)) continue;
      tot.b += m.bridges; tot.fw += m.faultyWild; tot.ft += m.faultyTown;
      const cols = keys.map((k) => `${m.sumWild[k]}${m.sumTown[k] ? ` (${m.sumTown[k]})` : ''}`);
      console.log(`${String(m.map).padStart(2)} ${m.name.padEnd(16)} | ${m.bridges} (${m.wild}/${m.town}) | ${m.faultyWild}/${m.faultyTown} | ${cols.join(' | ')}  ${JSON.stringify(m.byStyle)} 3D: ohne Auflager ${m.ohneAuflager}, Geländer innen ${m.innenGelaender}`);
      if (has('--liste')) {
        for (const b of m.list) {
          const bad = keys.filter((k) => b.f[k]).map((k) => `${k}${b.f[k] > 1 ? '×' + b.f[k] : ''}`);
          if (keys.some((k) => k !== 'ecke' && b.f[k])) console.log(`     ${b.inTown ? 'Stadt ' : ''}${b.style}${b.form ? '/Form' : ''} bei ${b.x},${b.y} ${b.horiz ? 'waagrecht' : 'senkrecht'} ${b.len}×${b.wid} (${b.n} Kacheln): ${bad.join(', ')}${b.f.schwebend ? ' – schwebend bei ' + b.loose.join(' ') : ''}`);
        }
      }
    }
    console.log(`Summe: ${tot.b} Brücken, mit Befund: Wildnis ${tot.fw}, Stadt ${tot.ft}`);
    console.log('Erreichbarkeit (mapFormReport): ' + res.reach.map((r) => `${r.map}:${r.unreachable}${r.npcBad.length ? '!' + r.npcBad.length : ''}${r.spotsBad ? '/spots' + r.spotsBad : ''}`).join(' '));
    console.log('Fehler: ' + (errs.length ? errs.slice(0, 5).join(' | ') : 'keine'));
    const j = arg('--json', '');
    if (j) fs.writeFileSync(j, JSON.stringify(res, null, 1));
  })();
}
if (typeof module !== 'undefined') module.exports = { bridgeAudit };
