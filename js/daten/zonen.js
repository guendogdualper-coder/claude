// Die Welt besteht aus Ringen um das Dorf. Je weiter weg, desto stärker die Monster.
// minDist/maxDist   Abstand vom Dorfzentrum in Kacheln
// groups            [Monsterart, Anzahl Gruppen]
// groupSize         [min, max] Monster pro Gruppe
// stones            Anzahl Seelensteine gleichzeitig, stoneLevel = ihre Stufe
const ZONES = [
  {
    id: 'dorf', name: 'Dorf Hayan', levels: 'Sicherer Ort', minDist: 0, maxDist: 9, safe: true,
    ground: 'GRASS'
  },
  {
    id: 'wiesen', name: 'Sonnenwiesen', levels: 'Stufe 1–7', minDist: 9, maxDist: 24,
    ground: 'GRASS', alt: 'MEADOW', trees: 0.05, treeObj: 'TREE', rocks: 0.008, water: 0.22,
    groups: [['hund', 9], ['wolf', 8], ['alphawolf', 4]], groupSize: [3, 5], stones: 2, stoneLevel: 5
  },
  {
    id: 'wald', name: 'Dunkelwald', levels: 'Stufe 8–14', minDist: 24, maxDist: 39,
    ground: 'FOREST', trees: 0.2, treeObj: 'PINE', rocks: 0.012, water: 0.2,
    groups: [['wildschwein', 8], ['bandit', 8], ['banditschuetze', 6]], groupSize: [3, 4], stones: 3, stoneLevel: 12
  },
  {
    id: 'orktal', name: 'Orktal', levels: 'Stufe 15–21', minDist: 39, maxDist: 52,
    ground: 'SAND', trees: 0.025, treeObj: 'DEADTREE', rocks: 0.06, water: 0.12,
    groups: [['ork', 9], ['orkschamane', 7]], groupSize: [3, 5], stones: 3, stoneLevel: 19
  },
  {
    id: 'oedland', name: 'Ödland', levels: 'Stufe 22+', minDist: 52, maxDist: 999,
    ground: 'ASH', trees: 0.03, treeObj: 'DEADTREE', rocks: 0.07, water: 0,
    groups: [['oger', 7], ['daemon', 9]], groupSize: [2, 4], stones: 3, stoneLevel: 27
  }
];

// Waren der Händlerin im Dorf
const SHOP = [
  { id: 'hp', name: 'Roter Trank', text: 'Stellt 35 % Leben wieder her. Taste Q.', price: 15 },
  { id: 'mp', name: 'Blauer Trank', text: 'Stellt 40 % Mana wieder her. Taste E.', price: 20 }
];
