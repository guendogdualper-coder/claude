# Drachen-Reittier „Glutschwinge“ – Entwurf (Stufe 60)

Stand: Entwurf zum Anschauen, **noch nicht im Spiel**. Modell und Animation liegen in `js/drei-drache.js`.
Die Datei wird nur von der Vorschau geladen. index.html, sw.js, Stallmeister, Spielstand und Spielablauf
sind unverändert.

Wunsch des Spielers: „Ab Level 60 einen Drachen, dass man über Hindernisse fliegen kann. Er soll nur ein bisschen
über dem Boden schweben, dass man gefühlt über die Bäume fliegen kann und nirgends hängen bleibt.“

## Aussehen

Eigener Entwurf im Low-Poly/Toon-Stil der Pferde: gleiche Bauweise (glatter Leib aus `loft3`, Glieder aus
`limbBetween`, dunkler Umriss, Toon-Schattierung, Glanz auf Bronze). Bewusst **kein** Nachbau bekannter Drachen
aus Spielen oder Filmen.

- **Leib:** schlank und lang, tiefe Brust, schmale Taille. Schuppen dunkelrot (`#5c1517`), oben etwas heller.
- **Bauch:** hell (Elfenbein `#e3c999`), mit feinen Querbändern. Derselbe helle Streifen läuft an der Kehle
  und unter dem Schwanz entlang.
- **Kopf:** kurzer Keilkopf mit Bronze-Brauenplatten und Zähnen am Oberkiefer.
  - Zwei **Haupthörner** aus Bronze: nach hinten geschwungen, an der Spitze wieder aufgebogen, mit Ringen.
  - Zwei kleine **Wangenhörner** und je ein **Wangenfächer** aus drei Bronzestrahlen mit Haut dazwischen.
  - **Augen** bernsteinfarben, dezent glimmend (Material `glow`) mit schmaler Pupille.
- **Rückenplatten:** abgerundete Bronzeplatten statt Stacheln, auf Hals, Rücken und Schwanz. Die Sattelgegend
  bleibt frei.
- **Flügel** (überarbeitet nach der Rückmeldung „zu statisch, zu gerade“): große Hautflügel, oben dunkelrot,
  unten warm rötlich.
  - Die Haut ist keine flache Platte mehr, sondern ein fein unterteiltes, **bauchig gewölbtes** Netz
    (Ober- und Unterseite).
  - Der **Hinterrand** ist zwischen den Fingerspitzen bogenförmig **eingebuchtet**, auch am Innenteil zum Rumpf.
  - Drei **leicht gebogene, ungleich lange Finger** (rot, zur Spitze Bronze), dazu eine Daumenkralle und eine
    Kralle an der Spitze des langen Fingers.
  - Ober- und Unterarm bilden die Vorderkante. Der Handteil klappt beim Anlegen an der Kante Handgelenk–Hinterrand
    als Ganzes um.
- **Schwanz:** in vier Gliedern, am Ende ein flaches **Bronzeblatt** mit zwei seitlichen Widerhaken.
- **Beine:** vier Beine. Vorn Oberarm, Unterarm und Pfote; hinten kräftiger Schenkel, Fersengelenk und Fuß.
  Krallen hell, Sporne aus Bronze.
- **Sattel:** sitzt auf den Schultern **vor** den Flügelansätzen, damit die Flügel nie durch die Beine des
  Reiters schlagen.
  - Decke (später wie beim Pferd in der Klassenfarbe) mit Bronzeborte, Ledersitz, hohe Rückenlehne.
  - Bronze-Haltegriff, Seitenblätter, Bauchgurt, Steigbügel.
- **Keine** Bodenringe, Runen, Sterne oder Partikel. Der einzige „Effekt“ ist das Glimmen der Augen.

### Maße (Welt-Einheiten, 1 Kachel = 1)

| | Glutschwinge | Kriegsross | Spielfigur |
|---|---|---|---|
| Höhe | Rücken ≈ 1,75, Hornspitzen ≈ 3,1 | ≈ 2,5 (Kopf) | ≈ 1,7 |
| Länge | ≈ 5,9 (Nase bis Schwanzspitze) | ≈ 3,1 | – |
| Spannweite | ≈ 6,9 | – | – |
| Modellmaßstab | 1,45 | 1,3 | 1,14 |

Im Flug (siehe unten) liegen der Bauch bei ≈ 1,9, die Rumpfmitte bei ≈ 2,3 und der Sattel bei ≈ 2,9 Einheiten über
dem Boden. Dazu kommt ein Auf und Ab von ± 0,1 im Flügeltakt.

## Animation

Zwei Funktionen in `js/drei-drache.js`:

- `dragonMountPose3(a, t, { air, open, ph, flare, moving })`: Haltung zu einem Zeitpunkt, ohne eigenen Zustand
  (für die Vorschau-Bilder).
- `dragonMountAnim3(a, t, dt, 'fly' | 'stand', moving)`: dasselbe mit Zustand fürs Spiel. Zustand `a.dm.mode`
  ist `stand`, `takeoff`, `fly` oder `land`.
- Dazu `dragonSeat3(a)`: Sattelpunkt in Weltkoordinaten mit Neigung und Rollen des Rumpfs, damit der Reiter mitgeht.

Die drei Zustände:

1. **Stehen:** Die Flügel sind angelegt: gehoben, nach hinten geschwenkt, Handteil umgeklappt und
   zusammengeschoben.
   - **Locker statt steif:** Die Flügel atmen mit, die Finger spielen leicht.
   - Etwa alle 12 Sekunden **streckt** der Drache die Flügel halb auf und **schüttelt** sie kurz aus. Der rechte
     Flügel kommt etwas später als der linke.
   - Ruhiges Atmen (Rumpf hebt sich leicht), Hals wiegt sich.
   - Der Kopf schaut langsam umher, das Maul öffnet sich etwa alle 9 Sekunden kurz.
   - Der Schwanz hängt und pendelt in einer Welle. Ein Hinterbein ist entlastet.
2. **Schweben/Fliegen:** Etwa 1,1 Schläge pro Sekunde beim Schweben, 1,4 beim Fliegen.
   - Der **Abschlag** ist schnell und kräftig (42 % des Zyklus), der langsamere **Aufschlag** folgt.
   - **Welle durch den Flügel:** Unterarm, Finger und die Spitze des langen Fingers folgen dem Arm jeweils etwas
     später (je ≈ 6 % des Zyklus). Die Spitze zieht nach und biegt sich.
   - **Luftdruck:** Im Abschlag drückt sich die Hautmitte zwischen den Knochen nach oben durch. Im Aufschlag
     falten Hand und Finger weich ein und die Haut sinkt.
   - **Gleiten:** Beim Vorwärtsfliegen gleitet der Drache etwa alle 7 Sekunden rund 2 Sekunden lang. Die Flügel
     bleiben dann fast ruhig gespannt, dafür **flattert der Hinterrand** (leicht auch im normalen Flug).
   - Der Körper steigt im Abschlag und sinkt im Aufschlag (± 0,1). Beim Fliegen neigt sich der Kopf etwas nach
     vorn, leichtes seitliches Wiegen.
   - **Mehr Welle im ganzen Körper:**
     - Der Hals schwingt in zwei Gliedern im Flügeltakt und wiegt sich seitlich; der Kopf hält die Blickrichtung.
     - Der Rücken biegt sich weich zwischen Brust und Hüfte (neuer Hüftknochen).
     - Der Schwanz schwingt mit größerer Welle in beide Richtungen.
   - Vorderpfoten unter der Brust angelegt, Hinterbeine nach hinten gestreckt.
3. **Abheben / Landen** (Übergang über `air` 0 → 1 in 1,2 s bzw. 1 → 0 in 1,1 s):
   - **Abheben:** kurz ducken (Maul auf), Flügel öffnen, kräftiger Abschlag, steigen. Die Beine legen sich erst
     an, wenn der Drache sicher in der Luft ist.
   - **Landen:** bremsen mit hochgenommenem Kopf, die Beine strecken sich vor. Beim Aufsetzen federt er ab, danach
     legen sich die Flügel langsam an (≈ 0,6 s).

Bildreihen dazu (Flügelschlag in 8 Bildern, Abheben/Landen in 8 Bildern), Strecken im Stand, Gleiten und eine
Vorher/Nachher-Gegenüberstellung der Flügel liegen bei den Vorschaubildern.

### Technik der Flügel und Leistung

- Die Haut bekommt in der Form selbst fließende Knochengewichte (`skinIndex`/`skinWeight`). Bake3 übernimmt
  diese schon heute für weich biegende Schläuche.
  - Am Rand hängt die Haut fest an Arm, Unterarm, Hand und Fingern; dazwischen wird überblendet.
  - Zur Mitte hin wächst der Anteil eines „Segel“-Knochens, der die Haut quer zur Fläche schiebt (Wölbung,
    Durchdrücken, Flattern).
- Neue Knochen je Flügel: Unterarm, langer Finger in zwei Gliedern, zwei weitere Finger, Segel innen und außen.
  Dazu kommt die Hüfte.
- **Dreiecke** (sichtbar, ohne Schattenmodell):

  | Modell | Dreiecke |
  |---|---|
  | Drache neu | ≈ 20.800 |
  | Drache vorher | ≈ 19.200 (+8 %) |
  | Kriegsross | ≈ 21.000 |
  | Spielfigur | ≈ 19.200 |

  Das grobe Schattenmodell bleibt unverändert (≈ 3.300).
- **Knochen:** 37 statt 22. Das Spiel überträgt die Knochen über eine Textur (`floatVertexTextures`), damit ist das
  unkritisch.
- **Anlegen ohne Umstülpen:** Beim Anlegen klappt der Handteil als Ganzes über die gemeinsame Kante mit dem
  Innenteil um. Ein stark geschlossener Fächer hätte beim Blend-Skinning einzelne Hautdreiecke umgestülpt; der
  dunkle Umriss schien dort durch.

## Geplante Spielmechanik (noch nicht eingebaut)

- **Erwerb:** beim Stallmeister ab **Stufe 60** für **500.000 Gold**. Vorschlag:
  `HORSES[3] = { name: 'Glutschwinge', speed: …, level: 60, price: 500000, fly: true }`.
- **Tempo:** etwa 10 % schneller als das Kriegsross. Das Kriegsross hat inzwischen `speed: 0.9` (+90 %, also
  Laufgeschwindigkeit × 1,9).
  - **`speed: 1.0`** (+100 %, × 2,0): 10 Prozentpunkte mehr Bonus, absolut ≈ 5 % schneller als das Kriegsross.
  - **`speed: 1.1`** (+110 %, × 2,1): absolut ≈ 10 % schneller.
  - → **offene Frage**, welche Lesart gemeint ist.
- **Fliegen über Hindernisse:** Aufsitzen = Abheben, Absitzen = Landen, wie beim Pferd über die Reittier-Taste.
  Solange der Drache fliegt, ignoriert die Bewegung:
  - Bäume (`TREE`, `PINE`, `BLOSSOM`, `DEADTREE`)
  - Felsbrocken (`ROCK`, solange nicht `rockSolid`)
  - Flüssiges: Wasser, Moor, Lava, Abgrund (`LIQUID`)

  Weiter festhalten:
  - Häuser (`HOUSE`), Mauern (`WALL`), Höhlenwände (`CAVEWALL`), Säulen (`PILLAR`)
  - der Felsrand jeder Karte (`rockSolid`, `MAP_BORDER`) und der Kartenrand

  Umsetzung: eine eigene Abfrage `tileBlockedFlying` neben `tileBlocked` (welt.js), die die Bewegung beim Fliegen
  benutzt.
- **Landen nur auf freiem Boden:** Wer über Wasser, einem Baum oder Lava absitzt, wird zur nächsten freien Kachel
  geschoben (oder das Absitzen wird dort verweigert). Ebenso, wenn man im Flug in den Kampf gerät und automatisch
  absitzt.
- **Höhe:** Der Drache schwebt nur „ein bisschen“: Rumpfmitte ≈ 2,3, Bäume sind ≈ 3 hoch. Aus der schrägen
  Spielkamera wirkt das wie über den Bäumen (siehe Spielbilder). Kronen, die zwischen Kamera und Spieler stehen,
  werden schon heute durch das Raster um den Spieler durchsichtig.
- **Kampf:** wie beim Pferd: nicht aufsitzen, solange man vor weniger als 3 s gekämpft hat. Wer angreift oder
  getroffen wird, landet. Kein Kampf aus der Luft.
- **Dungeons/Instanzen:** Vorschlag: dort nicht fliegen, nur laufen (sonst lassen sich Wege und Mauern umgehen).
- **Mitspieler:** `netz.js` überträgt das Reittier als `r: horseTier`. Ein dritter Wert muss bei älteren Clients
  mindestens als Pferd erscheinen. Die Flughöhe sehen andere über den Zustand `fly`.

### Einbau später (Skizze)

1. `js/drei-drache.js` in index.html und sw.js aufnehmen (nach drei-figuren.js), Versionsnummer erhöhen.
2. In `drei-figuren.js` im Reit-Zweig: bei `tier === 3` statt `horseParts3`/`horseGait3` die Funktionen
   `dragonMount3` und `dragonMountAnim3` verwenden.
   - Reiterhöhe aus `dragonSeat3(h).pos.y - hipY · scale` setzen.
   - Rumpfneigung auf den Reiter übertragen (`rotation.x = pitch`, Reihenfolge `YXZ`).
   - Beine weiter spreizen: `(-0,95, 0, ±1,12)` statt `(-1,2, 0, ±0,5)`.
   - Für den Spiel-Renderer einen eigenen Modellschlüssel nehmen: das Spiel gibt Rohdaten nach dem Hochladen frei.
3. `HORSES[3]`, Stallmeister-Angebot (Stufe 60, 500.000 Gold), `tileBlockedFlying`, Landeprüfung, Klang
   (Flügelschlag statt Hufe).

## Vorschau neu erzeugen

```
python3 -m http.server 8795          # im Projektordner (anderer Port, falls belegt)
node tools/drache-vorschau.js <Zielordner> http://localhost:8795/
```

`tools/drache-vorschau-seite.js` baut eine eigene kleine Bühne (eigener Renderer, doppelte Auflösung) und setzt den
Drachen für die Spielbilder in die echte 3D-Welt (Dunkelwald, Tag). Mit `NUR=drehung,flug,…` lassen sich einzelne
Teile erzeugen. Abschnitte: `drehung`, `flug`, `reiter`, `schlag`, `abheben`, `vergleich`, `spiel`, `leben`
(Strecken, Gleiten), `vorher`, `bogen`.

Mit `VORHER_JS=<ältere drei-drache.js>` entsteht im Abschnitt `vorher` eine Gegenüberstellung der Flügel. Die alte
Fassung läuft dabei in einer zweiten Seite mit denselben Haltungen und Kameras. Die ältere Datei bekommt man z. B.
mit `git show <commit>:js/drei-drache.js`.

Hinweis zu den Spielbildern: Von der steilen Spielkamera aus ist ein ganz hochgeschlagener Flügel nur ein schmaler
Strich. Die Bilder zeigen darum Phasen mit fast waagerechten Flügeln.

## Offene Fragen an den Spieler

1. **Tempo:** `speed: 1.0` (+100 %, absolut ≈ 5 % schneller als das Kriegsross mit +90 %) oder `1.1` (+110 %,
   absolut ≈ 10 % schneller)?
2. **Größe:** passt die Spannweite von ≈ 6,9 Kacheln? Auf dem Handy nimmt der Drache im Flug viel Bild ein.
   Möglich wären 10–15 % kleiner.
3. **Flughöhe:** reicht „knapp über den Bäumen“ (Rumpfmitte 2,3), oder soll er sichtbar höher fliegen
   (z. B. 3,5)? Dann sähe man die Bäume deutlich unter sich, die Kamera müsste aber etwas weiter heraus.
4. **Wasser und Lava:** auch über Lava und Abgründe fliegen, oder nur über Wasser und Moor?
5. **Farbe:** dunkelrot/Bronze wie gezeigt? Gewünscht vielleicht Varianten (z. B. Nachtblau/Silber) als
   spätere Belohnung?
6. **Sattel:** Decke in der Klassenfarbe wie beim Pferd, oder immer gleich (Blau wie im Bild)?
7. **Name:** „Glutschwinge“ in Ordnung oder ein anderer Name?
8. **Dungeons:** Fliegen in Dungeons und Instanzen verbieten (Vorschlag) oder erlauben?
9. **Kampf:** landen beim Angriff (wie das Absitzen beim Pferd) oder im Flug weiterkämpfen können?
10. **Flügel:** Sind sie jetzt lebendig genug? Möglich wären noch mehr Gleitphasen, ein langsamerer Takt beim
    Schweben oder ein kräftigeres Durchdrücken der Haut.
