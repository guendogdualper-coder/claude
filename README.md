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
- **Fortschritt**: Erfahrung, Stufen bis 99, Fertigkeitspunkte (Fertigkeiten bis Stufe 20), Erfahrungsverlust beim Tod
- **Händlerin** im Dorf für Rote und Blaue Tränke
- Gezeichnete Figuren im Chibi-Stil mit Umriss und Schattierung, Laufanimation und Waffenschwung
- Kampfeffekte: Dreier-Kombo, Schwungspuren, Funken, große Schadenszahlen, Bildschirmwackeln und kurzes Einfrieren bei kritischen Treffern, eigene Effekte für jede Fertigkeit
- Querformat mit Handy-Layout: Fertigkeiten im Bogen um den Angriffsknopf, im Hochformat erscheint ein Hinweis zum Drehen
- Steuerung per Tastatur oder Touch (Steuerknüppel und Knöpfe)

## Steuerung

| Taste | Aktion |
| --- | --- |
| WASD / Pfeile | Laufen |
| Leertaste halten | Angreifen, läuft automatisch zum nächsten Monster |
| 1–5 | Fertigkeiten |
| Q / E | Roter / Blauer Trank |
| Tab, Mausklick | Ziel wählen |
| F | Mit Händlerin oder Schmied sprechen |
| C / H / Esc | Charakter, Hilfe, Fenster schließen |

## Aufbau des Codes

Die Skripte werden in dieser Reihenfolge geladen und teilen sich ihre Variablen.

| Datei | Inhalt |
| --- | --- |
| `js/daten/klassen.js` | Klassen, Grundwerte, alle 20 Fertigkeiten |
| `js/daten/monster.js` | Monsterarten und Seelensteine |
| `js/daten/zonen.js` | Zonen mit Stufenbereichen und Monstergruppen, Waren der Händlerin |
| `js/welt.js` | Karte erzeugen, Kollision, Zonen abfragen |
| `js/spieler.js` | Figur, Werte, Erfahrung, Tränke, Speichern |
| `js/kampf.js` | Schadensformel, Angriffe, alle Fertigkeitsarten, Geschosse, Effekte |
| `js/gegner.js` | Monster-KI, Respawn, Seelenstein-Wellen, Skelette |
| `js/figuren.js` | Aussehen aller Figuren und Monster: Klassen in drei Blickrichtungen mit Laufanimation, Waffen, Händler, Skelette |
| `js/effekte.js` | Partikel, Schwungspuren, Treffer, Schadenszahlen, Geschosse, Bildschirmwackeln |
| `js/zeichnen.js` | Grafik auf dem Canvas und Minikarte |
| `js/oberflaeche.js` | Startbildschirm, Anzeigen, Fenster |
| `js/eingabe.js` | Tastatur, Maus, Touch |
| `js/spiel.js` | Spielzustand und Hauptschleife |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installation als App, Offline-Betrieb, App-Icons |

Neue Monster, Zonen oder Fertigkeiten lassen sich meist allein in den Dateien unter `js/daten/` ergänzen.

Prompts für Bildgeneratoren, mit denen sich Figuren und Monster im Stil des Spiels erzeugen lassen, stehen in [`docs/bild-prompts.md`](docs/bild-prompts.md).

## Nächste Etappen

3. Ausrüstung: Waffen und Rüstungen als Beute, Inventar, Schmied verbessert Gegenstände (+0 bis +9) mit Seelensplittern und Fehlschlagrisiko
4. Quests und Bossmonster
5. Mehrspieler: Server mit Node.js und WebSockets, andere Spieler sehen, Chat, Gruppen
6. Accounts und Speichern auf dem Server
