// Ausrüstung: vier Plätze, vier Gegenstandsstufen (passend zu den Zonen) und
// Verbesserungen beim Schmied von +0 bis +9.

const EQUIP_SLOTS = [
  { id: 'waffe', name: 'Waffe' },
  { id: 'ruestung', name: 'Rüstung' },
  { id: 'helm', name: 'Helm' },
  { id: 'schuhe', name: 'Schuhe' }
];

// Ab welcher Spielerstufe ein Gegenstand getragen werden kann
const ITEM_TIERS = [
  { level: 1, label: 'Einfach' },
  { level: 8, label: 'Gut' },
  { level: 15, label: 'Selten' },
  { level: 22, label: 'Legendär' }
];

const WEAPON_NAMES = {
  krieger: ['Eisenschwert', 'Mondklinge', 'Drachenschwert', 'Seelenreißer'],
  ninja: ['Kurzdolche', 'Schattendolche', 'Viperzähne', 'Nachtklingen'],
  schamane: ['Papierfächer', 'Kranichfächer', 'Phönixfächer', 'Drachenfächer'],
  nekromant: ['Knochenstab', 'Grabesstab', 'Seelenstab', 'Totenkönigsstab']
};
const ARMOR_NAMES = {
  krieger: ['Lederpanzer', 'Lamellenpanzer', 'Drachenpanzer', 'Seelenpanzer'],
  ninja: ['Leinenwams', 'Schattenwams', 'Viperngewand', 'Nachtgewand'],
  schamane: ['Leinenrobe', 'Kranichrobe', 'Phönixrobe', 'Drachenrobe'],
  nekromant: ['Grabtuch', 'Knochenrobe', 'Seelenrobe', 'Totenkönigsrobe']
};
const HELM_NAMES = ['Lederkappe', 'Eisenhelm', 'Drachenhelm', 'Seelenkrone'];
const SHOE_NAMES = ['Stoffschuhe', 'Lederstiefel', 'Drachenstiefel', 'Seelenstiefel'];

// Grundwerte je Gegenstandsstufe (speed = Lauftempo-Bonus als Anteil)
const BASE_STATS = {
  waffe: [{ atk: 5 }, { atk: 14 }, { atk: 26 }, { atk: 42 }],
  ruestung: [{ def: 3, hp: 20 }, { def: 8, hp: 50 }, { def: 14, hp: 100 }, { def: 22, hp: 160 }],
  helm: [{ def: 2, mp: 10 }, { def: 4, mp: 20 }, { def: 7, mp: 35 }, { def: 11, mp: 55 }],
  schuhe: [{ def: 1, speed: 0.03 }, { def: 2, speed: 0.05 }, { def: 4, speed: 0.07 }, { def: 6, speed: 0.09 }]
};

const MAX_PLUS = 9;
const PLUS_BONUS = 0.1; // jedes Plus gibt +10 % der Grundwerte (mindestens +1)

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

// Was die Händlerin an Ausrüstung verkauft (Stufe 1 und 2)
const GEAR_SHOP = [
  { tier: 0, price: 60 },
  { tier: 1, price: 900 }
];
