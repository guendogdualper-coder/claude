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
            type: 'wave', radius: 90, angle: 140, dmg: 0.8, waveDmg: 1.6, waveLen: 180, waveWidth: 64, knockback: 90,
            anim: 'sichel', animDur: 0.62, lock: 0.42, color: '#e6eeff',
            text: 'Ein weiter Querhieb, dann schlägst du das Schwert in den Boden: Eine Klingenwelle rast bis zu 180 weit nach vorn, trifft alle Gegner in ihrer Bahn und stößt sie zurück.'
          },
          {
            // seit 13.69 (Balance, docs/balance-klassen.md): Schaden 1,7 → 1,9, Welle der Sichelwelle 1,4 → 1,6
            id: 'schwertwirbel', name: 'Schwertwirbel', short: 'SW', kind: 'angriff', unlock: 10, mp: 14, cooldown: 6,
            type: 'circle', radius: 100, dmg: 1.9, stun: 0.8,
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
            // seit 13.85 mit Zielkreis (aim, aimMax = Sprungweite): Landeplatz frei wählbar wie bei einem Zauber
            type: 'leap', aim: true, aimMax: 190, distance: 190, radius: 80, dmg: 0.9, stun: 1.6, crater: 50,
            crouch: 0.07, air: 0.32, recover: 0.14, anim: 'sprung', animDur: 0.56, color: '#c8a878',
            text: 'Du springst bis zu 190 weit nach vorn und schlägst beim Landen in den Boden: Die Erde gibt unter dir nach, alle Gegner im Umkreis werden 1,6 s betäubt und leicht verletzt. Den Landeplatz wählst du wie bei einem Zauber mit dem Zielkreis.'
          },
          {
            // seit 13.2 schon ab Stufe 3 (tauscht mit dem Schwertwirbel)
            id: 'schwertaura', name: 'Aura des Schwertes', short: 'AS', kind: 'buff', unlock: 3, mp: 30, cooldown: 60,
            // fester Angriffswert, seit 13.49 nach eigener Rangtabelle (auraFlat in kampf.js: normal 30–70 … V 600, dazu Hauptwert)
            type: 'buff', duration: 180, effects: { atkFlat: 30, crit: 0.04 },
            text: 'Buff: Eine leuchtende Aura umgibt dein Schwert. Fester Angriff obendrauf (wächst mit der Stufe) und mehr kritische Treffer.'
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
            type: 'erupt', range: 120, dmg: 1.6, stun: 1.5, launch: 40, dodge: 40, lock: 0.36,
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
            // seit 13.69: der Tank macht weniger Schaden (Geistesschlag 3,4 → 2,5, Felsenfaust 2,0 → 1,6); Überleben und Kontrolle bleiben
            id: 'geistesschlag', name: 'Geistesschlag', short: 'GS', kind: 'angriff', unlock: 7, mp: 18, cooldown: 7,
            type: 'strike', range: 72, dmg: 2.5, critBonus: 0.15, knockback: 80, color: '#9fd0ff',
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
        // seit 13.50: Fertigkeiten nur mit Dolch (weapon)
        id: 'dolch', name: 'Weg des Dolches', role: 'PvE · Hinterhalt und Blitzangriff', weapon: 'dagger',
        description: 'Verschwindet in der Tarnung, schlägt aus dem Hinterhalt zu, steht per Blitzangriff sofort beim nächsten Ziel und wirbelt durch Gruppen.',
        skills: [
          {
            id: 'hinterhalt', name: 'Hinterhalt', short: 'HH', kind: 'angriff', unlock: 1, mp: 8, cooldown: 4,
            // seit 13.85 Hinterhalt ×1,5 statt ×2 (mit Tarnung ×3 statt ×6)
            type: 'strike', range: 70, dmg: 3.7, critBonus: 0.4, ambushMul: 1.5, ambushRange: 220,
            text: 'Ein gezielter Stich mit hohem Schaden. Aus der Tarnung springst du hinter das Ziel (bis 220 weit) und triffst 1,5-mal so hart – zusammen mit dem Tarnungs-Bonus 3× Schaden, sicher kritisch.'
          },
          {
            id: 'tarnung', name: 'Tarnung', short: 'TA', kind: 'buff', unlock: 3, mp: 16, cooldown: 35,
            // seit 13.85 doppelter statt dreifacher Schaden aus der Tarnung
            type: 'buff', duration: 30, effects: { invisible: true, speed: 0.12 }, nextHitMul: 2,
            // seit 13.87 {dauer}: die Dauer wächst mit der Stufe (skillDuration: Stufe 1 30 s, Stufe 15 38 s, E1 41 s …),
            // skillText (kampf.js) setzt die echte Zahl ein – vorher stand fest „30 s“ da (und wurde für die Abklingzeit gehalten)
            text: 'Buff: {dauer} s unsichtbar, bis du angreifst. Monster verlieren dich aus den Augen, dein nächster Angriff macht doppelten Schaden: ein Grundangriff, jede Attacke und auch die Ulti mit allen Treffern (auch Flächenangriffe), der erste Treffer sicher kritisch – mit Hinterhalt 3×.'
          },
          {
            id: 'wirbelklinge', name: 'Wirbelklinge', short: 'WK', kind: 'angriff', unlock: 5, mp: 16, cooldown: 6,
            type: 'circle', radius: 95, dmg: 2.3,
            text: 'Du drehst dich mit beiden Dolchen und triffst alle Gegner um dich.'
          },
          {
            id: 'blitzangriff', name: 'Blitzangriff', short: 'BA', kind: 'angriff', unlock: 7, mp: 18, cooldown: 8,
            // seit 13.85 mit Zielkreis: hinter dem Gegner am gewählten Punkt (aimR)
            type: 'blink', aim: true, aimR: 55, range: 300, dmg: 3.0, stun: 1.2, critBonus: 0.15, color: '#9fd0ff',
            text: 'Von einem Moment auf den anderen stehst du hinter deinem Ziel (bis 300 weit) und schlägst zu. Das Ziel ist kurz betäubt. Mit dem Zielkreis wählst du, hinter welchem Gegner du auftauchst.'
          },
          {
            // seit 13.85 Schattenkette statt Leichtfüßigkeit (Buff mit bis zu +130 % Angriffstempo): der Ninja springt von
            // Gegner zu Gegner und schneidet jeden (ninja-fx.js). hops Sprünge, je Rang rankHops (E 5, H 6, L 6, V 7), alle
            // every s; jeder Sprung zum nächsten noch nicht getroffenen Gegner bis hopRange, sonst hin und her – weitere
            // Treffer am selben Gegner machen repeatMul, der erste Schnitt je Gegner betäubt stun s. Stufe, Rang, Leistenplatz und Bücher der Leichtfüßigkeit gehen mit
            // (SKILL_RENAMED in spieler.js)
            id: 'schattenkette', name: 'Schattenkette', short: 'SK', kind: 'angriff', unlock: 10, mp: 22, cooldown: 11,
            type: 'chainblink', range: 300, hopRange: 220, hops: 4, rankHops: [5, 6, 6, 7], every: 0.13, dmg: 1.5, stun: 0.6, repeatMul: 0.5, color: '#8a5ae0',
            text: 'Du zerfällst zu Schatten und springst von Gegner zu Gegner: Beginnend bei deinem Ziel (bis 300 weit) tauchst du viermal (erweckt fünfmal, heroisch und legendär sechsmal, vollendet siebenmal) hinter dem nächsten Gegner auf und schneidest ihn – er taumelt 0,6 s. Sind weniger Gegner da, springst du zwischen ihnen hin und her – jeder weitere Schnitt am selben Gegner macht nur halben Schaden. Während der Sprünge nimmst du keinen Schaden.'
          }
        ]
      },
      {
        // seit 13.57: Weg des Falken statt Weg des Schattens – der Fernkampf-Ninja mit Pfeil und Bogen (fernninja.js).
        // Der Weg behält Index 1 (Spielstände speichern p.path); seine Fertigkeiten gehen nur mit einem Bogen (weapon).
        id: 'falke', name: 'Weg des Falken', role: 'Fernkampf · Pfeil und Bogen', weapon: 'bow',
        description: 'Trifft aus großer Entfernung: eine schnelle Salve aus Falkenpfeilen, ein langer Pfeilregen, ein Schuss, der ganze Reihen durchbohrt, ein Salto rückwärts mit Pfeilfächer und ein Schattenschritt. Jeder Schuss trägt dunkle Schattenmagie und braucht Pfeile vom Bogenmacher; der Falkenblick ist der Klassensegen.',
        skills: [
          {
            id: 'falkenpfeil', name: 'Falkenpfeil', short: 'FP', kind: 'angriff', unlock: 1, mp: 8, cooldown: 4,
            // seit 13.70 eine Salve (fernninja.js): drei Pfeile im Abstand von 0,15 s, ab Heroisch vier (rankCount, je 0,8);
            // dmg je Pfeil, der letzte ×lastMul und stößt zurück. Zusammen 1,3 + 1,3 + 1,63 ≈ 4,2 (seit 13.70 nach Balance-Messung angehoben).
            // arrows: 1 = mindestens ein Pfeil nötig; verbraucht wird je geschossenem Pfeil einer
            type: 'bshot', range: 520, speed: 1050, dmg: 1.3, lastMul: 1.25, count: 3, every: 0.15, rankCount: { rank: 1, count: 4, dmg: 1.1, every: 0.13 },
            knockback: 45, arrows: 1, anim: 'bogensalve3', animDur: 0.7, color: '#b48cff',
            text: 'Eine schnelle Salve: Du ziehst Schlag auf Schlag drei Schattenpfeile aus dem Köcher und schießt sie aufs Ziel (bis 520 weit), eingehüllt in eine dunkelviolette Aura. Der letzte Pfeil schlägt mit einem Schattenstoß ein, trifft etwas härter und stößt zurück. Ab Heroisch sind es vier Pfeile. Jeder Pfeil der Salve verbraucht einen Pfeil – reichen sie nicht, fliegen so viele, wie du hast.'
          },
          {
            // seit 13.76 Pfeilregen statt Giftfalle (davor bis 13.69 Pfeilhagel; Stufe, Rang, Leistenplatz und Schriftrollen
            // gehen über SKILL_RENAMED mit): Ort wählen, Salve in den Himmel, dann regnet es ticks × every s lang Schattenpfeile
            // in den Kreis (fernninja.js). Je Puls dmg an allen Gegnern im Kreis und Verlangsamung, solange sie drinstehen;
            // je Rang ein Puls (0,5 s) mehr und rankRate Pfeile je s dichter. Je Puls 0,4 (alter Pfeilhagel 0,8 je Welle),
            // zusammen 10 × 0,4 = 4,0 (Pfeilhagel 3 × 0,8 = 2,4; die Giftfalle kam mit Gift auf 4,0 und betäubte 1 s) –
            // nach Balance-Messung so hoch, sonst fiel der Weg aus dem Korridor (0,3 je Puls und 35 % Bremse: 87 statt 95)
            id: 'pfeilregen', name: 'Pfeilregen', short: 'PR', kind: 'angriff', unlock: 3, mp: 16, cooldown: 9,
            type: 'bregen', aim: true, range: 520, radius: 135, delay: 0.85, ticks: 10, every: 0.5, dmg: 0.4, slow: { amount: 0.5, duration: 0.8 },
            rate: 24, rankRate: 4, shots: 3, shotEvery: 0.14, arrows: 3, anim: 'bogenregen', animDur: 0.68, color: '#8a4ae8',
            text: 'Du wählst einen Ort (bis 520 weit) und schießt eine Salve aus drei Pfeilen steil in den Himmel. Über dem Ort zieht eine dunkle Wolke auf, dann regnet es 5 s lang ununterbrochen dunkelviolette Schattenpfeile in den Kreis (135 weit) – sie schlagen ein, wirbeln Staub und Schatten auf und bleiben eine Weile im Boden stecken. Alle Gegner im Kreis nehmen zweimal pro Sekunde leichten Schaden und sind um 50 % verlangsamt, solange sie drinstehen. Je Rang regnet es 0,5 s länger und dichter: erweckt 5,5 s, heroisch 6 s, legendär 6,5 s, vollendet 7 s. Verbraucht 3 Pfeile.'
          },
          {
            id: 'durchschuss', name: 'Durchbohrender Schuss', short: 'DS', kind: 'angriff', unlock: 5, mp: 16, cooldown: 7,
            type: 'bpierce', range: 680, speed: 1250, dmg: 2.8, knockback: 30, pierce: true, arrows: 1, anim: 'bogenzug', animDur: 0.46, color: '#a070f0',
            text: 'Ein Pfeil, um den sich dunkle Schatten zu einer Spirale drehen: Er durchschlägt alle Gegner in einer Linie bis 680 weit und stößt sie zurück.'
          },
          {
            id: 'rueckensprung', name: 'Rückensprung', short: 'RS', kind: 'angriff', unlock: 7, mp: 18, cooldown: 10,
            // Pfeile fliegen viel weiter (780 statt 460, etwas langsamer), bremsen länger, treffen dafür schwächer (0,85 statt 1,2);
            // aimRange: Ziel, von dem man wegspringt, wie bisher in der Nähe
            // seit 13.85 mit Zielkreis (aimAway wie Schattenschritt): Landeplatz hinter der Figur frei wählbar
            type: 'bleap', aim: true, aimAway: 140, aimMax: 140, aimR: 34, distance: 140, air: 0.36, count: 5, angle: 50, range: 780, aimRange: 460, speed: 760, dmg: 1.35, slow: { amount: 0.55, duration: 3.5 },
            arrows: 5, color: '#9a6ae0',
            text: 'Ein Salto rückwärts, bis zu 140 weit weg von deinem Ziel. Noch in der Luft schießt du einen Fächer aus fünf Schattenpfeilen nach vorn, die sehr weit fliegen (bis 780): Jeder trifft den ersten Gegner auf seinem Weg und bremst ihn 3,5 s um 55 %. Den Landeplatz wählst du mit dem Zielkreis – er beginnt hinter dir, vom Gegner weg.'
          },
          {
            // seit 13.67 statt Falkenblick (der ist jetzt der Klassensegen des Bogen-Ninjas, klassensegen.js):
            // Schattenschritt – Ort wählen, in Schattenrauch zerfallen und dort wieder auftauchen (fernninja.js)
            id: 'schattenwechsel', name: 'Schattenschritt', short: 'SS', kind: 'angriff', unlock: 10, mp: 22, cooldown: 10,
            // seit 13.70 ein reiner Fluchtschritt: aimAway – der Zielkreis beginnt 200 hinter der Figur (vom Gegner weg),
            // der Ort wird frei gewählt, erst der Klick (oder ein zweites Antippen) wirkt
            type: 'bshadow', aim: true, aimAway: 200, range: 300, radius: 80, hide: 0.2, stun: 0.8, dmg: 0.9, slow: { amount: 0.3, duration: 1.5 }, color: '#8a5ae0',
            text: 'Ein Fluchtschritt: Der Zielkreis erscheint hinter dir, vom Gegner weg – du wählst frei einen Ort bis 300 weit, zerfällst in schwarzen Schattenrauch, ein Schattenfalke reißt dich als violette Spur dorthin und du tauchst einen Augenblick später wieder auf. Wände, Wasser und Dörfer halten dich auf. Wo du erscheinst, platzen die Schatten auseinander: Gegner bis 80 weit nehmen leichten Schaden, sind 0,8 s betäubt und werden 1,5 s um 30 % verlangsamt.'
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
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 2,1 → 2,52, burn.dps 0,25 → 0,3
            id: 'talisman', name: 'Blitzdrache', short: 'BD', kind: 'angriff', unlock: 1, mp: 10, cooldown: 3,
            type: 'dragon', element: 'blitz', range: 340, radius: 100, speed: 620, dmg: 2.52, color: '#8fd0ff', burn: { dps: 0.3, duration: 3 },
            text: 'Du schleuderst einen Drachen aus Blitzen: Er schlängelt sich im Bogen zum Ziel, entlädt sich dort und trifft alle Gegner im Umkreis, die danach 3 Sekunden lang unter Strom stehen.'
          },
          {
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 1,05 → 1,26, burn.dps 0,3 → 0,36
            id: 'drachengebruell', name: 'Drachenwirbel', short: 'DW', kind: 'angriff', unlock: 3, mp: 18, cooldown: 7,
            type: 'vortex', radius: 170, hits: 3, dmg: 1.26, knockback: 140, color: '#ff7a2a', burn: { dps: 0.36, duration: 3 },
            text: 'Ein Geisterdrache aus Feuer kreist dreimal um dich und trifft jedes Mal alle Gegner im Umkreis. Zum Schluss schleudert er sie zurück und setzt sie in Brand.'
          },
          {
            // seit 13.69 mit Drachenschuppen (weniger erlittener Schaden): der Flächen-Schamane brach gegen Gruppen sofort zusammen.
            // Dazu Blitzdrache 1,7 → 2,1, Drachenwirbel 0,95 → 1,05, Donnersturm betäubt 1,5 s statt 1 s
            id: 'drachenkraft', name: 'Drachenkraft', short: 'DK', kind: 'buff', unlock: 5, mp: 24, cooldown: 60,
            type: 'buff', duration: 180, effects: { atk: 0.15, skillDmg: 0.15, damageTaken: -0.15 },
            text: 'Buff: Drachenkraft fließt in dich und Drachenschuppen schützen dich. Mehr Angriff, mehr Fertigkeitsschaden und weniger erlittener Schaden.'
          },
          {
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 0,3 → 0,36
            id: 'blitzschlag', name: 'Blizzard', short: 'BZ', kind: 'angriff', unlock: 7, mp: 26, cooldown: 12,
            type: 'blizzard', aim: true, range: 360, radius: 165, duration: 4, ticks: 8, shards: 26, dmg: 0.36, slow: { amount: 0.5, duration: 1.2 }, color: '#bfe8ff',
            text: 'Du wählst den Ort: Dort tobt 4 Sekunden lang ein Schneesturm mit Eiszapfen und Hagel. Er trifft alle Gegner im Kreis immer wieder und verlangsamt sie stark.'
          },
          {
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 2,6 → 3,12
            id: 'donnersturm', name: 'Donnersturm', short: 'DS', kind: 'angriff', unlock: 10, mp: 34, cooldown: 12,
            // seit 13.85 mit Zielkreis (Ort frei wählbar)
            type: 'blast', fx: 'storm', aim: true, range: 300, radius: 140, dmg: 3.12, stun: 1.5,
            text: 'Ein Gewitter entlädt sich über dem Ziel: Viele Blitze treffen alle Gegner im großen Umkreis. Den Ort wählst du mit dem Zielkreis (er beginnt bei deinem Ziel).'
          }
        ]
      },
      {
        id: 'heilung', name: 'Weg der Heilung', role: 'PvP · Heilung und Schutz',
        // seit 13.87: der Schutzgeist (Rückwurf) ist seit 13.26 der Falkengeist (kritische Treffer)
        description: 'Fesselt Gegner, heilt sich selbst und findet mit dem Falkengeist die Schwachstellen der Gegner.',
        skills: [
          // seit 13.26 überarbeitet (Kennungen bleiben, damit Stufen und Schriftrollen erhalten bleiben):
          // Lichtsturz statt Geisterfaust, Windfessel als Sturm aus Windbändern (kein Bodenkreis), Segen schwächer,
          // Heilung schwächer, Falkengeist (Krit) statt Schutzgeist
          {
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 1,8 → 2,07
            id: 'geisterfaust', name: 'Lichtsturz', short: 'LS', kind: 'angriff', unlock: 1, mp: 10, cooldown: 4,
            type: 'blast', fx: 'licht', range: 320, radius: 100, dmg: 2.07, stun: 1, color: '#fff2a0',
            text: 'Eine Säule aus Himmelslicht stürzt auf das Ziel herab und zerbirst: Alle Gegner im Umkreis nehmen Lichtschaden und sind 1 s betäubt.'
          },
          {
            id: 'windfessel', name: 'Windfessel', short: 'WF', kind: 'fluch', unlock: 3, mp: 14, cooldown: 12,
            type: 'curse', radius: 170, duration: 6, vulnerable: 0.15, slow: 0.55, color: '#d8fff8', noRunes: true,
            text: 'Ein Sturm aus Windbändern bricht von dir aus und schnürt jeden Gegner im Umkreis ein: Sie werden stark verlangsamt und nehmen etwas mehr Schaden.'
          },
          {
            id: 'segen', name: 'Segen', short: 'SG', kind: 'buff', unlock: 5, mp: 22, cooldown: 60,
            type: 'buff', duration: 180, effects: { damageTaken: -0.2, regen: 0.008, crit: 0.08 },
            text: 'Buff: Weniger erlittener Schaden (Stufe 1: 8 %, Stufe 15: 15 %, E1: 20 %, danach langsam mehr), Leben regeneriert sich, mehr kritische Treffer.'
          },
          {
            id: 'heilung', name: 'Heilung', short: 'HE', kind: 'heilung', unlock: 7, mp: 30, cooldown: 20,
            type: 'heal', amount: 0.3, duration: 120, effects: { atk: 0.06 },
            text: 'Heilt einen Teil deines Lebens und gibt dir danach etwas mehr Angriff.'
          },
          {
            // seit 13.69 nur noch kritische Treffer (vorher 7 % und +15 % kritischer Schaden; mit Rang und Intelligenz bis ×4 – der Heiler
            // machte auf hohen Stufen so viel Schaden wie ein Schadensweg); Lichtsturz 2,1 → 1,8
            id: 'schutzgeist', name: 'Falkengeist', short: 'FG', kind: 'buff', unlock: 10, mp: 28, cooldown: 60,
            type: 'buff', duration: 180, effects: { crit: 0.04 },
            text: 'Buff: Ein leuchtender Geisterfalke kreist über dir und zeigt dir die Schwachstellen. Mehr kritische Treffer.'
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
            text: 'Gedrückt halten: Ein pulsierender Blutfaden spannt sich von deinem Ziel zu deiner Hand. Fünfmal pro Sekunde reißt er Blut heraus – Schaden – und 35 % davon fließen als Leben zu dir. Er läuft, solange du gedrückt hältst – bis zu 8 s. Stirbt das Ziel, springt der Faden auf den nächsten Gegner in der Nähe. Loslassen oder Mana leer beenden ihn.'
          },
          {
            // seit 8.5 (ersetzt den Seelensturm): ein Käfig aus Rippen bricht beim Ziel aus dem Boden, der gefangene Geist schreit fünfmal
            id: 'seelenkaefig', name: 'Seelenkäfig', short: 'SK', kind: 'angriff', unlock: 3, mp: 18, cooldown: 8,
            // seit 13.85 mit Zielkreis (Ort frei wählbar)
            type: 'cage', aim: true, range: 300, place: 110, radius: 125, rise: 0.35, pulses: 5, every: 1.0, dmg: 0.7, pull: 30,
            slow: { amount: 0.25, duration: 1.2 }, lock: 0.25, color: '#7fe3a0', anim: 'kaefig', animDur: 0.55,
            text: 'Ein Käfig aus riesigen Rippen bricht bei deinem Ziel aus dem Boden. Der Geist darin schreit 5 s lang jede Sekunde: Jeder Schrei trifft und verlangsamt alle Gegner im Umkreis, der erste zieht sie heran. Den Ort wählst du mit dem Zielkreis (er beginnt bei deinem Ziel).'
          },
          {
            id: 'totenbeschwoerung', name: 'Totenbeschwörung', short: 'TB', kind: 'beschwörung', unlock: 5, mp: 30, cooldown: 40,
            type: 'summon', count: 3, duration: 90,
            // Index = skillRank(lvl) + 1: 0 = Stufe 1–15, 1 = Erwacht, 2 = Heroisch, 3 = Legendär, 4 = Vollendet
            tiers: [
              // seit 13.69 beißen die Diener härter und je Rang mehr (vorher 0,45 und 0,55 auf allen Rängen); Seelenkäfig 0,5 → 0,7, Geisterflut 0,9 → 1,15
              { kind: 'skelett', name: 'Skelettkrieger', hp: 0.4,  atk: 0.5, every: 1.1,  windup: 0.18, speed: 160, def: 0.6, scale: 1.0 },
              { kind: 'hund',    name: 'Knochenhund',    hp: 0.45, atk: 0.62, every: 0.85, windup: 0.12, speed: 195, def: 0.6, scale: 1.0,  pounce: true },
              { kind: 'hund',    name: 'Knochenhund',    hp: 0.5,  atk: 0.66, every: 0.85, windup: 0.12, speed: 200, def: 0.6, scale: 1.08, pounce: true, slow: 0.25 },
              { kind: 'hund',    name: 'Seelenhund',     hp: 0.55, atk: 0.7,  every: 0.85, windup: 0.12, speed: 205, def: 0.7, scale: 1.14, pounce: true, slow: 0.25, burst: 1.0 },
              { kind: 'hund',    name: 'Seelenhund',     hp: 0.6,  atk: 0.74, every: 0.85, windup: 0.1,  speed: 210, def: 0.7, scale: 1.18, pounce: true, slow: 0.3,  burst: 1.2, alpha: 1.15 }
            ],
            // seit 13.87 {dauer}: die Diener bleiben skillDuration lang (wächst mit der Stufe), nicht fest 90 s
            text: 'Drei Skelettkrieger steigen aus dem Boden und kämpfen {dauer} s an deiner Seite. Ab dem Erwecken (E1) rufst du stattdessen drei Knochenhunde, die schnell sind, Gegner anspringen und richtig zubeißen.'
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
            type: 'ghostflood', aim: true, range: 380, radius: 150, ghosts: 8, rise: 0.55, dmg: 1.15, splash: 45,
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
            // seit 11.7 neu: kurz und heftig – ein Blutband reißt die Lebenskraft heraus und heilt sofort (nekro-neu.js).
            // Seit 13.69 stärker (Balance): Lebensentzug 1,6 → 2,2 (heilt 75 % statt 60 %), Knochenwurf 1,9 → 3,0, Blutlarve 1,6 → 2,6,
            // Totenhand zerdrückt mit 2,2 statt 1,8, Blutlanzen 1,25 → 2,0 (heilen 20 % statt 15 %)
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 2,2 → 2,97
            id: 'lebensentzug', name: 'Lebensentzug', short: 'LE', kind: 'angriff', unlock: 1, mp: 10, cooldown: 4,
            type: 'lifetap', range: 300, dmg: 2.97, heal: 0.75, color: '#e0203a', nk: true, anim: 'salve', animDur: 0.4,
            text: 'Ein Blutband schnellt zu deinem Ziel und reißt in einem Ruck seine Lebenskraft heraus. Die Blutkugel fliegt in deine Brust zurück und heilt dich sofort um einen Großteil des Schadens.'
          },
          {
            // seit 11.7 (ersetzt den Knochenspeer): ein wirbelnder Oberschenkelknochen, der verlangsamt
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 3,0 → 4,05
            id: 'knochenwurf', name: 'Knochenwurf', short: 'KW', kind: 'angriff', unlock: 3, mp: 12, cooldown: 4,
            type: 'bonethrow', range: 380, speed: 520, width: 24, dmg: 4.05, slow: { amount: 0.4, duration: 2.5 }, color: '#e8dcc0', nk: true, anim: 'salve', animDur: 0.4,
            text: 'Du schleuderst einen großen Knochen, der sich überschlagend durch die Luft wirbelt. Er trifft den ersten Gegner auf seiner Bahn, zersplittert und verlangsamt ihn 2,5 s um 40 %.'
          },
          {
            // seit 11.7 (ersetzt den Knochenpanzer): eine Blutlarve springt zum Ziel und platzt
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 2,6 → 3,51, bleed.dps 0,32 → 0,43
            id: 'blutlarve', name: 'Blutlarve', short: 'BL', kind: 'angriff', unlock: 5, mp: 18, cooldown: 7,
            type: 'larva', aim: true, range: 340, radius: 110, hop: 0.55, wriggle: 0.4, dmg: 3.51, bleed: { dps: 0.43, duration: 4 }, color: '#c01828', nk: true, anim: 'kaefig', animDur: 0.5,
            text: 'Zielort wählen: Eine fette Blutlarve kriecht aus deinem Ärmel, springt in hohem Bogen zum Ziel, windet sich kurz – und platzt. Alle Gegner in der Nähe nehmen Schaden und bluten 4 s lang.'
          },
          {
            // seit 11.7 (ersetzt den Lähmenden Fluch): eine riesige Knochenhand packt das Ziel und zerdrückt es
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 0,8 → 1,08, crush 2,2 → 2,97
            id: 'totenhand', name: 'Totenhand', short: 'TH', kind: 'angriff', unlock: 7, mp: 22, cooldown: 12,
            // seit 13.85 mit Zielkreis (Ort frei wählbar, auch ohne Ziel)
            type: 'gravehand', aim: true, range: 320, radius: 75, grab: 0.4, hold: 1.6, dmg: 1.08, crush: 2.97, color: '#e8dcc0', nk: true, anim: 'kaefig', animDur: 0.55,
            text: 'Unter deinem Ziel bricht eine riesige Skeletthand aus der Erde, schließt die Finger um alle Gegner in der Nähe und hält sie 1,6 s fest. Dann ballt sie die Faust und zerdrückt sie. Den Ort wählst du mit dem Zielkreis (er beginnt bei deinem Ziel).'
          },
          {
            // seit 11.7 (ersetzt den Buff Blutopfer): Blutlanzen schießen aus dem Rücken und suchen bis zu sechs Gegner
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 2,0 → 2,7
            id: 'blutlanzen', name: 'Blutlanzen', short: 'BZ', kind: 'angriff', unlock: 10, mp: 26, cooldown: 10,
            type: 'bloodlances', range: 280, count: 6, dmg: 2.7, leech: 0.2, color: '#e0203a', nk: true, anim: 'kaefig', animDur: 0.55,
            text: 'Sechs Lanzen aus Blut wachsen dir wie Flügel aus dem Rücken und schießen auf bis zu sechs Gegner in der Nähe (bei weniger Gegnern treffen mehrere dasselbe Ziel). Jede Lanze heilt dich ein wenig.'
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
    // seit 13.87: Glutfeld statt Drachenodem (der ist seit 13.39 ersetzt)
    description: 'Gelehrter der vier Elemente. Du wählst Feuer, Frost, Blitz oder Erde – jeder Weg hat seine eigenen Zauber, von Glutfeld und Feuerball bis Blitzspeer und Gewitterwolke.',
    color: '#283070',
    trim: '#d8e0f0',
    weapon: 'rod',
    base: { hp: 110, mp: 90, atk: 13.5, def: 2.5, crit: 0.06, speed: 130 },
    perLevel: { hp: 17, mp: 11, atk: 4.0, def: 0.95 },
    basic: { range: 240, cooldown: 0.9, ranged: true, color: '#b8c4ff', style: 'mage' },
    paths: [
      {
        id: 'feuer', name: 'Weg der Flamme', role: 'PvE · Flächenschaden und Brand',
        description: 'Setzt alles in Brand: ein Glutfeld, das den Boden aufreißt, ein riesiger Feuerball mit Zauberzeit, Brand über Zeit auf einzelne Gegner, die Phönixflamme als Burst und Feuertornados, die durch ein Feld wirbeln.',
        skills: [
          {
            // seit 13.39 statt des Drachenodems: Glutfeld – aufgerissener Boden mit Flammensäulen (feuerfeld.js)
            // seit 13.69 betäubt jeder Puls kurz (stun, feuerfeld.js): der Feuer-Weg hatte gar keine Kontrolle
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 0,45 → 0,68, burn.dps 0,25 → 0,38
            id: 'glutfeld', name: 'Glutfeld', short: 'GF', kind: 'angriff', unlock: 1, mp: 10, cooldown: 6,
            type: 'mfield', el: 'feuer', aim: true, range: 260, radius: 95, delay: 0.35, ticks: 5, every: 0.5, dmg: 0.68, stun: 0.35,
            burn: { dps: 0.38, duration: 3 }, anim: 'zauber', animDur: 0.45, color: '#e8362a',
            text: 'Du wählst einen Ort (Kreis antippen): Dort reißt der Boden glühend auf: Ein Kreis aus Glutrissen mit Flammensaum, in dem 2,5 s lang Flammensäulen aus der Erde schlagen. Alle Gegner im Kreis (95 weit) nehmen fünfmal Feuerschaden und geraten jedes Mal kurz aus dem Tritt (0,35 s betäubt), der letzte Puls setzt sie 3 s in Brand.'
          },
          {
            // seit 11.5 mit 3 s Zauberzeit: viel größer und stärker; Bewegen bricht ab (Mana und Abklingzeit zurück)
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 5,6 → 8,4, burn.dps 0,4 → 0,6
            id: 'feuerball', name: 'Feuerball', short: 'FB', kind: 'angriff', unlock: 3, mp: 20, cooldown: 2,
            // seit 13.69 stößt der Einschlag das Ziel zurück (knockback) und die Explosion trifft mit 80 % statt 60 %
            type: 'mcast', el: 'feuer', castTime: 3, range: 400, speed: 430, dmg: 8.4, splash: { r: 115, mul: 0.8 }, burn: { dps: 0.6, duration: 4 }, knockback: 80,
            style: 'fireball', big: 2.1, anim: 'zauber', animDur: 3, color: '#e8362a',
            text: 'Zauberzeit 3 s: Zwischen deinen Händen wächst ein riesiger Feuerball. Danach fliegt er zum Ziel und explodiert – gewaltiger Schaden, das Ziel wird zurückgeschleudert, Gegner bis 115 weit darum bekommen etwas weniger ab, alle brennen 4 s. Bewegst du dich oder zauberst du etwas anderes, bricht er ab (Mana und Abklingzeit zurück).'
          },
          {
            // seit 11.5 statt Flammenschritt: Brand – Feuerschaden über Zeit auf ein Ziel (wie Gift)
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 0,4 → 0,6, burn.dps 0,95 → 1,42
            id: 'brand', name: 'Brand', short: 'BR', kind: 'angriff', unlock: 5, mp: 14, cooldown: 6,
            type: 'mignite', el: 'feuer', range: 340, dmg: 0.6, burn: { dps: 1.42, duration: 6 },
            anim: 'zauber', animDur: 0.4, color: '#e8362a',
            text: 'Du schnippst einen Funken auf einen Gegner: Er fängt Feuer und brennt 6 s lang – jede Sekunde Feuerschaden, zusammen gut das Vierzehnfache des Funkens selbst. Wie Gift, nur heißer.'
          },
          {
            // seit 11.5 statt Glutherz: Phönixflamme – der große Feuer-Burst
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 3,4 → 5,1, burn.dps 0,35 → 0,52
            id: 'phoenix', name: 'Phönixflamme', short: 'PH', kind: 'angriff', unlock: 7, mp: 28, cooldown: 14,
            // seit 13.69 betäubt die Explosion am Ziel 1,5 s (stun, magier-neu.js)
            type: 'mphoenix', el: 'feuer', range: 400, speed: 470, dmg: 5.1, pathR: 42, pathMul: 0.6, blast: { r: 105, mul: 0.7 }, stun: 1.5,
            combust: 0.6, burn: { dps: 0.52, duration: 4 }, anim: 'stoss', animDur: 0.45, color: '#e8362a',
            text: 'Ein Phönix aus Flammen bricht aus deinem Zepter, fliegt zum Ziel und verbrennt alles auf seinem Weg. Am Ziel stürzt er herab und explodiert: Brennt das Ziel schon, lodert es auf und nimmt deutlich mehr Schaden, und alle bis 105 weit fangen Feuer und sind 1,5 s betäubt.'
          },
          {
            // seit 13.40 statt des Flammenkreises: Feuertornados im gewählten Kreis (feuerfeld.js); mehr Tornados je Rang
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 0,5 → 0,75, burn.dps 0,3 → 0,45
            id: 'feuertornado', name: 'Feuertornados', short: 'FT', kind: 'angriff', unlock: 10, mp: 30, cooldown: 12,
            type: 'mtornado', el: 'feuer', aim: true, range: 340, radius: 150, delay: 0.4, life: 4, every: 0.5, dmg: 0.75, hitR: 44,
            burn: { dps: 0.45, duration: 3 }, anim: 'zauber', animDur: 0.55, color: '#e8362a',
            text: 'Du wählst einen Ort: Im Kreis erheben sich Feuertornados und wirbeln 4 s lang umher. Jeder Tornado trifft alles, was er berührt, zweimal pro Sekunde, zieht Gegner zu sich und setzt sie in Brand. Mehr Tornados je Stufe: 2, ab Stufe 8 drei, erweckt 4, heroisch 5, legendär 6, vollendet 7.'
          }
        ]
      },
      {
        id: 'frost', name: 'Weg des Frosts', role: 'Kontrolle · Einfrieren',
        description: 'Lässt Gegner im Eis erstarren, bremst sie mit dem Eisstrahl immer weiter aus und begräbt sie in einem Schneesturm. Weniger Schaden, sehr viel Kontrolle.',
        skills: [
          {
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 1,4 → 1,89
            id: 'frostnova', name: 'Frostnova', short: 'FR', kind: 'angriff', unlock: 1, mp: 9, cooldown: 6,
            type: 'nova', el: 'frost', radius: 130, grow: 0.38, dmg: 1.89, freeze: 1.0, slow: { amount: 0.45, duration: 3 }, duelMul: 1.15,
            lock: 0.2, anim: 'nova', animDur: 0.5, color: '#3a7bff',
            text: 'Eiskristalle schießen von deinen Füßen waagrecht nach außen und überziehen den Boden mit Reif. Alle Gegner bis 130 weit frieren 1 s ein (wächst mit der Stufe) und sind danach 3 s langsamer. Bosse werden nur verlangsamt.'
          },
          {
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 0,34 → 0,46
            id: 'eisstrahl', name: 'Eisstrahl', short: 'EI', kind: 'angriff', unlock: 3, mp: 6, cooldown: 1.5,
            type: 'beam', el: 'frost', channel: true, range: 300, width: 26, every: 0.2, maxDur: 6, minDur: 0.5, dmg: 0.46, mpPerSec: 9,
            slow: { amount: 0.3, max: 0.7, build: 0.25, duration: 1 }, duelMul: 1.1, color: '#9ff6ff',
            // seit 13.64: Kombo gegen verlangsamte (slow) und eingefrorene oder betäubte (stun) Gegner, je Rang + step (eisstrahl.js)
            combo: { slow: 0.25, stun: 0.5, step: [0.05, 0.1] },
            text: 'Gedrückt halten: Ein eisiger Strahl schießt aus deinen Händen und trifft alle Gegner in einer Linie bis 300 weit, fünfmal pro Sekunde mit leichtem Schaden. Wer im Strahl steht, wird immer langsamer (30 % bis 70 %). Kombo: Gegen Gegner, die schon verlangsamt sind (etwa durch Frostnova oder Blizzard), trifft er 25 % härter, gegen eingefrorene oder betäubte 50 % – mehr je Rang, hellblaue Zahlen. Kostet laufend Mana; du kannst dabei langsam gehen. Loslassen beendet den Strahl.'
          },
          {
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 0,9 → 1,22
            id: 'eisschritt', name: 'Eisschritt', short: 'ES', kind: 'angriff', unlock: 5, mp: 16, cooldown: 10,
            // seit 13.85 mit Zielkreis (aimAway): Fluchtweg frei wählbar, der Kreis beginnt hinter der Figur
            type: 'shift', el: 'frost', at: 'start', aim: true, aimAway: 160, aimMax: 160, aimR: 34, distance: 160, radius: 95, delayHit: 0.5, dmg: 1.22, freeze: 0.8,
            slow: { amount: 0.5, duration: 2.5 }, duelMul: 1.15, anim: 'schritt', animDur: 0.3, color: '#3a7bff',
            text: 'Du gleitest auf einer Eisbahn bis zu 160 weit davon. Wo du standest, bleibt eine Eisfigur zurück, die nach 0,5 s zerspringt: Alle Gegner bis 95 weit frieren kurz ein. Wohin, wählst du mit dem Zielkreis – er beginnt hinter dir, vom Gegner weg.'
          },
          {
            // seit 13.64 statt Frostpanzer: Eisgefängnis – Flächen-Betäubung am gewählten Ort (frostgefaengnis.js).
            // Eingefroren hold s, je Rang + holdStep (prisonHold); zum Schluss zersplittert das Eis (crack) und verlangsamt (after)
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 1,8 → 2,43, crack 1,1 → 1,49
            id: 'eisgefaengnis', name: 'Eisgefängnis', short: 'EG', kind: 'angriff', unlock: 7, mp: 26, cooldown: 15,
            type: 'mprison', el: 'frost', aim: true, range: 380, radius: 115, delay: 0.45, dmg: 2.43, crack: 1.49, hold: 1.5, holdStep: 0.15,
            after: { amount: 0.4, duration: 2 }, bossSlow: 0.5, duelMul: 1.15, anim: 'zauber', animDur: 0.55, color: '#3a7bff',
            text: 'Du wählst einen Ort: Der Boden überfriert und reißt blau leuchtend auf, dann bricht ein Gefängnis aus Eis hervor. Hohe Kristallsäulen schießen aus der Erde, um jeden Gegner im Kreis (115 weit) wachsen Eiszacken zusammen: Alle nehmen Frostschaden und sind im Eis gefangen – 1,5 s lang betäubt (erweckt 1,65 s, heroisch 1,8 s, legendär 1,95 s, vollendet 2,1 s). Dann zersplittert das Eis: noch einmal Schaden, danach sind sie 2 s langsamer. Bosse werden nicht eingefroren, nur stark verlangsamt. Reichweite 380.'
          },
          {
            // seit 13.54 statt Kristallgrab: Blizzard – ein echter Schneesturm im gewählten Kreis (schneesturm.js).
            // Verlangsamung wächst je Puls im Sturm (slow.build) bis slow.max; je Rang 0,5 s länger (snowTicks)
            // seit 13.69 (Balance): Schaden 0,45 → 0,36, Eisgefängnis je Rang +0,15 s statt +0,25 s – der Kontroll-Weg führte sonst auch in Fläche und Überleben
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 0,36 → 0,49
            id: 'schneesturm', name: 'Blizzard', short: 'BZ', kind: 'angriff', unlock: 10, mp: 30, cooldown: 12,
            type: 'msnow', el: 'frost', aim: true, range: 340, radius: 150, delay: 0.5, ticks: 8, every: 0.5, dmg: 0.49, freeze: 0.8,
            slow: { amount: 0.25, max: 0.6, build: 0.07, duration: 1.2 }, duelMul: 1.1, anim: 'zauber', animDur: 0.55, color: '#3a7bff',
            // seit 13.64 ohne Sturmwolke: blauweißer Schnee, Eissplitter, frostblaues Leuchten und Frostnebel
            text: 'Du wählst einen Ort: Dort bricht 4 s lang ein eisiger Schneesturm los – dichter blauweißer Schnee, wirbelnde Eissplitter, frostblaues Leuchten und Frostnebel am Boden. Alle Gegner im Kreis (150 weit) nehmen zweimal pro Sekunde Frostschaden und werden immer langsamer, je länger sie drinbleiben (25 % bis 60 %). Zum Schluss frieren sie kurz ein, Bosse werden nur verlangsamt. Je Rang tobt der Sturm 0,5 s länger: erweckt 4,5 s, heroisch 5 s, legendär 5,5 s, vollendet 6 s.'
          }
        ]
      },
      {
        id: 'blitz', name: 'Weg des Blitzes', role: 'PvP · Ketten und Tempo',
        description: 'Blitze springen von Gegner zu Gegner. Der Blitzspeer lädt Gegner auf, der Kettenblitz entlädt sie. Ein Blitzschritt mit einer Spur aus Himmelsblitzen und die Gewitterwolke aus der Ferne.',
        skills: [
          {
            // seit 11.5 statt der Blitznova: ein Speer, der alles in einer Linie durchschlägt (kein Bodenkreis)
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 1,6 → 2,32
            id: 'blitzspeer', name: 'Blitzspeer', short: 'SP', kind: 'angriff', unlock: 1, mp: 9, cooldown: 4,
            type: 'mspear', el: 'blitz', range: 390, width: 34, dmg: 2.32, stun: 0.25, charge: 5,
            anim: 'stoss', animDur: 0.35, color: '#ffe94a',
            text: 'Du schleuderst einen Speer aus reinem Blitz: Er durchschlägt alle Gegner in einer Linie bis 390 weit, betäubt sie kurz und lädt sie 5 s auf – der Kettenblitz entlädt sie für mehr Schaden.'
          },
          {
            // seit 13.69 (Balance): Kettenblitz 1,9 → 2,6, Blitzspeer 1,5 → 1,6, Gewitterwolke 0,95 → 1,1 (Entladung 1,8 → 2,2), Kugelblitz 0,55 → 0,85
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 2,6 → 3,77
            id: 'kettenblitz', name: 'Kettenblitz', short: 'KB', kind: 'angriff', unlock: 3, mp: 11, cooldown: 3,
            type: 'mbolt', el: 'blitz', range: 340, speed: 950, dmg: 3.77, chain: 2, chainMul: 0.8, discharge: 0.3, stun: 0.2,
            style: 'arc', anim: 'stoss', animDur: 0.3, color: '#ffe94a',
            text: 'Ein Blitz schießt aus deinem Zepter zum Ziel und springt zu zwei weiteren Gegnern. Aufgeladene Gegner entladen sich und nehmen mehr Schaden.'
          },
          {
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 1,5 → 2,17, trail.dmg 0,45 → 0,65
            id: 'blitzschritt', name: 'Blitzschritt', short: 'BS', kind: 'angriff', unlock: 5, mp: 16, cooldown: 8,
            // 13.85–13.92 mit Zielkreis; seit 13.93 wieder ohne: sofort in Blickrichtung (facing), volle Weite
            type: 'shift', el: 'blitz', at: 'line', facing: true, distance: 200, width: 40, dmg: 2.17, stun: 0.5, trail: { n: 5, r: 44, dmg: 0.65, every: 0.08 },
            anim: 'schritt', animDur: 0.3, color: '#ffe94a',
            text: 'Du wirst selbst zum Blitz und schlägst sofort bis zu 200 weit in Blickrichtung ein – ohne Zielen. Alle Gegner auf der Strecke werden getroffen und kurz betäubt. Hinter dir krachen fünf Blitze vom Himmel auf deinen Weg und treffen, wer dort steht.'
          },
          {
            // seit 11.5 statt Statische Ladung: Gewitterwolke – Flächenschaden aus der Ferne
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 1,1 → 1,6, final.dmg 2,2 → 3,19
            id: 'gewitter', name: 'Gewitterwolke', short: 'GW', kind: 'angriff', unlock: 7, mp: 26, cooldown: 14,
            type: 'mstorm', el: 'blitz', aim: true, range: 460, radius: 165, form: 0.6, strikes: 6, every: 0.3, dmg: 1.6,
            final: { dmg: 3.19, stun: 1.5 }, anim: 'zauber', animDur: 0.55, color: '#ffe94a',
            text: 'Über dem gewählten Ort ballt sich eine schwarze Gewitterwolke zusammen. Sechs Blitze schlagen nacheinander in Gegner darunter. Zum Schluss entlädt sich die ganze Wolke: Ein Netz aus Blitzen springt zwischen allen Gegnern im Feld hin und her und lähmt sie 1,5 s lang. Reichweite 460.'
          },
          {
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 0,85 → 1,23
            id: 'kugelblitz', name: 'Kugelblitz', short: 'KU', kind: 'angriff', unlock: 10, mp: 30, cooldown: 12,
            // seit 13.5 ein Gewitterfeld: Blitze fahren vom Himmel, jeder Treffer betäubt kurz, der letzte länger
            type: 'sigil', el: 'blitz', aim: true, range: 340, radius: 150, delay: 0.4, ticks: 6, every: 0.5, zaps: 3, dmg: 1.23, zapStun: 0.25,
            last: { stun: 0.8 }, anim: 'zauber', animDur: 0.55, color: '#ffe94a',
            text: 'Über dem gewählten Feld bricht ein Gewitter los: 3 s lang fahren jede halbe Sekunde Blitze vom Himmel in die drei nächsten Gegner – aufgeladene zuerst – und betäuben sie kurz. Der letzte Schlag betäubt länger.'
          }
        ]
      },
      {
        id: 'erde', name: 'Weg der Erde', role: 'Schutz · Schwerkraft und Hochschleudern',
        description: 'Basalt und Bernstein: zwei Felsen krachen am Ziel zusammen, ein riesiges Felsgeschoss betäubt, Erdspitzen spießen ganze Gruppen auf, ein Bergsturz fällt vom Himmel und die Schwerkraft lässt Felsen um die Gegner kreisen.',
        skills: [
          {
            // seit 11.5 statt der Erdnova: zwei Felsbrocken krachen aus der Ferne am Ziel zusammen
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 1,9 → 2,47
            id: 'steinschlag', name: 'Steinschlag', short: 'SS', kind: 'angriff', unlock: 1, mp: 9, cooldown: 5,
            // seit 13.69 (Balance): Steinschlag 1,7 → 1,9 und 0,6 s betäubt, Felsgeschoss 3,0 → 3,8, Erdspitzen 1,7 → 2,0 und 1 s betäubt,
            // Bergsturz 3,2 → 4,4, Schwerkraftsiegel-Einsturz 1,6 → 2,4; Steinhaut nach dem Weltenbruch hält 60 s (magier.js)
            type: 'mclash', el: 'erde', range: 360, radius: 90, dmg: 2.47, stun: 0.6, lift: 12, duelMul: 1.15,
            anim: 'stoss', animDur: 0.4, color: '#f0a830',
            text: 'Du reißt zwei Felsbrocken aus der Erde und schleuderst sie von links und rechts auf dein Ziel zu (bis 360 weit). Dort krachen sie zusammen und zerbersten: Alle Gegner bis 90 weit werden getroffen, hochgeworfen und kurz betäubt.'
          },
          {
            // seit 11.5 viel größer: betäubt länger und trifft härter
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 3,8 → 4,94
            id: 'steingeschoss', name: 'Felsgeschoss', short: 'FG', kind: 'angriff', unlock: 3, mp: 14, cooldown: 5,
            type: 'mbolt', el: 'erde', range: 340, speed: 380, dmg: 4.94, splash: { r: 80, mul: 0.6 }, knockback: 70, stun: 1.2,
            style: 'stone', big: 2.1, anim: 'stoss', animDur: 0.4, color: '#f0a830',
            text: 'Du schleuderst einen riesigen Basaltfelsen mit glühendem Bernsteinkern. Er trifft hart, betäubt das Ziel 1,2 s, stößt es zurück und zerbirst: Gegner bis 80 weit bekommen etwas weniger ab.'
          },
          {
            // seit 11.5 statt Erdsprung: Steinspitzen brechen in einer Fläche aus der Erde
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 2,0 → 2,6
            id: 'erdspitzen', name: 'Erdspitzen', short: 'ES', kind: 'angriff', unlock: 5, mp: 16, cooldown: 8,
            // seit 13.85 mit Zielkreis (Ort frei wählbar)
            type: 'mspikes', el: 'erde', aim: true, range: 300, radius: 115, dmg: 2.6, stun: 1.0, lift: 18, duelMul: 1.15,
            anim: 'nova', animDur: 0.55, color: '#f0a830',
            text: 'Du stampfst auf: Beim Ziel (oder vor dir) brechen in zwei Wellen spitze Basaltdornen aus der Erde – erst außen, dann in der Mitte. Alle Gegner bis 115 weit werden aufgespießt, hochgeworfen und kurz betäubt. Den Ort wählst du mit dem Zielkreis (er beginnt bei deinem Ziel).'
          },
          {
            // seit 11.5 statt Basalthaut: Bergsturz – ein riesiger Fels stürzt vom Himmel
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 4,4 → 5,72
            id: 'bergsturz', name: 'Bergsturz', short: 'BG', kind: 'angriff', unlock: 7, mp: 28, cooldown: 14,
            type: 'mmeteor', el: 'erde', aim: true, range: 380, radius: 125, fall: 0.9, dmg: 5.72, stun: 1.0, knockback: 90, duelMul: 1.15,
            anim: 'zauber', animDur: 0.55, color: '#f0a830',
            text: 'Du reißt einen Berggipfel aus dem Himmel: Ein gewaltiger Felsen mit glühenden Adern stürzt auf den gewählten Ort, zieht eine Staubfahne hinter sich her und schlägt mit einer Druckwelle ein. Hoher Schaden, alle bis 125 weit werden weggeschleudert und 1 s betäubt.'
          },
          {
            // seit 13.85 stärker (Ausgleich für die globale Abklingzeit): dmg 0,6 → 0,78
            id: 'schwerkraft', name: 'Schwerkraftsiegel', short: 'SK', kind: 'angriff', unlock: 10, mp: 30, cooldown: 13,
            // seit 11.5 ohne Bodensiegel: nur der Sog und ein Ring kreisender Felsen
            type: 'mgrav', el: 'erde', aim: true, range: 320, radius: 150, delay: 0.45, pull: 70, ticks: 3, every: 0.45, dmg: 0.78, rocks: 8,
            last: { dmg: 2.4, stun: 1.2, lift: 18 }, duelMul: 1.15, anim: 'zauber', animDur: 0.55, color: '#f0a830',
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
