// --- Kartenrand in 3D (seit 14.77) --------------------------------------------------------------------------------
// Wunsch: „Wenn man bis zum Ende der Map fliegt (Drache), ist da einfach so eine Wand.“ Bis 14.76 schloss jede Karte mit
// einer hohen Hecke/Klippe ihres Gebiets ab (Randkulisse seit 8.4, drei-welt.js kulisse3), dahinter stand 13 Kacheln
// draußen ein flacher, gemalter Horizontring (drei-fx.js placeHorizon3) – vom Drachen aus sah man darüber hinweg nur noch
// Himmelsfarbe und eine senkrechte Fläche.
// Jetzt läuft hinter dem Rand eine Landschaft in Stufen bis zum Horizont, je Karte passend (RAND3_ART):
//   Nah   – die bisherige Randkulisse (echte 3D-Stücke) auf einem Hang, der nach außen weiter ansteigt (rand3H statt der
//           festen Böschung, auch für den Boden der Blöcke: tileSample → rand3Sample)
//   Mitte – ein Ring aus Gelände bis 130 Kacheln draußen (Hügel, Hochwald, Tafelberge, Dünen, Grate, Moor, Meer,
//           Wolkenmeer, Abgrund), darauf sparsame Streuteile (Tannen, Bäume, tote Bäume, Felsnadeln, Tafelberge,
//           Basaltsäulen, Meeresfelsen mit Gischt, Gipfel, Vulkane, schwebende Kristallinseln) – ein Mesh je Abschnitt
//           von rund 48 Kacheln, damit die Sichtprüfung alles hinter der Kamera weglässt
//   Ferne – Bergketten und Inseln im Dunst: je Ecke ein Dunstwert (aHaze), der zur Nebelfarbe mischt, die äußerste Reihe
//           ganz – der Ring endet unsichtbar im Himmel, kein grauer Leerraum, keine Wand
// Am Rand selbst ziehen Nebelbänke (Billboards, weich, nah an der Kamera und um die eigene Figur durchsichtig): der
// hoch fliegende Drache stößt an Nebel/Wolken, nicht an eine Mauer. Die Grenze im Spiel (Kollision) bleibt, wie sie war.
// Grafik „niedrig“: gröberer Ring ohne Streuteile und Nebel. Einhängepunkte: drei-kern.js (tileSample, kindAt,
// v3PlaceCamera), drei-welt.js (kulisse3), drei-fx.js (v3SyncBounds ruft rand3Frame und blendet den alten Ring aus).

// Gebiet (V3.home.style, Gebiet in der Ecke der Karte) → Art des Randes
const RAND3_STIL = {
  wiesen: 'huegel', daemmerwiesen: 'huegelNacht', wald: 'hochwald', aschewald: 'aschewald', orktal: 'tafelberge',
  knochenwueste: 'knochenduenen', oedland: 'aschemeer', nagadschungel: 'dschungel', frost: 'wolken', nachtfrost: 'schneeberge',
  moor: 'moor', schwarzmoor: 'schwarzmoor', vulkan: 'vulkan', titanenkamm: 'grate', donnerklamm: 'grateGrau',
  blutsteppe: 'blutsteppe', schattenklippen: 'grateNacht', leerenschlund: 'abgrund', kristallhang: 'abgrund', lichtwacht: 'abgrund'
};
// je Karte und Seite (0 Nord, 1 Süd, 2 West, 3 Ost) eine andere Art: Schattenklippen – im Norden das offene Meer
const RAND3_SEITE = { m16: { 0: 'nachtmeer' } };
// Rand im Meer bzw. Wolkenmeer/Abgrund der Kartenform (voidG): Art nach der Flüssigkeit
const RAND3_VOID = { WATER: 'aschemeer', WOLKEN: 'wolken', ABGRUND: 'abgrund' };

// Arten. prof/amp: Grundhöhe und Hügelhöhe über dem Abstand d (Kacheln hinter dem Rand), ns: Maßstab der Hügel,
// ridge: [ab d, voll bei d, Höhe] Bergkämme, wald: [Anteil nah, fern, Kronenhöhe], terr: Tafelberge, dune: Dünen,
// c: Farben, teile: Streuteile [Art, d von, d bis, Dichte je 100 Kachel², Größe von, bis, Farben], nebel: Nebelbänke
// void: 'meer' | 'wolken' | 'abgrund' (flache Fläche statt Gelände)
const RAND3_ART = {
  // Kazehana: sanft ansteigende, bewaldete Hügel bis zu fernen blauen Bergen mit Schneekappen
  huegel: {
    prof: [[7.5, 2.2], [14, 3.0], [24, 4.6], [36, 7.5], [52, 13], [72, 22], [100, 30], [130, 32]],
    amp: [[7.5, 0], [14, 1.2], [30, 3], [60, 7], [130, 9]], ns: 0.05, ridge: [42, 80, 16],
    wald: [0.5, 0.42, 1.1],
    c: { boden: '#5f9c42', boden2: '#79ad4e', wald: '#2f6a2c', wald2: '#3f7d34', fels: '#7a8a9e', schnee: '#f2f6fa' }, felsH: 9, schneeH: 24,
    teile: [['baum', 9, 32, 7, 1.5, 2.6, ['#2f6a2c', '#3d7a33', '#4f8c3c']], ['baum', 10, 28, 1.4, 1.5, 2.3, ['#d07896', '#e08aa6', '#f5b8cb']], ['tanne', 26, 50, 3, 2.4, 3.6, ['#2a5a2c', '#33683a']]],
    nebel: { c: '#f6fbff', a: 0.4, n: 0.9, h: [5, 10], r: [6, 10] }
  },
  // Dämmerwiesen: dieselben Hügel in Nachtblau und Violett
  huegelNacht: {
    base: 'huegel',
    c: { boden: '#2c3e5c', boden2: '#3a4c6e', wald: '#1e2c48', wald2: '#283a5a', fels: '#4a5070', schnee: '#c8ccf0' },
    teile: [['baum', 9, 32, 6, 1.5, 2.6, ['#22324e', '#2a3e5e', '#34486c']], ['baum', 10, 28, 0.6, 1.5, 2.3, ['#7a6ab8', '#9a8ad8']], ['tanne', 26, 50, 2.5, 2.4, 3.6, ['#1c2a44', '#243452']]],
    nebel: { c: '#b8bce8', a: 0.38, n: 1, h: [4, 9], r: [6, 10] }
  },
  // Dunkelwald: undurchdringlicher Hochwald, nach außen dunkler, viel Nebel zwischen den Wipfeln
  hochwald: {
    prof: [[7.5, 2.2], [16, 3.2], [30, 5.5], [60, 10], [100, 16], [130, 18]],
    amp: [[7.5, 0], [16, 1], [40, 3], [130, 6]], ns: 0.045,
    wald: [1, 1, 1.6], dunkel: 0.45,
    c: { boden: '#24442e', boden2: '#2c5036', wald: '#1c3e2e', wald2: '#24493a' },
    teile: [['tanne', 9, 22, 13, 2.4, 3.8, ['#1e4034', '#24493b', '#2a5444']], ['tanne', 22, 40, 6, 3, 4.4, ['#1a382e', '#203f34']]],
    nebel: { c: '#c4dcd2', a: 0.45, n: 1.6, h: [3, 8], r: [6, 11] }
  },
  // Aschewald: verkohlter Tannenwald, hier und da Glut am Boden
  aschewald: {
    base: 'hochwald', dunkel: 0.35, glut: 0.93,
    c: { boden: '#2a2422', boden2: '#342c28', wald: '#221c1a', wald2: '#2c2420', glut: '#ff6a24' },
    teile: [['tanne', 9, 22, 12, 2.4, 3.8, ['#241e1c', '#2e2622', '#3a302a']], ['tot', 12, 36, 4, 2, 3, ['#1e1816', '#2a201c']]],
    nebel: { c: '#8a807a', a: 0.42, n: 1.5, h: [3, 8], r: [6, 11] }
  },
  // Rostschlucht: Hochplateaus, Tafelberge und Felsnadeln aus geschichtetem Sandstein
  tafelberge: {
    prof: [[7.5, 2.2], [14, 2.8], [40, 3.6], [130, 5]],
    amp: [[7.5, 0], [14, 0.8], [130, 2]], ns: 0.05, terr: 9,
    c: { boden: '#b07c48', boden2: '#c08a52', fels: '#a06a3a', band: '#8a5a32', top: '#d4a46a' }, felsH: 5,
    teile: [['tafel', 10, 90, 0.6, 5, 11, ['#94643a', '#c48f58', '#a87444', '#d4a46a']], ['nadel', 10, 40, 1.4, 2.5, 5, ['#a06c3c', '#c8945c']], ['tot', 9, 24, 1, 1.2, 1.8, ['#6a4a2c', '#5a3e24']]],
    nebel: { c: '#e8d0a4', a: 0.3, n: 0.6, h: [4, 9], r: [7, 11] }
  },
  // Knochenwüste: bleiche Dünen, dazwischen kalkweiße Felsen
  knochenduenen: {
    prof: [[7.5, 2.2], [16, 2.6], [50, 3.4], [130, 4]],
    amp: [[7.5, 0], [16, 0.6], [130, 1.6]], ns: 0.05, dune: [12, 2.6],
    c: { boden: '#b4ae98', boden2: '#c8c2aa', sand: '#d4ccb2', sand2: '#a8a28c', fels: '#9a9480' },
    teile: [['tafel', 20, 100, 0.25, 3.5, 8, ['#a8a290', '#d0cab6', '#bcb6a2', '#e0dac8']], ['nadel', 10, 40, 0.9, 2, 4, ['#c8c2ae', '#e0dacc']]],
    nebel: { c: '#c8c6d8', a: 0.3, n: 0.6, h: [4, 9], r: [7, 11] }
  },
  // Schlangental: Dschungelwand mit großen Kronen, dahinter Dünen bis zum Horizont
  dschungel: {
    prof: [[7.5, 2.2], [18, 4], [34, 6], [48, 4.5], [130, 5]],
    amp: [[7.5, 0], [18, 1.2], [40, 2], [130, 1.4]], ns: 0.05,
    wald: [1, 0.85, 1.8], waldBis: [36, 50], dune: [46, 2.8],
    c: { boden: '#3a6a2e', boden2: '#4a7c36', wald: '#2e5a2a', wald2: '#4a8a3c', sand: '#e0c890', sand2: '#c8a66c' },
    teile: [['baum', 9, 36, 7, 1.9, 3.2, ['#2e5a2a', '#3d7633', '#4a8a3c', '#5a9a46']], ['baum', 9, 30, 0.6, 1.4, 2, ['#e04a3a', '#c83a7a']]],
    nebel: { c: '#e4f4e8', a: 0.35, n: 1.1, h: [4, 9], r: [6, 10] }
  },
  // Frostgipfel: Wolkenmeer bis zum Horizont, ferne verschneite Gipfel ragen heraus
  wolken: {
    void: 'wolken', level: -0.78,
    c: { flaeche: '#f2f6fe', flaeche2: '#a9bddc' },
    teile: [['gipfel', 16, 130, 0.22, 5, 12, ['#5a6e88', '#7a8ea8', '#f4f8fc']], ['nadel', 10, 30, 0.5, 2.5, 4.5, ['#5a6a80', '#eef4fa']]],
    nebel: { c: '#ffffff', a: 0.55, n: 1.6, h: [1.5, 6], r: [6, 11] }
  },
  // Nachtfrost: verschneite Hänge mit dunklen Tannen bis zu hohen Bergen, alles in Nachtblau
  schneeberge: {
    prof: [[7.5, 2.2], [16, 3.4], [30, 6.5], [50, 13], [80, 24], [130, 30]],
    amp: [[7.5, 0], [16, 1.2], [40, 4], [130, 9]], ns: 0.05, ridge: [36, 70, 14],
    wald: [0.45, 0.25, 1.0],
    c: { boden: '#8a9ac4', boden2: '#a4b2d8', wald: '#1e2c48', wald2: '#26365a', fels: '#4a5878', schnee: '#c8d4ec' }, felsH: 12, schneeH: 18,
    teile: [['tanne', 9, 30, 7, 2.2, 3.6, ['#1e2c48', '#26365a', '#2e3e66']], ['gipfel', 50, 130, 0.08, 7, 14, ['#3e4a6c', '#56648a', '#c8d4ec']]],
    nebel: { c: '#c0ccf0', a: 0.38, n: 1.1, h: [4, 9], r: [6, 10] }
  },
  // Totenmoor: flaches Moor mit schwarzen Tümpeln, tote Bäume verschwinden in einer Nebelwand
  moor: {
    prof: [[7.5, 2.2], [12, 1.4], [20, 0.9], [130, 1.2]],
    amp: [[7.5, 0], [14, 0.4], [130, 0.8]], ns: 0.07, pfuetze: 0.6,
    c: { boden: '#3e4a30', boden2: '#4a5638', pfuetze: '#1a2620', wald: '#2e3a26' },
    teile: [['tot', 9, 60, 5, 1.6, 3, ['#3a3a2a', '#2e2e22', '#4a4434']], ['weide', 10, 40, 1.2, 1.8, 2.6, ['#3a4a30', '#4a5a3a']]],
    nebel: { c: '#b8c8b0', a: 0.5, n: 2.6, h: [1.5, 5], r: [7, 12], d: [0, 22] }
  },
  // Schwarzmoor: dasselbe Moor dunkler, mit grün leuchtenden Pilzen
  schwarzmoor: {
    base: 'moor',
    c: { boden: '#1e2c26', boden2: '#26362e', pfuetze: '#0e1814', wald: '#1e3a2e', glut: '#7ae0a8' }, glut: 0.95,
    teile: [['tot', 9, 60, 5, 1.6, 3, ['#2a2a22', '#22221c', '#343428']], ['weide', 10, 40, 1.2, 1.8, 2.6, ['#1e3a2e', '#2a4a3a']]],
    nebel: { c: '#8aa89c', a: 0.48, n: 2.4, h: [1.5, 5], r: [7, 12], d: [0, 22] }
  },
  // Ödland: Meer aus Asche und Wasser bis zum Horizont, Felsnadeln und Klippeninseln mit Gischt
  aschemeer: {
    void: 'meer', level: -0.2,
    c: { flaeche: '#3c4e5c', flaeche2: '#2e3c48', gischt: '#e8eef0' },
    teile: [['seefels', 12, 70, 0.35, 2, 4.5, ['#5e4c48', '#7a6862']], ['insel', 30, 130, 0.07, 6, 14, ['#5e4c48', '#7a6862', '#3a302c']]],
    nebel: { c: '#d8ccc4', a: 0.36, n: 1.0, h: [2, 7], r: [7, 12] }
  },
  // Schattenklippen (Norden): nächtliches Meer mit Schären und Klippen
  nachtmeer: {
    base: 'aschemeer',
    c: { flaeche: '#1e2a40', flaeche2: '#162034', gischt: '#c8d0e8' },
    teile: [['seefels', 12, 70, 0.4, 2, 4.5, ['#30303e', '#4a4a5e']], ['insel', 30, 130, 0.08, 6, 14, ['#30303e', '#4a4a5e', '#24242e']]],
    nebel: { c: '#a8acd0', a: 0.34, n: 1.0, h: [2, 7], r: [7, 12] }
  },
  // Feuerberg: schwarzer Basalt mit Lavaadern, ferne Vulkankegel mit glühenden Kratern, Rauch
  vulkan: {
    prof: [[7.5, 2.2], [16, 3], [40, 5], [130, 7]],
    amp: [[7.5, 0], [16, 1], [130, 3]], ns: 0.05, lava: 0.88,
    c: { boden: '#2e2220', boden2: '#3a2c28', lava: '#ff6a1a', fels: '#463434' },
    teile: [['saeule', 9, 30, 4, 1.2, 3.2, ['#3a2c2c', '#463434', '#6a4c44']], ['vulkan', 40, 130, 0.07, 10, 20, ['#3a2a26', '#4a3430', '#ff7a2a']]],
    nebel: { c: '#5a4642', a: 0.45, n: 1.4, h: [3, 9], r: [7, 12] }
  },
  // Donnerklamm außen (Titanenkamm): steile, dunkelrote Bergkämme
  grate: {
    prof: [[7.5, 2.2], [12, 4.2], [20, 8], [36, 14], [60, 22], [100, 30], [130, 32]],
    amp: [[7.5, 0], [12, 1], [24, 3], [130, 6]], ns: 0.05, ridge: [10, 28, 18],
    c: { boden: '#4a3430', boden2: '#5a403a', fels: '#3a2828', schnee: '#c8a8a0' }, felsH: 6, schneeH: 40,
    teile: [['nadel', 10, 40, 1.6, 2.5, 6, ['#3a2828', '#4a3432']]],
    nebel: { c: '#c09a90', a: 0.36, n: 1.0, h: [5, 11], r: [7, 12] }
  },
  // Donnerklamm (Klamm): graublaue Grate mit Schneeresten
  grateGrau: {
    base: 'grate',
    c: { boden: '#4a4e5a', boden2: '#5a5e6a', fels: '#3a3e4a', schnee: '#e4e8f4' }, schneeH: 24,
    teile: [['nadel', 10, 40, 1.6, 2.5, 6, ['#3a3e4a', '#4a4e5c']]],
    nebel: { c: '#d4dcf0', a: 0.38, n: 1.1, h: [5, 11], r: [7, 12] }
  },
  // Schattenklippen (Land): schwarze Klippen und Grate unter violettem Himmel
  grateNacht: {
    base: 'grate',
    c: { boden: '#2a2a36', boden2: '#34343e', fels: '#24242e', schnee: '#8a8ab0' },
    teile: [['nadel', 10, 40, 1.6, 2.5, 6, ['#24242e', '#30303e']]],
    nebel: { c: '#9a9cc4', a: 0.34, n: 1.0, h: [5, 11], r: [7, 12] }
  },
  // Blutsteppe: rote Steppe, Felszacken, ferne blutrote Berge
  blutsteppe: {
    prof: [[7.5, 2.2], [16, 3], [36, 5], [60, 11], [100, 20], [130, 22]],
    amp: [[7.5, 0], [16, 1.2], [130, 5]], ns: 0.05, ridge: [44, 90, 12],
    c: { boden: '#4a1e20', boden2: '#5e2a28', fels: '#3e2222', schnee: '#7a3a3a' }, felsH: 10, schneeH: 99,
    teile: [['nadel', 9, 40, 1.8, 1.8, 4.5, ['#3e2222', '#5e3432']], ['tot', 9, 30, 1.2, 1.4, 2.4, ['#3a1a18', '#2a1210']]],
    nebel: { c: '#a85a5a', a: 0.3, n: 0.9, h: [4, 9], r: [7, 11] }
  },
  // Kristallabgrund: der Abgrund bis zum Horizont, darin schwebende Kristallinseln
  abgrund: {
    void: 'abgrund', level: -0.3,
    c: { flaeche: '#120e26', flaeche2: '#1e1840' },
    teile: [['schwebe', 12, 130, 0.12, 3, 9, ['#2c2646', '#4a4272', '#9a8ae8']]],
    nebel: { c: '#8a80d0', a: 0.32, n: 1.1, h: [2, 8], r: [7, 12] }
  }
};
// Arten mit base erben, was sie nicht selbst angeben
for (const k in RAND3_ART) {
  const A = RAND3_ART[k];
  if (A.base) RAND3_ART[k] = Object.assign({}, RAND3_ART[A.base], A, { c: Object.assign({}, RAND3_ART[A.base].c, A.c) });
  RAND3_ART[k].id = k;
}

const RAND3 = { key: '', group: null, mist: null, mat: null, mistMat: null, cols: {}, tris: 0 };
// Reihen des Rings (Kacheln hinter dem Rand): nah fein, fern grob; die Nahreihen enden auf der ersten Fernreihe
const RAND3_ROWS = {
  fein: { near: [9, 11, 13.5, 16, 19, 22.5, 26.5, 31, 36.5, 43], far: [43, 50, 58, 67, 77, 88, 100, 114, 130], step: 3, corner: 6 },
  mittel: { near: [9, 12, 16, 21, 27, 34, 43], far: [43, 54, 67, 82, 100, 130], step: 4, corner: 5 },
  grob: { near: [10, 15, 22, 31, 43], far: [43, 62, 86, 130], step: 6, corner: 4 }
};

// --- Zufall und Rauschen (fest je Ort) ---
function r3hash(ix, iz, s) {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function r3noise(x, z, s) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  let fx = x - ix;
  let fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fz = fz * fz * (3 - 2 * fz);
  const a = r3hash(ix, iz, s);
  const b = r3hash(ix + 1, iz, s);
  const c = r3hash(ix, iz + 1, s);
  const d = r3hash(ix + 1, iz + 1, s);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
const r3fbm = (x, z, s) => 0.55 * r3noise(x, z, s) + 0.3 * r3noise(x * 2.1, z * 2.1, s + 7) + 0.15 * r3noise(x * 4.3, z * 4.3, s + 13);
const r3ridge = (x, z, s) => 1 - Math.abs(2 * r3fbm(x, z, s) - 1);
const r3sm = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
// stückweise linear über [[d, wert], ...]
function r3prof(P, d) {
  if (d <= P[0][0]) return P[0][1];
  for (let i = 1; i < P.length; i++) if (d <= P[i][0]) return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * (d - P[i - 1][0]) / (P[i][0] - P[i - 1][0]);
  return P[P.length - 1][1];
}

// Seite eines Punkts außerhalb (0 Nord, 1 Süd, 2 West, 3 Ost) und Abstand zum Rechteck der Karte
function rand3Dist(H, x, z) {
  const dx = Math.max(H.x0 - x, x - H.x1, 0);
  const dz = Math.max(H.y0 - z, z - H.y1, 0);
  return Math.hypot(dx, dz);
}
function rand3Side(H, x, z) {
  const ox = Math.max(H.x0 - x, x - H.x1, 0);
  const oz = Math.max(H.y0 - z, z - H.y1, 0);
  return ox > oz ? (x < H.x0 ? 2 : 3) : z < H.y0 ? 0 : 1;
}
// Art des Randes an einem Punkt der Map H (nach Seite, Kartenform, Gebiet)
function rand3Art(H, side) {
  if (!H || H.dungeon) return null;
  const S = RAND3_SEITE[H.key];
  if (S && S[side]) return RAND3_ART[S[side]];
  if (H.voidG != null) {
    for (const k in RAND3_VOID) if (GROUND[k] === H.voidG) return RAND3_ART[RAND3_VOID[k]];
    return RAND3_ART.aschemeer;
  }
  return RAND3_ART[RAND3_STIL[H.style]] || RAND3_ART.huegel;
}
const rand3ArtAt = (H, x, z) => rand3Art(H, rand3Side(H, x, z));

// Flüssigkeit außerhalb einer Kachel (Bodenart) oder null: Kartenform (voidG) oder Meerseite (RAND3_SEITE)
function rand3Void(H, tx, ty) {
  if (!H || H.dungeon) return null;
  if (H.voidG != null) return H.voidG;
  const S = RAND3_SEITE[H.key];
  if (!S) return null;
  const A = rand3ArtAt(H, tx + 0.5, ty + 0.5);
  return A && A.void === 'meer' ? GROUND.WATER : null;
}
// gilt für eine Seite der Karte (kulisse3): Rand ohne Wand
function rand3VoidSide(H, side) {
  if (!H || H.dungeon) return false;
  if (H.voidG != null) return true;
  const A = rand3Art(H, side);
  return !!(A && A.void);
}

// Waldanteil 0..1 an einem Punkt (Flecken aus Rauschen, nah dichter)
function rand3Wald(A, x, z, d) {
  if (!A.wald) return 0;
  const share = A.wald[0] + (A.wald[1] - A.wald[0]) * r3sm((d - 10) / 60);
  let w = r3sm((r3fbm(x * 0.07, z * 0.07, 4) - (1 - share) + 0.06) / 0.12);
  if (A.waldBis) w *= 1 - r3sm((d - A.waldBis[0]) / (A.waldBis[1] - A.waldBis[0]));
  return w * r3sm((d - 8) / 4);
}
// Dünen: lange Wellen quer zum Wind, 0..1
const rand3Duene = (x, z) => 0.5 + 0.5 * Math.sin(x * 0.13 + z * 0.06 + 3 * r3noise(x * 0.03, z * 0.03, 9));

// Höhe des Geländes außerhalb an (x, z) – auch der Boden der Blöcke am Rand (rand3Sample) und die Randkulisse
function rand3LandH(A, x, z, d) {
  if (d < 7.5) return bermH3(Math.max(0, d) + 0.5);
  let h = r3prof(A.prof, d);
  const a = r3prof(A.amp, d);
  if (a) h += a * (r3fbm(x * A.ns, z * A.ns, 1) - 0.35);
  if (A.ridge) {
    const k = r3sm((d - A.ridge[0]) / (A.ridge[1] - A.ridge[0]));
    if (k > 0) h += k * A.ridge[2] * Math.pow(r3ridge(x * 0.024, z * 0.024, 2), 1.7);
  }
  if (A.terr) {
    // Tafelberge: Flecken heben sich mit steiler Kante als Plateau heraus, in zwei Stufen
    const m = r3fbm(x * 0.04, z * 0.04, 3);
    const k = r3sm((d - 8) / 6);
    h += k * A.terr * (r3sm((m - 0.5) / 0.05) + 0.7 * r3sm((m - 0.64) / 0.04)) * (1 + 0.5 * r3sm((d - 30) / 60));
  }
  if (A.dune) h += r3sm((d - A.dune[0]) / 10) * A.dune[1] * rand3Duene(x, z);
  if (A.wald) h += rand3Wald(A, x, z, d) * A.wald[2];
  return h;
}
function rand3H(H, x, z) {
  const d = rand3Dist(H, x, z);
  const A = rand3ArtAt(H, x, z);
  if (!A || A.void) return bermH3(d + 0.5);
  return rand3LandH(A, x, z, d);
}

// Farben (Kacheln draußen und Ring), out = { r, g, b, glow }
const _r3c = new THREE.Color();
const _r3k = {};
const r3col = (hex) => _r3k[hex] || (_r3k[hex] = new THREE.Color(hex));
function r3mix(out, hex, k) {
  if (k <= 0) return;
  const c = r3col(hex);
  out.r += (c.r - out.r) * k;
  out.g += (c.g - out.g) * k;
  out.b += (c.b - out.b) * k;
}
function rand3Col(A, x, z, d, h, out) {
  const C = A.c;
  const b = r3col(C.boden);
  out.r = b.r; out.g = b.g; out.b = b.b; out.glow = 0;
  if (A.void) {
    if (A.void === 'wolken') {
      _r3c.set(C.flaeche2).lerp(r3col(C.flaeche), r3sm((h - A.level) / 0.9));
      out.r = _r3c.r; out.g = _r3c.g; out.b = _r3c.b;
    } else {
      const n = r3fbm(x * 0.05, z * 0.05, 6);
      _r3c.set(C.flaeche2).lerp(r3col(C.flaeche), n);
      out.r = _r3c.r; out.g = _r3c.g; out.b = _r3c.b;
    }
    return out;
  }
  if (C.boden2) r3mix(out, C.boden2, r3fbm(x * 0.09, z * 0.09, 5) * 0.8);
  if (A.dune) r3mix(out, rand3Duene(x, z) > 0.55 ? C.sand : C.sand2 || C.sand, r3sm((d - A.dune[0]) / 8) * 0.9);
  if (A.wald) {
    const w = rand3Wald(A, x, z, d);
    if (w > 0) r3mix(out, r3noise(x * 0.4, z * 0.4, 8) > 0.5 ? C.wald2 : C.wald, w);
  }
  if (A.pfuetze && r3fbm(x * 0.08, z * 0.08, 11) > A.pfuetze) r3mix(out, C.pfuetze, 0.85);
  if (A.terr) r3mix(out, h > 5.5 ? C.top : h > 3.6 ? C.band : C.boden, r3sm((d - 8) / 5) * 0.8);
  if (C.fels && A.felsH != null) r3mix(out, C.fels, r3sm((h - A.felsH) / 4) * 0.85);
  if (C.schnee && A.schneeH != null) r3mix(out, C.schnee, r3sm((h - A.schneeH) / 3));
  if (A.lava && d > 9) {
    const r = r3ridge(x * 0.045, z * 0.045, 12);
    if (r > A.lava) {
      r3mix(out, C.lava, r3sm((r - A.lava) / 0.04));
      out.glow = r3sm((r - A.lava) / 0.05) * 0.85;
    }
  }
  if (A.glut && d > 9 && r3noise(x * 0.35, z * 0.35, 14) > A.glut) {
    r3mix(out, C.glut, 0.8);
    out.glow = 0.7;
  }
  if (A.dunkel) {
    const k = 1 - A.dunkel * r3sm((d - 10) / 40);
    out.r *= k; out.g *= k; out.b *= k;
  }
  return out;
}

// Boden einer Kachel hinter dem Rand (aus tileSample, drei-kern.js): Höhe des Hangs und, nach außen zunehmend, die
// Farbe der Landschaft statt der Bodenfarbe der Randkachel
const _r3s = {};
function rand3Sample(H, x, y, out) {
  const px = x + 0.5;
  const pz = y + 0.5;
  const A = rand3ArtAt(H, px, pz);
  if (!A || A.void) return out;
  const d = rand3Dist(H, px, pz);
  out.h = rand3LandH(A, px, pz, d);
  const k = r3sm((d - 3) / 9);
  if (k > 0) {
    rand3Col(A, px, pz, d, out.h, _r3s);
    // terrainJob hellt höhere Stellen auf (lift) – hier vorab ausgleichen
    const lift = out.h > 0.3 ? 1 + (out.h / WALL3_H) * 0.25 : 1;
    out.r += (_r3s.r / lift - out.r) * k;
    out.g += (_r3s.g / lift - out.g) * k;
    out.b += (_r3s.b / lift - out.b) * k;
  }
  return out;
}

// Schulterblick: die Kamera bleibt über dem Hang hinter dem Rand
function rand3Cam(pos) {
  const H = V3.home;
  if (!H || H.dungeon) return;
  const d = rand3Dist(H, pos.x, pos.z);
  if (d <= 0) return;
  const A = rand3ArtAt(H, pos.x, pos.z);
  if (!A || A.void) return;
  const h = rand3LandH(A, pos.x, pos.z, d) + 1.4;
  if (pos.y < h) pos.y = h;
}

// --- Material: Toon wie die Welt, dazu Glühen (Lava, Kristall) und Dunst zur Nebelfarbe je Ecke ---
function rand3Mat() {
  if (RAND3.mat) return RAND3.mat;
  const m = toonMat({});
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'attribute float aHaze;\nattribute float aGlow;\nattribute float aFern;\nvarying float vHaze;\nvarying float vGlow;\nvarying float vClear;\nvoid main() {\n\tvHaze = aHaze;\n\tvGlow = aGlow;\n\tvClear = aFern * smoothstep(2.0, 12.0, position.y);');
    // Nebel wie sonst, aber im Fernring (ab 36–48 Kacheln) scheinen Berge durch (bis 80 % weniger Nebel ab 2–12 Einheiten
    // Höhe): ferne Ketten stehen als blasse Umrisse über dem Dunst (Luftperspektive über vHaze, das die äußerste Reihe
    // ganz verschluckt); flaches Land, Meer und alles Nahe verschwinden im Nebel wie bisher
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'varying float vHaze;\nvarying float vGlow;\nvarying float vClear;\nvoid main() {')
      .replace('#include <fog_fragment>', `gl_FragColor.rgb = mix(gl_FragColor.rgb, vColor * 1.25, vGlow);
#ifdef USE_FOG
	float fogFactor = smoothstep(fogNear, fogFar, fogDepth) * (1.0 - 0.8 * vClear);
	gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, max(max(fogFactor, vHaze), 0.6 * vClear));
#endif`);
  };
  m.customProgramCacheKey = () => 'rand3';
  RAND3.mat = m;
  return m;
}

// Nebelbänke: Billboards mit weichem Rand, ziehen langsam; dicht vor der Kamera und um die eigene Figur durchsichtig
function rand3MistMat() {
  if (RAND3.mistMat) return RAND3.mistMat;
  RAND3.mistMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uFogColor: { value: new THREE.Color() },
      uFogNear: { value: 30 }, uFogFar: { value: 80 }, uFade: FADE_UNIFORM
    },
    vertexShader: `attribute vec3 aCorner;
attribute float aSize;
attribute float aAlpha;
uniform float uTime;
uniform float uFogNear;
uniform float uFogFar;
varying vec2 vUv;
varying float vA;
varying float vFog;
varying float vSeed;
void main() {
	vec3 c = position;
	c.x += sin(uTime * 0.07 + aCorner.z * 6.28) * 1.6;
	c.z += cos(uTime * 0.05 + aCorner.z * 4.1) * 1.2;
	c.y += sin(uTime * 0.11 + aCorner.z * 9.0) * 0.35;
	vec4 mv = modelViewMatrix * vec4(c, 1.0);
	mv.xy += aCorner.xy * aSize;
	gl_Position = projectionMatrix * mv;
	vUv = aCorner.xy;
	vSeed = aCorner.z;
	float depth = -mv.z;
	vA = aAlpha * smoothstep(3.0, 12.0, depth);
	vFog = smoothstep(uFogNear, uFogFar, depth);
}`,
    fragmentShader: `uniform vec3 uColor;
uniform vec3 uFogColor;
uniform vec4 uFade;
varying vec2 vUv;
varying float vA;
varying float vFog;
varying float vSeed;
void main() {
	float r = length(vUv * vec2(1.0, 1.35));
	float w = 0.82 + 0.18 * sin(atan(vUv.y, vUv.x) * 3.0 + vSeed * 20.0);
	float a = smoothstep(w, 0.1, r) * vA;
	if (uFade.z > 0.0 && gl_FragCoord.z < uFade.w) a *= smoothstep(uFade.z * 1.1, uFade.z * 3.2, length(gl_FragCoord.xy - uFade.xy));
	if (a < 0.004) discard;
	gl_FragColor = vec4(mix(uColor, uFogColor, vFog), a);
}`,
    transparent: true,
    depthWrite: false,
    fog: false
  });
  return RAND3.mistMat;
}

// --- Bau des Rings ---
// Spalten entlang des Rands (im Uhrzeigersinn von oben gesehen, ab der Nordwestecke): Punkt auf dem Rechteck und
// Richtung nach außen; in den Ecken Viertelkreise. far: Spalte gehört auch zum groben Fernring (jede dritte)
function rand3Columns(H, R) {
  const x0 = H.x0;
  const z0 = H.y0;
  const x1 = H.x1;
  const z1 = H.y1;
  const sides = [
    [x0, z0, 1, 0, 0, -1, x1 - x0, 0], [x1, z0, 0, 1, 1, 0, z1 - z0, 3],
    [x1, z1, -1, 0, 0, 1, x1 - x0, 1], [x0, z1, 0, -1, -1, 0, z1 - z0, 2]
  ];
  const cols = [];
  for (let k = 0; k < 4; k++) {
    const [px, pz, dx, dz, nx, nz, len, side] = sides[k];
    const n = Math.max(3, Math.round(len / R.step / 3) * 3);
    for (let i = 0; i <= n; i++) cols.push({ x: px + dx * len * i / n, z: pz + dz * len * i / n, nx, nz, far: i % 3 === 0, side });
    // Ecke: Richtung dreht von dieser Seite zur nächsten
    const [, , , , nx2, nz2] = sides[(k + 1) % 4];
    const a0 = Math.atan2(nz, nx);
    let a1 = Math.atan2(nz2, nx2);
    if (a1 < a0) a1 += Math.PI * 2;
    const ex = px + dx * len;
    const ez = pz + dz * len;
    for (let j = 1; j < R.corner; j++) {
      const a = a0 + (a1 - a0) * j / R.corner;
      cols.push({ x: ex, z: ez, nx: Math.cos(a), nz: Math.sin(a), far: true, side: -1 });
    }
  }
  return cols;
}

// Dunst nach Abstand: ab 16 Kacheln langsam, die letzte Reihe ganz in der Nebelfarbe
// Fernanteil: ab 36 Kacheln langsam, ab 48 ganz – nur dort scheinen hohe Teile durch den Nebel
const rand3Fern = (d) => r3sm((d - 36) / 12);
const RAND3_GROSS = new Set(['gipfel', 'vulkan', 'tafel', 'insel', 'schwebe', 'seefels']);
const rand3Haze = (d, last) => (d >= last ? 1 : Math.min(0.97, Math.pow(r3sm((d - 16) / 114), 1.25) * 0.92));

// Sammler für die Dreiecke eines Abschnitts (ohne Index: jede Ecke einzeln, Normalen je Ecke)
class Rand3Buf {
  constructor() {
    this.p = []; this.n = []; this.c = []; this.h = []; this.g = []; this.f = [];
    // Fernanteil der folgenden Ecken (0 nah … 1 ab 48 Kacheln): dort scheinen Berge durch den Nebel
    this.F = 0;
  }
  v(x, y, z, nx, ny, nz, col, haze, glow) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(col.r, col.g, col.b); this.h.push(haze); this.g.push(glow || 0); this.f.push(this.F);
  }
  // Dreieck mit flacher Normale; nach außen gedreht (weg von der Achse cx, cy, cz)
  tri(a, b, c, col, haze, glow, cx, cy, cz, colB, colC) {
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    let vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (a[0] + b[0] + c[0]) / 3 - cx, my = (a[1] + b[1] + c[1]) / 3 - cy, mz = (a[2] + b[2] + c[2]) / 3 - cz;
    if (nx * mx + ny * my + nz * mz < 0) {
      [b, c] = [c, b];
      [colB, colC] = [colC, colB];
      nx = -nx; ny = -ny; nz = -nz;
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    this.v(a[0], a[1], a[2], nx, ny, nz, col, haze, glow);
    this.v(b[0], b[1], b[2], nx, ny, nz, colB || col, haze, glow);
    this.v(c[0], c[1], c[2], nx, ny, nz, colC || col, haze, glow);
  }
  mesh(mat) {
    if (!this.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aHaze', new THREE.Float32BufferAttribute(this.h, 1));
    g.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.g, 1));
    g.setAttribute('aFern', new THREE.Float32BufferAttribute(this.f, 1));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.matrixAutoUpdate = false;
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  }
}

// Höhe der Fläche im Ring (Gelände oder Flüssigkeit)
function rand3SurfH(A, x, z, d) {
  if (!A.void) return rand3LandH(A, x, z, d) - 0.12;
  if (A.void === 'wolken') return A.level + r3sm((d - 14) / 16) * 1.5 * r3fbm(x * 0.06, z * 0.06, 15) - 0.1;
  return A.level;
}

// Gitterstreifen: Spalten c0..c1 (Indizes in cols, in Schritten von cs), Reihen rows; interp: Ecken der letzten
// Reihe zwischen den Fernspalten gerade überbrücken (sonst Spalten zum gröberen Fernring)
function rand3Strip(buf, H, cols, idx, rows, interp) {
  const last = RAND3.lastD;
  const P = [];
  const tmp = {};
  for (let r = 0; r < rows.length; r++) {
    const d = rows[r];
    const row = [];
    for (const ci of idx) {
      const c = cols[ci % cols.length];
      const x = c.x + c.nx * d;
      const z = c.z + c.nz * d;
      const A = rand3Art(H, c.side >= 0 ? c.side : rand3Side(H, x, z));
      const y = rand3SurfH(A, x, z, d);
      const col = rand3Col(A, x, z, d, y, tmp);
      // Normale aus dem Verlauf der Fläche
      const e = 1.2;
      const hx = rand3SurfH(A, x + e, z, d) - rand3SurfH(A, x - e, z, d);
      const hz = rand3SurfH(A, x, z + e, d) - rand3SurfH(A, x, z - e, d);
      const l = Math.hypot(hx, 2 * e, hz);
      row.push({ x, y, z, nx: -hx / l, ny: 2 * e / l, nz: -hz / l, c: { r: col.r, g: col.g, b: col.b }, glow: col.glow, haze: rand3Haze(d, last), far: c.far, fern: rand3Fern(d) });
    }
    P.push(row);
  }
  if (interp) {
    // letzte Reihe: Ecken zwischen zwei Fernspalten auf deren Verbindung legen (keine Risse zum Fernring)
    const row = P[P.length - 1];
    let a = 0;
    for (let i = 1; i < row.length; i++) {
      if (!row[i].far) continue;
      for (let j = a + 1; j < i; j++) {
        const t = (j - a) / (i - a);
        const A = row[a];
        const B = row[i];
        const q = row[j];
        q.y = A.y + (B.y - A.y) * t;
        q.c = { r: A.c.r + (B.c.r - A.c.r) * t, g: A.c.g + (B.c.g - A.c.g) * t, b: A.c.b + (B.c.b - A.c.b) * t };
        q.haze = A.haze + (B.haze - A.haze) * t;
      }
      a = i;
    }
  }
  for (let r = 0; r + 1 < P.length; r++) {
    for (let i = 0; i + 1 < P[r].length; i++) {
      const A = P[r][i];
      const B = P[r][i + 1];
      const C = P[r + 1][i];
      const D = P[r + 1][i + 1];
      for (const q of [A, B, C, B, D, C]) {
        buf.F = q.fern;
        buf.v(q.x, q.y, q.z, q.nx, q.ny, q.nz, q.c, q.haze, q.glow);
      }
    }
  }
}

// --- Streuteile: einfache Körper mit flachen Flächen, Farben je Ecke ---
const _p3 = (x, y, z) => [x, y, z];
// Kegelstumpf (r1 = 0: Kegel) um die Achse durch (x, y, z) nach oben, Seiten seg, optional Deckel
function r3frustum(buf, x, y, z, r0, r1, h, seg, col0, col1, haze, glow, rot, cap) {
  const top = y + h;
  const cy = y + h * 0.5;
  for (let i = 0; i < seg; i++) {
    const a0 = rot + (i / seg) * Math.PI * 2;
    const a1 = rot + ((i + 1) / seg) * Math.PI * 2;
    const b0 = _p3(x + Math.cos(a0) * r0, y, z + Math.sin(a0) * r0);
    const b1 = _p3(x + Math.cos(a1) * r0, y, z + Math.sin(a1) * r0);
    if (r1 <= 0.001) {
      buf.tri(b0, b1, _p3(x, top, z), col0, haze, glow, x, cy, z, col0, col1);
      continue;
    }
    const t0 = _p3(x + Math.cos(a0) * r1, top, z + Math.sin(a0) * r1);
    const t1 = _p3(x + Math.cos(a1) * r1, top, z + Math.sin(a1) * r1);
    buf.tri(b0, b1, t0, col0, haze, glow, x, cy, z, col0, col1);
    buf.tri(b1, t1, t0, col0, haze, glow, x, cy, z, col1, col1);
    if (cap) buf.tri(t0, t1, _p3(x, top, z), cap, haze, cap.glow || glow, x, top - 1, z);
  }
}
// Doppelpyramide (Krone, Fels, Kristall): Mitte (x, y, z), Halbachsen rx/ry/rz
function r3bipyr(buf, x, y, z, rx, ry, rz, seg, col, colTop, haze, glow, rot, yLow) {
  const top = _p3(x, y + ry, z);
  const bot = _p3(x, y - (yLow != null ? yLow : ry), z);
  for (let i = 0; i < seg; i++) {
    const a0 = rot + (i / seg) * Math.PI * 2;
    const a1 = rot + ((i + 1) / seg) * Math.PI * 2;
    const p0 = _p3(x + Math.cos(a0) * rx, y, z + Math.sin(a0) * rz);
    const p1 = _p3(x + Math.cos(a1) * rx, y, z + Math.sin(a1) * rz);
    buf.tri(p0, p1, top, col, haze, glow, x, y, z, col, colTop);
    buf.tri(p0, p1, bot, col, haze, glow, x, y, z, col, col);
  }
}
// gekippter dünner Kegel (Äste)
function r3spike(buf, x, y, z, len, r, ax, az, col, haze) {
  const tx = x + ax * len;
  const tz = z + az * len;
  const ty = y + len * Math.sqrt(Math.max(0.05, 1 - ax * ax - az * az));
  for (let i = 0; i < 3; i++) {
    const a0 = (i / 3) * Math.PI * 2;
    const a1 = ((i + 1) / 3) * Math.PI * 2;
    buf.tri(_p3(x + Math.cos(a0) * r, y, z + Math.sin(a0) * r), _p3(x + Math.cos(a1) * r, y, z + Math.sin(a1) * r), _p3(tx, ty, tz), col, haze, 0, x, y + len * 0.3, z);
  }
}

const _r3a = new THREE.Color();
const _r3b = new THREE.Color();
const _r3t = new THREE.Color();
// Farbe aus der Liste, leicht abgewandelt
function r3pick(list, h, k = 0) {
  _r3a.set(list[Math.floor(h * list.length) % list.length]);
  return _r3a.multiplyScalar(0.92 + ((h * 97.3) % 1) * 0.16);
}
// ein Streuteil der Art t an (x, z), Boden y, Größe s
function rand3Teil(buf, t, x, y, z, s, cols, haze, h, A) {
  const rot = h * 6.28;
  const c0 = r3pick(cols, h).clone();
  if (t === 'tanne') {
    const top = _r3t.copy(c0).multiplyScalar(1.3);
    r3frustum(buf, x, y - 0.2, z, 0.12 * s, 0.08 * s, 0.4 * s, 4, r3col('#4a3424'), r3col('#4a3424'), haze, 0, rot);
    r3frustum(buf, x, y + 0.25 * s, z, 0.5 * s, 0, 1.05 * s, 6, c0, top, haze, 0, rot);
    r3frustum(buf, x, y + 0.75 * s, z, 0.36 * s, 0, 0.95 * s, 6, c0, top, haze, 0, rot + 0.5);
  } else if (t === 'baum' || t === 'weide') {
    const top = _r3t.copy(c0).multiplyScalar(1.28);
    r3frustum(buf, x, y - 0.2, z, 0.12 * s, 0.07 * s, 0.85 * s, 4, r3col('#4a3424'), r3col('#5a4430'), haze, 0, rot);
    if (t === 'weide') r3bipyr(buf, x, y + 1.0 * s, z, 0.62 * s, 0.32 * s, 0.6 * s, 6, c0, top, haze, 0, rot, 0.75 * s);
    else {
      r3bipyr(buf, x, y + 1.05 * s, z, 0.62 * s, 0.5 * s, 0.58 * s, 6, c0, top, haze, 0, rot);
      if (h > 0.4) r3bipyr(buf, x + 0.3 * s, y + 0.8 * s, z + 0.15 * s, 0.4 * s, 0.34 * s, 0.4 * s, 5, c0, top, haze, 0, rot + 1);
    }
  } else if (t === 'tot') {
    r3frustum(buf, x, y - 0.2, z, 0.1 * s, 0.02 * s, 1.4 * s, 4, c0, c0, haze, 0, rot);
    r3spike(buf, x, y + 0.6 * s, z, 0.55 * s, 0.04 * s, Math.cos(rot) * 0.7, Math.sin(rot) * 0.7, c0, haze);
    r3spike(buf, x, y + 0.9 * s, z, 0.4 * s, 0.03 * s, -Math.cos(rot + 0.6) * 0.7, -Math.sin(rot + 0.6) * 0.7, c0, haze);
  } else if (t === 'nadel') {
    const top = _r3t.set(cols[cols.length - 1]);
    r3frustum(buf, x, y - 0.4, z, 0.45 * s, 0.12 * s, 1.5 * s, 5, c0, top, haze, 0, rot, top);
    r3frustum(buf, x, y + 1.1 * s - 0.4, z, 0.14 * s, 0, 0.5 * s, 5, top, top, haze, 0, rot);
  } else if (t === 'tafel') {
    // Tafelberg: zwei Schichten, oben flach
    const band = _r3b.set(cols[(Math.floor(h * 4) + 1) % cols.length]).clone();
    const top = r3col(cols[cols.length - 1]);
    r3frustum(buf, x, y - 0.5, z, 1.0 * s, 0.86 * s, 0.6 * s, 7, c0, band, haze, 0, rot);
    r3frustum(buf, x, y + 0.1 * s - 0.5, z, 0.86 * s, 0.72 * s, 0.45 * s, 7, band, c0, haze, 0, rot, top);
  } else if (t === 'saeule') {
    const n = 2 + Math.floor(h * 3);
    for (let k = 0; k < n; k++) {
      const a = rot + k * 2.1;
      const hh = s * (1.6 - k * 0.3) * (0.8 + ((h * 31 + k) % 1) * 0.4);
      r3frustum(buf, x + Math.cos(a) * 0.4 * s * (k > 0), y - 0.3, z + Math.sin(a) * 0.4 * s * (k > 0), 0.28 * s, 0.28 * s, hh, 6, c0, c0, haze, 0, a, r3col(cols[cols.length - 1]));
    }
  } else if (t === 'gipfel') {
    // Berg aus dem Wolkenmeer: Fels unten, Schneekappe oben
    const snow = r3col(cols[cols.length - 1]);
    const rock2 = _r3b.set(cols[1]).clone();
    const H0 = 1.6 * s;
    r3frustum(buf, x, y - 1, z, 1.0 * s, 0.42 * s, H0 * 0.58 + 1, 7, c0, rock2, haze, 0, rot);
    r3frustum(buf, x, y + H0 * 0.58, z, 0.42 * s, 0, H0 * 0.5, 7, snow, snow, haze, 0, rot);
    if (h > 0.5) r3frustum(buf, x + 0.7 * s, y - 1, z + 0.3 * s, 0.6 * s, 0, H0 * 0.7, 6, c0, snow, haze, 0, rot + 1);
  } else if (t === 'vulkan') {
    const glow = r3col(cols[2]);
    glow.glow = 1;
    r3frustum(buf, x, y - 1, z, 1.0 * s, 0.22 * s, 0.75 * s, 8, c0, r3col(cols[1]), haze, 0, rot, glow);
  } else if (t === 'seefels') {
    // Felsnadel im Meer mit Gischt am Fuß
    const top = r3col(cols[cols.length - 1]);
    r3frustum(buf, x, y - 0.3, z, 0.55 * s, 0.32 * s, 1.5 * s, 6, c0, top, haze, 0, rot, top);
    const g = r3col(A.c.gischt);
    for (let i = 0; i < 7; i++) {
      const a0 = rot + (i / 7) * Math.PI * 2;
      const a1 = rot + ((i + 1) / 7) * Math.PI * 2;
      const r0 = 0.5 * s;
      const r1 = 0.95 * s * (0.9 + 0.2 * Math.sin(i * 2.3 + h * 9));
      buf.tri(_p3(x + Math.cos(a0) * r0, y + 0.06, z + Math.sin(a0) * r0), _p3(x + Math.cos(a1) * r0, y + 0.06, z + Math.sin(a1) * r0), _p3(x + Math.cos(a0) * r1, y + 0.03, z + Math.sin(a0) * r1), g, haze, 0.35, x, y - 5, z);
      buf.tri(_p3(x + Math.cos(a1) * r0, y + 0.06, z + Math.sin(a1) * r0), _p3(x + Math.cos(a1) * r1, y + 0.03, z + Math.sin(a1) * r1), _p3(x + Math.cos(a0) * r1, y + 0.03, z + Math.sin(a0) * r1), g, haze, 0.35, x, y - 5, z);
    }
  } else if (t === 'insel') {
    // Klippeninsel: breiter Fels mit flacher Kuppe, darauf ein, zwei tote Bäume
    const top = r3col(cols[1]);
    r3frustum(buf, x, y - 0.5, z, 1.0 * s, 0.7 * s, 0.55 * s, 8, c0, top, haze, 0, rot, top);
    r3bipyr(buf, x + 0.2 * s, y + 0.5 * s, z, 0.55 * s, 0.32 * s, 0.5 * s, 6, top, top, haze, 0, rot);
    r3spike(buf, x - 0.3 * s, y + 0.5 * s, z + 0.2 * s, 0.35 * s, 0.03 * s, 0.2, 0.1, r3col(cols[2]), haze);
  } else if (t === 'schwebe') {
    // schwebende Kristallinsel: Fels nach unten spitz, oben flach, darauf Kristalle
    const top = r3col(cols[1]);
    const cr = r3col(cols[2]);
    r3frustum(buf, x, y - 1.3 * s, z, 0, 0.75 * s, 1.3 * s, 7, c0, top, haze, 0, rot, top);
    r3bipyr(buf, x + 0.1 * s, y + 0.55 * s, z, 0.16 * s, 0.6 * s, 0.16 * s, 5, cr, r3col('#e8e4ff'), haze, 0.55, rot, 0.2 * s);
    r3bipyr(buf, x - 0.35 * s, y + 0.3 * s, z + 0.2 * s, 0.1 * s, 0.35 * s, 0.1 * s, 5, cr, r3col('#e8e4ff'), haze, 0.55, rot + 1, 0.1 * s);
  }
}

// Streuteile in einem Stück Rand zwischen den Spalten a und b (Indizes), deterministisch nach Ort
function rand3Teile(buf, H, cols, ia, ib, lowK) {
  const last = RAND3.lastD;
  for (let i = ia; i < ib; i++) {
    const c0 = cols[i % cols.length];
    const c1 = cols[(i + 1) % cols.length];
    const segLen = Math.max(1.5, Math.hypot(c1.x - c0.x, c1.z - c0.z));
    const side = c0.side >= 0 ? c0.side : c1.side >= 0 ? c1.side : rand3Side(H, c0.x + c0.nx * 20, c0.z + c0.nz * 20);
    const A = rand3Art(H, side);
    if (!A || !A.teile) continue;
    A.teile.forEach(([t, d0, d1, dens, s0, s1, list], k) => {
      // in den Ecken (Spalten mit gleichem Punkt) wächst die Fläche mit dem Abstand
      const width = c0.x === c1.x && c0.z === c1.z ? Math.hypot(c1.nx - c0.nx, c1.nz - c0.nz) * (d0 + d1) / 2 : segLen;
      const want = width * (d1 - d0) * dens / 100 * lowK;
      const seed = Math.floor(c0.x * 7 + c0.z * 13) + k * 101;
      let n = Math.floor(want);
      if (r3hash(seed, i, 31) < want - n) n++;
      for (let j = 0; j < n; j++) {
        const h1 = r3hash(seed, j, 41 + i);
        const h2 = r3hash(seed, j, 53 + i);
        const h3 = r3hash(seed, j, 67 + i);
        const u = h1;
        const d = d0 + (d1 - d0) * h2;
        const nx = c0.nx + (c1.nx - c0.nx) * u;
        const nz = c0.nz + (c1.nz - c0.nz) * u;
        const nl = Math.hypot(nx, nz) || 1;
        const x = c0.x + (c1.x - c0.x) * u + nx / nl * d;
        const z = c0.z + (c1.z - c0.z) * u + nz / nl * d;
        // weiter draußen größer (sonst verschwinden die Gipfel im Dunst)
        const s = (s0 + (s1 - s0) * h3) * (1 + Math.max(0, d - 30) / 70);
        // Bäume und Tannen in Hainen auf den Waldflecken (dazwischen bleiben Wiesen und Hänge frei)
        if ((t === 'baum' || t === 'tanne') && A.wald && A.wald[0] < 1 && rand3Wald(A, x, z, d) < 0.45) continue;
        let y = A.void ? (A.void === 'wolken' ? A.level - 0.2 : A.level) : rand3LandH(A, x, z, d);
        if (t === 'schwebe') y = A.level + 1 + h3 * 4 + d * 0.03;
        // nur große Teile (Gipfel, Vulkane, Tafelberge, Inseln) scheinen durch den Nebel – Bäume nicht (sie schwebten sonst)
        buf.F = RAND3_GROSS.has(t) ? rand3Fern(d) : 0;
        rand3Teil(buf, t, x, y, z, s, list, Math.min(0.97, rand3Haze(d, last) * 0.95), h3, A);
      }
    });
  }
}

// Nebelbänke entlang des Rands
function rand3Nebel(H, cols) {
  const pos = [];
  const cor = [];
  const size = [];
  const alpha = [];
  let col = null;
  const Q = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < cols.length; i++) {
    const c0 = cols[i];
    const c1 = cols[(i + 1) % cols.length];
    const len = Math.hypot(c1.x - c0.x, c1.z - c0.z);
    if (len < 0.5) continue;
    const A = rand3Art(H, c0.side >= 0 ? c0.side : 0);
    const N = A && A.nebel;
    if (!N) continue;
    if (!col) col = N.c;
    const want = len * N.n / 10;
    let n = Math.floor(want);
    const seed = Math.floor(c0.x * 3 + c0.z * 5);
    if (r3hash(seed, i, 71) < want - n) n++;
    const [dA, dB] = N.d || [1, 12];
    for (let j = 0; j < n; j++) {
      const u = r3hash(seed, j, 73);
      const d = dA + (dB - dA) * r3hash(seed, j, 79);
      const x = c0.x + (c1.x - c0.x) * u + c0.nx * d;
      const z = c0.z + (c1.z - c0.z) * u + c0.nz * d;
      const r = N.r[0] + (N.r[1] - N.r[0]) * r3hash(seed, j, 83);
      const g = A.void ? A.level : rand3LandH(A, x, z, d);
      const y = Math.max(g, 0) + N.h[0] + (N.h[1] - N.h[0]) * r3hash(seed, j, 89) + r * 0.25;
      const sd = r3hash(seed, j, 97);
      for (const [qx, qy] of Q) {
        pos.push(x, y, z);
        cor.push(qx, qy, sd);
        size.push(r);
        alpha.push(N.a * (0.7 + 0.3 * sd));
      }
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aCorner', new THREE.Float32BufferAttribute(cor, 3));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  g.setAttribute('aAlpha', new THREE.Float32BufferAttribute(alpha, 1));
  g.computeBoundingSphere();
  // die Billboards sind größer als ihre Mittelpunkte
  g.boundingSphere.radius += 14;
  const m = new THREE.Mesh(g, rand3MistMat());
  m.matrixAutoUpdate = false;
  m.renderOrder = 5;
  m.frustumCulled = false;
  m.userData.col = col;
  return m;
}

function rand3Clear() {
  const G = RAND3.group;
  if (!G) return;
  for (const m of G.children) m.geometry.dispose();
  G.clear();
  RAND3.mist = null;
  RAND3.tris = 0;
}

// ganzen Ring für die Map H bauen (beim Wechsel der Map oder der Grafikstufe)
function rand3Build(H) {
  if (!RAND3.group) {
    RAND3.group = new THREE.Group();
    RAND3.group.name = 'kartenrand';
    V3.scene.add(RAND3.group);
  }
  rand3Clear();
  if (!H || H.dungeon) return;
  const gfx = opts.graphics;
  const low = gfx === 'niedrig';
  const R = low ? RAND3_ROWS.grob : gfx === 'mittel' ? RAND3_ROWS.mittel : RAND3_ROWS.fein;
  RAND3.lastD = R.far[R.far.length - 1];
  const cols = rand3Columns(H, R);
  const mat = rand3Mat();
  const lowK = low ? 0 : gfx === 'mittel' ? 0.55 : 1;
  // Abschnitte von etwa 16 Spalten, Grenzen auf Fernspalten
  const cuts = [0];
  for (let i = 1; i < cols.length; i++) if (cols[i].far && i - cuts[cuts.length - 1] >= 15) cuts.push(i);
  cuts.push(cols.length);
  for (let s = 0; s + 1 < cuts.length; s++) {
    const a = cuts[s];
    const b = cuts[s + 1];
    const buf = new Rand3Buf();
    const idx = [];
    for (let i = a; i <= b; i++) idx.push(i);
    rand3Strip(buf, H, cols, idx, R.near, true);
    rand3Strip(buf, H, cols, idx.filter((i) => cols[i % cols.length].far), R.far, false);
    if (lowK) rand3Teile(buf, H, cols, a, b, lowK);
    const m = buf.mesh(mat);
    if (m) {
      RAND3.group.add(m);
      RAND3.tris += buf.p.length / 9;
    }
  }
  if (!low) {
    RAND3.mist = rand3Nebel(H, cols);
    if (RAND3.mist) {
      RAND3.group.add(RAND3.mist);
      RAND3.mistMat.uniforms.uColor.value.set(RAND3.mist.userData.col);
      RAND3.mistCol = new THREE.Color(RAND3.mist.userData.col);
    }
  }
}

// jedes Bild (aus v3SyncBounds, drei-fx.js): Ring zur Map bauen, Nebel nachführen; true = Ring steht (alter Horizont aus)
function rand3Frame() {
  const H = V3.home && !V3.home.dungeon ? V3.home : null;
  const key = H ? H.key + ':' + opts.graphics + ':' + (H.voidG != null ? H.voidG : '') : '';
  if (key !== RAND3.key) {
    RAND3.key = key;
    rand3Build(H);
  }
  if (!RAND3.group) return false;
  RAND3.group.visible = !!H;
  if (RAND3.mist && RAND3.mistMat) {
    const u = RAND3.mistMat.uniforms;
    const fog = V3.scene.fog;
    u.uTime.value = V3.time || 0;
    u.uFogColor.value.copy(fog.color);
    u.uFogNear.value = fog.near;
    u.uFogFar.value = fog.far;
    // nachts dunkler, zur Himmelsfarbe hin
    u.uColor.value.copy(RAND3.mistCol).lerp(fog.color, 0.25 + 0.5 * (V3.nightK || 0));
  }
  return !!H;
}

// --- Randkulisse von Kazehana: Waldrand aus Laubbäumen statt einer geschlossenen Blütenhecke ---
// (KUL3_FORM.hecke aus drei-welt.js; Höhe hw bleibt, damit die Sichtlinie im Süden gleich gerechnet wird)
if (typeof KUL3_FORM !== 'undefined') {
  // Laubbaum aus Stamm und drei Kronenkugeln (near: rundere Kugeln für den vorderen Baum) – zusammen so viele Dreiecke
  // wie das alte Heckenstück
  const baum3 = (b, T, x, z, s, crown, top, near) => {
    b.add(lathe3('kulbaum', [[0.2, 0], [0.13, 1.4], [0.09, 2.4], [0, 2.5]], 5), T('#5a4030'), { p: [x, 0, z], s: [s, s, s], shade: 0.3 });
    [[0, 2.75, 0, 1.05], [-0.55, 2.2, 0.15, 0.78], [0.55, 2.3, -0.1, 0.8]]
      .forEach(([cx, cy, cz, r], k) => b.add(kulBlob3(near), T(crown[k % crown.length]), { p: [x + cx * s, cy * s, z + cz * s], s: [r * s * 1.05, r * s * 0.9, r * s], top: T(top), topK: 0.45, shade: 0.3 }));
  };
  KUL3_FORM.hecke.wand = function (b, v, T, alt) {
    const m = v === 1 ? -1 : 1;
    const green = [['#2f6229', '#3d7633', '#4a8a3c'], ['#356c2e', '#2f6229', '#5a9a46'], ['#3d7633', '#4a8a3c', '#2f6229']][v];
    if (alt) baum3(b, T, -0.35 * m, 0, 1.25, ['#d07896', '#e08aa6', '#f5b8cb'], '#ffdce6', true);
    else baum3(b, T, -0.4 * m, 0, 1.25 + v * 0.08, green, '#86c262', true);
    baum3(b, T, 0.75 * m, 0.4, 0.82 - v * 0.06, green.slice().reverse(), '#7ab45a');
  };
  KUL3_FORM.hecke.fern = function (b, v, T) {
    const green = ['#2a5a26', '#356c30', v === 2 ? '#e08aa6' : '#4e8c40'];
    baum3(b, T, -0.3, 0, 1.4, green, v === 2 ? '#f5b8cb' : '#7ab45a');
    baum3(b, T, 0.8, 0.3, 1.0, green.slice().reverse(), '#7ab45a');
  };
}

// Randkulisse (kulisse3, drei-welt.js) je Art: Größe der Wand- und Fernstücke, äußerste Reihe der Fernstücke, Anteil
// der Wandstücke ab der zweiten Reihe, die stehen bleiben (und auf dem Rand selbst). 0 = Stück weglassen. Art ohne Eintrag: wie bisher
const RAND3_NAH = {
  huegel: [0.74, 0.82, 10, 0.85], huegelNacht: [0.74, 0.82, 10, 0.85], hochwald: [0.95, 1, 12, 1], aschewald: [0.95, 1, 12, 1],
  tafelberge: [0.7, 0.75, 8, 0.6], knochenduenen: [0.65, 0.7, 8, 0.6], dschungel: [0.9, 0.95, 12, 1], schneeberge: [0.85, 0.9, 12, 0.9],
  moor: [0.8, 0.8, 10, 0.8], schwarzmoor: [0.8, 0.8, 10, 0.8], vulkan: [0.55, 0.7, 8, 0.4, 0.75], grate: [0.55, 0.7, 8, 0.4, 0.75],
  grateGrau: [0.55, 0.7, 8, 0.4, 0.75], grateNacht: [0.55, 0.7, 8, 0.4, 0.75], blutsteppe: [0.7, 0.75, 8, 0.6]
};
function rand3Nah(H, side, part, r, h) {
  const A = rand3Art(H, side);
  const N = A && RAND3_NAH[A.id];
  if (!N) return 1;
  if (part === 'fern') return r > N[2] ? 0 : N[1];
  // Wand auf dem Rand (r = 3) bleibt geschlossen (Grate, Vulkan: mit Lücken, N[4]), die zweite Reihe wird lichter
  const keep = r > 3 ? N[3] : N[4] != null ? N[4] : 1;
  if (((h >>> 11) % 100) / 100 >= keep) return 0;
  return N[0];
}
