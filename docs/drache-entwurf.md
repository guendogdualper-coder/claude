# Drachen-Reittier „Glutschwinge“ – Entwurf (Stufe 60)

Stand: **im Spiel eingebaut** (nach 14.25; der Spieler hat den Entwurf freigegeben). Modell, Animation und die
Anbindung an die Figuren liegen in `js/drei-drache.js`; Regeln, Kauf, 2D, Klang und Hilfe stehen unter
„Spielmechanik“. Versionsnummer und Versionsliste sind noch nicht angepasst.

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

## Spielmechanik (eingebaut)

- **Erwerb:** beim Stallmeister (Jun in Kazehana und in jedem Lager) ab **Stufe 60** für **500.000 Gold**,
  `HORSES[3] = { name: 'Glutschwinge', speed: 1.1, level: 60, price: 500000, fly: true }` (spieler.js).
  - Ein Pferd muss vorhanden sein (Reitpferd reicht, das Kriegsross ist keine Bedingung).
  - Der Kauf setzt `p.horseTier = 3`, wie das Kriegsross `2`.
  - Angebot, Hinweise und Texte wie beim Kriegsross (quests.js, `renderStable`).
- **Tempo:** `speed: 1.1` (+110 %), Kriegsross `0.9` (+90 %). Mit gleichem Fußtempo ist der Drache gemessen
  1,105-mal so schnell wie das Kriegsross (277 gegen 251).
- **Knopf und Anzeige:** Der Pferdeknopf heißt mit Drachen „Drache“ und zeigt „+110 %“. Der Hinweis lautet
  „Glutschwinge (+110 % Lauftempo) · fliegt über Bäume, Felsen und Wasser“. Im Charakterfenster steht
  „Drache +110 %“.
- **Fliegen über Hindernisse** (welt.js, `tileBlockedFlying`/`canFly`, `moveEntity` mit `e.flying`):
  - Überflogen werden: Bäume (`TREE`, `PINE`, `BLOSSOM`, `DEADTREE`), Felsbrocken (`ROCK`), alles Flüssige
    (Wasser, Moor, Lava, Abgrund) und alles, was man ohnehin begehen kann.
  - Weiter fest bleiben: Häuser, Mauern und Palisaden (`WALL`), Säulen, Höhlenwände, der Felsrand jeder Karte und
    alles außerhalb der Karten.
  - Seelensteine und Portale halten auf wie beim Pferd (`solidBump`).
- **Wo er fliegt** (`dragonSkyOk`): nur in der offenen Welt.
  - Dungeons, Instanzen, Prüfungs- und Turnierarena liegen außerhalb der Karten. Dort, im Duell und im PvP-Kampf
    kann man nicht aufsteigen („Hier kann dein Drache nicht fliegen“).
  - Wer reitend dorthin kommt, landet im nächsten Bild von selbst (`dragonRideTick`, aufgerufen in
    `updatePlayer`).
- **Landen:** Wer über Wasser, Bäumen oder Lava absteigt, wird zur nächsten freien Kachel versetzt (`landingSpot`:
  Ring um Ring, höchstens 24 Kacheln, sonst Lager bzw. Stadt). Das gilt auch, wenn man durch einen Angriff oder
  eine Fertigkeit absteigt (wie beim Pferd).
- **Kampf:** wie beim Pferd. Nicht aufsitzen bis 3 s nach dem letzten Kampf, wer angreift oder eine Fertigkeit
  nutzt, steigt ab.
- **3D** (drei-figuren.js → `rideDragon3`/`dragonLand3` in drei-drache.js):
  - Eigener Modellschlüssel je Sattelfarbe (Klassenfarbe).
  - Der Sattel liegt genau über der Spielerstelle, der Reiter sitzt darauf (`dragonSeat3`) mit gespreizten Beinen.
    Name und Balken stehen über dem Reiter.
  - Beim Aufsitzen hebt der Drache vom Boden ab. Geritten bleibt er immer in der Luft: im Stand schwebend, beim
    Laufen fliegend. So „steht“ er nie auf Wasser oder in Bäumen.
  - Nach dem Absitzen landet er an Ort und Stelle und blendet in der letzten halben Sekunde aus (≈ 1,7 s).
  - Den Schatten am Boden wirft der Drache.
- **2D** (figuren.js `dragonMountArt`, zeichnen.js): seitlicher Drache, schwebend, mit Flügelschlag in vier Bildern
  und Schatten am Boden. Der Reiter sitzt höher (`rideHeight(p)` statt der festen `RIDE_HEIGHT`, auch für Namen und
  Magier-Symbole).
- **Mitspieler:** `netz.js` überträgt schon `r: horseTier`, also 3. Mitspieler sehen den Drachen in 3D und 2D;
  ihre Position gleitet ohne Kollision.
  - Ältere Clients zeichnen bei Stufe 3 ein Reitpferd (kein Fehler).
- **Klang** (klang-welt.js, erzeugt, keine Aufnahmen):
  - Beim Aufsitzen ein kurzer, grollender Ruf mit zwei Flügelschlägen.
  - Beim Landen zwei Flügelschläge, ein dumpfes Aufsetzen und ein Schnauben.
- **Hilfe:** Ratgeberin mit „Was ist der Drache (Glutschwinge)?“ und „Wo kann mein Drache fliegen?“. Suchwörter
  Drache, Drachen, dragon, Glutschwinge, fliegen, Flug, Reittier.
- **Englisch:** alle neuen Oberflächentexte in `js/sprachen/en.js` (Emberwing); andere Sprachen fallen auf
  Englisch zurück.
- **Höhe:** Der Drache schwebt nur „ein bisschen“: Rumpfmitte ≈ 2,3, Bäume sind ≈ 3 hoch. Aus der schrägen
  Spielkamera wirkt das wie über den Bäumen. Kronen zwischen Kamera und Spieler werden durch das Raster um den
  Spieler durchsichtig.
- **Leistung** (gemessen mit Software-Grafik):
  - Gleich viele Dreiecke im Bild wie mit Kriegsross (≈ 277.000 gegen 280.000).
  - Zeichenaufrufe 49 gegen 50–52.
  - Bildrate im Rauschen gleich.
  - Die Drachenanimation kostet etwa 0,03 ms CPU je Bild.

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

1. **Tempo:** entschieden: `speed: 1.1` (+110 %, absolut ≈ 10 % schneller als das Kriegsross).
2. **Größe:** passt die Spannweite von ≈ 6,9 Kacheln? Auf dem Handy nimmt der Drache im Flug viel Bild ein.
   Möglich wären 10–15 % kleiner.
3. **Flughöhe:** reicht „knapp über den Bäumen“ (Rumpfmitte 2,3), oder soll er sichtbar höher fliegen
   (z. B. 3,5)? Dann sähe man die Bäume deutlich unter sich, die Kamera müsste aber etwas weiter heraus.
4. **Wasser und Lava:** auch über Lava und Abgründe fliegen, oder nur über Wasser und Moor?
5. **Farbe:** dunkelrot/Bronze wie gezeigt? Gewünscht vielleicht Varianten (z. B. Nachtblau/Silber) als
   spätere Belohnung?
6. **Sattel:** Decke in der Klassenfarbe wie beim Pferd, oder immer gleich (Blau wie im Bild)?
7. **Name:** „Glutschwinge“ in Ordnung oder ein anderer Name?
8. **Dungeons:** entschieden: kein Drache in Dungeons, Instanzen, Arenen und Duellen. Offen: Soll dort das
   frühere Pferd (Kriegsross) automatisch einspringen? Wer direkt vom Reitpferd zum Drachen wechselt, reitet dort
   heute gar nicht.
9. **Kampf:** entschieden: wie beim Pferd (Angriff oder Fertigkeit → absteigen und landen).
10. **Flügel:** Sind sie jetzt lebendig genug? Möglich wären noch mehr Gleitphasen, ein langsamerer Takt beim
    Schweben oder ein kräftigeres Durchdrücken der Haut.
