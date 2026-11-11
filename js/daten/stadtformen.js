// Stadtformen (seit 14.16): Ab der dritten Map in Spielreihenfolge hat jede Stadt und jedes Lager einen eigenen
// Grundriss statt des Quadrats mit Mauer und vier Toren. Kazehana (Map 1) und der Dunkelwald (Map 4) bleiben,
// wie sie sind (seit 14.70 haben der Dunkelwald und die übrigen Lichtstädte neue Formen, daten/kartenformen.js – die
// Raster hier bleiben die Vorlage der gespiegelten Schattenstädte). Hier stehen nur Daten; gebaut wird in welt.js (applyTownLayout), gezeichnet in umgebung.js (2D),
// drei-welt.js (3D) und karte.js (Karten), die Teleportsteine laufen über teleportsteine.js.
//
// Gleiche Welt für alle: Die Wildnis wird wie bisher aus dem Startwert erzeugt. Erst danach wird das Quadrat der
// alten Mauer (Kacheln ab der Mitte -H … +H, H = WORLD_MAPS.camp) nach dem Raster neu belegt. Außerhalb ändert sich
// keine Kachel, die Wege draußen kommen wie bisher in der Mitte jeder Seite an (dort liegt in jedem Raster ein Tor
// oder begehbares Land).
//
// grid      Raster von oben nach unten, je Zeichen eine Kachel (Spalte 0 = dx -H):
//             "  Wildnis (Boden des Gebiets draußen, nicht sicher – Monster dürfen hier laufen)
//             T  Baum in der Wildnis (Art des Gebiets)
//             ,  Stadtboden (Boden des sicheren Gebiets)   .  Platz   _  Weg   ^  Stadtboden mit Schneewehe
//             ~  Flüssigkeit (liquid)                       =  Brücke/Steg, Weg läuft waagrecht   H  … senkrecht
//             #  Mauer (Stein)   P  Palisade   S  Stützmauer einer Terrasse   K  Kristallwand
//             o  Tor bzw. Durchgang in der Mauer            %  Treppe zwischen zwei Terrassen
//             h  Haus (nur zur Übersicht: die Häuser selbst stehen in houses)
//             seit 14.71: i  zugefrorener See (Eis, begehbar)   w  Wasser (wenn liquid etwas anderes ist)
// liquid    Bodenart der Flüssigkeit (~): WATER, BOG, LAVA, ABGRUND
// weltentor Platz des Weltentors, spawn: Ankunft (Reise, Wiederbeleben, Spielstand auf Wasser oder Mauer)
// places    Plätze der Stadtleute wie TOWN_PLACES in welt.js: [dx, dy, Seite des Stands, Blickrichtung]
// stones    Teleportstein-Paare: [ax, ay, bx, by] – Kachel des einen und des anderen Steins
// houses    [dx, dy, Breite, Tiefe, Dachfarbe, Aussehen] (Aussehen wie VLOTHO_HOUSES); enter: begehbares Haus
//           (Aussehen, Raum und Bewohner aus TOWN_HOUSE_STYLE), [dx, dy] seiner linken oberen Kachel
// lights    Laternen (lantern), Feuerbecken (brazier), Brunnen (well): [Art, dx, dy]
// deco      Stadtschmuck wie TOWN_DECO in welt.js: [dx, dy, Code]
// Alle Plätze in Kacheln ab der Mitte der Map (WORLD_MAPS.cx, cy). Alles feste Zahlen: jeder Mitspieler sieht dieselbe Stadt.
const TOWN_LAYOUTS = {
  // Rostschlucht · Talwacht: Festungslager als Achteck mit Palisade, zwei große Tore (Nord, Süd) und zwei Pforten
  // (West, Ost, dort kommen die Wege draußen an). In der Mitte ein Kampfplatz, die Stände stehen im Kreis darum.
  5: {
    form: 'Achteck',
    grid: [
      '"""""""PPPPooooPPPPP"""""""',
      '""""""PP,,,,__,,,,,PP"""T""',
      '"T"""PP,,,,,__,,,,,,PP"""""',
      '""""PP,,,,,,__,,,,,,,PP""""',
      '"""PP,,,,,,......,,,,,PP"""',
      '""PP,,,,,,........,,,,,PP""',
      '"PP,,,,,,..........,,,,,PP"',
      'PP,,,,,,,,........,,,,,,,PP',
      'P,,,,,,,,,,......,,,,,,,,,P',
      'P,,,,,,,,,,,,,,,,,,,,,,,,,P',
      'P,,,,,,,,,,,,,,,,,,,,,,,,,P',
      'P,,,,,,,,,,,...,,,,,,,,,,,P',
      'o_________,.....,_________o',
      'o_________......._________o',
      'P,,,,,,,,,.......,,,,,,,,,P',
      'P,,,,,,,,,.......,,,,,,,,,P',
      'P,,,,,,,,,,.....,,,,,,,,,,P',
      'P,,,,,,,,,,,...,,,,,,,,,,,P',
      'P,,,,,,,,,,,__,,,,,,,,,,,,P',
      'PP,,,,,,,,,,__,,,,,,,,,,,PP',
      '"PP,,,,,,,,,__,,,,,,,,,,PP"',
      '""PP,,,,,,,,__,,,,,,,,,PP""',
      '"""PP,,,,,,,__,,,,,,,,PP"""',
      '""""PP,,,,,,__,,,,,,,PP""""',
      '"""""PP,,,,,__,,,,,,PP"""T"',
      '"T""""PP,,,,__,,,,,PP""T"""',
      '"""""""PPPPooooPPPPP"""""""'
    ],
    weltentor: [0.5, -7.2], spawn: [0.5, -4.6],
    places: {
      aeltester: [-4.6, -6.6, null, 0.35], waffen: [-8.4, -4.4, 'w'], haendler: [-6.2, -2.4, null, 0.5], schmied: [-8.6, 4.6, 'w'],
      lehrmeister: [-6.4, 2.8, null, 0.45], teleport: [3.8, -7.0, null, -0.5], ruestung: [8.8, -4.4, 'e'], alchemist: [6.4, -2.4, null, -0.5],
      lager: [9.0, 4.6, 'e'], jaegerin: [5.8, 7.2, null, -0.3], stallmeister: [-3.4, 8.8, 'n'], bogenmacher: [6.6, 2.8, null, -0.45],
      post: [5.4, -9.0, 'n'], auktion: [-4.8, -9.0, 'n'], arena: [-1.7, 1.9, null, 0.4], pvp: [2.0, 0.7, null, -0.4]
    },
    lights: [['lantern', -2.6, -10.6], ['lantern', 1.6, -10.6], ['lantern', -2.6, 11.2], ['lantern', 1.6, 11.2],
      ['brazier', -3.6, -2.0], ['brazier', 3.6, -2.0], ['brazier', -3.4, 4.6], ['brazier', 3.6, 4.6], ['well', -7.6, 7.4]],
    deco: [[-9.6, -7.8, 'X'], [9.8, -7.4, 'X'], [-11.2, 1.8, 'G'], [11.0, 2.2, 'G'], [-6.2, 10.6, 'H'], [6.8, 10.2, 'K'],
      [-1.0, -11.4, 'F'], [8.0, 8.6, 'C'], [-10.4, -2.6, 'K'], [10.6, -2.4, 'K'], [-2.6, 6.4, 'B']]
  },

  // Ödland · Aschenlager: Ringstadt um einen Glutkrater. Vier Speichen führen von den Toren über Brücken zum Platz in
  // der Mitte mit dem Weltentor, die Stände stehen auf dem Ring zwischen Mauer und Krater.
  6: {
    form: 'Ring',
    liquid: 'LAVA',
    grid: [
      '""""""""""#oooo##""""""""""',
      '"T""""""###,__,,###""""""T"',
      '""""""###,,____,,,###""""""',
      '"""""##,__________,,##"""""',
      '""""##,__,,,__,,,__,,##""""',
      '"""##__,,,~~HH~~,,,__,##"""',
      '""##,_,,~~~~HH~~~~,,_,,##""',
      '""#,_,,~~~~~HH~~~~~,,_,,#""',
      '"##__,~~~~~~HH~~~~~~,__,##"',
      '"#,_,,~~~~~....~~~~~,,_,,#"',
      '##,_,~~~~~......~~~~~,_,,##',
      'o,__,~~~~........~~~~,__,,o',
      'o____====........====_____o',
      'o____====........====_____o',
      'o,__,~~~~........~~~~,__,,o',
      '#,,_,~~~~~......~~~~~,_,,,#',
      '##,_,,~~~~~....~~~~~,,_,,##',
      '"#,__,~~~~~~HH~~~~~~,__,,#"',
      '"##,_,,~~~~~HH~~~~~,,_,,##"',
      '""#,,_,,~~~~HH~~~~,,_,,,#""',
      '""##,__,,,~~HH~~,,,__,,##""',
      '"""##,,__,,,__,,,__,,,##"""',
      '""""##,,__________,,,##""""',
      '"""""##,,,,____,,,,,##"""""',
      '""""""###,,,__,,,,###""""""',
      '"T""""""###,__,,###"""""T""',
      '""""""""""#oooo##""""""""""'
    ],
    weltentor: [0.5, -1.8], spawn: [-0.2, 1.8],
    places: {
      auktion: [-3.6, -9.2, 'n'], aeltester: [5.4, -8.6, null, -0.3], ruestung: [8.4, -5.6, 'e'], alchemist: [9.6, -2.9, null, -0.55],
      lager: [9.6, 2.6, 'e'], bogenmacher: [8.6, 6.0, null, -0.5], jaegerin: [5.8, 8.6, null, -0.2], post: [2.6, 11.0, 'n'],
      stallmeister: [-3.0, 10.2, 'n'], lehrmeister: [-6.4, 8.4, null, 0.3], schmied: [-8.2, 5.8, 'w'], haendler: [-9.6, 2.6, null, 0.5],
      arena: [-9.4, -2.8, null, 0.5], waffen: [-7.8, -6.0, 'w'], pvp: [-5.6, -8.6, null, 0.3], teleport: [2.4, 1.4, null, -0.4]
    },
    lights: [['lantern', -2.6, -10.8], ['lantern', 1.6, -10.8], ['lantern', -2.6, 11.4], ['lantern', 1.6, 11.4],
      ['brazier', -3.0, -3.0], ['brazier', 2.6, 2.6]],
    deco: [[3.6, -11.6, 'F'], [-4.6, -11.4, 'F'], [10.8, -6.8, 'X'], [-10.8, -6.2, 'G'], [10.8, 6.8, 'G'], [-10.6, 6.6, 'X'],
      [6.8, 10.6, 'K'], [-6.6, 10.4, 'C']]
  },
  // Frostgipfel · Frostlager: Terrassen am Hang in L-Form. Die Bergflanke oben rechts bleibt Wildnis. Oben links der
  // Gipfelplatz mit dem Weltentor, darunter die mittlere und die untere Terrasse; Treppen in den Stützmauern
  // verbinden die Ebenen, Schneewehen liegen innen an den Mauern.
  7: {
    form: 'Terrassen',
    grid: [
      '###########oooo##""""""""""',
      '#,^^^,^^^,^,__,^#"""""T""T"',
      '#^,,,........_,^#"""T""""""',
      '#^,,..........,,#""""""""""',
      '#^,,..........,^#""""""T""T',
      '#,,,,........_,^#""""""""""',
      '#^,,,,,,,,,,__,^#""T"""""""',
      '#^,,__,,,,,,__,,#"""""""T""',
      '#SSS%%SSSSSS%%SS#""""""""""',
      '#,,,__,,,,,,,,,^#""""""""""',
      '#^,,,,,,,,,,...,^##########',
      'o,,,,,,,,.........^,^^^,^^o',
      'o_______..........._______o',
      'o_______..........._______o',
      'o,,,,,,,,.........,,,,,,,,o',
      '#^,,,,,,,,,,...,,,,,,,,,,^#',
      '#^,,,,,,,,,,,,,,,,,,,,,,,^#',
      '#,,,,,,,,,,,,,,,,,,,,__,,,#',
      '#SSSSSSSSSSS%%SSSSSSS%%SSS#',
      '#^,,,,,,,,,,__,,,,,,,__,,^#',
      '#^,,,,,,,,.......,,,,,,,,^#',
      '#,,,,,,,...........,,,,,,,#',
      '#^,,,,,.............,,,,,^#',
      '#^,,,,,,...........,,,,,,^#',
      '#^,,,,,,,,.......,,,,,,,,^#',
      '#,^^^,^^^,^,__,^^,^^^,^^^,#',
      '###########oooo############'
    ],
    weltentor: [-4.6, -9.4], spawn: [-4.6, -7.0],
    places: {
      teleport: [-8.6, -8.4, null, 0.4], auktion: [-9.6, -10.6, 'n'], post: [1.6, -10.6, 'n'], aeltester: [-11.0, -6.6, null, 0.5],
      waffen: [-6.8, -3.4, 'w'], schmied: [-10.6, 3.0, 'w'], ruestung: [11.2, 3.8, 'e'], alchemist: [6.6, -1.9, null, -0.4],
      lehrmeister: [-6.4, 2.8, null, 0.4], haendler: [-3.8, -3.4, null, 0.3], arena: [3.2, 2.6, null, -0.3], pvp: [6.4, 3.2, null, -0.4],
      lager: [11.2, 8.0, 'e'], stallmeister: [-10.6, 8.2, 'w'], jaegerin: [-5.4, 11.0, null, 0.3], bogenmacher: [5.4, 11.0, null, -0.3]
    },
    lights: [['lantern', -2.2, -4.0], ['lantern', 1.4, -4.0], ['lantern', -2.2, 6.4], ['lantern', 1.4, 6.4],
      ['brazier', -7.0, -11.4], ['brazier', -1.8, -8.4], ['well', -3.6, 9.0]],
    deco: [[-6.4, -11.6, 'F'], [1.0, -7.0, 'X'], [-11.6, -1.6, 'G'], [8.8, -2.4, 'X'], [11.6, 3.8, 'K'], [-11.6, 6.4, 'H'],
      [-1.6, 3.6, 'B'], [9.6, 10.6, 'G'], [-9.4, 11.6, 'P'], [2.4, 7.2, 'C']]
  },

  // Totenmoor · Moorwacht: Pfahldorf aus neun kleinen Inseln im Moor, verbunden mit Stegen. Auf den vier
  // Eckinseln stehen schiefe Hütten auf Pfählen, auf der mittleren Insel das Weltentor.
  8: {
    form: 'Pfahldorf',
    liquid: 'BOG',
    grid: [
      '""""~~~~~,,,,,,,,~~~~~~""""',
      '"""~~~~~,,,,,,,,,,~~~~~~"""',
      '""~~~~~~,,,,,,,,,,~~~~~~~""',
      '"~~hhh,==,,,,,,,,===,hhh,~"',
      '~~,hhh,,~~~~,,~~~~~~,hhh,~~',
      '~~,,,,,,~~~~HH~~~~~~,,,,,~~',
      '~~~,,,,~~~~~HH~~~~~~,,,,~~~',
      '~~~H,,~~~~~~HH~~~~~~~~~H~~~',
      '~,,H~~~~~~~~HH~~~~~~~~~H,,~',
      ',,,,~~~~~~,,,,,,,~~~~~~,,,,',
      ',,,,~~~~~,,,..,,,,~~~~~,,,,',
      ',,,,~~~~~,,....,,,~~~~~,,,,',
      ',,,,,===,,......,,,===,,,,,',
      ',,,,,===,,......,,,===,,,,,',
      ',,,,~~~~~,,....,,,~~~~~,,,,',
      ',,,,~~~~~,,,..,,,,~~~~~,,,,',
      ',,,,~~~~~~,,,,,,,~~~~~~,,,,',
      '~,,H~~~~~~~~HH~~~~~~~~~H,,~',
      '~~~H~~~~~~~~HH~~~~~~~~~H~~~',
      '~~~H~~~~~~~~HH~~~~~~~,,H~~~',
      '~~~,,,,~~~~~HH~~~~~~,,,,~~~',
      '~~,,,,,~~~~~HH~~~~~,,hhh~~~',
      '~~,hhh,===~~,,~~===,,hhh~~~',
      '"~,hhh,~~,,,,,,,,~~~,,,,~~"',
      '""~~~~~~,,,,,,,,,,~~~,,~~""',
      '"""~~~~~,,,,,,,,,,~~~~~~"""',
      '""""~~~~~,,,,,,,,~~~~~~""""'
    ],
    weltentor: [0.5, -2.4], spawn: [0.0, 1.6],
    places: {
      haendler: [-3.2, -2.2, null, 0.4], teleport: [3.6, -2.0, null, -0.4], arena: [-3.4, 1.8, null, 0.3], pvp: [3.4, 1.6, null, -0.3],
      auktion: [-3.0, -11.0, 'n'], post: [2.6, -11.0, 'n'], stallmeister: [-2.6, 11.8, 'n'], lager: [2.8, 11.8, 'n'],
      waffen: [-11.6, -2.6, 'w'], schmied: [-11.6, 2.4, 'w'], ruestung: [11.8, -2.6, 'e'], jaegerin: [11.6, 2.4, null, -0.5],
      aeltester: [-8.4, -7.6, null, 0.3], alchemist: [9.4, -7.4, null, -0.4], lehrmeister: [-8.6, 7.6, null, 0.4], bogenmacher: [8.6, 7.4, null, -0.4]
    },
    // schiefe Hütten auf Pfählen (lean: Neigung, stilts: Pfähle)
    houses: [[-10, -10, 3, 2, '#4a5a3a', { roof: 'sattel', wall: 'holz', lean: 0.07, stilts: true }],
      [8, -10, 3, 2, '#5a4a3a', { roof: 'walm', wall: 'holz', lean: -0.06, stilts: true, chimney: 0.2 }],
      [-10, 9, 3, 2, '#5a4a3a', { roof: 'walm', wall: 'holz', lean: -0.08, stilts: true }],
      [8, 8, 3, 2, '#4a5a3a', { roof: 'sattel', wall: 'holz', lean: 0.06, stilts: true }]],
    lights: [['lantern', -2.6, -3.6], ['lantern', 1.6, -3.6], ['lantern', -2.6, 3.4], ['lantern', 1.6, 3.4],
      ['brazier', -4.0, -12.4], ['brazier', 3.4, 12.6]],
    deco: [[-12.4, -4.2, 'X'], [12.4, 4.0, 'G'], [-1.8, -12.2, 'K'], [1.0, 12.6, 'C'], [-7.0, -9.6, 'K'], [10.6, 7.6, 'X']]
  },

  // Feuerberg · Glutlager: Inselring im Lavasee. Fünf Inseln, nur über Teleportsteine verbunden: außen ein Kreisel
  // (Nord → Ost → Süd → West → Nord), dazu je ein Stein von der Nord- und der Südinsel zur Mitte mit dem Weltentor.
  // Die vier äußeren Inseln haben zur Wildnis hin eine Basaltmauer mit einem Tor, an dem der Weg ankommt.
  9: {
    form: 'Inselring',
    liquid: 'LAVA',
    grid: [
      '""""""#####oooo#####"""""""',
      '"""""~,,,,,,,,,,,,,,~~"""""',
      '""""~~,,,,,,,,,,,,,,~~~""""',
      '"""~~~~,,,,,,,,,,,,~~~~~"""',
      '""~~~~~~~,,,,,,,,~~~~~~~~""',
      '"~~~~~~~~~~~~~~~~~~~~~~~~~"',
      '#,,~~~~~~~~~~~~~~~~~~~~~,,#',
      '#,,,~~~~~~~~~~~~~~~~~~~,,,#',
      '#,,,~~~~~~~,,,,,~~~~~~~,,,#',
      '#,,,,~~~~,,,..,,,,~~~~,,,,#',
      '#,,,,~~~~,,....,,,~~~~,,,,#',
      'o,,,,~~~,,......,,,~~~,,,,o',
      'o,,,,~~~,,......,,,~~~,,,,o',
      'o,,,,~~~,,......,,,~~~,,,,o',
      'o,,,,~~~,,,....,,,,~~~,,,,o',
      '#,,,,~~~~,,,..,,,,~~~~,,,,#',
      '#,,,,~~~~,,,,,,,,,~~~~,,,,#',
      '#,,,~~~~~~~,,,,,~~~~~~~,,,#',
      '#,,,~~~~~~~~~~~~~~~~~~~,,,#',
      '#,,~~~~~~~~~~~~~~~~~~~~~,,#',
      '"~~~~~~~~~~~~~~~~~~~~~~~~~"',
      '"~~~~~~~~~~~~~~~~~~~~~~~~~"',
      '""~~~~~~~,,,,,,,,~~~~~~~~""',
      '"""~~~~,,,,,,,,,,,,~~~~~"""',
      '""""~~,,,,,,,,,,,,,,~~~""""',
      '"""""~,,,,,,,,,,,,,,~~"""""',
      '""""""#####oooo#####"""""""'
    ],
    weltentor: [0.5, -2.0], spawn: [0.4, 1.6],
    stones: [[0, -5, 0, -9], [0, 4, 0, 9], [5, -11, 11, -6], [11, 5, 5, 11], [-6, 11, -12, 5], [-12, -6, -6, -11]],
    places: {
      teleport: [-3.2, 0.2, null, 0.4], aeltester: [3.4, 0.0, null, -0.4], arena: [-3.0, -2.6, null, 0.4], pvp: [3.6, -2.4, null, -0.4],
      lehrmeister: [-3.4, 2.6, null, 0.3],
      waffen: [-3.0, -11.2, 'w'], post: [3.0, -11.2, 'e'], haendler: [-1.6, -9.6, null, 0.2],
      lager: [-3.0, 11.0, 'n'], alchemist: [3.0, 11.4, null, -0.3],
      schmied: [-10.6, -2.8, 'w'], auktion: [-10.6, 2.6, 'w'], bogenmacher: [-9.8, -0.4, null, 0.6],
      ruestung: [11.4, -2.8, 'e'], stallmeister: [11.0, 2.4, 'e'], jaegerin: [9.8, -0.4, null, -0.6]
    },
    lights: [['brazier', 3.0, -9.6], ['brazier', 2.4, 9.6], ['lantern', -1.8, 3.2], ['lantern', 2.8, 3.2]],
    deco: [[-5.0, -12.0, 'X'], [5.6, 12.2, 'X'], [-11.6, -4.6, 'G'], [11.6, 4.4, 'G'], [-4.6, -1.0, 'K'], [4.4, 1.6, 'C']]
  },

  // Schlangental · Oase Sahra: Oasenstadt um einen See, die Häuser am Ufer, das Weltentor auf der Insel in der
  // Mitte, zwei Holzbrücken von Norden und Süden. Die Mauer ist rund (Lehmmauer einer Wüstenstadt).
  2: {
    form: 'Oase mit Insel',
    liquid: 'WATER',
    grid: [
      '"""""""""""""#####oooo######"""""""""""""',
      '"""""""""#####,,,,,__,,,,,,#####"""""""""',
      '"""""""###,,,,,,,,,__,,,,,,,,,,###"""""""',
      '"""T"###,,,,,,,,,,,__,,,,,,,,,,,,###"T"""',
      '""""##,,,,,,,,,,,,,__,,,,,,,,,,,,,,##""""',
      '""T##,,,,,,,,,,,,,,__,,,,,,,,,,,,,,,##"""',
      '"""#,,hhhhh,,,,,,,,__,,,,,,,,hhhhh,,,#"""',
      '""##,,hhhhh,,,,,,,,__,,,,,,,,hhhhh,,,##""',
      '""#,,,hhhhh,,,,,,,,__,,,,,,,,hhhhh,,,,#""',
      '"##,,,,,,,,,,,,,,,,__,,,,,,,,,,,,,,,,,##"',
      '"#,,,,,,,,,,,,,__________,,,,,,,,,,,,,,#"',
      '"#,,,,,,,,,,,____~~HH~~____,,,,,,,,,,,,#"',
      '"#,,,,,,,,,,__~~~~~HH~~~~~__,,,,,,,,,,,#"',
      '##,,,,,,,,,__~~~~~~HH~~~~~~__,,,,,,,,,,##',
      '#,,,,,,,,,__~~~~~~~HH~~~~~~~__,,,,,,,,,,#',
      '#,,,,,,,,__~~~~~~~~HH~~~~~~~~__,,,,,,,,,#',
      '#,,,,,,,,_~~~~~~~......~~~~~~~_,,,,,,,,,#',
      '#,,,,,,,,_~~~~~~........~~~~~~_,,,,,,,,,#',
      'o,,,,,,,__~~~~~..........~~~~~__,,,,,,,,o',
      'o_________~~~~~..........~~~~~__________o',
      'o_________~~~~~..........~~~~~__________o',
      'o,,,,,,,__~~~~~..........~~~~~__,,,,,,,,o',
      '#,,,,,,,,_~~~~~~........~~~~~~_,,,,,,,,,#',
      '#,,,,,,,,_~~~~~~~......~~~~~~~_,,,,,,,,,#',
      '#,,,,,,,,__~~~~~~~~HH~~~~~~~~__,,,,,,,,,#',
      '#,,,hhhhhhh_~~~~~~~HH~~~~~~~__,,,,,,,,,,#',
      '#,,,hhhhhhh__~~~~~~HH~~~~~~__,,,,,,,,,,,#',
      '##,,hhhhhhh,__~~~~~HH~~~~~__,,,,,,,,,,,##',
      '"#,,hhhhhhh,,____~~HH~~____,,,,,,,,,,,,#"',
      '"#,,hhhhhhh,,,,__________,,,,,,,,,,,,,,#"',
      '"#,,hhhhhhh,,,,,,,,__,,,,,,,,,,,,,,,,,,#"',
      '"##,,,,,,,,,,,,,,,,__,,,,,,,,,,,,,,,,,##"',
      '""#,,,,__,,,,,,,,,,__,,,,,,,,,,,,,,,,,#""',
      '""##,,,__,,,,,,,,,,__,,,,,,,,,,,,,,,,##""',
      '"""#,,,,,,,,,,,,,,,__,,,,,,,,,,,,,,,,#"""',
      '"""##,,,,,,,,,,,,,,__,,,,,,,,,,,,,,,##"""',
      '""""##,,,,,,,,,,,,,__,,,,,,,,,,,,,,##""""',
      '"""T"###,,,,,,,,,,,__,,,,,,,,,,,,###"T"""',
      '"""""""###,,,,,,,,,__,,,,,,,,,,###"T"""""',
      '"""""""""#####,,,,,__,,,,,,#####"""""""""',
      '"""""""""""""#####oooo######"""""""""""""'
    ],
    weltentor: [0.6, -1.6], spawn: [0.2, 1.6],
    places: {
      teleport: [-3.6, 0.6, null, 0.4], arena: [3.8, 0.8, null, -0.4],
      waffen: [-16.2, -6.6, 'w'], schmied: [-16.4, 2.8, 'w'], stallmeister: [-14.6, 14.6, 'w'],
      ruestung: [16.6, -6.6, 'e'], lager: [16.6, 3.0, 'e'], post: [15.4, 9.6, 'e'], auktion: [13.0, 14.6, 'e'],
      aeltester: [-6.4, -13.2, null, 0.3], alchemist: [6.2, -13.4, null, -0.3], haendler: [6.6, 13.0, null, -0.3],
      jaegerin: [12.4, 5.0, null, -0.4], lehrmeister: [-6.6, 13.4, null, 0.3], bogenmacher: [-12.4, -8.0, null, 0.4], pvp: [11.8, -8.2, null, -0.4]
    },
    houses: [[-14, -14, 5, 3, '#b0763a', 0], [9, -14, 5, 3, '#8a4a2a', 1]],
    enter: [-16, 5],
    lights: [['lantern', -2.2, -10.8], ['lantern', 1.4, -10.8], ['lantern', -2.2, 10.6], ['lantern', 1.4, 10.6],
      ['lantern', -17.0, -2.6], ['lantern', 16.0, -2.6], ['lantern', -17.0, 1.8], ['lantern', 16.0, 1.8],
      ['brazier', -3.6, -2.6], ['brazier', 3.6, -2.6], ['well', -8.6, -10.4]],
    deco: [[-11.4, -9.2, 'P'], [10.6, -9.2, 'P'], [-12.4, 3.6, 'P'], [12.6, 9.6, 'P'], [-4.2, -15.2, 'G'], [4.6, -15.2, 'X'],
      [-17.4, 9.6, 'G'], [-9.4, 15.6, 'X'], [9.6, 16.0, 'G'], [-10.4, 11.8, 'K'], [8.0, -11.6, 'B'], [-8.6, -12.6, 'C'],
      [14.0, -3.6, 'P'], [-15.6, -3.8, 'P'], [3.4, 17.6, 'F'], [-4.4, 17.6, 'F']]
  },

  // Donnerklamm · Klammfeste: zwei Hälften links und rechts einer Schlucht, die von oben rechts nach unten links durch
  // die Feste läuft. In der Mitte die große Brücke, oben ein Teleportstein-Paar über die Schlucht.
  3: {
    form: 'zweigeteilt',
    liquid: 'WATER',
    grid: [
      '##################oooo###################',
      '#,,,,,,,,,,,,,,,,,,__,,,,,,,,,,,,,,,~~~~#',
      '#,,,,,,,,,,,,,,,,,,__,,,,,,,,,,,,,,~~~~~#',
      '#,,,,,,,,,,,,,,,,,,__,,,,,,,,,,,,,~~~~~~#',
      '#,,,,hhhhh,,,,,,,,,__,,,,,,,,,,,,~~~~~~~#',
      '#,,,,hhhhh,,,,,,,,,__,,,,,,,,,,,~~~~~~~,#',
      '#,,,,hhhhh,,,,,,,,,__,,,,,,,,,,~~~~~~~,,#',
      '#,,,,,,,,,,,,,,,,,,__,,,,,,,,,~~~~~~~,,,#',
      '#,,,,,,,,,,,,,,,,,,__,,,,,,,~~~~~~~~,,,,#',
      '#,,,,,,,,,,,,,,,,,,__,,,,,,~~~~~~~,,,,,,#',
      '#,,,,,,,,,,,,.,,,,,__,,,,,~~~~~~~,,,,,,,#',
      '#,,,,,,,,,.......,,,,,,,,~~~~~~~,,,,,,,,#',
      '#,,,,,,,,.........,,,,,~~~~~~~~,,,,,,,,,#',
      '#,,,,,,,...........,,,,~~~~~~,,,,,,,,,,,#',
      '#,,,,,,,...........,,,~~~~~~,,,,,,,,,,,,#',
      '#,,,,,,,...........,,,~~~~~,,,,,,,,,,,,,#',
      '#,,,,,,,,.........,,,,~~~~,,,,,,,,,,,,,,#',
      '#,,,,,,,,,.......,,,,~~~~~,,,,,,,,,,,,,,#',
      'o,,,,,,,,,,,,.,,,,,,,~~~~~,,,,,,,,,,,,,,o',
      'o____________________=====______________o',
      'o____________________=====______________o',
      'o,,,,,,,,,,,,,,,,____=====____,,,,,,,,,,o',
      '#,,,,,,,,,,,,,,,,,,,,~~~~~,,,.,,,,,,,,,,#',
      '#,,,,,,,,,,,,,,,,,,,~~~~~,.......,,,,,,,#',
      '#,,hhhhhhh,,,,,,,,,~~~~~~.........,,,,,,#',
      '#,,hhhhhhh,,,,,,,,~~~~~~...........,,,,,#',
      '#,,hhhhhhh,,,,,,,~~~~~~,...........,,,,,#',
      '#,,hhhhhhh,,,,,,~~~~~~,,...........,,,,,#',
      '#,,hhhhhhh,,,,~~~~~~~,,,,.........,,,,,,#',
      '#,,hhhhhhh,,~~~~~~~~~,,,,,.......,,,,,,,#',
      '#,,,,,,,,,,~~~~~~~~,,,,,,,,,,.,,,,,,,,,,#',
      '#,,,,__,,~~~~~~~~~,,,,,,,,,,,,,,,,,,,,,,#',
      '#,,,,__~~~~~~~~~,,,__,,,,,,,,,hhhhh,,,,,#',
      '#,,,,,~~~~~~~~,,,,,__,,,,,,,,,hhhhh,,,,,#',
      '#,,,~~~~~~~~~,,,,,,__,,,,,,,,,hhhhh,,,,,#',
      '#,,~~~~~~~~,,,,,,,,__,,,,,,,,,,,,,,,,,,,#',
      '#,~~~~~~~,,,,,,,,,,__,,,,,,,,,,,,,,,,,,,#',
      '#~~~~~~~,,,,,,,,,,,__,,,,,,,,,,,,,,,,,,,#',
      '#~~~~~,,,,,,,,,,,,,__,,,,,,,,,,,,,,,,,,,#',
      '#~~~~,,,,,,,,,,,,,,__,,,,,,,,,,,,,,,,,,,#',
      '##################oooo###################'
    ],
    weltentor: [-6.4, -5.6], spawn: [-6.6, -3.2],
    stones: [[8, -13, 17, -11]],
    places: {
      teleport: [-10.2, -3.6, null, 0.4], aeltester: [-3.2, -9.4, null, 0.2], waffen: [-17.2, -11.6, 'w'], schmied: [-17.2, -2.8, 'w'],
      auktion: [-11.6, -17.4, 'n'], haendler: [-12.6, -9.8, null, 0.4], lehrmeister: [-6.2, 2.8, null, 0.3], arena: [-11.4, 2.6, null, 0.4],
      ruestung: [17.2, -6.6, 'e'], lager: [17.2, 4.6, 'e'], post: [17.2, 12.0, 'e'], stallmeister: [6.6, 17.6, 'n'],
      alchemist: [12.6, -3.4, null, -0.4], jaegerin: [13.4, 9.2, null, -0.3], bogenmacher: [3.6, 13.0, null, 0.3], pvp: [14.6, 2.6, null, -0.4]
    },
    houses: [[-15, -16, 5, 3, '#4a4644', 0], [10, 12, 5, 3, '#5a3a2e', 1]],
    enter: [-17, 4],
    lights: [['lantern', -3.4, -1.6], ['lantern', -3.4, 1.8], ['lantern', 7.6, -1.6], ['lantern', 7.6, 1.8],
      ['lantern', 7.6, -12.4], ['lantern', 16.4, -9.6], ['brazier', -3.0, -4.4], ['brazier', 11.6, 7.2], ['well', -9.8, -7.4]],
    deco: [[-14.4, -18.4, 'F'], [-6.0, -18.6, 'F'], [6.0, -18.6, 'F'], [-18.4, -15.6, 'G'], [-18.2, 13.6, 'X'], [18.4, -15.0, 'X'],
      [18.2, 16.6, 'G'], [-8.6, 12.0, 'K'], [8.6, 10.6, 'C'], [-13.4, -12.6, 'P'], [12.8, -6.6, 'B'], [-2.6, 6.0, 'X']]
  },

  // Kristallabgrund · Lichtwacht: schwebende Kristallplattformen über dem Abgrund. Oben die Zitadelle mit
  // Kristallwänden und den Häusern, Lichtbrücken zur Mitte (Weltentor) und weiter zur Südplattform mit ihren beiden
  // Nebeninseln; die West- und die Ostplattform erreicht man über Teleportsteine.
  10: {
    form: 'Kristallplattformen',
    liquid: 'ABGRUND',
    grid: [
      '"""""""~~KKKKKKKKKooooKKKKKKKKKK~~"""""""',
      '""""""~~~Khhhhhhh,,,,,,,hhhhh,,K~~~""""""',
      '"""""~~~~Khhhhhhh,,,,,,,hhhhh,,K~~~~"""""',
      '""""~~~~~Khhhhhhh,,,,,,,hhhhh,,K~~~~~""""',
      '"""~~~~~~Khhhhhhh.......,,,,,,,K~~~~~~"""',
      '""~~~~~~~Khhhhhhh.......,,,,,,,K~~~~~~~""',
      '"~~~~~~~~Khhhhhhh.......,hhhhh,K~~~~~~~~"',
      '~~~~~~~~~K,,__,,........,hhhhh,K~~~~~~~~~',
      '~~~~~~~~~K,,__,,........,hhhhh,K~~~~~~~~~',
      '~~~~~~~~~K,,__,,........,,,,,,,K~~~~~~~~~',
      '~~~~~~~~~K,,,,,,,,,,,,,,,,,,,,,K~~~~~~~~~',
      '~~~~~~~~~KKKKKKKKKKooKKKKKKKKKKK~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~HH~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~HH~~~~~~~~~~~~~~~~~~~~',
      '~~,,,,~~~~~~~~~~~~~HH~~~~~~~~~~~~~~,,,,~~',
      '~,,,,,,~~~~~~~~~~~,,,,,~~~~~~~~~~~,,,,,,~',
      ',,,,,,,,~~~~~~~~~,,,,,,,~~~~~~~~~,,,,,,,,',
      ',,,,,,,,~~~~~~~~,,....,,,~~~~~~~~,,,,,,,,',
      ',,,,,,,,~~~~~~~,,......,,,~~~~~~~,,,,,,,,',
      ',,,,,,,,~~~~~~~,,......,,,~~~~~~~,,,,,,,,',
      ',,,,,,,,,~~~~~~,,......,,,~~~~~~,,,,,,,,,',
      ',,,,,,,,~~~~~~~,,......,,,~~~~~~~,,,,,,,,',
      ',,,,,,,,~~~~~~~,,,....,,,,~~~~~~~,,,,,,,,',
      ',,,,,,,,~~~~~~~~,,,,,,,,,~~~~~~~~,,,,,,,,',
      ',,,,,,,,~~~~~~~~~,,,,,,,~~~~~~~~~,,,,,,,,',
      '~,,,,,,~~~~~~~~~~~,,,,,~~~~~~~~~~~,,,,,,~',
      '~~,,,,~~~~~~~~~~~~~HH~~~~~~~~~~~~~~,,,,~~',
      '~~~~~~~~~~~~~~~~~~~HH~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~HH~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~HH~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~HH~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~,,,~~~~~~~~~~HH~~~~~~~~~~,,,~~~~~~~',
      '~~~~,,,,,,,~~~~~~~~HH~~~~~~~~,,,,,,,~~~~~',
      '~~~~,,,,,,,~~~~~,,,,,,,,~~~~~,,,,,,,~~~~~',
      '"~~,,,,,,,,,==,,,,,,,,,,,,==,,,,,,,,,~~~"',
      '""~~,,,,,,,==,,,,,,,,,,,,,,==,,,,,,,~~~""',
      '"""~,,,,,,,~~,,,,,,,,,,,,,,~~,,,,,,,~~"""',
      '""""~~,,,~~~~,,,,,,,,,,,,,,~~~~,,,~~~""""',
      '"""""~~~~~~~~,,,,,,,,,,,,,,~~~~~~~~~"""""',
      '""""""~~~~~~~~,,,,,,,,,,,,~~~~~~~~~""""""',
      '"""""""~~~~~~~~~,,,,,,,,~~~~~~~~~~"""""""'
    ],
    weltentor: [0.5, -1.8], spawn: [0.2, 1.8],
    stones: [[-4, -1, -14, -1], [3, -1, 13, -1]],
    places: {
      aeltester: [-1.4, -15.0, null, 0.2], lehrmeister: [2.6, -11.4, null, -0.3], auktion: [-2.6, -17.6, 'n'], post: [9.6, -16.0, 'e'],
      teleport: [-3.4, 1.4, null, 0.4], arena: [3.6, 1.4, null, -0.4],
      waffen: [-17.0, -3.4, 'w'], schmied: [-17.0, 3.0, 'w'], haendler: [-15.6, -5.2, null, 0.4],
      ruestung: [17.4, -3.4, 'e'], lager: [17.4, 3.0, 'e'], alchemist: [15.6, 4.8, null, -0.4],
      stallmeister: [-3.6, 18.0, 'n'], jaegerin: [3.6, 17.4, null, -0.3], bogenmacher: [-13.2, 13.4, null, 0.3], pvp: [12.4, 13.8, null, -0.3]
    },
    houses: [[4, -19, 5, 3, '#4a3a8a', 0], [5, -14, 5, 3, '#2e4a7a', 1]],
    enter: [-10, -19],
    lights: [['lantern', -2.0, -10.4], ['lantern', 1.2, -10.4], ['lantern', -1.6, -4.2], ['lantern', 1.6, -4.2],
      ['lantern', -1.8, 13.6], ['lantern', 1.2, 13.6], ['brazier', -6.0, -11.4], ['brazier', 7.8, -10.6]],
    deco: [[-4.4, -19.4, 'F'], [3.2, -19.4, 'F'], [9.6, -10.6, 'G'], [-9.6, -10.6, 'X'], [-18.6, 4.6, 'G'], [18.6, -4.6, 'X'],
      [-5.6, 15.0, 'K'], [5.4, 15.6, 'C'], [-15.4, 14.6, 'G'], [14.6, 14.8, 'X'], [-3.6, -13.0, 'B']]
  }
};

// seit 14.71 ersetzt durch eigene Städte (daten/kartenformen.js, KF_TOWNS); die Spiegelung bleibt nur als Vorlage stehen.
// seit 14.54: Städte und Lager der Schattenseite (Maps 11–16, docs/fraktionen.md). Sie nutzen die vorhandenen Formen,
// aber gespiegelt (Westen ↔ Osten), mit eigenen Dachfarben und teils anderer Flüssigkeit – so sieht keine aus wie ihr
// Gegenstück auf der Lichtseite, und Wege, Tore und Stände bleiben trotzdem stimmig.
// Spiegeln: Kachel dx → -dx, ein Platz u (Kacheln ab der Mitte der Stadtkachel) → 1 - u, Stand 'w' ↔ 'e', Blick umgekehrt.
function mirrorTownLayout(L, extra) {
  const mx = (u) => +(1 - u).toFixed(2);
  const side = { w: 'e', e: 'w' };
  const places = {};
  for (const [k, [x, y, s, yaw]] of Object.entries(L.places)) {
    places[k] = yaw != null ? [mx(x), y, side[s] || s, -yaw] : [mx(x), y, side[s] || s];
  }
  return {
    ...L,
    grid: L.grid.map((row) => row.split('').reverse().join('')),
    weltentor: [mx(L.weltentor[0]), L.weltentor[1]], spawn: [mx(L.spawn[0]), L.spawn[1]],
    places,
    stones: (L.stones || []).map(([ax, ay, bx, by]) => [-ax, ay, -bx, by]),
    houses: (L.houses || []).map(([dx, dy, w, h, roof, look]) => [-(dx + w - 1), dy, w, h, roof, look]),
    enter: L.enter ? [-(L.enter[0] + 6), L.enter[1]] : undefined,
    lights: (L.lights || []).map(([t, x, y]) => [t, mx(x), y]),
    deco: (L.deco || []).map(([x, y, c]) => [mx(x), y, c]),
    ...extra
  };
}
// Map → [Vorlage, Name der Form, Flüssigkeit (null: wie die Vorlage), Dachfarben (null: wie die Vorlage)]
const SHADOW_TOWNS = {
  11: [2, 'Mondsee mit Insel', 'WATER', ['#2e2a5a', '#3e2a4a']], // Mondfall: Stadt am Mondsee, das Weltentor auf der Insel
  12: [5, 'Achteck aus Kohlholz', null, null], // Glimmwacht: Palisaden-Achteck im Aschewald
  13: [6, 'Ring um den Schlund', 'ABGRUND', null], // Gebeinwacht: Ringstadt um einen dunklen Schlund
  14: [9, 'Glutinseln', 'LAVA', null], // Blutwacht: Inselring im Glutsee, nur über Teleportsteine verbunden
  15: [7, 'Eisterrassen', null, null], // Eisnacht: Terrassen am Nachthang
  16: [3, 'Klippenfeste über dem Moor', 'BOG', ['#2a3a3a', '#3a2a3a']] // Nachtwacht: zwei Hälften über einer Moorschlucht
};
for (const [id, [from, form, liquid, roofs]] of Object.entries(SHADOW_TOWNS)) {
  const L = mirrorTownLayout(TOWN_LAYOUTS[from], { form });
  if (liquid) L.liquid = liquid;
  if (roofs) L.houses = L.houses.map((h, k) => [h[0], h[1], h[2], h[3], roofs[k % roofs.length], h[5]]);
  TOWN_LAYOUTS[id] = L;
}
