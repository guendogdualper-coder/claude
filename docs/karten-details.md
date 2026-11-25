# Karten-Details: schönere Kristalle, Bodenschmuck und Kleinigkeiten in den Städten

Wunsch des Spielers: „Bei Kristallabgrund sehen die Kristalle nicht wirklich schön aus. Die sind viel zu eckig und so
kegelförmig. Auch über der Stadt musst du das nochmal viel schöner machen, detailreicher. Auch auf der ganzen Map
verteilt. Und ich will, dass du es auf allen Maps nochmal machst und dir anguckst, dass das alles viel schöner aussieht.
Die ganzen Details. Vielleicht auch in der Stadt ein paar Kleinigkeiten noch hinzufügen.“

Seelensteine (die zerstörbaren Steine mit Lebensbalken) sind unverändert. Nichts Neues hat eine Kollision, die Welt
(Boden, Objekte, Wege) bleibt gleich; keine Bodenringe, Runen, Sterne oder Kreise.

## Kristalle (alle Karten mit Kristallen, 3D und 2D)

Bis 15.79 war jeder Kristall ein glattes Sechseckprisma mit Pyramidenspitze in einer Farbe – von oben Bleistifte und
Kegel; in 2D drei winzige Dreiecke.

- **3D** (`kristall3`, `kristallGeo3`, `kristallPal3` in `js/drei-welt.js`): sechs breite Flächen und sechs schmale,
  abgeschrägte Kanten (je Variante leicht unregelmäßig), Spitze in zwei Stufen (Schulter, dann Gipfel außer der Mitte).
  Farben als Eckenfarben gebacken: unten tief und satt, oben hell, jede Fläche nach festem Licht heller/dunkler,
  Kanten als Glanzkanten, in der Mitte jeder Fläche ein heller Streifen (Licht von innen), Spitze fast weiß. Leuchtet
  von selbst (`glow`), im Frost mit Licht und Umriss. Kleine Splitter und Grafik „Niedrig“: einfache Form (18 statt 78
  Dreiecke), gleiche Farben.
- **Kristallgruppen am Boden** (`tplDeco`, `DECO.CRYSTAL`): Felssockel mit Steinchen, drei Bauformen (großer Kristall
  mit Kranz, Zwilling, Fächer), kleine liegende Begleiter, zweite Farbe (`crystal2`) und Fußfarbe (`crystalDeep`) je
  Gebiet. Der runde Lichtfleck am Boden ist weg.
- **2D** (`kristall2d`, `kristallPal2`, `kristallGruppe2d` in `js/umgebung.js`): drei sichtbare Flächen mit Verlauf,
  Spitze aus drei Facetten, dunkler Umriss, Glanzkante, Funkelpunkt; Gruppen mit Felssockel in den Farben des Gebiets
  (dieselben wie in 3D). Beim Backen der Bodenblöcke gemalt – kostet beim Spielen nichts.
- Wahrzeichen-Kristalle (`wzCrystal` in `js/wahrzeichen.js`, `wz2dCrystal`/`wz2dCrystal2` in `js/wahrzeichen2d.js`)
  nehmen dieselbe Form – damit auch Mondsplitter (Mondfall), Blutkristall (Blutsteppe), Eiskristalle und Frostherz der
  Kreuzfeste (Nachtfrost). In 2D einmal als Bild gebacken und nur noch gedreht gezeichnet.

## Kristallabgrund (Karte 10)

| Was | 3D | 2D |
|---|---|---|
| Kristallgruppen am Boden | größer (`crystalScale` 1,4), zweifarbig Eisblau/Violett | gemalte Gruppen, größer |
| Kristallfelder (neu) | zusätzliche Gruppen auf dem violetten Fels: in 4 von 10 Feldern zu 5 × 5 Kacheln eine, in einem Drittel davon eine zweite (`DECO_MEHR`), nicht in der Stadt, eine Kachel Abstand zu Wegen, Brücken, Mauern, Häusern | dieselben Stellen |
| Felsen | Kristallgruppe (drei Kristalle) auf allen Felsen, größer | Felsen mit Kristallgruppe (eigenes Bild) |
| Kristallbäume | facettierte, leuchtende Kristalle an den Ästen | neu: Steinstamm mit Kristallen (vorher braune tote Bäume) |
| Schweben über dem Abgrund | zwei von drei Stellen eine **Kristalldruse** (Kristalle nach allen Seiten um einen dunklen Kern, lose Splitter daneben), sonst ein doppelendiger Kristall mit Begleitern; sanftes Auf und Ab | gemalte Drusen und doppelendige Kristalle |
| Monolithen, Randkulisse | über `wzCrystal`/`k80Gem` automatisch facettiert | Monolithen facettiert |
| Lichtwacht: Krone über der Zitadelle | Band in Silberviolett mit goldenen Rändern, zehn Kristallgruppen in goldenen Fassungen mit Krallen, Zapfen darunter, **Herzkristall** in der Mitte mit drei kreisenden Splittern, abgebrochene Bandstücke an der Lücke | facettierte Kristalle, Herzkristall, goldene Ränder |
| Lichtwacht: Kristallwand | drei facettierte Kristalle je Stück mit silbernem Saum (vorher abgerundete Blöcke wie ein Lattenzaun) | facettierte Kristalle; schräge Wände mit Spitzen |
| Lichtwacht: Kristallpfeiler, Brücken | Pfeiler mit Gesims, hohem Kristall, zwei Begleitern, Splittern; Brückenpfosten facettiert | Pfeiler neu gemalt |
| Lichtwacht: Abgrundspalten | schwebende Kristalle facettiert (über `wzCrystal`), Lichtvorhänge wie bisher | neu: je drei schwebende Kristalle |
| Lichtwacht: Kleinigkeiten | Blumenkästen mit kleinen Kristallen, leuchtende Lichtschwalben | ebenso |

## Alle anderen Karten – gesehen und geändert

Je Karte die Stadt und eine typische Stelle in 3D und 2D angesehen (Bilder vor und nach der Änderung). Größter Mangel
auf allen Karten: in 2D war der Bodenschmuck nur ein paar einfarbige Flächen und Striche; in 3D die Kristalle.

- **2D-Bodenschmuck neu gemalt** (`deco2*` in `js/umgebung.js`, Farben aus `DECO_COLORS` wie in 3D): Baumstumpf mit
  Rinde, Wurzeln, Jahresringen, Moos; liegender Stamm mit Schnittfläche und Aststummel (Aschewald: Glutrisse);
  Pilzgruppe mit gepunkteten Hüten (Moor und Schattenseite in leuchtenden Farben); gekreuzte Knochen mit Schädel; Busch
  aus Bauschen mit Beeren; totes Bäumchen mit Bruchkante (Feuerberg: glühende Risse, Frost: Schnee); Kiesel
  zurückhaltend im Ton des Bodens.
- **2D-Bodenmuster** für Strandsand, Dünengras, Goldgras und hellen Terrassenfels (Karten 18, 19 waren flache
  Farbflächen).

| Karte | gesehen | geändert |
|---|---|---|
| 1 Kazehana | Stadt reich geschmückt | Blumenkästen (rot, gelb, weiß, rosa), Tauben; Büsche/Stümpfe 2D |
| 4 Dunkelwald | 2D Stümpfe, Stämme, Pilze als Ellipsen/Rechtecke | gemalt; Waldlager: Blumenkästen, Spatzen |
| 5 Rostschlucht | 2D Knochen und Totholz als Striche | gemalt; Talwacht: Blumenkästen, Krähen |
| 6 Ödland | rote Kristalle als Kegel | Kristallgruppen; Aschenlager: Kräuterkästen, Raben |
| 2 Schlangental | Knochen/Totholz 2D | gemalt; Sahra: Blumenkästen, Tauben |
| 7 Frostgipfel | Eiskristalle | facettiert mit Umriss und Schnee am Fuß; Frostlager: Tannenzweige mit Schnee, Schneevögel |
| 8 Totenmoor | große leere Moorflächen | zusätzliche leuchtende Pilzgruppen (`DECO_MEHR`, 3D und 2D); Moorwacht: Kästen mit Leuchtpilzen, Raben |
| 3 Donnerklamm | Kristalle, Totholz | facettiert, gemalt; Klammfeste: Blumenkästen, Vögel |
| 9 Feuerberg | Glutkristalle als Kegel | Glutkristallgruppen; Glutlager: Feuerlilien, Raben |
| 11 Mondfall | Büsche/Pilze 2D | Nachtfarben, gemalt; Stadt: Nachtblumen, Lichtschwalben |
| 12 Aschewald | Stämme 2D | mit Glutrissen; Glimmwacht: Blumenkästen, Raben |
| 13 Knochenwüste | Knochen 2D | Knochen mit Schädel; Gebeinwacht: Kräuter, Raben |
| 14 Blutsteppe | Blutkristalle als Kegel | Kristallgruppen; Blutwacht: rote Blumen, Raben |
| 15 Nachtfrost | Kristalle, Eiskristalle der Stadt | facettiert (3D und 2D); Eisnacht: Tannenzweige, Schneevögel |
| 16 Schattenklippen | Kristalle, Schwarzmoor leer | Kristallgruppen, zusätzliche Pilze im Schwarzmoor; Nachtwacht: Blumenkästen, Möwen |
| 17 Seelenhain | Pilze/Büsche 2D | gemalt; Seelenwacht: Mondblumen, Lichtschwalben |
| 18 Nebelküste | 2D ohne Bodenmuster | Strand- und Dünenmuster, Zäune/Kleinkram in Leuchtwacht wie in anderen Städten; Strandkräuter, Möwen |
| 19 Himmelsterrassen | 2D ohne Bodenmuster | Gras- und Felsmuster; Sonnenhof: Lavendel, Tauben |

## Städte: Kleinigkeiten

`STADT_KLEIN` (`js/umgebung.js`) legt je Stadt fest, was sie bekommt:

- **Blumenkästen** unter den Fenstern der Häuser (3D: `blumenkasten3`, an `house3Closed` und an den Vorderfenstern
  begehbarer Häuser in deren ausblendbarer Hülle; 2D: `blumenkasten2` an `houseWindow2`, eigenes Hausbild je Stadt):
  Blüten in den Farben der Stadt, Kräuter, Tannenzweige mit Schnee, leuchtende Pilze oder kleine Kristalle. Hängen an
  der Wand. 3D: Grafik „Niedrig“ ohne Kästen.
- **Vogelschwarm** (3D: `wzVoegel` in `js/wahrzeichen.js`; 2D: `wz2dVoegelListe` in `js/wahrzeichen2d.js`): zwei
  bis drei kleine Schwärme kreisen hoch über den Dächern, Flügelschlag in Schüben, dazwischen Gleitflug; Tauben,
  Spatzen, Raben, Möwen, Schneevögel, leuchtende Lichtschwalben. In 2D mit Schatten am Boden. Grafik „Niedrig“: ein
  Schwarm (2D: 4 Vögel).

Nichts davon verdeckt Wege, Tore, Leute, Teleportsteine oder Stände (Kästen hängen an Hauswänden, Vögel fliegen hoch
über Kopfhöhe).

## Technik

- `DECO_MEHR` (`js/umgebung.js`): Regeln `(x, y, i) → DECO-Art`, die auf freien Kacheln (kein Schmuck außer Gras,
  Kieseln, Rissen) zusätzlichen Schmuck legen – 2D in `renderGroundChunk`, 3D in `objectJob`, an denselben Stellen.
  Genutzt für die Kristallfelder (Karte 10) und die Pilze der Moore.
- 3D-Kristalle: eigene Geometrie je Farbe und Variante im Vorrat (`geo3`), mit den übrigen Teilen eines Blocks bzw.
  einer Wahrzeichen-Stelle zusammengebacken – keine neuen Materialien, keine Lichter, keine zusätzlichen
  Zeichenaufrufe je Kristall. Schwebende Drusen ganz im leuchtenden Mesh (ein Aufruf je Gruppe statt zwei).
- 2D: alles am Boden beim Backen der Bodenblöcke; Wahrzeichen-Kristalle als gebackene Bilder; Leuchten mit dem
  gemerkten Schein (`glow`).

## Leistung (vorher 15.79 → nachher)

Gemessen in Headless-Chromium mit Software-Grafik (SwiftShader), 1280 × 720, Figuren und Effekte während der Messung
ausgeblendet (nur die Welt), 3D nach dem Bau aller Kartenblöcke. Belastbar sind Zeichenaufrufe und Dreiecke; die Zeiten
streuen auf der geteilten Maschine stark.

**3D** – Zeichenaufrufe / Dreiecke im Bild (Hauptszene samt Schattendurchgang):

| Ansicht | Hoch vorher | Hoch nachher | Mittel vorher | Mittel nachher |
|---|---:|---:|---:|---:|
| Lichtwacht (Stadtmitte) | 91 / 378.518 | 90 / 383.784 (+1,4 %) | 90 / 378.035 | 88 / 382.593 (+1,2 %) |
| Kristallhänge (Kristalle, weiter gezoomt) | 85 / 138.717 | 77 / 157.063 (+13 %) | 76 / 127.424 | 63 / 128.298 (+0,7 %) |
| Abgrund (schwebende Kristalle) | 43 / 86.434 | 42 / 108.786 (+26 %) | 39 / 77.656 | 37 / 90.296 (+16 %) |
| Kazehana (Stadtmitte) | 107 / 544.768 | 111 / 551.536 (+1,2 %) | 106 / 544.694 | 110 / 558.540 (+2,5 %) |

Zeichenaufrufe bleiben gleich oder sinken (die schwebenden Kristalle liegen ganz im leuchtenden Mesh, ein Aufruf je
Gruppe); in Kazehana +4 für die Vogelschwärme (die Mittel-Spalte ist ohne die später ergänzten Kästen an den
begehbaren Häusern gemessen, in Hoch sind sie enthalten). Mehr Dreiecke vor allem über dem Abgrund (facettierte Kristalle
und Drusen); die Ansicht bleibt mit gut 0,1 Mio. Dreiecken weit unter einer Stadt (0,38–0,56 Mio.). Alle Wahrzeichen
der Karte zusammen (geladen, nicht im Bild): 0,15 → 0,42 Mio. (Hoch) bzw. 0,25 Mio. (Mittel). Zeichenzeit in
SwiftShader (ms, Median, stark streuend, je nach Last der Maschine): Lichtwacht 6,7 → 11,9 bzw. 12,2,
Kristallhänge 5,7 → 4,2, Abgrund 3,4 → 4,2, Kazehana 9,8 → 11,7 bzw. 15,5 – dieselben Ansichten lagen in anderen
Läufen vorher bei 13,1 und 11,2 ms. Grafik „Niedrig“: einfache Kristallformen, halb so viele schwebende Stellen, in 3D keine
Blumenkästen und keine zusätzlichen Kristallfelder oder Pilze, ein Vogelschwarm.

**2D** (Pixel-Stil, schräge Sicht) – Zeichenzeit je Bild in ms, je zwei Läufe à 60 Bilder (Median / Mittel), vorher
und nachher abwechselnd gemessen:

| Ansicht | vorher | nachher |
|---|---:|---:|
| Lichtwacht (Stadtmitte) | 5,5 · 5,4 / 5,8 · 5,7 | 6,5 · 5,6 / 7,3 · 5,9 |
| Kristallhänge (Kristalle) | 3,7 · 3,7 / 4,7 · 4,3 | 3,7 · 3,9 / 4,2 · 4,5 |
| Abgrund | 3,6 · 3,3 / 4,7 · 3,7 | 4,7 · 3,4 / 4,6 · 4,8 |
| Kazehana (Stadtmitte) | 3,7 · 4,4 / 4,2 · 4,8 | 4,0 · 4,1 / 4,5 · 5,3 |

Im Rahmen der Streuung gleich: der neue Bodenschmuck, die Kristalle und die Blumenkästen werden beim Backen der
Bodenblöcke bzw. Hausbilder einmal gemalt. Je Bild neu kommen nur die Vögel (8 Striche je Stadt) und in Lichtwacht die
schwebenden Kristalle über den Spalten dazu; die Kristalle der Wahrzeichen sind jetzt gebackene Bilder statt Pfade.

## Tests

- `node --check` für alle geänderten Dateien.
- Spiel in 2D und 3D mit Grafik „Hoch“ auf allen 19 Karten gestartet (je Stadt und eine typische Stelle, Kartenwechsel
  per Sprung), dazu „Mittel“ (3D) und „Niedrig“ (2D und 3D) in Lichtwacht, an den Kristallen des Abgrunds, in Kazehana,
  im Totenmoor, in Eisnacht und in Leuchtwacht – keine Fehler im Spiel (`pageerror`).
