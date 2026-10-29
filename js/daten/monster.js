// Monsterarten. Lebens-, Angriffs- und Erfahrungswerte werden aus der Stufe
// berechnet (monsterStats) und mit hpMul/atkMul an die Art angepasst.
//
// shape       grobe Gestalt (Vierbeiner bekommen beim Angriff Krallenspuren)
// aggressive  greift von selbst an, sobald du in die Nähe kommst
// ranged      schießt aus der Distanz (range = Schussweite)
const MONSTER_TYPES = {
  // Sonnenwiesen, Stufe 1–9
  hund: { name: 'Wilder Hund', level: 1, shape: 'beast', color: '#8a6748', size: 12, speed: 95, range: 26, cooldown: 1.5 },
  wolf: { name: 'Wolf', level: 3, shape: 'beast', color: '#7d8188', size: 13, speed: 110, range: 26, cooldown: 1.5, aggressive: true },
  alphawolf: { name: 'Alpha-Wolf', level: 6, shape: 'beast', color: '#4d525a', size: 16, speed: 115, range: 28, cooldown: 1.4, aggressive: true, hpMul: 1.6, atkMul: 1.2 },
  wildschwein: { name: 'Wildschwein', level: 8, shape: 'boar', color: '#5a3f2e', size: 15, speed: 105, range: 26, cooldown: 1.5, hpMul: 1.3 },
  // Dunkelwald, Stufe 10–19
  bandit: { name: 'Bandit', level: 11, shape: 'humanoid', color: '#6d5a3e', accent: '#9a2f2a', size: 12, speed: 100, range: 28, cooldown: 1.4, aggressive: true },
  banditschuetze: { name: 'Bandit-Schütze', level: 13, shape: 'humanoid', color: '#4f6a3e', accent: '#9a2f2a', size: 12, speed: 95, range: 220, cooldown: 2, aggressive: true, ranged: true, hpMul: 0.8, bow: true },
  waldspinne: { name: 'Waldspinne', level: 15, shape: 'beast', color: '#3a3328', size: 14, speed: 115, range: 28, cooldown: 1.3, aggressive: true, hpMul: 1.1 },
  braunbaer: { name: 'Braunbär', level: 18, shape: 'beast', color: '#6a4a30', size: 19, speed: 95, range: 32, cooldown: 1.8, aggressive: true, hpMul: 1.9, atkMul: 1.2 },
  // Orktal, Stufe 20–29
  ork: { name: 'Ork-Krieger', level: 21, shape: 'orc', color: '#5e7d3a', size: 15, speed: 100, range: 30, cooldown: 1.5, aggressive: true, hpMul: 1.3 },
  orkschamane: { name: 'Ork-Schamane', level: 24, shape: 'orc', color: '#3e6d5d', size: 14, speed: 90, range: 230, cooldown: 2.2, aggressive: true, ranged: true, hpMul: 0.9, atkMul: 1.2, shot: '#9be2ff' },
  skorpion: { name: 'Wüstenskorpion', level: 26, shape: 'beast', color: '#b07a3a', size: 15, speed: 105, range: 30, cooldown: 1.3, aggressive: true, hpMul: 1.2, atkMul: 1.15 },
  orkhauptmann: { name: 'Ork-Hauptmann', level: 28, shape: 'orc', color: '#4a6a2e', size: 17, speed: 100, range: 32, cooldown: 1.5, aggressive: true, hpMul: 1.9, atkMul: 1.3 },
  // Ödland, Stufe 30–39
  oger: { name: 'Steinoger', level: 32, shape: 'brute', color: '#7a7466', size: 21, speed: 75, range: 34, cooldown: 2, aggressive: true, hpMul: 2, atkMul: 1.3 },
  daemon: { name: 'Dämon', level: 35, shape: 'demon', color: '#8e2f3a', size: 14, speed: 120, range: 28, cooldown: 1.3, aggressive: true, atkMul: 1.25 },
  hoellenhund: { name: 'Höllenhund', level: 37, shape: 'beast', color: '#3a2a2a', size: 16, speed: 125, range: 28, cooldown: 1.2, aggressive: true, hpMul: 1.3, atkMul: 1.2 },
  // Frostgipfel, Stufe 40–49
  eiswolf: { name: 'Eiswolf', level: 41, shape: 'beast', color: '#c8d8e8', size: 15, speed: 120, range: 28, cooldown: 1.3, aggressive: true, hpMul: 1.2 },
  yeti: { name: 'Yeti', level: 45, shape: 'brute', color: '#e8eef4', size: 21, speed: 85, range: 34, cooldown: 1.9, aggressive: true, hpMul: 2.1, atkMul: 1.3 },
  frostgeist: { name: 'Frostgeist', level: 48, shape: 'ghost', color: '#bfe8ff', size: 13, speed: 95, range: 230, cooldown: 2.1, aggressive: true, ranged: true, hpMul: 0.9, atkMul: 1.3, shot: '#bfe8ff' },
  // Totenmoor, Stufe 50–59
  untoter: { name: 'Untoter Krieger', level: 51, shape: 'humanoid', color: '#8a8470', size: 13, speed: 95, range: 30, cooldown: 1.4, aggressive: true, hpMul: 1.3 },
  sumpfhexe: { name: 'Sumpfhexe', level: 54, shape: 'humanoid', color: '#4a5a3a', size: 12, speed: 90, range: 230, cooldown: 2, aggressive: true, ranged: true, hpMul: 0.9, atkMul: 1.3, shot: '#8fd16a' },
  ghul: { name: 'Ghul', level: 57, shape: 'brute', color: '#6a7a5a', size: 19, speed: 100, range: 32, cooldown: 1.6, aggressive: true, hpMul: 1.9, atkMul: 1.3 },
  // Feuerberg, Stufe 60–70
  lavagolem: { name: 'Lavagolem', level: 62, shape: 'brute', color: '#3a2a26', size: 22, speed: 70, range: 36, cooldown: 2.1, aggressive: true, hpMul: 2.3, atkMul: 1.35 },
  feuerdaemon: { name: 'Feuerdämon', level: 66, shape: 'demon', color: '#c8402f', size: 15, speed: 125, range: 30, cooldown: 1.2, aggressive: true, hpMul: 1.2, atkMul: 1.35 },
  feuerdrache: { name: 'Feuerdrache', level: 69, shape: 'beast', color: '#a82a1a', size: 20, speed: 105, range: 170, cooldown: 1.8, aggressive: true, ranged: true, hpMul: 2.2, atkMul: 1.4, shot: '#ff9a4a' },

  // Map 2: Schlangental, Stufe 30–50
  sandviper: { name: 'Sandviper', level: 31, shape: 'snake', color: '#c8a060', size: 13, speed: 115, range: 28, cooldown: 1.3, aggressive: true, hpMul: 1.1, atkMul: 1.1 },
  klapperschlange: { name: 'Klapperschlange', level: 34, shape: 'snake', color: '#a07a4a', size: 14, speed: 105, range: 30, cooldown: 1.4, aggressive: true, hpMul: 1.3, atkMul: 1.15 },
  kobra: { name: 'Königskobra', level: 37, shape: 'snake', color: '#3a4a2a', size: 15, speed: 100, range: 200, cooldown: 1.9, aggressive: true, ranged: true, hpMul: 1.1, atkMul: 1.25, shot: '#c6f08a' },
  riesenpython: { name: 'Riesenpython', level: 42, shape: 'snake', color: '#4a6a3a', size: 20, speed: 85, range: 36, cooldown: 1.8, aggressive: true, hpMul: 2.2, atkMul: 1.3 },
  naga: { name: 'Naga-Krieger', level: 46, shape: 'snake', color: '#2a7a6a', size: 16, speed: 105, range: 34, cooldown: 1.4, aggressive: true, hpMul: 1.5, atkMul: 1.3 },
  nagapriesterin: { name: 'Naga-Priesterin', level: 49, shape: 'snake', color: '#6a3a8a', size: 15, speed: 95, range: 230, cooldown: 2, aggressive: true, ranged: true, hpMul: 1.1, atkMul: 1.35, shot: '#c89aff' },
  // Map 3: Donnerklamm, Stufe 50–75
  trollkrieger: { name: 'Trollkrieger', level: 52, shape: 'brute', color: '#5a8a6a', size: 19, speed: 95, range: 34, cooldown: 1.7, aggressive: true, hpMul: 1.9, atkMul: 1.3 },
  harpyie: { name: 'Harpyie', level: 55, shape: 'demon', color: '#8a6a9a', size: 14, speed: 130, range: 220, cooldown: 1.7, aggressive: true, ranged: true, hpMul: 1, atkMul: 1.3, shot: '#e0c8ff' },
  minotaurus: { name: 'Minotaurus', level: 58, shape: 'brute', color: '#7a4a2a', size: 21, speed: 110, range: 36, cooldown: 1.6, aggressive: true, hpMul: 2.1, atkMul: 1.4 },
  steintitan: { name: 'Steintitan', level: 64, shape: 'brute', color: '#8a8478', size: 24, speed: 70, range: 40, cooldown: 2.2, aggressive: true, hpMul: 2.6, atkMul: 1.4 },
  gargoyle: { name: 'Gargoyle', level: 68, shape: 'demon', color: '#6a6a72', size: 15, speed: 125, range: 30, cooldown: 1.2, aggressive: true, hpMul: 1.3, atkMul: 1.4 },
  donnerriese: { name: 'Donnerriese', level: 72, shape: 'brute', color: '#7a8aa8', size: 25, speed: 80, range: 200, cooldown: 2.2, aggressive: true, ranged: true, hpMul: 2.4, atkMul: 1.45, shot: '#9fd0ff' },

  // Dungeons (dungeon: kommen nur dort vor). Bosse haben eigene Fähigkeiten (boss):
  //   slam    Radius eines Stampfers, der vorher als roter Kreis am Boden angekündigt wird
  //   volley  Zahl der Geschosse einer Salve (0 = keine), shot: ihre Farbe
  //   summon  ruft bei 66 % und 33 % Leben Verstärkung dieser Art
//   mat     welche Monster-Teile für den Schmied der Boss fallen lässt
  hoehlenspinne: { name: 'Höhlenspinne', level: 20, shape: 'beast', color: '#4a3a5a', size: 14, speed: 120, range: 28, cooldown: 1.3, aggressive: true, hpMul: 1.1, dungeon: true },
  giftspinne: { name: 'Giftspeierin', level: 22, shape: 'beast', color: '#3a5a2a', size: 14, speed: 100, range: 210, cooldown: 2, aggressive: true, ranged: true, hpMul: 0.9, atkMul: 1.1, shot: '#8fd16a', dungeon: true },
  spinnenkoenigin: {
    name: 'Spinnenkönigin', level: 25, shape: 'beast', color: '#5a3a7a', size: 28, speed: 95, range: 46, cooldown: 1.5, aggressive: true, hpMul: 22, atkMul: 1.5, dungeon: true,
    boss: { color: '#b48cff', slam: 120, volley: 6, shot: '#c6f08a', summon: 'hoehlenspinne', mat: 'waldspinne' }
  },
  orkelite: { name: 'Ork-Elitewache', level: 31, shape: 'orc', color: '#4a5a3a', size: 16, speed: 100, range: 32, cooldown: 1.5, aggressive: true, hpMul: 1.6, atkMul: 1.2, dungeon: true },
  orkberserker: { name: 'Ork-Berserker', level: 33, shape: 'orc', color: '#7a3a2a', size: 16, speed: 125, range: 30, cooldown: 1.1, aggressive: true, hpMul: 1.3, atkMul: 1.3, dungeon: true },
  kriegsherr: {
    name: 'Kriegsherr Gor\'thak', level: 36, shape: 'orc', color: '#3a4a2a', size: 26, speed: 105, range: 50, cooldown: 1.6, aggressive: true, hpMul: 24, atkMul: 1.6, dungeon: true,
    boss: { color: '#ff8a4a', slam: 140, volley: 3, shot: '#e8dcc0', summon: 'orkelite', mat: 'orkhauptmann' }
  },
  eisgolem: { name: 'Eisgolem', level: 47, shape: 'brute', color: '#a8cce6', size: 21, speed: 75, range: 36, cooldown: 2, aggressive: true, hpMul: 2.2, atkMul: 1.35, dungeon: true },
  eiskoenig: {
    name: 'Eiskönig Hrim', level: 52, shape: 'ghost', color: '#9fe8ff', size: 26, speed: 90, range: 60, cooldown: 1.7, aggressive: true, hpMul: 26, atkMul: 1.6, dungeon: true,
    boss: { color: '#9fe8ff', slam: 150, volley: 10, shot: '#bfe8ff', summon: 'frostgeist', mat: 'yeti' }
  },
  drachenbrut: { name: 'Drachenbrut', level: 65, shape: 'beast', color: '#c8501a', size: 16, speed: 120, range: 30, cooldown: 1.3, aggressive: true, hpMul: 1.3, atkMul: 1.3, dungeon: true },
  urdrache: {
    name: 'Urdrache Vharak', level: 72, shape: 'beast', color: '#2a1a2a', size: 34, speed: 100, range: 64, cooldown: 1.8, aggressive: true, hpMul: 30, atkMul: 1.7, dungeon: true,
    boss: { color: '#ff6a3a', slam: 170, volley: 7, shot: '#ff9a4a', summon: 'drachenbrut', mat: 'feuerdrache' }
  },
  // Version 3.3: Banditenkeller, Totengruft, Schlangentempel, Titanenschmiede
  kellerwache: { name: 'Kellerwache', level: 12, shape: 'humanoid', color: '#5a4a32', accent: '#9a2f2a', size: 13, speed: 105, range: 30, cooldown: 1.4, aggressive: true, hpMul: 1.3, dungeon: true },
  armbrustschuetze: { name: 'Armbrustschütze', level: 14, shape: 'humanoid', color: '#4a5a3a', accent: '#9a2f2a', size: 12, speed: 95, range: 220, cooldown: 2, aggressive: true, ranged: true, hpMul: 0.9, bow: true, dungeon: true },
  banditenfuerst: {
    name: 'Banditenfürst Raku', level: 17, shape: 'humanoid', color: '#3a2a22', size: 24, speed: 105, range: 46, cooldown: 1.5, aggressive: true, hpMul: 18, atkMul: 1.4, dungeon: true,
    boss: { color: '#ffb04a', slam: 110, volley: 5, shot: '#e8dcc0', summon: 'kellerwache', mat: 'bandit' }
  },
  grabwaechter: { name: 'Grabwächter', level: 39, shape: 'humanoid', color: '#8a8470', size: 14, speed: 95, range: 32, cooldown: 1.5, aggressive: true, hpMul: 1.6, atkMul: 1.2, dungeon: true },
  seelenfresser: { name: 'Seelenfresser', level: 41, shape: 'ghost', color: '#8a6ac8', size: 13, speed: 100, range: 220, cooldown: 2, aggressive: true, ranged: true, hpMul: 1, atkMul: 1.3, shot: '#c89aff', dungeon: true },
  gruftkoenig: {
    name: 'Gruftkönig Morvan', level: 45, shape: 'humanoid', color: '#4a4438', size: 26, speed: 95, range: 52, cooldown: 1.6, aggressive: true, hpMul: 25, atkMul: 1.6, dungeon: true,
    boss: { color: '#a774e0', slam: 145, volley: 8, shot: '#c89aff', summon: 'grabwaechter', mat: 'untoter' }
  },
  nagakoenigin: {
    name: 'Naga-Königin Sseth', level: 52, shape: 'snake', color: '#2a6a5a', size: 28, speed: 100, range: 56, cooldown: 1.6, aggressive: true, hpMul: 27, atkMul: 1.6, dungeon: true,
    boss: { color: '#7ad8c8', slam: 150, volley: 9, shot: '#c89aff', summon: 'naga', mat: 'naga' }
  },
  titanenkoenig: {
    name: 'Titanenkönig Kroth', level: 70, shape: 'brute', color: '#6a6458', size: 34, speed: 80, range: 66, cooldown: 2, aggressive: true, hpMul: 30, atkMul: 1.7, dungeon: true,
    boss: { color: '#ffb04a', slam: 190, volley: 6, shot: '#ffb04a', summon: 'gargoyle', mat: 'steintitan' }
  },
  // Version 6.5: Endbosse der Maps – riesig, mit Mechaniken, gebaut für fünf Spieler (Tank, Heiler, Schaden).
  // Seit 6.6 doppeltes Leben und schneller (allein oder zu zweit kaum zu schaffen).
  // raid.art: Aussehen (vergrößert und geschmückt), raid.scale: Größe in 3D, raid.adds: Helfer bei Phasenwechseln
  fenris: {
    name: 'Fenris, der Urwolf', level: 14, shape: 'beast', color: '#3a3e46', size: 60, speed: 128, range: 90, cooldown: 2.2, aggressive: true, hpMul: 300, atkMul: 2.4, raidBoss: true,
    boss: { color: '#ffcc4a', slam: 190, volley: 8, shot: '#ffe08a', summon: 'alphawolf', mat: 'alphawolf' }, raid: { art: 'alphawolf', scale: 3.4, map: 1 }
  },
  ursus: {
    name: 'Ursus, der Waldtyrann', level: 24, shape: 'beast', color: '#4a3220', size: 64, speed: 115, range: 95, cooldown: 2.3, aggressive: true, hpMul: 310, atkMul: 2.4, raidBoss: true,
    boss: { color: '#9be07a', slam: 200, volley: 8, shot: '#c8ff6a', summon: 'braunbaer', mat: 'braunbaer' }, raid: { art: 'braunbaer', scale: 3.0, map: 4 }
  },
  gorbag: {
    name: 'Großkhan Gorbag', level: 34, shape: 'orc', color: '#3a5a22', size: 64, speed: 122, range: 95, cooldown: 2.2, aggressive: true, hpMul: 320, atkMul: 2.4, raidBoss: true,
    boss: { color: '#ff8a4a', slam: 210, volley: 6, shot: '#e8dcc0', summon: 'orkhauptmann', mat: 'orkhauptmann' }, raid: { art: 'orkhauptmann', scale: 3.0, map: 5 }
  },
  azaroth: {
    name: 'Höllenfürst Azaroth', level: 44, shape: 'demon', color: '#6a1a24', size: 64, speed: 135, range: 95, cooldown: 2.1, aggressive: true, hpMul: 330, atkMul: 2.5, raidBoss: true,
    boss: { color: '#ff4a2a', slam: 220, volley: 10, shot: '#ff7a3a', summon: 'hoellenhund', mat: 'daemon' }, raid: { art: 'daemon', scale: 3.4, map: 6 }
  },
  ymir: {
    name: 'Frostriese Ymir', level: 54, shape: 'brute', color: '#d8e8f4', size: 68, speed: 108, range: 100, cooldown: 2.4, aggressive: true, hpMul: 340, atkMul: 2.5, raidBoss: true,
    boss: { color: '#9fe8ff', slam: 230, volley: 12, shot: '#bfe8ff', summon: 'eiswolf', mat: 'yeti' }, raid: { art: 'yeti', scale: 2.6, map: 7 }
  },
  vritra: {
    name: 'Schlangengöttin Vritra', level: 55, shape: 'snake', color: '#1a5a4a', size: 64, speed: 128, range: 95, cooldown: 2.2, aggressive: true, hpMul: 340, atkMul: 2.5, raidBoss: true,
    boss: { color: '#7ad8c8', slam: 220, volley: 10, shot: '#9fe8d8', summon: 'naga', mat: 'naga' }, raid: { art: 'nagakoenigin', scale: 2.4, map: 2 }
  },
  morrak: {
    name: 'Lichkönig Morrak', level: 64, shape: 'humanoid', color: '#3a3a30', size: 64, speed: 122, range: 100, cooldown: 2.2, aggressive: true, hpMul: 350, atkMul: 2.6, raidBoss: true,
    boss: { color: '#8fe36a', slam: 230, volley: 12, shot: '#c6f08a', summon: 'ghul', mat: 'untoter' }, raid: { art: 'gruftkoenig', scale: 2.6, map: 8 }
  },
  ignar: {
    name: 'Weltendrache Ignar', level: 76, shape: 'beast', color: '#3a1010', size: 72, speed: 135, range: 110, cooldown: 2.3, aggressive: true, hpMul: 370, atkMul: 2.7, raidBoss: true,
    boss: { color: '#ff6a2a', slam: 250, volley: 12, shot: '#ffb04a', summon: 'drachenbrut', mat: 'feuerdrache' }, raid: { art: 'urdrache', scale: 2.6, map: 9 }
  },
  tarkon: {
    name: 'Donnertitan Tarkon', level: 78, shape: 'brute', color: '#5a5a66', size: 72, speed: 108, range: 110, cooldown: 2.4, aggressive: true, hpMul: 380, atkMul: 2.7, raidBoss: true,
    boss: { color: '#9fd0ff', slam: 250, volley: 10, shot: '#cfe8ff', summon: 'gargoyle', mat: 'donnerriese' }, raid: { art: 'donnerriese', scale: 2.4, map: 3 }
  }
};

// Schwierigkeit: Bis Stufe 15 werden Monster schrittweise zäher und stärker als die Grundformel,
// danach wächst der Abstand mit jeder Stufe deutlich weiter (seit Version 5.7–6.2 stärker), damit man
// in den hohen Gebieten gute, aufgewertete Ausrüstung braucht. Die ersten Stufen bleiben leicht.
// Erfahrung und Gold hängen nicht davon ab.
function monsterPower(level) {
  const ramp = Math.min(1, (level - 1) / 14);
  const extra = Math.max(0, level - 15);
  // ab Stufe 15 linear, dazu ein quadratischer Anteil: je höher, desto stärker wächst der Abstand.
  // Seit Version 6.2 zwischen Stufe 15 und 30 zusätzlich bis +20 % Leben und +40 % Angriff
  const tough = Math.min(1, extra / 15);
  return {
    hp: (1 + ramp * 1.6 + extra * 0.11 + extra * extra * 0.005) * (1 + 0.2 * tough),
    atk: (1 + ramp * 1.4 + extra * 0.1 + extra * extra * 0.002) * (1 + 0.4 * tough),
    def: 1 + extra * 0.05
  };
}

function monsterStats(level, hpMul = 1, atkMul = 1) {
  const pw = monsterPower(level);
  return {
    maxHp: Math.round((40 + 18 * Math.pow(level - 1, 1.1)) * hpMul * pw.hp),
    atk: Math.round((3 + 2 * (level - 1)) * atkMul * pw.atk),
    def: Math.round((1 + (level - 1)) * pw.def),
    // Bosse und zähe Monster geben mehr Erfahrung, aber höchstens das Achtfache
    xp: Math.round((10 * Math.pow(level, 1.5) + 2) * Math.min(hpMul, 8)),
    gold: [level * 2, level * 4 + 2]
  };
}

// Seelensteine: tauchen in jeder Jagdzone auf, rufen beim Angreifen Monster herbei
// und geben viel Erfahrung, Gold und Seelensplitter.
const STONE = {
  hpMul: 12,
  xpMul: 6,
  goldMul: 10,
  // Verstärkung: nach jeweils 10–15 % Schaden eine Welle mit der Stufe des Steins (stoneWaveMarks)
  // Ein zerstörter Stein bleibt lange weg und taucht dann an einer neuen Stelle im Gebiet auf
  respawn: [600, 900]
};

// Die 14 Seelensteine, von Stufe 5 bis 70 in Fünferschritten. Jeder sieht anders aus
// und lässt andere Beute fallen.
//
// look   shape: spire (Spitze), obelisk, cluster (Kristallgruppe), boulder (Brocken mit Glutrissen),
//               twin (zwei Spitzen), monolith (Platte mit schwebendem Ring)
//        base/top: Gestein, rune: leuchtende Zeichen, glow: Schein um den Stein
// focus  wovon dieser Stein besonders viel fallen lässt (siehe stoneDrops)
const STONE_TYPES = [
  { level: 5, name: 'Stein der Trauer', look: { shape: 'spire', base: '#4a5262', top: '#66708a', rune: '#9fc8ff', glow: '#7fa8e0' }, focus: 'potions', drop: 'viele Tränke' },
  { level: 10, name: 'Stein der Wut', look: { shape: 'obelisk', base: '#5a2e26', top: '#7a4232', rune: '#ff6a4a', glow: '#e0482a' }, focus: 'weapons', drop: 'oft Waffen' },
  { level: 15, name: 'Stein der Gier', look: { shape: 'cluster', base: '#2e4a36', top: '#3e6a48', rune: '#ffd34d', glow: '#e8c46a' }, focus: 'gold', drop: 'dreimal so viel Gold' },
  { level: 20, name: 'Stein der Dornen', look: { shape: 'spire', base: '#4a3a2a', top: '#6a5238', rune: '#9be07a', glow: '#6ab04a', thorns: true }, focus: 'armor', drop: 'oft Rüstungsteile' },
  { level: 25, name: 'Stein der Schwärze', look: { shape: 'boulder', base: '#1e1a24', top: '#2e2838', rune: '#c58cff', glow: '#8a5ad0' }, focus: 'scrolls', drop: 'Segensschriftrollen' },
  { level: 30, name: 'Stein der Asche', look: { shape: 'obelisk', base: '#4a4644', top: '#6a6460', rune: '#ffb04a', glow: '#ff8a3a' }, focus: 'boniPlus', drop: 'viele Verstärkungen' },
  { level: 35, name: 'Stein der Glut', look: { shape: 'boulder', base: '#3a1a14', top: '#5a2a1e', rune: '#ff7a2a', glow: '#ff5a1a', lava: true }, focus: 'splinters', drop: 'viele Seelensplitter' },
  { level: 40, name: 'Stein der Schatten', look: { shape: 'twin', base: '#2a2238', top: '#3e3254', rune: '#b48cff', glow: '#6a4aa8', smoke: true }, focus: 'switcher', drop: 'viele Switcher' },
  { level: 45, name: 'Stein des Frostes', look: { shape: 'cluster', base: '#6a9ac8', top: '#bfe8ff', rune: '#ffffff', glow: '#9fd8ff', ice: true }, focus: 'boni5', drop: 'Seltene Verstärkungen' },
  { level: 50, name: 'Stein der Stille', look: { shape: 'monolith', base: '#b8b4aa', top: '#e0dcd2', rune: '#5ad0e0', glow: '#8fe3f0' }, focus: 'star', drop: 'Sternensteine' },
  { level: 55, name: 'Stein der Fäulnis', look: { shape: 'twin', base: '#3a4228', top: '#4e5a34', rune: '#a8f04a', glow: '#7ad03a', smoke: true }, focus: 'rot', drop: 'Tränke und viel Gold' },
  { level: 60, name: 'Stein der Pein', look: { shape: 'spire', base: '#5a0e16', top: '#8a1a24', rune: '#1a0a0a', glow: '#ff3a4a', crystal: true }, focus: 'gear', drop: 'Ausrüstung mit +1 bis +2' },
  { level: 65, name: 'Stein der Flamme', look: { shape: 'monolith', base: '#1a1416', top: '#2e2428', rune: '#ff9a2a', glow: '#ff6a1a', lava: true }, focus: 'flame', drop: 'Waffen, 5. Bonus und Sternensteine' },
  { level: 70, name: 'Stein des Untergangs', look: { shape: 'monolith', base: '#141018', top: '#2a2030', rune: '#ffd34d', glow: '#d07aff', crown: true }, focus: 'all', drop: 'von allem mehr' }
];

function stoneType(level) {
  return STONE_TYPES.find((s) => s.level === level) || STONE_TYPES[0];
}

// Beute eines Seelensteins. Höhere Steine geben mehr, der focus verstärkt eine Sorte.
// Materialien: [Chance, min, max]
function stoneDrops(type) {
  const t = STONE_TYPES.indexOf(type);
  const d = {
    mats: {
      boniPlus: [Math.min(0.95, 0.65 + t * 0.02), 1, 2 + Math.floor(t / 4)],
      switcher: [Math.min(0.9, 0.4 + t * 0.03), 1, 1 + Math.floor(t / 5)],
      boni5: [Math.min(0.6, 0.1 + t * 0.025), 1, 1],
      star: [Math.min(0.5, 0.06 + t * 0.02), 1, 1 + Math.floor(t / 10)]
    },
    gear: 0.55, plus: [0, 2], slots: null, gold: 1, potions: [0, 1], scroll: 0.25, splinters: [2 + Math.floor(t / 3), 4 + Math.floor(t / 2)]
  };
  const boost = (id, f) => { d.mats[id][0] = Math.min(1, d.mats[id][0] * f); d.mats[id][2] += 1; };
  switch (type.focus) {
    case 'potions': d.potions = [2, 4]; break;
    case 'weapons': d.slots = ['waffe']; d.gear = 0.75; break;
    case 'gold': d.gold = 3; break;
    case 'armor': d.slots = ['ruestung', 'helm', 'schultern', 'umhang', 'schild', 'schuhe', 'guertel']; d.gear = 0.75; break;
    case 'scrolls': d.scroll = 0.8; break;
    case 'boniPlus': boost('boniPlus', 1.5); break;
    case 'splinters': d.splinters = d.splinters.map((n) => n * 2); break;
    case 'switcher': boost('switcher', 2); break;
    case 'boni5': boost('boni5', 2); break;
    case 'star': boost('star', 2); break;
    case 'rot': d.potions = [2, 3]; d.gold = 2; break;
    case 'gear': d.gear = 0.85; d.plus = [1, 2]; break;
    case 'flame': d.slots = ['waffe']; d.gear = 0.7; boost('boni5', 1.5); boost('star', 1.5); break;
    case 'all':
      for (const id of Object.keys(d.mats)) boost(id, 1.5);
      d.gear = 1; d.plus = [1, 2]; d.gold = 2; d.scroll = 0.5; d.potions = [1, 3];
      break;
  }
  return d;
}
