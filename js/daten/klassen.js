// Die vier spielbaren Klassen.
//
// base      Werte auf Stufe 1
// perLevel  Zuwachs pro Stufe
// basic     normaler Angriff (Leertaste)
// skills    fünf Fertigkeiten (Tasten 1–5)
//           type    legt fest, wie kampf.js die Fertigkeit ausführt
//           unlock  Stufe, ab der sie benutzt werden kann
//           dmg     Schaden als Vielfaches des Angriffswerts
//           effects Werte, die ein Buff für "duration" Sekunden verändert
const CLASSES = {
  krieger: {
    name: 'Krieger',
    role: 'Nahkampf · viel Leben',
    description: 'Hält am meisten aus und trifft ganze Gruppen auf einmal. Der sicherste Weg, Monster in Massen zu farmen.',
    color: '#9c3b33',
    trim: '#d7cdb8',
    weapon: 'sword',
    base: { hp: 160, mp: 40, atk: 14, def: 6, crit: 0.05, speed: 150 },
    perLevel: { hp: 26, mp: 5, atk: 4, def: 1.6 },
    basic: { range: 54, cooldown: 0.8, ranged: false },
    skills: [
      {
        id: 'dreifachschlag', name: 'Dreifachschlag', short: 'DS', kind: 'angriff', unlock: 1, mp: 8, cooldown: 3,
        type: 'cone', radius: 90, angle: 120, dmg: 0.75, hits: 3, knockback: 140,
        text: 'Drei schnelle Hiebe im Halbkreis vor dir. Stößt Gegner zurück.'
      },
      {
        id: 'schwertwirbel', name: 'Schwertwirbel', short: 'SW', kind: 'angriff', unlock: 3, mp: 14, cooldown: 6,
        type: 'circle', radius: 100, dmg: 1.7, stun: 0.8,
        text: 'Du wirbelst um dich selbst, triffst alle Gegner im Umkreis und betäubst sie kurz.'
      },
      {
        id: 'kampfrausch', name: 'Kampfrausch', short: 'KR', kind: 'buff', unlock: 5, mp: 20, cooldown: 30,
        type: 'buff', duration: 20, effects: { atkSpeed: 0.35, speed: 0.2 },
        text: 'Buff, 20 s: +35 % Angriffstempo und +20 % Lauftempo.'
      },
      {
        id: 'sturmangriff', name: 'Sturmangriff', short: 'SA', kind: 'angriff', unlock: 7, mp: 18, cooldown: 8,
        type: 'dash', distance: 200, radius: 42, dmg: 2.3, stun: 1,
        text: 'Du stürmst nach vorn, verletzt alle Gegner auf dem Weg und betäubst sie.'
      },
      {
        id: 'starkerkoerper', name: 'Starker Körper', short: 'SK', kind: 'buff', unlock: 10, mp: 25, cooldown: 40,
        type: 'buff', duration: 25, effects: { damageTaken: -0.35, atk: 0.15 },
        text: 'Buff, 25 s: 35 % weniger erlittener Schaden und +15 % Angriff.'
      }
    ]
  },

  ninja: {
    name: 'Ninja',
    role: 'Nahkampf · schnell und kritisch',
    description: 'Flink, trifft oft kritisch und kann sich unsichtbar machen. Schaltet einzelne starke Gegner schnell aus.',
    color: '#3f3658',
    trim: '#c9c2d9',
    weapon: 'daggers',
    base: { hp: 130, mp: 50, atk: 15, def: 4, crit: 0.12, speed: 165 },
    perLevel: { hp: 20, mp: 6, atk: 4.4, def: 1.2 },
    basic: { range: 48, cooldown: 0.55, ranged: false },
    skills: [
      {
        id: 'hinterhalt', name: 'Hinterhalt', short: 'HH', kind: 'angriff', unlock: 1, mp: 8, cooldown: 4,
        type: 'strike', range: 70, dmg: 2.6, critBonus: 0.4,
        text: 'Ein gezielter Stich mit hohem Schaden und stark erhöhter Chance auf kritische Treffer.'
      },
      {
        id: 'giftpfeil', name: 'Giftpfeil', short: 'GP', kind: 'angriff', unlock: 3, mp: 10, cooldown: 4,
        type: 'projectile', range: 360, speed: 560, dmg: 1.3, color: '#8fd16a', style: 'dart', poison: { dps: 0.35, duration: 5 },
        text: 'Fernangriff. Vergiftet das Ziel 5 Sekunden lang.'
      },
      {
        id: 'klingensturm', name: 'Klingensturm', short: 'KS', kind: 'angriff', unlock: 5, mp: 16, cooldown: 7,
        type: 'cone', radius: 80, angle: 100, dmg: 0.55, hits: 5,
        text: 'Fünf blitzschnelle Schnitte vor dir in einer Sekunde.'
      },
      {
        id: 'tarnung', name: 'Tarnung', short: 'TA', kind: 'buff', unlock: 7, mp: 22, cooldown: 30,
        type: 'buff', duration: 10, effects: { invisible: true, speed: 0.3 }, nextHitMul: 3,
        text: 'Buff, 10 s: unsichtbar, Monster verlieren dich aus den Augen. Der nächste Treffer macht dreifachen Schaden.'
      },
      {
        id: 'leichtfuessigkeit', name: 'Leichtfüßigkeit', short: 'LF', kind: 'buff', unlock: 10, mp: 20, cooldown: 35,
        type: 'buff', duration: 20, effects: { speed: 0.25, atkSpeed: 0.25, dodge: 0.25 },
        text: 'Buff, 20 s: +25 % Lauf- und Angriffstempo, 25 % Chance auszuweichen.'
      }
    ]
  },

  schamane: {
    name: 'Schamane',
    role: 'Fernkampf · Heilung',
    description: 'Kämpft mit Drachenmagie aus der Distanz, heilt sich selbst und segnet sich mit Schutz.',
    color: '#2c6f6a',
    trim: '#e0c36a',
    weapon: 'fan',
    base: { hp: 115, mp: 80, atk: 13, def: 3, crit: 0.06, speed: 150 },
    perLevel: { hp: 18, mp: 10, atk: 3.8, def: 1 },
    basic: { range: 230, cooldown: 0.9, ranged: true, color: '#8fe3d8', style: 'wind' },
    skills: [
      {
        id: 'talisman', name: 'Fliegender Talisman', short: 'FT', kind: 'angriff', unlock: 1, mp: 9, cooldown: 2.5,
        type: 'projectile', range: 340, speed: 430, dmg: 1.6, color: '#f0d27a', style: 'talisman', chain: 2,
        text: 'Ein Talisman, der vom Ziel auf zwei weitere Gegner überspringt.'
      },
      {
        id: 'drachengebruell', name: 'Drachengebrüll', short: 'DG', kind: 'angriff', unlock: 3, mp: 16, cooldown: 6,
        type: 'cone', radius: 160, angle: 70, dmg: 1.7, color: '#ff9a4a', burn: { dps: 0.3, duration: 3 },
        text: 'Drachenfeuer in einem Kegel vor dir. Setzt Gegner 3 Sekunden in Brand.'
      },
      {
        id: 'segen', name: 'Segen', short: 'SG', kind: 'buff', unlock: 5, mp: 22, cooldown: 35,
        type: 'buff', duration: 30, effects: { damageTaken: -0.25, regen: 0.015, crit: 0.1 },
        text: 'Buff, 30 s: 25 % weniger Schaden, regeneriert Leben, +10 % kritische Treffer.'
      },
      {
        id: 'blitzschlag', name: 'Blitzschlag', short: 'BS', kind: 'angriff', unlock: 7, mp: 24, cooldown: 9,
        type: 'blast', range: 300, radius: 90, dmg: 2.2, stun: 0.8,
        text: 'Ein Blitz schlägt beim Ziel ein, trifft alle Gegner in der Nähe und betäubt sie.'
      },
      {
        id: 'heilung', name: 'Heilung', short: 'HE', kind: 'heilung', unlock: 10, mp: 30, cooldown: 20,
        type: 'heal', amount: 0.4, duration: 12, effects: { atk: 0.2 },
        text: 'Heilt 40 % deines Lebens und gibt 12 s lang +20 % Angriff.'
      }
    ]
  },

  nekromant: {
    name: 'Nekromant',
    role: 'Fernkampf · Beschwörung',
    description: 'Beherrscht Seelen und Knochen. Lässt Skelette für sich kämpfen und saugt Gegnern das Leben aus.',
    color: '#334a31',
    trim: '#cfd8b0',
    weapon: 'staff',
    base: { hp: 120, mp: 75, atk: 13, def: 3, crit: 0.05, speed: 148 },
    perLevel: { hp: 19, mp: 9, atk: 3.9, def: 1.1 },
    basic: { range: 230, cooldown: 0.9, ranged: true, color: '#a7e37f' },
    skills: [
      {
        id: 'seelenpfeil', name: 'Seelenpfeil', short: 'SP', kind: 'angriff', unlock: 1, mp: 8, cooldown: 2,
        type: 'projectile', range: 380, speed: 500, dmg: 1.5, color: '#b7f08c', style: 'skull', pierce: true,
        text: 'Ein Geschoss aus Seelenenergie, das durch alle Gegner in einer Linie fliegt.'
      },
      {
        id: 'lebensentzug', name: 'Lebensentzug', short: 'LE', kind: 'angriff', unlock: 3, mp: 12, cooldown: 5,
        type: 'drain', range: 300, dmg: 1.8, heal: 0.5,
        text: 'Saugt dem Ziel Leben aus. Du heilst dich um die Hälfte des Schadens.'
      },
      {
        id: 'totenbeschwoerung', name: 'Totenbeschwörung', short: 'TB', kind: 'beschwörung', unlock: 5, mp: 30, cooldown: 30,
        type: 'summon', count: 2, duration: 30, hp: 0.4, atk: 0.5,
        text: 'Beschwört 30 s lang zwei Skelette, die an deiner Seite kämpfen.'
      },
      {
        id: 'fluch', name: 'Fluch der Schwäche', short: 'FS', kind: 'fluch', unlock: 7, mp: 18, cooldown: 15,
        type: 'curse', radius: 150, duration: 8, vulnerable: 0.3, slow: 0.4,
        text: 'Verflucht Gegner um dich: 8 s lang nehmen sie 30 % mehr Schaden und sind 40 % langsamer.'
      },
      {
        id: 'knochenpanzer', name: 'Knochenpanzer', short: 'KP', kind: 'buff', unlock: 10, mp: 25, cooldown: 40,
        type: 'buff', duration: 20, shield: 0.3, effects: { reflect: 0.2 },
        text: 'Buff, 20 s: Ein Schild fängt Schaden in Höhe von 30 % deines Lebens ab und wirft 20 % zurück.'
      }
    ]
  }
};

const CLASS_ORDER = ['krieger', 'ninja', 'schamane', 'nekromant'];
