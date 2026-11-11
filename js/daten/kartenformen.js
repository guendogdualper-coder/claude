// Kartenformen (seit 14.70, docs/kartenformen.md): welche Karte welche Grundform hat und die neuen Städte dazu.
// Gebaut wird in kartenformen.js (FORM_BUILDERS, mapFormShape aus buildWorldMaps). Kazehana (Map 1) bleibt, wie sie
// ist; seit 14.71 (Phase 2) haben auch die Schattenkarten 11–16 und die gemeinsamen Karten 8, 3, 9, 10 eine eigene Form
// und eine neue Stadt.
//
// Angaben je Karte (alle Lagen in Kacheln ab der linken oberen Ecke der Karte, 360 × 220):
//   form       Name in FORM_BUILDERS (inseln, schlucht, fluss, lichtungen; seit 14.71 krater, schneisen, duenen, kessel,
//              terrassen, fjorde, moor, grate, vulkan, splitter)
//   void       Bodenart dessen, was man nicht betreten kann (WATER Meer/Fluss, WOLKEN Wolkenmeer, KLUFT Schlucht; seit
//              14.71 auch TREIBSAND, BLUTSEE, EISSPALTE, BOG, LAVA, ABGRUND), pond: Bodenart der Teiche (Standard WATER)
//   voidEdge   der Rand der Karte liegt darin (3D: keine Randwand, die Fläche läuft bis zum Horizont)
//   link       wie Inseln ohne Landweg verbunden werden: 'stone' Teleportstein-Paar, 'ford' Furt, 'pfad' Waldpfad
//   gates      Tore der Stadt ohne Weg nach draußen ({ n: false } …), ring: Land rund um die Stadt je Seite (Standard 3)
//   roadsCross Wege dürfen das Gewässer mit Brücken queren (Fluss); sonst enden sie am Ufer
//   islet      'trees': zu kleine Inseln werden Felsnadeln mit Bäumen statt Meer; fill 'trees': Unerreichbares wird Wald
//   clearEdge  keine Bäume direkt an der Absturzkante
//   mobScale   Anteil der Monstergruppen (weniger begehbares Land: nicht zu gedrängt)
//   seit 14.71: townClear  keine Furt, kein Pfad und kein Stein direkt an der Stadt (ihr Rand ist Mauer oder Wasser),
//              rund um jeden Teleportstein keine Bäume; anchors [x, y, r]: feste Inseln bzw. Plattformen für Ziele abseits
//              (Instanz-Ecken), mit Damm bzw. Lichtbrücke angebunden; cliffRocks/rimRocks: Felsen an Kanten (Anteil in %)
const MAP_FORMS = {
  // Dunkelwald · Lichtungswald: undurchdringlicher Nadelwald, darin Lichtungen mit Teichen und Hainen, verbunden durch
  // gewundene Waldpfade. Die Stadt liegt in der größten Lichtung.
  4: {
    form: 'lichtungen', void: 'WATER', fill: 'trees', mobScale: 0.7, fillCode: 2, edgeCode: 2, wallTree: 'PINE', link: 'pfad', fordWidth: 5,
    clearings: [[114, 64, 9], [144, 100, 8], [60, 40, 14], [300, 170, 16], [30, 180, 12], [330, 40, 13]],
    count: 34, rMin: 11, rMax: 25, gap: 5, extra: 12, pathWidth: [6, 9], amp: 7
  },
  // Rostschlucht · Schlucht mit Plateaus: eine tiefe Schlucht quer über die Karte, Seitenschluchten nach Norden und Süden
  // teilen das Land in fünf Hochplateaus. Hängebrücken und natürliche Felsbrücken führen hinüber.
  5: {
    form: 'schlucht', void: 'KLUFT', clearEdge: true, link: 'stone', fordGround: 'SAND', width: [9, 14], amp: 7,
    main: [[2, 128], [60, 118], [120, 132], [175, 112], [230, 124], [290, 108], [358, 120]],
    branches: [[[175, 112], [168, 70], [178, 30], [170, 2]], [[230, 124], [236, 160], [226, 190], [234, 218]], [[60, 118], [52, 160], [64, 218]]],
    spurs: [[[120, 130], [128, 158], [118, 176]], [[292, 110], [312, 86], [332, 80]], [[60, 118], [82, 92], [98, 84]]],
    sinks: [[100, 40, 6], [306, 182, 7], [150, 192, 5], [24, 60, 5]],
    bridges: [[30, 100, 30, 150], [205, 92, 205, 150], [262, 88, 262, 148], [146, 40, 200, 40], [205, 150, 260, 150], [30, 150, 82, 150]],
    arches: [[140, 100, 140, 156, 6], [330, 92, 330, 146, 5], [146, 86, 200, 86, 5], [200, 200, 262, 200, 5], [30, 196, 90, 196, 5]]
  },
  // Ödland · Ascheinseln: ein Archipel aus grauen Ascheinseln im dunklen Meer. Keine Insel hat einen Landweg zur anderen –
  // man reist von Teleportstein zu Teleportstein. Die Stadt ist ein Hafen mit Stegen ins Meer.
  6: {
    form: 'inseln', void: 'WATER', voidEdge: true, mobScale: 0.7, islet: 'trees', wallTree: 'DEADTREE', link: 'stone', minIsland: 120,
    gates: { e: false }, ring: { e: 0 }, islets: 26, bays: 10,
    islands: [[56, 158, 31, 46, 0.16], [64, 50, 41, 29], [150, 100, 29, 37], [158, 186, 37, 24], [236, 56, 44, 34], [246, 150, 37, 32],
      [322, 104, 32, 51], [318, 190, 27, 17], [196, 118, 15, 12], [320, 26, 24, 15]]
  },
  // Schlangental · Schlangenfluss: ein breiter Fluss windet sich wie eine Schlange durch die Wüste und teilt sich im
  // Dschungel in ein Delta mit Lagune. Furten aus Sand und Brücken der Wege führen hinüber, Oasen liegen in der Wüste.
  2: {
    form: 'fluss', void: 'WATER', roadsCross: true, link: 'ford', fordGround: 'SAND', width: [7, 10], amp: 6, minIsland: 60,
    river: [[130, 2], [124, 40], [114, 78], [120, 118], [150, 150], [190, 138], [230, 150], [262, 146]],
    arms: [[[262, 146], [300, 122], [358, 108]], [[262, 146], [310, 160], [358, 172]], [[262, 146], [282, 190], [300, 218]]],
    tributaries: [[[2, 150], [50, 140], [96, 152], [134, 128]]],
    lagoons: [[340, 202, 30, 22]],
    ponds: [[38, 36, 5], [182, 58, 6], [56, 196, 4], [260, 40, 5]],
    fords: [[104, 24, 154, 24, 4], [98, 104, 146, 104, 4], [200, 120, 200, 168, 4], [244, 128, 244, 170, 4], [40, 124, 40, 172, 4],
      [100, 130, 100, 176, 4], [300, 100, 300, 142, 4], [326, 148, 326, 186, 4], [264, 196, 304, 196, 4]]
  },
  // Frostgipfel · Himmelsinseln: verschneite Gipfel ragen aus einem Wolkenmeer. Eisbrücken verbinden manche Inseln,
  // zu den übrigen geht es nur über Teleportsteine; die Stadt Frostlager liegt auf dem höchsten Gipfel.
  7: {
    form: 'inseln', void: 'WOLKEN', voidEdge: true, mobScale: 0.65, clearEdge: true, islet: 'trees', link: 'stone', minIsland: 60,
    gates: { n: false }, islets: 16, bays: 6, bridgeWidth: 3,
    islands: [[292, 64, 38, 42, 0.22], [220, 42, 24, 19], [306, 148, 30, 24], [324, 198, 30, 15], [186, 112, 38, 31], [110, 54, 29, 22],
      [40, 32, 30, 24], [86, 160, 38, 31], [200, 186, 28, 19], [250, 122, 14, 12]],
    links: [[0, 1, 'bruecke'], [0, 2, 'bruecke'], [2, 3, 'bruecke'], [0, 4, 'stein'], [4, 5, 'stein'], [5, 6, 'bruecke'], [4, 7, 'stein'],
      [7, 8, 'bruecke'], [8, 2, 'stein'], [2, 9, 'bruecke']]
  },

  // --- seit 14.71 (Phase 2): die Schattenkarten ---------------------------------------------------------------
  // Mondfall · Kraterseen: Dämmerwiesen voller runder Mondkrater, in den großen ein See mit Insel (Teleportstein), um
  // jeden ein Rand aus Geröll; kleine Krater bleiben trockene Mulden. Die Stadt liegt selbst um einen Kratersee.
  11: {
    form: 'krater', void: 'WATER', link: 'stone', townClear: true, minIsland: 40, mobScale: 0.85, rim: 3, rimRocks: 26,
    craters: [[78, 66, 24], [166, 150, 19], [64, 168, 15], [184, 48, 13], [318, 52, 17], [326, 184, 12], [120, 112, 9]],
    count: 30, rMin: 4, rMax: 15, gap: 7, dry: 7, islandR: 15
  },
  // Aschewald · Brandschneisen: verkohlter, undurchdringlicher Tannenwald; gerade Schneisen laufen strahlenförmig von
  // der Stadt weg, Ringschneisen kreuzen sie, an den Kreuzungen Brandflächen mit Glutfeldern und Aschegruben.
  12: {
    form: 'schneisen', void: 'KLUFT', pond: 'LAVA', fill: 'trees', fillCode: 2, edgeCode: 2, wallTree: 'PINE', link: 'pfad', fordWidth: 6, townClear: true,
    mobScale: 0.7, spokes: 8, spokeStart: 12, width: [10, 13], rings: [50, 100, 156, 214], squash: 0.6, embers: 18, clearing: [8, 13]
  },
  // Knochenwüste · Dünenmeer: lange Dünenkämme quer über die Karte, dazwischen Täler voller Treibsand. Pässe aus
  // festem Grund führen hinüber, auf den Kämmen Oasen. Die Stadt liegt zwischen zwei Dünentälern.
  13: {
    form: 'duenen', void: 'TREIBSAND', link: 'ford', fordGround: 'ASH', fordWidth: 5, townClear: true, minIsland: 60, mobScale: 0.85, wallTree: 'TREE',
    gates: { n: false, s: false }, ring: { n: 0, s: 0 },
    ys: [18, 50, 74, 106, 138, 169, 200], anchor: 95, tilt: -0.1, amp: 10, freq: 0.034, width: [9, 13], passGap: 84, passWidth: 6,
    oases: [[200, 34, 5], [300, 122, 6], [150, 152, 5], [52, 120, 4], [270, 186, 4], [330, 60, 4]]
  },
  // Blutsteppe · Kraterkessel: ein riesiger Kessel; außen die Steppe, dann ein Graben voller Blut mit vier
  // Steinbrücken, das Ringplateau mit einer Stützmauer und Rampen, in der Mitte der Blutsee mit einer Insel.
  14: {
    form: 'kessel', void: 'BLUTSEE', pond: 'BLUTSEE', link: 'stone', townClear: true, minIsland: 40, mobScale: 0.85, rimRocks: 25,
    kessel: [140, 92, 118, 76], trench: [0.9, 0.99], walls: [0.72, 0.5], ramps: 7, rampWidth: 0.16, lake: 0.28, island: 0.09, wob: 0.06,
    pools: [[32, 200, 4], [338, 22, 3], [318, 204, 4], [340, 110, 3], [300, 30, 5], [200, 196, 4], [26, 14, 3], [236, 12, 3]]
  },
  // Nachtfrost · Terrassenhang: Stützmauern ziehen sich in Wellen quer über den Hang, Rampen aus Geröll führen hinauf;
  // Gletscherspalten schneiden quer durch, Schneebrücken führen hinüber.
  15: {
    form: 'terrassen', void: 'EISSPALTE', link: 'ford', fordGround: 'NACHTSCHNEE', fordWidth: 5, townClear: true, minIsland: 60, mobScale: 0.9, rimRocks: 18,
    walls: [40, 76, 114, 188], freq: 0.025, amp: 10, rampGap: 78, rampWidth: 6, spaltWidth: [3, 5],
    spalten: [
      { pts: [[152, 6], [172, 60], [150, 122], [176, 214]], bridges: [0.18, 0.45, 0.72, 0.9] },
      { pts: [[252, 6], [236, 80], [262, 150], [246, 214]], bridges: [0.22, 0.55, 0.85] },
      { pts: [[326, 40], [302, 100], [332, 172]], bridges: [0.5] },
      { pts: [[56, 8], [92, 50], [48, 96]], bridges: [0.35, 0.75] },
      { pts: [[116, 214], [150, 186], [204, 196]], bridges: [0.5] }
    ]
  },
  // Schattenklippen · Fjordküste: im Norden das schwarze Meer, tiefe Fjorde schneiden ins Land, Brücken führen über
  // die Mündungen, an der Kante Klippenfelsen. Einer reicht bis in die Stadt (Hafen); draußen das Schwarzmoor.
  16: {
    form: 'fjorde', void: 'WATER', pond: 'BOG', link: 'stone', townClear: true, minIsland: 60, mobScale: 0.85, cliffRocks: 35, islet: 'trees', wallTree: 'DEADTREE',
    gates: { n: false }, ring: { n: 0 }, coast: 22, coastAmp: 12, pools: 30, moorFrom: 72, skerries: 14,
    fjords: [
      { pts: [[262, 8], [254, 60], [262, 121]], w: [14, 8], amp: 6, bridges: [0.42] },
      { pts: [[150, 8], [138, 70], [160, 118], [146, 156]], w: [16, 5], amp: 7, bridges: [0.3, 0.7] },
      { pts: [[141, 66], [112, 84], [96, 110]], w: [8, 4] },
      { pts: [[60, 8], [78, 62], [56, 116]], w: [13, 5], amp: 7, bridges: [0.55] },
      { pts: [[75, 50], [36, 64]], w: [7, 4] },
      { pts: [[338, 8], [326, 58], [342, 94]], w: [12, 5], bridges: [0.6] },
      { pts: [[206, 8], [198, 56]], w: [10, 4] },
      { pts: [[257, 62], [222, 78], [212, 96]], w: [8, 4] },
      { pts: [[102, 8], [112, 44]], w: [8, 3] }
    ]
  },

  // --- seit 14.71 (Phase 2): die gemeinsamen Karten ab Stufe 50 ----------------------------------------------------
  // Totenmoor · Moorlabyrinth: schwarzes Moor, darin Torfinseln, verbunden durch schmale Knüppeldämme (waagrecht und
  // senkrecht, mit Sackgassen); die versunkenen Inseln draußen erreicht man nur über Teleportsteine.
  8: {
    form: 'moor', void: 'BOG', link: 'stone', townClear: true, minIsland: 30, mobScale: 0.45, wallTree: 'DEADTREE',
    ring: { n: 0, s: 0, w: 0, e: 0 }, grid: [8, 5], r: [10, 15], sunkFrom: 110, sunk: 0.3, loops: 0.12, spurs: 12,
    anchors: [[336, 18, 10], [24, 202, 10], [292, 172, 6]]
  },
  // Donnerklamm · Grat und Klamm: fast alles ist tiefe Klamm, begehbar sind schmale Grate zwischen Felskuppen; außen
  // am Titanenkamm breitere Kämme und größere Kuppen. Hängebrücken spannen sich zwischen nahen Kuppen.
  3: {
    form: 'grate', void: 'KLUFT', link: 'ford', fordGround: 'BASALT', fordWidth: 5, townClear: true, minIsland: 40, mobScale: 0.6, clearEdge: true,
    ring: { n: 0, s: 0 }, town: [26, 11], stubs: [[0, -24], [0, 24], [-26, 0], [26, 0]],
    grid: [7, 4], r: [8, 12], rOuter: [11, 16], outer: 80, w: [6, 8], wOuter: [9, 12], amp: 5, loops: 0.3, ropes: 5
  },
  // Feuerberg · Vulkankegel: oben der Krater mit dem Lavasee, von dort laufen Lavaströme strahlenförmig bis an den Rand
  // und teilen das Land in Keile; Basaltbrücken und erkaltete Furten führen hinüber.
  9: {
    form: 'vulkan', void: 'LAVA', pond: 'LAVA', link: 'ford', fordGround: 'BASALT', fordWidth: 5, townClear: true, minIsland: 60, mobScale: 0.85,
    rimRocks: 34, crater: [182, 62, 17], rim: 6, w0: 4, amp: 8,
    streams: [[-160, 14], [-115, 11], [-64, 12], [-30, 14], [18, 13], [52, 12], [128, 12], [162, 14]],
    cross: [[0.3, 'b'], [0.6, 'f'], [0.86, 'b']], pools: [[60, 122, 4], [300, 172, 4], [110, 200, 3], [250, 38, 3], [36, 40, 3], [330, 120, 3]]
  },
  // Kristallabgrund · Splitterfeld: kantige Kristallplattformen im violetten Abgrund, in Reihen angeordnet und durch
  // Lichtbrücken verbunden; zu den äußeren Splittern im Leerenschlund nur über Teleportsteine. Der Rand liegt im Abgrund.
  10: {
    form: 'splitter', void: 'ABGRUND', voidEdge: true, link: 'stone', townClear: true, minIsland: 40, mobScale: 0.55, clearEdge: true, islet: 'trees', wallTree: 'DEADTREE',
    grid: [7, 4], size: 0.4, outer: 150, loose: 0.4, loops: 0.25, shards: 30,
    anchors: [[24, 18, 10], [336, 202, 10], [181, 75, 8]]
  }
};

// Texte der Karten (Weltentor, Wegweiser) passend zur neuen Form
const MAP_FORM_TEXT = {
  4: 'Undurchdringlicher Nadelwald voller Lichtungen, verbunden durch Waldpfade. Banditen, Spinnen und Bären. Spinnenhöhle und Banditenkeller.',
  5: 'Eine tiefe Schlucht teilt das Land in Hochplateaus, Hängebrücken führen hinüber. Orks und Skorpione. Orkfestung.',
  6: 'Ascheinseln im dunklen Meer, nur über Teleportsteine verbunden. Oger und Dämonen. Totengruft.',
  2: 'Der Schlangenfluss windet sich durch die Wüste bis in das Delta des Nagadschungels. Die Kanalstadt Sahra.',
  7: 'Himmelsinseln über einem Wolkenmeer, verbunden durch Eisbrücken und Teleportsteine. Eiswölfe, Yetis und Frostgeister. Eisgrotte.',
  // seit 14.71 (Phase 2)
  11: 'Die Mondstadt Mondfall, eine Sichel um den Mondsee; darum Dämmerwiesen voller Mondkrater, in den großen Kraterseen Inseln mit Teleportsteinen. Aschehunde, Nebelwölfe und Schattenkeiler.',
  12: 'Verkohlter Wald, nur über lange Brandschneisen zu durchqueren, an den Kreuzungen Glutfelder. Aschenräuber, Spinnen und Kohlenbären. Spinnenhöhle und Banditenkeller.',
  13: 'Ein Meer aus Dünen, dazwischen Täler voller Treibsand, Pässe führen hinüber; auf den Kämmen Oasen. Beinbrecher und Skorpione. Orkfestung.',
  14: 'Ein riesiger Kraterkessel: ein Graben aus Blut mit Steinbrücken, Stufen hinab zum Blutsee und seiner Insel. Blutoger und Blutdämonen. Totengruft.',
  15: 'Ewige Winternacht an einem Terrassenhang mit Stützmauern und Rampen, Gletscherspalten mit Schneebrücken. Mitternachtswölfe, Dunkelyetis und Frostgespenster. Eisgrotte.',
  16: 'Die Klippenfeste Nachtwacht über einem Fjordhafen, darum eine Steilküste mit tiefen Fjorden und Brücken, Vipern und Kobras, außen das Schwarzmoor der Moornagas. Schlangentempel.',
  8: 'Nebliges Moor voller Torfinseln, verbunden durch schmale Knüppeldämme; zu den versunkenen Inseln nur über Teleportsteine. Untote, Hexen und Ghule.',
  3: 'Die Klammfeste auf einem Grat, darum tiefe Klammen mit schmalen Graten und Hängebrücken, Trolle und Minotauren, außen der Kamm der Titanen.',
  9: 'Ein Vulkankegel mit Lavasee im Krater, Lavaströme teilen den schwarzen Basalt in Keile. Golems, Feuerdämonen und Drachen. Drachenhort.',
  10: 'Die Kristallzitadelle Lichtwacht, darum kantige Kristallplattformen über dem Abgrund, verbunden durch Lichtbrücken, mit Golems und Spinnen; außen im Leerenschlund Splitter nur über Teleportsteine, Ritter und Wyrme. Kristallkaverne.'
};
for (const [id, text] of Object.entries(MAP_FORM_TEXT)) {
  const wm = WORLD_MAPS.find((m) => m.id === Number(id));
  if (wm) wm.text = text;
}

// --- Die neuen Städte ---------------------------------------------------------------------------------------------
// Raster aus einer Funktion (dx, dy ab der Mitte → Zeichen wie in daten/stadtformen.js; neu: Y = Baum in der Stadt)
function kfTownGrid(H, fn) {
  const rows = [];
  for (let dy = -H; dy <= H; dy++) {
    let r = '';
    for (let dx = -H; dx <= H; dx++) r += fn(dx, dy);
    rows.push(r);
  }
  return rows;
}
const kfGateNS = (dx) => dx >= -2 && dx <= 1;
const kfGateWE = (dy) => dy >= -2 && dy <= 1;
const kfRoad = (dx, dy) => dx === -1 || dx === 0 || dy === -1 || dy === 0;

// Die neuen Städte überschreiben TOWN_LAYOUTS. Seit 14.71 haben auch die Schattenstädte (11–16) und die Städte der
// gemeinsamen Karten (8, 3, 9, 10) eine eigene Anlage – keine ist mehr eine gespiegelte Lichtstadt (die Spiegelung in
// stadtformen.js läuft noch, ihre Ergebnisse werden hier ersetzt).
const KF_TOWNS = {
  // Dunkelwald · Waldlager „Wurzelhof“: runde Palisade in der großen Lichtung, ein Bach quer durch den Norden mit
  // Holzsteg, ein Hain alter Tannen und zwei Blockhäuser
  4: {
    form: 'Wurzelhof',
    liquid: 'WATER',
    tree: 'PINE',
    grid: kfTownGrid(13, (dx, dy) => {
      const d = Math.hypot(dx, dy);
      if (d > 13.3) return (dx * 7 + dy * 3) % 11 === 0 ? 'T' : '"';
      if (d > 12.2) return (kfGateNS(dx) && Math.abs(dy) > 10) || (kfGateWE(dy) && Math.abs(dx) > 10) ? 'o' : 'P';
      if (dy === -9 || dy === -8) return dx === -1 || dx === 0 ? 'H' : '~';
      if (d < 4.6) return '.';
      if (kfRoad(dx, dy)) return '_';
      if ((dx === -7 || dx === -6) && (dy === 4 || dy === 5)) return 'Y';
      return ',';
    }),
    weltentor: [0.5, -3.0], spawn: [0.5, 1.8],
    places: {
      aeltester: [-4.6, -5.6, null, 0.4], teleport: [3.4, -5.2, null, -0.4], waffen: [-9.4, -3.6, 'w'], ruestung: [10.2, -3.6, 'e'],
      auktion: [-8.0, -5.0, 'n'], post: [8.6, -4.6, 'n'], arena: [-3.2, -3.4, null, 0.3], pvp: [3.6, -2.8, null, -0.3],
      schmied: [-10.2, 2.8, 'w'], lager: [10.4, 2.8, 'e'], haendler: [-4.2, 2.6, null, 0.4], alchemist: [5.2, 2.8, null, -0.4],
      lehrmeister: [-8.6, 7.4, null, 0.3], bogenmacher: [8.8, 7.6, null, -0.3], jaegerin: [3.6, 9.8, null, -0.2], stallmeister: [-4.6, 9.8, 'n']
    },
    houses: [[3, 5, 4, 3, '#5a4a32', { roof: 'sattel', wall: 'holz', chimney: 0.25 }], [4, -7, 4, 2, '#4a5a32', { roof: 'walm', wall: 'holz' }]],
    lights: [['lantern', -2.4, -4.6], ['lantern', 1.6, -4.6], ['lantern', -2.4, 4.4], ['lantern', 1.6, 4.4], ['brazier', -6.0, 0.8], ['brazier', 6.4, 0.6], ['well', -2.8, -1.8]],
    deco: [[-1.8, -12.2, 'F'], [1.0, -12.2, 'F'], [-10.8, -6.2, 'G'], [10.6, -6.4, 'K'], [-11.2, 5.6, 'H'], [7.4, 4.4, 'C'], [-5.8, 7.0, 'P'], [6.6, -1.8, 'B'], [-7.6, 9.6, 'X']]
  },

  // Rostschlucht · Talwacht „Kluftwacht“: Steinfeste mit abgeschrägten Ecken an der Schlucht. Ein Riss im Fels läuft von
  // Südwesten bis in die Unterstadt (Hängebrücke am Südweg), eine Stützmauer mit zwei Treppen trennt die Oberstadt.
  5: {
    form: 'Kluftwacht',
    liquid: 'KLUFT',
    grid: kfTownGrid(13, (dx, dy) => {
      const inside = (x, y) => Math.max(Math.abs(x), Math.abs(y)) <= 11 && Math.abs(x) + Math.abs(y) <= 19;
      if (!inside(dx, dy)) {
        const near = inside(dx + 1, dy) || inside(dx - 1, dy) || inside(dx, dy + 1) || inside(dx, dy - 1);
        if (!near) return (dx * 5 + dy * 11) % 13 === 0 ? 'T' : '"';
        return (kfGateNS(dx) && Math.abs(dy) >= 12) || (kfGateWE(dy) && Math.abs(dx) >= 12) ? 'o' : '#';
      }
      // Riss: Abstand zur Strecke (-11, 10) → (6, 3)
      const t = Math.max(0, Math.min(1, ((dx + 11) * 17 + (dy - 10) * -7) / (17 * 17 + 49)));
      const rd = Math.hypot(dx - (-11 + 17 * t), dy - (10 - 7 * t));
      if (rd < 1.7) return (dx === -1 || dx === 0) ? 'H' : '~';
      if (dy === -5) return dx === -1 || dx === 0 || dx === 7 || dx === 8 ? '%' : 'S';
      if (Math.hypot(dx + 0.5, dy + 0.5) < 3.6) return '.';
      if (kfRoad(dx, dy)) return '_';
      return ',';
    }),
    weltentor: [-3.4, -1.9], spawn: [-3.4, 1.6],
    places: {
      aeltester: [-3.6, -8.6, null, 0.3], auktion: [-4.6, -9.6, 'n'], post: [3.6, -9.6, 'n'], lehrmeister: [-6.8, -6.6, null, 0.4],
      bogenmacher: [6.8, -6.6, null, -0.4], waffen: [-9.6, -2.8, 'w'], ruestung: [10.6, -2.8, 'e'], schmied: [-9.6, 2.6, 'w'],
      lager: [10.6, 2.6, 'e'], haendler: [-5.4, 3.4, null, 0.4], alchemist: [5.6, -3.4, null, -0.4], teleport: [-6.4, -3.2, null, 0.4],
      arena: [7.6, 6.8, null, -0.3], pvp: [3.2, 9.4, null, -0.3], jaegerin: [-4.6, 10.6, null, 0.2], stallmeister: [-6.6, 4.6, 'n']
    },
    houses: [[-9, -10, 4, 3, '#7a3a24', { roof: 'flach', wall: 'lehm' }], [6, -10, 3, 3, '#8a4a2a', { roof: 'flach', wall: 'lehm', chimney: 0.2 }]],
    lights: [['lantern', -2.4, -4.2], ['lantern', 1.6, -4.2], ['brazier', -2.6, 3.0], ['brazier', 2.6, -3.0], ['brazier', -1.6, 8.6], ['lantern', 9.0, -4.2], ['well', 2.8, 2.6]],
    deco: [[-1.6, -12.2, 'F'], [1.0, -12.2, 'F'], [-8.6, -6.4, 'X'], [8.8, 4.8, 'G'], [-8.8, 6.6, 'K'], [9.4, 9.0, 'C'], [5.4, 5.6, 'X'], [-10.6, -0.4, 'G']]
  },

  // Ödland · Aschenlager „Aschenhafen“: Hafenstadt am Ostufer der Stadtinsel. An Land Palisade, Lagerhäuser und Markt,
  // drei Stege führen ins Meer zu Plattformen mit Ständen (Auktion, Händler, Lager)
  6: {
    form: 'Aschenhafen',
    liquid: 'WATER',
    grid: kfTownGrid(13, (dx, dy) => {
      const pier = (dy === -8 || dy === -7 || dy === -1 || dy === 0 || dy === 7 || dy === 8) && dx >= 4 && dx <= 8;
      const head = dx >= 9 && dx <= 12 && ((dy >= -10 && dy <= -6) || (dy >= -3 && dy <= 2) || (dy >= 5 && dy <= 10));
      if (dx >= 4) return pier ? '=' : head ? ',' : '~';
      if (dx === -13) return kfGateWE(dy) ? 'o' : 'P';
      if (Math.abs(dy) === 13) return kfGateNS(dx) ? 'o' : 'P';
      if (dx === 3) return '_';
      if (Math.hypot(dx + 5, dy + 0.5) < 3.4) return '.';
      if (kfRoad(dx, dy)) return '_';
      return ',';
    }),
    weltentor: [-4.6, -3.0], spawn: [-4.6, 1.6],
    places: {
      auktion: [10.6, -7.4, 'n'], jaegerin: [9.6, -9.4, null, -0.3], haendler: [11.2, -2.4, null, -0.4], alchemist: [11.0, 1.6, null, -0.4],
      lager: [10.6, 7.6, 'n'], bogenmacher: [9.6, 9.6, null, -0.3], waffen: [-11.4, -6.4, 'w'], schmied: [-11.4, 4.0, 'w'],
      ruestung: [1.8, -9.4, 'e'], stallmeister: [-6.6, 10.2, 'n'], aeltester: [-7.6, -7.8, null, 0.4], lehrmeister: [-8.6, 6.0, null, 0.3],
      teleport: [-8.4, -2.8, null, 0.4], arena: [1.6, 4.2, null, -0.3], pvp: [1.6, -4.4, null, -0.3], post: [-4.6, -10.2, 'n']
    },
    houses: [[-11, -11, 4, 3, '#4a4644', { roof: 'sattel', wall: 'holz' }], [-11, 7, 4, 3, '#5a3a2e', { roof: 'walm', wall: 'holz', chimney: 0.2 }]],
    lights: [['brazier', 12.2, -9.6], ['brazier', 12.2, 1.8], ['brazier', 12.2, 9.8], ['lantern', 2.6, -6.0], ['lantern', 2.6, 5.8], ['lantern', -2.4, -11.4], ['well', -7.6, 1.6]],
    deco: [[-12.4, -1.8, 'F'], [-6.6, -4.6, 'G'], [2.4, -2.6, 'K'], [2.4, 2.4, 'C'], [-2.6, 8.6, 'H'], [-6.0, 4.6, 'X'], [-11.6, 11.4, 'K'], [2.2, 11.4, 'C']]
  },

  // Frostgipfel · Frostlager „Wolkenhorst“: runde Steinfeste auf dem Gipfel. Ein Spalt im Fels, in dem die Wolken
  // stehen, trennt den Marktplatz im Süden von zwei Felsplattformen im Norden; Eisbrücken führen hinüber.
  7: {
    form: 'Wolkenhorst',
    liquid: 'WOLKEN',
    grid: kfTownGrid(13, (dx, dy) => {
      const d = Math.hypot(dx, dy);
      if (d > 13.3) return '"';
      if (d > 12.2) return (kfGateNS(dx) && dy > 10) || (kfGateWE(dy) && Math.abs(dx) > 10) ? 'o' : '#';
      if (dy === -4 || dy === -3) return dx === -6 || dx === -5 || dx === 5 || dx === 6 ? 'H' : '~';
      if (dy < -4 && (dx === -1 || dx === 0)) return dy === -9 || dy === -8 ? '=' : '~';
      if (dy >= -2 && Math.hypot(dx + 0.5, dy - 3.5) < 4) return '.';
      if (dy >= -2 && kfRoad(dx, dy)) return '_';
      if (d > 10.4 && (dx * 7 + dy * 13 + 99) % 5 === 0) return '^';
      return ',';
    }),
    weltentor: [0.5, 3.0], spawn: [0.5, 6.4],
    places: {
      aeltester: [-5.4, -7.6, null, 0.4], auktion: [-7.6, -6.2, 'n'], post: [-4.4, -8.8, 'n'], lehrmeister: [7.4, -6.6, null, -0.4],
      bogenmacher: [9.4, -5.6, null, -0.4], teleport: [-3.4, 4.4, null, 0.4], arena: [3.8, 4.4, null, -0.4], waffen: [-10.4, 1.8, 'w'],
      ruestung: [10.6, 1.8, 'e'], schmied: [-8.6, 6.4, 'w'], lager: [9.6, 6.4, 'e'], haendler: [-6.4, 1.6, null, 0.4],
      alchemist: [6.4, 1.6, null, -0.4], jaegerin: [5.4, 9.4, null, -0.3], stallmeister: [-5.6, 9.6, 'n'], pvp: [2.6, 11.0, null, -0.3]
    },
    houses: [[2, -10, 4, 3, '#2f4a6a', { roof: 'sattel', wall: 'stein', chimney: 0.3 }], [-10, -8, 3, 2, '#3a4a5a', { roof: 'walm', wall: 'stein' }]],
    lights: [['brazier', -2.2, -1.6], ['brazier', 2.6, -1.6], ['lantern', -6.6, -2.2], ['lantern', 6.6, -2.2], ['lantern', -2.4, 10.4], ['lantern', 1.6, 10.4], ['brazier', 8.4, -9.0], ['well', -3.6, 7.2]],
    deco: [[-1.6, 12.2, 'F'], [-11.6, 3.6, 'G'], [11.4, 3.8, 'X'], [-3.0, -10.6, 'K'], [9.8, -3.0, 'C'], [6.8, 8.6, 'P'], [-8.4, 8.4, 'H'], [3.0, -6.4, 'B']]
  },

  // Schlangental · Oase Sahra „Kanalstadt“: Lehmmauer mit runden Ecken, zwei Kanäle in jeder Richtung teilen die Stadt
  // in neun Viertel, Brücken an den Straßen und in der Mitte jedes Kanalstücks. Im Mittelviertel der Platz mit dem
  // Weltentor, in den Ecken die Häuser, im Südwesten die Stube der Teppichknüpferin.
  2: {
    form: 'Kanalstadt',
    liquid: 'WATER',
    grid: kfTownGrid(20, (dx, dy) => {
      const se = (x, y) => (Math.abs(x) / 19) ** 4 + (Math.abs(y) / 19) ** 4;
      if (se(dx, dy) > 1) {
        const near = se(dx + 1, dy) <= 1 || se(dx - 1, dy) <= 1 || se(dx, dy + 1) <= 1 || se(dx, dy - 1) <= 1;
        if (!near) return (dx * 3 + dy * 7) % 17 === 0 ? 'T' : '"';
        return (kfGateNS(dx) && Math.abs(dy) > 15) || (kfGateWE(dy) && Math.abs(dx) > 15) ? 'o' : '#';
      }
      const cx = Math.abs(dx + 0.5) >= 6.5 && Math.abs(dx + 0.5) <= 8.5; // Kanal senkrecht (Spalten ±7/8)
      const cy = Math.abs(dy + 0.5) >= 6.5 && Math.abs(dy + 0.5) <= 8.5;
      const inner = se(dx, dy) <= 0.78;
      if (inner && cx && cy) return '~';
      if (inner && cy) return dx === -1 || dx === 0 || dx === -14 || dx === -13 || dx === 12 || dx === 13 ? 'H' : '~';
      if (inner && cx) return dy === -1 || dy === 0 || dy === -14 || dy === -13 || dy === 12 || dy === 13 ? '=' : '~';
      if (Math.abs(dx + 0.5) <= 6 && Math.abs(dy + 0.5) <= 6 && Math.hypot(dx + 0.5, dy + 0.5) < 5.5) return '.';
      if (kfRoad(dx, dy)) return '_';
      return ',';
    }),
    weltentor: [0.5, -3.4], spawn: [0.4, 2.8],
    places: {
      aeltester: [-4.4, -12.6, null, 0.3], alchemist: [4.4, -12.6, null, -0.3], auktion: [-4.6, -16.4, 'n'], post: [4.6, -16.4, 'n'],
      waffen: [-16.6, -3.6, 'w'], schmied: [-16.6, 3.2, 'w'], bogenmacher: [-11.6, -4.4, null, 0.4], ruestung: [16.6, -3.6, 'e'],
      lager: [16.6, 3.2, 'e'], jaegerin: [11.6, 4.4, null, -0.4], teleport: [-3.6, 1.6, null, 0.4], arena: [3.8, 1.6, null, -0.4],
      stallmeister: [-4.6, 14.6, 'n'], haendler: [4.4, 11.4, null, -0.3], lehrmeister: [4.6, 16.0, null, -0.3], pvp: [13.6, 12.4, null, -0.3]
    },
    houses: [[-15, -15, 5, 3, '#b0763a', 0], [10, -15, 5, 3, '#8a4a2a', 1], [11, 14, 4, 3, '#c8a060', 0]],
    enter: [-16, 10],
    lights: [['lantern', -2.2, -5.0], ['lantern', 1.4, -5.0], ['lantern', -2.2, 5.6], ['lantern', 1.4, 5.6], ['brazier', -10.4, -10.6], ['brazier', 10.6, -10.6],
      ['brazier', -10.4, 10.6], ['brazier', 10.6, 10.6], ['well', -3.6, -2.6], ['lantern', -14.6, -1.8], ['lantern', 14.6, 1.6]],
    deco: [[-1.8, -18.6, 'F'], [1.0, -18.6, 'F'], [-4.4, -4.4, 'P'], [4.2, -4.6, 'P'], [-4.4, 4.2, 'P'], [4.4, 4.4, 'P'], [-12.6, -12.6, 'G'],
      [12.4, -12.4, 'X'], [-12.4, 12.4, 'K'], [14.4, 9.6, 'C'], [-15.0, -6.0, 'W'], [15.0, 6.0, 'G'], [-4.4, 10.6, 'B'], [11.6, -4.4, 'R']]
  },
  // --- seit 14.71 (Phase 2): neue Städte der Schattenseite (vorher gespiegelte Lichtstädte) -------------------------
  // Mondfall „Mondsichel“: die Stadt liegt wie eine Mondsichel um den Mondsee im Osten. Im Westen der Platz mit dem
  // Weltentor, eine Uferpromenade rund um den See, ein Steg über das Wasser zum Osttor; Häuser in den beiden Spitzen.
  11: {
    form: 'Mondsichel',
    liquid: 'WATER',
    grid: kfTownGrid(20, (dx, dy) => {
      const R = Math.hypot(dx, dy);
      if (R > 20.3) return (dx * 5 + dy * 3) % 13 === 0 ? 'T' : '"';
      if (R > 19.2) return (kfGateNS(dx) && Math.abs(dy) > 17) || (kfGateWE(dy) && Math.abs(dx) > 17) ? 'o' : '#';
      const ld = Math.hypot(dx - 10, dy);
      if (ld < 9.3 || (dx >= 16 && Math.abs(dy) <= 9)) return dy === -1 || dy === 0 ? '=' : '~';
      if (ld < 10.6) return dx < 16 ? '_' : '~';
      if (Math.hypot(dx + 9, dy + 0.5) < 4.3) return '.';
      if ((dy === -1 || dy === 0) && dx < 0) return '_';
      if (dx === -1 || dx === 0) return '_';
      return ',';
    }),
    weltentor: [-8.5, -2.0], spawn: [-8.5, 2.2],
    places: {
      aeltester: [-4.4, -4.8, null, 0.3], teleport: [-13.4, -3.6, null, 0.4], arena: [-4.4, 4.0, null, 0.3], pvp: [-13.4, 4.0, null, 0.4],
      waffen: [-16.0, -6.6, 'w'], schmied: [-16.6, 6.6, 'w'], auktion: [-6.6, -14.4, 'n'], post: [2.0, -17.0, 'n'],
      lehrmeister: [-11.4, -11.6, null, 0.3], haendler: [3.6, -11.8, null, -0.3], alchemist: [12.6, -12.4, null, -0.4], ruestung: [15.8, -9.4, null, -0.6],
      lager: [15.8, 9.6, null, -0.6], jaegerin: [3.6, 12.8, null, -0.2], stallmeister: [-3.6, 15.6, 'n'], bogenmacher: [12.6, 12.6, null, -0.3]
    },
    houses: [[5, -16, 5, 3, '#2e2a5a', 0], [6, 14, 5, 3, '#3e2a4a', 1]],
    enter: [-14, 5],
    lights: [['lantern', 0.6, -7.4], ['lantern', 0.6, 7.4], ['lantern', 9.6, -11.0], ['lantern', 9.6, 11.0], ['lantern', -18.0, -2.6], ['lantern', -18.0, 1.6],
      ['brazier', -13.0, 0.4], ['brazier', -4.6, 0.4], ['well', -6.4, -8.4]],
    deco: [[-2.8, -18.6, 'F'], [1.8, -18.6, 'F'], [-15.6, -9.6, 'G'], [-9.4, -16.0, 'K'], [8.6, -8.8, 'C'], [13.6, 5.0, 'X'], [-2.6, 9.6, 'P'],
      [-7.0, 12.6, 'B'], [-2.6, -9.6, 'P'], [14.0, -5.0, 'G'], [-17.4, 2.8, 'W']]
  },

  // Aschewald · Glimmwacht „Palisadenstern“: ein achtzackiger Stern aus Kohlholz-Palisaden an der Kreuzung der
  // Brandschneisen; die vier Tore liegen in den Zacken der Achsen, in den schrägen Zacken die Stände und verkohlte
  // Tannen, in der Mitte der Platz mit dem Weltentor
  12: {
    form: 'Palisadenstern',
    liquid: 'LAVA',
    tree: 'PINE',
    grid: kfTownGrid(13, (dx, dy) => {
      const rr = (x, y) => 9.4 + 3.6 * Math.abs(Math.cos(4 * Math.atan2(y, x))) ** 1.6;
      const inside = (x, y) => Math.hypot(x, y) <= rr(x, y) && Math.max(Math.abs(x), Math.abs(y)) <= 12;
      if (!inside(dx, dy)) {
        const near = inside(dx + 1, dy) || inside(dx - 1, dy) || inside(dx, dy + 1) || inside(dx, dy - 1);
        if (!near) return (dx * 7 + dy * 3) % 9 === 0 ? 'T' : '"';
        return (kfGateNS(dx) && Math.abs(dy) >= 12) || (kfGateWE(dy) && Math.abs(dx) >= 12) ? 'o' : 'P';
      }
      if (Math.abs(dx) === 9 && Math.abs(dy) === 9) return 'Y';
      if (Math.hypot(dx + 0.5, dy + 0.5) < 3.6) return '.';
      if (kfRoad(dx, dy)) return '_';
      return ',';
    }),
    weltentor: [0.5, -2.4], spawn: [0.5, 2.2],
    places: {
      aeltester: [-3.6, -4.6, null, 0.3], teleport: [4.4, -4.6, null, -0.3], haendler: [-4.6, 3.4, null, 0.4], alchemist: [5.4, 3.4, null, -0.4],
      waffen: [-8.0, -2.6, 'w'], schmied: [-8.0, 2.6, 'w'], ruestung: [8.6, -2.6, 'e'], lager: [8.6, 2.6, 'e'],
      auktion: [-6.6, -6.6, 'n'], post: [7.4, -6.6, 'n'], lehrmeister: [-6.6, 7.4, null, 0.4], bogenmacher: [7.4, 7.4, null, -0.4],
      arena: [-3.0, -7.6, null, 0.3], pvp: [3.8, -7.6, null, -0.3], jaegerin: [3.8, 7.8, null, -0.2], stallmeister: [-3.4, 8.2, 'n']
    },
    houses: [],
    lights: [['brazier', -4.8, -1.8], ['brazier', 5.6, -1.8], ['brazier', -4.8, 1.8], ['brazier', 5.6, 1.8],
      ['lantern', -1.8, -10.4], ['lantern', 1.6, -10.6], ['lantern', -1.8, 10.6], ['lantern', 1.6, 10.6]],
    deco: [[-1.8, -11.6, 'F'], [1.0, -11.6, 'F'], [-8.4, -8.0, 'X'], [8.6, -8.2, 'K'], [-8.4, 8.6, 'C'], [8.4, 8.6, 'X'], [-6.0, 5.0, 'H'], [6.4, -4.6, 'G']]
  },

  // Knochenwüste · Gebeinwacht „Dünenlinse“: eine linsenförmige Mauer aus Gebeinkalk zwischen zwei Dünentälern voller
  // Treibsand (der Treibsand reicht in die Stadt hinein), Tore nur im Westen und Osten. Im Norden der Oasenteich mit
  // Palmen, im Süden der Platz mit dem Weltentor
  13: {
    form: 'Dünenlinse',
    liquid: 'TREIBSAND',
    tree: 'TREE',
    grid: kfTownGrid(13, (dx, dy) => {
      const inside = (x, y) => Math.abs(x) <= 12 && Math.hypot(x, y - 8) <= 18 && Math.hypot(x, y + 8) <= 18;
      if (!inside(dx, dy)) {
        const near = inside(dx + 1, dy) || inside(dx - 1, dy) || inside(dx, dy + 1) || inside(dx, dy - 1);
        if (near) return kfGateWE(dy) && Math.abs(dx) === 13 ? 'o' : '#';
        return Math.abs(dy) >= 10 ? '~' : '"';
      }
      const pd = Math.hypot(dx + 0.5, dy + 5);
      if (pd < 2.3) return 'w';
      if ((dx === -4 || dx === 3) && (dy === -3 || dy === -7)) return 'Y';
      if (dy === -1 || dy === 0) return '_';
      if (Math.hypot(dx + 0.5, dy - 4) < 3.6) return '.';
      if ((dx === -1 || dx === 0) && dy > 0) return '_';
      return ',';
    }),
    weltentor: [0.5, 3.4], spawn: [0.5, 0.6],
    places: {
      waffen: [-10.4, -2.6, 'w'], schmied: [-10.4, 2.6, 'w'], ruestung: [10.6, -2.6, 'e'], lager: [10.6, 2.6, 'e'],
      haendler: [-6.6, -3.6, null, 0.4], alchemist: [7.4, -3.6, null, -0.4], aeltester: [-3.8, -6.0, null, 0.3], teleport: [4.6, -6.0, null, -0.3],
      auktion: [-6.6, 4.4, 'n'], post: [7.4, 4.4, 'n'], arena: [-3.8, 6.8, null, 0.3], pvp: [4.6, 6.8, null, -0.3],
      lehrmeister: [-10.8, 4.6, null, 0.3], bogenmacher: [8.4, -5.4, null, -0.3], jaegerin: [-7.6, -5.4, null, 0.3], stallmeister: [8.6, 6.4, 'n']
    },
    houses: [[-8, -8, 3, 2, '#b8b0a0', { roof: 'flach', wall: 'lehm' }], [6, -8, 3, 2, '#a8a090', { roof: 'flach', wall: 'lehm', chimney: 0.2 }]],
    lights: [['lantern', -2.4, -2.2], ['lantern', 1.6, -2.2], ['brazier', -5.0, 1.6], ['brazier', 5.6, 1.6], ['brazier', -11.4, -1.8], ['brazier', 12.0, -1.8]],
    deco: [[-12.4, -3.4, 'F'], [12.4, -3.4, 'F'], [-4.6, 8.2, 'X'], [5.4, 8.2, 'K'], [-11.4, 0.8, 'C'], [-6.4, 0.8, 'G'], [7.0, 0.8, 'X']]
  },

  // Blutsteppe · Blutwacht „Kesselrand“: eine Feste in D-Form am Rand des Kraterkessels. Eine Stützmauer mit zwei
  // Treppen teilt sie: unten (Norden, zum Kessel hin) ein Becken voller Blut, Häuser und der Rat, oben der Platz
  // mit dem Weltentor und die Stände
  14: {
    form: 'Kesselrand',
    liquid: 'BLUTSEE',
    grid: kfTownGrid(13, (dx, dy) => {
      const inside = (x, y) => (y <= 0 && Math.abs(x) <= 12 && y >= -12) || (y > 0 && Math.hypot(x, y) <= 12.3);
      if (!inside(dx, dy)) {
        const near = inside(dx + 1, dy) || inside(dx - 1, dy) || inside(dx, dy + 1) || inside(dx, dy - 1);
        if (!near) return (dx * 3 + dy * 11) % 10 === 0 ? 'T' : '"';
        return (kfGateNS(dx) && Math.abs(dy) === 13) || (kfGateWE(dy) && Math.abs(dx) === 13) ? 'o' : '#';
      }
      if (dy === -4) return dx === -1 || dx === 0 || dx === -8 || dx === -7 ? '%' : 'S';
      if (Math.hypot(dx + 8, dy + 9) < 3.1) return '~';
      if (Math.hypot(dx + 0.5, dy - 4) < 3.8) return '.';
      if (kfRoad(dx, dy)) return '_';
      return ',';
    }),
    weltentor: [0.5, 3.0], spawn: [0.5, 6.8],
    places: {
      waffen: [-10.6, 2.8, 'w'], haendler: [-5.0, 1.8, null, 0.4], alchemist: [6.0, 1.8, null, -0.4], ruestung: [10.4, 2.8, 'e'],
      schmied: [-9.0, 6.6, 'w'], arena: [-5.0, 6.4, null, 0.3], pvp: [6.0, 6.4, null, -0.3], lager: [9.0, 6.6, 'e'],
      stallmeister: [-4.6, 10.2, 'n'], jaegerin: [4.6, 10.2, null, -0.2], aeltester: [-3.6, -6.6, null, 0.3], teleport: [4.4, -6.6, null, -0.3],
      auktion: [-3.6, -10.4, 'n'], post: [5.6, -9.0, null, -0.3], lehrmeister: [-10.4, -5.8, null, 0.4], bogenmacher: [10.6, -5.8, null, -0.4]
    },
    houses: [[2, -12, 3, 2, '#3a1a18', { roof: 'flach', wall: 'stein' }], [7, -12, 4, 3, '#4a1a1e', { roof: 'walm', wall: 'stein', chimney: 0.2 }]],
    lights: [['brazier', -2.6, -2.2], ['brazier', 1.8, -2.2], ['lantern', -2.6, -6.0], ['lantern', 1.8, -6.0], ['brazier', -5.0, -10.6], ['lantern', -2.4, 11.6], ['lantern', 1.6, 11.6]],
    deco: [[-1.8, 12.0, 'F'], [-11.4, -11.4, 'X'], [11.4, -8.4, 'K'], [-7.6, -2.4, 'G'], [8.4, -2.4, 'C'], [-8.4, 9.4, 'X'], [8.4, 9.4, 'G'], [-4.6, -8.4, 'K']]
  },

  // Nachtfrost · Eisnacht „Kreuzfeste“: eine Feste in Kreuzform, in der Mitte ein zugefrorener See als Platz (das
  // Weltentor steht auf dem Eis), in den vier Armen die Stände, im Nordarm zwei Häuser
  15: {
    form: 'Kreuzfeste',
    liquid: 'WATER',
    grid: kfTownGrid(13, (dx, dy) => {
      const inside = (x, y) => (Math.abs(x) <= 6 && Math.abs(y) <= 12) || (Math.abs(y) <= 6 && Math.abs(x) <= 12);
      if (!inside(dx, dy)) {
        const near = inside(dx + 1, dy) || inside(dx - 1, dy) || inside(dx, dy + 1) || inside(dx, dy - 1);
        if (!near) return Math.abs(dx) >= 11 && Math.abs(dy) >= 11 && (dx + dy) % 2 === 0 ? 'T' : '"';
        return (kfGateNS(dx) && Math.abs(dy) === 13) || (kfGateWE(dy) && Math.abs(dx) === 13) ? 'o' : '#';
      }
      if (Math.hypot(dx + 0.5, dy + 0.5) < 4.2) return 'i';
      if (kfRoad(dx, dy)) return '_';
      if ((dx * 7 + dy * 13 + 99) % 9 === 0) return '^';
      return ',';
    }),
    weltentor: [0.5, -1.6], spawn: [0.5, 2.6],
    places: {
      aeltester: [-3.6, -7.2, null, 0.3], post: [4.6, -7.2, null, -0.3], waffen: [-10.0, -3.6, 'n'], schmied: [-10.0, 3.6, null, 0.6],
      lehrmeister: [-7.0, -4.2, null, 0.3], ruestung: [11.0, -3.6, 'n'], lager: [11.0, 3.6, null, -0.6], bogenmacher: [8.0, -4.2, null, -0.3],
      haendler: [-3.6, 7.6, null, 0.3], alchemist: [4.6, 7.6, null, -0.3], stallmeister: [-4.0, 10.8, 'n'], jaegerin: [4.6, 10.8, null, -0.2],
      teleport: [-4.6, 4.8, null, 0.4], arena: [5.6, 4.8, null, -0.4], pvp: [5.6, -4.4, null, -0.4], auktion: [-4.6, -4.4, null, 0.4]
    },
    houses: [[-6, -12, 4, 3, '#22305a', { roof: 'sattel', wall: 'stein', chimney: 0.25 }], [3, -12, 4, 3, '#2a3a5a', { roof: 'walm', wall: 'stein' }]],
    lights: [['brazier', -2.6, -5.0], ['brazier', 1.8, -5.0], ['brazier', -2.6, 5.6], ['brazier', 1.8, 5.6],
      ['lantern', -2.6, 12.2], ['lantern', 1.8, 12.2], ['lantern', -11.6, -2.6], ['lantern', 12.6, -2.6]],
    deco: [[-1.8, -12.4, 'F'], [-9.6, -5.8, 'X'], [10.4, -5.8, 'K'], [-10.4, 5.6, 'C'], [10.6, 5.6, 'X'], [-5.6, 11.6, 'H'], [6.0, -8.6, 'G']]
  },

  // Schattenklippen · Nachtwacht „Fjordhafen“: Klippenstadt über dem Fjord, der von Norden durch die Mauer bis in ein
  // Hafenbecken reicht. Eine Brücke führt über den Fjord, der Kai in der Mitte des Beckens liegt unten am Wasser – dorthin
  // nur über einen Teleportstein. Im Süden der Platz mit dem Weltentor und die Werkstatt des Klippenschmieds
  16: {
    form: 'Fjordhafen',
    liquid: 'WATER',
    grid: kfTownGrid(20, (dx, dy) => {
      const inside = (x, y) => (Math.abs(x) / 19.3) ** 3 + (Math.abs(y) / 19.3) ** 3 <= 1;
      const fjord = (x, y) => (y <= -10 && x >= -3 && x <= 2) || Math.hypot(x / 8.4, (y + 7) / 5.2) <= 1;
      const quay = Math.abs(dx) <= 4 && dy >= -9 && dy <= -6;
      if (fjord(dx, dy) && !quay) return dy === -16 || dy === -15 ? '=' : '~';
      if (!inside(dx, dy)) {
        const near = inside(dx + 1, dy) || inside(dx - 1, dy) || inside(dx, dy + 1) || inside(dx, dy - 1);
        if (!near) return (dx * 3 + dy * 7) % 11 === 0 ? 'T' : '"';
        return (kfGateNS(dx) && dy === 20) || (kfGateWE(dy) && Math.abs(dx) === 20) ? 'o' : '#';
      }
      if (quay) return dy === -9 ? '.' : ',';
      if (Math.hypot(dx + 0.5, dy - 7) < 4.5) return '.';
      if (dy === -1 || dy === 0) return '_';
      if ((dx === -1 || dx === 0) && dy > 0) return '_';
      return ',';
    }),
    weltentor: [0.5, 5.6], spawn: [0.5, 9.8],
    stones: [[-8, -3, 0, -6]],
    places: {
      auktion: [-2.6, -8.4, null, 0.3], lager: [3.6, -8.4, null, -0.3], aeltester: [-9.6, -10.4, null, 0.4], teleport: [-11.0, -4.4, null, 0.4],
      waffen: [-16.4, -6.4, 'w'], lehrmeister: [-14.6, -11.0, null, 0.3], alchemist: [9.6, -10.4, null, -0.4], bogenmacher: [14.6, -11.0, null, -0.3],
      ruestung: [16.6, -6.4, 'e'], post: [11.6, -4.4, null, -0.4], schmied: [-16.6, 3.6, 'w'], haendler: [-6.6, 4.4, null, 0.4],
      arena: [6.6, 4.4, null, -0.4], pvp: [14.6, 4.6, null, -0.4], stallmeister: [-4.6, 15.0, 'n'], jaegerin: [4.6, 13.8, null, -0.2]
    },
    houses: [[-12, -17, 5, 3, '#2a3a3a', 0], [8, -17, 5, 3, '#3a2a3a', 1], [9, 9, 5, 3, '#2a3a3a', 0]],
    enter: [-14, 8],
    lights: [['lantern', -4.4, -16.6], ['lantern', 3.4, -16.6], ['lantern', -4.4, -13.6], ['lantern', 3.4, -13.6], ['brazier', -3.6, -6.4], ['brazier', 4.4, -6.4],
      ['lantern', -6.0, -1.8], ['lantern', 6.0, -1.8], ['well', -4.0, 10.6]],
    deco: [[-1.8, 19.2, 'F'], [1.0, 19.2, 'F'], [-6.6, -12.6, 'X'], [6.6, -12.6, 'K'], [-16.0, -1.6, 'G'], [16.4, 1.4, 'C'], [-6.0, 12.0, 'P'], [6.6, 12.0, 'B'],
      [12.6, -1.8, 'X'], [-12.6, 1.4, 'K']]
  },

  // --- seit 14.71 (Phase 2): neue Städte der gemeinsamen Karten -----------------------------------------------------
  // Totenmoor · Moorwacht „Stegdorf“: ein offenes Pfahldorf mitten im Moor – neun Plattformen im Raster, verbunden
  // durch Stege; in der Mitte das Weltentor, auf den Eckplattformen schiefe Hütten auf Pfählen
  8: {
    form: 'Stegdorf',
    liquid: 'BOG',
    grid: kfTownGrid(13, (dx, dy) => {
      const band = (v) => (v >= -12 && v <= -7 ? 0 : v >= -3 && v <= 2 ? 1 : v >= 6 && v <= 11 ? 2 : -1);
      const bx = band(dx);
      const by = band(dy);
      if (bx >= 0 && by >= 0) return ',';
      const lane = (v) => (v === -10 || v === -9 ? 0 : v === -1 || v === 0 ? 1 : v === 8 || v === 9 ? 2 : -1);
      if (by >= 0 && lane(dy) >= 0 && (bx < 0 || Math.abs(dx) === 13)) return '=';
      if (bx >= 0 && lane(dx) >= 0 && (by < 0 || Math.abs(dy) === 13)) return 'H';
      if ((dy === -1 || dy === 0) && Math.abs(dx) >= 12) return '=';
      if ((dx === -1 || dx === 0) && Math.abs(dy) >= 12) return 'H';
      return '~';
    }),
    weltentor: [-0.5, -1.4], spawn: [-0.5, 1.6],
    places: {
      auktion: [-2.2, -9.6, null, 0.3], post: [2.0, -9.6, null, -0.3], stallmeister: [-2.4, 9.4, null, 0.3], lager: [2.2, 9.4, null, -0.3],
      waffen: [-10.6, -2.4, null, 0.6], schmied: [-10.6, 2.0, null, 0.6], ruestung: [10.4, -2.4, null, -0.6], jaegerin: [10.4, 2.0, null, -0.6],
      aeltester: [-8.0, -11.4, null, 0.3], lehrmeister: [-11.4, -7.8, null, 0.4], alchemist: [7.0, -11.4, null, -0.3], bogenmacher: [10.6, -7.8, null, -0.4],
      haendler: [-11.4, 7.0, null, 0.4], arena: [-7.8, 10.2, null, 0.3], pvp: [6.8, 10.2, null, -0.3], teleport: [10.6, 7.0, null, -0.4]
    },
    houses: [[-12, -12, 3, 2, '#4a5a3a', { roof: 'sattel', wall: 'holz', lean: 0.07, stilts: true }],
      [9, -12, 3, 2, '#5a4a3a', { roof: 'walm', wall: 'holz', lean: -0.06, stilts: true, chimney: 0.2 }],
      [-12, 10, 3, 2, '#5a4a3a', { roof: 'walm', wall: 'holz', lean: -0.08, stilts: true }],
      [9, 10, 3, 2, '#4a5a3a', { roof: 'sattel', wall: 'holz', lean: 0.06, stilts: true }]],
    lights: [['lantern', -2.6, -2.6], ['lantern', 2.4, -2.6], ['lantern', -2.6, 2.4], ['lantern', 2.4, 2.4],
      ['brazier', -7.4, -7.4], ['brazier', 6.6, -7.4], ['brazier', -7.4, 6.6], ['brazier', 6.6, 6.6]],
    deco: [[-11.6, -3.0, 'X'], [11.0, 2.6, 'G'], [-2.6, -11.4, 'K'], [1.6, 11.0, 'C'], [-8.6, -8.0, 'K'], [7.6, 7.6, 'X']]
  },

  // Donnerklamm · Klammfeste „Gratfeste“: eine lange Feste auf dem Grat zwischen zwei Klammen. Im Westen und Osten
  // Tore auf dem Grat, nach Norden und Süden Hängebrücken über die Klamm; die Werkstatt des Braumeisters im Westen
  3: {
    form: 'Gratfeste',
    liquid: 'KLUFT',
    grid: kfTownGrid(20, (dx, dy) => {
      if (Math.abs(dy) >= 11) return dx === -1 || dx === 0 ? 'H' : '~';
      if (Math.abs(dy) === 10 || Math.abs(dx) === 20) {
        return (kfGateNS(dx) && Math.abs(dy) === 10) || (kfGateWE(dy) && Math.abs(dx) === 20) ? 'o' : '#';
      }
      if (Math.hypot(dx + 0.5, dy + 0.5) < 4.6) return '.';
      if (kfRoad(dx, dy)) return '_';
      return ',';
    }),
    weltentor: [0.5, -2.4], spawn: [0.5, 2.2],
    places: {
      aeltester: [-5.0, -4.6, null, 0.3], teleport: [6.0, -4.6, null, -0.3], auktion: [-8.6, -6.4, 'n'], post: [9.6, -6.4, 'n'],
      waffen: [-12.6, -3.4, 'w'], ruestung: [13.4, -3.4, 'e'], lehrmeister: [-17.4, -4.0, null, 0.4], bogenmacher: [17.6, -4.0, null, -0.4],
      haendler: [-5.0, 4.6, null, 0.3], alchemist: [6.0, 4.6, null, -0.3], schmied: [-8.6, 3.8, 'w'], lager: [9.6, 3.4, 'e'],
      arena: [-5.6, 7.8, null, 0.3], pvp: [6.6, 7.8, null, -0.3], stallmeister: [17.4, 3.6, 'n'], jaegerin: [-9.0, 7.6, null, 0.2]
    },
    houses: [[-17, -8, 5, 3, '#4a4644', 0], [12, -8, 5, 3, '#5a3a2e', 1], [12, 5, 5, 3, '#4a4644', 0]],
    enter: [-17, 2],
    lights: [['lantern', -7.4, -1.8], ['lantern', 6.6, -1.8], ['lantern', -7.4, 1.6], ['lantern', 6.6, 1.6], ['brazier', -2.6, -8.6], ['brazier', 1.8, -8.6],
      ['brazier', -2.6, 8.6], ['brazier', 1.8, 8.6], ['lantern', -18.4, -2.6], ['lantern', 18.4, -2.6]],
    deco: [[-1.8, -9.2, 'F'], [1.0, -9.2, 'F'], [-12.0, -5.2, 'G'], [12.6, 2.4, 'X'], [-3.0, 6.4, 'K'], [3.6, -6.8, 'C'], [15.0, 8.4, 'X'],
      [-12.4, 8.4, 'B'], [8.6, -8.4, 'K'], [-14.6, -4.4, 'C']]
  },

  // Feuerberg · Glutlager „Basaltsechseck“: eine sechseckige Basaltfeste; innen ein zweites Sechseck aus einem
  // Lavagraben mit vier Steinbrücken, darin der Platz mit dem Weltentor, außen herum Stände und Schmieden
  9: {
    form: 'Basaltsechseck',
    liquid: 'LAVA',
    grid: kfTownGrid(13, (dx, dy) => {
      const hx = (x, y) => Math.max(Math.abs(y) / 11.6, (1.732 * Math.abs(x) + Math.abs(y)) / 23.2);
      const inside = (x, y) => hx(x, y) <= 1 && Math.abs(x) <= 12;
      if (!inside(dx, dy)) {
        const near = inside(dx + 1, dy) || inside(dx - 1, dy) || inside(dx, dy + 1) || inside(dx, dy - 1);
        if (near) return (kfGateNS(dx) && Math.abs(dy) >= 11) || (kfGateWE(dy) && Math.abs(dx) >= 12) ? 'o' : '#';
        if ((dx === -1 || dx === 0) && Math.abs(dy) >= 12) return '_';
        return (dx * 5 + dy * 3) % 11 === 0 ? 'T' : '"';
      }
      const h = hx(dx + 0.5, dy + 0.5);
      if (h >= 0.42 && h < 0.56) return dy === -1 || dy === 0 ? '=' : dx === -1 || dx === 0 ? 'H' : '~';
      if (h < 0.3) return '.';
      if (kfRoad(dx, dy)) return '_';
      return ',';
    }),
    weltentor: [0.5, -1.8], spawn: [0.5, 2.0],
    places: {
      aeltester: [-2.6, -3.0, null, 0.3], teleport: [3.6, -3.0, null, -0.3], waffen: [-9.6, -2.6, 'w'], schmied: [-9.6, 2.6, 'w'],
      ruestung: [10.6, -2.6, 'e'], lager: [10.6, 2.6, 'e'], auktion: [-4.6, -9.4, 'n'], post: [5.4, -9.4, 'n'],
      lehrmeister: [-7.6, -6.6, null, 0.4], bogenmacher: [8.4, -6.6, null, -0.4], haendler: [-7.6, 6.6, null, 0.4], alchemist: [8.4, 6.6, null, -0.4],
      arena: [-4.6, 9.4, null, 0.3], pvp: [5.4, 9.4, null, -0.3], stallmeister: [-2.4, 10.4, 'n'], jaegerin: [2.6, -10.2, null, -0.2]
    },
    houses: [],
    lights: [['brazier', -2.6, -7.6], ['brazier', 2.6, -7.6], ['brazier', -2.6, 7.8], ['brazier', 2.6, 7.8], ['lantern', -10.6, -0.4], ['lantern', 11.2, -0.4]],
    deco: [[-1.8, -11.2, 'F'], [1.0, -11.2, 'F'], [-10.0, -5.0, 'X'], [10.6, 5.0, 'X'], [-6.4, 9.6, 'G'], [7.4, -9.6, 'K'], [-8.4, 3.6, 'C'], [9.0, -4.6, 'G']]
  },

  // Kristallabgrund · Lichtwacht „Oktogon“: eine achteckige Kristallfeste. Im Norden eine innere Zitadelle mit eigener
  // Mauer (Rat, Auktion, die Stube des Lichtmönchs), im Süden der Platz mit dem Weltentor; zwei Abgrundspalten im
  // Westen und Osten, Lichtbrücken führen hinüber
  10: {
    form: 'Oktogon',
    liquid: 'ABGRUND',
    grid: kfTownGrid(20, (dx, dy) => {
      const inside = (x, y) => Math.abs(x) <= 19 && Math.abs(y) <= 19 && Math.abs(x) + Math.abs(y) <= 27;
      if (!inside(dx, dy)) {
        const near = inside(dx + 1, dy) || inside(dx - 1, dy) || inside(dx, dy + 1) || inside(dx, dy - 1);
        if (!near) return '"';
        return (kfGateNS(dx) && Math.abs(dy) === 20) || (kfGateWE(dy) && Math.abs(dx) === 20) ? 'o' : 'K';
      }
      // innere Zitadelle: Mauer bei x = ±8 (y ≤ -5) und y = -5, Tor nach Süden
      if (dy <= -5 && Math.abs(dx + 0.5) === 8.5) return 'K';
      if (dy === -5 && Math.abs(dx + 0.5) < 8.5) return kfGateNS(dx) ? 'o' : 'K';
      // Abgrundspalten mit Lichtbrücken
      if ((dx === -12 || dx === -11 || dx === 10 || dx === 11) && dy >= -3 && dy <= 14) return dy === -1 || dy === 0 || dy === 9 || dy === 10 ? '=' : '~';
      if (Math.hypot(dx + 0.5, dy - 4) < 4.6) return '.';
      if (kfRoad(dx, dy) || ((dy === 9 || dy === 10) && Math.abs(dx + 0.5) < 13)) return '_';
      return ',';
    }),
    weltentor: [0.5, 3.0], spawn: [0.5, 7.0],
    places: {
      aeltester: [-4.6, -9.4, null, 0.3], auktion: [-4.4, -12.6, 'n'], post: [-5.6, -7.4, null, 0.3], lehrmeister: [5.6, -8.0, null, -0.3],
      waffen: [-16.6, -3.4, 'w'], schmied: [-16.6, 3.4, 'w'], haendler: [-15.6, 7.6, null, 0.4],
      ruestung: [16.4, -3.4, 'e'], lager: [16.4, 3.4, 'e'], alchemist: [15.6, 7.6, null, -0.4],
      teleport: [-6.6, 2.4, null, 0.4], arena: [7.4, 2.4, null, -0.4],
      stallmeister: [-4.6, 15.6, 'n'], jaegerin: [4.6, 15.6, null, -0.2], bogenmacher: [-7.6, 12.6, null, 0.3], pvp: [7.6, 12.6, null, -0.3]
    },
    houses: [[-6, -17, 4, 3, '#4a3a8a', 0], [11, -13, 4, 3, '#2e4a7a', 1], [-14, -13, 4, 3, '#3a3a6a', 0]],
    enter: [1, -17],
    lights: [['lantern', -2.4, -6.6], ['lantern', 1.6, -6.6], ['lantern', -13.6, -1.8], ['lantern', 12.6, -1.8], ['lantern', -13.6, 8.4], ['lantern', 12.6, 8.4],
      ['brazier', -2.6, 13.6], ['brazier', 1.8, 13.6], ['brazier', -6.6, -16.0]],
    deco: [[-2.6, -19.2, 'F'], [1.6, -19.2, 'F'], [-9.6, -12.6, 'G'], [9.6, -12.6, 'X'], [-17.6, 10.6, 'G'], [17.4, 10.6, 'X'], [-5.6, 17.0, 'K'],
      [5.6, 17.0, 'C'], [-3.6, -11.6, 'B'], [15.0, -8.6, 'G'], [-15.0, -8.6, 'X']]
  }
};
for (const [id, L] of Object.entries(KF_TOWNS)) TOWN_LAYOUTS[id] = L;
