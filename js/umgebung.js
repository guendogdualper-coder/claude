// Umgebung: Boden, Bäume, Felsen, Häuser und Dorfschmuck.
// Bäume, Häuser und Schmuck werden wie die Figuren einmal mit Umriss gebacken
// und dann nach ihrer Fußlinie zusammen mit den Figuren sortiert gezeichnet,
// damit man hinter Baumkronen und Dächer laufen kann.

// Bodenfarben je Bodenart (dunkel, hell); dazwischen 8 Abstufungen für weiche Verläufe
const GROUND_SHADES = [
  ['#4c7634', '#6b9a46'], // GRASS
  ['#58873b', '#7aa94f'], // MEADOW
  ['#304c2a', '#48683a'], // FOREST
  ['#97805a', '#b89e74'], // PATH
  ['#285474', '#3a7096'], // WATER
  ['#8c8476', '#a9a091'], // PLAZA
  ['#a6875a', '#c6a878'], // SAND
  ['#514844', '#6a5f59'], // ASH
  ['#c4d2e0', '#eef4fa'], // SNOW
  ['#35452e', '#4f5f42'], // SWAMP
  ['#b8320e', '#ff8a2a'], // LAVA
  ['#22362a', '#34503e'], // BOG
  ['#9cc8e4', '#d4ecfa'], // ICE
  ['#2c2224', '#463838'], // BASALT
  ['#4a3e36', '#62544a'], // CAVE (Höhlenboden)
  ['#4e4a42', '#6e685c']  // FLAGSTONE (Steinplatten der Orkfestung)
];
const GROUND_PALETTE = GROUND_SHADES.map(([a, b]) => Array.from({ length: 8 }, (_, i) => mixColor(a, b, i / 7)));

const groundAt = (x, y) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? -1 : game.world.ground[y * MAP_W + x]);

// --- Boden ---------------------------------------------------------------------------

// Natürlicher Boden (Gras, Wald, Sand, Asche) als Bild mit einem Pixel pro Kachel.
// Weich vergrößert ergibt das fließende Übergänge statt sichtbarer Kacheln.
let groundImage = null;
let groundImagePix = null; // seit 15.56: dasselbe mit den kräftigeren Farben des Pixel-Stils (pixel2d.js)

function buildGroundImage(grade) {
  const w = game.world;
  const c = newCanvas(MAP_W, MAP_H);
  const cx = c.getContext('2d');
  const img = cx.createImageData(MAP_W, MAP_H);
  const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  for (let i = 0; i < MAP_W * MAP_H; i++) {
    let g = w.ground[i];
    // Unter Wasser liegt Ufersand, unter Wegen und Pflaster der Boden der Zone
    if (g === GROUND.WATER) g = GROUND.SAND;
    else if (g === GROUND.LAVA) g = GROUND.BASALT;
    else if (g === GROUND.BOG) g = GROUND.SWAMP;
    if (g === GROUND.PATH || g === GROUND.PLAZA) g = GROUND[ZONES[w.zoneIdx[i]].ground];
    // seit 13.85 mit Ersatzfarbe, falls eine Bodenart (noch) keine Farben hat (sonst bricht das ganze Bild ab)
    const c = rgb((GROUND_PALETTE[g] || GROUND_PALETTE[GROUND.BASALT])[w.shade[i] >> 5]);
    img.data.set([...(grade ? pixGradeRGB(c[0], c[1], c[2]) : c), 255], i * 4);
  }
  cx.putImageData(img, 0, 0);
  return c;
}

// Der Boden wird in Blöcken zu 8 × 8 Kacheln einmal vorgezeichnet und zwischengespeichert.
// Pro Bild kommen nur noch die bewegten Wellen und die Gischt dazu.
const CHUNK = 8;
const CHUNK_SCALE = 2;
const chunkCache = new Map();

function renderGroundChunk(cx, cy) {
  const w = game.world;
  const size = CHUNK * TILE;
  // seit 15.56 im Pixel-Stil in der Auflösung der Pixel-Fläche (ein Bildpunkt = PIX.units Einheiten, pixel2d.js)
  const pix = typeof PIX !== 'undefined' && PIX.inWorld;
  const SC = pix ? Math.round(size / PIX.units) / size : CHUNK_SCALE;
  const c = newCanvas(Math.round(size * SC), Math.round(size * SC));
  const ctx = c.getContext('2d');
  ctx.scale(SC, SC);
  ctx.translate(-cx * size, -cy * size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const tx0 = cx * CHUNK;
  const ty0 = cy * CHUNK;
  const sx = Math.max(0, tx0 - 1);
  const sy = Math.max(0, ty0 - 1);
  const sw = Math.min(MAP_W, tx0 + CHUNK + 1) - sx;
  const sh = Math.min(MAP_H, ty0 + CHUNK + 1) - sy;
  ctx.drawImage(pix ? groundImagePix : groundImage, sx, sy, sw, sh, sx * TILE + TILE / 2 - TILE / 2, sy * TILE + TILE / 2 - TILE / 2, sw * TILE, sh * TILE);
  for (let y = ty0; y < Math.min(MAP_H, ty0 + CHUNK); y++) {
    for (let x = tx0; x < Math.min(MAP_W, tx0 + CHUNK); x++) {
      const i = y * MAP_W + x;
      const g = w.ground[i];
      const h = tileHash(x, y);
      const px = x * TILE;
      const py = y * TILE;
      // seit 15.65: außerhalb der eigenen Halle Fels in ihrer Wandfarbe (HOME2D)
      if (home2dOut(x, y)) {
        drawCaveWall(ctx, x, y, px, py, h, HOME2D.look);
        continue;
      }
      if (w.obj[i] === OBJ.CAVEWALL) {
        // seit 13.86: Hallen der Turnierarena mit eigenen Wandfarben (zone.wallLook wie dungeon.wall)
        drawCaveWall(ctx, x, y, px, py, h, ZONES[w.zoneIdx[i]].dungeon || ZONES[w.zoneIdx[i]].wallLook);
        continue;
      }
      if (g === GROUND.PATH || g === GROUND.PLAZA || LIQUID.has(g) || g === GROUND.ICE || g === GROUND.FLAGSTONE) {
        const fc = (GROUND_PALETTE[g] || GROUND_PALETTE[GROUND.BASALT])[Math.min(7, (w.shade[i] >> 6) + 3)];
        ctx.fillStyle = pix ? pixGradeHex(fc) : fc;
        ctx.fillRect(px, py, TILE + 0.6, TILE + 0.6);
      }
      if (LIQUID.has(g) && w.deco[i] !== DECO.BRIDGE) drawShore(ctx, x, y, px, py, g);
      else if (g === GROUND.ICE) drawIceTile(ctx, px, py, h);
      // im Pixel-Stil legt pixelGroundPass Kopfsteinpflaster aus einzelnen Steinen statt der Plattenfugen
      else if ((g === GROUND.PLAZA || g === GROUND.FLAGSTONE) && !pix) drawPlazaTile(ctx, px, py, h);
      // Schatten unter Dungeon-Wänden
      if (wallAt(x, y - 1)) {
        const sg = ctx.createLinearGradient(0, py, 0, py + 14);
        sg.addColorStop(0, 'rgba(0,0,0,0.5)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(px, py, TILE + 0.6, 14);
      }
      if (g === GROUND.PATH || g === GROUND.PLAZA) drawGrassFringe(ctx, x, y, px, py, h);
    }
  }
  // Pixel-Stil: Bodenmuster (Grashalme, Kiesel, Sprenkel) über den Boden, unter Schmuck und Brücken
  if (pix && typeof pixelGroundPass === 'function') pixelGroundPass(ctx, tx0, ty0);
  if (pix && typeof pixelPathRound === 'function') pixelPathRound(ctx, tx0, ty0);
  if (pix && typeof pixelFences === 'function') pixelFences(ctx, tx0, ty0);
  if (pix && typeof pixelFields === 'function') pixelFields(ctx, tx0, ty0);
  for (let y = ty0; y < Math.min(MAP_H, ty0 + CHUNK); y++) {
    for (let x = tx0; x < Math.min(MAP_W, tx0 + CHUNK); x++) {
      const i = y * MAP_W + x;
      if (w.obj[i] === OBJ.CAVEWALL || home2dOut(x, y)) continue;
      const g = w.ground[i];
      const d = w.deco[i];
      if (d === DECO.BRIDGE) drawBridge2(ctx, x * TILE, y * TILE, bridgeHoriz(x, y), typeof bridgeStyleAt === 'function' ? bridgeStyleAt(i, g) : null, bridgeEdges2(x, y));
      else if (d) drawDeco(ctx, d, g, x * TILE, y * TILE, tileHash(x, y));
      // zusätzlicher Schmuck je Karte (seit 15.80, DECO_MEHR)
      if (DECO_MEHR.length && DECO_MEHR_FREI(d) && !w.obj[i]) {
        const e = decoMehr(x, y, i);
        if (e) drawDeco(ctx, e, g, x * TILE, y * TILE, tileHash(x + 7, y + 3));
      }
    }
  }
  return c;
}

// Eigene Halle (seit 15.65): alle Dungeons liegen nebeneinander auf einem Kartenstreifen. 3D baut nur den eigenen
// Block (v3UpdateHome), 2D malte alles im Bild – am Rand einer Halle sah man die Hallen anderer Dungeons. Steht die
// Kamera in einem Dungeon (auch Hallen der Prüfungs- und Turnierarena), ist jetzt alles außerhalb seines Blocks Fels
// in der Wandfarbe des Dungeons; Monster und Schmuck von dort fallen weg (collectScene).
const HOME2D = { key: '', on: false, x0: 0, y0: 0, x1: 0, y1: 0, look: null };
function home2dUpdate(fx, fy) {
  const rr = game.world && typeof regionRect3 === 'function' ? regionRect3(fx, fy) : null;
  const key = rr && rr.key[0] === 'd' ? rr.key : '';
  if (key === HOME2D.key) return;
  HOME2D.key = key;
  HOME2D.on = !!key;
  if (!key) return;
  const [x, y, w, h] = rr.r;
  HOME2D.x0 = x;
  HOME2D.y0 = y;
  HOME2D.x1 = x + w;
  HOME2D.y1 = y + h;
  const z = ZONES[game.world.zoneIdx[(y + (h >> 1)) * MAP_W + x + (w >> 1)]];
  HOME2D.look = (z && (z.dungeon || z.wallLook)) || null;
}
// Kachel außerhalb der eigenen Halle?
const home2dOut = (x, y) => HOME2D.on && (x < HOME2D.x0 || x >= HOME2D.x1 || y < HOME2D.y0 || y >= HOME2D.y1);

// Dungeon-Wände: Oberseite mit Fugen bzw. Rissen, zur offenen Seite hin eine dunklere Vorderseite
const wallAt = (x, y) => (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && game.world.obj[y * MAP_W + x] === OBJ.CAVEWALL) || home2dOut(x, y);
function drawCaveWall(ctx, x, y, px, py, h, dg) {
  const c = dg ? dg.wall : { top: '#3a3430', face: '#1e1a18', line: '#4a4440' };
  const open = { down: !wallAt(x, y + 1), up: !wallAt(x, y - 1), left: !wallAt(x - 1, y), right: !wallAt(x + 1, y) };
  ctx.fillStyle = (h % 7) < 3 ? lighter(c.top, 0.06) : c.top;
  ctx.fillRect(px, py, TILE + 0.6, TILE + 0.6);
  // Fugen bzw. Risse (im Drachenhort glühend)
  ctx.strokeStyle = c.line;
  ctx.globalAlpha = dg && dg.id === 'drachenhort' ? 0.55 : 0.45;
  ctx.lineWidth = dg && dg.id === 'orkfestung' ? 1.2 : 1;
  ctx.beginPath();
  if (dg && dg.id === 'orkfestung') {
    ctx.moveTo(px, py + 11); ctx.lineTo(px + TILE, py + 11);
    ctx.moveTo(px, py + 22); ctx.lineTo(px + TILE, py + 22);
    const o = h % 2 ? 8 : 20;
    ctx.moveTo(px + o, py); ctx.lineTo(px + o, py + 11);
    ctx.moveTo(px + (o + 12) % TILE, py + 11); ctx.lineTo(px + (o + 12) % TILE, py + 22);
  } else {
    const a = h % 23;
    const b = (h >> 5) % 19;
    ctx.moveTo(px + 4 + a * 0.6, py + 6 + b * 0.5);
    ctx.lineTo(px + 12 + b * 0.5, py + 14 + a * 0.3);
    ctx.lineTo(px + 10 + a * 0.4, py + 24);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (open.up) {
    ctx.fillStyle = lighter(c.top, 0.22);
    ctx.fillRect(px, py, TILE + 0.6, 3);
  }
  if (open.left) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(px, py, 3, TILE); }
  if (open.right) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px + TILE - 3, py, 3.6, TILE); }
  if (open.down) {
    // Vorderseite der Wand
    const fh = 15;
    const g = ctx.createLinearGradient(0, py + TILE - fh, 0, py + TILE);
    g.addColorStop(0, c.face);
    g.addColorStop(1, darker(c.face, 0.35));
    ctx.fillStyle = g;
    ctx.fillRect(px, py + TILE - fh, TILE + 0.6, fh + 0.6);
    ctx.fillStyle = lighter(c.top, 0.15);
    ctx.fillRect(px, py + TILE - fh - 1.5, TILE + 0.6, 1.5);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const sx = px + 5 + ((h >> (k * 3)) % 7) + k * 9;
      ctx.moveTo(sx, py + TILE - fh + 2);
      ctx.lineTo(sx - 1, py + TILE - 1);
    }
    ctx.stroke();
  }
}

// span (seit 15.57, schräge Sicht): Blockzeile → [erster, letzter] Block, der zu sehen ist
function drawGround(ctx, x0, y0, x1, y1, span) {
  const w = game.world;
  if (!groundImage) groundImage = buildGroundImage();
  if (typeof PIX !== 'undefined' && PIX.inWorld && !groundImagePix) groundImagePix = buildGroundImage(true);
  const size = CHUNK * TILE;
  // seit 15.57: in der schrägen Sicht (pixel2d.js) sind viel mehr Blöcke zu sehen – dort backt jedes Bild nur ein paar
  // neue (PIX.chunkBudget), die übrigen zeigen bis dahin die Bodenfarben je Kachel
  const budget = typeof PIX !== 'undefined' && PIX.inWorld && PIX.chunkBudget != null ? PIX.chunkBudget : Infinity;
  let made = 0;
  let seen = 0;
  const rows = span ? [] : null;
  for (let cy = Math.floor(y0 / CHUNK); cy <= Math.floor(y1 / CHUNK); cy++) {
    let ca = Math.floor(x0 / CHUNK);
    let cb = Math.floor(x1 / CHUNK);
    if (span) {
      const sp = span(cy);
      ca = Math.max(ca, sp[0]);
      cb = Math.min(cb, sp[1]);
      rows[cy] = [ca * CHUNK, cb * CHUNK + CHUNK - 1];
    }
    for (let cx = ca; cx <= cb; cx++) {
      // (in einer Halle eigene Blöcke: draußen ist dort Fels, HOME2D)
      const key = cx + ':' + cy + (typeof PIX !== 'undefined' && PIX.inWorld ? 'p' : '') + (HOME2D.on ? HOME2D.key : '');
      seen++;
      let c = chunkCache.get(key);
      if (c) chunkCache.delete(key);
      else if (made < budget) {
        c = renderGroundChunk(cx, cy);
        made++;
      } else {
        ctx.drawImage(groundImagePix || groundImage, cx * CHUNK, cy * CHUNK, CHUNK, CHUNK, cx * size, cy * size, size, size);
        continue;
      }
      chunkCache.set(key, c);
      ctx.drawImage(c, cx * size, cy * size, size, size);
    }
  }
  // Nur die ältesten Blöcke verwerfen, die gerade sicher nicht zu sehen sind
  // (jeder Block ist ein großes Bild im Grafikspeicher, deshalb nicht zu viele behalten)
  while (chunkCache.size > Math.max(28, seen + 12)) chunkCache.delete(chunkCache.keys().next().value);
  // Bewegtes Wasser
  const t = game.time;
  for (let y = y0; y <= y1; y++) {
    const rw = rows && rows[Math.floor(y / CHUNK)];
    const xa = rw ? Math.max(x0, rw[0]) : x0;
    const xb = rw ? Math.min(x1, rw[1]) : x1;
    for (let x = xa; x <= xb; x++) {
      const i = y * MAP_W + x;
      const g = w.ground[i];
      if (!LIQUID.has(g) || w.deco[i] === DECO.BRIDGE || home2dOut(x, y)) continue;
      if (g === GROUND.WATER) drawWaterTile(ctx, x, y, x * TILE, y * TILE, tileHash(x, y), t);
      else drawMagmaTile(ctx, g, x, y, x * TILE, y * TILE, tileHash(x, y), t);
    }
  }
}

function drawWaterTile(ctx, x, y, px, py, h, t) {
  // Wellen
  ctx.fillStyle = 'rgba(210,235,255,0.16)';
  const off = Math.sin(t * 1.4 + x * 0.8 + y * 0.5) * 4;
  ctx.fillRect(px + 5 + off, py + 9 + (h % 7), 11, 1.6);
  ctx.fillRect(px + 15 - off, py + 22 - (h % 5), 8, 1.6);
  // Gischt an jeder Seite, die an Land grenzt
  const foam = 0.35 + 0.2 * Math.sin(t * 2 + x + y);
  ctx.fillStyle = `rgba(240,248,255,${foam})`;
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const n = groundAt(x + dx, y + dy);
    if (LIQUID.has(n) || n === -1) continue;
    if (dy === -1) ctx.fillRect(px, py + 4, TILE, 1.8);
    if (dy === 1) ctx.fillRect(px, py + TILE - 5.8, TILE, 1.8);
    if (dx === -1) ctx.fillRect(px + 4, py, 1.8, TILE);
    if (dx === 1) ctx.fillRect(px + TILE - 5.8, py, 1.8, TILE);
  }
}

// Lava glüht und blubbert, Sumpfwasser wirft Blasen
function drawMagmaTile(ctx, g, x, y, px, py, h, t) {
  const lava = g === GROUND.LAVA;
  const k = (t * (lava ? 0.6 : 0.4) + (h % 97) / 97) % 1;
  ctx.fillStyle = lava ? `rgba(255,220,120,${0.25 + 0.2 * Math.sin(t * 2 + x * 0.7 + y)})` : 'rgba(120,160,110,0.12)';
  ctx.fillRect(px + 4 + (h % 11), py + 6 + ((h >> 3) % 13), lava ? 10 : 7, 2);
  const bx = px + 6 + ((h >> 5) % 20);
  const by = py + 8 + ((h >> 9) % 16);
  ctx.strokeStyle = lava ? `rgba(255,240,180,${1 - k})` : `rgba(170,200,150,${0.6 * (1 - k)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(bx, by, 1 + k * (lava ? 4 : 3), 0, Math.PI * 2);
  ctx.stroke();
}

// Zugefrorener See: Glanz und feine Risse
function drawIceTile(ctx, px, py, h) {
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(px + (h % 14), py + 6 + ((h >> 4) % 10), 9, 1.4);
  ctx.strokeStyle = 'rgba(80,130,170,0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(px + 4 + (h % 9), py + 30);
  ctx.lineTo(px + 12 + ((h >> 3) % 9), py + 18);
  ctx.lineTo(px + 22, py + 14 + ((h >> 6) % 8));
  ctx.stroke();
}

// Uferstreifen (fest, wird mit dem Boden vorgezeichnet): Sand am Wasser, Fels an der Lava, Schlamm am Sumpf
function drawShore(ctx, x, y, px, py, g = GROUND.WATER) {
  ctx.fillStyle = g === GROUND.LAVA ? 'rgba(40,24,20,0.95)' : g === GROUND.BOG ? 'rgba(58,52,34,0.95)' : 'rgba(201,176,122,0.95)';
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const n = groundAt(x + dx, y + dy);
    if (LIQUID.has(n) || n === -1) continue;
    if (dy === -1) ctx.fillRect(px, py, TILE, 4);
    if (dy === 1) ctx.fillRect(px, py + TILE - 4, TILE, 4);
    if (dx === -1) ctx.fillRect(px, py, 4, TILE);
    if (dx === 1) ctx.fillRect(px + TILE - 4, py, 4, TILE);
  }
}

function drawPlazaTile(ctx, px, py, h) {
  // zwei Reihen Pflastersteine, versetzt wie Mauerwerk
  ctx.strokeStyle = 'rgba(55,48,38,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, py + 16);
  ctx.lineTo(px + TILE, py + 16);
  const a = 8 + (h % 9);
  const b = 4 + ((h >> 4) % 10);
  ctx.moveTo(px + a, py);
  ctx.lineTo(px + a, py + 16);
  ctx.moveTo(px + a + 16, py);
  ctx.lineTo(px + a + 16, py + 16);
  ctx.moveTo(px + b, py + 16);
  ctx.lineTo(px + b, py + TILE);
  ctx.moveTo(px + b + 16, py + 16);
  ctx.lineTo(px + b + 16, py + TILE);
  ctx.stroke();
  ctx.fillStyle = (h >> 8) & 1 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  ctx.fillRect(px + a + 1, py + 1, 15, 14);
}

// Gras wächst in Zacken über den Rand von Wegen und Pflaster
function drawGrassFringe(ctx, x, y, px, py, h) {
  const sides = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  sides.forEach(([dx, dy], k) => {
    const n = groundAt(x + dx, y + dy);
    if (n !== GROUND.GRASS && n !== GROUND.MEADOW && n !== GROUND.FOREST) return;
    ctx.fillStyle = GROUND_PALETTE[n][3];
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const s = j * 6.4 + ((h >> (j + k)) & 3);
      const depth = 3 + ((h >> (j * 2 + k)) & 3);
      if (dy === -1) { ctx.moveTo(px + s, py); ctx.lineTo(px + s + 3.2, py + depth); ctx.lineTo(px + s + 6.4, py); }
      if (dy === 1) { ctx.moveTo(px + s, py + TILE); ctx.lineTo(px + s + 3.2, py + TILE - depth); ctx.lineTo(px + s + 6.4, py + TILE); }
      if (dx === -1) { ctx.moveTo(px, py + s); ctx.lineTo(px + depth, py + s + 3.2); ctx.lineTo(px, py + s + 6.4); }
      if (dx === 1) { ctx.moveTo(px + TILE, py + s); ctx.lineTo(px + TILE - depth, py + s + 3.2); ctx.lineTo(px + TILE, py + s + 6.4); }
    }
    ctx.fill();
  });
}

// Zusätzlicher Schmuck (seit 15.80): Regeln je Karte, die auf freien Kacheln eine Schmuckart dazulegen (z. B. mehr
// Kristallgruppen im Kristallabgrund). Nur Bild – ohne Kollision und ohne Änderung der Welt (w.deco bleibt), in 2D
// (renderGroundChunk, beim Backen der Bodenblöcke) und 3D (objectJob in drei-welt.js) nach derselben Regel. Eine Regel
// ist (x, y, i) → DECO-Art oder 0; frei heißt: kein Schmuck auf der Kachel außer Gras, Kieseln oder Rissen.
const DECO_MEHR = [];
const DECO_MEHR_FREI = (d) => !d || d === DECO.TUFT || d === DECO.PEBBLE || d === DECO.CRACK;
function decoMehr(x, y, i) {
  for (const f of DECO_MEHR) {
    const d = f(x, y, i);
    if (d) return d;
  }
  return 0;
}
// Moore: im Totenmoor und im Schwarzmoor wachsen zusätzlich leuchtende Pilzgruppen auf dem freien Moorboden (vorher
// große leere Flächen), nicht auf Wegen und mit einer Kachel Abstand zu ihnen; feste Auswahl je Kachel
const DECO_MEHR_MOOR = { moor: 0.022, schwarzmoor: 0.018 };
DECO_MEHR.push((x, y, i) => {
  const w = game.world;
  const z = ZONES[w.zoneIdx[i]];
  const p = z && !z.safe ? DECO_MEHR_MOOR[z.id] : 0;
  if (!p || w.ground[i] !== GROUND.SWAMP) return 0;
  if ((townTileHash(x * 7 + 1, y * 13 + 5) % 1000) / 1000 >= p) return 0;
  for (const j of [i - 1, i + 1, i - MAP_W, i + MAP_W]) if (w.ground[j] === GROUND.PATH || w.deco[j] === DECO.BRIDGE) return 0;
  return DECO.MUSHROOM;
});

function drawDeco(ctx, d, g, px, py, h) {
  const ox = (h >> 4) % 20 + 5;
  const oy = (h >> 9) % 18 + 8;
  switch (d) {
    case DECO.TUFT: {
      // kleine Grasbüschel aus einzelnen Halmen
      const dim = g === GROUND.FOREST || g === GROUND.SWAMP;
      const dark = dim ? 'rgba(18,36,14,0.55)' : 'rgba(34,64,22,0.5)';
      const light = dim ? 'rgba(110,150,80,0.45)' : 'rgba(150,200,100,0.45)';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = dark;
      ctx.beginPath();
      ctx.moveTo(px + ox, py + oy); ctx.lineTo(px + ox - 3, py + oy - 6);
      ctx.moveTo(px + ox, py + oy); ctx.lineTo(px + ox, py + oy - 7);
      ctx.moveTo(px + ox, py + oy); ctx.lineTo(px + ox + 3, py + oy - 5);
      ctx.stroke();
      ctx.strokeStyle = light;
      ctx.beginPath();
      ctx.moveTo(px + ox + 1, py + oy); ctx.lineTo(px + ox + 1.5, py + oy - 5);
      ctx.stroke();
      ctx.lineCap = 'butt';
      break;
    }
    case DECO.FLOWER_RED:
    case DECO.FLOWER_YELLOW:
    case DECO.FLOWER_WHITE: {
      const c = d === DECO.FLOWER_RED ? '#e0644f' : d === DECO.FLOWER_YELLOW ? '#f2d24e' : '#f6f2ea';
      for (const [fx, fy] of [[0, 0], [8, 5], [-5, 6]]) {
        ctx.strokeStyle = 'rgba(40,80,30,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + ox + fx, py + oy + fy);
        ctx.lineTo(px + ox + fx, py + oy + fy + 4);
        ctx.stroke();
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(px + ox + fx, py + oy + fy, 1.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f7d36a';
        ctx.fillRect(px + ox + fx - 0.5, py + oy + fy - 0.5, 1, 1);
      }
      break;
    }
    // seit 15.80 gemalte Bilder in den Farben des Gebiets (deco2*, unten) statt einfarbiger Flächen und Striche
    case DECO.PEBBLE:
      deco2Kiesel(ctx, px + ox, py + Math.max(oy, 12), h, g);
      break;
    case DECO.STUMP:
      deco2Stumpf(ctx, px + 16 + ((h >> 4) % 9) - 4, py + 22 + ((h >> 9) % 6), decoFarben2(px, py), h);
      break;
    case DECO.LOG:
      deco2Stamm(ctx, px + 16 + ((h >> 4) % 5) - 2, py + 22 + ((h >> 9) % 6), decoFarben2(px, py), h);
      break;
    case DECO.MUSHROOM:
      deco2Pilze(ctx, px + 16 + ((h >> 4) % 9) - 4, py + 22 + ((h >> 9) % 6), decoFarben2(px, py), g, h);
      break;
    case DECO.BONES:
      deco2Knochen(ctx, px + 16 + ((h >> 4) % 9) - 4, py + 20 + ((h >> 9) % 7), decoFarben2(px, py), h);
      break;
    case DECO.SHRUB:
      deco2Busch(ctx, px + 16 + ((h >> 4) % 9) - 4, py + 24 + ((h >> 9) % 5), decoFarben2(px, py), h);
      break;
    case DECO.CRYSTAL: {
      // seit 15.80 eine gemalte Kristallgruppe in den Farben des Gebiets (wie in 3D) statt dreier kleiner Dreiecke
      const c = kristallFarbe2d(px, py, g);
      // Fuß weit unten in der Kachel und in der oberen Reihe eines Bodenblocks kleiner: die Gruppe darf nicht über den
      // Block hinausragen (dort wäre sie abgeschnitten)
      const s = Math.floor(py / TILE) % CHUNK === 0 ? Math.min(c.s, 1.05) : c.s * 1.12;
      kristallGruppe2d(ctx, px + 16 + ((h >> 4) % 9) - 4, py + 25 + ((h >> 9) % 5), s, c.col, c.col2, h % 3, c.base, c.snow);
      break;
    }
    case DECO.DEADTREE:
      deco2Totholz(ctx, px + 16 + ((h >> 4) % 9) - 4, py + 26 + ((h >> 9) % 4), decoFarben2(px, py), g, h);
      break;
    case DECO.DRIFT:
      // Schneewehe (seit 8.4): heller Hügel mit bläulichem Schatten, ein Stein und zwei trockene Halme
      ctx.fillStyle = 'rgba(150,175,205,0.55)';
      ctx.beginPath();
      ctx.ellipse(px + ox + 1, py + oy + 1.5, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4f8fc';
      ctx.beginPath();
      ctx.ellipse(px + ox - 1, py + oy - 0.5, 10, 4, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a8694';
      ctx.beginPath();
      ctx.ellipse(px + ox + 6, py + oy - 1, 3, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a9878';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + ox - 6, py + oy); ctx.lineTo(px + ox - 8, py + oy - 6);
      ctx.moveTo(px + ox - 5, py + oy); ctx.lineTo(px + ox - 4, py + oy - 7);
      ctx.stroke();
      break;
    case DECO.CRACK:
      ctx.strokeStyle = g === GROUND.BASALT ? 'rgba(255,120,40,0.55)' : 'rgba(28,18,16,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + ox, py + oy - 6);
      ctx.lineTo(px + ox + 6, py + oy - 2);
      ctx.lineTo(px + ox + 4, py + oy + 4);
      ctx.moveTo(px + ox + 6, py + oy - 2);
      ctx.lineTo(px + ox + 11, py + oy - 3);
      ctx.stroke();
      break;
  }
}

// Brücke (seit 13.2 je nach Wegrichtung): Bretter quer zum Weg, Geländer an beiden Seiten
// --- Kristalle in 2D (seit 15.80) --------------------------------------------------------------------------------
// Wunsch des Spielers: die Kristalle schöner, „nicht so eckig und kegelförmig“. Bis 15.79 waren die Kristalle am Boden
// drei winzige Dreiecke in einer Farbe. Jetzt gemalt wie die 3D-Form (kristall3 in drei-welt.js): drei sichtbare
// Flächen (links hell, die mittlere mit Verlauf und einem hellen Streifen von innen, rechts dunkel), eine Spitze aus
// drei Facetten, dunkler Umriss, Glanzkante links und ein Funkelpunkt. Wird beim Backen der Bodenblöcke gemalt
// (kostet beim Spielen nichts); auch für die schwebenden Kristalle, Kristallbäume, Felsen und Pfeiler genutzt.
const KRIST2_PAL = new Map();
// Farbton einer Farbe heller/dunkler (dl) und satter (ds), über Farbton–Sättigung–Helligkeit (wie kristallPal3 in 3D)
function kristallTon2(col, dl, ds) {
  const n = parseInt(col.slice(1, 7), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  l = Math.max(0.03, Math.min(0.97, l + dl));
  s = Math.max(0, Math.min(1, s + ds));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    const v = t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    return Math.round(v * 255);
  };
  return '#' + ((1 << 24) | (f(h + 1 / 3) << 16) | (f(h) << 8) | f(h - 1 / 3)).toString(16).slice(1);
}
function kristallPal2(col) {
  let p = KRIST2_PAL.get(col);
  if (!p) {
    const t = (dl, ds) => kristallTon2(col, dl, ds);
    p = {
      out: mixColor(t(-0.58, -0.4), '#120a24', 0.3),
      deep: t(-0.44, -0.32),
      dark: t(-0.32, -0.25),
      mid: t(-0.17, -0.15),
      light: t(0.04, 0),
      tipL: t(0.19, -0.04),
      tipM: t(0.1, -0.02),
      tipR: t(-0.06, -0.08),
      glint: t(0.26, -0.2)
    };
    KRIST2_PAL.set(col, p);
  }
  return p;
}
// Ein Kristall: Fuß bei (x, y), Höhe h mit Spitze, Breite w, um den Fuß geneigt um tilt; both: auch unten eine Spitze
// (schwebend, dann liegt der untere Gipfel bei y); flat: Flächen ohne Verlauf (für Bilder, die jedes Bild neu gemalt
// werden, z. B. die Wahrzeichen in wahrzeichen2d.js – spart die Verläufe)
function kristall2d(ctx, x, y, h, w, tilt, P, both, flat) {
  ctx.save();
  ctx.translate(x, y);
  if (tilt) ctx.rotate(tilt);
  const hw = w / 2;
  const iw = w * 0.2;
  const d = w * 0.13;
  const tipH = Math.min(h * 0.36, w * 1.1);
  const yt = -h + tipH;
  const yb = both ? -Math.min(h * 0.28, w * 0.9) : 0;
  const ax = w * 0.07;
  const fill = (pts, c) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();
  };
  const grad = (c0, c1) => {
    if (flat) return c1;
    const g = ctx.createLinearGradient(0, yb, 0, yt);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    return g;
  };
  // Umriss als dunkle, etwas größere Fläche (gibt die Pixelkante)
  const o = Math.max(0.9, w * 0.1);
  fill([[-hw - o, yb + (both ? 0 : o * 0.5)], [-hw - o, yt], [ax, -h - o * 1.2], [hw + o, yt], [hw + o, yb + (both ? 0 : o * 0.5)], [iw, yb + d + o], [-iw, yb + d + o]], P.out);
  if (both) fill([[-hw - o, yb], [-ax, o * 1.2], [hw + o, yb]], P.out);
  // untere Spitze (schwebend): dunkler, Licht von oben
  if (both) {
    fill([[-hw, yb], [-iw, yb + d], [-ax, 0]], P.dark);
    fill([[-iw, yb + d], [iw, yb + d], [-ax, 0]], P.deep);
    fill([[iw, yb + d], [hw, yb], [-ax, 0]], P.out);
  }
  // Körper: links hell, Mitte mit Verlauf, rechts dunkel
  fill([[-hw, yb], [-iw, yb + d], [-iw, yt + d], [-hw, yt]], grad(P.mid, P.light));
  fill([[-iw, yb + d], [iw, yb + d], [iw, yt + d], [-iw, yt + d]], grad(P.dark, P.mid));
  fill([[iw, yb + d], [hw, yb], [hw, yt], [iw, yt + d]], grad(P.deep, P.dark));
  // heller Streifen in der Mitte (Licht von innen)
  ctx.globalAlpha = 0.55;
  fill([[-iw * 0.35, yb + d - (yb - yt) * 0.15], [iw * 0.35, yb + d - (yb - yt) * 0.15], [iw * 0.35, yt + d], [-iw * 0.35, yt + d]], grad(P.mid, P.tipM));
  ctx.globalAlpha = 1;
  // Spitze aus drei Facetten
  fill([[-hw, yt], [-iw, yt + d], [ax, -h]], P.tipL);
  fill([[-iw, yt + d], [iw, yt + d], [ax, -h]], P.tipM);
  fill([[iw, yt + d], [hw, yt], [ax, -h]], P.tipR);
  // Glanzkante links an der Mittelfläche und am Grat der Spitze, Funkelpunkt
  ctx.strokeStyle = P.glint;
  ctx.lineWidth = Math.max(0.7, w * 0.09);
  ctx.beginPath();
  ctx.moveTo(-iw, yb + d - (yb - yt) * 0.2);
  ctx.lineTo(-iw, yt + d);
  ctx.lineTo(ax, -h + 0.6);
  ctx.stroke();
  if (h > 9) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-iw - 0.2, yt + d - 1.6, 1.2, 1.2);
  }
  ctx.restore();
}
// Farben der Kristalle am Ort (wie die 3D-Kristallgruppen, DECO_COLORS in drei-welt.js): Farbe, zweite Farbe, Felsfarbe,
// Größe, Schnee am Fuß
function kristallFarbe2d(px, py, g) {
  const w = game.world;
  const i = Math.floor(py / TILE) * MAP_W + Math.floor(px / TILE);
  const z = w && w.zoneIdx ? ZONES[w.zoneIdx[i]] : null;
  const st = z ? z.id : '';
  const D = typeof DECO_COLORS !== 'undefined' ? DECO_COLORS[st] : null;
  const snow = g === GROUND.SNOW || g === GROUND.ICE || g === GROUND.NACHTSCHNEE;
  const col = (D && D.crystal) || (snow ? '#7ac8f4' : g === GROUND.BASALT ? '#ff7a2a' : '#9fd0ff');
  return { col, col2: (D && D.crystal2) || lighter(col, 0.2), base: (D && D.crystalBase) || (snow ? '#6a7a8c' : '#4a4652'), s: (D && D.crystalScale) || 1, snow };
}
// Kristallgruppe am Boden: Felssockel mit Steinchen, ein großer Kristall mit Nebenkristallen, kleine Splitter am Fuß.
// Fuß bei (x, y), Größe s (1 = gut eine halbe Kachel hoch), Bauform v (0 Kranz, 1 Zwilling, 2 Fächer)
function kristallGruppe2d(ctx, x, y, s, col, col2, v, base, snow) {
  const P = kristallPal2(col);
  const P2 = kristallPal2(col2 || col);
  ctx.fillStyle = 'rgba(12,8,22,0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 1.5 * s, y + 1, 10.5 * s, 3.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Felssockel: flacher Brocken, oben heller
  const rock = (rx, ry, rw, rh, c) => {
    ctx.fillStyle = darker(c, 0.35);
    ctx.beginPath();
    ctx.moveTo(rx - rw, ry);
    ctx.lineTo(rx - rw * 0.8, ry - rh * 0.7);
    ctx.lineTo(rx - rw * 0.2, ry - rh);
    ctx.lineTo(rx + rw * 0.6, ry - rh * 0.85);
    ctx.lineTo(rx + rw, ry - rh * 0.2);
    ctx.lineTo(rx + rw * 0.7, ry + rh * 0.25);
    ctx.lineTo(rx - rw * 0.6, ry + rh * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(rx - rw * 0.8, ry - rh * 0.55);
    ctx.lineTo(rx - rw * 0.2, ry - rh * 0.9);
    ctx.lineTo(rx + rw * 0.55, ry - rh * 0.75);
    ctx.lineTo(rx + rw * 0.2, ry - rh * 0.3);
    ctx.lineTo(rx - rw * 0.5, ry - rh * 0.25);
    ctx.closePath();
    ctx.fill();
  };
  rock(x, y, 8 * s, 5 * s, base);
  // Kristalle von hinten nach vorn
  const k = (dx, dy, h, w, t, p) => kristall2d(ctx, x + dx * s, y + dy * s, h * s, w * s, t, p);
  if (v === 1) {
    k(4, -3, 15, 5.5, 0.38, P2);
    k(-3, -2.5, 19, 6.5, -0.32, P);
    k(1, -1.5, 8, 3.6, 0.05, P2);
  } else if (v === 2) {
    k(-6, -2.5, 11, 4.4, -0.62, P2);
    k(6, -2.5, 11, 4.4, 0.62, P);
    k(-3, -3, 14, 5, -0.3, P);
    k(3, -3, 14, 5, 0.3, P2);
    k(0, -3.2, 17, 5.6, 0.02, P);
  } else {
    k(-4.5, -3, 12, 4.6, -0.5, P2);
    k(4.5, -2.8, 10, 4.2, 0.55, P);
    k(0, -3.4, 20, 6.8, 0.06, P);
    k(-2, -1.5, 7, 3.4, -0.2, P2);
  }
  // kleine Splitter am Fuß, fast liegend
  k(-9, 0.5, 5, 2.6, -1.1, P2);
  k(8.5, 0.8, 4.5, 2.4, 1.15, P);
  if (snow) {
    ctx.fillStyle = '#f4f8fc';
    ctx.beginPath();
    ctx.ellipse(x - 4 * s, y + 0.5, 4.5 * s, 1.8 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 5 * s, y + 0.8, 3.5 * s, 1.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Schmuck am Boden in 2D (seit 15.80) ------------------------------------------------------------------------
// Bis 15.79 waren Baumstümpfe, Stämme, Pilze, Knochen, Büsche, tote Bäumchen und Kiesel in 2D nur ein paar Flächen in
// einer Farbe (zwei Ellipsen, ein Rechteck, drei Striche) – auf allen Karten fiel das als „primitiv“ auf. Jetzt kleine
// gemalte Bilder wie die 3D-Formen: dunkler Umriss, Licht von oben links, Schatten am Boden, Farben des Gebiets
// (DECO_BASE3/DECO_COLORS aus drei-welt.js, dieselben wie in 3D). Gemalt beim Backen der Bodenblöcke – kostet beim
// Spielen nichts. Alles bleibt in der eigenen Kachel (sonst am Rand eines Bodenblocks abgeschnitten).
const DECO2_FARBEN = new Map();
function decoFarben2(px, py) {
  const w = game.world;
  const i = Math.floor(py / TILE) * MAP_W + Math.floor(px / TILE);
  const z = w && w.zoneIdx ? ZONES[w.zoneIdx[i]] : null;
  const id = z ? z.id : '';
  let c = DECO2_FARBEN.get(id);
  if (!c) {
    const base = typeof DECO_BASE3 !== 'undefined' ? DECO_BASE3 : { wood: '#6b4a2e', cut: '#d8b080', ring: '#a07850', bush: '#356e2c', bushTop: '#7ab84a', berry: '#d8343a', moss: '#4f7a32', cap: '#c84a3a', capDot: '#f4f0e8', stem: '#efe6cc', bone: '#e8e0c8' };
    c = Object.assign({}, base, (typeof DECO_COLORS !== 'undefined' && DECO_COLORS[id]) || {});
    DECO2_FARBEN.set(id, c);
  }
  return c;
}
const DECO2_OUT = 'rgba(22,14,10,0.78)';
// Fläche füllen und dunkel umranden (pts: Punkte oder Funktion, die den Pfad legt)
function deco2Flaeche(ctx, pts, fill, out = DECO2_OUT, lw = 1.2) {
  ctx.beginPath();
  if (typeof pts === 'function') pts();
  else {
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }
  ctx.fillStyle = fill;
  ctx.fill();
  if (out) {
    ctx.strokeStyle = out;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}
function deco2Schatten(ctx, x, y, rx, ry, a = 0.26) {
  ctx.fillStyle = `rgba(10,8,6,${a})`;
  ctx.beginPath();
  ctx.ellipse(x + 1.5, y + 0.6, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
// Kiesel: zwei, drei Steinchen in einem dunkleren Ton des Bodens mit heller Oberseite (zurückhaltend – Kiesel liegen
// auf manchen Karten zu Hunderten)
function deco2Kiesel(ctx, x, y, h, g) {
  const pal = GROUND_PALETTE[g] || GROUND_PALETTE[GROUND.PATH];
  const stein = mixColor(pal[1], '#6a6258', 0.4);
  const n = 2 + (h % 2);
  for (let k = 0; k < n; k++) {
    const sx = x + [0, 7, -5][k];
    const sy = y + [0, -4, 3][k];
    const r = [2.2, 1.6, 1.4][k];
    deco2Schatten(ctx, sx, sy + 0.6, r + 0.4, r * 0.45, 0.14);
    deco2Flaeche(ctx, () => ctx.ellipse(sx, sy, r, r * 0.72, 0, 0, Math.PI * 2), stein, 'rgba(30,24,18,0.3)', 0.8);
    ctx.fillStyle = 'rgba(255,250,235,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx - r * 0.3, sy - r * 0.3, r * 0.45, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
// Baumstumpf: Rinde mit Furchen, Wurzeln, Schnittfläche mit Jahresringen, Moos
function deco2Stumpf(ctx, x, y, c, h) {
  const bark = c.wood;
  deco2Schatten(ctx, x, y, 10, 3);
  for (const [dx, l] of [[-7, -1], [6.5, 1], [-1, 0]]) deco2Flaeche(ctx, [[x + dx - 1.6, y - 2.5], [x + dx + 1.6, y - 2.5], [x + dx + l * 3 + 1.2, y + 1.2], [x + dx + l * 3 - 1.2, y + 1.6]], darker(bark, 0.1), DECO2_OUT, 0.9);
  deco2Flaeche(ctx, () => {
    ctx.moveTo(x - 6, y - 8);
    ctx.lineTo(x - 6.2, y - 0.5);
    ctx.quadraticCurveTo(x, y + 2.4, x + 6.2, y - 0.5);
    ctx.lineTo(x + 6, y - 8);
    ctx.closePath();
  }, bark);
  ctx.strokeStyle = darker(bark, 0.35);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (const fx of [-3, 0.5, 3.5]) {
    ctx.moveTo(x + fx, y - 6.5);
    ctx.lineTo(x + fx + 0.4, y);
  }
  ctx.stroke();
  ctx.fillStyle = lighter(bark, 0.18);
  ctx.fillRect(x - 5.4, y - 7.5, 1.4, 6.5);
  deco2Flaeche(ctx, () => ctx.ellipse(x, y - 8, 6, 2.6, 0, 0, Math.PI * 2), c.cut || '#d8b080', DECO2_OUT, 1);
  ctx.strokeStyle = c.ring || '#a07850';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.ellipse(x, y - 8, 3.8, 1.6, 0, 0, Math.PI * 2);
  ctx.moveTo(x + 1.6, y - 8);
  ctx.ellipse(x, y - 8, 1.6, 0.7, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (c.moss && !c.snowy && (h >> 3) % 2) {
    ctx.fillStyle = c.moss;
    ctx.beginPath();
    ctx.ellipse(x + 3.5, y - 3, 2.6, 2, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (c.snowy) deco2Flaeche(ctx, () => ctx.ellipse(x - 0.5, y - 8.5, 5.2, 2, 0, 0, Math.PI * 2), '#f4f8fc', 'rgba(120,140,170,0.5)', 0.8);
}
// liegender Stamm: Rinde mit Längsfurchen, Schnittfläche vorn, Aststummel, Moos (im Aschewald glühende Risse)
function deco2Stamm(ctx, x, y, c, h) {
  const bark = c.wood;
  const t = (((h >> 5) % 5) - 2) * 0.05;
  ctx.save();
  ctx.translate(x, y - 3);
  ctx.rotate(t);
  deco2Schatten(ctx, 0, 3.5, 13, 2.6);
  deco2Flaeche(ctx, () => ctx.roundRect(-12, -4, 21, 7.5, 3.5), bark);
  ctx.fillStyle = darker(bark, 0.28);
  ctx.fillRect(-11, 0.8, 19, 2);
  ctx.fillStyle = lighter(bark, 0.16);
  ctx.fillRect(-10.5, -3.2, 18, 1.2);
  ctx.strokeStyle = darker(bark, 0.4);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-9, -1);
  ctx.lineTo(-2, -1.2);
  ctx.moveTo(0, 0.2);
  ctx.lineTo(6, 0);
  ctx.stroke();
  deco2Flaeche(ctx, [[-4, -3.5], [-2.4, -3.5], [-1.6, -7.5], [-3.4, -7.8]], bark, DECO2_OUT, 0.9);
  deco2Flaeche(ctx, () => ctx.ellipse(9, -0.3, 2.6, 3.9, 0, 0, Math.PI * 2), c.cut || '#d8b080', DECO2_OUT, 1);
  ctx.strokeStyle = c.ring || '#a07850';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.ellipse(9, -0.3, 1.3, 2.1, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (c.moss && !c.snowy) {
    ctx.fillStyle = c.moss;
    ctx.beginPath();
    ctx.ellipse(-6, -3.6, 3.4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (c.ember) {
    ctx.strokeStyle = c.ember;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-8, 0.5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(2, 0.8);
    ctx.stroke();
  }
  ctx.restore();
}
// Pilzgruppe: drei Pilze mit gepunkteten Hüten (im Moor und auf der Schattenseite leuchtende Farben, ohne Schein am
// Boden)
function deco2Pilze(ctx, x, y, c, g, h) {
  const cap = g === GROUND.SWAMP && !c.capGlow ? '#7ad86a' : c.cap || '#c84a3a';
  deco2Schatten(ctx, x, y, 9, 2.4);
  const pilz = (dx, dy, s) => {
    const qx = x + dx;
    const qy = y + dy;
    deco2Flaeche(ctx, () => ctx.roundRect(qx - 1.3 * s, qy - 5 * s, 2.6 * s, 5 * s, 1.1 * s), c.stem || '#efe6cc', DECO2_OUT, 0.9);
    deco2Flaeche(ctx, () => {
      ctx.moveTo(qx - 4.4 * s, qy - 4.6 * s);
      ctx.quadraticCurveTo(qx - 4 * s, qy - 9.6 * s, qx, qy - 9.8 * s);
      ctx.quadraticCurveTo(qx + 4 * s, qy - 9.6 * s, qx + 4.4 * s, qy - 4.6 * s);
      ctx.closePath();
    }, cap);
    ctx.fillStyle = darker(cap, 0.3);
    ctx.fillRect(qx - 3.8 * s, qy - 5.4 * s, 7.6 * s, 0.9 * s);
    ctx.fillStyle = c.capDot || '#f4f0e8';
    for (const [ex, ey, r] of [[-1.8, -7.6, 0.9], [1.4, -8.4, 0.7], [2.4, -6.2, 0.6]]) {
      ctx.beginPath();
      ctx.arc(qx + ex * s, qy + ey * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  pilz(5, -1.5, 0.7);
  pilz(-1, 0, 1);
  pilz(-6.5, 1, 0.62);
}
// Knochen: zwei gekreuzte Röhrenknochen mit Gelenkköpfen, daneben ein kleiner Schädel
function deco2Knochen(ctx, x, y, c, h) {
  const bone = c.bone || '#e8e0c8';
  const flip = (h >> 6) % 2 ? -1 : 1;
  deco2Schatten(ctx, x, y + 1, 10, 2.6, 0.22);
  const knochen = (x0, y0, x1, y1) => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = DECO2_OUT;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.fillStyle = DECO2_OUT;
    for (const [qx, qy] of [[x0, y0], [x1, y1]]) {
      ctx.beginPath();
      ctx.arc(qx, qy, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = bone;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.fillStyle = bone;
    for (const [qx, qy] of [[x0, y0], [x1, y1]]) {
      ctx.beginPath();
      ctx.arc(qx - 0.7, qy - 0.4, 1.3, 0, Math.PI * 2);
      ctx.arc(qx + 0.7, qy + 0.5, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineCap = 'butt';
  };
  knochen(x - 8 * flip, y - 1, x + 3 * flip, y + 1.5);
  knochen(x - 5 * flip, y + 2.5, x + 2 * flip, y - 3.5);
  // Schädel
  const sx = x + 6 * flip;
  const sy = y - 3;
  deco2Flaeche(ctx, () => ctx.roundRect(sx - 2.4, sy + 1.2, 4.8, 2.6, 1), darker(bone, 0.08), DECO2_OUT, 0.9);
  deco2Flaeche(ctx, () => ctx.ellipse(sx, sy, 3.6, 3.1, 0, 0, Math.PI * 2), bone, DECO2_OUT, 1);
  ctx.fillStyle = '#2a2018';
  ctx.beginPath();
  ctx.ellipse(sx - 1.3, sy + 0.3, 1, 1.1, 0, 0, Math.PI * 2);
  ctx.ellipse(sx + 1.3, sy + 0.3, 1, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(sx - 2, sy - 2.2, 2, 1);
}
// Busch: Bausche von dunkel (unten) bis hell (oben), Beeren oder Blüten
function deco2Busch(ctx, x, y, c, h) {
  const B = [[-5, -3.5, 4.6], [5, -3, 4.4], [0, -4.5, 5.4], [-2.5, -8.5, 4.2], [3, -8, 4]];
  deco2Schatten(ctx, x, y, 11, 3);
  ctx.fillStyle = DECO2_OUT;
  ctx.beginPath();
  for (const [bx, by, r] of B) {
    ctx.moveTo(x + bx + r + 1, y + by);
    ctx.arc(x + bx, y + by, r + 1, 0, Math.PI * 2);
  }
  ctx.fill();
  const bush = c.bush || '#356e2c';
  const top = c.bushTop || '#7ab84a';
  B.forEach(([bx, by, r], k) => {
    ctx.fillStyle = k < 3 ? bush : mixColor(bush, top, 0.5);
    ctx.beginPath();
    ctx.arc(x + bx, y + by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.arc(x + bx - r * 0.3, y + by - r * 0.35, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
  const berry = c.berry || '#d8343a';
  for (const [bx, by] of [[-4, -5], [3.5, -3.5], [0.5, -10], [5.5, -8]].slice(0, 2 + (h % 3))) {
    ctx.fillStyle = berry;
    ctx.beginPath();
    ctx.arc(x + bx, y + by, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(x + bx - 0.6, y + by - 0.8, 0.6, 0.6);
  }
}
// totes Bäumchen: Stamm mit Wurzelfuß, abgebrochene Spitze, kahle Äste mit Gabeln (am Feuerberg glühende Risse)
function deco2Totholz(ctx, x, y, c, g, h) {
  const bark = c.char || c.wood || '#4a3527';
  const m = (h >> 7) % 2 ? -1 : 1;
  deco2Schatten(ctx, x, y, 8, 2.4);
  const ast = (x0, y0, x1, y1, w0, w1) => {
    const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    deco2Flaeche(ctx, [[x0 + ca * w0, y0 + sa * w0], [x1 + ca * w1, y1 + sa * w1], [x1 - ca * w1, y1 - sa * w1], [x0 - ca * w0, y0 - sa * w0]], bark, DECO2_OUT, 1);
  };
  deco2Flaeche(ctx, [[x - 6, y + 0.5], [x - 2.5, y - 3], [x + 2.5, y - 3], [x + 6, y + 0.5]], darker(bark, 0.15), DECO2_OUT, 1);
  ast(x + 2 * m, y - 12, x + 7 * m, y - 17, 1.4, 0.6);
  ast(x - 1 * m, y - 9, x - 6 * m, y - 13, 1.3, 0.5);
  ast(x, y, x + 0.6 * m, y - 20, 2.6, 1.4);
  ast(x + 5 * m, y - 15.5, x + 5.5 * m, y - 19, 0.6, 0.3);
  // Bruchkante mit Splittern
  deco2Flaeche(ctx, [[x - 1, y - 19.5], [x + 0.2 * m, y - 22.5], [x + 0.9 * m, y - 20.2], [x + 2 * m, y - 21.8], [x + 2.2 * m, y - 19.3]], lighter(bark, 0.2), DECO2_OUT, 0.8);
  ctx.fillStyle = lighter(bark, 0.2);
  ctx.fillRect(x - 1.7, y - 17, 1, 14);
  if (c.ember) {
    ctx.strokeStyle = c.ember;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x + 0.4, y - 3);
    ctx.lineTo(x - 0.4, y - 8);
    ctx.lineTo(x + 0.6, y - 12);
    ctx.stroke();
  }
  if (c.snowy) deco2Flaeche(ctx, () => ctx.ellipse(x + 5 * m, y - 16.4, 2.4, 0.9, 0, 0, Math.PI * 2), '#f4f8fc', null);
}

function bridgeHoriz(x, y) {
  // seit 14.16: Brücken und Stege in den Städten wissen ihre Richtung (welt.js BRIDGE_DIR)
  const fix = typeof bridgeDirAt === 'function' ? bridgeDirAt(x, y) : undefined;
  if (fix !== undefined) return fix;
  const w = game.world;
  const way = (tx, ty) => w.ground[ty * MAP_W + tx] === GROUND.PATH || w.deco[ty * MAP_W + tx] === DECO.BRIDGE;
  return way(x - 1, y) && way(x + 1, y);
}

// Brückenarten in den Städten (seit 14.16, bridgeStyleAt in welt.js): Steg über dem Moor, Steinbrücke über Lava,
// Lichtbrücke über dem Abgrund; sonst die Holzbrücke wie bisher. Seit 14.76 auch Eis- und Hängebrücke.
const BRIDGE2 = {
  steg: { deck: '#6e5a40', line: 'rgba(30,20,10,0.45)', rail: null, post: '#3e3022' },
  stein: { deck: '#5a5250', line: 'rgba(20,14,12,0.5)', rail: '#3a3230', post: null },
  licht: { deck: '#8a86d8', line: 'rgba(230,226,255,0.55)', rail: '#d8d4ff', post: null },
  eis: { deck: '#cfe6f4', line: 'rgba(120,160,190,0.45)', rail: '#f2faff', post: '#a8cce0' },
  seil: { deck: '#8a6440', line: 'rgba(40,25,10,0.55)', rail: '#c8a878', post: '#5a3a22' }
};
// seit 14.76: Kanten einer Brückenkachel zum Abgrund/Wasser (Bits 1 oben, 2 rechts, 4 unten, 8 links) – nur dort
// Geländer (vorher an jeder Kachel beidseits: eine breite Brücke sah aus wie mehrere schmale nebeneinander)
function bridgeEdges2(x, y) {
  const w = game.world;
  let m = 0;
  [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], k) => {
    const j = (y + dy) * MAP_W + x + dx;
    if (w.deco[j] !== DECO.BRIDGE && LIQUID.has(w.ground[j])) m |= 1 << k;
  });
  return m;
}
function drawBridge2(ctx, px, py, horiz, style, edges = horiz ? 5 : 10) {
  const B = BRIDGE2[style] || { deck: '#8a6a44', line: 'rgba(40,25,10,0.35)', rail: '#5a3f26', post: null };
  ctx.fillStyle = B.deck;
  ctx.fillRect(px, py, TILE + 0.5, TILE + 0.5);
  ctx.fillStyle = B.line;
  for (let k = 0; k < 4; k++) {
    if (horiz) ctx.fillRect(px + k * 8 + 3, py, 1.2, TILE);
    else ctx.fillRect(px, py + k * 8 + 3, TILE, 1.2);
  }
  const rail = B.rail || B.post;
  if (!rail || !edges) return;
  ctx.fillStyle = rail;
  const t = B.rail ? 3 : 0;
  if (t) {
    if (edges & 1) ctx.fillRect(px, py, TILE, t);
    if (edges & 4) ctx.fillRect(px, py + TILE - t, TILE, t);
    if (edges & 8) ctx.fillRect(px, py, t, TILE);
    if (edges & 2) ctx.fillRect(px + TILE - t, py, t, TILE);
  }
  if (B.post) {
    // Pfosten auf den Kanten zum Abgrund (in der Mitte und an der Ecke)
    ctx.fillStyle = B.post;
    if (edges & 1) ctx.fillRect(px + TILE / 2 - 2, py, 4, 4);
    if (edges & 4) ctx.fillRect(px + TILE / 2 - 2, py + TILE - 4, 4, 4);
    if (edges & 8) ctx.fillRect(px, py + TILE / 2 - 2, 4, 4);
    if (edges & 2) ctx.fillRect(px + TILE - 4, py + TILE / 2 - 2, 4, 4);
  }
}

// --- Bäume und Felsen ------------------------------------------------------------------

// Krone aus überlappenden Kugeln: Schatten, Grundton, Licht oben links
function crown(ctx, blobs, colors) {
  const [shadow, base, light, spark] = colors;
  for (const [x, y, r] of blobs) dot(ctx, x + 1.5, y + 2.5, r, r, shadow);
  for (const [x, y, r] of blobs) dot(ctx, x, y, r, r, base);
  for (const [x, y, r] of blobs) if (y < -30) dot(ctx, x - r * 0.3, y - r * 0.32, r * 0.6, r * 0.55, light);
  for (const [x, y, r] of blobs) if (y < -38) dot(ctx, x - r * 0.4, y - r * 0.45, r * 0.25, r * 0.22, spark);
}

const TREE_BLOBS = [
  [[0, -36, 16], [-12, -28, 12], [12, -29, 12], [-7, -46, 11], [8, -45, 11], [0, -24, 12], [-16, -38, 9], [16, -38, 9]],
  [[0, -38, 15], [-13, -30, 11], [11, -27, 13], [-5, -49, 10], [10, -44, 11], [-2, -25, 11], [-16, -40, 8], [17, -36, 8]],
  [[0, -35, 17], [-11, -27, 12], [13, -30, 11], [-8, -45, 12], [6, -48, 10], [2, -24, 11], [-17, -35, 9], [15, -42, 8]]
];

const TREE_ART = {
  tree(ctx, v) {
    poly(ctx, [[-4, 0], [-3, -20], [3, -20], [4, 0], [7, 1.5], [-7, 1.5]], '#6b4a2e');
    stroke(ctx, '#4a3220', 0.8, [[-1, -3], [-1.5, -14]]);
    crown(ctx, TREE_BLOBS[v], ['#2a5226', '#3d7633', '#5a9a46', '#86c262']);
  },
  blossom(ctx, v) {
    poly(ctx, [[-4, 0], [-3, -18], [-7, -26], [-4, -27], [0, -21], [4, -28], [6, -26], [3, -18], [4, 0], [7, 1.5], [-7, 1.5]], '#5a3a2e');
    crown(ctx, TREE_BLOBS[v], ['#a85274', '#e08aa6', '#f5b8cb', '#ffe4ee']);
    for (const [x, y] of [[-12, -38], [6, -30], [10, -44], [-4, -48], [14, -34]]) dot(ctx, x, y, 1.2, 1.2, '#ffffff');
  },
  pine(ctx, v, style) {
    const snowy = style === 'frost';
    box(ctx, -2.5, -12, 5, 13, 1, '#5a3f2a');
    const tiers = 4 + (v === 2 ? 1 : 0);
    for (let k = 0; k < tiers; k++) {
      const y = -8 - k * 12;
      const hw = 20 - k * (16 / tiers) - (v === 1 ? 2 : 0);
      const pts = [[-hw, y]];
      for (let j = 1; j < 6; j++) pts.push([-hw + (2 * hw * j) / 6, y + (j % 2 ? 2.5 : 0)]);
      pts.push([hw, y], [0, y - 24]);
      poly(ctx, pts, snowy ? '#2a4a48' : '#245242');
      poly(ctx, [[-hw * 0.9, y - 1], [-2, y - 1], [0, y - 22]], snowy ? '#3a5e5c' : '#346a55');
      // Schneehauben auf jeder Stufe
      if (snowy) poly(ctx, [[-hw * 0.55, y - 9], [0, y - 24], [hw * 0.55, y - 9], [hw * 0.2, y - 7], [0, y - 10], [-hw * 0.3, y - 6]], '#f4f8fc');
    }
    dot(ctx, -2, -8 - (tiers - 1) * 12 - 16, 1.6, 2.5, '#5a9a7a');
  },
  dead(ctx, v, style) {
    const bark = style === 'vulkan' ? '#2a1e1a' : style === 'moor' ? '#3a3a2a' : '#4a3527';
    const branch = (x0, y0, x1, y1, w0, w1) => {
      const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      poly(ctx, [[x0 + c * w0, y0 + s * w0], [x1 + c * w1, y1 + s * w1], [x1 - c * w1, y1 - s * w1], [x0 - c * w0, y0 - s * w0]], bark);
    };
    const m = v === 1 ? -1 : 1;
    branch(0, 1, 1 * m, -30, 4.5, 2.2);
    branch(0.5 * m, -14, 12 * m, -26, 2, 0.8);
    branch(0.8 * m, -22, -10 * m, -36, 1.8, 0.7);
    branch(1 * m, -28, 4 * m, -42, 1.5, 0.6);
    if (v === 2) branch(0, -8, -9, -16, 1.6, 0.6);
    poly(ctx, [[-6, 1.5], [-2, -3], [2, -3], [7, 1.5]], '#3a2a1e');
    // Moos hängt im Totenmoor von den Ästen, am Feuerberg glühen die Risse
    if (style === 'moor') for (const [x, y] of [[10 * m, -25], [-8 * m, -34], [3 * m, -40]]) poly(ctx, [[x - 2, y], [x + 2, y], [x + 1, y + 9], [x - 0.5, y + 6]], '#5a7a4a');
    if (style === 'vulkan') for (const [x, y] of [[0.5, -10], [1 * m, -22]]) stroke(ctx, '#ff7a2a', 0.9, [[x, y], [x + 1, y - 4]]);
  }
};

// Felsen je Zone: graues Gestein, bemoost im Wald, Sandstein in der Rostschlucht, Basalt im Ödland
const ROCK_STYLES = {
  wiesen: ['#7d7a74', '#9c9890', null],
  dorf: ['#7d7a74', '#9c9890', null],
  wald: ['#6a6c66', '#878a82', '#4f7a3a'],
  orktal: ['#a07a50', '#c29a6a', null],
  oedland: ['#454048', '#5c5660', null],
  frost: ['#8a96a4', '#eef4fa', null],
  moor: ['#4a4e40', '#626a52', '#4a6a3a'],
  vulkan: ['#2a2224', '#3e3436', null],
  oasenlager: ['#b08a5a', '#d0aa7a', null],
  sandwueste: ['#b08a5a', '#d0aa7a', null],
  nagadschungel: ['#5a6a52', '#76866a', '#4a7a3a'],
  klammwacht: ['#7a5a48', '#9a7a62', null],
  donnerklamm: ['#7a5a48', '#9a7a62', null],
  titanenkamm: ['#2e2628', '#443a3c', null]
};

function rockArt(ctx, style, v) {
  const [base, top, moss] = ROCK_STYLES[style] || ROCK_STYLES.wiesen;
  const s = [1, 0.85, 1.15][v];
  ctx.scale(s, s);
  poly(ctx, [[-14, 0], [-15, -9], [-9, -18], [2, -21], [12, -15], [15, -5], [13, 0]], base);
  poly(ctx, [[-9, -18], [2, -21], [12, -15], [5, -11], [-6, -12]], top);
  stroke(ctx, darker(base, 0.4), 0.9, [[-2, -11], [0, -5], [-3, -1]]);
  if (moss) {
    dot(ctx, -6, -17, 4, 2.2, moss);
    dot(ctx, 4, -19, 3, 1.6, moss);
  }
  if (v === 2) poly(ctx, [[10, 1], [11, -5], [16, -7], [20, -2], [19, 1]], base);
  if (style === 'vulkan' || style === 'titanenkamm') stroke(ctx, '#ff7a2a', 1.1, [[-8, -6], [-3, -9], [1, -4]]);
}

const TREE_BOUNDS = { x: -34, y: -82, w: 68, h: 90 };

function objectSprite(kind, v, style) {
  if (kind === 'rock') return getSprite(`o:rock:${style}:${v}`, { x: -24, y: -30, w: 50, h: 36 }, (ctx) => rockArt(ctx, style, v));
  return getSprite(`o:${kind}:${v}:${style}`, TREE_BOUNDS, (ctx) => TREE_ART[kind](ctx, v, style));
}

// --- Dorfmauer ---------------------------------------------------------------------------
// Ursprung ist die Mitte der unteren Kachelkante. Waagerechte Mauerstücke zeigen ihre Front,
// senkrechte nur ihr Dach; aneinandergesetzt ergeben sie eine durchgehende Mauer.

const WALL_ROOF = '#3e4656';

function wallArt(ctx, dir) {
  if (dir === 'h') {
    box(ctx, -16.5, -9, 33, 9, 1, '#7a746a');
    for (const x of [-10, 2, 12]) stroke(ctx, '#5a554c', 0.8, [[x, -9], [x, 0]]);
    stroke(ctx, '#5a554c', 0.8, [[-16, -4.5], [16, -4.5]]);
    box(ctx, -16.5, -32, 33, 24, 1, '#dccaa4');
    box(ctx, -16.5, -32, 33, 3.5, 1, '#5a3a22');
    box(ctx, -16.5, -32, 4, 24, 1, '#5a3a22');
    // kleine Schießscharte
    box(ctx, 2, -24, 5, 8, 1, '#3a2a1c');
    paintShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-18, -31); ctx.lineTo(18, -31); ctx.lineTo(16, -42); ctx.lineTo(-16, -42); ctx.closePath(); }, WALL_ROOF, -18, -42, 36, 11);
    for (let x = -14; x <= 14; x += 5) stroke(ctx, darker(WALL_ROOF, 0.4), 0.7, [[x * 0.92, -42], [x, -31]]);
    stroke(ctx, lighter(WALL_ROOF, 0.3), 1.6, [[-18, -31.5], [18, -31.5]]);
    box(ctx, -17, -45, 34, 4, 1.5, darker(WALL_ROOF, 0.35));
    return;
  }
  box(ctx, -8, -40, 16, 40, 1, '#dccaa4');
  box(ctx, -8, -12, 16, 12, 1, '#7a746a');
  // seit 15.58 nahtlos aneinander: Dach mit First in Laufrichtung, links die helle, rechts die dunkle Dachseite, ohne
  // Verlauf (der wiederholte sich vorher je Kachel als Streifen); Ziegelreihen alle 8 Einheiten, das passt in die 32
  // Einheiten je Kachel, so laufen die Reihen über die Fugen weiter
  ctx.fillStyle = lighter(WALL_ROOF, 0.12);
  ctx.fillRect(-10.5, -50, 10.5, 36);
  ctx.fillStyle = darker(WALL_ROOF, 0.16);
  ctx.fillRect(0, -50, 10.5, 36);
  for (let y = -46; y < -14; y += 8) {
    stroke(ctx, darker(WALL_ROOF, 0.3), 0.9, [[-9.5, y], [-2.5, y]]);
    stroke(ctx, darker(WALL_ROOF, 0.42), 0.9, [[2.5, y], [9.5, y]]);
  }
  ctx.fillStyle = lighter(WALL_ROOF, 0.3);
  ctx.fillRect(-1.6, -50, 3.2, 36);
}

// Mauerarten der Städte mit eigener Form (seit 14.16, welt.js WALL_STYLE): Palisade aus angespitzten Pfählen,
// niedrige Stützmauer einer Terrasse mit Schnee obendrauf, Kristallwand aus violetten Blöcken mit hellem Saum
const WALL2 = {
  palisade(ctx, dir) {
    const wood = '#7a5434';
    if (dir === 'h') {
      for (let k = 0; k < 6; k++) {
        const x = -16.5 + k * 5.5;
        const top = -36 - ((k * 7) % 3) * 2;
        poly(ctx, [[x, 0], [x, top + 5], [x + 2.75, top], [x + 5.5, top + 5], [x + 5.5, 0]], k % 2 ? wood : lighter(wood, 0.08));
      }
      box(ctx, -17, -26, 34, 3, 1, '#5a3a22');
      box(ctx, -17, -11, 34, 3, 1, '#5a3a22');
      return;
    }
    for (let y = -40; y < 0; y += 6) {
      oval(ctx, 0, y + 3, 4.4, 3.4, wood);
      dot(ctx, -1, y + 2.2, 1.6, 1.1, lighter(wood, 0.3));
    }
  },
  terrasse(ctx, dir) {
    const st = '#8a8a92';
    if (dir === 'h') {
      box(ctx, -16.5, -15, 33, 15, 1, st);
      for (const [x, y] of [[-10, -15], [3, -15], [-4, -8], [9, -8]]) stroke(ctx, darker(st, 0.25), 0.8, [[x, y], [x, y + 7]]);
      stroke(ctx, darker(st, 0.25), 0.8, [[-16, -8], [16, -8]]);
      box(ctx, -17, -18, 34, 5, 2.5, '#f4f8fc');
      return;
    }
    // seit 15.58 ohne Lücken: die Oberseite (Schnee) läuft über die ganze Kachel und deckt die Stirnseite des
    // Stücks dahinter; die Stirnseite selbst sieht man nur am Ende einer Mauer
    box(ctx, -7, -18, 14, 18, 1, st);
    ctx.fillStyle = darker(st, 0.12);
    ctx.fillRect(-7.5, -52, 15, 35);
    ctx.fillStyle = '#f4f8fc';
    ctx.fillRect(-6, -52, 12, 35);
    // Schneewehen: leicht bläuliche Mulden, im Takt von 16 Einheiten (passt zur Kachel)
    ctx.fillStyle = '#d8e4f0';
    for (const y of [-47, -31]) ctx.fillRect(-4, y, 5, 3);
    for (const y of [-40, -24]) ctx.fillRect(1, y, 4, 2.5);
  },
  // seit 15.80 facettierte Kristalle (kristall2d) wie in 3D statt Blöcken mit einem hellen Strich
  kristall(ctx, dir) {
    if (dir === 'h') {
      box(ctx, -16.5, -8, 33, 8, 1, '#2e2850');
      box(ctx, -16.5, -9, 33, 1.6, 0.6, '#8a82c8');
      const cols = ['#9a84f4', '#a898f8', '#86b0f0'];
      for (let k = 0; k < 3; k++) kristall2d(ctx, -11 + k * 11, -8.5, 27 + (k % 2) * 6, 10, (k - 1) * 0.04, kristallPal2(cols[k]));
      return;
    }
    box(ctx, -7, -12, 14, 12, 1, '#2e2850');
    kristall2d(ctx, 0, -12, 34, 12, 0, kristallPal2('#a890ff'));
  }
};
function wallSprite(dir, style) {
  if (style && WALL2[style]) return getSprite('wall:' + dir + ':' + style, { x: -22, y: -56, w: 44, h: 60 }, (ctx) => WALL2[style](ctx, dir));
  return getSprite('wall:' + dir, { x: -22, y: -56, w: 44, h: 60 }, (ctx) => wallArt(ctx, dir));
}

// --- Häuser ------------------------------------------------------------------------------------------------
// Ursprung ist die Mitte der unteren Hauskante. Seit 13.91 in Varianten wie in 3D (welt.js look): Dachform, Wand,
// Schornstein, Anbau, Tür; begehbare Häuser (enter) mit offener Tür. Bis 13.90 sahen alle Häuser aus wie heute
// 'pagode' mit 'fachwerk' (ostasiatisches Ziegeldach, Putz mit Balken, Papierfenster).
const HOUSE2_WALL = {
  fachwerk: { face: '#dcc8a0', base: '#8a8478', trim: '#5a3a22', inner: '#e8dcc0' },
  stein: { face: '#a8a196', base: '#77716a', trim: '#5e584f', inner: '#d8cdb8' },
  holz: { face: '#9a7044', base: '#7a746a', trim: '#5a3a22', inner: '#c8a878' },
  lehm: { face: '#d8b888', base: '#b0906a', trim: '#7a5a3a', inner: '#e4cca0' }
};
// Mitte der Tür (Pixel ab der Hausmitte)
function houseDoorX(h) {
  const L = h.look || {};
  if (h.enter) return (h.enter.door + 1 - h.w / 2) * TILE;
  if (L.door != null) return (L.door - h.w / 2) * TILE;
  const aw = L.annex ? 1.5 * TILE : 0;
  return L.annex === 'e' ? -aw / 2 : L.annex === 'w' ? aw / 2 : 0;
}
// Wandschmuck zwischen x0 und x1 (Wand von top bis -6)
function houseFace2(ctx, L, C, x0, x1, top) {
  const w = L.wall || 'fachwerk';
  if (w === 'fachwerk') {
    const posts = Math.max(3, Math.round((x1 - x0) / TILE) + 2);
    for (let k = 0; k < posts; k++) box(ctx, x0 + ((x1 - x0) * k) / (posts - 1) - 2.5, top, 5, -top - 6, 1, C.trim);
    box(ctx, x0, top + 2, x1 - x0, 4, 1, C.trim);
    return;
  }
  if (w === 'holz') {
    for (let y = top + 5; y < -7; y += 4.5) stroke(ctx, darker(C.face, 0.3), 0.8, [[x0 + 1, y], [x1 - 1, y]]);
    for (const x of [x0 - 1, x1 - 4]) box(ctx, x, top - 1, 5, -top - 5, 1, C.trim);
    return;
  }
  if (w === 'stein') {
    let row = 0;
    for (let y = top + 6; y < -7; y += 6, row++) {
      stroke(ctx, darker(C.face, 0.18), 0.7, [[x0 + 1, y], [x1 - 1, y]]);
      for (let x = x0 + 4 + (row % 2) * 6; x < x1 - 2; x += 12) stroke(ctx, darker(C.face, 0.18), 0.7, [[x, y - 6], [x, y]]);
    }
    for (const x of [x0, x1 - 6]) for (let y = top; y < -8; y += 8) box(ctx, x, y, 6, 6, 0.5, ((y - top) / 8) % 2 ? '#bcb4a6' : '#948c80');
    return;
  }
  box(ctx, x0, -12, x1 - x0, 5, 1, darker(C.face, 0.18));
}
// Fenster (Mitte x, Wand oben bei top)
function houseWindow2(ctx, L, C, x, top, w, roof) {
  const k = L.wall || 'fachwerk';
  if (k === 'fachwerk') {
    box(ctx, x - w / 2, top + 10, w, 14, 1, '#f3e2b0');
    for (let gx = x - w / 2 + 4; gx < x + w / 2 - 2; gx += 5) stroke(ctx, '#8a6a44', 0.7, [[gx, top + 10], [gx, top + 24]]);
    stroke(ctx, '#8a6a44', 0.7, [[x - w / 2, top + 17], [x + w / 2, top + 17]]);
    return;
  }
  if (k === 'lehm') {
    box(ctx, x - 5, top + 10, 10, 11, 4, '#3a2a1c');
    box(ctx, x - 6, top + 21, 12, 2.5, 1, C.trim);
    return;
  }
  box(ctx, x - 6, top + 10, 12, 12, 1, '#efd9a0');
  stroke(ctx, C.trim, 1, [[x, top + 10], [x, top + 22]]);
  box(ctx, x - 7.5, top + 21, 15, 2.5, 0.5, C.trim);
  for (const sx of [-1, 1]) box(ctx, x + sx * 9.5 - 3, top + 9, 6, 14, 1, darker(roof, 0.1));
}
// große Dachfläche ohne den runden Glanz von paintShape (der wirkt auf ganzen Dächern wie Flecken): oben etwas heller
function roofFill2(ctx, path, color, y0, y1) {
  ctx.save();
  path();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, lighter(color, 0.1));
  g.addColorStop(1, darker(color, 0.14));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  path();
  ctx.strokeStyle = darker(color, 0.5);
  ctx.lineWidth = 0.7;
  ctx.stroke();
}
// Dach über x0..x1; gibt die Höhe des Firsts (y) zurück
function houseRoof2(ctx, L, C, roof, x0, x1, eave, ridge) {
  const form = L.roof || 'pagode';
  const W = x1 - x0;
  const mx = (x0 + x1) / 2;
  const shingles = (path, x0s, x1s, top, bottom) => {
    ctx.save();
    path();
    ctx.clip();
    ctx.strokeStyle = darker(roof, 0.35);
    ctx.lineWidth = 0.9;
    for (let k = 1; k < 5; k++) {
      const y = top + ((bottom - top) * k) / 5;
      ctx.beginPath();
      ctx.moveTo(x0s, y);
      ctx.lineTo(x1s, y);
      ctx.stroke();
    }
    ctx.strokeStyle = lighter(roof, 0.12);
    for (let x = x0s; x < x1s; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
    ctx.restore();
  };
  if (form === 'pagode') {
    const ext = 14;
    const roofPath = () => {
      ctx.beginPath();
      ctx.moveTo(x0 - ext - 7, eave - 11);
      ctx.quadraticCurveTo(x0 - ext + 4, eave + 3, x0, eave + 3);
      ctx.lineTo(x1, eave + 3);
      ctx.quadraticCurveTo(x1 + ext - 4, eave + 3, x1 + ext + 7, eave - 11);
      ctx.quadraticCurveTo(x1 + 2, (eave + ridge) / 2, x1 - 12, ridge);
      ctx.lineTo(x0 + 12, ridge);
      ctx.quadraticCurveTo(x0 - 2, (eave + ridge) / 2, x0 - ext - 7, eave - 11);
      ctx.closePath();
    };
    paintShape(ctx, roofPath, roof, x0 - ext - 7, ridge, W + 2 * ext + 14, eave + 3 - ridge);
    ctx.save();
    roofPath();
    ctx.clip();
    ctx.strokeStyle = darker(roof, 0.35);
    ctx.lineWidth = 0.9;
    for (let x = -W / 2 - ext; x < W / 2 + ext; x += 6) {
      ctx.beginPath();
      ctx.moveTo(mx + x * 0.82, ridge);
      ctx.lineTo(mx + x, eave + 3);
      ctx.stroke();
    }
    ctx.strokeStyle = lighter(roof, 0.18);
    for (let k = 1; k < 5; k++) {
      const y = ridge + ((eave - ridge) * k) / 5;
      ctx.beginPath();
      ctx.moveTo(x0 - ext, y + 3);
      ctx.quadraticCurveTo(mx, y - 2, x1 + ext, y + 3);
      ctx.stroke();
    }
    ctx.restore();
    stroke(ctx, lighter(roof, 0.3), 2.2, [[x0 - 2, eave + 2], [x1 + 2, eave + 2]]);
    box(ctx, x0 + 8, ridge - 5, W - 16, 7, 2, darker(roof, 0.4));
    poly(ctx, [[x0 + 8, ridge - 5], [x0 + 2, ridge - 13], [x0 + 6, ridge - 13], [x0 + 13, ridge - 4]], darker(roof, 0.4));
    poly(ctx, [[x1 - 8, ridge - 5], [x1 - 2, ridge - 13], [x1 - 6, ridge - 13], [x1 - 13, ridge - 4]], darker(roof, 0.4));
    return ridge;
  }
  if (form === 'walm') {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x0 - 9, eave + 3);
      ctx.lineTo(x1 + 9, eave + 3);
      ctx.lineTo(x1 - 14, ridge + 5);
      ctx.lineTo(x0 + 14, ridge + 5);
      ctx.closePath();
    };
    roofFill2(ctx, path, roof, ridge + 5, eave + 3);
    shingles(path, x0 - 9, x1 + 9, ridge + 5, eave + 3);
    stroke(ctx, lighter(roof, 0.3), 2, [[x0 - 8, eave + 2], [x1 + 8, eave + 2]]);
    box(ctx, x0 + 12, ridge + 2, W - 24, 5, 2, darker(roof, 0.4));
    return ridge + 5;
  }
  if (form === 'flach') {
    const top = ridge + 18;
    roofFill2(ctx, () => { ctx.beginPath(); ctx.roundRect(x0 - 4, top, W + 8, eave + 4 - top, 2); }, lighter(C.face, 0.05), top, eave + 4);
    roofFill2(ctx, () => { ctx.beginPath(); ctx.roundRect(x0 + 1, top + 4, W - 2, eave - top - 6, 1); }, roof, top + 4, eave - 2);
    box(ctx, x0 - 4, eave - 1, W + 8, 5, 1, C.face);
    for (let x = x0 + 8; x < x1 - 4; x += 16) box(ctx, x, eave + 4, 4, 4, 0.5, C.trim);
    box(ctx, mx + W * 0.18, top - 8, 26, 16, 2, C.face);
    return top;
  }
  if (form === 'sattel') {
    const front = () => {
      ctx.beginPath();
      ctx.moveTo(x0 - 9, eave + 3);
      ctx.lineTo(x1 + 9, eave + 3);
      ctx.lineTo(x1 + 6, ridge + 9);
      ctx.lineTo(x0 - 6, ridge + 9);
      ctx.closePath();
    };
    poly(ctx, [[x0 - 6, ridge + 9], [x1 + 6, ridge + 9], [x1 + 4, ridge], [x0 - 4, ridge]], darker(roof, 0.22));
    roofFill2(ctx, front, roof, ridge + 9, eave + 3);
    shingles(front, x0 - 9, x1 + 9, ridge + 9, eave + 3);
    stroke(ctx, lighter(roof, 0.3), 2, [[x0 - 8, eave + 2], [x1 + 8, eave + 2]]);
    box(ctx, x0 - 6, ridge + 6, W + 12, 5, 2, darker(roof, 0.4));
    return ridge;
  }
  // Giebel nach vorn: Dreieck in Wandfarbe, zwei Dachflächen nach links und rechts
  const rise = 24;
  const apex = eave + 3 - rise;
  poly(ctx, [[x0 + 9, eave + 4], [x1 - 9, eave + 4], [mx, apex + 6]], C.face);
  if (L.wall === 'fachwerk' || L.wall === 'holz') {
    stroke(ctx, C.trim, 2.2, [[mx, apex + 7], [mx, eave + 4]]);
    stroke(ctx, C.trim, 2, [[x0 + 20, eave + 1], [x1 - 20, eave + 1]]);
  } else box(ctx, mx - 4, apex + 13, 8, 7, 3, '#3a2a1c');
  for (const s of [-1, 1]) {
    const ex = s < 0 ? x0 - 8 : x1 + 8;
    const pts = [[ex, eave + 3], [mx, apex], [mx, ridge], [ex, ridge + rise]];
    const path = () => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    };
    const col = s < 0 ? roof : darker(roof, 0.15);
    roofFill2(ctx, path, col, ridge, eave + 3);
    ctx.save();
    path();
    ctx.clip();
    ctx.strokeStyle = darker(roof, 0.35);
    ctx.lineWidth = 0.9;
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      ctx.beginPath();
      ctx.moveTo(ex + (mx - ex) * t, eave + 3 + (apex - eave - 3) * t);
      ctx.lineTo(ex + (mx - ex) * t, ridge + rise + (ridge - ridge - rise) * t);
      ctx.stroke();
    }
    ctx.restore();
    stroke(ctx, lighter(roof, 0.3), 2, [[ex, eave + 2], [mx, apex - 1]]);
  }
  stroke(ctx, darker(roof, 0.4), 4, [[mx, apex], [mx, ridge]]);
  return ridge;
}
function houseArt(ctx, h) {
  const L = h.look || {};
  const C = HOUSE2_WALL[L.wall] || HOUSE2_WALL.fachwerk;
  const W = h.w * TILE;
  const H = h.h * TILE;
  const wallTop = -Math.min(H * 0.52, 58) - ((L.tall || 1) - 1) * 26 - (h.enter ? 6 : 0);
  const aw = L.annex ? 1.5 * TILE : 0;
  const x0 = -W / 2 + (L.annex === 'w' ? aw : 0);
  const x1 = W / 2 - (L.annex === 'e' ? aw : 0);
  const roof = h.roof;
  // Anbau: niedriger Schuppen mit Pultdach und Brennholz
  if (aw) {
    const sx = L.annex === 'e' ? 1 : -1;
    const a0 = sx > 0 ? x1 - 6 : -W / 2 + 2;
    const a1 = sx > 0 ? W / 2 - 2 : x0 + 6;
    const at = wallTop * 0.62;
    box(ctx, a0, -6, a1 - a0, 7, 1.5, C.base);
    box(ctx, a0 + 2, at, a1 - a0 - 4, -at - 5, 1, L.wall === 'lehm' ? C.face : '#8a6440');
    for (let y = at + 5; y < -7; y += 4.5) stroke(ctx, '#5a3a22', 0.7, [[a0 + 3, y], [a1 - 3, y]]);
    const hi = sx > 0 ? [a0 - 2, at - 12] : [a1 + 2, at - 12];
    const lo = sx > 0 ? [a1 + 5, at + 2] : [a0 - 5, at + 2];
    poly(ctx, [hi, lo, [lo[0], lo[1] + 6], [hi[0], hi[1] + 6]], roof);
    for (const [x, y] of [[-7, -4], [0, -4], [7, -4], [-3.5, -10], [3.5, -10]]) {
      oval(ctx, (a0 + a1) / 2 + x, y, 3.6, 3.3, '#7a5434');
      dot(ctx, (a0 + a1) / 2 + x, y, 2.2, 2, '#d8b88a');
    }
  }
  // Sockel und Wände
  box(ctx, x0 + 4, -7, x1 - x0 - 8, 9, 2, C.base);
  box(ctx, x0 + 9, wallTop, x1 - x0 - 18, -wallTop - 6, L.wall === 'lehm' ? 4 : 1.5, C.face);
  houseFace2(ctx, L, C, x0 + 9, x1 - 9, wallTop);
  const doorX = houseDoorX(h);
  const doorW = h.enter ? 2 * TILE - 12 : L.tor ? 44 : 20;
  // Fenster zwischen den Balken bzw. gleichmäßig, nicht an der Tür
  const n = Math.max(2, Math.round((x1 - x0 - 18) / 34));
  for (let k = 0; k < n; k++) {
    const x = x0 + 9 + ((x1 - x0 - 18) * (k + 0.5)) / n;
    if (Math.abs(x - doorX) < doorW / 2 + 12) continue;
    houseWindow2(ctx, L, C, x, wallTop, Math.min(22, (x1 - x0 - 18) / n - 10), roof);
  }
  // Tür: offen bei begehbaren Häusern, Scheunentor, Brettertür oder zweiflüglig
  if (h.enter) {
    box(ctx, doorX - doorW / 2 - 3, -40, doorW + 6, 36, 1.5, C.trim);
    box(ctx, doorX - doorW / 2, -37, doorW, 31, 1, '#2a1c14');
    box(ctx, doorX - doorW / 2 + 2, -14, doorW - 4, 8, 1, '#6a5034');
    dot(ctx, doorX + doorW / 2 - 9, -28, 5, 4, 'rgba(255,170,80,0.25)');
  } else if (L.tor) {
    box(ctx, doorX - 22, -38, 44, 32, 1.5, '#5a3a22');
    for (const sx of [-1, 1]) {
      box(ctx, doorX + sx * 10.5 - 9.5, -36, 19, 29, 1, '#7a5434');
      stroke(ctx, '#4a2e1c', 2, [[doorX + sx * 10.5 - 8, -35], [doorX + sx * 10.5 + 8, -9]]);
    }
  } else {
    box(ctx, doorX - 10, -33, 20, 27, 1.5, '#4a2e1c');
    if (L.wall && L.wall !== 'fachwerk') {
      box(ctx, doorX - 8, -31, 16, 24, 1, L.wall === 'lehm' ? '#8a5a34' : '#6b4a2e');
      dot(ctx, doorX + 4.5, -19, 1.3, 1.3, '#c9a35a');
      box(ctx, doorX - 12, -36, 24, 3.5, 1, C.trim);
    } else {
      box(ctx, doorX - 8, -31, 7, 24, 1, '#6b4a2e');
      box(ctx, doorX + 1, -31, 7, 24, 1, '#6b4a2e');
    }
  }
  // Dach, Schornstein, Laternen
  const eave = wallTop + 8;
  const ridge = Math.min(-H - 16, wallTop - 40);
  const top = houseRoof2(ctx, L, C, roof, x0, x1, eave, ridge);
  if (L.chimney != null) {
    const cx = L.roof === 'giebel' ? (x0 + x1) / 2 - (x1 - x0) * 0.27 : (x0 + x1) / 2 + L.chimney * (x1 - x0) * 0.75;
    const cy = L.roof === 'giebel' ? top + 14 : top + 2;
    box(ctx, cx - 5.5, cy - 14, 11, 20, 1, '#8a8276');
    box(ctx, cx - 7, cy - 17, 14, 4, 1, '#5e584f');
    // seit 15.57: Lage der Schornsteinmündung merken (Rauch im Pixel-Stil, pixeldeko.js)
    if (houseArtKey) HOUSE_CHIMNEY.set(houseArtKey, [cx, cy - 17]);
  }
  if ((L.roof || 'pagode') === 'pagode') {
    for (const x of [-W / 2 + 4, W / 2 - 4]) {
      stroke(ctx, '#2a1c14', 0.8, [[x, eave + 2], [x, eave + 7]]);
      oval(ctx, x, eave + 12, 4.2, 5.2, '#c8402f');
      box(ctx, x - 3, eave + 6, 6, 1.6, 0.5, '#c9a35a');
      box(ctx, x - 3, eave + 16.5, 6, 1.6, 0.5, '#c9a35a');
    }
  } else {
    const lx = doorX + doorW / 2 + 8;
    box(ctx, lx - 3, -44, 6, 7, 1.5, '#ffcf6a');
    box(ctx, lx - 3.5, -46, 7, 2, 0.5, '#3a2a1c');
  }
}

function houseSprite(h) {
  const W = h.w * TILE;
  const H = h.h * TILE;
  const L = h.look || {};
  const key = `h:${h.w}:${h.h}:${h.roof}:${L.roof || ''}:${L.wall || ''}:${L.chimney ?? ''}:${L.annex || ''}:${L.tall || ''}:${L.door ?? ''}:${L.tor ? 1 : ''}:${h.enter ? h.enter.door : ''}`;
  h.__sk = key;
  houseArtKey = key;
  const sp = getSprite(key, { x: -W / 2 - 28, y: -H - 64, w: W + 56, h: H + 74 }, (ctx) => houseArt(ctx, h));
  houseArtKey = null;
  return sp;
}
// Schornsteinmündung je Hausbild (Pixel ab der Mitte der unteren Kante), beim Backen gemerkt
const HOUSE_CHIMNEY = new Map();
let houseArtKey = null;
// Lage der Laterne(n) eines Hauses für das Leuchten (Pixel ab der Mitte der unteren Kante)
function houseLamps2(h) {
  const L = h.look || {};
  const W = h.w * TILE;
  const H = h.h * TILE;
  if ((L.roof || 'pagode') === 'pagode') {
    const eave = -Math.min(H * 0.52, 58) - ((L.tall || 1) - 1) * 26 - (h.enter ? 6 : 0) + 8;
    return [[-W / 2 + 4, eave + 12], [W / 2 - 4, eave + 12]];
  }
  const doorW = h.enter ? 2 * TILE - 12 : L.tor ? 44 : 20;
  return [[houseDoorX(h) + doorW / 2 + 8, -41]];
}

// --- Innenraum begehbarer Häuser (seit 13.91, 2D) -----------------------------------------------------------
// Ist der eigene Spieler drinnen, zeichnet collectWorldObjects statt des Hauses: den Raum (Boden, Teppich, Rückwand
// mit Fenstern, Seitenwände; Ursprung links oben am Haus), die Möbel einzeln (nach ihrer Fußlinie sortiert) und vorn
// eine niedrige, angeschnittene Vorderwand mit der Tür.
const ROOM2_WALL = 52; // Höhe der Wände im Bild
function houseRoomArt(ctx, h) {
  const L = h.look || {};
  const C = HOUSE2_WALL[L.wall] || HOUSE2_WALL.fachwerk;
  const T = TILE;
  const W = h.w * T;
  const H = h.h * T;
  const hp = ROOM2_WALL;
  // Dielenboden
  box(ctx, 0.75 * T, 0.75 * T, W - 1.5 * T, H - 1.25 * T, 1, '#9a7448');
  for (let x = 0.75 * T + 13; x < W - 0.75 * T; x += 13) stroke(ctx, '#7a5a36', 0.8, [[x, 0.75 * T], [x, H - 0.5 * T]]);
  for (let k = 0; k < 9; k++) {
    const x = 0.75 * T + ((k * 41) % (W - 1.6 * T));
    const y = 0.8 * T + ((k * 67) % (H - 1.5 * T));
    stroke(ctx, '#7a5a36', 0.8, [[x - 6, y], [x + 6, y]]);
  }
  const room = HOUSE_ROOMS[h.enter.room];
  const rug = room && room.furn.find((f) => f[0] === 'teppich');
  if (rug) {
    const [, fx, fy] = rug;
    box(ctx, fx * T - 33, fy * T - 22, 66, 44, 3, '#8a3a3a');
    box(ctx, fx * T - 28, fy * T - 17, 56, 34, 2, '#a85a4a');
    box(ctx, fx * T - 18, fy * T - 8, 36, 16, 2, '#d8b060');
  }
  // Rückwand: Krone und Innenseite mit zwei Fenstern
  box(ctx, 0.25 * T, 0.25 * T - hp, W - 0.5 * T, 0.5 * T, 1, C.trim);
  box(ctx, 0.25 * T, 0.75 * T - hp, W - 0.5 * T, hp, 1, C.inner);
  box(ctx, 0.25 * T, 0.75 * T - 8, W - 0.5 * T, 8, 1, darker(C.inner, 0.25));
  for (const fx of [W / 2 - 0.42 * T, W / 2 + 0.55 * T]) {
    box(ctx, fx - 8, 0.75 * T - hp + 12, 16, 15, 1, '#f3e2b0');
    stroke(ctx, C.trim, 1, [[fx, 0.75 * T - hp + 12], [fx, 0.75 * T - hp + 27]]);
    box(ctx, fx - 9.5, 0.75 * T - hp + 26, 19, 3, 0.5, C.trim);
  }
  // Seitenwände (Krone von oben, vorn die Stirnseite)
  for (const x of [0.25 * T, W - 0.75 * T]) {
    box(ctx, x, 0.25 * T - hp, 0.5 * T, H - 0.5 * T + hp, 1, darker(C.face, 0.12));
    box(ctx, x, 0.25 * T - hp, 0.5 * T, H - 0.5 * T, 1, C.trim);
    box(ctx, x + (x < W / 2 ? 0.5 * T - 3 : 0), 0.75 * T - hp, 3, H - 1.0 * T, 0.5, darker(C.inner, 0.3));
  }
}
// angeschnittene Vorderwand: Sockel und Krone links und rechts der Tür
function houseFrontArt(ctx, h) {
  const L = h.look || {};
  const C = HOUSE2_WALL[L.wall] || HOUSE2_WALL.fachwerk;
  const T = TILE;
  const W = h.w * T;
  const H = h.h * T;
  const d0 = h.enter.door * T;
  const d1 = d0 + 2 * T;
  for (const [a, b] of [[0.25 * T, d0], [d1, W - 0.25 * T]]) {
    if (b - a < 2) continue;
    box(ctx, a, H - 0.75 * T - 10, b - a, 0.5 * T, 1, C.trim);
    box(ctx, a, H - 0.25 * T - 10, b - a, 10, 1, C.face);
  }
  box(ctx, d0, H - 0.4 * T, 2 * T, 0.3 * T, 1, '#8a8478');
}
function houseRoomSprite(h) {
  const W = h.w * TILE;
  const H = h.h * TILE;
  return getSprite(`hr:${h.x}:${h.y}`, { x: -2, y: -ROOM2_WALL - 4, w: W + 4, h: H + ROOM2_WALL + 8 }, (ctx) => houseRoomArt(ctx, h));
}
function houseFrontSprite(h) {
  const W = h.w * TILE;
  const H = h.h * TILE;
  return getSprite(`hf:${h.x}:${h.y}`, { x: -2, y: H - TILE - 14, w: W + 4, h: TILE + 18 }, (ctx) => houseFrontArt(ctx, h));
}
// --- Kleinigkeiten in den Städten (seit 15.80) ---------------------------------------------------------------------
// Wunsch des Spielers: „in der Stadt ein paar Kleinigkeiten noch hinzufügen“. Je Stadt (Karte) passend zum Ort:
//   - Blumenkästen unter den Fenstern der Häuser (2D hier, 3D in drei-welt.js): Blüten in den Farben der Stadt, sonst
//     Kräuter (kraut), Tannenzweige mit Schnee (tanne), leuchtende Pilze (pilz) oder kleine Kristalle (kristall);
//   - ein Vogelschwarm, der hoch über der Stadt kreist (3D wahrzeichen.js, 2D wahrzeichen2d.js): Tauben, Spatzen,
//     Raben, Möwen, über Lichtwacht und den Mondstädten leuchtende Lichtschwalben (leucht).
// Alles hängt an Häusern oder fliegt hoch über Kopfhöhe – nichts verdeckt Wege, Tore, Leute, Teleportsteine oder
// Stände, nichts hat eine Kollision.
const STADT_KLEIN = {
  1: { blumen: ['#e0644f', '#f2d24e', '#f6f2ea', '#e88ab0'], kasten: '#7a5434', vogel: ['#eceae4', '#9a96a0'] },
  4: { blumen: ['#f2d24e', '#f6f2ea', '#c85a9a'], kasten: '#5a3f2a', vogel: ['#7a5a3a', '#c8a878'] },
  5: { blumen: ['#e0a03a', '#d8643a', '#f2d24e'], kasten: '#8a6a44', vogel: ['#3a2a24', '#6a5040'] },
  6: { kraut: '#8a8a62', kasten: '#5a4a3e', vogel: ['#2a2628', '#5a5458'] },
  2: { blumen: ['#e86a8a', '#f2d24e', '#ffffff'], kasten: '#b08a5a', vogel: ['#eceae4', '#b8ae9c'] },
  7: { tanne: true, kasten: '#5a4a3e', vogel: ['#f4f8fc', '#9ab0cc'] },
  8: { pilz: '#7ad86a', kasten: '#3a3428', vogel: ['#1e2420', '#3e4a40'] },
  3: { blumen: ['#9fd0ff', '#f6f2ea', '#e8c84a'], kasten: '#6a5a4a', vogel: ['#4a4a52', '#8a8a96'] },
  9: { blumen: ['#ff7a2a', '#ffb04a', '#ff4a2a'], kasten: '#3a2a24', vogel: ['#1e1614', '#4a2a20'] },
  10: { kristall: ['#a890ff', '#8fd0ff'], kasten: '#2e2850', vogel: ['#e0d8ff', '#a898f0'], leucht: true },
  11: { blumen: ['#c8b8ff', '#9fc8ff', '#f0f0ff'], kasten: '#3a3048', vogel: ['#dcdcff', '#8a90c8'], leucht: true },
  12: { blumen: ['#ff8a4a', '#ffd070'], kasten: '#2a201c', vogel: ['#1e1816', '#3a2e28'] },
  13: { kraut: '#a8a08a', kasten: '#a89a78', vogel: ['#2a2628', '#5a5250'] },
  14: { blumen: ['#e8324a', '#ff8a8a', '#f2d24e'], kasten: '#3a1a18', vogel: ['#1e1214', '#4a2224'] },
  15: { tanne: true, kasten: '#3a3a4e', vogel: ['#e4ecff', '#8a9ac8'] },
  16: { blumen: ['#5ae0c0', '#c8f0ff'], kasten: '#3a3440', vogel: ['#e8ecf0', '#8a92a0'] },
  17: { blumen: ['#dcecff', '#9fc8ff', '#c8b8ff'], kasten: '#3a4458', vogel: ['#dce8ff', '#9ab0d8'], leucht: true },
  18: { kraut: '#8aa890', blumen: ['#f6f2ea', '#e8c84a'], kasten: '#8a7a64', vogel: ['#f4f4f0', '#9aa0a8'] },
  19: { blumen: ['#9a7ae0', '#f2d24e', '#f6f2ea'], kasten: '#b4a888', vogel: ['#f6f2ea', '#c8b8a0'] }
};
// Karte, in der eine Kachel liegt (WORLD_MAPS.region)
function stadtKarte(x, y) {
  for (const m of WORLD_MAPS) {
    const r = m.region;
    if (r && x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]) return m.id;
  }
  return 0;
}
// Blumenkasten in 2D unter einem Fenster: Mitte x, Oberkante y, Breite w (Weltpixel)
function blumenkasten2(ctx, x, y, w, T, k) {
  const bw = w + 3;
  ctx.fillStyle = 'rgba(20,14,10,0.8)';
  ctx.fillRect(x - bw / 2 - 0.8, y - 0.8, bw + 1.6, 4.8);
  ctx.fillStyle = T.kasten;
  ctx.fillRect(x - bw / 2, y, bw, 3.2);
  ctx.fillStyle = lighter(T.kasten, 0.2);
  ctx.fillRect(x - bw / 2, y, bw, 1);
  const n = Math.max(2, Math.round(bw / 4.5));
  for (let i = 0; i < n; i++) {
    const px = x - bw / 2 + (bw * (i + 0.5)) / n;
    const py = y - 1.2 - ((i + k) % 2) * 0.8;
    if (T.kristall) {
      ctx.fillStyle = T.kristall[i % 2];
      ctx.beginPath();
      ctx.moveTo(px - 1.2, y + 0.5);
      ctx.lineTo(px - 0.6, py - 2.4);
      ctx.lineTo(px + 0.3, py - 3.6);
      ctx.lineTo(px + 1.2, y + 0.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(px - 0.6, py - 2.4, 0.6, 2);
      continue;
    }
    if (T.tanne) {
      ctx.fillStyle = '#2a4a40';
      ctx.beginPath();
      ctx.moveTo(px - 2, y + 0.4);
      ctx.lineTo(px, py - 2.8);
      ctx.lineTo(px + 2, y + 0.4);
      ctx.fill();
      ctx.fillStyle = '#f4f8fc';
      ctx.fillRect(px - 1, py - 1.4, 2, 0.9);
      continue;
    }
    // Blätter, darüber Blüten (Pilze: leuchtende Hüte; Kräuter: nur Grün)
    ctx.fillStyle = T.kraut || '#3d7a33';
    ctx.beginPath();
    ctx.arc(px, y - 0.4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    if (T.pilz) {
      ctx.fillStyle = '#efe6cc';
      ctx.fillRect(px - 0.4, py - 1.5, 0.8, 2);
      ctx.fillStyle = T.pilz;
      ctx.beginPath();
      ctx.arc(px, py - 1.4, 1.5, Math.PI, 0);
      ctx.fill();
      continue;
    }
    if (!T.blumen || (T.kraut && i % 2)) continue;
    ctx.fillStyle = T.blumen[(i + k) % T.blumen.length];
    ctx.beginPath();
    ctx.arc(px, py - 0.6, 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7d36a';
    ctx.fillRect(px - 0.3, py - 0.9, 0.6, 0.6);
  }
}
// Blumenkästen gehören zur Stadt: eigenes Hausbild je Stadt (sonst wie houseSprite), Stadtthema für houseWindow2
let HAUS2_THEMA = null;
let HAUS2_FENSTER = 0;
const _klHouseSprite = houseSprite;
houseSprite = function (h) {
  const id = stadtKarte(h.x, h.y);
  const T = STADT_KLEIN[id];
  if (!T) return _klHouseSprite(h);
  const W = h.w * TILE;
  const H = h.h * TILE;
  const L = h.look || {};
  const key = `h:${h.w}:${h.h}:${h.roof}:${L.roof || ''}:${L.wall || ''}:${L.chimney ?? ''}:${L.annex || ''}:${L.tall || ''}:${L.door ?? ''}:${L.tor ? 1 : ''}:${h.enter ? h.enter.door : ''}:k${id}`;
  h.__sk = key;
  houseArtKey = key;
  HAUS2_THEMA = T;
  HAUS2_FENSTER = 0;
  try {
    return getSprite(key, { x: -W / 2 - 28, y: -H - 64, w: W + 56, h: H + 74 }, (ctx) => houseArt(ctx, h));
  } finally {
    houseArtKey = null;
    HAUS2_THEMA = null;
  }
};
const _klHouseWindow2 = houseWindow2;
houseWindow2 = function (ctx, L, C, x, top, w, roof) {
  _klHouseWindow2(ctx, L, C, x, top, w, roof);
  if (!HAUS2_THEMA) return;
  const k = L.wall || 'fachwerk';
  blumenkasten2(ctx, x, top + (k === 'fachwerk' ? 24.6 : 23.6), k === 'lehm' ? 10 : k === 'fachwerk' ? w : 13, HAUS2_THEMA, HAUS2_FENSTER++);
};
// Möbel (Ursprung: Mitte der Fußlinie)
const FURN2 = {
  kamin(ctx) {
    box(ctx, -18, -40, 36, 40, 2, '#8a8276');
    box(ctx, -10, -18, 20, 17, 3, '#1e1612');
    oval(ctx, 0, -6, 7, 4, '#ff8a3a');
    dot(ctx, 0, -8, 3.5, 3, '#ffd27a');
    box(ctx, -21, -24, 42, 4, 1, '#6b4a2e');
    box(ctx, -10, -56, 20, 17, 1, '#7a7268');
  },
  regal(ctx) {
    box(ctx, -19, -48, 38, 48, 1, '#5a3a22');
    box(ctx, -17, -46, 34, 45, 1, darker('#8a6440', 0.2));
    for (const y of [-33, -18, -3]) box(ctx, -18, y, 36, 3, 0.5, '#b08c5c');
    for (let k = 0; k < 5; k++) box(ctx, -15 + k * 4, -31 - 14 + 2, 3, 12, 0.5, ['#7a2a2a', '#2a4a7a', '#4a6a3a', '#8a6a2a', '#5a3a6a'][k]);
    for (let k = 0; k < 3; k++) oval(ctx, 5 + k * 5, -22, 2.3, 3, ['#7ac85a', '#c8a03a', '#5ab8c8'][k]);
    box(ctx, -12, -15, 10, 10, 1, '#a07a4a');
  },
  kraeuter(ctx) {
    for (const x of [-17, 15]) box(ctx, x, -46, 2.5, 46, 0.5, '#5a3a22');
    box(ctx, -18, -46, 36, 2.5, 1, '#6b4a2e');
    for (let k = 0; k < 5; k++) poly(ctx, [[-12 + k * 6 - 2.5, -43], [-12 + k * 6 + 2.5, -43], [-12 + k * 6, -34]], ['#6a9a46', '#8aa040', '#a8a04a'][k % 3]);
    box(ctx, -16, -18, 32, 3, 1, '#8a6440');
    for (const [x, c] of [[-9, '#d8c49a'], [1, '#6a9a46'], [10, '#b06a3a']]) box(ctx, x - 3.5, -23, 7, 5, 2, c);
  },
  tisch(ctx) {
    for (const sx of [-1, 1]) {
      oval(ctx, sx * 24, -11, 5.5, 3.5, '#8a6440');
      box(ctx, sx * 24 - 1, -10, 2, 10, 0.5, '#5a3a22');
    }
    for (const sx of [-1, 1]) box(ctx, sx * 14 - 1.5, -16, 3, 16, 0.5, '#5a3a22');
    box(ctx, -17, -22, 34, 11, 2, '#9a7448');
    box(ctx, -8, -27, 4, 6, 1, '#c8b088');
    oval(ctx, 5, -23, 4.5, 2, '#7a5434');
    box(ctx, 11, -28, 2, 6, 0.5, '#f4ecd8');
    dot(ctx, 12, -30, 1.4, 2, '#ffd27a');
  },
  bett(ctx) {
    box(ctx, -14, -52, 28, 52, 2, '#7a5434');
    box(ctx, -12, -48, 24, 46, 2, '#ece4d2');
    box(ctx, -13, -30, 26, 28, 2, '#7a3a4a');
    box(ctx, -8, -46, 16, 8, 3, '#f4f0e4');
    box(ctx, -14, -56, 28, 7, 1.5, '#5a3a22');
  },
  fass(ctx) {
    box(ctx, -7, -17, 14, 17, 4, '#8a5a34');
    stroke(ctx, '#3a2a1c', 1.4, [[-7, -13], [7, -13]]);
    stroke(ctx, '#3a2a1c', 1.4, [[-7, -4], [7, -4]]);
    dot(ctx, 0, -17, 6.5, 2, '#6b4426');
  },
  kiste(ctx) {
    box(ctx, -8, -15, 16, 15, 1, '#a07a4a');
    stroke(ctx, '#5a3f26', 1, [[-8, -7.5], [8, -7.5]]);
    stroke(ctx, '#5a3f26', 1, [[-6, -13], [6, -2]]);
  },
  krug(ctx) {
    oval(ctx, -4, -7, 5, 7, '#c07a4a');
    box(ctx, -6, -16, 4, 3, 1, '#a0603a');
    oval(ctx, 5, -5, 4, 5, '#8a6a4a');
  },
  werkbank(ctx) {
    for (const sx of [-1, 1]) box(ctx, sx * 22 - 1.5, -22, 3, 22, 0.5, '#5a3a22');
    box(ctx, -26, -26, 52, 6, 1.5, '#b08c5c');
    box(ctx, -22, -9, 44, 3, 1, '#8a6440');
    box(ctx, 16, -31, 6, 5, 1, '#4e535c');
    box(ctx, -20, -44, 18, 5, 1, '#a4adb8');
    box(ctx, 4, -48, 2, 13, 0.5, '#6b4a2e');
    box(ctx, 2, -50, 6, 3, 0.5, '#4e535c');
  },
  holz(ctx) {
    for (const [row, xs] of [[0, [-8, 0, 8]], [1, [-4, 4]], [2, [0]]]) {
      for (const x of xs) {
        oval(ctx, x, -4 - row * 7, 4, 3.6, '#7a5434');
        dot(ctx, x, -4 - row * 7, 2.6, 2.3, '#d8b88a');
      }
    }
  }
};
// Tiefe der Möbel (Kacheln) für die Fußlinie: Bett und Teppich liegen flach, Wandmöbel stehen an der Wand
const FURN2_DEPTH = { bett: 0.8, kamin: 0.25, regal: 0.2, kraeuter: 0.2, werkbank: 0.28, tisch: 0.3 };

// --- Dorfschmuck -------------------------------------------------------------------------

// Dachfarbe der Stände je Rolle (2D)
const STAND_COLORS = { haendler: '#6d3f7d', alchemist: '#3a6a4a', waffen: '#9a2f2a', ruestung: '#2f5a7a', schmied: '#5a3a2e', lager: '#7a5a3a', aeltester: '#7c3a2c', teleport: '#5a8ab0', jaegerin: '#4a6a3a', lehrmeister: '#2a6a6a', stallmeister: '#8a6440' };
const PROP_ART = {
  well(ctx) {
    oval(ctx, 0, -6, 15, 8, '#7d7468');
    dot(ctx, 0, -7, 10, 4.8, '#24465c');
    dot(ctx, -3, -8, 4, 1.4, '#4a7a96');
    box(ctx, -15, -34, 3.5, 30, 1, '#5a3a22');
    box(ctx, 11.5, -34, 3.5, 30, 1, '#5a3a22');
    poly(ctx, [[-21, -30], [0, -42], [21, -30], [17, -27], [0, -37], [-17, -27]], '#7c3a2c');
    stroke(ctx, '#3a2a1c', 0.8, [[0, -32], [0, -14]]);
    box(ctx, -2.5, -16, 5, 5, 1, '#6b4a2e');
  },
  lantern(ctx) {
    box(ctx, -7, -5, 14, 6, 1.5, '#8a8478');
    box(ctx, -3, -20, 6, 16, 1, '#9a9488');
    box(ctx, -7, -29, 14, 10, 1.5, '#8a8478');
    box(ctx, -4, -27, 8, 6, 1, '#f6d27a');
    poly(ctx, [[-11, -29], [0, -37], [11, -29]], '#7a746a');
    dot(ctx, 0, -39, 2, 2, '#7a746a');
  },
  barrel(ctx) {
    box(ctx, -7, -17, 14, 17, 4, '#8a5a34');
    stroke(ctx, '#3a2a1c', 1.4, [[-7, -13], [7, -13]]);
    stroke(ctx, '#3a2a1c', 1.4, [[-7, -4], [7, -4]]);
    dot(ctx, 0, -17, 6.5, 2, '#6b4426');
  },
  crate(ctx) {
    box(ctx, -8, -15, 16, 15, 1, '#a07a4a');
    stroke(ctx, '#5a3f26', 1, [[-8, -7.5], [8, -7.5]]);
    stroke(ctx, '#5a3f26', 1, [[-6, -13], [6, -2]]);
  }
};

// Größere Bauten der Dorfmauer und weiterer Schmuck
Object.assign(PROP_ART, {
  // Wachturm mit geschwungenem Dach und Laternen
  tower(ctx) {
    box(ctx, -19, -14, 38, 14, 2, '#6e685e');
    for (const y of [-10, -5]) stroke(ctx, '#55504a', 0.8, [[-18, y], [18, y]]);
    box(ctx, -16, -58, 32, 45, 1.5, '#dccaa4');
    for (const x of [-16, 12]) box(ctx, x, -58, 4, 45, 1, '#5a3a22');
    box(ctx, -16, -40, 32, 3.5, 1, '#5a3a22');
    box(ctx, -5, -34, 10, 14, 1, '#3a2a1c');
    // Rundgang mit Geländer
    box(ctx, -22, -64, 44, 6, 1.5, '#6b4a2e');
    for (let x = -20; x <= 20; x += 5) box(ctx, x - 0.8, -72, 1.6, 8, 0.5, '#5a3a22');
    stroke(ctx, '#5a3a22', 1.4, [[-21, -72], [21, -72]]);
    paintShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-30, -70);
      ctx.quadraticCurveTo(-20, -74, -14, -90);
      ctx.lineTo(14, -90);
      ctx.quadraticCurveTo(20, -74, 30, -70);
      ctx.lineTo(24, -76);
      ctx.lineTo(-24, -76);
      ctx.closePath();
    }, '#7c3a2c', -30, -90, 60, 20);
    box(ctx, -15, -94, 30, 5, 2, darker('#7c3a2c', 0.4));
    poly(ctx, [[-15, -94], [-20, -101], [-11, -95]], darker('#7c3a2c', 0.4));
    poly(ctx, [[15, -94], [20, -101], [11, -95]], darker('#7c3a2c', 0.4));
    for (const x of [-24, 24]) {
      stroke(ctx, '#2a1c14', 0.8, [[x, -71], [x, -66]]);
      oval(ctx, x, -62, 3.4, 4.2, '#c8402f');
    }
  },
  // Torbogen mit Namenstafel
  gate(ctx) {
    for (const x of [-60, 60]) {
      box(ctx, x - 4, -78, 8, 78, 1.5, '#9a2f2a');
      box(ctx, x - 6, -6, 12, 6, 1, '#6e685e');
    }
    box(ctx, -70, -80, 140, 7, 2, '#9a2f2a');
    box(ctx, -64, -68, 128, 5, 1.5, '#7a2420');
    paintShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-84, -82);
      ctx.quadraticCurveTo(-60, -84, -50, -98);
      ctx.lineTo(50, -98);
      ctx.quadraticCurveTo(60, -84, 84, -82);
      ctx.lineTo(76, -88);
      ctx.lineTo(-76, -88);
      ctx.closePath();
    }, WALL_ROOF, -84, -98, 168, 16);
    box(ctx, -52, -102, 104, 5, 2, darker(WALL_ROOF, 0.35));
    box(ctx, -18, -79, 36, 14, 1.5, '#2a1c14');
    box(ctx, -16, -77, 32, 10, 1, '#c9a35a');
    ctx.fillStyle = '#2a1c14';
    ctx.font = 'bold 8px serif';
    ctx.textAlign = 'center';
    ctx.fillText('HAYAN', 0, -69.5);
  },
  // Marktstand mit Stoffdach und Waren
  stall(ctx, pr) {
    const roof = pr.roof || '#9a2f2a';
    for (const x of [-22, 20]) box(ctx, x, -40, 3, 40, 1, '#5a3a22');
    box(ctx, -24, -16, 48, 14, 1.5, '#8a6a44');
    stroke(ctx, '#5a4030', 0.8, [[-24, -10], [24, -10]]);
    for (const [x, c] of [[-16, '#c8402f'], [-8, '#e8c46a'], [0, '#7aa94f'], [9, '#9fd0ff'], [16, '#e0644f']]) oval(ctx, x, -18, 3.2, 2.6, c);
    paintShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-28, -38); ctx.lineTo(28, -38); ctx.lineTo(24, -48); ctx.lineTo(-24, -48); ctx.closePath(); }, roof, -28, -48, 56, 10);
    for (let x = -26, n = 0; x < 26; x += 8, n++) poly(ctx, [[x, -38], [x + 8, -38], [x + 4, -34]], n % 2 ? roof : lighter(roof, 0.4));
  },
  // Stand einer Stadtperson (seit 12.0; in 2D ein Marktstand in der Farbe der Rolle)
  stand(ctx, pr) {
    ctx.save();
    ctx.scale(1.25, 1.25);
    PROP_ART.stall(ctx, { roof: STAND_COLORS[pr.roof] || '#9a2f2a' });
    ctx.restore();
  },
  anvil(ctx) {
    box(ctx, -7, -8, 14, 8, 2, '#6b4a2e');
    poly(ctx, [[-10, -14], [10, -14], [13, -11], [6, -10], [6, -8], [-6, -8], [-6, -10], [-10, -11]], '#5a5e66');
    stroke(ctx, '#9aa1a8', 0.8, [[-9, -13.5], [9, -13.5]]);
  },
  // Aushang mit Aufträgen
  board(ctx) {
    for (const x of [-14, 12]) box(ctx, x, -34, 3, 34, 1, '#5a3a22');
    box(ctx, -17, -34, 34, 22, 1.5, '#8a6a44');
    poly(ctx, [[-20, -34], [0, -42], [20, -34]], '#7c3a2c');
    for (const [x, y, c] of [[-12, -30, '#efe6cc'], [-2, -31, '#f3e2b0'], [6, -29, '#efe6cc'], [-8, -22, '#f3e2b0'], [3, -21, '#efe6cc']]) {
      box(ctx, x, y, 7, 8, 0.5, c);
      stroke(ctx, '#8a7a5a', 0.5, [[x + 1, y + 2.5], [x + 6, y + 2.5]]);
    }
    box(ctx, -1, -33, 2, 2, 0.5, '#c8402f');
  },
  // Wegstein der Wegweiserin: Steinkreis mit Rune
  portal(ctx) {
    oval(ctx, 0, -3, 20, 7, '#7a746a');
    oval(ctx, 0, -4, 15, 5, '#5a8ab0');
    for (const x of [-14, 14]) box(ctx, x - 3, -40, 6, 38, 1.5, '#8a8478');
    box(ctx, -19, -44, 38, 6, 2, '#6e685e');
    oval(ctx, 0, -24, 7, 7, '#9fd0ff');
    stroke(ctx, '#ffffff', 1, [[-3, -27], [3, -24], [-3, -21]]);
  },
  // Feuerbecken in den Dungeons, die Flamme in der Farbe des Dungeons
  brazier(ctx, pr) {
    const col = pr.roof || '#ff8a4a';
    box(ctx, -2.5, -16, 5, 16, 1, '#4a4440');
    box(ctx, -7, -2, 14, 3, 1, '#3a3430');
    poly(ctx, [[-11, -20], [11, -20], [7, -13], [-7, -13]], '#5a544c');
    box(ctx, -11.5, -21.5, 23, 3, 1.2, '#7a7468');
    poly(ctx, [[-8, -21], [-4, -33], [-1, -26], [2, -38], [5, -27], [8, -21]], col);
    poly(ctx, [[-4, -21], [-1, -29], [1, -25], [3, -31], [5, -21]], '#fff2c0');
  },
  // Dungeon-Schmuck (seit 13.7), pr.roof = "Wand oben|Fugen|Portalfarbe"
  dpillar(ctx, pr) {
    const [top, , glow] = String(pr.roof).split('|');
    const st = lighter(top, 0.3);
    box(ctx, -15, -8, 30, 8, 1.5, darker(st, 0.15));
    box(ctx, -10, -66, 20, 60, 2, st);
    for (const x of [-6, -1, 4]) box(ctx, x, -64, 2, 56, 0.5, darker(st, 0.22));
    box(ctx, -11, -40, 22, 3, 1, glow);
    box(ctx, -15, -74, 30, 8, 1.5, darker(st, 0.1));
  },
  dbanner(ctx, pr) {
    const [, , glow] = String(pr.roof).split('|');
    box(ctx, -1.5, -70, 3, 70, 1, '#3a2a1c');
    box(ctx, -15, -68, 30, 3, 1, '#3a2a1c');
    poly(ctx, [[-13, -65], [13, -65], [13, -26], [0, -32], [-13, -26]], darker(glow, 0.35));
    oval(ctx, 0, -48, 5, 5, glow);
    box(ctx, -13, -66, 26, 2, 0.5, '#c9a35a');
  },
  dstatue(ctx, pr) {
    const [top, , glow] = String(pr.roof).split('|');
    const st = lighter(top, 0.38);
    box(ctx, -14, -12, 28, 12, 2, darker(st, 0.2));
    poly(ctx, [[-10, -12], [10, -12], [7, -40], [-7, -40]], st);
    oval(ctx, 0, -46, 7, 8, darker(st, 0.12));
    for (const x of [-2.5, 2.5]) oval(ctx, x, -45, 1.2, 1.2, glow);
    box(ctx, -1, -42, 2, 28, 0.5, lighter(st, 0.2));
  },
  dthrone(ctx, pr) {
    const [top, , glow] = String(pr.roof).split('|');
    const st = lighter(top, 0.25);
    box(ctx, -32, -8, 64, 8, 2, darker(st, 0.2));
    box(ctx, -20, -86, 40, 66, 3, st);
    for (const x of [-14, 0, 14]) poly(ctx, [[x - 5, -86], [x, -98 + Math.abs(x) * 0.3], [x + 5, -86]], darker(st, 0.15));
    box(ctx, -26, -36, 52, 18, 2, darker(st, 0.1));
    oval(ctx, 0, -76, 6, 6, glow);
  },
  dchest(ctx) {
    box(ctx, -16, -16, 32, 16, 2, '#7a4a26');
    for (const x of [-12, -1, 10]) box(ctx, x, -16, 2, 16, 0.5, '#c9a35a');
    poly(ctx, [[-16, -16], [16, -16], [14, -28], [-14, -28]], '#5a3a1c');
    oval(ctx, 0, -17, 13, 4, '#ffd34d');
  },
  dgold(ctx) {
    oval(ctx, 0, -4, 15, 6, '#c8961e');
    oval(ctx, 0, -6, 10, 5, '#ffd34d');
    oval(ctx, 3, -9, 2, 2, '#5ad0ff');
    oval(ctx, -4, -7, 2, 2, '#ff5a7a');
  },
  dshrine(ctx, pr) {
    const [top, , glow] = String(pr.roof).split('|');
    const st = lighter(top, 0.35);
    oval(ctx, 0, -4, 26, 9, darker(st, 0.15));
    box(ctx, -12, -32, 24, 28, 3, st);
    box(ctx, -12, -20, 24, 2, 0.5, glow);
    poly(ctx, [[0, -64], [7, -50], [0, -38], [-7, -50]], glow);
    poly(ctx, [[0, -58], [3, -50], [0, -43], [-3, -50]], '#ffffff');
  },
  // Pferd beim Stall im Dorf
  horse(ctx) {
    horseArt(ctx, 0, { saddle: '#8a2a1a' });
  },
  hay(ctx) {
    for (const [x, y] of [[-9, 0], [9, 0], [0, -10]]) {
      box(ctx, x - 9, y - 10, 18, 10, 2, '#d8b45a');
      stroke(ctx, '#a8843a', 1, [[x - 7, y - 7], [x + 7, y - 7]]);
      stroke(ctx, '#a8843a', 1, [[x - 7, y - 3.5], [x + 7, y - 3.5]]);
      stroke(ctx, '#7a5a2a', 1.2, [[x - 3, y - 10], [x - 3, y]]);
      stroke(ctx, '#7a5a2a', 1.2, [[x + 3, y - 10], [x + 3, y]]);
    }
  },
  targets(ctx) {
    box(ctx, -1.5, -24, 3, 24, 1, '#5a3a22');
    oval(ctx, 0, -26, 11, 11, '#e8d8a8');
    oval(ctx, 0, -26, 7.5, 7.5, '#c8402f');
    oval(ctx, 0, -26, 3.6, 3.6, '#e8d8a8');
    stroke(ctx, '#6b4a2e', 1, [[4, -30], [12, -38]]);
  },
  herbs(ctx) {
    for (const x of [-12, 12]) box(ctx, x - 1.5, -30, 3, 30, 1, '#5a3a22');
    stroke(ctx, '#5a3a22', 1.5, [[-13, -28], [13, -28]]);
    for (let x = -9; x <= 9; x += 4.5) poly(ctx, [[x - 2, -28], [x + 2, -28], [x + 1, -18], [x - 1, -18]], x % 2 ? '#6a9a46' : '#9a7a3a');
    box(ctx, -10, -8, 20, 8, 3, '#a07a4a');
    for (const x of [-6, 0, 6]) oval(ctx, x, -9, 3, 2, '#7aa94f');
  }
});

const PROP_BOUNDS = {
  tower: { x: -34, y: -106, w: 68, h: 110 },
  gate: { x: -90, y: -108, w: 180, h: 112 },
  stall: { x: -32, y: -54, w: 64, h: 58 },
  stand: { x: -40, y: -64, w: 80, h: 68 },
  horse: { x: -34, y: -58, w: 68, h: 62 },
  dpillar: { x: -18, y: -78, w: 36, h: 80 },
  dbanner: { x: -18, y: -74, w: 36, h: 76 },
  dthrone: { x: -36, y: -102, w: 72, h: 104 },
  dshrine: { x: -28, y: -68, w: 56, h: 70 }
};

// Stadtschmuck (seit 13.85, welt.js TOWN_DECO): wie in 3D, pr.roof = "Stil|schnee"
const DECO2_SNOW = '#eef4fa';
const deco2Snow = (pr) => String(pr.roof || '').includes('schnee');
function deco2Barrel(ctx, x, s = 1, c = '#8a5a34') {
  box(ctx, x - 7 * s, -17 * s, 14 * s, 17 * s, 4 * s, c);
  stroke(ctx, '#3a2a1c', 1.3, [[x - 7 * s, -13 * s], [x + 7 * s, -13 * s]]);
  stroke(ctx, '#3a2a1c', 1.3, [[x - 7 * s, -4 * s], [x + 7 * s, -4 * s]]);
  dot(ctx, x, -17 * s, 6 * s, 2 * s, darker(c, 0.2));
}
function deco2Crate(ctx, x, y, s, c = '#a07a4a') {
  box(ctx, x - 8 * s, y - 15 * s, 16 * s, 15 * s, 1, c);
  stroke(ctx, '#5a3f26', 1, [[x - 8 * s, y - 7.5 * s], [x + 8 * s, y - 7.5 * s]]);
  stroke(ctx, '#5a3f26', 1, [[x - 6 * s, y - 13 * s], [x + 6 * s, y - 2 * s]]);
}
function deco2Sack(ctx, x, s = 1, c = '#c8b088') {
  oval(ctx, x, -6 * s, 6.5 * s, 6 * s, c);
  poly(ctx, [[x - 2.5 * s, -11 * s], [x + 2.5 * s, -11 * s], [x + 1.5 * s, -15 * s], [x - 1.5 * s, -15 * s]], c);
  stroke(ctx, '#6b4a2e', 1, [[x - 2.5 * s, -11.5 * s], [x + 2.5 * s, -11.5 * s]]);
}
function deco2Jar(ctx, x, s = 1, c = '#c07a4a') {
  paintShape(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(x - 3 * s, 0);
    ctx.quadraticCurveTo(x - 8 * s, -6 * s, x - 6 * s, -11 * s);
    ctx.lineTo(x - 2.5 * s, -16 * s);
    ctx.lineTo(x + 2.5 * s, -16 * s);
    ctx.lineTo(x + 6 * s, -11 * s);
    ctx.quadraticCurveTo(x + 8 * s, -6 * s, x + 3 * s, 0);
    ctx.closePath();
  }, c, x - 8 * s, -16 * s, 16 * s, 16 * s);
  box(ctx, x - 3 * s, -18 * s, 6 * s, 2.5 * s, 0.8, darker(c, 0.15));
}
Object.assign(PROP_ART, {
  planter(ctx, pr) {
    const style = String(pr.roof).split('|')[0];
    if (style === 'palme') {
      deco2Jar(ctx, 0, 0.9);
      stroke(ctx, '#8a6a44', 2.2, [[0, -15], [1, -30], [2, -38]]);
      for (const [dx, dy] of [[-13, -32], [13, -33], [-9, -42], [10, -43], [0, -46]]) poly(ctx, [[2, -38], [2 + dx, -38 + (dy + 38)], [2 + dx * 0.6, -36 + (dy + 38) * 0.4]], dx < 0 ? '#4a8a3a' : '#5a9a42');
      return;
    }
    if (style === 'dorn') {
      box(ctx, -12, -9, 24, 9, 1.5, '#8a8276');
      for (const pts of [[[-5, -9], [-10, -20]], [[0, -9], [1, -24]], [[5, -9], [10, -19]], [[1, -18], [-4, -22]]]) stroke(ctx, '#6a5a44', 1.2, pts);
      for (const [x, y] of [[-9, -18], [2, -22], [9, -17]]) dot(ctx, x, y, 2.5, 2, '#7a8a5a');
      return;
    }
    if (style === 'farn') {
      box(ctx, -10, -10, 20, 10, 3, '#6b4a2e');
      oval(ctx, 0, -10, 9, 2.5, '#b08c5c');
      for (const a of [-1.1, -0.6, -0.15, 0.3, 0.75, 1.15]) poly(ctx, [[0, -11], [Math.sin(a) * 14, -11 - Math.cos(a) * 13], [Math.sin(a) * 6 + 2, -13]], '#4f8a3c');
      oval(ctx, 9, -3, 3, 2, '#c8402f');
      return;
    }
    const tub = style === 'tanne' || style === 'pilz';
    if (tub) {
      box(ctx, -9, -11, 18, 11, 2, '#7a5434');
      stroke(ctx, '#3a2a1c', 1, [[-9, -8], [9, -8]]);
      stroke(ctx, '#3a2a1c', 1, [[-9, -3], [9, -3]]);
    } else {
      box(ctx, -13, -9, 26, 9, 1.5, '#8a6440');
      for (const x of [-13, 11]) box(ctx, x, -9, 2, 9, 0.5, '#5a3a22');
    }
    if (style === 'tanne') {
      poly(ctx, [[-9, -12], [9, -12], [0, -26]], '#2f5a3a');
      poly(ctx, [[-7, -20], [7, -20], [0, -33]], '#2f5a3a');
      if (deco2Snow(pr)) {
        poly(ctx, [[-4, -27], [4, -27], [0, -33]], DECO2_SNOW);
        poly(ctx, [[-5, -19], [5, -19], [0, -25]], DECO2_SNOW);
      }
      return;
    }
    if (style === 'pilz') {
      for (const [x, h, r, c] of [[-4, 6, 4, '#9a6ad8'], [3, 9, 5, '#6aa8d8']]) {
        box(ctx, x - 1, -11 - h, 2, h, 0.5, '#e8e0d0');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        dot(ctx, x, -11 - h, r + 2, r * 0.7 + 1.5, 'rgba(160,140,255,0.25)');
        ctx.restore();
        oval(ctx, x, -11 - h, r, r * 0.6, c);
      }
      return;
    }
    const cols = ['#d8403a', '#f0c84a', '#f4f0e4', '#c8509a'];
    for (let k = 0; k < 6; k++) dot(ctx, -10 + k * 4, -10, 3, 2.5, k % 2 ? '#4f8a34' : '#5a9a3c');
    for (let k = 0; k < 6; k++) oval(ctx, -10 + k * 4, -13 - (k % 3), 1.8, 1.8, cols[k % 4]);
  },
  bench(ctx, pr) {
    const style = String(pr.roof).split('|')[0];
    if (style === 'stein') {
      for (const x of [-16, 10]) box(ctx, x, -10, 6, 10, 1, '#a49880');
      box(ctx, -22, -14, 44, 5, 1.5, '#b8ac92');
    } else {
      for (const x of [-18, 16]) box(ctx, x, -24, 2.5, 24, 0.5, '#5a3a22');
      box(ctx, -21, -24, 42, 5, 1, '#9a7448');
      box(ctx, -21, -13, 42, 4, 1, '#9a7448');
      for (const x of [-17, 15]) box(ctx, x, -10, 2.5, 10, 0.5, '#5a3a22');
    }
    if (deco2Snow(pr)) box(ctx, -19, -15, 38, 2.5, 1, DECO2_SNOW);
  },
  goods(ctx, pr) {
    const style = String(pr.roof).split('|')[0];
    if (style === 'krug') {
      deco2Jar(ctx, -9, 1.1, '#c07a4a');
      deco2Jar(ctx, 3, 0.85, '#b06a3a');
      deco2Sack(ctx, 12, 0.9, '#d8c08a');
      return;
    }
    if (style === 'erz') {
      deco2Crate(ctx, -5, 0, 1.1, '#6a5a4a');
      for (const [x, y] of [[-9, -17], [-4, -18], [0, -17]]) oval(ctx, x, y, 3, 2.4, '#3a3632');
      dot(ctx, -5, -18.5, 1.4, 1.4, '#ff8a3a');
      deco2Barrel(ctx, 12, 0.9, '#5a4a3a');
      return;
    }
    deco2Barrel(ctx, -11, 1);
    deco2Crate(ctx, 5, 0, 1);
    deco2Crate(ctx, 5, -15, 0.75, '#b08c5c');
    deco2Sack(ctx, -2, 0.75);
    if (deco2Snow(pr)) {
      box(ctx, -17, -19.5, 12, 3, 1.5, DECO2_SNOW);
      box(ctx, -1, -28, 12, 3, 1.5, DECO2_SNOW);
    }
  },
  woodpile(ctx, pr) {
    for (const [row, xs] of [[0, [-12, -4, 4, 12]], [1, [-8, 0, 8]], [2, [-4, 4]]]) {
      for (const x of xs) {
        oval(ctx, x, -4 - row * 7, 4, 3.6, '#7a5434');
        dot(ctx, x, -4 - row * 7, 2.6, 2.3, '#d8b88a');
      }
    }
    if (deco2Snow(pr)) box(ctx, -8, -25, 16, 3, 1.5, DECO2_SNOW);
  },
  sacks(ctx, pr) {
    deco2Sack(ctx, -7, 1.1);
    deco2Sack(ctx, 7, 1.0, '#b8a07a');
    deco2Sack(ctx, 0, 0.9, '#d8c49a');
    if (deco2Snow(pr)) box(ctx, -11, -16, 8, 2.5, 1, DECO2_SNOW);
  },
  pots(ctx) {
    deco2Jar(ctx, -6, 1.15, '#c07a4a');
    deco2Jar(ctx, 7, 0.9, '#b06a3a');
  },
  totem(ctx) {
    box(ctx, -3, -46, 6, 46, 1.5, '#6b4a2e');
    for (const [y, c] of [[-26, '#8a2a1a'], [-33, '#5a3a22']]) box(ctx, -4, y, 8, 3, 0.5, c);
    oval(ctx, 0, -46, 6, 6.5, '#e8dcc0');
    for (const x of [-2.2, 2.2]) dot(ctx, x, -46, 1.3, 1.5, '#2a1c14');
    for (const sx of [-1, 1]) poly(ctx, [[sx * 4, -50], [sx * 14, -56], [sx * 6, -47]], '#d8ccb0');
  },
  ore(ctx) {
    oval(ctx, 0, -4, 14, 6, '#3a3430');
    for (const [x, y] of [[-7, -6], [5, -7], [-1, -10]]) oval(ctx, x, y, 3.5, 2.8, '#4a4440');
    dot(ctx, 2, -9, 1.5, 1.5, '#ff8a3a');
    dot(ctx, -5, -8, 1.2, 1.2, '#ff8a3a');
  },
  // Wäscheleine und Handkarren (seit 13.91)
  waesche(ctx, pr) {
    for (const x of [-25, 23]) box(ctx, x, -42, 2.5, 42, 0.5, '#5a3a22');
    stroke(ctx, '#e8e0d0', 0.8, [[-24, -40], [0, -38], [24, -40]]);
    for (const [x, w, h, c] of [[-16, 11, 14, pr.roof || '#9a2f2a'], [-3, 10, 18, '#f4f0e4'], [8, 8, 12, '#8ab0d0'], [17, 7, 10, '#d8c49a']]) {
      box(ctx, x - w / 2, -39, w, h, 1, c);
      dot(ctx, x - w / 2 + 1.5, -39.5, 1, 1.2, '#c8a878');
      dot(ctx, x + w / 2 - 1.5, -39.5, 1, 1.2, '#c8a878');
    }
  },
  karren(ctx, pr) {
    stroke(ctx, '#6b4a2e', 2, [[-14, -14], [-30, -24]]);
    box(ctx, -16, -20, 32, 8, 1.5, '#8a6440');
    box(ctx, -16, -24, 32, 4, 1, '#7a5434');
    oval(ctx, -5, -27, 7, 5.5, '#c8b088');
    box(ctx, 3, -33, 11, 11, 1, '#a07a4a');
    for (const x of [-7, 9]) {
      oval(ctx, x, -8, 8, 8, '#5a3a22');
      oval(ctx, x, -8, 5.5, 5.5, '#8a6440');
      dot(ctx, x, -8, 2, 2, '#3a2a1c');
    }
    if (deco2Snow(pr)) box(ctx, -14, -26, 28, 3, 1.5, DECO2_SNOW);
  },
  wallbanner(ctx, pr) {
    const cloth = pr.roof || '#9a2f2a';
    box(ctx, -1.5, -66, 3, 66, 1, '#3a2a1c');
    box(ctx, -13, -62, 26, 2.5, 1, '#3a2a1c');
    poly(ctx, [[-11, -60], [11, -60], [11, -26], [0, -31], [-11, -26]], cloth);
    box(ctx, -11, -60, 22, 2, 0.5, '#c9a35a');
    oval(ctx, 0, -44, 3.5, 3.5, '#e8c46a');
    dot(ctx, 0, -44, 1.6, 1.6, cloth);
  }
});
Object.assign(PROP_BOUNDS, {
  planter: { x: -24, y: -56, w: 48, h: 58 },
  bench: { x: -26, y: -32, w: 52, h: 36 },
  totem: { x: -18, y: -62, w: 36, h: 64 },
  wallbanner: { x: -18, y: -70, w: 36, h: 72 },
  waesche: { x: -30, y: -48, w: 60, h: 50 }, // seit 13.91
  karren: { x: -34, y: -40, w: 52, h: 42 }
});

// Bauten der Städte mit eigener Form (seit 14.16): Holzturm an der Palisade, Kristallpfeiler an der Kristallwand,
// Holztor über breiten Toren der Palisade, Treppe in einer Stützmauer (pr.w Kacheln breit, roof 'schnee')
Object.assign(PROP_ART, {
  holzturm(ctx) {
    for (const x of [-15, 11]) box(ctx, x, -62, 4, 62, 1, '#6b4a2e');
    for (const x of [-7, 3]) box(ctx, x, -62, 4, 62, 1, '#5a3a22');
    stroke(ctx, '#4a3020', 1.6, [[-14, -8], [14, -40]]);
    stroke(ctx, '#4a3020', 1.6, [[14, -8], [-14, -40]]);
    box(ctx, -20, -68, 40, 7, 1.5, '#7a5434');
    for (let x = -18; x <= 18; x += 4.5) poly(ctx, [[x - 1.6, -68], [x, -77], [x + 1.6, -68]], '#6b4a2e');
    poly(ctx, [[-22, -76], [0, -98], [22, -76]], '#8a3a22');
    stroke(ctx, darker('#8a3a22', 0.4), 1, [[-22, -76], [22, -76]]);
  },
  // seit 15.80 facettiert (kristall2d): Sockel mit Gesims und silbernem Band, ein hoher Kristall mit zwei Begleitern
  kristallturm(ctx) {
    box(ctx, -12, -14, 24, 14, 2, '#2e2850');
    box(ctx, -13.5, -16, 27, 3.2, 1, '#5a5290');
    box(ctx, -9, -21, 18, 7, 1.5, '#4a4278');
    box(ctx, -9, -21.6, 18, 1.6, 0.6, '#d8d4f0');
    kristall2d(ctx, 5, -21, 22, 5.6, 0.42, kristallPal2('#9fd8ff'));
    kristall2d(ctx, -5, -21, 19, 5, -0.48, kristallPal2('#c8b8ff'));
    kristall2d(ctx, 0, -21.5, 58, 12, 0.02, kristallPal2('#b8a8ff'));
    kristall2d(ctx, -8, -20.5, 6, 2.6, -1.0, kristallPal2('#9fd8ff'));
    kristall2d(ctx, 8.5, -20.5, 5, 2.4, 1.05, kristallPal2('#c8b8ff'));
  },
  holztor(ctx) {
    for (const x of [-60, 60]) {
      box(ctx, x - 5, -80, 10, 80, 2, '#6b4a2e');
      poly(ctx, [[x - 5, -80], [x, -90], [x + 5, -80]], '#5a3a22');
    }
    box(ctx, -66, -74, 132, 8, 2, '#7a5434');
    box(ctx, -60, -60, 120, 5, 1.5, '#5a3a22');
    for (const x of [-30, 0, 30]) {
      oval(ctx, x, -70, 5, 5, '#e8e0c8');
      dot(ctx, x - 1.5, -71, 1.2, 1.2, '#3a2a1c');
      dot(ctx, x + 1.5, -71, 1.2, 1.2, '#3a2a1c');
    }
  },
  treppe(ctx, pr) {
    const w = (pr.w || 2) * TILE;
    const snow = String(pr.roof || '').includes('schnee');
    // Ursprung ist die obere Kante der Kachel (so liegt die Treppe unter Figuren, die darauf stehen)
    for (let k = 0; k < 3; k++) {
      const y = k * 10.5;
      box(ctx, -w / 2 + 1, y, w - 2, 11, 1, k % 2 ? '#8a8a92' : '#9a9aa2');
      stroke(ctx, '#5e5e66', 1, [[-w / 2 + 2, y + 10.5], [w / 2 - 2, y + 10.5]]);
      if (snow) box(ctx, -w / 2 + 3, y + 0.5, w - 6, 2.5, 1, '#f4f8fc');
    }
  }
});
Object.assign(PROP_BOUNDS, {
  holzturm: { x: -26, y: -102, w: 52, h: 106 },
  kristallturm: { x: -16, y: -82, w: 32, h: 86 },
  holztor: { x: -72, y: -96, w: 144, h: 100 },
  treppe: { x: -50, y: -4, w: 100, h: 40 }
});

function propSprite(pr) {
  const b = PROP_BOUNDS[pr.type] || { x: -24, y: -46, w: 48, h: 50 };
  return getSprite('p:' + pr.type + ':' + (pr.roof || '') + (pr.w ? ':' + pr.w : ''), b, (ctx) => PROP_ART[pr.type](ctx, pr));
}

// --- Welt-Objekte für die Tiefensortierung sammeln -------------------------------------------

const OBJ_KIND = { [OBJ.TREE]: 'tree', [OBJ.BLOSSOM]: 'blossom', [OBJ.PINE]: 'pine', [OBJ.DEADTREE]: 'dead', [OBJ.ROCK]: 'rock' };

// Kacheln, auf denen ein Turm steht (dort wird kein Mauerstück gezeichnet)
let towerTiles = null;

function collectWorldObjects(list, x0, y0, x1, y1) {
  const w = game.world;
  if (!towerTiles) {
    towerTiles = new Set(w.props.filter((pr) => TOWER_TYPES.has(pr.type)).map((pr) => Math.floor(pr.y / TILE - 1) * MAP_W + Math.floor(pr.x / TILE)));
  }
  for (let y = y0; y <= Math.min(MAP_H - 1, y1 + 3); y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * MAP_W + x;
      if (w.obj[i] === OBJ.WALL) {
        if (!towerTiles.has(i)) {
          // seit 14.28: an schrägen und runden Mauern folgt das Stück der Mauerlinie (welt.js wallLine): flache
          // Abschnitte als geschertes waagrechtes Stück, steile als senkrechtes, beide auf die Mittellinie geschoben
          const ln = wallLine(w, i);
          const k = ln ? Math.tan(ln.a) : 0;
          const steep = ln && Math.abs(k) > 1.7;
          const dir = ln ? (steep ? 'v' : 'h') : wallVertical(w, i) ? 'v' : 'h';
          list.push({ worldObj: 'wall', dir, style: WALL_STYLE.get(i), x: x * TILE + 16, y: (y + 1) * TILE, ln, shear: ln && !steep ? k : 0 });
        }
        continue;
      }
      const kind = OBJ_KIND[w.obj[i]];
      if (!kind) continue;
      const h = tileHash(x, y);
      list.push({
        worldObj: kind, v: h % 3, style: ZONES[w.zoneIdx[i]].id,
        x: x * TILE + 16 + ((h >> 5) % 5) - 2, y: (y + 1) * TILE - 5
      });
    }
  }
  // seit 13.91: im begehbaren Haus, in dem man steht, statt des Hauses Raum, Möbel und angeschnittene Vorderwand
  const p = game.player;
  const inside = p && game.running && !p.dead ? houseAt(p.x, p.y) : null;
  for (const h of w.houses) {
    if (h.x + h.w < x0 - 1 || h.x > x1 + 1 || h.y + h.h < y0 || h.y > y1 + 4) continue;
    if (h !== inside) {
      list.push({ worldObj: 'house', house: h, x: (h.x + h.w / 2) * TILE, y: (h.y + h.h) * TILE });
      continue;
    }
    list.push({ worldObj: 'hroom', house: h, x: h.x * TILE, y: (h.y + 0.75) * TILE });
    list.push({ worldObj: 'hfront', house: h, x: h.x * TILE, y: (h.y + h.h) * TILE });
    const room = HOUSE_ROOMS[h.enter.room];
    for (const f of room ? room.furn : []) {
      if (!FURN2[f[0]]) continue;
      list.push({ worldObj: 'furn', house: h, kind: f[0], x: (h.x + f[1]) * TILE, y: (h.y + f[2] + (FURN2_DEPTH[f[0]] || 0.2)) * TILE });
    }
  }
  for (const pr of w.props) {
    if (pr.x < (x0 - 3) * TILE || pr.x > (x1 + 3) * TILE || pr.y < y0 * TILE || pr.y > (y1 + 4) * TILE) continue;
    // seit 13.85: Bauten ohne 2D-Bild auslassen statt das ganze Bild abzubrechen
    if (typeof PROP_ART[pr.type] !== 'function') continue;
    list.push({ worldObj: 'prop', prop: pr, x: pr.x, y: pr.y });
  }
}

// Steht die Figur hinter einem Baum oder Haus, wird es durchsichtig
function occludesPlayer(o) {
  const p = game.player;
  if (!p || !game.running || p.dead) return false;
  if (o.worldObj === 'hroom' || o.worldObj === 'hfront' || o.worldObj === 'furn') return false;
  const fy = feetY(p);
  if (o.worldObj === 'house') {
    const W = o.house.w * TILE;
    const H = o.house.h * TILE;
    return Math.abs(p.x - o.x) < W / 2 + 14 && fy < o.y - H + 8 && fy > o.y - H - 46;
  }
  if (o.worldObj === 'prop') {
    const t = o.prop.type;
    if (t === 'gate') return Math.abs(p.x - o.x) < 80 && fy < o.y + 4 && fy > o.y - 110;
    if (TOWER_TYPES.has(t)) return Math.abs(p.x - o.x) < 28 && fy < o.y - 4 && fy > o.y - 100;
    return false;
  }
  if (o.worldObj === 'wall') return Math.abs(p.x - o.x) < 20 && fy < o.y - 2 && fy > o.y - 48;
  if (o.worldObj === 'rock') return false;
  return Math.abs(p.x - o.x) < 26 && fy < o.y - 4 && fy > o.y - 74;
}

// Raum, Vorderwand und Möbel begehbarer Häuser (seit 13.91)
function drawHouseInside(ctx, o) {
  const h = o.house;
  if (o.worldObj === 'furn') {
    const sp = getSprite('f2:' + o.kind, { x: -30, y: -62, w: 60, h: 66 }, (c) => FURN2[o.kind](c));
    ctx.drawImage(sp.img, o.x + sp.bounds.x, o.y + sp.bounds.y, sp.bounds.w, sp.bounds.h);
    if (o.kind === 'kamin') glow(ctx, o.x, o.y - 10, 26, '#ff8a3a', 0.45 + 0.1 * Math.sin(game.time * 8 + o.x));
    if (o.kind === 'tisch') glow(ctx, o.x + 12, o.y - 30, 10, '#ffcf6a', 0.4);
    return;
  }
  const sp = o.worldObj === 'hroom' ? houseRoomSprite(h) : houseFrontSprite(h);
  ctx.drawImage(sp.img, h.x * TILE + sp.bounds.x, h.y * TILE + sp.bounds.y, sp.bounds.w, sp.bounds.h);
}

function drawWorldObject(ctx, o) {
  if (o.worldObj === 'hroom' || o.worldObj === 'hfront' || o.worldObj === 'furn') {
    drawHouseInside(ctx, o);
    return;
  }
  let sp = o.worldObj === 'house' ? houseSprite(o.house)
    : o.worldObj === 'prop' ? propSprite(o.prop)
      : o.worldObj === 'wall' ? wallSprite(o.dir, o.style)
        : objectSprite(o.worldObj, o.v, o.style);
  // seit 15.55: Bäume wiegen sich im Wind (wind2d.js), der Schatten rückt ein Stück mit
  const sway = typeof windSway2d === 'function' ? windSway2d(o) : 0;
  if (sway) sp = windFrame(sp, sway);
  const type = o.worldObj === 'prop' ? o.prop.type : '';
  if (o.worldObj !== 'wall' && type !== 'gate') {
    const shadowW = o.worldObj === 'house' ? o.house.w * TILE * 0.55 : TOWER_TYPES.has(type) ? 24 : type === 'stall' ? 26 : o.worldObj === 'prop' ? 10 : o.worldObj === 'rock' ? 15 : 17;
    softShadow(ctx, o.x + 3 + sway * 0.6, o.y, shadowW, shadowW * (o.worldObj === 'house' ? 0.2 : 0.38), 0.32);
  }
  ctx.save();
  if (occludesPlayer(o)) ctx.globalAlpha = 0.45;
  if (o.ln) {
    ctx.translate(o.x + o.ln.ox * TILE, o.y + o.ln.oy * TILE);
    if (o.shear) ctx.transform(1, o.shear, 0, 1, 0, 0);
    ctx.drawImage(sp.img, sp.bounds.x, sp.bounds.y, sp.bounds.w, sp.bounds.h);
  } else ctx.drawImage(sp.img, o.x + sp.bounds.x, o.y + sp.bounds.y, sp.bounds.w, sp.bounds.h);
  ctx.restore();
  // Laternen leuchten warm
  if (type === 'lantern') glow(ctx, o.x, o.y - 24, 16, '#ffcf6a', 0.35 + 0.08 * Math.sin(game.time * 3 + o.x));
  if (type === 'tower') for (const lx of [-24, 24]) glow(ctx, o.x + lx, o.y - 62, 11, '#ff8a4a', 0.3);
  // seit 14.16: Kristallpfeiler und Teleportsteine leuchten
  if (type === 'kristallturm') glow(ctx, o.x, o.y - 52, 14, '#b8a8ff', 0.35);
  if (type === 'tpstein') {
    // seit 15.30 größer: Kristalle auf den Pfeilern, schwebender Kristall und Podest leuchten
    const tc = o.prop.roof || '#9fd8ff';
    for (const lx of [-22, 22]) glow(ctx, o.x + lx, o.y - 70, 15, tc, 0.4 + 0.12 * Math.sin(game.time * 3 + lx));
    glow(ctx, o.x, o.y - 50, 20, tc, 0.4 + 0.15 * Math.sin(game.time * 2.2));
    glow(ctx, o.x, o.y - 17, 24, tc, 0.3);
  }
  if (type === 'portal') glow(ctx, o.x, o.y - 24, 22, '#9fd0ff', 0.35 + 0.15 * Math.sin(game.time * 2.5));
  if (type === 'brazier') glow(ctx, o.x, o.y - 30, 34, o.prop.roof || '#ff8a4a', 0.4 + 0.12 * Math.sin(game.time * 9 + o.x));
  // seit 13.91 je nach Haus: rote Laternen am geschwungenen Dach oder die Lampe neben der Tür
  if (o.worldObj === 'house') for (const [lx, ly] of houseLamps2(o.house)) glow(ctx, o.x + lx, o.y + ly, 12, '#ff8a4a', 0.3);
}

// --- Stimmung je Gebiet ------------------------------------------------------------------------
// Schwebende Teilchen im Bild (Blütenstaub, Glühwürmchen, Staub, Asche, Schnee, Irrlichter, Funken)
// und eine leichte Färbung, die beim Gebietswechsel weich überblendet.

const AMBIENT = {
  pollen: { rate: 3, o: { color: ['#fff6c0', '#ffe0f0', '#ffffff'], speed: [6, 18], life: [3, 5], size: [1.2, 2.2], drag: 0.2, gravity: -2 } },
  fireflies: { rate: 4, o: { color: ['#d8ff8a', '#f4ffc0'], speed: [8, 22], life: [2, 4], size: [1.5, 2.5], drag: 0.4 } },
  dust: { rate: 5, o: { color: ['#c8a878', '#a88858'], angle: 0.1, spread: 0.2, speed: [40, 80], life: [2, 3], size: [1.5, 3], drag: 0.1, glow: false } },
  ash: { rate: 6, o: { color: ['#8a8080', '#5a5050', '#ff8a3a'], angle: Math.PI / 2, spread: 0.6, speed: [10, 25], life: [3, 5], size: [1.5, 2.8], drag: 0.2, glow: false } },
  snow: { rate: 20, o: { color: ['#ffffff', '#e8f4ff'], angle: Math.PI / 2 + 0.35, spread: 0.15, speed: [35, 65], life: [3, 5], size: [1.5, 3], drag: 0, glow: false }, top: true },
  wisps: { rate: 3, o: { color: ['#a8f0a0', '#6ad08a'], angle: -Math.PI / 2, spread: 0.6, speed: [6, 16], life: [3, 5], size: [2, 3.5], drag: 0.3 } },
  embers: { rate: 10, o: { color: ['#ffb04a', '#ff6a1a', '#ffd34d'], angle: -Math.PI / 2, spread: 0.5, speed: [20, 50], life: [2, 3.5], size: [1.5, 2.5], drag: 0.3, shape: 'ember' } }
};

const ambientState = { tint: [0, 0, 0, 0], acc: 0 };

function updateAmbient(dt) {
  const p = game.player;
  if (!p) return;
  const zone = zoneAt(p.x, p.y);
  const amb = zone.ambient || {};
  // Färbung weich nachführen
  const goal = amb.tint || [0, 0, 0, 0];
  const t = ambientState.tint;
  const k = Math.min(1, dt * 1.5);
  for (let i = 0; i < 4; i++) t[i] += (goal[i] - t[i]) * k;
  const def = AMBIENT[amb.kind];
  if (!def) return;
  ambientState.acc += def.rate * dt;
  const r = renderer;
  const vw = r.w / r.zoom;
  const vh = r.h / r.zoom;
  while (ambientState.acc >= 1) {
    ambientState.acc -= 1;
    const x = r.camX + Math.random() * vw;
    const y = def.top ? r.camY + Math.random() * vh * 0.6 - 40 : r.camY + Math.random() * vh;
    particles(x, y, { count: 1, ...def.o });
  }
}

// Nacht (seit 13.8, tag-nacht.js) und Gebietsfärbung – seit 14.88 als eine Fläche: zwei halbdurchsichtige Flächen
// übereinander ergeben dieselbe Farbe wie eine mit a = 1 − (1 − a1)(1 − a2) (spart am Handy eine Bildschirmfläche)
// Seit Wärme 2 als eigene Rechnung [r, g, b, a] (a = 0: keine Färbung; das Feld wird wiederverwendet): dieselbe Farbe
// malt mit der Sparoptik eine Fläche in der 3D-Szene (drei-kern.js v3SyncTint) statt das ganze 2D-Overlay.
const _zoneTint = [0, 0, 0, 0];
function zoneTintRGBA() {
  const out = _zoneTint;
  const n = typeof nightTintRGBA === 'function' ? nightTintRGBA() : null;
  const t = ambientState.tint;
  const a1 = n ? n[3] : 0;
  const a2 = t[3] < 0.005 ? 0 : t[3];
  out[3] = 0;
  if (a1 < 0.005 && a2 < 0.005) return out;
  const A = 1 - (1 - a1) * (1 - a2);
  const k1 = (a1 * (1 - a2)) / A;
  const k2 = a2 / A;
  for (let i = 0; i < 3; i++) out[i] = Math.round((n ? n[i] : 0) * k1 + t[i] * k2);
  out[3] = A;
  return out;
}
function drawZoneTint(ctx, w, h) {
  const c = zoneTintRGBA();
  if (!(c[3] > 0)) return;
  ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${c[3].toFixed(3)})`;
  ctx.fillRect(0, 0, w, h);
}
