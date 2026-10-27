// Spielwelt: Kachelkarte erzeugen, Zonen bestimmen, Kollision prüfen.
// Die Welt wird aus einer festen Zahl (WORLD_SEED) erzeugt und sieht daher
// bei jedem Start gleich aus – wichtig, sobald später mehrere Spieler darin unterwegs sind.

const TILE = 32;          // Größe einer Kachel in Pixeln
const MAP_W = 120;        // Breite in Kacheln
const MAP_H = 120;
const CENTER_X = MAP_W / 2;
const CENTER_Y = MAP_H / 2;
const VILLAGE_RADIUS = 9; // in Kacheln; hier greifen Monster nicht an
const WORLD_SEED = 20261027;

// Bodenarten
const GROUND = { GRASS: 0, MEADOW: 1, FOREST: 2, PATH: 3, WATER: 4, PLAZA: 5, SAND: 6, ASH: 7 };
// Objekte auf dem Boden (alle blockieren den Weg)
const OBJ = { NONE: 0, TREE: 1, PINE: 2, ROCK: 3, DEADTREE: 4, HOUSE: 5 };
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

function zoneIndexForDistance(d) {
  for (let i = 0; i < ZONES.length; i++) {
    if (d >= ZONES[i].minDist && d < ZONES[i].maxDist) return i;
  }
  return ZONES.length - 1;
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
      const zi = zoneIndexForDistance(d);
      const zone = ZONES[zi];
      zoneIdx[i] = zi;

      const v = shape(x, y) * 0.65 + detail(x, y) * 0.35;
      ground[i] = GROUND[zone.ground];
      if (zone.alt && bloom(x, y) > 0.6) ground[i] = GROUND[zone.alt];

      if (d < VILLAGE_RADIUS) {
        if (d < 6.5) ground[i] = GROUND.PLAZA;
        continue;
      }
      // Übergang zum Dorf frei halten
      if (d < VILLAGE_RADIUS + 1.5) continue;

      if (zone.water && v < zone.water) {
        ground[i] = GROUND.WATER;
        continue;
      }
      const cluster = v > 0.55 ? 1.8 : 0.5;
      const r = rng();
      if (r < zone.trees * cluster) {
        obj[i] = OBJ[zone.treeObj];
        if (zone.treeObj === 'PINE' && rng() < 0.3) obj[i] = OBJ.TREE;
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
        if (ground[i] === GROUND.WATER) deco[i] = DECO.BRIDGE;
        if (ground[i] !== GROUND.PLAZA) ground[i] = GROUND.PATH;
        obj[i] = OBJ.NONE;
      }
    }
  });

  // Häuser im Dorf (x, y, Breite, Höhe in Kacheln)
  const houses = [
    [CENTER_X - 7, CENTER_Y - 6, 4, 3, '#7c3a2c'],
    [CENTER_X + 3, CENTER_Y - 7, 4, 3, '#5b4a6b'],
    [CENTER_X - 7, CENTER_Y + 3, 4, 3, '#4f5f3a'],
    [CENTER_X + 3, CENTER_Y + 4, 5, 3, '#7c3a2c']
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
    else if ((g === GROUND.GRASS || g === GROUND.FOREST || g === GROUND.MEADOW) && r < 0.14) deco[i] = DECO.TUFT;
    else if ((g === GROUND.PATH || g === GROUND.SAND) && r < 0.12) deco[i] = DECO.PEBBLE;
    else if (g === GROUND.ASH && r < 0.16) deco[i] = DECO.CRACK;
  }

  const npcs = [
    { id: 'haendler', name: 'Händlerin Ayla', x: (CENTER_X + 2.5) * TILE, y: (CENTER_Y - 2) * TILE, color: '#6d3f7d', r: 11 },
    { id: 'schmied', name: 'Schmied Doran', x: (CENTER_X - 3) * TILE, y: (CENTER_Y + 2.5) * TILE, color: '#6b4a2e', r: 12 },
    { id: 'waffen', name: 'Waffenhändler Goro', x: (CENTER_X - 4.5) * TILE, y: (CENTER_Y - 1.5) * TILE, color: '#9a3a2a', r: 12 },
    { id: 'ruestung', name: 'Rüstungshändlerin Mei', x: (CENTER_X + 3) * TILE, y: (CENTER_Y + 2.6) * TILE, color: '#5a6a7a', r: 11 }
  ];

  return { ground, obj, deco, zoneIdx, houses, npcs };
}

// --- Abfragen auf die Welt ---------------------------------------------

function tileIndex(tx, ty) {
  return ty * MAP_W + tx;
}

function tileBlocked(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  const i = tileIndex(tx, ty);
  return game.world.ground[i] === GROUND.WATER && game.world.deco[i] !== DECO.BRIDGE
    ? true
    : game.world.obj[i] !== OBJ.NONE;
}

function inVillage(x, y) {
  return Math.hypot(x / TILE - CENTER_X, y / TILE - CENTER_Y) < VILLAGE_RADIUS;
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
  const inner = zone.minDist + 2;
  const outer = Math.min(zone.maxDist - 2, MAP_W / 2 * 1.38);
  const minD = inner + (outer - inner) * from;
  const maxD = inner + (outer - inner) * to;
  for (let tries = 0; tries < 300; tries++) {
    const ang = Math.random() * Math.PI * 2;
    const d = minD + Math.random() * (maxD - minD);
    const tx = Math.floor(CENTER_X + Math.cos(ang) * d);
    const ty = Math.floor(CENTER_Y + Math.sin(ang) * d);
    if (tx < 3 || ty < 3 || tx >= MAP_W - 3 || ty >= MAP_H - 3) continue;
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
