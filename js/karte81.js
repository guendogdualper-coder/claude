// Map 17: Seelenhain – eine ruhige gemeinsame Karte für Stufe 80 zum Seelenstein-Farmen.
// Die Daten stehen wie bei allen Maps in den Datendateien (daten/zonen.js: Map und Gebiete mit sehr wenigen Monstern
// und sehr vielen Seelensteinen der Stufen 70, 75 und 80; daten/kartenformen.js: das Lager Seelenwacht „Mondweiher“;
// daten/nachtmonster.js; welt.js: Leute, Stadtschmuck, Teleportstein-Farbe; stadtschmuck.js; kartenrand.js). Stadt,
// Leute, Stände, Mauer, Weltentor, Wanderer, Steine und Monster entstehen über dieselben Wege wie auf jeder anderen
// Map. Die Karte hat (noch) keinen Dungeon, keine Instanz und keinen Endboss.
// Hier steht nur, was die Gegend aussehen lässt wie einen stillen, mondhellen Hain – ohne neue Böden und ohne neue
// 3D-Modelle, alles als Ergänzung der bestehenden Tabellen:
//   - Vorlage (like in daten/zonen.js) sind die Dämmerwiesen um Mondfall: Boden NACHTGRAS/NACHTMOOS, Bäume, Büsche und
//     Pilze der Dämmerwiesen (schattenwelt.js) – die Gebiets-Ids des Hains werden auf deren Aussehen abgebildet
//   - eigene Stimmung in 3D (kühles, silbrig-blaues Mondlicht statt Violett), eigene Felsfarben, schwebende
//     Seelenlichter, ruhige Musik, Randkulisse aus den Laubbäumen von Kazehana in Nachtblau, in 2D nachtblaue Kronen
// Keine Bodenringe, Runen oder Sterne als Schmuck.

const K81_STYLES = new Set(['seelenwacht', 'seelenhain']);
// Gebiet, dessen Bäume der Hain übernimmt (schattenwelt.js, TREE_COLS)
const K81_LIKE = 'daemmerwiesen';

// Schwebende Seelenlichter: wenige, langsame, blasse Lichtpunkte, die aufsteigen (umgebung.js, AMBIENT)
if (typeof AMBIENT !== 'undefined') {
  AMBIENT.seelenlicht = { rate: 4, o: { color: ['#cfe4ff', '#eef4ff', '#9fd0ff'], angle: -Math.PI / 2, spread: 0.8, speed: [5, 13], life: [3.5, 6], size: [1.4, 2.6], drag: 0.35, gravity: -1 } };
}

// --- Stimmung in 3D: kühles, silbrig-blaues Mondlicht; der Nebel beginnt etwas früher als auf offenen Karten ----
if (typeof MOOD3 !== 'undefined') {
  Object.assign(MOOD3, {
    seelenwacht: { sky: '#7890bc', sun: '#e8f1ff', sunI: 0.94, hemi: '#d8e6fb', ground: '#2e4260', hemiI: 0.7 },
    seelenhain: { sky: '#627cac', sun: '#e0edff', sunI: 0.92, hemi: '#cddef7', ground: '#283e5c', hemiI: 0.69, near: 26, far: 60 }
  });
}
// Musik: ruhig wie in den Dämmerwiesen (eigene Kompositionen des Spiels, musik.js)
if (typeof music !== 'undefined' && music.moodAt) {
  const baseMood = music.moodAt;
  music.moodAt = function (x, y) {
    const z = zoneAt(x, y);
    if (z && z.id === 'seelenhain') return 'wald';
    return baseMood.call(this, x, y);
  };
}

// --- Felsen, Bodenschmuck, Bäume --------------------------------------------------------------------------------
if (typeof ROCK_STYLES !== 'undefined') {
  ROCK_STYLES.seelenwacht = ['#5e6a86', '#8694b0', null];
  ROCK_STYLES.seelenhain = ['#55617c', '#7c8aa6', '#3c5674'];
}
if (typeof DECO_COLORS !== 'undefined') {
  // Büsche, Pilze und Stümpfe der Dämmerwiesen, die Beeren und Pilzhüte silberblau statt violett
  const k = { ...(DECO_COLORS[K81_LIKE] || {}), bush: '#27405c', bushTop: '#4a7090', berry: '#dce8ff', moss: '#3c5674', cap: '#9fc8ff', capDot: '#f0f6ff', capGlow: true, tuft: '#2e5a5e' };
  DECO_COLORS.seelenhain = k;
  DECO_COLORS.seelenwacht = k;
}
if (typeof WORLD3 !== 'undefined') {
  // Laubbäume: die der Dämmerwiesen (nachtblaue Kronen mit Mondfrüchten) – dasselbe Modell, nur unter eigener Gebiets-Id
  if (typeof TREE3_STYLED !== 'undefined') for (const id of K81_STYLES) TREE3_STYLED.add(id);
  const baseTree = WORLD3.tree;
  WORLD3.tree = function (b, M, v, style) {
    return baseTree.call(this, b, M, v, K81_STYLES.has(style) ? K81_LIKE : style);
  };
}
// 2D: derselbe Laubbaum wie überall (umgebung.js, TREE_ART.tree), Krone und Stamm in den Nachtfarben der 3D-Bäume
if (typeof TREE_ART !== 'undefined' && typeof TREE_BLOBS !== 'undefined') {
  const baseTree2 = TREE_ART.tree;
  TREE_ART.tree = function (ctx, v, style) {
    if (!K81_STYLES.has(style)) return baseTree2.call(this, ctx, v, style);
    poly(ctx, [[-4, 0], [-3, -20], [3, -20], [4, 0], [7, 1.5], [-7, 1.5]], '#3a3040');
    stroke(ctx, '#261e2c', 0.8, [[-1, -3], [-1.5, -14]]);
    crown(ctx, TREE_BLOBS[v], ['#1c2748', '#2f3f72', '#4f5a9c', '#a9b4ee']);
  };
}

// --- Randkulisse: die Laubbäume der Hecke von Kazehana (KUL3_FORM.hecke), umgefärbt in Nachtblau ------------------
// keine neue Form: Wand, Ferne und Büsche werden von der Hecke gebaut, nur ihre Farben laufen durch k81Nacht
const k81Nacht = (hex) => (typeof hex === 'string' ? mixColor(hex, '#27406a', 0.74) : hex);
if (typeof KUL3_FORM !== 'undefined' && typeof BORDER3 !== 'undefined' && KUL3_FORM.hecke) {
  KUL3_FORM.seelenhecke = {
    hw: KUL3_FORM.hecke.hw, hf: KUL3_FORM.hecke.hf,
    wand(b, v, T) {
      KUL3_FORM.hecke.wand(b, v, (hex) => T(k81Nacht(hex)), false);
    },
    fern(b, v, T) {
      // v === 2 hätte eine rosa Blütenkrone: im Hain blüht nichts
      KUL3_FORM.hecke.fern(b, v === 2 ? 0 : v, (hex) => T(k81Nacht(hex)));
    },
    busch(b, v) {
      const nb = { add: (g, c, o) => b.add(g, k81Nacht(c), o) };
      KUL3_FORM.hecke.busch(nb, v || 1);
    }
  };
  for (const id of K81_STYLES) BORDER3[id] = { id, form: 'seelenhecke', saum: [['tree', id, 1.15]], far: '#2a4068' };
}

// --- Monster: die Arten des Leerenschlunds behalten ihr Kristall-Thema (drei-figuren.js) --------------------------
if (typeof MON3_ZONE_THEME !== 'undefined') {
  MON3_ZONE_THEME.seelenhain = 'kristall';
  if (typeof mon3ThemeOf !== 'undefined' && mon3ThemeOf) mon3ThemeOf = null;
}
