// Spielwelt: Kachelkarte erzeugen, Zonen bestimmen, Kollision prüfen.
// Die Welt wird aus einer festen Zahl (WORLD_SEED) erzeugt und sieht daher
// bei jedem Start gleich aus – wichtig, sobald später mehrere Spieler darin unterwegs sind.

const TILE = 32;          // Größe einer Kachel in Pixeln
// Seit Version 6.4 sind alle neun Maps gleich groß: 10.6 je 360 × 150, seit 10.7 je 360 × 220 (nach oben und unten
// größer, Platz für viele Spieler; ursprünglich 300 × 120). Vlotho links,
// die anderen acht in zwei Spalten mit je vier Maps rechts daneben (WORLD_MAPS.region). Freie Flächen sind Fels.
const WORLD_W = 1080;     // Breite des Map-Bereichs in Kacheln
const WORLD_H = 880;      // Höhe des Map-Bereichs in Kacheln (vier Maps übereinander)
const DUNGEON_COL = 60;   // Breite einer Dungeon-Spalte in Kacheln
// seit 13.58: Höllenthron und Lv-60-Instanzen belegen zwei Blöcke übereinander (def.rows, siehe dungeonSlots)
const DUNGEON_SLOTS = dungeonSlots();
const DUNGEON_W = DUNGEON_COL * DUNGEON_SLOTS.cols; // östlich davon Spalten mit je vier Dungeons und Endboss-Arenen (nur per Eingang)
const DUNGEON_H = 300;    // Höhe des Dungeon-Streifens
const MAP_W = WORLD_W + DUNGEON_W;
const MAP_H = WORLD_H;
const CENTER_X = 180;     // Mitte von Vlotho (x und y gleich: der Dorfplan rechnet mit einer Zahl)
const CENTER_Y = 180;
// seit 13.63: Mauer 23 statt 18 – Platz für Auktionshaus, Post und Herausforderung. Häuser, Plätze und Stände bleiben
// beim Plan von 18 (VILLAGE_PLAN), nur die Mauer rückt nach außen; Bäume und Wasser draußen bleiben wie vorher
const VILLAGE_HALF = 23;  // Dorfmauer: Quadrat um die Mitte (10.6 bis 13.62: 18, vorher 14); drinnen greifen Monster nicht an
const VILLAGE_PLAN = 18;  // Größe, für die der Dorfplan und die Wildnis drumherum erzeugt werden (seit 13.63)
const VS = VILLAGE_PLAN / 14; // der Dorfplan ist für 14 gezeichnet: alle Abstände im Dorf wachsen mit
const SAFE_RING = 33;     // so weit vom Dorfzentrum bleiben Monster beim Erscheinen weg (10 Kacheln vor der Mauer)
const GATE_HALF = 2;      // Tore sind 4 Kacheln breit
const WORLD_SEED = 20261027;
const WORLD_VERSION = 12;  // erhöhen, wenn sich die Karte ändert (alte Positionen werden dann verworfen)
const MAP_BORDER = 4;     // Felsrand jeder Map in Kacheln: dahinter ist nichts mehr zu erreichen

// Bodenarten
// seit 13.85: KRISTALL (violetter Fels des Kristallabgrunds) und ABGRUND (Spalte ins Dunkle, wie ein Gewässer nicht begehbar)
const GROUND = { GRASS: 0, MEADOW: 1, FOREST: 2, PATH: 3, WATER: 4, PLAZA: 5, SAND: 6, ASH: 7, SNOW: 8, SWAMP: 9, LAVA: 10, BOG: 11, ICE: 12, BASALT: 13, CAVE: 14, FLAGSTONE: 15, KRISTALL: 16, ABGRUND: 17 };
// Gewässer, durch die man nicht laufen kann (zugefrorene Seen schon)
const LIQUID = new Set([GROUND.WATER, GROUND.LAVA, GROUND.BOG, GROUND.ABGRUND]);
// Objekte auf dem Boden (alle blockieren den Weg)
// CAVEWALL: Wände der Dungeons, werden mit dem Boden vorgezeichnet
// PILLAR (seit 13.7): Säule in einem Dungeon-Raum; blockiert, gezeichnet wird sie als Prop 'dpillar'
const OBJ = { NONE: 0, TREE: 1, PINE: 2, ROCK: 3, DEADTREE: 4, HOUSE: 5, BLOSSOM: 6, WALL: 7, CAVEWALL: 8, PILLAR: 9 };
// Verzierungen ohne Kollision
const DECO = { NONE: 0, TUFT: 1, FLOWER_RED: 2, FLOWER_YELLOW: 3, FLOWER_WHITE: 4, PEBBLE: 5, CRACK: 6, BRIDGE: 7,
  STUMP: 8, LOG: 9, MUSHROOM: 10, BONES: 11, SHRUB: 12, CRYSTAL: 13, DEADTREE: 14, DRIFT: 15 };
// Seit 6.5 deutlich weniger Bäume und Felsen, dafür Schmuck je Gebiet, durch den man hindurchläuft
// (seit 8.4 Schneewehen im Frost statt der halben Kristalle)
const ZONE_DECO = {
  wiesen: ['SHRUB', 'STUMP', 'SHRUB'], wald: ['STUMP', 'MUSHROOM', 'LOG', 'SHRUB'], orktal: ['BONES', 'DEADTREE', 'BONES'],
  oedland: ['DEADTREE', 'BONES', 'DEADTREE', 'CRYSTAL'], frost: ['CRYSTAL', 'DRIFT', 'STUMP', 'DRIFT'], moor: ['MUSHROOM', 'BONES', 'LOG', 'DEADTREE'],
  vulkan: ['CRYSTAL', 'BONES', 'DEADTREE'], sandwueste: ['BONES', 'DEADTREE'], nagadschungel: ['SHRUB', 'MUSHROOM', 'LOG'],
  donnerklamm: ['BONES', 'DEADTREE', 'CRYSTAL'], titanenkamm: ['CRYSTAL', 'BONES'],
  kristallhang: ['CRYSTAL', 'BONES', 'CRYSTAL', 'DEADTREE'], leerenschlund: ['CRYSTAL', 'CRYSTAL', 'BONES'] // seit 13.85
};
const DECO_RATE = 0.022;
function zoneDeco(zone, r) {
  const list = ZONE_DECO[zone.id];
  return list ? DECO[list[Math.floor(r * list.length) % list.length]] : DECO.NONE;
}
// Halb so viele Stolperteile (seit 13.44): Felsen und feste Bodenteile (Äste, Stümpfe, Stämme, tote Bäumchen,
// Kristalle), an denen man hängen bleibt, fällt auf jeder Map jede zweite weg. Bäume, Büsche, Pilze, Gras und der
// Felsrand der Maps bleiben. Entschieden über die Lage der Kachel, nicht über den Zufallsgenerator – so bleibt der
// Rest der Welt (Bäume, Wasser, Wege) genau wie vorher.
const SOLID_DECO_KINDS = new Set([DECO.STUMP, DECO.LOG, DECO.DEADTREE, DECO.CRYSTAL]);
function thinDrop(x, y) {
  let h = Math.imul(x + 0x3c6ef372, 0x27d4eb2d) ^ Math.imul(y + 0x165667b1, 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h & 1) === 0;
}
// Noch weniger Stolperteile (seit 13.85): von den übrigen Felsen und festen Bodenteilen fällt auf jeder Map gut ein
// Drittel weg, auf dem Feuerberg (Map 9) gut die Hälfte – dort auch Knochen. Wieder über die Lage der Kachel (andere
// Bits als thinDrop), der Zufallsgenerator und damit alles andere bleibt gleich.
const CLUTTER_DROP = { 9: 0.56 };
function clutterDrop(x, y, mapId) {
  if (mapId == null) return false; // Dungeons bleiben, wie sie sind
  let h = Math.imul(x + 0x7f4a7c15, 0x9e3779b1) ^ Math.imul(y + 0x2545f491, 0x6c8e9cf5);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return ((h >>> 8) & 255) / 256 < (CLUTTER_DROP[mapId] || 0.36);
}
function thinDeco(kind, x, y, mapId) {
  if (SOLID_DECO_KINDS.has(kind) && thinDrop(x, y)) return DECO.NONE;
  if ((SOLID_DECO_KINDS.has(kind) || (mapId === 9 && kind === DECO.BONES)) && clutterDrop(x, y, mapId)) return DECO.NONE;
  return kind;
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
  const col = Math.max(0, Math.min(DUNGEON_SLOTS.cols - 1, Math.floor((x - WORLD_W) / DUNGEON_COL)));
  return DUNGEON_SLOTS.cell[col * 4 + Math.max(0, Math.min(3, Math.floor(y / DUNGEON_BLOCK)))];
}
// Platz jedes Dungeons im Streifen (seit 13.58): der Reihe nach von oben nach unten, vier Blöcke je Spalte; wer
// zwei Blöcke braucht (def.rows) und nicht mehr in die Spalte passt, beginnt eine neue. cell: Block -> Dungeon
// (leere Blöcke gehören zum Dungeon davor, sie sind ohnehin Fels)
function dungeonSlots() {
  const at = [];
  let col = 0;
  let row = 0;
  for (const d of DUNGEONS) {
    const rows = Math.min(4, d.rows || 1);
    if (row + rows > 4) { col++; row = 0; }
    at.push({ col, row, rows });
    row += rows;
    if (row >= 4) { col++; row = 0; }
  }
  const cols = col + (row ? 1 : 0);
  const cell = new Array(cols * 4).fill(-1);
  at.forEach((s, k) => { for (let r = 0; r < s.rows; r++) cell[s.col * 4 + s.row + r] = k; });
  for (let i = 0; i < cell.length; i++) if (cell[i] < 0) cell[i] = i ? cell[i - 1] : 0;
  return { at, cols, cell };
}
// Rechteck (Kacheln) des Blocks, in dem Dungeon k liegt
function dungeonBlock(k) {
  const s = DUNGEON_SLOTS.at[k];
  return { x: WORLD_W + s.col * DUNGEON_COL, y: s.row * DUNGEON_BLOCK, w: DUNGEON_COL, h: s.rows * DUNGEON_BLOCK };
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
// Plätze aller Stadtleute (seit 13.72 alle hier, vorher nur Arenameister, Auktionshaus, Post und Briefkasten; die
// übrigen standen in eigenen Listen in der Mitte, obwohl die Mauern in 13.63 nach außen gerückt sind). Seit 13.72
// stehen alle Stände innen an der Mauer, die Mitte mit Weltentor, Brunnen und den Wegen zu den Toren bleibt frei.
// [dx, dy, Seite des Stands] in Kacheln ab der Mitte der Stadt (Kachel cx, cy; die Mauer liegt bei ±H, ihre
// Innenkante bei -H + 1 und +H, die Tore um dx bzw. dy = 0). Seite: 'w' Stand links an der Westmauer, die Person
// schaut zur Mitte · 'e' Stand rechts an der Ostmauer · 'n' Stand dahinter (Nordmauer; an der Südmauer im Lager
// steht die Person an der Mauer und der Stand vor ihr, weil ein Stand zwischen Kamera und Person sie verdecken
// würde) · null = ohne Stand (Briefkasten; seit 13.85 auch der Arenameister, der ohne Stand in der Mitte steht).
// 'frei' ist ein weiterer freier Platz für später.
// Alles feste Zahlen (keine Zufallszahlen): jeder Mitspieler bekommt dieselben Plätze. Die Stände blockieren nicht
// (Schmuck ohne Kollision) und keine Kachel ändert sich – wer an einem alten Standplatz gespeichert hat, steht frei.
// dorf: Vlotho (Mauer 23) · stadt: Sahra (Map 2) und Klammfeste (Map 3, Mauer 20) · lager: die übrigen (Mauer 13)
const TOWN_PLACES = {
  // Vlotho: West- und Ostmauer, je vier Stände über und unter dem Tor (Abstand 4); um die Tore stehen die Torwachen
  dorf: {
    aeltester: [-19.25, -18.5, 'w'], waffen: [-19.25, -14.5, 'w'], haendler: [-19.25, -10.5, 'w'], bogenmacher: [-19.25, -6.5, 'w'],
    stallmeister: [-19.25, 7.5, 'w'], schmied: [-19.25, 11.5, 'w'], frei: [-19.25, 19.5, 'w'],
    lehrmeister: [20.25, -18.5, 'e'], teleport: [20.25, -14.5, 'e'], ruestung: [20.25, -10.5, 'e'], alchemist: [20.25, -6.5, 'e'],
    jaegerin: [20.25, 7.5, 'e'], lager: [20.25, 11.5, 'e'], auktion: [20.25, 15.5, 'e'], post: [20.25, 19.5, 'e'],
    briefkasten: [18.2, 20.8, null],
    // seit 13.85 ohne Stand mitten in der Stadt: links oben schräg hinter dem Brunnen, frei von Wegen, Weltentor und
    // den Wegen der umherlaufenden Leute (Bauer, Mönch, Nachtwächterin, Laternenanzünder); vorher [-19.25, 15.5, 'w']
    arena: [-3.9, -4.5, null],
    // seit 13.86: Turniermeister (Spieler gegen Spieler, turnierarena.js) ohne Stand links neben dem Arenameister, etwas
    // tiefer, damit sich die Namen über den Köpfen nicht berühren
    pvp: [-6.9, -3.3, null]
  },
  // Städte: West- und Ostmauer, je vier Stände über und unter dem Tor (Abstand 3,6)
  stadt: {
    aeltester: [-16.25, -16.3, 'w'], waffen: [-16.25, -12.7, 'w'], haendler: [-16.25, -9.1, 'w'], schmied: [-16.25, -5.5, 'w'],
    stallmeister: [-16.25, 5.5, 'w'], bogenmacher: [-16.25, 9.1, 'w'], lehrmeister: [-16.25, 12.7, 'w'],
    teleport: [17.25, -16.3, 'e'], ruestung: [17.25, -12.7, 'e'], alchemist: [17.25, -9.1, 'e'], lager: [17.25, -5.5, 'e'],
    post: [17.25, 5.5, 'e'], jaegerin: [17.25, 9.1, 'e'], auktion: [17.25, 12.7, 'e'], frei: [17.25, 16.3, 'e'],
    briefkasten: [15.3, 6.7, null],
    // seit 13.85 ohne Stand in der Mitte, rechts unten (der Brunnen steht links oben); vorher [-16.25, 16.3, 'w']
    arena: [3.6, 3.4, null],
    // seit 13.86: Turniermeister rechts unten neben dem Arenameister
    pvp: [6.1, 4.4, null]
  },
  // Lager (klein): je zwei an West- und Ostmauer über und unter dem Tor, dazu drei an der Nordmauer neben den
  // Tortürmen (in der Nordwestecke nur einer, dort rückt die Mauer näher ans Tor) und vier an der Südmauer
  lager: {
    aeltester: [-9.25, -7.8, 'w'], waffen: [-9.25, -4.5, 'w'], haendler: [-9.25, 4.5, 'w'], schmied: [-9.25, 7.6, 'w'],
    teleport: [10.25, -7.6, 'e'], ruestung: [10.25, -4.5, 'e'], alchemist: [10.25, 4.5, 'e'], lager: [10.25, 7.6, 'e'],
    lehrmeister: [-5.4, -9.25, 'n'], jaegerin: [4.75, -9.25, 'n'], auktion: [7.95, -9.25, 'n'],
    stallmeister: [-7.4, 10.25, 'n'], bogenmacher: [3.75, 10.25, 'n'], post: [7.6, 10.25, 'n'],
    briefkasten: [9.4, 11.3, null],
    // seit 13.85 ohne Stand in der Mitte, rechts unten (Brunnen links, Weltentor oben); vorher [-3.75, 10.25, 'n']
    arena: [3.9, 2.7, null],
    // seit 13.86: Turniermeister schräg über dem Arenameister (nicht genau darüber: dort läge sein Name auf dessen Plakette)
    pvp: [5.4, -1.3, null]
  }
};
// Stadtleute mit Stand, in der Reihenfolge, in der sie in jeder Stadt erzeugt werden (seit 13.72)
const TOWN_ROLES = ['aeltester', 'waffen', 'haendler', 'schmied', 'lehrmeister', 'teleport', 'ruestung', 'alchemist', 'lager', 'jaegerin',
  'stallmeister', 'bogenmacher', 'post', 'auktion', 'arena', 'pvp'];
// Art der Stadt einer Map (siehe TOWN_PLACES)
function townKind(mapId) {
  if (mapId === 1) return 'dorf';
  const wm = WORLD_MAPS.find((m) => m.id === mapId);
  return wm && (wm.genCamp || wm.camp || CAMP_HALF) < CAMP_HALF ? 'lager' : 'stadt';
}
// Platz einer Rolle in der Stadt einer Map: { x, y } in Kacheln (Mitte der Person), stand: Seite des Stands oder null
function townPlace(mapId, role) {
  const at = TOWN_PLACES[townKind(mapId)][role];
  if (!at) return null;
  const wm = WORLD_MAPS.find((m) => m.id === mapId);
  const [cx, cy] = mapId === 1 ? [CENTER_X, CENTER_Y] : [wm.cx, wm.cy];
  return { x: cx + at[0], y: cy + at[1], stand: at[2] };
}

// Pferd (und Heu) neben dem Stand des Stallmeisters (seit 13.72, at = townPlace(..., 'stallmeister')): an der
// West- oder Ostmauer steht das Pferd schräg vor ihm zur Mitte hin, das Heu an der Mauer auf der Seite zum Tor;
// an der Südmauer (Lager, Stand vor ihm) steht das Pferd links neben ihm in der Ecke
function stallProps(at, hay) {
  const P = (x, y) => ({ x: x * TILE, y: y * TILE });
  if (at.stand === 'n') return [{ type: 'horse', ...P(at.x - 1.9, at.y + 0.7) }];
  const dir = at.stand === 'w' ? 1 : -1; // zur Mitte hin
  const out = [{ type: 'horse', ...P(at.x + dir * 1.7, at.y + 1.4) }];
  if (hay) out.push({ type: 'hay', ...P(at.x - dir * 0.9, at.y - 2.1) });
  return out;
}

// Stadtschmuck (seit 13.85): Fässer, Kisten, Blumenkästen, Bänke, Holzstapel und Banner an Häusern und Mauern, je
// Map im Stil des Gebiets. Alles ist Schmuck ohne Kollision (game.world.props): Spieler und NPCs laufen hindurch,
// und es steht ohnehin nur dort, wo niemand läuft – vor den Hausecken (nicht vor der Tür), an der Nord- und Südmauer
// und in den Ecken. Die Mitte, die Wege zu den Toren, das Weltentor, die Stände und alle Leute bleiben frei
// (townDecoProps prüft jeden Platz und lässt ihn sonst weg). Feste Zahlen, keine Zufallszahlen: alle sehen dasselbe.
// [dx, dy, Art] in Kacheln ab der Mitte der Stadt (Bänke schauen nach Süden). Arten: P Pflanzkübel · B Bank · G Warenstapel ·
// X Haufen (Holz, Heu, Säcke, Krüge, Totem, Erz – je Map, der Reihe nach) · F Banner an der Mauer · K Fass · C Kiste ·
// H Heu. Auf niedriger Grafik fallen Kübel, einzelne Fässer und Kisten weg (fine).
const TOWN_DECO = {
  dorf: [
    // Nordmauer: Banner, zwei Bänke zwischen Blumenkästen, außen Waren und ein Haufen
    [-17.3, -20.9, 'G'], [-15.5, -21.55, 'F'], [-12.3, -20.9, 'P'], [-10.5, -20.7, 'B'], [-8.7, -20.9, 'P'], [-6, -21.55, 'F'],
    [6, -21.55, 'F'], [8.7, -20.9, 'P'], [10.5, -20.7, 'B'], [12.3, -20.9, 'P'], [15.5, -21.55, 'F'], [17.3, -20.9, 'X'],
    // an den Häusern: vor den Ecken (die Tür in der Mitte bleibt frei) und an der Seite
    [-14.45, -11.4, 'P'], [-10.55, -11.4, 'G'], [-15.7, -13.2, 'X'], [-7.45, -11.4, 'P'],
    [-14.45, -5.4, 'P'], [-12.55, -5.4, 'C'],
    [9.45, -11.4, 'P'], [10.7, -13.3, 'G'],
    [12.55, -5.4, 'P'], [15.45, -5.4, 'G'], [16.7, -7.8, 'X'],
    [6.55, 9.6, 'P'], [9.45, 9.6, 'P'], [10.7, 7.3, 'G'],
    [-9.45, 15.6, 'P'], [-6.55, 15.6, 'G'], [-10.7, 13.3, 'X'],
    [4.55, 16.6, 'P'], [7.45, 16.6, 'C'], [8.7, 14.3, 'K'],
    // Südmauer und der alte Platz des Arenameisters an der Westmauer
    [-15, 20.6, 'G'], [-11, 20.8, 'P'], [-6.5, 20.8, 'X'], [6.5, 20.8, 'X'], [11, 20.8, 'P'], [15, 20.6, 'G'],
    [-20.9, 15.5, 'G'], [-20.6, 17.4, 'P']
  ],
  stadt: [
    [-14.6, -17.9, 'G'], [-12.5, -18.55, 'F'], [-10.8, -17.9, 'P'], [-9, -17.7, 'B'], [-7.2, -17.9, 'P'], [-5.2, -18.55, 'F'],
    [5.2, -18.55, 'F'], [7.2, -17.9, 'P'], [9, -17.7, 'B'], [10.8, -17.9, 'P'], [12.5, -18.55, 'F'], [14.6, -17.9, 'X'],
    [-11.45, -8.4, 'P'], [-7.55, -8.4, 'G'], [-12.7, -10.3, 'X'],
    [6.55, -8.4, 'G'], [10.45, -8.4, 'P'], [11.7, -10.3, 'X'],
    [-13, 17.6, 'G'], [-9, 17.8, 'P'], [-5.5, 17.6, 'X'], [5.5, 17.6, 'X'], [9, 17.8, 'P'], [13, 17.6, 'G'],
    [-17.9, 16.3, 'G'], [-17.6, 18.0, 'P']
  ],
  lager: [
    [-11, -11, 'G'], [-8.8, -11.55, 'F'], [10.3, -11.55, 'F'], [11.4, -10.6, 'X'],
    // zwischen den Ständen an der Westmauer je ein Fass (an der Ostmauer stehen sie zu dicht)
    [-11.45, -6.2, 'K'], [-11.45, 6.05, 'K'],
    // Heu beim Pferd, am alten Platz des Arenameisters Waren und ein Kübel, rechts unten Waren
    [-11.3, 11.5, 'H'], [-4.6, 11.4, 'G'], [-5.9, 11.6, 'P'], [11.2, 11.3, 'G']
  ]
};
// Stil je Map: Pflanzkübel, Bank, Waren, Haufen (der Reihe nach), Bannerfarbe, Schnee obendrauf
const TOWN_THEME = {
  1: { planter: 'blumen', bench: 'holz', goods: 'markt', pile: ['heu', 'holz'], banner: '#9a2f2a' },
  2: { planter: 'palme', bench: 'stein', goods: 'krug', pile: ['krug', 'sack'], banner: '#c8902a' },
  3: { planter: 'dorn', bench: 'stein', goods: 'markt', pile: ['holz', 'sack'], banner: '#4a5a7a' },
  4: { planter: 'farn', bench: 'holz', goods: 'markt', pile: ['holz'], banner: '#3a6a3a' },
  5: { planter: 'dorn', bench: 'holz', goods: 'markt', pile: ['totem', 'sack'], banner: '#8a2a1a' },
  6: { planter: 'dorn', bench: 'stein', goods: 'markt', pile: ['sack', 'holz'], banner: '#5a4a5a' },
  7: { planter: 'tanne', bench: 'holz', goods: 'markt', pile: ['holz'], banner: '#2f5a7a', snow: true },
  8: { planter: 'pilz', bench: 'holz', goods: 'markt', pile: ['holz', 'sack'], banner: '#4a5a3a' },
  9: { planter: 'dorn', bench: 'stein', goods: 'erz', pile: ['erz', 'sack'], banner: '#a83a1a' },
  10: { planter: 'dorn', bench: 'stein', goods: 'krug', pile: ['sack', 'krug'], banner: '#5a3aa8' } // seit 13.85: Lichtwacht
};
const PILE_PROP = { heu: 'hay', holz: 'woodpile', sack: 'sacks', krug: 'pots', totem: 'totem', erz: 'ore' };
// Ist (x, y) (Kacheln) ein guter Platz für Schmuck? Nicht auf Weg, Haus oder Mauer, nicht in der Mitte oder vor
// einem Tor, mit Abstand zu Leuten (und dem Gebiet, in dem die Umherlaufenden gehen), Weltentor, Ständen und Bauten
function townDecoFree(x, y, cx, cy, H, npcs, props, obj, ground) {
  const dx = x - cx;
  const dy = y - cy;
  if (Math.hypot(dx, dy) < 6.5) return false;
  if ((Math.abs(dx) < 3 && Math.abs(dy) > H - 5) || (Math.abs(dy) < 3 && Math.abs(dx) > H - 5)) return false;
  for (const [ox, oy] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) {
    const i = Math.floor(y + oy) * MAP_W + Math.floor(x + ox);
    if (obj[i] !== OBJ.NONE || ground[i] === GROUND.PATH) return false;
  }
  for (const n of npcs) {
    const nx = n.x / TILE;
    const ny = n.y / TILE;
    if (Math.abs(nx - x) > 8 || Math.abs(ny - y) > 8) continue;
    if (n.wander) {
      if (Math.abs(n.homeX / TILE - x) < 3.1 && Math.abs(n.homeY / TILE - y) < 2.6) return false;
    } else if (Math.hypot(nx - x, ny - y) < (n.id === 'weltentor' ? 3.2 : 1.5)) return false;
  }
  const keep = { stand: 1.7, horse: 1.4, well: 1.5, lantern: 0.9, brazier: 1.0 };
  for (const pr of props) {
    const R = keep[pr.type];
    if (R && Math.hypot(pr.x / TILE - x, pr.y / TILE - y) < R) return false;
  }
  return true;
}
// Schmuck einer Stadt (Map mapId, Mitte cx, cy, Mauer H): Liste von Props
function townDecoProps(mapId, cx, cy, H, npcs, props, obj, ground) {
  const th = TOWN_THEME[mapId] || TOWN_THEME[1];
  const snow = th.snow ? '|schnee' : '';
  const out = [];
  let pile = 0;
  for (const [dx, dy, code] of TOWN_DECO[townKind(mapId)]) {
    const x = cx + dx;
    const y = cy + dy;
    if (!townDecoFree(x, y, cx, cy, H, npcs, props, obj, ground)) continue;
    // kleine feste Drehung je Platz, damit nicht alles in Reih und Glied steht (nur 3D)
    const rot = (((Math.round(dx * 7 + dy * 13) % 5) + 5) % 5 - 2) * 0.16;
    const at = { x: x * TILE, y: y * TILE };
    if (code === 'P') out.push({ type: 'planter', roof: th.planter + snow, fine: true, ...at });
    else if (code === 'B') out.push({ type: 'bench', roof: th.bench + snow, ...at });
    else if (code === 'G') out.push({ type: 'goods', roof: th.goods + snow, rot, ...at });
    else if (code === 'F') out.push({ type: 'wallbanner', roof: th.banner, ...at });
    else if (code === 'K') out.push({ type: 'barrel', fine: true, rot, ...at });
    else if (code === 'C') out.push({ type: 'crate', fine: true, rot, ...at });
    else if (code === 'H') out.push({ type: 'hay', ...at });
    else {
      const kind = PILE_PROP[th.pile[pile++ % th.pile.length]];
      out.push({ type: kind, roof: kind === 'woodpile' || kind === 'sacks' ? snow.slice(1) : '', rot, ...at });
    }
  }
  return out;
}

// Vlotho vergrößern (seit 13.63): Das Dorf wird mit dem alten Plan (VILLAGE_PLAN) erzeugt, damit Bäume, Wasser und
// Blumen draußen genau gleich bleiben. Danach gehört alles bis zur neuen Mauer (VILLAGE_HALF) zum Dorf, die alte
// Mauer verschwindet, und vor der neuen bleiben 4 Kacheln frei (ohne Bäume, Felsen und Wasser). Die neue Mauer steht
// jetzt auch im Osten und Süden (vorher fehlten dort die Mauerstücke zwischen den Türmen).
function widenVillage(ground, obj, deco, zoneIdx) {
  const H = VILLAGE_HALF;
  for (let y = CENTER_Y - H - 4; y <= CENTER_Y + H + 4; y++) {
    for (let x = CENTER_X - H - 4; x <= CENTER_X + H + 4; x++) {
      const i = y * MAP_W + x;
      const cheb = Math.max(Math.abs(x + 0.5 - CENTER_X), Math.abs(y + 0.5 - CENTER_Y));
      if (obj[i] === OBJ.WALL) obj[i] = OBJ.NONE;
      if (cheb < H + 0.5) zoneIdx[i] = 0;
      // der alte Dorfplatz bleibt, wie er ist; neu dazu: freies Land ohne Hindernisse
      if (cheb >= VILLAGE_PLAN + 0.5) {
        if (obj[i] !== OBJ.HOUSE) obj[i] = OBJ.NONE;
        if (deco[i] === DECO.BRIDGE) {
          ground[i] = GROUND.PATH;
          deco[i] = DECO.NONE;
        } else if (LIQUID.has(ground[i])) {
          ground[i] = GROUND.GRASS;
          deco[i] = DECO.NONE;
        }
        if (SOLID_DECO_KINDS.has(deco[i])) deco[i] = DECO.NONE;
      }
      if (isWallTile(x, y)) {
        obj[i] = OBJ.WALL;
        deco[i] = DECO.NONE;
      }
    }
  }
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
      // seit 13.63 mit dem alten Dorf (VILLAGE_PLAN) erzeugt, damit die Wildnis gleich bleibt; widenVillage vergrößert danach
      const zi = cheb < VILLAGE_PLAN + 0.5 ? 0 : mapZoneAt(x, y);
      const zone = ZONES[zi];
      zoneIdx[i] = zi;

      const v = shape(x, y) * 0.65 + detail(x, y) * 0.35;
      ground[i] = GROUND[zone.ground];
      if (zone.alt && bloom(x, y) > 0.6) ground[i] = GROUND[zone.alt];

      if (zi === 0) {
        if (d < 6.5 * VS) ground[i] = GROUND.PLAZA;
        // alte Mauer (seit 13.63 nur noch für die Zufallszahlen der Verzierungen; widenVillage setzt die neue)
        if (isWallTile(x, y, CENTER_X, CENTER_Y, VILLAGE_PLAN)) obj[i] = OBJ.WALL;
        continue;
      }
      // Rand der Map: dichter Bewuchs
      if (x < m1x0 + MAP_BORDER || y < m1y0 + MAP_BORDER || x >= m1x1 - MAP_BORDER || y >= m1y1 - MAP_BORDER) {
        obj[i] = OBJ[zone.treeObj];
        continue;
      }
      // Rund um die Mauer bleibt das Land frei
      if (cheb < VILLAGE_PLAN + 4) continue;

      if (zone.water && v < zone.water) {
        ground[i] = zone.liquid === 'ICE' ? GROUND.ICE : GROUND[zone.liquid || 'WATER'];
        continue;
      }
      const cluster = v > 0.55 ? 1.8 : 0.5;
      const r = rng();
      if (r < zone.trees * cluster) obj[i] = OBJ[zone.treeObj];
      else if (r < zone.trees * cluster + zone.rocks) { if (!thinDrop(x, y) && !clutterDrop(x, y, 1)) obj[i] = OBJ.ROCK; }
      else if (r < zone.trees * cluster + zone.rocks + DECO_RATE) deco[i] = thinDeco(zoneDeco(zone, rng()), x, y, 1);
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
        // über Wasser eine Brücke (das Wasser bleibt darunter), sonst Weg; tidyBridges räumt danach auf
        if (LIQUID.has(ground[i])) deco[i] = DECO.BRIDGE;
        else {
          deco[i] = DECO.NONE;
          if (ground[i] !== GROUND.PLAZA) ground[i] = GROUND.PATH;
        }
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
    // seit 12.2 ohne die Häuser links unten und rechts unten: ihre Dächer verdeckten die Stände am Rand
    [-8, 9, 5, 3, '#7c3a2c'],
    [5, 5, 4, 3, '#4f5f3a'],
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
  // seit 13.63: Vlotho größer – Mauer nach außen, alter Mauerring weg (erst jetzt, die Zufallszahlen sind verbraucht)
  widenVillage(ground, obj, deco, zoneIdx);

  // Dungeons im Streifen östlich der Welt, darunter Map 2 und Map 3
  const dungeons = buildDungeons(ground, obj, zoneIdx, deco);
  const maps = buildWorldMaps(ground, obj, deco, zoneIdx, shape, detail, bloom);
  tidyBridges(ground, deco, obj);

  // Dorfbewohner: Händler und Helfer stehen fest, Wachen an den Toren, ein paar Leute laufen umher.
  // Seit 12.2 stehen die Stadtleute am linken und rechten Rand einander gegenüber, die Mitte bleibt frei; jede
  // Person vor ihrem Stand (STAND3 in drei-welt.js). stand: 'w' Stand links von ihr (sie schaut nach rechts),
  // 'e' Stand rechts, 'n' Stand dahinter. Lagen in Kacheln ab der Mitte, frei von Häusern, Wegen und Wachen.
  // Seit 13.72 innen an der Mauer (TOWN_PLACES), damit die Mitte der größeren Städte (13.63) frei bleibt.
  const npc = (id, name, x, y, extra = {}) => ({ id, name, x: x * TILE, y: y * TILE, r: 11, ...extra });
  const L = (side) => ({ stand: side, restYaw: side === 'w' ? 0.75 : side === 'e' ? -0.75 : 0 });
  // seit 13.72: alle Plätze aus TOWN_PLACES (innen an der Mauer), vorher 12,75 Kacheln links und rechts der Mitte
  const VLOTHO_PEOPLE = {
    aeltester: 'Dorfältester Bao', waffen: 'Waffenhändler Goro', haendler: 'Händlerin Ayla', schmied: 'Schmied Doran',
    lehrmeister: 'Lehrmeister Wen', teleport: 'Wegweiserin Lian', ruestung: 'Rüstungshändlerin Mei', alchemist: 'Alchemist Yun',
    lager: 'Lagerverwalter Bo', jaegerin: 'Jägerin Rin', stallmeister: 'Stallmeister Jun',
    bogenmacher: 'Bogenmacherin Hana', // seit 13.57: Bögen, Köcher und Pfeile
    post: 'Postmeisterin Ida', auktion: 'Auktionator Edo', // seit 13.63 (auktionshaus.js, post.js)
    arena: 'Arenameisterin Kaida', // seit 13.63: Herausforderung (herausforderung.js)
    pvp: 'Turniermeister Tamo' // seit 13.86: Turnierarena, Spieler gegen Spieler (turnierarena.js)
  };
  const townNpc = (mapId, id, name) => {
    const at = townPlace(mapId, id);
    return npc(id, name, at.x, at.y, L(at.stand));
  };
  const npcs = [
    ...TOWN_ROLES.map((id) => townNpc(1, id, VLOTHO_PEOPLE[id])),
    npc('weltentor', 'Weltentor', C + 5.1, C - 9)
  ];
  // Städte und Lager der anderen Maps: Weltentor und dieselben Leute wie in Vlotho (jede Map mit eigenen Namen),
  // damit man Aufträge, Jagden und die Stallmeister-Prüfung überall annehmen und abgeben kann
  const ROLE_TITLE = {
    haendler: ['Händlerin', 'Händler'], schmied: ['Schmied', 'Schmiedin'], waffen: ['Waffenhändler', 'Waffenhändlerin'],
    ruestung: ['Rüstungshändlerin', 'Rüstungshändler'], alchemist: ['Alchemist', 'Alchemistin'], aeltester: ['Lagerältester', 'Lagerälteste'],
    jaegerin: ['Jägerin', 'Jäger'], teleport: ['Wegweiserin', 'Wegweiser'], stallmeister: ['Stallmeister', 'Stallmeisterin'],
    lehrmeister: ['Lehrmeister', 'Lehrmeisterin'], lager: ['Lagerverwalter', 'Lagerverwalterin'],
    bogenmacher: ['Bogenmacherin', 'Bogenmacher'],
    auktion: ['Auktionator', 'Auktionatorin'], post: ['Postmeisterin', 'Postmeister'], // seit 13.63
    arena: ['Arenameisterin', 'Arenameister'], // seit 13.63: Herausforderung (herausforderung.js)
    pvp: ['Turniermeisterin', 'Turniermeister'] // seit 13.86: Turnierarena (turnierarena.js)
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
    9: { haendler: ['Asha', 0], schmied: ['Volkan', 0], waffen: ['Ignis', 0], ruestung: ['Glut', 1], alchemist: ['Pyra', 1], aeltester: ['Ember', 1], jaegerin: ['Kira', 0], teleport: ['Funke', 1], stallmeister: ['Ruß', 0], lehrmeister: ['Aschea', 1], lager: ['Kohl', 0] },
    // seit 13.85: Lichtwacht im Kristallabgrund
    10: { haendler: ['Selene', 0], schmied: ['Brannoc', 0], waffen: ['Corvin', 0], ruestung: ['Ilse', 0], alchemist: ['Sorel', 0], aeltester: ['Aurelia', 1], jaegerin: ['Nerys', 0], teleport: ['Elian', 1], stallmeister: ['Maren', 1], lehrmeister: ['Castor', 0], lager: ['Odo', 0] }
  };
  // Bogenmacher je Map (seit 13.57)
  const BOW_PEOPLE = { 2: ['Amira', 0], 3: ['Torvald', 1], 4: ['Wiebke', 0], 5: ['Grisha', 0], 6: ['Zeynep', 0], 7: ['Liv', 0], 8: ['Rabe', 1], 9: ['Flint', 1], 10: ['Siv', 0] };
  for (const [k, v] of Object.entries(BOW_PEOPLE)) if (MAP_PEOPLE[k]) MAP_PEOPLE[k].bogenmacher = v;
  // Auktionshaus und Post je Map (seit 13.63)
  const AUCTION_PEOPLE = { 2: ['Bashir', 0], 3: ['Ingvild', 1], 4: ['Konrad', 0], 5: ['Gruk', 0], 6: ['Soraya', 1], 7: ['Eskil', 0], 8: ['Morgana', 1], 9: ['Brand', 0], 10: ['Lucan', 0] };
  const POST_PEOPLE = { 2: ['Leyla', 0], 3: ['Arvid', 1], 4: ['Hanne', 0], 5: ['Durza', 0], 6: ['Karim', 1], 7: ['Tove', 0], 8: ['Krähe', 1], 9: ['Asche', 0], 10: ['Fenja', 0] };
  for (const [k, v] of Object.entries(AUCTION_PEOPLE)) if (MAP_PEOPLE[k]) MAP_PEOPLE[k].auktion = v;
  for (const [k, v] of Object.entries(POST_PEOPLE)) if (MAP_PEOPLE[k]) MAP_PEOPLE[k].post = v;
  // Arenameister je Map (seit 13.63, Herausforderung)
  const ARENA_PEOPLE = { 2: ['Zarif', 1], 3: ['Brynja', 0], 4: ['Rasmus', 1], 5: ['Urgash', 1], 6: ['Samira', 0], 7: ['Hedda', 0], 8: ['Vesper', 0], 9: ['Glutfaust', 1], 10: ['Varik', 1] };
  for (const [k, v] of Object.entries(ARENA_PEOPLE)) if (MAP_PEOPLE[k]) MAP_PEOPLE[k].arena = v;
  // Turniermeister je Map (seit 13.86, Turnierarena)
  const PVP_PEOPLE = { 2: ['Faruk', 1], 3: ['Ragnhild', 0], 4: ['Wendel', 1], 5: ['Morga', 0], 6: ['Kamal', 1], 7: ['Asta', 0], 8: ['Dorn', 1], 9: ['Zinder', 1], 10: ['Liora', 0] };
  for (const [k, v] of Object.entries(PVP_PEOPLE)) if (MAP_PEOPLE[k]) MAP_PEOPLE[k].pvp = v;
  const personName = (mapId, id) => {
    const [n, form] = (MAP_PEOPLE[mapId] && MAP_PEOPLE[mapId][id]) || ['', 0];
    return n.startsWith('Hexe') ? n : `${ROLE_TITLE[id][form]} ${n}`.trim();
  };
  for (const mp of maps) {
    const k = mp.scale;
    npcs.push(npc('weltentor', 'Weltentor', mp.cx + 0.5 * k, mp.cy - 4.5 * k));
    // seit 13.72 alle an der Mauer (TOWN_PLACES), vorher in CAMP_SPOTS/TOWN_SPOTS nach dem alten, kleineren Plan
    for (const id of TOWN_ROLES) npcs.push(townNpc(mp.id, id, personName(mp.id, id)));
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
        // nicht in der (vergrößerten) Stadt – seit 13.63 auch in Vlotho und den Lagern
        if (Math.max(Math.abs(tx - wm.cx), Math.abs(ty - wm.cy)) < (wm.id === 1 ? VILLAGE_HALF : wm.camp || CAMP_HALF) + 3) continue;
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
    // Lv-60-Instanzen (seit 13.58): Eingang in einer Ecke der Map (instCornerEntrance in instanzen.js)
    const e = dg.def.entry.corner && typeof instCornerEntrance === 'function' ? instCornerEntrance(dg.def.entry, ground, obj, deco, zoneIdx) : placeDungeonEntrance(dg.def.entry, ground, obj, deco, zoneIdx);
    dg.entrance = { x: (e.x + 0.5) * TILE, y: (e.y + 1.4) * TILE };
    npcs.push(npc('eingang', dg.def.instanz ? `Höllenportal: ${dg.def.name}` : dg.def.raid ? `Endboss: ${MONSTER_TYPES[dg.def.boss].name}` : dg.def.inst60 ? `Instanz: ${dg.def.name}` : dg.def.name, e.x + 0.5, e.y + 0.6, { dungeon: k }));
    const r0 = dg.rooms[0];
    const rb = dg.rooms[dg.rooms.length - 1];
    npcs.push(npc('ausgang', 'Ausgang', r0.x + 1.5, r0.y + 1.2, { dungeon: k }));
    if (dg.def.raid || dg.def.instanz) npcs.push(npc('ausgang', 'Ausgang', rb.cx + 0.5, rb.y + rb.h - 4, { dungeon: k }));
    else {
      // seit 13.7: freie Stelle oben rechts im Bossraum (der Raum kann rund oder ein Kreuz sein)
      const ex = dungeonFreeTile(rb, 0.82, 0.18, obj, ground);
      npcs.push(npc('ausgang', 'Ausgang', ex.x + 0.5, ex.y + 0.5, { dungeon: k }));
    }
  });
  // Torwachen innen neben den Toren (Abstand zur Mauer bleibt gleich, wenn das Dorf wächst)
  // seit 13.9.1: am Südtor stehen die Wachen draußen vor den Torsäulen (drinnen verdeckten die Türme sie ganz),
  // an Ost- und Westtor die oberen Wachen ein Stück tiefer, damit der Turm sie nicht halb verdeckt
  const GN = C - VILLAGE_HALF + 1.4;
  const GS = C + VILLAGE_HALF - 0.6;
  const GO = C + VILLAGE_HALF + 1.9;
  for (const [x, y] of [[C - 3.3, GN], [C + 3.3, GN], [C - 2.5, GO], [C + 2.5, GO],
    [GN, C - 1.6], [GN, C + 3.6], [GS, C - 1.6], [GS, C + 3.6]]) {
    npcs.push(npc('wache', 'Torwache', x, y, { silent: true }));
  }
  for (const [id, x, y] of [['bauer', V(-6), V(-6)], ['kind', V(2), V(7)], ['alte', V(-2), V(-9)], ['moench', V(5), V(-3)]]) {
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
    ...[[-3.1, -9.8], [2.1, -9.8], [-3.1, 10], [2.1, 10], [-9.5, -2.2], [-9.5, 1.2], [9.5, -2.2], [9.5, 1.2]]
      .map(([x, y]) => ({ type: 'lantern', ...T(C + x, C + y) })),
    { type: 'barrel', ...T(C - 10.3, C - 6.4) },
    { type: 'barrel', ...T(C - 9.7, C - 5.9) }
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
  // seit 13.72 neben seinem Stand an der Westmauer (stallProps): Heu an der Mauer zum Tor hin, das Pferd vor ihm
  props.push(...stallProps(townPlace(1, 'stallmeister'), true));
  // Feuerbecken in den Dungeon-Räumen
  dungeons.forEach((dg) => {
    // gewürfelte Dungeons (seit 13.7) schmücken ihre Räume selbst, seit 13.58 auch der Höllenthron mit vielen Räumen
    if (!dg.def.raid && (!dg.def.instanz || dg.def.rows)) {
      props.push(...dungeonProps(dg, obj, ground).map((pr) => ({ ...pr, ...T(pr.tx, pr.ty) })));
      return;
    }
    for (const r of dg.def.raid ? dg.rooms.slice(0, 1) : dg.rooms.slice(0, -1)) {
      props.push({ type: 'brazier', roof: dg.def.portal, ...T(r.x + 1.5, r.y + r.h - 0.6) });
      props.push({ type: 'brazier', roof: dg.def.portal, ...T(r.x + r.w - 1.5, r.y + r.h - 0.6) });
    }
    // Endboss-Halle: ein Ring aus Feuerbecken am Rand
    if (dg.def.raid || dg.def.instanz) {
      const r = dg.rooms[dg.rooms.length - 1];
      for (let k = 0; k < (dg.def.instanz ? 16 : 12); k++) {
        const a = (k / (dg.def.instanz ? 16 : 12)) * Math.PI * 2;
        props.push({ type: 'brazier', roof: dg.def.portal, ...T(r.x + r.w / 2 + Math.cos(a) * (r.w / 2 - 3), r.y + r.h / 2 + Math.sin(a) * (r.h / 2 - 3)) });
      }
    }
  });

  // Hinter jedem Turm steht die Mauer; die Türme selbst blockieren über die Mauerkacheln
  // Städte in Map 2 und 3: Laternen, Feuerbecken, Marktstände, Brunnen, Fässer
  for (const mp of maps) {
    // Türme an den Ecken und an jedem Tor, Torbögen im Norden und Süden
    const H2 = WORLD_MAPS.find((m) => m.id === mp.id).camp || CAMP_HALF;
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
      // seit 12.2 in Kacheln ab der Mitte (die Leute stehen am Rand, die Mitte bleibt frei)
      const KT = (x, y) => T(mp.cx + x, mp.cy + y);
      for (const [dx, dy] of [[-2.2, 4.4], [1.2, 4.4], [-2.2, -2.6], [1.2, -2.6]]) props.push({ type: 'lantern', ...KT(dx, dy) });
      props.push({ type: 'brazier', roof: '#ffb04a', ...KT(-1, -5.8) }, { type: 'brazier', roof: '#ffb04a', ...KT(2.2, -5.8) });
      // seit 13.72 das Pferd beim Stallmeister an der Südmauer (vorher fest bei -5.2, 7.4)
      props.push({ type: 'well', ...KT(-3, 0.3) }, ...stallProps(townPlace(mp.id, 'stallmeister'), false));
      continue;
    }
    const KT = (x, y) => T(mp.cx + x, mp.cy + y);
    for (const [dx, dy] of [[-2.2, -9], [1.2, -9], [-2.2, 9.5], [1.2, 9.5], [-5.5, -2.2], [-5.5, 1.2], [5.5, -2.2], [5.5, 1.2]]) props.push({ type: 'lantern', ...KT(dx, dy) });
    props.push({ type: 'brazier', roof: '#ffb04a', ...KT(-1.6, -5.8) }, { type: 'brazier', roof: '#ffb04a', ...KT(2.9, -5.8) });
    props.push({ type: 'well', ...KT(-3.5, -3) });
    // seit 13.72 beim Stallmeister an der Westmauer (vorher fest bei -6.8, 11.8 und -3, 12.4)
    props.push(...stallProps(townPlace(mp.id, 'stallmeister'), true));
  }

  // Stand hinter jeder Stadtperson (seit 12.0): eine Kachel und ein Viertel nördlich, die Person steht davor
  const STAND_ROLES = new Set(Object.keys(ROLE_TITLE));
  const SIDE = { w: [-1.25, 0, Math.PI / 2], e: [1.25, 0, -Math.PI / 2], n: [0, -1.25, 0] };
  for (const n of npcs) {
    // seit 13.85: wer ohne Stand steht (stand null, der Arenameister), bekommt auch keinen
    if (!STAND_ROLES.has(n.id) || n.stand === null) continue;
    const [dx, dy, rot] = SIDE[n.stand || 'n'];
    props.push({ type: 'stand', roof: n.id, x: n.x + dx * TILE, y: n.y + dy * TILE, rot });
  }
  // Stadtschmuck (seit 13.85, nach den Ständen, damit townDecoFree sie kennt)
  props.push(...townDecoProps(1, CENTER_X, CENTER_Y, VILLAGE_HALF, npcs, props, obj, ground));
  for (const mp of maps) props.push(...townDecoProps(mp.id, mp.cx, mp.cy, WORLD_MAPS.find((m) => m.id === mp.id).camp || CAMP_HALF, npcs, props, obj, ground));

  return { ground, obj, deco, zoneIdx, houses, npcs, shade, props, dungeons, maps };
}

// --- Dungeons ------------------------------------------------------------------------------
// Jeder Dungeon liegt in einem Block des Streifens: alles Fels, darin Räume, die mit drei Kacheln
// breiten Gängen verbunden sind. Der letzte Raum ist der Bossraum.
// Seit 13.7 hat jeder Dungeon seinen eigenen Grundriss (dungeonPlan): Der Block ist in 3 × 4 Felder
// geteilt, ein Weg aus 6–8 Räumen windet sich ohne Kreuzung vom Start zum Boss, dazu 1–2 Seitenräume
// als Sackgasse (Schatzkammer oder Schrein). Räume haben verschiedene Formen (Halle, Rundsaal, Kreuz,
// Säulenhalle), manche ein Becken (Wasser, Lava oder Eis je Dungeon).
const DG_GRID = { cols: 3, rows: 4, cw: 18, ch: 17 };
const DG_SHAPES = ['hall', 'round', 'cross', 'pillars', 'hall', 'round'];
// Endboss-Arena: kleiner Vorraum, dann eine große Halle (fast der ganze Block)
const RAID_ROOMS = [[3, 32, 8, 8], [16, 5, 38, 63]];
// Höllenthron (seit 13.0): Start unten links, dann vier Räume im Bogen (Steine, Wächter, Steine, Wächter),
// oben die runde Thronhalle Abaddors
const INSTANZ_ROOMS = [[2, 61, 10, 8], [17, 57, 15, 12], [38, 55, 15, 14], [38, 33, 15, 14], [14, 32, 16, 15], [6, 1, 44, 28]];

// Brücken aufräumen (seit 13.2): Eine Brücke bleibt nur, wo der Weg wirklich ein Gewässer quert, also quer zum
// Weg auf beiden Seiten Wasser liegt. Sie wird dann zu einem sauberen Rechteck über die ganze Wegbreite, mit
// Wasser darunter und gleich daneben (der Bach läuft sichtbar unten durch). Streift der Weg nur den Rand eines
// Teichs oder quert eine Pfütze, wird dort trockener Weg daraus.
function tidyBridges(ground, deco, obj) {
  const seen = new Uint8Array(ground.length);
  const isB = (i) => deco[i] === DECO.BRIDGE;
  const wayAt = (i) => isB(i) || ground[i] === GROUND.PATH;
  for (let i0 = 0; i0 < ground.length; i0++) {
    if (!isB(i0) || seen[i0]) continue;
    const comp = [];
    const stack = [i0];
    seen[i0] = 1;
    while (stack.length) {
      const i = stack.pop();
      comp.push(i);
      for (const j of [i - 1, i + 1, i - MAP_W, i + MAP_W]) {
        if (j >= 0 && j < ground.length && !seen[j] && isB(j)) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    // Richtung des Wegs: Wo schließt trockener Weg an, längs oder quer?
    let px = 0;
    let py = 0;
    for (const i of comp) {
      if (ground[i - 1] === GROUND.PATH && !isB(i - 1)) px++;
      if (ground[i + 1] === GROUND.PATH && !isB(i + 1)) px++;
      if (ground[i - MAP_W] === GROUND.PATH && !isB(i - MAP_W)) py++;
      if (ground[i + MAP_W] === GROUND.PATH && !isB(i + MAP_W)) py++;
    }
    const vert = py > px;
    // Längs (a) und quer (c) zum Weg
    const at = (a, c) => (vert ? a * MAP_W + c : c * MAP_W + a);
    let a0 = Infinity;
    let a1 = -Infinity;
    let c0 = Infinity;
    let c1 = -Infinity;
    for (const i of comp) {
      const x = i % MAP_W;
      const y = (i - x) / MAP_W;
      const a = vert ? y : x;
      const c = vert ? x : y;
      a0 = Math.min(a0, a); a1 = Math.max(a1, a); c0 = Math.min(c0, c); c1 = Math.max(c1, c);
    }
    // die ganze Wegbreite (2 Kacheln) überspannen
    const mid = Math.round((a0 + a1) / 2);
    while (c1 - c0 < 1 && wayAt(at(mid, c0 - 1))) c0--;
    while (c1 - c0 < 1 && wayAt(at(mid, c1 + 1))) c1++;
    const wet = (i) => LIQUID.has(ground[i]) && !isB(i);
    const rows = [];
    for (let a = a0; a <= a1; a++) {
      const left = wet(at(a, c0 - 1)) || wet(at(a, c0 - 2));
      const right = wet(at(a, c1 + 1)) || wet(at(a, c1 + 2));
      if (left && right) rows.push(a);
    }
    // die häufigste Flüssigkeit unter der Brücke
    const count = {};
    let liquid = GROUND.WATER;
    let best = 0;
    for (const i of comp) {
      const g = ground[i];
      if (!LIQUID.has(g)) continue;
      count[g] = (count[g] || 0) + 1;
      if (count[g] > best) { best = count[g]; liquid = g; }
    }
    for (const i of comp) {
      deco[i] = DECO.NONE;
      ground[i] = GROUND.PATH;
    }
    if (rows.length < 2 || rows.length < (a1 - a0 + 1) * 0.5) continue;
    const r0 = rows[0];
    const r1 = rows[rows.length - 1];
    for (let a = r0; a <= r1; a++) {
      for (let c = c0; c <= c1; c++) {
        const i = at(a, c);
        ground[i] = liquid;
        deco[i] = DECO.BRIDGE;
        obj[i] = OBJ.NONE;
      }
      // gleich neben der Brücke Wasser, damit der Bach durchgehend ist
      for (const c of [c0 - 1, c1 + 1]) {
        const i = at(a, c);
        if (LIQUID.has(ground[i])) continue;
        ground[i] = liquid;
        deco[i] = DECO.NONE;
        obj[i] = OBJ.NONE;
      }
    }
  }
}

// Zahl aus einem Text (Startwert für den Grundriss eines Dungeons)
function hashText(t) {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Grundriss eines Dungeons (seit 13.7): Felder des Wegs vom Start zum Boss und Seitenräume.
// Gesucht wird ein Weg mit genug Kurven, damit es nicht immer „zweimal rechts, zweimal runter“ ist.
function dungeonPlan(rng) {
  const { cols, rows } = DG_GRID;
  const key = (c, r) => r * cols + c;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let best = null;
  for (let tries = 0; tries < 400 && !best; tries++) {
    const want = 6 + Math.floor(rng() * 3);
    const c0 = Math.floor(rng() * cols);
    const r0 = Math.floor(rng() * rows);
    const path = [[c0, r0]];
    const used = new Set([key(c0, r0)]);
    while (path.length < want) {
      const [c, r] = path[path.length - 1];
      const next = dirs.map(([dc, dr]) => [c + dc, r + dr]).filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !used.has(key(x, y)));
      if (!next.length) break;
      const n = next[Math.floor(rng() * next.length)];
      path.push(n);
      used.add(key(n[0], n[1]));
    }
    if (path.length < want) continue;
    let turns = 0;
    for (let k = 2; k < path.length; k++) {
      const a = [path[k - 1][0] - path[k - 2][0], path[k - 1][1] - path[k - 2][1]];
      const b = [path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]];
      if (a[0] !== b[0] || a[1] !== b[1]) turns++;
    }
    const [sc, sr] = path[0];
    const [bc, br] = path[path.length - 1];
    if (turns < 3 || Math.abs(sc - bc) + Math.abs(sr - br) < 2) continue;
    // Seitenräume: freie Nachbarfelder von Räumen in der Mitte des Wegs
    const side = [];
    const order = path.slice(1, -1).map((cell, k) => [cell, k + 1]).sort(() => rng() - 0.5);
    const nSide = 1 + (rng() < 0.6 ? 1 : 0);
    for (const [[c, r], from] of order) {
      if (side.length >= nSide) break;
      const free = dirs.map(([dc, dr]) => [c + dc, r + dr]).filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !used.has(key(x, y)));
      if (!free.length) continue;
      const f = free[Math.floor(rng() * free.length)];
      used.add(key(f[0], f[1]));
      side.push({ cell: f, from });
    }
    best = { path, side };
  }
  return best;
}

// Raum in einem Feld des Rasters: Größe und Lage gewürfelt, Form je Rolle (Start schlicht, Boss groß)
function dungeonRoom(rng, cell, role, ox, oy) {
  const { cw, ch } = DG_GRID;
  const big = role === 'boss';
  const w = big ? 15 + Math.floor(rng() * 2) : role === 'start' ? 9 + Math.floor(rng() * 2) : 10 + Math.floor(rng() * 6);
  const h = big ? 14 + Math.floor(rng() * 2) : role === 'start' ? 8 + Math.floor(rng() * 2) : 9 + Math.floor(rng() * 5);
  const rx = cell[0] * cw + 1 + Math.floor(rng() * Math.max(1, cw - 1 - w));
  const ry = cell[1] * ch + 1 + Math.floor(rng() * Math.max(1, ch - 1 - h));
  const shape = role === 'start' ? 'hall' : big ? (rng() < 0.5 ? 'round' : 'pillars') : role === 'schatz' || role === 'schrein' ? (rng() < 0.5 ? 'round' : 'cross') : DG_SHAPES[Math.floor(rng() * DG_SHAPES.length)];
  const x = ox + rx;
  const y = oy + ry;
  return { x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2), shape, role, cell };
}

// Liegt (x, y) innerhalb der Form des Raums?
function inRoomShape(r, x, y) {
  if (x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) return false;
  if (r.shape === 'round') {
    const nx = (x + 0.5 - (r.x + r.w / 2)) / (r.w / 2);
    const ny = (y + 0.5 - (r.y + r.h / 2)) / (r.h / 2);
    return nx * nx + ny * ny <= 1.08;
  }
  if (r.shape === 'cross') {
    const kx = Math.floor(r.w / 4);
    const ky = Math.floor(r.h / 4);
    const ex = x < r.x + kx || x >= r.x + r.w - kx;
    const ey = y < r.y + ky || y >= r.y + r.h - ky;
    return !(ex && ey);
  }
  return true;
}

function buildDungeons(ground, obj, zoneIdx, deco) {
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
    const B = dungeonBlock(k);
    const x0 = B.x;
    const ox = x0 + 2;
    const oy = B.y + 2;
    const carve = (x, y) => {
      if (x <= x0 || x >= x0 + DUNGEON_COL - 1 || y <= B.y || y >= B.y + B.h - 1) return;
      obj[y * MAP_W + x] = OBJ.NONE;
    };
    // Endboss-Arena behält ihren festen Plan, normale Dungeons würfeln ihren eigenen (seit 13.7); Höllenthron und
    // Lv-60-Instanzen (zwei Blöcke, seit 13.58) bekommen viele Räume als Schlange von unten zur Halle (instPlan)
    const fixed = def.raid ? RAID_ROOMS : def.instanz && !def.rows ? INSTANZ_ROOMS : null;
    let rooms;
    let side = [];
    let links = [];
    if (fixed) {
      rooms = fixed.map(([rx, ry, w, h]) => ({ x: ox + rx, y: oy + ry, w, h, cx: ox + rx + Math.floor(w / 2), cy: oy + ry + Math.floor(h / 2), shape: 'hall' }));
      links = rooms.slice(1).map((b, n) => [rooms[n], b]);
    } else if (def.rows && typeof instPlan === 'function') {
      ({ rooms, side, links } = instPlan(def, mulberry32(WORLD_SEED + hashText(def.id)), ox, oy, B.h - 4));
    } else {
      const prng = mulberry32(WORLD_SEED + hashText(def.id));
      const plan = dungeonPlan(prng);
      rooms = plan.path.map((cell, n) => dungeonRoom(prng, cell, n === 0 ? 'start' : n === plan.path.length - 1 ? 'boss' : 'mob', ox, oy));
      side = plan.side.map((sd, n) => Object.assign(dungeonRoom(prng, sd.cell, n % 2 ? 'schrein' : 'schatz', ox, oy), { from: sd.from }));
      links = rooms.slice(1).map((b, n) => [rooms[n], b]).concat(side.map((r) => [rooms[r.from], r]));
    }
    for (const r of rooms.concat(side)) {
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (inRoomShape(r, x, y)) carve(x, y);
      // unregelmäßige Ränder, damit es wie eine Höhle wirkt
      if (def.floor !== 'FLAGSTONE' && r.shape === 'hall') {
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
    if (def.raid || def.instanz) {
      const r = rooms[rooms.length - 1];
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
        const nx = (x + 0.5 - (r.x + r.w / 2)) / (r.w / 2);
        const ny = (y + 0.5 - (r.y + r.h / 2)) / (r.h / 2);
        if (nx * nx + ny * ny > 1) obj[y * MAP_W + x] = OBJ.CAVEWALL;
      }
    }
    // Gänge: feste Pläne erst waagrecht, dann senkrecht; gewürfelte als Z mit Knick zwischen den Räumen
    const lineX = (x0, x1, y) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let w = -1; w <= 1; w++) carve(x, y + w); };
    const lineY = (y0, y1, x) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let w = -1; w <= 1; w++) carve(x + w, y); };
    for (const [a, b] of links) {
      if (fixed) {
        lineX(a.cx, b.cx, a.cy);
        lineY(a.cy, b.cy, b.cx);
        continue;
      }
      if (a.cell[1] === b.cell[1]) {
        // Nachbarn in einer Reihe: waagrecht bis zur Lücke, dort hoch oder runter, weiter waagrecht
        const [L, R] = a.cx < b.cx ? [a, b] : [b, a];
        const mx = Math.round((L.x + L.w + R.x) / 2);
        const ly = L.cy + Math.round((rng() - 0.5) * (L.h - 5));
        const ry = R.cy + Math.round((rng() - 0.5) * (R.h - 5));
        lineX(L.cx, mx, ly);
        lineY(ly, ry, mx);
        lineX(mx, R.cx, ry);
      } else {
        const [T, B] = a.cy < b.cy ? [a, b] : [b, a];
        const my = Math.round((T.y + T.h + B.y) / 2);
        const tx = T.cx + Math.round((rng() - 0.5) * (T.w - 5));
        const bx = B.cx + Math.round((rng() - 0.5) * (B.w - 5));
        lineY(T.cy, my, tx);
        lineX(tx, bx, my);
        lineY(my, B.cy, bx);
      }
    }
    // Säulenhallen: Säulen im Raster, nicht vor den Gängen und nicht in der Mitte
    const pillars = [];
    for (const r of rooms.concat(side)) {
      if (r.shape !== 'pillars') continue;
      for (let y = r.y + 2; y < r.y + r.h - 2; y += 3) {
        for (let x = r.x + 2; x < r.x + r.w - 2; x += 4) {
          if (Math.abs(x - r.cx) <= 2 && Math.abs(y - r.cy) <= 2) continue;
          const i = y * MAP_W + x;
          if (obj[i] !== OBJ.NONE) continue;
          // freier Durchgang: nicht neben einer Wand am Raumrand und nicht in einer Gangflucht
          if (obj[i - 1] || obj[i + 1] || obj[i - MAP_W] || obj[i + MAP_W]) continue;
          obj[i] = OBJ.PILLAR;
          pillars.push({ x, y });
        }
      }
    }
    // Becken in manchen Kampfräumen: Lava im Basalt, sonst Wasser
    const pools = [];
    const liquid = def.floor === 'BASALT' ? GROUND.LAVA : GROUND.WATER;
    for (const r of fixed ? [] : rooms.slice(1, -1)) {
      if (r.w < 12 || r.h < 11 || r.shape === 'pillars' || rng() < 0.45) continue;
      const qx = rng() < 0.5 ? r.x + 2 : r.x + r.w - 5;
      const qy = rng() < 0.5 ? r.y + 2 : r.y + r.h - 5;
      let ok = true;
      for (let y = qy - 1; y < qy + 4 && ok; y++) for (let x = qx - 1; x < qx + 4; x++) if (obj[y * MAP_W + x] !== OBJ.NONE) { ok = false; break; }
      if (!ok) continue;
      for (let y = qy; y < qy + 3; y++) for (let x = qx; x < qx + 3; x++) {
        if ((x === qx || x === qx + 2) && (y === qy || y === qy + 2) && rng() < 0.7) continue;
        ground[y * MAP_W + x] = liquid;
      }
      pools.push({ x: qx + 1.5, y: qy + 1.5 });
    }
    // Schmuck auf dem Boden je Dungeon (Knochen, Kristalle, Pilze), selten und nicht in Gängen
    const decoKinds = { CAVE: [DECO.BONES, DECO.MUSHROOM, DECO.PEBBLE], FLAGSTONE: [DECO.BONES, DECO.PEBBLE], ICE: [DECO.CRYSTAL, DECO.DRIFT], BASALT: [DECO.CRYSTAL, DECO.BONES, DECO.CRACK] }[def.floor] || [DECO.PEBBLE];
    if (deco && !fixed) {
      for (const r of rooms.concat(side)) {
        for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
          const i = y * MAP_W + x;
          if (obj[i] || LIQUID.has(ground[i]) || Math.abs(x - r.cx) < 2 || rng() > 0.035) continue;
          deco[i] = thinDeco(decoKinds[Math.floor(rng() * decoKinds.length)], x, y);
        }
      }
    }
    // In Endboss-Hallen aus Basalt glühen Lavabecken in den Ecken (gewürfelte Dungeons haben eigene Becken)
    if (def.floor === 'BASALT' && fixed) {
      const rb = rooms[rooms.length - 1];
      for (const [px, py] of [[rb.x + 1, rb.y + 3], [rb.x + rb.w - 3, rb.y + rb.h - 3], [rb.x + 2, rb.y + rb.h - 3]]) {
        for (let y = py; y < py + 2; y++) for (let x = px; x < px + 2; x++) ground[y * MAP_W + x] = GROUND.LAVA;
      }
    }
    const tileCenter = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
    return { def, rooms, side, pillars, pools, start: tileCenter(rooms[0].cx, rooms[0].cy) };
  });
}

// Freie Kachel im Raum nahe (fx, fy) als Anteil von Breite und Höhe (in der Form, ohne Wand, Säule und Becken)
function dungeonFreeTile(r, fx, fy, obj, ground, avoid) {
  const tx = Math.floor(r.x + fx * r.w);
  const ty = Math.floor(r.y + fy * r.h);
  for (let d = 0; d < 8; d++) {
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const x = tx + dx;
      const y = ty + dy;
      const i = y * MAP_W + x;
      if (!inRoomShape(r, x, y) || obj[i] !== OBJ.NONE || LIQUID.has(ground[i])) continue;
      if (avoid && avoid.has(i)) continue;
      // nicht direkt an der Wand (sonst verschwindet der Schmuck im Fels)
      if (obj[i - 1] === OBJ.CAVEWALL && obj[i + 1] === OBJ.CAVEWALL) continue;
      if (avoid) avoid.add(i);
      return { x, y };
    }
  }
  return { x: r.cx, y: r.cy };
}

// Schmuck der gewürfelten Dungeons (seit 13.7): Feuerbecken, Säulen, Banner, Statuen, im Bossraum ein Thron,
// in der Schatzkammer Truhe und Goldhaufen, im Schrein ein leuchtender Altar. Farben aus dem Dungeon.
function dungeonProps(dg, obj, ground) {
  const def = dg.def;
  const out = [];
  const used = new Set();
  const theme = `${def.wall.top}|${def.wall.line}|${def.portal}`;
  const put = (type, r, fx, fy, extra = {}) => {
    const t = dungeonFreeTile(r, fx, fy, obj, ground, used);
    out.push({ type, roof: type === 'brazier' ? def.portal : theme, tx: t.x + 0.5, ty: t.y + 0.9, ...extra });
  };
  for (const p of dg.pillars) out.push({ type: 'dpillar', roof: theme, tx: p.x + 0.5, ty: p.y + 0.75 });
  for (const r of dg.rooms.concat(dg.side)) {
    const round = r.shape === 'round';
    if (r.role === 'boss') {
      // Thron hinten in der Mitte, Banner daneben, Feuerbecken im Kreis oder in den Ecken
      put('dthrone', r, 0.5, 0.12);
      put('dbanner', r, 0.3, 0.1);
      put('dbanner', r, 0.7, 0.1);
      put('dstatue', r, 0.15, 0.5);
      put('dstatue', r, 0.85, 0.5);
      const n = round ? 8 : 4;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.PI / n;
        put('brazier', r, 0.5 + Math.cos(a) * 0.38, 0.5 + Math.sin(a) * 0.38);
      }
      continue;
    }
    if (r.role === 'schatz') {
      put('dchest', r, 0.5, 0.3);
      put('dgold', r, 0.32, 0.4);
      put('dgold', r, 0.68, 0.42);
      put('dgold', r, 0.5, 0.6);
      put('brazier', r, 0.2, 0.8);
      put('brazier', r, 0.8, 0.8);
      continue;
    }
    if (r.role === 'schrein') {
      put('dshrine', r, 0.5, 0.45);
      for (const [fx, fy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) put('brazier', r, fx, fy);
      continue;
    }
    if (r.role === 'start') {
      put('dbanner', r, 0.5, 0.12);
      put('brazier', r, 0.15, 0.85);
      put('brazier', r, 0.85, 0.85);
      continue;
    }
    // Kampfräume: zwei Feuerbecken, im Rundsaal vier; manchmal Statuen oder ein Banner
    const spots = round ? [[0.2, 0.25], [0.8, 0.25], [0.2, 0.75], [0.8, 0.75]] : [[0.1, 0.88], [0.9, 0.88]];
    for (const [fx, fy] of spots) put('brazier', r, fx, fy);
    const h = (r.x * 7 + r.y * 13) % 3;
    if (h === 0) { put('dstatue', r, 0.12, 0.15); put('dstatue', r, 0.88, 0.15); }
    else if (h === 1) put('dbanner', r, 0.5, 0.08);
  }
  return out;
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
    const safeZi = ZONES.findIndex((z) => z.map === wm.id && z.safe);
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
        // Stadt größer als ihr ursprünglicher Plan (Map 2 seit 13.14): drinnen nur Platz, aber die Zufallszahlen werden
        // wie früher verbraucht, damit Bäume, Felsen und Schmuck aller übrigen Maps genau gleich bleiben
        const cityHalf = Math.max(Math.abs(x + 0.5 - wm.cx), Math.abs(y + 0.5 - wm.cy));
        if (wm.genCamp && cityHalf < camp + 0.5) {
          if (d >= wm.genCamp + 5) {
            const v0 = shape(x, y) * 0.65 + detail(x, y) * 0.35;
            if (!(zone.water && v0 < zone.water)) {
              const cl = v0 > 0.55 ? 1.8 : 0.5;
              const r0 = rng();
              const a0 = zone.trees * cl + zone.rocks;
              if (r0 >= a0 && r0 < a0 + DECO_RATE) rng();
            }
          }
          zoneIdx[i] = safeZi;
          ground[i] = cityHalf < camp - 1 ? GROUND.PLAZA : GROUND[ZONES[safeZi].ground];
          continue;
        }
        if (d < (wm.genCamp || camp) + 5) continue;
        const v = shape(x, y) * 0.65 + detail(x, y) * 0.35;
        if (zone.water && v < zone.water) {
          ground[i] = GROUND[zone.liquid || 'WATER'];
          continue;
        }
        const cluster = v > 0.55 ? 1.8 : 0.5;
        const r = rng();
        if (r < zone.trees * cluster) obj[i] = OBJ[zone.treeObj];
        else if (r < zone.trees * cluster + zone.rocks) { if (!thinDrop(x, y) && !clutterDrop(x, y, wm.id)) obj[i] = OBJ.ROCK; }
        else if (r < zone.trees * cluster + zone.rocks + DECO_RATE) deco[i] = thinDeco(zoneDeco(zone, rng()), x, y, wm.id);
        else if (r > 0.86) deco[i] = ground[i] === GROUND.SAND || ground[i] === GROUND.ASH ? DECO.PEBBLE : ground[i] === GROUND.BASALT || ground[i] === GROUND.KRISTALL ? DECO.CRACK : DECO.TUFT;
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
          else {
            deco[i] = DECO.NONE;
            if (ground[i] !== GROUND.PLAZA) ground[i] = GROUND.PATH;
          }
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
    // seit 13.63: vor der vergrößerten Mauer bleiben 3 Kacheln frei (keine Bäume, Felsen oder Gewässer direkt davor)
    if (wm.genCamp) {
      for (let y = wm.cy - camp - 3; y <= wm.cy + camp + 3; y++) {
        for (let x = wm.cx - camp - 3; x <= wm.cx + camp + 3; x++) {
          if (Math.max(Math.abs(x - wm.cx), Math.abs(y - wm.cy)) <= camp) continue;
          const i = y * MAP_W + x;
          obj[i] = OBJ.NONE;
          if (deco[i] === DECO.BRIDGE) {
            ground[i] = GROUND.PATH;
            deco[i] = DECO.NONE;
          } else if (LIQUID.has(ground[i])) ground[i] = GROUND[ZONES[zoneIdx[i]].ground];
          if (SOLID_DECO_KINDS.has(deco[i])) deco[i] = DECO.NONE;
        }
      }
    }
    // Häuser der Stadt in den vier Ecken des Platzes (kleine Lager haben keine)
    // Plan der Städte für eine Mauer von 11, der Lager für 7; scale streckt ihn auf die echte Mauer (seit 10.6)
    // seit 13.63 nach dem Plan (genCamp): Stände, Tor und Häuser bleiben, wo sie waren, nur die Mauer rückt nach außen
    const plan = wm.genCamp || camp;
    const scale = plan < CAMP_HALF ? plan / 7 : CAMP_HALF / 11;
    // Städte: zwei Häuser oben (seit 12.2; die beiden unteren verdeckten die Stände am Rand)
    const houses = (plan < CAMP_HALF ? [] : [[-9, -9, 5, 3], [5, -9, 5, 3]]).map(([hx, hy, w, h], k) => ({ x: Math.floor(wm.cx + hx * scale), y: Math.floor(wm.cy + hy * scale), w, h, roof: wm.id === 2 ? ['#b0763a', '#8a4a2a', '#c8a060', '#7a5a3a'][k] : wm.id === 10 ? ['#4a3a8a', '#2e4a7a', '#5a4a9a', '#3a3a6a'][k] : ['#4a4644', '#5a3a2e', '#3a3a4a', '#6a4a3a'][k] }));
    for (const h of houses) for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) obj[y * MAP_W + x] = OBJ.HOUSE;
    out.push({ id: wm.id, cx: wm.cx, cy: wm.cy, houses, small: plan < CAMP_HALF, scale, spawn: { x: wm.cx * TILE, y: (wm.cy + 1.5 * scale) * TILE } });
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
  if (LIQUID.has(game.world.ground[i]) && game.world.deco[i] !== DECO.BRIDGE) return true;
  const o = game.world.obj[i];
  // seit 13.85: Felsbrocken (kniehoch) halten nicht mehr auf – nur der Felsrand der Maps bleibt fest
  if (o === OBJ.ROCK) return rockSolid(tx, ty);
  return o !== OBJ.NONE;
}
// Fester Fels (seit 13.85): der Felsrand jeder Map (MAP_BORDER) und alles außerhalb der Maps
function rockSolid(tx, ty) {
  const wm = mapOfTile(tx, ty);
  if (!wm) return true;
  const [rx, ry, rw, rh] = wm.region;
  return tx < rx + MAP_BORDER || ty < ry + MAP_BORDER || tx >= rx + rw - MAP_BORDER || ty >= ry + rh - MAP_BORDER;
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

// Feste Hindernisse ohne eigene Kachel (seit 13.14): Seelensteine und Portale (Weltentor, Dungeon-Eingang, Riss,
// Ausgang). Rund um ihre Mitte; man kommt nur nicht näher heran, weg geht immer (niemand bleibt stecken).
// Bis 13.84 hielten auch Äste, Baumstümpfe, Stämme und Kristalle auf ({ STUMP: 9, LOG: 12, DEADTREE: 9, CRYSTAL: 10 });
// seit 13.85 ist kleiner und mittlerer Bodenschmuck begehbar, nur Häuser, Mauern, Bäume, Felsrand, Seelensteine und
// Portale halten auf. Die Tabelle bleibt (leer), damit Aufrufer wie die Wegsuche der Monster unverändert gehen.
const SOLID_DECO_R = {};
const PORTAL_R = { weltentor: 22, eingang: 26, riss: 22, ausgang: 20 };
const solidCache = { at: -1, world: null, grid: new Map() };
const SOLID_CELL = 128;
function solidObstacles() {
  const w = game.world;
  if (solidCache.world === w && game.time - solidCache.at < 0.25 && game.time >= solidCache.at) return solidCache.grid;
  const list = [];
  for (const m of game.monsters) if (m.isStone && !m.dead) list.push({ x: m.x, y: m.y, R: Math.max(20, (m.r || 18) + 2), ref: m });
  for (const n of w.npcs) {
    const R = PORTAL_R[n.id];
    if (!R) continue;
    const d = n.id === 'eingang' && w.dungeons && w.dungeons[n.dungeon] ? w.dungeons[n.dungeon].def : null;
    list.push({ x: n.x, y: n.id === 'eingang' ? n.y + 0.4 * TILE : n.y, R: d && d.instanz ? 46 : d && (d.raid || d.inst60) ? 34 : R, ref: n });
  }
  // in ein Raster einsortiert, damit jede Bewegung nur die Hindernisse in ihrer Nähe prüft
  const grid = new Map();
  for (const o of list) {
    const k = Math.floor(o.x / SOLID_CELL) + ',' + Math.floor(o.y / SOLID_CELL);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(o);
  }
  solidCache.at = game.time;
  solidCache.world = w;
  solidCache.grid = grid;
  return grid;
}
// Stößt e an der neuen Stelle (nx, ny) an ein festes Hindernis, dem es sich dabei nähert?
function solidBump(e, nx, ny, r) {
  const w = game.world;
  const hit = (cx, cy, R) => {
    const dn = Math.hypot(nx - cx, ny - cy);
    return dn < R + r && dn < Math.hypot(e.x - cx, e.y - cy) - 0.01;
  };
  const tx0 = Math.floor((nx - r - 16) / TILE);
  const tx1 = Math.floor((nx + r + 16) / TILE);
  const ty0 = Math.floor((ny - r - 16) / TILE);
  const ty1 = Math.floor((ny + r + 16) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
      const R = SOLID_DECO_R[w.deco[ty * MAP_W + tx]];
      if (!R) continue;
      // gleiche Verschiebung wie beim Zeichnen in 3D (drei-welt.js)
      const h = tileHash(tx, ty);
      const jx = ((h >> 5) % 5 - 2) * 0.15;
      const jz = ((h >> 9) % 5 - 2) * 0.15;
      if (hit((tx + 0.5 + jx) * TILE, (ty + 0.5 + jz) * TILE, R)) return true;
    }
  }
  const grid = solidObstacles();
  const cx = Math.floor(nx / SOLID_CELL);
  const cy = Math.floor(ny / SOLID_CELL);
  for (let gy = cy - 1; gy <= cy + 1; gy++) {
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      const cell = grid.get(gx + ',' + gy);
      if (!cell) continue;
      for (const o of cell) {
        if (o.ref === e || Math.abs(o.x - nx) > o.R + r || Math.abs(o.y - ny) > o.R + r) continue;
        if (hit(o.x, o.y, o.R)) return true;
      }
    }
  }
  return false;
}

// Bewegt getrennt nach x und y, damit man an Hindernissen entlanggleitet
function moveEntity(e, dx, dy, isMonster) {
  const r = e.r * 0.7;
  let moved = false;
  if (dx && canStand(e.x + dx, e.y, r, isMonster) && !solidBump(e, e.x + dx, e.y, r)) { e.x += dx; moved = true; }
  if (dy && canStand(e.x, e.y + dy, r, isMonster) && !solidBump(e, e.x, e.y + dy, r)) { e.y += dy; moved = true; }
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
