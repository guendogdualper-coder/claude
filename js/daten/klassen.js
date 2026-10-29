// Die vier spielbaren Klassen mit je zwei Wegen.
//
// base      Werte auf Stufe 1
// perLevel  Zuwachs pro Stufe
// basic     normaler Angriff (Leertaste)
// paths     zwei Wege, ab Stufe 1 wählbar: einer für Monster in Massen (PvE),
//           einer für Zweikämpfe (PvP). Jeder Weg hat fünf eigene Fertigkeiten (Tasten 1–5).
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
    paths: [
      {
        id: 'klinge', name: 'Weg der Klinge', role: 'PvE · Flächenschaden',
        description: 'Trifft ganze Gruppen auf einmal und stärkt seinen Angriff mit der Aura des Schwertes. Ideal zum Farmen.',
        skills: [
          {
            // seit 8.3 (ersetzt den Dreifachschlag): Querhieb, dann das Schwert in den Boden – eine Klingenwelle rast nach vorn
            id: 'sichelwelle', name: 'Sichelwelle', short: 'SI', kind: 'angriff', unlock: 1, mp: 8, cooldown: 3,
            type: 'wave', radius: 90, angle: 140, dmg: 0.8, waveDmg: 1.4, waveLen: 180, waveWidth: 64, knockback: 90,
            anim: 'sichel', animDur: 0.62, lock: 0.42, color: '#e6eeff',
            text: 'Ein weiter Querhieb, dann schlägst du das Schwert in den Boden: Eine Klingenwelle rast bis zu 180 weit nach vorn, trifft alle Gegner in ihrer Bahn und stößt sie zurück.'
          },
          {
            id: 'schwertwirbel', name: 'Schwertwirbel', short: 'SW', kind: 'angriff', unlock: 3, mp: 14, cooldown: 6,
            type: 'circle', radius: 100, dmg: 1.7, stun: 0.8,
            text: 'Du wirbelst um dich selbst, triffst alle Gegner im Umkreis und betäubst sie kurz.'
          },
          {
            id: 'kampfrausch', name: 'Kampfrausch', short: 'KR', kind: 'buff', unlock: 5, mp: 20, cooldown: 45,
            type: 'buff', duration: 150, effects: { atkSpeed: 0.3, speed: 0.15 },
            text: 'Buff: Blitze zucken um dich. Mehr Angriffstempo und Lauftempo.'
          },
          {
            // seit 8.3 (ersetzt den Sturmangriff): Sprung nach vorn, Landung drückt den Boden ein und betäubt im Kreis
            id: 'sprungschlag', name: 'Sprungschlag', short: 'SP', kind: 'angriff', unlock: 7, mp: 18, cooldown: 8,
            type: 'leap', distance: 190, radius: 80, dmg: 0.9, stun: 1.6, crater: 50,
            crouch: 0.1, air: 0.45, recover: 0.2, anim: 'sprung', animDur: 0.8, color: '#c8a878',
            text: 'Du springst bis zu 190 weit nach vorn und schlägst beim Landen in den Boden: Die Erde gibt unter dir nach, alle Gegner im Umkreis werden 1,6 s betäubt und leicht verletzt.'
          },
          {
            id: 'schwertaura', name: 'Aura des Schwertes', short: 'AS', kind: 'buff', unlock: 10, mp: 30, cooldown: 60,
            type: 'buff', duration: 180, effects: { atk: 0.2, crit: 0.05 },
            text: 'Buff: Eine leuchtende Aura umgibt dein Schwert. Mehr Angriff und mehr kritische Treffer.'
          }
        ]
      },
      {
        id: 'leib', name: 'Weg des Leibes', role: 'PvP · Verteidigung und Kontrolle',
        description: 'Steht wie eine Mauer: betäubt Gegner, hält einzelne starke Feinde fest und hält mit Starker Körper enorm viel aus.',
        skills: [
          {
            // seit 8.3 (ersetzt den Schildstoß): Faust in den Boden, ein Riss läuft zum Ziel, ein Felspfeiler schleudert es hoch
            id: 'felsenfaust', name: 'Felsenfaust', short: 'FF', kind: 'angriff', unlock: 1, mp: 9, cooldown: 4.5,
            type: 'erupt', range: 120, dmg: 2, stun: 1.5, launch: 40, dodge: 40, lock: 0.36,
            anim: 'felsenfaust', animDur: 0.7, color: '#c8a878',
            text: 'Du schlägst die Faust in den Boden: Ein Riss läuft bis zu 120 weit zu deinem Ziel, ein Felspfeiler schießt unter ihm empor, schleudert es hoch und betäubt es 1,5 s.'
          },
          {
            id: 'erdbeben', name: 'Erdbeben', short: 'EB', kind: 'angriff', unlock: 3, mp: 16, cooldown: 9,
            type: 'circle', radius: 115, dmg: 1.2, stun: 1.6,
            text: 'Du stampfst auf und der Boden bebt: Alle Gegner um dich werden 1,6 s betäubt.'
          },
          {
            id: 'starkerkoerper', name: 'Starker Körper', short: 'SK', kind: 'buff', unlock: 5, mp: 25, cooldown: 60,
            type: 'buff', duration: 180, effects: { damageTaken: -0.3, def: 0.3 },
            text: 'Buff: Dein Körper wird hart wie Stein. Mehr Verteidigung und weniger erlittener Schaden.'
          },
          {
            id: 'geistesschlag', name: 'Geistesschlag', short: 'GS', kind: 'angriff', unlock: 7, mp: 18, cooldown: 7,
            type: 'strike', range: 72, dmg: 3.4, critBonus: 0.15, knockback: 80, color: '#9fd0ff',
            text: 'Ein gebündelter Schlag mit voller Kraft auf ein einzelnes Ziel. Sehr hoher Schaden.'
          },
          {
            id: 'kriegsschrei', name: 'Kriegsschrei', short: 'KS', kind: 'fluch', unlock: 10, mp: 22, cooldown: 18,
            type: 'curse', radius: 170, duration: 10, vulnerable: 0.25, slow: 0.5, color: '#ff7a3a',
            text: 'Ein Schrei, der Gegner lähmt: Sie werden langsamer und nehmen mehr Schaden.'
          }
        ]
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
    paths: [
      {
        id: 'dolch', name: 'Weg des Dolches', role: 'PvE · Hinterhalt und Blitzangriff',
        description: 'Verschwindet in der Tarnung, schlägt aus dem Hinterhalt zu, steht per Blitzangriff sofort beim nächsten Ziel und wirbelt durch Gruppen.',
        skills: [
          {
            id: 'hinterhalt', name: 'Hinterhalt', short: 'HH', kind: 'angriff', unlock: 1, mp: 8, cooldown: 4,
            type: 'strike', range: 70, dmg: 2.6, critBonus: 0.4, ambushMul: 2, ambushRange: 220,
            text: 'Ein gezielter Stich mit hohem Schaden. Aus der Tarnung springst du hinter das Ziel (bis 220 weit) und triffst doppelt so hart – zusammen mit dem Tarnungs-Bonus 6× Schaden, sicher kritisch.'
          },
          {
            id: 'tarnung', name: 'Tarnung', short: 'TA', kind: 'buff', unlock: 3, mp: 16, cooldown: 35,
            type: 'buff', duration: 30, effects: { invisible: true, speed: 0.3 }, nextHitMul: 3,
            text: 'Buff: 30 s unsichtbar, bis du angreifst. Monster verlieren dich aus den Augen, dein nächster Angriff macht dreifachen Schaden und ist sicher kritisch – mit Hinterhalt sogar 6×.'
          },
          {
            id: 'wirbelklinge', name: 'Wirbelklinge', short: 'WK', kind: 'angriff', unlock: 5, mp: 16, cooldown: 6,
            type: 'circle', radius: 95, dmg: 1.6,
            text: 'Du drehst dich mit beiden Dolchen und triffst alle Gegner um dich.'
          },
          {
            id: 'blitzangriff', name: 'Blitzangriff', short: 'BA', kind: 'angriff', unlock: 7, mp: 18, cooldown: 8,
            type: 'blink', range: 300, dmg: 2.4, stun: 0.8, critBonus: 0.15, color: '#9fd0ff',
            text: 'Von einem Moment auf den anderen stehst du hinter deinem Ziel (bis 300 weit) und schlägst zu. Das Ziel ist kurz betäubt.'
          },
          {
            id: 'leichtfuessigkeit', name: 'Leichtfüßigkeit', short: 'LF', kind: 'buff', unlock: 10, mp: 20, cooldown: 60,
            type: 'buff', duration: 180, effects: { speed: 0.2, atkSpeed: 0.25, dodge: 0.15 },
            text: 'Buff: Leicht wie eine Feder. Mehr Lauftempo, Angriffstempo und Chance auszuweichen.'
          }
        ]
      },
      {
        id: 'schatten', name: 'Weg des Schattens', role: 'PvP · Hinterhalt und Ausweichen',
        description: 'Taucht unsichtbar auf, lähmt ein Ziel und schaltet es mit kritischen Treffern aus. Kaum zu treffen.',
        skills: [
          {
            id: 'hinterhalt', name: 'Hinterhalt', short: 'HH', kind: 'angriff', unlock: 1, mp: 8, cooldown: 4,
            type: 'strike', range: 70, dmg: 2.6, critBonus: 0.4, ambushMul: 2, ambushRange: 220,
            text: 'Ein gezielter Stich mit hohem Schaden. Aus der Tarnung springst du hinter das Ziel (bis 220 weit) und triffst doppelt so hart – zusammen mit dem Tarnungs-Bonus 6× Schaden, sicher kritisch.'
          },
          {
            id: 'schattensprung', name: 'Schattensprung', short: 'SS', kind: 'angriff', unlock: 3, mp: 12, cooldown: 6,
            type: 'dash', distance: 180, radius: 36, dmg: 1.6, stun: 0.6, tint: '#8a6ad8',
            text: 'Du springst durch die Schatten nach vorn und schneidest alles auf dem Weg.'
          },
          {
            id: 'laehmklinge', name: 'Lähmende Klinge', short: 'LK', kind: 'angriff', unlock: 5, mp: 14, cooldown: 8,
            type: 'strike', range: 66, dmg: 1.8, stun: 2, poison: { dps: 0.3, duration: 6 }, color: '#8fd16a',
            text: 'Ein Stich in die Sehnen: Das Ziel ist 2 s betäubt und 6 s vergiftet.'
          },
          {
            id: 'tarnung', name: 'Tarnung', short: 'TA', kind: 'buff', unlock: 7, mp: 22, cooldown: 40,
            type: 'buff', duration: 120, effects: { invisible: true, speed: 0.3 }, nextHitMul: 3,
            text: 'Buff: unsichtbar, bis du angreifst. Monster verlieren dich aus den Augen, dein nächster Angriff macht dreifachen Schaden und ist sicher kritisch – mit Hinterhalt sogar 6×.'
          },
          {
            id: 'schattenmantel', name: 'Schattenmantel', short: 'SM', kind: 'buff', unlock: 10, mp: 25, cooldown: 60,
            type: 'buff', duration: 180, effects: { dodge: 0.2, crit: 0.12 },
            text: 'Buff: Schatten hüllen dich ein. Mehr Ausweichen und mehr kritische Treffer.'
          }
        ]
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
    paths: [
      {
        id: 'drache', name: 'Weg des Drachen', role: 'PvE · Feuer, Blitz und Eis',
        description: 'Ruft Drachenfeuer, Gewitter und Schneestürme herab und trifft viele Gegner aus der Distanz.',
        skills: [
          // seit 6.9: Flächenschaden statt Talisman und Kegel (Kennungen bleiben, damit Stufen und Bücher erhalten bleiben);
          // seit 7.7 ein Blitzdrache statt Glutdrache (gleiche Wirkung) und Blizzard statt Feuerhagel
          {
            id: 'talisman', name: 'Blitzdrache', short: 'BD', kind: 'angriff', unlock: 1, mp: 10, cooldown: 3,
            type: 'dragon', element: 'blitz', range: 340, radius: 100, speed: 620, dmg: 1.7, color: '#8fd0ff', burn: { dps: 0.25, duration: 3 },
            text: 'Du schleuderst einen Drachen aus Blitzen: Er schlängelt sich im Bogen zum Ziel, entlädt sich dort und trifft alle Gegner im Umkreis, die danach 3 Sekunden lang unter Strom stehen.'
          },
          {
            id: 'drachengebruell', name: 'Drachenwirbel', short: 'DW', kind: 'angriff', unlock: 3, mp: 18, cooldown: 7,
            type: 'vortex', radius: 170, hits: 3, dmg: 0.95, knockback: 140, color: '#ff7a2a', burn: { dps: 0.3, duration: 3 },
            text: 'Ein Geisterdrache aus Feuer kreist dreimal um dich und trifft jedes Mal alle Gegner im Umkreis. Zum Schluss schleudert er sie zurück und setzt sie in Brand.'
          },
          {
            id: 'drachenkraft', name: 'Drachenkraft', short: 'DK', kind: 'buff', unlock: 5, mp: 24, cooldown: 60,
            type: 'buff', duration: 180, effects: { atk: 0.15, skillDmg: 0.15 },
            text: 'Buff: Drachenkraft fließt in dich. Mehr Angriff und mehr Fertigkeitsschaden.'
          },
          {
            id: 'blitzschlag', name: 'Blizzard', short: 'BZ', kind: 'angriff', unlock: 7, mp: 26, cooldown: 12,
            type: 'blizzard', aim: true, range: 360, radius: 165, duration: 4, ticks: 8, shards: 26, dmg: 0.3, slow: { amount: 0.5, duration: 1.2 }, color: '#bfe8ff',
            text: 'Du wählst den Ort: Dort tobt 4 Sekunden lang ein Schneesturm mit Eiszapfen und Hagel. Er trifft alle Gegner im Kreis immer wieder und verlangsamt sie stark.'
          },
          {
            id: 'donnersturm', name: 'Donnersturm', short: 'DS', kind: 'angriff', unlock: 10, mp: 34, cooldown: 12,
            type: 'blast', fx: 'storm', range: 300, radius: 140, dmg: 2.6, stun: 1,
            text: 'Ein Gewitter entlädt sich über dem Ziel: Viele Blitze treffen alle Gegner im großen Umkreis.'
          }
        ]
      },
      {
        id: 'heilung', name: 'Weg der Heilung', role: 'PvP · Heilung und Schutz',
        description: 'Fesselt Gegner, heilt sich selbst und lässt Angreifer am eigenen Schutzgeist abprallen.',
        skills: [
          {
            id: 'geisterfaust', name: 'Geisterfaust', short: 'GF', kind: 'angriff', unlock: 1, mp: 9, cooldown: 3,
            type: 'projectile', range: 320, speed: 520, dmg: 1.9, stun: 1, color: '#8fe3d8', style: 'fist',
            text: 'Eine Faust aus Geisterkraft trifft ein Ziel und betäubt es 1 s.'
          },
          {
            id: 'windfessel', name: 'Windfessel', short: 'WF', kind: 'fluch', unlock: 3, mp: 14, cooldown: 12,
            type: 'curse', radius: 160, duration: 8, vulnerable: 0.1, slow: 0.6, color: '#8fe3d8',
            text: 'Wirbelnder Wind fesselt Gegner um dich: Sie werden langsamer und verwundbar.'
          },
          {
            id: 'segen', name: 'Segen', short: 'SG', kind: 'buff', unlock: 5, mp: 22, cooldown: 60,
            type: 'buff', duration: 180, effects: { damageTaken: -0.2, regen: 0.008, crit: 0.08 },
            text: 'Buff: Weniger erlittener Schaden, Leben regeneriert sich, mehr kritische Treffer.'
          },
          {
            id: 'heilung', name: 'Heilung', short: 'HE', kind: 'heilung', unlock: 7, mp: 30, cooldown: 20,
            type: 'heal', amount: 0.45, duration: 120, effects: { atk: 0.12 },
            text: 'Heilt einen Teil deines Lebens und gibt dir danach mehr Angriff.'
          },
          {
            id: 'schutzgeist', name: 'Schutzgeist', short: 'SG', kind: 'buff', unlock: 10, mp: 28, cooldown: 60,
            type: 'buff', duration: 180, effects: { reflect: 0.25, def: 0.25 },
            text: 'Buff: Ein Schutzgeist wacht über dich. Mehr Verteidigung, ein Teil des Schadens geht an den Angreifer zurück.'
          }
        ]
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
    paths: [
      {
        id: 'seelen', name: 'Weg der Seelen', role: 'PvE · Beschwörung und Flächenschaden',
        description: 'Lässt Skelette kämpfen, verflucht Gruppen und fegt mit Seelenstürmen durch sie hindurch.',
        skills: [
          {
            id: 'seelenpfeil', name: 'Seelenpfeil', short: 'SP', kind: 'angriff', unlock: 1, mp: 8, cooldown: 2,
            type: 'projectile', range: 380, speed: 500, dmg: 1.5, color: '#b7f08c', style: 'skull', pierce: true,
            text: 'Ein Geschoss aus Seelenenergie, das durch alle Gegner in einer Linie fliegt.'
          },
          {
            id: 'seelensturm', name: 'Seelensturm', short: 'SS', kind: 'angriff', unlock: 3, mp: 16, cooldown: 6,
            type: 'circle', radius: 120, dmg: 1.5,
            text: 'Ein Wirbel aus Seelen fegt um dich herum und trifft alle Gegner.'
          },
          {
            id: 'totenbeschwoerung', name: 'Totenbeschwörung', short: 'TB', kind: 'beschwörung', unlock: 5, mp: 30, cooldown: 45,
            type: 'summon', count: 2, duration: 90, hp: 0.4, atk: 0.5,
            text: 'Beschwört zwei Skelette, die an deiner Seite kämpfen.'
          },
          {
            id: 'fluch', name: 'Fluch der Schwäche', short: 'FS', kind: 'fluch', unlock: 7, mp: 18, cooldown: 15,
            type: 'curse', radius: 150, duration: 8, vulnerable: 0.3, slow: 0.4,
            text: 'Verflucht Gegner um dich: Sie nehmen mehr Schaden und werden langsamer.'
          },
          {
            id: 'dunklemacht', name: 'Dunkle Macht', short: 'DM', kind: 'buff', unlock: 10, mp: 28, cooldown: 60,
            type: 'buff', duration: 180, effects: { atk: 0.2, atkSpeed: 0.1 },
            text: 'Buff: Dunkle Macht durchströmt dich. Mehr Angriff und Angriffstempo.'
          }
        ]
      },
      {
        id: 'knochen', name: 'Weg der Knochen', role: 'PvP · Lebensraub und Lähmung',
        description: 'Saugt Leben aus, lähmt Gegner und versteckt sich hinter einem Knochenpanzer.',
        skills: [
          {
            id: 'lebensentzug', name: 'Lebensentzug', short: 'LE', kind: 'angriff', unlock: 1, mp: 12, cooldown: 5,
            type: 'drain', range: 300, dmg: 1.8, heal: 0.5,
            text: 'Saugt dem Ziel Leben aus. Du heilst dich um die Hälfte des Schadens.'
          },
          {
            id: 'knochenspeer', name: 'Knochenspeer', short: 'KS', kind: 'angriff', unlock: 3, mp: 12, cooldown: 5,
            type: 'projectile', range: 360, speed: 620, dmg: 2.4, stun: 0.8, color: '#ddd5bb', style: 'bone',
            text: 'Ein Speer aus Knochen durchbohrt ein Ziel und betäubt es kurz.'
          },
          {
            id: 'knochenpanzer', name: 'Knochenpanzer', short: 'KP', kind: 'buff', unlock: 5, mp: 25, cooldown: 60,
            type: 'buff', duration: 180, shield: 0.3, effects: { reflect: 0.2 },
            text: 'Buff: Ein Schild aus Knochen fängt Schaden ab und wirft einen Teil zurück. Er erneuert sich bei jedem Einsatz.'
          },
          {
            id: 'laehmung', name: 'Lähmender Fluch', short: 'LF', kind: 'fluch', unlock: 7, mp: 20, cooldown: 16,
            type: 'curse', radius: 150, duration: 6, vulnerable: 0.2, slow: 0.8, stun: 1.5, color: '#7ad36a',
            text: 'Ein Fluch, der Gegner um dich 1,5 s erstarren lässt. Danach sind sie stark verlangsamt.'
          },
          {
            id: 'blutopfer', name: 'Blutopfer', short: 'BO', kind: 'buff', unlock: 10, mp: 26, cooldown: 60,
            type: 'buff', duration: 150, effects: { hpSteal: 0.05, atk: 0.12 },
            text: 'Buff: Du opferst Blut für Macht. Lebensraub und mehr Angriff.'
          }
        ]
      }
    ]
  }
};

const CLASS_ORDER = ['krieger', 'ninja', 'schamane', 'nekromant'];

// Fertigkeiten des gewählten Weges
function classPath(classId, path) {
  const c = CLASSES[classId];
  return c.paths[path] || c.paths[0];
}

function classSkills(p) {
  return classPath(p.classId, p.path || 0).skills;
}
