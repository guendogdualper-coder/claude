// Wissen der Ratgeberin (seit 13.91): Fragen und Antworten für neue Spieler, Kategorien und der Leitfaden
// „Erste Schritte“. Anzeige und Suche in js/ratgeber.js.
//
// Alle Angaben sind aus dem Spielcode nachgelesen (Stand 13.90). Ändert sich eine Zahl im Spiel, hier mitziehen – wo
// es geht, liest eine Antwort die Zahl selbst aus den Spieldaten (Antwort als Funktion, z. B. Karten, Seelensteine,
// Pferde, Turnierarena).
//
// Eintrag: { c: Kategorie, q: Frage, a: Antwort (HTML oder Funktion, die HTML liefert), k: Stichwörter für die Suche,
//            p: Vorrang bei gleicher Trefferzahl (optional) }
// Platzhalter in Fragen und Antworten:
//   {n:rolle}  Name der Person in Kazehana, z. B. {n:schmied} → „Schmied Doran“ (aus der Welt gelesen, siehe rgName)
//   {k:aktion} Taste dieser Aktion, z. B. {k:inv} → I (beachtet die eigene Tastenbelegung, tasten.js)

const RATGEBER_KATEGORIEN = [
  { id: 'start', name: 'Erste Schritte', icon: '★' },
  { id: 'sinn', name: 'Sinn des Spiels', icon: '🎯' },
  { id: 'steuerung', name: 'Steuerung PC & Handy', icon: '🎮' },
  { id: 'kampf', name: 'Kampf & Fertigkeiten', icon: '⚔' },
  { id: 'klassen', name: 'Klassen & Wege', icon: '🧙' },
  { id: 'ausruestung', name: 'Ausrüstung & Schmied', icon: '🛡' },
  { id: 'quests', name: 'Quests', icon: '📜' },
  { id: 'steine', name: 'Seelensteine', icon: '◆' },
  { id: 'dungeons', name: 'Dungeons & Endbosse', icon: '🏰' },
  { id: 'karten', name: 'Karten & Reisen', icon: '🗺' },
  { id: 'zusammen', name: 'Gruppe, Gilde & Handel', icon: '🤝' },
  { id: 'pvp', name: 'PvP-Arena', icon: '🏆' },
  { id: 'pruefung', name: 'Prüfungsarena', icon: '🏟' },
  { id: 'pferd', name: 'Pferd', icon: '🐎' },
  { id: 'konto', name: 'Konto & Cloud', icon: '☁' },
  { id: 'einstellungen', name: 'Einstellungen', icon: '⚙' }
];

// kleine Helfer für Antworten, die Zahlen aus den Spieldaten lesen
const rgFmt = (n) => Math.round(n).toLocaleString('de-DE');
const rgPct = (x) => Math.round(x * 100) + ' %';

const RATGEBER_WISSEN = [
  // --- Erste Schritte ---------------------------------------------------------------------------------------
  {
    c: 'start', p: 6, q: 'Ich bin neu – was soll ich als Erstes machen?',
    a: 'Sprich mit <b>{n:aeltester}</b> in Kazehana (goldenes „!“ über dem Kopf) und nimm die Hauptquest an. Dann geh vor das Tor und jag die ersten Monster. ' +
      'Der goldene Pfeil an deiner Figur zeigt dir immer den Weg zum nächsten Ziel. Mein Leitfaden „Erste Schritte“ erklärt alles der Reihe nach.',
    k: 'anfang anfangen start starten neu noob anfaenger beginner einstieg erstes zuerst machen tun was soll ich machen wie fange ich an hilfe tutorial'
  },
  {
    c: 'start', p: 3, q: 'Wo bekomme ich die Hauptquest?',
    a: 'Beim Ältesten: in Kazehana <b>{n:aeltester}</b>, auf den anderen Maps der Lagerälteste. Ein goldenes „!“ heißt neuer Auftrag, ein goldenes „?“ heißt abgeben. ' +
      'Den laufenden Auftrag siehst du oben rechts unter der Karte, alle Quests mit Taste {k:quests}.',
    k: 'hauptquest hauptmission auftrag kapitel aeltester quest mission story geschichte'
  },
  {
    c: 'start', q: 'Was zeigt der goldene Pfeil an meiner Figur?',
    a: 'Er zeigt den Weg zum Ziel deines verfolgten Auftrags – mit Name und Entfernung. Welchen Auftrag er verfolgt, wählst du im Questfenster (Taste {k:quests}) mit „Verfolgen“.',
    k: 'pfeil goldener weg ziel navigation finden wohin richtung verfolgen'
  },
  {
    c: 'start', q: 'Wo bekomme ich Tränke?',
    a: 'Bei <b>{n:haendler}</b>. Lebenstränke (Drachenblut) trinkst du mit {k:potHp}, Manatränke (Mondtau) mit {k:potMp}. Es gibt sie in vier Größen: S, M ab Stufe 10, XL ab 25 und XXL ab 55 (die frühere Größe L wurde zu XL). ' +
      'Die Taste nimmt von selbst die kleinste Größe, die das Fehlende auffüllt. Monster und Seelensteine lassen auch Tränke fallen.',
    k: 'trank traenke heilen heilung leben mana potion drachenblut mondtau kaufen haendlerin'
  },
  {
    c: 'start', q: 'Ich bin gestorben – was nun?',
    a: 'Du kannst sofort sicher in der Stadt aufwachen, ohne Verlust. Oder du wartest 5 Sekunden und startest an Ort und Stelle neu: Das kostet etwas Erfahrung und du stehst mit halbem Leben auf.',
    k: 'tod tot sterben gestorben wiederbeleben respawn neu starten verloren erfahrung verlust'
  },
  {
    c: 'start', q: 'Bin ich in der Stadt sicher?',
    a: 'Ja. Innerhalb der Stadtmauer von Kazehana und in jeder Stadt und jedem Lager greifen dich Monster nicht an. Sie folgen dir auch nicht durch die Tore.',
    k: 'sicher stadt mauer lager schutz angriff monster folgen tor safe'
  },
  {
    c: 'start', q: 'Was bedeutet die Farbe der Stufe über einem Monster?',
    a: 'Grau: viel schwächer als du (kaum Erfahrung). Weiß: passend. Gelb: etwas stärker. Rot: gefährlich. ' +
      'Monster über deiner Stufe nehmen je Stufe Unterschied 8 % weniger Schaden und treffen 7 % härter – jag am besten Monster deiner Stufe oder knapp darüber.',
    k: 'farbe stufe level grau weiss gelb rot monster gefaehrlich stark schwach'
  },
  {
    c: 'start', q: 'Wo kann ich Sachen verkaufen?',
    a: 'In der Nähe eines Händlers: {n:haendler}, {n:waffen}, {n:ruestung}, {n:alchemist} oder {n:schmied}. Öffne das Inventar (Taste {k:inv}), tippe „Mehrere verkaufen“, wähle die Sachen aus ' +
      '(oder „Ganze Seite“ / „Nicht nutzbar“) und bestätige. Die Verkaufswerte stehen im Hinweis jedes Gegenstands.',
    k: 'verkaufen verkauf gold loswerden tasche voll haendler inventar muell'
  },
  {
    c: 'start', q: 'Was ist die Tagesbelohnung?',
    a: 'Einmal am Tag holst du dir eine Belohnung ab (Taste {k:daily} oder Knopf „Tagesbelohnung“). Sieben Tage in Folge bilden eine Reihe, jeder Tag gibt etwas Besseres, Tag 7 ist der große Preis mit einem Fertigkeitsbuch. ' +
      'Wer einen Tag auslässt, beginnt wieder bei Tag 1. Die Mengen wachsen mit deiner Stufe.',
    k: 'tagesbelohnung daily login belohnung taeglich jeden tag geschenk reihe streak'
  },
  {
    c: 'start', p: 1, q: 'Gibt es ein Wiki zum Nachschlagen?',
    a: 'Ja, das Seelenstein-Wiki: Klassen und Fertigkeiten, alle Karten, Monster mit Fundort und Beute, Seelensteine, Dungeons, Ausrüstung, NPCs und die Hauptquest – mit eigener Suche. ' +
      'Du findest es ganz unten in meinem Fenster, auf dem Startbildschirm und in der Hilfe (Taste {k:help}).',
    k: 'wiki nachschlagen lexikon datenbank liste monster fundort beute webseite seite'
  },
  {
    c: 'start', q: 'Wo sehe ich meine Werte?',
    a: 'Im Charakterfenster (Taste {k:char}): Auf der Seite „Status“ verteilst du Punkte, unter „Fertigkeiten“ steigerst du sie, unter „Werte“ stehen Angriff, Rüstung, Leben, kritische Treffer, Tempo und mehr.',
    k: 'werte charakter charakterfenster angriff ruestung leben staerke anzeigen stats'
  },
  {
    c: 'start', q: 'Wie werde ich schnell stärker?',
    a: 'Jag Monster deiner Stufe (graue geben kaum Erfahrung), mach die Hauptquest, verteile Statuspunkte in deinen Hauptwert und steigere deine Fertigkeiten. ' +
      'Tausch Ausrüstung gegen bessere und lass sie beim Schmied aufwerten. Seelensteine geben viel Erfahrung und Beute, in einer Gruppe gibt es mehr Erfahrung.',
    k: 'staerker schnell leveln level aufsteigen tipps besser werden farmen grind'
  },

  // --- Sinn des Spiels --------------------------------------------------------------------------------------
  {
    c: 'sinn', p: 5, q: 'Was ist der Sinn des Spiels?',
    a: 'Seelenstein ist ein Rollenspiel zum Jagen und Stärkerwerden: Monster besiegen, Stufe um Stufe aufsteigen, Ausrüstung finden und beim Schmied verbessern, Seelensteine brechen. ' +
      'Die Hauptquest führt dich Kapitel für Kapitel durch alle Maps bis zu den Endbossen. Am meisten Spaß macht es zusammen: Gruppen, Gilden, Dungeons und die Turnierarena.',
    k: 'sinn ziel worum geht es spiel zweck was macht man hier story idee langweilig'
  },
  {
    c: 'sinn', q: 'Was kann ich machen, wenn ich weit oben bin?',
    a: 'Höchststufe 80, Ausrüstung bis +20, epische und legendäre Teile, Endbosse mit fünf Spielern, Instanzen wie der Thron der Unterwelt, ein Rang in der Turnierarena bis Champion und eine neue Bestwelle in der Prüfungsarena.',
    k: 'endgame ende maximal hohe stufe was danach ziel langfristig legendaer champion'
  },
  {
    c: 'sinn', q: 'Wie hoch ist die Höchststufe?',
    a: () => `Stufe ${(typeof MAX_LEVEL !== 'undefined') ? MAX_LEVEL : 80}. Jede Stufe braucht mehr Erfahrung als die davor.`,
    k: 'hoechststufe maximal max level stufe 80 cap obergrenze'
  },
  {
    c: 'sinn', q: 'Wie bekomme ich Erfahrung (EP)?',
    a: 'Von Monstern, Seelensteinen und Aufträgen. Monster, die viel schwächer sind als du, geben kaum noch Erfahrung – dann zieh ins nächste Gebiet weiter. In einer Gruppe bekommt jedes Mitglied in der Nähe etwas mehr.',
    k: 'erfahrung ep xp exp leveln aufsteigen punkte stufe'
  },
  {
    c: 'sinn', q: 'Wie komme ich an Gold?',
    // seit 14.75: Gold von jedem Monster nach Stufe und Gebiet (killGoldRoll, kampf.js; docs/gold-beute.md)
    a: 'Jedes Monster lässt Gold fallen – je höher seine Stufe, desto mehr. Zähe Monster, Dungeons, Nachtmonster und Elite bringen etwas mehr, ab und zu fällt ein <b>Goldbeutel</b> mit dem Fünffachen. ' +
      'Monster weit unter deiner Stufe geben kaum noch Gold. Seelensteine geben viel, der Stein der Gier sogar dreimal so viel; Bosse haben dazu ihre eigene Beute. In einer Gruppe wird das Gold der Monster geteilt (jeder bekommt seinen Anteil plus 10 % je weiterem Mitglied in der Nähe). ' +
      'Am meisten Gold je Stunde bringt die Prüfungsarena. Dazu kommen Aufträge, Verkaufen beim Händler, die Tagesbelohnung und das Auktionshaus. ' +
      'Der Bonus <b>Mehr Gold</b> auf Helm, Schultern, Umhang, Gürtel oder Schuhen erhöht das Gold von Monstern und Seelensteinen.',
    k: 'gold geld reich verdienen muenzen farmen goldbeutel drop beute monster'
  },
  {
    c: 'sinn', q: 'Gibt es Tag und Nacht?',
    a: 'Ja, nach der echten Uhrzeit, für alle gleich: Eine Runde dauert 20 Minuten – 10 Minuten Tag, 1 Minute Dämmerung, 8 Minuten Nacht, 1 Minute Morgendämmerung. Unter der Karte siehst du neben Sonne bzw. Mond, wie lange es noch bis zum Wechsel dauert. ' +
      'Nachts kommen Nachtmonster dazu. Nachtjagden gibt es bei den Nachtwanderern auf den anderen Maps, in Kazehana (Map 1) seit 13.88 nicht mehr.',
    k: 'tag nacht dunkel uhrzeit nachtmonster nachtjagd nachtwanderer daemmerung'
  },

  // --- Steuerung --------------------------------------------------------------------------------------------
  {
    c: 'steuerung', p: 4, q: 'Welche Tasten gibt es am PC?',
    a: () => {
      const rows = typeof KEY_ACTIONS !== 'undefined'
        ? KEY_ACTIONS.map((x) => `<li><kbd>${typeof actionKey === 'function' ? keyLabel(actionKey(x.id)) : keyLabel(x.key)}</kbd> ${x.label}</li>`).join('')
        : '';
      return 'Laufen mit <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> oder den Pfeiltasten, <kbd>Esc</kbd> schließt Fenster. Dazu (deine aktuelle Belegung):' +
        `<ul class="rg-keys">${rows}</ul>`;
    },
    k: 'tasten tastatur keyboard pc computer belegung hotkeys shortcuts wasd steuerung'
  },
  {
    c: 'steuerung', q: 'Kann ich die Tasten ändern?',
    a: 'Ja: Einstellungen (Taste {k:opts}) → Reiter „Tastenbelegung“. Jede Aktion lässt sich neu belegen, nur Laufen (WASD und Pfeile) und Esc bleiben fest. Die Belegung gilt für dieses Gerät.',
    k: 'tasten aendern belegung tastatur umbelegen anpassen keybind'
  },
  {
    c: 'steuerung', p: 3, q: 'Wie steuere ich am Handy?',
    a: 'Berühre die linke Bildschirmhälfte und zieh – dort erscheint der Steuerknüppel zum Laufen. Rechts den Angriffsknopf gedrückt halten. Fertigkeiten antippen; ' +
      'Fertigkeiten mit Zielort antippen und dann auf den Boden tippen. Eisstrahl und Blutsauger hältst du gedrückt. Gespielt wird im Querformat.',
    k: 'handy smartphone touch mobil iphone android tablet steuern laufen joystick knueppel tippen'
  },
  {
    c: 'steuerung', q: 'Wie greife ich an und wähle ein Ziel?',
    a: 'Halte {k:attack} (am Handy den Angriffsknopf): Ist kein Monster in Reichweite, läufst du zum nächsten. {k:target} wählt das nächste Ziel. ' +
      'Am PC greift ein Linksklick auf ein Monster an, ein Rechtsklick wählt es nur aus. Am Handy tippst du das Monster an.',
    k: 'angreifen angriff ziel waehlen target anvisieren schlagen leertaste klick'
  },
  {
    c: 'steuerung', q: 'Kann ich mit der Maus laufen?',
    a: 'Ja: Linksklick auf den Boden läuft dorthin, gedrückt halten folgt dem Mauszeiger. Tasten, Steuerknüppel oder ein Angriff übernehmen sofort wieder.',
    k: 'maus klicken laufen bewegen mausklick click to move'
  },
  {
    c: 'steuerung', q: 'Wie spreche ich mit Leuten in der Stadt?',
    a: 'Geh nah heran und drück {k:interact}, klick die Person an oder tipp am Handy auf den Sprechen-Knopf (er zeigt z. B. „Handeln“ oder „Auftrag“).',
    k: 'sprechen reden npc person handeln dorfbewohner ansprechen interagieren'
  },
  {
    c: 'steuerung', q: 'Was sind die freien Plätze 7 und 8?',
    a: 'Zwei freie Plätze in der Leiste (je Figur). Leg dort eine Fertigkeit (z. B. einen Buff), die Ultimative Attacke oder eine Aktion ab – Trank, Pferd, Ziel, Sprechen, Karte oder ein Fenster. ' +
      'Leeren Platz antippen, lange drücken oder Rechtsklick öffnet die Auswahl.',
    k: 'freie plaetze schnellzugriff leiste 7 8 belegen quick slot'
  },
  {
    c: 'steuerung', q: 'Kann ich Fertigkeiten in der Leiste umsortieren?',
    a: 'Ja: Halte eine Fertigkeit lange gedrückt und zieh sie auf einen anderen Platz oder tipp den anderen Platz an – die beiden tauschen.',
    k: 'umsortieren leiste fertigkeiten tauschen verschieben reihenfolge'
  },
  {
    c: 'steuerung', q: 'Wie öffne ich die große Karte?',
    a: 'Mit Taste {k:map} oder durch Antippen der kleinen Karte. Dort siehst du Auftragsziele, Seelensteine und Dungeon-Eingänge (farbige Quadrate) und mich als blaues „?“.',
    k: 'karte map minimap grosse karte finden orientierung'
  },
  {
    c: 'steuerung', p: 1, q: 'Wie schreibe ich im Chat?',
    a: 'Mit {k:chat} oder dem Sprechblasen-Knopf. Oben im Chat wählst du den Reiter: Global (alle im Kanal), Gilde (nur deine Gilde), Ort (nur Spieler in der Nähe) und System (Meldungen des Spiels).',
    k: 'chat schreiben nachricht reden global gilde ort sprechblase'
  },
  {
    c: 'steuerung', q: 'Kann ich das Spiel als App installieren?',
    a: 'Ja, auf dem Startbildschirm über „📲 Als App installieren“. iPhone: in Safari Teilen → „Zum Home-Bildschirm“, dann über das Symbol starten. Android (Chrome): Menü ⋮ → „App installieren“.',
    k: 'app installieren homescreen startbildschirm iphone android vollbild'
  },
  {
    c: 'steuerung', q: 'Kann ich die Oberfläche verschieben?',
    a: 'Ja: Einstellungen (Taste {k:opts}) → „Figur und Spiel“ → „HUD anpassen“. Dort verschiebst du Lebensanzeige, Karte, Leiste, Chat und mehr und änderst ihre Größe.',
    k: 'hud oberflaeche verschieben anpassen groesse layout knoepfe'
  },

  // --- Kampf & Fertigkeiten ---------------------------------------------------------------------------------
  {
    c: 'kampf', p: 4, q: 'Wie verteile ich Statuspunkte?',
    a: () => `Pro Stufe bekommst du ${(typeof STAT_POINTS_PER_LEVEL !== 'undefined') ? STAT_POINTS_PER_LEVEL : 2} Statuspunkte. Öffne das Charakterfenster (Taste ${rgKey('char')}) und verteile sie mit „+“, „+5“ oder „Alle“. ` +
      `Stärke: +0,5 Angriff · Vitalität: +6 Leben und +0,3 Rüstung · Intelligenz: +5 Mana und +0,5 % Fertigkeitsschaden · Geschick: kritische Treffer, Ausweichen und Angriffstempo. ` +
      `Höchstens ${(typeof MAX_ATTR !== 'undefined') ? MAX_ATTR : 90} Punkte je Wert. Ein Plus am Bild oben links zeigt freie Punkte.`,
    k: 'statuspunkte status punkte attribute verteilen staerke vitalitaet intelligenz geschick stats skillen'
  },
  {
    c: 'kampf', q: 'Welcher Wert ist für meine Klasse am wichtigsten?',
    a: 'Der Hauptwert: Krieger <b>Stärke</b>, Ninja <b>Geschick</b>, Schamane, Nekromant und Magier <b>Intelligenz</b>. Er macht zusätzlich Fertigkeiten, normale Angriffe und Buffs stärker. Etwas Vitalität gibt mehr Leben.',
    k: 'hauptwert wichtig statuspunkte wohin skillen beste verteilung stats klasse'
  },
  {
    c: 'kampf', q: 'Kann ich Statuspunkte oder Fertigkeiten zurücksetzen?',
    a: 'Ja, bei <b>{n:lehrmeister}</b>. Das erste Zurücksetzen kostet 10.000 Gold, jedes weitere das Doppelte (höchstens 5 Millionen) – Statuspunkte und Fertigkeiten zählen getrennt. ' +
      'Beim Zurücksetzen der Fertigkeiten bekommst du alle Punkte zurück und die Gegenstände, die die Stufen mindestens gekostet haben: Fertigkeitsbücher für E, Schriftrollen für H, Seelensteine für L und V.',
    k: 'zuruecksetzen reset neu verteilen statuspunkte fertigkeiten lehrmeister fehler buecher schriftrollen seelensteine zurueck'
  },
  {
    c: 'kampf', p: 3, q: 'Wie steigere ich meine Fertigkeiten?',
    // seit 14.1: E mit Büchern, H mit Schriftrollen, L und V mit Seelensteinen (Gegenstand)
    a: 'Pro Stufe gibt es einen Fertigkeitspunkt. Im Charakterfenster steigst du damit jede Fertigkeit bis Stufe 15; der Punkt auf 15 erweckt sie zu E1. ' +
      'Danach kostet jede Stufe einen Gegenstand: <b>E1–E10</b> je ein Fertigkeitsbuch der Fertigkeit, <b>Heroisch H1–H10</b> (ab Stufe 35) je eine Schriftrolle, ' +
      '<b>Legendär L1–L10</b> (ab Stufe 50) und <b>Vollendet V</b> (ab Stufe 65) je einen Seelenstein als Gegenstand. Der Aufstieg in den nächsten Rang kostet einen Gegenstand des neuen Rangs ' +
      '(E10 → H1 eine Schriftrolle, H10 → L1 und L10 → V je einen Seelenstein) und geht schon aus den letzten drei Stufen eines Rangs – die übersprungenen Stufen kosten nichts extra.',
    k: 'fertigkeiten skills steigern fertigkeitspunkt erwecken e1 heroisch legendaer vollendet rang aufstieg buch schriftrolle seelenstein'
  },
  {
    c: 'kampf', q: 'Wann bekomme ich neue Fertigkeiten?',
    a: 'Jeder Weg hat fünf eigene Fertigkeiten. Sie werden ab Stufe 1, 3, 5, 7 und 10 frei – beim Aufstieg sagt dir das Spiel, welche neu ist.',
    k: 'neue fertigkeit freischalten skill unlock stufe gesperrt ab lvl'
  },
  {
    c: 'kampf', q: 'Wo bekomme ich Fertigkeitsbücher (E1–E10)?',
    a: () => `Aus jedem Seelenstein (etwa jeder fünfte bis sechste lässt eins fallen, immer für deine Klasse), ganz selten von Monstern ab Stufe 20, ` +
      `bei {n:lehrmeister} (jede Fertigkeit deiner Klasse, ${(typeof TEACHER !== 'undefined') ? rgFmt(TEACHER.bookPrice) : '100.000'} Gold), bei {n:alchemist} (zufällige Fertigkeit deiner Klasse), ` +
      'aus Hauptquests und der Tagesbelohnung. Ein Buch gilt nur für seine Fertigkeit und nur von E1 bis E10. Bücher fremder Klassen kannst du verkaufen oder tauschen.',
    k: 'buch buecher fertigkeitsbuch fertigkeitsschriftrolle skillbuch e2 e10 lernen lehrmeister'
  },
  {
    c: 'kampf', q: 'Wo bekomme ich Schriftrollen (Heroisch)?',
    a: () => `Nur aus Seelensteinen ab Stufe ${(typeof SKILL_MAT_DROP !== 'undefined') ? SKILL_MAT_DROP.rolle.stone : 40} – je höher der Stein, desto öfter (Stufe 40 etwa 22 %, Stufe 80 etwa 42 %). ` +
      'Der Lehrmeister verkauft keine. Eine Schriftrolle gilt für jede Fertigkeit deiner Klasse: Sie bringt E10 (schon ab E8) nach H1 und hebt danach jede Stufe von H1 bis H10. ' +
      'Du findest sie im Fenster Aufwertungsteile (Taste {k:mats}); per Post und im Auktionshaus kannst du sie handeln.',
    k: 'schriftrolle schriftrollen heroisch h1 h10 rolle scroll woher drop seelenstein 40'
  },
  {
    c: 'kampf', q: 'Wo bekomme ich Seelensteine als Gegenstand (Legendär, Vollendet)?',
    a: () => `Nur aus Seelensteinen ab Stufe ${(typeof SKILL_MAT_DROP !== 'undefined') ? SKILL_MAT_DROP.seelenstein.stone : 45} – und sehr selten (Stufe 45 etwa 3,5 %, Stufe 60 etwa 5 %, Stufe 80 etwa 7 %, also grob einer aus 15 bis 30 Steinen) – freu dich über jeden. ` +
      'Ein Seelenstein (Gegenstand) gilt für jede Fertigkeit: H10 (schon ab H8) → L1, jede Stufe L1–L10 und L10 (schon ab L8) → V kosten je einen. ' +
      'Nicht verwechseln: Die großen Seelensteine in der Welt sind die Steine, die du zerschlägst; der Gegenstand fällt aus ihnen.',
    k: 'seelenstein gegenstand legendaer vollendet l1 l10 v woher drop farmen 45'
  },
  {
    c: 'kampf', q: 'Was ist die Ultimative Attacke?',
    a: () => `Ab Stufe ${(typeof ULT_UNLOCK !== 'undefined') ? ULT_UNLOCK : 20} hat jeder Weg eine eigene, sehr starke Attacke mit ${(typeof ULT_COOLDOWN !== 'undefined') ? ULT_COOLDOWN : 60} Sekunden Abklingzeit – goldener Knopf über dem Angriff oder Taste ${rgKey('ult')}. Sie wird mit deiner Stufe stärker.`,
    k: 'ultimative attacke ulti ult spezial taste 6 goldener knopf'
  },
  {
    c: 'kampf', q: 'Was ist der Klassensegen?',
    a: () => `Ab Stufe ${(typeof SEGEN_UNLOCK !== 'undefined') ? SEGEN_UNLOCK : 10} ein eigener Buff je Klasse: aktivieren mit Taste ${rgKey('segen')} oder dem runden Knopf neben der Ultimativen Attacke. Er hält 30 Minuten und wächst alle 10 Stufen. ` +
      'Schamane: Segen der Natur (Heilung: Segen des Lichts) · Ninja: Klingenschatten (Bogen: Falkenblick) · Nekromant: Blutpakt · Magier: Arkane Erleuchtung. Der Krieger hat keinen.',
    k: 'klassensegen segen buff 30 minuten taste 9 blutpakt klingenschatten'
  },
  {
    c: 'kampf', q: 'Was sind Buffs?',
    a: 'Fertigkeiten, die dich eine Weile stärken, z. B. Aura des Schwertes oder Kampfrausch. Solange einer läuft, kreist ein Lichtring um die Fertigkeit, die Restzeit steht darüber und deine Figur leuchtet in einer Aura. Mit jeder Fertigkeitsstufe halten sie länger.',
    k: 'buff buffs aura staerken dauer verstaerkung'
  },
  {
    c: 'kampf', q: 'Warum kann ich nach einem Zauber nicht gleich den nächsten wirken?',
    a: 'Schamane, Nekromant und Magier haben eine gemeinsame Abklingzeit: Nach jeder Fertigkeit haben ihre übrigen Fertigkeiten mindestens 2 Sekunden Abklingzeit.',
    k: 'abklingzeit cooldown gcd zauber warten global'
  },
  {
    c: 'kampf', q: 'Die Monster sind zu stark – was tun?',
    a: 'Such dir Monster deiner Stufe (weiße Stufe), gelbe und rote sind gefährlich. Verteile freie Punkte, werte deine Ausrüstung beim Schmied auf, nimm Tränke mit und spiel in einer Gruppe.',
    k: 'zu stark schwer sterbe oft hilfe monster schaffen nicht'
  },
  {
    c: 'kampf', q: 'Wie funktioniert ein Duell?',
    a: 'Tipp einen Mitspieler an → „Duell“. Nimmt er an, kämpft ihr nach 3 Sekunden mit allen Angriffen und Fertigkeiten. Wer auf 1 Leben fällt oder den roten Kreis verlässt, verliert. Niemand stirbt und niemand verliert Erfahrung.',
    k: 'duell kampf spieler 1gegen1 pvp freundschaftlich'
  },

  // --- Klassen & Wege ---------------------------------------------------------------------------------------
  {
    c: 'klassen', p: 3, q: 'Welche Klassen gibt es?',
    a: () => (typeof CLASSES !== 'undefined')
      ? '<ul>' + Object.values(CLASSES).map((c) => `<li><b>${c.name}</b> (${c.role}): ${c.paths.map((x) => x.name).join(', ')}</li>`).join('') + '</ul>'
      : 'Krieger, Ninja, Schamane, Nekromant und Magier.',
    k: 'klassen klasse krieger ninja schamane nekromant magier auswahl charakter'
  },
  {
    c: 'klassen', q: 'Welche Klasse ist gut für Anfänger?',
    a: 'Der Krieger hält am meisten aus und trifft ganze Gruppen auf einmal – der sicherste Weg zum Farmen. Aber jede Klasse ist gut spielbar; nimm die, die dir am meisten Spaß macht.',
    k: 'beste klasse anfaenger einfach empfehlung welche klasse waehlen noob'
  },
  {
    c: 'klassen', q: 'Was sind Wege?',
    a: 'Krieger, Ninja, Schamane und Nekromant haben zwei Wege: einen für Monster in Massen und einen für Zweikämpfe. Der Magier wählt eines von vier Elementen. Jeder Weg hat fünf eigene Fertigkeiten; gewählt wird bei der Erstellung.',
    k: 'weg wege pfad element pve pvp spezialisierung'
  },
  {
    c: 'klassen', q: 'Kann ich meinen Weg wechseln?',
    a: 'Ja, bei <b>{n:lehrmeister}</b>. Das kostet so viel wie ein Fertigkeiten-Zurücksetzen. Dein alter Weg bleibt mit allen Stufen gespeichert – wechselst du zurück, ist alles wieder da. Der Magier wechselt so sein Element, seine Fertigkeitsstufen bleiben.',
    k: 'weg wechseln element aendern lehrmeister umskillen'
  },
  {
    c: 'klassen', q: 'Was kann der Krieger?',
    a: 'Nahkampf mit viel Leben. <b>Weg der Klinge</b>: Flächenschaden, ideal zum Farmen; ab Stufe 30 Kampf mit zwei Waffen. <b>Weg des Leibes</b>: Verteidigung und Kontrolle, als einziger mit Zweihänder oder Streitaxt. ' +
      'Nur der Krieger trägt einen Schild. Hauptwert: Stärke.',
    k: 'krieger klinge leib schwert axt zweihaender streitaxt schild tank'
  },
  {
    c: 'klassen', q: 'Was kann der Ninja?',
    a: 'Schnell und oft kritisch. <b>Weg des Dolches</b>: Hinterhalt, Tarnung und Blitzangriff, mit einem Dolch in jeder Hand. <b>Weg des Falken</b>: Fernkampf mit Bogen, Köcher und Pfeilen. Hauptwert: Geschick.',
    k: 'ninja dolch dolche falke bogen tarnung kritisch assassine'
  },
  {
    c: 'klassen', q: 'Was kann der Schamane?',
    a: 'Fernkampf mit Fächer oder Glocke. <b>Weg des Drachen</b>: Feuer, Blitz und Eis gegen viele Gegner. <b>Weg der Heilung</b>: heilt und schützt – der Heiler jeder Gruppe. Hauptwert: Intelligenz.',
    k: 'schamane drache heilung heiler faecher glocke support'
  },
  {
    c: 'klassen', q: 'Was kann der Nekromant?',
    a: 'Fernkampf mit Stab oder Sense. <b>Weg der Seelen</b>: Blutsauger, beschworene Skelettkrieger (nach dem Erwecken Knochenhunde) und Geisterflut. <b>Weg der Knochen</b>: Blut, Knochen und Lebensraub. Hauptwert: Intelligenz.',
    k: 'nekromant seelen knochen diener skelett beschwoerung stab sense'
  },
  {
    c: 'klassen', q: 'Was kann der Magier?',
    a: 'Der Gelehrte der vier Elemente mit dem Zepter: <b>Feuer</b> setzt in Brand, <b>Frost</b> bremst und friert ein, <b>Blitz</b> springt von Gegner zu Gegner, <b>Erde</b> schleudert hoch und zieht zusammen. Jedes Element hat fünf eigene Zauber. Hauptwert: Intelligenz.',
    k: 'magier feuer frost blitz erde element zepter zauber'
  },
  {
    c: 'klassen', q: 'Wie kämpfe ich mit zwei Waffen?',
    a: 'Krieger auf dem Weg der Klinge lernen es ab Stufe 30 bei <b>{n:waffen}</b> für 20.000 Gold: ein zweites Schwert oder eine Axt in die Nebenhand. Die Nebenhand gibt 30 % ihres Angriffs, etwas Tempo und ihre Boni zur Hälfte, dafür kein Blocken. ' +
      'Der Ninja trägt ohnehin einen Dolch in jeder Hand.',
    k: 'zwei waffen beidhaendig dual wield nebenhand zweite waffe'
  },
  {
    c: 'klassen', q: 'Wer kann einen Schild tragen?',
    a: 'Nur der Krieger, und nicht mit Zweihänder oder Streitaxt. Blocken geht nur mit Schild. Bogen und Sense brauchen ebenfalls beide Hände.',
    k: 'schild blocken tragen zweihand beide haende'
  },
  {
    c: 'klassen', q: 'Woher bekomme ich Pfeile für den Bogen?',
    a: 'Bogen, Köcher und Pfeile verkauft <b>{n:bogenmacher}</b>. Der Köcher steckt in der Nebenhand.',
    k: 'pfeile koecher bogen munition bogenmacher falke'
  },

  // --- Ausrüstung & Schmied ---------------------------------------------------------------------------------
  {
    c: 'ausruestung', p: 4, q: 'Wie funktioniert der Schmied?',
    a: () => `<b>{n:schmied}</b> verbessert Ausrüstung bis +${(typeof MAX_PLUS !== 'undefined') ? MAX_PLUS : 20} – mit Gold und Seelensplittern, ab +6 (bei Ausrüstung ab Stufe 30 schon ab +4) zusätzlich mit Teilen von Monstern. ` +
      ((typeof UPGRADE_STEPS !== 'undefined') ? `Die Erfolgschance sinkt von ${rgPct(UPGRADE_STEPS[0].chance)} (+0 → +1) bis ${rgPct(UPGRADE_STEPS[UPGRADE_STEPS.length - 1].chance)} (+19 → +20). ` : '') +
      'Jedes Plus macht den Gegenstand stärker. Beim Schmied siehst du vorher alle Werte alt → neu und die Kosten.',
    k: 'schmied aufwerten upgrade verbessern plus +20 +10 schmieden chance kosten'
  },
  // seit 14.86: Teilewandlerin in Lichtwacht (teilewandler.js)
  {
    c: 'ausruestung', p: 3, q: 'Was mache ich mit alten Monster-Teilen?',
    a: () => `Bring sie zu <b>${(typeof TW !== 'undefined') ? TW.name : 'der Teilewandlerin'}</b> in Lichtwacht (Kristallabgrund, neben dem Schmied). ` +
      `Für je <b>${(typeof TW !== 'undefined') ? TW.rate : 10}</b> Teile von Monstern unter Stufe ${(typeof TW !== 'undefined') ? TW.maxLevel : 50} – beliebig gemischt – bekommst du ein Teil für Ausrüstung der Stufen 60, 70 oder 80 oder einen Ätherkern. ` +
      `Teile, die du behalten willst, tippst du im Fenster vorher ab.`,
    k: 'teilewandlerin wandeln umwandeln tauschen alte teile monsterteile hundezahn wolfspelz aetherkern stufe 60 70 80 lichtwacht akane'
  },
  {
    c: 'ausruestung', p: 3, q: 'Kann Ausrüstung beim Schmied kaputtgehen?',
    a: 'Ja – schon ab +0 kann ein Fehlschlag den Gegenstand zerbrechen. Eine <b>Segensschriftrolle</b> schützt: Dann sind bei einem Fehlschlag nur die Kosten weg. Setz den Haken beim Schmied, bevor du aufwertest.',
    k: 'kaputt zerbrechen bruch brechen schmied fehlschlag verloren segensschriftrolle schutz'
  },
  {
    c: 'ausruestung', q: 'Wo bekomme ich Segensschriftrollen?',
    a: () => `Nur selten aus Seelensteinen ab Stufe ${(typeof BLESSING !== 'undefined') ? BLESSING.stone : 35}. Händler verkaufen sie nicht.`,
    k: 'segensschriftrolle segen schriftrolle schutz bruch woher'
  },
  {
    c: 'ausruestung', q: 'Was sind Seelensplitter?',
    a: 'Das Material, das der Schmied für jedes Plus braucht. Seelensteine geben viele (der Stein der Glut doppelt so viele), Monster nur ab und zu einen, die Tagesbelohnung an Tag 2.',
    k: 'seelensplitter splitter schmied material woher'
  },
  {
    c: 'ausruestung', q: 'Woher bekomme ich Monster-Teile für den Schmied?',
    a: () => `Jedes Monster lässt mit ${(typeof MOB_MAT_CHANCE !== 'undefined') ? rgPct(MOB_MAT_CHANCE) : '5 %'} sein eigenes Teil fallen (z. B. Hundezahn oder Wolfspelz), mehr, wenn ein Wanderer genau dieses Teil sammeln lässt. Seelensteine geben Teile der Monster ihres Gebiets. ` +
      `Welches Teil gebraucht wird und wo es herkommt (📍), zeigt dir der Schmied. Deine Teile siehst du mit Taste ${rgKey('mats')}.`,
    k: 'monster teile material hundezahn wolfspelz schmied farmen aufwertungsteile'
  },
  {
    c: 'ausruestung', q: 'Welche Seltenheiten gibt es?',
    a: () => ((typeof RARITIES !== 'undefined') ? RARITIES.map((r) => `<span style="color:${r.color}">${r.name}</span>`).join(' · ') + '. ' : '') +
      'Seltenere Teile haben mehr Boni und etwas höhere Werte. Episch gibt es erst bei Ausrüstung ab Stufe 60, Legendär nur bei Stufe-80-Ausrüstung aus den Instanzen.',
    k: 'seltenheit selten episch legendaer gewoehnlich normal farbe lila gold blau gruen'
  },
  {
    c: 'ausruestung', q: 'Was sind Boni und wie bekomme ich mehr davon?',
    a: 'Ein Gegenstand trägt bis zu 5 normale und 2 besondere Boni. <b>Verstärkung</b> fügt Boni hinzu (bis zum 4.), <b>Seltene Verstärkung</b> den 5. (braucht genau 4), der <b>Switcher</b> würfelt Bonus 1–5 neu, ' +
      'der <b>Sternenstein</b> gibt Bonus 6 und dann 7, der <b>Sternen-Switcher</b> würfelt 6 und 7 neu. Anwenden im Inventar am Gegenstand. ' +
      'Alle diese Materialien gibt es <b>nur aus Seelensteinen</b>: Die Steine der ersten Karte (Stufe 5–15) geben vor allem Verstärkungen, Switcher nur sehr selten; ' +
      'ab Stufe 20 (zweite Karte) kommen Switcher, Seltene Verstärkung und Sternensteine richtig, je höher der Stein, desto öfter.',
    k: 'boni bonus verstaerkung switcher sternenstein sternen-switcher seltene verstaerkung wuerfeln'
  },
  // seit 14.15: neue Boni
  {
    c: 'ausruestung', q: 'Was bewirkt die Vergiftungschance (Gift)?',
    a: () => {
      const T = typeof TOXIN !== 'undefined' ? TOXIN : { dur: 6, share: 0.4, bossCap: 0.02 };
      return `Die <b>Vergiftungschance</b> gibt es nur auf Waffen (insgesamt höchstens ${(typeof BONUS_CAPS !== 'undefined') ? rgPct(BONUS_CAPS.poison) : '12 %'}). ` +
        `Jeder Treffer – Grundangriff und Fertigkeit, je Ziel einmal – vergiftet mit dieser Chance: ${T.dur} Sekunden lang, jede Sekunde ein Tick, zusammen ${rgPct(T.share)} des Treffers. ` +
        `Das Ziel zeigt „Vergiftet“ mit Restzeit und Schaden je Sekunde, die Zahlen sind grün. Ein neues Gift stapelt nicht, es erneuert die Dauer und behält den stärkeren Tick. ` +
        `Bosse, Endboss-Kristalle und Seelensteine verlieren durch ein Gift höchstens ${rgPct(T.bossCap)} ihres Lebens. Im PvP nimmt ein Tick höchstens 1,5 % des Lebens.`;
    },
    k: 'gift giftig vergiftung vergiftet vergiftungschance poison toxin gruen schaden ueber zeit'
  },
  {
    c: 'ausruestung', q: 'Wie bekomme ich mehr Gold und mehr Beute?',
    a: 'Die Boni <b>Mehr Gold</b> und <b>Mehr Beute</b> gibt es auf Helm, Schultern, Umhang, Gürtel und Schuhen (je Teil bis 8 %, zusammen bis 25 %). ' +
      'Mehr Gold erhöht das Gold von Monstern, Bossen und Seelensteinen, nicht die Belohnung von Aufträgen oder der Arena. ' +
      'Mehr Beute erhöht die Chance auf Ausrüstung, Tränke und Monsterteile. Fertigkeitsbücher, Schriftrollen, Seelensteine (Gegenstand), Verstärkungen, Switcher und Sternensteine bleiben bewusst so selten wie bisher.',
    k: 'gold beute mehr gold mehr beute drop drops loot goldfund glueck finden'
  },
  {
    c: 'ausruestung', q: 'Was heißt „Stark gegen …“ und „Abwehr gegen …“?',
    a: '<b>Stark gegen</b> Tiere, Menschen, Orks und Riesen, Untote und Geister oder Teufel und Dämonen macht mehr Schaden gegen diese Art und zählt zu „Stark gegen Monster“ dazu. ' +
      'Tiere sind auch Spinnen, Schlangen und Drachen, zu Orks und Riesen zählen Oger, Trolle und Golems, Untote sind Untote Krieger, Ghule, Skelette und Geister, Teufel und Dämonen auch der Höllenhund und Abaddor. ' +
      'Seelensteine zählen wie die Monster ihres Gebiets. Andere Spieler sind Menschen: gegen sie zählt nur „Stark gegen Menschen“. ' +
      '<b>Abwehr gegen</b> Magie (Zauber von Magier, Schamane, Nekromant und zaubernden Monstern), Nahkampf oder Fernkampf senkt den Schaden dieser Angriffe, <b>Abwehr gegen Menschen</b> den von menschlichen Monstern und anderen Spielern. ' +
      'Alle Boni stehen im Charakterfenster auf der Seite „Werte“, mit ihrer Obergrenze.',
    k: 'stark gegen tiere menschen orks riesen untote geister teufel daemonen abwehr magie nahkampf fernkampf kritischer schaden boni'
  },
  {
    c: 'ausruestung', q: 'Wo kaufe ich Ausrüstung?',
    a: 'Waffen für deine Klasse hat <b>{n:waffen}</b>, Rüstung, Helm, Schultern, Umhang, Schild, Schuhe und Gürtel <b>{n:ruestung}</b>, Bögen und Köcher <b>{n:bogenmacher}</b>. ' +
      'Händler verkaufen Ausrüstung der Stufen 5, 10 und 15 – alles darüber gibt es nur als Beute.',
    k: 'ausruestung kaufen waffe ruestung helm haendler shop laden'
  },
  {
    c: 'ausruestung', q: 'Welche Ausrüstungsstufen gibt es?',
    a: () => ((typeof ITEM_TIERS !== 'undefined') ? ITEM_TIERS.map((t) => `${t.label} (ab Stufe ${t.level})`).join(' · ') : '') +
      '. Höhere Stufen kannst du erst ab der jeweiligen Charakterstufe tragen.',
    k: 'ausruestungsstufe stufe tier veteran meister himmlisch goettlich abgruendig ewig'
  },
  {
    c: 'ausruestung', q: 'Woran sehe ich, ob ein Teil besser ist?',
    a: 'In der Tasche zeigt ein grüner Pfeil ▲, dass ein Teil besser ist als dein angelegtes, ein roter ▼, dass es schwächer ist. Antippen oder mit der Maus darüberfahren zeigt jeden Wert einzeln.',
    k: 'besser vergleichen vergleich pfeil gruen rot anlegen staerker'
  },
  {
    c: 'ausruestung', q: 'Welche Ausrüstungsplätze gibt es?',
    a: 'Waffe, Rüstung, Helm, Schultern, Umhang, Schild (nur Krieger; beim Ninja Zweitdolch oder Köcher), Schuhe und Gürtel. Jedes Teil siehst du an deiner Figur.',
    k: 'plaetze slots ausruestungsplaetze anlegen helm umhang guertel schuhe'
  },
  {
    c: 'ausruestung', q: 'Meine Tasche ist voll – was tun?',
    a: () => `Die Tasche hat ${(typeof BAG_PAGES !== 'undefined') ? `${BAG_PAGES} Seiten mit je ${BAG_PAGE}` : '120'} Plätzen. Verkauf, was du nicht brauchst, nutz „Sortieren“ und leg Schätze ins Lager bei {n:lager}.`,
    k: 'tasche voll inventar platz plaetze sortieren aufraeumen'
  },
  {
    // seit 14.84: Seite III und IV (sozial-freischalten.js)
    c: 'ausruestung', q: 'Warum sind Seite III und IV meiner Tasche gesperrt?',
    a: () => (typeof sozialSperreAn === 'function' && sozialSperreAn()
      ? (sozialFrei() ? 'Bei dir sind Seite III und IV schon frei – danke fürs Folgen! Das gilt für alle deine Charaktere.'
        : 'Seite I und II hat jeder Charakter. Folge uns auf TikTok und Instagram und schalte Seite III und IV frei – für alle deine Charaktere. Die beiden Knöpfe findest du im Rucksack auf Seite III oder IV. Was dort schon liegt, kannst du jederzeit ansehen und herausnehmen.')
      : 'Bei dir sind alle vier Seiten der Tasche frei.'),
    k: 'seite 3 4 drei vier gesperrt freischalten tiktok instagram folgen schloss tasche rucksack'
  },
  {
    c: 'ausruestung', q: 'Was ist das Lager?',
    a: () => `Bei <b>{n:lager}</b> öffnest du einmalig für ${(typeof STORAGE !== 'undefined') ? rgFmt(STORAGE.price) : '1.000'} Gold dein Lager mit ${(typeof STORAGE_SIZE !== 'undefined') ? STORAGE_SIZE : 180} Plätzen – in jeder Stadt dasselbe. ` +
      'Mit Konto gehört der Inhalt dem ganzen Konto: Jeder deiner Charaktere mit eigenem Zugang kommt an die Sachen.',
    k: 'lager bank lagern aufbewahren platz konto charaktere teilen'
  },
  {
    c: 'ausruestung', q: 'Was verkauft der Alchemist?',
    a: () => {
      if (!(typeof ALCHEMIST_WARES !== 'undefined')) return '<b>{n:alchemist}</b> verkauft Fertigkeitsbücher.';
      const name = (id) => (id === 'book' ? 'Fertigkeitsbuch (zufällig, deine Klasse)' : (MATERIALS.find((m) => m.id === id) || { name: id }).name);
      return '<b>{n:alchemist}</b> verkauft: ' + ALCHEMIST_WARES.map((w) => `${name(w.id)} ${rgFmt(w.price)} Gold`).join(' · ') + '. Verstärkungen, Switcher und Sternensteine verkauft er nicht mehr – die gibt es nur aus Seelensteinen.';
    },
    k: 'alchemist materialien kaufen verstaerkung switcher sternenstein preis'
  },

  // --- Quests ---------------------------------------------------------------------------------------------
  {
    c: 'quests', p: 3, q: 'Welche Arten von Aufträgen gibt es?',
    a: '<b>Hauptquests</b> (golden): die Kapitel der Ältesten auf jeder Map und die Prüfung des Stallmeisters. <b>Nebenquests</b> (grün): Wanderer draußen auf den Maps, wiederholbare Jagden bei {n:jaegerin} und nachts die Nachtjagden der Nachtwanderer.',
    k: 'auftraege quests arten hauptquest nebenquest jagd wanderer'
  },
  {
    c: 'quests', q: 'Wo sehe ich meine Quests?',
    a: 'Im Questfenster (Taste {k:quests}): Haupt- und Nebenquests mit Fortschritt. Mit „Verfolgen“ zeigt der goldene Pfeil auf das Ziel, Nebenquests kannst du dort abbrechen. Der aktuelle Auftrag steht oben rechts unter der Karte.',
    k: 'questlog questfenster quests ansehen fortschritt verfolgen abbrechen'
  },
  {
    c: 'quests', q: 'Was bedeuten „!“ und „?“ über den Köpfen?',
    a: '„!“ heißt: Hier gibt es einen neuen Auftrag. „?“ heißt: Du kannst etwas abgeben. Golden sind Hauptmissionen, grün Nebenmissionen. Mein blaues „?“ heißt nur: Hier gibt es Antworten.',
    k: 'ausrufezeichen fragezeichen zeichen kopf gold gruen blau symbol'
  },
  {
    c: 'quests', q: 'Lohnt es sich, Aufträge zu wiederholen?',
    a: 'Die erste Nebenaufgabe, Jagd und Nachtjagd bei jedem Auftraggeber bringt die volle Belohnung. Jede Wiederholung gibt das Doppelte dessen, was die Kills selbst an Erfahrung bringen (seit 13.88).',
    k: 'wiederholen wiederholung jagd nebenaufgabe belohnung erfahrung lohnt'
  },
  {
    c: 'quests', q: 'Was sind Wanderer?',
    a: 'Leute draußen auf jeder Map (drei je Map) mit Nebenaufgaben: Monster besiegen oder Teile sammeln. Ein grünes „!“ zeigt, dass sie etwas für dich haben.',
    k: 'wanderer nebenaufgabe nebenquest draussen sammeln'
  },
  {
    c: 'quests', q: 'Was macht die Jägerin?',
    a: '<b>{n:jaegerin}</b> (und die Jägerinnen und Jäger in jedem Lager) bietet wiederholbare Jagdaufträge passend zu deiner Stufe an. Du wählst aus mehreren Angeboten.',
    k: 'jaegerin jagd jagdauftrag wiederholbar'
  },
  {
    c: 'quests', q: 'Wo gebe ich einen fertigen Auftrag ab?',
    a: 'Beim Auftraggeber – dieselben Leute stehen in jeder Stadt und jedem Lager, Aufträge lassen sich überall abgeben. Ein „?“ über dem Kopf zeigt, dass du etwas abgeben kannst; im Fenster gibt es dann den Knopf „Abgeben“.',
    k: 'abgeben fertig erledigt auftrag zurueck belohnung'
  },

  // --- Seelensteine -----------------------------------------------------------------------------------------
  {
    c: 'steine', p: 3, q: 'Was ist ein Seelenstein?',
    a: 'Große Steine in den Jagdgebieten (farbige Quadrate auf der Karte), von Stufe 5 bis 80 in Fünferschritten. Greifst du einen an, ruft er Welle um Welle Monster herbei. ' +
      'Dafür gibt er viel Erfahrung, Gold, Seelensplitter, Materialien und Ausrüstung.',
    k: 'seelenstein stein steine was ist wellen beute farbige quadrate'
  },
  {
    c: 'steine', q: 'Welcher Seelenstein gibt was?',
    a: () => (typeof STONE_TYPES !== 'undefined')
      ? '<ul>' + STONE_TYPES.map((s) => `<li>Stufe ${s.level}: <b>${s.name}</b> – ${s.drop}</li>`).join('') + '</ul>'
      : 'Jeder Stein hat seine eigene Beute.',
    k: 'seelensteine liste beute stein der trauer wut gier dornen schwaerze asche glut schatten frost stille'
  },
  {
    c: 'steine', q: 'Wann kommt ein zerstörter Seelenstein wieder?',
    a: () => `Er bleibt lange weg (etwa ${(typeof STONE !== 'undefined') ? `${Math.round(STONE.respawn[0] / 60)}–${Math.round(STONE.respawn[1] / 60)}` : '10–15'} Minuten) und taucht dann an einer neuen Stelle im selben Gebiet auf.`,
    k: 'seelenstein wieder respawn zurueck zeit weg'
  },
  {
    c: 'steine', q: 'Was lassen Seelensteine ab bestimmten Stufen fallen?',
    a: 'Jeder Seelenstein kann ein Fertigkeitsbuch für deine Klasse fallen lassen – und nur Seelensteine geben Verstärkung, Switcher, Seltene Verstärkung und Sternenstein. Ab Stufe 30 Sternen-Switcher, ab 35 Segensschriftrollen, ab 40 Schriftrollen (für H1–H10) ' +
      'und ab 45 Seelensteine als Gegenstand (für L1–V) – alles selten, je höher der Stein, desto öfter.',
    k: 'seelenstein drop beute stufe 30 35 40 45 segensschriftrolle sternen-switcher schriftrolle fertigkeitsbuch'
  },

  // --- Dungeons & Endbosse ----------------------------------------------------------------------------------
  {
    c: 'dungeons', p: 3, q: 'Was sind Dungeons und wo finde ich sie?',
    a: () => {
      const list = (typeof DUNGEONS !== 'undefined') ? DUNGEONS.filter((d) => !d.raid && !d.instanz && !d.inst60 && d.entry)
        .sort((a, b) => a.minLevel - b.minLevel)
        .map((d) => `${d.name} (ab ${d.minLevel}, ${(WORLD_MAPS.find((m) => m.id === d.entry.map) || { name: '' }).name})`).join(' · ') : '';
      return 'Drei Räume voller Monster, am Ende ein Boss. Kündigt er seinen Stampfer mit einem roten Kreis an: raus da! Bosse kommen nach 10 Minuten wieder. ' +
        'Beute: Ausrüstung +3 bis +6, Schmiede-Teile und viel Gold. Die Eingänge sind farbige Quadrate auf der Karte' + (list ? ': ' + list : '') + '.';
    },
    k: 'dungeon dungeons hoehle boss eingang spinnenhoehle orkfestung banditenkeller'
  },
  {
    c: 'dungeons', q: 'Was sind Dungeon-Risse?',
    a: 'Ab Stufe 10 öffnet sich ab und zu in deiner Nähe ein flackernder Riss (pulsierender Punkt auf der Karte). Er bleibt 5 Minuten offen und führt direkt in einen Dungeon deiner Stufe. ' +
      'Allein schließt er sich, sobald du hindurchgehst; in einer Gruppe bleibt er offen.',
    k: 'riss risse dungeon-riss portal flackern'
  },
  {
    c: 'dungeons', q: 'Was sind Endbosse?',
    a: 'Jede Map hat einen Endboss in einer großen Halle – gebaut für 5 Spieler: einer hält ihn (Tank), einer heilt, die anderen machen Schaden. Raus aus roten Kreisen, Kristalle zerstören, bei der Vernichtung in die grünen Lichtkreise. ' +
      'Jeder in der Gruppe bekommt besondere Endboss-Ausrüstung, Seelensplitter, Aufwertungsteile und viel Gold.',
    k: 'endboss raid boss halle gruppe 5 spieler tank heiler'
  },
  {
    c: 'dungeons', q: 'Was sind Instanzen?',
    a: 'Große Gruppeninhalte ab Stufe 60: der <b>Thron der Unterwelt</b> im Feuerberg für 6–7 Spieler, acht Instanzen für 2–5 Spieler in den Ecken von Frostgipfel, Totenmoor, Donnerklamm und Feuerberg, ' +
      'dazu zwei im Kristallabgrund ab Stufe 75. Erst fallen die Wächter, dann der Instanzboss. Legendäre Beute gibt es nur hier; die Beute der Lv-60-Instanzen gibt es je Spieler und Instanz einmal in 30 Minuten (gezählt ab dem Betreten).',
    k: 'instanz instanzen hoellenthron thron der unterwelt abaddor legendaer stufe 60 75'
  },
  {
    c: 'dungeons', q: 'Welche Rollen gibt es in einer Gruppe?',
    a: 'Tank (hält den Boss, z. B. Krieger auf dem Weg des Leibes), Heiler (Schamane auf dem Weg der Heilung) und Schaden (alle anderen). Empfohlen sind 1 Tank, 1 Heiler und 3 Schaden – Pflicht ist das nicht.',
    k: 'rollen tank heiler schaden dps gruppe zusammenstellung'
  },

  // --- Karten & Reisen --------------------------------------------------------------------------------------
  {
    c: 'karten', p: 3, q: 'Welche Maps gibt es und für welche Stufe?',
    a: () => (typeof WORLD_MAPS !== 'undefined')
      ? '<ul>' + WORLD_MAPS.slice().sort((a, b) => a.minLevel - b.minLevel || a.id - b.id).map((m) => {
        const town = m.id === 1 ? 'Kazehana' : (ZONES.find((z) => z.map === m.id && z.safe) || { name: '' }).name;
        return `<li><b>Map ${m.id} · ${m.name}</b> – ${m.levels}${town ? ` (Stadt: ${town})` : ''}</li>`;
      }).join('') + '</ul>'
      : '',
    k: 'maps karten gebiete stufe welche map wohin level bereich zonen'
  },
  {
    c: 'karten', q: 'Wie komme ich auf eine andere Map?',
    a: 'Über das <b>Weltentor</b> in jeder Stadt und jedem Lager: kostenlos auf jede Map, deren Mindeststufe du hast.',
    k: 'andere map reisen weltentor portal teleport wechseln'
  },
  // seit 14.16: Stadtformen und Teleportsteine (daten/stadtformen.js, teleportsteine.js)
  {
    c: 'karten', q: 'Was sind Teleportsteine?',
    a: 'Ab dem Dunkelwald hat jede Stadt ihre eigene Form – Wurzelhof, Kluftwacht, Aschenhafen, Kanalstadt, Wolkenhorst, Stegdorf, Gratfeste, Basaltsechseck und das Oktogon von Lichtwacht, auf der Schattenseite Mondsichel, Palisadenstern, Dünenlinse, Kesselrand, Kreuzfeste und Fjordhafen – und jede Karte ihre eigene Gestalt: Lichtungswald, Schlucht mit Hochplateaus, Ascheinseln, Schlangenfluss mit Delta, Himmelsinseln, Moorlabyrinth, Grat und Klamm, Vulkankegel, Splitterfeld im Abgrund, Kraterseen, Brandschneisen, Dünenmeer, Kraterkessel, Terrassenhang und Fjordküste. Wo kein Weg hinführt, stehen <b>Teleportsteine</b>: zwei Steinpfosten mit leuchtendem Kristall. Bleib kurz darauf stehen oder tipp ihn an, dann stehst du sofort auf seinem Partnerstein – auch zu Pferd. Auf der großen Karte siehst du jeden Stein mit einer gestrichelten Linie zu seinem Partner. Im Ödland verbinden sie alle Ascheinseln, auf dem Frostgipfel die Himmelsinseln ohne Eisbrücke, im Totenmoor die versunkenen Inseln, im Kristallabgrund die äußeren Splitter, in Mondfall die Inseln der Kraterseen, in der Blutsteppe die Insel im Blutsee und in Nachtwacht den Kai im Hafen.',
    k: 'teleportstein teleportsteine stein steine teleport insel inseln stadt städte form steg brücke partnerstein moor totenmoor kristallabgrund lichtwacht mondfall blutsteppe nachtwacht hafen'
  },
  {
    c: 'karten', q: 'Was macht die Wegweiserin?',
    a: '<b>{n:teleport}</b> bringt dich gegen Gold an den Rand jedes Jagdgebiets. Der Preis ist die Mindeststufe des Gebiets × 25 Gold.',
    k: 'wegweiserin teleport reisen jagdgebiet schnell gold'
  },
  {
    c: 'karten', q: 'Wer ist wer in Kazehana?',
    a: () => {
      const roles = [['aeltester', 'Hauptquest'], ['haendler', 'Tränke'], ['waffen', 'Waffen'], ['ruestung', 'Rüstung'], ['bogenmacher', 'Bögen, Köcher, Pfeile'],
        ['schmied', 'Aufwerten'], ['lehrmeister', 'Fertigkeitsbücher, Zurücksetzen, Weg wechseln'], ['alchemist', 'Materialien'], ['teleport', 'Reisen in die Jagdgebiete'],
        ['lager', 'Lager'], ['jaegerin', 'Jagdaufträge'], ['stallmeister', 'Pferd'], ['post', 'Briefe'], ['auktion', 'Auktionshaus'], ['arena', 'Prüfungsarena'], ['pvp', 'Turnierarena']];
      return '<ul>' + roles.map(([id, what]) => `<li><b>${rgName(id)}</b> – ${what}</li>`).join('') + '</ul>Dazu das Weltentor zu den anderen Maps. Dieselben Leute stehen in jeder Stadt und jedem Lager.';
    },
    k: 'wer ist wer stadt vlotho leute npc haendler personen wo finde ich'
  },

  // --- Gruppe, Gilde & Handel -------------------------------------------------------------------------------
  {
    c: 'zusammen', p: 3, q: 'Wie spiele ich mit anderen zusammen?',
    a: () => `Über den Server-Knopf (Taste ${rgKey('net')}) gehst du in einen Kanal. Alle im selben Kanal spielen in derselben Welt, höchstens ${(typeof NET_MAX !== 'undefined') ? NET_MAX : 8} Spieler je Kanal. Mit „Freunde einladen“ schickst du einen Link direkt in deinen Kanal.`,
    k: 'zusammen mehrspieler multiplayer online server kanal freunde spielen'
  },
  {
    c: 'zusammen', q: 'Wie wechsle ich den Kanal?',
    a: () => `Über den Server-Knopf (Taste ${rgKey('net')}): Dort wählst du Server und Kanal oder „Allein spielen“. Wer einen leeren Kanal betritt, führt dessen Welt; geht er, übernimmt automatisch ein anderer – der Kanal bleibt offen.`,
    k: 'kanal wechseln server channel allein spielen online offline'
  },
  {
    c: 'zusammen', q: 'Wie gründe ich eine Gruppe?',
    a: () => `Tipp einen Mitspieler an → „Gruppe“, oder im Fenster Freunde &amp; Gilde (Taste ${rgKey('social')}) den Reiter „Gruppe“. Bis zu ${(typeof PARTY !== 'undefined') ? PARTY.max : 8} Spieler; ` +
      'jedes Mitglied in der Nähe bekommt 10 % mehr Erfahrung je weiterem Mitglied in der Nähe. Die Verteilung ist gleich oder nach Stufe.',
    k: 'gruppe party einladen team zusammen erfahrung bonus'
  },
  // seit 14.72
  {
    c: 'zusammen', q: 'Können Licht und Schatten zusammen spielen?',
    a: 'Ja. Gruppe, Handel und Gruppenfinder gehen auch mit der anderen Seite, wenn ihr im selben Kanal seid. Unter Stufe 50 steht ihr auf verschiedenen Karten – ' +
      'die Gruppe zeigt das Mitglied dann mit „andere Karte“. Zusammen geht ihr in Dungeons, Instanzen und die Prüfungsarena (bis zu dritt). Nur Gilden bleiben bei der eigenen Seite.',
    k: 'licht schatten seite andere seite zusammen gruppe kanal handel arena dungeon nicht im kanal'
  },
  {
    c: 'zusammen', p: 2, q: 'Was ist der Gruppenfinder?',
    a: () => `Ab Stufe ${(typeof GF !== 'undefined') ? GF.level : 30} (Taste ${rgKey('gf')}): Wähle deine Rolle (Tank, Heiler oder Schaden), erstelle einen Eintrag für einen Dungeon oder Endboss oder tritt einem bei. ` +
      'Ist die Gruppe voll oder drückt der Anführer „Los“, fragt das Spiel alle, ob sie bereit sind, und schickt euch zum Eingang.',
    k: 'gruppenfinder lfg gruppe suchen finden dungeon rolle j'
  },
  {
    c: 'zusammen', p: 2, q: 'Wie gründe ich eine Gilde?',
    a: () => `Ab Stufe ${(typeof GUILD !== 'undefined') ? GUILD.level : 40} für ${(typeof GUILD !== 'undefined') ? rgFmt(GUILD.price) : '5.000'} Gold im Fenster Freunde &amp; Gilde (Taste ${rgKey('social')}). ` +
      `Du lädst Spieler aus dem Kanal ein, bis zu ${(typeof GUILD !== 'undefined') ? GUILD.maxMembers : 30} Mitglieder. Der Gildenname steht über euren Köpfen und ihr habt einen eigenen Gildenchat.`,
    k: 'gilde gruenden clan guild beitreten einladen'
  },
  {
    c: 'zusammen', q: 'Wie füge ich Freunde hinzu?',
    a: 'Tipp einen Mitspieler an → „Freund“. Er bekommt eine Anfrage und nimmt an. Deine Freunde siehst du im Fenster Freunde &amp; Gilde (Taste {k:social}).',
    k: 'freunde freund hinzufuegen freundesliste anfrage'
  },
  {
    c: 'zusammen', p: 2, q: 'Wie handle ich mit anderen Spielern?',
    a: () => `Tipp einen Mitspieler an → „Handeln“. Beide legen bis zu ${(typeof TRADE_SLOTS !== 'undefined') ? TRADE_SLOTS : 8} Sachen und Gold hinein. Getauscht wird erst, wenn beide dasselbe Angebot bestätigt haben.`,
    k: 'handeln handel tauschen trade spieler gegenstaende gold mitspieler'
  },
  {
    c: 'zusammen', q: 'Wie funktioniert die Post?',
    a: () => `Bei <b>{n:post}</b> schreibst du Briefe an andere Charaktere – auch an Spieler, die gerade nicht online sind. Du kannst Gold und bis zu ${(typeof POST_MAX_WARE !== 'undefined') ? POST_MAX_WARE : 6} Sachen hineinlegen. Die Post gibt es nur mit Konto.`,
    k: 'post brief briefe schicken senden offline postmeisterin'
  },
  {
    c: 'zusammen', q: 'Wie funktioniert das Auktionshaus?',
    a: 'Bei <b>{n:auktion}</b> stellst du mit Konto Sachen zum Sofortkauf ein: Preis in Gold, Laufzeit 12, 24 oder 48 Stunden, dazu eine kleine Einstellgebühr. Andere kaufen, auch wenn du nicht spielst. ' +
      'Die Ware kommt per Post zum Käufer, das Gold per Post zu dir; Abgelaufenes schickt die Post zurück.',
    k: 'auktionshaus auktion kaufen verkaufen markt handel sofortkauf'
  },
  {
    c: 'zusammen', q: 'Wie melde oder blockiere ich jemanden?',
    a: 'Tipp den Spieler an (oder seinen Namen im Chat) → „Blockieren“ oder „Melden“. Von Blockierten verschwinden Nachrichten, Sprechblasen und Einladungen. Aufheben kannst du das über die Spielerkarte, den Chat oder Einstellungen → Konto.',
    k: 'melden blockieren beleidigung spieler ignorieren report stoeren belaestigen'
  },
  {
    c: 'zusammen', q: 'Welche Regeln gelten im Chat?',
    a: 'Die Verhaltensregeln: keine Beleidigungen, kein Betrug, kein Spam. Grobe Wörter ersetzt ein Filter durch ***. Alle Regeln stehen auf der Seite „Verhaltensregeln“ (Startbildschirm und Einstellungen → Konto).',
    k: 'regeln verhaltensregeln chat erlaubt verboten beleidigung filter'
  },

  // --- PvP-Arena (Turnierarena) -----------------------------------------------------------------------------
  {
    c: 'pvp', p: 3, q: 'Gibt es PvP? Was ist die Turnierarena?',
    a: () => `Ja, bei <b>{n:pvp}</b> (ab Stufe ${(typeof PVP !== 'undefined') ? PVP.minLevel : 10}, online in einem Kanal). Rangkampf 1 gegen 1, 2 gegen 2 und 3 gegen 3: Wer fällt, ist raus, das letzte Team gewinnt. ` +
      'Dazu die Turmschlacht 4 gegen 4 ohne Rang. Es gibt kein Gold und keine Beute, nur Rangpunkte – und wer fällt, verliert weder Erfahrung noch Gold.',
    k: 'pvp turnierarena arena rangkampf spieler gegen spieler 1v1 2v2 3v3 turniermeister'
  },
  {
    c: 'pvp', q: 'Wie funktionieren die Rangpunkte?',
    a: () => (typeof PVP_TIERS !== 'undefined')
      ? `Sieg +${PVP.win}, Niederlage −${PVP.loss} (nie unter 0). Stufen: ${PVP_TIERS.map((t) => `${t.name} ${rgFmt(t.min)}`).join(' · ')}. Ein Rang gilt für alle Rangkämpfe. Wer einen Rangkampf verlässt, verliert ihn.`
      : 'Sieg +50, Niederlage −25.',
    k: 'rang rangpunkte bronze silber gold platin diamant champion punkte pvp'
  },
  {
    c: 'pvp', q: 'Was ist die Turmschlacht?',
    a: 'Blau gegen Rot, 4 gegen 4, zum Spaß ohne Rang. Wer fällt, steht nach ein paar Sekunden in der eigenen Basis wieder auf. Steht nur ein Team im Kreis um den Turm, lädt es ihn auf. ' +
      'Gewonnen hat, wer den Turm auf 100 % bringt oder zuerst 100 Kills holt; nach 15 Minuten, wer mehr Kills hat.',
    k: 'turmschlacht turm 4v4 blau rot basis kills'
  },
  {
    c: 'pvp', q: 'Wie viel Schaden macht man im PvP? Gibt es One-Shots?',
    a: () => {
      const P = typeof PVP_DMG !== 'undefined' ? PVP_DMG : { maxHit: 0.25, maxCrit: 0.35, windowMax: 0.45, window: 1.5, mulLow: 0.38, mulHigh: 0.3, mulFrom: 50, mulTo: 80, armorMax: 0.6, otherMax: 0.5, pad: 0.02, heal: 0.6, dodgeMul: 0.5 };
      return `Bei ähnlicher Stufe (weniger als 10 Stufen Abstand) nicht: Ein Treffer nimmt höchstens ${rgPct(P.maxHit)} des Lebens (kritisch ${rgPct(P.maxCrit)}), und in ${String(P.window).replace('.', ',')} Sekunden höchstens ${rgPct(P.windowMax)} – auch bei mehreren Gegnern. ` +
        `Der Schaden zwischen Spielern zählt weniger (bis Stufe ${P.mulFrom} zu ${rgPct(P.mulLow)}, auf Stufe ${P.mulTo} zu ${rgPct(P.mulHigh)}), Rüstung zählt doppelt (höchstens ${rgPct(P.armorMax)} weniger), ` +
        `dazu Schadensreduktion und <b>Abwehr gegen Menschen</b>, Magie, Nahkampf oder Fernkampf (zusammen höchstens ${rgPct(P.otherMax)}), und je Stufe hält man ${rgPct(P.pad)} mehr aus. ` +
        `Ausweichen und Blocken wirken im PvP halb, Heilung und Lebensraub zu ${rgPct(P.heal)}. Gute Werte gegen Spieler: Abwehr gegen Menschen und <b>Stark gegen Menschen</b>. ` +
        'Ein Duell dauert so bei gleicher Stufe meist 10 bis 20 Sekunden. Bei großem Stufenabstand bleibt es hart.';
    },
    k: 'pvp duell schaden one-shot oneshot einschlag ruestung abwehr menschen stark gegen menschen turnierarena rangkampf deckel heilung'
  },

  // --- Prüfungsarena ----------------------------------------------------------------------------------------
  {
    c: 'pruefung', p: 3, q: 'Was ist die Prüfungsarena?',
    a: () => `Bei <b>{n:arena}</b> (ab Stufe ${(typeof ARENA !== 'undefined') ? ARENA.minLevel : 5}) kämpfst du allein oder mit bis zu zwei Gruppenmitgliedern gegen Welle um Welle. Jede Welle ist stärker, ab Welle 4 kommen Elite-Monster, jede 5. Welle ein Wellenmeister. ` +
      `Für jede geschaffte Welle gibt es Gold, ausgezahlt beim Verlassen. Du hast ${(typeof ARENA !== 'undefined') ? ARENA.lives : 3} Leben – beim letzten Tod ist das gesammelte Gold weg.`,
    k: 'pruefungsarena arena herausforderung wellen allein gruppe gold arenameisterin'
  },
  {
    c: 'pruefung', q: 'Gibt es in der Prüfungsarena Beute?',
    a: 'Die Monster geben volle Erfahrung und etwas Gold (weniger als draußen), aber keine Gegenstände, Steine, Tränke oder Materialien. Dazu kommt das Wellengold – zusammen bringt die Arena je Stunde deutlich mehr Gold als Farmen draußen.',
    k: 'arena beute erfahrung gold belohnung lohnt'
  },
  {
    c: 'pruefung', q: 'Kann ich mit meiner Gruppe in die Prüfungsarena?',
    // seit 14.72 (Gruppe bis zu dritt gibt es seit 14.40, die Antwort war noch „Nein“)
    a: 'Ja, zu dritt: Sprich als Gruppe mit der Arenameisterin und tippe „Mit Gruppe betreten“ (oder im Reiter „Gruppe“ „Arena mit der Gruppe betreten“). ' +
      'Bis zu zwei Mitglieder bekommen eine Einladung mit Countdown – egal, wo sie gerade sind, auch Licht und Schatten gemischt. Ihr kämpft in derselben Halle gegen dieselben Wellen; ' +
      'zu zweit kommen 1,5-mal so viele Monster, zu dritt doppelt so viele. Wellengold, Erfahrung und Gold bekommt jeder so viel wie allein, und jeder hat seine eigenen drei Leben.',
    k: 'arena gruppe zusammen allein freunde zu zweit zu dritt licht schatten pruefungsarena'
  },

  // --- Pferd ------------------------------------------------------------------------------------------------
  {
    c: 'pferd', p: 4, q: 'Wie bekomme ich ein Pferd?',
    a: () => {
      const S = (typeof STABLE_QUEST !== 'undefined') ? STABLE_QUEST : { level: 20, count: 120, minLevel: 15, time: 1200, reward: { gold: 15000 } };
      const H = (typeof HORSES !== 'undefined') ? HORSES[1] : { speed: 0.35 };
      return `Ab Stufe ${S.level} hat <b>{n:stallmeister}</b> (und jeder Stallmeister in den Lagern) eine Prüfung: ${S.count} Monster ab Stufe ${S.minLevel} in ${S.time / 60} Minuten. ` +
        `Belohnung: ein eigenes Reitpferd (+${rgPct(H.speed)} Lauftempo) und ${rgFmt(S.reward.gold || 0)} Gold.`;
    },
    k: 'pferd reiten reittier mount stallmeister pruefung bekommen'
  },
  {
    c: 'pferd', q: 'Was ist das Kriegsross?',
    a: () => {
      const W = (typeof HORSES !== 'undefined') ? HORSES[2] : { level: 40, price: 200000, speed: 0.65 };
      return `Ab Stufe ${W.level} verkauft der Stallmeister das Kriegsross für ${rgFmt(W.price)} Gold. Es gibt +${rgPct(W.speed)} Lauftempo statt +${(typeof HORSES !== 'undefined') ? rgPct(HORSES[1].speed) : '35 %'}.`;
    },
    k: 'kriegsross pferd schneller kaufen stallmeister'
  },
  {
    c: 'pferd', p: 3, q: 'Was ist der Drache (Glutschwinge)?',
    a: () => {
      const D = (typeof HORSES !== 'undefined' && HORSES[3]) ? HORSES[3] : { level: 60, price: 500000, speed: 1.1 };
      const W = (typeof HORSES !== 'undefined') ? HORSES[2] : { speed: 0.9 };
      return `Ab Stufe ${D.level} verkauft der Stallmeister die <b>Glutschwinge</b>, einen Drachen, für ${rgFmt(D.price)} Gold – ein Pferd brauchst du dafür schon. ` +
        `Sie gibt +${rgPct(D.speed)} Lauftempo (Kriegsross +${rgPct(W.speed)}) und schwebt knapp über dem Boden: Bäume, Felsen, Wasser, Lava und Abgründe überfliegt sie einfach.`;
    },
    k: 'drache drachen glutschwinge fliegen flug reittier kaufen stallmeister stufe 60 schneller dragon'
  },
  {
    c: 'pferd', q: 'Wo kann mein Drache fliegen?',
    a: 'Draußen in der Welt fast überall – nur Mauern und Palisaden, Häuser, Säulen und der Felsrand einer Karte halten ihn auf. ' +
      'In Dungeons, Instanzen, der Prüfungs- und der Turnierarena und im Duell fliegt er nicht: dort läuft er mit dir am Boden, so schnell wie ein Kriegsross, ' +
      'und hält sich an Wände, Säulen, Türen, Wasser und Lava wie jeder zu Fuß. Wer fliegend hineingeht, landet vorher. ' +
      'Steigst du über Wasser oder Bäumen ab, landest du an der nächsten freien Stelle. Wer angreift oder eine Fertigkeit nutzt, steigt wie beim Pferd ab.',
    k: 'drache fliegen wasser baeume mauer dungeon instanz arena duell landen absteigen glutschwinge'
  },
  // seit 14.39: Flughöhe und Farbe
  {
    c: 'pferd', q: 'Wie fliege ich mit dem Drachen höher?',
    a: 'Solange dein Drache fliegt, steigst du mit der <b>Leertaste</b> ein Stück über die Bäume, ein zweiter Druck lässt ihn wieder sinken ' +
      '(statt anzugreifen; auch Bild↑/Bild↓). Am Handy erscheinen dafür im Flug zwei große Knöpfe „Steigen“ und „Sinken“ links neben den Fertigkeiten (in „HUD anpassen“ verschiebbar). Oben bist du genauso schnell und ' +
      'überfliegst nichts anderes als unten – Mauern und Häuser halten dich weiter auf. Absteigen, ein Angriff mit der Maus oder eine Fertigkeit, ' +
      'ein Teleport, der Tod und Dungeons, Instanzen, Arenen und Duelle bringen dich wieder nach unten.',
    k: 'drache hoch hoeher steigen sinken fliegen flughoehe leertaste bild hoch runter knopf pfeil handy glutschwinge dragon'
  },
  {
    c: 'pferd', q: 'Kann ich die Farbe meines Drachen ändern?',
    // seit 14.67: Farbe nur einmal wählbar
    a: 'Nein, nur einmal. Die Glutschwinge gibt es in Rot, Blau, Schwarz und Weiß. Die Farbe wählst du beim Kauf beim Stallmeister – ' +
      'nach einer Rückfrage ist sie endgültig. Wer seinen Drachen vor Version 14.67 gekauft hat, behält seine Farbe und darf sie beim ' +
      'Stallmeister noch genau einmal festlegen (bestätigen oder wechseln). Mitspieler sehen deinen Drachen in deiner Farbe.',
    k: 'drache farbe aendern blau rot schwarz weiss weiß stallmeister glutschwinge aussehen dragon'
  },
  {
    c: 'pferd', q: 'Wie steige ich auf mein Pferd?',
    a: 'Mit dem Pferdeknopf oder Taste {k:ride}. Wer angreift, steigt ab. Zu Fuß ist das Tempo mit Schuhen, Boni und Buffs auf +25 % begrenzt – das Pferdetempo kommt noch oben drauf.',
    k: 'aufsteigen absteigen reiten pferd taste r tempo'
  },
  {
    c: 'pferd', q: 'Meine Pferde-Prüfung ist abgelaufen.',
    a: 'Nach 20 Minuten ist die Prüfung vorbei. Sprich einfach wieder mit einem Stallmeister und starte sie neu. Abbrechen kannst du sie dort jederzeit.',
    k: 'pruefung abgelaufen zeit vorbei nochmal stallmeister'
  },

  // --- Konto & Cloud ----------------------------------------------------------------------------------------
  {
    c: 'konto', p: 3, q: 'Brauche ich ein Konto?',
    a: 'Nein, ohne Konto speichert dein Gerät. Mit Konto (Kontoname und Passwort, keine E-Mail nötig) liegen deine Charaktere sicher auf dem Server – du spielst auf Handy, PC oder Tablet weiter. Post und Auktionshaus gibt es nur mit Konto.',
    k: 'konto account registrieren anmelden cloud speichern geraet wechseln login'
  },
  {
    c: 'konto', q: 'Wie viele Charaktere kann ich haben?',
    a: () => `Bis zu ${(typeof MAX_CHARS !== 'undefined') ? MAX_CHARS : 4} Charaktere. Wechseln geht über Einstellungen → „Figur und Spiel“ → „Charakter wechseln“.`,
    k: 'charaktere anzahl plaetze zweiter charakter neuer charakter wechseln'
  },
  {
    c: 'konto', q: 'Wird mein Spielstand gespeichert?',
    a: 'Ja, automatisch – zwischendurch, beim Aufstieg und beim Schließen. Mit Konto zusätzlich in der Cloud: Auf dem Startbildschirm steht dann „☁ im Konto gespeichert“.',
    k: 'speichern spielstand gespeichert verloren cloud sicherung'
  },
  {
    c: 'konto', q: 'Wie lösche ich mein Konto?',
    a: 'Einstellungen → Konto → „Konto löschen“ (oder die Seite „Konto löschen“ auf dem Startbildschirm). Du bestätigst mit Kontoname und Passwort, dann wird alles auf dem Server gelöscht – das lässt sich nicht rückgängig machen.',
    k: 'konto loeschen account delete entfernen daten'
  },

  // --- Einstellungen ----------------------------------------------------------------------------------------
  {
    c: 'einstellungen', p: 2, q: 'Was kann ich einstellen?',
    a: 'Zahnrad oben rechts oder Taste {k:opts}. Reiter: Grafik, Audio, Sprache, Steuerung, Tastenbelegung, Figur und Spiel und Konto. Alles gilt für dieses Gerät.',
    k: 'einstellungen optionen zahnrad settings menue'
  },
  {
    c: 'einstellungen', q: 'Das Spiel ruckelt oder der Akku ist schnell leer.',
    a: 'Unter Grafik: Qualität „Niedrig“ spart Akku (ohne Schatten und Gras), Bildrate „30 (Akku)“ hält das Handy kühler, und 2D statt 3D ist am sparsamsten. Ruckelt es, senkt das Spiel die Auflösung auch von selbst.',
    k: 'ruckelt lag langsam akku batterie fps grafik leistung warm'
  },
  {
    c: 'einstellungen', q: 'Kann ich zwischen 3D und 2D wechseln?',
    a: 'Ja: Einstellungen → Grafik → Ansicht 3D oder 2D. Das Spiel lädt dabei kurz neu, dein Spielstand bleibt.',
    k: '3d 2d ansicht wechseln grafik'
  },
  {
    c: 'einstellungen', q: 'Wie ändere ich die Kamera?',
    a: 'Einstellungen → Grafik → Kamera: Nah, Normal, Weit oder Schulterblick. Im Schulterblick drehst du die Kamera durch Ziehen.',
    k: 'kamera zoom weit nah schulterblick ansicht'
  },
  {
    c: 'einstellungen', q: 'Wie stelle ich die Sprache um?',
    a: () => `Einstellungen → Sprache oder der Globus oben rechts auf dem Startbildschirm. Zur Wahl: ${(typeof LANGS !== 'undefined') ? Object.values(LANGS).join(', ') : 'Deutsch und weitere'}.`,
    k: 'sprache language englisch english umstellen uebersetzung'
  },
  {
    c: 'einstellungen', q: 'Wie mache ich den Ton aus?',
    a: 'Einstellungen → Audio: Klänge, Musik und die Lautstärken. Beim Schmied gibt es zusätzlich „Ton an/aus“.',
    k: 'ton sound musik leise laut stumm audio'
  },
  {
    c: 'einstellungen', q: 'Kann ich Schadenszahlen, Namen oder das Wackeln ausschalten?',
    a: 'Ja, unter Einstellungen → Grafik: Bildschirmwackeln, Schadenszahlen, Namen der Bewohner und der eigene Lebensbalken lassen sich ein- und ausschalten.',
    k: 'schadenszahlen namen wackeln ausblenden ausschalten anzeige'
  },
  {
    c: 'einstellungen', q: 'Wie ändere ich mein Aussehen?',
    a: 'Im Charakterfenster mit „Aussehen ändern“ oder unter Einstellungen → „Figur und Spiel“. Frisur, Haar-, Haut- und Augenfarbe, Augenform und Gesichtszeichen; Mitspieler sehen dein Aussehen.',
    k: 'aussehen frisur haare gesicht aendern look'
  }
];

// Leitfaden „Erste Schritte“: Titel, kurzer Text und (wo es geht) eine Prüfung, ob der Schritt schon erledigt ist.
// done(p, q): p = Spieler, q = questState(); null = ohne Haken
const RATGEBER_SCHRITTE = [
  {
    t: 'Hauptquest annehmen',
    a: 'Sprich mit <b>{n:aeltester}</b> (goldenes „!“). Die Hauptquest führt dich durchs ganze Spiel, der goldene Pfeil zeigt den Weg.',
    done: (p, q) => !!(q && (q.main > 0 || q.accepted))
  },
  {
    t: 'Erste Monster jagen',
    a: 'Geh vor das Tor in die Sonnenwiesen: Halte {k:attack} (am Handy den Angriffsknopf). Jag Monster mit weißer oder gelber Stufe.',
    done: (p) => (p.kills || 0) > 0
  },
  {
    t: 'Statuspunkte verteilen',
    a: 'Jede Stufe gibt 2 Statuspunkte. Charakterfenster ({k:char}) öffnen und vor allem in deinen Hauptwert stecken.',
    done: (p) => p.level > 1 && !p.statPoints
  },
  {
    t: 'Fertigkeiten nutzen und steigern',
    a: 'Deine Fertigkeiten liegen auf {k:skill1} bis {k:skill5}. Jede Stufe gibt einen Fertigkeitspunkt – im Charakterfenster verteilen.',
    done: (p) => p.level > 1 && !p.skillPoints
  },
  {
    t: 'Tränke und bessere Ausrüstung',
    a: 'Tränke gibt es bei {n:haendler}, ab Stufe 5 bessere Waffen bei {n:waffen} und Rüstung bei {n:ruestung}.',
    done: (p) => Object.values(p.equipment || {}).some((it) => it && it.tier >= 1)
  },
  {
    t: 'Beim Schmied aufwerten',
    a: '{n:schmied} macht deine Ausrüstung stärker (+1, +2 …). Vorsicht: Ein Fehlschlag kann sie zerbrechen, eine Segensschriftrolle schützt.',
    done: (p) => Object.values(p.equipment || {}).some((it) => it && it.plus > 0)
  },
  {
    t: 'Seelensteine brechen',
    a: 'Ab Stufe 5 stehen Seelensteine in den Jagdgebieten (farbige Quadrate auf der Karte). Sie rufen Monster, geben aber viel Beute.',
    done: (p) => (p.stones || 0) > 0
  },
  {
    t: 'Zusammen spielen',
    a: 'Über den Server-Knopf ({k:net}) in einen Kanal, dann Gruppe, Freunde und später Gilde. Und jeden Tag die Tagesbelohnung ({k:daily}) abholen!',
    done: () => !!(game.party && game.party.members && game.party.members.length > 1)
  }
];

// Häufige Fragen auf der Startseite des Fensters (Fragen aus RATGEBER_WISSEN, genau so geschrieben)
const RATGEBER_HAEUFIG = [
  'Was ist der Sinn des Spiels?',
  'Wie verteile ich Statuspunkte?',
  'Wie funktioniert der Schmied?',
  'Wie bekomme ich ein Pferd?',
  'Welche Maps gibt es und für welche Stufe?',
  'Gibt es PvP? Was ist die Turnierarena?'
];
