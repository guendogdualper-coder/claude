// Ausrüstung: acht Plätze, zehn Gegenstandsstufen und Verbesserungen beim Schmied von +0 bis +20.
// Waffe, Rüstung und Helm gehören immer zu einer Klasse, den Schild trägt nur der Krieger;
// Schultern, Umhang, Schuhe und Gürtel kann jeder tragen.
// Die Stufen 1 bis 4 (ab Lv 1, 5, 10, 15) verkaufen Waffen- und Rüstungshändler,
// ab der Veteranen-Stufe (Lv 22, 30, 45, 60, 70, 80) gibt es Ausrüstung nur als Beute.
// Seit 13.56 hat jeder Gegenstand außerdem eine Seltenheit (item.rarity, siehe RARITIES): Stufe = Lv-Klammer,
// Seltenheit = Farbe (grau, grün, blau, lila, gold).
// Seit 13.53 reicht die Ausrüstung bis Stufe 80: nach Göttlich (Lv 60) kommen Abgründig (Lv 70, Leere: Obsidian
// und Violett mit cyanfarbenem Leuchten) und Ewig (Lv 80, Sternenfeuer: Platin mit Roségold und Sternen).

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
// seit 13.10 auch der Ninja: dort ist es die Nebenhand für den zweiten Dolch
function equipSlotsFor(classId) {
  return EQUIP_SLOTS.filter((sl) => sl.id !== 'schild' || classId === 'krieger' || classId === 'ninja');
}

// Beidhändig: Krieger auf dem Weg der Klinge lernen ab Stufe 30 beim Waffenhändler,
// eine zweite Einhandwaffe in der Nebenhand zu führen. Die Nebenhand gibt einen Teil des Angriffs
// und etwas Tempo, aber kein Blocken. Zweihänder führt nur der Weg des Leibes.
// seit 13.85: Schwert oder Axt (kinds), auch gemischt – vorher passte nur ein Schwert
const DUAL_WIELD = { level: 30, path: 0, price: 20000, atk: 0.3, atkSpeed: 0.05, bonus: 0.5, kinds: ['sword', 'axe'] };
// Titanengriff (seit 13.49): Krieger des Leibes führen ab Stufe 20 eine Zweihandwaffe in einer Hand – und damit zwei
// gleiche Zweihänder (zwei Streitäxte oder zwei Zweihänder). Die zweite zählt wie bei der Beidhändigkeit zum Teil.
const TITAN_GRIP = { level: 20, path: 1, price: 15000, atk: 0.35, atkSpeed: 0.03, bonus: 0.5 };
// Ninja (seit 13.10): ein Dolch je Hand, von Anfang an. Ein Dolch allein ist schwächer als früher das Dolchpaar;
// mit dem zweiten Dolch in der Nebenhand (zählt zu 45 %, Boni zur Hälfte) ist er etwas stärker als vorher.
const DUAL_DAGGER = { atk: 0.45, atkSpeed: 0.04, bonus: 0.5 };
const GREATSWORD_PATH = 1;

// Ab welcher Spielerstufe ein Gegenstand getragen werden kann.
// Seit 13.56 heißen Lv 15, 22 und 30 Gehärtet, Veteran und Meister (vorher Selten, Legendär, Mythisch):
// „Selten“ und „Legendär“ sind jetzt Seltenheiten (Farben), keine Stufen mehr.
const ITEM_TIERS = [
  { level: 1, label: 'Grundausrüstung' },
  { level: 5, label: 'Solide' },
  { level: 10, label: 'Gut' },
  { level: 15, label: 'Gehärtet' },
  { level: 22, label: 'Veteran' },
  { level: 30, label: 'Meister' },
  { level: 45, label: 'Himmlisch' },
  { level: 60, label: 'Göttlich' },
  { level: 70, label: 'Abgründig' },
  { level: 80, label: 'Ewig' }
];

// --- Seltenheit (seit 13.56) ------------------------------------------------------------------------------------
// item.rarity 0–4, eine eigene Eigenschaft neben der Stufe (tier). Die Logik steht in seltenheit.js.
//   color    Farbe von Name, Rahmen, Leuchten und Beutestrahl (auf den dunklen Fenstern gut lesbar)
//   bonus    so viele Boni (1–5) bringt ein Gegenstand dieser Seltenheit gleich mit
//   statMul  Faktor auf die Grundwerte Angriff, Rüstung, Leben und Mana (vor dem Plus)
//   minTier  erst ab dieser Gegenstandsstufe: episch ab Göttlich (Lv 60), legendär nur Ewig (Lv 80)
// Ein goldenes Teil entspricht etwa den bisherigen legendären Endboss-Teilen (4–5 Boni).
const RARITIES = [
  { id: 'normal', name: 'Normal', color: '#a4a4a4', bonus: [0, 0], statMul: 1, minTier: 0 },
  { id: 'gewoehnlich', name: 'Gewöhnlich', color: '#4ccf5a', bonus: [1, 2], statMul: 1.04, minTier: 0 },
  { id: 'selten', name: 'Selten', color: '#4a98ff', bonus: [2, 3], statMul: 1.08, minTier: 0 },
  { id: 'episch', name: 'Episch', color: '#b06cff', bonus: [3, 4], statMul: 1.14, minTier: 7 },
  { id: 'legendaer', name: 'Legendär', color: '#ffb21a', bonus: [4, 5], statMul: 1.22, minTier: 9 }
];
const RARITY_STAT_KEYS = ['atk', 'def', 'hp', 'mp'];

// Woher welche Seltenheit kommt. w: Gewichte für [normal, grün, blau, lila, gold]; die Seltenheit wird danach auf
// das gekappt, was die Gegenstandsstufe erlaubt (minTier), z. B. ein Endboss-Teil unter Lv 60 höchstens blau.
//   epic       Chance je Teil auf ein episches Teil (hebt die Stufe auf mindestens Göttlich, Lv 60)
//   epicFrom   … nur bei Gegnern ab dieser Stufe (Dungeon-Bosse ab Stufe 50)
//   legendary  Chance je Teil auf ein legendäres Teil (immer Ewig, Lv 80) – nur in Instanzen
//   minBonus   mindestens so viele Boni (Endboss-Teile hatten schon immer vier)
const RARITY_DROPS = {
  merchant: { byTier: [0, 0, 0, 1] }, // Händler: grau, das Meisterstück (Gehärtet, Lv 15) grün mit 1 Bonus
  mob: { w: [74, 23, 3] }, // normale Monster: meist grau oder grün, selten blau
  stoneMob: { w: [58, 35, 7] }, // Monster aus Seelensteinen und in Dungeons
  stone: { w: [0, 62, 38] }, // Seelensteine: grün oder blau
  boss: { w: [0, 50, 50], epic: 0.05, epicFrom: 50 }, // Dungeon-Bosse: grün/blau, ab Stufe 50 mit 5 % je Teil episch
  raid: { w: [0, 0, 0, 1], minBonus: 4 }, // Endbosse der Maps: episch (darunter so gut wie die Stufe erlaubt)
  instance: { w: [0, 0, 0, 1], legendary: 0.02, minBonus: 4 }, // Instanz-Wächter (Höllenthron): episch, 2 % legendär
  instanceBoss: { w: [0, 0, 0, 1], legendary: 0.12, minBonus: 5 } // Instanzboss (Abaddor): Zusatzteil, 12 % legendär
};

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
  dagger: { name: 'Dolch', cls: 'ninja', atkMul: 0.7, atkSpeed: 0.15, text: 'schnell, oft kritisch; ein zweiter Dolch passt in die Nebenhand' },
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
    sword: ['Eisenschwert', 'Breitschwert', 'Mondklinge', 'Drachenschwert', 'Seelenreißer', 'Aschenklinge', 'Himmelsschwert', 'Götterklinge', 'Abgrundschwert', 'Ewigkeitsschwert'],
    axe: ['Beil', 'Bartaxt', 'Wolfsaxt', 'Drachenaxt', 'Seelenhacker', 'Aschenaxt', 'Himmelsaxt', 'Götteraxt', 'Abgrundaxt', 'Ewigkeitsaxt'],
    greataxe: ['Holzfälleraxt', 'Doppelaxt', 'Barbarenaxt', 'Drachenspalter', 'Seelenschlächter', 'Aschenhenker', 'Himmelsbrecher', 'Götterhammer', 'Abgrundreißer', 'Ewigkeitsspalter'],
    greatsword: ['Holzfällerklinge', 'Langschwert', 'Sichelzweihänder', 'Drachentöter', 'Seelenspalter', 'Aschenbrecher', 'Himmelsrichter', 'Götterzorn', 'Abgrundfresser', 'Ewigkeitsbrand'],
    dagger: ['Kurzdolch', 'Stahldolch', 'Schattendolch', 'Viperzahn', 'Nachtklinge', 'Aschendolch', 'Sternendolch', 'Götterzahn', 'Abgrundstachel', 'Ewigkeitsdorn'],
    bow: ['Jagdbogen', 'Kurzbogen', 'Schattenbogen', 'Viperbogen', 'Nachtbogen', 'Aschenbogen', 'Sternenbogen', 'Götterbogen', 'Abgrundbogen', 'Ewigkeitsbogen'],
    fan: ['Papierfächer', 'Seidenfächer', 'Kranichfächer', 'Phönixfächer', 'Drachenfächer', 'Glutfächer', 'Himmelsfächer', 'Götterfächer', 'Abgrundfächer', 'Ewigkeitsfächer'],
    bell: ['Bronzeglocke', 'Tempelglocke', 'Kranichglocke', 'Phönixglocke', 'Drachenglocke', 'Glutglocke', 'Himmelsglocke', 'Götterglocke', 'Abgrundglocke', 'Ewigkeitsglocke'],
    staff: ['Knochenstab', 'Eschenstab', 'Grabesstab', 'Seelenstab', 'Totenkönigsstab', 'Aschenstab', 'Sternenstab', 'Götterstab', 'Abgrundstab', 'Ewigkeitsstab'],
    scythe: ['Rostsense', 'Grabsense', 'Knochensense', 'Seelensense', 'Totenkönigssense', 'Aschensense', 'Sternensense', 'Göttersense', 'Abgrundsense', 'Ewigkeitssense'],
    rod: ['Lehrlingszepter', 'Silberzepter', 'Mondzepter', 'Kristallzepter', 'Arkanzepter', 'Aschenzepter', 'Sternzepter', 'Erzmagierzepter', 'Abgrundzepter', 'Ewigkeitszepter']
  },
  ruestung: {
    krieger: ['Lederpanzer', 'Kettenhemd', 'Lamellenpanzer', 'Drachenpanzer', 'Seelenpanzer', 'Aschenpanzer', 'Himmelspanzer', 'Götterpanzer', 'Abgrundpanzer', 'Ewigkeitspanzer'],
    ninja: ['Leinenwams', 'Lederwams', 'Schattenwams', 'Viperngewand', 'Nachtgewand', 'Aschengewand', 'Sternengewand', 'Göttergewand', 'Abgrundgewand', 'Ewigkeitsgewand'],
    schamane: ['Leinenrobe', 'Seidenrobe', 'Kranichrobe', 'Phönixrobe', 'Drachenrobe', 'Glutrobe', 'Himmelsrobe', 'Götterrobe', 'Abgrundrobe', 'Ewigkeitsrobe'],
    nekromant: ['Grabtuch', 'Aschenrobe', 'Knochenrobe', 'Seelenrobe', 'Totenkönigsrobe', 'Schattenrobe', 'Sternenrobe', 'Götterrobe', 'Abgrundtalar', 'Ewigkeitstalar'],
    magier: ['Novizenrobe', 'Gelehrtenrobe', 'Runenmantel', 'Kristallrobe', 'Arkanrobe', 'Aschenmantel', 'Sternenmantel', 'Erzmagierornat', 'Abgrundmantel', 'Ewigkeitsornat']
  },
  helm: {
    krieger: ['Lederkappe', 'Bronzehelm', 'Eisenhelm', 'Drachenhelm', 'Seelenhelm', 'Aschenhelm', 'Himmelshelm', 'Götterhelm', 'Abgrundhelm', 'Ewigkeitshelm'],
    ninja: ['Stoffkapuze', 'Lederkapuze', 'Schattenkapuze', 'Viperkapuze', 'Nachtmaske', 'Aschenmaske', 'Sternenmaske', 'Göttermaske', 'Abgrundmaske', 'Ewigkeitsmaske'],
    schamane: ['Stirnband', 'Seidenhaube', 'Kranichhaube', 'Phönixkrone', 'Drachenkrone', 'Glutkrone', 'Himmelskrone', 'Götterdiadem', 'Abgrundkrone', 'Ewigkeitsdiadem'],
    nekromant: ['Grabkapuze', 'Aschenkapuze', 'Knochenhelm', 'Seelenhaube', 'Totenkönigskrone', 'Schattenkrone', 'Sternenkapuze', 'Götterschädel', 'Abgrundkapuze', 'Ewigkeitskrone'],
    magier: ['Novizenhut', 'Gelehrtenhut', 'Runenhut', 'Kristallhut', 'Arkanhut', 'Aschenhut', 'Sternenhut', 'Erzmagierreif', 'Abgrundhut', 'Ewigkeitshut']
  },
  schild: ['Holzschild', 'Bronzeschild', 'Eisenschild', 'Drachenschild', 'Seelenschild', 'Aschenschild', 'Himmelsschild', 'Götterschild', 'Abgrundschild', 'Ewigkeitsschild'],
  schultern: ['Lederschultern', 'Bronzeschultern', 'Eisenschultern', 'Drachenschultern', 'Seelenschultern', 'Aschenschultern', 'Himmelsschultern', 'Götterschultern', 'Abgrundschultern', 'Ewigkeitsschultern'],
  umhang: ['Wollumhang', 'Reiseumhang', 'Jägerumhang', 'Drachenumhang', 'Seelenumhang', 'Aschenumhang', 'Himmelsumhang', 'Götterumhang', 'Abgrundumhang', 'Ewigkeitsumhang'],
  schuhe: ['Stoffschuhe', 'Lederstiefel', 'Wanderstiefel', 'Drachenstiefel', 'Seelenstiefel', 'Aschenstiefel', 'Himmelsstiefel', 'Götterstiefel', 'Abgrundstiefel', 'Ewigkeitsstiefel'],
  guertel: ['Stoffgürtel', 'Ledergürtel', 'Kettengürtel', 'Drachengürtel', 'Seelengürtel', 'Aschengürtel', 'Himmelsgürtel', 'Göttergürtel', 'Abgrundgürtel', 'Ewigkeitsgürtel'],
  koecher: ['Lederköcher', 'Jägerköcher', 'Schattenköcher', 'Viperköcher', 'Nachtköcher', 'Aschenköcher', 'Sternenköcher', 'Götterköcher', 'Abgrundköcher', 'Ewigkeitsköcher']
};

// Köcher (seit 13.20): die Munition des Bogens. Ein Ninja mit Bogen trägt ihn im Platz der Nebenhand
// (Bogen und Köcher gehören zusammen). Seit 13.67 gibt der Köcher keine Pfeile mehr (keine Übungspfeile):
// geschossen wird nur mit gekauften Pfeilen (ARROW_TYPES); bessere Köcher treffen härter (Angriff, Kritisch).
const QUIVER_ARROWS = [
  { name: 'Holzpfeile', color: '#c9a36a' }, { name: 'Eisenpfeile', color: '#cfd6de' },
  { name: 'Schattenpfeile', color: '#9a7ad8' }, { name: 'Giftpfeile', color: '#7ed35a' },
  { name: 'Nachtpfeile', color: '#6aa8ff' }, { name: 'Glutpfeile', color: '#ff8a3a' },
  { name: 'Sternenpfeile', color: '#bfe8ff' }, { name: 'Götterpfeile', color: '#ffd34d' },
  { name: 'Leerenpfeile', color: '#5ee8ff' }, { name: 'Sternenfeuerpfeile', color: '#ffb8e4' }
];

// Grundwerte je Stufe (seit 13.53 zehn Stufen; Lv 70 und 80 setzen die Kurve fort, gut +35 % je Stufe). Die Grundausrüstung (Stufe 1) gibt nur Rüstung bzw. bei Waffen nur Angriff,
// Zusatzeffekte gibt es erst ab Stufe 5. Bedeutung der Werte:
//   atk Angriff · def Rüstung · hp Vitalität (mehr Leben) · mp Intelligenz (mehr Mana)
//   crit kritische Treffer · speed Lauftempo · dodge Ausweichen · block Blocken
//   regen Lebensregeneration pro Sekunde (Anteil am maximalen Leben)
const BASE_STATS = {
  waffe: [{ atk: 5 }, { atk: 10 }, { atk: 17 }, { atk: 26 }, { atk: 42 }, { atk: 62 }, { atk: 92 }, { atk: 130 }, { atk: 180 }, { atk: 245 }],
  ruestung: [{ def: 4 }, { def: 6, hp: 40 }, { def: 10, hp: 70 }, { def: 15, hp: 110 }, { def: 22, hp: 160 }, { def: 32, hp: 240 }, { def: 46, hp: 360 }, { def: 64, hp: 520 }, { def: 86, hp: 730 }, { def: 112, hp: 1000 }],
  helm: [{ def: 2 }, { def: 3, mp: 18 }, { def: 5, mp: 28 }, { def: 7, mp: 40 }, { def: 11, mp: 55 }, { def: 16, mp: 80 }, { def: 23, mp: 115 }, { def: 32, mp: 160 }, { def: 43, mp: 220 }, { def: 56, mp: 295 }],
  schild: [{ def: 3 }, { def: 4, block: 0.05 }, { def: 7, block: 0.07 }, { def: 10, block: 0.09 }, { def: 15, block: 0.12 }, { def: 22, block: 0.14 }, { def: 31, block: 0.16 }, { def: 43, block: 0.18 }, { def: 58, block: 0.2 }, { def: 76, block: 0.22 }],
  schultern: [{ def: 2 }, { def: 3, hp: 20 }, { def: 5, hp: 35 }, { def: 7, hp: 55 }, { def: 10, hp: 80 }, { def: 14, hp: 120 }, { def: 20, hp: 180 }, { def: 28, hp: 260 }, { def: 38, hp: 365 }, { def: 50, hp: 500 }],
  umhang: [{ def: 1 }, { def: 2, mp: 15, dodge: 0.01 }, { def: 3, mp: 25, dodge: 0.015 }, { def: 5, mp: 35, dodge: 0.02 }, { def: 7, mp: 50, dodge: 0.025 }, { def: 10, mp: 75, dodge: 0.03 }, { def: 14, mp: 110, dodge: 0.035 }, { def: 19, mp: 150, dodge: 0.04 }, { def: 26, mp: 205, dodge: 0.045 }, { def: 34, mp: 275, dodge: 0.05 }],
  schuhe: [{ def: 2 }, { def: 2, speed: 0.02 }, { def: 3, speed: 0.025, dodge: 0.02 }, { def: 4, speed: 0.03, dodge: 0.03 }, { def: 6, speed: 0.035, dodge: 0.05 }, { def: 9, speed: 0.04, dodge: 0.06 }, { def: 13, speed: 0.045, dodge: 0.07 }, { def: 18, speed: 0.05, dodge: 0.08 }, { def: 24, speed: 0.055, dodge: 0.085 }, { def: 31, speed: 0.06, dodge: 0.09 }],
  koecher: [{ atk: 2 }, { atk: 4, crit: 0.01 }, { atk: 7, crit: 0.015 }, { atk: 11, crit: 0.02 }, { atk: 17, crit: 0.025 }, { atk: 25, crit: 0.03 }, { atk: 36, crit: 0.035 }, { atk: 50, crit: 0.04 }, { atk: 70, crit: 0.045 }, { atk: 95, crit: 0.05 }],
  // seit 13.87: Gürtel Stufe 1 mit Leben statt 1 Rüstung – alle höheren Gürtel haben keine Rüstung, das war die
  // einzige Stufe, die einen Wert hatte, den keine bessere mehr bot
  guertel: [{ hp: 15 }, { hp: 30, regen: 0.002 }, { hp: 50, regen: 0.003 }, { hp: 80, regen: 0.004 }, { hp: 120, regen: 0.006 }, { hp: 180, regen: 0.007 }, { hp: 270, regen: 0.008 }, { hp: 390, regen: 0.01 }, { hp: 550, regen: 0.011 }, { hp: 750, regen: 0.012 }]
};

// Zusatzwerte je Waffenart und Stufe: Dolche und Bögen treffen öfter kritisch,
// Fächer, Glocken, Stäbe und Sensen geben Mana und Magiestärke (Stufe 1 ohne Zusatzwert)
const CRIT_BY_TIER = [0, 0.02, 0.03, 0.04, 0.06, 0.07, 0.08, 0.1, 0.115, 0.13];
const MP_BY_TIER = [0, 20, 35, 50, 75, 110, 160, 220, 300, 400];
const MAGIC_BY_TIER = [0, 0.04, 0.06, 0.09, 0.12, 0.16, 0.21, 0.27, 0.33, 0.4];
// Bessere Waffen werden auch etwas schneller
const SPEED_BY_TIER = [0, 0, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.09, 0.1];

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
const PLUS_BONUS_WEAPON = 0.13; // Waffenschaden seit 13.37: +13 % je Plus
const PLUS_ATK_SPEED = 0.005; // Waffen seit 13.37: +0,5 % Angriffstempo je Plus
const MAX_BLOCK = 0.4;

// Schmied: Index = aktuelles Plus (also der Schritt von +N auf +N+1).
// fail: 'none' = nur die Kosten sind weg, 'down' = Gegenstand fällt um 1, 'break' = Gegenstand zerbricht.
// Gold wird mit (Gegenstandsstufe + 1) multipliziert.
// Seit 13.11 kann schon ab +0 jeder Fehlschlag den Gegenstand zerbrechen (vorher erst ab +7); eine Segensschriftrolle schützt.
const UPGRADE_STEPS = [
  { chance: 0.95, gold: 50, splinters: 1, fail: 'break' },
  { chance: 0.9, gold: 120, splinters: 1, fail: 'break' },
  { chance: 0.85, gold: 250, splinters: 1, fail: 'break' },
  { chance: 0.75, gold: 450, splinters: 2, fail: 'break' },
  { chance: 0.65, gold: 700, splinters: 2, fail: 'break' },
  { chance: 0.55, gold: 1000, splinters: 3, fail: 'break' },
  { chance: 0.45, gold: 1500, splinters: 3, fail: 'break' },
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
  ['untoter', 'sumpfhexe', 'ghul', 'lavagolem', 'feuerdaemon', 'feuerdrache'],
  // seit 13.53: Abgründig und Ewig brauchen die stärksten Monster der Grate (bis zum Donnerriesen, Lv 72)
  ['glutkatze', 'steintitan', 'gargoyle', 'feuerdrache'],
  ['steintitan', 'gargoyle', 'feuerdrache', 'donnerriese']
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
  glutkatze: { name: 'Glutschnurrhaar', art: 'core', color: '#ff7a2a' },
  // seit 13.85: Kristallabgrund (Map 10)
  kristallgolem: { name: 'Kristallherz', art: 'crystal', color: '#b8a0ff' },
  splitterspinne: { name: 'Glasseide', art: 'silk', color: '#cfe4ff' },
  schattenpirscher: { name: 'Schattenkralle der Leere', art: 'claw', color: '#6a4aa8' },
  abgrundgeist: { name: 'Abgrundessenz', art: 'dust', color: '#9aa8ff' },
  leerenritter: { name: 'Leerensiegel', art: 'badge', color: '#8a6ad8' },
  kristallwyrm: { name: 'Wyrmkristall', art: 'scale', color: '#9fd8ff' }
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
// Händler verkaufen seit 13.37 nur Ausrüstung ab Stufe 5 bis Stufe 15 (Stufen 1–3); Grundausrüstung (Stufe 1)
// und alles darüber gibt es nur als Beute
const MERCHANT_MIN_TIER = 1;
const MERCHANTS = {
  waffen: {
    // seit 13.57 ohne Bögen und Köcher: die verkauft der Bogenmacher (skipKinds)
    slots: ['waffe'],
    skipKinds: ['bow'],
    prices: [80, 400, 1100, 2600],
    greeting: 'Jede Klasse kämpft anders. Hier findest du die Waffe, die zu dir passt, von der ersten Klinge bis zum Meisterstück.'
  },
  ruestung: {
    // seit 13.37 ohne Schultern (nur noch als Beute)
    slots: ['ruestung', 'helm', 'umhang', 'schild', 'schuhe', 'guertel'],
    prices: [60, 300, 900, 2200],
    greeting: 'Rüstung hält dich am Leben, Vitalität auch. Such dir aus, was du brauchst.'
  },
  // seit 13.57: Bogenmacherin neben dem Waffenhändler – Bögen, Köcher und Pfeile (ARROW_TYPES, fernninja.js)
  bogenmacher: {
    slots: ['waffe', 'koecher'],
    kinds: ['bow'],
    arrows: true,
    prices: [80, 400, 1100, 2600],
    greeting: 'Ein guter Bogen ist nur so gut wie seine Pfeile. Hier bekommst du beides – und den Köcher dazu.'
  }
};

// Pfeile (seit 13.57): Munition für jeden Bogenschuss (Grundangriff und Fertigkeiten des Weges des Falken).
// p.arrows = { Index: Anzahl }. Geschossen wird immer die beste Sorte, die man hat und schon benutzen darf (level);
// sind alle verbraucht, schießt der Bogen seit 13.67 gar nicht mehr (vorher Übungspfeile). dmg: Schaden aller Bogenschüsse (+Anteil),
// price: Gold je Bündel (ARROW_BUNDLE Stück). Namen und Farben wie die Pfeile der Köcher (QUIVER_ARROWS).
const ARROW_BUNDLE = 500;
const ARROW_TYPES = [
  { name: 'Holzpfeile', level: 1, color: '#c9a36a', dmg: 0.03, price: 20 },
  { name: 'Eisenpfeile', level: 10, color: '#cfd6de', dmg: 0.06, price: 90 },
  { name: 'Giftpfeile', level: 20, color: '#7ed35a', dmg: 0.1, price: 300 },
  { name: 'Glutpfeile', level: 30, color: '#ff8a3a', dmg: 0.14, price: 700 },
  { name: 'Nachtpfeile', level: 40, color: '#6aa8ff', dmg: 0.18, price: 1500 },
  { name: 'Sternenpfeile', level: 50, color: '#bfe8ff', dmg: 0.22, price: 2800 },
  { name: 'Götterpfeile', level: 60, color: '#ffd34d', dmg: 0.27, price: 4800 },
  { name: 'Leerenpfeile', level: 70, color: '#5ee8ff', dmg: 0.32, price: 7500 },
  { name: 'Sternenfeuerpfeile', level: 80, color: '#ffb8e4', dmg: 0.38, price: 11000 }
];

// --- Boni -----------------------------------------------------------------------------
// Jeder Gegenstand kann bis zu 5 normale Boni und 2 besondere Boni (6 und 7) tragen.
// fmt: flat = ganze Zahl, pct = Prozent, pct1 = Prozent mit einer Nachkommastelle.
// range: Spanne auf Gegenstandsstufe 1. Feste Werte (flat) wachsen um 35 % je Gegenstandsstufe (Statuswerte
// nur um 15 %, tierScale),
// Prozentwerte seit Version 5.9 nur um 10 % je Stufe und höchstens bis max (je Gegenstand).
// Dazu begrenzt BONUS_CAPS die Summe aller angelegten Gegenstände.
const ALL_SLOTS = ['waffe', 'ruestung', 'helm', 'schultern', 'umhang', 'schild', 'schuhe', 'guertel', 'koecher'];
const BONUS_TYPES = {
  hp: { name: 'Max. Leben', fmt: 'flat', range: [20, 90], slots: ALL_SLOTS },
  mp: { name: 'Max. Mana', fmt: 'flat', range: [15, 60], slots: ['waffe', 'ruestung', 'helm', 'umhang', 'guertel'] },
  atk: { name: 'Angriffswert', fmt: 'flat', range: [3, 14], slots: ['waffe', 'helm', 'schultern', 'guertel', 'koecher'] },
  def: { name: 'Verteidigung', fmt: 'flat', range: [2, 10], slots: ['ruestung', 'helm', 'schultern', 'umhang', 'schild', 'schuhe', 'guertel'] },
  str: { name: 'Stärke', fmt: 'flat', range: [1, 4], tierScale: 0.15, slots: ALL_SLOTS },
  vit: { name: 'Vitalität', fmt: 'flat', range: [1, 4], tierScale: 0.15, slots: ALL_SLOTS },
  int: { name: 'Intelligenz', fmt: 'flat', range: [1, 4], tierScale: 0.15, slots: ALL_SLOTS },
  dex: { name: 'Geschick', fmt: 'flat', range: [1, 4], tierScale: 0.15, slots: ALL_SLOTS },
  crit: { name: 'Kritische Treffer', fmt: 'pct', range: [0.01, 0.04], max: 0.08, slots: ['waffe', 'helm', 'guertel', 'koecher'] },
  atkSpeed: { name: 'Angriffstempo', fmt: 'pct', range: [0.02, 0.06], max: 0.12, slots: ['waffe', 'schuhe', 'guertel', 'koecher'] },
  speed: { name: 'Lauftempo', fmt: 'pct', range: [0.01, 0.03], max: 0.05, slots: ['schuhe'] },
  dodge: { name: 'Ausweichen', fmt: 'pct', range: [0.01, 0.03], max: 0.06, slots: ['ruestung', 'umhang', 'schild', 'schuhe'] },
  block: { name: 'Blocken', fmt: 'pct', range: [0.01, 0.04], max: 0.08, slots: ['schild'] },
  regen: { name: 'Lebensregeneration', fmt: 'pct1', range: [0.001, 0.003], max: 0.006, slots: ['ruestung', 'helm', 'schultern', 'guertel'] },
  monsterDmg: { name: 'Stark gegen Monster', fmt: 'pct', range: [0.02, 0.06], max: 0.1, slots: ['waffe', 'helm', 'guertel', 'koecher'] },
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

// Statuswerte, die je Klasse als Bonus gewürfelt werden (seit 13.49): ein Krieger bekommt keine Intelligenz,
// ein Magier keine Stärke. Gegenstände ohne Klasse (Schultern, Umhang …) würfeln für die Klasse des Finders.
const CLASS_BONUS_ATTRS = { krieger: ['str', 'vit'], ninja: ['dex', 'str', 'vit'], schamane: ['int', 'vit'], nekromant: ['int', 'vit'], magier: ['int', 'vit'] };
const ATTR_BONUS_IDS = ['str', 'vit', 'int', 'dex'];
// Hauptwert als Grundwert auf Klassen-Ausrüstung (Waffe, Rüstung, Helm) je Gegenstandsstufe
const CLASS_ATTR_BY_TIER = [0, 1, 2, 3, 4, 6, 8, 11, 14, 18];
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

// Gegenstände für den Aufstieg der Fertigkeiten (seit 14.1). Sie liegen wie die Verstärkungen als Zähler in
// p.materials (Post, Auktionshaus, Beuteanzeige), gehören aber NICHT zum Schmied (dessen Liste ist MATERIALS):
//   Fertigkeitsbuch (Gegenstand 'book' in der Tasche, je Fertigkeit)  E1 → E10
//   Schriftrolle (rolle)       H1 → H10 und der Aufstieg E → H1, gilt für jede Fertigkeit der eigenen Klasse
//   Seelenstein (seelenstein)  L1 → L10, V und die Aufstiege H → L1 und L → V, gilt für jede Fertigkeit
// Nicht verwechseln: „Seelensteine“ sind auch die Steine in der Welt, aus denen der Gegenstand fällt.
const SKILL_MATS = [
  { id: 'rolle', name: 'Schriftrolle', tag: 'H1–H10', text: 'Aus Seelensteinen ab Stufe 40. Hebt eine Fertigkeit deiner Klasse um eine Stufe im Rang Heroisch (H1–H10); auch der Aufstieg nach H1 kostet eine.' },
  { id: 'seelenstein', name: 'Seelenstein', tag: 'L1–V', text: 'Aus Seelensteinen ab Stufe 45. Hebt eine Fertigkeit um eine Stufe in L oder V; auch die Aufstiege nach L1 und V kosten je einen.' }
];
// Alle Zähler in p.materials (Schmied-Materialien und Fertigkeits-Gegenstände) – für Post, Auktionshaus und Beute
const ALL_MATS = MATERIALS.concat(SKILL_MATS);
const matDef = (id) => ALL_MATS.find((m) => m.id === id);
// Woher die Gegenstände für Fertigkeiten fallen (seit 14.1; rollLoot in ausruestung.js):
//   book         jeder Seelenstein (alle Stufen) mit stone, normale Monster ab Stufe mobLevel mit mob
//   rolle        Seelensteine ab Stufe stone: base + (Stufe − stone) · step
//   seelenstein  Seelensteine ab Stufe stone: base + (Stufe − stone) · step
const SKILL_MAT_DROP = {
  book: { stone: 0.18, mobLevel: 20, mob: 0.003 },
  rolle: { stone: 40, base: 0.22, step: 0.005 },
  seelenstein: { stone: 45, base: 0.12, step: 0.004 }
};
function skillMatChance(id, level) {
  const d = SKILL_MAT_DROP[id];
  return level < d.stone ? 0 : Math.min(1, d.base + (level - d.stone) * d.step);
}

// Farben der Materialien in der Beuteanzeige
const MATERIAL_COLORS = { boniPlus: '#9fd0ff', boni5: '#d6a8ff', switcher: '#9fe08f', star: '#ffd34d', switch67: '#ffb85a', rolle: '#f0c87a', seelenstein: '#7fe0ff' };
// Sternen-Switcher: ab dieser Steinstufe, mit dieser Chance je Stein
const SWITCH67 = { stone: 30, chance: 0.22 };

// Was ein Seelenstein fallen lässt, steht bei den Steinen in monster.js (stoneDrops).
// Ausrüstung von Seelensteinen hat höchstens +2.

// Klingenumrisse der Dolche je Stufe (seit 13.19): x quer, y entlang der Klinge ab der Parierstange (in 3D-Einheiten).
// Dieselben Formen zeichnen das Inventarsymbol (ausruestung.js) und die Waffe in der Hand (drei-ausruestung.js).
// Seit 13.20 neu gezeichnet, mit Zacken und Haken – jede Stufe eine eigene Silhouette:
// 0 Kurzdolch (Tanto mit schräger Spitze), 1 Stahldolch (Sägerücken), 2 Schattendolch (Karambit-Haken),
// 3 Viperzahn (gewellte Schlangenklinge), 4 Nachtklinge (Kunai), 5 Aschendolch (Widerhaken an beiden Seiten),
// 6 Sternendolch (Gabel mit zwei Zinken und Nadelspitze), 7 Götterzahn (Flammenklinge mit Haken),
// seit 13.53: 8 Abgrundstachel (gekrümmter Fangzahn mit Widerhaken nach innen), 9 Ewigkeitsdorn (Sternnadel mit zwei Strahlenkreuzen).
const DAGGER_BLADES = [
  [[-0.022, 0], [0.022, 0], [0.023, 0.16], [0.004, 0.225], [-0.022, 0.185]],
  [[-0.024, 0], [0.026, 0], [0.032, 0.03], [0.02, 0.045], [0.032, 0.07], [0.02, 0.085], [0.032, 0.11], [0.02, 0.125], [0.026, 0.155], [0.003, 0.25], [-0.024, 0.165]],
  [[-0.02, 0], [0.022, 0], [0.03, 0.04], [0.05, 0.085], [0.078, 0.12], [0.118, 0.158], [0.08, 0.162], [0.045, 0.138], [0.016, 0.098], [-0.005, 0.052]],
  [[-0.024, 0], [0.024, 0], [0.04, 0.04], [0.016, 0.085], [0.038, 0.13], [0.014, 0.175], [0.028, 0.21], [0, 0.27], [-0.026, 0.205], [-0.01, 0.165], [-0.034, 0.12], [-0.012, 0.075], [-0.036, 0.035]],
  [[-0.012, 0], [0.012, 0], [0.042, 0.07], [0.03, 0.15], [0, 0.26], [-0.03, 0.15], [-0.042, 0.07]],
  [[-0.028, 0], [0.028, 0], [0.052, 0.04], [0.03, 0.05], [0.048, 0.095], [0.026, 0.105], [0.04, 0.15], [0.02, 0.16], [0.026, 0.2], [0, 0.28], [-0.026, 0.2], [-0.02, 0.16], [-0.04, 0.15], [-0.026, 0.105], [-0.048, 0.095], [-0.03, 0.05], [-0.052, 0.04]],
  [[-0.014, 0], [0.014, 0], [0.04, 0.03], [0.058, 0.1], [0.044, 0.1], [0.03, 0.058], [0.011, 0.062], [0.01, 0.22], [0, 0.32], [-0.01, 0.22], [-0.011, 0.062], [-0.03, 0.058], [-0.044, 0.1], [-0.058, 0.1], [-0.04, 0.03]],
  [[-0.03, 0], [0.03, 0], [0.055, 0.04], [0.045, 0.07], [0.075, 0.11], [0.06, 0.135], [0.1, 0.19], [0.125, 0.26], [0.08, 0.225], [0.05, 0.2], [0.03, 0.235], [0, 0.31], [-0.025, 0.22], [-0.045, 0.16], [-0.03, 0.13], [-0.05, 0.085], [-0.034, 0.06], [-0.048, 0.025]],
  [[-0.028, 0], [0.028, 0], [0.052, 0.06], [0.076, 0.13], [0.098, 0.2], [0.114, 0.27], [0.122, 0.345], [0.094, 0.3], [0.084, 0.262], [0.056, 0.24], [0.068, 0.222], [0.052, 0.185], [0.024, 0.168], [0.038, 0.148], [0.022, 0.112], [-0.006, 0.096], [0.008, 0.076], [-0.012, 0.045]],
  [[-0.016, 0], [0.016, 0], [0.022, 0.06], [0.072, 0.092], [0.024, 0.112], [0.016, 0.22], [0.044, 0.244], [0.014, 0.262], [0, 0.36], [-0.014, 0.262], [-0.044, 0.244], [-0.016, 0.22], [-0.024, 0.112], [-0.072, 0.092], [-0.022, 0.06]]
];

// Bögen (seit 13.20): Mittellinie eines Wurfarms je Stufe (Griff bei 0, 0; x < 0 zur Sehne), Dicke am Griff und an der
// Spitze, Holzfarbe. 3D (drei-ausruestung.js, bow3) und Inventarsymbol (figuren.js) nutzen dieselben Linien.
const BOW_LIMBS = [
  { pts: [[0, 0], [-0.03, 0.15], [-0.09, 0.3], [-0.16, 0.42]], r: [0.026, 0.012], wood: '#8a5a34' },
  { pts: [[0, 0], [-0.045, 0.11], [-0.1, 0.22], [-0.125, 0.3], [-0.095, 0.37]], r: [0.03, 0.013], wood: '#6b3a22', tip: '#e8dcc0' },
  { pts: [[0, 0], [0.03, 0.1], [-0.02, 0.25], [-0.11, 0.42], [-0.15, 0.53]], r: [0.028, 0.012], wood: '#2e2a3a' },
  { pts: [[0, 0], [-0.05, 0.08], [0, 0.17], [-0.07, 0.27], [-0.04, 0.36], [-0.12, 0.45]], r: [0.03, 0.014], wood: '#3e6a34' },
  { pts: [[0, 0], [-0.015, 0.14], [-0.09, 0.3], [-0.19, 0.44]], r: [0.026, 0.014], wood: '#3a4a6a', rail: true },
  { pts: [[0, 0], [-0.04, 0.14], [-0.12, 0.28], [-0.18, 0.4], [-0.15, 0.49]], r: [0.032, 0.014], wood: '#2a2224' },
  { pts: [[0, 0], [0.02, 0.12], [-0.04, 0.28], [-0.14, 0.42], [-0.19, 0.51]], r: [0.026, 0.011], wood: '#e6eef8' },
  { pts: [[0, 0], [-0.02, 0.1], [-0.1, 0.24], [-0.17, 0.37], [-0.14, 0.47], [-0.06, 0.54]], r: [0.032, 0.014], wood: '#d9a63a' },
  // seit 13.53: 8 Abgrundbogen (weit nach hinten gerissene Klauenarme aus Leerenobsidian), 9 Ewigkeitsbogen
  // (langer Platinbogen, dessen Spitzen sich wie Sternstrahlen nach vorn biegen)
  { pts: [[0, 0], [0.04, 0.08], [-0.03, 0.19], [-0.14, 0.31], [-0.19, 0.44], [-0.23, 0.55]], r: [0.034, 0.01], wood: '#1e1632' },
  { pts: [[0, 0], [0.03, 0.1], [-0.01, 0.21], [-0.09, 0.33], [-0.14, 0.44], [-0.12, 0.53], [-0.05, 0.57]], r: [0.03, 0.011], wood: '#f2eef8' }
];

// --- Waffenformen je Stufe (seit 13.29) ------------------------------------------------------------------
// Wie bei Dolchen und Bögen nutzen 3D-Waffe (drei-ausruestung.js) und Inventarsymbol (figuren.js) dieselben
// Umrisse, damit jede Stufe auf den ersten Blick eine eigene Form hat (nicht nur eine andere Farbe).

// Kreis als Punktliste (Löcher in Klingen)
function ringPts(cx, cy, rx, ry = rx, n = 14) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}
// Umriss nach innen versetzen (für die dunklere Klingenmitte mit heller Schneide drumherum)
function insetPts(pts, d) {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  const sg = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    const n1 = [-(p[1] - a[1]) * sg, (p[0] - a[0]) * sg];
    const n2 = [-(b[1] - p[1]) * sg, (b[0] - p[0]) * sg];
    const l1 = Math.hypot(n1[0], n1[1]) || 1;
    const l2 = Math.hypot(n2[0], n2[1]) || 1;
    const nx = n1[0] / l1 + n2[0] / l2;
    const ny = n1[1] / l1 + n2[1] / l2;
    const l = Math.hypot(nx, ny) || 1;
    const cos = Math.max(0.4, (nx / l) * (n1[0] / l1) + (ny / l) * (n1[1] / l1));
    const k = Math.min(2.5 * d, d / cos);
    return [p[0] + (nx / l) * k, p[1] + (ny / l) * k];
  });
}

// Einhandäxte (seit 13.30 deutlich verschiedene Grundformen): Umriss der Klinge (x vom Schaft nach außen,
// y entlang des Schafts, Meter), Löcher im Blatt, Rücken (poll Hammerrücken, spike Dorn, hook Hakendorn,
// spikes Dornenkamm, blade Gegenklinge)
// 0 Beil mit Hammerrücken, 1 Bartaxt (langer Bart), 2 Wolfsaxt (Halbmond mit Reißzähnen, Hakendorn),
// 3 Drachenaxt (Flügel mit Drachenauge), 4 Seelenhacker (Doppelhaken mit Seelenfenster),
// 5 Aschenaxt (gezacktes Hackbeil mit Dornenkamm), 6 Himmelsaxt (offene Mondsichel an zwei Streben),
// 7 Götteraxt (Prunkblatt mit Sonnenfenster und Gegenklinge),
// seit 13.53: 8 Abgrundaxt (eingerollte Fangsichel mit Leerenauge, Rücken aus Tentakelhaken),
// 9 Ewigkeitsaxt (Sternblatt mit drei Spitzen, Sternfenster, kleiner Stern als Rücken)
const AXE_HEADS = [
  { pts: [[0, -0.06], [0.13, -0.08], [0.19, -0.12], [0.205, 0.1], [0.13, 0.08], [0, 0.06]], back: 'poll' },
  { pts: [[0, -0.05], [0.06, -0.1], [0.09, -0.3], [0.14, -0.35], [0.22, -0.3], [0.26, -0.12], [0.27, 0.05], [0.22, 0.15], [0.12, 0.12], [0, 0.06]], back: 'spike' },
  { pts: [[0, -0.07], [0.1, -0.12], [0.17, -0.25], [0.25, -0.22], [0.22, -0.15], [0.285, -0.08], [0.25, -0.03], [0.295, 0.03], [0.25, 0.08], [0.285, 0.14], [0.24, 0.2], [0.17, 0.25], [0.1, 0.12], [0, 0.07]], back: 'hook' },
  { pts: [[0, -0.06], [0.05, -0.18], [0.1, -0.3], [0.17, -0.24], [0.22, -0.37], [0.28, -0.26], [0.34, -0.31], [0.36, -0.1], [0.37, 0.1], [0.33, 0.28], [0.25, 0.2], [0.16, 0.29], [0.06, 0.16], [0, 0.06]], holes: [ringPts(0.15, 0, 0.045, 0.026)], back: 'spikes' },
  { pts: [[0, -0.05], [0.08, -0.06], [0.16, -0.14], [0.24, -0.28], [0.33, -0.41], [0.335, -0.2], [0.3, -0.05], [0.3, 0.05], [0.335, 0.2], [0.33, 0.41], [0.24, 0.28], [0.16, 0.14], [0.08, 0.06], [0, 0.05]], holes: [ringPts(0.2, 0, 0.05)], back: 'hook' },
  { pts: [[0, -0.1], [0.08, -0.12], [0.12, -0.2], [0.3, -0.25], [0.27, -0.16], [0.33, -0.1], [0.29, -0.04], [0.35, 0.02], [0.3, 0.08], [0.34, 0.15], [0.28, 0.2], [0.3, 0.27], [0.12, 0.2], [0.08, 0.12], [0, 0.1]], back: 'spikes' },
  { pts: [[0, -0.08], [0.12, -0.1], [0.2, -0.22], [0.28, -0.39], [0.36, -0.2], [0.385, 0], [0.36, 0.2], [0.28, 0.39], [0.2, 0.22], [0.12, 0.1], [0, 0.08]], holes: [[[0.15, -0.045], [0.21, -0.14], [0.27, -0.25], [0.315, -0.11], [0.325, 0], [0.315, 0.11], [0.27, 0.25], [0.21, 0.14], [0.15, 0.045]]] },
  { pts: [[0, -0.09], [0.07, -0.16], [0.1, -0.32], [0.2, -0.28], [0.27, -0.41], [0.32, -0.24], [0.39, -0.12], [0.37, 0], [0.39, 0.12], [0.32, 0.24], [0.27, 0.41], [0.2, 0.28], [0.1, 0.32], [0.07, 0.16], [0, 0.09]], holes: [ringPts(0.21, 0, 0.06)], back: 'blade' },
  { pts: [[0, -0.07], [0.1, -0.1], [0.16, -0.2], [0.2, -0.34], [0.17, -0.46], [0.26, -0.4], [0.33, -0.28], [0.37, -0.12], [0.36, 0.04], [0.32, 0.18], [0.25, 0.3], [0.15, 0.38], [0.06, 0.4], [0.12, 0.3], [0.16, 0.2], [0.1, 0.1], [0, 0.07]], holes: [ringPts(0.24, -0.02, 0.05, 0.032)], back: 'tendril' },
  { pts: [[0, -0.08], [0.12, -0.1], [0.2, -0.2], [0.26, -0.38], [0.31, -0.2], [0.36, -0.1], [0.44, 0], [0.36, 0.1], [0.31, 0.2], [0.26, 0.38], [0.2, 0.2], [0.12, 0.1], [0, 0.08]], holes: [[[0.25, -0.07], [0.264, -0.016], [0.315, 0], [0.264, 0.016], [0.25, 0.07], [0.236, 0.016], [0.185, 0], [0.236, -0.016]]], back: 'star' }
];

// Streitäxte: Umriss einer Klinge; single: nur eine Klinge, back: Größe der Gegenklinge (Standard 1), hammer: Hammerkopf
// 0 Holzfälleraxt (ein schwerer Keil), 1 Doppelaxt (Schmetterling), 2 Barbarenaxt (Halbmond mit Hörnern),
// 3 Drachenspalter (großer Flügel vorn, kleine Gegenklinge), 4 Seelenschlächter (zwei Mondsicheln),
// 5 Aschenhenker (Henkersbeil mit Zacken), 6 Himmelsbrecher (Federklingen), 7 Götterhammer (Hammer mit Strahlenklingen),
// seit 13.53: 8 Abgrundreißer (zwei Kiefer mit Fangzähnen und Leerenauge), 9 Ewigkeitsspalter (Sternschwingen mit fünf Spitzen)
const GREATAXE_HEADS = [
  { pts: [[0, -0.09], [0.2, -0.13], [0.31, -0.22], [0.33, 0.17], [0.22, 0.1], [0, 0.09]], single: true },
  { pts: [[0, -0.07], [0.1, -0.1], [0.2, -0.24], [0.27, -0.26], [0.3, -0.1], [0.31, 0], [0.3, 0.1], [0.27, 0.26], [0.2, 0.24], [0.1, 0.1], [0, 0.07]] },
  { pts: [[0, -0.08], [0.12, -0.14], [0.17, -0.31], [0.23, -0.22], [0.3, -0.24], [0.34, 0], [0.3, 0.24], [0.23, 0.22], [0.17, 0.31], [0.12, 0.14], [0, 0.08]], holes: [ringPts(0.21, -0.1, 0.028), ringPts(0.21, 0.1, 0.028)] },
  { pts: [[0, -0.07], [0.07, -0.18], [0.15, -0.3], [0.22, -0.23], [0.3, -0.33], [0.35, -0.12], [0.36, 0.08], [0.33, 0.27], [0.24, 0.21], [0.15, 0.3], [0.07, 0.17], [0, 0.07]], back: 0.55 },
  { pts: [[0, -0.05], [0.06, -0.1], [0.16, -0.3], [0.3, -0.39], [0.24, -0.22], [0.26, 0], [0.24, 0.22], [0.3, 0.39], [0.16, 0.3], [0.06, 0.1], [0, 0.05]], holes: [ringPts(0.15, 0, 0.045)] },
  { pts: [[0, -0.1], [0.3, -0.14], [0.36, -0.1], [0.33, -0.05], [0.37, 0], [0.33, 0.05], [0.36, 0.1], [0.34, 0.23], [0.2, 0.18], [0, 0.1]], back: 0.6 },
  { pts: [[0, -0.05], [0.12, -0.1], [0.22, -0.3], [0.26, -0.16], [0.33, -0.21], [0.32, -0.05], [0.36, 0], [0.32, 0.05], [0.33, 0.21], [0.26, 0.16], [0.22, 0.3], [0.12, 0.1], [0, 0.05]], holes: [[[0.13, -0.04], [0.2, -0.16], [0.25, -0.08], [0.27, 0], [0.25, 0.08], [0.2, 0.16], [0.13, 0.04]]] },
  { pts: [[0, -0.12], [0.15, -0.12], [0.2, -0.17], [0.25, -0.17], [0.25, 0.17], [0.2, 0.17], [0.15, 0.12], [0, 0.12]], hammer: true },
  { pts: [[0, -0.06], [0.08, -0.12], [0.18, -0.3], [0.34, -0.42], [0.3, -0.3], [0.26, -0.25], [0.29, -0.18], [0.25, -0.12], [0.29, -0.06], [0.26, 0], [0.29, 0.06], [0.25, 0.12], [0.29, 0.18], [0.26, 0.25], [0.3, 0.3], [0.34, 0.42], [0.18, 0.3], [0.08, 0.12], [0, 0.06]], holes: [ringPts(0.14, 0, 0.042, 0.028)], back: 0.8 },
  { pts: [[0, -0.07], [0.1, -0.1], [0.16, -0.24], [0.2, -0.4], [0.26, -0.22], [0.33, -0.2], [0.3, -0.1], [0.46, 0], [0.3, 0.1], [0.33, 0.2], [0.26, 0.22], [0.2, 0.4], [0.16, 0.24], [0.1, 0.1], [0, 0.07]], holes: [[[0.2, -0.065], [0.214, -0.016], [0.26, 0], [0.214, 0.016], [0.2, 0.065], [0.186, 0.016], [0.14, 0], [0.186, -0.016]]] }
];

// Fächer: Spannweite (Bogenmaß) und Randform des Blatts je Stufe
// 0 Papier (glatt), 1 Seide (Bögen), 2 Kranich (Federspitzen), 3 Phönix (Flammenzungen), 4 Drache (Fledermausflügel),
// 5 Glut (gezackt), 6 Himmel (Wolkenrand), 7 Götter (fast voller Sonnenkreis mit Strahlen),
// seit 13.53: 8 Abgrund (Fangzähne, die nach innen haken), 9 Ewig (weiter Sternenkranz, lange und kurze Strahlen im Wechsel)
const FAN_SHAPES = [
  { span: 1.75, edge: 'smooth', n: 1, amp: 0 },
  { span: 2.1, edge: 'scallop', n: 8, amp: 0.06 },
  { span: 2.35, edge: 'feather', n: 10, amp: 0.13 },
  { span: 2.5, edge: 'flame', n: 7, amp: 0.24 },
  { span: 2.4, edge: 'bat', n: 5, amp: 0.2 },
  { span: 2.2, edge: 'jag', n: 11, amp: 0.15 },
  { span: 2.75, edge: 'cloud', n: 6, amp: 0.1 },
  { span: 5.9, edge: 'sun', n: 20, amp: 0.13 },
  { span: 2.9, edge: 'fang', n: 9, amp: 0.2 },
  { span: 3.4, edge: 'star', n: 9, amp: 0.26 }
];
// Umriss des Fächerblatts: Drehpunkt bei (0, 0), Blattmitte in Richtung `center` (Bogenmaß), außen R, innen r0
function fanLeafPts(tier, R, r0, center) {
  const S = FAN_SHAPES[tier] || FAN_SHAPES[0];
  const a0 = center - S.span / 2;
  const steps = Math.max(24, S.n * 8);
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const f = (u * S.n) % 1;
    let k = 1;
    switch (S.edge) {
      case 'scallop': k = 1 + S.amp * Math.sin(f * Math.PI); break;
      case 'feather': k = 1 + S.amp * (1 - Math.abs(f * 2 - 1)) - S.amp * 0.4; break;
      case 'flame': k = 1 + S.amp * Math.pow(f, 1.6) - S.amp * 0.3; break;
      case 'bat': k = 1 - S.amp * Math.sin(f * Math.PI); break;
      case 'jag': k = 1 + S.amp * ((i % 2 ? 0.2 : 1) * (0.6 + 0.4 * Math.sin(i * 2.7))) - S.amp * 0.4; break;
      case 'cloud': k = 1 + S.amp * Math.sqrt(Math.sin(f * Math.PI)); break;
      case 'sun': k = 1 + S.amp * (1 - Math.abs(f * 2 - 1)) - S.amp * 0.5; break;
      case 'fang': k = 1 + S.amp * Math.pow(1 - f, 3) - S.amp * 0.3; break;
      case 'star': k = 1 + S.amp * Math.pow(1 - Math.abs(f * 2 - 1), 2.2) * (Math.floor(u * S.n - 1e-9) % 2 ? 0.5 : 1) - S.amp * 0.35; break;
      default:
    }
    const a = a0 + u * S.span;
    out.push([Math.cos(a) * R * k, Math.sin(a) * R * k]);
  }
  for (let i = 8; i >= 0; i--) {
    const a = a0 + (i / 8) * S.span;
    out.push([Math.cos(a) * r0, Math.sin(a) * r0]);
  }
  return out;
}

// Glocken: Drehprofil [Radius, Höhe] von der Öffnung (Höhe 0) bis zur Krone
// 0 Bronze (klassisch), 1 Tempel (hoch und gerade), 2 Kranich (Tulpe mit Taille), 3 Phönix (weit ausgestellter Rand),
// 4 Drache (bauchig mit Zwiebelkrone), 5 Glut (gedrungen, schwer), 6 Himmel (Kuppel), 7 Götter (doppelt gestuft),
// seit 13.53: 8 Abgrund (hoher Tropfen mit weit gerissenem Schlund), 9 Ewig (dreifach gestufte Lotusglocke)
const BELL_PROFILES = [
  [[0, 0], [0.14, 0], [0.13, 0.03], [0.09, 0.15], [0.055, 0.22], [0, 0.23]],
  [[0, 0], [0.11, 0], [0.118, 0.02], [0.095, 0.05], [0.085, 0.2], [0.06, 0.25], [0, 0.26]],
  [[0, 0], [0.135, 0], [0.1, 0.05], [0.068, 0.12], [0.078, 0.18], [0.05, 0.23], [0, 0.24]],
  [[0, 0], [0.175, 0], [0.15, 0.015], [0.09, 0.06], [0.07, 0.16], [0.05, 0.22], [0, 0.23]],
  [[0, 0], [0.115, 0], [0.142, 0.05], [0.132, 0.12], [0.08, 0.19], [0.03, 0.25], [0, 0.275]],
  [[0, 0], [0.165, 0], [0.158, 0.04], [0.132, 0.07], [0.132, 0.1], [0.1, 0.14], [0, 0.16]],
  [[0, 0], [0.13, 0], [0.128, 0.04], [0.115, 0.09], [0.09, 0.13], [0.055, 0.16], [0, 0.17]],
  [[0, 0], [0.155, 0], [0.142, 0.03], [0.1, 0.09], [0.112, 0.11], [0.09, 0.17], [0.06, 0.22], [0, 0.245]],
  [[0, 0], [0.17, 0], [0.135, 0.025], [0.085, 0.07], [0.075, 0.13], [0.06, 0.2], [0.03, 0.26], [0, 0.29]],
  [[0, 0], [0.15, 0], [0.158, 0.02], [0.11, 0.045], [0.125, 0.075], [0.085, 0.115], [0.095, 0.14], [0.06, 0.185], [0.035, 0.22], [0, 0.24]]
];

// Sensen: Bauplan der Klinge je Stufe (Kopf am Schaft bei 0, 0; Klinge zeigt nach −x)
// len Länge, w Breite, curve Bogen, hook Haken an der Spitze, serr Zähne in der Schneide, spikes Dornen am Rücken,
// moon Mondsichel (in der Mitte am breitesten), twin zweite kleine Klinge nach +x
// 0 Rost (kurz, schartig), 1 Grab (lang, schlank), 2 Knochen (Knochenzähne), 3 Seele (starker Haken),
// 4 Totenkönig (breit mit Dornen), 5 Asche (gezackt), 6 Sterne (Mondsichel), 7 Götter (Doppelklinge),
// seit 13.53: 8 Abgrund (langer Fanghaken mit Zahnreihe), 9 Ewig (zwei Mondsicheln)
const SCYTHE_BLADES = [
  { len: 0.5, w: 0.1, curve: 0.12, hook: 0, serr: 3 },
  { len: 0.72, w: 0.1, curve: 0.18, hook: 0.05 },
  { len: 0.62, w: 0.12, curve: 0.16, hook: 0.02, serr: 7 },
  { len: 0.76, w: 0.13, curve: 0.22, hook: 0.14 },
  { len: 0.8, w: 0.18, curve: 0.2, hook: 0.06, spikes: 3 },
  { len: 0.7, w: 0.14, curve: 0.18, hook: 0.04, serr: 9, spikes: 4 },
  { len: 0.7, w: 0.2, curve: 0.3, hook: 0.08, moon: true },
  { len: 0.85, w: 0.16, curve: 0.24, hook: 0.1, twin: 0.45 },
  { len: 0.86, w: 0.17, curve: 0.3, hook: 0.2, serr: 11 },
  { len: 0.92, w: 0.17, curve: 0.26, hook: 0.08, moon: true, twin: 0.5 }
];
function scythePts(tier, side = -1, scale = 1) {
  const B = SCYTHE_BLADES[tier] || SCYTHE_BLADES[1];
  const n = 18;
  const top = [];
  const bot = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const sx = side * B.len * u * scale;
    const sy = (B.curve * B.len * Math.sin(Math.PI * u * 0.9) - B.hook * Math.pow(u, 4)) * scale;
    const wu = (B.moon ? B.w * Math.sin(Math.PI * (0.12 + 0.88 * u)) * 1.15 + 0.01 : B.w * Math.pow(1 - u, 0.8) + 0.004) * scale;
    let t = sy + wu * 0.35;
    let b = sy - wu * 0.65;
    if (B.serr && i > 0 && i < n) b += (i % 2 ? wu * 0.3 : 0) * (i * B.serr % n < n * 0.7 ? 1 : 0.5);
    if (B.spikes && i > 1 && i < n - 2 && i % Math.max(2, Math.round(n / (B.spikes + 1))) === 0) t += B.w * 0.55 * scale;
    top.push([sx, t]);
    bot.push([sx, b]);
  }
  return top.concat(bot.reverse());
}
