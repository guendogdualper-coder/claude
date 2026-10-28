// Spielwelt: Kachelkarte erzeugen, Zonen bestimmen, Kollision prüfen.
// Die Welt wird aus einer festen Zahl (WORLD_SEED) erzeugt und sieht daher
// bei jedem Start gleich aus – wichtig, sobald später mehrere Spieler darin unterwegs sind.

const TILE = 32;          // Größe einer Kachel in Pixeln
const WORLD_W = 200;      // Breite der Oberwelt in Kacheln
const DUNGEON_COL = 60;   // Breite einer Dungeon-Spalte in Kacheln
const DUNGEON_W = DUNGEON_COL * 2; // östlich davon liegen zwei Spalten mit je vier Dungeons (nur per Eingang erreichbar)
const MAP_W = WORLD_W + DUNGEON_W;
const WORLD_H = 200;      // Höhe der Oberwelt; darunter liegen Map 2 und Map 3 (nur über das Weltentor)
const MAP_H = WORLD_H + 132;
const CENTER_X = WORLD_W / 2;
const CENTER_Y = WORLD_H / 2;
const VILLAGE_HALF = 14;  // Dorfmauer: Quadrat 14 Kacheln um die Mitte; drinnen greifen Monster nicht an
const SAFE_RING = 24;     // so weit vom Dorfzentrum bleiben Monster beim Erscheinen weg (10 Kacheln vor der Mauer)
const GATE_HALF = 2;      // Tore sind 4 Kacheln breit
const WORLD_SEED = 20261027;
const WORLD_VERSION = 4;  // erhöhen, wenn sich die Karte ändert (alte Positionen werden dann verworfen)

// Bodenarten
const GROUND = { GRASS: 0, MEADOW: 1, FOREST: 2, PATH: 3, WATER: 4, PLAZA: 5, SAND: 6, ASH: 7, SNOW: 8, SWAMP: 9, LAVA: 10, BOG: 11, ICE: 12, BASALT: 13, CAVE: 14, FLAGSTONE: 15 };
// Gewässer, durch die man nicht laufen kann (zugefrorene Seen schon)
const LIQUID = new Set([GROUND.WATER, GROUND.LAVA, GROUND.BOG]);
// Objekte auf dem Boden (alle blockieren den Weg)
// CAVEWALL: Wände der Dungeons, werden mit dem Boden vorgezeichnet
const OBJ = { NONE: 0, TREE: 1, PINE: 2, ROCK: 3, DEADTREE: 4, HOUSE: 5, BLOSSOM: 6, WALL: 7, CAVEWALL: 8 };
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
  const gw = Math.ceil(WORLD_W / cell) + 2;
  const gh = Math.ceil(WORLD_H / cell) + 2;
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = (x % WORLD_W) / cell;
    const gy = (y % WORLD_H) / cell;
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
  if (y >= WORLD_H) return mapZoneAt(x, y);
  if (x >= WORLD_W) return dungeonZoneAt(x, y);
  const dx = Math.abs(x + 0.5 - CENTER_X);
  const dy = Math.abs(y + 0.5 - CENTER_Y);
  if (Math.max(dx, dy) < VILLAGE_HALF + 0.5) return 0;
  const d = Math.hypot(dx, dy);
  for (let i = 1; i < RING_ZONES; i++) {
    if (d < ZONES[i].maxDist) return i;
  }
  return RING_ZONES - 1;
}

// Map 2 und 3: Ringe um die Mitte der jeweiligen Map
function mapOfTile(x, y) {
  if (y < WORLD_H) return WORLD_MAPS[0];
  return WORLD_MAPS.find((m) => m.region && x >= m.region[0] && x < m.region[0] + m.region[2]) || WORLD_MAPS[1];
}
function mapZoneAt(x, y) {
  const wm = mapOfTile(x, y);
  const d = Math.hypot(x + 0.5 - wm.cx, y + 0.5 - wm.cy);
  let last = 0;
  for (let i = RING_ZONES; i < ZONES.length; i++) {
    if (ZONES[i].map !== wm.id) continue;
    last = i;
    if (d < ZONES[i].maxDist) return i;
  }
  return last;
}

// Der Dungeon-Streifen hat zwei Spalten, jede von oben nach unten in vier gleich hohe Blöcke geteilt
const DUNGEON_BLOCK = Math.floor(WORLD_H / 4);
function dungeonIndexAt(x, y) {
  const col = Math.max(0, Math.min(1, Math.floor((x - WORLD_W) / DUNGEON_COL)));
  return Math.min(DUNGEONS.length - 1, col * 4 + Math.min(3, Math.floor(y / DUNGEON_BLOCK)));
}
function dungeonZoneAt(x, y) {
  return RING_ZONES + dungeonIndexAt(x, y);
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

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
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
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      if (x < 2 || y < 2 || x >= WORLD_W - 2 || y >= WORLD_H - 2) {
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
    for (let s = 0; s < WORLD_W / 2 - 2; s++) {
      const wobble = s > 10 ? Math.round(Math.sin(s * 0.21 + k * 1.7) * 1.6) : 0;
      for (let w = -1; w <= 0; w++) {
        const x = Math.floor(CENTER_X + dx * s + (dy ? w + wobble : 0));
        const y = Math.floor(CENTER_Y + dy * s + (dx ? w + wobble : 0));
        if (x < 2 || y < 2 || x >= WORLD_W - 2 || y >= WORLD_H - 2) continue;
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

  // Verzierungen (nur in der Oberwelt, in derselben Reihenfolge wie früher, damit die Welt gleich bleibt)
  for (let i = 0; i < WORLD_H * MAP_W; i++) {
    if (i % MAP_W >= WORLD_W) continue;
    if (obj[i] || deco[i]) continue;
    const r = rng();
    const g = ground[i];
    if (g === GROUND.MEADOW && r < 0.3) deco[i] = DECO.FLOWER_RED + Math.floor(rng() * 3);
    else if ((g === GROUND.GRASS || g === GROUND.FOREST || g === GROUND.MEADOW || g === GROUND.SWAMP) && r < 0.14) deco[i] = DECO.TUFT;
    else if ((g === GROUND.PATH || g === GROUND.SAND || g === GROUND.SNOW) && r < 0.12) deco[i] = DECO.PEBBLE;
    else if ((g === GROUND.ASH || g === GROUND.BASALT) && r < 0.16) deco[i] = DECO.CRACK;
  }

  // Dungeons im Streifen östlich der Welt, darunter Map 2 und Map 3
  const dungeons = buildDungeons(ground, obj, zoneIdx);
  const maps = buildWorldMaps(ground, obj, deco, zoneIdx, shape, detail, bloom);

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
    npc('alchemist', 'Alchemist Yun', C + 6.2, C + 2.4),
    npc('stallmeister', 'Stallmeister Jun', C - 10, C + 2.2),
    npc('weltentor', 'Weltentor', C + 6.8, C - 5.6)
  ];
  // In jedem Lager der anderen Maps ein Weltentor zurück
  for (const mp of maps) npcs.push(npc('weltentor', 'Weltentor', mp.cx + 0.5, mp.cy - 1.5));
  // Eingänge zu den Dungeons neben den Wegen, innen je ein Ausgang am Start und im Bossraum
  dungeons.forEach((dg, k) => {
    const e = placeDungeonEntrance(dg.def.entry, ground, obj, deco, zoneIdx);
    dg.entrance = { x: (e.x + 0.5) * TILE, y: (e.y + 1.4) * TILE };
    npcs.push(npc('eingang', dg.def.name, e.x + 0.5, e.y + 0.6, { dungeon: k }));
    const r0 = dg.rooms[0];
    const rb = dg.rooms[dg.rooms.length - 1];
    npcs.push(npc('ausgang', 'Ausgang', r0.x + 1.5, r0.y + 1.2, { dungeon: k }));
    npcs.push(npc('ausgang', 'Ausgang', rb.x + rb.w - 2, rb.y + 1.2, { dungeon: k }));
  });
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

  // Stall des Stallmeisters: ein Pferd und Heuballen
  props.push({ type: 'horse', ...T(C - 11.8, C + 3.4) }, { type: 'hay', ...T(C - 8.6, C + 3.6) });
  // Feuerbecken in den Dungeon-Räumen
  dungeons.forEach((dg) => {
    for (const r of dg.rooms) {
      props.push({ type: 'brazier', roof: dg.def.portal, ...T(r.x + 1.5, r.y + r.h - 0.6) });
      props.push({ type: 'brazier', roof: dg.def.portal, ...T(r.x + r.w - 1.5, r.y + r.h - 0.6) });
    }
  });

  // Hinter jedem Turm steht die Mauer; die Türme selbst blockieren über die Mauerkacheln
  // Lager in Map 2 und 3: Laternen und Feuerbecken
  for (const mp of maps) {
    for (const [dx, dy] of [[-4, -3], [4, -3], [-4, 4], [4, 4]]) props.push({ type: 'lantern', ...T(mp.cx + dx, mp.cy + dy) });
    props.push({ type: 'brazier', roof: '#ffb04a', ...T(mp.cx - 2, mp.cy + 1.5) }, { type: 'brazier', roof: '#ffb04a', ...T(mp.cx + 3, mp.cy + 1.5) });
  }

  return { ground, obj, deco, zoneIdx, houses, npcs, shade, props, dungeons, maps };
}

// --- Dungeons ------------------------------------------------------------------------------
// Jeder Dungeon liegt in einem Block des Streifens: alles Fels, darin fünf Räume, die mit
// drei Kacheln breiten Gängen verbunden sind. Der letzte Raum ist der Bossraum.
// Räume: [x, y, Breite, Höhe] innerhalb des Blocks
const DUNGEON_ROOMS = [[3, 4, 9, 9], [18, 3, 12, 11], [38, 4, 14, 12], [39, 26, 13, 12], [8, 25, 22, 17]];

function buildDungeons(ground, obj, zoneIdx) {
  const rng = mulberry32(WORLD_SEED + 99);
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = WORLD_W; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      const zi = dungeonZoneAt(x, y);
      zoneIdx[i] = zi;
      ground[i] = GROUND[ZONES[zi].ground];
      obj[i] = OBJ.CAVEWALL;
    }
  }
  // unter den Dungeons, neben Map 2 und 3: unzugänglicher Fels
  for (let y = WORLD_H; y < MAP_H; y++) {
    for (let x = 260; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      zoneIdx[i] = RING_ZONES;
      ground[i] = GROUND.CAVE;
      obj[i] = OBJ.CAVEWALL;
    }
  }
  return DUNGEONS.map((def, k) => {
    const col = Math.floor(k / 4);
    const row = k % 4;
    const x0 = WORLD_W + col * DUNGEON_COL;
    const ox = x0 + 2;
    const oy = row * DUNGEON_BLOCK + 2;
    const carve = (x, y) => {
      if (x <= x0 || x >= x0 + DUNGEON_COL - 1 || y <= row * DUNGEON_BLOCK || y >= (row + 1) * DUNGEON_BLOCK - 1) return;
      obj[y * MAP_W + x] = OBJ.NONE;
    };
    const rooms = DUNGEON_ROOMS.map(([rx, ry, w, h]) => ({ x: ox + rx, y: oy + ry, w, h, cx: ox + rx + Math.floor(w / 2), cy: oy + ry + Math.floor(h / 2) }));
    for (const r of rooms) {
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) carve(x, y);
      // unregelmäßige Ränder, damit es wie eine Höhle wirkt
      if (def.floor !== 'FLAGSTONE') {
        for (let x = r.x; x < r.x + r.w; x++) {
          if (rng() < 0.4) carve(x, r.y - 1);
          if (rng() < 0.4) carve(x, r.y + r.h);
        }
        for (let y = r.y; y < r.y + r.h; y++) {
          if (rng() < 0.4) carve(r.x - 1, y);
          if (rng() < 0.4) carve(r.x + r.w, y);
        }
      }
    }
    // Gänge: erst waagrecht, dann senkrecht
    for (let n = 0; n < rooms.length - 1; n++) {
      const a = rooms[n];
      const b = rooms[n + 1];
      for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) for (let w = -1; w <= 1; w++) carve(x, a.cy + w);
      for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) for (let w = -1; w <= 1; w++) carve(b.cx + w, y);
    }
    // Im Drachenhort glühen Lavabecken in den Ecken des Bossraums
    if (def.floor === 'BASALT') {
      const rb = rooms[rooms.length - 1];
      for (const [px, py] of [[rb.x + 1, rb.y + 3], [rb.x + rb.w - 3, rb.y + rb.h - 3], [rb.x + 2, rb.y + rb.h - 3]]) {
        for (let y = py; y < py + 2; y++) for (let x = px; x < px + 2; x++) ground[y * MAP_W + x] = GROUND.LAVA;
      }
    }
    const tileCenter = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
    return { def, rooms, start: tileCenter(rooms[0].cx, rooms[0].cy) };
  });
}

// --- Map 2 und Map 3 ------------------------------------------------------------------------
// Wie die Oberwelt, nur kleiner: Ringe um ein sicheres Lager in der Mitte, Gewässer und
// Bewuchs aus Rauschen, vier Wege vom Lager zum Rand und ein Rand aus Felsen.
function buildWorldMaps(ground, obj, deco, zoneIdx, shape, detail, bloom) {
  const rng = mulberry32(WORLD_SEED + 202);
  const out = [];
  for (const wm of WORLD_MAPS) {
    if (!wm.region) continue;
    const [rx, ry, rw, rh] = wm.region;
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        const i = y * MAP_W + x;
        const d = Math.hypot(x + 0.5 - wm.cx, y + 0.5 - wm.cy);
        const zi = mapZoneAt(x, y);
        const zone = ZONES[zi];
        zoneIdx[i] = zi;
        ground[i] = GROUND[zone.ground];
        if (zone.alt && bloom(x, y) > 0.6) ground[i] = GROUND[zone.alt];
        if (x < rx + 2 || y < ry + 2 || x >= rx + rw - 2 || y >= ry + rh - 2) {
          obj[i] = OBJ.ROCK;
          continue;
        }
        if (zone.safe) {
          if (d < 5.5) ground[i] = GROUND.PLAZA;
          continue;
        }
        if (d < 11) continue;
        const v = shape(x, y) * 0.65 + detail(x, y) * 0.35;
        if (zone.water && v < zone.water) {
          ground[i] = GROUND[zone.liquid || 'WATER'];
          continue;
        }
        const cluster = v > 0.55 ? 1.8 : 0.5;
        const r = rng();
        if (r < zone.trees * cluster) obj[i] = OBJ[zone.treeObj];
        else if (r < zone.trees * cluster + zone.rocks) obj[i] = OBJ.ROCK;
        else if (r > 0.86) deco[i] = ground[i] === GROUND.SAND || ground[i] === GROUND.ASH ? DECO.PEBBLE : ground[i] === GROUND.BASALT ? DECO.CRACK : DECO.TUFT;
      }
    }
    // Wege vom Lager zum Rand
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let s = 0; s < 64; s++) {
        for (let w = -1; w <= 0; w++) {
          const x = Math.floor(wm.cx + dx * s + (dy ? w : 0));
          const y = Math.floor(wm.cy + dy * s + (dx ? w : 0));
          if (x < rx + 2 || y < ry + 2 || x >= rx + rw - 2 || y >= ry + rh - 2) continue;
          const i = y * MAP_W + x;
          if (LIQUID.has(ground[i])) deco[i] = DECO.BRIDGE;
          else deco[i] = DECO.NONE;
          if (ground[i] !== GROUND.PLAZA) ground[i] = GROUND.PATH;
          obj[i] = OBJ.NONE;
        }
      }
    }
    out.push({ id: wm.id, cx: wm.cx, cy: wm.cy, spawn: { x: wm.cx * TILE, y: (wm.cy + 1.5) * TILE } });
  }
  return out;
}

// Eingang neben dem Weg: Kachel suchen, Platz und einen kurzen Pfad zum Weg freiräumen
// entry.map: Eingang in Map 2 oder 3 (dann vom Lager der Map aus gemessen)
function placeDungeonEntrance(entry, ground, obj, deco, zoneIdx) {
  const [dx, dy] = entry.dir;
  const px = dy ? 1 : 0;
  const py = dx ? 1 : 0;
  const wm = entry.map ? WORLD_MAPS.find((m) => m.id === entry.map) : null;
  const [cx, cy] = wm ? [wm.cx, wm.cy] : [CENTER_X, CENTER_Y];
  const [bx0, by0, bx1, by1] = wm ? [wm.region[0], wm.region[1], wm.region[0] + wm.region[2], wm.region[1] + wm.region[3]] : [0, 0, WORLD_W, WORLD_H];
  const x = Math.round(cx + dx * entry.dist + px * entry.side);
  const y = Math.round(cy + dy * entry.dist + py * entry.side);
  const free = (tx, ty) => {
    if (tx < bx0 + 2 || ty < by0 + 2 || tx >= bx1 - 2 || ty >= by1 - 2) return;
    const i = ty * MAP_W + tx;
    obj[i] = OBJ.NONE;
    if (LIQUID.has(ground[i])) ground[i] = GROUND[ZONES[zoneIdx[i]].ground];
    deco[i] = DECO.NONE;
  };
  for (let ty = y - 2; ty <= y + 3; ty++) for (let tx = x - 2; tx <= x + 2; tx++) free(tx, ty);
  // zum Weg hin: Richtung Mittellinie des Weges
  for (let s = 0; s <= Math.abs(entry.side) + 1; s++) {
    const sx = x - px * Math.sign(entry.side) * s;
    const sy = y + 2 - py * Math.sign(entry.side) * s;
    for (let w = -1; w <= 1; w++) free(sx + py * w, sy + px * w);
  }
  return { x, y };
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

// Sicher: das Dorf Vlotho und die Lager in Map 2 und 3
const CAMP_HALF = 7;
function inVillage(x, y) {
  const tx = x / TILE;
  const ty = y / TILE;
  if (ty >= WORLD_H) {
    const wm = mapOfTile(tx, ty);
    return Math.max(Math.abs(tx - wm.cx), Math.abs(ty - wm.cy)) < CAMP_HALF;
  }
  return Math.max(Math.abs(tx - CENTER_X), Math.abs(ty - CENTER_Y)) < VILLAGE_HALF + 0.5;
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
  // Zonen der Maps 2 und 3 liegen um die Mitte ihrer Map, alle anderen um das Dorf
  const wm = zone.map ? WORLD_MAPS.find((m) => m.id === zone.map) : null;
  const cx = wm ? wm.cx : CENTER_X;
  const cy = wm ? wm.cy : CENTER_Y;
  const safe = wm ? CAMP_HALF + 7 : SAFE_RING;
  const [bx0, by0, bx1, by1] = wm ? [wm.region[0] + 3, wm.region[1] + 3, wm.region[0] + wm.region[2] - 3, wm.region[1] + wm.region[3] - 3] : [3, 3, WORLD_W - 3, WORLD_H - 3];
  const inner = Math.max(zone.minDist + 2, safe);
  const outer = Math.min(zone.maxDist - 2, wm ? wm.region[2] / 2 * 1.38 : WORLD_W / 2 * 1.38);
  const minD = inner + (outer - inner) * from;
  const maxD = inner + (outer - inner) * to;
  for (let tries = 0; tries < 300; tries++) {
    const ang = Math.random() * Math.PI * 2;
    const d = minD + Math.random() * (maxD - minD);
    const tx = Math.floor(cx + Math.cos(ang) * d);
    const ty = Math.floor(cy + Math.sin(ang) * d);
    if (tx < bx0 || ty < by0 || tx >= bx1 || ty >= by1) continue;
    if (Math.hypot(tx + 0.5 - cx, ty + 0.5 - cy) < safe) continue;
    if (tileBlocked(tx, ty)) continue;
    if (ZONES[game.world.zoneIdx[tileIndex(tx, ty)]] !== zone) continue;
    if (game.world.ground[tileIndex(tx, ty)] === GROUND.PATH) continue;
    return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
  }
  return null;
}

// Wiederbeleben: in Map 2 und 3 im Lager der Map, sonst im Dorf
function villageSpawn(p) {
  if (p && p.y / TILE >= WORLD_H && game.world.maps) {
    const wm = mapOfTile(p.x / TILE, p.y / TILE);
    const mp = game.world.maps.find((m) => m.id === wm.id);
    if (mp) return { ...mp.spawn };
  }
  return { x: CENTER_X * TILE, y: (CENTER_Y + 1) * TILE };
}
