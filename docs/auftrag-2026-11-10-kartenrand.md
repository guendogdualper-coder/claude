## Kartenrand | „Am Ende der Map ist einfach so eine Wand“ (seit 14.79)

**Ursache:** Jede Karte schloss in 3D mit einer hohen Wand ihres Gebiets ab (Blütenhecke, Klippe, Basaltsäulen …) auf
einer flachen Böschung; 13 Kacheln draußen stand ein senkrechter, gemalter Horizontring ohne Nebel, dahinter nichts.
Vom Drachen sah man darüber hinweg nur die bemalte Fläche. Kristallabgrund: draußen lief Wasser statt Abgrund.

**Änderung:** neue Datei `js/kartenrand.js` (Doku `docs/kartenrand.md`):
- je Karte eine Art des Randes (Hügel mit Bergen, Hochwald, Tafelberge, Aschemeer, Dschungel und Dünen, Wolkenmeer
  mit Gipfeln, Moor mit Nebelwand, Grate, Vulkanland, Abgrund mit schwebenden Kristallinseln, Nachtvarianten der
  Schattenkarten; Schattenklippen im Norden offenes Meer);
- Nah: bisherige Kulisse je Art kleiner und lichter (Kazehana: Waldrand aus Laubbäumen statt Blütenhecke), auf einem
  Hang, der nach außen weiter steigt (auch der Boden der Blöcke);
- Mitte/Ferne: Geländering 9–130 Kacheln, ein Mesh je ~48 Kacheln, Streuteile aus wenigen Flächen, Dunst je Ecke,
  ferne Berge scheinen blass durch den Nebel; die äußerste Reihe verschwindet im Himmel;
- Nebelbänke am Rand (weich, um die Figur durchsichtig) – der hoch fliegende Drache fliegt in Nebel/Wolken;
- Schulterblick bleibt hinter dem Rand über dem Hang; alter Horizontring auf Karten aus.
- Kollision, Raster, Erreichbarkeit unverändert; nur 3D-Darstellung.

**Dateien:** js/kartenrand.js (neu), js/drei-kern.js, js/drei-welt.js, js/drei-fx.js, index.html, sw.js,
docs/kartenrand.md.

**Messwerte:** Dreiecke je Bild am Rand: niedrig −3 bis +2 %, mittel −4 bis +5 %, hoch im Mittel ±0 (max. +12 %
Schlangental, Schattenklippen −30 %); Ring je Karte 2.144 (niedrig) bis 105.000 (hoch, ganzer Rand). Bau beim
Kartenwechsel 84–139 ms (SwiftShader).

**Tests:** Bilder je Karte am Rand (Boden, Drache hoch im Schulterblick, Drache hoch mit fester Kamera) vorher/nachher,
Collage; mapFormReport vorher = nachher (0 unerreichbar außer Kazehana 9, Prüfsummen aller 16 Karten gleich);
s73 (12 Charaktere) ohne Fehler; Mechanik-Test 24 OK, keine Seitenfehler; keine Seitenfehler in allen 3D-Läufen;
node --check.

**Offen:** Im Schulterblick verschluckt der (unveränderte) Nebel der Gebiete vieles ab ~30 Einheiten – dort sieht man
vor allem den Übergang in Dunst und die blassen Berge. Feinabstimmung der Farben je Karte nach Rückmeldung. Bau
des Rings läuft am Stück (nicht in Zeitscheiben).
