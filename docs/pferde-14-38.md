# Pferde 14.38: Hinterhand, Mähne und Schweif organisch statt „wie Lego“

Auftrag: Hinterbein/Hinterteil und die Haare von Reitpferd (Stufe 20) und Kriegsross (Stufe 40) sollen echter aussehen.

## Ursache
Das Pferd bestand aus aufeinandergesetzten Kugeln, Kapseln und Zylindern, je starr an einem Knochen: sichtbare
Stufen an jedem Gelenk, die Mähne war eine Reihe einzelner Zacken, der Schweif sieben flache Platten an einem Stummel.

## Änderung (js/drei-figuren.js)
- Neuer Baustein `softTube3`: eine Form entlang einer Mittellinie mit eigenem Querschnitt je Station (Breite, Tiefe
  vorn/hinten), weich verbunden (Catmull-Rom), mit Farbe und Knochengewichten je Station (höchstens zwei Knochen).
  Gelenke biegen sich ohne Stufe, Fell geht ohne Kante in die dunklen Beine über. Keine neuen Texturen oder Shader.
- Rumpf aus einem Stück (vorher sechs Kugeln): Rücken läuft weich über die runde Kruppe zum Schweifansatz aus.
- Hinterbein aus einem Stück: Hinterbacke und breiter Oberschenkel, nach unten verjüngt, Knie vorn, Unterschenkel
  schräg nach hinten, Sprunggelenk mit Fersenhöcker (etwas höher und weiter hinten als bisher), schlankes Röhrbein,
  Fesselkopf, schräge Fessel, Huf mit schräger Vorderwand. Vorderbein und Hals ebenso angeglichen. Kopf unverändert.
- Mähne: 15 breite, überlappende Strähnen fallen über den Kamm zur Seite (verschieden lang, leicht gewellt, Wurzel
  dunkler, Spitze zum Fellton hin), kurzer Saum auf der anderen Seite, Mähnenkamm, Schopf zwischen den Ohren.
  Kriegsross: länger, kräftiger, beidseitig, kommt unter den Halsschienen hervor; statt Schopf zwei Büschel neben dem Dorn.
- Schweif: Rübe und 10 (Kriegsross 13) überlappende Strähnen, oben voll, unten schmaler, Spitzen verschieden lang.
  Vier Schweifglieder (Knochen 7, 19, neu 20 und 21) schwingen im Stand und im Galopp nacheinander nach.
- Satteldecke und Schabracke liegen jetzt als Tuch am neuen Rumpf an (vorher Kugelschalen), Saum in gleicher Höhe,
  Goldborte; Behang, Gurt und Steigbügelriemen folgen dem neuen Umriss. Beim Kriegsross endet das Tuch vor dem
  Schweifansatz, die Rübe sitzt tiefer – nichts sticht durch.
- Galopp (`horseGait3`): Richtung der Gelenke war schon richtig (Sprunggelenk knickt nach hinten, Röhrbein klappt
  nach vorn); im Schwung beugt es sich jetzt stärker (1,2 statt 1,0). Tempo, Takt, Rumpfsenkung und Sitzhöhe unverändert.
- 2D (js/figuren.js, `horseArt`): Beine als geschwungene Form mit Sprunggelenk, Mähne mit Strähnensaum und Schopf,
  Schweif aus drei Strähnen. Größe des Bildes und Reithöhe unverändert.

## Dreieckszahlen (sichtbares Modell)
| Pferd | vorher | nachher | Änderung |
|---|---|---|---|
| Reitpferd | 11 918 | 14 056 | +17,9 % |
| Kriegsross | 20 958 | 23 060 | +10,0 % |

Das Schattenmodell wurde kleiner (2 880 → 1 692 bzw. 4 896 → 3 708). Pferde haben kein vereinfachtes Modell; auf
Grafikstufe „Niedrig“ gilt dasselbe Modell (geprüft).

## Bilder
Ordner `/tmp/claude-0/-home-user-claude/28e727e5-656e-544c-9afe-3c541c335198/scratchpad/pferd/`:
`pferd-reitpferd-vergleich.jpg`, `pferd-kriegsross-vergleich.jpg` (vorher/nachher: Seite, schräg hinten, hinten,
schräg vorn, Hinterhand nah), `pferd-lauf-nachher.jpg` (vier Galoppphasen), `pferd-spiel-reitpferd.jpg`,
`pferd-spiel-kriegsross.jpg` (im Spiel mit Reiter). Arbeitsskripte und Zwischenrunden im Unterordner `w/`.

## Tests
- `node --check` auf drei-figuren.js und figuren.js.
- s73-Kopie: alle 12 Charaktere ohne Fehler. s72_noshot mit D3=1: ohne Fehler.
- Drachen-Test (test-drache.js): 36 OK, keine Seitenfehler.
- Im Spiel mit Reiter (Krieger auf „Hoch“, Magier auf „Niedrig“), stehend und im Galopp, sechs Blickwinkel.

## Offene Punkte
- Es gibt weiterhin nur Stand und Galopp (kein eigener Schritt oder Trab).
- Das Knie des Hinterbeins ist geformt, aber kein eigenes Gelenk: Oberschenkel und Unterschenkel drehen gemeinsam.
- Die Mähne schwingt nicht mit (hängt fest am Hals); der Behang der Schabracke bewegt sich nicht mit den Schenkeln.
- Das Pferd am Stand des Stallmeisters nutzt dasselbe Modell; es wurde nur auf Fehlerfreiheit geprüft, nicht eigens fotografiert.
