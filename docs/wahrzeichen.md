# Wahrzeichen und Kulisse (seit 14.75)

Wunsch des Spielers (nach den neuen Kartenformen 14.70/14.73): „Die dunkle Seite musst du auch so aufwendig machen.
Gerade die letzten Maps wie Lichtwacht sind immer noch langweilig – lass dir was Cooles einfallen. Glutlager
(Feuerberg) ist auch langweilig, vielleicht mit einem Vulkan irgendwo. Totenmoor langweilig, Donnerklamm langweilig.
Und auf der dunklen Seite alles nochmal machen.“ Dazu (Zusatz) Frostgipfel: „Da sind einfach so kahle Stellen, ab und
zu ein, zwei Bäume. Soll das Eis sein, der Boden? Oder der Himmel? … mach das schöner mit dem Eis.“

Die Geländeformen standen; es fehlten große Wahrzeichen, Stimmung und Leben. Alles steht in **`js/wahrzeichen.js`**
(nur 3D, eine neue Datei; Einhängen über `FX3_HOOKS` aus `drei-fx.js`, keine Änderung an fremden Dateien außer
`index.html` und der Liste in `sw.js`).

## Was es je Karte gibt

| Map | Wahrzeichen draußen | Stimmung, Leben | Stadt |
|---|---|---|---|
| 9 Feuerberg | **Vulkankegel** mitten im Lavasee des Kraters (kantiger Basalt mit Ascheschichten und Rinnen, neun glühende Lavaströme die Flanken hinab, Glut im Krater), **Rauchsäule** (unten glutrot angestrahlt, zieht nach Osten), **Glutbrocken** fliegen im Bogen heraus, ziehen einen Funkenschweif und zerplatzen auf dem Kegel oder in der Lava; zwei rauchende Kegel hinter dem Nordrand | Die Luft glüht rot, je näher man dem Vulkan kommt (Nebel- und Himmelsfarbe), Lava wirft überall Blasen und Funken, Asche treibt | Glutlager (Basaltsechseck): vier **Glutpfeiler** im Lavagraben mit Feuerbecken und Bannern, Fahnen auf den Mauern |
| 10 Kristallabgrund | **Schwebende Kristallmonolithen** (verwachsene Kristalle, kreisende Splitter, drehen und heben sich langsam) über dem Abgrund, darunter je eine **Lichtsäule** aus der Tiefe; viele dünne Lichtsäulen nahe den Wegen; **Lichtschleier** über dem Abgrund | Schwebende Splitter um die Figur | Lichtwacht: die **zerbrochene Riesenkristall-Krone** schwebt über der Zitadelle (Ring mit Lücke, abgebrochene Stücke treiben daneben, Lichtkegel nach unten), **Lichtvorhänge** steigen aus den beiden Abgrundspalten, Splitter schweben darüber, Fahnen |
| 8 Totenmoor | **Riesen-Totenbaum** im Moor nördlich der Stadt (Brettwurzeln, knorrige Äste, Moosbärte, schaukelnde Geisterlaternen, Irrlichter kreisen), **versunkene Ruinen** (Säulengang, halb versunkener Tempel, Torbogen) | **Dichter Bodennebel** (zwei ziehende Schichten), **Irrlichter**, **aufsteigende Blasen** aus dem Moor | Stegdorf: vier **Totenlaternen** an den Kreuzungen der Kanäle (schiefe Pfähle, schaukelnde Laternen) |
| 3 Donnerklamm | **Felsnadeln** in der Klamm (geschichtet, kantig); in die mit Eisenspitze schlagen alle paar Sekunden **Blitze** ein (Zickzack mit Abzweig, Funken, das Licht der Szene blitzt auf); von den großen Nadeln stürzen **Wasserfälle** in die Klamm (Gischt unten) | Gewitterstimmung (dunklerer Himmel, kühles Licht), **ziehende Wolkenschatten**, **Sturmböen** (Windstreifen, fliegender Staub) | Gratfeste: **Sturmnadel** mit Blitzableiter vor der Nordmauer (in der Stadt schlägt der Blitz dort ein), Fahnen auf den Mauern |
| 11 Mondfall | **Gestürzter Mondsplitter** im größten Kratersee (Meteorstein mit leuchtenden Rissen und Kristallen, kreisende Brocken, aufsteigender Glanz); auf jedem Kratersee **Mondlicht** in schrägen Strahlen und das **Spiegelbild des Mondes** (Scheibe mit Kratern, Glitzerbahn) | Mondstaub schwebt über den Wiesen | Mondsichel: eine **silberne Mondsichel** auf einem Sockel im Mondsee, angestrahlt, mit Spiegelbild; Fahnen in Nachtblau und Silber |
| 12 Aschewald | **Glimmender Riesenbaumstumpf** mitten im verkohlten Wald (abgebrochener, zackiger Rand, Glutrisse, Glutbett in der Höhlung, Rauch, Funkenfontäne, verkohlte Wurzeln) | **Funkenregen** und Asche überall, Glutfelder sprühen Funken | Palisadenstern: **Feuerkörbe** auf den acht Spitzen, großes **Signalfeuer** im Norden, Fahnen in Kohle und Glut |
| 13 Knochenwüste | **Fossil-Skelett** eines Riesen im Treibsand eines Dünentals (folgt dem Tal: Wirbelsäule mit Dornen, Rippenbögen, gehörnter Schädel mit aufgeklapptem Kiefer, Beine mit Krallen, Schwanz im Sand); einzelne **Riesenrippen** ragen anderswo aus dem Sand | **Sandschleier** ziehen über den Boden, ab und zu eine **Windhose** | Dünenlinse: **Schädelbrunnen** im Oasenteich (Wasser fällt aus dem Maul), Fahnen in Ocker und Knochenweiß |
| 14 Blutsteppe | **Blutfall**: aus einer Felsklippe im Blutsee des Kessels stürzen zwei blutrote Wasserfälle (Gischt, Tropfen), **schwarze Obelisken** mit glühenden Spitzen und Bändern stehen im See | **Roter Dunst** im Kessel (nur, wenn man drin ist), rote Glutfunken | Kesselrand: **Blutbrunnen** – Obelisk mit vier Speiern im Becken der Stadt, Fahnen in Dunkelrot |
| 15 Nachtfrost | **Eisriesen** stehen in den Gletscherspalten (Beine in der Tiefe, Hände auf dem Knauf, das Schwert in die Spalte gestoßen, Helm mit Hörnern, Bart aus Eiszapfen, leuchtende Augen; blicken die Spalte entlang) | **Nordlicht**: wehende Bänder in Grün und Violett über der Figur, dazu ein grüner Schimmer auf dem Schnee; Eisglitzer | Kreuzfeste: **Eiskristalle** auf den vier inneren Ecken, ein **schwebendes Frostherz** über dem Weltentor, Fahnen |
| 16 Schattenklippen | **Leuchtturmruine** auf einer Schäre vor der Küste (eingestürzte Galerie, zwei kreisende Lichtstrahlen, Brandung schlägt Gischt), **Wrack** auf den Klippen | **Nebelbänke** (zwei Schichten), **Gischt** an der Küste | Fjordhafen: **vertäutes Schiff** im Hafenbecken (wiegt sich, Laterne), Fahnen in Schiefer und Silber |
| 7 Frostgipfel (Zusatz) | Das **Wolkenmeer liegt tief unter den Inseln** (Oberfläche −3,2 statt −0,62, Felswände bis −4,4; vorher sah es von oben wie flaches Eis aus); Wolkenballen mit **Lücken in die blaue Tiefe**, an den Felsen getürmt; **Wolkenfetzen** ziehen unter den Inselrändern; **Eiszapfen** hängen an den Kanten, Felsen ragen aus der Wand | Eisglitzer | Inseln ohne kahle Stellen: **zugefrorene Teiche**, **Gruppen vereister Tannen**, kniehohe Felsbrocken, Schneewehen (siehe unten) |

Die Kamera schaut im Spiel immer von oben (feste Kamera 49°, Schulterblick ab 29° nach unten) – ein Himmel ist nie zu
sehen. Darum ist alles so gebaut, dass es **von oben** wirkt: große Grundflächen, Glut und Licht von unten, Strahlen,
die zur Kamera hinauf steigen, Rauch, Nebel, Funken. Ein „Himmelsmond“ wäre unsichtbar; Mondfall zeigt den Mond darum
als Spiegelbild in den Seen und als Strahlen. Ebenso das Nordlicht als Bänder über der Figur statt am Horizont.

## Technik

- **Lage**: Für jede Karte wird ein **Abstandsfeld** gerechnet (`wzField`: Schachbrett-Abstand jeder Kachel zur
  nächsten begehbaren, für Flüssigkeit `liq` bzw. alles Unbegehbare samt dichtem Wald `wild`). `wzPick`/`wzPickMany`
  wählen Stellen mit genug Platz, nah an einer Wunschlage, mit Abstand zueinander und zur Stadt. Die Größe jedes
  Wahrzeichens richtet sich nach dem Platz (z. B. Vulkan-Radius = freier Radius − 1). So steht nichts auf begehbarem
  Boden – Wurzeln, Rippen, Beine sind auf den Platz begrenzt; was über Wege ragt, hängt hoch über Kopfhöhe (Krone,
  Frostherz, Äste, Laternen).
- **Keine Kollision**, keine Änderung an Boden, Objekten oder Wegen (außer dem Schmuck der Frostgipfel, s. u.).
- **Gleich für alle**: Lage und Form kommen aus der fertigen Welt und festen Zufallszahlen (`wzRng`, `mulberry32`);
  nur Bewegung, Teilchen und Blitze sind rein optisch (Zufall je Spieler).
- **Bauen**: beim Betreten einer Karte (Wechsel von `V3.home`) bzw. bei geänderter Grafikstufe; Dungeons und Arenen
  bekommen nichts. Teile je Stelle mit `Bake3` zu wenigen Meshes gebacken (`lit` Toon mit Durchsicht um die Figur,
  `glow`/`pulse` leuchtend, Banner mit Wind im Shader). Felsen kantig (eigene Flächennormalen). Eigener, späterer und
  nie ganz deckender **Nebel** für die Kulisse, damit große Wahrzeichen aus der Ferne als Umriss bleiben.
- **Teilchen**: zwei gebündelte `InstancedMesh` (Rauch/Nebel überblendet, Licht addiert), CPU-Rechnung, gedeckelt
  (`WZ_CAP`: 70/170/320 je nach Grafik niedrig/mittel/hoch+, Menge zusätzlich × `gfx().particles`). Lichtscheine
  (Kraterglut, Laternen, Augen) laufen im selben Bündel – kein eigener Zeichenaufruf. Beim Betreten werden die
  Teilchen acht Sekunden vorgerechnet (Rauchsäulen stehen schon).
- **Ausblenden**: jede Stelle hat eine Reichweite (60–170 Einheiten); weiter weg unsichtbar, ihre Bewegung ruht, ihre
  Emitter schweigen. Eigene Hülle je Stelle, also nur gezeichnet, wenn im Bild.
- **Grafik niedrig**: weniger Monolithen, Ruinen, Nadeln, Riesen; keine Lichtschleier, kein Nordlicht, keine äußeren
  Vulkane, kein Wrack, nur eine Nebelschicht; Teilchen 70.
- **Shader**: Lichtsäule (`wzBeamMat`, weicher Rand, aufsteigender Schimmer), fallendes Wasser/Blut (`wzFallMat`),
  Nebel-/Schleierfläche (`wzMistMat`, Muster an der Welt), Nordlicht/Lichtvorhang (`wzAuroraMat`), Mondspiegel
  (`wzMoonMat`), Teilchen (`wzSpriteMat`). Alle mit dem Nebel der Szene und gedämpft in der Nacht.
- **Stimmung**: `MOOD3.donnerklamm`/`klammwacht` dunkler (Gewitter), `MOOD3.vulkan` röter; das Rotglühen nahe dem
  Vulkan färbt Nebel und Himmel je Bild nach (`WZ.fogTint`).
- **2D**: unverändert (Ausnahme: der Schmuck der Frostgipfel ist Teil der Welt und erscheint auch in 2D).

## Frostgipfel (Zusatz)

- Kein Baum oder Schmuck stand auf `WOLKEN`-Kacheln (geprüft): Die kleinen Baumgruppen im Wolkenmeer sind die
  **Felsnadeln** der Form (`islet: 'trees'`, Land mit Tannen). Weil das Wolkenmeer nur 0,6 Einheiten tiefer lag, sahen
  sie aus wie Bäume auf dem Eis. Jetzt liegt es 3,2 tief, die Felsnadeln stehen als Säulen aus den Wolken.
- 3D: `LIQUID3_DEPTH[WOLKEN]` 1,7 → 4,4, `LIQUID3.clouds.level` −0,62 → −3,2, neuer Wolken-Shader (Ballen, Lücken in
  die blaue Tiefe, an den Felsen getürmt, Sonnenseite heller). Eiszapfen und Felsen an den Inselkanten als Stellen je
  24 × 24 Kacheln.
- Welt (`wzDecorateMaps`, nach `mapFormCleanup`, also vor Leuten, Wanderern und Monstern): kleine **zugefrorene
  Teiche** (Boden `ICE`, begehbar – die alten Frostseen des Rauschens waren mit der Form zu Land geworden),
  **Tannengruppen** (2–5) nur auf einfachen Punkten (die begehbaren Nachbarn hängen auch ohne die Tanne zusammen) mit
  2 Kacheln Abstand zu Wegen und Brücken, nie bei Stadt, Steinen, Eingängen und Instanz-Ecken, **Felsbrocken**
  (kniehoch, halten nicht auf) und **Schneewehen**. Alles nach der Lage der Kachel.
- Phase-1-Karten 4, 5, 6, 2 geprüft: keine großen kahlen Flächen (Suche nach 7 × 7 ganz leeren Feldern: Map 2 eine
  Stelle, 4, 5, 6 keine); dort wird nur diese eine Stelle mit Gebietsschmuck gefüllt.

## Leistung

Dreiecke je Bild (Grafik mittel, Kamera normal, 960 × 540, `renderer.info`), je Karte sechs feste Stellen: Stadt,
Wahrzeichen, vier Stellen draußen (wie in `docs/kartenformen.md`); vorher (14.73) → nachher, Tausend:

| Map | Stadt | Wahrzeichen | draußen | Zeichenaufrufe (Stadt) |
|---|---|---|---|---|
| 10 Kristallabgrund | 303 → 305 | 222 → 224 | 66/255/75/95 → 66/256/75/95 | 62 → 69 |
| 9 Feuerberg | 377 → 379 | 86 → 87 | 58/68/59/60 → 58/68/60/60 | 86 → 91 |
| 8 Totenmoor | 253 → 254 | 171 → 173 | 77/146/131/218 → 77/146/131/219 | 63 → 72 |
| 3 Donnerklamm | 434 → 436 | 114 → 116 | 137/60/192/81 → 137/60/193/81 | 94 → 100 |
| 11 Mondfall | 445 → 445 | 155 → 156 | 88/189/130/271 → 88/189/130/272 | 97 → 101 |
| 12 Aschewald | 433 → 435 | 141 → 143 | 110/98/129/207 → 110/98/129/208 | 106 → 110 |
| 13 Knochenwüste | 409 → 410 | 70 → 76 | 383/81/84/86 → 384/82/84/86 | 102 → 105 |
| 14 Blutsteppe | 434 → 435 | 72 → 72 | 126/78/71/436 → 126/78/71/437 | 101 → 104 |
| 15 Nachtfrost | 471 → 472 | 99 → 101 | 140/129/109/100 → 142/129/109/100 | 111 → 119 |
| 16 Schattenklippen | 282 → 282 | 91 → 92 | 146/140/125/229 → 146/140/136/229 | 61 → 65 |
| 7 Frostgipfel | 409 → 416 | 149 → 181 | 100/93/89/74 → 120/100/135/84 | 104 → 111 |

- Die Wahrzeichen selbst sind sparsam (je Karte 2–14 Tausend Dreiecke insgesamt, z. B. Vulkan rund 4 Tausend, Skelett
  9 Tausend, Eisriesen je 2 Tausend); im Bild kommen 1–6 Tausend dazu, die Städte bleiben alle unter Kazehana (479).
- Frostgipfel kostet am meisten (+7 bis +46 Tausend draußen): Eiszapfen und Felsen an allen Inselkanten (66 Tausend auf
  der ganzen Karte, in Stellen je 24 × 24 Kacheln, nur die im Bild werden gezeichnet) und die neuen Tannengruppen.
- Zeichenaufrufe +3 bis +18 (je Stelle 1–3 Meshes, dazu die zwei Teilchen-Bündel, Nebelflächen, Lichtsäulen, Banner).
- Teilchen höchstens 70/170/320 (niedrig/mittel/hoch), Lichtscheine im selben Bündel.
- Grafik niedrig gemessen (Werkzeug `diag.js`): Feuerberg 2,5, Donnerklamm 3,8, Nachtfrost 6,9, Knochenwüste 8,1
  Tausend Dreiecke Wahrzeichen gesamt (hoch: 3,6/5,0/14,3/9,3).

## Tests

- `mapFormReport()` auf allen 16 Karten: überall 0 unerreichbare Kacheln (Kazehana unverändert 9), kein Mensch, Tor,
  Eingang oder Stein unerreichbar, alle Erscheinungsorte erreichbar. Frostgipfel: 23 706 → 23 635 begehbare Kacheln
  (71 neue Tannen), 337 Eiskacheln, 171 Felsbrocken, 535 Schneewehen.
- Prüfsumme der Welt je Karte (Boden, Objekte, Schmuck) vorher/nachher: alle Karten bitgenau gleich außer Frostgipfel
  (Schmuck oben) und Schlangental (eine Schmuckkachel).
- Bilder im echten Spiel (eigener Server, deviceScaleFactor 1, Grafik hoch) je Karte: Übersicht, Wahrzeichen
  (Schulterblick), Wahrzeichen in der normalen Kamera, Stadt; Collage mit dem Stand 14.73 daneben.
- Grafik niedrig: alle Karten bauen ohne Fehler (weniger Stellen, kein Nordlicht, keine Schleier).
- `node --check` auf `js/wahrzeichen.js`, `sw.js`; Mechanik-Test (tm, 2D) alles OK; s73 (zwölf Charaktere, 2D): alle ohne Fehler.
