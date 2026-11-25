'use strict';
// Angeln (seit 15.83, docs/angeln-kochen.md): an Gewässern mit einer Angel Fische fangen.
// - Angeln verkauft die Fischerin in jeder Stadt und in jedem Lager (die einfache Haselrute auch die Händlerin). Fünf
//   Stufen (ANGELN.ruten): je besser, desto schneller beißt es, desto breiter der grüne Bereich im Drill und desto öfter
//   Seltenes. Lava verlangt eine hitzefeste Schnur (ab der Glutfaserrute).
// - Ablauf: Taste K (frei belegbar), F am Wasser oder der Knopf „Angeln“ am Handy → Wurf ans Wasser vor der Figur →
//   Warten (die Pose zuckt manchmal) → Biss (Pose taucht ab, Spritzer, Glöckchen, am Handy kurzes Vibrieren) →
//   Anschlagen (antippen, solange „Anschlagen!“ leuchtet) → Drill: Gedrückt halten holt ein und spannt die Schnur,
//   Loslassen lässt nach. Die Marke muss im grünen Bereich bleiben, bis der Fang voll ist; zu straff reißt die Schnur,
//   zu locker schüttelt sich der Fisch ab. Laufen, Angreifen oder ein Treffer holen die Angel ein.
// - Was anbeißt, hängt vom Gewässer am Ziel ab (AN_POOLS nach Bodenart und Karte), dazu Seltenheit, Angel und
//   Angelstufe; manche Arten nur nachts. Selten hängt Plunder oder ein kleiner Schatz am Haken (Flaschenpost,
//   Schatzkästchen – gleich geöffnet –, Perle, Feueropal).
// - Angelstufe 1–100 steigt mit jedem Fang (Erfahrung je Seltenheit, neue Arten extra) und verbessert die Chancen.
// - Fische, Perlen, Feueropale, Plunder (und Zutaten und Gerichte aus kochen.js) liegen als Stapel in der Tasche unter
//   „Vorräte“ (p.fang: { id: Anzahl }), lassen sich bei Händlern verkaufen und wie Tränke und Material per Post und im
//   Auktionshaus handeln (Ware { t: 'fang', id, n }, geprüft mit fangWareClean: nur Kennungen aus FANG, Anzahl 1–9999).
// - Mitspieler sehen Angel, Schnur, Pose und Fang (Zustand „an“, netz.js; angenommen werden nur Werte aus den Tabellen).
// Spielstand: p.angeln = { rute: beste gekaufte Angel (-1: keine), xp, n: Fänge, arten: { id: Anzahl }, rek: { id:
// Rekord in 0,1 kg }, schatz, plunder }; p.fang = Vorrat.

// --- Grundwerte ---------------------------------------------------------------------------------------------------
const ANGELN = {
  // level: ab Charakterstufe · stufe: ab Angelstufe · biss: Wartezeit-Faktor · zone: breiterer grüner Bereich ·
  // selten: Faktor für seltene Fische · schatz: zusätzliche Schatzchance · lava: hitzefeste Schnur
  ruten: [
    { name: 'Haselrute', level: 1, stufe: 1, preis: 250, biss: 1, zone: 0, selten: 1, schatz: 0,
      griff: '#6a4a2e', rute: '#9a7444', ring: '#c8b090', spitze: '#e8402a', g3: '#6a4a2e', r3: '#8a6a3e' },
    { name: 'Bambusrute', level: 15, stufe: 8, preis: 3000, biss: 0.92, zone: 0.03, selten: 1.1, schatz: 0.003,
      griff: '#5a3a22', rute: '#d0b864', ring: '#e8dcb0', spitze: '#e8402a', g3: '#5a3a22', r3: '#c8b060', knoten: '#8a7a3a' },
    { name: 'Eschenrute mit Rolle', level: 35, stufe: 22, preis: 30000, biss: 0.85, zone: 0.06, selten: 1.2, schatz: 0.006,
      griff: '#3a2a1e', rute: '#6e4e30', ring: '#d8dee6', spitze: '#ffd34d', rolle: '#b8c0c8', g3: '#3a2a1e', r3: '#6e4e30' },
    { name: 'Glutfaserrute', level: 55, stufe: 40, preis: 200000, biss: 0.78, zone: 0.09, selten: 1.35, schatz: 0.01, lava: true,
      griff: '#2a1c18', rute: '#3a2a28', ring: '#ff8a3a', spitze: '#ffb04a', rolle: '#5a5058', glut: '#ff7a2a', g3: '#2a1c18', r3: '#3a2a28' },
    { name: 'Mondsilberrute', level: 75, stufe: 65, preis: 900000, biss: 0.7, zone: 0.12, selten: 1.5, schatz: 0.015, lava: true,
      griff: '#1e2440', rute: '#c8d4e8', ring: '#9fd8ff', spitze: '#e8f6ff', rolle: '#e8eef8', glut: '#9fd8ff', g3: '#1e2440', r3: '#c8d4e8' }
  ],
  wurf: { dauer: 0.62, los: 0.24, min: 1.6, max: 4.2 },
  warten: [5, 13],      // Sekunden bis zum Biss (vor Angel und Angelstufe)
  biss: 1.25,           // so lange lässt sich anschlagen (+0,08 je Angelstufe der Rute)
  stufeK: 0.7,          // Angelstufe = 1 + √(Erfahrung / stufeK), höchstens 100
  stapel: 9999,         // höchstens so viele je Ware (Post, Auktionshaus)
  kampf: 3              // so lange nach einem Kampf geht kein Wurf
};
const AN_MAX_STUFE = 100;
// Seltenheiten der Fische (Farben und Namen wie bei der Ausrüstung, RARITIES): Gewicht beim Würfeln, Erfahrung,
// Preisfaktor, ab Angelstufe, wie stark Angelstufe die Chance hebt (k)
const AN_RAR = [
  { w: 62, xp: 3, preis: 1, min: 0, k: 0 },
  { w: 26, xp: 5, preis: 2.5, min: 0, k: 0.6 },
  { w: 9, xp: 9, preis: 6, min: 3, k: 1.2 },
  { w: 2.6, xp: 16, preis: 15, min: 12, k: 1.8 },
  { w: 0.55, xp: 30, preis: 40, min: 20, k: 2.5 }
];
const AN_RAR_FARBE = ['#c8c8c8', '#4ccf5a', '#4a98ff', '#b06cff', '#ffb21a'];
const anRarName = (r) => (typeof RARITIES !== 'undefined' && RARITIES[r] ? RARITIES[r].name : ['Normal', 'Gewöhnlich', 'Selten', 'Episch', 'Legendär'][r] || '');

// Gewässer: Name, Stufe (Preis, Schätze), welche Bodenarten
const AN_POOLS = {
  see: { name: 'Seen und Bäche', lvl: 8 },
  warm: { name: 'Oasen und Dschungelflüsse', lvl: 35 },
  moor: { name: 'Moore und Schattenwasser', lvl: 50 },
  blut: { name: 'Blutsee', lvl: 35 },
  eis: { name: 'Eislöcher', lvl: 45 },
  lava: { name: 'Lava', lvl: 65 },
  seele: { name: 'Seelenhain', lvl: 80 },
  meer: { name: 'Meer der Nebelküste', lvl: 80 },
  himmel: { name: 'Himmelsterrassen', lvl: 80 }
};
// Wasser (WATER) je Karte; Moor, Lava, Blutsee und Eis gelten überall gleich
const AN_KARTE = { 1: 'see', 4: 'see', 11: 'see', 12: 'see', 2: 'warm', 13: 'warm', 5: 'warm', 3: 'warm', 6: 'warm', 9: 'warm',
  8: 'moor', 14: 'moor', 16: 'moor', 7: 'eis', 15: 'eis', 10: 'see', 17: 'seele', 18: 'meer', 19: 'himmel' };

// --- Alles, was im Vorrat liegen kann (Fische, Plunder, Schätze; Zutaten und Gerichte trägt kochen.js nach) ----------
// art: fisch | plunder | schatz (wird gleich geöffnet) | ware (Perle, Feueropal) | zutat | mahl
const FANG = {};
const FANG_ARTEN = new Set(['fisch', 'plunder', 'schatz', 'ware', 'zutat', 'mahl']);
const fangDef = (id) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(FANG, id) ? FANG[id] : null);
// [Kennung, Name, Gewässer, Seltenheit, Form, Farben [Körper, Rücken, Bauch, Flossen, Zeichnung], Muster, kg, Extra]
// Extra: nacht = nur nachts · nachtX = nachts so viel häufiger · min = ab Angelstufe
const AN_FISCHE = [
  ['rotauge', 'Rotauge', 'see', 0, 'normal', ['#c8d0d8', '#5a6a72', '#eef2f4', '#d84a3a', '#d83a2a'], 'auge', [0.1, 0.6]],
  ['flussbarsch', 'Flussbarsch', 'see', 0, 'normal', ['#9aa84a', '#4a5a2a', '#e8e0b0', '#e05a2a', '#2a3418'], 'streifen', [0.2, 1.2]],
  ['bachforelle', 'Bachforelle', 'see', 1, 'normal', ['#b0985a', '#6a5a3a', '#f0e4c4', '#a08a5a', '#d8402a'], 'punkte', [0.3, 2.5]],
  ['goldorfe', 'Goldorfe', 'see', 1, 'normal', ['#f0b040', '#c87a1a', '#fff0c0', '#f08a3a', '#ffd880'], 'glanz', [0.4, 2]],
  ['hecht', 'Hecht', 'see', 2, 'lang', ['#7a9a4a', '#3a5a2a', '#e8ecc8', '#8a7a3a', '#e8f0b0'], 'punkte', [1.5, 9]],
  ['mondwels', 'Mondwels', 'see', 3, 'wels', ['#3a4a7a', '#1a2440', '#9aa8d0', '#2a3460', '#cfe0ff'], 'glanz', [3, 15], { nacht: true }],
  ['kaiserkarpfen', 'Kaiserkarpfen', 'see', 4, 'hoch', ['#f4f0e8', '#e8e0d0', '#ffffff', '#f0a040', '#e8402a'], 'flecken', [5, 22], { min: 20 }],
  ['sandgrundel', 'Sandgrundel', 'warm', 0, 'normal', ['#d8c08a', '#a08a5a', '#f4ead0', '#c8a870', '#8a6a3a'], 'punkte', [0.1, 0.5]],
  ['oasenbarbe', 'Oasenbarbe', 'warm', 0, 'normal', ['#d8d0b0', '#9a8a5a', '#f8f4e8', '#e8b040', '#c89a3a'], 'glanz', [0.3, 1.8]],
  ['dschungelsalmler', 'Dschungelsalmler', 'warm', 1, 'normal', ['#3a8ad8', '#1a4a8a', '#e83a3a', '#5ad0e8', '#7ae8ff'], 'band', [0.05, 0.3]],
  ['panzerwels', 'Panzerwels', 'warm', 1, 'wels', ['#7a6a4a', '#4a3a2a', '#c8b89a', '#5a4a30', '#2a2018'], 'punkte', [0.5, 3]],
  ['speerhecht', 'Speerhecht', 'warm', 2, 'lang', ['#c8d0c0', '#6a7a6a', '#f4f6f0', '#8a9a7a', '#3a4a3a'], 'streifen', [2, 8]],
  ['schlangenkopf', 'Schlangenkopf', 'warm', 3, 'lang', ['#4a6a3a', '#2a3a20', '#c8d0a0', '#3a4a2a', '#e8c040'], 'flecken', [3, 12]],
  ['pharaonenbarsch', 'Pharaonenbarsch', 'warm', 4, 'hoch', ['#2ac0b0', '#1a7a8a', '#f0e8a0', '#e8b030', '#ffd860'], 'streifen', [4, 16], { min: 30 }],
  ['schlammpeitzger', 'Schlammpeitzger', 'moor', 0, 'aal', ['#7a6a4a', '#4a3a28', '#c8b88a', '#5a4a30', '#2a2010'], 'punkte', [0.1, 0.4]],
  ['moorschleie', 'Moorschleie', 'moor', 0, 'hoch', ['#4a6a3a', '#2a3a20', '#a0b070', '#3a5028', '#c8a03a'], 'glanz', [0.4, 2.5]],
  ['sumpfaal', 'Sumpfaal', 'moor', 1, 'aal', ['#4a5a3a', '#262e1c', '#8a9a6a', '#3a4428', '#a0b060'], '', [0.8, 4]],
  ['irrlichtbarsch', 'Irrlichtbarsch', 'moor', 2, 'normal', ['#c8d8c0', '#6a8a6a', '#f0f8ec', '#8ab08a', '#9aff8a'], 'leucht', [1, 5], { nachtX: 2 }],
  ['knochenhecht', 'Knochenhecht', 'moor', 3, 'lang', ['#e0d8c0', '#8a8270', '#f8f4e8', '#b0a888', '#5a5040'], 'adern', [3, 12]],
  ['moorkoenig', 'Moorkönig', 'moor', 4, 'wels', ['#2a3020', '#12160e', '#5a6a4a', '#1a2014', '#8aff6a'], 'leucht', [12, 40], { min: 40 }],
  ['blutsalmler', 'Blutsalmler', 'blut', 0, 'normal', ['#c83a3a', '#7a1a1a', '#f0a0a0', '#a02828', '#ffd0d0'], 'glanz', [0.05, 0.4]],
  ['karminbarsch', 'Karminbarsch', 'blut', 0, 'normal', ['#a8283a', '#5a1020', '#e88a8a', '#c83a4a', '#2a0810'], 'streifen', [0.3, 1.6]],
  ['blutpiranha', 'Blutpiranha', 'blut', 1, 'hoch', ['#8a8a92', '#4a4a52', '#e83a2a', '#6a6a72', '#ffffff'], 'zaehne', [0.4, 2]],
  ['aderaal', 'Aderaal', 'blut', 2, 'aal', ['#4a1820', '#2a0a10', '#8a3a40', '#3a1218', '#ff4a4a'], 'adern', [1, 6]],
  ['kraterwels', 'Kraterwels', 'blut', 3, 'wels', ['#5a2a2a', '#2e1414', '#a8706a', '#401c1c', '#ff8a6a'], 'punkte', [5, 20]],
  ['herzschuppe', 'Herzschuppenkarpfen', 'blut', 4, 'hoch', ['#d82a4a', '#8a1028', '#ffb0c0', '#ff5a7a', '#ffd8e0'], 'glanz', [6, 18], { min: 35 }],
  ['eisdorsch', 'Eisdorsch', 'eis', 0, 'normal', ['#a8b8c8', '#5a6a7a', '#e8f0f8', '#8a9aaa', '#2a3a4a'], 'punkte', [0.5, 3]],
  ['schneegrundel', 'Schneegrundel', 'eis', 0, 'normal', ['#e8f0f8', '#a8b8c8', '#ffffff', '#c8d8e8', '#8aa0b8'], '', [0.1, 0.4]],
  ['frostsaibling', 'Frostsaibling', 'eis', 1, 'normal', ['#6a8098', '#3a4a5a', '#f0a090', '#e86a5a', '#ffffff'], 'punkte', [0.6, 3]],
  ['kristallforelle', 'Kristallforelle', 'eis', 2, 'normal', ['#a8e0f8', '#5aa8d8', '#f0faff', '#c8f0ff', '#ffffff'], 'glanz', [1, 5]],
  ['gletscherstoer', 'Gletscherstör', 'eis', 3, 'lang', ['#8a98a8', '#4a5868', '#d8e0e8', '#6a7888', '#f0f4f8'], 'platten', [8, 35]],
  ['nordlichtlachs', 'Nordlichtlachs', 'eis', 4, 'normal', ['#3ad8a0', '#2a5aa8', '#e0fff0', '#a070f0', '#8affc8'], 'leucht', [4, 14], { nacht: true, min: 45 }],
  ['aschgrundel', 'Aschgrundel', 'lava', 0, 'normal', ['#4a4440', '#2a2624', '#8a7a70', '#3a3430', '#ff7a2a'], 'adern', [0.2, 1]],
  ['glutbarsch', 'Glutbarsch', 'lava', 1, 'normal', ['#e8602a', '#a02a10', '#ffd060', '#ff8a2a', '#ffe8a0'], 'streifen', [0.5, 3]],
  ['magmaaal', 'Magmaaal', 'lava', 2, 'aal', ['#2a1a16', '#120a08', '#5a3020', '#3a2018', '#ff6a1a'], 'adern', [2, 8]],
  ['obsidianwels', 'Obsidianwels', 'lava', 3, 'wels', ['#1e1a24', '#0a080e', '#4a4250', '#2a2430', '#ff8a3a'], 'glanz', [6, 25]],
  ['flammenkarpfen', 'Flammenkarpfen', 'lava', 4, 'hoch', ['#ffb02a', '#e8401a', '#fff0a0', '#ff6a1a', '#ffffff'], 'leucht', [5, 20], { min: 55 }],
  ['daemmerbarbe', 'Dämmerbarbe', 'seele', 0, 'normal', ['#8a90b8', '#4a4e78', '#d8daf0', '#6a70a0', '#c8ccff'], 'glanz', [0.4, 2]],
  ['seelenkoi', 'Seelenkoi', 'seele', 1, 'hoch', ['#f0f4ff', '#d0d8f0', '#ffffff', '#a8c0ff', '#7aa0ff'], 'flecken', [1, 6]],
  ['geisterlachs', 'Geisterlachs', 'seele', 1, 'normal', ['#c8e0e8', '#7aa0b0', '#f0fafc', '#a8d0e0', '#e8ffff'], 'leucht', [1.5, 7]],
  ['schimmerforelle', 'Schimmerforelle', 'seele', 2, 'normal', ['#b8a8e8', '#6a58a8', '#f0e8ff', '#d0b8ff', '#ffffff'], 'punkte', [1, 5]],
  ['traumwels', 'Traumwels', 'seele', 3, 'wels', ['#5a4a8a', '#2a2048', '#a898d0', '#3a2e60', '#e0d0ff'], 'leucht', [6, 22]],
  ['ahnenkoi', 'Ahnenkoi', 'seele', 4, 'hoch', ['#fff8e8', '#f0d8a0', '#ffffff', '#ffd060', '#ffb020'], 'flecken', [8, 26], { min: 65 }],
  ['nebelhering', 'Nebelhering', 'meer', 0, 'normal', ['#b8c8d0', '#4a6a80', '#eef4f8', '#8aa0b0', '#d8e8f0'], 'glanz', [0.2, 0.8]],
  ['kuestenbarsch', 'Küstenbarsch', 'meer', 0, 'normal', ['#8a9a9a', '#4a5a5a', '#e0e8e8', '#6a7a7a', '#2a3434'], 'streifen', [0.8, 4]],
  ['silbermakrele', 'Silbermakrele', 'meer', 1, 'lang', ['#c8d8e0', '#2a6a7a', '#f4f8fa', '#5a8a9a', '#1a3a4a'], 'wellen', [0.6, 3]],
  ['riffbarsch', 'Riffbarsch', 'meer', 1, 'hoch', ['#f08a3a', '#c85a1a', '#fff0d8', '#f0a050', '#ffffff'], 'band', [0.3, 1.5]],
  ['schwertfisch', 'Schwertfisch', 'meer', 2, 'schwert', ['#5a7a9a', '#2a3e58', '#d8e4ee', '#3a5470', '#a8c0d8'], '', [20, 90]],
  ['laternenfisch', 'Laternenfisch', 'meer', 3, 'laterne', ['#3a3a4a', '#1a1a24', '#6a6a7a', '#2a2a36', '#ffe86a'], 'leucht', [2, 9]],
  ['nebelhai', 'Nebelhai', 'meer', 4, 'hai', ['#8a98a0', '#4a5860', '#e8eef0', '#6a7880', '#c8d4d8'], '', [40, 160], { min: 65 }],
  ['sonnenbarbe', 'Sonnenbarbe', 'himmel', 0, 'normal', ['#f0d070', '#c8a030', '#fff8d8', '#f0b040', '#fff0a0'], 'glanz', [0.3, 1.5]],
  ['wolkenforelle', 'Wolkenforelle', 'himmel', 1, 'normal', ['#e8f0fa', '#a8c0e0', '#ffffff', '#c8d8f0', '#7aa0d8'], 'punkte', [0.8, 4]],
  ['himmelskoi', 'Himmelskoi', 'himmel', 2, 'hoch', ['#8ac8f0', '#4a8ad0', '#ffffff', '#c8e8ff', '#ffffff'], 'flecken', [2, 9]],
  ['goldflosser', 'Goldflosser', 'himmel', 3, 'normal', ['#ffd040', '#e09a10', '#fff4c0', '#ffe080', '#ffffff'], 'schleier', [1.5, 6]],
  ['lichtkarpfen', 'Lichtkarpfen', 'himmel', 4, 'hoch', ['#fff8e0', '#f8e0a0', '#ffffff', '#ffe8a0', '#fff4d0'], 'leucht', [6, 20], { min: 70 }]
];
for (const [id, name, pool, r, form, c, muster, kg, x] of AN_FISCHE) FANG[id] = Object.assign({ id, art: 'fisch', name, pool, r, form, c, muster, kg }, x || {});
const AN_FISCH_LISTE = Object.values(FANG).filter((f) => f.art === 'fisch');
// Plunder, Schätze und Wertsachen (preis: fester Preis oder null = nach Gewässer)
Object.assign(FANG, {
  stiefel: { id: 'stiefel', art: 'plunder', name: 'Alter Stiefel', form: 'stiefel', preis: 2, r: 0, text: 'Hat schon bessere Tage gesehen. Der Händler zahlt trotzdem ein paar Münzen.' },
  netzrest: { id: 'netzrest', art: 'plunder', name: 'Zerrissenes Netz', form: 'netz', preis: 3, r: 0, text: 'Ein Stück altes Fischernetz – zu nichts mehr zu gebrauchen.' },
  schlacke: { id: 'schlacke', art: 'plunder', name: 'Schlackebrocken', form: 'schlacke', preis: 4, r: 0, text: 'Erkaltete Lava. Warm ist sie noch immer.' },
  flaschenpost: { id: 'flaschenpost', art: 'schatz', name: 'Flaschenpost', form: 'flasche', r: 1 },
  schatzkaestchen: { id: 'schatzkaestchen', art: 'schatz', name: 'Kleines Schatzkästchen', form: 'kaestchen', r: 2 },
  perle: { id: 'perle', art: 'ware', name: 'Perle', form: 'perle', r: 2, text: 'Schimmert in allen Farben. Händler zahlen gut dafür.' },
  feueropal: { id: 'feueropal', art: 'ware', name: 'Feueropal', form: 'opal', r: 3, text: 'In ihm flackert ein winziges Feuer. Sehr begehrt bei Händlern.' }
});
// Zeilen in der Flaschenpost (nur Stimmung, ohne Folgen)
const AN_FLASCHENPOST = [
  'Wer dies findet: Der Fisch beißt am besten, wenn man nicht hinsieht.',
  'Habe die Insel verlassen. Das Floß hält. Vielleicht.',
  'Wenn du das liest, bin ich längst zu Hause. Behalte die Münzen.',
  'Die Fischerin von Kazehana schuldet mir noch drei Haken.',
  'Hinter dem dritten Felsen liegt nichts. Ich habe nachgesehen.',
  'Liebe Mutter, das Meer ist groß und das Essen schlecht.'
];

// Preis beim Händler (alle Händler, die Fischerin und die Händlerin zahlen gleich)
function fangPreis(d) {
  if (!d) return 0;
  if (d.preis != null) return d.preis;
  if (d.art === 'fisch') return Math.round(((AN_POOLS[d.pool] ? AN_POOLS[d.pool].lvl : 10) * 1.6 + 6) * AN_RAR[d.r].preis);
  if (d.id === 'perle') return 600;
  if (d.id === 'feueropal') return 2500;
  return 1;
}
const fangFarbe = (d) => (d ? d.farbe || AN_RAR_FARBE[Math.max(0, Math.min(4, d.r | 0))] : '#e8dcc0');

if (typeof SAVE_FIELDS !== 'undefined') for (const f of ['angeln', 'fang']) if (!SAVE_FIELDS.includes(f)) SAVE_FIELDS.push(f);

// --- Spielstand -----------------------------------------------------------------------------------------------------
const anInt = (v, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : lo);
function anState(p) {
  p = p || game.player;
  if (!p.angeln || typeof p.angeln !== 'object') p.angeln = {};
  const S = p.angeln;
  S.rute = Number.isInteger(S.rute) && S.rute >= 0 && S.rute < ANGELN.ruten.length ? S.rute : -1;
  S.xp = anInt(S.xp, 0, 1e9);
  S.n = anInt(S.n, 0, 1e9);
  S.schatz = anInt(S.schatz, 0, 1e9);
  S.plunder = anInt(S.plunder, 0, 1e9);
  if (!S.arten || typeof S.arten !== 'object') S.arten = {};
  if (!S.rek || typeof S.rek !== 'object') S.rek = {};
  return S;
}
// Vorrat: nur bekannte Kennungen, ganze Zahlen über 0 (unbekannte Einträge aus alten oder fremden Ständen fallen weg)
function fangVorrat(p) {
  p = p || game.player;
  if (!p.fang || typeof p.fang !== 'object' || Array.isArray(p.fang)) p.fang = {};
  return p.fang;
}
function fangN(p, id) {
  const n = fangVorrat(p)[id];
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
function fangAdd(p, id, n) {
  if (!fangDef(id) || !(n > 0)) return;
  const V = fangVorrat(p);
  V[id] = Math.min(1e9, fangN(p, id) + Math.floor(n));
}
function fangTake(p, id, n) {
  n = Math.floor(n);
  if (!(n > 0) || fangN(p, id) < n) return false;
  const V = fangVorrat(p);
  V[id] = fangN(p, id) - n;
  if (!V[id]) delete V[id];
  return true;
}
// alles im Vorrat, sortiert: Gerichte, Fische (selten zuerst), Wertsachen, Zutaten, Plunder
const FANG_ORDNUNG = { mahl: 0, fisch: 1, ware: 2, zutat: 3, plunder: 4 };
function fangListe(p) {
  const V = fangVorrat(p);
  const out = [];
  for (const id of Object.keys(V)) {
    const d = fangDef(id);
    const n = fangN(p, id);
    // (Schätze werden gleich geöffnet und liegen nie im Vorrat)
    if (!d || !n || d.art === 'schatz') { delete V[id]; continue; }
    out.push({ d, n });
  }
  out.sort((a, b) => FANG_ORDNUNG[a.d.art] - FANG_ORDNUNG[b.d.art] || (b.d.r | 0) - (a.d.r | 0) || a.d.name.localeCompare(b.d.name));
  return out;
}
const anStufe = (xp) => Math.min(AN_MAX_STUFE, 1 + Math.floor(Math.sqrt(Math.max(0, xp) / ANGELN.stufeK)));
const anXpFuer = (st) => Math.ceil(ANGELN.stufeK * Math.pow(Math.max(0, st - 1), 2));
const anDe = (n) => Math.round(n).toLocaleString('de-DE');
const anKg = (k10) => (k10 / 10).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kg';
const anEsc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]));
let anFehlerGemeldet = 0;
function anFehler(err) {
  if (anFehlerGemeldet++ < 5) console.warn('Angeln:', err);
}

// --- Symbole (Leinwand, einmal je Art gemalt) -------------------------------------------------------------------------
const FANG_KUNST = {};
const fangIcons = new Map();
function fangIconUrl(id) {
  let u = fangIcons.get(id);
  if (u) return u;
  const d = fangDef(id);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  try {
    (FANG_KUNST[d && d.form] || anFischKunst)(g, d || { c: ['#888', '#666', '#aaa', '#777', '#999'], form: 'normal' });
  } catch (err) { anFehler(err); }
  u = c.toDataURL();
  fangIcons.set(id, u);
  return u;
}
// kleine Hilfen für die Symbole
function anHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function anPoly(g, pts, fill, line, lw = 1.2) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (line) { g.strokeStyle = line; g.lineWidth = lw; g.stroke(); }
}
function anOval(g, x, y, rx, ry, fill, line, lw = 1.2) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (line) { g.strokeStyle = line; g.lineWidth = lw; g.stroke(); }
}
const AN_UMRISS = 'rgba(22,15,10,0.8)';

// Fisch nach rechts schauend: Form (normal, hoch, lang, wels, schwert, hai, laterne, aal), Farben und Muster
function anFischKunst(g, f) {
  const [cb, cr, cu, cf, ca] = f.c;
  const form = f.form || 'normal';
  g.lineJoin = 'round';
  g.lineCap = 'round';
  if (form === 'aal') return anAalKunst(g, f);
  const M = { normal: [32, 33, 19, 9.5], hoch: [32, 32, 16.5, 12.5], lang: [33, 33, 23, 6.6], wels: [32, 34, 20, 9.2],
    schwert: [27, 33, 17, 7.6], hai: [31, 33, 21, 8.4], laterne: [33, 35, 15.5, 12] }[form] || [32, 33, 19, 9.5];
  const [cx, cy, rx, ry] = M;
  const rnd = anHash(f.id || form);
  // Leuchten hinter dem Fisch
  if (f.muster === 'leucht') {
    const gl = g.createRadialGradient(cx, cy, 2, cx, cy, 30);
    gl.addColorStop(0, ca + 'aa');
    gl.addColorStop(1, ca + '00');
    g.fillStyle = gl;
    g.fillRect(0, 0, 64, 64);
  }
  const schleier = f.muster === 'schleier';
  // Schwanzflosse
  const tx = cx - rx;
  if (form === 'hai') anPoly(g, [[tx + 3, cy - 1], [tx - 9, cy - ry * 1.9], [tx - 5, cy], [tx - 8, cy + ry * 1.2], [tx + 3, cy + 1]], cf, AN_UMRISS);
  else {
    const L = schleier ? 16 : form === 'lang' ? 9 : 11;
    const H = schleier ? ry * 1.6 : form === 'hoch' ? ry * 0.95 : ry * 1.05;
    anPoly(g, [[tx + 3, cy - 1.5], [tx - L, cy - H], [tx - L * 0.55, cy], [tx - L, cy + H], [tx + 3, cy + 1.5]], cf, AN_UMRISS);
  }
  // Rücken- und Afterflosse
  if (form === 'hai') anPoly(g, [[cx - rx * 0.25, cy - ry * 0.85], [cx - rx * 0.05, cy - ry * 2.3], [cx + rx * 0.3, cy - ry * 0.9]], cf, AN_UMRISS);
  else if (form === 'schwert') anPoly(g, [[cx - rx * 0.35, cy - ry * 0.9], [cx - rx * 0.05, cy - ry * 2.6], [cx + rx * 0.45, cy - ry * 0.85]], cf, AN_UMRISS);
  else {
    const hi = schleier ? 2.4 : form === 'hoch' ? 1.55 : 1.7;
    anPoly(g, [[cx - rx * 0.4, cy - ry * 0.92], [cx - rx * 0.12, cy - ry * hi], [cx + rx * 0.28, cy - ry * 0.95]], cf, AN_UMRISS);
  }
  anPoly(g, [[cx - rx * 0.35, cy + ry * 0.9], [cx - rx * 0.5, cy + ry * (schleier ? 2.1 : 1.5)], [cx - rx * 0.05, cy + ry * 0.95]], cf, AN_UMRISS);
  // Schwert
  if (form === 'schwert') anPoly(g, [[cx + rx - 1, cy - 2], [cx + rx + 21, cy - 0.3], [cx + rx - 1, cy + 1.8]], cr, AN_UMRISS, 1);
  // Körper
  const body = () => {
    g.beginPath();
    const nose = form === 'lang' || form === 'hai' ? cx + rx + 2.5 : cx + rx;
    const head = form === 'wels' || form === 'laterne' ? 1.25 : 1.12;
    g.moveTo(nose, cy + (form === 'laterne' ? 2 : 0));
    g.bezierCurveTo(cx + rx * 0.75, cy - ry * head, cx - rx * 0.5, cy - ry * 1.1, tx, cy - ry * 0.2);
    g.lineTo(tx, cy + ry * 0.2);
    g.bezierCurveTo(cx - rx * 0.5, cy + ry * 1.05, cx + rx * 0.72, cy + ry * (form === 'laterne' ? 1.3 : 1.08), nose, cy + (form === 'laterne' ? 2 : 0));
    g.closePath();
  };
  const grad = g.createLinearGradient(0, cy - ry, 0, cy + ry);
  grad.addColorStop(0, cr);
  grad.addColorStop(0.45, cb);
  grad.addColorStop(1, cu);
  body();
  g.fillStyle = grad;
  g.fill();
  // Muster (nur im Körper)
  g.save();
  body();
  g.clip();
  const m = f.muster;
  if (m === 'streifen') {
    g.fillStyle = ca;
    g.globalAlpha = 0.5;
    for (let k = 0; k < 5; k++) { const x = cx - rx * 0.55 + k * rx * 0.3; g.fillRect(x, cy - ry * 1.2, rx * 0.11, ry * 1.6); }
  } else if (m === 'punkte') {
    g.fillStyle = ca;
    for (let k = 0; k < 11; k++) anOval(g, cx - rx * 0.7 + rnd() * rx * 1.35, cy - ry * 0.75 + rnd() * ry * 1.1, 1.1, 1.1, ca);
  } else if (m === 'flecken') {
    g.globalAlpha = 0.92;
    for (let k = 0; k < 4; k++) anOval(g, cx - rx * 0.5 + rnd() * rx * 1.1, cy - ry * 0.6 + rnd() * ry * 0.9, 3 + rnd() * 3.5, 2.5 + rnd() * 2.5, ca);
  } else if (m === 'glanz') {
    g.globalAlpha = 0.4;
    anOval(g, cx + rx * 0.05, cy - ry * 0.45, rx * 0.62, ry * 0.2, '#ffffff');
  } else if (m === 'leucht') {
    g.globalAlpha = 0.9;
    for (let k = 0; k < 7; k++) anOval(g, cx - rx * 0.6 + k * rx * 0.2, cy + Math.sin(k) * ry * 0.3, 1.2, 1.2, ca);
    g.globalAlpha = 0.3;
    anOval(g, cx, cy - ry * 0.4, rx * 0.6, ry * 0.22, '#ffffff');
  } else if (m === 'adern') {
    g.strokeStyle = ca;
    g.lineWidth = 1.1;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      let x = cx - rx * 0.6 + k * rx * 0.35;
      let y = cy - ry * 0.8;
      g.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += (rnd() - 0.5) * 5; y += ry * 0.45; g.lineTo(x, y); }
      g.stroke();
    }
  } else if (m === 'band') {
    g.fillStyle = ca;
    g.fillRect(cx - rx, cy - ry * 0.28, rx * 1.75, ry * 0.32);
  } else if (m === 'wellen') {
    g.strokeStyle = ca;
    g.lineWidth = 1;
    for (let k = 0; k < 5; k++) {
      g.beginPath();
      const x = cx - rx * 0.6 + k * rx * 0.28;
      g.moveTo(x, cy - ry);
      g.quadraticCurveTo(x + 3, cy - ry * 0.55, x, cy - ry * 0.15);
      g.stroke();
    }
  } else if (m === 'platten') {
    for (let k = 0; k < 6; k++) anPoly(g, [[cx - rx * 0.7 + k * rx * 0.26, cy - ry * 0.55], [cx - rx * 0.6 + k * rx * 0.26, cy - ry * 0.85], [cx - rx * 0.5 + k * rx * 0.26, cy - ry * 0.55], [cx - rx * 0.6 + k * rx * 0.26, cy - ry * 0.3]], ca);
  } else if (m === 'schleier') {
    g.globalAlpha = 0.35;
    anOval(g, cx, cy - ry * 0.4, rx * 0.6, ry * 0.25, ca);
  }
  // Schuppen angedeutet
  g.globalAlpha = 0.18;
  g.strokeStyle = cr;
  g.lineWidth = 0.7;
  if (form !== 'hai') for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(cx - rx * 0.35 + k * rx * 0.24, cy + 1, ry * 0.5, -1.1, 1.1); g.stroke(); }
  g.restore();
  body();
  g.strokeStyle = AN_UMRISS;
  g.lineWidth = 1.3;
  g.stroke();
  // Kiemenbogen, Brustflosse, Auge
  g.strokeStyle = 'rgba(30,20,14,0.5)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(cx + rx * 0.45, cy, ry * 0.85, Math.PI * 0.62, Math.PI * 1.38);
  g.stroke();
  if (form === 'hai') for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(cx + rx * 0.3 - k * 2.2, cy - ry * 0.3); g.lineTo(cx + rx * 0.26 - k * 2.2, cy + ry * 0.35); g.stroke(); }
  anPoly(g, [[cx + rx * 0.25, cy + ry * 0.25], [cx + rx * 0.02, cy + ry * 0.75], [cx + rx * 0.3, cy + ry * 0.55]], cf, AN_UMRISS, 0.9);
  const ex = cx + rx * (form === 'laterne' ? 0.48 : 0.62);
  const ey = cy - ry * (form === 'laterne' ? 0.45 : 0.25);
  anOval(g, ex, ey, 2.6, 2.6, m === 'auge' ? ca : '#f8f4e8', AN_UMRISS, 0.8);
  anOval(g, ex + 0.5, ey, 1.3, 1.3, '#140e0a');
  anOval(g, ex - 0.3, ey - 0.8, 0.5, 0.5, '#ffffff');
  // Besonderheiten
  if (form === 'wels') {
    g.strokeStyle = cr;
    g.lineWidth = 1.1;
    for (const [dy, len] of [[1.5, 12], [3.2, 9]]) { g.beginPath(); g.moveTo(cx + rx - 1, cy + dy); g.quadraticCurveTo(cx + rx + 4, cy + dy + 5, cx + rx - 2 + len * 0.3, cy + dy + len * 0.75); g.stroke(); }
  }
  if (form === 'laterne') {
    g.strokeStyle = cr;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(cx + rx * 0.3, cy - ry * 0.95);
    g.quadraticCurveTo(cx + rx * 0.9, cy - ry * 2.1, cx + rx + 6, cy - ry * 1.1);
    g.stroke();
    const lg = g.createRadialGradient(cx + rx + 6, cy - ry * 1.1, 0, cx + rx + 6, cy - ry * 1.1, 7);
    lg.addColorStop(0, '#ffffff');
    lg.addColorStop(0.35, ca);
    lg.addColorStop(1, ca + '00');
    g.fillStyle = lg;
    g.fillRect(cx + rx - 2, cy - ry * 1.1 - 8, 16, 16);
    for (let k = 0; k < 5; k++) anPoly(g, [[cx + rx * 0.62 + k * 1.6, cy + 2.2], [cx + rx * 0.68 + k * 1.6, cy + 4.6], [cx + rx * 0.74 + k * 1.6, cy + 2.2]], '#f4f0e0');
  }
  if (m === 'zaehne') for (let k = 0; k < 3; k++) anPoly(g, [[cx + rx * 0.7 + k * 1.7, cy + 0.6], [cx + rx * 0.75 + k * 1.7, cy + 2.8], [cx + rx * 0.8 + k * 1.7, cy + 0.6]], '#ffffff');
}
// Aal: lange Welle, vorn dicker
function anAalKunst(g, f) {
  const [cb, cr, cu, cf, ca] = f.c;
  const top = [];
  const bot = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const x = 56 - u * 50;
    const y = 32 + Math.sin(u * Math.PI * 2.2) * 6;
    const t = 5.6 - u * 4.2;
    top.push([x, y - t]);
    bot.push([x, y + t]);
  }
  const pts = top.concat(bot.reverse());
  if (f.muster === 'adern' || f.muster === 'leucht') {
    const gl = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gl.addColorStop(0, ca + '66');
    gl.addColorStop(1, ca + '00');
    g.fillStyle = gl;
    g.fillRect(0, 0, 64, 64);
  }
  g.lineJoin = 'round';
  g.strokeStyle = cf;
  g.lineWidth = 2.2;
  g.beginPath();
  top.slice(5, 22).forEach(([x, y], i) => (i ? g.lineTo(x, y - 1.6) : g.moveTo(x, y - 1.6)));
  g.stroke();
  const grad = g.createLinearGradient(0, 24, 0, 40);
  grad.addColorStop(0, cr);
  grad.addColorStop(0.5, cb);
  grad.addColorStop(1, cu);
  anPoly(g, pts, grad, AN_UMRISS, 1.3);
  if (f.muster === 'adern') {
    g.strokeStyle = ca;
    g.lineWidth = 1;
    for (let i = 3; i < 22; i += 3) { const [x, y] = top[i]; g.beginPath(); g.moveTo(x, y + 1.5); g.lineTo(x - 2, y + 5); g.stroke(); }
  } else if (f.muster === 'punkte') {
    for (let i = 3; i < 22; i += 2) { const [x, y] = top[i]; anOval(g, x, y + 2.4, 0.9, 0.9, ca); }
  }
  anOval(g, 52, 29.5, 1.9, 1.9, '#f4f0e0', AN_UMRISS, 0.7);
  anOval(g, 52.4, 29.5, 0.9, 0.9, '#120c08');
}
FANG_KUNST.normal = anFischKunst;
for (const k of ['hoch', 'lang', 'wels', 'schwert', 'hai', 'laterne', 'aal']) FANG_KUNST[k] = anFischKunst;
FANG_KUNST.stiefel = (g) => {
  anPoly(g, [[20, 12], [34, 12], [34, 40], [50, 44], [52, 52], [18, 52], [18, 40]], '#6a4a2e', AN_UMRISS, 1.4);
  anPoly(g, [[18, 48], [52, 48], [52, 53], [18, 53]], '#3a2818');
  anPoly(g, [[19, 12], [35, 12], [35, 16], [19, 16]], '#8a6a44');
  g.strokeStyle = '#c8b080'; g.lineWidth = 1; g.beginPath(); g.moveTo(24, 22); g.lineTo(30, 26); g.moveTo(30, 22); g.lineTo(24, 26); g.stroke();
  anOval(g, 44, 30, 4, 5, '#7ab0c8');
  anPoly(g, [[40, 36], [44, 30], [48, 36]], '#7ab0c8');
};
FANG_KUNST.netz = (g) => {
  g.strokeStyle = '#a8906a';
  g.lineWidth = 1.6;
  for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(10 + k * 8, 12); g.lineTo(18 + k * 6, 52); g.stroke(); g.beginPath(); g.moveTo(10, 14 + k * 7); g.lineTo(54, 10 + k * 8); g.stroke(); }
  g.strokeStyle = '#5a4630';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(8, 12); g.lineTo(56, 9); g.stroke();
  for (const [x, y] of [[12, 12], [24, 11], [36, 10], [48, 9.5]]) anOval(g, x, y, 2.4, 2.4, '#c8a050', AN_UMRISS, 0.6);
};
FANG_KUNST.schlacke = (g) => {
  anPoly(g, [[14, 36], [20, 20], [34, 14], [48, 20], [52, 36], [42, 50], [24, 50]], '#2e2826', AN_UMRISS, 1.4);
  g.strokeStyle = '#ff7a2a'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(22, 26); g.lineTo(30, 34); g.lineTo(28, 44); g.moveTo(40, 22); g.lineTo(36, 32); g.lineTo(44, 40); g.stroke();
  anOval(g, 34, 30, 3, 2, '#ffb04a');
};
FANG_KUNST.flasche = (g) => {
  g.save();
  g.translate(32, 33);
  g.rotate(-0.5);
  anPoly(g, [[-9, -12], [9, -12], [11, 18], [-11, 18]], 'rgba(90,170,120,0.85)', AN_UMRISS, 1.3);
  anPoly(g, [[-4, -24], [4, -24], [4, -12], [-4, -12]], 'rgba(90,170,120,0.85)', AN_UMRISS, 1.2);
  anPoly(g, [[-4.5, -29], [4.5, -29], [4, -23], [-4, -23]], '#a07a4a', AN_UMRISS, 1);
  anPoly(g, [[-5, -6], [5, -6], [5, 12], [-5, 12]], '#f0e4c4', 'rgba(90,60,30,0.6)', 0.8);
  g.strokeStyle = '#a0281e'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-5, 3); g.lineTo(5, 3); g.stroke();
  anOval(g, -5, -6, 1.5, 6, 'rgba(255,255,255,0.35)');
  g.restore();
};
FANG_KUNST.kaestchen = (g) => {
  anPoly(g, [[12, 30], [52, 30], [50, 52], [14, 52]], '#7a4a26', AN_UMRISS, 1.4);
  g.beginPath(); g.moveTo(12, 31); g.quadraticCurveTo(32, 12, 52, 31); g.closePath(); g.fillStyle = '#8e5a2e'; g.fill(); g.strokeStyle = AN_UMRISS; g.lineWidth = 1.4; g.stroke();
  for (const x of [20, 44]) anPoly(g, [[x - 2, 22], [x + 2, 22], [x + 2, 52], [x - 2, 52]], '#e8c46a');
  anPoly(g, [[28, 32], [36, 32], [36, 40], [28, 40]], '#ffd34d', AN_UMRISS, 1);
  anOval(g, 32, 36, 1.2, 1.6, '#3a2410');
  anOval(g, 18, 27, 2.4, 2.4, '#fff2b0');
};
FANG_KUNST.perle = (g) => {
  g.beginPath(); g.moveTo(10, 40); g.quadraticCurveTo(32, 62, 54, 40); g.quadraticCurveTo(32, 46, 10, 40); g.fillStyle = '#c8a8b8'; g.fill(); g.strokeStyle = AN_UMRISS; g.lineWidth = 1.3; g.stroke();
  g.beginPath(); g.moveTo(10, 38); g.quadraticCurveTo(32, 8, 54, 38); g.quadraticCurveTo(32, 30, 10, 38); g.fillStyle = '#d8bcc8'; g.fill(); g.stroke();
  const pg = g.createRadialGradient(29, 36, 1, 32, 39, 9);
  pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.5, '#f0eaf4'); pg.addColorStop(1, '#b8aac8');
  anOval(g, 32, 40, 8, 8, pg, AN_UMRISS, 1);
  anOval(g, 29, 37, 2, 2, '#ffffff');
};
FANG_KUNST.opal = (g) => {
  const gl = g.createRadialGradient(32, 32, 2, 32, 32, 28);
  gl.addColorStop(0, 'rgba(255,170,80,0.7)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gl; g.fillRect(0, 0, 64, 64);
  const og = g.createLinearGradient(20, 14, 44, 50);
  og.addColorStop(0, '#ffe08a'); og.addColorStop(0.4, '#ff8a2a'); og.addColorStop(0.75, '#e0401a'); og.addColorStop(1, '#8a1a0a');
  anPoly(g, [[32, 12], [46, 22], [46, 42], [32, 52], [18, 42], [18, 22]], og, AN_UMRISS, 1.4);
  anPoly(g, [[32, 12], [46, 22], [32, 26]], 'rgba(255,255,255,0.35)');
  anPoly(g, [[18, 22], [32, 26], [32, 52], [18, 42]], 'rgba(120,20,0,0.2)');
  anOval(g, 28, 24, 2.2, 2.2, '#ffffff');
};

// --- Gewässer finden ----------------------------------------------------------------------------------------------
// Fischbar: Wasser, Moor, Lava, Blutsee, zugefrorene Seen (Eis) – nur auf den Karten (keine Dungeons, Arenen, Hallen),
// nicht unter Brücken
function anGewaesser(tx, ty) {
  const w = game.world;
  if (!w || tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return null;
  const i = ty * MAP_W + tx;
  if (w.deco[i] === DECO.BRIDGE || w.obj[i] !== OBJ.NONE) return null;
  const g = w.ground[i];
  let pool = null;
  if (g === GROUND.LAVA) pool = 'lava';
  else if (g === GROUND.BLUTSEE) pool = 'blut';
  else if (g === GROUND.ICE) pool = 'eis';
  else if (g === GROUND.BOG) pool = 'moor';
  else if (g !== GROUND.WATER) return null;
  const wm = mapOfTile(tx, ty);
  if (!wm) return null;
  return { pool: pool || AN_KARTE[wm.id] || 'see', g };
}
const AN_RICHTUNG = [0, 0.3, -0.3, 0.62, -0.62, 0.95, -0.95, 1.3, -1.3, 1.7, -1.7, 2.15, -2.15, 2.6, -2.6, Math.PI];
const AN_WEITE = [2.5, 3.1, 1.95, 3.7, 4.2, 1.6];
// Ziel für den Wurf: zuerst vor der Figur, sonst ringsum (die Figur dreht sich dann zum Wasser)
function anZiel(p) {
  if (!p || !game.world) return null;
  const f = p.facing || { x: 0, y: 1 };
  const a0 = Math.atan2(f.y, f.x);
  const ox = p.x;
  const oy = feetY(p) - 3;
  for (const da of AN_RICHTUNG) {
    const a = a0 + da;
    const c = Math.cos(a);
    const s = Math.sin(a);
    for (const d of AN_WEITE) {
      const x = ox + c * d * TILE;
      const y = oy + s * d * TILE;
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);
      const G = anGewaesser(tx, ty);
      if (!G) continue;
      // nicht genau auf die Uferkante: zur Mitte der Kachel ziehen
      const bx = (tx + 0.5) * TILE + Math.max(-6, Math.min(6, x - (tx + 0.5) * TILE));
      const by = (ty + 0.5) * TILE + Math.max(-6, Math.min(6, y - (ty + 0.5) * TILE));
      return { x: Math.round(bx), y: Math.round(by), tx, ty, pool: G.pool, g: G.g, ang: Math.atan2(by - oy, bx - ox) };
    }
  }
  return null;
}

// --- Ablauf ---------------------------------------------------------------------------------------------------------
// Phasen: wurf → warten → biss → drill → fang | weg (dann vorbei)
const AN = { phase: null, t0: 0, start: 0, x0: 0, y0: 0, ziel: null, fisch: null, bissAt: 0, zuck: [], drill: null, hold: false, seq: 0, hatGezuckt: 0, kontextAt: 0, ziel2: null };
const AN_PH = { wurf: 1, warten: 2, biss: 3, drill: 4, fang: 5, weg: 6 };
const AN_PH_NAME = ['', 'wurf', 'warten', 'biss', 'drill', 'fang', 'weg'];
const anRute = (p) => { const S = anState(p); return S.rute >= 0 ? ANGELN.ruten[S.rute] : null; };

// Darf jetzt geworfen werden? { ok, why, ziel }
function anKann(p) {
  if (!p || p.dead || !game.running) return { ok: false, why: '' };
  const S = anState(p);
  if (S.rute < 0) return { ok: false, why: 'Du hast keine Angel. Die Fischerin in jeder Stadt und jedem Lager verkauft welche.' };
  if (game.duel || game.trade) return { ok: false, why: 'Jetzt nicht.' };
  if (!mapOfTile(Math.floor(p.x / TILE), Math.floor(p.y / TILE))) return { ok: false, why: 'Hier gibt es nichts zu angeln.' };
  if (game.time - (p.lastCombat || -99) < ANGELN.kampf) return { ok: false, why: 'Nicht mitten im Kampf.' };
  const z = anZiel(p);
  if (!z) return { ok: false, why: 'Hier ist kein Wasser in Wurfweite.' };
  if (z.pool === 'lava' && !ANGELN.ruten[S.rute].lava) return { ok: false, why: 'Lava verbrennt jede Schnur – erst ab der Glutfaserrute.', ziel: z };
  return { ok: true, ziel: z };
}
let anMeldungAt = 0;
function anMeldung(text, art = 'info') {
  const p = game.player;
  if (!text || !p) return;
  if (performance.now() - anMeldungAt < 600) return;
  anMeldungAt = performance.now();
  if (typeof addText === 'function') addText(p.x, feetY(p) - 70, text, 'info');
  if (art === 'warn' && typeof ui !== 'undefined') ui.log(text, 'warn');
}
function anTon(id, o = {}, fb) {
  try {
    if (typeof sfxFiles !== 'undefined' && sfxFiles.play(id, o)) return;
    if (fb && typeof snd !== 'undefined') snd.player(fb, { vol: o.vol || 0.3 });
  } catch (err) { /* ohne Ton */ }
}
function anTonVorladen() {
  try {
    if (typeof sfxFiles === 'undefined' || typeof sfxFiles.load !== 'function') return;
    for (const id of ['wasser', 'glocke', 'schwung_leicht', 'schwung_mittel', 'beute', 'gold', 'stufe', 'block', 'feuer_wirken', 'eis_splitter']) sfxFiles.load(id);
  } catch (err) { /* ohne Ton */ }
}

// Auswerfen
function anStart() {
  const p = game.player;
  if (!p || !game.running) return false;
  if (AN.phase) { anDruck(true); return true; }
  if (p.riding && typeof toggleRide === 'function') {
    toggleRide(false);
    if (p.riding) { anMeldung('Erst absteigen.'); return false; }
  }
  const k = anKann(p);
  if (!k.ok) { anMeldung(k.why, k.why && k.why.length > 30 ? 'warn' : 'info'); return false; }
  const z = k.ziel;
  p.facing = { x: Math.cos(z.ang), y: Math.sin(z.ang) };
  if (typeof input !== 'undefined') input.walkTo = null;
  game.target = null;
  Object.assign(AN, { phase: 'wurf', t0: game.time, start: game.time, x0: p.x, y0: p.y, ziel: z, fisch: null, drill: null, hold: false, zuck: [], hatGezuckt: 0 });
  AN.seq = (AN.seq + 1) % 1000;
  anTonVorladen();
  anTon('schwung_leicht', { x: p.x, y: p.y, vol: 0.45, rate: 1.15 }, 'item');
  anHudZeigen();
  return true;
}
// Wartezeit bis zum Biss: Angel und Angelstufe machen es schneller
function anWartezeit(p) {
  const S = anState(p);
  const R = ANGELN.ruten[Math.max(0, S.rute)];
  const st = anStufe(S.xp);
  const [a, b] = ANGELN.warten;
  return (a + Math.random() * (b - a)) * R.biss * (1 - 0.15 * (st / AN_MAX_STUFE));
}
const anBissFenster = () => ANGELN.biss + 0.08 * Math.max(0, anState(game.player).rute);

// Was beißt an?
function anWuerfeln(p, z) {
  const S = anState(p);
  const st = anStufe(S.xp);
  const R = ANGELN.ruten[Math.max(0, S.rute)];
  const pool = z.pool;
  const nacht = typeof isNight === 'function' && isNight();
  const schatz = 0.012 + st * 0.00015 + R.schatz;
  const plunder = Math.max(0.02, 0.08 - st * 0.0006);
  const u = Math.random();
  if (u < schatz) {
    const v = Math.random();
    if (v < 0.42) return FANG[pool === 'lava' || pool === 'blut' ? 'feueropal' : 'perle'];
    return v < 0.8 ? FANG.flaschenpost : FANG.schatzkaestchen;
  }
  if (u < schatz + plunder) return pool === 'lava' ? FANG.schlacke : Math.random() < 0.6 ? FANG.stiefel : FANG.netzrest;
  // Fische: Gewicht der Seltenheit, gleich verteilt auf die Arten dieser Seltenheit im Gewässer
  const da = AN_FISCH_LISTE.filter((f) => f.pool === pool && (!f.nacht || nacht) && st >= (f.min != null ? f.min : AN_RAR[f.r].min));
  const proR = [0, 0, 0, 0, 0];
  for (const f of da) proR[f.r]++;
  let sum = 0;
  const w = da.map((f) => {
    const A = AN_RAR[f.r];
    let x = (A.w / proR[f.r]) * (f.r ? (1 + (st / AN_MAX_STUFE) * A.k) * R.selten : 1);
    if (f.nachtX && nacht) x *= f.nachtX;
    sum += x;
    return x;
  });
  let roll = Math.random() * sum;
  for (let i = 0; i < da.length; i++) { roll -= w[i]; if (roll <= 0) return da[i]; }
  return da[da.length - 1] || FANG.stiefel;
}
// Gewicht eines Fangs in 0,1 kg (eher leicht, selten schwer)
function anGewicht(f) {
  if (!f || !f.kg) return 0;
  const [a, b] = f.kg;
  return Math.max(1, Math.round((a + (b - a) * Math.pow(Math.random(), 1.7)) * 10));
}

// Drill vorbereiten (Schwierigkeit nach Seltenheit, Angel und Angelstufe)
function anDrillStart() {
  const p = game.player;
  const S = anState(p);
  const st = anStufe(S.xp);
  const t = Math.max(0, S.rute);
  const f = AN.fisch;
  const r = f.art === 'fisch' ? f.r : f.art === 'plunder' ? 0 : 1;
  AN.drill = {
    t0: game.time, T: 0.5, P: 0.18, r,
    zw: Math.max(0.15, Math.min(0.52, 0.34 - r * 0.035 + t * 0.025 + st * 0.0012)),
    auf: 0.85, ab: 0.72,
    kraft: 0.16 + r * 0.05, takt: Math.max(0.7, 1.6 - r * 0.18),
    fill: (0.3 + t * 0.025 + st * 0.001) / (1 + r * 0.3), leak: 0.1 + r * 0.02,
    wf: 0.5 + r * 0.15, wa: 0.08 + r * 0.03, ph: Math.random() * 6.28,
    next: game.time + 0.5, stoss: 0, stossBis: 0, straff: 0, locker: 0, zc: 0.5
  };
}
function anDrillTick(dt) {
  const D = AN.drill;
  const t = game.time;
  D.zc = Math.max(D.zw / 2 + 0.02, Math.min(1 - D.zw / 2 - 0.02, 0.5 + Math.sin((t - D.t0) * D.wf * 2 + D.ph) * D.wa));
  if (t >= D.next) {
    D.stoss = D.kraft * (0.7 + Math.random() * 0.6);
    D.stossBis = t + 0.28;
    D.next = t + D.takt * (0.6 + Math.random() * 0.9);
  }
  let v = AN.hold ? D.auf : -D.ab;
  if (t < D.stossBis) v += D.stoss / 0.28;
  D.T = Math.max(0, Math.min(1, D.T + v * dt));
  const inZone = D.T >= D.zc - D.zw / 2 && D.T <= D.zc + D.zw / 2;
  D.P = Math.max(0, Math.min(1, D.P + (inZone ? D.fill : -D.leak) * dt));
  D.straff = D.T >= 0.985 ? D.straff + dt : Math.max(0, D.straff - dt * 2);
  D.locker = D.T <= 0.015 ? D.locker + dt : Math.max(0, D.locker - dt * 2);
  if (D.P >= 1) return anGefangen();
  if (D.straff > 0.55) return anEntkommen('Die Schnur ist gerissen!', true);
  if (D.locker > 1.6 || (D.P <= 0 && t - D.t0 > 2)) return anEntkommen('Der Fisch hat sich losgeschüttelt.');
  if (t - D.t0 > 25) return anEntkommen('Der Fisch war zu stark.');
}

// Taste, Knopf oder Antippen (down = gedrückt, sonst losgelassen)
function anDruck(down) {
  if (!down) { AN.hold = false; return; }
  const p = game.player;
  switch (AN.phase) {
    case 'warten':
      anEnde('Eingeholt.');
      break;
    case 'biss':
      // Anschlagen
      AN.phase = 'drill';
      AN.t0 = game.time;
      AN.hold = true;
      anDrillStart();
      anTon('schwung_mittel', { x: p.x, y: p.y, vol: 0.4, rate: 1.3 }, 'item');
      break;
    case 'drill':
      AN.hold = true;
      break;
    default:
      break;
  }
}

// Biss: Pose taucht ab, Spritzer, Glöckchen, am Handy kurz vibrieren
function anBiss() {
  const p = game.player;
  AN.fisch = anWuerfeln(p, AN.ziel);
  AN.phase = 'biss';
  AN.t0 = game.time;
  anSpritzer(AN.ziel.x, AN.ziel.y, AN.ziel.g, 1);
  anTon('glocke', { x: p.x, y: p.y, vol: 0.32, rate: 1.9, maxDur: 0.5 }, 'item');
  anTon(AN.ziel.g === GROUND.LAVA ? 'feuer_wirken' : 'wasser', { x: AN.ziel.x, y: AN.ziel.y, vol: 0.28, rate: 1.5, maxDur: 0.4 });
  try { if (input && input.touchUi && navigator.vibrate) navigator.vibrate(70); } catch (err) { /* ohne Vibration */ }
}
function anEntkommen(text, riss) {
  const p = game.player;
  AN.phase = 'weg';
  AN.t0 = game.time;
  AN.hold = false;
  if (riss) anTon('block', { x: p.x, y: p.y, vol: 0.35, rate: 1.45 }, 'item');
  else anSpritzer(AN.ziel.x, AN.ziel.y, AN.ziel.g, 0.6);
  anMeldung(text);
}
function anEnde(text) {
  AN.phase = null;
  AN.drill = null;
  AN.hold = false;
  anHudZeigen();
  if (text) anMeldung(text);
}

// Gefangen: in den Vorrat, Erfahrung, Rekorde, Anzeige
function anGefangen() {
  const p = game.player;
  const S = anState(p);
  const f = AN.fisch;
  const z = AN.ziel;
  AN.phase = 'fang';
  AN.t0 = game.time;
  AN.hold = false;
  const st0 = anStufe(S.xp);
  let xp = 0;
  let zeile = f.name;
  let banner = null;
  if (f.art === 'fisch') {
    const k10 = anGewicht(f);
    const neu = !S.arten[f.id];
    S.arten[f.id] = anInt(S.arten[f.id], 0, 1e9) + 1;
    const rekord = k10 > anInt(S.rek[f.id], 0, 1e9);
    if (rekord) S.rek[f.id] = k10;
    S.n++;
    fangAdd(p, f.id, 1);
    xp = AN_RAR[f.r].xp + (neu ? 15 : 0);
    zeile = `${f.name} · ${anKg(k10)}`;
    if (neu) banner = ['Neue Fischart!', f.name];
    else if (f.r >= 3) banner = [f.r >= 4 ? 'Legendärer Fang!' : 'Seltener Fang!', `${f.name} · ${anKg(k10)}`];
    if (rekord && !neu && typeof ui !== 'undefined') ui.log(`Neuer Rekord · ${f.name} · ${anKg(k10)}`, 'info');
  } else if (f.art === 'plunder') {
    fangAdd(p, f.id, 1);
    S.plunder++;
    xp = 1;
  } else if (f.art === 'ware') {
    fangAdd(p, f.id, 1);
    S.schatz++;
    xp = 6;
    banner = ['Schatz!', f.name];
  } else if (f.art === 'schatz') {
    anSchatzOeffnen(p, f, z.pool);
    S.schatz++;
    xp = 6;
  }
  S.xp += xp;
  if (f.art !== 'schatz' && typeof ui !== 'undefined') ui.loot(f.name, 1, fangIconUrl(f.id), fangFarbe(f));
  if (typeof addText === 'function') addText(p.x, feetY(p) - 64, zeile, 'other');
  // der Fang fliegt aus dem Wasser zur Figur
  try {
    if (typeof lootImg === 'function' && typeof addEffect === 'function') addEffect({ type: 'lootfly', x: z.x, y: z.y - 6, img: lootImg(fangIconUrl(f.id)), dur: 0.75, arc: 70 });
  } catch (err) { anFehler(err); }
  anSpritzer(z.x, z.y, z.g, 1.2);
  anTon(f.art === 'schatz' || f.art === 'ware' ? 'gold' : 'beute', { x: p.x, y: p.y, vol: 0.45 }, 'item');
  if (banner && typeof ui !== 'undefined') ui.banner(banner[0], banner[1]);
  if (f.r >= 3 && typeof sfx !== 'undefined' && sfx.success) { try { sfx.success(); } catch (err) { /* ohne Ton */ } }
  const st1 = anStufe(S.xp);
  if (st1 > st0 && typeof ui !== 'undefined') {
    ui.log(`Angelstufe ${st1} erreicht!`, 'level');
    if (!banner) ui.banner('Angelstufe ' + st1, 'Deine Chancen auf seltene Fische steigen');
    anTon('stufe', { vol: 0.35 }, 'levelup');
  }
  if (typeof saveGame === 'function') saveGame();
}
// Flaschenpost und Schatzkästchen gleich öffnen
function anSchatzOeffnen(p, f, pool) {
  const lvl = Math.max(5, (AN_POOLS[pool] || AN_POOLS.see).lvl);
  if (f.id === 'flaschenpost') {
    const g = Math.round(lvl * (10 + Math.random() * 15));
    p.gold += g;
    ui.loot('Gold', g, typeof lootIconUrl === 'function' ? lootIconUrl('gold') : fangIconUrl(f.id), '#f0cf6a');
    ui.banner('Flaschenpost', `${anDe(g)} Gold`);
    ui.log(`Flaschenpost · ${AN_FLASCHENPOST[Math.floor(Math.random() * AN_FLASCHENPOST.length)]}`, 'info');
  } else {
    const g = Math.round(lvl * (30 + Math.random() * 30));
    p.gold += g;
    ui.loot('Gold', g, typeof lootIconUrl === 'function' ? lootIconUrl('gold') : fangIconUrl(f.id), '#f0cf6a');
    if (typeof giveSplinters === 'function') giveSplinters(1 + Math.floor(Math.random() * 3));
    if (lvl >= 35 && Math.random() < 0.06 && typeof scrollIconUrl === 'function') {
      p.scrolls = (p.scrolls || 0) + 1;
      ui.loot(typeof BLESSING !== 'undefined' ? BLESSING.name : 'Segensschriftrolle', 1, scrollIconUrl(), '#ffd34d');
    }
    ui.banner('Kleines Schatzkästchen', `${anDe(g)} Gold`);
  }
}
// Spritzer am Gewässer (2D: Teilchen; 3D zeichnet anFx3 die Tropfen)
const AN_SPRITZ = [];
function anSpritzer(x, y, g, k = 1) {
  AN_SPRITZ.push({ x, y, g, k, t: game.time });
  if (AN_SPRITZ.length > 12) AN_SPRITZ.shift();
  if (typeof V3 !== 'undefined' && V3.on) return;
  if (typeof particles !== 'function') return;
  const lava = g === GROUND.LAVA;
  const col = lava ? ['#ffd36a', '#ff7a2a', '#ffb04a'] : g === GROUND.BOG ? ['#8a9a6a', '#c8d0a8', '#6a7a4a'] : g === GROUND.BLUTSEE ? ['#c83a3a', '#ff8a8a', '#8a1a1a'] : g === GROUND.ICE ? ['#e8f6ff', '#bfe6ff', '#ffffff'] : ['#e8f6ff', '#bfe0f8', '#ffffff'];
  particles(x, y - 2, { count: Math.round(9 * k), color: col, angle: -Math.PI / 2, spread: 1.1, speed: [30, 85], life: [0.3, 0.55], size: [1.1, 2.3], gravity: 240, drag: 1.2, glow: lava, shape: g === GROUND.ICE ? 'shard' : 'dot' });
}

// jedes Bild (über updateEffects): Ablauf, Abbruch, Anzeige
function anTick(dt) {
  const p = game.player;
  anKontextTick();
  if (!AN.phase) return;
  if (!p || p.dead || !game.running) { anEnde(null); return; }
  // Laufen, Reiten, Sprünge und Teleporte holen die Angel ein; ebenso ein Treffer oder ein Angriff
  if (p.moving || p.dash || p.riding || hyp(p.x - AN.x0, p.y - AN.y0) > 6) { anEnde(AN.phase === 'drill' ? 'Der Fisch ist weg.' : 'Eingeholt.'); return; }
  if ((p.lastCombat || -99) > AN.start + 0.05) { anEnde('Angegriffen – die Angel ist eingeholt.'); return; }
  if (p.swing > 0 && game.time - AN.start > 0.2) { anEnde(null); return; }
  const age = game.time - AN.t0;
  const fenster = typeof ui !== 'undefined' && ui.anyPanelOpen();
  switch (AN.phase) {
    case 'wurf':
      if (age >= ANGELN.wurf.dauer) {
        AN.phase = 'warten';
        AN.t0 = game.time;
        AN.bissAt = game.time + anWartezeit(p);
        // ein oder zwei Mal zuckt die Pose vorher (nur zum Anschauen)
        const n = Math.floor(Math.random() * 3);
        AN.zuck = [];
        for (let k = 0; k < n; k++) AN.zuck.push(game.time + 1.2 + Math.random() * Math.max(0.5, AN.bissAt - game.time - 2));
        anSpritzer(AN.ziel.x, AN.ziel.y, AN.ziel.g, 0.45);
        anTon(AN.ziel.g === GROUND.LAVA ? 'feuer_wirken' : AN.ziel.g === GROUND.ICE ? 'eis_splitter' : 'wasser', { x: AN.ziel.x, y: AN.ziel.y, vol: 0.18, rate: 1.8, maxDur: 0.3 });
      }
      break;
    case 'warten':
      // solange ein Fenster offen ist, beißt nichts
      if (fenster) AN.bissAt += dt;
      else if (game.time >= AN.bissAt) anBiss();
      break;
    case 'biss':
      if (fenster || age > anBissFenster()) anEntkommen('Zu spät – der Köder ist weg.');
      break;
    case 'drill':
      if (fenster) anEntkommen('Der Fisch ist weg.');
      else anDrillTick(dt);
      break;
    case 'fang':
      if (age > 0.9) anEnde(null);
      break;
    case 'weg':
      if (age > 0.7) anEnde(null);
      break;
  }
  anHudTick();
}

// Sichtbarer Zustand einer Figur (eigene oder Mitspieler): { ph, age, bx, by, g, tier, T, P, zc, zw } oder null
const _anVisEigen = { ph: '', age: 0, bx: 0, by: 0, g: 0, tier: 0, T: 0.5, P: 0, seq: 0, tipX: 0, tipY: 0 };
function anVis(e) {
  if (!e) return null;
  if (e === game.player) {
    if (!AN.phase || !AN.ziel) return null;
    const v = _anVisEigen;
    v.ph = AN.phase;
    v.age = game.time - AN.t0;
    v.bx = AN.ziel.x;
    v.by = AN.ziel.y;
    v.g = AN.ziel.g;
    v.tier = Math.max(0, anState(e).rute);
    v.T = AN.drill ? AN.drill.T : 0.45;
    v.P = AN.drill ? AN.drill.P : 0;
    v.seq = AN.seq;
    v.zuckt = AN.phase === 'warten' && AN.zuck.some((t) => game.time >= t && game.time - t < 0.45);
    return v;
  }
  const v = e.remote ? e.anV : null;
  if (!v) return null;
  v.age = game.time - v.t0;
  // Netzstand zu alt (Mitspieler weg, Verbindung hängt): nichts zeigen
  if (v.ph === 'fang' && v.age > 1.2) return null;
  if (v.ph === 'weg' && v.age > 1) return null;
  return v;
}

// --- Anzeige: Kontextknopf, Spannungsleiste, Aktionsknopf ----------------------------------------------------------
const ANHUD = { box: null, text: null, bar: null, zone: null, marke: null, fort: null, btn: null, btnText: null, btnKey: null, start: null, key: '', posAt: 0, sichtbar: false };
function anHudBau() {
  if (ANHUD.box) return;
  const hud = document.getElementById('hud') || document.body;
  anCss();
  const box = document.createElement('div');
  box.id = 'anHud';
  box.className = 'an-hud';
  box.hidden = true;
  box.innerHTML = '<div class="an-kopf"><span class="an-text"></span></div>' +
    '<div class="an-leiste" aria-hidden="true"><i class="an-zone"></i><b class="an-marke"></b></div>' +
    '<div class="an-fort" aria-hidden="true"><i></i></div>';
  hud.appendChild(box);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'btnAnAktion';
  btn.className = 'an-aktion';
  btn.hidden = true;
  btn.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40 L34 8" stroke-width="3.2"/><path d="M34 8 C40 14 40 24 38 30" stroke-width="1.4" fill="none"/><circle cx="38" cy="33" r="3.6"/><path d="M6 42 l5 -2 -3 -3z"/></svg><span class="an-lab"></span><kbd class="an-key"></kbd>`;
  hud.appendChild(btn);
  const start = document.createElement('button');
  start.type = 'button';
  start.id = 'btnAngeln';
  start.className = 'an-start';
  start.hidden = true;
  start.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 40 L34 8" stroke-width="3"/><path d="M34 8 C41 15 41 25 39 31" stroke-width="1.3" fill="none"/><path d="M33 33 c3 -3 8 -3 10 0 c-2 3 -7 3 -10 0z M33 33 l-3 -2.5 v5z"/></svg><span>Angeln</span>';
  // direkt im HUD (nicht in #touchControls, das am PC verborgen ist); die Regeln für .touch-talk gelten dort ebenso
  hud.appendChild(start);
  ANHUD.box = box;
  ANHUD.text = box.querySelector('.an-text');
  ANHUD.bar = box.querySelector('.an-leiste');
  ANHUD.zone = box.querySelector('.an-zone');
  ANHUD.marke = box.querySelector('.an-marke');
  ANHUD.fort = box.querySelector('.an-fort i');
  ANHUD.btn = btn;
  ANHUD.btnText = btn.querySelector('.an-lab');
  ANHUD.btnKey = btn.querySelector('.an-key');
  ANHUD.start = start;
  const down = (e) => {
    e.preventDefault();
    try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ohne Fangen geht es auch */ }
    btn.classList.add('active');
    anDruck(true);
  };
  const up = () => { btn.classList.remove('active'); anDruck(false); };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('lostpointercapture', up);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  start.addEventListener('click', (e) => { e.preventDefault(); anStart(); });
}
// Knopf über dem Angriffsknopf (Handy) bzw. in der Leiste (PC)
function anHudLage() {
  const b = ANHUD.btn;
  if (!b) return;
  const touch = typeof input !== 'undefined' && input.touchUi;
  b.classList.toggle('an-touch', !!touch);
  if (!touch) { b.style.left = b.style.top = b.style.width = b.style.height = ''; return; }
  const a = document.getElementById('btnAttack');
  const r = a ? a.getBoundingClientRect() : null;
  if (r && r.width > 10) {
    const s = Math.max(r.width, 72);
    b.style.left = Math.round(r.left + r.width / 2 - s / 2) + 'px';
    b.style.top = Math.round(r.top + r.height / 2 - s / 2) + 'px';
    b.style.width = b.style.height = Math.round(s) + 'px';
  } else {
    b.style.left = b.style.top = '';
    b.style.width = b.style.height = '';
  }
}
function anHudZeigen() {
  anHudBau();
  const an = !!AN.phase;
  ANHUD.box.hidden = !an;
  ANHUD.btn.hidden = !an;
  ANHUD.sichtbar = an;
  ANHUD.key = '';
  if (an) {
    anHudLage();
    if (ANHUD.start) ANHUD.start.hidden = true;
    anHudTick();
  }
}
const anTaste = () => (typeof keyLabel === 'function' && typeof actionKey === 'function' ? keyLabel(actionKey('attack')) : 'Leertaste');
function anHudTick() {
  if (!ANHUD.box || !AN.phase) return;
  const ph = AN.phase;
  const D = AN.drill;
  let text = '';
  let knopf = '';
  let cls = '';
  if (ph === 'wurf') { text = 'Auswerfen …'; knopf = 'Einholen'; }
  else if (ph === 'warten') { text = 'Warte auf einen Biss …'; knopf = 'Einholen'; }
  else if (ph === 'biss') { text = 'Biss!'; knopf = 'Anschlagen!'; cls = 'biss'; }
  else if (ph === 'drill') {
    const lo = D.zc - D.zw / 2;
    const hi = D.zc + D.zw / 2;
    text = D.T > hi ? 'Locker lassen!' : D.T < lo ? 'Einholen!' : 'Gut so – halten!';
    knopf = 'Halten: Einholen';
    cls = D.T > hi + 0.08 ? 'straff' : D.T < lo - 0.08 ? 'locker' : 'gut';
  } else if (ph === 'fang') { text = 'Gefangen!'; knopf = ''; cls = 'fang'; }
  else { text = 'Weg …'; knopf = ''; cls = 'weg'; }
  const key = ph + '|' + text + '|' + cls;
  if (key !== ANHUD.key) {
    ANHUD.key = key;
    ANHUD.text.textContent = text;
    ANHUD.box.className = 'an-hud ' + (D ? 'drill ' : '') + cls;
    ANHUD.btnText.textContent = knopf;
    ANHUD.btnKey.textContent = typeof input !== 'undefined' && !input.touchUi && knopf ? anTaste() : '';
    ANHUD.btn.className = 'an-aktion' + (input && input.touchUi ? ' an-touch' : '') + (ph === 'biss' ? ' biss' : '') + (ph === 'drill' ? ' drill' : '');
    ANHUD.btn.disabled = !knopf;
  }
  if (D) {
    ANHUD.zone.style.left = ((D.zc - D.zw / 2) * 100).toFixed(1) + '%';
    ANHUD.zone.style.width = (D.zw * 100).toFixed(1) + '%';
    ANHUD.marke.style.left = (D.T * 100).toFixed(1) + '%';
    ANHUD.fort.style.width = (D.P * 100).toFixed(1) + '%';
  }
  if (performance.now() - ANHUD.posAt > 600) { ANHUD.posAt = performance.now(); anHudLage(); }
}
// Kontextknopf „Angeln“ (Handy: neben „Sprechen“; PC: kleiner Hinweis über der Leiste), viermal je Sekunde geprüft
function anKontextTick() {
  const now = performance.now();
  if (now - AN.kontextAt < 250) return;
  AN.kontextAt = now;
  const p = game.player;
  let zeig = false;
  if (p && game.running && !AN.phase && !p.dead && anState(p).rute >= 0 && !(typeof ui !== 'undefined' && ui.anyPanelOpen()) && !game.duel) {
    const z = anZiel(p);
    zeig = !!z && !(p.riding && typeof rideTierOf === 'function' && rideTierOf(p) === 3 && !p.dragonGround);
  }
  if (!zeig && !ANHUD.start) return;
  anHudBau();
  const s = ANHUD.start;
  const touch = typeof input !== 'undefined' && input.touchUi;
  const talk = document.getElementById('btnTalk');
  s.className = 'an-start' + (touch ? ' touch-talk' : ' an-pc') + (touch && talk && !talk.hidden ? ' an-hoch' : '');
  // PC: mit Taste; wechselt das Gerät auf Touch, wieder ohne
  const k = touch ? '' : typeof keyLabel === 'function' && typeof actionKey === 'function' ? keyLabel(actionKey('angeln')) : 'K';
  const lab = s.querySelector('span');
  if (lab && (lab.dataset.k || '') !== k) { lab.dataset.k = k; lab.innerHTML = k ? `<kbd>${anEsc(k)}</kbd> Angeln` : 'Angeln'; }
  s.hidden = !zeig;
}

// --- Tastatur ---------------------------------------------------------------------------------------------------
if (typeof KEY_ACTIONS !== 'undefined' && !KEY_ACTIONS.some((a) => a.id === 'angeln')) {
  const at = KEY_ACTIONS.findIndex((a) => a.id === 'interact');
  KEY_ACTIONS.splice(at >= 0 ? at + 1 : KEY_ACTIONS.length, 0, { id: 'angeln', label: 'Angeln', key: 'KeyK' });
}
if (typeof runAction === 'function') {
  const _anRunAction = runAction;
  // eslint-disable-next-line no-global-assign
  runAction = function (id, e) {
    if (id === 'angeln') {
      if (!(e && e.repeat)) anStart();
      return;
    }
    return _anRunAction.apply(this, arguments);
  };
}
// Sprechen/Aufheben (F) am Wasser ohne jemanden in der Nähe: angeln
if (typeof interact === 'function') {
  const _anInteract = interact;
  // eslint-disable-next-line no-global-assign
  interact = function () {
    const p = game.player;
    if (AN.phase) { anDruck(true); later(0.12, () => { if (AN.phase !== 'drill') AN.hold = false; }); return; }
    if (!game.nearNpc && p && anState(p).rute >= 0 && anZiel(p)) { anStart(); return; }
    return _anInteract.apply(this, arguments);
  };
}
// Freie Plätze der Leiste: „Angeln“ belegbar
if (typeof QUICK_ACTIONS !== 'undefined' && typeof QUICK_SVG !== 'undefined') {
  QUICK_SVG.angeln = '<svg viewBox="0 0 24 24"><path d="M4 21L17 4"/><path d="M17 4c3 3 3 8 2 11"/><circle class="fill" cx="19" cy="17" r="2.2"/></svg>';
  QUICK_ACTIONS.angeln = { label: 'Angeln', svg: 'angeln' };
}
// Während des Angelns gehören Leertaste, Angeln- und Sprechen-Taste dem Angeln (Anschlagen, gedrückt halten im Drill)
function anTastenFang(e) {
  if (!AN.phase || !game.running) return false;
  // in Fenstern (z. B. beim Neubelegen einer Taste) gehören die Tasten dem Fenster
  if (typeof ui !== 'undefined' && ui.anyPanelOpen()) return false;
  const t = e.target;
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return false;
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const act = typeof keyAction === 'function' ? keyAction(e.code) : null;
  return e.code === 'Space' || act === 'attack' || act === 'angeln' || act === 'interact';
}
window.addEventListener('keydown', (e) => {
  if (!anTastenFang(e)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (!e.repeat) anDruck(true);
}, true);
window.addEventListener('keyup', (e) => {
  if (!anTastenFang(e)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  anDruck(false);
}, true);
document.addEventListener('visibilitychange', () => { if (document.hidden) AN.hold = false; });

// Takt: an updateEffects (spiel.js ruft es in jedem Bild)
if (typeof updateEffects === 'function') {
  const _anUpdateEffects = updateEffects;
  // eslint-disable-next-line no-global-assign
  updateEffects = function (dt) {
    _anUpdateEffects(dt);
    try { anTick(dt); } catch (err) { anFehler(err); }
  };
}

// --- 2D: Angel in der Hand, Schnur und Pose ----------------------------------------------------------------------
const AN_ROD2D = { len: 56, bounds: { x: -9, y: -6, w: 72, h: 13 } };
function anRuteArt(g, tier) {
  const R = ANGELN.ruten[Math.max(0, Math.min(ANGELN.ruten.length - 1, tier | 0))];
  const L = AN_ROD2D.len;
  // Rute: vom Griff zur Spitze dünner
  g.fillStyle = R.rute;
  g.beginPath();
  g.moveTo(8, -1.25);
  g.lineTo(L, -0.45);
  g.lineTo(L, 0.45);
  g.lineTo(8, 1.25);
  g.closePath();
  g.fill();
  if (R.knoten) { g.fillStyle = R.knoten; for (const x of [20, 31, 42]) g.fillRect(x, -1.1, 1.2, 2.2); }
  if (R.glut) { g.fillStyle = R.glut; g.globalAlpha = 0.6; g.fillRect(14, -0.35, L - 18, 0.7); g.globalAlpha = 1; }
  // Griff
  g.fillStyle = R.griff;
  g.beginPath();
  g.moveTo(-7, -1.8); g.lineTo(9, -1.5); g.lineTo(9, 1.5); g.lineTo(-7, 1.8); g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(-6, -1.6, 14, 0.8);
  // Ringe, Rolle, Spitze
  g.fillStyle = R.ring;
  for (const x of [22, 34, 46]) g.fillRect(x - 0.7, 0.8, 1.4, 1.6);
  if (R.rolle) {
    g.fillStyle = R.rolle;
    g.beginPath(); g.arc(3, 3.4, 2.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.arc(3, 3.4, 1, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = R.spitze;
  g.beginPath(); g.arc(L, 0, 1.1, 0, Math.PI * 2); g.fill();
}
function anRuteSprite(tier) {
  return getSprite('angel2d:' + tier, AN_ROD2D.bounds, (g) => anRuteArt(g, tier));
}
// Grundwinkel der Angel je Blickrichtung (Figur schaut nach rechts bzw. zum Betrachter, Bogenmaß)
const AN_WINKEL = { side: -0.62, down: 1.2, up: -1.32 };
function anWinkel2d(v, dir) {
  const base = AN_WINKEL[dir];
  const a = v.age;
  const ease = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
  switch (v.ph) {
    case 'wurf':
      if (a < 0.12) return base - 1.9 * ease(a / 0.12);
      if (a < 0.3) return base - 1.9 + 2.25 * ease((a - 0.12) / 0.18);
      return base + 0.35 - 0.35 * ease((a - 0.3) / 0.3);
    case 'warten': return base + 0.03 * Math.sin(game.time * 1.3) + (v.zuckt ? 0.08 : 0);
    case 'biss': return base + 0.1 * Math.sin(game.time * 34);
    case 'drill': return base - 0.45 - 0.2 * (v.T || 0) + 0.06 * Math.sin(game.time * 22) * (v.T || 0);
    case 'fang': return base - 0.95 * ease(a / 0.35);
    default: return base + 0.1;
  }
}
function anRute2d(ctx, p, v, dir) {
  const fy = feetY(p);
  const flip = dir === 'side' && p.facing.x < 0;
  const gs = typeof lookSize === 'function' ? lookSize(p.look) : 1;
  const hand = handPosition(dir, 0, 'right');
  const ang = anWinkel2d(v, dir);
  const L = AN_ROD2D.len;
  ctx.save();
  if ((p === game.player && game.stats && game.stats.invisible) || (p.remote && p.invisible)) ctx.globalAlpha *= 0.35;
  ctx.translate(p.x, fy);
  if (flip) ctx.scale(-1, 1);
  if (gs !== 1) ctx.scale(gs, gs);
  ctx.translate(hand.x, hand.y);
  ctx.rotate(ang);
  const sp = anRuteSprite(v.tier);
  const b = sp.bounds;
  ctx.drawImage(sp.img, b.x, b.y, b.w, b.h);
  ctx.restore();
  const tx = hand.x + Math.cos(ang) * L;
  const ty = hand.y + Math.sin(ang) * L;
  v.tipX = p.x + (flip ? -tx : tx) * gs;
  v.tipY = fy + ty * gs;
}
// Bodenpunkt in die Zeichenfläche der Figur umrechnen: in der schrägen Sicht wird jede Figur aufrecht mit eigenem
// Maßstab gezeichnet (pixel2d.js), der Boden aber verzerrt – dort über den Bildschirmpunkt zurückrechnen
const _anTp = { x: 0, y: 0, s: 1 };
function anBodenPunkt(ctx, wx, wy, out) {
  out.x = wx;
  out.y = wy;
  if (typeof TILT === 'undefined' || !TILT.on || typeof worldToScreen2d !== 'function' || !ctx.getTransform) return out;
  try {
    const sp = worldToScreen2d(wx, wy, _anTp);
    const pu = renderer.zoom * PIX.units;
    const q = ctx.getTransform().inverse().transformPoint({ x: sp.x / pu, y: sp.y / pu });
    if (Number.isFinite(q.x) && Number.isFinite(q.y)) { out.x = q.x; out.y = q.y; }
  } catch (err) { /* flach weiter */ }
  return out;
}
// Endpunkt der Schnur im Drill (Welt): der Fisch zieht hin und her und kommt näher, bleibt aber im Wasser (gleicher
// Boden wie die Pose; sonst weniger nah). Unter dem Eis bleibt die Schnur im Loch.
const _anD = { x: 0, y: 0 };
const AN_NAEHER = [1, 0.6, 0.3, 0];
function anDrillPunkt(e, v, out) {
  const t = game.time;
  if (v.g === GROUND.ICE) { out.x = v.bx + Math.sin(t * 13) * 1.2; out.y = v.by + Math.cos(t * 11) * 0.8; return out; }
  const P = v.P || 0;
  const fy = feetY(e);
  const gr = game.world ? game.world.ground : null;
  for (const k of AN_NAEHER) {
    const a = 0.55 * P * k;
    out.x = e.x + (v.bx - e.x) * (1 - a) + Math.sin(t * 2.3) * 9 * (1 - P);
    out.y = fy + (v.by - fy) * (1 - a) + Math.cos(t * 1.7) * 5 * (1 - P);
    if (!gr || gr[Math.floor(out.y / TILE) * MAP_W + Math.floor(out.x / TILE)] === v.g) break;
  }
  return out;
}
const _anB = { x: 0, y: 0 };
const _anH = { x: 0, y: 0 };
function anSchnur2d(ctx, p, v) {
  if (!Number.isFinite(v.tipX)) return;
  const t = game.time;
  // wo die Pose ist (Wurf: im Bogen unterwegs; Drill: der Fisch zieht hin und her und kommt näher)
  let wx = v.bx;
  let wy = v.by;
  let lift = 0;
  let unter = false;
  if (v.ph === 'wurf') {
    const u = (v.age - ANGELN.wurf.los) / (ANGELN.wurf.dauer - ANGELN.wurf.los);
    if (u <= 0) return;
    const k = Math.min(1, u);
    anBodenPunkt(ctx, v.bx, v.by, _anB);
    const x = v.tipX + (_anB.x - v.tipX) * k;
    const y = v.tipY + (_anB.y - v.tipY) * k - Math.sin(k * Math.PI) * 26;
    anLinie2d(ctx, v.tipX, v.tipY, x, y, 2);
    anPose2d(ctx, x, y, v, false);
    return;
  }
  if (v.ph === 'drill') {
    anDrillPunkt(p, v, _anD);
    wx = _anD.x;
    wy = _anD.y;
    unter = true;
  } else if (v.ph === 'biss') {
    unter = Math.sin(t * 16) > -0.3;
  } else if (v.ph === 'fang' || v.ph === 'weg') {
    const k = Math.min(1, v.age / 0.35);
    anBodenPunkt(ctx, v.bx, v.by, _anB);
    const x = _anB.x + (v.tipX - _anB.x) * k;
    const y = _anB.y + (v.tipY - _anB.y) * k - Math.sin(k * Math.PI) * 14;
    if (k < 1) { anLinie2d(ctx, v.tipX, v.tipY, x, y, 1); anPose2d(ctx, x, y, v, false); }
    return;
  } else {
    lift = Math.sin(t * 3.1) * 0.8 + (v.zuckt ? 1.6 : 0);
  }
  anBodenPunkt(ctx, wx, wy, _anB);
  if (v.g === GROUND.ICE) {
    // Eisloch unter der Pose
    anBodenPunkt(ctx, v.bx, v.by, _anH);
    ctx.fillStyle = 'rgba(210,235,250,0.9)';
    ctx.beginPath(); ctx.ellipse(_anH.x, _anH.y, 8.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#123a5a';
    ctx.beginPath(); ctx.ellipse(_anH.x, _anH.y + 0.4, 6.8, 3.8, 0, 0, Math.PI * 2); ctx.fill();
  }
  anLinie2d(ctx, v.tipX, v.tipY, _anB.x, _anB.y + lift, v.ph === 'warten' ? 12 : 2);
  if (unter) {
    // Schnur taucht ein: kleine Wellenkämme statt der Pose
    ctx.fillStyle = v.g === GROUND.LAVA ? 'rgba(255,190,90,0.9)' : 'rgba(240,250,255,0.85)';
    for (let k = 0; k < 3; k++) { const a = t * 9 + k * 2.1; ctx.fillRect(_anB.x + Math.cos(a) * 3.2 - 0.8, _anB.y + Math.sin(a) * 1.4, 1.6, 1.1); }
  } else anPose2d(ctx, _anB.x, _anB.y + lift, v, true);
}
function anLinie2d(ctx, x0, y0, x1, y1, sag) {
  const pix = typeof PIX !== 'undefined' && PIX.inWorld;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(245,242,232,0.9)';
  ctx.lineWidth = pix ? PIX.units : 0.8;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1);
  ctx.stroke();
  ctx.restore();
}
function anPose2d(ctx, x, y, v, schwimmt) {
  const lava = v.g === GROUND.LAVA;
  ctx.save();
  if (schwimmt) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(x, y + 1.5, 3.6, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = lava ? '#3a3440' : '#f4f0e6';
  ctx.beginPath(); ctx.ellipse(x, y, 2.6, 2.1, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = lava ? '#ffb04a' : '#e0402a';
  ctx.beginPath(); ctx.ellipse(x, y, 2.6, 2.3, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 0.4, y - 4.6, 0.8, 2.6);
  ctx.restore();
}
if (typeof drawPlayer === 'function') {
  const _anDrawPlayer = drawPlayer;
  // eslint-disable-next-line no-global-assign
  drawPlayer = function (ctx, p) {
    const v = p && !p.riding && !p.dead && !(p.blinkHide > game.time) ? anVis(p) : null;
    if (!v) return _anDrawPlayer(ctx, p);
    const dir = facingDir(p.facing || { x: 0, y: 1 });
    // ohne Waffe und Nebenhand zeichnen (beide Hände an der Angel), die Angel selbst dahinter (Blick nach oben) oder davor
    try { if (dir === 'up') anRute2d(ctx, p, v, dir); } catch (err) { anFehler(err); }
    const eq = p.equipment;
    if (eq) p.equipment = Object.assign({}, eq, { waffe: null, schild: null });
    try { _anDrawPlayer(ctx, p); } finally { p.equipment = eq; }
    try {
      if (dir !== 'up') anRute2d(ctx, p, v, dir);
      anSchnur2d(ctx, p, v);
    } catch (err) { anFehler(err); }
  };
}

// --- 3D: Angel im Modell, Haltung, Schnur, Pose, Tropfen ------------------------------------------------------------
// Beim Angeln wird die Figur mit der Angel statt der Waffe gebaut (eigener Modellschlüssel, beim zweiten Mal aus dem
// Vorrat). Die Angel: Griff, sich verjüngende Rute, Ringe, ab der Eschenrute eine Rolle, glühende Ringe ab Glutfaser.
const AN3_LEN = 1.35;
if (typeof WEAPON_HOLD !== 'undefined') {
  // angel: vorgestreckter Arm, Rute schräg nach vorn oben · angelr: aufrecht in der Hand (Fischerin)
  WEAPON_HOLD.angel = [1.685, 0, 0];
  WEAPON_HOLD.angelr = [0.3, 0, 0.12];
}
if (typeof WEAPON_LEN3 !== 'undefined') { WEAPON_LEN3.angel = AN3_LEN; WEAPON_LEN3.angelr = AN3_LEN; }
function anRute3(W, tier) {
  const R = ANGELN.ruten[Math.max(0, Math.min(ANGELN.ruten.length - 1, tier | 0))];
  const L = AN3_LEN;
  W(limb3(0.27, 0.024, 0.027, 7), R.g3, { p: [0, 0.1, 0] });
  W(sphere3(0.03, 7, 5), R.g3, { p: [0, -0.17, 0] });
  W(limb3(+(L - 0.08).toFixed(2), 0.006, 0.016, 6), R.r3, { p: [0, L, 0] });
  const ringMat = R.glut ? { mat: 'glow' } : { shine: 0.8 };
  for (const u of [0.38, 0.62, 0.84]) W(torus3(0.017, 0.0045, Math.PI * 2, 3, 8), R.ring, Object.assign({ p: [0, u * L, 0.018], r: [0, Math.PI / 2, 0] }, ringMat));
  if (R.rolle) {
    W(cyl3(0.042, 0.042, 0.03, 10), R.rolle, { p: [0, 0.03, 0.06], r: [0, 0, Math.PI / 2], shine: 0.9 });
    W(limb3(0.05, 0.009, 0.009, 5), R.rolle, { p: [0, 0.03, 0.06], r: [Math.PI / 2, 0, 0] });
  }
  W(sphere3(0.014, 6, 4), R.spitze, Object.assign({ p: [0, L, 0] }, R.glut ? { mat: 'glow' } : {}));
}
if (typeof weapon3 === 'function') {
  const _anWeapon3 = weapon3;
  // eslint-disable-next-line no-global-assign
  weapon3 = function (A, kind, tier, bone, at, rot) {
    if (kind !== 'angel' && kind !== 'angelr') return _anWeapon3.apply(this, arguments);
    anRute3(framed(A, partFrame(at, rot), bone), tier);
  };
}
if (typeof playerKey3 === 'function') {
  const _anPlayerKey3 = playerKey3;
  // eslint-disable-next-line no-global-assign
  playerKey3 = function (p) {
    const k = _anPlayerKey3(p);
    const v = p && !p.riding ? anVis(p) : null;
    return v ? k + '|angel' + v.tier : k;
  };
}
if (typeof playerConfig3 === 'function') {
  const _anPlayerConfig3 = playerConfig3;
  // eslint-disable-next-line no-global-assign
  playerConfig3 = function (p) {
    const c = _anPlayerConfig3(p);
    const v = p && !p.riding ? anVis(p) : null;
    if (v && c) {
      c.weapon = { kind: 'angel', tier: v.tier };
      delete c.offhand;
      delete c.shield;
      delete c.shieldItem;
    }
    return c;
  };
}
// Haltung: nach der übrigen Bewegung (syncPlayer3) die Arme an die Angel
if (typeof syncPlayer3 === 'function') {
  const _anSyncPlayer3 = syncPlayer3;
  // eslint-disable-next-line no-global-assign
  syncPlayer3 = function (p, dt) {
    _anSyncPlayer3(p, dt);
    const v = p && !p.riding ? anVis(p) : null;
    if (!v) return;
    const a = typeof actors3 !== 'undefined' ? actors3.get(entityKey(p)) : null;
    if (!a || !a.bones || !a.modelKey || a.modelKey.indexOf('|angel') < 0) return;
    const B = a.bones;
    const t = game.time;
    const ease = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
    let arm = -0.9;
    let brust = 0;
    if (v.ph === 'wurf') {
      const g = v.age;
      arm = g < 0.12 ? -0.9 - 1.8 * ease(g / 0.12) : g < 0.3 ? -2.7 + 2.15 * ease((g - 0.12) / 0.18) : -0.55 - 0.35 * ease((g - 0.3) / 0.3);
      brust = g < 0.3 ? 0.12 : 0;
    } else if (v.ph === 'warten') arm = -0.9 + 0.03 * Math.sin(t * 1.3) - (v.zuckt ? 0.06 : 0);
    else if (v.ph === 'biss') arm = -0.95 + 0.06 * Math.sin(t * 30);
    else if (v.ph === 'drill') { arm = -1.15 - 0.3 * (v.T || 0) + 0.05 * Math.sin(t * 18) * (v.T || 0); brust = -0.14; }
    else if (v.ph === 'fang') arm = -0.9 - 0.85 * ease(v.age / 0.35);
    B[BH.armR].rotation.set(arm, 0, -0.1);
    B[BH.handR].rotation.set(0, 0, 0);
    B[BH.armL].rotation.set(Math.min(-0.5, arm * 0.85), 0, 0.42);
    B[BH.handL].rotation.set(0, 0, 0);
    B[BH.chest].rotation.x += brust;
    // Lage der Knochen gleich neu rechnen: die Schnur (anFx3, weaponAxis3) beginnt sonst an der Spitze der alten Haltung
    a.group.updateMatrixWorld(true);
  };
}
// Höhe der Oberfläche (Einheiten) an einer Stelle: wie die Flüssigkeiten in drei-kern.js, Eis liegt auf dem Boden
function anOberflaeche3(g) {
  if (g === GROUND.ICE) return 0.025;
  if (typeof LIQUID3 === 'undefined') return -0.14;
  const kind = g === GROUND.LAVA ? 'lava' : g === GROUND.BOG ? 'bog' : g === GROUND.WATER ? 'water' : (typeof LIQUID3_GROUND !== 'undefined' && LIQUID3_GROUND[g]) || 'water';
  const L = LIQUID3[kind];
  return L && L.level != null ? L.level : -0.14;
}
const _an3b = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
const _an3t = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
const _an3a = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
const _an3c = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
const _an3Liste = [];
function anFx3(h) {
  if (typeof V3 === 'undefined' || !V3.on || typeof fx3Take !== 'function') return;
  _an3Liste.length = 0;
  if (game.player && game.running) _an3Liste.push(game.player);
  if (typeof net !== 'undefined' && net.players) for (const rp of net.players.values()) if (rp.anV) _an3Liste.push(rp);
  const low = typeof n3low === 'function' && n3low();
  const t = game.time;
  for (const e of _an3Liste) {
    const v = !e.riding && !e.dead ? anVis(e) : null;
    if (!v || (typeof v3InView === 'function' && !v3InView(e.x, e.y, 260))) continue;
    if (typeof weaponAxis3 !== 'function' || !weaponAxis3(e, _an3b, _an3t)) continue;
    const surf = anOberflaeche3(v.g);
    // Pose: im Wurf im Bogen, im Drill unter Wasser (der Fisch zieht), beim Fang zurück zur Spitze
    let px = v.bx * U3;
    let pz = v.by * U3;
    let py = surf + 0.02;
    let unter = false;
    let zeig = true;
    if (v.ph === 'wurf') {
      const u = (v.age - ANGELN.wurf.los) / (ANGELN.wurf.dauer - ANGELN.wurf.los);
      if (u <= 0) continue;
      const k = Math.min(1, u);
      px = _an3t.x + (px - _an3t.x) * k;
      pz = _an3t.z + (pz - _an3t.z) * k;
      py = _an3t.y + (py - _an3t.y) * k + Math.sin(k * Math.PI) * 0.6;
    } else if (v.ph === 'warten') py += Math.sin(t * 3.1) * 0.012 - (v.zuckt ? 0.03 : 0);
    else if (v.ph === 'biss') { py -= 0.05 + 0.03 * Math.sin(t * 16); unter = Math.sin(t * 16) > -0.3; }
    else if (v.ph === 'drill') {
      anDrillPunkt(e, v, _anD);
      px = _anD.x * U3;
      pz = _anD.y * U3;
      unter = true;
    } else {
      const k = Math.min(1, v.age / 0.35);
      if (k >= 1) zeig = false;
      px += (_an3t.x - px) * k;
      pz += (_an3t.z - pz) * k;
      py += (_an3t.y - py) * k;
    }
    if (!zeig) continue;
    // Schnur: leicht durchhängende Kurve aus kurzen Stäben
    const n = low ? 5 : 9;
    const sag = v.ph === 'warten' ? 0.22 : v.ph === 'wurf' ? 0.05 : 0.03;
    let lx = _an3t.x;
    let ly = _an3t.y;
    let lz = _an3t.z;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const x = _an3t.x + (px - _an3t.x) * u;
      const z = _an3t.z + (pz - _an3t.z) * u;
      const y = _an3t.y + (py - _an3t.y) * u - sag * 4 * u * (1 - u);
      _an3a.set(lx, ly, lz);
      _an3c.set(x, y, z);
      const sg = fx3Take(h, 'segN');
      fx3Segment(sg, _an3a, _an3c, 0.0065);
      fx3Color(sg, '#f2efe4', 0.9);
      lx = x;
      ly = y;
      lz = z;
    }
    if (v.g === GROUND.ICE) {
      const hole = fx3Take(h, 'ball');
      hole.position.set(v.bx * U3, 0.012, v.by * U3);
      hole.scale.set(0.24, 0.006, 0.16);
      hole.quaternion.identity();
      fx3Color(hole, '#123a5a', 1);
    }
    if (!unter) {
      const lava = v.g === GROUND.LAVA;
      const b1 = fx3Take(h, 'ball');
      b1.position.set(px, py + 0.025, pz);
      b1.scale.set(0.05, 0.045, 0.05);
      b1.quaternion.identity();
      fx3Color(b1, lava ? '#ffb04a' : '#e0402a', 1);
      const b2 = fx3Take(h, 'ball');
      b2.position.set(px, py - 0.005, pz);
      b2.scale.set(0.048, 0.03, 0.048);
      b2.quaternion.identity();
      fx3Color(b2, lava ? '#3a3440' : '#f4f0e6', 1);
    } else if (typeof n3Smoke === 'function') {
      for (let k = 0; k < (low ? 1 : 3); k++) {
        const a = t * 9 + k * 2.1;
        n3Smoke(h, px + Math.cos(a) * 0.1, surf + 0.03, pz + Math.sin(a) * 0.1, 0.09, v.g === GROUND.LAVA ? '#ffc070' : '#f0faff', 0.75);
      }
    }
  }
  // Tropfen der Spritzer (eigene und von Mitspielern)
  if (typeof n3Smoke !== 'function') return;
  for (const s of AN_SPRITZ) {
    const age = t - s.t;
    if (age > 0.65 || age < 0) continue;
    if (typeof v3InView === 'function' && !v3InView(s.x, s.y, 200)) continue;
    const surf = anOberflaeche3(s.g);
    const lava = s.g === GROUND.LAVA;
    const col = lava ? '#ffb04a' : s.g === GROUND.BOG ? '#b8c098' : s.g === GROUND.BLUTSEE ? '#d84a4a' : '#eef8ff';
    const n = Math.round((low ? 4 : 8) * Math.min(1.4, s.k));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + s.x * 0.01;
      const sp = 0.35 + ((k * 37) % 10) / 22;
      const vy = 1.6 + ((k * 53) % 10) / 9;
      const y = surf + vy * age - 4.6 * age * age;
      if (y < surf - 0.05) continue;
      n3Smoke(h, s.x * U3 + Math.cos(a) * sp * age, y, s.y * U3 + Math.sin(a) * sp * age, 0.055, col, 0.85 * (1 - age / 0.65));
    }
  }
}
if (typeof FX3_HOOKS !== 'undefined') FX3_HOOKS.push({ parts: [], fn: anFx3 });

// --- Netz: Mitspieler sehen Angel, Schnur und Pose ----------------------------------------------------------------
// Zustand „an“: [Phase 1–6, Pose x, Pose y, Angelstufe 0–4, Wurf-Nr., Spannung 0–100, Fang 0–100, Boden]
function anNetZustand() {
  const p = game.player;
  if (!AN.phase || !AN.ziel || !p) return null;
  const D = AN.drill;
  return [AN_PH[AN.phase], AN.ziel.x, AN.ziel.y, Math.max(0, anState(p).rute), AN.seq, D ? Math.round(D.T * 100) : 45, D ? Math.round(D.P * 100) : 0, AN.ziel.g];
}
const AN_NETZ_BODEN = typeof GROUND !== 'undefined' ? new Set([GROUND.WATER, GROUND.BOG, GROUND.LAVA, GROUND.BLUTSEE, GROUND.ICE]) : new Set();
// fremden Zustand prüfen: nur bekannte Phasen, Angelstufen, Böden; Lage in der Welt und nah bei der Figur
function anNetIn(rp, a) {
  if (!Array.isArray(a) || a.length < 5) { rp.anV = null; return; }
  // nur Zahlen 1–6 (kein Zugriff über fremde Schlüssel wie „constructor“)
  const ph = Number.isInteger(a[0]) && a[0] > 0 && a[0] < AN_PH_NAME.length ? AN_PH_NAME[a[0]] : null;
  const bx = Number(a[1]);
  const by = Number(a[2]);
  const tier = a[3];
  const seq = a[4];
  if (!ph || !Number.isFinite(bx) || !Number.isFinite(by) || !Number.isInteger(tier) || tier < 0 || tier >= ANGELN.ruten.length || !Number.isInteger(seq)) { rp.anV = null; return; }
  if (bx < 0 || by < 0 || bx > MAP_W * TILE || by > MAP_H * TILE || hyp(bx - rp.x, by - rp.y) > 7 * TILE) { rp.anV = null; return; }
  const g = AN_NETZ_BODEN.has(a[7]) ? a[7] : GROUND.WATER;
  const T = Math.max(0, Math.min(100, Number(a[5]) || 0)) / 100;
  const P = Math.max(0, Math.min(100, Number(a[6]) || 0)) / 100;
  const old = rp.anV;
  if (!old || old.seq !== seq || old.ph !== ph) {
    rp.anV = { ph, bx, by, tier, seq, g, T, P, t0: game.time, age: 0, tipX: NaN, tipY: NaN };
    if (ph === 'biss' || ph === 'fang' || (ph === 'warten' && (!old || old.ph === 'wurf'))) anSpritzer(bx, by, g, ph === 'warten' ? 0.45 : 1);
  } else {
    old.T = T;
    old.P = P;
  }
}
if (typeof netPlayerState === 'function') {
  const _anNetState = netPlayerState;
  // eslint-disable-next-line no-global-assign
  netPlayerState = function () {
    const s = _anNetState.apply(this, arguments);
    try {
      const a = anNetZustand();
      if (a && s) s.an = a;
    } catch (err) { anFehler(err); }
    return s;
  };
}
if (typeof netApplyState === 'function') {
  const _anNetApply = netApplyState;
  // eslint-disable-next-line no-global-assign
  netApplyState = function (rp, s) {
    const r = _anNetApply.apply(this, arguments);
    try { if (rp && s) anNetIn(rp, s.an); } catch (err) { anFehler(err); }
    return r;
  };
}

// --- Vorrat in der Tasche, Verkaufen -----------------------------------------------------------------------------
function fangTipHtml(d, n) {
  const p = game.player;
  const S = p ? anState(p) : null;
  const art = d.art === 'fisch' ? `${anRarName(d.r)} · ${AN_POOLS[d.pool] ? AN_POOLS[d.pool].name : ''}${d.nacht ? ' · nur nachts' : ''}`
    : d.art === 'plunder' ? 'Plunder' : d.art === 'ware' ? 'Wertsache' : d.art === 'zutat' ? 'Zutat zum Kochen' : d.art === 'mahl' ? 'Gericht' : '';
  const rk = d.art === 'fisch' && S ? anInt(S.rek[d.id], 0, 1e9) : 0;
  const rek = rk ? ` · Rekord ${anKg(rk)}` : '';
  const text = d.art === 'mahl' && typeof kochMahlText === 'function' ? kochMahlText(d) : d.text || (d.art === 'fisch' ? 'Zum Kochen oder für den Händler.' : '');
  return `<strong style="color:${fangFarbe(d)}"><span>${anEsc(d.name)}</span> × ${anDe(n)}</strong><small>${anEsc(art)}${rek}</small>` +
    (text ? `<span>${text}</span>` : '') + `<span>Händler zahlen ${anDe(fangPreis(d))} Gold je Stück</span>`;
}
function fangVerkaufen(id, n) {
  const p = game.player;
  const d = fangDef(id);
  if (!p || !d || !(typeof nearTrader === 'function' && nearTrader())) return 0;
  n = Math.min(Math.floor(n), fangN(p, id));
  if (!(n > 0) || !fangTake(p, id, n)) return 0;
  const g = n * fangPreis(d);
  p.gold += g;
  anTon('gold', { vol: 0.3 }, 'coin');
  if (typeof saveGame === 'function') saveGame();
  return g;
}
if (typeof gear !== 'undefined') {
  const _anSupplyList = gear.supplyList;
  gear.supplyList = function () {
    const out = _anSupplyList.apply(this, arguments);
    const p = game.player;
    if (p) for (const { d, n } of fangListe(p)) out.push({ key: 'fang:' + d.id, n, fang: d });
    return out;
  };
  const _anSupplyTile = gear.supplyTile;
  gear.supplyTile = function (x, picked) {
    if (!x || !x.fang) return _anSupplyTile.apply(this, arguments);
    const d = x.fang;
    const tip = typeof escTip === 'function' ? escTip(fangTipHtml(d, x.n)) : '';
    return `<button type="button" class="item-tile sup-tile fang-tile rar-${Math.max(0, Math.min(4, d.r | 0))}" data-sup="${x.key}"${picked ? ' data-picked="1"' : ''} data-info="${tip}">` +
      `<img src="${fangIconUrl(d.id)}" alt="${anEsc(d.name)}"><span class="item-count">${x.n > 999 ? '999+' : x.n}</span></button>`;
  };
  const _anSupplyDetail = gear.renderSupplyDetail;
  gear.renderSupplyDetail = function (el) {
    const sel = this.selected;
    if (!sel || typeof sel.key !== 'string' || !sel.key.startsWith('fang:')) return _anSupplyDetail.apply(this, arguments);
    const p = game.player;
    const id = sel.key.slice(5);
    const d = fangDef(id);
    const n = fangN(p, id);
    if (!d || !n) {
      this.selected = null;
      el.innerHTML = '<p class="hint-text">Tippe einen Gegenstand an, um ihn anzusehen, anzulegen oder zu verkaufen.</p>';
      return;
    }
    const tileEl = document.querySelector(`#invBody [data-sup="fang:${id}"]`);
    if (tileEl) tileEl.classList.add('selected');
    const trader = typeof nearTrader === 'function' ? nearTrader() : null;
    const each = fangPreis(d);
    const off = trader ? '' : 'disabled title="Nur bei einem Händler"';
    const sell = (k, label) => `<button type="button" class="mini-btn btn-sell" data-fsell="${k}" ${off}>${label} · ${anDe(each * k)} Gold</button>`;
    const essen = d.art === 'mahl' && typeof kochEssen === 'function';
    el.innerHTML = `<div class="item-detail"><img src="${fangIconUrl(id)}" alt="">` +
      `<div class="item-info">${fangTipHtml(d, n)}` + (trader ? '' : '<small class="hint-text">Verkaufen geht nur bei einem Händler.</small>') + `</div>` +
      `<div class="item-actions">${essen ? '<button type="button" class="mini-btn" data-fessen>Essen</button>' : ''}` +
      sell(1, '1 verkaufen') + (n >= 10 ? sell(10, '10 verkaufen') : '') + (n > 1 ? sell(n, 'Alle verkaufen') : '') + `</div></div>`;
    const ess = el.querySelector('[data-fessen]');
    if (ess) ess.addEventListener('click', () => { if (kochEssen(id)) this.renderInventory(); });
    el.querySelectorAll('[data-fsell]').forEach((b) => b.addEventListener('click', () => {
      const k = Number(b.dataset.fsell);
      if (k > 1 && typeof armConfirm === 'function' && !armConfirm(b)) return;
      const g = fangVerkaufen(id, k);
      this.renderInventory();
      if (g) this.message(`Verkauft · ${Math.round(g / each)} × ${d.name} · ${anDe(g)} Gold`, 'success');
    }));
  };
  // Mehrfachverkauf: Fische und Vorräte aus dem Fang lassen sich mit auswählen (immer der ganze Stapel)
  const _anMultiValue = gear.multiSupValue;
  gear.multiSupValue = function () {
    const v = _anMultiValue.apply(this, arguments);
    if (!this.multiSup) return v;
    return v + [...this.multiSup].filter((k) => typeof k === 'string' && k.startsWith('fang:')).reduce((s, k) => s + fangN(game.player, k.slice(5)) * fangPreis(fangDef(k.slice(5))), 0);
  };
  const _anMultiCount = gear.multiSupCount;
  gear.multiSupCount = function () {
    const v = _anMultiCount.apply(this, arguments);
    if (!this.multiSup) return v;
    return v + [...this.multiSup].filter((k) => typeof k === 'string' && k.startsWith('fang:')).reduce((s, k) => s + fangN(game.player, k.slice(5)), 0);
  };
  const _anMultiAction = gear.multiAction;
  gear.multiAction = function (act) {
    if (act !== 'sell' || !this.multiArmed || !this.multiSup) return _anMultiAction.apply(this, arguments);
    const p = game.player;
    let gold = 0;
    let stueck = 0;
    for (const k of [...this.multiSup]) {
      if (typeof k !== 'string' || !k.startsWith('fang:')) continue;
      const id = k.slice(5);
      const n = fangN(p, id);
      if (n && fangTake(p, id, n)) { gold += n * fangPreis(fangDef(id)); stueck += n; }
      this.multiSup.delete(k);
    }
    p.gold += gold;
    const nur = stueck && !this.multi.size && !this.multiSupCount();
    if (!nur) {
      const r = _anMultiAction.apply(this, arguments);
      if (stueck) {
        const m = document.getElementById('invMsg');
        if (m) m.textContent = (m.textContent ? m.textContent + ' · ' : '') + `Aus dem Fang verkauft · ${stueck} · ${anDe(gold)} Gold`;
      }
      return r;
    }
    this.multi = new Set();
    this.multiSup = new Set();
    this.multiArmed = false;
    this.selected = null;
    if (typeof saveGame === 'function') saveGame();
    this.renderInventory();
    this.message(`Aus dem Fang verkauft · ${stueck} · ${anDe(gold)} Gold`, 'success');
  };
  // Antippen im Mehrfachverkauf (die Tasche wählt sonst nur Tränke)
  const _anRenderInv = gear.renderInventory;
  gear.renderInventory = function () {
    const r = _anRenderInv.apply(this, arguments);
    const body = document.getElementById('invBody');
    if (body && this.multi) {
      body.querySelectorAll('[data-sup^="fang:"]').forEach((b) => b.addEventListener('click', () => {
        if (!this.multi || !this.multiSup) return;
        const k = b.dataset.sup;
        if (this.multiSup.has(k)) this.multiSup.delete(k); else this.multiSup.add(k);
        this.multiArmed = false;
        this.renderInventory();
      }));
    }
    return r;
  };
}

// --- Post und Auktionshaus: Ware { t: 'fang', id, n } -------------------------------------------------------------
// Prüfung für Waren aus fremder Quelle (Datenbank, Post): nur Kennungen aus FANG mit bekannter Art, Anzahl ganzzahlig
// 1–ANGELN.stapel; Schätze, die sofort geöffnet werden, sind keine Ware. Gibt eine saubere neue Ware zurück oder null.
function fangWareClean(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.getPrototypeOf(raw) !== Object.prototype || raw.t !== 'fang') return null;
  const d = fangDef(raw.id);
  const n = raw.n;
  if (!d || !FANG_ARTEN.has(d.art) || d.art === 'schatz') return null;
  if (!Number.isInteger(n) || n < 1 || n > ANGELN.stapel) return null;
  return { t: 'fang', id: d.id, n };
}
if (typeof wareClean === 'function') {
  const _anWareClean = wareClean;
  // eslint-disable-next-line no-global-assign
  wareClean = function (raw) {
    if (raw && typeof raw === 'object' && raw.t === 'fang') return fangWareClean(raw);
    return _anWareClean.apply(this, arguments);
  };
}
if (typeof wareSupplies === 'function') {
  const _anWareSupplies = wareSupplies;
  // eslint-disable-next-line no-global-assign
  wareSupplies = function (p) {
    const out = _anWareSupplies.apply(this, arguments);
    for (const { d, n } of fangListe(p)) out.push({ t: 'fang', id: d.id, n: Math.min(n, ANGELN.stapel) });
    return out;
  };
}
if (typeof wareHave === 'function') {
  const _anWareHave = wareHave;
  // eslint-disable-next-line no-global-assign
  wareHave = function (p, w) {
    if (w && w.t === 'fang') return Math.min(fangN(p, w.id), ANGELN.stapel);
    return _anWareHave.apply(this, arguments);
  };
}
if (typeof wareTake === 'function') {
  const _anWareTake = wareTake;
  // eslint-disable-next-line no-global-assign
  wareTake = function (p, w) {
    if (!w || w.t !== 'fang') return _anWareTake.apply(this, arguments);
    const c = fangWareClean(w);
    if (!c || !fangTake(p, c.id, c.n)) return null;
    return { t: 'fang', id: c.id, n: c.n };
  };
}
if (typeof wareGive === 'function') {
  const _anWareGive = wareGive;
  // eslint-disable-next-line no-global-assign
  wareGive = function (p, w) {
    if (!w || w.t !== 'fang') return _anWareGive.apply(this, arguments);
    const c = fangWareClean(w);
    if (c) fangAdd(p, c.id, c.n);
  };
}
if (typeof wareName === 'function') {
  const _anWareName = wareName;
  // eslint-disable-next-line no-global-assign
  wareName = function (w) {
    if (w && w.t === 'fang') { const d = fangDef(w.id); return d ? d.name : '?'; }
    return _anWareName.apply(this, arguments);
  };
}
if (typeof wareColor === 'function') {
  const _anWareColor = wareColor;
  // eslint-disable-next-line no-global-assign
  wareColor = function (w) {
    if (w && w.t === 'fang') return fangFarbe(fangDef(w.id));
    return _anWareColor.apply(this, arguments);
  };
}
if (typeof wareIcon === 'function') {
  const _anWareIcon = wareIcon;
  // eslint-disable-next-line no-global-assign
  wareIcon = function (w) {
    if (w && w.t === 'fang') return fangDef(w.id) ? fangIconUrl(w.id) : '';
    return _anWareIcon.apply(this, arguments);
  };
}
if (typeof wareTip === 'function') {
  const _anWareTip = wareTip;
  // eslint-disable-next-line no-global-assign
  wareTip = function (w) {
    if (w && w.t === 'fang') { const d = fangDef(w.id); return d ? fangTipHtml(d, Math.floor(Number(w.n)) || 0) : '?'; }
    return _anWareTip.apply(this, arguments);
  };
}
if (typeof wareInfo === 'function') {
  const _anWareInfo = wareInfo;
  // eslint-disable-next-line no-global-assign
  wareInfo = function (w) {
    if (w && w.t === 'fang') {
      const d = fangDef(w.id);
      return { kat: 'verbrauch', art: 'fang', cls: null, selt: Math.max(0, Math.min(4, d ? d.r | 0 : 0)), plus: 0, stufe: 1 };
    }
    return _anWareInfo.apply(this, arguments);
  };
}
if (typeof AH_CATS !== 'undefined') {
  const vb = AH_CATS.find((c) => c.id === 'verbrauch');
  if (vb && typeof vb.sub === 'function') {
    const _anSub = vb.sub;
    vb.sub = () => _anSub().concat([['fang', 'Fische und Küche']]);
  }
}
if (typeof ahSubline === 'function') {
  const _anAhSubline = ahSubline;
  // eslint-disable-next-line no-global-assign
  ahSubline = function (a) {
    if (a && a.w && a.w.t === 'fang') {
      const d = fangDef(a.w.id);
      if (!d) return '';
      return [d.art === 'fisch' ? 'Fisch' : d.art === 'mahl' ? 'Gericht' : d.art === 'zutat' ? 'Zutat' : d.art === 'ware' ? 'Wertsache' : 'Plunder', d.art === 'fisch' ? anRarName(d.r) : ''].filter(Boolean).join(' · ');
    }
    return _anAhSubline.apply(this, arguments);
  };
}

// --- Fischerin in jeder Stadt und jedem Lager, daneben eine Kochstelle (kochen.js) -----------------------------------
const AN_FISCHERIN_ID = 'fischerin';
const AN_FISCHERIN = { 1: 'Fischerin Kaya', 2: 'Fischerin Yara', 3: 'Fischerin Ragna', 4: 'Fischerin Hilde', 5: 'Fischerin Grisga', 6: 'Fischerin Mina',
  7: 'Fischerin Tova', 8: 'Fischerin Selma', 9: 'Fischerin Glimma', 10: 'Fischerin Lumi', 11: 'Fischerin Luna', 12: 'Fischerin Erle', 13: 'Fischerin Ossa',
  14: 'Fischerin Rubra', 15: 'Fischerin Isa', 16: 'Fischerin Mara', 17: 'Fischerin Elvi', 18: 'Fischerin Marit', 19: 'Fischerin Aurora' };
// Startpunkt: freier Platz der Stadt bzw. neben der Händlerin; dann die nächste Stelle, an der sie und ihre Kochstelle
// frei stehen (rgFreeAt, ratgeber.js). Feste Zahlen: alle Mitspieler sehen beide an derselben Stelle.
function anPlatz(w, mapId) {
  const frei = townPlace(mapId, 'frei');
  const h = townPlace(mapId, 'haendler');
  const ref = frei || h;
  if (!ref) return null;
  const S = frei ? { x: frei.x + (frei.stand === 'e' ? -2.4 : frei.stand === 'w' ? 2.4 : 0), y: frei.y - 0.6 } : { x: h.x + 2.6, y: h.y + 1.8 };
  const props = w.props.filter((pr) => Math.abs(pr.x / TILE - S.x) < 14 && Math.abs(pr.y / TILE - S.y) < 14);
  const free = typeof rgFreeAt === 'function' ? rgFreeAt : () => true;
  const drin = (x, y) => typeof inVillage !== 'function' || inVillage(x * TILE, y * TILE);
  for (let r = 0; r <= 7; r += 0.5) {
    const steps = r ? Math.max(8, Math.round(r * 8)) : 1;
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      const x = Math.round((S.x + Math.cos(a) * r) * 20) / 20;
      const y = Math.round((S.y + Math.sin(a) * r) * 20) / 20;
      if (!drin(x, y) || !free(w, x, y, props)) continue;
      if (w.npcs.some((n) => !n.wander && Math.hypot(n.x / TILE - x, n.y / TILE - y) < 2.6)) continue;
      for (const side of [1, -1]) {
        const kx = Math.round((x + side * 1.9) * 20) / 20;
        const ky = Math.round((y + 0.25) * 20) / 20;
        if (!drin(kx, ky) || !free(w, kx, ky, props)) continue;
        if (w.npcs.some((n) => !n.wander && Math.hypot(n.x / TILE - kx, n.y / TILE - ky) < 1.8)) continue;
        return { x, y, kx, ky, side };
      }
    }
  }
  return null;
}
if (typeof generateWorld === 'function') {
  const _anGenerateWorld = generateWorld;
  // eslint-disable-next-line no-global-assign
  generateWorld = function () {
    const w = _anGenerateWorld.apply(this, arguments);
    const maps = [1].concat((w.maps || []).map((m) => m.id));
    for (const mapId of maps) {
      try {
        const at = anPlatz(w, mapId);
        if (!at) continue;
        w.npcs.push({ id: AN_FISCHERIN_ID, name: AN_FISCHERIN[mapId] || 'Fischerin', x: at.x * TILE, y: at.y * TILE, r: 11, restYaw: at.side > 0 ? 0.6 : -0.6, facing: at.side });
        w.npcs.push({ id: 'kochstelle', name: 'Kochstelle', x: at.kx * TILE, y: at.ky * TILE, r: 14, silent: true });
      } catch (err) {
        console.warn('Fischerin: kein Platz auf Map ' + mapId, err);
      }
    }
    return w;
  };
}
if (typeof TRADERS !== 'undefined' && !TRADERS.includes(AN_FISCHERIN_ID)) TRADERS.push(AN_FISCHERIN_ID);
if (typeof NPC_TALK_LABEL !== 'undefined') NPC_TALK_LABEL[AN_FISCHERIN_ID] = 'Handeln';
if (typeof NPC_LINES !== 'undefined') NPC_LINES[AN_FISCHERIN_ID] = ['Am Wasser wird jeder ruhig.', 'Nachts beißen andere Fische.', 'Wer zu fest zieht, verliert die Schnur.'];
// Aussehen 2D: Fischerin mit breitem Strohhut, petrolblauer Jacke, heller Schürze, Gummistiefeln und Angel
if (typeof NPC_ART !== 'undefined' && typeof villagerArt === 'function') {
  NPC_ART[AN_FISCHERIN_ID] = (ctx) => villagerArt(ctx, {
    skin: '#e6b896', pants: '#4a4636', boots: '#2e3a3a', torso: '#2f5f6e', sleeve: '#2f5f6e', cuff: '#d8c27a', eyes: { blush: true },
    behind: (ctx) => box(ctx, -8.5, -34, 4, 15, 2, '#9a5a2a'),
    body: (ctx, half) => {
      poly(ctx, [[-half + 1.5, -19], [half - 1.5, -19], [half - 0.5, -5.5], [-half + 0.5, -5.5]], '#cdb88a');
      box(ctx, -half, -13.2, half * 2, 2.4, 1, '#5a3a22');
      dot(ctx, 3.5, -11.5, 1.4, 1.4, '#d8c27a');
    },
    head: (ctx, cx, cy) => {
      hairCap(ctx, cx, cy, '#9a5a2a', 9);
      oval(ctx, cx, cy - 7.5, 16.5, 3.6, '#d8c07a');
      box(ctx, cx - 8, cy - 15.5, 16, 8.5, 4, '#e0ca8a');
      box(ctx, cx - 8.2, cy - 10.2, 16.4, 2.2, 0.8, '#3a7a8a');
    },
    extra: (ctx) => {
      stroke(ctx, '#7a5a34', 1.6, [[9, -11], [24, -56]]);
      stroke(ctx, 'rgba(240,236,224,0.8)', 0.6, [[24, -56], [27, -34]]);
      poly(ctx, [[24, -34], [30, -33], [27, -29]], '#9aa8b8');
      poly(ctx, [[-14, -4], [-4, -4], [-5, 3], [-13, 3]], '#a8864e');
      stroke(ctx, '#6a4a2a', 1, [[-14, -1], [-4, -1]]);
    }
  });
}
if (typeof NPC3 !== 'undefined') {
  NPC3[AN_FISCHERIN_ID] = { skin: '#e6b896', torso: '#2f5f6e', sleeve: '#2f5f6e', pants: '#4a4636', boots: '#2e3a3a', hemTrim: '#d8c27a', cuff: '#d8c27a',
    hair: { style: 4, color: '#9a5a2a' }, hat: '#d8c07a', apron: '#cdb88a', belt: '#5a3a22', weapon: { kind: 'angelr', tier: 1 }, eyeShape: 2 };
}
if (typeof NPC_FORM !== 'undefined') NPC_FORM[AN_FISCHERIN_ID] = { female: true, legLen: 0.36, headForm: { w: 0.95, h: 1.02 } };
if (typeof NPC_ICONS !== 'undefined') {
  NPC_ICONS[AN_FISCHERIN_ID] = (ctx) => {
    poly(ctx, [[-8, 0], [-3, -4.5], [5, -4.5], [8.5, 0], [5, 4.5], [-3, 4.5]], '#7fc8e8');
    poly(ctx, [[-8, 0], [-12, -4.5], [-12, 4.5]], '#5aa8d0');
    dot(ctx, 4.5, -1.2, 1.2, 1.2, '#14202a');
  };
}

// Fenster der Fischerin: Angeln kaufen, Zutaten (kochen.js), Verkaufen
function anFischerinRender(msg) {
  const p = game.player;
  const body = document.getElementById('npcBody');
  if (!p || !body) return;
  anCss();
  const S = anState(p);
  const st = anStufe(S.xp);
  const ruten = '<div class="shop shop-klein">' + ANGELN.ruten.map((R, i) => {
    const hat = S.rute >= i;
    const zuTief = p.level < R.level || st < R.stufe;
    const eff = [`Biss ${Math.round((1 - R.biss) * 100) ? '−' + Math.round((1 - R.biss) * 100) + ' %' : 'normal'}`, `grüner Bereich +${Math.round(R.zone * 100)} %`, R.selten > 1 ? `Seltenes ×${String(R.selten).replace('.', ',')}` : '', R.lava ? 'auch Lava' : ''].filter(Boolean).join(' · ');
    return `<div class="shop-item${zuTief && !hat ? ' locked' : ''}"><img class="shop-icon" src="${anRutenIcon(i)}" alt="">` +
      `<strong>${R.name} <span class="price">${anDe(R.preis)} Gold</span></strong>` +
      `<small>ab Stufe ${R.level} · ab Angelstufe ${R.stufe} · ${eff}</small>` +
      `<div class="buy">${hat ? `<span class="an-hat">${S.rute === i ? 'In der Hand' : 'Besser vorhanden'}</span>` : `<button class="mini-btn" type="button" data-anrute="${i}" ${zuTief || p.gold < R.preis ? 'disabled' : ''}>Kaufen</button>`}</div></div>`;
  }).join('') + '</div><p class="hint">Du angelst immer mit deiner besten Angel. Lava verbrennt jede Schnur bis auf die Glutfaser- und die Mondsilberrute.</p>';
  const liste = fangListe(p).filter(({ d }) => d.art !== 'mahl');
  const fischGold = liste.filter(({ d }) => d.art === 'fisch' || d.art === 'plunder').reduce((s, { d, n }) => s + n * fangPreis(d), 0);
  const verkauf = '<div class="shop shop-klein">' + (liste.map(({ d, n }) =>
    `<div class="shop-item"><img class="shop-icon" src="${fangIconUrl(d.id)}" alt="">` +
    `<strong style="color:${fangFarbe(d)}"><span>${anEsc(d.name)}</span> × ${anDe(n)}</strong><small>${anDe(fangPreis(d))} Gold je Stück</small>` +
    `<div class="buy"><button class="mini-btn btn-sell" type="button" data-ansell="${d.id}" data-n="1">1</button>` +
    (n > 1 ? `<button class="mini-btn btn-sell" type="button" data-ansell="${d.id}" data-n="${n}">Alle · ${anDe(n * fangPreis(d))}</button>` : '') + '</div></div>').join('') ||
    '<p class="hint-text">Du hast nichts aus dem Wasser dabei.</p>') + '</div>' +
    (fischGold ? `<p class="an-alle"><button type="button" class="btn" data-analle>Alle Fische und Plunder verkaufen · ${anDe(fischGold)} Gold</button></p>` : '');
  const zutaten = typeof kochLadenHtml === 'function' ? kochLadenHtml(p) : '';
  body.innerHTML = `<p class="npc-kopf"><span>„${anEsc(anTipp(p))}“</span><span>Gold <span class="price">${anDe(p.gold)}</span></span></p>` +
    `<p class="an-kurz">Angelstufe <b>${st}</b> · Angel <b>${S.rute >= 0 ? ANGELN.ruten[S.rute].name : '–'}</b> · Fänge <b>${anDe(S.n)}</b></p>` +
    npcTabsHtml('fischerin', [
      { id: 'ruten', label: 'Angelruten', html: ruten },
      zutaten ? { id: 'zutaten', label: 'Zutaten', html: zutaten } : null,
      { id: 'verkauf', label: 'Verkaufen', html: verkauf }
    ]) + `<p id="anMsg" class="gear-msg">${msg ? anEsc(msg) : ''}</p>`;
  npcTabsWire(body, () => anFischerinRender());
  body.querySelectorAll('[data-anrute]').forEach((b) => b.addEventListener('click', () => anFischerinRender(anRuteKaufen(Number(b.dataset.anrute)))));
  body.querySelectorAll('[data-ansell]').forEach((b) => b.addEventListener('click', () => {
    const n = Number(b.dataset.n);
    if (n > 1 && typeof armConfirm === 'function' && !armConfirm(b)) return;
    const d = fangDef(b.dataset.ansell);
    const g = fangVerkaufen(b.dataset.ansell, n);
    anFischerinRender(g && d ? `Verkauft · ${Math.round(g / fangPreis(d))} × ${d.name} · ${anDe(g)} Gold` : '');
  }));
  const alle = body.querySelector('[data-analle]');
  if (alle) alle.addEventListener('click', () => {
    if (typeof armConfirm === 'function' && !armConfirm(alle, 'Wirklich alle verkaufen?')) return;
    let g = 0;
    for (const { d, n } of fangListe(p)) if (d.art === 'fisch' || d.art === 'plunder') g += fangVerkaufen(d.id, n);
    anFischerinRender(g ? `Verkauft · ${anDe(g)} Gold` : '');
  });
  if (typeof kochLadenBind === 'function') kochLadenBind(body, (m) => anFischerinRender(m));
}
// Hinweis der Fischerin: wo es in der Nähe zu angeln gibt
function anTipp(p) {
  const S = anState(p);
  if (S.rute < 0) return 'Ohne Angel fängt man nichts. Die Haselrute ist günstig – damit fängst du an.';
  const tips = ['Stell dich ans Ufer und wirf aus. Wenn die Pose abtaucht: sofort anschlagen!',
    'Im Drill: halten zum Einholen, loslassen, wenn die Schnur zu straff wird. Die Marke muss im grünen Bereich bleiben.',
    'Nachts beißen Arten, die du tagsüber nie siehst.',
    'In jedem Gewässer leben andere Fische: Seen, Moore, das Meer, Eislöcher, sogar Lava.'];
  return tips[(Math.floor(game.time / 20) + S.n) % tips.length];
}
function anRuteKaufen(i) {
  const p = game.player;
  const S = anState(p);
  const R = ANGELN.ruten[i];
  if (!R) return '';
  if (S.rute >= i) return 'Die hast du schon.';
  if (p.level < R.level) return `Erst ab Stufe ${R.level}.`;
  if (anStufe(S.xp) < R.stufe) return `Erst ab Angelstufe ${R.stufe}.`;
  if (p.gold < R.preis) return 'Dafür reicht dein Gold nicht.';
  p.gold -= R.preis;
  S.rute = i;
  anTon('gold', { vol: 0.35 }, 'coin');
  if (typeof ui !== 'undefined') {
    ui.log(`Gekauft · ${R.name}`, 'level');
    ui.log('Stell dich ans Wasser: am PC mit der Angeln-Taste oder F, am Handy mit dem Knopf „Angeln“.', 'info');
  }
  if (typeof saveGame === 'function') saveGame();
  return `Gekauft · ${R.name}`;
}
const anRutenIcons = new Map();
function anRutenIcon(i) {
  let u = anRutenIcons.get(i);
  if (u) return u;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(8, 56);
  g.rotate(-0.85);
  g.scale(0.95, 0.95);
  anRuteArt(g, i);
  g.strokeStyle = 'rgba(240,236,224,0.85)';
  g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(AN_ROD2D.len, 0); g.quadraticCurveTo(AN_ROD2D.len + 4, 16, AN_ROD2D.len - 4, 24); g.stroke();
  u = c.toDataURL();
  anRutenIcons.set(i, u);
  return u;
}
if (typeof ui !== 'undefined' && typeof ui.openNpc === 'function') {
  const _anOpenNpc = ui.openNpc;
  ui.openNpc = function (npc) {
    const r = _anOpenNpc.apply(this, arguments);
    if (npc && npc.id === AN_FISCHERIN_ID) anFischerinRender();
    return r;
  };
}
// Händlerin: Reiter „Angelzeug“ mit der Haselrute
if (typeof npcTabsHtml === 'function') {
  const _anTabs = npcTabsHtml;
  // eslint-disable-next-line no-global-assign
  npcTabsHtml = function (key, tabs) {
    if (key === 'traenke' && Array.isArray(tabs) && game.player) {
      const p = game.player;
      const S = anState(p);
      const R = ANGELN.ruten[0];
      const html = '<div class="shop shop-klein">' +
        `<div class="shop-item"><img class="shop-icon" src="${anRutenIcon(0)}" alt=""><strong>${R.name} <span class="price">${anDe(R.preis)} Gold</span></strong>` +
        '<small>Die erste Angel für Seen, Flüsse, Moore, Meer und Eis. Bessere Angeln hat die Fischerin.</small>' +
        `<div class="buy">${S.rute >= 0 ? '<span class="an-hat">Hast du schon</span>' : `<button class="mini-btn" type="button" data-anrute="0" ${p.gold < R.preis ? 'disabled' : ''}>Kaufen</button>`}</div></div></div>`;
      tabs = tabs.slice();
      const at = tabs.findIndex((t) => t && t.id === 'verkauf');
      tabs.splice(at >= 0 ? at : tabs.length, 0, { id: 'angeln', label: 'Angelzeug', html });
    }
    return _anTabs.call(this, key, tabs);
  };
}
if (typeof ui !== 'undefined' && typeof ui.renderShop === 'function') {
  const _anRenderShop = ui.renderShop;
  ui.renderShop = function () {
    const r = _anRenderShop.apply(this, arguments);
    const body = document.getElementById('npcBody');
    const b = body && body.querySelector('[data-anrute="0"]');
    if (b) b.addEventListener('click', () => {
      const m = anRuteKaufen(0);
      this.renderShop();
      if (m && typeof this.shopMessage === 'function') this.shopMessage(m, m.endsWith('!'));
    });
    return r;
  };
}

// --- Seite „Angeln & Kochen“ im Charakterfenster --------------------------------------------------------------------
function anSeiteHtml(p) {
  anCss();
  const S = anState(p);
  const st = anStufe(S.xp);
  const von = anXpFuer(st);
  const bis = anXpFuer(st + 1);
  const pct = st >= AN_MAX_STUFE ? 100 : Math.max(0, Math.min(100, ((S.xp - von) / Math.max(1, bis - von)) * 100));
  const arten = AN_FISCH_LISTE.filter((f) => S.arten[f.id]).length;
  let h = '<div class="an-seite">';
  h += `<section class="an-karte"><h3>Angeln</h3><p class="an-zeile"><span>Angelstufe</span> <b class="an-gross">${st}</b> <small>/ ${AN_MAX_STUFE}</small></p>` +
    `<div class="an-balken"><i style="width:${pct.toFixed(1)}%"></i></div>` +
    `<p class="an-zeile"><span>Angel</span> <b>${S.rute >= 0 ? ANGELN.ruten[S.rute].name : '–'}</b></p>` +
    `<p class="an-zeile"><span>Fänge</span> <b>${anDe(S.n)}</b> <span>Arten</span> <b>${arten} / ${AN_FISCH_LISTE.length}</b> <span>Schätze</span> <b>${anDe(S.schatz)}</b></p>` +
    `<p class="hint-text"><kbd>${anEsc(typeof keyLabel === 'function' ? keyLabel(actionKey('angeln')) : 'K')}</kbd> <span>Am Wasser: Angeln-Taste oder F, am Handy der Knopf „Angeln“. Mit der Angelstufe steigen die Chancen auf seltene Fische und Schätze.</span></p></section>`;
  if (typeof kochSeiteHtml === 'function') h += kochSeiteHtml(p);
  h += '</div><h3>Fangbuch</h3>';
  for (const [pool, P] of Object.entries(AN_POOLS)) {
    const fs = AN_FISCH_LISTE.filter((f) => f.pool === pool);
    h += `<h4 class="an-pool">${P.name} <small>${fs.filter((f) => S.arten[f.id]).length} / ${fs.length}</small></h4><div class="an-buch">` + fs.map((f) => {
      const n = anInt(S.arten[f.id], 0, 1e9);
      return `<div class="an-art${n ? '' : ' fehlt'}"><img src="${fangIconUrl(f.id)}" alt=""><b style="color:${n ? fangFarbe(f) : ''}">${n ? anEsc(f.name) : '???'}</b>` +
        `<small>${anRarName(f.r)}${f.nacht ? ' · nachts' : ''}${f.min ? ` · ab Angelstufe ${f.min}` : ''}</small>` +
        (n ? `<small>${anDe(n)}× · Rekord ${anKg(anInt(S.rek[f.id], 0, 1e9))}</small>` : '') + '</div>';
    }).join('') + '</div>';
  }
  return h;
}
function anSeiteBind(root) {
  if (typeof kochSeiteBind === 'function') kochSeiteBind(root);
}
if (typeof CHAR_TABS_EXTRA !== 'undefined') CHAR_TABS_EXTRA.push({ id: 'angeln', label: 'Angeln & Kochen', show: () => true, html: anSeiteHtml, bind: anSeiteBind });

// --- Erfolge und Ratgeber ---------------------------------------------------------------------------------------
const anZahl = (p, k) => (p.angeln && Number.isFinite(p.angeln[k]) ? p.angeln[k] : 0);
const AN_ERFOLGE = [
  { id: 'angel1', kat: 'Angeln & Kochen', name: 'Petri Heil', text: 'Fange deinen ersten Fisch', need: 1, val: (p) => anZahl(p, 'n'), pts: 5 },
  { id: 'angel2', kat: 'Angeln & Kochen', name: 'Geduldiger Angler', text: 'Fange {n} Fische', need: 100, val: (p) => anZahl(p, 'n'), pts: 15 },
  { id: 'angel3', kat: 'Angeln & Kochen', name: 'Meisterangler', text: 'Fange {n} Fische', need: 1000, val: (p) => anZahl(p, 'n'), pts: 40, titel: 'Meisterangler' },
  { id: 'angelarten', kat: 'Angeln & Kochen', name: 'Fischkundler', text: 'Fange {n} verschiedene Fischarten', need: 25, val: (p) => (p.angeln && p.angeln.arten ? AN_FISCH_LISTE.filter((f) => p.angeln.arten[f.id]).length : 0), pts: 25, titel: 'Fischkundler' },
  { id: 'angellegende', kat: 'Angeln & Kochen', name: 'Legendärer Fang', text: 'Fange einen legendären Fisch', need: 1, val: (p) => (p.angeln && p.angeln.arten ? AN_FISCH_LISTE.filter((f) => f.r >= 4 && p.angeln.arten[f.id]).length : 0), pts: 30, titel: 'Legendenfänger' },
  { id: 'angelschatz', kat: 'Angeln & Kochen', name: 'Schatztaucher', text: 'Angle {n} Schätze', need: 10, val: (p) => anZahl(p, 'schatz'), pts: 15 },
  { id: 'angelstufe50', kat: 'Angeln & Kochen', name: 'Erfahrener Angler', text: 'Erreiche Angelstufe {n}', need: 50, val: (p) => anStufe(anZahl(p, 'xp')), pts: 20 },
  { id: 'angelstufe100', kat: 'Angeln & Kochen', name: 'Herr der Gewässer', text: 'Erreiche Angelstufe {n}', need: 100, val: (p) => anStufe(anZahl(p, 'xp')), pts: 50, titel: 'Herr der Gewässer' }
];
function anErfolgeEintragen(list) {
  if (typeof ERFOLGE === 'undefined') return;
  for (const E of list) {
    if (ERFOLGE.some((x) => x.id === E.id)) continue;
    ERFOLGE.push(E);
    if (typeof ERFOLG_BY_ID !== 'undefined') ERFOLG_BY_ID[E.id] = E;
  }
}
anErfolgeEintragen(AN_ERFOLGE);
if (typeof RATGEBER_KATEGORIEN !== 'undefined' && !RATGEBER_KATEGORIEN.some((c) => c.id === 'angeln')) RATGEBER_KATEGORIEN.push({ id: 'angeln', name: 'Angeln & Kochen', icon: '🎣' });
if (typeof RATGEBER_WISSEN !== 'undefined') {
  RATGEBER_WISSEN.push(
    {
      c: 'angeln', p: 3, q: 'Wie funktioniert Angeln?',
      a: 'Kauf eine Angel bei der Fischerin (in jeder Stadt und jedem Lager; die Haselrute hat auch {n:haendler}). Stell dich ans Wasser und drücke {k:angeln} oder {k:interact} – am Handy erscheint der Knopf „Angeln“. ' +
        'Taucht die Pose ab, sofort antippen (<b>Anschlagen</b>). Dann beginnt der Drill: gedrückt halten holt ein und spannt die Schnur, loslassen lässt nach. ' +
        'Halte die Marke im grünen Bereich, bis der Fang voll ist. Zu straff reißt die Schnur, zu locker schüttelt sich der Fisch ab.',
      k: 'angeln angel fisch fische fischen pose biss anschlagen drill schnur wasser see fluss meer'
    },
    {
      c: 'angeln', q: 'Wo bekomme ich eine Angel und welche ist die beste?',
      a: () => 'Die Fischerin in jeder Stadt und jedem Lager verkauft fünf Angeln: ' + ANGELN.ruten.map((R) => `<b>${R.name}</b> (ab Stufe ${R.level}, Angelstufe ${R.stufe}, ${rgFmt(R.preis)} Gold)`).join(', ') +
        '. Bessere Angeln lassen Fische schneller beißen, machen den grünen Bereich im Drill breiter und bringen öfter Seltenes. Für Lava brauchst du die Glutfaser- oder die Mondsilberrute.',
      k: 'angel kaufen fischerin rute haselrute bambusrute eschenrute glutfaserrute mondsilberrute beste preis'
    },
    {
      c: 'angeln', q: 'Welche Fische gibt es wo?',
      a: () => 'Jedes Gewässer hat eigene Arten: ' + Object.values(AN_POOLS).map((P) => P.name).join(', ') + '. ' +
        'Seltene Fische kommen erst mit höherer Angelstufe, legendäre ab einer bestimmten Angelstufe. Manche beißen nur nachts. Im Charakterfenster unter „Angeln &amp; Kochen“ steht dein Fangbuch.',
      k: 'fische arten wo welche gewaesser see moor meer eis lava blutsee nachts selten legendaer fangbuch'
    },
    {
      c: 'angeln', q: 'Was bringt die Angelstufe?',
      a: 'Jeder Fang gibt Angel-Erfahrung (seltene mehr, eine neue Art zusätzlich 15). Mit der Angelstufe (1–100) beißt es schneller, der grüne Bereich im Drill wird breiter, seltene Fische, Schätze und legendäre Arten werden häufiger. Plunder wird seltener.',
      k: 'angelstufe stufe fertigkeit erfahrung steigen chance selten besser'
    },
    {
      c: 'angeln', q: 'Was mache ich mit Fischen?',
      a: 'Fische liegen in der Tasche unter „Vorräte“ (stapelbar). Du kannst sie bei jedem Händler und der Fischerin verkaufen, per Post verschicken, im Auktionshaus anbieten oder an einer Kochstelle zu Gerichten mit kleinen Buffs kochen.',
      k: 'fische verkaufen handeln post auktionshaus kochen vorrat tasche stapel'
    },
    {
      c: 'angeln', q: 'Kann ich beim Angeln Schätze finden?',
      a: 'Ja, selten: eine Flaschenpost (Gold), ein kleines Schatzkästchen (Gold, Seelensplitter, manchmal eine Segensschriftrolle), eine Perle oder in Lava und Blutsee ein Feueropal – beide bringen beim Händler viel Gold. Mit Angelstufe und besserer Angel kommen Schätze öfter.',
      k: 'schatz schaetze flaschenpost schatzkaestchen perle feueropal gold plunder stiefel'
    }
  );
}

// --- Stil -----------------------------------------------------------------------------------------------------------
function anCss() {
  if (document.getElementById('anCss')) return;
  const st = document.createElement('style');
  st.id = 'anCss';
  st.textContent =
    '.an-hud{position:absolute;left:50%;bottom:calc(var(--edge-b, 0px) + 158px);transform:translateX(-50%);z-index:40;width:min(340px,60vw);' +
    'padding:6px 10px 8px;border-radius:10px;background:rgba(12,16,22,.78);border:1px solid rgba(160,200,230,.35);box-shadow:0 4px 14px rgba(0,0,0,.5);pointer-events:none;font-family:var(--font-display,serif);color:#e8f2fa}' +
    '#hud.touch .an-hud{bottom:calc(var(--edge-b, 0px) + 112px);width:min(300px,44vw)}' +
    '.an-kopf{text-align:center;font-size:15px;margin-bottom:5px;text-shadow:0 1px 2px #000}' +
    '.an-hud.biss .an-kopf{color:#ffe27a;font-size:18px;animation:an-puls .35s ease-in-out infinite alternate}' +
    '.an-hud.straff .an-kopf{color:#ff8a6a}.an-hud.locker .an-kopf{color:#9fd0ff}.an-hud.gut .an-kopf{color:#9ff0a0}.an-hud.fang .an-kopf{color:#ffd96a}' +
    '.an-leiste,.an-fort{display:none}.an-hud.drill .an-leiste,.an-hud.drill .an-fort{display:block}' +
    '.an-leiste{position:relative;height:16px;border-radius:8px;background:linear-gradient(90deg,#3a6aa8,#5a2a2a 20%,#5a2a2a 80%,#c8402a);border:1px solid rgba(0,0,0,.6);overflow:hidden}' +
    '.an-zone{position:absolute;top:0;bottom:0;background:linear-gradient(180deg,#7ae08a,#3aa84a);box-shadow:0 0 8px rgba(120,240,140,.6) inset}' +
    '.an-marke{position:absolute;top:-2px;bottom:-2px;width:4px;margin-left:-2px;background:#fff;border-radius:2px;box-shadow:0 0 6px #fff}' +
    '.an-fort{height:6px;margin-top:5px;border-radius:3px;background:rgba(0,0,0,.45);overflow:hidden}.an-fort i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffd34d,#fff2a0)}' +
    '.an-aktion{position:absolute;left:50%;bottom:calc(var(--edge-b, 0px) + 104px);transform:translateX(-50%);z-index:41;min-width:150px;height:46px;border-radius:23px;padding:0 14px;display:flex;align-items:center;gap:6px;justify-content:center;' +
    'font-family:var(--font-display,serif);font-size:14px;color:#fff3d0;background:radial-gradient(circle at 40% 30%,#3a8ab0,#1a4a6a 60%,#0e2434);border:2px solid #d8b46a;box-shadow:0 4px 12px rgba(0,0,0,.6);cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}' +
    '.an-aktion svg{width:26px;height:26px;stroke:#f4ead0;fill:#e0402a;stroke-linecap:round}.an-aktion:disabled{opacity:.55}' +
    '.an-key{font-size:11px;padding:0 4px;border:1px solid rgba(255,255,255,.4);border-radius:3px;opacity:.85}.an-key:empty{display:none}' +
    '.an-aktion.an-touch{position:fixed;left:auto;right:calc(var(--edge-r, 0px) + 12px);bottom:calc(var(--edge-b, 0px) + 12px);transform:none;min-width:0;width:74px;height:74px;border-radius:50%;padding:0;flex-direction:column;gap:0;font-size:10.5px;line-height:1.1;text-align:center}' +
    '.an-aktion.an-touch svg{width:30px;height:30px}.an-aktion.biss{background:radial-gradient(circle at 40% 30%,#ffd34d,#d0801a 60%,#6a3a0a);animation:an-puls .3s ease-in-out infinite alternate}' +
    '.an-aktion.active{filter:brightness(1.25)}.an-aktion.drill{background:radial-gradient(circle at 40% 30%,#4ab06a,#1a6a3a 60%,#0e341c)}' +
    '@keyframes an-puls{from{transform:translateX(-50%) scale(1)}to{transform:translateX(-50%) scale(1.06)}}' +
    '.an-aktion.an-touch.biss{animation-name:an-puls2}@keyframes an-puls2{from{transform:scale(1)}to{transform:scale(1.08)}}' +
    '.an-hud.biss .an-kopf{animation-name:an-puls3}@keyframes an-puls3{from{transform:scale(1)}to{transform:scale(1.08)}}' +
    '.an-start{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;color:#fff3d0;cursor:pointer}' +
    '.an-start svg{width:26px;height:26px;stroke:#f4ead0;fill:#7fc8e8;stroke-linecap:round}' +
    '.an-start.touch-talk{background:radial-gradient(circle at 40% 35%,#2f6a8a,#14303e);border:2px solid var(--brass,#c9a35a)}' +
    '.an-start.an-hoch{transform:translateY(-72px)}' +
    '.an-start.an-pc{position:absolute;left:50%;bottom:calc(var(--edge-b, 0px) + 104px);transform:translateX(-50%);flex-direction:row;gap:6px;padding:4px 12px;border-radius:14px;' +
    'background:rgba(12,22,30,.82);border:1px solid rgba(160,200,230,.45);font-size:13px;z-index:39}' +
    '.an-start.an-pc svg{width:20px;height:20px}.an-start kbd{font-size:11px;padding:0 4px;border:1px solid rgba(255,255,255,.4);border-radius:3px;margin-right:2px}' +
    '.fang-tile img{image-rendering:auto}.an-hat{font-size:12px;color:#9fe7b4}.an-kurz{margin:2px 0 6px;font-size:13px;color:var(--muted,#c9c0ae)}.an-alle{text-align:center;margin:8px 0 0}' +
    '.an-seite{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;margin-bottom:6px}' +
    '.an-karte{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 10px}.an-karte h3{margin:0 0 4px;font-size:15px}' +
    '.an-zeile{display:flex;flex-wrap:wrap;gap:3px 6px;align-items:baseline;margin:3px 0;font-size:13px}.an-zeile span{opacity:.8}.an-gross{font-size:20px;color:#9fd8ff}' +
    '.an-balken{height:7px;border-radius:4px;background:rgba(0,0,0,.4);overflow:hidden;margin:2px 0 6px}.an-balken i{display:block;height:100%;background:linear-gradient(90deg,#3a8ab0,#9fe0ff)}' +
    '.an-pool{margin:10px 0 4px;font-size:13px}.an-pool small{opacity:.7}' +
    '.an-buch{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:5px}' +
    '.an-art{display:flex;flex-direction:column;align-items:center;text-align:center;padding:4px;border-radius:7px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);font-size:12px}' +
    '.an-art img{width:44px;height:44px}.an-art small{font-size:10.5px;opacity:.75}.an-art.fehlt img{filter:brightness(0) opacity(.35)}.an-art.fehlt b{opacity:.5}';
  document.head.appendChild(st);
}
