# Leistung: viele Monster und Fertigkeiten (Messung und Maßnahmen)

Auftrag: `docs/prompt-leistung.md`. Gemessen in Headless-Chromium mit Software-Grafik (SwiftShader) auf einer stark
ausgelasteten Maschine (4 Kerne, Systemlast 10–30 durch parallele Läufe). **Absolute Zeiten sind darum viel höher und
stark gestreut** (einzelne Bilder von 250 ms tauchen vorher wie nachher zufällig auf). Belastbar sind die Zähler
(Zeichenaufrufe, Dreiecke, Texturen, Geometrien, Programme, angelegter Speicher) und die Verhältnisse.

Werkzeuge:

- `tools/leistung-test.js` – Abnahme-Messung mit echter Bildwiederholung (requestAnimationFrame, keine virtuelle Uhr):
  je Klasse „leer“, „30 Monster“, „30 Monster + alle Fertigkeiten dreimal“; Bild Ø / 95 % / schlechtestes, Rechenzeit
  im Spieltakt, Zeichenaufrufe, Dreiecke, Texturen, Geometrien, Programme, Speicherbereinigungen (`performance.memory`).
  `node tools/leistung-test.js [--klassen …] [--grafik plus] [--handy] [--groesse 960x540] [--root <ordner>] [--json datei]`
- Zusätzlich (nicht im Repo) Läufe mit virtueller Uhr: Chrome-CPU-Profil (`Profiler.start/stop`), Heap-Stichproben
  (`HeapProfiler.startSampling`), Zähler je Bild, Zählung der Effektteile nach Art, Bildvergleiche.

## Was der Profiler als Ursache gezeigt hat

1. **Fertigkeiten: tausende Zeichenaufrufe je Bild.** Im Kampf mit 30 Orks (alle Fertigkeiten, Rang-Effekte an jedem
   Treffer) zeichnete jedes Licht-Sprite und jedes Blitz-Stück einzeln: Spitze **5.434 (Krieger), 5.429 (Ninja),
   7.981 (Schamane), 2.471 (Nekromant), 6.878 (Magier)** Aufrufe je Bild – davon 3.000–4.900 additive Sprites
   (Funken, Glut, Sterne) und 1.300–2.600 additive Stäbe (Blitze, Strahlen). Jeder Aufruf mit eigener Material- und
   Programmprüfung in three.js. Das ist der Hänger „Mobs pullen und Fähigkeiten draufmachen“ – auf einer schnellen
   Grafikkarte ebenso, denn die Kosten liegen auf dem Prozessor. Dazu bekam jedes Effektteil eine eigene Geometrie
   (2.919 Geometrien im Kampf).
2. **Speicherbereinigung:** 1,2 MB neuer Speicher je Bild schon ohne Kampf, 6,0 MB im Kampf (Magier). Größte Quellen:
   `game.monsters.filter(...)` kopierte **jedes Bild alle ~7.200 Monster**, wodurch sich auch das Gebietsverzeichnis
   (`monsterIndex`) jedes Bild neu aufbaute (gedacht war alle 2 s); `THREE.Color.set('#…')` zerlegte Farb-Zeichenketten
   mit regulären Ausdrücken (Lichter, Effekte, hundertfach je Bild); Wechsel der Textur an Effektteilen setzte
   `needsUpdate` und löste jedes Bild die volle Programmprüfung aus (`getParameters`, `getProgramCacheKey`).
3. **Erstes Auftauchen:** 30 neue Figuren (Skelett, drei Materialien, Shader-Prüfung) entstanden in einem einzigen Bild.
4. **Schleifen über alle Monster der Welt:** Figuren, Namen, Zustandsanzeigen und Vorwärmen gingen jedes Bild alle
   ~7.200 Monster durch (im Profil ≈ 1,7 ms je Bild allein für die Sichtprüfung).
5. **Monstermodelle:** ein Ork ≈ 12.100 Dreiecke, dazu der Umriss mit noch einmal 12.100, Schattenmodell 3.100,
   Gesicht, Leuchten – 7 Zeichenaufrufe je Ork, einer davon das nie leuchtende Waffenleuchten.
6. **„Eine Textur je Monster“** ist keine Namensschild-Textur, sondern die Knochen-Textur des Skeletts (8×8 Gleitkomma,
   1 KB, three.js r128). Kein Hänger-Grund; siehe „bewusst nicht gemacht“.

## Maßnahmen

| # | Maßnahme | Datei |
|---|---|---|
| 1 | Additive Sprites gebündelt: alle in einem Aufruf je Textur (InstancedBufferGeometry, gleicher Shader-Inhalt wie SpriteMaterial; Licht addiert sich, die Reihenfolge ändert nichts) | `js/drei-fx.js` |
| 2 | Additive Stäbe, Wände, Scheiben, Kegel gebündelt (InstancedMesh je Form/Textur/Seite, Farbe × Deckkraft je Teil) | `js/drei-fx.js` |
| 3 | Feste Effekt-Formen geteilt statt je Teil eine eigene Geometrie | `js/drei-fx.js` |
| 4 | Texturwechsel an Effektteilen ohne `needsUpdate` (nur bei „Textur ja/nein“) | `js/drei-fx.js` |
| 5 | Farb-Zeichenketten gemerkt (`THREE.Color.setStyle`) | `js/drei-kern.js` |
| 6 | Monsterliste nur neu, wenn wirklich eines wegfällt (kein 7.200er-Kopieren je Bild, Gebietsverzeichnis wieder alle 2 s) | `js/gegner.js` |
| 7 | Nur Monster der Gebiete in der Nähe durchgehen (`v3Monsters`, Rechteck je Gebiet + größte Verfolgungsstrecke) | `js/drei-kern.js`, `js/drei-figuren.js`, `js/drei-fx.js` |
| 8 | Höchstens 6 neue Monsterfiguren je Bild (aus dem Vorrat zählt nicht), Name/Balken erst mit der Figur | `js/drei-figuren.js`, `js/drei-kern.js` |
| 9 | Gesicht und Körper in einem Aufruf (Umriss weiter nur über den Körper, gemeinsame Daten), Waffenleuchten erst sichtbar, wenn es leuchtet | `js/drei-figuren.js`, `js/nekro-totenruf.js` |
| 10 | Vereinfachtes Monstermodell, wenn die Figur im Bild unter 170 Bildpunkte hoch ist: kleine Teile mit halb so vielen Unterteilungen, große Teile (Rumpf, Kopf, Ringe, Platten) bleiben voll; gebaut beim Vorwärmen | `js/drei-kern.js`, `js/drei-figuren.js` |

## Ergebnisse

### 1. Abnahme-Messung `tools/leistung-test.js` (echte Bildwiederholung)

960×540, Grafik „Ultra“, normale Kamera, 30 Orks, 90 Bilder je Lage, je Zelle **vorher (14.24) → nachher**.
Software-Grafik: die Bildzeiten sind vom Rastern (Pixel, Dreiecke) bestimmt und rund 50–100× länger als auf einer
echten Grafikkarte; „Rechnen“ ist die Zeit im Spieltakt `frame()` (inklusive Warten auf die Grafik), „GC-Pausen“ zählt
Sprünge im JS-Speicher und streut stark.

| Klasse | Lage | Bild Ø (ms) | 95 % (ms) | schlechtestes (ms) | Rechnen Ø (ms) | Zeichenaufrufe | Dreiecke | Texturen | Geometrien | GC-Pausen |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| krieger | leer | 566 → 196 | 1150 → 367 | 1550 → 433 | 13.9 → 6.3 | 40 → 37 | 96.938 → 91.266 | 22 → 24 | 63 → 57 | 12 → 12 |
| krieger | 30 Orks | 1526 → 592 | 3466 → 1267 | 4700 → 1566 | 21.3 → 12.5 | 287 → 214 | 1.058.699 → 704.342 | 54 → 56 | 91 → 96 | 15 → 16 |
| krieger | + Fertigkeiten 3× | 1992 → 769 | 9416 → 1683 | 23349 → 15083 | 1400.1 → 182.5 | 2462 → 212 | 726.645 → 430.221 | 61 → 63 | 2182 → 253 | 24 → 30 |
| krieger | Erscheinen (1. Bild) | | | 450 → 200 | 32.2 → 29.5 | | | | | |
| ninja | leer | 378 → 187 | 767 → 367 | 950 → 383 | 10.0 → 5.8 | 44 → 37 | 98.358 → 76.762 | 26 → 24 | 70 → 61 | 27 → 16 |
| ninja | 30 Orks | 1648 → 597 | 3500 → 1350 | 4400 → 1383 | 27.8 → 11.5 | 292 → 218 | 1.059.075 → 697.862 | 57 → 55 | 103 → 89 | 16 → 20 |
| ninja | + Fertigkeiten 3× | 1490 → 550 | 2417 → 1533 | 44215 → 13683 | 605.3 → 77.8 | 1438 → 161 | 368.545 → 284.488 | 63 → 61 | 2330 → 377 | 37 → 29 |
| ninja | Erscheinen (1. Bild) | | | 550 → 183 | 36.4 → 28.2 | | | | | |
| schamane | leer | 565 → 191 | 1217 → 350 | 1700 → 400 | 12.9 → 6.3 | 45 → 43 | 89.152 → 83.130 | 25 → 25 | 72 → 68 | 17 → 15 |
| schamane | 30 Orks | 1548 → 607 | 4166 → 1417 | 4716 → 1450 | 23.3 → 12.8 | 292 → 223 | 1.050.772 → 699.321 | 57 → 56 | 102 → 100 | 13 → 30 |
| schamane | + Fertigkeiten 3× | 1948 → 755 | 7050 → 1483 | 41382 → 13266 | 1317.3 → 255.1 | 2297 → 179 | 336.716 → 280.016 | 63 → 61 | 3567 → 441 | 30 → 35 |
| schamane | Erscheinen (1. Bild) | | | 467 → 200 | 65.4 → 27.2 | | | | | |
| nekromant | leer | 424 → 237 | 767 → 450 | 950 → 533 | 9.0 → 5.6 | 44 → 41 | 93.196 → 114.990 | 26 → 24 | 70 → 65 | 18 → 12 |
| nekromant | 30 Orks | 1385 → 649 | 3333 → 1450 | 4283 → 1633 | 21.1 → 11.8 | 291 → 222 | 1.054.668 → 736.306 | 57 → 55 | 102 → 91 | 22 → 17 |
| nekromant | + Fertigkeiten 3× | 1102 → 921 | 6050 → 1900 | 17966 → 16733 | 770.2 → 204.3 | 3037 → 413 | 824.884 → 670.946 | 72 → 70 | 4095 → 366 | 32 → 29 |
| nekromant | Erscheinen (1. Bild) | | | 450 → 267 | 35.9 → 42.0 | | | | | |
| magier | leer | 194 → 184 | 350 → 333 | 367 → 383 | 7.5 → 5.8 | 45 → 40 | 100.248 → 74.078 | 24 → 24 | 70 → 63 | 4 → 15 |
| magier | 30 Orks | 790 → 597 | 1833 → 1400 | 1950 → 1467 | 14.9 → 11.5 | 292 → 221 | 1.061.320 → 695.397 | 55 → 55 | 100 → 91 | 15 → 37 |
| magier | + Fertigkeiten 3× | 755 → 635 | 3100 → 1433 | 18533 → 14350 | 521.8 → 171.5 | 2395 → 266 | 500.932 → 403.748 | 65 → 65 | 2899 → 423 | 26 → 30 |
| magier | Erscheinen (1. Bild) | | | 133 → 183 | 31.8 → 30.7 | | | | | |

Die übrig gebliebenen sehr langen Einzelbilder im Kampf (13–17 s) sind in beiden Fassungen da und kommen vom Füllen
großer, sich überlagernder Leuchtflächen in der Software-Grafik (gleich viele Bildpunkte wie vorher, auf einer
Grafikkarte im Bereich weniger Millisekunden); neue Shader-Programme entstehen im Kampf keine (geprüft für alle Klassen).

Handy-Profil (844×390, 2-fach, Touch, Grafik „Mittel“, Magier/Krieger, 60 Bilder): Zeichenaufrufe im Kampf
2.965 → 324 bzw. 2.855 → 241, Dreiecke mit 30 Orks 1,03 Mio. → 0,72 Mio.; Bildzeiten innerhalb der Streuung (die
Maschine war bei diesem Lauf stark ausgelastet) – kein Rückschritt.

### 2. Zähler je Bild mit virtueller Uhr (Magier, 960×540, vorher 14.16 → nachher)

JS = Rechenzeit ohne Warten auf die Grafik (aus dem CPU-Profil), GC = Speicherbereinigung, Speicher = neu angelegter
JS-Speicher (Heap-Stichproben).

| Lage | Zeichenaufrufe | Dreiecke | Texturen | Geometrien | JS je Bild | GC je Bild | Speicher je Bild |
|---|---:|---:|---:|---:|---:|---:|---:|
| leer | 43 → 43 | 120.030 → 120.030 | 7 → 7 | 37 → 37 | 8,7 → 4,0 ms | 3,5 → 0,1 ms | 1.193 → 440 KB |
| 30 Orks erscheinen (1. Bild) | 253 → 73 (6 Figuren je Bild) | 986.494 → 228.546 | 37 → 13 | 52 → 49 | 33,6 → 32,2 ms | – | 4.725 → 2.743 KB |
| Bild 2–10 danach | 253 → 173 | 986.494 → 589.973 | 37 → 37 | 52 → 49 | 15,1 → 10,9 ms | 2,9 → 0,2 ms | 1.540 → 1.239 KB |
| 30 Orks (60 Bilder) | 257 → 197 | 986.581 → 662.349 | 39 → 39 | 61 → 61 | 37,5 → 27,3 ms | 2,5 → 6,8 ms* | 1.728 → 1.154 KB |
| + Fertigkeiten (90 Bilder) | **3.724 → 321** | 748.531 → 527.587 | 47 → 47 | **2.919 → 267** | **126,5 → 35,4 ms** | **16,6 → 3,8 ms** | **6.230 → 2.346 KB** |

\* GC-Zeit in kurzen Fenstern streut (fällt an, wann sie anfällt); der angelegte Speicher ist die verlässliche Größe.
Heap-Profil Kampf (60 Bilder, Magier): **6,0–6,3 MB → 2,5 MB** neuer Speicher je Bild.

Spitze der Zeichenaufrufe im Kampf (30 Orks, alle Fertigkeiten, höchster Wert eines Bildes, 14.16 → nachher):
Krieger 5.434 → 394, Ninja 5.429 → 548, Schamane 7.981 → 470, Nekromant 2.471 → 495, Magier 6.878 → 518.

Erscheinen von 30 Orks, Rechenzeit der ersten Bilder (Modelle vorgewärmt, Figuren neu; zwei Läufe):
vorher 109, 70, 79, 54, **260**, 125, 34 ms bzw. 76, **249**, 13 … → nachher 39, 23, 14, 11, 20, 25, 15 ms bzw.
27, 19, 14, 5, 18 … ms. Schlechtestes Bild beim Erscheinen damit **≈ 250 → ≤ 40 ms** (auf dieser langsamen Maschine).

Monstermodell Ork: 12.100 Dreiecke (+ 12.100 Umriss) → vereinfacht 7.500 (+ 7.200 Umriss), 7 → 5 Zeichenaufrufe.

### 3. Aussehen (Bildvergleich, deviceScaleFactor 1, 960×540, vorher 14.24 → nachher)

Monster aller zehn Karten (normale Kamera, also mit vereinfachtem Modell), je Karte eine Art nah im Schulterblick
(volles Modell) und je Klasse eine Fertigkeit auf eine Ork-Gruppe. Abweichung: mittlerer Unterschied je Farbkanal
(0–255) und Anteil der Bildpunkte, die um mehr als 16 bzw. 48 abweichen.

| Bild | mittlere Abweichung | > 16 | > 48 |
|---|---:|---:|---:|
| Karten 1–10, 12 Bilder mit je 3–6 Monsterarten | 0,10 – 0,79 | 0,25 – 1,14 % | 0,11 – 0,77 % |
| nah im Schulterblick, 10 Arten | 0,02 – 0,17 | 0,02 – 0,18 % | 0,01 – 0,15 % |
| Fertigkeit Krieger / Ninja / Schamane / Nekromant / Magier | 0,31 / 1,46 / 0,38 / 0,19 / 0,13 | 0,71 / 2,21 / 1,01 / 0,67 / 0,52 % | 0,29 / 1,57 / 0,38 / 0,23 / 0,14 % |

Die Abweichungen sitzen an feinen Kanten kleiner Teile (Krallen, Zähne, Schnallen), an zufälligen Schneeflocken und
Funken (anderer Zufallsverlauf beim Zeichnen) und beim Ninja an der Pose eines getroffenen Orks und der Reihenfolge
additiver Leuchtflecken gegenüber normal gemischten Flammen. Auch in doppelter Vergrößerung sehen Monster und Effekte
gleich aus; Umriss, Rumpf, Kopf und Leuchtringe sind unverändert (große Teile bleiben im vereinfachten Modell voll).

### 4. Spielverhalten

- Laufweg in 2 s, Abklingzeit nach 1 s und Schaden von 4 s Grundangriff bei 60/120/144 Bildern (Zufall gesät,
  Kampfzufall fest): **identisch** vorher/nachher in 2D und in 3D (dort ohne Zeichnen, weil das Zeichnen selbst
  Zufallszahlen verbraucht). Laufweg 279,8 bei allen Bildraten, Abklingzeit 2,05/2,042/2,042 s.
- Mehrspieler: keine Nachricht geändert (`js/netz.js` unberührt).
- Rauchtests s72 (2D und 3D: Auktion, Post, Arena, Lager, Händler) und s73 (alle 12 Wege, alle Fertigkeiten,
  Segen): grün, keine Seitenfehler.
- Balance-Sim (`--stufen 20,50,80 --ausr std --kurz --ohne-farm`): Gesamtwertung je Weg innerhalb der Streuung
  zweier Läufe derselben Fassung (±1–3, einzelne Zellen wie Falke L80 schwanken auch ohne Änderung um bis zu 19).
  14.25 vorher → nachher (Ø): Klinge 102/103, Leib 96/96, Dolch 106/106, Falke 95/97, Drache 91/91, Heilung 82/82,
  Seelen 92/92, Knochen 100/101, Feuer 97/98, Frost 121/122, Blitz 94/94, Erde 90/90.

## Ziele aus dem Auftrag

| Ziel | Ergebnis |
|---|---|
| schlechtestes Bild beim Erscheinen von 30 Monstern ≤ 50 ms | erreicht für die Rechenzeit (≈ 250 → ≤ 40 ms auf dieser langsamen Maschine; 6 neue Figuren je Bild) |
| 95-%-Wert im Kampf halbiert | erreicht bei Krieger, Schamane, Nekromant, Magier (−54 … −82 %), Ninja −37 % |
| Dreiecke mit 30 Monstern ≤ 300.000 | **nicht** erreicht: 1,06 Mio. → 0,70 Mio. (bewusst – siehe unten) |
| Texturen wachsen nicht mehr je Monster | **nicht** umgesetzt (siehe unten) |
| Monster und Effekte sehen nah gleich aus | ja (Bildvergleich oben) |
| Handy: kein Rückschritt | ja (deutlich weniger Zeichenaufrufe und Dreiecke) |

## Bewusst nicht gemacht

- **Dreiecke ≤ 300.000 / ≤ 6.000 je Monster nah:** dafür müssten auch Rumpf, Kopf und Ringe gröber werden – das sah
  im Vergleich schon bei 90 Bildpunkten Figurenhöhe eckig aus (ein erster Versuch mit einer zweiten, gröberen Stufe
  wurde verworfen). Auf einem starken PC sind 0,7 Mio. Dreiecke kein Engpass; die Hänger lagen auf dem Prozessor.
- **Knochen-Textur je Monster:** das ist kein Namensschild, sondern die Skelett-Textur von three.js (8×8 Gleitkomma,
  1 KB). Die Umstellung auf Uniform-Felder würde je Zeichenaufruf mehr hochladen und bei großen Skeletten am Handy an
  die Grenze der Uniforms stoßen – kein Gewinn.
- **Fester Logik-Takt mit Interpolation:** Laufweg, Abklingzeiten und Schaden sind bei 60/120/144 Bildern schon gleich;
  der Umbau hätte Spieler, Kamera, Netz und Treffer berührt (Risiko) und die gemessene Last liegt im Zeichnen.
- **Grafik Plus:** das Leuchten rechnet schon in halber, viertel und achtel Auflösung, und `adaptQuality` schaltet die
  Nachbearbeitung als erstes ab, wenn es ruckelt.
- **DOM:** die HUD-Anzeigen schreiben schon nur bei Änderung (`ui.set`); Schadenszahlen und Namen malt das 2D-Canvas.
- **Gebogene Streifen** (Schwünge, 100–200 je Bild) haben je Teil eigene, jedes Bild neu geschriebene Formen – nicht
  gebündelt. Die 2D-Ansicht geht weiter alle Monster durch (nicht Teil des 3D-Problems).

## 14.38: Lags bei vielen Monstern und Fertigkeiten

Auftrag: „Ab und zu laggt es einfach so. Und wenn sehr, sehr viele Mobs und dann Fähigkeiten aufeinander treffen, dann
laggt es“ – auf Handy und PC, in 3D und 2D. Die Maßnahmen aus 14.26 (oben) bleiben; hier kam nur dazu, was das Profil
danach noch zeigte.

### Messverfahren

Headless-Chromium (Playwright), echter Spielcode, virtuelle Uhr mit 60 Bildern/s und festem Zufall (gleiche Szenen vorher
und nachher). Weil die Software-Grafik (SwiftShader) das Bild auf dieser Maschine um ein Vielfaches langsamer rastert als
jede Grafikkarte, zählt die **Rechenzeit des Haupt-Threads je Bild** aus dem Chrome-Trace (`tdur` des Bildes plus des
Tastendrucks davor; Warten auf die Grafik zählt nicht, fremde Last auf der Maschine kaum). Die Zeichenbefehle selbst
werden dabei weggelassen – alle Zustände, Uniforms und Puffer setzt und lädt three.js weiter, das ist die Arbeit des
Prozessors; 2D-Zeichenflächen laufen im Arbeitsspeicher. Dazu je Lauf ein CPU-Profil (`Profiler.start`, 150 µs) zur
Ursachensuche, `renderer.info` (Zeichenaufrufe) und `performance.memory` (neu angelegter Speicher). Die Messwerkzeuge
(`mess.js` Lauf, `szenen.js` Szenen, `profil.js` Auswertung je Bild, Aufrufer, Zeilen) liegen nicht im Repo.

Szenen (1280×720, Grafik „Ultra“, Stufe 80, Leerenschlund):
(a) 80 Welt-Monster um die Figur (mit Platz bei ihr, also echter Massen-Pull; was fällt, wird nachgezogen), Grundangriff
gehalten und alle 0,2 s die nächste bereite Fertigkeit auf den Monsterhaufen, Ultimative bei 5 und 20 s, 30 s lang;
Krieger (Klinge), Feuermagier, Schamane, Nekromant mit Dienern, Bogen-Ninja (Pfeilregen). Handy: 844×390, 2-fach, Touch.
(b) Prüfungsarena Welle 14 (30 gleichzeitig, Schübe alle 3 s), Kampf ab voller Halle.
(c) Reiten quer über die Map (Wiesen → Wald), 30 s; die Uhr läuft innerhalb eines Bildes echt weiter (Zeitscheiben).
(d) wie (a), dazu alle 0,75 s ein anderes Fenster (Inventar mit 40 Teilen, Charakter, Karte, Aufträge, Freunde,
Material, Einstellungen) auf und wieder zu.
(e) wie (a) als Kanal-Host mit vier simulierten Mitspielern: Zustand 10×/s, alle 0,5 s ein Flächentreffer auf bis zu
12 Monster und 4 Einzeltreffer/s je Mitspieler, Schnappschüsse an alle.

### Was das Profil gezeigt hat (14.37)

1. **Ruckler von 0,3–9,6 s beim ersten Fund einer Beute-Sorte** („laggt einfach so“): `toDataURL` auf Zeichenflächen,
   die auf der Grafikkarte liegen – der Browser muss erst alles Anstehende zeichnen und dann zurücklesen. Im Kampf trifft
   das genau dann, wenn zum ersten Mal ein Teil, ein Trank, ein Material oder ein Buch fällt (`mobMatIconUrl`,
   `potionIconUrl`, `itemIconUrl` …). Gemessen 20–50 ms je Symbol ohne Last; mitten im Kampf 2.943 ms und 9.666 ms für
   ein einziges Bild (Krieger), 4.818 und 5.377 ms (Magier) – Profil jeweils 96–98 % `toDataURL`.
2. **Treffer-Effekte im Gedränge:** je Treffer mit Rang bis zu sieben Effekte (Einschlag, zwei Schnitte, Blitze,
   Rang-Treffer in 3D) und über 30 Funken; bei 80 Monstern standen bis zu 1.289 Effekte gleichzeitig im Bild (378 Blitze,
   346 Schnitte, 254 Einschläge, 196 Rang-Treffer). Allein `FX3_DRAW.rankhit3` kostete 6,3 ms je Bild (Ninja).
3. **Unsichtbare Effektteile:** three.js rechnet vor jedem Bild die Lage *aller* Objekte der Szene – auch der 16.000–
   33.000 unsichtbaren Teile im Effekt-Vorrat und der gebündelten, beim Zeichnen ausgeblendeten Teile: 4–11 ms je Bild.
4. **Gebogene Streifen** (Schnitte, Schwünge) waren einzeln: 600–1.000 Zeichenaufrufe mit eigenem Hochladen je Bild.
5. **Schleifen über alle ~7.000 Monster der Welt je Treffer bzw. je Bild:** `aliveEnemies()` (Kopie aller lebenden
   Monster bei jeder Zielsuche, jedem Flächentreffer, jedem Kettensprung, auch in `nearestEnemy` beim gehaltenen Angriff),
   `aggro`/`alertGroup` (Gruppen-Aggro je Treffer), Endgame-Flankieren je Schlag, `raidScan` (jedes Bild),
   `solidObstacles` (4×/s), `netHostDamage` (`find` je Mitspieler-Treffer). Zusammen über 100 MB neuer Speicher je
   Sekunde im Kampf.
6. **Schattenmodelle der Figuren im Hauptbild:** jede Figur hat ein unsichtbares grobes Schattenmodell; three.js
   zeichnete es auch ins Bild (ohne einen Bildpunkt) – ein voller Aufruf mit Skelett je Monster, auf jeder Grafikstufe.
7. **HUD:** Leben, Mana und Ziel-Leben ändern sich im Kampf fast jedes Bild; jeder neue Text ließ den Browser Stil und
   Layout neu rechnen (~2 ms je Bild im Kampf gegenüber 0,2 ms beim Laufen).
8. **Nachladen der Welt beim Reiten:** das Zusammenführen der Gegenstände eines Blocks (`mergeParts` in `objectJob`)
   lief am Stück (30–100 ms in einem Bild, obwohl das Nachladen 5 ms je Bild haben soll), und Blöcke am Bildrand wurden
   erst beim Überschreiten der Blockgrenze gebraucht – dann bekam das Nachladen 35 ms je Bild.

Unauffällig (gemessen, nichts geändert): Bedrohungstabellen (`addThreat`, `threatTop` < 0,01 ms je Bild), Sichtprüfung
der Aggro (`navSight`/`navSees` < 0,02 ms), Beteiligungs-Marken (`netTag`), Wegsuche (Budget greift), Schadensmesser
(Standard aus), Endgame-Heilung, Fertigkeits-Vorschau (rechnet nur bei offenem Fenster), Speichern (alle 30 s, im
Messfenster unauffällig), Netz-Schnappschüsse (Host ~0,1 ms je Bild). Der Bodenshader der Felswände kostet nur
Grafikkarte (nicht messbar).

### Änderungen

| # | Änderung | Wirkung | Datei |
|---|---|---|---|
| 1 | Beute-, Trank-, Material-, Buch-, Gegenstands-, Pfeil- und Fertigkeitssymbole auf Zeichenflächen im Arbeitsspeicher backen (`willReadFrequently`, `bakeSprite(…, cpu)`, `CPU_CANVAS`) | erster Fund einer Sorte: 20–4.476 ms → 1,6–4 ms je Symbol | `figuren.js`, `ausruestung.js`, `fernninja.js`, `fertigkeiten.js`, `symbol-kunst.js` |
| 2 | Gedränge-Drossel für Treffer-Effekte (`rankHitFx`): über 24 Treffer-Effekte in 0,25 s bekommt derselbe Gegner höchstens alle 0,15 s einen Satz, über 48 nur Einschlag + ein Schnitt + halbe Funken; ab 40 gleichzeitigen Rang-/Bogen-Treffern zeichnen diese die sparsame Fassung von „Niedrig“ (`FX3.hitCrowd`) | bis 1.289 → 674–803 Effekte gleichzeitig; unter 24 Treffern je 0,25 s (Einzelziele, kleine Gruppen) unverändert | `fertigkeiten.js`, `drei-fx.js`, `rang-fx.js`, `fernninja.js` |
| 3 | Lage nur für sichtbare Effektteile rechnen (`fx3GroupMatrixWorld`) | −4 bis −11 ms je Bild im Kampf | `drei-fx.js` |
| 4 | Additive gebogene Streifen in einer Form und einem Zeichenaufruf (`fxb3Strip`; Ecken stehen schon in Weltkoordinaten, Licht addiert sich) | −600 bis −1.000 Aufrufe je Bild (Ninja) | `drei-fx.js` |
| 5 | `enemiesNear(x, y, r)`: Monster im Kasten ±2.000 um die Figur, einmal je Bild gemerkt; alle Zielsuchen und Flächen nutzen es (fällt auf die ganze Welt zurück, wenn der Kreis nicht sicher im Kasten liegt). Gruppen-Aggro und Flankieren über das Gebiet (`areaList`), Steine/Kristalle/Endbosse/Nummern über das Gebietsverzeichnis (`MON_INDEX`, `monsterById`) | Speicher im Kampf −15 bis −35 %, keine 7.000er-Schleifen je Treffer | `kampf.js`, `gegner.js`, `endboss.js`, `welt.js`, `netz.js`, `magier.js`, `magier-neu.js`, `nekro-neu.js`, `ninja-fx.js`, `eisstrahl.js`, `eingabe.js` |
| 6 | Schattenmodelle der Figuren auf eigener Ebene (`SHADOW_LAYER3`), die die Kamera nur während der Schattenkarte sieht (`v3RenderScene`) | −1 Zeichenaufruf je Figur | `drei-kern.js`, `drei-figuren.js`, `grafik-plus.js` |
| 7 | HUD: Balken jedes Bild, Zahlen (Leben, Mana, Ziel-Leben) höchstens 10×/s, Zielname nur beim Zielwechsel | Stil + Layout im Kampf 2,0–2,4 → 1,3–1,5 ms je Bild | `oberflaeche.js` |
| 8 | Nachladen: Zusammenführen in Zeitscheiben (`mergePartsSteps`, 3 ms), Boden nach Rechenzeit statt alle 6 Reihen, in Fahrtrichtung die nächste Reihe/Spalte vorab bauen, 35-ms-Budget nur noch für fehlende Blöcke nahe der Bildmitte (Rand 16 ms) | längstes Bild beim Reiten 102,8 → 21,4 ms | `drei-kern.js`, `drei-welt.js` |

Zur Drossel (2): die Effekte eines Treffers dauern 0,24–0,8 s; derselbe Gegner bekommt im Gedränge alle 0,15 s einen
neuen Satz, die alten stehen dann noch. Im Gewimmel aus 40–80 Monstern ist nicht zu unterscheiden, ob ein Treffer zwei
Schnitte oder einen hat. Schaden, Trefferzahl, Schadenszahlen, Betäubung usw. laufen unverändert (die Drossel sitzt nur
in `rankHitFx` und im 3D-Zeichnen). Die Endgame-Heilung (`endgameEliteTick`) geht bewusst weiter alle Monster durch –
sie läuft je Heilerin höchstens einmal je Sekunde, und so bleibt der Mechaniktest unverändert.

### Ergebnisse (Rechenzeit des Haupt-Threads je Bild, 14.37 → 14.38)

| Szenario | Ø (ms) | 95 % | 99 % | längstes Bild | Bilder > 16,7 ms | > 33 ms | > 50 ms | Zeichenaufrufe Ø / max | Speicher (MB/s) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| (a) 80 Monster, Krieger | 28,9 → 19,8 | 44,2 → 28,9 | 58,4 → 37,4 | 91,1 → 68,3 | 1794 → 1270 | 412 → 45 | 39 → 3 | 774/1075 → 649/750 | 120 → 97 |
| (a) 80 Monster, Feuermagier | 36,0 → 22,4 | 57,4 → 33,1 | 75,1 → 47,8 | 185,9 → 107,4 | 1797 → 1395 | 907 → 86 | 173 → 13 | 877/1465 → 698/835 | 137 → 114 |
| (a) 80 Monster, Schamane | 42,4 → 27,8 | 66,8 → 45,6 | 88,4 → 62,7 | 207,2 → 109,1 | 1800 → 1707 | 1239 → 397 | 410 → 56 | 886/1430 → 684/904 | 182 → 115 |
| (a) 80 Monster, Nekromant + Diener | 32,6 → 24,8 | 49,6 → 37,9 | 69,7 → 52,1 | 162,3 → 118,2 | 1752 → 1671 | 698 → 194 | 86 → 20 | 909/1844 → 728/917 | 167 → 125 |
| (a) 80 Monster, Bogen-Ninja (Pfeilregen) | 59,9 → 33,2 | 95,7 → 52,4 | 122,1 → 64,8 | 176,7 → 126,5 | 1800 → 1710 | 1655 → 876 | 1205 → 115 | 1486/3962 → 1120/2302 | 203 → 160 |
| (b) Arena Welle 14, Krieger | 11,5 → 8,4 | 18,5 → 13,5 | 25,1 → 20,6 | 42,9 → 51,0 | 155 → 32 | 7 → 4 | 0 → 1 | 213/347 → 189/262 | 80 → 64 |
| (c) Reiten quer über die Map | 4,9 → 3,9 | 7,2 → 6,4 | 9,8 → 13,5 | 102,8 → 21,4 | 10 → 6 | 3 → 0 | 1 → 0 | 133/168 → 133/156 | 31 → 30 |
| (d) Fenster auf/zu im Kampf | 27,0 → 22,0 | 38,5 → 32,1 | 52,0 → 41,2 | 98,4 → 97,3 | 1192 → 1029 | 174 → 40 | 14 → 7 | 778/1057 → 653/761 | 127 → 108 |
| (e) Kanal-Host, 4 Mitspieler | 28,6 → 21,3 | 41,2 → 30,8 | 55,0 → 40,3 | 143,1 → 103,6 | 1198 → 1026 | 217 → 37 | 19 → 6 | 808/1085 → 681/764 | 140 → 108 |
| (a) Handy, Grafik mittel, Magier | 29,5 → 21,4 | 44,6 → 32,3 | 61,6 → 40,8 | 148,4 → 109,7 | 1188 → 872 | 327 → 54 | 33 → 3 | 798/1402 → 609/751 | 148 → 113 |
| (a) Handy, Grafik niedrig, Krieger | 20,9 → 15,8 | 31,1 → 24,1 | 42,7 → 39,5 | 84,1 → 78,2 | 962 → 366 | 40 → 17 | 4 → 6 | 585/884 → 458/524 | 115 → 87 |
| (a) 2D, 80 Monster, Krieger | 9,4 → 7,8 | 15,4 → 12,5 | 22,2 → 17,3 | 69,0 → 27,7 | 54 → 23 | 4 → 0 | 2 → 0 | – | 29 → 24 |

(a), (b), (c) 1.800 Bilder (30 s), (d), (e) und Handy 1.200 Bilder (20 s). Die Ruckler aus Punkt 1 (Beute-Symbole)
stehen nicht in dieser Tabelle: bei Zeichenflächen im Arbeitsspeicher (Messverfahren) sind sie auch vorher kurz; mit
Zeichenflächen auf der (Software-)Grafik waren es vorher die längsten Bilder überhaupt (siehe oben), nachher kosten
dieselben Symbole 1,6–4 ms. In den Nachher-Läufen zählt eine Messhilfe je Bild zusätzlich die Effektteile
(0,3–0,8 ms je Bild) – die Nachher-Werte sind dadurch eher zu hoch. Einzelne längste Bilder (Arena 42,9 → 51,0 ms,
Handy „Niedrig“ > 50 ms 4 → 6) liegen in der Streuung einzelner Läufe.

### Aussehen und Regression

Gebündelte Streifen (4): dieselbe Szene mit virtueller Uhr, einmal gebündelt (15 Streifen in einem Aufruf), einmal mit
abgeschaltetem Bündeln – Bildpunkt für Bildpunkt identisch (mittlere Abweichung 0). Schattenmodelle (6): Monster werfen
auf „Ultra“ weiter ihren Schatten (Bildvergleich 14.37/14.38; die Monster stehen in beiden Läufen anders, weil das
Zeichnen Zufallszahlen verbraucht und das Nachladen jetzt anders in Scheiben fällt). Die Gedränge-Drossel (2) ändert
bewusst die Zahl der Effekte bei sehr vielen Treffern; ein Bildvergleich dafür ist nicht sinnvoll.

Gleich geblieben: alle 12 Charaktere (s73) ohne Seitenfehler; s72 in 2D und 3D wie 14.37 (in 3D auch auf 14.37 im
Prüfmoment 0 Arena-Monster); Drachen-Test 36 × OK wie vorher; Mechaniktest identisch bis auf die zufälligen
Splitterschlag-Zeiten (14.37 in zwei Läufen 30,9 bzw. 33,1 s, nachher 32,1 bzw. 33,8 s; Regel „18–22 s“ OK);
Belohnungstest m10 Zeile für Zeile gleich; Balance-Sim (`--kurz --ohne-farm`, Klinge und Feuer, Stufe 50/80, je zwei
Läufe, Gesamtwertung Ø): Klinge 98/95 → 97/96, Feuer 102/105 → 103/104 (gut: Klinge 98/94 → 98/101, Feuer 102/106 →
102/97) – innerhalb der Streuung derselben Fassung. Netz-Nachrichten unverändert.

### Was offen bleibt / nicht messbar war

- **Echte Handys und Grafikkarten** waren nicht verfügbar. Gemessen ist die Rechenzeit im JavaScript; wie viel das
  Rastern (Füllrate, Leuchtflächen von Grafik Plus, Schatten auf Ultra) auf einem schwachen Handy kostet, sagt die
  Software-Grafik nicht. Zeichenaufrufe sind gesunken, die Dreiecke je Monster nicht.
- **Effekte bleiben der größte Posten** im dichten Kampf (Ninja, Schamane: 15–17 ms je Bild, davon `rankhit3` ~6 ms).
  Weitere Schritte wären ein festes Teile-Budget je Bild oder Funken als Teilchen auf der Grafikkarte – größerer Umbau,
  nicht gemacht. Beim Bogen-Ninja sind noch 876 von 1.800 Bildern über 33 ms (vorher 1.655).
- **Das erste Wirken jeder Fertigkeit** legt ihre Effektteile neu an (`fx3Make`, im ersten Bild bis ~20 ms); Shader
  werden seit 14.26 vorab übersetzt, Teile nicht.
- three.js selbst (Zustände, Uniforms für ~650–1.100 Aufrufe) bleibt bei ~8–12 ms je Bild im Kampf.
- Ein Rest langer Einzelbilder (60–120 ms) im dichtesten Kampf liegt an Häufungen vieler Treffer im selben Bild; Bilder
  über 50 ms sind um 70–95 % seltener, aber nicht weg.
- Die 2D-Ansicht geht beim Zeichnen weiter alle Monster durch (`render` in `zeichnen.js`), ist aber schon vorher rund
  dreimal schneller als 3D gewesen.

## 14.44: Vorladen, Schatten, Schulterblick

Anlass: Video vom 10.11. (Kazehana, 3D, normale Kamera, herausgezoomt) – Schatten von Mauern und Häusern „wachsen“
erst nach, wenn man hinläuft; Boden und Gras erscheinen erst im Bild; im Schulterblick kann man nicht weit genug
herauszoomen; schnelles Drehen mit der rechten Maustaste flackert schwarz.

### Ursachen

1. **Schattenbereich fest und zu klein.** Die Sonnen-Schattenkamera hatte feste ±13 (Ultra/Plus ±18) Einheiten um die
   Figur. Bei Plus am PC werfen alle Weltobjekte echte Schatten (`grafik-plus.js`), herausgezoomt am breiten
   Bildschirm sieht man aber 60–70 Einheiten: am Bildrand fehlten die Schatten und tauchten auf, sobald der Bereich
   beim Laufen nachkam. (Die in den Boden gebackenen Schatten sind immer da, die echten nur im Bereich.)
2. **Vorladen in festen Ringen.** `v3UpdateChunks` lud 2–3 Blöcke (je 16 Kacheln) nach Norden und 1–2 zur Seite,
   unabhängig von Zoom und Bildbreite. Herausgezoomt lag der Bildrand außerhalb – Boden, Gras und Schmuck wurden
   erst gebaut, wenn sie schon sichtbar waren. Im Schulterblick lud nur ein Kreis *vor* der Figur, hinter ihr wurde
   verworfen: nach einer schnellen Drehung fehlte dort die Welt und wurde im Bild nachgebaut.
3. **Schwarzes Flackern.** Die Umriss-Hülle (`outlineMat`, Rückseiten in fast Schwarz `#1a1210`) wird sichtbar,
   sobald die Kamera in ein Objekt gerät: von innen fehlen die beleuchteten Außenflächen, man sieht nur die dunkle
   Hülle. Beim schnellen Drehen schwenkt die Schulterkamera an Häusern/Mauern vorbei; das Anheben über Hindernisse
   (`v3ShoulderPitch`, seit 14.32) zieht weich nach (Faktor 14/s) und kam für 1–3 Bilder zu spät. Nah herangezoomt
   (Kamera tiefer) passiert das häufiger. Fehlende Blöcke hinter der Figur (Punkt 2) kamen dazu.
4. **Zoom-Grenze** 1,8 galt für beide Kameras; im Schulterblick sind das nur 17 Einheiten Abstand.

### Änderungen (alle in eigenen, mit „seit 14.38“ markierten Blöcken)

- `js/drei-kern.js` `v3ViewFoot`/`v3FitSun` (ersetzt `v3PlaceSun`): jedes Bild die Bodenfläche bestimmen, die die
  Kamera sieht (vier Ecken des Sichtkegels auf dem Boden, höchstens bis Nebelende ×1,08), den Schattenbereich im
  Blickfeld der Sonne als Rechteck genau darauf legen (+2,5 Rand, hohe Dinge +4 Höhe), Größe in 2er-Schritten
  gerundet (ändert sich nur beim Zoomen/Drehen), Mitte auf ganze Schatten-Bildpunkte gerastet (kein Flimmern beim
  Laufen), Sonne und near/far passend zur Bereichsgröße.
- `v3ShadowSize`: Schattenkarte eine Stufe feiner als vorher, weil der Bereich größer ist: Plus/Ultra am PC 4096
  (vorher 2048), Ultra Handy 2048, Hoch 2048 (1024), Mittel 1024 (512), Niedrig weiter ohne Echtzeit-Schatten.
  Die Schärfe je Einheit bleibt damit etwa gleich (Plus PC: 2048/36 ≈ 57 → 4096/60 ≈ 68 Bildpunkte je Einheit).
- `v3UpdateChunks`: lädt nach derselben Sichtfläche statt fester Ringe. Feste Kamera: Rechteck um die Sichtfläche
  + 10 Einheiten Rand (Handy unter Ultra: 6; Nebel „Wenig“ +4), in Laufrichtung zusätzlich ~1,3 s Weg. Schulterblick:
  Kreis um die Figur, so groß wie die Sicht in *jeder* Blickrichtung (Drehen lädt nichts nach). Sichtbares zuerst,
  dann der Rand mit 9 ms je Bild (vorher 5 ms). Geladen bleibt der Bereich + 1 Block (kein Bauen/Verwerfen am Rand).
  Nach einem Sprung baut die große Scheibe nur das Sichtbare, den Rand danach in kleinen Scheiben (kein längerer
  Hänger beim Teleport). `CHUNK3_KEEP`/`chunkKeep3` entfallen.
- `outlineMat`: Hülle unter 1,4 Einheiten Tiefe vor der Kamera verwerfen (kein dunkles Inneres mehr).
- Schulterblick: steckt die Kamera nach dem weichen Nachführen noch in einem Hindernis, sofort auf die Höhe darüber.
- Zoom: `ZOOM3`/`v3SetZoom` – Schulterblick bis 3,2 (Kamera bis ~30 statt 17 Einheiten hinter der Figur), feste
  Kamera weiter 1,8 (beim Wechsel zurück wird gekappt). Der Nebel wandert im Schulterblick beim Herauszoomen mit
  (sonst stünde die Figur selbst im Dunst). Neu: Zoomen mit zwei Fingern im Schulterblick (`js/eingabe.js`).
- `js/grafik-plus.js`: die Umriss-Hüllen werfen keinen Schatten mehr (deckungsgleich mit dem Körper, sie verdoppelten
  nur die Arbeit im nun größeren Schattendurchgang).

### Messwerte (SwiftShader, 1280×720, Plus, Kazehana, Zoom 1,8, virtuelle Uhr – Zeiten nicht aussagekräftig)

| Messung | vorher (14.38 vor Änderung) | nachher |
|---|---|---|
| Schattenbereich, 1884×1000, Zoom 1,8 (Bildgröße wie im Video) | 36×36 Einheiten, Karte 2048² | 80×64 Einheiten, Karte 4096² |
| Echtzeit-Schatten-Bildpunkte je Bildfünftel (links → rechts) | 5.649 / 18.505 / 25.226 / 33.471 / 20.328 | 11.649 / 19.976 / 15.374 / 30.429 / 45.636 |
| Laufen in Kazehana, 1280×720, Zoom 1,8: Zeichenaufrufe je Bild (Ø, alle Durchgänge) | 283 | 291 (+3 %) |
| … Dreiecke je Bild (Ø) | 1,31 Mio. | 1,29 Mio. |
| … geladene Blöcke | 56 | 30 (Bereich folgt der Sicht statt fester Ringe) |
| … Geometrien im Speicher / JS-Heap | 179 / 72 MB | 198 / 72 MB |
| Schnelles Drehen, Schulterblick nah (Zoom 0,6), 24 Bilder à 0,5 rad: fast schwarze Bildpunkte (Stichprobe jeder 4.) | höchstens 742 (≈ 1,3 % des Bilds, dunkles Hausinneres am Bildrand) | höchstens 7–13 in zwei Läufen (Augen, Fugen) |
| … geladene Blöcke | 22–28 (nur vor der Figur) | 50–63 (ringsum) |
| Zoom-Maximum Schulterblick (Mausrad) | 1,8 → Kamera 17,1 hinter der Figur | 3,2 → 30,4 |
| … Nebel nah/fern bei Maximum (Einstellung „Wenig“) | 31,6 / 59,5 | 52,5 / 80,4 |
| … geladene Blöcke bei Maximum | 26 | 100 (nur das Sichtbare wird gezeichnet) |
| Anheben über ein Haus hinter der Figur bei Maximum | Neigung 0,92 | Neigung 0,92 (funktioniert weiter) |

In der Mitte des Bilds sind es nachher weniger rote Punkte: die feinere Schattenkarte zeigt weniger Schattenakne auf
den Grashalmen. Die Bildzeiten sind unter SwiftShader nicht aussagekräftig und darum nicht aufgeführt.

Weitere Kleinigkeit dabei: `gpWorldShadows` erkannte neue Blöcke an ihrer Anzahl – wurde im selben Bild einer
verworfen und einer fertig, warf der neue nie Schatten. Jetzt zählt ein Bau-Zähler (`V3.chunkGen`).

Tests: s73 (12 Wege, alle Fertigkeiten) ohne Fehler, s72 2D und s72 3D (Mittel) ohne Fehler, `node --check`.

Bilder: `scratchpad/sicht/sicht-schatten-vergleich.jpg` (rot = Echtzeit-Schatten, oben vorher, unten nachher),
`sicht-drehen-vergleich.jpg` (schnelles Drehen, oben vorher, unten nachher), `sicht-zoom-vergleich.jpg`.

### Offen

- Nicht auf echter Grafikkarte/echtem Handy gemessen (nur SwiftShader). Die Schattenkarte 4096² kostet am PC
  ~64–128 MB Grafikspeicher mehr; sollte das auf schwachen PCs drücken, `v3ShadowSize` für Ultra auf 3072 senken.
- Das schwarze Flackern war in SwiftShader nur nah herangezoomt (Kamera an Häusern) nachstellbar; ob die Grafikkarte
  des Nutzers zusätzlich eine andere Ursache hat, ist ungeprüft.
