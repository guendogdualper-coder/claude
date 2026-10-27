// Ausrüstung: sechs Plätze, fünf Gegenstandsstufen und Verbesserungen beim Schmied von +0 bis +9.
// Die Stufen 1 bis 4 (ab Lv 1, 5, 10, 15) verkaufen Waffen- und Rüstungshändler,
// die legendäre Stufe 5 (ab Lv 22) gibt es nur als Beute.

const EQUIP_SLOTS = [
  { id: 'waffe', name: 'Waffe' },
  { id: 'ruestung', name: 'Rüstung' },
  { id: 'helm', name: 'Helm' },
  { id: 'schild', name: 'Schild' },
  { id: 'schuhe', name: 'Schuhe' },
  { id: 'guertel', name: 'Gürtel' }
];

// Ab welcher Spielerstufe ein Gegenstand getragen werden kann
const ITEM_TIERS = [
  { level: 1, label: 'Grundausrüstung' },
  { level: 5, label: 'Solide' },
  { level: 10, label: 'Gut' },
  { level: 15, label: 'Selten' },
  { level: 22, label: 'Legendär' }
];

// Namen: Waffen und Rüstungen je Klasse, alles andere für alle gleich
const ITEM_NAMES = {
  waffe: {
    krieger: ['Eisenschwert', 'Breitschwert', 'Mondklinge', 'Drachenschwert', 'Seelenreißer'],
    ninja: ['Kurzdolche', 'Zwillingsdolche', 'Schattendolche', 'Viperzähne', 'Nachtklingen'],
    schamane: ['Papierfächer', 'Seidenfächer', 'Kranichfächer', 'Phönixfächer', 'Drachenfächer'],
    nekromant: ['Knochenstab', 'Eschenstab', 'Grabesstab', 'Seelenstab', 'Totenkönigsstab']
  },
  ruestung: {
    krieger: ['Lederpanzer', 'Kettenhemd', 'Lamellenpanzer', 'Drachenpanzer', 'Seelenpanzer'],
    ninja: ['Leinenwams', 'Lederwams', 'Schattenwams', 'Viperngewand', 'Nachtgewand'],
    schamane: ['Leinenrobe', 'Seidenrobe', 'Kranichrobe', 'Phönixrobe', 'Drachenrobe'],
    nekromant: ['Grabtuch', 'Aschenrobe', 'Knochenrobe', 'Seelenrobe', 'Totenkönigsrobe']
  },
  helm: ['Lederkappe', 'Bronzehelm', 'Eisenhelm', 'Drachenhelm', 'Seelenkrone'],
  schild: ['Holzschild', 'Bronzeschild', 'Eisenschild', 'Drachenschild', 'Seelenschild'],
  schuhe: ['Stoffschuhe', 'Lederstiefel', 'Wanderstiefel', 'Drachenstiefel', 'Seelenstiefel'],
  guertel: ['Stoffgürtel', 'Ledergürtel', 'Kettengürtel', 'Drachengürtel', 'Seelengürtel']
};

// Grundwerte je Stufe. Die Grundausrüstung (Stufe 1) gibt nur Rüstung bzw. bei Waffen nur Angriff,
// Zusatzeffekte gibt es erst ab Stufe 5. Bedeutung der Werte:
//   atk Angriff · def Rüstung · hp Vitalität (mehr Leben) · mp Intelligenz (mehr Mana)
//   crit kritische Treffer · speed Lauftempo · dodge Ausweichen · block Blocken
//   regen Lebensregeneration pro Sekunde (Anteil am maximalen Leben)
const BASE_STATS = {
  waffe: [{ atk: 5 }, { atk: 10 }, { atk: 17 }, { atk: 26 }, { atk: 42 }],
  ruestung: [{ def: 4 }, { def: 6, hp: 40 }, { def: 10, hp: 70 }, { def: 15, hp: 110 }, { def: 22, hp: 160 }],
  helm: [{ def: 2 }, { def: 3, mp: 18 }, { def: 5, mp: 28 }, { def: 7, mp: 40 }, { def: 11, mp: 55 }],
  schild: [{ def: 3 }, { def: 4, block: 0.05 }, { def: 7, block: 0.07 }, { def: 10, block: 0.09 }, { def: 15, block: 0.12 }],
  schuhe: [{ def: 2 }, { def: 2, speed: 0.04 }, { def: 3, speed: 0.05, dodge: 0.02 }, { def: 4, speed: 0.07, dodge: 0.03 }, { def: 6, speed: 0.09, dodge: 0.05 }],
  guertel: [{ def: 1 }, { hp: 30, regen: 0.002 }, { hp: 50, regen: 0.003 }, { hp: 80, regen: 0.004 }, { hp: 120, regen: 0.006 }]
};

// Zusatzwerte der Waffen je Klasse: Dolche treffen öfter kritisch, Fächer und Stäbe geben Intelligenz
// (Stufe 1 ohne Zusatzwert, siehe oben)
const WEAPON_EXTRA = {
  krieger: [{}, {}, {}, {}, {}],
  ninja: [{}, { crit: 0.02 }, { crit: 0.03 }, { crit: 0.04 }, { crit: 0.06 }],
  schamane: [{}, { mp: 20 }, { mp: 35 }, { mp: 50 }, { mp: 75 }],
  nekromant: [{}, { mp: 20 }, { mp: 35 }, { mp: 50 }, { mp: 75 }]
};

const MAX_PLUS = 9;
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
  { chance: 0.7, gold: 700, splinters: 2, fail: 'down' },
  { chance: 0.6, gold: 1000, splinters: 3, fail: 'down' },
  { chance: 0.45, gold: 1500, splinters: 3, fail: 'down' },
  { chance: 0.3, gold: 2200, splinters: 4, fail: 'break' },
  { chance: 0.2, gold: 3000, splinters: 5, fail: 'break' }
];

// Farben der Plus-Stufen: +1–3 grün, +4–6 blau, +7–8 violett, +9 gold
const PLUS_COLORS = [null, '#9fe08f', '#7fb8ff', '#c58cff', '#ffd34d'];

function plusBand(plus) {
  if (plus >= 9) return 4;
  if (plus >= 7) return 3;
  if (plus >= 4) return 2;
  if (plus >= 1) return 1;
  return 0;
}

const BLESSING = {
  name: 'Segensschriftrolle',
  price: 400,
  text: 'Schützt beim Schmied: Schlägt die Verbesserung fehl, passiert dem Gegenstand nichts. Nur die Kosten sind weg.'
};

const BAG_SIZE = 20;

// Händler im Dorf: was sie verkaufen und zu welchem Preis je Stufe (Lv 1, 5, 10, 15)
const MERCHANTS = {
  waffen: {
    slots: ['waffe'],
    prices: [80, 400, 1100, 2600],
    greeting: 'Jede Klasse kämpft anders. Hier findest du die Waffe, die zu dir passt, von der ersten Klinge bis zum Meisterstück.'
  },
  ruestung: {
    slots: ['ruestung', 'helm', 'schild', 'schuhe', 'guertel'],
    prices: [60, 300, 900, 2200],
    greeting: 'Rüstung hält dich am Leben, Vitalität auch. Such dir aus, was du brauchst.'
  }
};
