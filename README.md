# Seelenstein

Ein Rollenspiel im Browser nach dem Vorbild klassischer Grind-MMORPGs: Klasse wählen, Monster farmen, Seelensteine zerstören, Stufe um Stufe stärker werden.

## Starten

```sh
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen. Es gibt keine Abhängigkeiten und keinen Build-Schritt. Der Spielstand wird im Browser gespeichert.

## Als App aufs Handy

Seelenstein ist eine installierbare Web-App (PWA). Auf einem Webserver mit HTTPS (z. B. GitHub Pages) lässt es sich auf den Startbildschirm legen und startet dann im Vollbild, mit eigenem Icon und auch ohne Internet.

- **Android (Chrome):** Seite öffnen, Menü ⋮, „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
- **iPhone (Safari):** Seite öffnen, Teilen-Knopf, „Zum Home-Bildschirm“.

Nach einer Änderung an den Spieldateien in `sw.js` die `VERSION` erhöhen, damit installierte Apps die neuen Dateien laden.

## Was schon drin ist

- **4 Klassen mit je 2 Wegen**: Krieger, Ninja, Schamane, Nekromant. Bei der Erstellung wählst du einen Weg für Monster in Massen (PvE) oder für Zweikämpfe (PvP), jeder mit fünf eigenen Fertigkeiten, also 40 insgesamt. Buffs wie Aura des Schwertes oder Starker Körper halten zwei bis drei Minuten
- **Welt bis Stufe 70**: Dorf mit Mauer, Türmen und Toren, darum sieben Gebiete (Sonnenwiesen, Dunkelwald, Orktal, Ödland, Frostgipfel, Totenmoor, Feuerberg) mit eigenem Boden, Gewässern (Sumpf, Lava, Eis) und Stimmung (Schnee, Glühwürmchen, Asche, Funken). Monster erscheinen erst ein Stück vor der Mauer
- **24 Monsterarten**: passive und aggressive, Nah- und Fernkämpfer, Spinnen, Skorpione, Geister, Golems und Drachen, Gruppen helfen sich gegenseitig
- **14 Seelensteine** von Stufe 5 bis 70 in Fünferschritten, jeder mit eigenem Namen, Aussehen und eigener Beute (z. B. Stein der Gier: viel Gold, Stein der Stille: Sternensteine). Sie rufen beim Angreifen Monsterwellen herbei und geben viel Erfahrung, Gold, Tränke und Seelensplitter
- **Aufträge**: 20 Aufträge des Dorfältesten von Stufe 1 bis 70 mit Erfahrung, Gold, Ausrüstung und Materialien, dazu wiederholbare Jagden bei der Jägerin
- **Dorfbewohner**: Wegweiserin (Reisen in jedes Gebiet), Alchemist (Materialien), Wachen an den Toren und Leute, die umherlaufen
- **Schwierigkeit**: Monster werden ab Stufe 2 schrittweise zäher und stärker, ab Stufe 15 mit jeder Stufe weiter. Monster über der eigenen Stufe nehmen 8 % weniger Schaden je Stufe (bis −75 %) und treffen 7 % härter (bis +80 %), höhere Gebiete brauchen also gute Ausrüstung. Ab Stufe 10 braucht jede Stufe 40 % mehr Erfahrung
- **Map 2 und Map 3** über das Weltentor in Hayan: Schlangental (Stufe 30–50, Sandschlangenwüste mit Sandvipern, Klapperschlangen und Königskobras, Nagadschungel mit Riesenpythons, Naga-Kriegern und Naga-Priesterinnen) und Donnerklamm (Stufe 50–75, Trollkrieger, Harpyien, Minotauren, Steintitanen, Gargoyles, Donnerriesen), je mit sicherem Lager, Weltentor zurück und eigenen Seelensteinen
- **Tränke S bis XXL** (35 % bis 100 %), automatisch passende Größe beim Trinken, größere Tränke als Beute in höheren Gebieten
- **Vergleich mit der angelegten Ausrüstung**: Pfeile ▲/▼ auf den Kacheln, einzelne Werte grün/rot im Inventar, beim Schmied und bei den Händlern; der Schmied zeigt die Figur mit der angelegten Ausrüstung und die Tasche getrennt
- **Seelensteine in Dungeons**: je zwei Steine pro Dungeon, kommen nach 25–40 s wieder
- **Server und Kanäle (online)**: Beim Start Server-Auswahl wie bei Metin2, Server ERFOO (Testserver) mit Kanal 1 und Kanal 2, bis zu 8 Spieler pro Kanal, jeder mit seiner eigenen Figur. Kein eigener Rechner nötig: Die Geräte verbinden sich direkt per WebRTC (PeerJS mit öffentlichem Vermittlungs- und Relay-Server). Wer einen leeren Kanal betritt, führt dessen Welt (Host); geht er oder legt die App in den Hintergrund, übernimmt automatisch ein anderer Spieler, der Kanal ist also immer erreichbar. Der Host führt Monster, Steine und Bosse; Mitspieler schicken Position und Treffer und bekommen zehnmal pro Sekunde den Stand in ihrer Nähe. Erfahrung und Beute für jeden, der mitkämpft oder in der Nähe ist. Mitspieler mit Namen, Lebensbalken und grünem Punkt auf der Minikarte, Chat mit Sprechblasen, Einladungslink `?server=erfoo&kanal=1`
- **Missionen**: Hauptmissionen golden, Nebenmissionen grün (Ausrufezeichen über Personen, Auftragsliste, Minikarte)
- **Stallmeister Jun** (ab Stufe 30): Hauptmission mit Zeitlimit, 120 Monster ab Stufe 25 in 20 Minuten; Belohnung ein eigenes Pferd (60 % schneller, Taste R oder Pferdeknopf, man steigt beim Angreifen ab)
- **Dungeons mit Bossen**: Spinnenhöhle (ab 18), Orkfestung (ab 28), Eisgrotte (ab 45), Drachenhort (ab 63) in einem eigenen Kartenstreifen, Eingänge neben den Wegen und auf der Minikarte. Je drei Räume mit eigenen Monstern und ein Boss (Spinnenkönigin, Kriegsherr Gor'thak, Eiskönig Hrim, Urdrache Vharak) mit angekündigtem Stampfer, Geschoss-Salven und Verstärkung; Bossbalken oben, Beute: zwei Teile +3 bis +6, Bücher, Schmiede-Teile, Materialien, Gold; Boss kommt nach 10 Minuten wieder
- **Freier Angriff**: Angriff und Fertigkeiten gehen auch ohne Gegner in der Nähe, in Blickrichtung (Vorbereitung für PvP)
- **Fortschritt**: Erfahrung, Stufen bis 99, Fertigkeitspunkte (Fertigkeiten bis Stufe 20), 3 Statuspunkte pro Stufe für Stärke, Vitalität, Intelligenz und Geschick, Erfahrungsverlust beim Tod
- **Händler im Dorf**: Waffenhändler Goro (Waffen je Klasse), Rüstungshändlerin Mei (Rüstung, Helm, Schild, Schuhe, Gürtel), jeweils ab Lv 1, 5, 10 und 15; Händlerin Ayla für Tränke und Segensschriftrollen
- **Ausrüstung je Klasse**: Waffe, Rüstung und Helm gehören immer zu einer Klasse, Schild, Schuhe und Gürtel kann jeder tragen. Zwei Waffenarten je Klasse mit eigenem Schaden und Tempo: Schwert oder Zweihänder, Dolche oder Bogen (Fernkampf), Fächer oder Glocke, Stab oder Sense; Fächer, Glocken, Stäbe und Sensen geben Magiestärke für Fertigkeiten. Jede Stufe sieht anders aus, auch an der Figur (Rüstungsfarbe, Brustplatte, Hörner, Flügelhelm, Kronen)
- **Ausrüstung**: acht Plätze in acht Stufen (ab Lv 1, 5, 10, 15, 22, 30, 45, 60). Ab Lv 30 gibt es sie nur in den hohen Gebieten oder von Seelensteinen ab Stufe 20 Die Grundausrüstung (Lv 1) gibt nur Rüstung bzw. Angriff, ab Lv 5 kommen eigene Effekte dazu: Rüstung, Vitalität, Intelligenz, Blocken, Ausweichen, Lauftempo, Regeneration, kritische Treffer. ab Lv 22 nur als Beute, Tasche mit vier Seiten zu je 20 Plätzen
- **Schmied**: verbessert Ausrüstung von +0 bis +20 mit Gold und Seelensplittern. Ab +6 (bei Ausrüstung ab Lv 30 schon ab +4) braucht er zusätzlich Teile von Monstern, die sie selten fallen lassen: Hundezahn, Wolfspelz, Banditenabzeichen bis zur Drachenschuppe. Bis +3 kostet ein Fehlschlag nur das Material, +4 bis +6 fallen um eine Stufe zurück, ab +7 zerbricht der Gegenstand. Die Segensschriftrolle schützt davor. Bessere Waffen ändern ihre Farbe, ab +4 leuchten sie
- **Inventar** mit Figur, die Waffe und Schild trägt; leere Ausrüstungsplätze zeigen ein blasses Symbol
- **Verkaufen** nur bei einem Händler (auch Schmied und Alchemist): „Mehrere verkaufen“ in der Tasche, Sachen antippen oder mit „Ganze Seite“ bzw. „Nicht nutzbar“ automatisch auswählen und auf einmal verkaufen
- **Boni**: Seelensteine lassen Materialien fallen, die automatisch aufgehoben werden. „Verstärkung“ fügt Ausrüstung die Boni 1 bis 4 hinzu, „Seltene Verstärkung“ den 5. Bonus, der Switcher würfelt die Boni neu, der Sternenstein gibt die besonderen Boni 6 und 7 (Fertigkeitsschaden, Grundangriffe, Leben in Prozent, Widerstand). Dazu fällt Ausrüstung bis +2
- **Stufenaufstieg** mit Lichtsäule, Ringen und aufleuchtender Figur
- Gezeichnete Figuren im Chibi-Stil mit Umriss und Schattierung, Laufanimation und Waffenschwung; Monster mit Mähnen, Reißzähnen, Flügeln, Umhängen und Runen, die im Stand atmen
- Kampfeffekte: Dreier-Kombo, Schwungspuren, Funken, große Schadenszahlen, Bildschirmwackeln und kurzes Einfrieren bei kritischen Treffern
- Fertigkeiten mit gemalten Symbolen und eigenen Effekten je Klasse (Feuer und Gold, Schatten, Türkis und Blitz, Seelengrün), Bodenspuren und Auren aktiver Buffs
- Querformat mit kompaktem Handy-Layout: alles in den Ecken, Fertigkeiten im engen Bogen um den Angriffsknopf (mit Ring, Stufenplakette, Abklingzeit als Zeiger und Aufleuchten, sobald sie bereit sind), Menü als Symbolknöpfe, im Hochformat erscheint ein Hinweis zum Drehen
- **Beute**: alles Aufgehobene erscheint unten rechts mit Symbol und Anzahl; der Beute-Knopf (Taste B) öffnet ein Fenster mit allem, was du aufgehoben hast, und den Weg in den Rucksack
- **Buffs** als Symbole unter den Balken, mit Ring und Restzeit; jeder Buff ist auch an der Figur zu erkennen (Blitze beim Kampfrausch, goldener Kreis bei der Aura des Schwertes, Heiligenschein beim Segen und so weiter)
- **Fertigkeitsränge**: Stufe 1–17 mit Punkten, ab Stufe 15 Erwecken (E1–E10), danach mit Fertigkeitsbüchern Heroisch (H1–H10), Legendär (L1–L10) und Vollendet (V). Jede Stufe erhöht Schaden, Buff-Werte und Buff-Dauer, das Charakterfenster zeigt die Werte jetzt und für die nächste Stufe. Jeder Rang gibt einen zusätzlichen Sprung und sieht wuchtiger aus. Auf Stufe 17 erweckt ein Tipp auf das blaue „E“ die Fertigkeit direkt zu E1
- **Fertigkeitsbücher je Fertigkeit**: Jeder Seelenstein kann Bücher zu allen 40 Fertigkeiten aller Klassen fallen lassen, gestapelt in der Tasche. Für Lesen und Rangaufstieg zählen nur Bücher der jeweiligen Fertigkeit, fremde verkauft man
- **Fertigkeiten tauschen**: lange auf eine Fertigkeit drücken, dann auf einen anderen Platz ziehen oder tippen; die Tasten 1–5 folgen den Plätzen
- **Laufende Buffs** sind an ihrer Fertigkeit markiert: ein Lichtring läuft um den Knopf, darüber steht die Restzeit
- **Buffs je Rang**: Kampfrausch zeigt bis Stufe 17 nur einzelne kurze Blitze, mit jedem Rang mehr und längere; die Aura des Schwertes legt eine leuchtende Energieklinge um das Schwert, die mit jedem Rang wächst
- **Tränke**: Drachenblut (Leben, bauchige Flasche mit Wachssiegel) und Mondtau (Mana, Kristallflasche mit Mondsichel), mit eigenem Effekt beim Trinken
- **Schild oder Zweihand**: Zweihänder, Bogen und Sense brauchen beide Hände; Blocken gibt es nur mit Schild. Schilde trägt nur der Krieger, Zweihänder nur der Weg des Leibes
- **Beidhändig** (Krieger, Weg der Klinge, ab Stufe 30, bei Goro für 20.000 Gold): zweites Schwert in der Nebenhand, 30 % seines Angriffs, +5 % Tempo, Boni zur Hälfte, kein Blocken
- **Ultimative Attacken** ab Stufe 30, eine je Weg, 3 Minuten Abklingzeit, goldener Knopf und Taste 6: Klingenhimmel (Geisterschwerter fallen vom Himmel), Titanenzorn (Sprung mit Erdriss und Titanenhaut), Schattentanz (Sprünge zu bis zu 8 Gegnern), Todesmal (Hinrichtung eines Ziels), Drachensturm (Meteorregen), Himmelssegen (Heilung, Schutz und Lichtsäulen), Seelenernte (Seelenstrudel, der Gegner zusammenzieht), Knochenkerker (drei Ringe aus Knochenspießen mit Lebensraub). Mitspieler sehen sie auch
- **Acht Ausrüstungsplätze**: dazu Schultern und Umhang. Jedes Teil ist an der Figur zu sehen: Stiefel, Gürtel mit Schnalle, Schulterpanzer (ab Drache mit Dornen, ab Himmel mit Federn), der Umhang weht beim Laufen und trägt ab Drache ein Wappen
- **Grafik 3.2**: Schlagschatten aller Figuren nach unten rechts, Licht von oben links mit hellem Saum an jeder Figur, Atmen im Stand, Vorlehnen beim Laufen
- **Glitzern ab +8**: starke Ausrüstung funkelt an der Figur und im Inventar
- **Lebensbalken** mit rundem Bild der Figur, schrägem Messingrahmen, Herz und Tropfen, flüssiger Füllung mit wanderndem Glanz; bei wenig Leben schlägt das Herz. Lebensraub erscheint als grüne Zahl
- **Attacken**: Schwertwirbel und Wirbelklinge lassen die eigene Waffe als leuchtende Riesenklinge um die Figur kreisen, Schwünge haben spitz zulaufende Leuchtschweife und eine Geisterklinge
- **Grafik**: weiche Schatten, ziehende Wolkenschatten, warmes Licht von oben links und dunklere Bildränder
- Umgebung im ostasiatischen Stil: Laubbäume, Kirschbäume, Tannen, tote Bäume und Felsen je Zone, Häuser mit geschwungenen Dächern und Laternen, Steinlaternen und Brunnen im Dorf, weiche Bodenübergänge, Ufer mit Gischt. Figuren können hinter Bäume und Dächer laufen, die dann durchsichtig werden
- Steuerung per Tastatur oder Touch: schwebender Steuerknüppel auf der ganzen linken Hälfte, Knöpfe lösen beim Aufsetzen aus, damit Angriff, Tränke und Fertigkeiten gleichzeitig gehen

## Steuerung

| Taste | Aktion |
| --- | --- |
| WASD / Pfeile | Laufen |
| Leertaste halten | Angreifen, läuft automatisch zum nächsten Monster |
| 1–5 | Fertigkeiten |
| 6 | Ultimative Attacke (ab Stufe 30) |
| Q / E | Drachenblut (Leben) / Mondtau (Mana) |
| Tab, Mausklick | Ziel wählen |
| I | Inventar |
| B | Beute |
| F | Mit Händlern oder dem Schmied sprechen |
| C / H / Esc | Charakter, Hilfe, Fenster schließen |

## Aufbau des Codes

Die Skripte werden in dieser Reihenfolge geladen und teilen sich ihre Variablen.

| Datei | Inhalt |
| --- | --- |
| `js/daten/klassen.js` | Klassen, Grundwerte, zwei Wege mit je fünf Fertigkeiten |
| `js/daten/monster.js` | Monsterarten, die 14 Seelensteine und ihre Beute |
| `js/daten/zonen.js` | Zonen mit Stufenbereichen und Monstergruppen, Waren der Händlerin |
| `js/daten/quests.js` | Aufträge des Dorfältesten, Waren des Alchemisten, Gespräche |
| `js/daten/gegenstaende.js` | Ausrüstungsplätze, Gegenstandsstufen, Namen, Werte und Effekte, Boni, Materialien, Händler, Schmied-Tabelle |
| `js/welt.js` | Karte erzeugen, Kollision, Zonen abfragen |
| `js/spieler.js` | Figur, Werte, Erfahrung, Tränke, Speichern |
| `js/kampf.js` | Schadensformel, Angriffe, alle Fertigkeitsarten, Geschosse, Effekte |
| `js/gegner.js` | Monster-KI, Respawn, Seelenstein-Wellen, Skelette |
| `js/netz.js` | Mehrspieler: Server und Kanäle, Übernahme des Kanals, Abgleich von Spielern und Monstern, Chat |
| `js/peerjs.min.js` | PeerJS (MIT-Lizenz) für die Verbindung, wird erst beim Mehrspieler geladen |
| `js/ausruestung.js` | Gegenstände, Beute, Inventar, Händler, Schmied, Symbole und die zugehörigen Fenster |
| `js/figuren.js` | Aussehen aller Figuren und Monster: Klassen in drei Blickrichtungen mit Laufanimation, Waffen, Händler, Skelette |
| `js/effekte.js` | Partikel, Schwungspuren, Treffer, Schadenszahlen, Geschosse, Bildschirmwackeln |
| `js/fertigkeiten.js` | Symbole der Fertigkeiten, Effekte je Fertigkeit, Auren aktiver Buffs |
| `js/ultimativ.js` | Ultimative Attacken ab Stufe 30: Ablauf, Symbole und Effekte |
| `js/umgebung.js` | Boden (vorgezeichnet in Blöcken), Bäume, Felsen, Häuser, Dorfschmuck und Tiefensortierung |
| `js/zeichnen.js` | Grafik auf dem Canvas und Minikarte |
| `js/oberflaeche.js` | Startbildschirm, Anzeigen, Fenster |
| `js/quests.js` | Aufträge, Jagden, Reisen, Alchemist, umherlaufende Dorfbewohner |
| `js/eingabe.js` | Tastatur, Maus, Touch |
| `js/spiel.js` | Spielzustand und Hauptschleife |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installation als App, Offline-Betrieb, App-Icons |

Neue Monster, Zonen oder Fertigkeiten lassen sich meist allein in den Dateien unter `js/daten/` ergänzen.

Prompts für Bildgeneratoren, mit denen sich Figuren und Monster im Stil des Spiels erzeugen lassen, stehen in [`docs/bild-prompts.md`](docs/bild-prompts.md).

## Nächste Etappen

1. Bossmonster
2. Mehrspieler und echte Zweikämpfe für die PvP-Wege: Server mit Node.js und WebSockets, andere Spieler sehen, Chat, Gruppen
3. Accounts und Speichern auf dem Server
