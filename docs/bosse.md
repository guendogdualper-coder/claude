# Bosse: Bestandsaufnahme und neue Angriffe (seit 15.50)

**Wunsch:** „Der Stufe-75-Endboss soll etwas mehr Schaden machen. Kharzul hat bei 75/50/25 % immer dieselbe Mechanik
(unverwundbar, Ketten, Steine zerstören) – mach was Neues, z. B. ab 50 % eine Verwandlung, viel schneller, 3–4 neue
Angriffe. Gefühlt hat jeder Boss dieselbe Mechanik. Die Endbosse sollen öfter angreifen und verschiedene Angriffe
machen – jeder passend zu sich 1, 2, 3 eigene dazu, nicht immer diese Steine.“

## Befund

- **Karten-Endbosse** (16 Raid-Hallen, beide Seiten, `gegner.js` `updateRaidBoss`, `endboss.js`): alle mit denselben
  sieben Angriffen (`RAID_MOVES`: Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova) **in fester Reihenfolge**,
  alle 5 s (Raserei bis 2,4 s), alle mit **Kristallschild bei 75/40 %** (3–5 Seelenkristalle, unverwundbar, heilt) und
  **Vernichtung bei 55/20 %** (dann alle 50 s). Die Schattenendbosse waren Kopien ihres Gegenstücks. Unterschiede nur
  im Aussehen (3D-Modelle, Effekt-Themen in `bosse3d*.js`).
- **Dungeon-Bosse** (9, `updateBoss`): nur Stampfer und Salve im Wechsel, alle 5,5 s, Verstärkung bei 66/33 %.
- **Höllenthron:** Abaddor hat schon eigenes (Siegel, Viertelschlag/Ring/Kern, wahre Gestalt), aber die Endboss-
  Angriffe in fester Reihenfolge; Zerberos und Ifrah nur Stampfer und Salve; die übrigen Wächter 4–6 Instanz-Angriffe.
- **Instanzbosse** Lv 60 (8) und Lv 80 (6): je 7 Angriffe aus den Instanz-Grundformen, Ult ab 50 % – genug Vielfalt,
  aber feste Reihenfolge.
- **Turm:** Ossarn, Ilmra, Varn je 4 Instanz-Angriffe; Kharzul 7 Angriffe und dreimal dieselben **Seelenketten**.

## Was neu ist

- **Eigene Angriffe** (`js/bossangriffe.js`, Daten je Boss in `js/bossangriffe-bosse.js`): zwölf Grundformen, je Boss
  mit eigenem Namen, Thema (Farben, 3D-Brocken/Flammen/Eis/Blasen aus `BS_FXT3`), Werten und Klang.
  | Grundform | Ablauf | Gegenmittel |
  |---|---|---|
  | Wellen | Bänder um den Boss brechen nacheinander auf (oder abwechselnd innen/außen) | in das Band treten, das schon aufgebrochen ist |
  | Bahnen | parallele Streifen quer durch die Halle, zwei Wellen (rot, dann orange) | nach der ersten Welle in eine aufgebrochene Bahn wechseln |
  | Sprungfolge | drei (Phase: fünf) Sprünge nacheinander auf die Stellen der Spieler | aus den Landekreisen laufen |
  | Atem-Schwenk | Atem/Strahl fegt in Stufen über einen Bogen | hinter den Boss oder gegen die Richtung laufen |
  | Flächen | Frost (friert nach 1,5 s fest), Gift, Glut, Nebel, Sporen bleiben 6–8 s liegen; gespuckt oder aus dem Boden | nicht drin stehen bleiben |
  | Griff | Schwanz, Ranke oder Kette schnellt in einer Bahn auf Spieler, reißt heran und hält kurz fest; Bodenvariante: Ranken unter allen | seitlich ausweichen bzw. die Stelle verlassen |
  | Beschwörung | an markierten Stellen brechen Diener hervor | Stellen meiden, Diener erledigen |
  | Wurf | großer Brocken (Baum, Fels, Eis, Glut) im Bogen auf den Spieler, der am weitesten weg steht | aus dem großen Kreis |
  | Wirbel | der Boss wirbelt eine Bahn über bis zu drei Spieler | aus der Bahn |
  | Schachbrett | Einschläge im Schachbrett, zwei (Phase: drei) Wellen | Feld wechseln |
  | Fessel | Fessel auf die Entferntesten saugt Leben und heilt den Boss | zum Boss laufen (reißt die Fessel) |
  | Doppelhieb | Bogenhieb vorn, kurz danach hinten | Seite wechseln |
- **Auswahl aus einem gemischten Beutel** statt fester Reihenfolge (Endbosse, Instanz- und Turm-Bosse): jeder Angriff
  kommt gleich oft, eigene doppelt, nie zweimal derselbe hintereinander.
- **Ankündigung:** jede Fläche als Warnfläche (Kreis, Band, Ausschnitt, Bahn) in 2D und 3D, spätere Wellen orange;
  Pose des Bosses (Ausholen, Aufrichten, Atem); beim ersten Mal im Kampf und bei Phasen ein Banner mit Hinweis, sonst
  der Name über dem Boss. Keine Bodenringe, Runen oder Sterne als Effekt.
- **Kristallschild und Vernichtung nur noch, wo sie passen:** Schild bei Lichkönig Morrak (Seelengefäße), Aelvyr
  (Kristallwyrm) und Abaddor (Siegel); Vernichtung bei Azaroth, Ignar (Weltenbrand), Aelvyr und einmal bei Tarkon
  (50 %). Ohne Schild +20 % Leben, damit der Kampf etwa so lang bleibt.
- **Phasen-Angriffe** (einmal je Kampf, stärkere Fassung, Banner) bei den Schwellen statt Schild/Vernichtung.
- **Takt:** Pause zwischen zwei Spezialangriffen bei Endbossen 5 → 3,4 s (Raserei 2,4 → 1,8 s), Dungeon-Bosse
  5,5 → 4,6 s, Instanz-/Turm-Wächter 5 → 4,6 s, Instanzbosse 4,4 → 4,0 s. Angriffe mit mehreren Wellen halten den Boss
  nur bis zum ersten Einschlag fest; die späteren Wellen schlagen ein, während er schon weiterkämpft (außer bei Sprüngen,
  Wirbel, Atem und Doppelhieb).

## Bestandsaufnahme: alle Bosse vorher → nachher

Leben und Angriff für einen Boss ohne Gruppenzuschlag (Turm: für einen Spieler). Takt: Pause zwischen zwei
Spezialangriffen (dazwischen schlägt der Boss normal zu; die Ankündigung kommt dazu).

### Karten-Endbosse (Raid-Hallen, je Karte, beide Seiten)

| Boss | Ort | Stufe | Leben | Angriff | bisher: Angriffe · Mechaniken | Takt bisher → neu | neu |
|---|---|---|---|---|---|---|---|
| Fenris, der Urwolf | Höhle des Urwolfs (Kazehana) | 14 | 255.347 → 306.417 | 216 | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Hetzjagd (Sprungfolge); Urheulen (Wellen); Ruf des Rudels (Beschwörung, nur Phase) · kein Kristallschild, keine Vernichtung, Phasen-Angriffe bei 60 %, 30 % |
| Ursus, der Waldtyrann | Thron des Waldtyrannen (Karte 4) | 24 | 772.983 → 927.579 | 579 | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Erdbeben (Wellen); Baumwurf (Wurf); Sporenwolke (Flächen) · kein Kristallschild, keine Vernichtung, Phasen-Angriffe bei 55 %, 25 % |
| Großkhan Gorbag | Kriegsarena des Großkhans (Karte 5) | 34 | 1.711.938 → 2.054.326 | 1.108 | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Axtwirbel (Wirbel); Speerhagel (Bahnen); Kriegshorn (Beschwörung, nur Phase) · kein Kristallschild, keine Vernichtung, Phasen-Angriffe bei 66 %, 33 % |
| Höllenfürst Azaroth | Höllenschlund (Karte 6) | 44 | 3.065.514 → 3.678.617 | 1.744 | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Flammenwelle (Wellen); Höllenglut (Flächen) · kein Kristallschild, Vernichtung 55/20 % |
| Frostriese Ymir | Halle des Frostriesen (Karte 7) | 54 | 5.006.761 → 6.008.113 | 2.445 | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Eisfeld (Flächen); Lawine (Bahnen) · kein Kristallschild, keine Vernichtung, Phasen-Angriffe bei 60 %, 30 % |
| Schlangengöttin Vritra | Tempel der Schlangengöttin (Karte 2) | 55 | 5.222.698 → 6.267.238 | 2.521 | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Giftspucke (Flächen); Umschlingen (Griff); Giftatem (Atem-Schwenk) · kein Kristallschild, keine Vernichtung, Phasen-Angriffe bei 50 % |
| Lichkönig Morrak | Gruft des Lichkönigs (Karte 8) | 64 | 7.664.085 | 3.385 | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Totenruf (Beschwörung); Seelenentzug (Fessel); Seelenregen (Schachbrett) · Kristallschild 75/40 %, keine Vernichtung |
| Weltendrache Ignar | Hort des Weltendrachen (Karte 9) | 76 | 12.259.630 → 14.711.556 | 4.738 → **5.711** | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Feueratem (Atem-Schwenk); Sturzflug (Bahnen); Glutregen (Schachbrett) · kein Kristallschild, Vernichtung 55/20 % |
| Donnertitan Tarkon | Gipfel des Donnertitans (Karte 3) | 78 | 13.419.041 → 16.102.850 | 4.958 → **6.316** | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Gewitterfeld (Schachbrett); Felswurf (Wurf); Donnerwelle (Wellen) · kein Kristallschild, Vernichtung 50 %, Phasen-Angriffe bei 75 %, 25 % |
| Aelvyr, Wyrm des Abgrunds | Hort des Abgrundwyrms (Karte 10) | 80 | 14.658.213 | 5.325 → **6.461** | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Splittersturm (Schachbrett); Abgrundriss (Bahnen); Kristallatem (Atem-Schwenk) · Kristallschild 75/40 %, Vernichtung 55/20 % |
| Skarn, der Nachtwolf | Höhle des Nachtwolfs (Karte 11) | 14 | 255.347 → 306.417 | 216 | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Schattensprung (Sprungfolge); Nachtnebel (Flächen); Mondrudel (Beschwörung, nur Phase) · kein Kristallschild, keine Vernichtung, Phasen-Angriffe bei 60 %, 30 % |
| Brakkur, der Kohlenfürst | Kohlengrube des Brakkur (Karte 12) | 24 | 772.983 → 927.579 | 579 | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Kohlenregen (Flächen); Glutstoß (Wellen); Glutbrocken (Wurf) · kein Kristallschild, keine Vernichtung, Phasen-Angriffe bei 60 %, 30 % |
| Gebeinfürst Vharok | Gebeinhalle des Vharok (Karte 13) | 34 | 1.711.938 → 2.054.326 | 1.108 | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Knochenreihen (Bahnen); Knochenbeil (Doppelhieb); Gebeinruf (Beschwörung) · kein Kristallschild, keine Vernichtung, Phasen-Angriffe bei 50 % |
| Blutfürstin Sereth | Blutkessel der Sereth (Karte 14) | 44 | 3.065.514 → 3.678.617 | 1.744 | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Blutsense (Doppelhieb); Blutdurst (Fessel); Blutwirbel (Wirbel) · kein Kristallschild, keine Vernichtung, Phasen-Angriffe bei 50 % |
| Nachtriese Skadur | Halle der Mitternacht (Karte 15) | 54 | 5.006.761 → 6.008.113 | 2.445 | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Nachtfrostwelle (Wellen); Eisblock (Wurf); Nachtfrost (Flächen) · kein Kristallschild, keine Vernichtung, Phasen-Angriffe bei 50 % |
| Moormutter Veyla | Moorthron der Veyla (Karte 16) | 55 | 5.222.698 → 6.267.238 | 2.521 | Stampfer, Meteore, Sturm, Tankschlag, Sprung, Linie, Nova (feste Reihenfolge) · Kristallschild 75/40 %, Vernichtung 55/20 %, Helfer alle 20 s, Wutschrei 70/35/20 % | 5 → 3,4 s (Raserei 2,4 → 1,8 s) | Sumpfranken (Griff); Faulgas (Flächen) · kein Kristallschild, keine Vernichtung, Phasen-Angriffe bei 55 % |

### Höllenthron: Abaddor

| Boss | Ort | Stufe | Leben | Angriff | bisher: Angriffe · Mechaniken | Takt bisher → neu | neu |
|---|---|---|---|---|---|---|---|
| Abaddor, der Höllenkaiser | Thron der Unterwelt | 72 | 27.593.974 | 4.608 | Stampfer, Meteore, Tankschlag, Linie, Sprung, Nova, Sturm (feste Reihenfolge) · Siegel 75/55/30 %, Viertelschlag/Ring/Kern, wahre Gestalt ab 50 % | 5 → 3,4 s | Höllenketten (Griff); Höllentor (Beschwörung) · Siegel, Viertelschlag und wahre Gestalt bleiben |

### Höllenthron: Wächter

| Boss | Ort | Stufe | Leben | Angriff | bisher: Angriffe · Mechaniken | Takt bisher → neu | neu |
|---|---|---|---|---|---|---|---|
| Gorvoth, Kerkermeister der Hölle | Thron der Unterwelt | 64 | 2.299.225 | 3.472 | Stampfer, Sog, Sturm, Tankschlag (feste Reihenfolge) · Wutschrei 60 %, Raserei 30 % | 5 → 4,6 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Lilith, Hexe der Asche | Thron der Unterwelt | 65 | 2.726.311 | 3.714 | Lachen, Regen, Ring, Salve (feste Reihenfolge) · Wutschrei 60 %, Raserei 30 % | 5 → 4,6 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Zerberos, Wächter des Höllentors | Thron der Unterwelt | 66 | 3.298.561 | 3.965 | Stampfer, Salve im Wechsel · Verstärkung bei 66/33 % | 5,5 → 4,6 s, jeder 3. Angriff eigen | Höllenhatz (Sprungfolge); Dreifacher Atem (Atem-Schwenk) |
| Molgrath, der Glutkoloss | Thron der Unterwelt | 67 | 3.541.376 | 4.121 | Stampfer, Kreuz, Regen, Sog, Tankschlag (feste Reihenfolge) · Wutschrei 60 %, Raserei 30 % | 5 → 4,6 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Ifrah, die Flammenfürstin | Thron der Unterwelt | 68 | 3.795.888 | 4.334 | Stampfer, Salve im Wechsel · Verstärkung bei 66/33 % | 5,5 → 4,6 s, jeder 3. Angriff eigen | Flammenkranz (Wellen); Glutsaat (Flächen) |
| Belzarek, Fürst der Schatten | Thron der Unterwelt | 69 | 4.324.533 | 4.555 | Sprung, Kegel, Kreuz, Kern, Kettenblitz, Sturm (feste Reihenfolge) · Wutschrei 60 %, Raserei 30 % | 5 → 4,6 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |

### Dungeon-Bosse

| Boss | Ort | Stufe | Leben | Angriff | bisher: Angriffe · Mechaniken | Takt bisher → neu | neu |
|---|---|---|---|---|---|---|---|
| Spinnenkönigin | Spinnenhöhle | 25 | 60.033 | 291 | Stampfer, Salve im Wechsel · Verstärkung bei 66/33 %, unter 25 % schneller | 5,5 → 4,6 s, jeder 3. Angriff eigen | Spinnennetz (Griff); Spinnenbrut (Beschwörung) |
| Kriegsherr Gor'thak | Orkfestung | 36 | 144.704 | 598 | Stampfer, Salve im Wechsel · Verstärkung bei 66/33 %, unter 25 % schneller | 5,5 → 4,6 s, jeder 3. Angriff eigen | Speerhagel (Bahnen); Kriegsbeil (Doppelhieb) |
| Eiskönig Hrim | Eisgrotte | 52 | 351.191 | 1.087 | Stampfer, Salve im Wechsel · Verstärkung bei 66/33 %, unter 25 % schneller | 5,5 → 4,6 s, jeder 3. Angriff eigen | Frostboden (Flächen); Frostwelle (Wellen) |
| Urdrache Vharak | Drachenhort | 72 | 871.389 | 2.008 | Stampfer, Salve im Wechsel · Verstärkung bei 66/33 %, unter 25 % schneller | 5,5 → 4,6 s, jeder 3. Angriff eigen | Drachenatem (Atem-Schwenk); Feuerlachen (Flächen) |
| Banditenfürst Raku | Banditenkeller | 17 | 21.920 | 130 | Stampfer, Salve im Wechsel · Verstärkung bei 66/33 %, unter 25 % schneller | 5,5 → 4,6 s, jeder 3. Angriff eigen | Klingenwirbel (Wirbel); Rauchbombe (Flächen) |
| Gruftkönig Morvan | Totengruft | 45 | 244.045 | 856 | Stampfer, Salve im Wechsel · Verstärkung bei 66/33 %, unter 25 % schneller | 5,5 → 4,6 s, jeder 3. Angriff eigen | Grabruf (Beschwörung); Lebensraub (Fessel) |
| Naga-Königin Sseth | Schlangentempel | 52 | 364.699 | 1.087 | Stampfer, Salve im Wechsel · Verstärkung bei 66/33 %, unter 25 % schneller | 5,5 → 4,6 s, jeder 3. Angriff eigen | Giftspucke (Flächen); Umschlingen (Griff) |
| Titanenkönig Kroth | Titanenschmiede | 70 | 814.009 | 1.913 | Stampfer, Salve im Wechsel · Verstärkung bei 66/33 %, unter 25 % schneller | 5,5 → 4,6 s, jeder 3. Angriff eigen | Titanenbeben (Wellen); Felswurf (Wurf) |
| Kristallseherin Vaelith | Kristallkaverne | 80 | 1.202.725 | 2.485 | Stampfer, Salve im Wechsel · Verstärkung bei 66/33 %, unter 25 % schneller | 5,5 → 4,6 s, jeder 3. Angriff eigen | Splitterregen (Schachbrett); Kristallfessel (Griff) |

### Instanzbosse (Lv 60 und Lv 80)

| Boss | Ort | Stufe | Leben | Angriff | bisher: Angriffe · Mechaniken | Takt bisher → neu | neu |
|---|---|---|---|---|---|---|---|
| Frostkönigin Hjelda | Gletschergruft | 64 | 2.299.225 | 3.665 | Regen, Kegel, Ring, Dornen, Sog, Stampfer, Salve (feste Reihenfolge) · Ult „Ewiger Winter“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Winterfürst Kaldor | Feste des Nordlichts | 64 | 2.299.225 | 3.665 | Kreuz, Regen, Kettenblitz, Sog, Stampfer, Kegel, Sprung (feste Reihenfolge) · Ult „Ewiger Winter“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Moormutter Vethra | Versunkene Moorkrypta | 64 | 2.299.225 | 3.665 | Lachen, Kegel, Sog, Regen, Stampfer, Salve, Sprung (feste Reihenfolge) · Ult „Fäulnisflut“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Totenfürst Azrakel | Knochenkathedrale | 64 | 2.299.225 | 3.665 | Dornen, Kreuz, Kettenblitz, Sog, Kegel, Stampfer, Sprung (feste Reihenfolge) · Ult „Totenmesse“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Donnerschmied Volund | Donnerschmiede | 64 | 2.299.225 | 3.665 | Kettenblitz, Stampfer, Kreuz, Sog, Regen, Linie, Tankschlag (feste Reihenfolge) · Ult „Himmelszorn“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Sturmkönigin Tempestra | Sturmhorst | 64 | 2.299.225 | 3.665 | Kettenblitz, Regen, Kegel, Sog, Sprung, Ring, Salve (feste Reihenfolge) · Ult „Himmelszorn“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Magmafürst Pyrrhos | Glutkessel | 64 | 2.299.225 | 3.665 | Regen, Kreuz, Sog, Stampfer, Kegel, Lachen, Sturm (feste Reihenfolge) · Ult „Weltenbrand“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Aschenkaiser Vulkhar | Aschenzitadelle | 64 | 2.299.225 | 3.665 | Kegel, Regen, Sturm, Kreuz, Sog, Sprung, Stampfer (feste Reihenfolge) · Ult „Weltenbrand“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Aelthys, Herrin der Spiegel | Spiegelgruft | 80 | 3.946.442 | 5.396 | Regen, Kegel, Ring, Dornen, Sog, Stampfer, Salve (feste Reihenfolge) · Ult „Ewiger Winter“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Nihilor, Fürst der Leere | Thron der Leere | 80 | 3.946.442 | 5.396 | Kreuz, Regen, Kettenblitz, Sog, Kegel, Stampfer, Sprung (feste Reihenfolge) · Ult „Totenmesse“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Maelis, Herrin der Gezeiten | Gezeitengrotte | 80 | 3.946.442 | 5.396 | Regen, Kegel, Sog, Lachen, Ring, Salve, Stampfer (feste Reihenfolge) · Ult „Sturmflut“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Kapitän Haldor Nebelbart | Nebelwrack | 80 | 3.946.442 | 5.396 | Kreuz, Kettenblitz, Sog, Kegel, Regen, Stampfer, Sprung (feste Reihenfolge) · Ult „Nebelgrab“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Solgar, der Sonnenwächter | Sonnentempel | 80 | 3.946.442 | 5.396 | Regen, Kreuz, Sog, Stampfer, Kegel, Dornen, Sturm (feste Reihenfolge) · Ult „Mittagsglut“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |
| Vindrakor, der Sturmdrache | Wolkenhort | 80 | 3.946.442 | 5.396 | Kettenblitz, Regen, Kegel, Sog, Sprung, Ring, Linie (feste Reihenfolge) · Ult „Auge des Orkans“ ab 50 %, dann alle 40 s · Wutschrei 60 %, Raserei 30 % | 4,4 → 4,0 s | nur geprüft (genug eigene Angriffe): gemischte Reihenfolge, öfter |

### Turm der Verdammten

| Boss | Ort | Stufe | Leben | Angriff | bisher: Angriffe · Mechaniken | Takt bisher → neu | neu |
|---|---|---|---|---|---|---|---|
| Ossarn, der Kettenhüter | Turm der Verdammten | 80 | 526.192 | 2.840 | Stampfer, Kreuz, Sturm, Dornen (feste Reihenfolge) · Wutschrei 60 %, Raserei 30 % | 5 → 4,6 s | Kettenwurf (Griff) · gemischte Reihenfolge |
| Ilmra, Hüterin der Glut | Turm der Verdammten | 80 | 338.266 | 2.556 | Regen, Kegel, Salve, Lachen (feste Reihenfolge) · Wutschrei 60 %, Raserei 30 % | 5 → 4,6 s | Glutwelle (Wellen) · gemischte Reihenfolge |
| Varn, Hüter der Asche | Turm der Verdammten | 80 | 413.437 | 2.698 | Sturm, Kreuz, Stampfer, Linie (feste Reihenfolge) · Wutschrei 60 %, Raserei 30 % | 5 → 4,6 s | Glefenwirbel (Wirbel) · gemischte Reihenfolge |
| Kharzul, Wächter der Verdammten | Turm der Verdammten | 80 | 1.127.555 | 3.408 | Kegel, Regen, Sog, Kreuz, Sprung, Dornen, Kettenblitz · Seelenketten 75/50/25 % (unverwundbar, Kettensteine in den Toren, 25 s) | 5 → 4,6 s, wahre Gestalt etwa 2,1 s | Totentanz (75 %), Verwandlung (50 %), danach Seelenschnitt, Höllensprung, Kettensturm, Höllenfeuerwelle; Seelenbann ab 25 % – siehe unten |

Die Wächter der Lv-60- und Lv-80-Instanzen (4–5 Angriffe aus den Instanz-Grundformen) sind nur geprüft: gemischte
Reihenfolge und 5 → 4,6 s Takt wie die übrigen Instanz-Wächter.

## Stufe-75-Endboss: mehr Schaden

Die Karte bis Stufe 75 ist die **Donnerklamm** (Stufe 50–75, außen der Titanenkamm 62–75); ihr Endboss ist **Donnertitan
Tarkon** (Stufe 78, Halle ab Stufe 72). Er und **Weltendrache Ignar** (Feuerberg, Stufe 76, Halle ab 70) sind die
Endbosse, die eine Gruppe um Stufe 75 spielt – und beide lagen im Angriff kaum über Abaddor (72):

| Boss | Stufe | Angriff bisher | neu | Änderung |
|---|---|---|---|---|
| Lichkönig Morrak | 64 | 3.385 | 3.385 | – |
| Abaddor (erste / wahre Gestalt) | 72 | 4.608 / 5.760 | 4.608 / 5.760 | – |
| Weltendrache Ignar | 76 | 4.738 | 5.711 | atkMul 3,65 → 4,4 (+21 %) |
| **Donnertitan Tarkon** | 78 | 4.958 | 6.316 | atkMul 3,65 → 4,65 (**+27 %**) |
| Aelvyr | 80 | 5.325 | 6.461 | atkMul 3,75 → 4,55 (+21 %) |
| zum Vergleich: Lv-80-Instanzboss | 80 | 5.396 | 5.396 | – |

Tarkon traf bisher nur 8 % härter als Abaddor in erster Form und 14 % schwächer als Abaddor in wahrer Gestalt, obwohl
er sechs Stufen höher steht. Mit +27 % liegt er zwischen Abaddors wahrer Gestalt und Aelvyr. Ignar und Aelvyr gehen mit,
damit die Kurve weiter steigt (sonst hätte Tarkon härter getroffen als der letzte Endboss). Dazu kommen der schnellere
Takt und Tarkons eigene Angriffe (Gewitterfeld, Felswurf, Donnerwelle, Phasen bei 75/25 %, Vernichtung bei 50 %).

## Kharzul (Turm, Ebene 11)

Die Seelenketten sind aus (`TURM.ketten = []`; der Code bleibt für ältere Hosts im Kanal). Neu (`js/kharzul.js`):

| Lebensanteil | Mechanik | Ankündigung | Gegenmittel |
|---|---|---|---|
| 100–50 % | erste Gestalt: Kegel, Glutregen, Sog, Kreuz, Sprung, Dornen, Kettenblitz (gemischt) | Warnflächen wie bisher | ausweichen |
| 75 % | **Totentanz:** springt in die Mitte, rammt die Hellebarde in den Boden; vier Arme aus Seelenfeuer kreisen 9 s (0,42 rad/s) | Banner, Arme 2,4 s als Warnbahnen, danach kreisende Streifen mit Flammen | in den Lücken mitlaufen; er bleibt angreifbar |
| 50 % | **Entfesselte Gestalt:** 2,6 s Verwandlung mit Druckwelle (330, wirft weg) | Banner, Warnfläche, Glutsturm, Flammensäule | weg von ihm |
| danach | 30 % größer, schwarz-rot mit Höllenfeuer (3D: Farbe, glühende Adern, Flammen an Brust, Rücken, Waffe, Kopf; 2D: gefärbte Figur, Flammen), Tempo 126 → 178, Schlag 1,7 → 1,05 s, Angriffstakt etwa doppelt so schnell, +20 % Schaden; nur noch: **Seelenschnitt** (vorn, 0,55 s später hinten), **Höllensprung** (3 Sprünge, 0,7 s Abstand), **Kettensturm** (Ketten auf bis zu 3 Spieler, reißen heran), **Höllenfeuerwelle** (4 Bänder nach außen, 0,45 s Abstand) | 1,0–1,1 s statt 1,4–1,9 s | ausweichen, Seite wechseln |
| 25 % | **Seelenbann:** Brandmal auf jedem Spieler, nach 5 s trifft jedes alle anderen im Umkreis 150 (allein harmlos), danach immer wieder | grüne Fläche folgt dem Spieler, Flamme über dem Kopf | auseinanderlaufen |

Glutwichte kommen weiter alle 20 s. Zehn Spieler: Leben ×8,65, Schaden ×1,45 (wie bisher, `turmScale`).

## Balance (grobe Prüfung)

**Schaden je Treffer** (eigene Rechnung mit den Spielformeln, `calcDamage`, `levelBonus`, `playerStats`): Figur der
Bossstufe (bis 80) mit Ausrüstung ihrer Stufe, +7, selten. Die neuen Angriffe liegen im Bereich der alten (Meteor 3,0
bis Sprung 4,1 × Angriff); nur Tarkon, Ignar und Aelvyr treffen durch den höheren Angriff härter. Größter vermeidbarer
Treffer in % des Lebens einer Schadens-Figur (Magier):

| Boss | alt | neu | eigene Angriffe (Faktor: % Leben) |
|---|---|---|---|
| Fenris (14) | 106 % | 106 % | Hetzjagd 3,0: 77 %, Urheulen 2,8: 72 % |
| Ursus (24) | 141 % | 141 % | Erdbeben 3,2: 110 %, Baumwurf 4,0: 138 %, Sporen 1,6: 55 % + Tick |
| Azaroth (44) | 280 % | 280 % | Flammenwelle 3,3: 225 %, Höllenglut 1,9: 130 % + Tick |
| Ymir (54) | 272 % | 272 % | Eisfeld 1,8: 119 % + Einfrieren, Lawine 3,6: 239 % |
| Morrak (64) | 262 % | 262 % | Totenruf 2,4: 153 %, Seelenregen 3,0: 192 %, Fessel 0,5 je 0,5 s |
| Ignar (76) | 226 % | 272 % | Feueratem 3,0: 199 %, Sturzflug 3,6: 239 %, Glutregen 3,1: 206 % |
| Tarkon (78) | 237 % | 302 % | Gewitterfeld 3,2: 235 %, Felswurf 4,1: 302 %, Donnerwelle 3,3: 243 % |
| Aelvyr (80) | 184 % | 223 % | Splittersturm 3,1: 169 %, Abgrundriss 3,6: 196 %, Kristallatem 3,0: 163 % |
| Kharzul (80, allein) | 118 % | 117 % | Seelenschnitt 3,4 × 1,2: 117 %, Höllensprung 103 %, Kettensturm 90 %, Höllenfeuerwelle 100 %, Seelenbann 83 % je Brandmal |

Endbosse sind wie bisher für fünf Spieler mit Heiler gebaut: Wer in einer roten Fläche stehen bleibt, ist mit
Durchschnittsausrüstung auch vorher schon gefallen. Neu ist nicht der Schaden je Treffer, sondern dass mehr Angriffe
verschiedene Laufwege verlangen.

**Kampfdauer der Endbosse:** Der Kristallschild kostete in der Fünfergruppe je Phase 5 Kristalle zu 2,5 % des Bosslebens
und heilte ihn um 2 %/s, solange sie standen – zusammen etwa ein Drittel mehr Leben. Ohne Schild +20 % Leben, dazu
mehr Laufwege: Die Kämpfe bleiben etwa gleich lang.

**Testkampf Kharzul allein** (Spieler-KI: weicht Warnflächen mit 85 % Wahrscheinlichkeit aus, greift sonst an, wirkt
Fertigkeiten, trinkt Tränke; Stufe 80, Ausrüstung Lv 80 episch +10; Tod = 8 s Pause, dann volles Leben):

| Figur | alt (ohne Seelenketten) | neu |
|---|---|---|
| Krieger · Klinge (8.990 Leben) | 146 s, 6 Tode | 171 s, 8 Tode |
| Magier · Feuer (6.247 Leben) | 169 s, 8 Tode | 224 s, 12 Tode |

Die Seelenketten (bis zu dreimal 25 s unverwundbar) ließen sich außerhalb des Turms nicht nachbauen; sie hätten den
alten Kampf um etwa 30–45 s verlängert. Neu ist er also etwa gleich lang, aber deutlich gefährlicher, vor allem in der
wahren Gestalt (die KI stirbt dort etwa doppelt so oft wie in der ersten). Die KI ist schwächer als ein Mensch (sie
weicht nur grob aus); schaffbar ist der Kampf allein wie zu zehnt: zu zehnt Leben ×8,65 bei zehnfachem Schaden
(etwa 15 % kürzer), Schaden ×1,45, und der Seelenbann verlangt Abstand (in der Halle ist Platz für zehn Kreise).

## Technik und Mehrspieler

- Ablauf je Boss beim Host (`bskStart`): Flächen wählen, Pose, Warnflächen, Nachricht `raid` mit `x` (Fähigkeit) und `s`
  (Flächen, Zeiten, Angriff, Stufe). Neue Mitspieler zeigen alles selbst (`bskShow`, `netOnClientData` umhüllt) und rechnen
  ihren Schaden selbst; Bewegungen (Sprünge, Wirbel, Verwandlung, Tempo) nur beim Host. Ältere Mitspieler lesen nur `k`/`c`
  und sehen auf denselben Stellen einen Meteorregen (Schaden wie ein Meteor) – kein Absturz. Unbekannte oder kaputte
  Daten fallen auf denselben Weg zurück.
- Spieler-Zustände: Verlangsamung (`playerStats` umhüllt), Festhalten/Einfrieren (`lockPlayer` mit Eisblock, Ranken
  oder Ketten in 2D und 3D), Schaden über Zeit, liegende Flächen (`BSK_FIELDS`).
- 3D: Warnflächen als eigene Formen (Band, Ausschnitt, Bahn) in `FX3_DRAW.bskwarn`; Effekte über `bsAddFx3` (bosse3d.js:
  Ausbruch, Fall, Atem, Bodenwelle, Wirbel, Staubspur) und eigene Teile (rollende Brocken, geworfene Bäume/Felsen,
  Flächen, Ranken/Ketten, Fesseln, Totentanz-Arme, Kharzuls Flammen). 2D: eigene Zeichnungen (`EXTRA_EFFECTS.bsk*`, `kz*`).
- Keine Bodenringe, Runen oder Sterne als Effekt; nur vorhandene Klänge (`imp_*`, `strom_end`).
