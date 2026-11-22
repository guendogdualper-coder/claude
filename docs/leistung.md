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

## 14.66: Weißes Aufblitzen für ein Bild („flackert ab und zu so weiß“)

### Ursache

Im **Schulterblick** zeichnet die 2D-Ebene über der 3D-Szene Teilchen, Effekte, Geschosse, Namen und Zahlen an
Weltpunkten (`v3Anchor`: Punkt projizieren, Maßstab aus einem zweiten Punkt 32 Weltpixel daneben). Die
Umgebungsteilchen (`updateAmbient`: Pollen, Glühwürmchen, Staub, Funken – in fast jedem Gebiet) entstehen im
2D-Bildausschnitt rund um die Figur; im Schulterblick liegt ein Teil davon neben, unter oder hinter der Kamera.
Für Punkte knapp vor ihrer Bildebene wurde der Maßstab riesig (gemessen 1 000 bis 100 000 statt 0,3–3), und
`drawParticles` zeichnete trotzdem: ein Pollenkorn (2 px, `lighter` = leuchtend addiert, Farbe `#ffe0f0`/`#fff6c0`)
wurde zur Scheibe über den ganzen Bildschirm. Für genau ein Bild war alles weißlich-rosa verschleiert, danach war
der Punkt aus diesem Streifen heraus. Zufällig (Math.random beim Entstehen), darum im deterministischen
Wiederholungslauf der Trailer-Szene nicht wieder aufgetreten. Die feste Kamera ist nicht betroffen (dort höchstens
Maßstab 2,7). Das helle Einzelbild im Trailer (Szene „stadt“, Rohbild `social64/work/frames/stadt/f0044.jpg`) passt
dazu: ganzes Bild inkl. Himmel um ~34 % zu (242, 218, 236) hin aufgehellt = Pollenfarbe `#ffe0f0`.

Dieselbe Rechnung galt für Bodeneffekte, Geschosse, Namen/Lebensbalken und Schadenszahlen nahe der Kamera
(übergroß verzerrt), nur seltener sichtbar.

### Messung

Playwright + SwiftShader, echtes Spiel (nicht die Trailer-Kamera), Probe nach jedem `render()`: WebGL- und
2D-Ebene verkleinert (160×90) zusammengesetzt, mittlere Helligkeit; Treffer = Bild mehr als 6 heller als Vor- und
Nachfolger, die untereinander ähnlich sind. Je Bild protokolliert: dt, `screenFlash`, Nebel, `V3.camDist`, Kamera,
Pixelratio/Größe, Qualitätsstufe, Punktlichter, Programme (neu kompiliert), Blockbau, offene Fenster, Effekte,
größter Teilchen-Maßstab.

| Lauf | Bilder | Einzelbild-Blitze |
|---|---|---|
| Echtzeit PC Ultra/Plus, Handy (iPhone-Querformat, Touch) Mittel – laufen, kämpfen, Fenster, Drache, Zoom, Tag/Nacht, Teleport, Schulterblick | 154 + 296 + 191 | 0 (ein Fehlalarm: Szenenwechsel) |
| Virtuelle Uhr mit dt-Spitzen, PC Ultra / Handy Plus, Qualitätsschritte, Fenstergröße ±30 px | 578 + 558 | 0 |
| dasselbe nachher, PC Plus (Magier) | 578 | 0 |
| Schulterblick Wiesen (Pollen), laufen/reiten/Drache/Zoom, **vorher** | 301 | 1 (+44 Helligkeit, Maßstab 5 470) |
| dasselbe **nachher** | 451 | 0 (höchstens +3,3 über dem örtlichen Median) |
| Schulterblick, 3 Pollen mehr je Bild, **alter Code** (Server mit 14.65) | 151 | 8 (+14 bis +82) |
| dasselbe **nachher** | 151 | 0 |

Die Bildschirmblitze (`flashScreen`) sind nicht die Ursache: sie klingen über mehrere Bilder ab und waren in keinem
Treffer aktiv. Ebenso unauffällig: Nebel, Kamera-Abstand, Pixelratio/Größenwechsel, Qualitätsautomatik, Grafik Plus,
Punktlichter, neu kompilierte Programme, Blockbau.

### Änderung

- `v3Anchor` (drei-kern.js) meldet jetzt, ob der Punkt brauchbar ist: vor der Kamera (−1 < z < 1), Maßstab unter
  `h/12 + 2` Pixel je Weltpixel (Schulterblick am unteren Bildrand etwa h/26) und höchstens anderthalb Bildbreiten
  neben dem Bild. Sonst zeichnen Teilchen (`drawParticles`), Effekte, Geschosse, Duell-Arena, Namen/Balken und
  Schadenszahlen (`drawTexts`) diesen Punkt nicht.
- `renderDrei`: Zeitschritt nie negativ (Aufnahme-Uhren; ein negativer Schritt warf die weich folgende
  Schulterkamera für ein Bild ins Leere).
- Bildschirmschein nur noch für eigene Momente: Siegel-Blitz des Magiers nur beim eigenen Siegel, Eiszeit und
  Weltenbruch der Mitspieler nur noch mit Beben, ohne Schein.

### Offen

- Nur unter SwiftShader gemessen, nicht auf einem echten iPhone. Andere Flacker-Ursachen auf echter Hardware
  (Treiber, Kontextverlust) sind damit nicht ausgeschlossen.
- Die Rang- und Fertigkeits-Bildschirmscheine der eigenen Figur (z. B. Rang ≥ Heroisch bei jeder Fertigkeit) sind
  unverändert; sie sind gewollt und klingen über mehrere Bilder ab.

Bilder: `scratchpad/flacker/vorher-blitze.png` (je Zeile Vorgänger · Blitzbild · Nachfolger; oben natürlicher Pollen,
darunter alter Code mit dichteren Pollen). Skripte: `scratchpad/flacker/` (`run.js`, `runv.js`, `schulter.js`,
`probe-page.js`, `anchor.js`).

Tests: `node --check` aller js-Dateien; s73 (12 Wege) ohne Fehler; s72 2D und `D3=1 s72_noshot` ohne Seitenfehler (in 3D
`mons: 0` in der Arena – genauso mit dem unveränderten 14.65-Stand, also Zeitverhalten unter SwiftShader); td8781 69 OK.
## Flimmern am Handy („weißes Blinzeln alle 10–30 s, manchmal weiße oder schwarze Flecken“)


### Messung

Playwright + Chromium mit Software-Grafik (SwiftShader), echtes Spiel. Handy: iPhone 13 und Pixel 7 quer (Touch,
2,625–3-fache Dichte, Grafik „mittel“), PC: 960×540 bis 1920×1080 („hoch“/„ultra“). Zwei Arten von Läufen:

- **Zustandsläufe** (echte Zeit, Prozessor über CDP 4-fach gedrosselt, automatische Grafikanpassung an, 3D-Zeichnen
  abgeschaltet, damit das Spiel in Echtzeit läuft): je Bild Nebel (near/far/Farbe), Himmel, Licht (Himmel/Sonne),
  `screenFlash`, `WZ.flash`, Größe und Pixelverhältnis der Zeichenflächen, Qualitätsstufe, Lastschutz, Programme,
  Texturen, Blöcke, Überblendung, Kontextverlust; dazu jede Größenänderung der beiden Zeichenflächen (mit der Angabe,
  ob sie innerhalb eines Spielbildes geschah), `flashScreen`/`warpFade`/`v3ApplyGraphics`/`setSize`-Aufrufe mit
  Aufrufer. 4 267 Bilder über 4,5 min: Kazehana, Donnerklamm, Seelenhain, Nebelküste, Himmelsterrassen; stehen,
  laufen, kämpfen, Tag → Nacht → Tag.
- **Bildläufe** mit virtueller Uhr (jedes Bild rückt die Zeit um genau 33,3 ms vor – das Spiel läuft wie auf einem
  Gerät mit 30 Bildern/s, egal wie langsam die Software-Grafik ist): nach jedem `render()` 3D- und 2D-Ebene samt
  CSS-Hintergrund und Überblendung auf 320×180 verkleinert, mittlere Helligkeit, fast weiße/schwarze Anteile und
  kurzzeitige helle/dunkle Flecken (Bildpunkt in Bild n deutlich heller/dunkler als in n−1 und n+1); daneben
  CDP-Screencast des fertig zusammengesetzten Browserbilds (HTML eingeschlossen). Ein Lauf auf dem PC suchte NaN- und
  Unendlich-Werte in allen Fragment-Shadern (jeder Shader färbt solche Bildpunkte in einer eigenen Kennfarbe, volle
  Auflösung ausgelesen).

Skripte und Daten: `scratchpad/flimmern/` (`run.js`, `probe*.js`, `bilder.py`, `zustand.py`, `screencast.py`,
`tafel2.py`, `groesse.js`).


### Ursachen (mit Beleg)

1. **Gewitterblitz der Donnerklamm (`WZ.flash`, wahrzeichen.js) – das „weiße Blinzeln“.** In der Klammfeste und
   überall in der Donnerklamm, wo eine Felsnadel mit Blitzableiter näher als 38 Einheiten steht, schlägt alle
   2,6–7,1 s ein Blitz ein (unterwegs, je nach Abstand zu den Nadeln, seltener – das passt zu „alle 10, 20, 30 s“).
   Seit 14.91 hellte er nur noch „sanft“ auf: Himmelslicht +0,35, Sonne +0,15. Gemessen (Klammfeste, iPhone,
   30 Bilder/s): **6 Einschläge in 24,6 s (Abstände 4,2 / 3,0 / 2,7 / 3,8 / 4,0 s), jedes Mal springt das ganze
   Bild in einem einzigen Bild um +35 bis +38 Helligkeitsstufen (+31–34 %) nach oben** (Himmelslicht 0,56 → 0,91,
   Sonne 0,72 → 0,87) und klingt über rund 8 Bilder (0,27 s) wieder ab. Genau das sieht aus wie ein weißes Blinzeln.
2. **Vorwärmen der Effekt-Shader (`v3WarmFx`, drei-fx.js) dunkelte ein Bild lang alles ab.** 1,2 s nach jedem
   Spielstart (auch nach jedem Neuladen und Neustart der Grafik) zeichnet `v3WarmFx` jede Effektart einmal zur Probe.
   Die Probe des Gewitters (sturmgericht.js) hinterließ ihren Lichtwunsch „Szene abdunkeln“ für das nächste Bild:
   Himmelslicht 0,62 → 0,54, Sonne 0,95 → 0,77, **das ganze Bild ein Bild lang −19 bis −29 Helligkeitsstufen**
   (gemessen in Kazehana und in der Klammfeste, jeweils Bild 37). Ein Bild davor blieb außerdem das Bündel der
   Effekt-Streifen (`FXB3_STRIP`) der Probe sichtbar: weiße Bögen und Ringe neben der Figur (Bild 36, bis 450
   kurzzeitig helle Bildpunkte von 57 600).
3. **Größenwechsel außerhalb eines Spielbildes.** Wird die Größe einer Zeichenfläche gesetzt, ist sie bis zum
   nächsten gezeichneten Bild leer. `resizeRenderer`/`v3Resize` liefen auch aus Zeitgebern (`checkViewSize` nach
   `resizeSoon`: Drehen, Tastatur, Rückkehr aus dem Hintergrund, `focusout`), beim Ändern der Einstellungen, beim
   Drehen ins Querformat (`qualityRestore`) und nach einem Grafik-Neustart. Gemessen: Fenstergröße und Grafikstufe
   geändert – **vorher 14 von 14 Größenwechseln außerhalb eines Bildes**, im 30er-Takt bleibt die leere Fläche dann
   bis zu zwei Bildschirmtakte stehen (schwarz bzw. der hellblaue CSS-Hintergrund `#9ec8e0` der 3D-Fläche, der
   auch bei verlorenem Grafikkontext zu sehen ist).
4. **Bildschirmblitze (`flashScreen`).** Bis 14 % Deckkraft in hellen Farben, auch bei Angriffen der Bosse
   (Nova, Brüllen, Vernichtung, Viertelschlag, Erwachen) und beim Gewitter-Einschlag alter Mitspieler
   (`SG3_L.sky`: Himmelslicht bis ×1,66). Im Kampf der Messläufe selbst kamen nur Rang-Blitze unter der Schwelle
   (0,14 < 0,2) vor, sie zeichneten nichts.

Unauffällig (gemessen, keine Sprünge): Nebel (siehe unten), Tag/Nacht (weich über 60 s), Gebietsstimmung (weich,
höchstens 5 Helligkeitsstufen je Bild direkt nach einem Kartenwechsel hinter der dunklen Überblendung), die
automatische Grafikanpassung am Handy (60 → 30 Bilder/s nach 38 s, Schatten aus nach 116 s, Auflösung 2 → 1,5
nach 139 s – alles innerhalb eines Bildes, kein Sprung), Lastschutz, neue Shader-Programme, Blockbau, Texturen
(alle im Spiel erzeugt, keine nachladenden Bilder), Kontextverlust (kam nicht vor). Kurzzeitige Flecken bei
ruhender Kamera: außer dem Abdunkeln aus Punkt 2 höchstens 50 von 57 600 Bildpunkten (Treffer und Funken im Kampf).


### Nebel: nicht die Ursache, bleibt drin

Der Spieler hatte gesagt: „Wenn es am Nebel liegt, Nebel ganz raus.“ Er liegt nicht daran. Je Bild mitgeschrieben
(4 135 Bildpaare des Zustandslaufs ohne Kartenwechsel und Tag/Nacht-Umschaltung): Nebelanfang höchstens 1,33 %,
Nebelende höchstens 1,40 % und Nebelfarbe höchstens 5,3 Helligkeitsstufen Änderung von einem Bild zum nächsten –
und das nur in den Sekunden nach einem Kartenwechsel, wo die Stimmung weich zur neuen Gegend gleitet. Im ganzen
Bildlauf in Kazehana (1 310 Bildpaare) änderte sich der Nebel überhaupt nicht. Kein einziger Helligkeitssprung fiel
mit einer Nebeländerung zusammen. Der Nebel trägt dagegen den Kartenrand (Dunst der fernen Landschaft in
`kartenrand.js`, Horizont in `drei-fx.js`, Wasser) – ohne ihn gäbe es harte Kanten am Ende der Sichtweite. Darum
bleiben Nebel und die Einstellung „Nebel“ unverändert.


### Änderungen

- `js/wahrzeichen.js` – Gewitter: Der Blitz hellt das Licht der Szene nicht mehr auf (`WZ.flash` klingt nur noch
  ab, ohne Himmels- oder Sonnenlicht zu ändern); der Schein am Einschlag ist kleiner und blasser (3 → 1,8 Einheiten,
  Deckkraft 0,7). Der Blitz selbst bleibt sichtbar.
- `js/drei-fx.js` – `v3WarmFx` verwirft nach dem Vorwärmen die Lichtwünsche der Probe-Effekte (`SG3_L`, `FLM3_L`)
  und blendet auch das Streifen-Bündel (`FXB3_STRIP.mesh`) der Probe aus.
- `js/sturmgericht.js` – Einschlag ohne Aufhellen der Szene (`sky` entfällt), nur das Abdunkeln beim Aufziehen bleibt.
- `js/zeichnen.js`, `js/drei-kern.js`, `js/spiel.js` – `resizeRenderer`/`v3Resize` setzen Größen nur noch innerhalb
  eines Spielbildes (`renderer.inFrame`, gesetzt in `frame`), Aufrufe von außerhalb merken nur `resizeDue` vor; das
  nächste Bild setzt die Größe und zeichnet sofort.
- `css/style.css` – Hintergrund der 3D-Fläche dunkel (`#12100c` wie die App) statt hellblau: Fehlt einmal ein Bild
  (Kontextverlust, Neustart der Grafik), blitzt es nicht hell auf.
- `js/effekte.js` – Bildschirmschein nur noch als schwacher Farbton: höchstens 6 % Deckkraft (vorher 14 %), helle
  und weiße Farben höchstens 3 %, Stärke `peak × 0,15` (vorher × 0,3). Ein Stufenaufstieg (0,55, `#fff0c8`) hellt
  das Bild damit um höchstens 3 % zur Farbe hin auf statt 14 %.
- `js/gegner.js`, `js/endboss.js`, `js/hoellenthron.js`, `js/instanzen.js` – kein Bildschirmblitz mehr bei Angriffen
  und beim Erwachen von Bossen (nur eigenes Tun darf aufhellen; die Angriffe haben ihre eigenen Ringe, Säulen und
  Beben). Belohnungs-Momente (Boss besiegt, legendäre Beute, Stufenaufstieg) bleiben als schwacher Farbton.

Höchste Deckkraft des Bildschirmscheins (vorher → nachher): Stufenaufstieg `#fff0c8` 0,55: 14 % → 3 %;
Donnerkeile (eigen, weiß) 0,4: 12 % → 3 %; Ulti-Einschlag weiß 0,3: 9 % → 3 %; farbige Fertigkeit 0,25: 7,5 % →
3,8 %; Endboss besiegt (gold) 0,5: 14 % → 6 %; Boss-Nova/-Brüllen/-Viertelschlag: 9–14 % → keiner.

### Messung nachher

| Lauf (Bildlauf, 30 Bilder/s) | Bilder | Sprünge des ganzen Bildes (> 6 Stufen von Bild zu Bild) | kurze Ausreißer (1–3 Bilder, > 3) |
|---|---|---|---|
| iPhone, Klammfeste, stehen/laufen, **vorher** | 739 | 19 (6 Gewitter-Einschläge je +35…+38 und ihr Abklingen, 2 × Vorwärmen) | 1 (Bild 37, −19) |
| dasselbe **nachher** (3 Einschläge im Lauf) | 490 | 0 – Helligkeit beim Einschlag 118,7 → 118,6 | 0 |
| iPhone, Kazehana, stehen/laufen/kämpfen/Nacht, **vorher** | 1 312 | 1 außer Nacht-Umschaltung (Bild 37, −29) | 1 |
| Kazehana **nachher** | 501 + 158 | 1 (Bild 376: −16, zehn dunkle Golems erscheinen auf einmal – bleibt so, kein Blinken) | 0 |
| Pixel 7, 2D, Kazehana/Donnerklamm, vorher / nachher | 757 / 773 | nur im Kampf durch eigene Fertigkeitseffekte (2 / 1) | 0 / 0 |
| Größenwechsel der Zeichenflächen außerhalb eines Bildes (Fenster und Grafikstufe geändert) | – | vorher 14 von 14, nachher 0 von 14 | – |

Kurzzeitige helle Flecken bei ruhender Kamera, 1,2 s nach dem Start: vorher 99–450 Bildpunkte (weiße Bögen),
nachher höchstens 24.

Bildtafeln (Zeile = ein Ereignis, Spalten = Bilder davor/danach mit Helligkeit):
`scratchpad/flimmern/tafel-gewitter-vorher-nachher.png`, `scratchpad/flimmern/tafel-start-vorher-nachher.png`.

### NaN und Unendlich in Shadern (schwarze/weiße Flecken)

Zwei Läufe am PC (960×540, „Hoch“, Kazehana und Seelenhain, laufen, kämpfen, Nacht; 553 und 481 Bilder), alle 44
Fragment-Shader überwacht, volle Auflösung je Bild ausgelesen; im zweiten Lauf war der Schutz aus 14.94 (NaN → Schwarz
in `fog_fragment`, grafik-plus.js) abgeschaltet, damit er nichts verdeckt. **Ergebnis: kein einziger NaN- oder
Unendlich-Bildpunkt.** Die weißen Flecken in den Aufnahmen waren die Bögen aus dem Vorwärmen (siehe Ursache 2) und
Funken eigener Fertigkeiten; schwarze Flecken traten nicht auf. Der Schutz aus 14.94 bleibt.

### Offen / nicht prüfbar

- Gemessen nur mit Software-Grafik (SwiftShader) in Chromium, nicht auf echter iPhone-/Android-GPU und nicht in
  Safari/WKWebView. Treiberfehler, Speicherdruck bis zum Kontextverlust und Eigenheiten des iOS-Zusammensetzers
  (Ebenen, die kurz ohne Inhalt gezeigt werden) lassen sich so nicht nachstellen. Für diese Fälle ist der Hintergrund
  der 3D-Fläche jetzt dunkel und Größenwechsel geschehen nur noch direkt vor dem Zeichnen.
- Ungenaue Rechnung in Shadern (NaN/Unendlich) kann auf echten Grafikkarten andere Stellen treffen als in SwiftShader.

## Handy wird warm („nach einer halben Stunde so heiß, dass eine Warnung kommt“)

Wärme ist Arbeit je Sekunde (Prozessor und Grafikkarte), nicht je Bild. Gemessen mit `scratchpad/flimmern/waerme.js`:
virtuelle Uhr mit fester Bildschirmrate (Pixel 7: 120 Hz, PC: 60 Hz), Hauptthread 4-fach gedrosselt (Handy), je
Spielsekunde: gezeichnete Bilder, rAF-Aufrufe, Rechenzeit im Spieltakt (echte Uhr, Grafikkarte vor jedem
Bild abgewartet, damit sie nicht mitzählt), Zeichenaufrufe, Dreiecke, Bildpunkte der 3D-Fläche, der Schattenkarte und
der 2D-Ebene. Ablauf je Lauf: Kazehana, je 3 s stehen, laufen, kämpfen (Monster, alle 1,2 s eine Fertigkeit),
Inventar offen, Stillstand (20 s ohne Eingabe, nachgestellt). Einstellungen wie neu installiert.

### Was vorher lief

- **Bildrate:** Am Handy hieß „Auto“ 60 Bilder/s, solange das Gerät sie hielt (seit 14.98); „Max“ lief so schnell wie
  der Bildschirm – auf 90/120-Hz-Handys 90/120 Bilder/s. Fenster, große Karte und Stillstand liefen mit voller
  Bildrate weiter. Der Bildschirmtakt selbst (rAF) läuft auf 120-Hz-Handys immer mit 120/s, das Spiel überspringt
  die zu vielen Takte gleich am Anfang von `frame`.
- **Auflösung:** „Mittel“ zeichnete die 3D-Welt am Handy mit Dichte 2 (iPhone 13: 1688×780, Pixel 7: 1726×720 –
  krumm hochskaliert 1,5- bzw. 1,31-fach), „Hoch/Ultra“ bis 3.
- **Schattenkarte:** jedes Bild neu (1024² bei Mittel, 2048² bei Hoch), obwohl nur die Figuren Schatten werfen.
- Kein Wärmeschutz: Die Anpassung (adaptQuality) griff erst, wenn das Handy die Bildrate nicht mehr schaffte – also
  erst, wenn es schon heiß war und gedrosselt hatte.

### Änderungen

- **Neue Einstellung „Leistung“** (Grafik): *Akku schonen* (Handy-Standard), *Ausgewogen*, *Maximal* (PC-Standard,
  wie bisher). `js/waermeschutz.js` (neu), `js/optionen.js` (`opts.leistung`, Umstellung `optsVer` 5: am Handy
  „Bildrate: Max“ einmalig auf „Auto“, damit „Leistung“ greift; wer „Leistung“ wählt, bekommt „Bildrate: Auto“).
  | | Akku schonen | Ausgewogen | Maximal |
  |---|---|---|---|
  | Bildrate „Auto“ Handy | 30 | 40 (= 30 bei 60 Hz, 40 bei 120 Hz, 45 bei 90 Hz) | 60 (bisher) |
  | Bildrate „Auto“ PC | 30 | 60 | unbegrenzt (bisher) |
  | Fenster/große Karte offen, Stillstand (20 s keine Eingabe, Figur steht, kein Kampf) | 20 | 30 | voll |
  | Auflösung 3D am Handy | halbe Gerätedichte ab 2,6-fach (iPhone 1,5, Pixel 7 1,31 – genau doppelt hochskaliert), sonst höchstens 2 | höchstens 2 | wie Grafikstufe |
  | Schattenkarte | jedes 2. Bild | jedes Bild | jedes Bild |
- `js/spiel.js` – `frameCap` fragt `leistungCap`; `capInterval` rechnet die Grenze auf ganze Bildschirmtakte
  (geschätzt aus den rAF-Abständen, `quality.vsync`), `js/zeichnen.js` `adaptQuality` misst dagegen (sonst hielte es
  „40 auf 60 Hz = 33 ms“ für Ruckeln).
- `js/drei-kern.js` – `v3RenderScene`: Schattenkarte bei „Akku schonen“ nur jedes zweite Bild
  (`shadowMap.autoUpdate = false`, `needsUpdate` jedes 2. Bild; fehlt die Karte, sofort).
- **Wärmeschutz** (`heatProbe`/`heatStep`, nur Handy): alle 10 s eine kleine Rechenprobe (stellt sich in der ersten
  Minute auf ≥ 4 ms ein, Safari misst nur auf 1 ms genau); je Minute der Median aus 6 Proben; Grundwert = schnellste
  Minute ab der zweiten. Ab 5 Minuten Spielzeit: zwei Minuten hintereinander ≥ 40 % langsamer → eine Stufe sparen:
  Nachbearbeitung (Plus) → Schatten → Auflösung −20 % → Bildrate 30 → 24 (auf 60 Hz gleichmäßig 20). Einmal im
  Chat: „Das Gerät wird warm: Die Grafik spart jetzt etwas Leistung.“ Getestet mit künstlicher Drosselung über CDP
  (Faktor 2,5): drei Stufen nacheinander, im kühlen Lauf keine.
- **Akku** (Chrome/Android): ≤ 20 % ohne Ladekabel → wie „Akku schonen“, einmal im Chat „Akku fast leer: Das Spiel
  spart jetzt Strom.“ (Safari verrät den Akku nicht.)
- **Hintergrund:** Ist die App verdeckt, stehen Bildschleife (rAF) und Musik ohnehin (vorhandene Behandlung in
  `musik.js`/`nativ.js`); die Rechenprobe pausiert dann ebenfalls.

### Messung vorher/nachher

Pixel 7 quer (120-Hz-Bildschirm, Dichte 2,625), Grafik „Mittel“, alle Einstellungen wie neu installiert (vorher
Bildrate „Auto“, nachher zusätzlich „Leistung: Akku schonen“), Hauptthread 4-fach gedrosselt, Kazehana. Je Lage
2 Spielsekunden gemittelt (die erste Sekunde jeder Lage nicht gezählt):

| Lage | Bilder/s | rAF/s | Rechenzeit ms/s | Aufrufe/s | Dreiecke/s (Mio.) | 3D-Bildpunkte/s (Mio.) | Schattenkarte Bp/s (Mio.) | 2D-Ebene Bp/s (Mio.) | 3D-Größe |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| stehen | 60 → 30 | 120 → 120 | 2574 → 1116 | 6900 → 3246 | 30.8 → 14.8 | 74.6 → 16.0 | 62.9 → 15.7 | 74.6 → 37.3 | 1726x720 → 1130x471 |
| laufen | 60 → 30 | 120 → 120 | 3285 → 1338 | 5935 → 2816 | 31.2 → 15.1 | 73.9 → 16.0 | 62.4 → 15.7 | 73.9 → 37.3 | 1726x720 → 1130x471 |
| kämpfen | 60 → 30 | 120 → 120 | 3458 → 1861 | 6960 → 3308 | 26.5 → 12.9 | 74.6 → 16.0 | 62.9 → 15.7 | 74.6 → 37.3 | 1726x720 → 1130x471 |
| Inventar offen | 60 → 20 | 120 → 120 | 2482 → 826 | 6960 → 2220 | 26.5 → 8.6 | 74.6 → 10.6 | 62.9 → 10.5 | 74.6 → 24.9 | 1726x720 → 1130x471 |
| Stillstand (20 s ohne Eingabe) | 60 → 20 | 120 → 120 | 1945 → 1327 | 6900 → 2280 | 26.5 → 8.8 | 74.6 → 10.6 | 62.9 → 10.5 | 74.6 → 24.9 | 1726x720 → 1130x471 |
| **Mittel der Lagen** | 60 → 26 (43 %) | 120 → 120 (100 %) | 2749 → 1294 (47 %) | 6731 → 2774 (41 %) | 28.3 → 12.1 (43 %) | 74.4 → 13.8 (19 %) | 62.8 → 13.6 (22 %) | 74.4 → 32.3 (43 %) | |

- **Arbeit je Sekunde mehr als halbiert:** Rechenzeit im Spieltakt auf 47 %, Zeichenaufrufe auf 41 %, Dreiecke auf
  43 %, Bildpunkte der 3D-Welt auf 19 %, Schattenkarte auf 22 %, 2D-Ebene auf 43 % (Mittel der Lagen). Im Kampf
  sinkt die Rechenzeit am wenigsten (auf 54 %), weil Treffer, Effekte und Monster je Spielsekunde gleich viel Logik
  brauchen, egal wie oft gezeichnet wird.
- Die Rechenzeit ist unter SwiftShader und bei hoher Last der Maschine (andere Messläufe parallel) gestreut; die
  Zähler (Bilder, Aufrufe, Dreiecke, Bildpunkte) sind exakt.
- rAF bleibt bei 120/s; übersprungene Takte kehren in `frame` sofort zurück, ihre Zeit ist in der Rechenzeit enthalten.
- **iPhone 13** (60 Hz, Dichte 3) nicht eigens gemessen (Maschine ausgelastet); dieselbe Szene: vorher 60 Bilder/s
  mit 1688×780, nachher 30 (Fenster/Stillstand 20) mit 1266×585 – 3D-Bildpunkte je Sekunde 79,0 → 22,2 Mio.
  (28 %), Bilder und damit Aufrufe/Dreiecke/Rechenzeit je Sekunde auf die Hälfte (in Ruhe ein Drittel).
- **PC:** Standard „Maximal“ und „Bildrate: Max“ wie bisher; geprüft, dass Bildrate (unbegrenzt), Auflösung und
  Schattenkarte (jedes Bild) unverändert sind. Wer am Laptop „Akku schonen“ wählt, bekommt 30 Bilder/s (20 in Ruhe)
  und die Schattenkarte jedes zweite Bild.

### Bewusst nicht gemacht / offen

- Die 2D-Ebene über der 3D-Welt (Namen, Balken, Zahlen) bleibt mit Dichte 2 scharf; sie ist am Handy damit größer
  als die 3D-Fläche bei „Akku schonen“. Kleinere Dichte würde die Schrift sichtbar unscharf machen.
- Der Bildschirmtakt (rAF) läuft auf 120-Hz-Handys weiter mit 120 Aufrufen/s; übersprungene Aufrufe kosten wenig
  (siehe Messung). Ein eigener Zeitgeber statt rAF riskiert ungleichmäßige Bilder.
- Nicht auf echten Geräten gemessen: keine Temperatur, kein Akkuverbrauch, keine echte GPU-Zeit (SwiftShader rechnet
  auf dem Prozessor). Die Zahlen sind Arbeit je Spielsekunde (Bilder, Bildpunkte, Zeichenaufrufe, Dreiecke,
  Rechenzeit im Spieltakt bei 4-facher Drosselung); die Wärme folgt ihnen, aber nicht linear. Ob der Wärmeschutz
  auf einem echten iPhone früh genug greift (iOS drosselt teils stufenlos), ist ungeprüft; ebenso, ob iOS den
  Hauptthread bei wenig Last auf sparsame Kerne legt (dann würde die Rechenprobe langsamer, ohne dass das Gerät heiß
  ist – die Folge wäre nur, dass früher gespart wird).

### Neue Texte (nur Deutsch, zum Übersetzen)

- Einstellung „Leistung“ mit den Stufen „Akku schonen“, „Ausgewogen“, „Maximal“ und dem Hinweis (Handy/PC je eigener
  Wortlaut, `optionen.js`).
- Geänderter Hinweis bei „Bildrate“: „Auto: so viele Bilder, wie die Einstellung „Leistung“ vorsieht (ist das Gerät zu
  langsam, gleichmäßig 30). Max: …“
- Chat: „Das Gerät wird warm: Die Grafik spart jetzt etwas Leistung.“ und „Akku fast leer: Das Spiel spart jetzt Strom.“

## Wärme 2 – Sparoptik („Handy wird auf den niedrigsten Optionen sehr schnell heiß“)

Spieler (iPhone-App) mit Qualität „Niedrig“, Bildrate „30 (Akku)“, Leistung „Akku schonen“. Gemessen am emulierten
iPhone 13 (Chromium mit SwiftShader, Dichte 3, Hauptthread 4-fach gedrosselt; Skripte unter
`scratchpad/waerme2/messen/`). Wärme = Arbeit je Sekunde von Prozessor, Grafikkarte und Compositor (Stil, Paint,
Rastern, Zusammensetzen der Ebenen), nicht nur Bildzeit.

### Ursachen (gemessen an 15.52)

- **Endlos-Animationen der Oberfläche** hielten den Compositor auf bis zu 60 Zusammensetzungen je Sekunde, obwohl das
  Spiel nur 30 Bilder zeichnet: Glanz auf Leben/Mana/Ziel/EP (`bar-sheen`), pulsierende Ulti (`ult-charged`),
  fehlender Segen (`segen-off`), Statuspunkt-Knopf (`orb-pulse`), im Inventar zusätzlich Gold-Seltenheit
  (`rar-gold`), Sternchen ab +8 (`twinkle`) und Goldglanz (`gold-shine`) – 6 laufende Animationen in der Stadt, 47 im
  Inventar. Die box-shadow-Animationen lassen in jedem Takt die bildschirmgroße HUD-Sammelebene neu malen und rastern.
  Folge: 2,2–3,5 Zusammensetzungen je Spielbild, im Inventar 4,5–8.
- **„30 (Akku)“ ohne Ruhe-Drosselung:** `frameCap` gab bei „30“ immer 30 zurück, die Ruhe (Fenster, große Karte,
  Stillstand → 20) galt nur für „Auto“.
- **Überblendung nach Teleport:** `#warpFade` blieb nach dem Aufziehen mit Deckkraft 0 als Vollbild-Ebene im
  Compositor, bis zum Neuladen.
- **Vignette** (`.light-fx`): eine Vollbild-Verlaufsebene über der Welt.

### Änderungen

- `js/waermeschutz.js`: `sparOptik()` (= Grafik „Niedrig“) und `sparOptikAnwenden()` (Klasse `spar-fx` an `<html>`),
  einmal beim Laden, außerdem in `applyOpts` (`js/optionen.js`) – ein Grafikwechsel greift ohne Neuladen.
  Ruhe-Logik aus `leistungCap` in `leistungRuheCap(cap)` ausgelagert (Wärmeschutz-Endstufe 24, Ruhe 20 bei „Akku
  schonen“/30 bei „Ausgewogen“, `qualityPause` beim Wechsel); `leistungCap` nutzt sie unverändert.
- `js/spiel.js` `frameCap`: Startbildschirm 30; „30 (Akku)“ → `leistungRuheCap(30)`. Ergebnis bei „30 (Akku)“ +
  „Akku schonen“: 30 im Spiel, 20 in Fenstern, auf der großen Karte und im Stillstand (20 s ohne Eingabe, Figur steht,
  kein Kampf), 24 als Endstufe des Wärmeschutzes. „Auto“ und „Max“ unverändert.
- `css/style.css`, Block „Sparoptik“ am Ende (alles unter `.spar-fx`): kein Balkenglanz, keine Übergänge an den
  Balken (sonst startet jedes Setzen der Füllung eine Compositor-Animation); Ulti bereit = fester Goldring, Segen fehlt
  = fester hellblauer Ring (heller Stand der Keyframes); Statuspunkt-Knopf, Verstärkung, Tagesbelohnung, fertige
  Aufträge, Erwecken mit festem Schein statt Pulsieren (die Statuskugel im Charakterfenster bleibt im hellen Stand);
  laufender Buff an der Fertigkeit als ganzer Lichtring statt drehendem Bogen (Restzeit bleibt); Auto-Angriff läuft =
  festes Leuchten; kein Goldglanz, feste Sternchen im Inventar; Vignette aus. `css/seltenheit.css`: Gold-Seltenheit
  fest im hellen Stand. Bewusst geblieben (kurz und wichtig): wenig Leben/Herzschlag, Buff läuft ab, Fertigkeit
  bereit, Tauschen, Schmied, Zonen-Banner.
- `js/drei-kern.js` `warpFade`: beim Start sichtbar, nach dem Aufziehen (`transitionend`, Ersatz nach 650 ms, nur wenn
  die Deckkraft dann wirklich 0 ist) `hidden` – für alle Grafikstufen, sieht gleich aus.
- **Nicht übernommen:** `will-change: transform` an den großen HUD-Gruppen (Gate). Gemessen: Stadt 14 → 26 Ebenen,
  sichtbare Fläche nur 5,31 → 4,87 Bildschirme (Ziel: −1), im Kampf sogar 5,50 → 5,97. `.hud-bottom` ist am Handy
  bildschirmgroß (wird selbst zur Vollbild-Ebene), und `#chatBox` enthält fest positionierte Kinder (die eine
  Transformation an der Gruppe verschieben würde).

### Messung vorher/nachher

Gesamtprofil (`messen/alles.sh`, ohne 3D-Dreiecke außer „GPU mit Dreiecken“; Zeiten streuen – andere Messungen liefen
parallel, die Zähler sind exakt). Vorher 15.52, nachher 15.52 + Sparoptik, gleiche Lagen:

| Kennzahl | stehen | laufen | kämpfen | Inventar | 2D kämpfen |
|---|---:|---:|---:|---:|---:|
| Endlos-Animationen (Zähler-Probe) | 6 → 0 | – | 9 → 0 | 47 → 0 | 8 → 0 |
| Ebenen (Zähler-Probe) | 22 → 9 | – | 28 → 12 | 54 → 14 | 30 → 8 |
| Zusammensetzungen je Spielbild | 2,2 → 0,6 | 3,1 → 0,9 | 2,6 → 1,0 | 4,5 → 0,4 | 1,9 → 1,3 |
| Paints/s | 75,3 → 0 | 37,2 → 1,1 | 62,2 → 50,6 | 29,9 → 0 | 17,6 → 12,8 |
| Raster-Aufgaben/s | 41,3 → 0 | 22,4 → 1,4 | 54,4 → 24 | 10,2 → 0 | 19,5 → 8,5 |
| Stil-Neuberechnungen/s | 24,8 → 3,1 | 12,3 → 3,8 | 11,9 → 13,3 | 2,7 → 3,1 | 5,3 → 5,6 |
| GPU-Prozess ms je Spielbild (ohne Dreiecke) | 109 → 50 | 125 → 57 | 214 → 162 | 906 → 81 | – |
| GPU-Prozess ms je Spielbild (mit Dreiecken) | 656 → 650 | 598 → 621 | 865 → 835 | 1487 → 823 | – |
| Spielbilder/s (Grenze) | 23,8 (30) → 22,1 (20, Ruhe) | 10,5 → 25,9 | 6,5 → 14,1 | 2,6 (30) → 16,1 (20) | 4,5 → 10,9 |

- Vorher war der GPU-Prozess (SwiftShader) durch das Zusammensetzen der Animationen ausgelastet, der Hauptthread
  wartete auf ihn („Canvas/WebGL-Übergabe“ 52–81 % der Hauptthread-Zeit) – darum liefen damals weniger Spielbilder.
  Nachher schafft die Emulation fast die volle Rate; Kennzahlen je Sekunde steigen dadurch teils (mehr Spielbilder),
  vergleichbar sind die Werte **je Spielbild**.
- Stehen ohne Ruhe (jede Sekunde eine Eingabe, im selben Zeitfenster gemessen): GPU-Prozess ms je Spielbild 15.52
  97,8 → Gegentest „alle CSS-Animationen aus“ 51,5 → Sparoptik 45,6. Die Sparoptik erreicht also den Gegentest.
- Hauptthread Stil + Paint (DOM) + Commit je Spielbild, stehen: 8,8 → 4,3 ms (49 %). Den Rest macht jetzt fast nur der
  Commit (rund einer je rAF-Aufruf, auch bei übersprungenen Bildern – siehe Offen).
- Kampf: Zusammensetzungen je Spielbild 1,0 wie im Gegentest (15.52: 3,0). Die GPU-Zeit je Spielbild im Kampf ist
  unter Last nicht stabil messbar (162 bei 14 Bildern/s, 304 bei 4 Bildern/s; 15.52 im selben Fenster 285); sie
  stammt dort vor allem aus der 2D-Ebene (Schadenszahlen, Beschriftungen) und DOM-Änderungen, nicht aus CSS.

HUD/DOM/CSS (`messen/domcss-alles.sh`, Krieger, Gerätesprache Deutsch):

| Kennzahl | Stadt stehen | Stadt laufen | Kampf | Inventar | 2D Kampf | 2D Stadt |
|---|---:|---:|---:|---:|---:|---:|
| laufende Animationen | 5 → 0 | 5 → 0 | 10 → 0 | 48 → 0 | 8 → 0 | 6 → 0 |
| Ebenen | 27 → 14 | 27 → 14 | 41 → 17 | 64 → 20 | 35 → 12 | 27 → 12 |
| Vollbild-Ebenen | 6 → 5 | 6 → 5 | 6 → 6 | 9 → 7 | 5 → 4 | 5 → 4 |
| sichtbare Fläche (Bildschirme) | 6,36 → 5,31 | 6,36 → 5,31 | 6,80 → 6,86 | 9,96 → 8,07 | 5,75 → 4,36 | 5,70 → 4,31 |
| Zusammensetzungen je Spielbild | 3,46 → 0,78 | 2,10 → 0,69 | 1,61 → 0,94 | 8,07 → 0,91 | 2,40 → 0,78 | 2,79 → 0,72 |
| Zusammensetz-Fläche je Spielbild (Mio. Geräte-Px) | 65 → 12 | 39 → 11 | 33 → 19 | 238 → 22 | 41 → 10 | 47 → 9 |
| Zusammensetz-Fläche je Sekunde (Mio. Geräte-Px) | 678 → 310 | 450 → 304 | 202 → 224 | 333 → 385 | 164 → 150 | 311 → 282 |
| Spielbilder/s im Messfenster | 10,4 → 25,4 | 11,4 → 28,1 | 6,2 → 11,7 | 1,4 → 17,7 | 4 → 14,9 | 6,6 → 30,6 |

- `#warpFade` taucht nach einem Teleport nicht mehr in der Ebenenliste auf (vorher Vollbild-Ebene „Overlap“).
- Die Vignette weg bringt keine Ebene weniger: Ohne sie wird `#hud` selbst zur bildschirmgroßen Overlap-Ebene (fast
  leer). Mit sichtbarer Vignette brauchte der GPU-Prozess im selben Aufbau aber 1457 statt 1317 ms/s bei gleicher
  Bildrate (eine Messung) – der volle Verlauf muss in jedem Bild mit verrechnet werden.
- Gegentest „alle Animationen und Übergänge aus“ auf dem neuen Stand: in der Stadt keine Änderung mehr
  (Zusammensetzungen je Spielbild 0,72 → 0,69).

Bildtakt (`messen/logik.js`, Arbeitsstand): Inventar offen Grenze 30 → 20 (17,1 Spielbilder/s), Stadt mit Eingabe 30.
Kurztest in der Seite: Spiel 30, Fenster 20, nach 25 s ohne Eingabe 20, nach einem Tipp wieder 30, Wärmeschutz-
Endstufe 24; „Ausgewogen“ bleibt in Fenstern bei 30; „Auto“ unverändert (30 / Fenster 20).

Höhere Optionen unverändert (Grafik „Mittel“, Bildrate „Auto“, Stadt): keine Klasse `spar-fx`, 5 laufende
Animationen, 27 Ebenen, 6,36 Bildschirme, Grenze 30 – identisch mit 15.52. Der HUD-Bearbeitungsmodus (verschieben,
skalieren) funktioniert mit der Sparoptik unverändert.

### Offen

- Je rAF-Aufruf (60/s) läuft ein Commit samt PrePaint/Layerize, auch wenn `frame` das Bild überspringt (gemessen rund
  ein Commit je rAF in der Stadt). Ursache nicht geklärt; ein Takt ohne rAF für übersprungene Bilder wäre ein eigenes
  Paket (Risiko ungleichmäßiger Bilder).
- Kampf: GPU-Arbeit je Spielbild hängt jetzt an 2D-Ebene und DOM-Paints (Abklingzeiten, Schadenszahlen), nicht mehr
  am CSS.
- Nicht auf einem echten iPhone gemessen; WebKit setzt Ebenen anders zusammen als Chromium. Die Zähler (laufende
  Animationen, Zusammensetzungen je Spielbild, Paints) sind aber unabhängig vom Browser die Arbeit, die wegfällt.

### Neue Texte

Keine.

## Wärme 2 – Fenster: Figurenbild steht still, Welt hinter Vollbild-Fenstern ruht

Gleicher Spieler, gleiche Einstellungen (Grafik „Niedrig“, „30 (Akku)“, „Akku schonen“). Gemessen im Inventar (Kazehana,
Inventar offen) war nach der Sparoptik der größte Posten das **lebende Figurenbild**: `portraitLive3` zeichnete die Figur
etwa 6-mal je Sekunde in ein eigenes Zielbild und las es jedes Mal synchron von der Grafikkarte zurück
(`readRenderTargetPixels` + `putImageData`, eigene rAF-Schleife `tick`). Der Hauptthread wartete dabei auf die
Grafikkarte (`CommandBufferProxyImpl::WaitForGetOffset` 392 ms/s, `readPixels` 41 % der CPU-Zeit). Dazu zeichnete die
3D-Welt hinter dem Inventar mit voller Rate weiter, obwohl das Fenster am Handy 88 % des Bildes fast deckend verdeckt.

### Änderungen

- `js/drei-figuren.js` `v3Portrait`: mit der Sparoptik (`sparOptik()`, Grafik „Niedrig“) kein lebendes Bild mehr – die
  Figur wird einmal gezeichnet, am Handy werden Zielbild und Auslesepuffer danach sofort freigegeben (`v3PortraitFree`).
  Neu gezeichnet wird wie bisher beim Öffnen, bei jedem Ausrüstungswechsel und beim Antippen (Drehen) – `drawDoll`
  (Inventar, Schmied, Betrachten, Charakterfenster) und die Aussehens-Vorschau rufen `v3Portrait` dann ohnehin auf.
  `portraitLive3`/`tick` endet, sobald die Sparoptik gilt (Grafik bei offenem Fenster auf „Niedrig“ gestellt).
  Grafik „Mittel“ und höher: lebendes Bild wie bisher (12 Bilder/s).
- `js/waermeschutz.js`: `leistungVerdeckt()` – wahr, wenn die Sparoptik gilt, das Spiel läuft, ein offenes `.panel`
  (außer `#panelDeath`) mindestens 70 % des Bildschirms deckt (`getBoundingClientRect`, höchstens alle 500 ms gemessen)
  und keine Laufeingabe aktiv ist (Steuerknüppel, Lauftaste, Laufziel per Maus; `leistungLaufEingabe`, jedes Bild).
  Schließt das gemerkte Fenster auf irgendeinem Weg (`hidden`), wird sofort neu geprüft; `leistungFensterWechsel()`
  setzt die Messung (und die Ruhe-Prüfung `HEAT.panelAt`) zurück.
- `js/oberflaeche.js` `ui.closePanels` (läuft auch bei jedem `ui.toggle`): ruft `leistungFensterWechsel()`.
- `js/spiel.js` `frame`: Ist die Welt verdeckt, wird `render()` nur gezeichnet, wenn das letzte gezeichnete Bild 250 ms
  zurückliegt (rund 4 Bilder/s). `update()` läuft unverändert im Ruhetakt 20/s (Kampf, Ton, Netz), `tickBigMap` auch.
  Die Zeichenflächen behalten ihr letztes Bild. Ein Bild, in dem sich die Größe der Zeichenflächen ändert
  (`renderer.resizeDue` zu Beginn, Größe der 2D-Fläche oder `V3.sizeKey` danach – auch durch `checkViewSize` oder
  `adaptQuality` im selben Bild), wird immer gezeichnet: das Setzen der Größe leert die Flächen (weißes Aufblitzen).

### Messung vorher/nachher

`messen/messen.js --lagen inventar,stand` und `messen/probe-zaehler.js --lagen inventar` (emuliertes iPhone 13,
Hauptthread 4-fach gedrosselt, SwiftShader; Fenster 1–4 ohne 3D-Dreiecke). „Vorher“ = 15.52 + Sparoptik, im selben
Zeitfenster direkt danach gemessen. Parallel liefen Messungen anderer Helfer; die Zähler sind exakt.

| Kennzahl (Inventar offen) | vorher | nachher | Änderung |
|---|---:|---:|---:|
| gezeichnete Spielbilder/s (Grenze 20) | 13,8 | 3,7 | −73 % |
| Zeichenaufrufe/s | 1104 | 300 | −73 % (−81 % gegenüber vollen 20 Bildern/s) |
| Dreiecke/s (Mio.) | 4,98 | 1,35 | −73 % |
| 2D-Bildpunkte/s (Mio.) | 18,2 | 4,9 | −73 % |
| `readPixels` / `putImageData` je s (Zähler-Probe) | 3 / 3 (42 480 Bildpunkte je Auslesen) | 0 / 0 | −100 % |
| rAF-Schleifen (Zähler-Probe) | Spiel + `tick` | nur Spiel | |
| Hauptthread beschäftigt ms/s (Trace) | 973 | 475 | −51 % |
| davon Warten auf die Grafikkarte (`WaitForGetOffset`) ms/s | 392 | 0 | −100 % |
| Hauptthread Canvas/GPU-Übergabe ms/s | 437 | 7,7 | −98 % |
| JS im Spieltakt ms/s | 430 | 285 | −34 % |
| GPU-Prozess ms/s (ohne Dreiecke) | 1014 | 211 | −79 % |
| Compositor-Bilder/s (DrawFrame) | 12,9 | 3,8 | −71 % |
| WebGL-Aufrufe/s (Zählfenster) | 3756 | 1557 | −59 % |
| GPU mit Dreiecken: ms je gezeichnetem Bild | 846 | 424 | −50 % |

- Im Profil (Selbstzeit) steht `readPixels` nicht mehr (vorher 41,2 % an erster Stelle); oben stehen jetzt die
  Spiel-Logik im Ruhetakt (`snd.update`, `update`, `updateMonsters`) – Thema der Logik-Pakete.
- Der Hauptthread ist im Inventar jetzt zur Hälfte frei (Leerlauf 27 → 525 ms/s). Dadurch läuft rAF mit der vollen
  Bildschirmrate (25 → 56 Aufrufe/s; übersprungene Bilder kosten fast nichts, die zugehörigen Commits werden meist
  abgebrochen: `MainFrameAborted` 51/s, 14 ms/s) – siehe „Offen“ im Abschnitt Sparoptik.
- Lage „stehen“ (kein Fenster) ist unverändert: je Spielbild gleich viele Funktionsaufrufe (44 900 / 44 600),
  Canvas-Aufrufe (485 / 481) und Zeichenaufrufe; die Raten je Sekunde schwanken mit der Last der anderen Messungen.

Bildtakt und Logik (`messen/logik.js --lagen fenster`: Feld, Monster ringsum, Inventar offen; gleiche Zeitfenster):

| Kennzahl | vorher | nachher |
|---|---:|---:|
| `update` je s (Ruhetakt) | 17,9 | 19,4 |
| `render` / `renderDrei` je s | 17,9 | 3,4 |
| `gl.render` je s (Welt + Figurenbild) | 23,7 | 3,4 |
| rAF-Schleifen | `frame` (spiel.js) + `tick` (drei-figuren.js) | nur `frame` |
| `frame` ms/s (4× gedrosselt) | 626 | 376 |
| davon `render` ms/s | 440 | 110 |
| CPU-Profil: beschäftigt / Leerlauf (10 s) | 11 101 / 772 ms | 6 670 / 5 169 ms |
| CPU-Profil: `readPixels` | 14,5 % | – |
| Grafikprozess, alle Threads (SwiftShader, Viz) ms/s | 1 235 | 225 |

### Funktionsprüfung (iPhone 13 quer, Grafik „Niedrig“)

- Inventar: Figur sichtbar (97,6 % der Fläche gezeichnet), kein leeres oder graues Bild; Helm abgelegt → Bild neu;
  Antippen → Figur dreht sich (je ein Auslesen). Schmied, Betrachten: Bild vorhanden. Im Fenster 18,6 Spielbilder/s
  (`update`), 3,6 gezeichnete Bilder/s, 0 × `readPixels`, Zielbild freigegeben.
- Schließen: das erste Spielbild danach zeichnet (`update` 32 ms, `render` 33 ms nach dem Schließen), Bildschirmfotos
  direkt danach ohne weißes oder leeres Bild (Helligkeit wie vor dem Öffnen).
- Drehen bei offenem Inventar (hochkant und zurück): nach dem Schließen stimmen 2D- und 3D-Fläche (1688×780 bzw.
  844×390 @ 1,25).
- Monster greifen bei offenem Inventar an: Leben sinkt, das Tod-Fenster erscheint, die Welt wird danach wieder gezeichnet.
- Grafik „Mittel“, Bildrate „Auto“: lebendes Bild (`tick` läuft, Auslesen wie bisher), die Welt wird hinter dem Fenster in
  jedem Spielbild gezeichnet. Wechsel auf „Niedrig“ bei offenem Inventar: `tick` endet, Welt ruht.
- 2D: im Inventar 20 Spielbilder/s, 3,8 gezeichnet; Schließen zeichnet sofort.

### Offen

- Der Hauptthread bleibt im Inventar bei rund 475 ms/s (4-fach gedrosselt), Ziel waren 300. Der Rest ist die
  Spiel-Logik im Ruhetakt 20/s (`snd.update`, `update`, `updateMonsters` mit Durchläufen über alle Monster der Welt)
  und der rAF-Takt mit 56 Aufrufen/s – beides eigene Pakete.
- Das stehende Figurenbild wird bei einer Größenänderung des Fensters (Drehen mit offenem Inventar) nicht neu gezeichnet,
  bis man es antippt, die Ausrüstung wechselt oder das Fenster neu öffnet (die Fläche wird dann nur skaliert).
- Nicht auf einem echten iPhone gemessen. WebKit zeigt wie Chromium das zuletzt gezeigte WebGL-Bild weiter, solange
  nicht neu gezeichnet wird (Standardverhalten ohne `preserveDrawingBuffer`).

### Neue Texte

Keine.

## Wärme 2 – Spiel-Logik ohne Weltschleifen (Gebietsverzeichnis und Nähe-Listen)

Gleicher Spieler, gleiche Einstellungen. Nach Sparoptik und Fenster-Paket war die Spiel-Logik der größte
CPU-Posten außerhalb der Grafik: Die Welt hat rund 8.700 Monster, 580 NPCs und 2.350 Lichtpunkte, und je Spielbild
liefen 4–12 Schleifen über **alle** Monster der Welt (Monsterlaute, 3D-Haken von Endboss und Instanzen,
Aufräumen in `updateMonsters`, Schadensmesser, Bossbalken, Karte, 2D-Bild, Geschosse), dazu je Bild alle NPCs
(nächster NPC, Namen, 3D-Figuren) und alle Lichtpunkte. Das kostete Rechenzeit **und** Speicher (Speicherbereinigung).
Seit 14.26 zeichnet `v3Monsters` nur die Gebiete (Maps, Dungeons), deren Rechteck um die Startplätze in die Nähe der
Kamera reicht; diese Regel gilt jetzt für alle diese Stellen, auf jeder Grafikstufe und in 2D gleich.

### Änderungen

- `js/gegner.js` `monsterIndex()` (Neuaufbau bei geänderter Liste, sonst seit diesem Paket nur noch alle 10 s statt
  alle 2 s – jede Änderung der Liste ersetzt das Feld oder ändert seine Länge) legt zusätzlich an: `MON_INDEX.big`
  (Seelensteine, Monster mit `type.boss`, `type.raid`, `type.raidBoss`), `MON_INDEX.inst` (`type.inst`),
  `MON_INDEX.night` (Nachtmonster) und je Gebiet ein Rechteck um die Startplätze ± `MON_AREA_PAD` (die größte
  Verfolgungsstrecke, bisher `MONS3_PAD` in drei-kern.js), `MON_INDEX.gen` zählt die Neuaufbauten.
  Neu `monstersNear(x, y, R)`: alle Monster der Gebiete, deren Rechteck den Kasten (x ± R, y ± R) schneidet. Die Liste
  wird nie verändert (ein Gebiet: dessen Liste; mehrere: zusammengesetzt und bis zum nächsten Neuaufbau aufgehoben),
  darum stören sich verschachtelte Aufrufe nicht (Treffer in einer Geschoss-Schleife fragt `enemiesNear`).
  Ende von `updateMonsters`: tote Wellenmonster je Bild nur in den gerechneten Gebieten (`MON_INDEX.list`) suchen;
  für die ganze Welt gilt, was der letzte Neuaufbau dabei gesehen hat (`MON_INDEX.gone`, kein eigener Durchlauf).
- `js/drei-kern.js` `v3Monsters()` = `monstersNear(V3.focus, R)` mit dem bisherigen R. `v3UpdateLights`: Nähe-Liste der
  Lichtpunkte (|dx|, |dz| < `LIGHT_REACH3` + 12), neu alle 0,5 s oder nach mehr als 2 Einheiten Weg; die Paare
  [Abstand, Licht] werden wiederverwendet. `drawOverlay3`: NPCs aus `npcsNear()`.
- `js/zeichnen.js`: neu `npcsNear()` – NPCs im Umkreis der Sichtweite (wie R in `v3Monsters`) + 8 Kacheln um den
  Kamerafokus; neu gebaut nach 0,5 s, wenn `game.world.npcs` ersetzt wurde oder seine Länge sich ändert, nach mehr als
  4 Kacheln Weg oder wenn die Sichtweite wächst. `render` (2D): Monster aus `monstersNear(Kameramitte, halbe
  Sichtdiagonale)`, NPCs aus `npcsNear()`.
- `js/spiel.js` `updatePlayer` (nächster NPC in 70 px), `js/drei-figuren.js` `v3SyncActors`: `npcsNear()`.
- `js/klang-welt.js` `snd.update`: `monstersNear(Figur, 900)`. Wer im vorigen Durchlauf nicht dabei war (Zähler
  `tick`), wird still übernommen (`_sDead`, `_snd.hit/atk/state` gesetzt, kein Laut) – kein Todeslaut beim Betreten
  einer Karte oder nach einem Teleport. Das bisherige Nachführen von `_sDead` für alle fernen Monster entfällt.
- `js/kampf.js`: `enemiesNear` baut `NEAR_FOES` aus `monstersNear(Figur, NEAR_FOES_R)`; der Rückfall
  `aliveEnemies(x, y, r)` nimmt nur die lebenden Monster aus `monstersNear(x, y, r + 160)` (plus Duellgegner und
  `pvpFoes` wie bisher). `updateProjectiles`: beide Trefferschleifen (Geschosse der Mitspieler, eigene Geschosse) über
  `monstersNear(Geschoss, Radius + 200)` statt je Geschoss und Bild über alle Monster.
- Bosse und Seelensteine über `MON_INDEX.big`: `js/schadensmeter.js` `dmBossNow`, `js/musik.js` `bossNear`,
  `js/oberflaeche.js` `updateBossBar`, `js/klang-dateien.js` `prefetch`.
- `js/endboss.js` `fx3Raid` (Taumel-Sterne): `MON_INDEX.raids`. `js/instanzen.js` `fx3Inst`, `instWatch` (Vorstellung
  der Wächter) und `instScan`: `MON_INDEX.inst`.
- `js/karte.js` `drawMapMarks` (Minikarte und große Karte): `monstersNear(Mitte des Ausschnitts, halbe Diagonale)`.
- `js/turmfinale.js` `tfNpcs`: Truhe und Schmied werden in `turmFinaleSieg` gemerkt und in `tfNpcsWeg` vergessen
  (gilt nur für die Welt, in der sie entstanden sind) – vorher filterte `tfTick` je Bild alle NPCs.
- `js/nekro-totenruf.js` `graveTick`: sofort zurück, wenn die Klasse keinen Totenruf hat und keine Gräber liegen.
- `js/netz.js`: `netSnapshotFor` (Host, je Mitspieler 10-mal je s) über `monstersNear(Mitspieler, NET_VIEW)`, der
  Kasten-Test bleibt. `netMirrorMonsters` (Mitspieler, jedes Bild) nur `monstersNear(Figur, NET_VIEW + 600)`; einmal
  je Sekunde ein voller Durchlauf, der `hitFlash/attackAnim/windup` ferner Monster auf 0 setzt und sie an `tx/ty` stellt.
- Zusätzlich (nicht im Plan, gleiche Regel): `js/tag-nacht.js` – `topUpNightMonsters`, `retreatNightMonsters` und
  `clearDeadNight` (alle 2 s) zählen über `MON_INDEX.night`; eine neue Monsterliste (Kopie aller Monster, danach
  Neuaufbau des Verzeichnisses) entsteht nur noch, wenn wirklich ein Nachtmonster verschwindet.

### Messung vorher/nachher

`messen/logik.js --lagen stadt,feld,fenster,karte,feld2d --quelle arbeit` (emuliertes iPhone 13 quer, Hauptthread
4-fach gedrosselt, Grafik „Niedrig“, „30 (Akku)“, „Akku schonen“, Ton an). Vorher = Arbeitsstand vor diesem Paket
(15.52 + Sparoptik + Fenster-Paket, eingefroren), nachher = derselbe Stand + diese Dateien; drei Paare abwechselnd im
selben Zeitfenster. In Paar 1 lief gleichzeitig die Funktionsprüfung (Zeiten von „nachher“ verfälscht), Paar 1 und 2
noch mit Neuaufbau alle 2 s und eigenem Aufräum-Durchlauf. Unten Paar 3 (Endstand). Zeiten streuen stark (4 Kerne,
andere Messungen parallel); die Zähler sind exakt. „ms je Bild“ = ms je s ÷ gezeichnete Bilder je s.

| Kennzahl | Stadt vorher | Stadt nachher | Feld (Kampf) vorher | Feld nachher |
|---|---:|---:|---:|---:|
| Durchläufe über alle Monster der Welt je Bild | 4,46 | 0,01 | 4,73 | 0,03 |
| Monster-Schritte dieser Durchläufe je s | 923.500 | 2.600 (−99,7 %) | 527.900 | 16.100 (−97 %) |
| Speicher je Bild (KB) | 579 | 247 (−57 %) | 1.262 | 801 (−37 %) |
| kleine Speicherbereinigungen je s | 0,50 | 0,17 | 0,50 | 0,33 |
| `update` ms je Bild | 8,6 | 3,0 (35 %) | 17,1 | 7,0 (41 %) |
| `frame` ms je Bild | 31,8 | 19,9 (63 %) | 63,6 | 52,1 (82 %) |
| `render` ms je Bild | 21,3 | 14,7 | 44,1 | 42,4 |
| `snd.update` ms je Bild | 2,79 | 0,12 | 4,59 | 1,12 |
| `v3SyncFx` ms je Bild | 4,41 | 0,68 | 14,0 | 13,6 (Kampfeffekte) |
| `hyp` je Bild | 6.096 | 3.221 (−47 %) | 9.489 | 5.499 |
| `v3InView` je Bild | 2.350 | 1.270 | 3.700 | 2.535 |
| Bilder je s (Grenze 30) | 23,9 | 28,7 | 12,6 | 14,9 |

Weitere Lagen (Paar 3): Inventar offen („fenster“) Durchläufe je Bild 12,1 → 0,07, Speicher 3.664 → 1.444 KB je Bild,
`update` 75 → 36 ms je Bild; große Karte offen 8,4 → 0,33 (bei 1,1 gezeichneten Bildern je s), Speicher 2.876 → 1.503
KB; 2D-Kampf 3,3 → 0,33, Speicher 1.317 → 754 KB, `update` 18,7 → 8,4 ms.

- Der eine Durchlauf, der nachher noch je Zählfenster übrig bleibt (`monsterIndex`), stammt vom Messskript selbst: Es
  hängt zum Zählen einen Proxy an `game.monsters`, das ersetzt das Feld und löst einmal den Neuaufbau aus. In der Karte
  und im 2D-Kampf (3 gezeichnete Bilder im Zählfenster) wird daraus 0,33 je Bild. Spielcode läuft in keiner Lage mehr
  über alle Monster. Ebenfalls vom Messskript: `.find ?` (Zielsuche der Kampfschleife in logik-seite.js, Feld 0,09).
- Paar 1/2 (Neuaufbau alle 2 s): Stadt 0,05 Durchläufe je Bild, `update` 6,9 → 4,4 bzw. 10,6 → 4,0 ms, `frame`
  35,1 → 24,3 ms je Bild (Paar 2). Gleiche Zähler für `hyp`, `v3InView` und Speicher wie Paar 3.
- Höhere Optionen (`--grafik mittel --fps auto --leistung max --lagen stadt`): Durchläufe 4,42 → 0,01 je Bild,
  Bilder je s 21,5 → 22,0, `update` 8,5 → 3,3 ms, Speicher 541 → 249 KB je Bild.
- Was die Logik spart, nutzt der Hauptthread am Handy teils für mehr rAF-Runden (Stadt 29,6 → 51,2 je s, gezeichnet
  bleibt es bei der Grenze 30) – das ist das letzte Paket (rAF-Schlaf).

### Funktionsprüfung

Playwright, iPhone 13 quer, `Math.random` mit festem Startwert, die alten Funktionen (aus dem Stand vorher) als Referenz
in derselben Seite auf demselben Zustand (Skripte unter `scratchpad/waerme2/w1/`, `funktion.js`):

- Monsterlaute im Feld (10 Monster, 30 s, neue und alte `snd.update` im selben Bild, alte mit eigenen Feldern):
  Angriff/Schmerz/Tod/Schrei/Einschlag 4/20/0/0/39 gegen 4/20/0/0/39 – gleich. Stadt 8 s: 0 und 0.
- Teleport in ein fremdes Gebiet mit 10 toten Monstern im Umkreis von 900 px: 0 Todeslaute (neu und alt).
- Boss (Kriegsherr Gor'thak) und Endboss (Ursus): `music.mood()` und `music.key` = `boss`, Bossbalken sichtbar.
- Seelenstein angeschlagen: `DMETER.boss[0]` = dieser Stein.
- Instanz (Molgrath): `fx3Inst` 5 Teile neu wie alt; Endboss mit `staggerFx`: `fx3Raid` 5 Teile (Sterne) neu wie alt.
- Minikarte und große Karte (Stadt, Feld, 2D): gleich viele Punkte (28/590, 29/600, 32) mit neuer und alter
  `drawMapMarks`.
- 2D `render`: gleich viele gezeichnete Monster und NPCs (Stadt 0/10, Feld 10/0).
- `enemiesNear` an 200 Zufallspunkten (126 im schnellen Weg, Rest Rückfall): im Umkreis r + 160 dieselbe Menge
  (200/200); im schnellen Weg genau dieselbe Liste. Der Rückfall liefert statt aller ~8.000 lebenden Monster der Welt
  nur noch die Gebiete in der Nähe (im Mittel 481 statt 3.261 Einträge).
- `updateProjectiles`: 73 Stichproben während Kämpfen (Bogen-Ninja, Feuer- und Blitzmagier), dieselben Geschosse mit
  neuer und alter Funktion 45 Schritte weitergerechnet – dieselbe Trefferfolge in allen 73 (eigene und als
  Mitspieler-Geschosse). Feste 30-s-Kämpfe (900 Schritte `update(1/30)`): Geschoss-Treffer Feuer 28/29, Bogen 47/42.
- Nächster NPC (`game.nearNpc`) an 30 Stellen in Kazehana richtig; Nähe-Liste und alle NPCs liefern im selben
  Augenblick denselben NPC (30/30). NPC-Zeichen in `drawOverlay3`: dieselben 17 NPCs.
- `v3Monsters`: dieselben 596 Monster wie der alte Rechteck-Test.
- Turmsieg: Truhe und Schmied stehen in `game.world.npcs` und in `tfNpcs()`; ohne Lauf entfernt `tfTick` beide wieder.
- Nekromant (Weg der Seelen): 4 getötete Monster → 4 Gräber (neu wie alt). Magier: `graveTick` kehrt sofort zurück.
- Wellenmonster: tote im eigenen Gebiet sind im nächsten Bild weg, tote in einem fremden Gebiet beim nächsten Neuaufbau.
- Netz: `netMirrorMonsters` 600 Bilder neu gegen alt auf denselben Monsterlagen (76 nah, 8.582 fern): Endlagen gleich
  (Abweichung 0 px), Zustände gleich. `netSnapshotFor` an 3 Stellen: dieselben Einträge.
- Kontrollbilder (niedrig 3D Stadt, Plus 3D Kampf, niedrig 2D Kampf, niedrig 3D Kampf): Figuren, Namen, Zeichen,
  Minikarte wie vorher. Keine Seitenfehler.

### Offen

- `solidObstacles` (welt.js) baut viermal je Sekunde ein Raster aus allen ~1.100 Seelensteinen der Welt (rund
  750 KB/s Speicher, 6 % der Zuteilung in der Stadt) – mit `monstersNear` auf die Gebiete der Spieler beschränkbar.
- `instWatch` sucht den Instanzboss alle 0,5 s noch über alle Monster (`find`, nur in einer Instanz).
- Optional aus dem Plan nicht gemacht: Rechteck-Ausschluss in `v3InView` (die Zahl der Aufrufe ist schon halbiert).
- Die Rechtecke gelten nur, solange kein Monster weiter als die größte Verfolgungsstrecke (+ 4 Kacheln) von den
  Startplätzen seines Gebiets weg kommt; sonst wäre es (wie in 3D schon seit 14.26) unsichtbar, unhörbar und nicht
  mehr zu treffen.

### Neue Texte

Keine.

## Wärme 2 – 2D-Ebene über der 3D-Welt: halbe Dichte, Schrift als Bilder, unverändert nicht neu malen, Nachtfärbung in 3D

Gleicher Spieler, gleiche Einstellungen (Grafik „Niedrig“, „30 (Akku)“, „Akku schonen“, 3D). Über der 3D-Welt liegt die
2D-Zeichenfläche `#welt` (Namen, Balken, Zeichen, Schadenszahlen, Wegweiser). Sie war am iPhone 13 1688×780 Bildpunkte
groß (Dichte 2, Regel aus 13.23), wurde in jedem Spielbild ganz geleert und neu bemalt, schrieb jeden Namen zweimal
(Rand + Füllung, rund 21 Schriftwechsel und 22 Schriftzüge je Bild in der Stadt) und war damit nie unverändert – der
Compositor musste sie in jedem Bild neu hochladen und zusammensetzen. Nachts füllte die Nachtfärbung sie zusätzlich ganz
(bemalt 100 % statt rund 4 %). WebKit rastert Canvas 2D am iPhone auf dem Prozessor.

### Änderungen

- `js/zeichnen.js` `resizeRenderer`: Mit der Sparoptik und in 3D hat die 2D-Ebene die halbe Gerätedichte ab 2,6-fach
  (iPhone 13/14: 1,5 → 1266×585 statt 1688×780, −44 % Bildpunkte), sonst höchstens 1,5. Grafik „Mittel“ und höher
  unverändert mindestens 2. `applyOpts` ruft `resizeRenderer` auf, ein Grafikwechsel greift sofort. `v3Anchor`,
  `drawOverlay3`, die Durchsicht um die Figur (`V3.fadeScreen` rechnet mit der Dichte der 3D-Fläche) und das Antippen
  (`v3ScreenToWorld`, CSS-Pixel) nutzen nur `renderer.dpr` bzw. CSS-Pixel – geprüft.
- `js/zeichnen.js`, Beschriftungen als fertige Bilder (alle Grafikstufen, 2D und 3D): `LABEL_CACHE`/`monsterLabel`
  verallgemeinert zu `labelBild(schlüssel, plan, slot)` (Schärfe = doppelte Dichte der Zeichenfläche in halben Schritten,
  im Schlüssel; nach dem Nachladen der Schrift werden alle Bilder verworfen, `document.fonts` „loadingdone“). Als Bild:
  NPC-Namen, eigene Figur und Mitspieler (Rang-Stein, „LVL 80“, Gilde in Gildenfarbe, Name in Gruppen-/PvP-/Normalfarbe –
  ein Bild je Kombination, am Spieler gemerkt; Sprache über `trName`), Diener-Namen, Riss-Name mit Restzeit (eigenes,
  wiederverwendetes Bild, neu gemalt einmal je Sekunde), Questzeichen (`drawNpcMarks`: Plakette, Schein und „!“/„?“ in
  einem Bild), das Ratgeber-„?“ (`js/ratgeber.js`, Schein bleibt live) und der Text des Wegweisers (`js/karte.js`
  `drawGuide`, eigenes Bild, neu nur bei neuem Text). Gemalt wird nur noch per `drawImage`; die Tarnung gilt beim
  Kopieren (`globalAlpha` 0,5). Lebensbalken (`drawBar`) und Sprechblasen bleiben live.
- `js/zeichnen.js` + `js/drei-kern.js` `drawOverlay3`, Overlay nur bei Änderung neu malen (nur mit der Sparoptik): zwei
  Durchgänge. 1. Sammeln: je Schild der Ankerpunkt (`v3AnchorAt`, Lage in ganzen Geräte-Pixeln, Maßstab gerundet), die
  Bilder, Balkenwerte in Hundertsteln, Sprechblasen, Zielpfeil als kurze Schrittliste (`OVL`, `ovImg`/`ovBar`/…), dazu
  die Kameramatrix (gerundet) und die Kennwerte des Wegweisers (`guideOps`). 2. Malen in der alten Reihenfolge
  (`ovReplay`). Sind keine Effekte im Overlay, Geschosse, Teilchen, Zahlen, Duell, Treffer-Rand, Bildschirmblitz und
  keine bewegten Auren (Nekromant, Magier, Knochenschild) aktiv – auch im Bild davor nicht – und ist alles gleich wie im
  letzten Bild, entfallen `clearRect` und Malen: die Fläche behält ihr Bild. Ein Größenwechsel der Flächen zeichnet
  immer, außerdem spätestens alle 2 s ein Bild. Grafik „Mittel“ und höher: jedes Bild wie bisher (dieselbe Schrittliste,
  ungerundet).
- Damit das Überspringen in der Stadt überhaupt greift (in 3D mit der Sparoptik): Questzeichen und Ratgeber-„?“ wippen in
  ganzen Pixeln im gemeinsamen 4-Hz-Takt (`wippZeit`), der Schein des „?“ pulsiert in ganzen Pixeln. **Abweichung vom
  Plan:** Der Wegweiser (`drawGuide`) ist praktisch immer aktiv (automatisch aus den Aufträgen) und hätte als „aktiv“ jedes
  Überspringen verhindert. Mit der Sparoptik in 3D steht er deshalb still (kein Wippen, kein Pulsieren, die zwei Vorläufer
  fest auf halbem Weg – wie die festen Leuchtzeichen der CSS-Sparoptik) und steht in der Schrittliste.
- Nacht- und Gebietsfärbung in 3D (nur Sparoptik und 3D): `drawZoneTint` entfällt im Overlay. Stattdessen
  `v3SyncTint` (`js/drei-kern.js`): eine Fläche direkt vor der Kamera in der Szene (`MeshBasicMaterial`, durchsichtig,
  ohne Tiefentest/-schreiben, ohne Nebel und Tonwertanpassung, `renderOrder` zuletzt), Farbe und Deckkraft aus
  `zoneTintRGBA()` (`js/umgebung.js`, dieselbe Mischung aus `nightTintRGBA()` (`js/tag-nacht.js`, jetzt ein
  wiederverwendetes Feld) und `ambientState.tint`), sichtbar ab a > 0,005. Namen und Zahlen liegen nun über der Färbung
  (vorher um 12 % mitgefärbt). Grafik „Mittel“ und 2D unverändert. `drawHurtVignette` und `drawScreenFlash` bleiben im
  Overlay (ein aktiver Blitz/Rand verhindert das Überspringen).

### Messung vorher/nachher

A/B im selben Zeitfenster: vorher = Arbeitsstand nach dem Logik-Paket (eingefroren, `scratchpad/waerme2/repo-w1`), nachher
= derselbe Stand + diese Dateien (`repo-w2`). Emuliertes iPhone 13 quer (Dichte 3), Hauptthread 4-fach gedrosselt,
SwiftShader, Krieger Stufe 80. Zeiten streuen (4 Kerne, andere Messungen parallel); Zähler sind exakt. Skripte und
Rohdaten unter `scratchpad/waerme2/w2/` (`messen/domcss.js`, `messen/render-alles.sh`, `kern.py`, `probe.js`).

DOM/CSS-Messung (`domcss.js`, Lagen Stadt stehen / Stadt laufen / Kampf; nachts mit `dayNight.force=1`; „NPCs stehen“
mit angehaltenen Stadtbewohnern). „je Spielbild“ = ms je s ÷ Spielbilder je s:

| Kennzahl | vorher | nachher |
|---|---:|---:|
| 2D-Ebene (Puffer) | 1688×780 = 1,32 Mio. Bp | 1266×585 = 0,74 Mio. Bp (56 %) |
| Schriftwechsel je Bild / Schriftzüge (strokeText) je Bild, Stadt | 21 / 22 | 0 / 0 |
| 2D-Aufrufe je Overlay-Bild, Stadt | 67 | 38 |
| `RasterCHROMIUM` Hauptthread, Stadt laufen | 261,6 ms/s | 14,2 ms/s (5 %) |
| geleerte Fläche je Overlay-Bild | 1,32 Mio. Bp | 0,74 Mio. Bp (56 %) |
| GPU-Prozess ms je Bildschirm-Bild, Tag: stehen / laufen / Kampf | 64,2 / 53,8 / 120,4 | 42,7 / 46,1 / 111,6 (67 / 86 / 93 %) |
| Nacht: Overlay bemalt (Anteil der Fläche), stehen / laufen / Kampf | 100 / 100 / 100 % | 4,2 / 2,6 / 7,4 % |
| Nacht: GPU-Prozess ms je Spielbild, stehen / laufen / Kampf | 67,4 / 70,4 / 258,2 | 37,2 / 35,9 / 142,3 (55 / 51 / 55 %) |
| NPCs stehen: Overlay neu gemalt je Spielbild | 1,0 | 0,20 |
| NPCs stehen: geleert MPx/s / GPU-Prozess ms je Spielbild | 25,2 / 48,0 | 2,96 / 27,4 (12 / 57 %) |
| NPCs stehen: `RasterCHROMIUM` Hauptthread | 18,0 ms/s | 1,9 ms/s |

Render-Messung (`render-alles.sh`, umgerechnet auf 30 Bilder/s; iPhone 13):

| Kennzahl | vorher | nachher |
|---|---:|---:|
| 2D-Ebene löschen Bp/s (Mio.), alle 3D-Lagen | 39,5 | 22,2 (56 %) |
| Canvas 2D beschrieben Bp/s (Mio.), stehen / laufen / Kampf | 43,0 / 42,6 / 55,3 | 26,5 / 26,8 / 31,0 (61 / 63 / 56 %) |
| Schriftwechsel/s, stehen / Kampf | 390 / 83,7 | 0 / 7,2 |
| Canvas-2D-Aufrufe/s, stehen | 5.370 | 3.570 |
| Hochladen KB/s, Kampf | 11.460 | 6.831 |
| iPhone 14 Pro Max, 2D-Ebene löschen Bp/s (Mio.) | 48,1 | 27,1 |
| 2D-Ansicht (Kampf): Canvas 2D beschrieben Bp/s | 85,1 | 88,1 (unverändert, eigene Fläche) |

- In der Messlage „Stadt stehen“ laufen Stadtbewohner durchs Bild – deren Schilder bewegen sich, das Overlay malt dann
  in jedem Bild neu (0,99 je Spielbild). Stehen keine NPCs im Bild, sinkt es auf 0,20 (Questzeichen-Takt 4 Hz und die
  Auffrischung alle 2 s). Die Probe ohne Drosselung (`probe.js`) zählt in der Stadt mit laufenden NPCs 13 von 24 Bildern
  gemalt, mit stehenden 6 von 31.
- Nachts entfällt die Vollflächen-Füllung ganz; die Färbung kostet in der 3D-Szene eine zusätzliche, fast leere
  Zeichenfläche (eine Fläche, 2 Dreiecke), die die Grafikkarte im selben Durchgang mischt.
- Die GPU-Zeit am Tag beim Laufen (86 %) und im Kampf (93 %) liegt über dem Ziel (75 % bzw. 90 %); Zeiten streuen unter
  der Last stark, die Zähler (Bildpunkte, Schriftzüge, Hochladen) sinken wie erwartet.

### Funktionsprüfung (Bilder unter `scratchpad/waerme2/w2/bilder*/`, jeweils vor/nach)

- iPhone 13 (Dichte 3) und mit Dichte 2: Stadt, Nacht, Kampf (Grafik „Niedrig“), Stadt bei „Mittel“ und „Hoch“, 2D Stadt
  und Nacht. Namen (9–11 px) gleich lesbar, keine Reste beim Laufen/Kämpfen (Zahlen, Balken, Zielpfeil wandern mit).
- Schild-Varianten (`schilder.js`, Testfläche): eigene Figur mit Gilde und eigenem Balken, Gruppenmitglied (groß, grün),
  Turnierarena (Teamfarbe, Rang-Stein, Gilde), getarntes Gruppenmitglied (halb durchsichtig, mit Sprechblase),
  Questzeichen, Ratgeber-„?“, Monster als Ziel mit Pfeil – vor/nach gleich.
- Sprache Englisch: NPC-Namen englisch („Village Elder Bao“ …); ein Sprachwechsel lädt die Seite neu, alle Bilder neu.
- Nachtfarbe (Mittelwert eines Weltausschnitts): Dichte 3 Helligkeit 93,3 → 93,4, RGB 87,7/93,6/106,3 → 88,2/93,7/105,9;
  Dichte 2 93,0 → 93,4. „Mittel“ nachts: 92,6 → 92,5, Overlay wie bisher voll bemalt (Färbung dort).
- Grafik „Mittel“/„Hoch“: Overlay-Dichte 2 (1688×780), jedes Bild gemalt, keine Färbung in 3D, keine Schriftzüge mehr
  (fertige Bilder). Wechsel „Niedrig“ → „Mittel“ im laufenden Spiel: Dichte und Färbung wechseln sofort.

### Offen

- Laufende Stadtbewohner im Bild verhindern das Überspringen (ihre Schilder bewegen sich). Weiter ginge es nur mit
  Schildern als 3D-Sprites oder einem gröberen Takt für ferne Schilder.
- Mit Nekromant, Magier oder Knochenschild malt das Overlay jedes Bild (Seelenfunken, Schein am Zepter, Knochen kreisen –
  bewegte Auren im Overlay).
- Die Schild-Bilder sind bei „Mittel“ 4-fach (vorher Monster fest 3-fach) – je Bild bis rund 100 KB, der Vorrat wird
  ab 400 Bildern geleert.
- Nicht auf einem echten iPhone gemessen. WebKit rastert Canvas 2D auf dem Prozessor und lädt eine unveränderte Fläche
  nicht neu hoch; die Zähler (Bildpunkte, Schriftzüge, Neuzeichnungen) gelten unabhängig vom Browser.

### Neue Texte

Keine.

## Wärme 2 – 3D-Szene auf „Niedrig“: einfacher Boden, ein Punktlicht, Unterboden zuletzt (15.54)

Alles nur mit der Sparoptik (Grafik „Niedrig“), außer dem Unterboden (bildgleich, alle Stufen). Code in `js/drei-kern.js`.

- **Boden:** `groundLowMat` – drei statt vier Texturabfragen (feines Rauschen, Großrauschen, Pflaster), ohne Sand-Rippeln
  und Schnee-Glitzern. Grasstriche, Kies, Trittspuren, Ascherisse, Pflaster, Lava-Glut und das Absenken der Höhlenwände
  bleiben. Blöcke ohne Ecke über 0,45 nehmen `groundLow` ganz ohne `discard` (Early-Z bzw. HSR am iPhone greifen wieder),
  Blöcke mit Klippen/Mauersockeln `groundLowFade`. Beide Varianten werden beim ersten Blockbau vorab übersetzt
  (`v3WarmGround`).
- **Punktlichter:** Auf „Niedrig“ ist nur eines aktiv (`V3.points`, alle vier in `V3.pointsAll`), es folgt der nächsten
  Lampe mit weichem Wechsel (`v3LowPick`) und wird 2 s nach der letzten Lampe in Reichweite unsichtbar (`v3LowLight`) –
  dann rechnen die Shader ganz ohne Punktlicht. `gl.compile` übersetzt auf „Niedrig“ beide Lichtlagen (Ladebild,
  Sprünge: `v3WarmLights`), der Wechsel tauscht nur das Programm. Feuerfeld und Sturmgericht leihen sich weiter das
  schwächste Licht aus `V3.points`.
- **Unterboden:** `V3.under.renderOrder` 1 statt −10 – nach den deckenden Blöcken gezeichnet, der Tiefentest verwirft
  ihn unter dem Boden (vorher rund 41 % aller Fragmente).
- **Wasser/Moor:** einfache Varianten `fragLow` (ohne Wellenlinien, Glanzfunken, Blasen); Farben je Art gemeinsam
  (`LIQUID3_COL`).
- **Overlay:** Zepterschein, Seelenfunken und Knochenschild stehen mit der Sparoptik still und kommen als Lage in die
  Schrittliste (`ov3AuraOps`); bei stehender Kamera höchstens alle 66 ms neu malen (`OV3_STEP`).
- **v3InView:** Kanten einmal je Bild vorrechnen (`VIEW3.e`) statt vier Wurzeln je Aufruf.

Kontrolle (emuliertes iPhone 13, niedrigste Optionen, SwiftShader): Stadt bei Tag und Nacht bildgleich (mittlere
Abweichung 3–5 Graustufen durch laufende Bewohner), keine Seitenfehler; gerenderte Bilder im selben Zeitfenster Stadt
22 → 28, Nacht 14 → 20, Kampf 11 → 14. Bilder: Scratchpad `waerme2/p1check/`.
