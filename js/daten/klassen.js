// Die fünf spielbaren Klassen. Krieger, Ninja, Schamane und Nekromant haben zwei Wege
// (einer PvE, einer PvP), der Magier vier Element-Wege (Feuer, Frost, Blitz, Erde) mit gleichem Platzschema.
//
// base      Werte auf Stufe 1
// perLevel  Zuwachs pro Stufe
// basic     normaler Angriff (Leertaste)
// paths     Wege, ab Stufe 1 wählbar: bei vier Klassen einer für Monster in Massen (PvE) und
//           einer für Zweikämpfe (PvP), beim Magier je Element einer. Jeder Weg hat fünf eigene Fertigkeiten (Tasten 1–5).
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
    base: { hp: 160, mp: 40, atk: 14, def: 6, crit: 0.05, speed: 132 },
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
            type: 'buff', duration: 150, effects: { atkSpeed: 0.3, speed: 0.06 },
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
    base: { hp: 130, mp: 50, atk: 15, def: 4, crit: 0.12, speed: 142 },
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
            type: 'buff', duration: 30, effects: { invisible: true, speed: 0.12 }, nextHitMul: 3,
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
            type: 'buff', duration: 180, effects: { speed: 0.08, atkSpeed: 0.25, dodge: 0.15 },
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
            type: 'buff', duration: 120, effects: { invisible: true, speed: 0.12 }, nextHitMul: 3,
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
    base: { hp: 115, mp: 80, atk: 13, def: 3, crit: 0.06, speed: 132 },
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
    base: { hp: 120, mp: 75, atk: 13, def: 3, crit: 0.05, speed: 130 },
    perLevel: { hp: 19, mp: 9, atk: 3.9, def: 1.1 },
    basic: { range: 230, cooldown: 0.9, ranged: true, color: '#a7e37f' },
    paths: [
      {
        id: 'seelen', name: 'Weg der Seelen', role: 'PvE · Beschwörung und Flächenschaden',
        description: 'Ruft Skelette – erweckt Knochenhunde –, sperrt Seelen in Knochenkäfige und mäht Gruppen mit dem Seelenschnitter.',
        skills: [
          {
            // seit 8.5 (ersetzt den Seelenpfeil): drei brennende Schädel im Fächer, die bis zu drei Ziele suchen
            id: 'schaedelsalve', name: 'Schädelsalve', short: 'SV', kind: 'angriff', unlock: 1, mp: 9, cooldown: 2.5,
            type: 'skulls', range: 360, speed: 430, count: 3, fan: 0.42, turn: 7, spreadR: 150, dmg: 0.75, duelExtra: 0.5,
            color: '#a7e37f', style: 'skullfire', anim: 'salve', animDur: 0.4,
            text: 'Drei brennende Totenschädel schießen im Fächer aus deinem Stab, fliegen im Bogen und beißen bis zu drei Gegner. Auf ein einzelnes Ziel treffen alle drei.'
          },
          {
            // seit 8.5 (ersetzt den Seelensturm): ein Käfig aus Rippen bricht beim Ziel aus dem Boden, der gefangene Geist schreit fünfmal
            id: 'seelenkaefig', name: 'Seelenkäfig', short: 'SK', kind: 'angriff', unlock: 3, mp: 18, cooldown: 8,
            type: 'cage', range: 300, place: 110, radius: 125, rise: 0.35, pulses: 5, every: 1.0, dmg: 0.5, pull: 30,
            slow: { amount: 0.25, duration: 1.2 }, lock: 0.25, color: '#7fe3a0', anim: 'kaefig', animDur: 0.55,
            text: 'Ein Käfig aus riesigen Rippen bricht bei deinem Ziel aus dem Boden. Der Geist darin schreit 5 s lang jede Sekunde: Jeder Schrei trifft und verlangsamt alle Gegner im Umkreis, der erste zieht sie heran.'
          },
          {
            id: 'totenbeschwoerung', name: 'Totenbeschwörung', short: 'TB', kind: 'beschwörung', unlock: 5, mp: 30, cooldown: 40,
            type: 'summon', count: 3, duration: 90,
            // Index = skillRank(lvl) + 1: 0 = Stufe 1–15, 1 = Erwacht, 2 = Heroisch, 3 = Legendär, 4 = Vollendet
            tiers: [
              { kind: 'skelett', name: 'Skelettkrieger', hp: 0.4,  atk: 0.45, every: 1.1,  windup: 0.18, speed: 160, def: 0.6, scale: 1.0 },
              { kind: 'hund',    name: 'Knochenhund',    hp: 0.45, atk: 0.55, every: 0.85, windup: 0.12, speed: 195, def: 0.6, scale: 1.0,  pounce: true },
              { kind: 'hund',    name: 'Knochenhund',    hp: 0.5,  atk: 0.55, every: 0.85, windup: 0.12, speed: 200, def: 0.6, scale: 1.08, pounce: true, slow: 0.25 },
              { kind: 'hund',    name: 'Seelenhund',     hp: 0.55, atk: 0.55, every: 0.85, windup: 0.12, speed: 205, def: 0.7, scale: 1.14, pounce: true, slow: 0.25, burst: 1.0 },
              { kind: 'hund',    name: 'Seelenhund',     hp: 0.6,  atk: 0.55, every: 0.85, windup: 0.1,  speed: 210, def: 0.7, scale: 1.18, pounce: true, slow: 0.3,  burst: 1.2, alpha: 1.15 }
            ],
            text: 'Drei Skelettkrieger steigen aus dem Boden und kämpfen 90 s an deiner Seite. Ab dem Erwecken (E1) rufst du stattdessen drei Knochenhunde, die schnell sind, Gegner anspringen und richtig zubeißen.'
          },
          {
            // seit 8.5 (ersetzt den Fluch der Schwäche): ein riesiger Schnitter erhebt sich und mäht einmal vor dir durch
            id: 'seelenschnitter', name: 'Seelenschnitter', short: 'SN', kind: 'angriff', unlock: 7, mp: 22, cooldown: 12,
            type: 'reaper', radius: 135, angle: 200, dmg: 1.8, hitAt: 0.42, lock: 0.45,
            mark: { vulnerable: 0.15, duration: 6, slow: 0.3, slowDur: 2 },
            color: '#a774e0', anim: 'schnitter', animDur: 0.75,
            text: 'Neben dir erhebt sich ein riesiger Schnitter und mäht mit seiner Sense in weitem Bogen vor dir durch alle Gegner. Getroffene tragen sein Mal: 6 s mehr Schaden, 2 s langsamer.'
          },
          {
            id: 'dunklemacht', name: 'Dunkle Macht', short: 'DM', kind: 'buff', unlock: 10, mp: 28, cooldown: 60,
            type: 'buff', duration: 180, effects: { skillDmg: 0.18, atkSpeed: 0.1, speed: 0.06 }, labels: { skillDmg: 'Zauberschaden' },
            text: 'Buff: Dunkle Macht krönt dich mit Seelenflammen. Mehr Zauberschaden – für alle Fertigkeiten, deine Diener und die Ultimative Attacke –, mehr Angriffstempo und etwas Lauftempo.'
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
  },
  // seit 8.6: Gelehrter der vier Elemente. Vier Wege = vier Elemente mit gleichem Platzschema:
  // 1 Nova um dich (Stufe 1) · 2 Element-Geschoss (3) · 3 Elementsprung (5) · 4 Buff (7) · 5 großes Siegel (10).
  // Jede Magier-Fertigkeit trägt el (Feldname el, nicht element: das nutzt der Schamane).
  magier: {
    name: 'Magier',
    role: 'Fernkampf · Elementmagie',
    description: 'Gelehrter der vier Elemente. Du wählst Feuer, Frost, Blitz oder Erde – jeder Weg hat ab Stufe 1 eine Nova um dich.',
    color: '#283070',
    trim: '#d8e0f0',
    weapon: 'rod',
    base: { hp: 110, mp: 90, atk: 13.5, def: 2.5, crit: 0.06, speed: 130 },
    perLevel: { hp: 17, mp: 11, atk: 4.0, def: 0.95 },
    basic: { range: 240, cooldown: 0.9, ranged: true, color: '#b8c4ff', style: 'mage' },
    paths: [
      {
        id: 'feuer', name: 'Weg der Flamme', role: 'PvE · Flächenschaden und Brand',
        description: 'Setzt ganze Gruppen in Brand: Feuernova, explodierende Feuerbälle, eine Stichflamme zur Flucht und ein Flammenkreis, der sich am Boden zusammenzieht.',
        skills: [
          {
            id: 'feuernova', name: 'Feuernova', short: 'FN', kind: 'angriff', unlock: 1, mp: 9, cooldown: 5,
            type: 'nova', el: 'feuer', radius: 120, grow: 0.3, dmg: 1.4, burn: { dps: 0.3, duration: 3 }, knockback: 40, ignite: true,
            lock: 0.2, anim: 'nova', animDur: 0.5, color: '#e8362a',
            text: 'Du stößt dein Zepter in den Boden: Ein Ring aus karminroten Flammen rast über den Boden nach außen, trifft alle Gegner bis 120 weit, stößt sie leicht zurück und setzt sie 3 s in Brand. Brennen sie schon, explodieren sie.'
          },
          {
            id: 'feuerball', name: 'Feuerball', short: 'FB', kind: 'angriff', unlock: 3, mp: 11, cooldown: 3,
            type: 'mbolt', el: 'feuer', range: 340, speed: 540, dmg: 1.8, splash: { r: 70, mul: 0.5 }, burn: { dps: 0.2, duration: 3 },
            style: 'fireball', anim: 'stoss', animDur: 0.35, color: '#e8362a',
            text: 'Ein Feuerball mit zwei kreisenden Siegelringen fliegt zum Ziel und zerplatzt: Das Ziel brennt, Gegner bis 70 weit darum bekommen die Hälfte ab.'
          },
          {
            id: 'flammenschritt', name: 'Flammenschritt', short: 'FS', kind: 'angriff', unlock: 5, mp: 16, cooldown: 9,
            type: 'shift', el: 'feuer', at: 'start', distance: 170, radius: 90, dmg: 1.0, burn: { dps: 0.3, duration: 3 },
            anim: 'schritt', animDur: 0.3, color: '#e8362a',
            text: 'Du verschwindest in einer Stichflamme und tauchst bis zu 170 weit entfernt wieder auf. Wo du standest, explodiert das Feuer und setzt alle Gegner bis 90 weit in Brand.'
          },
          {
            id: 'glutherz', name: 'Glutherz', short: 'GH', kind: 'buff', unlock: 7, mp: 22, cooldown: 60, el: 'feuer',
            type: 'buff', duration: 180, effects: { skillDmg: 0.15, crit: 0.05 }, labels: { skillDmg: 'Zauberschaden' },
            text: 'Buff: Ein glühender Kern schwebt über deiner Hand. Mehr Zauberschaden und mehr kritische Treffer.'
          },
          {
            id: 'flammenkreis', name: 'Flammenkreis', short: 'FK', kind: 'angriff', unlock: 10, mp: 30, cooldown: 12,
            type: 'sigil', el: 'feuer', aim: true, range: 340, radius: 140, delay: 0.5, ticks: 3, every: 0.5, dmg: 0.7, inward: true,
            burn: { dps: 0.35, duration: 4 }, last: { ignite: true }, anim: 'zauber', animDur: 0.55, color: '#e8362a',
            text: 'Du zeichnest ein Feuersiegel an den gewählten Ort. Eine Flammenwand bricht an seinem Rand aus dem Boden und zieht sich dreimal zur Mitte zusammen. Jeder Puls trifft alle im Kreis, der letzte lässt Brennende explodieren.'
          }
        ]
      },
      {
        id: 'frost', name: 'Weg des Frosts', role: 'Kontrolle · Einfrieren',
        description: 'Lässt Gegner im Eis erstarren, zerschmettert Eingefrorene mit der Frostlanze und lässt ein Feld aus Kristallen wachsen. Weniger Schaden, sehr viel Kontrolle.',
        skills: [
          {
            id: 'frostnova', name: 'Frostnova', short: 'FR', kind: 'angriff', unlock: 1, mp: 9, cooldown: 6,
            type: 'nova', el: 'frost', radius: 130, grow: 0.38, dmg: 1.4, freeze: 1.0, slow: { amount: 0.45, duration: 3 }, duelMul: 1.15,
            lock: 0.2, anim: 'nova', animDur: 0.5, color: '#3a7bff',
            text: 'Eiskristalle schießen von deinen Füßen waagrecht nach außen und überziehen den Boden mit Reif. Alle Gegner bis 130 weit frieren 1 s ein (wächst mit der Stufe) und sind danach 3 s langsamer. Bosse werden nur verlangsamt.'
          },
          {
            id: 'frostlanze', name: 'Frostlanze', short: 'FL', kind: 'angriff', unlock: 3, mp: 11, cooldown: 3.5,
            type: 'mbolt', el: 'frost', range: 360, speed: 640, dmg: 2.0, pierce: true, slow: { amount: 0.4, duration: 2 }, shatter: 0.6,
            style: 'frostlance', anim: 'stoss', animDur: 0.35, color: '#3a7bff',
            text: 'Eine Lanze aus Eis durchbohrt alle Gegner in einer Linie und verlangsamt sie. Eingefrorene Gegner zerspringen: +60 % Schaden, das Eis ist danach weg.'
          },
          {
            id: 'eisschritt', name: 'Eisschritt', short: 'ES', kind: 'angriff', unlock: 5, mp: 16, cooldown: 10,
            type: 'shift', el: 'frost', at: 'start', distance: 160, radius: 95, delayHit: 0.5, dmg: 0.9, freeze: 0.8,
            slow: { amount: 0.5, duration: 2.5 }, duelMul: 1.15, anim: 'schritt', animDur: 0.3, color: '#3a7bff',
            text: 'Du gleitest auf einer Eisbahn bis zu 160 weit davon. Wo du standest, bleibt eine Eisfigur zurück, die nach 0,5 s zerspringt: Alle Gegner bis 95 weit frieren kurz ein.'
          },
          {
            id: 'frostpanzer', name: 'Frostpanzer', short: 'FP', kind: 'buff', unlock: 7, mp: 22, cooldown: 60, el: 'frost',
            type: 'buff', duration: 180, effects: { def: 0.25, damageTaken: -0.1, chill: 0.3 },
            text: 'Buff: Eisplatten kreisen um dich. Mehr Verteidigung, weniger erlittener Schaden, und wer dich schlägt, wird 1,5 s verlangsamt.'
          },
          {
            id: 'kristallgrab', name: 'Kristallgrab', short: 'KG', kind: 'angriff', unlock: 10, mp: 30, cooldown: 12,
            type: 'sigil', el: 'frost', aim: true, range: 340, radius: 135, delay: 0.6, ticks: 1, every: 0, dmg: 2.6, freeze: 1.4,
            slow: { amount: 0.5, duration: 3 }, linger: 3, duelMul: 1.15, anim: 'zauber', animDur: 0.55, color: '#3a7bff',
            text: 'Am gewählten Ort wachsen mannshohe Eiskristalle aus dem Boden. Alle Gegner darin nehmen hohen Schaden und frieren ein; das Eisfeld verlangsamt 3 s lang alles, was es betritt.'
          }
        ]
      },
      {
        id: 'blitz', name: 'Weg des Blitzes', role: 'PvP · Ketten und Tempo',
        description: 'Blitze springen von Gegner zu Gegner. Die Nova lädt Gegner auf, der Kettenblitz entlädt sie. Schneller Grundangriff und ein Blitzschritt, der selbst trifft – die Wahl für Zweikämpfe.',
        skills: [
          {
            id: 'blitznova', name: 'Blitznova', short: 'BN', kind: 'angriff', unlock: 1, mp: 9, cooldown: 5,
            type: 'nova', el: 'blitz', radius: 140, grow: 0.2, dmg: 1.3, stun: 0.3, arcs: 8, jump: { r: 110, mul: 0.5, max: 3 },
            lock: 0.2, anim: 'nova', animDur: 0.5, color: '#ffe94a',
            text: 'Zuckende Blitze kriechen von dir über den Boden zu bis zu acht Gegnern im Umkreis von 140, betäuben sie kurz und laden sie 5 s auf. Gegner knapp außerhalb bekommen einen Überschlag ab.'
          },
          {
            id: 'kettenblitz', name: 'Kettenblitz', short: 'KB', kind: 'angriff', unlock: 3, mp: 11, cooldown: 3,
            type: 'mbolt', el: 'blitz', range: 340, speed: 950, dmg: 1.9, chain: 2, chainMul: 0.8, discharge: 0.3, stun: 0.2,
            style: 'arc', anim: 'stoss', animDur: 0.3, color: '#ffe94a',
            text: 'Ein Blitz schießt aus deinem Zepter zum Ziel und springt zu zwei weiteren Gegnern. Aufgeladene Gegner entladen sich: +30 % Schaden.'
          },
          {
            id: 'blitzschritt', name: 'Blitzschritt', short: 'BS', kind: 'angriff', unlock: 5, mp: 16, cooldown: 8,
            type: 'shift', el: 'blitz', at: 'line', distance: 200, width: 40, dmg: 1.5, stun: 0.5,
            anim: 'schritt', animDur: 0.3, color: '#ffe94a',
            text: 'Du wirst selbst zum Blitz und schlägst bis zu 200 weit ein – in Laufrichtung oder auf dein Ziel zu. Alle Gegner auf der Strecke werden getroffen und kurz betäubt.'
          },
          {
            // Lauftempo bleibt fest (wie seit 8.5 bei allen Tempo-Buffs)
            id: 'ladung', name: 'Statische Ladung', short: 'SL', kind: 'buff', unlock: 7, mp: 22, cooldown: 60, el: 'blitz',
            type: 'buff', duration: 180, effects: { atkSpeed: 0.2, crit: 0.06, speed: 0.06 },
            text: 'Buff: Funken knistern über deine Robe. Mehr Angriffstempo, mehr kritische Treffer und etwas Lauftempo.'
          },
          {
            id: 'kugelblitz', name: 'Kugelblitz', short: 'KU', kind: 'angriff', unlock: 10, mp: 30, cooldown: 12,
            type: 'sigil', el: 'blitz', aim: true, range: 340, radius: 150, delay: 0.4, ticks: 6, every: 0.5, zaps: 3, dmg: 0.55,
            last: { stun: 0.8 }, anim: 'zauber', animDur: 0.55, color: '#ffe94a',
            text: 'Eine Kugel aus Blitzen steigt über dem gewählten Siegel auf und schlägt 3 s lang jede halbe Sekunde waagrecht in die drei nächsten Gegner – aufgeladene zuerst. Der letzte Schlag betäubt.'
          }
        ]
      },
      {
        id: 'erde', name: 'Weg der Erde', role: 'Schutz · Schwerkraft und Hochschleudern',
        description: 'Basalt und Bernstein: schleudert Gegner hoch, schützt sich mit einer Basalthaut und zieht Feinde mit einem Schwerkraftsiegel zusammen. Hält am meisten aus.',
        skills: [
          {
            id: 'erdnova', name: 'Erdnova', short: 'EN', kind: 'angriff', unlock: 1, mp: 9, cooldown: 6,
            type: 'nova', el: 'erde', radius: 120, grow: 0.3, dmg: 1.35, knockback: 100, stun: 0.5, lift: 14, duelMul: 1.15,
            lock: 0.25, anim: 'nova', animDur: 0.55, color: '#f0a830',
            text: 'Basaltsplitter mit glühenden Bernsteinadern heben sich um dich und werden mit einem Schwerkraftstoß nach außen geschleudert. Alle Gegner bis 120 weit fliegen hoch, werden weggestoßen und kurz betäubt.'
          },
          {
            id: 'steingeschoss', name: 'Steingeschoss', short: 'ST', kind: 'angriff', unlock: 3, mp: 12, cooldown: 4,
            type: 'mbolt', el: 'erde', range: 320, speed: 430, dmg: 2.3, splash: { r: 55, mul: 0.5 }, knockback: 50, stun: 0.5,
            style: 'stone', anim: 'stoss', animDur: 0.4, color: '#f0a830',
            text: 'Ein Basaltbrocken mit glühendem Bernsteinkern schlägt beim Ziel ein, betäubt es kurz und zersplittert: Gegner daneben bekommen die Hälfte ab.'
          },
          {
            id: 'erdsprung', name: 'Erdsprung', short: 'ER', kind: 'angriff', unlock: 5, mp: 16, cooldown: 10,
            type: 'shift', el: 'erde', at: 'end', distance: 150, radius: 90, dmg: 1.3, stun: 0.8, lift: 16, duelMul: 1.15,
            anim: 'schritt', animDur: 0.35, color: '#f0a830',
            text: 'Du versinkst in einem glühenden Riss und brichst bis zu 150 weit entfernt – bei deinem Ziel – wieder aus dem Boden: Alle Gegner bis 90 weit fliegen hoch und sind kurz betäubt. Ohne Ziel springst du von Gegnern weg.'
          },
          {
            id: 'basalthaut', name: 'Basalthaut', short: 'BH', kind: 'buff', unlock: 7, mp: 24, cooldown: 60, el: 'erde',
            type: 'buff', duration: 180, shield: 0.18, effects: { def: 0.25, damageTaken: -0.08 },
            text: 'Buff: Basaltplatten mit Bernsteinadern legen sich um dich. Ein Schild fängt Schaden ab, dazu mehr Verteidigung und weniger erlittener Schaden.'
          },
          {
            id: 'schwerkraft', name: 'Schwerkraftsiegel', short: 'SK', kind: 'angriff', unlock: 10, mp: 30, cooldown: 13,
            type: 'sigil', el: 'erde', aim: true, range: 320, radius: 150, delay: 0.45, pull: 70, ticks: 3, every: 0.45, dmg: 0.5,
            last: { dmg: 1.6, stun: 1.2, lift: 18 }, duelMul: 1.15, anim: 'zauber', animDur: 0.55, color: '#f0a830',
            text: 'Ein Bernsteinsiegel zieht alle Gegner im Kreis zur Mitte. Drei Felsbrocken kreisen und treffen sie, dann schlagen sie gemeinsam ein: hoher Schaden, die Gegner fliegen hoch und sind betäubt.'
          }
        ]
      }
    ]
  }
};

const CLASS_ORDER = ['krieger', 'ninja', 'schamane', 'nekromant', 'magier'];

// Magier (seit 8.6): Weg-Index = Element. Farben bewusst nicht ELEMENT3 und nicht Schamane (#ff7a2a, #bfe8ff, #8fd0ff).
const MAGE_PATH_EL = ['feuer', 'frost', 'blitz', 'erde'];
const MAGE_EL = {
  feuer: { key: 'feuer', name: 'Feuer', main: '#e8362a', hi: '#ff8a4a', core: '#fff1c8', deep: '#a0102e', dark: '#3a0e0e', glyph: 'up' },      // △ Karmin → weißglühend
  frost: { key: 'frost', name: 'Frost', main: '#3a7bff', hi: '#9ff6ff', core: '#eafcff', deep: '#1a3fb0', dark: '#0e1e4a', glyph: 'down' },    // ▽ Königsblau, Cyan nur Glanz
  blitz: { key: 'blitz', name: 'Blitz', main: '#ffe94a', hi: '#fff7b0', core: '#ffffff', deep: '#8a5aff', dark: '#241a4a', glyph: 'upbar' },   // △ mit Balken, violetter Saum
  erde:  { key: 'erde',  name: 'Erde',  main: '#f0a830', hi: '#ffd98a', core: '#fff0c0', deep: '#3e3532', dark: '#2a2220', glyph: 'downbar' }, // ▽ mit Balken, Basalt + Bernstein
  arkan: { key: 'arkan', name: 'Arkan', main: '#b8c4ff', hi: '#e0e6ff', core: '#ffffff', deep: '#4a5ad8', dark: '#1a1e3a', glyph: 'up' }       // Weg unbekannt (fremder Spieler ohne pt)
};
function mageEl(p) {
  return p && p.path != null && MAGE_PATH_EL[p.path] ? MAGE_EL[MAGE_PATH_EL[p.path]] : MAGE_EL.arkan;
}

// Fertigkeiten des gewählten Weges
function classPath(classId, path) {
  const c = CLASSES[classId];
  return c.paths[path] || c.paths[0];
}

function classSkills(p) {
  return classPath(p.classId, p.path || 0).skills;
}
