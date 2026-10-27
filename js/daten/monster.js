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
  }
};

// Schwierigkeit: Bis Stufe 15 werden Monster schrittweise zäher und stärker als die Grundformel,
// danach wächst der Abstand mit jeder Stufe weiter. Die ersten Stufen bleiben leicht.
// Erfahrung und Gold hängen nicht davon ab.
function monsterPower(level) {
  const ramp = Math.min(1, (level - 1) / 14);
  const extra = Math.max(0, level - 15);
  return { hp: 1 + ramp * 1.1 + extra * 0.014, atk: 1 + ramp * 1.15 + extra * 0.012 };
}

function monsterStats(level, hpMul = 1, atkMul = 1) {
  const pw = monsterPower(level);
  return {
    maxHp: Math.round((40 + 18 * Math.pow(level - 1, 1.1)) * hpMul * pw.hp),
    atk: Math.round((3 + 2 * (level - 1)) * atkMul * pw.atk),
    def: Math.round(1 + (level - 1)),
    xp: Math.round((10 * Math.pow(level, 1.5) + 2) * hpMul),
    gold: [level * 2, level * 4 + 2]
  };
}

// Seelensteine: tauchen in jeder Jagdzone auf, rufen beim Angreifen Monster herbei
// und geben viel Erfahrung, Gold und Seelensplitter.
const STONE = {
  hpMul: 9,
  xpMul: 10,
  goldMul: 10,
  waves: [0.95, 0.7, 0.45, 0.2], // bei diesen Lebensanteilen kommt Verstärkung
  respawn: [60, 90]
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
    gear: 0.55, plus: [0, 2], slots: null, gold: 1, potions: [1, 3], scroll: 0.25, splinters: [2 + Math.floor(t / 3), 4 + Math.floor(t / 2)]
  };
  const boost = (id, f) => { d.mats[id][0] = Math.min(1, d.mats[id][0] * f); d.mats[id][2] += 1; };
  switch (type.focus) {
    case 'potions': d.potions = [4, 8]; break;
    case 'weapons': d.slots = ['waffe']; d.gear = 0.75; break;
    case 'gold': d.gold = 3; break;
    case 'armor': d.slots = ['ruestung', 'helm', 'schild', 'schuhe', 'guertel']; d.gear = 0.75; break;
    case 'scrolls': d.scroll = 0.8; break;
    case 'boniPlus': boost('boniPlus', 1.5); break;
    case 'splinters': d.splinters = d.splinters.map((n) => n * 2); break;
    case 'switcher': boost('switcher', 2); break;
    case 'boni5': boost('boni5', 2); break;
    case 'star': boost('star', 2); break;
    case 'rot': d.potions = [4, 8]; d.gold = 2; break;
    case 'gear': d.gear = 0.85; d.plus = [1, 2]; break;
    case 'flame': d.slots = ['waffe']; d.gear = 0.7; boost('boni5', 1.5); boost('star', 1.5); break;
    case 'all':
      for (const id of Object.keys(d.mats)) boost(id, 1.5);
      d.gear = 1; d.plus = [1, 2]; d.gold = 2; d.scroll = 0.5; d.potions = [3, 6];
      break;
  }
  return d;
}
