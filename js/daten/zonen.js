// Seit Version 6.2 ist jedes Gebiet eine eigene Map (WORLD_MAPS), erreichbar nur über das Weltentor im
// Lager der Map. Map 1 ist Vlotho mit den Sonnenwiesen; jede andere Map hat in der Mitte ein kleines Lager.
// map               Map, zu der das Gebiet gehört
// minDist/maxDist   Abstand von der Mitte der Map in Kacheln
// groups            [Monsterart, Anzahl Gruppen, von, bis] – von/bis: Bereich innerhalb des Rings,
//                   0 = innerer Rand (dorfnah), 1 = äußerer Rand
// groupSize         [min, max] Monster pro Gruppe
// stones            [Steinstufe, Anzahl, von, bis] – welche Seelensteine wo stehen (siehe STONE_TYPES)
// liquid            Art der Gewässer: WATER, BOG (Sumpf), LAVA oder ICE (zugefroren, begehbar)
// ambient           Stimmung: schwebende Teilchen (kind) und eine leichte Färbung des Bildes (tint, RGBA)
const ZONES = [
  {
    id: 'dorf', map: 1, name: 'Vlotho', levels: 'Sicherer Ort', minDist: 0, maxDist: 15, safe: true,
    ground: 'GRASS'
  },
  {
    id: 'wiesen', map: 1, name: 'Sonnenwiesen', levels: 'Stufe 1–9', minLevel: 1, minDist: 15, maxDist: 999,
    ground: 'GRASS', alt: 'MEADOW', trees: 0.006, treeObj: 'TREE', rocks: 0.0024, water: 0.22, liquid: 'WATER',
    groups: [['hund', 11, 0, 0.4], ['wolf', 10, 0.3, 0.8], ['alphawolf', 6, 0.6, 1], ['wildschwein', 6, 0.7, 1], ['fuchs', 6, 0, 0.5], ['hirsch', 5, 0.45, 1]], groupSize: [3, 5],
    stones: [[5, 3, 0.2, 0.7], [10, 2, 0.65, 1]],
    ambient: { kind: 'pollen' }
  },
  {
    id: 'wald', map: 4, name: 'Dunkelwald', levels: 'Stufe 10–19', minLevel: 10, minDist: 8, maxDist: 999,
    ground: 'FOREST', trees: 0.03, treeObj: 'PINE', rocks: 0.0036, water: 0.2, liquid: 'WATER',
    groups: [['bandit', 10, 0, 0.6], ['banditschuetze', 8, 0.2, 0.8], ['waldspinne', 10, 0.35, 1], ['braunbaer', 8, 0.6, 1], ['dornenkeiler', 6, 0.2, 0.7], ['luchs', 6, 0.5, 1]], groupSize: [3, 4],
    stones: [[15, 4, 0, 0.6], [20, 3, 0.5, 1]],
    ambient: { kind: 'fireflies', tint: [10, 42, 20, 0.12] }
  },
  {
    id: 'orktal', map: 5, name: 'Orktal', levels: 'Stufe 20–29', minLevel: 20, minDist: 8, maxDist: 999,
    ground: 'SAND', trees: 0.0045, treeObj: 'DEADTREE', rocks: 0.018, water: 0.12, liquid: 'WATER',
    groups: [['ork', 12, 0, 0.6], ['orkschamane', 9, 0.3, 0.9], ['skorpion', 10, 0.2, 1], ['orkhauptmann', 6, 0.65, 1], ['hyaene', 7, 0.1, 0.8]], groupSize: [3, 5],
    stones: [[25, 4, 0, 0.6], [30, 3, 0.55, 1]],
    ambient: { kind: 'dust', tint: [80, 70, 10, 0.08] }
  },
  {
    id: 'oedland', map: 6, name: 'Ödland', levels: 'Stufe 30–39', minLevel: 30, minDist: 8, maxDist: 999,
    ground: 'ASH', trees: 0.0054, treeObj: 'DEADTREE', rocks: 0.021, water: 0.1, liquid: 'BOG',
    groups: [['oger', 12, 0, 0.6], ['daemon', 13, 0.3, 1], ['hoellenhund', 12, 0.5, 1], ['warg', 8, 0.2, 0.9]], groupSize: [2, 4],
    stones: [[35, 4, 0, 0.6], [40, 3, 0.55, 1]],
    ambient: { kind: 'ash', tint: [40, 28, 20, 0.12] }
  },
  {
    id: 'frost', map: 7, name: 'Frostgipfel', levels: 'Stufe 40–49', minLevel: 40, minDist: 8, maxDist: 999,
    ground: 'SNOW', trees: 0.015, treeObj: 'PINE', rocks: 0.012, water: 0.16, liquid: 'ICE',
    groups: [['eiswolf', 14, 0, 0.7], ['yeti', 12, 0.3, 1], ['frostgeist', 12, 0.45, 1], ['eisbaer', 7, 0.15, 0.8], ['mammut', 5, 0.55, 1]], groupSize: [2, 4],
    stones: [[45, 4, 0, 0.6], [50, 3, 0.55, 1]],
    ambient: { kind: 'snow', tint: [120, 224, 220, 0.1] }
  },
  {
    id: 'moor', map: 8, name: 'Totenmoor', levels: 'Stufe 50–59', minLevel: 50, minDist: 8, maxDist: 999,
    ground: 'SWAMP', trees: 0.012, treeObj: 'DEADTREE', rocks: 0.006, water: 0.28, liquid: 'BOG',
    groups: [['untoter', 14, 0, 0.7], ['sumpfhexe', 12, 0.3, 1], ['ghul', 13, 0.45, 1], ['moorwolf', 9, 0.1, 0.9]], groupSize: [2, 4],
    stones: [[55, 4, 0, 0.6], [60, 3, 0.55, 1]],
    ambient: { kind: 'wisps', tint: [20, 70, 30, 0.16] }
  },
  {
    id: 'vulkan', map: 9, name: 'Feuerberg', levels: 'Stufe 60–70', minLevel: 60, minDist: 8, maxDist: 999,
    ground: 'BASALT', trees: 0.003, treeObj: 'DEADTREE', rocks: 0.024, water: 0.2, liquid: 'LAVA',
    groups: [['lavagolem', 13, 0, 0.6], ['feuerdaemon', 14, 0.2, 1], ['feuerdrache', 10, 0.4, 1], ['glutkatze', 8, 0.15, 0.9]], groupSize: [2, 4],
    stones: [[65, 6, 0, 0.6], [70, 4, 0.4, 1]],
    ambient: { kind: 'embers', tint: [120, 42, 0, 0.12] }
  }
];

// Gebiete von Map 1 und den neuen Maps 4–9; danach folgen in ZONES die Dungeons und die Gebiete der Maps 2 und 3
const RING_ZONES = ZONES.length;

// Dungeons: abgeschlossene Höhlen und Festungen in einem eigenen Streifen östlich der Welt.
// Man betritt sie über einen Eingang in ihrem Gebiet. Drei Räume mit Monstern, am Ende ein Boss.
// entry   Lage des Eingangs: Map, Richtung des Weges vom Lager, Abstand vom Lager, Versatz neben dem Weg
// floor   Boden; wall: Farben der Wände (Oberseite, Vorderseite, Fugen bzw. Glut)
// mobs    Monsterarten in den Räumen; boss: Bossart (siehe MONSTER_TYPES)
// stones  Stufen der beiden Seelensteine im Dungeon (kommen schneller wieder als draußen)
const DUNGEONS = [
  {
    id: 'spinnenhoehle', name: 'Spinnenhöhle', minLevel: 18, entry: { map: 4, dir: [0, -1], dist: 28, side: 4 }, floor: 'CAVE',
    wall: { top: '#1c1520', face: '#0c080e', line: '#4a3a52' }, portal: '#b48cff',
    mobs: ['hoehlenspinne', 'giftspinne'], boss: 'spinnenkoenigin', stones: [20, 20],
    ambient: { kind: 'wisps', tint: [30, 10, 50, 0.13] }
  },
  {
    id: 'orkfestung', name: 'Orkfestung', minLevel: 28, entry: { map: 5, dir: [-1, 0], dist: 30, side: 4 }, floor: 'FLAGSTONE',
    wall: { top: '#3c3832', face: '#1e1b18', line: '#55504a' }, portal: '#ff8a4a',
    mobs: ['orkelite', 'orkberserker'], boss: 'kriegsherr', stones: [30, 30],
    ambient: { kind: 'dust', tint: [50, 25, 5, 0.11] }
  },
  {
    id: 'eisgrotte', name: 'Eisgrotte', minLevel: 45, entry: { map: 7, dir: [0, 1], dist: 28, side: 4 }, floor: 'ICE',
    wall: { top: '#f4fbff', face: '#4a7aa8', line: '#b8d8f0' }, portal: '#9fe8ff',
    mobs: ['eisgolem', 'frostgeist'], boss: 'eiskoenig', stones: [45, 50],
    ambient: { kind: 'snow', tint: [40, 80, 150, 0.12] }
  },
  {
    id: 'drachenhort', name: 'Drachenhort', minLevel: 63, entry: { map: 9, dir: [1, 0], dist: 30, side: -4 }, floor: 'BASALT',
    wall: { top: '#1a1210', face: '#080404', line: '#ff6a2a' }, portal: '#ff6a3a',
    mobs: ['drachenbrut', 'feuerdaemon'], boss: 'urdrache', stones: [65, 70],
    ambient: { kind: 'embers', tint: [90, 20, 0, 0.12] }
  },
  // Version 3.3: vier weitere Dungeons, zwei davon in Map 2 und Map 3 (entry.map)
  {
    id: 'banditenkeller', name: 'Banditenkeller', minLevel: 10, entry: { map: 4, dir: [1, 0], dist: 30, side: 4 }, floor: 'FLAGSTONE',
    wall: { top: '#5a4632', face: '#21180f', line: '#8a6a44' }, portal: '#ffb04a',
    mobs: ['kellerwache', 'armbrustschuetze'], boss: 'banditenfuerst', stones: [10, 15],
    ambient: { kind: 'dust', tint: [40, 25, 10, 0.1] }
  },
  {
    id: 'totengruft', name: 'Totengruft', minLevel: 38, entry: { map: 6, dir: [0, -1], dist: 28, side: -4 }, floor: 'CAVE',
    wall: { top: '#2e2a34', face: '#100e14', line: '#7a6a9a' }, portal: '#a774e0',
    mobs: ['grabwaechter', 'seelenfresser'], boss: 'gruftkoenig', stones: [40, 40],
    ambient: { kind: 'wisps', tint: [20, 10, 40, 0.14] }
  },
  {
    id: 'schlangentempel', name: 'Schlangentempel', minLevel: 44, entry: { map: 2, dir: [1, 0], dist: 70, side: 4 }, floor: 'FLAGSTONE',
    wall: { top: '#3a5a4a', face: '#142a22', line: '#c9a35a' }, portal: '#7ad8c8',
    mobs: ['naga', 'nagapriesterin'], boss: 'nagakoenigin', stones: [45, 50],
    ambient: { kind: 'fireflies', tint: [10, 40, 30, 0.12] }
  },
  {
    id: 'titanenschmiede', name: 'Titanenschmiede', minLevel: 60, entry: { map: 3, dir: [-1, 0], dist: 70, side: 4 }, floor: 'BASALT',
    wall: { top: '#3a3430', face: '#14100c', line: '#ffb04a' }, portal: '#ffb04a',
    mobs: ['steintitan', 'gargoyle'], boss: 'titanenkoenig', stones: [60, 65],
    ambient: { kind: 'embers', tint: [70, 30, 0, 0.12] }
  }
];
// Version 6.5: Endboss-Arenen, eine je Map. Ein Vorraum, dann eine große runde Halle mit dem Boss.
// Gebaut für fünf Spieler: einer hält den Boss (Tank), einer heilt, die anderen machen Schaden.
const RAID_DEFS = [
  ['fenris', 'Höhle des Urwolfs', null, 'FLAGSTONE', '#ffcc4a', { top: '#5a5048', face: '#2a241e', line: '#8a7a5a' }, 'pollen'],
  ['ursus', 'Thron des Waldtyrannen', 4, 'CAVE', '#9be07a', { top: '#2a3a24', face: '#121a10', line: '#5a7a3a' }, 'fireflies'],
  ['gorbag', 'Kriegsarena des Großkhans', 5, 'FLAGSTONE', '#ff8a4a', { top: '#5a4632', face: '#21180f', line: '#c8a03a' }, 'dust'],
  ['azaroth', 'Höllenschlund', 6, 'BASALT', '#ff4a2a', { top: '#1a1010', face: '#080404', line: '#ff4a2a' }, 'embers'],
  ['ymir', 'Halle des Frostriesen', 7, 'FLAGSTONE', '#9fe8ff', { top: '#f4fbff', face: '#4a7aa8', line: '#b8d8f0' }, 'snow'],
  ['vritra', 'Tempel der Schlangengöttin', 2, 'FLAGSTONE', '#7ad8c8', { top: '#3a5a4a', face: '#142a22', line: '#c9a35a' }, 'fireflies'],
  ['morrak', 'Gruft des Lichkönigs', 8, 'CAVE', '#8fe36a', { top: '#2e2a34', face: '#100e14', line: '#7a9a5a' }, 'wisps'],
  ['ignar', 'Hort des Weltendrachen', 9, 'BASALT', '#ff6a2a', { top: '#1a1210', face: '#080404', line: '#ff6a2a' }, 'embers'],
  ['tarkon', 'Gipfel des Donnertitans', 3, 'BASALT', '#9fd0ff', { top: '#3a3a44', face: '#14141a', line: '#9fd0ff' }, 'dust']
];
for (const [boss, name, map, floor, portal, wall, amb] of RAID_DEFS) {
  const lvl = MONSTER_TYPES[boss].level;
  DUNGEONS.push({
    id: 'raid_' + boss, name, minLevel: Math.max(1, lvl - 6), raid: true, floor, wall, portal, mobs: [], boss, stones: [],
    entry: map ? { map, dir: [0, 1], dist: 16, side: 6 } : { dir: [0, 1], dist: 24, side: 6 },
    ambient: { kind: amb, tint: [40, 20, 20, 0.08] }
  });
}
for (const d of DUNGEONS) {
  ZONES.push({ id: d.id, name: d.name, levels: `Dungeon · ab Stufe ${d.minLevel}`, minLevel: d.minLevel, dungeon: d, ground: d.floor, ambient: d.ambient });
}

// --- Maps ---------------------------------------------------------------------------------
// Jedes Gebiet ist eine eigene Map, nicht zu Fuß erreichbar, nur über das Weltentor im Lager (bzw. in
// der Stadt). In der Mitte jeder Map liegt ein sicherer Ort; die Gebiete liegen als Ringe darum
// (minDist/maxDist ab der Mitte): nah am Lager schwächere Monster, nach außen stärkere.
// region: [x, y, Breite, Höhe] in Kacheln; camp: halbe Breite des sicheren Platzes (Standard CAMP_HALF)
// portals: Weltportale draußen (seit Version 6.2 keine mehr – nur noch das Weltentor)
const WORLD_MAPS = [
  { id: 1, name: 'Vlotho', levels: 'Stufe 1–9', minLevel: 1, region: [0, 90, 300, 120], text: 'Die große Stadt Vlotho mit den grünen Sonnenwiesen.', portals: [] },
  { id: 4, name: 'Dunkelwald', levels: 'Stufe 10–19', minLevel: 10, region: [300, 0, 300, 120], camp: 7, text: 'Dichter Nadelwald mit Banditen, Spinnen und Bären. Spinnenhöhle und Banditenkeller.', portals: [] },
  { id: 5, name: 'Orktal', levels: 'Stufe 20–29', minLevel: 20, region: [600, 0, 300, 120], camp: 7, text: 'Staubiges Tal der Orks und Skorpione. Orkfestung.', portals: [] },
  { id: 6, name: 'Ödland', levels: 'Stufe 30–39', minLevel: 30, region: [300, 120, 300, 120], camp: 7, text: 'Graue Aschenebene mit Ogern und Dämonen. Totengruft.', portals: [] },
  { id: 2, name: 'Schlangental', levels: 'Stufe 30–50', minLevel: 30, region: [600, 120, 300, 120], text: 'Die Oasenstadt Sahra, darum eine heiße Wüste voller Schlangen, außen der Dschungel der Nagas.', portals: [] },
  { id: 7, name: 'Frostgipfel', levels: 'Stufe 40–49', minLevel: 40, region: [300, 240, 300, 120], camp: 7, text: 'Eisige Gipfel mit Eiswölfen, Yetis und Frostgeistern. Eisgrotte.', portals: [] },
  { id: 8, name: 'Totenmoor', levels: 'Stufe 50–59', minLevel: 50, region: [600, 240, 300, 120], camp: 7, text: 'Nebliges Moor voller Untoter, Hexen und Ghule.', portals: [] },
  { id: 3, name: 'Donnerklamm', levels: 'Stufe 50–75', minLevel: 50, region: [300, 360, 300, 120], text: 'Die Klammfeste, darum eine tiefe Felsschlucht mit Trollen und Minotauren, außen der Kamm der Titanen.', portals: [] },
  { id: 9, name: 'Feuerberg', levels: 'Stufe 60–70', minLevel: 60, region: [600, 360, 300, 120], camp: 7, text: 'Schwarzer Basalt und Lavaflüsse, Golems, Feuerdämonen und Drachen. Drachenhort.', portals: [] }
];
const MAP_ZONES = [
  { id: 'oasenlager', map: 2, name: 'Oase Sahra', levels: 'Stadt · sicherer Ort', minDist: 0, maxDist: 12, safe: true, ground: 'SAND' },
  {
    id: 'sandwueste', map: 2, name: 'Sandschlangenwüste', levels: 'Stufe 30–39', minLevel: 30, minDist: 12, maxDist: 55,
    ground: 'SAND', trees: 0.0036, treeObj: 'DEADTREE', rocks: 0.012, water: 0.1, liquid: 'WATER',
    groups: [['sandviper', 9, 0, 0.6], ['klapperschlange', 8, 0.3, 1], ['kobra', 7, 0.55, 1], ['schakal', 6, 0.1, 0.9]], groupSize: [3, 5],
    stones: [[30, 3, 0, 0.6], [35, 3, 0.4, 1]],
    ambient: { kind: 'dust', tint: [90, 60, 10, 0.08] }
  },
  {
    id: 'nagadschungel', map: 2, name: 'Nagadschungel', levels: 'Stufe 40–50', minLevel: 40, minDist: 55, maxDist: 999,
    ground: 'FOREST', alt: 'SWAMP', trees: 0.021, treeObj: 'TREE', rocks: 0.003, water: 0.22, liquid: 'BOG',
    groups: [['riesenpython', 9, 0, 0.6], ['naga', 9, 0.3, 1], ['nagapriesterin', 7, 0.5, 1], ['panther', 6, 0.2, 0.9]], groupSize: [2, 4],
    stones: [[40, 3, 0, 0.6], [45, 3, 0.4, 1], [50, 2, 0.7, 1]],
    ambient: { kind: 'fireflies', tint: [10, 40, 20, 0.14] }
  },
  { id: 'waldlager', map: 4, name: 'Waldlager', levels: 'Lager · sicherer Ort', minDist: 0, maxDist: 8, safe: true, ground: 'FOREST' },
  { id: 'orklager', map: 5, name: 'Talwacht', levels: 'Lager · sicherer Ort', minDist: 0, maxDist: 8, safe: true, ground: 'SAND' },
  { id: 'aschelager', map: 6, name: 'Aschenlager', levels: 'Lager · sicherer Ort', minDist: 0, maxDist: 8, safe: true, ground: 'ASH' },
  { id: 'frostlager', map: 7, name: 'Frostlager', levels: 'Lager · sicherer Ort', minDist: 0, maxDist: 8, safe: true, ground: 'SNOW' },
  { id: 'moorlager', map: 8, name: 'Moorwacht', levels: 'Lager · sicherer Ort', minDist: 0, maxDist: 8, safe: true, ground: 'SWAMP' },
  { id: 'feuerlager', map: 9, name: 'Glutlager', levels: 'Lager · sicherer Ort', minDist: 0, maxDist: 8, safe: true, ground: 'BASALT' },
  { id: 'klammwacht', map: 3, name: 'Klammfeste', levels: 'Stadt · sicherer Ort', minDist: 0, maxDist: 12, safe: true, ground: 'ASH' },
  {
    id: 'donnerklamm', map: 3, name: 'Donnerklamm', levels: 'Stufe 50–61', minLevel: 50, minDist: 12, maxDist: 55,
    ground: 'ASH', trees: 0.0024, treeObj: 'DEADTREE', rocks: 0.027, water: 0.08, liquid: 'WATER',
    groups: [['trollkrieger', 10, 0, 0.6], ['harpyie', 8, 0.3, 1], ['minotaurus', 8, 0.5, 1], ['donnerbock', 6, 0.2, 0.9]], groupSize: [2, 4],
    stones: [[55, 3, 0, 0.6], [60, 3, 0.4, 1]],
    ambient: { kind: 'dust', tint: [60, 40, 30, 0.1] }
  },
  {
    id: 'titanenkamm', map: 3, name: 'Titanenkamm', levels: 'Stufe 62–75', minLevel: 62, minDist: 55, maxDist: 999,
    ground: 'BASALT', trees: 0.0018, treeObj: 'DEADTREE', rocks: 0.024, water: 0.14, liquid: 'LAVA',
    groups: [['steintitan', 9, 0, 0.6], ['gargoyle', 9, 0.3, 1], ['donnerriese', 7, 0.5, 1]], groupSize: [2, 4],
    stones: [[65, 3, 0, 0.6], [70, 3, 0.4, 1]],
    ambient: { kind: 'embers', tint: [80, 30, 10, 0.12] }
  }
];
for (const wm of WORLD_MAPS) {
  const [x, y, w, h] = wm.region;
  wm.cx = x + w / 2;
  wm.cy = y + h / 2;
}
for (const z of MAP_ZONES) {
  const wm = WORLD_MAPS.find((m) => m.id === z.map);
  ZONES.push({ ...z, cx: wm.cx, cy: wm.cy });
}
// Gebiete jeder Map, von innen nach außen (für zoneIndexAt)
const MAP_ZONE_LIST = {};
for (const wm of WORLD_MAPS) {
  MAP_ZONE_LIST[wm.id] = ZONES.map((z, i) => i).filter((i) => ZONES[i].map === wm.id).sort((a, b) => ZONES[a].maxDist - ZONES[b].maxDist);
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
