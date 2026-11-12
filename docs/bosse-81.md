# Bosse in 3D – Paket 2 (seit 14.81)

Fortsetzung von Paket 1 (`docs/bosse-78.md`, 14.80): gleiche Baukasten-, Animations- und Effekt-Schnittstellen
(`js/bosse3d.js`), neue Modelle in `js/bosse3d-modelle2.js`. Vorbild weiter Aelvyr (`js/aelvyr.js`).

## Umfang

| Gruppe | Bosse |
|---|---|
| Karten-Endboss (offen aus Paket 1) | Weltendrache Ignar (Karte 9) |
| Höllenthron-Endboss | Abaddor, der Höllenkaiser (beide Formen) |
| Höllenthron-Wächter | Gorvoth, Lilith, Zerberos, Molgrath, Ifrah, Belzarek |
| Lv-60-Instanzen (Endbosse) | Hjelda (Gletschergruft), Kaldor (Feste des Nordlichts), Vethra (Moorkrypta), Azrakel (Knochenkathedrale), Volund (Donnerschmiede), Tempestra (Sturmhorst), Pyrrhos (Glutkessel), Vulkhar (Aschenzitadelle) |
| Lv-80-Instanzen (Endbosse, auch `inst60`) | Aelthys (Spiegelgruft), Nihilor (Thron der Leere) |
| Kristallkaverne (Dungeon-Boss) | Kristallseherin Vaelith |

19 Bosse (Abaddor mit zwei Formen). Nicht umgesetzt: die 40 Wächter (Mini-Bosse) der zehn Instanzen behalten ihr vergrößertes Familienmodell.

## Ursache

Wie bei den Karten-Endbossen vor 14.80: Die Bosse hatten kein eigenes Modell. `look`/`raid.art` verwies auf ein
gewöhnliches Monster (Urdrache, Eiskönig, Gruftkönig, Naga-Königin, Dämon, Steintitan, Harpyie, Titanenkönig, Vaelith,
Leerenritter, Höllenhund, Feuerdämon, Oger, Sumpfhexe, Lavagolem), vergrößert mit `lookScale`, bewegt mit
`animateCreature`. Abaddor hatte ein eigenes, aber starres Modell (`teufel.js`, Glieder fest an je einem Knochen des
Humanoiden, flache einseitige Flügelplatten) und einen Feuerring am Boden. Angriffe der Instanzen (Kegel, Dornen, Hagel,
Kreuz, Sog, Lachen, Kettenblitz, Ringe, Ult) zeigten nur das allgemeine Aufladen (Lichtsäule, Kugeln, Wolke) und beim
Einschlag Ringe, Säulen und einen Bildschirmblitz (Ult, Verwandlung Abaddors, Viertelschlag).

## Änderung

### Baukasten und Animation (`js/bosse3d.js`)
- **Drache** (neue Bauart `drake`): Vierbeiner-Skelett plus zwei weitere Halsglieder (der Kopf hängt am dritten) und je
  Flügel Arm und Unterarm (29 Knochen). Hals biegt sich über drei Glieder mit leichtem S-Schwung, Flügel falten sich an
  die Flanke (Arm gesenkt und nach hinten, Finger liegen nach hinten) und öffnen sich je Lage (Kampf halb, Brüllen und
  Tod weit, Laufen angelegt). Je Angriff Flügel und Flughöhe: Atem mit gespreizten Flügeln, Meteore/Hagel im Flug, Nova
  aufsteigen und herabstoßen, Vernichtung/Ult hoch aufsteigen, Sog mit kräftigem Flügelschlag.
- **Posen für die Angriffe der Instanzen** (alle Bauarten): Kegel wie der Atem/Strahl, Dornen und Kreuz wie der
  Stampfer, Hagel und Lachen wie die Meteore, Ringe/Kern wie die Nova, Ult wie die Vernichtung; eigene Posen für Sog
  (Arme vor, dann heranreißen), Kettenblitz (Hand zum Himmel, dann auf die Ziele), Geschossring (Arme aufreißen).
  Viertelschlag Abaddors wie die Vernichtung (Dreizack zum Himmel), Höllenfeuer-Ring und Glutkern wie die Nova.
- **Nahkampf `thrust`** (Stoß mit Dreizack/Speer/Klinge) für Abaddor, Tempestra und die Ritter.
- **Schild-Pose der Flieger** (seit 14.81): sie hüllen sich in ihre Flügel (`mantle`) – Behebung des offenen Punkts
  aus Paket 1: die Flügelspitzen von Azaroth/Sereth ragten aus der Kristallkuppel; dazu Kuppel der Dämonen 1,6 statt 1,45.
- **Neue Effekte** (nur 3D, je Thema): `erupt` (Zacken aus Fels, Eis, Knochen oder Giftblasen brechen an einer Stelle
  aus dem Boden), `quake` (Bodenwelle entlang einer Linie, z. B. die vier Kreuzarme), `vortex` (Staub, Glut und Brocken
  kreisen zum Boss – Sog, Verwandlung), `chainfx` (Blitz vom Boss zum ersten Ziel, dann von Ziel zu Ziel), breiter
  Atem/Strahl (`wide`) für den Kegel. Neue Themen: Spiegel, Kristall, Nordlicht, Tod, Leere, Himmel (Sturm mit Wolken),
  Schatten. Keine Bodenringe, Runen oder Sterne; Warnflächen bleiben (auch die grünen sicheren Kreise der Ult mit ihrer
  Lichtsäule, die gehören zur Warnung). Kein Bildschirmblitz: Ult, Verwandlung und Viertelschlag zeigen Brocken,
  Glut und Staub mit kurzem Beben.
- `bossTelegraph` kennt die neuen Angriffe; `bossVolley3` (Geschossring), `bossTransform3` (Verwandlung Abaddors).

### Anbindung
- `instanzen.js`: `instTelegraph` ruft bei eigenem Modell `bossTelegraph` (Pose, 3D-Effekte) statt Lichtsäule,
  Kugeln, Wolke, Meteor und Wirbel; `instResolve` ohne Bildschirmblitz, Ringe, Säulen, Blitze (die Lachen als Gefahr am
  Boden bleiben); Geschossring ohne Ring; Brut-Ruf mit Brüllen.
- `hoellenthron.js`: Viertelschlag mit Pose und Effekten statt Lichtsäule, Einschlag ohne Blitz, Verwandlung Abaddors
  ohne Blitz/Ringe/Lichtstrahl (Brüllen, Glutsturm), „Abaddor erwacht“ ohne Blitz (Brüllen).
- `gegner.js` (Dungeon-Bosse Vaelith, Zerberos, Ifrah): Stampfer mit Pose und Brocken statt Ring, Salve mit Pose,
  Verstärkung mit Brüllen. `netz.js`: beim Mitspieler ebenso (Stampfer).
- `teufel.js`: Registrierung des alten Modells entfernt (Farben werden weiter genutzt), damit entfällt auch der
  Feuerring am Boden (`teufelAura3` greift nur beim alten Modell); die Ketten des Siegels zeichnet jetzt die
  Dauer-Animation in 3D.
- `bosse3d-modelle.js`: kleine Erweiterungen der Baupläne aus Paket 1 für die Abwandlungen (Naga `rot`, Dämon
  `skull`/`weapon`/`flameHair`/`longHorns`, Riese `tusks`/`golemHead`/`apron`/`chains`/`weapon`, Wolf `heads3`).
- `index.html`, `sw.js`: `js/bosse3d-modelle2.js` in der Liste (Version unverändert).
- Mechanik und Balance unverändert (gleiche Angriffe, Zeiten, Schaden, Kreise, Kampfkreis `m.r`).

### Modelle (`js/bosse3d-modelle2.js`)

| Boss | Bauplan | Wesen / Aussehen | Thema |
|---|---|---|---|
| Weltendrache Ignar | Drache (neu) | schwarzrote Schuppen mit Magmaadern, Hornkrone aus sechs Hörnern, Magmamaul, Obsidianstacheln mit Glutkern, Bauchplatten, Flughaut mit glühenden Adern, Schwanzkeule aus Obsidian | Feuer: Glut tropft aus dem Maul, Funken aus Rücken und Schwanz |
| Aschenkaiser Vulkhar | Drache | aschgrau, Rußschuppen, Glutrisse, nach vorn geschwungene Hörner, Basaltplatten statt Stacheln, zerfetzte Flughaut, Basaltklinge am Schwanz | Glut: Rauch und Asche |
| Abaddor (Form 1/2) | Zweibeiner (neu, Aussehen aus teufel.js) | roter Teufel mit Höllenherz, Lavaadern, Obsidian-Schultern mit Schädel, Bocksbeine mit Fell und Hufen, Kinnbart, große Hörner, Flammenkrone und -mähne, Fledermausflügel, Spatenschwanz, Dreizack; Form 2 schwarz mit Glutrissen, größere Flügel, glühende Klauen | Feuer: Flammen an Krone und Zinken, Glut steigt auf (Form 2 Glutsturm), versiegelt glühende Ketten |
| Frostkönigin Hjelda | Herrin (neu) | schwebende Königin, Krone aus Eiszacken, Eiskristalle auf den Schultern, Eissaum, Frostmantel, Eiszepter | Eis: kreisende Eissplitter, Frostnebel, Schnee |
| Aelthys, Herrin der Spiegel | Herrin | Gewand aus Spiegelglas, Kristallkrone mit Schleier, Spiegelscheiben als Heiligenschein, Spiegelstab | Spiegel |
| Kristallseherin Vaelith | Herrin | Kapuze mit Kristallrand, drittes Auge, Kristalle aus Schultern und Rücken, Kristallkugel | Kristall |
| Lilith, Hexe der Asche | Herrin | Aschelumpen mit Glutrissen, kleine Hörner, Haar mit Glutsträhnen, Räucherstab mit Glutschädel | Glut |
| Winterfürst Kaldor | Ritter (neu) | frostblaue Plattenrüstung, Eiskrone mit Nordlicht-Steinen, Umhang im Nordlicht-Verlauf, Eisklinge | Nordlicht: Lichter über ihm, Reif, Atem |
| Nihilor, Fürst der Leere | Ritter | schwarzviolette Rüstung, Dornenkrone, zerfetzter Nachtumhang, gezackte Leerenklinge | Leere: schwebende Splitter, Nacht steigt auf |
| Sturmkönigin Tempestra | Harpyie (neu) | Federflügel mit gefiedertem Hinterrand und Schwungfedern, Silberharnisch, Federschurz, Vogelbeine mit Krallen, Federhaar, Sturmkrone, Sturmspeer; schwebt mit Flügelschlag | Himmel: Gewitterwolke, Blitze zum Speer |
| Moormutter Vethra | Naga (Abwandlung) | Brutbeulen auf Rücken und Leib, freiliegende Rippen, Knochenkrone, -kragen und -klingen, faulgrüne Schuppen | Moor: Faulgas, Schleim |
| Totenfürst Azrakel | Dämon (Abwandlung) | Schädel statt Gesicht, Knochenflügel mit violetter Haut, Seelenfeuerkrone, Sense | Tod: Seelenfeuer, kreisende Seelen, Schädel als Geschosse |
| Belzarek, Fürst der Schatten | Dämon | fast schwarz, lange gerippte Hörner, rote Glut, Schattenklinge | Schatten |
| Ifrah, die Flammenfürstin | Dämonin | Haut aus Glut, Haar aus Flammen, Flammenschwert | Feuer |
| Donnerschmied Volund | Riese (Abwandlung) | Steinriese mit Bart, Schmiedeschürze, Bronzebänder, Hammer | Sturm: Funken, Blitze springen über |
| Magmafürst Pyrrhos | Riese | Basalt mit Lavaadern, Glutzackenkrone, Magmahammer | Feuer |
| Gorvoth, Kerkermeister | Riese | Oger mit Hauern und eiserner Halbmaske, Ketten über der Brust, Fesseln, Kerkerflegel | Glut |
| Molgrath, Glutkoloss | Riese | Kopf aus Basalt ohne Gesicht, Glutaugen, Fäuste aus Magma | Glut |
| Zerberos | Wolf (Abwandlung) | dreiköpfiger Höllenhund, glühende Mähnenspitzen | Feuer: Glut aus den Mäulern |

## Messwerte
Dreiecke (sichtbares Modell / vereinfachte Stufe / Schattenmodell), Weltgröße (Höhe), vorher in Klammern:

| Boss | Dreiecke | einfach | Schatten | Höhe |
|---|---|---|---|---|
| Ignar | 24.900 | 12.600 | 5.900 | 8,6 (7,6) |
| Vulkhar | 22.100 | 11.400 | 6.500 | 5,4 (2,8) |
| Abaddor (Form 1) | 21.100 | 11.200 | 6.200 | 8,2 (7,5); Form 2: 9,0 |
| Hjelda | 10.100 | 4.300 | 4.500 | 6,2 (4,9) |
| Kaldor | 10.800 | 6.700 | 5.700 | 7,0 (6,7) |
| Vethra | 19.300 | 6.200 | 5.900 | 6,0 (2,8) |
| Azrakel | 19.100 | 8.500 | 5.400 | 7,0 (5,6) |
| Volund | 12.200 | 7.800 | 4.600 | 6,8 (4,4) |
| Tempestra | 14.000 | 6.900 | 5.300 | 6,2 (5,7) |
| Pyrrhos | 10.800 | 6.300 | 4.000 | 7,2 (4,3) |
| Aelthys | 10.600 | 5.000 | 4.300 | 5,8 (4,0) |
| Nihilor | 12.700 | 7.800 | 5.400 | 6,6 (5,3) |
| Vaelith | 9.200 | 3.400 | 4.200 | 4,6 (3,2) |
| Lilith | 11.200 | 4.600 | 4.000 | 5,4 (4,0) |
| Zerberos | 22.900 | 11.700 | 4.700 | 5,2 (4,0) |
| Ifrah | 16.200 | 8.000 | 5.400 | 6,4 (4,6) |
| Gorvoth | 12.100 | 6.400 | 3.900 | 6,6 (5,8) |
| Molgrath | 9.900 | 5.400 | 3.900 | 6,4 (5,0) |
| Belzarek | 17.400 | 8.100 | 5.400 | 7,0 (5,9) |

Alle unter 25.000 Dreiecken. Jedes Modell wird einmal gebaut und aus dem Vorrat genommen (Abaddor je Form), die
vereinfachte Stufe nebenbei; drei Zeichenaufrufe je Boss plus Schatten. Effekte aus dem gemeinsamen Vorrat (höchstens
28 laufende Boss-Effekte, im echten Kampf höchstens 13 gleichzeitig gemessen), Dauereffekte für höchstens zwei Bosse im
Bild. Die Modelle der Karten-Endbosse aus Paket 1 bauen weiter unverändert (gleiche Größen; Prüfung aller 15).

## Tests
- **Bilder im echten Spiel** (eigener Server, Stufe-80-Krieger, normale Kamera, Gerätefaktor 1, Boss-KI angehalten
  und gezielt gesteuert, Zeit nach Spielzeit): je Boss vorher (14.80: Ruhe, Kampfbeginn, ein Spezialangriff, Tod) und
  nachher (Ruhe, Kampfbeginn mit Brüllen und Hieb, Nahkampf, Spezialangriff, Tod). Übersicht: Scratchpad
  `bosse81/collage.jpg` (19 Zeilen × 6 Bilder: vorher, Ruhe, Kampfbeginn, Nahkampf, Spezial, Tod). Spezialangriffe:
  Ignar Meteore, Abaddor Viertelschlag, Hjelda Hagel, Kaldor Kreuz, Vethra Lachen, Azrakel Dornen, Volund Kettenblitz,
  Tempestra Kegel, Pyrrhos Sog, Vulkhar Atem, Aelthys Ring, Nihilor Kern, Vaelith/Zerberos/Ifrah Stampfer, Gorvoth Sog,
  Lilith Lachen, Molgrath Kreuz, Belzarek Kegel. Dazu Modellbilder (Wiki-Ansicht) aller Bosse und Schild-Pose Azaroth
  vorher/nachher (Flügel jetzt in der Kuppel).
- **Echte Kämpfe** (KI läuft, Spieler unverwundbar, Siegel aufgehoben, Leben in Stufen 72/55/45/28 % → Wutschrei,
  Raserei, Ult, Verwandlung Abaddors, Schild, danach Sieg und Todesanimation) für alle 19 Typen: keine Seitenfehler.
  Gesehene Angriffe z. B. Hjelda Hagel/Kegel/Ult/Ring, Kaldor Kreuz/Hagel/Ult/Kettenblitz, Vethra Lachen/Kegel/Ult/Sog/
  Stampfer, Abaddor Stampfer/Höllenfeuer-Ring (zweite Form gebaut).
- `node --check` aller geänderten Dateien; s73-Prüfung (alle 12 Charaktere, Kopie auf Port 8811): ohne Fehler.
- Instanz-Schadenstest (`instdmg`, 2D, Kopie auf eigenem Port) vorher/nachher: Leben, Abwehr und Abklingzeiten gleich,
  Schadenswerte nur in der Zufallsstreuung verschieden – Balance unverändert.

## Offene Punkte
- **Wächter der zehn Instanzen** (40 Mini-Bosse, z. B. Skadi, Torbjörn, Kantor, Grumm, Glimra) haben weiter ihr
  vergrößertes Familienmodell, aber nicht die neuen Posen und Effekte; sie zeigen ihre Angriffe wie bisher (Säulen,
  Ringe beim Einschlag). Nächstes Paket: Abwandlungen der vorhandenen Baupläne (Wolf, Bär, Riese, Herrin, Dämon,
  Drache, Harpyie, Ritter) würden die meisten abdecken.
- Die Riesen-Abwandlungen (Volund, Pyrrhos, Gorvoth, Molgrath) teilen den Körper des Riesen aus Paket 1; sie
  unterscheiden sich durch Kopf, Zubehör, Waffe und Farben, nicht durch die Gestalt.
- Wie in Paket 1: Posen und Effekte nur in 3D (2D unverändert); Dungeon-Bosse (Vaelith, Zerberos, Ifrah) zeigen beim
  Mitspieler die Stampf-Pose erst beim Einschlag (die Ankündigung kommt dort nur als Warnfläche an).
- Versiegelte Instanzbosse stehen weiter in der Siegelkuppel der Instanz (gehört zur Mechanik).
- Die Wiki-Bildfunktion (`tools/wiki-portrait.js` aus einem anderen Arbeitsbaum) zeigte Ignar in der Ruhepose nur
  teilweise; im Spiel ist das Modell vollständig (Bilder in der Collage) – Ursache nicht gefunden.
- Kristallkuppel (offener Punkt aus Paket 1) behoben, indem sich Flieger beim Schild in die Flügel hüllen; die erhobene
  Waffe kann bei sehr großen Bossen noch die Kuppel oben berühren.
