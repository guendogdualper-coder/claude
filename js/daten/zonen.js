// Die Welt besteht aus Ringen um das Dorf. Je weiter weg, desto stärker die Monster.
// minDist/maxDist   Abstand vom Dorfzentrum in Kacheln
// groups            [Monsterart, Anzahl Gruppen, von, bis] – von/bis: Bereich innerhalb des Rings,
//                   0 = innerer Rand (dorfnah), 1 = äußerer Rand
// groupSize         [min, max] Monster pro Gruppe
// stones            [Steinstufe, Anzahl, von, bis] – welche Seelensteine wo stehen (siehe STONE_TYPES)
// liquid            Art der Gewässer: WATER, BOG (Sumpf), LAVA oder ICE (zugefroren, begehbar)
// ambient           Stimmung: schwebende Teilchen (kind) und eine leichte Färbung des Bildes (tint, RGBA)
const ZONES = [
  {
    id: 'dorf', name: 'Dorf Hayan', levels: 'Sicherer Ort', minDist: 0, maxDist: 15, safe: true,
    ground: 'GRASS'
  },
  {
    id: 'wiesen', name: 'Sonnenwiesen', levels: 'Stufe 1–9', minLevel: 1, minDist: 15, maxDist: 36,
    ground: 'GRASS', alt: 'MEADOW', trees: 0.02, treeObj: 'TREE', rocks: 0.008, water: 0.22, liquid: 'WATER',
    groups: [['hund', 11, 0, 0.4], ['wolf', 10, 0.3, 0.8], ['alphawolf', 6, 0.6, 1], ['wildschwein', 6, 0.7, 1]], groupSize: [3, 5],
    stones: [[5, 3, 0.2, 0.7], [10, 2, 0.65, 1]],
    ambient: { kind: 'pollen' }
  },
  {
    id: 'wald', name: 'Dunkelwald', levels: 'Stufe 10–19', minLevel: 10, minDist: 36, maxDist: 50,
    ground: 'FOREST', trees: 0.1, treeObj: 'PINE', rocks: 0.012, water: 0.2, liquid: 'WATER',
    groups: [['bandit', 8, 0, 0.6], ['banditschuetze', 6, 0.2, 0.8], ['waldspinne', 8, 0.35, 1], ['braunbaer', 6, 0.6, 1]], groupSize: [3, 4],
    stones: [[15, 3, 0, 0.6], [20, 2, 0.5, 1]],
    ambient: { kind: 'fireflies', tint: [10, 30, 20, 0.12] }
  },
  {
    id: 'orktal', name: 'Orktal', levels: 'Stufe 20–29', minLevel: 20, minDist: 50, maxDist: 62,
    ground: 'SAND', trees: 0.015, treeObj: 'DEADTREE', rocks: 0.06, water: 0.12, liquid: 'WATER',
    groups: [['ork', 9, 0, 0.6], ['orkschamane', 7, 0.3, 0.9], ['skorpion', 8, 0.2, 1], ['orkhauptmann', 5, 0.65, 1]], groupSize: [3, 5],
    stones: [[25, 3, 0, 0.6], [30, 2, 0.55, 1]],
    ambient: { kind: 'dust', tint: [80, 50, 10, 0.08] }
  },
  {
    id: 'oedland', name: 'Ödland', levels: 'Stufe 30–39', minLevel: 30, minDist: 62, maxDist: 74,
    ground: 'ASH', trees: 0.018, treeObj: 'DEADTREE', rocks: 0.07, water: 0.1, liquid: 'BOG',
    groups: [['oger', 9, 0, 0.6], ['daemon', 10, 0.3, 1], ['hoellenhund', 9, 0.5, 1]], groupSize: [2, 4],
    stones: [[35, 3, 0, 0.6], [40, 2, 0.55, 1]],
    ambient: { kind: 'ash', tint: [40, 20, 20, 0.12] }
  },
  {
    id: 'frost', name: 'Frostgipfel', levels: 'Stufe 40–49', minLevel: 40, minDist: 74, maxDist: 85,
    ground: 'SNOW', trees: 0.05, treeObj: 'PINE', rocks: 0.04, water: 0.16, liquid: 'ICE',
    groups: [['eiswolf', 11, 0, 0.7], ['yeti', 9, 0.3, 1], ['frostgeist', 9, 0.45, 1]], groupSize: [2, 4],
    stones: [[45, 3, 0, 0.6], [50, 2, 0.55, 1]],
    ambient: { kind: 'snow', tint: [120, 160, 220, 0.1] }
  },
  {
    id: 'moor', name: 'Totenmoor', levels: 'Stufe 50–59', minLevel: 50, minDist: 85, maxDist: 96,
    ground: 'SWAMP', trees: 0.04, treeObj: 'DEADTREE', rocks: 0.02, water: 0.28, liquid: 'BOG',
    groups: [['untoter', 11, 0, 0.7], ['sumpfhexe', 9, 0.3, 1], ['ghul', 10, 0.45, 1]], groupSize: [2, 4],
    stones: [[55, 3, 0, 0.6], [60, 2, 0.55, 1]],
    ambient: { kind: 'wisps', tint: [20, 50, 30, 0.16] }
  },
  {
    id: 'vulkan', name: 'Feuerberg', levels: 'Stufe 60–70', minLevel: 60, minDist: 96, maxDist: 999,
    ground: 'BASALT', trees: 0.01, treeObj: 'DEADTREE', rocks: 0.08, water: 0.2, liquid: 'LAVA',
    groups: [['lavagolem', 10, 0, 0.6], ['feuerdaemon', 11, 0.2, 1], ['feuerdrache', 8, 0.4, 1]], groupSize: [2, 4],
    stones: [[65, 4, 0, 0.6], [70, 3, 0.4, 1]],
    ambient: { kind: 'embers', tint: [120, 30, 0, 0.12] }
  }
];

// Ringe um das Dorf; danach folgen in ZONES die Dungeons
const RING_ZONES = ZONES.length;

// Dungeons: abgeschlossene Höhlen und Festungen in einem eigenen Streifen östlich der Welt.
// Man betritt sie über einen Eingang in ihrem Gebiet. Drei Räume mit Monstern, am Ende ein Boss.
// entry   Lage des Eingangs: Richtung des Weges vom Dorf, Abstand vom Dorf, Versatz neben dem Weg
// floor   Boden; wall: Farben der Wände (Oberseite, Vorderseite, Fugen bzw. Glut)
// mobs    Monsterarten in den Räumen; boss: Bossart (siehe MONSTER_TYPES)
// stones  Stufen der beiden Seelensteine im Dungeon (kommen schneller wieder als draußen)
const DUNGEONS = [
  {
    id: 'spinnenhoehle', name: 'Spinnenhöhle', minLevel: 18, entry: { dir: [0, -1], dist: 43, side: 4 }, floor: 'CAVE',
    wall: { top: '#1c1520', face: '#0c080e', line: '#4a3a52' }, portal: '#b48cff',
    mobs: ['hoehlenspinne', 'giftspinne'], boss: 'spinnenkoenigin', stones: [20, 20],
    ambient: { kind: 'wisps', tint: [30, 10, 50, 0.32] }
  },
  {
    id: 'orkfestung', name: 'Orkfestung', minLevel: 28, entry: { dir: [-1, 0], dist: 56, side: 4 }, floor: 'FLAGSTONE',
    wall: { top: '#3c3832', face: '#1e1b18', line: '#55504a' }, portal: '#ff8a4a',
    mobs: ['orkelite', 'orkberserker'], boss: 'kriegsherr', stones: [30, 30],
    ambient: { kind: 'dust', tint: [50, 25, 5, 0.28] }
  },
  {
    id: 'eisgrotte', name: 'Eisgrotte', minLevel: 45, entry: { dir: [0, 1], dist: 79, side: 4 }, floor: 'ICE',
    wall: { top: '#f4fbff', face: '#4a7aa8', line: '#b8d8f0' }, portal: '#9fe8ff',
    mobs: ['eisgolem', 'frostgeist'], boss: 'eiskoenig', stones: [45, 50],
    ambient: { kind: 'snow', tint: [40, 80, 150, 0.3] }
  },
  {
    id: 'drachenhort', name: 'Drachenhort', minLevel: 63, entry: { dir: [1, 0], dist: 97, side: -4 }, floor: 'BASALT',
    wall: { top: '#1a1210', face: '#080404', line: '#ff6a2a' }, portal: '#ff6a3a',
    mobs: ['drachenbrut', 'feuerdaemon'], boss: 'urdrache', stones: [65, 70],
    ambient: { kind: 'embers', tint: [90, 20, 0, 0.3] }
  }
];
for (const d of DUNGEONS) {
  ZONES.push({ id: d.id, name: d.name, levels: `Dungeon · ab Stufe ${d.minLevel}`, minLevel: d.minLevel, dungeon: d, ground: d.floor, ambient: d.ambient });
}

// --- Weitere Maps ---------------------------------------------------------------------------
// Map 2 und Map 3 liegen in eigenen Bereichen der Karte (unter der Oberwelt) und sind nur über
// das Weltentor in Hayan erreichbar. In der Mitte jeder Map steht ein sicheres Lager mit
// Weltentor, darum liegen die Gebiete als Ringe (minDist/maxDist wie oben, ab der Mitte der Map).
// region: [x, y, Breite, Höhe] in Kacheln
const WORLD_MAPS = [
  { id: 1, name: 'Hayan', levels: 'Stufe 1–70', minLevel: 1, text: 'Das Dorf Hayan und alle Gebiete drumherum.' },
  { id: 2, name: 'Schlangental', levels: 'Stufe 30–50', minLevel: 30, region: [0, 200, 130, 132], text: 'Eine heiße Wüste voller Schlangen, dahinter der Dschungel der Nagas.' },
  { id: 3, name: 'Donnerklamm', levels: 'Stufe 50–75', minLevel: 50, region: [130, 200, 130, 132], text: 'Eine tiefe Felsschlucht mit Trollen und Minotauren, oben der Kamm der Titanen.' }
];
const MAP_ZONES = [
  { id: 'oasenlager', map: 2, name: 'Oasenlager', levels: 'Sicherer Ort', minDist: 0, maxDist: 8, safe: true, ground: 'SAND' },
  {
    id: 'sandwueste', map: 2, name: 'Sandschlangenwüste', levels: 'Stufe 30–39', minLevel: 30, minDist: 8, maxDist: 36,
    ground: 'SAND', trees: 0.012, treeObj: 'DEADTREE', rocks: 0.04, water: 0.1, liquid: 'WATER',
    groups: [['sandviper', 9, 0, 0.6], ['klapperschlange', 8, 0.3, 1], ['kobra', 7, 0.55, 1]], groupSize: [3, 5],
    stones: [[30, 3, 0, 0.6], [35, 3, 0.4, 1]],
    ambient: { kind: 'dust', tint: [90, 60, 10, 0.08] }
  },
  {
    id: 'nagadschungel', map: 2, name: 'Nagadschungel', levels: 'Stufe 40–50', minLevel: 40, minDist: 36, maxDist: 999,
    ground: 'FOREST', alt: 'SWAMP', trees: 0.07, treeObj: 'TREE', rocks: 0.01, water: 0.22, liquid: 'BOG',
    groups: [['riesenpython', 9, 0, 0.6], ['naga', 9, 0.3, 1], ['nagapriesterin', 7, 0.5, 1]], groupSize: [2, 4],
    stones: [[40, 3, 0, 0.6], [45, 3, 0.4, 1], [50, 2, 0.7, 1]],
    ambient: { kind: 'fireflies', tint: [10, 40, 20, 0.14] }
  },
  { id: 'klammwacht', map: 3, name: 'Klammwacht', levels: 'Sicherer Ort', minDist: 0, maxDist: 8, safe: true, ground: 'ASH' },
  {
    id: 'donnerklamm', map: 3, name: 'Donnerklamm', levels: 'Stufe 50–61', minLevel: 50, minDist: 8, maxDist: 36,
    ground: 'ASH', trees: 0.008, treeObj: 'DEADTREE', rocks: 0.09, water: 0.08, liquid: 'WATER',
    groups: [['trollkrieger', 10, 0, 0.6], ['harpyie', 8, 0.3, 1], ['minotaurus', 8, 0.5, 1]], groupSize: [2, 4],
    stones: [[55, 3, 0, 0.6], [60, 3, 0.4, 1]],
    ambient: { kind: 'dust', tint: [60, 40, 30, 0.1] }
  },
  {
    id: 'titanenkamm', map: 3, name: 'Titanenkamm', levels: 'Stufe 62–75', minLevel: 62, minDist: 36, maxDist: 999,
    ground: 'BASALT', trees: 0.006, treeObj: 'DEADTREE', rocks: 0.08, water: 0.14, liquid: 'LAVA',
    groups: [['steintitan', 9, 0, 0.6], ['gargoyle', 9, 0.3, 1], ['donnerriese', 7, 0.5, 1]], groupSize: [2, 4],
    stones: [[65, 3, 0, 0.6], [70, 3, 0.4, 1]],
    ambient: { kind: 'embers', tint: [80, 30, 10, 0.12] }
  }
];
for (const wm of WORLD_MAPS) {
  if (!wm.region) continue;
  const [x, y, w, h] = wm.region;
  wm.cx = x + w / 2;
  wm.cy = y + h / 2;
}
for (const z of MAP_ZONES) {
  const wm = WORLD_MAPS.find((m) => m.id === z.map);
  ZONES.push({ ...z, cx: wm.cx, cy: wm.cy });
}

// Waren der Händlerin im Dorf: die beiden Tränke
const SHOP = [
  { id: 'hp', name: 'Drachenblut', plural: 'Drachenblut-Tränke', kind: 'Lebenstrank', color: '#ff9a8a', text: 'Lebenstrank: Stellt 35 % Leben wieder her. Taste Q.', price: 15 },
  { id: 'mp', name: 'Mondtau', plural: 'Mondtau-Tränke', kind: 'Manatrank', color: '#9ac0ff', text: 'Manatrank: Stellt 40 % Mana wieder her. Taste E.', price: 20 }
];
const potionInfo = (kind) => SHOP.find((x) => x.id === kind);

// Trankgrößen: S bis XXL. Je größer, desto mehr Leben bzw. Mana und desto teurer;
// die Händlerin verkauft sie ab einer Stufe. Im Gepäck: p.potions.hp (S), hpM, hpL, hpXL, hpXXL, ebenso mp.
const POTION_SIZES = [
  { id: 'S', name: 'klein', heal: 0.35, mana: 0.4, price: 1, level: 1 },
  { id: 'M', name: 'mittel', heal: 0.5, mana: 0.55, price: 5, level: 10 },
  { id: 'L', name: 'groß', heal: 0.65, mana: 0.7, price: 20, level: 25 },
  { id: 'XL', name: 'sehr groß', heal: 0.8, mana: 0.85, price: 80, level: 40 },
  { id: 'XXL', name: 'riesig', heal: 1, mana: 1, price: 320, level: 55 }
];
const potKey = (kind, size) => (size === 'S' ? kind : kind + size);
const potionTotal = (p, kind) => POTION_SIZES.reduce((n, sz) => n + (p.potions[potKey(kind, sz.id)] || 0), 0);
// Größe passend zur Stufe (für Beute): bis 15 S, bis 31 M, bis 47 L, bis 63 XL, darüber XXL
const potionSizeFor = (level) => POTION_SIZES[Math.min(POTION_SIZES.length - 1, Math.floor(level / 16))];
