// Ausrüstung: acht Plätze, acht Gegenstandsstufen und Verbesserungen beim Schmied von +0 bis +20.
// Waffe, Rüstung und Helm gehören immer zu einer Klasse, den Schild trägt nur der Krieger;
// Schultern, Umhang, Schuhe und Gürtel kann jeder tragen.
// Die Stufen 1 bis 4 (ab Lv 1, 5, 10, 15) verkaufen Waffen- und Rüstungshändler,
// ab der legendären Stufe (Lv 22, 30, 45, 60) gibt es Ausrüstung nur als Beute.

const EQUIP_SLOTS = [
  { id: 'waffe', name: 'Waffe' },
  { id: 'ruestung', name: 'Rüstung' },
  { id: 'helm', name: 'Helm' },
  { id: 'schultern', name: 'Schultern' },
  { id: 'umhang', name: 'Umhang' },
  { id: 'schild', name: 'Schild' },
  { id: 'schuhe', name: 'Schuhe' },
  { id: 'guertel', name: 'Gürtel' }
];

// Plätze, die eine Klasse sieht: den Schild (oder als Klinge-Krieger die zweite Waffe) hat nur der Krieger
function equipSlotsFor(classId) {
  return EQUIP_SLOTS.filter((sl) => sl.id !== 'schild' || classId === 'krieger');
}

// Beidhändig: Krieger auf dem Weg der Klinge lernen ab Stufe 30 beim Waffenhändler,
// ein zweites Schwert in der Nebenhand zu führen. Die Nebenhand gibt einen Teil des Angriffs
// und etwas Tempo, aber kein Blocken. Zweihänder führt nur der Weg des Leibes.
const DUAL_WIELD = { level: 30, path: 0, price: 20000, atk: 0.3, atkSpeed: 0.05, bonus: 0.5 };
const GREATSWORD_PATH = 1;

// Ab welcher Spielerstufe ein Gegenstand getragen werden kann
const ITEM_TIERS = [
  { level: 1, label: 'Grundausrüstung' },
  { level: 5, label: 'Solide' },
  { level: 10, label: 'Gut' },
  { level: 15, label: 'Selten' },
  { level: 22, label: 'Legendär' },
  { level: 30, label: 'Mythisch' },
  { level: 45, label: 'Himmlisch' },
  { level: 60, label: 'Göttlich' }
];

// Plätze, deren Ausrüstung nur eine Klasse tragen kann
const CLASS_SLOTS = ['waffe', 'ruestung', 'helm'];

// Waffenarten. Jede Klasse hat ihre eigenen; sie unterscheiden sich in Schaden und Tempo.
//   atkMul    Faktor auf den Angriffswert der Stufe
//   atkSpeed  Angriffstempo (+ schneller, − langsamer)
//   ranged    normale Angriffe als Fernschuss
//   magic     Magiestärke: erhöht den Schaden der Fertigkeiten
//   twoHanded braucht beide Hände: kein Schild möglich (Blocken gibt es nur mit Schild)
const WEAPON_KINDS = {
  sword: { name: 'Schwert', cls: 'krieger', atkMul: 1, atkSpeed: 0, text: 'ausgewogen' },
  axe: { name: 'Axt', cls: 'krieger', atkMul: 1.08, atkSpeed: -0.06, text: 'wuchtiger als das Schwert, etwas langsamer, mit Schild' },
  greatsword: { name: 'Zweihänder', cls: 'krieger', path: GREATSWORD_PATH, atkMul: 1.45, atkSpeed: -0.15, twoHanded: true, text: 'nur Weg des Leibes: viel Schaden, langsam, kein Schild' },
  greataxe: { name: 'Streitaxt', cls: 'krieger', path: GREATSWORD_PATH, atkMul: 1.55, atkSpeed: -0.22, twoHanded: true, text: 'nur Weg des Leibes: der härteste Schlag, sehr langsam, kein Schild' },
  dagger: { name: 'Dolche', cls: 'ninja', atkMul: 0.88, atkSpeed: 0.15, text: 'schnell, oft kritisch' },
  bow: { name: 'Bogen', cls: 'ninja', atkMul: 1, atkSpeed: -0.05, ranged: true, twoHanded: true, text: 'greift aus der Ferne an, kein Schild' },
  fan: { name: 'Fächer', cls: 'schamane', atkMul: 0.85, atkSpeed: 0, magic: true, text: 'Magiestärke für Fertigkeiten' },
  bell: { name: 'Glocke', cls: 'schamane', atkMul: 0.7, atkSpeed: -0.1, magic: true, magicMul: 1.6, text: 'sehr viel Magiestärke, langsam' },
  staff: { name: 'Stab', cls: 'nekromant', atkMul: 0.9, atkSpeed: 0, magic: true, text: 'Magiestärke für Fertigkeiten' },
  scythe: { name: 'Sense', cls: 'nekromant', atkMul: 1.15, atkSpeed: -0.12, magic: true, magicMul: 0.6, twoHanded: true, text: 'mehr Schaden, weniger Magie, kein Schild' },
  // seit 8.6: das Zepter des Magiers, einhändig, mit schwebendem Kristall in der Farbe seines Elements
  rod: { name: 'Zepter', cls: 'magier', atkMul: 0.9, atkSpeed: 0, magic: true, text: 'Magiestärke für Fertigkeiten' }
};
const CLASS_WEAPON_KINDS = { krieger: ['sword', 'axe', 'greatsword', 'greataxe'], ninja: ['dagger', 'bow'], schamane: ['fan', 'bell'], nekromant: ['staff', 'scythe'], magier: ['rod'] };

// Namen je Stufe. Waffen nach Art, Rüstungen und Helme nach Klasse, der Rest für alle gleich.
const ITEM_NAMES = {
  waffe: {
    sword: ['Eisenschwert', 'Breitschwert', 'Mondklinge', 'Drachenschwert', 'Seelenreißer', 'Aschenklinge', 'Himmelsschwert', 'Götterklinge'],
    axe: ['Beil', 'Bartaxt', 'Wolfsaxt', 'Drachenaxt', 'Seelenhacker', 'Aschenaxt', 'Himmelsaxt', 'Götteraxt'],
    greataxe: ['Holzfälleraxt', 'Doppelaxt', 'Barbarenaxt', 'Drachenspalter', 'Seelenschlächter', 'Aschenhenker', 'Himmelsbrecher', 'Götterhammer'],
    greatsword: ['Holzfällerklinge', 'Langschwert', 'Sichelzweihänder', 'Drachentöter', 'Seelenspalter', 'Aschenbrecher', 'Himmelsrichter', 'Götterzorn'],
    dagger: ['Kurzdolche', 'Zwillingsdolche', 'Schattendolche', 'Viperzähne', 'Nachtklingen', 'Aschendolche', 'Sternendolche', 'Götterzähne'],
    bow: ['Jagdbogen', 'Kurzbogen', 'Schattenbogen', 'Viperbogen', 'Nachtbogen', 'Aschenbogen', 'Sternenbogen', 'Götterbogen'],
    fan: ['Papierfächer', 'Seidenfächer', 'Kranichfächer', 'Phönixfächer', 'Drachenfächer', 'Glutfächer', 'Himmelsfächer', 'Götterfächer'],
    bell: ['Bronzeglocke', 'Tempelglocke', 'Kranichglocke', 'Phönixglocke', 'Drachenglocke', 'Glutglocke', 'Himmelsglocke', 'Götterglocke'],
    staff: ['Knochenstab', 'Eschenstab', 'Grabesstab', 'Seelenstab', 'Totenkönigsstab', 'Aschenstab', 'Sternenstab', 'Götterstab'],
    scythe: ['Rostsense', 'Grabsense', 'Knochensense', 'Seelensense', 'Totenkönigssense', 'Aschensense', 'Sternensense', 'Göttersense'],
    rod: ['Lehrlingszepter', 'Silberzepter', 'Mondzepter', 'Kristallzepter', 'Arkanzepter', 'Aschenzepter', 'Sternzepter', 'Erzmagierzepter']
  },
  ruestung: {
    krieger: ['Lederpanzer', 'Kettenhemd', 'Lamellenpanzer', 'Drachenpanzer', 'Seelenpanzer', 'Aschenpanzer', 'Himmelspanzer', 'Götterpanzer'],
    ninja: ['Leinenwams', 'Lederwams', 'Schattenwams', 'Viperngewand', 'Nachtgewand', 'Aschengewand', 'Sternengewand', 'Göttergewand'],
    schamane: ['Leinenrobe', 'Seidenrobe', 'Kranichrobe', 'Phönixrobe', 'Drachenrobe', 'Glutrobe', 'Himmelsrobe', 'Götterrobe'],
    nekromant: ['Grabtuch', 'Aschenrobe', 'Knochenrobe', 'Seelenrobe', 'Totenkönigsrobe', 'Schattenrobe', 'Sternenrobe', 'Götterrobe'],
    magier: ['Novizenrobe', 'Gelehrtenrobe', 'Runenmantel', 'Kristallrobe', 'Arkanrobe', 'Aschenmantel', 'Sternenmantel', 'Erzmagierornat']
  },
  helm: {
    krieger: ['Lederkappe', 'Bronzehelm', 'Eisenhelm', 'Drachenhelm', 'Seelenhelm', 'Aschenhelm', 'Himmelshelm', 'Götterhelm'],
    ninja: ['Stoffkapuze', 'Lederkapuze', 'Schattenkapuze', 'Viperkapuze', 'Nachtmaske', 'Aschenmaske', 'Sternenmaske', 'Göttermaske'],
    schamane: ['Stirnband', 'Seidenhaube', 'Kranichhaube', 'Phönixkrone', 'Drachenkrone', 'Glutkrone', 'Himmelskrone', 'Götterdiadem'],
    nekromant: ['Grabkapuze', 'Aschenkapuze', 'Knochenhelm', 'Seelenhaube', 'Totenkönigskrone', 'Schattenkrone', 'Sternenkapuze', 'Götterschädel'],
    magier: ['Novizenhut', 'Gelehrtenhut', 'Runenhut', 'Kristallhut', 'Arkanhut', 'Aschenhut', 'Sternenhut', 'Erzmagierreif']
  },
  schild: ['Holzschild', 'Bronzeschild', 'Eisenschild', 'Drachenschild', 'Seelenschild', 'Aschenschild', 'Himmelsschild', 'Götterschild'],
  schultern: ['Lederschultern', 'Bronzeschultern', 'Eisenschultern', 'Drachenschultern', 'Seelenschultern', 'Aschenschultern', 'Himmelsschultern', 'Götterschultern'],
  umhang: ['Wollumhang', 'Reiseumhang', 'Jägerumhang', 'Drachenumhang', 'Seelenumhang', 'Aschenumhang', 'Himmelsumhang', 'Götterumhang'],
  schuhe: ['Stoffschuhe', 'Lederstiefel', 'Wanderstiefel', 'Drachenstiefel', 'Seelenstiefel', 'Aschenstiefel', 'Himmelsstiefel', 'Götterstiefel'],
  guertel: ['Stoffgürtel', 'Ledergürtel', 'Kettengürtel', 'Drachengürtel', 'Seelengürtel', 'Aschengürtel', 'Himmelsgürtel', 'Göttergürtel']
};

// Grundwerte je Stufe. Die Grundausrüstung (Stufe 1) gibt nur Rüstung bzw. bei Waffen nur Angriff,
// Zusatzeffekte gibt es erst ab Stufe 5. Bedeutung der Werte:
//   atk Angriff · def Rüstung · hp Vitalität (mehr Leben) · mp Intelligenz (mehr Mana)
//   crit kritische Treffer · speed Lauftempo · dodge Ausweichen · block Blocken
//   regen Lebensregeneration pro Sekunde (Anteil am maximalen Leben)
const BASE_STATS = {
  waffe: [{ atk: 5 }, { atk: 10 }, { atk: 17 }, { atk: 26 }, { atk: 42 }, { atk: 62 }, { atk: 92 }, { atk: 130 }],
  ruestung: [{ def: 4 }, { def: 6, hp: 40 }, { def: 10, hp: 70 }, { def: 15, hp: 110 }, { def: 22, hp: 160 }, { def: 32, hp: 240 }, { def: 46, hp: 360 }, { def: 64, hp: 520 }],
  helm: [{ def: 2 }, { def: 3, mp: 18 }, { def: 5, mp: 28 }, { def: 7, mp: 40 }, { def: 11, mp: 55 }, { def: 16, mp: 80 }, { def: 23, mp: 115 }, { def: 32, mp: 160 }],
  schild: [{ def: 3 }, { def: 4, block: 0.05 }, { def: 7, block: 0.07 }, { def: 10, block: 0.09 }, { def: 15, block: 0.12 }, { def: 22, block: 0.14 }, { def: 31, block: 0.16 }, { def: 43, block: 0.18 }],
  schultern: [{ def: 2 }, { def: 3, hp: 20 }, { def: 5, hp: 35 }, { def: 7, hp: 55 }, { def: 10, hp: 80 }, { def: 14, hp: 120 }, { def: 20, hp: 180 }, { def: 28, hp: 260 }],
  umhang: [{ def: 1 }, { def: 2, mp: 15, dodge: 0.01 }, { def: 3, mp: 25, dodge: 0.015 }, { def: 5, mp: 35, dodge: 0.02 }, { def: 7, mp: 50, dodge: 0.025 }, { def: 10, mp: 75, dodge: 0.03 }, { def: 14, mp: 110, dodge: 0.035 }, { def: 19, mp: 150, dodge: 0.04 }],
  schuhe: [{ def: 2 }, { def: 2, speed: 0.02 }, { def: 3, speed: 0.025, dodge: 0.02 }, { def: 4, speed: 0.03, dodge: 0.03 }, { def: 6, speed: 0.035, dodge: 0.05 }, { def: 9, speed: 0.04, dodge: 0.06 }, { def: 13, speed: 0.045, dodge: 0.07 }, { def: 18, speed: 0.05, dodge: 0.08 }],
  guertel: [{ def: 1 }, { hp: 30, regen: 0.002 }, { hp: 50, regen: 0.003 }, { hp: 80, regen: 0.004 }, { hp: 120, regen: 0.006 }, { hp: 180, regen: 0.007 }, { hp: 270, regen: 0.008 }, { hp: 390, regen: 0.01 }]
};

// Zusatzwerte je Waffenart und Stufe: Dolche und Bögen treffen öfter kritisch,
// Fächer, Glocken, Stäbe und Sensen geben Mana und Magiestärke (Stufe 1 ohne Zusatzwert)
const CRIT_BY_TIER = [0, 0.02, 0.03, 0.04, 0.06, 0.07, 0.08, 0.1];
const MP_BY_TIER = [0, 20, 35, 50, 75, 110, 160, 220];
const MAGIC_BY_TIER = [0, 0.04, 0.06, 0.09, 0.12, 0.16, 0.21, 0.27];
// Bessere Waffen werden auch etwas schneller
const SPEED_BY_TIER = [0, 0, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08];

// Rüstung und Helm je Klasse: Krieger halten mehr aus, Ninjas weichen aus, Magier bekommen Mana
const CLASS_ARMOR = {
  krieger: { def: 1.25, hp: 1.15 },
  ninja: { def: 1, hp: 1, dodge: 0.008 },
  schamane: { def: 0.85, hp: 0.85, mp: 0.5 },
  nekromant: { def: 0.85, hp: 0.85, mp: 0.5 },
  magier: { def: 0.8, hp: 0.85, mp: 0.6 }
};

const MAX_PLUS = 20;
const PLUS_BONUS = 0.1; // jedes Plus gibt +10 % der Grundwerte (mindestens +1)
const MAX_BLOCK = 0.4;

// Schmied: Index = aktuelles Plus (also der Schritt von +N auf +N+1).
// fail: 'none' = nur die Kosten sind weg, 'down' = Gegenstand fällt um 1, 'break' = Gegenstand zerbricht.
// Gold wird mit (Gegenstandsstufe + 1) multipliziert.
const UPGRADE_STEPS = [
  { chance: 1.0, gold: 50, splinters: 1, fail: 'none' },
  { chance: 0.95, gold: 120, splinters: 1, fail: 'none' },
  { chance: 0.9, gold: 250, splinters: 1, fail: 'none' },
  { chance: 0.8, gold: 450, splinters: 2, fail: 'none' },
  { chance: 0.7, gold: 700, splinters: 2, fail: 'none' },
  { chance: 0.6, gold: 1000, splinters: 3, fail: 'none' },
  { chance: 0.45, gold: 1500, splinters: 3, fail: 'none' },
  { chance: 0.3, gold: 2200, splinters: 4, fail: 'break' },
  { chance: 0.2, gold: 3000, splinters: 5, fail: 'break' },
  { chance: 0.3, gold: 4000, splinters: 6, fail: 'break' },
  { chance: 0.28, gold: 5000, splinters: 6, fail: 'break' },
  { chance: 0.26, gold: 6500, splinters: 7, fail: 'break' },
  { chance: 0.24, gold: 8000, splinters: 7, fail: 'break' },
  { chance: 0.22, gold: 10000, splinters: 8, fail: 'break' },
  { chance: 0.2, gold: 12500, splinters: 8, fail: 'break' },
  { chance: 0.18, gold: 15000, splinters: 9, fail: 'break' },
  { chance: 0.16, gold: 18000, splinters: 10, fail: 'break' },
  { chance: 0.14, gold: 22000, splinters: 11, fail: 'break' },
  { chance: 0.12, gold: 26000, splinters: 12, fail: 'break' },
  { chance: 0.1, gold: 32000, splinters: 14, fail: 'break' }
];

// Ab diesem Plus braucht der Schmied zusätzlich Teile von Monstern (Ausrüstung ab Lv 30 schon ab +4)
function upgradeMatStart(tier) {
  return ITEM_TIERS[tier].level >= 30 ? 4 : 6;
}

// Welche Monster-Teile eine Gegenstandsstufe braucht: zuerst die Monster des passenden Gebiets,
// für höhere Plus-Stufen die stärkeren Monster dort
const UPGRADE_MAT_MONSTERS = [
  ['hund', 'wolf', 'alphawolf', 'wildschwein'],
  ['hund', 'wolf', 'alphawolf', 'wildschwein'],
  ['bandit', 'banditschuetze', 'waldspinne', 'braunbaer'],
  ['bandit', 'banditschuetze', 'waldspinne', 'braunbaer'],
  ['ork', 'orkschamane', 'skorpion', 'orkhauptmann'],
  ['oger', 'daemon', 'hoellenhund'],
  ['eiswolf', 'yeti', 'frostgeist'],
  ['untoter', 'sumpfhexe', 'ghul', 'lavagolem', 'feuerdaemon', 'feuerdrache']
];

const LEGEND_MAT_START = 4;
// Monster-Teil und Anzahl für den Schritt von +plus auf +plus+1 (oder null)
function upgradeMaterial(item) {
  // Legendäre Endboss-Teile (seit 11.0): schon ab +4 und immer das Teil aus der Map ihres Endbosses, mehr davon
  if (item.legend && item.raidMat) {
    if (item.plus < LEGEND_MAT_START) return null;
    return { id: item.raidMat, count: Math.min(8, 2 + Math.floor((item.plus - LEGEND_MAT_START) / 2)) };
  }
  const start = upgradeMatStart(item.tier);
  if (item.plus < start) return null;
  const list = UPGRADE_MAT_MONSTERS[item.tier];
  const span = Math.ceil((MAX_PLUS - start) / list.length);
  const id = list[Math.min(list.length - 1, Math.floor((item.plus - start) / span))];
  return { id, count: Math.min(5, 1 + Math.floor((item.plus - start) / 3)) };
}

// Monster-Teile: jedes Monster lässt mit kleiner Chance sein eigenes Teil fallen
// art: Form des Symbols (siehe MOB_MAT_ART in ausruestung.js)
const MOB_MAT_CHANCE = 0.05;
const MOB_MATS = {
  hund: { name: 'Hundezahn', art: 'fang', color: '#f4ecd8' },
  wolf: { name: 'Wolfspelz', art: 'fur', color: '#8a8e96' },
  alphawolf: { name: 'Alphafell', art: 'fur', color: '#3a3e46' },
  wildschwein: { name: 'Keilerhauer', art: 'horn', color: '#e8dcc0' },
  bandit: { name: 'Banditenabzeichen', art: 'badge', color: '#9a2f2a' },
  banditschuetze: { name: 'Pfeilspitze', art: 'arrow', color: '#a8b0b8' },
  waldspinne: { name: 'Spinnenseide', art: 'silk', color: '#e8e8f0' },
  braunbaer: { name: 'Bärenkralle', art: 'claw', color: '#6a4a30' },
  ork: { name: 'Orkzahn', art: 'fang', color: '#c8d0a0' },
  orkschamane: { name: 'Schamanenfeder', art: 'feather', color: '#3a8ab0' },
  skorpion: { name: 'Giftstachel', art: 'claw', color: '#9be07a' },
  orkhauptmann: { name: 'Kriegsbanner', art: 'badge', color: '#c8a03a' },
  oger: { name: 'Ogerhorn', art: 'horn', color: '#a89c80' },
  daemon: { name: 'Dämonenhorn', art: 'horn', color: '#a8343f' },
  hoellenhund: { name: 'Höllenglut', art: 'core', color: '#ff7a2a' },
  eiswolf: { name: 'Eiswolfsfell', art: 'fur', color: '#d8e8f4' },
  yeti: { name: 'Yetifell', art: 'fur', color: '#f4f8fc' },
  frostgeist: { name: 'Frostkristall', art: 'crystal', color: '#bfe8ff' },
  untoter: { name: 'Grabstaub', art: 'dust', color: '#a8a088' },
  sumpfhexe: { name: 'Hexenkraut', art: 'herb', color: '#7ab04a' },
  ghul: { name: 'Ghulkralle', art: 'claw', color: '#8a9a70' },
  lavagolem: { name: 'Lavakern', art: 'core', color: '#ff5a1a' },
  feuerdaemon: { name: 'Feuerschwinge', art: 'feather', color: '#e0402a' },
  feuerdrache: { name: 'Drachenschuppe', art: 'scale', color: '#c8302a' },
  sandviper: { name: 'Vipernschuppe', art: 'scale', color: '#c8a060' },
  klapperschlange: { name: 'Klapperrassel', art: 'horn', color: '#d8c090' },
  kobra: { name: 'Kobragift', art: 'core', color: '#8fd16a' },
  riesenpython: { name: 'Pythonhaut', art: 'fur', color: '#4a6a3a' },
  naga: { name: 'Nagaperle', art: 'crystal', color: '#7ad8c8' },
  nagapriesterin: { name: 'Priesterinnensiegel', art: 'badge', color: '#9a5ac8' },
  trollkrieger: { name: 'Trollhauer', art: 'fang', color: '#d8e0b0' },
  harpyie: { name: 'Harpyienfeder', art: 'feather', color: '#9a7ab8' },
  minotaurus: { name: 'Minotaurushorn', art: 'horn', color: '#e8d8b8' },
  steintitan: { name: 'Titanenkern', art: 'core', color: '#c8b8a0' },
  gargoyle: { name: 'Gargoylekralle', art: 'claw', color: '#7a7a82' },
  donnerriese: { name: 'Donnerstein', art: 'crystal', color: '#9fd0ff' },
  fuchs: { name: 'Fuchsrute', art: 'fur', color: '#c8682a' },
  hirsch: { name: 'Geweihstück', art: 'horn', color: '#e0d0b0' },
  dornenkeiler: { name: 'Dornenborste', art: 'horn', color: '#6a8a3a' },
  luchs: { name: 'Luchspinsel', art: 'fur', color: '#b08a5a' },
  hyaene: { name: 'Hyänenzahn', art: 'fang', color: '#e8dcc0' },
  schakal: { name: 'Schakalohr', art: 'fur', color: '#c8a060' },
  warg: { name: 'Wargfang', art: 'fang', color: '#f0e0c8' },
  eisbaer: { name: 'Eisbärenfell', art: 'fur', color: '#eef4f8' },
  panther: { name: 'Schattenkralle', art: 'claw', color: '#4a4a5a' },
  mammut: { name: 'Mammutelfenbein', art: 'horn', color: '#f2ead6' },
  moorwolf: { name: 'Moorfell', art: 'fur', color: '#4a5a4a' },
  donnerbock: { name: 'Donnerhorn', art: 'horn', color: '#9fd0ff' },
  glutkatze: { name: 'Glutschnurrhaar', art: 'core', color: '#ff7a2a' }
};


// Farben der Plus-Stufen: +1–3 grün, +4–6 blau, +7–9 violett, +10–14 gold, +15–19 rot, +20 weiß
const PLUS_COLORS = [null, '#9fe08f', '#7fb8ff', '#c58cff', '#ffd34d', '#ff6a4a', '#ffffff'];

function plusBand(plus) {
  if (plus >= 20) return 6;
  if (plus >= 15) return 5;
  if (plus >= 10) return 4;
  if (plus >= 7) return 3;
  if (plus >= 4) return 2;
  if (plus >= 1) return 1;
  return 0;
}

// seit 10.4 nicht mehr beim Händler: nur noch selten aus Seelensteinen ab Stufe 35 (stone)
const BLESSING = {
  name: 'Segensschriftrolle',
  stone: 35,
  text: 'Schützt beim Schmied: Schlägt die Verbesserung fehl, passiert dem Gegenstand nichts. Nur die Kosten sind weg.'
};

// Tasche: vier Seiten mit je 20 Plätzen
const BAG_PAGE = 30; // seit 9.1: drei Reihen zu je 10 Plätzen (vorher 20)
const BAG_PAGES = 4;
const BAG_SIZE = BAG_PAGE * BAG_PAGES;

// Händler im Dorf: was sie verkaufen und zu welchem Preis je Stufe (Lv 1, 5, 10, 15)
const MERCHANTS = {
  waffen: {
    slots: ['waffe'],
    prices: [80, 400, 1100, 2600],
    greeting: 'Jede Klasse kämpft anders. Hier findest du die Waffe, die zu dir passt, von der ersten Klinge bis zum Meisterstück.'
  },
  ruestung: {
    slots: ['ruestung', 'helm', 'schultern', 'umhang', 'schild', 'schuhe', 'guertel'],
    prices: [60, 300, 900, 2200],
    greeting: 'Rüstung hält dich am Leben, Vitalität auch. Such dir aus, was du brauchst.'
  }
};

// --- Boni -----------------------------------------------------------------------------
// Jeder Gegenstand kann bis zu 5 normale Boni und 2 besondere Boni (6 und 7) tragen.
// fmt: flat = ganze Zahl, pct = Prozent, pct1 = Prozent mit einer Nachkommastelle.
// range: Spanne auf Gegenstandsstufe 1. Feste Werte (flat) wachsen um 35 % je Gegenstandsstufe (Statuswerte
// nur um 15 %, tierScale),
// Prozentwerte seit Version 5.9 nur um 10 % je Stufe und höchstens bis max (je Gegenstand).
// Dazu begrenzt BONUS_CAPS die Summe aller angelegten Gegenstände.
const ALL_SLOTS = ['waffe', 'ruestung', 'helm', 'schultern', 'umhang', 'schild', 'schuhe', 'guertel'];
const BONUS_TYPES = {
  hp: { name: 'Max. Leben', fmt: 'flat', range: [20, 90], slots: ALL_SLOTS },
  mp: { name: 'Max. Mana', fmt: 'flat', range: [15, 60], slots: ['waffe', 'ruestung', 'helm', 'umhang', 'guertel'] },
  atk: { name: 'Angriffswert', fmt: 'flat', range: [3, 14], slots: ['waffe', 'helm', 'schultern', 'guertel'] },
  def: { name: 'Verteidigung', fmt: 'flat', range: [2, 10], slots: ['ruestung', 'helm', 'schultern', 'umhang', 'schild', 'schuhe', 'guertel'] },
  str: { name: 'Stärke', fmt: 'flat', range: [1, 4], tierScale: 0.15, slots: ALL_SLOTS },
  vit: { name: 'Vitalität', fmt: 'flat', range: [1, 4], tierScale: 0.15, slots: ALL_SLOTS },
  int: { name: 'Intelligenz', fmt: 'flat', range: [1, 4], tierScale: 0.15, slots: ALL_SLOTS },
  dex: { name: 'Geschick', fmt: 'flat', range: [1, 4], tierScale: 0.15, slots: ALL_SLOTS },
  crit: { name: 'Kritische Treffer', fmt: 'pct', range: [0.01, 0.04], max: 0.08, slots: ['waffe', 'helm', 'guertel'] },
  atkSpeed: { name: 'Angriffstempo', fmt: 'pct', range: [0.02, 0.06], max: 0.12, slots: ['waffe', 'schuhe', 'guertel'] },
  speed: { name: 'Lauftempo', fmt: 'pct', range: [0.01, 0.03], max: 0.05, slots: ['schuhe'] },
  dodge: { name: 'Ausweichen', fmt: 'pct', range: [0.01, 0.03], max: 0.06, slots: ['ruestung', 'umhang', 'schild', 'schuhe'] },
  block: { name: 'Blocken', fmt: 'pct', range: [0.01, 0.04], max: 0.08, slots: ['schild'] },
  regen: { name: 'Lebensregeneration', fmt: 'pct1', range: [0.001, 0.003], max: 0.006, slots: ['ruestung', 'helm', 'schultern', 'guertel'] },
  monsterDmg: { name: 'Stark gegen Monster', fmt: 'pct', range: [0.02, 0.06], max: 0.1, slots: ['waffe', 'helm', 'guertel'] },
  dmgReduce: { name: 'Schadensreduktion', fmt: 'pct', range: [0.01, 0.03], max: 0.06, slots: ['ruestung', 'helm', 'schultern', 'umhang', 'schild'] },
  hpSteal: { name: 'Lebensraub', fmt: 'pct', range: [0.01, 0.03], max: 0.05, slots: ['waffe'] }
};

// Besondere Boni 6 und 7, nur über den Sternenstein
const SPECIAL_BONUS_TYPES = {
  skillDmg: { name: 'Fertigkeitsschaden', fmt: 'pct', range: [0.02, 0.05], max: 0.1 },
  basicDmg: { name: 'Normaler Schaden', fmt: 'pct', range: [0.02, 0.05], max: 0.1 },
  hpPct: { name: 'Max. Leben', fmt: 'pct', range: [0.02, 0.05], max: 0.08 },
  resist: { name: 'Erlittener Schaden', fmt: 'neg', range: [0.01, 0.03], max: 0.06 }
};

// Obergrenzen für die Summe der Boni aller angelegten Gegenstände
const BONUS_CAPS = {
  crit: 0.25, atkSpeed: 0.35, speed: 0.08, dodge: 0.2, regen: 0.015, monsterDmg: 0.2, dmgReduce: 0.2, hpSteal: 0.06,
  skillDmg: 0.4, basicDmg: 0.4, hpPct: 0.3, resist: 0.15
};

const MAX_NORMAL_BONUS = 5;
const MAX_SPECIAL_BONUS = 2;

// Materialien zum Verzaubern, Beute von Seelensteinen (werden automatisch aufgehoben)
const MATERIALS = [
  { id: 'boniPlus', name: 'Verstärkung', tag: 'Boni +', text: 'Fügt einen zufälligen Bonus hinzu, bis zum 4. Bonus.' },
  { id: 'boni5', name: 'Seltene Verstärkung', tag: '5. Bonus', text: 'Fügt den 5. Bonus hinzu. Der Gegenstand braucht dafür genau 4 Boni.' },
  { id: 'switcher', name: 'Switcher', tag: 'Switcher', text: 'Würfelt die Boni 1 bis 5 komplett neu aus. Die Anzahl bleibt gleich.' },
  { id: 'star', name: 'Sternenstein', tag: 'Bonus 6/7', text: 'Fügt den 6. Bonus hinzu, danach den 7. Besondere Boni wie Fertigkeitsschaden oder weniger erlittener Schaden.' },
  // seit 11.0: nur aus Seelensteinen ab Stufe 30, etwa jeder vierte bis fünfte Stein
  { id: 'switch67', name: 'Sternen-Switcher', tag: 'Switch 6/7', text: 'Würfelt Bonus 6 und 7 komplett neu aus. Die Anzahl bleibt gleich. Nur aus Seelensteinen ab Stufe 30.' }
];

// Farben der Materialien in der Beuteanzeige
const MATERIAL_COLORS = { boniPlus: '#9fd0ff', boni5: '#d6a8ff', switcher: '#9fe08f', star: '#ffd34d', switch67: '#ffb85a' };
// Sternen-Switcher: ab dieser Steinstufe, mit dieser Chance je Stein
const SWITCH67 = { stone: 30, chance: 0.22 };

// Was ein Seelenstein fallen lässt, steht bei den Steinen in monster.js (stoneDrops).
// Ausrüstung von Seelensteinen hat höchstens +2.
