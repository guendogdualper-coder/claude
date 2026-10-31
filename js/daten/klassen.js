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
            // (seit 8.6 schneller: Hocke, Flug und Landehocke je etwa 30 % kürzer)
            id: 'sprungschlag', name: 'Sprungschlag', short: 'SP', kind: 'angriff', unlock: 7, mp: 18, cooldown: 8,
            type: 'leap', distance: 190, radius: 80, dmg: 0.9, stun: 1.6, crater: 50,
            crouch: 0.07, air: 0.32, recover: 0.14, anim: 'sprung', animDur: 0.56, color: '#c8a878',
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
        description: 'Saugt mit einem Blutfaden Leben aus, ruft Skelette – erweckt Knochenhunde –, sperrt Seelen in Knochenkäfige, holt getötete Monster als Geister zurück und lässt eine Geisterflut niedergehen.',
        skills: [
          {
            // seit 11.7 (ersetzt die Schädelsalve): gedrückt halten – ein Blutfaden saugt dem Ziel Leben aus (nekro-neu.js)
            id: 'blutsauger', name: 'Blutsauger', short: 'BS', kind: 'angriff', unlock: 1, mp: 8, cooldown: 2,
            type: 'siphon', channel: true, range: 300, every: 0.2, maxDur: 8, minDur: 0.4, dmg: 0.4, leech: 0.35, mpPerSec: 6,
            color: '#e0203a', nk: true,
            text: 'Gedrückt halten: Ein pulsierender Blutfaden spannt sich von deinem Ziel zu deiner Hand. Fünfmal pro Sekunde reißt er Blut heraus – Schaden – und ein Drittel davon fließt als Leben zu dir. Er läuft, solange du gedrückt hältst – bis zu 8 s. Stirbt das Ziel, springt der Faden auf den nächsten Gegner in der Nähe. Loslassen oder Mana leer beenden ihn.'
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
            // seit 10.0 (ersetzt den Seelenschnitter): getötete Monster hinterlassen 2 Minuten Gräber; der Totenruf weckt
            // sie als weiße Geister in ihrer eigenen Gestalt (nekro-totenruf.js)
            id: 'totenruf', name: 'Totenruf', short: 'TR', kind: 'beschwörung', unlock: 7, mp: 24, cooldown: 15,
            type: 'revive', radius: 320, duration: 180, counts: [2, 3, 4, 4, 5], hp: 0.3, atk: 0.42,
            color: '#9fe8d0', anim: 'kaefig', animDur: 0.55,
            text: 'Jedes Monster, das in deiner Nähe stirbt, hinterlässt 2 Minuten lang ein Grab. Der Totenruf weckt die Gräber um dich: Die Monster steigen als weiße Geister in ihrer eigenen Gestalt auf und kämpfen 3 Minuten an deiner Seite – 2 Geister, mit dem Rang bis zu 5. Solange deine Geister wandeln, ruft der Totenruf keine weiteren. Sie bleiben neben deinen Knochenhunden.'
          },
          {
            // seit 11.7 (ersetzt den Buff Dunkle Macht): Geister brechen aus dem Nekromanten und stürzen auf das Zielgebiet
            id: 'geisterflut', name: 'Geisterflut', short: 'GF', kind: 'angriff', unlock: 10, mp: 30, cooldown: 12,
            type: 'ghostflood', aim: true, range: 380, radius: 150, ghosts: 8, rise: 0.55, dmg: 0.9, splash: 45,
            burst: { dmg: 1.4, slow: { amount: 0.35, duration: 2.5 }, knockback: 40 }, color: '#9fe8d0', nk: true, anim: 'kaefig', animDur: 0.6,
            text: 'Zielort wählen: Acht schreiende Geister brechen aus deinem Körper, wirbeln über dir in die Höhe und stürzen sich auf die Gegner im Zielgebiet. Jeder Geist trifft beim Einschlag alle in seiner Nähe, zum Schluss platzt eine Seelenwelle auf, die Gegner zurückwirft und verlangsamt.'
          }
        ]
      },
      {
        id: 'knochen', name: 'Weg der Knochen', role: 'PvP · Blut, Knochen und Lebensraub',
        description: 'Reißt Leben aus Gegnern, wirft Knochen, lässt Blutlarven platzen, packt Feinde mit einer Totenhand und ruft den Sensenmann.',
        skills: [
          {
            // seit 11.7 neu: kurz und heftig – ein Blutband reißt die Lebenskraft heraus und heilt sofort (nekro-neu.js)
            id: 'lebensentzug', name: 'Lebensentzug', short: 'LE', kind: 'angriff', unlock: 1, mp: 10, cooldown: 4,
            type: 'lifetap', range: 300, dmg: 1.6, heal: 0.6, color: '#e0203a', nk: true, anim: 'salve', animDur: 0.4,
            text: 'Ein Blutband schnellt zu deinem Ziel und reißt in einem Ruck seine Lebenskraft heraus. Die Blutkugel fliegt in deine Brust zurück und heilt dich sofort um 60 % des Schadens.'
          },
          {
            // seit 11.7 (ersetzt den Knochenspeer): ein wirbelnder Oberschenkelknochen, der verlangsamt
            id: 'knochenwurf', name: 'Knochenwurf', short: 'KW', kind: 'angriff', unlock: 3, mp: 12, cooldown: 4,
            type: 'bonethrow', range: 380, speed: 520, width: 24, dmg: 1.9, slow: { amount: 0.4, duration: 2.5 }, color: '#e8dcc0', nk: true, anim: 'salve', animDur: 0.4,
            text: 'Du schleuderst einen großen Knochen, der sich überschlagend durch die Luft wirbelt. Er trifft den ersten Gegner auf seiner Bahn, zersplittert und verlangsamt ihn 2,5 s um 40 %.'
          },
          {
            // seit 11.7 (ersetzt den Knochenpanzer): eine Blutlarve springt zum Ziel und platzt
            id: 'blutlarve', name: 'Blutlarve', short: 'BL', kind: 'angriff', unlock: 5, mp: 18, cooldown: 7,
            type: 'larva', aim: true, range: 340, radius: 110, hop: 0.55, wriggle: 0.4, dmg: 1.6, bleed: { dps: 0.32, duration: 4 }, color: '#c01828', nk: true, anim: 'kaefig', animDur: 0.5,
            text: 'Zielort wählen: Eine fette Blutlarve kriecht aus deinem Ärmel, springt in hohem Bogen zum Ziel, windet sich kurz – und platzt. Alle Gegner in der Nähe nehmen Schaden und bluten 4 s lang.'
          },
          {
            // seit 11.7 (ersetzt den Lähmenden Fluch): eine riesige Knochenhand packt das Ziel und zerdrückt es
            id: 'totenhand', name: 'Totenhand', short: 'TH', kind: 'angriff', unlock: 7, mp: 22, cooldown: 12,
            type: 'gravehand', range: 320, radius: 75, grab: 0.4, hold: 1.6, dmg: 0.8, crush: 1.8, color: '#e8dcc0', nk: true, anim: 'kaefig', animDur: 0.55,
            text: 'Unter deinem Ziel bricht eine riesige Skeletthand aus der Erde, schließt die Finger um alle Gegner in der Nähe und hält sie 1,6 s fest. Dann ballt sie die Faust und zerdrückt sie.'
          },
          {
            // seit 11.7 (ersetzt den Buff Blutopfer): Blutlanzen schießen aus dem Rücken und suchen bis zu sechs Gegner
            id: 'blutlanzen', name: 'Blutlanzen', short: 'BZ', kind: 'angriff', unlock: 10, mp: 26, cooldown: 10,
            type: 'bloodlances', range: 280, count: 6, dmg: 1.25, leech: 0.15, color: '#e0203a', nk: true, anim: 'kaefig', animDur: 0.55,
            text: 'Sechs Lanzen aus Blut wachsen dir wie Flügel aus dem Rücken und schießen auf bis zu sechs Gegner in der Nähe (bei weniger Gegnern treffen mehrere dasselbe Ziel). Jede Lanze heilt dich um 15 % ihres Schadens.'
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
    description: 'Gelehrter der vier Elemente. Du wählst Feuer, Frost, Blitz oder Erde – jeder Weg hat seine eigenen Zauber, von Drachenodem und Feuerball bis Blitzspeer und Gewitterwolke.',
    color: '#283070',
    trim: '#d8e0f0',
    weapon: 'rod',
    base: { hp: 110, mp: 90, atk: 13.5, def: 2.5, crit: 0.06, speed: 130 },
    perLevel: { hp: 17, mp: 11, atk: 4.0, def: 0.95 },
    basic: { range: 240, cooldown: 0.9, ranged: true, color: '#b8c4ff', style: 'mage' },
    paths: [
      {
        id: 'feuer', name: 'Weg der Flamme', role: 'PvE · Flächenschaden und Brand',
        description: 'Setzt alles in Brand: Drachenodem nach vorn, ein riesiger Feuerball mit Zauberzeit, Brand über Zeit auf einzelne Gegner, die Phönixflamme als Burst und ein Flammenkreis, der sich am Boden zusammenzieht.',
        skills: [
          {
            // seit 11.5 statt der Feuernova: ein Flammenkegel nach vorn (kein Kreis am Boden)
            id: 'drachenodem', name: 'Drachenodem', short: 'DO', kind: 'angriff', unlock: 1, mp: 9, cooldown: 5,
            type: 'mbreath', el: 'feuer', range: 165, angle: 75, dmg: 1.5, burn: { dps: 0.25, duration: 3 }, knockback: 30,
            anim: 'stoss', animDur: 0.5, color: '#e8362a',
            text: 'Du reißt die Hände nach vorn und speist einen tosenden Flammenkegel wie ein Drache: Alle Gegner vor dir bis 165 weit werden getroffen, ein Stück zurückgestoßen und brennen 3 s.'
          },
          {
            // seit 11.5 mit 3 s Zauberzeit: viel größer und stärker; Bewegen bricht ab (Mana und Abklingzeit zurück)
            id: 'feuerball', name: 'Feuerball', short: 'FB', kind: 'angriff', unlock: 3, mp: 20, cooldown: 2,
            type: 'mcast', el: 'feuer', castTime: 3, range: 400, speed: 430, dmg: 5.6, splash: { r: 115, mul: 0.6 }, burn: { dps: 0.4, duration: 4 },
            style: 'fireball', big: 2.1, anim: 'zauber', animDur: 3, color: '#e8362a',
            text: 'Zauberzeit 3 s: Zwischen deinen Händen wächst ein riesiger Feuerball. Danach fliegt er zum Ziel und explodiert – gewaltiger Schaden, Gegner bis 115 weit darum bekommen 60 %, alle brennen 4 s. Bewegst du dich oder zauberst du etwas anderes, bricht er ab (Mana und Abklingzeit zurück).'
          },
          {
            // seit 11.5 statt Flammenschritt: Brand – Feuerschaden über Zeit auf ein Ziel (wie Gift)
            id: 'brand', name: 'Brand', short: 'BR', kind: 'angriff', unlock: 5, mp: 14, cooldown: 6,
            type: 'mignite', el: 'feuer', range: 340, dmg: 0.4, burn: { dps: 0.95, duration: 6 },
            anim: 'zauber', animDur: 0.4, color: '#e8362a',
            text: 'Du schnippst einen Funken auf einen Gegner: Er fängt Feuer und brennt 6 s lang – jede Sekunde Feuerschaden, zusammen fast das Sechsfache eines Treffers. Wie Gift, nur heißer.'
          },
          {
            // seit 11.5 statt Glutherz: Phönixflamme – der große Feuer-Burst
            id: 'phoenix', name: 'Phönixflamme', short: 'PH', kind: 'angriff', unlock: 7, mp: 28, cooldown: 14,
            type: 'mphoenix', el: 'feuer', range: 400, speed: 470, dmg: 3.4, pathR: 42, pathMul: 0.6, blast: { r: 105, mul: 0.7 },
            combust: 0.6, burn: { dps: 0.35, duration: 4 }, anim: 'stoss', animDur: 0.45, color: '#e8362a',
            text: 'Ein Phönix aus Flammen bricht aus deinem Zepter, fliegt zum Ziel und verbrennt alles auf seinem Weg. Am Ziel stürzt er herab und explodiert: Brennt das Ziel schon, lodert es auf (+60 % Schaden), und alle bis 105 weit fangen Feuer.'
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
        description: 'Lässt Gegner im Eis erstarren, bremst sie mit dem Eisstrahl immer weiter aus und lässt ein Feld aus Kristallen wachsen. Weniger Schaden, sehr viel Kontrolle.',
        skills: [
          {
            id: 'frostnova', name: 'Frostnova', short: 'FR', kind: 'angriff', unlock: 1, mp: 9, cooldown: 6,
            type: 'nova', el: 'frost', radius: 130, grow: 0.38, dmg: 1.4, freeze: 1.0, slow: { amount: 0.45, duration: 3 }, duelMul: 1.15,
            lock: 0.2, anim: 'nova', animDur: 0.5, color: '#3a7bff',
            text: 'Eiskristalle schießen von deinen Füßen waagrecht nach außen und überziehen den Boden mit Reif. Alle Gegner bis 130 weit frieren 1 s ein (wächst mit der Stufe) und sind danach 3 s langsamer. Bosse werden nur verlangsamt.'
          },
          {
            id: 'eisstrahl', name: 'Eisstrahl', short: 'EI', kind: 'angriff', unlock: 3, mp: 6, cooldown: 1.5,
            type: 'beam', el: 'frost', channel: true, range: 300, width: 26, every: 0.2, maxDur: 6, minDur: 0.5, dmg: 0.34, mpPerSec: 9,
            slow: { amount: 0.3, max: 0.7, build: 0.25, duration: 1 }, duelMul: 1.1, color: '#9ff6ff',
            text: 'Gedrückt halten: Ein eisiger Strahl schießt aus deinen Händen und trifft alle Gegner in einer Linie bis 300 weit, fünfmal pro Sekunde mit leichtem Schaden. Wer im Strahl steht, wird immer langsamer (30 % bis 70 %). Kostet laufend Mana; du kannst dabei langsam gehen. Loslassen beendet den Strahl.'
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
        description: 'Blitze springen von Gegner zu Gegner. Der Blitzspeer lädt Gegner auf, der Kettenblitz entlädt sie. Ein Blitzschritt mit einer Spur aus Himmelsblitzen und die Gewitterwolke aus der Ferne.',
        skills: [
          {
            // seit 11.5 statt der Blitznova: ein Speer, der alles in einer Linie durchschlägt (kein Bodenkreis)
            id: 'blitzspeer', name: 'Blitzspeer', short: 'SP', kind: 'angriff', unlock: 1, mp: 9, cooldown: 4,
            type: 'mspear', el: 'blitz', range: 390, width: 34, dmg: 1.5, stun: 0.25, charge: 5,
            anim: 'stoss', animDur: 0.35, color: '#ffe94a',
            text: 'Du schleuderst einen Speer aus reinem Blitz: Er durchschlägt alle Gegner in einer Linie bis 390 weit, betäubt sie kurz und lädt sie 5 s auf – der Kettenblitz entlädt sie für mehr Schaden.'
          },
          {
            id: 'kettenblitz', name: 'Kettenblitz', short: 'KB', kind: 'angriff', unlock: 3, mp: 11, cooldown: 3,
            type: 'mbolt', el: 'blitz', range: 340, speed: 950, dmg: 1.9, chain: 2, chainMul: 0.8, discharge: 0.3, stun: 0.2,
            style: 'arc', anim: 'stoss', animDur: 0.3, color: '#ffe94a',
            text: 'Ein Blitz schießt aus deinem Zepter zum Ziel und springt zu zwei weiteren Gegnern. Aufgeladene Gegner entladen sich: +30 % Schaden.'
          },
          {
            id: 'blitzschritt', name: 'Blitzschritt', short: 'BS', kind: 'angriff', unlock: 5, mp: 16, cooldown: 8,
            type: 'shift', el: 'blitz', at: 'line', distance: 200, width: 40, dmg: 1.5, stun: 0.5, trail: { n: 5, r: 44, dmg: 0.45, every: 0.08 },
            anim: 'schritt', animDur: 0.3, color: '#ffe94a',
            text: 'Du wirst selbst zum Blitz und schlägst bis zu 200 weit ein – in Laufrichtung oder auf dein Ziel zu. Alle Gegner auf der Strecke werden getroffen und kurz betäubt. Hinter dir krachen fünf Blitze vom Himmel auf deinen Weg und treffen, wer dort steht.'
          },
          {
            // seit 11.5 statt Statische Ladung: Gewitterwolke – Flächenschaden aus der Ferne
            id: 'gewitter', name: 'Gewitterwolke', short: 'GW', kind: 'angriff', unlock: 7, mp: 26, cooldown: 14,
            type: 'mstorm', el: 'blitz', aim: true, range: 460, radius: 165, form: 0.6, strikes: 6, every: 0.3, dmg: 0.95,
            final: { dmg: 1.8, stun: 1.5 }, anim: 'zauber', animDur: 0.55, color: '#ffe94a',
            text: 'Über dem gewählten Ort ballt sich eine schwarze Gewitterwolke zusammen. Sechs Blitze schlagen nacheinander in Gegner darunter. Zum Schluss entlädt sich die ganze Wolke: Ein Netz aus Blitzen springt zwischen allen Gegnern im Feld hin und her und lähmt sie 1,5 s lang. Reichweite 460.'
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
        description: 'Basalt und Bernstein: zwei Felsen krachen am Ziel zusammen, ein riesiges Felsgeschoss betäubt, Erdspitzen spießen ganze Gruppen auf, ein Bergsturz fällt vom Himmel und die Schwerkraft lässt Felsen um die Gegner kreisen.',
        skills: [
          {
            // seit 11.5 statt der Erdnova: zwei Felsbrocken krachen aus der Ferne am Ziel zusammen
            id: 'steinschlag', name: 'Steinschlag', short: 'SS', kind: 'angriff', unlock: 1, mp: 9, cooldown: 5,
            type: 'mclash', el: 'erde', range: 360, radius: 90, dmg: 1.7, stun: 0.4, lift: 12, duelMul: 1.15,
            anim: 'stoss', animDur: 0.4, color: '#f0a830',
            text: 'Du reißt zwei Felsbrocken aus der Erde und schleuderst sie von links und rechts auf dein Ziel zu (bis 360 weit). Dort krachen sie zusammen und zerbersten: Alle Gegner bis 90 weit werden getroffen, hochgeworfen und kurz betäubt.'
          },
          {
            // seit 11.5 viel größer: betäubt länger und trifft härter
            id: 'steingeschoss', name: 'Felsgeschoss', short: 'FG', kind: 'angriff', unlock: 3, mp: 14, cooldown: 5,
            type: 'mbolt', el: 'erde', range: 340, speed: 380, dmg: 3.0, splash: { r: 80, mul: 0.6 }, knockback: 70, stun: 1.2,
            style: 'stone', big: 2.1, anim: 'stoss', animDur: 0.4, color: '#f0a830',
            text: 'Du schleuderst einen riesigen Basaltfelsen mit glühendem Bernsteinkern. Er trifft hart, betäubt das Ziel 1,2 s, stößt es zurück und zerbirst: Gegner bis 80 weit bekommen 60 % ab.'
          },
          {
            // seit 11.5 statt Erdsprung: Steinspitzen brechen in einer Fläche aus der Erde
            id: 'erdspitzen', name: 'Erdspitzen', short: 'ES', kind: 'angriff', unlock: 5, mp: 16, cooldown: 8,
            type: 'mspikes', el: 'erde', range: 300, radius: 115, dmg: 1.7, stun: 0.6, lift: 18, duelMul: 1.15,
            anim: 'nova', animDur: 0.55, color: '#f0a830',
            text: 'Du stampfst auf: Beim Ziel (oder vor dir) brechen in zwei Wellen spitze Basaltdornen aus der Erde – erst außen, dann in der Mitte. Alle Gegner bis 115 weit werden aufgespießt, hochgeworfen und kurz betäubt.'
          },
          {
            // seit 11.5 statt Basalthaut: Bergsturz – ein riesiger Fels stürzt vom Himmel
            id: 'bergsturz', name: 'Bergsturz', short: 'BG', kind: 'angriff', unlock: 7, mp: 28, cooldown: 14,
            type: 'mmeteor', el: 'erde', aim: true, range: 380, radius: 125, fall: 0.9, dmg: 3.2, stun: 1.0, knockback: 90, duelMul: 1.15,
            anim: 'zauber', animDur: 0.55, color: '#f0a830',
            text: 'Du reißt einen Berggipfel aus dem Himmel: Ein gewaltiger Felsen mit glühenden Adern stürzt auf den gewählten Ort, zieht eine Staubfahne hinter sich her und schlägt mit einer Druckwelle ein. Hoher Schaden, alle bis 125 weit werden weggeschleudert und 1 s betäubt.'
          },
          {
            id: 'schwerkraft', name: 'Schwerkraftsiegel', short: 'SK', kind: 'angriff', unlock: 10, mp: 30, cooldown: 13,
            // seit 11.5 ohne Bodensiegel: nur der Sog und ein Ring kreisender Felsen
            type: 'mgrav', el: 'erde', aim: true, range: 320, radius: 150, delay: 0.45, pull: 70, ticks: 3, every: 0.45, dmg: 0.6, rocks: 8,
            last: { dmg: 1.6, stun: 1.2, lift: 18 }, duelMul: 1.15, anim: 'zauber', animDur: 0.55, color: '#f0a830',
            text: 'Die Schwerkraft am gewählten Ort kippt: Acht Felsbrocken reißen sich aus dem Boden und kreisen immer enger um die Mitte, ziehen alle Gegner hinein und treffen sie dreimal. Zum Schluss krachen alle Felsen in der Mitte zusammen: hoher Schaden, die Gegner fliegen hoch und sind betäubt.'
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
