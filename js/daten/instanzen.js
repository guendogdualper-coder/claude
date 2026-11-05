// Lv-60-Instanzen (seit 13.58): acht Instanzen für Gruppen aus 2–5 Spielern ab Stufe 60, je zwei auf den Maps ab
// Stufe 40 (Frostgipfel, Totenmoor, Donnerklamm, Feuerberg), die Eingänge in den Ecken der Map. Jede Instanz ist
// zwei Dungeon-Blöcke hoch: eine Schlange aus vielen Räumen voller Gegner, dazwischen vier Wächter (Mini-Bosse),
// die immer stärker werden, oben in der Halle der Instanzboss. Er ist versiegelt, bis alle vier Wächter fallen.
// Ablauf, Fähigkeiten, Beute und Sperre (30 Minuten je Spieler und Instanz): js/instanzen.js.
//
// Hier stehen nur Daten: die Instanzen (werden in zonen.js an DUNGEONS gehängt) und ihre Gegner.
//   theme    Wirkung der Fähigkeiten: eis, gift, tod, sturm, feuer (Farben und Effekte, siehe INST_FX)
//   entry    { map, corner } – Ecke tl, tr, bl, br; die Maps wechseln sich ab (oben links + unten rechts, dann
//            oben rechts + unten links)
//   mobs     normale Gegner der Räume; minis: die vier Wächter in ihrer Reihenfolge; boss: Instanzboss
//   gate     Aussehen des Tors in 3D (wie RIFT_LOOK)
// Gegner: Aussehen und Grundwerte einer bekannten Art (look), eigene Namen, Stufe 60–64. inst: Fähigkeiten
//   moves  Angriffe im Wechsel (Standard der Endbosse: slam, meteor, line, buster, leap, charge; eigene:
//          fan Kegel, spikes Dornen unter allen, rain Hagel/Glut/Blitze, cross Kreuz, pull Sog, pools Giftlachen,
//          chain Kettenblitz, ringout nur nah sicher, core nur weit weg sicher, volley Geschossring, adds Brut)
//   ult    nur der Instanzboss: Vernichtung mit sicheren Lichtkreisen (ab der Hälfte, dann alle 40 s)
//   t3     Färbung des 3D-Modells (Schlüssel der Zeichnung, z. B. fur, skin, body)

// Gegner der Räume: [id, Vorlage, Name, Färbung in 3D]
const INST_MOBS = [
  ['i_gletscherwolf', 'eiswolf', 'Gletscherwolf', { fur: '#9fc8e8', eye: '#7af0ff' }],
  ['i_frostgolem', 'eisgolem', 'Gletschergolem', null],
  ['i_eisgeist', 'frostgeist', 'Gruftgeist', { body: '#a8d8ff', crown: '#e8faff' }],
  ['i_frostbaer', 'eisbaer', 'Firnbär', { fur: '#d8ecf8' }],
  ['i_firnyeti', 'yeti', 'Firnyeti', { skin: '#d0e4f4' }],
  ['i_polarlicht', 'frostgeist', 'Nordlichtgeist', { body: '#9fffe8', crown: '#c8a8ff', eye: '#7affc8' }],
  ['i_moorghul', 'ghul', 'Moorghul', { skin: '#5a6a3a' }],
  ['i_moorhexe', 'sumpfhexe', 'Sumpfseherin', { robe: '#2e3a22', skin: '#7a9a5a' }],
  ['i_moorhund', 'moorwolf', 'Faulhund', { fur: '#3e4a2e', eye: '#c8ff4a' }],
  ['i_knochenwaechter', 'grabwaechter', 'Knochenwächter', null],
  ['i_seelenfresser', 'seelenfresser', 'Seelentrinker', { body: '#7a5ab8', eye: '#c8ff6a' }],
  ['i_untoter', 'untoter', 'Kathedralenwache', null],
  ['i_schmiedetroll', 'trollkrieger', 'Schmiedetroll', { skin: '#4a7a6a' }],
  ['i_donnerbock', 'donnerbock', 'Blitzbock', null],
  ['i_blitzharpyie', 'harpyie', 'Blitzharpyie', { wings: '#5a7ac8', torso: '#3a4a8a' }],
  ['i_sturmharpyie', 'harpyie', 'Sturmharpyie', { wings: '#c8d8e8', torso: '#6a7a8a' }],
  ['i_gargoyle', 'gargoyle', 'Horstgargoyle', null],
  ['i_klammstier', 'minotaurus', 'Klammstier', null],
  ['i_magmagolem', 'lavagolem', 'Magmagolem', null],
  ['i_glutkatze', 'glutkatze', 'Kesselkatze', { fur: '#3a1a10', stripes: '#ffb04a' }],
  ['i_feuerimp', 'feuerdaemon', 'Glutteufel', { skin: '#e0602a' }],
  ['i_aschedaemon', 'feuerdaemon', 'Aschedämon', { skin: '#5a3a34', torso: '#3a2420', wings: '#2a1a16' }],
  ['i_brut', 'drachenbrut', 'Aschebrut', { fur: '#6a3a2a' }],
  ['i_aschedrache', 'feuerdrache', 'Aschedrache', { fur: '#4a2a26' }]
];
for (const [id, base, name, t3] of INST_MOBS) {
  const b = MONSTER_TYPES[base];
  MONSTER_TYPES[id] = {
    ...b, name, level: 60, look: base, lookScale: 1.08, hpMul: +((b.hpMul || 1) * 1.15).toFixed(2), atkMul: +((b.atkMul || 1) * 1.3).toFixed(2),
    aggressive: true, dungeon: true, t3
  };
}

// Wächter und Bosse: [id, Vorlage, Name, Titel, Thema, Rang (0–3 Wächter, 4 Boss), Größe in 3D, Farbe, Angriffe, Färbung, Brut]
// Rang bestimmt Stufe, Leben, Angriff und Größe (INST_RANKS); die Brut sind die Helfer bei Wutschrei und Beschwörung
// seit 13.85 deutlich mehr Angriff (vorher 1,7 / 1,85 / 2,0 / 2,15 / 2,35): Wächter und Boss sind nur noch in der Gruppe
// zu schaffen, auch ein gut ausgerüsteter Tank spürt jeden Schlag
const INST_RANKS = [
  { level: 60, hpMul: 24, atkMul: 2.7, size: 28 },
  { level: 61, hpMul: 34, atkMul: 2.95, size: 30 },
  { level: 62, hpMul: 46, atkMul: 3.2, size: 32 },
  { level: 63, hpMul: 60, atkMul: 3.45, size: 34 },
  { level: 64, hpMul: 105, atkMul: 3.8, size: 44 }
];
const INST_BOSSES = [
  // Gletschergruft (Frostgipfel, oben links)
  ['skadi', 'eiswolf', 'Skadi, die Raureifjägerin', 'Jägerin der Gletschergruft', 'eis', 0, 2.2, '#9fe8ff', ['leap', 'fan', 'slam', 'spikes'], { fur: '#e8f6ff', eye: '#3af0ff' }, 'i_gletscherwolf'],
  ['ilva', 'frostgeist', 'Ilva, Weberin des Frosts', 'Ihr Hagel deckt den ganzen Raum', 'eis', 1, 1.9, '#bfe8ff', ['rain', 'ringout', 'volley', 'spikes'], { body: '#e0f6ff', crown: '#7ad8ff' }, 'i_eisgeist'],
  ['torbjoern', 'eisgolem', 'Torbjörn Gletscherbrecher', 'Er reißt euch an sich und zerschmettert das Eis', 'eis', 2, 1.8, '#7fd8ff', ['slam', 'pull', 'line', 'spikes', 'charge'], null, 'i_frostgolem'],
  ['hrimfang', 'yeti', 'Hrimfang, Hüter des ewigen Eises', 'Der letzte Wächter vor der Königin', 'eis', 3, 1.9, '#d8f4ff', ['leap', 'fan', 'core', 'rain', 'buster'], { skin: '#f4fbff', gloves: '#7ab8e8' }, 'i_firnyeti'],
  ['hjelda', 'eiskoenig', 'Frostkönigin Hjelda', 'Herrin der Gletschergruft', 'eis', 4, 1.25, '#7fd8ff', ['rain', 'fan', 'ringout', 'spikes', 'pull', 'slam', 'volley'], { body: '#bfeaff', crown: '#ffffff', eye: '#3a8aff' }, 'i_eisgeist'],
  // Feste des Nordlichts (Frostgipfel, unten rechts)
  ['bjarki', 'eisbaer', 'Bjarki Eispranke', 'Bär der Nordwache', 'eis', 0, 1.9, '#9fffe8', ['charge', 'slam', 'fan', 'buster'], { fur: '#f4fbff', eye: '#3affc8' }, 'i_frostbaer'],
  ['aurra', 'frostgeist', 'Aurra, Seherin des Nordlichts', 'Ihre Blitze springen von Spieler zu Spieler', 'sturm', 1, 2.0, '#c8a8ff', ['chain', 'rain', 'ringout', 'volley'], { body: '#c8b8ff', crown: '#7affc8', eye: '#ff7aff' }, 'i_polarlicht'],
  ['sturmhorn', 'mammut', 'Sturmhorn, der Urmammut', 'Er trampelt alles nieder', 'eis', 2, 1.7, '#9fe8ff', ['charge', 'pull', 'slam', 'line'], null, 'i_frostbaer'],
  ['hrimgar', 'yeti', 'Jarl Hrimgar', 'Herr der Feste', 'eis', 3, 2.0, '#9fffe8', ['leap', 'spikes', 'cross', 'buster', 'slam'], { skin: '#c8e8f8', pants: '#3a5a7a' }, 'i_firnyeti'],
  ['kaldor', 'gruftkoenig', 'Winterfürst Kaldor', 'Der Fürst unter dem Nordlicht', 'eis', 4, 2.1, '#9fffe8', ['cross', 'rain', 'chain', 'pull', 'slam', 'fan', 'leap'], { skin: '#d8f0ff', robe: '#2a4a6a', torso: '#2a4a6a' }, 'i_polarlicht'],
  // Versunkene Moorkrypta (Totenmoor, oben rechts)
  ['fenrik', 'moorwolf', 'Fenrik, der Moorwolf', 'Er jagt im fauligen Nebel', 'gift', 0, 2.2, '#8fe36a', ['leap', 'pools', 'charge', 'fan'], { fur: '#2e3a22', eye: '#e8ff4a' }, 'i_moorhund'],
  ['morgrah', 'sumpfhexe', 'Hexe Morgrah', 'Ihr Gift sammelt sich in Lachen', 'gift', 1, 2.0, '#a8f04a', ['pools', 'rain', 'volley', 'ringout'], { robe: '#1e2a16', skin: '#6a8a4a' }, 'i_moorhexe'],
  ['moorschlund', 'ghul', 'Moorschlund', 'Ein Maul, das alles verschlingt', 'gift', 2, 1.8, '#7ad03a', ['pull', 'slam', 'pools', 'buster'], { skin: '#4a5a2a' }, 'i_moorghul'],
  ['ertrunkener', 'untoter', 'Der Ertrunkene Ritter', 'Er steigt aus dem schwarzen Wasser', 'gift', 3, 2.2, '#8fe36a', ['charge', 'cross', 'spikes', 'slam', 'pools'], null, 'i_moorghul'],
  ['vethra', 'nagakoenigin', 'Moormutter Vethra', 'Mutter allen Moders', 'gift', 4, 1.1, '#8fe36a', ['pools', 'fan', 'pull', 'rain', 'slam', 'volley', 'leap'], null, 'i_moorhund'],
  // Knochenkathedrale (Totenmoor, unten links)
  ['kantor', 'grabwaechter', 'Kantor der Gebeine', 'Sein Lied lässt Knochen aus dem Boden brechen', 'tod', 0, 2.1, '#c8a8ff', ['slam', 'spikes', 'line', 'buster'], null, 'i_knochenwaechter'],
  ['varis', 'seelenfresser', 'Seelenfänger Varis', 'Seine Blitze springen von Spieler zu Spieler', 'tod', 1, 1.9, '#b48cff', ['chain', 'volley', 'ringout', 'rain'], { body: '#5a3a9a', eye: '#c8ff6a' }, 'i_seelenfresser'],
  ['knochenkoloss', 'ghul', 'Der Knochenkoloss', 'Aus tausend Gebeinen zusammengefügt', 'tod', 2, 1.8, '#e8dcc0', ['charge', 'slam', 'pull', 'spikes'], { skin: '#d8d0b8', pants: '#5a4a3a' }, 'i_untoter'],
  ['mortheim', 'gruftkoenig', 'Bischof Mortheim', 'Er predigt den ewigen Tod', 'tod', 3, 1.5, '#a774e0', ['cross', 'rain', 'core', 'volley', 'leap'], null, 'i_knochenwaechter'],
  ['azrakel', 'daemon', 'Totenfürst Azrakel', 'Fürst der Knochenkathedrale', 'tod', 4, 3.0, '#b48cff', ['spikes', 'cross', 'chain', 'pull', 'fan', 'slam', 'leap'], { skin: '#3a2a4a', torso: '#2a1a3a', wings: '#1a1024' }, 'i_seelenfresser'],
  // Donnerschmiede (Donnerklamm, oben links)
  ['raik', 'donnerbock', 'Raik, der Sturmbock', 'Er stürmt mit Blitzen auf den Hörnern', 'sturm', 0, 1.8, '#9fd0ff', ['charge', 'chain', 'leap', 'line'], null, 'i_donnerbock'],
  ['kyra', 'harpyie', 'Blitzharpyie Kyra', 'Sie ruft das Gewitter in die Schmiede', 'sturm', 1, 2.0, '#9fd0ff', ['chain', 'volley', 'rain', 'fan'], { wings: '#3a5ab8', torso: '#2a3a7a' }, 'i_blitzharpyie'],
  ['grumm', 'trollkrieger', 'Schmiedetroll Grumm', 'Sein Hammer fällt in Kreuzen', 'sturm', 2, 1.8, '#7ab8ff', ['slam', 'pull', 'cross', 'buster'], { skin: '#3a6a5a' }, 'i_schmiedetroll'],
  ['thorak', 'minotaurus', 'Hornbrecher Thorak', 'Hüter der Esse', 'sturm', 3, 1.9, '#9fd0ff', ['charge', 'line', 'slam', 'spikes', 'leap'], null, 'i_schmiedetroll'],
  ['volund', 'steintitan', 'Donnerschmied Volund', 'Er schmiedet Blitze', 'sturm', 4, 1.6, '#9fd0ff', ['chain', 'slam', 'cross', 'pull', 'rain', 'line', 'buster'], null, 'i_blitzharpyie'],
  // Sturmhorst (Donnerklamm, unten rechts)
  ['ssyla', 'harpyie', 'Windkreischerin Ssyla', 'Ihr Schrei bringt Hagel', 'sturm', 0, 2.1, '#c8e8ff', ['rain', 'fan', 'volley', 'leap'], { wings: '#e8f0f8', torso: '#7a8a9a' }, 'i_sturmharpyie'],
  ['grom', 'gargoyle', 'Steinwächter Grom', 'Er springt von den Zinnen', 'sturm', 1, 2.1, '#c8e8ff', ['leap', 'spikes', 'slam', 'chain'], null, 'i_gargoyle'],
  ['ugrak', 'steintitan', 'Felsenhüter Ugrak', 'Ein Berg, der sich bewegt', 'sturm', 2, 1.3, '#9fd0ff', ['slam', 'line', 'pull', 'buster'], null, 'i_klammstier'],
  ['brontes', 'donnerriese', 'Sturmrufer Brontes', 'Herr der Gewitterwolken', 'sturm', 3, 1.25, '#cfe8ff', ['chain', 'rain', 'cross', 'core', 'volley'], null, 'i_sturmharpyie'],
  ['tempestra', 'harpyie', 'Sturmkönigin Tempestra', 'Königin des Sturmhorsts', 'sturm', 4, 3.2, '#cfe8ff', ['chain', 'rain', 'fan', 'pull', 'leap', 'ringout', 'volley'], { wings: '#f4f8ff', torso: '#4a5a8a', skin: '#e8e0f0' }, 'i_sturmharpyie'],
  // Glutkessel (Feuerberg, oben rechts)
  ['sahir', 'glutkatze', 'Glutpranke Sahir', 'Schnell wie eine Stichflamme', 'feuer', 0, 2.3, '#ffb04a', ['leap', 'fan', 'charge', 'spikes'], { fur: '#1a0a06', stripes: '#ffd34d' }, 'i_glutkatze'],
  ['schlackenfaust', 'lavagolem', 'Schlackenfaust', 'Er lässt Glut vom Himmel regnen', 'feuer', 1, 1.6, '#ff8a2a', ['slam', 'pull', 'rain', 'buster'], null, 'i_magmagolem'],
  ['ilyra', 'feuerdaemon', 'Flammentänzerin Ilyra', 'Ihr Tanz zieht Feuerkreuze', 'feuer', 2, 1.9, '#ffd34d', ['cross', 'volley', 'ringout', 'fan'], { skin: '#ffb04a', wings: '#c8402f' }, 'i_feuerimp'],
  ['ignaroth', 'lavagolem', 'Ignaroth, Herz des Kessels', 'Der Kessel kocht über', 'feuer', 3, 1.8, '#ff6a1a', ['rain', 'core', 'slam', 'line', 'pools'], null, 'i_magmagolem'],
  ['pyrrhos', 'titanenkoenig', 'Magmafürst Pyrrhos', 'Herr des Glutkessels', 'feuer', 4, 1.15, '#ff7a2a', ['rain', 'cross', 'pull', 'slam', 'fan', 'pools', 'charge'], null, 'i_feuerimp'],
  // Aschenzitadelle (Feuerberg, unten links)
  ['kael', 'feuerdaemon', 'Aschewächter Kael', 'Torwache der Zitadelle', 'feuer', 0, 1.9, '#ff5a3a', ['charge', 'cross', 'slam', 'buster'], { skin: '#6a2a1a', wings: '#2a1010' }, 'i_aschedaemon'],
  ['ishra', 'drachenbrut', 'Brutmutter Ishra', 'Ihre Brut schlüpft im Kampf', 'feuer', 1, 2.0, '#ff7a3a', ['leap', 'fan', 'volley', 'adds'], { fur: '#8a3a1a' }, 'i_brut'],
  ['vorr', 'feuerdrache', 'Rußdrache Vorr', 'Sein Atem ist schwarz vor Ruß', 'feuer', 2, 1.6, '#ff6a3a', ['fan', 'rain', 'line', 'charge'], { fur: '#2a1a16' }, 'i_aschedrache'],
  ['barak', 'gargoyle', 'Höllenschmied Barak', 'Er hütet den Weg zum Thron', 'feuer', 3, 2.2, '#ff5a3a', ['spikes', 'slam', 'pull', 'core'], null, 'i_aschedaemon'],
  ['vulkhar', 'urdrache', 'Aschenkaiser Vulkhar', 'Herrscher der Aschenzitadelle', 'feuer', 4, 0.95, '#ff5a3a', ['fan', 'rain', 'charge', 'cross', 'pull', 'leap', 'slam'], null, 'i_brut']
];
const INST_MAT = { eisgolem: 'yeti', grabwaechter: 'untoter', seelenfresser: 'untoter', drachenbrut: 'feuerdrache' };
// Ult des Instanzbosses je Thema (Name im Banner)
const INST_ULT_NAME = { eis: 'Ewiger Winter', gift: 'Fäulnisflut', tod: 'Totenmesse', sturm: 'Himmelszorn', feuer: 'Weltenbrand' };
for (const [id, base, name, title, fx, rank, scale, color, moves, t3, summon] of INST_BOSSES) {
  const b = MONSTER_TYPES[base];
  const R = INST_RANKS[rank];
  const final = rank === 4;
  // Teile für den Schmied: die der Vorlage (Bossvorlagen: deren Teile; Arten ohne eigene Teile: ähnliche)
  const mat = (b.boss && b.boss.mat) || INST_MAT[base] || base;
  MONSTER_TYPES[id] = {
    name, level: R.level, shape: b.shape, color: b.color, accent: b.accent, size: R.size, speed: Math.min(130, (b.speed || 100) + 10),
    range: final ? 80 : 56, cooldown: final ? 1.8 : 1.6, aggressive: true, hpMul: R.hpMul, atkMul: R.atkMul, dungeon: true,
    look: base, lookScale: scale, t3,
    boss: { color, slam: final ? 210 : 150 + rank * 10, volley: final ? 12 : 8, shot: color, summon, mat },
    inst: { rank, final, fx, title, moves, ult: final ? INST_ULT_NAME[fx] : null }
  };
}

// Höllenthron (seit 13.58): vier neue Wächter zwischen Zerberos und Ifrah, immer stärker, Abaddor bleibt der stärkste
// Reihenfolge der Räume: Gorvoth (64) → Lilith (65) → Zerberos (66) → Molgrath (67) → Ifrah (68) → Belzarek (69) → Abaddor (72)
// seit 13.85 Angriff etwa × 1,45 (vorher 2,5 / 2,6 / 2,75 / 2,9)
const HT_MINIS = [
  ['gorvoth', 'oger', 'Gorvoth, Kerkermeister der Hölle', 'Er reißt Gefangene an seine Ketten', 64, 105, 3.6, 40, 2.4, '#ff5a1a', ['slam', 'pull', 'charge', 'buster'], { skin: '#5a3a30' }, 'hoellenhund'],
  ['lilith', 'sumpfhexe', 'Lilith, Hexe der Asche', 'Ihre Glut sammelt sich in Lachen', 65, 120, 3.75, 36, 2.3, '#ff7a3a', ['pools', 'rain', 'ringout', 'volley'], { robe: '#3a0a0a', skin: '#c86a5a' }, 'feuerdaemon'],
  ['molgrath', 'lavagolem', 'Molgrath, der Glutkoloss', 'Er bebt vor Hitze', 67, 145, 3.95, 44, 2.1, '#ff6a1a', ['slam', 'cross', 'rain', 'pull', 'buster'], null, 'hoellenhund'],
  ['belzarek', 'daemon', 'Belzarek, Fürst der Schatten', 'Der letzte Wächter vor dem Thron', 69, 165, 4.15, 44, 3.2, '#ff3a5a', ['leap', 'fan', 'cross', 'core', 'chain', 'charge'], { skin: '#2a0a14', torso: '#1a0610', wings: '#3a0a1a' }, 'feuerdaemon']
];
for (const [id, base, name, title, level, hpMul, atkMul, size, scale, color, moves, t3, summon] of HT_MINIS) {
  const b = MONSTER_TYPES[base];
  MONSTER_TYPES[id] = {
    name, level, shape: b.shape, color: b.color, size, speed: 124, range: 80, cooldown: 1.7, aggressive: true, hpMul, atkMul,
    look: base, lookScale: scale, t3,
    boss: { color, slam: 180, volley: 10, shot: color, summon, mat: 'feuerdaemon' },
    inst: { rank: 3, final: false, fx: 'feuer', title, moves, ht: true }
  };
}

// Die Instanzen: zwei Blöcke hoch (rows: 2), viele Räume (instPlan), Eingang in der Ecke (entry.corner)
const INSTANCES = [
  {
    id: 'gletschergruft', name: 'Gletschergruft', theme: 'eis', entry: { map: 7, corner: 'tl' }, floor: 'ICE', portal: '#7fd8ff',
    wall: { top: '#f4fbff', face: '#3a6a98', line: '#a8d8f0' }, ambient: { kind: 'snow', tint: [40, 90, 160, 0.14] },
    mobs: ['i_gletscherwolf', 'i_frostgolem', 'i_eisgeist'], minis: ['skadi', 'ilva', 'torbjoern', 'hrimfang'], boss: 'hjelda',
    gate: { stone: '#8cbcdc', top: '#ffffff', topK: 0.75, accent: '#7fd8ff', deep: '#0a2a4a', mid: '#7fd8ff', core: '#ffffff', motes: 'snow', spin: 0.8, emblem: 'flake' },
    text: 'Eine Gruft tief im Gletscher. Wölfe, Golems und Geister aus Eis bewachen die Frostkönigin.'
  },
  {
    id: 'nordlichtfeste', name: 'Feste des Nordlichts', theme: 'eis', entry: { map: 7, corner: 'br' }, floor: 'FLAGSTONE', portal: '#9fffe8',
    wall: { top: '#dcecf4', face: '#2a4a5a', line: '#9fffe8' }, ambient: { kind: 'snow', tint: [30, 120, 120, 0.12] },
    mobs: ['i_frostbaer', 'i_firnyeti', 'i_polarlicht'], minis: ['bjarki', 'aurra', 'sturmhorn', 'hrimgar'], boss: 'kaldor',
    gate: { stone: '#7a9aa8', top: '#e8f8ff', topK: 0.6, accent: '#9fffe8', deep: '#08303a', mid: '#9fffe8', core: '#f0e0ff', motes: 'snow', spin: 0.9, emblem: 'flake' },
    text: 'Eine vergessene Feste unter dem Nordlicht. Bären, Yetis und Lichtgeister dienen dem Winterfürsten.'
  },
  {
    id: 'moorkrypta', name: 'Versunkene Moorkrypta', theme: 'gift', entry: { map: 8, corner: 'tr' }, floor: 'SWAMP', portal: '#8fe36a',
    wall: { top: '#2e3a26', face: '#10180c', line: '#6a8a3a' }, ambient: { kind: 'wisps', tint: [30, 70, 20, 0.16] },
    mobs: ['i_moorghul', 'i_moorhexe', 'i_moorhund'], minis: ['fenrik', 'morgrah', 'moorschlund', 'ertrunkener'], boss: 'vethra',
    gate: { stone: '#5a6a4a', top: '#7a8a5a', accent: '#8fe36a', deep: '#0e2a08', mid: '#8fe36a', core: '#eaffd0', motes: 'firefly', spin: 0.9, emblem: 'snake' },
    text: 'Eine Krypta, die im Moor versunken ist. Gift sammelt sich in Lachen – bleibt nicht darin stehen.'
  },
  {
    id: 'knochenkathedrale', name: 'Knochenkathedrale', theme: 'tod', entry: { map: 8, corner: 'bl' }, floor: 'FLAGSTONE', portal: '#c8a8ff',
    wall: { top: '#3a3444', face: '#120e18', line: '#b48cff' }, ambient: { kind: 'wisps', tint: [30, 10, 50, 0.16] },
    mobs: ['i_knochenwaechter', 'i_seelenfresser', 'i_untoter'], minis: ['kantor', 'varis', 'knochenkoloss', 'mortheim'], boss: 'azrakel',
    gate: { stone: '#8a8494', top: '#d8d0c0', accent: '#c8a8ff', deep: '#1a0e2c', mid: '#c8a8ff', core: '#f4ecff', motes: 'wisp', spin: 0.85, emblem: 'skull' },
    text: 'Eine Kathedrale aus Gebeinen. Die Toten singen hier noch, und ihr Fürst wartet im Chor.'
  },
  {
    id: 'donnerschmiede', name: 'Donnerschmiede', theme: 'sturm', entry: { map: 3, corner: 'tl' }, floor: 'BASALT', portal: '#9fd0ff',
    wall: { top: '#3a3a44', face: '#14141a', line: '#9fd0ff' }, ambient: { kind: 'dust', tint: [30, 40, 80, 0.12] },
    mobs: ['i_schmiedetroll', 'i_donnerbock', 'i_blitzharpyie'], minis: ['raik', 'kyra', 'grumm', 'thorak'], boss: 'volund',
    gate: { stone: '#54545e', top: '#7a7a88', accent: '#9fd0ff', deep: '#0e1a3a', mid: '#9fd0ff', core: '#ffffff', motes: 'dust', spin: 1.2, emblem: 'anvil' },
    text: 'Eine Schmiede im Fels der Klamm, in der Blitze statt Feuer brennen.'
  },
  {
    id: 'sturmhorst', name: 'Sturmhorst', theme: 'sturm', entry: { map: 3, corner: 'br' }, floor: 'FLAGSTONE', portal: '#cfe8ff',
    wall: { top: '#5a5e68', face: '#1e2028', line: '#cfe8ff' }, ambient: { kind: 'dust', tint: [60, 70, 90, 0.1] },
    mobs: ['i_sturmharpyie', 'i_gargoyle', 'i_klammstier'], minis: ['ssyla', 'grom', 'ugrak', 'brontes'], boss: 'tempestra',
    gate: { stone: '#8a8e98', top: '#c8ccd4', accent: '#cfe8ff', deep: '#1a2438', mid: '#cfe8ff', core: '#ffffff', motes: 'wisp', spin: 1.4, emblem: null },
    text: 'Ein Horst hoch über der Klamm. Harpyien und Steinwächter dienen der Sturmkönigin.'
  },
  {
    id: 'glutkessel', name: 'Glutkessel', theme: 'feuer', entry: { map: 9, corner: 'tr' }, floor: 'BASALT', portal: '#ff8a2a',
    wall: { top: '#2a1a14', face: '#0c0604', line: '#ff8a2a' }, ambient: { kind: 'embers', tint: [120, 50, 0, 0.13] },
    mobs: ['i_magmagolem', 'i_glutkatze', 'i_feuerimp'], minis: ['sahir', 'schlackenfaust', 'ilyra', 'ignaroth'], boss: 'pyrrhos',
    gate: { stone: '#3a302c', top: '#5a443a', accent: '#ff8a2a', deep: '#3a1000', mid: '#ff8a2a', core: '#ffe2a0', motes: 'ember', spin: 1.2, emblem: 'flame' },
    text: 'Das glühende Innere des Feuerbergs. Golems aus Magma hüten den Kessel.'
  },
  {
    id: 'aschenzitadelle', name: 'Aschenzitadelle', theme: 'feuer', entry: { map: 9, corner: 'bl' }, floor: 'BASALT', portal: '#ff5a3a',
    wall: { top: '#2a2220', face: '#0a0606', line: '#ff5a3a' }, ambient: { kind: 'ash', tint: [80, 30, 20, 0.14] },
    mobs: ['i_aschedaemon', 'i_brut', 'i_aschedrache'], minis: ['kael', 'ishra', 'vorr', 'barak'], boss: 'vulkhar',
    gate: { stone: '#4a403c', top: '#6a5a54', accent: '#ff5a3a', deep: '#2a0600', mid: '#ff5a3a', core: '#ffd8b0', motes: 'ember', spin: 1.3, emblem: 'flame' },
    text: 'Eine Zitadelle aus Asche und Ruß, Nest der Aschedrachen.'
  }
];
for (const d of INSTANCES) Object.assign(d, { minLevel: 60, inst60: true, rows: 2, stones: [60, 62] });

// Lv-80-Instanzen (seit 13.85): zwei Instanzen im Kristallabgrund (Map 10), wie die Lv-60-Instanzen in den Ecken der
// Map und genauso aufgebaut (zwei Blöcke hoch, vier Wächter, versiegelter Boss), nur auf Stufe 76–80.
// instLevel: Stufe der Gegner in den Räumen (js/instanzen.js nimmt sie statt INST.level); minLevel: Betreten ab Stufe
// (Gegner: Aussehen der neuen Monster des Abgrunds, siehe daten/monster.js und karte80.js)
const INST80_MOBS = [
  ['i_spiegelgolem', 'kristallgolem', 'Spiegelgolem', { skin: '#6a7ac8', cracks: '#e0f4ff' }],
  ['i_glasspinne', 'splitterspinne', 'Glasspinne', { body: '#4a5a9a', mark: '#e0f4ff' }],
  ['i_frostseele', 'abgrundgeist', 'Spiegelseele', { body: '#a8c8ff', crown: '#ffffff' }],
  ['i_leerenwache', 'leerenritter', 'Leerenwache', { torso: '#1e1830', cape: '#2a1050' }],
  ['i_schattenjaeger', 'schattenpirscher', 'Schattenjäger', { fur: '#120e1e', stripes: '#c86aff' }],
  ['i_leerenwyrmling', 'kristallwyrm', 'Leerenwyrmling', { fur: '#2a2050', belly: '#b48cff' }]
];
for (const [id, base, name, t3] of INST80_MOBS) {
  const b = MONSTER_TYPES[base];
  MONSTER_TYPES[id] = {
    ...b, name, level: 78, look: base, lookScale: 1.05, hpMul: +((b.hpMul || 1) * 1.15).toFixed(2), atkMul: +((b.atkMul || 1) * 1.3).toFixed(2),
    aggressive: true, dungeon: true, t3
  };
}
// Wächter (Rang 0–3) und Boss (Rang 4): Leben und Angriff wie INST_RANKS, Stufe 76–80
const INST80_BOSSES = [
  // Spiegelgruft (oben links): Kristall und Eis
  ['glimra', 'splitterspinne', 'Glimra, die Splitterweberin', 'Ihre Fäden schneiden wie Glas', 'eis', 0, 2.3, '#cfe4ff', ['leap', 'fan', 'spikes', 'volley'], { body: '#5a6ab8', mark: '#ffffff' }, 'i_glasspinne'],
  ['korvald', 'kristallgolem', 'Korvald Spiegelfaust', 'Er zerschlägt den Boden zu Scherben', 'eis', 1, 1.8, '#9fd8ff', ['slam', 'spikes', 'pull', 'buster'], { skin: '#7a8ad8', cracks: '#ffffff' }, 'i_spiegelgolem'],
  ['ysolde', 'abgrundgeist', 'Ysolde, Stimme im Spiegel', 'Ihr Hagel deckt den ganzen Saal', 'eis', 2, 2.1, '#e0f0ff', ['rain', 'ringout', 'volley', 'chain'], { body: '#c8dcff', crown: '#9fd8ff' }, 'i_frostseele'],
  ['brakkar', 'kristallwyrm', 'Brakkar Glasschwinge', 'Der letzte Wächter vor der Herrin', 'eis', 3, 1.5, '#bfe4ff', ['fan', 'charge', 'rain', 'line', 'buster'], { fur: '#8a9ae8', belly: '#ffffff' }, 'i_glasspinne'],
  ['aelthys', 'vaelith', 'Aelthys, Herrin der Spiegel', 'Herrin der Spiegelgruft', 'eis', 4, 1.25, '#cfe4ff', ['rain', 'fan', 'ringout', 'spikes', 'pull', 'slam', 'volley'], { robe: '#c8d4ff', torso: '#c8d4ff' }, 'i_frostseele'],
  // Thron der Leere (unten rechts): Schatten und Leere
  ['nachtkralle', 'schattenpirscher', 'Nachtkralle', 'Sie springt aus dem Dunkel', 'tod', 0, 2.3, '#c8a8ff', ['leap', 'fan', 'charge', 'spikes'], { fur: '#0e0a18', stripes: '#e08aff' }, 'i_schattenjaeger'],
  ['xul', 'abgrundgeist', 'Xul, der Hohle', 'Seine Blitze springen von Spieler zu Spieler', 'tod', 1, 2.1, '#b48cff', ['chain', 'volley', 'ringout', 'rain'], { body: '#6a4ab8', crown: '#2a1a4a' }, 'i_leerenwache'],
  ['gharon', 'kristallgolem', 'Gharon, Wächter des Schlunds', 'Er zieht euch in die Tiefe', 'tod', 2, 1.8, '#a88cff', ['pull', 'slam', 'cross', 'buster'], { skin: '#2a2050', cracks: '#c86aff' }, 'i_leerenwache'],
  ['morvaine', 'leerenritter', 'Ritter Morvaine', 'Die Klinge des Leerenfürsten', 'tod', 3, 1.9, '#c8a8ff', ['charge', 'cross', 'line', 'core', 'leap'], { cape: '#1a0a3a', torso: '#141024' }, 'i_schattenjaeger'],
  ['nihilor', 'leerenritter', 'Nihilor, Fürst der Leere', 'Herr des Throns der Leere', 'tod', 4, 2.6, '#b48cff', ['cross', 'rain', 'chain', 'pull', 'fan', 'slam', 'leap'], { cape: '#2a0a4a', torso: '#0e0a18', skin: '#6a6488' }, 'i_leerenwyrmling']
];
for (const [id, base, name, title, fx, rank, scale, color, moves, t3, summon] of INST80_BOSSES) {
  const b = MONSTER_TYPES[base];
  const R = INST_RANKS[rank];
  const final = rank === 4;
  const mat = (b.boss && b.boss.mat) || base;
  MONSTER_TYPES[id] = {
    name, level: 76 + rank, shape: b.shape, color: b.color, accent: b.accent, size: R.size, speed: Math.min(130, (b.speed || 100) + 10),
    range: final ? 80 : 56, cooldown: final ? 1.8 : 1.6, aggressive: true, hpMul: R.hpMul, atkMul: R.atkMul, dungeon: true,
    look: base, lookScale: scale, t3,
    boss: { color, slam: final ? 210 : 150 + rank * 10, volley: final ? 12 : 8, shot: color, summon, mat },
    inst: { rank, final, fx, title, moves, ult: final ? INST_ULT_NAME[fx] : null }
  };
}
const INSTANCES80 = [
  {
    id: 'spiegelgruft', name: 'Spiegelgruft', theme: 'eis', entry: { map: 10, corner: 'tl' }, floor: 'KRISTALL', portal: '#9fd8ff',
    wall: { top: '#7a80c0', face: '#1e2048', line: '#cfe4ff' }, ambient: { kind: 'shards', tint: [60, 80, 160, 0.12] },
    mobs: ['i_spiegelgolem', 'i_glasspinne', 'i_frostseele'], minis: ['glimra', 'korvald', 'ysolde', 'brakkar'], boss: 'aelthys',
    gate: { stone: '#6a6ea8', top: '#c8d4ff', topK: 0.6, accent: '#9fd8ff', deep: '#0e1442', mid: '#9fd8ff', core: '#ffffff', motes: 'snow', spin: 0.8, emblem: 'flake' },
    text: 'Eine Gruft aus Spiegelkristall unter den Hängen. Golems, Spinnen und Seelen aus Glas dienen ihrer Herrin.'
  },
  {
    id: 'leerenthron', name: 'Thron der Leere', theme: 'tod', entry: { map: 10, corner: 'br' }, floor: 'FLAGSTONE', portal: '#b48cff',
    wall: { top: '#2a2444', face: '#0a0816', line: '#b48cff' }, ambient: { kind: 'shards', tint: [40, 20, 80, 0.16] },
    mobs: ['i_leerenwache', 'i_schattenjaeger', 'i_leerenwyrmling'], minis: ['nachtkralle', 'xul', 'gharon', 'morvaine'], boss: 'nihilor',
    gate: { stone: '#3a3458', top: '#5a5080', accent: '#b48cff', deep: '#120830', mid: '#b48cff', core: '#f0e4ff', motes: 'wisp', spin: 1.1, emblem: 'skull' },
    text: 'Tief im Abgrund steht ein Thron, auf dem die Leere selbst sitzt. Ritter, Schatten und Wyrmlinge halten Wache.'
  }
];
for (const d of INSTANCES80) Object.assign(d, { minLevel: 75, instLevel: 78, inst60: true, rows: 2, stones: [75, 80] });
INSTANCES.push(...INSTANCES80);
