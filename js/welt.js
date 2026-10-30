// Spielwelt: Kachelkarte erzeugen, Zonen bestimmen, Kollision prüfen.
// Die Welt wird aus einer festen Zahl (WORLD_SEED) erzeugt und sieht daher
// bei jedem Start gleich aus – wichtig, sobald später mehrere Spieler darin unterwegs sind.

const TILE = 32;          // Größe einer Kachel in Pixeln
// Seit Version 6.4 sind alle neun Maps gleich groß, seit 10.6 je 360 × 150 (vorher 300 × 120): Vlotho links,
// die anderen acht in zwei Spalten mit je vier Maps rechts daneben (WORLD_MAPS.region). Freie Flächen sind Fels.
const WORLD_W = 1080;     // Breite des Map-Bereichs in Kacheln
const WORLD_H = 600;      // Höhe des Map-Bereichs in Kacheln
const DUNGEON_COL = 60;   // Breite einer Dungeon-Spalte in Kacheln
const DUNGEON_W = DUNGEON_COL * Math.ceil(DUNGEONS.length / 4); // östlich davon Spalten mit je vier Dungeons und Endboss-Arenen (nur per Eingang)
const DUNGEON_H = 300;    // Höhe des Dungeon-Streifens
const MAP_W = WORLD_W + DUNGEON_W;
const MAP_H = WORLD_H;
const CENTER_X = 180;     // Mitte von Vlotho (x und y gleich: der Dorfplan rechnet mit einer Zahl)
const CENTER_Y = 180;
const VILLAGE_HALF = 18;  // Dorfmauer: Quadrat 18 Kacheln um die Mitte (seit 10.6, vorher 14); drinnen greifen Monster nicht an
const VS = VILLAGE_HALF / 14; // der Dorfplan ist für 14 gezeichnet: alle Abstände im Dorf wachsen mit
const SAFE_RING = 28;     // so weit vom Dorfzentrum bleiben Monster beim Erscheinen weg (10 Kacheln vor der Mauer)
const GATE_HALF = 2;      // Tore sind 4 Kacheln breit
const WORLD_SEED = 20261027;
const WORLD_VERSION = 8;  // erhöhen, wenn sich die Karte ändert (alte Positionen werden dann verworfen)
const MAP_BORDER = 4;     // Felsrand jeder Map in Kacheln: dahinter ist nichts mehr zu erreichen

// Bodenarten
const GROUND = { GRASS: 0, MEADOW: 1, FOREST: 2, PATH: 3, WATER: 4, PLAZA: 5, SAND: 6, ASH: 7, SNOW: 8, SWAMP: 9, LAVA: 10, BOG: 11, ICE: 12, BASALT: 13, CAVE: 14, FLAGSTONE: 15 };
// Gewässer, durch die man nicht laufen kann (zugefrorene Seen schon)
const LIQUID = new Set([GROUND.WATER, GROUND.LAVA, GROUND.BOG]);
// Objekte auf dem Boden (alle blockieren den Weg)
// CAVEWALL: Wände der Dungeons, werden mit dem Boden vorgezeichnet
const OBJ = { NONE: 0, TREE: 1, PINE: 2, ROCK: 3, DEADTREE: 4, HOUSE: 5, BLOSSOM: 6, WALL: 7, CAVEWALL: 8 };
// Verzierungen ohne Kollision
const DECO = { NONE: 0, TUFT: 1, FLOWER_RED: 2, FLOWER_YELLOW: 3, FLOWER_WHITE: 4, PEBBLE: 5, CRACK: 6, BRIDGE: 7,
  STUMP: 8, LOG: 9, MUSHROOM: 10, BONES: 11, SHRUB: 12, CRYSTAL: 13, DEADTREE: 14, DRIFT: 15 };
// Seit 6.5 deutlich weniger Bäume und Felsen, dafür Schmuck je Gebiet, durch den man hindurchläuft
// (seit 8.4 Schneewehen im Frost statt der halben Kristalle)
const ZONE_DECO = {
  wiesen: ['SHRUB', 'STUMP', 'SHRUB'], wald: ['STUMP', 'MUSHROOM', 'LOG', 'SHRUB'], orktal: ['BONES', 'DEADTREE', 'BONES'],
  oedland: ['DEADTREE', 'BONES', 'DEADTREE', 'CRYSTAL'], frost: ['CRYSTAL', 'DRIFT', 'STUMP', 'DRIFT'], moor: ['MUSHROOM', 'BONES', 'LOG', 'DEADTREE'],
  vulkan: ['CRYSTAL', 'BONES', 'DEADTREE'], sandwueste: ['BONES', 'DEADTREE'], nagadschungel: ['SHRUB', 'MUSHROOM', 'LOG'],
  donnerklamm: ['BONES', 'DEADTREE', 'CRYSTAL'], titanenkamm: ['CRYSTAL', 'BONES']
};
const DECO_RATE = 0.022;
function zoneDeco(zone, r) {
  const list = ZONE_DECO[zone.id];
  return list ? DECO[list[Math.floor(r * list.length) % list.length]] : DECO.NONE;
}

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

// Jede Map ist ein eigenes Rechteck (WORLD_MAPS.region). In Vlotho ist das Dorf ein Quadrat innerhalb der
// Mauer, sonst liegen die Gebiete als Ringe um die Mitte der Map. Was zu keiner Map gehört, ist Fels.
function zoneIndexAt(x, y) {
  const wm = mapOfTile(x, y);
  if (!wm) return x >= WORLD_W && y < DUNGEON_H ? dungeonZoneAt(x, y) : RING_ZONES;
  if (wm.id === 1 && Math.max(Math.abs(x + 0.5 - CENTER_X), Math.abs(y + 0.5 - CENTER_Y)) < VILLAGE_HALF + 0.5) return 0;
  return mapZoneAt(x, y);
}

// Map einer Kachel (oder null: Dungeon-Streifen, Fels)
function mapOfTile(x, y) {
  for (const wm of WORLD_MAPS) {
    const [rx, ry, rw, rh] = wm.region;
    if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) return wm;
  }
  return null;
}
function mapZoneAt(x, y) {
  const wm = mapOfTile(x, y);
  const list = MAP_ZONE_LIST[wm.id];
  const d = Math.hypot(x + 0.5 - wm.cx, y + 0.5 - wm.cy);
  for (const i of list) {
    if (ZONES[i].safe && wm.id === 1) continue; // das Dorf ist ein Quadrat (oben)
    if (d < ZONES[i].maxDist) return i;
  }
  return list[list.length - 1];
}

// Der Dungeon-Streifen hat zwei Spalten, jede von oben nach unten in vier gleich hohe Blöcke geteilt
const DUNGEON_BLOCK = Math.floor(DUNGEON_H / 4);
function dungeonIndexAt(x, y) {
  const col = Math.max(0, Math.min(Math.ceil(DUNGEONS.length / 4) - 1, Math.floor((x - WORLD_W) / DUNGEON_COL)));
  return Math.min(DUNGEONS.length - 1, col * 4 + Math.min(3, Math.floor(y / DUNGEON_BLOCK)));
}
function dungeonZoneAt(x, y) {
  return RING_ZONES + dungeonIndexAt(x, y);
}

// Liegt die Kachel auf der Dorfmauer? (Tore ausgenommen) – seit 6.5 auch für die Mauern der Lager und Städte
function isWallTile(x, y, cx = CENTER_X, cy = CENTER_Y, half = VILLAGE_HALF) {
  const dx = x - cx;
  const dy = y - cy;
  const onH = (dy === -half || dy === half) && dx >= -half && dx <= half;
  const onV = (dx === -half || dx === half) && dy >= -half && dy <= half;
  if (!onH && !onV) return false;
  const along = onH ? dx : dy;
  return along < -GATE_HALF || along >= GATE_HALF;
}
// Mauerstück senkrecht, wenn darüber oder darunter auch Mauer ist
function wallVertical(w, i) {
  return w.obj[i - MAP_W] === OBJ.WALL || w.obj[i + MAP_W] === OBJ.WALL;
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

  // Map 1 (Vlotho mit den Sonnenwiesen) in ihrer Region; die anderen Maps baut buildWorldMaps
  const M1 = WORLD_MAPS[0].region;
  const [m1x0, m1y0, m1x1, m1y1] = [M1[0], M1[1], M1[0] + M1[2], M1[1] + M1[3]];
  for (let y = m1y0; y < m1y1; y++) {
    for (let x = m1x0; x < m1x1; x++) {
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
        if (d < 6.5 * VS) ground[i] = GROUND.PLAZA;
        if (isWallTile(x, y)) obj[i] = OBJ.WALL;
        continue;
      }
      // Rand der Map: dichter Bewuchs
      if (x < m1x0 + MAP_BORDER || y < m1y0 + MAP_BORDER || x >= m1x1 - MAP_BORDER || y >= m1y1 - MAP_BORDER) {
        obj[i] = OBJ[zone.treeObj];
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
      if (r < zone.trees * cluster) obj[i] = OBJ[zone.treeObj];
      else if (r < zone.trees * cluster + zone.rocks) obj[i] = OBJ.ROCK;
      else if (r < zone.trees * cluster + zone.rocks + DECO_RATE) deco[i] = zoneDeco(zone, rng());
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
        if (x < m1x0 + MAP_BORDER || y < m1y0 + MAP_BORDER || x >= m1x1 - MAP_BORDER || y >= m1y1 - MAP_BORDER) continue;
        const i = y * MAP_W + x;
        deco[i] = LIQUID.has(ground[i]) ? DECO.BRIDGE : DECO.NONE;
        if (ground[i] !== GROUND.PLAZA) ground[i] = GROUND.PATH;
        obj[i] = OBJ.NONE;
      }
    }
  });

  // Häuser im Dorf (x, y, Breite, Höhe in Kacheln), je zwei pro Viertel
  // Der Dorfplan ist in Abständen zur Mitte für eine Mauer von 14 gezeichnet; V() streckt ihn auf VILLAGE_HALF
  const C = CENTER_X;
  const V = (d) => C + d * VS;
  const houses = [
    [-12, -12, 5, 3, '#7c3a2c'], [-12, -7, 4, 3, '#4f5f3a'],
    [4, -12, 5, 3, '#5b4a6b'], [9, -7, 4, 3, '#7c3a2c'],
    [-12, 4, 4, 3, '#5b4a6b'], [-8, 9, 5, 3, '#7c3a2c'],
    [5, 5, 4, 3, '#4f5f3a'], [8, 9, 5, 3, '#8a4a2a'],
    // seit 10.6: zwei Häuser mehr auf dem größeren Platz
    [-6.2, -11.7, 4, 3, '#4f5f3a'], [3.1, 10.1, 4, 3, '#5b4a6b']
  ].map(([x, y, w, h, roof]) => ({ x: Math.round(V(x)), y: Math.round(V(y)), w, h, roof }));
  for (const h of houses) {
    for (let y = h.y; y < h.y + h.h; y++) {
      for (let x = h.x; x < h.x + h.w; x++) obj[y * MAP_W + x] = OBJ.HOUSE;
    }
  }

  // Verzierungen in Map 1
  for (let i = m1y0 * MAP_W; i < m1y1 * MAP_W; i++) {
    if (i % MAP_W >= m1x1) continue;
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
    npc('haendler', 'Händlerin Ayla', V(2.5), V(-2)),
    npc('schmied', 'Schmied Doran', V(-3), V(2.5)),
    npc('waffen', 'Waffenhändler Goro', V(-4.5), V(-1.5)),
    npc('ruestung', 'Rüstungshändlerin Mei', V(3), V(2.6)),
    npc('aeltester', 'Dorfältester Bao', V(0.5), V(-4.8)),
    npc('jaegerin', 'Jägerin Rin', V(-5.5), V(5.6)),
    npc('teleport', 'Wegweiserin Lian', V(5.6), V(-4.4)),
    npc('alchemist', 'Alchemist Yun', V(6.2), V(2.4)),
    npc('stallmeister', 'Stallmeister Jun', V(-10), V(2.2)),
    npc('lehrmeister', 'Lehrmeister Wen', V(-1.5), V(5.6)),
    npc('lager', 'Lagerverwalter Bo', V(2.2), V(5.6)),
    npc('weltentor', 'Weltentor', V(6.8), V(-5.6))
  ];
  // Städte und Lager der anderen Maps: Weltentor und dieselben Leute wie in Vlotho (jede Map mit eigenen Namen),
  // damit man Aufträge, Jagden und die Stallmeister-Prüfung überall annehmen und abgeben kann
  const ROLE_TITLE = {
    haendler: ['Händlerin', 'Händler'], schmied: ['Schmied', 'Schmiedin'], waffen: ['Waffenhändler', 'Waffenhändlerin'],
    ruestung: ['Rüstungshändlerin', 'Rüstungshändler'], alchemist: ['Alchemist', 'Alchemistin'], aeltester: ['Lagerältester', 'Lagerälteste'],
    jaegerin: ['Jägerin', 'Jäger'], teleport: ['Wegweiserin', 'Wegweiser'], stallmeister: ['Stallmeister', 'Stallmeisterin'],
    lehrmeister: ['Lehrmeister', 'Lehrmeisterin'], lager: ['Lagerverwalter', 'Lagerverwalterin']
  };
  // je Map: Name und ob die weibliche/männliche Form (Index in ROLE_TITLE) gilt
  const MAP_PEOPLE = {
    2: { haendler: ['Sahra', 0], schmied: ['Kadir', 0], waffen: ['Omar', 0], ruestung: ['Lale', 0], alchemist: ['Nur', 1], aeltester: ['Hakim', 0], jaegerin: ['Dila', 0], teleport: ['Selim', 1], stallmeister: ['Yusuf', 0], lehrmeister: ['Rahim', 0], lager: ['Tamar', 1] },
    3: { haendler: ['Brok', 1], schmied: ['Hilda', 1], waffen: ['Ragnar', 0], ruestung: ['Eik', 1], alchemist: ['Thorm', 0], aeltester: ['Gunhild', 1], jaegerin: ['Sigrun', 0], teleport: ['Halvar', 1], stallmeister: ['Ulf', 0], lehrmeister: ['Solveig', 1], lager: ['Knud', 0] },
    4: { haendler: ['Tilda', 0], schmied: ['Arno', 0], waffen: ['Fenn', 0], ruestung: ['Ilka', 0], alchemist: ['Wanda', 1], aeltester: ['Hagen', 0], jaegerin: ['Sena', 0], teleport: ['Elm', 1], stallmeister: ['Ruth', 1], lehrmeister: ['Eberhard', 0], lager: ['Greta', 1] },
    5: { haendler: ['Grada', 0], schmied: ['Borr', 0], waffen: ['Kragg', 0], ruestung: ['Urza', 0], alchemist: ['Mok', 0], aeltester: ['Thrak', 0], jaegerin: ['Vasha', 0], teleport: ['Durn', 1], stallmeister: ['Gor', 0], lehrmeister: ['Zug', 0], lager: ['Brakk', 0] },
    6: { haendler: ['Rami', 1], schmied: ['Zahra', 1], waffen: ['Tarik', 0], ruestung: ['Amal', 0], alchemist: ['Faris', 0], aeltester: ['Idris', 0], jaegerin: ['Layla', 0], teleport: ['Samir', 1], stallmeister: ['Nadia', 1], lehrmeister: ['Yasmin', 1], lager: ['Malik', 0] },
    7: { haendler: ['Frida', 0], schmied: ['Sten', 0], waffen: ['Bjarne', 0], ruestung: ['Ylva', 0], alchemist: ['Eira', 1], aeltester: ['Olaf', 0], jaegerin: ['Ingrid', 0], teleport: ['Torvi', 0], stallmeister: ['Knut', 0], lehrmeister: ['Hjalmar', 0], lager: ['Sigrid', 1] },
    8: { haendler: ['Morla', 0], schmied: ['Grim', 0], waffen: ['Vex', 0], ruestung: ['Nebel', 1], alchemist: ['Hexe Una', 1], aeltester: ['Oswin', 0], jaegerin: ['Moira', 0], teleport: ['Irrlicht', 1], stallmeister: ['Bran', 0], lehrmeister: ['Mortimer', 0], lager: ['Agathe', 1] },
    9: { haendler: ['Asha', 0], schmied: ['Volkan', 0], waffen: ['Ignis', 0], ruestung: ['Glut', 1], alchemist: ['Pyra', 1], aeltester: ['Ember', 1], jaegerin: ['Kira', 0], teleport: ['Funke', 1], stallmeister: ['Ruß', 0], lehrmeister: ['Aschea', 1], lager: ['Kohl', 0] }
  };
  const personName = (mapId, id) => {
    const [n, form] = (MAP_PEOPLE[mapId] && MAP_PEOPLE[mapId][id]) || ['', 0];
    return n.startsWith('Hexe') ? n : `${ROLE_TITLE[id][form]} ${n}`.trim();
  };
  // kleines Lager (für eine Mauer von 7 gezeichnet, wächst mit wm.camp): oben Älteste, Weltentor, Wegweiserin;
  // links Schmied und Waffen, rechts Händlerin und Rüstung, unten Stall, Jägerin, Alchemist
  const CAMP_SPOTS = {
    aeltester: [-3, -4.3], teleport: [3.8, -4.3], schmied: [-4.6, -1.2], waffen: [-4.6, 1.8], haendler: [4.6, -1.2],
    ruestung: [4.6, 2], stallmeister: [-4.2, 4.3], jaegerin: [-1.2, 4.5], alchemist: [2.4, 4.5], lehrmeister: [2.4, 1.4], lager: [-2.4, 1.4]
  };
  // Städte in Map 2 und 3 (für eine Mauer von 11 gezeichnet, wächst mit CAMP_HALF)
  const TOWN_SPOTS = {
    haendler: [3, -2.5], schmied: [-3.5, 2.5], waffen: [-4.5, -2], ruestung: [3.5, 3], alchemist: [6.5, 0.5],
    aeltester: [-3.6, -5.4], teleport: [4, -6.2], jaegerin: [-6.6, 3.6], stallmeister: [-7.2, -0.6], lehrmeister: [0.5, 5.5], lager: [3, 5.6]
  };
  for (const mp of maps) {
    const k = mp.scale;
    npcs.push(npc('weltentor', 'Weltentor', mp.cx + 0.5 * k, mp.cy - 4.5 * k));
    for (const [id, [dx, dy]] of Object.entries(mp.small ? CAMP_SPOTS : TOWN_SPOTS)) npcs.push(npc(id, personName(mp.id, id), mp.cx + dx * k, mp.cy + dy * k));
    houses.push(...mp.houses);
  }
  // Wanderer mit Nebenaufgaben: je Map drei, an freien Plätzen zwischen Lager und Rand
  const wrng = mulberry32(WORLD_SEED + 505);
  const wandererFires = [];
  let wk = 0;
  for (const wm of WORLD_MAPS) {
    const zones = ZONES.filter((z) => z.map === wm.id && z.groups && !z.safe);
    const mons = [...new Set(zones.flatMap((z) => z.groups.map((g) => g[0])))].sort((a, b) => MONSTER_TYPES[a].level - MONSTER_TYPES[b].level);
    if (!mons.length) continue;
    const [rx, ry, rw, rh] = wm.region;
    for (let k = 0; k < 3; k++) {
      const monster = mons[Math.min(mons.length - 1, Math.round((k / 2) * (mons.length - 1)))];
      for (let tries = 0; tries < 200; tries++) {
        const ang = wrng() * Math.PI * 2;
        const d = 22 + (k * 0.33 + wrng() * 0.3) * (rw / 2 - 30);
        const tx = Math.round(wm.cx + Math.cos(ang) * d);
        const ty = Math.round(wm.cy + Math.sin(ang) * d * 0.4);
        if (tx < rx + 8 || ty < ry + 8 || tx >= rx + rw - 8 || ty >= ry + rh - 8) continue;
        let free = true;
        for (let yy = ty - 1; yy <= ty + 1 && free; yy++) for (let xx = tx - 1; xx <= tx + 1; xx++) {
          const i = yy * MAP_W + xx;
          if (obj[i] || LIQUID.has(ground[i])) free = false;
        }
        if (!free) continue;
        const [name, art] = WANDERERS[wk % WANDERERS.length];
        wk++;
        npcs.push(npc('wanderer', name, tx + 0.5, ty + 0.5, { art, key: `w${wm.id}-${k}`, side: { monster, kind: k === 1 ? 'collect' : 'kill' } }));
        // kleines Lagerfeuer daneben
        wandererFires.push({ type: 'brazier', roof: '#ffb04a', x: (tx + 1.6) * TILE, y: (ty + 1.2) * TILE });
        break;
      }
    }
  }
  // Weltportale draußen (oben links und unten rechts jeder Map): bringen in die Stadt der Ziel-Map
  for (const wm of WORLD_MAPS) {
    const [cx, cy] = [wm.cx, wm.cy];
    for (const [dx, dy, dist, to] of wm.portals || []) {
      const px = Math.round(cx + dx * dist / Math.SQRT2);
      const py = Math.round(cy + dy * dist / Math.SQRT2);
      for (let y = py - 3; y <= py + 3; y++) for (let x = px - 3; x <= px + 3; x++) {
        const i = y * MAP_W + x;
        obj[i] = OBJ.NONE;
        deco[i] = DECO.NONE;
        if (LIQUID.has(ground[i])) ground[i] = GROUND[ZONES[zoneIdx[i]].ground];
        if (Math.hypot(x - px, y - py) < 2.5) ground[i] = GROUND.PLAZA;
      }
      npcs.push(npc('weltentor', `Weltportal · Map ${to}`, px + 0.5, py, { to }));
    }
  }
  // Eingänge zu den Dungeons neben den Wegen, innen je ein Ausgang am Start und im Bossraum
  dungeons.forEach((dg, k) => {
    const e = placeDungeonEntrance(dg.def.entry, ground, obj, deco, zoneIdx);
    dg.entrance = { x: (e.x + 0.5) * TILE, y: (e.y + 1.4) * TILE };
    npcs.push(npc('eingang', dg.def.raid ? `Endboss: ${MONSTER_TYPES[dg.def.boss].name}` : dg.def.name, e.x + 0.5, e.y + 0.6, { dungeon: k }));
    const r0 = dg.rooms[0];
    const rb = dg.rooms[dg.rooms.length - 1];
    npcs.push(npc('ausgang', 'Ausgang', r0.x + 1.5, r0.y + 1.2, { dungeon: k }));
    if (dg.def.raid) npcs.push(npc('ausgang', 'Ausgang', rb.cx + 0.5, rb.y + rb.h - 4, { dungeon: k }));
    else npcs.push(npc('ausgang', 'Ausgang', rb.x + rb.w - 2, rb.y + 1.2, { dungeon: k }));
  });
  // Torwachen innen neben den Toren (Abstand zur Mauer bleibt gleich, wenn das Dorf wächst)
  const GN = C - VILLAGE_HALF + 1.4;
  const GS = C + VILLAGE_HALF - 0.6;
  for (const [x, y] of [[C - 3.3, GN], [C + 3.3, GN], [C - 3.3, GS], [C + 3.3, GS],
    [GN, C - 3.2], [GN, C + 3.6], [GS, C - 3.2], [GS, C + 3.6]]) {
    npcs.push(npc('wache', 'Torwache', x, y, { silent: true }));
  }
  for (const [id, x, y] of [['bauer', V(-8), V(-2.5)], ['kind', V(2), V(7)], ['alte', V(-2), V(-9)], ['moench', V(9), V(-1.5)]]) {
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
  const VT = (x, y) => T(V(x), V(y));
  const props = [
    { type: 'well', ...VT(-1.6, -1.4) },
    ...[[-2.4, -7.6], [2.4, -7.6], [-2.4, 7.8], [2.4, 7.8], [-7.8, -2.4], [-7.8, 2.6], [7.8, -2.4], [7.8, 2.6], [-10.5, -10.5], [10.5, -10.5], [-10.5, 10.5], [10.5, 10.5]]
      .map(([x, y]) => ({ type: 'lantern', ...VT(x, y) })),
    { type: 'stall', roof: '#9a2f2a', ...VT(-5, -2.6) },
    { type: 'stall', roof: '#2f5a7a', ...VT(3.4, 1.4) },
    { type: 'stall', roof: '#6d3f7d', ...VT(3.2, -3.2) },
    { type: 'stall', roof: '#3a6a4a', ...VT(6.6, 1.2) },
    { type: 'barrel', ...VT(-6.6, -1.4) },
    { type: 'barrel', ...VT(-6.1, -0.9) },
    { type: 'crate', ...VT(4.4, 3.8) },
    { type: 'barrel', ...VT(-4.2, 3.4) },
    { type: 'anvil', ...VT(-2.2, 3.2) },
    { type: 'board', ...VT(-0.8, -5.2) },
    { type: 'targets', ...VT(-7, 6.2) },
    { type: 'herbs', ...VT(7.4, 3.4) }
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

  props.push(...wandererFires);
  // Stall des Stallmeisters: ein Pferd und Heuballen
  props.push({ type: 'horse', ...VT(-11.8, 3.4) }, { type: 'hay', ...VT(-8.6, 3.6) });
  // Feuerbecken in den Dungeon-Räumen
  dungeons.forEach((dg) => {
    for (const r of dg.def.raid ? dg.rooms.slice(0, 1) : dg.rooms) {
      props.push({ type: 'brazier', roof: dg.def.portal, ...T(r.x + 1.5, r.y + r.h - 0.6) });
      props.push({ type: 'brazier', roof: dg.def.portal, ...T(r.x + r.w - 1.5, r.y + r.h - 0.6) });
    }
    // Endboss-Halle: ein Ring aus Feuerbecken am Rand
    if (dg.def.raid) {
      const r = dg.rooms[1];
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        props.push({ type: 'brazier', roof: dg.def.portal, ...T(r.x + r.w / 2 + Math.cos(a) * (r.w / 2 - 3), r.y + r.h / 2 + Math.sin(a) * (r.h / 2 - 3)) });
      }
    }
  });

  // Hinter jedem Turm steht die Mauer; die Türme selbst blockieren über die Mauerkacheln
  // Städte in Map 2 und 3: Laternen, Feuerbecken, Marktstände, Brunnen, Fässer
  for (const mp of maps) {
    // Türme an den Ecken und an jedem Tor, Torbögen im Norden und Süden
    const H2 = mp.small ? WORLD_MAPS.find((m) => m.id === mp.id).camp : CAMP_HALF;
    const k = mp.scale;
    const MT = (x, y) => T(mp.cx + x * k, mp.cy + y * k);
    for (const [x, y] of [[-H2, -H2], [H2, -H2], [-H2, H2], [H2, H2]]) props.push({ type: 'tower', ...T(mp.cx + x + 0.5, mp.cy + y + 1) });
    for (const s of [-1, 1]) {
      for (const g of [-GATE_HALF - 1, GATE_HALF]) {
        props.push({ type: 'tower', ...T(mp.cx + g + 0.5, mp.cy + s * H2 + 1) });
        props.push({ type: 'tower', ...T(mp.cx + s * H2 + 0.5, mp.cy + g + 1) });
      }
      props.push({ type: 'gate', ...T(mp.cx, mp.cy + s * H2 + 1) });
    }
    if (mp.small) {
      // kleines Lager: Laternen an den Ecken, Feuerbecken, Brunnen und ein Stand
      for (const [dx, dy] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) props.push({ type: 'lantern', ...MT(dx, dy) });
      props.push({ type: 'brazier', roof: '#ffb04a', ...MT(-2, -3.2) }, { type: 'brazier', roof: '#ffb04a', ...MT(3, -3.2) });
      props.push({ type: 'well', ...MT(-1.4, 1.4) }, { type: 'stall', roof: '#7a3a2a', ...MT(5.8, 0.4) });
      props.push({ type: 'barrel', ...MT(-5.4, -3.4) }, { type: 'crate', ...MT(5.4, 4.6) });
      props.push({ type: 'anvil', ...MT(-5.6, -0.2) }, { type: 'hay', ...MT(-5.6, 3.4) }, { type: 'board', ...MT(-3, -5.4) });
      continue;
    }
    for (const [dx, dy] of [[-6, -6], [6, -6], [-6, 6], [6, 6], [-2.5, -7], [2.5, -7], [-2.5, 7.5], [2.5, 7.5]]) props.push({ type: 'lantern', ...MT(dx, dy) });
    props.push({ type: 'brazier', roof: '#ffb04a', ...MT(-2, -3.5) }, { type: 'brazier', roof: '#ffb04a', ...MT(3, -3.5) });
    props.push({ type: 'well', ...MT(-1.4, 0.6) });
    props.push({ type: 'stall', roof: mp.id === 2 ? '#c8a03a' : '#5a5a6a', ...MT(6.4, -4.6) });
    props.push({ type: 'stall', roof: mp.id === 2 ? '#9a2f2a' : '#7a3a2a', ...MT(-6.4, -3) });
    props.push({ type: 'anvil', ...MT(-2.6, 3.4) });
    props.push({ type: 'barrel', ...MT(5.2, 1.6) }, { type: 'crate', ...MT(-7.2, 1.2) });
    props.push({ type: 'hay', ...MT(-8.4, -1.4) }, { type: 'board', ...MT(-3.6, -6.4) });
  }

  return { ground, obj, deco, zoneIdx, houses, npcs, shade, props, dungeons, maps };
}

// --- Dungeons ------------------------------------------------------------------------------
// Jeder Dungeon liegt in einem Block des Streifens: alles Fels, darin fünf Räume, die mit
// drei Kacheln breiten Gängen verbunden sind. Der letzte Raum ist der Bossraum.
// Räume: [x, y, Breite, Höhe] innerhalb des Blocks
const DUNGEON_ROOMS = [[3, 4, 9, 9], [18, 3, 12, 11], [38, 4, 14, 12], [39, 26, 13, 12], [8, 25, 22, 17]];
// Endboss-Arena: kleiner Vorraum, dann eine große Halle (fast der ganze Block)
const RAID_ROOMS = [[3, 32, 8, 8], [16, 5, 38, 63]];

function buildDungeons(ground, obj, zoneIdx) {
  const rng = mulberry32(WORLD_SEED + 99);
  for (let y = 0; y < DUNGEON_H; y++) {
    for (let x = WORLD_W; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      const zi = dungeonZoneAt(x, y);
      zoneIdx[i] = zi;
      ground[i] = GROUND[ZONES[zi].ground];
      obj[i] = OBJ.CAVEWALL;
    }
  }
  // alles, was weder Map noch Dungeon ist: unzugänglicher Fels
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if ((x >= WORLD_W && y < DUNGEON_H) || mapOfTile(x, y)) continue;
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
    const rooms = (def.raid ? RAID_ROOMS : DUNGEON_ROOMS).map(([rx, ry, w, h]) => ({ x: ox + rx, y: oy + ry, w, h, cx: ox + rx + Math.floor(w / 2), cy: oy + ry + Math.floor(h / 2) }));
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
    // Endboss-Halle: Ecken wieder zuschütten, damit sie rund wirkt
    if (def.raid) {
      const r = rooms[1];
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
        const nx = (x + 0.5 - (r.x + r.w / 2)) / (r.w / 2);
        const ny = (y + 0.5 - (r.y + r.h / 2)) / (r.h / 2);
        if (nx * nx + ny * ny > 1) obj[y * MAP_W + x] = OBJ.CAVEWALL;
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

// --- Maps 2 bis 9 ---------------------------------------------------------------------------
// Ringe um ein sicheres Lager bzw. eine Stadt in der Mitte, Gewässer und Bewuchs aus Rauschen,
// vier Wege vom Lager zum Rand und ein Rand aus Felsen.
function buildWorldMaps(ground, obj, deco, zoneIdx, shape, detail, bloom) {
  const rng = mulberry32(WORLD_SEED + 202);
  const out = [];
  for (const wm of WORLD_MAPS) {
    if (wm.id === 1) continue;
    const [rx, ry, rw, rh] = wm.region;
    const camp = wm.camp || CAMP_HALF;
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        const i = y * MAP_W + x;
        const d = Math.hypot(x + 0.5 - wm.cx, y + 0.5 - wm.cy);
        const zi = mapZoneAt(x, y);
        const zone = ZONES[zi];
        zoneIdx[i] = zi;
        ground[i] = GROUND[zone.ground];
        if (zone.alt && bloom(x, y) > 0.6) ground[i] = GROUND[zone.alt];
        if (x < rx + MAP_BORDER || y < ry + MAP_BORDER || x >= rx + rw - MAP_BORDER || y >= ry + rh - MAP_BORDER) {
          obj[i] = OBJ.ROCK;
          continue;
        }
        if (zone.safe) {
          if (Math.max(Math.abs(x + 0.5 - wm.cx), Math.abs(y + 0.5 - wm.cy)) < camp - 1) ground[i] = GROUND.PLAZA;
          continue;
        }
        if (d < camp + 5) continue;
        const v = shape(x, y) * 0.65 + detail(x, y) * 0.35;
        if (zone.water && v < zone.water) {
          ground[i] = GROUND[zone.liquid || 'WATER'];
          continue;
        }
        const cluster = v > 0.55 ? 1.8 : 0.5;
        const r = rng();
        if (r < zone.trees * cluster) obj[i] = OBJ[zone.treeObj];
        else if (r < zone.trees * cluster + zone.rocks) obj[i] = OBJ.ROCK;
        else if (r < zone.trees * cluster + zone.rocks + DECO_RATE) deco[i] = zoneDeco(zone, rng());
        else if (r > 0.86) deco[i] = ground[i] === GROUND.SAND || ground[i] === GROUND.ASH ? DECO.PEBBLE : ground[i] === GROUND.BASALT ? DECO.CRACK : DECO.TUFT;
      }
    }
    // Wege vom Lager zum Rand
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let s = 0; s < Math.max(rw, rh) / 2; s++) {
        for (let w = -1; w <= 0; w++) {
          const x = Math.floor(wm.cx + dx * s + (dy ? w : 0));
          const y = Math.floor(wm.cy + dy * s + (dx ? w : 0));
          if (x < rx + MAP_BORDER || y < ry + MAP_BORDER || x >= rx + rw - MAP_BORDER || y >= ry + rh - MAP_BORDER) continue;
          const i = y * MAP_W + x;
          if (LIQUID.has(ground[i])) deco[i] = DECO.BRIDGE;
          else deco[i] = DECO.NONE;
          if (ground[i] !== GROUND.PLAZA) ground[i] = GROUND.PATH;
          obj[i] = OBJ.NONE;
        }
      }
    }
    // Mauer um Lager und Stadt mit vier Toren an den Wegen (wie in Vlotho)
    for (let y = wm.cy - camp; y <= wm.cy + camp; y++) {
      for (let x = wm.cx - camp; x <= wm.cx + camp; x++) {
        if (!isWallTile(x, y, wm.cx, wm.cy, camp)) continue;
        const i = y * MAP_W + x;
        obj[i] = OBJ.WALL;
        deco[i] = DECO.NONE;
      }
    }
    // Häuser der Stadt in den vier Ecken des Platzes (kleine Lager haben keine)
    // Plan der Städte für eine Mauer von 11, der Lager für 7; scale streckt ihn auf die echte Mauer (seit 10.6)
    const scale = camp < CAMP_HALF ? camp / 7 : CAMP_HALF / 11;
    const houses = (camp < CAMP_HALF ? [] : [[-9, -9, 5, 3], [5, -9, 5, 3], [-9, 6, 4, 3], [6, 6, 4, 3]]).map(([hx, hy, w, h], k) => ({ x: Math.floor(wm.cx + hx * scale), y: Math.floor(wm.cy + hy * scale), w, h, roof: wm.id === 2 ? ['#b0763a', '#8a4a2a', '#c8a060', '#7a5a3a'][k] : ['#4a4644', '#5a3a2e', '#3a3a4a', '#6a4a3a'][k] }));
    for (const h of houses) for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) obj[y * MAP_W + x] = OBJ.HOUSE;
    out.push({ id: wm.id, cx: wm.cx, cy: wm.cy, houses, small: camp < CAMP_HALF, scale, spawn: { x: wm.cx * TILE, y: (wm.cy + 1.5 * scale) * TILE } });
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
    if (tx < bx0 + MAP_BORDER || ty < by0 + MAP_BORDER || tx >= bx1 - MAP_BORDER || ty >= by1 - MAP_BORDER) return;
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

// Sicher: das Dorf Vlotho, die Städte und die Lager der anderen Maps
const CAMP_HALF = 14; // seit 10.6 (vorher 11) – Städte in Map 2 und 3: sicheres Quadrat um die Mitte (kleine Lager: WORLD_MAPS.camp)
function inVillage(x, y) {
  const tx = x / TILE;
  const ty = y / TILE;
  const wm = mapOfTile(tx, ty);
  if (!wm) return false;
  if (wm.id === 1) return Math.max(Math.abs(tx - CENTER_X), Math.abs(ty - CENTER_Y)) < VILLAGE_HALF + 0.5;
  return Math.max(Math.abs(tx - wm.cx), Math.abs(ty - wm.cy)) < (wm.camp || CAMP_HALF);
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
  // Gebiete liegen als Ringe um die Mitte ihrer Map (Vlotho: um das Dorf)
  const wm = WORLD_MAPS.find((m) => m.id === zone.map) || WORLD_MAPS[0];
  const cx = wm.cx;
  const cy = wm.cy;
  const safe = wm.id === 1 ? SAFE_RING : (wm.camp || CAMP_HALF) + 7;
  const pad = MAP_BORDER + 1;
  const [bx0, by0, bx1, by1] = [wm.region[0] + pad, wm.region[1] + pad, wm.region[0] + wm.region[2] - pad, wm.region[1] + wm.region[3] - pad];
  const inner = Math.max(zone.minDist + 2, safe);
  const outer = Math.min(zone.maxDist - 2, Math.hypot(wm.region[2], wm.region[3]) / 2);
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

// Wiederbeleben: im Lager bzw. in der Stadt der Map, in der man ist (im Dungeon: der Map seines Eingangs),
// in Vlotho im Dorf
function villageSpawn(p) {
  if (p && game.world && game.world.maps) {
    let wm = mapOfTile(p.x / TILE, p.y / TILE);
    if (!wm) {
      const z = zoneAt(p.x, p.y);
      const id = z.dungeon && z.dungeon.entry && z.dungeon.entry.map;
      wm = id ? WORLD_MAPS.find((m) => m.id === id) : null;
    }
    const mp = wm && wm.id !== 1 ? game.world.maps.find((m) => m.id === wm.id) : null;
    if (mp) return { ...mp.spawn };
  }
  return { x: CENTER_X * TILE, y: (CENTER_Y + 1) * TILE };
}
