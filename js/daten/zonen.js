// Seit Version 6.2 ist jedes Gebiet eine eigene Map (WORLD_MAPS), erreichbar nur über das Weltentor im
// Lager der Map. Map 1 ist Kazehana mit den Sonnenwiesen; jede andere Map hat ein Lager bzw. eine Stadt (seit 14.48 nicht mehr
// in der Mitte, sondern je Map an eigener Stelle: WORLD_MAPS.town).
// map               Map, zu der das Gebiet gehört
// minDist/maxDist   Abstand von der Stadt bzw. dem Lager der Map in Kacheln (WORLD_MAPS.cx, cy)
// groups            [Monsterart, Anzahl Gruppen, von, bis] – von/bis: Bereich innerhalb des Rings,
//                   0 = innerer Rand (dorfnah), 1 = äußerer Rand
// groupSize         [min, max] Monster pro Gruppe
// stones            [Steinstufe, Anzahl, von, bis] – welche Seelensteine wo stehen (siehe STONE_TYPES)
// liquid            Art der Gewässer: WATER, BOG (Sumpf), LAVA, ICE (zugefroren, begehbar) oder ABGRUND (Spalte, seit 13.85)
// ambient           Stimmung: schwebende Teilchen (kind) und eine leichte Färbung des Bildes (tint, RGBA)
const ZONES = [
  {
    id: 'dorf', map: 1, name: 'Kazehana', levels: 'Sicherer Ort', minDist: 0, maxDist: 24, safe: true,
    ground: 'GRASS'
  },
  {
    id: 'wiesen', map: 1, name: 'Sonnenwiesen', levels: 'Stufe 1–9', minLevel: 1, minDist: 24, maxDist: 999,
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
    id: 'orktal', map: 5, name: 'Rostschlucht', levels: 'Stufe 20–29', minLevel: 20, minDist: 8, maxDist: 999,
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
    // seit 13.85 rund ein Viertel mehr Gruppen (vorher 13, 14, 10, 8 = 45), dafür weniger Felsen und Geröll
    groups: [['lavagolem', 16, 0, 0.6], ['feuerdaemon', 18, 0.2, 1], ['feuerdrache', 12, 0.4, 1], ['glutkatze', 10, 0.15, 0.9]], groupSize: [2, 4],
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
    id: 'schlangentempel', name: 'Schlangentempel', minLevel: 44, entry: { map: 2, dir: [1, 0], dist: 84, side: 4 }, floor: 'FLAGSTONE',
    wall: { top: '#3a5a4a', face: '#142a22', line: '#c9a35a' }, portal: '#7ad8c8',
    mobs: ['naga', 'nagapriesterin'], boss: 'nagakoenigin', stones: [45, 50],
    ambient: { kind: 'fireflies', tint: [10, 40, 30, 0.12] }
  },
  {
    id: 'titanenschmiede', name: 'Titanenschmiede', minLevel: 60, entry: { map: 3, dir: [-1, 0], dist: 84, side: 4 }, floor: 'BASALT',
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
// Endboss-Arena aus einer Zeile von RAID_DEFS (seit 13.85 als Funktion, auch für den Endboss von Map 10)
function raidDungeon([boss, name, map, floor, portal, wall, amb], tint = [40, 20, 20, 0.08]) {
  const lvl = MONSTER_TYPES[boss].level;
  return {
    id: 'raid_' + boss, name, minLevel: Math.max(1, lvl - 6), raid: true, floor, wall, portal, mobs: [], boss, stones: [],
    entry: map ? { map, dir: [0, 1], dist: 18, side: 6 } : { dir: [0, 1], dist: 29, side: 6 },
    ambient: { kind: amb, tint }
  };
}
for (const row of RAID_DEFS) DUNGEONS.push(raidDungeon(row));
// Version 13.0: der Höllenthron – eine Instanz für 6–7 Spieler ab Stufe 60 hinter einem Riesenportal im Feuerberg
// (der letzten Map): Räume mit Seelensteinen und Höllenbrut, zwei Wächter und am Ende Abaddor, der Höllenkaiser.
// Abaddor ist versiegelt, bis alle Seelensteine und beide Wächter der Instanz besiegt sind (hoellenthron.js).
DUNGEONS.push({
  id: 'hoellenthron', name: 'Thron der Unterwelt', minLevel: 60, instanz: true, floor: 'BASALT', portal: '#ff3a1a',
  wall: { top: '#1a0c0c', face: '#060202', line: '#ff3a1a' },
  entry: { map: 9, dir: [0, -1], dist: 34, side: 0 }, mobs: ['hoellenhund', 'feuerdaemon'], boss: 'abaddor', stones: [64, 65, 66, 67, 68, 69],
  guards: ['zerberos', 'ifrah'], ambient: { kind: 'embers', tint: [110, 10, 0, 0.14] },
  // seit 13.58: zwei Blöcke hoch mit vielen Räumen und sechs Wächtern, die immer stärker werden (daten/instanzen.js)
  rows: 2, minis: ['gorvoth', 'lilith', 'zerberos', 'molgrath', 'ifrah', 'belzarek']
});
// seit 13.58: die acht Lv-60-Instanzen (daten/instanzen.js), je zwei in den Ecken der Maps ab Stufe 40
if (typeof INSTANCES !== 'undefined') DUNGEONS.push(...INSTANCES);
// seit 13.85: Dungeon und Endboss des Kristallabgrunds (Map 10). Hinten angehängt (wie die Lv-80-Instanzen am Ende von
// INSTANCES), damit alle älteren Dungeons ihren Platz im Streifen behalten (Spielstände in einem Dungeon bleiben gültig)
DUNGEONS.push({
  id: 'kristallkaverne', name: 'Kristallkaverne', minLevel: 75, entry: { map: 10, dir: [-1, 0], dist: 84, side: 4 }, floor: 'KRISTALL',
  wall: { top: '#2e2850', face: '#0e0a1c', line: '#9fd8ff' }, portal: '#9fd8ff',
  mobs: ['kavernenwaechter', 'leerenseherin'], boss: 'vaelith', stones: [75, 80],
  ambient: { kind: 'shards', tint: [30, 30, 90, 0.13] }
});
DUNGEONS.push(raidDungeon(['aelvyr', 'Hort des Abgrundwyrms', 10, 'KRISTALL', '#a88cff', { top: '#2a2444', face: '#0c0a18', line: '#a88cff' }, 'shards'], [30, 20, 70, 0.1]));
for (const d of DUNGEONS) {
  ZONES.push({ id: d.id, name: d.name, levels: `Dungeon · ab Stufe ${d.minLevel}`, minLevel: d.minLevel, dungeon: d, ground: d.floor, ambient: d.ambient });
}

// --- Maps ---------------------------------------------------------------------------------
// Jedes Gebiet ist eine eigene Map, nicht zu Fuß erreichbar, nur über das Weltentor im Lager (bzw. in
// der Stadt). Auf jeder Map liegt ein sicherer Ort; die Gebiete liegen als Ringe darum
// (minDist/maxDist ab der Stadt bzw. dem Lager): nah am Lager schwächere Monster, nach außen stärkere.
// town (seit 14.48): Lage der Stadt bzw. des Lagers [x, y] in Kacheln ab der linken oberen Ecke der Map (360 × 220);
// ohne town in der Mitte (nur noch Kazehana). Jede Map hat ihren eigenen Platz: am Rand, in einer Ecke oder im
// Drittel, mit Abstand zum Felsrand, zu den Instanz-Toren in den Ecken und so, dass die Dungeon-Eingänge (entry.dir,
// entry.dist ab der Stadt) und das Endboss-Tor südlich der Stadt auf der Map bleiben (docs/staedte-verteilt.md)
// region: [x, y, Breite, Höhe] in Kacheln; camp: halbe Breite des sicheren Platzes (Standard CAMP_HALF)
// portals: Weltportale draußen (seit Version 6.2 keine mehr – nur noch das Weltentor)
// camp: halbe Mauerlänge der Stadt/des Lagers; genCamp (seit 13.14, Map 2): der alte Wert, mit dem die Wildnis erzeugt
// wird, damit Bäume und Felsen der übrigen Maps gleich bleiben, obwohl die Stadt größer geworden ist
// seit 13.63 sind alle Städte und Lager größer (Platz für Auktionshaus, Post und Herausforderung): Lager 9 → 13,
// Städte 14 bzw. 18 → 20; Stände und Häuser bleiben beim Plan von genCamp, nur die Mauer rückt nach außen
// seit 13.72 stehen die Stände innen an der neuen Mauer (TOWN_PLACES in welt.js), Häuser und Weltentor bleiben beim Plan
const WORLD_MAPS = [
  { id: 1, name: 'Kazehana', levels: 'Stufe 1–9', minLevel: 1, region: [0, 70, 360, 220], text: 'Die große Stadt Kazehana mit den grünen Sonnenwiesen.', portals: [] },
  { id: 4, name: 'Dunkelwald', levels: 'Stufe 10–19', minLevel: 10, region: [360, 0, 360, 220], camp: 13, genCamp: 9, text: 'Dichter Nadelwald mit Banditen, Spinnen und Bären. Spinnenhöhle und Banditenkeller.', town: [110, 95], portals: [] },
  { id: 5, name: 'Rostschlucht', levels: 'Stufe 20–29', minLevel: 20, region: [720, 0, 360, 220], camp: 13, genCamp: 9, text: 'Staubiges Tal der Orks und Skorpione. Orkfestung.', town: [250, 52], portals: [] },
  { id: 6, name: 'Ödland', levels: 'Stufe 30–39', minLevel: 30, region: [360, 220, 360, 220], camp: 13, genCamp: 9, text: 'Graue Aschenebene mit Ogern und Dämonen. Totengruft.', town: [75, 160], portals: [] },
  { id: 2, name: 'Schlangental', levels: 'Stufe 30–50', minLevel: 30, region: [720, 220, 360, 220], camp: 20, genCamp: 14, text: 'Die Oasenstadt Sahra, darum eine heiße Wüste voller Schlangen, außen der Dschungel der Nagas.', town: [72, 75], portals: [] },
  { id: 7, name: 'Frostgipfel', levels: 'Stufe 40–49', minLevel: 40, region: [360, 440, 360, 220], camp: 13, genCamp: 9, text: 'Eisige Gipfel mit Eiswölfen, Yetis und Frostgeistern. Eisgrotte.', town: [290, 55], portals: [] },
  { id: 8, name: 'Totenmoor', levels: 'Stufe 50–59', minLevel: 50, region: [720, 440, 360, 220], camp: 13, genCamp: 9, text: 'Nebliges Moor voller Untoter, Hexen und Ghule.', town: [285, 150], portals: [] },
  { id: 3, name: 'Donnerklamm', levels: 'Stufe 50–75', minLevel: 50, region: [360, 660, 360, 220], camp: 20, genCamp: 14, text: 'Die Klammfeste, darum eine tiefe Felsschlucht mit Trollen und Minotauren, außen der Kamm der Titanen.', town: [140, 150], portals: [] },
  { id: 9, name: 'Feuerberg', levels: 'Stufe 60–70', minLevel: 60, region: [720, 660, 360, 220], camp: 13, genCamp: 9, text: 'Schwarzer Basalt und Lavaflüsse, Golems, Feuerdämonen und Drachen. Drachenhort.', town: [175, 162], portals: [] },
  // seit 13.85: Map 10, das Endgebiet unten links (vorher Fels): die Kristallzitadelle Lichtwacht, darum violette
  // Felsplateaus mit Kristallen und Abgrundspalten (GROUND.ABGRUND), innen die Hänge, außen der Leerenschlund
  { id: 10, name: 'Kristallabgrund', levels: 'Stufe 75–80', minLevel: 75, region: [0, 660, 360, 220], camp: 20, genCamp: 14, text: 'Die Kristallzitadelle Lichtwacht über dem Abgrund, darum Plateaus voller Kristalle, Golems und Spinnen, außen der Leerenschlund mit Rittern und Wyrmen. Kristallkaverne.', town: [265, 70], portals: [] }
];
const MAP_ZONES = [
  { id: 'oasenlager', map: 2, name: 'Oase Sahra', levels: 'Stadt · sicherer Ort', minDist: 0, maxDist: 15, safe: true, ground: 'SAND' },
  {
    id: 'sandwueste', map: 2, name: 'Sandschlangenwüste', levels: 'Stufe 30–39', minLevel: 30, minDist: 15, maxDist: 66,
    ground: 'SAND', trees: 0.0036, treeObj: 'DEADTREE', rocks: 0.012, water: 0.1, liquid: 'WATER',
    groups: [['sandviper', 11, 0, 0.6], ['klapperschlange', 10, 0.3, 1], ['kobra', 9, 0.55, 1], ['schakal', 8, 0.1, 0.9]], groupSize: [3, 5],
    stones: [[30, 3, 0, 0.6], [35, 3, 0.4, 1]],
    ambient: { kind: 'dust', tint: [90, 60, 10, 0.08] }
  },
  {
    id: 'nagadschungel', map: 2, name: 'Nagadschungel', levels: 'Stufe 40–50', minLevel: 40, minDist: 66, maxDist: 999,
    ground: 'FOREST', alt: 'SWAMP', trees: 0.021, treeObj: 'TREE', rocks: 0.003, water: 0.22, liquid: 'BOG',
    groups: [['riesenpython', 11, 0, 0.6], ['naga', 11, 0.3, 1], ['nagapriesterin', 9, 0.5, 1], ['panther', 8, 0.2, 0.9]], groupSize: [2, 4],
    stones: [[40, 3, 0, 0.6], [45, 3, 0.4, 1], [50, 2, 0.7, 1]],
    ambient: { kind: 'fireflies', tint: [10, 40, 20, 0.14] }
  },
  { id: 'waldlager', map: 4, name: 'Waldlager', levels: 'Lager · sicherer Ort', minDist: 0, maxDist: 10, safe: true, ground: 'FOREST' },
  { id: 'orklager', map: 5, name: 'Talwacht', levels: 'Lager · sicherer Ort', minDist: 0, maxDist: 10, safe: true, ground: 'SAND' },
  { id: 'aschelager', map: 6, name: 'Aschenlager', levels: 'Lager · sicherer Ort', minDist: 0, maxDist: 10, safe: true, ground: 'ASH' },
  { id: 'frostlager', map: 7, name: 'Frostlager', levels: 'Lager · sicherer Ort', minDist: 0, maxDist: 10, safe: true, ground: 'SNOW' },
  { id: 'moorlager', map: 8, name: 'Moorwacht', levels: 'Lager · sicherer Ort', minDist: 0, maxDist: 10, safe: true, ground: 'SWAMP' },
  { id: 'feuerlager', map: 9, name: 'Glutlager', levels: 'Lager · sicherer Ort', minDist: 0, maxDist: 10, safe: true, ground: 'BASALT' },
  { id: 'klammwacht', map: 3, name: 'Klammfeste', levels: 'Stadt · sicherer Ort', minDist: 0, maxDist: 15, safe: true, ground: 'ASH' },
  {
    id: 'donnerklamm', map: 3, name: 'Donnerklamm', levels: 'Stufe 50–61', minLevel: 50, minDist: 15, maxDist: 66,
    ground: 'ASH', trees: 0.0024, treeObj: 'DEADTREE', rocks: 0.027, water: 0.08, liquid: 'WATER',
    groups: [['trollkrieger', 12, 0, 0.6], ['harpyie', 10, 0.3, 1], ['minotaurus', 10, 0.5, 1], ['donnerbock', 8, 0.2, 0.9]], groupSize: [2, 4],
    stones: [[55, 3, 0, 0.6], [60, 3, 0.4, 1]],
    ambient: { kind: 'dust', tint: [60, 40, 30, 0.1] }
  },
  {
    id: 'titanenkamm', map: 3, name: 'Titanenkamm', levels: 'Stufe 62–75', minLevel: 62, minDist: 66, maxDist: 999,
    ground: 'BASALT', trees: 0.0018, treeObj: 'DEADTREE', rocks: 0.024, water: 0.14, liquid: 'LAVA',
    groups: [['steintitan', 12, 0, 0.6], ['gargoyle', 12, 0.3, 1], ['donnerriese', 10, 0.5, 1]], groupSize: [2, 4],
    stones: [[65, 3, 0, 0.6], [70, 3, 0.4, 1]],
    ambient: { kind: 'embers', tint: [80, 30, 10, 0.12] }
  },
  // Map 10 · Kristallabgrund (seit 13.85): Boden KRISTALL, Gewässer sind Abgrundspalten (ABGRUND, nicht begehbar),
  // Bäume sind Kristallbäume (DEADTREE, in 3D mit Kristallästen, karte80.js)
  { id: 'lichtwacht', map: 10, name: 'Lichtwacht', levels: 'Stadt · sicherer Ort', minDist: 0, maxDist: 15, safe: true, ground: 'KRISTALL' },
  {
    id: 'kristallhang', map: 10, name: 'Kristallhänge', levels: 'Stufe 75–77', minLevel: 75, minDist: 15, maxDist: 66,
    ground: 'KRISTALL', trees: 0.004, treeObj: 'DEADTREE', rocks: 0.02, water: 0.12, liquid: 'ABGRUND',
    groups: [['kristallgolem', 12, 0, 0.6], ['splitterspinne', 11, 0.2, 1], ['schattenpirscher', 9, 0.45, 1]], groupSize: [2, 4],
    stones: [[75, 4, 0, 1]],
    ambient: { kind: 'shards', tint: [40, 50, 120, 0.1] }
  },
  {
    id: 'leerenschlund', map: 10, name: 'Leerenschlund', levels: 'Stufe 78–80', minLevel: 78, minDist: 66, maxDist: 999,
    ground: 'KRISTALL', trees: 0.003, treeObj: 'DEADTREE', rocks: 0.022, water: 0.17, liquid: 'ABGRUND',
    groups: [['abgrundgeist', 11, 0, 0.7], ['leerenritter', 11, 0.25, 1], ['kristallwyrm', 9, 0.45, 1], ['schattenpirscher', 5, 0, 0.5]], groupSize: [2, 4],
    stones: [[75, 2, 0, 0.5], [80, 4, 0.3, 1]],
    ambient: { kind: 'shards', tint: [50, 30, 110, 0.14] }
  }
];
// seit 14.48: Die Stadt bzw. das Lager liegt nicht mehr auf jeder Map in der Mitte (town: [x, y] in Kacheln ab der
// linken oberen Ecke der Map). Kazehana bleibt in der Mitte. oldCx/oldCy: die alte Mitte (für Spielstände aus Welt 14),
// reach: Abstand von der Stadt bis zur fernsten Ecke der Map (äußerer Rand der Gebietsringe; in der Mitte wie bisher
// die halbe Diagonale)
for (const wm of WORLD_MAPS) {
  const [x, y, w, h] = wm.region;
  wm.oldCx = x + w / 2;
  wm.oldCy = y + h / 2;
  wm.cx = wm.town ? x + wm.town[0] : wm.oldCx;
  wm.cy = wm.town ? y + wm.town[1] : wm.oldCy;
  wm.reach = Math.hypot(Math.max(wm.cx - x, x + w - wm.cx), Math.max(wm.cy - y, y + h - wm.cy));
}
// Endboss-Eingänge vor den Lagern und Städten (seit 13.63): immer 6 Kacheln vor der (größeren) Mauer
for (const d of DUNGEONS) {
  const wm = d.raid && d.entry.map ? WORLD_MAPS.find((m) => m.id === d.entry.map) : null;
  if (wm) d.entry.dist = Math.max(d.entry.dist, (wm.camp || 14) + 6);
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
  { id: 'hp', name: 'Drachenblut', plural: 'Drachenblut-Tränke', kind: 'Lebenstrank', color: '#ff9a8a', text: 'Lebenstrank: Stellt Leben wieder her, je größer, desto mehr. Taste Q.', price: 15 },
  { id: 'mp', name: 'Mondtau', plural: 'Mondtau-Tränke', kind: 'Manatrank', color: '#9ac0ff', text: 'Manatrank: Stellt Mana wieder her, je größer, desto mehr. Taste E.', price: 20 }
];
const potionInfo = (kind) => SHOP.find((x) => x.id === kind);

// Trankgrößen: S bis XXL. Je größer, desto mehr Leben bzw. Mana und desto teurer;
// die Händlerin verkauft sie ab einer Stufe. Im Gepäck: p.potions.hp (S), hpM, hpXL, hpXXL, ebenso mp.
// Seit 10.1 heilen sie feste Mengen statt Prozent: So passt jede Größe zu ihrem Stufenbereich (bei Stufe 30
// heilt der kleine Trank nur noch etwa ein Siebtel, der große etwa die Hälfte).
// Seit 13.2 heilen die Lebenstränke rund 45 % weniger (vorher füllte ein großer Trank auf Stufe 30 fast die Hälfte):
// klein 95, mittel 180, groß 340, sehr groß 540, riesig 800
// seit 14.32: nur noch vier Größen je Farbe (S, M, XL, XXL). Die Zwischengröße L (+340 Leben / +210 Mana, ab 25)
// entfällt: Sie lag am dichtesten an ihrer Nachbargröße (XL heilte nur das 1,6-Fache, alle anderen Schritte 1,9- bis
// 3-fach) und deckte wie M und XL nur 15 Stufen ab. XL gibt es dafür schon ab Stufe 25 (vorher 40). Alle Tränke
// wirken moderat stärker (vorher S 95/60, M 180/115, L 340/210, XL 540/320, XXL 1600/470; Messung und Begründung in
// docs/auftrag-2026-11-10-items.md). Preise, Abklingzeit (POTION_CD) und Schlüssel bleiben gleich; vorhandene
// L-Tränke werden 1:1 zu XL (POTION_MERGED, migratePotions) – überall, auch in Post, Auktionshaus und Handel.
const POTION_SIZES = [
  { id: 'S', name: 'klein', hp: 120, mp: 75, price: 1, level: 1, art: 0 },
  { id: 'M', name: 'mittel', hp: 225, mp: 145, price: 5, level: 10, art: 1 },
  { id: 'XL', name: 'sehr groß', hp: 620, mp: 380, price: 80, level: 25, art: 3 },
  { id: 'XXL', name: 'riesig', hp: 1850, mp: 600, price: 320, level: 55, art: 4 }
];
// Entfallene Größen und wohin sie gehen (seit 14.32: L → XL, je Trank genau ein XL – nie schlechter)
const POTION_MERGED = { L: 'XL' };
const potKey = (kind, size) => (size === 'S' ? kind : kind + size);
// Schlüssel eines Vorrats auf die heutige Größe (hpL → hpXL); unbekannte Schlüssel bleiben, wie sie sind
function potAlias(key) {
  const k = String(key);
  const to = POTION_MERGED[k.slice(2)];
  return to ? k.slice(0, 2) + to : k;
}
// Spielstand (spieler.js): Tränke entfallener Größen in die neue Größe legen
function migratePotions(p) {
  if (!p || !p.potions) return;
  for (const kind of ['hp', 'mp']) for (const [from, to] of Object.entries(POTION_MERGED)) {
    const a = potKey(kind, from);
    const n = p.potions[a] | 0;
    if (n > 0) p.potions[potKey(kind, to)] = (p.potions[potKey(kind, to)] || 0) + n;
    delete p.potions[a];
  }
}
const potionTotal = (p, kind) => POTION_SIZES.reduce((n, sz) => n + (p.potions[potKey(kind, sz.id)] || 0), 0);
// Größe passend zur Stufe (für Beute und Tagesbelohnung): die größte, die man auf dieser Stufe kaufen kann
const potionSizeFor = (level) => POTION_SIZES.reduce((best, sz) => (level >= sz.level ? sz : best), POTION_SIZES[0]);
