# Endbosse der Karten in 3D – Paket 1 (seit 14.80)

**Wunsch:** „Alle Bosse, gerade Endbosse und Instanz-Endbosse, sollen so richtig cool aussehen – nicht Drachenform,
sondern so wie sie halt aussehen, nur viel cooler: 3D-Design, Animation, 3D-Effekte. Nimm Aelvyr als Beispiel.“
Paket 1: die Endbosse der Raid-Hallen (`raid_*`) beider Seiten, ohne Aelvyr (fertig seit 14.68).

## Bestand (aus den Daten)

| Karte | Lichtseite | Karte | Schattenseite (Gegenstück) |
|---|---|---|---|
| 1 | Fenris, der Urwolf | 11 | Skarn, der Nachtwolf |
| 4 | Ursus, der Waldtyrann | 12 | Brakkur, der Kohlenfürst |
| 5 | Großkhan Gorbag | 13 | Gebeinfürst Vharok |
| 6 | Höllenfürst Azaroth | 14 | Blutfürstin Sereth |
| 7 | Frostriese Ymir | 15 | Nachtriese Skadur |
| 2 | Schlangengöttin Vritra | 16 | Moormutter Veyla |
| 8 | Lichkönig Morrak | – | – |
| 3 | Donnertitan Tarkon | – | – |
| 9 | Weltendrache Ignar | – | – |
| 10 | Aelvyr (fertig, 14.68) | – | – |

15 Endbosse ohne Aelvyr. Umgesetzt: 14 (alle außer Ignar). Abaddor (Höllenthron) ist ein Instanz-Endboss → Paket 2.

## Ursache

Die Endbosse hatten kein eigenes Modell: `raid.art` verwies auf ein gewöhnliches Monster (Alphawolf, Braunbär,
Orkhauptmann, Dämon, Yeti, Nagakönigin, Gruftkönig, Donnerriese …), dessen 3D-Familienmodell (Vierbeiner, Humanoid,
Schlange) nur vergrößert und mit Krone, Leuchtkugeln und Bodenring geschmückt wurde (`monsterFlair3`). Bewegt wurden sie
wie jedes Monster (`animateCreature`): keine eigenen Posen für die Endboss-Angriffe, kein Brüllen, kein Tod.

## Änderung

### Baukasten und Animation (`js/bosse3d.js`)
- Eigene Skelette je Bauart, Leib und Glieder **weich gewichtet** (wie bei Aelvyr: `aelSkin3`/`aelChainW3`), Teile fest am
  jeweiligen Knochen:
  - **Zweibeiner** (28 Knochen): Becken, Bauch, Brust, Hals, Kopf, Kiefer, Arme (Ober-/Unterarm, Hand), Beine
    (Ober-/Unterschenkel, Fuß), Schwanz (3), Flügel (je 2), Umhang/Banner (2). Beine per **IK**: Beim Ducken, Knien und
    Laufen bleiben die Füße am Boden.
  - **Vierbeiner** (23 Knochen): Hüfte, Brust, Hals, Kopf, Kiefer, Schwanz (3), vier Beine aus drei Gliedern, zwei Ohren.
  - **Naga** (23 Knochen): Schlangenleib aus acht Gliedern (am Boden geringelt, vorn aufgerichtet), darauf Oberkörper,
    Arme, Kopf, Kiefer und zwei Knochen für die Kobrahaube.
- **Doppelseitige Flächen** (`bsSheet3`): Flughaut, Banner, Umhang, Lendenschurz, Kobrahaube haben Vorder- und Rückseite
  als eigene Dreiecke mit eigenen Normalen (kein Schwarz-Fehler von hinten); gespiegelte Teile werden nicht über negative
  Größe gebaut (Spiegel-Fehler aus 14.68 kann nicht auftreten).
- **Animation** je Bauart mit weich nachgeführten Posenwerten: Atmen, Laufen (Gang je Bauart), Kopf folgt dem Ziel,
  **drei Nahkampf-Posen im Wechsel** (Zweibeiner: Hieb von oben, Rundumschlag, Faust/Klaue/Stampfen; Vierbeiner: Biss,
  Prankenhieb, Aufbäumen und Niederschlagen; Naga: Zustoßen, Klingenschnitt, Schwanzschlag), **Brüllen** bei Kampfbeginn
  und jedem Phasenwechsel (Wolf: Heulen in die Höhe), eigene Pose je Endboss-Angriff:
  Strahl/Atem (Ausholen → Stoß bzw. Waffe in Zielrichtung in den Boden), Meteore (Arme/Kopf zum Himmel), Nova (Kraft
  sammeln, Arme zusammen → Arme aufreißen; Flieger steigen auf), Stampfer (Waffe über den Kopf → in den Boden;
  Vierbeiner bäumen sich auf), Tankschlag, Sprung (Ducken → Bogen → Landung), Sturm (vorgebeugt), Vernichtung
  (Waffe/Arme zum Himmel, Flieger und der Lich steigen auf → Einschlag), **Kristall-Schild** (kniend, Arme über dem Kopf,
  kanalisiert), **Taumeln** nach dem Schildbruch, **Tod** (Aufbäumen und Brüllen → in die Knie → vornüber zu Boden bzw.
  Vierbeiner/Naga kippen zur Seite → zerfallen nach Thema → versinken; Leiche 4,6 s statt 0,55 s).
- **Effekte nur in 3D** (`FX3_HOOKS`), je Boss ein Thema: Aufladen am Ursprung (Maul, Waffe, Stab), Strahl als Kegel aus
  Hüllen mit strömenden Teilchen, **Bodenwelle** (Felsen, Eiszacken, Knochen brechen nacheinander entlang der Linie aus
  dem Boden), **Blitz** (Zickzack-Glieder) beim Sturm-Thema, eigene Geschosse statt der Meteore (Felsbrocken, Feuerbrocken,
  Eisspeere, Lichtspeere, Giftblasen, grüne Schädel, Blitze aus der Wolke), Druckwelle aus Brocken, Staub und Funken (kein
  Ring), Dampf/Atem beim Brüllen, Zerfall beim Tod, Staubspur beim Sturm, **Dauereffekte** je Boss (Runenglut,
  Schattennebel, Flammen an Klinge und Krone, Blutnebel, Atemwolken und Schnee, Nachtnebel, Gewitterwolke mit
  überspringenden Blitzen, Seelenfeuer und kreisende Seelen, Sporen, Rauch und Glut, Sumpfnebel und Glühwürmchen).
  Keine Bodenringe, Runen oder Sterne; die Warnflächen bleiben. **Kein Bildschirmblitz** (Nova, Vernichtung, Brüllen),
  nur kurzes Beben. Die Kristallkuppel ist um diese Bosse größer (Modell größer als der Kampfkreis).
- Mechanik und Balance unverändert: gleiche Angriffe, Zeiten, Schaden, Kreise, Kampfkreis (`m.r`).

### Modelle (`js/bosse3d-modelle.js`, `MON3_BUILD[id]`, `BOSS3[id]`)
Je Wesen ein eigener Bauplan; die Schattenendbosse sind Abwandlungen ihres Gegenstücks mit eigenen Farben, eigenem
Zubehör, eigener Waffe und eigenem Effekt-Thema. Alle ohne Krone/Leuchtkugeln/Bodenring aus `monsterFlair3`.

| Boss | Wesen / Aussehen | Thema (Effekte) |
|---|---|---|
| Fenris, der Urwolf | Riesenwolf: tiefe Brust, Mähne, lange Schnauze mit Fängen, Stehohren, buschige Rute; gesprengte Fesseln (Halsring mit Dornen und Goldrunen, Fußringe, zerrissene Ketten) | Runenglut, goldene Lichtspeere |
| Skarn, der Nachtwolf | fast schwarzer Wolf, Mähnenspitzen und Flankenzeichnungen leuchten nachtblau, Knochenmaske, Mondsichel | Schattennebel aus der Mähne |
| Ursus, der Waldtyrann | Riesenbär mit Schulterbuckel: Moosdecke, drei junge Bäume, Leuchtpilze, Rindenplatten, Steine | Erdwelle, Felsbrocken, Sporen |
| Brakkur, der Kohlenfürst | verkohlter Bär mit Glutrissen, Kohlekristalle auf dem Rücken, Glut im Maul | Feuerbrocken, Rauch und Glut |
| Großkhan Gorbag | Ork-Kriegsherr: Stiernacken, Hauer, Hörnerhelm, Pelzmantel, Kuppel-Schulterpanzer mit Dornen und Schädel, Brustgurte mit Medaillon, Hackbeil mit Glutrunen, Kriegsbanner mit Trophäen | Erdwelle, Felsbrocken |
| Gebeinfürst Vharok | bleicher Ork mit Tierschädel-Helm, Knochenzacken, Knochenhackbeil, zerfetztes Knochenbanner | Knochenwelle, Knochenspeere |
| Höllenfürst Azaroth | Dämonenfürst mit Glutrissen, Widder- und Stirnhörnern, Flammenkrone, Obsidianpanzer, Hufen, Schwanz mit Spatenspitze, Fledermausflügeln, Flammenschwert | Feuer (Atem, Feuerbrocken, Flammen an Klinge und Krone) |
| Blutfürstin Sereth | schlanke Dämonin mit zurückgeschwungenen Hörnern, langem Haar, Dornenkrone, roten Flügeln, Blutsense | Blut (Nebel, Blutspeere) |
| Frostriese Ymir | gebeugter Riese, eisblaue Haut, Bart und Haar aus Reif, Eiskristalle auf Schultern und Rücken, Fellschurz, Eiskeule | Eiswelle, Eisspeere, Atemwolken, Schnee |
| Nachtriese Skadur | Schieferhaut, schwarzer Bart mit Reif, nachtblaues Eis | Frostatem, Nachtnebel |
| Donnertitan Tarkon | Riese aus Stein mit Runenadern, Bronzebändern, Felsbrocken auf den Schultern, Blitzkrone, Kriegshammer | Sturm: Blitzstrahl, Blitze aus der Wolke, Gewitterwolke über ihm |
| Schlangengöttin Vritra | Naga: geringelter Schlangenleib mit Rauten und Kamm, Kobrahaube mit Brillenzeichnung, vier Kobras aus den Schultern, Goldkrone, Kragen, Schuppenrock, zwei Sichelklingen | Gift: Giftatem, Giftblasen, Tropfen |
| Moormutter Veyla | Moorhexe-Naga: Schilfhaar, Wurzelgeweih mit Leuchtpilzen, Moosumhang, Schilfrock, Stab mit Schädel-Laterne | Moor: Sumpfnebel, Glühwürmchen |
| Lichkönig Morrak | schwebender Lich: zerrissene Robe mit Runenborte, Knochenbrustplatte mit Seelenstein, Schädel mit aufklappbarem Kiefer, Dornenkrone, Stachelkragen, Schädel-Schulterpanzer, Knochenarme, Stab mit Seelenkäfig, Umhang | Seelenfeuer, grüne Schädel, kreisende Seelen |

### Anbindung
- `drei-figuren.js`: `syncMonster3` → `bossAnim3`, `syncCorpse3` → `bossCorpse3` (wie bei Aelvyr).
- `gegner.js`: `raidTelegraph` → `bossTelegraph` (Pose und 3D-Effekte; in 3D fallen die eigenen Geschosse statt der
  Meteore), `raidRoarFx` → `bossRoar` (ohne Bildschirmblitz, Ring und Lichtsäule), Nova ohne Blitz, beim Einschlag von
  Meteor/Tankschlag in 3D kein zusätzlicher Blitzstrahl (die eigenen Geschosse schlagen ein).
- `endboss.js`: Vernichtung ohne Bildschirmblitz, Kristallkuppel je Boss größer (`BOSS3[id].dome`).
- `effekte.js`: `vfxCorpse` → `bossCorpse` (Leiche 4,6 s, Blickrichtung bleibt).
- `index.html`, `sw.js`: zwei neue Dateien in der Liste (Version unverändert).

## Dateien
js/bosse3d.js (neu), js/bosse3d-modelle.js (neu), js/drei-figuren.js, js/gegner.js, js/endboss.js, js/effekte.js,
index.html, sw.js, docs/bosse-78.md.

## Messwerte
Dreiecke (sichtbares Modell / vereinfachte Stufe / Schattenmodell), Weltgröße (Höhe), vorher in Klammern:

| Boss | Dreiecke | einfach | Schatten | Höhe |
|---|---|---|---|---|
| Fenris | 17.900 | 9.100 | 4.200 | 6,2 (5,4) |
| Skarn | 16.500 | 8.200 | 4.100 | 6,2 (5,4) |
| Ursus | 17.600 | 9.100 | 4.400 | 5,8 (4,9) |
| Brakkur | 12.800 | 6.000 | 3.900 | 5,8 (4,9) |
| Gorbag | 19.700 | 10.400 | 5.300 | 7,6 (6,5) |
| Vharok | 21.100 | 10.700 | 5.300 | 7,6 (6,5) |
| Azaroth | 17.700 | 8.400 | 5.500 | 8,0 (6,3) |
| Sereth | 16.200 | 8.000 | 5.300 | 7,4 (6,3) |
| Ymir | 11.900 | 7.600 | 4.500 | 8,8 (6,5) |
| Skadur | 11.900 | 7.600 | 4.500 | 8,8 (6,5) |
| Tarkon | 10.800 | 6.300 | 4.000 | 9,4 (7,8) |
| Vritra | 19.100 | 6.600 | 6.200 | 7,0 (6,0) |
| Veyla | 18.800 | 7.200 | 5.100 | 6,8 (3,5) |
| Morrak | 12.900 | 5.600 | 3.300 | 8,6 (8,3) |

Alle unter 25.000 Dreiecken (Aelvyr 25.500, Spielerfigur 19.700). Drei Zeichenaufrufe je Boss wie bei jedem Monster
(Körper, Umriss, Leuchtteile) plus Schatten; gebaut wird jedes Modell einmal und dann aus dem Vorrat genommen, die
vereinfachte Stufe nebenbei. Effekte aus dem gemeinsamen Effekt-Vorrat, höchstens 28 laufende Boss-Effekte, Dauereffekte
nur für höchstens zwei Bosse im Bild.

## Tests
- **Bilder im echten Spiel** (eigener Server, Stufe-80-Krieger in der Halle, normale Kamera, Zoom 2–2,4, Gerätefaktor 1,
  Boss-KI angehalten und gezielt gesteuert): je Boss vorher (14.77) und nachher Ruhe, Kampfbeginn (Brüllen + Hieb),
  Nahkampf, ein Spezialangriff (Strahl/Bodenwelle, Meteore, Nova oder Stampfer) und Tod. Übersicht:
  Scratchpad `bosse78/collage.jpg` (14 Zeilen × 6 Bilder). Zusätzlich Brüllen, Nova und Meteore bei Fenris, Azaroth,
  Vritra, Morrak; Schild, Tankschlag, Sprung, Sturm und Vernichtung bei Azaroth (Zweibeiner mit Flügeln), Ursus
  (Vierbeiner) und Veyla (Naga). Modellbilder (Wiki-Ansicht) aller 14 Bosse.
- **Echte Boss-Kämpfe** (KI läuft, Spieler unverwundbar, Leben in Stufen 72/50/30 % → Phasenwechsel mit Brüllen,
  Kristall-Schild, Stampfer, Vernichtung, danach Sieg und Todesanimation) für alle 14 Bosse: keine Seitenfehler.
- `node --check` aller geänderten Dateien; s73-Prüfung (alle 12 Charaktere, 2D, Port 8791): ohne Fehler.
- Hinweis zum Test: Die Rechenlast auf dem Testrechner war hoch (Spielzeit lief langsamer als die Uhr); die Bilder wurden
  darum nach Spielzeit aufgenommen.

## Offene Punkte
- **Weltendrache Ignar** (Karte 9) hat noch kein eigenes Modell (weiter das vergrößerte Drachenmodell, schwarze Flügel
  seit 14.68 behoben). Vorschlag: eigener Bauplan auf Grundlage des Aelvyr-Skeletts (Hals, Flügel mit Fingern), aber mit
  eigenem Kopf (Hornkrone, Magmamaul), Magmaadern, Schuppenplatten und Feuer-Thema.
- Instanz-Endbosse (Abaddor, Ifrah, Zerberos, Instanz-Wächter) → Paket 2.
- Wie bei Aelvyr laufen Posen und Effekte nur in 3D; in 2D bleibt der Kampf wie bisher (2D-Bilder unverändert).
- Beim Mitspieler (nicht Host) gibt es das Brüllen bei Kampfbeginn nur, wenn ihm der Boss ein Ziel meldet; das Taumeln
  nach dem Schildbruch sieht nur der Host (die Zeit kennt nur er). Phasenwechsel, Angriffe und Tod kommen überall an.
- Die Kristallkuppel ist größer, umschließt aber bei sehr breiten Posen (Flügel ganz offen) nicht jeden Flügelzipfel.
