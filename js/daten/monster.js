// Monsterarten. Lebens-, Angriffs- und Erfahrungswerte werden aus der Stufe
// berechnet (monsterStats) und mit hpMul/atkMul an die Art angepasst.
//
// shape       Aussehen in zeichnen.js
// aggressive  greift von selbst an, sobald du in die Nähe kommst
// ranged      schießt aus der Distanz (range = Schussweite)
const MONSTER_TYPES = {
  hund: { name: 'Wilder Hund', level: 1, shape: 'beast', color: '#8a6748', size: 12, speed: 95, range: 26, cooldown: 1.5 },
  wolf: { name: 'Wolf', level: 3, shape: 'beast', color: '#7d8188', size: 13, speed: 110, range: 26, cooldown: 1.5, aggressive: true },
  alphawolf: { name: 'Alpha-Wolf', level: 6, shape: 'beast', color: '#4d525a', size: 16, speed: 115, range: 28, cooldown: 1.4, aggressive: true, hpMul: 1.6, atkMul: 1.2 },
  wildschwein: { name: 'Wildschwein', level: 8, shape: 'boar', color: '#5a3f2e', size: 15, speed: 105, range: 26, cooldown: 1.5, hpMul: 1.3 },
  bandit: { name: 'Bandit', level: 11, shape: 'humanoid', color: '#6d5a3e', accent: '#9a2f2a', size: 12, speed: 100, range: 28, cooldown: 1.4, aggressive: true },
  banditschuetze: { name: 'Bandit-Schütze', level: 13, shape: 'humanoid', color: '#4f6a3e', accent: '#9a2f2a', size: 12, speed: 95, range: 220, cooldown: 2, aggressive: true, ranged: true, hpMul: 0.8, bow: true },
  ork: { name: 'Ork-Krieger', level: 16, shape: 'orc', color: '#5e7d3a', size: 15, speed: 100, range: 30, cooldown: 1.5, aggressive: true, hpMul: 1.3 },
  orkschamane: { name: 'Ork-Schamane', level: 19, shape: 'orc', color: '#3e6d5d', size: 14, speed: 90, range: 230, cooldown: 2.2, aggressive: true, ranged: true, hpMul: 0.9, atkMul: 1.2, shot: '#9be2ff' },
  oger: { name: 'Steinoger', level: 23, shape: 'brute', color: '#7a7466', size: 21, speed: 75, range: 34, cooldown: 2, aggressive: true, hpMul: 2, atkMul: 1.3 },
  daemon: { name: 'Dämon', level: 27, shape: 'demon', color: '#8e2f3a', size: 14, speed: 120, range: 28, cooldown: 1.3, aggressive: true, atkMul: 1.25 }
};

function monsterStats(level, hpMul = 1, atkMul = 1) {
  return {
    maxHp: Math.round((40 + 18 * Math.pow(level - 1, 1.1)) * hpMul),
    atk: Math.round((3 + 2 * (level - 1)) * atkMul),
    def: Math.round(1 + (level - 1)),
    xp: Math.round((10 * Math.pow(level, 1.5) + 2) * hpMul),
    gold: [level * 2, level * 4 + 2]
  };
}

// Seelensteine: tauchen in jeder Jagdzone auf, rufen beim Angreifen Monster herbei
// und geben viel Erfahrung, Gold und Seelensplitter.
const STONE = {
  name: 'Seelenstein',
  hpMul: 9,
  xpMul: 10,
  goldMul: 10,
  waves: [0.95, 0.7, 0.45, 0.2], // bei diesen Lebensanteilen kommt Verstärkung
  respawn: [60, 90]
};
