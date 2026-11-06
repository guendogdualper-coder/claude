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
- **Flügel:** große Hautflügel, oben dunkelrot, unten warm rötlich. Arm und Hand liegen an der Vorderkante,
  dazu drei Finger mit Bronzespitzen und eine Daumenkralle. Der Handteil klappt an einer Scharnierlinie um und
  schließt sich dabei wie ein Fächer.
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
   - Ruhiges Atmen (Rumpf hebt sich leicht, Flügel gehen mit), Hals wiegt sich.
   - Der Kopf schaut langsam umher, das Maul öffnet sich etwa alle 9 Sekunden kurz.
   - Der Schwanz hängt und pendelt in einer Welle. Ein Hinterbein ist entlastet.
2. **Schweben/Fliegen:** Etwa 1,1 Schläge pro Sekunde beim Schweben, 1,4 beim Fliegen.
   - Der **Abschlag** ist schnell und kräftig (42 % des Zyklus), die Flügelspitze bleibt dabei etwas zurück.
   - Im langsameren **Aufschlag** knickt der Handteil ein.
   - Der Körper steigt im Abschlag und sinkt im Aufschlag (± 0,1). Beim Fliegen neigt sich der Kopf etwas nach
     vorn, leichtes seitliches Wiegen.
   - Hals gestreckt, Kopf hält die Blickrichtung. Vorderpfoten unter der Brust angelegt, Hinterbeine nach hinten
     gestreckt.
   - Der gestreckte Schwanz schwingt in einer Welle.
3. **Abheben / Landen** (Übergang über `air` 0 → 1 in 1,2 s bzw. 1 → 0 in 1,1 s):
   - **Abheben:** kurz ducken (Maul auf), Flügel öffnen, kräftiger Abschlag, steigen. Die Beine legen sich erst
     an, wenn der Drache sicher in der Luft ist.
   - **Landen:** bremsen mit hochgenommenem Kopf, die Beine strecken sich vor. Beim Aufsetzen federt er ab, danach
     legen sich die Flügel langsam an (≈ 0,6 s).

Bildreihen dazu (Flügelschlag in 8 Bildern, Abheben/Landen in 8 Bildern) liegen bei den Vorschaubildern.

## Geplante Spielmechanik (noch nicht eingebaut)

- **Erwerb:** beim Stallmeister ab **Stufe 60** für **500.000 Gold**. Vorschlag:
  `HORSES[3] = { name: 'Glutschwinge', speed: …, level: 60, price: 500000, fly: true }`.
- **Tempo:** etwa 10 % schneller als das Kriegsross.
  - Im aktuellen Code (seit 8.5) hat das Kriegsross `speed: 0.65`, also +65 % (Laufgeschwindigkeit × 1,65).
    10 % mehr ergibt × 1,815, also **`speed: 0.8`** (+80 %).
  - Der Auftrag nennt Kriegsross +90 % und Drache ≈ 1,1 (+110 %). Das passt, falls das Kriegsross vorher auf 0,9
    angehoben wird. → **offene Frage**
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
Teile erzeugen. Abschnitte: `drehung`, `flug`, `reiter`, `schlag`, `abheben`, `vergleich`, `spiel`, `bogen`.

Hinweis zu den Spielbildern: Von der steilen Spielkamera aus ist ein ganz hochgeschlagener Flügel nur ein schmaler
Strich. Die Bilder zeigen darum Phasen mit fast waagerechten Flügeln.

## Offene Fragen an den Spieler

1. **Tempo:** +80 % (10 % über dem heutigen Kriegsross) oder +110 % (wie im Auftrag, dann Kriegsross auf +90 %)?
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
