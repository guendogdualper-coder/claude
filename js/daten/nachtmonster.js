// Nachtmonster (seit 13.8): Wenn es Nacht wird, kommen auf jeder Map zwei Arten dazu, die es nur nachts gibt.
// Sie bauen auf den bestehenden Monsterfamilien auf (Wolf, Katze, Hyäne, Spinne, Skorpion, Schlange, Dämon, Geist),
// haben aber eigene Nachtfarben, leuchtende Augen und Zeichen (Aussehen: MONSTER_ART in tag-nacht.js).
// Bei Tagesanbruch ziehen sie sich zurück. Gruppen: [Art, Anzahl Gruppen, von, bis] wie bei den Gebieten.

Object.assign(MONSTER_TYPES, {
  // Map 1 · Sonnenwiesen
  schattenwolf: { name: 'Schattenwolf', level: 7, shape: 'beast', color: '#262a3a', size: 14, speed: 115, range: 26, cooldown: 1.4, aggressive: true, hpMul: 1.25, atkMul: 1.1, night: true },
  irrlicht: { name: 'Irrlicht', level: 8, shape: 'ghost', color: '#a8f0d8', size: 12, speed: 100, range: 190, cooldown: 2, aggressive: true, ranged: true, hpMul: 0.85, atkMul: 1.15, shot: '#a8f0d8', night: true },
  // Map 4 · Dunkelwald
  mondspinne: { name: 'Mondspinne', level: 17, shape: 'beast', color: '#5a6278', size: 15, speed: 115, range: 28, cooldown: 1.3, aggressive: true, hpMul: 1.2, atkMul: 1.15, night: true },
  nachtluchs: { name: 'Nachtluchs', level: 16, shape: 'beast', color: '#3a3a4a', size: 13, speed: 130, range: 26, cooldown: 1.15, aggressive: true, atkMul: 1.2, night: true },
  // Map 5 · Rostschlucht
  nachtskorpion: { name: 'Nachtskorpion', level: 27, shape: 'beast', color: '#2a2230', size: 16, speed: 105, range: 30, cooldown: 1.3, aggressive: true, hpMul: 1.3, atkMul: 1.2, night: true },
  grabhyaene: { name: 'Grabhyäne', level: 25, shape: 'beast', color: '#4a4438', size: 14, speed: 120, range: 26, cooldown: 1.25, aggressive: true, hpMul: 1.15, atkMul: 1.1, night: true },
  // Map 6 · Ödland
  schattendaemon: { name: 'Schattendämon', level: 37, shape: 'demon', color: '#3a2a4a', size: 15, speed: 120, range: 28, cooldown: 1.25, aggressive: true, hpMul: 1.15, atkMul: 1.3, look: 'daemon', night: true },
  aschegeist: { name: 'Aschegeist', level: 38, shape: 'ghost', color: '#b8aaa0', size: 13, speed: 95, range: 220, cooldown: 2.1, aggressive: true, ranged: true, hpMul: 0.95, atkMul: 1.3, shot: '#ff8a4a', night: true },
  // Map 7 · Frostgipfel
  nordlichtgeist: { name: 'Nordlichtgeist', level: 47, shape: 'ghost', color: '#9af0d0', size: 13, speed: 95, range: 230, cooldown: 2, aggressive: true, ranged: true, hpMul: 0.95, atkMul: 1.35, shot: '#9af0d0', night: true },
  frostschatten: { name: 'Frostschatten', level: 46, shape: 'beast', color: '#5a6a8a', size: 15, speed: 125, range: 28, cooldown: 1.25, aggressive: true, hpMul: 1.25, atkMul: 1.2, night: true },
  // Map 8 · Totenmoor
  moorgeist: { name: 'Moorgeist', level: 57, shape: 'ghost', color: '#7ac88a', size: 13, speed: 95, range: 230, cooldown: 2, aggressive: true, ranged: true, hpMul: 1, atkMul: 1.35, shot: '#c8ff6a', night: true },
  knochenwolf: { name: 'Knochenwolf', level: 56, shape: 'beast', color: '#d8d0b8', size: 16, speed: 125, range: 28, cooldown: 1.25, aggressive: true, hpMul: 1.35, atkMul: 1.25, night: true },
  // Map 9 · Feuerberg
  glutgeist: { name: 'Glutgeist', level: 67, shape: 'ghost', color: '#ff9a5a', size: 14, speed: 100, range: 230, cooldown: 1.9, aggressive: true, ranged: true, hpMul: 1.05, atkMul: 1.4, shot: '#ffb04a', night: true },
  schattenkatze: { name: 'Schattenkatze', level: 66, shape: 'beast', color: '#14121a', size: 15, speed: 135, range: 28, cooldown: 1.1, aggressive: true, hpMul: 1.2, atkMul: 1.4, night: true },
  // Map 2 · Schlangental
  mondkobra: { name: 'Mondkobra', level: 36, shape: 'snake', color: '#2a3048', size: 15, speed: 100, range: 200, cooldown: 1.9, aggressive: true, ranged: true, hpMul: 1.15, atkMul: 1.25, shot: '#bfe8ff', night: true },
  dschungelgeist: { name: 'Dschungelgeist', level: 46, shape: 'ghost', color: '#6ad8b0', size: 13, speed: 95, range: 220, cooldown: 2, aggressive: true, ranged: true, hpMul: 0.95, atkMul: 1.3, shot: '#ffe86a', night: true },
  // Map 3 · Donnerklamm und Titanenkamm
  sturmgeist: { name: 'Sturmgeist', level: 56, shape: 'ghost', color: '#a8c0ff', size: 14, speed: 100, range: 230, cooldown: 1.9, aggressive: true, ranged: true, hpMul: 1, atkMul: 1.35, shot: '#9fd0ff', night: true },
  schattengargoyle: { name: 'Schattengargoyle', level: 70, shape: 'demon', color: '#2a2a34', size: 15, speed: 125, range: 30, cooldown: 1.15, aggressive: true, hpMul: 1.35, atkMul: 1.45, look: 'gargoyle', night: true },
  // Map 10 · Kristallabgrund (seit 13.85; Aussehen in karte80.js)
  leerenwolf: { name: 'Leerenwolf', level: 77, shape: 'beast', color: '#2a2848', size: 16, speed: 125, range: 28, cooldown: 1.2, aggressive: true, hpMul: 1.35, atkMul: 1.45, night: true },
  sternenschemen: { name: 'Sternenschemen', level: 79, shape: 'ghost', color: '#c8c0ff', size: 14, speed: 100, range: 230, cooldown: 1.9, aggressive: true, ranged: true, hpMul: 1.05, atkMul: 1.5, shot: '#e0f0ff', night: true }
});

// Wo und wie viele Nachtgruppen erscheinen (Gebiet → Gruppen)
const NIGHT_GROUPS = {
  wiesen: [['schattenwolf', 7, 0.25, 1], ['irrlicht', 5, 0.2, 0.9]],
  wald: [['nachtluchs', 6, 0.1, 0.9], ['mondspinne', 6, 0.4, 1]],
  orktal: [['grabhyaene', 6, 0.1, 0.9], ['nachtskorpion', 6, 0.4, 1]],
  oedland: [['schattendaemon', 6, 0.2, 1], ['aschegeist', 5, 0.3, 1]],
  frost: [['frostschatten', 6, 0.1, 0.9], ['nordlichtgeist', 5, 0.4, 1]],
  moor: [['knochenwolf', 6, 0.1, 0.9], ['moorgeist', 5, 0.4, 1]],
  vulkan: [['schattenkatze', 6, 0.1, 0.9], ['glutgeist', 5, 0.4, 1]],
  sandwueste: [['mondkobra', 6, 0.2, 1]],
  nagadschungel: [['dschungelgeist', 6, 0.2, 1]],
  donnerklamm: [['sturmgeist', 6, 0.2, 1]],
  titanenkamm: [['schattengargoyle', 6, 0.2, 1]],
  kristallhang: [['leerenwolf', 6, 0.1, 0.9]],
  leerenschlund: [['sternenschemen', 6, 0.2, 1], ['leerenwolf', 3, 0, 0.6]],
  // seit 14.54: Schattenkarten – dieselben Nachtwesen wie auf der Lichtkarte derselben Stufe (die Nacht kennt keine Seite)
  daemmerwiesen: [['schattenwolf', 7, 0.25, 1], ['irrlicht', 5, 0.2, 0.9]],
  aschewald: [['nachtluchs', 6, 0.1, 0.9], ['mondspinne', 6, 0.4, 1]],
  knochenwueste: [['grabhyaene', 6, 0.1, 0.9], ['nachtskorpion', 6, 0.4, 1]],
  blutsteppe: [['schattendaemon', 6, 0.2, 1], ['aschegeist', 5, 0.3, 1]],
  nachtfrost: [['frostschatten', 6, 0.1, 0.9], ['nordlichtgeist', 5, 0.4, 1]],
  schattenklippen: [['mondkobra', 6, 0.2, 1]],
  schwarzmoor: [['dschungelgeist', 6, 0.2, 1]]
};
for (const z of ZONES) if (NIGHT_GROUPS[z.id]) z.night = NIGHT_GROUPS[z.id];
// seit 14.54: Nachtwanderer der Schattenkarten (Maps 11–16, eigene Liste; tag-nacht.js)
const SHADOW_NIGHT_WANDERERS = [
  ['Mondsängerin Lua', 'alte'], ['Kohlenwächter Grim', 'bauer'], ['Knochenleser Tarr', 'moench'],
  ['Blutjägerin Rhea', 'jaegerin'], ['Reifseherin Nuri', 'alte'], ['Moorläufer Fen', 'jaegerin']
];

// Nachtwanderer: tauchen nachts draußen auf (die Wanderer des Tages schlafen dann) und vergeben Nachtjagden.
// Je Map einer, in Kazehana dazu die Nachtwächterin am Brunnen.
const NIGHT_WANDERERS = [
  ['Mondpriester Tsuki', 'moench'], ['Geisterjägerin Kage', 'jaegerin'], ['Laternenträger Hiro', 'bauer'],
  ['Sterndeuterin Hoshi', 'alte'], ['Totengräber Bram', 'bauer'], ['Schattenläuferin Yoru', 'jaegerin'],
  ['Eulenmönch Fuku', 'moench'], ['Kräuterhexe Nyx', 'alte'], ['Nachtfalke Ren', 'jaegerin'],
  ['Sternwächterin Lyra', 'jaegerin'] // seit 13.85: Map 10
];
const NIGHT_KILL = 12;
