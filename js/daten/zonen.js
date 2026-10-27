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
    ground: 'GRASS', alt: 'MEADOW', trees: 0.05, treeObj: 'TREE', rocks: 0.008, water: 0.22, liquid: 'WATER',
    groups: [['hund', 11, 0, 0.4], ['wolf', 10, 0.3, 0.8], ['alphawolf', 6, 0.6, 1], ['wildschwein', 6, 0.7, 1]], groupSize: [3, 5],
    stones: [[5, 3, 0.2, 0.7], [10, 2, 0.65, 1]],
    ambient: { kind: 'pollen' }
  },
  {
    id: 'wald', name: 'Dunkelwald', levels: 'Stufe 10–19', minLevel: 10, minDist: 36, maxDist: 50,
    ground: 'FOREST', trees: 0.2, treeObj: 'PINE', rocks: 0.012, water: 0.2, liquid: 'WATER',
    groups: [['bandit', 8, 0, 0.6], ['banditschuetze', 6, 0.2, 0.8], ['waldspinne', 8, 0.35, 1], ['braunbaer', 6, 0.6, 1]], groupSize: [3, 4],
    stones: [[15, 3, 0, 0.6], [20, 2, 0.5, 1]],
    ambient: { kind: 'fireflies', tint: [10, 30, 20, 0.12] }
  },
  {
    id: 'orktal', name: 'Orktal', levels: 'Stufe 20–29', minLevel: 20, minDist: 50, maxDist: 62,
    ground: 'SAND', trees: 0.025, treeObj: 'DEADTREE', rocks: 0.06, water: 0.12, liquid: 'WATER',
    groups: [['ork', 9, 0, 0.6], ['orkschamane', 7, 0.3, 0.9], ['skorpion', 8, 0.2, 1], ['orkhauptmann', 5, 0.65, 1]], groupSize: [3, 5],
    stones: [[25, 3, 0, 0.6], [30, 2, 0.55, 1]],
    ambient: { kind: 'dust', tint: [80, 50, 10, 0.08] }
  },
  {
    id: 'oedland', name: 'Ödland', levels: 'Stufe 30–39', minLevel: 30, minDist: 62, maxDist: 74,
    ground: 'ASH', trees: 0.03, treeObj: 'DEADTREE', rocks: 0.07, water: 0.1, liquid: 'BOG',
    groups: [['oger', 9, 0, 0.6], ['daemon', 10, 0.3, 1], ['hoellenhund', 9, 0.5, 1]], groupSize: [2, 4],
    stones: [[35, 3, 0, 0.6], [40, 2, 0.55, 1]],
    ambient: { kind: 'ash', tint: [40, 20, 20, 0.12] }
  },
  {
    id: 'frost', name: 'Frostgipfel', levels: 'Stufe 40–49', minLevel: 40, minDist: 74, maxDist: 85,
    ground: 'SNOW', trees: 0.09, treeObj: 'PINE', rocks: 0.04, water: 0.16, liquid: 'ICE',
    groups: [['eiswolf', 11, 0, 0.7], ['yeti', 9, 0.3, 1], ['frostgeist', 9, 0.45, 1]], groupSize: [2, 4],
    stones: [[45, 3, 0, 0.6], [50, 2, 0.55, 1]],
    ambient: { kind: 'snow', tint: [120, 160, 220, 0.1] }
  },
  {
    id: 'moor', name: 'Totenmoor', levels: 'Stufe 50–59', minLevel: 50, minDist: 85, maxDist: 96,
    ground: 'SWAMP', trees: 0.07, treeObj: 'DEADTREE', rocks: 0.02, water: 0.28, liquid: 'BOG',
    groups: [['untoter', 11, 0, 0.7], ['sumpfhexe', 9, 0.3, 1], ['ghul', 10, 0.45, 1]], groupSize: [2, 4],
    stones: [[55, 3, 0, 0.6], [60, 2, 0.55, 1]],
    ambient: { kind: 'wisps', tint: [20, 50, 30, 0.16] }
  },
  {
    id: 'vulkan', name: 'Feuerberg', levels: 'Stufe 60–70', minLevel: 60, minDist: 96, maxDist: 999,
    ground: 'BASALT', trees: 0.015, treeObj: 'DEADTREE', rocks: 0.08, water: 0.2, liquid: 'LAVA',
    groups: [['lavagolem', 10, 0, 0.6], ['feuerdaemon', 11, 0.2, 1], ['feuerdrache', 8, 0.4, 1]], groupSize: [2, 4],
    stones: [[65, 4, 0, 0.6], [70, 3, 0.4, 1]],
    ambient: { kind: 'embers', tint: [120, 30, 0, 0.12] }
  }
];

// Waren der Händlerin im Dorf
const SHOP = [
  { id: 'hp', name: 'Roter Trank', text: 'Stellt 35 % Leben wieder her. Taste Q.', price: 15 },
  { id: 'mp', name: 'Blauer Trank', text: 'Stellt 40 % Mana wieder her. Taste E.', price: 20 }
];
