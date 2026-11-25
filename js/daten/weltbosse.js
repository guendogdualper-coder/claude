// Weltbosse (seit 15.75, weltboss.js, docs/endgame-langzeit.md): riesige Gegner, die nach Zeitplan auf den Lv-80-Karten
// erscheinen und gegen die alle Spieler in der Nähe zusammen kämpfen. Aussehen eines Monsters ihrer Karte (look),
// stark vergrößert (lookScale); Angriffe wie ein Dungeon-Boss (Stampfer, Salve, Verstärkung).
// Leben: hpMul für bis zu drei Spieler, ab dem vierten in der Nähe beim Erscheinen je +25 % (WB.hpPerPlayer).
Object.assign(MONSTER_TYPES, {
  wb_kristall: {
    name: 'Kristallkoloss Varnhal', level: 80, shape: 'brute', color: '#5a4aa0', size: 60, speed: 74, range: 72, cooldown: 2.0, aggressive: true,
    hpMul: 650, atkMul: 3.3, look: 'kristallgolem', lookScale: 3.0, weltboss: true,
    boss: { color: '#b8a8ff', slam: 240, volley: 10, shot: '#cfc0ff', summon: 'kristallgolem', mat: 'kristallgolem' }
  },
  wb_hain: {
    name: 'Seelenschemen Aurun', level: 80, shape: 'ghost', color: '#7a86d8', size: 52, speed: 96, range: 260, cooldown: 1.9, aggressive: true, ranged: true,
    hpMul: 600, atkMul: 3.2, look: 'abgrundgeist', lookScale: 3.4, shot: '#b8a8ff', weltboss: true,
    boss: { color: '#a8b4ff', slam: 220, volley: 12, shot: '#cfd6ff', summon: 'abgrundgeist', mat: 'abgrundgeist' }
  },
  wb_riff: {
    name: 'Riffkönig Morvath', level: 80, shape: 'beast', color: '#3e6a7a', size: 58, speed: 100, range: 70, cooldown: 1.8, aggressive: true,
    hpMul: 650, atkMul: 3.3, look: 'riffscherer', lookScale: 3.0, weltboss: true,
    boss: { color: '#7fd8e8', slam: 230, volley: 9, shot: '#9fe8f0', summon: 'riffscherer', mat: 'riffscherer' }
  },
  wb_sonne: {
    name: 'Sonnenkoloss Helyra', level: 80, shape: 'brute', color: '#d8c89a', size: 62, speed: 72, range: 74, cooldown: 2.1, aggressive: true,
    hpMul: 680, atkMul: 3.35, look: 'sonnenkoloss', lookScale: 3.0, weltboss: true,
    boss: { color: '#ffd86a', slam: 250, volley: 10, shot: '#ffe8a0', summon: 'sonnenkoloss', mat: 'sonnenkoloss' }
  }
});
