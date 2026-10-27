// Spielwelt: Kachelkarte erzeugen, Zonen bestimmen, Kollision prüfen.
// Die Welt wird aus einer festen Zahl (WORLD_SEED) erzeugt und sieht daher
// bei jedem Start gleich aus – wichtig, sobald später mehrere Spieler darin unterwegs sind.

const TILE = 32;          // Größe einer Kachel in Pixeln
const MAP_W = 200;        // Breite in Kacheln
const MAP_H = 200;
const CENTER_X = MAP_W / 2;
const CENTER_Y = MAP_H / 2;
const VILLAGE_HALF = 14;  // Dorfmauer: Quadrat 14 Kacheln um die Mitte; drinnen greifen Monster nicht an
const SAFE_RING = 24;     // so weit vom Dorfzentrum bleiben Monster beim Erscheinen weg (10 Kacheln vor der Mauer)
const GATE_HALF = 2;      // Tore sind 4 Kacheln breit
const WORLD_SEED = 20261027;
const WORLD_VERSION = 2;  // erhöhen, wenn sich die Karte ändert (alte Positionen werden dann verworfen)

// Bodenarten
const GROUND = { GRASS: 0, MEADOW: 1, FOREST: 2, PATH: 3, WATER: 4, PLAZA: 5, SAND: 6, ASH: 7, SNOW: 8, SWAMP: 9, LAVA: 10, BOG: 11, ICE: 12, BASALT: 13 };
// Gewässer, durch die man nicht laufen kann (zugefrorene Seen schon)
const LIQUID = new Set([GROUND.WATER, GROUND.LAVA, GROUND.BOG]);
// Objekte auf dem Boden (alle blockieren den Weg)
const OBJ = { NONE: 0, TREE: 1, PINE: 2, ROCK: 3, DEADTREE: 4, HOUSE: 5, BLOSSOM: 6, WALL: 7 };
// Verzierungen ohne Kollision
const DECO = { NONE: 0, TUFT: 1, FLOWER_RED: 2, FLOWER_YELLOW: 3, FLOWER_WHITE: 4, PEBBLE: 5, CRACK: 6, BRIDGE: 7 };

// Zufallsgenerator mit Startwert: gleiche Zahl → gleiche Welt
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Weiches Rauschen für natürlich wirkende Seen und Wälder
function makeNoise(rng, cell) {
  const gw = Math.ceil(MAP_W / cell) + 2;
  const gh = Math.ceil(MAP_H / cell) + 2;
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = x / cell;
    const gy = y / cell;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = smooth(gx - x0);
    const fy = smooth(gy - y0);
    const a = grid[y0 * gw + x0];
    const b = grid[y0 * gw + x0 + 1];
    const c = grid[(y0 + 1) * gw + x0];
    const d = grid[(y0 + 1) * gw + x0 + 1];
    const top = a + (b - a) * fx;
    const bottom = c + (d - c) * fx;
    return top + (bottom - top) * fy;
  };
}

// Das Dorf ist ein Quadrat innerhalb der Mauer, die Jagdzonen sind Ringe darum
function zoneIndexAt(x, y) {
  const dx = Math.abs(x + 0.5 - CENTER_X);
  const dy = Math.abs(y + 0.5 - CENTER_Y);
  if (Math.max(dx, dy) < VILLAGE_HALF + 0.5) return 0;
  const d = Math.hypot(dx, dy);
  for (let i = 1; i < ZONES.length; i++) {
    if (d < ZONES[i].maxDist) return i;
  }
  return ZONES.length - 1;
}

// Liegt die Kachel auf der Dorfmauer? (Tore ausgenommen)
function isWallTile(x, y) {
  const dx = x - CENTER_X;
  const dy = y - CENTER_Y;
  const onH = (dy === -VILLAGE_HALF || dy === VILLAGE_HALF) && dx >= -VILLAGE_HALF && dx <= VILLAGE_HALF;
  const onV = (dx === -VILLAGE_HALF || dx === VILLAGE_HALF) && dy >= -VILLAGE_HALF && dy <= VILLAGE_HALF;
  if (!onH && !onV) return false;
  const along = onH ? dx : dy;
  return along < -GATE_HALF || along >= GATE_HALF;
}

function generateWorld() {
  const rng = mulberry32(WORLD_SEED);
  const shape = makeNoise(rng, 11);
  const detail = makeNoise(rng, 4);
  const bloom = makeNoise(rng, 7);
  const size = MAP_W * MAP_H;
  const ground = new Uint8Array(size);
  const obj = new Uint8Array(size);
  const deco = new Uint8Array(size);
  const zoneIdx = new Uint8Array(size);

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      const d = Math.hypot(x + 0.5 - CENTER_X, y + 0.5 - CENTER_Y);
      const cheb = Math.max(Math.abs(x + 0.5 - CENTER_X), Math.abs(y + 0.5 - CENTER_Y));
      const zi = zoneIndexAt(x, y);
      const zone = ZONES[zi];
      zoneIdx[i] = zi;

      const v = shape(x, y) * 0.65 + detail(x, y) * 0.35;
      ground[i] = GROUND[zone.ground];
      if (zone.alt && bloom(x, y) > 0.6) ground[i] = GROUND[zone.alt];

      if (zi === 0) {
        if (d < 6.5) ground[i] = GROUND.PLAZA;
        if (isWallTile(x, y)) obj[i] = OBJ.WALL;
        continue;
      }
      // Rund um die Mauer bleibt das Land frei
      if (cheb < VILLAGE_HALF + 4) continue;

      if (zone.water && v < zone.water) {
        ground[i] = zone.liquid === 'ICE' ? GROUND.ICE : GROUND[zone.liquid || 'WATER'];
        continue;
      }
      const cluster = v > 0.55 ? 1.8 : 0.5;
      const r = rng();
      if (r < zone.trees * cluster) {
        obj[i] = OBJ[zone.treeObj];
        if (zone.id === 'wald' && rng() < 0.3) obj[i] = OBJ.TREE;
      } else if (r < zone.trees * cluster + zone.rocks) {
        obj[i] = OBJ.ROCK;
      }
    }
  }

  // Rand der Welt: dichter Bewuchs bzw. Felsen
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2) {
        const i = y * MAP_W + x;
        const zone = ZONES[zoneIdx[i]];
        obj[i] = zone.treeObj === 'DEADTREE' ? OBJ.ROCK : OBJ[zone.treeObj];
        ground[i] = GROUND[zone.ground];
      }
    }
  }

  // Vier Wege vom Dorf bis an den Rand
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  dirs.forEach(([dx, dy], k) => {
    for (let s = 0; s < MAP_W / 2 - 2; s++) {
      const wobble = s > 10 ? Math.round(Math.sin(s * 0.21 + k * 1.7) * 1.6) : 0;
      for (let w = -1; w <= 0; w++) {
        const x = Math.floor(CENTER_X + dx * s + (dy ? w + wobble : 0));
        const y = Math.floor(CENTER_Y + dy * s + (dx ? w + wobble : 0));
        if (x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2) continue;
        const i = y * MAP_W + x;
        if (LIQUID.has(ground[i])) deco[i] = DECO.BRIDGE;
        if (ground[i] !== GROUND.PLAZA) ground[i] = GROUND.PATH;
        obj[i] = OBJ.NONE;
      }
    }
  });

  // Häuser im Dorf (x, y, Breite, Höhe in Kacheln), je zwei pro Viertel
  const C = CENTER_X;
  const houses = [
    [C - 12, C - 12, 5, 3, '#7c3a2c'], [C - 12, C - 7, 4, 3, '#4f5f3a'],
    [C + 4, C - 12, 5, 3, '#5b4a6b'], [C + 9, C - 7, 4, 3, '#7c3a2c'],
    [C - 12, C + 4, 4, 3, '#5b4a6b'], [C - 8, C + 9, 5, 3, '#7c3a2c'],
    [C + 5, C + 5, 4, 3, '#4f5f3a'], [C + 8, C + 9, 5, 3, '#8a4a2a']
  ].map(([x, y, w, h, roof]) => ({ x, y, w, h, roof }));
  for (const h of houses) {
    for (let y = h.y; y < h.y + h.h; y++) {
      for (let x = h.x; x < h.x + h.w; x++) obj[y * MAP_W + x] = OBJ.HOUSE;
    }
  }

  // Verzierungen
  for (let i = 0; i < size; i++) {
    if (obj[i] || deco[i]) continue;
    const r = rng();
    const g = ground[i];
    if (g === GROUND.MEADOW && r < 0.3) deco[i] = DECO.FLOWER_RED + Math.floor(rng() * 3);
    else if ((g === GROUND.GRASS || g === GROUND.FOREST || g === GROUND.MEADOW || g === GROUND.SWAMP) && r < 0.14) deco[i] = DECO.TUFT;
    else if ((g === GROUND.PATH || g === GROUND.SAND || g === GROUND.SNOW) && r < 0.12) deco[i] = DECO.PEBBLE;
    else if ((g === GROUND.ASH || g === GROUND.BASALT) && r < 0.16) deco[i] = DECO.CRACK;
  }

  // Dorfbewohner: Händler und Helfer stehen fest, Wachen an den Toren, ein paar Leute laufen umher
  const npc = (id, name, x, y, extra = {}) => ({ id, name, x: x * TILE, y: y * TILE, r: 11, ...extra });
  const npcs = [
    npc('haendler', 'Händlerin Ayla', C + 2.5, C - 2),
    npc('schmied', 'Schmied Doran', C - 3, C + 2.5),
    npc('waffen', 'Waffenhändler Goro', C - 4.5, C - 1.5),
    npc('ruestung', 'Rüstungshändlerin Mei', C + 3, C + 2.6),
    npc('aeltester', 'Dorfältester Bao', C + 0.5, C - 4.8),
    npc('jaegerin', 'Jägerin Rin', C - 5.5, C + 5.6),
    npc('teleport', 'Wegweiserin Lian', C + 5.6, C - 4.4),
    npc('alchemist', 'Alchemist Yun', C + 6.2, C + 2.4)
  ];
  for (const [x, y] of [[C - 3.3, C - 12.6], [C + 3.3, C - 12.6], [C - 3.3, C + 13.4], [C + 3.3, C + 13.4],
    [C - 12.6, C - 3.2], [C - 12.6, C + 3.6], [C + 13.4, C - 3.2], [C + 13.4, C + 3.6]]) {
    npcs.push(npc('wache', 'Torwache', x, y, { silent: true }));
  }
  for (const [id, x, y] of [['bauer', C - 8, C - 2.5], ['kind', C + 2, C + 7], ['alte', C - 2, C - 9], ['moench', C + 9, C - 1.5]]) {
    npcs.push(npc(id, '', x, y, { wander: true, homeX: x * TILE, homeY: y * TILE, wx: x * TILE, wy: y * TILE, wanderAt: 0, facing: 1, moving: false }));
  }

  // Kirschbäume in den Sonnenwiesen (fest aus der Position berechnet, damit die Welt gleich bleibt)
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      if (obj[i] === OBJ.TREE && ZONES[zoneIdx[i]].id === 'wiesen' && (((x * 92821) ^ (y * 68917)) >>> 0) % 10 < 3) obj[i] = OBJ.BLOSSOM;
    }
  }

  // Helligkeit des Bodens: weiche Verläufe statt einzelner Kacheln
  const shadeNoise = makeNoise(mulberry32(WORLD_SEED + 7), 5);
  const shadeFine = makeNoise(mulberry32(WORLD_SEED + 11), 2);
  const shade = new Uint8Array(size);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      shade[y * MAP_W + x] = Math.max(0, Math.min(255, Math.round((shadeNoise(x, y) * 0.7 + shadeFine(x, y) * 0.3) * 255)));
    }
  }

  // Schmuck im Dorf (ohne Kollision): Türme und Tore der Mauer, Laternen, Brunnen, Marktstände, Fässer und Kisten
  const T = (x, y) => ({ x: x * TILE, y: y * TILE });
  const H = VILLAGE_HALF;
  const props = [
    { type: 'well', ...T(C - 1.6, C - 1.4) },
    ...[[C - 2.4, C - 7.6], [C + 2.4, C - 7.6], [C - 2.4, C + 7.8], [C + 2.4, C + 7.8], [C - 7.8, C - 2.4], [C - 7.8, C + 2.6], [C + 7.8, C - 2.4], [C + 7.8, C + 2.6]]
      .map(([x, y]) => ({ type: 'lantern', ...T(x, y) })),
    { type: 'stall', roof: '#9a2f2a', ...T(C - 5, C - 2.6) },
    { type: 'stall', roof: '#2f5a7a', ...T(C + 3.4, C + 1.4) },
    { type: 'stall', roof: '#6d3f7d', ...T(C + 3.2, C - 3.2) },
    { type: 'stall', roof: '#3a6a4a', ...T(C + 6.6, C + 1.2) },
    { type: 'barrel', ...T(C - 6.6, C - 1.4) },
    { type: 'barrel', ...T(C - 6.1, C - 0.9) },
    { type: 'crate', ...T(C + 4.4, C + 3.8) },
    { type: 'barrel', ...T(C - 4.2, C + 3.4) },
    { type: 'anvil', ...T(C - 2.2, C + 3.2) },
    { type: 'board', ...T(C - 0.8, C - 5.2) },
    { type: 'portal', ...T(C + 6.8, C - 5.4) },
    { type: 'targets', ...T(C - 7, C + 6.2) },
    { type: 'herbs', ...T(C + 7.4, C + 3.4) }
  ];
  // Türme an den Ecken und links und rechts jedes Tores, dazu Torbögen im Norden und Süden
  for (const [x, y] of [[-H, -H], [H, -H], [-H, H], [H, H]]) props.push({ type: 'tower', ...T(C + x + 0.5, C + y + 1) });
  for (const s of [-1, 1]) {
    for (const g of [-GATE_HALF - 1, GATE_HALF]) {
      props.push({ type: 'tower', ...T(C + g + 0.5, C + s * H + 1) });
      props.push({ type: 'tower', ...T(C + s * H + 0.5, C + g + 1) });
    }
    props.push({ type: 'gate', ...T(C, C + s * H + 1) });
  }

  // Hinter jedem Turm steht die Mauer; die Türme selbst blockieren über die Mauerkacheln
  return { ground, obj, deco, zoneIdx, houses, npcs, shade, props };
}

// --- Abfragen auf die Welt ---------------------------------------------

function tileIndex(tx, ty) {
  return ty * MAP_W + tx;
}

function tileBlocked(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  const i = tileIndex(tx, ty);
  return LIQUID.has(game.world.ground[i]) && game.world.deco[i] !== DECO.BRIDGE
    ? true
    : game.world.obj[i] !== OBJ.NONE;
}

function inVillage(x, y) {
  return Math.max(Math.abs(x / TILE - CENTER_X), Math.abs(y / TILE - CENTER_Y)) < VILLAGE_HALF + 0.5;
}

function zoneAt(x, y) {
  const tx = Math.max(0, Math.min(MAP_W - 1, Math.floor(x / TILE)));
  const ty = Math.max(0, Math.min(MAP_H - 1, Math.floor(y / TILE)));
  return ZONES[game.world.zoneIdx[tileIndex(tx, ty)]];
}

// Prüft die vier Ecken eines Quadrats um (x, y). Monster dürfen nicht ins Dorf.
function canStand(x, y, r, isMonster) {
  if (tileBlocked(Math.floor((x - r) / TILE), Math.floor((y - r) / TILE))) return false;
  if (tileBlocked(Math.floor((x + r) / TILE), Math.floor((y - r) / TILE))) return false;
  if (tileBlocked(Math.floor((x - r) / TILE), Math.floor((y + r) / TILE))) return false;
  if (tileBlocked(Math.floor((x + r) / TILE), Math.floor((y + r) / TILE))) return false;
  if (isMonster && inVillage(x, y)) return false;
  return true;
}

// Bewegt getrennt nach x und y, damit man an Hindernissen entlanggleitet
function moveEntity(e, dx, dy, isMonster) {
  const r = e.r * 0.7;
  let moved = false;
  if (dx && canStand(e.x + dx, e.y, r, isMonster)) { e.x += dx; moved = true; }
  if (dy && canStand(e.x, e.y + dy, r, isMonster)) { e.y += dy; moved = true; }
  return moved;
}

// Zufälliger begehbarer Punkt in einer Zone (in Pixeln).
// from/to grenzen den Ring ein: 0 = dorfnaher Rand, 1 = äußerer Rand.
function randomSpotInZone(zone, from = 0, to = 1) {
  const inner = Math.max(zone.minDist + 2, SAFE_RING);
  const outer = Math.min(zone.maxDist - 2, MAP_W / 2 * 1.38);
  const minD = inner + (outer - inner) * from;
  const maxD = inner + (outer - inner) * to;
  for (let tries = 0; tries < 300; tries++) {
    const ang = Math.random() * Math.PI * 2;
    const d = minD + Math.random() * (maxD - minD);
    const tx = Math.floor(CENTER_X + Math.cos(ang) * d);
    const ty = Math.floor(CENTER_Y + Math.sin(ang) * d);
    if (tx < 3 || ty < 3 || tx >= MAP_W - 3 || ty >= MAP_H - 3) continue;
    if (Math.hypot(tx + 0.5 - CENTER_X, ty + 0.5 - CENTER_Y) < SAFE_RING) continue;
    if (tileBlocked(tx, ty)) continue;
    if (ZONES[game.world.zoneIdx[tileIndex(tx, ty)]] !== zone) continue;
    if (game.world.ground[tileIndex(tx, ty)] === GROUND.PATH) continue;
    return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
  }
  return null;
}

function villageSpawn() {
  return { x: CENTER_X * TILE, y: (CENTER_Y + 1) * TILE };
}
