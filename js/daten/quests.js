// Aufträge. Seit 11.2 eine goldene Hauptquestreihe durch alle Maps (Kapitel je Map, Stufe 1 bis 70):
// Jedes Kapitel vergibt der Älteste der Map. Am Ende eines Kapitels schickt er dich mit einer Nachricht zum
// Ältesten der nächsten Map (Reiseauftrag). Das Finale: alle neun Endbosse der Welt besiegen.
// Die Jägerin vergibt weiter wiederholbare Jagdaufträge passend zur eigenen Stufe.
//
// level   ab dieser Stufe gibt es den Auftrag; danach richtet sich auch die Erfahrung
// goal    kill: Monster einer Art besiegen · stone: Seelensteine einer Stufe zerstören
//         talk: mit dem Ältesten einer anderen Map sprechen (map) · raids: alle Endbosse besiegen
// reward  gold, items ([Platz, Gegenstandsstufe, Plus]), mats (Materialien), potions, books
//         Die Erfahrung wird aus der Stufe berechnet (questXp, je Art ein anderer Anteil).
// map     Map, deren Ältester den Auftrag vergibt und abnimmt
// Gold je Auftrag nach Stufe
const questGold = (L) => Math.round((1.5 * Math.pow(L, 2.5) + 80) / 10) * 10;
const QK = (L, monster, count, title, text, extra = {}) => ({ level: L, title, text, goal: { type: 'kill', monster, count }, reward: { gold: questGold(L), ...extra } });
const QS = (L, level, count, title, text, extra = {}) => ({ level: L, title, text, goal: { type: 'stone', level, count }, reward: { gold: questGold(L) * 2, ...extra } });
const QT = (L, map, title, text, extra = {}) => ({ level: L, title, text, goal: { type: 'talk', map, count: 1 }, reward: { gold: Math.round(questGold(L) / 2), potions: 10, ...extra } });

const QUEST_CHAPTERS = [
  { map: 1, title: 'Kapitel 1 · Vlotho', quests: [
    QK(1, 'hund', 10, 'Wilde Hunde', 'Vor dem Südtor streunen wilde Hunde und reißen unsere Hühner. Zeig ihnen, dass Vlotho nicht wehrlos ist.', { potions: 5 }),
    QK(2, 'fuchs', 10, 'Füchse im Hühnerstall', 'Kaum sind die Hunde fort, schleichen die Füchse um die Ställe. Jag sie zurück in die Wiesen.', { potions: 5 }),
    QS(3, 5, 1, 'Der erste Seelenstein', 'In den Sonnenwiesen ist ein Stein der Trauer aus der Erde gebrochen. Zerstöre ihn, bevor er noch mehr Monster ruft.', { mats: { boniPlus: 2 } }),
    QK(4, 'wolf', 15, 'Wolfsplage', 'Die Wölfe werden mutiger. Dünne das Rudel aus, ehe sie das Tor erreichen.', { items: [['helm', 1, 1]] }),
    QK(5, 'hirsch', 10, 'Verirrte Hirsche', 'Etwas treibt die Hirsche in Panik gegen unsere Zäune. Halte sie auf, bevor die Felder zertrampelt sind.'),
    QK(6, 'alphawolf', 8, 'Der Alpha', 'Hinter den Wölfen stehen ihre Anführer, die Alpha-Wölfe. Ohne sie zerfällt das Rudel.', { items: [['schuhe', 1, 2]], mats: { switcher: 1 } }),
    QK(8, 'wildschwein', 12, 'Keiler in den Rüben', 'Die Wildschweine fressen den Bauern die Ernte weg. Ein Winter ohne Vorräte wäre unser Ende.'),
    QS(9, 10, 1, 'Stein der Wut', 'Am Rand der Wiesen glüht ein Stein der Wut. Seine Wut macht die Tiere rasend – zerschlag ihn.', { mats: { switcher: 2 } }),
    QT(10, 4, 'Auf in den Dunkelwald', 'Vlotho ist sicher, dank dir. Doch die Steine brechen überall aus der Erde. Reise durch das Weltentor in den Dunkelwald und sprich mit Hagen im Waldlager – er braucht jemanden wie dich.')
  ] },
  { map: 4, title: 'Kapitel 2 · Dunkelwald', quests: [
    QK(10, 'bandit', 20, 'Banditen im Dunkelwald', 'Gut, dass Bao dich schickt. Banditen überfallen jeden Händler auf dem Waldweg. Vertreib sie.', { items: [['waffe', 2, 2]] }),
    QK(12, 'dornenkeiler', 12, 'Dornenkeiler', 'Die Keiler hier haben Dornen statt Borsten. Sie zerreißen unsere Fallen – und die Fallensteller.'),
    QK(13, 'banditschuetze', 15, 'Schützen im Dickicht', 'Aus den Baumkronen schießen Banditen auf alles, was sich bewegt. Hol sie herunter.'),
    QK(15, 'waldspinne', 20, 'Netz der Spinnen', 'Tief im Wald spinnen riesige Spinnen ihre Netze über die Wege. Brenne sie aus, wenn es sein muss.', { mats: { boniPlus: 3 } }),
    QS(15, 15, 2, 'Stein der Gier', 'Zwei Steine der Gier locken Banditen an wie Gold die Diebe. Zerschlage sie.', { mats: { boni5: 1 } }),
    QK(16, 'luchs', 12, 'Lautlose Jäger', 'Luchse reißen unsere Späher, ohne dass einer sie kommen sieht. Sei wachsamer als sie.'),
    QK(17, 'banditenfuerst', 1, 'Der Banditenfürst', 'Die Banditen gehorchen einem Fürsten, der sich im Banditenkeller verkriecht. Geh hinein und beende seine Herrschaft.', { items: [['ruestung', 2, 3]] }),
    QK(18, 'braunbaer', 10, 'Der Braunbär', 'Ein Rudel Braunbären hat den Holzfällerpfad besetzt. Sie sind stark, sei vorsichtig.', { items: [['ruestung', 3, 2]] }),
    QS(19, 20, 1, 'Stein der Dornen', 'Mitten im Wald wächst ein Stein der Dornen. Seine Ranken ersticken jeden Baum. Zerstöre ihn.', { mats: { switcher: 2 } }),
    QT(20, 5, 'Krieg im Orktal', 'Der Wald atmet wieder. Doch Späher melden, dass sich im Orktal ein Heer sammelt. Reise ins Orktal und berichte Thrak in der Talwacht, was du hier gesehen hast.')
  ] },
  { map: 5, title: 'Kapitel 3 · Orktal', quests: [
    QK(20, 'ork', 25, 'Orks vor der Talwacht', 'Hagen schickt dich? Dann komm, die Orks stehen schon vor unseren Palisaden. Schwäche ihr Heer.', { mats: { switcher: 3 } }),
    QK(22, 'hyaene', 12, 'Hyänen der Orks', 'Die Orks halten Hyänen wie Hunde und hetzen sie auf unsere Kundschafter. Erledige die Meute.'),
    QK(24, 'orkschamane', 15, 'Die Schamanen', 'Ihre Schamanen rufen Flüche über das Tal. Ohne sie verlieren die Orks ihren Mut.', { books: 1 }),
    QS(25, 25, 2, 'Stein der Schwärze', 'Die Orks beten schwarze Steine an. Nimm ihnen ihre Götzen.', { mats: { star: 1 } }),
    QK(26, 'skorpion', 15, 'Stachel im Sand', 'In den Felsspalten nisten Riesenskorpione. Ihr Gift lähmt einen Ochsen. Räum die Spalten.'),
    QK(28, 'orkhauptmann', 10, 'Der Ork-Hauptmann', 'Ohne ihre Hauptmänner sind die Orks nur ein wilder Haufen. Finde sie.', { items: [['waffe', 4, 2]] }),
    QS(29, 30, 1, 'Stein der Asche', 'Der Stein der Asche verbrennt das Tal von innen. Lösch ihn aus, bevor nur Staub bleibt.', { mats: { boni5: 1 } }),
    QT(30, 6, 'Asche über dem Ödland', 'Das Heer ist zerschlagen. Aber die Asche, die der Wind bringt, kommt aus dem Ödland. Geh dorthin und sprich mit Idris im Aschenlager.')
  ] },
  { map: 6, title: 'Kapitel 4 · Ödland', quests: [
    QK(30, 'oger', 20, 'Oger im Aschenfeld', 'Thrak hatte recht, dich zu schicken. Oger plündern unser Lager jede Nacht. Halte sie fern.', { books: 1 }),
    QK(31, 'warg', 15, 'Wargrudel', 'Wargs folgen den Ogern und fressen, was diese übrig lassen. Jag das Rudel.'),
    QK(33, 'daemon', 25, 'Dämonen im Ödland', 'Aus den Rissen im Ödland steigen Dämonen. Treib sie zurück in die Tiefe.', { items: [['helm', 5, 1]] }),
    QS(34, 35, 2, 'Stein der Glut', 'Die Steine der Glut lassen das Ödland brennen. Lösche sie aus.', { books: 1, mats: { star: 1 } }),
    QK(36, 'hoellenhund', 15, 'Höllenhunde', 'Dreiköpfige Hunde bewachen die Risse. Wer sie besiegt, kann den Rissen nahe kommen.', { mats: { boni5: 1 } }),
    QT(37, 2, 'Die Oase im Süden', 'Die Risse schließen sich. Aus der Oase Sahra im Schlangental kommen Hilferufe – Schlangen, so groß wie Bäume. Reise hin und sprich mit Hakim.')
  ] },
  { map: 2, title: 'Kapitel 5 · Schlangental', quests: [
    QK(37, 'kobra', 20, 'Kobras in der Wüste', 'Idris schickt dich? Die Götter meinen es gut mit Sahra. Die Kobras lauern an jeder Wasserstelle.', { books: 1 }),
    QK(38, 'klapperschlange', 20, 'Das Rasseln im Sand', 'Hörst du das Rasseln? Klapperschlangen. Hunderte. Die Karawanen trauen sich nicht mehr los.'),
    QS(40, 40, 1, 'Stein der Schatten', 'Am Rand des Dschungels steht ein Stein der Schatten. Er lockt die Schlangen aus dem Sand. Zerstöre ihn.', { mats: { star: 1, switcher: 2 } }),
    QK(41, 'riesenpython', 15, 'Riesenpython', 'Im Dschungel würgen Pythons ganze Ochsen. Wer dort Holz schlägt, kommt nicht wieder.'),
    QK(43, 'panther', 15, 'Schwarze Panther', 'Die Panther der Nagas jagen in der Nacht. Mach den Dschungel wieder sicher.', { items: [['ruestung', 5, 2]] }),
    QT(44, 7, 'Eis im Norden', 'Die Wüste ist ruhig, Sahra dankt dir. Doch ein Bote aus dem Norden bittet um Hilfe: Auf dem Frostgipfel erwacht etwas Altes. Geh zu Olaf ins Frostlager.')
  ] },
  { map: 7, title: 'Kapitel 6 · Frostgipfel', quests: [
    QK(44, 'eiswolf', 20, 'Eiswölfe', 'Hakim hat dich geschickt? Gut. Eiswölfe umkreisen unser Lager, sie riechen jede Schwäche.', { books: 1 }),
    QK(45, 'yeti', 20, 'Der Yeti', 'Auf dem Frostgipfel sind Yetis gesehen worden, so groß wie Häuser. Bring ihre Felle als Beweis.', { items: [['ruestung', 5, 2]] }),
    QS(46, 45, 2, 'Stein des Frostes', 'Zwei Steine des Frostes lassen den Gipfel nie mehr tauen. Zerschlage sie.', { books: 1, mats: { star: 1 } }),
    QK(47, 'mammut', 12, 'Wilde Mammuts', 'Die Mammuts sind rasend, seit der Frost nicht weicht. Sie zertrampeln unsere Vorratshütten.'),
    QK(48, 'frostgeist', 15, 'Frostgeister', 'In den Schneestürmen wandern Geister. Wer sie berührt, erfriert von innen.', { mats: { boni5: 1 } }),
    QS(49, 50, 1, 'Stein der Stille', 'Wo der Stein der Stille steht, verstummt jedes Lied. Bring den Klang zurück auf den Gipfel.', { books: 1, mats: { star: 2 } }),
    QK(50, 'eiskoenig', 1, 'Der Eiskönig', 'Alles Eis gehorcht dem Eiskönig in der Eisgrotte. Bezwinge ihn, dann taut der Gipfel.', { items: [['waffe', 6, 2]] }),
    QT(51, 8, 'Nebel über dem Moor', 'Der Gipfel taut, die Lieder kehren zurück. Aber im Süden steigt Nebel aus dem Totenmoor, und mit ihm die Toten. Geh zu Oswin in die Moorwacht.')
  ] },
  { map: 8, title: 'Kapitel 7 · Totenmoor', quests: [
    QK(51, 'untoter', 30, 'Das Totenmoor', 'Olaf schickt dich? Dann hast du Mut. Im Moor erheben sich die Gefallenen alter Kriege. Gib ihnen ihre Ruhe zurück.', { books: 1 }),
    QK(53, 'moorwolf', 15, 'Moorwölfe', 'Die Wölfe hier sind halb tot und hören nicht auf zu jagen. Gib ihnen den Rest.'),
    QK(54, 'sumpfhexe', 15, 'Die Sumpfhexen', 'Hexen beschwören die Toten aus dem Schlamm. Ohne sie bleiben die Gräber zu.', { mats: { boni5: 1 } }),
    QS(55, 55, 2, 'Stein der Fäulnis', 'Zwei Steine der Fäulnis vergiften das Wasser. Nichts Lebendes wächst mehr.', { books: 2, mats: { star: 1 } }),
    QK(56, 'ghul', 15, 'Ghule', 'Die Ghule fressen, was die Hexen erwecken. Sie sind schnell und hungrig. Sei schneller.', { items: [['helm', 6, 2]] }),
    QT(57, 3, 'Donner in der Klamm', 'Der Nebel lichtet sich. Aus der Donnerklamm grollt es seit Tagen – die Titanen regen sich. Reise zur Klammfeste und sprich mit Gunhild.')
  ] },
  { map: 3, title: 'Kapitel 8 · Donnerklamm', quests: [
    QK(57, 'trollkrieger', 20, 'Trollkrieger', 'Oswin hat dich geschickt? Die Trolle belagern die Klamm. Zeig ihnen unsere Stärke.', { books: 1 }),
    QK(58, 'harpyie', 15, 'Harpyien', 'Harpyien stoßen auf jeden herab, der den Pass hinaufsteigt. Hol sie aus der Luft.'),
    QK(59, 'minotaurus', 12, 'Die Minotauren', 'Minotauren rennen mit gesenkten Hörnern gegen unsere Tore. Halte sie auf.', { items: [['ruestung', 6, 2]] }),
    QS(60, 60, 2, 'Stein der Pein', 'Blutrote Steine wachsen aus den Felsen. Sie nähren sich von Schmerz.', { books: 2, mats: { boni5: 2 } }),
    QK(62, 'steintitan', 12, 'Erwachte Titanen', 'Auf dem Titanenkamm stehen die Steintitanen auf. Bring sie wieder zum Stehen – für immer.', { mats: { star: 2 } }),
    QT(63, 9, 'Der Berg brennt', 'Die Titanen ruhen. Doch am Feuerberg schlüpfen Drachen. Das ist der letzte Kampf vor dem Ende – geh zu Ember ins Glutlager.')
  ] },
  { map: 9, title: 'Kapitel 9 · Feuerberg', quests: [
    QK(63, 'lavagolem', 15, 'Lavagolems', 'Gunhild schickt dich? Dann bist du bereit. Golems aus Lava wälzen sich auf unser Lager zu.', { books: 1 }),
    QK(64, 'glutkatze', 15, 'Glutkatzen', 'Glutkatzen streifen durch die Lavafelder. Wo sie laufen, brennt der Boden.'),
    QS(65, 65, 2, 'Stein der Flamme', 'Zwei Steine der Flamme heizen den Berg an. Ohne sie verlöschen die Lavaflüsse.', { books: 2, mats: { star: 2 } }),
    QK(66, 'feuerdaemon', 15, 'Feuerdämonen', 'Aus den Kratern steigen Feuerdämonen. Treib sie zurück ins Feuer.', { items: [['waffe', 7, 2]] }),
    QK(68, 'feuerdrache', 15, 'Feuerdrachen', 'Am Feuerberg nisten Drachen. Wenn sie flügge werden, ist kein Dorf mehr sicher.', { books: 2, mats: { boni5: 2 } }),
    QS(69, 70, 1, 'Stein des Untergangs', 'Der letzte und mächtigste aller Seelensteine. Zerstöre ihn, und die Steine hören auf zu wachsen.', { books: 3, mats: { star: 3, boni5: 2 } }),
    QT(70, 1, 'Heimkehr nach Vlotho', 'Du hast jede Map befreit. Kehr heim nach Vlotho – Bao wartet auf dich, und er hat eine letzte, die größte Aufgabe.')
  ] },
  { map: 1, title: 'Finale · Die neun Endbosse', quests: [
    { level: 70, title: 'Die neun Endbosse', goal: { type: 'raids', count: 9 },
      text: 'Willkommen daheim, Held. In jeder Map wartet noch ein Endboss in seiner Halle – der Urwolf, der Waldtyrann, der Großkhan, der Höllenfürst, die Schlangengöttin, der Frostriese, der Lichkönig, der Donnertitan und der Weltendrache. Sammle Gefährten und besiege sie alle. Dann ist die Welt für immer frei.',
      reward: { gold: 1000000, books: 8, mats: { star: 5, boni5: 5, switch67: 3 } } }
  ] }
];
const MAIN_QUESTS = QUEST_CHAPTERS.flatMap((ch, ci) => ch.quests.map((q, k) => ({ ...q, id: `k${ci + 1}_${k + 1}`, map: ch.map, chapter: ci, chapterTitle: ch.title })));
// Endbosse für das Finale (Reihenfolge nach Stufe)
const RAID_BOSSES = Object.keys(MONSTER_TYPES).filter((id) => MONSTER_TYPES[id].raidBoss).sort((a, b) => MONSTER_TYPES[a].level - MONSTER_TYPES[b].level);
// Stufen der alten Hauptkette (bis 11.1, 20 Aufträge): zum Umrechnen alter Spielstände
const OLD_MAIN_LEVELS = [1, 3, 4, 6, 8, 10, 14, 15, 18, 20, 24, 27, 30, 35, 40, 48, 50, 58, 62, 68];

// Hauptmission des Stallmeisters ab Stufe 20: in 20 Minuten 120 Monster ab Stufe 15 besiegen.
// Belohnung: ein eigenes Reitpferd (+35 % Lauftempo, siehe HORSES), Gold und Erfahrung. Ab Stufe 40 verkauft er das Kriegsross.
const STABLE_QUEST = {
  level: 20, count: 120, minLevel: 15, time: 1200, title: 'Prüfung des Stallmeisters',
  text: 'Ein Pferd trägt nur, wem es vertraut. Zeig mir, dass du draußen bestehen kannst: Besiege in 20 Minuten 120 Monster ab Stufe 15. Schaffst du es, gehört dir eines meiner Reitpferde.',
  reward: { gold: 15000, horse: true }
};

// Erfahrung für einen Auftrag: ein Teil der Erfahrung, die auf dieser Stufe für den Aufstieg nötig ist
// Anteil je Art (seit 11.2, die Reihe hat dreimal so viele Aufträge): Jagd 0,25, Seelenstein 0,35, Reise 0,15, Finale 3
const QUEST_XP = { kill: 0.25, stone: 0.35, talk: 0.15, raids: 3 };
function questXp(level, factor = 0.5) {
  return Math.round(xpToNext(level) * factor);
}

// Materialien beim Alchemisten (teuer: eigentlich sind sie Beute der Seelensteine)
const ALCHEMIST_WARES = [
  { id: 'boniPlus', price: 1500 },
  { id: 'switcher', price: 3000 },
  { id: 'boni5', price: 25000 },
  { id: 'star', price: 60000 },
  { id: 'book', price: 40000 }
];

// Gesprächszeilen der Wachen und Dorfbewohner
const NPC_LINES = {
  wache: [
    'Halt die Augen offen. Hinter den Wiesen beginnt der Dunkelwald, und dort lauern Banditen.',
    'Ich habe gehört, im Orktal steht ein Stein der Schwärze. Wer ihn zerschlägt, findet Sternensteine.',
    'Die Mauer hält die Monster draußen. Solange du drinnen bist, bist du sicher.',
    'Im Norden liegt der Frostgipfel. Nimm warme Kleidung mit, und viele Tränke.'
  ],
  bauer: ['Seit die Seelensteine aus der Erde brechen, wächst kaum noch etwas auf den Feldern.', 'Die Wildschweine fressen mir die Rüben weg. Wenn du welche siehst, jag sie!'],
  kind: ['Wenn ich groß bin, werde ich auch Abenteurer!', 'Hast du schon mal einen Drachen gesehen? Lian sagt, am Feuerberg gibt es welche.'],
  alte: ['Früher war Vlotho eine ruhige Stadt. Dann kamen die Steine.', 'Der Stein der Gier lässt viel Gold fallen, sagt man. Aber Gier hat noch keinem gutgetan.'],
  moench: ['Jeder Stein hat seine eigene Seele. Und jeder lässt etwas anderes zurück.', 'Wer den Stein des Untergangs bricht, braucht die besten Boni auf jeder Rüstung.']
};

// Wanderer draußen auf den Maps (seit 6.5): je Map drei Leute mit Nebenaufgaben –
// „Besiege …“ oder „Bring mir …“ (Monster-Teile wie Yetifell, die auch der Schmied braucht)
const WANDERERS = [
  ['Fallensteller Hob', 'bauer'], ['Kräutersammlerin Mira', 'alte'], ['Wandermönch Ren', 'moench'],
  ['Kundschafterin Aiko', 'jaegerin'], ['Pilger Taro', 'moench'], ['Kürschner Ole', 'bauer'],
  ['Heilerin Sana', 'alte'], ['Späherin Kiri', 'jaegerin'], ['Einsiedler Gen', 'moench']
];
const SIDE_KILL = 14;
const SIDE_COLLECT = 6;
const SIDE_DROP = 0.35;
