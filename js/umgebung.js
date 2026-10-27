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
  ['#514844', '#6a5f59']  // ASH
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
    if (g === GROUND.PATH || g === GROUND.PLAZA) g = GROUND[ZONES[w.zoneIdx[i]].ground];
    img.data.set([...rgb(GROUND_PALETTE[g][w.shade[i] >> 5]), 255], i * 4);
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
      if (g === GROUND.PATH || g === GROUND.PLAZA || g === GROUND.WATER) {
        ctx.fillStyle = GROUND_PALETTE[g][Math.min(7, (w.shade[i] >> 6) + 3)];
        ctx.fillRect(px, py, TILE + 0.6, TILE + 0.6);
      }
      if (g === GROUND.WATER && w.deco[i] !== DECO.BRIDGE) drawShore(ctx, x, y, px, py);
      else if (g === GROUND.PLAZA) drawPlazaTile(ctx, px, py, h);
      if (g === GROUND.PATH || g === GROUND.PLAZA) drawGrassFringe(ctx, x, y, px, py, h);
      const d = w.deco[i];
      if (d) drawDeco(ctx, d, g, px, py, h);
    }
  }
  return c;
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
  while (chunkCache.size > 40) chunkCache.delete(chunkCache.keys().next().value);
  // Bewegtes Wasser
  const t = game.time;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * MAP_W + x;
      if (w.ground[i] === GROUND.WATER && w.deco[i] !== DECO.BRIDGE) drawWaterTile(ctx, x, y, x * TILE, y * TILE, tileHash(x, y), t);
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
    if (n === GROUND.WATER || n === -1) continue;
    if (dy === -1) ctx.fillRect(px, py + 4, TILE, 1.8);
    if (dy === 1) ctx.fillRect(px, py + TILE - 5.8, TILE, 1.8);
    if (dx === -1) ctx.fillRect(px + 4, py, 1.8, TILE);
    if (dx === 1) ctx.fillRect(px + TILE - 5.8, py, 1.8, TILE);
  }
}

// Sandstreifen am Ufer (fest, wird mit dem Boden vorgezeichnet)
function drawShore(ctx, x, y, px, py) {
  ctx.fillStyle = 'rgba(201,176,122,0.95)';
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const n = groundAt(x + dx, y + dy);
    if (n === GROUND.WATER || n === -1) continue;
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
      const dark = g === GROUND.FOREST ? 'rgba(18,36,14,0.55)' : 'rgba(34,64,22,0.5)';
      const light = g === GROUND.FOREST ? 'rgba(110,150,80,0.45)' : 'rgba(150,200,100,0.45)';
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
    case DECO.CRACK:
      ctx.strokeStyle = 'rgba(28,18,16,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + ox, py + oy - 6);
      ctx.lineTo(px + ox + 6, py + oy - 2);
      ctx.lineTo(px + ox + 4, py + oy + 4);
      ctx.moveTo(px + ox + 6, py + oy - 2);
      ctx.lineTo(px + ox + 11, py + oy - 3);
      ctx.stroke();
      break;
    case DECO.BRIDGE: {
      ctx.fillStyle = '#8a6a44';
      ctx.fillRect(px, py, TILE + 0.5, TILE + 0.5);
      ctx.fillStyle = 'rgba(40,25,10,0.35)';
      for (let k = 0; k < 5; k++) ctx.fillRect(px, py + k * 6.4, TILE, 1.2);
      ctx.fillStyle = '#5a3f26';
      ctx.fillRect(px, py, 3, TILE);
      ctx.fillRect(px + TILE - 3, py, 3, TILE);
      break;
    }
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
  pine(ctx, v) {
    box(ctx, -2.5, -12, 5, 13, 1, '#5a3f2a');
    const tiers = 4 + (v === 2 ? 1 : 0);
    for (let k = 0; k < tiers; k++) {
      const y = -8 - k * 12;
      const hw = 20 - k * (16 / tiers) - (v === 1 ? 2 : 0);
      const pts = [[-hw, y]];
      for (let j = 1; j < 6; j++) pts.push([-hw + (2 * hw * j) / 6, y + (j % 2 ? 2.5 : 0)]);
      pts.push([hw, y], [0, y - 24]);
      poly(ctx, pts, '#245242');
      poly(ctx, [[-hw * 0.9, y - 1], [-2, y - 1], [0, y - 22]], '#346a55');
    }
    dot(ctx, -2, -8 - (tiers - 1) * 12 - 16, 1.6, 2.5, '#5a9a7a');
  },
  dead(ctx, v) {
    const branch = (x0, y0, x1, y1, w0, w1) => {
      const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      poly(ctx, [[x0 + c * w0, y0 + s * w0], [x1 + c * w1, y1 + s * w1], [x1 - c * w1, y1 - s * w1], [x0 - c * w0, y0 - s * w0]], '#4a3527');
    };
    const m = v === 1 ? -1 : 1;
    branch(0, 1, 1 * m, -30, 4.5, 2.2);
    branch(0.5 * m, -14, 12 * m, -26, 2, 0.8);
    branch(0.8 * m, -22, -10 * m, -36, 1.8, 0.7);
    branch(1 * m, -28, 4 * m, -42, 1.5, 0.6);
    if (v === 2) branch(0, -8, -9, -16, 1.6, 0.6);
    poly(ctx, [[-6, 1.5], [-2, -3], [2, -3], [7, 1.5]], '#3a2a1e');
  }
};

// Felsen je Zone: graues Gestein, bemoost im Wald, Sandstein im Orktal, Basalt im Ödland
const ROCK_STYLES = {
  wiesen: ['#7d7a74', '#9c9890', null],
  dorf: ['#7d7a74', '#9c9890', null],
  wald: ['#6a6c66', '#878a82', '#4f7a3a'],
  orktal: ['#a07a50', '#c29a6a', null],
  oedland: ['#454048', '#5c5660', null]
};

function rockArt(ctx, style, v) {
  const [base, top, moss] = ROCK_STYLES[style];
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
}

const TREE_BOUNDS = { x: -34, y: -82, w: 68, h: 90 };

function objectSprite(kind, v, style) {
  if (kind === 'rock') return getSprite(`o:rock:${style}:${v}`, { x: -24, y: -30, w: 50, h: 36 }, (ctx) => rockArt(ctx, style, v));
  return getSprite(`o:${kind}:${v}`, TREE_BOUNDS, (ctx) => TREE_ART[kind](ctx, v));
}

// --- Häuser im ostasiatischen Stil --------------------------------------------------------
// Ursprung ist die Mitte der unteren Hauskante.

function houseArt(ctx, h) {
  const W = h.w * TILE;
  const H = h.h * TILE;
  const wallTop = -H * 0.52;
  const roof = h.roof;
  // Fundament und Wände
  box(ctx, -W / 2 + 4, -7, W - 8, 9, 2, '#8a8478');
  box(ctx, -W / 2 + 9, wallTop, W - 18, -wallTop - 6, 1.5, '#dcc8a0');
  const posts = Math.max(3, h.w + 1);
  for (let k = 0; k < posts; k++) {
    const x = -W / 2 + 9 + ((W - 18) * k) / (posts - 1);
    box(ctx, x - 2.5, wallTop, 5, -wallTop - 6, 1, '#5a3a22');
  }
  box(ctx, -W / 2 + 9, wallTop + 2, W - 18, 4, 1, '#5a3a22');
  // Papierfenster zwischen den Pfosten, die Tür in der Mitte
  for (let k = 0; k < posts - 1; k++) {
    const x0 = -W / 2 + 9 + ((W - 18) * k) / (posts - 1) + 5;
    const x1 = -W / 2 + 9 + ((W - 18) * (k + 1)) / (posts - 1) - 5;
    const mid = (x0 + x1) / 2;
    if (Math.abs(mid) < 14) continue;
    box(ctx, x0 + 2, wallTop + 10, x1 - x0 - 4, 14, 1, '#f3e2b0');
    for (let gx = x0 + 6; gx < x1 - 4; gx += 5) stroke(ctx, '#8a6a44', 0.7, [[gx, wallTop + 10], [gx, wallTop + 24]]);
    stroke(ctx, '#8a6a44', 0.7, [[x0 + 2, wallTop + 17], [x1 - 2, wallTop + 17]]);
  }
  box(ctx, -10, -33, 20, 27, 1.5, '#4a2e1c');
  box(ctx, -8, -31, 7, 24, 1, '#6b4a2e');
  box(ctx, 1, -31, 7, 24, 1, '#6b4a2e');
  // Dach mit hochgezogenen Ecken
  const eave = wallTop + 8;
  const ridge = -H - 16;
  const ext = 14;
  const roofPath = () => {
    ctx.beginPath();
    ctx.moveTo(-W / 2 - ext - 7, eave - 11);
    ctx.quadraticCurveTo(-W / 2 - ext + 4, eave + 3, -W / 2, eave + 3);
    ctx.lineTo(W / 2, eave + 3);
    ctx.quadraticCurveTo(W / 2 + ext - 4, eave + 3, W / 2 + ext + 7, eave - 11);
    ctx.quadraticCurveTo(W / 2 + 2, (eave + ridge) / 2, W / 2 - 12, ridge);
    ctx.lineTo(-W / 2 + 12, ridge);
    ctx.quadraticCurveTo(-W / 2 - 2, (eave + ridge) / 2, -W / 2 - ext - 7, eave - 11);
    ctx.closePath();
  };
  paintShape(ctx, roofPath, roof, -W / 2 - ext - 7, ridge, W + 2 * ext + 14, eave + 3 - ridge);
  // Ziegelreihen
  ctx.save();
  roofPath();
  ctx.clip();
  ctx.strokeStyle = darker(roof, 0.35);
  ctx.lineWidth = 0.9;
  for (let x = -W / 2 - ext; x < W / 2 + ext; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x * 0.82, ridge);
    ctx.lineTo(x, eave + 3);
    ctx.stroke();
  }
  ctx.strokeStyle = lighter(roof, 0.18);
  for (let k = 1; k < 5; k++) {
    const y = ridge + ((eave - ridge) * k) / 5;
    ctx.beginPath();
    ctx.moveTo(-W / 2 - ext, y + 3);
    ctx.quadraticCurveTo(0, y - 2, W / 2 + ext, y + 3);
    ctx.stroke();
  }
  ctx.restore();
  stroke(ctx, lighter(roof, 0.3), 2.2, [[-W / 2 - 2, eave + 2], [W / 2 + 2, eave + 2]]);
  // First mit verzierten Enden
  box(ctx, -W / 2 + 8, ridge - 5, W - 16, 7, 2, darker(roof, 0.4));
  poly(ctx, [[-W / 2 + 8, ridge - 5], [-W / 2 + 2, ridge - 13], [-W / 2 + 6, ridge - 13], [-W / 2 + 13, ridge - 4]], darker(roof, 0.4));
  poly(ctx, [[W / 2 - 8, ridge - 5], [W / 2 - 2, ridge - 13], [W / 2 - 6, ridge - 13], [W / 2 - 13, ridge - 4]], darker(roof, 0.4));
  // Rote Laternen an den Ecken
  for (const x of [-W / 2 + 4, W / 2 - 4]) {
    stroke(ctx, '#2a1c14', 0.8, [[x, eave + 2], [x, eave + 7]]);
    oval(ctx, x, eave + 12, 4.2, 5.2, '#c8402f');
    box(ctx, x - 3, eave + 6, 6, 1.6, 0.5, '#c9a35a');
    box(ctx, x - 3, eave + 16.5, 6, 1.6, 0.5, '#c9a35a');
  }
}

function houseSprite(h) {
  const W = h.w * TILE;
  const H = h.h * TILE;
  return getSprite(`h:${h.w}:${h.h}:${h.roof}`, { x: -W / 2 - 28, y: -H - 34, w: W + 56, h: H + 44 }, (ctx) => houseArt(ctx, h));
}

// --- Dorfschmuck -------------------------------------------------------------------------

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

function propSprite(type) {
  return getSprite('p:' + type, { x: -24, y: -46, w: 48, h: 50 }, (ctx) => PROP_ART[type](ctx));
}

// --- Welt-Objekte für die Tiefensortierung sammeln -------------------------------------------

const OBJ_KIND = { [OBJ.TREE]: 'tree', [OBJ.BLOSSOM]: 'blossom', [OBJ.PINE]: 'pine', [OBJ.DEADTREE]: 'dead', [OBJ.ROCK]: 'rock' };

function collectWorldObjects(list, x0, y0, x1, y1) {
  const w = game.world;
  for (let y = y0; y <= Math.min(MAP_H - 1, y1 + 3); y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * MAP_W + x;
      const kind = OBJ_KIND[w.obj[i]];
      if (!kind) continue;
      const h = tileHash(x, y);
      list.push({
        worldObj: kind, v: h % 3, style: ZONES[w.zoneIdx[i]].id,
        x: x * TILE + 16 + ((h >> 5) % 5) - 2, y: (y + 1) * TILE - 5
      });
    }
  }
  for (const h of w.houses) {
    if (h.x + h.w < x0 - 1 || h.x > x1 + 1 || h.y + h.h < y0 || h.y > y1 + 4) continue;
    list.push({ worldObj: 'house', house: h, x: (h.x + h.w / 2) * TILE, y: (h.y + h.h) * TILE });
  }
  for (const pr of w.props) {
    if (pr.x < (x0 - 1) * TILE || pr.x > (x1 + 1) * TILE || pr.y < y0 * TILE || pr.y > (y1 + 3) * TILE) continue;
    list.push({ worldObj: 'prop', prop: pr, x: pr.x, y: pr.y });
  }
}

// Steht die Figur hinter einem Baum oder Haus, wird es durchsichtig
function occludesPlayer(o) {
  const p = game.player;
  if (!p || !game.running || p.dead) return false;
  const fy = feetY(p);
  if (o.worldObj === 'house') {
    const W = o.house.w * TILE;
    const H = o.house.h * TILE;
    return Math.abs(p.x - o.x) < W / 2 + 14 && fy < o.y - H + 8 && fy > o.y - H - 46;
  }
  if (o.worldObj === 'prop' || o.worldObj === 'rock') return false;
  return Math.abs(p.x - o.x) < 26 && fy < o.y - 4 && fy > o.y - 74;
}

function drawWorldObject(ctx, o) {
  const sp = o.worldObj === 'house' ? houseSprite(o.house)
    : o.worldObj === 'prop' ? propSprite(o.prop.type)
      : objectSprite(o.worldObj, o.v, o.style);
  const shadowW = o.worldObj === 'house' ? o.house.w * TILE * 0.55 : o.worldObj === 'prop' ? 10 : o.worldObj === 'rock' ? 15 : 17;
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ellipse(ctx, o.x + 3, o.y, shadowW, shadowW * (o.worldObj === 'house' ? 0.18 : 0.38));
  ctx.save();
  if (occludesPlayer(o)) ctx.globalAlpha = 0.45;
  ctx.drawImage(sp.img, o.x + sp.bounds.x, o.y + sp.bounds.y, sp.bounds.w, sp.bounds.h);
  ctx.restore();
  // Laternen leuchten warm
  if (o.worldObj === 'prop' && o.prop.type === 'lantern') glow(ctx, o.x, o.y - 24, 16, '#ffcf6a', 0.35 + 0.08 * Math.sin(game.time * 3 + o.x));
  if (o.worldObj === 'house') {
    const W = o.house.w * TILE;
    const eave = -o.house.h * TILE * 0.52 + 8;
    for (const lx of [-W / 2 + 4, W / 2 - 4]) glow(ctx, o.x + lx, o.y + eave + 12, 12, '#ff8a4a', 0.3);
  }
}
