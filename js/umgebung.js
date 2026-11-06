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

function buildGroundImage() {
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
    img.data.set([...rgb((GROUND_PALETTE[g] || GROUND_PALETTE[GROUND.BASALT])[w.shade[i] >> 5]), 255], i * 4);
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
  const c = newCanvas(size * CHUNK_SCALE, size * CHUNK_SCALE);
  const ctx = c.getContext('2d');
  ctx.scale(CHUNK_SCALE, CHUNK_SCALE);
  ctx.translate(-cx * size, -cy * size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const tx0 = cx * CHUNK;
  const ty0 = cy * CHUNK;
  const sx = Math.max(0, tx0 - 1);
  const sy = Math.max(0, ty0 - 1);
  const sw = Math.min(MAP_W, tx0 + CHUNK + 1) - sx;
  const sh = Math.min(MAP_H, ty0 + CHUNK + 1) - sy;
  ctx.drawImage(groundImage, sx, sy, sw, sh, sx * TILE + TILE / 2 - TILE / 2, sy * TILE + TILE / 2 - TILE / 2, sw * TILE, sh * TILE);
  for (let y = ty0; y < Math.min(MAP_H, ty0 + CHUNK); y++) {
    for (let x = tx0; x < Math.min(MAP_W, tx0 + CHUNK); x++) {
      const i = y * MAP_W + x;
      const g = w.ground[i];
      const h = tileHash(x, y);
      const px = x * TILE;
      const py = y * TILE;
      if (w.obj[i] === OBJ.CAVEWALL) {
        // seit 13.86: Hallen der Turnierarena mit eigenen Wandfarben (zone.wallLook wie dungeon.wall)
        drawCaveWall(ctx, x, y, px, py, h, ZONES[w.zoneIdx[i]].dungeon || ZONES[w.zoneIdx[i]].wallLook);
        continue;
      }
      if (g === GROUND.PATH || g === GROUND.PLAZA || LIQUID.has(g) || g === GROUND.ICE || g === GROUND.FLAGSTONE) {
        ctx.fillStyle = (GROUND_PALETTE[g] || GROUND_PALETTE[GROUND.BASALT])[Math.min(7, (w.shade[i] >> 6) + 3)];
        ctx.fillRect(px, py, TILE + 0.6, TILE + 0.6);
      }
      if (LIQUID.has(g) && w.deco[i] !== DECO.BRIDGE) drawShore(ctx, x, y, px, py, g);
      else if (g === GROUND.ICE) drawIceTile(ctx, px, py, h);
      else if (g === GROUND.PLAZA || g === GROUND.FLAGSTONE) drawPlazaTile(ctx, px, py, h);
      // Schatten unter Dungeon-Wänden
      if (wallAt(x, y - 1)) {
        const sg = ctx.createLinearGradient(0, py, 0, py + 14);
        sg.addColorStop(0, 'rgba(0,0,0,0.5)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(px, py, TILE + 0.6, 14);
      }
      if (g === GROUND.PATH || g === GROUND.PLAZA) drawGrassFringe(ctx, x, y, px, py, h);
      const d = w.deco[i];
      if (d === DECO.BRIDGE) drawBridge2(ctx, px, py, bridgeHoriz(x, y), typeof bridgeStyleAt === 'function' ? bridgeStyleAt(i, g) : null);
      else if (d) drawDeco(ctx, d, g, px, py, h);
    }
  }
  return c;
}

// Dungeon-Wände: Oberseite mit Fugen bzw. Rissen, zur offenen Seite hin eine dunklere Vorderseite
const wallAt = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && game.world.obj[y * MAP_W + x] === OBJ.CAVEWALL;
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

function drawGround(ctx, x0, y0, x1, y1) {
  const w = game.world;
  if (!groundImage) groundImage = buildGroundImage();
  const size = CHUNK * TILE;
  for (let cy = Math.floor(y0 / CHUNK); cy <= Math.floor(y1 / CHUNK); cy++) {
    for (let cx = Math.floor(x0 / CHUNK); cx <= Math.floor(x1 / CHUNK); cx++) {
      const key = cx + ':' + cy;
      let c = chunkCache.get(key);
      if (c) chunkCache.delete(key);
      else c = renderGroundChunk(cx, cy);
      chunkCache.set(key, c);
      ctx.drawImage(c, cx * size, cy * size, size, size);
    }
  }
  // Nur die ältesten Blöcke verwerfen, die gerade sicher nicht zu sehen sind
  // (jeder Block ist ein großes Bild im Grafikspeicher, deshalb nicht zu viele behalten)
  while (chunkCache.size > 28) chunkCache.delete(chunkCache.keys().next().value);
  // Bewegtes Wasser
  const t = game.time;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * MAP_W + x;
      const g = w.ground[i];
      if (!LIQUID.has(g) || w.deco[i] === DECO.BRIDGE) continue;
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
    case DECO.PEBBLE:
      ctx.fillStyle = 'rgba(80,66,46,0.4)';
      ctx.beginPath();
      ctx.ellipse(px + ox, py + oy, 2.2, 1.5, 0, 0, Math.PI * 2);
      ctx.ellipse(px + ox + 9, py + oy - 5, 1.5, 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(px + ox - 1, py + oy - 1, 1.5, 1);
      break;
    case DECO.STUMP:
      ctx.fillStyle = '#5a3f2a';
      ctx.beginPath();
      ctx.ellipse(px + ox, py + oy, 6, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8a070';
      ctx.beginPath();
      ctx.ellipse(px + ox, py + oy - 2, 5, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case DECO.LOG:
      ctx.fillStyle = '#5a3f2a';
      ctx.fillRect(px + ox - 10, py + oy - 3, 20, 6);
      ctx.fillStyle = '#c8a070';
      ctx.beginPath();
      ctx.ellipse(px + ox + 10, py + oy, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case DECO.MUSHROOM:
      for (const [fx, fy] of [[0, 0], [6, 3], [-5, 4]]) {
        ctx.fillStyle = '#efe6cc';
        ctx.fillRect(px + ox + fx - 0.8, py + oy + fy - 3, 1.6, 4);
        ctx.fillStyle = g === GROUND.SWAMP ? '#7ad86a' : '#c84a3a';
        ctx.beginPath();
        ctx.arc(px + ox + fx, py + oy + fy - 3, 2.6, Math.PI, 0);
        ctx.fill();
      }
      break;
    case DECO.BONES:
      ctx.strokeStyle = '#e0d8c0';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(px + ox - 6, py + oy); ctx.lineTo(px + ox + 4, py + oy + 2);
      ctx.moveTo(px + ox - 3, py + oy + 4); ctx.lineTo(px + ox + 6, py + oy - 2);
      ctx.stroke();
      ctx.fillStyle = '#e8e0c8';
      ctx.beginPath();
      ctx.arc(px + ox + 8, py + oy - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case DECO.SHRUB:
      ctx.fillStyle = '#3f7a32';
      for (const [fx, fy, r] of [[0, 0, 5], [5, 1, 4], [-4, 2, 4], [1, -3, 4]]) {
        ctx.beginPath();
        ctx.arc(px + ox + fx, py + oy + fy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case DECO.CRYSTAL:
      ctx.fillStyle = g === GROUND.SNOW || g === GROUND.ICE ? '#bfe8ff' : g === GROUND.BASALT ? '#ff7a2a' : '#9fd0ff';
      for (const [fx, h2] of [[0, 9], [4, 6], [-4, 5]]) {
        ctx.beginPath();
        ctx.moveTo(px + ox + fx - 2, py + oy);
        ctx.lineTo(px + ox + fx, py + oy - h2);
        ctx.lineTo(px + ox + fx + 2, py + oy);
        ctx.fill();
      }
      break;
    case DECO.DEADTREE:
      ctx.strokeStyle = '#3a2a20';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + ox, py + oy); ctx.lineTo(px + ox, py + oy - 14);
      ctx.moveTo(px + ox, py + oy - 8); ctx.lineTo(px + ox + 6, py + oy - 13);
      ctx.moveTo(px + ox, py + oy - 5); ctx.lineTo(px + ox - 5, py + oy - 9);
      ctx.stroke();
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
function bridgeHoriz(x, y) {
  // seit 14.16: Brücken und Stege in den Städten wissen ihre Richtung (welt.js BRIDGE_DIR)
  const fix = typeof bridgeDirAt === 'function' ? bridgeDirAt(x, y) : undefined;
  if (fix !== undefined) return fix;
  const w = game.world;
  const way = (tx, ty) => w.ground[ty * MAP_W + tx] === GROUND.PATH || w.deco[ty * MAP_W + tx] === DECO.BRIDGE;
  return way(x - 1, y) && way(x + 1, y);
}

// Brückenarten in den Städten (seit 14.16, bridgeStyleAt in welt.js): Steg über dem Moor, Steinbrücke über Lava,
// Lichtbrücke über dem Abgrund; sonst die Holzbrücke wie bisher
const BRIDGE2 = {
  steg: { deck: '#6e5a40', line: 'rgba(30,20,10,0.45)', rail: null, post: '#3e3022' },
  stein: { deck: '#5a5250', line: 'rgba(20,14,12,0.5)', rail: '#3a3230', post: null },
  licht: { deck: '#8a86d8', line: 'rgba(230,226,255,0.55)', rail: '#d8d4ff', post: null }
};
function drawBridge2(ctx, px, py, horiz, style) {
  const B = BRIDGE2[style];
  if (B) {
    ctx.fillStyle = B.deck;
    ctx.fillRect(px, py, TILE + 0.5, TILE + 0.5);
    ctx.fillStyle = B.line;
    for (let k = 0; k < 4; k++) {
      if (horiz) ctx.fillRect(px + k * 8 + 3, py, 1.2, TILE);
      else ctx.fillRect(px, py + k * 8 + 3, TILE, 1.2);
    }
    if (B.rail) {
      ctx.fillStyle = B.rail;
      if (horiz) { ctx.fillRect(px, py, TILE, 2.5); ctx.fillRect(px, py + TILE - 2.5, TILE, 2.5); }
      else { ctx.fillRect(px, py, 2.5, TILE); ctx.fillRect(px + TILE - 2.5, py, 2.5, TILE); }
    }
    if (B.post) {
      ctx.fillStyle = B.post;
      for (const [a, b] of horiz ? [[2, 1], [24, 1], [12, TILE - 5]] : [[1, 2], [1, 24], [TILE - 5, 12]]) ctx.fillRect(px + a, py + b, 4, 4);
    }
    return;
  }
  ctx.fillStyle = '#8a6a44';
  ctx.fillRect(px, py, TILE + 0.5, TILE + 0.5);
  ctx.fillStyle = 'rgba(40,25,10,0.35)';
  for (let k = 0; k < 5; k++) {
    if (horiz) ctx.fillRect(px + k * 6.4, py, 1.2, TILE);
    else ctx.fillRect(px, py + k * 6.4, TILE, 1.2);
  }
  ctx.fillStyle = '#5a3f26';
  if (horiz) {
    ctx.fillRect(px, py, TILE, 3);
    ctx.fillRect(px, py + TILE - 3, TILE, 3);
  } else {
    ctx.fillRect(px, py, 3, TILE);
    ctx.fillRect(px + TILE - 3, py, 3, TILE);
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

// Felsen je Zone: graues Gestein, bemoost im Wald, Sandstein im Orktal, Basalt im Ödland
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
  paintShape(ctx, () => { ctx.beginPath(); ctx.rect(-10.5, -50, 21, 36); }, WALL_ROOF, -10.5, -50, 21, 36);
  for (let y = -46; y < -14; y += 5) stroke(ctx, darker(WALL_ROOF, 0.4), 0.7, [[-10, y], [10, y]]);
  box(ctx, -2, -51, 4, 37, 1, darker(WALL_ROOF, 0.35));
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
    box(ctx, -7, -24, 14, 24, 1, st);
    box(ctx, -7.5, -26, 15, 8, 3, '#f4f8fc');
  },
  kristall(ctx, dir) {
    const c = '#6a5ac8';
    if (dir === 'h') {
      box(ctx, -16.5, -8, 33, 8, 1, '#2e2850');
      for (let k = 0; k < 3; k++) {
        const x = -16 + k * 11;
        poly(ctx, [[x, -8], [x + 1, -30 - (k % 2) * 4], [x + 5.5, -34 - (k % 2) * 4], [x + 10, -30 - (k % 2) * 4], [x + 11, -8]], k % 2 ? c : lighter(c, 0.1));
        stroke(ctx, '#d8d0ff', 1, [[x + 5.5, -31 - (k % 2) * 4], [x + 5.5, -10]]);
      }
      return;
    }
    box(ctx, -7, -12, 14, 12, 1, '#2e2850');
    poly(ctx, [[-6, -12], [-5, -40], [0, -44], [5, -40], [6, -12]], c);
    stroke(ctx, '#d8d0ff', 1, [[0, -40], [0, -14]]);
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
  return getSprite(key, { x: -W / 2 - 28, y: -H - 64, w: W + 56, h: H + 74 }, (ctx) => houseArt(ctx, h));
}
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
  kristallturm(ctx) {
    box(ctx, -12, -14, 24, 14, 2, '#2e2850');
    box(ctx, -9, -20, 18, 7, 1.5, '#4a4278');
    poly(ctx, [[-7, -20], [-6, -62], [0, -78], [6, -62], [7, -20]], '#8a7aff');
    poly(ctx, [[-2, -22], [-1.5, -60], [0, -70], [1.5, -60], [2, -22]], '#e8e4ff');
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
          const vertical = wallVertical(w, i);
          list.push({ worldObj: 'wall', dir: vertical ? 'v' : 'h', style: WALL_STYLE.get(i), x: x * TILE + 16, y: (y + 1) * TILE });
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
  const sp = o.worldObj === 'house' ? houseSprite(o.house)
    : o.worldObj === 'prop' ? propSprite(o.prop)
      : o.worldObj === 'wall' ? wallSprite(o.dir, o.style)
        : objectSprite(o.worldObj, o.v, o.style);
  const type = o.worldObj === 'prop' ? o.prop.type : '';
  if (o.worldObj !== 'wall' && type !== 'gate') {
    const shadowW = o.worldObj === 'house' ? o.house.w * TILE * 0.55 : TOWER_TYPES.has(type) ? 24 : type === 'stall' ? 26 : o.worldObj === 'prop' ? 10 : o.worldObj === 'rock' ? 15 : 17;
    softShadow(ctx, o.x + 3, o.y, shadowW, shadowW * (o.worldObj === 'house' ? 0.2 : 0.38), 0.32);
  }
  ctx.save();
  if (occludesPlayer(o)) ctx.globalAlpha = 0.45;
  ctx.drawImage(sp.img, o.x + sp.bounds.x, o.y + sp.bounds.y, sp.bounds.w, sp.bounds.h);
  ctx.restore();
  // Laternen leuchten warm
  if (type === 'lantern') glow(ctx, o.x, o.y - 24, 16, '#ffcf6a', 0.35 + 0.08 * Math.sin(game.time * 3 + o.x));
  if (type === 'tower') for (const lx of [-24, 24]) glow(ctx, o.x + lx, o.y - 62, 11, '#ff8a4a', 0.3);
  // seit 14.16: Kristallpfeiler und Teleportsteine leuchten
  if (type === 'kristallturm') glow(ctx, o.x, o.y - 52, 14, '#b8a8ff', 0.35);
  if (type === 'tpstein') for (const lx of [-13, 13]) glow(ctx, o.x + lx, o.y - 40, 9, o.prop.roof || '#9fd8ff', 0.35 + 0.1 * Math.sin(game.time * 3 + lx));
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

function drawZoneTint(ctx, w, h) {
  // Nacht (seit 13.8, tag-nacht.js)
  if (typeof drawNightTint === 'function') drawNightTint(ctx, w, h);
  const [r, g, b, a] = ambientState.tint;
  if (a < 0.005) return;
  ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
  ctx.fillRect(0, 0, w, h);
}
