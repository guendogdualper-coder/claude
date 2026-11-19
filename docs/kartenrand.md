# Kartenrand in 3D (seit 14.79)

Wunsch des Spielers: „Wenn man bis zum Ende der Map fliegt (Drache), ist da einfach so eine Wand, das sieht nicht schön
aus. Alle Ränder/Enden der Karten schöner machen, passend zur jeweiligen Map, richtig schön in 3D.“

## Vorher (bis 14.76)

- Randkulisse (seit 8.4, `kulisse3` in `js/drei-welt.js`): auf den vier gesperrten Randreihen und bis 10 Kacheln
  draußen hohe Wandstücke des Gebiets (Blütenhecke, Tannenwall, Klippe, Basaltsäulen …) auf einer Böschung, die bis
  2,2 Einheiten ansteigt und dann flach bleibt.
- 13 Kacheln draußen ein senkrechter Ring aus vier Flächen, 16 Einheiten hoch, mit einem gemalten Bergkamm
  (`placeHorizon3` in `js/drei-fx.js`, ohne Nebel). Dahinter nur noch die Himmelsfarbe.
- Vom Boden aus sah man eine geschlossene Hecke/Wand, vom hoch fliegenden Drachen darüber hinweg die gemalte Fläche
  in kurzer Entfernung – eben „eine Wand“.

## Jetzt

Neue Datei `js/kartenrand.js` (nach `js/kartenformen.js` geladen). Der Rand ist eine Landschaft in Stufen bis zum
Horizont, je Karte eine eigene Art (`RAND3_ART`, Zuordnung über das Gebiet in der Ecke der Karte `RAND3_STIL`, je
Seite `RAND3_SEITE`, Kartenformen mit Meer/Wolken/Abgrund am Rand über `RAND3_VOID`):

| Karte | Art | Abschluss |
|---|---|---|
| 1 Kazehana | `huegel` | Waldrand aus Laubbäumen (rosa Blütenbäume dazwischen) statt Blütenhecke, Hang steigt sanft an, Haine auf Hügeln, dahinter blaue Berge mit Schneekappen |
| 4 Dunkelwald | `hochwald` | undurchdringlicher Tannenwald auf steigendem Gelände, nach außen dunkler, dichte Nebelbänke |
| 5 Rostschlucht | `tafelberge` | Hochplateaus (Gelände in Stufen), Tafelberge mit Schichtbändern, Felsnadeln |
| 6 Ödland | `aschemeer` | Meer bis zum Horizont, Felsnadeln mit Gischt, ferne Klippeninseln mit toten Bäumen |
| 2 Schlangental | `dschungel` | Dschungelwand mit großen Kronen und Blüten, dahinter Dünen bis zum Horizont |
| 7 Frostgipfel | `wolken` | Wolkenmeer mit Wolkenballen bis zum Horizont, ferne verschneite Gipfel ragen heraus |
| 8 Totenmoor | `moor` | flaches Moor mit schwarzen Tümpeln, tote Bäume und Weiden, tiefe Nebelwand |
| 3 Donnerklamm | `grate` (Titanenkamm) | steile Bergkämme ab dem Rand, Felsnadeln |
| 9 Feuerberg | `vulkan` | schwarzer Basalt mit glühenden Lavaadern, Basaltsäulen, ferne Vulkankegel mit glühendem Krater, Rauch |
| 10 Kristallabgrund | `abgrund` | Abgrund bis zum Horizont, schwebende Felsinseln mit leuchtenden Kristallen |
| 11 Mondfall | `huegelNacht` | die Hügel in Nachtblau und Violett |
| 12 Aschewald | `aschewald` | verkohlter Tannenwald, Glutnester am Boden, Aschenebel |
| 13 Knochenwüste | `knochenduenen` | bleiche Dünen, kalkweiße Tafelfelsen und Nadeln |
| 14 Blutsteppe | `blutsteppe` | rote Steppe mit Felszacken, ferne blutrote Berge |
| 15 Nachtfrost | `schneeberge` | verschneite Hänge mit dunklen Tannen bis zu hohen Bergen |
| 16 Schattenklippen | `nachtmeer` (Norden) / `schwarzmoor` | im Norden das offene Meer mit Schären und Gischt (das Meer der Karte läuft weiter), sonst das Schwarzmoor |

Stufen:

1. **Nah** – die bisherige Randkulisse (echte 3D-Stücke mit Umriss), je Art kleiner und ab der zweiten Reihe lichter
   (`RAND3_NAH`), auf einem Hang, der nach außen weiter ansteigt. Der Boden der Blöcke hinter dem Rand nimmt dieselbe
   Höhe und nach außen die Farbe der Landschaft an (`rand3Sample` aus `tileSample`), die Kulisse steht darauf
   (`rand3H` in `kulisse3`). Die erste Wandreihe auf dem Rand bleibt geschlossen.
2. **Mitte** – ein Ring aus Gelände von 9 bis 130 Kacheln hinter dem Rand (`rand3Build`): Reihen nah fein (alle
   3 Kacheln), ab 43 Kacheln grob (alle 9 Kacheln, die Nahreihen enden ohne Risse auf der ersten Fernreihe), in den Ecken
   Viertelkreise. Höhe aus Grundverlauf, Hügeln, Bergkämmen, Tafelbergen, Dünen und Waldkronen; Farbe je Ecke (Boden,
   Wald, Fels, Schnee, Sand, Tümpel, glühende Lava/Glut). Darauf Streuteile aus wenigen flachen Flächen (Tanne 12–18,
   Baum 16–28, toter Baum 10, Felsnadel 15, Tafelberg 28, Basaltsäulen 24–48, Gipfel 28–42, Vulkan 16, Meeresfelsen mit
   Gischt 26, Insel 28, schwebende Kristallinsel 27 Dreiecke). Bäume stehen in Hainen auf den Waldflecken, dazwischen
   bleiben Wiesen frei. Ein Mesh je Abschnitt von rund 48 Kacheln (Sichtprüfung je Abschnitt), Toon-Material wie die
   Welt, ohne Schatten.
3. **Ferne** – Dunst je Ecke (`aHaze`, ab 16 Kacheln langsam, die letzte Reihe ganz in der Nebelfarbe): der Ring endet
   unsichtbar im Himmel. Im Fernring (ab 36–48 Kacheln, `aFern`) scheinen Gelände und große Teile (Gipfel, Vulkane,
   Tafelberge, Inseln) ab 2–12 Einheiten Höhe durch den Nebel (bis 80 % weniger Nebel, mindestens 60 % Dunst): ferne
   Ketten stehen als blasse Umrisse über dem Dunst (Luftperspektive). Flaches Land, Meer, Bäume und alles Nahe
   verschwinden im Nebel wie bisher.
4. **Nebelbänke** am Rand (`rand3Nebel`): weiche Billboards in der Farbe der Art (Dunst, Wolken, Moornebel, Rauch,
   Asche, violetter Schimmer), ziehen langsam; dicht vor der Kamera und um die eigene Figur durchsichtig. Der hoch
   fliegende Drache fliegt am Rand in Nebel/Wolken, nicht gegen eine Mauer.

Der alte Horizontring wird auf Karten ausgeblendet (`v3SyncBounds`), Dungeons behalten ihren Nebelkasten.
Schulterblick: die Kamera bleibt hinter dem Rand über dem Hang (`rand3Cam`).

## Spielregeln

Unverändert: die Kollision (vier gesperrte Randreihen, auch für den Drachen), das Raster der Karten, Wege, Monster,
Erreichbarkeit. Geändert ist nur die Darstellung in 3D; 2D bleibt gleich.

## Leistung

Gemessen im echten Spiel (Chromium/SwiftShader, 640 × 400, Dreiecke je Bild laut `renderer.info`, einschließlich
Schattenbild), je Karte am Rand: Boden/Schulterblick, Drache hoch/Schulterblick, Drache hoch/feste Kamera.

- Grafik **niedrig** (Handy): Ring ohne Streuteile und Nebel, 2.144 Dreiecke für den ganzen Rand. Je Bild Kazehana
  +2,0 % / −2,2 %, Dunkelwald +0,1 % / +0,3 %, Ödland +0,2 % / +0,3 %, Feuerberg −2,8 % / −3,1 %, Nachtfrost −0,3 % /
  −0,2 % (feste Kamera / Schulterblick) – praktisch gleich.
- Grafik **mittel**: Streuteile zu 55 %, gröberer Ring (27.000–44.000 Dreiecke für den ganzen Rand): Kazehana −4,3 % /
  +4,4 %, Dunkelwald +3,0 % / +4,7 %, Feuerberg −3,2 % / −2,7 %.
- Grafik **hoch**: Ring 19.000–105.000 Dreiecke für den ganzen Rand (Schlangental am meisten, danach Dichte der
  Dschungelbäume gesenkt), davon ist je Bild nur der sichtbare Teil dran. Über alle 48 Bilder im Mittel +0,5 %
  (Boden), +0,5 % (Drache), −0,9 % (feste Kamera); am meisten Schlangental +12 % und Mondfall (feste Kamera) +12 %,
  am wenigsten Schattenklippen −24 bis −33 % (Meer statt Wand im Norden). Donnerklamm, Feuerberg, Knochenwüste und
  Blutsteppe sind durch die lichtere Nahkulisse leichter als vorher.
- Bau des Rings beim Wechsel der Karte (zusammen mit dem ohnehin nötigen Neubau aller Blöcke): 84–139 ms auf Grafik
  hoch in der Testumgebung (SwiftShader, stark ausgelastete Maschine); auf niedrig deutlich weniger (keine Streuteile).
- Zeichenaufrufe: je sichtbarem Abschnitt einer (meist 3–6), dazu einer für alle Nebelbänke.

## Einhängepunkte

- `js/drei-kern.js`: `tileSample` (Höhe/Farbe hinter dem Rand, Meer je Seite), `kindAt` im Geländebau (Wasser auf der
  Meerseite), `v3UpdateHome` (`side3`), `v3PlaceCamera` (Schulterblick über dem Hang).
- `js/drei-welt.js`: `kulisse3` (keine Wand auf der Meerseite, Größe/Lichtung je Art, Höhe des Hangs).
- `js/drei-fx.js`: `v3SyncBounds` ruft jedes Bild `rand3Frame` (Ring bauen beim Wechsel der Karte oder Grafikstufe,
  Nebel nachführen) und blendet den alten Ring aus.
- `index.html`, `sw.js`: neue Datei.

**Neue Karte/Art ergänzen**: Eintrag in `RAND3_ART` (oder `base` einer vorhandenen Art plus eigene Farben), Gebiet in
`RAND3_STIL`, bei Bedarf `RAND3_NAH` (Größe der Nahkulisse).
