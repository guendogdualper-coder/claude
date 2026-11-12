# Brücken auf allen Karten (seit 14.76)

Wunsch des Spielers: „Überall auf jeder Map sind Brücken. Die sollen schöner werden; sie passen nicht mehr perfekt
drauf, manchmal sind zwei an verschiedenen Stellen, das sieht nicht cool aus; ein kleines Stück am Ende der Brücke ist
nicht am Boden.“

## Ursachen

1. **Ein Stück am Ende in der Luft (3D).** Der Boden wird zwischen den Kachelmitten gemittelt. Neben einer Schlucht
   (Tiefe 2,2), dem Wolkenmeer (1,7), einer Eisspalte (2,3) oder Wasser (0,5) liegt die Uferkante darum auf halber
   Tiefe – das Brückenende (auf Höhe 0) hing dort bis zu 1,1 Einheiten über dem abfallenden Ufer.
2. **„Zwei Brücken“ (3D).** Jede Brückenkachel bekam ihr eigenes Stück mit Geländer und Pfosten auf beiden Seiten. Die
   Brücken der Kartenformen sind drei Kacheln breit: Man sah drei schmale Brücken nebeneinander (Geländer innen), bei
   L-förmigen Dämmen ein Geländer quer über den Weg.
3. **Ausgefranste Enden (Raster).** Die Formen legen gerade Bänder nur über Abgrund/Wasser (`ctx.bridge`). Wo das Ufer
   schräg verläuft, enden die drei Spuren bis zu zehn Kacheln versetzt – zusammen mit 2. sah das aus wie mehrere Brücken
   an verschiedenen Stellen.
4. **Stücke, Stummel, Sackgassen (Raster).** Ein Band über eine Landzunge zerfiel in zwei Brücken (Frostgipfel,
   Totenmoor), L-Dämme hatten im Knick eine Lücke mit überstehender Spur, Basaltbrücken liefen am Kartenrand gegen den
   Wald (Feuerberg, zweimal), Bäume standen direkt vor Brückenenden, zwei Knüppeldämme lagen zwei Kacheln nebeneinander,
   Weltportale und Dungeon-Eingänge schnitten Stücke aus Dämmen heraus. In den Städten liefen im Stegdorf acht kurze
   Stege als Stummel ins Moor, in der Kanalstadt Sahra eine Kanalbrücke gegen die Wand des begehbaren Hauses.

## Änderungen

**Prüfwerkzeug** `tools/bruecken-pruefung.js` (Node + Playwright, echter Spielcode): listet je Karte jede Brücke
(zusammenhängende Brückenkacheln) mit Art, Lage, Länge × Breite und Befund: schwebend, insNichts, hindernis, luecke,
quer, zacken, aufLand, doppelt, eng, sinnlos (Erklärung im Kopf der Datei), dazu für das 3D-Bild „ohne Auflager“ und
„Geländer innen“ und die Erreichbarkeit (`mapFormReport`). `--liste` druckt jede Brücke mit Befund, `--json` speichert
alles. Läuft auch gegen einen älteren Stand (`--url`), dann mit der damaligen Zeichenrichtung.

**Raster** (`js/kartenformen.js`, `kfBridgeTidy`, aufgerufen über `mapFormBridges` am Ende von `generateWorld` nach
Weltportalen und Dungeon-Eingängen; nur Karten mit Form, nur außerhalb der Stadt, ohne Zufall):
1. Knick: die fehlende Außenecke eines L-Damms wird Brücke; eine einzelne Landkachel mitten in einer Spur wird Brücke;
   eine Spur, die im Leeren endet, reicht bis zum Land 2–4 Kacheln weiter oder wird, wo sie am Ufer entlangläuft, Land.
2. Bäume (und Felsbrocken) direkt vor einem Spurende fallen weg.
3. Brückenkopf: Spuren einer Seite, die bis 6 Kacheln (am Ufer entlang bis 10) versetzt enden, werden auf eine Linie
   gebracht – das Stück davor wird Land mit dem Boden des Ufers.
4. Sinnlose Stücke (verbinden ein Landstück nur mit sich selbst, der Weg drumherum ist kaum länger) werden Land, wenn
   sie klein sind (≤ 24 Kacheln), sonst Abgrund/Wasser; Brücken ohne Land auf einer Seite fallen weg.
5. Doppelte Brücken (gleiche beiden Landstücke, Mitte < 16 Kacheln): die kleinere fällt weg.
Eine Brücke fällt nur weg, wenn dadurch kein Land unerreichbar wird (sie berührt nur ein Landstück bzw. eine zweite
Brücke verbindet dieselben – sonst wird ab der Stadt nachgezählt). Ergebnis je Karte in `MAP_FORM_INFO.get(id).bridgeFix`.

**Städte** (`js/daten/kartenformen.js`): Stegdorf ohne die acht Stummel-Stege am Rand (die äußeren Stege enden an der
letzten Plattform), Sahra ohne die Kanalbrücke vor der Wand des begehbaren Hauses (das Viertel bleibt über die Brücke
im Westen erreichbar).

**3D** (`js/drei-welt.js`, `bridge3Tile`; die eigene Fassung für Eis- und Hängebrücke in `kartenformen.js` ist
weg): jede Kachel wird nach ihren Nachbarn gebaut –
- Belag in Laufrichtung: Holz (Bretter mit Fugen, zwei Längsbalken), Hängebrücke (Bretter mit Lücken auf Tragbalken),
  Steg/Knüppeldamm (Rundhölzer quer auf Längsbalken), Stein (dicke Platte), Eis (Platte mit hellem Rand), Licht
  (Platte mit Leuchtfuge);
- Geländer nur an Kanten zum Abgrund/Wasser, Pfosten an beiden Enden (groß) und jede zweite Kachel; innen und im Knick
  kein Geländer;
- an jeder Kante zum Land ein Auflager (Widerlager) aus Stein, Erde, Eis oder Kristall, das 0,6 Kacheln ins Land und bis
  unter die abfallende Uferkante reicht, mit Schwelle bzw. Saum an der Kante;
- darunter: Pfähle (Holz, Steg, jede zweite Kachel), Brüstung mit Stirnseite und Pfeiler jede dritte Kachel (Stein),
  Eiszapfen (Eis), Leuchtsaum (Licht);
- Hängebrücke: Pylone an den Enden, Tragseil hängt je nach Spannweite durch, ein Hänger je Kachel.
Auf Grafik „niedrig“ fallen Pfähle, Zapfen, Pfeiler und Hänger weg.

**2D** (`js/umgebung.js`): Geländer nur an Kanten zum Wasser/Abgrund (`bridgeEdges2`), eigene Farben für Eis- und
Hängebrücke.

## Messwerte

Prüfwerkzeug, alle 16 Karten (Wildnis; Stadt in Klammern), 14.73 → 14.76:

| | 14.73 | 14.76 |
|---|---|---|
| Brücken | 180 | 163 |
| mit Befund | 46 (9) | 0 (0) |
| schwebend (Spurenden) | 5 (16) | 0 |
| insNichts | 3 (9) | 0 |
| hindernis | 8 (6) | 0 |
| zacken (Brücken) | 34 | 0 |
| doppelt / sinnlos | 2 / 4 | 0 / 0 |
| 3D: Kanten zum Land ohne Auflager | 1286 | 0 |
| 3D: Geländer zwischen zwei Brückenkacheln | 7791 | 0 |

Je Karte (Raster-Reparaturen 14.76): Rostschlucht 8 Kacheln Brückenkopf, 1 Baum; Frostgipfel 26 Brückenkopf, 2 Stücke
zu Land (die „zweite Brücke“ neben der langen Eisbrücke), 1 Landbuckel; Totenmoor 90 Brückenkopf, 3 Knicke, 2 Spuren,
2 Stücke zu Land, 1 doppelter Damm weg, dazu 8 Stummel im Stegdorf; Donnerklamm 10; Feuerberg 48, 2 Brücken in den
Kartenrand weg; Kristallabgrund 60; Blutsteppe 2, 4 Bäume; Nachtfrost 29; Schattenklippen 12, 2 Bäume; Sahra 1 Brücke.

- Erreichbarkeit (`mapFormReport`): auf allen Karten 0 unerreichbar außer Kazehana (die bekannten 9 Kacheln), keine
  Leute, Tore oder Steine unerreichbar – vorher wie nachher.
- Kazehana: Raster (Boden, Objekte, Schmuck, Zonen, Schattierung), Leute und Requisiten unverändert (Hash-Vergleich);
  Kazehana hat keine Brücken.
- Welt erzeugen: das Aufräumen kostet etwa 0,1–0,2 s (gemessen unter Last, 3 Läufe), bei 2,5–4 s für die ganze Welt.
- Dreiecke je Bild: siehe Abschnitt Leistung.

## Leistung

Dreiecke je Bild (`renderer.info`, alle Zeichenaufrufe eines Bildes samt Schatten; Grafik „mittel“, Kamera 30 Einheiten
über der Brücke, gleiche Stelle, Tausend, 14.73 → 14.76):

| Stelle | 14.73 | 14.76 |
|---|---|---|
| Hängebrücke Rostschlucht | 727 | 728 |
| Eisbrücke Frostgipfel | 362 | 359 |
| Knüppeldamm Totenmoor | 613 | 456 |
| Steinbrücke Blutsteppe | 490 | 487 |
| Lichtbrücke Kristallabgrund | 711 | 687 |
| Holzbrücke Schattenklippen | 831 | 835 |
| Kanalstadt Sahra | 1183 | 1182 |
| Stegdorf (Totenmoor) | 1619 | 956 |

Innen fallen Geländer und Pfosten weg, dafür kommen Auflager, Pfähle und Seile dazu: gleich viel oder weniger, deutlich
weniger bei vielen breiten Stegen. Die Brückenteile sind wie bisher gebackene Vorlagen; nur Tragseil und Hänger der
Hängebrücke werden je Kachel gebaut (zwei Quader).

## Tests

- `node tools/bruecken-pruefung.js --url …` gegen 14.73 und 14.76 (Zahlen oben), ohne Seitenfehler.
- `mapFormReport` (läuft im Prüfwerkzeug mit): 0 unerreichbar auf allen Karten außer Kazehana (9), vorher wie nachher.
- Raster-Hash-Vergleich aller Karten: Kazehana, Dunkelwald, Ödland, Mondfall, Aschewald, Knochenwüste unverändert
  (Boden, Objekte, Schmuck, Zonen, Schattierung, Leute, Requisiten); Leute und Requisiten auf allen Karten unverändert.
- Bilder 3D je Brückenart und in vier Städten vorher/nachher (Grafik hoch, eigener Port, deviceScaleFactor 1), 2D-Bild
  der Eisbrücke (Geländer nur außen).
- `node --check` der geänderten Dateien; s73-Probe (alle 12 Charaktere ohne Fehler); tm-Probe (24 × OK, gleich wie
  14.73).

## Offen

- Die Brücken der Wege über Wasser (`tidyBridges`) gibt es auf den Karten mit Form zurzeit nicht (die Wege queren den
  Fluss über Furten); Kazehana hat keine. Sie werden in 3D und 2D genauso gebaut, die Raster-Reparatur gilt nur für
  Karten mit Form.
- Lange Hängebrücken als Abkürzung (Donnerklamm, bis 43 Kacheln) bleiben; sie sind kein „sinnloses“ Stück.
