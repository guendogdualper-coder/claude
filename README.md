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

## Was schon drin ist (Etappe 1 und 2)

- **4 Klassen** mit je 5 Fertigkeiten: Krieger, Ninja, Schamane, Nekromant
- **Welt** mit Dorf (Friedenszone) und vier Jagdzonen von Stufe 1 bis 27+
- **10 Monsterarten**: passive und aggressive, Nah- und Fernkämpfer, Gruppen helfen sich gegenseitig
- **Seelensteine**: rufen beim Angreifen Monsterwellen herbei und geben viel Erfahrung, Gold, Tränke und Seelensplitter
- **Fortschritt**: Erfahrung, Stufen bis 99, Fertigkeitspunkte (Fertigkeiten bis Stufe 20), 3 Statuspunkte pro Stufe für Stärke, Vitalität, Intelligenz und Geschick, Erfahrungsverlust beim Tod
- **Händler im Dorf**: Waffenhändler Goro (Waffen je Klasse), Rüstungshändlerin Mei (Rüstung, Helm, Schild, Schuhe, Gürtel), jeweils ab Lv 1, 5, 10 und 15; Händlerin Ayla für Tränke und Segensschriftrollen
- **Ausrüstung**: sechs Plätze in fünf Stufen (ab Lv 1, 5, 10, 15, 22). Die Grundausrüstung (Lv 1) gibt nur Rüstung bzw. Angriff, ab Lv 5 kommen eigene Effekte dazu: Rüstung, Vitalität, Intelligenz, Blocken, Ausweichen, Lauftempo, Regeneration, kritische Treffer. Legendäre Stufe nur als Beute, Inventar mit 20 Plätzen
- **Schmied**: verbessert Ausrüstung von +0 bis +9 mit Gold und Seelensplittern. Bis +3 kostet ein Fehlschlag nur das Material, +4 bis +6 fallen um eine Stufe zurück, ab +7 zerbricht der Gegenstand. Die Segensschriftrolle schützt davor. Bessere Waffen ändern ihre Farbe, ab +4 leuchten sie
- **Verkaufen** bei jedem Händler direkt aus dem Inventar, mit Bestätigung durch zweites Antippen
- **Boni**: Seelensteine lassen Materialien fallen, die automatisch aufgehoben werden. „Verstärkung“ fügt Ausrüstung die Boni 1 bis 4 hinzu, „Seltene Verstärkung“ den 5. Bonus, der Switcher würfelt die Boni neu, der Sternenstein gibt die besonderen Boni 6 und 7 (Fertigkeitsschaden, Grundangriffe, Leben in Prozent, Widerstand). Dazu fällt Ausrüstung bis +2
- **Stufenaufstieg** mit Lichtsäule, Ringen und aufleuchtender Figur
- Gezeichnete Figuren im Chibi-Stil mit Umriss und Schattierung, Laufanimation und Waffenschwung; Monster mit Mähnen, Reißzähnen, Flügeln, Umhängen und Runen, die im Stand atmen
- Kampfeffekte: Dreier-Kombo, Schwungspuren, Funken, große Schadenszahlen, Bildschirmwackeln und kurzes Einfrieren bei kritischen Treffern
- Fertigkeiten mit gemalten Symbolen und eigenen Effekten je Klasse (Feuer und Gold, Schatten, Türkis und Blitz, Seelengrün), Bodenspuren und Auren aktiver Buffs
- Querformat mit kompaktem Handy-Layout: alles in den Ecken, Fertigkeiten im Bogen um den Angriffsknopf, Menü als Symbolknöpfe, im Hochformat erscheint ein Hinweis zum Drehen
- Umgebung im ostasiatischen Stil: Laubbäume, Kirschbäume, Tannen, tote Bäume und Felsen je Zone, Häuser mit geschwungenen Dächern und Laternen, Steinlaternen und Brunnen im Dorf, weiche Bodenübergänge, Ufer mit Gischt. Figuren können hinter Bäume und Dächer laufen, die dann durchsichtig werden
- Steuerung per Tastatur oder Touch: schwebender Steuerknüppel auf der ganzen linken Hälfte, Knöpfe lösen beim Aufsetzen aus, damit Angriff, Tränke und Fertigkeiten gleichzeitig gehen

## Steuerung

| Taste | Aktion |
| --- | --- |
| WASD / Pfeile | Laufen |
| Leertaste halten | Angreifen, läuft automatisch zum nächsten Monster |
| 1–5 | Fertigkeiten |
| Q / E | Roter / Blauer Trank |
| Tab, Mausklick | Ziel wählen |
| I | Inventar |
| F | Mit Händlern oder dem Schmied sprechen |
| C / H / Esc | Charakter, Hilfe, Fenster schließen |

## Aufbau des Codes

Die Skripte werden in dieser Reihenfolge geladen und teilen sich ihre Variablen.

| Datei | Inhalt |
| --- | --- |
| `js/daten/klassen.js` | Klassen, Grundwerte, alle 20 Fertigkeiten |
| `js/daten/monster.js` | Monsterarten und Seelensteine |
| `js/daten/zonen.js` | Zonen mit Stufenbereichen und Monstergruppen, Waren der Händlerin |
| `js/daten/gegenstaende.js` | Ausrüstungsplätze, Gegenstandsstufen, Namen, Werte und Effekte, Boni, Materialien, Händler, Schmied-Tabelle |
| `js/welt.js` | Karte erzeugen, Kollision, Zonen abfragen |
| `js/spieler.js` | Figur, Werte, Erfahrung, Tränke, Speichern |
| `js/kampf.js` | Schadensformel, Angriffe, alle Fertigkeitsarten, Geschosse, Effekte |
| `js/gegner.js` | Monster-KI, Respawn, Seelenstein-Wellen, Skelette |
| `js/ausruestung.js` | Gegenstände, Beute, Inventar, Händler, Schmied, Symbole und die zugehörigen Fenster |
| `js/figuren.js` | Aussehen aller Figuren und Monster: Klassen in drei Blickrichtungen mit Laufanimation, Waffen, Händler, Skelette |
| `js/effekte.js` | Partikel, Schwungspuren, Treffer, Schadenszahlen, Geschosse, Bildschirmwackeln |
| `js/fertigkeiten.js` | Symbole der Fertigkeiten, Effekte je Fertigkeit, Auren aktiver Buffs |
| `js/umgebung.js` | Boden (vorgezeichnet in Blöcken), Bäume, Felsen, Häuser, Dorfschmuck und Tiefensortierung |
| `js/zeichnen.js` | Grafik auf dem Canvas und Minikarte |
| `js/oberflaeche.js` | Startbildschirm, Anzeigen, Fenster |
| `js/eingabe.js` | Tastatur, Maus, Touch |
| `js/spiel.js` | Spielzustand und Hauptschleife |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installation als App, Offline-Betrieb, App-Icons |

Neue Monster, Zonen oder Fertigkeiten lassen sich meist allein in den Dateien unter `js/daten/` ergänzen.

Prompts für Bildgeneratoren, mit denen sich Figuren und Monster im Stil des Spiels erzeugen lassen, stehen in [`docs/bild-prompts.md`](docs/bild-prompts.md).

## Nächste Etappen

1. Quests und Bossmonster
2. Mehrspieler: Server mit Node.js und WebSockets, andere Spieler sehen, Chat, Gruppen
3. Accounts und Speichern auf dem Server
