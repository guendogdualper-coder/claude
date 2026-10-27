// Aufträge. Der Dorfälteste vergibt eine Kette von Aufträgen von Stufe 1 bis 70,
// die Jägerin wiederholbare Jagdaufträge passend zur eigenen Stufe.
//
// level   ab dieser Stufe gibt es den Auftrag; danach richtet sich auch die Erfahrung
// goal    kill: Monster einer Art besiegen · stone: Seelensteine einer Stufe zerstören
// reward  gold, items ([Platz, Gegenstandsstufe, Plus]), mats (Materialien), potions, scrolls
//         Die Erfahrung wird aus der Stufe berechnet (questXp).
const MAIN_QUESTS = [
  { id: 'q1', level: 1, title: 'Wilde Hunde', goal: { type: 'kill', monster: 'hund', count: 10 },
    text: 'Vor dem Südtor streunen wilde Hunde und reißen unsere Hühner. Zeig ihnen, dass Hayan nicht wehrlos ist.',
    reward: { gold: 120, potions: 5 } },
  { id: 'q2', level: 3, title: 'Der erste Seelenstein', goal: { type: 'stone', level: 5, count: 1 },
    text: 'In den Sonnenwiesen ist ein Stein der Trauer aus der Erde gebrochen. Zerstöre ihn, bevor er noch mehr Monster ruft.',
    reward: { gold: 250, mats: { boniPlus: 2 } } },
  { id: 'q3', level: 4, title: 'Wolfsplage', goal: { type: 'kill', monster: 'wolf', count: 15 },
    text: 'Die Wölfe werden mutiger. Dünne das Rudel aus, ehe sie das Tor erreichen.',
    reward: { gold: 350, items: [['helm', 1, 1]] } },
  { id: 'q4', level: 6, title: 'Der Alpha', goal: { type: 'kill', monster: 'alphawolf', count: 8 },
    text: 'Hinter den Wölfen stehen ihre Anführer, die Alpha-Wölfe. Ohne sie zerfällt das Rudel.',
    reward: { gold: 500, items: [['schuhe', 1, 2]], mats: { switcher: 1 } } },
  { id: 'q5', level: 8, title: 'Stein der Wut', goal: { type: 'stone', level: 10, count: 1 },
    text: 'Am Rand der Wiesen glüht ein Stein der Wut. Seine Wut macht die Tiere rasend.',
    reward: { gold: 800, scrolls: 1, mats: { switcher: 2 } } },
  { id: 'q6', level: 10, title: 'Banditen im Dunkelwald', goal: { type: 'kill', monster: 'bandit', count: 20 },
    text: 'Banditen überfallen unsere Händler auf dem Weg durch den Dunkelwald. Vertreib sie.',
    reward: { gold: 1500, items: [['waffe', 2, 2]] } },
  { id: 'q7', level: 14, title: 'Netz der Spinnen', goal: { type: 'kill', monster: 'waldspinne', count: 20 },
    text: 'Tief im Wald spinnen riesige Spinnen ihre Netze über die Wege. Brenne sie aus, wenn es sein muss.',
    reward: { gold: 2500, mats: { boniPlus: 3, switcher: 2 } } },
  { id: 'q8', level: 15, title: 'Stein der Gier', goal: { type: 'stone', level: 15, count: 2 },
    text: 'Zwei Steine der Gier locken Banditen an wie Gold die Diebe. Zerschlage sie.',
    reward: { gold: 5000, mats: { boni5: 1 } } },
  { id: 'q9', level: 18, title: 'Der Braunbär', goal: { type: 'kill', monster: 'braunbaer', count: 10 },
    text: 'Ein Rudel Braunbären hat den Holzfällerpfad besetzt. Sie sind stark, sei vorsichtig.',
    reward: { gold: 6000, items: [['ruestung', 3, 2]] } },
  { id: 'q10', level: 20, title: 'Orks vor den Toren', goal: { type: 'kill', monster: 'ork', count: 25 },
    text: 'Im Orktal sammelt sich ein Heer. Schwäche es, bevor es gegen Hayan zieht.',
    reward: { gold: 9000, mats: { boni5: 1, switcher: 3 } } },
  { id: 'q11', level: 24, title: 'Stein der Schwärze', goal: { type: 'stone', level: 25, count: 2 },
    text: 'Die Orks beten schwarze Steine an. Nimm ihnen ihre Götzen.',
    reward: { gold: 12000, scrolls: 2, mats: { star: 1 } } },
  { id: 'q12', level: 27, title: 'Der Ork-Hauptmann', goal: { type: 'kill', monster: 'orkhauptmann', count: 10 },
    text: 'Ohne ihre Hauptmänner sind die Orks nur ein wilder Haufen. Finde sie.',
    reward: { gold: 15000, items: [['waffe', 4, 2]] } },
  { id: 'q13', level: 30, title: 'Dämonen im Ödland', goal: { type: 'kill', monster: 'daemon', count: 25 },
    text: 'Aus den Rissen im Ödland steigen Dämonen. Treib sie zurück in die Tiefe.',
    reward: { gold: 25000, items: [['helm', 5, 1]], mats: { boni5: 1 } } },
  { id: 'q14', level: 35, title: 'Stein der Glut', goal: { type: 'stone', level: 35, count: 2 },
    text: 'Die Steine der Glut lassen das Ödland brennen. Lösche sie aus.',
    reward: { gold: 35000, mats: { star: 1, boni5: 1, switcher: 3 } } },
  { id: 'q15', level: 40, title: 'Der Yeti', goal: { type: 'kill', monster: 'yeti', count: 20 },
    text: 'Auf dem Frostgipfel sind Yetis gesehen worden, so groß wie Häuser. Bring ihre Felle als Beweis.',
    reward: { gold: 50000, items: [['ruestung', 5, 2]] } },
  { id: 'q16', level: 48, title: 'Stein der Stille', goal: { type: 'stone', level: 50, count: 2 },
    text: 'Wo der Stein der Stille steht, verstummt jedes Lied. Bring den Klang zurück auf den Gipfel.',
    reward: { gold: 70000, mats: { star: 2 } } },
  { id: 'q17', level: 50, title: 'Das Totenmoor', goal: { type: 'kill', monster: 'untoter', count: 30 },
    text: 'Im Totenmoor erheben sich die Gefallenen alter Kriege. Gib ihnen ihre Ruhe zurück.',
    reward: { gold: 90000, items: [['waffe', 6, 2]] } },
  { id: 'q18', level: 58, title: 'Stein der Pein', goal: { type: 'stone', level: 60, count: 2 },
    text: 'Blutrote Steine wachsen aus dem Moor. Sie nähren sich von Schmerz.',
    reward: { gold: 120000, mats: { boni5: 2, star: 2 } } },
  { id: 'q19', level: 62, title: 'Feuerdrachen', goal: { type: 'kill', monster: 'feuerdrache', count: 15 },
    text: 'Am Feuerberg nisten Drachen. Wenn sie flügge werden, ist kein Dorf mehr sicher.',
    reward: { gold: 160000, items: [['waffe', 7, 2]] } },
  { id: 'q20', level: 68, title: 'Stein des Untergangs', goal: { type: 'stone', level: 70, count: 1 },
    text: 'Der letzte und mächtigste aller Seelensteine. Zerstöre ihn und Hayan ist für immer frei.',
    reward: { gold: 250000, scrolls: 5, mats: { star: 3, boni5: 3 } } }
];

// Erfahrung für einen Auftrag: ein Teil der Erfahrung, die auf dieser Stufe für den Aufstieg nötig ist
function questXp(level, factor = 0.5) {
  return Math.round(xpToNext(level) * factor);
}

// Materialien beim Alchemisten (teuer: eigentlich sind sie Beute der Seelensteine)
const ALCHEMIST_WARES = [
  { id: 'boniPlus', price: 1500 },
  { id: 'switcher', price: 3000 },
  { id: 'boni5', price: 25000 },
  { id: 'star', price: 60000 }
];

// Gesprächszeilen der Wachen und Dorfbewohner
const NPC_LINES = {
  wache: [
    'Halt die Augen offen. Hinter den Wiesen beginnt der Dunkelwald, und dort lauern Banditen.',
    'Ich habe gehört, im Orktal steht ein Stein der Schwärze. Wer ihn zerschlägt, findet Segensschriftrollen.',
    'Die Mauer hält die Monster draußen. Solange du drinnen bist, bist du sicher.',
    'Im Norden liegt der Frostgipfel. Nimm warme Kleidung mit, und viele Tränke.'
  ],
  bauer: ['Seit die Seelensteine aus der Erde brechen, wächst kaum noch etwas auf den Feldern.', 'Die Wildschweine fressen mir die Rüben weg. Wenn du welche siehst, jag sie!'],
  kind: ['Wenn ich groß bin, werde ich auch Abenteurer!', 'Hast du schon mal einen Drachen gesehen? Lian sagt, am Feuerberg gibt es welche.'],
  alte: ['Früher war Hayan ein ruhiges Dorf. Dann kamen die Steine.', 'Der Stein der Gier lässt viel Gold fallen, sagt man. Aber Gier hat noch keinem gutgetan.'],
  moench: ['Jeder Stein hat seine eigene Seele. Und jeder lässt etwas anderes zurück.', 'Wer den Stein des Untergangs bricht, braucht die besten Boni auf jeder Rüstung.']
};
