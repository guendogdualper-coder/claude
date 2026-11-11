// Kartenformen (seit 14.68, docs/kartenformen.md): welche Karte welche Grundform hat und die neuen Städte dazu.
// Gebaut wird in kartenformen.js (FORM_BUILDERS, mapFormShape aus buildWorldMaps). Kazehana (Map 1) bleibt, wie sie
// ist; die Schattenkarten und die gemeinsamen Karten ab Stufe 50 folgen in einem zweiten Schritt (Vorschläge in der Doku).
//
// Angaben je Karte (alle Lagen in Kacheln ab der linken oberen Ecke der Karte, 360 × 220):
//   form       Name in FORM_BUILDERS (inseln, schlucht, fluss, lichtungen)
//   void       Bodenart dessen, was man nicht betreten kann (WATER Meer/Fluss, WOLKEN Wolkenmeer, KLUFT Schlucht)
//   voidEdge   der Rand der Karte liegt darin (3D: keine Randwand, die Fläche läuft bis zum Horizont)
//   link       wie Inseln ohne Landweg verbunden werden: 'stone' Teleportstein-Paar, 'ford' Furt, 'pfad' Waldpfad
//   gates      Tore der Stadt ohne Weg nach draußen ({ n: false } …), ring: Land rund um die Stadt je Seite (Standard 3)
//   roadsCross Wege dürfen das Gewässer mit Brücken queren (Fluss); sonst enden sie am Ufer
//   islet      'trees': zu kleine Inseln werden Felsnadeln mit Bäumen statt Meer; fill 'trees': Unerreichbares wird Wald
//   clearEdge  keine Bäume direkt an der Absturzkante
//   mobScale   Anteil der Monstergruppen (weniger begehbares Land: nicht zu gedrängt)
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
  }
};

// Texte der Karten (Weltentor, Wegweiser) passend zur neuen Form
const MAP_FORM_TEXT = {
  4: 'Undurchdringlicher Nadelwald voller Lichtungen, verbunden durch Waldpfade. Banditen, Spinnen und Bären. Spinnenhöhle und Banditenkeller.',
  5: 'Eine tiefe Schlucht teilt das Land in Hochplateaus, Hängebrücken führen hinüber. Orks und Skorpione. Orkfestung.',
  6: 'Ascheinseln im dunklen Meer, nur über Teleportsteine verbunden. Oger und Dämonen. Totengruft.',
  2: 'Der Schlangenfluss windet sich durch die Wüste bis in das Delta des Nagadschungels. Die Kanalstadt Sahra.',
  7: 'Himmelsinseln über einem Wolkenmeer, verbunden durch Eisbrücken und Teleportsteine. Eiswölfe, Yetis und Frostgeister. Eisgrotte.'
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

// Die Stadtformen der Lichtseite (5, 6, 7, 2) sind schon in TOWN_LAYOUTS und dienen den Schattenstädten als Vorlage
// (gespiegelt) – die gespiegelten Kopien sind beim Laden von stadtformen.js entstanden. Hier werden nur die
// Lichtstädte selbst ersetzt; die Schattenstädte bleiben genau, wie sie sind.
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
  }
};
for (const [id, L] of Object.entries(KF_TOWNS)) TOWN_LAYOUTS[id] = L;
