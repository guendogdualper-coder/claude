# Endboss Aelvyr, Wyrm des Abgrunds – neues 3D-Modell (seit 14.67)

**Wunsch:** „Der Endboss sieht gar nicht aus wie so ein Endboss. Muss auf jeden Fall nochmal epischer irgendwie 3D
animieren.“ (Stufe-80-Endboss auf Karte 10 Kristallabgrund, Halle `raid_aelvyr`)

## Ursache

- Aelvyr hatte kein eigenes Modell: `raid.art: 'kristallwyrm'` → das 2D-Bild des Kristallwyrms wurde in 3D zum
  allgemeinen Vierbeiner (`beast3` mit Brettflügeln aus `wingGeo`) und nur um 2,3 vergrößert: flach, einfarbig blau,
  4,2 Einheiten hoch, Spannweite 9. Animiert wurde er wie jedes Tier (`animateCreature`).
- **Schwarze Fläche:** Gespiegelte Teile (negative Größe, z. B. der rechte Flügel `s: [-1.25, 1.25, 1.25]`) wurden beim
  Zusammenführen (`mergeRaw`, drei-kern.js) mit unverändertem Dreiecks-Umlauf übernommen. Ihre Dreiecke zeigten nach
  innen: die beleuchtete Seite wurde weggeschnitten, sichtbar blieb nur die schwarze Umrisshülle – von allen Seiten.
  Das betraf auch andere Endbosse: **Azaroth, Ifrah, Abaddor und Ignar** hatten je einen schwarzen Flügel.

## Änderung

### Fehler „schwarze Fläche“ (alle Modelle)
- `mergeRaw`/`mergeRawSteps` drehen den Umlauf gespiegelter Teile um (`flipTris3`, Determinante der Teilmatrix < 0),
  auch für Vorlagen. Damit sind die schwarzen Flügel von Azaroth, Ifrah, Abaddor, Ignar (und allen anderen gespiegelten
  Teilen im Spiel) behoben. Der Knochendrache, der den Fehler mit einer vorgespiegelten Form umging, bleibt unverändert.

### Eigenes Modell (`js/aelvyr.js`, `MON3_BUILD.aelvyr`)
- 32 Knochen: Rumpf (Hüfte/Brust), Hals in vier Gliedern, Kopf, Kiefer, Schwanz in vier Gliedern, je Bein Ober-/
  Unterteil, je Flügel Arm, Unterarm und vier Finger.
- Rumpf, Hals, Schwanz, Finger und Flughaut weich gewichtet (eigene skinIndex/skinWeight), biegen sich ohne Knicke.
- Kantiger Kopf (sechseckiger Querschnitt) mit Brauenwulst, leuchtenden Augenschlitzen, Nüstern, Zähnen und Fängen,
  aufklappbarem Unterkiefer, glimmendem Rachen; großes, weit nach hinten geschwungenes Hornpaar mit Kristallringen und
  Kristallspitzen, kleines Hornpaar, Wangen-, Kinn- und Kronenstacheln.
- Stachelkamm vom Hinterkopf bis zur Schwanzspitze, dazwischen leuchtende Kristalle; Schwanzspitze als Kristallklinge.
- Segmentierter Leib mit Bauchplatten (Hals, Brust, Bauch, Schwanz), Schulter- und Hüftpanzer, Unterarmplatten,
  Ellbogendornen, Krallen mit drei Zehen und Afterkralle.
- Echte Flügel: Arm, Unterarm, Daumenkralle, vier Finger; Flughaut mit bogenförmig eingebuchtetem Hinterrand, als
  **Ober- und Unterseite je eigene Fläche** (keine schwarzen Rückseiten), ohne dicken Umriss; leuchtende Adern in der Haut.
- Farben: tiefes Nachtblau/Violett (dunkler als der Hallenboden), Kristalladern in Eisblau und Violett (leuchtend,
  ohne Licht).
- Größe: Kopf etwa 5,8, Hornspitzen etwa 7, Spannweite etwa 16, Länge etwa 14,5 Einheiten (Spieler 1,64; vorher 4,2 hoch,
  Spannweite 9). Der Kampfkreis (`r = 74`) und damit Treffer, Reichweiten und Zielwahl bleiben gleich; Name und
  Lebensbalken stehen über dem Kopf (Modellhöhe), beim Fliegen steigen sie mit.

### Animation (`aelAnim3` statt `animateCreature`)
- Weich nachgeführte Posenwerte (Aufbäumen, Schweben, Flügel falten/heben, Flügelschlag, Hals heben/vorstoßen,
  Kiefer, Ducken, Leuchten …), darüber Atmen, Halsschwingen, Schwanzwelle und Laufzyklus (Schrittfolge wie ein Vierbeiner).
- Kopf folgt dem Ziel (über alle Halsglieder verteilt), neigt sich zu nahen Gegnern.
- Ruhe: Flügel gefaltet, ab und zu gestreckt; Kampf: Flügel halb offen und erhoben; Laufen: Flügel angelegt.
- Nahkampf im Wechsel: **Biss** (zurückziehen, Maul auf, vorschnellen), **Klauenhieb** (Vorderbein hoch, Hieb quer),
  **Schwanzfeger** (Körper dreht ein, Schwanz fegt herum).
- **Brüllen** bei Kampfbeginn und bei jedem Phasenwechsel (Kopf hoch, Maul weit auf, Flügel ausgebreitet, Dampf).
- Endboss-Angriffe mit eigener Pose: Atem (Hals zurück, Maul glimmt, dann Strahl), Meteor (auf den Hinterbeinen,
  Flügel schlagen, brüllt in die Höhe), Nova (steigt mit kräftigen Schlägen auf, Flügelstoß nach unten, landet),
  Stampfer (bäumt sich auf, kracht herunter), Tankschlag (Klaue hoch, Schlag), Sprung (duckt sich, Bogen durch die Luft
  mit Flügelschlag, Landung), Sturm (Kopf tief, Flügel angelegt), **Vernichtung** (steigt etwa 4,6 Einheiten hoch,
  schwebt mit schweren Schlägen, Kristalle glühen auf, stürzt beim Einschlag herab).
- **Tod** (Leiche 4,6 s statt 0,55 s): bäumt sich brüllend auf, sinkt zusammen (Beine knicken weg, Hals fällt zur
  Seite, Flügel breiten sich am Boden aus), nach 1,3 s zerspringen die Rückenkristalle (Splitter fliegen), das Leuchten
  erlischt, am Ende versinkt er.

### Effekte (3D, `aelFx3` über `FX3_HOOKS`)
- **Abgrund-Atem** (Linienangriff): Glühen im Maul während der Ankündigung, dann Kegel aus vier Hüllen vom Maul bis
  ans Ende der Warnlinie, darin strömende Lichtteilchen und Kristallsplitter.
- **Kristallsturz** (statt der Meteore): große Kristalle stürzen vom Himmel, Schatten wächst am Boden, beim Aufschlag
  zerspringen sie in Splitter.
- **Flügelstoß/Landung:** Staubwolke und Funken fliegen flach nach außen (keine Linie, kein Ring am Boden).
- **Vernichtung:** Staub beim Abheben, beim Einschlag große Staubwelle und sieben stürzende Kristalle.
- Brüllen: Dampf aus dem Maul und eine Staubwelle statt Bodenring und Lichtsäule; Splitter beim Tod. Kurzes Bildschirmbeben; der Bildschirmblitz bei Brüllen, Nova und
  Vernichtung entfällt bei Aelvyr. Vorhandene Warnflächen bleiben; die Kristallkuppel (Schild) ist um ihn 55 % größer.
- Mechanik und Balance unverändert (gleiche Angriffe, Zeiten, Schaden, Kreise).

### 2D
- Eigenes 2D-Bild (`MONSTER_ART.aelvyr`): nachtblau, fast doppelt so groß wie der Kristallwyrm (vorher dasselbe Bild).

## Dateien
js/aelvyr.js (neu), js/drei-kern.js (Spiegel-Fehler), js/drei-figuren.js (Anbindung Animation/Leiche),
js/gegner.js (Ankündigung, Brüllen, kein Blitz), js/endboss.js (kein Blitz, größere Kuppel), js/effekte.js (Leiche),
js/karte80.js (2D-Bild), index.html, sw.js (neue Datei in der Liste, Version unverändert).

## Messwerte
- Modell: etwa 25.500 Dreiecke (vereinfachte Stufe 15.300), Schattenmodell 5.100; Abaddor 16.300, Spielerfigur 19.700.
  Drei Zeichenaufrufe wie bei jedem Monster (Körper samt Flughaut, Umriss, Leuchtteile) plus Schatten. Gebaut wird es
  einmal und dann aus dem Vorrat genommen.
- Effekte aus dem gemeinsamen Effekt-Vorrat (gebündelte Lichtflecken), höchstens 24 gleichzeitig.

## Tests
- Bilder im echten Spiel (eigener Server, Stufe-80-Krieger in der Halle, normale Kamera, Zoom 1,8): vorn, Seite,
  hinten, schräg, Biss, Brüllen, Atem, Vernichtung, Kristallsturz, Nova, Tod; Posen einzeln im Modellbetrachter.
  Übersicht vorher/nachher als zusammengesetztes Bild (Scratchpad `aelvyr/aelvyr_uebersicht.png`).
- 2D-Ansicht: Stand, Angriffe, Tod ohne Fehler (größeres Bild, gewohnte Effekte).
- Endbosse vorher/nachher (Wiki-Bild): schwarze Flügel bei Azaroth, Ifrah, Abaddor, Ignar behoben, sonst gleich.
- `node --check` der geänderten Dateien, s73-Prüfung: alle 12 Charaktere ohne Fehler.

## Offene Punkte
- Die Effekte und Posen laufen nur in 3D; in 2D bleibt der Kampf wie bisher (nur das größere Bild).
- Beim Mitspieler (nicht Host) gibt es das Brüllen bei Kampfbeginn nur, wenn der Boss ihm ein Ziel meldet; das Brüllen
  bei Phasenwechseln kommt überall an.
- Im Schulterblick ganz nah sieht man bei diesem Riesen oft nur Beine und Bauch – am besten mit etwas herausgezoomter
  Kamera kämpfen.
